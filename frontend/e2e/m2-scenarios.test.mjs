// Milestone 2 renderer validation: scripted learners (only their actions) drive the real page through its controls, desktop and mobile.
// Every screen is checked for horizontal overflow and for essential controls with accessible names; each run must end (no endless retry or loading).
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
const shots = process.env.SHOTS_DIR ?? fileURLToPath(new URL("../../docs/milestone-2/screenshots/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const SCEN = (process.env.M2_SCENARIOS ?? "2a,3a,4a,4b,2f,2d,6a").split(",");
const MAX = 160;

async function run(page, id, name) {
  const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
  await page.goto(`${base}/?scenario=${id}`);
  await page.waitForSelector(".lr-nav");
  const issues = [], seen = new Set(), stages = [];
  const shot = async (tag) => { if (seen.has(tag)) return; seen.add(tag); await page.screenshot({ path: `${shots}/${id}-${name}-${tag}.png` }); };
  const audit = async (where) => {
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth, unnamed: [...document.querySelectorAll("button,input,[role=radio]")].filter((e) => !(e.getAttribute("aria-label") || e.textContent?.trim() || e.getAttribute("placeholder"))).length, small: [...document.querySelectorAll(".lr-nav-btn,.lr-choice,.lr-hint-button")].filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && b.height < 40; }).length }));
    if (r.sw > r.w + 1) issues.push(`${where}: horizontal overflow ${r.sw}>${r.w}`);
    if (r.unnamed) issues.push(`${where}: ${r.unnamed} control(s) without an accessible name`);
    if (r.small) issues.push(`${where}: ${r.small} control(s) under 40px tall`);
  };
  let laterIdx = 0, n = 0;
  for (; n < MAX; n++) {
    const st = await page.evaluate(() => ({ stage: window.__slice.flow.stage, act: window.__slice.flow.currentActivity, phase: window.__slice.flow.currentPhase }));
    stages.push(st.stage);
    await audit(`${st.stage}#${n}`);
    if (st.stage === "summary") {
      await shot(`summary-${laterIdx}`);
      const later = await page.evaluate(() => window.__slice.later_days);
      if (laterIdx < later.length) { await page.evaluate((d) => window.__slice.later(d), later[laterIdx++]); continue; }
      break;
    }
    if (st.stage === "teaching") { await shot("teaching"); await page.getByRole("button", { name: /show next step|continue/i }).first().click({ timeout: 5000 }); continue; }
    if (st.stage === "feedback") {
      const a = await page.evaluate(() => window.__slice.action());
      const fb = await page.evaluate(() => window.__slice.flow.spec.feedback.level);
      await shot(`feedback-${fb}`);
      if (a?.retry) { await shot("retry-offered"); await page.getByRole("button", { name: /try again/i }).click({ timeout: 5000 }); }
      else await page.getByRole("button", { name: /^continue/i }).first().click({ timeout: 5000 });
      continue;
    }
    // a question
    if (st.phase === "retention") await shot("retention-question");
    if (st.act === "guided") await shot("guided"); else await shot(`independent-${st.act}`);
    const a = await page.evaluate(() => window.__slice.action());
    if (a.hint) { const b = page.locator(".lr-hint-button"); if (await b.count()) { await b.first().click({ timeout: 5000 }); await shot("hint-shown"); } else { await page.evaluate(() => window.__slice.flow.on({ type: "hint_requested", level: 1, timestamp: 0 })); await shot("hint-not-offered"); } continue; }
    const q = await page.evaluate(() => window.__slice.flow.currentQuestion);
    const opts = await page.evaluate((qq) => window.__slice.options(qq), q);
    if (opts) { const i = "ABCD".indexOf(a.answer); await page.getByRole("radio", { name: opts[i] ?? opts[0], exact: true }).first().click({ timeout: 5000 }); }
    else await page.locator("input").first().fill(a.answer);
    const btn = page.getByRole("button", { name: /^check$/i }).first();
    if (await btn.isDisabled()) { issues.push(`question#${n}: Check stayed disabled for ${JSON.stringify(a.answer)}`); break; }
    await btn.click({ timeout: 5000 });
  }
  const ended = await page.evaluate(() => window.__slice.flow.ended);
  return { errors, issues, ended, steps: n, stages };
}
let base, server;
test.before(() => new Promise((ok) => { server = http.createServer((q, r) => { try { const p = q.url === "/" || q.url.startsWith("/?") ? "index.html" : q.url.slice(1).split("?")[0]; r.writeHead(200, { "content-type": types[extname(p)] ?? "text/plain" }); r.end(readFileSync(join(dist, p))); } catch { r.writeHead(404).end(); } }).listen(0, () => { base = `http://localhost:${server.address().port}`; ok(); }); mkdirSync(shots, { recursive: true }); }));
test.after(() => server.close());
for (const id of SCEN) for (const [name, viewport] of [["desktop", { width: 1366, height: 800 }], ["mobile", { width: 390, height: 844 }]])
  test(`scenario ${id} in a real browser (${name})`, async () => {
    const browser = await chromium.launch(); const page = await browser.newPage({ viewport });
    try {
      const r = await run(page, id, name);
      assert.deepEqual(r.errors, []);
      assert.deepEqual(r.issues, []);
      assert.ok(r.steps < MAX, `ended within ${MAX} interactions`);
      assert.ok(r.ended, "the engine reached a stopping state");
    } finally { await browser.close(); }
  });
