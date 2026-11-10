# OpenPath status (handoff for a new session)

Read this file first; status is branch-local, so verify refs. Keep it under ~60 lines; update it at each milestone.

Updated: 2026-11-10 (offline research pool boundary, separate follow-up from PR #124 at `04d76477`)

## Rules (product owner)
- No merge or deploy without the owner's explicit approval. PRs are drafts. AI review/fixes may proceed; do not label them human educator approval.
- One bounded milestone at a time: scope, finish, report commit/tests/defects/readiness, stop.
- Long jobs run in GitHub Actions; schedule a check-in instead of waiting. How-to: `docs/runbooks/DEV.md`.

## Branches (all drafts, none merged)
- `fix/foundations-2026-11-09` (upstream PR #124): #121 (method alignment, dot, `5d83947`) + #122 (dev efficiency on Grade 8,
  `82f18fd`) combined, the foundations fix (`5e4c1fd`), then its Pythagoras/recovery milestone. Base chain of #122: #119 Grade 8 → #117 Grade 7.
- Owners: dot = method alignment (#121) and TN Grades 1–3 ingestion (separate; not touched here); Claude = Grade 8, #122.
- Base for maths work: `consolidation/openpath-candidate` (#112). Others open: #115, #116, #118, #120.

## This milestone (2026-11-10)
- `fix/research-pool-boundary-2026-11-10`: moved offline pool readers/tools to `research/deep-recovery/`; kept their logic/results.
  Node CI and Bun share a selector/import-boundary check; app code cannot reach offline research. 8 guard + 20 recovery tests and typecheck pass.
  See `docs/milestones/RESEARCH_POOL_BOUNDARY.md`. The combined #124 branch is unchanged; no merge/deploy.

## Combined-candidate milestone (2026-11-10)
- Pythagoras (method-sections@1, `library.ts`): "Step by step", "Squares on the sides" and "Spot a triple" now also carry a
  converse section and a triple-rule section (worked examples: `ahconv`, `ahgen` 2m rule; the m² − n², 2mn, m² + n² rule is in the
  text, no worked example of its own). Method map: `ahconv` → pythagoras-converse, `ahgen` → triple-rule-2m / triple-rule-mn; both
  mapped explanations list them (unapproved). #121's gate unchanged (a hypotenuse after "Step by step" is still
  refused). Both boards pass the existing synthetic journeys; the independent AI review below found teaching gaps those tests miss.
- Ratio recovery tests: ratio is teachable now, so scale drawings → ratio is taught and returns (both tests updated). A real
  missing-content gap is tested on integer addition → integers (blocked, nothing solved); the single-slip tests are kept.
- deep-select@1 (`deep-recovery.ts`, research, off): questions must be selectable, keyboard-answerable, within grade, fresh and,
  after teaching of their skill, covered by the taught method; probes on untaught skills stay diagnostics. No suitable question:
  an honest stop that says why. Saved answers are read by the same rule (history kept): an untaught-method answer no longer
  counts toward "solved after help". Effect: the partial-fractions integral after a u-substitution lesson now stops instead of
  "solved after help" (phase-3 tests updated). Registered as a selector (`question-status.test.ts`).
- Tests: `deep-select.test.ts`, `pythagoras-methods.test.ts`; regenerated (Node; grader bundle with esbuild 0.28.2).

## Open defects
- All learning-package tests still need a complete Bun run; the selector/import-boundary check now also runs in Node CI.
- Pythagoras m² − n², 2mn, m² + n² rule lacks a worked example despite its map. See `PYTHAGORAS_AI_REVIEW_2026_11_10.md` in milestones.
- Pythagoras "Spot a triple" / "Spot the mistake" / "What it uses" have no method map (#121 legacy path, follow-ups not gated).
- Grade 8 review-2 majors still open: mixed example in opening sections (M1, M2), exponent as factor (M4), below-grade
  lessons, missing outcomes (straight-line graphs/scale, frequency polygons, map colouring), M3 wrong reason.
- 14 Grade 8 runs open below grade (fixed exploratory questions). `bun test packages/learning/src` not in CI (Bun needs
  owner approval). No branch protection on main. Content provisional: no educator review, no real learners.

## Previous milestones
- Foundations fix (`5e4c1fd`): choice@1 (atgen, abunit checks), Pythagoras shorter side, registries merged three-way.
- Dev efficiency (#122): `tools/regen.mjs`, test shards (CI 58 → 22 min), learner view, lesson-checks@1.
- Grade 8 pilot (#119): 76 competencies both boards; grade-order@1; review 2 in `docs/milestones/GRADE8_REVIEW_2.md`.
- Grade 7 (#117): 75 modules; CBSE 43/46, TN 48/50 verified (rest educator-marked). `docs/milestones/GRADE7_COVERAGE.md`.
- Method alignment (#121): `docs/milestones/METHOD_ALIGNMENT_BATCH2.md`.
