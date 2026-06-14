// Integrated terminal backend (PRD §7.1). Spawns real PTY-backed shell sessions
// using `portable-pty` (the native Rust equivalent of node-pty — our backend is
// Rust, not Node), streams output to the WebView over `terminal://data` events,
// and accepts input/resize/close through commands.

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

static COUNTER: AtomicU64 = AtomicU64::new(1);

struct Session {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
}

/// Holds every live PTY session, keyed by id. Registered as Tauri managed state.
#[derive(Default)]
pub struct TerminalManager {
    sessions: Mutex<HashMap<String, Session>>,
}

#[derive(Clone, Serialize)]
struct TerminalData {
    id: String,
    data: Vec<u8>,
}

/// Spawn a login shell in a PTY of the given size and return its session id.
#[tauri::command]
pub fn terminal_create(
    app: AppHandle,
    manager: State<TerminalManager>,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())?;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut cmd = CommandBuilder::new(&shell);
    cmd.arg("-l"); // login shell so the user's full PATH/profile is sourced
    cmd.env("TERM", "xterm-256color");
    let dir = cwd.or_else(|| std::env::var("HOME").ok());
    if let Some(dir) = dir {
        cmd.cwd(dir);
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let id = format!("term-{}", COUNTER.fetch_add(1, Ordering::Relaxed));

    // Reader thread: stream PTY output to the frontend until EOF.
    let app_for_thread = app.clone();
    let id_for_thread = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let _ = app_for_thread.emit(
                        "terminal://data",
                        TerminalData { id: id_for_thread.clone(), data: buf[..n].to_vec() },
                    );
                }
                Err(_) => break,
            }
        }
        let _ = app_for_thread.emit("terminal://exit", id_for_thread.clone());
    });

    manager
        .sessions
        .lock()
        .map_err(|e| e.to_string())?
        .insert(id.clone(), Session { master: pair.master, writer, child });

    Ok(id)
}

/// Forward keyboard input to a session's PTY.
#[tauri::command]
pub fn terminal_write(manager: State<TerminalManager>, id: String, data: String) -> Result<(), String> {
    let mut sessions = manager.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.get_mut(&id) {
        session.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        session.writer.flush().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Resize a session's PTY to match the xterm viewport.
#[tauri::command]
pub fn terminal_resize(
    manager: State<TerminalManager>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = manager.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.get(&id) {
        session
            .master
            .resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Kill a session and drop it from the manager.
#[tauri::command]
pub fn terminal_close(manager: State<TerminalManager>, id: String) -> Result<(), String> {
    let mut sessions = manager.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(mut session) = sessions.remove(&id) {
        let _ = session.child.kill();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // Verifies the core PTY mechanism (independent of Tauri): open a pty, run a
    // command in it, and read its output back through the master side.
    #[test]
    fn pty_spawns_and_streams_output() {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize { rows: 24, cols: 80, pixel_width: 0, pixel_height: 0 })
            .expect("openpty");

        let mut cmd = CommandBuilder::new("/bin/echo");
        cmd.arg("nexcode-pty-ok");
        let mut child = pair.slave.spawn_command(cmd).expect("spawn");
        drop(pair.slave);

        // Read output BEFORE reaping the child — reaping can tear down the tty
        // and discard buffered bytes. The read blocks until echo writes + exits.
        let mut reader = pair.master.try_clone_reader().expect("reader");
        let mut out = String::new();
        let mut buf = [0u8; 1024];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    out.push_str(&String::from_utf8_lossy(&buf[..n]));
                    if out.contains("nexcode-pty-ok") {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
        let _ = child.wait();
        assert!(out.contains("nexcode-pty-ok"), "pty output was: {out:?}");
    }
}
