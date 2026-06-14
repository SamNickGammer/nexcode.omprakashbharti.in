// A single terminal instance: an xterm.js viewport bridged to a backend PTY
// session over Tauri IPC + events (PRD §7.1).

import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";
import {
  terminalClose,
  terminalCreate,
  terminalResize,
  terminalWrite,
  type TerminalDataEvent,
} from "@/lib/tauri";
import { useWorkspace } from "@/workspace";

export function TerminalView({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const idRef = useRef<string | null>(null);

  // Create the xterm instance and its PTY exactly once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new XTerm({
      fontSize: 13,
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
      cursorBlink: true,
      theme: { background: "#1e1e1e", foreground: "#d4d4d4" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    let disposed = false;
    let unlisten: (() => void) | null = null;

    const cwd = useWorkspace.getState().folder;
    void terminalCreate(cwd, term.cols, term.rows).then(async (id) => {
      if (disposed) {
        void terminalClose(id);
        return;
      }
      idRef.current = id;
      unlisten = await listen<TerminalDataEvent>("terminal://data", (e) => {
        if (e.payload.id === id) term.write(new Uint8Array(e.payload.data));
      });
    });

    const onData = term.onData((d) => {
      if (idRef.current) void terminalWrite(idRef.current, d);
    });

    return () => {
      disposed = true;
      onData.dispose();
      unlisten?.();
      if (idRef.current) void terminalClose(idRef.current);
      term.dispose();
    };
  }, []);

  // Refit whenever this terminal becomes the active tab or its container resizes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function refit() {
      if (!active) return;
      const fit = fitRef.current;
      const term = termRef.current;
      const id = idRef.current;
      if (fit && term && id) {
        fit.fit();
        void terminalResize(id, term.cols, term.rows);
      }
    }

    refit();
    const ro = new ResizeObserver(refit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [active]);

  // Focus the active terminal for immediate typing.
  useEffect(() => {
    if (active) termRef.current?.focus();
  }, [active]);

  return <div ref={containerRef} className="terminal-view" />;
}
