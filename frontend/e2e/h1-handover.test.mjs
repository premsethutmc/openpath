// Workstream H1: the hand-over and return journey in the real slice screen, desktop and mobile. Scenario 2b (a learner who keeps the
// forgot-divide error) is paused; the summary states the exact time it opens again (date, time, time zone); two days later the screen
// asks one fresh question alone; after a wrong answer it pauses again. Scenario 1g (strong) shows the delayed check's exact opening time.
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
const shots = process.env.SHOTS_DIR ?? fileURLToPath(new URL("../../docs/recoverable-handover/screenshots/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
let base, server;
test.before(() => new Promise((ok) => { server = http.createServer((q, r) => { try { const p = q.url === "/" || q.url.startsWith("/?") ? "index.html" : q.url.slice(1).split("?")[0]; r.writeHead(200, { "content-type": types[extname(p)] ?? "text/plain" }); r.end(readFileSync(join(dist, p))); } catch { r.writeHead(404).end(); } }).listen(0, () => { base = `http://localhost:${server.address().port}`; ok(); }); mkdirSync(shots, { recursive: true }); }));
test.after(() => server.close());

/** drive the scripted learner through the screen until a summary */
async function toSummary(page) {
  for (let n = 0; n < 160; n++) {
    const st = await page.evaluate(() => ({ stage: window.__slice.flow.stage }));
    if (st.stage === "summary") return;
    if (st.stage === "teaching") { await page.getByRole("button", { name: /show next step|continue/i }).first().click({ timeout: 5000 }); continue; }
    if (st.stage === "feedback") { await page.getByRole("button", { name: /^continue/i }).first().click({ timeout: 5000 }); continue; }
    const a = await page.evaluate(() => window.__slice.action());
    const q = await page.evaluate(() => window.__slice.flow.currentQuestion);
    const opts = await page.evaluate((qq) => window.__slice.options(qq), q);
    if (opts) { const i = "ABCD".indexOf(a.answer); await page.getByRole("radio", { name: opts[i] ?? opts[0], exact: true }).first().click({ timeout: 5000 }); }
    else await page.locator("input").first().fill(a.answer);
    await page.getByRole("button", { name: /^check$/i }).first().click({ timeout: 5000 });
  }
  throw new Error("no summary within 160 steps");
}
const text = (page) => page.evaluate(() => document.body.innerText);
const fits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

for (const [name, viewport] of [["desktop", { width: 1366, height: 800 }], ["mobile", { width: 390, height: 844 }]]) {
  test(`hand-over: pause with its way back, re-entry two days later, pause again (${name})`, async () => {
    const browser = await chromium.launch(); const page = await browser.newPage({ viewport });
    const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
    try {
      await page.goto(`${base}/?scenario=2b&tz=Asia/Kolkata&later=2`);
      await page.waitForSelector(".lr-nav");
      await toSummary(page);
      let t = await text(page);
      assert.match(t, /teacher or parent/);
      assert.match(t, /You can try this again on your own from \w{3} \d+ \w{3} 2026, \d\d:\d\d \(GMT\+5:30, Asia\/Kolkata\)/);
      assert.ok(await fits(page)); await page.screenshot({ path: `${shots}/h1-pause-${name}.png`, fullPage: true });
      await page.evaluate(() => window.__slice.later(2));
      await page.waitForSelector(".lr-nav");
      assert.equal(await page.evaluate(() => window.__slice.flow.currentPhase), "reentry");
      t = await text(page);
      assert.match(t, /Welcome back\. One question on your own first/);
      assert.ok(await fits(page)); await page.screenshot({ path: `${shots}/h1-reentry-${name}.png`, fullPage: true });
      await toSummary(page);
      t = await text(page);
      assert.match(t, /teacher or parent/);
      assert.ok(await fits(page)); await page.screenshot({ path: `${shots}/h1-after-reentry-${name}.png`, fullPage: true });
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
  test(`delayed check: the summary states the exact opening time with the time zone (${name})`, async () => {
    const browser = await chromium.launch(); const page = await browser.newPage({ viewport });
    try {
      await page.goto(`${base}/?scenario=1g&tz=Asia/Kolkata`);
      await page.waitForSelector(".lr-nav");
      await toSummary(page);
      assert.match(await text(page), /Your delayed check opens \w{3} \d+ \w{3} 2026, \d\d:\d\d \(GMT\+5:30, Asia\/Kolkata\)/);
      assert.ok(await fits(page)); await page.screenshot({ path: `${shots}/h1-retention-time-${name}.png`, fullPage: true });
    } finally { await browser.close(); }
  });
}
