// Minimal cross-platform path helpers (the renderer works with absolute paths
// returned by the Rust backend; we only need display-oriented utilities here).

/** Last path segment, e.g. "/a/b/c.ts" -> "c.ts". */
export function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

/** Path relative to a root folder, for compact display (e.g. in Cmd+P). */
export function relativeTo(root: string, path: string): string {
  const normalizedRoot = root.endsWith("/") ? root : `${root}/`;
  return path.startsWith(normalizedRoot) ? path.slice(normalizedRoot.length) : path;
}
