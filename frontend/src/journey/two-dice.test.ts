/**
 * Two-dice probability: GENERAL teaching (product owner's decision 2026-11-04), reworded from TP-PRO-01 and connected in the generated
 * library, pending educator review. Outcomes agree with stored answers; the teaching makes no claim about why a learner answered as they
 * did; the real learner path (wrong answer → teaching → guided → fresh exact-total check alone → save/reload → same-skill delayed check
 * → recovery on the same skill) runs through the real grader, session and engine.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { exposureKey, pool, phasePool, problemOf } from "../../../packages/learning/src/families";
import { gradeRequest } from "../../../packages/learning/src/server-grader";
import { NEUTRAL_CLAIM, probeReading } from "../../../packages/learning/src/reasoning";
import { contentEligibility, isMisconceptionSpecific } from "../../../packages/learning/src/explanation-review";
import { unitCheck } from "../../../packages/learning/src/intervention";
import { skillUnits } from "../../../packages/learning/src/skill-units";
import { learnerState, make } from "../../../packages/learning/src/session";
import { withDecisions } from "../../../packages/learning/src/records";
import { candidateStrategies, pairsWithTotal } from "../../../content/learning/src/two-dice-candidate.mts";
import { COMPETENCY as C, problem, problemKey } from "./two-dice";
import { SliceSession } from "./session";

const PHASES = ["diagnostic", "practice", "check", "retention"] as const;
const totalItems = [...new Set(PHASES.flatMap((ph) => phasePool("akdice", ph)))].filter((q) => problem(q).params[2] === 0);
const frac = (a: number, b: number) => { const g = (x: number, y: number): number => (y ? g(y, x % y) : x); const d = g(a, b); return d === b ? String(a / d) : `${a / d}/${b / d}`; };

test("outcomes agree with the stored answers: every 'total is exactly k' item, counted pair by pair", () => {
  assert.ok(totalItems.length > 40, String(totalItems.length));
  for (const q of totalItems) {
    const p = problem(q), [m, n, , k] = p.params, count = pairsWithTotal(m, n, k).length;
    if (q.endsWith(":mc")) { const x = question(q); assert.equal(x.options![x.answer.charCodeAt(0) - 65], frac(count, m * n), q); }
    else assert.equal(p.answer, frac(count, m * n), q);
    // the stored (server) answer is graded correct; the totals-equally-likely answer is graded wrong
    assert.equal(gradeRequest({ id: q, response: q.endsWith(":mc") ? question(q).answer : frac(count, m * n) }).verdict, "correct", q);
    // (where the equally-likely-totals value happens to equal the true value, e.g. 5,6,0,9: 3/30 = 1/10, the error is not detectable)
    if (!q.endsWith(":mc") && count * (m + n - 1) !== m * n) assert.equal(gradeRequest({ id: q, response: `1/${m + n - 1}` }).verdict, "incorrect", q);
  }
});

test("two ordinary dice: 36 ordered pairs; total 7 has six, total 2 has one; the screens say exactly that and nothing about the learner", () => {
  assert.deepEqual(pairsWithTotal(6, 6, 7), [[1, 6], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1]]);
  assert.deepEqual(pairsWithTotal(6, 6, 2), [[1, 1]]);
  const [pairs, order] = candidateStrategies();
  const why = pairs.screens.find((s) => s.role === "concept")!;
  assert.ok(why.text[0].includes("6 × 6 = 36 ordered pairs"));
  assert.deepEqual(why.math, ["Total 2: (1, 1), 1 pair, so P = 1/36", "Total 7: (1, 6), (2, 5), (3, 4), (4, 3), (5, 2), (6, 1), 6 pairs, so P = 1/6", "6 pairs against 1: a total of 7 is 6 times as likely as a total of 2."]);
  const bugSays = [...new Set(pool("akdice").items.flatMap((p) => p.bugs.map((b) => b.says)))];
  for (const st of [pairs, order]) {
    assert.ok(!("addresses" in st), `${st.id}: general teaching, not a misconception fix`);
    for (const sc of st.screens) {
      assert.notEqual(sc.role, "misconception");
      if (sc.role === "strategy") assert.equal(sc.math.at(-1), `So the answer is ${problem(sc.instance).answer}`);
      const words = [sc.title, ...sc.text, ...sc.math].join(" ");
      assert.ok(!/went wrong|you (thought|took|counted)|were taken as|was taken|counted once/i.test(words), `${st.id}: no claim about the learner: ${words}`);
      assert.ok(!bugSays.some((x) => words.includes(x)));
      if (sc.widget) assert.equal((sc.widget as { rows: unknown[][] }).rows.length, problem(sc.instance).params[0]);
    }
  }
});

test("freshness@2: the problem key treats the mirror total and the :mc / :w forms as the same problem", () => {
  assert.equal(problemKey("gen:akdice:6,6,0,8"), problemKey("gen:akdice:6,6,0,6"));
  assert.equal(problemKey("gen:akdice:4,5,0,4"), problemKey("gen:akdice:4,5,0,7"), "4,5,0,4 is the diagnostic 4,5,0,7 relabelled (4e655e73)");
  assert.equal(problemKey("gen:akdice:4,5,0,5:mc"), problemKey("gen:akdice:4,5,0,5"));
  assert.notEqual(problemKey("gen:akdice:4,5,0,5"), problemKey("gen:akdice:4,5,0,7"));
  for (const st of candidateStrategies()) for (const id of [st.guided, ...st.screens.map((s) => s.instance)]) assert.notEqual(problemKey(st.check), problemKey(id), `${st.id}: ${st.check} vs ${id}`);
  assert.equal(candidateStrategies()[0].check, "gen:akdice:4,5,0,5", "the corrected recheck of 4e655e73");
});

test("connected: the loaded module has the two general dice explanations, scoped to 'total is exactly k', pending educator review", () => {
  const m = moduleFor(C)!;
  const dice = m.strategies.filter((s) => s.id.startsWith("akdice_"));
  assert.deepEqual(dice.map((s) => s.id), ["akdice_pairs", "akdice_order"]);
  for (const s of dice) {
    assert.equal(isMisconceptionSpecific(s), false);
    assert.deepEqual(s.scope, { family: "akdice", parameters: [{ index: 2, values: [0] }] });
    const r = contentEligibility(m, s, { competency: C, usage: "intervention", misconceptionEvidence: [], mode: "demonstration" });
    assert.equal(r.eligible, true); assert.equal(r.status, "pending_review"); assert.equal(r.educatorApproved, false);
    assert.equal(contentEligibility(m, s, { competency: C, usage: "intervention", misconceptionEvidence: [], mode: "supervised-evaluation" }).eligible, false, "never in supervised evaluation until approved");
  }
  assert.equal(skillUnits(m).length, 1, "one dice skill unit");
});

const T = "totals-equally-likely";
const wrongReply = (q: string) => (q.endsWith(":mc") ? ["A", "B", "C", "D"].find((x) => x !== String(question(q).answer))! : probeReading(q.replace(/:(mc|w)$/, ""), T).predicted[0] ?? "1/2");
const exact = (q: string | null | undefined) => !!q && problem(q).family === "akdice" && problem(q).params[2] === 0;

test("real path: wrong exact-total answers → general dice teaching (neutral) → fresh exact-total check alone → save/reload → same-skill delayed check → recovery", () => {
  const at = Date.parse("2026-01-01T00:00:00Z"), s = new SliceSession("two-dice-general", C, at);
  s.events.push(make.pathway({ learnerId: s.learnerId, sessionId: s.session, at: new Date(at - 1000).toISOString() }, C));
  const first = phasePool("akdice", "diagnostic").map((x) => x.replace(/:mc$/, "")).find((x) => exact(x) && probeReading(x, T).discriminates)!;
  assert.equal(s.submit(first, wrongReply(first), "check").credit, false);
  const presented = [first];
  // one wrong answer is not proof: OpenPath asks another question first
  let n = s.next(C);
  assert.equal(n.strategy ?? null, null); assert.ok(n.question && n.question !== first, n.phase);
  presented.push(n.question!); s.submit(n.question!, exact(n.question) ? wrongReply(n.question!) : question(n.question!).answer, n.phase === "explore" ? "diagnostic" : "practice", { context: n.context });
  for (let i = 0; i < 4 && n.phase !== "chapter"; i++) {
    n = s.next(C);
    if (n.phase === "chapter") break;
    presented.push(n.question!); s.submit(n.question!, exact(n.question) ? wrongReply(n.question!) : question(n.question!).answer, n.phase === "explore" ? "diagnostic" : "practice", { context: n.context });
  }
  assert.equal(n.phase, "chapter", n.reason);
  assert.ok(n.strategy!.id.startsWith("akdice_"), `the dice teaching: ${n.strategy!.id}`);
  assert.ok(!n.reason.includes("equally likely") || n.reason.startsWith(NEUTRAL_CLAIM), `no claim about the learner: ${n.reason}`);
  assert.equal(n.contentReview?.status, "pending_review"); assert.equal(n.contentReview?.educatorApproved, false);
  assert.ok(!["independent", "transfer", "verified"].includes(s.state().evidence(C).status), "not shown while the dice answers are wrong");
  presented.push(...n.strategy!.screens.flatMap((sc) => (sc.instance ? [sc.instance] : [])));
  s.taught(n);
  n = s.next(C); assert.equal(n.phase, "guided"); assert.ok(exact(n.question)); presented.push(n.question!);
  s.submit(n.question!, question(n.question!).answer, "guided");
  n = s.next(C);
  assert.equal(n.phase, "check", n.reason);
  assert.ok(exact(n.question), `fresh exact-total question: ${n.question}`);
  assert.ok(!presented.some((x) => problemKey(x) === problemKey(n.question!)), `${n.question} is not a problem already met, relabelled or not`);
  // save and reload at the check: the same question comes back
  const saved = JSON.parse(JSON.stringify(withDecisions(s.events, s.decisions)));
  assert.deepEqual(learnerState(s.learnerId, saved, s.now, { currentSession: s.session }).module(C), s.state().module(C));
  const r = SliceSession.fromEvents(s.learnerId, C, s.events, s.now, s.session); Object.assign(r.decisions, s.decisions);
  assert.equal(r.next(C).question, n.question);
  assert.equal(s.submit(n.question!, question(n.question!).answer, "check").credit, true, "answered alone, right");
  // carry on right (other skills of the chapter stay open) until a delayed check is planned
  for (let i = 0; i < 40; i++) { n = s.next(C); if (!n.question) break; s.submit(n.question, question(n.question).answer, (["guided", "check", "practice", "transfer"].includes(n.phase) ? n.phase : "practice") as never); presented.push(n.question); }
  assert.equal(s.state().evidence(C).retention, "scheduled", s.state().module(C).reason);
  s.wait(8); n = s.next(C);
  assert.equal(n.phase, "retention");
  assert.ok(exact(n.question), `the delayed check samples the taught dice skill: ${n.question}`);
  assert.ok(!presented.some((x) => problemKey(x) === problemKey(n.question!)), "fresh");
  assert.equal(s.submit(n.question!, wrongReply(n.question!), "retention").credit, false);
  const rc = s.recover(n.question!);
  assert.equal(rc.phase, "teach"); assert.equal(rc.active, C, "recovery on the dice skill");
  n = s.next(C, { inRecovery: true });
  assert.ok(exact(n.question), `recovery question on the dice skill: ${n.question} (${n.reason})`);
  assert.equal(s.state().evidence(C).retention, "failed");
});

test("no fresh exact-total question left: no recheck is invented and the skill is not counted as shown", () => {
  const m = moduleFor(C)!, unit = skillUnits(m)[0], st = m.strategies.find((x) => x.id === "akdice_pairs")!;
  const s = new SliceSession("two-dice-none", C, Date.parse("2026-01-01T00:00:00Z"));
  const all = [...new Set(["diagnostic", "practice", "check", "retention"].flatMap((ph) => phasePool("akdice", ph as never)))].filter(exact);
  for (const q of all) s.submit(q, wrongReply(q), "practice");
  assert.equal(unitCheck(m, unit, s.state().records, st), null, "nothing left to ask on this skill");
  assert.ok(!["independent", "transfer", "verified"].includes(s.state().evidence(C).status));
});
