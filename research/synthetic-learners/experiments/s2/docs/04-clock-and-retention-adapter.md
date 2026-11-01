# 4. Simulation clock and retention adapter

- **Clock.** S1's `SimClock`: deterministic, forward-only, never the real clock. OpenPath's session clock (`SliceSession.now`) is advanced by the same number of days through `SliceFlow.later` whenever the learner comes back. OpenPath adds 60 s per record itself.
- **The due date the learner can see.** `delayedCheckFact(evidence)` is the topic page's "delayed check" fact (`frontend/src/year/Main.tsx:593`), with the same rule and the same granularity: `Not yet`, a **date** (no time of day) when the check is scheduled, `Due now`, `Passed` or `Missed`. This is OpenPath's own scheduling output (`SkillEvidence.retentionDueAt`, retention@2). Nothing was invented, and the learner is given nothing finer than the page shows.
- **Return policy.** Doc 1.

## Scheduling behaviours checked

These are the failure cases plus the experiment traces.

| Behaviour | Where |
|---|---|
| due-date creation | case 14; every journey's `evidence.retentionDueAt` |
| return on the scheduled date | the return policy; the `arrivedOnShownDateButCheckNotYetDue` metric |
| successful retention | `checksCompleted` / `checksFailed`; S001 journeys end "retention-passed" |
| failed retention | case 14; `checksFailed` |
| recovery | cases 14 and 15; `recoveryTargeting`, `crossFamilyRecovery` |
| repeated forgetting | cohort C03 and S006 (several failed cycles in one history) |
| no retention scheduled | `shownButNoDueDate` |
| retention questions that omit sub-skills | `shownSubSkillNeverSampled`, `retentionQuestionsByKind` |

**Missing scheduling interface (product gap).** OpenPath's due **instant**, `independentAt` + 7 days to the minute, is not shown to the learner, only its date. A learner who comes back on the shown date, before the due minute, is told nothing about the check, and the visit offers nothing for this skill. See the metric `arrivedOnShownDateButCheckNotYetDue`.
