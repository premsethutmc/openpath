/**
 * End-to-end: the child's English learning experience at phone size, against the production build.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 E2E_SHOTS=e2e/shots/learning npm run english:e2e-learning
 *
 * 1. The spelling journey: a short check, a lesson chosen by the app, practice with hints, mistakes explained,
 *    a check on new words, "Save and leave", a reload that carries on where it was, the summary, and a return
 *    more than a week later (the app's test-only day offset) that starts with a delayed check.
 * 2. Read and answer: a passage, a written answer with spelling and grammar slips that still shows understanding,
 *    feedback in two separate parts, an improved answer kept beside the original, and saving across a reload.
 * Device-only use; no request leaves the page's own server.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const CONTENT = new globalThis.URL("../../content/english/", import.meta.url);
const bank = JSON.parse(readFileSync(new globalThis.URL("spelling/journey-words.json", CONTENT), "utf8"));
const WORDS = new Map(bank.rows.map(([w, rule, kind, role, base, join, diff, dictate, wrong]) => [`jrn.${rule}.${w}`, { w, rule, kind, base, join, wrong }]));

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

async function phone() {
  const context = await browser.newContext(PHONE);
  const page = await context.newPage();
  const errors = [];
  const foreign = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("request", (r) => {
    const u = new globalThis.URL(r.url());
    if (!["127.0.0.1", "localhost"].includes(u.hostname) && u.protocol !== "data:" && u.protocol !== "blob:") foreign.push(r.url());
  });
  return { context, page, errors, foreign };
}

async function fits(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w, `page is ${sw}px wide on a ${w}px screen`);
}

async function tappable(page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((b) => !b.classList.contains("link") && b.offsetParent !== null)
      .map((b) => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height }))
      .filter((b) => b.h < 40),
  );
  assert.deepEqual(small, [], "buttons are at least about 44 px tall");
}

/** No technical words on a child's screen. */
async function childWords(page) {
  const text = (await page.locator("main").innerText()).toLowerCase();
  for (const w of ["irt", "posterior", "evidence gate", "provisional", "misconception", "probability", "intervention", "planner"]) assert.ok(!new RegExp(`\\b${w}\\b`).test(text), `"${w}" shown to the child`);
}

async function createProfile(page, name) {
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.getByText("Tick the box to agree").waitFor();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
}

const stepOf = (page) => page.locator(".sheet[data-step]").first().getAttribute("data-step");
const misspelling = (w) => Object.keys(w.wrong)[0] ?? `${w.base}${w.join.replace("-", "")}x`;

/**
 * One step of the journey as a child who does not double letters until taught (and who gets everything else right).
 * Returns what happened. A right answer moves on by itself; a wrong one waits for Next.
 */
async function journeyStep(page, log, taught) {
  const step = await stepOf(page);
  if (step === "teach") {
    const rule = await page.locator(".sheet").getAttribute("data-rule");
    log.push(`teach:${rule}`);
    taught.add(rule);
    await page.getByRole("button", { name: "Let's practise" }).click();
    await page.locator('.sheet[data-step="teach"]').waitFor({ state: "detached" });
    return "teach";
  }
  if (step === "summary") return "summary";
  const id = await page.locator(".item").getAttribute("data-item");
  const w = WORDS.get(id);
  assert.ok(w, `unknown journey word ${id}`);
  const doubling = w.rule === "double_short" && w.kind === "apply";
  const helped = step !== "question";
  const hintsShown = await page.locator(".hints li").count();
  const wrong = doubling && !(helped && taught.has("double_short") && hintsShown >= 1);
  await page.locator(".ruled input").fill(wrong ? misspelling(w) : w.w);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.locator(".feedback").waitFor();
  const said = await page.locator(".feedback").getAttribute("data-explanation");
  log.push(`${step}:${w.rule}:${wrong ? "wrong" : "right"}:${said}`);
  if (!wrong) {
    // a right answer moves on by itself
    await page.waitForFunction((prev) => document.querySelector(".item")?.getAttribute("data-item") !== prev || !!document.querySelector('.sheet[data-step="teach"],.sheet[data-step="summary"]'), id, { timeout: 5000 });
    return "right";
  }
  if (helped) {
    await page.getByRole("button", { name: /hint|Show me how/ }).click();
    await page.locator(".hints li").first().waitFor();
    return "hint";
  }
  return "wrong";
}

test("the spelling journey: check, diagnosis, lesson, practice with hints, check on new words, saved and resumed, and a delayed check a week later", async () => {
  const { context, page, errors, foreign } = await phone();
  await createProfile(page, "Riya");
  await shot(page, "01-home");
  await page.getByRole("button", { name: "Start spelling", exact: true }).click();
  await page.locator(".spelling-journey .sheet").waitFor();
  const log = [];
  const taught = new Set();
  let shotQuestion = false;
  let shotWrong = false;
  let shotTeach = false;
  let shotHint = false;
  let resumed = false;
  for (let n = 0; n < 80; n++) {
    const step = await stepOf(page);
    if (step === "summary") break;
    await fits(page);
    if (step === "question" && !shotQuestion) {
      await tappable(page);
      await childWords(page);
      await shot(page, "02-question"), (shotQuestion = true);
    }
    if (step === "teach" && !shotTeach) {
      await childWords(page);
      await shot(page, "04-lesson"), (shotTeach = true);
    }
    const r = await journeyStep(page, log, taught);
    if (r === "wrong" && !shotWrong) await shot(page, "03-mistake-explained"), (shotWrong = true);
    if (r === "hint" && !shotHint) await shot(page, "05-practice-hint"), (shotHint = true);
    if (r === "wrong" || r === "hint") {
      const nextBtn = page.getByRole("button", { name: "Next" });
      if (r === "wrong") {
        await nextBtn.click();
        await page.locator(".feedback").waitFor({ state: "detached" });
      }
    }
    // part-way through practice: save and leave, reload the page, and carry on
    if (!resumed && log.filter((x) => x.startsWith("guided")).length === 2) {
      const before = await page.locator(".item").getAttribute("data-item").catch(() => null);
      await page.getByRole("button", { name: "Save and leave" }).click();
      await page.reload();
      await page.getByRole("heading", { name: "Today" }).waitFor();
      await page.getByRole("button", { name: "Carry on" }).first().click();
      await page.locator(".spelling-journey .sheet").waitFor();
      const after = await page.locator(".item").getAttribute("data-item").catch(() => null);
      assert.equal(after, before, "the same practice word after reloading");
      resumed = true;
      log.push("reloaded");
    }
  }
  assert.ok(resumed, "the journey was left and resumed");
  assert.equal(await stepOf(page), "summary", `the session finished: ${log.join(" | ")}`);
  // the diagnosis found doubling, a lesson was chosen by the app, practice with help, then a check on new words
  assert.ok(log.some((x) => /^question:double_short:wrong:pattern/.test(x)), `a doubling mistake was explained as the pattern: ${log.join(" | ")}`);
  assert.ok(log.includes("teach:double_short"), "the doubling lesson was chosen automatically");
  const afterTeach = log.slice(log.indexOf("teach:double_short"));
  assert.ok(afterTeach.some((x) => x.startsWith("guided:double_short")), "guided practice after the lesson");
  assert.ok(afterTeach.some((x) => /^question:double_short:right/.test(x)), "a check on new words after the practice");
  await childWords(page);
  await shot(page, "06-summary");
  const states = await page.locator(".rule-progress li").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-rule")}:${e.getAttribute("data-state")}`));
  assert.ok(states.some((s) => s.startsWith("double_short:")), `doubling is on the summary: ${states}`);
  await page.getByRole("button", { name: "Back to today" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Continue spelling", exact: true }).count(), 1, "Home offers to continue");

  // eight days later: a new session that starts with checks on rules already met (a delayed check)
  await page.evaluate(() => localStorage.setItem("openpath-english-clock-offset-days", "8"));
  await page.reload();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByRole("button", { name: "Continue spelling", exact: true }).click();
  await page.locator(".spelling-journey .sheet").waitFor();
  const later = [];
  for (let n = 0; n < 6; n++) {
    const step = await stepOf(page);
    if (step !== "question") break;
    later.push(await page.locator(".sheet").getAttribute("data-purpose"));
    if (later.at(-1) === "retention") await shot(page, "07-week-later-check");
    const r = await journeyStep(page, log, taught);
    if (r === "wrong") {
      await page.getByRole("button", { name: "Next" }).click();
      await page.locator(".feedback").waitFor({ state: "detached" });
    }
  }
  assert.ok(later.includes("retention"), `a delayed check after a week: ${later.join(", ")}`);
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});

test("read and answer: understanding and writing judged apart, an improved answer kept beside the original, saved across a reload", async () => {
  const { context, page, errors, foreign } = await phone();
  await createProfile(page, "Kabir");
  await page.getByRole("button", { name: "Start reading" }).click();
  const sheet = page.locator(".reading .sheet");
  await sheet.waitFor();
  const first = await sheet.getAttribute("data-task");
  assert.equal(first, "rd.kite.motive");
  await fits(page);
  await tappable(page);
  await childWords(page);
  await shot(page, "08-reading-question");
  // right idea, poor spelling and grammar
  await page.getByLabel("Your answer, in your own words").fill("becuse meena was sad her kite was gone and arjun want to make her happy");
  await page.getByRole("button", { name: "Check my answer" }).click();
  const card = page.locator(".written-answer").first();
  await card.waitFor();
  assert.equal(await card.getAttribute("data-level"), "understood", "understanding is credited despite the slips");
  assert.match(await card.locator('[data-part="understanding"]').innerText(), /You understood it/);
  assert.ok(Number(await card.locator('[data-part="writing"]').getAttribute("data-flags")) > 0, "writing slips are reported");
  assert.match(await card.locator('[data-part="writing"]').innerText(), /becuse/);
  assert.match(await card.locator('[data-part="writing"]').innerText(), /don't change whether you understood/);
  await childWords(page);
  await shot(page, "09-reading-feedback");
  // improve it: the original stays, the improved answer is added
  await page.getByRole("button", { name: "Improve my answer" }).click();
  await page.getByLabel("Improve your answer").fill("Meena was sad because her kite was gone, and Arjun wanted to make her happy.");
  await page.getByRole("button", { name: "Check my new answer" }).click();
  await page.locator(".written-answer").nth(1).waitFor();
  assert.equal(await page.locator(".written-answer").count(), 2, "original and improved answers both shown");
  assert.equal(await page.locator(".written-answer").nth(0).getAttribute("data-revision"), "0");
  assert.equal(await page.locator(".written-answer").nth(1).getAttribute("data-revision"), "1");
  assert.equal(await page.locator(".written-answer").nth(1).locator('[data-part="writing"]').getAttribute("data-flags"), "0");
  await fits(page);
  await shot(page, "10-reading-revised");
  // a fluent answer that misreads the passage gets no credit for understanding
  await page.getByRole("button", { name: "Next passage" }).click();
  await page.locator('.reading .sheet[data-step="write"]').waitFor();
  const second = await page.locator(".reading .sheet").getAttribute("data-task");
  assert.notEqual(second, first);
  // saved: after a reload, the next passage is still the unanswered one
  await page.reload();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByRole("button", { name: "Start reading" }).click();
  await page.locator(".reading .sheet").waitFor();
  assert.equal(await page.locator(".reading .sheet").getAttribute("data-task"), second, "the answered passage is remembered");
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});
