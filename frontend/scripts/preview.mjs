/**
 * Serve the production build from dist/ and forward /api to Django, the way a
 * real deployment would. Used to check the built app, not just the dev build.
 *
 *   npm run build && PORT=4173 API_TARGET=http://127.0.0.1:8000 node scripts/preview.mjs
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist", import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const api = new URL(process.env.API_TARGET ?? "http://127.0.0.1:8000");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html not found. Run `npm run build` first.");
  process.exit(1);
}

http
  .createServer((request, response) => {
    if (request.url.startsWith("/api/")) {
      const upstream = http.request(
        {
          hostname: api.hostname,
          port: api.port,
          path: request.url,
          method: request.method,
          headers: { ...request.headers, host: api.host },
        },
        (answer) => {
          response.writeHead(answer.statusCode, answer.headers);
          answer.pipe(response);
        },
      );
      upstream.on("error", () => {
        response.writeHead(502, { "Content-Type": "text/plain" });
        response.end("The OpenPath API is not running on " + api.href);
      });
      request.pipe(upstream);
      return;
    }

    const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname));
    let file = join(dist, path);
    // Never serve anything outside dist/, and send unknown paths to the app.
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
    response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  })
  .listen(port, () => console.log(`\n  OpenPath (production build)  http://localhost:${port}   (API -> ${api.href})\n`));
