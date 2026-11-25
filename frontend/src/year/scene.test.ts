/**
 * scene@1 / scenes@1: the scene engine is deterministic, refuses scenes that are malformed or cannot be completed, and every
 * scene offered for a released question states the mathematics of that question (its own number equals the family's
 * verified answer, and the family's independent validator accepts it).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { evaluate, numericValue, parse, rhs } from "../../../packages/learning/src/answer-types";
import { check, controls, curveOf, sceneBox, curveText, derivative, describe, draggable, draw, evalPoly, grip, fmt, initial, integral, measures, met, pointer, polyText, readout, set, states, type Scene } from "../../../packages/learning/src/scene";
import { FIGURE_SCENES, SCENE_FAMILIES, sceneAnswer, sceneIsPicture, sceneForQuestion, sceneProbes } from "../../../packages/learning/src/scenes";

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
  const size: Scene = { type: "scene", kind: "numberline", from: -6, to: 6, step: 1, start: 2, size: true, prompt: "Slide.", success: "4 from 0.", goal: { measure: "x", equals: -4 } };
  assert.equal(readout(size, { x: -4 }), "−4 is 4 from 0 · |−4| = 4"); assert.equal(measures(size, { x: -4 }).size, 4);
  assert.ok(JSON.stringify(draw(size, { x: -4 })).includes("4 from 0") && !JSON.stringify(draw(size, { x: 0 })).includes("from 0"));
  assert.deepEqual(check({ ...size, from: 1 } as Scene).length, 1);
  const dots: Scene = { type: "scene", kind: "array", total: 12, rows: 3, prompt: "Make 12.", success: "3 rows of 4.", goal: { measure: "off", equals: 0 } };
  const free: Scene = { type: "scene", kind: "array", total: 13, prompt: "Make 13.", success: "One row.", goal: { measure: "off", equals: 0 } };
  for (const s of [bar, hundred, one, jump, near, size, dots, free]) {
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
  assert.deepEqual(measures(jump, { x: -2 }), { x: -2, moved: -5, size: 2 });
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

test("the cards: dragged into order, smallest on the left", () => {
  const s: Scene = { type: "scene", kind: "order", values: [82, 48, 28, 84], ask: "largest", prompt: "Order them.", success: "Done.", goal: { measure: "wrong", equals: 0 } };
  assert.deepEqual(check(s), []); assert.ok(draggable(s) && !met(s, initial(s)));
  assert.equal(readout(s, initial(s)), "Now: 82, 48, 28, 84"); assert.equal(measures(s, initial(s)).wrong, 2);
  // take the 28 (third card) and drop it in the first slot; the others close up and every card has its own place
  const cards = (st: Record<string, number>) => draw(s, st).filter((x) => x.t === "rect") as { x: number; w: number }[];
  const c = cards(initial(s)), mid = (k: number) => c[k].x + c[k].w / 2;
  assert.equal(grip(s, initial(s), mid(2), 100), 2);
  let st = pointer(s, initial(s), mid(0), 100, 2);
  assert.equal(readout(s, st), "Now: 28, 82, 48, 84"); assert.deepEqual(Object.values(st).sort(), [1, 2, 3, 4]);
  st = pointer(s, st, mid(2), 100, grip(s, st, mid(1), 100));
  assert.equal(readout(s, st), "Now: 28, 48, 82, 84"); assert.ok(met(s, st)); assert.equal(sceneAnswer(s), 82);
  // sliders may give two cards the same place: the picture still shows every card once, in a fixed order
  for (const any of states(s)) { const shapes = draw(s, any); assert.equal(shapes.filter((x) => x.role === "card").length, 4); assert.ok(!/NaN|undefined|null/.test(JSON.stringify(shapes) + readout(s, any))); }
  // cards given already in order start out of order, so there is something to do
  const sorted: Scene = { ...s, values: [1, 2, 3] };
  assert.deepEqual(check(sorted), []); assert.equal(readout(sorted, initial(sorted)), "Now: 2, 3, 1");
  assert.ok(check({ ...s, values: [5] }).length > 0 && check({ ...s, values: [5, 5] }).length > 0 && check({ ...s, values: [1, 2, 3, 4, 5, 6] }).length > 0 && check({ ...s, ask: "middle" }).length > 0);
  // from the registry: a compare question brings its digit-swapped look-alikes, and a rounding question its own number line
  const cmp = sceneForQuestion("gen:aacmp:82,48,1")!;
  assert.deepEqual((cmp as { values: number[] }).values, [82, 48, 28, 84]); assert.equal(sceneAnswer(cmp), 48, "less: of the two asked about, not of the look-alikes");
  const rnd = sceneForQuestion("gen:aeround:3,2854")!;
  assert.equal(readout(rnd, initial(rnd)), "At 2854 · 854 from 2000 · 146 from 3000"); assert.equal(sceneAnswer(rnd), 3000);
});

test("scenes@4: a picture becomes a scene only when the scene arrives at the question's verified answer", () => {
  assert.deepEqual([...FIGURE_SCENES].sort(), ["array", "bars", "grid", "shape", "triangle"]);
  const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
  const made = new Map<string, number>();
  let families = 0;
  for (const [fam] of FAMILIES) {
    if (SCENE_FAMILIES.includes(fam)) continue;
    let any = false;
    for (const q of pool(fam).items) {
      const s = sceneForQuestion(q.id);
      if (!s) continue;
      any = true;
      const type = (q.figure as unknown as { type: string } | undefined)?.type;
      assert.ok(type && FIGURE_SCENES.includes(type), `${q.id}: a scene with no builder comes from the question's picture`);
      made.set(type!, (made.get(type!) ?? 0) + 1);
      assert.deepEqual(check(s), [], q.id); assert.ok(s.prompt.length <= 160 && s.success.length <= 160 && !met(s, initial(s)), q.id);
      const mine = sceneAnswer(s), theirs = numericValue(q.answer);
      assert.ok(mine !== null && theirs !== null && near(mine, theirs), `${q.id}: scene ${mine} vs answer ${q.answer}`);
      assert.ok(s.success.includes(fmt(Math.round(mine! * 1e6) / 1e6)) || s.success.includes(q.answer), `${q.id}: the closing words state the answer`);
      assert.ok([...states(s, 40000)].some((st) => met(s, st)), q.id);
    }
    if (any) families++;
  }
  assert.ok(families >= 13 && [...FIGURE_SCENES].every((t) => (made.get(t) ?? 0) > 0), `families ${families}; ${JSON.stringify([...made])}`);
  // a rectangle whose area is asked and one whose perimeter is asked get different closing words, from the same picture
  const area = sceneForQuestion(pool("rect").items.find((q) => sceneForQuestion(q.id))!.id)!, edge = sceneForQuestion(pool("rperim").items.find((q) => sceneForQuestion(q.id))!.id)!;
  assert.ok(/area is \d+\.$/.test(area.success) && /perimeter is \d+\.$/.test(edge.success));
  // no scene where the picture's own numbers do not give the answer: a shape that is not a rectangle has none
  const odd = [...FAMILIES.keys()].flatMap((f) => pool(f).items).find((q) => (q.figure as unknown as { type?: string; kind?: string } | undefined)?.type === "shape" && !["rectangle", "square"].includes((q.figure as unknown as { kind: string }).kind));
  assert.ok(odd && sceneForQuestion(odd.id) === null);
});

test("the bar chart: a level line slid to a bar's top reads the scale; for 'how many more', the gap above the shorter bar", () => {
  const birds = { labels: ["Crow", "Sparrow", "Parrot", "Myna"], values: [9, 2, 6, 4] };
  const read: Scene = { type: "scene", kind: "bars", ...birds, ask: { read: 2 }, prompt: "Read Parrot.", success: "6.", goal: { measure: "miss", equals: 0 } };
  const more: Scene = { type: "scene", kind: "bars", ...birds, ask: { more: [0, 1] }, prompt: "Crow above Sparrow.", success: "7 more.", goal: { measure: "miss", equals: 0 } };
  for (const s of [read, more]) {
    assert.deepEqual(check(s), []); assert.ok(draggable(s) && !met(s, initial(s)));
    for (const st of states(s)) { const shapes = draw(s, st); assert.ok(!/NaN|undefined|null/.test(JSON.stringify(shapes) + readout(s, st))); assert.equal(shapes.filter((x) => x.role === "cell").length, 4); for (const sh of shapes) if (sh.t === "rect") assert.ok(sh.x >= 0 && sh.x + sh.w <= 340 && sh.y >= 0 && sh.h >= 0); }
  }
  assert.ok(met(read, { y: 6 }) && !met(read, { y: 5 }) && !met(read, { y: 9 })); assert.equal(sceneAnswer(read), 6);
  assert.equal(readout(read, { y: 6 }), "The line is at 6");
  assert.ok(met(more, { y: 2 }) && !met(more, { y: 9 })); assert.equal(sceneAnswer(more), 7);
  assert.equal(readout(more, { y: 2 }), "The line is at 2 · Crow rises 7 above it"); assert.equal(readout(more, { y: 9 }), "The line is at 2 · Crow is level with it".replace("2", "9"));
  // the line follows the finger to the height of a bar's top
  const top = (draw(read, initial(read)).filter((x) => x.t === "rect")[2] as { y: number }).y;
  assert.ok(met(read, pointer(read, initial(read), 200, top)));
  // from the registry: the question's own words choose the bars, and only if they give the verified answer
  const q = pool("adbar").items.find((x) => /How many more/.test(x.prompt) && sceneForQuestion(x.id))!, s = sceneForQuestion(q.id)!;
  assert.ok("more" in (s as { ask: object }).ask); assert.equal(sceneAnswer(s), Number(q.answer));
  assert.ok(sceneIsPicture(q.id) && !sceneIsPicture("gen:aacmp:82,48,0") && !sceneIsPicture(pool("aaheavy").items[0].id), "only a scene made from the picture stands in for it");
  assert.equal(sceneForQuestion(pool("aaheavy").items[0].id), null, "a 'which one' question is not a reading of the scale");
  assert.ok(check({ ...read, ask: { read: 7 } }).length > 0 && check({ ...read, labels: ["a"] }).length > 0 && check({ ...more, ask: { more: [1, 1] } }).length > 0 && check({ ...read, values: [0, 0, 0, 0] }).length > 0);
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
  const WHOLE = ["aacmp", "aeround", "ahtri", "ajord", "asline", "audfp", "audsum", "cint", "dpow", "pint"];
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
      if (s.kind === "order" && mine === null) {
        // a list to put in order: the cards are the question's own numbers, and the order that finishes the scene is the verified answer
        const listed = (q.answer.match(/[−-]?\d+/g) ?? []).map((t) => Number(t.replace("−", "-")));
        assert.deepEqual([...s.values].sort((a, b) => a - b), listed, q.id);
        const done = Object.fromEntries(listed.map((v, at) => [`p${s.values.indexOf(v)}`, at + 1]));
        assert.ok(met(s, done) && readout(s, done) === `Now: ${listed.map(fmt).join(", ")}`, q.id);
      } else if (mine !== null && theirs !== null && !/[a-zA-Z]/.test(q.answer)) {
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

test("tally@1: the counter and the lift counts every number, pauses at 0, keeps to its floors and its order", async () => {
  const E = await import("../../../packages/learning/src/scene");
  const { tallyClicks } = await import("../../../packages/learning/src/tally");
  // (a counter with tiles: a thermometer; a scene without ₹, °C or m is a lift ride, tested below)
  const add: Scene = { type: "scene", kind: "tally", start: 0, tiles: [2, 6], floors: [0, 10], unit: "°C", prompt: "Put the tiles in the lift.", success: "2 and 6 more make 8.", goal: { measure: "total", equals: 8 } };
  const down: Scene = { type: "scene", kind: "tally", start: 5, tiles: [-10], floors: [-6, 6], unit: "°C", prompt: "Put the tile in.", success: "5 − 10 = −5.", goal: { measure: "total", equals: -5 } };
  for (const s of [add, down]) {
    assert.deepEqual(check(s), [], s.prompt);
    assert.equal(met(s, initial(s)), false);
    assert.ok([...states(s)].some((st) => met(s, st)), "the goal is reachable");
    assert.ok(draw(s, initial(s)).length > 10 && draggable(s) && describe(s).includes("lift"));
  }
  // the click path: counting on through every number, and counting back through 0
  assert.deepEqual(tallyClicks(0, [2, 6]), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const back = tallyClicks(5, [-10]);
  assert.ok(back.includes(0) && back[back.length - 1] === -5 && back.every((v, i) => i === 0 || Math.abs(v - back[i - 1]) === 1));
  // the engine changes by whole tiles; frames show every number in between, one floor per click, with a pause at 0
  const one = set(add, initial(add), "dropped", 1), two = set(add, one, "dropped", 2);
  assert.equal(measures(add, two).total, 8);
  assert.equal(readout(add, two), "2 + 6 = 8");
  const fr = E.frames(add, one, two), nums = fr.map((f) => f.state.at ?? measures(add, f.state).total);
  assert.deepEqual(nums, [2, 3, 4, 5, 6, 7, 8], "the counter does not jump");
  const fd = E.frames(down, initial(down), set(down, initial(down), "dropped", 1));
  assert.deepEqual(fd.map((f) => f.state.at ?? -5), [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5]);
  assert.ok(fd.find((f) => f.state.at === 0)!.ms > fd[1].ms, "a beat at 0");
  assert.equal(readout(down, set(down, initial(down), "dropped", 1)), "5 − 10 = −5");
  // a description whose lift would leave its floors is refused
  assert.match(check({ ...down, floors: [0, 6] }).join(), /leave the drawn floors/);
  assert.match(check({ ...add, tiles: [2, 0] }).join(), /non-zero/);
  // drag or tap: a tile is gripped in the tray, let go above it goes in; out of turn it is refused and goes back
  const xy = (s: Scene, i: number) => { const sh = draw(s, initial(s)).filter((d) => d.t === "text" && d.role === "tally-tiletext"); const t = sh[i] as { x: number; y: number }; return [t.x, t.y - 9] as const; };
  const [x1, y1] = xy(add, 1);
  assert.equal(grip(add, initial(add), x1, y1), 1);
  let st = pointer(add, initial(add), x1, y1, 1); st = pointer(add, st, 120, 100, 1);
  const refused = E.release(add, st, 120, 100);
  assert.equal(refused.dropped, 0); assert.equal(refused.refused, 2); assert.match(E.nudge(add, refused) ?? "", /\+2/);
  const [x0, y0] = xy(add, 0);
  const tapped = E.release(add, pointer(add, initial(add), x0, y0, 0), x0 + 2, y0);
  assert.equal(tapped.dropped, 1, "a tap puts the tile in");
  assert.equal(E.release(add, pointer(add, pointer(add, initial(add), x0, y0, 0), x0 + 60, y0, 0), x0 + 60, y0).dropped, 0, "let go on the tray, it goes back");
  assert.equal(grip(add, tapped, x0, y0), -1, "a used tile is gone");
  // any order: the second tile may go first, and the readout keeps the order it went in
  const any: Scene = { ...add, anyOrder: true };
  const first = E.release(any, pointer(any, initial(any), x1, y1, 1), 120, 100);
  assert.equal(first.dropped, 1); assert.equal(measures(any, first).total, 6); assert.equal(readout(any, first), "0 + 6 = 6");
  const both = E.release(any, pointer(any, first, x0, y0, 0), 120, 100);
  assert.equal(readout(any, both), "6 + 2 = 8"); assert.ok(met(any, both));
});

test("lift@1: the lift ride: Start, a finger's press, one press per floor said aloud, a wrong button refused, the sums", async () => {
  const E = await import("../../../packages/learning/src/scene");
  const { liftFloors, sayMs } = await import("../../../packages/learning/src/lift");
  const s: Scene = { type: "scene", kind: "tally", start: 3, tiles: [-5, 4], floors: [-4, 6], prompt: "Go down 5 floors, then up 4.", success: "3 − 5 = −2, then −2 + 4 = 2.", goal: { measure: "total", equals: 2 } };
  assert.deepEqual(check(s), []);
  assert.ok(E.isLift(s) && !E.isLift({ ...s, unit: "₹" }) && !E.isLift({ ...s, unit: "°C" }) && !E.isLift({ ...s, unit: "m" }));
  assert.ok(describe(s).includes("lift") && describe(s).includes("car park") && !describe(s).includes("makes 2"));
  // only the floors the ride needs, a floor of margin (not a fixed −4 … 6); the ground when the ride is near it
  assert.deepEqual(liftFloors(s as never), [-3, 4]);
  assert.deepEqual(liftFloors({ start: 6, tiles: [3] }), [5, 10]);
  assert.deepEqual(liftFloors({ start: 2, tiles: [3] }), [0, 6]);
  assert.deepEqual(liftFloors({ start: 25, tiles: [-12] }), [12, 26]);
  // a press is a tap: the finger goes down on a button and comes up on it; slid off, nothing is pressed
  const at = (st: Record<string, number>, i: number): [number, number] => {
    const b = draw(s, st).find((d) => (d.t === "circle" || d.t === "rect") && d.tap?.i === i) as { cx?: number; cy?: number; x?: number; y?: number; w?: number; h?: number } | undefined;
    assert.ok(b, `button ${i} is drawn as a button`);
    return b.cx !== undefined ? [b.cx, b.cy!] : [b.x! + b.w! / 2, b.y! + b.h! / 2];
  };
  const tap = (st: Record<string, number>, i: number) => E.release(s, pointer(s, st, ...at(st, i), grip(s, st, ...at(st, i))), ...at(st, i));
  let st: Record<string, number> = initial(s);
  assert.equal(E.cue(s, st), "Chintu takes the lift");
  assert.equal(readout(s, st), "");
  assert.equal(E.release(s, pointer(s, st, ...at(st, 2), 2), 5, 5).run, undefined, "slid off Start: nothing");
  // before Start the lift buttons do nothing
  assert.deepEqual(E.frames(s, st, tap(st, 1)).map((f) => f.say).filter(Boolean), []);
  const log: string[] = [];
  const go = (next: Record<string, number>) => { const fr = E.frames(s, st, next); for (const f of fr) if (f.say) log.push(f.say); for (const f of fr) if (f.say && f.say.split(" ").length > 3 && f !== fr[fr.length - 1]) assert.ok(f.ms >= sayMs(f.say), `"${f.say}" is given the time to be said`); st = fr[fr.length - 1].state; return fr; };
  const intro = go(tap(st, 2));
  assert.deepEqual(log, ["Chintu is on floor three.", "Go down five floors. Press down, five times.", "two", "Now you. Four more."]);
  assert.ok(intro.some((f) => f.state.fin !== undefined && draw(s, f.state).some((d) => d.role === "lift-finger")), "a finger shows the first press");
  assert.ok(intro.some((f) => f.state.door === 2) && intro.some((f) => f.sound === 1), "the doors close, and a ding at the floor");
  assert.ok(intro.filter((f) => !f.motion).some((f) => f.state.fin === 2), "the finger is shown without motion too");
  assert.equal(E.cue(s, st), "Now you");
  // the wanted button glows, the other is dimmed; the task card says ▼ 5 with one dot filled
  let sh = draw(s, st);
  assert.ok(sh.some((d) => d.role === "lift-glow") && sh.some((d) => d.role === "lift-up-dim") && sh.some((d) => d.t === "text" && d.s === "▼ 5"));
  assert.equal(sh.filter((d) => d.role === "lift-tick-on").length, 1);
  assert.ok(sh.some((d) => d.t === "text" && d.role === "lift-disp-text" && d.s === "2"));
  // the wrong button shakes and says which way
  log.length = 0;
  go(tap(st, 0));
  assert.deepEqual(log, ["Down, not up."]);
  assert.equal(E.nudge(s, st), "Down, not up.");
  assert.ok(draw(s, st).some((d) => d.role === "lift-up-dim-no"), "the wrong button shakes and stays dimmed");
  assert.equal(E.remind(s, st), "Press down. Four more.");
  // four presses at once (fast taps, queued by the player): every floor is said, 0 is the shop, then where he is
  log.length = 0;
  let q = st; for (let i = 0; i < 4; i++) q = E.press(s, q, 1);
  const fast = go(q);
  assert.deepEqual(log, ["one", "zero. The shop.", "minus one", "minus two", "Floor minus two. That is basement two, in the car park. Now go up four floors."]);
  assert.equal(fast.find((f) => f.say === "zero. The shop.")!.sound, 2);
  assert.equal(E.nudge(s, st), null, "a good press clears the refusal");
  assert.equal(readout(s, st), "3 − 5 = −2");
  assert.equal(readout(s, fast.find((f) => f.say === "minus two")!.state), "", "the sum comes with its line");
  assert.equal(E.cue(s, st), "Now go up 4 floors");
  assert.ok(draw(s, st).some((d) => d.role === "lift-here") && draw(s, st).some((d) => d.t === "text" && d.role === "lift-disp-text" && d.s === "−2"));
  assert.equal(met(s, st), false, "−2 on the way is not the end");
  log.length = 0;
  for (let i = 0; i < 3; i++) go(tap(st, 0));
  const last = go(tap(st, 0));
  assert.deepEqual(log, ["minus one", "zero. The shop.", "one", "two", "Floor two. Three, minus five, plus four, makes two."]);
  // "Well done!" and Again only once the whole sum has been said (then Again works at once: nothing is playing)
  for (const f of last.slice(0, -1)) { assert.notEqual(E.cue(s, f.state), "Well done!"); assert.ok(!draw(s, f.state).some((d) => d.t === "rect" && d.tap), "no Again yet"); }
  // about 0.8 s a floor (the mock's pace), every floor word still said
  const perFloor = last.slice(0, last.findIndex((f) => f.say === "two") + 1).reduce((a, f) => a + f.ms, 0);
  assert.ok(perFloor <= 900, `${perFloor} ms for one floor`);
  assert.ok(met(s, st));
  assert.equal(readout(s, st), "3 − 5 + 4 = 2");
  sh = draw(s, st);
  assert.ok(sh.some((d) => d.t === "rect" && d.tap?.label === "Again") && !sh.some((d) => d.role === "lift-glow"));
  // Again: the whole ride again, from floor 3
  log.length = 0;
  go(tap(st, 2));
  assert.equal(log[0], "Chintu is on floor three.");
  assert.equal(met(s, st), false);
  // by keyboard: press() is the same as a tap; the slider sets the moves done
  assert.equal(measures(s, E.press(s, st, 1)).total, 3);
  assert.equal(liftAt(s, set(s, initial(s), "dropped", 1)), -2);
  assert.ok(met(s, set(s, initial(s), "dropped", 2)));
  // a press the wrong way while the car still moves is dropped, not refused seconds later; every other press waits its turn
  assert.equal(E.queueable(s, st, E.press(s, st, 1)), true); assert.equal(E.queueable(s, st, E.press(s, st, 0)), false);
  // the building: rows of at least 28, a window that follows the car on a long ride, stretched beside the panel when short
  const { liftLayout } = await import("../../../packages/learning/src/scene-figures");
  const tall = liftLayout([-30, 20], [-40, 22]), short = liftLayout([2], [0, 6]);
  assert.ok(tall.H >= 28 && tall.seen === 16 && short.H * short.rows >= short.panel - 1, JSON.stringify([tall, short]));
  const long: Scene = { ...s, start: 10, tiles: [-30, 20], floors: [-25, 15], goal: { measure: "dropped", equals: 2 } };
  assert.deepEqual(check(long), []);
  const car = (x: Record<string, number>) => (draw(long, x).find((d) => d.role === "lift-car") as { y: number }).y;
  for (let p = 0; p <= 50; p++) { const y = car({ go: 1, p }); assert.ok(y >= 0 && y + 30 <= sceneBox(long).h, `the car is in view at press ${p}`); }
  assert.ok(Math.abs(car({ go: 1, p: 15 }) + 19 - sceneBox(long).h / 2) < 30, "mid-ride the building scrolls to keep the car in the middle");
  // reduced motion keeps every word and every floor
  const still = E.frames(s, set(s, initial(s), "dropped", 1), set(s, initial(s), "dropped", 2)).filter((f) => !f.motion);
  assert.deepEqual(still.map((f) => f.say).filter(Boolean).slice(0, 4), ["minus one", "zero. The shop.", "one", "two"]);
  // a move of one floor gets no finger: "Press up, once."
  const one: Scene = { ...s, tiles: [1], goal: { measure: "dropped", equals: 1 } };
  assert.deepEqual(E.frames(one, initial(one), E.press(one, initial(one), 2)).map((f) => f.say).filter(Boolean), ["Chintu is on floor three.", "Go up one floor. Press up, once."]);
  function liftAt(sc: Scene, x: Record<string, number>) { const t = draw(sc, x).find((d) => d.role === "lift-disp-text") as { s: string }; return Number(t.s.replace("−", "-")); }
});

test("play@1: taps at 80, 250 and 600 ms apart each move the lift one floor; none is lost, a wrong one is dropped", async () => {
  const E = await import("../../../packages/learning/src/scene");
  const { Playback } = await import("../../../packages/learning/src/scene-play");
  const s: Scene = { type: "scene", kind: "tally", start: 3, tiles: [-5, 4], floors: [-4, 6], prompt: "Go down 5 floors, then up 4.", success: "Done.", goal: { measure: "total", equals: 2 } };
  for (const gap of [1, 80, 250, 600, 1500]) {
    // a fake clock: timers run in time order as the clock moves on
    let now = 0;
    const timers: { at: number; fn: () => void }[] = [];
    const run = (until: number) => { for (;;) { timers.sort((a, b) => a.at - b.at); const t = timers[0]; if (!t || t.at > until) break; timers.shift(); now = t.at; t.fn(); } now = until; };
    let shown: Record<string, number> = initial(s);
    const said: string[] = [];
    const pb: InstanceType<typeof Playback> = new Playback(s, initial(s), { state: (n) => { shown = n; }, show: () => undefined, frame: (f) => { if (f.say) said.push(f.say); }, done: () => undefined, later: (fn, ms) => timers.push({ at: now + ms, fn }) });
    // a tap is the player's: finger down on the button (pointer), finger up on it (release), both from `live`
    const tap = (i: number) => { const [x, y] = i === 0 ? [273, 126] : i === 1 ? [273, 226] : [273, 320]; pb.apply(E.pointer(s, pb.live, x, y)); pb.apply(E.release(s, pb.live, x, y)); };
    tap(2); run(now + 60000);
    assert.equal(liftFloor(pb.live), 2, "after the finger's press");
    for (let k = 0; k < 4; k++) { tap(1); run(now + gap); }
    tap(1); run(now + gap); // one too many, while the car still moves: dropped (no "Down, not up." to a press that was right then)
    run(now + 60000);
    assert.equal(liftFloor(shown), -2, `taps ${gap} ms apart: four floors down`);
    assert.ok(!said.includes("Up, not down."), `taps ${gap} ms apart: ${said.join(" | ")}`);
    for (let k = 0; k < 4; k++) { tap(0); run(now + gap); }
    run(now + 60000);
    assert.equal(liftFloor(shown), 2, `taps ${gap} ms apart: four floors up`);
    assert.ok(E.met(s, shown));
    assert.deepEqual(said.filter((t) => /^(minus |zero|one$|two$)/.test(t)), ["two", "one", "zero. The shop.", "minus one", "minus two", "minus one", "zero. The shop.", "one", "two"], `taps ${gap} ms apart`);
  }
  function liftFloor(x: Record<string, number>) { return Number((draw(s, x).find((d) => d.role === "lift-disp-text") as { s: string }).s.replace("−", "-")); }
});

test("boxes@1: things in two boxes are counted box by box, then put on the ten-spot board in order", async () => {
  const E = await import("../../../packages/learning/src/scene");
  const { boxesNow } = await import("../../../packages/learning/src/boxes");
  const s: Scene = { type: "scene", kind: "boxes", a: 3, b: 2, thing: "🥭", names: ["mango", "mangoes"], prompt: "Count the mangoes in this box. Tap each one.", success: "Well done!", goal: { measure: "placed", equals: 5 } };
  assert.deepEqual(check(s), []);
  assert.equal(met(s, initial(s)), false);
  assert.ok([...states(s)].some((st) => met(s, st)), "the goal is reachable by the slider too");
  // refused: a total over the board's ten, a box with nothing, a goal that is not every thing on the board
  assert.match(check({ ...s, a: 6, b: 5, goal: { measure: "placed", equals: 11 } }).join(), /at most 10/);
  assert.match(check({ ...s, b: 0, goal: { measure: "placed", equals: 3 } }).join(), /from 1/);
  assert.match(check({ ...s, a: 2.5 }).join(), /from 1/);
  assert.match(check({ ...s, goal: { measure: "placed", equals: 4 } }).join(), /every thing/);
  assert.match(check({ ...s, names: ["mango"] as unknown as [string, string] }).join(), /names/);
  // the description says what is there and what to do, never the sum
  assert.ok(describe(s).includes("3 in the first box") && describe(s).includes("ten spots") && !describe(s).includes("5"));
  assert.ok(draggable(s));
  // a tap, as the player sends it: a finger goes down on a thing and comes up where it went down
  const tap = (st: Record<string, number>, i: number) => E.release(s, pointer(s, st, ...xy(st, i), grip(s, st, ...xy(st, i))), ...xy(st, i));
  const xy = (st: Record<string, number>, i: number): [number, number] => {
    const hit = draw(s, st).find((d) => d.t === "rect" && d.tap?.i === i) as { x: number; y: number; w: number; h: number } | undefined;
    assert.ok(hit, `thing ${i} is drawn as a button`);
    return [hit.x + hit.w / 2, hit.y + hit.h / 2];
  };
  const said = (a: Record<string, number>, b: Record<string, number>) => E.frames(s, a, b).map((f) => f.say).filter(Boolean);
  let st: Record<string, number> = initial(s);
  assert.equal(E.cue(s, st), "Count this box");
  assert.equal(draw(s, st).filter((d) => d.t === "rect" && d.tap).length, 5, "five things, each a button");
  // the second box first: refused, it is the first box that shakes, "First this box."
  const wrong = tap(st, 3);
  assert.equal(measures(s, wrong).counted, 0);
  assert.equal(E.nudge(s, wrong), "First this box.");
  assert.deepEqual(said(st, wrong), ["First this box."]);
  assert.ok(draw(s, wrong).some((d) => d.role.startsWith("boxes-box-no")));
  st = wrong;
  // count the first box: each tap says its number; a thing tapped twice is not counted twice
  let next = tap(st, 1); assert.deepEqual(said(st, next), ["one"]); st = next;
  assert.equal(E.nudge(s, st), null, "a good tap clears the refusal");
  assert.equal(measures(s, tap(st, 1)).counted, 1);
  next = tap(st, 0); assert.deepEqual(said(st, next), ["two"]); st = next;
  assert.ok(draw(s, st).some((d) => d.t === "text" && d.role === "boxes-count-text" && d.s === "2"), "the thing is numbered");
  next = tap(st, 2); assert.deepEqual(said(st, next), ["three", "three mangoes.", "Now count this box."]); st = next;
  assert.equal(E.cue(s, st), "Now count this box");
  assert.ok(draw(s, st).some((d) => d.t === "text" && d.role === "boxes-badge-text" && d.s === "3"), "the first box has its number");
  assert.equal(readout(s, st), "");
  // now the first box is refused: "Now this box."
  assert.equal(E.nudge(s, tap(st, 0)), "Now this box.");
  // the second box counts from 1 again; its last thing starts the finger's demonstration, which puts one thing on
  next = tap(st, 4); assert.deepEqual(said(st, next), ["one"]); st = next;
  next = tap(st, 3);
  const demo = E.frames(s, st, next);
  assert.deepEqual(demo.map((f) => f.say).filter(Boolean), ["two", "two mangoes.", "Watch. Put them on the board, one by one.", "one", "Now you. Move the rest."]);
  assert.ok(demo.some((f) => f.motion) && demo.filter((f) => !f.motion).some((f) => f.state.fx !== undefined), "the finger slides, and is still shown without motion");
  assert.ok(demo.some((f) => E.cue(s, f.state) === "Watch") && draw(s, demo.find((f) => f.state.carry)!.state).some((d) => d.role === "boxes-finger"));
  st = next;
  assert.equal(measures(s, st).placed, 1);
  assert.equal(readout(s, st), "3 and 2");
  assert.equal(E.cue(s, st), "Now you");
  // the second box before the first is empty: refused
  const early = tap(st, 4);
  assert.equal(measures(s, early).placed, 1); assert.equal(E.nudge(s, early), "First this box.");
  // a drag let go away from the board puts nothing on; let go on the board, it goes on
  const [x1, y1] = xy(st, 1);
  let held = pointer(s, st, x1, y1, grip(s, st, x1, y1)); held = pointer(s, held, x1 + 40, y1 + 4, 1);
  assert.ok(draw(s, held).some((d) => d.role === "boxes-held"), "the thing follows the finger");
  assert.equal(measures(s, E.release(s, held, x1 + 40, y1 + 4)).placed, 1, "let go in the box: it goes back");
  held = pointer(s, held, 170, 230, 1);
  next = E.release(s, held, 170, 230); assert.deepEqual(said(st, next), ["two"]); st = next;
  // a tap, and Enter on the thing (press), put the rest on; the count goes on along the board, with a "+" after 3
  next = E.press(s, st, 2); assert.deepEqual(said(st, next), ["three"]); st = next;
  assert.ok(draw(s, st).some((d) => d.role === "boxes-plus"));
  next = tap(st, 4); assert.deepEqual(said(st, next), ["four"]); st = next;
  assert.equal(met(s, st), false);
  next = tap(st, 3);
  const end = E.frames(s, st, next);
  assert.deepEqual(end.map((f) => f.say), ["five", "three plus two makes five."]);
  assert.equal(readout(s, end[0].state), "3 and 2", "the sum is shown with the last words");
  st = next;
  assert.ok(met(s, st));
  assert.equal(readout(s, st), "3 + 2 = 5");
  assert.equal(E.cue(s, st), "Well done!");
  assert.ok(draw(s, st).filter((d) => d.role === "boxes-on").length === 5 && !draw(s, st).some((d) => d.t === "rect" && d.tap));
  // the slider goes through the same steps in the plain order, and only its last step is the goal
  const steps = [...states(s)];
  assert.equal(steps.length, 10);
  assert.deepEqual(steps.map((x) => met(s, x)), [false, false, false, false, false, false, false, false, false, true]);
  assert.deepEqual(steps.map((x) => [measures(s, x).counted, measures(s, x).placed]).slice(4, 7), [[4, 0], [5, 1], [5, 2]]);
  // any small adding story fits: 7 balloons and 3 more
  const big: Scene = { ...s, a: 7, b: 3, thing: "🎈", names: ["balloon", "balloons"], goal: { measure: "placed", equals: 10 } };
  assert.deepEqual(check(big), []);
  const { boxesLayout, boxesThingXY } = await import("../../../packages/learning/src/scene-figures");
  const L = boxesLayout(7, 3);
  for (let i = 0; i < 10; i++) { const [x, y] = boxesThingXY(L, 7, 3, i), bx = L.box[i < 7 ? 0 : 1]; assert.ok(x > bx.x && x < bx.x + bx.w && y > bx.y && y < bx.y + bx.h, `thing ${i} sits in its box`); }
  assert.ok(boxesNow(big, initial(big)).want === 1);
});
