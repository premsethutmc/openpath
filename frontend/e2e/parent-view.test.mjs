/**
 * End-to-end: the parent view on an Android-sized phone (Chromium emulating 412×915; not a physical phone). Behind a
 * grown-ups sum, a parent sees the child, adds a test list for them, and the child then finds it under My Words;
 * after the test the parent view shows the result and the word to work on. Device-only, production build.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-parent-view
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

async function throughGate(page) {
  await page.getByRole("button", { name: "For parents: word lists and results" }).click();
  await page.getByRole("heading", { name: "Grown-ups only" }).waitFor();
  const [, a, b] = /What is (\d+) × (\d+)\?/.exec(await page.locator('label[for="parent-gate"]').innerText());
  await page.locator("#parent-gate").fill("1");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("That is not it.").waitFor();
  await page.locator("#parent-gate").fill(String(Number(a) * Number(b)));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Your children" }).waitFor();
}

test("Parent view: gate, add a test list for the child, the child takes it, the parent sees the result", async () => {
  const context = await browser.newContext(ANDROID);
  await context.addInitScript(() => {
    const v = { name: "Test English (UK)", lang: "en-GB", localService: true, default: true, voiceURI: "test-en-gb" };
    window.__spoken = [];
    window.__beeAdvanceMs = 600000;
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
  await page.getByLabel(/Name to show/).fill("Anu");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();

  await throughGate(page);
  const child = page.locator('[data-child]', { hasText: "Anu" });
  await child.getByText("No word lists yet.").waitFor();
  await child.getByRole("button", { name: "Add a word list" }).click();
  await page.getByRole("heading", { name: "Word lists for Anu" }).waitFor();
  await page.getByRole("button", { name: "New word list" }).click();
  await page.getByText(/From a photo of a printed list/).waitFor();
  await page.getByLabel("List name").fill("Friday test");
  await page.getByLabel(/Words: one per line/).fill("garden, bridge");
  await page.getByRole("button", { name: "Check the words" }).click();
  await page.locator(".list-mode input").nth(1).check();
  await page.getByRole("button", { name: "Save the list" }).click();
  assert.equal(await page.getByRole("button", { name: "Take the test" }).count(), 0, "the parent view does not start the child's test");
  await page.getByRole("button", { name: "← Your children" }).click();
  await child.getByText("Friday test").waitFor();
  await child.getByText("2 not tried").waitFor();
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert.ok(sw <= iw);

  // the child finds the list under My Words and takes the test: one right, one wrong
  await page.getByRole("button", { name: "← Back to the child's screen" }).click();
  await page.getByRole("button", { name: "Open My Words" }).click();
  const n = await page.evaluate(() => window.__spoken.length);
  await page.getByRole("button", { name: "Take the test" }).click();
  await page.waitForFunction((k) => window.__spoken.length > k, n);
  const first = (await page.evaluate(() => window.__spoken.at(-1))).split(".")[0].trim();
  await page.locator(".ruled input").fill(first);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByText("Word 2 of 2").waitFor();
  await page.locator(".ruled input").fill("zzz");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("heading", { name: "Test complete" }).waitFor();
  await page.getByRole("button", { name: "Back to My Words" }).click();
  await page.getByRole("button", { name: "← Home" }).click();

  await throughGate(page);
  await child.getByText("last test 1 of 2 · 1 of 2 on their own · 1 wrong").waitFor();
  const other = first === "garden" ? "bridge" : "garden";
  await child.getByText(`Words to work on: ${other}`).waitFor();
  await child.getByText(/practised English on 1 of the last 7 days \(spelling on 1\)/).waitFor();
  await child.locator("[data-line=\"levels\"]").getByText("Grammar:").waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
