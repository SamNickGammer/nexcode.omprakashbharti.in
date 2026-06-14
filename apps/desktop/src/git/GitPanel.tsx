// Source-control panel (PRD §4.4): branch, a commit box, and the staged /
// unstaged change lists with stage/unstage actions. Clicking a file opens its
// diff. Refreshes when the workspace folder changes.

import { useEffect } from "react";
import { useWorkspace } from "@/workspace";
import { useGit } from "./store";
import type { GitFile } from "@/lib/tauri";

function FileRow({
  file,
  staged,
  onAction,
}: {
  file: GitFile;
  staged: boolean;
  onAction: (path: string) => void;
}) {
  const openDiff = useGit((s) => s.openDiff);
  const diff = useGit((s) => s.diff);
  const active = diff?.path === file.path && diff?.staged === staged;
  const name = file.path.split("/").pop() ?? file.path;
  const dir = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "";

  return (
    <div
      className={`scm-row${active ? " is-active" : ""}`}
      onClick={() => void openDiff(file.path, staged)}
      title={file.path}
    >
      <span className={`scm-status scm-status-${file.status === "?" ? "U" : file.status}`}>
        {file.status}
      </span>
      <span className="scm-name">{name}</span>
      {dir && <span className="scm-dir">{dir}</span>}
      <button
        className="scm-action"
        onClick={(e) => {
          e.stopPropagation();
          onAction(file.path);
        }}
        title={staged ? "Unstage" : "Stage"}
      >
        {staged ? "−" : "+"}
      </button>
    </div>
  );
}

export function GitPanel() {
  const folder = useWorkspace((s) => s.folder);
  const {
    isRepo,
    branch,
    staged,
    unstaged,
    loading,
    error,
    message,
    refresh,
    stage,
    unstage,
    commit,
    setMessage,
  } = useGit();

  useEffect(() => {
    void refresh();
  }, [folder, refresh]);

  return (
    <aside className="scm">
      <div className="scm-header">
        <span className="scm-title">Source Control</span>
        <button className="explorer-action" onClick={() => void refresh()} title="Refresh">
          ⟳
        </button>
      </div>

      {!folder ? (
        <div className="scm-empty">Open a folder to use source control.</div>
      ) : !isRepo ? (
        <div className="scm-empty">Not a git repository.</div>
      ) : (
        <div className="scm-content">
          <div className="scm-branch">⎇ {branch ?? "(no commits)"}</div>

          <div className="scm-commit">
            <textarea
              className="scm-message"
              placeholder={`Message (commit on ${branch ?? "HEAD"})`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
            <button
              className="scm-commit-btn"
              disabled={message.trim() === "" || staged.length === 0}
              onClick={() => void commit()}
            >
              ✓ Commit {staged.length > 0 ? `(${staged.length})` : ""}
            </button>
          </div>

          {error && <div className="scm-error">{error}</div>}
          {loading && <div className="scm-muted">refreshing…</div>}

          {staged.length > 0 && (
            <section className="scm-section">
              <div className="scm-section-head">
                <span>Staged Changes</span>
                <button
                  className="scm-bulk"
                  onClick={() => void unstage(staged.map((f) => f.path))}
                >
                  Unstage all
                </button>
              </div>
              {staged.map((f) => (
                <FileRow key={f.path} file={f} staged onAction={(p) => void unstage([p])} />
              ))}
            </section>
          )}

          <section className="scm-section">
            <div className="scm-section-head">
              <span>Changes</span>
              {unstaged.length > 0 && (
                <button
                  className="scm-bulk"
                  onClick={() => void stage(unstaged.map((f) => f.path))}
                >
                  Stage all
                </button>
              )}
            </div>
            {unstaged.length === 0 && staged.length === 0 ? (
              <div className="scm-muted">No changes</div>
            ) : (
              unstaged.map((f) => (
                <FileRow key={f.path} file={f} staged={false} onAction={(p) => void stage([p])} />
              ))
            )}
          </section>
        </div>
      )}
    </aside>
  );
}
