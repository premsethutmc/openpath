# OpenPath status (handoff for a new session)

Read this file first; status is branch-local, so verify refs. Keep it under ~60 lines; update it at each milestone.

Updated: 2026-11-10 (method sections by construction, computed coverage; on `feat/method-sections` from main `08d273c`)

## Rules (product owner)
- No merge or deploy without the owner's explicit approval. PRs are drafts. AI review/fixes may proceed; do not label them human educator approval.
- One bounded milestone at a time: scope, finish, report commit/tests/defects/readiness, stop.
- Long jobs run in GitHub Actions; schedule a check-in instead of waiting. How-to: `docs/runbooks/DEV.md`.

## Branches
- main `08d273c`: #124's combined candidate (via PR #125, owner-approved), then the research pool boundary.
- `feat/method-sections` (this, draft PR, from main): method sections by construction. PR #126 `feat/machine-validation`
  (another session, open): machine validation without an educator; both touch STATUS.md and the grader bundle.
- Owners: dot = method alignment (#121) and TN Grades 1–3 ingestion (separate; not touched here); Claude = Grade 8, #122.
- Base for maths work: `consolidation/openpath-candidate` (#112). Others open: #115, #116, #118, #120.

## This milestone: method sections by construction (2026-11-10)
- method-sections@2 (`library.ts` withMethodSections, `method-kinds.ts`): every explanation (built and hand-written, all
  grades) shows every method its follow-ups may ask. For each method kind (a family, or its declared cases) that a question it
  can be followed by needs and none of its sections works through, it gets a section: a worked example of a fresh question of
  that kind (typed first, with its picture), from the family's own teaching. 959 of 1,185 built explanations gained 2,756
  sections (1–13; 76% gained 1–4); 37 hand-written explanations gained 114, stored in `library.v1.json` `authoredSections`
  (their own text unchanged). The lesson page does not repeat them (it already shows every family).
- Coverage is computed (`method-alignment.ts`): an explanation covers the kinds of the questions its sections show. The hand
  map (`method-alignment.v1.json`) is history only. Every lesson records its content hash, so the gate applies to all modules;
  a scoped explanation's follow-ups are its own unit (another unit is governed by its own teaching); a lesson whose
  explanation changed since refuses follow-ups. The block check keeps the explanation's own check when it is covered.
- Teaching checks unchanged: 1,063 explanations pass the teaching contract, as before (none lost). Lesson checks at baseline.
- Gap check (`method-sections.test.ts`, ~1 min, no simulation): fails CI if any explanation can be followed by a method it
  does not show. 0 gaps. Pythagoras's second triple rule now has its own worked example.
- Tests reworked: dot's method-alignment tests show mismatches on the explanation as written (without sections) or after a
  changed explanation; deep-select and Pythagoras tests likewise; phase-3 own-skill case is "solved after help" again
  (the u-substitution lesson now shows partial fractions).
- Earlier today, in main: `04d7647` (Pythagoras converse and triple rules, ratio-recovery tests, deep-select@1) and `08d273c`
  (offline research pool readers moved to `research/deep-recovery/`, boundary enforced in Node CI).

## Open defects
- All learning-package tests still need a complete Bun run in CI; the selector/import-boundary check runs in Node CI.
- The independent AI review of Pythagoras (`docs/milestones/PYTHAGORAS_AI_REVIEW_2026_11_10.md`) predates this milestone.
- Long lessons: an explanation may now carry up to 13 extra sections (e.g. conics, integration methods). Whether that is too
  much for a learner is untested; the fix would be one explanation per kind (a design change, not per-theorem work).
- Teaching quality (clear, true, at grade) is checked only by lesson-checks@1, and only on the lesson page: the added sections
  as the engine delivers them are checked by the teaching contract, not by lesson-checks. No independent review yet.
- Grade 8 review-2 majors still open: mixed example in opening sections (M1, M2), exponent as factor (M4), below-grade
  lessons, missing outcomes (straight-line graphs/scale, frequency polygons, map colouring), M3 wrong reason.
- 14 Grade 8 runs open below grade (fixed exploratory questions). `bun test packages/learning/src` not in CI (Bun needs
  owner approval). No branch protection on main. Content provisional: no real learners yet.

## Previous milestones
- Foundations fix (`5e4c1fd`): choice@1 (atgen, abunit checks), Pythagoras shorter side, registries merged three-way.
- Dev efficiency (#122): `tools/regen.mjs`, test shards (CI 58 → 22 min), learner view, lesson-checks@1.
- Grade 8 pilot (#119): 76 competencies both boards; grade-order@1; review 2 in `docs/milestones/GRADE8_REVIEW_2.md`.
- Grade 7 (#117): 75 modules; CBSE 43/46, TN 48/50 verified (rest educator-marked). `docs/milestones/GRADE7_COVERAGE.md`.
- Method alignment (#121): `docs/milestones/METHOD_ALIGNMENT_BATCH2.md`.
