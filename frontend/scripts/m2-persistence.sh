#!/usr/bin/env bash
# Milestone 2: four learners x two sessions through the Django store, rebuilt in separate processes.
set -euo pipefail
cd "$(dirname "$0")/../.."
D=${M2_DIR:-$(mktemp -d)}; mkdir -p "$D"
( cd frontend && node --import tsx scripts/m2-persistence.mts export "$D" )
( cd backend && eval "$(./vendor-deps.sh)" && M2_DIR="$D" python3 manage.py test family.test_integration_m1.MultiLearnerPersistence 2>&1 | tail -4 )
( cd frontend && node --import tsx scripts/m2-persistence.mts verify "$D" )
