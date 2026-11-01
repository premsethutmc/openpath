# 5. S2 comparison

## Method

- **Learners:** S2's frozen synthetic learner profiles, seeds, return policy and port, unchanged: cohort A (300), B (120) and C (80, negative controls).
- **Return policy:** a learner comes back on the shown date at 09:00 UTC. After a "teacher or parent" summary they come back after +2 days; otherwise after +1 day. A journey "stalls" after 3 visits in a row with nothing offered.
- **Baseline:** S2 at `3d03aee` on `cd40422`'s engine.
- **H1:** the same S2 harness merged with `2cf074e`, in a throw-away detached worktree. Nothing in S2's branch was changed or pushed.
- **Outputs:**
  - S2's own `metrics-{A,B,C}.json`.
  - Hand-over metrics from S2's traces, computed by `s2-eval/analyze.mjs`.
- **Two H1 runs:**
  - **untargeted:** re-entry question = an unanswered diagnostic or a fresh pool check (`5d8b05c`+`682ba3e`).
  - **targeted:** re-entry targets the family of the latest wrong answer given alone (`2cf074e`, the shipped behaviour).
  - The tables report the **targeted** run unless marked otherwise.
- **Files:** everything is in `s2-eval/`.

In the hand-over metrics, a **return after a pause** is a visit that follows one whose summary recommended a teacher or parent. An **action** means at least one question or explanation was offered on that visit.

## Hand-over and stalls

| Metric | A base | A H1 | B base | B H1 | C base | C H1 |
|---|---|---|---|---|---|---|
| Journeys ending stalled | 191 | 183 | 76 | 75 | 79 | 78 |
| … stalled with no route back (permanent stall) | **191** | **0** | **76** | **0** | **79** | **0** |
| … stalled waiting for a teacher (`needs-teacher`, both self-service re-entries used) | 0 | 183 | 0 | 75 | 0 | 78 |
| Journeys ending with the delayed check passed | 108 | 114 | 44 | 45 | 1 | 2 |
| Returns after a pause | 780 | 1074 | 310 | 461 | 289 | 442 |
| … with an action offered | 118 (15%) | 505 (47%) | 50 (16%) | 225 (49%) | 33 (11%) | 201 (45%) |
| Journeys with a re-entry | 0 | 211 | 0 | 82 | 0 | 80 |
| Re-entry questions (right / wrong) | 0 | 398 (98 / 300) | 0 | 159 (53 / 106) | 0 | 158 (37 / 121) |
| Total questions | 6486 | 6969 (+7.4%) | 2540 | 2800 (+10.2%) | 1830 | 2031 (+11.0%) |
| Total visits (sessions) | 1352 | 1640 (+21%) | 532 | 686 (+29%) | 423 | 576 (+36%) |
| Repeated identical explanation | 17 | 14 | 12 | 13 | 3 | 3 |
| S2 repeated ineffective teaching | 5/22 | 5/20 | 3/13 | 4/14 | 4/5 | 4/5 |

### What changed

- **Permanent stalls are gone.** Every stall now ends in `needs-teacher`: the learner has used both self-service rechecks and still answers wrong. The learner is told so, other skills stay open, and an educator's acknowledgement reopens one recheck.
- **The remaining stalls are real.** S2 has no teacher actor, so no acknowledgement ever arrives. In S2 these stalls are the bounded end of an unsuccessful journey. In the product they are a hand-over that waits for a person (doc 8).
- **No loops.** Each paused competency gets at most 2 self-service re-entries, and each re-entry is one question. No journey loops: one extra journey reaches the visit limit, which is S2's own cap.

### Re-entry is not success

**Re-entry is not counted as successful teaching.** Of 715 re-entry questions across all cohorts, 527 (74%) were answered wrong. The extra journeys that end with the delayed check passed are few: +6 in A, +1 in B and +1 in C.

## Mastery after re-entry

| Metric (S2's definition) | A base | A H1 | B base | B H1 | C base | C H1 |
|---|---|---|---|---|---|---|
| False authoritative claims / claims | 69/386 | 45/348 | 29/132 | 32/138 | 21/41 | **37/57** |
| Journeys with a false authoritative claim | 30/124 | 31/125 | 16/50 | 18/52 | 21/21 | **30/31** |
| First claim already false | 30/124 | 31/125 | 16/50 | 18/52 | 1/21 | **11/31** |
| Claims on visits after a re-entry (false) — untargeted run | — | 99 (61) | — | 52 (38) | — | 5 (5) |
| Claims on visits after a re-entry (false) — targeted run | — | 69 (37) | — | 31 (26) | — | 18 (18) |
| Shadow false claims | 123/1241 | 140/1238 | 59/494 | 103/558 | 119/210 | 138/229 |
| Incorrect answer with verified working | 0 | 0 | 0 | 0 | 0 | 0 |

### Re-entry itself grants nothing

- No status is ever raised by the re-entry answer itself. H06 replays the records up to the re-entry answer and checks this.
- Earlier failures are kept.
- Retention events are not duplicated.

### More learners reach false claims

- **The cause:** re-entry gives a learner who used to stall forever more chances to answer. The status rule is unchanged (D1+E1, authoritative), and under it any two independent right answers in the competency can make a claim. So more learners reach a claim that their hidden ability does not support.
- **The clearest case is cohort C** (negative controls who cannot learn the skill). It went from 21 to 30 journeys with a false claim, and 10 more of them were already false at the first claim.
- **In cohort A,** the false-claim rate per claim fell (17.9% → 12.9%), but journeys with a false claim are flat (30 → 31).
- **Cause, not new behaviour:** this is the existing over-generalising status rule (E1/S2 recommendation 1: gate claims on sub-skill evidence) meeting more opportunities. It is not a new way to gain mastery. It is still a real safety regression in outcome terms, and it is why the decision is not PASS.
- **Targeting:** asking the kind that went wrong (targeted) cut the false claims after a re-entry in A (61 → 37) and B (38 → 26). It raised them in C (5 → 18), because more C learners pass a targeted item by chance and move on.

## Delayed check on return

| Metric | A base | A H1 | B base | B H1 | C base | C H1 |
|---|---|---|---|---|---|---|
| Arrived on the shown date but the check was not yet due (S2) | 214/468 (46%) | 203/457 (44%) | 83/180 | 100/215 | 50/101 | 64/129 |
| Delayed checks completed / failed | 238 / 146 | 232 / 140 | 89 / 53 | 106 / 70 | 51 / 50 | 65 / 63 |
| Shown competency with no opening time | 0 | 0 | 0 | 0 | 0 | 0 |

### Why this metric does not move

- **The frozen port:** S2's frozen port reads only the **date** of the delayed check and arrives at 09:00 UTC. The opening instant is the time of the first visit plus 7 days.
- **The frozen learner:** so a learner whose first visit was after 09:00 UTC still arrives too early. That behaviour is frozen, so this metric cannot move unless the due instant moves.
- **No due date was moved.** H1 chose the exact-time contract (doc 3) and did **not** move any due date.

### What the product now shows

- The learner sees the date, time and time zone everywhere the opening is shown. This is tested by H11–H13 and by the browser test.
- A learner who reads the time arrives on time. A learner who arrives early is told the exact opening time instead of a bare date.

A follow-up S2 port that reads the time would measure this. It is listed in doc 8.

## Summary

| Question | Answer |
|---|---|
| Permanent hand-over stalls | 346 → 0 (all cohorts). Remaining stalls are bounded and wait for a teacher, who S2 does not simulate. |
| Successful re-entry | 188 of 715 re-entry answers right. A few more journeys reach the delayed check passed (+8 in all). |
| Repeated ineffective remediation | Unchanged: repeated explanations 32 → 30, S2 repeated-ineffective about the same. Rechecks are bounded at 2 plus 1 per acknowledgement. |
| Actions available on return after a pause | 15% → 47% (A), 16% → 49% (B), 11% → 45% (C). |
| Delayed-check accessibility | Due instants unchanged. Every shown opening has an exact time and zone. S2's date-only arrivals are still about 44% early, by construction. |
| False mastery after re-entry | Not granted by re-entry. But more learners reach claims under the unchanged status rule: C journeys with a false claim 21 → 30. |
| Additional questions and sessions | +7–11% questions, +21–36% visits. |
