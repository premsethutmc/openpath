/**
 * End-to-end: the Spelling Bee on an Android-sized phone (Chromium emulating 412×915; not a physical phone), against
 * the production build in device-only mode.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-bee
 *
 * Speech: headless Chromium has no voices, so a stand-in speechSynthesis records what the app asks it to say. The test
 * learns each word only from that speech, which checks the word was requested aloud; it never reads it from the page.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/bee-${name}.png`, fullPage: true });
const ANDROID = {
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
};

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function phone() {
  const context = await browser.newContext(ANDROID);
  await context.addInitScript(() => {
    const v = { name: "Test English (UK)", lang: "en-GB", localService: true, default: true, voiceURI: "test-en-gb" };
    window.__spoken = [];
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [v], speak: (u) => window.__spoken.push(u.text), cancel: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, speaking: false, pending: false } });
  });
  const errors = [];
  const foreign = [];
  context.on("page", (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      const u = new globalThis.URL(r.url());
      if (!["127.0.0.1", "localhost"].includes(u.hostname) && u.protocol !== "data:" && u.protocol !== "blob:") foreign.push(r.url());
    });
  });
  const page = await context.newPage();
  return { context, page, errors, foreign };
}

async function fits(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w, `page is ${sw}px wide on a ${w}px screen`);
}
/** Every visible button can be tapped comfortably (44 px), except small text links. */
async function tappable(page) {
  const small = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !b.classList.contains("link") && b.offsetParent !== null).map((b) => ({ t: b.textContent.trim().slice(0, 30), h: b.getBoundingClientRect().height })).filter((b) => b.h < 44));
  assert.deepEqual(small, []);
}
const spoken = (page) => page.evaluate(() => window.__spoken.slice());
/** The word now being asked, from what the app asked the voice to say ("word. sentence word."). */
async function heard(page, before) {
  await page.waitForFunction((n) => window.__spoken.length > n, before);
  const said = (await spoken(page)).at(-1);
  return said.split(".")[0].trim();
}
/** Everything a person or a screen reader can perceive: visible text, accessible labels and descriptions, titles,
 * placeholders, values, alt text, data attributes and the tab title (class and id names are internal styling hooks). */
const perceivable = (page) =>
  page.evaluate(() => {
    const parts = [document.title, document.body.innerText];
    for (const el of document.body.querySelectorAll("*")) {
      for (const a of el.attributes) if (/^(aria-|data-)|^(title|alt|placeholder|value|label|content)$/.test(a.name)) parts.push(a.value);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) parts.push(el.value);
    }
    for (const el of document.querySelectorAll(".sr-only")) parts.push(el.textContent);
    return parts.join("\n").toLowerCase();
  });
/** The word must not be perceivable anywhere in the page before it is answered. */
async function notInPage(page, word) {
  const m = new RegExp(`.{0,60}\\b${word.toLowerCase()}\\b.{0,30}`).exec(await perceivable(page));
  assert.ok(!m, `"${word}" can be seen before it was answered: ${m?.[0]}`);
}

async function newLearner(page, name) {
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
}

/** Click a button that moves to the next word, and return that word (from what the app then asks the voice to say). */
async function advance(page, name) {
  const n = (await spoken(page)).length;
  await page.getByRole("button", { name }).click();
  return heard(page, n);
}
/** Type an answer and submit it. */
async function submit(page, text) {
  await page.locator(".ruled input").fill(text);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.locator(".bee-feedback").waitFor();
}

test("Spelling Bee on an Android-sized phone: straight from Home, hear, type, feedback, progress, resume, review", async () => {
  const { context, page, errors, foreign } = await phone();
  await newLearner(page, "Bee Tester");
  // 1. Home: the Spelling Bee first, with no starting check needed; General English still there, below
  await page.getByRole("heading", { name: "Spelling Bee" }).waitFor();
  await page.getByText("100 words ready to practise").waitFor();
  await page.getByRole("heading", { name: "General English" }).waitFor();
  await page.locator(".plan li").getByRole("button", { name: "Start" }).first().waitFor();
  await fits(page);
  await tappable(page);
  await shot(page, "1-home");
  // 2. Start: the first word is said at once, and its spelling is nowhere in the page
  const first = await advance(page, "Start Spelling Bee");
  await page.getByText("Word 1 of 10").waitFor();
  assert.ok(first.length > 1);
  await notInPage(page, first);
  // Repeat says the word again, by itself
  await page.getByRole("button", { name: "Repeat the word" }).click();
  assert.equal((await spoken(page)).at(-1), first);
  await fits(page);
  await tappable(page);
  await shot(page, "2-word");
  // 3. right (capital letters and a space do not matter): feedback with the spelling
  await submit(page, first.toUpperCase() + " ");
  await page.getByRole("heading", { name: "Right!" }).waitFor();
  assert.match(await page.locator(".bee-feedback").innerText(), new RegExp(first, "i"));
  // 4. wrong: the spelling is shown, with what was typed, and it goes on the review list
  const second = await advance(page, "Next word");
  await page.getByText("Word 2 of 10").waitFor();
  await notInPage(page, second);
  await submit(page, `${second}x`);
  await page.getByRole("heading", { name: "Not quite." }).waitFor();
  const fb = await page.locator(".bee-feedback").innerText();
  assert.match(fb, new RegExp(`The spelling is ${second}`, "i"));
  assert.match(fb, /review list/);
  await fits(page);
  assert.match(await page.locator(".bee-progress").innerText(), /Word 2 of 10/, "the counter stays on the answered word");
  await shot(page, "3-feedback-wrong");
  // 5. two more, then a reload in the middle: Home offers to carry on at the same word
  let w = await advance(page, "Next word");
  assert.match(await page.locator(".bee-progress").innerText(), /Word 3 of 10[\s\S]*✓ 1[\s\S]*✗ 1/);
  for (let k = 0; k < 2; k++) {
    await notInPage(page, w);
    await submit(page, w);
    w = await advance(page, "Next word");
  }
  const fifth = w;
  await page.reload();
  const resumed = await advance(page, /Carry on Spelling Bee \(word 5 of 10\)/);
  assert.equal(resumed, fifth, "the same word after a reload");
  w = resumed;
  // 6. finish: the session ends by itself after 10 words, with a summary
  for (let k = 0; k < 6; k++) {
    await submit(page, w);
    if (k < 5) w = await advance(page, "Next word");
    else await page.getByRole("button", { name: "See how you did" }).click();
  }
  await page.getByRole("heading", { name: "Session complete" }).waitFor();
  assert.match(await page.locator(".bee-done").innerText(), /9 of 10 right \(90%\)[\s\S]*10 of 100 words practised[\s\S]*1 word on your review list/);
  await fits(page);
  await tappable(page);
  await shot(page, "4-done");
  // 7. Home and Progress show the progress
  await page.getByRole("button", { name: "Back to home" }).click();
  assert.match(await page.locator(".bee-card").innerText(), /10 of 100 practised · 1 to review/);
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Progress" }).click();
  await page.locator(".bee-progress-card").waitFor();
  assert.match(await page.locator(".bee-progress-card").innerText(), /10 of 100 words practised/);
  await fits(page);
  await shot(page, "5-progress");
  // 8. close the tab and open the app again (as after closing the browser): the record is still there, and the next
  //    session starts with the misspelt word
  await page.close();
  const again = await context.newPage();
  await again.goto(URL);
  assert.equal(await advance(again, "Start Spelling Bee"), second, "the misspelt word comes back first");
  assert.deepEqual(foreign, [], "nothing is sent anywhere: the words and answers stay on the device");
  assert.deepEqual(errors, []);
  await context.close();
});

test("General English is unchanged: the starting check is still there, separate from the Spelling Bee", async () => {
  const { context, page, errors } = await phone();
  await newLearner(page, "General Learner");
  await page.locator(".plan li", { hasText: "Find your starting point" }).getByRole("button", { name: "Start" }).click();
  await page.locator(".item").waitFor();
  assert.equal(await page.locator(".bee-progress").count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});
