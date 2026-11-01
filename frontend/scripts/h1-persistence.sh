#!/usr/bin/env bash
# Workstream H1: a paused learner -> Django (each record at its own time) + an educator acknowledgement -> fresh login -> new process.
set -euo pipefail
cd "$(dirname "$0")/../.."
T=${H1_TMP:-$(mktemp -d)}
( cd frontend && node --import tsx scripts/h1-persistence.mts export "$T" )
( cd backend && eval "$(./vendor-deps.sh)" && H1_DIR="$T" python3 manage.py test family.test_handover.HandoverPersistence 2>&1 | tail -4 )
( cd frontend && node --import tsx scripts/h1-persistence.mts verify "$T" )
