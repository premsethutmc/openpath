import { methodCompatibility } from "../../packages/learning/src/method-alignment";
/**
 * The maths-expansion blueprints in the real Year UI against the real Django API (synthetic pupils only; nothing deployed):
 *   calculus      MATH.calculus.limits               zero-for-undefined
 *   algebra       MATH.algebra.inequalities          keep-sign-negative
 *   trigonometry  MATH.trigonometry.equations        principal-only
 *   batch 2       MATH.algebra.geometric-sequences   power-n
 *                 MATH.calculus.continuity           no-divide
 *                 MATH.trigonometry.functions        quadrant-sign
 * The pupil's first answer (one wrong answer, the modelled error) is stored through the API; from then on the UI and the engine
 * decide every screen: investigation, the explanation (shown as pending educator review), guided practice, the fresh recheck,
 * reload. A later visit's independent answers are stored through the API; nine days on, the delayed check is answered WRONG in
 * the UI: the failure is kept; when the wrong answer repeats the taught error the UI teaches a different explanation of the
 * module first, otherwise it goes straight on; then a fresh question on the same competency, answered right, then reload.
 * The explanations are AI-assisted and await an educator.
 *   cd frontend && node scripts/build-mathematics-journey.mjs && node scripts/build-year.mjs --test
 *   (Django on PATHWAY_API, default http://127.0.0.1:8200, with OPENPATH_TEST_CLOCK_FILE=/tmp/integrated-clock.json)
 *   node --import tsx e2e/maths-expansion-browser.test.mts
 */
import { checkTriangleInteraction } from "./geometry-browser-check";
import { createRequire } from "node:module";
import http from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { latestReleases } from "../../packages/learning/src/curricula";
import { moduleFor, question } from "../../packages/learning/src/content";
import { phasePool, problemKeyOf, problemOf } from "../../packages/learning/src/families";
import { probeReading } from "../../packages/learning/src/reasoning";
import { learnerState, make } from "../../packages/learning/src/session";
import { withDecisions } from "../../packages/learning/src/records";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright") as typeof import("playwright");
const root = fileURLToPath(new URL(`../${process.env.DIST ?? "dist-english"}/`, import.meta.url)), port = Number(process.env.PORT ?? 4202), clockFile = process.env.OPENPATH_TEST_CLOCK_FILE ?? "/tmp/integrated-clock.json";
const api = process.env.PATHWAY_API ?? "http://127.0.0.1:8200";
const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/")) { const p = http.request(new URL(req.url, api), { method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode!, r.headers); r.pipe(res); }); req.pipe(p); return; }
  try { const path = (req.url ?? "/").split("?")[0]; if (!/^\/year\/(?:app\.(?:js|css)(?:\.map)?|index\.html|[\w.-]+\.woff2)?$/.test(path)) { res.writeHead(404).end(); return; } const file = root + (path.endsWith("/") ? path + "index.html" : path);
    res.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".woff2") ? "font/woff2" : "text/html" }).end(readFileSync(file)); } catch { res.writeHead(404).end(); }
});
await new Promise<void>((r) => server.listen(port, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] }), page = await browser.newPage(process.env.GEOMETRY_CASE ? { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true } : {});
async function call(path: string, body?: unknown) { return page.evaluate(async ({ path, body }) => { const token = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? ""; const r = await fetch("/api" + path, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", "x-csrftoken": token }, credentials: "same-origin", body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => null) }; }, { path, body }); }
const base = (q: string) => q.replace(/:(mc|w)$/, "");
const DAY = 86_400_000;
/** a wrong answer the grader can read (an unreadable one would be "unresolved", not wrong): by answer type */
function wrongFor(q: string): string {
  const x = question(q), a = String(x.answer);
  if (x.type === "choice" || q.endsWith(":mc")) return a === "A" ? "B" : "A";
  if (/^-?\d+$/.test(a)) return String(Number(a) + 7);
  if (/^x [<>]/.test(a)) return a.includes("<") ? a.replace("<", ">") : a.replace(">", "<");
  if (a.includes(",")) return a.split(",").slice(0, -1).join(",").trim();
  if (a.startsWith("−") || a.startsWith("-")) return a.replace(/^[−-]/, "");
  return a === "1/2" ? "1/3" : `−${a}`;
}

interface Case { name: string; competency: string; family: string; bug: string; start: string }
const CASES: Case[] = [
  ...(process.env.GEOMETRY_CASE ? [{ name: "geometry reasoning: triangle sum", competency: "MATH.geometry.triangle-properties", family: "ahtri", bug: "used-360", start: "" }] : []),
  { name: "calculus teaching: derivative", competency: "MATH.calculus.derivatives", family: "aqfp", bug: "constant-kept", start: "" },
  { name: "calculus teaching: substitution du", competency: "MATH.calculus.integration-methods", family: "subst", bug: "extra-half", start: "" },
  { name: "calculus teaching: substitution limits", competency: "MATH.calculus.integration-methods", family: "subst", bug: "limits-not-changed", start: "" },
  { name: "calculus: limits", competency: "MATH.calculus.limits", family: "lim", bug: "zero-for-undefined", start: "" },
  { name: "algebra: inequalities", competency: "MATH.algebra.inequalities", family: "lineq", bug: "keep-sign-negative", start: "" },
  { name: "trigonometry: equations", competency: "MATH.trigonometry.equations", family: "atprinc", bug: "principal-only", start: "" },
  { name: "algebra: geometric sequences", competency: "MATH.algebra.geometric-sequences", family: "aogp", bug: "power-n", start: "" },
  { name: "calculus: continuity", competency: "MATH.calculus.continuity", family: "aqcontk", bug: "no-divide", start: "" },
  { name: "trigonometry: any angle", competency: "MATH.trigonometry.functions", family: "atval", bug: "quadrant-sign", start: "" },
].filter((c) => !process.env.CASE || c.name.includes(process.env.CASE));
for (const c of CASES) {
  const m = moduleFor(c.competency)!;
  c.start = [...m.diagnostics, ...m.practice, ...phasePool(c.family, "diagnostic")].map(base).find((q) => problemOf(q)?.family === c.family && (probeReading(q, c.bug).discriminates || (c.family === "aqfp" && problemOf(q)?.bugs.some(b => b.id === c.bug))))!;
  assert.ok(c.start, `${c.name}: a start question on which ${c.bug} predicts a wrong answer`);
}
const results: unknown[] = [];
try {
  await page.goto(`http://127.0.0.1:${port}/year/`);
  assert.equal((await call("/account/")).status, 200);
  assert.equal((await call("/account/register/", { email: `maths-expansion-${Date.now()}@example.org`, password: "synthetic-maths-expansion-passphrase", consent: true })).status, 201);
  for (const c of CASES) {
    writeFileSync(clockFile, "{}");
    await page.clock.setSystemTime(new Date());
    const pupil = await call("/pupils/", { display_name: `Synthetic ${c.name}`.slice(0, 40), consent: true }); assert.equal(pupil.status, 201);
    const id = pupil.data.id, onSkill = (q: string) => question(q).competency === c.competency;
    let clock = Date.now() - 60_000;
    const ctx = () => ({ learnerId: id, sessionId: `learn:${id}:seed`, at: new Date(++clock).toISOString() });
    const saved = async () => (await call(`/pupils/${id}/events/?subject=mathematics`)).data;
    const append = async (event: unknown) => { const d = await saved(); const r = await call(`/pupils/${id}/events/`, { subject: "mathematics", seq: d.count, event }); assert.equal(r.status, 201, JSON.stringify(r)); };
    const stateAt = async (now: number) => { const d = await saved(); return learnerState(id, withDecisions(d.events, d.decisions), now); };
    await append(make.enrol(ctx(), 12, "2026-27", latestReleases.find((r) => r.grade === 12)!));
    let learnt = false;
    const reply = (q: string) => {
      const r = probeReading(base(q), c.bug), x = question(q);
      if (learnt) { const m=moduleFor(c.competency)!,s=m.strategies.find(s=>s.id===taught); return process.env.ALIGNMENT_CASE && (!s || methodCompatibility(m,s,q).status!=="covered") ? wrongFor(q) : x.answer; }
      // Symbolic first-principles answers are deliberately not evidence for misconception attribution.
      // Submit the modelled wrong expression, then let the real engine choose its teaching.
      if (c.family === "aqfp") {
        const bug = problemOf(base(q))?.bugs.find(b => b.id === c.bug);
        if (bug && typeof bug.predict === "string") {
          if (!q.endsWith(":mc")) return bug.predict;
          const index = x.options!.indexOf(bug.predict); return index >= 0 ? "ABCD"[index] : x.answer;
        }
        if (problemOf(base(q))?.family === "aqfp") return wrongFor(q);
      }
      if (!r.discriminates) return x.answer;
      if (!q.endsWith(":mc") && x.type !== "choice") return r.predicted[0];
      const i = x.options!.indexOf(r.predicted[0]); return i >= 0 ? "ABCD"[i] : x.answer;
    };
    // one wrong answer (the modelled error), alone
    if (!process.env.ALIGNMENT_CASE) await append(make.attempt(ctx(), c.start, reply(c.start), "check"));
    const open = () => page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&skill=${c.competency}`);
    const met: string[] = process.env.ALIGNMENT_CASE ? [] : [c.start];
    const answerInUi = async (value: string) => {
      const qid = (await page.locator("[data-qid]").getAttribute("data-qid"))!, q = question(qid);
      if(c.family === "ahtri" && process.env.GEOMETRY_SHOTS && await page.locator('[data-qid] svg').count()) {
        mkdirSync(process.env.GEOMETRY_SHOTS,{recursive:true});
        writeFileSync(`${process.env.GEOMETRY_SHOTS}/question-${qid.replace(/[^a-z0-9-]/gi,'_')}.svg`,await page.locator('[data-qid] svg').first().evaluate(el=>el.outerHTML));
      }
      if (q.type === "choice" || qid.endsWith(":mc")) await page.getByRole("radio").nth("ABCD".indexOf(value)).click();
      else await page.getByLabel("Your answer", { exact: true }).fill(value);
      await page.getByRole("button", { name: "Check", exact: true }).click();
      await page.locator(".feedback[role=status] strong").first().waitFor();
      return { qid, right: (await page.locator(".feedback[role=status] strong").first().innerText()) === "Right." };
    };
    const visibleLessons: { title: string; screens: string[] }[] = [];
    const lesson = async () => {
      const title = await page.locator(".lesson .eyebrow").innerText();
      const review = await page.locator("[data-content-review]").getAttribute("data-content-review");
      const screens: string[] = [];
      for (let i = 0; i < 12; i++) {
        await page.locator(".lesson").waitFor({ state: "visible" });
        if (c.family === "ahtri" && i === 0 && visibleLessons.length === 0) await checkTriangleInteraction(page, process.env.GEOMETRY_SHOTS ?? "/tmp/geometry-quality/screens");
        screens.push(await page.locator(".lesson").innerText());
        if (c.family === "ahtri" && process.env.GEOMETRY_SHOTS) {
          mkdirSync(process.env.GEOMETRY_SHOTS, { recursive: true });
          await page.locator(".lesson").evaluate(el => el.scrollIntoView({block:"center",behavior:"instant"}));
          await page.screenshot({path:`${process.env.GEOMETRY_SHOTS}/lesson-${visibleLessons.length}-${i}.png`,fullPage:true,animations:"disabled"});
        }
        if (c.name.startsWith("calculus teaching")) {
          // Read the lesson in the viewport, including the last mathematical line above the sticky controls.
          await page.locator(".lesson").evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
          const math = page.locator(".lesson .formula span").last();
          if (await math.count()) assert.ok(await math.evaluate(el => {
            const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
            const hit = document.elementFromPoint(x, y);
            return y > 0 && y < innerHeight && !!hit && (el.contains(hit) || hit.contains(el));
          }), `${c.name}: final mathematics is visible, not behind the sticky controls`);
        }
        if (process.env.CALCULUS_SHOTS && c.name.startsWith("calculus teaching")) {
          mkdirSync(process.env.CALCULUS_SHOTS, { recursive: true });
          await page.screenshot({ path: `${process.env.CALCULUS_SHOTS}/${c.bug}-${visibleLessons.length}-${i}.png`, fullPage: true, animations: "disabled" });
        }
        const eyebrow = await page.locator(".lesson .eyebrow").innerText();
        const btn = page.locator(".actions.sticky button.primary").last(), label = await btn.innerText();
        await btn.click();
        if (label !== "Next") break;
        await page.waitForFunction((e) => document.querySelector(".lesson .eyebrow")?.textContent !== e, eyebrow);
      }
      await page.waitForFunction(() => !document.querySelector(".lesson") || !!document.querySelector("[data-qid]"));
      visibleLessons.push({ title, screens });
      return { title: title.split(" · ")[0], review };
    };
    const screen = async () => { await page.waitForFunction(() => !!document.querySelector("[data-qid]") || !!document.querySelector(".lesson"), null, { timeout: 20_000 }); return (await page.locator("[data-qid]").count()) ? "question" : "lesson"; };
    const continueOn = async () => { const b = page.locator(".actions.sticky button.primary").first(); if (await b.count()) await b.click(); };
    // ---- the UI drives: investigation → explanation → guided → recheck
    await open();
    const trail: { kind: string; qid?: string; right?: boolean; strategy?: string; review?: string | null }[] = [];
    let taught: string | null = null;
    for (let i = 0; i < 12; i++) {
      if ((await screen()) === "lesson") {
        const l = await lesson(); learnt = true;
        // the explanation shown, from the app's own saved record of it (recovery teaching is not in the plain module state)
        const shown = [...(await saved()).events].reverse().find((e: { record?: string }) => e.record === "teach") as { strategy?: string } | undefined;
        taught = shown?.strategy ?? null;
        trail.push({ kind: "lesson", strategy: taught ?? undefined, review: l.review });
        if (process.env.DEBUG) console.log("step", JSON.stringify(trail.at(-1)));
        assert.equal(l.review, "pending_review", `${c.name}: the explanation is shown as pending educator review`);
        continue;
      }
      const qid = (await page.locator("[data-qid]").getAttribute("data-qid"))!;
      const a = await answerInUi(reply(qid)); met.push(qid);
      const last = (await stateAt(Date.now())).records.attempts.at(-1)!;
      if (process.env.ALIGNMENT_CASE) { assert.equal(last.questionId,qid); assert.equal(last.credit,a.right,"the backend recorded a definite verdict, not unreadable input"); }
      trail.push({ kind: last.activity, qid, right: a.right });
      if (process.env.DEBUG) console.log("step", JSON.stringify(trail.at(-1)));
      if (taught && last.activity === "check") break;
      await continueOn();
    }
    const check = trail.findLast((s) => s.kind === "check")!;
    assert.ok(taught, `${c.name}: an explanation was given: ${JSON.stringify(trail)}`);
    assert.ok(moduleFor(c.competency)!.strategies.some((s) => s.id === taught), `${c.name}: ${taught} is this module's explanation`);
    assert.ok(check && onSkill(check.qid!), `${c.name}: the recheck is on the taught competency: ${JSON.stringify(trail)}`);
    assert.equal(problemOf(base(check.qid!))!.family, c.family, `${c.name}: the recheck is on the taught family`);
    assert.ok(check.right);
    const strategy = moduleFor(c.competency)!.strategies.find((s) => s.id === taught)!;
    if (c.name.startsWith("calculus teaching")) {
      const visible = visibleLessons[0].screens.join("\n");
      const required = c.family === "aqfp"
        ? ["Why the square gives 2x", "x² + xh + hx + h²", "Subtract the whole original function", "h ≠ 0"]
        : ["What du means", "du = 2x dx", "Replace the whole matching factor", "Change both endpoints", "u = 1", "u = 2", "7/3"];
      for (const phrase of required) assert.ok(visible.includes(phrase), `student screen must teach ${phrase}: ${taught}`);
      assert.equal(visibleLessons[0].screens.length, strategy.screens.length, "every selected strategy screen was displayed");
    }
    if (c.family === "ahtri") {
      assert.equal(taught, "worked_steps");
      const text=visibleLessons[0].screens.join("\n");
      for(const phrase of ["interior angle", "alternate interior", "120°", "60°", "do not form a triangle"]) assert.ok(text.includes(phrase),phrase);
    }
    const shownBefore = [...met.slice(0, met.indexOf(check.qid!)), strategy.guided, ...strategy.screens.map((s) => s.instance!).filter(Boolean)];
    assert.ok(!shownBefore.some((q) => problemKeyOf(q) === problemKeyOf(check.qid!)), `${c.name}: ${check.qid} repeats or relabels a met problem`);
    assert.deepEqual(trail.filter((s) => s.kind === "transfer"), [], `${c.name}: no transfer before the recheck`);
    if (process.env.ALIGNMENT_CASE) {
      assert.equal(trail[0].kind, "diagnostic", "the first response was submitted through the real UI");
      assert.equal(trail[0].right, false);
      for (const row of trail.filter(x=>["guided","check"].includes(x.kind))) assert.equal(methodCompatibility(moduleFor(c.competency)!,strategy,row.qid!).status,"covered","student only answers methods covered by the actual lesson");
      const before=await saved();await page.reload();const after=await saved();assert.deepEqual(after.events,before.events);assert.deepEqual(after.decisions,before.decisions);
      assert.ok(after.events.some((e:any)=>e.record==='teach'&&e.methodAlignment?.startsWith('method-alignment@1:')));
      assert.notEqual((await stateAt(Date.now())).evidence(c.competency).status,'verified');
      results.push({case:c.name,initialResponseInUi:true,trail,visibleLessons,reloaded:true,educatorApproved:false});continue;
    }
    // the engine may keep recovery open for one more question on the learner's own (inequalities): answer it in the UI
    for (let i = 0; i < 6 && (await stateAt(Date.now())).module(c.competency).phase === "recover"; i++) {
      await continueOn();
      if ((await screen()) === "lesson") { await lesson(); continue; }
      const qid = (await page.locator("[data-qid]").getAttribute("data-qid"))!;
      assert.ok(onSkill(qid), `${c.name}: recovery question ${qid} is on the competency`);
      assert.ok(!met.some((q) => problemKeyOf(q) === problemKeyOf(qid)), `${c.name}: recovery question ${qid} is fresh`);
      const a = await answerInUi(question(qid).answer); met.push(qid);
      trail.push({ kind: (await stateAt(Date.now())).records.attempts.at(-1)!.activity, qid, right: a.right });
    }
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
    // ---- nine days on: the delayed check in the UI, answered wrong
    writeFileSync(clockFile, JSON.stringify({ [id]: 9 })); await page.clock.setSystemTime(new Date(realNow + 9 * DAY));
    await open(); assert.equal(await screen(), "question", `${c.name}: the delayed check is a question`);
    const delayedQ = (await page.locator("[data-qid]").getAttribute("data-qid"))!;
    assert.ok(onSkill(delayedQ), `${c.name}: the delayed check ${delayedQ} is on the taught competency`);
    assert.equal((await stateAt(realNow + 9 * DAY)).module(c.competency).phase, "retention");
    assert.ok(!met.some((q) => problemKeyOf(q) === problemKeyOf(delayedQ)), `${c.name}: delayed ${delayedQ} repeats or relabels`);
    const dAns = await answerInUi(wrongFor(delayedQ)); assert.equal(dAns.right, false);
    met.push(delayedQ);
    await continueOn();
    const lapsed = (await stateAt(realNow + 9 * DAY)).evidence(c.competency);
    assert.equal(lapsed.retentionHistory[0]?.result, "failed", `${c.name}: the failed delayed check is kept`);
    assert.notEqual(lapsed.status, "verified");
    // after the lapse: when the wrong delayed answer repeats the taught error the UI first teaches a DIFFERENT explanation of
    // this module (pending review); otherwise it goes straight on. Either way a fresh question on the competency follows.
    const retaught: string[] = [];
    for (let i = 0; i < 2 && (await screen()) === "lesson"; i++) {
      const l = await lesson();
      assert.equal(l.review, "pending_review", `${c.name}: the explanation after the lapse is shown as pending educator review`);
      const shown = [...(await saved()).events].reverse().find((e: { record?: string }) => e.record === "teach") as { strategy?: string } | undefined;
      assert.ok(moduleFor(c.competency)!.strategies.some((s) => s.id === shown?.strategy), `${c.name}: ${shown?.strategy} is this module's explanation`);
      assert.notEqual(shown?.strategy, taught, `${c.name}: a different explanation from the first one`);
      retaught.push(shown!.strategy!);
    }
    assert.equal(await screen(), "question", `${c.name}: after the failed delayed check, a fresh question`);
    const freshQ = (await page.locator("[data-qid]").getAttribute("data-qid"))!;
    assert.ok(onSkill(freshQ), `${c.name}: the fresh question ${freshQ} is on the taught competency`);
    assert.ok(!met.some((q) => problemKeyOf(q) === problemKeyOf(freshQ)), `${c.name}: ${freshQ} is fresh`);
    assert.equal((await answerInUi(question(freshQ).answer)).right, true);
    const b2 = await saved(); await page.reload(); await page.locator("body").waitFor(); const a2 = await saved();
    assert.deepEqual(a2.events, b2.events); assert.deepEqual(a2.decisions, b2.decisions);
    results.push({ visibleLessons, case: c.name, competency: c.competency, start: c.start, trail, taught, recheck: check.qid, delayed: delayedQ, retaught, afterLapse: freshQ, savedEvents: a2.count, reloaded: true, educatorApproved: false });
    console.log(`ok ${c.name}: taught ${taught}, recheck ${check.qid}, delayed ${delayedQ} (wrong) → ${retaught.length ? `retaught ${retaught.join(", ")} → ` : ""}fresh ${freshQ}`);
  }
  writeFileSync(process.env.MATHS_EXPANSION_RESULTS ?? "/tmp/maths-expansion-browser.json", JSON.stringify({ passed: true, results }, null, 2) + "\n");
} catch (e) { const body = await page.locator("body").innerText(); writeFileSync(process.env.FAIL_BODY ?? "/tmp/maths-expansion-fail.txt", body); await page.screenshot({ path: (process.env.FAIL_BODY ?? "/tmp/maths-expansion-fail") + ".png", fullPage: true }); console.error(body.slice(0, 1500)); throw e; } finally { await browser.close(); server.close(); }
