/** Authenticated curriculum → teaching-first → canonical practice/ledger, against real Django. */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.YEAR_URL ?? "http://127.0.0.1:4412";
const shots = process.env.SHOTS ?? "/tmp/teaching-first-learner";
mkdirSync(shots, { recursive: true });
const dataDir = new URL("../dist-english/curriculum/data/", import.meta.url);
const index = JSON.parse(readFileSync(new URL("index.json", dataDir), "utf8"));
const cases = [
  { board: "tn", grade: 10, competency: "MATH.algebra.relations", name: "tn-grade10" },
  { board: "cbse", grade: 7, competency: "MATH.number.integer-add", name: "cbse-grade7" },
];
const pathTo = (nodes, competency, path = []) => {
  for (const node of nodes) {
    const next = [...path, node];
    if (node.competency === competency) return next;
    const found = pathTo(node.children ?? [], competency, next);
    if (found) return found;
  }
  return null;
};
const answerOf = (qid) => {
  const match = qid.match(/^gen:(aocart|aiint):(-?\d+),(-?\d+),(\d+)/);
  assert.ok(match, `acceptance example uses a supported deterministic family: ${qid}`);
  const [, family, a, b, mode] = match;
  const [x, y, operation] = [Number(a), Number(b), Number(mode)];
  return String(family === "aocart" ? (operation === 2 ? y : x * y) : operation ? x - y : x + y);
};
const misconceptionAnswerOf = (qid) => {
  const match = qid.match(/^gen:(aocart|aiint):(-?\d+),(-?\d+),(\d+)/);
  assert.ok(match);
  const [, family, a, b, mode] = match;
  const [x, y, operation] = [Number(a), Number(b), Number(mode)];
  return String(family === "aocart" && operation === 2 ? x * y - x : family === "aiint" && operation === 1 && y < 0 ? x + y : Number(answerOf(qid)) + 7);
};
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" }); });
after(() => browser?.close());

async function api(page, path, body) {
  return page.evaluate(async ({ path, body }) => {
    const csrf = decodeURIComponent(document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "");
    const response = await fetch(`/api${path}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "X-CSRFToken": csrf }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }, { path, body });
}
async function screenshot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => [...document.querySelectorAll(".enter")].every((element) => getComputedStyle(element).opacity === "1"));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

for (const width of [360, 393]) for (const sample of cases) test(`${width}px ${sample.name}: curriculum → teaching → saved practice → resume`, async () => {
  const context = await browser.newContext({ viewport: { width, height: 820 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  try {
    await page.goto(`${base}/year/`);
    await api(page, "/account/");
    assert.equal((await api(page, "/account/register/", { email: `teaching-${sample.name}-${width}-${Date.now()}@example.org`, password: "synthetic-teaching-journey-password", consent: true })).status, 201);
    const pupil = await api(page, "/pupils/", { display_name: "Synthetic mathematics learner", consent: true });
    assert.equal(pupil.status, 201);
    const learner = pupil.data.id;
    const entry = index.releases.find((item) => item.board === sample.board && item.grade === sample.grade);
    const data = JSON.parse(readFileSync(new URL(entry.file, dataDir), "utf8"));
    const enrol = { kind: "learning_record", id: `enrol-${learner}`, at: new Date().toISOString(), learnerId: learner, sessionId: `learn:${learner}:setup`, record: "enrol", grade: sample.grade, academicYear: "2026-27", curriculum: { id: data.release.id, version: data.release.version, hash: data.release.hash } };
    assert.equal((await api(page, `/pupils/${learner}/events/`, { subject: "mathematics", seq: 0, event: enrol })).status, 201);
    const path = pathTo(data.nodes, sample.competency);
    assert.ok(path, "selected competency is present in the real curriculum release");
    await page.goto(`${base}/curriculum/?learner=${learner}&view=learner`);
    await page.getByRole("heading", { name: `Grade ${sample.grade} Mathematics`, exact: true }).waitFor();
    await page.getByText(/Loading .*evidence/).waitFor({ state: "detached" });
    for (const node of path) await page.locator(".tiles > li").filter({ has: page.locator(".tile-title", { hasText: node.title }) }).getByRole("button").first().click();

    await page.getByRole("article", { name: "Mathematics teaching and practice" }).waitFor();
    assert.ok(await page.locator(".pair-visual, .movement-line").first().isVisible());
    const firstExample = page.locator(".teaching-block").first().locator(".progressive-worked");
    await firstExample.getByRole("button", { name: /Next step/ }).click();
    await screenshot(page, `${width}-${sample.name}-learner-teaching`);
    await page.reload();
    await page.getByRole("article", { name: "Mathematics teaching and practice" }).waitFor();
    assert.equal(await page.locator(".teaching-block").first().locator(".worked-step").count(), 1, "worked-step progress resumes");

    await page.getByRole("button", { name: "Practice this concept", exact: true }).click();
    await page.getByRole("article", { name: "Curriculum practice" }).waitFor();
    const qid = await page.locator(".qcard[data-qid]").getAttribute("data-qid");
    assert.match(qid, sample.board === "tn" ? /^gen:aocart:/ : /^gen:aiint:/);
    const answer = answerOf(qid);
    const wrong = misconceptionAnswerOf(qid);
    await page.getByRole("textbox", { name: "Your answer", exact: true }).fill(wrong);
    const wrongSaved = page.waitForResponse((response) => response.url().includes(`/pupils/${learner}/events/`) && response.request().method() === "POST");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    assert.equal((await wrongSaved).status(), 201);
    await page.getByText("Not this time.", { exact: true }).waitFor();
    assert.match(await page.locator(".feedback.bad").innerText(), sample.board === "tn" ? /subtracted.*divide/i : /subtracting a negative.*adding its opposite/i);
    await screenshot(page, `${width}-${sample.name}-learner-mistake`);
    await page.getByRole("button", { name: "Give me a hint", exact: true }).click();
    await page.getByRole("complementary", { name: "Contextual help" }).waitFor();
    await page.getByRole("textbox", { name: "Your answer", exact: true }).fill(answer);
    const rightSaved = page.waitForResponse((response) => response.url().includes(`/pupils/${learner}/events/`) && response.request().method() === "POST");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    assert.equal((await rightSaved).status(), 201);
    await page.getByText("Right.", { exact: true }).waitFor();
    await screenshot(page, `${width}-${sample.name}-learner-corrected`);
    await page.reload();
    await page.getByText("Right.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Next question", exact: true }).click();
    await page.locator(".qcard[data-qid]").waitFor();
    const next = await page.locator(".qcard").getAttribute("data-qid");
    assert.notEqual(next.replace(/:mc$/, ""), qid.replace(/:mc$/, ""));
    await page.getByRole("button", { name: /Teaching/ }).click();
    await page.getByRole("article", { name: "Mathematics teaching and practice" }).waitFor();
    await page.getByRole("button", { name: "Practice this concept", exact: true }).click();
    assert.equal(await page.locator(".qcard").getAttribute("data-qid"), next, "returning to teaching preserves the current question");

    const events = (await api(page, `/pupils/${learner}/events/?subject=mathematics`)).data.events;
    const attempts = events.filter((event) => event.record === "attempt" && event.questionId === qid);
    assert.equal(attempts.length, 2);
    assert.ok(attempts[1].hints > 0, "corrected attempt remains assisted");
    await page.goto(`${base}/curriculum/?learner=${learner}&view=learner#b=${sample.board}&g=${sample.grade}&c=${encodeURIComponent(sample.competency)}`);
    await page.getByRole("heading", { name: data.competencies[sample.competency].name, exact: true }).waitFor();
    assert.equal(await page.locator(".state-card.m-verified").count(), 0, "provisional helped practice does not grant mastery");
  } finally {
    await context.close();
  }
});
