/**
 * End-to-end: a parent's test list and practice list on an Android-sized phone (Chromium emulating 412×915; not a
 * physical phone). Test: each word is only spoken, no help is offered, nothing is marked until the end, and the
 * parent sees the result word by word. Practice: a new word is shown and hidden, help comes in steps (blanks, then
 * a letter), a miss is marked letter by letter, and an answer reached with help comes back to be spelt unaided.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-spelling-modes
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

const spoken = (page) => page.evaluate(() => window.__spoken.slice());
async function heard(page, n) {
  await page.waitForFunction((k) => window.__spoken.length > k, n);
  return (await spoken(page)).at(-1).split(".")[0].trim();
}
async function advance(page, act) {
  const n = (await spoken(page)).length;
  await act();
  return heard(page, n);
}
async function addList(page, name, words, test) {
  await page.getByRole("button", { name: "New word list" }).click();
  await page.getByLabel("List name").fill(name);
  await page.getByLabel(/Words: one per line/).fill(words);
  await page.getByRole("button", { name: "Check the words" }).click();
  assert.ok(await page.locator(".list-mode input").nth(0).isChecked(), "a new list is for practice unless the parent says otherwise");
  if (test) await page.locator(".list-mode input").nth(1).check();
  await page.getByRole("button", { name: "Save the list" }).click();
}

test("a test list takes no help and is marked at the end; a practice list teaches", async () => {
  const context = await browser.newContext(ANDROID);
  await context.addInitScript(() => {
    const v = { name: "Test English (UK)", lang: "en-GB", localService: true, default: true, voiceURI: "test-en-gb" };
    window.__spoken = [];
    window.__beeAdvanceMs = 600000;
    window.__beePeekMs = 400;
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [v], speak: (u) => { window.__spoken.push(u.text); setTimeout(() => u.onstart?.(), 0); }, cancel: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, speaking: false, pending: false } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill("Speller");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.getByRole("button", { name: "Add a word list" }).click();

  // 1. a test list
  await addList(page, "Friday test", "garden, bridge", true);
  const testCard = page.locator(".word-lists li", { hasText: "Friday test" });
  await testCard.getByText("Test list").waitFor();
  let w = await advance(page, () => testCard.getByRole("button", { name: "Take the test" }).click());
  await page.getByRole("heading", { name: /Spelling test/ }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Help me" }).count(), 0, "no help in a test");
  assert.equal(await page.locator(".bee-look").count(), 0, "the word is not shown in a test");
  const first = w;
  await page.locator(".ruled input").fill(first);
  w = await advance(page, () => page.getByRole("button", { name: "Submit" }).click());
  assert.notEqual(w, first);
  assert.equal(await page.locator(".bee-feedback").count(), 0, "nothing is marked between words");
  await page.locator(".ruled input").fill("zzz");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("heading", { name: "Test complete" }).waitFor();
  const marks = await page.locator(".bee-test-result").innerText();
  assert.match(marks, new RegExp(`✓ ${first}`));
  assert.match(marks, new RegExp(`✗ ${w}[\\s\\S]*you wrote zzz`));
  await page.getByRole("button", { name: "Back to My Words" }).click();
  await testCard.getByText("Results: 1 of 2 right on their own").click();
  assert.match(await testCard.locator(".list-results").innerText(), new RegExp(`${w}[\\s\\S]*wrong last time \\(wrote "zzz"\\)[\\s\\S]*${first}[\\s\\S]*right on their own`));

  // 2. a practice list
  await addList(page, "Week 12", "honest, quiet", false);
  const card = page.locator(".word-lists li", { hasText: "Week 12" });
  await card.getByText("Practice list").waitFor();
  w = await advance(page, () => card.getByRole("button", { name: "Practise" }).click());
  assert.equal(await page.locator(".bee-look-word").innerText(), w, "a new word is shown first");
  assert.equal(await page.locator(".bee-answer").count(), 0, "and cannot be typed while it is on screen");
  await page.getByRole("button", { name: "Hide it. I'll spell it" }).click();
  assert.equal(await page.locator(".bee-look").count(), 0);
  await page.getByRole("button", { name: "Help me" }).click();
  assert.equal(await page.locator(".bee-pattern").innerText(), [...w].map(() => "_").join(" "));
  await page.getByRole("button", { name: "One more letter" }).click();
  assert.equal(await page.locator(".bee-pattern").innerText(), [w[0], ...[...w].slice(1).map(() => "_")].join(" "));
  await page.getByRole("button", { name: "Show me the word, then hide it" }).click();
  assert.equal(await page.locator('.bee-look[data-look="peek"] .bee-look-word').innerText(), w);
  await page.locator(".bee-look").waitFor({ state: "detached" });
  await page.locator(".ruled input").fill(`${w.slice(0, -1)}x`);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("heading", { name: "Not quite." }).waitFor();
  assert.equal(await page.locator(".bee-marks .miss").count(), 1, "the one wrong letter is marked");
  assert.equal(await page.locator(".bee-marks .miss").innerText(), w.at(-1));
  const second = await advance(page, () => page.getByRole("button", { name: "Next word" }).click());
  await page.getByRole("button", { name: "Hide it. I'll spell it" }).click();
  await page.locator(".ruled input").fill(second);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("heading", { name: "Right!" }).waitFor();
  await page.getByText("You had some help this time").waitFor();
  await page.getByRole("button", { name: "See how you did" }).click();
  await page.getByRole("heading", { name: "Session complete" }).waitFor();
  await page.getByText("2 words on your review list").waitFor();
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert.ok(sw <= iw);
  assert.deepEqual(errors, []);
  await context.close();
});
