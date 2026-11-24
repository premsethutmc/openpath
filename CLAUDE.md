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
  `frontend/src/learning/svg-allowed.json` to get past it. Every maths teaching picture is now in the engine, so its
  `toMove` list is empty and stays empty. `notTeaching` (icons, the cat, writing surfaces, English pictures) stays.
- A still picture in a question (a clock, a bar chart, a labelled triangle) is worked out in
  `packages/learning/src/figure-marks.ts` and drawn by the same player (`FigureMarks`). A new kind of question picture is a
  new case there.
- A labelled drawing (points, segments, circles, right-angle and equal-length marks) is a `diagram` figure there: it is
  refused if a marked right angle is not 90° or segments marked equal are not equal. Drawings of the older lesson pages
  are functions in `packages/learning/src/lesson-marks.ts`, drawn with `MarksSvg`.
- A Start here idea shows still pictures through `figures` on its screen (`content/learning/foundations.v1.json`); an idea
  with no picture records why in `show`.
- A senior skill whose generated lesson is only a list of rules gets a taught lesson: a `lesson: true` entry in
  `content/learning/foundations.v1.json` (show it with a scene, one rule, why it works, every step, the slip to avoid,
  then practice). `MATH.coordinate.conic-tangents-normals` is the model.
- The scene styles live in `frontend/src/year/scene.css`; a page that shows a scene imports it.
