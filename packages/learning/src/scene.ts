/**
 * scene@3: the deterministic scene engine for interactive teaching pictures.
 *
 * A scene is DATA (a `Scene`): what to draw, what the learner can move, and a goal to reach by moving it. One engine reads
 * any scene; the app has one player (`frontend/src/year/Scene.tsx`) that draws what this file returns. A new topic is a new
 * description, not a new screen.
 *
 * Nothing here calls a model or the network. Everything is plain arithmetic on the scene's numbers, so the same scene
 * always draws, measures and checks the same way on every device.
 *
 * A scene is a teaching picture. Reaching its goal is NOT evidence of a skill: nothing here writes learner records.
 *
 * scene@4 adds a `rectangle` kind (width and height on a grid; perimeter and area) and a `join` kind (two pieces of a graph
 * that meet or fail to meet at a point).
 *
 * scene@3 adds a `transform` kind: two arrows set a 2 × 2 matrix, and a shape is moved by it.
 *
 * scene@2 adds: curves beyond polynomials (`terms`: powers, sine, cosine, exponential, natural logarithm, with exact slopes
 * and areas), a `triangle` kind (two angles set, the third follows), and a line that turns about a fixed point (`through`).
 */

/** A polynomial as its coefficients, lowest power first: 5x² is [0, 0, 5]. */
export type Poly = number[];
/** One term of a curve: a·xᵇ (pow), a·sin(bx), a·cos(bx), a·e^(bx) or a·ln x. `b` defaults to 1. */
export interface Term { f: "pow" | "sin" | "cos" | "exp" | "ln"; a: number; b?: number }

/** What the learner is asked to reach. `measure` names one of the scene's measures; exactly one of equals / below is set. */
export interface SceneGoal { measure: string; equals?: number; below?: number; tol?: number }

interface Base {
  type: "scene";
  /** What to do, in one short sentence. */
  prompt: string;
  /** Shown once the goal is reached: what the learner has just seen. */
  success: string;
  goal: SceneGoal;
  /** The letter the horizontal quantity is called in the readout and description (default x; t for time). */
  variable?: string;
}
/** A curve is given either as a polynomial or as a sum of terms (exactly one of the two). */
interface Curve { poly?: Poly; terms?: Term[]; from: number; to: number }
/** The area under a curve built from left-edge strips; the learner chooses how many strips. */
export interface StripsScene extends Base, Curve { kind: "strips"; max?: number }
/** A point that slides along a curve, with the tangent drawn at it. */
export interface SlopeScene extends Base, Curve { kind: "slope"; step?: number }
/** The signed area collected from the left edge to a right edge the learner drags. */
export interface AccumulateScene extends Base, Curve { kind: "accumulate"; step?: number }
/** A straight line set by sliders. With `through`, the line turns about that point and only its slope is set. */
export interface LineScene extends Base { kind: "line"; targets: [number, number][]; window: [number, number, number, number]; m: [number, number, number]; c?: [number, number, number]; through?: [number, number]; /** What the slope slider is called (default "Slope"; a lesson that has not yet named the slope calls it something plainer). */ mLabel?: string }
/** A triangle whose angles at A and B are set (whole degrees); the angle at C follows. `angles` are the two asked for. */
export interface TriangleScene extends Base { kind: "triangle"; angles: [number, number] }
/** A 2 × 2 matrix as a machine: its columns are where two arrows land (set by dragging them to whole-number points), and a shape is moved by it.
 *  `target`, when given, is the matrix [a, b, c, d] (first column a, b; second column c, d) that `miss` is measured to. */
export interface TransformScene extends Base { kind: "transform"; target?: [number, number, number, number] }
/** A rectangle on a grid of unit squares, its width and height set by dragging a corner. `perimeter` and `area`, when given,
 *  are what `off` is measured to; `shortOfBest` is how far the area is from the largest a rectangle of that perimeter can
 *  have. `words` are what the perimeter and the area are called in the readout (a story may call them fence and room). */
export interface RectangleScene extends Base { kind: "rectangle"; perimeter?: number; area?: number; words?: [string, string] }
/** Two pieces of a graph that meet (or fail to meet) at x = `at`. In "shift" mode the right-hand piece is slid up and down
 *  (its height is right(x) + k); in "point" mode the single point at x = `at` is moved (its height is k). */
export interface JoinScene extends Base { kind: "join"; mode: "shift" | "point"; left: Poly; right: Poly; at: number; from: number; to: number; k: [number, number, number]; start?: number }
export type Scene = StripsScene | SlopeScene | AccumulateScene | LineScene | TriangleScene | TransformScene | RectangleScene | JoinScene;
export type CurveScene = StripsScene | SlopeScene | AccumulateScene;
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
const rad = (d: number) => (d * Math.PI) / 180;

export const evalPoly = (p: Poly, x: number) => p.reduceRight((acc, c) => acc * x + c, 0);
export const derivative = (p: Poly): Poly => (p.length <= 1 ? [0] : p.slice(1).map((c, i) => c * (i + 1)));
/** The antiderivative with constant 0. */
export const antiderivative = (p: Poly): Poly => [0, ...p.map((c, i) => c / (i + 1))];
/** The exact definite integral of a polynomial (by its antiderivative, not by adding strips). */
export const integral = (p: Poly, a: number, b: number) => { const F = antiderivative(p); return evalPoly(F, b) - evalPoly(F, a); };

/** A term's value, slope and antiderivative at x: each in closed form, so slopes and areas are exact, not estimated. */
function term(t: Term, x: number): [number, number, number] {
  const a = t.a, b = t.b ?? 1;
  if (t.f === "pow") return [a * x ** b, b === 0 ? 0 : a * b * x ** (b - 1), (a * x ** (b + 1)) / (b + 1)];
  if (t.f === "sin") return [a * Math.sin(b * x), a * b * Math.cos(b * x), (-a / b) * Math.cos(b * x)];
  if (t.f === "cos") return [a * Math.cos(b * x), -a * b * Math.sin(b * x), (a / b) * Math.sin(b * x)];
  if (t.f === "exp") return [a * Math.exp(b * x), a * b * Math.exp(b * x), (a / b) * Math.exp(b * x)];
  return [a * Math.log(x), a / x, a * (x * Math.log(x) - x)];
}
/** The curve of a scene: its value, its slope, and its exact area between two points. */
export function curveOf(s: Curve) {
  if (s.terms) {
    const sum = (x: number, i: 0 | 1 | 2) => s.terms!.reduce((t, k) => t + term(k, x)[i], 0);
    return { value: (x: number) => sum(x, 0), slope: (x: number) => sum(x, 1), area: (a: number, b: number) => sum(b, 2) - sum(a, 2) };
  }
  const p = s.poly ?? [0], d = derivative(p);
  return { value: (x: number) => evalPoly(p, x), slope: (x: number) => evalPoly(d, x), area: (a: number, b: number) => integral(p, a, b) };
}
const positiveOnly = (s: Curve) => !!s.terms?.some((t) => t.f === "ln");

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** A number for the screen: whole when it is whole, otherwise at most two decimals; a true minus sign. */
export function fmt(n: number): string {
  const v = Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : Math.round(n * 100) / 100;
  const s = Object.is(v, -0) || v === 0 ? "0" : String(Math.abs(v));
  return v < 0 ? `−${s}` : s;
}
const signedJoin = (parts: [number, string][]) => {
  const out: string[] = [];
  for (const [c, body] of parts) { if (!c) continue; out.push(out.length ? `${c < 0 ? "−" : "+"} ${body}` : `${c < 0 ? "−" : ""}${body}`); }
  return out.length ? out.join(" ") : "0";
};
const xPow = (i: number) => (i === 0 ? "" : `x${i === 1 ? "" : String(i).split("").map((d) => SUP[Number(d)]).join("")}`);
const coef = (a: number, body: string) => (body ? `${Math.abs(a) === 1 ? "" : fmt(Math.abs(a))}${body}` : fmt(Math.abs(a)));
/** 5x² − 3x + 1 for [1, −3, 5]. */
export const polyText = (p: Poly): string => signedJoin([...p.keys()].reverse().map((i) => [p[i], coef(p[i], xPow(i))]));
/** The curve in words and symbols: 5x² − 3x + 1, or 2e^(3x) − 6 ln x. */
export function curveText(s: Curve): string {
  if (!s.terms) return polyText(s.poly ?? [0]);
  const inner = (b: number) => (b === 1 ? "x" : `${fmt(b)}x`);
  return signedJoin(s.terms.map((t) => {
    const b = t.b ?? 1;
    if (t.f === "pow") return [t.a, coef(t.a, xPow(b))];
    if (t.f === "ln") return [t.a, `${Math.abs(t.a) === 1 ? "" : `${fmt(Math.abs(t.a))} `}ln x`];
    return [t.a, coef(t.a, t.f === "exp" ? (b === 1 ? "eˣ" : `e^(${inner(b)})`) : `${Math.abs(t.a) === 1 ? "" : " "}${t.f}(${inner(b)})`.trimStart())];
  }));
}

/** The whole-degree angles a triangle scene can show: the two set angles are kept to a triangle (their sum at most 170°). */
function tri(state: SceneState) { const a = state.a, b = Math.min(state.b, 170 - a); return { a, b, c: 180 - a - b }; }

/** The controls of a scene: what can be set, on what grid, and where it starts. */
export function controls(s: Scene): Control[] {
  if (s.kind === "strips") return [{ key: "n", label: "Strips", min: 1, max: s.max ?? 100, step: 1, start: Math.min(4, s.max ?? 100) }];
  if (s.kind === "triangle") {
    const near = Math.abs(s.angles[0] - 60) + Math.abs(s.angles[1] - 60) < 12;
    return [{ key: "a", label: "Angle A", min: 10, max: 150, step: 1, start: near ? 40 : 60 }, { key: "b", label: "Angle B", min: 10, max: 150, step: 1, start: near ? 95 : 60 }];
  }
  if (s.kind === "rectangle") return [{ key: "w", label: "Width", min: 1, max: 9, step: 1, start: 2 }, { key: "h", label: "Height", min: 1, max: 9, step: 1, start: 1 }];
  if (s.kind === "join") return [{ key: "k", label: s.mode === "shift" ? "Right piece" : "The point", min: s.k[0], max: s.k[1], step: s.k[2], start: s.start ?? s.k[0] }];
  if (s.kind === "transform") return [["a", "First arrow, across", 1], ["b", "First arrow, up", 0], ["c", "Second arrow, across", 0], ["d", "Second arrow, up", 1]].map(([key, label, start]) => ({ key: key as string, label: label as string, min: -3, max: 3, step: 1, start: start as number }));
  if (s.kind === "line") {
    const m: Control = { key: "m", label: s.mLabel ?? "Slope", min: s.m[0], max: s.m[1], step: s.m[2], start: s.m[0] };
    return s.through || !s.c ? [m] : [m, { key: "c", label: "Start", min: s.c[0], max: s.c[1], step: s.c[2], start: s.c[0] }];
  }
  const step = s.step ?? ((s.to - s.from) <= 8 ? 0.05 : 0.1);
  return [{ key: "x", label: s.variable ?? "x", min: s.from, max: s.to, step, start: s.kind === "accumulate" ? s.from : r6(s.from + Math.round((s.to - s.from) / step / 6) * step) }];
}
export const initial = (s: Scene): SceneState => Object.fromEntries(controls(s).map((c) => [c.key, c.start]));
/** Set one control: clamped to its range and snapped to its grid. Unknown keys and non-numbers change nothing. */
export function set(s: Scene, state: SceneState, key: string, value: number): SceneState {
  const c = controls(s).find((k) => k.key === key);
  if (!c || !fin(value)) return state;
  const steps = Math.round((Math.min(c.max, Math.max(c.min, value)) - c.min) / c.step);
  return { ...state, [key]: r6(Math.min(c.max, c.min + steps * c.step)) };
}

/** The window of a graph scene: the x range and the y range it needs, always including y = 0. */
function frame(s: CurveScene | LineScene) {
  if (s.kind === "line") { const [x0, x1, y0, y1] = s.window; return { x0, x1, y0, y1 }; }
  const f = curveOf(s);
  const x0 = positiveOnly(s) ? s.from : Math.min(0, s.from), x1 = s.to;
  let y0 = 0, y1 = 0;
  for (let i = 0; i <= 80; i++) { const y = f.value(x0 + ((x1 - x0) * i) / 80); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (y1 - y0 < 1e-9) y1 = y0 + 1;
  return { x0, x1, y0, y1 };
}
function scales(s: CurveScene | LineScene) {
  const f = frame(s);
  const X = (x: number) => L + ((x - f.x0) / (f.x1 - f.x0)) * (R - L);
  const Y = (y: number) => B - ((y - f.y0) / (f.y1 - f.y0)) * (B - T);
  return { ...f, X, Y, sx: (R - L) / (f.x1 - f.x0), sy: (B - T) / (f.y1 - f.y0) };
}
/** The line of a line scene for a state: its slope and where it meets the y-axis. */
function lineOf(s: LineScene, state: SceneState) { const m = state.m; return { m, c: s.through ? s.through[1] - m * s.through[0] : state.c ?? 0 }; }

/** The two heights a join scene compares at its meeting point, and the height of the point itself. */
function joinOf(s: JoinScene, state: SceneState) {
  const left = evalPoly(s.left, s.at), right = evalPoly(s.right, s.at) + (s.mode === "shift" ? state.k : 0);
  return { left, right, point: s.mode === "point" ? state.k : left };
}

/** The numbers a scene can be judged by, for a state. Goals name one of these. */
export function measures(s: Scene, state: SceneState): Record<string, number> {
  if (s.kind === "rectangle") {
    const { w, h } = state, perimeter = 2 * (w + h), area = w * h;
    // the largest area a whole-number rectangle of the asked perimeter can have: its sides as nearly equal as they can be
    const half = (s.perimeter ?? perimeter) / 2, best = Math.floor(half / 2) * Math.ceil(half / 2);
    return { w, h, perimeter, area, off: (s.perimeter === undefined ? 0 : Math.abs(perimeter - s.perimeter)) + (s.area === undefined ? 0 : Math.abs(area - s.area)), shortOfBest: s.perimeter !== undefined && perimeter === s.perimeter ? best - area : 999 };
  }
  if (s.kind === "join") { const j = joinOf(s, state); return { k: state.k, ...j, gap: Math.abs(j.left - j.right), miss: Math.abs(j.left - j.right) + Math.abs(j.point - j.left) }; }
  if (s.kind === "triangle") { const t = tri(state); return { ...t, sum: t.a + t.b + t.c, miss: Math.abs(state.a - s.angles[0]) + Math.abs(state.b - s.angles[1]) }; }
  if (s.kind === "transform") { const { a, b, c, d } = state, t = s.target; return { a, b, c, d, det: a * d - b * c, miss: t ? Math.abs(a - t[0]) + Math.abs(b - t[1]) + Math.abs(c - t[2]) + Math.abs(d - t[3]) : 0 }; }
  if (s.kind === "line") { const l = lineOf(s, state); return { ...l, miss: s.targets.reduce((t, [x, y]) => t + Math.abs(l.m * x + l.c - y), 0) }; }
  const f = curveOf(s);
  if (s.kind === "strips") {
    const n = state.n, w = (s.to - s.from) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += f.value(s.from + i * w) * w;
    const exact = f.area(s.from, s.to);
    return { n, sum, exact, gap: Math.abs(exact - sum), gapPercent: (Math.abs(exact - sum) / Math.max(Math.abs(exact), 1e-9)) * 100 };
  }
  if (s.kind === "slope") return { x: state.x, value: f.value(state.x), slope: f.slope(state.x) };
  return { x: state.x, height: f.value(state.x), total: f.area(s.from, state.x), width: state.x - s.from };
}
const MEASURES: Record<SceneKind, string[]> = { strips: ["n", "sum", "exact", "gap", "gapPercent"], slope: ["x", "value", "slope"], accumulate: ["x", "height", "total", "width"], line: ["m", "c", "miss"], triangle: ["a", "b", "c", "sum", "miss"], transform: ["a", "b", "c", "d", "det", "miss"], rectangle: ["w", "h", "perimeter", "area", "off", "shortOfBest"], join: ["k", "left", "right", "point", "gap", "miss"] };

/** Whether the goal is reached in this state. */
export function met(s: Scene, state: SceneState): boolean {
  const v = measures(s, state)[s.goal.measure];
  if (!fin(v)) return false;
  return s.goal.equals !== undefined ? Math.abs(v - s.goal.equals) <= (s.goal.tol ?? 1e-6) : s.goal.below !== undefined ? v < s.goal.below : false;
}

const named = (s: Scene, text: string) => (s.variable && s.variable !== "x" ? text.replaceAll("x", s.variable) : text);
/** The one line of numbers under the picture. It never states the answer before the learner has reached it by moving
 *  something (the strips line gives what is missing, not the true area). */
export function readout(s: Scene, state: SceneState): string {
  const m = measures(s, state);
  if (s.kind === "slope") return named(s, `At x = ${fmt(m.x)} the slope is ${fmt(m.slope)}`);
  if (s.kind === "accumulate") return named(s, `From x = ${fmt(s.from)} to x = ${fmt(m.x)}: area ${fmt(m.total)}`);
  if (s.kind === "strips") return `${m.n} ${m.n === 1 ? "strip" : "strips"} add up to ${fmt(m.sum)} · missing ${fmt(m.gapPercent)}%`;
  if (s.kind === "triangle") return `${m.a}° + ${m.b}° + ${m.c}° = 180°`;
  if (s.kind === "rectangle") { const [p, a] = s.words ?? ["perimeter", "area"]; return `${m.w} by ${m.h} · ${p} ${m.perimeter} · ${a} ${m.area}`; }
  if (s.kind === "join") return s.mode === "shift" ? `From the left: ${fmt(m.left)} · from the right: ${fmt(m.right)}` : `Both sides head for ${fmt(m.left)} · the point is at ${fmt(m.point)}`;
  if (s.kind === "transform") return `Arrows land at (${fmt(m.a)}, ${fmt(m.b)}) and (${fmt(m.c)}, ${fmt(m.d)}) · area × ${fmt(m.det)}`;
  return `y = ${fmt(m.m)}x ${m.c < 0 ? "−" : "+"} ${fmt(Math.abs(m.c))}`;
}

/** The corners of a triangle scene in the box: base AB at the bottom, C from the two angles, shrunk to fit when tall. */
function corners(state: SceneState) {
  const t = tri(state), base = 220, ac = (base * Math.sin(rad(t.b))) / Math.sin(rad(t.c));
  const raw = [[0, 0], [base, 0], [ac * Math.cos(rad(t.a)), -ac * Math.sin(rad(t.a))]];
  const xs = raw.map((p) => p[0]), ys = raw.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const k = Math.min(1, 280 / w, 150 / h), ox = (SCENE_BOX.w - k * w) / 2 - k * Math.min(...xs), oy = 185;
  return { t, pts: raw.map(([x, y]) => [px(ox + k * x), px(oy + k * y)] as [number, number]) };
}

/** The shape a transform scene moves (a letter F, so a flip and a turn can be told apart), and its place in the box. */
const F_SHAPE: [number, number][] = [[0, 0], [0.25, 0], [0.25, 0.5], [0.6, 0.5], [0.6, 0.75], [0.25, 0.75], [0.25, 1], [0.75, 1], [0.75, 1.25], [0, 1.25]];
const TU = 26, TX = (x: number) => px(170 + TU * x), TY = (y: number) => px(110 - TU * y);

/** What to draw for a state. */
export function draw(s: Scene, state: SceneState): Shape[] {
  const out: Shape[] = [];
  if (s.kind === "rectangle") {
    const { w, h } = state, U = 20, x0 = 60, y0 = 196;
    for (let i = 0; i <= 9; i++) out.push({ t: "line", x1: x0 + i * U, y1: y0 - 9 * U, x2: x0 + i * U, y2: y0, role: "grid" }, { t: "line", x1: x0, y1: y0 - i * U, x2: x0 + 9 * U, y2: y0 - i * U, role: "grid" });
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push({ t: "rect", x: x0 + i * U, y: y0 - (j + 1) * U, w: U, h: U, role: "cell" });
    out.push({ t: "path", d: `M${x0} ${y0}h${w * U}v${-h * U}h${-w * U}Z`, role: "outline" });
    out.push({ t: "text", x: x0 + (w * U) / 2, y: y0 + 16, s: String(w), role: "value" }, { t: "text", x: x0 - 14, y: y0 - (h * U) / 2 + 4, s: String(h), role: "value" });
    out.push({ t: "circle", cx: x0 + w * U, cy: y0 - h * U, r: 12, role: "handle" });
    return out;
  }
  if (s.kind === "join") {
    const j = joinOf(s, state), lo = Math.min(0, ...[s.from, s.at].map((x) => evalPoly(s.left, x)), ...[s.at, s.to].flatMap((x) => [evalPoly(s.right, x) + (s.mode === "shift" ? s.k[0] : 0), evalPoly(s.right, x) + (s.mode === "shift" ? s.k[1] : 0)]), s.mode === "point" ? s.k[0] : 0);
    const hi = Math.max(0, ...[s.from, s.at].map((x) => evalPoly(s.left, x)), ...[s.at, s.to].flatMap((x) => [evalPoly(s.right, x) + (s.mode === "shift" ? s.k[0] : 0), evalPoly(s.right, x) + (s.mode === "shift" ? s.k[1] : 0)]), s.mode === "point" ? s.k[1] : 0);
    const X = (x: number) => px(L + ((x - s.from) / (s.to - s.from)) * (R - L)), Y = (y: number) => px(B - ((y - lo) / (hi - lo || 1)) * (B - T));
    const shift = s.mode === "shift" ? state.k : 0;
    const line = (p: Poly, a: number, b: number, add: number) => { let d = ""; for (let i = 0; i <= 40; i++) { const x = a + ((b - a) * i) / 40; d += `${i ? "L" : "M"}${X(x)} ${Y(evalPoly(p, x) + add)}`; } return d; };
    out.push({ t: "line", x1: L - 6, y1: Y(0), x2: R + 6, y2: Y(0), role: "axis" });
    out.push({ t: "line", x1: X(s.at), y1: T, x2: X(s.at), y2: B, role: "edge" });
    out.push({ t: "path", d: line(s.left, s.from, s.at, 0), role: "curve" }, { t: "path", d: line(s.right, s.at, s.to, shift), role: s.mode === "shift" ? "curve2" : "curve" });
    out.push({ t: "circle", cx: X(s.at), cy: Y(j.left), r: 5, role: "open" }, { t: "circle", cx: X(s.at), cy: Y(j.right), r: 5, role: "open" });
    out.push({ t: "text", x: X(s.at), y: Math.min(SCENE_BOX.h - 4, Y(0) + 26), s: fmt(s.at), role: "label" });
    out.push({ t: "circle", cx: s.mode === "shift" ? X(s.at + (s.to - s.at) / 2) : X(s.at), cy: s.mode === "shift" ? Y(evalPoly(s.right, s.at + (s.to - s.at) / 2) + shift) : Y(j.point), r: 12, role: "handle" });
    return out;
  }
  if (s.kind === "transform") {
    const { a, b, c, d } = state;
    for (let k = -6; k <= 6; k++) out.push({ t: "line", x1: TX(k), y1: 6, x2: TX(k), y2: 214, role: k ? "grid" : "axis" });
    for (let k = -4; k <= 4; k++) out.push({ t: "line", x1: 14, y1: TY(k), x2: 326, y2: TY(k), role: k ? "grid" : "axis" });
    const path = (f: (p: [number, number]) => [number, number]) => `${F_SHAPE.map((p, i) => { const q = f(p); return `${i ? "L" : "M"}${TX(q[0])} ${TY(q[1])}`; }).join("")}Z`;
    out.push({ t: "path", d: path((p) => p), role: "ghost" });
    out.push({ t: "path", d: path(([x, y]) => [a * x + c * y, b * x + d * y]), role: "moved" });
    out.push({ t: "line", x1: TX(0), y1: TY(0), x2: TX(a), y2: TY(b), role: "arrow0" }, { t: "line", x1: TX(0), y1: TY(0), x2: TX(c), y2: TY(d), role: "arrow1" });
    out.push({ t: "circle", cx: TX(a), cy: TY(b), r: 12, role: "handle0" }, { t: "circle", cx: TX(c), cy: TY(d), r: 12, role: "handle1" });
    return out;
  }
  if (s.kind === "triangle") {
    const { t, pts } = corners(state), [A, Bp, C] = pts, deg = [t.a, t.b, t.c];
    out.push({ t: "path", d: `M${A[0]} ${A[1]}L${Bp[0]} ${Bp[1]}L${C[0]} ${C[1]}Z`, role: "shape" });
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % 3], r = pts[(i + 2) % 3];
      const u = [q[0] - p[0], q[1] - p[1]], v = [r[0] - p[0], r[1] - p[1]], lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
      const un = [u[0] / lu, u[1] / lu], vn = [v[0] / lv, v[1] / lv], rr = 22, sweep = un[0] * vn[1] - un[1] * vn[0] > 0 ? 1 : 0;
      out.push({ t: "path", d: `M${p[0]} ${p[1]}L${px(p[0] + un[0] * rr)} ${px(p[1] + un[1] * rr)}A${rr} ${rr} 0 0 ${sweep} ${px(p[0] + vn[0] * rr)} ${px(p[1] + vn[1] * rr)}Z`, role: `wedge${i}` });
      const bx = un[0] + vn[0], by = un[1] + vn[1], bl = Math.hypot(bx, by) || 1;
      out.push({ t: "text", x: px(p[0] + (bx / bl) * 40), y: px(p[1] + (by / bl) * 40 + 4), s: `${deg[i]}°`, role: "value" });
    });
    out.push({ t: "circle", cx: C[0], cy: C[1], r: 12, role: "handle" });
    return out;
  }
  const k = scales(s);
  const axis = () => {
    out.push({ t: "line", x1: L - 6, y1: px(k.Y(0)), x2: R + 6, y2: px(k.Y(0)), role: "axis" });
    if (k.x0 <= 0 && k.x1 >= 0) out.push({ t: "line", x1: px(k.X(0)), y1: T - 6, x2: px(k.X(0)), y2: B + 6, role: "axis" });
  };
  if (s.kind === "line") {
    const l = lineOf(s, state);
    axis();
    out.push({ t: "line", x1: px(k.X(k.x0)), y1: px(k.Y(l.m * k.x0 + l.c)), x2: px(k.X(k.x1)), y2: px(k.Y(l.m * k.x1 + l.c)), role: "accent" });
    for (const [x, y] of s.targets) out.push({ t: "circle", cx: px(k.X(x)), cy: px(k.Y(y)), r: 8, role: "target" });
    if (s.through) out.push({ t: "circle", cx: px(k.X(s.through[0])), cy: px(k.Y(s.through[1])), r: 8, role: "pivot" });
    return out;
  }
  const f = curveOf(s);
  const curve = (a: number, b: number) => { let d = ""; for (let i = 0; i <= 80; i++) { const x = a + ((b - a) * i) / 80; d += `${i ? "L" : "M"}${px(k.X(x))} ${px(k.Y(f.value(x)))}`; } return d; };
  const tick = (x: number) => out.push({ t: "text", x: px(k.X(x)), y: Math.min(SCENE_BOX.h - 4, px(k.Y(0)) + 26), s: fmt(x), role: "label" });
  if (s.kind === "strips") {
    const w = (s.to - s.from) / state.n;
    for (let i = 0; i < state.n; i++) {
      const x = s.from + i * w, y = f.value(x);
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
  const y = f.value(state.x), m = f.slope(state.x);
  const dx = k.sx, dy = -k.sy * m, len = Math.hypot(dx, dy), ux = (dx / len) * 52, uy = (dy / len) * 52;
  const role = Math.abs(m) < 1e-9 ? "flat" : m > 0 ? "up" : "down";
  axis(); out.push({ t: "path", d: curve(k.x0, k.x1), role: "curve" });
  out.push({ t: "line", x1: px(k.X(state.x) - ux), y1: px(k.Y(y) - uy), x2: px(k.X(state.x) + ux), y2: px(k.Y(y) + uy), role });
  out.push({ t: "circle", cx: px(k.X(state.x)), cy: px(k.Y(y)), r: 12, role: "handle" });
  return out;
}

/** Whether a scene follows a finger on the picture (the others are set by their sliders only). */
export const draggable = (s: Scene) => s.kind !== "strips" && s.kind !== "line";

/** Which handle a touch at a point takes hold of: 0 or 1 for a transform's two arrows (−1 when it is far from both),
 *  0 for every other scene. The player keeps this for the length of a drag, so one arrow can be dragged across the other. */
export function grip(s: Scene, state: SceneState, x: number, y: number): number {
  if (s.kind !== "transform") return 0;
  const mx = (x - 170) / TU, my = (110 - y) / TU, d0 = Math.hypot(mx - state.a, my - state.b), d1 = Math.hypot(mx - state.c, my - state.d);
  return Math.min(d0, d1) > 1.6 ? -1 : d0 <= d1 ? 0 : 1;
}

/** A touch or drag at a point of the 340 × 220 box. Draggable scenes follow the finger; others are unchanged.
 *  `hold` is the handle taken at the start of the drag (see `grip`); without it the nearer handle is taken. */
export function pointer(s: Scene, state: SceneState, x: number, y: number, hold?: number): SceneState {
  if (s.kind === "triangle") {
    // the angles the finger makes with the two ends of an unscaled base (60..280 at y = 185), in whole degrees
    const up = Math.max(8, 185 - y);
    const a = Math.round((Math.atan2(up, x - 60) * 180) / Math.PI), b = Math.round((Math.atan2(up, 280 - x) * 180) / Math.PI);
    const next = set(s, set(s, state, "a", a), "b", b);
    return next.a + next.b > 170 ? state : next;
  }
  if (s.kind === "rectangle") return set(s, set(s, state, "w", (x - 60) / 20), "h", (196 - y) / 20);
  if (s.kind === "join") {
    // the same vertical scale as the drawing: the finger's height becomes the piece's (or the point's) height
    const ends = (add: number) => [s.at, s.to].map((v) => evalPoly(s.right, v) + add);
    const all = [0, ...[s.from, s.at].map((v) => evalPoly(s.left, v)), ...(s.mode === "shift" ? [...ends(s.k[0]), ...ends(s.k[1])] : [...ends(0), s.k[0], s.k[1]])];
    const lo = Math.min(...all), hi = Math.max(...all), height = lo + ((B - y) / (B - T)) * (hi - lo || 1);
    return set(s, state, "k", s.mode === "shift" ? height - evalPoly(s.right, s.at + (s.to - s.at) / 2) : height);
  }
  if (s.kind === "transform") {
    // the arrow tip nearer the finger follows it; a touch far from both tips moves nothing
    const mx = (x - 170) / TU, my = (110 - y) / TU, h = hold ?? grip(s, state, x, y);
    return h === 0 ? set(s, set(s, state, "a", mx), "b", my) : h === 1 ? set(s, set(s, state, "c", mx), "d", my) : state;
  }
  if (s.kind !== "slope" && s.kind !== "accumulate") return state;
  const k = scales(s);
  return set(s, state, "x", k.x0 + ((x - L) / (R - L)) * (k.x1 - k.x0));
}

/** The picture in words, for a screen reader. It says what can be moved, never the answer. */
export function describe(s: Scene): string {
  if (s.kind === "strips") return `${named(s, `An interactive graph of y = ${curveText(s)} from x = ${fmt(s.from)} to x = ${fmt(s.to)}.`)} A slider sets how many strips are drawn under the curve. ${s.prompt}`;
  if (s.kind === "slope") return `${named(s, `An interactive graph of y = ${curveText(s)}.`)} A point slides along the curve and the tangent line is drawn at it. ${s.prompt}`;
  if (s.kind === "accumulate") return `${named(s, `An interactive graph of y = ${curveText(s)}. The area is shaded from x = ${fmt(s.from)} to an edge that can be moved as far as x = ${fmt(s.to)}.`)} ${s.prompt}`;
  if (s.kind === "rectangle") return `An interactive rectangle on a grid of unit squares. Its width and height are set by two sliders or by dragging its corner. ${s.prompt}`;
  if (s.kind === "join") return `An interactive graph in two pieces that meet at x = ${fmt(s.at)}. ${s.mode === "shift" ? "The right-hand piece can be slid up and down." : "The single point at the meeting place can be moved up and down."} ${s.prompt}`;
  if (s.kind === "transform") return `An interactive grid with a shape and two arrows. Moving the arrows, or their four sliders, stretches, flips and turns the shape. ${s.prompt}`;
  if (s.kind === "triangle") return `An interactive triangle ABC. Two sliders set the angles at A and B, and the angle at C follows. ${s.prompt}`;
  return `An interactive graph with ${s.targets.length} marked ${s.targets.length === 1 ? "point" : "points"} and a straight line ${s.through ? "that turns about a fixed point, set by a slope slider" : "set by two sliders"}. ${s.prompt}`;
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
/** A state that should reach the goal, worked out directly where that is possible (tried before listing every state). */
function likely(s: Scene): SceneState | null {
  let st = initial(s);
  if (s.kind === "triangle") return set(s, set(s, st, "a", s.angles[0]), "b", s.angles[1]);
  if (s.kind === "transform") { if (!s.target) return null; ["a", "b", "c", "d"].forEach((k, i) => { st = set(s, st, k, s.target![i]); }); return st; }
  if (s.kind === "line") {
    const [p, q] = s.through ? [s.through, s.targets[0]] : [s.targets[0], s.targets[1]];
    if (!p || !q || p[0] === q[0]) return null;
    const m = (q[1] - p[1]) / (q[0] - p[0]);
    st = set(s, st, "m", m);
    return s.through ? st : set(s, st, "c", p[1] - m * p[0]);
  }
  if (s.goal.measure === "x" && s.goal.equals !== undefined) return set(s, st, "x", s.goal.equals);
  return null;
}

/**
 * The problems with a scene; an empty list means it may be shown. The player draws nothing for a scene with problems.
 * Checked: the shape of the data, that the goal names a real measure, that the goal is not already reached at the start,
 * and that some reachable state reaches it (so a learner is never asked for something the controls cannot do).
 */
export function check(v: unknown): string[] {
  const s = v as Scene, bad: string[] = [];
  if (!s || typeof s !== "object" || s.type !== "scene") return ["not a scene"];
  if (!Object.prototype.hasOwnProperty.call(MEASURES, s.kind)) return [`unknown kind ${String(s.kind)}`];
  const words = (t: unknown, name: string) => { if (typeof t !== "string" || !t.trim() || t.length > 160) bad.push(`${name} must be 1 to 160 characters`); };
  words(s.prompt, "prompt"); words(s.success, "success");
  if (s.variable !== undefined && !(typeof s.variable === "string" && /^[a-df-z]$/.test(s.variable))) bad.push("variable must be one small letter (not e)");
  const g = s.goal;
  if (!g || typeof g !== "object" || !MEASURES[s.kind].includes(g.measure)) bad.push("goal names no measure of this kind");
  else if ((g.equals === undefined) === (g.below === undefined) || !fin(g.equals ?? g.below) || (g.tol !== undefined && !(fin(g.tol) && g.tol >= 0))) bad.push("goal needs exactly one finite target");
  if (s.kind === "rectangle") {
    const whole = (v: unknown, hi: number) => v === undefined || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= hi);
    if (!whole(s.perimeter, 36) || !whole(s.area, 81)) bad.push("perimeter and area must be whole numbers a 9 by 9 grid can hold");
    if (s.words !== undefined && !(Array.isArray(s.words) && s.words.length === 2 && s.words.every((t) => typeof t === "string" && t.trim() && t.length <= 14))) bad.push("words must be two short words");
  } else if (s.kind === "join") {
    const poly = (p: unknown) => Array.isArray(p) && p.length >= 1 && p.length <= 4 && p.every(fin);
    if (!poly(s.left) || !poly(s.right)) bad.push("left and right must be 1 to 4 finite coefficients");
    if (s.mode !== "shift" && s.mode !== "point") bad.push("mode must be shift or point");
    if (![s.from, s.at, s.to].every(fin) || !(s.from < s.at && s.at < s.to)) bad.push("from, at and to must be in order");
    if (!(Array.isArray(s.k) && s.k.length === 3 && s.k.every(fin) && s.k[0] < s.k[1] && s.k[2] > 0 && (s.k[1] - s.k[0]) / s.k[2] <= 400)) bad.push("k must be [min, max, step]");
    if (s.start !== undefined && !(fin(s.start) && Array.isArray(s.k) && s.start >= s.k[0] && s.start <= s.k[1])) bad.push("start must be inside k");
  } else if (s.kind === "transform") {
    if (s.target !== undefined && !(Array.isArray(s.target) && s.target.length === 4 && s.target.every((v) => Number.isInteger(v) && Math.abs(v) <= 3))) bad.push("target must be four whole numbers from −3 to 3");
    if (g && g.measure === "miss" && s.target === undefined) bad.push("a goal on miss needs a target");
  } else if (s.kind === "triangle") {
    if (!Array.isArray(s.angles) || s.angles.length !== 2 || !s.angles.every((a) => Number.isInteger(a) && a >= 10 && a <= 150) || s.angles[0] + s.angles[1] > 170) bad.push("angles must be two whole angles of 10° to 150° with a sum of at most 170°");
  } else if (s.kind === "line") {
    const rng = (r: unknown) => Array.isArray(r) && r.length === 3 && r.every(fin) && r[0] < r[1] && r[2] > 0 && (r[1] - r[0]) / r[2] <= 400;
    const pt = (p: unknown) => Array.isArray(p) && p.length === 2 && p.every(fin);
    if (!Array.isArray(s.targets) || s.targets.length < 1 || s.targets.length > 4 || !s.targets.every(pt)) bad.push("targets must be 1 to 4 points");
    if (!Array.isArray(s.window) || s.window.length !== 4 || !s.window.every(fin) || s.window[0] >= s.window[1] || s.window[2] >= s.window[3]) bad.push("window must be [x0, x1, y0, y1]");
    if (s.through !== undefined ? !pt(s.through) || s.c !== undefined : !rng(s.c)) bad.push("a line needs either a point to turn about or a start range, not both");
    if (!rng(s.m)) bad.push("slider ranges must be [min, max, step]");
    if (s.mLabel !== undefined && !(typeof s.mLabel === "string" && s.mLabel.trim() && s.mLabel.length <= 20)) bad.push("mLabel must be 1 to 20 characters");
  } else {
    const okPoly = Array.isArray(s.poly) && s.poly.length >= 1 && s.poly.length <= 8 && s.poly.every(fin);
    const okTerms = Array.isArray(s.terms) && s.terms.length >= 1 && s.terms.length <= 6 && s.terms.every((t) => t && ["pow", "sin", "cos", "exp", "ln"].includes(t.f) && fin(t.a) && (t.b === undefined || (fin(t.b) && (t.f === "pow" ? Number.isInteger(t.b) && t.b >= 0 && t.b <= 8 : t.f === "ln" ? t.b === 1 : t.b !== 0))));
    if ((s.poly !== undefined) === (s.terms !== undefined) || !(s.poly !== undefined ? okPoly : okTerms)) bad.push("a curve is either 1 to 8 finite coefficients or 1 to 6 valid terms");
    if (!fin(s.from) || !fin(s.to) || s.from >= s.to) bad.push("from must be below to");
    else if (!bad.length && positiveOnly(s) && s.from <= 0) bad.push("a logarithm needs from above 0");
    if (s.kind === "strips" ? s.max !== undefined && !(Number.isInteger(s.max) && s.max >= 2 && s.max <= 200) : s.step !== undefined && !(fin(s.step) && s.step > 0 && (s.to - s.from) / s.step <= 2000)) bad.push("control range is out of bounds");
  }
  if (bad.length) return bad;
  if (s.kind === "strips" || s.kind === "slope" || s.kind === "accumulate") { const f = curveOf(s); for (let i = 0; i <= 40; i++) if (!fin(f.value(s.from + ((s.to - s.from) * i) / 40))) return ["the curve is not finite on its range"]; }
  if (met(s, initial(s))) bad.push("the goal is already reached at the start");
  const guess = likely(s);
  let reachable = !!guess && met(s, guess);
  if (!reachable) for (const st of states(s)) if (met(s, st)) { reachable = true; break; }
  if (!reachable) bad.push("no reachable state reaches the goal");
  return bad;
}
