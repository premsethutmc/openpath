/**
 * End-to-end: the private English web app in a real browser at phone size, against the production build.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e
 *
 * Covers the whole journey (create a profile, placement, plan, lesson, practice with feedback, progress,
 * return later), persistence across reloads, export and import, offline use, mobile layout, and that
 * the page makes no request to any other site.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const CONTENT = new globalThis.URL("../../content/english/", import.meta.url);
const items = new Map(
  ["items/code-items.json", "items/e2a-items.json", "items/e2b-items.json", "spelling/generated-items.json"].flatMap((f) => JSON.parse(readFileSync(new globalThis.URL(f, CONTENT), "utf8")).map((i) => [i.id, i])),
);

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true };
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/english-${name}.png`, fullPage: true });

async function phone() {
  const context = await browser.newContext(PHONE);
  const page = await context.newPage();
  const errors = [];
  const foreign = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("request", (r) => {
    const u = new globalThis.URL(r.url());
    if (!["127.0.0.1", "localhost"].includes(u.hostname) && u.protocol !== "data:" && u.protocol !== "blob:") foreign.push(r.url());
  });
  return { context, page, errors, foreign };
}

/** The page fits the phone: no sideways scrolling. */
async function fits(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w, `page is ${sw}px wide on a ${w}px screen`);
}

/** Every visible button is big enough to tap (44 px), except small text links. */
async function tappable(page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((b) => !b.classList.contains("link") && b.offsetParent !== null)
      .map((b) => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height }))
      .filter((b) => b.h < 40),
  );
  assert.deepEqual(small, [], "buttons are at least about 44 px tall");
}

async function createProfile(page, name = "Asha") {
  await page.goto(URL);
  await page.getByRole("heading", { name: "OpenPath English" }).waitFor();
  await fits(page);
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: "Create and start" }).click();
  await page.getByText("Tick the box to agree").waitFor();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Create and start" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
}

/** Answer the question on screen, right or wrong, using the item's own key. Returns the item. */
async function answer(page, right = true) {
  const id = await page.locator(".item").getAttribute("data-item");
  const item = items.get(id);
  assert.ok(item, `unknown item ${id}`);
  const kind = item.format.split(":")[0];
  const opts = page.locator(".answer .option");
  if (kind === "typed") await page.locator(".ruled input").fill(right ? item.answers[0] : "zzzq");
  else if (kind === "choice") await opts.nth(right ? item.answer : (item.answer + 1) % item.options.length).click();
  else if (kind === "multi") for (const i of right ? item.answer_set : [0]) await opts.nth(i).click();
  else if (kind === "order") for (const i of right ? item.answer_order : [...item.answer_order].reverse()) await opts.nth(i).click();
  else if (kind === "match") {
    const sel = page.locator(".match select");
    for (let k = 0; k < item.left.length; k++) await sel.nth(k).selectOption(String(right ? item.answer_pairs[k] : item.answer_pairs[(k + 1) % item.left.length]));
  }
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.locator(".feedback").waitFor();
  return item;
}

/** Go on to the next question, and wait until the answered one has gone. */
async function next(page) {
  await page.getByRole("button", { name: "Next" }).click();
  await page.locator(".feedback").waitFor({ state: "detached" });
}

/** Work through the open session to its end. */
async function finishSession(page, right = () => true) {
  const asked = [];
  for (let n = 0; n < 40; n++) {
    await page.locator(".item, .lesson, .done").first().waitFor({ timeout: 8000 }).catch(async (e) => { console.log("STALL:", (await page.locator("body").innerText()).slice(0, 600)); throw e; });
    if (await page.locator(".done").count()) return asked;
    if (await page.locator(".lesson").count()) {
      await page.locator(".check .option").first().click();
      await page.getByRole("button", { name: "Start practising" }).click();
      continue;
    }
    asked.push(await answer(page, right(n)));
    await next(page);
  }
  throw new Error("the session did not end");
}

test("the whole journey on a phone: profile, placement, plan, lesson, practice with feedback, progress", async () => {
  const { context, page, errors, foreign } = await phone();
  await createProfile(page);
  await shot(page, "1-today");
  await fits(page);
  await tappable(page);
  // placement
  await page.getByRole("heading", { name: "Find your starting point" }).waitFor();
  await page.getByRole("button", { name: "Start" }).first().click();
  await page.locator(".item").waitFor();
  await shot(page, "2-question");
  await fits(page);
  const placement = await finishSession(page, (n) => n % 3 !== 2);
  assert.ok(placement.length >= 12 && placement.length <= 24, `${placement.length} placement questions`);
  for (const i of placement) assert.ok(!i.generated, "placement uses hand-written items only");
  await page.getByText(/Your starting point is set/).waitFor();
  await page.getByRole("button", { name: "Back to today" }).click();
  // the spelling check
  await page.getByRole("heading", { name: "Spelling check" }).waitFor();
  await page.getByRole("button", { name: "Start" }).first().click();
  const check = await finishSession(page, () => false);
  assert.ok(check.length >= 3);
  for (const i of check) assert.ok(i.generated, "the spelling check uses dictionary words");
  await page.getByText(/Words to review in a day/).waitFor();
  // one optional tap on how it felt
  await page.getByRole("button", { name: "Too hard" }).click();
  await page.getByText("Thanks. Saved on this device.").waitFor();
  assert.equal(await page.getByRole("button", { name: "Too hard" }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Back to today" }).click();
  // the plan now offers spelling practice with a lesson
  await page.getByRole("heading", { name: /^Spelling: / }).waitFor();
  await page.getByText("Your spelling plan").waitFor();
  await shot(page, "3-plan");
  await page.locator(".plan li", { hasText: "Spelling:" }).getByRole("button", { name: "Start" }).click();
  await page.locator(".lesson").waitFor();
  await shot(page, "4-lesson");
  await fits(page);
  await page.locator(".check .option").first().click();
  await page.locator(".lesson .feedback").waitFor();
  await page.getByRole("button", { name: "Start practising" }).click();
  // a wrong answer: the right answer and an explanation; a second try is practice only
  await page.locator(".item").waitFor();
  const wrong = await answer(page, false);
  await page.getByText("Not quite.").waitFor();
  assert.match(await page.locator(".feedback").innerText(), new RegExp(wrong.generated ? wrong.generated.word : "The answer is"));
  await shot(page, "5-feedback");
  await page.getByRole("button", { name: "Try again (practice only)" }).click();
  await answer(page, true);
  await page.getByText("Right this time.").waitFor();
  await next(page);
  await finishSession(page, () => true);
  await page.getByRole("button", { name: "Back to today" }).click();
  // progress: early estimates, kinds of evidence, practice words shown apart
  await page.getByRole("button", { name: "Progress" }).click();
  await page.getByRole("heading", { name: "Progress" }).waitFor();
  await shot(page, "6-progress");
  await fits(page);
  assert.ok((await page.getByText("Early estimate").count()) > 0);
  assert.ok((await page.getByText("Not assessed yet").count()) > 0);
  await page.getByText(/recorded but not counted until checked/).first().waitFor();
  await page.getByText("Spelling patterns").waitFor();
  // three levels of spelling progress, apart: overall level, patterns, words
  await page.getByRole("heading", { name: "Overall spelling level" }).waitFor();
  await page.getByRole("heading", { name: "Words", exact: true }).waitFor();
  assert.match(await page.locator(".word-counts").innerText(), /learning/);
  await page.getByText(/Word progress does not change your spelling level/).waitFor();
  await page.locator(".words summary").click();
  assert.ok((await page.locator(".words-table tbody tr").count()) >= check.length);
  await fits(page);
  // nothing was sent anywhere, and nothing went wrong
  assert.deepEqual(foreign, [], "no request leaves this device");
  assert.deepEqual(errors, []);
  await context.close();
});

test("trial: a note and a summary to share, made on the device, without the learner's name", async () => {
  const { context, page, errors, foreign } = await phone();
  const head = (await page.request.get(URL)).headers();
  assert.equal(head["x-frame-options"], "DENY");
  assert.equal(head["x-robots-tag"], "noindex, nofollow");
  assert.match(head["permissions-policy"], /microphone=\(\)/);
  await createProfile(page, "Priya");
  await page.getByRole("button", { name: "Start" }).first().click();
  await finishSession(page);
  await page.getByRole("button", { name: "About right" }).click();
  await page.locator(".rate summary").click();
  await page.getByLabel("What happened?").fill("Some questions used words she did not know.");
  await page.getByRole("button", { name: "Save note" }).click();
  await page.getByText("Note saved on this device.").waitFor();
  await page.getByRole("button", { name: "Back to today" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByText(/Development version: practice words include ones not yet reviewed/).waitFor();
  await page.getByLabel(/Tell us about a problem/).fill("The Next button was below the keyboard.");
  await page.getByRole("button", { name: "Save note" }).click();
  await page.getByText("Note saved on this device.").waitFor();
  await tappable(page);
  await fits(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Save a trial summary" }).click()]);
  assert.match(download.suggestedFilename(), /^openpath-trial-summary-[0-9a-f]{8}-\d{4}-\d\d-\d\d\.json$/);
  const text = readFileSync(await download.path(), "utf8");
  const summary = JSON.parse(text);
  assert.equal(summary.format, "openpath-english-pilot-summary");
  assert.ok(!text.includes("Priya"), "the summary has no name");
  assert.equal(summary.device.width, 390);
  assert.equal(summary.usability.ratings.about_right, 1);
  assert.deepEqual(summary.usability.notes.map((n) => n.screen), ["end:placement", "settings"]);
  assert.equal(summary.sessions[0].type, "placement");
  assert.ok(summary.activity.questions >= 12);
  assert.deepEqual(foreign, [], "nothing is sent: the summary is a file on the device");
  assert.deepEqual(errors, []);
  await context.close();
});

test("reliable resume: a reload in the middle of a session carries on at the same question", async () => {
  const { context, page, errors } = await phone();
  await createProfile(page, "Ravi");
  await page.getByRole("button", { name: "Start" }).first().click();
  for (let i = 0; i < 3; i++) {
    await page.locator(".item").waitFor();
    await answer(page, true);
    await next(page);
  }
  await page.locator(".item").waitFor();
  const pending = await page.locator(".item").getAttribute("data-item");
  await page.reload();
  // the app reopens the same learner, and offers to carry on
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByText(/You stopped in the middle of/).waitFor();
  await page.getByRole("button", { name: "Carry on" }).click();
  await page.locator(".item").waitFor();
  assert.equal(await page.locator(".item").getAttribute("data-item"), pending, "the same question is waiting");
  assert.equal(await page.locator(".progress").getAttribute("aria-valuenow"), "3");
  // a fresh tab on the same device sees the same record
  const second = await context.newPage();
  await second.goto(URL);
  await second.getByText(/You stopped in the middle of/).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test("export, delete and import: the backup brings back exactly the same progress", async () => {
  const { context, page, errors } = await phone();
  await createProfile(page, "Meena");
  await page.getByRole("button", { name: "Start" }).first().click();
  await finishSession(page, (n) => n % 2 === 0);
  await page.getByRole("button", { name: "Back to today" }).click();
  await page.getByRole("button", { name: "Progress" }).click();
  const before = await page.locator("main").innerText();
  await page.getByRole("button", { name: "Settings" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export a backup" }).click()]);
  const path = await download.path();
  const backup = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(backup.format, "openpath-english-backup");
  assert.equal(backup.profile.name, "Meena");
  assert.ok(backup.events.some((e) => e.kind === "evidence"));
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete this learner from this device" }).click();
  await page.getByRole("heading", { name: "OpenPath English" }).waitFor();
  assert.equal(await page.getByText("Meena").count(), 0, "deleted from this device");
  await page.locator(".import input[type=file]").setInputFiles(path);
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByRole("button", { name: "Progress" }).click();
  // dates of "last checked" may shift by seconds; the levels and evidence must not
  const strip = (t) => t.replace(/\d{4}-\d\d-\d\d/g, "DATE");
  assert.equal(strip(await page.locator("main").innerText()), strip(before));
  // a damaged file is refused with a reason
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator(".import input[type=file]").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"format":"openpath-english-backup","version":1,"events":[{"kind":"profile"}]}') });
  await page.getByText(/damaged/).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test("words come back for review the next day", async () => {
  const { context, page } = await phone();
  await createProfile(page, "Kiran");
  await page.getByRole("button", { name: "Start" }).first().click();
  await finishSession(page);
  await page.getByRole("button", { name: "Back to today" }).click();
  await page.getByRole("button", { name: "Start" }).first().click(); // spelling check
  await finishSession(page, (n) => n !== 0);
  await page.getByRole("button", { name: "Back to today" }).click();
  assert.equal(await page.getByRole("heading", { name: /^Review / }).count(), 0, "nothing due today");
  await page.evaluate(() => localStorage.setItem("openpath-english-clock-offset-days", "1"));
  await page.reload();
  await page.getByRole("heading", { name: "Review 1 word" }).waitFor();
  await page.locator(".plan li", { hasText: "Review 1 word" }).getByRole("button", { name: "Start" }).click();
  await finishSession(page);
  await page.getByRole("button", { name: "Back to today" }).click();
  assert.equal(await page.getByRole("heading", { name: /^Review / }).count(), 0, "reviewed; next due in 3 days");
  await context.close();
});

test("works offline once opened, and without speech the spelling questions use written clues", async () => {
  const { context, page, errors } = await phone();
  await createProfile(page, "Sam");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // the service worker now controls the page
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByRole("button", { name: "Settings" }).click();
  const speech = await page.locator("#speech-title + p").innerText();
  if (/no built-in English voice/.test(speech)) {
    // no on-device voice in this browser: no dictation questions, ever
    await page.getByRole("button", { name: "Today" }).click();
    await page.getByRole("button", { name: "Start" }).first().click();
    await finishSession(page);
    await page.getByRole("button", { name: "Back to today" }).click();
    await page.getByRole("button", { name: "Start" }).first().click();
    const asked = await finishSession(page, () => false);
    assert.ok(asked.every((i) => !i.generated || i.generated.template !== "hear_spell"));
  }
  await shot(page, "7-offline");
  await context.setOffline(false);
  assert.deepEqual(errors.filter((e) => !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(e)), []);
  await context.close();
});

// ------------------------------------------------------------------ Android phone

const ANDROID = {
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  acceptDownloads: true,
  userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
};
/** About what is left of a Pixel-sized screen with the on-screen keyboard open. */
const KEYBOARD_OPEN = { width: 412, height: 470 };

/** On a typed question: the answer box and Check button are on screen with the keyboard open, and Enter submits. */
async function typeWithKeyboard(page, right) {
  const id = await page.locator(".item").getAttribute("data-item");
  const item = items.get(id);
  if (!item.format.startsWith("typed")) return answer(page, right);
  await page.setViewportSize(KEYBOARD_OPEN);
  const box = page.locator(".ruled input");
  await box.tap();
  for (const [name, attr] of [["autocorrect", "off"], ["autocapitalize", "off"], ["spellcheck", "false"], ["autocomplete", "off"]]) assert.equal(await box.getAttribute(name), attr, `${name} is ${attr}: the keyboard must not correct spelling`);
  const inView = async (loc) => {
    const b = await loc.boundingBox();
    return b && b.y >= 0 && b.y + b.height <= KEYBOARD_OPEN.height;
  };
  assert.ok(await inView(box), "the answer box is visible above the keyboard");
  await page.keyboard.type(right ? item.answers[0] : "zzzq");
  assert.ok(await inView(page.getByRole("button", { name: "Check", exact: true })), "Check is visible above the keyboard");
  await page.keyboard.press("Enter");
  await page.locator(".feedback").waitFor();
  await page.setViewportSize(ANDROID.viewport); // the keyboard closes once the answer is checked
  await fits(page);
  return item;
}

async function finishOnAndroid(page, right = () => true) {
  const asked = [];
  for (let n = 0; n < 40; n++) {
    await page.locator(".item, .lesson, .done").first().waitFor({ timeout: 8000 });
    if (await page.locator(".done").count()) return asked;
    if (await page.locator(".lesson").count()) {
      await page.locator(".check .option").first().tap();
      await page.getByRole("button", { name: "Start practising" }).tap();
      continue;
    }
    asked.push(await typeWithKeyboard(page, right(n)));
    await page.getByRole("button", { name: "Next" }).tap();
    await page.locator(".feedback").waitFor({ state: "detached" });
  }
  throw new Error("the session did not end");
}

test("Android phone: assessment, plan, lesson, typed practice with the keyboard open, feedback, word mastery, reopen, a review a day later, export and import", async () => {
  const context = await browser.newContext(ANDROID);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await createProfile(page, "Anil");
  await tappable(page);
  // 2. the initial assessment: placement, then the spelling check
  await page.getByRole("button", { name: "Start" }).first().tap();
  await finishOnAndroid(page, (n) => n % 3 !== 2);
  await page.getByRole("button", { name: "Back to today" }).tap();
  await page.getByRole("heading", { name: "Spelling check" }).waitFor();
  await page.getByRole("button", { name: "Start" }).first().tap();
  const check = await finishOnAndroid(page, (n) => n !== 0); // the first word misspelt
  const missed = check[0].generated.word;
  await page.getByRole("button", { name: "Back to today" }).tap();
  // 3. a personalised plan, each step with its reason
  await page.getByRole("heading", { name: /^Spelling: / }).waitFor();
  assert.ok((await page.locator(".plan li p").first().innerText()).length > 20, "each step says why");
  await shot(page, "android-1-plan");
  // 4–6. the explanation, typed practice, corrective feedback
  await page.locator(".plan li", { hasText: "Spelling:" }).getByRole("button", { name: "Start" }).tap();
  await page.locator(".lesson").waitFor();
  await shot(page, "android-2-lesson");
  await page.locator(".check .option").first().tap();
  await page.getByRole("button", { name: "Start practising" }).tap();
  await page.locator(".item").waitFor();
  const wrong = await typeWithKeyboard(page, false);
  await page.getByText("Not quite.").waitFor();
  assert.match(await page.locator(".feedback").innerText(), new RegExp(`The answer is ${wrong.answers?.[0] ?? ""}`));
  await shot(page, "android-3-feedback");
  await page.getByRole("button", { name: "Next" }).tap();
  await finishOnAndroid(page);
  await page.getByRole("button", { name: "Back to today" }).tap();
  // 7. word-level mastery
  await page.getByRole("button", { name: "Progress" }).tap();
  await page.locator(".words summary").tap();
  assert.match(await page.locator(".words-table").innerText(), new RegExp(`${missed}\\s+Learning`));
  await shot(page, "android-4-words");
  // 8. close the app completely and open it again: nothing lost
  const before = await page.locator(".word-counts").innerText();
  await page.close();
  const again = await context.newPage();
  again.on("pageerror", (e) => errors.push(e.message));
  await again.goto(URL);
  await again.getByRole("heading", { name: "Today" }).waitFor();
  await again.getByRole("button", { name: "Progress" }).tap();
  assert.equal(await again.locator(".word-counts").innerText(), before);
  // 10. a day later: the misspelt word comes back; written correctly, it is remembered a day later
  await again.evaluate(() => localStorage.setItem("openpath-english-clock-offset-days", "1"));
  await again.reload();
  await again.getByRole("heading", { name: /^Review \d+ words?$/ }).waitFor();
  await again.locator(".plan li", { hasText: "Review" }).getByRole("button", { name: "Start" }).tap();
  await finishOnAndroid(again);
  await again.getByRole("button", { name: "Back to today" }).tap();
  await again.getByRole("button", { name: "Progress" }).tap();
  await again.locator(".words summary").tap();
  assert.match(await again.locator(".words-table").innerText(), new RegExp(`${missed}\\s+Remembered a day or more later`));
  // 9. export, delete, import: the same word record comes back
  const after = await again.locator(".word-counts").innerText();
  await again.getByRole("button", { name: "Settings" }).tap();
  const [download] = await Promise.all([again.waitForEvent("download"), again.getByRole("button", { name: "Export a backup" }).tap()]);
  const path = await download.path();
  again.once("dialog", (d) => d.accept());
  await again.getByRole("button", { name: "Delete this learner from this device" }).tap();
  await again.getByRole("heading", { name: "OpenPath English" }).waitFor();
  await again.locator(".import input[type=file]").setInputFiles(path);
  await again.getByRole("heading", { name: "Today" }).waitFor();
  await again.getByRole("button", { name: "Progress" }).tap();
  assert.equal(await again.locator(".word-counts").innerText(), after);
  await fits(again);
  assert.deepEqual(errors, []);
  await context.close();
});

test("Android phone over plain http on a home network: everything works and is kept, without offline install", async () => {
  const { networkInterfaces } = await import("node:os");
  const { spawn } = await import("node:child_process");
  const lan = Object.values(networkInterfaces()).flat().find((a) => a && a.family === "IPv4" && !a.internal)?.address;
  if (!lan) return; // no network interface to test with
  const server = spawn(process.execPath, [new globalThis.URL("../scripts/preview-english.mjs", import.meta.url).pathname], { env: { ...process.env, HOST: "0.0.0.0", PORT: "4179" }, stdio: "ignore" });
  try {
    const url = `http://${lan}:4179/`;
    for (let i = 0; i < 50; i++) {
      try {
        if ((await fetch(url)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    const context = await browser.newContext(ANDROID);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    assert.equal(await page.evaluate(() => window.isSecureContext), false, "a plain-http address on the network is not a secure context");
    assert.equal(await page.evaluate(() => "serviceWorker" in navigator), false, "so there is no offline install");
    await page.getByLabel(/Name to show/).fill("Lan");
    await page.getByRole("button", { name: "Create and start" }).tap();
    await page.locator("#consent").check();
    await page.getByRole("button", { name: "Create and start" }).tap();
    await page.getByRole("button", { name: "Start" }).first().tap();
    await page.locator(".item").waitFor();
    await typeWithKeyboard(page, true);
    await page.reload();
    await page.getByText(/You stopped in the middle of/).waitFor(); // the answer was kept on the phone
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    server.kill();
  }
});
