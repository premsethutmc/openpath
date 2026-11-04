# 7. Regression results

## The run

- **Final complete run:** commit `2c221bd` (the last code change; later commits are docs only), 31 Oct 2026, 18:05 → 19:47 UTC.
- **Script:** `/tmp/de1run.sh`, sequential, with fixed seeds and clocks where the suites use them. Outputs are in `/tmp/de1r/final/`.

## Baselines

| Baseline | Where its figures come from |
|---|---|
| D1 (`adb27a1`) | Its final run (`docs/grader-teaching-integration/09`) |
| E1 (`c2cc33c`) | Its report (`docs/linear-equations-subskill-evidence/09`), plus a targeted run of its tests before integration: unit 22 / 22, journeys 4 / 4 |
| D1 targeted, before integration | unit 21 / 21, journeys 16 / 16 |

## Results

| Suite | D1 baseline | E1 baseline | Integration final | Introduced |
|---|---|---|---|---|
| Learning package (incl. P2 parser, certificate replay, E7 safety, unified engine, D1 working assessment, E1 projection) | 1752 pass / 0 fail | 1688 pass / 0 fail | **1780 pass / 41 skip / 1 fail** (1822) | **0**: the 1 failure is inherited and timing-only (below) |
| Targeted: E1 projection, D1 working, certificate compatibility, P2 integration | — | — | **92 / 92** | 0 |
| Type check: app | 0 | 0 | **0** | 0 |
| Type check: english | 0 | 0 | **0** | 0 |
| Type check: mathematics-integration | 187 | 184 | **188** | 0. Inherited: A3's 183, plus `TS2307 Cannot find module 'bun:test'` for the bun test files of P2 (2), D1 (2) and E1 (1). No diagnostic comes from integration code. |
| Django | 310 OK | 308 OK | **310 OK (2 skipped)** | 0 |
| Browser desktop + mobile: M1, M2, A2, A3, D1 reference cases | 62 / 62 | not run | **62 / 62** | 0 |
| Frontend full suite | 639 / 639 | 627 / 627 | **660 / 660** | 0 |
| A3 safety, corrections, linear-equations journeys | 42 / 42 | (in frontend) | **42 / 42** | 0 |
| M2 scenarios / coverage / policies | 41 / 17 / 5 | (in frontend) | **41 / 17 / 5** | 0 |
| D1 grader journeys | 16 / 16 | — | **16 / 16** | 0 |
| E1 sub-skill journeys (17 × 3 seeds) | — | 4 / 4 | **4 / 4** | 0 |
| D1 + E1 journeys (J01–J20) | — | — | **17 / 17** | 0 |
| Persistence M1 / M2 | OK / PASS 4 learners | OK / PASS 4 learners | **OK / PASS 4 learners** | 0 |
| E1 store replay over the M2 Django store, two processes | — | identical | **identical; reversed order identical** | 0 |
| D1 + E1 persistence: working verdicts through Django, then projected | — | — | **PASS**: every stored decision is by the server with a working verdict; the projection equals the in-memory one; reversed order identical | 0 |
| Explanation registry | OK | OK | **OK** | 0 |
| A3 diagnosis-generalisation fix | 13 / 13 | — | **13 / 13** | 0 |

## Mathematical safety (unchanged from D1)

| Check | Result |
|---|---|
| Grading parity with A3 | 109,096 identical decisions, 0 different. The 12 extra decisions are D1's reference question. |
| False mathematical accepts on 7 frozen corpora | **0** on each |
| Replay integrity | 889 chains; 0 accepted cross-task, truncated, tampered, forged or move-forged. 2 / 770 swapped-lines accepted: `tr-017`, whose two lines are identical. |
| P2 final checks (HELDOUT3) | 0 own-replay failures; 0 accepted attacks |
| Historical @3 certificates | 563 / 563 `historical-version-not-replayable` |

## Introduced failures and fixes

The first full run on `5d63fb2` found 2 introduced failures. Both were fixed in `2c221bd`.

1. **`assessment.test.ts` "only session.ts and records.ts build attempt records".**
   - Cause: J20 built unknown-id attempt records by hand.
   - Fix: they are built with the session's own `make.attempt`, carrying the stored unknown id.
2. **D1 `working.test.ts` "invalid working never becomes verified method evidence".**
   - Cause: 160 grader decisions exceeded bun's 5 s default under full-suite load.
   - Fix: an explicit 60 s timeout. No assertion changed.

The final run has **no introduced failure**.

## Inherited failure (not introduced)

**`verification-closure-e3.test.ts` "no disagreement over the differential fuzz set"** timed out in the final run (6.9 s against bun's 5 s default).

- **Known issue:** B2's regression report already records it: "The E3 fuzz test can time out at 5 s under CPU load".
- **Unchanged file:** neither the test nor its code changed since P2 (`git diff adb27a1 2c221bd` is empty for it).
- **Passed elsewhere:** it passed in this branch's previous full run, and passed 43 / 43 in three repeated runs on the final commit from the repository root.
- **Not modified:** it is not part of this integration, so it was left unchanged and is reported here.
