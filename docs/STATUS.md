# OpenPath status (handoff for a new session)

Read this file first; open other files only as the task needs them. Keep it under ~50 lines and update it at
each milestone.

Updated: 2026-11-09 (dev-efficiency milestone: regen, test shards, lesson checks)

## Rules (product owner)
- No merge or deploy without the owner's explicit approval. PRs are drafts unless the owner says otherwise.
- One milestone at a time: state scope and acceptance tests, finish, report, stop.
- Report: commit, tests pass/fail, unresolved defects, readiness. No progress chatter.
- Long jobs run in GitHub Actions; schedule a check-in instead of waiting.

## Branches
- Base for maths work: `consolidation/openpath-candidate` (PR #112 → main, open).
- Current: `feat/grade8-pilot` (draft PR #119, base `feat/grade7-full-coverage` = draft PR #117, Grade 7 green).
- Others open: #115 `integration/v3-from-112`, #116 `maths-expansion` (blueprints, draft).
- Research: separate repo `premsethutmc/openpath-research` (research-only, off by default).

## Current milestone: Grade 8 pilot, both boards (runbook `docs/runbooks/GRADE_BUILD.md`)
- Built by 3 strand builders in parallel, integrated, independently reviewed (22 modules: answer keys all right,
  ~70% of modules had a major issue), then a platform fix pass and a content/level fix pass.
- Result: Grade 8 contract violations 57 -> 0; untaught after early mistakes 0 both boards; gap CBSE 48/48,
  TN 42/43 (+1 awaiting a mark); false step notes platform-wide 11 -> 1 (not Grade 8); lessons' solved examples
  no longer served as practice while a fresh question exists; no answer, key or option letter changed.
- Engine items done (grade-order@1): a learner meets on-grade questions before below-grade ones (exploratory, checks,
  practice, lesson practice; same-phase inversions 110 -> 0); a learner's lesson hides later-grade sections (33 -> 0 for
  Grade 8) and later-grade written tasks (BPT/chord proofs); preview unchanged. Limit: 14 runs still open below grade where
  the module's fixed exploratory questions are all below grade (needs on-grade diagnostics in the library).
- Second independent sample review (21 modules, both boards, `docs/milestones/GRADE8_REVIEW_2.md`): 0 critical,
  11 major (M9/M10 written tasks fixed here), 14 minor. Open majors: opening section mixes two questions' picture and
  working (M1, M2); exponent read as a factor in step notes (M4); below-grade-only lessons (figurate-numbers,
  unit-conversions); missing outcomes (straight-line graphs/scale, frequency polygons, map colouring).
- Deferred: ±1 distractors (would move option letters).

## Dev-efficiency milestone (`feat/dev-efficiency`, from `feat/grade8-pilot`; how-to `docs/runbooks/DEV.md`)
- `node tools/regen.mjs [--check]`: every generated file, in order, Node only (refuses Bun); CI job "Generated files are
  up to date" checks, never commits. Node/Bun differ in 3 of 1,090 family fingerprints (float last digits; `atgen` also
  in which answers its validator accepts): fingerprints not rounded, Node is the reference.
- Tests: `node tools/test-changed.mjs` (direct dependants only); CI runs `npm test` as 6 parallel shards + "Frontend tests
  (all shards)"; long tests run in parts (`TEST_PART`). My Learning Year no longer repeats `npm test`.
- Review: `frontend/scripts/learner-view.mts` (learner's lesson, practice, engine path, keys) and lesson-checks@1
  (review findings as checks, ratchet `content/learning/lesson-checks-baseline.v1.json`, test in the frontend suite).
- Not in CI (needs owner approval to add Bun to CI): `bun test packages/learning/src`. No branch protection on main,
  so no check is "required" until the owner sets it. `atgen`: 8 of 108 MC questions have two options that validate.

## Previous milestone: Grade 7 complete, both boards (CBSE, TN)
- Done: 75 modules; 569 lesson sections; every Grade 7 question type taught; simulated learner verifies
  CBSE 43/46, TN 48/50 (rest await an educator mark); inequations stall fixed (contexts@1).
- Details: `docs/milestones/GRADE7_COVERAGE.md`.

## Open defects
- (resolved) Grade 7 browser journeys green in CI at b20ec49: entry, session, practice, completion; all 11 browser
  suites pass (curriculum timing race fixed by waiting for the meter).
- Nine Grade 7 competencies graded 8–11 in the graph; some outcomes map to Grade 1–4 content.
- Some mistake explanations carry no predicted answer (never diagnosable).
- MC options not shuffled in older families (deferred by owner).
- All content provisional: no educator review yet. No real learners yet. Real-device audio unverified.

## All-grades gap report (grade-gap@1, run 42439650121, b20ec49)
Synthetic learner, behaviour only. Unmapped outcomes: 0 everywhere. Format: failed / untaught-after-mistakes.
- Failed: CBSE 1, 2 `reasoning.estimate-check` (ends guided); CBSE 3 `equivalent-fractions` (ends transfer);
  CBSE 9 (1, name not captured); TN 6 `euclid-algorithm` (ends guided).
- Untaught (no checked general explanation): CBSE 12: 11, 9: 10, 8: 9, 4: 7, 6: 7, 11: 6, 3: 5, 7: 5, 5: 4, 10: 4,
  2: 3, 1: 2; TN 11: 11, 10: 10, 12: 9, 4: 6, 6: 6, 8: 6, 9: 6, 5: 2, 7: 2.
- TN 1–3 releases hold only 3 outcomes each: textbook not yet ingested (the largest real gap; the report can't see it).
- Not measured: lesson level and wording (the Grade 7 review passes found most defects there).

## How to test
- Fast, local: `bun test packages/learning/src`; `frontend/src/year/grade7-coverage.test.ts`;
  one grade: `GRADE=8 BOARD=tn bun frontend/scripts/grade-gap.mts`. All grades: workflow "Grade gap report".
- Full: workflow "My Learning Year" (PR to the base branch, or manual run once `workflow_dispatch` is on main).
  Every browser suite runs even if one fails; read the `summary.json` in the `my-learning-year-screens`
  artifact (also shown in the job summary) instead of the full log.

## Next
1. Grade 8: fix pass for the review-2 majors (by an agent other than the reviewer), then CI green.
2. Owner decides on review/merge of #117 / #119.
3. Next grades per the gap report: TN 1–3 textbook ingestion and the 5 stalls; Grades 9–12; Grades 1–6.
   Usage: the Grade 8 pilot used ~1.3M tokens and hit the weekly limit; plan parallel builds accordingly.
