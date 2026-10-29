#!/usr/bin/env bash
# The complete curriculum grading audit, end to end. Deterministic and resumable: every stage writes one file per family and skips
# families already done, so an interrupted run continues where it stopped. Delete data/<stage>/ to recompute a stage.
#   tools/mathematics/grading-audit/run-audit.sh            (from the repository root)
set -euo pipefail
cd "$(dirname "$0")"
eval "$(../../../backend/vendor-deps.sh --audit)"
mkdir -p data
[ -f data/baseline.json ] || bun baseline.ts data/baseline.json
[ -f data/samples.jsonl ] || bun sample.ts data/samples.jsonl
[ -f data/parity.json ] || bun parity.ts data/parity.json
python3 -m unittest discover -s oracle -p 'test_*.py' >&2
(cd oracle && ORACLE_PROCS="${ORACLE_PROCS:-8}" python3 oracle.py ../data/samples.jsonl ../data/oracle)
bun run-client.ts data/oracle data/client
(cd ../../../backend && python3 ../tools/mathematics/grading-audit/run-backend.py ../tools/mathematics/grading-audit/data/oracle ../tools/mathematics/grading-audit/data/backend ../tools/mathematics/grading-audit/data/samples.jsonl)
python3 score.py data/oracle data/client data/backend data/results
gzip -kf -9 data/results/findings.jsonl
# certification (decision 1): only from a run of the unified path; review the diff of the registry before committing it
[ "${CERTIFY:-0}" = 1 ] && python3 certify.py data/results "grading-audit:results" "grading-oracle@1"
[ -f data/family-meta.json ] || bun family-meta.ts data/family-meta.json
[ -f data/question-policies.json ] || bun policies.ts data/question-policies.json
python3 inventory.py data/inventory.json
