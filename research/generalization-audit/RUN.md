# Reproduction

Engine baseline: `837c79cc8d7b1effa06b8553960322af7ec3f88b` (head of `feat/math-generalization-core-e7`; unchanged).
Baseline package tests: `bun test packages/learning/src` → 1296 pass / 0 fail (`baseline/bun-test.log`).
SymPy investigation `feat/math-transition-sympy-evaluation@09a66f8` was consulted as historical evidence only: the no-eval
parser and exact routines were adapted into `oracle/` (see `oracle/CHANGELOG.md`); none of its labels or cases were reused.

Benchmark r1: `frozen/benchmark.json`, SHA-256 `a4ece4bf0474b47feceb6ba98cb86d56301e17b665ea5d96489a814becc312e8`,
frozen in commit `41cbff2` before any E7 execution (`frozen/FREEZE.json`). r2 (one relabel, CAL-0082): `frozen/benchmark.r2.json`,
SHA-256 `79df2c1adf494586187ba47a252705568e27dd0d91bf1890c13a2fd6cccd7234` (`frozen/REVISIONS.md`).
Requires SymPy 1.14.0 + mpmath 1.3.0 for the oracle and adapter.

```
# 1. benchmark construction (no E7): author modules in bench/categories, oracle certification, freeze
cd research/generalization-audit
python3 bench/build.py --procs 2                    # -> frozen/benchmark-draft.json (oracle status per case)
python3 bench/freeze.py                             # -> frozen/benchmark.json + FREEZE.json (refuses to overwrite)
sha256sum frozen/benchmark.json

# 2. evaluation (E7 unchanged)
python3 adapter/build_inputs.py frozen/benchmark.json results/adapter-inputs.json
cd ../.. && bun research/generalization-audit/adapter/run_e7.ts research/generalization-audit/results/adapter-inputs.json research/generalization-audit/results/e7-raw.json
cd research/generalization-audit
python3 results/review.py                           # manual review of decisive failures (already recorded)
python3 adapter/score.py frozen/benchmark.json results/e7-raw.json results/adapter-inputs.json ../../MATH_GENERALIZATION_RESULTS.json results/summary.json results/review.json
python3 adapter/score.py frozen/benchmark.r2.json results/e7-raw.json results/adapter-inputs.json results/results-r2.json results/summary-r2.json results/review.json
cd adapter && python3 capabilities.py ../../../MATH_GENERALIZATION_RESULTS.json ../results/capability.json && cd ..

# 3. form-sensitivity variant (same mathematics, constants folded)
python3 adapter/build_inputs.py frozen/benchmark.json results/adapter-inputs-canonical.json --canonical
cd ../.. && bun research/generalization-audit/adapter/run_e7.ts research/generalization-audit/results/adapter-inputs-canonical.json research/generalization-audit/results/e7-raw-canonical.json
cd research/generalization-audit && python3 adapter/score.py frozen/benchmark.json results/e7-raw-canonical.json results/adapter-inputs-canonical.json results/results-canonical.json results/summary-canonical.json
```
Outputs: `MATH_GENERALIZATION_RESULTS.json` (repo root, per case), `results/summary.json` (metrics by category, kind,
relation, channel, chain length, notation, composition, difficulty, invariant; failure classes; latency),
`results/capability.json`, `results/review.json`.
