// The currently-open folder path, persisted across reloads. Pure localStorage —
// no VSCode imports, so services.ts can read it before the workbench boots.

const FOLDER_KEY = "nexcode.folder";

export function getStoredFolder(): string | null {
  return localStorage.getItem(FOLDER_KEY);
}

export function setStoredFolder(path: string): void {
  localStorage.setItem(FOLDER_KEY, path);
}

export function clearStoredFolder(): void {
  localStorage.removeItem(FOLDER_KEY);
}
