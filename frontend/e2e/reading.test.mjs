/**
 * End-to-end: the Reading course on an Android-sized phone (Chromium emulating 412×915; not a physical phone).
 * A learner opens Reading, follows a lesson's worked example step by step, practises with a wrong answer and the
 * hints, answers two new questions with nothing marked until the end, and finds the progress kept after a reload.
 * Then "Check me" without teaching: a miss is explained, and the next step is chosen by rule. Device-only, against
 * the production build; nothing is requested from another site.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-reading
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/reading-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };

/** The course's own answer key, read from the content: text title + question → right answer, explanation. */
const KEY = new Map();
for (const n of [1, 2, 3]) {
  const level = JSON.parse(readFileSync(new globalThis.URL(`../../content/english/reading/level-${n}.json`, import.meta.url), "utf8"));
  for (const p of level.passages) for (const q of p.questions) KEY.set(`${p.title}|${q.prompt}`, { ...q, role: p.role });
}

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function fits(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w, `page is ${sw}px wide on a ${w}px screen`);
}
const phase = (page, name) => page.locator(`main[data-phase="${name}"]`);
async function current(page) {
  const title = await page.locator(".reading-passage h2").innerText();
  const prompt = await page.locator("#reading-prompt").innerText();
  const q = KEY.get(`${title}|${prompt}`);
  assert.ok(q, `a question of the course: ${title} | ${prompt}`);
  return q;
}
const option = (page, text) => page.locator(".options .option", { hasText: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });
/** Answer the open check question (right or wrong) and lock it in. */
async function lockIn(page, n, right) {
  await page.getByText(`question ${n} of 2`).waitFor();
  const q = await current(page);
  assert.equal(q.role, "check", "a check question comes from a text kept for checks");
  await option(page, right ? q.right : q.wrong[0]).click();
  await page.getByRole("button", { name: /^Lock in/ }).click();
  return q;
}

test("Reading: lesson, hinted practice, a fresh check marked at the end, progress kept; then Check me with a miss", async () => {
  const context = await browser.newContext(ANDROID);
  const page = await context.newPage();
  const errors = [];
  const foreign = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    const u = new globalThis.URL(r.url());
    if (!["127.0.0.1", "localhost"].includes(u.hostname) && !["data:", "blob:"].includes(u.protocol)) foreign.push(r.url());
  });
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill("Reader");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();

  // 1. Home → Reading: the map, with the first step chosen by rule
  await page.getByRole("button", { name: "Start reading" }).click();
  await page.getByRole("heading", { name: "Read, think, answer" }).waitFor();
  await page.getByRole("heading", { name: "Finding details · Starter" }).waitFor();
  assert.equal(await page.locator("[data-unit]").count(), 18);
  await fits(page);
  await shot(page, "1-map");
  await page.getByRole("button", { name: "Start", exact: true }).click();

  // 2. the lesson: the worked example one step at a time, the answer only after the last step
  await phase(page, "lesson").waitFor();
  assert.equal(await page.locator(".reading-worked li").count(), 1);
  assert.equal(await page.locator(".reading-worked .feedback").count(), 0);
  await page.getByRole("button", { name: /Next step \(1 of 3\)/ }).click();
  await page.getByRole("button", { name: /Next step \(2 of 3\)/ }).click();
  await page.locator(".reading-worked .feedback", { hasText: "Blue." }).waitFor();
  await fits(page);
  await shot(page, "2-lesson");
  await page.getByRole("button", { name: "Now you try" }).click();

  // 3. practice: a wrong answer is crossed out and a hint comes; more hints mark the place; then the right answer
  await phase(page, "practice").waitFor();
  let q = await current(page);
  assert.equal(q.role, "practice");
  await option(page, q.wrong[0]).click();
  await page.getByText("Not that one.").waitFor();
  assert.ok(await option(page, q.wrong[0]).isDisabled());
  assert.equal(await page.locator(".reading-hints .hint").count(), 1);
  await page.getByRole("button", { name: "Another hint" }).click();
  await page.getByText(q.hint).waitFor();
  assert.equal(await page.locator(".reading-passage mark").count(), 0);
  await page.getByRole("button", { name: "Another hint" }).click();
  assert.equal(await page.locator(".reading-passage mark").innerText(), q.evidence);
  assert.equal(await page.getByRole("button", { name: /hint/i }).count(), 0, "three rungs, then the learner answers");
  assert.equal(await page.getByText(q.explain).count(), 0);
  await fits(page);
  await shot(page, "3-practice-hints");
  await option(page, q.right).click();
  await page.getByText(q.explain).waitFor();
  await page.getByRole("button", { name: "Next practice question" }).click();
  await page.getByText("Practice 2 of 2").waitFor();
  q = await current(page);
  await option(page, q.right).click();
  await page.getByRole("button", { name: "I'm ready for two new questions" }).click();

  // 4. the check: no hints, nothing marked after the first answer, both explained at the end
  await phase(page, "check").waitFor();
  await page.getByText("question 1 of 2 · no hints · marked at the end").waitFor();
  assert.equal(await page.getByRole("button", { name: /hint/i }).count(), 0);
  assert.ok(await page.getByRole("button", { name: /^Lock in/ }).isDisabled());
  const c1 = await lockIn(page, 1, true);
  await page.getByText("question 2 of 2").waitFor();
  assert.equal(await page.locator(".feedback").count(), 0, "not marked yet");
  await fits(page);
  await shot(page, "4-check");
  const c2 = await lockIn(page, 2, true);
  await phase(page, "result").waitFor();
  await page.getByRole("heading", { name: "2 of 2 right" }).waitFor();
  await page.getByText("Solved independently after help").waitFor();
  await page.getByText(c1.explain).waitFor();
  await page.getByText(c2.explain).waitFor();
  await fits(page);
  await shot(page, "5-result");

  // 5. kept after a reload; the next step moves on to the next skill
  await page.reload();
  await page.getByRole("button", { name: "Carry on reading" }).click();
  await page.getByText("1 of 18 done").waitFor();
  await page.locator('[data-unit="detail@1"]', { hasText: "solved after help" }).waitFor();
  await page.getByRole("heading", { name: "Order of events · Starter" }).waitFor();

  // 6. Check me at Builder with a miss: explained, and a step back is offered because Starter is not passed
  await page.locator('[data-unit="cause@2"]').getByRole("button", { name: "Check me" }).click();
  await phase(page, "check").waitFor();
  const m1 = await lockIn(page, 1, false);
  await lockIn(page, 2, true);
  await page.getByRole("heading", { name: "1 of 2 right" }).waitFor();
  await page.getByText(m1.explain).waitFor();
  assert.equal(await page.getByText("Solved independently after help").count(), 0);
  assert.equal(await page.getByText("Shown on your own").count(), 0);
  await shot(page, "6-miss");
  await page.getByRole("button", { name: "Step back to Starter first" }).click();
  await phase(page, "lesson").waitFor();
  await page.getByRole("heading", { name: "Look for because" }).waitFor();
  await page.getByRole("button", { name: "← All reading skills" }).click();
  await page.locator('[data-unit="cause@2"]', { hasText: "practise again" }).waitFor();

  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, [], "nothing is requested from another site");
  await context.close();
});
