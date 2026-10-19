/** Synthetic family, real canonical account API; run only against an isolated test database. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { install } from "./lib/bee.mjs";
const URL = process.env.E2E_URL ?? "http://127.0.0.1:4660";
test("one account, two phones: parent words, instructional phase and answer receipts survive sign-in", async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  try {
    const first = await browser.newContext({
      viewport: { width: 412, height: 915 },
    });
    await install(first);
    const p = await first.newPage();
    p.setDefaultTimeout(10000);
    p.on("response", (r) => {
      if (r.status() >= 400)
        console.log("HTTP", r.status(), new globalThis.URL(r.url()).pathname);
    });
    await p.goto(URL);
    await p
      .getByRole("button", { name: "Create a parent account", exact: true })
      .click();
    const email = `bee.${Date.now()}@example.org`,
      password = "synthetic-bee-family-4387";
    await p.getByLabel("Email", { exact: true }).fill(email);
    await p.getByLabel("Password", { exact: true }).fill(password);
    await p.locator("#account-consent").check();
    await p
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await p.getByRole("button", { name: "Add a learner", exact: true }).click();
    await p.getByLabel("Child’s nickname").fill("Synthetic Cross Device");
    await p.locator("#consent").check();
    await p
      .getByRole("button", { name: "Start Spelling Bee", exact: true })
      .click();
    await p.getByRole("button", { name: "Parent area", exact: true }).click();
    await p.getByRole("button", { name: "Load or edit word lists" }).click();
    await p.getByRole("button", { name: "New word list", exact: true }).click();
    await p.getByLabel("List name", { exact: true }).fill("Across phones");
    await p.locator("textarea").fill("castle\nplanet");
    await p
      .getByRole("button", { name: "Check the words", exact: true })
      .click();
    await p.getByRole("button", { name: "Save the list", exact: true }).click();
    await p.getByRole("button", { name: "Practise", exact: true }).click();
    await p.getByRole("button", { name: "Hide it and spell" }).waitFor();
    const target = await p.locator(".learning-word").innerText();
    await p.getByRole("button", { name: "Hide it and spell" }).click();
    await p.getByRole("textbox").fill("cas");
    await p.locator("h1").click();
    await p.waitForTimeout(200);
    const second = await browser.newContext({
      viewport: { width: 360, height: 800 },
    });
    await install(second);
    const q = await second.newPage();
    q.setDefaultTimeout(10000);
    await q.goto(URL);
    await q
      .getByRole("button", { name: "Parent sign in", exact: true })
      .click();
    await q.getByLabel("Email", { exact: true }).fill(email);
    await q.getByLabel("Password", { exact: true }).fill(password);
    await q.getByRole("button", { name: "Sign in", exact: true }).click();
    await q
      .getByRole("button", { name: "Synthetic Cross Device", exact: false })
      .click();
    await q
      .getByRole("button", { name: "Continue my words", exact: true })
      .click();
    await q.getByRole("textbox").waitFor();
    assert.equal(await q.getByRole("textbox").inputValue(), "cas");
    assert.equal(await q.locator(".learning-word").count(), 0);
    await q.getByRole("textbox").fill(target);
    await q
      .getByRole("button", { name: "Check spelling", exact: true })
      .click();
    await q.getByRole("heading", { name: "You got it!" }).waitFor();
    assert.match(
      await q.locator("main").innerText(),
      /Practised with the spelling shown/,
    );
    await q.getByRole("button", { name: "← Back", exact: true }).click();
    await q.getByRole("button", { name: "Parent area", exact: true }).click();
    await q
      .getByRole("button", { name: "Account, privacy and backups" })
      .click();
    await q
      .getByRole("heading", { name: "Parent account", exact: true })
      .waitFor();
    await first.close();
    await second.close();
  } finally {
    await browser.close();
  }
});
