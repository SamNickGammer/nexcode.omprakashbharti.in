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
