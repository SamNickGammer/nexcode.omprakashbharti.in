// NexCode branding layer over the VSCode workbench:
//  1. registers & defaults the "NexCode Carbon" color theme
//  2. drops the NexCode mark into the (custom) title bar
//  3. shows a branded start screen on launch
//
// Imported from main.ts after the workbench has initialized.

import { ExtensionHostKind } from "@codingame/monaco-vscode-extensions-service-override";
import { registerExtension } from "@codingame/monaco-vscode-api/extensions";
import carbonThemeUrl from "./nexcode-carbon-theme.json?url";
import logoUrl from "@/assets/logo.png";
import wordmarkUrl from "@/assets/wordmark.png";

const ACCENT = "#4da6ff";

// 1. Theme — contributed as an extension so the theme service picks it up.
const themeExtension = registerExtension(
  {
    name: "nexcode-theme",
    publisher: "nexcode",
    version: "0.1.0",
    engines: { vscode: "*" },
    contributes: {
      themes: [
        {
          id: "NexCode Carbon",
          label: "NexCode Carbon",
          uiTheme: "vs-dark",
          path: "./themes/nexcode-carbon.json",
        },
      ],
    },
  },
  ExtensionHostKind.LocalProcess,
);
themeExtension.registerFileUrl("/themes/nexcode-carbon.json", carbonThemeUrl);

// 2. Brand CSS — title-bar mark + a little accent polish.
const style = document.createElement("style");
style.textContent = `
  #nexcode-titlebar-mark {
    position: fixed;
    left: 80px;
    top: 0;
    height: var(--nexcode-titlebar-h, 35px);
    display: flex;
    align-items: center;
    gap: 7px;
    z-index: 100000;
    pointer-events: none;
    font: 600 12px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    letter-spacing: 0.04em;
    color: #c7c7cf;
  }
  #nexcode-titlebar-mark img { height: 16px; width: 16px; }

  /* Accent polish */
  .monaco-workbench .part.activitybar .monaco-action-bar .action-item.active .active-item-indicator::before,
  .monaco-workbench .part.activitybar .monaco-action-bar .action-item.checked .active-item-indicator::before {
    border-left-color: ${ACCENT} !important;
  }
  .monaco-editor .cursor { box-shadow: 0 0 6px ${ACCENT}88; }
  .monaco-workbench .monaco-list .monaco-list-row.focused,
  .monaco-workbench .monaco-list .monaco-list-row.selected { border-radius: 5px; }
`;
document.head.appendChild(style);

// Title-bar mark element (fixed so it doesn't depend on VSCode's DOM timing).
const mark = document.createElement("div");
mark.id = "nexcode-titlebar-mark";
mark.innerHTML = `<img src="${logoUrl}" alt="" /><span>NEXCODE</span>`;
document.body.appendChild(mark);

// 3. Branded start screen.
function mountStartScreen(): void {
  const overlay = document.createElement("div");
  overlay.id = "nexcode-splash";
  overlay.innerHTML = `
    <style>
      #nexcode-splash {
        position: fixed; inset: 0; z-index: 99999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background:
          radial-gradient(60% 50% at 50% 38%, #12243a 0%, rgba(10,10,12,0) 70%),
          #0a0a0c;
        opacity: 1; transition: opacity .45s ease;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      #nexcode-splash.hide { opacity: 0; pointer-events: none; }
      #nexcode-splash .wm { width: min(380px, 60vw); filter: drop-shadow(0 8px 40px ${ACCENT}33); }
      #nexcode-splash .tag { margin-top: 22px; color: #8a8a92; font-size: 14px; letter-spacing: .02em; }
      #nexcode-splash .chips { margin-top: 30px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
      #nexcode-splash .chip {
        font-size: 12px; color: #b6c2d9; background: #101218; border: 1px solid #1f1f25;
        padding: 6px 11px; border-radius: 8px; display: inline-flex; gap: 8px; align-items: center;
      }
      #nexcode-splash .chip b { color: #e3e3e6; font-weight: 600; }
      #nexcode-splash .enter {
        margin-top: 38px; cursor: pointer; border: none; border-radius: 10px;
        padding: 11px 26px; font-size: 14px; font-weight: 600; color: #04060a;
        background: ${ACCENT}; transition: background .15s ease, transform .1s ease;
      }
      #nexcode-splash .enter:hover { background: #6cb6ff; }
      #nexcode-splash .enter:active { transform: translateY(1px); }
      #nexcode-splash .hint { margin-top: 14px; color: #4a4a52; font-size: 11.5px; }
    </style>
    <img class="wm" src="${wordmarkUrl}" alt="NexCode" />
    <div class="tag">A lightweight, AI-optional, multiplayer IDE — built on VSCode.</div>
    <div class="chips">
      <span class="chip"><b>⌘⇧P</b> Command palette</span>
      <span class="chip"><b>⌘P</b> Go to file</span>
      <span class="chip"><b>⌃\`</b> Terminal</span>
    </div>
    <button class="enter">Enter NexCode</button>
    <div class="hint">press Enter or Esc</div>
  `;
  document.body.appendChild(overlay);

  const dismiss = () => {
    overlay.classList.add("hide");
    setTimeout(() => overlay.remove(), 500);
    window.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      dismiss();
    }
  };
  overlay.querySelector(".enter")!.addEventListener("click", dismiss);
  window.addEventListener("keydown", onKey);
}

mountStartScreen();
