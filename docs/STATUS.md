# OpenPath status (handoff for a new session)

Read this file first; open other files only as the task needs them. Keep it under ~50 lines and update it at
each milestone.

Updated: 2026-11-09 (Grade 8 pilot integration)

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
- Open (engine): (1) order on-grade questions before below-grade ones for a learner (exponents opens with 5^3);
  (2) hide lesson sections of above-grade families (BPT, segments, (x±a)^3, nPr) for a Grade 8 learner.
- Deferred: ±1 distractors (would move option letters).

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
1. Grade 8: CI green, then the two engine items above, then a second independent sample review.
2. Owner decides on review/merge of #117 / #119.
3. Next grades per the gap report: TN 1–3 textbook ingestion and the 5 stalls; Grades 9–12; Grades 1–6.
   Usage: the Grade 8 pilot used ~1.3M tokens and hit the weekly limit; plan parallel builds accordingly.
