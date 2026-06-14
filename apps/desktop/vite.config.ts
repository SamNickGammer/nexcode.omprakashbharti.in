import { defineConfig } from "vite";
import importMetaUrlPlugin from "@codingame/esbuild-import-meta-url-plugin";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

// All monaco-vscode-api packages (plus the vscode/monaco aliases) must be
// pre-bundled and deduped, or Chrome/WebKit chokes on the module count.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8"),
) as { dependencies: Record<string, string> };
const vscodeDeps = Object.keys(pkg.dependencies).filter(
  (name) => name.startsWith("@codingame/monaco-vscode-") || name === "vscode" || name === "monaco-editor",
);

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  build: { target: "esnext" },
  worker: { format: "es" },
  esbuild: { minifySyntax: false },
  optimizeDeps: {
    include: [
      ...vscodeDeps,
      "@codingame/monaco-vscode-api/extensions",
      "@codingame/monaco-vscode-api/monaco",
      "vscode/localExtensionHost",
    ],
    esbuildOptions: {
      tsconfig: "./tsconfig.json",
      plugins: [importMetaUrlPlugin],
    },
  },
  resolve: {
    dedupe: ["vscode", ...vscodeDeps],
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [
    {
      // VSCode ships CSS that must be loaded as strings (injected into the
      // workbench), not as Vite stylesheets.
      name: "load-vscode-css-as-string",
      enforce: "pre",
      async resolveId(source, importer, options) {
        const resolved = await this.resolve(source, importer, options);
        if (
          resolved?.id.match(/node_modules\/(@codingame\/monaco-vscode|vscode|monaco-editor).*\.css$/)
        ) {
          return { ...resolved, id: resolved.id + "?inline" };
        }
        return undefined;
      },
    },
    {
      // Cross-origin isolation so language-feature workers can use SharedArrayBuffer.
      name: "cross-origin-isolation",
      apply: "serve",
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
          next();
        });
      },
    },
  ],
  // Tauri expects a fixed port.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    fs: { allow: ["../.."] },
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
