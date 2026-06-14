// Language Server Protocol bridge (PRD §4.3). A generic transport: spawn any
// language server as a child process talking JSON-RPC over stdio, parse the
// Content-Length framing, and shuttle messages between the server and the
// WebView (which runs the actual LSP client). Server↔client routing is keyed by
// a session id. The renderer reaches these through `src/lib/tauri.ts`.

use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

static COUNTER: AtomicU64 = AtomicU64::new(1);

struct Server {
    child: Child,
    stdin: ChildStdin,
}

/// Live language-server processes, keyed by session id. Managed Tauri state.
#[derive(Default)]
pub struct LspManager {
    servers: Mutex<HashMap<String, Server>>,
}

#[derive(Clone, Serialize)]
struct LspMessage {
    id: String,
    body: String,
}

/// Frame a JSON-RPC body with the LSP `Content-Length` header.
fn encode(body: &str) -> Vec<u8> {
    let mut out = format!("Content-Length: {}\r\n\r\n", body.len()).into_bytes();
    out.extend_from_slice(body.as_bytes());
    out
}

/// Read one framed message body from a reader. Returns `None` at EOF.
fn read_message<R: BufRead>(reader: &mut R) -> std::io::Result<Option<String>> {
    let mut content_length: Option<usize> = None;
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line)? == 0 {
            return Ok(None); // EOF
        }
        let trimmed = line.trim_end_matches(['\r', '\n']);
        if trimmed.is_empty() {
            break; // blank line ends the header block
        }
        if let Some(rest) = trimmed.strip_prefix("Content-Length:") {
            content_length = rest.trim().parse().ok();
        }
    }
    let Some(len) = content_length else { return Ok(None) };
    let mut buf = vec![0u8; len];
    reader.read_exact(&mut buf)?;
    Ok(Some(String::from_utf8_lossy(&buf).into_owned()))
}

/// Resolve a server binary: prefer a locally-bundled copy (dev / future
/// sidecar) under `node_modules/.bin`, otherwise fall back to PATH.
fn resolve_command(name: &str) -> String {
    for candidate in [
        format!("node_modules/.bin/{name}"),
        format!("../node_modules/.bin/{name}"),
        format!("apps/desktop/node_modules/.bin/{name}"),
    ] {
        let path = std::path::Path::new(&candidate);
        if path.exists() {
            if let Ok(abs) = std::fs::canonicalize(path) {
                return abs.to_string_lossy().into_owned();
            }
        }
    }
    name.to_string()
}

/// Start a language server and return its session id. Errors (e.g. binary not
/// installed) bubble up so the frontend can disable LSP for that language while
/// keeping the editor fully usable.
#[tauri::command]
pub fn lsp_start(
    app: AppHandle,
    manager: State<LspManager>,
    command: String,
    args: Vec<String>,
    root: Option<String>,
) -> Result<String, String> {
    let resolved = resolve_command(&command);
    let mut cmd = Command::new(&resolved);
    cmd.args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    if let Some(dir) = &root {
        cmd.current_dir(dir);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("failed to start language server '{resolved}': {e}"))?;
    let stdout = child.stdout.take().ok_or("language server has no stdout")?;
    let stdin = child.stdin.take().ok_or("language server has no stdin")?;

    let id = format!("lsp-{}", COUNTER.fetch_add(1, Ordering::Relaxed));

    let app_for_thread = app.clone();
    let id_for_thread = id.clone();
    std::thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        loop {
            match read_message(&mut reader) {
                Ok(Some(body)) => {
                    let _ = app_for_thread
                        .emit("lsp://message", LspMessage { id: id_for_thread.clone(), body });
                }
                Ok(None) | Err(_) => break,
            }
        }
        let _ = app_for_thread.emit("lsp://exit", id_for_thread.clone());
    });

    manager
        .servers
        .lock()
        .map_err(|e| e.to_string())?
        .insert(id.clone(), Server { child, stdin });
    Ok(id)
}

/// Send a raw JSON-RPC message to a server (the bridge adds the framing).
#[tauri::command]
pub fn lsp_send(manager: State<LspManager>, id: String, message: String) -> Result<(), String> {
    let mut servers = manager.servers.lock().map_err(|e| e.to_string())?;
    if let Some(server) = servers.get_mut(&id) {
        server.stdin.write_all(&encode(&message)).map_err(|e| e.to_string())?;
        server.stdin.flush().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Kill a language server and drop it from the manager.
#[tauri::command]
pub fn lsp_stop(manager: State<LspManager>, id: String) -> Result<(), String> {
    let mut servers = manager.servers.lock().map_err(|e| e.to_string())?;
    if let Some(mut server) = servers.remove(&id) {
        let _ = server.child.kill();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn encode_then_read_roundtrips() {
        let body = r#"{"jsonrpc":"2.0","id":1}"#;
        let mut cursor = Cursor::new(encode(body));
        assert_eq!(read_message(&mut cursor).unwrap().as_deref(), Some(body));
        assert!(read_message(&mut cursor).unwrap().is_none()); // EOF
    }

    #[test]
    fn reads_two_back_to_back_messages() {
        let mut bytes = encode(r#"{"a":1}"#);
        bytes.extend(encode(r#"{"b":2}"#));
        let mut cursor = Cursor::new(bytes);
        assert_eq!(read_message(&mut cursor).unwrap().as_deref(), Some(r#"{"a":1}"#));
        assert_eq!(read_message(&mut cursor).unwrap().as_deref(), Some(r#"{"b":2}"#));
        assert!(read_message(&mut cursor).unwrap().is_none());
    }

    // End-to-end check against the bundled typescript-language-server: spawn it,
    // perform the LSP `initialize` handshake over our framing, and assert the
    // server reports capabilities. Skips cleanly if the binary isn't present.
    #[test]
    fn typescript_server_initialize_handshake() {
        let bin = std::path::Path::new("../node_modules/.bin/typescript-language-server");
        if !bin.exists() {
            eprintln!("skipping: typescript-language-server not installed");
            return;
        }

        let mut child = Command::new(bin)
            .arg("--stdio")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .expect("spawn tsserver");

        let mut stdin = child.stdin.take().unwrap();
        let mut reader = BufReader::new(child.stdout.take().unwrap());

        let init = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"processId":null,"rootUri":null,"capabilities":{}}}"#;
        stdin.write_all(&encode(init)).unwrap();
        stdin.flush().unwrap();

        let mut found = false;
        for _ in 0..50 {
            match read_message(&mut reader) {
                Ok(Some(body)) => {
                    if body.contains("\"id\":1") && body.contains("capabilities") {
                        found = true;
                        break;
                    }
                }
                _ => break,
            }
        }
        let _ = child.kill();
        assert!(found, "did not receive an initialize result with capabilities");
    }
}
