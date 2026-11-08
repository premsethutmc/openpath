# Validation and handover

Branch: `teaching/calculus-steps-2026-11-08`. Base: `08a6d5aa97aee22fb8025940341334be5f43e120`. The external handover records the final commit.

## Student-visible journeys

Real Chromium, built Year app, local Django API and synthetic pupils. No lesson or mastery records were injected to force the selected strategy. A test-only question-release fixture permits the synthetic journeys; explanation status remains pending. Each selected screen’s text and final mathematics were checked in the viewport, clear of sticky controls. Screenshots were inspected.

| Journey | Actual strategy | Fresh recheck | Later wrong question | Fresh question after lapse |
|---|---|---|---|---|
| calculus teaching: derivative | `expand_cancel` | `gen:aqfp:0,2,4,-4:mc` | `gen:aqfp:1,1,0,0` | `gen:aqvel:0,1,2,2` |
| calculus teaching: substitution du | `why_du` | `gen:subst:0,1,3,1` | `gen:subst:0,1,2,3` | `gen:subst:1,2,3,2` |
| calculus teaching: substitution limits | `limits_table` | `gen:subst:0,3,1,2:mc` | `gen:subst:0,1,2,3` | `gen:subst:1,2,3,2` |

All three passed guided practice, unseen recheck, reload equality, a later independent visit, a deliberately wrong delayed check, fresh work after that failure and a second reload. This is software evidence, not evidence of educational effectiveness. `BROWSER-EVIDENCE.json` contains the actual visible screens and event summaries.

## Commands and results

From `frontend/` unless stated otherwise:

- `node --import tsx ../packages/learning/scripts/library.ts`: 314 generated modules, 15 authored modules assigned pools; pass. Only the two calculus modules changed.
- `node --import tsx ../packages/learning/scripts/review.ts sync`: pass; changed module revisions remain draft.
- `node --import tsx ../packages/learning/scripts/explanation-review.ts sync --competency MATH.calculus.derivatives,MATH.calculus.integration-methods` and `... check`: pass; eight unique explanations revised, all pending.
- From repository root: `ESBUILD=frontend/node_modules/.bin/esbuild node tools/mathematics/server-grader/build.mjs`: pass.
- `npm run typecheck`: pass.
- `node --import tsx --test src/learning/historical-answers.test.ts src/journey/maths-integration.test.ts src/journey/deep-recovery-goal.test.ts`: 18 pass, including preservation of 2,372 historical answers/choice letters and prerequisite goal recovery.
- `node --import tsx --test src/journey/calculus-teaching.test.ts src/journey/adaptive-milestone.test.ts`: 10 pass, covering exact example arithmetic, fresh questions, preserved generator draws, pending evaluation gate, consent/evidence and adaptive regressions.
- `bun test ../packages/learning/src/teaching-contract.test.ts ../packages/learning/src/teaching-stage2.test.ts ../packages/learning/src/generator-contracts.test.ts`: 45 pass, 0 fail. The initial stale-manifest failure was resolved by final regeneration and this rerun.
- `node scripts/build-mathematics-journey.mjs` and `node scripts/build-year.mjs --test`: pass.
- With local Django on `PATHWAY_API=http://127.0.0.1:8021`, matching `OPENPATH_TEST_CLOCK_FILE=/tmp/calculus-clock.json`, Chromium, and synthetic test data: `CASE="calculus teaching" CALCULUS_SHOTS=/tmp/calculus-logs/screens MATHS_EXPANSION_RESULTS=/tmp/calculus-logs/browser.json node --import tsx e2e/maths-expansion-browser.test.mts`: 3 complete journeys pass.
- `node --import tsx scripts/calculus-teacher-packet.mts`: regenerated the exact before/after teacher packet.
- `node scripts/build-year.mjs`: restored the default build after browser tests.
- `git diff --check`: pass.

## Limits and decisions

Full hosted CI and the entire repository test suite were not run on this local branch. No CI status from the base is claimed for this head. No push, PR, merge, deployment, approval or Grade 8 edits. The earlier test-harness failures (symbolic attribution assumption, synthetic name length, unsynchronised build, smooth-scroll timing) were corrected; all final checks above pass.

`aqfp` remains draft; `subst` remains submitted. Eight changed explanations require educator review, and the authorised explanation reviewer registry is empty. See README for the specific teacher decisions and the remaining cubic-prerequisite route limitation. Controlled recovery remains default off.
