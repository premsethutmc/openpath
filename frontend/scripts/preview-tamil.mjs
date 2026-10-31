/** Static preview follows the English build convention; no API or external service required. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../dist-tamil/", import.meta.url));
const files = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/assets/app.js", "assets/app.js"],
  ["/assets/app.css", "assets/app.css"],
]);
createServer(async (req, res) => {
  const path = files.get(new URL(req.url, "http://localhost").pathname);
  if (!path) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  try {
    const body = await readFile(root + path);
    res.writeHead(200, {
      "Content-Type": path.endsWith(".js")
        ? "text/javascript; charset=utf-8"
        : path.endsWith(".css")
          ? "text/css; charset=utf-8"
          : "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'",
    });
    res.end(body);
  } catch {
    res.writeHead(503);
    res.end("Run npm run tamil:build first");
  }
}).listen(Number(process.env.PORT ?? 4176), "127.0.0.1", () =>
  console.log("Tamil pilot listening on port " + (process.env.PORT ?? 4176)),
);
