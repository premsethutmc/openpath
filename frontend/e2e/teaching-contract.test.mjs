/** teaching-contract@1 in the browser: the number-pattern lesson (CBSE Grade 6) shows sections labelled by role, and what
 *  each section draws is its own question's mathematics (read-only preview, nothing saved). */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { test } from "node:test";
import { chromium } from "playwright";

const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:4312";
const shots = process.env.SHOTS ?? "/tmp/teaching-contract";
mkdirSync(shots, { recursive: true });
const terms = (text) => (/: ([\d, ]+)\./.exec(text)?.[1] ?? "").split(",").map((x) => Number(x.trim()));

for (const width of [360, 393]) test(`${width}px number patterns: roles, and pictures of each section's own pattern`, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
  const page = await (await browser.newContext({ viewport: { width, height: 820 }, isMobile: true, hasTouch: true })).newPage();
  try {
    await page.goto(`${base}/curriculum/?preview=1#b=cbse&g=6&c=MATH.algebra.figurate-numbers`);
    await page.locator(".teaching-page").waitFor();
    const blocks = page.locator(".teaching-block");
    assert.deepEqual(await blocks.evaluateAll((els) => els.map((e) => e.dataset.role)), ["concept", "worked-example", "strategy", "misconception"]);
    assert.deepEqual(await page.locator(".teaching-block > .teaching-step .teaching-label").allTextContents(), ["The idea", "Worked example", "Another way", "Common mistake"]);
    assert.equal(await page.getByText(/^Example \d/).count(), 0, "no section is called an example unless it is a worked example");
    // concept: the table is the question's own first four terms, and its gaps are recomputed from them
    const concept = blocks.nth(0), conceptText = await concept.innerText();
    const table = concept.locator(".sequence-visual, .dot-visual");
    await table.first().waitFor();
    if (await concept.locator(".sequence-visual").count()) {
      const values = (await concept.locator(".sequence-visual tbody tr").first().locator("td").allTextContents()).map(Number);
      assert.ok(conceptText.includes(values.join(", ")), `concept text quotes the table's terms ${values}`);
    }
    // worked example: the picture is the same instance, every step can be revealed, and the last step states a result
    const worked = blocks.nth(1);
    assert.equal(await worked.getAttribute("data-verified"), "true");
    const dots = worked.locator(".dot-visual");
    if (await dots.count()) assert.equal(await dots.locator("circle").count(), Number(await dots.getAttribute("data-value")), "the dots drawn are the value shown");
    const example = worked.locator(".progressive-worked");
    while (await example.getByRole("button", { name: /Next step/ }).count()) await example.getByRole("button", { name: /Next step/ }).click();
    const steps = await example.locator(".step-expression").allTextContents();
    assert.ok(steps.length >= 2 && /= \d+$/.test(steps.at(-1).trim()), `complete solution: ${steps}`);
    // strategy: the gaps table shows the question's own terms
    const strategy = blocks.nth(2), stratText = await strategy.innerText();
    const listed = terms(`x: ${/(\d+(?:, \d+){3})/.exec(stratText)?.[1] ?? ""}.`);
    assert.equal(listed.length, 4, stratText);
    assert.ok(stratText.includes(listed.slice(1).map((v, i) => `+${v - listed[i]}`).join(", ")), "the gaps quoted are those of the terms quoted");
    assert.equal(await page.locator(".teaching-page figure[data-kind='dots'], .teaching-page .dots").count(), 0, "no decorative dot pictures");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${shots}/${width}-number-patterns.png`, fullPage: true });
  } finally {
    await browser.close();
  }
});
