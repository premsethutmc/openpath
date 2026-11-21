/**
 * End-to-end on an Android-sized phone: "Slips Tamil speakers often make" opens grammar practice on that topic;
 * "Sounds that are easy to mix up" says one word of a pair (speech stubbed), the child taps it, hears both, and a
 * sitting of eight is saved.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
let browser;
before(async () => (browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })));
after(() => browser?.close());

async function home(context, tamil = true) {
  await context.addInitScript(() => {
    const v = { name: "Test English (India)", lang: "en-IN", localService: true, default: true, voiceURI: "test-en-in" };
    window.__spoken = [];
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [v], speak: (u) => { window.__spoken.push(u.text); setTimeout(() => u.onstart?.(), 0); setTimeout(() => u.onend?.(), 5); }, cancel: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, speaking: false, pending: false } });
  });
  const page = await context.newPage();
  await page.goto(URL);
  if (tamil) await page.locator(".ta-toggle").first().click();
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill("Slips");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  const fold = page.locator("button.fold[aria-controls='all-activities']");
  await fold.waitFor();
  if ((await fold.getAttribute("aria-expanded")) !== "true") await fold.click();
  return page;
}

test("Without Tamil help the Tamil-speaker activities are not shown, nor found by grammar search", async () => {
  const context = await browser.newContext(ANDROID);
  const page = await home(context, false);
  await page.locator("section[aria-labelledby='kinds-card-title']").waitFor();
  assert.equal(await page.locator("section[aria-labelledby='slips-card-title']").count(), 0);
  assert.equal(await page.locator("section[aria-labelledby='sounds-card-title']").count(), 0);
  await page.locator("#grammar-search").fill("myself");
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.grammar-hits li[data-topic="tamil_slips"]').count(), 0);
  await context.close();
});

test("Slips Tamil speakers often make: opens grammar practice on that topic", async () => {
  const context = await browser.newContext(ANDROID);
  const page = await home(context);
  await page.locator("section[aria-labelledby='slips-card-title']").getByRole("button", { name: "Fix these slips" }).click();
  await page.getByText(/^Topics: Slips Tamil speakers often make/).waitFor();
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByText("Some English slips come from Tamil word order", { exact: false }).first().waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/slips-1.png` });
  await context.close();
});

test("Sounds: the phone says one word, the child taps it, hears both, eight rounds are saved", async () => {
  const context = await browser.newContext(ANDROID);
  const page = await home(context);
  await page.locator("section[aria-labelledby='sounds-card-title']").getByRole("button", { name: "Listen and say" }).click();
  await page.locator('main.sounds[data-phase="intro"]').waitFor();
  await page.locator('button[data-group="v_w"]').click();
  for (let i = 0; i < 8; i++) {
    await page.locator(`main.sounds[data-phase="ask"][data-round="${i}"]`).waitFor();
    await page.waitForFunction(() => window.__spoken.length > 0);
    const said = await page.evaluate(() => window.__spoken.at(-1));
    const words = await page.locator(".sound-choices .choice").evaluateAll((els) => els.map((e) => e.dataset.word));
    assert.ok(words.includes(said), `${said} in ${words}`);
    // one wrong on purpose, to see the tip
    const tap = i === 0 ? words.find((w) => w !== said) : said;
    await page.locator(`.sound-choices .choice[data-word="${tap}"]`).click();
    await page.locator('main.sounds[data-phase="answered"]').waitFor();
    if (i === 0) {
      await page.getByText(`It was "${said}"`).waitFor();
      await page.getByText("rest your top teeth on your bottom lip", { exact: false }).waitFor();
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/sounds-1.png` });
    }
    await page.getByRole("button", { name: i < 7 ? "Next word" : "Finish" }).click();
  }
  await page.getByRole("heading", { name: "7 of 8 heard right" }).waitFor();
  await page.getByRole("button", { name: "Done" }).click();
  await page.locator('button[data-group="v_w"]').waitFor();
  await page.getByText("7 of 8 right last time").waitFor();
  await context.close();
});
