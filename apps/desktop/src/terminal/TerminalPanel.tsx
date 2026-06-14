// Bottom terminal panel (PRD §7.1) — a tab strip plus the active terminal.
// All tabs stay mounted (hidden when inactive) so their PTY sessions and
// scrollback survive tab switches.

import type { MouseEvent } from "react";
import { useTerminal } from "./store";
import { TerminalView } from "./TerminalView";

export function TerminalPanel() {
  const open = useTerminal((s) => s.open);
  const tabs = useTerminal((s) => s.tabs);
  const activeKey = useTerminal((s) => s.activeKey);
  const setActive = useTerminal((s) => s.setActive);
  const addTerminal = useTerminal((s) => s.addTerminal);
  const closeTerminal = useTerminal((s) => s.closeTerminal);
  const togglePanel = useTerminal((s) => s.togglePanel);

  if (!open) return null;

  function onClose(e: MouseEvent, key: string) {
    e.stopPropagation();
    closeTerminal(key);
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-tabs">
        <span className="terminal-label">TERMINAL</span>
        <div className="terminal-tablist">
          {tabs.map((t) => (
            <div
              key={t.key}
              className={`terminal-tab${t.key === activeKey ? " is-active" : ""}`}
              onClick={() => setActive(t.key)}
            >
              <span>{t.title}</span>
              <button
                className="terminal-tab-close"
                onClick={(e) => onClose(e, t.key)}
                aria-label={`Close ${t.title}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="terminal-actions">
          <button className="terminal-action" onClick={() => addTerminal()} title="New terminal">
            +
          </button>
          <button
            className="terminal-action"
            onClick={() => togglePanel()}
            title="Hide panel (Ctrl+`)"
          >
            ⌄
          </button>
        </div>
      </div>
      <div className="terminal-body">
        {tabs.map((t) => (
          <div
            key={t.key}
            className="terminal-slot"
            style={{ display: t.key === activeKey ? "block" : "none" }}
          >
            <TerminalView active={t.key === activeKey} />
          </div>
        ))}
      </div>
    </div>
  );
}
