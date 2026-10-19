/**
 * My Learning Year: acceptance journeys A–F in a real browser, through the UI, against an OpenPath API.
 *
 *   CI:    the real Django API (YEAR_API=django, OPENPATH_TEST_CLOCK_FILE set for the server and this test)
 *   local: e2e/lib/fake-api.mjs (YEAR_API=fake, FAKE_API=http://127.0.0.1:8013)
 *
 * The app is the TEST BUILD (scripts/build-year.mjs --test): questions are treated as educator-reviewed so that a
 * verified (green) skill can be shown, and every screen says so. Synthetic learners only. Screenshots are written to
 * SHOTS (default ../docs/learning-year/screens) at phone (360 × 800) and tablet (820 × 1180) sizes.
 *
 *   node --import tsx --test e2e/learning-year.test.mjs
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { question } from "../../packages/learning/src/content.ts";
import { problemOf, show } from "../../packages/learning/src/families.ts";

const base = process.env.YEAR_URL ?? "http://127.0.0.1:4190";
const mode = process.env.YEAR_API ?? "fake";
const fakeApi = process.env.FAKE_API ?? "http://127.0.0.1:8013";
const shots = process.env.SHOTS ?? fileURLToPath(new URL("../../docs/learning-year/screens/", import.meta.url));
mkdirSync(shots, { recursive: true });
const root = new URL("../../", import.meta.url);
// the app's own question lookup (stored questions, fragments and generated questions gen:*), run with --import tsx
const Q = { get: (id) => question(id) };
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
  page.on("pageerror", (e) => console.error("page error:", e.message, (e.stack ?? "").split("\n").slice(0, 6).join(" | ")));
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

async function setupYear(page, grade, { goal = null, textbook = null, choose = [] } = {}) {
  await page.getByRole("heading", { name: /Set up My Learning Year|Start the next year/ }).waitFor();
  await page.getByRole("button", { name: new RegExp(`^Grade ${grade}\\b`) }).click();
  await page.getByRole("button", { name: goal ?? "No goal for now" }).click();
  if (textbook) {
    await page.getByRole("button", { name: /Add my textbook/ }).click();
    await page.getByLabel("Textbook contents").fill(textbook);
    await page.getByRole("button", { name: "Read the textbook" }).click();
    await page.getByRole("heading", { name: "Check the skills for each outcome" }).waitFor();
    // the reviewer's decisions: an uncertain mapping is not ticked for you
    for (const [outcome, skill] of choose) {
      const box = page.locator(".outcome", { hasText: outcome }).getByRole("checkbox", { name: new RegExp(skill) });
      if (!(await box.isChecked())) await box.check();
    }
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
  await setupYear(page, 4, { textbook: book4, choose: [["Generate equivalent fractions", "Generate equivalent fractions"]] });
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
  for (const advanced of ["integral", "∫", "Quadratic", "Steps toward an advanced problem", "Exam plan"]) assert.ok(!text.includes(advanced), `nothing advanced at Grade 5: ${advanced}`);
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
  const policy = (q) => ({ "mt-d1": "54", "mt-d2": "48", "mt-k-77": "47", "gen:mul:7,8": "54" })[q] ?? (q === "ai-original" ? "56" : null);
  // the wrong answer is investigated first: one to three questions that tell the explanations apart
  await page.getByText("Working out what happened").waitFor();
  await shot(page, "c1a-investigate-phone");
  const investigated = [];
  while (await page.getByText("Working out what happened").count()) {
    const a = await answer(page, policy);
    investigated.push(`${a.qid}=${a.response}`);
    await next(page);
  }
  assert.ok(investigated.includes("gen:mul:7,8=54"), `7 × 8 itself was asked: ${investigated}`);
  await page.getByRole("note", { name: "What we think happened" }).waitFor();
  assert.equal(await page.locator(".trace-row.verified").count(), 2, "rectangle area and coordinates are verified (green)");
  await shot(page, "c1-trace-supports-phone");
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
  assert.ok(investigated.includes("gen:mul:7,8=54"), `uncertain multiplication assessed with 7 × 8: ${investigated}`);
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
    assert.equal(await steps.count(), 2, "the steps at or below this grade: a value on the line, and where the graphs meet");
    assert.ok(!(await page.locator("main").innerText()).includes("{(x, y)"), "the original problem is not shown");
    await shot(page, `d${grade === 7 ? 1 : 2}-grade${grade}-fragment-${grade === 8 ? "tablet" : "phone"}`);
    await steps.first().click();
    await answer(page);
    await context.close();
  }
});

// ---------------------------------------------------------------- G, M: a problem the learner types in

async function typeProblem(page, text) {
  await page.getByLabel("The problem").fill(text);
  await page.getByRole("button", { name: "Work through it" }).click();
}

test("journeys G and M: an unseen mistake on a typed problem is investigated; an unsupported problem is declined", async () => {
  const { page, context, learner } = await learnerPage("Synthetic Grade 11 learner");
  await setupYear(page, 11, { goal: "JEE Main" });
  // M: outside the supported families: declined, nothing recorded, nothing claimed
  const before = (await records(page, learner)).length;
  await typeProblem(page, "Prove that √2 is irrational");
  await page.getByText("OpenPath can’t work through this one yet.").waitFor();
  await shot(page, "m1-unsupported-declined-phone");
  await typeProblem(page, "1/3 + 1/4");
  await page.getByText(/unlike denominators are not yet/).waitFor();
  assert.equal((await records(page, learner)).length, before, "nothing is recorded for an unsupported problem");
  // G: the width taken as the upper limit (6 × 9 = 54 instead of 6 × 7 = 42): not a scripted mistake
  await typeProblem(page, "∫ from 2 to 9 of 6 dx");
  const ignoreLower = (qid) => {
    const m = qid.match(/^gen:cint:(\d+),(\d+),(\d+)$/);
    return m ? String(Number(m[3]) * Number(m[2])) : null;
  };
  await answer(page, ignoreLower);
  await next(page);
  await page.getByText("Working out what happened").waitFor();
  await shot(page, "g1-investigate-unseen-mistake-phone");
  let asked = 0;
  while (await page.getByText("Working out what happened").count()) {
    await answer(page, ignoreLower);
    await next(page);
    asked++;
  }
  assert.ok(asked >= 1 && asked <= 3, `${asked} follow-up questions`);
  await page.getByRole("note", { name: "What we think happened" }).getByText(/upper limit/).waitFor();
  await shot(page, "g2-established-teach-phone");
  // the lesson for that misunderstanding, practice, then back to the problem
  for (let i = 0; i < 25; i++) {
    if (await page.getByText("Back to the original problem").count()) break;
    if (await page.locator(".lesson").count()) {
      await lesson(page);
      continue;
    }
    const guided = (await page.locator(".qcard .counted").innerText()).startsWith("Practice with help");
    await answer(page, () => null, { hint: guided });
    await next(page);
  }
  await answer(page, () => "42");
  await next(page);
  await page.getByText("Solved after help", { exact: true }).waitFor();
  await shot(page, "g3-solved-after-help-phone");
  // answers that match no explanation: OpenPath says it is not sure, and does not guess
  await home(page);
  await typeProblem(page, "A rectangle is 7 cm by 6 cm. What is its area?");
  await answer(page, () => "1000");
  await next(page);
  while (await page.getByText("Working out what happened").count()) {
    await answer(page, () => "999");
    await next(page);
  }
  await page.getByRole("note", { name: "What we think happened" }).getByText("Not sure yet").waitFor();
  await shot(page, "g4-not-sure-no-guess-phone");
  await home(page);
  const recs = await records(page, learner);
  assert.ok(recs.some((r) => r.record === "teach" && r.competency === "MATH.calculus.definite-integrals"), "taught definite integrals");
  assert.ok(recs.filter((r) => r.context === "investigate:gen:cint:2,9,6").length === asked, "every follow-up is stored with its context");
  await context.close();
});

// ---------------------------------------------------------------- I: different valid methods

test("journey I: two learners solve 7 × 8 in different ways; both are valid and recognised, neither is required", async () => {
  const ways = [
    ["7 × 5 + 7 × 3 = 35 + 21 = 56", /split into facts you know/i, "i1-working-decomposition-phone"],
    ["7 × 2 = 14\n14 × 2 = 28\n28 × 2 = 56", /doubling/i, "i2-working-doubling-tablet"],
  ];
  for (const [k, [working, method, name]] of ways.entries()) {
    const { page, context, learner } = await learnerPage(`Synthetic method learner ${k + 1}`, k ? "tablet" : "phone");
    await setupYear(page, 4);
    await typeProblem(page, "7 × 8");
    await page.locator(".qcard").waitFor();
    await page.getByText("Show your working (optional)").click();
    await page.getByLabel("Your working").fill(working);
    await page.locator(".qcard").getByLabel("Your answer").fill("56");
    await page.locator(".qcard").getByRole("button", { name: "Check" }).click();
    await page.getByRole("note", { name: "Your working" }).locator("strong").getByText(method).waitFor();
    await shot(page, name);
    await next(page);
    await page.getByText("Solved on your own", { exact: true }).waitFor();
    const att = (await records(page, learner)).find((r) => r.record === "attempt");
    assert.deepEqual(att.working, working.split("\n"));
    assert.equal(att.activity, "original");
    await context.close();
  }
});

// ---------------------------------------------------------------- J, K: one plan over several visits; the seven-day boundary

test("journeys J and K: the plan continues across visits without reteaching; no delayed check or green before seven days", async () => {
  const { page, context, email, learner } = await learnerPage("Synthetic returning learner");
  await setupYear(page, 4);
  await openSkill(page, "Fractions", "Generate equivalent fractions");
  const wrong = { "eq-d1": "4", "eq-d2": "4", "eq-d3": "9" };
  // visit 1: up to the guided question, then the learner leaves
  for (let i = 0; i < 8; i++) {
    if (await page.locator(".flow li.here", { hasText: "Practise" }).count() && (await page.locator(".qcard .counted").innerText()).startsWith("On your own · no hints")) break;
    if (await page.locator(".lesson").count()) {
      await lesson(page);
      continue;
    }
    const guided = (await page.locator(".qcard .counted").innerText()).startsWith("Practice with help");
    await answer(page, (q) => wrong[q] ?? null, { hint: guided });
    await next(page);
  }
  const taught = (await records(page, learner)).filter((r) => r.record === "teach").length;
  assert.equal(taught, 1);
  await context.close();
  // visit 2, a new sign-in: the plan says continue, and the skill resumes at the check: no second lesson
  const c2 = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const p2 = await c2.newPage();
  await p2.goto(base + "/year/");
  await p2.getByLabel("Email").fill(email);
  await p2.getByLabel("Password").fill(PASSWORD);
  await p2.getByRole("button", { name: "Sign in" }).click();
  await p2.getByRole("button", { name: "Continue", exact: true }).click();
  await p2.locator(".qcard .counted", { hasText: "On your own · no hints" }).waitFor();
  await shot(p2, "j1-resume-at-check-phone");
  await work(p2);
  await home(p2);
  await p2.getByText(/Why this changed:/).waitFor();
  await shot(p2, "j2-plan-change-explained-phone");
  assert.equal((await records(p2, learner)).filter((r) => r.record === "teach").length, taught, "no reteaching");
  // K: 6.9 days later nothing is due and nothing is green; at 7.1 days the delayed check is offered
  await timeTravel(p2, learner, 6.9);
  await p2.reload();
  await p2.getByText("My Learning Year", { exact: true }).waitFor();
  assert.equal(await p2.getByRole("button", { name: "Start the delayed check" }).count(), 0, "not due before seven days");
  await tile(p2, "Fractions");
  assert.equal(await tileStatus(p2, "Generate equivalent fractions"), "shown", "not verified before seven days");
  await timeTravel(p2, learner, 0.2);
  await p2.reload();
  await p2.getByRole("button", { name: "Start the delayed check" }).click();
  await work(p2);
  await home(p2);
  await tile(p2, "Fractions");
  assert.equal(await tileStatus(p2, "Generate equivalent fractions"), "verified", "verified after the seven-day check (test build)");
  await shot(p2, "k1-verified-after-seven-days-phone");
  await c2.close();
});

// ---------------------------------------------------------------- L: two boards

const boardB = readFileSync(new URL("content/learning/textbooks/sample-maths-grade4-board-b.txt", root), "utf8");
test("journey L: a second board's textbook, worded differently, maps to the same skills or asks the reviewer", async () => {
  const { page, context } = await learnerPage("Synthetic second-board learner", "tablet");
  await setupYear(page, 4, { textbook: boardB });
  await page.locator(".outcome", { hasText: "recognise fractions that name the same amount" }).getByRole("checkbox", { name: /Generate equivalent fractions/ }).isChecked().then((v) => assert.ok(v, "a clear match is ticked for the reviewer to confirm"));
  const vague = page.locator(".outcome", { hasText: "solve word problems involving fractions" });
  await vague.getByText(/Please choose/).waitFor();
  assert.equal(await vague.getByRole("checkbox", { checked: true }).count(), 0, "an uncertain mapping is not ticked");
  await page.locator(".outcome", { hasText: "round a number" }).getByText("No matching skill: kept as a proposal.").waitFor();
  await shot(page, "l1-second-board-review-tablet");
  await page.getByRole("button", { name: "Use this curriculum for Grade 4" }).click();
  await page.getByRole("heading", { name: /^Grade 4 · / }).waitFor();
  await tile(page, "Parts of a Whole");
  for (const skill of ["Represent fractions of a whole", "Generate equivalent fractions", "Compare fractions with like denominators", "Add and subtract like fractions"]) await page.locator(".tile", { hasText: skill }).first().waitFor();
  await shot(page, "l2-second-board-chapter-tablet");
  await context.close();
});

// ---------------------------------------------------------------- N: goal progression on the same evidence

test("journey N: a Grade 5 JEE learner builds foundations; Grade 11 later uses the same evidence and gets an exam plan", async () => {
  const { page, context } = await learnerPage("Synthetic JEE progression learner");
  await setupYear(page, 5, { goal: "JEE Advanced" });
  await page.getByText(/Foundations so far \(up to Grade 5\): 0 of/).waitFor();
  await openSkill(page, "Factors and multiples", "Find factors and multiples");
  await work(page);
  await home(page);
  await page.getByText(/Foundations so far \(up to Grade 5\): 1 of/).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Exam plan" }).count(), 0, "no exam plan at Grade 5");
  await page.getByRole("button", { name: "Start the next year" }).click();
  await setupYear(page, 11, { goal: "JEE Advanced" });
  const line = await page.getByText(/Foundations so far \(up to Grade 11\)/).innerText();
  assert.ok(/: [1-9]\d* of/.test(line), `the Grade 5 evidence counts: ${line}`);
  await page.getByRole("heading", { name: "Exam plan" }).waitFor();
  await page.getByRole("radio", { name: "Last 8 weeks" }).click();
  await page.getByText(/Crash course/).waitFor();
  await page.getByText(/not verified against the official paper/).waitFor();
  await shot(page, "n1-grade11-exam-plan-crash-phone");
  await context.close();
});

// ---------------------------------------------------------------- platform scenarios (the same UI for every grade)

/** Answer as a learner with one written misunderstanding of a problem family, until `learned()` (then right). */
const withBug = (bugId, learned) => (qid) => {
  const p = problemOf(qid);
  const b = p?.bugs.find((x) => x.id === bugId);
  if (!p || learned() || !b || b.predict === null) return null;
  const v = Array.isArray(b.predict) && p.type !== "set" ? b.predict[0] : b.predict;
  return p.type === "choice" ? "ABCD"[v] : show(v);
};
/** Work a typed problem through recovery to its end; the learner's misunderstanding goes once a lesson is read. */
async function recoverTyped(page, text, bugId) {
  let taught = false;
  const policy = withBug(bugId, () => taught);
  await typeProblem(page, text);
  await answer(page, policy);
  await next(page);
  const log = [];
  for (let i = 0; i < 40; i++) {
    if (await page.getByText(/^Solved (after help|on your own)$/).count()) break;
    if (await page.locator(".lesson").count()) {
      log.push(`lesson:${await page.locator(".lesson .eyebrow").innerText()}`);
      taught = true;
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
    await page.waitForTimeout(200);
  }
  return log;
}
async function crumbs(page) {
  return page.getByRole("navigation", { name: "Where you are" }).innerText();
}

test("platform B: Grade 10 board textbook → Algebra → Quadratic equations → sections; a gap in expanding brackets repaired", async () => {
  const { page, context, learner } = await learnerPage("Synthetic Grade 10 board learner");
  await page.getByRole("heading", { name: "Set up My Learning Year" }).waitFor();
  await page.getByRole("button", { name: /^Grade 10\b/ }).click();
  await page.getByRole("radio", { name: "Sample Board B" }).click();
  await shot(page, "p-b0-setup-board-phone");
  await page.getByRole("button", { name: /Board B Sample Mathematics/ }).click();
  await page.getByRole("button", { name: "Start Grade 10" }).click();
  await page.getByRole("heading", { name: /^Grade 10 · / }).waitFor();
  await shot(page, "p-b1-dashboard-units-phone");
  await tile(page, "Algebra");
  await tile(page, "Quadratic equations");
  await shot(page, "p-b2-chapter-sections-phone");
  await tile(page, "Solving by factorisation");
  assert.match(await crumbs(page), /Mathematics.*Algebra.*Quadratic equations.*Solving by factorisation/s);
  await page.locator(".tile", { hasText: "Solve quadratic equations" }).first().waitFor();
  await shot(page, "p-b3-section-skills-phone");
  await home(page);
  // the gap: (x + a)(x + b) expanded with a × b as the x term
  const log = await recoverTyped(page, "expand (x+2)(x+6)", "product-for-sum");
  assert.ok(log.some((l) => l.startsWith("lesson:")), log.join(" "));
  await page.getByText("Solved after help", { exact: true }).waitFor();
  await shot(page, "p-b4-gap-repaired-phone");
  const recs = await records(page, learner);
  assert.ok(recs.some((r) => r.record === "teach" && r.competency === "MATH.algebra.identities"), "expanding brackets was taught");
  // and quadratics continues
  await home(page);
  await tile(page, "Algebra");
  await tile(page, "Quadratic equations");
  await openSkill(page, "Solving by factorisation", "Solve quadratic equations");
  const w = await work(page);
  assert.ok(w.length >= 2, w.join(" "));
  await context.close();
});

test("platform C: Grade 12 → Calculus → Integrals → Techniques of integration → capabilities; recovery to powers (Grade 7)", async () => {
  const { page, context, learner } = await learnerPage("Synthetic Grade 12 learner", "tablet");
  await setupYear(page, 12);
  await tile(page, "Calculus");
  await tile(page, "Integrals");
  await tile(page, "Techniques of integration");
  await tile(page, "Integrate by substitution and parts");
  await page.locator(".tile", { hasText: "Integrate by parts" }).getByText("No learning content yet").waitFor();
  await page.locator(".tile", { hasText: "Integrate by substitution" }).first().waitFor();
  await shot(page, "p-c1-capabilities-tablet");
  await home(page);
  await page.getByText("What OpenPath can teach from this textbook").click();
  await page.getByText(/No learning content yet: /).waitFor();
  await shot(page, "p-c2-coverage-tablet");
  const log = await recoverTyped(page, "integral from 0 to 2 of 2x(x^2+1) dx", "multiply-for-power");
  await page.getByText("Solved after help", { exact: true }).waitFor();
  await shot(page, "p-c3-solved-after-powers-tablet");
  const recs = await records(page, learner);
  assert.ok(recs.some((r) => r.record === "teach" && r.competency === "MATH.number.exponents"), `powers taught: ${log.join(" ")}`);
  assert.ok(recs.some((r) => r.record === "attempt" && r.context === "investigate:gen:subst:0,2,1,1"), "the wrong answer was investigated");
  await context.close();
});

const UNSEEN = `Sample Board C — Mathematics for Class 9 (synthetic test book, not a real board; CC0)
Subject: Mathematics
Academic year 2026–27
Part One: Algebra
Chapter 1: Brackets and powers (pages 1 to 24)
1.1 Expanding brackets (page 2)
By the end of this section learners can:
• expand brackets such as 3(x + 4) using the distributive property (page 3)
1.2 Powers (page 12)
By the end of this section learners can:
• work out powers such as 2⁵ (page 13)
Part Two: Geometry
Chapter 2: Constructions (pages 25 to 40)
By the end of this chapter learners can:
• construct the perpendicular bisector of a line segment (page 26)
• describe how a rainbow forms (page 30)
`;

test("platform E and F: an unseen textbook through the same screens; then the next year keeps the evidence", async () => {
  const { page, context, learner } = await learnerPage("Synthetic unseen-book learner");
  // a subject OpenPath does not support is said so, and cannot be used
  await setupYear(page, 9, { textbook: "Science for Class 9 (synthetic)\nSubject: Science\nChapter 1: Light (pages 1 to 9)\nLearners will be able to:\n- describe how a rainbow forms (page 2)\n" });
  await page.getByRole("alert").getByText(/Science is not supported in My Learning Year yet/).waitFor();
  assert.ok(await page.getByRole("button", { name: "Use this curriculum for Grade 9" }).isDisabled());
  await shot(page, "p-e0-unsupported-subject-phone");
  await page.reload();
  await setupYear(page, 9, { textbook: UNSEEN });
  await page.locator(".outcome", { hasText: "describe how a rainbow forms" }).getByText("No matching skill: kept as a proposal.").waitFor();
  await page.locator(".outcome", { hasText: "expand brackets" }).getByText(/Brackets and powers › Expanding brackets/).waitFor();
  await shot(page, "p-e1-unseen-review-phone");
  await page.getByRole("button", { name: "Use this curriculum for Grade 9" }).click();
  await page.getByRole("heading", { name: /^Grade 9 · / }).waitFor();
  await tile(page, "Algebra");
  await tile(page, "Brackets and powers");
  await tile(page, "Expanding brackets");
  await tile(page, "Expand simple products");
  assert.match(await crumbs(page), /Algebra.*Brackets and powers.*Expanding brackets.*Expand simple products/s);
  await page.getByText(/Awaiting educator review/).waitFor();
  await shot(page, "p-e2-unseen-skill-phone");
  await page.getByRole("button", { name: /^(Start|Continue)$/ }).click();
  const w = await work(page);
  assert.ok(w.length >= 3, w.join(" "));
  await home(page);
  // the unit is still learning: one of its two constituent skills (expanding, powers) is shown
  const unit = page.locator(".tile", { hasText: "Algebra" }).first();
  assert.equal(await unit.getAttribute("data-status"), "active");
  assert.match(await unit.getAttribute("aria-label"), /1 of 2/);
  await shot(page, "p-e3-unseen-shown-phone");
  // F: a year later, Grade 12 (2027-28): every record kept, the overdue delayed check first, the new book's tiles
  const before = (await records(page, learner)).length;
  await timeTravel(page, learner, 240);
  await page.reload();
  await page.getByRole("button", { name: "Start the next year" }).click();
  await page.getByRole("button", { name: /^Grade 12\b/ }).click();
  await page.getByRole("radio", { name: "2027-28" }).click();
  await page.getByRole("button", { name: "No goal for now" }).click();
  await page.getByRole("button", { name: /OpenPath Sample Mathematics, Grade 12/ }).click();
  await page.getByRole("button", { name: "Start Grade 12" }).click();
  await page.getByRole("heading", { name: "Grade 12 · 2027-28" }).waitFor();
  await page.getByRole("button", { name: "Start the delayed check" }).waitFor();
  await shot(page, "p-f1-next-year-delayed-check-phone");
  const after = await records(page, learner);
  assert.equal(after.length, before + 1, "one enrolment added; nothing removed");
  await page.getByRole("button", { name: "Earlier years" }).click();
  await page.getByText("Grade 9 · 2026-27").waitFor();
  await page.getByText("Grade 12 · 2027-28").waitFor();
  await context.close();
});
