/**
 * Two-dice probability (TP-PRO-01, pending educator review) in the LOADED library: MATH.probability.sample-space carries
 * akdice_fix_totals, akdice_fix_order and akdice_pairs, scoped to sample-space.dice-exact-total@1. A synthetic learner answers;
 * the engine decides everything (investigation, teaching, guided, recheck, delayed check, recovery). Saved and reloaded
 * records give the same next step.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { phasePool, problemOf } from "../../../packages/learning/src/families";
import { fromTemplate } from "../../../packages/learning/src/library";
import { gradeRequest } from "../../../packages/learning/src/server-grader";
import { probeReading } from "../../../packages/learning/src/reasoning";
import { hypotheses } from "../../../packages/learning/src/hypotheses";
import { contentEligibility } from "../../../packages/learning/src/explanation-review";
import { blockCheck, skillRetention } from "../../../packages/learning/src/intervention";
import { learnerState, make } from "../../../packages/learning/src/session";
import { withDecisions } from "../../../packages/learning/src/records";
import { connectedSkill, SAMPLE_SPACE_CONFIG } from "../../../packages/learning/src/skill-connections";
import { metProblems, problemIdentity } from "../../../packages/learning/src/problem-identity";
import { candidateStrategies, pairsWithTotal, SKILL } from "../../../content/learning/src/two-dice-candidate.mts";
import { SliceSession } from "./session";

const C = "MATH.probability.sample-space";
const base = (q: string) => q.replace(/:(mc|w)$/, "");
const problem = (q: string) => problemOf(base(q))!;
const skillOf = (q: string) => connectedSkill(SAMPLE_SPACE_CONFIG, q);
const frac = (a: number, b: number) => { const g = (x: number, y: number): number => (y ? g(y, x % y) : x); const d = g(a, b); return d === b ? String(a / d) : `${a / d}/${b / d}`; };
const PHASES = ["diagnostic", "practice", "check", "retention"] as const;
const exact = [...new Set(PHASES.flatMap((ph) => phasePool("akdice", ph)))].filter((q) => problem(q).params[2] === 0);

test("outcomes agree with the stored answers: every 'total is exactly k' pool item, counted pair by pair", () => {
  assert.equal(exact.length, 80);
  for (const q of exact) {
    const [m, n, , k] = problem(q).params, count = pairsWithTotal(m, n, k).length, x = question(q);
    assert.equal(q.endsWith(":mc") ? x.options![x.answer.charCodeAt(0) - 65] : x.answer, frac(count, m * n), q);
    assert.equal(gradeRequest({ id: q, response: x.answer }).verdict, "correct", q);
    // (where equally likely totals happen to give the true value, e.g. 5,6,0,9: 3/30 = 1/10, that error cannot show)
    if (!q.endsWith(":mc") && count * (m + n - 1) !== m * n) assert.equal(gradeRequest({ id: q, response: `1/${m + n - 1}` }).verdict, "incorrect", q);
  }
});

test("registered: the loaded module carries exactly the candidate explanations, appended to the unchanged template, pending review", () => {
  const m = moduleFor(C)!, version = JSON.parse(readFileSync(new URL("../../../content/learning/blueprints.v1.json", import.meta.url), "utf8")).version;
  const tpl = fromTemplate("akss", C, version);
  assert.deepEqual(m.strategies.slice(0, tpl.strategies.length).map((s) => s.id), tpl.strategies.map((s) => s.id));
  const added = m.strategies.slice(tpl.strategies.length);
  assert.deepEqual(JSON.parse(JSON.stringify(added.map(({ id, title, kind, scope, addresses, screens, guided, check }) => ({ id, title, kind, scope, ...(addresses ? { addresses } : {}), screens, guided, check })))),
    JSON.parse(JSON.stringify(candidateStrategies().map(({ needs, ...s }) => { void needs; return s; }))));
  for (const s of added) {
    const target = s.addresses, req = { competency: C, usage: "intervention" as const, misconceptionEvidence: target ? [target] : [] };
    const demo = contentEligibility(m, s, { ...req, mode: "demonstration" });
    assert.equal(demo.eligible, true, `${s.id}: ${demo.failed}`); assert.equal(demo.status, "pending_review"); assert.equal(demo.educatorApproved, false);
    assert.equal(contentEligibility(m, s, { ...req, mode: "supervised-evaluation" }).eligible, false);
    if (target) assert.equal(contentEligibility(m, s, { ...req, mode: "demonstration", misconceptionEvidence: [] }).eligible, false, "a fix needs the established misconception");
    for (const id of [s.guided, s.check, ...s.screens.map((x) => x.instance!)]) assert.equal(skillOf(id), SKILL, `${s.id}: ${id}`);
  }
  // 7 beats 2 on two ordinary dice: six ordered pairs against one
  const why = added.find((s) => s.id === "akdice_fix_totals")!.screens.find((x) => x.role === "concept")!;
  assert.deepEqual(why.math, ["Total 2: (1, 1), 1 pair, so P = 1/36", "Total 7: (1, 6), (2, 5), (3, 4), (4, 3), (5, 2), (6, 1), 6 pairs, so P = 1/6", "6 pairs against 1: a total of 7 is 6 times as likely as a total of 2."]);
  for (const s of added) for (const sc of s.screens) if (sc.role === "strategy") assert.equal(sc.math!.at(-1), `So the answer is ${problem(sc.instance!).answer}`);
});

test("problem-identity@1: a mirror total, and the :mc / :w forms, are the same problem; another total is not", () => {
  assert.equal(problemIdentity("gen:akdice:6,6,0,8"), problemIdentity("gen:akdice:6,6,0,6"));
  assert.equal(problemIdentity("gen:akdice:4,5,0,4"), problemIdentity("gen:akdice:4,5,0,7"));
  assert.equal(problemIdentity("gen:akdice:4,5,0,6:mc"), problemIdentity("gen:akdice:4,5,0,5"), "a delayed item that is the corrected recheck relabelled");
  assert.equal(problemIdentity("gen:akdice:5,5,0,3"), problemIdentity("gen:akdice:5,5,0,9:mc"));
  assert.notEqual(problemIdentity("gen:akdice:4,5,0,5"), problemIdentity("gen:akdice:4,5,0,7"));
  assert.notEqual(problemIdentity("gen:akdice:6,6,1,7"), problemIdentity("gen:akdice:6,6,0,7"), "k or more is another skill");
  assert.equal(problemIdentity("gen:akss:2,3,2,0"), "gen:akss:2,3,2,0".replace(/:(mc|w)$/, "") === "gen:akss:2,3,2,0" ? problemIdentity("gen:akss:2,3,2,0") : "");
});

/** a learner who holds `target` until taught: answers with the misconception wherever it would show, right everywhere else */
function drive(target: string, o: { pre?: string[]; id: string }) {
  const at = Date.parse("2026-01-01T00:00:00Z"), s = new SliceSession(`two-dice-${o.id}`, C, at);
  s.events.push(make.pathway({ learnerId: s.learnerId, sessionId: s.session, at: new Date(at - 1000).toISOString() }, C));
  for (const q of o.pre ?? []) s.submit(q, question(q).answer, "practice");
  let learnt = false;
  const reply = (q: string) => {
    const r = probeReading(base(q), target);
    if (learnt || !r.discriminates) return question(q).answer;
    if (!q.endsWith(":mc")) return r.predicted[0];
    const x = question(q), i = x.options!.indexOf(r.predicted[0]); return i >= 0 ? "ABCD"[i] : x.answer;
  };
  const steps: { phase: string; q: string | null; strategy?: string; activity?: string; right?: boolean; hyp: string | null }[] = [];
  const status = () => hypotheses(s.state().selectionRecords).find((h) => h.claim?.explanation === target)?.status ?? null;
  const first = "gen:akdice:5,5,0,4";
  s.submit(first, reply(first), "check"); steps.push({ phase: "start", q: first, activity: "check", right: false, hyp: status() });
  const step = (n = s.next(C)) => {
    if (n.phase === "chapter") { s.taught(n); learnt = true; steps.push({ phase: "chapter", q: null, strategy: n.strategy!.id, hyp: status() }); return true; }
    if (!n.question) { steps.push({ phase: n.phase, q: null, hyp: status() }); return false; }
    const activity = n.phase === "explore" ? "diagnostic" : ["guided", "check", "retention", "transfer"].includes(n.phase) ? n.phase : (moduleFor(C)!.transfer.includes(n.question) ? "transfer" : "practice");
    const r = reply(n.question);
    s.submit(n.question, r, activity as never, n.context ? { context: n.context } : {});
    steps.push({ phase: n.phase, q: n.question, ...(n.strategy ? { strategy: n.strategy.id } : {}), activity, right: r === question(n.question).answer, hyp: status() });
    return true;
  };
  return { s, steps, step, status, setLearnt: (v: boolean) => { learnt = v; } };
}
const replayEqual = (s: SliceSession) => {
  const saved = JSON.parse(JSON.stringify(withDecisions(s.events, s.decisions)));
  assert.deepEqual(learnerState(s.learnerId, saved, s.now, { currentSession: s.session }).module(C), s.state().module(C));
  const r = SliceSession.fromEvents(s.learnerId, C, s.events, s.now, s.session); Object.assign(r.decisions, s.decisions);
  assert.deepEqual(r.state().module(C), s.state().module(C));
};

for (const [target, strategy, pre] of [
  ["totals-equally-likely", "akdice_fix_totals", []], ["order-ignored", "akdice_fix_order", []],
  // the explanation's own recheck was met before: a fresh same-skill recheck replaces it (never another skill, never a relabelled one)
  ["totals-equally-likely", "akdice_fix_totals", ["gen:akdice:4,5,0,5"]], ["order-ignored", "akdice_fix_order", ["gen:akdice:6,6,0,3"]],
] as const) test(`app path (${target}${pre.length ? `, own check ${pre[0]} already met` : ""}): one wrong answer is only a suspicion; investigation, explanation, fresh recheck, save/reload`, () => {
  const j = drive(target, { id: `${target}-${pre.length}`, pre: [...pre] });
  // one matching wrong answer: nothing established, nothing taught; the next question investigates on the SAME skill
  assert.equal(j.status(), null);
  j.step();
  assert.equal(j.steps[1].phase, "explore"); assert.equal(skillOf(j.steps[1].q!), SKILL, j.steps[1].q!);
  for (let i = 0; i < 6 && !j.steps.some((x) => x.phase === "check"); i++) j.step();
  const ti = j.steps.findIndex((x) => x.phase === "chapter");
  assert.ok(ti > 0, JSON.stringify(j.steps)); assert.equal(j.steps[ti].strategy, strategy); assert.equal(j.steps[ti - 1].hyp, "established");
  const ci = j.steps.findIndex((x) => x.phase === "check"), check = j.steps[ci].q!;
  assert.equal(skillOf(check), SKILL, check);
  const before = [...(pre as readonly string[]), ...j.steps.slice(0, ci).flatMap((x) => (x.q ? [x.q] : [])), ...moduleFor(C)!.strategies.find((x) => x.id === strategy)!.screens.map((x) => x.instance!)];
  assert.ok(!before.some((q) => problemIdentity(q) === problemIdentity(check)), `${check} repeats or relabels: ${before.join(" ")}`);
  assert.ok(probeReading(base(check), target).discriminates, "the misunderstanding would still show on the recheck");
  assert.equal(j.steps[ci].hyp, "resolved");
  // no transfer question between the first wrong answer and the right recheck
  assert.deepEqual(j.steps.slice(0, ci).filter((x) => x.activity === "transfer").map((x) => x.q), []);
  replayEqual(j.s);
});

test("delayed check of the taught skill: fresh exact-total question; a wrong one gets the general method once, then a fresh recheck; save/reload", () => {
  const j = drive("totals-equally-likely", { id: "delayed" });
  for (let i = 0; i < 60; i++) if (!j.step()) break;
  assert.equal(j.s.state().evidence(C).retention, "scheduled");
  const seen = [...j.steps.flatMap((x) => (x.q ? [x.q] : []))];
  j.s.wait(8);
  const n = j.s.next(C);
  assert.equal(n.phase, "retention"); assert.equal(skillOf(n.question!), SKILL, `delayed check ${n.question} is not the taught skill`);
  assert.ok(!seen.some((q) => problemIdentity(q) === problemIdentity(n.question!)), `${n.question} repeats or relabels a met problem`);
  // forgets once: the delayed answer is wrong (not the modelled error: one answer establishes nothing)
  const q = n.question!, x = question(q);
  j.s.submit(q, q.endsWith(":mc") ? (x.answer === "A" ? "B" : "A") : "1/2", "retention");
  const t = j.s.next(C);
  assert.equal(t.phase, "chapter"); assert.equal(t.strategy?.id, "akdice_pairs", "the general explanation, not a misconception fix");
  assert.equal(hypotheses(j.s.state().selectionRecords).filter((h) => h.status === "established").length, 0);
  j.s.taught(t);
  const c = j.s.next(C);
  assert.equal(c.phase, "check"); assert.equal(skillOf(c.question!), SKILL);
  assert.ok(![...seen, q, ...t.strategy!.screens.map((s) => s.instance!), t.strategy!.guided].some((p) => problemIdentity(p) === problemIdentity(c.question!)));
  replayEqual(j.s);
  j.s.submit(c.question!, question(c.question!).answer, "check");
  const after = j.s.next(C);
  assert.notEqual(after.strategy?.id, "akdice_pairs", "taught once, then the module carries on");
  replayEqual(j.s);
});

test("'k or more' is a different skill: never the delayed check of exact totals, and its answers do not clear a relapse", () => {
  assert.equal(skillOf("gen:akdice:3,6,1,4:mc"), "sample-space.dice-at-least@1");
  assert.ok(moduleFor(C)!.retention.includes("gen:akdice:3,6,1,4:mc"));
  const j = drive("totals-equally-likely", { id: "at-least" });
  for (let i = 0; i < 60; i++) if (!j.step()) break;
  j.s.wait(8);
  const n = j.s.next(C); assert.notEqual(n.question, "gen:akdice:3,6,1,4:mc");
  const w = question(n.question!); j.s.submit(n.question!, n.question!.endsWith(":mc") ? (w.answer === "A" ? "B" : "A") : "1/2", "retention");
  j.s.submit("gen:akdice:3,6,1,4:mc", question("gen:akdice:3,6,1,4:mc").answer, "practice");
  const nn = j.s.next(C); assert.equal(nn.strategy?.id, "akdice_pairs", `a right "k or more" answer is not evidence for exact totals: ${nn.phase} ${nn.question} ${nn.reason}`);
});

test("no fresh same-skill question: the recheck and the delayed check report the gap instead of substituting another skill", () => {
  const at = Date.parse("2026-01-01T00:00:00Z"), s = new SliceSession("two-dice-exhausted", C, at), m = moduleFor(C)!;
  for (const q of exact) s.submit(q, question(q).answer, "practice");
  s.events.push(make.teach({ learnerId: s.learnerId, sessionId: s.session, at: new Date(s.now + 60_000).toISOString() }, C, "akdice_fix_totals", "conceptual"));
  s.now += 120_000;
  const recs = s.state().records, st = m.strategies.find((x) => x.id === "akdice_fix_totals")!;
  assert.ok(exact.every((q) => metProblems(recs).has(problemIdentity(q))));
  assert.equal(blockCheck(m, st, recs), null, "no other skill's question is put in its place");
  const r = skillRetention(m, recs);
  assert.equal(r.question, null); assert.match(r.gap!, /sample-space\.dice-exact-total@1/);
  // the unscoped template explanations keep their module-wide fresh check (recheck@1 unchanged)
  const tree = m.strategies.find((x) => x.id === "tree")!;
  assert.equal(blockCheck(m, tree, recs), question(tree.check) && tree.check);
});
