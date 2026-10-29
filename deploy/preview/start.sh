#!/bin/sh
# Preview-only account database and one-origin password gate. No production environment is reused.
set -eu
cd "$(dirname "$0")/../.."
APP_DIR="$(pwd)"
export DJANGO_SETTINGS_MODULE=config.preview
export DJANGO_DEBUG=0
export OPENPATH_BEHIND_HTTPS_PROXY=0
export OPENPATH_PREVIEW_DATA_DIR="${OPENPATH_PREVIEW_DATA_DIR:-${APP_DIR}/preview-data}"
export DEMO_API_TARGET="http://127.0.0.1:${PREVIEW_API_PORT:-8000}"
export OPENPATH_ESSAY_EVALUATOR=disabled OPENPATH_EVALUATION_ADAPTER=disabled
unset DATABASE_URL OPENPATH_LLM_API_KEY OPENAI_API_KEY ANTHROPIC_API_KEY
# Grading authority (SHADOW_RELEASE_CHECKLIST.md): set explicitly, never by default. Shadow is approved; legacy is the rollback mode.
# Switching to unified needs separate owner approval, so this deployment refuses to start with it.
export OPENPATH_GRADING="${OPENPATH_GRADING:-shadow}"
case "$OPENPATH_GRADING" in
    shadow|legacy) ;;
    *) echo "OPENPATH_GRADING=${OPENPATH_GRADING} is not approved for this deployment (shadow or legacy only)" >&2; exit 1 ;;
esac
HOST_NAME="${RENDER_EXTERNAL_HOSTNAME:-localhost}"
export DJANGO_ALLOWED_HOSTS="${HOST_NAME},localhost,127.0.0.1"
export DJANGO_CSRF_TRUSTED_ORIGINS="${PREVIEW_ORIGIN:-https://${HOST_NAME}}"
export OPENPATH_PASSWORD_RESET_URL="${PREVIEW_ORIGIN:-https://${HOST_NAME}}/#reset"
if [ "${DEMO_ALLOW_HTTP:-0}" = 1 ]; then
    export OPENPATH_SECURE_COOKIES=0
else
    export OPENPATH_SECURE_COOKIES=1
fi
# Refuse missing gate/secret configuration before running migrations.
node --input-type=module -e 'import {configFromEnv} from "./frontend/scripts/preview-server.mjs"; const {problems}=configFromEnv(); if(problems.length){ console.error(problems.join("\n"));process.exit(1); }'
cd "${APP_DIR}/backend"
python manage.py migrate --noinput
python manage.py check --deploy --fail-level ERROR
# The grader bundle decides credit: refuse to start unless it is exactly the one its manifest records and Node can run it.
python -c 'import django,os;os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.preview");django.setup()
from family import kernel_grader as k
import sys
if not (k.node_path() and k.bundle_intact()): sys.exit("grader bundle does not match grader.manifest.json (or Node is missing)")
print("grading mode", os.environ["OPENPATH_GRADING"], "| grader bundle sha256", k.bundle_sha256(), "matches its manifest")'
# One worker keeps the default synthetic SQLite preview usable within a small Render instance.
gunicorn config.wsgi:application --bind "127.0.0.1:${PREVIEW_API_PORT:-8000}" --workers 1 --timeout 60 --access-logfile - &
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
