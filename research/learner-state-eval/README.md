# Learner-state and adaptive-engine evaluation (learner-state-eval@1, research only)

Branch `eval/learner-state-61edf730`, from candidate `61edf730` (PR #112 head). No production file, content file, generated file or shared
engine file is changed. Nothing is activated, merged or deployed. **These are simulations. They are not evidence of real learning gains.**

## 1. What already existed

| Asset | Where | What it exercises |
|---|---|---|
| E003.1 calibration (Condition B variance) | external research repo `42834e68` (not in this repo) | **research model**. The repo has only its shadow port. |
| E003 actual-ledger comparison | `origin/research/e003-actual-ledger-comparison`, `tools/english/research/e003.ts` | the real english-core `Ledger.rebuild` / `binaryUpdate` on synthetic responses (English capabilities). Not merged. |
| Learner-state shadow (E003.1 Cond. B) | `packages/english-core/src/shadow.ts`, `docs/learner-state-shadow/` | the real `Composite` with different variance settings, run beside production. **Not read by any consumer.** |
| English estimator studies | `tools/english/research/{estimator-recovery,slip,sim-weaknesses,breadth}.ts` | re-implemented / counterfactual estimators beside the English ledger (research). |
| S1/S2 synthetic learners | `research/synthetic-learners/` (+ `experiments/s2`) | the **real** journey (`SliceFlow`) at D1+E1 (`cd40422b`), **linear equations only**. Results describe an older candidate. |
| M1 sub-skill-gated mastery | `packages/learning/src/gated-mastery.ts` | shadow policy for `linear-equations` only. Not read by the engine. |
| Journey drivers | `frontend/src/journey/{session.ts,evid-driver.ts}` | the real candidate engine. Scripted right/wrong only. |

**Estimator and evidence pipeline on the candidate (math).** `SliceSession.submit` → `server-grader.gradeRequest` (verdict, the authority) →
`make.attempt` record → `session.learnerState` → `evidence.evidenceFor`. Two layers:

1. The shared english-core `Composite` (Gaussian 3PL update via `mathematicsLedger`) gives `engine` status and `firstDemonstratedAt`.
2. `skillEvidence` gives the **status the product shows and the engine selects on**. It is a counting rule, not the Bayesian estimate:
   - status@2: "independent" means INDEPENDENT_MIN = 2 distinct right first answers alone, with the latest right. Once shown, it reverts on 2 of the last 3 wrong.
   - skill-units@1 holds: taught and not rechecked, or a unit's latest answer wrong with fewer than 2 distinct right.
   - retention@2: a delayed check 7 days later, 2 questions, and any wrong answer fails it.
   - "verified" also needs the engine's verification and educator-reviewed content.

`intervention.moduleState` selects the next step from this `SkillEvidence`. The E003 shadow and the E003.1 variance change touch only layer 1, which does not decide the shown status. So the existing calibration work does not evaluate the decision that learners see.

## 2. Harness (reuses, does not replace)

`src/harness.ts` reuses `start`, `unitKey` and `wrongAnswer` from `evid-driver.ts`, `activityFor` from `frontend/src/learning/driver.ts`, and the S1 seeded RNG.
It drives the real `SliceSession`: real selection, grader, evidence, teaching events and clock. Each learner has a hidden known/unknown state per declared
skill unit (`skill-units.ts`).

| Learner | slip | guess | P(learn on unit's lesson) | forget over gap | start |
|---|---|---|---|---|---|
| strong-slipper | 0.20 | 0.20 | 0.9 | 0 | all units known |
| weak-guesser | 0.05 | 0.35 | 0 | 0 | none known |
| improver | 0.05 | 0.10 | 0.85 | 0 | none known |
| forgetter | 0.05 | 0.15 | 0.6 | 1.0 (every unit) | all known |
| sibling-gap | 0.05 | 0.15 | 0 | 0 | all known but one unit (seeded pick) |

**Assumptions.** All values above are synthetic.
- Questions outside every unit ("core") are known if at least half the units are known.
- Answers are first attempts, with no hints and no working.
- Protocol: session 1 has up to 40 engine steps and stops when a delayed check is offered. Then an 8-day gap. Session 2 has up to 25 steps, and the delayed check is answered.
- Truth "mastered" means every unit is known.
- A "claim" is status independent, transfer or verified. "verified" is never reached, because shipped content is not educator-reviewed.

**Subjects.** `MATH.algebra.linear-intro` (4 units), `MATH.number.equivalent-fractions` (2 units plus many core/MC items) and `MATH.measurement.money-decimals` (3 units).
English uses a different surface and was not driven.

**Seeds.**
- dev: 1–30. Used for diagnosis and choosing the variant.
- held-out: 1001–1030.
- held-out-2: 2001–2030. This is a fresh set, used after the refresh option was added.

N = 30 per learner × subject × variant, so 90 per learner pooled. Rates have Wilson 95% intervals. Means and paired differences have percentile bootstrap 95% intervals (2000 resamples, fixed seed).
Paired comparisons use the same learner seed, so the learner's random streams match until the engine's choices diverge.

## 3. Baseline (held-out-2, seeds 2001–2030, N = 30 per cell)

Full table with intervals: `results/table-baseline-heldout2.md`. Dev and held-out-1 show the same pattern (`results/table-baseline-*.md`).
Pooled over 3 subjects (N = 90):

| learner | false mastery (any step) | false claim still standing at end | missed mastery (S1) | Qs from true mastery to claim |
|---|---|---|---|---|
| strong-slipper | 0% | 0% | 2% | 2.9 |
| weak-guesser | 66% | 7% | n/a | n/a |
| improver | 54% | 7% | 0% (n=4) | 2.5 |
| sibling-gap | 78% | 27% | n/a | n/a |
| forgetter | 47% | 36% | 0% | 2.3 |

Behaviour after forgetting (baseline): the delayed check catches it in 97–100% of runs, and the claim is withdrawn on the first answer (0.1–0.3 stale Qs).
Then recovery re-establishes the **whole competency** from 2 right answers on the failed unit only. 36% of forgetters end the run claimed while every other unit is still forgotten.

Strong learner: the delayed check fails in 31–52% of runs. With slip 0.2, any wrong answer in a 2-question check fails it, so this is a false "not retained".

## 4. Most consequential failure: competency claims from a subset of its sub-skills

The claim needs 2 right answers **anywhere in the competency**:
- A declared unit that has never been answered does not hold it.
- A unit's own hold clears after one right answer, whatever came before.
- The delayed check samples 2 questions, and only taught units are required in it.
- After a failed check, only the failed unit is rechecked.

On dev, in 71 of 80 false first claims by the sibling-gap learner, the claim came **before the unknown unit was ever asked**. The mean was 2.4 questions and 1.3 units with a right answer.

Trace: `results/trace-sibling-gap-algebra-seed11.txt`, linear-intro, the hidden gap is x + a = b.
```
diag [x÷a] ok -> guided ; diag [a·x] ok -> INDEPENDENT, delayed check scheduled (2 answers, x+a never asked)
practice/transfer ok x5 -> TRANSFER ; check [x+a] X -> guided ; ... checks [x+a] X, X, X (4 wrong of 4)
diag [x+a] ok (guess, p=0.15) -> TRANSFER, check scheduled   <- one lucky right clears 4 wrongs
+8 days: delayed check samples [a·x] ok, [x÷a] ok -> "passed"  (x+a never taught, so not required)
```
Forgetter: `results/trace-forgetter-algebra-seed5.txt`. The check fails on a·x, then 2 right answers on a·x restore TRANSFER while the other 3 units are forgotten.

## 5. Prototype: unit-coverage gate (`src/coverage-gate.ts`, coverage-gate@0)

This is a wrapper over the **unchanged** `skillEvidence` result. It only ever lowers a claim. In the harness it is applied to every `state()` the real
session reads, so selection, recovery and status all see it: this is a full-loop test, not a relabelling.
- **Strict:** every declared unit needs status@2 on its own answers alone (at least 2 distinct right, and the latest right or fewer than 2 of the last 3 wrong).
- **Refresh:** after a failed delayed check, every unit needs coverage again from answers after the failure.
- If a unit is not covered, `independent`/`transfer` becomes `guided`, and a scheduled or due check is withheld, as `shownNow` already does.
- A module with no units is unchanged.

The variant was chosen on dev: strict over lenient, because it gave lower guesser false mastery with similar cost. Refresh was added on dev, because the forgetter was unchanged by the gate alone.

**Before / after, held-out-2** (seeds 2001–2030, paired, N = 90 per learner). Full table: `results/compare-heldout2-strict-refresh.md`.

| learner | false mastery | false claim at end | missed mastery (S1) | Qs to recognition | answered Qs |
|---|---|---|---|---|---|
| weak-guesser | 66% → 2% (−63 [−73, −53]) | 7% → 0% (−7 [−12, −2]) | n/a | n/a | −1.4 |
| improver | 54% → 2% (−52 [−62, −42]) | 7% → 0% (−7 [−12, −2]) | 0 → 0 (n=4) | 2.5 → 14.8 (n=4) | +0.7 |
| sibling-gap | 78% → 22% (−56 [−66, −46]) | 27% → 8% (−19 [−29, −9]) | n/a | n/a | +0.4 |
| forgetter | 47% → 19% (−28 [−39, −17]) | 36% → 2% (−33 [−43, −23]) | 0 → 0 | 2.3 → 14.3 | +3.5 |
| strong-slipper | 0 → 0 | 0 → 0 | **2% → 18% (+16 [8, 24])** | **2.9 → 15.7 (+12.8)** | +3.5 |

Held-out-1 (seeds 1001–1030) matches for strict without refresh (`results/compare-heldout-strict.md`). Lenient (1 right per clean unit) is in `compare-heldout-lenient.md`.

**Regressions and trade-offs.**
- Recognition of a genuinely strong learner slows from about 3 to about 16 questions. The engine's selection does not target uncovered units; it reaches them only through its own order (practice → transfer → check).
- A strong learner with 20% slips is not recognised within 40 steps in 18% of runs (vs 2%). Most of these end in the engine's own "done"/"pause" while a unit shows `-+-`.
- The delayed check is scheduled later, because it follows the later claim.
- Some sibling-gap false claims remain (22%). Lucky guesses on the gap unit can still reach 2 distinct right answers.

**Not recommended for activation as is.** A deployable version would need to make selection ask uncovered units first. That is an engine change, outside this branch.

## 6. What remains unproven

- Every parameter and learner type is synthetic. A binary known/unknown state per unit is a strong simplification. Core-question knowledge is an assumption.
- Only 3 math competencies were tested. English (the composite estimator layer and the E003 shadow) was not driven end to end. Statistics and geometry modules were not tested.
- No hints, working, multi-attempt or written answers were simulated. Effects through D1/E1 working evidence are unmeasured.
- N = 30 per cell. Subgroups where mastery was ever reached are small (improver n=4–9), so the missed-mastery CIs there are wide.
- The selection-aware fix was not built. The cost of re-covering after forgetting, for a learner who really relearns everything, is not measured.
- None of this shows any effect on real learning.

## Reproduce (from `frontend/`, with `frontend/node_modules` linked)

```
node --import tsx --test ../research/learner-state-eval/test/coverage-gate.test.ts
../research/learner-state-eval/scripts/batch.sh baseline heldout2 2001 2030            # writes results/*.jsonl.gz (~8 min on 2 cores)
../research/learner-state-eval/scripts/batch.sh coverage-gate-strict-refresh heldout2 2001 2030
node --import tsx ../research/learner-state-eval/scripts/summarise.ts baseline-heldout2
node --import tsx ../research/learner-state-eval/scripts/compare.ts heldout2 baseline coverage-gate-strict-refresh
node --import tsx ../research/learner-state-eval/scripts/trace.ts sibling-gap MATH.algebra.linear-intro 11 baseline
(cd ../research/learner-state-eval && node scripts/end-state.mjs baseline-heldout2)
```
