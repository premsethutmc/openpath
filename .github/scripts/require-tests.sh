#!/usr/bin/env bash
# Guard against a test step that "passes" because it found nothing to run, and
# put the test count on the workflow run page.
#
#   require-tests.sh <log file> <title>
#
# Understands Django's "Ran N tests" and Node's "# pass N" summaries. The test
# command's own exit status still decides pass or fail; this only checks N > 0.
set -euo pipefail

log="$1"
title="$2"

if grep -qE '^Ran [0-9]+ tests?' "$log"; then
  count=$(grep -oE '^Ran [0-9]+' "$log" | tail -n 1 | grep -oE '[0-9]+')
else
  count=$(grep -oE '^(#|ℹ) pass [0-9]+' "$log" | tail -n 1 | grep -oE '[0-9]+' || true)
fi

if [ "${count:-0}" -eq 0 ]; then
  echo "::error title=${title}::No tests ran"
  exit 1
fi
echo "::notice title=${title}::${count} tests passed"
