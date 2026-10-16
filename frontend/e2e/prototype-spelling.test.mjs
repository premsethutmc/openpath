/**
 * DESIGN PROTOTYPE: the adaptive spelling prototype page (dist-prototype/adaptive-spelling.html) in Chromium, with the
 * phone's keyboard behaviours it must survive and the clue timing. Saves screenshots of each state when E2E_SHOTS is set.
 * Speech is the stand-in from e2e/lib/bee.mjs (headless Chromium has no voices).
 *
 *   node scripts/build-prototype.mjs && node --test e2e/prototype-spelling.test.mjs
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { install } from "./lib/bee.mjs";

const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
// the published page is wrapped in a document skeleton by the host; do the same here
const html = readFileSync(new URL("../dist-prototype/adaptive-spelling.html", import.meta.url), "utf8");
const file = join(mkdtempSync(join(tmpdir(), "proto-")), "index.html");
writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${html}</body></html>`);

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function open({ width = 1100 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  await install(context, { advanceMs: null, speakMs: 400 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`file://${file}`);
  await page.getByTestId("answer").waitFor();
  return { context, page, errors };
}
const shot = async (page, name) => SHOTS && page.locator(".phone").screenshot({ path: `${SHOTS}/${name}.png` });
const tiles = (page) => page.locator(".tiles .tile:not(.caret)").allInnerTexts().then((t) => t.join(""));
const evidence = async (page) => JSON.parse(await page.getByTestId("evidence").innerText());
const type = async (page, text) => {
  await page.getByTestId("answer").focus();
  await page.keyboard.type(text, { delay: 30 });
};

test("letter by letter: typing and Backspace are accepted; paste, suggestions and autocorrect are rejected without penalty", async () => {
  const { context, page, errors } = await open();
  await page.getByTestId("word-preferred").click();
  await page.getByTestId("speed-1").click();
  await type(page, "pre");
  assert.equal(await tiles(page), "pre");
  await page.keyboard.press("Backspace");
  assert.equal(await tiles(page), "pr");
  await page.getByTestId("sim-compose").click(); // Android composition, one letter at a time
  assert.equal(await tiles(page), "pre");
  for (const sim of ["sim-suggestion", "sim-autocorrect", "sim-paste"]) {
    await page.getByTestId(sim).click();
    assert.equal(await tiles(page), "pre", `${sim} is rejected`);
  }
  assert.equal(await page.getByTestId("answer").inputValue(), "pre", "the box is back to the child's own letters");
  await page.locator(".nudge").waitFor();
  const ev = await evidence(page);
  assert.deepEqual(ev.rejectedInputs.map((r) => r.reason).sort(), ["paste", "replacement", "suggestion"]);
  assert.equal(ev.attempts.length, 0, "nothing is counted as an answer");
  await shot(page, "09-suggestion-rejected");
  assert.deepEqual(errors, []);
  await context.close();
});

test("the full journey: listening, typing, clues offered in time, letters revealed, wrong with help, right, grown-up view", async () => {
  const { context, page, errors } = await open();
  // 1. listening
  await page.locator(".speaker.on").waitFor();
  await shot(page, "01-listening");
  // 2. typing
  await type(page, "fri");
  await page.locator(".speaker:not(.on)").waitFor();
  await shot(page, "02-typing");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  // 3. the timer offers the sentence (4× speed: 8 s of thinking in about 2 s)
  await page.getByTestId("speed-4").click();
  await page.getByTestId("offer").waitFor({ timeout: 8000 });
  assert.match(await page.getByTestId("offer").innerText(), /sentence/);
  await shot(page, "03-clue-offered");
  await page.getByTestId("clue").click();
  await page.locator(".clue-sentence").waitFor();
  assert.ok(!/friend/i.test(await page.locator(".clue-sentence").innerText()), "the sentence is shown with the word blanked");
  await shot(page, "04-context-clue");
  // 4. meaning, then the first letter
  await page.getByTestId("offer").waitFor({ timeout: 8000 });
  await page.getByTestId("clue").click();
  await page.locator(".clue-meaning").waitFor();
  await page.getByTestId("offer").waitFor({ timeout: 10000 });
  await page.getByTestId("clue").click();
  await page.getByTestId("pattern").waitFor();
  assert.equal(await page.locator(".clue-letters .given").count(), 1);
  await shot(page, "05-first-letter");
  // 5. more letters only on request, with a pause between them; never the whole word
  await page.waitForFunction(() => !document.querySelector("[data-testid=clue]").disabled, null, { timeout: 5000 });
  await page.getByTestId("clue").click();
  assert.equal(await page.locator(".clue-letters .given").count(), 2);
  await shot(page, "06-more-letters");
  // 6. right: assisted (letters were revealed)
  await type(page, "friend");
  assert.equal(await tiles(page), "friend");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByTestId("right").waitFor();
  await shot(page, "08-success");
  const ev = await evidence(page);
  assert.equal(ev.completion, "assisted");
  assert.equal(ev.lettersRevealed, 2);
  assert.deepEqual(ev.clues.map((c) => c.level), [1, 2, 3, 4]);
  assert.ok(ev.activeMs > 0 && ev.plays >= 1);
  // 7. preferred, with earlier doubling slips: "prefered" gets targeted help, keeping the right start
  await page.getByTestId("seed").check();
  await page.getByTestId("word-preferred").click();
  await type(page, "prefered");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByTestId("help").waitFor();
  assert.equal(await page.getByTestId("help").getAttribute("data-help"), "targeted");
  assert.match(await page.getByTestId("help").innerText(), /doubled/);
  await shot(page, "07-wrong-targeted-help");
  await page.getByTestId("try-again").click();
  assert.equal(await tiles(page), "prefer", "the right start is kept");
  await type(page, "red");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByTestId("right").waitFor();
  const ev2 = await evidence(page);
  assert.equal(ev2.completion, "assisted");
  assert.equal(ev2.independentAnswer, "prefered");
  assert.deepEqual(ev2.possiblePatterns, [{ pattern: "missed_double", support: "supported" }]);
  assert.deepEqual(ev2.reassess, { needed: true, when: "next_session", reason: "completed with help" });
  // 8. their: "there" is a different word; twice wrong, then written together (guided)
  await page.getByTestId("word-their").click();
  await type(page, "there");
  await page.getByRole("button", { name: "Submit" }).click();
  assert.equal(await page.getByTestId("help").getAttribute("data-help"), "other_word");
  await shot(page, "07b-wrong-different-word");
  await page.getByTestId("try-again").click();
  await type(page, "thier");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByTestId("copy").waitFor();
  await shot(page, "07c-write-it-together");
  await type(page, "their");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByTestId("right").waitFor();
  assert.equal((await evidence(page)).completion, "guided");
  // 9. necessary, right first time: independent
  await page.getByTestId("word-necessary").click();
  await type(page, "necessary");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByTestId("right").waitFor();
  assert.equal((await evidence(page)).completion, "independent");
  // 10. the grown-up view
  await page.getByTestId("tab-grown-up").click();
  const gu = await page.getByTestId("grown-up").innerText();
  assert.match(gu, /4\s*words tried/);
  assert.match(gu, /1 of 4\s*spelt on their own/);
  assert.match(gu, /Doubling a letter/);
  assert.match(gu, /their/);
  await shot(page, "10-grown-up-view");
  assert.deepEqual(errors, []);
  await context.close();
});

test("the timer pauses while the word is said and when the page is hidden; offers wait while the child types", async () => {
  const { context, page } = await open();
  await page.getByTestId("speed-4").click();
  await page.locator(".speaker:not(.on)").waitFor();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const a = (await evidence(page)).activeMs;
  await page.waitForTimeout(1500);
  assert.equal((await evidence(page)).activeMs, a, "no thinking time counted while hidden");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  // keep typing: no offer interrupts
  await page.getByTestId("answer").focus();
  for (let k = 0; k < 8; k++) {
    await page.keyboard.type("f");
    await page.waitForTimeout(250);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(250);
  }
  assert.ok((await evidence(page)).activeMs >= 8000, "past 8 s of thinking time");
  assert.equal(await page.getByTestId("offer").count(), 0, "no offer while typing");
  await page.getByTestId("offer").waitFor({ timeout: 5000 });
  await context.close();
});

test("the page fits a phone: no sideways scrolling at 390 px", async () => {
  const { context, page } = await open({ width: 390 });
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  const wide = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 4).map((e) => `${e.tagName}.${e.className}`));
  assert.ok(sw <= w, `${sw} > ${w}: ${wide.join(", ")}`);
  await context.close();
});
