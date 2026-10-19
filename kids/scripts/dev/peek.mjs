// Developer aid: play the episode in a headless browser and take screenshots every few seconds.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const [out = "shots", speed = "4", every = "2500", level = "younger", tap = ""] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const p = await b.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, hasTouch: true });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await p.goto(`http://127.0.0.1:4180/?speed=${speed}&level=${level}`);
await p.click(".play");
for (let i = 0; i < 400; i++) {
  await p.waitForTimeout(Number(every));
  await p.screenshot({ path: `${out}/${String(i).padStart(3, "0")}.png` });
  const st = await p.evaluate(() => ({ s: document.querySelector(".frame").dataset.state, t: document.querySelector(".frame").dataset.track, w: document.querySelector(".stage").dataset.window }));
  console.log(i, JSON.stringify(st));
  if (tap && st.w) {
    for (const id of tap.split(",")) {
      const hit = p.locator(`.hit[data-target="${id}"]`);
      if (await hit.count()) { await hit.tap(); await p.waitForTimeout(300); }
    }
  }
  if (st.s === "ended") break;
}
console.log("errors:", errors);
await b.close();
