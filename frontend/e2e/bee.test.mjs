/**
 * End-to-end: the Spelling Bee on an Android-sized phone (Chromium emulating 412×915; not a physical phone), against
 * the production build in device-only mode, with its REAL recordings played by the browser's audio element.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e-bee
 *
 * Which word is being asked is learnt only from the recording the app plays (its file, through the manifest), never
 * from the page; see e2e/lib/bee.mjs. Chromium's autoplay rules are real here too: one test runs a browser that
 * refuses any sound not started by a tap.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { CLIPS, after as afterAction, asked, audioEvents, clickFor, install, notInPage, played, spoken, waitEnded, wordAfter } from "./lib/bee.mjs";

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

/** A phone-sized browser context with the audio spy. profile: a folder for a persistent profile (a real browser restart). */
async function phone({ advanceMs, profile = null, on = browser, dropSpeech = 0, strictAutoplay = false, voices = true } = {}) {
  const context = profile ? await chromium.launchPersistentContext(profile, { ...ANDROID, executablePath: process.env.CHROMIUM_PATH || undefined }) : await on.newContext(ANDROID);
  await install(context, { advanceMs, dropSpeech, strictAutoplay, voices });
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

test("Spelling Bee: straight from Home, the real recording plays by itself, repeat, sentence, feedback, resume, review", async () => {
  const { context, page, errors, foreign } = await phone();
  await newLearner(page, "Bee Tester");
  // 1. Home: the Spelling Bee first, with no starting check needed; General English still there, below
  await page.getByRole("heading", { name: "Spelling Bee" }).waitFor();
  await page.getByText("100 words ready to practise").waitFor();
  await page.getByRole("heading", { name: "General English" }).waitFor();
  await fits(page);
  await tappable(page);
  await shot(page, "1-home");
  // 2. Start: the first word's full recording (word, sentence, word) plays by itself, for real, to its end
  const first = await clickFor(page, "Start Spelling Bee");
  assert.equal(first.via, "recording");
  assert.equal(first.kind, "full", "the first time: the word, its sentence, the word again");
  await page.getByText("Word 1 of 10").waitFor();
  const events = await waitEnded(page, first.file);
  assert.ok(events.some(([ev, f]) => ev === "playing" && f === first.file), "the browser really played it");
  const end = events.find(([ev, f]) => ev === "ended" && f === first.file);
  assert.ok(Math.abs(end[2] - first.ms) < 400, `it played to its end (${end[2]} ms of ${first.ms} ms)`);
  // the spelling is nowhere in the page, and the recording's address does not spell it
  await notInPage(page, assert, first.word);
  assert.ok(!first.file.includes(first.word), "the file name is a content hash, not the word");
  await page.getByLabel("Hear it again").waitFor();
  await fits(page);
  await tappable(page);
  await shot(page, "2-word");
  // 3. the speaker again: the word alone; again and again; "Hear it in a sentence": the full recording
  for (let k = 0; k < 3; k++) {
    const again = await afterAction(page, () => speaker(page).click());
    assert.deepEqual([again.id, again.kind], [first.id, "word"], "the same word, alone");
  }
  const sentence = await clickFor(page, "Hear it in a sentence");
  assert.deepEqual([sentence.id, sentence.kind], [first.id, "full"]);
  // 4. right (capital letters and a space do not matter): feedback with the spelling
  await submit(page, first.word.toUpperCase() + " ");
  await page.getByRole("heading", { name: "Right!" }).waitFor();
  assert.match(await page.locator(".bee-feedback").innerText(), new RegExp(first.word, "i"));
  // 5. wrong: the spelling is shown, with what was typed, and it goes on the review list
  const second = await clickFor(page, "Next word");
  assert.notEqual(second.id, first.id);
  await page.getByText("Word 2 of 10").waitFor();
  await notInPage(page, assert, second.word);
  await submit(page, `${second.word}x`);
  await page.getByRole("heading", { name: "Not quite." }).waitFor();
  const fb = await page.locator(".bee-feedback").innerText();
  assert.match(fb, new RegExp(`The spelling is ${second.word}`, "i"));
  assert.match(fb, /review list/);
  assert.match(await page.locator(".bee-progress").innerText(), /Word 2 of 10/, "the counter stays on the answered word");
  await shot(page, "3-feedback-wrong");
  // 6. two more, then a reload in the middle: Home offers to carry on, at the same word, with its recording
  let w = await clickFor(page, "Next word");
  for (let k = 0; k < 2; k++) {
    await notInPage(page, assert, w.word);
    await submit(page, w.word);
    w = await clickFor(page, "Next word");
  }
  const fifth = w;
  await page.reload();
  const resumed = await clickFor(page, /Carry on Spelling Bee \(word 5 of 10\)/);
  assert.equal(resumed.id, fifth.id, "the same word after a reload");
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
  assert.equal((await clickFor(again, "Start Spelling Bee")).id, second.id, "the misspelt word comes back first");
  assert.deepEqual(await spoken(again), [], "the device's voice was never needed: every word was a recording");
  assert.deepEqual(foreign, [], "nothing is sent anywhere");
  assert.deepEqual(errors, []);
  await context.close();
});

test("the next word comes by itself; the old recording stops first; locking the screen stops the sound", async () => {
  const { context, page, errors } = await phone({ advanceMs: null }); // the app's own timing
  await newLearner(page, "Auto Advance");
  const first = await clickFor(page, "Start Spelling Bee");
  // answer while the long recording is still playing: it stops at once, and the next word follows without a tap
  await page.waitForFunction((f) => window.__audioEvents.some(([ev, src]) => ev === "playing" && src === f), first.file);
  const n = await asked(page);
  await page.locator(".bee-answer input").fill(first.word);
  await page.locator(".bee-answer input").press("Enter");
  await page.getByRole("heading", { name: "Right!" }).waitFor();
  assert.ok((await audioEvents(page)).some(([ev, f]) => ev === "pause" && f === first.file), "the first word's recording stopped when the answer was given");
  const second = await wordAfter(page, n); // no Next tap: it came by itself
  assert.notEqual(second.id, first.id);
  await page.getByText("Word 2 of 10").waitFor();
  const ev = await audioEvents(page);
  const lastFirst = ev.map(([e, f], i) => (f === first.file ? i : -1)).filter((i) => i >= 0).at(-1);
  const firstSecond = ev.findIndex(([e, f]) => e === "playing" && f === second.file);
  assert.ok(lastFirst < firstSecond || firstSecond === -1, "nothing of the old word is heard after the new one starts");
  // the phone locks: the sound stops
  await page.waitForFunction((f) => window.__audioEvents.some(([e, src]) => e === "playing" && src === f), second.file);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(await page.evaluate(() => window.__audio.paused), true);
  assert.deepEqual(errors, []);
  await context.close();
});

test("a phone that refuses sound no tap started: the speaker asks for one tap, and the tap plays the word", async () => {
  // Chrome on a phone refuses sound that no recent tap started (a fresh page, or a word started by a timer). Headless
  // Chromium does not, even with --autoplay-policy flags, so the spy applies that rule, using the browser's real record
  // of taps (navigator.userActivation); the recording itself still plays for real.
  const { context, page, errors } = await phone({ advanceMs: 6500, strictAutoplay: true }); // the tap's activation lasts about 5 s
  await newLearner(page, "Strict Phone");
  const first = await clickFor(page, "Start Spelling Bee");
  await submit(page, first.word);
  // the next word starts from a timer after the activation has run out: refused
  const second = await wordAfter(page, await asked(page));
  await page.getByText("Word 2 of 10").waitFor();
  assert.ok((await audioEvents(page)).some(([ev, f, why]) => ev === "rejected" && f === second.file && why === "NotAllowedError"));
  // no technical message: the big speaker says "Tap to hear the word"
  await page.getByLabel("Tap to hear the word").waitFor();
  await notInPage(page, assert, second.word);
  await shot(page, "5-tap");
  const tapped = await afterAction(page, () => speaker(page).click());
  assert.equal(tapped.id, second.id, "the tap plays the word being asked");
  assert.equal(tapped.kind, "full", "the first hearing is the word, its sentence and the word again");
  await waitEnded(page, tapped.file);
  await page.getByLabel("Hear it again").waitFor();
  // a reload (a fresh page: no tap yet): the word waits for a tap, then plays
  await page.reload();
  const resumed = await clickFor(page, /Carry on Spelling Bee \(word 2 of 10\)/);
  assert.equal(resumed.id, second.id);
  assert.deepEqual(errors, []);
  await context.close();
});

test("a recording that cannot load: the device's voice says it instead; if nothing can be heard, a grown-up can read it", async () => {
  const { context, page, errors } = await phone({ dropSpeech: 100 });
  // the network fails for recordings only
  await context.route("**/audio/*.mp3", (r) => r.abort("failed"));
  await newLearner(page, "No Network");
  const n0 = await asked(page);
  await page.getByRole("button", { name: "Start Spelling Bee" }).click();
  const first = await wordAfter(page, n0);
  assert.equal(first.via, "recording");
  // the recording was asked for, failed, and the voice was asked for the same word (it then stays silent here)
  const said = await wordAfter(page, n0 + 1);
  assert.equal(said.via, "voice");
  assert.match(said.script, new RegExp(`^${first.word}\\. .+ ${first.word}\\.$`), "the voice says the word, its sentence and the word");
  await page.getByLabel("Tap to try again").waitFor();
  await notInPage(page, assert, first.word);
  // a second try fails too: only then is a grown-up offered, as a small link, never as the first thing
  await afterAction(page, () => speaker(page).click());
  await page.getByRole("button", { name: /A grown-up can read it to you/ }).waitFor();
  await notInPage(page, assert, first.word);
  await shot(page, "6-failed");
  // the network is back: one tap plays the recording
  await context.unroute("**/audio/*.mp3");
  const back = await afterAction(page, () => speaker(page).click());
  assert.equal(back.via, "recording");
  assert.equal(back.id, first.id);
  await waitEnded(page, back.file);
  assert.deepEqual(errors, []);
  await context.close();
});

test("a slow network: the speaker shows it is getting the word, then the word plays", async () => {
  const { context, page, errors } = await phone();
  await context.route("**/audio/*.mp3", async (r) => {
    await new Promise((res) => setTimeout(res, 1500));
    await r.continue();
  });
  await newLearner(page, "Slow Network");
  const first = await clickFor(page, "Start Spelling Bee");
  await page.getByLabel("Getting the word…").waitFor();
  await waitEnded(page, first.file);
  await page.getByLabel("Hear it again").waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test("a phone that lists no voices (like Chrome on many Samsung phones): the Bee plays its recordings, and a parent's list is still spoken", async () => {
  const { context, page, errors } = await phone({ voices: false });
  await newLearner(page, "Samsung Phone");
  // the Spelling Bee: recordings, no message about the device
  const first = await clickFor(page, "Start Spelling Bee");
  assert.equal(first.via, "recording");
  await waitEnded(page, first.file);
  assert.ok(!/can't say words|cannot say words|An adult can read/i.test(await page.locator("main").innerText()), "no message about the device's voice");
  // a parent's list: no voice is listed, so the app asks the phone's default voice (no voice chosen) to say each word
  await page.getByRole("button", { name: "← Home" }).click();
  await page.getByRole("button", { name: "Add a word list" }).click();
  await page.getByRole("button", { name: "New word list" }).click();
  await page.getByLabel("List name").fill("Week 1");
  await page.getByLabel(/Words: one per line/).fill("castle, island");
  await page.getByRole("button", { name: "Check the words" }).click();
  await page.getByRole("button", { name: "Save the list" }).click();
  const w = await clickFor(page, "Practise");
  assert.equal(w.via, "voice");
  assert.ok(["castle", "island"].includes(w.word));
  await page.getByLabel("Hear it again").waitFor();
  await notInPage(page, assert, w.word);
  assert.ok(!/can't say words|An adult can read/i.test(await page.locator("main").innerText()));
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
    assert.equal(resumed.id, third.id, "the same word after a browser restart");
    assert.match(await page.locator(".bee-progress").innerText(), /Word 3 of 10[\s\S]*✓ 1[\s\S]*✗ 1/);
    // and on, with the keyboard only: type, Enter to submit, Enter again for the next word
    await page.locator(".bee-answer input").fill(third.word);
    await page.locator(".bee-answer input").press("Enter");
    await page.getByRole("heading", { name: "Right!" }).waitFor();
    const fourth = await afterAction(page, () => page.keyboard.press("Enter"));
    assert.notEqual(fourth.id, third.id);
    await page.getByText("Word 4 of 10").waitFor();
    await context.close();
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
});

test("every recording the app can ask for is one of the 200 checked recordings", () => {
  assert.equal(CLIPS.size, 200);
  assert.ok([...CLIPS.values()].every((c) => c.ms > 0 && c.word.length > 0));
  void played;
});
