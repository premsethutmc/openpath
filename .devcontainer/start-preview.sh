#!/usr/bin/env bash
# Start OpenPath for a hands-on test (Codespaces postStartCommand; safe to run again by hand):
#   1. wait for PostgreSQL and apply migrations
#   2. Django API on 127.0.0.1:8000 (not forwarded)
#   3. the built English app on port 4175, forwarding /api/ to Django: one private HTTPS origin
#   4. a one-time developer code (24 hours) for the /developer diagnostics, printed below and nowhere else
# Development settings only: a random secret made in this codespace, cookies HTTPS-only, the codespace's own
# address trusted for CSRF. Reset emails are printed to /tmp/openpath/api.log (no SMTP here).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS=/tmp/openpath
mkdir -p "$LOGS"
port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
NAME="${CODESPACE_NAME:-localhost}"
URL="https://${NAME}-4175.${DOMAIN}"
SECRET_FILE="$HOME/.openpath-preview-secret"
[ -s "$SECRET_FILE" ] || python3 -c 'import secrets; print(secrets.token_urlsafe(48))' > "$SECRET_FILE"
chmod 600 "$SECRET_FILE"

export DATABASE_URL="postgres://openpath:openpath@127.0.0.1:5432/openpath"
export DJANGO_DEBUG=0
export DJANGO_SECRET_KEY="$(cat "$SECRET_FILE")"
export DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1,.${DOMAIN}"
export DJANGO_CSRF_TRUSTED_ORIGINS="$URL"
export OPENPATH_SECURE_COOKIES=1
export OPENPATH_PASSWORD_RESET_URL="$URL/#reset"
export OPENPATH_COMMIT="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"

# Servers left running from another commit (after a git checkout or pull, or started by an older copy of this
# script that recorded no commit) would serve old API code behind a new app. Stop them unless they are known to be
# running this exact commit; they are started again below. The database is not touched.
stop_servers() {
  pkill -f "manage.py runserver 127.0.0.1:8000" || true
  pkill -f "scripts/preview-english.mjs" || true
  for _ in $(seq 1 20); do port_open 8000 || port_open 4175 || break; sleep 0.25; done
}
if [ "$(cat "$LOGS/running-commit" 2>/dev/null)" != "$OPENPATH_COMMIT" ]; then
  stop_servers
fi
echo "$OPENPATH_COMMIT" > "$LOGS/running-commit"

# HTTP status of a GET (000 when there is no answer within 5 seconds)
http_status() { python3 -c "import sys,urllib.request,urllib.error
try: print(urllib.request.urlopen(sys.argv[1], timeout=5).status)
except urllib.error.HTTPError as e: print(e.code)
except Exception: print('000')" "$1"; }

cd "$ROOT/backend"
for _ in $(seq 1 60); do
  if python3 -c "import psycopg; psycopg.connect('$DATABASE_URL').close()" 2>/dev/null; then break; fi
  sleep 1
done
python3 manage.py migrate --noinput
if ! port_open 8000; then
  setsid nohup python3 manage.py runserver 127.0.0.1:8000 --noreload > "$LOGS/api.log" 2>&1 < /dev/null &
fi

cd "$ROOT/frontend"
# rebuild when the checked-out commit changed (after a git pull), so the app and the API are the same version
if [ ! -f dist-english/index.html ] || [ "$(cat dist-english/BUILD 2>/dev/null)" != "$OPENPATH_COMMIT" ]; then
  npm run english:build && echo "$OPENPATH_COMMIT" > dist-english/BUILD
fi
if ! port_open 4175; then
  HOST=0.0.0.0 PORT=4175 API_TARGET=http://127.0.0.1:8000 setsid nohup node scripts/preview-english.mjs > "$LOGS/web.log" 2>&1 < /dev/null &
fi
for _ in $(seq 1 60); do
  if port_open 4175 && port_open 8000; then
    # the API behind the app must be this commit's: the developer route exists (403 when signed out, never 404)
    API_STATUS="$(http_status http://127.0.0.1:4175/api/developer/status/)"
    if [ "$API_STATUS" != "403" ] && [ "$API_STATUS" != "401" ]; then
      sleep 0.5
      API_STATUS="$(http_status http://127.0.0.1:4175/api/developer/status/)"
    fi
    if [ "$API_STATUS" = "404" ]; then
      if [ -n "${OPENPATH_PREVIEW_RESTARTED:-}" ]; then
        echo "The API on port 4175 still has no developer routes after a restart; see $LOGS/api.log" >&2
        exit 1
      fi
      echo "The API answering on port 4175 is older code (no developer routes). Stopping it and starting again." >&2
      stop_servers
      OPENPATH_PREVIEW_RESTARTED=1 exec bash "$0"
    fi
    echo
    echo "OpenPath is running. Open on your phone (sign in to GitHub when asked):"
    echo "  $URL"
    echo "Logs: $LOGS/api.log, $LOGS/web.log"
    CODE="$(cd "$ROOT/backend" && python3 manage.py developer issue-claim 2>/dev/null || true)"
    if [ -n "$CODE" ]; then
      echo
      echo "Developer diagnostics: sign in at $URL/developer and enter this one-time code"
      echo "(it works once, within 24 hours, for the account that enters it):"
      echo "  $CODE"
    fi
    exit 0
  fi
  sleep 0.5
done
echo "OpenPath did not start; see $LOGS/api.log and $LOGS/web.log" >&2
exit 1
