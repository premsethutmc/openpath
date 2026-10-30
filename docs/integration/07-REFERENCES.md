# 07 — Exact references
Integration branch: `integration/milestone-1` (this commit on top of merge commits a6fe979 loop repair, 1122330 P2, 7e5fc6b renderer).
Sources: math `feat/math-answer-key-certification` 49a6be8; evidence `feat/adaptive-evidence-investigation` 2db1c44; loop `feature/adaptive-loop-repair` 5289948; renderer `feat/universal-learning-renderer` 12a82f9; phase 3 `feat/adaptive-journey-slice` e2176d2. Main (b578c78) untouched. Nothing merged to main, nothing deployed.
Screenshots: `docs/integration/screenshots/{desktop,mobile}-{1-open-question,2-incorrect-feedback,4-teaching-1,4-teaching-2,5-recheck-correct,6-summary}.png`.
Run: `cd frontend && node scripts/build-slice.mjs && node --test e2e/slice-journey.test.mjs`.
