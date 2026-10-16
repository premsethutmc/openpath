/**
 * End-to-end: the Spelling Bee on an Android-sized phone (Chromium emulating 412×915; not a physical phone), against
 * the production build in device-only mode. Words are said with the browser's own speech (speechSynthesis), replaced by
 * a stand-in that behaves like the ones on phones (e2e/lib/bee.mjs): an empty voice list, voices that arrive late,
 * speech refused without a tap, speech that fails or stays silent, or no speech at all.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-bee
 *
 * Which word is being asked is learnt only from what the app asks the voice to say, never from the page.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { after as afterAction, asked, clickFor, install, notInPage, overlaps, said, spoken, wordAfter } from "./lib/bee.mjs";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/bee-${name}.png`, fullPage: true });
const ANDROID = {
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  // the speaker pulses when it wants a tap; without motion, Playwright can tap it as soon as it is there
  reducedMotion: "reduce",
};
const launch = (args = []) => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args });

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser?.close());

/** A phone-sized browser context with the stand-in voice (options: e2e/lib/bee.mjs). profile: a persistent profile (a real browser restart). */
async function phone({ profile = null, on = browser, ...speech } = {}) {
  const context = profile ? await chromium.launchPersistentContext(profile, { ...ANDROID, executablePath: process.env.CHROMIUM_PATH || undefined }) : await on.newContext(ANDROID);
  await install(context, speech);
  const errors = [];
  const foreign = [];
  const watch = (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      const u = new globalThis.URL(r.url());
      if (!["127.0.0.1", "localhost"].includes(u.hostname) && u.protocol !== "data:" && u.protocol !== "blob:") foreign.push(r.url());
    });
  };
  context.on("page", watch);
  context.pages().forEach(watch);
  const page = context.pages()[0] ?? (await context.newPage());
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
async function newLearner(page, name) {
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
}
async function submit(page, text) {
  await page.locator(".bee-answer input").fill(text);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.locator(".bee-feedback").waitFor();
}

const speaker = (page) => page.locator(".bee-speaker");
const noDeviceMessage = async (page) => assert.ok(!/can't say words|cannot say words|voice|settings/i.test(await page.locator("main").innerText()), "no message about the device, its voices or settings");

test("Spelling Bee: straight from Home, the word is said by itself, repeat, sentence, feedback, resume, review", async () => {
  const { context, page, errors, foreign } = await phone();
  await newLearner(page, "Bee Tester");
  // 1. Home: the Spelling Bee first, with no starting check needed; General English still there, below
  await page.getByRole("heading", { name: "Spelling Bee" }).waitFor();
  await page.getByText("100 words ready to practise").waitFor();
  await page.getByRole("heading", { name: "General English" }).waitFor();
  await fits(page);
  await tappable(page);
  await shot(page, "1-home");
  // 2. Start: the word, its sentence and the word again are said by themselves, with the listed local English voice
  const first = await clickFor(page, "Start Spelling Bee");
  assert.match(first.script, new RegExp(`^${first.word}\\. .+ ${first.word}\\.$`), "the first time: the word, its sentence, the word again");
  assert.equal(first.voice, "Test English (UK)");
  await page.getByText("Word 1 of 10").waitFor();
  await notInPage(page, assert, first.word);
  await page.getByLabel("Hear it again").waitFor();
  await fits(page);
  await tappable(page);
  await shot(page, "2-word");
  // 3. Repeat: the speaker again says the word alone, as often as wanted; "Hear it in a sentence" says it all again
  for (let k = 0; k < 3; k++) {
    const again = await afterAction(page, () => speaker(page).click());
    assert.deepEqual([again.word, again.script], [first.word, `${first.word}.`], "the same word, alone");
  }
  const sentence = await clickFor(page, "Hear it in a sentence");
  assert.equal(sentence.script, first.script);
  // 4. right (capital letters and a space do not matter): feedback with the spelling
  await submit(page, first.word.toUpperCase() + " ");
  await page.getByRole("heading", { name: "Right!" }).waitFor();
  assert.match(await page.locator(".bee-feedback").innerText(), new RegExp(first.word, "i"));
  // 5. wrong: the spelling is shown, with what was typed, and it goes on the review list
  const second = await clickFor(page, "Next word");
  assert.notEqual(second.word, first.word);
  await page.getByText("Word 2 of 10").waitFor();
  await notInPage(page, assert, second.word);
  await submit(page, `${second.word}x`);
  await page.getByRole("heading", { name: "Not quite." }).waitFor();
  const fb = await page.locator(".bee-feedback").innerText();
  assert.match(fb, new RegExp(`The spelling is ${second.word}`, "i"));
  assert.match(fb, /review list/);
  assert.match(await page.locator(".bee-progress").innerText(), /Word 2 of 10/, "the counter stays on the answered word");
  await shot(page, "3-feedback-wrong");
  // 6. two more, then a reload in the middle: Home offers to carry on, at the same word
  let w = await clickFor(page, "Next word");
  for (let k = 0; k < 2; k++) {
    await notInPage(page, assert, w.word);
    await submit(page, w.word);
    w = await clickFor(page, "Next word");
  }
  const fifth = w;
  await page.reload();
  const resumed = await clickFor(page, /Carry on Spelling Bee \(word 5 of 10\)/);
  assert.equal(resumed.word, fifth.word, "the same word after a reload");
  w = resumed;
  // 7. finish: the session ends by itself after 10 words, with a summary
  for (let k = 0; k < 6; k++) {
    await submit(page, w.word);
    if (k < 5) w = await clickFor(page, "Next word");
    else await page.getByRole("button", { name: "See how you did" }).click();
  }
  await page.getByRole("heading", { name: "Session complete" }).waitFor();
  assert.match(await page.locator(".bee-done").innerText(), /9 of 10 right \(90%\)[\s\S]*10 of 100 words practised[\s\S]*1 word on your review list/);
  await fits(page);
  await tappable(page);
  await shot(page, "4-done");
  // 8. Home and Progress show the progress
  await page.getByRole("button", { name: "Back to home" }).click();
  assert.match(await page.locator(".bee-card").innerText(), /10 of 100 practised · 1 to review/);
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Progress" }).click();
  await page.locator(".bee-progress-card").waitFor();
  // 9. a new tab later: the misspelt word comes back first
  await page.close();
  const again = await context.newPage();
  await again.goto(URL);
  assert.equal((await clickFor(again, "Start Spelling Bee")).word, second.word, "the misspelt word comes back first");
  assert.equal(await overlaps(again), 0);
  assert.deepEqual(foreign, [], "nothing is sent anywhere");
  assert.deepEqual(errors, []);
  await context.close();
});

test("the next word comes by itself; the old word is stopped first, never spoken over; locking the screen stops it", async () => {
  const { context, page, errors } = await phone({ advanceMs: null, speakMs: 4000 }); // the app's own timing; long speech
  await newLearner(page, "Auto Advance");
  const first = await clickFor(page, "Start Spelling Bee");
  // answer while the word is still being said: it stops at once, and the next word follows without a tap
  await page.getByLabel("Hear it again").waitFor();
  assert.equal(await page.evaluate(() => window.speechSynthesis.speaking), true);
  const n = await asked(page);
  await page.locator(".bee-answer input").fill(first.word);
  await page.locator(".bee-answer input").press("Enter");
  await page.getByRole("heading", { name: "Right!" }).waitFor();
  assert.equal(await page.evaluate(() => window.speechSynthesis.speaking), false, "the first word stopped when the answer was given");
  const second = await wordAfter(page, n); // no Next tap: it came by itself
  assert.notEqual(second.word, first.word);
  await page.getByText("Word 2 of 10").waitFor();
  // tapping the speaker again and again while it speaks: each tap replaces the last, nothing is said over anything
  await page.getByLabel("Hear it again").waitFor();
  for (let k = 0; k < 4; k++) await speaker(page).click();
  await page.getByLabel("Hear it again").waitFor();
  assert.equal(await overlaps(page), 0, "speech never overlapped");
  // the phone locks: the speech stops
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(await page.evaluate(() => window.speechSynthesis.speaking), false);
  assert.deepEqual(errors, []);
  await context.close();
});

test("an empty voice list (like Chrome on many Samsung phones): the word is still said, with the browser's default voice", async () => {
  const { context, page, errors } = await phone({ voices: "none" });
  await newLearner(page, "Samsung Phone");
  const first = await clickFor(page, "Start Spelling Bee");
  assert.equal(first.voice, null, "no voice chosen: the browser's default speaks");
  assert.equal(first.lang, "en-GB");
  await page.getByLabel("Hear it again").waitFor();
  await noDeviceMessage(page);
  assert.equal((await afterAction(page, () => speaker(page).click())).word, first.word, "Repeat works too");
  // a parent's list is said the same way
  await page.getByRole("button", { name: "← Home" }).click();
  await page.getByRole("button", { name: "Add a word list" }).click();
  await page.getByRole("button", { name: "New word list" }).click();
  await page.getByLabel("List name").fill("Week 1");
  await page.getByLabel(/Words: one per line/).fill("castle, island");
  await page.getByRole("button", { name: "Check the words" }).click();
  await page.getByRole("button", { name: "Save the list" }).click();
  const w = await clickFor(page, "Practise");
  assert.ok(["castle", "island"].includes(w.word));
  assert.equal(w.voice, null);
  await page.getByLabel("Hear it again").waitFor();
  await notInPage(page, assert, w.word);
  await noDeviceMessage(page);
  assert.deepEqual(errors, []);
  await context.close();
});

test("voices that arrive late: the first word is said straight away with the default voice, later ones with the listed voice", async () => {
  const { context, page, errors } = await phone({ voices: "later" });
  await newLearner(page, "Slow Voices");
  const first = await clickFor(page, "Start Spelling Bee");
  assert.equal(first.voice, null, "not waiting for a voice list: said at once with the default voice");
  await page.getByLabel("Hear it again").waitFor();
  await page.evaluate(() => window.__listVoices());
  const again = await afterAction(page, () => speaker(page).click());
  assert.equal(again.word, first.word);
  assert.equal(again.voice, "Test English (UK)", "once listed, the local English voice is used");
  await noDeviceMessage(page);
  assert.deepEqual(errors, []);
  await context.close();
});

test("voices that arrive late after speech failed: the word is tried again by itself when they arrive", async () => {
  const { context, page, errors } = await phone({ voices: "later", failures: 1 }); // the default voice fails before the list
  await newLearner(page, "Late Voices");
  await page.getByRole("button", { name: "Start Spelling Bee" }).click();
  await page.getByLabel("Tap to try again").waitFor();
  const n = await asked(page);
  await page.evaluate(() => window.__listVoices());
  const w = await wordAfter(page, n); // no tap: said when the voices arrived
  assert.equal(w.voice, "Test English (UK)");
  await page.getByLabel("Hear it again").waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test("speech refused because no tap started it: the speaker asks for one tap, and that tap says the word", async () => {
  // Chrome on a phone refuses speech no recent tap started (a fresh page, or a word started by a timer). The stand-in
  // applies that rule: speech within 5 s of a real tap or key press only.
  const { context, page, errors } = await phone({ advanceMs: 6500, needsTap: true });
  await newLearner(page, "Strict Phone");
  const first = await clickFor(page, "Start Spelling Bee");
  await submit(page, first.word);
  // the next word starts from a timer after the tap has expired: refused, with no technical message
  await page.getByText("Word 2 of 10").waitFor();
  await page.getByLabel("Tap to hear the word").waitFor();
  assert.ok((await said(page)).some((s) => s.outcome === "not-allowed"));
  await noDeviceMessage(page);
  await shot(page, "5-tap");
  const tapped = await afterAction(page, () => speaker(page).click());
  assert.notEqual(tapped.word, first.word);
  assert.match(tapped.script, new RegExp(`^${tapped.word}\\. `), "the first hearing is the word, its sentence and the word again");
  await notInPage(page, assert, tapped.word);
  await page.getByLabel("Hear it again").waitFor();
  // a reload (a fresh page, no tap yet): Carry on is a tap, so the word is said
  await page.reload();
  assert.equal((await clickFor(page, /Carry on Spelling Bee \(word 2 of 10\)/)).word, tapped.word);
  assert.deepEqual(errors, []);
  await context.close();
});

test("speech that fails: one tap tries again; only after two failures is a grown-up offered, as a small link", async () => {
  // each play tries the listed voice and then the default one, so 4 failures are two failed plays
  const { context, page, errors } = await phone({ failures: 4 });
  await newLearner(page, "Failing Voice");
  await page.getByRole("button", { name: "Start Spelling Bee" }).click();
  await page.getByLabel("Tap to try again").waitFor();
  assert.equal(await page.getByRole("button", { name: /A grown-up can read it to you/ }).count(), 0, "not offered after one failure");
  await speaker(page).click();
  await page.getByRole("button", { name: /A grown-up can read it to you/ }).waitFor();
  await shot(page, "6-failed");
  // the answer box is there all along; the next tap works (the voice recovered)
  assert.equal(await page.locator(".bee-answer input").isEnabled(), true);
  const w = await afterAction(page, () => speaker(page).click());
  await notInPage(page, assert, w.word);
  await page.getByLabel("Hear it again").waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test("a listed voice that fails: the same tap tries the browser's default voice", async () => {
  const { context, page, errors } = await phone({ voiceFails: true });
  await newLearner(page, "Broken Voice");
  const first = await clickFor(page, "Start Spelling Bee");
  assert.equal(first.voice, null, "said with the default voice");
  const attempts = await said(page);
  assert.deepEqual(attempts.slice(0, 2).map((s) => [s.voice, s.outcome]), [["Test English (UK)", "synthesis-failed"], [null, "spoken"]]);
  await page.getByLabel("Hear it again").waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test("speech that stays silent (a cold start): the speaker asks for a tap, and the tap says the word", async () => {
  const { context, page, errors } = await phone({ silent: 1 });
  await newLearner(page, "Cold Start");
  await page.getByRole("button", { name: "Start Spelling Bee" }).click();
  await page.getByLabel(/Tap to (try again|hear the word)/).waitFor({ timeout: 6000 });
  const w = await afterAction(page, () => speaker(page).click());
  await page.getByLabel("Hear it again").waitFor();
  await notInPage(page, assert, w.word);
  assert.equal(await overlaps(page), 0, "the silent one was cleared, not left to start later over the next");
  assert.deepEqual(errors, []);
  await context.close();
});

test("a browser with no speech at all: a small grown-up link straight away; the child can still type and go on", async () => {
  const { context, page, errors } = await phone({ noSpeech: true });
  await newLearner(page, "No Speech");
  await page.getByRole("button", { name: "Start Spelling Bee" }).click();
  await page.getByText("Word 1 of 10").waitFor();
  const link = page.getByRole("button", { name: /A grown-up can read it to you/ });
  await link.waitFor();
  await noDeviceMessage(page);
  await shot(page, "7-no-speech");
  await link.click();
  await page.getByRole("button", { name: "Show the word to read aloud" }).click();
  const word = (await page.locator(".adult-word b").innerText()).trim();
  await page.getByRole("button", { name: /Hide it/ }).click();
  await notInPage(page, assert, word);
  await submit(page, word);
  await page.getByRole("heading", { name: "Right!" }).waitFor();
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

test("Closing the whole browser and starting it again: the Spelling Bee carries on at the same word, and on by keyboard alone", async () => {
  const profile = mkdtempSync(join(tmpdir(), "openpath-bee-"));
  try {
    let { context, page } = await phone({ profile });
    await newLearner(page, "Restart Tester");
    let w = await clickFor(page, "Start Spelling Bee");
    await submit(page, w.word);
    w = await clickFor(page, "Next word");
    await submit(page, `${w.word}x`);
    const third = await clickFor(page, "Next word");
    await context.close(); // the browser process ends
    ({ context, page } = await phone({ profile }));
    await page.goto(URL);
    const resumed = await clickFor(page, /Carry on Spelling Bee \(word 3 of 10\)/);
    assert.equal(resumed.word, third.word, "the same word after a browser restart");
    assert.match(await page.locator(".bee-progress").innerText(), /Word 3 of 10[\s\S]*✓ 1[\s\S]*✗ 1/);
    // and on, with the keyboard only: type, Enter to submit, Enter again for the next word
    await page.locator(".bee-answer input").fill(third.word);
    await page.locator(".bee-answer input").press("Enter");
    await page.getByRole("heading", { name: "Right!" }).waitFor();
    const fourth = await afterAction(page, () => page.keyboard.press("Enter"));
    assert.notEqual(fourth.word, third.word);
    await page.getByText("Word 4 of 10").waitFor();
    await context.close();
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
});

void spoken;
