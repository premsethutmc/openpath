// Integration M1 browser journey: a real browser drives the real slice (grader, evidence, adaptive engine and renderer all live in the page).
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? "playwright");
const dist = fileURLToPath(new URL("../dist-slice/", import.meta.url));
const shots = process.env.SHOTS_DIR ?? fileURLToPath(new URL("../../docs/integration/screenshots/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

async function journey(name, viewport) {
  const server = http.createServer((q, r) => { try { const p = q.url === "/" ? "index.html" : q.url.slice(1).split("?")[0]; r.writeHead(200, { "content-type": types[extname(p)] ?? "text/plain" }); r.end(readFileSync(join(dist, p))); } catch { r.writeHead(404).end(); } }).listen(0);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 400)); });
  await page.goto(`http://localhost:${server.address().port}/`);
  mkdirSync(shots, { recursive: true });
  const shot = (n) => page.screenshot({ path: `${shots}/${name}-${n}.png` });
  const seen = [];
  const body = () => page.evaluate(() => document.body.innerText);
  await page.waitForSelector("input, button");
  await shot("1-open-question");
  let taught = false, n = 1, wrongShot = false, teachShot = 0, recheckShot = false;
  for (let i = 0; i < 60; i++) {
    const st = await page.evaluate(() => window.__slice.flow.stage);
    if (st === "summary") break;
    if (st === "question") {
      const qid = await page.evaluate(() => window.__slice.flow.frames.at(-1).qid);
      // the learner's own input: the misconception's answer until an explanation has been shown, the right answer afterwards
      const ans = await page.evaluate(([q, t]) => { const b = window.__slice; return t ? b.answer(q) : (document.title, b.answer(q)); }, [qid, taught]);
      const wrong = !taught ? await page.evaluate((q) => String(window.__bug(q)), qid).catch(() => null) : null;
      const opts = await page.evaluate((q) => window.__slice.options(q), qid);
      if (opts) { const pick = taught ? opts["ABCD".indexOf(ans)] : (wrong ?? opts["ABCD".indexOf(ans)]); await page.getByRole("radio", { name: pick, exact: true }).first().click({ timeout: 4000 }); await page.getByRole("button", { name: /check|submit/i }).first().click(); }
      else await fill(page, wrong ?? ans);
      if (process.env.DEBUG_SLICE) console.log(name, qid, JSON.stringify(opts), taught, wrong, ans);
    } else {
      if (st === "teaching") { taught = true; if (teachShot < 2) { teachShot++; await shot(`4-teaching-${teachShot}`); } }
      if (st === "feedback" && !wrongShot) { wrongShot = true; await shot("2-incorrect-feedback"); }
      await page.getByRole("button", { name: /continue|show next/i }).first().click({ timeout: 4000 }).catch(async (e) => { await page.screenshot({ path: `/tmp/stuck-${name}.png` }); throw new Error(`stuck in ${st}: ${errors.join(" ; ")}`); });
    }
    seen.push(st);
    if (st === "feedback" && taught && !recheckShot && (await body()).match(/matches|right/i)) { recheckShot = true; await shot("5-recheck-correct"); }
  }
  await shot("6-summary");
  const trace = await page.evaluate(() => JSON.stringify(window.__slice.trace()));
  await browser.close(); server.close();
  return { seen, trace: JSON.parse(trace), errors };
}
async function fill(page, v) {
  await page.locator("input").first().fill(v);
  await page.getByRole("button", { name: /check|submit|answer/i }).first().click();
}
for (const [name, vp] of [["desktop", { width: 1366, height: 800 }], ["mobile", { width: 390, height: 844 }]])
  test(`slice journey in a real browser (${name})`, async () => {
    const r = await journey(name, vp);
    assert.deepEqual(r.errors, []);
    const comps = r.trace.map((t) => t.component);
    for (const c of ["server-grader.gradeRequest", "intervention.moduleState", "session.make.teach"]) assert.ok(comps.includes(c), c);
    assert.ok(r.seen.includes("teaching"));
  });
