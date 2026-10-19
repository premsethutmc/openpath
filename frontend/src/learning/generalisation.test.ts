/**
 * Beyond the scripted journeys: graph corrections, unseen mistakes, unsupported problems, several valid methods,
 * persistent plans, the seven-day boundary, curriculum variation and goal progression (acceptance G–N), through
 * the same engine and the same stored records. Synthetic learners only; these test what the program does, not
 * learning gains. Randomised tests use a fixed seed so every run checks the same cases.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { isCorrect, question } from "../../../packages/learning/src/content";
import { sampleFor, releasesFor } from "../../../packages/learning/src/curricula";
import { assigned, synthesise } from "../../../packages/learning/src/curriculum";
import { DAY, evidenceFor, useReviewFixture } from "../../../packages/learning/src/evidence";
import { extract, extractPlain } from "../../../packages/learning/src/extract";
import { decompose, FAMILIES, parseProblem, problemOf, variantsOf, type Problem } from "../../../packages/learning/src/families";
import { attemptRule, examPlan, horizon, overlay, readiness } from "../../../packages/learning/src/goals";
import { graph, relations, walkSupports } from "../../../packages/learning/src/graph";
import { familyOf, investigateContext, moduleState, recovery } from "../../../packages/learning/src/intervention";
import { interpret } from "../../../packages/learning/src/meaning";
import { readRecords } from "../../../packages/learning/src/records";
import { nextFromReasoning, reason } from "../../../packages/learning/src/reasoning";
import { checkWorking } from "../../../packages/learning/src/working";
import audit from "../../../content/learning/graph-audit.v1.json";
import { Driver, right } from "./driver";

const T0 = Date.parse("2026-09-01T09:00:00Z");
const EQ = "MATH.number.equivalent-fractions";
const fixture = (on: boolean) => useReviewFixture(on ? { items: ["eq", "fm", "fc", "fa", "mt", "ra", "ca", "di", "fx", "qd"].flatMap((p) => Object.keys(Q).filter((id) => id.startsWith(`${p}-`))), releasedAt: "2020-01-01T00:00:00Z" } : null);
const Q = Object.fromEntries(JSON.parse(readFileSync(new URL("../../../content/learning/modules.v1.json", import.meta.url), "utf8")).questions.map((q: { id: string }) => [q.id, q]));
/** A small seeded random generator (mulberry32): the same cases every run. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const asText = (pr: Problem, v: number | number[]) => (Array.isArray(v) ? v.join(",") : Number.isInteger(v) ? String(v) : `${Math.round(v * 16)}/16`);

// ---------------------------------------------------------------- A: one consistent set of relations

test("relations: one per pair, supports never repeat a mandatory edge, disputed edges are not followed", () => {
  const rel = relations();
  for (const [target, list] of rel) {
    assert.equal(new Set(list.map((r) => r.from)).size, list.length, `${target}: one relation per pair`);
    for (const r of list) assert.ok(graph.byId.has(r.from) && graph.byId.has(target));
  }
  for (const e of audit.edges) {
    assert.ok(graph.prerequisitesOf(e.target).includes(e.source), `the audit reviews an existing 1.1.0 edge: ${e.target} < ${e.source}`);
    const r = graph.relationsOf(e.target).find((x) => x.from === e.source)!;
    assert.equal(r.type, e.classification);
    if (e.classification === "disputed" || e.classification === "trivial") assert.ok(!graph.supportsOf(e.target).includes(e.source), "not followed in recovery");
  }
  // the area-integrals support list no longer restates its mandatory prerequisite
  assert.equal(graph.relationsOf("MATH.calculus.area-integrals").filter((r) => r.from === "MATH.calculus.definite-integrals").map((r) => r.type).join(), "mandatory");
  for (const c of graph.competencies) assert.ok(walkSupports(c.id, 60).every((s) => s.id !== c.id), "no cycle back to the start");
});

test("A: correcting a relationship changes what recovery recommends, never the recorded evidence", () => {
  fixture(true);
  const d = new Driver("synthetic-graph", T0);
  d.enrol(4, "2026-27", sampleFor(4)!);
  d.work("MATH.number.fraction-models", right);
  d.answer("eq-d1", "2", "diagnostic");
  const records = readRecords(d.learnerId, d.events);
  // recommendations: 1.0.0 imposed division with remainders on fraction models; 1.1.0 does not
  assert.ok(walkSupports("MATH.number.fraction-models", 2, { version: "1.0.0", audit: false }).some((s) => s.id === "MATH.number.division-remainders"));
  assert.ok(!walkSupports("MATH.number.fraction-models", 2).some((s) => s.id === "MATH.number.division-remainders"));
  // the audit (a proposal) changes recovery for quadratics only: linear systems is not followed
  assert.ok(walkSupports("MATH.algebra.quadratics", 1, { audit: false }).some((s) => s.id === "MATH.algebra.linear-systems"));
  assert.ok(!walkSupports("MATH.algebra.quadratics", 1).some((s) => s.id === "MATH.algebra.linear-systems"));
  // evidence: identical under both graph versions, for every competency touched
  const now = d.now;
  const a = evidenceFor(d.learnerId, records, now, "1.0.0");
  const b = evidenceFor(d.learnerId, records, now, "1.1.0");
  for (const id of ["MATH.number.fraction-models", EQ]) assert.deepEqual(a.get(id), b.get(id), id);
  assert.deepEqual(a.ledger.events.map((e) => e.id), b.ledger.events.map((e) => e.id));
  fixture(false);
});

// ---------------------------------------------------------------- H: no artificial prerequisite

test("H: a learner who shows a higher skill is not sent back to a missing lower one", () => {
  fixture(false);
  const d = new Driver("synthetic-false-prereq", T0);
  d.enrol(10, "2026-27", sampleFor(10)!);
  const steps = d.work("MATH.algebra.quadratics", right);
  assert.ok(steps.every((s) => s.competency === "MATH.algebra.quadratics"), "the module never moves to another skill");
  const st = d.state();
  assert.ok(["independent", "transfer"].includes(st.evidence("MATH.algebra.quadratics").status));
  // nothing it supposedly needs was ever shown, and nothing makes the learner do it first
  for (const p of [...graph.prerequisitesOf("MATH.algebra.quadratics", "1.0.0"), ...graph.supportsOf("MATH.algebra.quadratics")]) assert.equal(st.evidence(p).status, "not_started", p);
  assert.notEqual(st.next?.competency, "MATH.algebra.linear-systems");
  assert.ok(st.next?.competency === null || assigned(sampleFor(10)!).some((a) => a.competency === st.next!.competency), "the plan stays in the year's curriculum");
  // the module is open with no prerequisite evidence at all: its first step is its own diagnostic
  const fresh = new Driver("synthetic-open", T0);
  fresh.enrol(4, "2026-27", sampleFor(4)!);
  const fs = fresh.state();
  assert.equal(moduleState("MATH.number.fraction-add-like", fs.records, fs.evidence("MATH.number.fraction-add-like"), T0, "s").phase, "explore");
});

// ---------------------------------------------------------------- G and B: unseen mistakes and general diagnosis

test("G: an unseen mistake on a problem the learner types in is investigated and leads to a defensible next step", () => {
  fixture(false);
  const typed = parseProblem("∫ from 2 to 9 of 6 dx");
  assert.ok(typed.supported);
  const qid = typed.problem.id;
  const d = new Driver("synthetic-unseen", T0);
  d.enrol(12, "2026-27", sampleFor(11)!);
  // the learner takes the width as the upper limit: 6 × 9 = 54 here, 4 × 5 = 20 on ∫ from 3 to 5 of 4 dx …
  const ignoreLower = (id: string) => {
    const p = problemOf(id);
    if (p && p.family === "cint") return String(p.params[2] * p.params[1]);
    return question(id).answer;
  };
  const phases = d.recover(qid, (id, ph) => (id === qid && ph === "return" ? "42" : ignoreLower(id)));
  assert.equal(phases[0], "attempt");
  assert.ok(phases.includes("investigate"), "the wrong answer is investigated first");
  const follow = d.state().records.attempts.filter((a) => a.context === investigateContext(qid));
  const r = reason(qid, [{ questionId: qid, response: "54" }, ...follow.map((a) => ({ questionId: a.questionId, response: a.response }))])!;
  assert.equal(r.best?.id, "ignore-lower-limit");
  assert.ok(follow.length >= 1 && follow.length <= 3, "one to three follow-up questions");
  assert.ok(follow.every((a) => problemOf(a.questionId)!.params[0] !== 0), "every follow-up has a non-zero lower limit (it can tell the explanations apart)");
  assert.equal(nextFromReasoning(r, typed.problem.competency).kind, "teach");
  assert.ok(phases.some((p) => p === "teach:MATH.calculus.definite-integrals"), `taught definite integrals: ${phases}`);
  assert.equal(phases.at(-1), "solved_after_help");
  // persistence: the same state from the stored records
  const again = new Driver(d.learnerId, d.now);
  again.events = JSON.parse(JSON.stringify(d.events));
  assert.deepEqual(again.state().evidence("MATH.calculus.definite-integrals"), d.state().evidence("MATH.calculus.definite-integrals"));
});

test("B: diagnosis generalises across families and unseen parameter combinations, and says when it is unsure", () => {
  const rand = rng(20261019);
  const tally = { trials: 0, identified: 0, uncertain: 0, wrongClaim: 0 };
  const noise = { trials: 0, claimed: 0 };
  for (const fam of FAMILIES.keys()) {
    if (fam === "above") continue;
    const seeds = { mul: [7, 8], rect: [7, 6], eqfrac: [2, 5, 15], fadd: [3, 2, 8, 1], cint: [2, 9, 6], quad: [-5, 6], linev: [2, 3, 4], meet: [1, 2], alp: [1, 2] }[fam]!;
    const pool = [problemOf(`gen:${fam}:${seeds.join(",")}`)!, ...variantsOf(problemOf(`gen:${fam}:${seeds.join(",")}`)!)];
    for (let k = 0; k < 12; k++) {
      const start = pool[Math.floor(rand() * pool.length)];
      const bugs = start.bugs.filter((b) => b.predict !== null && (!Array.isArray(b.predict) || b.predict.length));
      if (!bugs.length) continue;
      const bug = bugs[Math.floor(rand() * bugs.length)];
      // a learner who has this misunderstanding, applying it most of the time
      const learner = (id: string) => {
        const p = problemOf(id)!;
        const b = p.bugs.find((x) => x.id === bug.id);
        if (!b || b.predict === null || rand() < 0.15) return p.answer;
        const v = b.predict;
        return asText(p, Array.isArray(v) && b.id.startsWith("fact-slip") ? v[Math.floor(rand() * v.length)] : (v as number | number[]));
      };
      const first = learner(start.id);
      if (isCorrect(question(start.id), first)) continue; // the misunderstanding gives the right answer here (e.g. 2/8 + 2/8 by multiplying tops)
      const obs = [{ questionId: start.id, response: first }];
      let r = reason(start.id, obs)!;
      while (r.status === "need_more") {
        obs.push({ questionId: r.next!, response: learner(r.next!) });
        r = reason(start.id, obs)!;
      }
      tally.trials++;
      if (r.status === "established" && r.best?.id === bug.id) tally.identified++;
      else if (r.status === "uncertain") tally.uncertain++;
      else tally.wrongClaim++;
      // a learner who answers at random: no misunderstanding may be claimed
      const randomObs = [{ questionId: start.id, response: String(Math.floor(rand() * 900) + 101) }];
      let rr = reason(start.id, randomObs)!;
      while (rr.status === "need_more") {
        randomObs.push({ questionId: rr.next!, response: String(Math.floor(rand() * 900) + 101) });
        rr = reason(start.id, randomObs)!;
      }
      noise.trials++;
      if (rr.status === "established" && rr.best?.id !== "secure") noise.claimed++;
    }
  }
  console.log(`diagnostic@2 synthetic check: ${JSON.stringify(tally)}; random answers: ${JSON.stringify(noise)}`);
  assert.ok(tally.trials >= 60, "enough cases");
  assert.ok(tally.wrongClaim / tally.trials <= 0.05, "a wrong explanation is almost never claimed");
  assert.ok(tally.identified / tally.trials >= 0.6, "most simulated misunderstandings are identified");
  assert.equal(noise.claimed, 0, "random answers never produce a claimed misunderstanding");
});

// ---------------------------------------------------------------- C and M: decomposition, and refusing what is not supported

test("C: every family's answer passes an independent check, and decomposition gives grade-appropriate steps", () => {
  let n = 0;
  for (const [fam] of FAMILIES) {
    const seed = { mul: [7, 8], rect: [7, 6], eqfrac: [2, 5, 15], fadd: [3, 2, 8, 1], cint: [2, 9, 6], quad: [-5, 6], linev: [2, 3, 4], meet: [1, 2], above: [1, 2, 0], alp: [1, 2] }[fam]!;
    const p = problemOf(`gen:${fam}:${seed.join(",")}`)!;
    for (const v of [p, ...variantsOf(p)]) {
      assert.ok(v.steps.length >= 1 && v.answer, v.id); // problemOf throws if the independent check fails
      for (const b of v.bugs) assert.ok(b.predict === null || JSON.stringify(b.predict) !== JSON.stringify(v.answer), `${v.id}: ${b.id} predicts a wrong answer`);
      n++;
    }
  }
  assert.ok(n > 500, `${n} problems checked`);
  // a different area-between-curves problem than the stored one: y = x² and y = 2x + 3 (meet at −1 and 3)
  const pr = parseProblem("Find the area of the region {(x, y) : x² ≤ y ≤ 2x + 3}");
  assert.ok(pr.supported);
  assert.equal(pr.problem.answer, "32/3");
  const at = (g: number) => decompose(pr.problem, g);
  assert.deepEqual(at(5).forGrade.map((s) => s.question!.family), [], "nothing below Grade 6");
  assert.deepEqual(at(7).forGrade.map((s) => s.question!.family), ["linev", "meet"]);
  assert.deepEqual(at(10).forGrade.map((s) => s.question!.family), ["linev", "meet", "quad"]);
  assert.equal(at(11).full, false);
  assert.equal(at(12).full, true);
  for (const s of at(12).forGrade) assert.ok(!s.question!.prompt.includes("region"), "a step never contains the whole problem");
  assert.ok(at(12).steps.every((s) => graph.byId.has(s.step.competency)), "every step names a competency");
});

test("M: a problem outside the supported families is declined, with a reason, and nothing is diagnosed or claimed", () => {
  for (const t of ["Prove that √2 is irrational", "1/3 + 1/4", "13 × 27", "x² + x + 1 = 0", "Integrate sin x from 0 to π", "What is the capital of France?", "x² − 2 = 0"]) {
    const p = parseProblem(t);
    assert.equal(p.supported, false, t);
    assert.ok(!p.supported && p.reason.length > 10, t);
  }
  assert.equal(reason("gen:mul:13,27", [{ questionId: "gen:mul:13,27", response: "351" }]), null);
  assert.equal(problemOf("gen:nope:1,2"), null);
  // a content question that is not in a supported family: recovery traces relations only, with no diagnosis
  const d = new Driver("synthetic-unsupported", T0);
  d.enrol(5, "2026-27", sampleFor(5)!);
  d.answer("ch-counter", "A", "original", { context: "recovery:ch-counter" });
  const st = d.state();
  assert.equal(familyOf("ch-counter"), null);
  const r = recovery("ch-counter", st.records, st.evidence, d.now, d.session);
  assert.equal(r.reasoning, null);
  assert.notEqual(r.phase, "investigate");
  // generated questions stay provisional: even in the test build they never verify anything
  fixture(true);
  const g = new Driver("synthetic-gen", T0);
  g.enrol(4, "2026-27", sampleFor(4)!);
  for (const id of ["gen:mul:7,8", "gen:mul:6,9", "gen:mul:8,4"]) g.answer(id, problemOf(id)!.answer, "practice");
  g.newSession(9);
  for (const id of ["gen:mul:3,7", "gen:mul:9,9"]) g.answer(id, problemOf(id)!.answer, "practice");
  assert.notEqual(g.state().evidence("MATH.number.multiplication-tables").status, "verified");
  fixture(false);
});

// ---------------------------------------------------------------- I: several valid methods

test("I: two learners solve the same problem differently; both methods are valid and recognised, neither is required", () => {
  const mul = problemOf("gen:mul:7,8")!;
  const quad = problemOf("gen:quad:-5,6")!;
  const ways: [Problem, string[], string][] = [
    [mul, ["7 × 5 + 7 × 3 = 35 + 21 = 56"], "decomposition"],
    [mul, ["7 × 7 + 7 = 49 + 7 = 56"], "near-fact"],
    [mul, ["7 × 2 = 14", "14 × 2 = 28", "28 × 2 = 56"], "doubling"],
    [mul, ["8 + 8 + 8 + 8 + 8 + 8 + 8 = 56"], "repeated-addition"],
    [mul, ["70 − 14 = 56"], "other"],
    [quad, ["(x − 2)(x − 3) = 0", "x = 2 or x = 3"], "factorising"],
    [quad, ["x = (5 ± √(25 − 24))/2", "x = 3 or x = 2"], "formula"],
    [quad, ["(x − 5/2)² = 1/4", "x = 5/2 ± 1/2"], "completing-square"],
  ];
  for (const [p, lines, method] of ways) {
    const c = checkWorking(p, lines);
    assert.ok(c.valid, `${lines}: ${c.note}`);
    assert.equal(c.method?.id, method, lines.join(" | "));
  }
  for (const [p, lines] of [[mul, ["7 × 5 + 7 × 3 = 35 + 24 = 59"]], [quad, ["(x + 2)(x + 3) = 0"]], [mul, ["7 × 8 = 54"]]] as [Problem, string[]][]) assert.equal(checkWorking(p, lines).valid, false, lines.join());
  // persisted, and the answer counts the same whatever the method
  const a = new Driver("synthetic-way-a", T0);
  const b = new Driver("synthetic-way-b", T0);
  a.answer("gen:mul:7,8", "56", "practice", { working: ways[0][1] });
  b.answer("gen:mul:7,8", "56", "practice", { working: ways[2][1] });
  const ra = readRecords(a.learnerId, JSON.parse(JSON.stringify(a.events)));
  assert.deepEqual(ra.attempts[0].working, ways[0][1]);
  const ea = a.state().evidence("MATH.number.multiplication-tables");
  const eb = b.state().evidence("MATH.number.multiplication-tables");
  assert.deepEqual([ea.status, ea.independent], [eb.status, eb.independent]);
});

// ---------------------------------------------------------------- J: one persistent plan

test("J: across sessions the plan continues without reteaching, explains its changes, and changes on new evidence", () => {
  fixture(false);
  const d = new Driver("synthetic-plan", T0);
  d.enrol(4, "2026-27", sampleFor(4)!);
  const wrong: Record<string, string> = { "eq-d1": "4", "eq-d2": "4", "eq-d3": "9" };
  const answerer = (q: string) => wrong[q] ?? question(q).answer;
  // session 1: diagnosis, teaching, the guided question; then the learner leaves
  d.work(EQ, answerer, { until: (ms) => ms.phase === "check" });
  const taughtBefore = d.state().records.teaching.length;
  assert.equal(taughtBefore, 1);
  // session 2, from the stored records only (a new device)
  const s2 = new Driver(d.learnerId, d.now + DAY);
  s2.events = JSON.parse(JSON.stringify(d.events));
  s2.newSession(0);
  let st = s2.state();
  assert.equal(st.next?.kind, "continue");
  assert.equal(st.next?.competency, EQ);
  assert.equal(moduleState(EQ, st.records, st.evidence(EQ), s2.now, s2.session).phase, "check", "resumes where it was: no reteaching");
  s2.work(EQ, answerer);
  st = s2.state();
  assert.equal(st.records.teaching.length, taughtBefore, "taught once");
  assert.ok(["independent", "transfer"].includes(st.evidence(EQ).status));
  // session 3: the plan has moved on, and says why
  s2.newSession(1);
  st = s2.state();
  assert.notEqual(st.next?.competency, EQ);
  // one slip after showing it does not bring it back
  s2.answer("gen:eqfrac:3,4,12", "8", "practice");
  st = s2.state();
  assert.ok(["independent", "transfer"].includes(st.evidence(EQ).status), "one slip is not new evidence of a gap");
  // two wrong of the last three on your own: it comes back, and the change is explained
  s2.answer("gen:eqfrac:2,3,9", "8", "practice");
  st = s2.state();
  assert.equal(st.evidence(EQ).status, "guided");
  assert.equal(st.next?.competency, EQ);
  assert.match(st.change ?? "", /comes back/);
  // and the module does not reteach the strategy that was already taught: it checks first
  const ms = moduleState(EQ, st.records, st.evidence(EQ), s2.now, s2.session);
  assert.ok(ms.phase !== "chapter" || ms.strategy!.id !== st.records.teaching[0].strategy, "never the same explanation again");
});


// ---------------------------------------------------------------- K: the seven-day boundary

test("K: nothing verifies before seven full days (verification@3, in the engine and on this surface); the delayed check at seven days verifies", () => {
  fixture(true);
  for (const [days, viaPractice] of [[6.6, true], [6.99, true], [6.99, false]] as [number, boolean][]) {
    const d = new Driver(`synthetic-k-${days}-${viaPractice}`, T0);
    d.enrol(4, "2026-27", sampleFor(4)!);
    d.work(EQ, right);
    // the delayed check's clock starts at independent success (and the engine's first demonstration, if later)
    const t0 = Date.parse(d.state().evidence(EQ).retentionDueAt!) - 7 * DAY;
    d.newSession(0);
    d.now = t0 + days * DAY;
    const st = d.state();
    assert.equal(st.evidence(EQ).retention, "scheduled", "not due before seven days");
    assert.notEqual(moduleState(EQ, st.records, st.evidence(EQ), d.now, d.session).phase, "retention", "no delayed check offered");
    if (viaPractice) {
      // fresh answers in a later session: the shared engine alone would verify after 6.5 days
      d.answer("eq-r1", "6", "practice");
      d.answer("eq-r2", "15", "practice");
      const e = d.state().evidence(EQ);
      // verification@3 (the approved seven-full-day rule) in the shared engine itself: not verified before 7 days
      assert.notEqual(e.engine, "verified", `${days} days: the shared engine does not verify (verification@3)`);
      assert.notEqual(e.status, "verified", `${days} days: not verified on this surface`);
    }
  }
  const d = new Driver("synthetic-k-7", T0);
  d.enrol(4, "2026-27", sampleFor(4)!);
  d.work(EQ, right);
  d.newSession(0);
  d.now = Date.parse(d.state().evidence(EQ).retentionDueAt!);
  assert.equal(d.state().evidence(EQ).retention, "due");
  d.work(EQ, right);
  assert.equal(d.state().evidence(EQ).status, "verified");
  fixture(false);
});

// ---------------------------------------------------------------- L: curriculum variation

const BOARD_B = readFileSync(new URL("../../../content/learning/textbooks/sample-maths-grade4-board-b.txt", import.meta.url), "utf8");
const BOOK_A = readFileSync(new URL("../../../content/learning/textbooks/sample-maths-grade4.md", import.meta.url), "utf8");
test("L: two textbooks saying the same mathematics differently map to the same skills, or are flagged for review", () => {
  const a = synthesise(BOOK_A);
  const b = synthesise(BOARD_B);
  assert.equal(b.source.extractor, "plain-text@1");
  assert.equal(b.source.board, "Sample Board B (synthetic)");
  assert.equal(b.source.academicYear, "2026-27");
  const out = (r: typeof a) => r.subjects[0].chapters.flatMap((c) => c.outcomes);
  // equivalent outcomes, by hand: [book A outcome start, board B outcome start]
  const pairs: [string, string][] = [
    ["Read and compare large numbers", "read, write and order numbers"],
    ["Use multiplication facts", "recall the times tables"],
    ["Multiply multi-digit numbers", "multiply a three-digit number"],
    ["Represent fractions of a whole", "name a part of a shape"],
    ["Generate equivalent fractions", "recognise fractions that name the same amount"],
    ["Compare fractions with like denominators", "decide which of two fractions"],
    ["Add and subtract like fractions", "find the total of two fractions"],
    ["Measure area in square units", "find the space covered"],
    ["Calculate rectangle perimeter", "work out the distance around"],
    ["Compare right, acute and obtuse angles", "identify right angles"],
    ["Identify centres, radii and diameters", "name the centre, radius"],
  ];
  for (const [pa, pb] of pairs) {
    const oa = out(a).find((o) => o.text.startsWith(pa))!;
    const ob = out(b).find((o) => o.text.startsWith(pb))!;
    const same = oa.mapping.competencies[0]?.id === ob.mapping.competencies[0]?.id;
    assert.ok(same || oa.mapping.verdict === "uncertain" || ob.mapping.verdict === "uncertain", `${pa} / ${pb}: same skill or flagged`);
    assert.ok(same, `${pa} / ${pb}: the same top skill (${oa.mapping.competencies[0]?.id} vs ${ob.mapping.competencies[0]?.id})`);
  }
  // genuinely missing mathematics is detected in both, with a page reference
  for (const r of [a, b]) {
    const missing = out(r).filter((o) => o.mapping.verdict === "missing");
    assert.ok(missing.some((o) => /round/i.test(o.text)) && missing.some((o) => /timetable/i.test(o.text)));
    assert.ok(missing.every((o) => o.mapping.proposal?.source.pages));
  }
  // a vague outcome is flagged, not guessed
  assert.equal(out(b).find((o) => o.text.startsWith("solve word problems"))!.mapping.verdict, "uncertain");
  assert.equal(interpret("solve word problems involving fractions", 4).verdict, "uncertain");
  // both boards coexist as releases for Grade 4, and evidence is shared (same competency ids)
  assert.equal(releasesFor(4).length, 2);
});

test("L: the same textbook read from a PDF's text layer gives the same outcomes; a scan is declined", async () => {
  const lines = BOARD_B.split("\n");
  const page = (ls: string[]) => `BT /F1 10 Tf 40 800 Td 12 TL ${ls.map((l) => `(${l.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, (c) => ({ "—": "-", "•": "-", "×": "x", "–": "-", "’": "'" })[c] ?? "")}) Tj T*`).join(" ")} ET`;
  const pdf = (contents: string[], compress: boolean) => {
    let body = "%PDF-1.4\n";
    const objs: string[] = [];
    contents.forEach((c, k) => {
      const data = compress ? deflateSync(Buffer.from(c, "latin1")).toString("latin1") : c;
      objs.push(`${10 + k} 0 obj\n<< /Length ${data.length}${compress ? " /Filter /FlateDecode" : ""} >>\nstream\n${data}\nendstream\nendobj\n`);
      objs.push(`${100 + k} 0 obj\n<< /Type /Page /Contents ${10 + k} 0 R >>\nendobj\n`);
    });
    body += objs.join("") + "trailer\n<< >>\n%%EOF";
    return Uint8Array.from(body, (ch) => ch.charCodeAt(0) & 255);
  };
  const half = Math.floor(lines.length / 2);
  for (const compress of [false, true]) {
    const doc = await extract({ bytes: pdf([page(lines.slice(0, half)), page(lines.slice(half))], compress) });
    assert.equal(doc.provenance.extractor, "pdf-text-layer@1");
    assert.equal(doc.provenance.pages, 2);
    const plain = extractPlain(BOARD_B);
    assert.deepEqual(doc.chapters.map((c) => c.outcomes.length), plain.chapters.map((c) => c.outcomes.length));
    assert.ok(doc.chapters.flatMap((c) => c.outcomes).every((o) => o.location.page), "every outcome has a page");
    const r = synthesise(doc);
    assert.deepEqual(r.subjects[0].chapters.flatMap((c) => c.outcomes.map((o) => o.mapping.competencies[0]?.id)), synthesise(plain).subjects[0].chapters.flatMap((c) => c.outcomes.map((o) => o.mapping.competencies[0]?.id)));
  }
  await assert.rejects(extract({ bytes: pdf(["q 100 0 0 100 0 0 cm /Im1 Do Q"], false) }), /no text layer/);
  await assert.rejects(extract({ text: BOARD_B, aiAssisted: true }), /approval/);
});

// ---------------------------------------------------------------- N: goal progression

test("N: a Grade 5 JEE learner builds foundations in their own year; later years use the same evidence", () => {
  fixture(false);
  const d = new Driver("synthetic-n", T0);
  d.enrol(5, "2026-27", sampleFor(5)!);
  d.goal("jee-advanced");
  assert.equal(horizon("jee-advanced", 5, null), "foundations");
  const ids5 = assigned(sampleFor(5)!).map((a) => a.competency);
  const o = overlay("jee-advanced", 5, ids5, d.state().evidence)!;
  assert.ok(o.foundations.every((id) => graph.get(id).gradeRange[0] <= 5), "no higher-grade material");
  d.work("MATH.number.factors-multiples", right);
  const r5 = readiness("jee-advanced", 5, d.state().evidence)!;
  assert.ok(r5.ids.includes("MATH.number.factors-multiples"));
  // adding or removing the goal adds no evidence
  const before = d.state().ledger.events.map((e) => e.id);
  d.goal("jee-advanced", false);
  d.goal("jee-main");
  assert.deepEqual(d.state().ledger.events.map((e) => e.id), before, "goals are not evidence");
  // six years later, Grade 11: the same record, the same evidence, now an exam plan
  d.newSession(6 * 365);
  d.enrol(11, "2032-33", sampleFor(11)!);
  d.goal("jee-advanced");
  const st = d.state();
  assert.ok(["independent", "transfer", "review"].includes(st.evidence("MATH.number.factors-multiples").status), "Grade 5 evidence is still there");
  const r11 = readiness("jee-advanced", 11, st.evidence)!;
  assert.ok(r11.ids.includes("MATH.number.factors-multiples") || st.evidence("MATH.number.factors-multiples").status === "review");
  assert.ok(r11.foundationsSoFar > r5.foundationsSoFar);
  assert.equal(horizon("jee-advanced", 11, 40), "exam");
  assert.equal(horizon("jee-advanced", 11, 8), "crash");
  const long = examPlan("jee-advanced", st.evidence, 40, 0.75)!;
  const crash = examPlan("jee-advanced", st.evidence, 8, 0.75)!;
  assert.equal(long.mode, "exam");
  assert.equal(crash.mode, "crash");
  assert.ok(long.sections.length === 3 && long.sections.some((s) => s.marking.partialPerOption), "the paper's own sections and marking");
  assert.match(long.caveat, /not verified against the official paper/);
  // marking decides guessing: −1 on +4 breaks even at 20 %; no negative marking: always answer
  assert.equal(attemptRule({ correct: 4, wrong: -1, blank: 0 }, 0.2).breakEven, 0.2);
  assert.equal(attemptRule({ correct: 4, wrong: -1, blank: 0 }, 0.15).attempt, false);
  assert.equal(attemptRule({ correct: 1, wrong: 0, blank: 0 }, 0.05).attempt, true);
});
