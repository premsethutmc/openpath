/**
 * End-to-end: Grammar in use and the ICSE Class 5 syllabus on an Android-sized phone (Chromium emulating 412×915; not
 * a physical phone). A learner fixes and builds eight sentences, missing one of each kind, and sees the rule each
 * time; then opens the class syllabus, sees what is and is not in the app, and starts practice on one line's topics.
 * Device-only, against the production build; nothing is requested elsewhere.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-grammar
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/grammar-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const read = (p) => JSON.parse(readFileSync(new globalThis.URL(`../../content/english/${p}`, import.meta.url), "utf8"));
const ITEMS = new Map(read("grammar/in-use.json").items.map((i) => [i.id, i]));
const SYLLABUS = read("syllabus/icse-class-5.json");

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function start(name) {
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
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  const fits = async () => {
    const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    assert.ok(sw <= w, "no sideways scrolling");
  };
  return { context, page, errors, foreign, fits };
}

/** A card that teaches a topic the first time it comes: try its question, then go on. Returns whether there was one. */
async function pastCard(page) {
  await page.locator('main[data-phase="ask"], main[data-phase="learn"]').first().waitFor();
  if (!(await page.locator('main[data-phase="learn"]').count())) return false;
  const card = page.locator(".grammar-learn");
  await card.getByRole("heading", { name: /^New: / }).waitFor();
  // a common mistake beside the right version, and why
  await card.locator(".grammar-mistake .mistake-wrong").waitFor();
  await shot(page, "0-card");
  await card.locator(".choice").first().click();
  await card.getByRole("status").waitFor();
  // then one more question, before practice
  await card.locator('.choice[data-try="2"]').first().click();
  assert.equal(await card.getByRole("status").count(), 2);
  await card.getByRole("button", { name: "Now practise" }).click();
  return true;
}

/** Answer the sentence on screen; `wrong` gives a wrong answer. Returns the item. */
async function answer(page, wrong) {
  await pastCard(page);
  const main = page.locator('main[data-phase="ask"]');
  await main.waitFor();
  const it = ITEMS.get(await main.getAttribute("data-item"));
  assert.ok(it, "a sentence of the bank");
  if (it.kind === "choose") {
    await page.getByText(it.question, { exact: true }).waitFor();
    assert.equal(await page.locator(".grammar-choice").count(), 1 + it.wrong.length);
    {
      const want = wrong ? it.wrong[0] : it.right[0];
      const options = await page.locator(".grammar-choice").evaluateAll((els) => els.map((e) => e.dataset.choice));
      await page.locator(".grammar-choice").nth(options.indexOf(want)).click();
    }
  } else if (it.kind === "spot") {
    const words = it.sentence.split(" ");
    const isRight = (w) => it.right.includes(w.replace(/[^A-Za-z']/g, ""));
    await page.getByText(it.ask === "object" ? "Tap the object of the verb in this sentence." : it.ask === "subject" ? "Tap any word of the subject of this sentence." : it.ask === "main clause" ? "Tap any word of the main clause." : new RegExp(`^Tap an? ${it.ask} in this sentence\\.$`)).waitFor();
    await page.locator(".grammar-word").nth(words.findIndex((w) => isRight(w) !== wrong)).click();
    await page.getByRole("button", { name: "Check", exact: true }).click();
  } else if (it.kind === "fix") {
    const words = it.sentence.split(" ");
    const at = words.findIndex((w) => w.includes("["));
    assert.equal(await page.locator(".grammar-word").count(), words.length);
    assert.ok(!(await page.locator(".grammar-words").innerText()).includes("["), "the wrong word is not marked");
    await page.locator(".grammar-word").nth(wrong ? (at + 1) % words.length : at).click();
    await page.locator("#grammar-box").fill(wrong ? "zzz" : it.right[0]);
    await page.getByRole("button", { name: "Check", exact: true }).click();
  } else {
    const target = it.parts ?? it.sentence.split(" ");
    const order = wrong ? [...target].reverse() : target;
    for (const w of order) {
      const tiles = await page.locator(".grammar-pool .grammar-tile").evaluateAll((els) => els.map((e) => e.dataset.tile));
      await page.locator(".grammar-pool .grammar-tile").nth(tiles.indexOf(w)).click();
    }
    assert.equal(await page.locator(".grammar-line .grammar-tile").count(), target.length);
    await page.getByRole("button", { name: "Check", exact: true }).click();
  }
  await page.locator('main[data-phase="feedback"]').waitFor();
  await page.getByText(wrong ? "Not quite" : "✓ Right").waitFor();
  await page.getByText(it.rule, { exact: true }).waitFor();
  return it;
}

test("Grammar in use: fix and build eight sentences, see each rule, find the result kept", async () => {
  const { context, page, errors, foreign, fits } = await start("Grammar");
  await page.getByRole("button", { name: "Try Grammar" }).click();
  await page.getByRole("heading", { name: "Fix it or build it" }).waitFor();
  await page.getByText("Level 3: Apostrophes, verbs and joining").waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await pastCard(page);
  const missed = { fix: false, build: false, spot: false, choose: false };
  const shots = { fix: false, build: false, spot: false, choose: false };
  let right = 0;
  for (let i = 1; i <= 8; i++) {
    await page.getByText(`Sentence ${i} of 8`, { exact: false }).waitFor();
    await pastCard(page);
    const kind = await page.locator('main[data-phase="ask"]').getAttribute("data-kind");
    if (!shots[kind]) (shots[kind] = true), await fits(), await shot(page, `1-${kind}`);
    const wrong = !missed[kind];
    missed[kind] = true;
    const it = await answer(page, wrong);
    assert.equal(it.level, 3);
    if (!wrong) right++;
    if (wrong) await fits(), await shot(page, `2-${kind}-feedback`);
    await page.getByRole("button", { name: i < 8 ? "Next sentence" : "Finish" }).click();
  }
  assert.ok(missed.fix && missed.build && (missed.spot || missed.choose), "fix, build and a tap-or-choose sentence were all asked");
  await page.getByRole("heading", { name: `${right} of 8 right` }).waitFor();
  await page.getByText(/To look at again:/).waitFor();
  await fits();
  await shot(page, "3-done");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByText(`${right} of 8 sentences right`).waitFor();
  await page.reload();
  await page.getByText(`${right} of 8 sentences right`).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});

test("ICSE syllabus, Classes 1 to 8: every line shown with its place in the app, and practice starts on a line's topics", async () => {
  const { context, page, errors, foreign, fits } = await start("Syllabus");
  await page.getByRole("heading", { name: "CISCE (ICSE) English by class" }).waitFor();
  await page.getByText("Classes 1, 2, 3, 4, 5, 6, 7 and 8: 253 lines").waitFor();
  await page.getByRole("button", { name: "Open the class syllabus" }).click();
  await page.getByRole("heading", { name: "Class 5 English" }).waitFor();
  await page.getByText("21 in the app · 0 partly · 12 with a grown-up · 0 not yet (of 33)").waitFor();
  for (const st of SYLLABUS.strands) await page.getByRole("heading", { name: st.name }).waitFor();
  assert.equal(await page.locator("[data-outcome]").count(), 33);
  assert.equal(await page.locator('[data-coverage="not"] button').count(), 0, "a line that is not in the app offers no practice");
  // a writing line: a task for this class, a length to aim for, the learner's own check, then a grown-up's ticks
  await page.locator('[data-outcome="RW7"]', { hasText: "With a grown-up" }).waitFor();
  await page.getByRole("button", { name: /Practise RW7:/ }).click();
  await page.getByText("Writing, with a grown-up").waitFor();
  const wtask = page.locator('[data-task="c5.rw7.w1"]');
  await wtask.getByRole("button", { name: "Start writing" }).click();
  await wtask.getByText("Aim for 120 to 180 words.", { exact: false }).waitFor();
  // a slip the check finds points to the grammar that practises it; the piece is still there on coming back
  const slip = "Trees gives us shade. They was planted long ago. ";
  await wtask.locator("textarea").fill(slip);
  await wtask.getByRole("button", { name: "Check my writing" }).click();
  const practise = wtask.locator('[data-note="grammar"]').getByRole("button", { name: /^Practise: / });
  assert.match(await practise.innerText(), /Subject and verb agreement|Am, is and are/);
  await practise.click();
  await page.getByText(/^Topics: /).waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await pastCard(page);
  const fromSlip = ITEMS.get(await page.locator('main[data-phase="ask"]').getAttribute("data-item"));
  assert.ok(["agreement", "be_verbs"].includes(fromSlip.topic), fromSlip.topic);
  await page.getByRole("button", { name: "← Stop" }).click();
  await wtask.locator("textarea").waitFor();
  assert.equal(await wtask.locator("textarea").inputValue(), slip, "the writing waited");
  // and after the page is reloaded, on this device only
  await page.reload();
  await page.getByRole("button", { name: "Open the class syllabus" }).click();
  await page.getByRole("button", { name: /Practise RW7:/ }).click();
  await wtask.locator("textarea").waitFor();
  assert.equal(await wtask.locator("textarea").inputValue(), slip, "the writing survived a reload");
    await wtask.locator("textarea").fill("Trees give us shade and clean air. ".repeat(20));
  await wtask.locator('[data-words="140"]').waitFor();
  // the rule-based check: form only, on the device, with its limits stated
  await wtask.getByRole("button", { name: "Check my writing" }).click();
  await wtask.locator('[data-note="openings"]', { hasText: "20 of your 20 sentences start with “Trees”" }).waitFor();
  await wtask.locator('[data-note="paragraphs"]').waitFor();
  await wtask.locator('[data-note="length"][data-level="good"]').waitFor();
  await wtask.getByText("These checks look only at the form of your writing.", { exact: false }).waitFor();
  assert.equal(await wtask.locator('.writing-notes').getAttribute("data-fixes"), "0");
  await wtask.getByText("The app does not keep or mark your writing.", { exact: false }).waitFor();
  await wtask.getByLabel("Each paragraph has one main idea").first().check();
  await fits();
  await shot(page, "4a-writing");
  await wtask.getByLabel("About the length asked").check();
  await wtask.getByRole("button", { name: "Save" }).click();
  await wtask.getByText("Last time a grown-up ticked 1 of 3", { exact: false }).waitFor();
  await wtask.getByText("for 140 words", { exact: false }).waitFor();
  assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes("Trees give us shade")), false, "the words written are not kept on the device");
  await page.getByRole("button", { name: "← Back" }).click();
  await page.getByRole("heading", { name: "Class 5 English" }).waitFor();
  // a speaking line: tasks to do with a grown-up, who ticks what they heard; the tick is kept
  await page.locator('[data-outcome="LS1"]', { hasText: "With a grown-up" }).waitFor();
  await page.getByRole("button", { name: /Practise LS1:/ }).click();
  await page.getByRole("heading", { name: "Shares and explains ideas and points of view clearly." }).waitFor();
  await page.getByText("The app cannot hear or mark them", { exact: false }).waitFor();
  assert.equal(await page.locator("[data-task]").count(), 3);
  await fits();
  const task = page.locator('[data-task="ls1.1"]');
  await task.getByRole("button", { name: "I did this with a grown-up" }).click();
  await task.getByLabel("Said what the game is").check();
  await task.getByLabel("Gave a reason for liking it").check();
  await fits();
  await shot(page, "4b-guided");
  await task.getByRole("button", { name: "Save" }).click();
  await task.getByText("Done once. Last time a grown-up ticked 2 of 3.").waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Open the class syllabus" }).click();
  await page.getByRole("button", { name: /Practise LS1:/ }).click();
  await page.locator('[data-task="ls1.1"][data-done="true"]').waitFor();
  await page.getByRole("button", { name: "← Back" }).click();
  await page.getByRole("heading", { name: "Class 5 English" }).waitFor();
  // sentences in order: whole sentences are the tiles
  await page.getByRole("button", { name: /Practise RW9:/ }).click();
  await page.getByText("Topics: Sentences in order").waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await pastCard(page);
  await page.getByText("Tap the sentences in the order in which things happen.", { exact: false }).waitFor();
  await fits();
  await shot(page, "4c-order");
  const ordered = await answer(page, false);
  assert.equal(ordered.topic, "sentence_order");
  await page.getByRole("button", { name: "← Stop" }).click();
  await page.getByRole("heading", { name: "Class 5 English" }).waitFor();
  await fits();
  await shot(page, "4-syllabus");
  await page.getByRole("button", { name: "Where this list comes from" }).click();
  await page.getByText(/UNOFFICIAL SOURCE/).waitFor();
  await page.getByRole("button", { name: /Practise GV8:/ }).click();
  await page.getByText("Topics: Direct and reported speech").waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const first = await answer(page, false);
  assert.equal(first.topic, "speech");
  await page.getByRole("button", { name: "← Stop" }).click();
  await page.getByRole("heading", { name: "Class 5 English" }).waitFor();
  // the other classes: each its own list, and the class chosen is kept on the way back from practice
  await page.getByRole("button", { name: "Class 4", exact: true }).click();
  await page.getByRole("heading", { name: "Class 4 English" }).waitFor();
  await page.getByText("12 in the app · 1 partly · 12 with a grown-up · 0 not yet (of 25)").waitFor();
  // dictation of a passage already seen: read it first, then it is hidden and dictated a sentence at a time
  await page.locator('[data-outcome="LS7"]').getByRole("button", { name: /Practise LS7:/ }).click();
  await page.getByRole("heading", { name: "A short passage" }).waitFor();
  const shown = await page.locator("[data-passage-text]").innerText();
  assert.ok(shown.split(/[.?!]/).filter((x) => x.trim()).length >= 3, "the passage is shown to read first");
  await fits();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByText("Sentence 1 of 4", { exact: true }).waitFor();
  assert.equal(await page.getByText(shown, { exact: true }).count(), 0, "the passage is hidden once dictation starts");
  await page.getByRole("button", { name: "← Stop" }).click();
  await page.getByRole("heading", { name: "Class 4 English" }).waitFor();
  await page.getByRole("button", { name: "Class 6", exact: true }).click();
  await page.getByRole("heading", { name: "Class 6 English" }).waitFor();
  await page.getByText("23 in the app · 1 partly · 22 with a grown-up · 0 not yet (of 46)").waitFor();
  await page.getByRole("button", { name: "Class 3", exact: true }).click();
  await page.getByRole("heading", { name: "Class 3 English" }).waitFor();
  await page.getByText("12 in the app · 1 partly · 11 with a grown-up · 0 not yet (of 24)").waitFor();
  await fits();
  // alphabetical order: words as tiles, with its own instruction
  await page.getByRole("button", { name: /Practise GV6:/ }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await pastCard(page);
  await page.getByText("Tap the words in alphabetical order.", { exact: false }).waitFor();
  assert.equal((await answer(page, false)).topic, "alphabetical");
  await page.getByRole("button", { name: "← Stop" }).click();
  await page.getByRole("heading", { name: "Class 3 English" }).waitFor();
  await page.getByRole("button", { name: "Class 7", exact: true }).click();
  await page.getByRole("heading", { name: "Class 7 English" }).waitFor();
  await page.getByText("13 in the app · 0 partly · 12 with a grown-up · 0 not yet (of 25)").waitFor();
  await page.getByRole("button", { name: "Class 2", exact: true }).click();
  await page.getByRole("heading", { name: "Class 2 English" }).waitFor();
  await page.getByText("11 in the app · 2 partly · 12 with a grown-up · 0 not yet (of 25)").waitFor();
  await page.getByRole("button", { name: "Class 1", exact: true }).click();
  await page.getByRole("heading", { name: "Class 1 English" }).waitFor();
  await page.getByText("17 in the app · 5 partly · 16 with a grown-up · 0 not yet (of 38)").waitFor();
  // a Class 1 line opens First words, where nothing has to be read
  await page.getByRole("button", { name: /Practise RW1:/ }).click();
  await page.locator('main.first[data-phase="ask"][data-kind="hear"]').waitFor();
  await page.getByRole("button", { name: "← Stop" }).click();
  await page.getByRole("button", { name: "Open the class syllabus" }).click();
  await page.getByRole("heading", { name: "Class 1 English" }).waitFor();
  // pictures in the order of a story, and how someone felt
  await page.getByRole("button", { name: /Practise RW9:/ }).click();
  await page.getByText("Topics: Pictures in story order, and how people feel").waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const pics = new Set();
  // the first time, a card teaches the topic before its first sentence
  await page.locator('main[data-phase="learn"]').waitFor();
  await shot(page, "5-pictures-card");
  await fits();
  for (let i = 0; i < 8 && pics.size < 2; i++) {
    await pastCard(page);
    const next = ITEMS.get(await page.locator("main[data-item]").getAttribute("data-item"));
    if (next.kind === "build") await page.getByText("Put the pictures in the order of the story.", { exact: false }).waitFor();
    if (!pics.has(next.kind)) await shot(page, `5-pictures-${next.kind}`);
    const it = await answer(page, false);
    assert.equal(it.topic, "picture_order");
    pics.add(it.kind);
    await fits();
    if (pics.size < 2) await page.getByRole("button", { name: /Next sentence|Finish/ }).click();
  }
  assert.deepEqual([...pics].sort(), ["build", "choose"]);
  await page.getByRole("button", { name: "← Stop" }).click();
  await page.getByRole("heading", { name: "Class 1 English" }).waitFor();
  await page.getByRole("button", { name: "Class 8", exact: true }).click();
  await page.getByRole("heading", { name: "Class 8 English" }).waitFor();
  // a line that was only half practised: figures of speech are now chosen by name
  await page.getByRole("button", { name: /Practise GV4:/ }).click();
  await page.getByText("Topics: Words for cooking, sport and yoga, Formal and informal words").waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const seen = new Set();
  for (let i = 0; i < 8 && !seen.has("choose"); i++) {
    const it = await answer(page, false);
    assert.ok(["field_words", "register"].includes(it.topic));
    seen.add(it.kind);
    if (!seen.has("choose")) await page.getByRole("button", { name: /Next sentence|Finish/ }).click();
  }
  assert.ok(seen.has("choose"), "a choose-the-answer sentence was asked and answered");
  await fits();
  await page.getByRole("button", { name: "← Stop" }).click();
  await page.getByRole("heading", { name: "Class 8 English" }).waitFor();
  await page.getByText("9 in the app · 1 partly · 27 with a grown-up · 0 not yet (of 37)").waitFor();
  await fits();
  await page.getByRole("button", { name: "Class 6", exact: true }).click();
  await page.getByRole("heading", { name: "Class 6 English" }).waitFor();
  await fits();
  await page.getByRole("button", { name: /Practise GV2:/ }).click();
  await page.getByText("Topics: Pronoun forms: I and me, myself").waitFor();
  await page.getByRole("button", { name: "← Back" }).click();
  await page.getByRole("heading", { name: "Class 6 English" }).waitFor();
  await page.getByRole("button", { name: /Practise R2:/ }).click();
  await page.getByRole("heading", { name: "Read, think, answer" }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});
