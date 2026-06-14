// Boots the full VSCode workbench into the page. Owns the whole window.

import { initialize as initializeMonacoService } from "@codingame/monaco-vscode-api";
import getWorkbenchServiceOverride from "@codingame/monaco-vscode-workbench-service-override";
import getQuickAccessServiceOverride from "@codingame/monaco-vscode-quickaccess-service-override";
import { ExtensionHostKind } from "@codingame/monaco-vscode-extensions-service-override";
import { registerExtension } from "@codingame/monaco-vscode-api/extensions";
import { commonServices, constructOptions, envOptions } from "./services";

const container = document.createElement("div");
container.style.height = "100vh";
container.style.width = "100vw";
document.body.replaceChildren(container);

await initializeMonacoService(
  {
    ...commonServices,
    ...getWorkbenchServiceOverride(),
    ...getQuickAccessServiceOverride({
      isKeybindingConfigurationVisible: () => true,
      shouldUseGlobalPicker: () => true,
    }),
  },
  container,
  constructOptions,
  envOptions,
);

// Register a default (host) extension so the extension API is available to our
// future NexCode built-in features (multiplayer, AI, merge resolver, …).
await registerExtension(
  {
    name: "nexcode",
    publisher: "nexcode",
    version: "0.1.0",
    engines: { vscode: "*" },
  },
  ExtensionHostKind.LocalProcess,
).setAsDefaultApi();
