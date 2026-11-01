# 6. Regressions

## Runs compared

- **H1 run:** `/tmp/h1r/final`, started on code commit `97450e0`.
- **D1+E1 run (`cd40422`):** `/tmp/de1r/final`, the same script without the H1 rows.
- **The H1 run in two parts:**
  - The script was stopped by the shell's time limit before its last two steps. Those two steps (`a3fix-generalisation` and the full frontend suite) were re-run on `5b230e8`.
  - `5b230e8` differs from `97450e0` only in docs and one type cast in a test (below).
- **The time-limited run:** the time limit stopped only the runner. No test was failing at that point.

## Results

| Suite | H1 | D1+E1 | Note |
|---|---|---|---|
| Learning package (`bun test packages/learning`) | 1781 pass, 41 skip, **0 fail** | 1780 pass, 41 skip, 1 fail | D1+E1's one failure was the inherited E3 fuzz timing flake. It passed this time. |
| Targeted unit (sub-skill, working, certificate, parser) | 92 pass, 0 fail | 92 pass | |
| Typecheck `tsconfig.json` / `tsconfig.english.json` | 0 / 0 errors | 0 / 0 | |
| Typecheck `tsconfig.mathematics-integration.json` | 188 errors (after fix) | 188 | **One introduced error** (TS2367 in the R1 test: a narrowed `f.stage` comparison). It was fixed in `5b230e8` and is back to the inherited 188. |
| Django, whole suite | 314 tests OK (3 skipped) | 310 OK (2 skipped) | Adds 4 hand-over tests. One of them is the env-gated persistence test, which is skipped unless the persistence script runs it. |
| Django hand-over (`family.test_handover`) | 4 OK (1 skipped, run separately below) | — | Authority, forged learner records, append-only. |
| Browser: M1, M2, A2, A3, D1 | 2 + 14 + 8 + 24 + 14 pass, 0 fail | identical | |
| Browser: H1 (`e2e/h1-handover.test.mjs`) | 4 pass (desktop and mobile) | — | Pause note, re-entry, after re-entry, retention opening time (Asia/Kolkata). |
| Grader: P2 final checks, corpora, integrity | identical output | — | |
| Grade comparison (109,108 gradings) | same 109,096, diff 0, D1-only 12 | identical | |
| Certificate compatibility | 563 historical-version-not-replayable, 0 now-not-verified | identical | |
| Persistence M1 / M2 / D1+E1 | PASS / PASS 4 learners / projection equals in-memory, store-order independent | identical | |
| Persistence H1 (`scripts/h1-persistence.sh`) | **PASS**: 14 stored events, 1 acknowledgement read back. Rebuilt state equals in-memory, and the next phase is `reentry` (acknowledged). | — | Django store, each record stored at its own time; a new client reads back, and a separate process rebuilds the state. |
| E1 store replay | two replays identical | identical (own store) | The digests differ between runs because each run builds a fresh store at the current time. |
| Journey suites: safety, scenarios, coverage, policies, D1, E1, D1+E1 | 42, 41, 17, 5, 16, 4, 17 pass, 0 fail | identical | |
| H1 journeys (`handover.test.ts`) | 21 pass, 0 fail in the run; 22 pass after R5 was added (`R5` re-run separately) | — | H01–H16, policy, R1–R5 |
| Journey outputs: registry check, D1+E1 leakage scan, A2 decisions, A3 journeys, D1 journeys, E1 scenarios, D1+E1 journeys | byte-identical summaries | — | |
| A3 generalisation | FRONTEND_GEN | 13 pass | |
| Frontend, whole (`src/**/*.test.ts`) | FRONTEND_ALL | 660 pass, 0 fail | |

## Time-boundary tests

| Where | What |
|---|---|
| H11 | Asia/Kolkata: a return on the shown date at 09:00 local, before the due time, is not open and states the exact time. A return at the instant is open. |
| H12 | 1 minute before the instant: `scheduled`, not open. At the instant: `due`, open. |
| H13 | The Kolkata-midnight instant the day after US daylight saving began. Local dates differ per zone, labels are exact (GMT+5:30, UTC, PDT, PST), and it opens at the same instant everywhere. The local midnight of the shown day is not open. |
| browser | The real slice app in `Asia/Kolkata` shows "… (GMT+5:30, Asia/Kolkata)" for the hand-over and the delayed check. |
| `h1-journeys.mts` | One instant shown in UTC, Kolkata, Los Angeles and Auckland. A return 1 day before and 1 minute before shows "Opens …" and offers nothing. At the instant: "Due now", and the delayed check is offered. |

## Defects introduced and fixed

1. **Type error:** TS2367 in the R1 test. Fixed in `5b230e8`.
2. **Review findings:** the independent review's two blockers and five should-fix items (doc 7) were all found before this run and fixed in `682ba3e`.

No other change from the D1+E1 run.
