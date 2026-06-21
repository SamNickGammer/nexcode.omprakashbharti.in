// Backing commands for the VSCode FileSystemProvider bridge (see
// src/workbench/fileSystemProvider.ts). These let VSCode's explorer, editor,
// and search operate on the user's real disk through Tauri.
//
// Conventions matching VSCode's FS API:
//  - file type codes: 1 = File, 2 = Directory, 64 = SymbolicLink (bitwise)
//  - times are epoch milliseconds
//  - file bytes cross the IPC boundary base64-encoded (compact JSON)

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde::Serialize;
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

const TYPE_FILE: u32 = 1;
const TYPE_DIR: u32 = 2;
const TYPE_SYMLINK: u32 = 64;

fn millis(t: std::io::Result<SystemTime>) -> u64 {
    t.ok()
        .and_then(|st| st.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn type_code(meta: &fs::Metadata, symlink: bool) -> u32 {
    let mut code = if meta.is_dir() { TYPE_DIR } else { TYPE_FILE };
    if symlink {
        code |= TYPE_SYMLINK;
    }
    code
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FspStat {
    pub file_type: u32,
    pub ctime: u64,
    pub mtime: u64,
    pub size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FspEntry {
    pub name: String,
    pub file_type: u32,
}

/// Metadata for a path (follows symlinks for type/size but flags symlinks).
#[tauri::command]
pub fn fsp_stat(path: String) -> Result<FspStat, String> {
    let p = Path::new(&path);
    let symlink = fs::symlink_metadata(p).map(|m| m.file_type().is_symlink()).unwrap_or(false);
    let meta = fs::metadata(p).map_err(|e| e.to_string())?;
    Ok(FspStat {
        file_type: type_code(&meta, symlink),
        ctime: millis(meta.created()),
        mtime: millis(meta.modified()),
        size: meta.len(),
    })
}

/// Directory listing as (name, fileType) pairs.
#[tauri::command]
pub fn fsp_readdir(path: String) -> Result<Vec<FspEntry>, String> {
    let mut out = Vec::new();
    for entry in fs::read_dir(&path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let ft = entry.file_type().map_err(|e| e.to_string())?;
        let symlink = ft.is_symlink();
        // For symlinks, resolve to learn dir-vs-file; fall back to file.
        let code = if symlink {
            let resolved = fs::metadata(entry.path());
            let base = match &resolved {
                Ok(m) if m.is_dir() => TYPE_DIR,
                _ => TYPE_FILE,
            };
            base | TYPE_SYMLINK
        } else if ft.is_dir() {
            TYPE_DIR
        } else {
            TYPE_FILE
        };
        out.push(FspEntry { name: entry.file_name().to_string_lossy().to_string(), file_type: code });
    }
    Ok(out)
}

/// Read a file's bytes, base64-encoded.
#[tauri::command]
pub fn fsp_read(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    Ok(B64.encode(bytes))
}

/// Write base64-encoded bytes to a file. `create`/`overwrite` mirror VSCode's
/// write options; the parent directory must already exist.
#[tauri::command]
pub fn fsp_write(path: String, content_base64: String, create: bool, overwrite: bool) -> Result<(), String> {
    let p = Path::new(&path);
    let exists = p.exists();
    if exists && !overwrite {
        return Err("file exists (overwrite not allowed)".into());
    }
    if !exists && !create {
        return Err("file not found (create not allowed)".into());
    }
    let bytes = B64.decode(content_base64.as_bytes()).map_err(|e| e.to_string())?;
    fs::write(p, bytes).map_err(|e| e.to_string())
}

/// Create a directory (and any missing parents).
#[tauri::command]
pub fn fsp_mkdir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

/// Delete a file or directory (recursively when `recursive`).
#[tauri::command]
pub fn fsp_delete(path: String, recursive: bool) -> Result<(), String> {
    let p = Path::new(&path);
    let meta = fs::symlink_metadata(p).map_err(|e| e.to_string())?;
    if meta.is_dir() {
        if recursive {
            fs::remove_dir_all(p).map_err(|e| e.to_string())
        } else {
            fs::remove_dir(p).map_err(|e| e.to_string())
        }
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

/// Rename/move a path. Refuses to clobber unless `overwrite`.
#[tauri::command]
pub fn fsp_rename(from: String, to: String, overwrite: bool) -> Result<(), String> {
    let dest = Path::new(&to);
    if dest.exists() {
        if !overwrite {
            return Err("destination exists (overwrite not allowed)".into());
        }
        if dest.is_dir() {
            fs::remove_dir_all(dest).map_err(|e| e.to_string())?;
        } else {
            fs::remove_file(dest).map_err(|e| e.to_string())?;
        }
    }
    fs::rename(&from, &to).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static N: AtomicU64 = AtomicU64::new(0);

    fn tmp() -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!(
            "nexcode-fsp-{}-{}",
            std::process::id(),
            N.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn write_read_stat_readdir_rename_delete() {
        let dir = tmp();
        let file = dir.join("a.txt");
        let fp = file.to_string_lossy().to_string();

        // write + read round-trips through base64
        fsp_write(fp.clone(), B64.encode(b"hello"), true, true).unwrap();
        let b64 = fsp_read(fp.clone()).unwrap();
        assert_eq!(B64.decode(b64).unwrap(), b"hello");

        // stat reports a file with the right size
        let st = fsp_stat(fp.clone()).unwrap();
        assert_eq!(st.file_type, TYPE_FILE);
        assert_eq!(st.size, 5);

        // readdir sees it
        let entries = fsp_readdir(dir.to_string_lossy().to_string()).unwrap();
        assert!(entries.iter().any(|e| e.name == "a.txt" && e.file_type == TYPE_FILE));

        // mkdir + rename + delete
        let sub = dir.join("sub");
        fsp_mkdir(sub.to_string_lossy().to_string()).unwrap();
        assert_eq!(fsp_stat(sub.to_string_lossy().to_string()).unwrap().file_type, TYPE_DIR);

        let moved = dir.join("b.txt");
        fsp_rename(fp.clone(), moved.to_string_lossy().to_string(), false).unwrap();
        assert!(!file.exists() && moved.exists());

        fsp_delete(moved.to_string_lossy().to_string(), false).unwrap();
        assert!(!moved.exists());

        let _ = fs::remove_dir_all(&dir);
    }
}
