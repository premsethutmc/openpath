# 03 — Reconciliation decisions (Phase 4 evidence + Adaptive Loop Repair + P2 + renderer)

Merge order (each its own commit on `integration/milestone-1`): loop repair (5289948) onto evidence (2db1c44) -> P2 (49a6be8) -> renderer (12a82f9). Not a four-way merge; each merge was simulated first (`01-CONFLICT-MAP.md`).

One misconception-resolution implementation: the evidence branch's (`learner-hypothesis@1`, resolution probes, delivery-based `teachingHistory`, `investigationTrigger`) is the model; the loop branch's teaching-eligibility gate, pause surface and honest wording sit on top of it. `intervention.ts` was merged by hand to keep both.

Explicit policy decisions
1. Investigation: evidence's trigger (modelled-error or repeated-errors) decides *whether*; the loop's gate decides *what may be taught*. A `paused` competency is never re-investigated (`plan.ts` untaught/inProgress rules now check `paused`).
2. Retention: evidence's retention@2 schedule (7 days, 2 checks, 2 independent minimum) is the single policy; the loop's scheduling surface reads it.
3. Wording: loop's "does not count against you" was dropped in favour of the evidence/loop honest-investigation wording (a wrong answer is recorded; it is not hidden).
4. `nothingToTellApart` (loop stopping rule in `reasoning.ts`) IS adopted: the two branches' tests contradict (loop: an isolated slip asks no follow-up questions; evidence: that slip leaves one `insufficient` hypothesis). Learner-facing behaviour wins; the evidence test `learner-hypothesis.test.ts` "nothing is established without evidence" had its last assertion relaxed (no hypothesis is now recorded after a lone slip; none is ever established/claimed/used to teach). Without the rule the loop test A fails. Flagged for product-owner confirmation.
5. Evidence's `teachingDue` chapter selection bypasses the loop's `teachingReview` note on some paths; the eligibility gate (`failsChecks`) still applies. Flagged.
6. P2 is reachable only through `derivation-interface.ts`; E7 stays shadow-only; no production certification is promoted.

Tests changed (none silently dropped)
- `grading-audit.test.ts`: loop's extra assertion `contractFor(...).verification !== "held"` removed — false on the evidence/P2 lineage where the contract is held pending certification (comment in file).
- `e7-safety-invariants.test.ts`, `e7-finalisation.test.ts`: expectations that P2 deliberately refuses (restriction lines, derived contradiction, sqrt steps) flipped from verified -> not verified and full -> unresolved, each marked `// P2-INTEGRATION:`; the restriction-not-stated test now expects classification "unsupported", deductions [], credit "unresolved". P2 was not weakened to keep them.
- 44 `P2-FINAL` tests are skipped by their own authors' design (reported, not hidden).

Disputed corpus labels (independent review; the third corpus informed implementation fixes, so it is NOT untouched held-out data any more)
- tr-002 / tr-006 / tr-021 (`A = (A)` then `(A) = value`): arithmetic is valid, but the working restates the task and evaluates it; no method is shown. P2 alone certifies it; the integration interface refuses to treat it as method evidence (unsupported). Label "unsupported" upheld for evidence purposes.
- rl-022 / rl-023 / rl-024 (factorised quadratics with two roots): checked by expansion — (x+9)(x+2)=x²+11x+18, (x−4)(x+2)=x²−2x−8, (x−8)(x−9)=x²−17x+72 — and zero-product gives the stated roots. The working is correct and P2 authorizes it; the "unsupported" labels reflect the earlier route policy, not mathematics. Recommend relabelling to "authorized" (tests in `derivation-interface.test.ts`). Corpus files were not edited.
