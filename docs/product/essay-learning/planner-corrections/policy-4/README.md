# Essay planner follow-ups (policy @4)

Branch `fix/essay-retention-followups`, stacked on PR #52 (`fix/essay-planner-corrections`, `a702878`).
**Draft. Not merged, not deployed.** Every learner below is synthetic. Nothing here is a claim about children's learning.
This branch does not touch any mathematics branch or file.

It covers three behaviours #52 left open:

1. retention timing measured from the wrong demonstration;
2. a fresh diagnosis on every later essay;
3. no review after a failed planned delayed check.

## What changed

| # | Change | Where | What is preserved |
|---|---|---|---|
| R1 | **Retention timing.** The delayed check's schedule and "verified" now start at the first time the skill is shown independently at the grade target. A lower level shown earlier stays in the history (`historicalLevel`, the engine's own `retention`). It no longer starts the clock or counts as the target's check. Before this change, the session that first showed the target could itself read as "verified", and the claim was withdrawn on the older clock's date. | `retention()` gains an optional `fromLevel`. `leafView()` gains an optional `target` and adds `atTarget`. Also `essayView`, `engineClaim`, `retentionDue`, `targetRetention` and the outcome's `retentionDueAt`. | Without a target, `leafView` and `retention` are unchanged field for field (K13-R1c). The main app does not pass a target. Estimator, thresholds, evidence eligibility and the `retention.ts` check rule are unchanged. |
| R2 | **Repeated essays.** A skill already shown at the target is not diagnosed again automatically on a later essay. Each such hypothesis gets a `reassessment` (one of four kinds; see the list below the table). An explicit request still works: `planDiagnosticFor(…, { explicitReason })`. The studio passes this when the learner chooses to check the skill. The reason is stored on the request. | `gaps.ts` (`gapHypotheses`, `planDiagnostics`, `planDiagnosticFor`), `journey.ts` | The suspicion rule, `ESSAY_POLICY_DRAFT` (locked) and diagnostic outcomes are unchanged. The essay's error is still recorded and shown. |
| R3 | **Failed retention.** A failed planned delayed check requires a review straight away, and `planReview` records it with no essay needed. The studio records it when the last answer of the delayed check is given. The review is the lesson, then practice with help on unseen questions below the target, then a check without help on reserved questions at the target. The lesson is **required only when the delayed check had no right answer**, which is the existing rule for later checks. When some answers were right, the lesson stays open to the learner but is not required. The review shows in the learner's **existing journey** (`LearningJourney.reviews`), kept apart from `trees`. The assigned steps and `progress` never change. | `checks.ts` (`competencyOutcome.review`, `planReview`, `dueCheck`), `journey.ts` (`reviews`, decision `review`), `studio.ts`, `EssayLive.tsx` | The journey's steps and completion percentage stay exactly as before the failure (K13-R3, K13-R3e, STUDIO-REVIEW). |
| fix | **Conditional steps are decided when the first check is answered.** In #52 a later failure turned steps that the check had made unnecessary back into pending lessons. This changed the assigned sequence and its completion state. The updated simulation driver found it. | `journeyStatus` | |

The four `reassessment` kinds (R2):

- **contradictory**: errors in at least `suspectMinSentences` sentences of this essay alone, or the engine's current level already below the target. The skill is diagnosed, and the reason is recorded on the request.
- **retention_due**: the delayed check is due. That check is the assessment, so there are no diagnostic questions.
- **review**: the latest delayed check failed. The review is next.
- **held**: a single error, carried along with earlier essays' errors. The skill is watched, not reassessed. The journey leaves it out and says why.

The review's check is not offered before its lesson when the lesson is required. It is set no earlier than the next spacing day and no earlier than the engine's own next check at the target, so a check passed after the review counts under the existing retention rule. A new essay that arrives while a review is open leaves the skill out and says so; the review continues in the latest journey. A new essay after a review was carried out checks first rather than re-teaching. A failure the engine records outside a planned check (no review was recorded) gets decision `review` in a new journey: the lesson, practice, then a check.

## Migration compatibility

- **Historical evidence is kept as recorded.** No stored event is rewritten, and no new event kind or essay record type is added. The review is an ordinary `check` record, which the app's validator (`ESSAY_RECORDS`) and earlier versions already accept. On rollback to #52 it reads as an ordinary later verification check: it is asked when due, without the review steps.
- **Claims are derived, not stored.** A rollback is a code revert. Recomputed on existing records:
  - **Learners who first showed a lower level.** A learner who first showed a level below the target and later reached it may move from "verified" to "demonstrated". They become verified again after a delayed check at least 7 days after the target was first shown.
  - **Withdrawal date.** The date the claim is withdrawn moves to the target's own date (shown + 7 days). The old date came from the older clock, which had doubled its interval by then.
  - **Learners who first showed the target itself.** Nothing changes for them (K13-R1c).
- **Recorded journeys** replay with the same trees, steps and progress. They gain `reviews`, which stays empty until a review is recorded. Conditional steps differ from #52 only where the engine later withdrew the claim; there #52 brought the lessons back and this branch keeps them skipped.
- **Recorded diagnostic requests** keep their outcomes. `reassessment` only stops new automatic requests.
- **Contract changes are additive and optional:**
  - `GapHypothesis.reassessment`
  - `DiagnosticRequest.reassessment`
  - `PlannedCheck.review`
  - `CompetencyOutcome.review`
  - `LearningJourney.reviews` and the `JourneyReview` type
  - `NodeDecision` gains `"review"`
  - `LeafView.atTarget`
  - `RetentionOptions`

## Tests

All synthetic. TEST-ONLY plural questions stand in for reviewed bank questions.

- **`packages/english-core/test/k13-retention-followups.test.ts`** (12 tests):
  - **R1a:** Karthik with earlier low-level practice. Before, he read "verified" at his first target demonstration; now he is "demonstrated". The delayed check is due 7 days after the target was shown, and the claim is withdrawn on that date.
  - **R1b:** verified only after a check at least 7 days later.
  - **R1c:** compatibility. The generic view is unchanged, and both schedules agree when the first demonstration is at the target.
  - **R2a:** one error on his second essay. Held, with no automatic diagnostic and nothing taught. An explicit reason is recorded when given.
  - **R2b:** errors in two sentences reopen the skill with questions.
  - **R2c:** a due delayed check is the assessment.
  - **R3:** Karthik's multi-session journey. His delayed check fails, and the review is recorded at once with no essay. His first journey keeps its steps and percentage. The review's check comes after the lesson and on its date. It is passed, and another delayed check follows. A third essay neither re-diagnoses nor re-teaches.
  - **R3b:** an essay during an open review.
  - **R3c:** a kept delayed check needs no review.
  - **R3d:** the review's questions are unseen and reserved.
  - **R3e:** a later failure never brings back skipped steps.
  - **R3f:** a partly right failed check gives practice and a check, with the lesson not required.
- **`frontend/src/english/logic/essay-live/studio-review.test.ts`:** the same flow through the app's real learner record. The review is recorded when the last delayed-check answer is given, shown in the existing journey, and the journey's progress is unchanged.
- **Changed tests:**
  - **K9-2** asserted the old, level-generic "verified". It now asserts verification on the target's schedule and that the skill is not verified before the delayed check.
  - **K10-B1e** returned early without checking anything. It is replaced by a test that asserts it.
  - **K10 helpers** moved to `test/karthik-helpers.ts`. The K10 assertions are unchanged.
- **Results:** english-core 292/292. Frontend 255/255, run locally with a JSON import hook because npm is unreachable here; CI runs the normal command. No new type errors (same local compiler, before and after).

## Before and after, on the same synthetic benchmarks

**Before** is the PR #52 head `a702878`. **After** is this branch. Same seeds, same learners, same commands.

### How the benchmarks were run

- **Research harness.** `openpath-research@67eb2ef` with #52's `research-driver.patch`, then `research-driver-v2.patch` from this folder. The v2 patch:
  - reads the claim through `essayView` where the checkout has it, and through `leafView` otherwise;
  - records and follows reviews as the studio does;
  - adds four retention-timing measures.

  On #52 the v2 driver differs from the #52 driver only by about 1 pp in two measures. That is the #52 skip defect being followed through: lessons came back after a later failure. The research repository and its committed results are unchanged.
- **Simulation driver.** `tools/english/assessment-simulations.ts` now records a review after a failed delayed check. It follows a journey with conditional steps the way the studio does. Any other journey runs exactly as before. Both sides were run with this driver.

### Decision benchmark

Current pipeline, 1,200 learners per simulator, paired, 95% bootstrap interval. The full table is in `benchmark-before-after.md`.

| Measure | responsive | practice | prereq | misconception | slow | scarce content |
|---|---|---|---|---|---|---|
| Verified within 7 days of first showing the target | 16.2% → **0%** | 12.8% → **0%** | 16.0% → **0%** | 14.0% → **0%** | 9.2% → **0%** | 4.0% → **0%** |
| Diagnostic questions | 7.2 → 6.8 (−0.4 [−0.5, −0.3]) | −0.3 [−0.4, −0.2] | −0.4 | −0.4 | −0.3 | 0.0 |
| Repeat diagnostics (target already shown) | 0.10 → 0.05 | −0.02 (n.s.) | −0.04 | −0.05 | −0.02 (n.s.) | −0.01 (n.s.) |
| All questions | −0.2 [−0.3, −0.0] | −0.1 | −0.2 | −0.2 | −0.2 | **+0.1 [0.0, 0.1]** |
| Days with a false claim (of 30) | **0.20 → 0.23 (+0.02 [0.01, 0.04])** | **+0.02** | **+0.02** | **+0.02** | +0.02 (border) | 0.00 |
| Days with a true claim | +0.09 [0.00, 0.18] | +0.07 (n.s.) | +0.09 | +0.09 (n.s.) | +0.04 (n.s.) | −0.02 (n.s.) |
| Lesson events; lessons to learners already at the target | no change (+0.01, n.s.) | no change | no change | no change | no change | no change |
| Learning gain; true engine claims; claim ever false; premature advance | no change | no change | no change | no change | no change | no change |
| Engine shows the target on day 30 | +0.2 (n.s.) | +0.2 (n.s.) | +0.2 (n.s.) | +1.0 (n.s.) | 0.0 | +2.0 pp [0.8, 3.5] |

**Improvements:**

- No synthetic learner is verified sooner than 7 days after first showing the target. Before, 9–16% were.
- 4–6% fewer diagnostic questions (−0.3 to −0.4 per learner). Repeat diagnostics, asked after the target had already been shown, halve from 0.10 to 0.05.
- About 0.2 fewer questions in total.

**Regressions and costs:**

- **More false-claim days.** Days on which a claim is held while the simulated learner is below the target rise from 0.20 to 0.23 per learner. The claim is no longer withdrawn early by the older, lower-level clock. That applies both to learners who keep the skill (+0.04 to +0.09 true-claim days) and to learners who slip below the target before their own delayed check. The share of learners ever holding a false claim is unchanged (3.2–3.8%).
- **Scarce content:** +0.1 questions per learner.

**A version that was rejected:** a review that always starts with the lesson. It added **+0.07 to +0.12 lessons to learners already at the target**, and +0.1 to +0.2 lesson events. There was no measurable gain in learning or claims: a two-question delayed check misclassifies many learners who do have the skill. Requiring the lesson only after a check with no right answer, as the existing rule for later checks already does, removed that cost (+0.01, n.s.). R1 and R2 alone give no lesson change. An ablation without reviews showed this.

### Karthik

Research configurations, same essays, same scripted learner. Configuration D uses 12 test-only questions.

| Configuration | Before (#52) | After |
|---|---|---|
| D | Day 10, essay 2 with one plural error: a diagnostic request (0 questions, "content gap") is recorded. The essay claim before essay 2 reads "none": withdrawn on the older clock. A `retention_due` node is assigned (check, plus conditional lesson, practice and check), and its check is taken. | No diagnostic request. Before essay 2 the claim is "demonstrated" on the target's schedule. Plurals is left out of the second journey ("watched, not reassessed"). The planned delayed check is taken on its date, day 10 = shown + 7. |
| D, both | 11 questions, 5 lesson events, 3 practice, verified at band 5 | Same. Checklist item 8 ("avoids unnecessary repeated diagnostics") goes from not applicable to **passes**. Item 9 (retention scheduling) still passes. |
| A, B, C (shipped bank) | | Unchanged. |

### Assessment simulations

`tools/english/assessment-simulations.ts`: S1–S7, on the app bank, the core bank and the supplement counterfactual. The only changes are S4 and S6:

- **S4 (fails the delayed check).** The outcome now records the review rather than "more reviewed questions are needed". On the core bank, "journey completed" is restored from **no** to **yes**. With the updated driver, #52 showed the skip defect there: the lessons came back after the failure.
- **S6 (supplement, second essay).** Before, the claim read "verified" at the second essay because of the older clock, and 3 new diagnostic questions were asked. After, the delayed check is due, so it is asked first. No diagnostic is asked. The skill is shown and verified at band 5.5, with 9 answers instead of 10.

The committed `assessment-results/*.json` files are historical outputs and were not regenerated.

### Production estimator (E002P)

No estimate changes. The tables are identical before and after; see "E002P" in the PR description. The estimator, the evidence gate and `leafView` without a target are untouched.

## Not changed, and still open

- Estimator mathematics, prior, time variance, mastery and demonstration thresholds, evidence eligibility, ledger semantics, `ESSAY_POLICY_DRAFT` (locked), and the `retention.ts` check rule.
- **The main app's own schedule** (`leafView` without a target) still starts at any level. It has no grade target. Whether the main app should adopt target anchoring is an owner decision.
- **The single-error rule (R2 "held")** is new planner behaviour. It is not a policy value change, but an educator should review it. The default of two sentences comes from the locked `suspectMinSentences`.
- **PR #51 (`verification@2`)** is a sibling of #52 on #50, not part of this stack. It changes what "verified" means: kept at a later check at least 7 days after the band was shown, with an at-band rule. That overlaps with R1. A trial merge conflicts in `retention.ts`, `essay/checks.ts`, `competencies.ts`, `gaps.ts`, `journey.ts` and the K9 test. #52 alone already conflicts with #51 in `journey.ts`. The two need reconciling once the owner chooses the order.
- Retention due dates still follow the engine's existing intervals after a failure (half the interval, at least 2 days).
