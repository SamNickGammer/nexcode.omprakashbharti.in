// Workspace store — the open folder, the file tabs, and the active tab
// (PRD §4.2). Backed by Zustand; the file tree, tab bar, editor, and Cmd+P all
// read and mutate this single source of truth.

import { create } from "zustand";
import { listFiles, pickFolder, readFile, writeFile } from "@/lib/tauri";
import { basename } from "@/lib/path";
import { languageForPath } from "@/editor/language";

export interface OpenTab {
  path: string;
  name: string;
  language: string;
  /** Current editor buffer. */
  content: string;
  /** Last-persisted content; `content !== savedContent` means the tab is dirty. */
  savedContent: string;
}

interface WorkspaceState {
  folder: string | null;
  folderName: string | null;
  /** Recursive file list for the current folder (lazy; feeds Cmd+P). */
  fileList: string[];
  tabs: OpenTab[];
  activePath: string | null;

  openFolderDialog: () => Promise<void>;
  setFolder: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  saveTab: (path: string) => Promise<void>;
  saveActive: () => Promise<void>;
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  folder: null,
  folderName: null,
  fileList: [],
  tabs: [],
  activePath: null,

  openFolderDialog: async () => {
    const path = await pickFolder();
    if (path) await get().setFolder(path);
  },

  setFolder: async (path) => {
    set({ folder: path, folderName: basename(path), fileList: [] });
    try {
      const files = await listFiles(path);
      // Only apply if the user hasn't switched folders meanwhile.
      if (get().folder === path) set({ fileList: files });
    } catch {
      /* file list is best-effort; Cmd+P just stays empty */
    }
  },

  openFile: async (path) => {
    const existing = get().tabs.find((t) => t.path === path);
    if (existing) {
      set({ activePath: path });
      return;
    }
    const content = await readFile(path);
    const tab: OpenTab = {
      path,
      name: basename(path),
      language: languageForPath(path),
      content,
      savedContent: content,
    };
    set((s) => ({ tabs: [...s.tabs, tab], activePath: path }));
  },

  closeTab: (path) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.path === path);
      if (idx === -1) return s;
      const tabs = s.tabs.filter((t) => t.path !== path);
      let activePath = s.activePath;
      if (activePath === path) {
        const next = tabs[idx] ?? tabs[idx - 1] ?? null;
        activePath = next ? next.path : null;
      }
      return { tabs, activePath };
    });
  },

  setActive: (path) => set({ activePath: path }),

  updateContent: (path, content) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.path === path ? { ...t, content } : t)),
    })),

  saveTab: async (path) => {
    const tab = get().tabs.find((t) => t.path === path);
    if (!tab) return;
    await writeFile(tab.path, tab.content);
    set((s) => ({
      tabs: s.tabs.map((t) => (t.path === path ? { ...t, savedContent: tab.content } : t)),
    }));
  },

  saveActive: async () => {
    const { activePath } = get();
    if (activePath) await get().saveTab(activePath);
  },
}));

/** Selector helper: is a given tab dirty? */
export function isTabDirty(tab: OpenTab): boolean {
  return tab.content !== tab.savedContent;
}
