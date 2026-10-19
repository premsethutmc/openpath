// Developer aid: record a real-time screen video of the episode in a tablet-sized browser.
//   node scripts/dev/record.mjs <out-dir> <touch|none> [level]
// Video has no sound (headless browsers record pictures only).
import { mkdirSync, renameSync } from "node:fs";
import { chromium } from "playwright";
const [out, mode = "none", level = "younger"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const size = { width: 1280, height: 720 };
const ctx = await b.newContext({ viewport: size, hasTouch: true, isMobile: true, deviceScaleFactor: 1, recordVideo: { dir: out, size } });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:4180/?mute=1&level=${level}`);
await p.waitForTimeout(1500);
await p.getByRole("button", { name: "Play" }).tap();
if (mode === "touch") {
  await p.waitForSelector('svg.stage[data-window="pick-apple"]', { timeout: 300000 });
  await p.waitForTimeout(3500);
  await p.locator('.hit[data-target="apple-green"]').tap();
  const win = level === "older" ? "count-apples-5" : "count-apples-3";
  await p.waitForSelector(`svg.stage[data-window="${win}"]`, { timeout: 300000 });
  await p.waitForTimeout(3000);
  for (const id of level === "older" ? ["b4", "b1", "b2", "b3", "b5"] : ["b1", "b2", "b3"]) {
    await p.locator(`.hit[data-target="${id}"]`).tap();
    await p.waitForTimeout(1300);
  }
}
await p.waitForSelector(".frame[data-state='ended']", { timeout: 400000 });
await p.waitForTimeout(2500);
const video = p.video();
await ctx.close();
const path = await video.path();
renameSync(path, `${out}/chintoo-${mode === "touch" ? "with-touches" : "no-touches"}-${level}.webm`);
await b.close();
console.log("done");
