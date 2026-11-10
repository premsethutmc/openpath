/**
 * deep-select@1 (2026-11-10, combined candidate): deep recovery (research, off by default) chooses only questions the learner can be
 * asked: not quarantined, answerable with their input, within their grade, fresh, and, after teaching of the skill, covered by the
 * method that lesson taught (method-alignment@1). Probes on a skill not yet taught are diagnostics and need no taught method. With
 * no suitable question it stops and says why. Saved answers are read by the same rule after a reload: an answer to a question that
 * would not be chosen (here: a method the lesson did not teach) stays in the records but does not count toward "solved after help".
 * Synthetic learners only: this tests behaviour, not learning.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { boardFor } from "../../../packages/learning/src/curricula";
import { deepRecovery } from "../../../packages/learning/src/deep-recovery";
import { withinGrade } from "../../../packages/learning/src/intervention";
import { methodCompatibility, methodRequirements } from "../../../packages/learning/src/method-alignment";
import { selectable } from "../../../packages/learning/src/question-status";
import { make } from "../../../packages/learning/src/session";
import { keyboardOffered } from "../../../packages/learning/src/written";
import { deepScreen } from "../learning/deep-recovery-app";
import { Driver } from "../learning/driver";

const T0 = Date.parse("2026-11-06T09:00:00Z");
const learnerAt = (grade: number, id: string) => {
  const d = new Driver(`deep-select-${id}`, T0);
  d.enrol(grade, "2026-27", (boardFor("cbse", grade) ?? boardFor("cbse", 8))!);
  return d;
};
/** wrong on everything: walk the recovery's questions, return what was asked */
function walk(d: Driver, original: string, steps = 8) {
  d.answer(original, "0", "original");
  const asked: { qid: string; phase: string; ok: boolean }[] = [];
  let end = "";
  for (let i = 0; i < steps; i++) {
    const s = d.state();
    const r = deepRecovery(original, s.records, s.evidence, d.now, d.session);
    if (!r.question) { end = r.phase; break; }
    asked.push({ qid: r.question, phase: r.phase, ok: selectable(r.question) && keyboardOffered(r.question) && withinGrade(s.records, r.question) });
    d.answer(r.question, "0", r.phase === "probe" ? "diagnostic" : "original", { context: r.context ?? undefined });
  }
  return { asked, end };
}

test("within the learner's grade: a Grade 7 inequality and a Grade 5 unit rate get no later-grade question; the Grade 7 diagnostic probes below remain", () => {
  for (const [grade, original] of [[7, "gen:aeineqz:0,4,-8,8,1"], [5, "gen:ajrate:43,6,3"]] as const) {
    const own = question(original).competency;
    const { asked } = walk(learnerAt(grade, original), original);
    assert.ok(asked.length > 0, `${original}: something asked`);
    assert.deepEqual(asked.filter((a) => !a.ok).map((a) => a.qid), [], `${original}: every question selectable, answerable and within Grade ${grade}`);
    if (grade === 7) assert.ok(asked.some((a) => a.phase === "probe" && question(a.qid).competency !== own), `${original}: legitimate diagnostic probes on what it builds on are still asked`);
  }
});

test("after a lesson, a question on the taught skill is one that lesson's sections work through (fraction of a quantity)", () => {
  const C = "MATH.number.fraction-multiply", original = "gen:avfwq:5,9,9,1";
  const m = moduleFor(C)!, st = m.strategies.find((s) => s.id === "worked_steps")!;
  const d = learnerAt(6, "fmul");
  d.events.push(make.teach(d.ctx(), C, st.id, "test"));
  d.answer(original, "0", "original");
  const s = d.state();
  const r = deepRecovery(original, s.records, s.evidence, d.now, d.session);
  assert.equal(r.phase, "slip-check");
  assert.equal(methodCompatibility(m, st, r.question!).status, "covered", `${r.question}: ${methodRequirements(r.question!)}`);
});

test("no suitable question: it stops and says why (a lesson whose explanation changed since), never substituting another", () => {
  const C = "MATH.geometry.pythagoras", original = "gen:ahpyth:24,70,1";
  const d = learnerAt(8, "stale");
  const lesson = make.teach(d.ctx(), C, "worked_steps", "test");
  (lesson as { methodAlignment?: string }).methodAlignment = "method-alignment@1:an-earlier-version";
  d.events.push(lesson);
  d.answer(original, "0", "original");
  const s = d.state();
  const r = deepRecovery(original, s.records, s.evidence, d.now, d.session);
  assert.equal(r.phase, "escalate");
  assert.equal(r.question, null);
  assert.match(r.reason, /need a method the explanation you were given has not taught yet/);
});

/** Pythagoras, Grade 8: taught "Step by step", a shorter-side problem wrong, one diagnostic probe, the episode's lesson, then two
 *  fresh unaided right answers as returns. `stale`: the episode's lesson was saved for an earlier version of the explanation (its
 *  content hash differs), so what it taught cannot be confirmed now */
function episode(stale: boolean) {
  const C = "MATH.geometry.pythagoras", original = "gen:ahpyth:24,70,1";
  const d = learnerAt(8, `pyth-${stale}`);
  d.events.push(make.teach(d.ctx(), C, "worked_steps", "test"));
  d.answer(original, "0", "original");
  const at0 = d.state().records.attempts.find((a) => a.questionId === original)!.at;
  const tag = `deep:${original}|${C}`;
  d.answer("gen:root:16", "4", "diagnostic", { context: `${tag}@MATH.number.square-roots` });
  const lesson = make.teach(d.ctx(), C, "worked_steps", "deep", { episode: `deep:${original}#${at0}` });
  if (stale) (lesson as { methodAlignment?: string }).methodAlignment = "method-alignment@1:an-earlier-version";
  d.events.push(lesson);
  for (const q of ["gen:ahpyth:16,63,1", "gen:ahpyth:11,60,1"]) d.answer(q, question(q).answer, "original", { context: `${tag}@${C}` });
  const s = d.state();
  return { s, screen: deepScreen(original, s.records, s.evidence, d.now) };
}

test("saved answers after a reload: answers after a lesson whose taught methods cannot be confirmed do not count toward solved after help; they stay in the records", () => {
  const ok = episode(false);
  assert.ok(ok.screen.kind === "end" && ok.screen.phase === "solved_after_help", "two answers on taught methods: solved after help");
  const bad = episode(true);
  assert.ok(!(bad.screen.kind === "end" && bad.screen.phase === "solved_after_help"), "not counted");
  assert.equal(bad.screen.kind === "end" && bad.screen.phase, "escalate", "and no further question is asked on an unconfirmed method");
  assert.ok(bad.s.records.attempts.some((a) => a.questionId === "gen:ahpyth:11,60,1" && a.response === question("gen:ahpyth:11,60,1").answer), "history kept");
  const own = (x: typeof ok) => x.screen.state.readings.find((r) => r.skill === "MATH.geometry.pythagoras")!;
  assert.equal(own(ok).right, 2);
  assert.equal(own(bad).right, 0, "neither answer after that lesson is read as evidence");
});

test("diagnostics are not post-teaching evidence: with no lesson on the skill, any fresh same-skill answer is read (a slip, not help)", () => {
  const C = "MATH.geometry.pythagoras", original = "gen:ahpyth:24,70,1", other = "gen:ahpyth:21,28,0";
  const d = learnerAt(8, "pyth-diag");
  d.answer(original, "0", "original");
  d.answer(other, question(other).answer, "original", { context: `deep:${original}|${C}@${C}` });
  const s = d.state();
  const r = deepRecovery(original, s.records, s.evidence, d.now, d.session);
  assert.equal(r.phase, "solved");
  assert.equal(r.diagnosis, "slip");
});
