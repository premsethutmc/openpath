#!/usr/bin/env bash
# Codespaces postCreateCommand: install the backend and frontend dependencies and build the English app.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m pip install --user --quiet -r backend/requirements.txt
cd frontend
npm ci
npm run english:build
