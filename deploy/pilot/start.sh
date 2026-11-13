#!/bin/sh
# family-pilot@1: one origin behind the site password; accounts and records in the pilot's own PostgreSQL database.
set -eu
cd "$(dirname "$0")/../.."
APP_DIR="$(pwd)"
export DJANGO_SETTINGS_MODULE=config.pilot
export DJANGO_DEBUG=0
export OPENPATH_BEHIND_HTTPS_PROXY=0
export DEMO_API_TARGET="http://127.0.0.1:${PILOT_API_PORT:-8000}"
# home is the OpenPath welcome screen with its two subject tiles (the image is built with OPENPATH_MATHS_TILE=1)
unset DEMO_HOME
export OPENPATH_ESSAY_EVALUATOR=disabled OPENPATH_EVALUATION_ADAPTER=disabled
unset OPENPATH_LLM_API_KEY OPENAI_API_KEY ANTHROPIC_API_KEY
if [ -z "${DATABASE_URL:-}" ]; then
    echo "DATABASE_URL is not set: the pilot keeps real records and will not start without its database." >&2
    exit 1
fi
# Grading authority (SHADOW_RELEASE_CHECKLIST.md): shadow is approved; legacy is the rollback mode. Unified needs separate approval.
export OPENPATH_GRADING="${OPENPATH_GRADING:-shadow}"
case "$OPENPATH_GRADING" in
    shadow|legacy) ;;
    *) echo "OPENPATH_GRADING=${OPENPATH_GRADING} is not approved for this deployment (shadow or legacy only)" >&2; exit 1 ;;
esac
HOST_NAME="${RENDER_EXTERNAL_HOSTNAME:-localhost}"
export DJANGO_ALLOWED_HOSTS="${HOST_NAME},localhost,127.0.0.1"
export DJANGO_CSRF_TRUSTED_ORIGINS="${PILOT_ORIGIN:-https://${HOST_NAME}}"
export OPENPATH_PASSWORD_RESET_URL="${PILOT_ORIGIN:-https://${HOST_NAME}}/#reset"
if [ "${DEMO_ALLOW_HTTP:-0}" = 1 ]; then
    export OPENPATH_SECURE_COOKIES=0
else
    export OPENPATH_SECURE_COOKIES=1
fi
# Refuse missing gate/secret configuration before touching the database.
node --input-type=module -e 'import {configFromEnv} from "./frontend/scripts/preview-server.mjs"; const {problems}=configFromEnv(); if(problems.length){ console.error(problems.join("\n"));process.exit(1); }'
cd "${APP_DIR}/backend"
# migrations only ever add to the schema here; an existing record is never dropped by a deploy
python manage.py migrate --noinput
python manage.py check --deploy --fail-level ERROR
# The grader bundle decides credit: refuse to start unless it is exactly the one its manifest records and Node can run it.
python -c 'import django,os;django.setup()
from family import kernel_grader as k
import sys
if not (k.node_path() and k.bundle_intact()): sys.exit("grader bundle does not match grader.manifest.json (or Node is missing)")
print("grading mode", os.environ["OPENPATH_GRADING"], "| grader bundle sha256", k.bundle_sha256(), "matches its manifest")'
gunicorn config.wsgi:application --bind "127.0.0.1:${PILOT_API_PORT:-8000}" --workers 1 --timeout 60 --access-logfile - &
api_pid=$!
cd "${APP_DIR}/frontend"
node scripts/preview-server.mjs &
web_pid=$!
cleanup() {
    trap - EXIT TERM INT
    kill "$api_pid" "$web_pid" 2>/dev/null || true
    wait "$api_pid" "$web_pid" 2>/dev/null || true
}
trap 'cleanup; exit 0' TERM INT
trap cleanup EXIT
while kill -0 "$api_pid" 2>/dev/null && kill -0 "$web_pid" 2>/dev/null; do
    sleep 1
done
# A failed child must terminate the container, not leave a healthy-looking partial application.
exit 1
