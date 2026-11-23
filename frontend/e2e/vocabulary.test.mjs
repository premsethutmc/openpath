/**
 * End-to-end: the Word check on an Android-sized phone (Chromium emulating 412×915; not a physical phone). A learner
 * who knows the words of the first four levels and says so honestly is placed at level 3 or 4, with nothing that reads as marks;
 * the result is kept after a reload. Device-only, against the production build; nothing is requested elsewhere.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-vocabulary
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/vocabulary-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const KEY = new Map(JSON.parse(readFileSync(new globalThis.URL("../../content/english/vocabulary/size-check.json", import.meta.url), "utf8")).words.map(([band, , , word, right]) => [word, { band, right }]));
/** Answer the word-check question on screen as a learner who knows the real words up to a level; returns what was asked. */
async function wordStep(page, n, knowsUpTo, KEY) {
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


let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

test("Word check: answer, say 'I don't know', get a sample score, and find it kept", async () => {
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
  await page.getByLabel(/Name to show/).fill("Words");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();

  await page.getByRole("button", { name: "Check my words" }).click();
  await page.getByRole("heading", { name: "Find where your words reach" }).waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const asked = [];
  let n = 1;
  for (; n <= 32 && !(await page.locator('main[data-phase="done"]').count()); n++) {
    const q = await wordStep(page, n, 4, KEY);
    assert.ok(!asked.some((x) => x.word === q.word && x.kind === q.kind), "no question twice");
    asked.push(q);
    if (n === 1) {
      const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
      assert.ok(sw <= w);
      await shot(page, "1-word");
    }
    await page.waitForFunction((t) => !document.querySelector(".vocab .pill")?.textContent?.includes(t) || document.querySelector('main[data-phase="done"]'), `Question ${n} of`);
  }
  assert.ok(asked.some((x) => x.kind === "know" && !x.real), "made-up words are mixed in");
  assert.ok(asked.some((x) => x.kind === "pick"), "closest-word questions follow");
  assert.ok(asked.some((x) => x.real && KEY.get(x.word).band >= 6), "the check went up to words this learner does not know");
  const RESULT = /^Your words reach (wider|advanced) reading words$/;
  await page.getByRole("heading", { name: RESULT }).waitFor();
  await page.getByText(/^Word level [34] on a scale of 1 to 8\./).waitFor();
  await page.getByText("not marks out of eight", { exact: false }).waitFor();
  assert.equal(await page.getByText(/\d+ of \d+ (meanings )?correct/).count(), 0, "nothing that reads as marks");
  await shot(page, "2-result");
  await page.getByRole("button", { name: "Try 3 harder words" }).click();
  await page.getByText("Question 1 of 3").waitFor();
  assert.equal(await page.getByText("Nobody could tell", { exact: false }).count(), 1);
  await page.getByText("Rule out choices (optional)").click();
  const eliminate = page.getByRole("checkbox", { name: "Openly hostile to the proposal" });
  await eliminate.check();
  const hostile = page.getByRole("button", { name: "Openly hostile to the proposal" });
  assert.equal(await hostile.isEnabled(), false);
  await eliminate.uncheck();
  assert.equal(await hostile.isEnabled(), true);
  await eliminate.check();
  await page.getByRole("button", { name: "Ambiguous about where she stood" }).click();
  await page.getByText("Question 2 of 3").waitFor();
  assert.equal(await page.getByText("‘Nobody could tell’ is the clue.", { exact: false }).count(), 0);
  await page.getByRole("button", { name: "Made the noise weaker" }).click();
  await page.getByRole("button", { name: "Ruled out the appeal entirely" }).click();
  await page.getByRole("heading", { name: "3 of 3 correct in context" }).waitFor();
  await page.getByText("She gave reasons on both sides; there is no open opposition.", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Back to results", exact: true }).click();
  await page.getByRole("heading", { name: RESULT }).waitFor();
  await page.reload();
  await page.getByText(/^Last time: (wider|advanced) reading words \(word level [34] on a scale of 1 to 8\)$/).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});
