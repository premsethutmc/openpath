/**
 * Browser walkthrough of the built player at Android phone and tablet sizes.
 *
 *   npm run build && npm run serve &      (http://127.0.0.1:4180)
 *   npm run e2e
 *   E2E_URL=... E2E_SHOTS=./e2e/shots CHROMIUM_PATH=... npm run e2e
 *
 * The story plays faster than real time (?speed=) so a whole episode fits in a
 * test; timing is story time, so branching is the same as at normal speed.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, before, describe, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4180";
const SHOTS = process.env.E2E_SHOTS;
const SPEED = Number(process.env.E2E_SPEED ?? 8);
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const PHONE = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }; // Android phone, landscape
const PHONE_PORTRAIT = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const TABLET = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }; // Android tablet, landscape
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36";

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

async function open(device, query = "") {
  const context = await browser.newContext({ ...device, userAgent: UA });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(`${URL}/?speed=${SPEED}${query}`);
  await page.waitForSelector(".frame[data-state='ready']");
  return { page, context, errors, requests };
}

const shot = (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const state = (page) => page.locator(".frame").getAttribute("data-state");
const waitWindow = (page, id) => page.waitForSelector(`svg.stage[data-window="${id}"]`, { timeout: 120_000 });
const waitEnd = (page) => page.waitForSelector(".frame[data-state='ended']", { timeout: 240_000 });
const outcome = (page, id) => page.evaluate((i) => window.__chintoo.outcomes[i], id);

describe("phone (landscape)", () => {
  test("the child's first screen is one big play button: no text to read, no form, no links out", async () => {
    const { page, context } = await open(PHONE);
    await shot(page, "phone-01-start");
    assert.equal(await page.locator("form, input:not(.panel input), textarea, a[href], iframe").count(), 0);
    const play = page.getByRole("button", { name: "Play" });
    const box = await play.boundingBox();
    assert.ok(box.width >= 96 && box.height >= 96, `play button is ${box.width}px`);
    // The stage fills the screen's width without scrolling.
    const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    assert.ok(size.w <= 915 && size.h <= 412, JSON.stringify(size));
    await context.close();
  });

  test("with no touches at all, the cartoon plays from beginning to end and offers to play again", async () => {
    const { page, context, errors, requests } = await open(PHONE);
    await page.getByRole("button", { name: "Play" }).tap();
    await page.waitForSelector(".frame[data-track='garden']", { timeout: 60_000 });
    await page.waitForTimeout(1500);
    await shot(page, "phone-02-garden");
    await waitWindow(page, "pick-apple");
    await shot(page, "phone-03-choose-window-open");
    await page.waitForSelector(".frame[data-track='apple-falls']", { timeout: 60_000 });
    await page.waitForTimeout(4000);
    await shot(page, "phone-04-apple-fell");
    await waitWindow(page, "count-apples-3");
    await shot(page, "phone-05-count-window-open");
    await waitEnd(page);
    await shot(page, "phone-06-end");
    assert.equal(await outcome(page, "pick-apple"), "timeout");
    assert.equal(await outcome(page, "count-apples-3"), "timeout");
    assert.ok(await page.getByRole("button", { name: "Watch again" }).isVisible());
    assert.deepEqual(errors, []);
    // Nothing is fetched: everything is inside the one page.
    assert.deepEqual(requests.filter((u) => !u.startsWith(URL)), []);
    await context.close();
  });

  test("pause stops the story, and play carries on from the same moment", async () => {
    const { page, context } = await open(PHONE);
    await page.getByRole("button", { name: "Play" }).tap();
    await page.waitForSelector(".frame[data-track='garden']", { timeout: 60_000 });
    await page.getByRole("button", { name: "Pause" }).tap();
    assert.equal(await state(page), "paused");
    const before = await page.evaluate(() => window.__chintoo.step);
    await page.waitForTimeout(3000);
    assert.equal(await page.evaluate(() => window.__chintoo.step), before, "no steps played while paused");
    await shot(page, "phone-07-paused");
    await page.getByRole("button", { name: "Play" }).tap();
    await page.waitForFunction((b) => window.__chintoo.step !== b, before, { timeout: 10_000 });
    await context.close();
  });

  test("grown-up settings need a press and hold; a quick tap does not open them", async () => {
    const { page, context } = await open(PHONE);
    const gear = page.getByRole("button", { name: /For grown-ups/ });
    await gear.tap();
    await page.waitForTimeout(400);
    assert.equal(await page.locator(".panel").isVisible(), false);
    const box = await gear.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1200);
    await page.mouse.up();
    assert.equal(await page.locator(".panel").isVisible(), true);
    await shot(page, "phone-08-grownups");
    await context.close();
  });
});

describe("tablet (landscape)", () => {
  test("the child chooses an apple and counts with Chintoo; the story follows their touches", async () => {
    const { page, context, errors } = await open(TABLET);
    await page.getByRole("button", { name: "Play" }).tap();
    await waitWindow(page, "pick-apple");
    await shot(page, "tablet-01-choose");
    // Touch areas are big enough for small fingers.
    for (const id of ["apple-red", "apple-green", "apple-yellow"]) {
      const box = await page.locator(`.hit[data-target="${id}"]`).boundingBox();
      assert.ok(box.width >= 64, `${id} touch area is ${Math.round(box.width)}px`);
    }
    await page.locator('.hit[data-target="apple-yellow"]').tap();
    await page.waitForSelector(".frame[data-track='mina-picks']");
    assert.equal(await outcome(page, "pick-apple"), "tapped");
    await page.waitForFunction(() => window.__chintoo.lines.includes("A yellow apple!"), null, { timeout: 30_000 });
    await shot(page, "tablet-02-a-yellow-apple");
    await page.waitForFunction(() => window.__chintoo.lines.includes("A yellow apple for me!"), null, { timeout: 30_000 });
    await shot(page, "tablet-03-chintoo-has-it");

    await waitWindow(page, "count-apples-3");
    for (const [i, id] of ["b1", "b2", "b3"].entries()) {
      await page.locator(`.hit[data-target="${id}"]`).tap();
      await page.waitForSelector(`.badge[data-badge-for="${id}"]`);
      assert.equal(await page.locator(`.badge[data-badge-for="${id}"] text`).textContent(), String(i + 1));
      await shot(page, `tablet-04-counted-${i + 1}`);
    }
    await page.waitForSelector(".frame[data-track='counted-together']");
    assert.equal(await outcome(page, "count-apples-3"), "counted");
    await waitEnd(page);
    await shot(page, "tablet-05-end");
    const events = await page.evaluate(() => window.__chintoo.events);
    assert.deepEqual(
      events.map((e) => [e.interaction, e.evidence, e.claimsMastery]),
      [
        ["pick-apple", "participation", false],
        ["count-apples-3", "participation", false],
      ],
    );
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("older children see three apples and two more, and count to five", async () => {
    const { page, context } = await open(TABLET, "&level=older");
    await page.getByRole("button", { name: "Play" }).tap();
    await waitWindow(page, "count-apples-5");
    await shot(page, "tablet-06-five-apples");
    assert.equal(await page.locator(".hit").count(), 5);
    await context.close();
  });
});

describe("phone (portrait)", () => {
  test("the whole stage is visible and the touch areas stay large", async () => {
    const { page, context } = await open(PHONE_PORTRAIT, "&motion=reduced");
    await shot(page, "portrait-01-start");
    assert.ok(await page.locator(".frame.reduced").count(), "reduced motion is on");
    await page.getByRole("button", { name: "Play" }).tap();
    await waitWindow(page, "pick-apple");
    await shot(page, "portrait-02-choose");
    const stage = await page.locator("svg.stage").boundingBox();
    assert.ok(stage.width <= 412 && stage.x >= 0);
    for (const id of ["apple-red", "apple-green", "apple-yellow"]) {
      const box = await page.locator(`.hit[data-target="${id}"]`).boundingBox();
      assert.ok(box.width >= 48, `${id} touch area is ${Math.round(box.width)}px`);
    }
    await context.close();
  });
});
