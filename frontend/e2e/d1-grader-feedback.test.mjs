// Workstream D1: the reference problem "3x = 19 − 4" in the real slice screen (?start=le-ref-3x-19-4), desktop and mobile. The learner types
// each submission into the existing answer field; the page grades it through the real flow (trusted grader with the working judged by the
// derivation authority) and shows the feedback and the learner's own lines as judged. Asserts what the screen says; screenshots to SHOTS_DIR.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { extname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? "playwright");
const dist = fileURLToPath(new URL("../dist-slice/", import.meta.url));
const shots = process.env.SHOTS_DIR ?? fileURLToPath(new URL("../../docs/grader-teaching-integration/screenshots/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
// [case, typed, verdict label shown, must contain, must not contain]
const CASES = [
  ["A", "x = 4", "Not quite right", ["Put x = 4 into 3x = 19 − 4", "the left side is 12 and the right side is 15"], ["first step that does not follow", "method was verified"]],
  ["B", "x = 5", "Correct", ["That answer is right.", "You gave the answer only, so your method was not checked."], ["Every line of your working was checked"]],
  ["C", "3x = 15; x = 5", "Correct", ["Every line of your working was checked", "Checked: follows from the line before"], ["not checked"]],
  ["D", "3x = 15; x = 4", "Not quite right", ["The first step that does not follow is x = 4", "x = 5 makes 3x = 15 true but not x = 4", "First step that does not follow", "Checked: follows from the line before"], []],
  ["E", "3x = 16; x = 16/3", "Not quite right", ["The first step that does not follow is 3x = 16", "x = 5 makes 3x = 19 − 4 true but not 3x = 16"], []],
  ["F", "3x = 15", "Not marked", ["Your working is right so far", "It is not finished"], ["Not quite right", "is not the solution"]],
  ["G", "3x = 15 => x = 5; x = 5", "Correct", ["could not be checked automatically, so it is not marked right or wrong"], ["first step that does not follow", "Every line of your working was checked"]],
];
let base, server;
const seen = [];
test.before(() => new Promise((ok) => { server = http.createServer((q, r) => { try { const p = q.url === "/" || q.url.startsWith("/?") ? "index.html" : q.url.slice(1).split("?")[0]; r.writeHead(200, { "content-type": types[extname(p)] ?? "text/plain" }); r.end(readFileSync(join(dist, p))); } catch { r.writeHead(404).end(); } }).listen(0, () => { base = `http://localhost:${server.address().port}`; ok(); }); mkdirSync(shots, { recursive: true }); }));
test.after(() => { server.close(); writeFileSync(join(shots, "d1-screens.json"), JSON.stringify(seen, null, 1) + "\n"); });
for (const [id, typed, label, must, never] of CASES) for (const [name, viewport] of [["desktop", { width: 1366, height: 800 }], ["mobile", { width: 390, height: 844 }]])
  test(`case ${id} "${typed}" (${name})`, async () => {
    const browser = await chromium.launch(); const page = await browser.newPage({ viewport });
    const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
    try {
      await page.goto(`${base}/?start=le-ref-3x-19-4`);
      await page.waitForSelector(".lr-input-field");
      assert.match(await page.textContent("body"), /Solve 3x = 19 − 4\. What is x\?/);
      await page.fill(".lr-input-field", typed);
      assert.equal(await page.inputValue(".lr-input-field"), typed, "the answer field keeps the working as typed");
      await page.press(".lr-input-field", "Enter");
      await page.waitForSelector(".lr-feedback");
      const r = await page.evaluate(() => ({ verdict: document.querySelector(".lr-feedback-verdict")?.textContent ?? "", text: document.body.innerText, w: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth,
        reply: window.__slice.flow.session.replies.at(-1) }));
      const flat = (x) => x.replace(/\s+/g, "");
      assert.ok(r.verdict.includes(label), `verdict label ${label}: ${r.verdict}`);
      for (const m of must) assert.ok(flat(r.text).includes(flat(m)), `contains: ${m}`);
      for (const m of never) assert.ok(!r.text.includes(m), `does not contain: ${m}`);
      assert.ok(r.sw <= r.w + 1, `no horizontal overflow (${r.sw} > ${r.w})`);
      assert.deepEqual(errors, []);
      seen.push({ case: id, viewport: name, typed, verdict: r.reply.verdict, reason: r.reply.reason, working: r.reply.decision?.working ? { status: r.reply.decision.working.status, methodEvidence: r.reply.decision.working.methodEvidence, firstInvalid: r.reply.decision.working.firstInvalid?.index ?? null } : null, label: r.verdict.trim() });
      await page.screenshot({ path: `${shots}/d1-case-${id}-${name}.png`, fullPage: true });
    } finally { await browser.close(); }
  });
