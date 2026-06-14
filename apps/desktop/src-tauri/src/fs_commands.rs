// Filesystem commands exposed to the WebView frontend (PRD §4.2 — File System
// & Project Management). The renderer reaches these through `src/lib/tauri.ts`.

use ignore::WalkBuilder;
use serde::Serialize;
use std::fs;
use std::path::Path;

/// A single entry in a directory listing.
#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

/// Read a UTF-8 text file from disk.
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Write UTF-8 contents to a file, creating or truncating it.
#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

/// List the immediate children of a directory, directories first then files,
/// each group sorted case-insensitively by name.
#[tauri::command]
pub fn read_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let mut entries: Vec<DirEntry> = Vec::new();
    for entry in fs::read_dir(&path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let p = entry.path();
        entries.push(DirEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: p.to_string_lossy().to_string(),
            is_dir: p.is_dir(),
        });
    }
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(entries)
}

/// Recursively list every file under `path`, honoring `.gitignore` and skipping
/// VCS/hidden noise (powered by the same walker ripgrep uses). Feeds the Cmd+P
/// fuzzy finder. Capped to keep huge trees responsive.
#[tauri::command]
pub fn list_files(path: String) -> Result<Vec<String>, String> {
    const MAX_FILES: usize = 50_000;
    let root = Path::new(&path);
    if !root.exists() {
        return Err(format!("path does not exist: {path}"));
    }

    let mut out: Vec<String> = Vec::new();
    for result in WalkBuilder::new(root).git_ignore(true).hidden(true).build() {
        if out.len() >= MAX_FILES {
            break;
        }
        if let Ok(entry) = result {
            if entry.file_type().is_some_and(|ft| ft.is_file()) {
                out.push(entry.path().to_string_lossy().to_string());
            }
        }
    }
    Ok(out)
}
