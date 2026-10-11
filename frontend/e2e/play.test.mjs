/**
 * End-to-end: a real browser plays the game against the running app.
 *
 *   npm run e2e            (expects `npm run dev` and the Django API to be up)
 *   E2E_URL=http://localhost:5173  E2E_SHOTS=./e2e/shots  npm run e2e
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(() => browser?.close());

const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const centre = async (locator) => {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
const phase = async (page, name) => {
  await page.waitForSelector(`svg[data-phase="${name}"]`, { timeout: 15000 });
  await page.waitForTimeout(500); // let the scene finish fading in
};
/** Collect script errors. A blocked web font is not an application error. */
const watchErrors = (page) => {
  const seen = [];
  page.on("pageerror", (error) => seen.push(error.message));
  page.on("console", (m) => m.type() === "error" && !m.text().includes("Failed to load resource") && seen.push(m.text()));
  return seen;
};
const press = (page, label) => page.getByRole("button", { name: label, exact: true }).click();
const basketCount = (page) => page.locator('.fruit[data-where="basket"]').count();

async function enrol(page, nickname) {
  await page.goto(URL);
  await page.getByLabel(/Nickname/).fill(nickname);
  await page.getByRole("checkbox").check();
  await press(page, "Start playing");
  await phase(page, "list");
}

/** Drag one fruit from the shelf into the basket with the mouse. */
async function dragIn(page, kind) {
  const from = await centre(page.locator(`.fruit[data-kind="${kind}"][data-where="shelf"]`).first());
  const to = await centre(page.locator(".basket-front"));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y - 30, { steps: 4 });
  await page.mouse.up();
}

/** Drag one fruit out of the basket and back to the shelf. */
async function dragOut(page) {
  const from = await centre(page.locator('.fruit[data-where="basket"] > circle').first());
  const shelf = await centre(page.locator(".stage svg"));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(shelf.x, 180, { steps: 6 });
  await page.mouse.up();
}

/** Drag with real touch events (as a tablet would send them). */
async function touchDragIn(page, client, kind) {
  const from = await centre(page.locator(`.fruit[data-kind="${kind}"][data-where="shelf"]`).first());
  const to = await centre(page.locator(".basket-front"));
  const point = (x, y) => [{ x: Math.round(x), y: Math.round(y) }];
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(from.x, from.y) });
  for (let step = 1; step <= 5; step++) {
    const x = from.x + ((to.x - from.x) * step) / 5;
    const y = from.y + ((to.y - 30 - from.y) * step) / 5;
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(x, y) });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function target(page) {
  const svg = page.locator(".stage svg");
  return { round: await svg.getAttribute("data-round") };
}

async function skillStatuses(page) {
  return Object.fromEntries(
    await page.locator(".skill").evaluateAll((rows) =>
      rows.map((row) => [row.querySelector("h3").textContent, row.querySelector(".chip").textContent]),
    ),
  );
}

test("a child who counts correctly plays all three trips with the mouse", async () => {
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 } });
  const errors = watchErrors(page);

  await page.goto(URL);
  await shot(page, "01-welcome");
  await enrol(page, "Asha");
  await shot(page, "02-list-5-apples");

  // Trip 1: the list says 5 apples.
  await press(page, "Go to the shop");
  await phase(page, "shop");
  await shot(page, "03-shop");
  for (let i = 0; i < 6; i++) await dragIn(page, "apple");
  assert.equal(await basketCount(page), 6, "six apples dragged in");
  await dragOut(page); // notices one too many and puts it back, unprompted
  assert.equal(await basketCount(page), 5);
  await shot(page, "04-five-in-basket");
  await press(page, "Go home");
  await phase(page, "celebrate");
  await shot(page, "05-celebrate");
  await phase(page, "home");
  await page.waitForTimeout(900);
  await shot(page, "06-home");

  // Trip 2: a different numeral, a different fruit, apples mixed in.
  await press(page, "Next");
  await phase(page, "list");
  assert.equal((await target(page)).round, "r2");
  await shot(page, "07-list-3-oranges");
  await press(page, "Go to the shop");
  await phase(page, "shop");
  for (let i = 0; i < 3; i++) await dragIn(page, "orange");
  await shot(page, "08-shop-oranges");
  await press(page, "Go home");
  await phase(page, "home");

  // Trip 3: no numeral, one pear for each pictured plate.
  await press(page, "Next");
  await phase(page, "list");
  await shot(page, "09-list-plates");
  await press(page, "Go to the shop");
  await phase(page, "shop");
  for (let i = 0; i < 4; i++) await dragIn(page, "pear");
  await shot(page, "10-shop-pears");
  await press(page, "Go home");
  await phase(page, "home");
  await page.waitForTimeout(900);
  await shot(page, "11-home-plates");
  await press(page, "All done");
  await phase(page, "done");
  await shot(page, "12-done");

  await press(page, "For grown-ups");
  await page.waitForSelector(".path");
  const statuses = await skillStatuses(page);
  assert.equal(statuses["Knows how many"], "Growing");
  assert.equal(statuses["Counts one by one"], "Looking secure, checking again later");
  assert.ok(!Object.values(statuses).includes("Secure"), "one visit never yields mastery");
  assert.match(await page.locator(".rounds").first().textContent(), /fixing a slip unprompted/);
  await press(page, "Show the latest visit's record");
  await page.waitForSelector("table");
  await shot(page, "13-grownups");
  await page.screenshot({ path: SHOTS ? `${SHOTS}/14-grownups-full.png` : undefined, fullPage: true });

  // Three days later: success again is what turns "looking secure" into "secure".
  await press(page, "Skip ahead 3 days");
  await press(page, "Back to the game");
  await press(page, "Play again");
  await phase(page, "list");
  const fruit = ["pear", "apple", "orange"];
  const amounts = [4, 6, 3];
  for (let trip = 0; trip < 3; trip++) {
    await press(page, "Go to the shop");
    await phase(page, "shop");
    for (let i = 0; i < amounts[trip]; i++) await dragIn(page, fruit[trip]);
    await press(page, "Go home");
    await phase(page, "home");
    await press(page, trip < 2 ? "Next" : "All done");
  }
  await phase(page, "done");
  await press(page, "For grown-ups");
  await page.waitForSelector(".path");
  const later = await skillStatuses(page);
  assert.equal(later["Knows how many"], "Secure");
  assert.equal(later["Uses quantity in new situations"], "Secure");
  await page.screenshot({ path: SHOTS ? `${SHOTS}/15-grownups-after-retention.png` : undefined, fullPage: true });

  assert.deepEqual(errors, [], "no console or page errors");
  await page.close();
});

test("a child who needs help gets it step by step, on a phone with touch", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  const errors = watchErrors(page);

  await enrol(page, "");
  await shot(page, "20-phone-list");
  await page.getByRole("button", { name: "Go to the shop", exact: true }).tap();
  await phase(page, "shop");

  // Takes every apple on the shelf, then says "done".
  for (let i = 0; i < 8; i++) await touchDragIn(page, client, "apple");
  assert.equal(await basketCount(page), 8, "touch drags land in the basket");
  await shot(page, "21-phone-took-all");
  await page.getByRole("button", { name: "Go home", exact: true }).tap();
  assert.equal(await page.locator("svg[data-phase]").getAttribute("data-phase"), "shop", "no failure screen: still in the shop");
  await page.waitForSelector(".list-pulse");
  await shot(page, "22-phone-hint-look-again");

  // Says "done" again without changing anything: Mom counts with them.
  await page.waitForTimeout(2800);
  await page.getByRole("button", { name: "Go home", exact: true }).tap();
  await page.waitForFunction(() => document.querySelectorAll(".count-badge").length === 8, null, { timeout: 15000 });
  await shot(page, "23-phone-count-together");
  await page.waitForFunction(() => /The list says 5/.test(document.querySelector(".speech p").textContent), null, { timeout: 8000 });

  // A third time: spots to fill.
  await page.waitForTimeout(3300);
  await page.getByRole("button", { name: "Go home", exact: true }).tap();
  await page.waitForSelector(".spot");
  assert.equal(await page.locator(".spot").count(), 5);
  await shot(page, "24-phone-spots");

  // Flicks three back onto the shelf, then presses go home straight away.
  for (let i = 0; i < 3; i++) {
    const from = await centre(page.locator('.fruit[data-where="basket"] > circle').last());
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: Math.round(from.x), y: Math.round(from.y) }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 195, y: 420 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 195, y: 300 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }
  assert.equal(await basketCount(page), 5);
  await page.getByRole("button", { name: "Go home", exact: true }).tap();
  await phase(page, "home");
  await page.waitForTimeout(900);
  await shot(page, "25-phone-home");

  await page.getByRole("button", { name: "For grown-ups", exact: true }).tap();
  await page.waitForSelector(".path");
  const statuses = await skillStatuses(page);
  assert.equal(statuses["Knows how many"], "Just starting", "success with help is not independent evidence");
  assert.match(await page.locator(".rounds").first().textContent(), /took everything on the shelf at first/);
  assert.match(await page.locator("section", { hasText: "The next visit" }).textContent(), /numbers stay small/);
  await page.screenshot({ path: SHOTS ? `${SHOTS}/26-phone-grownups.png` : undefined, fullPage: true });

  assert.deepEqual(errors, []);
  await context.close();
});

test("the game can be played with the keyboard alone", async () => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 700 } });
  await enrol(page, "");
  await page.getByRole("button", { name: "Go to the shop", exact: true }).press("Enter");
  await phase(page, "shop");
  for (let i = 0; i < 5; i++) {
    await page.locator('.fruit[data-kind="apple"][data-where="shelf"]').first().press(i % 2 ? "Enter" : " ");
  }
  assert.equal(await basketCount(page), 5);
  await page.getByRole("button", { name: "Go home", exact: true }).press("Enter");
  await phase(page, "home");
  await page.close();
});
