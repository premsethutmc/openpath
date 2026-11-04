# H1: Recoverable hand-over and return journey

## Branch and decision

- **Branch:** `feat/recoverable-learning-handover`, from `integration/d1-e1-subskill-evidence` (`cd40422`).
- **Status:** not merged, deployed or activated.
- **Decision: INCONCLUSIVE.** The hand-over mechanics are safe, bounded and tested. But making stalled learners re-enter gives the unchanged authoritative status rule more chances to make false claims, so the outcome is worse for negative controls. See "Decision" below.

## Documents

| Doc | Contents |
|---|---|
| [01](01-current-handover-trace.md) | The hand-over before H1: trigger, what the learner sees, acknowledgement, re-entry, expiry, planner and restart, and why S2 stalled (a pause derived from records that never changes, and no record that could change it). |
| [02](02-state-machine.md) | `handover@1`: wait, then self-service re-entry after 2 days (at most 2), then needs-teacher. An educator acknowledgement opens one more re-entry. The re-entry is one fresh question answered alone; it is never a claim. |
| [03](03-return-date-contract.md) | `retention-display@1`: the due instant is unchanged. It opens at that exact instant and is always shown with date, time and time zone. Why the day-start option was rejected. |
| [04](04-learner-journeys.md) | The 16 required journeys and the review fixes: real controller and persistence, traces, browser screenshots. |
| [05](05-s2-comparison.md) | S2 frozen-profile replay: baseline against H1. |
| [06](06-regressions.md) | The full regression, compared with the D1+E1 final run. |
| [07](07-independent-review.md) | The independent review: 2 blockers, 5 should-fix and 4 minor items, all resolved or documented. |
| [08](08-limitations.md) | Limitations and follow-ups. |

## Result

### Safety requirements

| Requirement | Result |
|---|---|
| No automatic mastery from re-entry | Met (H06, R1). |
| No erasure of earlier failures | Met (H07, H15). |
| No duplicate retention events | Met (R5). |
| Trusted grading not bypassed | Met. |
| No forged teacher sign-off | Server-only, educator with an active share, append-only (H14, `test_handover.py`). |
| Bounded retries | 2 self-service rechecks plus 1 per acknowledgement (H08, H16, R1). |
| Deterministic replay and restart | Met (H10, H15, Django round trip). |

### S2 comparison

- **Permanent stalls:** 346 → 0.
- **Returns after a pause with something to do:** about 15% → about 47%.
- **Remaining stalls:** all are bounded `needs-teacher` waits. S2 has no teacher.
- **Re-entry is not success:** 74% of re-entry answers are wrong, and only 8 more journeys end with the delayed check passed.

### Return time

- The due instant is not moved.
- The exact date, time and zone are shown wherever the delayed check or re-entry opening is shown.
- Midnight, daylight-saving and zone boundaries are tested.
- S2's frozen date-only port still arrives early about 44% of the time, by construction (doc 5).

### Regression

There is no change from D1+E1 apart from the added tests. One introduced type error was fixed (doc 6).

## Decision

**INCONCLUSIVE.**

### Why not PASS

- Re-entry itself grants nothing.
- But it gives previously stalled learners more answers, and under the unchanged rule (any two independent right answers) more of them reach claims they have not earned.
- In S2's negative-control cohort C, journeys with a false authoritative claim rose from 21 to 30. The first claim was already false in 11/31 journeys, against 1/21 before.

### Why not BLOCK

- Every H1 safety requirement holds.
- The extra false claims come from the existing status rule, which the E1 sub-skill gate is meant to replace.

### Before activation

- Gate authoritative claims on sub-skill evidence (E1 / S2 recommendation 1).
- Add an educator acknowledgement screen.
- Rerun S2 with a teacher actor and a port that reads the time.
