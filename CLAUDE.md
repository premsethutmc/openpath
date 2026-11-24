# Working on OpenPath

Several sessions (Claude and Codex) work on this repository at the same time. To keep `main` working for all of them:

- **Never push to `main` directly.** Work on a branch, open a pull request, and merge it only when these checks are green
  on the pull request's latest commit:
  - Frontend typecheck, tests and build
  - Frontend tests (all shards)
  - English core (typecheck, acceptance tests, simulation, demo)
  - Browser end-to-end (production build, API, PostgreSQL)
  - Backend tests (Python 3.12)
- If `main` is already broken when you start, fix it in its own small pull request first; do not build on top of it.
- Before merging, bring the branch up to date with `main` (merge or rebase) and let the checks run again if `main` moved.
- A new English event kind must be added to `AppEvent` and `KINDS` in `frontend/src/english/logic/events.ts`, or
  typecheck fails for everyone.
- Screens that fold sections ("School work", "Skill by skill") must keep the browser tests in `frontend/e2e/` opening
  those folds; run or update the tests that touch a screen you change.

## One engine for pictures and interactions

Before building anything a learner sees or moves, find the engine that already owns it and say what it lacks. Extend the
engine; do not build beside it.

- A teaching picture, or anything a learner taps, drags or slides, is a **scene**: a description for the scene engine
  (`packages/learning/src/scene.ts`, figures in `scene-figures.ts`), drawn by its one player (`frontend/src/year/Scene.tsx`).
  A new need (a new figure, a new way to answer on a picture) is a new scene kind or figure in the engine, with its
  checks, so every lesson can use it. It is never a new drawing component.
- `frontend/src/learning/foundations.test.ts` fails when a new file draws its own `<svg>`. Do not add to
  `frontend/src/learning/svg-allowed.json` to get past it. Its `toMove` list is the maths teaching pictures still drawn
  outside the engine; when you work on one, move it into the engine and take it off the list. `notTeaching` (icons, the
  cat, writing surfaces, English pictures) stays.
- The scene styles live in `frontend/src/year/scene.css`; a page that shows a scene imports it.
