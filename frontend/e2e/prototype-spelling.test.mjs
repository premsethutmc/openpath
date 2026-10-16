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

async function open({ width = 1100, hash = "", mobile = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: mobile ? 800 : 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce", isMobile: mobile, hasTouch: mobile });
  await install(context, { advanceMs: null, speakMs: 400 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`file://${file}${hash}`);
  await page.getByTestId("start-btn").click();
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
  assert.equal(await page.locator(".clue-letters .blank").count(), 0, "the word's length is not shown");
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
  assert.deepEqual(ev.lettersRevealed, [{ index: 0, letter: "f" }, { index: 1, letter: "r" }], "exactly which letters were given");
  assert.equal(await page.getByTestId("counted").getAttribute("data-completion"), "assisted");
  assert.deepEqual(ev.clues.map((c) => c.level), [1, 2, 3, 4]);
  assert.ok(ev.timing.activeMs > 0 && ev.plays >= 1);
  assert.equal(ev.timing.usedFor, "offering help only");
  // 7. preferred, with earlier doubling slips: "prefered" gets targeted help, keeping the right start
  await page.getByTestId("seed").check();
  await page.getByTestId("word-preferred").click();
  await type(page, "prefered");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByTestId("help").waitFor();
  assert.equal(await page.getByTestId("help").getAttribute("data-help"), "targeted");
  assert.match(await page.getByTestId("help").innerText(), /doubled/);
  assert.equal(await page.getByTestId("positions").count(), 0, "positions only when asked");
  await shot(page, "07-wrong-targeted-help");
  await page.getByTestId("show-where").click();
  await page.getByTestId("positions").waitFor();
  await shot(page, "07a-show-me-where");
  await page.getByTestId("try-again").click();
  assert.equal(await tiles(page), "prefer", "the right start is kept");
  await type(page, "red");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByTestId("right").waitFor();
  const ev2 = await evidence(page);
  assert.equal(ev2.completion, "assisted");
  assert.equal(ev2.independentAnswer, "prefered");
  assert.deepEqual(ev2.possibleDifficulties, [{ pattern: "missed_double", seenInWords: 3, status: "possible_difficulty" }]);
  assert.equal(ev2.positionsShown, true);
  assert.deepEqual(ev2.lettersRevealed, []);
  assert.deepEqual(ev2.reassess, { needed: true, when: "next_session", reason: "spelt with help" });
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
  assert.equal(await page.getByTestId("counted").getAttribute("data-completion"), "guided");
  // 9. necessary, right first time: independent
  await page.getByTestId("word-necessary").click();
  await type(page, "necessary");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByTestId("right").waitFor();
  assert.equal((await evidence(page)).completion, "independent");
  // 10. the grown-up view
  await page.getByTestId("tab-grown-up").click();
  const gu = await page.getByTestId("grown-up").innerText();
  assert.match(gu, /1\s*on their own\s*2\s*with help\s*1\s*copied with guidance/);
  assert.match(gu, /friend\s*With help\s*Letters given: f, r/);
  assert.match(gu, /their\s*Copied with guidance/);
  assert.match(gu, /necessary\s*On their own/);
  assert.match(gu, /Doubling a letter[\s\S]*worth practising/);
  assert.match(gu, /not a diagnosis/);
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
  const a = (await evidence(page)).timing.activeMs;
  await page.waitForTimeout(1500);
  assert.equal((await evidence(page)).timing.activeMs, a, "no thinking time counted while hidden");
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
  assert.ok((await evidence(page)).timing.activeMs >= 8000, "past 8 s of thinking time");
  assert.equal(await page.getByTestId("offer").count(), 0, "no offer while typing");
  await page.getByTestId("offer").waitFor({ timeout: 5000 });
  await context.close();
});

for (const width of [360, 390, 412]) {
  test(`on a ${width} px phone: no sideways scrolling; the child's screen fills the width; typing and Submit work`, async () => {
    for (const hash of ["", "#child"]) {
      const { context, page, errors } = await open({ width, hash, mobile: true });
      const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
      const wide = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 4).map((e) => `${e.tagName}.${e.className}`));
      assert.ok(sw <= w, `${hash || "page"}: ${sw} > ${w}: ${wide.join(", ")}`);
      const box = await page.locator(".phone-screen").boundingBox();
      assert.ok(box.width >= width - 1, `the screen fills the phone (${box.width} of ${width})`);
      const speaker = await page.getByTestId("speaker").boundingBox();
      assert.ok(speaker.width >= 100, "the big speaker button");
      await page.getByTestId("answer").tap();
      await page.keyboard.type("friend", { delay: 20 }); // the first word
      await page.getByRole("button", { name: "Submit" }).tap();
      await page.getByTestId("right").waitFor();
      if (hash) {
        assert.equal(await page.locator(".controls").isVisible(), false, "child screen only");
        if (SHOTS && width === 390) await page.screenshot({ path: `${SHOTS}/11-child-only-390.png` });
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  });
}
