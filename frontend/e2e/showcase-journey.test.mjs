/** The six curated Grade 10 lessons, signed in against real Django (synthetic learner): concept → worked example → the learner's
 *  attempt → the server's grading feedback → the next question. Screenshots of every stage for the human review. */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { question } from "../../packages/learning/src/content.ts";
import { exposureKey, FAMILIES, problemOf } from "../../packages/learning/src/families.ts";

const base = process.env.YEAR_URL ?? "http://127.0.0.1:4412";
const shots = process.env.SHOTS ?? "/tmp/showcase-journey";
mkdirSync(shots, { recursive: true });
const dataDir = new URL("../dist-english/curriculum/data/", import.meta.url);
const index = JSON.parse(readFileSync(new URL("index.json", dataDir), "utf8"));
const LESSONS = [
  ["euclid", "MATH.number.euclid-algorithm"],
  ["relations", "MATH.algebra.relations"],
  ["ap", "MATH.algebra.arithmetic-sequences"],
  ["discriminant", "MATH.algebra.quadratic-discriminant"],
  ["pythagoras", "MATH.geometry.pythagoras"],
  ["probability", "MATH.probability.classical"],
];
const releaseFor = (c) => index.releases.filter((e) => e.grade === 10).map((e) => ({ e, data: JSON.parse(readFileSync(new URL(e.file, dataDir), "utf8")) })).find((x) => x.data.competencies[c]?.module);
const wrongFor = (q) => {
  if (q.type === "choice") return q.answer === "A" ? "B" : "A";
  if (/^-?\d+$/.test(q.answer)) return String(Number(q.answer) + 1);
  const f = /^(\d+)\/(\d+)$/.exec(q.answer);
  if (f) return `${f[1]}/${Number(f[2]) + 1}`;
  return "1";
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
async function shot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => [...document.querySelectorAll(".enter")].every((el) => getComputedStyle(el).opacity === "1"));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no horizontal scroll`);
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

for (const width of [360, 393]) for (const [name, competency] of LESSONS) test(`${width}px ${name}: concept → worked example → attempt → server feedback → next`, async () => {
  const { e, data } = releaseFor(competency);
  const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const prefix = `${width}-${name}`;
  try {
    await page.goto(`${base}/year/`);
    await api(page, "/account/");
    assert.equal((await api(page, "/account/register/", { email: `showcase-${name}-${width}-${Date.now()}@example.org`, password: "synthetic-showcase-password", consent: true })).status, 201);
    const learner = (await api(page, "/pupils/", { display_name: "Synthetic showcase learner", consent: true })).data.id;
    const enrol = { kind: "learning_record", id: `enrol-${learner}`, at: new Date().toISOString(), learnerId: learner, sessionId: `learn:${learner}:setup`, record: "enrol", grade: 10, academicYear: "2026-27", curriculum: { id: data.release.id, version: data.release.version, hash: data.release.hash } };
    assert.equal((await api(page, `/pupils/${learner}/events/`, { subject: "mathematics", seq: 0, event: enrol })).status, 201);
    await page.goto(`${base}/curriculum/?learner=${learner}&view=learner#b=${e.board}&g=10&c=${encodeURIComponent(competency)}`);
    await page.getByRole("link", { name: "Start learning", exact: true }).click();
    await page.getByRole("article", { name: "Mathematics teaching and practice" }).waitFor();

    // concept, then the worked example straight after it, stepped through to its checked answer
    const roles = await page.locator(".teaching-block").evaluateAll((els) => els.map((el) => el.dataset.role));
    assert.equal(roles[0], "concept");
    const worked = page.locator(".teaching-block[data-verified='true']").first();
    const taught = problemOf(await worked.getAttribute("data-instance"));
    const example = worked.locator(".progressive-worked");
    while (await example.getByRole("button", { name: /Next step/ }).count()) await example.getByRole("button", { name: /Next step/ }).click();
    const body = await page.locator(".teaching-page").innerText();
    assert.doesNotMatch(body, /gen:|fingerprint|hash|certif|quarantin/i, "no engineering metadata");
    // each sentence once, each kind of picture once
    const lines = (await page.locator(".teaching-block > p").allTextContents()).map((t) => t.replace(/\d+/g, "#").trim()).filter(Boolean);
    assert.equal(new Set(lines).size, lines.length, `no repeated explanation: ${lines}`);
    const kinds = await page.locator(".teaching-block [data-kind]").evaluateAll((els) => els.map((el) => el.dataset.kind));
    assert.equal(new Set(kinds).size, kinds.length, `no repeated picture: ${kinds}`);
    assert.equal(await page.locator(".teaching-block[data-verified='false']").count(), 0, "no unchecked steps in a curated lesson");
    assert.equal(await page.locator(".teaching-intro").count(), 0, "the concept states the idea once");
    const used = (await page.locator(".teaching-block[data-instance]").evaluateAll((els) => els.map((el) => el.dataset.instance))).map(exposureKey);
    await shot(page, `${prefix}-1-teaching`);

    // the learner's attempt: a fresh question of the kind just taught
    await page.getByRole("button", { name: "Practice this concept", exact: true }).click();
    await page.getByRole("article", { name: "Curriculum practice" }).waitFor();
    const qid = await page.locator(".qcard[data-qid]").getAttribute("data-qid");
    const q = question(qid), p = problemOf(qid.replace(/:mc$/, ""));
    assert.equal(p.family, taught.family);
    const caseOf = FAMILIES.get(p.family).teach?.caseOf;
    if (caseOf) assert.equal(caseOf(p.params), caseOf(taught.params), `${qid} is the kind taught`);
    assert.ok(!used.includes(exposureKey(qid)), `${qid} is not a question the lesson already used`);
    const enter = async (v) => { if (q.type === "choice") await page.getByRole("radio").nth("ABCD".indexOf(v)).click(); else await page.getByRole("textbox", { name: "Your answer", exact: true }).fill(v); };
    await shot(page, `${prefix}-2-attempt`);

    // the server grades a wrong answer, then the right one
    await enter(wrongFor(q));
    const wrongSaved = page.waitForResponse((r) => r.url().includes(`/pupils/${learner}/events/`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    assert.equal((await wrongSaved).status(), 201);
    await page.getByText("Not this time.", { exact: true }).waitFor();
    await shot(page, `${prefix}-3-feedback-wrong`);
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await enter(q.answer);
    const rightSaved = page.waitForResponse((r) => r.url().includes(`/pupils/${learner}/events/`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    assert.equal((await rightSaved).status(), 201);
    await page.getByText("Right.", { exact: true }).waitFor();
    await shot(page, `${prefix}-4-feedback-right`);
    const attempts = (await api(page, `/pupils/${learner}/events/?subject=mathematics`)).data.events.filter((ev) => ev.record === "attempt");
    assert.deepEqual(attempts.map((a) => a.questionId), [qid, qid]);

    // the next activity
    await page.getByRole("button", { name: "Next question", exact: true }).click();
    await page.locator(".qcard[data-qid]").waitFor();
    assert.notEqual(exposureKey(await page.locator(".qcard").getAttribute("data-qid")), exposureKey(qid));
    await shot(page, `${prefix}-5-next`);
  } catch (error) {
    await page.screenshot({ path: `${shots}/${prefix}-failure.png`, fullPage: true });
    throw error;
  } finally {
    await context.close();
  }
});
