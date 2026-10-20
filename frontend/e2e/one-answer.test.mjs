import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const BASE = process.env.E2E_URL ?? "http://127.0.0.1:4703";
const DIR = "../docs/product/mathematical-writing/screens-one-answer";
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  mkdirSync(DIR, { recursive: true });
});
after(() => browser?.close());
async function start(width = 360) {
  const c = await browser.newContext({
    viewport: { width, height: 800 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: "block",
  });
  const p = await c.newPage();
  p.setDefaultTimeout(15000);
  await p.goto(BASE);
  await p
    .getByRole("button", {
      name: "Try OpenPath as a Demo Student",
      exact: true,
    })
    .click();
  await p.getByLabel("Mathematics question", { exact: true }).waitFor();
  return { c, p };
}
async function check(p, text) {
  await p.getByLabel("Your answer", { exact: true }).fill(text);
  await p.getByRole("button", { name: "Check answer", exact: true }).click();
}
async function screenshot(p, name) {
  await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await p.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
}
async function subject(p) {
  await p
    .getByRole("button", { name: "Save and return to the lesson", exact: true })
    .click();
}
test("Android one question: immediate entry, equivalent remainder forms, incomplete, wrong, retry, optional hint and persistence", async () => {
  const { c, p } = await start();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.getByRole("heading", { name: "379 ÷ 3 = ?", exact: true }).waitFor();
  assert.equal(
    await p.getByLabel("Mathematical region", { exact: true }).count(),
    0,
  );
  assert.equal(await p.locator("svg.writing-paper").count(), 0);
  const button = await p
    .getByRole("button", { name: "Check answer", exact: true })
    .boundingBox();
  assert.ok(button.y + button.height <= 800, "Check fits initial viewport");
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await screenshot(p, "initial-android");
  await check(p, "126");
  await p.getByText(/Include the remainder too/).waitFor();
  await check(p, "125 R 1");
  await p
    .getByText("Not quite. Want a hint or another try?", { exact: true })
    .waitFor();
  assert.equal(await p.getByLabel("Diagnostic follow-up").count(), 0);
  await screenshot(p, "incorrect-android");
  await p.getByRole("button", { name: "Get a hint", exact: true }).click();
  await p.getByLabel("Optional help", { exact: true }).waitFor();
  await p
    .getByRole("button", { name: "Back to my answer", exact: true })
    .click();
  await p.getByRole("button", { name: "Try again", exact: true }).click();
  await check(p, "126 R 1");
  await p
    .getByText("Correct! 379 ÷ 3 = 126 remainder 1.", { exact: true })
    .waitFor();
  await screenshot(p, "correct-android");
  await p.reload();
  await p
    .getByText("Correct! 379 ÷ 3 = 126 remainder 1.", { exact: true })
    .waitFor();
  await check(p, "126 remainder 1");
  await p.getByRole("button", { name: "Next question", exact: true }).waitFor();
  await check(p, "126 R");
  await p.getByText(/Use a quotient and remainder/).waitFor();
  await p.getByLabel("Your answer", { exact: true }).fill("12");
  await p.getByText("Saved", { exact: true }).waitFor();
  const url = p.url(),
    state = await c.storageState();
  await c.close();
  const resumed = await browser.newContext({
    storageState: state,
    viewport: { width: 412, height: 915 },
  });
  const page = await resumed.newPage();
  await page.goto(url);
  await page.getByLabel("Your answer", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Your answer", { exact: true }).inputValue(),
    "12",
  );
  assert.deepEqual(errors, []);
  await resumed.close();
});
test("handwriting is optional, preserves ink and typing; guided worksheet remains available", async () => {
  const { c, p } = await start(412);
  await p.getByLabel("Your answer", { exact: true }).fill("126 R 1");
  await p
    .getByRole("button", { name: "✏️ Write instead", exact: true })
    .click();
  const paper = p.locator("svg.writing-paper");
  await paper.scrollIntoViewIfNeeded();
  const box = await paper.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + 40);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2, box.y + 100, { steps: 8 });
  await p.mouse.up();
  assert.equal(await paper.locator("[data-stroke]").count(), 1);
  assert.equal(
    await p.getByLabel("Mathematical region", { exact: true }).count(),
    0,
  );
  await screenshot(p, "handwriting-android");
  await p.getByRole("button", { name: "Type instead", exact: true }).click();
  assert.equal(await paper.count(), 0);
  assert.equal(
    await p.getByLabel("Your answer", { exact: true }).inputValue(),
    "126 R 1",
  );
  await p
    .getByRole("button", { name: "✏️ Write instead", exact: true })
    .click();
  assert.equal(await p.locator("svg.writing-paper [data-stroke]").count(), 1);
  await p.getByRole("button", { name: "Type instead", exact: true }).click();
  await p
    .getByRole("button", { name: "Help me step by step", exact: true })
    .click();
  await p
    .getByRole("heading", { name: "Understand the idea", exact: true })
    .waitFor();
  await p
    .getByRole("button", { name: "See a worked example", exact: true })
    .click();
  await p.getByRole("button", { name: "Open my working", exact: true }).click();
  await p.getByLabel("Mathematical region", { exact: true }).waitFor();
  await p
    .getByRole("button", { name: "Back to one answer", exact: true })
    .click();
  await p.getByLabel("Your answer", { exact: true }).waitFor();
  assert.equal(
    await p.getByLabel("Your answer", { exact: true }).inputValue(),
    "126 R 1",
  );
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await c.close();
});
test("fractions and multiplication share the simple interaction; Next question is a new practice item", async () => {
  const { c, p } = await start();
  await subject(p);
  await p
    .getByRole("button", { name: /^Equivalent fractions · write and check/ })
    .click();
  await check(p, "3/6");
  await p
    .getByText("Correct! Your answer is equivalent.", { exact: true })
    .waitFor();
  await subject(p);
  await p
    .getByRole("button", { name: /^Equal groups · write and check/ })
    .click();
  await check(p, "24");
  await p
    .getByText("Correct! Your answer is equivalent.", { exact: true })
    .waitFor();
  assert.equal(
    await p
      .getByLabel("Your answer", { exact: true })
      .getAttribute("inputmode"),
    "numeric",
  );
  await p.getByRole("button", { name: "Next question", exact: true }).click();
  await p.getByRole("heading", { name: /4 × 7/ }).waitFor();
  await check(p, "28");
  await p
    .getByText("Correct! Your answer is equivalent.", { exact: true })
    .waitFor();
  await p.reload();
  await p.getByRole("heading",{name:/4 × 7/}).waitFor();
  assert.equal(await p.getByLabel("Your answer",{exact:true}).inputValue(),"28");
  const identity=await (await c.request.get(BASE+"/api/preview-demo/status/")).json();
  const stream=await (await c.request.get(BASE+`/api/pupils/${identity.learner}/events/?subject=mathematics`)).json();
  assert.ok(stream.events.filter(e=>e.kind==='math_writing').every(e=>e.admissible===false));
  await p.goto(BASE+"/logout");
  await p.getByRole("button",{name:"Log out",exact:true}).click();
  await p.getByRole("button",{name:"Try OpenPath as a Demo Student",exact:true}).click();
  await p.getByRole("heading",{name:/4 × 7/}).waitFor();
  assert.equal(await p.getByLabel("Your answer",{exact:true}).inputValue(),"28");
  await c.close();
});
