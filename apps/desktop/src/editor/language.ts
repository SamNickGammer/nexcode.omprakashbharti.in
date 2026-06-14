// Map a file path to a Monaco language id for syntax highlighting (PRD §4.1).
// Monaco ships grammars for 100+ languages; this covers the common ones and
// falls back to "plaintext".

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  less: "less",
  md: "markdown",
  markdown: "markdown",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  rb: "ruby",
  swift: "swift",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  xml: "xml",
  sql: "sql",
  dockerfile: "dockerfile",
  graphql: "graphql",
  vue: "vue",
  svelte: "html",
};

const FILENAME_TO_LANGUAGE: Record<string, string> = {
  dockerfile: "dockerfile",
  makefile: "plaintext",
  ".gitignore": "plaintext",
  ".env": "plaintext",
};

export function languageForPath(path: string): string {
  const name = path.split(/[/\\]/).pop()?.toLowerCase() ?? "";
  if (FILENAME_TO_LANGUAGE[name]) return FILENAME_TO_LANGUAGE[name];
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  return EXT_TO_LANGUAGE[ext] ?? "plaintext";
}
