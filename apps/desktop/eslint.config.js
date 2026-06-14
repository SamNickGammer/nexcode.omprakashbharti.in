import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // The workbench integration mirrors the upstream monaco-vscode-api setup;
  // don't lint it against our app rules.
  { ignores: ["dist", "src-tauri", "src/workbench"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022 },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
