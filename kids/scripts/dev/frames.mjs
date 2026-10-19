// Developer aid: measure animation smoothness in an Android-phone-sized browser with the CPU slowed down
// (Chrome DevTools CPU throttling), as a stand-in until a physical low-cost phone is checked.
//   node scripts/dev/frames.mjs [throttle=6] [seconds=60]
import { chromium } from "playwright";
const [throttle = "6", seconds = "60"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(throttle) });
await p.goto("http://127.0.0.1:4180/?mute=1");
await p.getByRole("button", { name: "Play" }).tap();
// Skip the quiet bedroom opening; measure the garden (walking, flying, ambient motion).
await p.waitForSelector(".frame[data-track='garden']", { timeout: 120000 });
const stats = await p.evaluate(
  (ms) =>
    new Promise((resolve) => {
      const gaps = [];
      let last = performance.now();
      const end = last + ms;
      const tick = (t) => {
        gaps.push(t - last);
        last = t;
        if (t < end) requestAnimationFrame(tick);
        else {
          gaps.sort((a, b) => a - b);
          const pct = (q) => gaps[Math.floor(gaps.length * q)];
          resolve({ frames: gaps.length, fps: +(gaps.length / (ms / 1000)).toFixed(1), median: +pct(0.5).toFixed(1), p95: +pct(0.95).toFixed(1), over50ms: gaps.filter((g) => g > 50).length });
        }
      };
      requestAnimationFrame(tick);
    }),
  Number(seconds) * 1000,
);
console.log(JSON.stringify({ throttle: Number(throttle), ...stats }));
await b.close();
