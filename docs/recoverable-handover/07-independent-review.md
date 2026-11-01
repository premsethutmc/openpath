# 7. Independent review

## Setup

- **Reviewer:** a separate agent with read-only access and no stake in the code. It read the code cold, against the intended behaviour, and probed scenarios with its own scripts against the real engine.
- **Code reviewed:** `5d8b05c` / `4cef9fb`.
- **Fixes:** all in `682ba3e`. Each blocker and should-fix item has a test.
- **Verdict:** two blockers; **not ready to merge until items 1–4 are fixed.**

## Findings and resolution

| # | Severity | Finding | Resolution | Test |
|---|---|---|---|---|
| 1 | **blocker** | An unreadable answer to a re-entry question used no re-entry: it was stored as an unresolved submission with no context. Re-entry repeated forever, the same question each time. | `records.ts` keeps `context` on unresolved submissions. A re-entry is used by any answer to its question, readable or not. | R1 |
| 2 | **blocker** | An acknowledgement from before the pause was matched to a later self-service re-entry. That relabelled the re-entry "educator" and restored a self-service token. | An acknowledgement counts only if the competency **was paused when it was recorded**, worked out from the records before it (`pausedAt`). It must also be recorded after the previous re-entry, before the re-entry it opens, and within `ACK_VALID_DAYS`. | R2, H14 |
| 3 | should-fix | After an unreadable-answer pause, the re-entry question could be the unreadable question itself. | A re-entry question is never one answered before, readable or not. A fresh pool question is drawn if needed. | R3, H03 |
| 4 | should-fix | Any later answer in the competency cancelled a valid acknowledgement, because the match was tied to `since`. | Validity is no longer tied to later records: it is checked when recorded (paused then), after the last re-entry, and within its validity. | R4 |
| 5 | should-fix | A delayed-check text still showed a date without a time, in the module reason and on the curriculum page. | The module reason no longer carries a date. The curriculum page uses `formatInstant`. Older date-only displays in other journeys (`mathematics/chapter`, `mathematics/unit`) are listed in doc 8. | H11, H13 |
| 6 | should-fix | Recovery escalations did not say when the paused supporting skill opens again. | `RecoveryState.handover` carries the skill's hand-over. The recovery view shows its note. | review item; covered by type checks |
| 7 | should-fix | A re-entry question inside another problem's recovery was presented as teaching and used up a self-service re-entry. | Inside recovery, a re-entering skill is treated as paused (escalate with its hand-over). The re-entry happens only in the skill's own module. | journeys |
| 8 | minor | A learner id that is not a UUID returned 500. | It now returns 400. A revoked share is also tested. | `test_handover.py` |
| 9 | minor | An acknowledgement is hidden until the device clock reaches its server time. | Kept (no future acknowledgement opens anything). Documented. | H14 |
| 10 | minor | `no-fresh-question` cannot be lifted by a teacher. | The message now says so plainly. Doc 8 lists it as a content gap. | — |
| 11 | minor | The server accepts a `reentry:` context but does not check eligibility. | Documented: a learner can only use up their own re-entries this way. It gains nothing (no credit, no mastery). | — |
| 12 | note | Retention timing is consistent. The client's check is stricter than the server's. Formatting is deterministic. | No change. | H12, H13 |

## Test-quality points

| Point raised | Resolution |
|---|---|
| H06 asserted only inside a condition. | H06 now asserts unconditionally that re-entry alone claims nothing, by replaying the records up to the re-entry answer. |
| H03's freshness check was too narrow. | H03 now checks all earlier answers, readable or not. |
| H14's learner-record case could not fail. | H14 now also includes an acknowledgement from before the pause. |
| Items 1–4 had no tests. | R1–R4 added. |
