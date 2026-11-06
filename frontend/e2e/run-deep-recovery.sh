#!/usr/bin/env bash
# deep-recovery@0 browser journeys (RESEARCH), all three builds, against the real Django API. Synthetic pupils only.
#   bash frontend/e2e/run-deep-recovery.sh            uses Django already on $DEEP_API (CI: the learning-year job's server)
#   START_API=1 bash frontend/e2e/run-deep-recovery.sh  starts Django itself on 127.0.0.1:8014 (local; needs Django importable)
# Builds, in order: --test --deep-recovery (cases "main"), --test --deep-recovery --deep-sitting=12 (case "pause"),
# the shipped build without flags (case "shipped"). It leaves the shipped build in dist-english/year.
set -euo pipefail
cd "$(dirname "$0")/.."
export DEEP_API="${DEEP_API:-http://127.0.0.1:8014}"
export OPENPATH_TEST_CLOCK_FILE="${OPENPATH_TEST_CLOCK_FILE:-/tmp/deep-recovery-clock.json}"
OUT="${DEEP_OUT:-/tmp/deep-recovery-e2e}"
mkdir -p "$OUT"
if [[ "${START_API:-0}" == "1" ]]; then
  echo '{}' > "$OPENPATH_TEST_CLOCK_FILE"
  (cd ../backend && python3 manage.py migrate --noinput > "$OUT/migrate.log" 2>&1)
  (cd ../backend && OPENPATH_ACCOUNT_RATE=1000/hour exec python3 manage.py runserver "${DEEP_API#http://}" --noreload --nothreading > "$OUT/api.log" 2>&1) &
  api_pid=$!
  trap 'kill "$api_pid" 2>/dev/null || true' EXIT
  for _ in $(seq 1 60); do curl --fail --silent "$DEEP_API/api/account/" > /dev/null && break; sleep 1; done
fi
run() { # $1 cases, rest: build flags
  local cases="$1"; shift
  node scripts/build-year.mjs "$@" | tail -1
  if ! DEEP_CASES="$cases" SHOTS="$OUT" DEEP_RESULTS="$OUT/$cases.json" FAIL_BODY="$OUT/$cases-fail.html" CHROMIUM_PATH="${CHROMIUM_PATH-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}" \
      node --import tsx e2e/deep-recovery-app.test.mts > "$OUT/$cases.log" 2>&1; then
    cat "$OUT/$cases.log"; echo "::error::deep-recovery browser journeys failed: $cases"; exit 1
  fi
  tail -1 "$OUT/$cases.log"
}
run main,module,goal --test --deep-recovery
run pause --test --deep-recovery --deep-sitting=12
run shipped
echo "deep-recovery browser journeys: main+module+goal, pause, shipped passed (results in $OUT)"
