/**
 * End-to-end: the two-track essay workflow in the essay studio (?experience=essay-live&evaluator=server), in a
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
 * Karthik's synthetic Grade 8 essay about the Chithirai Festival in Madurai → suspected plural errors with quotes →
 * FORMAL check on bank questions (confirms the gap) → PRACTICE on five fresh model-written questions (answers never
 * shown while answering; formative only) → lesson and guided practice → independent recheck blocked by missing
 * reviewed content, said so → profile labels match the evidence → reload → second essay informed by the first.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { FIXTURE } from "./lib/essay-model-mock.mjs";

const CONTENT = new globalThis.URL("../../content/english/", import.meta.url);
const BANK = new Map(
  ["items/code-items.json", "items/e2a-items.json", "items/e2b-items.json", "pilot/items.json"].flatMap((f) => ((j) => (Array.isArray(j) ? j : j.items))(JSON.parse(readFileSync(new globalThis.URL(f, CONTENT), "utf8"))).map((i) => [i.id, i])),
);

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

/** Answer the bank question on screen with its key (or a wrong option), as the existing studio test does. */
async function answerBank(page, right) {
  const id = await page.locator(".item").getAttribute("data-item");
  const item = BANK.get(id);
  assert.ok(item, `not a bank question: ${id}`);
  const kind = item.format.split(":")[0];
  const opts = page.locator(".answer .option");
  if (kind === "typed") await page.locator(".ruled input").fill(right ? item.answers[0] : Object.keys(item.wrong ?? {})[0] ?? "zzzq");
  else if (kind === "choice") await opts.nth(right ? item.answer : (item.answer + 1) % item.options.length).click();
  else if (kind === "multi") for (const i of right ? item.answer_set : [0]) await opts.nth(i).click();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.waitForFunction((x) => !document.querySelector(`.item[data-item="${x}"]`), id);
  return id;
}

async function writeAndAnalyse(page, essay) {
  await page.getByLabel("Essay", { exact: true }).fill(essay.text);
  await page.getByRole("button", { name: "Analyse this essay" }).click();
  await page.getByRole("heading", { name: "What your essay shows" }).waitFor();
}

test("ESSAY-DIAG two tracks: dashboard → bank check → model practice → lesson and practice → recheck unavailable → profile → reload → second essay", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource: the server responded with a status of (401|403|404)/.test(m.text()) && errors.push(m.text()));
  await fetch(`${MOCK}/__mock/reset`, { method: "POST" });
  if (CLAIM) await signInAsDeveloper(page);

  // essay, analysed by the server-side evaluator (mocked model)
  await page.goto(URL);
  await page.locator('[data-essay-mode=live][data-stage="write"]').waitFor();
  assert.match(await page.locator(".essay-demo-banner").innerText(), /fresh questions/);
  await writeAndAnalyse(page, FIXTURE.essays.karthik);
  assert.match(await page.getByTestId("analysed-by").innerText(), /AI model on OpenPath's server/);

  // dashboard: suspected plural errors with quotes; the formal track is recommended; verification stated as unavailable
  const plural = page.locator(`[data-competency="${PLU}"]`);
  assert.equal(await plural.getAttribute("data-errors"), "6");
  assert.equal(await plural.locator("[data-status]").getAttribute("data-status"), "suspected");
  for (const q of ["thousands of peoples", "Many womans", "the childrens", "two box of jasmine"]) assert.equal(await plural.locator(`[data-quote="${q}"]`).count(), 1, q);
  assert.equal(await page.locator(`[data-competency="${SVA}"] [data-status]`).getAttribute("data-status"), "suspected");
  const rec = page.locator("[data-recommendation]");
  assert.equal(await rec.getAttribute("data-recommendation"), "check_skill");
  assert.match(await rec.locator('[data-verification="unavailable"]').innerText(), /Mastery verification is not available for Plurals and countability/);
  await fits(page);
  await shot(page, "dashboard");

  // formal track: an independent diagnostic on bank questions (wrong answers confirm the gap)
  await plural.locator(`[data-check="${PLU}"]`).click();
  await page.locator(`[data-diagnostic="${PLU}"][data-source="bank"]`).waitFor();
  for (let guard = 0; guard < 5 && (await page.locator("[data-diagnostic]").count()); guard++) assert.match(await answerBank(page, false), /^grm\.plu\./);
  await page.locator('[data-outcome="confirmed"]').waitFor();
  await shot(page, "bank-check");

  // practice track: five fresh model-written questions, no answer shown while answering, formative result
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await plural.locator(`[data-practise="${PLU}"]`).click();
  await page.locator(`[data-practice="${PLU}"]`).waitFor();
  assert.match(await page.locator(".essay-diagnostic .kicker").innerText(), /practice 1 of 5/i);
  await shot(page, "practice-question");
  const round1 = FIXTURE.questions[PLU][0];
  const first = [];
  for (let k = 0; k < 5; k++) {
    first.push(await answerGenerated(page, round1, k >= 3));
    if (k < 4) await page.locator("[data-recorded]").waitFor();
  }
  const results = page.locator(`[data-results="${PLU}"]`);
  await results.waitFor();
  assert.equal(await results.getAttribute("data-formative"), "difficulty");
  assert.match(await results.innerText(), /formative feedback only/);
  assert.deepEqual(await results.locator("[data-result-item]").evaluateAll((els) => els.map((e) => e.dataset.correct)), ["false", "false", "false", "true", "true"]);
  assert.match(await results.innerText(), /answer: women/);
  assert.equal(await rec.getAttribute("data-recommendation"), "learn");
  await fits(page);
  await shot(page, "practice-results");

  // instruction and guided practice from the bank; the independent recheck is blocked and said so
  await rec.getByRole("button", { name: "Start learning" }).click();
  const tree = page.locator(`[data-tree="${PLU}"]`);
  await tree.waitFor();
  assert.equal(await page.locator("[data-tree]").first().getAttribute("data-tree"), PLU);
  assert.match(await tree.locator('[data-verification="unavailable"]').innerText(), /Mastery verification is not available for Plurals and countability yet/);
  for (let guard = 0; guard < 12; guard++) {
    const cur = page.locator("[data-current-step]");
    if (!(await cur.count()) || !(await cur.innerText()).toLowerCase().includes("plurals")) break;
    const kind = await cur.getAttribute("data-current-step");
    if (kind === "teach") {
      await page.locator("input[name=lesson-check]").first().check();
      await page.getByRole("button", { name: "I've read this" }).click();
      await page.waitForFunction(() => document.querySelector("#essay-main")?.getAttribute("aria-busy") === "false" && document.querySelector("[data-current-step]")?.getAttribute("data-current-step") !== "teach");
    } else await answerBank(page, true);
  }
  assert.deepEqual(await tree.locator("[data-step]").evaluateAll((els) => els.map((e) => `${e.dataset.step}:${e.dataset.status}`)), ["teach:done", "guided_practice:done", "independent_check:blocked"]);
  assert.equal(await page.locator(`[data-outcome-for="${PLU}"]`).getAttribute("data-verified"), "false");
  // the lesson programme continues beyond the path's one lesson; progress is learning, never a claim
  const prog = tree.locator(`[data-lesson-programme="${PLU}"]`);
  assert.equal(await prog.getAttribute("data-lessons-done"), "1");
  assert.equal(await prog.getAttribute("data-lessons-total"), "5");
  await prog.locator("[data-next-lesson]").click();
  await page.locator('[data-current-step="programme_lesson"]').waitFor();
  await page.locator("input[name=lesson-check]").first().check();
  await page.getByRole("button", { name: "I've read this" }).click();
  await page.waitForFunction(() => document.querySelector("#essay-main")?.getAttribute("aria-busy") === "false" && !document.querySelector('[data-current-step="programme_lesson"]'));
  assert.equal(await prog.getAttribute("data-lessons-done"), "2");
  assert.match(await prog.innerText(), /2 of 5 completed \(40%\)\. Learning progress only/);
  assert.deepEqual(await tree.locator("[data-step]").evaluateAll((els) => els.map((e) => `${e.dataset.step}:${e.dataset.status}`)), ["teach:done", "guided_practice:done", "independent_check:blocked"], "lessons never change the check");
  await shot(page, "path");

  // the profile says what the evidence is: gap confirmed, an estimate (not mastery), formative practice, held answers
  const profileRow = async () => {
    await page.getByRole("button", { name: "Profile", exact: true }).click();
    await page.getByRole("heading", { name: "Your writing profile" }).waitFor();
    return page.locator(`[data-profile="${PLU}"]`);
  };
  let row = await profileRow();
  assert.equal(await row.locator("[data-status]").getAttribute("data-status"), "confirmed");
  assert.notEqual(await row.locator("[data-estimate]").getAttribute("data-estimate"), "none");
  assert.match(await row.locator("[data-estimate]").innerText(), /an estimate, not mastery/);
  assert.equal(await row.locator("[data-formative]").getAttribute("data-formative"), "difficulty");
  assert.equal(await row.locator("[data-held]").getAttribute("data-held"), "5");
  assert.equal(await row.locator("[data-lessons]").getAttribute("data-lessons"), "40");
  const before = await page.locator("[data-profile]").evaluateAll((els) => els.map((e) => `${e.dataset.profile}:${e.dataset.state}:${e.querySelector("[data-status]")?.dataset.status}`));
  await shot(page, "profile");

  // reload: read back from the learner's record on this device
  await page.reload();
  await page.locator("[data-essay-mode=live]:not([data-stage=loading])").waitFor();
  row = await profileRow();
  assert.deepEqual(await page.locator("[data-profile]").evaluateAll((els) => els.map((e) => `${e.dataset.profile}:${e.dataset.state}:${e.querySelector("[data-status]")?.dataset.status}`)), before);
  assert.equal(await row.locator("[data-held]").getAttribute("data-held"), "5");

  // a second essay: the earlier evidence informs it
  await shot(page, "after-reload");
  await page.getByRole("button", { name: "Write another essay" }).click();
  await writeAndAnalyse(page, FIXTURE.essays.second);
  const plural2 = page.locator(`[data-competency="${PLU}"]`);
  assert.equal(await plural2.locator("[data-gap]").getAttribute("data-gap"), "suspected", "one error, suspected because of the earlier essay");
  assert.match(await plural2.innerText(), /also seen in 1 earlier essay/);
  assert.match(await page.locator("[data-recommendation] [data-history]").innerText(), /essay:1: confirmed/);
  await shot(page, "second-dashboard");
  await plural2.locator(`[data-practise="${PLU}"]`).click();
  await page.locator(`[data-practice="${PLU}"]`).waitFor();
  const round2 = FIXTURE.questions[PLU][1];
  for (let k = 0; k < 5; k++) assert.ok(!first.includes(await answerGenerated(page, round2, true)), "no question is asked twice");
  await page.locator(`[data-results="${PLU}"][data-formative="secure"]`).waitFor();
  assert.equal(await page.locator(`[data-competency="${PLU}"]`).count(), 0, "(results screen)");
  row = await profileRow();
  assert.equal(await row.locator("[data-held]").getAttribute("data-held"), "10", "all practice answers kept, all held");
  assert.notEqual(await row.locator("[data-status]").getAttribute("data-status"), "verified");
  await fits(page);
  await shot(page, "second-profile");

  const calls = await (await fetch(`${MOCK}/__mock/calls`)).json();
  assert.deepEqual(calls.map((c) => c.task), ["observe", "questions", "observe", "questions"]);
  if (!CLAIM) assert.ok(calls.every((c) => c.data_use === "synthetic_test"));
  else assert.ok(calls.every((c) => c.key === "present"), "the server holds the key; the browser never calls the provider");
  assert.deepEqual(errors, []);
  await context.close();
});
