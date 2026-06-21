// Default user settings & keybindings applied before the workbench boots.

export const DEFAULT_CONFIGURATION = JSON.stringify({
  "workbench.colorTheme": "NexCode Nova",
  "workbench.iconTheme": "material-icon-theme",
  "workbench.startupEditor": "none",
  "editor.fontFamily": "'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
  "editor.fontSize": 13,
  "editor.lineHeight": 1.6,
  "editor.fontLigatures": true,
  "editor.cursorBlinking": "smooth",
  "editor.cursorSmoothCaretAnimation": "on",
  "editor.smoothScrolling": true,
  "editor.minimap.enabled": true,
  "editor.scrollBeyondLastLine": true,
  "editor.semanticHighlighting.enabled": true,
  "editor.acceptSuggestionOnEnter": "on",
  "editor.renderWhitespace": "none",
  "editor.guides.indentation": true,
  "workbench.list.smoothScrolling": true,
  "workbench.tree.indent": 14,
  "files.autoSave": "off",
  "workbench.sideBar.location": "left",
});

export const DEFAULT_KEYBINDINGS = JSON.stringify([
  { key: "cmd+o", command: "nexcode.openFolder" },
  { key: "ctrl+o", command: "nexcode.openFolder" },
]);
