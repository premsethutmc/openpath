#!/usr/bin/env bash
# recert@1: keep the machine-validation registry current, in one command (docs/product/MACHINE_VALIDATION.md).
#
#   tools/recertify.sh            export every question, re-certify the families that changed (or were never certified),
#                                 record the result in the certification ledger, rebuild the registry and the server grader
#                                 bundle. Commit the changed files with the change that caused them.
#   tools/recertify.sh --check    CI: fail if a family needs re-certification or the committed registry is not the one this
#                                 would build. It never writes a certification and never commits.
#
# A family that changed stops counting as validated on its own (its registry entry is locked to the old fingerprint), so a
# missed run is safe; this check exists so that it is noticed and the family is re-admitted.
# Needs Node with tsx (npm ci in frontend; TS_IMPORT overrides the loader). The full run also needs SymPy for the references:
#   eval "$(backend/vendor-deps.sh --audit)"      # SymPy / mpmath from GitHub tags, no package index needed
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="${TS_IMPORT:-tsx}"
EXP="$(mktemp -d)"
trap 'rm -rf "$EXP"' EXIT
mv_() { (cd "$ROOT/frontend" && node --import "$TS" ../packages/learning/scripts/machine-validation.ts "$@"); }

(cd "$ROOT/frontend" && node --import "$TS" ../tools/mathematics/answer-key-certification/export.ts "$EXP" >/dev/null)
STALE="$(mv_ stale "$EXP" | tail -1)"
# families with no reference at all stay held and are reported by the registry; they are not a reason to fail
KNOWN_HELD="$(python3 -c "import json,sys;print(','.join(sorted(k for k,v in json.load(open(sys.argv[1]))['held'].items() if v.startswith('never certified'))))" "$ROOT/content/learning/machine-validation.v1.json")"

if [ "${1:-}" = "--check" ]; then
  NEW="$(python3 -c "import sys;print(','.join(sorted(set(filter(None,sys.argv[1].split(',')))-set(filter(None,sys.argv[2].split(','))))))" "$STALE" "$KNOWN_HELD")"
  if [ -n "$NEW" ]; then
    echo "recert@1: these families changed since they were certified (or are new): $NEW"
    echo "They no longer count as validated. Run tools/recertify.sh and commit the result."
    exit 1
  fi
  mv_ build "$EXP"
  if ! git -C "$ROOT" diff --quiet -- content/learning/machine-validation.v1.json; then
    echo "recert@1: content/learning/machine-validation.v1.json is not what the ledger and today's content build."
    echo "Run tools/recertify.sh and commit the result."
    git -C "$ROOT" diff --stat -- content/learning/machine-validation.v1.json
    exit 1
  fi
  echo "recert@1: the registry is current."
  exit 0
fi

if [ -n "$STALE" ]; then
  python3 "$ROOT/packages/learning/scripts/recertify.py" --data "$EXP" --out "$EXP/recert" --family "$STALE"
  mv_ ledger-add "$EXP" "$EXP/recert" "recert:$(git -C "$ROOT" rev-parse --short HEAD)"
fi
mv_ build "$EXP"
(cd "$ROOT" && node tools/mathematics/server-grader/build.mjs)
git -C "$ROOT" status --short -- content/learning backend/family/grader
