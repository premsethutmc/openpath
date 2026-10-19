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
/** A three-digit sum or difference with at least one carry or borrow. */
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
/** The carry (addition) or borrow (subtraction) arriving at column pos (0 hundreds, 1 tens, 2 ones). */
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
          st("carry", op === 0 ? "carry" : "borrow", op === 0 ? "MATH.number.addition-regroup" : SUBR, [pos], inc),
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
        out.push({ id: "smaller-from-larger", kind: "conceptual", competency: SUBR, says: "In that column the smaller digit was taken from the larger one. When the top digit is smaller, borrow a ten from the next column.", predict: Math.abs(A[k] - B[k]) });
        out.push({ id: "borrow-forgotten", kind: "procedural", competency: SUBR, says: "The ten borrowed by the column on the right was not taken off this column.", predict: (A[k] - B[k] + 10) % 10 });
      }
      if (op === 1 && where === 0) {
        out.push({ id: "borrow-forgotten", kind: "procedural", competency: SUBR, says: "Working backwards, the borrow from the column on the right was forgotten. The first number is the answer plus the number taken away.", predict: (R[k] + B[k]) % 10 });
        out.push({ id: "subtract-not-undo", kind: "conceptual", competency: SUBR, says: "To find the first number of a subtraction, add the answer and the number taken away; the digits were subtracted instead.", predict: Math.abs(R[k] - B[k]) });
      }
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "carry" ? (Number(s.value) ? `The column to the right ${s.op === "carry" ? "makes a carry of 1 into this column" : "borrows 1 ten from this column"}` : "The column to the right does not carry or borrow") : `Work the hidden column, using the ${s.inputs[2] === 0 ? "carry" : "borrow"}: the missing digit is ${s.value}`),
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
      idea: "A sum or difference is a true sentence, so each column must work out, including any ten carried or borrowed from the column on its right.",
      method: "Start from the ones column and move left. In each column, note whether a ten is carried (addition) or borrowed (subtraction), then find the digit that makes the hidden column right. Check by doing the whole calculation.",
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
    reject: ([a, k, n, ctx]) => (a < 1 || a > 4 || k < 2 || k > 8 || (k > 5 && !(k === 8 && a === 1)) || n < 2 || n > 6 || (ctx !== 0 && ctx !== 1) || a * k ** n > 1000 ? "a × kⁿ pieces, at most 1000." : null),
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
    keep: ([a, k, n]) => (k <= 5 || (k === 8 && a === 1)) && a * k ** n <= 1000,
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
