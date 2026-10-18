# PR #55 private preview: one container with the account API (Django) and the web apps behind a password.
# Built by Render from render.preview.yaml, or by .github/workflows/preview-smoke.yml for the smoke test.
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json frontend/
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN cd frontend && npm ci --no-audit --no-fund
COPY . .
RUN cd frontend \
 && node scripts/build-mathematics-journey.mjs \
 && node scripts/build-tamil.mjs \
 && rm -rf dist-english/tamil && cp -r dist-tamil dist-english/tamil

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY --from=web /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt gunicorn==23.0.0
COPY backend backend
COPY content content
COPY --from=web /app/frontend/dist-english frontend/dist-english
COPY frontend/scripts/preview-server.mjs frontend/scripts/preview-server.mjs
COPY deploy/preview/start.sh deploy/preview/start.sh
CMD ["sh", "deploy/preview/start.sh"]
