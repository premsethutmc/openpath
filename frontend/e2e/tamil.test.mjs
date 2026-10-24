import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
const URL = process.env.TAMIL_E2E_URL ?? "http://127.0.0.1:4176",
  KEY = "openpath.tamil.foundation.v1";
const items = JSON.parse(
  readFileSync(
    new globalThis.URL("../../content/tamil/items.v1.json", import.meta.url),
    "utf8",
  ),
);
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  mkdirSync("e2e/shots/tamil", { recursive: true });
});
after(() => browser?.close());
async function phone() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL);
  return { context, page, errors };
}
const state = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
async function item(page) {
  await page.locator("section[data-item]").waitFor();
  const id = await page.locator("section[data-item]").getAttribute("data-item");
  return items.find((i) => i.id === id);
}
async function answer(page, value) {
  const i = await item(page);
  if (i.format === "choice")
    await page
      .locator(".choices")
      .getByRole("button", { name: value, exact: true })
      .tap();
  else {
    await page.getByLabel("உன் விடை", { exact: true }).fill(value);
    await page.getByRole("button", { name: "சரிபார்", exact: true }).tap();
  }
  await page.waitForFunction(
    (id) =>
      document
        .querySelector("section[data-item]")
        ?.getAttribute("data-item") !== id,
    i.id,
  );
}
async function begin(page) {
  await page.getByRole("button", { name: "தொடங்கு", exact: true }).tap();
  await page.locator("section[data-item]").waitFor();
}
async function fit(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(
    await page
      .locator("button:visible")
      .evaluateAll((bs) =>
        bs
          .filter((b) => b.getBoundingClientRect().height < 44)
          .map((b) => b.textContent),
      ),
    [],
  );
}
test("phone diagnostic, relevant teaching, guided practice, fresh transfer and evidence export", async () => {
  const { context, page, errors } = await phone();
  const foreign = [];
  page.on("request", (r) => {
    if (new globalThis.URL(r.url()).origin !== new globalThis.URL(URL).origin)
      foreign.push(r.url());
  });
  await page.evaluate(() =>
    localStorage.setItem("english-preserve", "English learner record"),
  );
  await begin(page);
  await fit(page);
  for (let n = 0; n < 6; n++) {
    const i = await item(page);
    await answer(page, n === 2 ? "நெடில்" : i.answers[0]);
  }
  await page
    .getByRole("heading", { name: "குறிலும் நெடிலும்", exact: true })
    .waitFor();
  assert.equal((await state(page)).target, "TA.length");
  await page.screenshot({
    path: "e2e/shots/tamil/teaching.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "பயிற்சி செய்வோம்", exact: true })
    .tap();
  for (let n = 0; n < 3; n++) {
    const i = await item(page);
    if (n === 1)
      await page.getByRole("button", { name: "உதவி", exact: true }).tap();
    await answer(page, i.answers[0]);
  }
  await page
    .getByRole("heading", { name: "இன்று நன்றாக முயன்றாய்!", exact: true })
    .waitFor();
  await fit(page);
  const s = await state(page);
  assert.equal(s.events.length, 9);
  assert.equal(s.events[6].support.revealed, true);
  assert.equal(s.events[7].support.hint, true);
  assert.equal(s.events[7].independenceCandidate, false);
  assert.equal(s.events[8].transfer, true);
  assert.ok(s.events.every((e) => !e.eligibleForInference));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "பதிவைப் பதிவிறக்கு", exact: true }).tap(),
  ]);
  const record = JSON.parse(readFileSync(await download.path(), "utf8"));
  assert.equal(record.events.length, 9);
  assert.equal(record.learnerId, s.learnerId);
  assert.equal(record.events[2].misconceptions[0], "TA.short-long");
  assert.equal(record.presentations.length, 9);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("english-preserve")),
    "English learner record",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(foreign, []);
  await context.close();
});
test("Tamil keyboard composition, grapheme deletion, Unicode entry and phone layout", async () => {
  const { context, page, errors } = await phone();
  await begin(page);
  for (let n = 0; n < 3; n++) {
    const i = await item(page);
    await answer(page, i.answers[0]);
  }
  await page.getByRole("button", { name: "எழுது க", exact: true }).tap();
  await page.getByRole("button", { name: "எழுது ொ", exact: true }).tap();
  assert.equal(
    await page.getByLabel("உன் விடை", { exact: true }).inputValue(),
    "கொ",
  );
  await page.getByRole("button", { name: "அழி", exact: true }).tap();
  assert.equal(
    await page.getByLabel("உன் விடை", { exact: true }).inputValue(),
    "",
  );
  await page.getByRole("button", { name: "எழுது க", exact: true }).tap();
  await fit(page);
  await page.screenshot({
    path: "e2e/shots/tamil/keyboard.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "சரிபார்", exact: true }).tap();
  await page.waitForFunction(
    () =>
      document
        .querySelector("section[data-item]")
        ?.getAttribute("data-item") === "ta.join.க.6",
  );
  await answer(page, "கெ".normalize("NFD"));
  assert.equal((await state(page)).events[4].correct, true);
  assert.deepEqual(errors, []);
  await context.close();
});
test("reload keeps hint history and marks repeated exposure", async () => {
  const { context, page, errors } = await phone();
  await begin(page);
  const i = await item(page);
  await page.getByRole("button", { name: "உதவி", exact: true }).tap();
  await page.reload();
  await page.locator("section[data-item]").waitFor();
  await answer(page, i.answers[0]);
  const s = await state(page);
  assert.equal(s.events.length, 1);
  assert.equal(s.events[0].support.hint, true);
  assert.equal(s.events[0].exposure, "repeat");
  assert.equal(s.events[0].independenceCandidate, false);
  assert.deepEqual(errors, []);
  await context.close();
});
test("storage refusal preserves screen and explains the failure", async () => {
  const { context, page, errors } = await phone();
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "தொடங்கு", exact: true }).tap();
  await page.getByRole("alert").waitFor();
  assert.equal(await page.locator("section[data-item]").count(), 0);
  assert.equal(await state(page), null);
  assert.deepEqual(errors, []);
  await context.close();
});

test("focused aytham route teaches Tamil without claiming a new transfer symbol", async () => {
  const { context, page, errors } = await phone();
  await page.getByText("ஒரு திறனைப் பயிற்சி செய்", { exact: true }).tap();
  await page.getByRole("button", { name: "ஆய்த எழுத்து", exact: true }).tap();
  await answer(page, "ஃ");
  await page
    .getByRole("heading", { name: "ஆய்த எழுத்து", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "பயிற்சி செய்வோம்", exact: true })
    .tap();
  await answer(page, "ஃ");
  await page
    .getByRole("heading", { name: "இன்று நன்றாக முயன்றாய்!", exact: true })
    .waitFor();
  const s = await state(page);
  assert.equal(s.events.length, 2);
  assert.ok(s.events.every((e) => !e.transfer));
  assert.deepEqual(errors, []);
  await context.close();
});
