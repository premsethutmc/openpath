# 5. Deterministic simulation clock

`src/clock.ts` defines `SimClock` (`synthetic-clock@1`).

- **Time moves only when the clock is advanced.** `advanceDays` and `advanceMs` refuse to go backwards and refuse a non-finite start.
- **No real clock and no unseeded randomness.** The simulator never calls `Date.now` or `Math.random`; a test scans the source for both.
- **The two clocks advance together.** OpenPath's session clock is advanced by the same number of days when the learner comes back. The harness calls `learner.advance(d)` and then `port.later(d)`, which runs `SliceFlow.later` and `SliceSession.wait`.
- **OpenPath adds its own small steps.** Its session adds 60 s per record, as in production. That is OpenPath's own behaviour.
