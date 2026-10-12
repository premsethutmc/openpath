// Play the scene the way a child would on an Android phone (touch emulation), frame by frame.
//   node tools/playtest.mjs [outDir]          plays: wait for the question, tap Amma, tap the bag,
//                                              tap the list, tap away, tap the bag, tap Amma twice, wait
//   node tools/playtest.mjs [outDir] hands-off   never touches anything after Play
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , outDir = "/tmp/playtest", mode = "touch", device = "Pixel 7"] = process.argv;
mkdirSync(outDir, { recursive: true });
const { chromium, devices } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ ...devices[device], deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/fonts|Failed to load/.test(m.text())) errors.push(m.text()); });
await page.addInitScript(() => { window.__GAME_MANUAL = true; });
await page.goto("file://" + join(root, "dist/standalone.html"));
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
const vp = page.viewportSize();
let shot = 0;
const snap = async (name) => { await page.evaluate(() => window.__game.frame(0, true)); await page.screenshot({ path: join(outDir, `${String(++shot).padStart(2, "0")}-${name}.png`) }); };
const step = (secs) => page.evaluate(async (n) => { for (let i = 0; i < n; i++) { window.__game.frame(1 / 60, false); await new Promise((r) => setTimeout(r, 0)); } }, Math.round(secs * 60));
const state = () => page.evaluate(() => ({ s: window.__game.game.state, busy: window.__game.game.busy }));
const until = async (pred, max = 30) => { for (let t = 0; t < max; t += 0.25) { const s = await state(); if (pred(s)) return t; await step(0.25); } console.log(errors, JSON.stringify(await page.evaluate(() => window.__game.events.slice(-8)))); throw new Error("timed out waiting; state " + JSON.stringify(await state())); };
const tap = async (name) => { const p = await page.evaluate((n) => window.__game.where(n), name); await page.touchscreen.tap(Math.round(p.x), Math.round(p.y)); return p; };
const tapAt = (x, y) => page.touchscreen.tap(x, y);

await snap("before-play");
await page.tap("#play");
await step(2.2); await snap("walking-in");
await until((s) => s.s === "needBag" && !s.busy); await snap("where-is-my-bag");
if (mode === "hands-off") {
  await until((s) => s.s === "free", 60); await step(1); await snap("fetched-it-herself");
} else {
  await tap("amma"); await step(0.1); await snap("tap-amma-instant");
  await step(1.0); await snap("she-points-at-bag");
  await until((s) => !s.busy);
  await tap("bag"); await step(0.1); await snap("tap-bag-instant");
  await step(1.2); await snap("fetching");
  await until((s) => s.s === "free" && !s.busy); await snap("list-presented");
  await tap("list"); await step(1.4); await snap("list-close");
  await until((s) => !s.busy); await tapAt(vp.width * 0.85, vp.height * 0.3); await step(1.2); await snap("list-back");
  await until((s) => !s.busy); await tap("bag"); await step(1.3); await snap("peek-in-bag");
  await until((s) => !s.busy); await tap("amma"); await step(0.6); await snap("ask");
  await until((s) => !s.busy); await tap("amma"); await step(0.35); await snap("giggle");
  await until((s) => !s.busy); await step(10.5); await snap("invites");
}
await step(3);
const events = await page.evaluate(() => window.__game.events);
writeFileSync(join(outDir, "events.json"), JSON.stringify(events, null, 1));
console.log(events.map((e) => `${String(e.t).padStart(6)}  ${e.kind.padEnd(6)} ${e.text}`).join("\n"));
console.log(errors.length ? errors : "no errors", "viewport", vp);
await browser.close();
