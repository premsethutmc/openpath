/**
 * learner-vector@1 (shadow): difficulty-aware, graph-connected estimates per skill, and where they would look first when a
 * learner is stuck. Nothing in the product reads it yet. The numbers are design values, and the synthetic learners below are
 * built from the same prerequisite graph the model uses, so this shows the model behaves as designed, not that it is right
 * about children.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { boardFor } from "../../../packages/learning/src/curricula";
import { allOutcomesOf } from "../../../packages/learning/src/curriculum";
import { moduleFor, poolFamilies, questions } from "../../../packages/learning/src/content";
import { difficultyOf, FAMILIES, pool } from "../../../packages/learning/src/families";
import { graph, walkSupports } from "../../../packages/learning/src/graph";
import { learnerVector, suspectsBelow } from "../../../packages/learning/src/learner-vector";
import type { LearnerRecords } from "../../../packages/learning/src/records";

let clock = Date.parse("2026-11-12T09:00:00Z");
const answer = (questionId: string, competency: string, right: boolean, more: Record<string, unknown> = {}) => ({ id: `a${clock}`, at: new Date((clock += 60_000)).toISOString(), session: "s", questionId, response: "", activity: "check", hints: 0, solution: false, competency, n: 1, credit: right, ...more });
const records = (attempts: unknown[]) => ({ attempts, teaching: [], enrolments: [], sessions: {}, goals: new Map(), curricula: new Map() }) as unknown as LearnerRecords;
const below = (s: string) => walkSupports(s, 2).map((x) => ({ id: graph.evidenceTarget(x.id), type: x.type })).filter((x) => x.id !== s);
/** Questions of a skill: from its families, else its hand-written ones. */
const questionsOf = (skill: string, n: number) => {
  const m = moduleFor(skill);
  if (!m) return [];
  const generated = poolFamilies(m).flatMap((f) => pool(f).items.slice(0, 6).map((p) => p.id));
  return (generated.length ? generated : questions.filter((q) => !q.id.startsWith("gen:") && graph.evidenceTarget(q.competency) === skill).map((q) => q.id)).slice(0, n);
};

test("difficulty: a hard question right says more than an easy one right; an easy one wrong says more than a hard one wrong", () => {
  const fam = [...FAMILIES.keys()].find((f) => { const it = pool(f).items; return it.some((p) => difficultyOf(p) === 1) && it.some((p) => difficultyOf(p) === 3); })!;
  const items = pool(fam).items, skill = graph.evidenceTarget(FAMILIES.get(fam)!.competency);
  const easy = items.find((p) => difficultyOf(p) === 1)!.id, hard = items.find((p) => difficultyOf(p) === 3)!.id;
  const est = (q: string, right: boolean) => learnerVector(records([answer(q, skill, right)])).get(skill)!.estimate;
  assert.ok(est(hard, true) > est(easy, true) && est(easy, true) > 0.5);
  assert.ok(est(easy, false) < est(hard, false) && est(hard, false) < 0.5);
  // without difficulty the two are the same
  const flat = (q: string) => learnerVector(records([answer(q, skill, true)]), { difficulty: false }).get(skill)!.estimate;
  assert.equal(flat(hard), flat(easy));
});

test("graph: wrong answers on a skill cast doubt on what it builds on; the learner's own answers on the lower skill outweigh that", () => {
  const S = "MATH.number.decimal-tenths", P = "MATH.number.fraction-add-like";
  assert.ok(below(S).some((b) => b.id === P && b.type === "mandatory"));
  const wrongOnS = questionsOf(S, 3).map((q) => answer(q, S, false));
  const v = learnerVector(records(wrongOnS));
  assert.ok(v.get(S)!.estimate < 0.5);
  assert.ok(v.get(P)!.estimate < 0.5 && v.get(P)!.direct === 0 && v.get(P)!.inferred > 0, "doubt reached the skill below without any answer on it");
  assert.ok(v.get(P)!.estimate > v.get(S)!.estimate, "inference is weaker than direct evidence");
  assert.equal(suspectsBelow(S, v)[0].skill, P);
  // the learner then shows the lower skill directly: that wins, and it is no longer the first suspect
  const shown = learnerVector(records([...wrongOnS, ...questionsOf(P, 3).map((q) => answer(q, P, true))]));
  assert.ok(shown.get(P)!.estimate > 0.5);
  assert.notEqual(suspectsBelow(S, shown)[0].skill, P);
  assert.equal(learnerVector(records(wrongOnS), { graph: false }).get(P), undefined);
});

test("only a first, unaided answer counts", () => {
  const S = "MATH.number.decimal-tenths", [q1, q2] = questionsOf(S, 2);
  const base = learnerVector(records([answer(q1, S, true)])).get(S)!;
  const more = learnerVector(records([answer(q1, S, true), answer(q1, S, false, { n: 2 }), answer(q2, S, false, { hints: 1 }), answer(q2, S, false, { activity: "guided" })])).get(S)!;
  assert.deepEqual(more, base);
});

test("the vector is read only by recovery's order, and only with prereq-after-own@1 on; mastery and selection never read it", () => {
  const recovery = readFileSync(new URL("../../../packages/learning/src/intervention.ts", import.meta.url), "utf8");
  assert.equal(recovery.split("learnerVector(").length - 1, 1, "one use");
  assert.match(recovery, /prerequisiteAfterOwn\(\) \? byDoubt\(/);
  for (const f of ["evidence.ts", "plan.ts", "tiles.ts", "dashboard.ts"])
    assert.ok(!readFileSync(new URL(`../../../packages/learning/src/${f}`, import.meta.url), "utf8").includes("learner-vector"), f);
});

test("Tamil Nadu Grade 5: a learner with one missing lower skill; the vector's first suspect is that skill far more often than the graph's order", () => {
  const release = boardFor("tn", 5)!;
  const skills = [...new Set(allOutcomesOf(release).flatMap(({ outcome }) => outcome.mapping.competencies.filter((m) => m.status === "accepted").map((m) => (graph.byId.has(m.id) ? graph.evidenceTarget(m.id) : m.id))))].sort().filter((s) => questionsOf(s, 2).length >= 2);
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  let cases = 0, graphFirst = 0, vectorFirst = 0, graphChecks = 0, vectorChecks = 0;
  for (const P of [...new Set(skills.flatMap((s) => below(s).map((b) => b.id)))].filter((p) => questionsOf(p, 1).length)) {
    const missing = (x: string) => x === P || below(x).some((b) => b.id === P && b.type !== "plausible");
    for (const S of skills.filter((s) => s !== P && missing(s)))
      for (let rep = 0; rep < 3; rep++) {
        // history: about half of the other skills, two answers each (wrong where the skill rests on the missing one); then two wrong on S
        const asked = [...skills.filter((x) => x !== S && rnd() < 0.5), S];
        const v = learnerVector(records(asked.flatMap((x) => questionsOf(x, 2).map((q) => answer(q, x, !missing(x))))));
        const order = below(S).filter((b, i, a) => a.findIndex((y) => y.id === b.id) === i);
        const g = order.findIndex((b) => b.id === P) + 1, w = suspectsBelow(S, v).findIndex((b) => b.skill === P) + 1;
        if (!g || !w) continue;
        cases++; graphChecks += g; vectorChecks += w;
        if (g === 1) graphFirst++;
        if (w === 1) vectorFirst++;
      }
  }
  assert.ok(cases > 300, `${cases} cases`);
  assert.ok(vectorFirst / cases > 0.55, `vector first try ${(vectorFirst / cases).toFixed(3)}`);
  assert.ok(graphFirst / cases < 0.3, `graph order first try ${(graphFirst / cases).toFixed(3)}`);
  assert.ok(vectorChecks / cases < 0.6 * (graphChecks / cases), `checks to find: vector ${(vectorChecks / cases).toFixed(2)}, graph order ${(graphChecks / cases).toFixed(2)}`);
});
