import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { test } from "node:test";
import { chromium } from "playwright";

const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:4319";
const shots = process.env.SHOTS ?? "/tmp/universal-teaching-presentation";
mkdirSync(shots, { recursive: true });
const concepts = [
  { name: "place-value", board: "cbse", grade: 5, competency: "MATH.number.large-numbers", visual: ".place-value-visual" },
  { name: "integers", board: "cbse", grade: 7, competency: "MATH.number.integer-add", visual: ".movement-line" },
  { name: "fractions", board: "cbse", grade: 5, competency: "MATH.number.equivalent-fractions", visual: ".fraction-strip-visual" },
  { name: "cartesian-products", board: "tn", grade: 10, competency: "MATH.algebra.relations", visual: ".pair-visual" },
  { name: "equations", board: "cbse", grade: 7, competency: "MATH.algebra.linear-equations", visual: ".equation-visual" },
  { name: "mensuration", board: "cbse", grade: 5, competency: "MATH.measurement.area-squares", visual: ".geometry-visual" },
];

for (const width of [360, 393]) test(`${width}px universal teaching renders six family-driven lessons`, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
  const context = await browser.newContext({ viewport: { width, height: 820 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const writes = [];
  page.on("request", (request) => { if (request.url().includes("/api/") && request.method() !== "GET") writes.push(`${request.method()} ${request.url()}`); });
  try {
    for (const concept of concepts) {
      await page.goto(`${base}/curriculum/?preview=1#b=${concept.board}&g=${concept.grade}&c=${encodeURIComponent(concept.competency)}`);
      await page.locator(".teaching-page").waitFor();
      assert.ok(await page.locator(concept.visual).first().isVisible(), `${concept.name} selects its typed visual`);
      const worked = page.locator(".progressive-worked").first();
      assert.ok(await worked.isVisible(), `${concept.name} has checked progressive working`);
      if (await worked.getByRole("button", { name: /Next step/ }).count()) await worked.getByRole("button", { name: /Next step/ }).click();
      assert.equal(await worked.locator(".worked-step").count(), 1, "one tap reveals one step");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "teaching does not overflow");
      await page.screenshot({ path: `${shots}/${width}-${concept.name}.png`, fullPage: true });
      await page.getByRole("button", { name: "Practice this concept" }).click();
      await page.locator(".practice-workspace").waitFor();
      assert.ok(await page.getByLabel("Your answer").isVisible(), "existing keyboard practice opens");
      await page.getByRole("button", { name: /Teaching/ }).click();
      await page.locator(".teaching-page").waitFor();
    }
    assert.deepEqual(writes, [], "preview exploration and practice remain write-free");
  } finally {
    await context.close();
    await browser.close();
  }
});
