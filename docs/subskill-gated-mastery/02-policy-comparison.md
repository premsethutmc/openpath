# Policy comparison: existing (authoritative) vs proposed (shadow)

The same stored events are read by both policies: `compareMastery`, in E1's canonical order.

| Question | Existing `skillEvidence` (authoritative, unchanged) | Proposed `subskill-gated-mastery@1` (shadow) |
|---|---|---|
| Unit of evidence | The competency: all its families pooled | Each core sub-skill (E1 mapping), gated on all four |
| Shown alone | 2 distinct right alone in **any** family | 2 distinct right alone in **each** of two-step, both sides, brackets, modelling |
| One wrong after being shown | Tolerated (status@2) | Tolerated per sub-skill (status@2, E1) |
| Repeated failure | 2 of the last 3 wrong undoes it | The same, on that sub-skill |
| Right answer, trusted invalid working | Credited (answer only) | Neutral (contradicted), not credited |
| Bare right answer | Credited | Credited (`gated`). Under `gated-method`, not enough without one verified working. |
| Guessed choice item (`:mc` variant, or `auleq`) | Credited like typed | Credited (`gated`). Not counted under `gated-typed`. |
| Assisted (hints, guided, solution, retry) | Not independent | Not independent (the same rule, `independentAttempt`) |
| Delayed check content | The module's fixed list (two-step + modelling) | Per due sub-skill, fresh items from its own families; `unchecked` when none are available |
| Delayed check failure | Any wrong fails; recovery is competency-wide | Any wrong fails **that sub-skill** (`gated-slip`: tolerates one) |
| Recovery | 2 new right alone in **any** family | 2 new right alone **on the failed sub-skill** |
| Historical achievement | `retentionHistory`; the status can drop to `review` | Kept per sub-skill (`historicalAchievement`), never erased |
| Unknown family | Counts for the competency when the reader admits it (e.g. `meet`) | Never counts; reported as unknown |
| Older authority method verdicts | Not read | Kept historical, never upgraded |

## Disagreements on the 16 journeys (`gated` variant)

The existing status claims competence when it is independent, transfer or verified.

| # | Journey | Existing | Proposed `gated` | Kind of disagreement |
|---|---|---|---|---|
| 1–4 | One sub-skill only | independent | developing (3 sub-skills missing) | Existing claims; proposed does not |
| 5 | All four shown | independent | independently-demonstrated | None |
| 6 | Right answers, invalid two-step working | independent | developing (two-step contradicted) | Existing claims; proposed does not |
| 7 | Bare right answers, all four | independent | independently-demonstrated; `gated-method`: developing | Only under `gated-method` |
| 8 | Assisted only | guided | insufficient-evidence | None (neither claims) |
| 9 | Guessing option A | guided | developing (no claim) | None at the competency level |
| 10 | Brackets check failed | review, recovery (competency) | recovery-required on brackets | Same direction; the proposal names the sub-skill |
| 11 | Recovered on brackets | independent | independently-demonstrated | None |
| 12 | Unrelated success while brackets is in recovery | independent (recovery cleared) | recovery-required on brackets | Existing claims; proposed does not |
| 13 | One wrong in the brackets check | review, recovery | recovery on brackets; `gated-slip`: demonstrated | Variant-dependent |
| 15 | `meet` instead of modelling | independent | developing (modelling missing) | Existing claims; proposed does not |

Variant notes:

- `gated-typed` withholds the competency in journeys 5, 7, 11, 14 and 16. Their modelling evidence is `auleq`, a choice item. This is the over-restriction reported in 04 and 07.
- `gated-slip` leaves brackets `developing` in journeys 10–12. Their check has one wrong answer and too few right answers, so it is incomplete.

The full traces are in 03 and `traces/journeys.json`.
