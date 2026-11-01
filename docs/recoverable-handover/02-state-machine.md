# 2. State-machine changes: `handover@1`

Code: `packages/learning/src/intervention.ts` (`handoverState`, `withHandover`, `setHandoverPolicy`, applied in `moduleState`).

Everything is decided from the records and the time. The engine writes no new record. Replay and restart give the same state.

```
            moduleStep says "pause" (any of the seven causes, or bounded-input@1)
                                   |
                                   v
     +---------------------------- PAUSED (handover@1) ----------------------------+
     | since = the learner's last record for this competency (attempt, unresolved   |
     |         submission or teaching, incl. its micro-skills)                      |
     | route:                                                                       |
     |   reentry-acknowledged  an educator acknowledgement (server), recorded while |
     |                         the competency WAS paused, after the last re-entry,  |
     |                         unused, within ACK_VALID_DAYS (14)                    |
     |   needs-teacher         self-service re-entries used up (SELF_REENTRY_LIMIT) |
     |   reentry-self          now >= since + REENTRY_DAYS (2)                       |
     |   wait                  otherwise (the exact opening time is shown)           |
     +------------------------------------------------------------------------------+
            | reentry-*                                 | wait / needs-teacher
            v                                           v
   REENTRY: one fresh question alone             nothing on this skill; the message says
   (activity "diagnostic",                       when or what opens it, and which skills
    context "reentry:<competency>")              to carry on with (continueWith)
            |
            | answered (trusted grader), readable or not: the re-entry is used
            v
   the ordinary engine decides again:
     - the answer changed the picture -> learning continues (explore / chapter / verify / ...)
     - still paused -> a new PAUSED with since = the re-entry answer
```

## Safety properties (each tested, doc 4)

- **No mastery from re-entry.** The re-entry answer is an ordinary independent answer, graded by the trusted grader. Status still needs `INDEPENDENT_MIN` distinct right answers alone (H06).
- **Nothing is erased.** Earlier failures, attempts and retention history stay (H07, H15).
- **No forged sign-off.**
  - Acknowledgements come only from the server (`readRecords`' fourth argument), never from learner events (H14).
  - Only an educator account to whom the parent has shared the pupil can create one (`backend/family/handover.py`; tests).
  - An acknowledgement recorded when the competency was not paused opens nothing (R2).
- **Bounded.**
  - A learner gets at most `SELF_REENTRY_LIMIT` self-service re-entries per competency. After that, each educator acknowledgement opens exactly one (H08, H16).
  - An unreadable answer to a re-entry question uses the re-entry (R1).
- **Fresh.** The re-entry question is never one answered before, readable or not (H03, R3).
- **Recovery.** A paused or re-entering supporting skill makes another problem's recovery escalate, carrying that skill's hand-over. The re-entry happens in the skill's own module (review item 7).
- **Other competencies** carry on unaffected. `continueWith` lists the direct supports and dependants that have modules (H09). In the app, the pause screen's button already goes to the next planned competency.
- **Configurable.** `setHandoverPolicy({ reentryDays, selfLimit })` takes effect, and every `HandoverState` records the values used (policy test).

## Teacher workflow (backend)

| Endpoint | Who | What |
|---|---|---|
| `POST /api/handover/acknowledgements/` | an educator (`ContentReviewer` role) with an active `MarkingShare` for the pupil | appends a `HandoverAcknowledgement` (pupil, competency, note). It is append-only: no update, no delete. |
| `GET /api/pupils/<id>/handover-acknowledgements/` | the parent | returns `{id, at, competency, by: "educator"}`. The note and the educator's identity are not returned. |

A parent account cannot acknowledge. It is the account the learner's app uses, so an acknowledgement from it could not be told apart from the learner's own. Instead the safe self-service path applies (spec: "if no teacher workflow exists, implement a safe self-service recheck path").
