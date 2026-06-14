// Monaco editor mount — the core editing surface (PRD §4.1).
//
// Driven by the workspace store: it renders the active tab's buffer, propagates
// edits back to the store (which tracks dirty state), and saves on Cmd+S. On
// mount it boots the LSP layer (PRD §4.3) so diagnostics/completion/hover light
// up for supported languages.

import { useRef } from "react";
import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useWorkspace } from "@/workspace/store";
import { initLsp } from "@/lsp";

const WELCOME = `//  Welcome to NexCode
//
//  • Open a folder from the sidebar (or ⌘O via "Open…")
//  • Jump to any file with ⌘P
//  • Edit and save with ⌘S
//
//  Every feature works offline — no API keys required.
`;

export function Editor() {
  const tab = useWorkspace((s) => s.tabs.find((t) => t.path === s.activePath) ?? null);
  const updateContent = useWorkspace((s) => s.updateContent);
  const saveActive = useWorkspace((s) => s.saveActive);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const onMount: OnMount = (instance, monaco) => {
    editorRef.current = instance;
    // ⌘S / Ctrl+S saves the active tab.
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      void saveActive();
    });
    initLsp(monaco);
  };

  if (!tab) {
    return (
      <MonacoEditor
        height="100%"
        theme="vs-dark"
        language="javascript"
        value={WELCOME}
        onMount={onMount}
        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, lineNumbers: "off" }}
      />
    );
  }

  return (
    <MonacoEditor
      height="100%"
      theme="vs-dark"
      // file:// URI so the model URI matches what language servers expect.
      path={`file://${tab.path}`}
      language={tab.language}
      value={tab.content}
      keepCurrentModel
      onMount={onMount}
      onChange={(v) => updateContent(tab.path, v ?? "")}
      options={{
        fontSize: 13,
        minimap: { enabled: true },
        stickyScroll: { enabled: true },
        smoothScrolling: true,
        automaticLayout: true,
        scrollBeyondLastLine: false,
      }}
    />
  );
}
