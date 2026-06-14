// Cmd+P quick-open palette — fuzzy file finder over the workspace (PRD §4.2).
// Opens on ⌘P, filters as you type, ↑/↓ to move, ↵ to open, Esc to close.

import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "./store";
import { relativeTo } from "@/lib/path";
import { fuzzyFilter } from "./fuzzy";

const MAX_RESULTS = 50;

export function QuickOpen() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const folder = useWorkspace((s) => s.folder);
  const fileList = useWorkspace((s) => s.fileList);
  const openFile = useWorkspace((s) => s.openFile);

  // Global ⌘P / Ctrl+P toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setSelected(0);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    if (!folder) return [];
    const display = (p: string) => relativeTo(folder, p);
    if (query.trim() === "") {
      return fileList.slice(0, MAX_RESULTS).map((path) => ({ path, label: display(path) }));
    }
    return fuzzyFilter(query, fileList, display, MAX_RESULTS).map((m) => ({
      path: m.item,
      label: display(m.item),
    }));
  }, [folder, fileList, query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  if (!open) return null;

  function choose(path: string) {
    void openFile(path);
    setOpen(false);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[selected];
      if (hit) choose(hit.path);
    }
  }

  return (
    <div className="palette-backdrop" onClick={() => setOpen(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder={folder ? "Go to file…" : "Open a folder first"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
        />
        <ul className="palette-results">
          {results.map((r, i) => (
            <li
              key={r.path}
              className={`palette-item${i === selected ? " is-selected" : ""}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => choose(r.path)}
            >
              {r.label}
            </li>
          ))}
          {results.length === 0 && <li className="palette-empty">No matching files</li>}
        </ul>
      </div>
    </div>
  );
}
