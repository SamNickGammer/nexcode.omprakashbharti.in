# NexCode — Development Notes

## Prerequisites

- macOS 13 Ventura+ with Xcode Command Line Tools
- [Rust](https://rustup.rs) stable, with both Apple targets:
  ```bash
  rustup target add aarch64-apple-darwin x86_64-apple-darwin
  ```
- Node 20+ and [pnpm](https://pnpm.io) 11+ (`brew install pnpm`)

> Note: pnpm self-enforces the nearest `packageManager` field. The repo root
> `package.json` pins `pnpm@11.x`, so run pnpm commands from inside the repo.

## Common commands

```bash
pnpm install                      # install workspace deps
pnpm dev                          # run the desktop app (tauri dev) — opens a window
pnpm -F @nexcode/desktop build    # production frontend build (Vite)
pnpm -F @nexcode/desktop test     # Vitest unit tests
pnpm -F @nexcode/desktop lint     # ESLint
pnpm -F @nexcode/desktop typecheck
pnpm build                        # full app bundle (tauri build) — .app/.dmg
```

The Rust backend lives in `apps/desktop/src-tauri`. To compile-check it directly:

```bash
cd apps/desktop/src-tauri && cargo check
```

## Known dependency pin

`apps/desktop/src-tauri/Cargo.lock` pins **`alloc-stdlib` to `0.2.2`**.

Reason: Tauri 2.11 pulls in `brotli 8.0.3`, which depends directly on
`alloc-no-stdlib 2.0.x` but transitively (via `alloc-stdlib 0.2.3`) on
`alloc-no-stdlib 3.0.0`. The two versions expose incompatible `Allocator`
traits, so `brotli` fails to compile (`StandardAlloc: Allocator<...> is not
satisfied`). Pinning `alloc-stdlib` to `0.2.2` keeps everything on
`alloc-no-stdlib 2.0.4` and the build succeeds.

If you ever run `cargo update` and the Rust build breaks with a `brotli`
allocator-trait error, re-apply:

```bash
cargo update -p alloc-stdlib --precise 0.2.2
```

Remove this pin once a `brotli` / `alloc-stdlib` release resolves the version
skew upstream.

## macOS signing & notarization

Distribution builds must be signed + notarized. Secrets are read from a
gitignored `.env` at the repo root (see `.env.example`) by `scripts/notarize.sh`.
Never commit certificates or keys.
