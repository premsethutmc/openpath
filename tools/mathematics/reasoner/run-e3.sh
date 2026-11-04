#!/usr/bin/env bash
# Reproduces every E3 result from a clean checkout of feat/math-reasoner. Needs: node >= 22, python3, vendored SymPy
# (VENDOR=/path/sympy:/path/mpmath, default /home/claude/vendor/...). Deterministic: re-running gives byte-identical traces.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../../.." && pwd)"
SRC="$ROOT/packages/learning/src/reasoner"; FZ="$HERE/frozen"; RES="$HERE/results"
NODE="node --experimental-strip-types --no-warnings --import $HERE/ts-resolve.mjs"
PY="python3 -I"; mkdir -p "$RES"
cd "$SRC"
# 0. the planner's own unit tests
$NODE --test planner.test.ts 2>&1 | grep -E "^# (pass|fail)" | tee "$RES/unit-tests.txt"
# 1. regenerate the constructed set from its seed and require it to equal the frozen file
$NODE run-construct.ts 20261027 "$RES/constructed.regenerated.json"
cmp "$RES/constructed.regenerated.json" "$FZ/constructed/constructed.json" && rm "$RES/constructed.regenerated.json"
# 2. plan every frozen set (smoke20 also writes the full visit log), then check independently
run() { # name  frozen-file  [full]
  $NODE run-frozen.ts "$FZ/$2" "$RES/$1.traces.json" "$RES/$1.stats.json" ${3:-}
  $PY "$HERE/check.py" "$FZ/$2" "$RES/$1.traces.json" "$RES/$1.check.json" | tee -a "$RES/check-summary.txt"
}
: > "$RES/check-summary.txt"
run smoke20 smoke20.json full; run seeded500 seeded500.json; run edge50 edge50.json
run holdout-b holdout-b/seeded500.json; run constructed constructed/constructed.json
# 3. rejection testing, domain tests, static no-shortcut audit
$PY "$HERE/reject_test.py" "$RES/constructed.traces.json" "$RES/seeded500.traces.json" "$RES/reject.json" | tee "$RES/reject-summary.txt"
$PY "$HERE/domain_test.py" "$RES/domain.json" | tee "$RES/domain-summary.txt"
$PY "$HERE/no_shortcuts.py" "$SRC" "$RES/no-shortcuts.json" | tee "$RES/no-shortcuts.txt"
# 4. provenance + report
$PY "$HERE/make_repro.py" "$ROOT" "$RES/repro.json"
$PY "$HERE/make_report.py" "$HERE" "$HERE/REPORT.md"
