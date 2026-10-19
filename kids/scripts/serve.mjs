/**
 * Serve dist/index.html on the local network for a phone or tablet preview.
 *   npm run build && PORT=4180 npm run serve
 * Only the one built file is served; there is no API.
 */
import { readFileSync, existsSync } from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("../dist/index.html", import.meta.url));
if (!existsSync(file)) {
  console.error("dist/index.html not found. Run `npm run build` first.");
  process.exit(1);
}
const port = Number(process.env.PORT ?? 4180);
const host = process.env.HOST ?? "127.0.0.1";
http
  .createServer((req, res) => {
    if (req.url === "/healthz") return res.end("ok");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(readFileSync(file));
  })
  .listen(port, host, () => console.log(`OpenPath Kids on http://${host}:${port}`));
