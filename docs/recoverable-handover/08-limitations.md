# 8. Limitations

## Open issues

| # | Limitation | Effect | Follow-up |
|---|---|---|---|
| 1 | **More learners reach false claims.** Re-entry gives stalled learners more chances to answer, and the authoritative status rule is unchanged (any two independent right answers). | S2 cohort C (negative controls) went from 21 to 30 journeys with a false claim. Re-entry itself grants nothing (H06). | Gate claims on sub-skill evidence (E1 shadow projection, S2 recommendation 1) before activating H1. It could also require the re-entry family to be right before any claim. |
| 2 | **`needs-teacher` is terminal without a teacher.** After two failed self-service rechecks, only an educator's acknowledgement reopens the competency. Parents cannot acknowledge, because the parent account is the learner's account. | S2 has no teacher actor, so 336 journeys end waiting. Families without a linked educator wait indefinitely on that competency, though other competencies stay open. | A separate parent role with a distinct credential, and a teacher actor in the simulator. A product decision is needed on a timed third self-service recheck. |
| 3 | **S2's port reads the date only.** The frozen S2 learner arrives at 09:00 UTC on the shown date. | About 44% of on-date returns are still early in S2, by construction. The product now shows the time. | A time-reading S2 port (a new experiment, not a change to the frozen one). |
| 4 | **The server does not check re-entry eligibility.** It accepts a `reentry:` context on a diagnostic attempt without checking that the hand-over is open. | A learner (or modified client) can only use up their own re-entries early. It gains no credit and no mastery, since grading stays trusted and status comes from the ordinary rule. | Mirror `handoverState` on the server if re-entries become part of an audited record. |
| 5 | **Device clock.** Acknowledgements are matched against the client's clock. | One recorded "in the future" relative to a slow device clock is ignored until the device catches up. | Use the server's time on read. |
| 6 | **`no-fresh-question` cannot be lifted.** A pause caused by running out of unused questions cannot be lifted by re-entry or acknowledgement; the message says so. | That is a content gap, not a learner state. | Author more items, or allow a teacher-chosen repeat. |
| 7 | **Other date-only displays.** `mathematics/chapter` (`Main.tsx` 669, 679) and `mathematics/unit` (`Unit.tsx` 91) still show some retention dates without a time. `mathematics/journey` (`Main.tsx` 359) shows the time but not the zone. | These are the older chapter, unit and programme journeys, not the learn and topic screens that H1 changed. | Move them to `formatInstant` when those journeys are next touched. |
| 8 | **Acknowledgement UI.** There is an educator endpoint, but no educator screen for it yet. The tests use the API. | A teacher cannot acknowledge from the app. | Add a button to the educator marking view. |
| 9 | **Policy defaults are not calibrated.** The values (2 days, 2 rechecks, 14-day acknowledgement validity) are chosen, not calibrated. | They are configurable (`setHandoverPolicy`) and recorded in the hand-over state. | Calibrate with real usage. |
| 10 | **Cosmetic.** For the UTC zone the label repeats the name: "(UTC, UTC)". | Unambiguous, but untidy. | Show the zone once when its short name equals the zone id. |
| 11 | **Cost.** H1 adds 7–11% more questions and 21–36% more visits in S2. | — | — |

## Not changed

These were not changed, and are deliberately out of scope:

- the authoritative mastery rule;
- due instants (`RETENTION_DELAY`, 7 days);
- trusted grading;
- the recovery planner;
- the frozen S2 profiles and port.
