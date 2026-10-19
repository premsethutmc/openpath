import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import {
  createDemoServer,
  configFromEnv,
  hashPassword,
} from "../scripts/demo-server.mjs";
import { install } from "./lib/bee.mjs";
let browser, server, url;
before(async () => {
  const { problems, config } = configFromEnv({
    DEMO_PASSWORD_HASH: await hashPassword("synthetic-bee-password"),
    DEMO_SESSION_SECRET: "synthetic-test-secret-123456789012345678901234567890",
    DEMO_DIST: resolve("dist-english-bee"),
    DEMO_ALLOW_HTTP: "1",
    DEMO_TITLE: "OpenPath Spelling Bee",
  });
  assert.deepEqual(problems, []);
  server = createDemoServer(config, { log: () => {} });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server?.close(r));
});
async function setup(width) {
  const context = await browser.newContext({
    viewport: { width, height: 915 },
    isMobile: true,
    hasTouch: true,
  });
  await install(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByLabel("Demo password").fill("synthetic-bee-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page
    .getByRole("button", { name: "Start on this device", exact: true })
    .click();
  await page.getByLabel("Child’s nickname").fill("Synthetic Bee");
  await page.locator("#consent").check();
  await page
    .getByRole("button", { name: "Start Spelling Bee", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Learn 5 words", exact: true })
    .waitFor();
  return { context, page, errors };
}
async function fits(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "no horizontal overflow",
  );
}
async function upload(page) {
  await page.getByRole("button", { name: "Parent area", exact: true }).click();
  await page.getByRole("button", { name: "Load or edit word lists" }).click();
  await page
    .getByRole("button", { name: "New word list", exact: true })
    .click();
  await page.getByLabel("List name", { exact: true }).fill("School words");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "words.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("castle\nplanet\ngarden\nrabbit\nwindow"),
    });
  await page
    .getByRole("button", { name: "Check the words", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save the list", exact: true })
    .click();
  await page.getByRole("button", { name: "Practise", exact: true }).click();
  await page.getByRole("button", { name: "Hide it and spell" }).waitFor();
}
test("private wall protects assets and direct refresh", async () => {
  const r = await fetch(url + "/index.html");
  assert.equal(r.status, 401);
  assert.equal(await r.text(), "Log in first");
  const c = await setup(412);
  await c.page.reload();
  await c.page
    .getByRole("button", { name: "Learn 5 words", exact: true })
    .waitFor();
  assert.doesNotMatch(
    await c.page.locator("main").innerText(),
    /General English|Mathematics|Essay/,
  );
  assert.deepEqual(c.errors, []);
  await c.context.close();
});
for (const width of [320, 412])
  test(`phone ${width}: parent upload, learn, hidden recall, draft resume, help and review`, async () => {
    const { context, page, errors } = await setup(width);
    await upload(page);
    await fits(page);
    const target = await page.locator(".learning-word").innerText();
    assert.ok(target.length > 0);
    if (width === 412) {
      mkdirSync("../docs/product/spelling-standalone/screens", {
        recursive: true,
      });
      await page.screenshot({
        path: "../docs/product/spelling-standalone/screens/learn.png",
        fullPage: true,
      });
    }
    await page.getByRole("button", { name: "Hide it and spell" }).click();
    await page.getByRole("textbox").waitFor();
    assert.ok(!(await page.locator("main").innerText()).includes(target));
    await page.getByRole("textbox").fill(target.slice(0, 2));
    await page.locator("h1").click();
    await page
      .getByRole("status")
      .filter({ hasText: "Saving" })
      .waitFor({ state: "hidden" });
    await page.reload();
    await page
      .getByRole("button", { name: "Continue my words", exact: true })
      .click();
    await page.getByRole("textbox").waitFor();
    assert.equal(
      await page.getByRole("textbox").inputValue(),
      target.slice(0, 2),
    );
    assert.equal(await page.locator(".learning-word").count(), 0);
    await page
      .getByRole("button", { name: "Show it again (with help)" })
      .click();
    assert.equal(await page.locator(".learning-word").innerText(), target);
    await page.getByRole("button", { name: "Hide it and spell" }).click();
    await page.getByRole("textbox").fill(target);
    await page.getByRole("textbox").press("Enter");
    await page.getByRole("heading", { name: "You got it!" }).waitFor();
    assert.match(
      await page.locator("main").innerText(),
      /Practised with the spelling shown/,
    );
    await fits(page);
    if (width === 412)
      await page.screenshot({
        path: "../docs/product/spelling-standalone/screens/assisted-feedback.png",
        fullPage: true,
      });
    for (let i = 1; i < 5; i++) {
      await page
        .getByRole("button", { name: "Next word", exact: true })
        .click();
      await page.getByRole("button", { name: "Hide it and spell" }).waitFor();
      const w = await page.locator(".learning-word").innerText();
      await page.getByRole("button", { name: "Hide it and spell" }).click();
      await page.getByRole("textbox").fill(w);
      await page
        .getByRole("button", { name: "Check spelling", exact: true })
        .click();
      await page.getByRole("heading", { name: "You got it!" }).waitFor();
    }
    await page.getByRole("button", { name: "See my review plan" }).click();
    await page
      .getByRole("heading", { name: "A little practice, every day" })
      .waitFor();
    assert.match(
      await page.locator("main").innerText(),
      /not verified mastery/,
    );
    await page.getByRole("button", { name: "Back to my words" }).click();
    await page.getByRole("button", { name: /School words/ }).click();
    await page.getByRole("textbox").waitFor();
    assert.equal(
      await page.locator(".learning-word").count(),
      0,
      "later session tests recall before showing",
    );
    assert.deepEqual(errors, []);
    await context.close();
  });
