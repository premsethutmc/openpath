/**
 * End-to-end: the private English web app in a real browser at phone size, against the production build.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:e2e
 *
 * Device-only use (no account server). Accounts are covered by e2e/accounts.test.mjs.
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
  ["items/code-items.json", "items/e2a-items.json", "items/e2b-items.json", "spelling/generated-items.json", "pilot/items.json"].flatMap((f) => JSON.parse(readFileSync(new globalThis.URL(f, CONTENT), "utf8")).map((i) => [i.id, i])),
);
for (const i of JSON.parse(readFileSync(new globalThis.URL("web/doubling-journey.json", CONTENT), "utf8")).items) items.set(i.id, i);

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

/** The prototype's onboarding, on this device (the static build has no account server): name and who is learning, goal and consent, then Home. */
async function createProfile(page, name = "Asha") {
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await fits(page);
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.getByText("Tick the box to agree").waitFor();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.getByRole("button", { name: "Look around first" }).click();
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
  await page.getByRole("button", { name: "Back to today" }).click();
  // the plan now offers spelling practice with a lesson
  await page.getByRole("heading", { name: /^Spelling: / }).waitFor();
  // one plan on Today; the spelling patterns list lives behind "More practice"
  assert.equal(await page.getByText("Spelling patterns").count(), 0);
  await page.getByRole("button", { name: "More practice", exact: true }).click();
  await page.getByRole("heading", { name: "Spelling patterns" }).waitFor();
  await page.getByRole("button", { name: /Back to today/ }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
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
  // nothing was sent anywhere, and nothing went wrong
  assert.deepEqual(foreign, [], "no request leaves this device");
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
  await page.getByRole("button", { name: "Me", exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export a backup" }).click()]);
  const path = await download.path();
  const backup = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(backup.format, "openpath-english-backup");
  assert.equal(backup.profile.name, "Meena");
  assert.ok(backup.events.some((e) => e.kind === "evidence"));
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete this learner from this device" }).click();
  await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
  assert.equal(await page.getByText("Meena").count(), 0, "deleted from this device");
  await page.locator(".import input[type=file]").setInputFiles(path);
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByRole("button", { name: "Progress" }).click();
  // dates of "last checked" may shift by seconds; the levels and evidence must not
  const strip = (t) => t.replace(/\d{4}-\d\d-\d\d/g, "DATE");
  assert.equal(strip(await page.locator("main").innerText()), strip(before));
  // a damaged file is refused with a reason
  await page.getByRole("button", { name: "Me", exact: true }).click();
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
  await page.getByRole("button", { name: "Me", exact: true }).click();
  const speech = await page.locator("#speech-title + p").innerText();
  if (/no built-in English voice/.test(speech)) {
    // no on-device voice in this browser: no dictation questions, ever
    await page.getByRole("button", { name: "Home", exact: true }).click();
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

/** Type an answer to the journey question on screen: right, or the form without doubling. */
async function journeyAnswer(page, right) {
  const id = await page.locator(".item").getAttribute("data-item");
  const item = items.get(id);
  assert.ok(item, `unknown item ${id}`);
  const wrong = item.generated ? item.generated.base + item.generated.join.replace("-", "") : (Object.entries(item.wrong ?? {}).find(([, t]) => t === "no_doubling")?.[0] ?? item.answers[0]);
  await page.locator(".ruled input").fill(right ? item.answers[0] : wrong);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.locator(".feedback").waitFor();
  return id;
}

test("the doubling journey on a phone: check, diagnosis, a lesson, help that is marked as help, a new approach, independent words, summary", async () => {
  const { context, page, errors, foreign } = await phone();
  await createProfile(page, "Ravi");
  await page.getByRole("button", { name: "More practice", exact: true }).click();
  await page.getByRole("button", { name: "Try doubling letters" }).click();
  // two independent questions, both wrong (never doubles)
  for (let k = 0; k < 2; k++) {
    await page.locator('[data-step="question"][data-purpose="assessment"]').waitFor();
    if (k === 0) await shot(page, "j1-check");
    await journeyAnswer(page, false);
    await next(page);
  }
  // first teaching approach
  await page.locator('[data-step="teach"][data-strategy="worked_examples"]').waitFor();
  await shot(page, "j2-lesson");
  await fits(page);
  await tappable(page);
  await page.getByRole("button", { name: "Practise with help" }).click();
  // guided practice, first word: wrong after two hints, then the third level is a labelled worked example that shows the answer
  await page.locator('[data-step="guided"]').waitFor();
  for (let h = 0; h < 2; h++) {
    await journeyAnswer(page, false);
    await page.getByRole("button", { name: "Show a hint" }).click();
    await page.locator(".hints li").nth(h).waitFor();
    await page.locator(".feedback").waitFor({ state: "detached" });
    if (h === 0) await shot(page, "j3-hint");
  }
  await journeyAnswer(page, false);
  await page.getByRole("button", { name: "Show a worked example" }).click();
  const worked = page.locator('.hints li[data-worked="true"]');
  await worked.waitFor();
  assert.match(await worked.innerText(), /^Worked example: this shows the answer\. .+ = clapping\.$/);
  await shot(page, "j3b-worked-example");
  await fits(page);
  await journeyAnswer(page, true);
  await page.getByText("Right, after seeing the worked example. Next, a new word.").waitFor();
  await next(page);
  // the next word is new, and is tried once without a hint before any help is offered
  await page.locator('[data-step="guided"] .try-first').waitFor();
  assert.equal(await page.getByRole("button", { name: /hint|worked example/i }).count(), 0);
  for (let k = 1; k < 4; k++) {
    await page.locator('[data-step="guided"]').waitFor();
    await journeyAnswer(page, false);
    await page.getByRole("button", { name: "Show a hint" }).click();
    await page.locator(".hints li").first().waitFor();
    await journeyAnswer(page, true);
    await page.getByText("Right, with help.").waitFor();
    await next(page);
  }
  // reassessment on new words: a word that doubles, one that must not, another that doubles; the doubling ones still wrong
  const purposes = [];
  for (let k = 0; k < 3; k++) {
    await page.locator('[data-step="question"][data-purpose="reassess"]').waitFor();
    purposes.push(items.get(await journeyAnswer(page, false)).family);
    await next(page);
  }
  assert.deepEqual(purposes, ["fam.infl.double", "fam.infl.double.contrast", "fam.infl.double"]);
  // a different approach
  await page.locator('[data-step="teach"][data-strategy="sound_first"]').waitFor();
  await page.getByText("Let's try a different way").waitFor();
  await shot(page, "j4-new-approach");
  await page.getByRole("button", { name: "Practise with help" }).click();
  for (let k = 0; k < 4; k++) {
    await page.locator('[data-step="guided"]').waitFor();
    await journeyAnswer(page, true);
    await next(page);
  }
  for (let k = 0; k < 3; k++) {
    await page.locator('[data-step="question"][data-purpose="reassess"]').waitFor();
    if (k === 0) await shot(page, "j5-new-word");
    await journeyAnswer(page, true);
    await next(page);
  }
  // summary: progress, not mastery; parent view
  await page.locator('[data-step="summary"][data-outcome="improved_after_teaching"]').waitFor();
  const text = await page.locator(".parent").innerText();
  await shot(page, "j6-summary");
  await fits(page);
  assert.match(text, /not yet mastery/);
  assert.match(text, /After "Rule and worked examples": 0 of 2 new words right without help, and 1 of 1 words that must not double/);
  assert.match(text, /After "Listen for the short vowel": 2 of 2 new words right without help, and 1 of 1 words that must not double/);
  assert.match(text, /of which 1 was a worked example showing the answer/);
  const assisted = await page.locator('.parent li[data-kind="assisted"]').allTextContents();
  assert.ok(assisted.some((t) => /wrote "claping" for "clapping", then right only after a worked example showed the answer/.test(t)), assisted.join(" | "));
  assert.match(text, /Yes: 2 approaches tried/);
  assert.match(text, /4 right after a hint or second try/);
  assert.match(text, /provisional/);
  assert.doesNotMatch(text, /%|probability|mastered/i);
  await page.getByRole("button", { name: "Back to today" }).click();
  await page.getByRole("button", { name: "Progress" }).click();
  await page.locator(".parent").waitFor();
  // after a reload, the same summary (rebuilt from the stored events)
  await page.reload();
  await page.getByRole("button", { name: "Progress" }).click();
  assert.equal(await page.locator(".parent").innerText(), text);
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});

test("one learner, many skills on a phone: a plan from the evidence, child labels, a check, and the parent overview that explains it", async () => {
  const { context, page, errors, foreign } = await phone();
  await createProfile(page, "Nila");
  // before anything: only the starting point
  assert.equal(await page.locator(".plan li").count(), 1);
  assert.equal(await page.locator('.plan li[data-activity="start"]').count(), 1);
  await page.getByRole("button", { name: "Start" }).first().click();
  await finishSession(page, () => true);
  await page.getByRole("button", { name: "Back to today" }).click();
  await page.getByRole("button", { name: "Start" }).first().click(); // the spelling check
  await finishSession(page, () => true);
  await page.getByRole("button", { name: "Back to today" }).click();
  // the plan: at most three activities, each with a child-facing label, no numbers about the child
  const plan = page.locator(".plan li");
  const n = await plan.count();
  assert.ok(n >= 1 && n <= 3, `${n} activities`);
  const labels = (await page.locator(".plan .kicker").allTextContents()).map((l) => l.replace(/^Your next adventure · /, ""));
  for (const l of labels) assert.ok(["Keep learning", "Check something you learned", "Try a new skill", "Show what you know", "Let's begin"].includes(l), l);
  assert.doesNotMatch(await page.locator(".plan").innerText(), /%|band|estimate|probabilit/i);
  // one plan: the older sections are behind a single "More practice" entry, and work from there
  const today = await page.locator("main").innerText();
  assert.doesNotMatch(today, /Spelling patterns|Your spelling plan|Doubling letters \(new/);
  await page.getByRole("button", { name: "More practice", exact: true }).click();
  await page.getByRole("heading", { name: "More practice", level: 1 }).waitFor();
  await page.getByRole("button", { name: "Try doubling letters" }).waitFor();
  await page.getByRole("button", { name: "Start more practice" }).waitFor();
  await shot(page, "p1b-more-practice");
  await fits(page);
  await tappable(page);
  await page.getByRole("button", { name: /Back to today/ }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await shot(page, "p1-today-plan");
  await fits(page);
  await tappable(page);
  // a check from the plan: a few independent questions on one skill
  const first = page.locator('.plan li[data-activity="show_what_you_know"], .plan li[data-activity="new_skill"]').first();
  const capability = await first.getAttribute("data-capability");
  await first.getByRole("button", { name: "Start" }).click();
  const asked = await finishSession(page, () => false);
  assert.ok(asked.length >= 1 && asked.length <= 4);
  for (const i of asked) assert.equal(i.target, capability, "the check stays on its skill");
  await page.getByRole("button", { name: "Back to today" }).click();
  // the grown-up link leads to the overview: what is shown, unsure, hard, helped, next, and why the plan changed
  await page.getByRole("button", { name: "For a grown-up: why these?" }).click();
  await page.locator(".overview").waitFor();
  for (const part of ["shown", "improving", "uncertain", "hard", "helped", "due", "not-kept", "improved", "next", "changes", "not-checked"]) assert.equal(await page.locator(`.overview [data-part="${part}"]`).count(), 1, part);
  const overview = await page.locator(".overview").innerText();
  assert.match(overview, /Why the plan changed/);
  assert.match(overview, /not a weakness|says nothing about how well/);
  assert.doesNotMatch(overview, /percentile|\bIQ\b|rank|%/i);
  await shot(page, "p2-overview");
  await fits(page);
  // the same overview after a reload: rebuilt from the stored record
  const text = await page.locator(".overview").innerText();
  await page.reload();
  await page.getByRole("button", { name: "Progress" }).click();
  assert.equal(await page.locator(".overview").innerText(), text);
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});
