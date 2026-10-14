/**
 * Reproducible demonstration of the doubling journey for six synthetic learners (A–F), in a real browser at
 * phone size, against the production build. Writes screenshots of the child-facing screens and the parent
 * summary, plus an index page, to out/journey-demo/.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 node scripts/demo-journeys.mjs
 *
 * The learners answer by fixed rules (no randomness), so every run gives the same screens. They show how the
 * software behaves, not how real children learn. All journey content is provisional.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const OUT = new globalThis.URL("../out/journey-demo/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const CONTENT = new globalThis.URL("../../content/english/", import.meta.url);
const items = new Map(
  ["items/code-items.json", "items/e2a-items.json", "items/e2b-items.json", "spelling/generated-items.json"].flatMap((f) => JSON.parse(readFileSync(new globalThis.URL(f, CONTENT), "utf8")).map((i) => [i.id, i])),
);
for (const i of JSON.parse(readFileSync(new globalThis.URL("web/doubling-journey.json", CONTENT), "utf8")).items) items.set(i.id, i);

const contrast = (i) => (i.family ?? "").endsWith(".contrast");
const right = (i) => i.answers[0];
const noDouble = (i) => (i.generated ? i.generated.base + i.generated.join.replace("-", "") : (Object.entries(i.wrong ?? {}).find(([, t]) => t === "no_doubling")?.[0] ?? i.answers[0]));

/** Each learner: independent(item, taught) and guided(item, taught) → hints needed (0 first try, Infinity never). */
const LEARNERS = {
  A: { label: "Understands doubling and succeeds on their own", independent: () => true, guided: () => 0 },
  B: { label: "Fails at first, responds to teaching, then succeeds on unfamiliar words", independent: (_, t) => t.length > 0, guided: () => 0 },
  C: { label: "The first explanation does not work; a different approach does", independent: (i, t) => t.includes("sound_first") || contrast(i), guided: (_, t) => (t.includes("sound_first") ? 0 : Infinity) },
  D: { label: "Succeeds only after hints", independent: (i) => contrast(i), guided: () => 1 },
  E: { label: "Repeatedly fails; the app stops and recommends support", independent: (i) => contrast(i), guided: () => Infinity },
  F: { label: "Succeeds, then fails the check a week later", independent: () => true, guided: () => 0, returnAfterDays: 8, onReturn: (i) => contrast(i) },
};

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const index = [];

async function run(key, L) {
  const context = await browser.newContext(PHONE);
  const page = await context.newPage();
  const shots = [];
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = async (name, caption) => {
    const file = `${key}-${String(shots.length + 1).padStart(2, "0")}-${name}.png`;
    await page.screenshot({ path: OUT + file, fullPage: true });
    shots.push({ file, caption });
  };
  await page.goto(URL);
  await page.getByLabel(/Name to show/).fill(`Learner ${key}`);
  await page.getByRole("button", { name: "Create and start" }).click();
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Create and start" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByRole("button", { name: /doubling letters/ }).click();

  const taught = [];
  const seen = new Set();
  const firstOf = async (kind, name, caption) => {
    if (!seen.has(kind)) {
      seen.add(kind);
      await shot(name, caption);
    }
  };
  const journey = async (independent, phase) => {
    for (let guard = 0; guard < 120; guard++) {
      const step = page.locator("[data-step]");
      await step.first().waitFor();
      const kind = await step.first().getAttribute("data-step");
      if (kind === "summary") {
        await shot(`${phase}-summary`, phase === "return" ? "Summary after the check a week later, with the parent view" : "Summary for the child, with the parent view");
        return;
      }
      if (kind === "teach") {
        const strategy = await step.first().getAttribute("data-strategy");
        await shot(`lesson-${strategy}`, `Lesson: ${strategy.replace(/_/g, " ")}${taught.length ? " (a different approach)" : ""}`);
        taught.push(strategy);
        await page.getByRole("button", { name: "Practise with help" }).click();
        await page.locator('[data-step="guided"], [data-step="question"], [data-step="summary"]').first().waitFor();
        continue;
      }
      const id = await page.locator(".item").getAttribute("data-item");
      const item = items.get(id);
      if (kind === "question") {
        const purpose = await step.first().getAttribute("data-purpose");
        await page.locator(".ruled input").fill(independent(item, taught) ? right(item) : noDouble(item));
        await page.getByRole("button", { name: "Check", exact: true }).click();
        await page.locator(".feedback").waitFor();
        await firstOf(`${phase}-${purpose}`, `${phase}-${purpose}`, purpose === "assessment" ? "A question on their own (no hints), with feedback" : purpose === "reassess" ? "A new word on their own after teaching" : "The check a week later (no hints)");
        await page.getByRole("button", { name: "Next" }).click();
        await page.locator(".feedback").waitFor({ state: "detached" });
        continue;
      }
      // guided practice
      const need = L.guided(item, taught);
      for (let hints = 0; ; hints++) {
        await page.locator(".ruled input").fill(hints >= need ? right(item) : noDouble(item));
        await page.getByRole("button", { name: "Check", exact: true }).click();
        await page.locator(".feedback").waitFor();
        if (await page.getByRole("button", { name: "Next" }).count()) break;
        await page.getByRole("button", { name: "Show a hint" }).click();
        await page.locator(".hints li").nth(hints).waitFor();
        await page.locator(".feedback").waitFor({ state: "detached" });
        await firstOf("hint", "guided-hint", "Practice with help, after a hint (never counted as on their own)");
      }
      await firstOf("guided", "guided-done", "Practice with help: the outcome of one word");
      await page.getByRole("button", { name: "Next" }).click();
      await page.locator(".feedback").waitFor({ state: "detached" });
    }
    throw new Error(`learner ${key}: the journey did not finish`);
  };

  await journey(L.independent, "first");
  if (L.returnAfterDays) {
    await page.getByRole("button", { name: "Back to today" }).click();
    await page.getByRole("heading", { name: "Today" }).waitFor();
    await page.evaluate((d) => localStorage.setItem("openpath-english-clock-offset-days", String(d)), L.returnAfterDays);
    await page.reload();
    await page.getByRole("heading", { name: "Today" }).waitFor();
    await page.getByRole("button", { name: /doubling letters/ }).click();
    for (let k = 0; k < 2; k++) {
      await page.locator('[data-step="question"][data-purpose="retention"]').waitFor({ timeout: 8000 }).catch(async (e) => { await page.screenshot({ path: OUT + "debug.png", fullPage: true }); const ev = await page.evaluate(async () => { const name = (await indexedDB.databases())[0].name; const db = await new Promise((r) => { const q = indexedDB.open(name); q.onsuccess = () => r(q.result); }); return await new Promise((r) => { const q = db.transaction("events").objectStore("events").getAll(); q.onsuccess = () => r(q.result.map((x) => x.event ?? x)); }); }); console.log(JSON.stringify(ev.slice(-8).map((e) => [e.kind, e.at, e.session, e.item?.id, e.provenance ? "prov" : ""]))); throw e; });
      const item = items.get(await page.locator(".item").getAttribute("data-item"));
      await page.locator(".ruled input").fill(L.onReturn(item) ? right(item) : noDouble(item));
      await page.getByRole("button", { name: "Check", exact: true }).click();
      await page.locator(".feedback").waitFor();
      if (k === 0) await shot("return-retention", "A week later: the check, on their own");
      await page.getByRole("button", { name: "Next" }).click();
      await page.locator(".feedback").waitFor({ state: "detached" });
    }
    await page.getByRole("button", { name: "Save and leave" }).click();
    await page.getByRole("button", { name: "Progress" }).click();
    await page.locator(".parent").waitFor();
    await shot("return-parent", "Parent summary after the failed check: earlier progress kept, retention failed");
  }
  if (errors.length) throw new Error(`learner ${key}: ${errors.join("; ")}`);
  index.push({ key, label: L.label, shots });
  await context.close();
}

for (const [key, L] of Object.entries(LEARNERS)) await run(key, L);
await browser.close();

const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Doubling journey demo</title>
<style>body{font:16px system-ui,sans-serif;margin:24px;color:#222}h2{margin-top:2rem}.row{display:flex;gap:16px;overflow-x:auto}figure{margin:0;flex:0 0 260px}img{width:260px;border:1px solid #ccc;border-radius:8px}figcaption{font-size:13px;color:#555}.warn{background:#fff4d6;padding:12px;border-radius:8px}</style>
<h1>OpenPath: the consonant-doubling journey, six synthetic learners</h1>
<p class="warn">Demonstration only. The learners are synthetic and answer by fixed rules; this shows how the software behaves, not how children learn. All questions, lessons and hints in the journey are provisional and not yet reviewed by an educator.</p>
${index.map((l) => `<h2>Learner ${l.key}: ${l.label}</h2><div class="row">${l.shots.map((s) => `<figure><img src="${s.file}" alt="${s.caption}"><figcaption>${s.caption}</figcaption></figure>`).join("")}</div>`).join("\n")}`;
writeFileSync(OUT + "index.html", html);
console.log(`wrote ${index.reduce((t, l) => t + l.shots.length, 0)} screenshots and index.html to ${OUT}`);
