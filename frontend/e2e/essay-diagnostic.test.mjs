/**
 * End-to-end: the essay-to-diagnostic workflow in the essay studio (?experience=essay-live&evaluator=server), in a
 * real browser at phone size, against the production build, with a MOCKED model (deterministic; no paid call).
 *
 * Two stacks run the same test:
 *   mocked server   node e2e/lib/essay-model-mock.mjs gateway 8790 &
 *                   PORT=4192 API_TARGET=http://127.0.0.1:8790 npm run english:preview &
 *                   ESSAY_DIAG_URL=http://127.0.0.1:4192 ESSAY_MOCK_URL=http://127.0.0.1:8790 npm run essay:e2e-diagnostic
 *   real server     Django's gateway with OPENPATH_ESSAY_EVALUATOR=llm and OPENPATH_LLM_BASE_URL pointing at
 *                   `node e2e/lib/essay-model-mock.mjs provider 8791`; set E2E_CLAIM_CMD (a developer code) and
 *                   ESSAY_MOCK_URL=http://127.0.0.1:8791 (see .github/workflows/ci.yml)
 *
 * Karthik's synthetic Grade 8 essay about the Chithirai Festival in Madurai → suspected competencies with quotes →
 * five fresh questions on plurals (answers never shown while answering) → results, provisional profile, next
 * activity → learning path → reload → second essay informed by the first.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { FIXTURE } from "./lib/essay-model-mock.mjs";

const BASE = process.env.ESSAY_DIAG_URL ?? "http://127.0.0.1:4192";
const MOCK = process.env.ESSAY_MOCK_URL ?? "http://127.0.0.1:8790";
const CLAIM = process.env.E2E_CLAIM_CMD;
const SHOTS = process.env.ESSAY_DIAG_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const URL = `${BASE}/?experience=essay-live&evaluator=server&no-sw`;
const PLU = "EN.GRM.NOUN.plurals_countability";
const SVA = "EN.GRM.VERB.sva";

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

let shotN = 0;
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${String(++shotN).padStart(2, "0")}-${name}.png`, fullPage: true });
const fits = async (page) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no sideways scrolling");

async function signInAsDeveloper(page) {
  const run = Date.now().toString(36);
  await page.goto(BASE);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel("Email", { exact: true }).fill(`essay.dev.${run}@example.org`);
  await page.getByLabel("Password", { exact: true }).fill("a-long-family-passphrase");
  await page.locator("#account-consent").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "Who is learning today?" }).waitFor();
  const code = execSync(CLAIM, { encoding: "utf8" }).trim().split("\n").at(-1).trim();
  const r = await page.evaluate(async (code) => {
    const token = (document.cookie.match(/(?:^|; )csrftoken=([^;]*)/) ?? [])[1] ?? "";
    const res = await fetch("/api/developer/claim/", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(token) }, body: JSON.stringify({ code }) });
    return res.status;
  }, code);
  assert.equal(r, 200, "developer code accepted");
}

/** Answer the generated question on screen from the fixture (the test knows the mocked model's keys; the page never shows them). */
async function answerGenerated(page, round, right) {
  const el = page.locator(".item");
  const id = await el.getAttribute("data-item");
  const k = Number(id.split(".").at(-1)) - 1;
  const q = round[k];
  assert.ok(q, `no fixture question for ${id}`);
  const text = await page.locator("#essay-main").innerText();
  assert.ok(!text.includes(q.explanation), "the explanation is not shown before answering");
  assert.ok(!/answer:/i.test(text), "no answer is shown before all five are answered");
  if (q.format === "typed") await page.locator(".ruled input").fill(right ? q.answers[0] : Object.keys(q.misconceptions ?? {})[0] ?? "zzzq");
  else await page.locator(".answer .option").nth(right ? q.answer : (q.answer + 1) % q.options.length).click();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.waitForFunction((x) => !document.querySelector(`.item[data-item="${x}"]`), id);
  return id;
}

async function writeAndAnalyse(page, essay) {
  await page.getByLabel("Essay", { exact: true }).fill(essay.text);
  await page.getByRole("button", { name: "Analyse this essay" }).click();
  await page.getByRole("heading", { name: "What your essay shows" }).waitFor();
}

test("ESSAY-DIAG Karthik's essay → dashboard with quotes → five fresh questions → profile → next activity → reload → second essay", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource: the server responded with a status of (401|403|404)/.test(m.text()) && errors.push(m.text()));
  await fetch(`${MOCK}/__mock/reset`, { method: "POST" });
  if (CLAIM) await signInAsDeveloper(page);

  // 1. an arbitrary typed essay in the existing studio, analysed by the server-side evaluator (mocked model)
  await page.goto(URL);
  await page.locator('[data-essay-mode=live][data-stage="write"]').waitFor();
  assert.match(await page.locator(".essay-demo-banner").innerText(), /fresh questions/, "the server's evaluator is connected and can write questions");
  await writeAndAnalyse(page, FIXTURE.essays.karthik);
  assert.match(await page.getByTestId("analysed-by").innerText(), /AI model on OpenPath's server/);

  // 2–3. the competency dashboard with its quotations
  const plural = page.locator(`[data-competency="${PLU}"]`);
  assert.equal(await plural.getAttribute("data-errors"), "6");
  assert.equal(await plural.locator("[data-gap]").getAttribute("data-gap"), "suspected");
  for (const q of ["thousands of peoples", "Many womans", "the childrens", "two box of jasmine"]) assert.equal(await plural.locator(`[data-quote="${q}"]`).count(), 1, q);
  assert.equal(await page.locator(`[data-competency="${SVA}"] [data-gap]`).getAttribute("data-gap"), "suspected");
  assert.equal(await page.locator("[data-recommendation]").getAttribute("data-recommendation"), "check_skill");
  await fits(page);
  await shot(page, "dashboard");

  // 4–5. choose plurals: five fresh questions, answered without seeing any answer
  await plural.locator(`[data-generate="${PLU}"]`).click();
  await page.locator(`[data-diagnostic="${PLU}"][data-source="generated"]`).waitFor();
  assert.match(await page.locator(".essay-diagnostic .kicker").innerText(), /question 1 of 5/i);
  await shot(page, "generated-question");
  const round1 = FIXTURE.questions[PLU][0];
  const first = [];
  for (let k = 0; k < 5; k++) {
    first.push(await answerGenerated(page, round1, k >= 3));
    if (k < 4) await page.locator("[data-recorded]").waitFor();
  }
  // 6. evaluated, recorded, and the provisional profile updated; the answers are revealed only now
  const results = page.locator(`[data-results="${PLU}"]`);
  await results.waitFor();
  assert.equal(await results.getAttribute("data-outcome-generated"), "confirmed");
  assert.deepEqual(await results.locator("[data-result-item]").evaluateAll((els) => els.map((e) => e.dataset.correct)), ["false", "false", "false", "true", "true"]);
  assert.match(await results.innerText(), /answer: women/);
  // 7. the next activity
  const rec = page.locator("[data-recommendation]");
  assert.equal(await rec.getAttribute("data-recommendation"), "learn");
  await fits(page);
  await shot(page, "results-and-next");
  await rec.getByRole("button", { name: "Start learning" }).click();
  await page.locator(`[data-tree="${PLU}"]`).waitFor();
  assert.equal(await page.locator("[data-tree]").first().getAttribute("data-tree"), PLU, "the confirmed gap comes first");
  assert.equal(await page.locator(`[data-tree="${PLU}"] [data-step="teach"]`).getAttribute("data-status"), "pending");
  await shot(page, "path");

  const profileRows = async () => {
    await page.getByRole("button", { name: "Profile", exact: true }).click();
    await page.getByRole("heading", { name: "Your writing profile" }).waitFor();
    return page.locator(`[data-profile="${PLU}"]`);
  };
  let row = await profileRows();
  assert.equal(await row.locator("[data-profile-gap]").getAttribute("data-profile-gap"), "confirmed");
  assert.equal(await row.locator("[data-held]").getAttribute("data-held"), "5");
  assert.notEqual(await row.getAttribute("data-state"), "verified");
  const before = await page.locator("[data-profile]").evaluateAll((els) => els.map((e) => `${e.dataset.profile}:${e.dataset.state}`));

  // 8. reload: the profile is read back from the learner's record on this device
  await page.reload();
  await page.locator("[data-essay-mode=live]:not([data-stage=loading])").waitFor();
  row = await profileRows();
  assert.deepEqual(await page.locator("[data-profile]").evaluateAll((els) => els.map((e) => `${e.dataset.profile}:${e.dataset.state}`)), before);
  assert.equal(await row.locator("[data-held]").getAttribute("data-held"), "5");
  assert.equal(await row.locator("[data-profile-gap]").getAttribute("data-profile-gap"), "confirmed");

  // 9. a second essay: the earlier evidence informs the new journey
  await page.getByRole("button", { name: "Write another essay" }).click();
  assert.match(await page.getByTestId("essay-count").innerText(), /1 essay so far/);
  await writeAndAnalyse(page, FIXTURE.essays.second);
  const plural2 = page.locator(`[data-competency="${PLU}"]`);
  assert.equal(await plural2.locator("[data-gap]").getAttribute("data-gap"), "suspected", "one error, suspected because of the earlier essay");
  assert.match(await plural2.innerText(), /also seen in 1 earlier essay/);
  assert.match(await page.locator("[data-recommendation] [data-history]").innerText(), /essay:1: confirmed/);
  await shot(page, "second-dashboard");
  await plural2.locator(`[data-generate="${PLU}"]`).click();
  await page.locator(`[data-diagnostic="${PLU}"][data-source="generated"]`).waitFor();
  const round2 = FIXTURE.questions[PLU][1];
  for (let k = 0; k < 5; k++) {
    const id = await answerGenerated(page, round2, true);
    assert.ok(!first.includes(id), "no question is asked twice");
  }
  const results2 = page.locator(`[data-results="${PLU}"][data-outcome-generated="weakened"]`);
  await results2.waitFor();
  assert.match(await results2.innerText(), /answer: sheep/);
  assert.equal(await page.locator("[data-recommendation]").getAttribute("data-recommendation"), "write_again");
  row = await profileRows();
  assert.equal(await row.locator("[data-held]").getAttribute("data-held"), "10", "both rounds kept, all held");
  assert.notEqual(await row.getAttribute("data-state"), "verified");
  await fits(page);
  await shot(page, "second-profile");

  // what reached the (mocked) model: the server's tasks, synthetic only
  const calls = await (await fetch(`${MOCK}/__mock/calls`)).json();
  assert.deepEqual(calls.map((c) => c.task), ["observe", "questions", "observe", "questions"]);
  if (!CLAIM) assert.ok(calls.every((c) => c.data_use === "synthetic_test"));
  else assert.ok(calls.every((c) => c.key === "present"), "the server holds the key; the browser never calls the provider");
  assert.deepEqual(errors, []);
  await context.close();
});
