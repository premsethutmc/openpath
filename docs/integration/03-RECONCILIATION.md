# 03 — Reconciliation decisions (Phase 4 evidence + Adaptive Loop Repair + P2 + renderer)

Merge order (each its own commit on `integration/milestone-1`): loop repair (5289948) onto evidence (2db1c44) -> P2 (49a6be8) -> renderer (12a82f9). Not a four-way merge; each merge was simulated first (`01-CONFLICT-MAP.md`).

One misconception-resolution implementation: the evidence branch's (`learner-hypothesis@1`, resolution probes, delivery-based `teachingHistory`, `investigationTrigger`) is the model; the loop branch's teaching-eligibility gate, pause surface and honest wording sit on top of it. `intervention.ts` was merged by hand to keep both.

Explicit policy decisions
1. Investigation: evidence's trigger (modelled-error or repeated-errors) decides *whether*; the loop's gate decides *what may be taught*. A `paused` competency is never re-investigated (`plan.ts` untaught/inProgress rules now check `paused`).
2. Retention: evidence's retention@2 schedule (7 days, 2 checks, 2 independent minimum) is the single policy; the loop's scheduling surface reads it.
3. Wording: loop's "does not count against you" was dropped in favour of the evidence/loop honest-investigation wording (a wrong answer is recorded; it is not hidden).
4. Isolated slip (approved conditionally by the product owner, closure review): the loop's stopping rule `nothingToTellApart` (`reasoning.ts`) is adopted. Two separate, compatible conclusions are kept and both are tested in `learner-hypothesis.test.ts` "nothing is established without evidence":
   - evidence interpretation: the slip stays recorded as an independent wrong answer (A1: 12/13 independent, not erased, not called help); the real `reason()` over that answer is not `established` (insufficient evidence); no hypothesis is invented or promoted;
   - adaptive decision: with competence otherwise supported, no explore/recover/chapter step follows the slip.
   What changed from Phase 4: Phase 4 also stored one `insufficient` hypothesis for A1 (made by the supplementary forced investigation). With the stopping rule that investigation asks no question, and `hypotheses()` only records an investigated answer, so none is stored. The closure version of the test replaced a vacuous relaxation (an `every` over an empty list) with the five non-vacuous assertions above. Loop test A ("one isolated slip leads to no remediation") and every other test in both files pass.
5. Evidence's `teachingDue` chapter selection bypasses the loop's `teachingReview` note on some paths; the eligibility gate (`failsChecks`) still applies. Flagged.
6. P2 is reachable only through `derivation-interface.ts`; E7 stays shadow-only; no production certification is promoted.

Tests changed (none silently dropped)
- `grading-audit.test.ts`: loop's extra assertion `contractFor(...).verification !== "held"` removed — false on the evidence/P2 lineage where the contract is held pending certification (comment in file).
- `e7-safety-invariants.test.ts`, `e7-finalisation.test.ts`: expectations that P2 deliberately refuses (restriction lines, derived contradiction, sqrt steps) flipped from verified -> not verified and full -> unresolved, each marked `// P2-INTEGRATION:`; the restriction-not-stated test now expects classification "unsupported", deductions [], credit "unresolved". P2 was not weakened to keep them.
- 44 `P2-FINAL` tests are skipped by their own authors' design (reported, not hidden).

Disputed corpus labels — see 09-CORPUS-REVIEW.md (closure review). No corpus label was changed. The earlier recommendation to relabel rl-022/023/024 is WITHDRAWN.
