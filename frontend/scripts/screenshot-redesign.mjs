import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve("dist-math/math-standalone.html"), "utf-8");
const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

const OUT = "/tmp/claude-0/-home-claude/645cf7ab-6c49-5a89-8924-e7e3c91a94a9/scratchpad";

const browser = await chromium.launch();

async function shot(name, width, height, actions) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(dataUrl, { waitUntil: "networkidle" });
  if (actions) await actions(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await ctx.close();
  console.log(`  ✓ ${name}`);
}

console.log("Taking redesign screenshots...");

// 1. Desktop — before answering (guided mode, default)
await shot("redesign-desktop-before", 1280, 800);

// 2. Desktop — while working (hint requested + working revealed)
await shot("redesign-desktop-working", 1280, 800, async (page) => {
  // Click "Hint" button to show first hint
  const hintBtn = page.locator("button", { hasText: "Hint" });
  if (await hintBtn.count() > 0) {
    await hintBtn.first().click();
    await page.waitForTimeout(300);
  }
  // Show working steps
  const workingBtn = page.locator("button", { hasText: /working/i });
  if (await workingBtn.count() > 0) {
    await workingBtn.first().click();
    await page.waitForTimeout(300);
  }
  // Type partial answer
  const input = page.locator("input[type=text]");
  await input.fill("9");
  await page.waitForTimeout(200);
});

// 3. Desktop — after correct feedback
await shot("redesign-desktop-feedback", 1280, 800, async (page) => {
  const input = page.locator("input[type=text]");
  await input.fill("96");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
});

// 4. Mobile — before answering
await shot("redesign-mobile-before", 375, 812);

// 5. Mobile — while working (hint + working open)
await shot("redesign-mobile-working", 375, 812, async (page) => {
  const hintBtn = page.locator("button", { hasText: "Hint" });
  if (await hintBtn.count() > 0) {
    await hintBtn.first().click();
    await page.waitForTimeout(300);
  }
  const workingBtn = page.locator("button", { hasText: /working/i });
  if (await workingBtn.count() > 0) {
    await workingBtn.first().click();
    await page.waitForTimeout(300);
  }
});

// 6. Mobile — after correct feedback
await shot("redesign-mobile-feedback", 375, 812, async (page) => {
  const input = page.locator("input[type=text]");
  await input.fill("96");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
});

await browser.close();
console.log("Done! 6 screenshots.");
