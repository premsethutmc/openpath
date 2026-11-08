# OpenPath status (handoff for a new session)

Read this file first; open other files only as the task needs them. Keep it under ~50 lines and update it at
each milestone.

Updated: 2026-11-08

## Rules (product owner)
- No merge or deploy without the owner's explicit approval. PRs are drafts unless the owner says otherwise.
- One milestone at a time: state scope and acceptance tests, finish, report, stop.
- Report: commit, tests pass/fail, unresolved defects, readiness. No progress chatter.
- Long jobs run in GitHub Actions; schedule a check-in instead of waiting.

## Branches
- Base for maths work: `consolidation/openpath-candidate` (PR #112 → main, open).
- Current: `feat/grade7-full-coverage` (draft PR #117, test run only).
- Others open: #115 `integration/v3-from-112`, #116 `maths-expansion` (blueprints, draft).
- Research: separate repo `premsethutmc/openpath-research` (research-only, off by default).

## Current milestone: Grade 7 complete, both boards (CBSE, TN)
- Done: 75 modules; 569 lesson sections; every Grade 7 question type taught; simulated learner verifies
  CBSE 43/46, TN 48/50 (rest await an educator mark); inequations stall fixed (contexts@1).
- Details: `docs/milestones/GRADE7_COVERAGE.md`.

## Open defects
- Grade 7 browser journeys (`frontend/e2e/grade7-*.test.mjs`) not yet green in CI. First run (e926097) stopped
  at a curriculum-dashboard timing race (`curriculum.test.mjs` coverage meter); fixed by waiting for the meter.
- Nine Grade 7 competencies graded 8–11 in the graph; some outcomes map to Grade 1–4 content.
- Some mistake explanations carry no predicted answer (never diagnosable).
- MC options not shuffled in older families (deferred by owner).
- All content provisional: no educator review yet. No real learners yet. Real-device audio unverified.

## How to test
- Fast, local: `bun test packages/learning/src`; `frontend/src/year/grade7-coverage.test.ts`.
- Full: workflow "My Learning Year" (PR to the base branch, or manual run once `workflow_dispatch` is on main).
  Every browser suite runs even if one fails; read the `summary.json` in the `my-learning-year-screens`
  artifact (also shown in the job summary) instead of the full log.

## Next
1. Grade 7 browser journeys green; then the owner decides on review/merge of #117's branch.
2. Fix open Grade 7 defects above, then the next grade/board per the owner.
