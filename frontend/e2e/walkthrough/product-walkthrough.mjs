/**
 * Product walkthrough of My Learning Year as a learner sees it, on a phone-sized browser (360 × 800), through the
 * ordinary learner interface. The app chooses what to ask and what to teach; the script only answers what is on screen
 * (wrong while the app is finding the starting point, right afterwards). No lesson is injected and no record is written
 * except by the app itself. Synthetic accounts only.
 *
 * The SHIPPED build is used (scripts/build-year.mjs without --test): content is provisional, so explanations carry the
 * "Demonstration" label and nothing can show as educator-verified.
 *
 *   WALK_URL=http://127.0.0.1:4190 WALK_API=django|fake SHOTS=/tmp/walk/ node --import tsx e2e/walkthrough/product-walkthrough.mjs
 *
 * The delayed check (one walkthrough) needs time to pass. It uses the app's existing TEST clock for one synthetic pupil
 * (Django: OPENPATH_TEST_CLOCK_FILE; the fake API: /__test/clock) and the browser clock; the machine clock is not changed
 * and no stored record is edited. This is a test facility, not production behaviour, and the report says so.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { question } from "../../../packages/learning/src/content.ts";
import { misconception } from "../../src/journey/learners.ts";

const base = process.env.WALK_URL ?? "http://127.0.0.1:4190";
const mode = process.env.WALK_API ?? "fake";
const fakeApi = process.env.FAKE_API ?? "http://127.0.0.1:8013";
const shots = process.env.SHOTS ?? "/tmp/walk/";
const only = process.env.WALK_ONLY ? process.env.WALK_ONLY.split(",") : null;
mkdirSync(shots, { recursive: true });
const PASSWORD = "synthetic-family-passphrase-walk";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function call(page, path, body) {
  return page.evaluate(async ({ path, body }) => {
    const token = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "";
    const r = await fetch("/api" + path, { method: body ? "POST" : "GET", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(token) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: r.status === 204 ? null : await r.json().catch(() => null) };
  }, { path, body });
}
const phone = () => browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
const text = async (page, sel, n = 400) => ((await page.locator(sel).first().innerText({ timeout: 3000 }).catch(() => "")) || "").replace(/\s+/g, " ").trim().slice(0, n);

function wrongFor(qid, bugs) {
  const q = question(qid);
  const m = bugs.length ? misconception(qid, new Set(bugs)) : null;
  if (m != null && m !== q.answer) return m;
  if (q.type === "choice") return "ABCD".split("").find((x) => x !== q.answer && x.charCodeAt(0) - 65 < (q.options?.length ?? 4));
  const ans = String(q.answer);
  const frac = ans.match(/^(\d+)\/(\d+)$/);
  if (frac) { const other = [...(q.prompt ?? "").matchAll(/(\d+)\/(\d+)/g)].map((x) => x[0]).find((f) => f !== ans); return other ?? `${Number(frac[1]) + 1}/${frac[2]}`; }
  if (/^-?\d+$/.test(ans)) return String(Number(ans) + 1);
  return null;
}

async function answer(page, response, q) {
  const card = page.locator(".qcard");
  if (q.type === "choice") await card.getByRole("radio").nth("ABCD".indexOf(response)).click({ timeout: 20_000 });
  else await card.getByLabel("Your answer", { exact: true }).fill(String(response), { timeout: 20_000 });
  await card.getByRole("button", { name: "Check" }).click();
  await page.getByRole("status").filter({ hasText: /Right\.|Not this time\.|Saved, not marked\./ }).waitFor({ timeout: 15_000 });
}

async function walk(w) {
  const log = { key: w.key, area: w.area, path: `Grade ${w.grade} · ${w.bookLabel} → ${w.chapter} → ${w.skill}`, steps: [], blockers: [] };
  const step = (s) => { log.steps.push(s); console.log(`[${w.key}]`, JSON.stringify(s)); };
  let n = 0;
  const shot = async (page, name) => { await page.waitForTimeout(450); const f = `${w.key}-${String(++n).padStart(2, "0")}-${name}.jpg`; await page.screenshot({ path: shots + f, fullPage: true, type: "jpeg", quality: 80 }); return f; };
  const context = await phone();
  const page = await context.newPage();
  page.on("pageerror", (e) => log.blockers.push(`page error: ${e.message}`));
  try {
    await page.goto(base + "/year/");
    await page.getByRole("heading", { name: "Sign in to OpenPath" }).waitFor();
    const email = `walk-${w.key}-${Date.now()}@example.org`;
    if ((await call(page, "/account/register/", { email, password: PASSWORD, consent: true })).status !== 201) throw new Error("could not register a synthetic account");
    const pupil = await call(page, "/pupils/", { display_name: `Synthetic ${w.area} learner`, consent: true });
    const learner = pupil.data.id;
    if (pupil.status !== 201) throw new Error(`could not add a synthetic pupil: ${pupil.status}`);
    const setupHeading = page.getByRole("heading", { name: /Set up My Learning Year/ });
    for (let attempt = 1; ; attempt++) {
      await page.reload();
      try { await setupHeading.waitFor({ timeout: 30_000 }); break; } catch (e) {
        log.blockers.push(`set-up screen not shown after sign-up (attempt ${attempt}); on screen: ${await text(page, "body", 200)}`);
        await shot(page, `setup-retry-${attempt}`);
        if (attempt === 2) throw e;
      }
    }
    await page.getByRole("button", { name: new RegExp(`^Grade ${w.grade}\\b`) }).click();
    await page.getByRole("button", { name: "No goal for now" }).click();
    await page.getByRole("button", { name: w.book }).first().click();
    await page.getByRole("button", { name: `Start Grade ${w.grade}` }).click();
    await page.getByRole("heading", { name: new RegExp(`^Grade ${w.grade} · `) }).waitFor();
    // chapter entry
    for (const t of w.tiles) await page.locator(".tile", { hasText: t }).first().click();
    step({ what: "chapter entry", screen: await shot(page, "chapter"), on_screen: await text(page, "main", 300) });
    await page.locator(".tile", { hasText: w.skill }).first().click();
    const start = page.getByRole("button", { name: /^(Start|Continue)$/ });
    if (await start.count()) { step({ what: "skill page", screen: await shot(page, "skill-start"), on_screen: await text(page, "main", 300) }); await start.first().click(); }
    // the learning loop: the app decides each screen
    let taught = 0, wrongShown = 0, rightShown = 0, reloaded = false, checks = 0;
    for (let i = 0; i < 40; i++) {
      await page.waitForFunction(() => document.querySelector(".qcard, .lesson, h1, h2"), null, { timeout: 15_000 });
      if (await page.locator(".lesson").count()) {
        const eyebrow = await text(page, ".lesson .eyebrow", 120);
        const title = await text(page, ".lesson h2, .lesson h3", 160);
        const review = await text(page, '[data-content-review]', 300);
        const status = await page.locator("[data-content-review]").first().getAttribute("data-content-review").catch(() => null);
        const first = await shot(page, "teaching");
        let screens = 1;
        for (let k = 0; k < 10; k++) {
          const tryIt = page.getByRole("button", { name: "Try it" });
          if (await tryIt.count()) { await tryIt.click(); break; }
          await page.getByRole("button", { name: "Next", exact: true }).click();
          screens++;
          if (screens === 2) await shot(page, "teaching-worked");
        }
        await page.locator(".lesson").waitFor({ state: "detached" });
        taught++;
        step({ what: `teaching chosen by the app (${taught})`, screen: first, lesson: eyebrow, title, screens, review_label: review, review_status: status });
        continue;
      }
      if (!(await page.locator(".qcard").count())) break;
      const card = page.locator(".qcard");
      const qid = await card.getAttribute("data-qid");
      const activity = await text(page, ".qcard .counted", 120);
      const q = question(qid);
      if (q.type === "written") { step({ what: "stopped: written answer marked by an educator", qid }); log.blockers.push(`${qid}: a written answer is marked by an educator, not by the app`); break; }
      const finding = taught === 0;
      const isCheck = /On your own/.test(activity);
      // save and reload once, at the first fresh check after teaching: the same question must come back
      if (isCheck && taught > 0 && !reloaded) {
        reloaded = true;
        const before = await shot(page, "fresh-check");
        await page.reload();
        await page.waitForFunction(() => document.querySelector(".qcard, .lesson, h1"));
        const landed = await text(page, "main", 200);
        const after1 = await shot(page, "after-reload");
        if (!(await page.locator(".qcard").count())) {
          const cont = page.getByRole("button", { name: "Continue", exact: true });
          if (await cont.count()) await cont.first().click();
          await page.locator(".qcard").waitFor({ timeout: 15_000 });
        }
        const qid2 = await page.locator(".qcard").getAttribute("data-qid");
        step({ what: "save and reload at the fresh check", before: before, after: after1, landed_on: landed, question_before: qid, question_after: qid2, same: qid === qid2 });
        if (qid !== qid2) log.blockers.push(`reload changed the question: ${qid} → ${qid2}`);
        continue;
      }
      const response = finding ? wrongFor(qid, w.bugs) : q.answer;
      if (response == null) { log.blockers.push(`${qid}: no answer the script can give`); break; }
      const qshot = (finding && wrongShown === 0) || (!finding && rightShown === 0) || (isCheck && checks === 0) ? await shot(page, isCheck ? "check-question" : "question") : null;
      await answer(page, response, q);
      const fb = await text(page, ".feedback, [role=status]", 400);
      const right = /Right\./.test(fb);
      let fshot = null;
      if ((!right && wrongShown++ === 0) || (right && rightShown++ === 0) || (isCheck && checks === 0)) fshot = await shot(page, right ? "right-feedback" : "wrong-feedback");
      if (isCheck) checks++;
      step({ what: activity.split("·")[0].trim(), qid, prompt: (q.prompt ?? "").slice(0, 140), answered: response, correct_answer: q.answer, feedback: fb.slice(0, 220), screens: [qshot, fshot].filter(Boolean) });
      await page.getByRole("button", { name: "Continue", exact: true }).click();
    }
    const end = await shot(page, "end-of-session");
    step({ what: "end of session", screen: end, on_screen: await text(page, "main", 300) });
    const ev = (await call(page, `/pupils/${learner}/events/?subject=mathematics`)).data?.events ?? [];
    const tally = (k) => ev.filter((r) => r.record === k).length;
    log.saved = { attempts: tally("attempt"), teach: tally("teach"), records: ev.length, strategies: ev.filter((r) => r.record === "teach").map((r) => r.strategy) };
    if (!taught) log.blockers.push("the app taught nothing in this walkthrough");
    if (!checks) log.blockers.push("no fresh check was reached");
    await context.close();
    // return: a new sign-in on a fresh browser (nothing kept in the browser), records from the server
    const c2 = await phone();
    const p2 = await c2.newPage();
    await p2.goto(base + "/year/");
    await p2.getByLabel("Email").fill(email);
    await p2.getByLabel("Password").fill(PASSWORD);
    await p2.getByRole("button", { name: "Sign in" }).click();
    await p2.getByRole("heading", { name: new RegExp(`^Grade ${w.grade} · `) }).waitFor();
    const ret = await shot(p2, "return-dashboard");
    for (const t of w.tiles) await p2.locator(".tile", { hasText: t }).first().click();
    const status = await p2.locator(".tile", { hasText: w.skill }).first().getAttribute("data-status");
    step({ what: "return: signed in again on a new browser", screen: ret, chapter_screen: await shot(p2, "return-chapter"), skill_status: status, next_on_dashboard: null });
    log.status_after_return = status;
    if (w.delayed) {
      // the existing TEST clock for this synthetic pupil only (see the header): 8 days later
      if (mode === "django") {
        const file = process.env.OPENPATH_TEST_CLOCK_FILE;
        const all = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
        writeFileSync(file, JSON.stringify({ ...all, [learner]: 8 }));
      } else await fetch(fakeApi + "/__test/clock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pupil: learner, days: 8 }) });
      await p2.clock.setSystemTime(new Date(Date.now() + 8 * 86_400_000));
      await p2.goto(base + "/year/");
      await p2.getByRole("heading", { name: new RegExp(`^Grade ${w.grade} · `) }).waitFor();
      const due = p2.getByRole("button", { name: "Start the delayed check" });
      const offered = await due.count();
      const d1 = await shot(p2, "delayed-check-offered");
      if (!offered) { log.blockers.push("delayed check not offered 8 days later (test clock)"); step({ what: "delayed check (test clock, 8 days)", offered: false, screen: d1 }); }
      else {
        await due.click();
        await p2.locator(".qcard").waitFor();
        const qid = await p2.locator(".qcard").getAttribute("data-qid");
        const q = question(qid);
        const dq = await shot(p2, "delayed-check-question");
        await answer(p2, q.answer, q);
        const fb = await text(p2, ".feedback, [role=status]", 300);
        const df = await shot(p2, "delayed-check-feedback");
        await p2.getByRole("button", { name: "Continue", exact: true }).click().catch(() => {});
        await p2.waitForTimeout(800);
        const ds = await shot(p2, "after-delayed-check");
        await p2.goto(base + "/year/");
        await p2.getByRole("heading", { name: new RegExp(`^Grade ${w.grade} · `) }).waitFor();
        for (const t of w.tiles) await p2.locator(".tile", { hasText: t }).first().click();
        const st = await p2.locator(".tile", { hasText: w.skill }).first().getAttribute("data-status");
        step({ what: "delayed check (test clock, 8 days)", offered: true, qid, prompt: (q.prompt ?? "").slice(0, 140), answered: q.answer, feedback: fb.slice(0, 200), status_after: st, screens: [d1, dq, df, ds, await shot(p2, "after-delayed-chapter")] });
        log.status_after_delayed = st;
      }
    }
    await c2.close();
  } catch (e) {
    log.blockers.push(`stopped: ${e.message.split("\n")[0]}`);
    await shot(page, "stopped").catch(() => {});
    console.error(`[${w.key}]`, e);
  }
  return log;
}

const WALKS = [
  { key: "a-arithmetic", area: "Arithmetic (missing numbers)", grade: 4, book: /Maths Mela/, bookLabel: "Maths Mela (CBSE / NCERT)", tiles: ["Mathematical reasoning", "The Cleanest Village", "The Missing Digits"], chapter: "The Cleanest Village › 7.7 The Missing Digits", skill: "Find missing operands", bugs: ["added-both", "took-away-again"] },
  { key: "b-fractions", area: "Fractions (comparison)", grade: 4, book: /OpenPath Sample/, bookLabel: "OpenPath Sample", tiles: ["Fractions"], chapter: "Fractions", skill: "Compare fractions with like denominators", bugs: [], delayed: true },
  { key: "c-algebra", area: "Algebra (one-step equations)", grade: 7, book: /OpenPath Sample/, bookLabel: "OpenPath Sample", tiles: ["Simple equations"], chapter: "Simple equations", skill: "Solve linear equations", bugs: ["same-operation"] },
  { key: "d-geometry", area: "Geometry (angles)", grade: 4, book: /OpenPath Sample/, bookLabel: "OpenPath Sample", tiles: ["Angles and circles"], chapter: "Angles and circles", skill: "Compare right acute and obtuse angles", bugs: [] },
];
const results = [];
for (const w of WALKS.filter((x) => !only || only.includes(x.key))) results.push(await walk(w));
writeFileSync(shots + "walkthrough.json", JSON.stringify({ base, api: mode, build: "shipped (provisional content)", results }, null, 1));
await browser.close();
console.log("blockers:", JSON.stringify(results.map((r) => [r.key, r.blockers])));
