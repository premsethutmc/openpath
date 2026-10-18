#!/bin/sh
# Start the preview: migrate the preview's own database, run Django on 127.0.0.1 only, then the password-gated web
# server on $PORT, which forwards /api/ to Django. Synthetic test use only.
set -eu
HOST_NAME="${RENDER_EXTERNAL_HOSTNAME:-localhost}"
export DJANGO_DEBUG=0
export DJANGO_ALLOWED_HOSTS="${HOST_NAME},localhost,127.0.0.1"
export DJANGO_CSRF_TRUSTED_ORIGINS="${PREVIEW_ORIGIN:-https://${HOST_NAME}}"
export OPENPATH_PASSWORD_RESET_URL="${PREVIEW_ORIGIN:-https://${HOST_NAME}}/#reset"
cd /app/backend
python manage.py migrate --noinput
gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 2 --timeout 60 --access-logfile - &
cd /app/frontend
export DEMO_API_TARGET=http://127.0.0.1:8000
exec node scripts/preview-server.mjs
