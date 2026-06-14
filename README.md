<div align="center">
  <img src="assets/logoFullWithoutBackgorund.png" alt="NexCode IDE" width="320" />

  <p><em>A lightweight, AI-optional, multiplayer IDE for macOS — built on Tauri 2.0 + Monaco.</em></p>
</div>

---

## What is NexCode?

NexCode IDE delivers the full feature set of VSCode — but faster, leaner, and with
first-class real-time collaboration, an intelligent terminal, and an **optional** AI
layer the developer fully controls with their own API keys (BYOK).

**Core principle:** every feature works without any AI or internet connection. AI is a
progressive enhancement, not a requirement.

See the full product spec in [`docs/PRD/`](docs/PRD/).

## Monorepo layout

```
nexcode/
├── apps/
│   ├── desktop/        # Tauri 2.0 + React + TS + Vite — the IDE  (active)
│   └── web/            # Next.js landing page                     (reserved)
├── packages/
│   └── sync-server/    # y-websocket multiplayer server + Docker  (reserved)
├── assets/             # Brand assets (logo, wordmarks)
├── docs/               # PRD and developer docs
├── scripts/            # Build / notarize / release scripts
└── tests/              # Cross-app e2e (Playwright)
```

## Prerequisites

- macOS 13 Ventura+ (build host), Xcode Command Line Tools
- [Rust](https://rustup.rs) (stable) with `aarch64-apple-darwin` + `x86_64-apple-darwin` targets
- Node 20+ and [pnpm](https://pnpm.io) 11+

## Getting started

```bash
pnpm install        # install workspace dependencies
pnpm dev            # launch the desktop app (tauri dev)
```

Other scripts: `pnpm build` (bundle the app), `pnpm lint`, `pnpm test`, `pnpm format`.

## Roadmap

The PRD defines a 4-phase, 30-week plan: **Foundation → Unique Features (multiplayer,
merge resolver, smart terminal) → AI Layer (BYOK) → Polish & Launch.** This repository is
currently at the **Foundation Bootstrap** stage — module folders under
`apps/desktop/src/` are stubbed and filled in over subsequent phases.
