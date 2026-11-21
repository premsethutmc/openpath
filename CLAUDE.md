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
