/**
 * End-to-end: Tamil help on an Android-sized phone. Switched on from the welcome screen, it puts a Tamil line under
 * English buttons and headings (never under the passages and questions being learnt), stays on after a reload, and
 * switches off again. No sideways scrolling with the Tamil lines shown.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const ANDROID = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
let browser;
before(async () => (browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })));
after(() => browser?.close());

test("Tamil help: on from the welcome screen, Tamil under English instructions, kept after reload, off again", async () => {
  const context = await browser.newContext(ANDROID);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL);
  const toggle = page.locator(".ta-toggle").first();
  await toggle.click();
  await page.locator('button[data-ta="தொடங்குவோம்"]').waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tamil-0-welcome.png` });
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByLabel(/Name to show/).fill("Tamil");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  // Home: an activity heading carries its Tamil line
  await page.locator('[data-ta="என் நிலையைக் கண்டுபிடி"]').first().waitFor();
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(sw <= w, "no sideways scrolling");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tamil-1-home.png`, fullPage: false });
  // kept after a reload
  await page.reload();
  await page.locator('[data-ta="என் நிலையைக் கண்டுபிடி"]').first().waitFor();
  // inside an activity: the instruction is translated, the English being learnt is not
  await page.locator("section[aria-labelledby='kinds-card-title']").getByRole("button").click();
  await page.locator('[data-ta="படி"]').first().waitFor();
  assert.equal(await page.locator(".kinds-read .tile h2[data-ta]").count(), 0, "a text's title is not translated");
  await page.getByRole("button", { name: "Read it" }).click();
  assert.equal(await page.locator("[data-kind-text] [data-ta]").count(), 0, "the text itself is never translated");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tamil-2-read.png`, fullPage: false });
  // off again
  await page.goto(URL);
  await page.locator(".ta-toggle").first().click();
  await page.waitForFunction(() => !document.querySelector("[data-ta]"));
  assert.deepEqual(errors, []);
  await context.close();
});
