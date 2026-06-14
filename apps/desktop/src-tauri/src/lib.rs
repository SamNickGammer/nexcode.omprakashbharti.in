// NexCode IDE — Tauri backend entry point.
//
// Backend commands are exposed to the WebView frontend via `invoke`. The
// frontend never touches Tauri APIs directly — it goes through
// `src/lib/tauri.ts` wrappers (see PRD §3.2 process architecture).

mod fs_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            fs_commands::read_file,
            fs_commands::write_file,
            fs_commands::read_dir,
            fs_commands::list_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
