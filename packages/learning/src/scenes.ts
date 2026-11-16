/**
 * scenes@2: which interactive scene goes with which question, as data built from the question's own numbers.
 *
 * One builder per question FAMILY (not per question): the family's parameters fill the scene, so every question of the
 * family gets its own picture with no screen written for it. The builders are deterministic and call nothing outside
 * this package. The families themselves are not changed (their fingerprints, pools and certification stay as they are).
 *
 * A scene is only offered when `check` finds no problem with it. `sceneAnswer` states the number the scene's own
 * mathematics arrives at, so a test can hold it against the family's verified answer for the same question.
 */
import { check, curveOf, evalPoly, derivative, fmt, initial, integral, measures, type Scene, type Term } from "./scene";

const mono = (k: number, n: number) => [...Array(n).fill(0), k];

type Builder = (p: number[]) => Scene | null;
const BUILDERS: Record<string, Builder> = {
  // cint [a, b, c]: ∫ from a to b of c dx. Drag the right edge and watch width × height collect.
  cint: ([a, b, c]) => ({
    type: "scene", kind: "accumulate", poly: [c], from: a, to: b, step: b - a <= 8 ? 0.05 : 0.1,
    prompt: `Drag the edge from x = ${a} to x = ${b} and watch the area grow.`,
    success: `Width ${b - a} × height ${c} = ${c * (b - a)}. That area is the integral.`,
    goal: { measure: "x", equals: b },
  }),
  // pint [a, b, k, n]: ∫ from a to b of k xⁿ dx. Build the area from strips; more strips leave smaller gaps.
  pint: ([a, b, k, n]) => {
    const base = { type: "scene" as const, kind: "strips" as const, poly: mono(k, n), from: a, to: b, max: 100, prompt: "", success: "", goal: { measure: "gapPercent", below: 0 } };
    const start = measures(base, initial(base)).gapPercent;
    const target = [5, 2, 1, 0.5].find((t) => t < start / 2);
    if (target === undefined) return null;
    return {
      ...base,
      prompt: `Add strips until they miss less than ${target}% of the area.`,
      success: `Thinner strips leave smaller gaps. The area they close in on is ${fmt(integral(base.poly, a, b))}.`,
      goal: { measure: "gapPercent", below: target },
    };
  },
  // dpow [k, n, t]: f(x) = k xⁿ, f′(t). Slide to x = t and read the slope of the tangent there.
  dpow: ([k, n, t]) => ({
    type: "scene", kind: "slope", poly: mono(k, n), from: 0, to: t + 1, step: 0.05,
    prompt: `Slide the point to x = ${t} and read the slope there.`,
    success: `At x = ${t} the slope is ${fmt(evalPoly(derivative(mono(k, n)), t))}. That number is f′(${t}).`,
    goal: { measure: "x", equals: t },
  }),
  // audfp [p, q, r, a, b]: ∫ from a to b of (px² + qx + r) dx. Drag the edge; area below the axis is taken away.
  audfp: ([p, q, r, a, b]) => ({
    type: "scene", kind: "accumulate", poly: [r, q, p], from: a, to: b, step: b - a <= 8 ? 0.05 : 0.1,
    prompt: `Drag the edge from x = ${fmt(a)} to x = ${fmt(b)}. Area below the axis is taken away.`,
    success: `From ${fmt(a)} to ${fmt(b)} the area collected is ${fmt(integral([r, q, p], a, b))}. That is the integral.`,
    goal: { measure: "x", equals: b },
  }),
  // ahtri [a, b]: two angles of a triangle; the third follows. Set the two and watch the three always make 180°.
  ahtri: ([a, b]) => ({
    type: "scene", kind: "triangle", angles: [a, b],
    prompt: `Set angle A to ${a}° and angle B to ${b}°, and watch the third angle.`,
    success: `${a}° + ${b}° + ${180 - a - b}° = 180°. The third angle is ${180 - a - b}°.`,
    goal: { measure: "miss", equals: 0 },
  }),
  // asline [x1, y1, x2, y2]: the line through A and B. Turn a line about A until it passes through B: the slope is rise over run.
  asline: ([x1, y1, x2, y2]) => {
    const dx = x2 - x1, dy = y2 - y1, g = gcd(Math.abs(dy), dx) || 1, reach = Math.max(3, Math.ceil(Math.abs(dy / dx)) + 1);
    const slope = dy % dx === 0 ? fmt(dy / dx) : `${dy < 0 ? "−" : ""}${Math.abs(dy) / g}/${dx / g}`;
    return {
      type: "scene", kind: "line", through: [x1, y1], targets: [[x2, y2]], window: [-7, 7, -7, 7], m: [-reach, reach, 1 / dx],
      prompt: `Turn the line about A(${fmt(x1)}, ${fmt(y1)}) until it passes through B(${fmt(x2)}, ${fmt(y2)}).`,
      success: `Rise ${fmt(dy)} over run ${fmt(dx)}: the slope is ${slope}. That is the m in y = mx + c.`,
      goal: { measure: "miss", below: 1e-4 },
    };
  },
  // audsum [a, n, b, c, d]: f(x) = a xⁿ + bx² + cx + d. Read the slope at x = 1; the learner's f′(1) must give the same number.
  audsum: ([a, n, b, c, d]) => {
    const poly = [d, c, b, ...Array(n - 3).fill(0), a];
    return {
      type: "scene", kind: "slope", poly, from: -2, to: 2, step: 0.05,
      prompt: "Slide the point to x = 1 and read the slope there.",
      success: `At x = 1 the slope is ${fmt(evalPoly(derivative(poly), 1))}. Put x = 1 into your f′(x): it must give the same number.`,
      goal: { measure: "x", equals: 1 },
    };
  },
  // audel [k, a, c, d], k = 0 only: y = c e^(ax) + d log x. The same check at x = 1 on a curve that is not a polynomial.
  audel: ([k, a, c, d]) => {
    if (k !== 0) return null;
    const terms: Term[] = [{ f: "exp", a: c, b: a }, { f: "ln", a: d }];
    return {
      type: "scene", kind: "slope", terms, from: 0.25, to: 2, step: 0.05,
      prompt: "Slide the point to x = 1 and read the slope there.",
      success: `At x = 1 the slope is ${fmt(curveOf({ terms, from: 0.25, to: 2 }).slope(1))}. Put x = 1 into your dy/dx: it must give the same number.`,
      goal: { measure: "x", equals: 1 },
    };
  },
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** The families that have a scene. */
export const SCENE_FAMILIES: readonly string[] = Object.keys(BUILDERS);

const GEN = /^gen:([a-z0-9]+):(-?\d+(?:,-?\d+)*)(?::(mc|w))?$/;
/** The scene for a generated question ("gen:<family>:<params>"), or null: no builder, or a scene with any problem. */
export function sceneForQuestion(qid: string): Scene | null {
  const m = GEN.exec(qid);
  const build = m && Object.prototype.hasOwnProperty.call(BUILDERS, m[1]) ? BUILDERS[m[1]] : null;
  if (!build) return null;
  const p = m![2].split(",").map(Number);
  let s: Scene | null = null;
  try { s = build(p); } catch { return null; }
  return s && check(s).length === 0 ? s : null;
}

/** The number the scene's own mathematics gives for its question (the area, the slope at the asked point, the third angle),
 *  or null where the question's answer is not one number. */
export function sceneAnswer(s: Scene): number | null {
  if (s.kind === "triangle") return 180 - s.angles[0] - s.angles[1];
  if (s.kind === "line") return null;
  const f = curveOf(s);
  if (s.kind === "strips") return f.area(s.from, s.to);
  if (s.goal.measure !== "x" || s.goal.equals === undefined) return null;
  return s.kind === "accumulate" ? f.area(s.from, s.goal.equals) : f.slope(s.goal.equals);
}

/** Points (x, value) that the question's answer, read as an expression in x, must pass through if the scene states the same
 *  mathematics: the line's fixed and marked points, or the slope at the asked point for a derivative. */
export function sceneProbes(s: Scene): [number, number][] {
  if (s.kind === "line") return [...(s.through ? [s.through] : []), ...s.targets];
  if (s.kind === "slope" && s.goal.measure === "x" && s.goal.equals !== undefined) return [[s.goal.equals, curveOf(s).slope(s.goal.equals)]];
  return [];
}
