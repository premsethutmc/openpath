/** fast-load@1: compression and "has it changed?" for built files. */
import assert from "node:assert/strict";
import { mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import zlib from "node:zlib";
import { sendStatic } from "./static-send.mjs";

const dir = mkdtempSync(join(tmpdir(), "static-send-"));
const big = "const x = 1; // the same line again and again\n".repeat(5000);
writeFileSync(join(dir, "app.js"), big);
writeFileSync(join(dir, "tiny.js"), "1");
writeFileSync(join(dir, "font.woff2"), Buffer.alloc(5000, 7));
writeFileSync(join(dir, "index.html"), "<!doctype html>" + "<p>hello</p>".repeat(200));
const TYPES = { ".js": "text/javascript", ".html": "text/html", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => { const name = req.url.slice(1); sendStatic(req, res, join(dir, name), { type: TYPES[name.slice(name.lastIndexOf("."))], html: name.endsWith(".html"), headers: { "X-Own": "kept" } }); }).listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
// raw requests: fetch would decompress and hide the encoding
const get = (path, headers = {}, method = "GET") => new Promise((resolve, reject) => { http.request(base() + path, { method, headers }, (res) => { const chunks = []; res.on("data", (c) => chunks.push(c)); res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })); }).on("error", reject).end(); });
test.after(() => server.close());

test("F-1 Brotli when accepted, gzip otherwise, plain when neither; the bytes are the file", async () => {
  const br = await get("/app.js", { "accept-encoding": "gzip, deflate, br" });
  assert.equal(br.headers["content-encoding"], "br");
  assert.equal(zlib.brotliDecompressSync(br.body).toString(), big);
  assert.ok(br.body.length < big.length / 20, "much smaller");
  assert.equal(Number(br.headers["content-length"]), br.body.length);
  const gz = await get("/app.js", { "accept-encoding": "gzip" });
  assert.equal(gz.headers["content-encoding"], "gzip");
  assert.equal(zlib.gunzipSync(gz.body).toString(), big);
  const plain = await get("/app.js");
  assert.equal(plain.headers["content-encoding"], undefined);
  assert.equal(plain.body.toString(), big);
  for (const r of [br, gz, plain]) assert.deepEqual([r.headers["vary"], r.headers["x-own"], r.headers["cache-control"]], ["Accept-Encoding", "kept", "private, no-cache"]);
});

test("F-2 a second visit asks 'has it changed?' and gets no body; a changed file is sent again", async () => {
  const first = await get("/app.js", { "accept-encoding": "br" });
  const again = await get("/app.js", { "accept-encoding": "br", "if-none-match": first.headers.etag });
  assert.deepEqual([again.status, again.body.length], [304, 0]);
  writeFileSync(join(dir, "app.js"), big + "// changed\n");
  utimesSync(join(dir, "app.js"), new Date(), new Date(Date.now() + 5000));
  const changed = await get("/app.js", { "accept-encoding": "br", "if-none-match": first.headers.etag });
  assert.equal(changed.status, 200);
  assert.notEqual(changed.headers.etag, first.headers.etag);
  assert.ok(zlib.brotliDecompressSync(changed.body).toString().endsWith("// changed\n"), "never the old compressed copy");
});

test("F-3 the page is never kept; fonts and tiny files are sent as they are; HEAD has no body", async () => {
  const page = await get("/index.html", { "accept-encoding": "br" });
  assert.deepEqual([page.headers["cache-control"], page.headers["content-encoding"]], ["no-store", "br"]);
  assert.equal((await get("/index.html", { "if-none-match": page.headers.etag })).status, 200, "the page is always sent");
  assert.equal((await get("/font.woff2", { "accept-encoding": "br" })).headers["content-encoding"], undefined);
  assert.equal((await get("/tiny.js", { "accept-encoding": "br" })).headers["content-encoding"], undefined);
  const head = await get("/app.js", { "accept-encoding": "br" }, "HEAD");
  assert.deepEqual([head.status, head.body.length, head.headers["content-encoding"]], [200, 0, "br"]);
});
