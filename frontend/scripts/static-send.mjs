/**
 * fast-load@1: how the private servers send a built file.
 *
 *   - compressed (Brotli, or gzip) when the browser accepts it. The Maths app is about 14 MB of script; compressed it is
 *     about 2 MB. Each file is compressed once per process and kept in memory (keyed by path, size and modified time).
 *   - an ETag on every file, and "private, no-cache" on everything but the page itself: the browser keeps its copy and
 *     asks only "has it changed?" (a 304 with no body) on later visits. The page (HTML) is never kept ("no-store").
 *     Never "public": these files sit behind a password.
 *
 * No dependency: node:zlib only. Small files (under 1 kB) and already-compressed kinds (fonts, images) are sent as they are.
 */
import { createReadStream, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { promisify } from "node:util";
import zlib from "node:zlib";

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".map", ".svg", ".txt", ".webmanifest", ".wasm"]);
/** path|encoding → { tag, body: Promise<Buffer> } */
const cache = new Map();
/** at most this much compressed output is kept; beyond it the oldest entries go */
const CACHE_LIMIT = 64 * 1024 * 1024;
let cached = 0;

function compressed(file, tag, encoding) {
  const key = `${file}|${encoding}`;
  const hit = cache.get(key);
  if (hit && hit.tag === tag) return hit.body;
  // quality 5: close to the best size for script at a fraction of the time (this runs once per file per process)
  const body = readFile(file).then((raw) => (encoding === "br" ? brotli(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } }) : gzip(raw, { level: 6 })));
  cache.set(key, { tag, body });
  body.then((b) => {
    cached += b.length;
    for (const [k, v] of cache) { if (cached <= CACHE_LIMIT || k === key) break; cache.delete(k); v.body.then((old) => { cached -= old.length; }, () => {}); }
  }, () => cache.delete(key));
  return body;
}

/**
 * Sends `file` (which exists and is a file). `headers` are the caller's own (security headers, CSP); this adds the type's
 * caching, ETag, Vary and Content-Encoding. Returns when the response has been started.
 */
export async function sendStatic(req, res, file, { type, headers = {}, html = false }) {
  const st = statSync(file);
  const tag = `W/"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
  const common = { ...headers, "Content-Type": type, "Cache-Control": html ? "no-store" : "private, no-cache", ETag: tag, Vary: "Accept-Encoding" };
  if (!html && req.headers["if-none-match"] === tag) { res.writeHead(304, common); return res.end(); }
  const accepts = String(req.headers["accept-encoding"] ?? "");
  const encoding = !COMPRESSIBLE.has(extname(file)) || st.size < 1024 ? null : /\bbr\b/.test(accepts) ? "br" : /\bgzip\b/.test(accepts) ? "gzip" : null;
  if (!encoding) {
    res.writeHead(200, { ...common, "Content-Length": st.size });
    if (req.method === "HEAD") return res.end();
    return void createReadStream(file).on("error", () => res.destroy()).pipe(res);
  }
  let body;
  try { body = await compressed(file, tag, encoding); } catch { res.writeHead(500, { ...headers, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }); return res.end("Server error"); }
  res.writeHead(200, { ...common, "Content-Encoding": encoding, "Content-Length": body.length });
  res.end(req.method === "HEAD" ? undefined : body);
}
