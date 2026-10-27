FROM oven/bun:1.4.4-slim AS bun-runtime
FROM python:3.12-slim-bookworm
COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun
RUN useradd --create-home --uid 10001 openpath
WORKDIR /app
COPY packages/learning packages/learning
COPY research/geometry-reasoner research/geometry-reasoner
COPY tools/mathematics/unified-u2 tools/mathematics/unified-u2
RUN find /app -type d -exec chmod 755 {} + && find /app -type f -exec chmod 644 {} +
USER openpath
ENV OPENPATH_GEOMETRY_WORKERS=2 OPENPATH_GEOMETRY_QUEUE=128 OPENPATH_GEOMETRY_MEMORY_BYTES=536870912
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD ["bun","tools/mathematics/unified-u2/container-smoke.ts","--health"]
CMD ["bun","tools/mathematics/unified-u2/container-smoke.ts","--serve"]
