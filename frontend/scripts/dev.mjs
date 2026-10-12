/**
 * Development server: rebuilds on change, reloads the page, and forwards /api
 * to Django so the browser sees a single origin (no CORS to configure).
 *
 *   PORT=5173  API_TARGET=http://127.0.0.1:8000  node scripts/dev.mjs
 */
import http from "node:http";
import * as esbuild from "esbuild";
import { options, writeIndex } from "./build.mjs";

const port = Number(process.env.PORT ?? 5173);
const api = new URL(process.env.API_TARGET ?? "http://127.0.0.1:8000");

const reload = `<script>new EventSource("/esbuild").addEventListener("change", () => location.reload());</script>`;
await writeIndex(reload);

const context = await esbuild.context(
  options({ sourcemap: true, define: { ...options().define, "process.env.NODE_ENV": '"development"' } }),
);
await context.watch();
// Pin the port: esbuild's default is 8000, which is where Django listens.
const assets = await context.serve({ servedir: "dist", host: "127.0.0.1", port: port + 1 });

http
  .createServer((request, response) => {
    const toApi = request.url.startsWith("/api/");
    const upstream = http.request(
      {
        hostname: toApi ? api.hostname : "127.0.0.1",
        port: toApi ? api.port : assets.port,
        path: request.url,
        method: request.method,
        headers: { ...request.headers, host: toApi ? api.host : `127.0.0.1:${assets.port}` },
      },
      (answer) => {
        response.writeHead(answer.statusCode, answer.headers);
        answer.pipe(response);
      },
    );
    upstream.on("error", () => {
      response.writeHead(502, { "Content-Type": "text/plain" });
      response.end(toApi ? "The OpenPath API is not running on " + api.href : "Build server unavailable");
    });
    request.pipe(upstream);
  })
  .listen(port, () => console.log(`\n  OpenPath  http://localhost:${port}   (API -> ${api.href})\n`));
