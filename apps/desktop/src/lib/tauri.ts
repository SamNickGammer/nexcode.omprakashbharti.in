// Thin wrappers around the Tauri IPC bridge.
//
// The rest of the UI imports from here rather than calling `@tauri-apps/api`
// directly, so the renderer's coupling to the native backend stays in one place
// (PRD §3.2 process architecture).

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

/** A single entry in a directory listing returned by `read_dir`. */
export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
}

interface RawDirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

/** Read a UTF-8 text file from disk. */
export function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

/** Write UTF-8 contents to a file (creates or truncates). */
export function writeFile(path: string, contents: string): Promise<void> {
  return invoke<void>("write_file", { path, contents });
}

/** List the immediate children of a directory (dirs first, then files). */
export async function readDir(path: string): Promise<DirEntry[]> {
  const raw = await invoke<RawDirEntry[]>("read_dir", { path });
  return raw.map((e) => ({ name: e.name, path: e.path, isDir: e.is_dir }));
}

/** Recursively list files under a folder, honoring `.gitignore` (for Cmd+P). */
export function listFiles(path: string): Promise<string[]> {
  return invoke<string[]>("list_files", { path });
}

/** Open the native folder picker; returns the chosen path or null if cancelled. */
export async function pickFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}

// --- Integrated terminal (PRD §7) ---

/** Payload of a `terminal://data` event: raw PTY output bytes for a session. */
export interface TerminalDataEvent {
  id: string;
  data: number[];
}

/** Spawn a PTY-backed shell; resolves to the session id. */
export function terminalCreate(cwd: string | null, cols: number, rows: number): Promise<string> {
  return invoke<string>("terminal_create", { cwd, cols, rows });
}

/** Send keyboard input to a terminal session. */
export function terminalWrite(id: string, data: string): Promise<void> {
  return invoke<void>("terminal_write", { id, data });
}

/** Resize a terminal session's PTY. */
export function terminalResize(id: string, cols: number, rows: number): Promise<void> {
  return invoke<void>("terminal_resize", { id, cols, rows });
}

/** Kill and clean up a terminal session. */
export function terminalClose(id: string): Promise<void> {
  return invoke<void>("terminal_close", { id });
}

// --- Git source control (PRD §4.4) ---

export interface GitFile {
  path: string;
  /** Single letter: M, A, D, R, T, or ? (untracked). */
  status: string;
}

export interface GitStatusResult {
  isRepo: boolean;
  branch: string | null;
  staged: GitFile[];
  unstaged: GitFile[];
}

/** Status of the repo containing `repoPath` (isRepo:false if not a repo). */
export function gitStatus(repoPath: string): Promise<GitStatusResult> {
  return invoke<GitStatusResult>("git_status", { repoPath });
}

/** Unified diff for one file (staged = HEAD→index, else index→workdir). */
export function gitDiffFile(repoPath: string, path: string, staged: boolean): Promise<string> {
  return invoke<string>("git_diff_file", { repoPath, path, staged });
}

/** Stage the given (repo-relative) paths. */
export function gitStage(repoPath: string, paths: string[]): Promise<void> {
  return invoke<void>("git_stage", { repoPath, paths });
}

/** Unstage the given (repo-relative) paths. */
export function gitUnstage(repoPath: string, paths: string[]): Promise<void> {
  return invoke<void>("git_unstage", { repoPath, paths });
}

/** Commit the staged index; resolves to the new commit OID. */
export function gitCommit(repoPath: string, message: string): Promise<string> {
  return invoke<string>("git_commit", { repoPath, message });
}

// --- Language servers (PRD §4.3) ---

/** Payload of an `lsp://message` event: one JSON-RPC body from a server. */
export interface LspMessageEvent {
  id: string;
  body: string;
}

/** Start a language server; resolves to its session id (rejects if missing). */
export function lspStart(command: string, args: string[], root: string | null): Promise<string> {
  return invoke<string>("lsp_start", { command, args, root });
}

/** Send a raw JSON-RPC message to a server (the backend adds LSP framing). */
export function lspSend(id: string, message: string): Promise<void> {
  return invoke<void>("lsp_send", { id, message });
}

/** Stop a language server. */
export function lspStop(id: string): Promise<void> {
  return invoke<void>("lsp_stop", { id });
}
