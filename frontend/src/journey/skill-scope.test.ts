/**
 * skill-scope@1 (intervention.ts currentSkill / scopeAllows): a skill-scoped explanation is offered only for the learner's
 * current skill, read from trusted provenance (the versioned skill mapping classifies the question of the learner's latest
 * recorded wrong answer), and a skill-scoped misconception fix only when the misconception was recorded on that skill.
 * Every case runs the real automatic path: scripted answers only, through runScenario (the engine asks, the scripted
 * learner answers, the engine teaches); no strategy is chosen or injected by the test. Synthetic learners only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { runScenario, type Run } from "./scenarios";
import { misconception, right, type Learner } from "./learners";
import { moduleFor } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { hypotheses } from "../../../packages/learning/src/hypotheses";
import { currentSkill, scopeAllows, teachable } from "../../../packages/learning/src/intervention";
import { connectedSkill, connectionConfig } from "../../../packages/learning/src/skill-connections";
import { learnerState } from "../../../packages/learning/src/session";
import { withDecisions } from "../../../packages/learning/src/records";

const taught = (r: Run, competency: string) => (r.f.session.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; strategy: string }[]).filter((t) => t.competency === competency).map((t) => t.strategy);
const on = (fam: string, index: number, value: number) => (q: string) => { const p = problemOf(q.replace(/:(mc|w)$/, "")); return !!p && p.family === fam && p.params[index] === value; };
/** a scripted learner: answers `wrongOn` questions with `answer` until taught once, everything else right */
const scripted = (wrongOn: (q: string) => boolean, answer: (q: string) => string | null): Learner => ({ name: "scripted", act: (v) => ({ answer: v.taught === 0 && wrongOn(v.q) ? (answer(v.q) ?? right(v.q)) : right(v.q) }) });
const otherFraction = (q: string) => { const p = problemOf(q.replace(/:(mc|w)$/, "")); return p ? [...p.prompt.matchAll(/(\d+)\/(\d+)/g)].map((m) => `${m[1]}/${m[2]}`).find((f) => f !== String(p.answer)) ?? null : null; };
/** saved and reloaded: the engine's next step from the saved events equals the live one */
const reloads = (r: Run, competency: string) => {
  const L = r.f.session, saved = JSON.parse(JSON.stringify(withDecisions(L.events, L.decisions)));
  assert.deepEqual(learnerState(L.learnerId, saved, L.now, { currentSession: L.session }).module(competency), L.state().module(competency), "reload gives the same next step");
};

/** the claim's status when the first lesson was chosen (records up to that lesson). After claim-teaching@1 the learner carries
 *  on past that lesson instead of pausing, so later right answers can contest the claim by the end of the run. */
const statusAtFirstLesson = (r: Run, explanation: string) => {
  const L = r.f.session, ev = withDecisions(L.events, L.decisions), k = ev.findIndex((e) => (e as { record?: string }).record === "teach");
  const recs = learnerState(L.learnerId, k < 0 ? ev : ev.slice(0, k), L.now, { currentSession: L.session }).records;
  return hypotheses(recs).find((x) => x.claim?.explanation === explanation)?.status ?? null;
};
const FCMP = "MATH.number.fraction-comparison", MISS = "MATH.algebra.missing-number", LINI = "MATH.algebra.linear-intro";

test("fractions, negative: a same-bottom comparison difficulty is not taught an ordering or same-top lesson", () => {
  // wrong on same-bottom comparisons (generated, and the hand-written module's own same-bottom questions)
  const r = runScenario({ id: "scope-fr-neg", category: 2, start: "gen:adfcmp:0,3,1,2,0", expect: {},
    learner: () => scripted((q) => on("adfcmp", 0, 0)(q) || /^fc-/.test(q), (q) => (q.startsWith("gen:") ? otherFraction(q) : "A")) });
  const t = taught(r, FCMP);
  assert.ok(t.length >= 1, "something was taught");
  assert.equal(t[0], "same_size_pieces", `the designed same-bottom lesson: ${t}`);
  for (const s of t) assert.ok(!/^order_|compare_same_top|compare_unlike/.test(s), `no other skill's lesson: ${t}`);
  reloads(r, FCMP);
});

test("fractions, positive: a same-top difficulty is taught the same-top explanation", () => {
  const r = runScenario({ id: "scope-fr-pos", category: 2, start: "gen:adfcmp:1,1,2,4,0", expect: {},
    learner: () => scripted(on("adfcmp", 0, 1), (q) => misconception(q, new Set(["bigger-bottom-bigger"])) ?? otherFraction(q)) });
  assert.equal(taught(r, FCMP)[0], "compare_same_top", `${taught(r, FCMP)}`);
  reloads(r, FCMP);
});

test("equations, negative: same-operation recorded on x − a does not trigger the x + a fix; ordinary teaching of the current skill runs", () => {
  // the mistake is made on x + a questions and the x − a question; the engine's investigation records it on its x − a original
  const r = runScenario({ id: "scope-lin-neg", category: 2, start: "gen:ahone:0,4,1", expect: {},
    learner: () => scripted((q) => on("ahone", 0, 0)(q) || on("ahone", 0, 1)(q), (q) => misconception(q, new Set(["same-operation"])) ?? (on("ahone", 0, 1)(q) ? String(Number(problemOf(q.replace(/:mc$/, ""))!.answer) + 1) : null)) });
  const L = r.f.session, records = L.state().records, m = moduleFor(LINI)!, config = connectionConfig(LINI)!;
  const h = hypotheses(records).find((x) => x.claim?.explanation === "same-operation");
  assert.ok(h && ["established", "resolved", "contested"].includes(h.status), JSON.stringify(hypotheses(records).map((x) => [x.status, x.claim?.explanation])));
  const recordedOn = connectedSkill(config, h!.scope.question);
  const t = taught(r, LINI);
  for (const s of t) {
    const st = m.strategies.find((x) => x.id === s)!;
    if (st.addresses) assert.equal(st.scope?.subSkill, recordedOn, `a fix is only taught for the skill the mistake was recorded on: ${t}`);
  }
  // the content gate alone would allow both same-operation fixes; the scope rule is what refuses the one(s) for other skills
  const skill = currentSkill(m, records);
  for (const id of ["fix_same_operation_add", "fix_same_operation_take"]) {
    const fix = m.strategies.find((x) => x.id === id)!;
    assert.equal(teachable(m, fix, ["same-operation"]), true, `${id}: passes the content gate`);
    assert.equal(scopeAllows(m, fix, records, skill), fix.scope!.subSkill === skill && fix.scope!.subSkill === recordedOn, `${id}: allowed only on its own, recorded skill`);
  }
  assert.ok(t.length >= 1, `teaching continued: ${t}`);
  // the hazard is really present: the mistake is established on one skill while the learner's current skill is another
  // investigation-scope@1: the engine's follow-ups now stay on the original question's skill, so the finding and the current skill
  // agree; the other skill's fix is still refused by the scope rule (loop above)
  assert.equal(statusAtFirstLesson(r, "same-operation"), "established"); assert.equal(recordedOn, skill);
  // the only fix that may be taught is the recorded (and current) skill's own; never the x + a one
  assert.ok(t.every((s) => !m.strategies.find((x) => x.id === s)!.addresses || m.strategies.find((x) => x.id === s)!.scope?.subSkill === recordedOn), `no other skill's fix: ${t}`);
  assert.ok(t.some((s) => m.strategies.find((x) => x.id === s)!.scope?.subSkill === skill), `the current skill's own explanation: ${t}`);
  reloads(r, LINI);
});

test("missing numbers, negative: added-both recorded on n − □ does not trigger the □ + k fix", () => {
  const r = runScenario({ id: "scope-miss-neg", category: 2, start: "gen:acmissing:1,9,18", expect: {},
    learner: () => ({ name: "added-both everywhere", act: (v) => ({ answer: v.taught === 0 ? (misconception(v.q, new Set(["added-both"])) ?? right(v.q)) : right(v.q) }) }) });
  const L = r.f.session, records = L.state().records, m = moduleFor(MISS)!, config = connectionConfig(MISS)!;
  const h = hypotheses(records).find((x) => x.claim?.explanation === "added-both")!;
  assert.ok(h, "the mistake is recorded");
  const recordedOn = connectedSkill(config, h.scope.question);
  for (const s of taught(r, MISS)) { const st = m.strategies.find((x) => x.id === s)!; if (st.addresses) assert.equal(st.scope?.subSkill, recordedOn, `${taught(r, MISS)}`); }
  const fix = m.strategies.find((x) => x.id === (recordedOn === "missing.box-plus-k@1" ? "fix_added_both_taken" : "fix_added_both"))!;
  assert.equal(teachable(m, fix, ["added-both"]), true);
  assert.equal(scopeAllows(m, fix, records), false, "the fix for the other skill is refused");
  // investigation-scope@1: follow-ups stay on the original's skill (the finding and the current skill agree); the scope rule still
  // refuses the fix written for the other skill
  assert.equal(statusAtFirstLesson(r, "added-both"), "established"); assert.equal(recordedOn, currentSkill(m, records), "investigation stays on the original's skill");
  assert.ok(taught(r, MISS).every((s) => !m.strategies.find((x) => x.id === s)!.addresses || m.strategies.find((x) => x.id === s)!.scope?.subSkill === recordedOn), `no other skill's fix: ${taught(r, MISS)}`);
  reloads(r, MISS);
});

test("positive: a fix whose mistake several skills share is taught when recorded on its own skill (added-both on □ + k; same-operation on x + a)", () => {
  for (const [start, competency, fam, form, bug, fix] of [["gen:acmissing:0,8,7", MISS, "acmissing", 0, "added-both", "fix_added_both"], ["gen:ahone:0,4,1", LINI, "ahone", 0, "same-operation", "fix_same_operation_add"]] as const) {
    const r = runScenario({ id: `scope-pos-${fix}`, category: 2, start, expect: {}, learner: () => scripted(on(fam, 0, form), (q) => misconception(q, new Set([bug]))) });
    assert.ok(taught(r, competency).includes(fix), `${fix}: ${taught(r, competency)}`);
    reloads(r, competency);
  }
});

test("positive: a skill-unique fix is still taught through its own recorded evidence (took-away-again on □ − k)", () => {
  const r = runScenario({ id: "scope-pos-unique", category: 2, start: "gen:acmissing:2,15,6", expect: {}, learner: () => scripted(on("acmissing", 0, 2), (q) => misconception(q, new Set(["took-away-again"]))) });
  assert.ok(taught(r, MISS).includes("fix_took_away_again"), `${taught(r, MISS)}`);
});

test("missing or ambiguous provenance: no current skill means no targeted scoped fix, and general scoped teaching stays available", () => {
  const m = moduleFor(MISS)!, empty = { attempts: [], teaching: [], unresolved: [], pending: [], sessions: {} } as never;
  assert.equal(currentSkill(m, empty), null);
  for (const st of m.strategies) assert.equal(scopeAllows(m, st, empty, null), !st.addresses, `${st.id}`);
  // a competency without a skill mapping is unchanged
  const plain = moduleFor("MATH.number.multiplication-tables")!;
  for (const st of plain.strategies) assert.equal(scopeAllows(plain, st, empty), true, st.id);
});
