/** Stage 2 curated Grade 10 lessons in the browser (read-only preview, nothing saved): each lesson's sections are labelled by
 *  role, its worked example is complete and checked, its picture is of the worked question's own numbers, no engineering
 *  metadata is shown, and practice starts with a question of the kind just taught (not the one already solved). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { exposureKey, FAMILIES, problemOf } from "../../packages/learning/src/families.ts";

const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:4312";
const shots = process.env.SHOTS ?? "/tmp/curated-lessons";
mkdirSync(shots, { recursive: true });
const dataDir = new URL("../dist-english/curriculum/data/", import.meta.url);
const index = JSON.parse(readFileSync(new URL("index.json", dataDir), "utf8"));
const boardFor = (c) => index.releases.filter((e) => e.grade === 10).find((e) => JSON.parse(readFileSync(new URL(e.file, dataDir), "utf8")).competencies[c]?.module)?.board;
const nums = (s) => (s.replace(/−/g, "-").match(/\d+/g) ?? []).map(Number);

const LESSONS = [
  { c: "MATH.number.euclid-algorithm", fam: "hcf", kind: "division-chain" },
  { c: "MATH.algebra.arithmetic-sequences", fam: "apn", kind: "sequence-table" },
  { c: "MATH.geometry.pythagoras", fam: "ahpyth", kind: "right-triangle" },
  { c: "MATH.probability.classical", fam: "anbag", kind: "counts" },
];

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" }); });
after(() => browser?.close());

for (const { c, fam, kind } of LESSONS) test(`360px ${c}: taught as its own question, then practised as the same kind`, async () => {
  const board = boardFor(c);
  assert.ok(board, `${c} is in a Grade 10 release`);
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const writes = [], errors = [];
  page.on("request", (r) => { if (r.url().includes("/api/") && r.method() !== "GET") writes.push(`${r.method()} ${r.url()}`); });
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await page.goto(`${base}/curriculum/?preview=1#b=${board}&g=10&c=${encodeURIComponent(c)}`);
    await page.locator(".teaching-page").waitFor();
    const blocks = page.locator(".teaching-block");
    const roles = await blocks.evaluateAll((els) => els.map((e) => e.dataset.role));
    assert.equal(roles[0], "concept");
    assert.ok(roles.includes("worked-example"), `${roles}`);
    // the worked example: complete, checked, and labelled as such
    const worked = page.locator(".teaching-block[data-role='worked-example']").first();
    assert.equal(await worked.getAttribute("data-verified"), "true");
    assert.equal(await worked.locator(".teaching-label").first().textContent(), "Worked example");
    const instance = await worked.getAttribute("data-instance");
    const p = problemOf(instance);
    assert.equal(p.family, fam);
    const example = worked.locator(".progressive-worked");
    while (await example.getByRole("button", { name: /Next step/ }).count()) await example.getByRole("button", { name: /Next step/ }).click();
    const steps = await example.locator(".step-expression").allTextContents();
    assert.ok(steps.length >= 2, `${steps}`);
    // the answer the solution reaches is the question's checked answer
    assert.ok(steps.at(-1).replace(/\s/g, "").includes(p.answer.replace(/\s/g, "")), `last step ${steps.at(-1)} states ${p.answer}`);
    // the picture is of this question: its numbers come from the question, its answer or its steps
    const fig = page.locator(`.teaching-block [data-kind='${kind}']`).first();
    await fig.waitFor();
    const figText = `${await fig.getAttribute("aria-label") ?? ""} ${await fig.innerText()}`;
    const allowed = new Set([...nums(p.prompt), ...nums(p.answer), ...steps.flatMap(nums), ...p.params.map(Math.abs), 0, 1, 2, ...(kind === "sequence-table" ? [3, 4] : [])]); // a table numbers its rows
    const conceptInstance = problemOf(await blocks.nth(0).getAttribute("data-instance"));
    for (const v of nums(conceptInstance ? JSON.stringify([conceptInstance.prompt]) : "")) allowed.add(v);
    if (conceptInstance) for (const v of [...nums(conceptInstance.answer), ...conceptInstance.params.map(Math.abs)]) allowed.add(v);
    const conceptSteps = await blocks.nth(0).locator(".step-expression").allTextContents().catch(() => []);
    for (const v of conceptSteps.flatMap(nums)) allowed.add(v);
    // figure belongs to the concept section's question or to the worked example's question
    const ownFig = await page.locator(`.teaching-block[data-instance] [data-kind='${kind}']`).first().evaluate((el) => el.closest(".teaching-block").dataset.instance);
    const figQ = problemOf(ownFig);
    for (const v of nums(figText)) assert.ok(allowed.has(v) || nums(figQ.prompt).includes(v) || nums(figQ.answer).includes(v) || FAMILIES.get(fam).teach.instance(figQ.params).worked.steps.some((s) => nums(s.expression).includes(v)), `${v} in the picture "${figText}" is not from ${ownFig}`);
    // no engineering metadata on the page
    const body = await page.locator(".teaching-page").innerText();
    assert.doesNotMatch(body, /gen:|fingerprint|family|hash|certif|quarantin/i);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal scroll at 360px");
    await page.screenshot({ path: `${shots}/360-${fam}-lesson.png`, fullPage: true });
    // practice: one question at a time, of the kind just taught, and not the question already solved on the page
    await page.getByRole("button", { name: "Practice this concept" }).click();
    await page.locator(".practice-workspace").waitFor();
    const qid = await page.locator("[data-qid]").first().getAttribute("data-qid");
    const q = problemOf(qid.replace(/:mc$/, ""));
    assert.equal(q.family, fam);
    const caseOf = FAMILIES.get(fam).teach.caseOf;
    if (caseOf) assert.equal(caseOf(q.params), caseOf(p.params), `practice ${qid} is the kind taught (${caseOf(p.params)})`);
    assert.notEqual(exposureKey(qid), exposureKey(instance), "practice does not start with the solved example");
    assert.equal(await page.locator("[data-qid]").count(), 1, "one question at a time");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${shots}/360-${fam}-practice.png`, fullPage: true });
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
  } catch (error) {
    await page.screenshot({ path: `${shots}/360-${fam}-failure.png`, fullPage: true });
    throw error;
  } finally {
    await context.close();
  }
});
