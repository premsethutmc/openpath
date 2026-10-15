/**
 * End-to-end: the pilot content-safety boundary in a real browser at phone size, against a pilot build.
 *
 *   node scripts/build-english.mjs --pilot --allow-empty --out=dist-english-pilot
 *   PORT=4177 DIST=dist-english-pilot node scripts/preview-english.mjs &
 *   E2E_URL=http://127.0.0.1:4177 npm run english:e2e-pilot
 *
 * The committed review record approves nothing, so this build must show no question at all (fail closed): no
 * placement, no spelling check, no practice, no lessons, no journey, and no developer tools, even when a pupil types
 * a restricted address. The allowed path (approved questions shown, nothing else) is covered by
 * src/english/logic/pilot-boundary.test.ts with approvals injected for the test.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4177";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/pilot-${name}.png`, fullPage: true });

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

async function phone() {
  const context = await browser.newContext(PHONE);
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  page.on("request", (r) => requests.push(r.url()));
  return { context, page, errors, requests };
}

async function fits(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w, `page is ${sw}px wide on a ${w}px screen`);
}

/** No question, lesson or session screen anywhere on the page. */
async function nothingShown(page) {
  assert.equal(await page.locator(".item, .lesson, .ruled input, .answer .option, .spelling-intro").count(), 0, "no question or lesson is on screen");
}

async function createProfile(page, name) {
  await page.goto(URL);
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.getByText("Tick the box to agree").waitFor();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  // nothing is approved, so there is no starting check to offer: straight to Home
  await page.getByRole("heading", { name: "Today" }).waitFor();
}

test("pilot build with nothing approved: no question, lesson, practice or journey is offered anywhere", async () => {
  const { context, page, errors } = await phone();
  await createProfile(page, "Pilot pupil");
  await page.locator("[data-pilot=nothing-open]").waitFor();
  assert.equal(await page.locator(".plan li").count(), 0, "Today's plan is empty");
  assert.equal(await page.getByRole("button", { name: /^Start/ }).count(), 0, "nothing to start");
  assert.equal(await page.getByRole("button", { name: "More practice" }).count(), 0, "no extra practice");
  await nothingShown(page);
  await fits(page);
  await shot(page, "1-home");

  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Journey" }).click();
  await page.getByRole("heading", { name: /Your learning path/ }).waitFor();
  assert.equal(await page.locator(".path button").count(), 0, "no lesson, practice or check can be started from the journey");
  await page.getByText(/only the starting check and the spelling check are open/).waitFor();
  await shot(page, "2-journey");

  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Progress" }).click();
  await nothingShown(page);
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Me", exact: true }).click();
  await page.getByText(/Pilot version: only approved questions are shown/).waitFor();
  assert.equal(await page.getByLabel(/Tell us about a problem/).count(), 0, "no free-text notes in a pilot build");
  await fits(page);

  // reload and come back: still nothing
  await page.reload();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await nothingShown(page);
  assert.deepEqual(errors, []);
  await context.close();
});

test("pilot build: restricted addresses opened directly show nothing restricted", async () => {
  const { context, page, errors, requests } = await phone();
  for (const path of ["/developer", "/developer/"]) {
    await page.goto(URL + path);
    await page.locator("[data-pilot-refused=developer]").waitFor();
    await page.getByRole("heading", { name: "Not available here" }).waitFor();
    await nothingShown(page);
  }
  // a deeper developer address does not load the app at all (its relative asset paths do not resolve there)
  await page.goto(URL + "/developer/pupils/123");
  await page.waitForLoadState("networkidle");
  await nothingShown(page);
  assert.equal(await page.locator("[data-pilot-refused], .dev, main").filter({ hasText: /Pupil|Developer diagnostics/ }).count(), 0);
  assert.ok(!requests.some((u) => u.includes("/api/developer")), "the developer tools never ask the server for anything");
  await fits(page);
  await shot(page, "3-developer-refused");
  // any other address is the app itself, with the same boundary
  await createProfile(page, "Direct");
  for (const path of ["/?session=placement", "/#journey", "/practice", "/index.html"]) {
    await page.goto(URL + path);
    await page.getByRole("heading", { name: "Today" }).waitFor();
    await nothingShown(page);
    assert.equal(await page.getByRole("button", { name: /^Start/ }).count(), 0, path);
  }
  // the only errors are the deeper developer address failing to load its assets (nothing ran there)
  assert.deepEqual(errors.filter((e) => !/MIME type/.test(e)), []);
  await context.close();
});
