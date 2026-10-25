/**
 * Batch b06 (families@2): puzzles and strategy games, systematic counting, pie charts, scaled bar charts, letters for
 * number rules, figurate numbers, protractor reading, angle pairs, turns, fractal stages, solids and painted cubes,
 * quadrilateral and triangle classification, rotational symmetry, equal area / equal perimeter. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Visual } from "../family-kit";
import { evaluate, parse } from "../answer-types";
import { fmt } from "../family-kit";

const PZ = "MATH.reasoning.puzzle-strategy";
const EN = "MATH.reasoning.systematic-enumeration";
const PIE = "MATH.statistics.pie-charts";
const SB = "MATH.statistics.scaled-bars";
const EXI = "MATH.algebra.expressions-intro";
const FIG = "MATH.algebra.figurate-numbers";
const AM = "MATH.geometry.angle-measure";
const AP = "MATH.geometry.angle-pairs";
const AT = "MATH.geometry.angles-as-turns";
const FR = "MATH.geometry.fractal-iteration";
const NETS = "MATH.geometry.nets";
const QC = "MATH.geometry.quadrilateral-classification";
const RS = "MATH.geometry.rotational-symmetry";
const TT = "MATH.geometry.triangle-types";
const APR = "MATH.measurement.area-perimeter-relation";
const ADD = "MATH.number.addition";
const SUBR = "MATH.number.subtraction-regroup";
const FRM = "MATH.number.fraction-models";
const BAR = "MATH.statistics.bar-charts";
const PAT = "MATH.algebra.pattern-rules";
const ANG = "MATH.geometry.angles-intro";
const RAREA = "MATH.measurement.rectangle-area";
const RPER = "MATH.measurement.rectangle-perimeter";

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Lakshmi", "Sam"];
const name = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: number | string): Step => ({ id, op, competency, inputs, value });
/** A small deterministic random generator (the same numbers for the same parameters, on every build). */
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const pick = (r: () => number, n: number) => Math.floor(r() * n);
const shuffle = <T,>(r: () => number, xs: T[]) => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = pick(r, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
const intOrNull = (v: number) => (Number.isInteger(v) && v >= 0 ? v : null);
const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
const LETTERS = "ABCDE";

// ---------------------------------------------------------------- missing digits (puzzle-strategy)

const digits3 = (x: number) => [Math.floor(x / 100), Math.floor(x / 10) % 10, x % 10];
/** A three-digit sum or difference with at least one regrouping (a carry, or a ten exchanged for ones). */
function missSum(s: number, op: number) {
  const r = rng(1009 + s * 7919 + op * 104729);
  for (let tries = 0; ; tries++) {
    let a: number, b: number;
    if (op === 0) {
      a = 120 + pick(r, 600);
      b = 105 + pick(r, Math.max(1, 990 - a - 105));
    } else {
      a = 320 + pick(r, 660);
      b = 105 + pick(r, Math.max(1, a - 210));
    }
    const res = op === 0 ? a + b : a - b;
    const [A, B] = [digits3(a), digits3(b)];
    const carry = op === 0 ? A[2] + B[2] >= 10 || A[1] + B[1] >= 10 : A[2] < B[2] || A[1] < B[1];
    if ((res >= 100 && res <= 999 && carry) || tries > 60) return { a, b, res };
  }
}
/** The regrouping that reaches column pos (0 hundreds, 1 tens, 2 ones): a carry into it (addition), or 1 taken from it
 * and exchanged for 10 in the column on its right (subtraction). */
function incoming(a: number, b: number, op: number, pos: number) {
  if (pos === 2) return 0;
  const lowA = pos === 1 ? a % 10 : a % 100;
  const lowB = pos === 1 ? b % 10 : b % 100;
  return op === 0 ? (lowA + lowB >= (pos === 1 ? 10 : 100) ? 1 : 0) : lowA < lowB ? 1 : 0;
}
const hide = (x: number, pos: number) => digits3(x).map((d, i) => (i === pos ? "□" : String(d))).join("");
const missText = ([s, pos, where, op]: number[]) => {
  const { a, b, res } = missSum(s, op);
  const A = where === 0 ? hide(a, pos) : String(a);
  const R = where === 1 ? hide(res, pos) : String(res);
  return `${A} ${op === 0 ? "+" : "−"} ${b} = ${R}`;
};

// ---------------------------------------------------------------- pie charts

/** Pie charts as parts out of 24 (halves, quarters, eighths; halves, thirds, sixths). */
const PIES = [[12, 6, 6], [12, 6, 3, 3], [9, 9, 6], [18, 3, 3], [12, 9, 3], [15, 6, 3], [12, 8, 4], [16, 4, 4], [8, 8, 4, 4], [6, 6, 6, 3, 3]];
const PIECTX = [
  { who: "children of a school", how: "travel to school", labels: ["Walk", "Bus", "Cycle", "Car", "Auto"], q: (l: string) => `How many children come by ${l.toLowerCase()}?`, q0: (l: string) => `How many children walk?` },
  { who: "people in a survey", how: "chose their favourite fruit", labels: ["Mango", "Banana", "Guava", "Apple", "Grapes"], q: (l: string) => `How many people chose ${l.toLowerCase()}?`, q0: (l: string) => `How many people chose ${l.toLowerCase()}?` },
  { who: "students of a school", how: "chose their favourite game", labels: ["Cricket", "Kabaddi", "Football", "Kho-kho", "Chess"], q: (l: string) => `How many students chose ${l.toLowerCase()}?`, q0: (l: string) => `How many students chose ${l.toLowerCase()}?` },
];
const PIET = [24, 40, 48, 72, 80, 96, 120, 240];
const PIEANG = [12, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120, 180];
const pieQ = (ctx: (typeof PIECTX)[number], cat: number) => (cat === 0 ? ctx.q0(ctx.labels[0]) : ctx.q(ctx.labels[cat]));

// ---------------------------------------------------------------- bar charts

const SCALES = [2, 5, 10, 20, 50, 100];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const BARCTX = [
  { title: "Books borrowed from the library", labels: ["Mon", "Tue", "Wed", "Thu", "Fri"], full: DAYS, unit: "books", verb: "were borrowed", on: (l: string) => `on ${l}` },
  { title: "Mangoes sold at a shop", labels: ["Mon", "Tue", "Wed", "Thu", "Fri"], full: DAYS, unit: "mangoes", verb: "were sold", on: (l: string) => `on ${l}` },
  { title: "Visitors to a park", labels: ["Jan", "Feb", "Mar", "Apr", "May"], full: ["January", "February", "March", "April", "May"], unit: "visitors", verb: "came", on: (l: string) => `in ${l}` },
  { title: "Saplings planted by each class", labels: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"], full: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"], unit: "saplings", verb: "were planted", on: (l: string) => `by ${l}` },
];
function barData([si, kind, s]: number[]) {
  const r = rng(7001 + si * 389 + kind * 97 + s * 13);
  const ks = Array.from({ length: 5 }, () => 1 + pick(r, 10));
  let i = pick(r, 5);
  let j = (i + 1 + pick(r, 4)) % 5;
  if (kind === 1) {
    if (ks[i] === ks[j]) ks[j] = ks[i] > 5 ? ks[i] - 2 - pick(r, 3) : ks[i] + 2 + pick(r, 3);
    if (ks[i] < ks[j]) [i, j] = [j, i];
  }
  return { ks, i, j, sc: SCALES[si], ctx: BARCTX[s % 4] };
}

// ---------------------------------------------------------------- letters for rules

const VARS = ["n", "x", "m", "k", "y"];
const letterOf = (a: number) => VARS[a % 5];
const rule = (kind: number, a: number, b: number, L: string) => (kind === 0 ? `${L} + ${a}` : kind === 1 ? `${L} − ${a}` : kind === 2 ? `${a}${L}` : `${a}${L} + ${b}`);
/** Does the typed expression in L give `want(t)` for t = 1 … 7? (numerical substitution) */
const agrees = (v: unknown, L: string, want: (t: number) => number) => {
  if (typeof v !== "string") return false;
  try {
    const e = parse(v);
    for (let t = 1; t <= 7; t++) {
      const env: Record<string, number> = { [L]: t };
      const got = evaluate(e, env);
      if (!Number.isFinite(got) || Math.abs(got - want(t)) > 1e-9) return false;
    }
    return true;
  } catch {
    return false;
  }
};
const linRule = (a: number, b: number, L = "n") => (b === 0 ? `${a}${L}` : `${a}${L} + ${b}`);

// ---------------------------------------------------------------- figurate numbers

const FIGK = [
  { name: "square numbers", t: (n: number) => n * n, lo: 5, hi: 25, things: "marbles arranged in squares" },
  { name: "triangular numbers", t: (n: number) => (n * (n + 1)) / 2, lo: 5, hi: 25, things: "bowling pins arranged in triangles" },
  { name: "rectangular numbers (each picture has one more column than rows)", t: (n: number) => n * (n + 1), lo: 5, hi: 20, things: "chairs arranged in rectangles, each with one more column than rows" },
  { name: "cube numbers", t: (n: number) => n * n * n, lo: 5, hi: 10, things: "small cubes stacked into bigger cubes" },
  { name: "numbers made by doubling", t: (n: number) => 2 ** (n - 1), lo: 5, hi: 12, things: "cells in a dish that double every hour" },
  { name: "odd numbers", t: (n: number) => 2 * n - 1, lo: 5, hi: 30, things: "beads on a string that grows by 2 each time" },
];
/** The k-th term built a different way: by adding the gaps one at a time (or by repeated multiplication). */
function figBuild(kind: number, n: number) {
  let v = 0;
  if (kind === 0) for (let i = 1; i <= n; i++) v += 2 * i - 1;
  else if (kind === 1) for (let i = 1; i <= n; i++) v += i;
  else if (kind === 2) for (let i = 1; i <= n; i++) v += 2 * i;
  else if (kind === 3) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) v += n;
  else if (kind === 4) {
    v = 1;
    for (let i = 1; i < n; i++) v += v;
  } else {
    v = 1;
    for (let i = 1; i < n; i++) v += 2;
  }
  return v;
}

// ---------------------------------------------------------------- directions and turns

const DIRS = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
const compass = (s: number): Visual => {
  const at = (i: number) => (i === s ? `${["N", "NE", "E", "SE", "S", "SW", "W", "NW"][i]} (start)` : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][i]);
  return { type: "table", head: [at(7), at(0), at(1)], rows: [[at(6), "●", at(2)], [at(5), at(4), at(3)]] };
};

// ---------------------------------------------------------------- solids

const BASES: Record<number, string> = { 3: "triangular", 4: "square", 5: "pentagonal", 6: "hexagonal", 7: "heptagonal", 8: "octagonal", 9: "nonagonal", 10: "decagonal" };
const POLY: Record<number, string> = { 3: "triangle", 4: "square", 5: "pentagon", 6: "hexagon", 7: "heptagon", 8: "octagon", 9: "nonagon", 10: "decagon" };
const FEV = ["faces", "edges", "vertices (corners)"];
/** Build the solid from its corners and edges and count (an independent check of F, E, V). */
function buildSolid(solid: number, n: number): [number, number, number] {
  const verts: string[] = [];
  const edges = new Set<string>();
  const e = (p: string, q: string) => edges.add([p, q].sort().join("-"));
  for (let i = 0; i < n; i++) verts.push(`b${i}`);
  if (solid === 0) {
    for (let i = 0; i < n; i++) verts.push(`t${i}`);
    for (let i = 0; i < n; i++) {
      e(`b${i}`, `b${(i + 1) % n}`);
      e(`t${i}`, `t${(i + 1) % n}`);
      e(`b${i}`, `t${i}`);
    }
    let faces = 2; // the two ends
    for (let i = 0; i < n; i++) faces++; // one rectangle on each base edge
    return [faces, edges.size, verts.length];
  }
  verts.push("apex");
  for (let i = 0; i < n; i++) {
    e(`b${i}`, `b${(i + 1) % n}`);
    e(`b${i}`, "apex");
  }
  let faces = 1;
  for (let i = 0; i < n; i++) faces++;
  return [faces, edges.size, verts.length];
}
const fevOf = (solid: number, n: number): [number, number, number] => (solid === 0 ? [n + 2, 3 * n, 2 * n] : [n + 1, 2 * n, n + 1]);

// ---------------------------------------------------------------- quadrilaterals and triangles in tables

type Quad = { kind: number; sides: number[]; angles: number[] };
function quads(seed: number): Quad[] {
  const r = rng(30011 + seed * 7717);
  const kinds = shuffle(r, [0, 1 + pick(r, 2), 2 + pick(r, 2), pick(r, 5), pick(r, 5)]);
  return kinds.map((kind) => {
    const s = 3 + pick(r, 6);
    const w = 2 + pick(r, 3);
    const l = w + 1 + pick(r, 5);
    const th = [60, 70, 80, 100, 110, 120][pick(r, 6)];
    if (kind === 0) return { kind, sides: [s, s, s, s], angles: [90, 90, 90, 90] };
    if (kind === 1) return { kind, sides: [l, w, l, w], angles: [90, 90, 90, 90] };
    if (kind === 2) return { kind, sides: [s, s, s, s], angles: [th, 180 - th, th, 180 - th] };
    if (kind === 3) return { kind, sides: [l, w, l, w], angles: [th, 180 - th, th, 180 - th] };
    const L = 2 + pick(r, 3);
    const b = L + 2 + pick(r, 4);
    return { kind, sides: [b, L, b - L, L], angles: [60, 60, 120, 120] };
  });
}
const quadRows = (qs: Quad[]) => qs.map((q, i) => [LETTERS[i], q.sides.map((x) => `${x} cm`).join(", "), q.angles.map((x) => `${x}°`).join(", ")]);
const QASK = ["rectangles", "rhombuses", "parallelograms"];

function tris(seed: number): number[][] {
  const r = rng(50021 + seed * 6007);
  const types = shuffle(r, [0, 1, 2, pick(r, 3), pick(r, 3)]);
  return types.map((t) => {
    let a: number[];
    if (t === 0) {
      for (;;) {
        const A = 5 * (10 + pick(r, 7));
        const B = 5 * (10 + pick(r, 7));
        const C = 180 - A - B;
        if (C > 25 && C < 90) {
          a = [A, B, C];
          break;
        }
      }
    } else if (t === 1) {
      const B = 5 * (4 + pick(r, 11));
      a = [90, B, 90 - B];
    } else {
      const A = 5 * (19 + pick(r, 12));
      const B = 5 * (2 + pick(r, Math.max(1, (180 - A) / 5 - 3)));
      a = [A, B, 180 - A - B];
    }
    return shuffle(r, a);
  });
}
const triKind = (a: number[]) => (a.some((x) => x > 90) ? 2 : a.includes(90) ? 1 : 0);
const TRIASK = ["acute-angled (all three angles less than 90°)", "right-angled", "obtuse-angled"];
const TRIASKSHORT = ["acute-angled", "right-angled", "obtuse-angled"];

function triSides(seed: number): number[][] {
  const r = rng(60013 + seed * 4421);
  const types = shuffle(r, [0, 1, 2, pick(r, 3), pick(r, 3)]);
  return types.map((t) => {
    if (t === 0) {
      const s = 3 + pick(r, 8);
      return [s, s, s];
    }
    if (t === 1) {
      const p = 4 + pick(r, 6);
      let q = 2 + pick(r, 2 * p - 3);
      if (q === p) q = p + 1;
      return shuffle(r, [p, p, q]);
    }
    for (;;) {
      const x = [3 + pick(r, 9), 3 + pick(r, 9), 3 + pick(r, 9)].sort((u, v) => u - v);
      if (x[0] !== x[1] && x[1] !== x[2] && x[0] + x[1] > x[2]) return shuffle(r, x);
    }
  });
}
const sideKind = (s: number[]) => {
  let pairs = 0;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (s[i] === s[j]) pairs++;
  return pairs === 3 ? 0 : pairs === 1 ? 1 : 2; // 0 equilateral, 1 exactly two equal, 2 scalene
};
const TSASK = ["scalene (no two sides equal)", "equilateral", "isosceles with exactly two equal sides"];

// ---------------------------------------------------------------- rotational symmetry

const ROT: { n: string; o: number; poly?: number; quad?: boolean; letter?: boolean }[] = [
  { n: "an equilateral triangle", o: 3, poly: 3 },
  { n: "a square", o: 4, poly: 4 },
  { n: "a regular pentagon", o: 5, poly: 5 },
  { n: "a regular hexagon", o: 6, poly: 6 },
  { n: "a regular octagon", o: 8, poly: 8 },
  { n: "a regular decagon", o: 10, poly: 10 },
  { n: "a regular dodecagon (a shape with 12 equal sides)", o: 12, poly: 12 },
  { n: "a rectangle that is not a square", o: 2, quad: true },
  { n: "a rhombus that is not a square", o: 2, quad: true },
  { n: "a parallelogram with no right angles and unequal sides", o: 2, quad: true },
  { n: "the capital letter S", o: 2, letter: true },
  { n: "the capital letter Z", o: 2, letter: true },
  { n: "the capital letter N", o: 2, letter: true },
  { n: "the capital letter H", o: 2 },
  { n: "a table fan with 3 identical blades", o: 3 },
  { n: "a paper windmill with 4 identical blades", o: 4 },
  { n: "a flower design with 5 identical petals", o: 5 },
  { n: "a wheel with 6 identical spokes", o: 6 },
  { n: "a wheel with 8 identical spokes", o: 8 },
];
/** The turns (in whole degrees, 1 … 360) after which a design of order o looks the same, found by trying each one. */
const rotTurns = (o: number) => {
  const out: number[] = [];
  for (let t = 1; t <= 360; t++) if ((t * o) % 360 === 0) out.push(t);
  return out;
};

// ---------------------------------------------------------------- the families

export const B06: Def[] = [
  // ============================================================ puzzle-strategy
  {
    id: "afmissd",
    arity: 4,
    title: "Finding a missing digit in a sum or difference",
    competency: PZ,
    type: "integer",
    mc: true,
    // [s, pos, where, op]: the problem number s, the hidden column (0 hundreds, 1 tens, 2 ones), hidden in the first
    // number (0) or the result (1), addition (0) or subtraction (1)
    parse: none,
    reject: ([s, pos, where, op]) => (s < 0 || s > 59 || pos < 0 || pos > 2 || (where !== 0 && where !== 1) || (op !== 0 && op !== 1) ? "Three-digit sums and differences with one hidden digit." : null),
    prompt: (p) => `Find the missing digit: ${missText(p)}. Which digit goes in the box □?`,
    solve: ([s, pos, where, op]) => {
      const { a, b, res } = missSum(s, op);
      const d = digits3(where === 0 ? a : res)[pos];
      const inc = incoming(a, b, op, pos);
      return {
        steps: [
          st("carry", op === 0 ? "carry" : "exchange", op === 0 ? "MATH.number.addition-regroup" : SUBR, [pos], inc),
          st("column", where === 0 ? (op === 0 ? "subtract" : "add") : op === 0 ? "add" : "subtract", PZ, [pos, where, op, inc], d),
        ],
        answer: d,
      };
    },
    // independent: try every digit 0–9 in the box and keep the one that makes the whole sentence true
    validate: (p, v) => {
      const [s, pos, where, op] = p;
      const { a, b, res } = missSum(s, op);
      const ok: number[] = [];
      for (let d = 0; d <= 9; d++) {
        const put = (x: number) => Number(digits3(x).map((y, i) => (i === pos ? d : y)).join(""));
        const A = where === 0 ? put(a) : a;
        const R = where === 1 ? put(res) : res;
        if ((op === 0 ? A + b : A - b) === R) ok.push(d);
      }
      return ok.length === 1 && v === ok[0];
    },
    bugs: ([s, pos, where, op]) => {
      const { a, b, res } = missSum(s, op);
      const [A, B, R] = [digits3(a), digits3(b), digits3(res)];
      const k = pos;
      const out: Bug[] = [];
      if (op === 0 && where === 1) out.push({ id: "carry-forgotten", kind: "procedural", competency: "MATH.number.addition-regroup", says: "The ten carried from the column on the right was forgotten. When a column adds up to 10 or more, 1 goes to the next column.", predict: (A[k] + B[k]) % 10 });
      if (op === 0 && where === 0) {
        out.push({ id: "carry-forgotten", kind: "procedural", competency: "MATH.number.addition-regroup", says: "The ten carried from the column on the right was forgotten when working backwards. Check the column to the right first: did it make a carry?", predict: (R[k] - B[k] + 10) % 10 });
        out.push({ id: "add-not-undo", kind: "conceptual", competency: ADD, says: `To find a missing part of an addition, take the other number away from the total; the digits were added instead.`, predict: (R[k] + B[k]) % 10 });
      }
      if (op === 1 && where === 1) {
        out.push({ id: "smaller-from-larger", kind: "conceptual", competency: SUBR, says: "In that column the smaller digit was taken from the larger one. When the top digit is smaller, regroup first: exchange 1 from the next column on the left for 10 in this column.", predict: Math.abs(A[k] - B[k]) });
        out.push({ id: "borrow-forgotten", kind: "procedural", competency: SUBR, says: "The column on the right was regrouped (1 from this column was exchanged for 10 there), but this column was not made one less.", predict: (A[k] - B[k] + 10) % 10 });
      }
      if (op === 1 && where === 0) {
        out.push({ id: "borrow-forgotten", kind: "procedural", competency: SUBR, says: "Working backwards, the regrouping in the column on the right was forgotten: 1 from this column was exchanged for 10 there. The first number is the answer plus the number taken away, plus that 1.", predict: (R[k] + B[k]) % 10 });
        out.push({ id: "subtract-not-undo", kind: "conceptual", competency: SUBR, says: "To find the first number of a subtraction, add the answer and the number taken away; the digits were subtracted instead.", predict: Math.abs(R[k] - B[k]) });
      }
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "carry" ? (Number(s.value) ? (s.op === "carry" ? "The column to the right makes a carry of 1 into this column" : "The column to the right is regrouped: 1 from this column is exchanged for 10 there, so this column has 1 less") : "The column to the right needs no regrouping (nothing is carried or exchanged)") : `Work the hidden column, using the ${s.inputs[2] === 0 ? "carry" : "exchange"}: the missing digit is ${s.value}`),
    domain: [[0, 59], [0, 2], [0, 1], [0, 1]],
    cap: 400,
    difficulty: ([s, pos, where, op]) => {
      const { a, b } = missSum(s, op);
      return incoming(a, b, op, pos) === 0 ? 1 : where === 1 ? 2 : 3;
    },
    figure: ([s, pos, where, op]) => {
      const { a, b, res } = missSum(s, op);
      const row = (x: number, hid: boolean) => digits3(x).map((d, i) => (hid && i === pos ? "□" : String(d)));
      return { type: "table", head: ["", "H", "T", "O"], rows: [["", ...row(a, where === 0)], [op === 0 ? "+" : "−", ...row(b, false)], ["=", ...row(res, where === 1)]] };
    },
    // other digits near the answer (always 0–9), so no option is impossible as a digit
    distractors: (p) => {
      const [s, pos, where, op] = p;
      const { a, res } = missSum(s, op);
      const d = digits3(where === 0 ? a : res)[pos];
      return [d + 1, d - 1, d + 2, d - 2, d + 3, d - 3].filter((x) => x >= 0 && x <= 9);
    },
    word: (p) => `${name(p[0])} wrote a ${p[3] === 0 ? "sum" : "subtraction"} in a notebook, but a drop of ink covered one digit: ${missText(p)}. Which digit is under the ink drop?`,
    teach: {
      idea: "A sum or difference is a true sentence, so each column must work out, including any regrouping with the column on its right (a ten carried in, or 1 exchanged for 10 ones).",
      method: "Start from the ones column and move left. In each column, note whether the column regroups: a ten carried (addition) or 1 exchanged for 10 in the column on the right (subtraction), then find the digit that makes the hidden column right. Check by doing the whole calculation.",
      alternatives: [
        { id: "try_digits", title: "Try the digits and check", kind: "procedural", text: ["Put a digit in the box and work out the whole sum.", "If it is not right, see whether the answer came out too big or too small and try a better digit. Only one digit works."] },
        { id: "undo", title: "Undo the operation", kind: "conceptual", text: ["A missing part of an addition is total − other part.", "A missing first number of a subtraction is answer + number taken away. Work out that calculation and read off the digit."] },
      ],
    },
    limits: "Three-digit additions and subtractions with one hidden digit; puzzles with several hidden digits or number-placement grids are not included.",
  },
  {
    id: "afnim",
    arity: 3,
    title: "Winning move in a take-away game",
    competency: PZ,
    type: "integer",
    mc: true,
    // [n, k, rule]: n counters, take 1 to k each turn; rule 0: taking the last counter wins, 1: it loses
    parse: none,
    reject: ([n, k, rule]) => (n < 5 || n > 30 || k < 2 || k > 5 || (rule !== 0 && rule !== 1) ? "Take-away games with 5 to 30 counters, taking 1 to k (k up to 5)." : null),
    prompt: ([n, k, rule]) => `There are ${n} counters in the picture. Two players take turns. On each turn a player removes ${upTo(k)} counters. ${rule === 0 ? "The player who takes the last counter wins." : "The player who has to take the last counter loses."} It is your turn. How many counters should you take now so that you can always win?`,
    solve: ([n, k, rule]) => {
      const target = rule === 0 ? 0 : 1;
      const t = rule === 0 ? n % (k + 1) : (n - 1) % (k + 1);
      return {
        steps: [
          st("safe", "find-pattern", PZ, [k, target], k + 1),
          st("take", "divide", PZ, [rule === 0 ? n : n - 1, k + 1], t),
        ],
        answer: t,
      };
    },
    // independent: work out every position from 0 upwards (winning or losing for the player to move)
    validate: ([n, k, rule], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > k || v > n) return false;
      const win: boolean[] = [rule === 1];
      for (let m = 1; m <= n; m++) {
        let w = false;
        for (let t = 1; t <= Math.min(k, m); t++) if (!win[m - t]) w = true;
        win.push(w);
      }
      return !win[n - v];
    },
    bugs: ([n, k, rule]) => [
      { id: "take-most", kind: "conceptual", competency: PZ, says: `Taking as many as possible (${k}) does not always win. Look for the counts you want to leave for the other player.`, predict: k },
      { id: "groups-of-k", kind: "conceptual", competency: PZ, says: `The safe numbers to leave go up in steps of ${k + 1}, not ${k}: whatever the other player takes (1 to ${k}), you can take enough to make ${k + 1}.`, predict: rule === 0 ? (n % k === 0 ? null : n % k) : (n - 1) % k === 0 ? null : (n - 1) % k },
      ...(rule === 1 ? [{ id: "wrong-goal", kind: "conceptual", competency: PZ, says: "This game was played as if taking the last counter wins. Here you want to leave the other player exactly 1 counter at the end.", predict: n % (k + 1) === 0 ? null : n % (k + 1) } as Bug] : []),
    ],
    variants: () => [],
    explain: (s) => (s.id === "safe" ? `Whatever the other player takes, you can make the pair of turns add up to ${s.value}. So leave a number that is ${s.inputs[1] === 0 ? `a multiple of ${s.value}` : `1 more than a multiple of ${s.value}`}` : `${s.inputs[0]} ÷ ${s.inputs[1]} leaves remainder ${s.value}: take ${s.value}`),
    domain: [[5, 30], [2, 5], [0, 1]],
    keep: ([n, k, rule]) => n >= k + 2 && (rule === 0 ? n % (k + 1) : (n - 1) % (k + 1)) !== 0,
    difficulty: ([n, , rule]) => (rule === 1 ? 3 : n <= 12 ? 1 : 2),
    figure: ([n]) => ({ type: "dots", count: n, rows: Math.ceil(n / 10) }),
    // the other legal moves first, then k + 1 and k + 2 (the "steps of k + 1" slip): never 0, which is not a move
    distractors: ([n, k, rule]) => {
      const t = rule === 0 ? n % (k + 1) : (n - 1) % (k + 1);
      return [...Array.from({ length: k }, (_, i) => i + 1).filter((x) => x !== t), k + 1, k + 2];
    },
    word: ([n, k, rule]) => `${name(n)} and ${name(n + 3)} play a game with ${n} sticks. They take turns to pick up ${upTo(k)} sticks. ${rule === 0 ? "Whoever picks up the last stick wins." : "Whoever has to pick up the last stick loses."} ${name(n)} goes first. How many sticks should ${name(n)} pick up first to be sure of winning?`,
    teach: {
      idea: `Work backwards from the end. Some numbers of counters are "safe" to leave for the other player: from them, whatever they take, you can get back to the next safe number.`,
      method: "If each turn takes 1 to k, the safe numbers go up in steps of k + 1 (0, k + 1, 2(k + 1) … when the last counter wins; 1 more than these when it loses). Take enough to leave a safe number.",
      visual: ([n]) => ({ type: "dots", count: n, rows: Math.ceil(n / 10) }),
      alternatives: [
        { id: "small_games", title: "Play small games first", kind: "conceptual", text: ["Play with 1, 2, 3 … counters and write W (the player to move wins) or L (loses) under each number.", "A number is W if you can move to an L. The L numbers form a pattern; leave your partner an L number."], visual: ([, k]) => ({ type: "table", head: ["Counters", ...Array.from({ length: 2 * (k + 1) + 1 }, (_, i) => String(i))], rows: [["Player to move", ...Array.from({ length: 2 * (k + 1) + 1 }, (_, i) => (i % (k + 1) === 0 ? "L" : "W"))]] }) },
      ],
    },
    limits: "One pile, take 1 to k counters; the winning first move is unique. Explaining why the strategy works is marked by an educator.",
  },
  // ============================================================ systematic enumeration
  {
    id: "afcount",
    arity: 3,
    title: "Counting every combination (one from each group)",
    competency: EN,
    type: "integer",
    mc: true,
    // [a, b, c]: a, b and c choices (c = 1: only two groups)
    parse: none,
    reject: ([a, b, c]) => (a < 2 || a > 6 || b < 2 || b > 6 || c < 1 || c > 4 ? "Two or three groups of 2 to 6 choices." : null),
    prompt: ([a, b, c]) =>
      c === 1
        ? `The table shows ${name(a + b)}'s ${a} shirts and ${b} pairs of shorts. An outfit is one shirt with one pair of shorts. How many different outfits are possible?`
        : `The table shows a canteen's ${a} main dishes, ${b} side dishes and ${c} sweets. A meal is one main dish, one side dish and one sweet. How many different meals are possible?`,
    solve: ([a, b, c]) => ({
      steps: [st("pairs", "multiply", EN, [a, b], a * b), ...(c > 1 ? [st("triples", "multiply", EN, [a * b, c], a * b * c)] : [])],
      answer: a * b * c,
    }),
    // independent: list every combination (nested loops) and count
    validate: ([a, b, c], v) => {
      let n = 0;
      for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) for (let k = 0; k < c; k++) n++;
      return v === n;
    },
    bugs: ([a, b, c]) => [
      { id: "add-choices", kind: "conceptual", competency: EN, says: "The numbers of choices were added. Each choice from the first group goes with every choice from the next, so multiply.", predict: a + b + (c > 1 ? c : 0) },
      ...(c > 1 ? [{ id: "add-last-group", kind: "procedural", competency: EN, says: `The pairs were found (${a} × ${b}), but then the sweets were added. Every pair goes with each of the ${c} sweets, so multiply again.`, predict: a * b + c } as Bug, { id: "forgot-group", kind: "procedural", competency: EN, says: "One group was left out. A meal has one item from each of the three groups.", predict: a * b } as Bug] : []),
    ],
    variants: () => [],
    explain: (s) => (s.id === "pairs" ? `Each of the ${s.inputs[0]} first choices goes with each of the ${s.inputs[1]} second choices: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `Each of those ${s.inputs[0]} goes with each of the ${s.inputs[1]} last choices: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: [[2, 6], [2, 6], [1, 4]],
    difficulty: ([a, b, c]) => (c === 1 && a * b <= 12 ? 1 : c === 1 ? 2 : 3),
    figure: ([a, b, c]) => {
      const SH = ["red", "blue", "green", "yellow", "white", "pink"];
      const SK = ["black", "grey", "brown", "orange", "purple", "cream"];
      const MAIN = ["idli", "dosa", "pongal", "puri", "upma", "chapati"];
      const SIDE = ["sambar", "chutney", "kurma", "dal", "raita", "podi"];
      const SW = ["payasam", "kesari", "laddu", "halwa"];
      const cols = c === 1 ? [SH.slice(0, a), SK.slice(0, b)] : [MAIN.slice(0, a), SIDE.slice(0, b), SW.slice(0, c)];
      const h = Math.max(...cols.map((x) => x.length));
      return { type: "table", head: c === 1 ? ["Shirts", "Shorts"] : ["Main dish", "Side dish", "Sweet"], rows: Array.from({ length: h }, (_, i) => cols.map((x) => x[i] ?? "")) };
    },
    word: ([a, b, c]) => `${name(a)} can go from the village to the town by ${a} different buses, and from the town to the city by ${b} different trains${c > 1 ? `, then from the city to the airport by ${c} different taxis` : ""}. How many different ways can ${name(a)} make the whole journey?`,
    teach: {
      idea: "Every choice from one group can be matched with every choice from the next, so the number of combinations is the product of the numbers of choices.",
      method: "Fix the first choice and count how many ways the rest can go; that number is the same for every first choice, so multiply. With a third group, multiply again.",
      alternatives: [
        { id: "list_table", title: "Make an organised list", kind: "procedural", text: ["Take the first shirt and list it with every skirt, then the second shirt with every skirt, and so on.", "Each row of the list has the same length, so the total is rows × length of a row."], visual: ([a, b]) => ({ type: "array", rows: a, cols: b }) },
        { id: "tree", title: "Draw a tree", kind: "conceptual", text: ["Draw one branch for each first choice; from the end of each, draw one branch for each second choice.", "Count the ends of the last branches."] },
      ],
    },
    limits: "Two or three independent groups of up to 6 choices; restrictions (e.g. some pairs not allowed) are not included.",
  },
  {
    id: "afdigits",
    arity: 5,
    title: "How many numbers can be made from given digits",
    competency: EN,
    type: "integer",
    mc: true,
    // [n, k, rep, zero, s]: n digits (one of them 0 when zero = 1), k-digit numbers, repetition allowed (rep = 1)
    parse: none,
    reject: ([n, k, rep, zero, s]) => (n < 2 || n > 5 || k < 2 || k > 3 || rep < 0 || rep > 1 || zero < 0 || zero > 1 || s < 0 || s > 2 || (!rep && k > n) ? "Two- or three-digit numbers from 2 to 5 given digits." : null),
    prompt: ([n, k, rep, zero, s]) => `How many different ${k}-digit numbers can you make from the digits ${digitList(n, zero, s).join(", ")}, ${rep ? "if a digit may be used more than once" : "using each digit at most once"}?`,
    solve: ([n, k, rep, zero]) => {
      const ch = digitChoices(n, k, rep, zero);
      return { steps: [st("choices", "count", EN, ch, ch.join(" × ")), st("multiply", "multiply", EN, ch, ch.reduce((x, y) => x * y, 1))], answer: ch.reduce((x, y) => x * y, 1) };
    },
    // independent: go through every k-digit number and keep those made from the digits (respecting the rule)
    validate: ([n, k, rep, zero, s], v) => {
      const ds = digitList(n, zero, s);
      let c = 0;
      for (let x = 10 ** (k - 1); x < 10 ** k; x++) {
        const xs = String(x).split("").map(Number);
        if (!xs.every((d) => ds.includes(d))) continue;
        if (!rep && new Set(xs).size !== xs.length) continue;
        c++;
      }
      return v === c;
    },
    bugs: ([n, k, rep, zero]) => {
      const ch = digitChoices(n, k, rep, zero);
      const prod = (xs: number[]) => xs.reduce((x, y) => x * y, 1);
      const other = digitChoices(n, k, rep ? 0 : 1, zero);
      return [
        ...(zero ? [{ id: "zero-first", kind: "conceptual", competency: EN, says: "Numbers starting with 0 were counted. A number does not start with 0 (07 is just 7), so 0 cannot be the first digit.", predict: prod(digitChoices(n, k, rep, 0)) } as Bug] : []),
        ...(rep || k <= n ? [{ id: "repeat-rule", kind: "procedural", competency: EN, says: rep ? "A digit may be used again, so every place has all the choices; repeats were left out." : "Each digit can be used only once, so each place after the first has one choice fewer; repeats were counted.", predict: prod(other) } as Bug] : []),
        { id: "add-choices", kind: "conceptual", competency: EN, says: "The choices for each place were added. Each first digit goes with every choice for the next place, so multiply.", predict: ch.reduce((x, y) => x + y, 0) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "choices" ? `Choices for each place, from the left: ${s.value}` : `Multiply the choices: ${s.inputs.join(" × ")} = ${s.value}`),
    domain: [[2, 5], [2, 3], [0, 1], [0, 1], [0, 2]],
    keep: ([n, k, rep, zero]) => digitChoices(n, k, rep, zero).reduce((x, y) => x * y, 1) <= 125 && (rep === 1 || k <= n),
    difficulty: ([, k, , zero]) => (k === 2 && !zero ? 1 : k === 3 && zero ? 3 : 2),
    word: ([n, k, rep, zero, s]) => `${name(n + s)} has digit cards ${digitList(n, zero, s).join(", ")}${rep ? " (plenty of cards of each digit)" : " (one card of each)"}. How many different ${k}-digit numbers can ${name(n + s)} make by placing cards side by side?`,
    teach: {
      idea: "Fill the places one at a time from the left. The number of ways is the product of the choices for each place.",
      method: "Count the choices for the first place (0 is not allowed there), then for the next place (one fewer if digits cannot repeat), and so on; multiply.",
      alternatives: [
        { id: "list_by_first", title: "List by the first digit", kind: "procedural", text: ["Write all the numbers that start with the first digit, then those that start with the next digit, and so on.", "Each starting digit gives the same number of numbers, so multiply."], visual: ([n, k, rep, zero, s]) => (k === 2 ? { type: "table", head: ["First digit", "Numbers"], rows: digitList(n, zero, s).filter((d) => d !== 0).map((d) => [String(d), digitList(n, zero, s).filter((e) => rep || e !== d).map((e) => `${d}${e}`).join(", ")]) } : null) },
      ],
    },
    limits: "Two- and three-digit numbers from up to 5 digits, with or without repeats, at most 125 numbers; extra conditions (even numbers, greater than …) are not included.",
  },
  // ============================================================ pie charts
  {
    id: "afpie",
    arity: 4,
    title: "Reading a pie chart",
    competency: PIE,
    type: "integer",
    mc: true,
    // [pie, cat, ti, hide]: pie chart, category asked, total, the asked part's fraction hidden (1)
    parse: none,
    reject: ([pie, cat, ti, hide]) => (pie < 0 || pie >= PIES.length || cat < 0 || cat >= PIES[pie].length || ti < 0 || ti >= PIET.length || hide < 0 || hide > 1 ? "Pie charts in halves, quarters, eighths, thirds and sixths." : null),
    prompt: ([pie, cat, ti, hide]) => {
      const ctx = PIECTX[pie % 3];
      return `The pie chart shows how the ${PIET[ti]} ${ctx.who} ${ctx.how}.${hide ? " One part's fraction is not written." : ""} ${pieQ(ctx, cat)}`;
    },
    solve: ([pie, cat, ti, hide]) => {
      const T = PIET[ti];
      const v = PIES[pie][cat];
      const others = PIES[pie].reduce((x, y) => x + y, 0) - v;
      return {
        steps: [...(hide ? [st("missing", "subtract", FRM, [1, fmt(others / 24)], fmt(v / 24))] : []), st("part", "multiply", PIE, [fmt(v / 24), T], (T * v) / 24)],
        answer: (T * v) / 24,
      };
    },
    // independent: the parts of the chart in proportion (answer × whole circle = total × part), and all parts add to the total
    validate: ([pie, cat, ti], v) => {
      if (typeof v !== "number") return false;
      const vals = PIES[pie];
      const sum = vals.reduce((x, y) => x + y, 0);
      const T = PIET[ti];
      const counts = vals.map((x) => (T * x) / sum);
      return v * sum === T * vals[cat] && counts.reduce((x, y) => x + y, 0) === T && Number.isInteger(v);
    },
    bugs: ([pie, cat, ti]) => {
      const T = PIET[ti];
      const v = PIES[pie][cat];
      const den = 24 / gcd2(v, 24);
      const parts = PIES[pie].length;
      return [
        { id: "equal-parts", kind: "conceptual", competency: FRM, says: `The ${parts} parts were treated as equal. Look at the size of each part: they are not all the same.`, predict: intOrNull(T / parts) },
        { id: "denominator-only", kind: "procedural", competency: FRM, says: `Only the bottom of the fraction was used (${T} ÷ ${den}). Then multiply by the top: that many of those pieces.`, predict: intOrNull(T / den) },
        { id: "the-rest", kind: "procedural", competency: PIE, says: "The number for all the other parts was found instead of this part.", predict: T - (T * v) / 24 },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "missing" ? `The whole circle is 1, so the missing part is 1 − ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} of ${s.inputs[1]} = ${s.value}`),
    domain: [[0, PIES.length - 1], [0, 4], [0, PIET.length - 1], [0, 1]],
    keep: ([pie, cat, ti]) => cat < PIES[pie].length && PIES[pie].every((x) => (PIET[ti] * x) % 24 === 0),
    cap: 300,
    difficulty: ([pie, cat, , hide]) => (hide ? 3 : gcd2(PIES[pie][cat], 24) === PIES[pie][cat] ? 1 : 2),
    figure: ([pie, cat, , hide]) => {
      const ctx = PIECTX[pie % 3];
      // values are the sector angles in degrees (not counts), so the screen-reader text neither gives nor contradicts the answer
      return { type: "pie", labels: PIES[pie].map((x, i) => `${ctx.labels[i]} (${hide && i === cat ? "?" : fmt(x / 24)})`), values: PIES[pie].map((x) => 15 * x) };
    },
    word: ([pie, cat, ti, hide]) => {
      const ctx = PIECTX[pie % 3];
      const T = PIET[ti];
      const parts = PIES[pie].map((x, i) => ({ l: ctx.labels[i], f: fmt(x / 24) }));
      if (!hide) return `In a survey of ${T} people, ${parts[cat].f} of them said "${parts[cat].l}". How many people said "${parts[cat].l}"?`;
      const rest = parts.filter((_, i) => i !== cat).map((x) => `${x.f} said "${x.l}"`);
      return `In a survey of ${T} people, ${rest.join(", ")}, and everyone else said "${parts[cat].l}". How many people said "${parts[cat].l}"?`;
    },
    teach: {
      idea: "A pie chart shows the whole group as a full circle; each part's size is a fraction of the whole group.",
      method: "Find the fraction for the part (the whole circle is 1, so a missing part is 1 minus the others). Then find that fraction of the total: divide by the bottom number, multiply by the top.",
      alternatives: [
        { id: "equal_pieces", title: "Cut into equal pieces", kind: "conceptual", text: ["Imagine the circle cut into equal pieces (for example 8 eighths). Share the total equally among the pieces.", "Count how many pieces the part covers, and add up their shares."], visual: ([pie, , ti]) => ({ type: "pie", labels: PIES[pie].map((x) => `${(PIET[ti] * x) / 24}`), values: PIES[pie] }) },
      ],
    },
    limits: "Pie charts whose parts are halves, quarters, eighths, thirds or sixths of a total that divides exactly; drawing a pie chart is marked by an educator.",
  },
  {
    id: "afpieang",
    arity: 3,
    title: "Sector angles in a pie chart",
    competency: PIE,
    type: "integer",
    mc: true,
    // [ti, x, ask]: total PIEANG[ti], x in the group; ask 0: the angle, 1: the number from the angle
    parse: none,
    reject: ([ti, x, ask]) => (ti < 0 || ti >= PIEANG.length || x < 1 || x >= PIEANG[ti] || (ask !== 0 && ask !== 1) || (360 * x) % PIEANG[ti] !== 0 ? "Totals that divide 360 and a group smaller than the total." : null),
    prompt: ([ti, x, ask]) => {
      const T = PIEANG[ti];
      return ask === 0
        ? `In a class of ${T} students, ${x} chose cricket as their favourite game. In a pie chart of the whole class, what angle (in degrees) does the cricket sector make at the centre?`
        : `A pie chart shows the favourite games of ${T} students. The cricket sector makes an angle of ${(360 * x) / T}° at the centre. How many students chose cricket?`;
    },
    solve: ([ti, x, ask]) => {
      const T = PIEANG[ti];
      return ask === 0
        ? { steps: [st("fraction", "divide", "MATH.number.ratio", [x, T], fmt(x / T)), st("angle", "multiply", PIE, [fmt(x / T), 360], (360 * x) / T)], answer: (360 * x) / T }
        : { steps: [st("fraction", "divide", "MATH.number.ratio", [(360 * x) / T, 360], fmt(x / T)), st("count", "multiply", PIE, [fmt(x / T), T], x)], answer: x };
    },
    // independent: a sector is in proportion to its group (cross-multiplication: angle × total = 360 × group)
    validate: ([ti, x, ask], v) => {
      if (typeof v !== "number") return false;
      const T = PIEANG[ti];
      return ask === 0 ? v * T === 360 * x : v * 360 === ((360 * x) / T) * T;
    },
    bugs: ([ti, x, ask]) => {
      const T = PIEANG[ti];
      const ang = (360 * x) / T;
      return ask === 0
        ? [
            { id: "count-as-degrees", kind: "conceptual", competency: PIE, says: "The number of students was used as the angle. The whole class is the full circle of 360°, so first find what fraction of the class this is.", predict: x },
            { id: "percent-not-degrees", kind: "procedural", competency: PIE, says: "The fraction was turned into a percentage (out of 100). A full circle is 360°, so multiply the fraction by 360.", predict: intOrNull((100 * x) / T) },
            { id: "half-circle", kind: "recall", competency: ANG, says: "A full turn is 360°, not 180°.", predict: intOrNull((180 * x) / T) },
          ]
        : [
            { id: "degrees-as-count", kind: "conceptual", competency: PIE, says: "The angle was given as the number of students. The angle is a fraction of 360°; the same fraction of the class chose cricket.", predict: ang },
            { id: "half-circle", kind: "recall", competency: ANG, says: "A full turn is 360°, not 180°.", predict: intOrNull((ang * T) / 180) },
            { id: "percent-not-degrees", kind: "procedural", competency: PIE, says: "The angle was treated as a percentage (out of 100). Compare it with 360°, the whole circle.", predict: intOrNull((ang * T) / 100) },
          ];
    },
    variants: () => [],
    explain: (s) => (s.id === "fraction" ? `Fraction of the whole: ${s.inputs[0]} out of ${s.inputs[1]} = ${s.value}` : s.id === "angle" ? `${s.inputs[0]} of 360° = ${s.value}°` : `${s.inputs[0]} of ${s.inputs[1]} students = ${s.value}`),
    domain: [[0, 12], [1, 179], [0, 1]],
    keep: ([ti, x]) => x < PIEANG[ti] && (360 * x) % PIEANG[ti] === 0 && 2 * x !== PIEANG[ti],
    cap: 300,
    difficulty: ([ti]) => (PIEANG[ti] <= 36 ? 1 : PIEANG[ti] <= 90 ? 2 : 3),
    // only when the angle is given (the angle is the answer otherwise); values are angles, so the text matches the labels
    figure: ([ti, x, ask]) => (ask === 0 ? null : { type: "pie", labels: [`Cricket (${(360 * x) / PIEANG[ti]}°)`, "Other games"], values: [(360 * x) / PIEANG[ti], 360 - (360 * x) / PIEANG[ti]] }),
    word: ([ti, x, ask]) => {
      const T = PIEANG[ti];
      return ask === 0
        ? `${name(x)} asked ${T} families in the street how they cook; ${x} use a gas stove. ${name(x)} draws a pie chart of the answers. What angle, in degrees, should the gas-stove sector have?`
        : `${name(x)} drew a pie chart of how ${T} families in the street cook. The gas-stove sector is ${(360 * x) / T}°. How many families use a gas stove?`;
    },
    teach: {
      idea: "The whole group is the whole circle, 360°. Each part gets the same fraction of 360° as it is of the group.",
      method: "Angle = (part ÷ total) × 360°. Going back: part = (angle ÷ 360°) × total.",
      alternatives: [
        { id: "per_person", title: "Degrees for one person", kind: "procedural", text: ["Share 360° among everyone: each person gets 360 ÷ total degrees.", "Multiply by the number in the part (or divide the angle by the degrees for one person)."], visual: ([ti, x]) => ({ type: "pie", labels: ["The part", "The rest"], values: [x, PIEANG[ti] - x] }) },
      ],
    },
    limits: "Totals that divide 360 exactly, so every angle is a whole number of degrees; drawing the sectors is marked by an educator.",
  },
  // ============================================================ scaled bar charts
  {
    id: "afbar",
    arity: 3,
    title: "Reading a bar chart with a scale",
    competency: SB,
    type: "integer",
    mc: true,
    // [si, kind, s]: scale SCALES[si]; kind 0 read one bar, 1 how many more, 2 total of two bars; chart number s
    parse: none,
    reject: ([si, kind, s]) => (si < 0 || si >= SCALES.length || kind < 0 || kind > 2 || s < 0 || s > 19 ? "Bar charts with a scale of 2, 5, 10, 20, 50 or 100." : null),
    prompt: (p) => {
      const { i, j, ctx } = barData(p);
      const [L1, L2] = [ctx.full[i], ctx.full[j]];
      return p[1] === 0
        ? `The bar chart shows ${ctx.title.toLowerCase()}. Read the scale carefully. How many ${ctx.unit} ${ctx.verb} ${ctx.on(L1)}?`
        : p[1] === 1
          ? `The bar chart shows ${ctx.title.toLowerCase()}. Read the scale carefully. How many more ${ctx.unit} ${ctx.verb} ${ctx.on(L1)} than ${ctx.on(L2)}?`
          : `The bar chart shows ${ctx.title.toLowerCase()}. Read the scale carefully. How many ${ctx.unit} ${ctx.verb} ${ctx.on(L1)} and ${ctx.on(L2)} together?`;
    },
    solve: (p) => {
      const { ks, i, j, sc } = barData(p);
      const [x, y] = [ks[i] * sc, ks[j] * sc];
      const read = [st("read1", "read", SB, [ks[i], sc], x), ...(p[1] ? [st("read2", "read", SB, [ks[j], sc], y)] : [])];
      return p[1] === 0 ? { steps: read, answer: x } : p[1] === 1 ? { steps: [...read, st("compare", "subtract", BAR, [x, y], x - y)], answer: x - y } : { steps: [...read, st("total", "add", BAR, [x, y], x + y)], answer: x + y };
    },
    // independent: read each bar from the chart's own values, counting up the scale line by line
    validate: (p, v) => {
      const { i, j, sc, ks } = barData(p);
      const up = (k: number) => {
        let t = 0;
        for (let m = 0; m < k; m++) t += sc;
        return t;
      };
      const want = p[1] === 0 ? up(ks[i]) : p[1] === 1 ? up(ks[i]) - up(ks[j]) : up(ks[i]) + up(ks[j]);
      return v === want;
    },
    bugs: (p) => {
      const { ks, i, j, sc } = barData(p);
      const lines = p[1] === 0 ? ks[i] : p[1] === 1 ? ks[i] - ks[j] : ks[i] + ks[j];
      return [
        { id: "count-lines", kind: "conceptual", competency: SB, says: `The lines were counted as 1 each. On this chart each line on the scale stands for ${sc}.`, predict: lines },
        ...(sc !== 10 ? [{ id: "assume-tens", kind: "procedural", competency: SB, says: "Each line was taken as 10. Read the numbers on the scale: they tell how much each line stands for.", predict: lines * 10 } as Bug] : []),
        ...(p[1] === 1 ? [{ id: "add-for-more", kind: "conceptual", competency: BAR, says: "\"How many more\" asks for the difference between the bars, not their total.", predict: (ks[i] + ks[j]) * sc } as Bug] : []),
        ...(p[1] === 2 ? [{ id: "difference-for-total", kind: "procedural", competency: BAR, says: "\"Together\" asks for the total of the two bars; the difference was found instead.", predict: Math.abs(ks[i] - ks[j]) * sc } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "read1" || s.id === "read2" ? `The bar reaches ${s.inputs[0]} lines; each line is ${s.inputs[1]}, so it shows ${s.value}` : s.id === "compare" ? `How many more: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : `Together: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`),
    domain: [[0, SCALES.length - 1], [0, 2], [0, 19]],
    cap: 360,
    difficulty: ([si, kind]) => (kind === 0 && si <= 2 ? 1 : kind === 0 || si <= 2 ? 2 : 3),
    figure: (p) => {
      const { ks, sc, ctx } = barData(p);
      return { type: "bars", title: ctx.title, labels: ctx.labels, values: ks.map((k) => k * sc), scale: sc };
    },
    word: (p) => {
      const { i, j, ctx } = barData(p);
      const [L1, L2] = [ctx.full[i], ctx.full[j]];
      const who = name(p[2]);
      return p[1] === 0
        ? `${who} made this bar chart for a school project. Using the chart, find how many ${ctx.unit} ${ctx.verb} ${ctx.on(L1)}.`
        : p[1] === 1
          ? `${who} made this bar chart for a school project and says one bar is taller than the other. By how many ${ctx.unit} is ${L1} more than ${L2}?`
          : `${who} made this bar chart for a school project. ${who} wants the total for ${L1} and ${L2}. What is it?`;
    },
    teach: {
      idea: "On a scaled bar chart each line on the side stands for more than 1 (for example 5 or 50). The height of a bar is read off the scale, not by counting squares as ones.",
      method: "Find how much one line stands for (the difference between two numbers on the scale). Read each bar against the scale, then add or subtract as the question asks.",
      alternatives: [
        { id: "skip_count", title: "Skip-count up the scale", kind: "procedural", text: ["Put a finger at the bottom of the bar and count up the lines in steps of the scale: 5, 10, 15 …", "Stop at the top of the bar: that number is its value."], visual: (p) => {
          const { ks, i, sc, ctx } = barData(p);
          return { type: "bars", labels: [ctx.labels[i]], values: [ks[i] * sc], scale: sc };
        } },
      ],
    },
    limits: "Five bars ending exactly on a scale line; bars ending between lines, and drawing a bar chart, are not included.",
  },
  // ============================================================ letters for number rules
  {
    id: "afletter",
    arity: 3,
    title: "Writing a number rule with a letter",
    competency: EXI,
    type: "exact",
    mc: true,
    // [kind, a, b]: 0 L + a, 1 L − a, 2 aL, 3 aL + b
    parse: none,
    reject: ([kind, a, b]) => (kind < 0 || kind > 3 || a < 2 || a > 12 || b < 1 || b > 9 ? "Rules L + a, L − a, aL and aL + b with small numbers." : null),
    prompt: ([kind, a, b]) => {
      const L = letterOf(a);
      return kind === 0
        ? `A number machine adds ${a} to any number put in. The number put in is ${L}. Write the number that comes out, using ${L}.`
        : kind === 1
          ? `A number machine takes ${a} away from any number put in. The number put in is ${L}. Write the number that comes out, using ${L}.`
          : kind === 2
            ? `A number machine multiplies any number put in by ${a}. The number put in is ${L}. Write the number that comes out, using ${L}.`
            : `A number machine multiplies any number put in by ${a}, then adds ${b}. The number put in is ${L}. Write the number that comes out, using ${L}.`;
    },
    solve: ([kind, a, b]) => {
      const L = letterOf(a);
      return { steps: [st("rule", kind === 0 ? "add" : kind === 1 ? "subtract" : "multiply", EXI, [L, a, kind === 3 ? b : 0], rule(kind, a, b, L))], answer: rule(kind, a, b, L) };
    },
    // independent: put numbers through the machine one step at a time and compare with the expression
    validate: ([kind, a, b], v) => {
      const L = letterOf(a);
      const machine = (t: number) => {
        let out = t;
        if (kind === 0) for (let i = 0; i < a; i++) out++;
        else if (kind === 1) for (let i = 0; i < a; i++) out--;
        else {
          out = 0;
          for (let i = 0; i < a; i++) out += t;
          if (kind === 3) out += b;
        }
        return out;
      };
      return agrees(v, L, machine);
    },
    bugs: ([kind, a, b]) => {
      const L = letterOf(a);
      if (kind === 0) return [{ id: "times-for-add", kind: "conceptual", competency: EXI, says: `${a}${L} means ${a} × ${L}. Adding ${a} is written ${L} + ${a}.`, predict: `${a}${L}` }];
      if (kind === 1)
        return [
          { id: "reversed", kind: "conceptual", competency: EXI, says: `${a} − ${L} takes ${L} away from ${a}. Taking ${a} away from ${L} is written ${L} − ${a}.`, predict: `${a} − ${L}` },
          { id: "add-for-take", kind: "procedural", competency: EXI, says: "The rule takes away, so use −, not +.", predict: `${L} + ${a}` },
        ];
      if (kind === 2) return [{ id: "add-for-times", kind: "conceptual", competency: EXI, says: `${L} + ${a} adds ${a}. Multiplying by ${a} is written ${a} × ${L}, or ${a}${L}.`, predict: `${L} + ${a}` }];
      return [
        { id: "brackets", kind: "procedural", competency: EXI, says: `${a}(${L} + ${b}) adds ${b} first and then multiplies. The machine multiplies first, then adds ${b}.`, predict: `${a}${L} + ${a * b}` },
        { id: "all-added", kind: "conceptual", competency: EXI, says: `Multiplying by ${a} was written as adding ${a}.`, predict: `${L} + ${a + b}` },
        { id: "joined-numbers", kind: "procedural", competency: EXI, says: `${b} was put with the ${a} in front of ${L}. ${a + b}${L} means ${a + b} × ${L}; the ${b} is added on its own.`, predict: `${a + b}${L}` },
      ];
    },
    distractors: ([kind, a, b]) => {
      const L = letterOf(a);
      return [`${L} + ${a + 1}`, `${a + 1}${L}`, `${L}${a > 2 ? ` − ${a - 1}` : " + 1"}`, `${a}${L} − ${b}`];
    },
    variants: () => [],
    explain: (s) => `Start with ${s.inputs[0]} and do what the machine does: ${s.value}`,
    domain: [[0, 3], [2, 12], [1, 9]],
    keep: ([kind, , b]) => kind === 3 || b === 1,
    difficulty: ([kind]) => (kind <= 1 ? 1 : kind === 2 ? 2 : 3),
    word: ([kind, a, b]) => {
      const L = letterOf(a);
      return kind === 0
        ? `Kavya is ${a} years older than her brother. Her brother is ${L} years old. Write Kavya's age using ${L}.`
        : kind === 1
          ? `A ribbon is ${L} cm long. ${name(a)} cuts ${a} cm off it. Write the length of ribbon left, in cm, using ${L}.`
          : kind === 2
            ? `A box holds ${a} pencils. Write the number of pencils in ${L} full boxes.`
            : `${name(a + b)} has ${L} packets with ${a} biscuits in each, and ${b} loose biscuit${b === 1 ? "" : "s"}. Write how many biscuits ${name(a + b)} has, using ${L}.`;
    },
    teach: {
      idea: "A letter stands for any number. A rule written with the letter works for every number at once.",
      method: "Do to the letter exactly what you would do to a number: 'add 5' gives n + 5; 'multiply by 4' gives 4n (4 × n). Test your rule with a small number.",
      alternatives: [
        { id: "table_first", title: "Try numbers first", kind: "conceptual", text: ["Make a small table: put in 1, 2, 3 and write what comes out.", "Look at what you did to each number every time, and write the same thing with the letter."], visual: ([kind, a, b]) => ({ type: "table", head: ["In", "1", "2", "3"], rows: [["Out", ...[1, 2, 3].map((t) => String(kind === 0 ? t + a : kind === 1 ? t - a : kind === 2 ? a * t : a * t + b))]] }) },
      ],
    },
    limits: "One-letter rules of the forms L + a, L − a, aL and aL + b; rules with brackets or division are not included.",
  },
  {
    id: "afmatch",
    arity: 3,
    title: "Writing the rule of a growing pattern with a letter",
    competency: EXI,
    type: "exact",
    mc: true,
    // [a, b, ctx]: shape n has a n + b pieces
    parse: none,
    reject: ([a, b, ctx]) => (a < 2 || a > 6 || b < 0 || b > 5 || ctx < 0 || ctx > 2 ? "Patterns that grow by 2 to 6 each time." : null),
    prompt: ([a, b, ctx]) => `The table shows the number of ${["matchsticks", "tiles", "dots"][ctx]} in the first four shapes of a growing pattern. Write a rule for the number of ${["matchsticks", "tiles", "dots"][ctx]} in shape n.`,
    solve: ([a, b]) => ({ steps: [st("step", "subtract", PAT, [2 * a + b, a + b], a), st("start", "subtract", PAT, [a + b, a], b), st("rule", "write", EXI, [a, b], linRule(a, b))], answer: linRule(a, b) }),
    // independent: build the pattern shape by shape (add the step each time) and compare with the rule for n = 1 … 7
    validate: ([a, b], v) => {
      const seq = [a + b];
      for (let i = 1; i < 7; i++) seq.push(seq[i - 1] + a);
      return agrees(v, "n", (t) => seq[t - 1]);
    },
    bugs: ([a, b]) => [
      { id: "step-added", kind: "conceptual", competency: PAT, says: `n + ${a} adds ${a} once. The pattern adds ${a} for every shape, so the rule has ${a}n (${a} × n).`, predict: `n + ${a}` },
      { id: "start-forgotten", kind: "procedural", competency: EXI, says: `${a}n gives ${a} for shape 1, but shape 1 has ${a + b}. Add the extra ${b}.`, predict: `${a}n` },
      { id: "first-times-n", kind: "conceptual", competency: PAT, says: `${a + b}n would add ${a + b} each time, but the pattern grows by ${a} each time.`, predict: `${a + b}n` },
      { id: "counted-from-zero", kind: "procedural", competency: PAT, says: "The shapes were numbered from 0. Check your rule with n = 1: it must give the first shape.", predict: linRule(a, a + b) },
    ],
    distractors: ([a, b]) => [linRule(a + 1, b), `n + ${a + b}`],
    variants: () => [],
    explain: (s) => (s.id === "step" ? `Each shape has ${s.value} more than the one before (${s.inputs[0]} − ${s.inputs[1]})` : s.id === "start" ? `${s.inputs[1]} × 1 = ${s.inputs[1]}, and shape 1 has ${s.inputs[0]}, so add ${s.value}` : `Rule: ${s.value}`),
    domain: [[2, 6], [0, 5], [0, 2]],
    difficulty: ([a, b]) => (b === 0 ? 1 : a <= 3 ? 2 : 3),
    figure: ([a, b, ctx]) => ({ type: "table", head: ["Shape", "1", "2", "3", "4"], rows: [[["Matchsticks", "Tiles", "Dots"][ctx], ...[1, 2, 3, 4].map((t) => String(a * t + b))]] }),
    word: ([a, b]) => `${name(a + b)} is laying a garden path. Path 1 uses ${a + b} tiles, path 2 uses ${2 * a + b}, path 3 uses ${3 * a + b}, and each new path uses ${a} more tiles than the one before. Write a rule for the number of tiles in path n.`,
    teach: {
      idea: "If a pattern grows by the same amount each time, that amount is the number multiplied by n; a fixed extra makes the first shape right.",
      method: "Find how much the pattern grows each time (say 3): the rule starts 3n. Compare 3 × 1 with shape 1 to find what to add. Check with shape 4.",
      alternatives: [
        { id: "groups", title: "See the groups in the shape", kind: "conceptual", text: ["Look for the part that is added each time (for example a ⊓ of 3 matchsticks) and the part that is there from the start (one extra stick).", "Shape n has n of the repeating parts plus the starting part."], visual: ([a, b]) => ({ type: "table", head: ["Shape", "Repeating parts", "Extra", "Total"], rows: [1, 2, 3].map((t) => [String(t), `${t} × ${a}`, String(b), String(a * t + b)]) }) },
      ],
    },
    limits: "Patterns that grow by a fixed amount (rules an + b with a from 2 to 6); patterns that grow faster are other families.",
  },
  // ============================================================ figurate numbers
  {
    id: "affig",
    arity: 2,
    title: "Continuing square, triangular and other number patterns",
    competency: FIG,
    type: "integer",
    mc: true,
    // [kind, n]: FIGK[kind], the n-th term
    parse: none,
    reject: ([kind, n]) => (kind < 0 || kind >= FIGK.length || n < FIGK[kind].lo || n > FIGK[kind].hi ? "A later term of a known number pattern." : null),
    prompt: ([kind, n]) => {
      const K = FIGK[kind];
      return `The table shows the first four ${K.name}: ${[1, 2, 3, 4].map(K.t).join(", ")}. What is the ${ord(n)} number in this pattern?`;
    },
    solve: ([kind, n]) => {
      const K = FIGK[kind];
      const how = ["n × n", "n × (n + 1) ÷ 2", "n × (n + 1)", "n × n × n", "doubling n − 1 times", "2 × n − 1"][kind];
      return { steps: [st("rule", "find-pattern", FIG, [kind], how), st("term", "evaluate", FIG, [n, how], K.t(n))], answer: K.t(n) };
    },
    // independent: build the pattern term by term (adding each gap, or doubling)
    validate: ([kind, n], v) => v === figBuild(kind, n),
    bugs: ([kind, n]) => {
      const K = FIGK[kind];
      const t3 = K.t(3);
      const t4 = K.t(4);
      const out: Bug[] = [{ id: "same-gap", kind: "conceptual", competency: PAT, says: `The last gap (${t4 - t3}) was added again and again. In this pattern the gap changes each time.`, predict: t4 + (n - 4) * (t4 - t3) }];
      if (kind === 0) out.push({ id: "double-for-square", kind: "recall", competency: FIG, says: `A square number is n × n (${n} × ${n}), not n × 2.`, predict: 2 * n });
      if (kind === 1 || kind === 2) out.push({ id: "square-instead", kind: "conceptual", competency: FIG, says: kind === 1 ? `The ${ord(n)} triangular number is 1 + 2 + … + ${n}, which is half of ${n} × ${n + 1}; ${n} × ${n} is a square number.` : `This picture has ${n} rows and ${n + 1} columns, so ${n} × ${n + 1}; ${n} × ${n} would be a square.`, predict: n * n });
      if (kind === 3) out.push({ id: "times-three", kind: "recall", competency: "MATH.number.exponents", says: `A cube number is n × n × n (${n} × ${n} × ${n}), not n × 3.`, predict: 3 * n });
      if (kind === 4) out.push({ id: "times-two", kind: "conceptual", competency: "MATH.number.exponents", says: "Each number is double the one before; 2 × n adds 2 each time instead of doubling.", predict: 2 * n });
      if (kind === 5) out.push({ id: "off-by-one", kind: "procedural", competency: PAT, says: `The ${ord(n)} odd number is 2 × ${n} − 1; 2 × ${n} + 1 is the next one.`, predict: 2 * n + 1 });
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "rule" ? `The rule for the ${ord(1)}, ${ord(2)}, ${ord(3)} … number: ${s.value}` : `For n = ${s.inputs[0]}: ${s.value}`),
    domain: [[0, FIGK.length - 1], [5, 30]],
    keep: ([kind, n]) => n >= FIGK[kind].lo && n <= FIGK[kind].hi,
    difficulty: ([kind, n]) => (kind === 0 || kind === 5 ? (n <= 12 ? 1 : 2) : kind <= 2 ? 2 : 3),
    figure: ([kind]) => ({ type: "table", head: ["Term", "1st", "2nd", "3rd", "4th"], rows: [["Number", ...[1, 2, 3, 4].map((t) => String(FIGK[kind].t(t)))]] }),
    word: ([kind, n]) => `${name(n)} is making a pattern of ${FIGK[kind].things}. The first four steps use ${[1, 2, 3, 4].map(FIGK[kind].t).join(", ")}. How many will the ${ord(n)} step use?`,
    teach: {
      idea: "Square numbers come from square dot pictures (n rows of n), triangular numbers from triangles (1 + 2 + … + n), rectangular numbers from n rows of n + 1.",
      method: "Find the rule that makes each term from its position (for squares, n × n), test it on the terms you know, then use it for the term asked.",
      visual: ([kind]) => (kind === 0 ? { type: "array", rows: 4, cols: 4 } : kind === 2 ? { type: "array", rows: 4, cols: 5 } : { type: "dots", count: FIGK[kind].t(4) }),
      alternatives: [
        { id: "gaps", title: "Look at the gaps", kind: "procedural", text: ["Write the gaps between the terms: for square numbers they are 3, 5, 7, 9 … (the odd numbers); for triangular numbers 2, 3, 4, 5 ….", "Keep adding the next gap until you reach the term you need."], visual: ([kind]) => ({ type: "table", head: ["Term", "1st", "2nd", "3rd", "4th"], rows: [["Number", ...[1, 2, 3, 4].map((t) => String(FIGK[kind].t(t)))], ["Gap", "", ...[2, 3, 4].map((t) => `+${FIGK[kind].t(t) - FIGK[kind].t(t - 1)}`)]] }) },
      ],
    },
    limits: "Square, triangular, rectangular, cube, doubling and odd-number patterns up to a stated term; drawing the dot pictures is marked by an educator.",
  },
  {
    id: "affigrel",
    arity: 2,
    title: "Links between square, odd and triangular numbers",
    competency: FIG,
    type: "integer",
    mc: true,
    // [kind, n]: 0 sum of the first n odd numbers, 1 gap between n² and (n+1)², 2 T(n−1) + T(n), 3 numbers strictly between n² and (n+1)²
    parse: none,
    reject: ([kind, n]) => (kind < 0 || kind > 3 || n < 2 || n > 30 || !relOk(kind, n) ? "Relations between square, odd and triangular numbers for small n." : null),
    prompt: ([kind, n]) =>
      kind === 0
        ? `Add the first ${n} odd numbers: ${n <= 4 ? Array.from({ length: n }, (_, i) => 2 * i + 1).join(" + ") : `1 + 3 + 5 + … + ${2 * n - 1}`}. What do you get?`
        : kind === 1
          ? `How much bigger is the ${ord(n + 1)} square number (${n + 1} × ${n + 1}) than the ${ord(n)} square number (${n} × ${n})?`
          : kind === 2
            ? `Add the ${ord(n - 1)} and the ${ord(n)} triangular numbers. What number do you get?`
            : `How many whole numbers lie between ${n * n} (${n} × ${n}) and ${(n + 1) * (n + 1)} (${n + 1} × ${n + 1}), not counting these two?`,
    solve: ([kind, n]) =>
      kind === 0
        ? { steps: [st("square", "relate", FIG, [n], n * n)], answer: n * n }
        : kind === 1
          ? { steps: [st("gap", "relate", FIG, [n], 2 * n + 1)], answer: 2 * n + 1 }
          : kind === 2
            ? { steps: [st("tri", "relate", FIG, [n], n * n)], answer: n * n }
            : { steps: [st("between", "relate", FIG, [n], 2 * n)], answer: 2 * n },
    // independent: add or count one number at a time
    validate: ([kind, n], v) => {
      let w = 0;
      if (kind === 0) for (let i = 1; i <= 2 * n - 1; i += 2) w += i;
      else if (kind === 1) {
        let a = 0;
        let b = 0;
        for (let i = 0; i < n; i++) a += n;
        for (let i = 0; i <= n; i++) b += n + 1;
        w = b - a;
      } else if (kind === 2) {
        for (let i = 1; i < n; i++) w += i;
        for (let i = 1; i <= n; i++) w += i;
      } else for (let m = n * n + 1; m < (n + 1) * (n + 1); m++) w++;
      return v === w;
    },
    bugs: ([kind, n]) =>
      kind === 0
        ? [
            { id: "last-term", kind: "procedural", competency: FIG, says: "Only the last odd number was given; the question asks for the total of all of them.", predict: 2 * n - 1 },
            { id: "count-terms", kind: "procedural", competency: FIG, says: `There are ${n} odd numbers from 1 to ${2 * n - 1}, so the total is the ${ord(n)} square number.`, predict: (n + 1) * (n + 1) },
          ]
        : kind === 1
          ? [
              { id: "differ-by-one", kind: "conceptual", competency: FIG, says: `The two squares come next to each other in the list, but they are not next to each other as numbers: they differ by more than 1.`, predict: 1 },
              { id: "missed-one", kind: "procedural", competency: FIG, says: `Going from ${n} × ${n} to ${n + 1} × ${n + 1} adds a row of ${n}, a column of ${n} and one corner dot.`, predict: 2 * n },
            ]
          : kind === 2
            ? [
                { id: "doubled-one", kind: "procedural", competency: FIG, says: `The ${ord(n)} triangular number was doubled; the question adds the ${ord(n - 1)} and the ${ord(n)}.`, predict: n * (n + 1) },
                { id: "wrong-square", kind: "procedural", competency: FIG, says: `The two triangles fit together into a square of side ${n}.`, predict: (n + 1) * (n + 1) },
              ]
            : [
                { id: "counted-one-end", kind: "procedural", competency: FIG, says: `One of the two squares was counted. "Between" leaves out both ${n * n} and ${(n + 1) * (n + 1)}.`, predict: 2 * n + 1 },
                { id: "counted-both-ends", kind: "procedural", competency: FIG, says: "Both squares were counted; numbers between them do not include the ends.", predict: 2 * n + 2 },
              ],
    variants: () => [],
    explain: (s) =>
      s.id === "square"
        ? `The first ${s.inputs[0]} odd numbers make ${aNum(s.inputs[0])} × ${s.inputs[0]} square of dots: ${s.value}`
        : s.id === "gap"
          ? `From ${s.inputs[0]} × ${s.inputs[0]} to the next square add a row, a column and a corner: ${s.inputs[0]} + ${s.inputs[0]} + 1 = ${s.value}`
          : s.id === "tri"
            ? `Two neighbouring triangles fit together into ${aNum(s.inputs[0])} × ${s.inputs[0]} square: ${s.value}`
            : `The gap between the squares is 2 × ${s.inputs[0]} + 1; leaving out one end leaves ${s.value} numbers in between`,
    domain: [[0, 3], [2, 30]],
    keep: ([kind, n]) => relOk(kind, n),
    difficulty: ([kind, n]) => (kind === 0 && n <= 8 ? 1 : kind <= 1 ? 2 : 3),
    word: ([kind, n]) =>
      kind === 0
        ? `${name(n)} lays tiles in L-shaped rows: 1 tile, then 3, then 5, and so on, ${n} rows in all (the last row has ${2 * n - 1}). How many tiles is that altogether?`
        : kind === 1
          ? `A garden has ${n} rows of ${n} plants. ${name(n)} makes it one row longer and one row wider, still a square. How many new plants are needed?`
          : kind === 2
            ? `${name(n)} stacks cans in a triangle with ${n - 1} cans on the bottom row and another triangle with ${n} on the bottom row. How many cans are there in the two stacks together?`
            : `The house numbers on a street run 1, 2, 3, …. How many houses are numbered between ${n * n} and ${(n + 1) * (n + 1)} (not counting those two)?`,
    teach: {
      idea: "Dot pictures show the links: odd numbers wrap round a square to make the next square; two neighbouring triangles fit together into a square.",
      method: "Draw (or imagine) the dot picture. Going from n × n to (n + 1) × (n + 1) adds n + n + 1 dots, an odd number; so adding the odd numbers from 1 gives the square numbers.",
      visual: ([, n]) => ({ type: "array", rows: Math.min(n, 8), cols: Math.min(n, 8) }),
      alternatives: [
        { id: "small_cases", title: "Check small cases", kind: "procedural", text: ["Work the first few by hand: 1 = 1, 1 + 3 = 4, 1 + 3 + 5 = 9 ….", "Spot the pattern (here, square numbers), then use it for the case asked."], visual: () => ({ type: "table", head: ["Odd numbers added", "1", "1 + 3", "1 + 3 + 5", "1 + 3 + 5 + 7"], rows: [["Total", "1", "4", "9", "16"]] }) },
      ],
    },
    limits: "Sums of odd numbers, gaps between neighbouring squares and pairs of triangular numbers; written explanations of why the links hold are marked by an educator.",
  },
  // ============================================================ angle measure
  {
    id: "afprot",
    arity: 2,
    title: "Reading an angle from a protractor",
    competency: AM,
    type: "integer",
    mc: true,
    // [x, y]: the arms pass the marks reading 5x and 5y on the inner scale (180 − 5x and 180 − 5y on the outer scale)
    parse: none,
    reject: ([x, y]) => (x < 0 || y < 0 || x > 36 || y > 36 || Math.abs(x - y) < 3 || Math.abs(x - y) > 33 ? "Protractor readings in steps of 5°, angles from 15° to 165°." : null),
    prompt: ([x, y]) => `A protractor is placed with its centre on the corner of an angle. ${armText(x, "One arm")} ${armText(y, "The other arm")} What is the size of the angle, in degrees?`,
    solve: ([x, y]) => ({ steps: [st("scale", "choose-scale", AM, [5 * x, 5 * y], "inner"), st("measure", "subtract", AM, [Math.max(5 * x, 5 * y), Math.min(5 * x, 5 * y)], 5 * Math.abs(x - y))], answer: 5 * Math.abs(x - y) }),
    // independent: measure on the OTHER (outer) scale: the difference of the outer readings
    validate: ([x, y], v) => v === Math.abs(180 - 5 * x - (180 - 5 * y)),
    bugs: ([x, y]) => {
      const mixed = Math.abs(5 * x - (180 - 5 * y));
      if (x === 0 || y === 0 || x === 36 || y === 36) {
        return [{ id: "wrong-scale", kind: "procedural", competency: AM, says: "The number was read from the wrong scale. Start from the 0 that one arm lies on and read the same scale up to the other arm.", predict: 180 - 5 * Math.abs(x - y) }];
      }
      return [
        { id: "one-reading", kind: "conceptual", competency: AM, says: "The reading at one arm was given as the angle. Neither arm is on 0, so the angle is the difference between the two readings.", predict: [5 * y, 5 * x] },
        { id: "mixed-scales", kind: "procedural", competency: AM, says: "One reading came from the inner scale and the other from the outer scale. Use the same scale for both arms.", predict: mixed === 0 ? null : mixed },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "scale" ? `Use one scale for both arms (here the inner one): the readings are ${s.inputs[0]} and ${s.inputs[1]}` : `The angle is the difference: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}°`),
    domain: [[0, 36], [0, 36]],
    cap: 300,
    difficulty: ([x, y]) => (x === 0 || y === 0 || x === 36 || y === 36 ? 1 : Math.abs(x - y) <= 18 ? 2 : 3),
    figure: ([x, y]) => ({ type: "angle", deg: 5 * Math.abs(x - y) }),
    word: ([x, y]) => `${name(x + y)} measures how far a door is open, using a protractor on the floor at the hinge. ${armText(x, "The wall")} ${armText(y, "The door")} How many degrees is the door open?`,
    teach: {
      idea: "A protractor has two scales running in opposite directions. Both arms must be read on the same scale; the angle is how far apart the readings are.",
      method: "Put the centre on the corner. Find the scale that reads 0 on one arm (or use either scale for both arms). Read the other arm on that same scale; if neither arm is on 0, subtract the smaller reading from the larger.",
      visual: ([x, y]) => ({ type: "angle", deg: 5 * Math.abs(x - y) }),
      alternatives: [
        { id: "estimate", title: "Estimate first", kind: "conceptual", text: ["Look at the angle: is it smaller than a right angle (less than 90°) or bigger?", "If your reading says acute but the angle looks obtuse (or the other way round), you read the wrong scale."], visual: () => ({ type: "angle", deg: 90 }) },
      ],
    },
    limits: "Readings described in words in steps of 5°; measuring a drawn angle with a real protractor, and drawing angles, are marked by an educator.",
  },
  // ============================================================ angle pairs
  {
    id: "afpair",
    arity: 2,
    title: "Missing angle in a complementary or supplementary pair",
    competency: AP,
    type: "integer",
    mc: true,
    // [kind, a]: 0 complementary, 1 supplementary
    parse: (t) => {
      const m = norm2(t).match(/^(?:the )?(complement|supplement) of (\d{1,3})°?\??$/i);
      return m ? [m[1].toLowerCase() === "complement" ? 0 : 1, Number(m[2])] : null;
    },
    reject: ([kind, a]) => (kind < 0 || kind > 1 || a < 10 || a > (kind === 0 ? 80 : 170) ? "Complements of 10° to 80° and supplements of 10° to 170°." : null),
    prompt: ([kind, a]) => `Two angles are ${kind === 0 ? "complementary" : "supplementary"}. One of them is ${a}°. What is the other angle, in degrees?`,
    solve: ([kind, a]) => ({ steps: [st("total", "recall", AP, [kind], kind === 0 ? 90 : 180), st("subtract", "subtract", AP, [kind === 0 ? 90 : 180, a], (kind === 0 ? 90 : 180) - a)], answer: (kind === 0 ? 90 : 180) - a }),
    // independent: count up from the given angle to a right angle (90°) or a straight angle (180°)
    validate: ([kind, a], v) => {
      let c = 0;
      for (let t = a; t < (kind === 0 ? 90 : 180); t++) c++;
      return v === c;
    },
    bugs: ([kind, a]) => [
      { id: "wrong-total", kind: "recall", competency: AP, says: kind === 0 ? "Complementary angles make a right angle, 90°. 180° is for supplementary angles." : "Supplementary angles make a straight angle, 180°. 90° is for complementary angles.", predict: kind === 0 ? 180 - a : a < 90 ? 90 - a : null },
      { id: "full-turn", kind: "recall", competency: ANG, says: `360° is a full turn. ${kind === 0 ? "Complementary angles add up to 90°." : "Supplementary angles add up to 180°."}`, predict: 360 - a },
    ],
    variants: () => [],
    explain: (s) => (s.id === "total" ? `${s.inputs[0] === 0 ? "Complementary" : "Supplementary"} angles add up to ${s.value}°` : `${s.inputs[0]}° − ${s.inputs[1]}° = ${s.value}°`),
    domain: [[0, 1], [10, 170]],
    keep: ([kind, a]) => a <= (kind === 0 ? 80 : 170),
    cap: 220,
    difficulty: ([, a]) => (a % 10 === 0 ? 1 : a % 5 === 0 ? 2 : 3),
    figure: ([kind, a]) => ({ type: "angle", deg: a, note: kind === 0 ? "with a right angle" : "on a straight line" }),
    word: ([kind, a]) => (kind === 0 ? `A fold splits the square corner of a sheet of paper into two angles. One of them is ${a}°. What is the other, in degrees?` : `A path meets a straight road. On one side of the path the angle with the road is ${a}°. What is the angle on the other side, in degrees?`),
    teach: {
      idea: "Complementary angles together make a right angle (90°); supplementary angles together make a straight angle (180°).",
      method: "Take the given angle away from 90° (complementary) or 180° (supplementary). Check: the two angles should add up to the total.",
      visual: ([kind]) => ({ type: "angle", deg: kind === 0 ? 90 : 180 }),
      alternatives: [
        { id: "count_on", title: "Count on to the total", kind: "procedural", text: ["Start at the angle you know and count on to 90 (or 180), in tens and then ones.", "For 65° to 90°: 65 → 70 is 5, 70 → 90 is 20, so 25°."], visual: ([kind, a]) => ({ type: "numberline", from: Math.floor(a / 10) * 10, to: kind === 0 ? 90 : 180, step: 10, marks: [a, kind === 0 ? 90 : 180] }) },
      ],
    },
    limits: "Whole-degree complements and supplements of one given angle; several unknown angles at once are not included.",
  },
  {
    id: "afcross",
    arity: 2,
    title: "Angles where two straight lines cross",
    competency: AP,
    type: "integer",
    mc: true,
    // [a, rel]: one angle a; rel 0: the angle opposite, 1: the angle next to it, 2: the other three angles together
    parse: none,
    reject: ([a, rel]) => (a < 20 || a > 160 || a === 90 || rel < 0 || rel > 2 ? "Two crossing lines with one angle from 20° to 160° (not 90°)." : null),
    prompt: ([a, rel]) => `Two straight lines cross each other, making four angles. One of the angles is ${a}°. ${rel === 0 ? "What is the angle opposite it (vertically opposite)" : rel === 1 ? "What is an angle next to it (they form a straight line together)" : "What do the other three angles add up to"}, in degrees?`,
    solve: ([a, rel]) =>
      rel === 0
        ? { steps: [st("opposite", "equal", AP, [a], a)], answer: a }
        : rel === 1
          ? { steps: [st("linear", "subtract", AP, [180, a], 180 - a)], answer: 180 - a }
          : { steps: [st("linear", "subtract", AP, [180, a], 180 - a), st("all", "add", AP, [a, 180 - a, 180 - a], 360 - a)], answer: 360 - a },
    // independent: go round the crossing; the four angles are a, 180 − a, a, 180 − a (each neighbour pair makes a straight line), and check they make a full turn
    validate: ([a, rel], v) => {
      const ang = [a];
      for (let i = 1; i < 4; i++) ang.push(180 - ang[i - 1]);
      if (ang.reduce((x, y) => x + y, 0) !== 360) return false;
      return v === (rel === 0 ? ang[2] : rel === 1 ? ang[1] : ang[1] + ang[2] + ang[3]);
    },
    bugs: ([a, rel]) =>
      rel === 0
        ? [{ id: "opposite-as-linear", kind: "conceptual", competency: AP, says: "Vertically opposite angles are equal; they do not add up to 180°. Angles next to each other on a straight line add to 180°.", predict: 180 - a }, { id: "full-turn", kind: "recall", competency: ANG, says: "Opposite angles are equal; 360° is the total of all four angles.", predict: 360 - a }]
        : rel === 1
          ? [{ id: "neighbour-equal", kind: "conceptual", competency: AP, says: "Angles next to each other are not equal (unless both are 90°); together they make a straight line, 180°.", predict: a }, { id: "full-turn", kind: "recall", competency: ANG, says: "Two angles on a straight line add up to 180°, not 360°.", predict: 360 - a }]
          : [{ id: "straight-only", kind: "procedural", competency: AP, says: "Only one neighbouring angle was found. All four angles together make a full turn, 360°.", predict: 180 - a }, { id: "all-equal", kind: "conceptual", competency: AP, says: "The four angles are not all equal: only opposite angles are equal.", predict: 3 * a }],
    variants: () => [],
    explain: (s) => (s.id === "opposite" ? `Vertically opposite angles are equal: ${s.value}°` : s.id === "linear" ? `Angles on a straight line add to 180°: 180° − ${s.inputs[1]}° = ${s.value}°` : `All four angles make a full turn, 360°, so the other three make 360° − ${s.inputs[0]}° = ${s.value}°`),
    domain: [[20, 160], [0, 2]],
    keep: ([a]) => a !== 90,
    cap: 300,
    difficulty: ([a, rel]) => (rel === 0 ? 1 : rel === 1 ? (a % 10 === 0 ? 1 : 2) : 3),
    word: ([a, rel]) => `The two blades of an open pair of scissors cross like two straight lines. One of the angles between the blades is ${a}°. ${rel === 0 ? "What is the angle directly across from it" : rel === 1 ? "What is the angle beside it" : "What are the other three angles altogether"}, in degrees?`,
    teach: {
      idea: "Where two straight lines cross, angles next to each other make a straight line (180°), so opposite angles are equal; all four make a full turn (360°).",
      method: "Opposite angle: the same. Angle next to it: 180° minus it. All the others together: 360° minus it.",
      visual: ([a]) => ({ type: "angle", deg: a }),
      alternatives: [
        { id: "go_round", title: "Go round the crossing", kind: "conceptual", text: ["Start at the angle you know. The next angle round makes a straight line with it, so it is 180° minus it.", "The next one makes a straight line with that one, so it is back to the first angle: opposite angles match."], visual: ([a]) => ({ type: "angle", deg: 180 - a }) },
      ],
    },
    limits: "One pair of crossing lines described in words; figures with several lines or parallel lines are other families.",
  },
  // ============================================================ angles as turns
  {
    id: "afturn",
    arity: 3,
    title: "Turns between compass directions as fractions of a full turn",
    competency: AT,
    type: "fraction",
    mc: true,
    // [s, e, cw]: start and end directions (0 North … 7 North-West), clockwise (1) or anticlockwise (0)
    parse: none,
    reject: ([s, e, cw]) => (s < 0 || s > 7 || e < 0 || e > 7 || s === e || (cw !== 0 && cw !== 1) ? "Turns between the eight compass directions." : null),
    prompt: ([s, e, cw]) => `${name(s + e)} is facing ${DIRS[s]}. ${name(s + e)} turns ${cw ? "clockwise" : "anticlockwise"} until facing ${DIRS[e]}. What fraction of a full turn is that? (A fraction like 3/8 is fine.)`,
    solve: ([s, e, cw]) => {
      const k = cw ? (e - s + 8) % 8 : (s - e + 8) % 8;
      return { steps: [st("steps", "count", AT, [s, e, cw], k), st("fraction", "divide", FRM, [k, 8], k / 8)], answer: k / 8 };
    },
    // independent: turn one eighth at a time from the start until facing the end direction
    validate: ([s, e, cw], v) => {
      let d = s;
      let n = 0;
      while (d !== e && n < 9) {
        d = (d + (cw ? 1 : 7)) % 8;
        n++;
      }
      return typeof v === "number" && Math.abs(v * 8 - n) < 1e-9;
    },
    bugs: ([s, e, cw]) => {
      const k = cw ? (e - s + 8) % 8 : (s - e + 8) % 8;
      return [
        { id: "other-way", kind: "conceptual", competency: "MATH.geometry.maps-directions", says: `The turn was counted the other way round. ${cw ? "Clockwise is the way the hands of a clock move: North → East → South → West." : "Anticlockwise is against the hands of a clock: North → West → South → East."}`, predict: (8 - k) / 8 },
        { id: "quarters", kind: "procedural", competency: FRM, says: "Each step between neighbouring directions was counted as a quarter turn. With the in-between directions (North-East …) there are 8 steps in a full turn, so each is one eighth.", predict: k / 4 },
        { id: "steps-not-fraction", kind: "procedural", competency: FRM, says: "The number of steps was given. A full turn has 8 steps, so write it as a fraction of 8.", predict: k },
      ];
    },
    distractors: ([s, e, cw]) => {
      const k = cw ? (e - s + 8) % 8 : (s - e + 8) % 8;
      return [(k % 8) / 8 + 1 / 8, Math.abs(k - 1) / 8 || 3 / 8];
    },
    variants: () => [],
    explain: (s) => (s.id === "steps" ? `Count the steps ${s.inputs[2] ? "clockwise" : "anticlockwise"} from ${DIRS[Number(s.inputs[0])]} to ${DIRS[Number(s.inputs[1])]}: ${s.value} eighths` : `${s.inputs[0]} out of 8 steps = ${fmt(Number(s.value))} of a full turn`),
    domain: [[0, 7], [0, 7], [0, 1]],
    keep: ([s, e]) => s !== e,
    difficulty: ([s, e, cw]) => {
      const k = cw ? (e - s + 8) % 8 : (s - e + 8) % 8;
      return s % 2 === 0 && e % 2 === 0 ? 1 : k <= 4 ? 2 : 3;
    },
    figure: ([s]) => compass(s),
    word: ([s, e, cw]) => `A weathervane on a temple roof points ${DIRS[s]}. The wind turns it ${cw ? "clockwise" : "anticlockwise"} until it points ${DIRS[e]}. What fraction of a full turn did it make?`,
    teach: {
      idea: "A full turn brings you back to where you started. The four main directions split it into quarters; with the in-between directions (North-East and so on) it is split into eighths.",
      method: "Count the steps from the starting direction to the final one, going the way of the turn (clockwise is the way clock hands move). Each step is 1/8 of a turn; two steps make a quarter.",
      visual: () => ({ type: "angle", deg: 90 }),
      alternatives: [
        { id: "clock_face", title: "Use a clock face", kind: "conceptual", text: ["Imagine North at 12, East at 3, South at 6, West at 9.", "North to East clockwise is like the minute hand going from 12 to 3: a quarter turn."], visual: () => ({ type: "clock", h: 3, m: 0 }) },
      ],
    },
    limits: "Turns between the eight compass directions, less than one full turn; naming the direction faced after a turn is asked as a fraction of a turn instead.",
  },
  {
    id: "afclock",
    arity: 2,
    title: "Degrees turned by the minute hand",
    competency: AT,
    type: "integer",
    mc: true,
    // [from, k]: the minute hand points at the number `from` and turns clockwise past k numbers
    parse: none,
    reject: ([from, k]) => (from < 1 || from > 12 || k < 1 || k > 11 ? "The minute hand turning past 1 to 11 numbers." : null),
    prompt: ([from, k]) => `The minute hand of the clock in the picture points to ${from}. It turns clockwise until it points to ${((from + k - 1) % 12) + 1}. Through how many degrees has it turned?`,
    solve: ([, k]) => ({ steps: [st("each", "divide", AT, [360, 12], 30), st("turn", "multiply", AT, [k, 30], 30 * k)], answer: 30 * k }),
    // independent: step the hand number by number round the face, adding a twelfth of a full turn each time
    validate: ([from, k], v) => {
      let pos = from;
      let deg = 0;
      const to = ((from + k - 1) % 12) + 1;
      while (pos !== to) {
        pos = (pos % 12) + 1;
        deg += 360 / 12;
      }
      return v === deg;
    },
    bugs: ([, k]) => [
      { id: "six-per-number", kind: "procedural", competency: AT, says: "Each number was counted as 6°. 6° is one minute mark; from one number to the next is 5 minutes, which is 30°.", predict: 6 * k },
      { id: "minutes-not-degrees", kind: "conceptual", competency: AT, says: "The minutes that passed were given, not the angle. A full turn of 60 minutes is 360°.", predict: 5 * k },
      { id: "other-way", kind: "procedural", competency: AT, says: "The angle the other way round the clock was found. The hand turned clockwise, so count the numbers it passes going clockwise.", predict: 360 - 30 * k },
    ],
    variants: () => [],
    explain: (s) => (s.id === "each" ? `12 numbers share a full turn: 360° ÷ 12 = 30° from one number to the next` : `${s.inputs[0]} numbers × 30° = ${s.value}°`),
    domain: [[1, 12], [1, 11]],
    difficulty: ([, k]) => (k % 3 === 0 ? 1 : k % 2 === 0 ? 2 : 3),
    figure: ([from]) => ({ type: "clock", h: ((from + 5) % 12) + 1, m: (from % 12) * 5 }),
    word: ([from, k]) => `${name(from)}'s tuition class starts when the minute hand points to ${from} and ends when it points to ${((from + k - 1) % 12) + 1}, less than an hour later. Through how many degrees did the minute hand turn during the class?`,
    teach: {
      idea: "The minute hand makes a full turn (360°) in an hour, passing 12 numbers, so it turns 30° from one number to the next.",
      method: "Count how many numbers the hand moves past (clockwise), then multiply by 30°. A quarter turn (3 numbers) is 90°; a half turn (6 numbers) is 180°.",
      visual: ([, k]) => ({ type: "angle", deg: 30 * k }),
      alternatives: [
        { id: "fractions", title: "Fractions of a turn", kind: "conceptual", text: ["Moving 3 numbers is a quarter turn (90°), 6 numbers a half turn (180°), 9 numbers three-quarters (270°).", "For other moves, start from the nearest quarter and add or take away 30° for each number."], visual: () => ({ type: "clock", h: 12, m: 15 }) },
      ],
    },
    limits: "The minute hand moving clockwise between the numbers, less than a full turn; the hour hand's angle is not included.",
  },
  // ============================================================ fractals
  {
    id: "affrac",
    arity: 4,
    title: "Counting the pieces at a stage of a repeating pattern",
    competency: FR,
    type: "integer",
    mc: true,
    // [a, k, n, ctx]: a pieces at stage 0, each replaced by k smaller pieces at every stage; stage n; ctx 0 shapes, 1 a branching tree
    parse: none,
    reject: ([a, k, n, ctx]) => (a < 1 || a > 4 || k < 2 || k > 8 || n < 2 || n > 6 || (ctx !== 0 && ctx !== 1) || a * k ** n > 1000 ? "a × kⁿ pieces, at most 1000." : null),
    prompt: ([a, k, n, ctx]) => fracText(a, k, n, ctx),
    solve: ([a, k, n]) => {
      const steps: Step[] = [];
      let v = a;
      for (let i = 1; i <= n; i++) {
        steps.push(st(`stage${i}`, "multiply", FR, [v, k], v * k));
        v *= k;
      }
      return { steps, answer: v };
    },
    // independent: replace the pieces one by one, stage by stage, and count
    validate: ([a, k, n], v) => {
      let pieces = a;
      for (let s = 0; s < n; s++) {
        let next = 0;
        for (let p = 0; p < pieces; p++) for (let q = 0; q < k; q++) next++;
        pieces = next;
      }
      return v === pieces;
    },
    bugs: ([a, k, n]) => [
      { id: "same-increase", kind: "conceptual", competency: FR, says: `The pattern was taken to grow by the same number each stage (${a * k - a}). Every piece is replaced, so the number is multiplied by ${k} each stage.`, predict: a + n * (a * k - a) },
      { id: "times-stage", kind: "conceptual", competency: "MATH.number.exponents", says: `${a} × ${k} × ${n} multiplies by ${k} only once. Multiply by ${k} once for every stage: ${n} times.`, predict: a * k * n },
      { id: "stage-off-by-one", kind: "procedural", competency: FR, says: `Stage 0 is the start, so stage ${n} has had ${n} replacements; one stage too few was counted.`, predict: a * k ** (n - 1) },
    ],
    variants: () => [],
    explain: (s) => `${s.id.replace("stage", "Stage ")}: ${s.inputs[0]} pieces, each replaced by ${s.inputs[1]}: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`,
    domain: [[1, 4], [2, 8], [2, 6], [0, 1]],
    keep: ([a, k, n]) => a * k ** n <= 1000,
    difficulty: ([a, k, n]) => (a * k ** n <= 50 ? 1 : a * k ** n <= 300 ? 2 : 3),
    figure: ([a, k, , ctx]) => ({ type: "table", head: ["Stage", "0", "1"], rows: [[ctx === 1 ? "Tips" : "Pieces", String(a), String(a * k)]] }),
    word: ([a, k, n]) => `${name(a + k)} has ${a} sheet${a > 1 ? "s" : ""} of paper. In each round, ${name(a + k)} cuts every piece into ${k} smaller pieces. How many pieces are there after ${n} rounds?`,
    teach: {
      idea: "In a fractal pattern the same rule is used again and again on every piece, so the number of pieces is multiplied by the same number at every stage.",
      method: "Start with the pieces at stage 0 and multiply by the number of new pieces each piece becomes, once for every stage. A table of stages helps you keep count.",
      alternatives: [
        { id: "stage_table", title: "A table of stages", kind: "procedural", text: ["Write the stages 0, 1, 2, … in a row.", "Under each stage write the number of pieces: each is the one before times the number of new pieces per piece."], visual: ([a, k, n]) => ({ type: "table", head: ["Stage", ...Array.from({ length: n + 1 }, (_, i) => String(i))], rows: [["Pieces", ...Array.from({ length: n + 1 }, (_, i) => (i === n ? "?" : String(a * k ** i)))]] }) },
      ],
    },
    limits: "Counting pieces when every piece is replaced by k pieces (up to 1000 pieces); perimeters and areas of fractals, and drawing the stages, are not included.",
  },
  // ============================================================ solids (nets)
  {
    id: "afsolid",
    arity: 4,
    title: "Faces, edges and vertices of prisms and pyramids",
    competency: NETS,
    type: "integer",
    mc: true,
    // [solid, n, ask, mode]: prism (0) or pyramid (1) on an n-sided base; ask 0 faces, 1 edges, 2 vertices; mode 1: from the other two counts with Euler's rule
    parse: none,
    reject: ([solid, n, ask, mode]) => (solid < 0 || solid > 1 || n < 3 || n > 10 || ask < 0 || ask > 2 || mode < 0 || mode > 1 ? "Prisms and pyramids on bases of 3 to 10 sides." : null),
    prompt: ([solid, n, ask, mode]) => {
      const [F, E, V] = fevOf(solid, n);
      if (mode === 0) return `How many ${FEV[ask]} does ${an(BASES[n])} ${solid ? "pyramid" : "prism"} have?${n === 4 ? " (Look at the picture.)" : ""}`;
      const given = ask === 0 ? `${V} vertices and ${E} edges` : ask === 1 ? `${F} faces and ${V} vertices` : `${F} faces and ${E} edges`;
      return `A solid with flat faces has ${given}. Using Euler's rule (faces + vertices − edges = 2), how many ${FEV[ask].split(" ")[0]} does it have?`;
    },
    solve: ([solid, n, ask, mode]) => {
      const [F, E, V] = fevOf(solid, n);
      const ans = [F, E, V][ask];
      if (mode === 0) return { steps: [st("count", "count", NETS, [solid, n, ask], ans)], answer: ans };
      return { steps: [st("euler", "rearrange", NETS, [ask, F, E, V], ans)], answer: ans };
    },
    // independent: build the solid from its corners and edges and count them
    validate: ([solid, n, ask], v) => v === buildSolid(solid, n)[ask],
    bugs: ([solid, n, ask, mode]) => {
      const [F, E, V] = fevOf(solid, n);
      if (mode === 1) {
        if (ask === 1) return [{ id: "euler-sign", kind: "procedural", competency: NETS, says: "Faces + vertices − edges = 2, so edges = faces + vertices − 2 (take 2 away, not add it).", predict: F + V + 2 }, { id: "euler-forgot-2", kind: "recall", competency: NETS, says: "The 2 in Euler's rule was left out.", predict: F + V }];
        if (ask === 0) return [{ id: "euler-sign", kind: "procedural", competency: NETS, says: "Faces = 2 + edges − vertices; the 2 was taken away instead of added.", predict: E - V - 2 }, { id: "euler-forgot-2", kind: "recall", competency: NETS, says: "The 2 in Euler's rule was left out.", predict: E - V }];
        return [{ id: "euler-sign", kind: "procedural", competency: NETS, says: "Vertices = 2 + edges − faces; the 2 was taken away instead of added.", predict: E - F - 2 }, { id: "euler-forgot-2", kind: "recall", competency: NETS, says: "The 2 in Euler's rule was left out.", predict: E - F }];
      }
      if (solid === 0)
        return ask === 0
          ? [{ id: "forgot-ends", kind: "conceptual", competency: NETS, says: `Only the ${n} side faces were counted. A prism also has two ends (the top and the bottom ${POLY[n]}).`, predict: n }, { id: "one-end", kind: "procedural", competency: NETS, says: "Only one end was counted; a prism has two.", predict: n + 1 }]
          : ask === 1
            ? [{ id: "forgot-side-edges", kind: "procedural", competency: NETS, says: `The edges round the top and bottom (${n} + ${n}) were counted, but not the ${n} edges joining them.`, predict: 2 * n }, { id: "one-end-edges", kind: "procedural", competency: NETS, says: "The edges of only one end were counted.", predict: n }]
            : [{ id: "one-end-vertices", kind: "procedural", competency: NETS, says: `Only the corners of one end were counted. The other end has ${n} more.`, predict: n }];
      return ask === 0
        ? [{ id: "forgot-base", kind: "conceptual", competency: NETS, says: `Only the ${n} triangles were counted; the base (${POLY[n]}) is a face too.`, predict: n }]
        : ask === 1
          ? [{ id: "base-only", kind: "procedural", competency: NETS, says: `Only the ${n} edges of the base were counted. There are also ${n} edges going up to the top point.`, predict: n }, { id: "extra-edge", kind: "procedural", competency: NETS, says: "An edge was counted twice: count the base edges, then the edges to the top point.", predict: 2 * n + 1 }]
          : [{ id: "forgot-apex", kind: "procedural", competency: NETS, says: "The top point (apex) is a vertex too.", predict: n }];
    },
    variants: () => [],
    explain: (s) => (s.id === "count" ? `Count base, top and sides: ${s.value}` : `Rearrange faces + vertices − edges = 2 for the missing count: ${s.value}`),
    domain: [[0, 1], [3, 10], [0, 2], [0, 1]],
    difficulty: ([, n, , mode]) => (mode === 1 ? 3 : n <= 4 ? 1 : 2),
    figure: ([solid, n, , mode]) => (mode === 1 ? null : n === 4 ? { type: "solid", name: solid ? "pyramid" : "cuboid" } : { type: "shape", sides: n, name: `${POLY[n]} base of the ${solid ? "pyramid" : "prism"}` }),
    word: ([solid, n, ask, mode]) => {
      const [F, E, V] = fevOf(solid, n);
      if (mode === 1) {
        const given = ask === 0 ? `${V} corners and ${E} edges` : ask === 1 ? `${F} flat faces and ${V} corners` : `${F} flat faces and ${E} edges`;
        return `${name(n)} counts a crystal with ${given}. Faces + corners − edges = 2 for every such solid. How many ${["faces", "edges", "corners"][ask]} does the crystal have?`;
      }
      return solid === 0 ? `A chocolate box is shaped like ${an(BASES[n])} prism. How many ${FEV[ask]} does the box have?` : `A tent is shaped like ${an(BASES[n])} pyramid (with a floor). How many ${FEV[ask]} does the tent have?`;
    },
    teach: {
      idea: "A prism has two equal ends joined by rectangles; a pyramid has one base joined to a top point by triangles. Counting part by part makes the counts easy.",
      method: "Prism on an n-sided base: faces n + 2, edges 3n, vertices 2n. Pyramid: faces n + 1, edges 2n, vertices n + 1. Check with Euler's rule: faces + vertices − edges = 2.",
      alternatives: [
        { id: "part_by_part", title: "Count part by part", kind: "procedural", text: ["Count the base, then the top (or the top point), then what joins them.", "For edges: round the bottom, round the top, then the ones going up."], visual: ([solid]) => ({ type: "solid", name: solid ? "pyramid" : "cuboid" }) },
        { id: "net", title: "Unfold it into a net", kind: "conceptual", text: ["Imagine cutting the solid open and laying it flat: each face becomes one shape of the net.", "Count the shapes in the net to get the faces."] },
      ],
    },
    limits: "Right prisms and pyramids on bases of 3 to 10 sides; matching a net to its solid from a picture is not included (no net pictures yet).",
  },
  {
    id: "afpaint",
    arity: 4,
    title: "Painted faces in a block of small cubes",
    competency: NETS,
    type: "integer",
    mc: true,
    // [a, b, c, ask]: an a × b × c block (a ≤ b ≤ c) painted outside; ask 1 exactly two faces, 2 exactly one face, 3 no paint
    parse: none,
    reject: ([a, b, c, ask]) => (a < 2 || c > 6 || a > b || b > c || ask < 1 || ask > 3 ? "Blocks up to 6 × 6 × 6 cubes." : null),
    prompt: ([a, b, c, ask]) => `A ${a} × ${b} × ${c} block is built from small cubes, as in the picture. The whole outside of the block is painted. How many small cubes have ${ask === 1 ? "paint on exactly two faces" : ask === 2 ? "paint on exactly one face" : "no paint at all"}?`,
    solve: ([a, b, c, ask]) => {
      const [x, y, z] = [a - 2, b - 2, c - 2];
      const v = paintCount(a, b, c, ask);
      return { steps: [st("inner", "subtract", NETS, [a, b, c], `${x}, ${y}, ${z}`), st("count", ask === 1 ? "edges" : ask === 2 ? "faces" : "inside", NETS, [x, y, z, ask], v)], answer: v };
    },
    // independent: go through every small cube and count its painted faces
    validate: ([a, b, c, ask], v) => {
      let n = 0;
      for (let i = 0; i < a; i++)
        for (let j = 0; j < b; j++)
          for (let k = 0; k < c; k++) {
            const f = (i === 0 || i === a - 1 ? 1 : 0) + (j === 0 || j === b - 1 ? 1 : 0) + (k === 0 || k === c - 1 ? 1 : 0);
            if (f === [0, 2, 1, 0][ask]) n++;
          }
      return v === n;
    },
    bugs: ([a, b, c, ask]) =>
      ask === 1
        ? [{ id: "kept-corners", kind: "procedural", competency: NETS, says: "The corner cubes were counted along each edge; corner cubes have paint on three faces, so leave them out (2 from each edge).", predict: 4 * (a + b + c) }]
        : ask === 2
          ? [{ id: "whole-faces", kind: "procedural", competency: NETS, says: "Every cube on a face was counted. Cubes on the edges of a face have paint on two or three faces; only the middle part of each face counts.", predict: 2 * (a * b + b * c + a * c) }]
          : [{ id: "one-layer", kind: "procedural", competency: NETS, says: "Only one layer was taken off each length. The paint is on both sides, so take 2 from each length.", predict: (a - 1) * (b - 1) * (c - 1) }, { id: "outside-cubes", kind: "conceptual", competency: NETS, says: "The question asks for the cubes with no paint: the hidden ones inside, not the ones on the outside.", predict: a * b * c - (a - 2) * (b - 2) * (c - 2) }],
    variants: () => [],
    explain: (s) => (s.id === "inner" ? `Leave out the outside layer on both sides: the inside lengths are ${s.value}` : s.inputs[3] === 1 ? `Each of the 12 edges has its middle cubes: 4 × (${s.inputs[0]} + ${s.inputs[1]} + ${s.inputs[2]}) = ${s.value}` : s.inputs[3] === 2 ? `The middle of each of the 6 faces: 2 × (${s.inputs[0]} × ${s.inputs[1]} + ${s.inputs[1]} × ${s.inputs[2]} + ${s.inputs[0]} × ${s.inputs[2]}) = ${s.value}` : `The hidden block inside: ${s.inputs[0]} × ${s.inputs[1]} × ${s.inputs[2]} = ${s.value}`),
    domain: [[2, 6], [2, 6], [2, 6], [1, 3]],
    keep: ([a, b, c, ask]) => a <= b && b <= c && paintCount(a, b, c, ask) > 0,
    difficulty: ([a, b, c, ask]) => (a === b && b === c ? (ask === 3 ? 1 : 2) : ask === 2 ? 3 : 2),
    figure: ([a, b, c]) => (a === b && b === c ? { type: "solid", name: "cube", dims: [`${a} cubes on each edge`] } : { type: "solid", name: "cuboid", dims: [`${c} cubes long`, `${b} cubes wide`, `${a} cubes high`] }),
    word: ([a, b, c, ask]) => `${name(a + b + c)} glues small wooden cubes into ${aNum(a)} by ${b} by ${c} block and dips the whole block in paint. When the paint dries, the block is taken apart. How many small cubes have ${ask === 1 ? "exactly two painted faces" : ask === 2 ? "exactly one painted face" : "no paint on them"}?`,
    teach: {
      idea: "Where a small cube sits decides its paint: corners get three faces, the rest of each edge two, the middle of each face one, and the hidden inside none.",
      method: "Take 2 off each length (the two outer layers). Edges: 4 × (sum of the shortened lengths). Faces: 2 × (sum of the products of pairs). Inside: the product of all three.",
      alternatives: [
        { id: "layer_by_layer", title: "Look layer by layer", kind: "conceptual", text: ["Look at the top layer: count its corner, edge and middle cubes.", "Then a middle layer: its outside ring has paint, its centre does not. Add up the layers."], visual: ([a, b]) => ({ type: "grid", rows: a, cols: b }) },
      ],
    },
    limits: "Blocks up to 6 cubes along each edge, painted on every outside face; blocks painted on only some faces are not included.",
  },
  // ============================================================ quadrilaterals
  {
    id: "afquad",
    arity: 2,
    title: "Classifying quadrilaterals from their sides and angles",
    competency: QC,
    type: "integer",
    mc: true,
    // [ask, seed]: ask 0 rectangles, 1 rhombuses, 2 parallelograms; five shapes from the seed
    parse: none,
    reject: ([ask, seed]) => (ask < 0 || ask > 2 || seed < 0 || seed > 59 ? "Five quadrilaterals described by sides and angles." : null),
    prompt: ([ask]) => `The table describes five quadrilaterals, A to E. The sides and the angles are listed in order going round each shape. How many of the five are ${QASK[ask]}?`,
    solve: ([ask, seed]) => {
      const qs = quads(seed);
      const has = (k: number) => qs.filter((q) => q.kind === k).length;
      const v = ask === 0 ? has(0) + has(1) : ask === 1 ? has(0) + has(2) : has(0) + has(1) + has(2) + has(3);
      return { steps: [st("sort", "classify", QC, qs.map((q) => q.kind), qs.map((q) => ["square", "rectangle", "rhombus", "parallelogram", "trapezium"][q.kind]).join(", ")), st("count", "count", QC, [ask], v)], answer: v };
    },
    // independent: test each shape's properties directly from its listed sides and angles
    validate: ([ask, seed], v) => {
      let n = 0;
      for (const q of quads(seed)) {
        const [s, a] = [q.sides, q.angles];
        const para = s[0] === s[2] && s[1] === s[3] && a[0] === a[2] && a[1] === a[3];
        const allRight = a.every((x) => x === 90);
        const allEqual = s.every((x) => x === s[0]);
        if (ask === 0 ? para && allRight : ask === 1 ? para && allEqual : para) n++;
      }
      return v === n;
    },
    bugs: ([ask, seed]) => {
      const qs = quads(seed);
      const has = (k: number) => qs.filter((q) => q.kind === k).length;
      return ask === 0
        ? [{ id: "square-not-rectangle", kind: "conceptual", competency: QC, says: "The squares were left out. A square has four right angles and opposite sides equal, so every square is also a rectangle.", predict: has(1) }, { id: "opposite-sides-only", kind: "conceptual", competency: QC, says: "Shapes with opposite sides equal were counted even without right angles. A rectangle needs all four angles to be 90°.", predict: has(0) + has(1) + has(2) + has(3) }]
        : ask === 1
          ? [{ id: "square-not-rhombus", kind: "conceptual", competency: QC, says: "The squares were left out. A rhombus has four equal sides, so every square is also a rhombus.", predict: has(2) }, { id: "rhombus-needs-right-angles", kind: "conceptual", competency: QC, says: "Only the squares were counted. A rhombus needs four equal sides; its angles do not have to be 90°.", predict: has(0) }]
          : [{ id: "only-slanted", kind: "conceptual", competency: QC, says: "Only the slanted shapes with unequal sides were counted. Squares, rectangles and rhombuses also have opposite sides equal and parallel, so they are parallelograms too.", predict: has(3) }, { id: "right-angles-excluded", kind: "conceptual", competency: QC, says: "Shapes with right angles were left out; rectangles and squares are parallelograms as well.", predict: has(2) + has(3) }, { id: "trapezium-included", kind: "conceptual", competency: QC, says: "A trapezium was counted. Its opposite sides are not equal and only one pair is parallel, so it is not a parallelogram.", predict: 5 }];
    },
    variants: () => [],
    explain: (s) => (s.id === "sort" ? `Name each shape by its sides and angles: ${s.value}` : `Count every shape that fits (including the special ones): ${s.value}`),
    domain: [[0, 2], [0, 59]],
    difficulty: ([ask]) => (ask === 0 ? 1 : ask === 1 ? 2 : 3),
    figure: ([, seed]) => ({ type: "table", head: ["Shape", "Sides (in order)", "Angles (in order)"], rows: quadRows(quads(seed)) }),
    word: ([ask, seed]) => `${name(seed)} is sorting five floor tiles, A to E, described in the table. How many of the tiles are ${QASK[ask]}?`,
    teach: {
      idea: "Shape names describe properties, so one shape can have several names: a square is a rectangle (four right angles), a rhombus (four equal sides) and a parallelogram (opposite sides equal and parallel).",
      method: "For each shape, check the property the name needs. Rectangle: all angles 90°. Rhombus: all sides equal. Parallelogram: opposite sides equal and opposite angles equal. Count every shape that has it.",
      alternatives: [
        { id: "family_tree", title: "A family tree of shapes", kind: "conceptual", text: ["Parallelograms are a big family. Rectangles and rhombuses are inside it, and squares are inside both rectangles and rhombuses.", "When you count a family, count everyone inside it too."], visual: () => ({ type: "table", head: ["Shape", "Parallelogram?", "Rectangle?", "Rhombus?"], rows: [["Square", "yes", "yes", "yes"], ["Rectangle", "yes", "yes", "no"], ["Rhombus", "yes", "no", "yes"], ["Parallelogram", "yes", "no", "no"], ["Trapezium", "no", "no", "no"]] }) },
      ],
    },
    limits: "Squares, rectangles, rhombuses, parallelograms and isosceles trapeziums described by side lengths and angles; kites, and justifying properties, are not included.",
  },
  {
    id: "afpara",
    arity: 3,
    title: "Unknown angles in a parallelogram or rhombus",
    competency: QC,
    type: "integer",
    mc: true,
    // [shape, a, ask]: parallelogram (0) or rhombus (1) with angle A = a; ask 0 opposite angle C, 1 next angle B, 2 (rhombus) angle between diagonal AC and side AB
    parse: none,
    reject: ([shape, a, ask]) => (shape < 0 || shape > 1 || a < 30 || a > 150 || a === 90 || a % 5 !== 0 || ask < 0 || ask > 2 || (ask === 2 && (shape !== 1 || a % 2 !== 0)) ? "Angles of 30° to 150° in steps of 5° (not 90°)." : null),
    prompt: ([shape, a, ask]) =>
      ask === 2
        ? `In rhombus ABCD, angle A is ${a}°. The diagonal AC is drawn. What is the angle between the diagonal AC and the side AB, in degrees?`
        : `In ${shape ? "rhombus" : "parallelogram"} ABCD, angle A is ${a}°. What is angle ${ask === 0 ? "C (opposite A)" : "B (next to A)"}, in degrees?`,
    solve: ([, a, ask]) =>
      ask === 0
        ? { steps: [st("opposite", "equal", QC, [a], a)], answer: a }
        : ask === 1
          ? { steps: [st("adjacent", "subtract", QC, [180, a], 180 - a)], answer: 180 - a }
          : { steps: [st("bisect", "divide", QC, [a, 2], a / 2)], answer: a / 2 },
    // independent: search for the angle that makes the four angles (A, B, A, B) add to 360°; for the diagonal, use the isosceles triangle ABC
    validate: ([, a, ask], v) => {
      let b = 0;
      for (let x = 1; x < 180; x++) if (a + x + a + x === 360) b = x;
      if (ask === 0) return v === 360 - 2 * b - a;
      if (ask === 1) return v === b;
      return v === (180 - b) / 2;
    },
    bugs: ([, a, ask]) =>
      ask === 0
        ? [{ id: "opposite-as-adjacent", kind: "conceptual", competency: QC, says: "Opposite angles of a parallelogram are equal; it is angles next to each other that add to 180°.", predict: 180 - a }]
        : ask === 1
          ? [{ id: "all-equal", kind: "conceptual", competency: QC, says: "Only opposite angles are equal. Angles next to each other add up to 180°.", predict: a }, { id: "full-turn", kind: "recall", competency: QC, says: "Neighbouring angles add to 180°; 360° is all four angles together.", predict: 360 - a }]
          : [{ id: "no-split", kind: "conceptual", competency: QC, says: "The diagonal of a rhombus cuts angle A into two equal halves; the whole angle was given.", predict: a }, { id: "wrong-angle-halved", kind: "procedural", competency: QC, says: "Angle B was halved instead of angle A. The diagonal AC starts at A, so it splits angle A.", predict: intOrNull((180 - a) / 2) }],
    variants: () => [],
    explain: (s) => (s.id === "opposite" ? `Opposite angles of a parallelogram are equal: ${s.value}°` : s.id === "adjacent" ? `Angles next to each other add to 180°: 180° − ${s.inputs[1]}° = ${s.value}°` : `In a rhombus a diagonal splits the angle in half: ${s.inputs[0]}° ÷ 2 = ${s.value}°`),
    domain: [[0, 1], [30, 150], [0, 2]],
    keep: ([shape, a, ask]) => a !== 90 && a % 5 === 0 && (ask !== 2 || (shape === 1 && a % 2 === 0)),
    difficulty: ([, , ask]) => (ask === 0 ? 1 : ask === 1 ? 2 : 3),
    word: ([shape, a, ask]) =>
      ask === 2
        ? `A kite-maker's frame is a rhombus with one angle of ${a}°. A straight stick runs from that corner to the opposite corner. What angle does the stick make with each side at that corner, in degrees?`
        : `A ${shape ? "rhombus-shaped tile" : "parallelogram-shaped window"} has one corner of ${a}°. What is the angle at the corner ${ask === 0 ? "directly opposite it" : "next to it"}, in degrees?`,
    teach: {
      idea: "In a parallelogram (and so in a rhombus) opposite angles are equal, and angles next to each other add up to 180°. In a rhombus each diagonal also cuts its angles in half.",
      method: "Opposite angle: the same. Neighbouring angle: 180° minus it. Rhombus diagonal: half the angle it starts from.",
      visual: ([, a]) => ({ type: "angle", deg: a }),
      alternatives: [
        { id: "parallel_lines", title: "Think of parallel lines", kind: "conceptual", text: ["Two sides of a parallelogram are parallel; a third side crosses them.", "The two angles between the parallel sides on the same side of that crossing line add to 180°."], visual: ([, a]) => ({ type: "angle", deg: 180 - a }) },
      ],
    },
    limits: "One given angle of a parallelogram or rhombus (in steps of 5°); sides, and proofs of the properties, are not included.",
  },
  // ============================================================ rotational symmetry
  {
    id: "afrot",
    arity: 3,
    title: "Order and angle of rotational symmetry",
    competency: RS,
    type: "fraction",
    mc: true,
    // [shape, ask, m]: ROT[shape]; ask 0 order, 1 smallest angle (degrees), 2 smallest turn as a fraction, 3 the m-th angle
    parse: none,
    reject: ([shape, ask, m]) => (shape < 0 || shape >= ROT.length || ask < 0 || ask > 3 || m < 1 || m > 11 || (ask < 3 && m !== 1) || (ask === 3 && (m < 2 || m >= ROT[shape].o)) ? "Shapes with rotational symmetry of order 2 to 12." : null),
    prompt: ([shape, ask, m]) => {
      const S = ROT[shape];
      const pic = S.poly ? " (as in the picture)" : "";
      return ask === 0
        ? `What is the order of rotational symmetry of ${S.n}${pic}? (How many times does it look exactly the same during one full turn?)`
        : ask === 1
          ? `${S.n[0].toUpperCase()}${S.n.slice(1)}${pic} is turned about its centre. What is the smallest angle, in degrees, after which it looks exactly the same?`
          : ask === 2
            ? `${S.n[0].toUpperCase()}${S.n.slice(1)}${pic} is turned about its centre. What is the smallest fraction of a full turn after which it looks exactly the same?`
            : `${S.n[0].toUpperCase()}${S.n.slice(1)}${pic} is turned about its centre. It looks exactly the same several times during a full turn. At what angle, in degrees, does it look the same for the ${ord(m)} time?`;
    },
    solve: ([shape, ask, m]) => {
      const o = ROT[shape].o;
      const ans = ask === 0 ? o : ask === 1 ? 360 / o : ask === 2 ? 1 / o : (360 / o) * m;
      return { steps: [st("order", "count", RS, [shape], o), ...(ask >= 1 ? [st(ask === 2 ? "fraction" : "angle", "divide", RS, [ask === 2 ? 1 : 360, o, m], ask === 3 ? (360 / o) * m : ask === 1 ? 360 / o : fmt(1 / o))] : [])], answer: ans };
    },
    // independent: try every whole-degree turn from 1° to 360° and keep those that bring the design back onto itself
    validate: ([shape, ask, m], v) => {
      if (typeof v !== "number") return false;
      const t = rotTurns(ROT[shape].o);
      const want = ask === 0 ? t.length : ask === 1 ? t[0] : ask === 2 ? t[0] / 360 : t[m - 1];
      return Math.abs(v - want) < 1e-9;
    },
    bugs: ([shape, ask, m]) => {
      const S = ROT[shape];
      const o = S.o;
      if (ask === 0)
        return [
          ...(S.poly ? [{ id: "missed-full-turn", kind: "procedural", competency: RS, says: "The last position, back at the start after a full turn, was not counted. Count every time it looks the same, including the full turn.", predict: o - 1 } as Bug] : []),
          ...(S.quad ? [{ id: "counted-corners", kind: "conceptual", competency: RS, says: "The corners were counted. Turn the shape: it only fits onto itself after a half turn and a full turn.", predict: 4 } as Bug] : []),
          ...(S.letter ? [{ id: "mirror-only", kind: "conceptual", competency: "MATH.geometry.symmetry-lines", says: "It has no mirror line, but it still looks the same after a half turn. Rotational symmetry is about turning, not folding.", predict: 1 } as Bug] : []),
          { id: "doubled", kind: "procedural", competency: RS, says: "Each matching position was counted twice (once for each direction of turning). Turn one way only.", predict: 2 * o },
        ];
      if (ask === 1) return [{ id: "half-turn-shared", kind: "conceptual", competency: RS, says: "180° was shared out instead of a full turn, 360°.", predict: 180 / o }, { id: "gave-order", kind: "procedural", competency: RS, says: "The order (how many times) was given instead of the angle. Share 360° by the order.", predict: o }];
      if (ask === 2) return [{ id: "upside-down", kind: "procedural", competency: RS, says: `The fraction was written the wrong way up. The turn is 1 out of ${o} equal parts of a full turn: 1/${o}.`, predict: o }, { id: "angle-not-fraction", kind: "procedural", competency: RS, says: "The angle in degrees was given. As a fraction of a full turn, divide by 360.", predict: 360 / o }];
      return [{ id: "counted-start", kind: "procedural", competency: RS, says: "The starting position was counted as the first time. The first time it looks the same is after the smallest turn.", predict: (360 / o) * (m + 1) <= 360 ? (360 / o) * (m + 1) : null }, { id: "first-angle", kind: "procedural", competency: RS, says: `Only the smallest angle was given; the ${ord(m)} time is ${m} of those turns.`, predict: 360 / o }];
    },
    distractors: ([shape, ask]) => {
      const o = ROT[shape].o;
      return ask === 2 ? [1 / (o + 1), 2 / o === 1 ? 1 / 4 : 2 / o] : [];
    },
    variants: () => [],
    explain: (s) => (s.id === "order" ? `It looks the same ${s.value} times in a full turn` : s.id === "fraction" ? `Each matching turn is 1 ÷ ${s.inputs[1]} = ${s.value} of a full turn` : `360° ÷ ${s.inputs[1]} = ${360 / Number(s.inputs[1])}° each time${Number(s.inputs[2]) > 1 ? `; the ${ord(Number(s.inputs[2]))} time is ${s.value}°` : ""}`),
    domain: [[0, ROT.length - 1], [0, 3], [1, 11]],
    keep: ([shape, ask, m]) => (ask < 3 ? m === 1 : m >= 2 && m < ROT[shape].o),
    difficulty: ([shape, ask]) => (ask === 0 && ROT[shape].poly ? 1 : ask <= 1 ? 2 : 3),
    figure: ([shape]) => (ROT[shape].poly ? { type: "shape", sides: ROT[shape].poly, name: ROT[shape].n.replace(/^an? /, "") } : null),
    word: ([shape, ask, m]) => {
      const S = ROT[shape];
      const thing = S.n.replace(/^(an?|the) /, "").replace(/ (that|with|\().*$/, "");
      return ask === 0
        ? `${name(shape)} cuts out ${S.n} from card and spins it on a pin through its centre. How many times does it look exactly the same during one full turn?`
        : ask === 1
          ? `${name(shape)} cuts out ${S.n} from card and spins it on a pin through its centre. What is the smallest turn, in degrees, after which the ${thing} looks the same as at the start?`
          : ask === 2
            ? `${name(shape)} cuts out ${S.n} from card and spins it on a pin through its centre. What is the smallest fraction of a full turn after which the ${thing} looks the same as at the start?`
            : `${name(shape)} slowly spins ${S.n} cut from card on a pin through its centre. After how many degrees does it look the same as at the start for the ${ord(m)} time?`;
    },
    teach: {
      idea: "A shape has rotational symmetry if it looks the same after a turn of less than a full turn. The order is how many times it fits onto itself in one full turn.",
      method: "Count the identical parts that go round the centre (sides of a regular shape, blades, petals): that is usually the order. The smallest turn is 360° ÷ order, which is 1/order of a full turn.",
      visual: ([shape]) => (ROT[shape].poly ? { type: "shape", sides: ROT[shape].poly } : { type: "angle", deg: 360 / ROT[shape].o }),
      alternatives: [
        { id: "trace_turn", title: "Trace and turn", kind: "conceptual", text: ["Trace the shape on thin paper, put a pin through the centre and turn the tracing slowly.", "Count each time the tracing sits exactly on the shape before you get back to the start."], visual: () => ({ type: "angle", deg: 90 }) },
      ],
    },
    limits: "Regular polygons, common quadrilaterals, letters and simple designs described in words, with order 2 to 12; making symmetrical designs is marked by an educator.",
  },
  // ============================================================ triangle types
  {
    id: "aftri",
    arity: 2,
    title: "Classifying triangles by their angles",
    competency: TT,
    type: "integer",
    mc: true,
    // [ask, seed]: ask 0 acute-angled, 1 right-angled, 2 obtuse-angled; five triangles from the seed
    parse: none,
    reject: ([ask, seed]) => (ask < 0 || ask > 2 || seed < 0 || seed > 59 ? "Five triangles given by their angles." : null),
    prompt: ([ask]) => `The table gives the three angles of five triangles, A to E. How many of them are ${TRIASK[ask]}?`,
    solve: ([ask, seed]) => {
      const ts = tris(seed);
      const kinds = ts.map((a) => (Math.max(...a) > 90 ? 2 : Math.max(...a) === 90 ? 1 : 0));
      const v = kinds.filter((k) => k === ask).length;
      return { steps: [st("largest", "classify", TT, ts.map((a) => Math.max(...a)), kinds.map((k) => TRIASKSHORT[k]).join(", ")), st("count", "count", TT, [ask], v)], answer: v };
    },
    // independent: check every angle of each triangle (and that each adds up to 180°)
    validate: ([ask, seed], v) => {
      const ts = tris(seed);
      if (!ts.every((a) => a[0] + a[1] + a[2] === 180)) return false;
      return v === ts.filter((a) => triKind(a) === ask).length;
    },
    bugs: ([ask, seed]) => {
      const ks = tris(seed).map(triKind);
      const c = (k: number) => ks.filter((x) => x === k).length;
      return ask === 0
        ? [{ id: "one-acute-enough", kind: "conceptual", competency: TT, says: "A triangle was called acute-angled because it has an acute angle. Every triangle has at least two acute angles; an acute-angled triangle has all three less than 90°.", predict: 5 }, { id: "right-as-acute", kind: "recall", competency: ANG, says: "A 90° angle is a right angle, not an acute one. Acute means less than 90°.", predict: c(0) + c(1) }]
        : ask === 1
          ? [{ id: "big-as-right", kind: "recall", competency: ANG, says: "Triangles with an angle bigger than 90° were counted. A right angle is exactly 90°; bigger is obtuse.", predict: c(1) + c(2) }]
          : [{ id: "right-as-obtuse", kind: "recall", competency: ANG, says: "A 90° angle was counted as obtuse. Obtuse means more than 90°.", predict: c(1) + c(2) }, { id: "biggest-first", kind: "procedural", competency: TT, says: "Only the first angle of each triangle was checked. Look at all three angles: the largest one decides the type.", predict: tris(seed).filter((a) => a[0] > 90).length }];
    },
    variants: () => [],
    explain: (s) => (s.id === "largest" ? `The largest angle decides: ${s.value}` : `Count them: ${s.value}`),
    domain: [[0, 2], [0, 59]],
    difficulty: ([ask]) => (ask === 1 ? 1 : ask === 2 ? 2 : 3),
    figure: ([, seed]) => ({ type: "table", head: ["Triangle", "Angles"], rows: tris(seed).map((a, i) => [LETTERS[i], a.map((x) => `${x}°`).join(", ")]) }),
    word: ([ask, seed]) => `A carpenter cuts five triangular wooden pieces, A to E, with the angles in the table. How many of the pieces are ${TRIASK[ask]}?`,
    teach: {
      idea: "Every triangle has at least two acute angles, so the type is decided by its largest angle: less than 90° acute-angled, exactly 90° right-angled, more than 90° obtuse-angled.",
      method: "For each triangle find the largest angle and compare it with 90°. Then count the ones asked for.",
      visual: () => ({ type: "triangle", angles: ["90°", "", ""], right: true }),
      alternatives: [
        { id: "corner_test", title: "The square-corner test", kind: "conceptual", text: ["Hold the corner of a sheet of paper (a right angle) against each angle.", "If one angle fits exactly it is right-angled; if one is wider it is obtuse-angled; if all are narrower it is acute-angled."], visual: () => ({ type: "angle", deg: 90 }) },
      ],
    },
    limits: "Triangles given by their three angles in steps of 5°; classifying from a drawing by eye is not included.",
  },
  {
    id: "aftris",
    arity: 2,
    title: "Classifying triangles by their sides",
    competency: TT,
    type: "integer",
    mc: true,
    // [ask, seed]: ask 0 scalene, 1 equilateral, 2 exactly two equal sides
    parse: none,
    reject: ([ask, seed]) => (ask < 0 || ask > 2 || seed < 0 || seed > 59 ? "Five triangles given by their side lengths." : null),
    prompt: ([ask]) => `The table gives the side lengths of five triangles, A to E. How many of them are ${TSASK[ask]}?`,
    solve: ([ask, seed]) => {
      const ts = triSides(seed);
      const ks = ts.map((s) => (s[0] === s[1] && s[1] === s[2] ? 0 : s[0] === s[1] || s[1] === s[2] || s[0] === s[2] ? 1 : 2));
      const want = [2, 0, 1][ask];
      const v = ks.filter((k) => k === want).length;
      return { steps: [st("compare", "classify", TT, [ask], ks.map((k) => ["equilateral", "isosceles", "scalene"][k]).join(", ")), st("count", "count", TT, [ask], v)], answer: v };
    },
    // independent: count the equal pairs of sides in each triangle
    validate: ([ask, seed], v) => v === triSides(seed).filter((s) => sideKind(s) === [2, 0, 1][ask]).length,
    bugs: ([ask, seed]) => {
      const ks = triSides(seed).map(sideKind);
      const c = (k: number) => ks.filter((x) => x === k).length;
      return ask === 0
        ? [{ id: "names-swapped", kind: "recall", competency: TT, says: "Scalene and isosceles were mixed up. Scalene: all three sides different. Isosceles: two sides equal.", predict: c(1) }, { id: "not-equilateral", kind: "conceptual", competency: TT, says: "Every triangle that is not equilateral was counted. A triangle with two equal sides is not scalene.", predict: c(1) + c(2) }]
        : ask === 1
          ? [{ id: "two-equal-enough", kind: "conceptual", competency: TT, says: "Triangles with only two equal sides were counted. Equilateral needs all three sides equal.", predict: c(0) + c(1) }]
          : [{ id: "equilateral-included", kind: "procedural", competency: TT, says: "The equilateral triangles were counted too; the question asks for exactly two equal sides.", predict: c(0) + c(1) }, { id: "names-swapped", kind: "recall", competency: TT, says: "Isosceles and scalene were mixed up. Isosceles: two sides equal. Scalene: all different.", predict: c(2) }];
    },
    variants: () => [],
    explain: (s) => (s.id === "compare" ? `Compare the three sides of each: ${s.value}` : `Count them: ${s.value}`),
    domain: [[0, 2], [0, 59]],
    difficulty: ([ask]) => (ask === 1 ? 1 : ask === 0 ? 2 : 3),
    figure: ([, seed]) => ({ type: "table", head: ["Triangle", "Sides"], rows: triSides(seed).map((s, i) => [LETTERS[i], s.map((x) => `${x} cm`).join(", ")]) }),
    word: ([ask, seed]) => `${name(seed)} makes five triangles from straws, A to E, with the lengths in the table. How many of the triangles are ${TSASK[ask]}?`,
    teach: {
      idea: "Triangles are named by how many sides are equal: all three equal is equilateral, exactly two equal is isosceles (with two equal sides), none equal is scalene.",
      method: "For each triangle compare the three lengths in pairs (first and second, second and third, first and third). Count the equal pairs, name the triangle, then count the ones asked for.",
      visual: () => ({ type: "triangle", sides: ["5 cm", "5 cm", "3 cm"] }),
      alternatives: [
        { id: "sort_lengths", title: "Sort the lengths first", kind: "procedural", text: ["Write the three lengths from smallest to largest.", "Equal lengths are now next to each other, so they are easy to spot."], visual: () => ({ type: "triangle", sides: ["4 cm", "4 cm", "4 cm"] }) },
      ],
    },
    limits: "Triangles given by whole-number side lengths; whether an equilateral triangle also counts as isosceles is avoided by asking for exactly two equal sides.",
  },
  // ============================================================ equal area / equal perimeter
  {
    id: "afapr",
    arity: 4,
    title: "Rectangles with the same area or the same perimeter",
    competency: APR,
    type: "integer",
    mc: true,
    // [kind, l, w, c]: kind 0: same area as l × w, one side c, find its perimeter; kind 1: same perimeter, one side c, find its area
    parse: none,
    reject: ([kind, l, w, c]) => (kind < 0 || kind > 1 || w < 2 || l < w || l > 12 || c < 1 || c > 30 || !aprOk(kind, l, w, c) ? "Whole-number rectangles up to 12 by 12." : null),
    prompt: ([kind, l, w, c]) =>
      kind === 0
        ? `The rectangle in the picture is ${l} cm long and ${w} cm wide (each square is 1 cm by 1 cm). Another rectangle has the same area, and one of its sides is ${c} cm. What is the perimeter of the other rectangle, in cm?`
        : `The rectangle in the picture is ${l} cm long and ${w} cm wide (each square is 1 cm by 1 cm). Another rectangle has the same perimeter, and one of its sides is ${c} cm. What is the area of the other rectangle, in square cm?`,
    solve: ([kind, l, w, c]) => {
      if (kind === 0) {
        const o = (l * w) / c;
        return { steps: [st("area", "multiply", RAREA, [l, w], l * w), st("side", "divide", APR, [l * w, c], o), st("perimeter", "add", RPER, [c, o], 2 * (c + o))], answer: 2 * (c + o) };
      }
      const o = l + w - c;
      return { steps: [st("perimeter", "add", RPER, [l, w], 2 * (l + w)), st("side", "subtract", APR, [l + w, c], o), st("area", "multiply", RAREA, [c, o], c * o)], answer: c * o };
    },
    // independent: search for the other side by trying lengths, then count squares or walk round the edges
    validate: ([kind, l, w, c], v) => {
      for (let s = 1; s <= 400; s++) {
        let area = 0;
        for (let i = 0; i < c; i++) area += s;
        let p = 0;
        for (const side of [c, s, c, s]) p += side;
        if (kind === 0 && area === l * w) return v === p;
        if (kind === 1 && p === 2 * l + 2 * w) return v === area;
      }
      return false;
    },
    bugs: ([kind, l, w, c]) =>
      kind === 0
        ? [
            { id: "same-perimeter", kind: "conceptual", competency: APR, says: "Rectangles with the same area do not always have the same perimeter. Find the other side first, then go round the new rectangle.", predict: 2 * (l + w) },
            { id: "half-perimeter", kind: "procedural", competency: RPER, says: "Only two sides were added. A rectangle has four sides: two of each length.", predict: c + (l * w) / c },
            { id: "gave-area", kind: "procedural", competency: APR, says: "The area was given; the question asks for the distance round the edge.", predict: l * w },
          ]
        : [
            { id: "same-area", kind: "conceptual", competency: APR, says: "Rectangles with the same perimeter do not always have the same area. Find the other side first, then multiply.", predict: l * w },
            { id: "forgot-halve", kind: "procedural", competency: RPER, says: `The other side was found as perimeter − ${c}. The perimeter has two of each side: the other side is half the perimeter minus ${c}.`, predict: c * (2 * (l + w) - c) },
            { id: "gave-perimeter", kind: "procedural", competency: APR, says: "The perimeter was given; the question asks for the area (the squares inside).", predict: 2 * (l + w) },
          ],
    variants: () => [],
    explain: (s) =>
      s.id === "area"
        ? `Area of the first rectangle: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} square cm`
        : s.id === "perimeter" && s.inputs.length === 2 && Number(s.value) === 2 * (Number(s.inputs[0]) + Number(s.inputs[1]))
          ? `Perimeter: 2 × (${s.inputs[0]} + ${s.inputs[1]}) = ${s.value} cm`
          : s.id === "side"
            ? `The other side: ${s.op === "divide" ? `${s.inputs[0]} ÷ ${s.inputs[1]}` : `${s.inputs[0]} − ${s.inputs[1]}`} = ${s.value} cm`
            : `Area: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} square cm`,
    domain: [[0, 1], [2, 12], [2, 12], [1, 30]],
    keep: ([kind, l, w, c]) => l >= w && aprOk(kind, l, w, c),
    cap: 300,
    difficulty: ([kind, l, w]) => (l * w <= 24 ? 1 : kind === 0 ? 2 : 3),
    figure: ([, l, w]) => ({ type: "grid", rows: w, cols: l }),
    word: ([kind, l, w, c]) =>
      kind === 0
        ? `Grandmother's quilt is a rectangle of ${l * w} square patches, ${l} patches long and ${w} wide. She sews another quilt from the same number of patches, but ${c} patch${c > 1 ? "es" : ""} long. How many patch edges go round the outside of the new quilt?`
        : `${name(l + w)} has a fence that goes round ${aNum(l)} m by ${w} m garden bed. The fence is moved to make a new rectangular bed with one side ${c} m, using all the fence. What is the area of the new bed, in square metres?`,
    teach: {
      idea: "Area counts the squares inside; perimeter is the distance round the edge. Rearranging the same squares can change the perimeter, and the same length of fence can enclose different areas.",
      method: "Same area: find the other side by dividing the area by the side you know, then add all four sides. Same perimeter: half the perimeter is one long side plus one short side, so take away the side you know, then multiply.",
      visual: ([, l, w]) => ({ type: "grid", rows: w, cols: l }),
      alternatives: [
        { id: "rearrange", title: "Rearrange the squares", kind: "conceptual", text: ["Imagine cutting the rectangle into its unit squares and laying them out in rows of the new length.", "Count the rows to get the other side, then walk round the edge to get the perimeter."], visual: ([kind, l, w, c]) => (kind === 0 ? { type: "grid", rows: (l * w) / c, cols: c } : { type: "grid", rows: Math.max(1, l + w - c), cols: c }) },
      ],
    },
    limits: "Rectangles with whole-number sides; explaining in writing why equal areas can have different perimeters is marked by an educator.",
  },
];

// ---------------------------------------------------------------- helpers used above (after the table, hoisted)

/** "a" or "an" before a number as it is read ("an 8", "an 11", "a 7"). */
function aNum(n: number | string) {
  const t = String(n);
  return `${/^8/.test(t) || t === "11" || t === "18" ? "an" : "a"} ${t}`;
}
/** "a" or "an" before a word. */
function an(w: string) {
  return `${/^[aeiou]/i.test(w) ? "an" : "a"} ${w}`;
}
function upTo(k: number) {
  return k === 2 ? "1 or 2" : `${Array.from({ length: k - 1 }, (_, i) => i + 1).join(", ")} or ${k}`;
}
function gcd2(a: number, b: number): number {
  return b ? gcd2(b, a % b) : Math.abs(a);
}
function norm2(t: string) {
  return t.replace(/−/g, "-").replace(/\s+/g, " ").trim();
}
/** The digits offered: n digits, one of them 0 when zero = 1. */
function digitList(n: number, zero: number, s: number): number[] {
  const S = [[3, 5, 7, 8, 9], [1, 4, 6, 2, 8], [2, 9, 5, 1, 7]][s];
  return zero ? [...S.slice(0, n - 1), 0] : S.slice(0, n);
}
/** The choices for each place, from the left. */
function digitChoices(n: number, k: number, rep: number, zero: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < k; i++) {
    if (rep) out.push(i === 0 && zero ? n - 1 : n);
    else out.push(i === 0 ? (zero ? n - 1 : n) : zero ? n - i : n - i);
  }
  return out;
}
function armText(x: number, who: string) {
  if (x === 36) return `${who} lies along the line marked 0 on the outer scale (180 on the inner scale).`;
  return x === 0 ? `${who} lies along the line marked 0 on the inner scale (180 on the outer scale).` : `${who} passes through the mark that reads ${5 * x} on the inner scale and ${180 - 5 * x} on the outer scale.`;
}
function relOk(kind: number, n: number) {
  return kind === 0 ? n >= 3 && n <= 25 : kind === 1 ? n >= 2 && n <= 30 : kind === 2 ? n >= 3 && n <= 20 : n >= 2 && n <= 25;
}
function fracText(a: number, k: number, n: number, ctx: number) {
  if (ctx === 1) return `A fractal tree starts (stage 0) with ${a} branch${a > 1 ? "es" : ""}. At each stage, every branch tip grows ${k} new branches, and each new branch has one tip. The table shows stages 0 and 1. How many branch tips are there at stage ${n}?`;
  if (a === 1 && k === 3) return `In the Sierpinski triangle, stage 0 is one shaded triangle. At each stage, every shaded triangle is split into 4 smaller triangles and the middle one is removed, leaving 3 shaded. The table shows stages 0 and 1. How many shaded triangles are there at stage ${n}?`;
  if (a === 1 && k === 8) return `In the Sierpinski carpet, stage 0 is one shaded square. At each stage, every shaded square is split into 9 smaller squares and the middle one is removed, leaving 8 shaded. The table shows stages 0 and 1. How many shaded squares are there at stage ${n}?`;
  return `A pattern starts (stage 0) with ${a} shaded square${a > 1 ? "s" : ""}. At each stage, every shaded square is replaced by ${k} smaller shaded squares. The table shows stages 0 and 1. How many shaded squares are there at stage ${n}?`;
}
function paintCount(a: number, b: number, c: number, ask: number) {
  const [x, y, z] = [a - 2, b - 2, c - 2];
  return ask === 1 ? 4 * (x + y + z) : ask === 2 ? 2 * (x * y + y * z + x * z) : x * y * z;
}
function aprOk(kind: number, l: number, w: number, c: number) {
  if (c === l || c === w) return false;
  if (kind === 0) return (l * w) % c === 0 && (l * w) / c !== l && (l * w) / c !== w && (l * w) / c <= 30 && c <= 30;
  return c < l + w && l + w - c !== l && l + w - c !== w && l + w - c >= 1 && c <= l + w - 1;
}

// ================================================================ gap@1 additions (river crossings, direction after a
// turn, naming quadrilaterals including kites and trapeziums, unknown sides, figures hidden in a figure, cube nets,
// nets and views of solids, views of block buildings, the rule of a sequence)

/** A fixed, well-mixed hash of a text (FNV-1a with a murmur finaliser): option orders that differ from problem to problem. */
const hh = (s: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 0x01000193) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};
/** Options in an order fixed by the parameters (so the right letter is not predictable). */
const mixOrder = <T,>(salt: string, xs: T[]) => [...xs].sort((a, b) => hh(salt + String(a)) - hh(salt + String(b)) || (String(a) < String(b) ? -1 : 1));
const B = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Bug["predict"]): Bug => ({ id, kind, competency, says, predict });

// ---------------------------------------------------------------- river crossings (afriver)
/** The fewest crossings, found by searching every possible sequence of trips (breadth first). mode 0: n people, a boat
 * for at most k, anyone rows; mode 1: n soldiers and two children, the boat carries one soldier or one or two children,
 * and the children end on the starting bank with the boat. */
function riverSearch(mode: number, n: number, k: number): number {
  const key = (a: number, c: number, side: number) => `${a},${c},${side}`;
  const start = mode === 0 ? [n, 0, 0] : [n, 2, 0];
  const seen = new Set([key(start[0], start[1], 0)]);
  let frontier = [start];
  for (let d = 0; d < 400 && frontier.length; d++) {
    const next: number[][] = [];
    for (const [a, c, side] of frontier) {
      if (mode === 0 ? a === 0 : a === 0 && c === 2 && side === 0) return d;
      const moves: [number, number][] = [];
      if (mode === 0) {
        const here = side === 0 ? a : n - a;
        for (let m = 1; m <= Math.min(k, here); m++) moves.push([m, 0]);
      } else {
        const sHere = side === 0 ? a : n - a;
        const cHere = side === 0 ? c : 2 - c;
        if (sHere >= 1) moves.push([1, 0]);
        if (cHere >= 1) moves.push([0, 1]);
        if (cHere >= 2) moves.push([0, 2]);
      }
      for (const [ms, mc] of moves) {
        const na = side === 0 ? a - ms : a + ms;
        const nc = side === 0 ? c - mc : c + mc;
        const kk = key(na, nc, 1 - side);
        if (!seen.has(kk)) {
          seen.add(kk);
          next.push([na, nc, 1 - side]);
        }
      }
    }
    frontier = next;
  }
  return -1;
}
const riverOk = ([mode, n, k]: number[]) => (mode === 0 ? n >= 3 && n <= 30 && k >= 2 && k <= 6 && n > k : mode === 1 ? k === 2 && n >= 1 && n <= 20 : false);
const riverAns = ([mode, n, k]: number[]) => (mode === 1 ? 4 * n : 2 * Math.ceil((n - k) / (k - 1)) + 1);

// ---------------------------------------------------------------- direction after a turn (afface)
const TURNW = ["", "one eighth of a full turn", "a quarter turn", "three eighths of a full turn", "a half turn", "five eighths of a full turn", "a three-quarter turn", "seven eighths of a full turn"];
function faceOpts([s, k, cw]: number[]) {
  const end = cw ? (s + k) % 8 : (s - k + 8) % 8;
  const other = cw ? (s - k + 8) % 8 : (s + k) % 8;
  // a quarter taken as one of the eight steps (even turns), or each eighth taken as a quarter (odd turns)
  const slipSteps = k % 2 === 0 ? k / 2 : (2 * k) % 8;
  const slip = cw ? (s + slipSteps) % 8 : (s - slipSteps + 8) % 8;
  const set: number[] = [];
  for (const d of [end, other, slip, (end + 4) % 8, (end + 1) % 8, (end + 7) % 8, (end + 2) % 8]) if (!set.includes(d) && set.length < 4) set.push(d);
  const opts = mixOrder(`afface:${s},${k},${cw}`, set);
  return { opts, end, other, slip };
}

// ---------------------------------------------------------------- naming a quadrilateral (afkind)
const QNAMES = ["square", "rectangle", "rhombus", "parallelogram", "kite", "trapezium"];
type QDesc = { sides: number[]; par: number; right: boolean; angles: string; equalOpp: boolean; ptext?: string };
/** Quadrilateral ABCD of a kind (0 square … 5 trapezium), sides AB, BC, CD, DA; par: pairs of parallel sides. The
 * labelling starts at a different corner for odd variants, and the angles are told in one of three ways (all four
 * angles, one angle only, or "all four angles equal"), so the same kind is described by different properties. */
function qdesc(kind: number, seed: number): QDesc {
  const th = [60, 70, 80, 100, 110, 120][seed % 6];
  const rot = hh(`afkind:rot:${kind},${seed}`) % 2;
  const style = hh(`afkind:style:${kind},${seed}`) % 3;
  const turn = (xs: number[]) => (rot ? [xs[3], xs[0], xs[1], xs[2]] : xs);
  const rightText = ["All four angles are 90°.", "∠A = 90°.", "∠A = ∠B = ∠C = ∠D."][style];
  const slantText = [`∠A = ∠C = ${th}°, ∠B = ∠D = ${180 - th}°.`, `∠A = ${th}°.`, `∠A = ${th}°, ∠B = ${180 - th}°.`][style];
  if (kind === 0) {
    const s = 3 + seed;
    return { sides: [s, s, s, s], par: 2, right: true, angles: rightText, equalOpp: true };
  }
  if (kind === 1 || kind === 3) {
    const w = 2 + (seed % 5);
    const l = w + 1 + Math.floor(seed / 5);
    const sides = turn([l, w, l, w]);
    return kind === 1 ? { sides, par: 2, right: true, angles: rightText, equalOpp: true } : { sides, par: 2, right: false, angles: slantText, equalOpp: true };
  }
  if (kind === 2) {
    const s = 3 + seed;
    return { sides: [s, s, s, s], par: 2, right: false, angles: slantText, equalOpp: true };
  }
  if (kind === 4) {
    const a = 3 + (seed % 5);
    const b = a + 2 + Math.floor(seed / 5);
    // [a, b, b, a]: AB = DA, BC = CD, the line AC is the line of symmetry, so ∠B = ∠D; turned: ∠A = ∠C
    return { sides: turn([a, b, b, a]), par: 0, right: false, angles: rot ? "∠A = ∠C; ∠B and ∠D are different." : "∠B = ∠D; ∠A and ∠C are different.", equalOpp: false };
  }
  const b2 = 3 + (seed % 5);
  const d = 3 + Math.floor(seed / 5);
  return { sides: turn([b2 + d, d + 1, b2, d]), par: 1, right: false, angles: "No two angles are equal.", equalOpp: false, ptext: rot ? "AD ∥ BC only (AB and DC are not parallel)" : undefined };
}
const parText = (q: QDesc) => q.ptext ?? (q.par === 2 ? "AB ∥ DC and AD ∥ BC" : q.par === 1 ? "AB ∥ DC only (AD and BC are not parallel)" : "No two sides are parallel");
/** Name a described quadrilateral from its listed properties alone (independent of the kind it was made from). */
function nameFrom(q: QDesc): number {
  const [ab, bc, cd, da] = q.sides;
  const allEq = ab === bc && bc === cd && cd === da;
  const oppEq = ab === cd && bc === da;
  if (q.par === 2 && oppEq) return allEq ? (q.right ? 0 : 2) : q.right ? 1 : 3;
  if (q.par === 1) return 5;
  if (q.par === 0 && ((ab === da && bc === cd) || (ab === bc && cd === da)) && !allEq) return 4;
  return -1;
}
function kindOpts([kind, seed]: number[]) {
  const slips: Record<number, number[]> = { 0: [2, 1, 3], 1: [3, 0, 5], 2: [0, 4, 3], 3: [1, 2, 5], 4: [2, 3, 5], 5: [3, 4, 1] };
  return mixOrder(`afkind:${kind},${seed}`, [kind, ...slips[kind]]);
}

// ---------------------------------------------------------------- unknown sides of parallelograms and rhombuses (afpside)
/** mode 2/3 expressions: AB = p x + q and CD (mode 2) or BC (mode 3) = r x − s, from code = p, d = r − p, q. */
const psideCode = (x: number, code: number) => {
  const p = 1 + (code % 3);
  const d = 1 + (Math.floor(code / 3) % 2);
  const q = 1 + Math.floor(code / 6);
  const r = p + d;
  const s = d * x - q;
  return { p, q, r, s };
};
const psideOk = ([mode, a, b]: number[]) => {
  if (mode === 0) return a >= 4 && a <= 20 && b >= 2 && b < a;
  if (mode === 1) return a >= 3 && a <= 25 && b === 0;
  if (mode === 2 || mode === 3) return a >= 2 && a <= 9 && b >= 0 && b <= 53 && psideCode(a, b).s >= 1;
  return false;
};
const expr = (k: number, c: number, sign: string) => `${k === 1 ? "" : k}x ${sign} ${c}`;

// ---------------------------------------------------------------- figures hidden in a figure (afhidden)
const choose2 = (n: number) => (n * (n - 1)) / 2;
const hiddenOk = ([mode, a, b]: number[]) =>
  mode === 0 ? a >= 1 && b >= 2 && a <= b && b <= 6 : mode === 1 ? a >= 2 && a <= b && b <= 8 : mode === 2 ? a >= 1 && a <= 12 && b === 0 : mode === 3 ? a >= 1 && a <= 8 && b >= 1 && b <= 3 : false;
const hiddenAns = ([mode, a, b]: number[]) => {
  if (mode === 0) return choose2(a + 1) * choose2(b + 1);
  if (mode === 1) {
    let t = 0;
    for (let k = 1; k <= a; k++) t += (a - k + 1) * (b - k + 1);
    return t;
  }
  return (mode === 2 ? 1 : b + 1) * choose2(a + 2);
};

// ---------------------------------------------------------------- cube nets (afcube)
type Cell = [number, number];
const normCells = (cs: Cell[]): Cell[] => {
  const r0 = Math.min(...cs.map((c) => c[0]));
  const c0 = Math.min(...cs.map((c) => c[1]));
  return cs.map(([r, c]) => [r - r0, c - c0] as Cell).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const cellKey = (cs: Cell[]) => normCells(cs).map((c) => c.join(":")).join("|");
/** Every fixed hexomino (six squares joined edge to edge, each position and turn counted separately), in a fixed order. */
const HEXOMINOES: Cell[][] = (() => {
  let level = new Map<string, Cell[]>([["0:0", [[0, 0]]]]);
  for (let size = 2; size <= 6; size++) {
    const next = new Map<string, Cell[]>();
    for (const cs of level.values())
      for (const [r, c] of cs)
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n: Cell = [r + dr, c + dc];
          if (cs.some((x) => x[0] === n[0] && x[1] === n[1])) continue;
          const g = normCells([...cs, n]);
          next.set(cellKey(g), g);
        }
    level = next;
  }
  return [...level.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map((e) => e[1]);
})();
/** Fold by rolling a cube over the squares: each square gets the direction (a unit vector) of the cube face lying on it. */
function rollNormals(cs: Cell[]): Map<string, string> {
  type V = [number, number, number];
  const neg = (v: V): V => [-v[0], -v[1], -v[2]];
  const out = new Map<string, string>();
  const has = (r: number, c: number) => cs.some((x) => x[0] === r && x[1] === c);
  const stack: [number, number, V, V, V][] = [[cs[0][0], cs[0][1], [0, 0, -1], [1, 0, 0], [0, 1, 0]]];
  while (stack.length) {
    const [r, c, nrm, R, D] = stack.pop()!;
    const k = `${r}:${c}`;
    if (out.has(k)) continue;
    out.set(k, nrm.join(","));
    if (has(r, c + 1)) stack.push([r, c + 1, R, neg(nrm), D]);
    if (has(r, c - 1)) stack.push([r, c - 1, neg(R), nrm, D]);
    if (has(r + 1, c)) stack.push([r + 1, c, D, R, neg(nrm)]);
    if (has(r - 1, c)) stack.push([r - 1, c, neg(D), R, nrm]);
  }
  return out;
}
const foldsToCube = (cs: Cell[]) => new Set(rollNormals(cs).values()).size === 6;
/** The eleven nets of a cube, drawn once each (any turn or flip of one of these is the same net). */
const CUBE_NETS = ["#...|####|#...", "#...|####|.#..", "#...|####|..#.", "#...|####|...#", ".#..|####|.#..", ".#..|####|..#.", "##..|.###|.#..", "##..|.###|..#.", "##..|.###|...#", "##..|.##.|..##", "###..|..###"];
const fromPicture = (s: string): Cell[] => s.split("|").flatMap((row, r) => [...row].flatMap((ch, c) => (ch === "#" ? [[r, c] as Cell] : [])));
const turnsOf = (cs: Cell[]): string[] => {
  const out: string[] = [];
  let cur = cs;
  for (let f = 0; f < 2; f++) {
    for (let t = 0; t < 4; t++) {
      out.push(cellKey(cur));
      cur = cur.map(([r, c]) => [c, -r] as Cell);
    }
    cur = cur.map(([r, c]) => [r, -c] as Cell);
  }
  return out;
};
const CUBE_NET_KEYS = new Set(CUBE_NETS.flatMap((s) => turnsOf(fromPicture(s))));
/** The hexominoes that fold into a cube (found by rolling), in the fixed order. */
const NET_LIST = HEXOMINOES.filter(foldsToCube);
const FACE_LETTERS = "ABCDEF";
/** The letters on the squares of net i: a hash-chosen order, so different nets and queries read differently. */
const netLabels = (i: number) => mixOrder(`afcube:labels:${i}`, [...FACE_LETTERS]);
const netPicture = (cs: Cell[], labels: string[] | null): Visual => {
  const R = Math.max(...cs.map((c) => c[0])) + 1;
  const C = Math.max(...cs.map((c) => c[1])) + 1;
  const rows = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => {
    const at = cs.findIndex((x) => x[0] === r && x[1] === c);
    return at < 0 ? "" : labels ? labels[at] : "■";
  }));
  return { type: "table", head: Array.from({ length: C }, () => ""), rows };
};
/** The face opposite face q of net i (by rolling), and the letters next to q in the net. */
function cubeOpp(i: number, q: number) {
  const cs = NET_LIST[i];
  const nm = rollNormals(cs);
  const lab = netLabels(i);
  const vec = (k: number) => nm.get(`${cs[k][0]}:${cs[k][1]}`)!.split(",").map(Number);
  const v = vec(q);
  const opp = cs.findIndex((_, k) => vec(k).every((x, j) => x === -v[j]));
  const adj = cs.map((_, k) => k).filter((k) => Math.abs(cs[k][0] - cs[q][0]) + Math.abs(cs[k][1] - cs[q][1]) === 1);
  // a square two steps away in a straight line is opposite; a square two steps away round a corner is not (a common slip)
  const corner = cs.map((_, k) => k).filter((k) => k !== opp && k !== q && !adj.includes(k));
  return { lab, opp, adj, corner };
}
function cubeOpts([i, q]: number[]) {
  const { lab, opp, adj, corner } = cubeOpp(i, q);
  const set = [opp, ...corner, ...adj].filter((k, j, a) => a.indexOf(k) === j).slice(0, 4);
  return { letters: mixOrder(`afcube:${i},${q}`, set.map((k) => lab[k])), lab, opp, adj, corner };
}
/** Opposite faces by a different method: roll a die whose six faces carry labels and read the face at the bottom on
 * each square (top, bottom, north, south, east, west swap as the die tips over an edge), starting from the LAST square. */
function dieBottoms(cs: Cell[]): Map<string, number> {
  const out = new Map<string, number>();
  const has = (r: number, c: number) => cs.some((x) => x[0] === r && x[1] === c);
  // [top, bottom, north, south, east, west]: labels 0 and 1, 2 and 3, 4 and 5 are opposite on the die
  const last = cs[cs.length - 1];
  const stack: [number, number, number[]][] = [[last[0], last[1], [0, 1, 2, 3, 4, 5]]];
  while (stack.length) {
    const [r, c, d] = stack.pop()!;
    const k = `${r}:${c}`;
    if (out.has(k)) continue;
    out.set(k, d[1]);
    const [T, Bo, N, S, E, W] = d;
    if (has(r, c + 1)) stack.push([r, c + 1, [W, E, N, S, T, Bo]]);
    if (has(r, c - 1)) stack.push([r, c - 1, [E, W, N, S, Bo, T]]);
    if (has(r + 1, c)) stack.push([r + 1, c, [N, S, Bo, T, E, W]]);
    if (has(r - 1, c)) stack.push([r - 1, c, [S, N, T, Bo, E, W]]);
  }
  return out;
}

// ---------------------------------------------------------------- nets and views of solids (afnet)
type Solid = { name: string; net: string | null; top: string; front: string; end?: string; fig?: Visual };
const PRISM = (n: number, base: string, poly: string): Solid => ({ name: `${base} prism`, net: `2 ${poly}s and ${n} rectangles`, top: `a ${poly}`, front: "a rectangle", end: `a ${poly}` });
const PYRAMID = (n: number, base: string, poly: string): Solid => ({ name: `${base} pyramid`, net: `1 ${poly} and ${n} triangles`, top: `a ${poly} with lines from its corners to its centre`, front: "a triangle" });
const SOLIDS: Solid[] = [
  { name: "cube", net: "6 equal squares", top: "a square", front: "a square", fig: { type: "solid", name: "cube" } },
  { name: "cuboid", net: "6 rectangles, in three matching pairs", top: "a rectangle", front: "a rectangle", fig: { type: "solid", name: "cuboid" } },
  { name: "cylinder", net: "2 equal circles and 1 rectangle", top: "a circle", front: "a rectangle", end: "a circle", fig: { type: "solid", name: "cylinder" } },
  { name: "cone", net: "1 circle and 1 fan shape (a sector of a bigger circle)", top: "a circle with a dot at its centre", front: "a triangle", fig: { type: "solid", name: "cone" } },
  { name: "sphere", net: null, top: "a circle", front: "a circle", fig: { type: "solid", name: "sphere" } },
  { name: "hemisphere (flat face down)", net: null, top: "a circle", front: "a semicircle" },
  PRISM(3, "triangular", "triangle"),
  PRISM(5, "pentagonal", "pentagon"),
  PRISM(6, "hexagonal", "hexagon"),
  PRISM(7, "heptagonal", "heptagon"),
  PRISM(8, "octagonal", "octagon"),
  { ...PYRAMID(4, "square", "square"), fig: { type: "solid", name: "pyramid" } },
  { name: "triangular pyramid", net: "4 triangles", top: "a triangle with lines from its corners to its centre", front: "a triangle" },
  PYRAMID(5, "pentagonal", "pentagon"),
  PYRAMID(6, "hexagonal", "hexagon"),
  PYRAMID(7, "heptagonal", "heptagon"),
  PYRAMID(8, "octagonal", "octagon"),
];
/** Solids that are easily confused with solid i (the same base, the other family; the base with one side more or fewer). */
const CONFUSE: Record<number, number[]> = { 0: [1, 11, 6], 1: [0, 6, 11], 2: [3, 1, 8], 3: [2, 11, 4], 4: [5, 2, 3], 5: [4, 3, 2], 6: [12, 7, 1], 7: [13, 8, 6], 8: [14, 9, 7], 9: [15, 10, 8], 10: [16, 9, 8], 11: [1, 12, 13], 12: [6, 11, 13], 13: [7, 14, 11], 14: [8, 15, 13], 15: [9, 16, 14], 16: [10, 15, 14] };
// form 0: net → solid; 1: solid → net; 2: top and front views → solid; 3: solid → top view; 4: solid → front view;
// 5: a prism or cylinder lying on its side, an end facing you → front view
const netOk = ([i, f]: number[]) => i >= 0 && i < SOLIDS.length && f >= 0 && f <= 5 && (f > 1 || SOLIDS[i].net !== null) && (f !== 5 || SOLIDS[i].end !== undefined);
function netOpts([i, f]: number[]): string[] {
  const s = SOLIDS[i];
  const want = f === 1 ? s.net! : f === 3 ? s.top : f === 4 ? s.front : f === 5 ? s.end! : s.name;
  const field = (j: number) => (f === 1 ? SOLIDS[j].net : f === 3 ? SOLIDS[j].top : f === 4 ? SOLIDS[j].front : f === 5 ? SOLIDS[j].end ?? SOLIDS[j].front : SOLIDS[j].name);
  const set = [want];
  for (const j of [...CONFUSE[i], ...SOLIDS.map((_, k) => k)]) {
    const v = field(j);
    if (v && !set.includes(v) && set.length < 4) {
      // a views question must not offer another solid with exactly the same two views
      if (f === 2 && SOLIDS[j].top === s.top && SOLIDS[j].front === s.front) continue;
      // a cube is also a cuboid, and a square is also a rectangle: never offer both
      // a top view offers at most one circle (a circle and a circle with a dot side by side would be two circle options)
      if (f === 3 && want.includes("circle") && v.includes("circle")) continue;
      if ((i <= 1 && j <= 1) || (["a square", "a rectangle"].includes(want) && ["a square", "a rectangle"].includes(v))) continue;
      set.push(v);
    }
  }
  return mixOrder(`afnet:${i},${f}`, set);
}
const cap1 = (t: string) => t[0].toUpperCase() + t.slice(1);
const netPrompt = ([i, f]: number[]) => {
  const s = SOLIDS[i];
  if (f === 0) return `A net is made of ${s.net}. Which solid does it fold into?`;
  if (f === 1) return `Which of these nets folds into ${an(s.name)}?`;
  if (f === 2) return `A solid stands on a table. Seen from straight above it looks like ${s.top}; seen from the front it looks like ${s.front}. Which solid is it?`;
  const on = i === 4 || i === 5 ? "" : " on its base";
  if (f === 3) return `${cap1(an(s.name))} stands on a table${on}. What do you see when you look at it from straight above?`;
  if (f === 4) return `${cap1(an(s.name))} stands on a table${on}. What do you see when you look at it from the front, at eye level?`;
  return `${cap1(an(s.name))} lies on its side on a table, with one end facing you. What do you see when you look at it from the front, at eye level?`;
};

// ---------------------------------------------------------------- views of a block building (afview)
/** Heights of stacks of cubes on a mat, rows from the back to the front, columns from left to right. */
const VIEW_GRIDS: number[][][] = (() => {
  const out: number[][][] = [];
  const seen = new Set<string>();
  for (let s = 0; out.length < 60 && s < 2000; s++) {
    const r = rng(90001 + s * 131);
    const R = 2 + pick(r, 2);
    const C = 2 + pick(r, 2);
    const g = Array.from({ length: R }, () => Array.from({ length: C }, () => pick(r, 4)));
    const total = g.flat().reduce((a, b) => a + b, 0);
    const k = JSON.stringify(g);
    // every row and column has some cubes (so the picture is one building), at most one empty square, 5 to 18 cubes
    if (g.some((row) => row.every((x) => x === 0)) || g[0].some((_, c) => g.every((row) => row[c] === 0)) || g.flat().filter((x) => x === 0).length > 1 || total < 5 || total > 18 || seen.has(k)) continue;
    seen.add(k);
    out.push(g);
  }
  return out;
})();
const VIEWASK = ["from straight above (the top view)", "from the front", "from the right-hand side"];

// ---------------------------------------------------------------- the rule of a sequence (affrule)
type Rule = { text: string; fits: (t: number[]) => boolean };
const isSq = (x: number) => Number.isInteger(Math.sqrt(x)) && x > 0;
const consecutive = (t: number[], f: (k: number) => number) => {
  for (let k = 1; k <= 60; k++) if (t.every((x, i) => x === f(k + i))) return true;
  return false;
};
const RULES: Record<string, Rule> = {
  squares: { text: "They are consecutive square numbers (a whole number times itself, then the next whole number times itself, …)", fits: (t) => consecutive(t, (k) => k * k) },
  triangular: { text: "They are consecutive triangular numbers (from the list 1, 1 + 2, 1 + 2 + 3, …, one after another)", fits: (t) => consecutive(t, (k) => (k * (k + 1)) / 2) },
  cubes: { text: "They are consecutive cube numbers (a whole number times itself three times, then the next, …)", fits: (t) => consecutive(t, (k) => k * k * k) },
  powers: { text: "Each number is double the one before (powers of 2)", fits: (t) => t.every((x, i) => i === 0 || x === 2 * t[i - 1]) },
  triple: { text: "Each number is three times the one before", fits: (t) => t.every((x, i) => i === 0 || x === 3 * t[i - 1]) },
  odd: { text: "They are consecutive odd numbers", fits: (t) => t.every((x, i) => x % 2 === 1 && (i === 0 || x === t[i - 1] + 2)) },
  even: { text: "They are consecutive even numbers", fits: (t) => t.every((x, i) => x % 2 === 0 && (i === 0 || x === t[i - 1] + 2)) },
};
const addRule = (d: number): Rule => ({ text: `Add ${d} each time`, fits: (t) => t.every((x, i) => i === 0 || x === t[i - 1] + d) });
const growRule = (d: number): Rule => ({ text: `Add ${d}, then ${d + 1}, then ${d + 2}, and so on (one more each time)`, fits: (t) => t.every((x, i) => i === 0 || x === t[i - 1] + d + i - 1) });
// kinds: 0 squares, 1 triangular, 2 cubes, 3 powers of 2, 4 odd numbers, 5 add k (k = 3 … 12); a = where it starts
const ruleOk = ([kind, a, k]: number[]) =>
  kind === 0 ? a >= 2 && a <= 20 && k === 0 : kind === 1 ? a >= 2 && a <= 20 && k === 0 : kind === 2 ? a >= 1 && a <= 8 && k === 0 : kind === 3 ? a >= 0 && a <= 9 && k === 0 : kind === 4 ? a >= 1 && a <= 30 && k === 0 : kind === 5 ? a >= 1 && a <= 12 && k >= 3 && k <= 12 && a % k !== 0 : false;
function ruleTerms([kind, a, k]: number[]): number[] {
  return Array.from({ length: 5 }, (_, i) => [(a + i) ** 2, ((a + i) * (a + i + 1)) / 2, (a + i) ** 3, 2 ** (a + i), 2 * (a + i) - 1, a + i * k][kind]);
}
/** The four rules offered: the right one, the rule a learner reads from the first gap only, and two near ones. */
function ruleOpts(p: number[]): { rules: Rule[]; right: number; gap: number; near: number } {
  const [kind, , k] = p;
  const t = ruleTerms(p);
  const g = t[1] - t[0];
  const right = [RULES.squares, RULES.triangular, RULES.cubes, RULES.powers, RULES.odd, addRule(k)][kind];
  const firstGap = kind <= 3 ? addRule(g) : kind === 4 ? RULES.even : addRule(k + 1);
  const nearR = [RULES.triangular, RULES.squares, RULES.squares, RULES.triple, addRule(1), addRule(k - 1)][kind];
  const other = kind === 3 ? growRule(g) : kind <= 1 ? growRule(g + 1) : kind === 2 ? RULES.powers : kind === 4 ? RULES.squares : RULES.powers;
  const rules = mixOrder(`affrule:${p}`, [right, firstGap, nearR, other].map((r) => r.text)).map((tx) => [right, firstGap, nearR, other].find((r) => r.text === tx)!);
  return { rules, right: rules.indexOf(right), gap: rules.indexOf(firstGap), near: rules.indexOf(nearR) };
}

B06.push(
  // ============================================================ river crossings (puzzle-strategy)
  {
    id: "afriver",
    arity: 3,
    title: "River-crossing puzzles: the fewest crossings",
    competency: PZ,
    type: "integer",
    mc: true,
    // [mode, n, k]: mode 0: n people, a boat for at most k (someone rows it back); mode 1: n soldiers and two children (k = 2)
    parse: none,
    reject: (p) => (riverOk(p) ? null : "Groups of up to 30 with a boat for 2 to 6 people, or up to 20 soldiers with the two children's boat."),
    prompt: ([mode, n, k]) =>
      mode === 0
        ? `${n} scouts must cross a river in one small boat. The boat holds at most ${k} people, and someone must be in it to row it, so after each trip across someone rows it back. What is the smallest number of crossings needed to get all ${n} scouts across? (Every trip, in either direction, is one crossing.)`
        : `${n} soldier${n > 1 ? "s" : ""} must cross a river. The only boat belongs to two children. The boat can carry one soldier, or one child, or both children, but never a soldier with a child. At the end the two children must be back on the starting bank with their boat. What is the smallest number of crossings? (Every trip, in either direction, is one crossing.)`,
    solve: (p) => {
      const [mode, n, k] = p;
      if (mode === 1)
        return { steps: [st("one", "reason", PZ, [1], 4), st("all", "multiply", PZ, [n, 4], 4 * n)], answer: 4 * n };
      const rounds = Math.ceil((n - k) / (k - 1));
      return { steps: [st("net", "subtract", PZ, [k, 1], k - 1), st("rounds", "divide", PZ, [n - k, k - 1], rounds), st("total", "add", PZ, [2 * rounds, 1], riverAns(p))], answer: riverAns(p) };
    },
    // independent: search every possible sequence of trips (breadth first) for the shortest one
    validate: ([mode, n, k], v) => v === riverSearch(mode, n, k),
    bugs: ([mode, n, k]) => {
      const ans = riverAns([mode, n, k]);
      if (mode === 1)
        return [
          B("children-not-back", "procedural", PZ, "Only the soldier's trip and one trip back were counted for each soldier. The boat is with the children, so for every soldier: both children cross, one brings the boat back, the soldier crosses, and the other child brings it back: 4 crossings.", 2 * n),
          B("last-return", "procedural", PZ, "The last trip back was left out. The children must end on the starting bank with their boat, so the final return counts too.", 4 * n - 1),
        ];
      const fwd = Math.ceil(n / k);
      const naive = 2 * fwd - 1;
      return [
        B("forward-only", "conceptual", PZ, "Only the trips across were counted. The boat has to come back each time, and the return trips count as crossings too.", fwd === ans ? null : fwd),
        B("rower-forgotten", "conceptual", PZ, `Each trip across was taken to move ${k} people for good. Someone rows the boat back, so each round trip moves only ${k} − 1 = ${k - 1} more ${k === 2 ? "person" : "people"} across (the last trip moves ${k}).`, naive === ans ? null : naive),
      ];
    },
    distractors: (p) => [riverAns(p) + 2, riverAns(p) - 2, riverAns(p) + 1].filter((x) => x > 0),
    variants: () => [],
    explain: (s) =>
      s.id === "one"
        ? "For one soldier: both children cross, one child rows back, the soldier crosses, the other child rows back: 4 crossings, and everything is as before except one soldier is across"
        : s.id === "all"
          ? `${s.inputs[0]} soldiers × 4 crossings = ${s.value}`
          : s.id === "net"
            ? `Each round trip (across and back) leaves ${s.value} more ${s.value === 1 ? "person" : "people"} on the far bank, because one rows the boat back`
            : s.id === "rounds"
              ? `Before the last trip, ${s.inputs[0]} people must be moved by round trips: ${s.inputs[0]} ÷ ${s.inputs[1]} rounded up = ${s.value} round trips`
              : `${s.inputs[0]} crossings for the round trips + 1 last trip with a full boat = ${s.value}`,
    domain: [[0, 1], [1, 30], [2, 6]],
    keep: riverOk,
    difficulty: ([mode, n, k]) => (mode === 1 ? (n <= 5 ? 1 : 2) : k === 2 ? 2 : 3),
    word: ([mode, n, k]) =>
      mode === 0
        ? `At a ghat on the Kaveri, ${n} pilgrims want to cross the river in a round coracle that holds at most ${k} people. Someone must row the coracle back after every trip across. What is the fewest number of crossings (trips either way) to get all ${n} pilgrims across?`
        : `${n} ${n === 1 ? "fisherman wants" : "fishermen want"} to reach an island, but the only boat belongs to two village children. It can carry one fisherman, or one child, or both children, never a fisherman with a child. The children must end up back home with their boat. What is the fewest number of crossings (trips either way)?`,
    teach: {
      idea: "Act the puzzle out one trip at a time and look for the pattern that repeats. A round trip (across and back) is what moves people, and the boat's rower has to come back each time.",
      method: "Work out what one full round achieves (how many more people end up across), count how many rounds are needed before the last trip, then add the last trip.",
      alternatives: [
        { id: "act_out", title: "Act it out with counters", kind: "conceptual", text: ["Use counters for the people and a coin for the boat on two sides of a line.", "Move them trip by trip and write each trip in a table; count the rows at the end."], visual: ([mode, n, k]) => ({ type: "table", head: ["Trip", "Who crosses", "Left bank", "Right bank"], rows: mode === 0 ? [["1", `${k} →`, String(n - k), String(k)], ["2", "1 ←", String(n - k + 1), String(k - 1)]] : [["1", "2 children →", `${n} soldiers`, "2 children"], ["2", "1 child ←", `${n} soldiers, 1 child`, "1 child"]] }) },
        { id: "small_cases", title: "Solve smaller puzzles first", kind: "procedural", text: ["Try the same puzzle with 1, 2 and 3 people (or soldiers) and count the crossings.", "See how much the count grows each time one more person is added, and use that to reach the number asked."] },
      ],
    },
    limits: "Two kinds of crossing puzzle (a group with a small boat; soldiers and two children); puzzles with rules about who may be left together are not included.",
  },
  // ============================================================ the direction faced after a turn
  {
    id: "afface",
    arity: 3,
    title: "The compass direction faced after a turn",
    competency: AT,
    type: "choice",
    // [s, k, cw]: facing DIRS[s], turning k eighths of a full turn, clockwise (1) or anticlockwise (0)
    parse: none,
    reject: ([s, k, cw]) => (s < 0 || s > 7 || k < 1 || k > 7 || (cw !== 0 && cw !== 1) ? "Turns of one to seven eighths of a full turn from one of the eight compass directions." : null),
    choices: (p) => faceOpts(p).opts.map((d) => DIRS[d]),
    prompt: ([s, k, cw]) => `${name(s + k)} is facing ${DIRS[s]} and makes ${TURNW[k]} ${cw ? "clockwise" : "anticlockwise"}. Which direction is ${name(s + k)} facing now?`,
    solve: (p) => {
      const [s, k, cw] = p;
      const { opts, end } = faceOpts(p);
      return { steps: [st("eighths", "convert", AT, [k], k), st("count", "count", AT, [s, k, cw], DIRS[end])], answer: opts.indexOf(end) };
    },
    // independent: point an arrow at the start and turn it 45° at a time, k times, then compare the chosen direction
    validate: ([s, k, cw], v) => {
      if (typeof v !== "number") return false;
      let deg = 45 * s;
      for (let i = 0; i < k; i++) deg = (deg + (cw ? 45 : 315)) % 360;
      return faceOpts([s, k, cw]).opts.map((d) => DIRS[d])[v] === DIRS[deg / 45];
    },
    bugs: (p) => {
      const [, k, cw] = p;
      const { opts, end, other, slip } = faceOpts(p);
      return [
        ...(other !== end ? [B("other-way", "conceptual", "MATH.geometry.maps-directions", `The turn was made the other way. ${cw ? "Clockwise is the way clock hands move: North → North-East → East → …" : "Anticlockwise is against the clock hands: North → North-West → West → …"}`, opts.indexOf(other))] : []),
        ...(slip !== end && slip !== other ? [B(k % 2 === 0 ? "quarter-as-eighth" : "eighth-as-quarter", "procedural", AT, k % 2 === 0 ? "Each quarter turn was taken as one step between neighbouring directions. With the in-between directions there are 8 steps in a full turn, so a quarter turn is 2 steps." : "Each eighth was taken as a quarter turn. A quarter turn is 2 of the 8 steps, so one eighth is just one step, to the next direction.", opts.indexOf(slip))] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "eighths" ? `The turn is ${s.inputs[0]} eighth${s.inputs[0] === 1 ? "" : "s"} of a full turn: ${s.inputs[0]} step${s.inputs[0] === 1 ? "" : "s"} round the 8 directions` : `Count ${s.inputs[1]} step${s.inputs[1] === 1 ? "" : "s"} ${s.inputs[2] ? "clockwise" : "anticlockwise"} from ${DIRS[Number(s.inputs[0])]}: ${s.value}`),
    domain: [[0, 7], [1, 7], [0, 1]],
    difficulty: ([s, k]) => (s % 2 === 0 && k % 2 === 0 ? 1 : k % 2 === 0 ? 2 : 3),
    figure: ([s]) => compass(s),
    word: ([s, k, cw]) => `The arrow on a temple weathervane points ${DIRS[s]}. A gust of wind turns it ${TURNW[k]} ${cw ? "clockwise" : "anticlockwise"}. Which direction does the arrow point now?`,
    teach: {
      idea: "The eight compass directions split a full turn into eight equal steps; a quarter turn is two steps and a half turn is four. Clockwise goes North → East → South → West.",
      method: "Change the turn into eighths (a quarter = 2, a half = 4, three quarters = 6), then count that many steps round the compass, the way of the turn.",
      alternatives: [
        { id: "stand_and_turn", title: "Stand up and turn", kind: "conceptual", text: ["Face the starting direction and point your arm straight ahead.", "Turn your body step by step (each step to the next direction on the compass) and say the directions aloud as you pass them."], visual: () => compass(0) },
        { id: "clock_face", title: "Use a clock face", kind: "procedural", text: ["Put North at 12, East at 3, South at 6 and West at 9; the in-between directions sit half-way.", "A quarter turn clockwise moves the minute hand from 12 to 3: from North to East."], visual: () => ({ type: "clock", h: 3, m: 0 }) },
      ],
    },
    limits: "Turns of whole eighths, less than a full turn, from the eight compass directions; turns given in degrees are the angle families.",
  },
  // ============================================================ naming a quadrilateral, kites and trapeziums included
  {
    id: "afkind",
    arity: 2,
    title: "Naming a quadrilateral from its properties (kites and trapeziums included)",
    competency: QC,
    type: "choice",
    // [kind, seed]: kind 0 square, 1 rectangle, 2 rhombus, 3 parallelogram, 4 kite, 5 trapezium; seed sets the measurements
    parse: none,
    reject: ([kind, seed]) => (kind < 0 || kind > 5 || seed < 0 || seed > 19 ? "Six kinds of quadrilateral, twenty sets of measurements each." : null),
    choices: (p) => kindOpts(p).map((k) => `a ${QNAMES[k]}`),
    prompt: () => "The table describes quadrilateral ABCD (the sides are listed in order round the shape). Which name describes it best, the most special name that fits?",
    solve: ([kind, seed]) => {
      const q = qdesc(kind, seed);
      return { steps: [st("sides", "compare", QC, q.sides, q.sides.join(", ")), st("parallel", "read", QC, [q.par], parText(q)), st("name", "classify", QC, [kind], QNAMES[kind])], answer: kindOpts([kind, seed]).indexOf(kind) };
    },
    // independent: name the shape from the listed properties alone, then compare with the chosen option
    validate: ([kind, seed], v) => typeof v === "number" && kindOpts([kind, seed])[v] === nameFrom(qdesc(kind, seed)),
    bugs: ([kind, seed]) => {
      const o = kindOpts([kind, seed]);
      const say: Record<number, [string, number, string][]> = {
        0: [["sides-only", 2, "Only the sides were looked at. Four equal sides make a rhombus, but these angles are all 90° as well, so the most special name is square."], ["angles-only", 1, "Only the angles were looked at. Four right angles make a rectangle, but all four sides are equal too, so the most special name is square."]],
        1: [["general-name", 3, "A rectangle is a parallelogram, but its four right angles make 'rectangle' the more special name."], ["right-angles-square", 0, "Four right angles were taken to mean a square. A square also needs all four sides equal; here the sides are not all equal."]],
        2: [["equal-sides-square", 0, "Four equal sides were taken to mean a square. A square also needs four right angles; these angles are not 90°."], ["general-kite", 4, "Pairs of equal sides next to each other do fit a kite, but all four sides are equal and opposite sides are parallel: the more special name is rhombus."]],
        3: [["opposite-sides-rectangle", 1, "Opposite sides equal were taken to mean a rectangle. A rectangle also needs four right angles; these angles are not 90°."], ["pairs-rhombus", 2, "A rhombus needs all four sides equal; here only opposite sides are equal."]],
        4: [["pairs-parallelogram", 3, "Two pairs of equal sides were taken to mean a parallelogram. In a parallelogram the equal sides are OPPOSITE each other and parallel; here the equal sides are next to each other and no sides are parallel: a kite."], ["pairs-rhombus", 2, "A rhombus has all four sides equal. Here there are two different lengths, each used for two sides next to each other: a kite."]],
        5: [["one-pair-parallelogram", 3, "One pair of parallel sides was taken to be enough for a parallelogram. A parallelogram needs BOTH pairs of opposite sides parallel; with exactly one pair it is a trapezium."], ["any-kite", 4, "A kite has two pairs of equal sides next to each other; here all four sides are different."]],
      };
      return say[kind].map(([id, k, s]) => B(id, "conceptual", QC, s, o.indexOf(k)));
    },
    variants: () => [],
    explain: (s) => (s.id === "sides" ? `The sides in order are ${s.value} (cm)` : s.id === "parallel" ? `Parallel sides: ${s.value}` : `So the most special name is ${s.value}`),
    domain: [[0, 5], [0, 19]],
    difficulty: ([kind]) => (kind <= 1 ? 1 : kind <= 3 ? 2 : 3),
    figure: ([kind, seed]) => {
      const q = qdesc(kind, seed);
      const [ab, bc, cd, da] = q.sides;
      return { type: "table", head: ["Property", "Quadrilateral ABCD"], rows: [["Sides", `AB = ${ab} cm, BC = ${bc} cm, CD = ${cd} cm, DA = ${da} cm`], ["Parallel sides", parText(q)], ["Angles", q.angles]] };
    },
    word: () => "A carpenter has made a wooden frame ABCD for a window and written down its measurements in the table (sides in order round the frame). Which name describes the frame best, the most special name that fits?",
    teach: {
      idea: "Each name is a list of properties. A square has every property; a kite has two pairs of equal sides NEXT to each other; a trapezium has exactly one pair of parallel sides. The best name is the most special one whose properties all hold.",
      method: "Check, in order: both pairs of opposite sides parallel? (parallelogram family: then all sides equal → rhombus, right angles → rectangle, both → square). Exactly one pair parallel? → trapezium. No parallel sides but two pairs of equal neighbouring sides? → kite.",
      alternatives: [
        { id: "family_tree", title: "A family tree of quadrilaterals", kind: "conceptual", text: ["Parallelograms hold rectangles and rhombuses; squares sit inside both. Kites and trapeziums are separate branches.", "A shape is named by the lowest branch whose properties it has."], visual: () => ({ type: "table", head: ["Name", "Parallel pairs", "Equal sides", "Right angles"], rows: [["Square", "2", "all 4", "4"], ["Rectangle", "2", "opposite", "4"], ["Rhombus", "2", "all 4", "—"], ["Parallelogram", "2", "opposite", "—"], ["Kite", "0", "2 pairs next to each other", "—"], ["Trapezium", "1", "—", "—"]] }) },
        { id: "draw_it", title: "Sketch it from the table", kind: "procedural", text: ["Sketch the shape roughly, marking equal sides with the same tick and parallel sides with arrows.", "Look at the sketch: which ticks and arrows does it have? Match them to a name."], visual: ([kind]) => ({ type: "shape", kind: ["square", "rectangle", "rhombus", "parallelogram", "kite", "trapezium"][kind] }) },
      ],
    },
    limits: "One quadrilateral described by its side lengths, parallel sides and angles; the best (most special) name among squares, rectangles, rhombuses, parallelograms, kites and trapeziums. Proving the properties is marked by an educator.",
  },
  // ============================================================ unknown sides of parallelograms and rhombuses
  {
    id: "afpside",
    arity: 3,
    title: "Unknown sides of a parallelogram or rhombus",
    competency: QC,
    type: "integer",
    mc: true,
    // [mode, a, b]: 0 parallelogram, perimeter 2(a + b) and side a → the other side b; 1 rhombus, perimeter 4a → side;
    // 2 parallelogram with AB = px + q and CD = rx − s → AB; 3 rhombus with AB = px + q and BC = rx − s → perimeter
    parse: none,
    reject: (p) => (psideOk(p) ? null : "Whole-number sides up to 25 cm, or sides written as px + q and rx − s with x from 2 to 9."),
    prompt: ([mode, a, b]) => {
      if (mode === 0) return `The perimeter of parallelogram ABCD is ${2 * (a + b)} cm and AB = ${a} cm. What is the length of BC, in cm?`;
      if (mode === 1) return `The perimeter of rhombus PQRS is ${4 * a} cm. How long is each side, in cm?`;
      const { p, q, r, s } = psideCode(a, b);
      return mode === 2
        ? `In parallelogram ABCD, AB = (${expr(p, q, "+")}) cm and CD = (${expr(r, s, "−")}) cm. What is the length of AB, in cm?`
        : `In rhombus ABCD, AB = (${expr(p, q, "+")}) cm and BC = (${expr(r, s, "−")}) cm. What is the perimeter of the rhombus, in cm?`;
    },
    solve: ([mode, a, b]) => {
      if (mode === 0) return { steps: [st("half", "divide", QC, [2 * (a + b), 2], a + b), st("other", "subtract", QC, [a + b, a], b)], answer: b };
      if (mode === 1) return { steps: [st("quarter", "divide", QC, [4 * a, 4], a)], answer: a };
      const { p, q, r, s } = psideCode(a, b);
      const side = p * a + q;
      return { steps: [st("equate", "equate", QC, [`${expr(p, q, "+")} = ${expr(r, s, "−")}`], `x = ${a}`), st("side", "substitute", QC, [p, a, q], side), ...(mode === 3 ? [st("perimeter", "multiply", QC, [4, side], 4 * side)] : [])], answer: mode === 3 ? 4 * side : side };
    },
    // independent: try each whole-number length (and each x) and keep the one that fits the shape's rules
    validate: ([mode, a, b], v) => {
      if (typeof v !== "number") return false;
      if (mode === 0) return v + a + v + a === 2 * (a + b) && v > 0;
      if (mode === 1) return v + v + v + v === 4 * a;
      const { p, q, r, s } = psideCode(a, b);
      for (let x = 1; x <= 50; x++) if (p * x + q === r * x - s) return v === (mode === 3 ? 4 : 1) * (p * x + q);
      return false;
    },
    bugs: ([mode, a, b]) => {
      if (mode === 0) return [B("whole-perimeter", "procedural", QC, `${a} was taken from the whole perimeter. The perimeter has two sides of each length, so first halve it: AB + BC = ${a + b}.`, 2 * (a + b) - a), B("all-equal", "conceptual", QC, "The perimeter was shared equally among four sides, as for a rhombus. In a parallelogram only OPPOSITE sides are equal.", (2 * (a + b)) % 4 === 0 && (a + b) / 2 !== b ? (a + b) / 2 : null)];
      if (mode === 1) return [B("half", "conceptual", QC, "The perimeter was halved. A rhombus has four equal sides, so divide by 4.", 2 * a)];
      const { p, q, r, s } = psideCode(a, b);
      const side = p * a + q;
      const xs = (s - q) / (r - p);
      const slip = Number.isInteger(xs) && xs > 0 ? (mode === 3 ? 4 : 1) * (p * xs + q) : null;
      return [
        B("x-not-side", "procedural", QC, `x = ${a} was given, but the question asks for a length: put x = ${a} back into the expression.`, a),
        ...(mode === 3 ? [B("side-not-perimeter", "procedural", QC, `The side (${side} cm) was given. The perimeter is all four equal sides: 4 × ${side}.`, side)] : []),
        B("sign-slip", "procedural", "MATH.algebra.linear-equations", `When the numbers were moved across the equals sign, their signs were not changed (${r - p}x = ${s} − ${q}). Moving +${q} to the other side makes it −${q}, and moving −${s} makes it +${s}: ${r - p}x = ${s} + ${q}.`, slip === (mode === 3 ? 4 * side : side) ? null : slip),
      ];
    },
    variants: () => [],
    explain: (s) =>
      s.id === "half"
        ? `Opposite sides are equal, so AB + BC is half the perimeter: ${s.inputs[0]} ÷ 2 = ${s.value} cm`
        : s.id === "other"
          ? `BC = ${s.inputs[0]} − ${s.inputs[1]} = ${s.value} cm`
          : s.id === "quarter"
            ? `All four sides are equal: ${s.inputs[0]} ÷ 4 = ${s.value} cm`
            : s.id === "equate"
              ? `The two sides are equal: ${s.inputs[0]}, so ${s.value}`
              : s.id === "side"
                ? `The side is ${s.inputs[0] === 1 ? "" : `${s.inputs[0]} × `}${s.inputs[1]} + ${s.inputs[2]} = ${s.value} cm`
                : `Perimeter = 4 × ${s.inputs[1]} = ${s.value} cm`,
    domain: [[0, 3], [2, 25], [0, 53]],
    keep: psideOk,
    cap: 400,
    difficulty: ([mode]) => (mode <= 1 ? 1 : mode === 2 ? 2 : 3),
    word: ([mode, a, b]) => {
      if (mode === 0) return `${name(a + b)} puts a lace border round a parallelogram-shaped table mat. The border is ${2 * (a + b)} cm long and one side of the mat is ${a} cm. How long is the side next to it, in cm?`;
      if (mode === 1) return `A rhombus-shaped rangoli frame is made from ${4 * a} cm of bamboo strip, all used for the four sides. How long is each side, in cm?`;
      const { p, q, r, s } = psideCode(a, b);
      return mode === 2 ? `A garden gate is a parallelogram. Its top bar measures (${expr(p, q, "+")}) cm and its bottom bar (${expr(r, s, "−")}) cm. How long is the top bar, in cm?` : `The four sides of a rhombus-shaped kolam frame are equal; two neighbouring sides measure (${expr(p, q, "+")}) cm and (${expr(r, s, "−")}) cm. How much strip goes round the whole frame, in cm?`;
    },
    teach: {
      idea: "In a parallelogram opposite sides are equal, so the perimeter is twice (one side + the next side). In a rhombus all four sides are equal.",
      method: "Parallelogram: halve the perimeter and take away the side you know. Rhombus: divide the perimeter by 4. When sides are given as expressions, set the two equal sides equal, solve for x, then substitute.",
      alternatives: [
        { id: "walk_round", title: "Walk round the shape", kind: "conceptual", text: ["Walking round a parallelogram you go along AB, BC, then the same lengths again.", "So half the walk is AB + BC: the side you know plus the side you want."], visual: ([, a, b]) => ({ type: "shape", kind: "parallelogram", lengths: [`${a} cm`, `${b} cm`, `${a} cm`, `${b} cm`] }) },
        { id: "balance", title: "Equal sides balance", kind: "procedural", text: ["Write the two equal sides on the two pans of a balance: px + q = rx − s.", "Take px from both sides and add s to both; then divide to find x."] },
      ],
    },
    limits: "Whole-number sides; the side expressions are linear in x with a whole-number solution. Angles are the afpara family.",
  },
  // ============================================================ figures hidden in a figure
  {
    id: "afhidden",
    arity: 3,
    title: "Counting the rectangles, squares or triangles hidden in a figure",
    competency: EN,
    type: "integer",
    mc: true,
    // [mode, a, b]: 0 rectangles in an a × b grid; 1 squares in an a × b grid; 2 triangles when a lines are drawn from
    // the top corner of a triangle to its base; 3 the same with b lines parallel to the base as well
    parse: none,
    reject: (p) => (hiddenOk(p) ? null : "Grids up to 6 × 6 (rectangles) or 8 × 8 (squares); up to 12 lines from the top corner of a triangle, with up to 3 lines across."),
    prompt: ([mode, a, b]) =>
      mode === 0
        ? `The picture shows a rectangle divided into a grid of ${a} row${a > 1 ? "s" : ""} and ${b} columns of small squares. How many rectangles of any size can you find in it? (Squares count as rectangles, and so does the whole figure.)`
        : mode === 1
          ? `The picture shows a grid of ${a} rows and ${b} columns of small squares. How many squares of any size are there in it altogether?`
          : mode === 2
            ? `A triangle has ${a} straight line${a > 1 ? "s" : ""} drawn from its top corner down to its base, cutting it into ${a + 1} thin triangles side by side. How many triangles of any size are there altogether, counting the whole triangle too? (Picture or sketch it.)`
            : `A triangle has ${a} straight line${a > 1 ? "s" : ""} drawn from its top corner down to its base, and ${b} straight line${b > 1 ? "s" : ""} drawn across it parallel to the base, from one side to the other. How many triangles of any size are there altogether, counting the whole triangle too? (Picture or sketch it.)`,
    solve: (p) => {
      const [mode, a, b] = p;
      if (mode === 0) return { steps: [st("across", "choose", EN, [b + 1, 2], choose2(b + 1)), st("down", "choose", EN, [a + 1, 2], choose2(a + 1)), st("all", "multiply", EN, [choose2(b + 1), choose2(a + 1)], hiddenAns(p))], answer: hiddenAns(p) };
      if (mode === 1) {
        const steps = [];
        for (let k = 1; k <= a; k++) steps.push(st(`size${k}`, "count", EN, [k, a - k + 1, b - k + 1], (a - k + 1) * (b - k + 1)));
        return { steps: [...steps, st("all", "add", EN, steps.map((s) => Number(s.value)), hiddenAns(p))], answer: hiddenAns(p) };
      }
      return { steps: [st("pairs", "choose", EN, [a + 2, 2], choose2(a + 2)), st("all", "multiply", EN, [choose2(a + 2), mode === 2 ? 1 : b + 1], hiddenAns(p))], answer: hiddenAns(p) };
    },
    // independent: list every candidate figure one by one and count those that are really there
    validate: ([mode, a, b], v) => {
      let n = 0;
      if (mode <= 1) {
        for (let r1 = 0; r1 < a; r1++) for (let r2 = r1; r2 < a; r2++) for (let c1 = 0; c1 < b; c1++) for (let c2 = c1; c2 < b; c2++) if (mode === 0 || r2 - r1 === c2 - c1) n++;
      } else {
        // a triangle is two of the lines from the top corner (the two sides count) and one line across (the base counts)
        const lines = a + 2;
        const across = mode === 2 ? 1 : b + 1;
        for (let i = 0; i < lines; i++) for (let j = i + 1; j < lines; j++) for (let h = 0; h < across; h++) n++;
      }
      return v === n;
    },
    bugs: (p) => {
      const [mode, a, b] = p;
      const ans = hiddenAns(p);
      const keep = (x: number) => (x === ans ? null : x);
      if (mode === 0) return [B("small-only", "conceptual", EN, "Only the smallest squares were counted. Rectangles can be made of several squares together, up to the whole figure.", keep(a * b)), B("rows-only", "procedural", EN, "Only rectangles one row high were counted. Count rectangles of every height as well as every width.", keep(a * choose2(b + 1)))];
      if (mode === 1) return [B("small-only", "conceptual", EN, "Only the smallest squares were counted. Bigger squares are made of 2 × 2, 3 × 3, … small squares.", keep(a * b)), B("small-and-whole", "procedural", EN, "Only the small squares and the biggest ones were counted; the middle sizes were missed.", keep(a * b + (b - a + 1)))];
      const per = choose2(a + 2);
      return [B("thin-only", "conceptual", EN, mode === 2 ? "Only the thin triangles side by side were counted. Two or more next to each other also make a triangle, and so does the whole triangle." : "Only the smallest triangles, at the top above the first line across, were counted. Two or more of them together make a triangle too, and every line across is the base of more triangles.", keep(a + 1)), ...(mode === 3 ? [B("one-layer", "procedural", EN, `Only the triangles standing on the base were counted (${per}). Each line across makes another set of triangles with the top corner.`, keep(per))] : [B("thin-and-whole", "procedural", EN, "Only the thin triangles and the whole triangle were counted; triangles made of two, three, … thin ones were missed.", keep(a + 2))])];
    },
    distractors: (p) => [hiddenAns(p) + 1, hiddenAns(p) - 1, hiddenAns(p) + 5].filter((x) => x > 0),
    variants: () => [],
    explain: (s) =>
      s.id === "across"
        ? `A rectangle needs 2 of the ${s.inputs[0]} upright lines: ${s.value} ways`
        : s.id === "down"
          ? `and 2 of the ${s.inputs[0]} lines across: ${s.value} ways`
          : s.id === "pairs"
            ? `A triangle needs 2 of the ${s.inputs[0]} lines from the top corner (the two sides included): ${s.value} ways`
            : s.id.startsWith("size")
              ? `Squares ${s.inputs[0]} × ${s.inputs[0]}: ${s.inputs[1]} × ${s.inputs[2]} = ${s.value}`
              : `Altogether ${s.value}`,
    domain: [[0, 3], [1, 12], [0, 8]],
    keep: hiddenOk,
    difficulty: ([mode, a, b]) => (mode === 2 ? (a <= 3 ? 1 : 2) : mode === 3 ? 3 : a * b <= 6 ? 1 : 2),
    figure: ([mode, a, b]) => (mode <= 1 ? { type: "grid", rows: a, cols: b } : null),
    word: ([mode, a, b]) =>
      mode === 0
        ? `A window has ${a} row${a > 1 ? "s" : ""} of ${b} square glass panes in a wooden frame. ${name(a + b)} plays a game: how many rectangles of any size can be traced along the wooden bars? (Single panes and the whole window count.)`
        : mode === 1
          ? `A chessboard-style kolam is drawn as a grid of ${a} rows and ${b} columns of squares. How many squares of any size can be traced in it?`
          : mode === 2
            ? `A paper fan is shaped like a triangle with ${a} fold line${a > 1 ? "s" : ""} running from the handle (the top corner) to the edge, making ${a + 1} thin triangles. How many triangles of any size can you see?`
            : `A triangular signboard has ${a} line${a > 1 ? "s" : ""} painted from its top corner to its base and ${b} line${b > 1 ? "s" : ""} painted across it, parallel to the base. How many triangles of any size are there on the board?`,
    teach: {
      idea: "Counting hidden figures goes wrong when we just look and count. Instead, describe each figure by the lines that make it, and count the choices of lines systematically.",
      method: "Rectangles in a grid: choose 2 of the upright lines and 2 of the lines across, and multiply the numbers of ways. Squares: count each size separately and add. Triangles from one corner: choose 2 of the lines from the corner, times the number of lines across.",
      visual: ([mode, a, b]) => (mode <= 1 ? { type: "grid", rows: a, cols: b } : null),
      alternatives: [
        { id: "by_size", title: "Count size by size", kind: "procedural", text: ["Make a table: figures made of 1 piece, of 2 pieces, of 3 pieces, ….", "Count each row of the table carefully, then add the rows."], visual: ([, a]) => ({ type: "table", head: ["Pieces in the figure", "1", "2", "3", "…"], rows: [["How many", String(a + 1), "?", "?", "…"]] }) },
        { id: "small_first", title: "Start with a smaller figure", kind: "conceptual", text: ["Count the figures in a 1 × 2 grid, then a 1 × 3 grid, then a 1 × 4 grid.", "Notice the pattern 3, 6, 10, … (the triangular numbers) and use it to count bigger figures."], visual: () => ({ type: "grid", rows: 1, cols: 3 }) },
      ],
    },
    limits: "Rectangles and squares in a full grid; triangles in a triangle cut by lines from one corner and lines parallel to the base. Irregular composite figures are not included (no pictures of them yet).",
  },
  // ============================================================ cube nets
  {
    id: "afcube",
    arity: 3,
    title: "Cube nets: opposite faces, and which shapes fold into a cube",
    competency: NETS,
    type: "choice",
    // [mode, i, q]: mode 0: the i-th cube net (every turn and flip drawn separately), lettered; which face is opposite
    // the q-th square? mode 1: the i-th shape of six squares (q = 0): does it fold into a cube?
    parse: none,
    reject: ([mode, i, q]) => (mode === 0 ? (i >= 0 && i < NET_LIST.length && q >= 0 && q <= 5 ? null : "A cube net and one of its six faces.") : mode === 1 ? (i >= 0 && i < HEXOMINOES.length && q === 0 ? null : "A shape of six squares.") : "Modes 0 and 1."),
    choices: ([mode, i, q]) => (mode === 0 ? cubeOpts([i, q]).letters : mixOrder(`afcube:yn:${i}`, ["Yes, it folds into a cube", "No, it does not fold into a cube"])),
    prompt: ([mode, i, q]) => (mode === 0 ? `The picture shows a net of a cube with its six squares lettered. When it is folded into a cube, which face is opposite face ${netLabels(i)[q]}?` : "The picture shows a shape made of six squares (■). Can it be folded along the lines into a cube, with no two squares overlapping?"),
    solve: ([mode, i, q]) => {
      if (mode === 0) {
        const { letters, lab, opp } = cubeOpts([i, q]);
        return { steps: [st("fold", "fold", NETS, [lab[q]], lab[opp])], answer: letters.indexOf(lab[opp]) };
      }
      const ok = foldsToCube(HEXOMINOES[i]);
      const ch = mixOrder(`afcube:yn:${i}`, ["Yes, it folds into a cube", "No, it does not fold into a cube"]);
      return { steps: [st("fold", "fold", NETS, ["six squares"], ok ? "six different faces" : "two squares land on the same face")], answer: ch.findIndex((c) => c.startsWith(ok ? "Yes" : "No")) };
    },
    // independent: mode 0, roll a labelled die over the squares from the other end and see which labels land opposite;
    // mode 1, compare the shape (every turn and flip) with the eleven known cube nets
    validate: ([mode, i, q], v) => {
      if (typeof v !== "number") return false;
      if (mode === 0) {
        const cs = NET_LIST[i];
        const lab = netLabels(i);
        const bottoms = dieBottoms(cs);
        const at = (k: number) => bottoms.get(`${cs[k][0]}:${cs[k][1]}`)!;
        const chosen = lab.indexOf(cubeOpts([i, q]).letters[v]);
        return chosen >= 0 && chosen !== q && (at(chosen) ^ 1) === at(q);
      }
      const ch = mixOrder(`afcube:yn:${i}`, ["Yes, it folds into a cube", "No, it does not fold into a cube"]);
      return ch[v]?.startsWith(CUBE_NET_KEYS.has(cellKey(HEXOMINOES[i])) ? "Yes" : "No") ?? false;
    },
    bugs: ([mode, i, q]) => {
      if (mode === 1) {
        const ok = foldsToCube(HEXOMINOES[i]);
        const ch = mixOrder(`afcube:yn:${i}`, ["Yes, it folds into a cube", "No, it does not fold into a cube"]);
        return [ok ? B("looks-odd", "conceptual", NETS, "The shape looks unusual, but folding it square by square gives six different faces, so it is a cube net. Many different shapes fold into a cube (there are 11 nets).", ch.findIndex((c) => c.startsWith("No"))) : B("six-is-enough", "conceptual", NETS, "Six squares were taken to be enough. When this shape is folded, two squares land on the same face of the cube and one face is left open.", ch.findIndex((c) => c.startsWith("Yes")))];
      }
      const { letters, lab, adj, corner } = cubeOpts([i, q]);
      return [
        ...(adj.length && letters.includes(lab[adj[0]]) ? [B("next-door", "conceptual", NETS, `${lab[adj[0]]} shares an edge with ${lab[q]} in the net, so after folding it is next to ${lab[q]}, not opposite. A face is never opposite a square it touches in the net.`, letters.indexOf(lab[adj[0]]))] : []),
        ...(corner.length && letters.includes(lab[corner[0]]) ? [B("round-corner", "procedural", NETS, `${lab[corner[0]]} does not touch ${lab[q]} in the net, but after folding it is next to it. Fold the net in your mind one square at a time to see where each square ends up.`, letters.indexOf(lab[corner[0]]))] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "fold" && s.inputs[0] === "six squares" ? `Fold it square by square: ${s.value}` : `Folding square by square, face ${s.value} ends up opposite face ${s.inputs[0]}`),
    domain: [[0, 1], [0, 215], [0, 5]],
    keep: ([mode, i, q]) => (mode === 0 ? i < NET_LIST.length : i < HEXOMINOES.length && q === 0 && (foldsToCube(HEXOMINOES[i]) || hh(`afcube:keep:${i}`) % 3 === 0)),
    cap: 400,
    difficulty: ([mode, i]) => (mode === 1 ? 2 : NET_LIST[i].some((c) => NET_LIST[i].filter((d) => d[0] === c[0]).length === 4) ? 1 : 3),
    figure: ([mode, i]) => (mode === 0 ? netPicture(NET_LIST[i], netLabels(i)) : netPicture(HEXOMINOES[i], null)),
    word: ([mode, i, q]) => (mode === 0 ? `${name(i + q)} cuts out the net in the picture to make a dice-shaped gift box, writing a letter on each square. When the box is folded, which letter is opposite ${netLabels(i)[q]}?` : `${name(i)} wants to make a small closed box shaped like a cube from one piece of card cut into the shape in the picture (six squares, ■). Will the card fold into a cube with no gaps or overlaps?`),
    teach: {
      idea: "A net is a solid unfolded flat. For a cube the six squares must fold into six different faces; a square's neighbours in the net become its neighbours on the cube, and the face opposite it is one that never touches it.",
      method: "Pick a square as the bottom and fold up the squares round it one at a time, saying which face each becomes (front, back, left, right, top). Opposite pairs are bottom–top, front–back, left–right; in a straight row of squares, the squares one apart are opposite.",
      alternatives: [
        { id: "straight_row", title: "Squares one apart in a row", kind: "procedural", text: ["In a straight line of three squares, the first and the third fold onto opposite faces.", "Use this rule along every straight row and column of the net; the face left over pairs with the last one."] },
        { id: "make_it", title: "Make it from paper", kind: "conceptual", text: ["Copy the net on squared paper, cut it out and fold it.", "Write the letters on both sides so you can check which faces end up opposite each other."], visual: () => netPicture(fromPicture(CUBE_NETS[0]), ["A", "B", "C", "D", "E", "F"]) },
      ],
    },
    limits: "Nets made of six squares joined edge to edge (all turns and flips); nets of other solids are the afnet family. Making and folding a real net is hands-on.",
  },
  // ============================================================ nets and views of solids
  {
    id: "afnet",
    arity: 2,
    title: "Matching solids with their nets and views",
    competency: NETS,
    type: "choice",
    // [i, f]: solid SOLIDS[i]; f 0 net → solid, 1 solid → net, 2 top and front views → solid, 3 top view, 4 front view, 5 end view lying down
    parse: none,
    reject: (p) => (netOk(p) ? null : "Seventeen solids; nets only for solids that have one, end views only for prisms and the cylinder."),
    choices: netOpts,
    prompt: netPrompt,
    solve: ([i, f]) => {
      const s = SOLIDS[i];
      const want = f === 1 ? s.net! : f === 3 ? s.top : f === 4 ? s.front : f === 5 ? s.end! : s.name;
      return { steps: [st("match", "match", NETS, [s.name, ["net", "net", "views", "top view", "front view", "end view"][f]], want)], answer: netOpts([i, f]).indexOf(want) };
    },
    // independent: work out from the solid's structure (its base, and its faces counted by building it) what its net and
    // views must contain, and check the chosen option against that
    validate: ([i, f], v) => {
      if (typeof v !== "number") return false;
      const opt = netOpts([i, f])[v];
      if (!opt) return false;
      if (f === 0 || f === 2) {
        const j = SOLIDS.findIndex((x) => x.name === opt);
        if (j < 0) return false;
        const sj = structure(j);
        if (f === 0) {
          const net = SOLIDS[i].net!;
          return countPieces(net) === sj.faces && sj.netWords.every((w) => net.includes(w));
        }
        return sj.topWords.every((w) => SOLIDS[i].top.includes(w)) && SOLIDS[i].front === `a ${sj.frontWord}` && (sj.topWords.includes("lines") === SOLIDS[i].top.includes("lines")) && (sj.topWords.includes("dot") === SOLIDS[i].top.includes("dot"));
      }
      const si = structure(i);
      if (f === 1) return countPieces(opt) === si.faces && si.netWords.every((w) => opt.includes(w));
      if (f === 3) return si.topWords.every((w) => opt.includes(w)) && (si.topWords.includes("lines") === opt.includes("lines")) && (si.topWords.includes("dot") === opt.includes("dot"));
      if (f === 4) return opt === `a ${si.frontWord}`;
      return opt === `a ${si.endWord}`;
    },
    bugs: ([i, f]) => {
      const s = SOLIDS[i];
      const o = netOpts([i, f]);
      const field = (j: number) => (f === 1 ? SOLIDS[j].net : f === 3 ? SOLIDS[j].top : f === 4 ? SOLIDS[j].front : f === 5 ? SOLIDS[j].end ?? SOLIDS[j].front : SOLIDS[j].name);
      const [c1, c2] = CONFUSE[i];
      const out: Bug[] = [];
      const add = (id: string, j: number, says: string) => {
        const k = o.indexOf(field(j) ?? "");
        if (k >= 0 && field(j) !== field(i)) out.push(B(id, "conceptual", NETS, says, k));
      };
      if (f <= 2) {
        add("similar-solid", c1, f === 2 ? `The views of ${an(SOLIDS[c1].name)} were mixed up with these. Check both views: the view from above shows the base, the front view shows whether the sides go up straight (a rectangle) or meet at a point (a triangle).` : `The ${SOLIDS[c1].name} was mixed up with the ${s.name}. Count the pieces and look at their shapes: the ends or base tell which solid it is.`);
        add("count-slip", c2, f === 2 ? `These views were not checked carefully against the ${SOLIDS[c2].name}: count the sides of the shape seen from above, and look whether the front view is a rectangle or a triangle.` : `The pieces do not match: count the faces of the solid and check the shape of each piece (the base or ends decide the solid).`);
      } else {
        add("other-view", c1, f === 3 ? "This is what another solid looks like from above. From straight above you see the outline of the base (and, for a pyramid or cone, the point at the top in the middle)." : f === 4 ? "This view belongs to another solid. From the front, a prism or cylinder shows straight upright sides (a rectangle); a pyramid or cone shows sides meeting at a point (a triangle)." : "This view belongs to another solid. Lying on its side with an end facing you, a prism shows its end face (the shape of its base).");
      }
      return out;
    },
    variants: () => [],
    explain: (s) => `The ${s.inputs[1]} of ${an(String(s.inputs[0]))}: ${s.value}`,
    domain: [[0, 16], [0, 5]],
    keep: netOk,
    difficulty: ([i, f]) => (i <= 4 && f !== 5 ? 1 : f <= 1 ? 2 : 3),
    figure: ([i, f]) => (f === 1 || f >= 3 ? SOLIDS[i].fig ?? null : null),
    teach: {
      idea: "A net is the solid's faces unfolded flat; a view is what you see from one side. Both come from the solid's parts: a prism has two equal ends joined by rectangles, a pyramid a base joined by triangles to a point; a cylinder has two circles and a curved side, a cone one circle and a curved side.",
      method: "For a net, count the pieces and look at their shapes: the ends or base name the solid. For a view, picture yourself looking from that side: from above you see the base's outline; from the front, straight upright sides look like a rectangle and sides meeting at a point look like a triangle.",
      alternatives: [
        { id: "unroll", title: "Unroll the curved surface", kind: "conceptual", text: ["Cut a cylinder's curved side straight down and it unrolls into a rectangle; a cone's curved side unrolls into a fan shape (a sector).", "So a cylinder's net is 2 circles and a rectangle, and a cone's is 1 circle and a sector."], visual: () => ({ type: "solid", name: "cone" }) },
        { id: "real_objects", title: "Look at real objects", kind: "procedural", text: ["A tin of oil is a cylinder, a birthday cap a cone, a Toblerone box a triangular prism.", "Hold one at eye level and then look down on it from above; say what shape you see each time."], visual: () => ({ type: "solid", name: "cylinder" }) },
      ],
    },
    limits: "Nets and views described in words (no pictures of nets of solids yet); cube nets drawn on squares are the afcube family. Building solids from nets is hands-on.",
  },
  // ============================================================ views of a building made of cubes
  {
    id: "afview",
    arity: 2,
    title: "Top, front and side views of a building of cubes",
    competency: NETS,
    type: "integer",
    mc: true,
    // [g, ask]: building VIEW_GRIDS[g]; ask 0 top view, 1 front view, 2 right-hand side view: how many squares does it show?
    parse: none,
    reject: ([g, ask]) => (g < 0 || g >= VIEW_GRIDS.length || ask < 0 || ask > 2 ? "Sixty small buildings of cubes, three views." : null),
    prompt: ([, ask]) => `The table is a plan of a building made of cubes standing on a mat: each number tells how many cubes are stacked on that square. The front of the building is the bottom row of the table. When you look at the building ${VIEWASK[ask]}, how many squares do you see?`,
    solve: ([g, ask]) => {
      const G = VIEW_GRIDS[g];
      if (ask === 0) {
        const n = G.flat().filter((x) => x > 0).length;
        return { steps: [st("top", "count", NETS, ["squares with cubes"], n)], answer: n };
      }
      const tall = ask === 1 ? G[0].map((_, c) => Math.max(...G.map((row) => row[c]))) : G.map((row) => Math.max(...row));
      const n = tall.reduce((a, b) => a + b, 0);
      return { steps: [st("tallest", "max", NETS, [ask === 1 ? "each column" : "each row"], tall.join(", ")), st("view", "add", NETS, tall, n)], answer: n };
    },
    // independent: build every cube in space, then flatten the building onto the mat (top), the front wall or the side wall
    validate: ([g, ask], v) => {
      const G = VIEW_GRIDS[g];
      const seen = new Set<string>();
      G.forEach((row, r) => row.forEach((h, c) => {
        for (let z = 0; z < h; z++) seen.add(ask === 0 ? `${r},${c}` : ask === 1 ? `${c},${z}` : `${r},${z}`);
      }));
      return v === seen.size;
    },
    bugs: ([g, ask]) => {
      const G = VIEW_GRIDS[g];
      const total = G.flat().reduce((a, b) => a + b, 0);
      const front = G[0].map((_, c) => Math.max(...G.map((row) => row[c]))).reduce((a, b) => a + b, 0);
      const side = G.map((row) => Math.max(...row)).reduce((a, b) => a + b, 0);
      const top = G.flat().filter((x) => x > 0).length;
      const ans = [top, front, side][ask];
      const keep = (x: number) => (x === ans ? null : x);
      if (ask === 0) return [B("all-cubes", "conceptual", NETS, "Every cube was counted. From above you see only the top of each stack, one square for each square of the mat that has cubes on it.", keep(total)), B("whole-mat", "procedural", NETS, "An empty square of the mat was counted too. Where nothing is stacked you see no cube.", keep(G.length * G[0].length))];
      if (ask === 1) return [B("all-cubes", "conceptual", NETS, "Every cube was counted. From the front, cubes behind each other hide each other: in each column you see only as high as the tallest stack.", keep(total)), B("front-row-only", "procedural", NETS, "Only the front row was looked at. A taller stack further back shows above the front row.", keep(G[G.length - 1].reduce((a, b) => a + b, 0)))];
      return [B("all-cubes", "conceptual", NETS, "Every cube was counted. From the side, cubes in the same row hide each other: in each row you see only as high as the tallest stack.", keep(total)), B("front-for-side", "procedural", NETS, "The front view was counted instead of the side view. From the right-hand side, each ROW of the plan (from the front to the back) becomes one column of the view.", keep(front))];
    },
    distractors: ([g, ask]) => {
      const G = VIEW_GRIDS[g];
      const top = G.flat().filter((x) => x > 0).length;
      const front = G[0].map((_, c) => Math.max(...G.map((row) => row[c]))).reduce((a, b) => a + b, 0);
      const side = G.map((row) => Math.max(...row)).reduce((a, b) => a + b, 0);
      const a = [top, front, side][ask];
      return [a + 1, a - 1, a + 2, a - 2].filter((x) => x > 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "top" ? `From above, one square for each square of the mat with cubes: ${s.value}` : s.id === "tallest" ? `The tallest stack in ${s.inputs[0]}: ${s.value}` : `Add them: ${s.value} squares`),
    domain: [[0, 59], [0, 2]],
    difficulty: ([g, ask]) => (ask === 0 ? 1 : VIEW_GRIDS[g].length === 2 ? 2 : 3),
    figure: ([g]) => {
      const G = VIEW_GRIDS[g];
      return { type: "table", head: ["", ...G[0].map((_, c) => (c === 0 ? "left" : c === G[0].length - 1 ? "right" : ""))], rows: G.map((row, r) => [r === 0 ? "back" : r === G.length - 1 ? "front" : "", ...row.map(String)]) };
    },
    word: ([, ask]) => `In a shop, boxes of the same size are stacked on a floor marked in squares, as the plan in the table shows (each number is how many boxes are piled on that square; the front is the bottom row). A security camera looks at the stacks ${VIEWASK[ask]}. How many box faces does the camera see?`,
    teach: {
      idea: "A view shows only what faces you: from above, the top of each stack; from the front, the tallest stack in each column (cubes behind are hidden); from the side, the tallest stack in each row.",
      method: "Top view: count the squares that have cubes. Front view: for each column find the biggest number and add these. Side view: for each row find the biggest number and add these.",
      alternatives: [
        { id: "build_it", title: "Build it with blocks", kind: "conceptual", text: ["Build the stacks with cubes or matchboxes on squares drawn on paper.", "Crouch down to eye level in front of them and count the squares you see, then do the same from the side."], visual: () => ({ type: "solid", name: "cube" }) },
        { id: "draw_views", title: "Draw each view on squared paper", kind: "procedural", text: ["For the front view, draw one column for each column of the plan, as tall as its tallest stack.", "Count the squares in your drawing."] },
      ],
    },
    limits: "Buildings of up to 18 cubes on 2 × 2 to 3 × 3 mats, every stack resting on the mat; counting squares in a view stands in for drawing it (drawing views is an educator-marked task).",
  },
  // ============================================================ the rule of a sequence
  {
    id: "affrule",
    arity: 3,
    title: "Which rule makes the sequence?",
    competency: FIG,
    type: "choice",
    // [kind, a, k]: kind 0 squares, 1 triangular, 2 cubes, 3 powers of 2, 4 odd numbers, 5 add k; a = where the five terms start
    parse: none,
    reject: (p) => (ruleOk(p) ? null : "Square, triangular, cube, power-of-2 and odd-number sequences from different starts, and add-k sequences."),
    choices: (p) => ruleOpts(p).rules.map((r) => r.text),
    prompt: (p) => `Look at the sequence ${ruleTerms(p).join(", ")}, … Which rule makes it?`,
    solve: (p) => {
      const t = ruleTerms(p);
      const { rules, right } = ruleOpts(p);
      return { steps: [st("gaps", "subtract", FIG, t, t.slice(1).map((x, i) => x - t[i]).join(", ")), st("rule", "match", FIG, [rules[right].text], rules[right].text)], answer: right };
    },
    // independent: test every offered rule against all five terms; exactly one may fit, and it must be the chosen one
    validate: (p, v) => {
      const t = ruleTerms(p);
      const { rules } = ruleOpts(p);
      return typeof v === "number" && rules.filter((r) => r.fits(t)).length === 1 && !!rules[v]?.fits(t);
    },
    bugs: (p) => {
      const t = ruleTerms(p);
      const { gap, near } = ruleOpts(p);
      const gaps = t.slice(1).map((x, i) => x - t[i]);
      const kind = p[0];
      if (kind === 4)
        return [
          B("odd-even", "conceptual", FIG, `The numbers go up in 2s, as the even numbers do, but ${t[0]}, ${t[1]}, … are odd numbers (they end in 1, 3, 5, 7 or 9).`, gap),
          B("step-miscount", "procedural", FIG, `The step from one number to the next was miscounted: ${t[0]} to ${t[1]} is ${gaps[0]}.`, near),
        ];
      if (kind === 5)
        return [
          B("step-miscount", "procedural", FIG, `The step from one number to the next was miscounted by one: ${t[0]} to ${t[1]} is ${gaps[0]}. Count on from ${t[0]} to check.`, gap),
          B("step-miscount-down", "procedural", FIG, `The step was counted one too small: ${t[0]} + ${gaps[0] - 1} = ${t[0] + gaps[0] - 1}, not ${t[1]}.`, near),
        ];
      return [
        B("first-gap", "procedural", FIG, `Only the first step (${t[0]} to ${t[1]}) was checked. A rule must work for every step; here the steps are ${gaps.join(", ")}.`, gap),
        B("untested-rule", "conceptual", FIG, `A rule was chosen without testing it on the numbers. Try it on each number: does it really give ${t[1]}, ${t[2]}, ${t[3]}, …?`, near),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "gaps" ? `The steps from one number to the next are ${s.value}` : `The rule that fits every number: ${s.value}`),
    domain: [[0, 5], [0, 30], [0, 12]],
    keep: ruleOk,
    cap: 300,
    difficulty: ([kind]) => (kind === 4 || kind === 5 ? 1 : kind === 0 || kind === 3 ? 2 : 3),
    word: (p) => `${name(p[0] + p[1])} records the number of ${["tiles in square floor patterns", "glasses in triangular stacks", "small cubes in bigger cubes", "bacteria in a dish counted every hour", "beads in each row of a necklace pattern", "seats in each row of a hall"][p[0]]}: ${ruleTerms(p).join(", ")}, … Which rule makes these numbers?`,
    teach: {
      idea: "A rule must explain EVERY number of the sequence, not just the first step. Look at the steps between numbers: equal steps mean 'add the same each time'; steps that grow by 1 give triangular numbers, by 2 square numbers; numbers that double are powers of 2.",
      method: "Write the steps (differences) between neighbouring numbers. If they are equal, the rule adds that number. If not, test the special sequences (squares, triangular, cubes, doubling) on all the numbers.",
      alternatives: [
        { id: "steps_table", title: "A table of steps", kind: "procedural", text: ["Write the numbers in a row and the steps between them underneath.", "If the steps themselves follow a pattern, write the steps of the steps: for square numbers they are all 2."], visual: (p) => ({ type: "table", head: ["Number", ...ruleTerms(p).map(String)], rows: [["Step", "", ...ruleTerms(p).slice(1).map((x, i) => String(x - ruleTerms(p)[i]))]] }) },
        { id: "pictures", title: "Draw the numbers as dots", kind: "conceptual", text: ["Square numbers make squares of dots, triangular numbers make triangles, and doubling makes two copies of the last picture.", "Draw the first few as dots and see which picture fits."], visual: () => ({ type: "dots", count: 9, rows: 3 }) },
      ],
    },
    limits: "Five terms of squares, triangular numbers, cubes, powers of 2, odd numbers or add-k sequences, from different starting points; writing the rule in words or symbols is an educator-marked task.",
  },
);

/** The structure of SOLIDS[j], worked out from its name (base and kind) and by building it: what its net and views contain. */
function structure(j: number): { faces: number; netWords: string[]; topWords: string[]; frontWord: string; endWord: string } {
  const nm = SOLIDS[j].name;
  const m = nm.match(/^(\w+) (prism|pyramid)$/);
  if (m) {
    const n = Number(Object.keys(BASES).find((k) => BASES[Number(k)] === m[1]));
    const solid = m[2] === "prism" ? 0 : 1;
    const [faces] = buildSolid(solid, n);
    const poly = POLY[n];
    return solid === 0 ? { faces, netWords: [poly, "rectangle"], topWords: [poly], frontWord: "rectangle", endWord: poly } : { faces, netWords: n === 3 ? ["triangle"] : [poly, "triangle"], topWords: [poly, "lines"], frontWord: "triangle", endWord: "" };
  }
  const special: Record<string, { faces: number; netWords: string[]; topWords: string[]; frontWord: string; endWord: string }> = {
    cube: { faces: 6, netWords: ["square"], topWords: ["square"], frontWord: "square", endWord: "" },
    cuboid: { faces: 6, netWords: ["rectangle"], topWords: ["rectangle"], frontWord: "rectangle", endWord: "" },
    cylinder: { faces: 3, netWords: ["circle", "rectangle"], topWords: ["circle"], frontWord: "rectangle", endWord: "circle" },
    cone: { faces: 2, netWords: ["circle", "sector"], topWords: ["circle", "dot"], frontWord: "triangle", endWord: "" },
    sphere: { faces: 1, netWords: [], topWords: ["circle"], frontWord: "circle", endWord: "" },
    "hemisphere (flat face down)": { faces: 2, netWords: [], topWords: ["circle"], frontWord: "semicircle", endWord: "" },
  };
  return special[nm];
}
/** The number of pieces in a net described in words ("2 hexagons and 6 rectangles" → 8). */
function countPieces(t: string) {
  return (t.replace(/\(.*?\)/g, "").match(/\d+/g) ?? []).map(Number).reduce((a, b) => a + b, 0);
}
