/**
 * End-to-end: the English screens no other browser test opened (found by measuring which screen code the browser
 * tests ran). Listen and answer, start to finish, with a stand-in voice; and the Word check, start to result.
 * Android-sized phone (Chromium emulating 412×915), against the production build.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/gaps-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const WRITTEN = new Map(JSON.parse(readFileSync(new globalThis.URL("../../content/english/reading/written-answers.json", import.meta.url), "utf8")).items.map((i) => [i.id, i]));
const PASSAGES = new Map(JSON.parse(readFileSync(new globalThis.URL("../../content/english/listening/passages.json", import.meta.url), "utf8")).passages.map((p) => [p.id, p]));

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function start(name, voice) {
  const context = await browser.newContext(ANDROID);
  if (voice)
    await context.addInitScript(() => {
      const v = { name: "Test English (UK)", lang: "en-GB", localService: true, default: true, voiceURI: "test-en-gb" };
      window.__spoken = [];
      window.SpeechSynthesisUtterance = class {
        constructor(text) {
          this.text = text;
        }
      };
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [v], speak: (u) => { window.__spoken.push(u.text); setTimeout(() => u.onstart?.(), 0); setTimeout(() => u.onend?.(), 5); }, cancel: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, speaking: false, pending: false } });
    });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  const fits = async () => {
    const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    assert.ok(sw <= w, "no sideways scrolling");
  };
  return { context, page, errors, fits };
}

test("Listen and answer: hear a passage, answer four questions (one wrong), see each reason and the words heard", async () => {
  const { context, page, errors, fits } = await start("Listener", true);
  await page.getByRole("button", { name: "Try Listen and answer" }).click();
  await page.locator('main.listen-answer[data-phase="intro"]').waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.locator('main.listen-answer[data-phase="listen"]').waitFor();
  const id = await page.locator("main.listen-answer").getAttribute("data-passage");
  const passage = PASSAGES.get(id);
  assert.ok(passage, `passage ${id}`);
  // the passage is read aloud sentence by sentence; questions open once it has been heard
  await page.waitForFunction(() => window.__spoken.length > 1);
  assert.ok((await page.evaluate(() => window.__spoken.join(" "))).includes(passage.text.split(". ")[0]));
  await shot(page, "1-listen");
  await page.getByRole("button", { name: /questions/i }).click();
  for (let i = 0; i < passage.questions.length; i++) {
    await page.locator(`main.listen-answer[data-phase="ask"][data-question="${i}"]`).waitFor();
    const q = passage.questions[i];
    const want = i === 0 ? q.wrong[0] : q.right;
    await page.locator(".options .option").getByText(want, { exact: true }).click();
  }
  await page.locator('main.listen-answer[data-phase="done"]').waitFor();
  await page.getByRole("heading", { name: `3 of ${passage.questions.length} right` }).waitFor();
  assert.equal(await page.locator('.listen-review li[data-correct="false"]').count(), 1);
  await page.getByText(`You chose: ${passage.questions[0].wrong[0]}`).waitFor();
  assert.ok((await page.locator(".listen-text").innerText()).includes(passage.title));
  await shot(page, "2-done");
  await fits();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByText(/3 of 4 questions right, over 1 passage/).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test("Word check: a few rounds of words, then roughly how many English words the learner knows", async () => {
  const { context, page, errors, fits } = await start("Counter", false);
  await page.getByRole("button", { name: "Check my words" }).click();
  await page.locator('main.vocab[data-phase="intro"]').waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  let n = 0;
  for (; n < 80 && !(await page.locator('main.vocab[data-phase="done"]').count()); n++) {
    await page.locator('main.vocab[data-phase="asking"], main.vocab[data-phase="done"]').first().waitFor();
    if (await page.locator('main.vocab[data-phase="done"]').count()) break;
    const word = await page.locator("#vocab-word").innerText();
    // knows the first few words, then not
    if (n < 6) await page.locator(".options .option").first().click();
    else await page.getByRole("button", { name: "I don't know this word" }).click();
    await page.waitForFunction((w) => document.querySelector("#vocab-word")?.textContent !== w || document.querySelector('main.vocab[data-phase="done"]'), word);
  }
  await page.locator('main.vocab[data-phase="done"]').waitFor();
  assert.ok(n >= 6, `${n} words asked`);
  await page.getByRole("heading", { name: /^About [\d,]+ word families$/ }).waitFor();
  await shot(page, "3-word-check");
  await fits();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByText(/Last time: about [\d,]+ word families/).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test("Write an answer: read a passage, a wrong answer, a hint, a second try, the model answer; three questions", async () => {
  const { context, page, errors, fits } = await start("Writer", false);
  await page.getByRole("button", { name: "Try Write an answer" }).click();
  await page.locator('main.written[data-phase="intro"]').waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  for (let q = 0; q < 3; q++) {
    await page.locator('main.written[data-phase="ask"]').waitFor();
    const it = WRITTEN.get(await page.locator("main.written").getAttribute("data-item"));
    assert.ok((await page.locator("[data-written-passage]").innerText()).length > 100, "the passage is there to read");
    if (q === 0) {
      // a wrong answer: a hint and a second try
      await page.locator("#written-answer").fill("I am not sure about this.");
      await page.getByRole("button", { name: "Check" }).click();
      await page.getByText(`Hint: ${it.hint}`).waitFor();
      await shot(page, "4-written-hint");
      await page.getByRole("button", { name: "Try again" }).click();
    }
    await page.locator("#written-answer").fill(it.model);
    await page.getByRole("button", { name: "Check" }).click();
    await page.locator('.dict-feedback[data-correct="true"]').waitFor();
    assert.equal(await page.locator(".dict-reveal").innerText(), it.model);
    await fits();
    await page.getByRole("button", { name: q < 2 ? "Next question" : "Finish" }).click();
  }
  await page.getByRole("heading", { name: "3 of 3 right" }).waitFor();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByText("3 of 3 answers right").waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
