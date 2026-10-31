import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../dist-mathematics/", import.meta.url));
const types = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
};
createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname,
    file = path === "/" ? "index.html" : path.slice(1);
  if (!["index.html", "app.js", "app.css"].includes(file)) {
    res.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(root + file);
    res
      .writeHead(200, {
        "Content-Type": types[file.slice(file.lastIndexOf("."))],
        "Cache-Control": "no-store",
      })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(Number(process.env.PORT ?? 4176), "0.0.0.0", () =>
  console.log("Mathematics preview listening"),
);
