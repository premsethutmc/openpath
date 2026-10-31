#!/usr/bin/env bash
# Integration M1 closure: slice (real clock) -> Django event store -> fresh login -> rebuilt evidence in a new process.
set -euo pipefail
cd "$(dirname "$0")/../.."
T=${M1_TMP:-$(mktemp -d)}
( cd frontend && node --import tsx scripts/slice-persistence.mts export "$T/events.json" "$T/inmem.json" )
( cd backend && eval "$(./vendor-deps.sh)" && M1_EVENTS="$T/events.json" M1_STORED="$T/stored.json" python3 manage.py test family.test_integration_m1.PersistenceRoundTrip 2>&1 | tail -4 )
( cd frontend && node --import tsx scripts/slice-persistence.mts verify "$T/stored.json" "$T/inmem.json" )
