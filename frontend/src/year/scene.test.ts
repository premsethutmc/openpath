/**
 * scene@1 / scenes@1: the scene engine is deterministic, refuses scenes that are malformed or cannot be completed, and every
 * scene offered for a released question states the mathematics of that question (its own number equals the family's
 * verified answer, and the family's independent validator accepts it).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { evaluate, numericValue, parse, rhs } from "../../../packages/learning/src/answer-types";
import { check, controls, curveOf, curveText, derivative, describe, draggable, draw, evalPoly, grip, fmt, initial, integral, measures, met, pointer, polyText, readout, set, states, type Scene } from "../../../packages/learning/src/scene";
import { SCENE_FAMILIES, sceneAnswer, sceneForQuestion, sceneProbes } from "../../../packages/learning/src/scenes";

const strips: Scene = { type: "scene", kind: "strips", poly: [0.5, 0, 0.25], from: 0, to: 4, prompt: "Add strips.", success: "Done.", goal: { measure: "gap", below: 0.1 } };
const slope: Scene = { type: "scene", kind: "slope", poly: [0, -2, 0, 1 / 6], from: -3.6, to: 3.6, step: 0.05, prompt: "Find slope 0.", success: "Flat.", goal: { measure: "slope", equals: 0 } };
const collect: Scene = { type: "scene", kind: "accumulate", poly: [2, -1], from: 0, to: 4, step: 0.05, prompt: "Collect.", success: "Peak.", goal: { measure: "total", equals: 2 } };
const line: Scene = { type: "scene", kind: "line", targets: [[1, 3], [3, 7]], window: [-1, 5, -1, 9], m: [-3, 3, 0.5], c: [-2, 6, 0.5], prompt: "Through both.", success: "y = 2x + 1.", goal: { measure: "miss", below: 0.01 } };
const pivot: Scene = { type: "scene", kind: "line", through: [-2, -1], targets: [[3, 2]], window: [-7, 7, -7, 7], m: [-3, 3, 0.2], prompt: "Turn the line.", success: "Slope 3/5.", goal: { measure: "miss", below: 1e-4 } };
const triangle: Scene = { type: "scene", kind: "triangle", angles: [40, 75], prompt: "Set the two angles.", success: "65°.", goal: { measure: "miss", equals: 0 } };
const wave: Scene = { type: "scene", kind: "accumulate", terms: [{ f: "sin", a: 2 }], from: 0, to: 6.3, step: 0.05, prompt: "Collect.", success: "Peak.", goal: { measure: "total", equals: 4, tol: 0.01 } };
const growth: Scene = { type: "scene", kind: "slope", terms: [{ f: "exp", a: 1, b: 1 }, { f: "ln", a: -2 }], from: 0.25, to: 2, step: 0.05, prompt: "Slide to 1.", success: "e − 2.", goal: { measure: "x", equals: 1 } };
const ALL = [strips, slope, collect, line, pivot, triangle, wave, growth];

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
  assert.deepEqual(ALL.map(draggable), [false, true, true, false, false, true, true, true]);
  // a finger straight above the middle of the base makes two equal angles; every finger position leaves a real triangle
  const mid = pointer(triangle, initial(triangle), 170, 75);
  assert.equal(mid.a, mid.b);
  assert.equal(mid.a, 45);
  for (let x = 0; x <= 340; x += 17) for (let y = 0; y <= 220; y += 11) { const t = pointer(triangle, mid, x, y), m = measures(triangle, t); assert.ok(m.a + m.b + m.c === 180 && m.c >= 10, `finger at ${x}, ${y}`); }
});

test("curves beyond polynomials: exact slopes and areas for sine, cosine, exponential and logarithm", () => {
  const sin = curveOf({ terms: [{ f: "sin", a: 2 }], from: 0, to: 1 });
  assert.ok(Math.abs(sin.area(0, Math.PI) - 4) < 1e-12);
  assert.ok(Math.abs(sin.slope(0) - 2) < 1e-12);
  const mix = curveOf({ terms: [{ f: "exp", a: 3, b: 2 }, { f: "ln", a: -6 }, { f: "cos", a: 1, b: 3 }, { f: "pow", a: 5, b: 2 }], from: 1, to: 2 });
  const h = 1e-6;
  for (const x of [0.5, 1, 1.7]) {
    assert.ok(Math.abs(mix.slope(x) - (mix.value(x + h) - mix.value(x - h)) / (2 * h)) < 1e-4 * Math.max(1, Math.abs(mix.slope(x))), `slope at ${x}`);
    let simpson = 0; const n = 2000, w = (x + 1 - x) / n;
    for (let i = 0; i <= n; i++) simpson += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * mix.value(x + i * w);
    assert.ok(Math.abs(mix.area(x, x + 1) - (simpson * w) / 3) < 1e-6 * Math.max(1, Math.abs(mix.area(x, x + 1))), `area from ${x}`);
  }
  assert.equal(curveText({ terms: [{ f: "exp", a: 2, b: 3 }, { f: "ln", a: -6 }], from: 1, to: 2 }), "2e^(3x) − 6 ln x");
  assert.equal(curveText({ terms: [{ f: "sin", a: 1 }, { f: "cos", a: -1, b: 2 }, { f: "exp", a: 1 }], from: 0, to: 1 }), "sin(x) − cos(2x) + eˣ");
  assert.ok(check({ ...growth, from: 0 }).length > 0, "a logarithm from 0 is refused");
  assert.ok(check({ ...growth, poly: [1] }).length > 0, "a curve cannot be both a polynomial and terms");
  assert.ok(check({ ...growth, terms: [{ f: "tan", a: 1 }] }).length > 0);
  assert.ok(check({ ...growth, terms: [{ f: "sin", a: 1, b: 0 }] }).length > 0);
});

test("the triangle: three whole angles that always make 180°, finished only at the two asked angles", () => {
  for (const st of states(triangle)) { const m = measures(triangle, st); assert.equal(m.a + m.b + m.c, 180); assert.ok(m.c >= 10 && m.a >= 10 && m.b >= 10); }
  assert.ok(met(triangle, { a: 40, b: 75 }) && !met(triangle, { a: 41, b: 75 }) && !met(triangle, { a: 75, b: 40 }));
  assert.equal(readout(triangle, { a: 40, b: 75 }), "40° + 75° + 65° = 180°");
  assert.ok(check({ ...triangle, angles: [100, 90] }).length > 0);
  assert.ok(check({ ...triangle, angles: [40.5, 60] }).length > 0);
  assert.ok(met(pivot, { m: 0.6 }) && !met(pivot, { m: 0.4 }));
  assert.ok(check({ ...pivot, c: [-2, 6, 0.5] }).length > 0, "a turning line has no start slider");
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

test("the transform: two arrows are a matrix; the area number is its determinant", () => {
  const wide: Scene = { type: "scene", kind: "transform", target: [2, 0, 0, 1], prompt: "Twice as wide.", success: "Done.", goal: { measure: "miss", equals: 0 } };
  const flat: Scene = { type: "scene", kind: "transform", prompt: "Squash it.", success: "Flat.", goal: { measure: "det", equals: 0 } };
  for (const s of [wide, flat]) { assert.deepEqual(check(s), []); assert.equal(met(s, initial(s)), false); assert.ok(draggable(s)); assert.ok(describe(s).length > 20); }
  assert.deepEqual(initial(wide), { a: 1, b: 0, c: 0, d: 1 });
  assert.equal(measures(wide, { a: 2, b: 1, c: -1, d: 3 }).det, 7);
  assert.equal(readout(wide, { a: 2, b: 0, c: 0, d: 1 }), "Arrows land at (2, 0) and (0, 1) · area × 2");
  // box point (222, 110) is model point (2, 0): the first arrow's tip is nearer and follows; the second does not move
  assert.deepEqual(pointer(wide, initial(wide), 222, 110), { a: 2, b: 0, c: 0, d: 1 });
  assert.deepEqual(pointer(wide, initial(wide), 170, 58), { a: 1, b: 0, c: 0, d: 2 });
  assert.deepEqual(pointer(wide, initial(wide), 20, 210), initial(wide), "a touch far from both arrows moves nothing");
  // a held arrow can be dragged right across the other one without letting go of it
  assert.equal(grip(wide, initial(wide), 170, 84), 1);
  assert.deepEqual(pointer(wide, initial(wide), 196, 110, 1), { a: 1, b: 0, c: 1, d: 0 });
  assert.deepEqual(pointer(wide, { a: 1, b: 0, c: 1, d: 0 }, 222, 110, 1), { a: 1, b: 0, c: 2, d: 0 });
  assert.equal(grip(wide, initial(wide), 20, 210), -1);
  for (const st of [{ a: -3, b: 3, c: 3, d: -3 }, { a: 0, b: 0, c: 0, d: 0 }]) assert.ok(!JSON.stringify(draw(wide, st)).includes("null"));
  assert.ok(check({ ...wide, target: [9, 0, 0, 1] }).length > 0);
  assert.ok(check({ ...flat, goal: { measure: "miss", equals: 0 } }).length > 0, "miss needs a target");
  assert.ok(check({ ...wide, target: [1, 0, 0, 1] }).length > 0, "already there at the start");
  assert.ok(check({ ...flat, goal: { measure: "det", equals: 99 } }).length > 0);
});

test("the rectangle and the joined graph", () => {
  const patch: Scene = { type: "scene", kind: "rectangle", perimeter: 20, area: 24, prompt: "Make it.", success: "6 by 4.", goal: { measure: "off", equals: 0 } };
  const jump: Scene = { type: "scene", kind: "join", mode: "shift", left: [1, 1], right: [0, 0.5], at: 2, from: 0, to: 4, k: [-1, 4, 0.5], start: 0, prompt: "Close it.", success: "Closed.", goal: { measure: "gap", equals: 0 } };
  const hole: Scene = { type: "scene", kind: "join", mode: "point", left: [1, 1], right: [5, -1], at: 2, from: 0, to: 4, k: [0, 5, 0.5], start: 1, prompt: "Fill it.", success: "Filled.", goal: { measure: "miss", equals: 0 } };
  for (const s of [patch, jump, hole]) {
    assert.deepEqual(check(s), [], s.kind); assert.ok(draggable(s) && describe(s).length > 20 && !met(s, initial(s)));
    for (const st of states(s)) { for (const v of Object.values(measures(s, st))) assert.ok(Number.isFinite(v)); assert.ok(!JSON.stringify(draw(s, st)).includes("null")); assert.ok(!/NaN|undefined/.test(readout(s, st))); }
  }
  assert.deepEqual(measures(patch, { w: 6, h: 4 }), { w: 6, h: 4, perimeter: 20, area: 24, off: 0, shortOfBest: 1 });
  assert.equal(measures(patch, { w: 5, h: 5 }).shortOfBest, 0);
  assert.equal(measures(patch, { w: 6, h: 6 }).shortOfBest, 999, "another perimeter is not in the running");
  assert.equal(readout(patch, { w: 6, h: 4 }), "6 by 4 · perimeter 20 · area 24");
  assert.deepEqual(pointer(patch, initial(patch), 60 + 6 * 20, 196 - 4 * 20), { w: 6, h: 4 });
  assert.deepEqual(pointer(patch, initial(patch), 9999, -9999), { w: 9, h: 9 });
  assert.equal(readout(jump, { k: 2 }), "From the left: 3 · from the right: 3");
  assert.equal(readout(hole, { k: 1 }), "Both sides head for 3 · the point is at 1");
  // dragging the point to the height both sides head for fills the hole (the same scale as the drawing)
  const target = draw(hole, { k: 3 }).filter((x) => x.t === "circle" && x.role === "handle")[0] as { cx: number; cy: number };
  assert.ok(met(hole, pointer(hole, initial(hole), target.cx, target.cy)));
  const grip2 = draw(jump, { k: 2 }).filter((x) => x.t === "circle" && x.role === "handle")[0] as { cx: number; cy: number };
  assert.ok(met(jump, pointer(jump, initial(jump), grip2.cx, grip2.cy)));
  assert.ok(check({ ...patch, perimeter: 99 }).length > 0 && check({ ...jump, at: 9 }).length > 0 && check({ ...jump, mode: "slide" }).length > 0 && check({ ...hole, start: 9 }).length > 0);
});

test("the fraction bar, the number line and the rows of counters", () => {
  const bar: Scene = { type: "scene", kind: "fraction", target: [2, 3], show: true, prompt: "Show it.", success: "Same.", goal: { measure: "other", equals: 0 } };
  const hundred: Scene = { type: "scene", kind: "fraction", target: [1, 4], pieces: 100, prompt: "Shade it.", success: "25.", goal: { measure: "miss", equals: 0 } };
  const one: Scene = { type: "scene", kind: "fraction", target: [1, 4], shaded: 1, prompt: "Smaller.", success: "Smaller.", goal: { measure: "ahead", below: 0 } };
  const jump: Scene = { type: "scene", kind: "numberline", from: -10, to: 10, step: 1, start: 3, label: 5, jump: true, prompt: "Jump.", success: "There.", goal: { measure: "x", equals: -2 } };
  const near: Scene = { type: "scene", kind: "numberline", from: 340, to: 350, step: 1, start: 347, near: 10, prompt: "Nearest.", success: "350.", goal: { measure: "x", equals: 350 } };
  const dots: Scene = { type: "scene", kind: "array", total: 12, rows: 3, prompt: "Make 12.", success: "3 rows of 4.", goal: { measure: "off", equals: 0 } };
  const free: Scene = { type: "scene", kind: "array", total: 13, prompt: "Make 13.", success: "One row.", goal: { measure: "off", equals: 0 } };
  for (const s of [bar, hundred, one, jump, near, dots, free]) {
    assert.deepEqual(check(s), [], s.kind); assert.ok(describe(s).length > 20 && !met(s, initial(s)));
    for (const st of states(s)) {
      for (const v of Object.values(measures(s, st))) assert.ok(Number.isFinite(v));
      const shapes = JSON.stringify(draw(s, st));
      assert.ok(!shapes.includes("null") && !/NaN|undefined/.test(shapes + readout(s, st)));
      for (const sh of draw(s, st)) { const xs = sh.t === "rect" ? [sh.x, sh.x + sh.w] : sh.t === "circle" ? [sh.cx - sh.r, sh.cx + sh.r] : sh.t === "line" ? [sh.x1, sh.x2] : []; for (const x of xs) assert.ok(x >= 0 && x <= 340, `${s.kind} stays in the box`); }
    }
  }
  // fractions are compared exactly: 4/6, 6/9 and 8/12 are 2/3, and never more shaded than there are pieces
  assert.equal(measures(bar, { n: 6, k: 4 }).miss, 0); assert.equal(measures(bar, { n: 3, k: 2 }).other, 1); assert.equal(measures(bar, { n: 3, k: 2 }).exact, 0);
  assert.equal(measures(bar, { n: 4, k: 9 }).k, 4);
  assert.equal(readout(bar, { n: 6, k: 4 }), "4 of 6 equal pieces shaded"); assert.equal(readout(bar, { n: 1, k: 1 }), "1 of 1 equal piece shaded");
  assert.equal(draw(bar, { n: 6, k: 4 }).filter((x) => x.role === "cell").length, 4); assert.equal(draw(bar, { n: 6, k: 4 }).filter((x) => x.role === "wedge1").length, 2);
  assert.equal(draw(hundred, { k: 25 }).filter((x) => x.role === "cell").length, 25);
  assert.ok(draggable(bar) && draggable(hundred) && !draggable(one), "a bar with its shaded pieces fixed has nothing to drag");
  assert.deepEqual(pointer(bar, { n: 6, k: 0 }, 30 + (280 * 4) / 6, 90), { n: 6, k: 4 });
  assert.deepEqual(pointer(hundred, { k: 0 }, 95 + 5 * 15, 34 + 2 * 15 + 7), { k: 25 });
  assert.deepEqual(pointer(one, { n: 3 }, 200, 90), { n: 3 });
  // the number line: the point follows the finger to the nearest mark
  const at = draw(jump, { x: -2 }).filter((x) => x.t === "circle" && x.role === "handle")[0] as { cx: number; cy: number };
  assert.deepEqual(pointer(jump, initial(jump), at.cx, at.cy), { x: -2 });
  assert.deepEqual(measures(jump, { x: -2 }), { x: -2, moved: -5 });
  assert.equal(readout(near, { x: 350 }), "At 350");
  assert.deepEqual(measures(dots, { c: 4 }), { rows: 3, cols: 4, count: 12, off: 0, left: 0 });
  assert.equal(readout(dots, { c: 5 }), "3 rows of 5 = 15 · 3 more than 12"); assert.equal(readout(free, { r: 1, c: 13 }), "1 row of 13 = 13");
  assert.deepEqual(pointer(free, initial(free), 37 + 3 * 19, 24 + 1 * 19), { r: 2, c: 4 });
  for (const bad of [{ ...bar, target: [5, 3] }, { ...hundred, pieces: 50 }, { ...one, pieces: 4 }, { ...jump, start: 3.5 }, { ...jump, step: 0 }, { ...near, from: 400 }, { ...dots, total: 1 }, { ...dots, rows: 11 }]) assert.ok(check(bad).length > 0, JSON.stringify(bad).slice(0, 80));
});

test("the commas: each follows the finger; only the asked grouping finishes", () => {
  const s: Scene = { type: "scene", kind: "commas", digits: "211000000", style: "international", prompt: "Group in threes.", success: "211 million.", goal: { measure: "miss", equals: 0 } };
  assert.deepEqual(check(s), []); assert.ok(draggable(s) && !met(s, initial(s)));
  assert.deepEqual(controls(s).map((c) => [c.key, c.min, c.max, c.start]), [["a", 1, 8, 2], ["b", 1, 8, 1]]);
  assert.equal(measures(s, { a: 3, b: 6 }).miss, 0); assert.equal(measures(s, { a: 3, b: 3 }).miss, 1); assert.equal(measures(s, { a: 1, b: 2 }).miss, 2);
  for (const st of states(s)) { const shapes = draw(s, st); assert.ok(!/NaN|undefined|null/.test(JSON.stringify(shapes))); assert.equal(shapes.filter((x) => x.role === "digit").length, 9); assert.equal(shapes.filter((x) => x.role === "comma").length, 2); for (const sh of shapes) if (sh.t === "text" || sh.t === "circle") { const x = sh.t === "text" ? sh.x : sh.cx; assert.ok(x > 10 && x < 330); } }
  // take hold of the comma nearer the finger and drop it between the third and fourth digits from the right
  const handles = (st: Record<string, number>) => draw(s, st).filter((x) => x.t === "circle") as { cx: number; cy: number }[];
  const [ha, hb] = handles(initial(s)), goal = handles({ a: 3, b: 6 });
  assert.equal(grip(s, initial(s), ha.cx, ha.cy), 0); assert.equal(grip(s, initial(s), hb.cx - 20, hb.cy), 0, "the nearer comma is taken");
  const moved = pointer(s, initial(s), goal[0].cx, goal[0].cy, 0);
  assert.equal(moved.a, 3); assert.ok(met(s, pointer(s, moved, goal[1].cx, goal[1].cy, 1)));
  assert.ok(check({ ...s, digits: "012345" }).length > 0 && check({ ...s, digits: "123" }).length > 0 && check({ ...s, style: "roman" }).length > 0 && check({ ...s, digits: "1234567890", style: "indian" }).length > 0);
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

test("every scene of a released question states that question's own mathematics", () => {
  // every released question of these families has a scene; `audel` has one for its first form only (c·e^(ax) + d·log x)
  const WHOLE = ["ahtri", "asline", "audfp", "audsum", "cint", "dpow", "pint"];
  assert.deepEqual([...SCENE_FAMILIES].sort(), [...WHOLE, "audel"].sort());
  const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
  let scenes = 0;
  for (const fam of SCENE_FAMILIES) {
    const def = FAMILIES.get(fam)!;
    let shown = 0, total = 0;
    for (const q of pool(fam).items) {
      total++;
      const s = sceneForQuestion(q.id);
      if (!s) continue;
      shown++;
      assert.deepEqual(check(s), [], q.id);
      assert.ok(s.prompt.length <= 160 && s.success.length <= 160, q.id);
      const mine = sceneAnswer(s), theirs = numericValue(q.answer), probes = sceneProbes(s);
      if (mine !== null && theirs !== null && !/[a-zA-Z]/.test(q.answer)) {
        // a number: the scene's own number is the verified answer, the family's independent check accepts it, and it is no predicted mistake
        assert.ok(near(mine, theirs), `${q.id}: scene ${mine} vs answer ${q.answer}`);
        assert.ok(def.validate(q.params, mine), `${q.id}: independent check`);
        for (const b of def.bugs(q.params)) if (typeof b.predict === "number" && !near(b.predict, theirs)) assert.ok(!near(b.predict, mine), `${q.id}: not the ${b.id} mistake`);
      } else {
        // an expression in x: the verified answer passes through every point the scene states
        assert.ok(probes.length > 0, `${q.id}: nothing to hold against ${q.answer}`);
        const tree = parse(rhs(q.answer));
        for (const [x, y] of probes) assert.ok(Math.abs(evaluate(tree, { x }) - y) <= 1e-9 * Math.max(1, Math.abs(y)), `${q.id}: answer ${q.answer} at x = ${x} is not ${y}`);
      }
    }
    scenes += shown;
    assert.ok(total >= 80, `${fam} pool`);
    if (WHOLE.includes(fam)) assert.equal(shown, total, `${fam}: every released question has a scene`);
    else assert.ok(shown >= 20, `${fam}: ${shown} of ${total}`);
  }
  assert.ok(scenes >= 3000, `${scenes} scenes`);
  assert.equal(sceneForQuestion("gen:pint:1,3,5,2:mc")?.kind, "strips");
  assert.equal(sceneForQuestion("gen:nosuch:1,2"), null);
  assert.equal(sceneForQuestion("gen:constructor:1"), null);
  assert.equal(sceneForQuestion("not an id"), null);
});
