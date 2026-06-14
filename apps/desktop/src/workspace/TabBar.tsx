// Tab strip for open files (PRD §4.1). Shows the active tab, a dirty dot for
// unsaved changes, and a close affordance per tab.

import type { MouseEvent } from "react";
import { isTabDirty, useWorkspace } from "./store";

export function TabBar() {
  const tabs = useWorkspace((s) => s.tabs);
  const activePath = useWorkspace((s) => s.activePath);
  const setActive = useWorkspace((s) => s.setActive);
  const closeTab = useWorkspace((s) => s.closeTab);

  if (tabs.length === 0) return null;

  function onClose(e: MouseEvent, path: string) {
    e.stopPropagation();
    closeTab(path);
  }

  return (
    <div className="tabbar" role="tablist">
      {tabs.map((tab) => {
        const active = tab.path === activePath;
        const dirty = isTabDirty(tab);
        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={active}
            className={`tab${active ? " is-active" : ""}`}
            onClick={() => setActive(tab.path)}
            title={tab.path}
          >
            <span className="tab-name">{tab.name}</span>
            <button
              className="tab-close"
              onClick={(e) => onClose(e, tab.path)}
              aria-label={`Close ${tab.name}`}
            >
              {dirty ? <span className="tab-dirty" /> : "×"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
