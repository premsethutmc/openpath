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
const WORD_KEY = new Map(read("vocabulary/size-check.json").words.map(([band, , , word, right]) => [word, { band, right }]));
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
[1, 2, 3, 4, 5, 6].forEach((l) => walk(read(`reading/level-${l}.json`)));

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

/** Answer the word-check question on screen as a learner who knows the real words up to a level; returns what was asked. */
async function wordStep(page, n, knowsUpTo, KEY = WORD_KEY) {
  await page.getByText(new RegExp(`^Question ${n} of about \\d+$`)).waitFor();
  const word = await page.locator("#vocab-word").innerText();
  const kind = await page.locator("#vocab-word").getAttribute("data-kind");
  const k = KEY.get(word);
  const knows = !!k && k.band <= knowsUpTo;
  if (kind === "know") {
    assert.equal(await page.locator(".options .option").count(), 2, "yes or no");
    await page.getByRole("button", { name: knows ? "Yes, I know it" : "No, I don't know it" }).click();
  } else {
    assert.ok(k, `a closest-word question is about a real word: ${word}`);
    assert.equal(await page.locator(".options .option").count(), 5, "four words and 'I don't know'");
    if (knows) await page.getByRole("button", { name: k.right, exact: true }).click();
    else await page.getByRole("button", { name: "I don't know this word" }).click();
  }
  return { word, kind, real: !!k };
}

async function wordsPart(page, knowsUpTo) {
  let n = 0;
  for (; n < 40; n++) {
    await page.waitForFunction(() => ["words", "reading"].includes(document.querySelector("main")?.getAttribute("data-phase")));
    if ((await page.locator("main").getAttribute("data-phase")) !== "words") break;
    await wordStep(page, n + 1, knowsUpTo);
    await page.waitForFunction((t) => !document.querySelector(".vocab .pill")?.textContent?.includes(t) || document.querySelector("main")?.getAttribute("data-phase") !== "words", `Question ${n + 1} of`);
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
  await page.getByRole("button", { name: "Take the full check instead (about fifteen minutes)" }).click();

  await page.getByText("Part 1 of 5: Words").waitFor();
  await fits();
  const asked = await wordsPart(page, 3);
  assert.ok(asked >= 10 && asked <= 30, `${asked} word questions`);

  await page.getByText("Part 2 of 5: Reading").waitFor();
  await fits();
  await shot(page, "2-reading");
  const levels = new Set();
  for (let i = 0; i < 19; i++) {
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
    await page.waitForFunction(([p, q]) => document.querySelector("#level-question")?.textContent !== p || document.querySelector("main")?.getAttribute("data-question") !== q, [prompt, String(i % 6)]);
  }
  assert.deepEqual([...levels], ["3", "6"], "a text read well is followed by the hardest one; two texts read well are enough");
  assert.equal(await page.getByRole("button", { name: "I'm not sure" }).count(), 0, "the reading part is over");

  await page.getByText("Part 3 of 5: Listening").waitFor();
  await fits();
  await shot(page, "3-listening");
  for (let i = 1; i <= 7; i++) {
    await page.waitForFunction(() => ["listening", "spelling"].includes(document.querySelector("main")?.getAttribute("data-phase")));
    if ((await page.locator("main").getAttribute("data-phase")) !== "listening") break;
    assert.ok(i <= 6, "at most six sentences");
    await page.getByText(`Sentence ${i} of up to 6.`, { exact: false }).waitFor();
    const s = SENTENCES.get(await page.locator("main").getAttribute("data-sentence"));
    assert.equal(await page.getByText(s.text, { exact: true }).count(), 0, "the sentence is not on screen");
    await page.locator("#dict-box").fill(s.text);
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.getByText("Part 4 of 5: Spelling").waitFor();
  await fits();
  await shot(page, "3b-spelling");
  for (let i = 1; i <= 9; i++) {
    await page.waitForFunction(() => ["spelling", "grammar"].includes(document.querySelector("main")?.getAttribute("data-phase")));
    if ((await page.locator("main").getAttribute("data-phase")) !== "spelling") break;
    assert.ok(i <= 8, "at most eight words");
    await page.getByText(`Word ${i} of up to 8.`, { exact: false }).waitFor();
    const w = BEE.get(await page.locator("main").getAttribute("data-word-id"));
    assert.equal(await page.getByText(w.word, { exact: true }).count(), 0, "the word is not on screen");
    assert.equal(await page.locator("#spell-box").getAttribute("autocapitalize"), "none");
    await page.locator("#spell-box").fill(w.level <= 3 ? w.word : `${w.word}x`);
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  // grammar: a noun and a verb to find, then four sentences; this learner misses the noun and is right up to level 4
  await page.getByText("Part 5 of 5: Grammar").waitFor();
  await fits();
  await shot(page, "3c-grammar");
  const GRAMMAR = new Map(read("grammar/in-use.json").items.map((it) => [it.id, it]));
  const bare = (w) => w.replace(/[^A-Za-z']/g, "");
  for (let i = 1; i <= 10; i++) {
    await page.waitForFunction(() => ["grammar", "result"].includes(document.querySelector("main")?.getAttribute("data-phase")));
    if ((await page.locator("main").getAttribute("data-phase")) !== "grammar") break;
    assert.ok(i <= 9, "at most nine grammar questions");
    await page.getByText(`Question ${i} of up to 9.`, { exact: false }).waitFor();
    const it = GRAMMAR.get(await page.locator("main").getAttribute("data-item"));
    assert.equal(await page.getByText("[", { exact: false }).count(), 0, "the wrong word is not marked");
    const words = it.sentence.split(" ");
    const rightAt = it.kind === "spot" ? words.findIndex((w) => it.right.includes(bare(w))) : words.findIndex((w) => w.includes("["));
    const wrongAt = it.kind === "spot" ? words.findIndex((w) => !it.right.includes(bare(w))) : (rightAt + 1) % words.length;
    if (i === 1) assert.equal(it.ask, "noun");
    if (i === 2) assert.equal(it.ask, "verb");
    const ok = i === 1 ? false : i === 2 ? true : it.level <= 4;
    await page.locator(".grammar-word").nth(ok ? rightAt : wrongAt).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.getByRole("heading", { name: "Here is where to start" }).waitFor();
  await page.locator('[data-part="spelling"] .status', { hasText: "Intermediate (level 3 of 5)" }).waitFor();
  await page.locator('[data-part="grammar"] .status', { hasText: "Level 3 of 7" }).waitFor();
  await page.getByText("Naming a noun and a verb comes first.").waitFor();
  await page.getByRole("button", { name: "Do the grammar check now" }).waitFor();
  await page.locator('[data-part="words"] .status', { hasText: "common reading words (word level 2 on a scale of 1 to 8)" }).waitFor();
  await page.locator('[data-part="reading"] .status', { hasText: "Expert (level 6 of 6)" }).waitFor();
  await page.locator('[data-part="listening"] .status', { hasText: "Level 7 of 7" }).waitFor();
  await fits();
  await shot(page, "4-result");
  await page.getByRole("button", { name: "See what to do today" }).click();

  await page.getByRole("heading", { name: "Your English today" }).waitFor();
  assert.equal(await page.locator(".stream-rows li").count(), 5);
  await page.locator('[data-stream="words"]', { hasText: "Level 3 of 8" }).waitFor();
  await page.locator('[data-stream="reading"]', { hasText: "Expert" }).waitFor();
  // each level says how sure it is; with no quick check taken there is no overall number
  await page.locator('[data-stream="listening"] [data-sure]', { hasText: "fairly sure" }).waitFor();
  assert.equal(await page.locator("[data-overall]").count(), 0);
  await page.locator('[data-stream="listening"]', { hasText: "Level 7 of 7" }).waitFor();
  await page.locator('[data-stream="spelling"]', { hasText: "Intermediate (level 3 of 5)" }).waitFor();
  await page.locator('[data-stream="grammar"]', { hasText: "Level 3 of 7" }).waitFor();
  await page.locator('[data-stream="grammar"]', { hasText: "Start with naming words: noun and verb" }).waitFor();
  // with a level found, the home screen leads with the streams and folds the rest away
  assert.equal(await page.getByRole("button", { name: "Learn new words" }).count(), 0);
  assert.equal(await page.getByRole("heading", { name: "Today's plan" }).count(), 0);
  await page.getByRole("button", { name: /^School work/ }).click();
  await page.getByRole("button", { name: "Open the class syllabus" }).waitFor();
  // the rows already open the daily activities: More to practise lists only the others
  await page.getByRole("button", { name: /^More to practise/ }).click();
  await page.getByRole("button", { name: "Try Listen and answer" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Learn new words" }).count(), 0);
  await fits();
  await shot(page, "5-home-after");
  // the older journey, skill by skill, is in Journey, under the ladders of the daily activities
  await page.getByRole("button", { name: "Skill-by-skill practice and checks: in Journey" }).click();
  await page.locator('.daily-path li[data-stream="grammar"]').waitFor();
  await shot(page, "6-journey");
  await page.getByRole("button", { name: /^Skill by skill/ }).click();
  await page.getByRole("heading", { name: "Today's plan" }).waitFor();
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Progress" }).click();
  await page.getByRole("heading", { name: "Your English" }).waitFor();
  await shot(page, "7-progress");
  await page.reload();
  await page.locator('[data-stream="reading"]', { hasText: "Expert" }).waitFor();

  await page.getByRole("button", { name: "Today: Listening" }).click();
  await page.getByText("Level 7: Formal sentences").waitFor();
  await page.getByRole("button", { name: "← Back" }).click();
  await page.getByRole("button", { name: "Today: Reading" }).click();
  await page.getByRole("heading", { name: "Read, think, answer" }).waitFor();
  await page.locator(".reading-next", { hasText: "Expert" }).waitFor();
  await page.getByRole("button", { name: "← Back" }).click();
  await page.getByRole("button", { name: "Today: Words" }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const band = await page.locator('main[data-phase="meet"]').getAttribute("data-word");
  const level = read("vocabulary/daily-words.json").words.find((w) => w[2] === band)[0];
  assert.equal(level, 3, "new words start at the level found");
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});

test("Find my level: a part can be skipped, and the app says it starts by age there", async () => {
  const { context, page, errors, fits } = await start("Skipper");
  await page.getByRole("button", { name: "Find my level" }).click();
  await page.getByRole("button", { name: "Check each part (about seven minutes)" }).click();
  await page.getByText("Part 1 of 5: Words").waitFor();
  assert.ok((await wordsPart(page, 0)) <= 20, "a learner who knows none of the words is through quickly");
  await page.getByText("Part 2 of 5: Reading").waitFor();
  await page.getByRole("button", { name: "Skip this part" }).click();
  await page.getByText("Part 3 of 5: Listening").waitFor();
  await page.getByText("Sentence 1 of up to 3.", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Skip this part" }).click();
  await page.getByText("Part 4 of 5: Spelling").waitFor();
  await page.getByRole("button", { name: "Skip this part" }).click();
  await page.getByText("Part 5 of 5: Grammar").waitFor();
  await page.getByRole("button", { name: "Skip this part" }).click();
  await page.getByRole("heading", { name: "Here is where to start" }).waitFor();
  await page.locator('[data-part="words"] .status', { hasText: "below everyday words for now" }).waitFor();
  await page.getByText("This was the quick check", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Try 3 harder words" }).click();
  await page.getByRole("button", { name: "I'm not sure" }).click();
  await page.getByText("reluctant", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Unwilling at first, but eventually agreed" }).click();
  await page.getByRole("button", { name: "Chosen for now but not final" }).click();
  await page.getByRole("heading", { name: "2 of 3 correct in context" }).waitFor();
  await page.getByRole("button", { name: "Back to results", exact: true }).click();
  await page.locator('[data-part="words"] .status', { hasText: "below everyday words for now" }).waitFor();
  assert.equal(await page.getByText("Skipped: the app starts you by age here.").count(), 4);
  await fits();
  await page.getByRole("button", { name: "See what to do today" }).click();
  await page.locator('[data-stream="reading"]', { hasText: "Starter" }).waitFor();
  await page.locator('[data-stream="listening"]', { hasText: "Level 3 of 7" }).waitFor();
  await page.locator('[data-stream="spelling"]', { hasText: "level 1 of 5" }).waitFor();
  await page.getByRole("button", { name: "Check my level again" }).click();
  await page.getByRole("button", { name: "Check again" }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test("Find my level: the quick gap check is not offered, and the check each part is the first choice", async () => {
  const { context, page, errors, foreign } = await start("Gaps");
  await page.getByRole("button", { name: "Find my level" }).click();
  await page.getByText("The check begins with words", { exact: false }).waitFor();
  assert.equal(await page.getByRole("button", { name: /quick check/i }).count(), 0, "the gap check is switched off until its questions are fixed");
  const first = page.getByRole("button", { name: "Check each part (about seven minutes)" });
  assert.match(await first.getAttribute("class"), /primary/);
  await first.click();
  // it opens on the word check
  await page.waitForFunction(() => document.querySelector("main")?.getAttribute("data-phase") !== "intro");
  assert.equal(await page.locator(".gap-check").count(), 0);
  await shot(page, "7-no-gap-check");
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});
