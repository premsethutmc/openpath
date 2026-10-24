/**
 * The Mathematics curriculum dashboard (/curriculum/): acceptance journeys A–N in a real browser against the real
 * Django API (YEAR_API=django in CI; the same servers as e2e/learning-year.test.mjs), at Android phone width.
 *
 * Learner evidence is created the way My Learning Year creates it: learning records POSTed to /api/pupils/<id>/events/
 * (the server checks each one and sets its time), answering what the shared engine asks next. Time moves only through
 * the server's TEST clock for synthetic pupils. The dashboard is the TEST BUILD (scripts/build-curriculum.mjs --test),
 * where questions count as reviewed so that "verified" can be shown; it says so on every screen. It writes nothing.
 *
 *   node --import tsx --test e2e/curriculum.test.mjs
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { moduleFor, question, questions } from "../../packages/learning/src/content.ts";
import { boardFor } from "../../packages/learning/src/curricula.ts";
import { evidenceFor, useReviewFixture } from "../../packages/learning/src/evidence.ts";
import { moduleState } from "../../packages/learning/src/intervention.ts";
import { readRecords } from "../../packages/learning/src/records.ts";
import { make } from "../../packages/learning/src/session.ts";

const base = process.env.YEAR_URL ?? "http://127.0.0.1:4190";
const mode = process.env.YEAR_API ?? "fake";
const fakeApi = process.env.FAKE_API ?? "http://127.0.0.1:8013";
const shots = process.env.SHOTS ?? fileURLToPath(new URL("../../docs/mathematics/dashboard-screens/", import.meta.url));
mkdirSync(shots, { recursive: true });
const PASSWORD = "synthetic-family-passphrase-dashboard";
const PHONE = { width: 360, height: 800 }; // a common Android phone width
// the test build's fixture, so this process derives the same next question the app would ask (TEST ONLY)
useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
const dataDir = new URL("../dist-english/curriculum/data/", import.meta.url);
const index = JSON.parse(readFileSync(new URL("index.json", dataDir), "utf8"));
const data = (board, grade) => JSON.parse(readFileSync(new URL(index.releases.find((e) => e.board === board && e.grade === grade).file, dataDir), "utf8"));

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
});
after(() => browser?.close());

async function call(page, path, body, method) {
  return page.evaluate(
    async ({ path, body, method }) => {
      const token = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "";
      const r = await fetch("/api" + path, { method: method ?? (body ? "POST" : "GET"), credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(token) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: r.status, data: r.status === 204 ? null : await r.json().catch(() => null) };
    },
    { path, body, method },
  );
}
/** A signed-in account (an educator at home or a parent) with synthetic pupils, on a phone. */
async function account(names) {
  const context = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto(base + "/curriculum/");
  await call(page, "/account/"); // the CSRF cookie
  const email = `dash-${Date.now()}-${Math.random().toString(36).slice(2)}@example.org`;
  assert.equal((await call(page, "/account/register/", { email, password: PASSWORD, consent: true })).status, 201);
  const pupils = {};
  for (const n of names) {
    const p = await call(page, "/pupils/", { display_name: n, consent: true });
    assert.equal(p.status, 201);
    pupils[n] = p.data.id;
  }
  return { page, context, pupils };
}
const events = async (page, id) => (await call(page, `/pupils/${id}/events/?subject=mathematics`)).data.events;
async function post(page, id, record) {
  const seq = (await call(page, `/pupils/${id}/events/?subject=mathematics`)).data.count;
  const r = await call(page, `/pupils/${id}/events/`, { subject: "mathematics", seq, event: record });
  assert.ok(r.status === 201 || r.status === 200, `record accepted (${r.status} ${JSON.stringify(r.data).slice(0, 200)})`);
}
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
const nowFor = (learner) => Date.now() + (ahead.get(learner) ?? 0) * 86_400_000;
/** Answer, through the API, whatever the shared engine asks next for one skill, until it stops asking. */
async function workSkill(page, learner, competency, session, max = 30) {
  for (let i = 0; i < max; i++) {
    const evs = await events(page, learner);
    const records = readRecords(learner, evs, []);
    const now = nowFor(learner);
    const ms = moduleState(competency, records, evidenceFor(learner, records, now).get(competency), now, session);
    const ctx = { learnerId: learner, sessionId: session, at: new Date(now).toISOString() };
    if (ms.phase === "chapter") await post(page, learner, make.teach(ctx, competency, ms.strategy.id, ms.decision?.diagnosis.kind ?? "diagnosis"));
    else if (ms.question) await post(page, learner, make.attempt(ctx, ms.question, question(ms.question).answer, ms.activity ?? (ms.phase === "retention" ? "retention" : ms.phase === "explore" ? "diagnostic" : ms.phase === "guided" ? "guided" : ms.phase === "check" ? "check" : "practice")));
    else return ms.phase;
  }
  return "max";
}
async function open(page, hash, learner, view) {
  const q = new URLSearchParams();
  if (learner) q.set("learner", learner);
  if (view) q.set("view", view);
  await page.goto(`${base}/curriculum/${q.size ? `?${q}` : ""}#${hash}`);
  await page.reload(); // a fresh visit (a hash-only change would keep the page and its loaded evidence)
  await page.locator(".scope-title, .detail h2").first().waitFor();
  if (learner) await page.locator("text=/evidence…/").waitFor({ state: "detached" }).catch(() => {});
}
const shot = async (page, name) => {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shots}${name}.png`, fullPage: true });
};
/** L: no horizontal overflow at phone width. */
async function noOverflow(page, where) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert.ok(sw <= iw, `${where}: no horizontal scroll (${sw} > ${iw})`);
}
/** Choose the learner and wait until their evidence is read (the state shown is then the learner's). */
async function pickLearner(page, L) {
  await page.getByRole("combobox").selectOption(L);
  await page.getByText(/evidence…/).waitFor({ state: "detached" });
  await page.locator(".state-card strong, .summary .meter-sub").first().waitFor();
  await page.waitForFunction(() => !document.querySelector(".summary")?.textContent?.includes("Choose a learner"));
}
const tileTitles = (page) => page.locator(".tiles > li .tile-title").allTextContents();
const summaryText = (page) => page.locator(".summary").innerText();

test("A + L: Grade 1 loads its chapters and competencies from the release (no setup), two columns at phone width", async () => {
  const { page, context } = await account([]);
  await open(page, "b=cbse&g=1");
  const d = data("cbse", 1);
  await page.getByRole("heading", { name: "Grade 1 Mathematics" }).waitFor();
  assert.deepEqual(await tileTitles(page), d.nodes.map((n) => n.title));
  const cols = await page.locator(".tiles").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  assert.equal(cols, 2, "two-column tiles on a phone");
  await noOverflow(page, "Grade 1");
  await page.locator(".tiles > li").first().getByRole("button").click();
  await page.getByRole("heading", { name: d.nodes[0].title }).waitFor();
  assert.ok((await page.locator(".tiles > li.k-competency").count()) > 0, "competency tiles inside the chapter");
  await noOverflow(page, "Grade 1 chapter");
  // natural back navigation
  await page.goBack();
  await page.getByRole("heading", { name: "Grade 1 Mathematics" }).waitFor();
  await context.close();
});

test("C + D + K: Grade 10 → Real Numbers and Grade 12 → Integrals: nested tiles, modules, assessment, coverage apart from mastery", async () => {
  const { page, context } = await account([]);
  await open(page, "b=cbse&g=10");
  await page.locator(".tiles > li", { hasText: "Real Numbers" }).getByRole("button").click();
  await page.getByRole("heading", { name: "Real Numbers" }).waitFor();
  const d10 = data("cbse", 10);
  const rn = d10.nodes.find((n) => n.title === "Real Numbers");
  assert.deepEqual(await tileTitles(page), rn.children.map((n) => n.title), "the release's own structure, in book order");
  assert.ok(await page.locator(".summary").getByText("Assessment coverage").count());
  assert.match(await summaryText(page), /Choose a learner/, "no learner: no progress is invented");
  await noOverflow(page, "Real Numbers");
  await shot(page, "grade10-real-numbers-phone");
  await page.locator(".tiles > li.k-competency").first().getByRole("button").click();
  await page.locator(".detail h2").waitFor();
  for (const h of ["Builds on", "Teaching module", "Assessment"]) await page.getByRole("heading", { name: h }).waitFor();
  await page.getByRole("button", { name: "Preview questions" }).click();
  await page.locator(".preview.qcard").waitFor();
  assert.match(await page.locator(".preview").innerText(), /nothing is recorded/);
  await noOverflow(page, "competency detail");
  await shot(page, "grade10-real-numbers-competency-phone");

  await open(page, "b=cbse&g=12");
  await page.locator(".tiles > li", { hasText: /^Integrals/ }).first().getByRole("button").click();
  await page.getByRole("heading", { name: /^Integrals$/ }).waitFor();
  assert.ok((await page.locator(".tiles > li.k-section").count()) > 0, "nested sections");
  await shot(page, "grade12-integrals-phone");
  await page.locator(".tiles > li.k-section").first().getByRole("button").click();
  await page.locator(".tiles > li.k-competency").first().waitFor();
  await page.locator(".tiles > li.k-competency").first().getByRole("button").click();
  await page.getByRole("heading", { name: "Assessment" }).waitFor();
  assert.match(await page.locator(".detail").innerText(), /question famil/);
  await noOverflow(page, "Grade 12 competency");
  await shot(page, "grade12-integrals-competency-phone");
  await context.close();
});

test("E–I + K + N: a learner's evidence through Django: unassessed, a lesson, shown, seven full days, verified; a method skill needs a mark; counted once", async () => {
  const { page, context, pupils } = await account(["Synthetic Meena"]);
  const L = pupils["Synthetic Meena"];
  const ctx = { learnerId: L, sessionId: `learn:${L}:dash-s1`, at: new Date().toISOString() };
  await post(page, L, make.enrol(ctx, 10, "2026-27", boardFor("cbse", 10)));
  const d10 = data("cbse", 10);
  const rn = d10.nodes.find((n) => n.title === "Real Numbers");
  const places = new Map();
  const walk = (n) => (n.kind === "competency" ? places.set(n.competency, (places.get(n.competency) ?? 0) + 1) : n.children.forEach(walk));
  rn.children.forEach(walk);
  const ownWritten = (c) => new Set(d10.competencies[c].written.map((w) => w.id));
  const method = (c) => Object.values(d10.outcomes).some((o) => o.method && o.competencies.includes(c) && o.written.some((w) => ownWritten(c).has(w)));
  // a skill marked from final answers, and a skill whose outcome here asks for a method (and appears twice in the chapter)
  const SKILL = [...places.keys()].find((c) => !method(c) && d10.competencies[c].module?.counts.retention);
  const METHOD = [...places.keys()].find((c) => method(c) && places.get(c) > 1 && d10.competencies[c].module?.counts.retention);
  assert.ok(SKILL && METHOD, `skills to follow (${SKILL}, ${METHOD})`);
  const pick = () => pickLearner(page, L);

  // E: an educator chooses a learner with no evidence: not assessed, nothing green or orange
  await open(page, "b=cbse&g=10", L);
  await pick();
  await page.locator(".summary").getByText("Not assessed").waitFor();
  assert.equal(await page.locator(".tile.m-verified, .tile.m-progress").count(), 0);
  const coverageBefore = await page.locator(".meter.coverage").innerText();
  await shot(page, "grade10-learner-unassessed-phone");

  // F: a lesson read to its end is exposure, never verification
  await post(page, L, make.teach(ctx, SKILL, moduleFor(SKILL).strategies[0].id, "diagnosis"));
  await open(page, `b=cbse&g=10&c=${encodeURIComponent(SKILL)}`, L);
  await pick();
  await page.locator(".state-card .state-word", { hasText: /^Learning$/ }).waitFor();
  assert.equal(await page.locator(".state-card.m-verified").count(), 0);

  // G: a later visit, shown on its own (independent answers): awaiting verification, not green
  for (const c of [SKILL, METHOD]) assert.ok(["pause", "done"].includes(await workSkill(page, L, c, `learn:${L}:dash-s1b`)));
  await page.reload();
  await pick();
  await page.locator(".state-card .state-word", { hasText: "Shown, awaiting verification" }).waitFor();
  assert.equal(await page.locator(".state-card.m-verified").count(), 0);
  await timeTravel(page, L, 6);
  await page.reload();
  await pick();
  await page.locator(".state-card .state-word", { hasText: "Shown, awaiting verification" }).waitFor();
  assert.equal(await page.locator(".state-card.m-verified").count(), 0, "not green before seven full days");

  // H: after seven full days the delayed check verifies the final-answer skill
  await timeTravel(page, L, 2);
  for (const c of [SKILL, METHOD]) await workSkill(page, L, c, `learn:${L}:dash-s2`);
  await page.reload();
  await pick();

  await page.locator(".state-card.m-verified .state-word", { hasText: /^Verified$/ }).waitFor();
  await shot(page, "grade10-verified-competency-phone");
  // the method skill: right answers and a passed delayed check, but its outcome asks for a method an educator marks
  await open(page, `b=cbse&g=10&c=${encodeURIComponent(METHOD)}`, L);
  await pick();
  await page.locator(".state-card .state-word", { hasText: "Shown, awaiting verification" }).waitFor();
  await page.locator(".state-card").getByText(/written answer/).waitFor();
  assert.equal(await page.locator(".state-card.m-verified").count(), 0, "final answers alone never verify a method outcome");

  // I: the chapter counts each skill once (the method skill sits in the chapter and again in a section)
  await open(page, `b=cbse&g=10&n=${encodeURIComponent(rn.id)}`, L);
  await pick();
  const summary = await summaryText(page);
  assert.match(summary, new RegExp(`1 of ${places.size}\\b`));
  assert.match(summary, /1 awaiting verification/, "the skill placed twice is one record");
  // the grade: one verified among the grade's unique competencies; the chapter is not green until all of it is
  await open(page, "b=cbse&g=10", L);
  await pick();
  const gradeUnique = index.releases.find((e) => e.board === "cbse" && e.grade === 10).competencies.length;
  assert.match(await summaryText(page), new RegExp(`1 of ${gradeUnique}\\b`));
  const chapterTile = page.locator(".tiles > li", { hasText: "Real Numbers" });
  assert.match(await chapterTile.innerText(), new RegExp(`1/${places.size} verified`));
  assert.ok(await chapterTile.evaluate((el) => el.classList.contains("m-progress")));
  // K: coverage is the same with and without the learner's evidence
  assert.equal(await page.locator(".meter.coverage").innerText(), coverageBefore);
  await shot(page, "grade10-with-learner-phone");

  // N: another board and grade: that release's chapters and its own totals, nothing carried over
  await page.getByRole("button", { name: "Tamil Nadu" }).click();
  await page.getByRole("button", { name: "Grade 9", exact: true }).click();
  const tn9 = data("tn", 9);
  await page.getByRole("heading", { name: "Grade 9 Mathematics" }).waitFor();
  await page.waitForFunction((n) => document.querySelectorAll(".tiles > li").length === n, tn9.nodes.length);
  assert.deepEqual(await tileTitles(page), tn9.nodes.map((n) => n.title));
  const tnUnique = index.releases.find((e) => e.board === "tn" && e.grade === 9).competencies;
  const verifiedHere = tnUnique.includes(SKILL) ? 1 : 0;
  const shownHere = tnUnique.includes(METHOD) ? 1 : 0;
  if (!verifiedHere && !shownHere) await page.locator(".summary").getByText("Not assessed").waitFor();
  else assert.match(await summaryText(page), new RegExp(`${verifiedHere} of ${tnUnique.length}\\b`));
  await noOverflow(page, "TN Grade 9 with a learner");
  await context.close();
});

test("B: a Grade 5 learner sees their own year and goal foundations, nothing from later grades", async () => {
  const { page, context, pupils } = await account(["Synthetic Arun"]);
  const L = pupils["Synthetic Arun"];
  const ctx = { learnerId: L, sessionId: `learn:${L}:dash-b`, at: new Date().toISOString() };
  await post(page, L, make.enrol(ctx, 5, "2026-27", boardFor("cbse", 5)));
  await post(page, L, make.goal(ctx, "jee-advanced"));
  await open(page, "b=cbse&g=12", L, "learner");
  await page.getByRole("heading", { name: "Grade 5 Mathematics" }).waitFor();
  assert.equal(await page.getByRole("group", { name: "Grade" }).count(), 0, "a learner does not browse other grades");
  await page.locator(".goals").getByText(/Goal: /).waitFor();
  const d5 = data("cbse", 5);
  assert.deepEqual(await tileTitles(page), d5.nodes.map((n) => n.title));
  const text = await page.locator("main").innerText();
  for (const advanced of ["Integrals", "Quadratic", "Grade 12", "Exam plan"]) assert.ok(!text.includes(advanced), `nothing advanced at Grade 5: ${advanced}`);
  await noOverflow(page, "Grade 5 learner");
  await shot(page, "grade5-mathematics-learner-phone");
  await page.locator(".tiles > li").first().getByRole("button").click();
  await page.locator(".topic-plan").waitFor();
  await context.close();
});

test("J: arranging tiles changes only the order on this device: the curriculum and evidence stay the same", async () => {
  const { page, context, pupils } = await account(["Synthetic Kavya"]);
  const L = pupils["Synthetic Kavya"];
  await post(page, L, make.enrol({ learnerId: L, sessionId: `learn:${L}:dash-j`, at: new Date().toISOString() }, 10, "2026-27", boardFor("cbse", 10)));
  const before = JSON.stringify(await events(page, L));
  await open(page, "b=cbse&g=10", L);
  await pickLearner(page, L);
  const book = await tileTitles(page);
  const summary = await summaryText(page);
  await page.getByRole("button", { name: "Arrange tiles" }).click();
  await page.getByRole("button", { name: `Move ${book[1]} earlier` }).click();
  await page.getByRole("button", { name: "Done arranging" }).click();
  const moved = await tileTitles(page);
  assert.deepEqual(moved.slice(0, 2), [book[1], book[0]]);
  assert.deepEqual([...moved].sort(), [...book].sort(), "the same chapters");
  await page.reload();
  await pickLearner(page, L);
  assert.deepEqual((await tileTitles(page)).slice(0, 2), [book[1], book[0]], "kept on this device");
  assert.equal(await summaryText(page), summary, "the totals are unchanged");
  assert.equal(JSON.stringify(await events(page, L)), before, "no record written");
  await page.getByRole("button", { name: "Arrange tiles" }).click();
  await page.getByRole("button", { name: "Back to book order" }).click();
  assert.deepEqual(await tileTitles(page), book);
  await context.close();
});

test("M: a partially covered outcome stays partial on its tile and in its chapter's coverage", async () => {
  const { page, context } = await account([]);
  // the first board grade with a chapter that holds a partial outcome (from the compiler's output)
  let hit = null;
  for (const e of index.releases) {
    const d = data(e.board, e.grade);
    const partial = new Set(Object.values(d.outcomes).filter((o) => o.class === "partial").map((o) => o.id));
    const outs = (n) => [...(n.outcomes ?? []), ...n.children.flatMap(outs)];
    const ch = d.nodes.find((n) => outs(n).some((o) => partial.has(o)));
    if (ch) {
      hit = { e, ch };
      break;
    }
  }
  assert.ok(hit, "the repository has partially covered outcomes");
  await open(page, `b=${hit.e.board}&g=${hit.e.grade}`);
  const tile = page.locator(".tiles > li", { hasText: hit.ch.title }).first();
  await tile.getByText("Partial").waitFor();
  await tile.getByRole("button").click();
  const cov = await page.locator(".meter.coverage").innerText();
  assert.match(cov, /[1-9]\d* partial/);
  assert.doesNotMatch(cov, /^Assessment coverage\s*100%/);
  await context.close();
});
