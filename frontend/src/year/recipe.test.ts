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
  assert.deepEqual(ALL_RECIPES.map((r) => r.competency).sort(), ["MATH.algebra.determinants", "MATH.algebra.matrices", "MATH.calculus.continuity", "MATH.calculus.derivative-rules", "MATH.calculus.indefinite-integrals", "MATH.coordinate.straight-lines", "MATH.geometry.triangle-properties", "MATH.measurement.area-perimeter-relation", "MATH.measurement.area-squares", "MATH.measurement.money-decimals", "MATH.measurement.rectangle-perimeter", "MATH.number.decimal-operations", "MATH.number.decimal-tenths", "MATH.number.division-remainders", "MATH.number.equivalent-fractions", "MATH.number.fraction-add", "MATH.number.fraction-comparison", "MATH.number.fraction-models", "MATH.number.fraction-of-collection", "MATH.number.integer-add", "MATH.number.integers", "MATH.number.multiply-divide-powers-of-ten", "MATH.number.number-line", "MATH.number.percent-intro", "MATH.number.percentage", "MATH.number.primes", "MATH.number.rounding", "MATH.reasoning.estimate-check"]);
  assert.equal(new Set(ALL_RECIPES.map((r) => r.competency)).size, ALL_RECIPES.length, "one recipe per competency");
  for (const r of ALL_RECIPES) {
    assert.deepEqual(checkRecipe(r), [], r.competency);
    assert.ok(moduleFor(r.competency), `${r.competency} has a module`);
    assert.equal(recipeFor(r.competency), r);
    // shape@1: the order of the parts follows the type
    assert.deepEqual(stepsOf(r, true).map((s) => s.kind).filter((k) => k !== "mission"), r.type === "fact" ? ["name", "solve", "choose"] : ["question", "predict", "name", "solve", "choose"]);
    assert.equal(stepsOf(r, true).filter((s) => s.kind === "mission").length, r.missions.length);
    if (r.type === "fact") assert.equal(stepsOf(r)[0].kind, "name", "a fact opens on its name"); else assert.ok(stepsOf(r).findIndex((s) => s.kind === "name") > stepsOf(r).findIndex((s) => s.kind === "mission" || s.kind === "predict"), "an idea is found before it is named");
    if (r.type === "method") assert.ok(workedFor(r.competency), "a method lesson has worked steps");
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
    // three fraction skills have no worked example of their own yet: their lessons go from the name straight to the try
    if (["MATH.number.fraction-models", "MATH.number.equivalent-fractions", "MATH.number.fraction-comparison"].includes(r.competency)) { assert.equal(w, null); assert.notEqual(r.type, "method"); assert.ok(!stepsOf(r, false).some((x) => x.kind === "solve")); continue; }
    assert.ok(w && w.steps.length >= 1 && w.prompt && w.answer, `${r.competency} has a worked example`);
    const id = m.chapter.find((s) => s.instance)!.instance!, p = problemOf(id)!;
    assert.equal(w!.answer, p.answer);
    assert.equal(p.competency, r.competency, "the example is a question of this skill");
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

test("the fact, the Class 5 idea and the method: their missions give the numbers their words state", () => {
  const [jump, hole] = recipeFor("MATH.calculus.continuity")!.missions;
  assert.ok(met(jump, { k: 2 }) && !met(jump, { k: 1.5 }) && Math.abs(measures(jump, { k: 2 }).left - 3) < 1e-9);
  assert.ok(met(hole, { k: 3 }) && !met(hole, { k: 2.5 }) && measures(hole, { k: 1 }).gap < 1e-9, "both sides already agree; only the point is off");
  const [thin, wider, best] = recipeFor("MATH.measurement.area-perimeter-relation")!.missions;
  assert.ok(met(thin, { w: 8, h: 2 }) && met(thin, { w: 2, h: 8 }) && !met(thin, { w: 4, h: 4 }));
  assert.ok(met(wider, { w: 6, h: 4 }) && !met(wider, { w: 8, h: 3 }), "area 24 with another perimeter does not count");
  assert.ok(met(best, { w: 5, h: 5 }) && !met(best, { w: 6, h: 4 }) && !met(best, { w: 6, h: 6 }), "the most room with exactly 20 of fence");
  assert.equal(measures(best, { w: 5, h: 5 }).area, 25);
  assert.equal(readout(thin, { w: 8, h: 2 }), "8 by 2 · fence 20 · room 16");
  const m = recipeFor("MATH.number.fraction-add")!;
  assert.equal(m.missions.length, 0);
  assert.deepEqual(stepsOf(m, true).map((s) => s.kind), ["question", "predict", "name", "solve", "choose"]);
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
  const good = ALL_RECIPES[0] as Required<Recipe>;
  const fact = ALL_RECIPES.find((r) => r.type === "fact")!, method = ALL_RECIPES.find((r) => r.type === "method")!;
  assert.deepEqual(new Set(ALL_RECIPES.map((r) => r.type)), new Set(["idea", "method", "fact"]));
  const bad: [string, unknown][] = [
    ["an idea with no guess", { ...good, predict: undefined }],
    ["an idea with no missions", { ...good, missions: [] }],
    ["a fact with a question", { ...fact, question: ["Why?"] }],
    ["a fact with no mission", { ...fact, missions: [] }],
    ["a method with five missions", { ...method, missions: Array(5).fill(good.missions[0]) }],
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

test("the Class 5 lessons: their missions give the numbers their words state", () => {
  const ms = (c: string) => recipeFor(c)!.missions;
  const [three4, two5] = ms("MATH.number.fraction-models");
  assert.ok(met(three4, { n: 4, k: 3 }) && !met(three4, { n: 8, k: 6 }) && met(two5, { n: 5, k: 2 }), "the asked pieces, not just the same amount");
  const [half, quarters, any] = ms("MATH.number.equivalent-fractions");
  assert.ok(met(half, { k: 4 }) && !met(half, { k: 3 }) && met(quarters, { k: 9 }));
  assert.ok(met(any, { n: 6, k: 4 }) && met(any, { n: 9, k: 6 }) && met(any, { n: 12, k: 8 }) && !met(any, { n: 3, k: 2 }) && !met(any, { n: 6, k: 3 }), "the same amount with other pieces");
  const [more, smaller] = ms("MATH.number.fraction-comparison");
  assert.ok(met(more, { k: 4 }) && !met(more, { k: 3 }) && !met(more, { k: 2 }));
  assert.ok(met(smaller, { n: 5 }) && !met(smaller, { n: 4 }) && !met(smaller, { n: 3 }), "1/5 is less than 1/4; 1/4 is not");
  const [q, t] = ms("MATH.number.percent-intro");
  assert.ok(met(q, { k: 25 }) && !met(q, { k: 24 }) && met(t, { k: 30 }));
  const [d7, d25, d3] = ms("MATH.number.decimal-tenths");
  assert.ok(met(d7, { k: 7 }) && met(d25, { k: 25 }) && met(d3, { k: 30 }) && !met(d3, { k: 3 }));
  const [p30, p35, p320] = ms("MATH.number.number-line");
  assert.ok(met(p30, { x: 30 }) && met(p35, { x: 35 }) && met(p320, { x: 320 }) && !met(p320, { x: 300 }));
  for (const m of [p30, p35, p320]) for (const st of states(m)) assert.ok(!/\d/.test(readout(m, st)), "the hidden point's number is never shown");
  const [leh, colder, between] = ms("MATH.number.integers");
  assert.ok(met(leh, { x: -7 }) && met(colder, { x: -5 }) && !met(colder, { x: -4 }) && !met(colder, { x: 2 }));
  assert.deepEqual([...states(between)].filter((st) => met(between, st)).map((st) => st.x), [-2, -1]);
  const [lift, up, back] = ms("MATH.number.integer-add");
  assert.ok(met(lift, { x: -2 }) && met(up, { x: 2 }) && met(back, { x: -7 }));
  assert.equal(readout(lift, { x: -2 }), "Start at 3 · 5 back · now at −2");
  assert.equal(readout(up, { x: 2 }), "Start at −4 · 6 forward · now at 2");
  const [ten, thousand, middle] = ms("MATH.number.rounding");
  assert.ok(met(ten, { x: 350 }) && !met(ten, { x: 340 }) && met(thousand, { x: 2000 }) && !met(thousand, { x: 3000 }) && met(middle, { x: 70 }));
  assert.equal(readout(ten, initial(ten)), "At 347 · 7 from 340 · 3 from 350");
  const [r3, r2, thirteen] = ms("MATH.number.primes");
  assert.ok(met(r3, { c: 4 }) && met(r2, { c: 6 }) && !met(r2, { c: 4 }));
  assert.deepEqual([...states(thirteen)].filter((st) => met(thirteen, st)), [{ r: 1, c: 13 }], "13 makes only one row");
  const [a24, a18, sq] = ms("MATH.measurement.area-squares");
  assert.ok(met(a24, { w: 6, h: 4 }) && met(a24, { w: 3, h: 8 }) && !met(a24, { w: 5, h: 5 }) && met(a18, { w: 9, h: 2 }));
  assert.deepEqual([...states(sq)].filter((st) => met(sq, st)), [{ w: 4, h: 4 }]);
  assert.ok(!readout(a24, { w: 6, h: 4 }).includes("area"), "the name is not on the screen before it is given");
  const [f14, f18, sq3] = ms("MATH.measurement.rectangle-perimeter");
  assert.ok(met(f14, { w: 3, h: 4 }) && met(f14, { w: 6, h: 1 }) && !met(f14, { w: 4, h: 4 }) && met(f18, { w: 5, h: 4 }));
  assert.deepEqual([...states(sq3)].filter((st) => met(sq3, st)), [{ w: 3, h: 3 }]);
});

test("the second Class 5 batch: sharing out, leftovers, estimates and money", () => {
  const ms = (c: string) => recipeFor(c)!.missions;
  const [third, quarter, fifth] = ms("MATH.number.fraction-of-collection");
  assert.ok(met(third, { c: 4 }) && !met(third, { c: 3 }) && met(quarter, { c: 5 }) && met(fifth, { c: 3 }));
  const [m39, m23, m24] = ms("MATH.number.division-remainders");
  // finished only when the rows are as full as they can be: 7 each with 4 over, never 6 each with 9 over
  assert.deepEqual([...states(m39)].filter((st) => met(m39, st)), [{ c: 7 }]);
  assert.deepEqual([...states(m23)].filter((st) => met(m23, st)), [{ c: 5 }]);
  assert.deepEqual([...states(m24)].filter((st) => met(m24, st)), [{ c: 4 }]);
  assert.equal(measures(m39, { c: 7 }).left, 4); assert.equal(measures(m24, { c: 4 }).left, 0);
  assert.equal(readout(m39, { c: 7 }), "5 rows of 7 = 35 · 4 left over"); assert.equal(readout(m39, { c: 8 }), "5 rows of 8 = 40 · 1 too many");
  const [e38, e87] = ms("MATH.reasoning.estimate-check");
  assert.ok(met(e38, { x: 40 }) && !met(e38, { x: 30 }) && met(e87, { x: 90 }));
  const [ten, quarter100] = ms("MATH.number.percentage");
  assert.ok(met(ten, { k: 10 }) && met(quarter100, { k: 25 }));
  const [fifty, five] = ms("MATH.measurement.money-decimals");
  assert.ok(met(fifty, { k: 50 }) && met(five, { k: 5 }) && !met(five, { k: 50 }));
  // the two lessons with nothing to explore are methods, carried by their worked steps
  for (const c of ["MATH.number.decimal-operations", "MATH.number.multiply-divide-powers-of-ten"]) { const r = recipeFor(c)!; assert.equal(r.type, "method"); assert.equal(r.missions.length, 0); assert.ok(workedFor(c)); }
  assert.equal(workedFor("MATH.number.decimal-operations")!.answer, "17.58", "the story's own sum is the one worked");
});
