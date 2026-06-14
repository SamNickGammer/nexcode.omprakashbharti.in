// Git source-control state (PRD §4.4). Holds the repo status, the commit
// message draft, and the currently-open diff. Reads the active folder from the
// workspace store so it always targets the open project.

import { create } from "zustand";
import { gitCommit, gitDiffFile, gitStage, gitStatus, gitUnstage, type GitFile } from "@/lib/tauri";
import { useWorkspace } from "@/workspace";

interface OpenDiff {
  path: string;
  staged: boolean;
  content: string;
}

interface GitState {
  isRepo: boolean;
  branch: string | null;
  staged: GitFile[];
  unstaged: GitFile[];
  loading: boolean;
  error: string | null;
  message: string;
  diff: OpenDiff | null;

  refresh: () => Promise<void>;
  stage: (paths: string[]) => Promise<void>;
  unstage: (paths: string[]) => Promise<void>;
  commit: () => Promise<void>;
  setMessage: (message: string) => void;
  openDiff: (path: string, staged: boolean) => Promise<void>;
  closeDiff: () => void;
}

function folder(): string | null {
  return useWorkspace.getState().folder;
}

export const useGit = create<GitState>((set, get) => ({
  isRepo: false,
  branch: null,
  staged: [],
  unstaged: [],
  loading: false,
  error: null,
  message: "",
  diff: null,

  refresh: async () => {
    const dir = folder();
    if (!dir) {
      set({ isRepo: false, branch: null, staged: [], unstaged: [], error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const status = await gitStatus(dir);
      set({
        isRepo: status.isRepo,
        branch: status.branch,
        staged: status.staged,
        unstaged: status.unstaged,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  stage: async (paths) => {
    const dir = folder();
    if (!dir || paths.length === 0) return;
    await gitStage(dir, paths);
    await get().refresh();
  },

  unstage: async (paths) => {
    const dir = folder();
    if (!dir || paths.length === 0) return;
    await gitUnstage(dir, paths);
    await get().refresh();
  },

  commit: async () => {
    const dir = folder();
    const message = get().message.trim();
    if (!dir || message === "" || get().staged.length === 0) return;
    set({ error: null });
    try {
      await gitCommit(dir, message);
      set({ message: "" });
      await get().refresh();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setMessage: (message) => set({ message }),

  openDiff: async (path, staged) => {
    const dir = folder();
    if (!dir) return;
    try {
      const content = await gitDiffFile(dir, path, staged);
      set({ diff: { path, staged, content } });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  closeDiff: () => set({ diff: null }),
}));
