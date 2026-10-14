/**
 * Reproducible demonstration of the doubling journey for eight synthetic learners (A–H), in a real browser at
 * phone size, against the production build. Writes screenshots of the child-facing screens and the parent
 * summary, plus an index page, to out/journey-demo/.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 node scripts/demo-journeys.mjs
 *
 * The learners answer by fixed rules (no randomness), so every run gives the same screens. They show how the
 * software behaves, not how real children learn. All journey content is provisional.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const OUT = new globalThis.URL("../out/journey-demo/", import.meta.url).pathname;
rmSync(OUT, { recursive: true, force: true }); // no screenshots left over from an earlier run
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
  A: { label: "Understands doubling and succeeds on their own; still right 30 days later", independent: () => true, guided: () => 0, returnAfterDays: 30, onReturn: () => true },
  B: { label: "Fails at first, responds to teaching, then succeeds on unfamiliar words", independent: (_, t) => t.length > 0, guided: () => 0 },
  C: { label: "The first explanation does not work; a different approach does", independent: (i, t) => t.includes("sound_first") || contrast(i), guided: (_, t) => (t.includes("sound_first") ? 0 : Infinity) },
  D: { label: "Succeeds only after hints", independent: (i) => contrast(i), guided: () => 1 },
  E: { label: "Repeatedly fails; the app stops and recommends support", independent: (i) => contrast(i), guided: () => Infinity },
  F: { label: "Succeeds, then fails the check seven days later", independent: () => true, guided: () => 0, returnAfterDays: 7, onReturn: (i) => contrast(i) },
  G: { label: "Applies the rule but makes a typing slip (two letters swapped) on the first word", independent: () => true, guided: () => 0, slipFirst: true },
  H: { label: "Doubles every final consonant, including where it must not", independent: () => true, guided: () => 0, overDouble: true },
};
/** The over-doubled form tagged on a contrast item (jump → jumpping); elsewhere the right answer. */
const overDouble = (i) => Object.entries(i.wrong ?? {}).find(([, t]) => t === "over_doubling")?.[0] ?? right(i);
/** The right answer with its last two letters swapped: a slip, not a rule error. */
const slip = (i) => { const a = right(i); return a.slice(0, -2) + a.at(-1) + a.at(-2); };

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
  await page.getByRole("button", { name: "More practice", exact: true }).click();
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
        const first = !seen.has("answered") && (seen.add("answered"), true);
        await page.locator(".ruled input").fill(L.slipFirst && first ? slip(item) : L.overDouble ? overDouble(item) : independent(item, taught) ? right(item) : noDouble(item));
        await page.getByRole("button", { name: "Check", exact: true }).click();
        await page.locator(".feedback").waitFor();
        const contrastItem = contrast(item);
        await firstOf(
          `${phase}-${purpose}${purpose === "reassess" && contrastItem ? "-contrast" : ""}`,
          `${phase}-${purpose}${purpose === "reassess" && contrastItem ? "-contrast" : ""}`,
          purpose === "assessment" ? "A question on their own (no hints), with feedback" : purpose === "reassess" ? (contrastItem ? "After teaching: a new word that must NOT double" : "A new word on their own after teaching") : "The check a week later (no hints)",
        );
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
        await page.getByRole("button", { name: /^Show a (hint|worked example)$/ }).click();
        await page.locator(".hints li").nth(hints).waitFor();
        await page.locator(".feedback").waitFor({ state: "detached" });
        await firstOf("hint", "guided-hint", "Practice with help, after a hint (never counted as on their own)");
        if (hints === 2) await firstOf("worked", "guided-worked-example", "The third hint is a labelled worked example that shows the answer; what follows is help, not evidence");
      }
      await firstOf("guided", "guided-done", "Practice with help: the outcome of one word");
      if (await page.locator('[data-step="guided"] .hints li[data-worked]').count()) {
        await page.getByRole("button", { name: "Next" }).click();
        await page.locator(".feedback").waitFor({ state: "detached" });
        if (await page.locator('[data-step="guided"] .try-first').count()) await firstOf("try-first", "guided-after-worked-example", "After a worked example: the next word is new and tried once without a hint");
        continue;
      }
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
    await page.getByRole("button", { name: "More practice", exact: true }).click();
  await page.getByRole("button", { name: /doubling letters/ }).click();
    for (let k = 0; k < 2; k++) {
      await page.locator('[data-step="question"][data-purpose="retention"]').waitFor({ timeout: 8000 });
      const item = items.get(await page.locator(".item").getAttribute("data-item"));
      await page.locator(".ruled input").fill(L.onReturn(item) ? right(item) : noDouble(item));
      await page.getByRole("button", { name: "Check", exact: true }).click();
      await page.locator(".feedback").waitFor();
      if (k === 0) await shot("return-retention", `${L.returnAfterDays} days later: the check, on their own`);
      await page.getByRole("button", { name: "Next" }).click();
      await page.locator(".feedback").waitFor({ state: "detached" });
    }
    if (await page.locator('[data-step="summary"]').count()) {
      await shot("return-summary", `Summary after the check ${L.returnAfterDays} days later`);
      await page.getByRole("button", { name: "Back to today" }).click();
    } else await page.getByRole("button", { name: "Save and leave" }).click();
    await page.getByRole("button", { name: "Progress" }).click();
    await page.locator(".parent").waitFor();
    await shot("return-parent", `Parent summary after the check ${L.returnAfterDays} days later`);
  }
  // what the parent summary says, line by line, with how each answer was given (for the verification record)
  if (!(await page.locator(".parent").count())) {
    if (await page.getByRole("button", { name: "Back to today" }).count()) await page.getByRole("button", { name: "Back to today" }).click();
    await page.getByRole("button", { name: "Progress" }).click();
  }
  await page.locator(".parent").waitFor();
  const parent = await page.locator(".parent").evaluate((el) => ({
    text: el.innerText,
    lines: [...el.querySelectorAll("li[data-kind]")].map((li) => ({ kind: li.getAttribute("data-kind"), evidence: li.getAttribute("data-evidence"), text: li.textContent })),
  }));
  if (errors.length) throw new Error(`learner ${key}: ${errors.join("; ")}`);
  index.push({ key, label: L.label, shots, parent });
  await context.close();
}

for (const [key, L] of Object.entries(LEARNERS)) await run(key, L);
await browser.close();

const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Doubling journey demo</title>
<style>body{font:16px system-ui,sans-serif;margin:24px;color:#222}h2{margin-top:2rem}.row{display:flex;gap:16px;overflow-x:auto}figure{margin:0;flex:0 0 260px}img{width:260px;border:1px solid #ccc;border-radius:8px}figcaption{font-size:13px;color:#555}.warn{background:#fff4d6;padding:12px;border-radius:8px}</style>
<h1>OpenPath: the consonant-doubling journey, eight synthetic learners</h1>
<p class="warn">Demonstration only. The learners are synthetic and answer by fixed rules; this shows how the software behaves, not how children learn. All questions, lessons and hints in the journey are provisional and not yet reviewed by an educator.</p>
${index.map((l) => `<h2>Learner ${l.key}: ${l.label}</h2><div class="row">${l.shots.map((s) => `<figure><img src="${s.file}" alt="${s.caption}"><figcaption>${s.caption}</figcaption></figure>`).join("")}</div>`).join("\n")}`;
writeFileSync(OUT + "index.html", html);
writeFileSync(OUT + "parent-reports.json", JSON.stringify(index.map(({ key, label, parent }) => ({ key, label, ...parent })), null, 1));
// the verification record: what each parent summary must and must not say
const kinds = (k) => new Set(index.find((l) => l.key === k).parent.lines.map((x) => x.kind));
const text = (k) => index.find((l) => l.key === k).parent.text;
const checks = [
  ["every summary states the content is provisional", index.every((l) => /provisional: not yet reviewed by an educator/.test(l.parent.text))],
  ["A: no difficulty lines, no help, retention confirmed after 30 days, not called verified", kinds("A").size === 0 && /None: every answer/.test(text("A")) && /Confirmed: still right after at least a week/.test(text("A")) && /not a verified result/.test(text("A"))],
  ["B: independent errors only, no assisted lines, progress not mastery", kinds("B").has("independent") && !kinds("B").has("assisted") && /not yet mastery/.test(text("B"))],
  ["C: assisted lines kept apart from independent ones; a second approach recorded", kinds("C").has("assisted") && kinds("C").has("independent") && /Yes: 2 approaches tried/.test(text("C"))],
  ["D: right only with help; no independent success claimed", /12 right after a hint/.test(text("D")) && /0 right at the first try/.test(text("D")) && /not yet without help/.test(text("D"))],
  ["E: three approaches, then support recommended; 36 hints counted once, 12 of them worked examples", /Yes: 3 approaches tried/.test(text("E")) && /36 hints used, of which 12 were worked examples showing the answer/.test(text("E")) && /recommend a teacher or parent/.test(text("E"))],
  ["F: retention failed after 7 days, earlier progress kept", /Not kept: wrong at the check after a week/.test(text("F")) && /First shown on/.test(text("F"))],
  ["G: a slip is shown as a slip, not as a rule error; no lesson was given", kinds("G").has("slip") && !kinds("G").has("independent") && !kinds("G").has("pattern") && /No teaching yet/.test(text("G")) && /Shown without help on new words today/.test(text("G"))],
  ["H: never passes a reassessment (every 'must not double' word wrong); the question gap is reported, not hidden", /2 of 2 new words right without help, and 0 of 1 words that must not double/.test(text("H")) && !/1 of 1 words that must not double/.test(text("H")) && /not a result about the learner/.test(text("H")) && /also doubles where it should not/.test(text("H"))],
  ["B and C: each approach that worked was checked on a word that must not double", /1 of 1 words that must not double/.test(text("B")) && /2 of 2 new words right without help, and 1 of 1 words that must not double/.test(text("C"))],
  ["no summary shows a probability or percentage", index.every((l) => !/%|probabilit/i.test(l.parent.text))],
];
writeFileSync(OUT + "verification.json", JSON.stringify(checks.map(([what, pass]) => ({ what, pass })), null, 1));
for (const [what, pass] of checks) console.log(`${pass ? "PASS" : "FAIL"}  ${what}`);
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
console.log(`wrote ${index.reduce((t, l) => t + l.shots.length, 0)} screenshots and index.html to ${OUT}`);
