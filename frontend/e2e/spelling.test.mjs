/**
 * End-to-end: the spelling check by dictation, on a phone, with the real API (Django on PostgreSQL).
 *
 *   E2E_URL=http://127.0.0.1:4175 E2E_SHOTS=out/spelling-screens [E2E_CLAIM_CMD="cd ../backend && python manage.py developer issue-claim"] \
 *     node --test e2e/spelling.test.mjs
 *
 * Speech: headless Chromium has no voices, so a stand-in speechSynthesis is installed before the page loads. It
 * reports one local English voice and records every utterance instead of playing it, so the test can check what the
 * app said and when. Without the stand-in, the "no voice" path is tested. Synthetic identities and answers only:
 * these are tests of the software, not evidence about how children spell.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4175";
const SHOTS = process.env.E2E_SHOTS;
const CLAIM = process.env.E2E_CLAIM_CMD;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const CONTENT = new globalThis.URL("../../content/english/", import.meta.url);
const items = new Map(
  ["items/code-items.json", "items/e2a-items.json", "items/e2b-items.json", "spelling/generated-items.json", "pilot/items.json", "spelling/dictation-bank.json"].flatMap((f) =>
    ((j) => (Array.isArray(j) ? j : j.items))(JSON.parse(readFileSync(new globalThis.URL(f, CONTENT), "utf8"))).map((i) => [i.id, i]),
  ),
);
const PASSWORD = "a-long-family-passphrase";
const run = Date.now().toString(36);

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
let n = 0;
const shot = async (page, name) => {
  if (!SHOTS) return;
  await page.evaluate(() => document.querySelector(".nav")?.style.setProperty("position", "static"));
  await page.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, "0")}-${name}.png`, fullPage: true });
  await page.evaluate(() => document.querySelector(".nav")?.style.removeProperty("position"));
};

/** A phone whose browser can (or cannot) speak; every utterance is recorded in window.__spoken. */
async function device({ voice }) {
  const context = await browser.newContext(PHONE);
  if (voice)
    await context.addInitScript(() => {
      const v = { name: "Test English (UK)", lang: "en-GB", localService: true, default: true, voiceURI: "test-en-gb" };
      window.__spoken = [];
      class Utterance {
        constructor(text) {
          this.text = text;
        }
      }
      window.SpeechSynthesisUtterance = Utterance;
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: { getVoices: () => [v], speak: (u) => window.__spoken.push(u.text), cancel: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, speaking: false, pending: false },
      });
    });
  else
    await context.addInitScript(() => {
      // a browser that has speech synthesis but no English voice installed
      window.__spoken = [];
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [], speak: () => undefined, cancel: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined } });
    });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/status of (400|403|404|409)/.test(m.text()) && errors.push(m.text()));
  return { context, page, errors };
}

const api = (page, method, path) =>
  page.evaluate(
    async ({ method, path }) => {
      const r = await fetch(`/api${path}`, { method, credentials: "same-origin" });
      return { status: r.status, json: await r.json().catch(() => null) };
    },
    { method, path },
  );
const spoken = (page) => page.evaluate(() => window.__spoken.slice());

async function fits(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w && w <= PHONE.viewport.width, `page is ${sw}px wide (layout ${w}px)`);
}

async function register(page, email, name) {
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.locator("#account-consent").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
  await page.getByRole("button", { name: "Add a learner" }).click();
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: /School learner/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Get better at spelling/ }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.getByRole("button", { name: "I'm ready" }).click();
}

/** Placement: right on easier questions only (a pupil around band 3–4). */
async function placement(page) {
  for (let k = 0; k < 30; k++) {
    await page.locator(".item, .done").first().waitFor({ timeout: 10000 });
    if (await page.locator(".done").count()) break;
    const item = items.get(await page.locator(".item").getAttribute("data-item"));
    await type(page, item, item.b <= 3.75);
  }
  await page.getByRole("button", { name: "Back to today" }).click();
}

async function type(page, item, rightOrText) {
  const kind = item.format.split(":")[0];
  const opts = page.locator(".answer .option");
  const right = rightOrText === true;
  if (kind === "typed") await page.locator(".ruled input").fill(typeof rightOrText === "string" ? rightOrText : right ? item.answers[0] : "zzzq");
  else if (kind === "choice") await opts.nth(right ? item.answer : (item.answer + 1) % item.options.length).click();
  else if (kind === "multi") for (const i of right ? item.answer_set : [0]) await opts.nth(i).click();
  else if (kind === "order") for (const i of right ? item.answer_order : [...item.answer_order].reverse()) await opts.nth(i).click();
  else if (kind === "match") {
    const sel = page.locator(".match select");
    for (let k = 0; k < item.left.length; k++) await sel.nth(k).selectOption(String(right ? item.answer_pairs[k] : item.answer_pairs[(k + 1) % item.left.length]));
  }
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.locator(".feedback").waitFor();
  await page.getByRole("button", { name: "Next" }).click();
  await page.locator(".feedback").waitFor({ state: "detached" });
}

test("with a voice: hear the word, repeat it, hear it in a sentence, type it; a rule error gets a follow-up on the same pattern", async () => {
  const { context, page, errors } = await device({ voice: true });
  await register(page, `dictation.${run}@example.org`, "Ravi");
  await placement(page);
  // Today offers the dictation check
  await page.getByRole("heading", { name: "Spelling check: hear and spell" }).waitFor();
  await page.locator(".plan li", { hasText: "Spelling check: hear and spell" }).getByRole("button", { name: "Start" }).click();
  await page.locator(".spelling-intro").waitFor();
  await fits(page);
  await page.getByRole("button", { name: "Test the sound" }).click();
  assert.deepEqual(await spoken(page), ["Ready? Here is a test word: garden."]);
  await shot(page, "intro-with-voice");
  await page.getByRole("button", { name: "Start the spelling check" }).click();

  const record = [];
  let erred = null;
  for (let k = 0; k < 20; k++) {
    await page.locator(".item, .done").first().waitFor({ timeout: 10000 });
    if (await page.locator(".done").count()) break;
    const item = items.get(await page.locator(".item").getAttribute("data-item"));
    assert.equal(item.format, "typed:dictation");
    const word = item.answers[0];
    // the word is said as soon as it is shown, and never written on the screen
    await page.waitForFunction((w) => window.__spoken.includes(w), word);
    assert.ok(!(await page.locator("main").innerText()).toLowerCase().includes(word), `${word} is not shown before the answer`);
    if (k === 0) {
      await page.getByRole("button", { name: "Repeat the word" }).click();
      await page.getByRole("button", { name: "Hear it in a sentence" }).click();
      const said = await spoken(page);
      assert.equal(said.filter((s) => s === word).length, 2, "played, then repeated");
      assert.equal(said.at(-1), `${word}. ${item.sentence} ${word}.`, "the sentence, between two sayings of the word");
      await fits(page);
      await shot(page, "dictation-question");
    }
    // the first word that has a rule error listed: spell it with that error; everything else right
    const ruleError = !erred && Object.keys(item.wrong ?? {})[0];
    if (ruleError) {
      erred = { item, text: ruleError };
      await page.locator(".ruled input").fill(ruleError);
      await page.getByRole("button", { name: "Check", exact: true }).click();
      await page.locator(".feedback").waitFor();
      assert.match(await page.locator(".feedback").innerText(), new RegExp(`The answer is ${word}`));
      assert.equal(await page.getByRole("button", { name: /Try again/ }).count(), 0, "no second try after the answer was shown");
      await shot(page, "dictation-wrong-feedback");
      await page.getByRole("button", { name: "Next" }).click();
      await page.locator(".feedback").waitFor({ state: "detached" });
    } else await type(page, item, true);
    record.push({ item, text: ruleError || word });
  }
  await page.locator(".done").waitFor();
  await shot(page, "dictation-done");
  assert.ok(erred, "a rule error was made");
  const k = record.findIndex((r) => r.item === erred.item);
  assert.ok(k >= 0 && record[k + 1], "a word followed the error");
  assert.equal(record[k + 1].item.step, erred.item.step, "the follow-up is on the same pattern");
  assert.notEqual(record[k + 1].item.id, erred.item.id, "and a different word");

  // the record: dictation answers are independent evidence; the session says how speech was; every word has a reason
  const pupil = (await api(page, "GET", "/pupils/")).json.pupils[0];
  const events = (await api(page, "GET", `/pupils/${pupil.id}/events/?subject=english`)).json.events;
  const session = events.find((e) => e.kind === "session" && e.type === "spelling_assess");
  assert.equal(session.delivery, "device_voice");
  assert.deepEqual(session.speech, { available: true, enabled: true, voice: { name: "Test English (UK)", lang: "en-GB", local: true } });
  const ev = events.filter((e) => e.kind === "evidence" && e.session === session.session);
  assert.equal(ev.length, record.length);
  const traces = events.filter((e) => e.kind === "trace" && e.session === session.session && e.selection?.spelling);
  assert.ok(traces.length >= record.length, "every word has a recorded reason");
  const followUp = traces.find((t) => t.item?.id === record[k + 1].item.id);
  assert.equal(followUp.selection.spelling.rule, "follow_up");
  // the Learner Vector moved (Progress shows a spelling estimate)
  await page.getByRole("button", { name: "Back to today" }).click();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await page.locator(".overview").waitFor();
  await shot(page, "progress-after-dictation");

  // the decision trace in the developer dashboard (when a developer code can be issued here)
  if (CLAIM) {
    const code = execSync(CLAIM, { encoding: "utf8" }).trim().split("\n").at(-1).trim();
    await page.goto(`${URL}/developer`);
    await page.getByLabel("Developer code").fill(code);
    await page.getByRole("button", { name: "Unlock diagnostics" }).click();
    await page.getByRole("button", { name: "Pupils" }).click();
    await page.locator(".dev-list button", { hasText: "Ravi" }).click();
    await page.getByRole("heading", { name: "Ravi" }).waitFor({ timeout: 30000 });
    await page.locator("summary", { hasText: "Decision trace" }).click();
    await page.locator(".dev-timeline details summary").nth(record.length - k - 2).click();
    await page.getByText(/Spelling rule: follow up/).first().waitFor();
    await fits(page);
    await shot(page, "dashboard-follow-up-trace");
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test("without a voice: the check explains why, an adult can read the words (recorded), and no substitute question is asked", async () => {
  const { context, page, errors } = await device({ voice: false });
  await register(page, `novoice.${run}@example.org`, "Tara");
  await placement(page);
  await page.locator(".plan li", { hasText: "Spelling check: hear and spell" }).getByRole("button", { name: "Start" }).click();
  await page.getByText("This device can't say the words aloud.").waitFor();
  assert.equal(await page.getByRole("button", { name: "Start the spelling check" }).count(), 0, "no way to start a silent check");
  await fits(page);
  await shot(page, "intro-no-voice");
  await page.getByRole("button", { name: "An adult will read the words aloud" }).click();
  await page.locator(".item").waitFor();
  const item = items.get(await page.locator(".item").getAttribute("data-item"));
  assert.equal(item.format, "typed:dictation");
  const word = item.answers[0];
  assert.ok(!(await page.locator("main").innerText()).toLowerCase().includes(word), "hidden until the adult asks");
  await shot(page, "adult-reader-hidden");
  await page.getByRole("button", { name: "Show the word to read aloud" }).click();
  assert.match(await page.locator(".adult-reader").innerText(), new RegExp(`Say: ${word}`));
  assert.equal(await page.locator(".ruled input").count(), 0, "the learner cannot type while the word is shown");
  await shot(page, "adult-reader-shown");
  await page.getByRole("button", { name: "Hide it: the learner types now" }).click();
  assert.ok(!(await page.locator("main").innerText()).toLowerCase().includes(word));
  await type(page, item, true);
  const pupil = (await api(page, "GET", "/pupils/")).json.pupils[0];
  const events = (await api(page, "GET", `/pupils/${pupil.id}/events/?subject=english`)).json.events;
  const session = events.find((e) => e.kind === "session" && e.type === "spelling_assess");
  assert.equal(session.delivery, "adult_reader");
  assert.deepEqual(session.speech, { available: false, enabled: true, voice: null });
  assert.deepEqual(errors, []);
  await context.close();
});
