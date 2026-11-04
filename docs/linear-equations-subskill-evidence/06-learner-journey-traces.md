| # | Scenario | Authoritative (status / verified / retention) | E1 sub-skills (attempted only) | Discrepancy | Unknown |
|---|---|---|---|---|---|
| 1 | one-step success only | not_started / false / none | one-step: independently-demonstrated | none | — |
| 2 | two-step success only | independent / false / scheduled | two-step: independently-demonstrated | both-sides: not-attempted, brackets: not-attempted | — |
| 3 | both-sides success only | independent / false / scheduled | both-sides: independently-demonstrated | two-step: not-attempted, brackets: not-attempted | — |
| 4 | bracket-equation success only | independent / false / scheduled | brackets: independently-demonstrated | two-step: not-attempted, both-sides: not-attempted | — |
| 5 | mixed-family success (two-step, both sides, brackets) | independent / false / scheduled | two-step: independently-demonstrated; both-sides: independently-demonstrated; brackets: independently-demonstrated | none | — |
| 6 | repeated two-step success, nothing on other kinds | independent / false / scheduled | two-step: independently-demonstrated | both-sides: not-attempted, brackets: not-attempted | — |
| 7 | correct final answer with invalid working | independent / false / scheduled | two-step: insufficient-evidence (method contradicted) | two-step: insufficient-evidence, both-sides: not-attempted, brackets: not-attempted | — |
| 8 | correct bare answer without method evidence | independent / false / scheduled | two-step: independently-demonstrated | both-sides: not-attempted, brackets: not-attempted | — |
| 9 | unsupported mathematical working | independent / false / scheduled | two-step: independently-demonstrated | both-sides: not-attempted, brackets: not-attempted | — |
| 10 | assisted success followed by independent failure | guided / false / none | two-step: developing | none | — |
| 11 | successful independent recheck | independent / false / scheduled | two-step: independently-demonstrated | both-sides: not-attempted, brackets: not-attempted | — |
| 12 | failed independent recheck | independent / false / scheduled | two-step: independently-demonstrated | both-sides: not-attempted, brackets: not-attempted | — |
| 13 | successful delayed retention (module check: two-step + modelling) | independent / false / passed | two-step: independently-demonstrated; both-sides: retention-due; modelling: independently-demonstrated | both-sides: retention-due, brackets: not-attempted | — |
| 14 | failed delayed retention with recovery | independent / false / scheduled | two-step: independently-demonstrated; both-sides: retention-due; modelling: insufficient-evidence | both-sides: retention-due, brackets: not-attempted | — |
| 15 | restart and deterministic replay | independent / false / scheduled | two-step: independently-demonstrated; both-sides: independently-demonstrated; brackets: independently-demonstrated; modelling: independently-demonstrated | none | — |
| 16 | historical events with missing family metadata | independent / false / scheduled | two-step: independently-demonstrated | both-sides: not-attempted, brackets: not-attempted | excluded-by-existing-reader ×2 |
| 17 | unknown or unmapped question family (meet) | independent / false / scheduled | — | two-step: not-attempted, both-sides: not-attempted, brackets: not-attempted | unmapped-family ×3 |

## Notes per journey

- **1.** One-step answers are prerequisite-competency evidence. The authoritative linear-equations state stays `not_started`; linear-intro's own state is unaffected.
- **5.** All three solving kinds are shown, so there is no discrepancy. The modelling sub-skill is not attempted, and it is not one of the core solving sub-skills.
- **7.** Every answer is right by the trusted credit, but the working has a false step (`ax = c + b`). The method is `contradicted` and the sub-skill is not shown. The authoritative state counts the answers (`independent`); that is exposed.
- **8.** A bare `x = 11` is right but gives no method evidence (`no-method-evidence` ×3). The sub-skill is shown by answers only, and `method: not-established`.
- **9.** Working written as `ax + b − b = c − b` is not registered by the authority. It is unsupported, never a false step, so the method stays `not-established`.
- **10.** Three right answers with a hint, then two wrong alone: `developing`, with assisted right = 3 and independent right = 0. Authoritative: `guided`.
- **11, 12.** The recheck outcome is recorded. A single failed recheck after being shown does not undo it (status@2: two of the last three).
- **13.** The module's delayed check (one two-step and one modelling question) passes those two sub-skills. Both sides, shown earlier, is never sampled and stays **retention-due**, while the authoritative retention reads `passed`.
- **14.** A failed two-step check gives `recovery-required`, with `everDemonstrated` and the failed cycle kept (`beforeRecovery` in the JSON). Both sides is not invalidated. Two fresh two-step answers alone recover it, and the failed cycle stays in the history.
- **15.** The result is identical after `fromEvents` (restart) and under reversed store order.
- **16.** Two stored attempts with ids the reader does not know (`lin-legacy-0007`, `gen:linold:2,5,3`) are reported as `excluded-by-existing-reader` and credited to nothing. The existing reader also ignores them.
- **17.** `meet` answers count for the competency (authoritative `independent`) but for no sub-skill (`unmapped-family` ×3).
