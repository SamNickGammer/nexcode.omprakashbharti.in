// File explorer sidebar — a lazy-loaded directory tree (PRD §4.2). Clicking a
// file opens it in a tab; clicking a folder expands/collapses it.

import { useEffect, useState } from "react";
import { readDir, type DirEntry } from "@/lib/tauri";
import { useWorkspace } from "./store";

function FileIcon({ isDir, open }: { isDir: boolean; open: boolean }) {
  return <span className="tree-icon">{isDir ? (open ? "▾" : "▸") : "·"}</span>;
}

function TreeNode({ entry, depth }: { entry: DirEntry; depth: number }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<DirEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const openFile = useWorkspace((s) => s.openFile);
  const activePath = useWorkspace((s) => s.activePath);

  async function toggle() {
    if (!entry.isDir) {
      void openFile(entry.path);
      return;
    }
    const next = !open;
    setOpen(next);
    if (next && children === null) {
      setLoading(true);
      try {
        setChildren(await readDir(entry.path));
      } catch {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    }
  }

  const isActive = !entry.isDir && entry.path === activePath;

  return (
    <div>
      <div
        className={`tree-row${isActive ? " is-active" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={toggle}
        title={entry.path}
      >
        <FileIcon isDir={entry.isDir} open={open} />
        <span className="tree-name">{entry.name}</span>
      </div>
      {open && (
        <div>
          {loading && (
            <div
              className="tree-row tree-muted"
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              loading…
            </div>
          )}
          {children?.map((child) => (
            <TreeNode key={child.path} entry={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer() {
  const folder = useWorkspace((s) => s.folder);
  const folderName = useWorkspace((s) => s.folderName);
  const openFolderDialog = useWorkspace((s) => s.openFolderDialog);
  const [roots, setRoots] = useState<DirEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!folder) {
      setRoots([]);
      return;
    }
    readDir(folder)
      .then((entries) => {
        if (!cancelled) setRoots(entries);
      })
      .catch(() => {
        if (!cancelled) setRoots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  return (
    <aside className="explorer">
      <div className="explorer-header">
        <span className="explorer-title">{folderName ?? "Explorer"}</span>
        <button className="explorer-action" onClick={() => void openFolderDialog()}>
          Open…
        </button>
      </div>
      <div className="explorer-tree">
        {folder ? (
          roots.map((entry) => <TreeNode key={entry.path} entry={entry} depth={0} />)
        ) : (
          <div className="explorer-empty">
            No folder open.
            <button className="link-button" onClick={() => void openFolderDialog()}>
              Open a folder
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
