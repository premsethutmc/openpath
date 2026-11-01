// S2 failure-case suite: the 20 required cases, through the REAL integrated journey (SliceFlow → grader, D1 working feedback, hypotheses,
// learner state, retention, E1 shadow). Tests marked OBSERVED-WEAKNESS pin down the current behaviour found by the experiment (they pass when
// OpenPath behaves as observed; a change in that behaviour makes them fail and must be reviewed). Run from frontend/:
//   node --import tsx --test ../research/synthetic-learners/experiments/s2/test/failure-cases.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { SliceFlow } from "../../../../../frontend/src/journey/flow";
import { problemOf } from "../../../../../packages/learning/src/families";
import { moduleFor } from "../../../../../packages/learning/src/content";
import { projectFromEvents } from "../../../../../packages/learning/src/subskill-evidence";
import { hypotheses } from "../../../../../packages/learning/src/hypotheses";
import { SliceSession } from "../../../../../frontend/src/journey/session";
import { D1Port } from "../src/port";
import { runS2Journey, START, COMPETENCY } from "../src/journey";
import { loadProfile } from "../../../src/profiles";
import type { Profile } from "../../../src/model";

const DAY = 86_400_000;
const ans = (qid: string) => problemOf(qid.replace(/:(mc|w)$/, ""))!.answer;
const params = (qid: string) => problemOf(qid.replace(/:(mc|w)$/, ""))!.params;
const fresh = (id: string) => new SliceFlow(moduleFor(COMPETENCY)!.diagnostics[0], `s2-case-${id}`, START);
/** answer the current question (test script: it may read the question id; the simulator never can) */
function submit(f: SliceFlow, value: string, working?: string[]) { assert.equal(f.stage, "question"); f.on({ type: "answer_submitted", value, ...(working ? { working } : {}), timestamp: 0 } as never); }
const decisionOfLast = (f: SliceFlow) => { const e = f.session.events.at(-1) as unknown as { id: string }; return f.session.decisions[e.id] as unknown as { verdict: string; working?: { status: string; firstInvalid?: { index: number } | null } }; };
const fbOf = (f: SliceFlow) => (f.spec as unknown as { feedback: { level: string; message: string } }).feedback;
const proj = (f: SliceFlow) => { const ev = f.session.state().evidence(COMPETENCY); return projectFromEvents(f.session.learnerId, f.session.events.map((e) => ({ ...(e as object), ...(f.session.decisions[(e as { id: string }).id] ? { decision: f.session.decisions[(e as { id: string }).id] } : {}) })) as never, f.session.now, { status: ev.status, verified: ev.verified }); };
const sub = (p: ReturnType<typeof proj>, k: string) => p.subSkills.find((s) => s.id === `linear-equations.${k}@1`)!;
const linWork = (qid: string, bad = false) => { const [a, b, x] = params(qid); const c = a * x + b; return [`${a}x = ${bad ? c + b : c - b}`, `x = ${x}`]; };
const cont = (f: SliceFlow) => { while (f.stage === "feedback" || f.stage === "teaching") f.on({ type: "skip_requested", timestamp: 0 } as never); };
const profile = (path: string) => JSON.parse(readFileSync(new URL(`../profiles/${path}.json`, import.meta.url), "utf8")) as Profile;

test("1 correct bare answer: right, method not checked, no method evidence", () => {
  const f = fresh("1"); const q = f.currentQuestion!; submit(f, ans(q), [`x = ${ans(q)}`]);
  const d = decisionOfLast(f); assert.equal(d.verdict, "correct"); assert.ok(["answer-only", "none"].includes(d.working!.status));
  assert.match(fbOf(f).message, /method was not checked/); assert.notEqual(sub(proj(f), "two-step").method?.status, "verified");
});
test("2 correct answer with invalid working: right answer, first false step shown, method contradicted in E1", () => {
  const f = fresh("2"); const q = f.currentQuestion!; submit(f, ans(q), linWork(q, true));
  const d = decisionOfLast(f); assert.equal(d.verdict, "correct"); assert.equal(d.working!.status, "invalid"); assert.equal(d.working!.firstInvalid!.index, 0);
  assert.match(fbOf(f).message, /first step that does not follow/i); assert.equal(sub(proj(f), "two-step").method.status, "contradicted");
});
test("3 repeated guessed answers (C02): no authoritative claim and no shadow demonstration [observed over a full journey]", () => {
  const t = runS2Journey(profile("C02"), 80002, "case");
  assert.ok(t.visits.every((v) => !["independent", "transfer", "verified"].includes(v.openpath.evidence.status)), JSON.stringify(t.visits.map((v) => v.openpath.evidence.status)));
});
test("4 assisted answers are not independent evidence", () => {
  const f = fresh("4");
  for (let i = 0; i < 60 && f.stage !== "summary"; i++) { if (f.stage === "question") { if ((f.spec as unknown as { nav: { canRequestHint: boolean } }).nav.canRequestHint) f.on({ type: "hint_requested", level: 1, timestamp: 0 } as never); submit(f, f.currentActivity === "guided" || f.hintsShown > 0 ? ans(f.currentQuestion!) : "999"); } else cont(f); }
  const assisted = f.session.state().records.attempts.filter((a) => (a.hints > 0 || a.activity === "guided") && a.credit === true);
  assert.ok(assisted.length >= 1, "there were right answers with help");
  const p = proj(f); for (const s of p.subSkills) assert.notEqual(s.status, "independently-demonstrated");
  assert.ok(!["independent", "transfer", "verified"].includes(f.session.state().evidence(COMPETENCY).status));
});
test("5 persistent misconception (C01: instruction never helps): errors continue after teaching [observed]", () => {
  const t = runS2Journey(profile("C01"), 80001, "case");
  const taughtAt = t.visits.findIndex((v) => v.openpath.teaching.length);
  assert.ok(taughtAt >= 0, "OpenPath teaches C01");
  assert.ok(t.instruction.every((i) => i.outcome === "none"));
  assert.deepEqual(t.finalHidden.misconceptions, t.initialHidden.misconceptions);
});
test("6 unrecognised misconception (coefficient-dropped): errors occur where it changes the answer; no OpenPath explanation names it [OBSERVED-WEAKNESS]", () => {
  const p = { ...profile("S003B"), skills: { "one-step": 1, "two-step": 1, "both-sides": 0, brackets: 1, modelling: 1 }, misconceptions: { "coefficient-dropped": 1 }, slip: 0, guess: 0 } as Profile;
  for (const seed of [4242, 4243, 4244]) {
    const t = runS2Journey(p, seed, "case", { limits: { visits: 4 } });
    // a − c = 1 makes the dropped coefficient harmless (a documented limitation of this error pattern): those questions are excluded
    const both = t.visits.flatMap((v) => v.openpath.attempts).filter((a) => a.kind === "both-sides" && a.hints === 0 && !a.qid.endsWith(":mc") && (() => { const [a1, , c1] = params(a.qid); return a1 - c1 !== 1; })());
    for (const a of both) assert.equal(a.verdict, "incorrect", `${a.qid} ${a.response}`);
    const est = t.visits.flatMap((v) => v.openpath.established.map((h) => h.explanation));
    assert.ok(!est.includes("coefficient-dropped"));
  }
});
test("7 wrong intermediate algebraic step: D1 points at that line", () => {
  const f = fresh("7"); const q = f.currentQuestion!; const [a, b, x] = params(q); const c = a * x + b;
  submit(f, String(x), [`${a}x = ${c - b}`, `x = ${x + 1}`, `x = ${x}`]);
  assert.equal(decisionOfLast(f).working!.firstInvalid!.index, 1);
});
test("8 correct intermediate steps, wrong final answer: verdict incorrect; the working is not called wrong before its last line", () => {
  const f = fresh("8"); const q = f.currentQuestion!; const [a, b, x] = params(q); const c = a * x + b;
  submit(f, String(x + 2), [`${a}x = ${c - b}`, `x = ${x}`]);
  const d = decisionOfLast(f); assert.equal(d.verdict, "incorrect"); assert.ok(d.working!.status !== "invalid" || (d.working!.firstInvalid?.index ?? 0) >= 1);
});
test("9 partial working: D1 reports partial, nothing invented", () => {
  const f = fresh("9"); const q = f.currentQuestion!; const [a, b, x] = params(q); const c = a * x + b;
  submit(f, "", [`${a}x = ${c - b}`]);
  assert.equal(decisionOfLast(f).working?.status, "partial"); assert.equal(fbOf(f).level, "partial");
});
test("10 unsupported notation: not marked as a false step", () => {
  const f = fresh("10"); const q = f.currentQuestion!; const [a, b, x] = params(q); const c = a * x + b;
  submit(f, String(x), [`${a}x + ${b} - ${b} = ${c} - ${b}`, `${a}x/${a} = ${c - b}/${a}`, `x = ${x}`]);
  assert.notEqual(decisionOfLast(f).working!.status, "invalid");
});
test("11 early apparent mastery followed by failure (C04): the authoritative claim outlives the knowledge [OBSERVED-WEAKNESS]", () => {
  const t = runS2Journey(profile("C04"), 80004, "case");
  const claim = (v: (typeof t.visits)[number]) => ["independent", "transfer", "verified"].includes(v.openpath.evidence.status);
  assert.ok(claim(t.visits[0]) && t.visits[0].hiddenAfter.abilities["two-step"] >= 0.9, "credited on the first visit while the (fragile) knowledge is there");
  assert.ok(t.visits.some((v) => claim(v) && v.hiddenAfter.abilities["two-step"] < 0.6), "still credited after it has gone");
  assert.ok(t.visits.some((v) => v.openpath.evidence.retention === "failed"), "the delayed check catches it");
});
test("12 successful teaching followed by independent success: when instruction lands, the taught kind improves and the learner is later shown alone", () => {
  const base = loadProfile("S003"); const p = { ...base, instruction: { ...base.instruction, full: 1, partial: 0, misconceptionResponse: 1 } } as Profile;
  let shownAfterTeaching = 0;
  for (const seed of [9001, 9002, 9003]) {
    const t = runS2Journey(p, seed, "case");
    assert.ok(t.instruction.length > 0, "OpenPath taught");
    const first = t.instruction[0]; const k = first.kind!;
    assert.ok(t.finalHidden.abilities[k] > first.abilitiesBefore[k] || first.abilitiesBefore[k] >= 0.95, `${k} improved`);
    const tv = t.visits.findIndex((v) => v.openpath.teaching.length);
    if (t.visits.slice(tv).some((v) => ["independent", "transfer"].includes(v.openpath.evidence.status))) shownAfterTeaching++;
  }
  assert.ok(shownAfterTeaching >= 1, "at least one of three journeys reaches 'shown alone' after teaching");
});
test("13 failed teaching followed by inappropriate mastery: C01 (instruction never lands) is not credited in this journey", () => {
  const t = runS2Journey(profile("C01"), 80001 + 7919, "case");
  assert.ok(t.instruction.length > 0 && t.instruction.every((i) => i.outcome === "none"), "taught, and nothing was learned");
  assert.ok(t.visits.every((v) => !["independent", "transfer", "verified"].includes(v.openpath.evidence.status)), "no authoritative claim (all 20 C01 journeys: 0 claims, see results)");
});
test("14 retention failure: the failed delayed check is kept in the history", () => {
  const f = fresh("14");
  for (let i = 0; i < 80 && f.stage !== "summary"; i++) { if (f.stage === "question") submit(f, ans(f.currentQuestion!)); else cont(f); }
  const due = f.session.state().evidence(COMPETENCY).retentionDueAt; assert.ok(due, "a delayed check is scheduled after independent success");
  f.later(Math.ceil((Date.parse(due!) - f.session.now) / DAY) + 1);
  let sawRetention = false;
  for (let i = 0; i < 40 && f.stage !== "summary"; i++) { if (f.stage === "question") { if (f.currentActivity === "retention") sawRetention = true; submit(f, f.currentActivity === "retention" ? "999" : ans(f.currentQuestion!)); } else cont(f); }
  assert.ok(sawRetention); const ev = f.session.state().evidence(COMPETENCY);
  assert.ok(ev.retentionHistory.some((h) => h.result === "failed"));
});
test("15 recovery targeting the wrong sub-skill: a failed modelling check is recovered by two-step and bracket answers [OBSERVED-WEAKNESS, experiment journey s2-A-S001-143543]", () => {
  const t = runS2Journey(loadProfile("S001"), 1001 + 7919 * 18, "A");
  const atts = t.visits.flatMap((v) => v.openpath.attempts);
  const h = (t.visits.at(-1)!.openpath.evidence.history as { result: string; failedAt: string | null; recoveredAt: string | null }[]).find((x) => x.result === "failed" && x.recoveredAt)!;
  assert.ok(h, "a failed delayed check that was later recovered");
  const failed = atts.find((a) => a.activity === "retention" && a.at === h.failedAt)!;
  const rec = atts.filter((a) => a.activity !== "retention" && Date.parse(a.at) > Date.parse(h.failedAt!) && Date.parse(a.at) <= Date.parse(h.recoveredAt!));
  assert.ok(rec.length >= 2);
  assert.ok(!rec.some((a) => a.kind === failed.kind && a.verdict === "correct"), `recovered with ${rec.map((a) => a.kind).join(", ")} after a failed ${failed.kind} check`);
});
test("16 bracket mastery inferred from two-step success: authoritative 'shown alone', E1 brackets not demonstrated, discrepancy exposed [OBSERVED-WEAKNESS]", () => {
  const f = fresh("16");
  for (let i = 0; i < 40 && f.stage !== "summary"; i++) { if (f.stage === "question") { const q = f.currentQuestion!; submit(f, problemOf(q.replace(/:(mc|w)$/, ""))!.family === "lin" ? ans(q) : "999"); } else cont(f); if (["independent", "transfer"].includes(f.session.state().evidence(COMPETENCY).status)) break; }
  assert.ok(["independent", "transfer"].includes(f.session.state().evidence(COMPETENCY).status), "two-step answers alone earn the competency claim");
  const p = proj(f); assert.notEqual(sub(p, "brackets").status, "independently-demonstrated"); assert.ok(p.discrepancies.length > 0);
});
test("17 both-sides mastery inferred from unrelated success: shadow never credits both-sides from two-step answers", () => {
  const f = fresh("17");
  for (let i = 0; i < 30 && f.stage !== "summary"; i++) { if (f.stage === "question") { const q = f.currentQuestion!; submit(f, problemOf(q.replace(/:(mc|w)$/, ""))!.family !== "lboth" ? ans(q) : "999"); } else cont(f); }
  assert.notEqual(sub(proj(f), "both-sides").status, "independently-demonstrated");
});
test("18 historical authority-version evidence is not upgraded to current method evidence", () => {
  const f = fresh("18"); const q = f.currentQuestion!; submit(f, ans(q), linWork(q));
  const evs = f.session.events.map((e) => { const d = f.session.decisions[(e as { id: string }).id] as unknown as { working?: { versions?: { authority?: string } } } | undefined; return d ? { ...(e as object), decision: { ...d, working: { ...d.working, versions: { ...(d.working?.versions ?? {}), authority: "openpath-derivation-authority@2" } } } } : e; });
  const p = projectFromEvents(f.session.learnerId, evs as never, f.session.now, null); const s = sub(p, "two-step");
  assert.notEqual(s.method.status, "verified");
});
test("19 forged client grading claims are ignored (adapter drops them; the server decides)", () => {
  const f = fresh("19"); const port = new D1Port(f);
  port.act({ type: "answer", value: "999", decision: { verdict: "correct", decidedBy: "server" }, credit: true, assessment: { derivationVerified: true }, mastery: "verified" } as never);
  const e = f.session.events.at(-1) as unknown as Record<string, unknown>; assert.equal("credit" in e, false); assert.equal("mastery" in e, false);
  assert.equal(decisionOfLast(f).verdict, "incorrect"); assert.equal(f.session.state().evidence(COMPETENCY).verified, false);
  const recs = f.session.state().records; assert.equal(hypotheses(recs).some((h) => h.status === "resolved"), false);
});
test("20 restart and deterministic replay: identical journeys; state rebuilt from records is identical", () => {
  const a = runS2Journey(loadProfile("S005"), 5005, "case"), b = runS2Journey(loadProfile("S005"), 5005, "case");
  const strip = (t: unknown) => JSON.stringify(t).replace(/lr-[a-z0-9-]+/g, "#");
  assert.equal(strip(a), strip(b));
  const f = fresh("20"); for (let i = 0; i < 15 && f.stage !== "summary"; i++) { if (f.stage === "question") submit(f, ans(f.currentQuestion!)); else cont(f); }
  const s = SliceSession.fromEvents(f.session.learnerId, COMPETENCY, f.session.events, f.session.now, f.session.session); Object.assign(s.decisions, f.session.decisions);
  assert.deepEqual(s.state().evidence(COMPETENCY), f.session.state().evidence(COMPETENCY));
});
