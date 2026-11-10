# OpenPath status (handoff for a new session)

Read this file first; status is branch-local, so verify refs. Keep it under ~60 lines; update it at each milestone.

Updated: 2026-11-10 (method sections by construction on `feat/method-sections`, PR #127, merged with main `b963109`)

## Rules (product owner)
- No merge or deploy without the owner's explicit approval. PRs are drafts. AI review/fixes may proceed; do not label them human educator approval.
- One bounded milestone at a time: scope, finish, report commit/tests/defects/readiness, stop.
- Long jobs run in GitHub Actions; schedule a check-in instead of waiting. How-to: `docs/runbooks/DEV.md`.

## Branches
- `main` holds the whole maths line. Branch from `main`; short branches, merged back within a day or two.
- `feat/method-sections` (this, PR #127, draft): method sections by construction. Not merged: a push to `main` deploys.
- Still open: #121 (dot, method alignment; already inside `main`), #123 (dot, TN Grades 1–3 ingestion; do not touch).

## This milestone: method sections by construction (2026-11-10)
- method-sections@2 (`library.ts` withMethodSections, `method-kinds.ts`): every explanation (built and hand-written, all
  grades) shows every method its follow-ups may ask. For each method kind (a family, or its declared cases) that a question it
  can be followed by needs and none of its sections works through, it gets a section: a worked example of a fresh question of
  that kind (typed first, with its picture), from the family's own teaching. Scoped explanations too: a mixed delayed check may
  ask any unit. 1,051 of 1,185 built explanations gained 3,040 sections (1–13); 47 hand-written explanations gained 149, stored
  in `library.v1.json` `authoredSections` (their own text unchanged; the server hashes them the same way). The lesson page does
  not repeat them (it already shows every family); scope and sub-skill checks read an explanation's own sections.
- Coverage is computed (`method-alignment.ts`): an explanation covers the kinds of the questions its sections show. The hand
  map (`method-alignment.v1.json`) is history only. Every lesson records its content hash, so the gate applies to all modules
  (the rule that a method not shown cannot be verified is kept); a lesson whose explanation changed since refuses follow-ups.
  The block check keeps the explanation's own check when it is covered. G-02 (angle sum) now passes its mixed delayed check.
- Teaching checks unchanged: 1,063 explanations pass the teaching contract, as before (none lost). Lesson checks at baseline.
- Gap check (`method-sections.test.ts`, ~1 min, no simulation): fails CI if any explanation can be followed by a method it
  does not show. 0 gaps. Pythagoras's second triple rule now has its own worked example.
- Tests reworked: dot's method-alignment tests show mismatches on the explanation as written (without sections) or after a
  changed explanation; deep-select and Pythagoras tests likewise; phase-3 own-skill case is "solved after help" again
  (the u-substitution lesson now shows partial fractions).
- Earlier today, in main: `04d7647` (Pythagoras converse and triple rules, ratio-recovery tests, deep-select@1) and `08d273c`
  (offline research pool readers moved to `research/deep-recovery/`, boundary enforced in Node CI).

## Machine validation (2026-11-10, in main)
- `main` = everything (fast-forward to #125 `08d273c`, owner-approved; #115–#120, #122, #124, #125 closed as included).
  The owner delegated technical decisions; product, cost, security and deploy decisions still go to him.
  `openpath-demo` on Render auto-deploys on every push to `main`.
- machine-validation@1 (`packages/learning/src/machine-validation.ts`, `docs/product/MACHINE_VALIDATION.md`): there are no
  educators, so a generated question now counts as validated when it is independently certified, unchanged since, and
  grading-certified. 1,049 of 1,090 families admitted. Verified without the fixture: TN 7 36/50, CBSE 7 35/46, TN 8 31/43,
  CBSE 8 37/48 (was 0). Never labelled educator review. Next: re-certify 41 held families; certify wording forms.

## Open defects
- Legacy path-triggered workflows (Mathematics foundation, prerequisites follow-up, journey, Grade 1–6) run `npm test` without
  Django, so `simulated-choice-answers.test.ts` fails there whenever `tools/mathematics/**` etc. change. CI and My Learning Year are fine.
- All learning-package tests still need a complete Bun run; the selector/import-boundary check now also runs in Node CI.
- Long lessons: an explanation may now carry up to 13 extra sections (e.g. conics, integration methods). Whether that is too
  much for a learner is untested; the fix would be one explanation per kind (a design change, not per-theorem work).
- The added sections are checked by the teaching contract, not by lesson-checks@1 (lesson page only). No independent review yet;
  `PYTHAGORAS_AI_REVIEW_2026_11_10.md` predates method sections.
- Grade 8 review-2 majors still open: mixed example in opening sections (M1, M2), exponent as factor (M4), below-grade
  lessons, missing outcomes (straight-line graphs/scale, frequency polygons, map colouring), M3 wrong reason.
- 14 Grade 8 runs open below grade (fixed exploratory questions). `bun test packages/learning/src` not in CI (Bun needs
  owner approval). No branch protection on main. Content provisional: no educator review, no real learners.

## Previous milestones
- Research pool boundary (`08d273c`): offline readers in `research/deep-recovery/`. `docs/milestones/RESEARCH_POOL_BOUNDARY.md`.
- Combined candidate (`04d7647`): Pythagoras converse/triple rules, ratio-recovery tests, deep-select@1 (recovery questions within
  grade, answerable, taught method; untaught-method saved answers not counted).
- Foundations fix (`5e4c1fd`): choice@1 (atgen, abunit checks), Pythagoras shorter side, registries merged three-way.
- Dev efficiency (#122): `tools/regen.mjs`, test shards (CI 58 → 22 min), learner view, lesson-checks@1.
- Grade 8 pilot (#119): 76 competencies both boards; grade-order@1; review 2 in `docs/milestones/GRADE8_REVIEW_2.md`.
- Grade 7 (#117): 75 modules; CBSE 43/46, TN 48/50 verified (rest educator-marked). `docs/milestones/GRADE7_COVERAGE.md`.
- Method alignment (#121): `docs/milestones/METHOD_ALIGNMENT_BATCH2.md`.
