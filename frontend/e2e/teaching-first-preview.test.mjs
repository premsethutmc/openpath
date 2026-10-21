import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { test } from "node:test";
import { chromium } from "playwright";

const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:4312";
const shots = process.env.SHOTS ?? "/tmp/teaching-first-preview";
mkdirSync(shots, { recursive: true });
const examples = [
  { board: "tn", grade: 10, competency: "MATH.algebra.relations", name: "tn-grade10", wrong: "40", right: "6" },
  { board: "cbse", grade: 7, competency: "MATH.number.integer-add", name: "cbse-grade7", wrong: "1", right: "51" },
];

for (const width of [360, 393]) test(`${width}px teaching-first preview uses real Grade 7 and Tamil Nadu Grade 10 content`, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
  const context = await browser.newContext({ viewport: { width, height: 820 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const writes = [];
  page.on("request", (r) => { if (r.url().includes("/api/") && r.method() !== "GET") writes.push(`${r.method()} ${r.url()}`); });
  try {
    for (const x of examples) {
      await page.goto(`${base}/curriculum/?preview=1#b=${x.board}&g=${x.grade}&c=${encodeURIComponent(x.competency)}`);
      await page.locator(".teaching-page").waitFor();
      assert.ok(await page.locator(".teaching-math").first().isVisible(), "worked mathematics opens with teaching");
      assert.equal(await page.locator(".preview-stages").count(), 0, "developer state strip is removed");
      assert.equal(await page.locator(".tech, .families, .review-line").count(), 0, "no internal metadata is shown");
      if (x.board === "tn") assert.doesNotMatch(await page.locator(".teaching-page").innerText(), /reflexive|symmetric|transitive/i, "the product-count lesson does not mix in a separate relations-property concept");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "teaching has no horizontal overflow");
      await page.screenshot({ path: `${shots}/${width}-${x.name}-teaching.png`, fullPage: true });

      await page.getByRole("button", { name: "Practice this concept" }).click();
      await page.locator(".practice-workspace").waitFor();
      assert.ok(await page.getByLabel("Your answer").isVisible(), "keyboard answer input is available");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "practice has no horizontal overflow");
      const first = await page.locator(".practice-head h2").innerText();
      await page.getByLabel("Your answer").fill(x.wrong);
      await page.getByRole("button", { name: "Check answer" }).click();
      await page.getByText("Not quite yet.", { exact: true }).waitFor();
      if (x.board === "tn") await page.screenshot({ path: `${shots}/${width}-${x.name}-practice.png`, fullPage: true });
      await page.getByRole("button", { name: "Try again" }).click();
      await page.getByLabel("Your answer").fill(x.right);
      await page.getByRole("button", { name: "Check answer" }).click();
      await page.getByText("That’s right.", { exact: true }).waitFor();
      if (x.board === "cbse") {
        assert.match(await page.locator(".practice-feedback").innerText(), /subtracting a negative|adding its opposite|51/i);
        await page.screenshot({ path: `${shots}/${width}-${x.name}-practice.png`, fullPage: true });
      }
      await page.getByRole("button", { name: "Another question" }).click();
      assert.notEqual(await page.locator(".practice-head h2").innerText(), first, "another question is fresh");
      await page.getByRole("button", { name: /Teaching/ }).click();
      await page.locator(".teaching-page").waitFor();
    }
    assert.deepEqual(writes, [], "read-only preview never writes learner evidence");
  } finally {
    await context.close();
    await browser.close();
  }
});
