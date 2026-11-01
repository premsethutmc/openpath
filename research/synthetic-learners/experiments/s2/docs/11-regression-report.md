# 11. Regression report

**Environment.** Linux container, 2 CPUs, bun 1.x, node 22 with tsx, Django test DB.

**What was run.** All production suites ran on a clean worktree of the S2 branch. **No production file differs from `cd40422b`**: `git diff --name-only cd40422b HEAD` lists only `research/synthetic-learners/**`.

**Baseline.** The integrated baseline is `docs/d1-e1-integration/07-regression-results.md`.

| Suite | Command | Integrated baseline | S2 | Introduced |
|---|---|---|---|---|
| S1 simulator | `cd frontend && node --import tsx --test ../research/synthetic-learners/test/simulator.test.ts` | 16 / 16 (at S1) | **16 / 16**; the S1 committed traces still reproduce | 0 |
| S2 failure cases (20) | `… ../research/synthetic-learners/experiments/s2/test/failure-cases.test.ts` | — | **20 / 20** | 0 |
| Deterministic replay | the whole experiment, run twice | — | identical journey outcomes for 500 / 500; the reviewer's sampled byte-identical replays | 0 |
| Learning package (P2/E7 safety, D1 working, E1 projection, certificates) | `bun test packages/learning/src` | 1780 pass / 41 skip / 1 fail (inherited timing flake) | **1781 pass / 41 skip / 0 fail** | 0. The baseline's timing-only failure passed this time. |
| Frontend full suite (D1 grader journeys, E1 sub-skill journeys, D1 + E1 journeys J01–J20, A3 journeys, scenarios, policies, coverage) | `cd frontend && node --import tsx --test $(git ls-files 'src/**/*.test.ts' 'src/*.test.ts' \| sort -u)` | 660 / 660 | **660 / 660** | 0 |
| Django | `cd backend && eval "$(./vendor-deps.sh)" && python3 manage.py test` | 310 OK (2 skipped) | **310 OK (2 skipped)** | 0 |
| Persistence M1 / M2 | `frontend/scripts/m1-persistence.sh`, `m2-persistence.sh` | OK / PASS 4 learners | **OK / PASS 4 learners** | 0 |
| Type checks: app / english / mathematics-integration | `node node_modules/typescript/bin/tsc --noEmit -p …` | 0 / 0 / 188 | **0 / 0 / 188** | 0 |
| Browser desktop + mobile | — | 62 / 62 | **not run**: no production, UI or route change (the simulator drives the journey headless) | — |
| P2 / E7 mathematical safety | inside the learning package (frozen corpora, replay integrity, certificate attacks) | 0 false accepts | unchanged; production code is identical | 0 |

**Introduced failures: none. Timing flakes: none in this run.**
