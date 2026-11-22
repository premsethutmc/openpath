/**
 * End-to-end: a school child is set up by class and board (Class 5, ICSE). The class stays fixed: Home shows it,
 * School work opens straight on Class 5 with no class or board to switch, and levels are not shown (they still move
 * underneath, starting from the class). A wrong fix in Grammar shows what was written, the right sentence and why.
 * An adult sees every class. Android-sized Chromium, device-only, against the production build.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 node --test e2e/school-child.test.mjs
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/child-${name}.png`, fullPage: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function open() {
  const context = await browser.newContext(ANDROID);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  return { context, page, errors };
}

test("a school child: class and board fixed, levels hidden, clear grammar feedback", async () => {
  const { context, page, errors } = await open();
  await page.getByLabel(/Name to show/).fill("Meera");
  await page.getByRole("button", { name: /A school child/ }).click();
  await page.getByRole("button", { name: "Choose the class" }).waitFor();
  await page.getByRole("group", { name: "Which class?" }).getByRole("button", { name: "5", exact: true }).click();
  await page.getByRole("button", { name: "Choose the board" }).waitFor();
  await page.getByRole("button", { name: "ICSE", exact: true }).click();
  await shot(page, "1-setup");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Class 5 · ICSE", { exact: false }).waitFor();
  assert.equal(await page.getByRole("group", { name: "Goal" }).count(), 0, "no goal to choose for a child");
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("[data-school]", { hasText: "Class 5 · ICSE" }).waitFor();
  await page.getByRole("heading", { name: /a quick warm-up/ }).waitFor();
  await shot(page, "2-home");

  // School work: the class card offers the first line to start, and opens Class 5 with nothing to switch
  assert.match(await page.locator("[data-syllabus-next='new']").innerText(), /^Start: /);
  await page.getByRole("button", { name: "Open my class" }).click();
  await page.getByRole("heading", { name: "Class 5 English" }).waitFor();
  assert.equal(await page.getByRole("group", { name: "Class" }).count(), 0);
  assert.equal(await page.getByRole("group", { name: "Board" }).count(), 0);
  await page.getByRole("button", { name: "← Back" }).click();

  // Grammar: no level shown; a wrong fix shows what was written, the right sentence and why
  await page.getByRole("button", { name: /Or choose an activity/ }).click();
  await page.getByRole("button", { name: "Try Grammar" }).click();
  await page.getByRole("heading", { name: "Fix it or build it" }).waitFor();
  assert.equal(await page.getByText(/^Level \d/).count(), 0, "no level shown to a child");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  for (let i = 0; i < 8; i++) {
    const skip = page.getByRole("button", { name: "Skip to practice" });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    const kind = await page.locator("main[data-kind]").getAttribute("data-kind");
    if (kind === "fix") {
      await page.locator(".grammar-word").first().click();
      await page.locator("#grammar-box").fill("zzz");
      await page.getByRole("button", { name: "Check", exact: true }).click();
      const fb = page.locator('.gfb[data-correct="false"]');
      await fb.locator(".gfb-verdict", { hasText: "Not quite" }).waitFor();
      await fb.locator('[data-row="yours"] .gfb-mine', { hasText: "zzz" }).waitFor();
      await fb.locator('[data-row="right"] .gfb-right').waitFor();
      await fb.locator(".gfb-why").waitFor();
      await shot(page, "3-feedback");
      assert.ok(!(await fb.innerText()).includes("->"), "no arrow notation");
      assert.deepEqual(errors, []);
      await context.close();
      return;
    }
    // anything else: answer it and move on
    if (kind === "choose") await page.locator(".grammar-choice").first().click();
    else if (kind === "spot") (await page.locator(".grammar-word").first().click(), await page.getByRole("button", { name: "Check", exact: true }).click());
    else (await page.locator(".grammar-pool .grammar-tile").first().click(), await page.getByRole("button", { name: "Check", exact: true }).click());
    await page.locator(".gfb").waitFor();
    await page.getByRole("button", { name: /Next sentence|Finish/ }).click();
  }
  assert.fail("no fix sentence in a sitting of eight");
});

test("an adult: every class open, levels shown", async () => {
  const { context, page, errors } = await open();
  await page.getByLabel(/Name to show/).fill("Prem");
  await page.getByRole("button", { name: /An adult/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("group", { name: "Goal" }).waitFor();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  assert.equal(await page.locator("[data-school]").count(), 0);
  await page.getByRole("button", { name: "Open the class syllabus" }).click();
  await page.getByRole("group", { name: "Class" }).waitFor();
  await page.getByRole("group", { name: "Board" }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test("a weak Class 2 reader's first week starts easy: the first line to start, and a long read at level 1 or 2", async () => {
  const LONG = JSON.parse(readFileSync(new globalThis.URL("../../content/english/reading/long-reads.json", import.meta.url), "utf8"));
  const level = new Map(LONG.texts.map((t) => [t.title, t.level]));
  const { context, page, errors } = await open();
  await page.getByLabel(/Name to show/).fill("Kavi");
  await page.getByRole("button", { name: /A school child/ }).click();
  await page.getByRole("button", { name: "Choose the class" }).waitFor();
  await page.getByRole("group", { name: "Which class?" }).getByRole("button", { name: "2", exact: true }).click();
  await page.getByRole("button", { name: "Choose the board" }).waitFor();
  await page.getByRole("button", { name: "ICSE", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("[data-school]", { hasText: "Class 2 · ICSE" }).waitFor();
  const fits = async () => {
    const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    assert.ok(sw <= w, "no sideways scrolling");
  };
  await fits();
  // the class card names a line to start
  assert.match(await page.locator("[data-syllabus-next='new']").innerText(), /^Start: /);
  // Long reads: a story at level 1 or 2, not a level 4 one
  await page.getByRole("button", { name: /More to practise|Or choose an activity/ }).click();
  await page.getByRole("button", { name: "Try a long read" }).click();
  await page.locator('main.long-read[data-phase="intro"]').waitFor();
  const title = await page.locator(".long-read .tile h2").innerText();
  assert.ok((level.get(title) ?? 99) <= 2, `${title} is level ${level.get(title)}`);
  await fits();
  await shot(page, "class2-long-read");
  assert.deepEqual(errors, []);
  await context.close();
});

