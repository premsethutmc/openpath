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

test("Word check: reports observed word meanings and keeps the count after leaving", async () => {
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
  const observed = page.getByRole("heading", { name: new RegExp(`^\\d+ of ${n} meanings correct$`) });
  await observed.waitFor();
  const correct = Number((await observed.innerText()).split(" ")[0]);
  assert.ok(correct >= 0 && correct <= 6, "only the first six answers can earn credit");
  await shot(page, "3-word-check");
  await fits();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByText(`Last time: ${correct} of ${n} correct`, { exact: true }).waitFor();
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

test("Look up grammar from Home, practise the topic found, then write a sentence of your own with the rule", async () => {
  const { context, page, errors, fits } = await start("Searcher", false);
  // search from the home screen
  await page.locator("#grammar-search").fill("has");
  const hit = page.locator('.grammar-hits li[data-topic="have_has"]');
  await hit.waitFor();
  await page.locator("#grammar-search").fill("xyzzy");
  await page.getByText("No grammar topic found.").waitFor();
  await page.locator("#grammar-search").fill("has");
  await shot(page, "5-search");
  await fits();
  await hit.getByRole("button", { name: "Practise" }).click();
  await page.getByText(/^Topics: /).waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.locator('main.grammar[data-phase="learn"]').waitFor();
  assert.match(await page.locator(".grammar-learn h2").innerText(), /have|has/i);
  // answer the sitting any way (here, quickly and not always right), until it ends
  for (let g = 0; g < 60 && !(await page.locator('main.grammar[data-phase="done"]').count()); g++) {
    const phase = await page.locator("main.grammar").getAttribute("data-phase");
    if (phase === "learn") await page.getByRole("button", { name: /^(Skip to practice|Now practise)$/ }).click();
    else if (phase === "feedback") await page.getByRole("button", { name: /^(Next sentence|Finish)$/ }).click();
    else if (phase === "ask") {
      const kind = await page.locator("main.grammar").getAttribute("data-kind");
      if (kind === "choose") await page.locator(".grammar-choice").first().click();
      else if (kind === "build") {
        for (let n = await page.locator(".grammar-pool .grammar-tile").count(); n > 0; n--) await page.locator(".grammar-pool .grammar-tile").first().click();
        await page.getByRole("button", { name: "Check" }).click();
      } else if (kind === "rewrite") {
        await page.locator(".grammar-rewrite").fill("We have it.");
        await page.getByRole("button", { name: "Check" }).click();
      } else {
        await page.locator(".grammar-word").first().click();
        if (kind === "fix") await page.locator("#grammar-box").fill("has");
        await page.getByRole("button", { name: "Check" }).click();
      }
    }
    await page.waitForTimeout(60);
  }
  await page.locator('main.grammar[data-phase="done"]').waitFor();
  // write your own: first without the rule, then with it
  const own = page.locator('.write-own[data-topic="have_has"]');
  await own.waitFor();
  await page.locator("#write-own-text").fill("my dog is big");
  await page.getByRole("button", { name: "Check my sentence" }).click();
  await own.getByText("Start with a capital letter.").waitFor();
  await page.locator("#write-own-text").fill("My dog has a long tail.");
  // editing clears the last check: check again with the same button
  await page.getByRole("button", { name: "Check my sentence" }).click();
  await own.getByText("✓ Well done: your sentence uses the rule").waitFor();
  await shot(page, "6-write-own");
  await fits();
  assert.deepEqual(errors, []);
  await context.close();
});
