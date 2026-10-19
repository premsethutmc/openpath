/**
 * Mathematics completion: acceptance journeys through the UI against the real Django API, on the CBSE (NCERT) and
 * Tamil Nadu State Board releases, with content released by synthetic reviewers in the same run (no fixture).
 *
 *   Grade 2   carrying in addition → a place-value intervention → back to adding
 *   Grade 5   fractions without multiplication fluency → the multiplication facts → back
 *   Grade 8   linear equations with negative numbers → integer operations → back
 *   Grade 10  quadratic equations → targeted algebra recovery → back
 *   Grade 12  integration with a weakness in exponent rules → powers → back
 *   board transfer   Tamil Nadu → CBSE in the same year: valid evidence stays
 *   unseen textbook  a new textbook mapped and used with no code change
 *   progression      one grade completed, the next begun, history kept
 *   every grade      a representative learner in each of Grades 1–12 reaches verified
 *   written work     a proof sent for marking: waiting, shared with an educator, marked, then evidence
 *
 * Run (Django, test clock): YEAR_API=django OPENPATH_TEST_CLOCK_FILE=… node --import tsx --test e2e/mathematics-completion.test.mjs
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { question } from "../../packages/learning/src/content.ts";
import { boardFor } from "../../packages/learning/src/curricula.ts";
import { graph } from "../../packages/learning/src/graph.ts";
import { learnerState, make } from "../../packages/learning/src/session.ts";

const base = process.env.YEAR_URL ?? "http://127.0.0.1:4190";
const mode = process.env.YEAR_API ?? "fake";
const shots = process.env.SHOTS ?? fileURLToPath(new URL("../../docs/mathematics/screens/", import.meta.url));
mkdirSync(shots, { recursive: true });
const root = new URL("../../", import.meta.url);
const PASSWORD = "synthetic-family-passphrase-maths";
const MANAGE = process.env.YEAR_MANAGE ?? "python3 backend/manage.py";

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
});
after(() => browser?.close());

async function call(page, path, body, method) {
  return page.evaluate(async ({ path, body, method }) => {
    const token = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "";
    const r = await fetch("/api" + path, { method: method ?? (body ? "POST" : "GET"), credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(token) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: r.status === 204 ? null : await r.json().catch(() => null) };
  }, { path, body, method });
}
async function newPage(size) {
  const viewport = size === "tablet" ? { width: 820, height: 1180 } : { width: 360, height: 800 };
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("page error:", e.message, (e.stack ?? "").split("\n").slice(0, 4).join(" | ")));
  return { context, page };
}
async function learnerPage(name, size = "phone") {
  const { context, page } = await newPage(size);
  await page.goto(base + "/year/");
  await page.getByRole("heading", { name: "Sign in to OpenPath" }).waitFor();
  const email = `maths-${Date.now()}-${Math.random().toString(36).slice(2)}@example.org`;
  assert.equal((await call(page, "/account/register/", { email, password: PASSWORD, consent: true })).status, 201);
  const pupil = await call(page, "/pupils/", { display_name: name, consent: true });
  assert.equal(pupil.status, 201);
  await page.reload();
  return { page, context, email, learner: pupil.data.id };
}
const records = async (page, id) => (await call(page, `/pupils/${id}/events/?subject=mathematics`)).data.events;
const ahead = new Map();
async function timeTravel(page, learner, days) {
  const total = (ahead.get(learner) ?? 0) + days;
  ahead.set(learner, total);
  const file = process.env.OPENPATH_TEST_CLOCK_FILE;
  const all = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  writeFileSync(file, JSON.stringify({ ...all, [learner]: total }));
  await page.clock.setSystemTime(new Date(Date.now() + total * 86_400_000));
}
const shot = async (page, name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shots}${name}.png`, fullPage: true });
};
function grant(email, role) {
  execSync(`${MANAGE} content_reviewer grant ${email} --role ${role}`, { cwd: fileURLToPath(root), stdio: "pipe" });
}
let reviewers = null;
async function reviewer(name, roles) {
  const { context, page } = await newPage("tablet");
  await page.goto(base + "/review/");
  await page.getByRole("heading", { name: "Sign in to review content" }).waitFor();
  const email = `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.org`;
  assert.equal((await call(page, "/account/register/", { email, password: PASSWORD, consent: true })).status, 201);
  for (const r of roles) grant(email, r);
  await page.reload();
  return { context, page, email };
}
async function shared() {
  reviewers ??= { educator: await reviewer("m-educator", ["educator"]), manager: await reviewer("m-release", ["release-manager"]) };
  return reviewers;
}
/** Release a competency's module and every family it uses, each decision by the role it needs (four eyes). */
async function releaseSkills(...competencies) {
  const { educator, manager } = await shared();
  const reg = (await call(educator.page, "/content-review/")).data.registry;
  const items = [];
  for (const c of competencies) {
    const e = reg.entries.find((x) => x.item === `module:${c}`);
    assert.ok(e, `module:${c} is in the registry`);
    items.push(...e.families.map((f) => `family:${f}`), e.item);
  }
  for (const item of [...new Set(items)].sort((a, b) => (a.startsWith("family:") ? 0 : 1) - (b.startsWith("family:") ? 0 : 1))) {
    for (const decision of ["submit", "approve", "release"]) {
      const page = decision === "release" ? manager.page : educator.page;
      const e = (await call(page, "/content-review/")).data.registry.entries.find((x) => x.item === item);
      if (!e) continue; // a probe family with no registry entry of its own is not part of the release
      const want = { submit: ["draft", "changes_requested"], approve: ["submitted"], release: ["approved"] }[decision];
      if (!want.includes(e.state)) continue;
      const r = await call(page, "/content-review/decisions/", { item, decision, contentHash: e.contentHash, note: "checked in the mathematics acceptance test (synthetic reviewer)" });
      assert.equal(r.status, 201, `${item} ${decision}: ${JSON.stringify(r.data)}`);
    }
  }
}

/** Choose a grade and a board's textbook in the set-up screen. */
async function setupBoard(page, grade, board, { next = false } = {}) {
  await page.getByRole("heading", { name: next ? "Start the next year" : /Set up My Learning Year|Start the next year/ }).waitFor();
  await page.getByRole("button", { name: new RegExp(`^Grade ${grade}\\b`) }).click();
  await page.getByRole("button", { name: "No goal for now" }).click();
  const r = boardFor(board, grade);
  await page.getByRole("radio", { name: board === "cbse" ? /^CBSE/ : /^Tamil Nadu/ }).click();
  await page.getByRole("button", { name: r.title }).click();
  await page.getByRole("button", { name: `Start Grade ${grade}` }).click();
  await page.getByRole("heading", { name: new RegExp(`^Grade ${grade} · `) }).waitFor();
  return r;
}
/** The tile titles from the subject to a skill, as the app builds them for this release (the same derivation). */
function pathTo(release, competency) {
  const c = { learnerId: "L", sessionId: "learn:L:x", at: "2026-10-19T00:00:00Z" };
  const st = learnerState("L", [make.enrol(c, release.grade, "2026-27", release)], Date.parse("2026-10-19T01:00:00Z"));
  const find = (t, trail) => {
    if (t.competency === competency && t.kind === "skill") return [...trail, t.title];
    for (const k of t.children ?? []) {
      const r = find(k, [...trail, t.title]);
      if (r) return r;
    }
    return null;
  };
  for (const s of st.summary.tiles) {
    const p = find(s, []);
    if (p) return p.slice(1); // the subject tile is the dashboard itself
  }
  throw new Error(`${competency} is not in ${release.id}`);
}

async function answer(page, policy = () => null, { hint = false } = {}) {
  const card = page.locator(".qcard");
  await card.waitFor();
  const qid = await card.getAttribute("data-qid");
  const q = question(qid);
  const response = policy(qid) ?? q.answer;
  if (hint && (await page.getByRole("button", { name: "Show a hint" }).count())) await page.getByRole("button", { name: "Show a hint" }).click();
  if (q.type === "choice") await card.getByRole("radio").nth("ABCD".indexOf(response)).click();
  else await card.getByLabel("Your answer").fill(response);
  await card.getByRole("button", { name: "Check" }).click();
  await page.getByRole("status").filter({ hasText: /Right\.|Not this time\.|Sent to be marked\./ }).waitFor();
  return { qid, response };
}
async function lesson(page) {
  for (let i = 0; i < 10; i++) {
    const tryIt = page.getByRole("button", { name: "Try it" });
    if (await tryIt.count()) {
      const title = await page.locator(".lesson .eyebrow").innerText();
      await tryIt.click();
      await page.locator(".lesson").waitFor({ state: "detached" });
      return title;
    }
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
}
/** Work whatever is on screen (modules and recovery) until nothing is asked; the log says what happened. */
async function work(page, policy = () => null, max = 40) {
  const log = [];
  for (let i = 0; i < max; i++) {
    await page.waitForFunction(() => document.querySelector(".qcard, .lesson, .feedback, h1"));
    if (await page.locator(".lesson").count()) {
      log.push(`lesson:${await lesson(page)}`);
      continue;
    }
    if (await page.locator(".qcard").count()) {
      const guided = (await page.locator(".qcard .counted").innerText()).startsWith("Practice with help");
      const a = await answer(page, policy, { hint: guided });
      log.push(`${a.qid}=${a.response}`);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      continue;
    }
    const resume = page.getByRole("button", { name: /^(Back to|Continue with|Return to) / });
    if (await resume.count()) {
      log.push(`resume:${await resume.first().innerText()}`);
      await resume.first().click();
      continue;
    }
    break;
  }
  return log;
}
const tile = (page, title) => page.locator(".tile", { hasText: title }).first().click();
const tileStatus = (page, title) => page.locator(".tile", { hasText: title }).first().getAttribute("data-status");
async function home(page) {
  const dash = page.getByText("My Learning Year", { exact: true });
  for (let k = 0; k < 5 && !(await dash.count()); k++) {
    const back = page.getByRole("button", { name: "Back to the year" });
    const crumb = page.getByRole("navigation", { name: "Where you are" }).getByRole("button", { name: "My year" });
    if (await back.count()) await back.click();
    else if (await crumb.count()) await crumb.click();
    else await page.getByRole("button", { name: /← (My year|Back)/ }).first().click();
    await page.waitForTimeout(150);
  }
  await dash.waitFor();
}
async function open(page, path) {
  await home(page);
  for (const t of path) await tile(page, t);
  const start = page.getByRole("button", { name: /^(Start|Continue)$/ });
  if (await start.count()) await start.click();
}
/** A wrong answer an explanation predicts, from a chosen kind of mistake (or any). */
const mistake = (pick) => (qid) => {
  const q = question(qid);
  const m = (q.misconceptions ?? []).filter((x) => x.when !== q.answer && (!pick || pick(x)));
  return m[0]?.when ?? null;
};
/** Two early mistakes, the next day fresh questions, seven full days later the delayed check: verified. */
async function toVerified(page, learner, path, prefix, firstPolicy) {
  await open(page, path);
  let wrong = 0;
  const twoMistakes = (qid) => {
    if (wrong >= 2) return null;
    const w = (firstPolicy ?? mistake())(qid);
    if (w === null) return null;
    wrong++;
    return w;
  };
  const first = await work(page, twoMistakes);
  await shot(page, `${prefix}-1-after-teaching`);
  await timeTravel(page, learner, 1);
  await page.reload();
  await page.getByRole("heading", { name: /^Grade \d+ · / }).waitFor();
  await open(page, path);
  const second = await work(page);
  await timeTravel(page, learner, 7.05);
  await page.reload();
  await page.getByRole("heading", { name: /^Grade \d+ · / }).waitFor();
  await page.getByRole("button", { name: "Start the delayed check" }).click();
  const third = await work(page, () => null, 12);
  await home(page);
  for (const t of path.slice(0, -1)) await tile(page, t);
  assert.equal(await tileStatus(page, path.at(-1)), "verified", `${path.at(-1)}: verified (${[...first, "|", ...second, "|", ...third].join(" ")})`);
  await shot(page, `${prefix}-2-verified`);
  const recs = (await records(page, learner)).filter((r) => r.record === "attempt" && !String(r.context ?? "").startsWith("recovery:"));
  const keys = recs.map((r) => r.questionId.replace(/:(mc|w)$/, ""));
  assert.equal(new Set(keys).size, keys.length, "no problem was asked twice");
  return { first, second, third };
}
const skillName = (id) => graph.get(id).name;

export { call, learnerPage, records, timeTravel, shot, releaseSkills, setupBoard, pathTo, work, open, mistake, toVerified, skillName, home, tile, tileStatus, mode, reviewer, shared };

// the journeys are registered in mathematics-journeys.mjs (imported below), so this file is the helpers and runner
await import("./mathematics-journeys.mjs");
