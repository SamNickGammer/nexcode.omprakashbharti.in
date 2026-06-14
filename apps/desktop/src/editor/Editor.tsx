// Monaco editor mount — the core editing surface (PRD §4.1).
//
// For the bootstrap milestone this loads a single file's contents through the
// Rust `read_file` command to prove the full stack end-to-end. Multi-file
// tabs, LSP, multi-cursor, split panes, etc. are layered on in Phase 1.

import { useEffect, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { readFile } from "@/lib/tauri";

interface EditorProps {
  /** Absolute path of the file to load, or null for an empty buffer. */
  filePath?: string | null;
  /** Monaco language id (e.g. "typescript", "markdown"). */
  language?: string;
}

const WELCOME = `// NexCode IDE — bootstrap build
//
// The editor is live. Open a file to start editing.
// Foundation milestone: React + Vite + Tauri IPC + Rust + filesystem all wired.
`;

export function Editor({ filePath = null, language = "typescript" }: EditorProps) {
  const [value, setValue] = useState<string>(WELCOME);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) return;
    let cancelled = false;
    readFile(filePath)
      .then((text) => {
        if (!cancelled) {
          setValue(text);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  if (error) {
    return (
      <div className="editor-error">
        Failed to open {filePath}: {error}
      </div>
    );
  }

  return (
    <MonacoEditor
      height="100%"
      theme="vs-dark"
      language={language}
      value={value}
      onChange={(v) => setValue(v ?? "")}
      options={{
        fontSize: 13,
        minimap: { enabled: true },
        stickyScroll: { enabled: true },
        smoothScrolling: true,
        automaticLayout: true,
      }}
    />
  );
}
