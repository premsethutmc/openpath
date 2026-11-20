/**
 * End-to-end: Long reads on an Android-sized phone (Chromium emulating 412×915). From the Class 8 syllabus line on
 * a text's theme, a learner reads a story part by part, answers each part's two questions (one wrong, to see the
 * explanation), leaves after part one, comes back to part two, and finishes with the questions on the whole story.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/long-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const LONG = JSON.parse(readFileSync(new globalThis.URL("../../content/english/reading/long-reads.json", import.meta.url), "utf8"));
const TEXT = new Map(LONG.texts.map((t) => [t.title, t]));

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

test("Long reads: from the Class 8 syllabus, three parts one at a time, then the whole story", async () => {
  const context = await browser.newContext(ANDROID);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill("Long");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  const fits = async () => {
    const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    assert.ok(sw <= w, "no sideways scrolling");
  };
  const openFromSyllabus = async () => {
    await page.getByRole("button", { name: "Open the class syllabus" }).click();
    await page.getByRole("button", { name: "Class 8", exact: true }).click();
    await page.getByRole("heading", { name: "Class 8 English" }).waitFor();
    await page.getByRole("button", { name: /Practise R1:/ }).click();
    await page.locator('main.long-read[data-phase="intro"]').waitFor();
  };
  const questions = async (title, part, missFirst) => {
    const t = TEXT.get(title);
    const qs = part < 3 ? t.parts[part].questions : t.whole;
    for (let i = 0; i < qs.length; i++) {
      await page.locator(`main.long-read[data-phase="ask"][data-question="${i}"]`).waitFor();
      const want = missFirst && i === 0 ? qs[i].wrong[0] : qs[i].right;
      const options = await page.locator(".choice").evaluateAll((els) => els.map((e) => e.dataset.choice));
      await page.locator(".choice").nth(options.indexOf(want)).click();
      await page.getByText(qs[i].explain, { exact: true }).waitFor();
      if (missFirst && i === 0) await page.getByText(`Not quite: ${qs[i].right}`).waitFor();
      if (part === 0 && i === 0) await shot(page, "2-answered");
      await fits();
      await page.getByRole("button", { name: i + 1 < qs.length ? "Next question" : "Finish" }).click();
    }
    await page.locator('main.long-read[data-phase="done"]').waitFor();
  };

  await openFromSyllabus();
  const title = await page.locator(".long-read .tile h2").innerText();
  assert.ok(TEXT.has(title));
  await page.getByRole("button", { name: "Start the story" }).click();
  await page.locator('main.long-read[data-phase="read"][data-part="0"]').waitFor();
  assert.ok((await page.locator("[data-long-text]").innerText()).startsWith(TEXT.get(title).parts[0].text.slice(0, 30)));
  await shot(page, "1-read");
  await fits();
  await page.getByRole("button", { name: "I have read it: questions" }).click();
  await questions(title, 0, true);
  await page.getByText("1 of 2 right").waitFor();
  // leave, come back: the story goes on at part two
  await page.getByRole("button", { name: "Go on" }).click();
  await page.getByRole("button", { name: "← Back" }).click();
  await page.getByRole("heading", { name: "Class 8 English" }).waitFor();
  await page.getByRole("button", { name: /Practise R1:/ }).click();
  await page.getByRole("button", { name: "Read part 2" }).click();
  await page.getByRole("button", { name: "I have read it: questions" }).click();
  await questions(title, 1, false);
  await page.getByRole("button", { name: "Go on" }).click();
  await page.getByRole("button", { name: "Read part 3" }).click();
  await page.getByRole("button", { name: "I have read it: questions" }).click();
  await questions(title, 2, false);
  await page.getByText("Next: three questions on all of it.").waitFor();
  await page.getByRole("button", { name: "Go on" }).click();
  await page.getByRole("button", { name: "Questions on the whole story" }).click();
  await page.getByRole("button", { name: "Answer the questions" }).click();
  await questions(title, 3, false);
  await page.getByText("You have finished the story.").waitFor();
  await shot(page, "3-done");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByText("1 story finished · 8 of 9 questions right").waitFor();
  await page.getByRole("button", { name: "Start the story" }).waitFor();
  assert.notEqual(await page.locator(".long-read .tile h2").innerText(), title, "a new story next");
  assert.deepEqual(errors, []);
  await context.close();
});
