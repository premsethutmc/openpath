# 9. Regression

Baseline = clean worktree of `cd40422b`. Feature = this branch.

| Suite | Baseline | Feature | Introduced |
|---|---|---|---|
| `bun test packages/learning` (all, incl. E7 safety, D1 grading, E1, geometry authority) | 1781 pass, 41 skip, 0 fail | **1783 pass, 41 skip, 0 fail** (+2 new G5 reasoning tests) | none |
| — subset: E7 safety + finalisation, grading/* (D1 working, process shadow, E7 integration gate, certify, contract), grading audit, E1 sub-skill evidence, geometry worker/unified engine/E5 closure, quarantine selectors (`question-status`) | — | 254 pass, 0 fail (20 files) | none |
| Frontend `node --test src/**/*.test.ts` (66 files, run per file) | not run in full (the combined run exceeds 55 min on both worktrees; the two slowest files run on both, below) | **671 pass, 0 fail, 66/66 files** | none |
| — D1+E1 journeys (`d1e1-journeys.test`) / E1 scenarios (`subskill-evidence.test`) / D1 grader teaching / linear equations / scenarios / slice / content safety | — | 17 / 4 / 16 / 21 / 41 / 6 / 16 pass | none |
| — new geometry journeys | — | 11 pass | — |
| — `content-system.test` / `mathematics-completion.test` (slowest) | 10 pass / 8 pass | 10 pass / 8 pass | none |
| Django `manage.py test` | 310 OK (2 skipped) | **310 OK (2 skipped)** | none |
| Persistence/replay: D1+E1 (`d1e1-persistence.sh`) | — | PASS (4 attempts, decisions server-recorded with working verdicts, projection equal, reversed order identical) | none |
| Persistence/replay: geometry (`g5-persistence.sh`) | n/a | PASS | — |
| E1/D1E1 output identity | — | E1 scenarios JSON/MD byte-identical; D1+E1 journeys identical after normalising random record ids | none |
| Typecheck `tsconfig.json`, `tsconfig.english.json` | 0 errors | 0 errors | none |
| Typecheck `tsconfig.mathematics-integration.json` | 188 errors (pre-existing; 71 are `bun:test` module errors from bun test files) | 189 errors | **1, same pre-existing class**: `geometry-reasoning-g5.test.ts` imports `bun:test` like every other learning test. Not hidden by an exclude |
| Browser | — | not run; production app bundle (`npm run build`) is **byte-identical** to the baseline bundle (`diff -r dist`), so browser behaviour cannot differ | none |

## Failures seen during the work and their disposition

| Failure | Cause | Disposition |
|---|---|---|
| `question-status.test` "only these files import the pool selectors" | introduced: the geometry harness imported `phasePool` (quarantine-safety rule) | **fixed** by selecting from the module's own quarantine-filtered lists; allow-list not extended |
| `verification-closure-e3` fuzz (5 s timeout) and `multivariate` randomised latency bound | load: run while two full frontend suites were running | pass in isolation (52 pass) and in a clean full re-run (0 fail); not related to changed code |
| E1 isolation test (comment in `subskill-projection.ts` named the E1 file) | introduced during the refactor | fixed (comment reworded) |

No safety rule, test expectation or allow-list was weakened.
