# 4. Learner journeys

## Setup

- **What runs:** every journey runs through the real journey controller: `SliceFlow` → `SliceSession` → `moduleState` / recovery. That includes the trusted grader, `readRecords` and the evidence engine.
- **What is scripted:** only three things:
  - the learner's answers;
  - when the learner returns (`flow.later(days)`);
  - for H04 and H16, an educator acknowledgement given as server data.
- **Learners:**
  - `forgot-divide` makes the forgot-divide error wherever it applies, and is wrong elsewhere.
  - `forgot-divide until day 2` is right from day 2.
  - `strong` is right throughout.
- **Policy:** the default (re-entry after 2 days, 2 self-service re-entries, acknowledgement valid for 14 days).

**Tests:** `frontend/src/journey/handover.test.ts` contains H01–H16, a policy test and R1–R4 (the independent review's fixes). **21/21 pass** (doc 6).

**Traces:** `scripts/h1-journeys.mts` writes the machine-readable traces below. The final-run copy is in `traces/h1-journeys.json`.

## Journeys and checks

| # | Journey | What is checked (assertions) | Result |
|---|---|---|---|
| H01 | Initial hand-over | Ends in a pause with route `wait`, eligible exactly 2 days after the pause began. The note states the exact date, time and zone. No claim. Provenance is clean. | pass |
| H02 | Return before eligibility (after 1 day) | Pause again, nothing offered, the exact opening time restated. | pass |
| H03 | Return after eligibility (after 2 days) | Exactly one question: phase `reentry`, activity `diagnostic`, context `reentry:<competency>`. Graded by the trusted grader. Never seen before, readable or not. | pass |
| H04 | Teacher acknowledgement | The acknowledgement comes from server data, from an educator, recorded while the competency was paused. It opens re-entry after 1 day. It is recorded as `openedBy: "educator"` and uses no self-service re-entry. | pass |
| H05 | Missing acknowledgement | After 2 failed self-service re-entries: `needs-teacher`, and nothing is offered on later returns. The note says a teacher must go through it. | pass |
| H06 | Successful recheck | The re-entry answer is right and the module moves on. Replaying the records up to the re-entry answer shows **no** claim from the re-entry itself. The later claim comes only from the ordinary evidence rule. | pass |
| H07 | Failed recheck | A new pause. All earlier failures are kept (count only grows). One self-service re-entry used. | pass |
| H08 | Repeated difficulty, 6 returns | Exactly 2 self-service re-entries, then `needs-teacher`. Each re-entry is one question. | pass |
| H09 | Progress in another competency | The pause names what to carry on with (`continueWith`). `linear-intro` progresses while `linear-equations` stays paused and untouched. | pass |
| H10 | Restart during pause | Rebuilt from stored events (`withDecisions` → JSON → `fromEvents`): the same hand-over state, the same next phase and route, and the same flow stage. The Django round trip is in doc 6. | pass |
| H11 | Return on the displayed retention date | Asia/Kolkata. Returns at 09:00 local on the shown date, before the due time: not open, and told the exact opening time. Returns at the instant: the delayed check is offered. | pass |
| H12 | Just before and at the due instant | 1 minute before: `scheduled`, not open. At the instant: `due`, open. | pass |
| H13 | Midnight and time-zone boundaries | An instant at Kolkata midnight, the day after US daylight saving began. Its local date differs per zone (10 Mar / 9 Mar), and the label is exact in each zone (GMT+5:30, UTC, PDT, PST). It opens at the same instant in every zone. Local midnight of the shown day is **not** open (there is no day-start rule). | pass |
| H14 | Forged acknowledgement | None of these opens anything: a learner record `handover_ack`, a `by: parent`, another competency, a future one, one from before the pause. The server side is in `test_handover.py` (doc 6). | pass |
| H15 | Historical paused events | Events stored before handover@1, replayed 60 days later: `reentry` / `reentry-self`, and the stored events are byte-identical afterwards. | pass |
| H16 | Bounded retry exhaustion | 2 self-service re-entries, then 10 daily returns with nothing offered. One acknowledgement opens exactly one re-entry, then `needs-teacher` again. | pass |
| policy | Configurable | `setHandoverPolicy({reentryDays:3, selfLimit:1})` is followed and recorded in the state. Invalid values are rejected. | pass |
| R1 | Unreadable re-entry answers | An unreadable answer uses up that re-entry (no unbounded loop). | pass |
| R2 | Old acknowledgement | An acknowledgement from before the pause neither opens it nor relabels a self-service re-entry. | pass |
| R3 | After an unreadable-answer pause | The re-entry question is not the unreadable question. | pass |
| R4 | Later answers elsewhere | A later answer elsewhere in the competency does not cancel a valid acknowledgement. | pass |

## Browser

`e2e/h1-handover.test.mjs` uses the built slice app with `?tz=Asia/Kolkata&later=2,2`, on desktop and mobile. **4/4 pass.**

| Screenshot | Shows |
|---|---|
| `screenshots/h1-pause-{desktop,mobile}.png` | The pause message, with its way back: "You can try this again on your own from Sat 3 Oct 2026, 14:43 (GMT+5:30, Asia/Kolkata)." |
| `screenshots/h1-reentry-{desktop,mobile}.png` | The return after 2 days: "Welcome back. One question on your own first…", with one multiple-choice question and no hint. |
| `screenshots/h1-after-reentry-{desktop,mobile}.png` | After a wrong re-entry answer: paused again, with the next opening time. |
| `screenshots/h1-retention-time-{desktop,mobile}.png` | A strong learner: "Your delayed check opens …, (GMT+5:30, Asia/Kolkata)". |

## Traces

In the trace tables:

- **Offered** = the number of items (questions and explanation steps) offered in the visit.
- **Route** = the hand-over route after the visit, as (self-service re-entries left / re-entries used).

### H01 initial hand-over

Learner: forgot-divide (never learns). Visits 1, visits with nothing offered 0, questions 10, re-entry questions 0.

| Visit | At (UTC) | Offered | Re-entry answers | Ended | Hand-over route (self left / used) | Status / delayed check |
|---|---|---|---|---|---|---|
| 1 | 2026-10-01T09:13 | 68 | — | pause | wait (2 / 0) | exposure / none |

Last note: You can try this again on your own from Sat 3 Oct 2026, 09:13 (UTC, UTC).

### H02 return before eligibility (1 day)

Learner: forgot-divide (never learns). Visits 2, visits with nothing offered 1, questions 10, re-entry questions 0.

| Visit | At (UTC) | Offered | Re-entry answers | Ended | Hand-over route (self left / used) | Status / delayed check |
|---|---|---|---|---|---|---|
| 1 | 2026-10-01T09:13 | 68 | — | pause | wait (2 / 0) | exposure / none |
| 2 | 2026-10-02T09:13 | 0 | — | pause | wait (2 / 0) | exposure / none |

Last note: You can try this again on your own from Sat 3 Oct 2026, 09:13 (UTC, UTC).

### H03 return after eligibility (2 days)

Learner: forgot-divide (never learns). Visits 2, visits with nothing offered 0, questions 11, re-entry questions 1.

| Visit | At (UTC) | Offered | Re-entry answers | Ended | Hand-over route (self left / used) | Status / delayed check |
|---|---|---|---|---|---|---|
| 1 | 2026-10-01T09:13 | 68 | — | pause | wait (2 / 0) | exposure / none |
| 2 | 2026-10-03T09:14 | 1 | gen:lin:5,6,4:mc: incorrect | pause | wait (1 / 1) | exposure / none |

Last note: You can try this again on your own from Mon 5 Oct 2026, 09:14 (UTC, UTC).

### H04 educator acknowledgement, return after 1 day

Learner: forgot-divide (never learns). Visits 2, visits with nothing offered 0, questions 11, re-entry questions 1.

| Visit | At (UTC) | Offered | Re-entry answers | Ended | Hand-over route (self left / used) | Status / delayed check |
|---|---|---|---|---|---|---|
| 1 | 2026-10-01T09:13 | 68 | — | pause | wait (2 / 0) | exposure / none |
| 2 | 2026-10-02T09:14 | 1 | gen:lin:5,6,4:mc: incorrect | pause | wait (2 / 1) | exposure / none |

Last note: You can try this again on your own from Sun 4 Oct 2026, 09:14 (UTC, UTC).

### H05 no acknowledgement, returns 2,2,2,5

Learner: forgot-divide (never learns). Visits 5, visits with nothing offered 2, questions 12, re-entry questions 2.

| Visit | At (UTC) | Offered | Re-entry answers | Ended | Hand-over route (self left / used) | Status / delayed check |
|---|---|---|---|---|---|---|
| 1 | 2026-10-01T09:13 | 68 | — | pause | wait (2 / 0) | exposure / none |
| 2 | 2026-10-03T09:14 | 1 | gen:lin:5,6,4:mc: incorrect | pause | wait (1 / 1) | exposure / none |
| 3 | 2026-10-05T09:15 | 1 | gen:lin:3,3,5: incorrect | pause | needs-teacher (0 / 2) | exposure / none |
| 4 | 2026-10-07T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 5 | 2026-10-12T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |

Last note: This opens again once a teacher has gone through it with you.

### H06 successful recheck (learns by day 2)

Learner: forgot-divide until day 2. Visits 2, visits with nothing offered 0, questions 32, re-entry questions 1.

| Visit | At (UTC) | Offered | Re-entry answers | Ended | Hand-over route (self left / used) | Status / delayed check |
|---|---|---|---|---|---|---|
| 1 | 2026-10-01T09:13 | 68 | — | pause | wait (2 / 0) | exposure / none |
| 2 | 2026-10-03T09:35 | 22 | gen:lin:5,6,4:mc: correct | done | wait (1 / 1) | transfer / scheduled |

Last note: Your delayed check opens Sat 10 Oct 2026, 09:15 (UTC, UTC).

### H07 failed recheck

Learner: forgot-divide (never learns). Visits 2, visits with nothing offered 0, questions 11, re-entry questions 1.

| Visit | At (UTC) | Offered | Re-entry answers | Ended | Hand-over route (self left / used) | Status / delayed check |
|---|---|---|---|---|---|---|
| 1 | 2026-10-01T09:13 | 68 | — | pause | wait (2 / 0) | exposure / none |
| 2 | 2026-10-03T09:14 | 1 | gen:lin:5,6,4:mc: incorrect | pause | wait (1 / 1) | exposure / none |

Last note: You can try this again on your own from Mon 5 Oct 2026, 09:14 (UTC, UTC).

### H08 repeated difficulty, six returns

Learner: forgot-divide (never learns). Visits 7, visits with nothing offered 4, questions 12, re-entry questions 2.

| Visit | At (UTC) | Offered | Re-entry answers | Ended | Hand-over route (self left / used) | Status / delayed check |
|---|---|---|---|---|---|---|
| 1 | 2026-10-01T09:13 | 68 | — | pause | wait (2 / 0) | exposure / none |
| 2 | 2026-10-03T09:14 | 1 | gen:lin:5,6,4:mc: incorrect | pause | wait (1 / 1) | exposure / none |
| 3 | 2026-10-05T09:15 | 1 | gen:lin:3,3,5: incorrect | pause | needs-teacher (0 / 2) | exposure / none |
| 4 | 2026-10-07T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 5 | 2026-10-09T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 6 | 2026-10-11T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 7 | 2026-10-13T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |

Last note: This opens again once a teacher has gone through it with you.

### H16 retry exhaustion, then an acknowledgement

Learner: forgot-divide (never learns). Visits 16, visits with nothing offered 12, questions 13, re-entry questions 3.

| Visit | At (UTC) | Offered | Re-entry answers | Ended | Hand-over route (self left / used) | Status / delayed check |
|---|---|---|---|---|---|---|
| 1 | 2026-10-01T09:13 | 68 | — | pause | wait (2 / 0) | exposure / none |
| 2 | 2026-10-03T09:14 | 1 | gen:lin:5,6,4:mc: incorrect | pause | wait (1 / 1) | exposure / none |
| 3 | 2026-10-05T09:15 | 1 | gen:lin:3,3,5: incorrect | pause | needs-teacher (0 / 2) | exposure / none |
| 4 | 2026-10-07T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 5 | 2026-10-08T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 6 | 2026-10-09T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 7 | 2026-10-10T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 8 | 2026-10-11T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 9 | 2026-10-12T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 10 | 2026-10-13T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 11 | 2026-10-14T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 12 | 2026-10-15T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 13 | 2026-10-16T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 14 | 2026-10-17T09:15 | 0 | — | pause | needs-teacher (0 / 2) | exposure / none |
| 15 | 2026-10-18T09:16 | 1 | gen:lin:8,13,8:mc: incorrect | pause | needs-teacher (0 / 3) | exposure / none |
| 16 | 2026-10-21T09:16 | 0 | — | pause | needs-teacher (0 / 3) | exposure / none |

Last note: This opens again once a teacher has gone through it with you.

### H11–H13 retention timing

Opening instant 2026-10-08T09:02:00.000Z.

| Zone | Shown |
|---|---|
| UTC | Thu 8 Oct 2026, 09:02 (UTC, UTC) |
| Asia/Kolkata | Thu 8 Oct 2026, 14:32 (GMT+5:30, Asia/Kolkata) |
| America/Los_Angeles | Thu 8 Oct 2026, 02:02 (PDT, America/Los_Angeles) |
| Pacific/Auckland | Thu 8 Oct 2026, 22:02 (GMT+13, Pacific/Auckland) |

| Learner returns at (UTC) | Topic fact (Asia/Kolkata) | Offered |
|---|---|---|
| 2026-10-07T09:02:00 | Opens Thu 8 Oct 2026, 14:32 (GMT+5:30, Asia/Kolkata) | nothing |
| 2026-10-08T09:01:00 | Opens Thu 8 Oct 2026, 14:32 (GMT+5:30, Asia/Kolkata) | nothing |
| 2026-10-08T09:02:00 | Due now | retention:gen:lin:6,17,2 retention:gen:auleq:2,9,19,11 |

