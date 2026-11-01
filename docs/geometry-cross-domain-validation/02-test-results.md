# 2. Geometry test results (actual runs)

All runs on the feature worktree unless stated; baseline runs on a clean worktree of `cd40422b`.

## Existing geometry proof and grading tests

| Suite | Command | Result |
|---|---|---|
| Geometry reasoner (Python: G2 reasoner, G3 validation, G4 contract/semantics/external corpus, hardening, integration audit, unified API) | `python3 -m pytest research/geometry-reasoner/tests` | **47 passed, 0 failed** |
| 540-case hardening benchmark | `benchmark/evaluate.py` on `school_geometry_hardening_v2.json` | reproduces `hardening_results.json` (540 cases) |
| 90 structured student proofs | `benchmark/evaluate_student_proofs.py` | **90/90**, 0 false accepts, 0 false rejects |
| External corpus | `benchmark/evaluate_external_proofs.py` | 173 cases, all `unsupported` (as recorded) |
| TS geometry authority | `bun test geometry-worker-pool unified-math-engine u2 verification-closure-e5` | **32 pass, 0 fail** |

Benchmark result files rewritten by the runs (timings) were restored; no research file is changed on the branch.

## New G5 tests

| Suite | Result |
|---|---|
| `packages/learning/src/geometry-reasoning-g5.test.ts` (adversarial reasoning, 14 runs) | 2 tests pass (they pin the recorded limitations; see 06) |
| `frontend/src/journey/geometry-journeys.test.ts` (8 journeys, replay, isolation scan) | **11 pass, 0 fail** |
| Geometry persistence round trip (`frontend/scripts/g5-persistence.sh`, Django) | **PASS**: 17 attempts stored, every decision server-recorded, working verdicts (`unsupported`) preserved, projection equal, reversed order identical |
