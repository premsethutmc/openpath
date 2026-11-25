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

/* tally@1: the counter and the lift (tally.ts). A tall box: the lift shaft down the left, the big counter at the top
 * right, the tiles in a tray under it. Geometry only; scene.ts gives it controls, measures and checks.
 * Three columns that never meet: floor numbers left of the shaft; each tile's bracket and "+2" right of it (x 121–181);
 * the counter and the tray from x 186. So a step label can reach any height without going under the counter. */
export const TALLY_BOX = { w: 340, h: 420 } as const;
const TS = { x: 48, w: 70, top: 20, bottom: 402 }, TRAY = { x: 186, y: 134 }, TW = 68, TH = 50;
const CT = { x: 186, y: 14, w: 144, h: 100 }, WIN = { x: 194, y: 24, w: 128, h: 80 };
/** A number in a unit the child knows: "₹6", "−₹2"; for any other unit (or none) the number alone. */
export const tallyNum = (n: number, unit?: string) => `${n < 0 ? "−" : ""}${unit === "₹" ? "₹" : ""}${Math.abs(n)}`;
/** A tile as it is written on it: "+2", "−10", "+₹2" for money. */
export const tileText = (t: number, unit?: string) => `${t < 0 ? "−" : "+"}${unit === "₹" ? "₹" : ""}${Math.abs(t)}`;
/** What tile `i` says: its move ("+2", "−₹10"), or with `goTo` the floor it takes the lift to ("↑₹50", change-up@1). */
export const tallyTileLabel = (tiles: number[], i: number, start: number, unit?: string, goTo?: boolean) =>
  goTo ? `${tiles[i] > 0 ? "↑" : "↓"}${tallyNum(start + tiles.slice(0, i + 1).reduce((a, b) => a + b, 0), unit)}` : tileText(tiles[i], unit);
/** Where tile `i` of `n` sits in the tray (its top-left corner): one column of up to four, or two columns. */
export function tallyTileXY(n: number, i: number): [number, number] {
  const two = n > 4, col = two ? i % 2 : 0, row = two ? Math.floor(i / 2) : i;
  return [two ? TRAY.x + 2 + col * 74 : TRAY.x + (330 - TRAY.x - TW) / 2, TRAY.y + 12 + row * 66];
}
/** The tile a touch at (x, y) lands on, among those not yet used, or −1. */
export function tallyTileAt(n: number, used: number[], x: number, y: number): number {
  for (let i = 0; i < n; i++) { if (used.includes(i)) continue; const [tx, ty] = tallyTileXY(n, i); if (x >= tx - 3 && x <= tx + TW + 3 && y >= ty - 6 && y <= ty + TH + 6) return i; }
  return -1;
}
/** Whether a tile let go at (x, y) has been put in: anywhere off the tray (on the lift, beside it, on the counter). */
export const tallyInDrop = (x: number, y: number) => x < TRAY.x - 4 || y < TRAY.y - 4;

export interface TallyView {
  floors: [number, number]; start: number; tiles: number[]; used: number[]; at: number;
  /** the number the latest move started from (its floors are lit as a trail) */
  from?: number; held?: { i: number; x: number; y: number }; refused?: number; unit?: string; hintArrow?: boolean;
  /** change-up@1: tiles say where they go, not how far (TallyScene.goTo) */
  goTo?: boolean;
  /** a tile tapped while the lift is still moving: it waits its turn, shown faded and ticked (it is taken) */
  taken?: number;
}
/**
 * even-floors@1: the floors that get a number, at one fixed step (every floor when they are roomy and at most 15, else
 * every 2nd, 5th or 10th, a step the start falls on where one fits), so the spacing never points at a floor. The start
 * always has its number (it gives way to the end, first in `keep` once the lift is there, when the two are too close). A regular number too near one of those is
 * left out, and none goes on the round 0 marker (radius `zr`).
 */
export function tallyLabelled(floors: [number, number], keep: number[], fh: number, zr = 15, start: number | undefined = keep[0]): number[] {
  const [lo, hi] = floors, n = hi - lo;
  const fits = (k: number) => (k === 1 ? n <= 15 && fh >= 13 : fh * k >= 15 && n / k <= 15);
  const steps = [1, 2, 5, 10, 20];
  const every = steps.find((k) => fits(k) && (start === undefined || start % k === 0)) ?? steps.find(fits) ?? 20;
  const near = (f: number, g: number) => Math.abs(f - g) * fh < 20;
  const must: number[] = [];
  for (const f of keep) if (f !== 0 && f >= lo && f <= hi && !must.some((g) => g === f || near(f, g))) must.push(f);
  const out = new Set(must);
  for (let f = lo; f <= hi; f++) {
    if (f === 0 || f % every !== 0 || must.some((g) => g !== f && near(f, g))) continue;
    if (lo <= 0 && Math.abs(f) * fh < zr + 9) continue; // clear of the 0 marker
    out.add(f);
  }
  return [...out].sort((a, b) => a - b);
}
export function tallyDraw(v: TallyView): Shape[] {
  const out: Shape[] = [], [lo, hi] = v.floors, n = hi - lo + 1, fh = (TS.bottom - TS.top) / n;
  const mid = (f: number) => px(TS.bottom - (f - lo + 0.5) * fh), edge = (f: number) => px(TS.bottom - (f - lo) * fh);
  const text = (x: number, y: number, s: string, role: string) => out.push({ t: "text", x, y, s, role });
  const num = (f: number) => (f < 0 ? `−${-f}` : `${f}`);
  const money = v.unit === "₹";
  const end = v.start + v.tiles.reduce((a, b) => a + b, 0);
  // the building: the shaft, with the basement (below 0) in the colour of earth
  out.push({ t: "rect", x: TS.x, y: TS.top, w: TS.w, h: TS.bottom - TS.top, role: "tally-shaft" });
  if (lo < 0) out.push({ t: "rect", x: TS.x, y: edge(Math.min(0, hi + 1)), w: TS.w, h: px(TS.bottom - edge(Math.min(0, hi + 1))), role: "tally-basement" });
  for (let f = lo; f <= hi; f++) if (fh >= 5 || f % 5 === 0) out.push({ t: "line", x1: TS.x, y1: edge(f), x2: TS.x + TS.w, y2: edge(f), role: "tally-floor" });
  const zr = px(Math.max(9, Math.min(15, fh / 2 + 1))), hasZero = lo <= 0 && hi >= 0;
  // the end floor gets its own number only once the lift is there (before, a lone number there would give it away)
  const arrived = v.used.length === v.tiles.length && v.at === end;
  const mall = !v.unit || /floor/i.test(v.unit);
  for (const f of tallyLabelled(v.floors, arrived ? [end, v.start] : [v.start], fh, hasZero ? zr : 0, v.start)) {
    // a start or an end just by 0 is lifted (or lowered) clear of the round 0 marker
    const y = !hasZero ? mid(f) + 5 : f > 0 ? Math.min(mid(f) + 5, mid(0) - zr - 6) : Math.max(mid(f) + 5, mid(0) + zr + 16);
    text(TS.x - 17, px(y), num(f), "tally-flabel");
    // the basement floors as a mall lift names them
    // (a mall lift only: never on a thermometer or a sea-level picture, whose unit is °C or m)
    if (mall && f < 0 && fh >= 12) text(12, px(mid(f) + 4.5), `B${-f}`, "tally-hint");
  }
  // the trail: every floor the latest move went through, a dot on each
  if (v.from !== undefined && v.from !== v.at) {
    const a = Math.min(v.from, v.at), b = Math.max(v.from, v.at);
    out.push({ t: "rect", x: TS.x + 3, y: edge(b + 1), w: TS.w - 6, h: px((b - a + 1) * fh), role: v.at > v.from ? "tally-trail-up" : "tally-trail-down" });
    for (let f = a; f <= b; f++) if (fh >= 7) out.push({ t: "circle", cx: TS.x + TS.w - 9, cy: mid(f), r: Math.min(3.5, fh / 4), role: "tally-dot" });
  }
  // ground floor 0: a band across the shaft and a round label that lights up when the lift is there
  if (lo <= 0 && hi >= 0) {
    const on = v.at === 0;
    out.push({ t: "rect", x: TS.x - 32, y: edge(1), w: TS.w + 32, h: px(fh), role: on ? "tally-ground-on" : "tally-ground" });
    out.push({ t: "line", x1: TS.x - 34, y1: edge(0), x2: TS.x + TS.w + 4, y2: edge(0), role: "tally-groundline" });
    out.push({ t: "circle", cx: TS.x - 17, cy: mid(0), r: zr, role: on ? "tally-zero-on" : "tally-zero" });
    text(TS.x - 17, px(mid(0) + 5.5), "0", "tally-zerotext");
    if (mall && fh >= 12 && lo < 0) text(6, px(mid(0) + 4.5), "G", "tally-hint");
  }
  // beside the shaft, what each tile did: a bracket from where it started to the floor it took the lift to (an arrowhead
  // there, and the tile's own "+2" beside it). Each tile has its own lane, so up, down and up again stay three brackets.
  let p = v.start;
  const lane = v.tiles.length > 1 ? Math.min(12, 22 / (v.tiles.length - 1)) : 0;
  v.used.forEach((ti, k) => {
    const t = v.tiles[ti], last = k === v.used.length - 1, to = last ? v.at : p + t;
    if (to !== p) {
      const x = px(TS.x + TS.w + 5 + k * lane), y1 = mid(p), y2 = mid(to), role = t > 0 ? "tally-step-up" : "tally-step-down";
      out.push({ t: "path", d: `M${x} ${y1}H${x + 6}V${y2}H${x + 1}`, role }, { t: "path", d: `M${x + 7} ${px(y2 - 6)}L${x - 1} ${y2}L${x + 7} ${px(y2 + 6)}Z`, role: `${role}-head` });
      // the size of a goTo tile (the change) is written only once the lift has got there
      if (!(v.goTo && last && v.at !== p + t)) text(163, px(y2 + 5), tileText(t, v.unit), `${role}-text`);
    }
    p += t;
  });
  // the lift car, with the floor it is on written on it (in rupees for money)
  const ch = Math.max(20, Math.min(40, fh - 3)), cy = mid(v.at), car = money ? tallyNum(v.at, "₹") : num(v.at);
  out.push({ t: "rect", x: TS.x + 6, y: px(cy - ch / 2), w: TS.w - 12, h: px(ch), role: "tally-car" });
  text(TS.x + TS.w / 2, px(cy + (ch >= 28 ? 6.5 : 4.5)), car, ch >= 28 && car.length <= 3 ? "tally-cartext" : "tally-cartext-small");
  // the big counter: its digits roll, up when counting on and down when counting back, inside its window only
  const shown = money ? tallyNum(v.at, "₹") : num(v.at);
  out.push({ t: "rect", x: CT.x, y: CT.y, w: CT.w, h: CT.h, role: "tally-counter" }, { t: "rect", x: WIN.x, y: WIN.y, w: WIN.w, h: WIN.h, role: "tally-window" });
  out.push({ t: "text", x: WIN.x + WIN.w / 2, y: shown.length <= 3 ? 87 : 82, s: shown, role: `tally-roll-${v.from === undefined || v.from === v.at ? "still" : v.at > v.from ? "up" : "down"}${shown.length > 3 ? "-long" : ""}`, clip: WIN });
  if (v.unit && !money) text(WIN.x + WIN.w / 2, 128, v.unit, "label");
  // the tray: the tiles not yet used; a refused one shakes; the one in the hand follows the finger. Money is coins.
  const tile = (i: number, x: number, y: number, extra: string) => {
    const t = v.tiles[i], s = tallyTileLabel(v.tiles, i, v.start, v.unit, v.goTo), coin = money ? "-coin" : "";
    out.push({ t: "rect", x, y, w: TW, h: TH, role: `tally-${t > 0 ? "plus" : "minus"}${coin}${extra}` }, { t: "text", x: px(x + TW / 2), y: px(y + TH / 2 + (s.length > 3 ? 7 : 9)), s, role: `tally-tiletext${money && t > 0 ? "-coin" : ""}${s.length > 3 ? "-long" : ""}` });
  };
  const rows = v.tiles.length > 4 ? Math.ceil(v.tiles.length / 2) : v.tiles.length;
  if (v.used.length < v.tiles.length) out.push({ t: "rect", x: TRAY.x, y: TRAY.y, w: 330 - TRAY.x, h: rows * 66 + 14, role: "tally-tray" });
  v.tiles.forEach((_, i) => {
    if (v.used.includes(i)) return;
    const [x, y] = tallyTileXY(v.tiles.length, i);
    if (v.held?.i === i) { out.push({ t: "rect", x, y, w: TW, h: TH, role: "tally-slot" }); return; }
    tile(i, x, y, v.refused === i ? "-no" : "");
    if (v.taken === i) out.push({ t: "rect", x, y, w: TW, h: TH, role: "tally-taken" }, { t: "text", x: px(x + TW - 12), y: px(y + 18), s: "✓", role: "tally-takentext" });
  });
  // before the first tile: an arrow from it into the lift car (where the tile goes), not at a floor number
  if (v.hintArrow && !v.held) {
    const [x, y] = tallyTileXY(v.tiles.length, 0), x0 = x - 6, y0 = y + TH / 2, ax = TS.x + TS.w - 8, ay = mid(v.start);
    out.push({ t: "path", d: `M${x0} ${y0}C${ax + 40} ${y0} ${ax + 40} ${ay} ${ax + 12} ${ay}`, role: "tally-arrow" }, { t: "path", d: `M${ax + 12} ${px(ay - 9)}L${ax} ${ay}L${ax + 12} ${px(ay + 9)}`, role: "tally-arrowhead" });
  }
  if (v.held) {
    out.push({ t: "rect", x: TS.x - 5, y: TS.top - 5, w: TS.w + 10, h: TS.bottom - TS.top + 10, role: tallyInDrop(v.held.x, v.held.y) ? "tally-zone-on" : "tally-zone" });
    tile(v.held.i, px(v.held.x - TW / 2), px(v.held.y - TH / 2), "-held");
  }
  return out;
}

/* boxes@1: things in two boxes, then a ten-spot board (boxes.ts). Two boxes side by side at the top, each as wide as its
 * things need (mock: 3fr 2fr), with a number badge on its top edge; under them the wooden board of 2 rows of 5 spots.
 * Things are cells of `c` (60 when they fit: about 58 px on a phone). Geometry only. */
export interface BoxesLayout {
  w: number; h: number; c: number;
  /** the two boxes: x, y, w, h, and how many things across */
  box: { x: number; y: number; w: number; h: number; cols: number }[];
  board: { x: number; y: number; w: number; h: number };
  /** the middle of each of the ten spots, and their radius */
  spots: [number, number][]; r: number;
}
const BOXES_TOP = 24, BOXES_PAD = 6, BOXES_HEAD = 18;
export function boxesLayout(a: number, b: number): BoxesLayout {
  const across = (n: number) => (n <= 3 ? n : n === 4 ? 2 : 3);
  const cols = [across(a), across(b)], rows = [Math.ceil(a / cols[0]), Math.ceil(b / cols[1])];
  const c = Math.min(60, Math.floor((340 - 8 - 8 - 4 * BOXES_PAD) / (cols[0] + cols[1])));
  const h = BOXES_HEAD + Math.max(...rows) * c + BOXES_PAD;
  const wA = cols[0] * c + 2 * BOXES_PAD, wB = cols[1] * c + 2 * BOXES_PAD, x0 = (340 - wA - 8 - wB) / 2;
  const box = [{ x: px(x0), y: BOXES_TOP, w: wA, h, cols: cols[0] }, { x: px(x0 + wA + 8), y: BOXES_TOP, w: wB, h, cols: cols[1] }];
  const by = BOXES_TOP + h + 16, pitch = (332 - 16) / 5, board = { x: 4, y: by, w: 332, h: 2 * pitch + 14 };
  const spots: [number, number][] = Array.from({ length: 10 }, (_, i) => [px(12 + pitch * ((i % 5) + 0.5)), px(by + 8 + pitch * (Math.floor(i / 5) + 0.5))]);
  return { w: 340, h: px(by + board.h + 6), c, box, board, spots, r: px(pitch / 2 - 4) };
}
/** The middle of thing `i` (the first box's are 0 … a−1) in its box: rows from the top, each row centred. */
export function boxesThingXY(L: BoxesLayout, a: number, b: number, i: number): [number, number] {
  const k = i < a ? 0 : 1, j = k ? i - a : i, n = k ? b : a, bx = L.box[k], cols = bx.cols;
  const row = Math.floor(j / cols), inRow = Math.min(cols, n - row * cols), col = j % cols;
  const rowsAll = Math.ceil(n / cols), top = bx.y + BOXES_HEAD + (bx.h - BOXES_HEAD - BOXES_PAD - rowsAll * L.c) / 2;
  return [px(bx.x + bx.w / 2 + (col - (inRow - 1) / 2) * L.c), px(top + (row + 0.5) * L.c)];
}
/** The thing a touch at (x, y) lands on, among those still in a box, or −1. */
export function boxesThingAt(L: BoxesLayout, a: number, b: number, gone: number[], x: number, y: number): number {
  for (let i = 0; i < a + b; i++) { if (gone.includes(i)) continue; const [tx, ty] = boxesThingXY(L, a, b, i); if (Math.abs(x - tx) <= L.c / 2 + 2 && Math.abs(y - ty) <= L.c / 2 + 2) return i; }
  return -1;
}
/** Whether a thing let go at (x, y) is on the board (or near enough to it). */
export const boxesOnBoard = (L: BoxesLayout, x: number, y: number) => x >= L.board.x - 20 && x <= L.board.x + L.board.w + 20 && y >= L.board.y - 20 && y <= L.board.y + L.board.h + 20;

export interface BoxesView {
  a: number; b: number; thing: string; name: string;
  /** the things counted in each box (by place in the box, in the order tapped) and those on the board */
  ka: number[]; kb: number[]; gone: number[];
  /** the box lit (1, 2 or 0), the box shaking (with which of two shakes, so a second one plays again) */
  glow: number; shake?: { box: number; odd: boolean };
  /** the boxes whose number is shown */
  badges: [boolean, boolean];
  /** the spot to fill next (−1: none), the spot just filled (−1: none) */
  next: number; lit: number;
  /** a thing in the hand (dragged or carried by the finger), and the finger */
  held?: { i: number; x: number; y: number }; finger?: [number, number];
}
export function boxesDraw(L: BoxesLayout, v: BoxesView): Shape[] {
  const out: Shape[] = [];
  const text = (x: number, y: number, s: string, role: string) => out.push({ t: "text", x: px(x), y: px(y), s, role });
  const pill = (x: number, y: number, s: string, role: string, sh = "") => { out.push({ t: "rect", x: px(x - 13), y: px(y - 11), w: 26, h: 22, role: `${role}${sh}` }); text(x, y + 6, s, `${role}-text${sh}`); };
  const shakes = (k: number) => (v.shake && v.shake.box === k + 1 ? (v.shake.odd ? "-no" : "-no2") : "");
  // the boxes, each with its things and its number
  for (const k of [0, 1]) {
    const bx = L.box[k], sh = shakes(k);
    if (v.glow === k + 1) out.push({ t: "rect", x: bx.x - 5, y: bx.y - 5, w: bx.w + 10, h: bx.h + 10, role: `boxes-glow${sh}` });
    out.push({ t: "rect", x: bx.x, y: bx.y, w: bx.w, h: bx.h, role: `boxes-box${sh}` });
    const n = k ? v.b : v.a, counted = k ? v.kb : v.ka;
    for (let j = 0; j < n; j++) {
      const i = k ? v.a + j : j;
      if (v.gone.includes(i)) continue;
      const [x, y] = boxesThingXY(L, v.a, v.b, i), away = v.held?.i === i, at = counted.indexOf(j);
      text(x, y, v.thing, `boxes-thing${away ? "-ghost" : at >= 0 ? "-done" : ""}${sh}`);
      if (at >= 0 && !away) pill(x + L.c / 2 - 15, y + L.c / 2 - 13, String(at + 1), "boxes-count", sh);
      out.push({ t: "rect", x: px(x - L.c / 2), y: px(y - L.c / 2), w: L.c, h: L.c, role: "boxes-hit", tap: { i, label: `${v.name}${at >= 0 ? `, counted ${at + 1}` : ""}, in the ${k ? "second" : "first"} box` } });
    }
    if (v.badges[k]) { out.push({ t: "rect", x: px(bx.x + bx.w / 2 - 22), y: bx.y - 16, w: 44, h: 32, role: `boxes-badge${sh}` }); text(bx.x + bx.w / 2, bx.y + 8, String(n), `boxes-badge-text${sh}`); }
  }
  // the board: ten spots, filled in order, each numbered; a "+" where the second box's things begin
  const bd = L.board;
  out.push({ t: "rect", x: bd.x, y: bd.y, w: bd.w, h: bd.h, role: "boxes-board" });
  L.spots.forEach(([x, y], i) => {
    out.push({ t: "circle", cx: x, cy: y, r: L.r, role: i === v.next ? "boxes-spot-next" : "boxes-spot" });
    if (i >= v.gone.length) return;
    text(x, y, v.thing, "boxes-on");
    pill(x + L.r - 8, y + L.r - 8, String(i + 1), i === v.lit ? "boxes-num-lit" : "boxes-num");
  });
  if (v.gone.length >= v.a && v.b > 0) { const [x, y] = L.spots[v.a]; text(x - L.r - 4, y - 10, "+", "boxes-plus"); }
  // what is in the hand, over everything; the finger under it
  if (v.held) text(v.held.x, v.held.y, v.thing, "boxes-held");
  if (v.finger) text(v.finger[0], v.finger[1], "👆", "boxes-finger");
  return out;
}

/* lift@1: the lift ride (lift.ts), the approved mock. A building cut open on the left (x 0–196): a row per floor, the
 * number at the left, the shaft with the car (Chintu in it, sliding doors), and the shop and the cars at the right. The
 * lift panel on the right (x 206–340): the floor display, the big round ▲ and ▼ buttons (r 45: at least 84 px on a phone),
 * and the task card ("▼ 5", a dot per floor) or the Start / Again button. Geometry only; lift.ts and scene.ts do the rest. */
const LP = { x: 206, w: 134, cx: 273, up: 126, down: 226, r: 45, card: 282 };
const liftDots = (n: number) => (n <= 18 ? { per: 6, r: 6.5, gap: 19 } : { per: 10, r: 4.2, gap: 11.6 });
export function liftLayout(tiles: number[], floors: [number, number]) {
  const rows = floors[1] - floors[0] + 1, H = Math.min(40, Math.floor((460 / rows) * 10) / 10);
  const most = Math.max(...tiles.map((t) => Math.abs(t))), d = liftDots(most);
  const panel = LP.card + 46 + Math.ceil(most / d.per) * d.gap + 14;
  return { H, rows, panel, h: Math.ceil(Math.max(panel, rows * H)) + 2 };
}
/** Which lift button a touch at (x, y) is on: 0 up, 1 down, 2 Start / Again (when it is shown), −1 none. */
export function liftButtonAt(x: number, y: number, start: boolean): number {
  const near = (cy: number) => Math.hypot(x - LP.cx, y - cy) <= LP.r + 8;
  if (near(LP.up)) return 0;
  if (near(LP.down)) return 1;
  if (start && x >= LP.x && y >= LP.card && y <= LP.card + 70) return 2;
  return -1;
}
export interface LiftView {
  start: number; tiles: number[]; floors: [number, number];
  /** where the car is (between two floors while it moves) */
  at: number; door: boolean; lit: boolean; started: boolean; finished: boolean;
  /** the move being made, how many of its floors are pressed, the button wanted (1 up, −1 down) */
  k: number; done: number; want: number;
  wrong?: { b: number; odd: boolean }; held?: number; finger?: number;
}
export function liftDraw(v: LiftView): Shape[] {
  const out: Shape[] = [], [lo, hi] = v.floors, L = liftLayout(v.tiles, v.floors), H = L.H;
  const top = (f: number) => px((hi - f) * H), sign = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
  const text = (x: number, y: number, s: string, role: string) => out.push({ t: "text", x: px(x), y: px(y), s, role });
  const here = Math.round(v.at), small = H < 24;
  // the floors: sky above, the shop at 0, the car park below
  for (let f = hi; f >= lo; f--) {
    out.push({ t: "rect", x: 0, y: top(f), w: 196, h: H, role: f > 0 ? (f % 2 ? "lift-sky2" : "lift-sky") : f === 0 ? "lift-shop" : f % 2 ? "lift-park2" : "lift-park" });
    if (H >= 10) out.push({ t: "line", x1: 0, y1: px(top(f) + H - 0.5), x2: 196, y2: px(top(f) + H - 0.5), role: "lift-floorline" });
    if (H >= 18) {
      const deco = f > 0 ? "▫▫" : f === 0 ? (H >= 26 ? "🛍️ shop" : "🛍️") : "🚗";
      text(f === 0 && H >= 26 ? 156 : 172, top(f) + H / 2 + 6, deco, f === 0 ? "lift-deco-shop" : small ? "lift-deco-s" : "lift-deco");
    }
  }
  if (lo <= 0 && hi >= 0) out.push({ t: "line", x1: 0, y1: px(top(0) + H), x2: 196, y2: px(top(0) + H), role: "lift-groundline" });
  if (v.lit) out.push({ t: "rect", x: 1.5, y: px(top(here) + 1.5), w: 193, h: px(H - 3), role: "lift-lit" });
  // the numbers: every floor when there is room, else at a steady step; the floor Chintu is on always, in gold
  const shown = tallyLabelled(v.floors, [here], H, 0, v.start).filter((f) => f === here || Math.abs(f - here) * H >= 16);
  if (!shown.includes(here)) shown.push(here);
  if (lo <= 0 && hi >= 0 && Math.abs(here) * H >= 16 && !shown.includes(0)) shown.push(0);
  for (const f of shown) {
    const y = top(f) + H / 2;
    if (f === here) { const bh = Math.max(14, Math.min(30, H - 4)); out.push({ t: "rect", x: 3, y: px(y - bh / 2), w: 34, h: px(bh), role: "lift-here" }); }
    text(20, y + (small ? 4.5 : 6), sign(f), f === here ? (small ? "lift-no-here-s" : "lift-no-here") : f === 0 ? "lift-no-0" : small ? "lift-no-s" : "lift-no");
  }
  // the shaft and the car, with Chintu and its two doors (open: drawn back to the sides)
  out.push({ t: "line", x1: 44, y1: 0, x2: 44, y2: px(L.rows * H), role: "lift-shaft" }, { t: "line", x1: 106, y1: 0, x2: 106, y2: px(L.rows * H), role: "lift-shaft" });
  const ch = Math.max(16, Math.min(38, H - 2)), cy = (hi - v.at) * H + H / 2;
  out.push({ t: "rect", x: 47, y: px(cy - ch / 2), w: 56, h: px(ch), role: "lift-car" });
  text(75, cy + (ch >= 30 ? 8.5 : 5), "🐱", ch >= 30 ? "lift-cat" : "lift-cat-s");
  const dw = v.door ? 26.5 : 3;
  out.push({ t: "rect", x: 48.5, y: px(cy - ch / 2 + 1.5), w: dw, h: px(ch - 3), role: "lift-door" }, { t: "rect", x: px(101.5 - dw), y: px(cy - ch / 2 + 1.5), w: dw, h: px(ch - 3), role: "lift-door" });
  // the panel: the display, the two buttons (the wanted one glows, the other is dimmed; a wrong one shakes)
  out.push({ t: "rect", x: LP.x, y: 0, w: LP.w, h: L.panel, role: "lift-panel" }, { t: "rect", x: LP.x + 8, y: 8, w: LP.w - 16, h: 60, role: "lift-disp" });
  text(LP.cx, 55, sign(here), "lift-disp-text");
  ([[0, LP.up, 1, "▲", "Up"], [1, LP.down, -1, "▼", "Down"]] as const).forEach(([i, cy, d, glyph, label]) => {
    const name = d > 0 ? "lift-up" : "lift-down";
    const mod = v.wrong?.b === i ? (v.wrong.odd ? "-no" : "-no2") : v.held === i ? "-press" : v.want && v.want !== d ? "-dim" : "";
    if (v.want === d) out.push({ t: "circle", cx: LP.cx, cy, r: LP.r + 7, role: "lift-glow" });
    out.push({ t: "circle", cx: LP.cx, cy, r: LP.r, role: `${name}${mod}`, tap: { i, label } });
    text(LP.cx, cy + 14, glyph, `lift-arrow${mod}`);
  });
  // the task card: the move ("▼ 5") and a dot per floor, filled as they are pressed; or the Start / Again button
  if (v.started && !v.finished) {
    const t = v.tiles[v.k], n = Math.abs(t), d = liftDots(n), rows = Math.ceil(n / d.per);
    out.push({ t: "rect", x: LP.x + 8, y: LP.card, w: LP.w - 16, h: px(46 + rows * d.gap), role: "lift-task" });
    text(LP.cx, LP.card + 34, `${t < 0 ? "▼" : "▲"} ${n}`, t < 0 ? "lift-task-d" : "lift-task-u");
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / d.per), inRow = Math.min(d.per, n - row * d.per), col = i % d.per;
      out.push({ t: "circle", cx: px(LP.cx + (col - (inRow - 1) / 2) * d.gap), cy: px(LP.card + 52 + row * d.gap), r: d.r, role: i < v.done ? "lift-tick-on" : "lift-tick" });
    }
  } else {
    out.push({ t: "rect", x: LP.x + 8, y: LP.card + 8, w: LP.w - 16, h: 56, role: "lift-go", tap: { i: 2, label: v.finished ? "Again" : "Start" } });
    text(LP.cx, LP.card + 44, v.finished ? "↻ Again" : "▶ Start", "lift-go-text");
  }
  // the finger of the demonstration comes up from below onto the button wanted
  if (v.finger !== undefined) text(LP.cx + 10, (v.want > 0 ? LP.up : LP.down) + 40 + (2 - v.finger) * 90, "👆", "lift-finger");
  return out;
}
