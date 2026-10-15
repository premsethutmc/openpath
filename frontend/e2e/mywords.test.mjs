/**
 * End-to-end: My Words on an Android-sized phone (Chromium emulating 412×915; not a physical phone): a parent types,
 * pastes and uploads a list, sees what was not added and why, edits and saves it; the learner practises it with the
 * Spelling Bee's screen; progress per list; delete. Device-only, against the production build.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-mywords
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/mywords-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function fits(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w, `page is ${sw}px wide on a ${w}px screen`);
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
const spoken = (page) => page.evaluate(() => window.__spoken.slice());
async function heard(page, n) {
  await page.waitForFunction((k) => window.__spoken.length > k, n);
  return (await spoken(page)).at(-1).split(".")[0].trim();
}
async function advance(page, name) {
  const n = (await spoken(page)).length;
  await page.getByRole("button", { name }).click();
  return heard(page, n);
}

test("My Words: type, paste and upload a list, see problems, edit, save, practise it, see its progress, delete it", async () => {
  const context = await browser.newContext(ANDROID);
  await context.addInitScript(() => {
    const v = { name: "Test English (UK)", lang: "en-GB", localService: true, default: true, voiceURI: "test-en-gb" };
    window.__spoken = [];
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [v], speak: (u) => { window.__spoken.push(u.text); if (!(window.__drop > 0 && window.__drop--)) setTimeout(() => u.onstart?.(), 0); }, cancel: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, speaking: false, pending: false } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill("List Learner");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();

  // 1. Home: My Words is there, without any starting check
  await page.getByRole("heading", { name: "My Words" }).waitFor();
  await page.getByText("Practise words supplied by a parent.").waitFor();
  await page.getByRole("button", { name: "Add a word list" }).click();
  await page.getByRole("button", { name: "New word list" }).click();
  // 2. type and paste words, with mistakes; check them
  await page.getByLabel("List name").fill("Week 3 spellings");
  await page.getByLabel(/Words: one per line/).fill("colour/color, because\nisland; b4\nbecause\n\nhello!");
  await page.getByRole("button", { name: "Check the words" }).click();
  await page.getByRole("heading", { name: "3 words ready" }).waitFor();
  const review = await page.locator(".list-review").innerText();
  assert.match(review, /Not added \(3\)/);
  assert.match(review, /“b4”: has numbers/);
  assert.match(review, /“because”: already in the list/);
  assert.match(review, /“hello!”: has characters/);
  // 3. upload a CSV file: its words are added and checked
  await page.locator('input[type="file"]').setInputFiles({ name: "extra.csv", mimeType: "text/csv", buffer: Buffer.from("castle,listen\n") });
  await page.getByRole("heading", { name: "5 words ready" }).waitFor();
  // 4. edit: remove a word
  await page.getByRole("button", { name: "Remove island" }).click();
  await page.getByRole("heading", { name: "4 words ready" }).waitFor();
  await fits(page);
  await shot(page, "1-editor");
  await page.getByRole("button", { name: "Save the list" }).click();
  // 5. the saved list
  const card = page.locator(".word-lists li", { hasText: "Week 3 spellings" });
  await card.waitFor();
  assert.match(await card.innerText(), /4 words · practised 0 of 4/);
  await fits(page);
  await shot(page, "2-lists");
  // 6. practise: the same Spelling Bee screen; each word spoken, never in the page; the variant is accepted
  let w = await advance(page, "Practise");
  await page.getByText("Word 1 of 4").waitFor();
  assert.match(await page.locator(".eyebrow").innerText(), /Week 3 spellings/i);
  const answers = { colour: "color", because: "becuase", listen: "listen", castle: "Castle" };
  for (let k = 0; k < 4; k++) {
    assert.ok(w in answers, `asked a word from the list (${w})`);
    const m = new RegExp(`.{0,60}\\b${w}\\b.{0,30}`).exec(await perceivable(page));
    assert.ok(!m, `"${w}" can be seen before it was answered: ${m?.[0]}`);
    await page.locator(".ruled input").fill(answers[w]);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.locator(".bee-feedback").waitFor();
    if (w === "because") await page.getByRole("heading", { name: "Not quite." }).waitFor();
    else await page.getByRole("heading", { name: "Right!" }).waitFor();
    if (k < 3) w = await advance(page, "Next word");
    else await page.getByRole("button", { name: "See how you did" }).click();
  }
  await page.getByRole("heading", { name: "Session complete" }).waitFor();
  assert.match(await page.locator(".bee-done").innerText(), /3 of 4 right \(75%\)[\s\S]*4 of 4 words practised[\s\S]*1 word on your review list/);
  await fits(page);
  await shot(page, "3-done");
  // 7. back to My Words: progress for this list
  await page.getByRole("button", { name: "Back to My Words" }).click();
  await page.getByRole("heading", { name: "My Words" }).waitFor();
  assert.match(await card.innerText(), /practised 4 of 4 · 3 of 4 right · 1 to review/);
  // 8. reload: the list and its progress are still there
  await page.reload();
  await page.getByRole("button", { name: "Open My Words" }).click();
  assert.match(await card.innerText(), /practised 4 of 4/);
  // 9. edit shows the words; delete removes the list
  await card.getByRole("button", { name: "Edit" }).click();
  assert.match(await page.getByLabel(/Words: one per line/).inputValue(), /colour\/color/);
  await page.getByRole("button", { name: "← My Words" }).click();
  await card.getByRole("button", { name: "Delete" }).click();
  await page.getByText("No lists yet.").waitFor();
  // deleted for real: the list's words and the typed answers are gone from the browser's stored record (every row),
  // and a reload does not bring the list back
  const stored = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("openpath-english");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const rows = await new Promise((resolve) => {
      const r = db.transaction("events").objectStore("events").getAll();
      r.onsuccess = () => resolve(r.result);
    });
    return JSON.stringify(rows);
  });
  for (const secret of ["colour", "color", "because", "becuase", "castle", "listen", "Week 3 spellings"]) assert.ok(!stored.includes(secret), `"${secret}" is still stored`);
  assert.match(stored, /"word_list_delete"/);
  assert.match(stored, /"removed-1"/, "the answers are kept, without their words");
  await page.reload();
  await page.getByRole("button", { name: "Add a word list" }).click();
  await page.getByText("No lists yet.").waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
