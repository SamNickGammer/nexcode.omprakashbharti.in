// NexCode IDE — Tauri backend entry point.
//
// Backend commands are exposed to the WebView frontend via `invoke`. The
// frontend should never touch Tauri APIs directly — it goes through
// `src/lib/tauri.ts` wrappers (see PRD §3.2 process architecture).

/// Read a UTF-8 text file from disk. This is the minimal end-to-end command
/// that proves the React ↔ Tauri IPC ↔ Rust ↔ filesystem path works
/// (the "working editor" bootstrap milestone). Real file I/O, watching, and
/// workspace handling are built out in Phase 1 (PRD §4.2).
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
