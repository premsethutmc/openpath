/**
 * Educator hand-off (written@1, keyboard-offer@1) through the real UI against the real Django API: a learner on a phone
 * hands in a written answer in fractions, algebra and geometry; the parent shares written work; an educator on a desktop
 * follows the link the app gives (/review/#marking), signs in, marks the answer; the learner reloads, sees the mark and
 * carries on. A drawn task (not available with keyboard input) is never offered, so it is no longer a dead end.
 * Marking is a mark on one learner answer: no content is approved, review states stay as they are.
 *
 *   YEAR_URL=http://127.0.0.1:4190 YEAR_MANAGE="python backend/manage.py" node --import tsx --test e2e/educator-marking.test.mjs
 *
 * Synthetic accounts and learners only. Screenshots go to SHOTS (default ../docs/educator-marking/screens).
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { question } from "../../packages/learning/src/content.ts";
import { writtenTask } from "../../packages/learning/src/written.ts";

const base = process.env.YEAR_URL ?? "http://127.0.0.1:4190";
const MANAGE = process.env.YEAR_MANAGE ?? "python3 backend/manage.py";
const shots = process.env.SHOTS ?? fileURLToPath(new URL("../../docs/educator-marking/screens/", import.meta.url));
mkdirSync(shots, { recursive: true });
const root = fileURLToPath(new URL("../../", import.meta.url));
const PASSWORD = "synthetic-family-passphrase-marking";
const ANSWER = "Each step with its reason: the parts are matched in order, and the rule named is the one the given facts satisfy.";
const drawn = (qid) => writtenTask(qid)?.answer === "drawing";

let browser, educator;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH || undefined });
  // the educator: an ordinary account, granted the educator role by the explicit management command
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + "/review/#marking");
  await page.getByRole("heading", { name: "Sign in to mark written answers" }).waitFor();
  const email = `educator-${Date.now()}@example.org`;
  assert.equal((await call(page, "/account/register/", { email, password: PASSWORD, consent: true })).status, 201);
  await call(page, "/account/logout/", {});
  execSync(`${MANAGE} content_reviewer grant ${email} --role educator`, { cwd: root, stdio: "pipe", shell: "/bin/bash" });
  await ctx.close();
  educator = email;
});
after(() => browser?.close());

async function call(page, path, body) {
  return page.evaluate(async ({ path, body }) => {
    if (!document.cookie.includes("csrftoken")) await fetch("/api/account/", { credentials: "same-origin" });
    const token = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "";
    const r = await fetch("/api" + path, { method: body ? "POST" : "GET", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(token) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: await r.json().catch(() => null) };
  }, { path, body });
}
const fits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/** A parent account with one synthetic learner, signed in on a phone, with the year set up through the UI. */
async function learnerPhone(grade) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + "/year/");
  await page.getByRole("heading", { name: "Sign in to OpenPath" }).waitFor();
  const email = `parent-${Date.now()}-${Math.random().toString(36).slice(2)}@example.org`;
  assert.equal((await call(page, "/account/register/", { email, password: PASSWORD, consent: true })).status, 201);
  const pupil = await call(page, "/pupils/", { display_name: "Asha", consent: true });
  assert.equal(pupil.status, 201);
  await page.goto(`${base}/year/?learner=${pupil.data.id}`);
  await page.getByRole("heading", { name: /Set up My Learning Year/ }).waitFor();
  await page.getByRole("button", { name: new RegExp(`^Grade ${grade}\\b`) }).click();
  await page.getByRole("button", { name: "No goal for now" }).click();
  await page.getByRole("button", { name: /Sample Mathematics|OpenPath Sample/i }).first().click();
  await page.getByRole("button", { name: `Start Grade ${grade}` }).click();
  await page.getByRole("heading", { name: new RegExp(`^Grade ${grade} · `) }).waitFor();
  return { page, context, learner: pupil.data.id, errors };
}
const openSkill = (L, skill) => L.page.goto(`${base}/year/?learner=${L.learner}&skill=${encodeURIComponent(skill)}`);

/** Work the module on screen (right answers) until a written task is on screen or the module stops; returns the written qid. */
async function toWritten(page, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.waitForFunction(() => document.querySelector(".qcard, .lesson, .feedback"), null, { timeout: 20_000 });
    if (await page.locator(".lesson").count()) {
      for (let k = 0; k < 10 && (await page.locator(".lesson").count()); k++) {
        const t = page.getByRole("button", { name: "Try it" });
        if (await t.count()) { await t.click(); break; }
        await page.getByRole("button", { name: "Next", exact: true }).click();
      }
      continue;
    }
    const card = page.locator(".qcard");
    if (!(await card.count())) return null;
    const qid = await card.getAttribute("data-qid");
    assert.ok(!drawn(qid), `a drawn task (${qid}) is offered with keyboard input`);
    const q = question(qid);
    if (q.type === "written") return qid;
    if (q.type === "choice") await card.getByRole("radio").nth("ABCD".indexOf(q.answer)).click();
    else await card.getByLabel("Your answer", { exact: true }).fill(q.answer);
    await card.getByRole("button", { name: "Check" }).click();
    await page.getByRole("status").filter({ hasText: /Right\.|Not this time\./ }).waitFor({ timeout: 15_000 });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  throw new Error("no written task within the step limit");
}
async function handIn(page, qid, tag) {
  await page.locator(".qcard textarea").first().fill(ANSWER);
  await page.screenshot({ path: `${shots}/${tag}-1-learner-written.png`, fullPage: true });
  await page.locator(".qcard").getByRole("button", { name: "Check" }).click();
  await page.getByRole("status").filter({ hasText: /Sent to be marked\./ }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".qcard, .feedback"));
  assert.doesNotMatch(await page.locator("body").innerText(), /unavailable with keyboard input/, "no dead-end drawing after handing in");
  return qid;
}
/** The parent's Written work section: how many are waiting; share with the educator; the marking link the app gives. */
async function share(L, tag) {
  await L.page.goto(`${base}/year/?learner=${L.learner}`);
  const ww = L.page.getByRole("region", { name: "Written work" });
  await ww.waitFor();
  assert.match(await ww.getByRole("status").first().innerText(), /1 answer is waiting for an educator/);
  await ww.locator("summary").click();
  await ww.getByLabel("Educator's email").fill(educator);
  await ww.getByRole("button", { name: "Share written work" }).click();
  await ww.getByText("Shared.").waitFor();
  const link = ww.getByRole("link", { name: /\/review\/#marking/ });
  await link.waitFor();
  await ww.scrollIntoViewIfNeeded();
  assert.ok(await fits(L.page));
  await L.page.screenshot({ path: `${shots}/${tag}-2-parent-shared.png`, fullPage: true });
  return new URL(await link.getAttribute("href"), base).href;
}
/** The educator (desktop) follows the app's link, signs in, finds the answer in the queue and marks it in full. */
async function mark(link, qid, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(link);
    await page.getByRole("heading", { name: "Sign in to mark written answers" }).waitFor();
    await page.getByLabel(/Email/).fill(educator);
    await page.getByLabel(/Password/).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("heading", { name: "Written answers to mark" }).waitFor({ timeout: 60_000 });
    const card = page.locator("article.qcard").filter({ hasText: writtenTask(qid).prompt.slice(0, 40) }).filter({ has: page.getByRole("button", { name: /Give the mark/ }) }).first();
    await card.waitFor();
    assert.match(await card.innerText(), /learner [0-9a-f]{4}/i, "a pseudonym");
    assert.match(await card.innerText(), new RegExp(ANSWER.slice(0, 30)));
    await page.screenshot({ path: `${shots}/${tag}-3-educator-queue.png`, fullPage: false });
    for (const sel of await card.locator("select").all()) await sel.selectOption({ index: (await sel.locator("option").count()) - 1 });
    await card.getByLabel("Feedback").fill("Clear reasons for each step. Well done.");
    await card.getByRole("button", { name: /Give the mark: (\d+)\/\1 \(correct\)/ }).click();
    await page.locator("article.qcard").filter({ hasText: writtenTask(qid).prompt.slice(0, 40) }).getByText(/Marked correct/).first().waitFor();
    await page.screenshot({ path: `${shots}/${tag}-4-educator-marked.png`, fullPage: false });
    // a mark is not content approval: the review roles and states are what they were
    const reg = await call(page, "/content-review/");
    const comp = writtenTask(qid).competency;
    assert.ok(!reg.data.registry.entries.some((e) => e.competency === comp && e.kind === "module" && ["approved", "released"].includes(e.state)), "the module is not approved by marking");
  } finally { await ctx.close(); }
}
/** The learner reloads: the mark and feedback are shown, and the skill carries on (not "With an educator"). */
async function after_(L, skill, tag) {
  await L.page.goto(`${base}/year/?learner=${L.learner}`);
  const ww = L.page.getByRole("region", { name: "Written work" });
  await ww.getByText(/Marked correct · \d+\/\d+/).waitFor();
  assert.match(await ww.innerText(), /Clear reasons for each step/);
  assert.match(await ww.getByRole("status").first().innerText(), /Nothing is waiting for an educator/);
  await ww.scrollIntoViewIfNeeded();
  await L.page.screenshot({ path: `${shots}/${tag}-5-learner-mark.png`, fullPage: false });
  await openSkill(L, skill);
  await L.page.waitForFunction(() => document.querySelector(".qcard, .feedback"));
  const t = await L.page.locator("body").innerText();
  assert.doesNotMatch(t, /With an educator|unavailable with keyboard input/);
  assert.ok(await fits(L.page));
  await L.page.screenshot({ path: `${shots}/${tag}-6-learner-continues.png`, fullPage: true });
  assert.deepEqual(L.errors, []);
}

for (const [tag, skill, grade] of [["fractions", "MATH.number.fraction-comparison", 5], ["algebra", "MATH.algebra.linear-equations", 7], ["geometry", "MATH.geometry.congruence", 7]]) {
  test(`${tag}: learner hands in a written answer → educator marks it from the app's link → learner continues`, { timeout: 600_000 }, async () => {
    const L = await learnerPhone(grade);
    try {
      await openSkill(L, skill);
      const qid = await toWritten(L.page);
      assert.ok(qid, "a written task is reached");
      await handIn(L.page, qid, tag);
      if (tag === "fractions") {
        // the module's drawn task (wr:more-sharers) is not offered: the topic ends and says why, and the year is open
        const note = L.page.locator('[data-keyboard-offer]');
        await note.waitFor();
        assert.match(await note.innerText(), /not available with keyboard input/);
        assert.equal(await L.page.locator('.qcard[data-qid="wr:more-sharers"]').count(), 0);
        await L.page.screenshot({ path: `${shots}/${tag}-1b-learner-no-drawing-dead-end.png`, fullPage: true });
      }
      const link = await share(L, tag);
      assert.equal(new URL(link).pathname + new URL(link).hash, "/review/#marking");
      await mark(link, qid, tag);
      await after_(L, skill, tag);
    } finally { await L.context.close(); }
  });
}

test("geometry constructions: drawn tasks are never offered; the topic ends with a clear note and the year stays open", { timeout: 600_000 }, async () => {
  const L = await learnerPhone(7);
  try {
    await openSkill(L, "MATH.geometry.basic-constructions");
    const qid = await toWritten(L.page);
    assert.equal(qid, null, "every educator-marked task here is drawn: none is offered");
    const t = await L.page.locator("body").innerText();
    assert.doesNotMatch(t, /unavailable with keyboard input/);
    const note = L.page.locator('[data-keyboard-offer]');
    await note.waitFor();
    assert.match(await note.innerText(), /not available with keyboard input/);
    assert.ok(await L.page.getByRole("button", { name: /Back to the year/ }).count(), "a way back");
    assert.ok(await fits(L.page));
    await L.page.screenshot({ path: `${shots}/constructions-keyboard-note.png`, fullPage: true });
    assert.deepEqual(L.errors, []);
  } finally { await L.context.close(); }
});
