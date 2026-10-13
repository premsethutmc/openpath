#!/usr/bin/env bash
# Start the OpenPath English preview server on port 4174 in the background (Codespaces postStartCommand).
# Rebuilds the preview first if the build is missing. Log: /tmp/openpath-preview.log
set -euo pipefail
cd "$(dirname "$0")/../frontend"
if [ ! -f dist-english/index.html ]; then
  [ -d node_modules ] || npm ci
  npm run english:build:preview
fi
if (exec 3<>/dev/tcp/127.0.0.1/4174) 2>/dev/null; then
  echo "OpenPath preview is already running on port 4174"
  exit 0
fi
HOST=0.0.0.0 PORT=4174 setsid nohup node scripts/preview-english.mjs > /tmp/openpath-preview.log 2>&1 < /dev/null &
for _ in $(seq 1 50); do
  if (exec 3<>/dev/tcp/127.0.0.1/4174) 2>/dev/null; then
    echo "OpenPath preview is running on port 4174 (private). Open the PORTS tab for its https address."
    exit 0
  fi
  sleep 0.2
done
echo "The preview server did not start; see /tmp/openpath-preview.log" >&2
exit 1
