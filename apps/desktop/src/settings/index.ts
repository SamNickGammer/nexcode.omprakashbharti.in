// Settings module — settings store + UI, theme support, keybinding editor,
// VSCode settings import, and per-provider API key management backed by the
// macOS Keychain (PRD §8.3, §10).
//
// TODO (Phase 1/3): settings schema, VSCode import, Keychain-backed keys.

export interface NexCodeSettings {
  theme: "system" | "light" | "dark";
  // ... expanded in Phase 1 (VSCode-compatible settings.json schema)
}

export const DEFAULT_SETTINGS: NexCodeSettings = {
  theme: "system",
};
