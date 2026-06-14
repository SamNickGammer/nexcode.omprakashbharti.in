// NexCode workbench service configuration. Adapted from the monaco-vscode-api
// v33 workbench demo, trimmed to our service set and branded NexCode. This wires
// the real VSCode workbench services; the on-disk bridge to our Tauri Rust
// backend (filesystem, terminal, git) is layered on in the next stage.

import * as monaco from "monaco-editor";
import * as vscode from "vscode";
import {
  type IEditorOverrideServices,
  type IWorkbenchConstructionOptions,
  LogLevel,
} from "@codingame/monaco-vscode-api";
import { type EnvironmentOverride } from "@codingame/monaco-vscode-api/workbench";
import getConfigurationServiceOverride, {
  type IStoredWorkspace,
  initUserConfiguration,
} from "@codingame/monaco-vscode-configuration-service-override";
import getKeybindingsServiceOverride, {
  initUserKeybindings,
} from "@codingame/monaco-vscode-keybindings-service-override";
import {
  RegisteredFileSystemProvider,
  RegisteredMemoryFile,
  createIndexedDBProviders,
  registerFileSystemOverlay,
} from "@codingame/monaco-vscode-files-service-override";
import getModelServiceOverride from "@codingame/monaco-vscode-model-service-override";
import getNotificationServiceOverride from "@codingame/monaco-vscode-notifications-service-override";
import getDialogsServiceOverride from "@codingame/monaco-vscode-dialogs-service-override";
import getTextmateServiceOverride from "@codingame/monaco-vscode-textmate-service-override";
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override";
import getLanguageDetectionWorkerServiceOverride from "@codingame/monaco-vscode-language-detection-worker-service-override";
import getStorageServiceOverride from "@codingame/monaco-vscode-storage-service-override";
import getExtensionServiceOverride from "@codingame/monaco-vscode-extensions-service-override";
import getExtensionGalleryServiceOverride from "@codingame/monaco-vscode-extension-gallery-service-override";
import getAuthenticationServiceOverride from "@codingame/monaco-vscode-authentication-service-override";
import getLogServiceOverride from "@codingame/monaco-vscode-log-service-override";
import getHostServiceOverride from "@codingame/monaco-vscode-host-service-override";
import getEnvironmentServiceOverride from "@codingame/monaco-vscode-environment-service-override";
import getLifecycleServiceOverride from "@codingame/monaco-vscode-lifecycle-service-override";
import getRemoteAgentServiceOverride from "@codingame/monaco-vscode-remote-agent-service-override";
import getWorkspaceTrustOverride from "@codingame/monaco-vscode-workspace-trust-service-override";
import getWorkingCopyServiceOverride from "@codingame/monaco-vscode-working-copy-service-override";
import getSecretStorageServiceOverride from "@codingame/monaco-vscode-secret-storage-service-override";
import getExplorerServiceOverride from "@codingame/monaco-vscode-explorer-service-override";
import getSearchServiceOverride from "@codingame/monaco-vscode-search-service-override";
import getScmServiceOverride from "@codingame/monaco-vscode-scm-service-override";
import getMarkersServiceOverride from "@codingame/monaco-vscode-markers-service-override";
import getOutputServiceOverride from "@codingame/monaco-vscode-output-service-override";
import getTerminalServiceOverride from "@codingame/monaco-vscode-terminal-service-override";
import getDebugServiceOverride from "@codingame/monaco-vscode-debug-service-override";
import getPreferencesServiceOverride from "@codingame/monaco-vscode-preferences-service-override";
import getSnippetServiceOverride from "@codingame/monaco-vscode-snippets-service-override";
import getOutlineServiceOverride from "@codingame/monaco-vscode-outline-service-override";
import getTimelineServiceOverride from "@codingame/monaco-vscode-timeline-service-override";
import getBannerServiceOverride from "@codingame/monaco-vscode-view-banner-service-override";
import getStatusBarServiceOverride from "@codingame/monaco-vscode-view-status-bar-service-override";
import getTitleBarServiceOverride from "@codingame/monaco-vscode-view-title-bar-service-override";
import getAccessibilityServiceOverride from "@codingame/monaco-vscode-accessibility-service-override";
import getTestingServiceOverride from "@codingame/monaco-vscode-testing-service-override";
import getEmmetServiceOverride from "@codingame/monaco-vscode-emmet-service-override";
import { Worker } from "./fakeWorker";
import { TerminalBackend } from "./terminal";
import { DEFAULT_CONFIGURATION, DEFAULT_KEYBINDINGS } from "./userConfig";
import "vscode/localExtensionHost";

export const workspaceFile = monaco.Uri.file("/workspace.code-workspace");

export const userDataProvider = await createIndexedDBProviders();

// Seed an in-memory workspace. (The Tauri-backed on-disk provider replaces this
// in the next stage so the explorer shows the real filesystem.)
const fileSystemProvider = new RegisteredFileSystemProvider(false);

fileSystemProvider.registerFile(
  new RegisteredMemoryFile(
    vscode.Uri.file("/workspace/WELCOME.md"),
    `# Welcome to NexCode

This is the **real VSCode workbench** running inside NexCode's lightweight Tauri shell —
no Electron.

- Command palette: **⌘⇧P**
- Quick open: **⌘P**
- Toggle terminal: **⌃\`**
- Settings: **⌘,**

Open a folder and your NexCode features (multiplayer, BYOK AI, smart terminal, the merge
resolver) will layer on top of everything VSCode already gives you.
`,
  ),
);

fileSystemProvider.registerFile(
  new RegisteredMemoryFile(
    workspaceFile,
    JSON.stringify(<IStoredWorkspace>{ folders: [{ path: "/workspace" }] }, null, 2),
  ),
);

registerFileSystemOverlay(1, fileSystemProvider);

// Web workers (Vite resolves these URLs; see vite.config.ts).
const workers: Partial<Record<string, Worker>> = {
  editorWorkerService: new Worker(
    new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url),
    { type: "module" },
  ),
  extensionHostWorkerMain: new Worker(
    new URL("@codingame/monaco-vscode-api/workers/extensionHost.worker", import.meta.url),
    { type: "module" },
  ),
  TextMateWorker: new Worker(
    new URL("@codingame/monaco-vscode-textmate-service-override/worker", import.meta.url),
    { type: "module" },
  ),
  OutputLinkDetectionWorker: new Worker(
    new URL("@codingame/monaco-vscode-output-service-override/worker", import.meta.url),
    { type: "module" },
  ),
  LanguageDetectionWorker: new Worker(
    new URL(
      "@codingame/monaco-vscode-language-detection-worker-service-override/worker",
      import.meta.url,
    ),
    { type: "module" },
  ),
  LocalFileSearchWorker: new Worker(
    new URL("@codingame/monaco-vscode-search-service-override/worker", import.meta.url),
    { type: "module" },
  ),
};

window.MonacoEnvironment = {
  getWorkerUrl(_, label) {
    return workers[label]?.url.toString();
  },
  getWorkerOptions(_, label) {
    return workers[label]?.options;
  },
};

// Apply user config before service init (prevents a theme flicker).
await Promise.all([
  initUserConfiguration(DEFAULT_CONFIGURATION),
  initUserKeybindings(DEFAULT_KEYBINDINGS),
]);

export const constructOptions: IWorkbenchConstructionOptions = {
  enableWorkspaceTrust: true,
  windowIndicator: { label: "NexCode", tooltip: "", command: "" },
  workspaceProvider: {
    trusted: true,
    async open() {
      window.open(window.location.href);
      return true;
    },
    workspace: { workspaceUri: workspaceFile },
  },
  developmentOptions: { logLevel: LogLevel.Info },
  configurationDefaults: {
    "window.title": "NexCode${separator}${dirty}${activeEditorShort}",
  },
  defaultLayout: {
    editors: [{ uri: monaco.Uri.file("/workspace/WELCOME.md"), viewColumn: 1 }],
    views: [],
    force: false,
  },
  productConfiguration: {
    nameShort: "NexCode",
    nameLong: "NexCode IDE",
    extensionsGallery: {
      serviceUrl: "https://open-vsx.org/vscode/gallery",
      resourceUrlTemplate: "https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}",
      extensionUrlTemplate: "https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest",
      controlUrl: "",
      nlsBaseUrl: "",
    },
  },
};

export const envOptions: EnvironmentOverride = {
  userHome: vscode.Uri.file("/"),
};

export const commonServices: IEditorOverrideServices = {
  ...getAuthenticationServiceOverride(),
  ...getLogServiceOverride(),
  ...getExtensionServiceOverride({ enableWorkerExtensionHost: true }),
  ...getExtensionGalleryServiceOverride({ webOnly: false }),
  ...getModelServiceOverride(),
  ...getNotificationServiceOverride(),
  ...getDialogsServiceOverride(),
  ...getConfigurationServiceOverride(),
  ...getKeybindingsServiceOverride(),
  ...getTextmateServiceOverride(),
  ...getThemeServiceOverride(),
  ...getLanguagesServiceOverride(),
  ...getDebugServiceOverride(),
  ...getPreferencesServiceOverride(),
  ...getOutlineServiceOverride(),
  ...getTimelineServiceOverride(),
  ...getBannerServiceOverride(),
  ...getStatusBarServiceOverride(),
  ...getTitleBarServiceOverride(),
  ...getSnippetServiceOverride(),
  ...getOutputServiceOverride(),
  ...getTerminalServiceOverride(new TerminalBackend()),
  ...getSearchServiceOverride(),
  ...getMarkersServiceOverride(),
  ...getAccessibilityServiceOverride(),
  ...getLanguageDetectionWorkerServiceOverride(),
  ...getStorageServiceOverride(),
  ...getRemoteAgentServiceOverride(),
  ...getLifecycleServiceOverride(),
  ...getEnvironmentServiceOverride(),
  ...getHostServiceOverride(),
  ...getWorkspaceTrustOverride(),
  ...getWorkingCopyServiceOverride(),
  ...getScmServiceOverride(),
  ...getTestingServiceOverride(),
  ...getExplorerServiceOverride(),
  ...getEmmetServiceOverride(),
  ...getSecretStorageServiceOverride(),
};
