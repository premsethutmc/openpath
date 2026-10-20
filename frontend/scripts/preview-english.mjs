/**
 * Serve the built English app from dist-english/ (static files only).
 *
 *   npm run english:build && npm run english:preview      -> http://localhost:4174
 *
 * HOST=0.0.0.0 makes it reachable from a phone on the same network (http on a local address: the
 * app works, but browsers allow offline install and some storage features only on https or localhost).
 *
 * Parent accounts: API_TARGET=http://127.0.0.1:8000 forwards /api/ to Django, so the app and the API share one
 * origin (the session cookie stays first-party and CSRF checks see the same host). The original Host header is
 * kept for that reason. Without API_TARGET, /api/ answers 404 and the app offers device-only use.
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// DIST serves another build folder (the pilot boundary's browser test serves a pilot build from dist-english-pilot)
const dist = fileURLToPath(new URL(`../${process.env.DIST ?? "dist-english"}`, import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const host = process.env.HOST ?? "127.0.0.1";
const api = process.env.API_TARGET ? new URL(process.env.API_TARGET) : null;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};
/** The build's _headers file (the format static hosts use): path patterns, each with indented headers. */
function headerRules() {
  const f = join(dist, "_headers");
  if (!existsSync(f)) return [];
  const rules = [];
  for (const line of readFileSync(f, "utf8").split("\n")) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) rules.push({ pattern: line.trim(), headers: {} });
    else if (rules.length) {
      const k = line.indexOf(":");
      rules[rules.length - 1].headers[line.slice(0, k).trim()] = line.slice(k + 1).trim();
    }
  }
  return rules;
}
const matches = (pattern, path) => (pattern.endsWith("*") ? path.startsWith(pattern.slice(0, -1)) : path === pattern);
if (!existsSync(join(dist, "index.html"))) {
  console.error("dist-english/index.html not found. Run `npm run english:build` first.");
  process.exit(1);
}
http
  .createServer((request, response) => {
    if (request.url.startsWith("/api/")) {
      if (!api) {
        // no account server: say so plainly (200, so the browser logs no error), and refuse everything else
        const status = request.url.startsWith("/api/account/") && request.method === "GET";
        response.writeHead(status ? 200 : 404, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        response.end(JSON.stringify(status ? { authenticated: false, accounts: false } : { detail: "This build has no account server: it works on this device only." }));
        return;
      }
      const upstream = http.request(
        { hostname: api.hostname, port: api.port, path: request.url, method: request.method, headers: { ...request.headers, "x-forwarded-proto": "http" } },
        (answer) => {
          response.writeHead(answer.statusCode, answer.headers);
          answer.pipe(response);
        },
      );
      upstream.on("error", () => {
        response.writeHead(502, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ detail: "The OpenPath API is not running." }));
      });
      request.pipe(upstream);
      return;
    }
    const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname));
    // the developer dashboard is the same app at /developer; without a trailing slash so relative asset paths resolve
    if (path.length > 1 && path.endsWith("/") && path.startsWith("/developer")) {
      response.writeHead(301, { Location: "/developer" });
      response.end();
      return;
    }
    let file = join(dist, path);
    // a folder with its own entry point (the mathematics home at /maths/) serves that; anything else is the English app
    if (file.startsWith(dist) && path.length > 1 && path.endsWith("/") && existsSync(join(file, "index.html"))) file = join(file, "index.html");
    else if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
    const served = "/" + file.slice(dist.length + 1).replace(/\\/g, "/");
    const extra = Object.assign({}, ...headerRules().filter((r) => matches(r.pattern, served)).map((r) => r.headers));
    response.writeHead(200, {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
      ...extra,
    });
    createReadStream(file).pipe(response);
  })
  .listen(port, host, () => console.log(`\n  OpenPath English  http://${host === "0.0.0.0" ? "localhost" : host}:${port}${api ? `   (API -> ${api.href})` : "   (no account server)"}\n`));
