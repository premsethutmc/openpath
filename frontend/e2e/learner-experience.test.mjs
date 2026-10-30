/** The mathematics learner experience at phone width, real Django, synthetic accounts only:
 *  Curriculum → Grade 10 → Real Numbers → Euclid's algorithm → lesson page → Learn (worked example) → Practice → Assessment → resume,
 *  Tamil Nadu Grade 10 Relations with its three-step worked example, and no engineering diagnostics in the learner view. */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { question } from "../../packages/learning/src/content.ts";

const base = process.env.YEAR_URL ?? "http://127.0.0.1:4412";
const shots = process.env.SHOTS ?? "/tmp/learner-experience";
mkdirSync(shots, { recursive: true });
const dataDir = new URL("../dist-english/curriculum/data/", import.meta.url);
const index = JSON.parse(readFileSync(new URL("index.json", dataDir), "utf8"));
const release = (board, grade) => JSON.parse(readFileSync(new URL(index.releases.find((e) => e.board === board && e.grade === grade).file, dataDir), "utf8"));
const pathTo = (nodes, competency, path = []) => {
  for (const node of nodes) {
    const next = [...path, node];
    if (node.competency === competency) return next;
    const found = pathTo(node.children ?? [], competency, next);
    if (found) return found;
  }
  return null;
};
// what a learner must never be shown: engineering, review and certification metadata (kept in the diagnostics view)
const ENGINEERING = /question famil|generated|problems\)|educator-approved|educator review|Assessment coverage|curriculum outcomes|engineering|fingerprint|hash|MATH\.[a-z]|@1\.\d|Details: ids|release manager|Not assessed|checked worked example is not available|kernel|competencies/i;

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
async function learnerFor(page, board, grade, label) {
  await page.goto(`${base}/year/`);
  await api(page, "/account/");
  assert.equal((await api(page, "/account/register/", { email: `learner-${label}-${Date.now()}@example.org`, password: "synthetic-learner-experience-password", consent: true })).status, 201);
  const pupil = await api(page, "/pupils/", { display_name: "Synthetic Grade 10 learner", consent: true });
  assert.equal(pupil.status, 201);
  const L = pupil.data.id, r = release(board, grade);
  const enrol = { kind: "learning_record", id: `enrol-${L}`, at: new Date().toISOString(), learnerId: L, sessionId: `learn:${L}:setup`, record: "enrol", grade, academicYear: "2026-27", curriculum: { id: r.release.id, version: r.release.version, hash: r.release.hash } };
  assert.equal((await api(page, `/pupils/${L}/events/`, { subject: "mathematics", seq: 0, event: enrol })).status, 201);
  return { L, r };
}
const learnerText = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
async function noEngineering(page, where) {
  const text = await learnerText(page);
  const hit = text.match(ENGINEERING);
  assert.equal(hit, null, `${where}: engineering detail shown to a learner: "${hit?.[0]}" in …${text.slice(Math.max(0, (hit?.index ?? 0) - 60), (hit?.index ?? 0) + 60)}…`);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${where}: no horizontal overflow`);
}
async function openTile(page, title) {
  await page.locator(".tiles > li").filter({ has: page.locator(".tile-title", { hasText: title }) }).getByRole("button").first().click();
}

for (const width of [360, 393]) test(`${width}px CBSE Grade 10: Real Numbers → Euclid's algorithm → Learn → worked example → Practice → Assessment → resume`, async () => {
  const context = await browser.newContext({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    const { L, r } = await learnerFor(page, "cbse", 10, `cbse-${width}`);
    // the curriculum opens on the learner's own year (one learner on the account: no picker, no diagnostics)
    await page.goto(`${base}/curriculum/`);
    await page.getByRole("heading", { name: "Grade 10 Mathematics", exact: true }).waitFor();
    await page.getByText(/Loading .*evidence/).waitFor({ state: "detached" });
    await page.getByRole("progressbar", { name: "Skills mastered" }).waitFor();
    await noEngineering(page, "grade");
    assert.equal(await page.getByRole("link", { name: "Educator diagnostics" }).count(), 0, "no diagnostics control without an educator or developer role");
    // where to start is the first thing on the page: the next lesson in book order, one action
    const first = page.locator(".topic-plan").getByRole("link", { name: "Start learning", exact: true });
    const firstBox = await first.boundingBox();
    assert.ok(firstBox && firstBox.y + firstBox.height <= 780, "the grade page shows Start learning without scrolling");
    await page.screenshot({ path: `${shots}/${width}-1-grade.png`, fullPage: true });

    const comp = "MATH.number.euclid-algorithm", path = pathTo(r.nodes, comp);
    assert.equal(path[0].title, "Real Numbers");
    for (const node of path) await openTile(page, node.title);
    // the lesson page: heading, objective, status, and Start learning above the fold
    const lesson = page.getByRole("article", { name: "Lesson" });
    await lesson.waitFor();
    await page.getByRole("heading", { name: r.competencies[comp].name, exact: true }).waitFor();
    const start = page.getByRole("link", { name: "Start learning", exact: true });
    const box = await start.boundingBox();
    assert.ok(box && box.y + box.height <= 780, `Start learning is visible without scrolling (y=${box?.y})`);
    assert.deepEqual(await page.getByRole("list", { name: "How this lesson works" }).locator("strong").allTextContents(), ["Learn", "Practice", "Assessment"]);
    await noEngineering(page, "lesson page");
    await page.screenshot({ path: `${shots}/${width}-2-lesson.png`, fullPage: true });

    // Learn: the teaching-first lesson, with the stages visible and a worked example revealed step by step
    await start.click();
    await page.getByRole("article", { name: "Mathematics teaching and practice" }).waitFor();
    const stages = page.getByRole("list", { name: "Lesson stages" });
    assert.equal(await stages.getByRole("button", { name: /Learn/ }).getAttribute("aria-current"), "step");
    const example = page.locator(".progressive-worked").first(); // stage 2: the worked example may follow the concept section
    await example.getByRole("button", { name: /Next step/ }).click();
    assert.equal(await example.locator(".worked-step").count(), 1);
    await noEngineering(page, "teaching");
    await page.screenshot({ path: `${shots}/${width}-3-learn.png`, fullPage: true });

    // Practice: guided questions with hints and feedback; the answer is saved and graded by the server
    await stages.getByRole("button", { name: /Practice/ }).click();
    await page.getByRole("article", { name: "Curriculum practice" }).waitFor();
    const qid = await page.locator(".qcard[data-qid]").getAttribute("data-qid");
    const q = question(qid);
    if (q.type === "choice") await page.getByRole("radio").nth("ABCD".indexOf(q.answer)).click();
    else await page.getByRole("textbox", { name: "Your answer", exact: true }).fill(q.answer);
    const saved = page.waitForResponse((res) => res.url().includes(`/pupils/${L}/events/`) && res.request().method() === "POST");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    assert.equal((await saved).status(), 201);
    await page.locator(".feedback").first().waitFor();
    await page.screenshot({ path: `${shots}/${width}-4-practice.png`, fullPage: true });

    // Assessment: the engine-directed questions on your own (the existing module), and back to the lesson
    await page.getByRole("list", { name: "Lesson stages" }).getByRole("button", { name: /Assessment/ }).click();
    await page.getByRole("list", { name: "Steps of this skill" }).waitFor();
    await page.screenshot({ path: `${shots}/${width}-5-assessment.png`, fullPage: true });
    await page.getByRole("button", { name: "← Back" }).click();
    await page.getByRole("article", { name: "Curriculum practice" }).waitFor();

    // resume: a reload keeps the stage, and the lesson page now says Continue learning
    await page.reload();
    await page.getByRole("article", { name: "Curriculum practice" }).waitFor();
    await page.goto(`${base}/curriculum/#b=cbse&g=10&c=${encodeURIComponent(comp)}`);
    await page.getByText(/Loading .*evidence/).waitFor({ state: "detached" });
    await page.getByRole("link", { name: "Continue learning", exact: true }).waitFor();
    assert.match(await page.locator(".state-card").innerText(), /1 answer so far/);
    assert.equal(await page.locator(".state-card.m-verified").count(), 0, "one practice answer is not mastery");
    await page.getByRole("link", { name: "Continue learning", exact: true }).click();
    await page.getByRole("article", { name: "Curriculum practice" }).waitFor();

    // the diagnostics view is not available to a learner's account, even by URL
    await page.goto(`${base}/curriculum/?view=diagnostics#b=cbse&g=10&c=${encodeURIComponent(comp)}`);
    await page.getByRole("article", { name: "Lesson" }).waitFor();
    await noEngineering(page, "diagnostics URL without a role");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

for (const width of [360, 393]) test(`${width}px Tamil Nadu Grade 10 Relations: Start learning → the three-step worked example`, async () => {
  const context = await browser.newContext({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  try {
    const { r } = await learnerFor(page, "tn", 10, `tn-${width}`);
    await page.goto(`${base}/curriculum/`);
    await page.getByRole("heading", { name: "Grade 10 Mathematics", exact: true }).waitFor();
    await page.getByText(/Loading .*evidence/).waitFor({ state: "detached" });
    for (const node of pathTo(r.nodes, "MATH.algebra.relations")) await openTile(page, node.title);
    await page.getByRole("article", { name: "Lesson" }).waitFor();
    await noEngineering(page, "TN lesson page");
    await page.getByRole("link", { name: "Start learning", exact: true }).click();
    await page.getByRole("article", { name: "Mathematics teaching and practice" }).waitFor();
    const example = page.locator(".progressive-worked").first(); // stage 2: the worked example may follow the concept section
    while (await example.getByRole("button", { name: /Next step/ }).count()) await example.getByRole("button", { name: /Next step/ }).click();
    assert.deepEqual((await example.locator(".step-expression").allTextContents()).map((t) => t.trim()), ["n(A × B) = n(A) × n(B)", "6 = 3 × n(B)", "6 ÷ 3 = 2"]);
    await noEngineering(page, "TN teaching");
    await page.screenshot({ path: `${shots}/${width}-tn-relations.png`, fullPage: true });
  } finally {
    await context.close();
  }
});
