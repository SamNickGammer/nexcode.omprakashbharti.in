# NexCode — Multiplayer Sync Server (reserved)

**Status: reserved — not yet built.**

This directory is a placeholder for the self-hostable real-time collaboration server
described in PRD §5 (Real-Time Multiplayer Editing). It is intentionally empty (no
`package.json` yet) so it does not participate in installs or builds until work begins.

When implemented it will provide:

- A **y-websocket** server (Node.js) backing Yjs CRDT collaborative editing.
- A **Dockerfile** + compose config for self-hosting.
- Awareness/presence relay and optional persistence.

Multiplayer also supports a zero-setup **LAN (Bonjour/mDNS)** mode that needs no server;
this package is for remote teams and persistent sessions.
