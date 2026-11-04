// Workstream A2: rendering check of the four corrected explanations in the real renderer (slice harness, ?explain=<id>), desktop and mobile.
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
const shots = process.env.SHOTS_DIR ?? fileURLToPath(new URL("../../docs/teaching-content-safety/screenshots/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const CASES = [
  ["MATH.number.multiplication-tables#doubling", ["7 → 14 → 28 → 56", "double twice more: 28, then 56", "7 × 8 = 56"], ["double three times: 28"]],
  ["MATH.algebra.missing-number#worked_steps", ["If the box was taken away from a number, the box is the gap", "13 − 3 = 10"], ["Do the opposite to the other number"]],
  ["MATH.algebra.missing-number#check_what_it_uses", ["If a number was taken away from the box, add it back", "If the box was multiplied by a number, divide"], ["Do the opposite to the other number"]],
  ["MATH.number.rational-numbers#spot_the_mistake", ["Work out 2/5 × (−7/9).", "A common wrong answer is 14/45", "−14/45"], ["“Work out 2/5 ×”"]],
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
