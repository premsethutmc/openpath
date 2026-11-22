/**
 * End-to-end: the Word check on an Android-sized phone (Chromium emulating 412×915; not a physical phone). A learner
 * who knows the words of the first four bands and says "I don't know" above them gets a sample score and provisional practice recommendation;
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
const KEY = new Map(JSON.parse(readFileSync(new globalThis.URL("../../content/english/vocabulary/size-check.json", import.meta.url), "utf8")).words.map(([band, word, right]) => [word, { band, right }]));

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
  await page.getByRole("heading", { name: "Check your word meanings" }).waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const asked = [];
  for (let i = 1; i <= 24; i++) {
    if (await page.locator('main[data-phase="done"]').count()) break;
    await page.getByText(`Word ${i}`, { exact: true }).waitFor();
    const word = await page.locator("#vocab-word").innerText();
    const k = KEY.get(word);
    assert.ok(k, `a word of the check: ${word}`);
    assert.ok(!asked.includes(word), "no word twice");
    asked.push(word);
    assert.equal(await page.locator(".options .option").count(), 4, "three meanings and 'I don't know'");
    if (i === 1) {
      const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
      assert.ok(sw <= w);
      await shot(page, "1-word");
    }
    if (k.band <= 4) await page.locator(".options .option", { hasText: k.right }).first().click();
    else await page.getByRole("button", { name: "I don't know this word" }).click();
    await page.waitForFunction((w) => document.querySelector("#vocab-word")?.textContent !== w, word);
  }
  await page.getByRole("heading", { name: "6 of 12 meanings correct" }).waitFor();
  await page.getByText("Suggested practice: Level 5 of 8.").waitFor();
  await shot(page, "2-result");
  await page.reload();
  await page.getByText("Last time: 6 of 12 correct").waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});
