/**
 * End-to-end: Poems and everyday texts on an Android-sized phone (412×915). From Home, a learner reads a text, answers its questions (one wrong, to see the explanation), looks back at the
 * text while answering, finishes, and is offered a different kind of text next. No sideways scrolling, even for a
 * timetable or a chart.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/kinds-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const KINDS = JSON.parse(readFileSync(new globalThis.URL("../../content/english/reading/kinds.json", import.meta.url), "utf8"));
const TEXT = new Map(KINDS.texts.map((t) => [t.title, t]));

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

test("Poems and everyday texts: from Home, read a text, answer with the text to hand, then a new kind", async () => {
  const context = await browser.newContext(ANDROID);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill("Kinds");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  const fits = async () => {
    const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    assert.ok(sw <= w, "no sideways scrolling");
  };
  // from Home: the full list of activities
  await page.locator("button.fold[aria-controls='all-activities']").waitFor();
  if ((await page.locator("button.fold[aria-controls='all-activities']").getAttribute("aria-expanded")) !== "true") await page.locator("button.fold[aria-controls='all-activities']").click();
  await page.getByRole("heading", { name: "Poems and everyday texts" }).waitFor();
  await page.locator('section[aria-labelledby="kinds-card-title"]').getByRole("button", { name: "Try one" }).click();
  await page.locator('main.kinds-read[data-phase="intro"]').waitFor();

  const seen = [];
  for (let round = 0; round < 3; round++) {
    const title = await page.locator(".kinds-read .tile h2").innerText();
    assert.ok(TEXT.has(title), title);
    assert.ok(!seen.includes(title), "never the same text twice");
    seen.push(title);
    const t = TEXT.get(title);
    await page.getByRole("button", { name: "Read it" }).click();
    await page.locator('main.kinds-read[data-phase="read"]').waitFor();
    assert.ok((await page.locator("[data-kind-text]").innerText()).includes(t.text.split("\n")[0].slice(0, 20)));
    await fits();
    if (round === 0) await shot(page, "1-read");
    await page.getByRole("button", { name: "I have read it: questions" }).click();
    for (let i = 0; i < t.questions.length; i++) {
      await page.locator(`main.kinds-read[data-phase="ask"][data-question="${i}"]`).waitFor();
      if (round === 0 && i === 0) {
        await page.getByText("Look back at the text").click();
        await page.locator(".kind-back [data-kind-text]").waitFor();
      }
      const q = t.questions[i];
      const miss = round === 0 && i === 0;
      const options = await page.locator(".choice").evaluateAll((els) => els.map((e) => e.dataset.choice));
      await page.locator(".choice").nth(options.indexOf(miss ? q.wrong[0] : q.right)).click();
      await page.getByText(q.explain, { exact: true }).waitFor();
      if (miss) {
        await page.getByText(`Not quite: ${q.right}`).waitFor();
        await shot(page, "2-answered");
      }
      await fits();
      await page.getByRole("button", { name: i + 1 < t.questions.length ? "Next question" : "Finish" }).click();
    }
    await page.locator('main.kinds-read[data-phase="done"]').waitFor();
    await page.getByRole("button", { name: "Done" }).click();
    await page.locator('main.kinds-read[data-phase="intro"]').waitFor();
  }
  const total = seen.reduce((a, title) => a + TEXT.get(title).questions.length, 0);
  await page.getByText(`3 texts read · ${total - 1} of ${total} questions right`).waitFor();
  assert.ok(new Set(seen.map((title) => TEXT.get(title).kind)).size === 3, "three different kinds");
  await shot(page, "3-intro");
  assert.deepEqual(errors, []);
  await context.close();
});
