# Stable Render Dockerfile for feature previews. Never uses production data or model credentials.
FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS web
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY frontend/package.json frontend/package-lock.json frontend/
# Optional CA for development networks with TLS inspection; absent on ordinary Render builds.
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    cd frontend && npm ci --no-audit --no-fund
COPY . .
RUN cd frontend \
 && node scripts/build-mathematics-journey.mjs \
 && node scripts/build-tamil.mjs \
 && cp -r dist-tamil dist-english/tamil

FROM python:3.12-slim-bookworm@sha256:34386ef0cb081344d7ec1c103ba398e6e9f64e9ab3a1509accc92a4e24a07258
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY --from=web /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export PIP_CERT=/run/secrets/build_ca; fi; \
    pip install --no-cache-dir -r backend/requirements.txt gunicorn==23.0.0 packaging==26.3 \
 && useradd --create-home --uid 10001 preview \
 && mkdir /app/preview-data && chown preview:preview /app/preview-data
COPY backend backend
COPY content content
COPY shared shared
COPY --from=web /app/frontend/dist-english frontend/dist-english
COPY frontend/scripts/preview-server.mjs frontend/scripts/preview-server.mjs
COPY deploy/preview/start.sh deploy/preview/start.sh
# A cloud checkout can have a restrictive umask. Runtime sources stay root-owned but readable by the app user.
RUN find /app -type d -exec chmod 755 {} + \
 && find /app -type f -exec chmod 644 {} +
USER preview
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
 CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','10000')+'/healthz',timeout=3)"
CMD ["sh", "deploy/preview/start.sh"]
