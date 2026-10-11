// Review aid: step the scene frame by frame in a headless browser and save stills.
//   node tools/shots.mjs <outDir> <WxH> <t1,t2,...> [taps: "amma@17,list@21"]
// Time is driven by hand (1/60 s per step), so a still at 7.25 s is the same on every machine.
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./browser.mjs";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , outDir = "/tmp/poc", size = "1280x800", times = "1,3,5", taps = "", clipArg = ""] = process.argv;
const clip = clipArg ? (([x, y, width, height]) => ({ x, y, width, height }))(clipArg.split(",").map(Number)) : null;
const snap = async (page, path) => { if (clip) { const b = await page.locator("#stage").boundingBox(); await page.screenshot({ path, clip: { x: b.x + clip.x, y: b.y + clip.y, width: clip.width, height: clip.height } }); } else await page.locator("#stage").screenshot({ path }); };
const [w, h] = size.split("x").map(Number);
mkdirSync(outDir, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message + "\n" + (e.stack || "").split("\n").slice(0, 4).join("\n")));
await page.addInitScript(() => { window.__POC_MANUAL = true; });
await page.goto("file://" + join(root, "dist/standalone.html"));
await page.waitForFunction(() => window.__poc || document.querySelector("#loading")?.textContent.includes("could not"), null, { timeout: 30000 });
if (!(await page.evaluate(() => !!window.__poc))) { console.log("BOOT FAILED", await page.evaluate(() => document.querySelector("#loading").textContent), errors); await browser.close(); process.exit(1); }
const tapList = taps ? taps.split(",").map((s) => { const [who, t] = s.split("@"); return { who, t: +t, done: false }; }) : [];
const want = times.split(",").flatMap((t) => { if (!t.includes(":")) return [Number(t)]; const [a, b, st] = t.split(":").map(Number); const o = []; for (let v = a; v <= b + 1e-9; v += st) o.push(+v.toFixed(3)); return o; }).sort((a, b) => a - b);
await page.evaluate(() => { for (let i = 0; i < 30; i++) window.__poc.frame(1 / 60, i === 29); });
if (want[0] <= 0) { await snap(page, join(outDir, "t-pre.png")); want.shift(); }
await page.evaluate(() => window.__poc.start());
let t = 0;
for (const target of want) {
  while (t < target - 1e-6) {
    const chunk = Math.max(1, Math.min(30, Math.round((target - t) * 60)));
    await page.evaluate(async (n) => { for (let i = 0; i < n; i++) { window.__poc.frame(1 / 60, false); await new Promise((r) => setTimeout(r, 0)); } }, chunk);
    t += chunk / 60;
    for (const tp of tapList) if (!tp.done && t >= tp.t) { tp.done = true; await page.evaluate((who) => (who === "amma" ? window.__poc.tapAmma() : window.__poc.tapList()), tp.who); }
  }
  await page.evaluate(() => window.__poc.frame(0, true));
  await snap(page, join(outDir, `t${target.toFixed(2).padStart(6, "0")}.png`));
}
console.log("shots", want.length, "phase", await page.evaluate(() => window.__poc.phase), errors.length ? errors : "no errors");
await browser.close();
