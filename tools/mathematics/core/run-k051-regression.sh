#!/usr/bin/env bash
# R1: re-run the unchanged K05.1 frozen sets on the repaired code and require byte-identical traces to the committed K05.1 results.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"; K="$ROOT/tools/mathematics/reasoner"; OUT="$ROOT/tools/mathematics/core/results/k051"; mkdir -p "$OUT"
NODE="node --experimental-strip-types --no-warnings --import $K/ts-resolve.mjs"; cd "$ROOT/packages/learning/src/reasoner"
$NODE --test planner.test.ts 2>&1 | grep -E "^# (pass|fail)" | tee "$OUT/unit-tests.txt"
$NODE run-construct.ts 20261027 "$OUT/constructed.regenerated.json" && cmp "$OUT/constructed.regenerated.json" "$K/frozen/constructed/constructed.json" && echo "constructed set regenerates identically" | tee "$OUT/constructed-regen.txt"
rm -f "$OUT/constructed.regenerated.json"
: > "$OUT/summary.txt"
run() { $NODE run-frozen.ts "$K/frozen/$2" "$OUT/$1.traces.json" "$OUT/$1.stats.json" ${3:-}; if cmp -s "$OUT/$1.traces.json" "$K/results/$1.traces.json"; then echo "$1: traces byte-identical to committed K05.1 results" | tee -a "$OUT/summary.txt"; else echo "$1: TRACES DIFFER" | tee -a "$OUT/summary.txt"; fi
  python3 -I "$K/check.py" "$K/frozen/$2" "$OUT/$1.traces.json" "$OUT/$1.check.json" | tee -a "$OUT/summary.txt"; }
run smoke20 smoke20.json full; run seeded500 seeded500.json; run edge50 edge50.json; run holdout-b holdout-b/seeded500.json; run constructed constructed/constructed.json
