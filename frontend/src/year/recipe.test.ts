/**
 * recipe@1: every lesson recipe is well formed, belongs to a real module, and its missions can be finished and show the
 * numbers its words promise. Malformed recipes are refused.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { moduleFor } from "../../../packages/learning/src/content";
import { teachingEligibility } from "../../../packages/learning/src/teaching-contract";
import { check, initial, measures, met, readout, set, states } from "../../../packages/learning/src/scene";
import { ALL_RECIPES, checkRecipe, recipeFor, stepsOf, type Recipe } from "../../../packages/learning/src/recipe";

test("every recipe passes its checks, belongs to a real module and is offered", () => {
  assert.ok(ALL_RECIPES.length >= 1);
  assert.equal(new Set(ALL_RECIPES.map((r) => r.competency)).size, ALL_RECIPES.length, "one recipe per competency");
  for (const r of ALL_RECIPES) {
    assert.deepEqual(checkRecipe(r), [], r.competency);
    assert.ok(moduleFor(r.competency), `${r.competency} has a module`);
    assert.equal(recipeFor(r.competency), r);
    assert.equal(stepsOf(r).length, 4 + r.missions.length);
    assert.deepEqual(stepsOf(r).map((s) => s.kind).filter((k) => k !== "mission"), ["question", "predict", "name", "choose"]);
    for (const m of r.missions) { assert.deepEqual(check(m), []); assert.equal(met(m, initial(m)), false); assert.ok([...states(m)].some((st) => met(m, st))); }
    // the name of the idea is not given away before the name step
    const before = [...r.question, r.predict.ask, ...r.predict.choices.flatMap((c) => [c.label, c.reply]), ...r.missions.flatMap((m) => [m.prompt, m.success])].join(" ").toLowerCase();
    assert.ok(!/integra|antiderivative|∫/.test(before), `${r.competency}: named too early`);
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
    ["five missions", { ...good, missions: [...good.missions, ...good.missions].slice(0, 5) }],
    ["a mission that cannot be finished", { ...good, missions: [{ ...good.missions[0], goal: { measure: "x", equals: 99 } }] }],
    ["a bad variable", { ...good, missions: [{ ...good.missions[0], variable: "time" }] }],
  ];
  for (const [name, r] of bad) assert.ok(checkRecipe(r as Recipe).length > 0, name);
  for (const v of [null, undefined, 3, "recipe", []]) assert.ok(checkRecipe(v).length > 0);
});
