/**
 * My Learning Year: acceptance journeys A–F in a real browser, through the UI, against an OpenPath API.
 *
 *   CI:    the real Django API (YEAR_API=django, OPENPATH_TEST_CLOCK_FILE set for the server and this test)
 *   local: e2e/lib/fake-api.mjs (YEAR_API=fake, FAKE_API=http://127.0.0.1:8013)
 *
 * The app is the TEST BUILD (scripts/build-year.mjs --test): questions are treated as educator-reviewed so that a
 * verified (green) skill can be shown, and every screen says so. Synthetic learners only. Screenshots are written to
 * SHOTS (default ../docs/learning-year/screens) at phone (360 × 800) and tablet (820 × 1180) sizes.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const base = process.env.YEAR_URL ?? "http://127.0.0.1:4190";
const mode = process.env.YEAR_API ?? "fake";
const fakeApi = process.env.FAKE_API ?? "http://127.0.0.1:8013";
const shots = process.env.SHOTS ?? fileURLToPath(new URL("../../docs/learning-year/screens/", import.meta.url));
mkdirSync(shots, { recursive: true });
const root = new URL("../../", import.meta.url);
const content = JSON.parse(readFileSync(new URL("content/learning/modules.v1.json", root), "utf8"));
const problems = JSON.parse(readFileSync(new URL("content/learning/problems.v1.json", root), "utf8")).problems;
const Q = new Map(content.questions.map((q) => [q.id, q]));
for (const p of problems) for (const f of [p.full, ...p.fragments]) Q.set(f.id, f);
const book4 = readFileSync(new URL("content/learning/textbooks/sample-maths-grade4.md", root), "utf8");
const PASSWORD = "synthetic-family-passphrase-year";

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
});
after(() => browser?.close());

async function call(page, path, body) {
  return page.evaluate(async ({ path, body }) => {
    const token = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "";
    const r = await fetch("/api" + path, { method: body ? "POST" : "GET", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(token) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: r.status === 204 ? null : await r.json().catch(() => null) };
  }, { path, body });
}
async function learnerPage(name, size = "phone") {
  const viewport = size === "tablet" ? { width: 820, height: 1180 } : { width: 360, height: 800 };
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto(base + "/year/");
  await page.getByRole("heading", { name: "Sign in to OpenPath" }).waitFor();
  const email = `year-${Date.now()}-${Math.random().toString(36).slice(2)}@example.org`;
  assert.equal((await call(page, "/account/register/", { email, password: PASSWORD, consent: true })).status, 201);
  const pupil = await call(page, "/pupils/", { display_name: name, consent: true });
  assert.equal(pupil.status, 201);
  await page.reload();
  return { page, context, email, learner: pupil.data.id };
}
async function records(page, id) {
  return (await call(page, `/pupils/${id}/events/?subject=mathematics`)).data.events;
}
/**
 * Move time forward for one synthetic learner: the server's test clock (Django: OPENPATH_TEST_CLOCK_FILE; the fake
 * API: /__test/clock) and the browser's clock by the same amount. No stored record is changed.
 */
const ahead = new Map();
async function timeTravel(page, learner, days) {
  const total = (ahead.get(learner) ?? 0) + days;
  ahead.set(learner, total);
  if (mode === "django") {
    const file = process.env.OPENPATH_TEST_CLOCK_FILE;
    const all = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
    writeFileSync(file, JSON.stringify({ ...all, [learner]: total }));
  } else {
    const r = await fetch(fakeApi + "/__test/clock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pupil: learner, days: total }) });
    assert.equal(r.status, 200);
  }
  await page.clock.setSystemTime(new Date(Date.now() + total * 86_400_000));
}
const shot = async (page, name) => {
  await page.waitForTimeout(450); // let the screen-enter animation finish
  await page.screenshot({ path: `${shots}${name}.png`, fullPage: true });
};

async function setupYear(page, grade, { goal = null, textbook = null } = {}) {
  await page.getByRole("heading", { name: /Set up My Learning Year|Start the next year/ }).waitFor();
  await page.getByRole("button", { name: new RegExp(`^Grade ${grade}\\b`) }).click();
  await page.getByRole("button", { name: goal ?? "No goal for now" }).click();
  if (textbook) {
    await page.getByRole("button", { name: /Add my textbook/ }).click();
    await page.getByLabel("Textbook contents").fill(textbook);
    await page.getByRole("button", { name: "Read the textbook" }).click();
    await page.getByRole("heading", { name: "Check the skills for each outcome" }).waitFor();
    return;
  }
  await page.getByRole("button", { name: /Sample Mathematics|OpenPath Sample/i }).first().click();
  await page.getByRole("button", { name: `Start Grade ${grade}` }).click();
  await page.getByRole("heading", { name: new RegExp(`^Grade ${grade} · `) }).waitFor();
}

/** Answer whatever question is on screen; `policy(qid)` gives the response (default: the right answer). */
async function answer(page, policy = () => null, { hint = false } = {}) {
  const card = page.locator(".qcard");
  await card.waitFor();
  const qid = await card.getAttribute("data-qid");
  const q = Q.get(qid);
  const response = policy(qid) ?? q.answer;
  if (hint && (await page.getByRole("button", { name: "Show a hint" }).count())) await page.getByRole("button", { name: "Show a hint" }).click();
  if (q.type === "choice") await card.getByRole("radio").nth("ABCD".indexOf(response)).click();
  else await card.getByLabel("Your answer").fill(response);
  await card.getByRole("button", { name: "Check" }).click();
  await page.getByRole("status").filter({ hasText: /Right\.|Not this time\./ }).waitFor();
  return { qid, response };
}
async function next(page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
/** Read a lesson (strategy chapter) to its end. */
async function lesson(page) {
  for (let i = 0; i < 8; i++) {
    const tryIt = page.getByRole("button", { name: "Try it" });
    if (await tryIt.count()) {
      await tryIt.click();
      return page.locator(".lesson").waitFor({ state: "detached" });
    }
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
}
/** Work the module on screen until it stops asking; returns what happened, in order. */
async function work(page, policy = () => null, max = 30) {
  const log = [];
  for (let i = 0; i < max; i++) {
    await page.waitForFunction(() => document.querySelector(".qcard, .lesson, .feedback, h1"));
    if (await page.locator(".lesson").count()) {
      log.push(`lesson:${await page.locator(".lesson .eyebrow").innerText()}`);
      await lesson(page);
      continue;
    }
    if (await page.locator(".qcard").count()) {
      const guided = (await page.locator(".qcard .counted").innerText()).startsWith("Practice with help");
      const a = await answer(page, policy, { hint: guided });
      log.push(`${a.qid}=${a.response}`);
      await next(page);
      continue;
    }
    break;
  }
  return log;
}
async function tile(page, title) {
  await page.locator(".tile", { hasText: title }).first().click();
}
const tileStatus = (page, title) => page.locator(".tile", { hasText: title }).first().getAttribute("data-status");
async function openSkill(page, chapter, skill) {
  await tile(page, chapter);
  await tile(page, skill);
  if (await page.getByRole("button", { name: /^(Start|Continue)$/ }).count()) await page.getByRole("button", { name: /^(Start|Continue)$/ }).click();
}
async function home(page) {
  const dash = page.getByText("My Learning Year", { exact: true });
  for (let k = 0; k < 4 && !(await dash.count()); k++) {
    const back = page.getByRole("button", { name: "Back to the year" });
    const crumb = page.getByRole("navigation", { name: "Where you are" }).getByRole("button", { name: "My year" });
    if (await back.count()) await back.click();
    else if (await crumb.count()) await crumb.click();
    else await page.getByRole("button", { name: /← (My year|Back)/ }).first().click();
    await page.waitForTimeout(150);
  }
  await dash.waitFor();
}

// ---------------------------------------------------------------- A, then E and F with the same learner

test("journeys A, E, F: Grade 4 textbook → Fractions → diagnostic → strategy → practice → logout/login → Grade 5 → missed delayed check", async () => {
  const { page, context, email, learner } = await learnerPage("Synthetic Grade 4 learner");
  // A: the textbook becomes a reviewed curriculum
  await setupYear(page, 4, { textbook: book4 });
  await shot(page, "a1-mapping-review-phone");
  assert.ok(await page.getByText("No matching skill: kept as a proposal.").count() >= 1, "unmapped outcomes are proposals");
  await page.getByRole("button", { name: "Use this curriculum for Grade 4" }).click();
  await page.getByRole("heading", { name: /^Grade 4 · / }).waitFor();
  await shot(page, "a2-year-dashboard-phone");
  assert.equal(await tileStatus(page, "Fractions"), "not_started");
  await tile(page, "Fractions");
  await shot(page, "a3-fractions-chapter-phone");
  await tile(page, "Generate equivalent fractions");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  // a conceptual difficulty: the diagnostic finds it, the picture strategy is taught, practice with help, then alone
  const wrong = { "eq-d1": "4", "eq-d2": "4", "eq-d3": "9" };
  await page.locator(".flow li.here", { hasText: "Explore" }).waitFor();
  await shot(page, "a4-explore-phone");
  const log = await work(page, (q) => wrong[q] ?? null, 4);
  assert.ok(log.some((l) => l.startsWith("lesson:")), `a strategy was taught: ${log}`);
  const rest = await work(page);
  const all = [...log, ...rest];
  assert.ok(all.includes("eq-s1g=4") && all.includes("eq-s1c=6"), `strip-model guided and check: ${all}`);
  await page.getByText(/Shown on your own/).first().waitFor();
  await shot(page, "a5-skill-shown-phone");
  await home(page);
  assert.equal(await tileStatus(page, "Fractions"), "active", "one of four skills shown: the chapter is still in progress");
  // log out and back in: the same state from the server
  await call(page, "/account/logout/", {});
  await page.reload();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: /^Grade 4 · / }).waitFor();
  await tile(page, "Fractions");
  assert.equal(await tileStatus(page, "Generate equivalent fractions"), "shown");
  const recs = await records(page, learner);
  const attempts = recs.filter((r) => r.record === "attempt");
  assert.ok(attempts.some((a) => a.activity === "guided" && a.hints === 1), "the hint is recorded with the guided answer");
  assert.ok(recs.every((r) => !("status" in r) && !("verified" in r)), "no status or mastery is stored, only what happened");

  // E: Grade 4 → Grade 5, evidence intact
  await home(page).catch(() => page.getByRole("button", { name: "← Back" }).click());
  await page.getByRole("button", { name: "Start the next year" }).click();
  await setupYear(page, 5);
  await shot(page, "e1-grade5-dashboard-phone");
  await tile(page, "More fractions");
  assert.equal(await tileStatus(page, "Generate equivalent fractions"), "shown", "shown in Grade 4, still shown in Grade 5");
  await home(page);
  await page.getByRole("button", { name: "Earlier years" }).click();
  await page.getByRole("heading", { name: /Grade 4 · / }).waitFor();
  await shot(page, "e2-years-phone");

  // F: a week later the delayed check is due; a wrong answer means review, not verified
  await timeTravel(page, learner, 8);
  await page.reload();
  await page.getByRole("button", { name: "Start the delayed check" }).click();
  await answer(page, (q) => (q === "eq-r1" ? "8" : null));
  await next(page);
  await home(page);
  await page.getByRole("button", { name: "Review it" }).waitFor();
  await tile(page, "More fractions");
  assert.equal(await tileStatus(page, "Generate equivalent fractions"), "active");
  await page.locator(".tile", { hasText: "Generate equivalent fractions" }).getByText("Review needed").waitFor();
  await shot(page, "f1-review-needed-phone");
  await context.close();
});

// ---------------------------------------------------------------- B

test("journey B: Grade 5 with an IIT-JEE Advanced goal: age-appropriate tiles, goal foundations, gated challenges, nothing advanced", async () => {
  const { page, context } = await learnerPage("Synthetic Grade 5 JEE learner", "tablet");
  await setupYear(page, 5, { goal: "JEE Advanced" });
  await page.getByRole("heading", { name: "Your goal: JEE Advanced" }).waitFor();
  await shot(page, "b1-grade5-jee-goal-tablet");
  const text = await page.locator("main").innerText();
  for (const advanced of ["integral", "∫", "Quadratic", "Steps toward an advanced problem", "Stuck on a problem", "Exam plan"]) assert.ok(!text.includes(advanced), `nothing advanced at Grade 5: ${advanced}`);
  assert.ok(await page.locator(".goal-mark").count() > 0, "goal-marked foundations in the learner's own year");
  assert.equal(await page.getByRole("button", { name: /Locked/ }).count(), 3, "challenges wait for their skill");
  await openSkill(page, "Factors and multiples", "Find factors and multiples");
  await work(page);
  await home(page);
  assert.equal(await page.getByRole("button", { name: /Ready/ }).count(), 3);
  await page.getByRole("button", { name: /Ready/ }).first().click();
  await answer(page);
  await shot(page, "b2-challenge-tablet");
  await context.close();
});

// ---------------------------------------------------------------- C, then D for the ready learner

test("journeys C and D: integration problem → verified supports green → 7 × 8 fails → decomposition → back; the full advanced problem once ready", async () => {
  const { page, context, learner } = await learnerPage("Synthetic Grade 10 learner");
  // earlier years: rectangle area (Grade 5) and coordinates (Grade 8), each checked again a week later
  await setupYear(page, 5);
  await openSkill(page, "Area and volume", "Calculate rectangle area");
  await work(page);
  await home(page);
  await page.getByRole("button", { name: "Start the next year" }).click();
  await setupYear(page, 8);
  await openSkill(page, "Graphs", "Plot points in four quadrants");
  await work(page);
  await home(page);
  await timeTravel(page, learner, 8);
  await page.reload();
  for (let k = 0; k < 2; k++) {
    await page.getByRole("button", { name: "Start the delayed check" }).click();
    await work(page);
    await home(page);
  }
  await page.getByRole("button", { name: "Start the next year" }).click();
  await setupYear(page, 10, { goal: "JEE Main" });
  // C: the integration problem
  await page.getByRole("button", { name: /∫ from 0 to 8 of 7 dx/ }).click();
  await answer(page, () => "54");
  await next(page);
  await page.getByText("Finding what this problem needs").waitFor();
  assert.equal(await page.locator(".trace-row.verified").count(), 2, "rectangle area and coordinates are verified (green)");
  await shot(page, "c1-trace-supports-phone");
  const policy = (q) => ({ "mt-d1": "54", "mt-d2": "48", "mt-k-77": "47" })[q] ?? (q === "ai-original" ? "56" : null);
  const log = [];
  for (let i = 0; i < 30; i++) {
    if (await page.getByText(/Solved after help|Solved on your own/).count()) break;
    if (await page.locator(".lesson").count()) {
      log.push(`lesson:${await page.locator(".lesson .eyebrow").innerText()}`);
      if (/split it/i.test(log.at(-1))) await shot(page, "c2-decomposition-lesson-phone");
      await lesson(page);
      continue;
    }
    const guided = (await page.locator(".qcard .counted").innerText()).startsWith("Practice with help");
    const a = await answer(page, policy, { hint: guided });
    log.push(`${a.qid}=${a.response}`);
    await next(page);
  }
  assert.ok(log.includes("mt-d1=54"), `uncertain multiplication assessed with 7 × 8: ${log}`);
  assert.ok(log.some((l) => /^lesson:split it into facts you know/i.test(l)), `decomposition: ${log}`);
  assert.ok(log.includes("ai-original=56"), "back to the original problem");
  await page.getByText("Solved after help", { exact: true }).waitFor();
  await shot(page, "c3-solved-after-help-phone");
  const att = (await records(page, learner)).filter((r) => r.record === "attempt" && r.questionId === "ai-original");
  assert.equal(att.length, 2);
  assert.equal(att[0].activity, "original");
  // D: quadratics this year, then Grade 11: the full problem is offered (and no fragments)
  await home(page);
  await openSkill(page, "Quadratic equations", "Solve quadratic equations");
  await work(page);
  await home(page);
  await page.getByRole("button", { name: "Start the next year" }).click();
  await setupYear(page, 11, { goal: "JEE Advanced" });
  await page.getByRole("button", { name: /Full problem/ }).waitFor();
  await page.getByRole("heading", { name: "Exam plan" }).waitFor();
  await shot(page, "d3-full-problem-grade11-phone");
  await page.getByRole("button", { name: /Full problem/ }).click();
  await answer(page, () => "9/2");
  await context.close();
});

test("journey D: an advanced problem decomposed into a Grade 7 step and a Grade 8 step", async () => {
  for (const grade of [7, 8]) {
    const { page, context } = await learnerPage(`Synthetic Grade ${grade} learner`, grade === 8 ? "tablet" : "phone");
    await setupYear(page, grade);
    await page.getByRole("heading", { name: "Steps toward an advanced problem" }).waitFor();
    const steps = page.getByRole("button", { name: /One step/ });
    assert.equal(await steps.count(), 1);
    assert.ok(!(await page.locator("main").innerText()).includes("{(x, y)"), "the original problem is not shown");
    await shot(page, `d${grade === 7 ? 1 : 2}-grade${grade}-fragment-${grade === 8 ? "tablet" : "phone"}`);
    await steps.click();
    await answer(page);
    await context.close();
  }
});
