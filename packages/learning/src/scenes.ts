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
import { numericValue } from "./answer-types";
import { problemOf } from "./families";
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
  // aacmp [a, b, kind]: which of two numbers is more (or less). The two numbers are cards to put in order; for two-digit
  // numbers their digit-swapped forms join them, because the documented slip is to compare the ones first.
  aacmp: ([a, b, kind]) => {
    const swap = (n: number) => (n >= 10 ? (n % 10) * 10 + Math.floor(n / 10) : n);
    const values = [...new Set([a, b, swap(a), swap(b)])].filter((v) => v >= 1);
    const big = Math.max(a, b), small = Math.min(a, b);
    return {
      type: "scene", kind: "order", values, ask: kind === 0 ? "largest" : "smallest",
      prompt: "Drag the cards into order, smallest on the left.",
      success: a >= 10 && b >= 10 ? `${big} has ${Math.floor(big / 10)} tens and ${small} has ${Math.floor(small / 10)}: the tens decide, so ${big} is more than ${small}.` : `${small} comes before ${big}, so ${big} is more.`,
      goal: { measure: "wrong", equals: 0 },
    };
  },
  // ajord [four integers]: put them in increasing order. The four are the cards.
  ajord: (p) => {
    const sorted = [...p].sort((x, y) => x - y);
    return {
      type: "scene", kind: "order", values: p,
      prompt: "Drag the cards into order, smallest on the left.",
      success: `${sorted.map(fmt).join(", ")}. Below zero, the bigger-looking number is the smaller one.`,
      goal: { measure: "wrong", equals: 0 },
    };
  },
  // aeround [k, n]: round n to the nearest 10^k. The point starts on n, between the two round numbers; move it to the nearer.
  aeround: ([k, n]) => {
    const unit = 10 ** k, lo = Math.floor(n / unit) * unit, hi = lo + unit, up = n - lo >= unit / 2, word = ["", "ten", "hundred", "thousand"][k];
    return {
      type: "scene", kind: "numberline", from: lo, to: hi, step: 1, start: n, near: unit, label: k === 1 ? 1 : unit / 5,
      prompt: `The point is on ${n}. Move it to the nearest ${word}.`,
      success: n - lo === unit / 2 ? `${n} is exactly halfway, and halfway goes up: ${hi}.` : `${n} is ${n - lo} from ${lo} and ${hi - n} from ${hi}, so the nearest ${word} is ${up ? hi : lo}.`,
      goal: { measure: "x", equals: up ? hi : lo },
    };
  },
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** The families that have a scene. */
export const SCENE_FAMILIES: readonly string[] = Object.keys(BUILDERS);

/**
 * scenes@4: a scene from a question's own PICTURE, for any family that has no builder of its own. One converter per kind
 * of picture (not per family), filled from the picture's data. A converter gives a scene only when the scene's own
 * mathematics arrives at the question's verified answer (the area or the perimeter of the rectangle drawn, the fraction
 * shaded, the rows times the number in a row, the third angle); otherwise there is no scene, so a picture is never made
 * to move in a way that is beside the question.
 */
type Fig = { type: string; [k: string]: unknown };
const whole = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
const same = (a: number, b: number | null) => b !== null && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));
const FIGURES: Record<string, (f: Fig, answer: number | null, text: string, prompt: string) => Scene | null> = {
  // a rectangle or square with its two side lengths: build it on the grid, and its squares or its edge are counted
  shape: (f, answer) => {
    if ((f.kind !== "rectangle" && f.kind !== "square") || !Array.isArray(f.lengths) || f.lengths.length !== 2) return null;
    const [w, h] = (f.lengths as unknown[]).map((t) => { const m = /^(\d+)(?:\s|$)/.exec(String(t)); return m ? Number(m[1]) : NaN; });
    if (!whole(w, 1, 9) || !whole(h, 1, 9)) return null;
    const area = w * h, perimeter = 2 * (w + h), ask = same(area, answer) && area !== perimeter ? "area" : same(perimeter, answer) && area !== perimeter ? "perimeter" : null;
    if (!ask) return null;
    return {
      type: "scene", kind: "rectangle", area, perimeter, ask,
      prompt: `Drag the corner to build the rectangle: ${w} by ${h}.`,
      success: ask === "area" ? `${h} ${h === 1 ? "row" : "rows"} of ${w} squares: the area is ${area}.` : `${w} + ${h} + ${w} + ${h}: the perimeter is ${perimeter}.`,
      goal: { measure: "off", equals: 0 },
    };
  },
  // a shape cut into equal parts with some shaded: copy it onto a bar
  grid: (f, answer, text) => {
    const total = whole(f.rows, 1, 12) && whole(f.cols, 1, 12) ? (f.rows as number) * (f.cols as number) : 0;
    if (total < 2 || total > 12 || !whole(f.shaded, 1, total) || !same((f.shaded as number) / total, answer)) return null;
    const k = f.shaded as number;
    return {
      type: "scene", kind: "fraction", target: [k, total],
      prompt: "Copy the picture onto the bar: the same number of equal pieces, and the same number shaded.",
      success: `${k} of ${total} equal pieces are shaded${text === `${k}/${total}` ? `: ${text}.` : `: ${k}/${total}, which is ${text}.`}`,
      goal: { measure: "exact", equals: 0 },
    };
  },
  // equal rows of things: set out the rows and count them all
  array: (f, answer) => {
    if (!whole(f.rows, 1, 10) || !whole(f.cols, 2, 15) || !same((f.rows as number) * (f.cols as number), answer)) return null;
    const r = f.rows as number, c = f.cols as number;
    return {
      type: "scene", kind: "array", total: r * c, rows: r,
      prompt: `There ${r === 1 ? "is 1 row" : `are ${r} rows`}. Put ${c} in each row.`,
      success: `${r} ${r === 1 ? "row" : "rows"} of ${c} make ${r * c}.`,
      goal: { measure: "off", equals: 0 },
    };
  },
  // a bar chart: slide a level line to the top of the bar asked about and read the scale; for "how many more", to the top
  // of the shorter bar, and see how far the taller one rises above it. Which bars are meant is taken from the question's
  // own words (their labels), and kept only if those bars give the verified answer.
  bars: (f, answer, _text, whole) => {
    const values = f.values as number[], labels = f.labels as string[];
    // only the sentence that asks (the last one ending in a question mark) says which bars are meant
    const prompt = (whole.match(/[^.?!]*\?/g) ?? []).pop() ?? "";
    if (answer === null || !Array.isArray(values) || !Array.isArray(labels) || values.length !== labels.length || f.histogram) return null;
    const said = (i: number) => new RegExp(`(^|[^A-Za-z0-9])${labels[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`, "i").test(prompt);
    const scale = typeof f.scale === "number" ? f.scale : 1, unit = Math.max(...values) <= 60 ? 1 : scale;
    const base = { type: "scene" as const, kind: "bars" as const, labels, values, scale, unit, goal: { measure: "miss", equals: 0 } };
    if (/\bhow (many|much) (more|fewer|less)\b|\bdifference\b/i.test(prompt)) {
      const pairs: [number, number][] = [];
      values.forEach((a, i) => values.forEach((b, j) => { if (i !== j && same(a - b, answer) && a > b) pairs.push([i, j]); }));
      const hi = values.indexOf(Math.max(...values)), lo = values.indexOf(Math.min(...values));
      const pick = pairs.filter(([i, j]) => said(i) && said(j))[0] ?? (/\b(tallest|shortest|most|least|longest)\b/i.test(prompt) ? pairs.find(([i, j]) => i === hi && j === lo) : undefined) ?? (pairs.length === 1 ? pairs[0] : undefined);
      if (!pick) return null;
      const [i, j] = pick;
      return { ...base, ask: { more: [i, j] }, prompt: `Slide the line up to the top of the ${labels[j]} bar. Then see how far ${labels[i]} rises above it.`, success: `${labels[i]} is ${fmt(values[i])} and ${labels[j]} is ${fmt(values[j])}: ${fmt(values[i])} − ${fmt(values[j])} = ${fmt(values[i] - values[j])} more.` };
    }
    // reading one bar: only where the question asks how many (not which bar, a percentage or a statement to judge)
    if (!/\bhow (many|much)\b/i.test(prompt)) return null;
    const hits = values.map((v, i) => i).filter((i) => same(values[i], answer) && said(i));
    if (hits.length !== 1) return null;
    const i = hits[0];
    return { ...base, ask: { read: i }, prompt: `Slide the line up to the top of the ${labels[i]} bar and read the scale.`, success: `The top of the ${labels[i]} bar is level with ${fmt(values[i])} on the scale.` };
  },
  // a triangle with two angles given and one asked: set the two and watch the third
  triangle: (f, answer) => {
    if (!Array.isArray(f.angles) || f.angles.length !== 3) return null;
    const known = (f.angles as unknown[]).map((t) => /^(\d+)°$/.exec(String(t))).filter(Boolean).map((m) => Number(m![1]));
    if (known.length !== 2 || !same(180 - known[0] - known[1], answer)) return null;
    const [a, b] = known;
    return {
      type: "scene", kind: "triangle", angles: [a, b],
      prompt: `Set angle A to ${a}° and angle B to ${b}°, and watch the third angle.`,
      success: `${a}° + ${b}° + ${180 - a - b}° = 180°. The third angle is ${180 - a - b}°.`,
      goal: { measure: "miss", equals: 0 },
    };
  },
};
/** The kinds of picture that can become a scene. */
export const FIGURE_SCENES: readonly string[] = Object.keys(FIGURES);
function fromFigure(qid: string): Scene | null {
  const p = problemOf(qid.replace(/:(mc|w)$/, ""));
  const fig = p?.figure as Fig | undefined;
  if (!p || !fig || !Object.prototype.hasOwnProperty.call(FIGURES, fig.type) || p.type === "choice") return null;
  return FIGURES[fig.type](fig, numericValue(p.answer), p.answer, p.prompt);
}

/** Whether a question's scene is its own picture made movable (then the still picture need not be shown beside it). */
export function sceneIsPicture(qid: string): boolean {
  const m = GEN.exec(qid);
  return !!m && !Object.prototype.hasOwnProperty.call(BUILDERS, m[1]) && sceneForQuestion(qid) !== null;
}

const GEN = /^gen:([a-z0-9]+):(-?\d+(?:,-?\d+)*)(?::(mc|w))?$/;
/** The scene for a generated question ("gen:<family>:<params>"), or null: no builder, or a scene with any problem. */
export function sceneForQuestion(qid: string): Scene | null {
  const m = GEN.exec(qid);
  if (!m) return null;
  const build = Object.prototype.hasOwnProperty.call(BUILDERS, m[1]) ? BUILDERS[m[1]] : null;
  let s: Scene | null = null;
  // a family's own builder first; otherwise the question's picture, if a converter can make it a scene (scenes@4)
  try { s = build ? build(m[2].split(",").map(Number)) : fromFigure(qid); } catch { return null; }
  return s && check(s).length === 0 ? s : null;
}

/** The number the scene's own mathematics gives for its question (the area, the slope at the asked point, the third angle),
 *  or null where the question's answer is not one number. */
export function sceneAnswer(s: Scene): number | null {
  if (s.kind === "triangle") return 180 - s.angles[0] - s.angles[1];
  if (s.kind === "rectangle") return s.ask === "area" ? s.area ?? null : s.ask === "perimeter" ? s.perimeter ?? null : null;
  if (s.kind === "fraction") return s.goal.measure === "exact" ? s.target[0] / s.target[1] : null;
  if (s.kind === "array") return s.rows !== undefined && s.goal.measure === "off" ? s.total : null;
  if (s.kind === "bars") return "read" in s.ask ? s.values[s.ask.read] : s.values[s.ask.more[0]] - s.values[s.ask.more[1]];
  if (s.kind === "line" || s.kind === "transform" || s.kind === "join" || s.kind === "commas") return null;
  if (s.kind === "order") return s.ask === "largest" ? Math.max(s.values[0], s.values[1]) : s.ask === "smallest" ? Math.min(s.values[0], s.values[1]) : null;
  if (s.kind === "numberline") return s.goal.measure === "x" && s.goal.equals !== undefined ? s.goal.equals : null;
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
