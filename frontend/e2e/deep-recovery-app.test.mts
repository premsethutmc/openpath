/**
 * deep-recovery@0 real-app feasibility (RESEARCH; the switch exists only in a `--test --deep-recovery` build and is off by default):
 * the Year UI against the real Django API, synthetic pupils only, nothing deployed. Each pupil's first wrong answer on the integral
 * is stored through the API (as integrated-skills.test.mts does); from then on the UI and the engine decide every screen.
 *   cd frontend && node scripts/build-mathematics-journey.mjs && node scripts/build-year.mjs --test --deep-recovery
 *   (Django on DEEP_API, default http://127.0.0.1:8014, with OPENPATH_TEST_CLOCK_FILE)
 *   node --import tsx e2e/deep-recovery-app.test.mts
 * Cases (DEEP_CASES): "main" (default build): single gap (reload mid-question, reload mid-lesson, sign-out and back in, resume from the
 * year page), multi gap, a failed save, unavailable content, no fresh question, the switch off; "pause" (--deep-sitting=12 build):
 * the sitting limit, reload while paused, resume after 3 hours by the server's and the browser's clocks; "shipped" (no flags):
 * ?deep=1 and ?stuck= do nothing. All three: bash e2e/run-deep-recovery.sh. Synthetic success is not evidence of learning.
 */
import { createRequire } from "node:module";
import http from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { latestReleases, } from "../../packages/learning/src/curricula";
import { question } from "../../packages/learning/src/content";
import { exposureKey } from "../../packages/learning/src/families";
import { graph } from "../../packages/learning/src/graph";
import { make } from "../../packages/learning/src/session";
import { structuredLearner, type Answerer } from "../src/journey/deep-recovery-journey";
import { right, wrong } from "../src/journey/learners";
import { creditOf } from "../../packages/learning/src/grade";
import { withBugs } from "../src/journey/deep-goal-driver";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright") as typeof import("playwright");
const root = fileURLToPath(new URL("../dist-english/", import.meta.url)), port = Number(process.env.PORT ?? 4202);
const api = process.env.DEEP_API ?? "http://127.0.0.1:8014";
const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/")) { const p = http.request(new URL(req.url, api), { method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode!, r.headers); r.pipe(res); }); req.pipe(p); return; }
  try { const path = (req.url ?? "/").split("?")[0]; if (!/^\/year\/(?:app\.(?:js|css)(?:\.map)?|index\.html|[\w.-]+\.woff2)?$/.test(path)) { res.writeHead(404).end(); return; } const file = root + (path.endsWith("/") ? path + "index.html" : path);
    res.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".woff2") ? "font/woff2" : "text/html" }).end(readFileSync(file)); } catch { res.writeHead(404).end(); }
});
await new Promise<void>((r) => server.listen(port, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage();
page.setDefaultTimeout(30_000);
async function call(path: string, body?: unknown) { return page.evaluate(async ({ path, body }) => { const token = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? ""; const r = await fetch("/api" + path, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", "x-csrftoken": token }, credentials: "same-origin", body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => null) }; }, { path, body }); }

const P = "MATH.", ORIG = "gen:aupfr:1,-3,3,-2,-4", OWN = P + "calculus.integration-methods";
const PF = P + "algebra.partial-fractions", LS = P + "algebra.linear-systems", L2V = P + "algebra.linear-two-variables", FACT = P + "algebra.factorisation", IDS = P + "algebra.identities", IADD = P + "number.integer-add", INTS = P + "number.integers";
/** a wrong answer the server can read (same shape as the right one: e.g. a tuple with one entry off by one); the node-side
 *  `wrong` can give "0" for a tuple, which the server holds as unreadable (undecided), not wrong */
const readableWrong = (qid: string) => {
  const r = right(qid);
  const m = /[−-]?\d+/.exec(r);
  if (m && !/^[A-D]$/.test(r)) { const v = Number(m[0].replace("−", "-")) + 1, c = r.slice(0, m.index) + String(v).replace("-", "−") + r.slice(m.index + m[0].length); if (creditOf(base(qid), c) === false || creditOf(qid, c) === false) return c; }
  return wrong(qid);
};
const shaped = (a: Answerer): Answerer => (qid, c) => { const x = a(qid, c); return x === right(qid) ? x : readableWrong(qid); };
const LEARNERS: Record<string, () => Answerer> = {
  single: () => shaped(structuredLearner({ "fam:aupfr": [PF] }, [PF])),
  multi: () => shaped(structuredLearner({ "fam:aupfr": [PF], [PF]: [LS, FACT], [LS]: [L2V], [FACT]: [IDS] }, [PF, LS, L2V, FACT, IDS])),
  nocontent: () => shaped(structuredLearner({ "fam:aupfr": [PF], [PF]: [FACT], [FACT]: [IDS], [IDS]: [IADD], [IADD]: [INTS] }, [PF, FACT, IDS, IADD, INTS])),
  none: () => shaped(structuredLearner({}, [])),
};
const base = (q: string) => q.replace(/:(mc|w)$/, "");
const email = `deep-${Date.now()}@example.org`, password = "synthetic-deep-recovery-browser-passphrase";
const results: Record<string, unknown> = {};
/** DEEP_CASES (comma list) picks cases: the default build runs "main"; a --deep-sitting build "pause"; a shipped build "shipped" */
const CASES = new Set((process.env.DEEP_CASES ?? "main").split(","));
const want = (group: string) => CASES.has(group);
const clockFile = process.env.OPENPATH_TEST_CLOCK_FILE;
const shots = process.env.SHOTS;

let id = "";
const saved = async () => (await call(`/pupils/${id}/events/?subject=mathematics`)).data as { events: { record?: string; competency?: string; episode?: string; context?: string; questionId?: string; at?: string }[]; count: number; decisions: unknown };
async function newPupil(name: string, first: string) {
  const pupil = await call("/pupils/", { display_name: `Synthetic deep ${name}`, consent: true }); assert.equal(pupil.status, 201);
  id = pupil.data.id;
  let clock = Date.now() - 60_000;
  const ctx = () => ({ learnerId: id, sessionId: `learn:${id}:seed`, at: new Date(++clock).toISOString() });
  const append = async (event: unknown) => { const d = await saved(); const r = await call(`/pupils/${id}/events/`, { subject: "mathematics", seq: d.count, event }); assert.equal(r.status, 201, JSON.stringify(r)); };
  await append(make.enrol(ctx(), 12, "2026-27", latestReleases.find((r) => r.grade === 12)!));
  // the pupil's first answer on the problem, wrong, on their own (as in Practice)
  await append(make.attempt(ctx(), first, wrong(first), "practice"));
}
const open = (q = ORIG, flag = "1") => page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&deep=${flag}${q ? `&stuck=${encodeURIComponent(q)}` : ""}`);
const phase = async () => { await page.waitForSelector("[data-deep-phase]"); return (await page.locator("[data-deep-phase]").first().getAttribute("data-deep-phase"))!; };
/** the kind of screen: a question, a lesson, or the end */
const screen = async () => { await page.waitForSelector("[data-deep-screen]"); return (await page.locator("[data-deep-screen]").first().getAttribute("data-deep-screen"))!; };
const taughtSkills = async () => (await saved()).events.filter((e) => e.record === "teach").map((e) => graph.evidenceTarget(e.competency!));
async function answerInUi(value: string) {
  const qid = (await page.locator("[data-qid]").getAttribute("data-qid"))!, q = question(base(qid));
  if (q.type === "choice" || qid.endsWith(":mc")) await page.getByRole("radio").nth("ABCD".indexOf(value)).click();
  else await page.getByLabel("Your answer", { exact: true }).fill(value);
  await page.getByRole("button", { name: "Check", exact: true }).click();
}
async function lesson(stopAtScreen?: number) {
  for (let i = 0; i < 15; i++) {
    const eyebrow = await page.locator(".lesson .eyebrow").innerText();
    if (stopAtScreen !== undefined && i === stopAtScreen) return eyebrow;
    const btn = page.locator(".actions.sticky button.primary").last(), label = await btn.innerText();
    await btn.click();
    if (label !== "Next") break;
    await page.waitForFunction((e) => document.querySelector(".lesson .eyebrow")?.textContent !== e, eyebrow);
  }
  await page.waitForFunction(() => !document.querySelector(".lesson"));
  return null;
}
// phase 8 (evidence after help): what the module view and the year page say about a skill shown after a deep episode's help
async function afterHelpScreens(skill: string) {
  await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&skill=${skill}`);
  await page.locator(".year-meta .chip").first().waitFor();
  const chip = (await page.locator(".year-meta .chip").first().innerText()).trim();
  const note = (await page.locator("[data-after-help]").count()) ? (await page.locator("[data-after-help]").first().innerText()).trim() : null;
  await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}`);
  await page.locator(".stats").first().waitFor();
  const yearNote = (await page.locator("[data-after-help-count]").count()) ? (await page.locator("[data-after-help-count]").innerText()).trim() : null;
  assert.equal(chip, "Solved independently after help", `module status chip for ${skill}`);
  assert.ok(note && /straight after help/.test(note), `the help and the unaided success both stated: ${note}`);
  assert.ok(yearNote && /solved independently after help/.test(yearNote), `year page: ${yearNote}`);
  return { chip, note, yearNote };
}
interface Step { phase: string; qid?: string; right?: boolean }
/** the UI loop: answer as the synthetic learner, read every lesson through, until the recovery ends (or `stop` says so) */
async function drive(learner: Answerer, steps: Step[], stop?: (p: string, n: number) => boolean) {
  for (let n = 0; n < 160; n++) {
    const kind = await screen(), p = kind === "lesson" ? "lesson" : await phase();
    if (stop?.(p, n)) return p;
    if (kind === "end") return p;
    if (kind === "lesson") { steps.push({ phase: "lesson" }); await lesson(); continue; }
    const qid = (await page.locator("[data-qid]").getAttribute("data-qid"))!;
    await answerInUi(learner(qid, { taughtSkills: await taughtSkills(), answered: n, activity: "" }));
    await page.locator(".feedback[role=status] strong").first().waitFor();
    steps.push({ phase: p, qid, right: (await page.locator(".feedback[role=status] strong").first().innerText()) === "Right." });
    await page.locator(".actions.sticky button.primary").first().click();
  }
  throw new Error("no end after 160 screens");
}
const endText = async () => ({ title: await page.locator("[data-deep-phase] .feedback[role=status] strong").innerText(), reason: await page.locator("[data-deep-phase] .feedback[role=status] p").first().innerText(), handover: (await page.locator("[data-deep-handover]").count()) ? await page.locator("[data-deep-handover]").innerText() : null });
const goalChecks = (steps: Step[]) => {
  const goal = steps.filter((s) => s.phase === "return");
  assert.ok(goal.length >= 2 && goal.slice(-2).every((s) => s.right), `two fresh unaided goal answers: ${JSON.stringify(goal)}`);
  for (const g of goal) { assert.notEqual(exposureKey(g.qid!), exposureKey(ORIG), "a fresh problem, never the same one"); assert.equal(question(base(g.qid!)).competency, OWN, "the same skill"); }
  return goal;
};
const lessonsHaveIds = async () => { const ev = (await saved()).events, first = ev.find((e) => e.record === "attempt" && e.questionId === ORIG)!; const ls = ev.filter((e) => e.record === "teach"); assert.ok(ls.length > 0); for (const l of ls) assert.equal(l.episode, `deep:${ORIG}#${first.at}`, "lesson saved with its recovery id"); return ls.map((l) => l.competency); };

try {
  await page.goto(`http://127.0.0.1:${port}/year/`);
  assert.equal((await call("/account/")).status, 200);
  assert.equal((await call("/account/register/", { email, password, consent: true })).status, 201);

  // ---- 1. single gap, with every interruption
  if (want("main")) {
    await newPupil("single", ORIG);
    const L = LEARNERS.single(), steps: Step[] = [];
    await open();
    await phase();
    assert.equal(await page.locator("[data-deep-recovery=on]").count(), 1, "the research view is on");
    // reload mid-question: the same question comes back from the saved records (the URL keeps the problem)
    const q1 = await page.locator("[data-qid]").getAttribute("data-qid");
    await page.getByLabel("Your answer", { exact: true }).fill("draft").catch(() => undefined);
    await page.reload();
    assert.equal(await page.locator("[data-qid]").getAttribute("data-qid"), q1, "reload mid-question: same question");
    // drive until the first lesson, then reload on its second screen
    await drive(L, steps, (p) => p === "lesson");
    // on its second screen when it has several (a one-screen lesson: before finishing it)
    const many = / · 1 of \d+$/.test(await page.locator(".lesson .eyebrow").innerText());
    const before = await lesson(many ? 1 : 0);
    assert.ok(before, "still inside the lesson");
    await page.reload();
    assert.equal(await screen(), "lesson");
    assert.equal(await page.locator(".lesson .eyebrow").innerText(), before, "reload mid-lesson: the same lesson, the same screen");
    // sign out and in again, then come back from the year page (no ?stuck)
    assert.equal((await call("/account/logout/", {})).status < 300, true);
    await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}`);
    await page.getByRole("button", { name: /sign in/i }).first().waitFor();
    assert.ok([200, 201].includes((await call("/account/login/", { email, password })).status));
    await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}`);
    await page.locator(`[data-deep-continue="${ORIG}"]`).click();
    assert.equal(await screen(), "lesson", "resumed from the year page after signing in again");
    const end = await drive(L, steps);
    assert.equal(end, "solved_after_help", JSON.stringify(steps));
    const goal = goalChecks(steps);
    const lessons = await lessonsHaveIds();
    const text = await endText();
    assert.equal(text.title, "Solved after help");
    const afterHelp = await afterHelpScreens(OWN);
    if (shots) await page.screenshot({ path: `${shots}/deep-single-end.png`, fullPage: true });
    results.single = { end, steps: steps.length, lessons, goal, text, afterHelp };
  }

  // ---- 2. multi gap
  if (want("main")) {
    await newPupil("multi", ORIG);
    const steps: Step[] = [];
    await open();
    const end = await drive(LEARNERS.multi(), steps);
    assert.equal(end, "solved_after_help", JSON.stringify(steps));
    const goal = goalChecks(steps);
    const lessons = await lessonsHaveIds();
    assert.ok(lessons.length >= 3, `several gaps taught: ${lessons}`);
    results.multi = { end, steps: steps.length, lessons, goal, text: await endText() };
  }

  // ---- 3. failed save: the API is unreachable for one answer
  if (want("main")) {
    await newPupil("failsave", ORIG);
    await open();
    const qid = (await page.locator("[data-qid]").getAttribute("data-qid"))!, n0 = (await saved()).count;
    await page.route("**/api/pupils/*/events/", (r) => (r.request().method() === "POST" ? r.abort("failed") : r.continue()));
    await answerInUi(LEARNERS.single()(qid, { taughtSkills: [], answered: 0, activity: "" }));
    await page.waitForTimeout(500);
    await page.locator(".error, [role=alert]").first().waitFor();
    const err = await page.locator(".error, [role=alert]").first().innerText();
    assert.match(err, /Not saved/);
    assert.equal(await page.locator("[data-qid]").getAttribute("data-qid"), qid, "the same question stays");
    assert.equal(await page.locator(".feedback[role=status]").count(), 0, "no right/wrong shown for an unsaved answer");
    assert.equal((await saved()).count, n0, "nothing recorded");
    await page.unroute("**/api/pupils/*/events/");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await page.locator(".feedback[role=status] strong").first().waitFor();
    assert.equal((await saved()).count, n0 + 1, "the retry is saved once");
    results.failsave = { error: err, retried: true };
  }

  // ---- 4. unavailable content
  if (want("main")) {
    await newPupil("nocontent", ORIG);
    const steps: Step[] = [];
    await open();
    const end = await drive(LEARNERS.nocontent(), steps);
    assert.equal(end, "blocked", JSON.stringify(steps));
    const text = await endText();
    assert.match(text.reason, /gap in OpenPath's content, not in you/);
    assert.match(text.reason, /teacher or parent/);
    assert.ok(text.handover);
    assert.equal((await saved()).events.filter((e) => e.record === "teach").length, 0, "nothing taught over missing content");
    if (shots) await page.screenshot({ path: `${shots}/deep-blocked.png`, fullPage: true });
    results.nocontent = { end, steps: steps.length, text };
  }

  // ---- 5. no fresh question on the original skill
  if (want("main")) {
    await newPupil("nofresh", "di-d2");
    await open("di-d2");
    const end = await drive(LEARNERS.none(), []);
    assert.equal(end, "escalate");
    const text = await endText();
    assert.match(text.reason, /no fresh question/i);
    results.nofresh = { end, text };
  }

  // ---- 6. the switch off: the shipped recovery, unchanged
  if (want("main")) {
    await newPupil("flagoff", ORIG);
    await open(ORIG, "0");
    await page.locator("h1").first().waitFor();
    await page.waitForFunction(() => !document.body.innerText.includes("Opening OpenPath") && !document.body.innerText.includes("Loading the record"));
    assert.equal(await page.locator("[data-deep-recovery]").count(), 0, "?deep=0: the shipped view");
    await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&stuck=${encodeURIComponent(ORIG)}`);
    await page.locator("h1").first().waitFor();
    await page.waitForFunction(() => !document.body.innerText.includes("Opening OpenPath") && !document.body.innerText.includes("Loading the record"));
    assert.equal(await page.locator("[data-deep-recovery]").count(), 0, "off is remembered; ?stuck alone does nothing");
    results.flagoff = { shipped: true };
  }
  // ======== the module path and one learning goal (DEEP_CASES "module", "goal"; the default research build) ========
  // one action on whatever the page shows; returns what it did (the learner-visible screen is recorded)
  type Seen = { where: "deep" | "module"; kind: string; phase: string | null; eyebrow: string; why: string; qid?: string; right?: boolean; skill?: string };
  const visible = async (): Promise<Seen> => {
    await page.waitForFunction(() => !!document.querySelector("[data-qid], .lesson, .feedback[role=status], [data-deep-screen]"), null, { timeout: 30_000 });
    const deep = (await page.locator("[data-deep-screen]").count()) > 0;
    const kind = (await page.locator("[data-qid]").count()) ? "question" : (await page.locator(".lesson").count()) ? "lesson" : "status";
    const txt = async (sel: string) => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).trim() : "");
    return { where: deep ? "deep" : "module", kind, phase: deep ? await page.locator("[data-deep-phase]").first().getAttribute("data-deep-phase") : null, eyebrow: await txt(deep ? "[data-deep-screen] .eyebrow" : ".lesson .eyebrow, .eyebrow"), why: await txt(".why"),
      ...(kind === "question" ? { qid: (await page.locator("[data-qid]").getAttribute("data-qid"))! } : {}) };
  };
  async function act(L: Answerer, seen: Seen[]): Promise<Seen> {
    const v = await visible();
    if (v.kind === "lesson") { v.skill = (await page.locator("h1, h2").first().innerText()); await lesson(); seen.push(v); return v; }
    if (v.kind === "question") {
      v.skill = graph.evidenceTarget(question(base(v.qid!)).competency);
      await answerInUi(L(v.qid!, { taughtSkills: await taughtSkills(), answered: seen.length, activity: "" }));
      await page.locator(".feedback[role=status] strong").first().waitFor();
      v.right = (await page.locator(".feedback[role=status] strong").first().innerText()) === "Right.";
      seen.push(v);
      const btn = page.locator(".actions.sticky button.primary").first();
      const h = await btn.elementHandle();
      await btn.click();
      await h?.waitForElementState("hidden", { timeout: 15_000 }).catch(() => undefined);
      return v;
    }
    v.why = await (async () => ((await page.locator(".feedback[role=status]").count()) ? (await page.locator(".feedback[role=status]").first().innerText()).trim() : v.why))();
    seen.push(v);
    return v;
  }
  const short = (xs: Seen[]) => xs.map((x) => `${x.where[0]}:${x.phase ?? ""}:${x.kind}${x.skill ? "@" + x.skill.replace(/^MATH\.\w+\./, "") : ""}${x.right === undefined ? "" : x.right ? "+" : "-"}`).join(" ");
  async function bare(name: string, grade: number) {
    const pupil = await call("/pupils/", { display_name: `Synthetic deep ${name}`, consent: true }); assert.equal(pupil.status, 201);
    id = pupil.data.id;
    const d = await saved();
    assert.equal((await call(`/pupils/${id}/events/`, { subject: "mathematics", seq: d.count, event: make.enrol({ learnerId: id, sessionId: `learn:${id}:seed`, at: new Date().toISOString() }, grade, "2026-27", latestReleases.find((r) => r.grade === grade)!) })).status, 201);
  }
  const PV = "MATH.number.place-value-tens", CMP = "MATH.number.compare-numbers";
  // the shipped Recovery view's own headings (Learn.tsx Recovery)
  const SHIPPED = /Finding what this problem needs|Working out what happened|Learning the step that went wrong|A problem you are stuck on|Back to the original problem/i;
  const shippedShown = async () => SHIPPED.test(await page.locator("body").innerText()) && (await page.locator("[data-deep-recovery]").count()) === 0;
  const pvLearner = () => withBugs(structuredLearner({ [PV]: [CMP] }, [CMP]));

  if (want("module")) {
    await bare("module", 2);
    const L = pvLearner(), seen: Seen[] = [];
    const openModule = (flag = "1") => page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&skill=${PV}&deep=${flag}`);
    await openModule();
    // the module's own questions until its recovery opens
    for (let i = 0; i < 12 && (await visible()).where === "module"; i++) await act(L, seen);
    const first = await visible();
    assert.equal(first.where, "deep", `the module opened deep recovery from its own wrong answer: ${short(seen)}`);
    assert.ok(seen.some((x) => x.where === "module" && x.kind === "question" && x.right === false), "the module's own question was wrong");
    // on to the first deep lesson; reload mid-lesson (the URL keeps the module)
    for (let i = 0; i < 20 && (await visible()).kind !== "lesson"; i++) await act(L, seen);
    const l1 = await visible();
    assert.equal(l1.where, "deep"); assert.equal(l1.kind, "lesson");
    await page.reload();
    const l2 = await visible();
    assert.deepEqual([l2.where, l2.kind, l2.eyebrow], [l1.where, l1.kind, l1.eyebrow], "reload mid-lesson: same deep lesson");
    await act(L, seen);
    // reload mid-question
    const q1 = await visible();
    await page.reload();
    const q2 = await visible();
    assert.deepEqual([q2.where, q2.phase, q2.qid], [q1.where, q1.phase, q1.qid], "reload mid-question: same deep question");
    // sign out mid-recovery, sign in again, reopen the module
    assert.ok((await call("/account/logout/", {})).status < 300);
    await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}`);
    await page.getByRole("button", { name: /sign in/i }).first().waitFor();
    assert.ok([200, 201].includes((await call("/account/login/", { email, password })).status));
    await openModule();
    const q3 = await visible();
    assert.deepEqual([q3.where, q3.phase, q3.qid], [q1.where, q1.phase, q1.qid], "after signing in again: same deep question");
    // to the end of the module
    let last: Seen = q3;
    for (let i = 0; i < 80 && last.kind !== "status"; i++) last = await act(L, seen);
    const deep = seen.filter((x) => x.where === "deep");
    const returns = deep.filter((x) => x.phase === "return");
    assert.ok(deep.some((x) => x.phase === "probe" && x.skill === CMP && x.right === false), short(seen));
    assert.ok(returns.length >= 1 && returns.every((x) => x.skill === PV && x.right), `fresh place-value problems, right: ${short(seen)}`);
    const orig = (await saved()).events.find((e) => e.record === "attempt" && e.context?.startsWith("deep:"))!.context!.split("|")[0].slice(5);
    for (const r of returns) assert.notEqual(exposureKey(r.qid!), exposureKey(orig), "never the same problem");
    const after = seen.slice(seen.lastIndexOf(returns.at(-1)!) + 1);
    assert.ok(after.length >= 1 && after.every((x) => x.where === "module"), `the module continues after the recovery: ${short(after)}`);
    const lessons = (await saved()).events.filter((e) => e.record === "teach");
    assert.ok(lessons.some((t) => graph.evidenceTarget(t.competency!) === CMP && t.episode?.startsWith(`deep:${orig}#`)), "the compare-numbers lesson carries its recovery id");
    if (shots) await page.screenshot({ path: `${shots}/deep-module-end.png`, fullPage: true });
    const endTitle = (await page.locator(".feedback[role=status] strong").first().innerText()).trim();
    assert.equal(endTitle, "Solved independently after help", "the module's end screen");
    assert.doesNotMatch(last.why, /^Shown on your own/, "the end screen's reason is qualified");
    const moduleAfterHelp = await afterHelpScreens(PV);
    results.module = { endTitle, afterHelp: moduleAfterHelp, trace: short(seen), end: last.why, screens: seen.map(({ where, kind, phase, eyebrow, why }) => ({ where, kind, phase, eyebrow, why: why.slice(0, 200) })) };
    // switch off: the same learner and module show the shipped recovery, and nothing is saved with a deep context
    await bare("module-off", 2);
    const off: Seen[] = [];
    await openModule("0");
    let shippedSeen = false;
    for (let i = 0; i < 12; i++) { await visible(); if ((shippedSeen = await shippedShown())) break; const v = await act(pvLearner(), off); assert.notEqual(v.where, "deep"); if (v.kind === "status") break; }
    assert.ok(shippedSeen, `switch off: the shipped recovery: ${short(off)}`);
    assert.ok(!(await saved()).events.some((e) => e.context?.startsWith("deep:")));
    results.moduleOff = { trace: short(off), shippedRecovery: shippedSeen };
  }

  if (want("goal")) {
    const OWNI = "MATH.calculus.integration-methods", EXP = "MATH.number.exponents";
    await bare("goal", 12);
    const L = withBugs(structuredLearner({ "fam:subst": [EXP] }, [EXP])), seen: Seen[] = [];
    // choose the learning goal in the year page, as a learner does
    await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&foundation=1&deep=1`);
    await page.getByLabel("Target topic").selectOption(OWNI);
    await page.getByRole("button", { name: "Use this learning goal" }).click();
    await page.getByText("Current goal: Integrate by substitution and parts").waitFor();
    const nextCard = async () => ((await page.locator("div.next").count()) ? (await page.locator("div.next").first().innerText()).trim() : "");
    const cards: string[] = [];
    const year = async () => { await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}`); await page.locator("div.next").first().waitFor(); const t = await nextCard(); cards.push(t); return t; };
    let reloaded = false;
    for (let i = 0; i < 60; i++) {
      await year();
      const start = page.locator("div.next button.primary");
      if (!(await start.count())) break;
      await start.first().click();
      let v = await act(L, seen);
      // inside the recovery the learner stays on the goal step's screen until it hands back to the goal
      for (let k = 0; k < 60 && (await visible()).where === "deep"; k++) {
        if (!reloaded && (await visible()).kind === "question" && seen.some((x) => x.where === "deep" && x.kind === "lesson")) {
          const q1 = await visible();
          await page.reload();                                  // the view is not in the URL: the year page comes back
          await page.locator("div.next button.primary").first().click();
          const q2 = await visible();
          assert.deepEqual([q2.where, q2.phase, q2.qid], [q1.where, q1.phase, q1.qid], "reload mid-recovery: the goal's next step reopens the same deep question");
          reloaded = true;
        }
        v = await act(L, seen);
      }
      void v;
    }
    const deep = seen.filter((x) => x.where === "deep");
    assert.ok(reloaded, `reload checked mid-recovery: ${short(seen)}`);
    assert.ok(deep.some((x) => x.kind === "lesson"), short(seen));
    const returns = deep.filter((x) => x.phase === "return");
    assert.ok(returns.length >= 2 && returns.slice(-2).every((x) => x.right) && returns.every((x) => x.skill === OWNI), `fresh problems on the goal's step: ${short(seen)}`);
    assert.match(cards.at(-1)!, /requirements on this route are shown/, "the goal carried on to its own end");
    const lessons = (await saved()).events.filter((e) => e.record === "teach");
    assert.ok(lessons.some((t) => graph.evidenceTarget(t.competency!) === EXP && t.episode?.startsWith("deep:")));
    results.goal = { trace: short(seen), nextCards: cards.filter((c, i) => c !== cards[i - 1]), screens: seen.filter((x) => x.where === "deep").map(({ kind, phase, eyebrow, why }) => ({ kind, phase, eyebrow, why: why.slice(0, 160) })) };
    // an untouched goal (place-value-tens) with the switch on: its own shipped recovery, no deep view, no deep context
    await bare("goal-untouched", 2);
    await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&foundation=1&deep=1`);
    await page.getByLabel("Target topic").selectOption(PV);
    await page.getByRole("button", { name: "Use this learning goal" }).click();
    await page.getByText(/Current goal:/).waitFor();
    const un: Seen[] = [];
    let unShipped = false;
    for (let i = 0; i < 14 && !unShipped; i++) {
      await year();
      if (!(await page.locator("div.next button.primary").count())) break;
      await page.locator("div.next button.primary").first().click();
      await visible();
      unShipped = await shippedShown();
      if (!unShipped) { const v = await act(pvLearner(), un); assert.notEqual(v.where, "deep"); unShipped = await shippedShown(); }
    }
    assert.equal(await page.locator("[data-deep-recovery]").count(), 0, "an untouched goal never shows the deep view");
    assert.ok(!(await saved()).events.some((e) => e.context?.startsWith("deep:")), "nor saves a deep context");
    results.goalUntouched = { trace: short(un), shippedRecoveryShown: unShipped };
  }

  // ---- 7. the per-sitting limit (a --deep-sitting build): pause, reload stays paused, a later sitting resumes the same path
  if (want("pause")) {
    assert.ok(clockFile, "OPENPATH_TEST_CLOCK_FILE (the server's test clock) is needed to reach a later sitting");
    await newPupil("pause", ORIG);
    const L = LEARNERS.multi(), steps: Step[] = [];
    let offsetHours = 0;
    const later = async (hours: number) => {
      offsetHours += hours;
      writeFileSync(clockFile!, JSON.stringify({ [id]: offsetHours / 24 }));
      await page.clock.setSystemTime(new Date(Date.now() + offsetHours * 3_600_000));
    };
    await open();
    let end = await drive(L, steps);
    assert.equal(end, "pause", `the sitting limit was reached: ${JSON.stringify(steps)}`);
    const paused = await endText();
    assert.equal(paused.title, "Paused: your place is saved");
    assert.match(paused.reason, /Nothing is finished yet and nothing is counted as solved/);
    assert.match(paused.reason, /Your place is saved: next time starts with/);
    const pathAtPause = await page.locator("[data-deep-path]").getAttribute("data-deep-path");
    const lessonsAtPause = (await saved()).events.filter((e) => e.record === "teach").length;
    if (shots) await page.screenshot({ path: `${shots}/deep-pause.png`, fullPage: true });
    // a reload 30 minutes later is the same sitting: still paused, nothing new asked
    await later(0.5);
    await page.reload();
    assert.equal(await phase(), "pause", "a reload inside the sitting stays paused");
    const n0 = (await saved()).count;
    // the year page offers it, marked paused
    await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}`);
    const card = page.locator(`[data-deep-continue="${ORIG}"]`);
    assert.match(await card.innerText(), /Paused: your place is saved/);
    // three hours later (a new sitting by the server's and the browser's clocks): the same diagnosis path, then on to the goal
    let sittings = 1;
    for (; end === "pause" && sittings < 8; sittings++) {
      await later(3);
      await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}`);
      await page.locator(`[data-deep-continue="${ORIG}"]`).click();
      if (sittings === 1) {
        assert.notEqual(await screen(), "end", "resumed, not paused");
        const resumedPath = await page.locator("[data-deep-path]").getAttribute("data-deep-path").catch(() => null);
        assert.equal(resumedPath, pathAtPause, "the saved diagnosis path is restored");
        assert.equal((await saved()).count, n0, "nothing was recorded while paused");
      }
      end = await drive(L, steps);
    }
    assert.equal(end, "solved_after_help", JSON.stringify(steps));
    goalChecks(steps);
    const lessons = await lessonsHaveIds();
    const ev = (await saved()).events.filter((e) => e.record === "attempt" && e.context?.startsWith("deep:"));
    assert.ok(ev.every((e) => e.context!.length <= 600));
    results.pause = { sittings, steps: steps.length, lessonsAtPause, lessons, paused, longestContext: Math.max(...ev.map((e) => e.context!.length)), end: await endText() };
  }

  // ---- 8. a SHIPPED build (no research flags): ?deep=1 and ?stuck= do nothing; the year page as usual
  if (want("shipped")) {
    await newPupil("shipped", ORIG);
    await page.goto(`http://127.0.0.1:${port}/year/?learner=${id}&deep=1&stuck=${encodeURIComponent(ORIG)}`);
    await page.waitForFunction(() => !document.body.innerText.includes("Opening OpenPath") && !document.body.innerText.includes("Loading the record"));
    await page.getByRole("heading", { name: "Stuck on a problem?" }).waitFor();
    assert.equal(await page.locator("[data-deep-recovery], [data-deep-continue]").count(), 0, "no research view, no resume card");
    assert.equal(await page.evaluate(() => localStorage.getItem("openpath.deep-recovery@0")), null, "?deep=1 is not remembered");
    results.shipped = { researchViewShown: false };
  }
  console.log(JSON.stringify(results, null, 1));
  if (process.env.DEEP_RESULTS) writeFileSync(process.env.DEEP_RESULTS, JSON.stringify(results, null, 1));
  console.log("deep-recovery app e2e: all cases passed");
} catch (e) {
  console.log(JSON.stringify(results, null, 1));
  if (shots) await page.screenshot({ path: `${shots}/deep-fail.png`, fullPage: true }).catch(() => undefined);
  if (process.env.FAIL_BODY) writeFileSync(process.env.FAIL_BODY, await page.content().catch(() => ""));
  throw e;
} finally {
  await browser.close();
  server.close();
}
