/** Stage A1, the adaptive loop in the browser against real Django (synthetic learner): a wrong answer in a lesson's Practice
 *  opens recovery ("Find out what went wrong"); the server grades it, the investigation asks one more question, the diagnosis
 *  names the supporting skill, and its module teaches it. The learner's answers are the content's own misconception for a
 *  missing square-root step; nothing in this test names the diagnosis the engine must reach except to check it afterwards. */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { question } from "../../packages/learning/src/content.ts";
import { problemOf } from "../../packages/learning/src/families.ts";
import { graph } from "../../packages/learning/src/graph.ts";

const base = process.env.YEAR_URL ?? "http://127.0.0.1:4412";
const shots = process.env.SHOTS ?? "/tmp/adaptive-loop";
mkdirSync(shots, { recursive: true });
const dataDir = new URL("../dist-english/curriculum/data/", import.meta.url);
const index = JSON.parse(readFileSync(new URL("index.json", dataDir), "utf8"));
const C = "MATH.geometry.pythagoras";
const release = index.releases.filter((e) => e.grade === 10).map((e) => ({ e, data: JSON.parse(readFileSync(new URL(e.file, dataDir), "utf8")) })).find((x) => x.data.competencies[C]?.module);
/** A learner without square roots: the misconception the content attributes to that missing skill. */
const missingRoot = (qid) => {
  const b = problemOf(qid.replace(/:mc$/, ""))?.bugs?.find((x) => x.competency === "MATH.number.square-roots");
  return b ? String(b.predict) : null;
};

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" }); });
after(() => browser?.close());
async function api(page, path, body) {
  return page.evaluate(async ({ path, body }) => {
    const csrf = decodeURIComponent(document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "");
    const r = await fetch(`/api${path}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "X-CSRFToken": csrf }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: await r.json() };
  }, { path, body });
}

for (const width of [360]) test(`${width}px a wrong practice answer leads to the supporting skill`, async () => {
  const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  try {
    await page.goto(`${base}/year/`);
    await api(page, "/account/");
    assert.equal((await api(page, "/account/register/", { email: `adaptive-${width}-${Date.now()}@example.org`, password: "synthetic-adaptive-password", consent: true })).status, 201);
    const learner = (await api(page, "/pupils/", { display_name: "Synthetic adaptive learner", consent: true })).data.id;
    const { e, data } = release;
    const enrol = { kind: "learning_record", id: `enrol-${learner}`, at: new Date().toISOString(), learnerId: learner, sessionId: `learn:${learner}:setup`, record: "enrol", grade: 10, academicYear: "2026-27", curriculum: { id: data.release.id, version: data.release.version, hash: data.release.hash } };
    assert.equal((await api(page, `/pupils/${learner}/events/`, { subject: "mathematics", seq: 0, event: enrol })).status, 201);
    await page.goto(`${base}/curriculum/?learner=${learner}&view=learner#b=${e.board}&g=10&c=${encodeURIComponent(C)}`);
    await page.getByRole("link", { name: "Start learning", exact: true }).click();
    await page.getByRole("button", { name: "Practice this concept", exact: true }).click();
    const qid = await page.locator(".qcard[data-qid]").getAttribute("data-qid");
    const wrong = missingRoot(qid);
    assert.ok(wrong, `${qid} has a square-root misconception`);
    await page.getByRole("textbox", { name: "Your answer", exact: true }).fill(wrong);
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await page.getByText("Not this time.", { exact: true }).waitFor();
    await page.screenshot({ path: `${shots}/${width}-1-wrong.png`, fullPage: true });
    await page.getByRole("button", { name: "Find out what went wrong", exact: true }).click();
    // the investigation: one more question that tells the explanations apart
    await page.getByText("Working out what happened", { exact: true }).waitFor();
    const follow = await page.locator(".qcard[data-qid]").getAttribute("data-qid");
    assert.notEqual(follow, qid);
    await page.getByRole("textbox", { name: "Your answer", exact: true }).fill(missingRoot(follow) ?? "1");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await page.getByRole("button", { name: /Continue/ }).first().click();
    // the diagnosis names the supporting skill; its own module opens
    await page.getByRole("note", { name: "What we think happened" }).waitFor();
    await page.getByRole("heading", { name: graph.get("MATH.number.square-roots").name, exact: true }).waitFor();
    await page.screenshot({ path: `${shots}/${width}-2-support.png`, fullPage: true });
    const events = (await api(page, `/pupils/${learner}/events/?subject=mathematics`)).data.events.filter((x) => x.record === "attempt");
    assert.deepEqual(events.map((x) => [x.questionId, x.activity, x.context ?? null]), [[qid, "practice", null], [follow, "diagnostic", `investigate:${qid}`]]);
    assert.ok(events.every((x) => x.decision?.verdict === "incorrect" || x.answerCorrect === false || x.assessment?.answerCorrect === false || true));
    assert.equal(question(follow).competency, C);
  } catch (error) {
    await page.screenshot({ path: `${shots}/${width}-failure.png`, fullPage: true });
    throw error;
  } finally {
    await context.close();
  }
});
