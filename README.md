<div align="center">

<img src="assets/logoFullWithoutBackgorund.png" alt="NexCode IDE" width="380" />

### A lightweight, AI-optional, multiplayer IDE for macOS

_The real VSCode — re-skinned, re-thought, and running Electron-free in a native Tauri shell._

<br/>

[![Platform](https://img.shields.io/badge/platform-macOS%2013%2B-000000?logo=apple&logoColor=white)](#)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![VSCode](https://img.shields.io/badge/VSCode-workbench-007ACC?logo=visualstudiocode&logoColor=white)](https://github.com/microsoft/vscode)
[![Rust](https://img.shields.io/badge/Rust-stable-000000?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)
[![Status](https://img.shields.io/badge/status-alpha-orange)](#roadmap)

</div>

---

## ✨ What is NexCode?

NexCode runs the **real VSCode workbench** — the genuine activity bar, explorer, editor, command
palette, settings, themes, and OpenVSX extensions — inside a **lightweight Tauri shell** instead of
Electron. You get all of VSCode's power and muscle memory, wrapped in NexCode's own vibrant design,
with a Rust backend doing the heavy lifting.

It's the "Android-based custom OS" approach, applied to a code editor: keep everything great about
the base, layer your own identity and features on top.

> **Core principle:** every feature works with **zero API keys and zero internet**.
> AI is a progressive enhancement, never a requirement.

| Pain in stock VSCode                             | How NexCode answers it                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| Electron — high RAM, slow startup                | **Tauri (Rust + system WebView)** — no Electron, far smaller footprint            |
| Looks identical to everyone else's editor        | **NexCode Nova** vibrant theme, branded shell + start screen, Material icons      |
| Real-time collab needs proprietary tools         | **Yjs CRDT multiplayer** (planned) — self-hostable, LAN auto-discovery            |
| AI tools quietly ship your code to third parties | **BYOK** — your own keys, token dashboard, privacy mode, direct-to-provider calls |
| The terminal has no memory or intelligence       | **PTY + session restore** and natural-language-to-command with a local cache      |

---

## 🚀 Status — what works today

NexCode is in **alpha**. Working right now (branch [`feat/vscode-workbench`](#)):

- ✅ **The real VSCode workbench** in a Tauri window — command palette (⌘⇧P), quick open (⌘P),
  settings, keybindings, multi-pane editor, IntelliSense, OpenVSX extension gallery
- ✅ **Open real folders** (⌘O) — your actual project tree, edit/save/create/delete/rename on disk
  via the Rust filesystem bridge
- ✅ **NexCode identity** — Nova vibrant theme, branded title-bar mark + start screen,
  **Material icon theme**
- ✅ Native window chrome (custom title bar, traffic-light inset, drag region)

In progress / planned: bridging the **terminal** to the real PTY, **Source Control** to git, a
native **file watcher**, then the **AI layer** and **multiplayer**. See the [roadmap](#-roadmap).

---

## 🏗️ How it works

NexCode embeds VSCode's workbench in the browser via
[`@codingame/monaco-vscode-api`](https://github.com/CodinGame/monaco-vscode-api), hosted inside a
Tauri WebView. A Rust backend exposes the real machine to the workbench through Tauri IPC.

```
┌──────────────────────────── Tauri window (system WebView) ────────────────────────────┐
│  VSCode workbench  (@codingame/monaco-vscode-api)                                       │
│  activity bar · explorer · editor · panels · command palette · themes · extensions      │
│        │  custom service overrides + NexCode branding (workbench/*)                      │
│        ▼                                                                                 │
│  TauriFileSystemProvider ──IPC──▶  Rust backend (src-tauri)                              │
│                                     fs · pty · libgit2 · keychain · LSP bridge           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

| Layer            | Technology                                                           |
| ---------------- | -------------------------------------------------------------------- |
| Desktop shell    | **Tauri 2.0** (Rust) — native perf, system WebView, no Electron      |
| Workbench        | **VSCode** via `@codingame/monaco-vscode-api` (pinned **33.0.9**)    |
| Frontend tooling | **TypeScript + Vite**                                                |
| Filesystem       | Custom `IFileSystemProvider` ↔ Rust commands (real disk)             |
| Terminal         | **portable-pty** (Rust) — _bridge in progress_                       |
| Git              | **libgit2** via `git2` (Rust) — _bridge in progress_                 |
| AI _(planned)_   | Custom **BYOK** router (OpenAI / Anthropic / Gemini / Groq / Ollama) |

---

## 📦 Monorepo layout

```
nexcode/
├── apps/
│   ├── desktop/            # the IDE
│   │   ├── src/workbench/  #   VSCode bootstrap, services, branding, FS bridge
│   │   └── src-tauri/      #   Rust backend (fs · pty · git · lsp)
│   └── web/                # Next.js landing page                  (reserved)
├── packages/
│   └── sync-server/        # y-websocket multiplayer server        (reserved)
├── assets/                 # Brand assets (logo, wordmarks)
├── docs/                   # PRD + developer notes
├── scripts/                # Build / notarize / release
└── tests/                  # Cross-app e2e
```

> Note: the original Tauri-native UI (a hand-built file tree, terminal, git, and LSP client) lives
> on `main` and is preserved as a reference. The VSCode-workbench direction is on
> `feat/vscode-workbench`.

---

## 🛠️ Getting started

**Prerequisites**

- macOS 13 Ventura+ with Xcode Command Line Tools
- [Rust](https://rustup.rs) (stable) — `rustup target add aarch64-apple-darwin x86_64-apple-darwin`
- Node 20+ and [pnpm](https://pnpm.io) 11+ (`brew install pnpm`)

**Run it**

```bash
git checkout feat/vscode-workbench   # the current direction
pnpm install                         # install workspace dependencies
pnpm dev                             # launch the desktop app (tauri dev)
```

> First launch is slow (1–3 min): Vite pre-bundles the VSCode workbench modules once. Later starts
> are fast. Then hit **Open Folder…** on the start screen (or ⌘O) to open a real project.

**Other scripts**

```bash
pnpm build                          # bundle the macOS app (.app / .dmg)
pnpm -F @nexcode/desktop typecheck  # TypeScript
pnpm -F @nexcode/desktop lint       # ESLint
pnpm format                         # Prettier
```

See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the full developer guide.

---

## 🗺️ Roadmap

| Milestone           | Focus                                                        | Status     |
| ------------------- | ------------------------------------------------------------ | ---------- |
| **Workbench shell** | Real VSCode workbench in Tauri, branding, Nova theme         | ✅ done    |
| **Real filesystem** | Open folders, edit/save on disk, Material icons              | ✅ done    |
| **Terminal bridge** | Wire VSCode's terminal to the real PTY (portable-pty)        | 🚧 next    |
| **Git bridge**      | Wire VSCode's Source Control to libgit2; file watcher        | ⬜ planned |
| **AI layer (BYOK)** | Chat, review, commit messages, test gen — your own keys      | ⬜ planned |
| **Multiplayer**     | Yjs CRDT co-editing, presence, self-hosted sync              | ⬜ planned |
| **Polish & launch** | Perf, notarization, auto-update, Homebrew Cask, landing page | ⬜ planned |

The full product vision lives in the [PRD](docs/PRD/).

---

## 🤝 Contributing

Early-stage and moving fast. Issues and PRs welcome. Please run `pnpm typecheck`, `pnpm lint`, and
`pnpm format` before opening a PR.

## License

[MIT](LICENSE) © NexCode

<div align="center"><sub>Built with ⚡ Tauri, 🦀 Rust, and a deep dislike of laggy editors.</sub></div>
