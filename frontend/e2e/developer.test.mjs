/**
 * End-to-end: the founder's /developer diagnostics on a phone, with the real API (Django on PostgreSQL).
 *
 *   (backend)  as for e2e/accounts.test.mjs
 *   E2E_URL=http://127.0.0.1:4175 E2E_CLAIM_CMD="cd ../backend && python manage.py developer issue-claim" \
 *     E2E_SHOTS=out/developer-screens node --test e2e/developer.test.mjs
 *
 * E2E_CLAIM_CMD prints a fresh one-time developer code (as the Codespace log does). Synthetic identities only.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4175";
const CLAIM = process.env.E2E_CLAIM_CMD;
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const CONTENT = new globalThis.URL("../../content/english/", import.meta.url);
const items = new Map(
  ["items/code-items.json", "items/e2a-items.json", "items/e2b-items.json", "spelling/generated-items.json", "pilot/items.json", "spelling/dictation-bank.json"].flatMap((f) => ((j) => (Array.isArray(j) ? j : j.items))(JSON.parse(readFileSync(new globalThis.URL(f, CONTENT), "utf8"))).map((i) => [i.id, i])),
);
const PASSWORD = "a-long-family-passphrase";
const run = Date.now().toString(36);
const FOUNDER = `founder.${run}@example.org`;
const RAVI = `ravi.${run}@example.org`;
const NOSY = `nosy.${run}@example.org`;
const code = () => execSync(CLAIM, { encoding: "utf8" }).trim().split("\n").at(-1).trim();

let browser;
before(async () => {
  assert.ok(CLAIM, "set E2E_CLAIM_CMD to a command that prints a developer code");
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
let shotN = 0;
const shot = async (page, name) => {
  if (!SHOTS) return;
  await page.evaluate(() => document.querySelector(".nav, .dev-nav")?.style.setProperty("position", "static"));
  await page.screenshot({ path: `${SHOTS}/${String(++shotN).padStart(2, "0")}-${name}.png`, fullPage: true });
  await page.evaluate(() => document.querySelector(".nav, .dev-nav")?.style.removeProperty("position"));
};

async function device() {
  const context = await browser.newContext({ ...PHONE, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource: the server responded with a status of (400|403|404)/.test(m.text()) && errors.push(m.text()));
  return { context, page, errors };
}

async function fits(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  // a phone browser zooms out to fit a page that is too wide, so compare with the phone's own width too
  assert.ok(sw <= w && w <= PHONE.viewport.width, `page is ${sw}px wide (layout ${w}px) on a ${PHONE.viewport.width}px screen`);
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
async function finishSession(page, right = () => true) {
  for (let n = 0; n < 40; n++) {
    await page.locator(".item, .lesson, .done, .spelling-intro").first().waitFor({ timeout: 10000 });
    if (await startSpellingIfAsked(page)) continue;
    if (await page.locator(".done").count()) return;
    if (await page.locator(".lesson").count()) {
      await page.locator(".check .option").first().click();
      await page.getByRole("button", { name: "Start practising" }).click();
      await page.locator(".lesson").waitFor({ state: "detached" });
      continue;
    }
    await answer(page, right(n));
    await page.getByRole("button", { name: "Next" }).click();
    await page.locator(".feedback").waitFor({ state: "detached" });
  }
  throw new Error("the session did not end");
}

async function register(page, email) {
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.locator("#account-consent").check();
  await page.getByRole("button", { name: "Create account" }).click();
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
  await page.getByRole("button", { name: "I'm ready" }).waitFor();
}

async function homeAfterSession(page) {
  await page.getByRole("button", { name: /Back to|Home|Done|Carry on/ }).first().click();
}

test("an ordinary parent who finds /developer gets nothing: a code is needed, and the API refuses", async () => {
  const { context, page, errors } = await device();
  await register(page, NOSY);
  await page.goto(`${URL}/developer`);
  await page.getByRole("heading", { name: "Developer access" }).waitFor();
  await fits(page);
  await shot(page, "claim-needed");
  for (const path of ["/developer/overview/", "/developer/pupils/", "/developer/audit/"]) assert.equal((await api(page, "GET", path)).status, 403, path);
  await page.getByLabel("Developer code").fill("AAAA-BBBB-CCCC");
  await page.getByRole("button", { name: "Unlock diagnostics" }).click();
  await page.getByText(/not valid/).waitFor();
  assert.equal((await api(page, "GET", "/developer/overview/")).status, 403);
  assert.deepEqual(errors, []);
  await context.close();
});

test("the founder: Arun's assessment, a developer code, then everything the engine knows about Arun, and a redacted report", async () => {
  // a second family whose child is not shared
  const ravi = await device();
  await register(ravi.page, RAVI);
  await addLearner(ravi.page, "Meera");

  const { context, page, errors } = await device();
  await register(page, FOUNDER);
  await addLearner(page, "Arun");
  await page.getByRole("button", { name: "I'm ready" }).click();
  await finishSession(page, (n) => n % 3 !== 2);
  await page.getByText(/Your starting point is set/).waitFor();

  // the code from the Codespace log
  await page.goto(`${URL}/developer`);
  await page.getByRole("heading", { name: "Developer access" }).waitFor();
  await page.getByLabel("Developer code").fill(code().toLowerCase());
  await page.getByRole("button", { name: "Unlock diagnostics" }).click();
  await page.getByRole("heading", { name: "Application health" }).waitFor();
  await page.locator(".dev-stat").first().waitFor();
  await fits(page);
  await shot(page, "health");
  const health = await page.locator(".dev-main").innerText();
  assert.match(health, /answer_ms|save_ms|rebuild_ms/, "the app's own measurements arrived");
  assert.ok(!health.includes("@example.org") && !health.includes("Arun"), "no emails or names on the health page");

  // pupils: Arun only (Meera is not shared)
  await page.getByRole("button", { name: "Pupils" }).click();
  await page.getByRole("heading", { name: "Test pupils" }).waitFor();
  const meeraId = (await api(ravi.page, "GET", "/pupils/")).json.pupils[0].id;
  const listed = (await api(page, "GET", "/developer/pupils/")).json.pupils;
  assert.deepEqual(listed.filter((p) => p.own).map((p) => p.display_name), ["Arun"]);
  assert.ok(!listed.some((p) => p.id === meeraId), "another family's unshared child is not listed");
  await shot(page, "pupils");
  await page.locator(".dev-list button", { hasText: "this account" }).click();
  await page.getByRole("heading", { name: "Arun" }).waitFor({ timeout: 30000 });
  await fits(page);
  await shot(page, "arun-summary");
  const traced = await page.locator(".dev-stat", { hasText: "Decisions traced" }).locator("b").innerText();
  const [t, q] = traced.split("/").map(Number);
  assert.ok(q >= 12 && t === q, `every question traced (${traced})`);
  // the decision trace: open the latest question
  await page.locator("summary", { hasText: "Decision trace" }).click();
  await page.locator(".dev-timeline details summary").first().click();
  await page.getByText(/Knew:/).first().waitFor();
  await page.getByText(/Effect:/).first().waitFor();
  await shot(page, "arun-decision-trace");

  // the report: redacted by default, copied to the clipboard
  await page.getByRole("button", { name: "Generate Diagnostic Report" }).click();
  await page.getByRole("button", { name: "Copy Report" }).click();
  await page.getByText(/Copied/).waitFor();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copied, /OPENPATH LEARNER DIAGNOSTIC — Pupil A/);
  assert.match(copied, /--- JSON ---/);
  for (const secret of ["Arun", "@example.org", PASSWORD, "csrftoken", "sessionid"]) assert.ok(!copied.includes(secret), secret);
  const json = JSON.parse(copied.split("--- JSON ---\n")[1]);
  assert.equal(json.redacted, true);
  assert.equal(json.read_only, true);
  assert.ok(json.versions.server_commit && json.versions.app_build);
  assert.equal(json.tracing.traced, json.tracing.questions);
  await shot(page, "arun-report");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  assert.match((await download).suggestedFilename(), /^openpath-diagnostic-pupil-a-\d{4}-\d\d-\d\d\.json$/);

  // the record is unchanged by all of this
  const arun = (await api(page, "GET", "/pupils/")).json.pupils.find((p) => p.display_name === "Arun");
  const events = (await api(page, "GET", `/pupils/${arun.id}/events/?subject=english`)).json.events.length;
  await page.reload();
  await page.getByRole("button", { name: "Pupils" }).click();
  await page.locator(".dev-list button", { hasText: "this account" }).click();
  await page.getByRole("heading", { name: "Arun" }).waitFor({ timeout: 30000 });
  assert.equal((await api(page, "GET", `/pupils/${arun.id}/events/?subject=english`)).json.events.length, events, "diagnostics wrote nothing");

  // Ravi shares Meera from Me; now (and only now) the founder can see her
  const meera = { id: meeraId };
  assert.equal((await api(page, "GET", `/developer/pupils/${meera.id}/events/`)).status, 404);
  await ravi.page.getByRole("button", { name: "Look around first" }).click();
  await ravi.page.getByRole("button", { name: "Me", exact: true }).click();
  await ravi.page.getByLabel(/Share Meera's record for diagnostics/).check();
  await ravi.page.waitForFunction(() => document.querySelector("#diag-title"));
  await shot(ravi.page, "parent-share-toggle");
  await ravi.page.waitForTimeout(300);
  assert.equal((await api(page, "GET", `/developer/pupils/${meera.id}/events/`)).status, 200);
  await ravi.page.getByLabel(/Share Meera's record for diagnostics/).uncheck();
  await ravi.page.waitForTimeout(300);
  assert.equal((await api(page, "GET", `/developer/pupils/${meera.id}/events/`)).status, 404);
  // developer access never opens the parent API to another family
  assert.equal((await api(page, "GET", `/pupils/${meera.id}/events/?subject=english`)).status, 404);

  // the bank and the audit log
  await page.getByRole("button", { name: "Question bank" }).click();
  await page.getByRole("heading", { name: "Question bank coverage" }).waitFor();
  await shot(page, "question-bank");
  await page.getByRole("button", { name: "Audit log" }).click();
  await page.getByRole("heading", { name: "Your audit log" }).waitFor();
  const audit = await page.locator(".dev-main").innerText();
  assert.match(audit, /claim_granted/);
  assert.match(audit, /pupil_events/);
  await shot(page, "audit");
  await fits(page);
  assert.deepEqual(errors, []);
  assert.deepEqual(ravi.errors, []);
  await ravi.context.close();
  await context.close();
});

test("/developer never hangs: an older API, a dropped or stalled request and an ended session each give a message and Retry", async () => {
  const { context, page, errors } = await device();
  await register(page, `retry.${run}@example.org`);
  // through the app's own origin (the preview proxy), with the signed-in session cookie
  const account = await api(page, "GET", "/account/");
  assert.equal(account.status, 200);
  assert.equal(account.json.authenticated, true);
  const status = await api(page, "GET", "/developer/status/");
  assert.equal(status.status, 200);
  assert.equal(status.json.developer, false);
  assert.match(status.json.commit, /^[0-9a-f]{7,40}$|^unknown$/);

  const STATUS = "**/api/developer/status/";
  // 1. the API behind the app is older code without the developer routes (Django's HTML 404)
  await page.route(STATUS, (r) => r.fulfill({ status: 404, contentType: "text/html", body: "<h1>Not Found</h1>" }));
  await page.goto(`${URL}/developer`);
  await page.getByRole("heading", { name: "The API server is older than this page" }).waitFor({ timeout: 20000 });
  await page.getByText("developer status: HTTP 404 (/developer/status/)").waitFor();
  await fits(page);
  await shot(page, "error-old-api");
  // 2. the request is dropped
  await page.unroute(STATUS);
  await page.route(STATUS, (r) => r.abort("connectionreset"));
  await page.getByRole("button", { name: "Retry" }).click();
  await page.getByRole("heading", { name: "OpenPath's server can't be reached" }).waitFor({ timeout: 20000 });
  // 3. the request never answers: given up at the time limit (15 s)
  await page.unroute(STATUS);
  await page.route(STATUS, () => undefined); // never fulfilled
  await page.getByRole("button", { name: "Retry" }).click();
  await page.getByText("Checking access…").waitFor();
  await page.getByRole("heading", { name: "The server did not answer" }).waitFor({ timeout: 25000 });
  await shot(page, "error-timeout");
  // 4. the session ended
  await page.unroute(STATUS);
  await page.route(STATUS, (r) => r.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ detail: "Authentication credentials were not provided." }) }));
  await page.getByRole("button", { name: "Retry" }).click();
  await page.getByRole("heading", { name: "Sign in" }).waitFor({ timeout: 20000 });
  // 5. everything answers again: the real API, after a reload
  await page.unroute(STATUS);
  await page.reload();
  await page.getByRole("heading", { name: "Developer access" }).waitFor({ timeout: 20000 });
  assert.deepEqual(errors.filter((e) => !/net::ERR|status of (404|403)|Failed to fetch|aborted/i.test(e)), [], "no uncaught errors");
  await context.close();
});
