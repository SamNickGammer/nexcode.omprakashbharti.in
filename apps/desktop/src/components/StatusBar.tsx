// Bottom status bar (PRD §4.1). Shows the active file's language and dirty
// state today; git branch, LSP status, token usage, etc. land in later phases.

import { isTabDirty, useWorkspace } from "@/workspace";

export function StatusBar() {
  const tab = useWorkspace((s) => s.tabs.find((t) => t.path === s.activePath) ?? null);
  const folderName = useWorkspace((s) => s.folderName);

  return (
    <footer className="statusbar">
      <span>{folderName ?? "No folder"}</span>
      <span className="statusbar-right">
        {tab ? (
          <>
            {isTabDirty(tab) && <span className="statusbar-dirty">●</span>}
            <span>{tab.language}</span>
            <span>UTF-8</span>
          </>
        ) : (
          <span>Ready</span>
        )}
      </span>
    </footer>
  );
}
