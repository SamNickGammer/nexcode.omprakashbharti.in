// Thin wrappers around the Tauri IPC bridge.
//
// The rest of the UI imports from here rather than calling `@tauri-apps/api`
// directly, so the renderer's coupling to the native backend stays in one place
// (PRD §3.2 process architecture).

import { invoke } from "@tauri-apps/api/core";

/** Read a UTF-8 text file from disk via the Rust `read_file` command. */
export function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}
