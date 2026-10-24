# Grade 7 session completion (Task 4)

Base: `feat/grade7-teaching-practice-v1`, `dd7937117bc94aa67f799fe2a35496b8d5284cd7`.

## Learner behaviour

The existing `/year/` Grade 7 topic → diagnostic → duration → study journey now shows a compact remaining-time control and optional time details. The selected **15, 30 or 60 minutes** comes from the saved plan, independently of provisional module-duration allowances. Existing focus-block and module progress remain activity progress, not mastery.

Expiry does not navigate, replace a question, change its draft or steal input focus. The learner can finish the current problem/activity or end immediately. Incorrect answers still use the existing retry/help flow; a correct answer after choosing to finish the current problem closes the session and records its summary. **End session** also permits an early finish. Neither route clears unfinished work or resets learner evidence.

The saved summary shows competencies attempted, correct/incorrect attempts, pending educator marking, established prerequisite findings, competencies still needing practice, and the shared planner's next recommendation. A single wrong answer is not labelled a prerequisite deficit. Established findings from the diagnostic that produced the plan are preserved even after later help/correction; those earlier diagnostic answers are not counted again as study attempts. A dashboard link opens the completed summary in the same board, release and academic year.

## Timing contract

`packages/learning/src/study-session.ts` defines the cumulative millisecond counters and an isolated monotonic clock:

- **Active learning:** visible time until 60 seconds after the most recent pointer, keyboard, input or scroll activity. Returning to a visible tab restarts this engagement window. This is an interaction-based estimate of engagement, not a measurement of attention or understanding.
- **Problem solving:** active time while the existing question/working component is open. This is a **subset** of active learning, not another quantity to add to it. Feedback and concept screens are not solving time.
- **Idle:** visible time beyond the engagement window.
- **Background/closed:** excluded from both active and visible idle time. Reload starts a new monotonic origin and restores totals; it never replays elapsed wall-clock time.
- **Remaining:** selected budget minus active learning, clamped at zero. Idle/background do not consume the active-study budget.

The timer has no input to the estimator, mastery gate or curriculum. Its input listener caches engagement without rendering React inside native capture; the learner's answer handler must run first. The regular timer tick updates the display without disabling mathematical input. No new input, mathematical-checking or diagnostic engine is introduced.

## Django persistence and retry safety

The existing authenticated, append-only mathematics ledger stores `learning_record / study_session` events. They reference the immutable saved plan (`planId`), use sequential `revision` values and contain cumulative `time` counters with `start`, `active` or `ended` phases. No new database table or migration is required.

Django validates ownership, plan references, integer/nonnegative timing, monotonic counters and `solving <= active` (including each checkpoint delta). There is one start and one final summary per plan. Completed sessions reject further tagged attempts and checkpoints; normal practice outside that session remains available. Checkpoint totals replace the previous snapshot conceptually; they are never summed as durations.

Study attempts retain their existing answer/activity/help fields, plus the existing context field `study:<planId>`. Django creates the final performance lists from those canonical attempts using its existing deterministic checkers; written tasks remain pending until educator-marked. Client-supplied correctness or mastery counts are rejected. Findings and recommendations are projections of the existing shared diagnostic/reasoning/evidence/planner, with validated competency/source references. They are advisory, not proficiency updates.

Checkpointing runs every 15 seconds and on visibility/navigation boundaries. Browser cache preserves cumulative unsent totals on ticks and engagement; same-browser reload reconciles them with the last server checkpoint. There is no wall-clock catch-up. Event IDs are stable for a revision, and completion has one deterministic ID. The existing append queue resolves a lost acknowledgement by reloading the original event ID rather than generating a second activity. Stale/concurrent checkpoint revisions are rejected rather than merged as overlapping time. Timing save failures remain visible with retry and clear after recovery.

A closed summary is an immutable snapshot **as of completion**, including the pending-mark state at that moment. The dashboard continues to derive current understanding from the canonical evidence, not from that snapshot. The summary does not claim mastery, exam readiness or educator approval.

## Limits

- Engagement uses the explicit 60-second heuristic; timing is client-reported bookkeeping, not trustworthy assessment evidence.
- Last unflushed server time can lag by the checkpoint interval; same-browser cache covers normal reload/pagehide. Abrupt browser/storage loss can lose unsent timing. Cross-device timing resumes from the latest saved checkpoint.
- Detailed teaching-screen/answer/working cursors remain browser-local as in Task 3. Attempts, teaching, checkpoints and summaries are server-persisted.
- Provisional content remains provisional. No curriculum or review status was changed.
- Browser tests use Android-sized Chromium viewports and simulated clocks/visibility. Physical Android behaviour is not claimed as hardware-tested.
- Delayed reassessment is not launched here; its existing evidence rules are unchanged.

## Verification

Tests use synthetic accounts and an isolated SQLite database, actual Django endpoints and normal provisional-content builds. No paid calls, deployment or real learner records.

```sh
cd frontend
npm run typecheck
node --import tsx --test src/year/study-time.test.ts src/year/topic-session.test.ts \
  src/year/grade7-board.test.ts src/learning/engine.test.ts src/learning/dashboard.test.ts
YEAR_URL=http://127.0.0.1:4310 CHROMIUM_PATH=/usr/bin/chromium \
  SHOTS=/tmp/grade7-completion node --import tsx --test e2e/grade7-completion.test.mjs
```

The existing My Learning Year GitHub Actions workflow runs the new journey and uploads its screenshots; it does not deploy.

Development regressions found and fixed: native input-capture rendering could clear a typed answer; background save failures could leave a stale global error after recovery. The browser suite now explicitly checks draft retention across checkpoints, expiry focus, and absence of stale alerts. Fake-clock advancement waits for real Django requests to settle so that an artificial time jump does not time out unrelated requests.

## Actual results

- Full Django suite: **248 passed** (including five study-session API tests).
- Focused frontend/shared-engine suites: **44 passed**, including eight clock/summary tests and seeded timing-invariant checks.
- New actual-Django timed mobile journeys: **4 passed**, no browser runtime errors or stale save alerts.
- Existing Task 3 teaching/practice mobile journeys against Django: **4 passed**.
- Keyboard policy / writing component regressions: **4 passed**, including archived handwriting-data compatibility.
- All three TypeScript projects and normal year/curriculum builds passed.

Timed browser matrix: 360px CBSE **15 minutes, expire then finish the current problem**; 360px Tamil Nadu **30 minutes, end early with a lost final response**; 393px CBSE **60 minutes, end early**; 393px Tamil Nadu **15 minutes, expire then stop**. Each checks active/solving/idle separation, simulated hidden time, an hour-away reload, immutable attempt history, server-counted summary, no verified mastery, and dashboard return. Unit/API tests cover all three budgets without waiting for real elapsed minutes.

14 actual browser captures accompany the report:

- `{360,393}-{cbse,tn}-timing.png`: countdown while learning; optional time details remain available.
- `{360,393}-{cbse,tn}-summary.png`: persisted performance and timing summary.
- `{360,393}-{cbse,tn}-dashboard.png`: return to the existing learner dashboard.
- `360-cbse-expired.png`, `393-tn-expired.png`: non-blocking finish-or-stop choice with the draft retained.

Examples: [working after expiry](393-tn-expired.png), [completed summary](360-cbse-summary.png), [dashboard return](393-cbse-dashboard.png).
