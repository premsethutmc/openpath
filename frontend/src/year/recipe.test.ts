/**
 * recipe@1: every lesson recipe is well formed, belongs to a real module, and its missions can be finished and show the
 * numbers its words promise. Malformed recipes are refused.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { moduleFor } from "../../../packages/learning/src/content";
import { teachingEligibility } from "../../../packages/learning/src/teaching-contract";
import { check, initial, measures, met, readout, set, states } from "../../../packages/learning/src/scene";
import { ALL_RECIPES, checkRecipe, recipeFor, stepsOf, workedFor, type Recipe } from "../../../packages/learning/src/recipe";
import { layoutFor } from "./recipe-layout";
import { problemOf } from "../../../packages/learning/src/families";
import { taughtExposureKeys } from "../../../packages/learning/src/teaching-exposure";
import { exposureKey } from "../../../packages/learning/src/families";

test("every recipe passes its checks, belongs to a real module and is offered", () => {
  assert.deepEqual(ALL_RECIPES.map((r) => r.competency).sort(), ["MATH.algebra.determinants", "MATH.algebra.matrices", "MATH.calculus.derivative-rules", "MATH.calculus.indefinite-integrals", "MATH.coordinate.straight-lines", "MATH.geometry.triangle-properties"]);
  assert.equal(new Set(ALL_RECIPES.map((r) => r.competency)).size, ALL_RECIPES.length, "one recipe per competency");
  for (const r of ALL_RECIPES) {
    assert.deepEqual(checkRecipe(r), [], r.competency);
    assert.ok(moduleFor(r.competency), `${r.competency} has a module`);
    assert.equal(recipeFor(r.competency), r);
    assert.equal(stepsOf(r).length, 4 + r.missions.length);
    assert.deepEqual(stepsOf(r).map((s) => s.kind).filter((k) => k !== "mission"), ["question", "predict", "name", "choose"]);
    for (const m of r.missions) { assert.deepEqual(check(m), []); assert.equal(met(m, initial(m)), false); assert.ok([...states(m, 40000)].some((st) => met(m, st))); }
  }
  assert.equal(recipeFor("MATH.no.such.skill"), null);
});

test("the tap lesson's missions give the numbers its words state", () => {
  const [steady, slow, total, curve] = recipeFor("MATH.calculus.indefinite-integrals")!.missions;
  assert.ok(Math.abs(measures(steady, { x: 3 }).total - 6) < 1e-9);
  assert.equal(readout(steady, set(steady, initial(steady), "x", 3)), "From t = 0 to t = 3: area 6");
  assert.ok(Math.abs(measures(slow, { n: 100 }).exact - 9) < 1e-9);
  assert.ok(!met(slow, { n: 50 }) && met(slow, { n: 51 }));
  for (const t of [1, 2, 3]) assert.ok(Math.abs(measures(total, { x: t }).total - t * t) < 1e-9);
  assert.ok(met(curve, { x: 2 }) && !met(curve, { x: 2.05 }));
  assert.equal(readout(curve, { x: 2 }), "At t = 2 the slope is 4");
});

test("the other lessons' missions give the numbers their words state", () => {
  const by = (c: string) => recipeFor(c)!.missions;
  const [at3, speed2, cubic] = by("MATH.calculus.derivative-rules");
  assert.ok(Math.abs(measures(at3, { x: 3 }).slope - 6) < 1e-9 && met(speed2, { x: 1 }) && !met(speed2, { x: 3 }));
  assert.ok(Math.abs(measures(cubic, { x: 2 }).slope - 12) < 1e-9);
  const [wide, mirror, turn] = by("MATH.algebra.matrices");
  assert.ok(met(wide, { a: 2, b: 0, c: 0, d: 1 }) && !met(wide, { a: 1, b: 0, c: 0, d: 2 }));
  assert.ok(met(mirror, { a: -1, b: 0, c: 0, d: 1 }) && met(turn, { a: 0, b: 1, c: -1, d: 0 }) && !met(turn, { a: 0, b: -1, c: 1, d: 0 }));
  const [six, flipped, flat] = by("MATH.algebra.determinants");
  assert.equal(measures(six, { a: 2, b: 0, c: 0, d: 3 }).det, 6);
  assert.ok(met(flipped, { a: -1, b: 0, c: 0, d: 1 }) && met(flipped, { a: 0, b: 1, c: 1, d: 0 }) && !met(flipped, { a: 1, b: 0, c: 0, d: 1 }));
  assert.ok(met(flat, { a: 2, b: 1, c: 2, d: 1 }) && met(flat, { a: 0, b: 0, c: 0, d: 1 }) && !met(flat, { a: 1, b: 0, c: 1, d: 1 }));
  const [uphill, downhill] = by("MATH.coordinate.straight-lines");
  assert.ok(met(uphill, { m: 0.6 }) && !met(uphill, { m: 0.8 }) && met(downhill, { m: -1 }));
  for (const t of by("MATH.geometry.triangle-properties")) { const [a, b] = (t as { angles: [number, number] }).angles; assert.equal(measures(t, { a, b }).c, 180 - a - b); }
});

test("how to solve it: every lesson shows its own worked example, with the family's verified steps, counted as shown", () => {
  for (const r of ALL_RECIPES) {
    const w = workedFor(r.competency), m = moduleFor(r.competency)!;
    assert.ok(w && w.steps.length >= 1 && w.prompt && w.answer, `${r.competency} has a worked example`);
    const id = m.chapter.find((s) => s.instance)!.instance!, p = problemOf(id)!;
    assert.equal(w!.answer, p.answer);
    assert.equal(p.competency, r.competency, "the example is a question of this skill");
    assert.deepEqual(stepsOf(r, true).map((s) => s.kind).filter((k) => k !== "mission"), ["question", "predict", "name", "solve", "choose"]);
    // once the teaching of any lesson of the skill is recorded, the example counts as shown (never as unaided evidence)
    const records = { teaching: [{ at: "2026-01-01T00:00:00Z", rule: "teach-first@1", strategy: m.strategies[0].id, competency: r.competency, session: "s" }] } as unknown as Parameters<typeof taughtExposureKeys>[0];
    assert.ok(taughtExposureKeys(records).has(exposureKey(id)), `${r.competency}: the example is counted as shown`);
    assert.ok(r.choose.kind === "try" || r.choose.kind === "think");
  }
  assert.equal(workedFor("MATH.no.such.skill"), null);
});

test("layout@1: one thing at a time for Classes 1 to 5, the page that grows from Class 6 and when the class is not known", () => {
  for (const r of ALL_RECIPES) {
    assert.ok(["idea", "method", "fact"].includes(r.type));
    for (const g of [1, 3, 5]) assert.equal(layoutFor(r, g), "steps");
    for (const g of [6, 8, 12]) assert.equal(layoutFor(r, g), "flow");
    assert.equal(layoutFor(r, null), "flow");
  }
});

test("a recipe opens only a skill whose opening lesson can record its teaching", () => {
  // the recipe rides inside the skill's opening lesson, which records the teaching when it ends; a skill with no eligible
  // lesson has no such record, so its answers would wrongly count as unaided
  for (const r of ALL_RECIPES) {
    const m = moduleFor(r.competency)!;
    assert.ok(m.strategies.some((s) => teachingEligibility(m, s).eligible), `${r.competency} has an eligible lesson`);
  }
});

test("malformed recipes are refused", () => {
  const good = ALL_RECIPES[0];
  const bad: [string, unknown][] = [
    ["no question", { ...good, question: [] }],
    ["a long paragraph", { ...good, name: ["x".repeat(221)] }],
    ["no right guess", { ...good, predict: { ...good.predict, choices: good.predict.choices.map(({ right: _r, ...c }) => c) } }],
    ["two right choices", { ...good, choose: { ...good.choose, choices: good.choose.choices.map((c) => ({ ...c, right: true })) } }],
    ["one choice", { ...good, choose: { ...good.choose, choices: good.choose.choices.slice(0, 1) } }],
    ["a choice with no reply", { ...good, predict: { ...good.predict, choices: [{ label: "a", reply: "" }, { label: "b", reply: "ok", right: true }] } }],
    ["duplicate labels", { ...good, predict: { ...good.predict, choices: [{ label: "a", reply: "no" }, { label: "a", reply: "yes", right: true }] } }],
    ["no missions", { ...good, missions: [] }],
    ["no type", { ...good, type: undefined }],
    ["no kind on the last step", { ...good, choose: { ask: good.choose.ask, choices: good.choose.choices } }],
    ["five missions", { ...good, missions: [...good.missions, ...good.missions].slice(0, 5) }],
    ["a mission that cannot be finished", { ...good, missions: [{ ...good.missions[0], goal: { measure: "x", equals: 99 } }] }],
    ["a bad variable", { ...good, missions: [{ ...good.missions[0], variable: "time" }] }],
    ["named in the question", { ...good, question: ["What is the integral of 2t?"] }],
    ["named in a mission", { ...good, missions: [{ ...good.missions[0], success: "That area is the antiderivative." }] }],
    ["named in a guess", { ...good, predict: { ...good.predict, ask: "Guess the Integral." } }],
    ["never named", { ...good, name: ["It is the area under the graph."] }],
    ["no names", { ...good, names: [] }],
  ];
  for (const [name, r] of bad) assert.ok(checkRecipe(r as Recipe).length > 0, name);
  for (const v of [null, undefined, 3, "recipe", []]) assert.ok(checkRecipe(v).length > 0);
});
