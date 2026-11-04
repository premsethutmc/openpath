/**
 * The geometry/dice integration in the real Year UI against the real Django API (synthetic pupils only; nothing deployed):
 *   dice   totals-equally-likely, order-ignored   (MATH.probability.sample-space · sample-space.dice-exact-total@1)
 *   geometry exterior angle, vertically opposite  (triangle-properties.exterior-angle@1 · angle-pairs.opposite@2)
 * The pupil's first answer (one wrong answer on the skill) is stored through the API; from then on the UI and the engine decide
 * every screen: investigation, the explanation (pending educator review), guided practice, the recheck, reload. A later visit's
 * independent answers are stored through the API; nine days on, the delayed check is answered WRONG in the UI, and the UI must
 * give the skill's general explanation and a fresh same-skill question, answered right, then reload.
 *   cd frontend && node scripts/build-mathematics-journey.mjs && node scripts/build-year.mjs --test
 *   (Django on PATHWAY_API, default http://127.0.0.1:8200, with OPENPATH_TEST_CLOCK_FILE=/tmp/integrated-clock.json)
 *   node --import tsx e2e/integrated-skills.test.mts
 */
import { createRequire } from "node:module";
import http from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { latestReleases } from "../../packages/learning/src/curricula";
import { moduleFor, question } from "../../packages/learning/src/content";
import { problemOf } from "../../packages/learning/src/families";
import { probeReading } from "../../packages/learning/src/reasoning";
import { hypotheses } from "../../packages/learning/src/hypotheses";
import { learnerState, make } from "../../packages/learning/src/session";
import { withDecisions } from "../../packages/learning/src/records";
import { connectedSkill, connectionConfig } from "../../packages/learning/src/skill-connections";
import { problemIdentity } from "../../packages/learning/src/problem-identity";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright") as typeof import("playwright");
const root = fileURLToPath(new URL("../dist-english/", import.meta.url)), port = Number(process.env.PORT ?? 4201), clockFile = process.env.OPENPATH_TEST_CLOCK_FILE ?? "/tmp/integrated-clock.json";
const api = process.env.PATHWAY_API ?? "http://127.0.0.1:8200";
const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/")) { const p = http.request(new URL(req.url, api), { method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode!, r.headers); r.pipe(res); }); req.pipe(p); return; }
  try { const path = (req.url ?? "/").split("?")[0]; if (!/^\/year\/(?:app\.(?:js|css)(?:\.map)?|index\.html|[\w.-]+\.woff2)?$/.test(path)) { res.writeHead(404).end(); return; } const file = root + (path.endsWith("/") ? path + "index.html" : path);
    res.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".woff2") ? "font/woff2" : "text/html" }).end(readFileSync(file)); } catch { res.writeHead(404).end(); }
});
await new Promise<void>((r) => server.listen(port, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] }), page = await browser.newPage();
async function call(path: string, body?: unknown) { return page.evaluate(async ({ path, body }) => { const token = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? ""; const r = await fetch("/api" + path, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", "x-csrftoken": token }, credentials: "same-origin", body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => null) }; }, { path, body }); }
const base = (q: string) => q.replace(/:(mc|w)$/, "");
const DAY = 86_400_000;

interface Case { name: string; competency: string; skill: string; bug: string; start: string; misconceptionFix: string | null }
const CASES: Case[] = [
  { name: "dice: totals equally likely", competency: "MATH.probability.sample-space", skill: "sample-space.dice-exact-total@1", bug: "totals-equally-likely", start: "gen:akdice:4,5,0,7", misconceptionFix: "akdice_fix_totals" },
  { name: "dice: order ignored", competency: "MATH.probability.sample-space", skill: "sample-space.dice-exact-total@1", bug: "order-ignored", start: "gen:akdice:5,5,0,4", misconceptionFix: "akdice_fix_order" },
  { name: "geometry: exterior angle", competency: "MATH.geometry.triangle-properties", skill: "triangle-properties.exterior-angle@1", bug: "third-interior", start: "", misconceptionFix: null },
  { name: "geometry: vertically opposite", competency: "MATH.geometry.angle-pairs", skill: "angle-pairs.opposite@2", bug: "opposite-as-linear", start: "", misconceptionFix: null },
].filter((c) => !process.env.CASE || c.name.includes(process.env.CASE));
for (const c of CASES) if (!c.start) {
  const m = moduleFor(c.competency)!, cfg = connectionConfig(c.competency)!;
  c.start = [...m.diagnostics, ...m.practice].map(base).find((q) => connectedSkill(cfg, q) === c.skill && probeReading(q, c.bug).discriminates)!;
}
const results: unknown[] = [];
try {
  await page.goto(`http://127.0.0.1:${port}/year/`);
  assert.equal((await call("/account/")).status, 200);
  assert.equal((await call("/account/register/", { email: `integrated-${Date.now()}@example.org`, password: "synthetic-integrated-browser-passphrase", consent: true })).status, 201);
  for (const c of CASES) {
    writeFileSync(clockFile, "{}");
    await page.clock.setSystemTime(new Date());
    const pupil = await call("/pupils/", { display_name: `Synthetic ${c.name}`, consent: true }); assert.equal(pupil.status, 201);
    const id = pupil.data.id, cfg = connectionConfig(c.competency)!, skillOf = (q: string) => connectedSkill(cfg, q);
    let clock = Date.now() - 60_000;
    const ctx = () => ({ learnerId: id, sessionId: `learn:${id}:seed`, at: new Date(++clock).toISOString() });
    const saved = async () => (await call(`/pupils/${id}/events/?subject=mathematics`)).data;
    const append = async (event: unknown) => { const d = await saved(); const r = await call(`/pupils/${id}/events/`, { subject: "mathematics", seq: d.count, event }); assert.equal(r.status, 201, JSON.stringify(r)); };
    const stateAt = async (now: number) => { const d = await saved(); return learnerState(id, withDecisions(d.events, d.decisions), now); };
    await append(make.enrol(ctx(), 12, "2026-27", latestReleases.find((r) => r.grade === 12)!));
    // the ordinary year flow (no learning-goal pathway): the module view the learner opens from the year page
    if (process.env.PATHWAY === "1") await append(make.pathway(ctx(), c.competency));
    let learnt = false;
    const reply = (q: string) => {
      const r = probeReading(base(q), c.bug), x = question(q);
      if (learnt || !r.discriminates) return x.answer;
      if (!q.endsWith(":mc") && x.type !== "choice") return r.predicted[0];
      const i = x.options!.indexOf(r.predicted[0]); return i >= 0 ? "ABCD"[i] : x.answer;
    };
    // one wrong answer on the skill, alone
    await append(make.attempt(ctx(), c.start, reply(c.start), "check"));
    const open = () => page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&skill=${c.competency}`);
    const met: string[] = [c.start];
    const answerInUi = async (value: string) => {
      const qid = (await page.locator("[data-qid]").getAttribute("data-qid"))!, q = question(qid);
      if (q.type === "choice" || qid.endsWith(":mc")) await page.getByRole("radio").nth("ABCD".indexOf(value)).click();
      else await page.getByLabel("Your answer", { exact: true }).fill(value);
      await page.getByRole("button", { name: "Check", exact: true }).click();
      await page.locator(".feedback[role=status] strong").first().waitFor();
      return { qid, right: (await page.locator(".feedback[role=status] strong").first().innerText()) === "Right." };
    };
    const lesson = async () => {
      const title = await page.locator(".lesson .eyebrow").innerText();
      const review = await page.locator("[data-content-review]").getAttribute("data-content-review");
      for (let i = 0; i < 12; i++) {
        const eyebrow = await page.locator(".lesson .eyebrow").innerText();
        const btn = page.locator(".actions.sticky button.primary").last(), label = await btn.innerText();
        await btn.click();
        if (label !== "Next") break;
        await page.waitForFunction((e) => document.querySelector(".lesson .eyebrow")?.textContent !== e, eyebrow);
      }
      await page.waitForFunction(() => !document.querySelector(".lesson") || !!document.querySelector("[data-qid]"));
      return { title: title.split(" · ")[0], review };
    };
    const screen = async () => { await page.waitForFunction(() => !!document.querySelector("[data-qid]") || !!document.querySelector(".lesson"), null, { timeout: 20_000 }); return (await page.locator("[data-qid]").count()) ? "question" : "lesson"; };
    const continueOn = async () => { const b = page.locator(".actions.sticky button.primary").first(); if (await b.count()) await b.click(); };
    // ---- the UI drives: investigation → explanation → guided → recheck
    await open();
    const trail: { kind: string; qid?: string; right?: boolean; strategy?: string; review?: string | null; skill?: string | null }[] = [];
    let taught: string | null = null;
    for (let i = 0; i < 12; i++) {
      if ((await screen()) === "lesson") {
        const st = (await stateAt(Date.now())).module(c.competency);
        const l = await lesson(); learnt = true; taught = st.strategy?.id ?? null;
        trail.push({ kind: "lesson", strategy: taught ?? undefined, review: l.review });
        if (process.env.DEBUG) console.log("step", JSON.stringify(trail.at(-1)));
        assert.equal(l.review, "pending_review", `${c.name}: the explanation is shown as pending educator review`);
        continue;
      }
      const qid = (await page.locator("[data-qid]").getAttribute("data-qid"))!;
      const a = await answerInUi(reply(qid)); met.push(qid);
      const st = await stateAt(Date.now());
      const last = st.records.attempts.at(-1)!;
      trail.push({ kind: last.activity, qid, right: a.right, skill: skillOf(qid) });
      if (process.env.DEBUG) console.log("step", JSON.stringify(trail.at(-1)));
      if (taught && last.activity === "check") break;
      await continueOn();
    }
    const check = trail.findLast((s) => s.kind === "check")!;
    assert.ok(taught, `${c.name}: an explanation was given: ${JSON.stringify(trail)}`);
    if (c.misconceptionFix) assert.equal(taught, c.misconceptionFix, `${c.name}: ${JSON.stringify(trail)}`);
    assert.equal(skillOf(check.qid!), c.skill, `${c.name}: the recheck is on the taught skill`);
    assert.ok(check.right);
    const strategy = moduleFor(c.competency)!.strategies.find((s) => s.id === taught)!;
    const shownBefore = [...met.slice(0, met.indexOf(check.qid!)), strategy.guided, ...strategy.screens.map((s) => s.instance!).filter(Boolean)];
    assert.ok(!shownBefore.some((q) => problemIdentity(q) === problemIdentity(check.qid!)), `${c.name}: ${check.qid} repeats or relabels a met problem`);
    assert.deepEqual(trail.filter((s) => s.kind === "transfer"), [], `${c.name}: no transfer before the recheck`);
    const s1 = await stateAt(Date.now());
    if (c.misconceptionFix) assert.equal(hypotheses(s1.selectionRecords).find((h) => h.claim?.explanation === c.bug)?.status, "resolved");
    const before = await saved(); await page.reload(); await page.locator("body").waitFor(); const after = await saved();
    assert.deepEqual(after.events, before.events); assert.deepEqual(after.decisions, before.decisions);
    // ---- a later visit: independent answers chosen by the engine (stored through the API)
    const realNow = Date.now();
    writeFileSync(clockFile, JSON.stringify({ [id]: 1 })); clock = realNow + DAY;
    for (let i = 0; i < 40; i++) {
      const st = await stateAt(clock), ms = st.module(c.competency);
      if (!ms.question || ms.phase === "retention") break;
      if (ms.phase === "chapter") { await append(make.teach(ctx(), c.competency, ms.strategy!.id, "diagnosis")); continue; }
      await append(make.attempt(ctx(), ms.question, question(ms.question).answer, (ms.activity ?? "practice") as never, ms.context ? { context: ms.context } : {}));
    }
    if (process.env.DEBUG) { const z = await stateAt(clock), zm = z.module(c.competency), ze = z.evidence(c.competency); console.log("later visit done", zm.phase, zm.reason, ze.status, ze.retention, ze.retentionDueAt, z.records.attempts.length); }
    // ---- nine days on: the delayed check in the UI, answered wrong
    writeFileSync(clockFile, JSON.stringify({ [id]: 9 })); await page.clock.setSystemTime(new Date(realNow + 9 * DAY));
    await open(); assert.equal(await screen(), "question", `${c.name}: the delayed check is a question`);
    const delayedQ = (await page.locator("[data-qid]").getAttribute("data-qid"))!;
    const ds = await stateAt(realNow + 9 * DAY);
    assert.equal(ds.records.attempts.length >= 1, true);
    assert.equal(skillOf(delayedQ), c.skill, `${c.name}: the delayed check ${delayedQ} is on the taught skill`);
    assert.ok(!met.some((q) => problemIdentity(q) === problemIdentity(delayedQ)), `${c.name}: delayed ${delayedQ} repeats or relabels`);
    const dq = question(delayedQ), wrong = dq.type === "choice" || delayedQ.endsWith(":mc") ? (dq.answer === "A" ? "B" : "A") : /^-?\d+$/.test(dq.answer) ? String(Number(dq.answer) + 7) : "1/2";
    const dAns = await answerInUi(wrong); assert.equal(dAns.right, false);
    await continueOn();
    assert.equal(await screen(), "lesson", `${c.name}: after the failed delayed check the skill is explained again`);
    const rs = (await stateAt(realNow + 9 * DAY)).module(c.competency);
    const general = rs.strategy!;
    assert.equal(general.scope?.subSkill, c.skill); assert.equal(general.addresses, undefined, "the general explanation: one wrong answer is not a misconception");
    const rl = await lesson(); assert.equal(rl.review, "pending_review");
    assert.equal(await screen(), "question");
    // guided practice may come first; then the fresh recheck alone
    let recovered: { qid: string; right: boolean } | null = null;
    for (let i = 0; i < 3 && !recovered; i++) {
      const qid = (await page.locator("[data-qid]").getAttribute("data-qid"))!;
      const a = await answerInUi(question(qid).answer);
      const act = (await stateAt(realNow + 9 * DAY)).records.attempts.at(-1)!.activity;
      if (act === "check") recovered = a; else { await continueOn(); assert.equal(await screen(), "question"); }
    }
    assert.ok(recovered && recovered.right, `${c.name}: a fresh same-skill recheck after the delayed check`);
    assert.equal(skillOf(recovered.qid), c.skill);
    assert.ok(![...met, delayedQ, general.guided, ...general.screens.map((s) => s.instance!)].some((q) => q && problemIdentity(q) === problemIdentity(recovered!.qid)), `${c.name}: recovery recheck ${recovered.qid} is fresh`);
    const b2 = await saved(); await page.reload(); await page.locator("body").waitFor(); const a2 = await saved();
    assert.deepEqual(a2.events, b2.events); assert.deepEqual(a2.decisions, b2.decisions);
    results.push({ case: c.name, competency: c.competency, skill: c.skill, start: c.start, trail, taught, recheck: check.qid, delayed: delayedQ, recovery: { explanation: general.id, recheck: recovered.qid }, savedEvents: a2.count, reloaded: true, educatorApproved: false });
    console.log(`ok ${c.name}: taught ${taught}, recheck ${check.qid}, delayed ${delayedQ} (wrong) → ${general.id} → ${recovered.qid}`);
  }
  writeFileSync(process.env.INTEGRATED_RESULTS ?? "../docs/geometry-dice-integration/browser-results.json", JSON.stringify({ passed: true, results }, null, 2) + "\n");
} catch (e) { const body = await page.locator("body").innerText(); writeFileSync(process.env.FAIL_BODY ?? "/tmp/integrated-fail.txt", body); await page.screenshot({ path: (process.env.FAIL_BODY ?? "/tmp/integrated-fail") + ".png", fullPage: true }); console.error(body.slice(0, 1500)); throw e; } finally { await browser.close(); server.close(); }
