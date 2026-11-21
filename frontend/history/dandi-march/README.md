# Walk to Dandi

OpenPath's standalone, mobile-first first-person history prototype. Walk
alongside two fictional companions, ask four optional questions in any order,
and continue to Dandi's shore. Gandhi is visible but not a dialogue character.
The route compresses several weeks: 12 March departure from Sabarmati,
5 April arrival at Dandi and 6 April breach of the salt law.

From the repository root:

```sh
python3 -m http.server --bind 127.0.0.1 --directory frontend/history 4187
# Open http://127.0.0.1:4187/dandi-march/
node --test frontend/history/dandi-march/story.test.mjs
# With the frontend dependencies and Playwright Chromium installed:
cd frontend && node --test --test-timeout=40000 e2e/history-dandi.test.mjs
```

A runtime-animated, illustrated 2.5D prototype, not a film or free-roam 3D.
The authored dialogue is fictional and the speakers are composites.
The source disclosure is in the experience itself. The two speech voices are
temporary, offline Flite reads; replace with recorded performances without
changing the authored dialogue if commissioning the polished release.
Regenerate with `node frontend/history/dandi-march/scripts/voices.mjs`,
with an FFmpeg build that includes libflite. The local synthesis and Canvas
art use no third-party media, runtime API, microphone, storage or accounts.
Captions and reduced-motion mode support a silent, low-motion route.
