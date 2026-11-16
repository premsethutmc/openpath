/**
 * scenes@1: which interactive scene goes with which question, as data built from the question's own numbers.
 *
 * One builder per question FAMILY (not per question): the family's parameters fill the scene, so every question of the
 * family gets its own picture with no screen written for it. The builders are deterministic and call nothing outside
 * this package. The families themselves are not changed (their fingerprints, pools and certification stay as they are).
 *
 * A scene is only offered when `check` finds no problem with it. `sceneAnswer` states the number the scene's own
 * mathematics arrives at, so a test can hold it against the family's verified answer for the same question.
 */
import { check, evalPoly, derivative, fmt, initial, integral, measures, type Scene } from "./scene";

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
};

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

/** The number the scene's own mathematics gives for its question (the area, or the slope at the asked point). */
export function sceneAnswer(s: Scene): number | null {
  if (s.kind === "strips" || s.kind === "accumulate") return integral(s.poly, s.from, s.goal.measure === "x" && s.goal.equals !== undefined ? s.goal.equals : s.to);
  if (s.kind === "slope" && s.goal.measure === "x" && s.goal.equals !== undefined) return evalPoly(derivative(s.poly), s.goal.equals);
  return null;
}
