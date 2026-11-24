/**
 * scene@9, the labelled figures of the scene engine (packages/learning/src/scene.ts): the parts of a `pick` scene and the
 * triangle of a `ratios` scene. This file holds geometry only: where each part is in the 340 × 220 box, what it is
 * called, and which part a touch lands on. It is used through scene.ts (controls, measures, draw, pointer, check), never
 * by a screen directly: a new figure is a new description here, not a new component.
 */
import type { Shape } from "./scene";

export type PickFigure =
  | { of: "right-triangle"; thetaAt: "left" | "top" }
  | { of: "circle" | "angle" | "venn" | "unit-circle" }
  | { of: "plane"; /** a vector from O drawn to this point (a labelled picture of a vector) */ arrow?: [number, number] }
  | { of: "matrix"; values: number[][] };

const px = (v: number) => Math.round(v * 10) / 10;
const neg = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
const TRI = { left: { opposite: "right", adjacent: "bottom", hypotenuse: "slant" }, top: { opposite: "bottom", adjacent: "right", hypotenuse: "slant" } } as const;
const C = { x: 170, y: 110, r: 85 }, on = (deg: number, r = C.r) => [px(C.x + r * Math.cos((deg * Math.PI) / 180)), px(C.y - r * Math.sin((deg * Math.PI) / 180))] as const;
const U = 22, cell = (f: { values: number[][] }, i: number, j: number) => [170 + (j - (f.values[0].length - 1) / 2) * 56, 110 + (i - (f.values.length - 1) / 2) * 46] as const;

/** The parts of a figure, in a fixed order (a scene's `part` control counts them from 1; 0 is nothing chosen). */
export function pickParts(f: PickFigure): string[] {
  switch (f.of) {
    case "right-triangle": return ["bottom", "right", "slant"];
    case "circle": return ["centre", "radius", "diameter", "chord", "arc"];
    case "angle": return ["vertex", "arm1", "arm2"];
    case "venn": return ["A", "B", "AB", "out"];
    case "unit-circle": return ["p:0", "p:90", "p:180", "p:270"];
    case "plane": return Array.from({ length: 81 }, (_, i) => `p:${(i % 9) - 4},${Math.floor(i / 9) - 4}`);
    case "matrix": return f.values.flatMap((r, i) => r.map((_, j) => `e:${i + 1},${j + 1}`));
  }
}

/** What a part is, said to the learner ("the adjacent side: it touches θ and is not the hypotenuse"). */
export function pickName(f: PickFigure, part: string): string {
  switch (f.of) {
    case "right-triangle": {
      const name = (Object.entries(TRI[f.thetaAt]).find(([, p]) => p === part) ?? ["side"])[0];
      return name === "hypotenuse" ? "the hypotenuse: the longest side, facing the right angle" : name === "opposite" ? "the opposite side: it is across from θ and does not touch it" : "the adjacent side: it touches θ and is not the hypotenuse";
    }
    case "circle": return ({ centre: "the centre: the middle point", radius: "a radius: from the centre to the edge", diameter: "a diameter: edge to edge through the centre", chord: "a chord: edge to edge, not through the centre", arc: "an arc: a piece of the round edge" } as Record<string, string>)[part];
    case "angle": return part === "vertex" ? "the vertex: the corner point where the arms meet" : "an arm: one of the two lines that make the angle";
    case "venn": return ({ A: "the part in A only", B: "the part in B only", AB: "the part in both A and B", out: "the part outside both circles: in neither" } as Record<string, string>)[part];
    case "unit-circle": return `the point reached after turning ${part.slice(2)}°`;
    case "plane": { const [x, y] = part.slice(2).split(",").map(Number); return `the point (${neg(x)}, ${neg(y)})`; }
    case "matrix": { const [r, c] = part.slice(2).split(","); return `the entry in row ${r}, column ${c}`; }
  }
}
/** The side of a right triangle called opposite, adjacent or hypotenuse for where θ is. */
export const triangleSide = (thetaAt: "left" | "top", name: "opposite" | "adjacent" | "hypotenuse") => TRI[thetaAt][name];

const seg = (x: number, y: number, a: readonly number[], b: readonly number[]) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
const SEGS: Record<string, Record<string, [readonly number[], readonly number[]]>> = {
  "right-triangle": { bottom: [[60, 180], [280, 180]], right: [[280, 180], [280, 50]], slant: [[60, 180], [280, 50]] },
  circle: { radius: [[C.x, C.y], on(-55)], diameter: [on(180), on(0)], chord: [on(150), on(50)] },
  angle: { arm1: [[60, 180], [300, 180]], arm2: [[60, 180], [250, 50]] },
};
const POINTS: Record<string, Record<string, readonly number[]>> = {
  circle: { centre: [C.x, C.y] }, angle: { vertex: [60, 180] },
  "unit-circle": { "p:0": [250, 110], "p:90": [170, 30], "p:180": [90, 110], "p:270": [170, 190] },
};
/** Which part a touch at (x, y) lands on: its number from 1, or 0 when the touch is on nothing. */
export function pickAt(f: PickFigure, x: number, y: number): number {
  const parts = pickParts(f);
  if (f.of === "venn") {
    if (x < 20 || x > 320 || y < 15 || y > 205) return 0;
    const a = Math.hypot(x - 135, y - 110) <= 70, b = Math.hypot(x - 205, y - 110) <= 70;
    return parts.indexOf(a && b ? "AB" : a ? "A" : b ? "B" : "out") + 1;
  }
  if (f.of === "plane") { const gx = Math.round((x - 170) / U), gy = Math.round((110 - y) / U); return Math.abs(gx) > 4 || Math.abs(gy) > 4 ? 0 : (gy + 4) * 9 + (gx + 4) + 1; }
  if (f.of === "matrix") { let best = 0, d = 34; f.values.forEach((r, i) => r.forEach((_, j) => { const [cx, cy] = cell(f, i, j), e = Math.max(Math.abs(x - cx) / 1.2, Math.abs(y - cy)); if (e < d) { d = e; best = i * r.length + j + 1; } })); return best; }
  // points win over the lines that pass through them; a touch far from every part is nothing
  let best = 0, d = 26;
  for (const [id, p] of Object.entries(POINTS[f.of] ?? {})) { const e = Math.hypot(x - p[0], y - p[1]) - 10; if (e < d) { d = e; best = parts.indexOf(id) + 1; } }
  for (const [id, [a, b]] of Object.entries(SEGS[f.of] ?? {})) { const e = seg(x, y, a, b); if (e < d) { d = e; best = parts.indexOf(id) + 1; } }
  if (f.of === "circle") { const ang = (Math.atan2(C.y - y, x - C.x) * 180) / Math.PI, e = Math.abs(Math.hypot(x - C.x, y - C.y) - C.r); if (ang <= -100 && ang >= -145 && e < d) best = parts.indexOf("arc") + 1; }
  return best;
}

/** The figure as shapes. `picked` is the chosen part (styled right or wrong); `labels` writes each part's name on it. */
export function pickDraw(f: PickFigure, picked: string | null, right: boolean, labels: boolean): Shape[] {
  const out: Shape[] = [], role = (base: string, id: string) => (id === picked ? `${base}-${right ? "right" : "wrong"}` : base);
  const text = (x: number, y: number, s: string, r = "label") => out.push({ t: "text", x, y, s, role: r });
  const lines = () => { for (const [id, [a, b]] of Object.entries(SEGS[f.of] ?? {})) out.push({ t: "line", x1: a[0], y1: a[1], x2: b[0], y2: b[1], role: role("pline", id) }); };
  const points = () => { for (const [id, p] of Object.entries(POINTS[f.of] ?? {})) out.push({ t: "circle", cx: p[0], cy: p[1], r: 6, role: role("ppoint", id) }); };
  if (f.of === "right-triangle") {
    lines();
    out.push({ t: "path", d: "M266 180V166H280", role: "mark" });
    if (f.thetaAt === "left") { out.push({ t: "path", d: "M95 180A35 35 0 0 0 90.1 162.2", role: "theta" }); text(106, 174, "θ", "value"); }
    else { out.push({ t: "path", d: "M280 85A35 35 0 0 1 249.9 67.8", role: "theta" }); text(264, 96, "θ", "value"); }
    if (labels) { const n = Object.fromEntries(Object.entries(TRI[f.thetaAt]).map(([k, v]) => [v, k])); text(170, 198, n.bottom); text(308, 120, n.right); text(138, 100, n.slant); }
  } else if (f.of === "circle") {
    out.push({ t: "circle", cx: C.x, cy: C.y, r: C.r, role: "curve" });
    const [a, b] = [on(215), on(260)];
    out.push({ t: "path", d: `M${a[0]} ${a[1]}A${C.r} ${C.r} 0 0 0 ${b[0]} ${b[1]}`, role: role("parc", "arc") });
    lines(); points();
    if (labels) { text(128, 104, "diameter"); text(222, 148, "radius"); text(160, 46, "chord"); text(150, 128, "centre"); text(112, 198, "arc"); }
  } else if (f.of === "angle") {
    lines(); points();
    out.push({ t: "path", d: "M110 180A50 50 0 0 0 101.3 151.8", role: "theta" });
    if (labels) { text(52, 200, "vertex"); text(240, 198, "arm"); text(168, 92, "arm"); }
  } else if (f.of === "venn") {
    out.push({ t: "rect", x: 20, y: 15, w: 300, h: 190, role: role("pregion", "out") });
    out.push({ t: "path", d: "M170 49.4A70 70 0 1 0 170 170.6A70 70 0 0 1 170 49.4Z", role: role("pregion", "A") });
    out.push({ t: "path", d: "M170 49.4A70 70 0 1 1 170 170.6A70 70 0 0 0 170 49.4Z", role: role("pregion", "B") });
    out.push({ t: "path", d: "M170 49.4A70 70 0 0 1 170 170.6A70 70 0 0 1 170 49.4Z", role: role("pregion", "AB") });
    text(52, 40, "A", "value"); text(288, 40, "B", "value");
    if (labels) { text(105, 114, "A only"); text(170, 114, "both"); text(235, 114, "B only"); text(170, 198, "neither"); }
  } else if (f.of === "unit-circle") {
    out.push({ t: "line", x1: 70, y1: 110, x2: 270, y2: 110, role: "axis" }, { t: "line", x1: 170, y1: 14, x2: 170, y2: 206, role: "axis" }, { t: "circle", cx: 170, cy: 110, r: 80, role: "curve" });
    points(); text(290, 105, "(1, 0)");
    if (labels) { text(170, 24, "90°"); text(70, 105, "180°"); text(190, 208, "270°"); }
  } else if (f.of === "plane") {
    for (let k = -4; k <= 4; k++) { out.push({ t: "line", x1: 170 + k * U, y1: 22, x2: 170 + k * U, y2: 198, role: k === 0 ? "axis" : "grid" }, { t: "line", x1: 82, y1: 110 - k * U, x2: 258, y2: 110 - k * U, role: k === 0 ? "axis" : "grid" }); if (k > 0) { text(170 + k * U, 124, `${k}`); text(160, 114 - k * U, `${k}`); } }
    text(266, 114, "x"); text(170, 16, "y"); text(160, 124, "O");
    for (const id of pickParts(f)) { const [x, y] = id.slice(2).split(",").map(Number); if (id === picked) out.push({ t: "circle", cx: 170 + x * U, cy: 110 - y * U, r: 7, role: role("ppoint", id) }); else out.push({ t: "circle", cx: 170 + x * U, cy: 110 - y * U, r: 2, role: "pdot" }); }
    const mark = f.arrow ?? (labels ? [3, 2] as [number, number] : null);
    if (mark) { const [x, y] = mark, X = 170 + x * U, Y = 110 - y * U; if (f.arrow) out.push({ t: "line", x1: 170, y1: 110, x2: X, y2: Y, role: "accent" }); else out.push({ t: "line", x1: X, y1: 110, x2: X, y2: Y, role: "edge" }, { t: "line", x1: 170, y1: Y, x2: X, y2: Y, role: "edge" }); out.push({ t: "circle", cx: X, cy: Y, r: 6, role: "handle" }); text(X + 24, Y - 8, `(${neg(x)}, ${neg(y)})`, "value"); }
  } else if (f.of === "matrix") {
    const rows = f.values.length, cols = f.values[0].length, top = cell(f, 0, 0)[1] - 26, bottom = cell(f, rows - 1, 0)[1] + 22, lx = cell(f, 0, 0)[0] - 34, rx = cell(f, 0, cols - 1)[0] + 34;
    out.push({ t: "path", d: `M${lx + 10} ${top}H${lx}V${bottom}H${lx + 10}`, role: "curve" }, { t: "path", d: `M${rx - 10} ${top}H${rx}V${bottom}H${rx - 10}`, role: "curve" });
    f.values.forEach((r, i) => r.forEach((v, j) => { const id = `e:${i + 1},${j + 1}`, [cx, cy] = cell(f, i, j); if (id === picked) out.push({ t: "rect", x: cx - 24, y: cy - 22, w: 48, h: 40, role: role("pbox", id) }); out.push({ t: "text", x: cx, y: cy + 6, s: neg(v), role: "pcell" }); }));
    if (labels) { f.values.forEach((_, i) => text(rx + 22, cell(f, i, 0)[1] + 4, `row ${i + 1}`)); f.values[0].forEach((_, j) => text(cell(f, 0, j)[0], bottom + 18, `col ${j + 1}`)); }
  }
  return out;
}

/** The problem with a figure, or null. */
export function pickCheck(f: unknown): string | null {
  const g = f as PickFigure;
  if (!g || typeof g !== "object" || !["right-triangle", "circle", "angle", "venn", "unit-circle", "plane", "matrix"].includes(g.of)) return "unknown figure";
  if (g.of === "right-triangle" && g.thetaAt !== "left" && g.thetaAt !== "top") return "thetaAt must be left or top";
  if (g.of === "plane" && g.arrow !== undefined && !(Array.isArray(g.arrow) && g.arrow.length === 2 && g.arrow.every((v) => Number.isInteger(v) && Math.abs(v) <= 4))) return "arrow must be a whole-number point from −4 to 4";
  if (g.of === "matrix" && !(Array.isArray(g.values) && g.values.length >= 1 && g.values.length <= 3 && g.values.every((r) => Array.isArray(r) && r.length === g.values[0].length && r.length >= 1 && r.length <= 4 && r.every((v) => Number.isInteger(v) && Math.abs(v) <= 99)))) return "a matrix needs 1 to 3 rows of 1 to 4 whole numbers";
  return null;
}
/** The figure in words, for a screen reader. */
export const pickWords = (f: PickFigure) => ({ "right-triangle": `a right triangle with the angle θ marked at ${f.of === "right-triangle" && f.thetaAt === "top" ? "the top" : "the left"} corner`, circle: "a circle with its centre, a radius, a diameter, a chord and a coloured arc", angle: "an angle made by two arms meeting at a vertex", venn: "two overlapping circles A and B inside a box", "unit-circle": "a circle of radius 1 on axes, with four marked points", plane: "a grid of points with x and y axes from −4 to 4", matrix: f.of === "matrix" ? `a matrix with ${f.values.length} rows and ${f.values[0].length} columns` : "" })[f.of];

const RA = { x: 50, y: 195, k: 17 };
/** A right triangle with the angle θ at the left and a hypotenuse of `size`: its corners and side lengths. */
export function ratiosOf(angle: number, size: number) {
  const t = (angle * Math.PI) / 180, adj = size * Math.cos(t), opp = size * Math.sin(t);
  return { adj, opp, bx: px(RA.x + adj * RA.k), cy: px(RA.y - opp * RA.k), sin: Math.sin(t), cos: Math.cos(t), tan: Math.tan(t) };
}
export function ratiosDraw(angle: number, size: number, one: (n: number) => string): Shape[] {
  const r = ratiosOf(angle, size);
  return [
    { t: "path", d: `M${RA.x} ${RA.y}H${r.bx}V${r.cy}Z`, role: "shape" }, { t: "path", d: `M${r.bx - 11} ${RA.y}V${RA.y - 11}H${r.bx}`, role: "mark" },
    { t: "text", x: RA.x + 34, y: RA.y - 6, s: "θ", role: "value" }, { t: "text", x: (RA.x + r.bx) / 2, y: RA.y + 16, s: `adjacent ${one(r.adj)}`, role: "label" },
    { t: "text", x: Math.min(r.bx + 44, 292), y: (RA.y + r.cy) / 2, s: `opposite ${one(r.opp)}`, role: "label" }, { t: "text", x: Math.max(70, (RA.x + r.bx) / 2 - 40), y: Math.max(14, (RA.y + r.cy) / 2 - 16), s: `hypotenuse ${one(size)}`, role: "label" },
    { t: "circle", cx: r.bx, cy: r.cy, r: 8, role: "handle" },
  ];
}
/** The angle and size a finger at (x, y) asks for (the top corner follows the finger). */
export const ratiosAt = (x: number, y: number) => ({ angle: (Math.atan2(Math.max(1, RA.y - y), Math.max(1, x - RA.x)) * 180) / Math.PI, size: Math.hypot(x - RA.x, RA.y - y) / RA.k });

/* conic-tangent@1: a point going round the ellipse x²/a² + y²/b² = 1, and the tangent there */
const TG = { cx: 170, cy: 108 };
const tgScale = (a: number, b: number) => Math.min(120 / a, 78 / b);
/** The point at `turn` degrees round the ellipse (a cos t, b sin t) and the tangent's slope there, −b²x/(a²y). At the two ends
 * of the wide axis the tangent is straight up and has no slope; at the top and bottom it is flat. */
export function tangentOf(a: number, b: number, turn: number) {
  const t = (turn * Math.PI) / 180, q = ((turn % 360) + 360) % 360;
  const upright = q === 0 || q === 180, flat = q === 90 || q === 270;
  const x = upright ? (q === 0 ? a : -a) : flat ? 0 : a * Math.cos(t), y = flat ? (q === 90 ? b : -b) : upright ? 0 : b * Math.sin(t);
  return { x, y, upright, flat, slope: upright ? NaN : flat ? 0 : -(b * b * x) / (a * a * y) };
}
export function tangentDraw(a: number, b: number, turn: number, normal: boolean): Shape[] {
  const k = tgScale(a, b), p = tangentOf(a, b, turn), px = TG.cx + p.x * k, py = TG.cy - p.y * k;
  // the tangent's direction on the page (y goes down the page)
  const [dx, dy] = p.upright ? [0, 1] : [1 / Math.hypot(1, p.slope), -p.slope / Math.hypot(1, p.slope)], L = 95;
  const out: Shape[] = [
    { t: "line", x1: TG.cx - a * k - 26, y1: TG.cy, x2: TG.cx + a * k + 26, y2: TG.cy, role: "axis" }, { t: "line", x1: TG.cx, y1: TG.cy + b * k + 14, x2: TG.cx, y2: TG.cy - b * k - 14, role: "axis" },
    { t: "path", d: `M${TG.cx - a * k} ${TG.cy}A${a * k} ${b * k} 0 1 0 ${TG.cx + a * k} ${TG.cy}A${a * k} ${b * k} 0 1 0 ${TG.cx - a * k} ${TG.cy}Z`, role: "curve" },
    { t: "text", x: TG.cx + a * k + 12, y: TG.cy + 15, s: String(a), role: "label" }, { t: "text", x: TG.cx - a * k - 14, y: TG.cy + 15, s: `−${a}`, role: "label" },
    { t: "text", x: TG.cx + 10, y: TG.cy - b * k - 4, s: String(b), role: "label" }, { t: "text", x: TG.cx + 12, y: TG.cy + b * k + 13, s: `−${b}`, role: "label" },
    { t: "line", x1: px - dx * L, y1: py - dy * L, x2: px + dx * L, y2: py + dy * L, role: "curve2" },
  ];
  if (normal) out.push({ t: "line", x1: px + dy * 60, y1: py - dx * 60, x2: px - dy * 60, y2: py + dx * 60, role: "guide" });
  out.push({ t: "circle", cx: px, cy: py, r: 8, role: "handle" });
  return out;
}
/** How far round a finger at (x, y) is, measured the way the point is placed (so the point follows the finger). */
export const tangentAt = (a: number, b: number, x: number, y: number) => { const k = tgScale(a, b), d = (Math.atan2((TG.cy - y) / (b * k), (x - TG.cx) / (a * k)) * 180) / Math.PI; return (Math.round(d / 15) * 15 + 360) % 360; };
