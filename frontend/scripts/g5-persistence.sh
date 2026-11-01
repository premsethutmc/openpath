#!/usr/bin/env bash
# G5: geometry submissions -> Django event store (the trusted grader bundle decides each) -> fresh login -> projection in a new process.
set -euo pipefail
cd "$(dirname "$0")/../.."
T=${G5_TMP:-$(mktemp -d)}
( cd frontend && node --import tsx scripts/g5-persistence.mts export "$T/events.json" "$T/inmem.json" )
( cd backend && eval "$(./vendor-deps.sh)" && M1_EVENTS="$T/events.json" M1_STORED="$T/stored.json" python3 manage.py test family.test_integration_m1.PersistenceRoundTrip 2>&1 | tail -4 )
( cd frontend && node --import tsx scripts/g5-persistence.mts verify "$T/stored.json" "$T/inmem.json" )
