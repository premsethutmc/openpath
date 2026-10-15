/**
 * End-to-end: the Spelling Bee in a PILOT build made from the recorded approvals (build-english.mjs --pilot), on an
 * Android-sized phone (Chromium emulating 412×915; not a physical phone). A pilot learner opens the Spelling Bee
 * straight from Home, with no starting check first; all 100 approved words are there; the word is spoken and never
 * shown before the answer; the session survives a reload. The pilot boundary still holds: no parent's own words
 * (My Words, My Books), no generated practice, nothing sent to another site.
 *
 *   node scripts/build-english.mjs --pilot --out=dist-english-pilot-approved
 *   PORT=4178 DIST=dist-english-pilot-approved npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4178 npm run english:e2e-pilot-bee
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4178";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/pilot-bee-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

const spoken = (page) => page.evaluate(() => window.__spoken.slice());
async function advance(page, name) {
  const n = (await spoken(page)).length;
  await page.getByRole("button", { name }).click();
  await page.waitForFunction((k) => window.__spoken.length > k, n);
  return (await spoken(page)).at(-1).split(".")[0].trim();
}
async function notInPage(page, word) {
  const html = (await page.evaluate(() => document.title + document.body.outerHTML)).toLowerCase();
  assert.ok(!new RegExp(`\\b${word.toLowerCase()}\\b`).test(html), `"${word}" is in the page before it was answered`);
}

test("pilot build: a pilot learner opens the Spelling Bee straight from Home; the approved 100 words; the boundary holds", async () => {
  const context = await browser.newContext(ANDROID);
  await context.addInitScript(() => {
    const v = { name: "Test English (UK)", lang: "en-GB", localService: true, default: true, voiceURI: "test-en-gb" };
    window.__spoken = [];
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [v], speak: (u) => { window.__spoken.push(u.text); setTimeout(() => u.onstart?.(), 0); }, cancel: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, speaking: false, pending: false } });
  });
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
  await page.getByLabel(/Name to show/).fill("Pilot Speller");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();

  // Home: the Spelling Bee with all 100 approved words; no parent's own words in a pilot build
  await page.getByRole("heading", { name: "Spelling Bee" }).waitFor();
  await page.getByText("100 words ready to practise").waitFor();
  assert.equal(await page.getByRole("heading", { name: /^My Words$|^My Books$/ }).count(), 0, "no My Words or My Books in a pilot build");
  await shot(page, "1-home");
  // straight in: no starting check first; the word is spoken and nowhere on the page
  const first = await advance(page, "Start Spelling Bee");
  await page.getByText("Word 1 of 10").waitFor();
  await notInPage(page, first);
  await page.getByRole("button", { name: "Repeat the word" }).click();
  assert.equal((await spoken(page)).at(-1), first);
  await page.locator(".ruled input").fill(first);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("heading", { name: "Right!" }).waitFor();
  const second = await advance(page, "Next word");
  await notInPage(page, second);
  await shot(page, "2-word");
  // a reload carries on at the same word
  await page.reload();
  assert.equal(await advance(page, /Carry on Spelling Bee \(word 2 of 10\)/), second);
  // Me says what a pilot build offers
  await page.getByRole("button", { name: "← Home" }).click();
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Me", exact: true }).click();
  await page.getByText(/Pilot version: only approved questions are shown.*the Spelling Bee/).waitFor();
  assert.deepEqual(foreign, [], "nothing is sent to another site");
  assert.deepEqual(errors, []);
  await context.close();
});
