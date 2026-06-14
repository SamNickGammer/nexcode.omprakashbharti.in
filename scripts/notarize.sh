#!/usr/bin/env bash
#
# notarize.sh — PLACEHOLDER for macOS code-signing + notarization.
#
# Tauri 2.0 drives signing/notarization through environment variables read at
# `tauri build` time (NOT through tauri.conf.json). This script documents the
# required variables and the release build command. Fill in secrets via a
# gitignored `.env` (see .env.example) — NEVER commit certificates or keys.
#
# Required for code signing:
#   APPLE_SIGNING_IDENTITY   e.g. "Developer ID Application: Your Name (TEAMID)"
#   APPLE_CERTIFICATE        base64 of the .p12 (CI) — or import into login keychain locally
#   APPLE_CERTIFICATE_PASSWORD
#
# Required for notarization — EITHER Apple ID:
#   APPLE_ID                 your Apple developer account email
#   APPLE_PASSWORD           an app-specific password
#   APPLE_TEAM_ID            your 10-char team id
# OR App Store Connect API key:
#   APPLE_API_KEY            key id
#   APPLE_API_ISSUER         issuer id
#   APPLE_API_KEY_PATH       path to the .p8 key file
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$ROOT/.env" ] && set -a && . "$ROOT/.env" && set +a

if [ -z "${APPLE_SIGNING_IDENTITY:-}" ]; then
  echo "ERROR: signing/notarization secrets not set. Copy .env.example to .env and fill it in." >&2
  exit 1
fi

# Universal (Apple Silicon + Intel) signed + notarized build.
pnpm -F desktop tauri build --target universal-apple-darwin

echo "Build complete. Signed & notarized .dmg/.app are under apps/desktop/src-tauri/target/."
