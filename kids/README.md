# OpenPath Kids — Chintoo's World

Short interactive cartoons for children of about 3–7. The first episode is **Chintoo and the Apple Tree**:
Chintoo the cat wakes up hungry, finds an apple tree, meets Mina the myna, and — with or without the child's
help — gets an apple, then counts apples for a picnic. It plays like a cartoon from beginning to end; a child
can join in when they want, and the story never stops to wait for them.

Independent of the rest of OpenPath: no server, no account, no network, no personal data.

```bash
cd kids
npm ci
npm run validate      # check episodes; prints how long each plays
npm test              # story branching and automatic continuation (virtual time)
npm run build         # dist/index.html: one self-contained page (~100 kB)
npm run serve         # http://127.0.0.1:4180 (HOST=0.0.0.0 to open it from a phone on the same network)
npm run e2e           # Playwright walkthrough at Android phone and tablet sizes (needs `serve`)
```

Useful address options: `?speed=4` (skim), `?level=older` (ages 5–7), `?motion=reduced`, `?mute=1`.

- [Architecture](../docs/kids/ARCHITECTURE.md): how the engine, player and art fit together, the renderer
  choice, what is genuinely animated, and the integration interface for OpenPath.
- [Writing an episode](../docs/kids/AUTHORING.md): the episode format, with examples.
