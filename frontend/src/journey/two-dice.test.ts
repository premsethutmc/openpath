/**
 * Two-dice probability (TP-PRO-01 candidate, pending educator review): outcomes agree with stored answers, the recheck is fresh
 * (freshness@2: not the same or a relabelled problem), and the real learner path (wrong answer → investigation → explanation →
 * fresh same-skill check → saved replay) works through the real grader, session and engine. The candidate is installed only
 * inside these tests (see two-dice.ts and docs/two-dice-probability): the library builder does not yet accept it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { exposureKey, phasePool, problemOf } from "../../../packages/learning/src/families";
import { gradeRequest } from "../../../packages/learning/src/server-grader";
import { probeReading } from "../../../packages/learning/src/reasoning";
import { hypotheses } from "../../../packages/learning/src/hypotheses";
import { contentEligibility } from "../../../packages/learning/src/explanation-review";
import { learnerState, make } from "../../../packages/learning/src/session";
import { withDecisions } from "../../../packages/learning/src/records";
import { candidateStrategies, pairsWithTotal, unorderedWithTotal } from "../../../content/learning/src/two-dice-candidate.mts";
import { composeTwoDice, COMPETENCY as C, installForTest, problem, problemKey } from "./two-dice";
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

test("two ordinary dice: total 7 has six ordered pairs, total 2 has one; the screens say exactly that", () => {
  assert.deepEqual(pairsWithTotal(6, 6, 7), [[1, 6], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1]]);
  assert.deepEqual(pairsWithTotal(6, 6, 2), [[1, 1]]);
  assert.equal(problemOf("gen:akdice:6,6,0,7")!.answer, "1/6"); assert.equal(problemOf("gen:akdice:6,6,0,2")!.answer, "1/36");
  const [totals, order] = candidateStrategies();
  const why = totals.screens.find((s) => s.role === "concept")!;
  assert.deepEqual(why.math, ["Total 2: (1, 1), 1 pair, so P = 1/36", "Total 7: (1, 6), (2, 5), (3, 4), (4, 3), (5, 2), (6, 1), 6 pairs, so P = 1/6", "6 pairs against 1: a total of 7 is 6 times as likely as a total of 2."]);
  // every screen's final line is the stored answer of its own instance; the "not X" value is the modelled wrong answer of that instance
  for (const st of [totals, order]) for (const sc of st.screens) {
    const p = problem(sc.instance), bug = p.bugs.find((b) => b.id === st.addresses)!;
    if (sc.role === "strategy") assert.equal(sc.math.at(-1), `So the answer is ${p.answer}`);
    if (sc.role === "misconception") {
      const line = sc.math.find((l) => l.startsWith("Not "))!, [x, y] = line.slice(4, line.indexOf(",")).split("/").map(Number);
      assert.ok(Math.abs(x / y - (bug.predict as number)) < 1e-12, `${line} vs the modelled wrong value ${bug.predict}`); assert.ok(line.endsWith(`but ${p.answer}`));
    }
  }
  const [m, n, , k] = problem(order.screens[0].instance).params;
  assert.ok(order.screens[0].math.includes(`Counted once: ${unorderedWithTotal(m, n, k).map(([a, b]) => `(${a}, ${b})`).join(", ")}, ${unorderedWithTotal(m, n, k).length} pairs`));
  for (const st of [totals, order]) for (const sc of st.screens) if (sc.widget) assert.deepEqual((sc.widget as { rows: unknown[][] }).rows.length, problem(sc.instance).params[0]);
});

test("freshness@2: the problem key treats the mirror total and the :mc / :w forms as the same problem", () => {
  assert.equal(problemKey("gen:akdice:6,6,0,8"), problemKey("gen:akdice:6,6,0,6"));
  assert.equal(problemKey("gen:akdice:4,5,0,4"), problemKey("gen:akdice:4,5,0,7"), "4,5,0,4 is the diagnostic 4,5,0,7 relabelled (4e655e73)");
  assert.equal(problemKey("gen:akdice:4,5,0,5:mc"), problemKey("gen:akdice:4,5,0,5"));
  assert.notEqual(problemKey("gen:akdice:4,5,0,5"), problemKey("gen:akdice:4,5,0,7"));
  for (const st of candidateStrategies()) for (const id of [st.guided, ...st.screens.map((s) => s.instance)]) assert.notEqual(problemKey(st.check), problemKey(id), `${st.id}: ${st.check} vs ${id}`);
  assert.equal(candidateStrategies()[0].check, "gen:akdice:4,5,0,5", "the corrected recheck of 4e655e73");
});

test("composition is append-only and refuses a reused, relabelled or out-of-partition recheck", () => {
  const base = moduleFor(C)!, m = composeTwoDice(phasePool, base);
  assert.deepEqual({ ...m, strategies: m.strategies.slice(0, base.strategies.length) }, base);
  assert.deepEqual(m.strategies.slice(base.strategies.length).map((s) => s.id), ["akdice_fix_totals", "akdice_fix_order"]);
  const mod = (f: (s: ReturnType<typeof candidateStrategies>) => void) => { const s = candidateStrategies(); f(s); return s; };
  assert.throws(() => composeTwoDice(phasePool, base, mod((s) => { s[0].id = base.strategies[0].id; })), /duplicate strategy/);
  assert.throws(() => composeTwoDice(phasePool, base, mod((s) => { s[0].screens[0].instance = base.retention.find((q) => q.includes("akdice"))!; })), /reserved exposure/);
  assert.throws(() => composeTwoDice(phasePool, base, mod((s) => { s[1].check = s[0].check; })), /unavailable, reused/);
  assert.throws(() => composeTwoDice(phasePool, base, mod((s) => { s[0].check = "gen:akdice:6,6,0,6"; })), /outside partition/);
  // a check-partition item that is the shown example relabelled (mirror total) is refused even though its exposure key is new
  // (gen:akdice:5,5,0,3 is in the check partition and is the order explanation's guided 5,5,0,9:mc relabelled: 5 + 5 + 2 − 9 = 3)
  assert.equal(problemKey("gen:akdice:5,5,0,3"), problemKey("gen:akdice:5,5,0,9:mc"));
  assert.ok(phasePool("akdice", "check").includes("gen:akdice:5,5,0,3"));
  assert.throws(() => composeTwoDice(phasePool, base, mod((s) => { s[1].check = "gen:akdice:5,5,0,3"; })), /freshness@2/);
  const loaded = moduleFor(C)!;
  assert.ok(!loaded.strategies.some((s) => s.id.startsWith("akdice_")), "not connected in the loaded library: needs the library.ts scope change and regeneration");
});

for (const [target, id] of [["totals-equally-likely", "akdice_fix_totals"], ["order-ignored", "akdice_fix_order"]] as const) test(`real path (${target}): one wrong answer is not proof; two give the explanation, a fresh check, and a saved replay`, () => {
  const { restore } = installForTest(phasePool);
  try {
    const at = Date.parse("2026-01-01T00:00:00Z"), s = new SliceSession(`two-dice-${target}`, C, at);
    s.events.push(make.pathway({ learnerId: s.learnerId, sessionId: s.session, at: new Date(at - 1000).toISOString() }, C));
    const presented: string[] = [];
    const wrong = (q: string, activity: "check" | "diagnostic", context?: string) => { presented.push(q); s.submit(q, probeReading(q.replace(/:(mc|w)$/, ""), target).predicted[0], activity, context ? { context } : {}); };
    const first = phasePool("akdice", "diagnostic").map((x) => x.replace(/:mc$/, "")).find((x) => problem(x).params[2] === 0 && probeReading(x, target).discriminates)!;
    wrong(first, "check");
    // one matching wrong answer: suspected only; OpenPath investigates with another question instead of teaching
    let n = s.next(C);
    assert.deepEqual(hypotheses(s.state().selectionRecords).filter((h) => h.status === "established"), []);
    assert.equal(n.strategy ?? null, null); assert.ok(n.question && n.question !== first, JSON.stringify(n.phase));
    const second = probeReading(n.question!.replace(/:(mc|w)$/, ""), target).discriminates ? n.question! : phasePool("akdice", "diagnostic").map((x) => x.replace(/:mc$/, "")).find((x) => x !== first && problem(x).params[2] === 0 && probeReading(x, target).discriminates)!;
    wrong(second, "diagnostic", n.context);
    assert.equal(hypotheses(s.state().selectionRecords).find((h) => h.claim?.explanation === target)?.status, "established");
    n = s.next(C);
    assert.equal(n.phase, "chapter"); assert.equal(n.strategy?.id, id);
    const review = contentEligibility(moduleFor(C), n.strategy, { competency: C, usage: "intervention", misconceptionEvidence: [target], mode: "demonstration" });
    assert.equal(review.eligible, true); assert.equal(review.status, "pending_review"); assert.equal(review.educatorApproved, false);
    assert.equal(contentEligibility(moduleFor(C), n.strategy, { competency: C, usage: "intervention", misconceptionEvidence: [target], mode: "supervised-evaluation" }).eligible, false);
    presented.push(...n.strategy!.screens.flatMap((sc) => (sc.instance ? [sc.instance] : [])));
    s.taught(n);
    // guided, then the same-skill check
    let check: string | null = null;
    for (let i = 0; i < 3 && !check; i++) {
      n = s.next(C);
      assert.ok(n.phase === "guided" || n.phase === "check", n.phase);
      const q = n.question!, p = problem(q);
      assert.equal(p.family, "akdice"); assert.equal(p.params[2], 0, "inside the taught scope: the total is exactly k");
      if (n.phase === "check") {
        check = q;
        assert.ok(!presented.some((x) => exposureKey(x) === exposureKey(q)), `${q} was already presented`);
        assert.ok(!presented.some((x) => problemKey(x) === problemKey(q)), `${q} is a relabelled problem already presented: ${presented.join(" ")}`);
        assert.ok(probeReading(q.replace(/:(mc|w)$/, ""), target).discriminates, "the target error is still possible on the check");
      }
      presented.push(q);
      s.submit(q, question(q).answer, n.phase as "guided" | "check");
    }
    assert.ok(check, "a check was asked");
    assert.equal(hypotheses(s.state().selectionRecords).find((h) => h.claim?.explanation === target)?.status, "resolved");
    // save and reload: the stored events (with server decisions) give the same state, and a restarted session continues identically
    const saved = JSON.parse(JSON.stringify(withDecisions(s.events, s.decisions)));
    assert.deepEqual(learnerState(s.learnerId, saved, s.now, { currentSession: s.session }).module(C), s.state().module(C));
    const r = SliceSession.fromEvents(s.learnerId, C, s.events, s.now, s.session); Object.assign(r.decisions, s.decisions);
    assert.deepEqual(r.state().module(C), s.state().module(C));
  } finally { restore(); }
});

test("GAP (pinned): the delayed check does not sample the taught dice skill, and its recovery does not return to it", () => {
  const { restore } = installForTest(phasePool);
  try {
    const at = Date.parse("2026-01-01T00:00:00Z"), s = new SliceSession("two-dice-delayed", C, at), T = "totals-equally-likely";
    s.events.push(make.pathway({ learnerId: s.learnerId, sessionId: s.session, at: new Date(at - 1000).toISOString() }, C));
    s.submit("gen:akdice:4,5,0,7", probeReading("gen:akdice:4,5,0,7", T).predicted[0], "check");
    let n = s.next(C); s.submit(n.question!, probeReading(n.question!.replace(/:(mc|w)$/, ""), T).predicted[0], "diagnostic", { context: n.context });
    n = s.next(C); s.taught(n);
    for (let i = 0; i < 40; i++) { n = s.next(C); if (!n.question) break; s.submit(n.question, question(n.question).answer, (["guided", "check", "practice", "transfer"].includes(n.phase) ? n.phase : "practice") as never); }
    assert.equal(s.state().evidence(C).retention, "scheduled");
    s.wait(8); n = s.next(C);
    assert.equal(n.phase, "retention");
    const p = problem(n.question!);
    assert.ok(!(p.family === "akdice" && p.params[2] === 0), `delayed check ${n.question} would sample the taught skill: update this gap`);
    const dice = moduleFor(C)!.retention.filter((q) => problem(q).family === "akdice");
    assert.ok(dice.every((q) => problem(q).params[2] !== 0), "the module's only dice delayed item asks 'k or more', outside the taught scope");
    s.submit(n.question!, "1/2", "retention");
    const rc = s.recover(n.question!);
    assert.ok(!(rc.question && problem(rc.question)?.family === "akdice"), "recovery does not return to the dice skill");
  } finally { restore(); }
});

test("GAP (pinned, shared engine): when the explanation's own check was already met, the recheck leaves the scope or repeats a relabelled problem", () => {
  // reproducer: docs/two-dice-probability/README.md "Recheck selection". The learner met 6,6,0,3 (the order explanation's check) earlier.
  const { restore } = installForTest(phasePool);
  try {
    const T = "order-ignored", at = Date.parse("2026-01-01T00:00:00Z"), s = new SliceSession("two-dice-recheck-gap", C, at);
    s.events.push(make.pathway({ learnerId: s.learnerId, sessionId: s.session, at: new Date(at - 1000).toISOString() }, C));
    s.submit("gen:akdice:6,6,0,3", question("gen:akdice:6,6,0,3").answer, "practice");
    s.submit("gen:akdice:5,5,0,4", probeReading("gen:akdice:5,5,0,4", T).predicted[0], "check");
    let n = s.next(C);
    s.submit("gen:akdice:6,6,1,7", probeReading("gen:akdice:6,6,1,7", T).predicted[0], "diagnostic", { context: n.context });
    n = s.next(C); assert.equal(n.strategy?.id, "akdice_fix_order"); s.taught(n);
    n = s.next(C); assert.equal(n.question, "gen:akdice:5,5,0,9:mc"); s.submit(n.question!, question(n.question!).answer, "guided");
    // learnerState().module offers 5,5,0,3: the guided problem relabelled (the same pairs counted), so not a fresh check
    const viaState = s.state().module(C);
    assert.equal(viaState.question, "gen:akdice:5,5,0,3"); assert.equal(problemKey(viaState.question!), problemKey("gen:akdice:5,5,0,9:mc"));
    // the app's call (moduleState with the learner's evidence) offers a counting-stages question: outside the declared dice scope, so it
    // cannot resolve the misconception, and the relabelled problem follows
    n = s.next(C);
    assert.equal(n.phase, "check"); assert.equal(problem(n.question!).family, "akss");
    s.submit(n.question!, question(n.question!).answer, "check");
    assert.equal(hypotheses(s.state().selectionRecords).find((h) => h.claim?.explanation === T)?.status, "established");
    assert.equal(s.next(C).question, "gen:akdice:5,5,0,3");
  } finally { restore(); }
});
