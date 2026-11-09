# OpenPath status (handoff for a new session)

Read this file first; status is branch-local, so verify refs. Keep it under ~60 lines; update it at each milestone.

Updated: 2026-11-09 (foundations fix on the combined candidate)

## Rules (product owner)
- No merge or deploy without the owner's explicit approval. PRs are drafts. No educator approval by an agent.
- One bounded milestone at a time: scope, finish, report commit/tests/defects/readiness, stop.
- Long jobs run in GitHub Actions; schedule a check-in instead of waiting. How-to: `docs/runbooks/DEV.md`.

## Branches (all drafts, none merged)
- `fix/foundations-2026-11-09` (this): #121 (method alignment, dot, `5d83947`) + #122 (dev efficiency on Grade 8,
  `82f18fd`) combined, then the fixes below. Base chain of #122: #119 Grade 8 → #117 Grade 7 (`c1db278`).
- Owners: dot = method alignment (#121) and TN Grades 1–3 ingestion (separate; not touched here); Claude = Grade 8, #122.
- Base for maths work: `consolidation/openpath-candidate` (#112). Others open: #115, #116, #118, #120.

## This milestone: foundations fix
- Combination: conflicts resolved (intervention imports; `alignedPractice(module, ids, grade, strategy)`); review and
  explanation-review registries merged three-way by entry (one revision per content hash; statuses kept, none approved).
- choice@1: a family's independent check must accept the keyed option and refuse every other (spec rule, all 170 choice
  families). It found `atgen` (sign-change root scan missed roots on its grid: 8 of 108 accepted an incomplete option;
  Node/Bun differed on 2 more) and `abunit` (overlapping mm/cm ranges). Both checks rewritten (atgen: exact solution sets).
  Keys were always right and marking uses the key: no answer, key, option letter or past mark changes.
- Pythagoras: "Squares on the sides" now also teaches a shorter side step by step (method map: both cases, pending
  educator review); every mapped Pythagoras explanation covers a shorter side, shown before any shorter-side follow-up,
  and the shorter-side delayed check is asked and answered. Still not verified on the combined candidate (both boards):
  the delayed check then asks the converse (`ahconv`) and `ahgen`, which no explanation's method map covers, so #121's
  gate stops honestly. Decision needed (owner + dot); not worked around (a selection change that let it pass would also
  have let #121's G-02 pass on untaught methods: reverted).
- Tests added: `choice-check.test.ts` (Bun and Node), `pythagoras-shorter-side.test.ts`. Grade 8 coverage: all but
  Pythagoras (CBSE 47/48, TN 41/43 + 1 awaiting a mark); Grade 7 unchanged (43/46, 48/50).

## Open defects
- #121 line: 9 research files read the question pools unregistered (question-status test fails under Bun). The live one,
  `deep-recovery.ts` (research builds, incl. `--deep-evaluation` without `--test`), filters only "not seen": no grade
  ceiling, input-mode or method checks. Proposed to dot (PR #121); not changed here.
- Grade 8 review-2 majors still open: mixed example in opening sections (M1, M2), exponent as factor (M4), below-grade
  lessons, missing outcomes (straight-line graphs/scale, frequency polygons, map colouring), M3 wrong reason.
- 14 Grade 8 runs open below grade (fixed exploratory questions). `bun test packages/learning/src` not in CI (Bun needs
  owner approval). No branch protection on main. Content provisional: no educator review, no real learners.

## Previous milestones
- Dev efficiency (#122): `tools/regen.mjs`, test shards (CI 58 → 22 min), learner view, lesson-checks@1.
- Grade 8 pilot (#119): 76 competencies both boards; grade-order@1; review 2 in `docs/milestones/GRADE8_REVIEW_2.md`.
- Grade 7 (#117): 75 modules; CBSE 43/46, TN 48/50 verified (rest educator-marked). `docs/milestones/GRADE7_COVERAGE.md`.
- Method alignment (#121): `docs/milestones/METHOD_ALIGNMENT_BATCH2.md`.
