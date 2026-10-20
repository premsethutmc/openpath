import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const URL = process.env.E2E_URL ?? "http://127.0.0.1:4670";
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
});
after(() => browser?.close());
async function page(width = 412) {
  const context = await browser.newContext({
    viewport: { width, height: 915 },
    hasTouch: true,
    isMobile: width < 700,
  });
  const p = await context.newPage();
  p.setDefaultTimeout(10000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(URL);
  await p.getByRole("heading", { name: "379 ÷ 3", exact: true }).waitFor();
  return { p, context, errors };
}
async function draft(p) {
  return p.evaluate(() =>
    JSON.parse(localStorage.getItem("openpath:math-input@1:division:379:3")),
  );
}
async function saved(p) {
  await p
    .getByRole("status")
    .filter({ hasText: "Saved on this browser" })
    .waitFor();
}
async function paperPosition(p, x = 330, y = 55) {
  const svg = p.locator("svg.writing-paper");
  await svg.evaluate((el) => el.scrollIntoView({ block: "start" }));
  return svg.evaluate(
    (el, { x, y }) => {
      const p = new DOMPoint(x, y).matrixTransform(el.getScreenCTM());
      return { x: p.x, y: p.y };
    },
    { x, y },
  );
}
async function mouseStroke(p) {
  const a = await paperPosition(p);
  await p.mouse.move(a.x, a.y);
  await p.mouse.down();
  await p.mouse.move(a.x + 25, a.y + 10, { steps: 3 });
  await p.mouse.up();
  await saved(p);
  return a;
}
async function sample(p, kind) {
  const summary = p.getByText("Synthetic recognition demonstrations", {
    exact: true,
  });
  if (!(await summary.evaluate((el) => el.parentElement.open)))
    await summary.click();
  await p
    .getByRole("button", { name: `Load ${kind} sample`, exact: true })
    .click();
  await p
    .getByRole("button", { name: "Interpret handwriting", exact: true })
    .click();
  await p.getByRole("button", { name: /Edit Quotient: 1/ }).waitFor();
}
async function typed(p, region, text) {
  await p
    .getByLabel("Mathematical region", { exact: true })
    .selectOption(region);
  await p
    .getByRole("textbox", { name: "Number or expression", exact: true })
    .fill(text);
  await p.getByRole("button", { name: "Add typed step", exact: true }).click();
}
function sendButton(p) {
  return p.getByRole("button", {
    name: "Send confirmed steps to validator",
    exact: true,
  });
}
test("mouse strokes, eraser, undo/redo, clear, reload and pressure metadata", async () => {
  const { p, context, errors } = await page();
  const a = await mouseStroke(p);
  const w = await draft(p);
  assert.equal(w.strokes.length, 1);
  assert.equal(w.strokes[0].pointerType, "mouse");
  assert.ok(Math.abs(w.strokes[0].points[0].x - 330) < 1);
  await p.reload();
  await p.locator("[data-stroke]").waitFor();
  assert.equal(await p.locator("[data-stroke]").count(), 1);
  await p.getByRole("button", { name: "Eraser", exact: true }).click();
  const b = await paperPosition(p);
  await p.mouse.click(b.x, b.y);
  await saved(p);
  assert.equal((await draft(p)).erased.length, 1);
  assert.equal(await p.locator("[data-stroke]").count(), 0);
  await p.getByRole("button", { name: "Undo", exact: true }).click();
  assert.equal(await p.locator("[data-stroke]").count(), 1);
  await p.getByRole("button", { name: "Redo", exact: true }).click();
  assert.equal(await p.locator("[data-stroke]").count(), 0);
  await p.getByRole("button", { name: "Undo", exact: true }).click();
  await p.getByRole("button", { name: "Clear paper", exact: true }).click();
  await saved(p);
  assert.equal((await draft(p)).strokes.length, 1);
  assert.ok(a.x > 0);
  assert.deepEqual(errors, []);
  await context.close();
});
test("real browser touch events and simulated pressure-sensitive pen; palm lock", async () => {
  const { p, context, errors } = await page();
  const cdp = await context.newCDPSession(p),
    a = await paperPosition(p);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: a.x, y: a.y, radiusX: 3, radiusY: 3, force: 0.65 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: a.x + 20, y: a.y + 5, radiusX: 3, radiusY: 3, force: 0.8 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await saved(p);
  assert.equal((await draft(p)).strokes[0].pointerType, "touch");
  await p.getByLabel("Pen only: ignore finger/palm touches").check();
  const b = await paperPosition(p);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: b.x, y: b.y, radiusX: 30, radiusY: 20, force: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.equal((await draft(p)).strokes.length, 1);
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: b.x,
    y: b.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
    pointerType: "pen",
    force: 0.7,
    tiltX: 25,
    tiltY: 10,
    twist: 15,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: b.x + 20,
    y: b.y + 12,
    buttons: 1,
    pointerType: "pen",
    force: 0.9,
    tiltX: 30,
    tiltY: 10,
    twist: 20,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: b.x + 20,
    y: b.y + 12,
    button: "left",
    buttons: 0,
    clickCount: 1,
    pointerType: "pen",
  });
  await saved(p);
  const w = await draft(p);
  assert.equal(w.strokes.length, 2);
  assert.equal(w.strokes[1].pointerType, "pen");
  assert.ok(
    w.strokes[1].points.some((x) => x.pressure > 0.6 && x.tiltX === 25),
  );
  assert.deepEqual(errors, []);
  await context.close();
});
test("coordinates remain aligned with zoom, pan and mobile resizing", async () => {
  const { p, context } = await page(820);
  await p.getByRole("button", { name: "Zoom in", exact: true }).click();
  await p.getByRole("button", { name: "Zoom in", exact: true }).click();
  await mouseStroke(p);
  let w = await draft(p);
  assert.ok(Math.abs(w.strokes[0].points[0].x - 330) < 1);
  await p.getByRole("button", { name: "Pan", exact: true }).click();
  const a = await paperPosition(p, 300, 100);
  await p.mouse.move(a.x, a.y);
  await p.mouse.down();
  await p.mouse.move(a.x - 80, a.y - 50, { steps: 3 });
  await p.mouse.up();
  await p.setViewportSize({ width: 360, height: 800 });
  await p.getByRole("button", { name: "Pen", exact: true }).click();
  await mouseStroke(p);
  w = await draft(p);
  assert.ok(Math.abs(w.strokes[1].points[0].x - 330) < 1);
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await context.close();
});
test("ambiguous digit alone needs clarification; confirmed edit survives recognition and can be re-edited", async () => {
  const { p, context, errors } = await page();
  await sample(p, "ambiguous");
  assert.equal(await p.locator(".uncertain").count(), 1);
  assert.equal(await sendButton(p).isDisabled(), true);
  await p
    .getByRole("button", {
      name: /Edit Multiply: last part: 8, needs clarification/,
    })
    .click();
  await p
    .getByRole("textbox", { name: "Intended symbol or expression" })
    .fill("8");
  await p
    .getByRole("button", { name: "Confirm this symbol", exact: true })
    .click();
  assert.equal(await p.locator(".uncertain").count(), 0);
  await p
    .getByRole("button", { name: "Interpret handwriting", exact: true })
    .click();
  assert.equal(await p.locator(".uncertain").count(), 0);
  await p
    .getByRole("button", { name: "Edit Quotient: 1", exact: true })
    .click();
  await p
    .getByRole("textbox", { name: "Intended symbol or expression" })
    .fill("9");
  await p
    .getByRole("button", { name: "Confirm this symbol", exact: true })
    .click();
  await sendButton(p).click();
  await p.getByTestId("input-packet").waitFor();
  const packet = JSON.parse(await p.getByTestId("input-packet").innerText());
  assert.equal(packet.corrections.length, 2);
  assert.equal(packet.steps[0].text, "9 2 6");
  assert.ok(packet.strokes.length > 10);
  assert.match(
    await p.getByLabel("Validator feedback").innerText(),
    /Mathematical validation is not connected/,
  );
  mkdirSync("../docs/product/mathematical-writing/screens", {
    recursive: true,
  });
  await p.screenshot({
    path: "../docs/product/mathematical-writing/screens/clarified.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  await context.close();
});
test("incorrect intermediate sample is passed to mock, not graded by workspace", async () => {
  const { p, context } = await page();
  await sample(p, "incorrect");
  await sendButton(p).click();
  const packet = JSON.parse(await p.getByTestId("input-packet").innerText());
  assert.equal(packet.steps.find((s) => s.regionId === "product-2").text, "8");
  assert.ok(!("correct" in packet));
  await context.close();
});
test("recognizer unavailable: full typed division, keypad, draft resume and arbitrary problem", async () => {
  const { p, context, errors } = await page(320);
  await p
    .getByRole("button", { name: "Interpret handwriting", exact: true })
    .click();
  await p
    .getByRole("alert")
    .filter({ hasText: /Recognition is unavailable/ })
    .waitFor();
  await p.getByRole("button", { name: "Insert 1", exact: true }).click();
  await p.getByRole("button", { name: "Insert 2", exact: true }).click();
  await p.getByRole("button", { name: "Insert 6", exact: true }).click();
  await p.getByRole("button", { name: "Add typed step", exact: true }).click();
  for (const [region, text] of [
    ["product-1", "3"],
    ["difference-1", "0"],
    ["bring-down-1", "7"],
    ["product-2", "6"],
    ["difference-2", "1"],
    ["bring-down-2", "19"],
    ["product-3", "18"],
    ["remainder", "1"],
  ])
    await typed(p, region, text);
  await saved(p);
  await p.reload();
  await p
    .getByRole("button", { name: "Edit Remainder: 1", exact: true })
    .waitFor();
  await sendButton(p).click();
  const packet = JSON.parse(await p.getByTestId("input-packet").innerText());
  assert.equal(packet.steps.length, 9);
  assert.equal(packet.strokes.length, 0);
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await p.getByText("Problem and writing layout", { exact: true }).click();
  await p.getByRole("textbox", { name: "Dividend", exact: true }).fill("847");
  await p.getByRole("textbox", { name: "Divisor", exact: true }).fill("7");
  await p
    .getByRole("button", { name: "Open or resume this problem", exact: true })
    .click();
  await p.getByRole("heading", { name: "847 ÷ 7", exact: true }).waitFor();
  assert.equal(
    await p.getByRole("button", { name: /Edit Remainder/ }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  await context.close();
});
test("own ink falls back to typing its region without losing strokes", async () => {
  const { p, context } = await page();
  await mouseStroke(p);
  assert.equal(await sendButton(p).isDisabled(), true);
  await typed(p, "quotient", "126");
  assert.equal(await sendButton(p).isDisabled(), false);
  await sendButton(p).click();
  const packet = JSON.parse(await p.getByTestId("input-packet").innerText());
  assert.equal(packet.steps[0].tokens[0].strokeIds.length, 1);
  assert.equal(packet.steps[0].tokens[0].origin, "manual");
  assert.equal(packet.strokes.length, 1);
  await context.close();
});
test("two-finger pinch zoom cancels the in-flight finger stroke", async () => {
  const { p, context, errors } = await page();
  const cdp = await context.newCDPSession(p),
    a = await paperPosition(p, 400, 200);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, x: a.x - 25, y: a.y },
      { id: 2, x: a.x + 25, y: a.y },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { id: 1, x: a.x - 40, y: a.y },
      { id: 2, x: a.x + 40, y: a.y },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.notEqual(
    await p.getByLabel("Zoom", { exact: true }).innerText(),
    "100%",
  );
  assert.equal((await draft(p)).strokes.length, 0);
  assert.deepEqual(errors, []);
  await context.close();
});
test("correct synthetic division and clarification survive a full page refresh", async () => {
  const { p, context } = await page();
  await sample(p, "correct");
  assert.equal(await p.locator(".uncertain").count(), 0);
  await sendButton(p).click();
  let packet = JSON.parse(await p.getByTestId("input-packet").innerText());
  assert.equal(packet.steps[0].text, "1 2 6");
  assert.equal(packet.steps.at(-1).text, "1");
  assert.equal(packet.provenance.synthetic, true);
  await sample(p, "ambiguous");
  await p
    .getByRole("button", {
      name: /Edit Multiply: last part: 8, needs clarification/,
    })
    .click();
  await p
    .getByRole("textbox", { name: "Intended symbol or expression" })
    .fill("8");
  await p
    .getByRole("button", { name: "Confirm this symbol", exact: true })
    .click();
  await saved(p);
  await p.reload();
  await p
    .getByRole("button", { name: "Edit Multiply: last part: 8", exact: true })
    .waitFor();
  assert.equal(await p.locator(".uncertain").count(), 0);
  await p
    .getByRole("button", { name: "Interpret handwriting", exact: true })
    .click();
  assert.equal(await p.locator(".uncertain").count(), 0);
  await sendButton(p).click();
  packet = JSON.parse(await p.getByTestId("input-packet").innerText());
  assert.equal(packet.corrections.length, 1);
  await context.close();
});
test("storage quota failure remains visible while typed work can still be completed and downloaded", async () => {
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
  });
  await context.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Synthetic quota exceeded", "QuotaExceededError");
    };
  });
  const p = await context.newPage();
  p.setDefaultTimeout(10000);
  await p.goto(URL);
  await p.getByRole("alert").filter({ hasText: /quota/i }).waitFor();
  await typed(p, "quotient", "126");
  await p
    .getByRole("button", { name: "Edit Quotient: 126", exact: true })
    .waitFor();
  const download = p.waitForEvent("download");
  await p.getByRole("button", { name: "Download draft" }).click();
  assert.equal(
    (await download).suggestedFilename(),
    "openpath-writing-draft.json",
  );
  await context.close();
});
test("eraser sweep retains every erase across rapid pointer moves", async () => {
  const { p, context } = await page();
  const a = await paperPosition(p, 330, 55);
  await p.mouse.move(a.x, a.y);
  await p.mouse.down();
  await p.mouse.move(a.x + 10, a.y, { steps: 2 });
  await p.mouse.up();
  const b = await paperPosition(p, 430, 55);
  await p.mouse.move(b.x, b.y);
  await p.mouse.down();
  await p.mouse.move(b.x + 10, b.y, { steps: 2 });
  await p.mouse.up();
  await saved(p);
  assert.equal((await draft(p)).strokes.length, 2);
  await p.getByRole("button", { name: "Eraser", exact: true }).click();
  const start = await paperPosition(p, 330, 55),
    end = await paperPosition(p, 430, 55);
  await p.mouse.move(start.x, start.y);
  await p.mouse.down();
  await p.mouse.move(end.x + 10, end.y, { steps: 10 });
  await p.mouse.up();
  await saved(p);
  assert.equal((await draft(p)).erased.length, 2);
  assert.equal((await draft(p)).strokes.length, 2);
  await context.close();
});
