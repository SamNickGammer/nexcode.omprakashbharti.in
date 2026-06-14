# NexCode — Cross-app E2E tests

End-to-end tests live here (Playwright). This is a **scaffold** — Playwright and its
browsers are intentionally not installed yet so the bootstrap stays lean.

## Two layers (planned)

1. **UI smoke (web)** — drive the Vite dev server (`pnpm -F @nexcode/desktop dev`,
   `http://localhost:1420`) with Playwright's Chromium to test React UI in isolation.
2. **Native app (Tauri)** — drive the real packaged window via
   [`tauri-driver`](https://tauri.app/develop/tests/webdriver/) + WebDriver. Note:
   WebDriver support on macOS is limited; treat this as best-effort.

## To enable

```bash
cd tests && pnpm init && pnpm add -D @playwright/test && pnpm exec playwright install chromium
```

Then turn `e2e/smoke.spec.ts.todo` into `e2e/smoke.spec.ts`.
