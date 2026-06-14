// LSP manager — the glue between Monaco and language servers (PRD §4.3).
//
// Responsibilities:
//  • route inbound `lsp://message` events to the right client
//  • lazily start one server per language (with the initialize handshake)
//  • mirror Monaco models to the server (didOpen / didChange / didClose)
//  • publish diagnostics as Monaco markers
//  • back Monaco's completion / hover / definition providers with LSP requests
//
// All wiring is idempotent: initLsp() runs once even though the editor may
// mount repeatedly.

import type * as Monaco from "monaco-editor";
import { listen } from "@tauri-apps/api/event";
import { lspStart, type LspMessageEvent } from "@/lib/tauri";
import { useWorkspace } from "@/workspace";
import { LspClient } from "./client";
import { LSP_SERVERS, serverFor } from "./config";
import {
  diagnosticToMarker,
  hoverContentsToMarkdown,
  positionToLsp,
  type LspDiagnostic,
  type LspRange,
} from "./convert";

const MARKER_OWNER = "nexcode-lsp";
const CHANGE_DEBOUNCE_MS = 250;

interface LspCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: unknown;
  insertText?: string;
  insertTextFormat?: number;
  sortText?: string;
  filterText?: string;
}

let initialized = false;
let monacoRef: typeof Monaco | null = null;

const ready = new Map<string, LspClient>(); // languageId → client
const starting = new Map<string, Promise<LspClient | null>>(); // languageId → in-flight start
const byServerId = new Map<string, LspClient>(); // serverId → client
const uriToModel = new Map<string, Monaco.editor.ITextModel>();
const versions = new Map<string, number>();
const changeTimers = new Map<string, ReturnType<typeof setTimeout>>();

function fileUri(monaco: typeof Monaco, model: Monaco.editor.ITextModel): string {
  return model.uri.scheme === "file"
    ? model.uri.toString()
    : monaco.Uri.file(model.uri.path).toString();
}

function applyDiagnostics(uri: string, diagnostics: unknown[]): void {
  const monaco = monacoRef;
  const model = uriToModel.get(uri);
  if (!monaco || !model) return;
  const markers = (diagnostics as LspDiagnostic[]).map(diagnosticToMarker);
  monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
}

async function ensureClient(languageId: string, root: string | null): Promise<LspClient | null> {
  const existing = ready.get(languageId);
  if (existing) return existing;
  const inFlight = starting.get(languageId);
  if (inFlight) return inFlight;

  const cfg = serverFor(languageId);
  if (!cfg) return null;

  const promise = (async () => {
    let serverId: string;
    try {
      serverId = await lspStart(cfg.command, cfg.args, root);
    } catch {
      return null; // server not installed → LSP silently disabled for this language
    }
    const client = new LspClient(serverId);
    byServerId.set(serverId, client);
    client.setDiagnosticsHandler(applyDiagnostics);

    const rootUri = root && monacoRef ? monacoRef.Uri.file(root).toString() : null;
    try {
      await client.request("initialize", {
        processId: null,
        rootUri,
        workspaceFolders: rootUri ? [{ uri: rootUri, name: "workspace" }] : null,
        capabilities: {
          textDocument: {
            synchronization: { dynamicRegistration: false, didSave: false },
            publishDiagnostics: { relatedInformation: true },
            completion: {
              contextSupport: true,
              completionItem: {
                snippetSupport: true,
                documentationFormat: ["markdown", "plaintext"],
              },
            },
            hover: { contentFormat: ["markdown", "plaintext"] },
            definition: { dynamicRegistration: false },
          },
          workspace: { configuration: true, workspaceFolders: true },
        },
      });
      client.notify("initialized", {});
    } catch {
      return null;
    }

    ready.set(languageId, client);
    return client;
  })();

  starting.set(languageId, promise);
  return promise;
}

function trackModel(monaco: typeof Monaco, model: Monaco.editor.ITextModel): void {
  const languageId = model.getLanguageId();
  if (!serverFor(languageId)) return;

  const root = useWorkspace.getState().folder;
  void ensureClient(languageId, root).then((client) => {
    if (!client || model.isDisposed()) return;
    const uri = fileUri(monaco, model);
    if (uriToModel.has(uri)) return;

    uriToModel.set(uri, model);
    versions.set(uri, 1);
    client.notify("textDocument/didOpen", {
      textDocument: { uri, languageId, version: 1, text: model.getValue() },
    });

    const changeSub = model.onDidChangeContent(() => {
      const prev = changeTimers.get(uri);
      if (prev) clearTimeout(prev);
      changeTimers.set(
        uri,
        setTimeout(() => {
          const version = (versions.get(uri) ?? 1) + 1;
          versions.set(uri, version);
          client.notify("textDocument/didChange", {
            textDocument: { uri, version },
            contentChanges: [{ text: model.getValue() }],
          });
        }, CHANGE_DEBOUNCE_MS),
      );
    });

    model.onWillDispose(() => {
      client.notify("textDocument/didClose", { textDocument: { uri } });
      changeSub.dispose();
      uriToModel.delete(uri);
      versions.delete(uri);
      const t = changeTimers.get(uri);
      if (t) clearTimeout(t);
      changeTimers.delete(uri);
    });
  });
}

function mapCompletionKind(monaco: typeof Monaco, lspKind?: number): number {
  const K = monaco.languages.CompletionItemKind;
  const table: Record<number, number> = {
    1: K.Text,
    2: K.Method,
    3: K.Function,
    4: K.Constructor,
    5: K.Field,
    6: K.Variable,
    7: K.Class,
    8: K.Interface,
    9: K.Module,
    10: K.Property,
    11: K.Unit,
    12: K.Value,
    13: K.Enum,
    14: K.Keyword,
    15: K.Snippet,
    16: K.Color,
    17: K.File,
    18: K.Reference,
    19: K.Folder,
    20: K.EnumMember,
    21: K.Constant,
    22: K.Struct,
    23: K.Event,
    24: K.Operator,
    25: K.TypeParameter,
  };
  return table[lspKind ?? 1] ?? K.Text;
}

function docToString(doc: unknown): string | undefined {
  if (typeof doc === "string") return doc;
  if (doc && typeof doc === "object" && "value" in doc) {
    return String((doc as { value: unknown }).value);
  }
  return undefined;
}

function registerProviders(monaco: typeof Monaco): void {
  for (const languageId of Object.keys(LSP_SERVERS)) {
    monaco.languages.registerCompletionItemProvider(languageId, {
      triggerCharacters: [".", "'", '"', "/", "@", "<", " ", ":"],
      provideCompletionItems: async (model, position) => {
        const client = ready.get(model.getLanguageId());
        if (!client) return { suggestions: [] };
        const result = await client.request("textDocument/completion", {
          textDocument: { uri: fileUri(monaco, model) },
          position: positionToLsp(position.lineNumber, position.column),
        });
        const items: LspCompletionItem[] = Array.isArray(result)
          ? (result as LspCompletionItem[])
          : ((result as { items?: LspCompletionItem[] })?.items ?? []);
        const word = model.getWordUntilPosition(position);
        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        };
        return {
          suggestions: items.map((it) => ({
            label: it.label,
            kind: mapCompletionKind(monaco, it.kind),
            insertText: it.insertText ?? it.label,
            insertTextRules:
              it.insertTextFormat === 2
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                : undefined,
            detail: it.detail,
            documentation: docToString(it.documentation),
            sortText: it.sortText,
            filterText: it.filterText,
            range,
          })),
        };
      },
    });

    monaco.languages.registerHoverProvider(languageId, {
      provideHover: async (model, position) => {
        const client = ready.get(model.getLanguageId());
        if (!client) return null;
        const result = await client.request<{ contents?: unknown } | null>("textDocument/hover", {
          textDocument: { uri: fileUri(monaco, model) },
          position: positionToLsp(position.lineNumber, position.column),
        });
        if (!result?.contents) return null;
        const value = hoverContentsToMarkdown(result.contents);
        return value ? { contents: [{ value }] } : null;
      },
    });

    monaco.languages.registerDefinitionProvider(languageId, {
      provideDefinition: async (model, position) => {
        const client = ready.get(model.getLanguageId());
        if (!client) return null;
        const result = await client.request<unknown>("textDocument/definition", {
          textDocument: { uri: fileUri(monaco, model) },
          position: positionToLsp(position.lineNumber, position.column),
        });
        const locations = Array.isArray(result) ? result : result ? [result] : [];
        return locations
          .map((loc) => {
            const l = loc as {
              uri?: string;
              targetUri?: string;
              range?: LspRange;
              targetRange?: LspRange;
            };
            const uri = l.uri ?? l.targetUri;
            const range = l.range ?? l.targetRange;
            if (!uri || !range) return null;
            return {
              uri: monaco.Uri.parse(uri),
              range: {
                startLineNumber: range.start.line + 1,
                startColumn: range.start.character + 1,
                endLineNumber: range.end.line + 1,
                endColumn: range.end.character + 1,
              },
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);
      },
    });
  }
}

/** Initialize LSP wiring against a Monaco namespace. Safe to call repeatedly. */
export function initLsp(monaco: typeof Monaco): void {
  if (initialized) return;
  initialized = true;
  monacoRef = monaco;

  void listen<LspMessageEvent>("lsp://message", (event) => {
    byServerId.get(event.payload.id)?.handleMessage(event.payload.body);
  });

  monaco.editor.onDidCreateModel((model) => trackModel(monaco, model));
  for (const model of monaco.editor.getModels()) trackModel(monaco, model);

  registerProviders(monaco);
}
