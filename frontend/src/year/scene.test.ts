/**
 * scene@1 / scenes@1: the scene engine is deterministic, refuses scenes that are malformed or cannot be completed, and every
 * scene offered for a released question states the mathematics of that question (its own number equals the family's
 * verified answer, and the family's independent validator accepts it).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { numericValue } from "../../../packages/learning/src/answer-types";
import { check, controls, derivative, describe, draw, evalPoly, fmt, initial, integral, measures, met, pointer, polyText, readout, set, states, type Scene } from "../../../packages/learning/src/scene";
import { SCENE_FAMILIES, sceneAnswer, sceneForQuestion } from "../../../packages/learning/src/scenes";

const strips: Scene = { type: "scene", kind: "strips", poly: [0.5, 0, 0.25], from: 0, to: 4, prompt: "Add strips.", success: "Done.", goal: { measure: "gap", below: 0.1 } };
const slope: Scene = { type: "scene", kind: "slope", poly: [0, -2, 0, 1 / 6], from: -3.6, to: 3.6, step: 0.05, prompt: "Find slope 0.", success: "Flat.", goal: { measure: "slope", equals: 0 } };
const collect: Scene = { type: "scene", kind: "accumulate", poly: [2, -1], from: 0, to: 4, step: 0.05, prompt: "Collect.", success: "Peak.", goal: { measure: "total", equals: 2 } };
const line: Scene = { type: "scene", kind: "line", targets: [[1, 3], [3, 7]], window: [-1, 5, -1, 9], m: [-3, 3, 0.5], c: [-2, 6, 0.5], prompt: "Through both.", success: "y = 2x + 1.", goal: { measure: "miss", below: 0.01 } };
const ALL = [strips, slope, collect, line];

test("polynomials: value, derivative and exact integral", () => {
  assert.equal(evalPoly([1, -3, 5], 2), 15);
  assert.deepEqual(derivative([1, -3, 5]), [-3, 10]);
  assert.deepEqual(derivative([7]), [0]);
  assert.ok(Math.abs(integral([0, 0, 3], 0, 2) - 8) < 1e-12);
  assert.ok(Math.abs(integral([0.5, 0, 0.25], 0, 4) - 22 / 3) < 1e-12);
  assert.equal(polyText([1, -3, 5]), "5x² − 3x + 1");
  assert.equal(polyText([0, 0, 0, 1]), "x³");
  assert.equal(fmt(-0.004), "0");
  assert.equal(fmt(-2.5), "−2.5");
  assert.equal(fmt(43.3333), "43.33");
});

test("the four example scenes pass the checks and are completed by a reachable state", () => {
  for (const s of ALL) {
    assert.deepEqual(check(s), [], s.kind);
    assert.equal(met(s, initial(s)), false, `${s.kind} starts unfinished`);
    assert.ok([...states(s)].some((st) => met(s, st)), `${s.kind} can be finished`);
    assert.ok(describe(s).length > 20);
  }
});

test("the same scene and state always give the same picture, numbers and words", () => {
  for (const s of ALL) {
    const st = initial(s);
    assert.deepEqual(draw(s, st), draw(s, { ...st }));
    assert.deepEqual(measures(s, st), measures(s, { ...st }));
    assert.equal(readout(s, st), readout(s, { ...st }));
  }
});

test("every reachable state draws finite shapes inside sensible bounds and never NaN", () => {
  for (const s of ALL) {
    let n = 0;
    for (const st of states(s, 3000)) {
      n++;
      for (const v of Object.values(measures(s, st))) assert.ok(Number.isFinite(v), `${s.kind} measure`);
      assert.ok(!JSON.stringify(draw(s, st)).includes("null"), `${s.kind} draws finite numbers`);
      assert.ok(!/NaN|Infinity|undefined/.test(readout(s, st)));
    }
    assert.ok(n > 1);
  }
});

test("controls clamp to their range and snap to their grid", () => {
  assert.equal(set(strips, initial(strips), "n", 1e9).n, 100);
  assert.equal(set(strips, initial(strips), "n", -5).n, 1);
  assert.equal(set(strips, initial(strips), "n", 7.4).n, 7);
  assert.equal(set(slope, initial(slope), "x", 1.9874).x, 2);
  assert.deepEqual(set(slope, initial(slope), "nope", 3), initial(slope));
  assert.deepEqual(set(slope, initial(slope), "x", Number.NaN), initial(slope));
  for (const s of ALL) for (const c of controls(s)) assert.ok(c.start >= c.min && c.start <= c.max);
});

test("dragging follows the finger on scenes with a point, and does nothing on slider-only scenes", () => {
  const left = pointer(slope, initial(slope), 34, 100).x, right = pointer(slope, initial(slope), 326, 100).x;
  assert.equal(left, -3.6);
  assert.equal(right, 3.6);
  assert.equal(pointer(collect, initial(collect), 9999, 0).x, 4);
  assert.deepEqual(pointer(strips, initial(strips), 200, 100), initial(strips));
  assert.deepEqual(pointer(line, initial(line), 200, 100), initial(line));
});

test("goals: the slope scene is finished only on flat ground; the collected area peaks where the curve crosses zero", () => {
  assert.ok(met(slope, { x: 2 }) && met(slope, { x: -2 }));
  assert.ok(!met(slope, { x: 1.95 }) && !met(slope, { x: 0 }));
  assert.ok(met(collect, { x: 2 }));
  assert.ok(!met(collect, { x: 4 }), "area below the axis is taken away");
  assert.ok(Math.abs(measures(collect, { x: 4 }).total) < 1e-9);
  assert.ok(met(line, { m: 2, c: 1 }) && !met(line, { m: 2, c: 1.5 }));
});

test("the strips line says what is missing, not the true area", () => {
  const s = { ...strips, poly: [0, 0, 5], from: 1, to: 3 } as Scene; // true area 130/3 = 43.33
  for (const st of states(s)) assert.ok(!readout(s, st).includes("43.33"), readout(s, st));
  assert.match(readout(s, initial(s)), /^4 strips add up to 33\.75 · missing 22\.12%$/);
});

test("malformed or impossible scenes are refused", () => {
  const bad: [string, unknown][] = [
    ["not a scene", { type: "strips" }],
    ["unknown kind", { ...strips, kind: "spiral" }],
    ["empty prompt", { ...strips, prompt: " " }],
    ["unknown measure", { ...strips, goal: { measure: "slope", below: 1 } }],
    ["two targets", { ...strips, goal: { measure: "gap", below: 1, equals: 1 } }],
    ["no target", { ...strips, goal: { measure: "gap" } }],
    ["non-finite coefficient", { ...strips, poly: [1, Number.NaN] }],
    ["too many coefficients", { ...strips, poly: [1, 1, 1, 1, 1, 1, 1] }],
    ["reversed range", { ...strips, from: 4, to: 0 }],
    ["already finished", { ...strips, goal: { measure: "gap", below: 1e9 } }],
    ["cannot be finished", { ...strips, goal: { measure: "gap", below: 1e-9 } }],
    ["slope never reached", { ...slope, goal: { measure: "slope", equals: 99 } }],
    ["bad slider range", { ...line, m: [3, -3, 0.5] }],
    ["no targets", { ...line, targets: [] }],
    ["huge grid", { ...slope, step: 1e-6 }],
  ];
  for (const [name, s] of bad) assert.ok(check(s).length > 0, name);
  for (const v of [null, undefined, 3, "scene", []]) assert.ok(check(v).length > 0);
});

test("every released question of a scene family gets a scene that states that question's own answer", () => {
  assert.deepEqual([...SCENE_FAMILIES].sort(), ["cint", "dpow", "pint"]);
  const counts: Record<string, [number, number]> = {};
  for (const fam of SCENE_FAMILIES) {
    const def = FAMILIES.get(fam)!;
    let shown = 0, total = 0;
    for (const q of pool(fam).items) {
      total++;
      const s = sceneForQuestion(q.id);
      if (!s) continue;
      shown++;
      assert.deepEqual(check(s), [], q.id);
      const mine = sceneAnswer(s), theirs = numericValue(q.answer);
      assert.ok(mine !== null && theirs !== null && Math.abs(mine - theirs) < 1e-9 * Math.max(1, Math.abs(theirs)), `${q.id}: scene ${mine} vs answer ${q.answer}`);
      assert.ok(def.validate(q.params, mine), `${q.id}: the family's independent check accepts the scene's number`);
      for (const b of def.bugs(q.params)) if (typeof b.predict === "number" && Math.abs(b.predict - theirs) > 1e-9) assert.ok(Math.abs(b.predict - mine) > 1e-9, `${q.id}: the scene does not state the ${b.id} mistake`);
      assert.ok(s.prompt.length <= 160 && s.success.length <= 160);
    }
    counts[fam] = [shown, total];
    assert.ok(total >= 80, `${fam} pool`);
    assert.equal(shown, total, `${fam}: every released question has a scene`);
  }
  assert.equal(sceneForQuestion("gen:pint:1,3,5,2:mc")?.kind, "strips");
  assert.equal(sceneForQuestion("gen:nosuch:1,2"), null);
  assert.equal(sceneForQuestion("gen:constructor:1"), null);
  assert.equal(sceneForQuestion("not an id"), null);
});
