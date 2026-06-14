// Workspace module — file explorer, tabs, quick-open, and the shared store
// (PRD §4.2 File System & Project Management).
export { FileExplorer } from "./FileExplorer";
export { TabBar } from "./TabBar";
export { QuickOpen } from "./QuickOpen";
export { useWorkspace, isTabDirty, type OpenTab } from "./store";
