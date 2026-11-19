/**
 * End-to-end: First words on an Android-sized phone (Chromium emulating 412×915; not a physical phone, and the
 * automated browser has no voice, so nothing here checks what is heard). A learner who reads nothing finds
 * pictures for four words, builds three of them from letters, and does three things a sentence says, by tapping
 * only. The word is never on screen before the right answer. Progress is kept after a reload.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-first
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/first-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const FIRST = JSON.parse(readFileSync(new globalThis.URL("../../content/english/first/words.json", import.meta.url), "utf8"));
const WORD = new Map(FIRST.words.map((w) => [w.id, w]));

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

test("First words: ten steps by tapping only, a wrong tap switched off, the word shown only after it is found", async () => {
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
  await page.getByLabel(/Name to show/).fill("Beginner");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  const fits = async () => {
    const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    assert.ok(sw <= w, "no sideways scrolling");
  };
  await page.getByRole("button", { name: "Try First words" }).click();
  const kinds = [];
  const shots = new Set();
  for (let i = 1; i <= 10; i++) {
    const main = page.locator('main.first[data-phase="ask"]');
    await main.waitFor();
    await page.getByLabel(`Step ${i} of 10`).waitFor();
    const kind = await main.getAttribute("data-kind");
    const key = await main.getAttribute("data-key");
    kinds.push(kind);
    if (!shots.has(kind)) (shots.add(kind), await fits(), await shot(page, `${shots.size}-${kind}`));
    await page.getByRole("button", { name: "Hear it again" }).waitFor();
    if (kind === "hear") {
      const w = WORD.get(key);
      assert.equal(await page.getByText(w.word, { exact: true }).count(), 0, "the word is not on screen");
      assert.equal(await page.locator(".first-option").count(), 3);
      if (i === 1) {
        // one wrong tap: that picture is switched off, and the step goes on
        const wrong = page.locator(".first-option").filter({ hasNotText: w.picture }).first();
        await wrong.click();
        assert.equal(await page.locator(".first-option:disabled").count(), 1);
        await main.waitFor();
      }
      await page.locator(".first-option", { hasText: w.picture }).click();
      await page.locator('main.first[data-phase="right"]').waitFor();
      await page.locator(".first-reveal .first-word", { hasText: w.word }).waitFor();
    } else if (kind === "build") {
      const w = WORD.get(key);
      assert.equal(await page.locator(".first-tile").count(), w.word.length + 2);
      for (const ch of w.word) await page.locator(`.first-tile:not(:disabled)[aria-label="Letter ${ch}"]`).first().click();
      await page.locator('main.first[data-phase="right"]').waitFor();
      await page.locator(`[data-placed="${w.word}"]`).waitFor();
    } else if (kind === "count") {
      const [number, noun] = key.split(" ");
      const n = FIRST.numbers.indexOf(number) + 1;
      const w = FIRST.words.find((x) => noun === x.word || noun === `${x.word}s` || noun === `${x.word}es`);
      const options = await page.locator(".first-option").allInnerTexts();
      await page.locator(".first-option").nth(options.indexOf(w.picture.repeat(n))).click();
      await page.locator('main.first[data-phase="right"]').waitFor();
    } else if (kind === "colour") {
      const colour = FIRST.colours.find((c) => key === `the ${c.id} one`);
      await page.locator(".first-option", { hasText: colour.picture }).click();
      await page.locator('main.first[data-phase="right"]').waitFor();
    } else {
      const rel = FIRST.place.relations.find((r) => key.includes(` ${r.say} the `));
      assert.equal(await page.locator(".first-zone").count(), 3);
      await page.locator(`.first-zone[data-zone="${rel.id}"]`).click();
      await page.locator('main.first[data-phase="right"]').waitFor();
      assert.notEqual(await page.locator(`.first-zone[data-zone="${rel.id}"]`).innerText(), "", "the thing is now in its place");
    }
    await fits();
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  assert.deepEqual(kinds, ["hear", "hear", "hear", "hear", "count", "build", "build", "colour", "build", "place"]);
  await page.getByRole("heading", { name: "9 of 10 on the first tap" }).waitFor();
  await fits();
  await shot(page, "9-done");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByText("4 of 66 words met, 3 found on the first tap").waitFor();
  await page.reload();
  await page.getByText("4 of 66 words met, 3 found on the first tap").waitFor();
  await page.getByRole("button", { name: "More first words" }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});
