// Terminal panel state (PRD §7.1) — whether the panel is open, the open
// terminal tabs, and which one is active. Each tab owns its own PTY session,
// created lazily by its <TerminalView> when mounted.

import { create } from "zustand";

let seq = 1;

export interface TermTab {
  /** Stable frontend key (distinct from the backend PTY session id). */
  key: string;
  title: string;
}

interface TerminalState {
  open: boolean;
  tabs: TermTab[];
  activeKey: string | null;

  togglePanel: () => void;
  openPanel: () => void;
  addTerminal: () => void;
  closeTerminal: (key: string) => void;
  setActive: (key: string) => void;
}

function makeTab(): TermTab {
  const n = seq++;
  return { key: `term-tab-${n}`, title: `zsh ${n}` };
}

export const useTerminal = create<TerminalState>((set, get) => ({
  open: false,
  tabs: [],
  activeKey: null,

  togglePanel: () => {
    const { open } = get();
    if (open) {
      set({ open: false });
    } else {
      get().openPanel();
    }
  },

  openPanel: () => {
    const { tabs } = get();
    if (tabs.length === 0) {
      const tab = makeTab();
      set({ open: true, tabs: [tab], activeKey: tab.key });
    } else {
      set({ open: true });
    }
  },

  addTerminal: () => {
    const tab = makeTab();
    set((s) => ({ open: true, tabs: [...s.tabs, tab], activeKey: tab.key }));
  },

  closeTerminal: (key) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.key === key);
      if (idx === -1) return s;
      const tabs = s.tabs.filter((t) => t.key !== key);
      let activeKey = s.activeKey;
      if (activeKey === key) {
        const next = tabs[idx] ?? tabs[idx - 1] ?? null;
        activeKey = next ? next.key : null;
      }
      return { tabs, activeKey, open: tabs.length > 0 ? s.open : false };
    });
  },

  setActive: (key) => set({ activeKey: key }),
}));
