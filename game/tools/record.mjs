// Screen recording without a screen: step the scene one frame at a time, save every frame,
// build the soundtrack off-line against the same clock, and join them into a video.
//   node tools/record.mjs <out.mp4> [seconds=17.5] [fps=60] [WxH=1280x800]
// Needs ffmpeg. Frames are rendered by the real scene code, so the video is what a device plays.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , out = "amma-at-home.mp4", secs = "17.5", fps = "60", size = "1280x800"] = process.argv;
const [w, h] = size.split("x").map(Number), N = Math.round(+secs * +fps);
const tmp = join(root, "build/rec"); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
// the stage is as tall as the window allows (minus the reviewer's desk), so size the window to get exactly WxH
const page = await browser.newPage({ viewport: { width: w + 32, height: h + 170 }, deviceScaleFactor: 1 });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => { window.__GAME_MANUAL = true; });
await page.goto("file://" + join(root, "dist/standalone.html"));
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
const got = await page.evaluate(() => ({ w: window.__game.canvas.width, h: window.__game.canvas.height }));
console.log("canvas", got.w + "x" + got.h, "frames", N);
await page.evaluate(async (s) => { for (let i = 0; i < 20; i++) window.__game.frame(1 / 60, false); await window.__game.record(s + 1); }, +secs);
const sub = 60 / +fps;
for (let i = 0; i < N; i++) {
  const data = await page.evaluate(async (sub) => {
    for (let k = 0; k < sub; k++) { window.__game.frame(1 / 60, k === sub - 1); if (k < sub - 1) await new Promise((r) => setTimeout(r, 0)); }
    const url = window.__game.canvas.toDataURL("image/jpeg", 0.94);
    await new Promise((r) => setTimeout(r, 0));
    return url;
  }, sub);
  writeFileSync(join(tmp, `f${String(i).padStart(5, "0")}.jpg`), Buffer.from(data.slice(data.indexOf(",") + 1), "base64"));
  if (i % 120 === 0) console.log("frame", i);
}
const pcm = Buffer.from(await page.evaluate(() => window.__game.soundtrack()), "base64");
writeFileSync(join(tmp, "audio.pcm"), pcm);
await browser.close();
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", fps, "-i", join(tmp, "f%05d.jpg"), "-f", "s16le", "-ar", "44100", "-ac", "1", "-i", join(tmp, "audio.pcm"),
  "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out]);
console.log("wrote", out, errors.length ? errors : "no errors");
