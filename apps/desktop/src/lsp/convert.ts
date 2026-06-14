// Pure converters between LSP and Monaco. Kept free of any `monaco-editor`
// import so they're unit-testable; severities/columns use Monaco's numeric
// conventions directly.

/** LSP positions are 0-based; Monaco lines/columns are 1-based. */
export interface LspPosition {
  line: number;
  character: number;
}

export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

export interface LspDiagnostic {
  range: LspRange;
  message: string;
  severity?: number; // 1 Error, 2 Warning, 3 Information, 4 Hint
  source?: string;
  code?: string | number;
}

/** Monaco IMarkerData subset (severity uses MarkerSeverity numbering). */
export interface MonacoMarker {
  message: string;
  severity: number; // 1 Hint, 2 Info, 4 Warning, 8 Error
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  source?: string;
  code?: string;
}

// LSP DiagnosticSeverity → Monaco MarkerSeverity.
const SEVERITY: Record<number, number> = { 1: 8, 2: 4, 3: 2, 4: 1 };

export function severityToMonaco(lsp: number | undefined): number {
  return SEVERITY[lsp ?? 1] ?? 8;
}

/** Convert a 0-based LSP position to a 1-based Monaco position tuple. */
export function positionToMonaco(p: LspPosition): { lineNumber: number; column: number } {
  return { lineNumber: p.line + 1, column: p.character + 1 };
}

/** Convert a 1-based Monaco position to a 0-based LSP position. */
export function positionToLsp(lineNumber: number, column: number): LspPosition {
  return { line: lineNumber - 1, character: column - 1 };
}

export function diagnosticToMarker(d: LspDiagnostic): MonacoMarker {
  return {
    message: d.message,
    severity: severityToMonaco(d.severity),
    startLineNumber: d.range.start.line + 1,
    startColumn: d.range.start.character + 1,
    endLineNumber: d.range.end.line + 1,
    endColumn: d.range.end.character + 1,
    source: d.source,
    code: d.code === undefined ? undefined : String(d.code),
  };
}

/** Flatten LSP hover contents (string | MarkedString | MarkupContent | array). */
export function hoverContentsToMarkdown(contents: unknown): string {
  const one = (c: unknown): string => {
    if (typeof c === "string") return c;
    if (c && typeof c === "object") {
      const obj = c as { value?: string; language?: string };
      if (typeof obj.value === "string") {
        return obj.language ? "```" + obj.language + "\n" + obj.value + "\n```" : obj.value;
      }
    }
    return "";
  };
  if (Array.isArray(contents)) return contents.map(one).filter(Boolean).join("\n\n");
  return one(contents);
}
