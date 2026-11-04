# Independent review

A separate reviewer, which had not seen the implementation being written, read the diff and ran the tests. Scope:

- evidence provenance;
- historical compatibility;
- over-restriction;
- cross-family leakage;
- metric definitions;
- test quality.

Its findings and what was done:

| # | Severity | Finding | Resolution |
|---|---|---|---|
| 1 | defect | E1's "shadow by construction" isolation test failed: the new shadow modules mention the projection. The test runs under bun, so it was not seen by the node journey run. | **Fixed.** Both modules are added to that test's reviewed list. A new isolation test covers `gated-mastery` and `gated-journeys`: nothing outside tests and research imports them. |
| 2 | defect | `auleq` is a four-option choice item with no `:mc` suffix. So `gated-typed` did not exclude it, and the proposed modelling check always picked it first. | **Fixed.** `isChoice` reads the question's own options. `gated-typed` excludes every choice item. Retention plans take typed items first; for modelling that is typed `aulwp`. Journey 9 now asserts that no sub-skill, modelling included, is shown by guesses under `gated-typed`. Journey 10 asserts the modelling check is `aulwp`. |
| 3 | defect | Replacing the server's "invalid working" decision with a client one made E1 read the answer as a record from before D1. The answer was re-graded and credited, so the gated competency went from developing to demonstrated. Journey 6's test did not assert the status. | **Fixed.** Provenance guard, in all variants: an attempt that carries a decision which is not the server's is left out of the sub-skill's independent evidence. Records with no decision at all (before D1, or shadow grading mode) are read exactly as E1 reads them. Journey 6 now asserts that the forged history stays `developing`, with two-step not shown. |
| 4 | risk | The backend's default grading mode is `shadow`, which stores no trusted working verdict on the record. Under it, `gated-method` can never pass and the invalid-working rule never fires. | **Documented** as an activation precondition (07). |
| 5 | risk | `gated-slip`: a lone wrong answer in an incomplete check was forgiven indefinitely. | **Fixed.** A check with a tolerated slip that has not passed leaves the sub-skill `developing`, not shown. This is tested. |
| 6 | risk | A wrong delayed-check answer that comes before the sub-skill's own due date is not counted. The existing check runs from the competency's date. | **Measured, not changed**: it is E1's per-sub-skill cycle, and changing it is a policy choice. S2 reports `gatedClaimsDespiteEarlyWrongCheck` (04). Listed in 07. |
| 7 | risk | A sub-skill that is due and never checked still counts as shown. The module check never samples both-sides or brackets. | **Measured.** A new disagreement category ("claim rests on sub-skills never delayed-checked"). S2 reports `claimsRestingOnNeverCheckedDueSubSkill`. Listed in 07. |
| 8a | risk | The "competent journey" definition. | **Fixed.** Three definitions are reported: S2's own, "each kind answered alone at least twice", and S2's per-kind pairs. |
| 8b | risk | The false-claim journey rate used each policy's own denominator. | **Fixed.** It is also reported over all journeys. |
| 8c | risk | The extra-questions lower bound counted 0 for a sub-skill that is not shown but has 2 distinct right answers. | **Fixed:** at least 1. Per-journey figures are added. |
| 8d | risk | `clearedByUnrelated` is not matched to the sub-skill. | **Renamed** as an upper bound. |
| 8e | risk | Hard-coded 2. | **Fixed:** `INDEPENDENT_MIN`. |
| 8f | risk | No check that the "existing" column matches what the journey recorded. | **Added:** `existingStatusDrift`, 0 in every cohort (04). |
| 9 | note | Default options keep E1 exactly. One asymmetry: an older authority's *false-step* verdict still contradicts, while its *verified* verdict is not upgraded. | **Kept, and tested:** a recorded false step is never regraded away; a historical "verified" is never upgraded. A test asserts that the gated per-sub-skill statuses equal E1's. |
| 10 | note | The comparison reads events in canonical order; the app reads them in store order. These are the same for server-stamped records. | **Documented** (07). S2 shows no drift. |
| 11 | note | Within modelling, `auleq` can clear an `aulwp` failure. | **Documented.** It follows the E1 mapping. |
| 12 | note | `historicalAchievement` under `gated-method` comes from the plain projection. | **Documented.** "Historical" means "was ever shown by E1's answer criteria". |
| 13 | note | Weak assertions: a tautological determinism check, and a misleading client-claim comment. | **Fixed.** Journey 14 now compares replays over reversed order and older-authority events, and tests a historical false step. The journey 16 comment is corrected. Tests are added for slip-alone, the guessing hole, and E1 equivalence. |

The reviewer's verdict was "shadow isolation holds in substance; not ready as it stood". Defects 1–3 are fixed. Risks 4–7 are activation risks; they do not affect this shadow branch.
