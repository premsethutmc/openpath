#!/usr/bin/env bash
# Regenerates the frozen datasets from their seeds, verifies them with the SymPy-free oracle, rebuilds DATASETS.md and
# the dataset section of the milestone document, and requires the regenerated files to match the committed hashes.
# Needs python3 and vendored SymPy (VENDOR=/path/sympy:/path/mpmath; default /home/claude/vendor/...).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../../.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
python3 "$HERE/gen_domain_sets.py" "$TMP/frozen"
if [ -d "$HERE/frozen" ]; then
  for f in dev eval holdout unsupported adversarial claims; do cmp "$TMP/frozen/$f.json" "$HERE/frozen/$f.json"; done
  echo "regenerated datasets are byte-identical to the committed ones"
else mkdir -p "$HERE/frozen" && cp "$TMP/frozen/"*.json "$HERE/frozen/"; fi
mkdir -p "$HERE/results"
python3 "$HERE/verify_datasets.py" "$HERE/frozen" "$HERE/results/verify.json" | tee "$HERE/results/verify.txt"
python3 "$HERE/summarize_datasets.py" "$HERE/frozen" "$HERE/results/verify.json" "$HERE/DATASETS.md"
python3 - "$HERE/DATASETS.md" "$ROOT/docs/milestones/DOMAIN_AWARE_REASONER.md" <<'PY'
import sys, re
tbl = open(sys.argv[1]).read().split('\n', 1)[1]
doc = open(sys.argv[2]).read()
doc = re.sub(r'<!-- DATASETS:BEGIN -->.*<!-- DATASETS:END -->', lambda m: '<!-- DATASETS:BEGIN -->\n' + tbl.replace('\n## ', '\n### ').replace('# Frozen datasets', '###') + '<!-- DATASETS:END -->', doc, flags=re.S)
open(sys.argv[2], 'w').write(doc)
PY
