/**
 * screen@1: one question of every type, opened on a phone-sized screen in a real browser, the way a child meets it.
 * For each: the question shows, nothing spills off the side of the screen, there is something to answer with,
 * "I'm stuck" opens the help, every step can be shown, and no written layout is cut off. It checks the screen, which
 * the robot learner (packages/learning/scripts/robot.ts) cannot see; it does not judge the teaching.
 *   node e2e/screen-robot.mjs --base http://127.0.0.1:4310 --samples samples.json --shard 0/4 --out screen-0.json
 *   node e2e/screen-robot.mjs --merge screen-*.json            prints the report (--gate: fail above the ceilings)
 */
import { readFileSync, writeFileSync } from "node:fs";

const arg = (k) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
const HARD = ["no-question", "page-error", "spills-off-screen", "nothing-to-answer-with", "help-does-not-open", "layout-cut-off", "spills-after-help"];

if (process.argv.includes("--merge")) {
  const rest = process.argv.slice(process.argv.indexOf("--merge") + 1), stop = rest.findIndex((x) => x.startsWith("--")), files = stop < 0 ? rest : rest.slice(0, stop);
  const rows = files.flatMap((f) => JSON.parse(readFileSync(f, "utf8")).rows);
  const kinds = [...new Set(rows.flatMap((r) => r.found.map((x) => x.kind)))];
  const clean = rows.filter((r) => !r.found.length).length;
  const lines = [`# Screen check (screen@1)`, ``, `**${clean} of ${rows.length} question types** open on a phone-sized screen (390 px wide) with nothing wrong: the question shows, nothing spills off the side, there is something to answer with, help opens and every step and layout fits.`, ``,
    `${rows.filter((r) => r.help).length} types have an "I'm stuck" button; ${rows.reduce((t, r) => t + r.steps, 0)} help steps were opened.`, ``,
    `| What went wrong | Types |`, `|---|---:|`, ...kinds.map((k) => `| ${k} | ${rows.filter((r) => r.found.some((x) => x.kind === k)).length} |`), ``,
    ...kinds.flatMap((k) => [`### ${k}`, ...rows.filter((r) => r.found.some((x) => x.kind === k)).slice(0, 60).map((r) => `- \`${r.family}\` ${r.id}: ${r.found.find((x) => x.kind === k).what}`), ``])];
  const out = lines.join("\n") + "\n";
  writeFileSync(arg("--report") ?? "screen-report.md", out);
  console.log(out.split("\n").slice(0, 14).join("\n"));
  if (process.argv.includes("--gate")) {
    const ceiling = JSON.parse(arg("--ceilings") ?? "{}"), floor = Number(arg("--floor") ?? 0);
    const bad = [...kinds.filter((k) => rows.filter((r) => r.found.some((x) => x.kind === k)).length > (ceiling[k] ?? 0)).map((k) => `${k}: ${rows.filter((r) => r.found.some((x) => x.kind === k)).length} types (ceiling ${ceiling[k] ?? 0})`), ...(rows.length < floor ? [`only ${rows.length} types were opened (at least ${floor} expected)`] : [])];
    if (bad.length) { console.error(`screen@1 gate: FAILED\n${bad.map((b) => `  ${b}`).join("\n")}`); process.exit(1); }
    console.log("screen@1 gate: passed");
  }
} else {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  const base = arg("--base") ?? "http://127.0.0.1:4310", [part, of] = (arg("--shard") ?? "0/1").split("/").map(Number);
  const samples = JSON.parse(readFileSync(arg("--samples"), "utf8")).filter((_, i) => i % of === part);
  const browser = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.route("**/api/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  const rows = [], t0 = Date.now();
  const spills = (page) => page.evaluate(() => { const w = document.documentElement.scrollWidth - innerWidth; if (w <= 1) return null; const el = [...document.querySelectorAll("main *")].find((e) => e.getBoundingClientRect().right > innerWidth + 1 && e.getBoundingClientRect().width > 0 && !e.closest(".scene, svg")); return `${w} px past the edge${el ? ` (${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""}: "${(el.textContent ?? "").trim().slice(0, 40)}")` : ""}`; });
  // one look at one question; `slow` multiplies every wait (the second look, when the first found something)
  const look = async (s, tag, slow) => {
    const found = [], note = (kind, what) => found.push({ kind, what: String(what).slice(0, 200) });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(String(e.message ?? e)));
    let help = false, steps = 0;
    try {
      await page.goto(`${base}/year/?n=${tag}#try=${encodeURIComponent(s.id)}`, { waitUntil: "load" });
      const shown = await page.locator(".prompt").first().waitFor({ state: "visible", timeout: 8000 * slow }).then(() => true, () => false);
      if (!shown) note("no-question", (await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 120) || "nothing rendered");
      else {
        if (slow > 1) await page.waitForTimeout(600);
        const off = await spills(page); if (off) note("spills-off-screen", off);
        const control = await page.locator('main input:not([type=search]), main textarea, main [role=radio], main [role=radiogroup] button, main .options button, main .scene, main select').count();
        if (!control) note("nothing-to-answer-with", "no box, option or picture to answer with");
        // one-place@1: help lives inside "Work it out step by step"; open it first
        const working = page.locator(".working > summary").first();
        if (await working.count()) await working.click();
        const stuck = page.getByRole("button", { name: /I'm stuck|Help me with the next step/ });
        if (await stuck.count()) {
          help = true;
          await stuck.first().click();
          const opened = await page.locator(".coach").first().waitFor({ state: "visible", timeout: 4000 * slow }).then(() => true, () => false);
          if (!opened) note("help-does-not-open", "the button did nothing");
          else {
            for (let k = 0; k < 40; k++) {
              const show = page.locator(".coach-help").last();
              if (!(await show.count()) || !(await show.isVisible())) break;
              await show.click(); steps++;
              await page.waitForTimeout(40 * slow);
            }
            const cut = await page.evaluate(() => [...document.querySelectorAll(".coach-board")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => `${e.scrollWidth - e.clientWidth} px: ${(e.textContent ?? "").split("\n")[0].trim().slice(0, 40)}`)[0] ?? null);
            if (cut) note("layout-cut-off", cut);
            const after = await spills(page); if (after && !off) note("spills-after-help", after);
          }
        }
      }
    } catch (e) { note("page-error", `the check itself failed: ${String(e.message ?? e).split("\n")[0]}`); }
    if (errors.length) note("page-error", errors[0]);
    await page.close();
    return { family: s.family, id: s.id, help, steps, found };
  };
  for (const [i, s] of samples.entries()) {
    let row = await look(s, `${part}-${i}`, 1);
    // a busy machine can be slow to draw a heavy question: what is reported is what is still wrong on a second, patient look
    if (row.found.length) row = { ...(await look(s, `${part}-${i}-again`, 4)), again: true };
    rows.push(row);
  }
  await browser.close();
  writeFileSync(arg("--out") ?? `screen-${part}.json`, JSON.stringify({ schema: "screen@1", shard: `${part}/${of}`, rows }) + "\n");
  console.log(`screen@1 shard ${part}/${of}: ${rows.length} types, ${rows.filter((r) => r.found.length).length} with something wrong, ${Math.round((Date.now() - t0) / 1000)} s`);
}
