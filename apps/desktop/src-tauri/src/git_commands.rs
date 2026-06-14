// Git source-control commands (PRD §4.4), backed by libgit2 via the `git2`
// crate. This slice covers local workflow: status, per-file diff, stage/unstage,
// and commit. Network ops (fetch/pull/push), branches, stash, and tags layer on
// later. The renderer reaches these through `src/lib/tauri.ts`.

use git2::{DiffFormat, DiffOptions, ObjectType, Repository, Status, StatusOptions};
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFile {
    pub path: String,
    /// Single-letter status: M, A, D, R, T, or ? (untracked).
    pub status: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: Option<String>,
    pub staged: Vec<GitFile>,
    pub unstaged: Vec<GitFile>,
}

fn staged_letter(s: Status) -> Option<&'static str> {
    if s.contains(Status::INDEX_NEW) {
        Some("A")
    } else if s.contains(Status::INDEX_MODIFIED) {
        Some("M")
    } else if s.contains(Status::INDEX_DELETED) {
        Some("D")
    } else if s.contains(Status::INDEX_RENAMED) {
        Some("R")
    } else if s.contains(Status::INDEX_TYPECHANGE) {
        Some("T")
    } else {
        None
    }
}

fn unstaged_letter(s: Status) -> Option<&'static str> {
    if s.contains(Status::WT_NEW) {
        Some("?")
    } else if s.contains(Status::WT_MODIFIED) {
        Some("M")
    } else if s.contains(Status::WT_DELETED) {
        Some("D")
    } else if s.contains(Status::WT_RENAMED) {
        Some("R")
    } else if s.contains(Status::WT_TYPECHANGE) {
        Some("T")
    } else {
        None
    }
}

/// Status of the repository containing `repo_path`. Returns `isRepo: false`
/// (not an error) when the folder isn't under git.
#[tauri::command]
pub fn git_status(repo_path: String) -> Result<GitStatus, String> {
    let repo = match Repository::discover(&repo_path) {
        Ok(r) => r,
        Err(_) => {
            return Ok(GitStatus { is_repo: false, branch: None, staged: vec![], unstaged: vec![] })
        }
    };

    let branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(String::from))
        .or_else(|| {
            // Unborn HEAD (no commits yet): read the symbolic target.
            repo.find_reference("HEAD")
                .ok()
                .and_then(|r| r.symbolic_target().map(|t| t.rsplit('/').next().unwrap_or(t).to_string()))
        });

    let mut opts = StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    for entry in statuses.iter() {
        let Some(path) = entry.path() else { continue };
        let s = entry.status();
        if let Some(letter) = staged_letter(s) {
            staged.push(GitFile { path: path.to_string(), status: letter.to_string() });
        }
        if let Some(letter) = unstaged_letter(s) {
            unstaged.push(GitFile { path: path.to_string(), status: letter.to_string() });
        }
    }

    Ok(GitStatus { is_repo: true, branch, staged, unstaged })
}

/// Unified diff for a single file. `staged` selects HEAD→index vs index→workdir.
#[tauri::command]
pub fn git_diff_file(repo_path: String, path: String, staged: bool) -> Result<String, String> {
    let repo = Repository::discover(&repo_path).map_err(|e| e.to_string())?;

    let mut opts = DiffOptions::new();
    opts.pathspec(&path);
    opts.include_untracked(true).recurse_untracked_dirs(true).show_untracked_content(true);

    let diff = if staged {
        let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
        repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut opts))
            .map_err(|e| e.to_string())?
    } else {
        repo.diff_index_to_workdir(None, Some(&mut opts)).map_err(|e| e.to_string())?
    };

    let mut buf = String::new();
    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        if matches!(line.origin(), '+' | '-' | ' ') {
            buf.push(line.origin());
        }
        buf.push_str(&String::from_utf8_lossy(line.content()));
        true
    })
    .map_err(|e| e.to_string())?;

    if buf.is_empty() {
        buf.push_str("(no textual changes)\n");
    }
    Ok(buf)
}

/// Stage files (add, or remove from index when deleted on disk).
#[tauri::command]
pub fn git_stage(repo_path: String, paths: Vec<String>) -> Result<(), String> {
    let repo = Repository::discover(&repo_path).map_err(|e| e.to_string())?;
    let workdir = repo.workdir().ok_or("bare repository")?.to_path_buf();
    let mut index = repo.index().map_err(|e| e.to_string())?;
    for p in &paths {
        let rel = Path::new(p);
        if workdir.join(rel).exists() {
            index.add_path(rel).map_err(|e| e.to_string())?;
        } else {
            index.remove_path(rel).map_err(|e| e.to_string())?;
        }
    }
    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

/// Unstage files (reset them in the index to their HEAD state).
#[tauri::command]
pub fn git_unstage(repo_path: String, paths: Vec<String>) -> Result<(), String> {
    let repo = Repository::discover(&repo_path).map_err(|e| e.to_string())?;
    match repo.head() {
        Ok(head) => {
            let obj = head.peel(ObjectType::Commit).map_err(|e| e.to_string())?;
            repo.reset_default(Some(&obj), paths.iter().map(String::as_str))
                .map_err(|e| e.to_string())?;
        }
        Err(_) => {
            // Unborn HEAD: there's nothing to reset to — just drop from the index.
            let mut index = repo.index().map_err(|e| e.to_string())?;
            for p in &paths {
                let _ = index.remove_path(Path::new(p));
            }
            index.write().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Commit the staged index with the repo's configured author. Returns the OID.
#[tauri::command]
pub fn git_commit(repo_path: String, message: String) -> Result<String, String> {
    let repo = Repository::discover(&repo_path).map_err(|e| e.to_string())?;
    let sig = repo
        .signature()
        .map_err(|_| "git user.name / user.email is not configured".to_string())?;

    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;

    let parents = match repo.head() {
        Ok(h) => vec![h.peel_to_commit().map_err(|e| e.to_string())?],
        Err(_) => vec![],
    };
    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();

    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parent_refs)
        .map_err(|e| e.to_string())?;
    Ok(oid.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static N: AtomicU64 = AtomicU64::new(0);

    fn temp_repo() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "nexcode-git-test-{}-{}",
            std::process::id(),
            N.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir_all(&dir).unwrap();
        let repo = git2::Repository::init(&dir).unwrap();
        let mut cfg = repo.config().unwrap();
        cfg.set_str("user.name", "Test").unwrap();
        cfg.set_str("user.email", "test@nexcode.dev").unwrap();
        dir
    }

    #[test]
    fn status_stage_commit_roundtrip() {
        let dir = temp_repo();
        let path = dir.to_string_lossy().to_string();
        std::fs::write(dir.join("a.txt"), "hello\n").unwrap();

        // Untracked file shows up as unstaged "?".
        let st = git_status(path.clone()).unwrap();
        assert!(st.is_repo);
        assert!(st.staged.is_empty());
        assert_eq!(st.unstaged.len(), 1);
        assert_eq!(st.unstaged[0].status, "?");

        // After staging it becomes "A" with a diff containing the content.
        git_stage(path.clone(), vec!["a.txt".into()]).unwrap();
        let st = git_status(path.clone()).unwrap();
        assert_eq!(st.staged.len(), 1);
        assert_eq!(st.staged[0].status, "A");
        let diff = git_diff_file(path.clone(), "a.txt".into(), true).unwrap();
        assert!(diff.contains("hello"), "diff was: {diff:?}");

        // Commit clears the working tree.
        let oid = git_commit(path.clone(), "initial".into()).unwrap();
        assert_eq!(oid.len(), 40);
        let st = git_status(path.clone()).unwrap();
        assert!(st.staged.is_empty());
        assert!(st.unstaged.is_empty());

        let _ = std::fs::remove_dir_all(&dir);
    }
}
