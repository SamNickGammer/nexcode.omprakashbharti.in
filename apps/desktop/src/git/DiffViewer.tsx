// Read-only viewer for a single file's git diff (PRD §4.4). Shows the unified
// patch from `git_diff_file` in Monaco with "diff" syntax. Rendered as an
// overlay above the editor when a diff is open; null otherwise.

import MonacoEditor from "@monaco-editor/react";
import { useGit } from "./store";

export function DiffViewer() {
  const diff = useGit((s) => s.diff);
  const closeDiff = useGit((s) => s.closeDiff);

  if (!diff) return null;

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <span className="diff-path">{diff.path}</span>
        <span className="diff-badge">{diff.staged ? "staged" : "working tree"}</span>
        <button className="diff-close" onClick={() => closeDiff()} aria-label="Close diff">
          ×
        </button>
      </div>
      <div className="diff-body">
        <MonacoEditor
          height="100%"
          theme="vs-dark"
          language="diff"
          value={diff.content}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            renderWhitespace: "none",
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
