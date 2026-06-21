// "Open Folder" / "Close Folder" flow. Opening a real folder stores its path and
// reloads — on the next boot, services.ts registers the Tauri filesystem provider
// and sets the workspace to that folder (web VSCode changes workspace by reload).

import { open } from "@tauri-apps/plugin-dialog";
import { ExtensionHostKind } from "@codingame/monaco-vscode-extensions-service-override";
import { registerExtension } from "@codingame/monaco-vscode-api/extensions";
import { clearStoredFolder, setStoredFolder } from "./folderStore";

/** Show the native folder picker; on choose, persist + reload into that folder. */
export async function pickAndOpenFolder(): Promise<void> {
  const selected = await open({ directory: true, multiple: false });
  if (typeof selected === "string") {
    setStoredFolder(selected);
    location.reload();
  }
}

/** Drop back to the welcome workspace. */
export function closeFolder(): void {
  clearStoredFolder();
  location.reload();
}

/** Register the NexCode folder commands (palette + ⌘O) once the workbench is up. */
export async function initFolderCommands(): Promise<void> {
  const { getApi } = registerExtension(
    {
      name: "nexcode-workspace",
      publisher: "nexcode",
      version: "0.1.0",
      engines: { vscode: "*" },
      contributes: {
        commands: [
          { command: "nexcode.openFolder", title: "Open Folder…", category: "NexCode" },
          { command: "nexcode.closeFolder", title: "Close Folder", category: "NexCode" },
        ],
      },
    },
    ExtensionHostKind.LocalProcess,
  );

  const api = await getApi();
  api.commands.registerCommand("nexcode.openFolder", () => void pickAndOpenFolder());
  api.commands.registerCommand("nexcode.closeFolder", () => closeFolder());
}
