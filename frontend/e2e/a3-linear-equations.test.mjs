// Workstream A3: rendering check of the linear-equations explanations in the real renderer (slice harness, ?explain=<id>), desktop and mobile.
// Each must render in full (every step revealed), carry the demonstration label (not "approved"), contain the corrected text, never the
// defective text, and fit the screen (no horizontal overflow). Screenshots go to SHOTS_DIR.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import http from "node:http";
import { extname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? "playwright");
const dist = fileURLToPath(new URL("../dist-slice/", import.meta.url));
const shots = process.env.SHOTS_DIR ?? fileURLToPath(new URL("../../docs/linear-equations-teaching/screenshots/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const C = "MATH.algebra.linear-equations";
const CASES = [
  [`${C}#two_steps`, ["2x + 5 − 5 = 17 − 5", "2x ÷ 2 = 12 ÷ 2", "Check: 2 × 6 + 5 = 17", "Now solve one on your own."], []],
  [`${C}#balance`, ["x − 4 + 4 = 11 + 4", "5x ÷ 5 = 35 ÷ 5", "Undo the + 4 first", "Check: 3 × 5 + 4 = 19"], []],
  [`${C}#both_sides`, ["3x + 4 − x = x + 12 − x", "2x + 4 = 12", "Check: 3 × 4 + 4 = 16 and 4 + 12 = 16"], []],
  [`${C}#brackets`, ["3x − 6 = 2x + 5", "x − 6 + 6 = 5 + 6", "3(x − 2) is 3x − 6, not 3x − 2"], []],
  [`${C}#fix_finish`, ["one wrong answer is", "Not ", "Now solve one on your own."], ["common wrong answer"]],
  [`${C}#fix_distribution`, ["multiplies every term in the bracket", "Not "], ["common wrong answer"]],
  [`${C}#fix_sign_move`, ["without changing its sign", "Not "], ["common wrong answer"]],
  ...["fix_inverse", "fix_divide_all", "fix_one_side", "fix_number_sign", "fix_bracket_sign"].map((id) => [`${C}#${id}`, ["one wrong answer is", "Not ", "Now solve one on your own."], ["common wrong answer"]]),
];
let base, server;
test.before(() => new Promise((ok) => { server = http.createServer((q, r) => { try { const p = q.url === "/" || q.url.startsWith("/?") ? "index.html" : q.url.slice(1).split("?")[0]; r.writeHead(200, { "content-type": types[extname(p)] ?? "text/plain" }); r.end(readFileSync(join(dist, p))); } catch { r.writeHead(404).end(); } }).listen(0, () => { base = `http://localhost:${server.address().port}`; ok(); }); mkdirSync(shots, { recursive: true }); }));
test.after(() => server.close());
for (const [id, must, never] of CASES) for (const [name, viewport] of [["desktop", { width: 1366, height: 800 }], ["mobile", { width: 390, height: 844 }]])
  test(`${id} renders correctly (${name})`, async () => {
    const browser = await chromium.launch(); const page = await browser.newPage({ viewport });
    const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
    try {
      await page.goto(`${base}/?explain=${encodeURIComponent(id)}`);
      await page.waitForSelector(`[data-explanation="${id}"]`);
      const r = await page.evaluate(() => ({ eligible: document.querySelector("[data-explanation]").getAttribute("data-eligible"), status: document.querySelector("[data-explanation]").getAttribute("data-status"), text: document.body.innerText, sw: document.documentElement.scrollWidth, w: window.innerWidth }));
      assert.equal(r.eligible, "true", `shown in demonstration (${r.status})`);
      assert.ok(["pending_review", "revision_required"].includes(r.status), `not approved (${r.status})`);
      const flat = (x) => x.replace(/\s+/g, ""); // typeset maths loses its spaces in innerText
      for (const m of must) assert.ok(flat(r.text).includes(flat(m)), `contains: ${m}`);
      for (const m of never) assert.ok(!r.text.includes(m), `does not contain: ${m}`);
      assert.match(r.text, /Demonstration: this explanation has not been approved by an educator/);
      assert.ok(!/Approved by an educator/.test(r.text), "never labelled approved");
      assert.ok(r.sw <= r.w + 1, `no horizontal overflow (${r.sw} > ${r.w})`);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `${shots}/${id.replace(/[#.]/g, "_")}-${name}.png`, fullPage: true });
    } finally { await browser.close(); }
  });
