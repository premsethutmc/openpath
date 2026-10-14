#!/usr/bin/env bash
# Start OpenPath for a hands-on test (Codespaces postStartCommand; safe to run again by hand):
#   1. wait for PostgreSQL and apply migrations
#   2. Django API on 127.0.0.1:8000 (not forwarded)
#   3. the built English app on port 4175, forwarding /api/ to Django: one private HTTPS origin
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
[ -f dist-english/index.html ] || npm run english:build
if ! port_open 4175; then
  HOST=0.0.0.0 PORT=4175 API_TARGET=http://127.0.0.1:8000 setsid nohup node scripts/preview-english.mjs > "$LOGS/web.log" 2>&1 < /dev/null &
fi
for _ in $(seq 1 60); do
  if port_open 4175 && port_open 8000; then
    echo
    echo "OpenPath is running. Open on your phone (sign in to GitHub when asked):"
    echo "  $URL"
    echo "Logs: $LOGS/api.log, $LOGS/web.log"
    exit 0
  fi
  sleep 0.5
done
echo "OpenPath did not start; see $LOGS/api.log and $LOGS/web.log" >&2
exit 1
