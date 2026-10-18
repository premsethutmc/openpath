# Essay planner corrections (policy @3)

Branch `fix/essay-planner-corrections`, stacked on PR #50 (`feat/essay-diagnostic-workflow`, `2a89848`), which carries
the Grade 8 profile v2 (plurals and countability already added there; this change does not add it again).
**Draft. Not merged, not deployed.** Every learner below is synthetic; nothing here is a claim about children's learning.

The defects were reproduced by the research in `premsethutmc/openpath-research` PR #1 (`67eb2ef`, docs/e002p/). That
repository and its results are unchanged.

## What changed

| # | Change | Where | What is preserved |
|---|---|---|---|
| A1 | The demonstrated level "as of the last qualifying answer" is taken **before** the first post-teaching answer is applied. That answer still updates the estimate; it no longer raises or lowers the demonstrated level. | `composite.ts applyDirect` | evidence eligibility, the estimator, every threshold; nodes with no teaching are byte-identical |
| A2 | A later essay's journey leaves out a skill that has been **shown at the grade target since**, when only an earlier essay's hypothesis supports it. A gap that was never resolved is still carried, as before. Its later and delayed checks keep their schedule (`journeyOutcomes`, used by the studio). | `essay/journey.ts` | earlier journey records are never rewritten |
| A3/B1 | A due delayed check (engine "overdue" after the target was shown) is a retention question. The outcome asks for the delayed check, not a fresh verification; a new journey **checks first** (questions from the retention reserve, or the already-planned delayed check's own questions) and teaches only if it does not hold. If the planned check is not due yet, nothing is taught before it. A journey retention step counts as the delayed check from `retentionDelayDays` after the target was first shown. | `journey.ts`, `checks.ts competencyOutcome`, `competencies.ts retentionDue` | `retention.ts` and the engine's verification rules are unchanged |
| B2 | Insufficient evidence (suspected, or unresolved) is no longer handled as a confirmed gap: when the bank has unseen questions at the target, the journey **checks at the target first**; the lesson, practice and a post-lesson check follow only if that check does not show the skill. | `journey.ts` | `ESSAY_POLICY_DRAFT` (locked) and every threshold; a confirmed gap is taught first as before |
| 5 | Kept on purpose (the research found them better): a prerequisite the essays show is taught first; when nothing at the target can check first, the journey teaches as before. | `journey.ts` | |
| 7 | Fixed sequences: a journey's steps are set when it is created and never regenerated or erased. A step planned "only if the check does not show the skill" becomes `skipped` when the check shows it: it stays assigned and can still be opened. | `journeyStatus` | |
| 8 | `LearningJourney.progress` (steps done, skipped, lessons assigned and completed, percent) is computed from step statuses alone and never reads the engine. A skipped lesson is never "completed"; completing a lesson never makes anything green. | `journeyStatus` | |

Contract changes are additive: `StepStatus` gains `"skipped"`; `JourneyStep` gains optional `condition` and `purpose`;
`JourneyNode` gains optional `decision` (`gap`, `insufficient_evidence`, `retention_due`, `refresher`, `check_only`,
`prerequisite`); `LearningJourney` gains optional `progress`. The studio labels the new status. Journeys recorded before
this change replay as before (no `condition`, so nothing can be skipped).

## Tests

`packages/english-core/test/k10-planner-corrections.test.ts` (12 tests), all on synthetic data:

- **A1** — right or wrong answers straight after teaching never change the demonstrated or current level (before: 5 → 5.5 and 5 → 4.5).
- **A2** — Karthik's second essay without plural errors does not re-teach plurals he has shown; his first journey is byte-identical afterwards; his delayed check is still scheduled. **A2b** — a never-resolved earlier gap is still carried.
- **A3** — while the delayed check is due, the outcome asks for a retention check.
- **B1** — Karthik's second essay arrives with his delayed check due: check first; kept → lesson, practice and post-check `skipped`, retention demonstrated, progress < 100% while the skill is shown. **B1b** — not kept → the lesson is next. **B1c** — no questions for the delayed check → teaching as before. **B1d** — an already-planned delayed check is reused, never duplicated. **B1e** — the planned check is not yet due → nothing is asked or taught before it.
- **B2** — unresolved → check at the target first; not shown → lesson next. **B2b** — with the shipped bank (too few questions at the target) the journey still teaches first.
- **Progress** — lessons and practice raise progress, never proficiency.

`K1-11` and `K1-14` were updated for the intended B2 order (check first for a suspected/unresolved target); the
prerequisite in K1-11 is still taught first. Results: english-core 280/280; frontend 254/254 (run locally with a JSON
import hook because npm is unreachable from this environment — CI runs the normal command). Typecheck: no new errors
(compared before/after with the same local compiler). `tools/english/assessment-simulations.ts` (S1–S7) gives identical
tables before and after, so the existing ASSESSMENT_* documents stay accurate.

## Before and after, on the same synthetic benchmarks

Same commands, same seeds, same learners; **before** = PR #50 head `2a89848`, **after** = this branch. The research
harness at `openpath-research@67eb2ef` was used unchanged except for `research-driver.patch` (in this folder): its
driver now follows a journey the way the studio does (pending steps in order, a check after teaching waits for the next
sitting, statuses re-read after every check, later checks for every journey's targets) so that the new conditional steps
are honoured. For journeys without conditional steps it gives the same order as before. The research results committed in
`openpath-research` were not modified.

**Decision benchmark (current pipeline, paired; full table in `benchmark-before-after.md`).**

| Simulator | Lessons to learners already at the target | Lesson events | Questions | Learning gain | True engine claims | False claims / premature advance |
|---|---|---|---|---|---|---|
| responsive | 1.36 → 1.27 (−0.09 [−0.14, −0.04]) | −0.1 | +0.4 | no change | −1.0 pp (n.s.) | no change |
| practice | −0.02 (n.s.) | 0.0 | +0.5 | no change | −1.0 pp (n.s.) | no change |
| prereq | −0.09 [−0.14, −0.05] | −0.1 | +0.4 | no change | −1.0 pp (n.s.) | no change |
| misconception | −0.09 [−0.14, −0.04] | −0.1 | +0.4 | no change | +0.5 pp (n.s.) | no change |
| slow | +0.02 (n.s.) | 0.0 | +0.6 | +0.01 (n.s.) | −0.2 pp (n.s.) | no change |
| scarce content | −0.02 (n.s.) | 0.0 | 0.0 | no change | −0.2 pp (n.s.) | no change |

- About **7% fewer lessons to learners who already had the skill** in three of five simulators, at the cost of
  **~0.4–0.6 more questions** per learner (the check that now comes before teaching). Learning, claim accuracy and
  premature advancement did not change measurably. With scarce content nothing changes, as intended (teach anyway).
- An intermediate version without the post-lesson check cost improvers 2–3 pp of true claims (their pre-lesson
  check answers stay in the static estimate and one post-lesson check was lost); restoring the post-lesson check removed
  that loss. Pre-lesson check answers still weigh on the estimate — a property of the unchanged estimator.
- The research's larger gains (−24% questions, −⅓ unnecessary lessons) came from changing *how* diagnosis is done
  (questions at the target, stopping once clear). That needs the locked diagnostic policy to change and was **not done**.

**Karthik (research configurations; same essays, same scripted learner).**

| Configuration | Before | After |
|---|---|---|
| Shipped bank (profile v2 has plurals) | 3 diagnostics far below the target, 10 lesson events, no claim — content-limited | unchanged: too few questions at the target, so it teaches first (kept on purpose) |
| With 12 test-only reviewed questions | diagnostics, 5 lesson parts on day 0, shown day 3; on day 10 a **full re-teach (5 parts)** because the delayed check had fallen due, then the delayed check → verified 5.5 | check at the target first (wrong) → 5 lesson parts; shown day 3; day 10 the **delayed check first** (the planned one, not a second) → verified 5; **no re-teach**. 11 questions both; lesson events 10 → 5; practice 5 → 3; checklist item "instruction only when justified" now passes |

**Production estimator (E002P, all eight conditions and the calibration set).** A1 changes no estimate: held-out log
loss, interval coverage and missed-at-end are identical to four decimals. False mastery falls 0.1–0.2 pp in every
condition; claim flips rise 0.02–0.03 per learner (the level no longer jumps on the answer straight after a lesson, so it
changes at the next session instead). Grade-target claim precision in the calibration set: 94.7 → 94.7 (matched),
90.5 → 90.2 (slips), 94.0 → 94.3 (sessions).

## Not changed, and still open

- Estimator mathematics, prior, time variance, mastery and demonstration thresholds, evidence eligibility,
  `ESSAY_POLICY_DRAFT` values (locked for the pilot), `retention.ts`.
- **Repeated diagnostics** on a later essay for a skill already shown are still planned (`planDiagnostics`).
- **The engine's own retention clock** still starts at the first demonstration at *any* level; the planner now treats its
  due date as a retention question, but the claim is still withdrawn from that date (a `retention.ts` policy question).
- **Remedial teaching after a failed *planned* delayed check** still comes only through the next recommendation or essay
  (inside a journey it follows the check directly).
- **Diagnosis below the target** (the main source of unnecessary lessons) is a locked-policy question for the owner.
