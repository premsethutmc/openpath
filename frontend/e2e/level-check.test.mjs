/**
 * End-to-end: Find my level and the streams panel on an Android-sized phone (Chromium emulating 412×915; not a
 * physical phone, and the automated browser has no voice, so nothing here checks what is heard). A learner who knows
 * the first three word bands, reads everything right, writes every sentence right and spells up to level 3 is told where to start in each
 * stream; the home screen then shows each stream with its level and opens the right one. Another learner skips a part.
 * Device-only, against the production build; nothing is requested elsewhere.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-level
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/level-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const read = (p) => JSON.parse(readFileSync(new globalThis.URL(`../../content/english/${p}`, import.meta.url), "utf8"));
const WORD_KEY = new Map(read("vocabulary/size-check.json").words.map(([band, word, right]) => [word, { band, right }]));
const SENTENCES = new Map(read("dictation/sentences.json").sentences.map(([id, level, text]) => [id, { level, text }]));
const DICT = new Map(read("spelling/dictation-bank.json").items.map((it) => [it.id, it.answers[0]]));
const BEE = new Map(read("spelling/spelling-bee.json").words.map((w) => [w.id, { level: w.level, word: w.word ?? DICT.get(w.item?.id) }]));
const READING_KEY = new Map();
const walk = (x) => {
  if (Array.isArray(x)) return x.forEach(walk);
  if (x && typeof x === "object") {
    if (typeof x.prompt === "string" && typeof x.right === "string") READING_KEY.set(x.prompt, [...(READING_KEY.get(x.prompt) ?? []), x.right]);
    Object.values(x).forEach(walk);
  }
};
[1, 2, 3].forEach((l) => walk(read(`reading/level-${l}.json`)));

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

async function wordsPart(page, knowsUpTo) {
  let n = 0;
  for (; n < 13; n++) {
    await page.waitForFunction(() => ["words", "reading"].includes(document.querySelector("main")?.getAttribute("data-phase")));
    if ((await page.locator("main").getAttribute("data-phase")) !== "words") break;
    const word = await page.locator("#vocab-word").innerText();
    const k = WORD_KEY.get(word);
    assert.ok(k, `a word of the check: ${word}`);
    if (k.band <= knowsUpTo) await page.locator(".options .option", { hasText: k.right }).first().click();
    else await page.getByRole("button", { name: "I don't know this word" }).click();
    await page.waitForFunction((w) => document.querySelector("#vocab-word")?.textContent !== w, word);
  }
  return n;
}

test("Find my level: four parts, a level for each stream, and a home screen that says where to go", async () => {
  const { context, page, errors, foreign, fits } = await start("Level");
  await page.getByRole("heading", { name: "Start here: find your level" }).waitFor();
  assert.equal(await page.locator(".stream-rows").count(), 0, "no levels shown before the check");
  await fits();
  await shot(page, "1-home-before");
  await page.getByRole("button", { name: "Find my level" }).click();
  await page.getByRole("heading", { name: "Where should you start?" }).waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();

  await page.getByText("Part 1 of 4: Words").waitFor();
  await fits();
  const asked = await wordsPart(page, 3);
  assert.ok(asked >= 6 && asked <= 12, `${asked} words`);

  await page.getByText("Part 2 of 4: Reading").waitFor();
  await fits();
  await shot(page, "2-reading");
  const levels = new Set();
  for (let i = 0; i < 9; i++) {
    await page.waitForFunction(() => ["reading", "listening", "result"].includes(document.querySelector("main")?.getAttribute("data-phase")));
    const main = page.locator("main");
    if ((await main.getAttribute("data-phase")) !== "reading") break;
    levels.add(await main.getAttribute("data-level"));
    const prompt = await page.locator("#level-question").innerText();
    const rights = READING_KEY.get(prompt);
    assert.ok(rights, `a question of the course: ${prompt}`);
    const options = await page.locator(".options .option").allInnerTexts();
    const at = options.findIndex((o) => rights.includes(o.trim()));
    assert.ok(at >= 0, `the right answer is offered: ${prompt}`);
    await page.locator(".options .option").nth(at).click();
    await page.waitForFunction(([p, q]) => document.querySelector("#level-question")?.textContent !== p || document.querySelector("main")?.getAttribute("data-question") !== q, [prompt, String(i % 4)]);
  }
  assert.deepEqual([...levels], ["2", "3"], "a level up after the first text");

  await page.getByText("Part 3 of 4: Listening").waitFor();
  await fits();
  await shot(page, "3-listening");
  for (let i = 1; i <= 3; i++) {
    await page.getByText(`Sentence ${i} of 3.`, { exact: false }).waitFor();
    const s = SENTENCES.get(await page.locator("main").getAttribute("data-sentence"));
    assert.equal(await page.getByText(s.text, { exact: true }).count(), 0, "the sentence is not on screen");
    await page.locator("#dict-box").fill(s.text);
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.getByText("Part 4 of 4: Spelling").waitFor();
  await fits();
  await shot(page, "3b-spelling");
  for (let i = 1; i <= 6; i++) {
    await page.getByText(`Word ${i} of 6.`, { exact: false }).waitFor();
    const w = BEE.get(await page.locator("main").getAttribute("data-word-id"));
    assert.equal(await page.getByText(w.word, { exact: true }).count(), 0, "the word is not on screen");
    assert.equal(await page.locator("#spell-box").getAttribute("autocapitalize"), "none");
    await page.locator("#spell-box").fill(w.level <= 3 ? w.word : `${w.word}x`);
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.getByRole("heading", { name: "Here is where to start" }).waitFor();
  await page.locator('[data-part="spelling"] .status', { hasText: "Intermediate (level 3 of 5)" }).waitFor();
  await page.getByRole("button", { name: "Do the grammar check now" }).waitFor();
  await page.locator('[data-part="words"] .status', { hasText: "Level 4 of 8" }).waitFor();
  await page.locator('[data-part="reading"] .status', { hasText: "Challenger (level 3 of 3)" }).waitFor();
  await page.locator('[data-part="listening"] .status', { hasText: "Level 3 of 3" }).waitFor();
  await fits();
  await shot(page, "4-result");
  await page.getByRole("button", { name: "See what to do today" }).click();

  await page.getByRole("heading", { name: "Your English today" }).waitFor();
  assert.equal(await page.locator(".stream-rows li").count(), 5);
  await page.locator('[data-stream="words"]', { hasText: "Level 4 of 8" }).waitFor();
  await page.locator('[data-stream="reading"]', { hasText: "Challenger" }).waitFor();
  await page.locator('[data-stream="listening"]', { hasText: "Level 3 of 3" }).waitFor();
  await page.locator('[data-stream="spelling"]', { hasText: "Intermediate (level 3 of 5)" }).waitFor();
  await page.locator('[data-stream="grammar"]', { hasText: "Level 2 of 3" }).waitFor();
  // with a level found, the home screen leads with the streams and folds the rest away
  assert.equal(await page.getByRole("button", { name: "Learn new words" }).count(), 0);
  assert.equal(await page.getByRole("heading", { name: "Today's plan" }).count(), 0);
  await page.getByRole("button", { name: /^School work/ }).click();
  await page.getByRole("button", { name: "Open the class syllabus" }).waitFor();
  await page.getByRole("button", { name: /^All activities/ }).click();
  await page.getByRole("button", { name: "Learn new words" }).waitFor();
  await page.getByRole("button", { name: /^General English/ }).click();
  await page.getByRole("heading", { name: "Today's plan" }).waitFor();
  await fits();
  await shot(page, "5-home-after");
  await page.reload();
  await page.locator('[data-stream="reading"]', { hasText: "Challenger" }).waitFor();

  await page.getByRole("button", { name: "Today: Listening and writing" }).click();
  await page.getByText("Level 3: Hard sentences").waitFor();
  await page.getByRole("button", { name: "← Back" }).click();
  await page.getByRole("button", { name: "Today: Reading" }).click();
  await page.getByRole("heading", { name: "Read, think, answer" }).waitFor();
  await page.locator(".reading-next", { hasText: "Challenger" }).waitFor();
  await page.getByRole("button", { name: "← Back" }).click();
  await page.getByRole("button", { name: "Today: Words" }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const band = await page.locator('main[data-phase="meet"]').getAttribute("data-word");
  const level = read("vocabulary/daily-words.json").words.find((w) => w[2] === band)[0];
  assert.equal(level, 4, "new words start at the level found");
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});

test("Find my level: a part can be skipped, and the app says it starts by age there", async () => {
  const { context, page, errors, fits } = await start("Skipper");
  await page.getByRole("button", { name: "Find my level" }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByText("Part 1 of 4: Words").waitFor();
  await wordsPart(page, 0);
  await page.getByText("Part 2 of 4: Reading").waitFor();
  await page.getByRole("button", { name: "Skip this part" }).click();
  await page.getByText("Part 3 of 4: Listening").waitFor();
  await page.getByRole("button", { name: "Skip this part" }).click();
  await page.getByText("Part 4 of 4: Spelling").waitFor();
  await page.getByRole("button", { name: "Skip this part" }).click();
  await page.getByRole("heading", { name: "Here is where to start" }).waitFor();
  await page.locator('[data-part="words"] .status', { hasText: "Level 1 of 8" }).waitFor();
  assert.equal(await page.getByText("Skipped: the app starts you by age here.").count(), 3);
  await fits();
  await page.getByRole("button", { name: "See what to do today" }).click();
  await page.locator('[data-stream="reading"]', { hasText: "Starter" }).waitFor();
  await page.locator('[data-stream="listening"]', { hasText: "Level 2 of 3" }).waitFor();
  await page.locator('[data-stream="spelling"]', { hasText: "level 1 of 5" }).waitFor();
  await page.getByRole("button", { name: "Check my level again" }).click();
  await page.getByRole("button", { name: "Check again" }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
