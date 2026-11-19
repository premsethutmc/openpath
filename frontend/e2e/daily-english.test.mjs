/**
 * End-to-end: New words and Listen and write on an Android-sized phone (Chromium emulating 412×915; not a physical
 * phone, and the automated browser has no voice, so nothing here checks what is heard). A learner meets five new
 * words, misses one question and sees it return; then writes five sentences, fixing two on the second try; the word misspelt is saved as a spelling list. Both
 * are kept after a reload. Device-only, against the production build; nothing is requested elsewhere.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-daily
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/daily-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const read = (p) => JSON.parse(readFileSync(new globalThis.URL(`../../content/english/${p}`, import.meta.url), "utf8"));
const WORDS = read("vocabulary/daily-words.json").words.map(([band, pos, word, meaning, sentence]) => ({ band, pos, word, meaning, sentence, gap: sentence.replace(new RegExp(`\\b${word}\\b`, "i"), "_____") }));
const SENTENCES = new Map(read("dictation/sentences.json").sentences.map(([id, level, text]) => [id, { level, text }]));

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function start(name) {
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
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  const fits = async () => {
    const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    assert.ok(sw <= w, "no sideways scrolling");
  };
  return { context, page, errors, foreign, fits };
}

test("New words: meet five, miss one question and see it return, find them kept", async () => {
  const { context, page, errors, foreign, fits } = await start("Words");
  await page.getByRole("button", { name: "Learn new words" }).click();
  await page.getByRole("heading", { name: "Five new words a day" }).waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const met = [];
  for (let i = 0; i < 5; i++) {
    const main = page.locator('main[data-phase="meet"]');
    await main.waitFor();
    const word = await main.getAttribute("data-word");
    const w = WORDS.find((x) => x.word === word);
    assert.ok(w && !met.includes(word), `a new word: ${word}`);
    met.push(word);
    await page.getByText(w.meaning, { exact: true }).waitFor();
    if (i === 0) await fits(), await shot(page, "1-meet");
    await page.getByRole("button", { name: "Got it" }).click();
    await page.waitForFunction((x) => document.querySelector("main")?.getAttribute("data-word") !== x, word);
  }
  let asked = 0;
  let missed = null;
  for (let guard = 0; guard < 20; guard++) {
    if (await page.locator('main[data-phase="done"]').count()) break;
    const main = page.locator('main[data-phase="ask"]');
    await main.waitFor();
    const kind = await main.getAttribute("data-kind");
    const prompt = await page.locator("#words-prompt").innerText();
    const w = kind === "meaning" ? WORDS.find((x) => x.word === prompt) : WORDS.find((x) => x.gap === prompt);
    assert.ok(w && met.includes(w.word), `a question on a word just met: ${prompt}`);
    assert.equal(await page.locator(".options .option").count(), 3);
    if (asked === 0) await fits(), await shot(page, `2-${kind}`);
    asked++;
    const right = kind === "meaning" ? w.meaning : w.word;
    if (asked === 2) {
      missed = w.word;
      await page.locator(".options .option").filter({ hasNotText: right }).first().click();
      await page.getByText("Not quite").waitFor();
      await page.getByText(/will come back in a moment/).waitFor();
      await shot(page, "3-missed");
    } else {
      await page.locator(".options .option", { hasText: right }).first().click();
      await page.getByText("✓ Right").waitFor();
    }
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  assert.equal(asked, 11, "ten questions and the missed one again");
  await page.getByRole("heading", { name: "Well done" }).waitFor();
  await page.getByText(`To see again tomorrow: ${missed}`).waitFor();
  await fits();
  await shot(page, "4-done");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByText("0 learnt · 5 still learning · done for today").waitFor();
  await page.reload();
  await page.getByText("0 learnt · 5 still learning · done for today").waitFor();
  await page.getByRole("button", { name: "Open New words" }).click();
  await page.getByRole("heading", { name: "Today's words are done" }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});

test("Listen and write: five sentences, two fixed on the second try, the misspelt word saved for spelling", async () => {
  const { context, page, errors, foreign, fits } = await start("Listener");
  await page.getByRole("button", { name: "Try Listen and write" }).click();
  await page.getByRole("heading", { name: "Hear a sentence, then write it" }).waitFor();
  await page.getByText("Level 2: Longer sentences").waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  let tricky = "";
  for (let i = 1; i <= 5; i++) {
    await page.getByText(`Sentence ${i} of 5`, { exact: true }).waitFor();
    const main = page.locator('main[data-phase="write"]');
    await main.waitFor();
    const s = SENTENCES.get(await main.getAttribute("data-sentence"));
    assert.equal(s?.level, 2);
    assert.equal(await page.getByText(s.text, { exact: true }).count(), 0, "the sentence is not on screen");
    await page.getByRole("button", { name: /Hear the sentence/ }).waitFor();
    const box = page.locator("#dict-box");
    assert.equal(await box.getAttribute("autocapitalize"), "none");
    assert.equal(await box.getAttribute("spellcheck"), "false");
    if (i === 1) {
      await fits();
      await shot(page, "5-write");
      await box.fill(s.text.toLowerCase().replace(/[.?]$/, ""));
      await page.getByRole("button", { name: "Check", exact: true }).click();
      await page.locator('main[data-phase="retry"]').waitFor();
      await page.getByText(/Check \d+ capital letters?\.|Check one capital letter\./).waitFor();
      await page.getByText("Finish the sentence with the right mark.").waitFor();
      assert.equal(await page.getByText(s.text, { exact: true }).count(), 0, "still not shown");
      await fits();
      await shot(page, "6-retry");
      await box.fill(s.text);
      await page.getByRole("button", { name: "Check again" }).click();
    } else if (i === 2) {
      // one misspelt word: it is marked, fixed on the second try, and saved for spelling practice
      tricky = s.text.match(/\b[a-z]{5,}\b/)[0];
      await box.fill(s.text.replace(tricky, `${tricky}x`));
      await page.getByRole("button", { name: "Check", exact: true }).click();
      await page.locator('main[data-phase="retry"]').waitFor();
      await page.getByText("One word is not spelt right.").waitFor();
      await page.locator(".dict-wrong", { hasText: `${tricky}x` }).waitFor();
      await box.fill(s.text);
      await page.getByRole("button", { name: "Check again" }).click();
    } else {
      await box.fill(s.text);
      await page.getByRole("button", { name: "Check", exact: true }).click();
    }
    await page.getByText("✓ Every word right").waitFor();
    await page.locator(".dict-reveal", { hasText: s.text }).waitFor();
    await page.getByRole("button", { name: i < 5 ? "Next sentence" : "Finish" }).click();
  }
  await page.getByRole("heading", { name: "3 of 5 right first time" }).waitFor();
  await page.getByText("You fixed 2 more on your second try.").waitFor();
  await page.getByText(`Words to practise: ${tricky}`).waitFor();
  await page.getByText(/now in “My tricky words”/).waitFor();
  await fits();
  await shot(page, "7-done");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByText("3 of 5 sentences right first time").waitFor();
  await page.reload();
  await page.getByText("3 of 5 sentences right first time").waitFor();
  // the misspelt word waits in My Words as a spelling practice list
  await page.getByRole("button", { name: "Open My Words" }).click();
  await page.getByRole("heading", { name: "My tricky words" }).waitFor();
  await fits();
  await shot(page, "8-tricky");
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});

test("Listen and answer: a passage that stays off the screen, four questions, then the words and the reasons", async () => {
  const PASSAGES = new Map(read("listening/passages.json").passages.map((p) => [p.id, p]));
  const { context, page, errors, foreign, fits } = await start("Ears");
  await page.getByRole("button", { name: "Try Listen and answer" }).click();
  await page.getByRole("heading", { name: "Hear a passage, then answer" }).waitFor();
  await page.getByText("Level 2: Longer stories").waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const main = page.locator('main[data-phase="listen"]');
  await main.waitFor();
  const p = PASSAGES.get(await main.getAttribute("data-passage"));
  assert.equal(p?.level, 2);
  const opening = p.text.slice(0, 40);
  assert.equal(await page.getByText(opening, { exact: false }).count(), 0, "the passage is not on screen");
  await fits();
  await shot(page, "9-listen");
  await page.getByRole("button", { name: "I am ready for the questions" }).click();
  for (let i = 0; i < 4; i++) {
    await page.locator(`main[data-phase="ask"][data-question="${i}"]`).waitFor();
    const q = p.questions[i];
    await page.getByText(q.prompt, { exact: true }).waitFor();
    assert.equal(await page.locator(".options .option").count(), 3);
    assert.equal(await page.getByText(opening, { exact: false }).count(), 0, "still not on screen");
    await page.getByRole("button", { name: /Hear (it again|the passage)|Reading aloud/ }).waitFor();
    if (i === 0) await fits(), await shot(page, "10-question");
    await page.locator(".options .option").getByText(i === 0 ? q.wrong[0] : q.right, { exact: true }).click();
  }
  await page.getByRole("heading", { name: "3 of 4 right" }).waitFor();
  await page.getByText(opening, { exact: false }).waitFor();
  await page.getByText(`You chose: ${p.questions[0].wrong[0]}`).waitFor();
  await page.getByText(p.questions[0].explain, { exact: false }).first().waitFor();
  await fits();
  await shot(page, "11-listen-done");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByText("3 of 4 questions right, over 1 passage").waitFor();
  await page.reload();
  await page.getByText("3 of 4 questions right, over 1 passage").waitFor();
  // the class syllabus points its listening lines here
  await page.getByRole("button", { name: "Open the class syllabus" }).click();
  await page.getByRole("button", { name: /Practise LS3: Listen and answer/ }).click();
  await page.getByRole("heading", { name: "Hear a passage, then answer" }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});
