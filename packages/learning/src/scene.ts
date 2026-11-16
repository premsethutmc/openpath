/**
 * scene@1: the deterministic scene engine for interactive teaching pictures.
 *
 * A scene is DATA (a `Scene`): what to draw, what the learner can move, and a goal to reach by moving it. One engine reads
 * any scene; the app has one player (`frontend/src/year/Scene.tsx`) that draws what this file returns. A new topic is a new
 * description, not a new screen.
 *
 * Nothing here calls a model or the network. Everything is plain arithmetic on the scene's numbers, so the same scene
 * always draws, measures and checks the same way on every device.
 *
 * A scene is a teaching picture. Reaching its goal is NOT evidence of a skill: nothing here writes learner records.
 */

/** A polynomial as its coefficients, lowest power first: 5x² is [0, 0, 5]. */
export type Poly = number[];

/** What the learner is asked to reach. `measure` names one of the scene's measures; exactly one of equals / below is set. */
export interface SceneGoal { measure: string; equals?: number; below?: number; tol?: number }

interface Base {
  type: "scene";
  /** What to do, in one short sentence. */
  prompt: string;
  /** Shown once the goal is reached: what the learner has just seen. */
  success: string;
  goal: SceneGoal;
}
/** The area under a curve built from left-edge strips; the learner chooses how many strips. */
export interface StripsScene extends Base { kind: "strips"; poly: Poly; from: number; to: number; max?: number }
/** A point that slides along a curve, with the tangent drawn at it. */
export interface SlopeScene extends Base { kind: "slope"; poly: Poly; from: number; to: number; step?: number }
/** The signed area collected from the left edge to a right edge the learner drags. */
export interface AccumulateScene extends Base { kind: "accumulate"; poly: Poly; from: number; to: number; step?: number }
/** A straight line y = mx + c set by two sliders, to pass through marked points. */
export interface LineScene extends Base { kind: "line"; targets: [number, number][]; window: [number, number, number, number]; m: [number, number, number]; c: [number, number, number] }
export type Scene = StripsScene | SlopeScene | AccumulateScene | LineScene;
export type SceneKind = Scene["kind"];

/** One thing the learner can set. Every control is a number on a fixed grid, so every reachable state can be listed. */
export interface Control { key: string; label: string; min: number; max: number; step: number; start: number }
export type SceneState = Record<string, number>;

/** What the player draws, in a fixed 340 × 220 box. `role` picks the style; the player holds no mathematics. */
export type Shape =
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; role: string }
  | { t: "path"; d: string; role: string }
  | { t: "rect"; x: number; y: number; w: number; h: number; role: string }
  | { t: "circle"; cx: number; cy: number; r: number; role: string }
  | { t: "text"; x: number; y: number; s: string; role: string };

export const SCENE_BOX = { w: 340, h: 220 } as const;
const L = 34, R = 326, T = 16, B = 190;

const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
const px = (v: number) => Math.round(v * 100) / 100;

export const evalPoly = (p: Poly, x: number) => p.reduceRight((acc, c) => acc * x + c, 0);
export const derivative = (p: Poly): Poly => (p.length <= 1 ? [0] : p.slice(1).map((c, i) => c * (i + 1)));
/** The antiderivative with constant 0. */
export const antiderivative = (p: Poly): Poly => [0, ...p.map((c, i) => c / (i + 1))];
/** The exact definite integral of a polynomial (by its antiderivative, not by adding strips). */
export const integral = (p: Poly, a: number, b: number) => { const F = antiderivative(p); return evalPoly(F, b) - evalPoly(F, a); };

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** A number for the screen: whole when it is whole, otherwise at most two decimals; a true minus sign. */
export function fmt(n: number): string {
  const v = Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : Math.round(n * 100) / 100;
  const s = Object.is(v, -0) || v === 0 ? "0" : String(Math.abs(v));
  return v < 0 ? `−${s}` : s;
}
/** 5x² − 3x + 1 for [1, −3, 5]. */
export function polyText(p: Poly): string {
  const terms: string[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const c = p[i];
    if (!c) continue;
    const a = Math.abs(c);
    const body = i === 0 ? fmt(a) : `${a === 1 ? "" : fmt(a)}x${i === 1 ? "" : String(i).split("").map((d) => SUP[Number(d)]).join("")}`;
    terms.push(terms.length ? `${c < 0 ? "−" : "+"} ${body}` : `${c < 0 ? "−" : ""}${body}`);
  }
  return terms.length ? terms.join(" ") : "0";
}

/** The controls of a scene: what can be set, on what grid, and where it starts. */
export function controls(s: Scene): Control[] {
  if (s.kind === "strips") return [{ key: "n", label: "Strips", min: 1, max: s.max ?? 100, step: 1, start: Math.min(4, s.max ?? 100) }];
  if (s.kind === "line") return [
    { key: "m", label: "Slope", min: s.m[0], max: s.m[1], step: s.m[2], start: s.m[0] },
    { key: "c", label: "Start", min: s.c[0], max: s.c[1], step: s.c[2], start: s.c[0] },
  ];
  const step = s.step ?? ((s.to - s.from) <= 8 ? 0.05 : 0.1);
  return [{ key: "x", label: "x", min: s.from, max: s.to, step, start: s.kind === "accumulate" ? s.from : r6(s.from + Math.round((s.to - s.from) / step / 6) * step) }];
}
export const initial = (s: Scene): SceneState => Object.fromEntries(controls(s).map((c) => [c.key, c.start]));
/** Set one control: clamped to its range and snapped to its grid. Unknown keys and non-numbers change nothing. */
export function set(s: Scene, state: SceneState, key: string, value: number): SceneState {
  const c = controls(s).find((k) => k.key === key);
  if (!c || !fin(value)) return state;
  const steps = Math.round((Math.min(c.max, Math.max(c.min, value)) - c.min) / c.step);
  return { ...state, [key]: r6(Math.min(c.max, c.min + steps * c.step)) };
}

/** The window of a curve scene: the x range and the y range the curve needs, always including y = 0. */
function frame(s: Scene) {
  if (s.kind === "line") { const [x0, x1, y0, y1] = s.window; return { x0, x1, y0, y1 }; }
  const x0 = Math.min(0, s.from), x1 = s.to;
  let y0 = 0, y1 = 0;
  for (let i = 0; i <= 80; i++) { const y = evalPoly(s.poly, x0 + ((x1 - x0) * i) / 80); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (y1 - y0 < 1e-9) y1 = y0 + 1;
  return { x0, x1, y0, y1 };
}
function scales(s: Scene) {
  const f = frame(s);
  const X = (x: number) => L + ((x - f.x0) / (f.x1 - f.x0)) * (R - L);
  const Y = (y: number) => B - ((y - f.y0) / (f.y1 - f.y0)) * (B - T);
  return { ...f, X, Y, sx: (R - L) / (f.x1 - f.x0), sy: (B - T) / (f.y1 - f.y0) };
}

/** The numbers a scene can be judged by, for a state. Goals name one of these. */
export function measures(s: Scene, state: SceneState): Record<string, number> {
  if (s.kind === "strips") {
    const n = state.n, w = (s.to - s.from) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += evalPoly(s.poly, s.from + i * w) * w;
    const exact = integral(s.poly, s.from, s.to);
    return { n, sum, exact, gap: Math.abs(exact - sum), gapPercent: (Math.abs(exact - sum) / Math.max(Math.abs(exact), 1e-9)) * 100 };
  }
  if (s.kind === "slope") return { x: state.x, value: evalPoly(s.poly, state.x), slope: evalPoly(derivative(s.poly), state.x) };
  if (s.kind === "accumulate") return { x: state.x, height: evalPoly(s.poly, state.x), total: integral(s.poly, s.from, state.x), width: state.x - s.from };
  return { m: state.m, c: state.c, miss: s.targets.reduce((t, [x, y]) => t + Math.abs(state.m * x + state.c - y), 0) };
}
const MEASURES: Record<SceneKind, string[]> = { strips: ["n", "sum", "exact", "gap", "gapPercent"], slope: ["x", "value", "slope"], accumulate: ["x", "height", "total", "width"], line: ["m", "c", "miss"] };

/** Whether the goal is reached in this state. */
export function met(s: Scene, state: SceneState): boolean {
  const v = measures(s, state)[s.goal.measure];
  if (!fin(v)) return false;
  return s.goal.equals !== undefined ? Math.abs(v - s.goal.equals) <= (s.goal.tol ?? 1e-6) : s.goal.below !== undefined ? v < s.goal.below : false;
}

/** The one line of numbers under the picture. It never states the answer before the learner has reached it by moving
 *  something (the strips line gives what is missing, not the true area). */
export function readout(s: Scene, state: SceneState): string {
  const m = measures(s, state);
  if (s.kind === "strips") return `${m.n} ${m.n === 1 ? "strip" : "strips"} add up to ${fmt(m.sum)} · missing ${fmt(m.gapPercent)}%`;
  if (s.kind === "slope") return `At x = ${fmt(m.x)} the slope is ${fmt(m.slope)}`;
  if (s.kind === "accumulate") return `From x = ${fmt(s.from)} to x = ${fmt(m.x)}: area ${fmt(m.total)}`;
  return `y = ${fmt(m.m)}x ${m.c < 0 ? "−" : "+"} ${fmt(Math.abs(m.c))}`;
}

/** What to draw for a state. */
export function draw(s: Scene, state: SceneState): Shape[] {
  const k = scales(s), out: Shape[] = [];
  const axis = () => {
    out.push({ t: "line", x1: L - 6, y1: px(k.Y(0)), x2: R + 6, y2: px(k.Y(0)), role: "axis" });
    if (k.x0 <= 0 && k.x1 >= 0) out.push({ t: "line", x1: px(k.X(0)), y1: T - 6, x2: px(k.X(0)), y2: B + 6, role: "axis" });
  };
  if (s.kind === "line") {
    axis();
    out.push({ t: "line", x1: px(k.X(k.x0)), y1: px(k.Y(state.m * k.x0 + state.c)), x2: px(k.X(k.x1)), y2: px(k.Y(state.m * k.x1 + state.c)), role: "accent" });
    for (const [x, y] of s.targets) out.push({ t: "circle", cx: px(k.X(x)), cy: px(k.Y(y)), r: 8, role: "target" });
    return out;
  }
  const curve = (a: number, b: number) => { let d = ""; for (let i = 0; i <= 80; i++) { const x = a + ((b - a) * i) / 80; d += `${i ? "L" : "M"}${px(k.X(x))} ${px(k.Y(evalPoly(s.poly, x)))}`; } return d; };
  const tick = (x: number) => out.push({ t: "text", x: px(k.X(x)), y: Math.min(SCENE_BOX.h - 4, px(k.Y(0)) + 26), s: fmt(x), role: "label" });
  if (s.kind === "strips") {
    const w = (s.to - s.from) / state.n;
    for (let i = 0; i < state.n; i++) {
      const x = s.from + i * w, y = evalPoly(s.poly, x);
      out.push({ t: "rect", x: px(k.X(x)), y: px(Math.min(k.Y(y), k.Y(0))), w: px(w * k.sx), h: px(Math.abs(k.Y(y) - k.Y(0))), role: "strip" });
    }
    axis(); out.push({ t: "path", d: curve(k.x0, k.x1), role: "curve" }); tick(s.from); tick(s.to);
    return out;
  }
  if (s.kind === "accumulate") {
    if (state.x > s.from) out.push({ t: "path", d: `M${px(k.X(s.from))} ${px(k.Y(0))}L${curve(s.from, state.x).slice(1)}L${px(k.X(state.x))} ${px(k.Y(0))}Z`, role: "fill" });
    axis(); out.push({ t: "path", d: curve(k.x0, k.x1), role: "curve" }); tick(s.from); tick(s.to);
    out.push({ t: "line", x1: px(k.X(s.from)), y1: T, x2: px(k.X(s.from)), y2: B, role: "edge" });
    out.push({ t: "line", x1: px(k.X(state.x)), y1: T, x2: px(k.X(state.x)), y2: B, role: "accent" });
    out.push({ t: "circle", cx: px(k.X(state.x)), cy: px(k.Y(0)), r: 12, role: "handle" });
    return out;
  }
  const y = evalPoly(s.poly, state.x), m = evalPoly(derivative(s.poly), state.x);
  const dx = k.sx, dy = -k.sy * m, len = Math.hypot(dx, dy), ux = (dx / len) * 52, uy = (dy / len) * 52;
  const role = Math.abs(m) < 1e-9 ? "flat" : m > 0 ? "up" : "down";
  axis(); out.push({ t: "path", d: curve(k.x0, k.x1), role: "curve" });
  out.push({ t: "line", x1: px(k.X(state.x) - ux), y1: px(k.Y(y) - uy), x2: px(k.X(state.x) + ux), y2: px(k.Y(y) + uy), role });
  out.push({ t: "circle", cx: px(k.X(state.x)), cy: px(k.Y(y)), r: 12, role: "handle" });
  return out;
}

/** A touch or drag at a point of the 340 × 220 box. Scenes with an x control follow the finger; others are unchanged. */
export function pointer(s: Scene, state: SceneState, x: number, _y: number): SceneState {
  if (s.kind === "strips" || s.kind === "line") return state;
  const k = scales(s);
  return set(s, state, "x", k.x0 + ((x - L) / (R - L)) * (k.x1 - k.x0));
}

/** The picture in words, for a screen reader. It says what can be moved, never the answer. */
export function describe(s: Scene): string {
  if (s.kind === "strips") return `An interactive graph of y = ${polyText(s.poly)} from x = ${fmt(s.from)} to x = ${fmt(s.to)}. A slider sets how many strips are drawn under the curve. ${s.prompt}`;
  if (s.kind === "slope") return `An interactive graph of y = ${polyText(s.poly)}. A point slides along the curve and the tangent line is drawn at it. ${s.prompt}`;
  if (s.kind === "accumulate") return `An interactive graph of y = ${polyText(s.poly)}. The area is shaded from x = ${fmt(s.from)} to an edge that can be moved as far as x = ${fmt(s.to)}. ${s.prompt}`;
  return `An interactive graph with ${s.targets.length} marked points and a straight line set by two sliders. ${s.prompt}`;
}

/** Every reachable state, in control order (the controls are finite grids). Stops at `cap`. */
export function* states(s: Scene, cap = 20000): Generator<SceneState> {
  const cs = controls(s);
  const counts = cs.map((c) => Math.round((c.max - c.min) / c.step) + 1);
  const total = counts.reduce((a, b) => a * b, 1);
  for (let i = 0; i < Math.min(total, cap); i++) {
    let r = i; const st: SceneState = {};
    cs.forEach((c, j) => { st[c.key] = r6(Math.min(c.max, c.min + (r % counts[j]) * c.step)); r = Math.floor(r / counts[j]); });
    yield st;
  }
}

/**
 * The problems with a scene; an empty list means it may be shown. The player draws nothing for a scene with problems.
 * Checked: the shape of the data, that the goal names a real measure, that the goal is not already reached at the start,
 * and that some reachable state reaches it (so a learner is never asked for something the controls cannot do).
 */
export function check(v: unknown): string[] {
  const s = v as Scene, bad: string[] = [];
  if (!s || typeof s !== "object" || s.type !== "scene") return ["not a scene"];
  if (!(s.kind in MEASURES)) return [`unknown kind ${String(s.kind)}`];
  const words = (t: unknown, name: string) => { if (typeof t !== "string" || !t.trim() || t.length > 160) bad.push(`${name} must be 1 to 160 characters`); };
  words(s.prompt, "prompt"); words(s.success, "success");
  const g = s.goal;
  if (!g || typeof g !== "object" || !MEASURES[s.kind].includes(g.measure)) bad.push("goal names no measure of this kind");
  else if ((g.equals === undefined) === (g.below === undefined) || !fin(g.equals ?? g.below) || (g.tol !== undefined && !(fin(g.tol) && g.tol >= 0))) bad.push("goal needs exactly one finite target");
  if (s.kind === "line") {
    const rng = (r: unknown) => Array.isArray(r) && r.length === 3 && r.every(fin) && r[0] < r[1] && r[2] > 0 && (r[1] - r[0]) / r[2] <= 400;
    if (!Array.isArray(s.targets) || s.targets.length < 1 || s.targets.length > 4 || !s.targets.every((p) => Array.isArray(p) && p.length === 2 && p.every(fin))) bad.push("targets must be 1 to 4 points");
    if (!Array.isArray(s.window) || s.window.length !== 4 || !s.window.every(fin) || s.window[0] >= s.window[1] || s.window[2] >= s.window[3]) bad.push("window must be [x0, x1, y0, y1]");
    if (!rng(s.m) || !rng(s.c)) bad.push("slider ranges must be [min, max, step]");
  } else {
    if (!Array.isArray(s.poly) || s.poly.length < 1 || s.poly.length > 6 || !s.poly.every(fin)) bad.push("poly must be 1 to 6 finite coefficients");
    if (!fin(s.from) || !fin(s.to) || s.from >= s.to) bad.push("from must be below to");
    if (s.kind === "strips" ? s.max !== undefined && !(Number.isInteger(s.max) && s.max >= 2 && s.max <= 200) : s.step !== undefined && !(fin(s.step) && s.step > 0 && (s.to - s.from) / s.step <= 2000)) bad.push("control range is out of bounds");
  }
  if (bad.length) return bad;
  if (met(s, initial(s))) bad.push("the goal is already reached at the start");
  let reachable = false;
  for (const st of states(s)) if (met(s, st)) { reachable = true; break; }
  if (!reachable) bad.push("no reachable state reaches the goal");
  return bad;
}
