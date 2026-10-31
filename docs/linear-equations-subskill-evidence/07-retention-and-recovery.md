# 7. Retention and recovery results

The rules are reused, not redesigned. The cycle is retention@2 (`evidence.ts:183–206`), and `retentionCycles` is a scoped copy of it. A test shows it reproduces `skillEvidence`'s `retentionHistory` and state exactly on generated histories over 5 seeds. The scheduler, the module's retention list and the recovery rules are unchanged.

| Behaviour | Result |
|---|---|
| Delayed check recorded per sub-skill | each retention answer belongs to its family's sub-skill. `retention.history` holds every cycle: due, result, `failedAt`, `recoveredAt`. |
| Failed delayed check | the sub-skill becomes `recovery-required` and its current evidence changes. `historical.everDemonstrated` and `firstDemonstratedAt` are kept, and the failed cycle stays failed after recovery (journey 14, tests). |
| Unrelated sub-skills | untouched. A failed two-step check leaves both sides as it was (journey 14). A wrong modelling retention answer does not fail two-step (review probe). |
| Recovery | 2 distinct right answers of **that** sub-skill, alone and outside the check, then a new check 7 days later. Store learner 4b is authoritatively recovered by answers of other kinds, but two-step is still `recovery-required`. That is exposed. |
| Contradicted retention answer | neutral: neither passes nor fails the check (test). |

## The gap in the delayed check

The module's delayed check samples **two-step (`gen:lin:6,17,2`) and modelling (`gen:auleq:2,9,19,11`) only**.

- After being shown, **both sides and brackets can never pass a delayed check** through the module's own list. They stay `retention-due`; `sampledByModuleCheck: false`.
- The pool's retention phase (`fromPool(m, "retention")`) can serve them later, if the engine asks more retention questions.
- Their `need` stays the competency's `RETENTION_CHECK` (2). It is not lowered.
- Meanwhile the authoritative retention for the competency reads `passed` (journey 13; store learner 2a).

E1 reports this gap and does not change the scheduler.
