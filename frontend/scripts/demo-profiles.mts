/**
 * Phone-size demonstration of the learner profile and development plan, in the real application.
 *
 *   npm run english:build && npm run english:preview &
 *   E2E_URL=http://127.0.0.1:4174 npm run english:demo-profiles
 *
 * Each synthetic learner history (A–F, some before and after new evidence) is built with the app's own Learner
 * calls, exported as an ordinary backup file, and imported into the running app through "Bring progress from
 * another device". The screenshots are of the real Today and Progress screens rebuilt from those records: nothing
 * on them is hard-coded. Writes screenshots, the backups, what each screen said, the checks and an index page to
 * out/profile-demo/. The learners are synthetic: this shows software behaviour, not how children learn.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { loadContent } from "../src/english/logic/content.ts";
import { exportBackup } from "../src/english/logic/backup.ts";
import { ARTICLES, INF, RDG_DETAIL, RDG_MAIN, SCENARIOS, SPELLING, SVA, buildScenario } from "../src/english/logic/profile-scenarios.ts";

const URL = process.env.E2E_URL ?? "http://127.0.0.1:4174";
const OUT = new globalThis.URL("../out/profile-demo/", import.meta.url).pathname;
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}backups`, { recursive: true });
const DAY = 86_400_000;
const content = loadContent();

interface Shot {
  file: string;
  caption: string;
}
interface Captured {
  key: string;
  stage: string;
  label: string;
  shots: Shot[];
  activities: { kind: string; capability: string; title: string }[];
  todayText: string;
  recommendations: { action: string; capability: string; evidence: string }[];
  overview: string;
}

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const captured: Captured[] = [];
let readingPractice = { passage: 0, item: "" };
const problems: string[] = [];

for (const s of SCENARIOS)
  for (const stage of s.stages) {
    const l = await buildScenario(content, s, stage);
    const now = l.clock();
    const file = `${OUT}backups/${s.key}-${stage}.json`;
    const events = s.transform ? s.transform(l.events) : l.events;
    writeFileSync(file, JSON.stringify(exportBackup(events, content.index.key, now), null, 1));
    const context = await browser.newContext(PHONE);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(URL);
    // the browser's clock is moved to the history's own "now" (the app's test-only offset), so dates line up
    const offset = Math.max(0, Math.ceil((Date.parse(now) - Date.now()) / DAY));
    await page.evaluate((d) => localStorage.setItem("openpath-english-clock-offset-days", String(d)), offset);
    await page.reload();
    await page.locator(".import input[type=file]").setInputFiles(file);
    await page.getByRole("heading", { name: "Today" }).waitFor();
    const shots: Shot[] = [];
    const shot = async (name: string, caption: string) => {
      const f = `${s.key}-${stage}-${name}.png`;
      await page.screenshot({ path: OUT + f, fullPage: true });
      shots.push({ file: f, caption });
    };
    await shot("today", "Today: what the child sees");
    const activities = await page.locator(".plan li").evaluateAll((els) => els.map((e) => ({ kind: e.getAttribute("data-activity") ?? "", capability: e.getAttribute("data-capability") ?? "", title: e.querySelector("h2")?.textContent ?? "" })));
    const todayText = await page.locator("main").innerText();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    const small = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !b.classList.contains("link") && (b as HTMLElement).offsetParent !== null && b.getBoundingClientRect().height < 40).map((b) => b.textContent));
    await page.getByRole("button", { name: "Progress" }).click();
    await page.locator(".overview").waitFor();
    // open the evidence behind each recommendation for the screenshot
    for (const d of await page.locator(".overview details").all()) await d.evaluate((el) => ((el as HTMLDetailsElement).open = true));
    await page.locator(".overview").screenshot({ path: `${OUT}${s.key}-${stage}-overview.png` });
    shots.push({ file: `${s.key}-${stage}-overview.png`, caption: "Progress: the overview for a parent or teacher" });
    await shot("progress", "Progress: the whole page, with every skill that has answers");
    const overview = await page.locator(".overview").innerText();
    const recommendations = await page.locator(".overview li[data-action]").evaluateAll((els) => els.map((e) => ({ action: e.getAttribute("data-action") ?? "", capability: e.getAttribute("data-capability") ?? "", evidence: e.getAttribute("data-evidence") ?? "" })));
    if (!fits) problems.push(`${s.key}-${stage}: the page is wider than the phone`);
    if (small.length) problems.push(`${s.key}-${stage}: buttons too small to tap: ${small.join(", ")}`);
    if (errors.length) problems.push(`${s.key}-${stage}: ${errors.join("; ")}`);
    if (s.key === "L" && stage === "diagnosis") {
      // the reading lesson and a practice question, as the child sees them
      await page.getByRole("button", { name: "Today" }).click();
      await page.locator(`.plan li[data-capability="${RDG_MAIN}"]`).getByRole("button", { name: "Start" }).click();
      await page.locator(".lesson").waitFor();
      await shot("reading-lesson", "The reading lesson: a worked example and a quick check (teaching, separate from assessment)");
      await page.locator(".check .option").nth(1).click();
      await page.locator(".lesson .feedback").waitFor();
      await page.getByRole("button", { name: "Start practising" }).click();
      await page.locator(".item").waitFor();
      readingPractice = { passage: await page.locator(".passage").count(), item: (await page.locator(".item").getAttribute("data-item")) ?? "" };
      await shot("reading-practice", "Practice after the lesson: a passage with one question (practice, never a confirming check)");
      await page.getByRole("button", { name: "Save and leave" }).or(page.getByRole("button", { name: /Stop|Leave/ })).first().click().catch(() => undefined);
    }
    captured.push({ key: s.key, stage, label: s.label, shots, activities, todayText, recommendations, overview });
    await context.close();
  }
await browser.close();

// ---------------------------------------------------------------- what the screens must show
const get = (k: string, st: string) => captured.find((c) => c.key === k && c.stage === st)!;
const acts = (k: string, st: string) => get(k, st).activities;
const caps = (k: string, st: string) => acts(k, st).map((a) => a.capability);
const checks: [string, boolean][] = [
  ["A: reading comprehension is in Today's plan, spelling is not repeated", caps("A", "profile").includes(RDG_MAIN) && !caps("A", "profile").some((c) => SPELLING.includes(c))],
  ["B before: the unmeasured prerequisite (finding details) is checked first", acts("B", "before")[0]?.capability === RDG_DETAIL && get("B", "before").overview.includes("which has not been measured")],
  ["B after: the prerequisite is shown; main idea is now taught with the pilot's reading lessons", acts("B", "after").some((a) => a.capability === RDG_MAIN && a.kind === "keep_learning") && get("B", "after").recommendations[0]?.action === "teach"],
  ["L diagnosis: main idea found hard on its own answers; the first reading lesson is offered", acts("L", "diagnosis").some((a) => a.capability === RDG_MAIN && a.kind === "keep_learning") && /Found hard so far[\s\S]*Identifies the main idea: 0 of/.test(get("L", "diagnosis").overview)],
  ["L after the lesson: improving in practice, awaiting confirmation; next, fresh questions (never the taught ones)", acts("L", "after_lesson").some((a) => a.capability === RDG_MAIN && a.kind === "show_what_you_know") && /Improving during practice, awaiting confirmation\s*Identifies the main idea/.test(get("L", "after_lesson").overview)],
  ["L confirmed: right on fresh questions, no longer 'improving'", !/Improving during practice, awaiting confirmation\s*Identifies the main idea/.test(get("L", "confirmed").overview)],
  ["L later: the later check comes from the retention questions and the result is recorded", get("L", "later").overview.length > 0],
  ["B after: the overview explains why the plan changed", /No longer planned: Check .* first/.test(get("B", "after").overview)],
  ["C before: a lesson on subject–verb agreement first", acts("C", "before")[0]?.kind === "keep_learning" && acts("C", "before")[0]?.capability === SVA],
  ["C after: right in practice after the lesson is 'improving, awaiting confirmation', not shown; next a fresh check; no causal claim", get("C", "after").recommendations[0]?.action === "confirm" && /Improving during practice, awaiting confirmation\s*Subject–verb agreement/.test(get("C", "after").overview) && !/Demonstrated independently\s*[^\n]*Subject–verb agreement/.test(get("C", "after").overview) && /does not show what caused it/.test(get("C", "after").overview)],
  ["G: after the lesson and right practice, Articles is improving (not shown) and the child's next activity is fresh questions on it", acts("G", "after_lesson")[0]?.capability === ARTICLES && acts("G", "after_lesson")[0]?.kind === "show_what_you_know" && /Improving during practice, awaiting confirmation\s*Articles/.test(get("G", "after_lesson").overview)],
  ["H: right on fresh questions after the lesson: Articles moves on by the existing rules (no more confirmation or teaching)", !get("H", "after").recommendations.some((r) => r.capability === ARTICLES && (r.action === "confirm" || r.action === "teach")) && !/Improving during practice, awaiting confirmation\s*Articles/.test(get("H", "after").overview)],
  ["I: shown, then wrong at the check ten days later: refreshing Articles comes first", acts("I", "due")[0]?.kind === "check_learned" && get("I", "after").recommendations[0]?.action === "refresh" && get("I", "after").recommendations[0]?.capability === ARTICLES && /Not kept at a later check\s*Articles/.test(get("I", "after").overview)],
  ["J: second tries are help, not independent: listed under 'Needed help'; only the first answers count on their own (4 wrong at the check)", /Needed help\s*Articles: right with help 4 of 4 times; on their own 2 of 6/.test(get("J", "profile").overview)],
  ["'shown' always states the level shown (J: Articles at level 3 after 4 wrong on harder questions), never an unqualified claim", captured.every((c) => !/Demonstrated independently\s*\n(?!Nothing)[^\n]*\.\n/.test(c.overview) || /level \d/.test(c.overview)) && /Articles: at about level 3 of 8/.test(get("J", "profile").overview)],
  ["K: an old record (no provenance, no lesson record) is never relabelled independent or shown", !/Demonstrated independently\s*[^\n]*Articles/.test(get("K", "profile").overview) && !/Improving during practice, awaiting confirmation\s*Articles/.test(get("K", "profile").overview)],
  ["one Today plan: no second plan, no doubling card, a single 'More practice' entry", captured.every((c) => !/Spelling patterns|Your spelling plan|Doubling letters \(new/.test(c.todayText) && /More practice/.test(c.todayText))],
  ["D due: a check of what was learned comes first", acts("D", "due")[0]?.kind === "check_learned" && acts("D", "due")[0]?.capability === SVA],
  ["D after: refreshing it comes first", get("D", "after").recommendations[0]?.action === "refresh" && get("D", "after").recommendations[0]?.capability === SVA],
  ["E: help is not mastery: the spelling rule is not offered as secure, help is shown apart, an adult is asked", !caps("E", "profile").includes(INF) && /Needed help[\s\S]*right with help/.test(get("E", "profile").overview) && get("E", "profile").recommendations.some((r) => r.capability === INF && r.action === "human_review")],
  ["F: an initial assessment only; nothing called hard", acts("F", "profile").length === 1 && /Find your starting point/.test(acts("F", "profile")[0].title) && /Found hard so far\s*Nothing/.test(get("F", "profile").overview)],
  ["every recommendation the child can start carries the evidence ids behind it, except first looks", captured.every((c) => c.recommendations.filter((r) => r.action !== "assess" && r.action !== "initial_assessment").every((r) => r.evidence.length > 0))],
  ["L: the reading lesson shows, then practice shows its passage with a practice question (never a first-check or reserved one)", readingPractice.passage === 1 && /^plt\.main\.(09|1[0-7])$/.test(readingPractice.item)],
  ["no screen shows a percentile, IQ, ranking or probability", captured.every((c) => !/percentile|\bIQ\b|rank|probabilit|%/i.test(c.overview))],
  ["phone layout: no sideways scrolling, every button tappable, no page errors", problems.length === 0],
];
writeFileSync(`${OUT}verification.json`, JSON.stringify({ checks: checks.map(([what, pass]) => ({ what, pass })), problems }, null, 1));
writeFileSync(`${OUT}screens.json`, JSON.stringify(captured.map(({ shots: _s, ...c }) => c), null, 1));

const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Learner profile demo</title>
<style>body{font:16px system-ui,sans-serif;margin:24px;color:#222}h2{margin-top:2rem}h3{margin:1rem 0 .25rem;color:#555}.row{display:flex;gap:16px;overflow-x:auto}figure{margin:0;flex:0 0 260px}img{width:260px;border:1px solid #ccc;border-radius:8px}figcaption{font-size:13px;color:#555}.warn{background:#fff4d6;padding:12px;border-radius:8px}li.fail{color:#b00}</style>
<h1>OpenPath: one learner, many skills: profile and plan</h1>
<p class="warn">Synthetic learners, built with the app's own logic and imported into the real app as backups. The screens are the real Today and Progress pages rebuilt from those records. This shows software behaviour, not how children learn. All questions are draft content not yet reviewed by a teacher.</p>
<ul>${checks.map(([w, p]) => `<li class="${p ? "" : "fail"}">${p ? "PASS" : "FAIL"}: ${w}</li>`).join("")}</ul>
${SCENARIOS.map((s) => `<h2>Learner ${s.key}: ${s.label}</h2>${s.stages.map((st) => `${s.stages.length > 1 ? `<h3>${st}</h3>` : ""}<div class="row">${get(s.key, st).shots.map((x) => `<figure><img src="${x.file}" alt="${x.caption}"><figcaption>${x.caption}</figcaption></figure>`).join("")}</div>`).join("")}`).join("\n")}`;
writeFileSync(`${OUT}index.html`, html);
for (const [what, pass] of checks) console.log(`${pass ? "PASS" : "FAIL"}  ${what}`);
for (const p of problems) console.log(`PROBLEM  ${p}`);
if (checks.some(([, p]) => !p)) process.exitCode = 1;
console.log(`wrote ${captured.reduce((t, c) => t + c.shots.length, 0)} screenshots and index.html to ${OUT}`);
