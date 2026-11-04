# 9. Regression results

**Environment.** Linux container, 2 CPUs, bun 1.x, node 22 with tsx, Django test DB. The baseline is `4f97427b` (A3); its numbers are from the A3 regression report and from a clean worktree of the commit for the type checks. E1 was run on the committed tree; the frontend suite ran on a clean worktree of the commit.

| Suite | Command | Baseline 4f97427b | E1 |
|---|---|---|---|
| Learning package: learner state, evidence, adaptive, P2/E7 safety, grader bundle manifest, registered selectors | `bun test packages/learning/src` | 1666 pass / 44 skip / 0 fail | **1688 pass / 44 skip / 0 fail** (+22 new) |
| Frontend, all tests: A3 linear-equations journeys, policies A/B/C, scenarios, coverage, content safety, retention cycle, adaptive loop, slice | `cd frontend && node --import tsx --test "src/**/*.test.ts"` | 623 / 623 | **627 / 627** (+4 new) |
| E1 journeys (17 × 3 seeds) and the shadow invariant | `cd frontend && node --import tsx --test src/journey/subskill-evidence.test.ts` | — | 4 / 4 |
| E1 projection properties | `bun test packages/learning/src/subskill-evidence.test.ts` | — | 22 / 22 |
| Django | `cd backend && eval "$(./vendor-deps.sh)" && python3 manage.py test` | 308 OK (skipped=2) | **308 OK (skipped=2)** |
| Persistence across restart: M1 | `frontend/scripts/m1-persistence.sh` | OK | **OK** |
| Persistence across restart: M2 | `M2_DIR=… frontend/scripts/m2-persistence.sh` | PASS 4 learners | **PASS 4 learners** |
| E1 projection over the stored events | `node --import tsx scripts/e1-store-replay.mts $M2_DIR` (twice) | — | identical digests across processes; reversed delivery identical |
| Type check: main | `cd frontend && node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` | 0 | **0** |
| Type check: english | `… -p tsconfig.english.json` | 0 | **0** |
| Type check: mathematics-integration | `… -p tsconfig.mathematics-integration.json` | 183 | **184**. The one addition is `bun:test` types for the new bun test file, the known pattern for every bun test file. It was diffed line by line; nothing in non-test code. |
| Browser | — | — | not run: no UI, renderer or route changed |

## Verifications

| Check | Result |
|---|---|
| Existing authoritative decisions unchanged | No existing file was modified (E1 only adds files). The shadow-invariant test checks evidence and the next step before and after projecting. All existing suites pass unchanged. |
| No additional mastery or evidence events | The event count is unchanged by projecting (test). No event type was added. |
| No mathematical grading change | No grader, P2 or E7 file changed. The grader bundle manifest test passes, and the bundle was not rebuilt. |
| Historical learner evidence valid | The M1/M2 store round trips pass. Legacy ids are reported and not reinterpreted. |
| Replay deterministic | journey 15; store replay; property tests |
| Bounded and fails safe | `resource-limit`, `unreadable-events`, rejected malformed records (tests) |
| Generated variants, not hardcoded examples | variants drawn from the families' release pools; 5 seeds for the property tests, 3 for the journeys |

## Baseline vs introduced failures

There were no baseline failures in these runs.

One **introduced** failure was found during development and fixed: the registered-selector test, "only these files import the pool selectors". It fired because the first version of `subskill-scenarios.ts` imported `phasePool`. The pool is now injected by the caller (a test or script), so no new question selector was added, and the test's allowlist is unchanged.
