/**
 * End-to-end: My Books on an Android-sized phone (Chromium emulating 412×915; not a physical phone). A parent opens a
 * plain-text story (an original synthetic one, e2e fixture), sees what was found, saves without approving (the learner
 * sees nothing), approves some activities, and the learner practises the approved spelling words with the Spelling
 * Bee's screen (each word only spoken) and answers the approved questions. Progress per book; a changed text needs a new
 * review; delete. Device-only, against the production build; nothing is requested from another site.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-books
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/books-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const STORY = readFileSync(new globalThis.URL("../src/english/logic/fixtures/book-lantern.txt", import.meta.url), "utf8");
const FLAT = STORY.replace(/\s+/g, " ");

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function fits(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w, `page is ${sw}px wide on a ${w}px screen`);
}
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
/** The right choice, worked out from the story itself: the one that restores the book's sentence, or comes first. */
function rightChoice(prompt, text, options) {
  if (/comes first/.test(prompt)) return options.slice().sort((a, b) => FLAT.indexOf(a) - FLAT.indexOf(b))[0];
  const fits = options.filter((o) => FLAT.includes(text.replace("_____", o)));
  assert.equal(fits.length, 1, `exactly one choice restores the book's sentence: ${text}`);
  return fits[0];
}

test("My Books: open a story, review, approve, practise its spelling and answer its questions; a changed text needs a new review", async () => {
  const context = await browser.newContext(ANDROID);
  await context.addInitScript(() => {
    const v = { name: "Test English (UK)", lang: "en-GB", localService: true, default: true, voiceURI: "test-en-gb" };
    window.__spoken = [];
    window.__beeAdvanceMs = 600000; // these tests tap Next themselves (e2e/bee.test.mjs checks the automatic next word)
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
  page.on("dialog", (d) => d.accept());
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill("Book Learner");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();

  // 1. Home: My Books, no starting check needed
  await page.getByRole("heading", { name: "My Books" }).waitFor();
  await page.getByRole("button", { name: "Add a book" }).click();
  await page.getByRole("button", { name: "Add a book" }).click();
  // 2. a PDF is refused with a reason; the .txt story is read
  const file = page.locator('input[type="file"]');
  await file.setInputFiles({ name: "story.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await page.getByText(/Choose a plain-text \(\.txt\) file/).waitFor();
  await file.setInputFiles({ name: "The Lantern on the Hill.txt", mimeType: "text/plain", buffer: Buffer.from(STORY) });
  // the file is read asynchronously: wait for its title to arrive, rather than reading the box at once
  for (let t = 0; t < 100 && !(await page.getByLabel("Title").inputValue()); t++) await page.waitForTimeout(100);
  assert.equal(await page.getByLabel("Title").inputValue(), "The Lantern on the Hill");
  await page.getByRole("button", { name: "Find activities" }).click();
  const found = page.locator(".book-review h2");
  assert.match(await found.innerText(), /Found 20 spelling words, \d+ questions/);
  assert.match(await page.locator(".book-review").innerText(), /Spelling practice \(0 of 20 ticked\)/);
  await fits(page);
  await shot(page, "1-review");
  // 3. saved without approving anything: the learner gets nothing from it
  await page.getByRole("button", { name: "Save without approving anything" }).click();
  const card = page.locator(".books li", { hasText: "The Lantern on the Hill" });
  await card.waitFor();
  assert.match(await card.innerText(), /Approved: 0 spelling words · 0 questions/);
  assert.equal(await card.getByRole("button", { name: /Practise spelling|Answer questions/ }).count(), 0);
  // 4. review: approve 3 spelling words, every vocabulary question and the first comprehension question
  await card.getByRole("button", { name: "Review" }).click();
  const spellBoxes = page.locator('input[data-activity^="s:"]');
  const chosen = [];
  for (let i = 0; i < 3; i++) {
    await spellBoxes.nth(i).check();
    chosen.push((await spellBoxes.nth(i).getAttribute("data-activity")).slice(2));
  }
  await page.getByRole("button", { name: "Tick all: vocabulary in context" }).click();
  await page.locator('input[data-activity^="c:"]').first().check();
  const nv = await page.locator('input[data-activity^="v:"]').count();
  await page.getByRole("button", { name: `Save and approve ${3 + nv + 1} activities` }).click();
  assert.match(await card.innerText(), new RegExp(`Approved: 3 spelling words · ${nv + 1} questions`));
  await fits(page);
  await shot(page, "2-books");

  // 5. spelling: the Spelling Bee's screen; only approved words; each spoken with the book's sentence, never shown
  let withSentence = 0;
  let w = await advance(page, "Practise spelling");
  await page.getByText("Word 1 of 3").waitFor();
  for (let k = 0; k < 3; k++) {
    assert.ok(chosen.includes(w), `asked an approved word (${w})`);
    const said = (await spoken(page)).at(-1);
    const m = new RegExp(`.{0,60}\\b${w}\\b.{0,30}`).exec(await perceivable(page));
    assert.ok(!m, `"${w}" can be seen before it was answered: ${m?.[0]}`);
    await page.locator(".ruled input").fill(k === 1 ? `${w}x` : w);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByRole("heading", { name: k === 1 ? "Not quite." : "Right!" }).waitFor();
    // spoken as "word. sentence word." (or "word." alone): the sentence is the book's own
    const alone = said === `${w}.`;
    const mid = alone ? "" : said.slice(w.length + 2, said.length - w.length - 2);
    assert.ok(alone || (said.startsWith(`${w}. `) && FLAT.includes(mid)), `the sentence spoken is from the book: ${said}`);
    if (mid) withSentence++;
    if (k < 2) w = await advance(page, "Next word");
    else await page.getByRole("button", { name: "See how you did" }).click();
  }
  await page.getByRole("heading", { name: "Session complete" }).waitFor();
  assert.ok(withSentence > 0, "the book's sentences are spoken with its words");
  await page.getByRole("button", { name: "Back to My Books" }).click();
  assert.match(await card.innerText(), /spelling practised 3 of 3, 1 to review/);

  // 6. questions: only the approved ones; the right answer worked out from the story
  await card.getByRole("button", { name: "Answer questions" }).click();
  const total = nv + 1;
  const asked = Math.min(total, 10); // a round is at most 10 questions
  await page.getByText(`Question 1 of ${asked}`).waitFor();
  await shot(page, "3-question");
  for (let k = 0; k < asked; k++) {
    assert.match(await page.locator(".eyebrow").innerText(), /· (VOCABULARY IN CONTEXT|LITERAL COMPREHENSION|SENTENCE SEQUENCING)$/i, "each question says what it practises");
    const prompt = await page.locator("#quiz-title").innerText();
    const text = (await page.locator("blockquote.book-quote").count()) ? await page.locator("blockquote.book-quote").innerText() : "";
    const options = await page.locator(".options .option").allInnerTexts();
    const right = rightChoice(prompt, text, options);
    const pick = k === 0 ? options.find((o) => o !== right) : right;
    await page.getByRole("button", { name: pick, exact: true }).click();
    await page.getByRole("heading", { name: k === 0 ? "Not quite." : "Right!" }).waitFor();
    if (k === 0) assert.match(await page.locator(".feedback").innerText(), new RegExp(`The answer is ${right}`));
    await fits(page);
    await page.getByRole("button", { name: k + 1 < asked ? "Next question" : "See how you did" }).click();
  }
  await page.getByText(`${asked - 1} of ${asked} right.`).waitFor();
  await page.getByRole("button", { name: "Back to My Books" }).click();
  assert.match(await card.innerText(), new RegExp(`questions ${asked - 1} of ${total} right`));

  // 7. reload: the book, its approvals and progress are still there
  await page.reload();
  await page.getByRole("button", { name: "Open My Books" }).click();
  assert.match(await card.innerText(), /spelling practised 3 of 3/);
  // 8. a changed text clears every tick: the parent must review again
  await card.getByRole("button", { name: "Review" }).click();
  await page.getByLabel(/The book's text/).fill(STORY.replace("steep hill", "steep, windy hill"));
  await page.getByText(/The text was changed: press "Find activities" again/).waitFor();
  await page.getByRole("button", { name: "Find activities" }).click();
  assert.match(await page.locator(".book-review").innerText(), /Spelling practice \(0 of 20 ticked\)/);
  await page.getByRole("button", { name: "Save without approving anything" }).click();
  assert.match(await card.innerText(), /Approved: 0 spelling words · 0 questions/);
  // 9. delete
  await card.getByRole("button", { name: "Delete" }).click();
  await page.getByText("No books yet.").waitFor();
  // deleted for real: no sentence, title or approved activity of the story is left in the browser's stored record,
  // the answers are kept without the book's words, and a reload does not bring the book back
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
  for (const secret of ["Lantern", "narrow house", "steep", ...chosen]) assert.ok(!stored.includes(secret), `"${secret}" is still stored`);
  assert.match(stored, /"book_delete"/);
  assert.match(stored, /"removed-question-1"/);
  await page.reload();
  await page.getByRole("button", { name: "Add a book" }).click();
  await page.getByText("No books yet.").waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, [], "nothing is sent to another site");
  await context.close();
});
