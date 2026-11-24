/**
 * figure-marks@1: the pictures of questions and lessons (family-kit Visual), as data. A picture is worked out here from the
 * family's numbers (so it is always exactly the mathematics of its question), checked before it is drawn, and described in
 * words that say the same thing. It is drawn by the scene engine's one player (frontend/src/year/Scene.tsx, FigureMarks):
 * nothing here knows about the page. A new kind of question picture is a new case here, never a new drawing component.
 */
import { check as checkScene, describe as describeScene, type Scene } from "./scene";

/** One drawn mark: an SVG element's name, its attributes, and what is inside it (words, or more marks). */
export type Mark = { tag: "rect" | "circle" | "line" | "path" | "text" | "polyline" | "polygon" | "g" | "ellipse" | "tspan"; at: Record<string, unknown>; kids: (Mark | string | number)[] };
const mk = (tag: Mark["tag"], at: Record<string, unknown>, ...kids: (Mark | Mark[] | string | number | null | undefined | false)[]): Mark => ({ tag, at, kids: kids.flat().filter((k): k is Mark | string | number => k !== null && k !== undefined && k !== false) });
/** What the player is given: marks in a box; or a picture that must not be drawn (and why); or only its words; or null when the
 * figure is not a drawing at all (a table, written working, money piles: laid out by the page). */
export type FigureDrawing = { as: "marks"; w: number; h: number; marks: Mark[] } | { as: "na"; message: string; invalid: "true" | "unchecked" | "missing" } | { as: "words"; fallback: "strips" } | null;
export type V = { type: string; [k: string]: unknown };
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
export const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : typeof v === "number" ? String(v) : d);
export const minus = (n: number) => (n < 0 ? `−${-n}` : String(n));


/** visuals@2: optional fields on existing types (strips, shape outline, triangle exterior angle, crossing lines, labelled grid).
 * Each is checked before it is drawn: data that is impossible or would mislead (unequal sides on a rectangle, an exterior
 * angle that is not the sum of its opposite angles, a crossing-line label that is not θ or 180° − θ, labels that do not fit
 * the grid) is NOT drawn; the figure then says the picture is not available instead of showing a wrong one. */
const degOf = (s: unknown): number | null => { const m = /^\s*(\d+(?:\.\d+)?)\s*°?\s*$/.exec(str(s)); return m ? Number(m[1]) : null; };
const intIn = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
const strList = (v: unknown, n: number) => Array.isArray(v) && v.length === n && v.every((x) => typeof x === "string" || typeof x === "number");
type Strip = { parts: number; shaded: number; label: string };
/** Competencies whose lessons use legacy strips (top, bottom, shaded) to show an EQUIVALENT fraction: there the second
 * strip's shading is derived (shaded × bottom / top). Elsewhere the same data is ambiguous (a comparison such as 1/2 vs 1/4
 * has exactly the same shape), so the second strip is not drawn. */
export const EQUIVALENCE_COMPETENCIES: ReadonlySet<string> = new Set(["MATH.number.equivalent-fractions"]);
/** legacy strips data: no bottomShaded and no labels (the second fraction is not stated) */
export const legacyStrips = (v: V) => v.type === "strips" && v.bottomShaded === undefined && v.labels === undefined;
/** the strips widget as a lesson of this competency may draw it: legacy strips are marked as equivalence pictures only in an
 * equivalence lesson; everything else is passed through unchanged */
/** the equivalence mark is a Symbol, so content data (JSON) can never set it: only stripsFor, from the lesson's competency */
const EQUIV: unique symbol = Symbol("visuals@2 equivalence lesson");
export const stripsFor = <W extends V>(w: W, competency?: string): W => (legacyStrips(w) && competency && EQUIVALENCE_COMPETENCIES.has(competency) ? ({ ...w, [EQUIV]: true } as W) : w);
/** legacy strips: "equivalent" (the second shading is an exact equivalent and the lesson is about equivalence), "missing"
 * (the first strip is valid but the second strip's shading is not given), or "invalid" */
export function legacyStripKind(v: V): "equivalent" | "missing" | "invalid" {
  const top = v.top ?? 2, bottom = v.bottom ?? 4, shaded = v.shaded ?? 1;
  if (!intIn(top, 1, 60) || !intIn(bottom, 1, 60) || !intIn(shaded, 0, top as number)) return "invalid";
  // a fully shaded first strip (one whole) and its fully shaded k-part copy (k/k) are the same amount in any lesson; any other
  // derived shading is an equivalence only where the lesson is about equivalence (the same data is also sent for comparisons)
  if (shaded === top && (shaded as number) > 0) return "equivalent";
  return (v as { [EQUIV]?: boolean })[EQUIV] === true && ((shaded as number) * (bottom as number)) % (top as number) === 0 ? "equivalent" : "missing";
}
/** the two strips of a strips visual: explicit bottomShaded, or (legacy, equivalence lessons only) the exact equivalent shading */
function stripsOf(v: V): Strip[] | null {
  const top = v.top ?? 2, bottom = v.bottom ?? 4, shaded = v.shaded ?? 1;
  if (!intIn(top, 1, 60) || !intIn(bottom, 1, 60) || !intIn(shaded, 0, top as number)) return null;
  const t = top as number, b = bottom as number, sh = shaded as number;
  let bs: number;
  if (v.bottomShaded !== undefined) { if (!intIn(v.bottomShaded, 0, b)) return null; bs = v.bottomShaded as number; }
  else { if (legacyStripKind(v) !== "equivalent") return null; bs = (sh * b) / t; }
  const labels = v.labels === undefined ? null : strList(v.labels, 2) ? arr<string | number>(v.labels).map(String) : undefined;
  if (labels === undefined) return null;
  // a label written as a fraction must be the fraction that row shows (n shaded of d parts), never another one
  const frac = (t: string) => /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(t);
  const rowsDrawn: [number, number][] = [[sh, t], [bs, b]];
  if (labels && labels.some((l, i) => { const m = frac(l); return m ? Number(m[1]) !== rowsDrawn[i][0] || Number(m[2]) !== rowsDrawn[i][1] : false; })) return null;
  return [{ parts: t, shaded: sh, label: labels?.[0] ?? "" }, { parts: b, shaded: bs, label: labels?.[1] ?? "" }];
}
/** a rectangle/square outline's four side labels must agree with the shape (opposite sides equal; a square's all equal) */
function shapeOk(v: V): boolean {
  const L = arr<string | number>(v.lengths).map((x) => String(x).trim());
  if (!L.length) return true;
  // only labelled sides are compared (a figure may label some sides and leave others blank)
  const eq = (a: string, b: string) => !a || !b || a === b;
  if (str(v.kind) === "rectangle" && L.length === 4) return eq(L[0], L[2]) && eq(L[1], L[3]);
  if (str(v.kind) === "square" && L.length === 4) return L.every((x) => eq(x, L[0]) && L.every((y) => eq(x, y)));
  return true;
}
type Ext = { at: 1; label: string; names: string[] | null; extendedTo: string };
/** vertex names (optional): three distinct short names (A, B, C, A′ …), and optionally the name of the point on the extension */
function namesOk(v: V): { names: string[] | null; extendedTo: string } | null {
  const ok = (t: unknown) => typeof t === "string" && /^[A-Z]′?$/.test(t); // one prime character only (A′), so no look-alike names
  if (v.vertices === undefined && v.extendedTo === undefined) return { names: null, extendedTo: "" };
  if (!Array.isArray(v.vertices) || v.vertices.length !== 3 || !v.vertices.every(ok) || new Set(v.vertices).size !== 3) return null;
  if (v.extendedTo !== undefined && (!ok(v.extendedTo) || (v.vertices as string[]).includes(v.extendedTo as string))) return null;
  return { names: v.vertices as string[], extendedTo: (v.extendedTo as string | undefined) ?? "" };
}
/** a triangle with one side extended: the exterior angle is at vertex 1 (side 0→1 extended); numeric labels must fit together */
function exteriorOk(v: V): Ext | null {
  const e = v.exterior as { at?: unknown; label?: unknown } | undefined;
  if (!e || typeof e !== "object" || e.at !== 1 || (typeof e.label !== "string" && typeof e.label !== "number")) return null;
  const A = arr<unknown>(v.angles);
  if (A.length && A.length !== 3) return null;
  const a0 = [0, 1, 2].map((i) => (A[i] === undefined || str(A[i]).trim() === "" || str(A[i]).trim() === "?" ? undefined : degOf(A[i])));
  if (a0.some((x) => x === null)) return null; // a label that is not a number of degrees, "?" or empty
  const a = a0 as (number | undefined)[];
  const ext = str(e.label).trim() === "?" ? undefined : degOf(e.label);
  if (ext === null) return null;
  const known = a.filter((x): x is number => x !== undefined);
  if (known.some((x) => x <= 0 || x >= 180) || (ext !== undefined && (ext <= 0 || ext >= 180))) return null;
  if (known.reduce((p, x) => p + x, 0) >= 180 + (known.length === 3 ? 1e-9 : 0) || (known.length === 3 && Math.abs(known[0] + known[1] + known[2] - 180) > 1e-9)) return null;
  if (ext !== undefined && a[0] !== undefined && a[2] !== undefined && Math.abs(ext - a[0] - a[2]) > 1e-9) return null; // exterior = sum of the two opposite angles
  if (ext !== undefined && a[1] !== undefined && Math.abs(ext + a[1] - 180) > 1e-9) return null; // exterior + adjacent interior = 180
  if (ext !== undefined && (a[0] !== undefined && a[0] >= ext || a[2] !== undefined && a[2] >= ext)) return null;
  const N = namesOk(v);
  if (!N) return null;
  return { at: 1, label: str(e.label), ...N };
}
/** two crossing lines: θ strictly between 0° and 180°; four labels; a numeric label must be θ (angles 0, 2) or 180° − θ (1, 3) */
function crossOk(v: V): string[] | null {
  const d = num(v.deg, NaN);
  // narrower than 15° (or wider than 165°) the labels cannot sit between the lines: not drawn rather than drawn unreadably
  if (!(d >= 15 && d <= 165)) return null;
  const L = v.labels === undefined ? ["", "", "", ""] : strList(v.labels, 4) ? arr<string | number>(v.labels).map(String) : null;
  if (!L) return null;
  for (let i = 0; i < 4; i++) { const t = L[i].trim(); if (t === "" || t === "?") continue; const x = degOf(t); if (x === null || Math.abs(x - (i % 2 === 0 ? d : 180 - d)) > 1e-9) return null; }
  return L;
}
/** a labelled grid (area model): one label per cell, one per row and column; with the same row and column labels (a square
 * of side a + b) the model is symmetric, so cell (i, j) and cell (j, i) must carry the same label */
const UNCHECKED = "unchecked" as const;
function gridLabelsOk(v: V): { cells: string[]; rows: string[]; cols: string[] } | null | typeof UNCHECKED {
  const R = num(v.rows, 3), C = num(v.cols, 4);
  if (!intIn(R, 1, 12) || !intIn(C, 1, 12)) return null;
  const cells = v.labels === undefined ? [] : strList(v.labels, R * C) ? arr<string | number>(v.labels).map(String) : null;
  const rows = v.rowLabels === undefined ? [] : strList(v.rowLabels, R) ? arr<string | number>(v.rowLabels).map(String) : null;
  const cols = v.colLabels === undefined ? [] : strList(v.colLabels, C) ? arr<string | number>(v.colLabels).map(String) : null;
  if (!cells || !rows || !cols) return null;
  // a square area model (same row and column labels) is symmetric; compared as single terms (a compound label is left to the check below)
  if (cells.length && rows.length && cols.length && R === C && rows.every((x, i) => x === cols[i])) for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) { const [a, b] = [mono(cells[i * C + j]), mono(cells[j * C + i])]; if (a && b && !sameMono(a, b)) return null; }
  // with side labels AND cell labels the picture claims cell = row label × column label. That is checked exactly for single
  // terms (25x², −24x, ab, 4). A compound label (x + 3, 2a − b) is not checked here, so the picture is not drawn (UNCHECKED)
  // rather than drawn as if it had been checked. A blank cell claims nothing; a blank side label with a labelled cell cannot be checked.
  if (cells.some((c) => c.trim()) && (rows.length || cols.length)) {
    if (!rows.length || !cols.length) return UNCHECKED;
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
      const cell = cells[i * C + j].trim();
      if (!cell) continue;
      const [r, c, x] = [mono(rows[i]), mono(cols[j]), mono(cell)];
      if (!r || !c || !x) return UNCHECKED;
      if (!sameMono(mul(r, c), x)) return null;
    }
  }
  return { cells, rows, cols };
}
const NA = "Picture not available: its numbers do not fit together.";
const NA_UNCHECKED = "Picture not available: its labels cannot be checked.";
const NA_MISSING = "Picture not available: the second strip's shading is not given.";
/** a monomial label: optional sign and whole-number coefficient, then letters each with an optional ² or ³ (25x², −24x, ab, 4) */
type Mono = { c: number; v: Record<string, number> };
function mono(t: string): Mono | null {
  const m = /^\s*([−-])?\s*(\d+)?((?:[a-z][²³]?)*)\s*$/.exec(t);
  if (!m || (!m[2] && !m[3])) return null;
  const v: Record<string, number> = {};
  for (const [, x, p] of m[3].matchAll(/([a-z])([²³]?)/g)) v[x] = (v[x] ?? 0) + (p === "²" ? 2 : p === "³" ? 3 : 1);
  const c = m[2] ? Number(m[2]) : 1;
  if (c > 1e6) return null; // beyond exact integer arithmetic for products: not checked
  return { c: (m[1] ? -1 : 1) * c, v };
}
const mul = (a: Mono, b: Mono): Mono => { const v = { ...a.v }; for (const [k, p] of Object.entries(b.v)) v[k] = (v[k] ?? 0) + p; return { c: a.c * b.c, v }; };
const sameMono = (a: Mono, b: Mono) => (a.c === 0 && b.c === 0) || a.c === b.c && Object.keys({ ...a.v, ...b.v }).every((k) => (a.v[k] ?? 0) === (b.v[k] ?? 0));

/** A factor tree is derived from the number itself (the smallest prime is split off each time), so it cannot disagree with it. */
function factorTree(v: V): { splits: [number, number, number][]; primes: number[] } | null {
  const n = num(v.n, NaN);
  if (!Number.isInteger(n) || n < 4 || n > 1000) return null;
  const splits: [number, number, number][] = []; const primes: number[] = [];
  let m = n;
  for (let p = 2; p * p <= m; ) { if (m % p === 0) { splits.push([m, p, m / p]); primes.push(p); m /= p; } else p++; }
  primes.push(m);
  return splits.length && splits.length <= 9 ? { splits, primes } : null;
}
/** A line graph is drawn only from data it can show exactly: every value on a scale line, one label per value. */
function lineGraph(v: V): { labels: string[]; values: number[]; scale: number; top: number } | null {
  const labels = arr<string>(v.labels), values = arr<number>(v.values), scale = num(v.scale, NaN);
  if (!intIn(scale, 1, 1000) || labels.length < 2 || labels.length > 12 || labels.length !== values.length) return null;
  if (!values.every((x) => Number.isInteger(x) && x >= 0 && x % scale === 0)) return null;
  const top = (Math.max(...values) / scale + 1) * scale;
  return top / scale <= 20 ? { labels, values, scale, top } : null;
}
/** angles@1: a row of 2–4 labelled angles, each 1°–360°, labels distinct. */
function anglesOf(v: V): { label: string; deg: number }[] | null {
  const A = arr<{ label: string; deg: number }>(v.items);
  if (A.length < 2 || A.length > 4 || !A.every((x) => x && typeof x.label === "string" && x.label.trim() && Number.isFinite(x.deg) && x.deg > 0 && x.deg <= 360)) return null;
  return new Set(A.map((x) => x.label)).size === A.length ? A : null;
}
export function describe(v: V): string {
  switch (v.type) {
    case "scene":
      // scene@1: an interactive scene describes itself (what can be moved, never the answer)
      return checkScene(v).length === 0 ? describeScene(v as unknown as Scene) : "This picture is not available.";
    case "dots":
      return `${num(v.count)} objects`;
    case "tenframe":
      return `${num(v.frames, 1)} ten frame${num(v.frames, 1) > 1 ? "s" : ""} with ${num(v.filled)} counters`;
    case "blocks":
      return `Base-ten blocks: ${num(v.hundreds)} hundreds, ${num(v.tens)} tens and ${num(v.ones)} ones`;
    case "numberline":
      return `A number line from ${minus(num(v.from))} to ${minus(num(v.to))}${arr<number>(v.marks).length ? `, marked at ${arr<number>(v.marks).map(minus).join(", ")}` : ""}${arr<[number, number]>(v.jumps).length ? `, with jumps ${arr<[number, number]>(v.jumps).map(([a, b]) => `${minus(a)} to ${minus(b)}`).join(", ")}` : ""}${arr<Iv>(v.intervals).length ? `, with ${arr<Iv>(v.intervals).map(ivText).join(" and ")} shaded` : ""}`;
    case "clock":
      return "A clock face (read the time from the hands)";
    case "money": {
      const [a, pa] = arr<number>(v.have), [b, pb] = arr<number>(v.other);
      return `Coins: ${a} rupees and ${pa} paise${v.take ? `, to pay ${b} rupees and ${pb} paise from` : `, and ${b} rupees and ${pb} paise more`}`;
    }
    case "coins":
      return `Money: ${arr<number>(v.items).map((x) => `₹${x}`).join(", ")}`;
    case "bars":
      return `A bar chart${v.title ? ` of ${str(v.title)}` : ""}: ${arr<string>(v.labels).map((l, i) => `${l} ${arr<number>(v.values)[i]}`).join(", ")}`;
    case "linegraph": {
      const G = lineGraph(v);
      if (!G) return NA;
      return `A line graph${v.title ? ` of ${str(v.title)}` : ""}, with a line on the scale every ${G.scale}: ${G.labels.map((l, i) => `${l} ${G.values[i]}`).join(", ")}`;
    }
    case "pictograph":
      return `A pictograph where one picture stands for ${num(v.key, 1)}: ${arr<string>(v.labels).map((l, i) => `${l} ${arr<number>(v.counts)[i] / num(v.key, 1)} pictures`).join(", ")}`;
    case "table":
      if (v.as === "written") return `${arr<string>(v.head)[0] ?? "Working"}, written out: ${arr<(string | number)[]>(v.rows).map((r) => String(r[0]).trim()).filter(Boolean).join("; ")}`;
      if (v.as === "tiles") return `A picture of ${arr<(string | number)[]>(v.rows).length > 1 ? "rows of cards" : "a row of cards"}: ${arr<(string | number)[]>(v.rows).map((r) => r.join(", ")).join("; ")}`;
      return `A table: ${arr<string>(v.head).join(", ")}; ${arr<(string | number)[]>(v.rows).map((r) => r.join(", ")).join("; ")}`;
    case "shape":
      if (!shapeOk(v)) return NA;
      return `A ${str(v.name) || str(v.kind) || `${num(v.sides)}-sided shape`}${arr(v.lengths).length ? ` with sides ${arr(v.lengths).join(", ")}` : ""}${v.outline ? ", drawn as an outline" : ""}`;
    case "strips": {
      if (legacyStrips(v)) {
        const k = legacyStripKind(v);
        if (k === "invalid") return NA;
        const one = `${num(v.top, 2)} equal part${num(v.top, 2) === 1 ? "" : "s"} with ${num(v.shaded, 1)} shaded`;
        if (k === "missing") return `A strip in ${one}. A second strip, in ${num(v.bottom, 4)} equal parts, is not drawn because how much of it is shaded is not given`;
        const bs = (num(v.shaded, 1) * num(v.bottom, 4)) / num(v.top, 2);
        return `Two strips of the same length, each one whole: the first in ${one}, the second in ${num(v.bottom, 4)} equal parts with ${bs} shaded, the same amount`;
      }
      if (v.bottomShaded === undefined) return NA_MISSING;
      const S = stripsOf(v);
      if (!S) return NA;
      const one = (x: Strip) => `${x.parts} equal part${x.parts === 1 ? "" : "s"} with ${x.shaded} shaded${x.label ? ` (${x.label})` : ""}`;
      return `Two strips of the same length, each one whole: the first in ${one(S[0])}, the second in ${one(S[1])}`;
    }
    case "angle": {
      if (v.cross !== true) return "An angle (estimate or measure it)";
      const L = crossOk(v);
      if (!L) return NA;
      const name = ["the first angle", "the angle next to it", "the angle opposite the first", "the other angle next to the first"];
      const said = L.map((t, i) => (t.trim() === "?" ? `${name[i]} is marked ?` : t.trim() ? `${name[i]} is ${t.trim()}` : "")).filter(Boolean);
      return `Two straight lines crossing at a point, making four angles${said.length ? `: ${said.join("; ")}` : ""}`;
    }
    case "protractor": {
      const a = arr<number>(v.arms);
      return `A protractor with two arms. One arm crosses ${a[0]} on the inner scale and ${180 - a[0]} on the outer scale; the other crosses ${a[1]} on the inner scale and ${180 - a[1]} on the outer scale.`;
    }
    case "angles": {
      const A = anglesOf(v);
      return A ? `${A.length} angles: ${A.map((x) => `${x.label} ${x.deg}°`).join(", ")}` : NA;
    }
    case "circle":
      return `A circle${v.radius !== undefined ? ` with radius ${str(v.radius)}` : ""}${v.diameter !== undefined ? ` with diameter ${str(v.diameter)}` : ""}${v.sector !== undefined ? (v.estimate ? ", with a shaded angle (estimate it from the picture)" : `, a sector of ${num(v.sector)}°`) : ""}`;
    case "grid": {
      if (v.perRow !== undefined && !intIn(v.perRow, 0, num(v.cols, 4))) return NA;
      const base = `A grid of ${num(v.rows)} rows and ${num(v.cols)} columns${v.perRow !== undefined ? ` with ${num(v.perRow)} square${num(v.perRow) === 1 ? "" : "s"} shaded in each row` : num(v.shaded) ? ` with ${num(v.shaded)} squares shaded` : ""}`;
      if (v.labels === undefined && v.rowLabels === undefined && v.colLabels === undefined) return base;
      const G = gridLabelsOk(v);
      if (G === UNCHECKED) return NA_UNCHECKED;
      if (!G) return NA;
      return `${base}${G.cols.length ? `; the top side is labelled ${G.cols.join(" and ")}` : ""}${G.rows.length ? `; the left side is labelled ${G.rows.join(" and ")}` : ""}${G.cells.some((c) => c.trim()) ? `; the parts, row by row, are ${G.cells.map((c) => c.trim() || "unlabelled").join(", ")}` : ""}`;
    }
    case "triangle": {
      if (v.exterior === undefined) return `A triangle${arr(v.sides).length ? ` with sides ${arr(v.sides).join(", ")}` : ""}${arr(v.angles).length ? ` and angles ${arr(v.angles).join(", ")}` : ""}${v.right ? ", right-angled" : ""}${v.notToScale ? " (not drawn to scale)" : ""}`;
      const E = exteriorOk(v);
      if (!E || v.right) return NA;
      const A = arr<string | number>(v.angles).map((x) => String(x).trim());
      const say = (t: string | undefined) => (t === "?" ? "marked ?" : t ? t : "not labelled");
      if (E.names) {
        const [p, q, r] = E.names;
        return `Triangle with vertices ${p}, ${q} and ${r} (not drawn to scale). Side ${p}${q} is extended beyond ${q}${E.extendedTo ? ` to ${E.extendedTo}` : ""}, making an exterior angle at ${q}. The interior angles opposite it, at ${p} and ${r}, are ${say(A[0])} and ${say(A[2])}; the interior angle at ${q} is ${say(A[1])}; the exterior angle at ${q} is ${say(E.label.trim())}`;
      }
      return `A triangle (not drawn to scale) with one side extended. The two interior angles opposite the exterior angle are ${say(A[0])} and ${say(A[2])}; the interior angle next to the exterior angle is ${say(A[1])}; the exterior angle is ${say(E.label.trim())}`;
    }
    case "plane":
      return `${num(v.quadrant) === 1 ? "The first quadrant of coordinate axes" : "Coordinate axes"} with points ${arr<[number, number, string?]>(v.points).map(([x, y, l]) => `${l ? `${l} ` : ""}(${minus(x)}, ${minus(y)})`).join(", ")}`;
    case "pie":
      // what a sighted learner sees: the size of each sector (its angle), not the hidden data values
      return `A pie chart: ${arr<string>(v.labels).map((l, i) => `${l} a sector of ${Math.round((arr<number>(v.values)[i] / (arr<number>(v.values).reduce((a, b) => a + b, 0) || 1)) * 360)}°`).join(", ")}`;
    case "solid":
      return `A ${str(v.name)}${arr(v.dims).length ? ` (${arr(v.dims).join(", ")})` : ""}`;
    case "balance":
      return `A balance: ${str(v.left)} on the left, ${str(v.right)} on the right`;
    case "factortree": {
      const T = factorTree(v);
      if (!T) return NA;
      return `A factor tree for ${num(v.n)}: ${T.splits.map(([m, p, r]) => `${m} splits into ${p} and ${r}`).join("; ")}. The prime numbers at the ends of the branches are ${T.primes.join(", ")}`;
    }
    case "fold": {
      const F = foldOf(v);
      if (!F) return NA;
      const yes = F.items.filter((x) => x.match).map((x) => x.label), no = F.items.filter((x) => !x.match).map((x) => x.label);
      return `The letters ${F.items.map((x) => x.label).join(", ")}, each folded along a ${F.axis === "v" ? "line going up and down through its middle" : "line going straight across its middle"}. ${yes.length ? `The halves match for ${yes.join(", ")}` : "No letter's halves match"}${no.length ? `; they do not match for ${no.join(", ")}` : ""}.`;
    }
    default:
      return "A picture";
  }
}

/** A shaded interval on a number line: an end of null runs on (an arrow); a closed end is a filled dot, an open end a hollow one. */
type Iv = { lo: number | null; hi: number | null; loClosed?: boolean; hiClosed?: boolean };
const ivText = (i: Iv) =>
  i.lo === null && i.hi === null ? "the whole line"
  : i.lo === null ? `everything ${i.hiClosed ? "up to and including" : "below"} ${minus(i.hi!)}`
  : i.hi === null ? `everything ${i.loClosed ? "from and including" : "above"} ${minus(i.lo)}`
  : `from ${minus(i.lo)} (${i.loClosed ? "included" : "not included"}) to ${minus(i.hi)} (${i.hiClosed ? "included" : "not included"})`;
/** fold@1: letters drawn on a 5 × 5 grid with a dashed fold line; one half folds over onto the other (animated), and
 * each letter is marked by whether its halves land exactly on each other, worked out here from the drawing itself. */
function foldOf(v: V): { axis: "v" | "h"; items: { label: string; rows: string[]; match: boolean }[] } | null {
  const axis = v.axis === "h" ? "h" : v.axis === "v" ? "v" : null;
  const items = arr<{ label: string; rows: string[] }>(v.items);
  if (!axis || items.length < 1 || items.length > 6) return null;
  if (!items.every((x) => x && typeof x.label === "string" && Array.isArray(x.rows) && x.rows.length === 5 && x.rows.every((r) => typeof r === "string" && /^[#.]{5}$/.test(r)))) return null;
  return {
    axis,
    items: items.map((x) => ({
      label: x.label,
      rows: x.rows,
      match: axis === "v" ? x.rows.every((r) => r === [...r].reverse().join("")) : x.rows.every((r, i, R) => r === R[4 - i]),
    })),
  };
}
const INK = "var(--ink, #1f2a37)";
const ACC = "var(--accent, #2f6fde)";
const SOFT = "var(--soft, #dbe6f7)";

export function figureDraw(v: V): FigureDrawing {
  if (v.type === "scene" || v.type === "triangle-angle-lab") return null;
  const box = (w: number, h: number, body: Mark | Mark[]): FigureDrawing => ({ as: "marks", w, h, marks: [body].flat() });
  const unavailable = (): FigureDrawing => ({ as: "na", message: NA, invalid: "true" });
  switch (v.type) {
    case "dots": {
      const n = num(v.count);
      const per = n > 10 ? 10 : n;
      const rows = Math.ceil(n / per);
      return box(per * 30 + 10, rows * 30 + 10, Array.from({ length: n }, (_, i) => mk("circle", { cx: 20 + (i % per) * 30, cy: 20 + Math.floor(i / per) * 30, r: 11, fill: ACC })));
    }
    case "tenframe": {
      const frames = Math.max(1, num(v.frames, 1));
      const filled = num(v.filled);
      const out: Mark[] = [];
      for (let f = 0; f < frames; f++)
        for (let i = 0; i < 10; i++) {
          const x = 6 + (i % 5) * 32;
          const y = 6 + f * 74 + Math.floor(i / 5) * 32;
          out.push(mk("rect", { x: x, y: y, width: 32, height: 32, fill: "none", stroke: INK }));
          if (f * 10 + i < filled) out.push(mk("circle", { cx: x + 16, cy: y + 16, r: 11, fill: ACC }));
        }
      return box(172, frames * 74, out);
    }
    case "blocks": {
      const h = num(v.hundreds);
      const t = num(v.tens);
      const o = num(v.ones);
      const out: Mark[] = [];
      let x = 6;
      for (let i = 0; i < h; i++, x += 56) out.push(mk("rect", { x: x, y: 6, width: 50, height: 50, fill: SOFT, stroke: INK }));
      for (let i = 0; i < t; i++, x += 12) out.push(mk("rect", { x: x, y: 6, width: 9, height: 50, fill: ACC, stroke: INK, strokeWidth: 0.5 }));
      x += 6;
      for (let i = 0; i < o; i++) out.push(mk("rect", { x: x + (i % 5) * 11, y: 6 + Math.floor(i / 5) * 11, width: 9, height: 9, fill: ACC, stroke: INK, strokeWidth: 0.5 }));
      return box(Math.max(80, x + 60), 64, out);
    }
    case "numberline": {
      const from = num(v.from);
      const to = num(v.to, from + 10);
      const span = Math.max(1, to - from);
      const step = num(v.step, span <= 20 ? 1 : Math.ceil(span / 10));
      const X = (n: number) => 20 + ((n - from) / span) * 360;
      const out: Mark[] = [mk("line", { x1: 10, y1: 60, x2: 390, y2: 60, stroke: INK, strokeWidth: 2 })];
      for (let n = from; n <= to + 1e-9; n += step) {
        out.push(mk("line", { x1: X(n), y1: 54, x2: X(n), y2: 66, stroke: INK }));
        out.push(mk("text", { x: X(n), y: 84, fontSize: 12, textAnchor: "middle", fill: INK }, num(v.unknown, NaN) === n ? "?" : minus(Math.round(n * 100) / 100)));
      }
      for (const m of arr<number>(v.marks)) out.push(mk("circle", { cx: X(m), cy: 60, r: 6, fill: ACC }));
      arr<[number, number]>(v.jumps).forEach(([a, b], i) => out.push(mk("path", { d: `M ${X(a)} 54 Q ${(X(a) + X(b)) / 2} ${14} ${X(b)} 54`, fill: "none", stroke: ACC, strokeWidth: 2, markerEnd: "" })));
      arr<Iv>(v.intervals).forEach((iv, i) => {
        const x0 = iv.lo === null ? 10 : X(iv.lo);
        const x1 = iv.hi === null ? 390 : X(iv.hi);
        out.push(mk("line", { x1: x0, y1: 60, x2: x1, y2: 60, stroke: ACC, strokeWidth: 6, strokeLinecap: "butt" }));
        if (iv.lo === null) out.push(mk("path", { d: "M 4 60 L 16 52 L 16 68 Z", fill: ACC }));
        if (iv.hi === null) out.push(mk("path", { d: "M 396 60 L 384 52 L 384 68 Z", fill: ACC }));
        if (iv.lo !== null) out.push(mk("circle", { cx: x0, cy: 60, r: 6, fill: iv.loClosed ? ACC : "#fff", stroke: ACC, strokeWidth: 2.5 }));
        if (iv.hi !== null) out.push(mk("circle", { cx: x1, cy: 60, r: 6, fill: iv.hiClosed ? ACC : "#fff", stroke: ACC, strokeWidth: 2.5 }));
      });
      return box(400, 96, out);
    }
    case "clock": {
      const h = num(v.h) % 12;
      const m = num(v.m);
      const ang = (deg: number, r: number) => [100 + r * Math.sin((deg * Math.PI) / 180), 100 - r * Math.cos((deg * Math.PI) / 180)];
      const [hx, hy] = ang(h * 30 + m * 0.5, 45);
      const [mx, my] = ang(m * 6, 70);
      return box(200, 200, [
        mk("circle", { cx: 100, cy: 100, r: 90, fill: "#fff", stroke: INK, strokeWidth: 3 }),
        ...Array.from({ length: 12 }, (_, i) => {
          const [x, y] = ang((i + 1) * 30, 74);
          return mk("text", { x: x, y: y + 6, fontSize: 16, textAnchor: "middle", fill: INK }, i + 1);
        }),
        ...Array.from({ length: 60 }, (_, i) => {
          const [x1, y1] = ang(i * 6, 86);
          const [x2, y2] = ang(i * 6, i % 5 ? 82 : 79);
          return mk("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: INK, strokeWidth: i % 5 ? 1 : 2 });
        }),
        mk("line", { x1: 100, y1: 100, x2: hx, y2: hy, stroke: INK, strokeWidth: 6, strokeLinecap: "round" }),
        mk("line", { x1: 100, y1: 100, x2: mx, y2: my, stroke: ACC, strokeWidth: 4, strokeLinecap: "round" }),
        mk("circle", { cx: 100, cy: 100, r: 5, fill: INK }),
      ]);
    }
    case "money":
      return null;
    case "coins": {
      const items = arr<number>(v.items);
      let x = 6;
      const out: Mark[] = [];
      items.forEach((c, i) => {
        if (c >= 10 && c !== 10 && c !== 20) {
          // a note
          out.push(mk("rect", { x: x, y: 14, width: 86, height: 44, rx: 4, fill: SOFT, stroke: INK }), mk("text", { x: x + 43, y: 42, fontSize: 16, textAnchor: "middle", fill: INK }, `₹${c}`));
          x += 94;
        } else {
          out.push(mk("circle", { cx: x + 26, cy: 36, r: 24, fill: "#f3e3a6", stroke: INK }), mk("text", { x: x + 26, y: 42, fontSize: 16, textAnchor: "middle", fill: INK }, `₹${c}`));
          x += 58;
        }
      });
      return box(Math.max(60, x), 72, out);
    }
    case "linegraph": {
      const G = lineGraph(v);
      if (!G) return unavailable();
      const H = 160, W = Math.max(220, G.labels.length * 42), x0 = 44; // chart-text@1: no wider than its points need
      const X = (i: number) => x0 + 20 + (i * (W - 40)) / (G.labels.length - 1);
      const Y = (t: number) => 10 + H - (t / G.top) * H;
      const out: Mark[] = [mk("line", { x1: x0, y1: 10, x2: x0, y2: 10 + H, stroke: INK }), mk("line", { x1: x0, y1: 10 + H, x2: x0 + W, y2: 10 + H, stroke: INK })];
      const every = Math.max(1, Math.ceil(16 / ((G.scale / G.top) * H)));
      for (let t = 0, k = 0; t <= G.top; t += G.scale, k++) { out.push(mk("line", { x1: x0 - 4, y1: Y(t), x2: x0 + W, y2: Y(t), stroke: SOFT })); if (k % every === 0) out.push(mk("text", { x: x0 - 7, y: Y(t) + 5, fontSize: 14, textAnchor: "end", fill: INK }, t)); }
      G.labels.forEach((l, i) => out.push(mk("line", { x1: X(i), y1: 10, x2: X(i), y2: 10 + H, stroke: SOFT }), mk("text", { x: X(i), y: 30 + H, fontSize: G.labels.length > 6 ? 12 : 14, textAnchor: "middle", fill: INK }, l)));
      out.push(mk("polyline", { points: G.values.map((t, i) => `${X(i)},${Y(t)}`).join(" "), fill: "none", stroke: ACC, strokeWidth: 2 }));
      G.values.forEach((t, i) => out.push(mk("circle", { cx: X(i), cy: Y(t), r: 4, fill: ACC })));
      return box(x0 + W + 10, H + 40, out);
    }
    case "bars":
    case "pictograph": {
      const labels = arr<string>(v.labels);
      const values = v.type === "bars" ? arr<number>(v.values) : arr<number>(v.counts);
      if (v.type === "pictograph") {
        const key = num(v.key, 1);
        const out: Mark[] = [];
        labels.forEach((l, i) => {
          out.push(mk("text", { x: 4, y: 30 + i * 34, fontSize: 13, fill: INK }, l));
          const n = values[i] / key;
          for (let k = 0; k < Math.floor(n); k++) out.push(mk("circle", { cx: 110 + k * 26, cy: 25 + i * 34, r: 10, fill: ACC }));
          if (n % 1) out.push(mk("path", { d: `M ${110 + Math.floor(n) * 26} ${15 + i * 34} A 10 10 0 0 0 ${110 + Math.floor(n) * 26} ${35 + i * 34} Z`, fill: ACC }));
        });
        out.push(mk("text", { x: 4, y: 30 + labels.length * 34, fontSize: 12, fill: INK }, `Key: ● = ${key}`));
        return box(420, 44 + labels.length * 34, out);
      }
      const max = Math.max(1, ...values);
      const scale = num(v.scale, max <= 10 ? 1 : max <= 50 ? 5 : max <= 100 ? 10 : Math.ceil(max / 10));
      const top = Math.ceil(max / scale) * scale;
      const H = 160;
      const bw = Math.min(50, 300 / Math.max(1, labels.length));
      // chart-text@1: the picture is only as wide as its bars, so on a phone it is drawn larger; every line of the scale is drawn,
      // and its number written where there is room (a child reads the scale from the lines, as the question says)
      const W = Math.max(260, 50 + labels.length * (bw + 12) + 6);
      const out: Mark[] = [mk("line", { x1: 40, y1: 10, x2: 40, y2: 10 + H, stroke: INK }), mk("line", { x1: 40, y1: 10 + H, x2: W, y2: 10 + H, stroke: INK })];
      const every = Math.max(1, Math.ceil(16 / ((scale / top) * H)));
      for (let t = 0, k = 0; t <= top; t += scale, k++) {
        const y = 10 + H - (t / top) * H;
        out.push(mk("line", { x1: 36, y1: y, x2: W, y2: y, stroke: SOFT }));
        if (k % every === 0) out.push(mk("text", { x: 33, y: y + 5, fontSize: 14, textAnchor: "end", fill: INK }, t));
      }
      labels.forEach((l, i) => {
        const h = (values[i] / top) * H;
        const x = 50 + i * (bw + 12);
        out.push(mk("rect", { x: x, y: 10 + H - h, width: bw, height: h, fill: ACC }), mk("text", { x: x + bw / 2, y: 30 + H, fontSize: labels.length > 5 ? 12 : 14, textAnchor: "middle", fill: INK }, l));
      });
      return box(W + 4, H + 40, out);
    }
    case "table": {
      const head = arr<string>(v.head);
      const rows = arr<(string | number)[]>(v.rows);
      return null;
    }
    case "shape": {
      if (!shapeOk(v)) return unavailable();
      // named quadrilaterals and an L-shape are drawn as themselves (not as a regular polygon); labels go side by side
      const KIND: Record<string, number[][]> = {
        rectangle: [[30, 50], [190, 50], [190, 150], [30, 150]],
        square: [[60, 40], [170, 40], [170, 150], [60, 150]],
        parallelogram: [[60, 50], [200, 50], [160, 150], [20, 150]],
        // equal sides, unequal diagonals (160 and 112): a rhombus that is not a square
        rhombus: [[110, 20], [166, 100], [110, 180], [54, 100]],
        trapezium: [[70, 50], [150, 50], [200, 150], [20, 150]],
        kite: [[110, 20], [170, 80], [110, 180], [50, 80]],
        lshape: [[30, 30], [100, 30], [100, 110], [190, 110], [190, 170], [30, 170]],
      };
      const kp = KIND[str(v.kind)];
      if (kp) {
        const lengths = arr<string | number>(v.lengths);
        const parts = [
          // outline: the edge is what is measured (perimeter), so the inside is left empty and the edge is drawn strongly
          mk("polygon", { points: kp.map((q) => q.join(",")).join(" "), fill: v.outline ? "none" : SOFT, stroke: v.outline ? ACC : INK, strokeWidth: v.outline ? 4 : 2 }),
          ...(v.diagonals ? [mk("line", { x1: kp[0][0], y1: kp[0][1], x2: kp[2][0], y2: kp[2][1], stroke: ACC, strokeDasharray: "5 4" }), mk("line", { x1: kp[1][0], y1: kp[1][1], x2: kp[3][0], y2: kp[3][1], stroke: ACC, strokeDasharray: "5 4" })] : []),
          ...(v.height !== undefined && kp.length === 4 ? [mk("line", { x1: kp[0][0], y1: kp[0][1], x2: kp[0][0], y2: kp[3][1], stroke: ACC, strokeDasharray: "4 3" }), mk("text", { x: kp[0][0] + 6, y: (kp[0][1] + kp[3][1]) / 2, fontSize: 12, fill: ACC }, str(v.height))] : []),
          ...lengths.map((l, i) => {
            const [a, b] = [kp[i % kp.length], kp[(i + 1) % kp.length]];
            const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            // outline (perimeter): every side label sits clearly outside its side, so none is drawn across the edge being measured
            if (v.outline && kp.length === 4 && (a[0] === b[0] || a[1] === b[1])) {
              const vertical = a[0] === b[0], right = vertical && mx > 110, below = !vertical && my > 100;
              return mk("text", { x: vertical ? mx + (right ? 8 : -8) : mx, y: vertical ? my + 5 : my + (below ? 20 : -9), fontSize: 13, textAnchor: vertical ? (right ? "start" : "end") : "middle", fill: INK }, String(l));
            }
            return mk("text", { x: mx + (mx - 110) * 0.15, y: my + (my - 100) * 0.15 + 4, fontSize: 13, textAnchor: "middle", fill: INK }, String(l));
          }),
        ];
        // an outline's side labels sit outside the shape: widen the picture and shift it so they are not cut off
        return v.outline ? box(290, 200, mk("g", { transform: "translate(35,0)" }, parts)) : box(220, 200, parts);
      }
      const n = Math.max(3, num(v.sides, 4));
      const lengths = arr<string | number>(v.lengths);
      // a flat bottom side (a four-sided shape is drawn square, not as a diamond); each label sits outside the middle of its side,
      // along the outward normal, anchored away from the edge so no label is drawn across a side
      const pts = Array.from({ length: n }, (_, i) => { const t = (2 * Math.PI * i) / n + Math.PI / 2 + Math.PI / n; return [130 + 72 * Math.cos(t), 105 + 72 * Math.sin(t)]; });
      return box(260, 210, [
        mk("polygon", { points: pts.map((p) => p.join(",")).join(" "), fill: v.outline ? "none" : SOFT, stroke: v.outline ? ACC : INK, strokeWidth: v.outline ? 4 : 2 }),
        ...lengths.map((l, i) => {
          const [a, b] = [pts[i], pts[(i + 1) % n]];
          const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = Math.hypot(mx - 130, my - 105) || 1, [nx, ny] = [(mx - 130) / d, (my - 105) / d];
          const anchor = nx > 0.35 ? "start" : nx < -0.35 ? "end" : "middle";
          return mk("text", { x: mx + nx * 8, y: my + ny * 8 + (ny > 0.35 ? 12 : ny < -0.35 ? -3 : 4), fontSize: 13, textAnchor: anchor, fill: INK }, String(l));
        }),
      ]);
    }
    case "angle": {
      if (v.cross === true) {
        const L = crossOk(v);
        if (!L) return unavailable();
        const d = num(v.deg);
        const [cx, cy, len] = [130, 120, 115];
        const pt = (deg: number, r: number) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];
        const [ax, ay] = pt(d, len), [bx, by] = pt(d + 180, len);
        // angle i runs anticlockwise from start[i] for width[i]: 0 = the given angle θ, 1 next to it, 2 opposite, 3 the other neighbour
        const start = [0, d, 180, 180 + d], width = [d, 180 - d, d, 180 - d];
        const out: Mark[] = [
          mk("line", { x1: cx - len, y1: cy, x2: cx + len, y2: cy, stroke: INK, strokeWidth: 3 }),
          mk("line", { x1: bx, y1: by, x2: ax, y2: ay, stroke: INK, strokeWidth: 3 }),
          mk("circle", { cx: cx, cy: cy, r: 3, fill: INK }),
        ];
        L.forEach((t, i) => {
          if (!t.trim()) return;
          const [s0, w] = [start[i], width[i]];
          const r = 22 + (i % 2) * 6;
          const [x0, y0] = pt(s0, r), [x1, y1] = pt(s0 + w, r);
          out.push(mk("path", { d: `M ${x0} ${y0} A ${r} ${r} 0 0 0 ${x1} ${y1}`, fill: "none", stroke: ACC, strokeWidth: 2 }));
          // the label sits on the angle's bisector, far enough out to clear both lines in a narrow angle
          const rl = Math.min(95, Math.max(48, 16 / Math.sin(((w / 2) * Math.PI) / 180)));
          const [lx, ly] = pt(s0 + w / 2, rl);
          out.push(mk("text", { x: lx, y: ly + 5, fontSize: 14, textAnchor: "middle", fill: t.trim() === "?" ? ACC : INK, fontWeight: t.trim() === "?" ? 700 : 400 }, t.trim()));
        });
        return box(260, 240, out);
      }
      const d = num(v.deg);
      const r = (deg: number, len: number) => [40 + len * Math.cos((-deg * Math.PI) / 180), 150 + len * Math.sin((-deg * Math.PI) / 180)];
      const [x, y] = r(d, 140);
      const [ax, ay] = r(d, 30);
      return box(260, 170, [
        mk("line", { x1: 40, y1: 150, x2: 220, y2: 150, stroke: INK, strokeWidth: 3 }),
        mk("line", { x1: 40, y1: 150, x2: x, y2: y, stroke: INK, strokeWidth: 3 }),
        mk("path", { d: `M 70 150 A 30 30 0 ${d > 180 ? 1 : 0} 0 ${ax} ${ay}`, fill: "none", stroke: ACC, strokeWidth: 2 }),
      ]);
    }
    case "protractor": {
      // kid-say@1: a protractor with both scales (inner from the right, outer from the left), ticks every 5°, numbers every 10°
      const a = arr<number>(v.arms), cx = 170, cy = 168, R = 140;
      const at = (deg: number, r: number) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)] as const;
      const els: Mark[] = [mk("path", { d: `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} Z`, fill: "#f4f7fd", stroke: INK, strokeWidth: 1.5 })];
      // the arms first, so the numbers stay readable on top of them
      for (const d of a) { const [x, y] = at(d, R + 14); els.push(mk("line", { x1: cx, y1: cy, x2: x, y2: y, stroke: "#d4380d", strokeWidth: 3, strokeLinecap: "round" })); }
      for (let d = 0; d <= 180; d += 5) {
        const [x1, y1] = at(d, R), [x2, y2] = at(d, d % 10 ? R - 7 : R - 12);
        els.push(mk("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: INK, strokeWidth: d % 10 ? 0.8 : 1.2 }));
        if (d % 10 === 0) {
          const lift = d === 0 || d === 180 ? 7 : 0;
          const [ix, iy] = at(d, R - 34), [ox, oy] = at(d, R - 21);
          const halo = { stroke: "#f4f7fd", strokeWidth: 3, paintOrder: "stroke" } as const;
          els.push(mk("text", { x: ix, y: iy + 3 - lift, textAnchor: "middle", fontSize: 8, fill: ACC, ...halo }, d));
          els.push(mk("text", { x: ox, y: oy + 3 - lift, textAnchor: "middle", fontSize: 8, fill: INK, ...halo }, 180 - d));
        }
      }
      els.push(mk("circle", { cx: cx, cy: cy, r: 3.5, fill: INK }));
      return box(340, 180, els);
    }
    case "angles": {
      const A = anglesOf(v);
      if (!A) return unavailable();
      // each angle in its own cell: arms from the vertex, an arc, its letter and size underneath (2 per row)
      const out: Mark[] = [];
      A.forEach((x, i) => {
        const [ox, oy] = [(i % 2) * 170 + 20, Math.floor(i / 2) * 150 + 100];
        // an acute or right angle opens from the left of its cell; a wider one from the middle, so its arm stays in the cell
        const wide = x.deg > 90;
        const [vx, len] = wide ? [ox + 65, 65] : [ox + 15, 85];
        const at = (deg: number, r: number) => [vx + r * Math.cos((deg * Math.PI) / 180), oy - r * Math.sin((deg * Math.PI) / 180)];
        const [bx, by] = at(x.deg, len), [ax, ay] = at(x.deg, 22);
        out.push(
          mk("line", { x1: vx, y1: oy, x2: vx + (wide ? 65 : 115), y2: oy, stroke: INK, strokeWidth: 3, strokeLinecap: "round" }),
          mk("line", { x1: vx, y1: oy, x2: bx, y2: by, stroke: INK, strokeWidth: 3, strokeLinecap: "round" }),
          x.deg === 90
            ? mk("path", { d: `M ${vx + 16} ${oy} L ${vx + 16} ${oy - 16} L ${vx} ${oy - 16}`, fill: "none", stroke: ACC, strokeWidth: 2 })
            : mk("path", { d: `M ${vx + 22} ${oy} A 22 22 0 ${x.deg > 180 ? 1 : 0} 0 ${ax} ${ay}`, fill: "none", stroke: ACC, strokeWidth: 2 }),
          mk("circle", { cx: vx, cy: oy, r: 3, fill: INK }),
          mk("text", { x: ox + 65, y: oy + 34, fontSize: 17, textAnchor: "middle", fill: INK, fontWeight: 700 }, `${x.label}  ${x.deg}°`),
        );
      });
      return box(340, Math.ceil(A.length / 2) * 150 + 10, out);
    }
    case "circle": {
      const sector = num(v.sector, 0);
      const end = (deg: number) => [110 + 80 * Math.cos((-deg * Math.PI) / 180), 100 + 80 * Math.sin((-deg * Math.PI) / 180)];
      const [ex, ey] = end(sector);
      return box(220, 200, [
        mk("circle", { cx: 110, cy: 100, r: 80, fill: SOFT, stroke: INK, strokeWidth: 2 }),
        mk("circle", { cx: 110, cy: 100, r: 3, fill: INK }),
        ...(v.diameter !== undefined ? [mk("line", { x1: 30, y1: 100, x2: 190, y2: 100, stroke: ACC, strokeWidth: 2 }), mk("text", { x: 110, y: 92, fontSize: 13, textAnchor: "middle", fill: INK }, str(v.diameter))] : []),
        ...(v.radius !== undefined && v.diameter === undefined ? [mk("line", { x1: 110, y1: 100, x2: 190, y2: 100, stroke: ACC, strokeWidth: 2 }), mk("text", { x: 150, y: 92, fontSize: 13, textAnchor: "middle", fill: INK }, str(v.radius))] : []),
        ...(sector ? [mk("path", { d: `M 110 100 L 190 100 A 80 80 0 ${sector > 180 ? 1 : 0} 0 ${ex} ${ey} Z`, fill: ACC, opacity: 0.35 })] : []),
      ]);
    }
    case "grid": {
      const rows = num(v.rows, 3);
      const cols = num(v.cols, 4);
      const shaded = num(v.shaded);
      // perRow: the same number of squares shaded at the start of every row (k rows of a out of b: k lots of a/b)
      const perRow = v.perRow === undefined ? null : num(v.perRow, NaN);
      if (perRow !== null && !intIn(perRow, 0, cols)) return unavailable();
      if (v.labels !== undefined || v.rowLabels !== undefined || v.colLabels !== undefined) {
        // labelled grid (an area model): larger cells so the labels are readable; side labels outside the left and top edges
        const G = gridLabelsOk(v);
        if (G === UNCHECKED) return { as: "na", message: NA_UNCHECKED, invalid: "unchecked" };
        if (!G) return unavailable();
        const s = Math.min(90, 300 / Math.max(rows, cols));
        const [ox, oy] = [G.rows.length ? Math.max(44, 14 + 8.5 * Math.max(...G.rows.map((t) => t.length))) : 4, G.cols.length ? 26 : 4];
        const fit = (t: string) => Math.max(10, Math.min(18, (s * 1.7) / Math.max(1, t.length)));
        const out: Mark[] = [];
        for (let i = 0; i < rows * cols; i++) {
          const [x, y] = [ox + (i % cols) * s, oy + Math.floor(i / cols) * s];
          out.push(mk("rect", { x: x, y: y, width: s, height: s, fill: i < shaded ? ACC : "#fff", stroke: INK, strokeWidth: 1.5 }));
          if (G.cells[i]) out.push(mk("text", { x: x + s / 2, y: y + s / 2 + fit(G.cells[i]) / 3, fontSize: fit(G.cells[i]), textAnchor: "middle", fill: INK }, G.cells[i]));
        }
        G.cols.forEach((t, j) => out.push(mk("text", { x: ox + j * s + s / 2, y: oy - 8, fontSize: 14, textAnchor: "middle", fill: ACC }, t)));
        G.rows.forEach((t, i) => out.push(mk("text", { x: ox - 6, y: oy + i * s + s / 2 + 5, fontSize: 14, textAnchor: "end", fill: ACC }, t)));
        return box(ox + cols * s + 4, oy + rows * s + 4, out);
      }
      const s = Math.min(30, 360 / Math.max(rows, cols));
      return box(cols * s + 4, rows * s + 4, Array.from({ length: rows * cols }, (_, i) => mk("rect", { x: 2 + (i % cols) * s, y: 2 + Math.floor(i / cols) * s, width: s, height: s, fill: (perRow === null ? i < shaded : i % cols < perRow) ? ACC : "#fff", stroke: INK })));
    }
    case "triangle": {
      if (v.exterior !== undefined) {
        const E = exteriorOk(v);
        if (!E || v.right) return unavailable();
        // fixed shape (not to scale): side 0→1 is extended beyond vertex 1; the exterior angle lies between the extension and side 1→2
        const P = [[20, 160], [240, 160], [100, 30]];
        const A = arr<string | number>(v.angles).map((x) => String(x).trim());
        const r = 26;
        const toApex = Math.atan2(P[1][1] - P[2][1], P[2][0] - P[1][0]); // angle of side 1→2, measured anticlockwise from the extension
        const [ex, ey] = [P[1][0] + r * Math.cos(toApex), P[1][1] - r * Math.sin(toApex)];
        const [lx, ly] = [P[1][0] + 50 * Math.cos(toApex / 2), P[1][1] - 50 * Math.sin(toApex / 2)];
        const out: Mark[] = [
          mk("polygon", { points: P.map((p) => p.join(",")).join(" "), fill: SOFT, stroke: INK, strokeWidth: 2 }),
          mk("line", { x1: P[1][0], y1: P[1][1], x2: 322, y2: P[1][1], stroke: INK, strokeWidth: 2, strokeDasharray: "7 4" }),
          mk("path", { d: `M ${P[1][0] + r} ${P[1][1]} A ${r} ${r} 0 0 0 ${ex} ${ey}`, fill: "none", stroke: ACC, strokeWidth: 2.5 }),
          mk("text", { x: lx, y: ly + 5, fontSize: 14, textAnchor: "middle", fill: ACC, fontWeight: 700 }, E.label.trim()),
          // the apex label sits lower than in the plain triangle, so it clears both sides of the apex
          ...A.map((a, i) => (a ? mk("text", { x: P[i][0] + (i === 1 ? -30 : i === 0 ? 26 : 0), y: P[i][1] + (i === 2 ? 42 : -8), fontSize: 13, textAnchor: "middle", fill: a === "?" ? ACC : INK, fontWeight: a === "?" ? 700 : 400 }, a) : null)).filter((x): x is Mark => !!x),
          mk("text", { x: 326, y: 186, fontSize: 11, textAnchor: "end", fill: INK, fontStyle: "italic" }, `Not to scale`),
          // vertex names outside each corner (and at the end of the extension), matching the description
          ...(E.names ? [
            mk("text", { x: P[0][0] - 8, y: P[0][1] + 16, fontSize: 15, fontWeight: 700, textAnchor: "middle", fill: INK }, E.names[0]),
            mk("text", { x: P[1][0], y: P[1][1] + 20, fontSize: 15, fontWeight: 700, textAnchor: "middle", fill: INK }, E.names[1]),
            mk("text", { x: P[2][0], y: P[2][1] - 8, fontSize: 15, fontWeight: 700, textAnchor: "middle", fill: INK }, E.names[2]),
            ...(E.extendedTo ? [mk("text", { x: 316, y: P[1][1] - 8, fontSize: 15, fontWeight: 700, textAnchor: "middle", fill: INK }, E.extendedTo)] : []),
          ] : []),
        ];
        return box(330, 192, out);
      }
      const sides = arr<string>(v.sides);
      const angles = arr<string>(v.angles);
      const P = v.right ? [[30, 160], [230, 160], [30, 30]] : [[20, 160], [240, 160], [100, 30]];
      const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      return box(260, 190, [
        mk("polygon", { points: P.map((p) => p.join(",")).join(" "), fill: SOFT, stroke: INK, strokeWidth: 2 }),
        ...(v.right ? [mk("path", { d: "M 30 145 L 45 145 L 45 160", fill: "none", stroke: INK })] : []),
        // a height (altitude) from the top vertex to the base (side 0)
        ...(v.height !== undefined && !v.right ? [mk("line", { x1: P[2][0], y1: P[2][1], x2: P[2][0], y2: 160, stroke: ACC, strokeDasharray: "4 3" }), mk("text", { x: P[2][0] + 6, y: 100, fontSize: 12, fill: ACC }, str(v.height))] : []),
        ...sides.map((s, i) => {
          const [x, y] = mid(P[i], P[(i + 1) % 3]);
          return mk("text", { x: x + (i === 0 ? 0 : i === 1 ? 14 : -14), y: y + (i === 0 ? 20 : 0), fontSize: 13, textAnchor: "middle", fill: INK }, s);
        }),
        ...angles.map((a, i) => mk("text", { x: P[i][0] + (i === 1 ? -28 : i === 0 ? 22 : 0), y: P[i][1] + (i === 2 ? 26 : -8), fontSize: 12, textAnchor: "middle", fill: ACC }, a)),
        // notToScale (optional): the caption the description promises; legacy triangles do not set it and are unchanged
        ...(v.notToScale ? [mk("text", { x: 254, y: 186, fontSize: 11, textAnchor: "end", fill: INK, fontStyle: "italic" }, `Not to scale`)] : []),
      ]);
    }
    case "plane": {
      const R = Math.max(5, num(v.range, 6));
      // quadrant: 1 draws only x, y ≥ 0 (the first quadrant, as in the junior grades); otherwise all four, centred
      const q1 = num(v.quadrant) === 1;
      const X = (x: number) => (q1 ? 20 + (x / R) * 190 : 110 + (x / R) * 100);
      const Y = (y: number) => (q1 ? 200 - (y / R) * 190 : 110 - (y / R) * 100);
      const [o0, o1] = [X(0), Y(0)];
      const out: Mark[] = [];
      for (let k = q1 ? 0 : -R; k <= R; k++) out.push(mk("line", { x1: X(k), y1: q1 ? Y(R) : 10, x2: X(k), y2: q1 ? o1 : 210, stroke: SOFT }), mk("line", { x1: q1 ? o0 : 10, y1: Y(k), x2: q1 ? X(R) : 210, y2: Y(k), stroke: SOFT }));
      if (q1) for (let k = 1; k <= R; k++) out.push(mk("text", { x: X(k), y: o1 + 14, fontSize: 10, textAnchor: "middle", fill: INK }, k), mk("text", { x: o0 - 6, y: Y(k) + 4, fontSize: 10, textAnchor: "end", fill: INK }, k));
      out.push(mk("line", { x1: q1 ? o0 : 10, y1: o1, x2: q1 ? X(R) + 6 : 210, y2: o1, stroke: INK }), mk("line", { x1: o0, y1: q1 ? Y(R) - 6 : 10, x2: o0, y2: q1 ? o1 : 210, stroke: INK }), mk("text", { x: q1 ? X(R) + 4 : 204, y: o1 + (q1 ? -6 : 14), fontSize: 12, fill: INK }, `x`), mk("text", { x: o0 + 6, y: q1 ? Y(R) - 4 : 20, fontSize: 12, fill: INK }, `y`));
      arr<[[number, number], [number, number]]>(v.segments).forEach(([a, b], i) => out.push(mk("line", { x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]), stroke: ACC, strokeWidth: 2 })));
      arr<[number, number, string?]>(v.points).forEach(([x, y, l], i) => out.push(mk("circle", { cx: X(x), cy: Y(y), r: 4, fill: ACC }), mk("text", { x: X(x) + 6, y: Y(y) - 6, fontSize: 12, fill: INK }, l ?? "")));
      return box(220, 220, out);
    }
    case "fold": {
      const F = foldOf(v);
      if (!F) return unavailable();
      const c = 14, gap = 22, W = 5 * c, H = 5 * c, top = 12, n = F.items.length;
      const w = n * W + (n - 1) * gap + 20, h = top + H + 40;
      return box(w, h, F.items.flatMap((it, k) => {
        const x0 = 10 + k * (W + gap), cx = x0 + W / 2, cy = top + H / 2;
        const cells = (pick: (i: number, j: number) => boolean, fill: string, key: string) =>
          it.rows.flatMap((r, i) => [...r].map((ch, j) => (ch === "#" && pick(i, j) ? mk("rect", { x: x0 + j * c, y: top + i * c, width: c - 1, height: c - 1, fill: fill }) : null)).filter(Boolean)) as Mark[];
        // the half that folds: left columns (up-and-down line) or top rows (line across); the middle column/row stays
        const moving = (i: number, j: number) => (F.axis === "v" ? j < 2 : i < 2);
        return [
          ...cells(() => true, SOFT, `b${k}`),
          ...cells((i, j) => !moving(i, j), INK, `s${k}`),
          mk("g", { className: `fold-${F.axis}`, style: { transformOrigin: `${cx}px ${cy}px` } }, cells(moving, ACC, `m${k}`)),
          F.axis === "v"
            ? mk("line", { x1: cx, y1: top - 6, x2: cx, y2: top + H + 6, stroke: INK, strokeWidth: 1.5, strokeDasharray: "4 3" })
            : mk("line", { x1: x0 - 6, y1: cy, x2: x0 + W + 6, y2: cy, stroke: INK, strokeWidth: 1.5, strokeDasharray: "4 3" }),
          mk("text", { className: "fold-mark", x: cx, y: top + H + 30, fontSize: 20, textAnchor: "middle", fill: it.match ? "#1e8e3e" : "#c5221f" }, it.match ? "✓" : "✗"),
        ];
      }));
    }
    case "factortree": {
      const T = factorTree(v);
      if (!T) return unavailable();
      // the trunk runs down to the right; each split hangs its prime (circled) to the left
      const [dx, dy] = [44, 46];
      const out: Mark[] = [];
      T.splits.forEach(([m, p, r], i) => {
        const [x, y] = [70 + i * dx, 24 + i * dy];
        out.push(mk("text", { x: x, y: y, fontSize: 16, textAnchor: "middle", fill: INK }, m));
        out.push(mk("line", { x1: x - 6, y1: y + 6, x2: x - dx + 12, y2: y + dy - 20, stroke: INK }));
        out.push(mk("line", { x1: x + 6, y1: y + 6, x2: x + dx - 8, y2: y + dy - 18, stroke: INK }));
        out.push(mk("circle", { cx: x - dx + 6, cy: y + dy - 6, r: 14, fill: SOFT, stroke: ACC }));
        out.push(mk("text", { x: x - dx + 6, y: y + dy - 1, fontSize: 15, textAnchor: "middle", fill: INK }, p));
        if (i === T.splits.length - 1) {
          out.push(mk("circle", { cx: x + dx, cy: y + dy - 6, r: 14, fill: SOFT, stroke: ACC }));
          out.push(mk("text", { x: x + dx, y: y + dy - 1, fontSize: 15, textAnchor: "middle", fill: INK }, r));
        }
      });
      return box(70 + (T.splits.length + 1) * dx, 40 + T.splits.length * dy, out);
    }
    case "pie": {
      const labels = arr<string>(v.labels);
      const values = arr<number>(v.values);
      const total = values.reduce((a, b) => a + b, 0) || 1;
      let a0 = -Math.PI / 2;
      const colours = [ACC, "#e9a23b", "#3aa17e", "#c4536b", "#7b61c9", "#5aa9c9"];
      const out: Mark[] = [];
      values.forEach((val, i) => {
        const a1 = a0 + (val / total) * 2 * Math.PI;
        // the pie sits in the middle of its box (it was 10 to the left of it)
        const [x0, y0, x1, y1] = [110 + 80 * Math.cos(a0), 100 + 80 * Math.sin(a0), 110 + 80 * Math.cos(a1), 100 + 80 * Math.sin(a1)];
        out.push(mk("path", { d: `M 110 100 L ${x0} ${y0} A 80 80 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1} Z`, fill: colours[i % colours.length], stroke: "#fff" }));
        // the key goes under the pie, in letters a child can read on a phone
        out.push(mk("text", { x: 10, y: 208 + i * 24, fontSize: 16, fill: INK }, mk("tspan", { fill: colours[i % colours.length] }, "■"), " ", labels[i]));
        a0 = a1;
      });
      return box(220, 200 + values.length * 24, out);
    }
    case "solid": {
      const name = str(v.name, "cube");
      const dims = arr<string>(v.dims);
      const body: Record<string, Mark[]> = {
        cube: [mk("rect", { x: 30, y: 60, width: 100, height: 100, fill: SOFT, stroke: INK }), mk("path", { d: "M 30 60 L 70 25 L 170 25 L 130 60 Z M 130 60 L 170 25 L 170 125 L 130 160", fill: "#fff", stroke: INK })],
        cuboid: [mk("rect", { x: 20, y: 70, width: 140, height: 80, fill: SOFT, stroke: INK }), mk("path", { d: "M 20 70 L 60 35 L 200 35 L 160 70 Z M 160 70 L 200 35 L 200 115 L 160 150", fill: "#fff", stroke: INK })],
        cylinder: [mk("ellipse", { cx: 100, cy: 40, rx: 60, ry: 16, fill: "#fff", stroke: INK }), mk("path", { d: "M 40 40 L 40 150 A 60 16 0 0 0 160 150 L 160 40", fill: SOFT, stroke: INK })],
        cone: [mk("path", { d: "M 100 20 L 40 150 A 60 16 0 0 0 160 150 Z", fill: SOFT, stroke: INK })],
        sphere: [mk("circle", { cx: 100, cy: 95, r: 70, fill: SOFT, stroke: INK }), mk("ellipse", { cx: 100, cy: 95, rx: 70, ry: 18, fill: "none", stroke: INK, strokeDasharray: "4 3" })],
        pyramid: [mk("path", { d: "M 100 20 L 30 150 L 150 160 Z M 100 20 L 150 160 L 190 130 Z", fill: SOFT, stroke: INK })],
      };
      // a box's three sizes go on its own edges (length under the front, height beside it, width along the slant), not stacked in a corner
      if (dims.length === 3 && (name === "cuboid" || name === "cube")) {
        const g = name === "cube" ? { bx: 80, by: 176, hx: 26, hy: 110, wx: 162, wy: 36 } : { bx: 90, by: 166, hx: 16, hy: 114, wx: 192, wy: 46 };
        return box(310, 185, [
          mk("g", { transform: "translate(48,0)" }, body[name]),
          mk("text", { x: g.bx + 48, y: g.by, fontSize: 13, textAnchor: "middle", fill: INK }, dims[0]),
          mk("text", { x: g.hx + 48 - 6, y: g.hy, fontSize: 13, textAnchor: "end", fill: INK }, dims[2]),
          mk("text", { x: g.wx + 48 + 10, y: g.wy + 4, fontSize: 13, fill: INK }, dims[1]),
        ]);
      }
      return box(220, 180, [...(body[name] ?? body.cube), ...dims.map((d, i) => mk("text", { x: 8, y: 175 - i * 16, fontSize: 12, fill: INK }, d))]);
    }
    case "balance":
      return box(320, 140, [
        mk("polygon", { points: "150,130 170,130 160,60", fill: INK }),
        mk("line", { x1: 40, y1: 60, x2: 280, y2: 60, stroke: INK, strokeWidth: 4 }),
        mk("rect", { x: 30, y: 30, width: 100, height: 28, rx: 4, fill: SOFT, stroke: INK }),
        mk("rect", { x: 190, y: 30, width: 100, height: 28, rx: 4, fill: SOFT, stroke: INK }),
        mk("text", { x: 80, y: 49, fontSize: 14, textAnchor: "middle", fill: INK }, str(v.left)),
        mk("text", { x: 240, y: 49, fontSize: 14, textAnchor: "middle", fill: INK }, str(v.right)),
      ]);
    case "strips": {
      // two strips of the SAME length (each one whole), each shaded for its own fraction; legacy strips (no bottomShaded,
      // no labels) keep the existing behaviour (Learn.tsx draws them; here they fall through to the default)
      // legacy strips whose second shading is not stated (or not an equivalence lesson): text, never a guessed picture
      if (legacyStrips(v) && legacyStripKind(v) === "missing") return { as: "words", fallback: "strips" };
      if (!legacyStrips(v) && v.bottomShaded === undefined) return { as: "na", message: NA_MISSING, invalid: "missing" };
      const S = stripsOf(v);
      if (!S) return unavailable();
      const lw = S.some((x) => x.label) ? 52 : 0;
      const W = 340, H = 34, gap = 12;
      const out: Mark[] = [];
      S.forEach((st, r) => {
        const y = 4 + r * (H + gap), pw = W / st.parts;
        if (st.label) out.push(mk("text", { x: lw - 8, y: y + H / 2 + 5, fontSize: 14, textAnchor: "end", fill: INK }, st.label));
        for (let i = 0; i < st.parts; i++) out.push(mk("rect", { x: lw + i * pw, y: y, width: pw, height: H, fill: i < st.shaded ? ACC : "#fff", stroke: INK, strokeWidth: 1.2 }));
        out.push(mk("rect", { x: lw, y: y, width: W, height: H, fill: "none", stroke: INK, strokeWidth: 2 }));
      });
      return box(lw + W + 4, 8 + 2 * H + gap, out);
    }
    default:
      return null;
  }
}
