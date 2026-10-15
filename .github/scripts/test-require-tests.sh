#!/usr/bin/env bash
# Regression test for require-tests.sh: reported failures and empty runs must fail the step;
# genuine passes must not. Runs in every CI job before the real tests.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
bad=0
expect() { # expect <0|1> <name> <log text>
  printf '%b' "$3" > "$tmp/log"
  if bash "$here/require-tests.sh" "$tmp/log" "self-test" > /dev/null 2>&1; then got=0; else got=1; fi
  if [ "$got" != "$1" ]; then echo "::error title=CI self-test::require-tests.sh case '$2': expected exit $1, got $got"; bad=1; fi
}
expect 1 "django failures"      'Ran 124 tests in 20.0s\n\nFAILED (failures=5, errors=2)\n'
expect 1 "django errors only"   'Ran 3 tests in 0.1s\n\nFAILED (errors=1)\n'
expect 1 "node failures (#)"    '# tests 9\n# pass 8\n# fail 1\n'
expect 1 "node failures (ℹ)"    'ℹ tests 9\nℹ pass 7\nℹ fail 2\n'
expect 1 "no tests ran"         'Ran 0 tests in 0.0s\n\nOK\n'
expect 1 "empty log"            ''
expect 0 "django pass"          'Ran 124 tests in 20.0s\n\nOK\n'
expect 0 "node pass"            '# tests 9\n# pass 9\n# fail 0\n'
[ "$bad" = 0 ] && echo "require-tests.sh rejects failures and empty runs"
exit "$bad"
