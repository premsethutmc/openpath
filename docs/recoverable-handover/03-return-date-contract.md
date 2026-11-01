# 3. Return-date contract: `retention-display@1`

**Chosen contract: show the exact due date and time, including the time zone.** The opening instant does not move.

| Part | Rule | Where |
|---|---|---|
| Scheduling | The due instant is independent success (or the end of the engine's demonstration) plus `RETENTION_DAYS`, to the minute. A hand-over's re-entry instant is `since + REENTRY_DAYS`. | `evidence.ts` (unchanged), `intervention.ts` |
| Availability | Open exactly when `now >= instant`, in every time zone. The server enforces the same 7 full days (`learning.py RETENTION_DELAY`, unchanged). | `evidence.ts`, `due-display.ts isOpen` |
| What the learner is told | Always the date, time and time zone, in the viewer's zone. Example: "Opens Tue 10 Mar 2026, 14:05 (GMT+5:30, Asia/Kolkata)". | `due-display.ts`. Topic page: `year/Main.tsx`. Module end: `Learn.tsx`, recovery view. Curriculum page: `curriculum/Main.tsx`. Slice summary: `flow.ts`. The module's own reason text no longer carries a date. |

## Why not "open from the start of the displayed day"

- It would shorten the seven-day minimum by up to about a day. For a viewer east of UTC, or one whose day starts before the due time, the check would open early.
- The server's check would then disagree: it would refuse the early retention answers.
- The delayed check's purpose (retention after at least seven days) would weaken without a reviewed policy decision.

The due date was **not** moved.

## Tests (deterministic: fixed instants, explicit IANA zones)

| Test | What |
|---|---|
| H11 | Shown with an exact time in Asia/Kolkata. Back on the shown date at 09:00 local, before the time: no check, and the summary states the exact opening time. Back at the instant: the check is asked. |
| H12 | One minute before the instant: `scheduled`, not open. At the instant: `due`, open. |
| H13 | The instant `2026-03-09T18:30Z` is Kolkata midnight and falls on the day after US daylight saving began. It shows as Tue 10 Mar 00:00 (GMT+5:30), Mon 9 Mar 18:30 (UTC), Mon 9 Mar 11:30 (PDT) and Tue 10 Mar in Kiritimati. PST shows before the change. The same instant opens in every zone, and the start of the shown local day is **not** open. |
