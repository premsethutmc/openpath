# 8. Regression report

**Environment.** Linux container, 2 CPUs, bun 1.x, node with tsx, Python 3 with SymPy 1.14, Django 308-test suite. The baseline is `eca220f0`, run from a clean worktree of that commit (`/home/claude/p2g`). B2 is this branch.

| Suite | Command (from repo root unless stated) | Baseline eca220f0 | B2 |
|---|---|---|---|
| Learning package (includes unified math, P2 authority and certificate tests, Workstream B tests) | `bun test packages/learning/src` | 1689 pass / 41 skip / 0 fail | **1731 pass / 41 skip / 0 fail** (+42 new: `parser-p2-integration.test.ts`) |
| New integration tests | `bun test packages/learning/src/parser-p2-integration.test.ts` | — | 42 pass / 0 fail |
| Server-grader bundle | manifest test in `generator-contracts.test.ts` | b4a2e637 | unchanged: no bundle input modified |
| Frontend (full) | `cd frontend && node --import tsx --test $(git ls-files 'src/**/*.test.ts' 'src/*.test.ts' \| sort -u)` | 576 / 576 | **576 / 576** (run on a clean worktree of the commit) |
| Learner journey | `cd frontend && node --import tsx --test src/journey/*.test.ts` | 64 / 64 | **64 / 64** |
| Django | `eval "$(backend/vendor-deps.sh \| tail -1)" && cd backend && python3 manage.py test` | 308 OK (skipped=2) | **308 OK (skipped=2)** |
| Type check: app | `cd frontend && node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` | 0 | **0** |
| Type check: english | `… -p tsconfig.english.json` | 0 | **0** |
| Type check: mathematics-integration | `… -p tsconfig.mathematics-integration.json` | 184 (known baseline) | **185**: the one new error is `bun:test` types for the new test file, the same known pattern as every other bun test file. No new error is in non-test code (diffed line by line). |
| Browser | — | — | not applicable: no browser route uses the engine statement-text route (doc 7) |

## Frozen corpora (engine level; labels untouched)

Script: `tools/mathematics/grader-generalization/scripts/corpus-metrics.py`. Traces: `results/{baseline,dev}/trace-*.json`.

| Corpus | Legit certified, eca220f0 → B2 | Invalid detected | First invalid exact | False mathematical accepts (verified, labelled invalid) | Labelled-unsupported now verified |
|---|---|---|---|---|---|
| HELDOUT3 | 58 → **139** / 186 | 70 → **100** / 114 | 70 → 100 | 0 → **0** | 3 → 10 (`rl-018`…`rl-024`: correct derivations; doc 9) |
| HELDOUT3 bare | 107 → **131** | 82 → **93** | 81 → 92 | 0 → **0** | 10 → 10 |
| HELDOUT2 | 71 → **129** / 181 | 100 → **118** / 125 | 100 → 118 | 0 → **0** | 0 → 0 |
| HELDOUT2 bare | 96 → **116** | 110 → **116** | 110 → 116 | 0 → **0** | 0 → 0 |

**Authority level.** P2 verdicts are identical to eca220f0 on HELDOUT2, HELDOUT3 and HELDOUT5: the P2 changes did not move a single authority verdict there. For the HELDOUT5 reproduction, see `results/heldout5-authority-reproduction.txt` and doc 6.

## Replay integrity

From `results/integrity.txt` (`grader-generalization/scripts/integrity.ts`, all seven corpora including HELDOUT6):

- 889 certified chains;
- 0 own-replay failures;
- accepted after attack: cross-task 0 / 889, truncated 0 / 770, tampered 0 / 889, forged-consistent 0 / 889, move-forged 0 / 889.

Swapped-lines shows 2 / 770 accepted. Both are `tr-017`, whose first two lines are identical, so the swap changes nothing; Workstream B recorded the same 2.

## Known baseline issues

- The mathematics-integration type-check debt: 184 errors, unchanged.
- The E3 fuzz test can time out at 5 s under CPU load; it did not fail in these runs.
