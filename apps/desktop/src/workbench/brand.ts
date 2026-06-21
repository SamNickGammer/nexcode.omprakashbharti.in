// NexCode branding layer over the VSCode workbench:
//  1. registers the "NexCode Nova" (vibrant) + "NexCode Carbon" themes
//  2. vibrant gradient polish (tabs, activity bar, buttons, accents)
//  3. NexCode mark + a window drag region in the title bar
//  4. disables chrome text-selection (keeps editor/terminal/inputs selectable)
//  5. branded start screen
//
// Imported from main.ts after the workbench has initialized.

import { ExtensionHostKind } from "@codingame/monaco-vscode-extensions-service-override";
import { registerExtension } from "@codingame/monaco-vscode-api/extensions";
import novaThemeUrl from "./nexcode-nova-theme.json?url";
import carbonThemeUrl from "./nexcode-carbon-theme.json?url";
import logoUrl from "@/assets/logo.png";
import wordmarkUrl from "@/assets/wordmark.png";
import { getStoredFolder } from "./folderStore";
import { pickAndOpenFolder } from "./openFolder";

const GRADIENT = "linear-gradient(135deg, #7c5cff 0%, #4aa8ff 50%, #34e1d5 100%)";

// 1. Themes — contributed as an extension so the theme service picks them up.
const themeExtension = registerExtension(
  {
    name: "nexcode-themes",
    publisher: "nexcode",
    version: "0.1.0",
    engines: { vscode: "*" },
    contributes: {
      themes: [
        { id: "NexCode Nova", label: "NexCode Nova", uiTheme: "vs-dark", path: "./themes/nova.json" },
        { id: "NexCode Carbon", label: "NexCode Carbon", uiTheme: "vs-dark", path: "./themes/carbon.json" },
      ],
    },
  },
  ExtensionHostKind.LocalProcess,
);
themeExtension.registerFileUrl("/themes/nova.json", novaThemeUrl);
themeExtension.registerFileUrl("/themes/carbon.json", carbonThemeUrl);

// 2/4. Brand CSS — vibrant gradient polish + chrome selection rules.
const style = document.createElement("style");
style.textContent = `
  /* --- Chrome is not selectable; editor/terminal/inputs are --- */
  .monaco-workbench { -webkit-user-select: none; user-select: none; }
  .monaco-workbench .monaco-editor,
  .monaco-workbench .xterm,
  .monaco-workbench input,
  .monaco-workbench textarea,
  .monaco-workbench [contenteditable="true"],
  .monaco-workbench .native-edit-context,
  .monaco-workbench .inputarea { -webkit-user-select: text; user-select: text; }

  /* --- Title bar: NexCode mark --- */
  #nexcode-titlebar-mark {
    position: fixed; left: 84px; top: 0; height: 35px;
    display: flex; align-items: center; gap: 8px;
    z-index: 100000; pointer-events: none;
    font: 700 12px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    letter-spacing: 0.08em;
    background: ${GRADIENT};
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  #nexcode-titlebar-mark img { height: 17px; width: 17px; }

  /* --- Window drag strip (empty left-center of the title bar) --- */
  #nexcode-drag {
    position: fixed; top: 0; left: 168px; width: 22vw; height: 35px;
    z-index: 99990;
  }

  /* --- Vibrant gradient active tab --- */
  .monaco-workbench .editor-group-container > .title .tabs-container > .tab.active::after {
    content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px;
    background: ${GRADIENT};
  }
  /* --- Gradient activity-bar active indicator --- */
  .monaco-workbench .activitybar .monaco-action-bar .action-item.active .active-item-indicator::before,
  .monaco-workbench .activitybar .monaco-action-bar .action-item.checked .active-item-indicator::before {
    border-left: 0 !important;
    width: 2px; background: ${GRADIENT};
  }
  /* --- Gradient primary buttons --- */
  .monaco-workbench .monaco-button.monaco-text-button {
    background: ${GRADIENT} !important; border: none !important; color: #050714 !important;
    font-weight: 600;
  }
  .monaco-workbench .monaco-button.monaco-text-button:hover { filter: brightness(1.12); }

  /* --- Accent cursor glow + rounded selections --- */
  .monaco-editor .cursor { box-shadow: 0 0 8px #5b8cffaa; }
  .monaco-workbench .monaco-list .monaco-list-row.focused,
  .monaco-workbench .monaco-list .monaco-list-row.selected { border-radius: 6px; }
  /* --- Gradient progress bar --- */
  .monaco-workbench .monaco-progress-container .progress-bit { background: ${GRADIENT} !important; }
`;
document.head.appendChild(style);

// Title-bar mark.
const mark = document.createElement("div");
mark.id = "nexcode-titlebar-mark";
mark.innerHTML = `<img src="${logoUrl}" alt="" /><span>NEXCODE</span>`;
document.body.appendChild(mark);

// Window drag strip (Tauri moves the window when this region is dragged).
const drag = document.createElement("div");
drag.id = "nexcode-drag";
drag.setAttribute("data-tauri-drag-region", "");
document.body.appendChild(drag);

// 5. Branded start screen.
function mountStartScreen(): void {
  const openFolder = getStoredFolder();
  const overlay = document.createElement("div");
  overlay.id = "nexcode-splash";
  overlay.innerHTML = `
    <style>
      #nexcode-splash {
        position: fixed; inset: 0; z-index: 99999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background:
          radial-gradient(60% 50% at 50% 36%, #1a1f44 0%, rgba(11,12,22,0) 70%),
          #0b0c16;
        opacity: 1; transition: opacity .45s ease;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      #nexcode-splash.hide { opacity: 0; pointer-events: none; }
      #nexcode-splash .wm { width: min(380px, 60vw); filter: drop-shadow(0 8px 50px #4aa8ff44); }
      #nexcode-splash .tag { margin-top: 22px; color: #8b90a8; font-size: 14px; }
      #nexcode-splash .chips { margin-top: 30px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
      #nexcode-splash .chip {
        font-size: 12px; color: #bdc2da; background: #11142a; border: 1px solid #262a44;
        padding: 6px 11px; border-radius: 8px; display: inline-flex; gap: 8px; align-items: center;
      }
      #nexcode-splash .chip b { color: #ffffff; font-weight: 600; }
      #nexcode-splash .enter {
        margin-top: 38px; cursor: pointer; border: none; border-radius: 10px;
        padding: 12px 28px; font-size: 14px; font-weight: 700; color: #050714;
        background: ${GRADIENT};
        box-shadow: 0 6px 26px #4aa8ff44; transition: filter .15s ease, transform .1s ease;
      }
      #nexcode-splash .enter:hover { filter: brightness(1.1); }
      #nexcode-splash .enter:active { transform: translateY(1px); }
      #nexcode-splash .row { margin-top: 38px; display: flex; gap: 12px; align-items: center; }
      #nexcode-splash .ghost {
        cursor: pointer; border: 1px solid #2a2e48; border-radius: 10px; background: transparent;
        padding: 12px 22px; font-size: 14px; font-weight: 600; color: #bdc2da;
      }
      #nexcode-splash .ghost:hover { border-color: #4aa8ff; color: #fff; }
      #nexcode-splash .folder { margin-top: 16px; color: #6a708a; font-size: 12px; }
      #nexcode-splash .hint { margin-top: 14px; color: #4a4f6a; font-size: 11.5px; }
    </style>
    <img class="wm" src="${wordmarkUrl}" alt="NexCode" />
    <div class="tag">A lightweight, AI-optional, multiplayer IDE — built on VSCode.</div>
    <div class="chips">
      <span class="chip"><b>⌘⇧P</b> Command palette</span>
      <span class="chip"><b>⌘P</b> Go to file</span>
      <span class="chip"><b>⌃\`</b> Terminal</span>
    </div>
    <div class="row">
      ${
        openFolder
          ? `<button class="enter" data-act="dismiss">Enter NexCode →</button>`
          : `<button class="enter" data-act="open">Open Folder…</button>
             <button class="ghost" data-act="dismiss">Continue without a folder</button>`
      }
    </div>
    ${openFolder ? `<div class="folder">${openFolder}</div>` : ``}
    <div class="hint">${openFolder ? "press Enter or Esc" : "press Esc to skip"}</div>
  `;
  document.body.appendChild(overlay);

  const dismiss = () => {
    overlay.classList.add("hide");
    setTimeout(() => overlay.remove(), 500);
    window.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" || (e.key === "Enter" && openFolder)) {
      e.preventDefault();
      dismiss();
    }
  };
  overlay.querySelectorAll("[data-act]").forEach((el) => {
    el.addEventListener("click", () => {
      if (el.getAttribute("data-act") === "open") void pickAndOpenFolder();
      else dismiss();
    });
  });
  window.addEventListener("keydown", onKey);
}

mountStartScreen();
