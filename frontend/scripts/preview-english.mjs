/**
 * Serve the built English app from dist-english/ (static files only).
 *
 *   npm run english:build && npm run english:preview      -> http://localhost:4174
 *
 * HOST=0.0.0.0 makes it reachable from a phone on the same network (http on a local address: the
 * app works, but browsers allow offline install and some storage features only on https or localhost).
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist-english", import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const host = process.env.HOST ?? "127.0.0.1";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};
if (!existsSync(join(dist, "index.html"))) {
  console.error("dist-english/index.html not found. Run `npm run english:build` first.");
  process.exit(1);
}
http
  .createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname));
    let file = join(dist, path);
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
    response.writeHead(200, {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "Cache-Control": file.endsWith("sw.js") || file.endsWith("index.html") ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    createReadStream(file).pipe(response);
  })
  .listen(port, host, () => console.log(`\n  OpenPath English  http://${host === "0.0.0.0" ? "localhost" : host}:${port}\n`));
