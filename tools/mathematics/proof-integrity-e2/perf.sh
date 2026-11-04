#!/usr/bin/env bash
# usage: perf.sh <checkout-root> <label>; 7 repetitions each of E1(500) and dev(100); prints per-run p50/p95 (ms)
root=$1; label=$2
for part in e1 dev; do
  for i in 1 2 3 4 5 6 7; do
    (cd "$root/tools/mathematics/proof-integrity-e2" && bun evaluate.ts $part perf-$label 2>/dev/null | python3 -c "import json,sys;d=json.loads(sys.stdin.read());print('$label','$part',d['latencyMs']['p50'],d['latencyMs']['p95'],d['latencyMs']['p99'])")
  done
done
