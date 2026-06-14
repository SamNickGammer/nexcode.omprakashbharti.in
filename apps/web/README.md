# NexCode — Landing Page (reserved)

**Status: reserved — not yet built.**

This directory is a placeholder for the NexCode marketing / landing page, to be built
with **Next.js**. It is intentionally empty (no `package.json` yet) so it does not
participate in installs, builds, or type-checking until work begins.

When implemented it will:

- Consume the brand wordmark `assets/logoFullWithoutBackgorund.png`.
- Be added to the pnpm workspace automatically (the root `pnpm-workspace.yaml` already
  globs `apps/*` — no root changes needed) the moment this folder gets a real
  `package.json`.
- Present the product, feature highlights, performance numbers, and download links
  (`.dmg` + Homebrew Cask) per the PRD.

To scaffold later:

```bash
cd apps && pnpm create next-app@latest web
```
