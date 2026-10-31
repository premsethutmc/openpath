# 08 — Regression results

## Complete run (one pass on the final content and engine)

| Suite | Result | Baseline (`0d825e6`) |
|---|---|---|
| learning package (bun; includes P2 authority, E7 integration gate, generator contracts, grader bundle manifest) | 1666 pass / 44 skip / 0 fail | same |
| frontend, all node tests | 622 pass / **1 fail** (see below) | 602 / 0 |
| teaching safety + corrections + linear equations | 42 / 42 | 21 / 21 |
| journey scenarios / policies A, B, C / coverage | 41 / 41, 5 / 5, 17 / 17 | same |
| Django | 308 OK (2 skipped) | same |
| browser: M1 slice, M2 scenarios, A2 explanations, **A3 linear equations (12 explanations × desktop/mobile)** | 2 / 2, 14 / 14, 8 / 8, 24 / 24 | 2, 14, 8, — |
| persistence across restart: M1 / M2 | OK / **1 check failed** (see below) | OK / PASS |
| typecheck main / english / mathematics-integration | 0 / 0 / 183 (error list identical to baseline, all pre-existing) | same |
| P2 final checks (cross-task, truncated, tampered, forged) | 0 accepted | same |
| corpus results (1838 items) | 0 differences | — |
| explanation-review registry check | OK | OK |

## Introduced failures, and what was done

1. **`generalisation.test.ts` B** (diagnosis generalises across families): identified 6355 / 10619 = 0.598 < 0.6. Cause: the test draws
   all families' simulated learners from **one** random sequence, so adding two families re-drew every later family's trials (the new
   families themselves are identified 74 / 75 in an isolated run). Fix: each family's simulated learners now use their own seeded
   sequence (adding a family can no longer change another's trials). With that seeding: baseline 6399 / 10627 = 0.602, A3 6410 / 10638 =
   0.603; wrong claims 0 in both. Rerun: pass.
2. **`m2-persistence` 4b, "failed check leads to recovery steps"**: after the failed delayed check the engine asked fresh questions alone
   (`verify`) instead of starting-check questions (`explore`), because in this run the learner had already answered the starting check
   (the module's journey changed: 4b now also meets both-sides and bracket questions). Fresh questions alone are decision B's recovery path
   (policy test B lifts the requirement exactly that way), so `verify` was added to the accepted recovery steps. Rerun: PASS 4 learners.

No baseline failures were present.

## Targeted runs during development

linear-equations journeys (20 → 21 tests), content-safety (16), corrections (5), scenarios (41), policies (5), coverage (17), slice (6),
rendering (24), the independent mathematics checks (every screen; 240 generated variants), registry check, two rounds of independent AI
review.

P2 and E7 behaviour is unchanged: no P2 or E7 source changed; the grader bundle was rebuilt only because it embeds the families and
modules (two new families, new teaching text); corpus verdicts and P2 attack checks are identical.
