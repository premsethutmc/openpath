# 1. The hand-over before H1 (`cd40422`)

| Question | Answer, with where it is decided |
|---|---|
| **What triggers the pause** | `intervention.ts` `moduleStep` returns `phase: "pause"` in seven places. Every explanation for an established misconception has been tried. The sub-skill gap explanation was given and the same kind is still wrong. The planner decides `recommend_human` or `content_gap`. No fresh check question is left. A recovery escalation happens inside the module. Separately, `moduleState` pauses when one question gets 2 or more unreadable answers (bounded-input@1). |
| **What the learner sees** | The reason text, for example "Every explanation here has been tried. Carry on, and go through this with a teacher or parent; **it will come back**." In the app (`Learn.tsx`) it appears under "Let's pause this one". In the slice harness it is the summary message. |
| **Can a teacher or parent acknowledge it** | **No.** There is no acknowledgement anywhere: no record kind, no API, no input to the engine. The role system had educators (`ContentReviewer` role `educator`) and parent-chosen shares (`MarkingShare`), but only for marking written answers. |
| **What permits re-entry** | Only a change in the records that alters `moduleStep`'s decision. A paused module asks nothing, so on that skill nothing changes the records. |
| **Does the pause expire** | **No.** Nothing in the decision depends on time while paused. "It will come back" was not true. |
| **Can the planner move the learner elsewhere** | In the app, yes: the pause screen's button goes to the "Next planned competency". In the single-skill journey (the slice and S2's harness), no. |
| **After restarting the application** | Identical: the pause is recomputed from the same records, so it persists across restarts. |

## Why S2 saw repeated visits with nothing to do

S2's learner comes back two days after a "teacher or parent" summary. On every return, `moduleState` is evaluated over the same records and returns the same pause. No question is asked, so no record is added, and the next visit is the same. 191 of S2's 300 cohort-A journeys ended "stalled" (3 consecutive visits with nothing offered). The reviewer re-ran stalls to 80 days and none resumed (S2 doc 9, failure mode A).

## The return-date mismatch

The topic page showed the delayed check's **date only** (`new Date(retentionDueAt).toLocaleDateString()`, `year/Main.tsx`). The check opens at an exact instant: independent success plus 7 days, to the minute. The server enforces the same 7 full days (`learning.py RETENTION_DELAY`). A learner who came back on the shown date before that minute found nothing: 214 of 468 such returns in S2 (failure mode D). The module's own reason also gave a date only ("A delayed check is planned for Tue Mar 10 2026"), in the device's time zone.
