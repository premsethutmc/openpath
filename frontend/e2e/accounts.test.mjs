/**
 * End-to-end with parent accounts: the English app served with its API (Django on PostgreSQL), in a phone-sized
 * browser. The whole workflow, then isolation, authorisation, persistence across devices, historical replay and
 * the mobile layout.
 *
 *   (backend)  DATABASE_URL=… DJANGO_DEBUG=0 OPENPATH_SECURE_COOKIES=0 python manage.py runserver 127.0.0.1:8000
 *   (frontend) npm run english:build && PORT=4175 API_TARGET=http://127.0.0.1:8000 npm run english:preview
 *   E2E_URL=http://127.0.0.1:4175 E2E_SHOTS=out/ux-screens npm run english:e2e-accounts
 *
 * Synthetic answers: software behaviour, not educational effectiveness.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { evidenceLine } from "../../packages/english-core/src/development.ts";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4175";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const CONTENT = new globalThis.URL("../../content/english/", import.meta.url);
const items = new Map(
  ["items/code-items.json", "items/e2a-items.json", "items/e2b-items.json", "spelling/generated-items.json", "pilot/items.json", "spelling/dictation-bank.json"].flatMap((f) => ((j) => (Array.isArray(j) ? j : j.items))(JSON.parse(readFileSync(new globalThis.URL(f, CONTENT), "utf8"))).map((i) => [i.id, i])),
);
const PASSWORD = "a-long-family-passphrase";
const run = Date.now().toString(36);
const PARENT = `asha.${run}@example.org`;
const OTHER = `ravi.${run}@example.org`;

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
let shotN = 0;
/** A full-page screenshot; the sticky bottom navigation is drawn at the end of the page, where it sits after scrolling. */
const shot = async (page, name) => {
  if (!SHOTS) return;
  await page.evaluate(() => document.querySelector(".nav")?.style.setProperty("position", "static"));
  await page.screenshot({ path: `${SHOTS}/${String(++shotN).padStart(2, "0")}-${name}.png`, fullPage: true });
  await page.evaluate(() => document.querySelector(".nav")?.style.removeProperty("position"));
};

async function device() {
  const context = await browser.newContext(PHONE);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // refusals the tests provoke on purpose (validation 400, signed-out 403, other parent 404, stale 409) are logged by
  // the browser as failed loads; anything else is a real error
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource: the server responded with a status of (400|403|404|409)/.test(m.text()) && errors.push(m.text()));
  return { context, page, errors };
}

async function fits(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w, `page is ${sw}px wide on a ${w}px screen`);
}
async function tappable(page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((b) => !b.classList.contains("link") && b.offsetParent !== null)
      .map((b) => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height }))
      .filter((b) => b.h < 40),
  );
  assert.deepEqual(small, [], "buttons are at least about 44 px tall");
}

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


/** The spelling check (dictation) starts with a sound check: start it with the device's voice, or with an adult reading. */
async function startSpellingIfAsked(page) {
  if (!(await page.locator(".spelling-intro").count())) return false;
  const own = page.getByRole("button", { name: "Start the spelling check" });
  if (await own.count()) await own.click();
  else await page.getByRole("button", { name: "An adult will read the words aloud" }).click();
  await page.locator(".spelling-intro").waitFor({ state: "detached" });
  return true;
}
async function finishSession(page, right = () => true, onFirst) {
  const asked = [];
  for (let n = 0; n < 40; n++) {
    await page.locator(".item, .lesson, .done, .spelling-intro").first().waitFor({ timeout: 10000 });
    if (await startSpellingIfAsked(page)) continue;
    if (await page.locator(".done").count()) return asked;
    if (await page.locator(".lesson").count()) {
      if (onFirst) await onFirst("lesson");
      await page.locator(".check .option").first().click();
      await page.getByRole("button", { name: "Start practising" }).click();
      await page.locator(".lesson").waitFor({ state: "detached" });
      continue;
    }
    asked.push(await answer(page, right(n)));
    if (asked.length === 1 && onFirst) await onFirst("feedback");
    await page.getByRole("button", { name: "Next" }).click();
    await page.locator(".feedback").waitFor({ state: "detached" });
  }
  throw new Error("the session did not end");
}

/** Calls the API from the page, as the signed-in browser (cookie and CSRF token). */
const api = (page, method, path, body) =>
  page.evaluate(
    async ({ method, path, body }) => {
      const token = (document.cookie.match(/(?:^|; )csrftoken=([^;]*)/) ?? [])[1] ?? "";
      const r = await fetch(`/api${path}`, { method, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(token) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, json: r.status === 204 ? null : await r.json().catch(() => null) };
    },
    { method, path, body },
  );

async function signIn(page, email) {
  await page.goto(URL);
  await page.getByRole("button", { name: "I have a parent account" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
}

async function addLearner(page, name, goal = /Understand grammar/) {
  await page.getByRole("button", { name: "Add a learner" }).click();
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: /School learner/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: goal }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator(".plan li").first().waitFor();
}

const progressText = async (page) => {
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await page.locator(".overview").waitFor();
  return (await page.locator("main").innerText()).replace(/\d{4}-\d\d-\d\d/g, "DATE");
};

let arunId = null;
let arunProgress = null;

test("the whole workflow: register, add Arun, assessment, evidence, plan, lesson, progress, sign out and back in", async () => {
  const { context, page, errors } = await device();
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).waitFor();
  await shot(page, "welcome");
  await fits(page);
  await tappable(page);
  // the parent registers
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByRole("heading", { name: "Create your parent account" }).waitFor();
  await page.getByLabel("Email", { exact: true }).fill(PARENT);
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByText(/Tick the box/).waitFor();
  await page.locator("#account-consent").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByText(/too short/i).waitFor(); // Django's password validation, shown on the field
  await shot(page, "register-validation");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
  await shot(page, "pupils-empty");
  // … creates Arun
  await page.getByRole("button", { name: "Add a learner" }).click();
  await page.getByLabel(/Name to show/).fill("Arun");
  await page.getByRole("button", { name: /School learner/ }).click();
  await shot(page, "who-is-learning");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Understand grammar/ }).click();
  await page.locator("#consent").check();
  await shot(page, "goal");
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator(".plan li").first().waitFor();
  await shot(page, "check-intro");
  arunId = (await api(page, "GET", "/pupils/")).json.pupils.find((p) => p.display_name === "Arun").id;
  // … Arun completes the first assessment
  await page.locator(".plan li").getByRole("button", { name: "Start" }).first().click();
  await page.locator(".item").waitFor();
  await shot(page, "assessment-question");
  await fits(page);
  // mostly wrong, so that after the spelling check (all wrong) the plan teaches a spelling pattern
  const placement = await finishSession(page, (n) => n % 3 === 0, async (what) => {
    if (what === "feedback") await shot(page, "assessment-feedback");
  });
  assert.ok(placement.length >= 12 && placement.length <= 24, `${placement.length} questions`);
  await page.getByText(/Your starting point is set/).waitFor();
  await shot(page, "assessment-done");
  // … his answers are in his event history on the server, as engine evidence with provenance
  const ledger = (await api(page, "GET", `/pupils/${arunId}/events/?subject=english`)).json;
  const evidence = ledger.events.filter((e) => e.kind === "evidence");
  assert.equal(evidence.length, placement.length, "one evidence event per first answer");
  assert.ok(evidence.every((e) => e.provenance?.schema === "provenance@1" && e.provenance.policies.includes("passage@1")));
  assert.equal(ledger.events[0].kind, "profile");
  assert.equal(ledger.events[0].consent.scope, "parent_account");
  assert.ok(ledger.events.some((e) => e.kind === "preferences" && e.goal === "grammar"));
  // … the Learner Vector moved: Progress shows estimates for the skills he answered
  await page.getByRole("button", { name: "Back to today" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  // … Today recommends an activity from the planner
  assert.ok((await page.locator(".plan li").count()) >= 1);
  await shot(page, "home");
  await fits(page);
  await tappable(page);
  await page.locator(".plan li").getByRole("button", { name: "Start" }).first().click(); // the spelling check
  await finishSession(page, () => false);
  await page.getByRole("button", { name: "Back to today" }).click();
  // … Arun completes a lesson (the plan now teaches a spelling pattern)
  await page.locator(".plan li", { hasText: "Spelling:" }).getByRole("button", { name: "Start" }).click();
  await page.locator(".lesson").waitFor();
  await shot(page, "lesson");
  await fits(page);
  await finishSession(page, () => true, async (what) => {
    if (what === "feedback") await shot(page, "practice-feedback");
  });
  await page.locator(".done").waitFor();
  assert.match(await page.locator(".done").innerText(), /Learning, not mastered yet/);
  await shot(page, "lesson-complete");
  await page.getByRole("button", { name: "Back to today" }).click();
  // … progress is displayed
  await page.getByRole("button", { name: "Journey", exact: true }).click();
  await page.locator(".path li").first().waitFor();
  await shot(page, "journey");
  await fits(page);
  arunProgress = await progressText(page);
  assert.match(arunProgress, /Early estimate|Measured/);
  await shot(page, "progress");
  await fits(page);
  await page.getByRole("button", { name: "Me", exact: true }).click();
  await page.getByText(`Signed in as ${PARENT}`).waitFor();
  await shot(page, "me");
  await fits(page);
  await tappable(page);
  // … the parent signs out and back in: all history remains
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("heading", { name: "Welcome back" }).waitFor();
  assert.equal((await api(page, "GET", "/pupils/")).status, 403, "signed out: nothing is readable");
  await page.getByLabel("Email", { exact: true }).fill(PARENT);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await shot(page, "sign-in");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
  await shot(page, "pupils");
  await page.getByRole("button", { name: /Arun/ }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  assert.equal(await progressText(page), arunProgress, "the same progress, rebuilt from the same events");
  assert.deepEqual(errors, []);
  await context.close();
});

test("persistence across devices: another phone signed in to the same account sees Arun's whole history", async () => {
  assert.ok(arunProgress, "runs after the workflow");
  const { context, page, errors } = await device();
  await signIn(page, PARENT);
  await page.getByRole("button", { name: /Arun/ }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  assert.equal(await progressText(page), arunProgress);
  assert.deepEqual(errors, []);
  await context.close();
});

test("two pupils of one parent keep separate records, and switching between them is clean", async () => {
  const { context, page, errors } = await device();
  await signIn(page, PARENT);
  await addLearner(page, "Meera", /Get better at spelling/);
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await page.getByText("No answers yet", { exact: true }).waitFor();
  const pupils = (await api(page, "GET", "/pupils/")).json.pupils;
  assert.deepEqual(pupils.map((p) => p.display_name), ["Arun", "Meera"]);
  const meera = pupils.find((p) => p.display_name === "Meera");
  assert.ok(!(await api(page, "GET", `/pupils/${meera.id}/events/`)).json.events.some((e) => e.kind === "evidence"), "Meera has no answers of Arun's");
  await page.getByRole("button", { name: "Me", exact: true }).click();
  await page.getByRole("button", { name: "Switch learner" }).click();
  await page.getByRole("button", { name: /Arun/ }).click();
  assert.equal(await progressText(page), arunProgress, "Arun's record is untouched");
  assert.deepEqual(errors, []);
  await context.close();
});

test("authorisation: another parent cannot see, read or change Arun's record", async () => {
  const { context, page, errors } = await device();
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel("Email", { exact: true }).fill(OTHER);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.locator("#account-consent").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
  assert.equal(await page.getByText("Arun").count(), 0);
  assert.equal((await api(page, "GET", `/pupils/${arunId}/events/`)).status, 404);
  assert.equal((await api(page, "POST", `/pupils/${arunId}/events/`, { subject: "english", seq: 0, event: { kind: "flag", id: "x", at: new Date().toISOString() } })).status, 404);
  assert.equal((await api(page, "DELETE", `/pupils/${arunId}/`)).status, 404);
  // a change without the CSRF token is refused even when signed in
  const raw = await page.evaluate(async () => (await fetch("/api/pupils/", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: "X", consent: true }) })).status);
  assert.equal(raw, 403);
  assert.deepEqual(errors, []);
  await context.close();
});

test("historical replay: a device record made by the PR #24 app, imported into an account, opens with its results", async () => {
  const history = JSON.parse(readFileSync(new globalThis.URL("../src/english/logic/fixtures/history-pr24.json", import.meta.url), "utf8"));
  const { context, page, errors } = await device();
  await signIn(page, OTHER);
  const pupil = (await api(page, "POST", "/pupils/", { display_name: "History", consent: true })).json;
  assert.equal((await api(page, "PUT", `/pupils/${pupil.id}/events/`, { subject: "english", events: history.events })).status, 201);
  assert.equal((await api(page, "PUT", `/pupils/${pupil.id}/events/`, { subject: "english", events: history.events.slice(0, 2) })).status, 409, "history is never overwritten");
  const back = (await api(page, "GET", `/pupils/${pupil.id}/events/`)).json.events;
  assert.deepEqual(back, history.events, "stored and returned exactly");
  // the app's clock at the record's own "now" (the test-only offset), so the later-check schedule lines up
  await page.evaluate((d) => localStorage.setItem("openpath-english-clock-offset-days", String(d)), Math.max(0, Math.ceil((Date.parse(history.now) - Date.now()) / 86_400_000)));
  await page.reload();
  await page.getByRole("button", { name: /History/ }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  const text = await progressText(page);
  // every skill shows exactly the evidence the PR #24 app derived from the same events
  for (const [id, p] of Object.entries(history.profile)) {
    if (p.standing === "not_checked") continue;
    assert.match(await page.locator(`.cap[data-capability="${id}"] .evidence`).innerText(), new RegExp(`Evidence: ${evidenceLine({ evidence: p.evidence }).replace(/[()]/g, "\\$&")}`), id);
  }
  await page.evaluate(() => localStorage.removeItem("openpath-english-clock-offset-days"));
  assert.ok(text.length > 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test("deleting a pupil, then the account, removes the records from the server", async () => {
  const { context, page } = await device();
  await signIn(page, OTHER);
  const before = (await api(page, "GET", "/pupils/")).json.pupils;
  assert.equal(before.length, 1);
  await page.getByRole("button", { name: /History/ }).click();
  await page.getByRole("button", { name: "Me", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete this learner and their record" }).click();
  await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
  assert.equal((await api(page, "GET", `/pupils/${before[0].id}/events/`)).status, 404);
  await addLearner(page, "Temp");
  await page.getByRole("button", { name: "Me", exact: true }).click();
  await page.getByRole("button", { name: "Delete the account" }).click();
  await page.getByLabel("Your password, to confirm").fill(PASSWORD);
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.getByRole("button", { name: "Let's begin" }).waitFor();
  // the account is gone: signing in fails
  await page.getByRole("button", { name: "I have a parent account" }).click();
  await page.getByLabel("Email", { exact: true }).fill(OTHER);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText(/do not match an account/).waitFor();
  await context.close();
});
