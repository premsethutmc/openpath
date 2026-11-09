/**
 * recovery-handoff@0 (RESEARCH; a `--test --deep-recovery` build with ?deep=1, and Django with OPENPATH_DEEP_RECOVERY_HANDOFF=1): a deep
 * recovery that stops is handed to the educator the parent shared the pupil with, through the real UI and the real Django API.
 *   cd frontend && node scripts/build-mathematics-journey.mjs && node scripts/build-year.mjs --test --deep-recovery
 *   (Django on HANDOFF_API, default http://127.0.0.1:8016, started with OPENPATH_DEEP_RECOVERY_HANDOFF=1)
 *   HANDOFF_MANAGE="python3 backend/manage.py" node --import tsx e2e/deep-recovery-handoff.test.mts
 * Cases: a blocked stop before any share (the learner is told no educator can see it), the parent shares and the same stop is reported
 * again (one item), a no-fresh-question stop, the shared educator's list in Content review → Marking, another educator's empty list, the
 * learner's account refused the list, the educator seeing skill/reason/step only until the parent's SEPARATE recovery-answers permission
 * (granted, then revoked), resolution with a note, then one fresh unaided learner check. No-share/reload, access revocation, duplicate resolution and retained history are asserted. Synthetic accounts only.
 */
import { createRequire } from "node:module";
import http from "node:http";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import type { Page } from "playwright";
import { latestReleases } from "../../packages/learning/src/curricula";
import { question } from "../../packages/learning/src/content";
import { learnerState, make } from "../../packages/learning/src/session";
import { withDecisions } from "../../packages/learning/src/records";
import { structuredLearner, type Answerer } from "../src/journey/deep-recovery-journey";
import { right } from "../src/journey/learners";
import { gradeRequest } from "../../packages/learning/src/server-grader";
import { wrongShaped } from "../src/journey/wrong-answers";
import { problemKeyOf } from "../../packages/learning/src/families";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright") as typeof import("playwright");
const root = fileURLToPath(new URL(`../${process.env.DIST ?? "dist-english"}/`, import.meta.url)), repo = fileURLToPath(new URL("../../", import.meta.url)), port = Number(process.env.PORT ?? 4216);
const api = process.env.HANDOFF_API ?? "http://127.0.0.1:8016";
const MANAGE = process.env.HANDOFF_MANAGE ?? "python3 backend/manage.py";
const shots = process.env.SHOTS;
const wrongVerdicts: { qid: string; response: string; verdict: string }[] = [];
const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/")) { // one connection per request: a kept-alive idle socket would block a --nothreading runserver
    const p = http.request(new URL(req.url, api), { method: req.method, headers: { ...req.headers, connection: "close" }, agent: false }, (r) => { res.writeHead(r.statusCode!, r.headers); r.pipe(res); }); req.pipe(p); return; }
  try { const path = (req.url ?? "/").split("?")[0].split("#")[0]; if (!/^\/(?:year|review)\/(?:app\.(?:js|css)(?:\.map)?|index\.html|[\w.-]+\.woff2)?$/.test(path)) { res.writeHead(404).end(); return; } const file = root + (path.endsWith("/") ? path + "index.html" : path).slice(1);
    res.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".woff2") ? "font/woff2" : "text/html" }).end(readFileSync(file)); } catch { res.writeHead(404).end(); }
});
await new Promise<void>((r) => server.listen(port, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH === "" ? undefined : process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const learnerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await learnerCtx.newPage();
page.setDefaultTimeout(30_000);
async function call(pg: Page, path: string, body?: unknown, method?: string) {
  return pg.evaluate(async ({ path, body, method }) => {
    if (!document.cookie.includes("csrftoken")) await fetch("/api/account/", { credentials: "same-origin" });
    const token = decodeURIComponent(document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)?.[1] ?? "");
    const r = await fetch("/api" + path, { method: method ?? (body === undefined ? "GET" : "POST"), headers: { "content-type": "application/json", "x-csrftoken": token }, credentials: "same-origin", body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, data: await r.json().catch(() => null) };
  }, { path, body, method });
}

const P = "MATH.", ORIG = "gen:aupfr:1,-3,3,-2,-4", PF = P + "algebra.partial-fractions";
const FACT = P + "algebra.factorisation", IDS = P + "algebra.identities", IADD = P + "number.integer-add", INTS = P + "number.integers";
const base = (q: string) => q.replace(/:(mc|w)$/, "");
const readableWrong = wrongShaped;
const shaped = (a: Answerer): Answerer => (qid, c) => { const x = a(qid, c); return x === right(qid) ? x : readableWrong(qid); };
const nocontent = () => shaped(structuredLearner({ "fam:aupfr": [PF], [PF]: [FACT], [FACT]: [IDS], [IDS]: [IADD], [IADD]: [INTS] }, [PF, FACT, IDS, IADD, INTS]));
const stamp = Date.now(), password = "synthetic-deep-recovery-handoff-passphrase";
const parentEmail = `handoff-parent-${stamp}@example.org`, teacherEmail = `handoff-teacher-${stamp}@example.org`, otherEmail = `handoff-other-${stamp}@example.org`;
const results: Record<string, unknown> = {};

let id = "";
const saved = async () => (await call(page, `/pupils/${id}/events/?subject=mathematics`)).data as { events: { record?: string; competency?: string }[]; count: number };
async function newPupil(name: string, first: string) {
  const pupil = await call(page, "/pupils/", { display_name: `Synthetic handoff ${name}`, consent: true }); assert.equal(pupil.status, 201);
  id = pupil.data.id;
  let clock = Date.now() - 60_000;
  const ctx = () => ({ learnerId: id, sessionId: `learn:${id}:seed`, at: new Date(++clock).toISOString() });
  const append = async (event: unknown) => { const d = await saved(); const r = await call(page, `/pupils/${id}/events/`, { subject: "mathematics", seq: d.count, event }); assert.equal(r.status, 201, JSON.stringify(r)); };
  await append(make.enrol(ctx(), 12, "2026-27", latestReleases.find((r) => r.grade === 12)!));
  await append(make.attempt(ctx(), first, readableWrong(first), "practice"));
  const initial = (await saved()).events.at(-1) as any;
  assert.equal(initial.decision.verdict, "incorrect", "the seeded gap is a genuine wrong answer, not unresolved");
  wrongVerdicts.push({ qid: first, response: initial.response, verdict: initial.decision.verdict });
  return id;
}
const open = (q: string, pupil = id) => page.goto(`${URL0}/year/?learner=${pupil}&deep=1&stuck=${encodeURIComponent(q)}`);
const screen = async () => { await page.waitForSelector("[data-deep-screen]"); return (await page.locator("[data-deep-screen]").first().getAttribute("data-deep-screen"))!; };
const phase = async () => (await page.locator("[data-deep-phase]").first().getAttribute("data-deep-phase"))!;
async function answerInUi(value: string) {
  const qid = (await page.locator("[data-qid]").getAttribute("data-qid"))!, q = question(qid);
  const expected = value === q.answer ? "correct" : "incorrect";
  assert.equal(gradeRequest({ id: qid, response: value }).verdict, expected, `${qid}: simulated answer must be readable`);
  if (q.options?.length) assert.ok(/^[A-D]$/.test(value), `${qid}: an option letter, not its underlying value`);
  if (q.type === "choice" || qid.endsWith(":mc")) await page.getByRole("radio").nth("ABCD".indexOf(value)).click();
  else await page.getByLabel("Your answer", { exact: true }).fill(value);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.locator(".feedback[role=status] strong").first().waitFor();
  const latest = (await saved()).events.filter(e => e.record === "attempt").at(-1) as any;
  assert.equal(latest.questionId, qid);
  assert.equal(latest.decision.verdict, expected, `${qid}: Django must record the intended verdict, not unresolved`);
  if (expected === "incorrect") wrongVerdicts.push({ qid, response: value, verdict: latest.decision.verdict });
}
async function drive(learner: Answerer) {
  for (let n = 0; n < 160; n++) {
    const kind = await screen();
    if (kind === "end") return phase();
    if (kind === "lesson") throw new Error("this case teaches nothing");
    const qid = (await page.locator("[data-qid]").getAttribute("data-qid"))!;
    await answerInUi(learner(qid, { taughtSkills: [], answered: n, activity: "" }));
    await page.locator(".feedback[role=status] strong").first().waitFor();
    await page.locator(".actions.sticky button.primary").first().click();
  }
  throw new Error("no end after 160 screens");
}
/** the stop screen's hand-off note, once the server has answered */
async function note(expect: RegExp) {
  await page.waitForFunction((src) => { const el = document.querySelector("[data-handoff]"); return !!el && new RegExp(src).test(el.getAttribute("data-handoff") ?? ""); }, expect.source);
  const el = page.locator("[data-handoff]");
  return { state: (await el.getAttribute("data-handoff"))!, text: await el.innerText() };
}
async function educator(email: string) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const pg = await ctx.newPage();
  pg.setDefaultTimeout(30_000);
  await pg.goto(`${URL0}/review/`);
  assert.equal((await call(pg, "/account/register/", { email, password, consent: true })).status, 201);
  execSync(`${MANAGE} content_reviewer grant ${email} --role educator`, { cwd: repo, stdio: "pipe", shell: "/bin/bash" });
  return pg;
}

try {
  const teacher = await educator(teacherEmail), other = await educator(otherEmail);
  await page.goto(`${URL0}/year/`);
  assert.equal((await call(page, "/account/register/", { email: parentEmail, password, consent: true })).status, 201);

  // ---- 1. blocked (missing content), nobody shared yet: the learner is told no educator can see it
  const blockedPupil = await newPupil("blocked", ORIG);
  await open(ORIG);
  assert.equal(await drive(nocontent()), "blocked");
  await note(/^not-sent/);
  assert.equal((await call(page, `/pupils/${blockedPupil}/recovery-handoffs/`)).data.handoffs.length, 0, "no automatic report");
  await page.reload(); await note(/^not-sent/);
  assert.equal((await call(page, `/pupils/${blockedPupil}/recovery-handoffs/`)).data.handoffs.length, 0, "reload retains the genuine no-share path");
  await page.getByRole("button", { name: /Request help: share the skill/ }).click();
  const n1 = await note(/^open/);
  assert.equal(n1.state, "open:not-shared");
  assert.match(n1.text, /no educator can see it yet/);
  assert.match(n1.text, /OpenPath has not sent this to anyone/);
  if (shots) await page.screenshot({ path: `${shots}/handoff-learner-not-shared.png`, fullPage: true });
  results.blockedNotShared = n1;

  // ---- 2. the parent shares written work with the educator; the same stop, reported again, is still one item
  assert.equal((await call(page, `/pupils/${blockedPupil}/marking-share/`, { email: teacherEmail })).status, 201);
  await page.reload();
  const n2 = await note(/^open/);
  assert.equal(n2.state, "open:visible");
  assert.match(n2.text, /help list of the educator your family shared your work with/);
  assert.match(n2.text, /Nobody has been emailed or messaged/);
  const mine = (await call(page, `/pupils/${blockedPupil}/recovery-handoffs/`)).data as { handoffs: { id: number; reason: string; status: string }[] };
  assert.equal(mine.handoffs.length, 1, "deduplicated");
  assert.equal(mine.handoffs[0].reason, "missing-content");
  if (shots) await page.screenshot({ path: `${shots}/handoff-learner-visible.png`, fullPage: true });
  results.blockedShared = { ...n2, handoffs: mine.handoffs };

  // ---- 3. no fresh question, shared from the start
  const nofreshPupil = await newPupil("nofresh", "di-d2");
  assert.equal((await call(page, `/pupils/${nofreshPupil}/marking-share/`, { email: teacherEmail })).status, 201);
  await open("di-d2");
  assert.equal(await drive(shaped(structuredLearner({}, []))), "escalate");
  await page.getByRole("button", { name: /Request help: share the skill/ }).click();
  assert.equal((await note(/^open/)).state, "open:visible");
  const nf = (await call(page, `/pupils/${nofreshPupil}/recovery-handoffs/`)).data as { handoffs: { reason: string }[] };
  assert.deepEqual(nf.handoffs.map((h) => h.reason), ["no-fresh-question"]);
  results.nofresh = nf.handoffs;

  // ---- 4. access: the learner's account cannot open the list; another educator sees nothing; the shared educator sees both
  assert.equal((await call(page, "/recovery-handoffs/")).status, 403);
  await other.goto(`${URL0}/review/#marking`); await other.reload(); // a hash change alone does not reload the roles
  await other.getByRole("heading", { name: /Learners who need help \(0 open\)/ }).waitFor();
  assert.equal(await other.locator("[data-handoff]").count(), 0);
  await teacher.goto(`${URL0}/review/#marking`); await teacher.reload();
  await teacher.getByRole("heading", { name: /Learners who need help \(2 open\)/ }).waitFor();
  const cards = teacher.locator("article[data-handoff]");
  assert.equal(await cards.count(), 2);
  const body = await teacher.locator("section[aria-label='Learners who need help']").innerText();
  assert.match(body, /Learner [0-9a-f]{4}/i); // the eyebrow is shown in capitals
  assert.match(body, /OpenPath has no teaching it can use for this step/);
  assert.match(body, /OpenPath has no fresh question on the same skill/);
  assert.match(body, /Nobody is emailed or messaged/);
  assert.doesNotMatch(body, /Synthetic handoff|handoff-parent/i, "no display name, no parent email");
  // without the parent's separate permission: the skill, the reason and the step only; no answers, no learner text
  assert.equal(await teacher.locator("[data-answers=not-shared]").count(), 2);
  assert.doesNotMatch(body, /What the learner was told|The learner's answers in this recovery|The problem:/);
  if (shots) await teacher.screenshot({ path: `${shots}/handoff-educator-list.png`, fullPage: true });

  // ---- 4b. the parent gives the separate, explicit permission for the blocked learner's recovery answers, then stops it
  await page.goto(`${URL0}/year/?learner=${blockedPupil}&deep=1`);
  const perm = page.locator("section[aria-label='Recovery answers']");
  await perm.waitFor();
  const permText = await perm.innerText();
  assert.match(permText, /separate from sharing written work/);
  assert.match(permText, /OpenPath does not email or message anyone/);
  assert.match(permText, /sees the skill, the reason and the step only/);
  if (shots) await page.screenshot({ path: `${shots}/handoff-parent-permission.png`, fullPage: true });
  await perm.getByRole("button", { name: `Allow ${teacherEmail} to see recovery answers` }).click();
  await perm.getByText(`${teacherEmail} can now see recovery answers on their help list.`).waitFor();
  await teacher.reload();
  await teacher.getByRole("heading", { name: /Learners who need help \(2 open\)/ }).waitFor();
  assert.equal(await teacher.locator("[data-answers=not-shared]").count(), 1, "only the learner whose parent allowed it");
  const allowedCard = teacher.locator("article[data-handoff]").filter({ hasText: "OpenPath has no teaching it can use" });
  assert.match(await allowedCard.innerText(), /What the learner was told: The answers point to/);
  assert.match(await allowedCard.innerText(), /The learner's answers in this recovery \(\d+\)/);
  if (shots) await teacher.screenshot({ path: `${shots}/handoff-educator-answers.png`, fullPage: true });
  await perm.getByRole("button", { name: `Stop showing recovery answers to ${teacherEmail}` }).click();
  await perm.getByText(`${teacherEmail} can no longer see recovery answers.`).waitFor();
  await teacher.reload();
  await teacher.getByRole("heading", { name: /Learners who need help \(2 open\)/ }).waitFor();
  assert.equal(await teacher.locator("[data-answers=not-shared]").count(), 2, "revoked: hidden again");
  results.permission = { granted: true, revoked: true };

  // Revocation removes access even when an educator already knows the handoff ID.
  const handoffId = mine.handoffs[0].id;
  assert.equal((await call(other, `/recovery-handoffs/${handoffId}/resolve/`, { note: "Unauthorised" })).status, 403);
  assert.equal((await call(page, `/pupils/${blockedPupil}/marking-share/`, { email: teacherEmail }, "DELETE")).status, 200);
  assert.equal((await call(teacher, `/recovery-handoffs/${handoffId}/resolve/`, { note: "Revoked" })).status, 403);
  await teacher.reload();
  assert.equal((await call(teacher, "/recovery-handoffs/")).data.handoffs.some((h: any) => h.id === handoffId), false);
  assert.equal((await call(page, `/pupils/${blockedPupil}/marking-share/`, { email: teacherEmail })).status, 201);
  await teacher.reload();
  await teacher.getByRole("heading", { name: /Learners who need help \(2 open\)/ }).waitFor();
  results.access = { otherEducatorDenied: true, revokedEducatorDenied: true, explicitShareRestored: true };

  // ---- 5. resolution: the educator deals with the blocked one; the learner's stop screen shows it and it is not reopened
  id = blockedPupil;
  const beforeResolution = await saved();
  const blockedCard = cards.filter({ hasText: "OpenPath has no teaching it can use" });
  await blockedCard.getByLabel("Note for the learner").fill("We went through factorising together; try the problem again.");
  await blockedCard.getByRole("button", { name: "Mark as dealt with" }).click();
  await teacher.getByRole("heading", { name: /Learners who need help \(1 open\)/ }).waitFor();
  await open(ORIG, blockedPupil);
  id = blockedPupil;
  const n5 = await note(/^resolved/);
  assert.match(n5.text, /An educator marked this as dealt with on \d{4}-\d\d-\d\d\. Their note: “We went through factorising together; try the problem again\.”/);
  const after = (await call(page, `/pupils/${blockedPupil}/recovery-handoffs/`)).data as { handoffs: { status: string }[] };
  assert.deepEqual(after.handoffs.map((h) => h.status), ["resolved"], "going back to the stop screen does not reopen it");
  assert.equal((await saved()).events.filter((e) => e.record === "teach").length, 0, "resolution teaches and marks nothing");
  if (shots) await page.screenshot({ path: `${shots}/handoff-learner-resolved.png`, fullPage: true });
  results.resolved = n5;
  assert.deepEqual((await saved()).events, beforeResolution.events, "resolution awards no attempt, teaching or mastery");
  assert.equal((await call(teacher, `/recovery-handoffs/${handoffId}/resolve/`, { note: "Repeat" })).status, 409);
  const acknowledgements = (await call(page, `/pupils/${blockedPupil}/handover-acknowledgements/`)).data.acknowledgements;
  assert.equal(acknowledgements.length, 1, "repeat resolution cannot authorise another check");
  await page.getByRole("button", { name: "Try one fresh check on my own", exact: true }).click();
  const fresh = (await page.locator("[data-qid]").getAttribute("data-qid"))!;
  const prior = (beforeResolution.events as any[]).filter(e => e.record === "attempt");
  assert.ok(!prior.some(e => problemKeyOf(e.questionId) === problemKeyOf(fresh)), "fresh is a different problem, not a format relabel");
  assert.equal(question(fresh).competency, question(ORIG).competency);
  if (shots) await page.screenshot({ path: `${shots}/handoff-learner-fresh-question.png`, fullPage: true });
  await answerInUi(right(fresh));
  const afterCheck = await saved();
  const check = afterCheck.events.at(-1) as any;
  assert.equal(check.context, `reentry:${question(ORIG).competency}`);
  assert.equal(check.activity, "diagnostic"); assert.equal(check.hints, 0); assert.equal(check.solution, false);
  assert.equal(check.decision.verdict, "correct");
  assert.deepEqual(afterCheck.events.slice(0, -1), beforeResolution.events, "prior history unchanged");
  await page.reload(); await note(/^resolved/);
  assert.equal(await page.getByRole("button", { name: "Try one fresh check on my own", exact: true }).count(), 0, "used acknowledgement cannot reopen check");
  assert.deepEqual((await saved()).events, afterCheck.events);
  const stored = (await call(page, `/pupils/${blockedPupil}/events/?subject=mathematics`)).data;
  const state = learnerState(blockedPupil, withDecisions(stored.events, stored.decisions), Date.now());
  assert.notEqual(state.evidence(question(ORIG).competency).status, "verified", "resolution and one fresh answer are not automatic mastery");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mobile handoff has no horizontal overflow");
  if (shots) await page.screenshot({ path: `${shots}/handoff-learner-fresh-check-used.png`, fullPage: true });
  results.reentry = { fresh, unaided: true, priorEventsPreserved: true, reloadPreserved: true, oneCheckOnly: true, acknowledgementCount: 1 };
  results.wrongVerdicts = wrongVerdicts;
  writeFileSync(process.env.HANDOFF_RESULTS ?? "/tmp/adaptive-quality/handoff.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 1));
  console.log("deep-recovery hand-off e2e: all cases passed");
} catch (e) {
  console.log(JSON.stringify(results, null, 1));
  if (shots) await page.screenshot({ path: `${shots}/handoff-fail.png`, fullPage: true }).catch(() => undefined);
  throw e;
} finally {
  await browser.close();
  server.close();
}
