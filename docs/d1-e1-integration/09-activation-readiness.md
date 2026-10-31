# 9. Activation-readiness recommendation

## Decision on this integration: **PASS — INTEGRATED (SHADOW)**

This is based on the final regression on `2c221bd` (doc 7): no introduced failures, 0 false accepts, unchanged production decisions, all 20 journeys passing, and certificate history preserved.

The integration connects D1's trusted, server-recorded working verdicts to E1's shadow sub-skill evidence. One evidence contract (doc 2) keeps these apart:

- answer correctness;
- method (verified, invalid, unsupported, bare, partial, not recorded, historical);
- independence;
- retention and recovery history.

Production decisions are unchanged.

## Activation of the sub-skill evidence as authoritative: **not ready**. These need approval first.

1. **Content.** Add both-sides and bracket questions to the linear-equations module's delayed check (limitation 3).
2. **Policy decisions**, in order:
   1. Should a competency claim (independent / transfer / verified) require every core sub-skill to be independently demonstrated? Doc 5 lists the learners whose status would change.
   2. Should a right answer with server-verified false working count toward the authoritative status? Today it does.
   3. Should "verified" need a passed sub-skill delayed check for every core sub-skill?
3. **Educator review** of the sub-skill boundaries, the mapping `linear-equations-subskills@1` and the thresholds.
4. **Shadow period.** Run the projection beside production on real (consented) learner histories. Compare its discrepancies with teacher judgement before any switch.
5. **Authored questions.** Give them explicit sub-skill metadata where they should count.
6. **Display.** Any learner-facing or teacher-facing use needs its own wording review: "shown on two-step equations; not yet both sides".

## What is safe now

- The projection is read-only and deterministic.
- It is isolated from production by a static test and a runtime test.
- It can be used for reports to the product owner and for the shadow comparison above without affecting any learner.
