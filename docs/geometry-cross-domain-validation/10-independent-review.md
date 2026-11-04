# 10. Independent review

A separate reviewer agent, which had not seen the work being produced, reviewed the diff and the new files in a read-only pass, ran the new tests (bun: 31 pass; geometry journeys: 11 pass; frontend sub-skill evidence: 4 pass) and compared `subskill-projection.ts` line by line with `cd40422b:packages/learning/src/subskill-evidence.ts`.

**Reviewer verdict:** the claim is "largely fair". Geometry runs through the shared engine with no geometry logic; the only shared change is the projection extraction, which has no behavioural difference for linear equations. The first draft understated three reasoner behaviours (R02, R06/R07, R10).

| # | Area | Finding | Severity | Disposition |
|---|---|---|---|---|
| 1 | Correctness | `afcross` has a third mode (sum of the other three angles = 360° − x, angles around a point). The config described it as vertically opposite/adjacent only, and called "around a point" a missing family | major | **Fixed**: config comments, sub-skill name and note updated; inventory and portability matrix say "partial: only `afcross` mode 2, not separable" |
| 2 | Unjustified acceptance | R02 (bare final claim) was oracle "valid" and the test pinned "verified" | major | **Fixed**: new oracle class `unjustified`, outcome `accepts-unjustified`, reported as an authority behaviour that must never become method evidence |
| 3 | Alternative proofs | R10 (a provably false step reported only `unsupported`) was scored as "agrees" | major | **Fixed**: new outcome `abstains-on-invalid`; the test pins R10 to it and excludes it from the first-invalid-step check |
| 4 | Alternative proofs (latent) | R06/R07 `invalid` on valid proofs would count *against* the learner if connected (the projection treats it as a false step and stops crediting the right answer) | major (latent) | **Documented** (04, 06, 11); not fixed: research authority, out of scope |
| 5 | Provenance | the config header said no geometry working verdict is recorded; in fact working-assessment@1 `unsupported` is recorded from the algebra derivation authority; the projection does not check authority suitability | minor | **Fixed** wording; gap recorded (04, 11) |
| 6 | Oracle | R08 "not-established" is only a formal gap (50° + 60° already rules out a degenerate triangle) | minor | **Fixed**: oracle note qualified |
| 7 | Alternative proofs | R12a/b are confounded: both abstain because vertical-opposite yields no measure (R06's cause), not because of step order | minor | **Documented** in the case and in 06: order sensitivity is not tested |
| 8 | Mastery | "straight line ≠ exterior angle" test passes trivially (G-06 attempts no triangle question) | minor | **Documented** (08): shows cross-competency isolation only |
| 9 | Replay | `fromEvents` reuses the same event objects, so `identicalProjection` compares a function with itself; `identicalState` is meaningful (no decision side map). Real serialisation round trip is the Django script | minor | **Documented** (05); the Django round trip was run (PASS) |
| 10 | Leakage | authoritative competency reaches transfer with one side-inequality answer | note | existing engine behaviour, reported as discrepancy (08) |
| 11 | Reuse | linear behaviour identical; WeakMap cache and a guard instead of `!` are the only non-logic differences; `unmapped` not enforced | note | recorded (04) |
| 12 | Isolation | no production module imports the new files | clean | — |
| 13 | Diagram | no relation is inferred from appearance (R11 blocks) | clean | — |
| 14 | Duplication | none | clean | — |

Also found by the regression run (not the reviewer): the geometry journey harness imported the raw pool selector `phasePool`, which the quarantine-safety test (`question-status.test.ts`) forbids outside registered files. **Fixed** by selecting the crossing-lines start item from the angle-pairs module's own (quarantine-filtered) lists. The allow-list was not extended.
