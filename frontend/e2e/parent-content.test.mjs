/**
 * End-to-end: a parent's own material for a learner in a parent ACCOUNT (records on OpenPath's server), on a phone-sized
 * browser (Chromium emulating an Android phone; not a physical phone). My Words: the parent is told where lists are
 * kept, makes a list, the learner practises it, the progress belongs to that learner; another phone signed in to the
 * same account sees the list and its progress; another family cannot read any of it. Device-only learners are covered
 * by e2e/mywords.test.mjs.
 *
 *   (API on 8000, the app with the API on 4175)
 *   E2E_URL=http://127.0.0.1:4175 npm run english:e2e-parent-content
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4175";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/parent-content-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const PASSWORD = "a-long-family-passphrase";
const run = Date.now().toString(36);
const PARENT = `lists.${run}@example.org`;
const OTHER = `stranger.${run}@example.org`;

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function phone() {
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
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  return { context, page, errors };
}
const api = (page, method, path, body) =>
  page.evaluate(
    async ({ method, path, body }) => {
      const token = (document.cookie.match(/(?:^|; )csrftoken=([^;]*)/) ?? [])[1] ?? "";
      const r = await fetch(`/api${path}`, { method, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(token) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, json: r.status === 204 ? null : await r.json().catch(() => null) };
    },
    { method, path, body },
  );
async function register(page, email) {
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.locator("#account-consent").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
}
async function signIn(page, email) {
  await page.goto(URL);
  await page.getByRole("button", { name: "I have a parent account" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
}
async function addLearner(page, name) {
  await page.getByRole("button", { name: "Add a learner" }).click();
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: /School learner/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Understand grammar/ }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator(".plan li").first().waitFor();
}
const spoken = (page) => page.evaluate(() => window.__spoken.slice());
async function advance(page, name) {
  const n = (await spoken(page)).length;
  await page.getByRole("button", { name }).click();
  await page.waitForFunction((k) => window.__spoken.length > k, n);
  return (await spoken(page)).at(-1).split(".")[0].trim();
}

let zoeId = null;

test("My Words in a parent account: told where lists are kept, saved to the learner's record, practised, progress kept", async () => {
  const { context, page, errors } = await phone();
  await register(page, PARENT);
  await addLearner(page, "Zoe");
  zoeId = (await api(page, "GET", "/pupils/")).json.pupils.find((p) => p.display_name === "Zoe").id;
  await page.getByRole("button", { name: "Add a word list" }).click();
  // said plainly before anything is typed
  assert.match(await page.locator(".where-kept").innerText(), /saved in Zoe's record in your parent account, so they are on any device you sign in on\. Only your account can open them/);
  await shot(page, "1-where-kept");
  await page.getByRole("button", { name: "New word list" }).click();
  await page.getByLabel("List name").fill("Week 5");
  await page.getByLabel(/Words: one per line/).fill("colour/color, because, island");
  await page.getByRole("button", { name: "Check the words" }).click();
  await page.getByRole("heading", { name: "3 words ready" }).waitFor();
  await page.getByRole("button", { name: "Save the list" }).click();
  const card = page.locator(".word-lists li", { hasText: "Week 5" });
  await card.waitFor();
  // the learner practises: the shared Spelling Bee screen; one wrong on purpose
  let w = await advance(page, "Practise");
  for (let k = 0; k < 3; k++) {
    await page.locator(".ruled input").fill(k === 1 ? `${w}x` : w);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.locator(".bee-feedback").waitFor();
    if (k < 2) w = await advance(page, "Next word");
    else await page.getByRole("button", { name: "See how you did" }).click();
  }
  await page.getByRole("button", { name: "Back to My Words" }).click();
  assert.match(await card.innerText(), /practised 3 of 3 · 2 of 3 right · 1 to review/);
  // stored in Zoe's own record on the server, with every answer traced to the list
  const events = (await api(page, "GET", `/pupils/${zoeId}/events/?subject=english`)).json.events;
  const list = events.find((e) => e.kind === "word_list");
  assert.deepEqual(list.list.words.map((x) => x.word), ["colour", "because", "island"]);
  const answers = events.filter((e) => e.kind === "spell_answer");
  assert.equal(answers.length, 3);
  assert.ok(answers.every((e) => e.source.type === "list" && e.source.id === list.list.id));
  assert.deepEqual(errors, []);
  await context.close();
});

test("another phone signed in to the same account sees the list and its progress; another family sees nothing", async () => {
  assert.ok(zoeId, "runs after the first test");
  const second = await phone();
  await signIn(second.page, PARENT);
  await second.page.getByRole("button", { name: /Zoe/ }).click();
  await second.page.getByRole("button", { name: "Open My Words" }).click();
  assert.match(await second.page.locator(".word-lists li", { hasText: "Week 5" }).innerText(), /practised 3 of 3 · 2 of 3 right · 1 to review/);
  await shot(second.page, "2-second-phone");
  assert.deepEqual(second.errors, []);
  await second.context.close();
  // another family: the pupil, the record and the export are all refused
  const other = await phone();
  await register(other.page, OTHER);
  for (const path of [`/pupils/${zoeId}/`, `/pupils/${zoeId}/events/?subject=english`, `/pupils/${zoeId}/export/`]) assert.equal((await api(other.page, "GET", path)).status, 404, path);
  assert.deepEqual((await api(other.page, "GET", "/pupils/")).json.pupils, []);
  await other.context.close();
});
