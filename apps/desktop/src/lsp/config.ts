// Language → server command map (PRD §4.3). TypeScript/JavaScript ships bundled
// (resolved from node_modules by the backend); the others activate when their
// server is installed on PATH. Users can extend this in settings later.

export interface LspServerConfig {
  command: string;
  args: string[];
}

export const LSP_SERVERS: Record<string, LspServerConfig> = {
  typescript: { command: "typescript-language-server", args: ["--stdio"] },
  javascript: { command: "typescript-language-server", args: ["--stdio"] },
  python: { command: "pylsp", args: [] },
  rust: { command: "rust-analyzer", args: [] },
  go: { command: "gopls", args: [] },
};

export function serverFor(languageId: string): LspServerConfig | undefined {
  return LSP_SERVERS[languageId];
}
