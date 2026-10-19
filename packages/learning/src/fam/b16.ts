/**
 * Batch b16 (families@2): Grades 11–12 algebra. Sequences and series (arithmetic and geometric means, AM ≥ GM,
 * binomial, exponential and logarithmic series, general terms, sigma notation, standard sums and telescoping),
 * Cartesian products, intervals, inverse functions, linear programming, matrices, systems by matrices, theory of
 * equations (roots in progression, rational roots, conjugate roots, Descartes' rule, Vieta), adjoint and inverse,
 * rank. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { gcd, near, sup } from "../family-kit";
import { evaluate, parse } from "../answer-types";

// ---------------------------------------------------------------- competencies
const AMGM = "MATH.sequences.am-gm-relation";
const SER = "MATH.sequences.infinite-series-expansions";
const NOTE = "MATH.sequences.sequence-notation";
const SUM = "MATH.sequences.series-summation";
const CART = "MATH.sets-relations.cartesian-product";
const IVL = "MATH.sets-relations.real-intervals";
const INV = "MATH.algebra.inverse-functions";
const LP = "MATH.algebra.linear-programming";
const MAT = "MATH.algebra.matrices";
const MSYS = "MATH.algebra.matrix-systems";
const PES = "MATH.algebra.polynomial-equation-solving";
const PRA = "MATH.algebra.polynomial-root-analysis";
const VIETA = "MATH.algebra.vieta-relations";
const ADJ = "MATH.matrices.adjoint-inverse";
const RANK = "MATH.matrices.rank-row-reduction";
const AP = "MATH.algebra.arithmetic-sequences";
const GP = "MATH.algebra.geometric-sequences";
const BIN = "MATH.algebra.binomial";
const LOG = "MATH.algebra.logarithms";
const PSUM = "MATH.sequences.power-sums";
const PFR = "MATH.algebra.partial-fractions";
const SETS = "MATH.algebra.sets";
const REL = "MATH.algebra.relations";
const INEQ = "MATH.algebra.inequalities";
const LIN = "MATH.algebra.linear-equations";
const FUN = "MATH.algebra.functions";
const DET = "MATH.algebra.determinants";
const POLY = "MATH.algebra.polynomials";
const FACT = "MATH.algebra.factor-theorem";
const RAD = "MATH.number.radicals";
const IDEN = "MATH.algebra.identities";
const INT = "MATH.number.integer-add";
const FRAC = "MATH.number.fraction-add";
const SYS3 = "MATH.algebra.linear-systems-three-variables";

// ---------------------------------------------------------------- helpers
const none = () => null;
const fnv = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Selvi", "Karthik", "Priya"];
const name = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
/** A number as printed: − for minus. */
const n_ = (v: number) => (v < 0 ? `−${-v}` : String(v));
const B = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Value | null, probe?: string): Bug => ({ id, kind, competency, says, predict, ...(probe ? { probe } : {}) });
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
const fact = (n: number) => (n <= 1 ? 1 : n * fact(n - 1));

// exact rationals (small numbers only)
type R = [number, number];
const rr = (n: number, d = 1): R => {
  if (d === 0) throw new Error("division by zero");
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return [((n / g) * s) || 0, (d / g) * s];
};
const radd = (a: R, b: R) => rr(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const rsub = (a: R, b: R) => rr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const rmul = (a: R, b: R) => rr(a[0] * b[0], a[1] * b[1]);
const rdiv = (a: R, b: R) => rr(a[0] * b[1], a[1] * b[0]);
const req = (a: R, b: R) => a[0] === b[0] && a[1] === b[1];
const rv = (a: R) => a[0] / a[1];
const rpow = (a: R, n: number): R => (n === 0 ? [1, 1] : rmul(a, rpow(a, n - 1)));
/** A rational as printed: "−3/2", "4". */
const rs = (a: R) => `${n_(a[0])}${a[1] === 1 ? "" : `/${a[1]}`}`;
const readR = (t: string): R | null => {
  const m = t.trim().replace(/−/g, "-").match(/^(-?\d+)(?:\/(\d+))?$/);
  return m ? rr(Number(m[1]), m[2] ? Number(m[2]) : 1) : null;
};
const tup = (xs: R[]) => `(${xs.map(rs).join(", ")})`;
const readList = (t: string): R[] | null => {
  const s = t.trim();
  if (!s.startsWith("(") || !s.endsWith(")")) return null;
  const out = s.slice(1, -1).split(",").map(readR);
  return out.some((x) => !x) ? null : (out as R[]);
};
type M = R[][];
const toM = (A: number[][]): M => A.map((r) => r.map((x) => rr(x)));
const matS = (A: M) => `[${A.map((r) => `[${r.map(rs).join(", ")}]`).join(", ")}]`;
const matN = (A: number[][]) => matS(toM(A));
const readMat = (t: string): M | null => {
  const s = t.replace(/\s/g, "").replace(/−/g, "-");
  if (!/^\[\[.*\]\]$/.test(s)) return null;
  const rows = s.slice(2, -2).split("],[").map((r) => r.split(",").map(readR));
  if (rows.some((r) => r.some((x) => !x) || r.length !== rows[0].length)) return null;
  return rows as M;
};
const mmul = (A: M, Bm: M): M => A.map((row) => Bm[0].map((_, j) => row.reduce((s, a, k) => radd(s, rmul(a, Bm[k][j])), [0, 1] as R)));
const mscale = (A: M, k: R): M => A.map((r) => r.map((x) => rmul(x, k)));
const mT = <T,>(A: T[][]): T[][] => A[0].map((_, j) => A.map((r) => r[j]));
const meq = (A: M, Bm: M) => A.length === Bm.length && A.every((r, i) => r.length === Bm[i].length && r.every((x, j) => req(x, Bm[i][j])));
const ident = (n: number): M => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => rr(i === j ? 1 : 0)));

/** A polynomial, highest power first: "2x³ − x + 4" (superscripts) or "2x^3 − x + 4" (as typed). */
function polyS(cs: number[], v = "x", su = true): string {
  const deg = cs.length - 1;
  let out = "";
  cs.forEach((c, i) => {
    if (c === 0) return;
    const e = deg - i;
    const a = Math.abs(c);
    const body = e === 0 ? String(a) : `${a === 1 ? "" : a}${v}${e === 1 ? "" : su ? sup(e) : `^${e}`}`;
    out += out ? ` ${c < 0 ? "−" : "+"} ${body}` : `${c < 0 ? "−" : ""}${body}`;
  });
  return out || "0";
}
/** Horner evaluation of integer coefficients (highest first). */
const horner = (cs: number[], x: number) => cs.reduce((s, c) => s * x + c, 0);
/** Expand Π (x − rᵢ) times k: coefficients highest first. */
function fromRoots(k: number, roots: number[]): number[] {
  let cs = [k];
  for (const r of roots) cs = [...cs, 0].map((c, i) => c - (i > 0 ? r * cs[i - 1] : 0));
  return cs;
}
/** k√m as printed (k may be 1; m = 1 is a whole number). */
const surd = (k: number, m: number) => (m === 1 ? n_(k) : `${k === 1 ? "" : k === -1 ? "−" : n_(k)}√${m}`);
const sqfree = (n: number): [number, number] => {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++) while (m % (p * p) === 0) {
    m /= p * p;
    k *= p;
  }
  return [k, m];
};
/** A typed numeric answer (surd, fraction) evaluated, or NaN. */
const num = (v: Value) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  try {
    return evaluate(parse(v), {});
  } catch {
    return NaN;
  }
};

// complex numbers (independent numerical checks)
type C = [number, number];
const cad = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]];
const csb = (a: C, b: C): C => [a[0] - b[0], a[1] - b[1]];
const cml = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdv = (a: C, b: C): C => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const cexp = (z: C): C => [Math.exp(z[0]) * Math.cos(z[1]), Math.exp(z[0]) * Math.sin(z[1])];
const clog = (z: C): C => [Math.log(Math.hypot(z[0], z[1])), Math.atan2(z[1], z[0])];
const cpow = (z: C, n: number): C => cexp([n * clog(z)[0], n * clog(z)[1]]);
/** The coefficient of zʳ of an analytic f, by Cauchy's integral formula on a circle of radius rho (trapezoid rule). */
function taylor(f: (z: C) => C, r: number, rho: number, N = 256): number {
  let s = 0;
  for (let j = 0; j < N; j++) {
    const t = (2 * Math.PI * j) / N;
    const w = f([rho * Math.cos(t), rho * Math.sin(t)]);
    s += w[0] * Math.cos(r * t) + w[1] * Math.sin(r * t);
  }
  return s / N / rho ** r;
}
/** All complex roots of a polynomial (highest coefficient first), by the Durand–Kerner iteration. */
function croots(cs: number[]): C[] {
  const n = cs.length - 1;
  const a = cs.map((c) => c / cs[0]);
  const p = (z: C) => a.reduce((s: C, c) => cad(cml(s, z), [c, 0]), [0, 0] as C);
  let z: C[] = Array.from({ length: n }, (_, k) => cpow([0.4, 0.9], k));
  for (let it = 0; it < 800; it++) {
    z = z.map((zi, i) => {
      let den: C = [1, 0];
      z.forEach((zj, j) => {
        if (j !== i) den = cml(den, csb(zi, zj));
      });
      return csb(zi, cdv(p(zi), den));
    });
  }
  return z;
}
/** 2 × 2 and 3 × 3 determinants by the rule of Sarrus / cross products (not cofactor expansion). */
const sarrus = (A: number[][]) =>
  A.length === 2
    ? A[0][0] * A[1][1] - A[0][1] * A[1][0]
    : A[0][0] * A[1][1] * A[2][2] + A[0][1] * A[1][2] * A[2][0] + A[0][2] * A[1][0] * A[2][1] - A[0][2] * A[1][1] * A[2][0] - A[0][0] * A[1][2] * A[2][1] - A[0][1] * A[1][0] * A[2][2];
/** Cofactor matrix of a 3 × 3 integer matrix. */
const cofactors = (A: number[][]) =>
  [0, 1, 2].map((i) =>
    [0, 1, 2].map((j) => {
      const r = [0, 1, 2].filter((x) => x !== i);
      const c = [0, 1, 2].filter((x) => x !== j);
      const minor = A[r[0]][c[0]] * A[r[1]][c[1]] - A[r[0]][c[1]] * A[r[1]][c[0]];
      return (i + j) % 2 ? -minor : minor;
    }),
  );
const minors = (A: number[][]) => cofactors(A).map((r, i) => r.map((x, j) => ((i + j) % 2 ? -x : x)));
const m3 = (p: number[], o = 0) => [p.slice(o, o + 3), p.slice(o + 3, o + 6), p.slice(o + 6, o + 9)];
const m2 = (p: number[], o = 0) => [p.slice(o, o + 2), p.slice(o + 2, o + 4)];
/** A linear equation in x, y, z as printed: "2x − y + 3z = 7". */
const eqS = (cs: number[], rhs: number, vars = ["x", "y", "z"]) => {
  let out = "";
  cs.forEach((c, i) => {
    if (c === 0) return;
    const body = `${Math.abs(c) === 1 ? "" : Math.abs(c)}${vars[i]}`;
    out += out ? ` ${c < 0 ? "−" : "+"} ${body}` : `${c < 0 ? "−" : ""}${body}`;
  });
  return `${out} = ${n_(rhs)}`;
};

// intervals: pieces [lo, hi] with closed ends (finite, integer or rational ends)
type Iv = { lo: R; hi: R; lc: boolean; hc: boolean };
const ivS = (iv: Iv) => `${iv.lc ? "[" : "("}${rs(iv.lo)}, ${rs(iv.hi)}${iv.hc ? "]" : ")"}`;
const ivsS = (ivs: Iv[]) => ivs.map(ivS).join(" ∪ ");
const inIv = (iv: Iv, x: R) => {
  const a = rv(rsub(x, iv.lo));
  const b = rv(rsub(iv.hi, x));
  return (a > 0 || (a === 0 && iv.lc)) && (b > 0 || (b === 0 && iv.hc));
};
const readIvs = (t: string): Iv[] | null => {
  const parts = t.split(" ∪ ");
  const out: Iv[] = [];
  for (const p of parts) {
    const m = p.trim().match(/^([[(])(\S+), (\S+)([\])])$/);
    if (!m) return null;
    const lo = readR(m[2]);
    const hi = readR(m[3]);
    if (!lo || !hi) return null;
    out.push({ lo, hi, lc: m[1] === "[", hc: m[4] === "]" });
  }
  return out;
};
const ivCode = (s: number) => ({ lc: (s & 1) === 1, hc: (s & 2) === 2 });

// linear programming: two constraints through the corner (X, Y), both with whole-number intercepts
type LPd = { c1: number; c2: number; x1: number; y1: number; x2: number; y2: number };
const lpOf = ([X, Y, a1, b1, a2, b2]: number[]): LPd | null => {
  const c1 = a1 * X + b1 * Y;
  const c2 = a2 * X + b2 * Y;
  if (c1 % a1 || c1 % b1 || c2 % a2 || c2 % b2) return null;
  return { c1, c2, x1: c1 / a1, y1: c1 / b1, x2: c2 / a2, y2: c2 / b2 };
};
const lpKeep = (p: number[]) => {
  const [, , a1, b1, a2, b2] = p;
  const L = lpOf(p);
  return !!L && gcd(a1, b1) === 1 && gcd(a2, b2) === 1 && L.x1 < L.x2 && L.y1 > L.y2 && L.x2 <= 30 && L.y1 <= 30;
};
const Z = (p: number, q: number, [x, y]: number[]) => p * x + q * y;
const lpCons = (p: number[], ge: boolean) => {
  const [, , a1, b1, a2, b2] = p;
  const L = lpOf(p)!;
  const s = ge ? "≥" : "≤";
  return `${eqS([a1, b1], L.c1, ["x", "y"]).replace("=", s)}, ${eqS([a2, b2], L.c2, ["x", "y"]).replace("=", s)}, x ≥ 0, y ≥ 0`;
};
/** Corner points: of the region below both lines (max) or above both (min). */
const lpCorners = (p: number[], ge: boolean) => {
  const L = lpOf(p)!;
  return ge ? [[L.x2, 0], [p[0], p[1]], [0, L.y1]] : [[0, 0], [L.x1, 0], [p[0], p[1]], [0, L.y2]];
};
const lpWrong = (p: number[], ge: boolean) => {
  const L = lpOf(p)!;
  return ge ? [[L.x1, 0], [0, L.y2]] : [[L.x2, 0], [0, L.y1]];
};
/** Brute force over every whole-number point of the region (all its corners are whole-number points). */
const lpBrute = (p: number[], ge: boolean, P: number, Q: number) => {
  const [, , a1, b1, a2, b2] = p;
  const L = lpOf(p)!;
  let best = ge ? Infinity : -Infinity;
  for (let x = 0; x <= L.x2; x++)
    for (let y = 0; y <= L.y1; y++) {
      const ok = ge ? a1 * x + b1 * y >= L.c1 && a2 * x + b2 * y >= L.c2 : a1 * x + b1 * y <= L.c1 && a2 * x + b2 * y <= L.c2;
      if (ok) best = ge ? Math.min(best, P * x + Q * y) : Math.max(best, P * x + Q * y);
    }
  return best;
};

// sigma-notation options: [lower, upper, coefficient of k, constant]
type Sig = [number, number, number, number];
const sigS = ([lo, hi, c1, c0]: Sig) => `Σ (k = ${lo} to ${hi}) (${polyS([c1, c0], "k")})`;
const sigOpts = ([a, d, m]: number[]): Sig[] => {
  const l = a + (m - 1) * d;
  return [[1, m, d, a - d], [1, m, d, a], [0, m, d, a], l >= 2 && l !== m && l <= 60 ? [1, l, d, a - d] : [1, m - 1, d, a - d]];
};
const sigOrder = (p: number[]) => {
  const o = sigOpts(p);
  return o.map((s, i) => ({ s, i, h: fnv(`apsigch:${p}:${sigS(s)}`) })).sort((x, y) => x.h - y.h);
};

// rank: rows generated from a seed
function rankRows(r: number, seed: number): number[][] {
  let s = (fnv(`rank:${r}:${seed}`) % 2147483647) || 7;
  const rnd = (lo: number, hi: number) => {
    s = (s * 48271) % 2147483647;
    return lo + (s % (hi - lo + 1));
  };
  const vec = () => [0, 1, 2, 3].map(() => rnd(-3, 3));
  const prop = (u: number[], v: number[]) => u.every((x, i) => u.every((y, j) => x * v[j] === y * v[i]));
  const nz = (u: number[]) => u.filter((x) => x !== 0).length;
  for (let tries = 0; tries < 500; tries++) {
    if (r === 1) {
      const v = vec();
      if (nz(v) < 3 || gcd(gcd(v[0], v[1]), gcd(v[2], v[3])) !== 1) continue;
      const ks = [1, [-2, -1, 2, 3][rnd(0, 3)], [-3, -2, 2, 3][rnd(0, 3)]];
      return ks.map((k) => v.map((x) => k * x));
    }
    const u = vec();
    const v = vec();
    if (nz(u) < 3 || nz(v) < 3 || prop(u, v)) continue;
    let w: number[];
    if (r === 2) {
      const al = [1, -1, 2][rnd(0, 2)];
      const be = [1, -1, 2, -2][rnd(0, 3)];
      w = u.map((x, i) => al * x + be * v[i]);
      if (nz(w) < 2 || w.some((x) => Math.abs(x) > 9) || prop(w, u) || prop(w, v)) continue;
    } else {
      w = vec();
      if (nz(w) < 3 || rankMinors([u, v, w]) !== 3) continue;
    }
    const rows = [u, v, w];
    const k = rnd(0, 2);
    return [rows[k], rows[(k + 1) % 3], rows[(k + 2) % 3]];
  }
  return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]].slice(0, 3);
}
/** Rank by the largest non-zero minor (independent of row reduction). */
function rankMinors(A: number[][]): number {
  const cols = [0, 1, 2, 3];
  for (const skip of cols) {
    const c = cols.filter((x) => x !== skip);
    if (sarrus(A.map((row) => c.map((j) => row[j]))) !== 0) return 3;
  }
  for (const [i1, i2] of [[0, 1], [0, 2], [1, 2]]) for (let j1 = 0; j1 < 4; j1++) for (let j2 = j1 + 1; j2 < 4; j2++) if (A[i1][j1] * A[i2][j2] - A[i1][j2] * A[i2][j1] !== 0) return 2;
  return A.some((r) => r.some((x) => x !== 0)) ? 1 : 0;
}
/** Rank by Gaussian elimination over the rationals (the solution's method). */
function rankElim(A: number[][]): number {
  const Mx = toM(A);
  let row = 0;
  for (let c = 0; c < 4 && row < 3; c++) {
    const piv = [0, 1, 2].find((i) => i >= row && Mx[i][c][0] !== 0);
    if (piv === undefined) continue;
    [Mx[row], Mx[piv]] = [Mx[piv], Mx[row]];
    for (let i = row + 1; i < 3; i++) {
      const f = rdiv(Mx[i][c], Mx[row][c]);
      Mx[i] = Mx[i].map((x, j) => rsub(x, rmul(f, Mx[row][j])));
    }
    row++;
  }
  return row;
}

const PRICES = [20, 25, 30, 40, 45, 50, 60, 80];
const SURDS = [2, 3, 5, 6, 7];
const SHAPE = (n: number) => ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].slice(0, n);

export const B16: Def[] = [
  // ================================================================ AM, GM and AM ≥ GM
  {
    id: "apins",
    arity: 3,
    title: "Inserting arithmetic means between two numbers",
    competency: AMGM,
    type: "tuple",
    mc: true,
    parse: none,
    // [a, d, k]: k arithmetic means between a and a + (k + 1)d
    reject: ([a, d, k]) => (d === 0 || k < 2 || k > 5 || a < -10 || a > 20 || d < -6 || d > 9 ? "Two to five means between whole numbers, with a whole-number common difference." : null),
    prompt: ([a, d, k]) => `Insert ${k} arithmetic means between ${n_(a)} and ${n_(a + (k + 1) * d)}. Write the means in order, in brackets, separated by commas.`,
    solve: ([a, d, k]) => {
      const b = a + (k + 1) * d;
      const means = Array.from({ length: k }, (_, i) => rr(a + (i + 1) * d));
      return {
        steps: [
          st("terms", "count", AP, [k], k + 2),
          st("difference", "divide", AP, [b - a, k + 1], d),
          st("means", "add", AMGM, [a, d], tup(means)),
        ],
        answer: tup(means),
      };
    },
    // independent: with the two given numbers at the ends, every gap must be the same
    validate: ([a, d, k], v) => {
      const l = typeof v === "string" ? readList(v) : null;
      if (!l || l.length !== k) return false;
      const all = [rr(a), ...l, rr(a + (k + 1) * d)];
      const gap = rsub(all[1], all[0]);
      return all.every((x, i) => i === 0 || req(rsub(x, all[i - 1]), gap));
    },
    bugs: ([a, d, k]) => {
      const b = a + (k + 1) * d;
      const by = (n: number) => tup(Array.from({ length: k }, (_, i) => radd(rr(a), rmul(rr(b - a, n), rr(i + 1)))));
      return [
        B("divide-by-k", "conceptual", AMGM, `The difference ${n_(b)} − ${par(a)} was split into ${k} equal parts; ${k} means make ${k + 1} gaps between ${n_(a)} and ${n_(b)}.`, by(k)),
        B("count-ends-as-gaps", "procedural", AP, `The difference was split into ${k + 2} parts, as if the two given numbers were gaps too; there are ${k + 2} terms but only ${k + 1} gaps.`, by(k + 2)),
        B("ends-listed", "procedural", AMGM, `The two given numbers were listed as well; the means are only the numbers in between.`, tup(Array.from({ length: k + 2 }, (_, i) => rr(a + i * d)))),
      ];
    },
    distractors: ([a, d, k]) => [tup(Array.from({ length: k }, (_, i) => rr(a + (k - i) * d))), tup(Array.from({ length: k }, (_, i) => rr(a + (i + 1) * (d + 1))))],
    variants: () => [],
    explain: (s) => (s.id === "terms" ? `With ${s.inputs[0]} means there are ${s.value} terms in all, so ${Number(s.value) - 1} equal gaps` : s.id === "difference" ? `d = ${n_(Number(s.inputs[0]))} ÷ ${s.inputs[1]} = ${n_(Number(s.value))}` : `Add d again and again: ${s.value}`),
    domain: [[-10, 20], [-6, 9], [2, 5]],
    keep: ([, d]) => d !== 0,
    cap: 400,
    difficulty: ([a, d, k]) => (k === 2 && d > 0 && a >= 0 ? 1 : d > 0 ? 2 : 3),
    word: ([a, d, k]) => `${name(a + k)} lays ${k + 2} number cards in a row. The first card shows ${n_(a)} and the last shows ${n_(a + (k + 1) * d)}, and the numbers change by the same amount from each card to the next. What are the numbers on the ${k} cards in between? Write them in order, in brackets, separated by commas.`,
    teach: {
      idea: "Inserting k arithmetic means between a and b makes an arithmetic progression of k + 2 terms with a first and b last, so b = a + (k + 1)d.",
      method: "Find d = (b − a)/(k + 1), then add d to a again and again to get the k means.",
      alternatives: [
        { id: "number_line", title: "Equal jumps on a number line", kind: "conceptual", text: ["Mark a and b on a number line. The k means cut the distance into k + 1 equal jumps.", "One jump is (b − a)/(k + 1); jump from a to get each mean."], visual: ([a, d, k]) => ({ type: "numberline", from: Math.min(a, a + (k + 1) * d), to: Math.max(a, a + (k + 1) * d), marks: Array.from({ length: k + 2 }, (_, i) => a + i * d) }) },
      ],
    },
    limits: "Two to five means with a whole-number common difference; the AM of just two numbers (one mean) is a single number and is left to the AM-GM family.",
  },
  {
    id: "apgms",
    arity: 4,
    title: "Inserting geometric means between two numbers",
    competency: AMGM,
    type: "tuple",
    mc: true,
    parse: none,
    // [a, r, k, s]: k positive geometric means between a and a r^(k+1) (s = 0), or the other way round (s = 1)
    reject: ([a, r, k, s]) => (a < 1 || a > 9 || r < 2 || r > 5 || k < 2 || k > 3 || (s !== 0 && s !== 1) || a * r ** (k + 1) > 3000 ? "Two or three positive means with a whole-number ratio, ends up to 3000." : null),
    prompt: (p) => {
      const [f, l] = gmEnds(p);
      return `Insert ${p[2]} geometric means between ${f} and ${l}, all of them positive. Write the means in order, in brackets, separated by commas.`;
    },
    solve: (p) => {
      const [a, r, k, s] = p;
      const [f, l] = gmEnds(p);
      const R = s ? rr(1, r) : rr(r);
      const means = gmMeans(p);
      return {
        steps: [
          st("ratio-power", "divide", GP, [l, f], rs(rdiv(rr(l), rr(f)))),
          st("ratio", "root", GP, [rs(rdiv(rr(l), rr(f))), k + 1], rs(R)),
          st("means", "multiply", AMGM, [f, rs(R)], tup(means)),
        ],
        answer: tup(means),
      };
      void a;
    },
    // independent: with the two given numbers at the ends, every ratio of neighbours must be the same and positive
    validate: (p, v) => {
      const [f, l] = gmEnds(p);
      const m = typeof v === "string" ? readList(v) : null;
      if (!m || m.length !== p[2] || m.some((x) => x[0] <= 0)) return false;
      const all = [rr(f), ...m, rr(l)];
      const q = rdiv(all[1], all[0]);
      return all.every((x, i) => i === 0 || req(rdiv(x, all[i - 1]), q));
    },
    bugs: (p) => {
      const [, , k] = p;
      const [f, l] = gmEnds(p);
      const am = tup(Array.from({ length: k }, (_, i) => radd(rr(f), rmul(rr(l - f, k + 1), rr(i + 1)))));
      const out = [B("arithmetic-means", "conceptual", AMGM, "Equal differences were used; geometric means go up (or down) by the same FACTOR, not the same amount.", am)];
      // the ratio taken as the k-th root instead of the (k + 1)-th: only when that root is a whole number or its reciprocal
      const q = Math.max(f, l) / Math.min(f, l);
      const root = Math.round(q ** (1 / k));
      if (root ** k === q) {
        const R = f < l ? rr(root) : rr(1, root);
        out.push(B("root-k", "procedural", GP, `The ratio was found as the ${k === 2 ? "square" : "cube"} root of ${l}/${f}; with ${k} means there are ${k + 1} steps, so it is the ${k + 1 === 3 ? "cube" : "fourth"} root.`, tup(Array.from({ length: k }, (_, i) => rmul(rr(f), rpow(R, i + 1))))));
      }
      out.push(B("ends-listed", "procedural", AMGM, "The two given numbers were listed as well; the means are only the numbers in between.", tup([rr(f), ...gmMeans(p), rr(l)])));
      return out;
    },
    distractors: (p) => [tup([...gmMeans(p)].reverse()), tup(gmMeans(p).map((x) => rmul(x, rr(2))))],
    variants: () => [],
    explain: (s) => (s.id === "ratio-power" ? `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}: this is r multiplied by itself once for each step` : s.id === "ratio" ? `r = the ${s.inputs[1] === 3 ? "cube" : "fourth"} root of ${s.inputs[0]} = ${s.value}` : `Multiply by r again and again: ${s.value}`),
    domain: [[1, 9], [2, 5], [2, 3], [0, 1]],
    difficulty: ([, r, k, s]) => (k === 2 && r <= 3 && !s ? 1 : s ? 3 : 2),
    word: (p) => {
      const [f, l] = gmEnds(p);
      const k = p[2];
      return p[3]
        ? `The amount of a medicine in a patient's blood falls by the same factor every hour. It is ${f} mg at noon and ${l} mg ${k + 1} hours later. How many mg are there at each of the ${k} whole hours in between? Write the amounts in order, in brackets, separated by commas.`
        : `A culture of bacteria in a lab grows by the same factor every hour. It has ${f} thousand cells at 9 am and ${l} thousand cells ${k + 1} hours later. How many thousand cells are there at each of the ${k} whole hours in between? Write them in order, in brackets, separated by commas.`;
    },
    teach: {
      idea: "Inserting k geometric means between a and b makes a geometric progression of k + 2 terms, so b = a·r^(k + 1).",
      method: "Find r = (b/a)^(1/(k + 1)) (the positive root, since the means are positive), then multiply a by r again and again.",
      alternatives: [
        { id: "powers_ap", title: "The powers of r form an AP", kind: "conceptual", text: ["The terms are a·r⁰, a·r¹, …, a·r^(k + 1): the powers 0, 1, …, k + 1 are equally spaced.", "So b/a is r to the power (number of steps); try r = 2, 3, … until r^(k + 1) = b/a."] },
      ],
    },
    limits: "Two or three positive geometric means with a whole-number ratio (or its reciprocal); one mean, √(ab), is part of the AM-GM family.",
  },
  {
    id: "apamgm",
    arity: 2,
    title: "The least value of ax + b/x by AM ≥ GM",
    competency: AMGM,
    type: "exact",
    mc: true,
    parse: none,
    reject: ([a, b]) => (a < 1 || a > 12 || b < 1 || b > 30 ? "ax + b/x for x > 0 with 1 ≤ a ≤ 12 and 1 ≤ b ≤ 30." : null),
    prompt: ([a, b]) => `For x > 0, find the least value of ${a === 1 ? "" : a}x + ${b}/x. Give the exact value (a surd such as 4√3 is fine).`,
    solve: ([a, b]) => {
      const [k, m] = sqfree(a * b);
      return {
        steps: [
          st("product", "multiply", AMGM, [`${a === 1 ? "" : a}x`, `${b}/x`], a * b),
          st("gm", "root", RAD, [a * b], surd(k, m)),
          st("least", "multiply", AMGM, [2, surd(k, m)], surd(2 * k, m)),
        ],
        answer: surd(2 * k, m),
      };
    },
    // independent: a ternary search for the least value of the function itself
    validate: ([a, b], v) => {
      const g = (x: number) => a * x + b / x;
      let lo = 1e-4;
      let hi = 200;
      for (let i = 0; i < 300; i++) {
        const m1 = lo + (hi - lo) / 3;
        const m2 = hi - (hi - lo) / 3;
        if (g(m1) < g(m2)) hi = m2;
        else lo = m1;
      }
      const val = num(v);
      return Number.isFinite(val) && near(val, g((lo + hi) / 2), 1e-8);
    },
    bugs: ([a, b]) => {
      const [k, m] = sqfree(a * b);
      // x at the least value: √(b/a) = k√m / a
      const c = rr(k, a);
      const xs = m === 1 ? rs(c) : `${c[0] === 1 ? "" : c[0]}√${m}${c[1] === 1 ? "" : `/${c[1]}`}`;
      return [
        B("forgot-two", "procedural", AMGM, `Only the GM √(${a * b}) was given; AM ≥ GM says (ax + b/x)/2 ≥ √(ab), so the sum itself is at least 2√(ab).`, surd(k, m)),
        B("x-is-one", "conceptual", AMGM, "x = 1 was put in; the least value is where the two terms are equal (ax = b/x), not at x = 1.", String(a + b)),
        B("gave-x", "procedural", AMGM, `The value of x where the least value happens (x = √(b/a)) was given, not the least value of the expression.`, xs),
      ];
    },
    distractors: ([a, b]) => {
      const [k, m] = sqfree(a * b);
      return [surd(4 * k, m), String(2 * a * b)];
    },
    variants: () => [],
    explain: (s) => (s.id === "product" ? `(${s.inputs[0]})(${s.inputs[1]}) = ${s.value}: x cancels, so the product is fixed` : s.id === "gm" ? `GM = √${s.inputs[0]} = ${s.value}` : `AM ≥ GM: the sum ≥ 2 × ${s.inputs[1]} = ${s.value}, with equality when the two terms are equal`),
    domain: [[1, 12], [1, 30]],
    cap: 360,
    difficulty: ([a, b]) => (sqfree(a * b)[1] === 1 ? 1 : a === 1 ? 2 : 3),
    word: ([a, b]) => `A transport company finds that when a lorry runs at x tens of km/h (x > 0), the fuel and driver cost of a trip is ₹(${a === 1 ? "" : a}x + ${b}/x) thousand. What is the least possible cost of the trip, in thousands of rupees? Give the exact value.`,
    teach: {
      idea: "For positive p and q, (p + q)/2 ≥ √(pq), with equality exactly when p = q. Here p = ax and q = b/x have a fixed product ab.",
      method: "Multiply the two terms: (ax)(b/x) = ab. So ax + b/x ≥ 2√(ab), and the value 2√(ab) is reached when ax = b/x, i.e. x = √(b/a).",
      alternatives: [
        { id: "square", title: "Complete the square", kind: "procedural", text: ["ax + b/x = (√(ax) − √(b/x))² + 2√(ab).", "A square is never negative, so the least value is 2√(ab), when the square is 0."] },
      ],
    },
    limits: "Expressions ax + b/x with x > 0 and small whole a, b; AM ≥ GM for three or more terms is not included.",
  },

  // ================================================================ binomial, exponential and logarithmic series
  {
    id: "apbin",
    arity: 4,
    title: "A coefficient in the binomial series for a rational index",
    competency: SER,
    type: "exact",
    mc: true,
    parse: none,
    // [p, q, k, r]: coefficient of x^r in (1 + kx)^(p/q)
    reject: ([p, q, k, r]) => (q < 1 || q > 3 || p < -3 || p > 3 || p === 0 || gcd(Math.abs(p), q) !== 1 || (q === 1 && p > 0) || k === 0 || Math.abs(k) > 3 || r < 2 || r > 3 ? "Index p/q (negative whole number or a fraction with denominator 2 or 3), 1 + kx with |k| ≤ 3, x² or x³." : null),
    prompt: ([p, q, k, r]) => `Find the coefficient of x${sup(r)} in the expansion of (1 ${k < 0 ? "−" : "+"} ${Math.abs(k) === 1 ? "" : Math.abs(k)}x)^(${idx(p, q)}) in ascending powers of x, for |${Math.abs(k) === 1 ? "" : Math.abs(k)}x| < 1.`,
    solve: ([p, q, k, r]) => {
      const n = rr(p, q);
      let fall: R = [1, 1];
      for (let i = 0; i < r; i++) fall = rmul(fall, rsub(n, rr(i)));
      const cnr = rdiv(fall, rr(fact(r)));
      const ans = rmul(cnr, rr(k ** r));
      return {
        steps: [
          st("falling", "multiply", BIN, [rs(n), r], rs(fall)),
          st("choose", "divide", BIN, [rs(fall), fact(r)], rs(cnr)),
          st("power", "multiply", SER, [rs(cnr), `${n_(k)}${sup(r)}`], rs(ans)),
        ],
        answer: rs(ans),
      };
    },
    // independent: Cauchy's integral formula for the coefficient, computed numerically on a circle
    validate: ([p, q, k, r], v) => {
      const c = taylor((z) => cpow(cad([1, 0], [k * z[0], k * z[1]]), p / q), r, 0.5 / Math.abs(k));
      const val = num(v);
      return Number.isFinite(val) && near(val, c, 1e-8);
    },
    bugs: ([p, q, k, r]) => {
      const n = rr(p, q);
      let fall: R = [1, 1];
      let rise: R = [1, 1];
      for (let i = 0; i < r; i++) {
        fall = rmul(fall, rsub(n, rr(i)));
        rise = rmul(rise, radd(n, rr(i)));
      }
      const cnr = rdiv(fall, rr(fact(r)));
      return [
        ...(Math.abs(k) !== 1 ? [B("power-of-k-left-out", "procedural", SER, `The coefficient of yʳ in (1 + y)ⁿ was given, but y = ${n_(k)}x, so it must be multiplied by (${n_(k)})${sup(r)}.`, rs(cnr))] : []),
        ...(k < 0 && r % 2 === 1 ? [B("sign-of-k", "procedural", SER, `The minus sign in 1 − ${Math.abs(k) === 1 ? "" : Math.abs(k)}x was dropped; (−${Math.abs(k)})${sup(r)} is negative for an odd power.`, rs(rmul(cnr, rr(Math.abs(k) ** r))))] : []),
        B("rising-factors", "conceptual", BIN, `The factors were taken as n(n + 1)(n + 2)…; the general term uses n(n − 1)(n − 2)… even when n is negative or a fraction.`, rs(rmul(rdiv(rise, rr(fact(r))), rr(k ** r)))),
        B("no-factorial", "recall", BIN, `The product n(n − 1)… was not divided by ${r}!.`, rs(rmul(fall, rr(k ** r)))),
      ];
    },
    distractors: ([p, q, k, r]) => {
      let fall: R = [1, 1];
      for (let i = 0; i < r; i++) fall = rmul(fall, rsub(rr(p, q), rr(i)));
      const c = rmul(rdiv(fall, rr(fact(r))), rr(k ** r));
      return [rs(rmul(c, rr(-1))), rs(rmul(c, rr(2)))];
    },
    variants: () => [],
    explain: (s) => (s.id === "falling" ? `n(n − 1)… with ${s.inputs[1]} factors, n = ${s.inputs[0]}: ${s.value}` : s.id === "choose" ? `Divide by ${s.inputs[1]}: ${s.value}` : `Multiply by ${s.inputs[1]}: ${s.value}`),
    domain: [[-3, 3], [1, 3], [-3, 3], [2, 3]],
    keep: ([p, q, k]) => p !== 0 && k !== 0 && gcd(Math.abs(p), q) === 1 && (q > 1 || p < 0),
    difficulty: ([p, q, k, r]) => (q === 1 && Math.abs(k) === 1 ? 1 : r === 3 || k < 0 ? 3 : 2),
    teach: {
      idea: "For any rational n and |y| < 1, (1 + y)ⁿ = 1 + ny + n(n − 1)y²/2! + n(n − 1)(n − 2)y³/3! + …; when n is not a whole number the series never stops.",
      method: "The coefficient of yʳ is n(n − 1)…(n − r + 1)/r!. Put y = kx, so the coefficient of xʳ is that number times kʳ (keep the sign of k).",
      alternatives: [
        { id: "term_by_term", title: "Write out the first terms", kind: "procedural", text: ["Write 1 + n(kx) + [n(n − 1)/2](kx)² + [n(n − 1)(n − 2)/6](kx)³ with your n and k.", "Simplify each bracket, then read off the term you need."] },
      ],
    },
    limits: "Coefficients of x² and x³ in (1 + kx)^n for negative whole n or n with denominator 2 or 3; approximations of roots are not asked.",
  },
  {
    id: "apexlog",
    arity: 4,
    title: "A coefficient in the exponential or logarithmic series",
    competency: SER,
    type: "exact",
    mc: true,
    parse: none,
    // [f, a, b, r]: coefficient of x^r in e^((a/b)x) (f = 0) or log(1 + (a/b)x) (f = 1)
    reject: ([f, a, b, r]) => ((f !== 0 && f !== 1) || a === 0 || Math.abs(a) > 4 || b < 1 || b > 3 || gcd(Math.abs(a), b) !== 1 || r < 2 || r > 5 || (f === 1 && Math.abs(a) >= b * 2) ? "e^(kx) or log(1 + kx) with k = a/b small, powers x² to x⁵." : null),
    prompt: ([f, a, b, r]) => {
      const kx = kxS(a, b);
      return f
        ? `Find the coefficient of x${sup(r)} in the expansion of log(1 ${a < 0 ? "−" : "+"} ${kx}) in ascending powers of x (log is the natural logarithm, |${kx}| < 1).`
        : `Find the coefficient of x${sup(r)} in the expansion of e^(${a < 0 ? "−" : ""}${kx}) in ascending powers of x.`;
    },
    solve: ([f, a, b, r]) => {
      const kr = rpow(rr(a, b), r);
      const ans = f ? rmul(kr, rr(r % 2 ? 1 : -1, r)) : rdiv(kr, rr(fact(r)));
      return {
        steps: [
          st("general", "recall", SER, [f ? "log" : "exp", r], f ? `(−1)^(${r}+1) yʳ/${r}` : `yʳ/${r}!`),
          st("power", "multiply", "MATH.number.exponents", [rs(rr(a, b)), r], rs(kr)),
          st("coefficient", "divide", SER, [rs(kr), f ? r : fact(r)], rs(ans)),
        ],
        answer: rs(ans),
      };
    },
    // independent: Cauchy's integral formula, computed numerically
    validate: ([f, a, b, r], v) => {
      const k = a / b;
      const c = f ? taylor((z) => clog([1 + k * z[0], k * z[1]]), r, 0.5 / Math.abs(k)) : taylor((z) => cexp([k * z[0], k * z[1]]), r, 1);
      const val = num(v);
      return Number.isFinite(val) && near(val, c, 1e-8);
    },
    bugs: ([f, a, b, r]) => {
      const k = rr(a, b);
      const kr = rpow(k, r);
      const sign = rr(r % 2 ? 1 : -1);
      return f
        ? [
            B("signs-not-alternating", "recall", SER, "Every term of log(1 + y) was taken as positive; the signs alternate: y − y²/2 + y³/3 − …", rs(rdiv(kr, rr(r)))),
            B("factorial-for-log", "recall", LOG, `The term was divided by ${r}!; in the log series it is divided by ${r} (the exponential series has the factorials).`, rs(rmul(sign, rdiv(kr, rr(fact(r)))))),
            ...(k[0] !== 1 || k[1] !== 1 ? [B("k-not-raised", "procedural", SER, `The ${rs(k)} inside was not raised to the power ${r}: the term is (${rs(k)}x)${sup(r)}.`, rs(rmul(sign, rdiv(k, rr(r)))))] : []),
          ]
        : [
            B("no-factorial", "recall", SER, `The term was not divided by ${r}!; e^y = 1 + y + y²/2! + y³/3! + …`, rs(kr)),
            B("divide-by-r", "recall", SER, `The term was divided by ${r}, as in the log series; the exponential series divides by ${r}! = ${fact(r)}.`, rs(rdiv(kr, rr(r)))),
            ...(k[0] !== 1 || k[1] !== 1 ? [B("k-not-raised", "procedural", SER, `The ${rs(k)} inside was not raised to the power ${r}: the term is (${rs(k)}x)${sup(r)}/${r}!.`, rs(rdiv(k, rr(fact(r)))))] : []),
          ];
    },
    distractors: ([f, a, b, r]) => [rs(rmul(rr(-1), f ? rmul(rpow(rr(a, b), r), rr(r % 2 ? 1 : -1, r)) : rdiv(rpow(rr(a, b), r), rr(fact(r))))), rs(rpow(rr(a, b), r - 1))],
    variants: () => [],
    explain: (s) => (s.id === "general" ? (s.inputs[0] === "log" ? `log(1 + y): the term in y^${s.inputs[1]} is ${s.value}` : `e^y: the term in y^${s.inputs[1]} is ${s.value}`) : s.id === "power" ? `(${s.inputs[0]})^${s.inputs[1]} = ${s.value}` : `Divide by ${s.inputs[1]} (with the sign): ${s.value}`),
    domain: [[0, 1], [-4, 4], [1, 3], [2, 5]],
    keep: ([f, a, b]) => a !== 0 && gcd(Math.abs(a), b) === 1 && (f === 0 || Math.abs(a) < b * 2),
    difficulty: ([, a, b, r]) => (b === 1 && Math.abs(a) === 1 ? 1 : r >= 4 || b > 1 ? 3 : 2),
    teach: {
      idea: "eʸ = 1 + y + y²/2! + y³/3! + … for every y, and log(1 + y) = y − y²/2 + y³/3 − … for |y| < 1.",
      method: "Put y = kx. The coefficient of xʳ is kʳ/r! for eᵏˣ, and (−1)^(r + 1) kʳ/r for log(1 + kx).",
      alternatives: [
        { id: "derivative", title: "Where the log series comes from", kind: "conceptual", text: ["d/dy log(1 + y) = 1/(1 + y) = 1 − y + y² − … (a geometric series).", "Integrating term by term gives y − y²/2 + y³/3 − …, so the divisors are 1, 2, 3, … and the signs alternate."] },
      ],
    },
    limits: "Single coefficients for k = a/b with small a, b and powers 2 to 5 (log only for |k| < 2); numerical approximations are not asked.",
  },

  // ================================================================ general terms and sigma notation
  {
    id: "apgent",
    arity: 3,
    title: "The general term of a sequence from its first terms",
    competency: NOTE,
    type: "exact",
    mc: true,
    parse: none,
    // [t, d, e]: aₙ = dn + e (t = 0) or n² + dn + e (t = 1)
    reject: ([t, d, e]) => ((t !== 0 && t !== 1) || d < -6 || d > 9 || e < -9 || e > 9 || (t === 0 && d === 0) || (t === 1 && (Math.abs(d) > 4 || Math.abs(e) > 5)) ? "Linear general terms dn + e, or n² + dn + e with small d, e." : null),
    prompt: (p) => `A sequence begins ${genTerms(p, 5).map(n_).join(", ")}, … and continues by the same rule.${p[0] ? " (The differences between its terms go up by the same amount each time.)" : ""} Write its general term aₙ as an expression in n.`,
    solve: ([t, d, e]) => {
      const ts = genTerms([t, d, e], 3);
      const ans = polyS(t ? [1, d, e] : [d, e], "n", false);
      return {
        steps: t
          ? [st("first-diff", "subtract", AP, [ts[1], ts[0]], ts[1] - ts[0]), st("second-diff", "subtract", NOTE, [ts[2] - ts[1], ts[1] - ts[0]], 2), st("fit", "solve", LIN, [ts[0], ts[1]], ans)]
          : [st("first-diff", "subtract", AP, [ts[1], ts[0]], d), st("fit", "solve", AP, [ts[0], d], ans)],
        answer: ans,
      };
    },
    // independent: generate the terms by adding differences, and substitute n = 1 … 7 into the answer
    validate: (p, v) => {
      if (typeof v !== "string") return false;
      try {
        const e = parse(v);
        const ts = genTerms(p, 7);
        return ts.every((x, i) => near(evaluate(e, { n: i + 1 }), x, 1e-12));
      } catch {
        return false;
      }
    },
    bugs: ([t, d, e]) => {
      const [t1, t2] = genTerms([t, d, e], 2);
      const D = t2 - t1;
      if (!t)
        return [
          B("n-not-n-minus-1", "procedural", AP, `aₙ = a + nd was used; the first term has no d added, so aₙ = a + (n − 1)d.`, polyS([d, t1], "n", false)),
          B("d-left-out", "conceptual", AP, `The common difference ${n_(d)} was not used as the coefficient of n; each step adds ${n_(d)}, so aₙ has ${n_(d)}n.`, d === 1 ? null : polyS([1, t1 - 1], "n", false)),
          B("first-term-times-n", "conceptual", NOTE, `The first term was multiplied by n; that would make every term a multiple of ${n_(t1)}.`, t1 === 0 || t1 === d ? null : polyS([t1, 0], "n", false)),
        ];
      const B2 = t2 - t1 - 6;
      return [
        B("treated-as-ap", "conceptual", NOTE, "Only the first difference was used, as if the sequence were an AP; here the differences themselves change, so aₙ has an n² term.", polyS([D, t1 - D], "n", false)),
        B("whole-second-difference", "procedural", NOTE, "The coefficient of n² was taken as the second difference (2); it is half of it, because n² itself has second difference 2.", polyS([2, B2, t1 - 2 - B2], "n", false)),
        B("square-only", "procedural", NOTE, "Only n² was matched to the first term; the n term is needed too (check a₂ and a₃).", d === 0 ? null : polyS([1, 0, t1 - 1], "n", false)),
      ];
    },
    distractors: ([t, d, e]) => (t ? [polyS([1, d, e + 1], "n", false), polyS([1, -d, e], "n", false)] : [polyS([d, e + 1], "n", false), polyS([d, -e], "n", false), polyS([-d, e], "n", false)]),
    variants: () => [],
    explain: (s) => (s.id === "first-diff" ? `a₂ − a₁ = ${n_(Number(s.value))}` : s.id === "second-diff" ? "The differences go up by 2 each time, so aₙ = n² + bn + c" : `Match a₁ and a₂: aₙ = ${s.value}`),
    domain: [[0, 1], [-6, 9], [-9, 9]],
    keep: ([t, d, e]) => (t === 0 ? d !== 0 : Math.abs(d) <= 4 && Math.abs(e) <= 5),
    cap: 400,
    difficulty: ([t, d, e]) => (t ? 3 : d > 0 && e >= 0 ? 1 : 2),
    teach: {
      idea: "A general term is a rule that gives aₙ straight from n. If the differences are constant (d), aₙ = dn + (a₁ − d); if the second differences are a constant 2, aₙ = n² + bn + c.",
      method: "Write the differences. Constant: the coefficient of n is d, then fix the constant from a₁. Second differences 2: write n² + bn + c and find b and c from a₁ and a₂.",
      alternatives: [
        { id: "substitute", title: "Test your rule", kind: "procedural", text: ["Put n = 1, 2, 3 into your rule and compare with the given terms.", "If a₁ fits but a₂ does not, the coefficient of n is wrong; if all are off by the same number, the constant is wrong."] },
      ],
    },
    limits: "Linear general terms, and quadratics n² + bn + c; recursive rules belong to their own competency.",
  },
  {
    id: "apsigch",
    arity: 3,
    title: "Writing an arithmetic series in sigma notation",
    competency: NOTE,
    type: "choice",
    parse: none,
    // [a, d, m]: a + (a + d) + … with m terms
    reject: (p) => {
      const [a, d, m] = p;
      if (a < -5 || a > 9 || d === 0 || d < -4 || d > 6 || m < 4 || m > 12) return "Arithmetic series of 4 to 12 terms with small first terms and differences.";
      const sums = sigOpts(p).map(sigSum);
      return sums.slice(1).some((s) => s === sums[0]) ? "Two options would have the same sum." : null;
    },
    prompt: ([a, d, m]) => `Which of these is the series ${[0, 1, 2].map((i) => n_(a + i * d)).join(" + ")} + … + ${n_(a + (m - 1) * d)} (${m} terms) written in sigma notation?`.replace(/\+ −/g, "+ (−").replace(/\(−(\d+)/g, "(−$1)"),
    choices: (p) => sigOrder(p).map((o) => sigS(o.s)),
    solve: (p) => {
      const [a, d, m] = p;
      const right = sigOrder(p).findIndex((o) => o.i === 0);
      return {
        steps: [st("kth", "generalise", AP, [a, d], polyS([d, a - d], "k")), st("limits", "count", NOTE, [1, m], m), st("choose", "compare", NOTE, [sigS(sigOpts(p)[0])], right)],
        answer: right,
      };
    },
    // independent: expand every option term by term and find the one that lists exactly the given terms
    validate: (p, v) => {
      const [a, d, m] = p;
      const target = Array.from({ length: m }, (_, i) => a + i * d).join(",");
      const hits = sigOrder(p).map((o, i) => ({ i, list: expandSig(o.s).join(",") })).filter((x) => x.list === target);
      return hits.length === 1 && v === hits[0].i;
    },
    bugs: (p) => {
      const ord = sigOrder(p);
      const at = (i: number) => ord.findIndex((o) => o.i === i);
      const [, , m] = p;
      const o3 = sigOpts(p)[3];
      return [
        B("no-shift", "procedural", NOTE, "The k-th term was taken as a + kd; with k starting at 1 that skips the first term. It is a + (k − 1)d.", at(1)),
        B("start-at-zero", "procedural", NOTE, `k was started at 0 but still run to ${m}; that gives ${m + 1} terms.`, at(2)),
        B(o3[1] === m - 1 ? "one-short" : "last-term-as-limit", "conceptual", NOTE, o3[1] === m - 1 ? `The upper limit was taken one too small; it is the number of terms, ${m}.` : `The last term was used as the upper limit; the upper limit counts the terms (${m}).`, at(3)),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "kth" ? `The k-th term is ${s.value}` : s.id === "limits" ? `k runs from 1 to ${s.value}, one value for each term` : `So the series is ${s.inputs[0]}`),
    domain: [[-5, 9], [-4, 6], [4, 12]],
    keep: ([, d]) => d !== 0,
    cap: 300,
    difficulty: ([a, d]) => (d > 0 && a > 0 ? 1 : d > 0 ? 2 : 3),
    teach: {
      idea: "Σ (k = 1 to m) t(k) means t(1) + t(2) + … + t(m): the limits count the terms and the expression t(k) gives each one.",
      method: "Find the k-th term (for an AP, a + (k − 1)d), take the number of terms as the upper limit, and check by putting k = 1 and k = m.",
      alternatives: [
        { id: "expand", title: "Expand each option", kind: "procedural", text: ["For each option write the terms for the lowest and highest k, and count how many values k takes.", "The right option starts with the first term, ends with the last term and has the right number of terms."] },
      ],
    },
    limits: "Arithmetic series only, with four options; writing a sigma expression from scratch is assessed through the general-term family.",
  },

  // ================================================================ summation
  {
    id: "aptel",
    arity: 3,
    title: "A telescoping sum",
    competency: SUM,
    type: "exact",
    mc: true,
    parse: none,
    // [d, e, n]: Σ (k = 1 to n) 1/((dk + e)(dk + e + d))
    reject: ([d, e, n]) => (d < 1 || d > 4 || e < -3 || e > 6 || d + e < 1 || n < 4 || n > 30 ? "Σ 1/((dk + e)(dk + e + d)) with positive factors, d ≤ 4, 4 to 30 terms." : null),
    prompt: ([d, e, n]) => `Find the sum Σ (k = 1 to ${n}) 1/(${telF(d, e)}${telF(d, e + d)}). Give the answer as a fraction in its lowest terms.`,
    solve: ([d, e, n]) => {
      const first = rr(1, d + e);
      const last = rr(1, d * n + d + e);
      const ans = rmul(rr(1, d), rsub(first, last));
      return {
        steps: [
          st("split", "partial-fractions", PFR, [d, e], `(1/${d})[1/(${polyS([d, e], "k")}) − 1/(${polyS([d, e + d], "k")})]`),
          st("cancel", "telescope", SUM, [rs(first), rs(last)], rs(rsub(first, last))),
          st("scale", "multiply", FRAC, [`1/${d}`, rs(rsub(first, last))], rs(ans)),
        ],
        answer: rs(ans),
      };
    },
    // independent: add all n fractions exactly
    validate: ([d, e, n], v) => {
      const x = typeof v === "string" ? readR(v) : null;
      if (!x) return false;
      let s: R = [0, 1];
      for (let k = 1; k <= n; k++) s = radd(s, rr(1, (d * k + e) * (d * k + e + d)));
      return req(s, x);
    },
    bugs: ([d, e, n]) => {
      const first = rr(1, d + e);
      const last = rr(1, d * n + d + e);
      return [
        ...(d > 1 ? [B("factor-left-out", "procedural", PFR, `The factor 1/${d} from the partial fractions was left out: 1/((${d}k + …)(${d}k + … + ${d})) = (1/${d})[… − …].`, rs(rsub(first, last)))] : []),
        B("wrong-last-term", "procedural", SUM, `The last fraction left after cancelling was taken as 1/${d * n + e}; that one cancels. The one left over is 1/${d * n + d + e}.`, rs(rmul(rr(1, d), rsub(first, rr(1, d * n + e))))),
        B("added-parts", "procedural", SUM, "The two remaining fractions were added; they come from a − sign in each partial fraction, so they are subtracted.", rs(rmul(rr(1, d), radd(first, last)))),
      ];
    },
    distractors: ([d, e, n]) => [rs(rr(n, (d + e) * (d * n + e))), rs(rr(n + 1, (d + e) * (d * n + d + e)))],
    variants: () => [],
    explain: (s) => (s.id === "split" ? `Partial fractions: each term is ${s.value}` : s.id === "cancel" ? `Writing out the terms, everything cancels except ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : `Multiply by ${s.inputs[0]}: ${s.value}`),
    domain: [[1, 4], [-3, 6], [4, 30]],
    keep: ([d, e]) => d + e >= 1,
    cap: 400,
    difficulty: ([d, e]) => (d === 1 && e === 0 ? 1 : d === 1 ? 2 : 3),
    teach: {
      idea: "If each term is a difference f(k) − f(k + 1), then in the sum all the middle parts cancel and only f(1) − f(n + 1) is left.",
      method: "Split 1/((dk + e)(dk + e + d)) into (1/d)[1/(dk + e) − 1/(dk + e + d)], write the first two and last terms to see the cancelling, and keep the first and the last fraction.",
      alternatives: [
        { id: "partial_sums", title: "Spot the pattern in partial sums", kind: "conceptual", text: ["For 1/(k(k + 1)) the sums of 1, 2, 3 terms are 1/2, 2/3, 3/4.", "The pattern n/(n + 1) is exactly 1 − 1/(n + 1): the first part minus the last part."] },
      ],
    },
    limits: "Sums of 1/((dk + e)(dk + e + d)) with linear factors; other telescoping forms (three factors, surds) are not included.",
  },
  {
    id: "apsumk",
    arity: 5,
    title: "A sum using the standard sums of k, k² and k³",
    competency: SUM,
    type: "integer",
    mc: true,
    parse: none,
    // [c3, c2, c1, c0, n]: Σ (k = 1 to n) (c3 k³ + c2 k² + c1 k + c0)
    reject: ([c3, c2, c1, c0, n]) => (c3 < 0 || c3 > 2 || Math.abs(c2) > 3 || Math.abs(c1) > 5 || Math.abs(c0) > 6 || n < 5 || n > 20 || (c3 === 0 && c2 === 0) ? "Cubic or quadratic terms with small coefficients, 5 to 20 terms." : null),
    prompt: ([c3, c2, c1, c0, n]) => `Evaluate Σ (k = 1 to ${n}) (${polyS([c3, c2, c1, c0], "k")}).`,
    solve: ([c3, c2, c1, c0, n]) => {
      const s1 = (n * (n + 1)) / 2;
      const s2 = (n * (n + 1) * (2 * n + 1)) / 6;
      const s3 = s1 * s1;
      const tot = c3 * s3 + c2 * s2 + c1 * s1 + c0 * n;
      return {
        steps: [
          ...(c3 ? [st("s3", "evaluate", PSUM, [3, n], s3)] : []),
          ...(c2 ? [st("s2", "evaluate", PSUM, [2, n], s2)] : []),
          ...(c1 ? [st("s1", "evaluate", PSUM, [1, n], s1)] : []),
          ...(c0 ? [st("s0", "multiply", SUM, [c0, n], c0 * n)] : []),
          st("combine", "add", SUM, [c3, c2, c1, c0], tot),
        ],
        answer: tot,
      };
    },
    // independent: add the n terms one by one
    validate: ([c3, c2, c1, c0, n], v) => {
      let s = 0;
      for (let k = 1; k <= n; k++) s += c3 * k ** 3 + c2 * k * k + c1 * k + c0;
      return v === s;
    },
    bugs: ([c3, c2, c1, c0, n]) => {
      const s1 = (n * (n + 1)) / 2;
      const s2 = (n * (n + 1) * (2 * n + 1)) / 6;
      const s3 = s1 * s1;
      const tot = c3 * s3 + c2 * s2 + c1 * s1 + c0 * n;
      const m = n - 1;
      const t1 = (m * (m + 1)) / 2;
      return [
        ...(c0 ? [B("constant-once", "conceptual", SUM, `The constant ${n_(c0)} was added only once; Σ (k = 1 to ${n}) ${n_(c0)} adds it ${n} times, giving ${n_(c0 * n)}.`, tot - c0 * n + c0)] : []),
        ...(c2 ? [B("square-of-sum", "recall", PSUM, "Σk² was taken as (Σk)²; that is the rule for Σk³. Σk² = n(n + 1)(2n + 1)/6.", tot - c2 * s2 + c2 * s3)] : []),
        ...(c3 ? [B("cubes-over-two", "recall", PSUM, "Σk³ was taken as n²(n + 1)²/2; it is [n(n + 1)/2]² = n²(n + 1)²/4.", tot + c3 * s3)] : []),
        B("one-short", "procedural", SUM, `The sum was stopped at k = ${n - 1}; k runs up to ${n}.`, c3 * t1 * t1 + (c2 * m * (m + 1) * (2 * m + 1)) / 6 + c1 * t1 + c0 * m),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "s3" ? `Σk³ = [n(n + 1)/2]² = ${s.value}` : s.id === "s2" ? `Σk² = n(n + 1)(2n + 1)/6 = ${s.value}` : s.id === "s1" ? `Σk = n(n + 1)/2 = ${s.value}` : s.id === "s0" ? `Σ ${n_(Number(s.inputs[0]))} over ${s.inputs[1]} terms = ${n_(Number(s.value))}` : `Combine with the coefficients: ${n_(Number(s.value))}`),
    domain: [[0, 2], [-3, 3], [-5, 5], [-6, 6], [5, 20]],
    keep: ([c3, c2, c1, c0]) => (c3 !== 0 || c2 !== 0) && [c3, c2, c1, c0].filter((x) => x !== 0).length >= 2,
    cap: 400,
    difficulty: ([c3, c2, c1, c0, n]) => (c3 === 0 && c0 === 0 && n <= 10 ? 1 : c3 && c0 ? 3 : 2),
    teach: {
      idea: "Σ is linear: Σ(a·f(k) + b·g(k)) = aΣf(k) + bΣg(k), and the sum of a constant c over n terms is cn.",
      method: "Split into Σk³, Σk², Σk and Σ1, use [n(n + 1)/2]², n(n + 1)(2n + 1)/6, n(n + 1)/2 and n, then combine with the coefficients.",
      alternatives: [
        { id: "small_case", title: "Check with a small case", kind: "procedural", text: ["Put n = 2 into your working and compare with adding the first two terms by hand.", "If they disagree, check the constant term (it is added n times) and which formula you used for each power."] },
      ],
    },
    limits: "Polynomials of degree 2 or 3 in k with small coefficients, up to 20 terms; sums of series like Σk(k + 1) are covered when expanded.",
  },

  // ================================================================ Cartesian products
  {
    id: "apcartn",
    arity: 4,
    title: "Counting the elements of Cartesian products",
    competency: CART,
    type: "integer",
    mc: true,
    parse: none,
    // [v, m, n, o]: v = 0 n(A × B) with A in set-builder form; 1 n(A × B × C); 2 the number of relations from A to B; 3 n((A × B) ∩ (A × C))
    reject: ([v, m, n, o]) => (v < 0 || v > 3 || m < 2 || m > 6 || n < 2 || n > 5 || o < 0 || o > 4 || (v === 2 && (o !== 0 || m * n > 10)) || (v === 3 && (o < 1 || o > n - 1)) ? "Small finite sets: products of two or three sets, relations, intersections of products." : null),
    prompt: (p) => cartText(p),
    solve: ([v, m, n, o]) => {
      const ans = v === 0 ? m * n : v === 1 ? m * n * (o + 2) : v === 2 ? 2 ** (m * n) : m * o;
      return {
        steps:
          v === 0
            ? [st("count-a", "count", SETS, [`{x ∈ ℤ : ${o - 2} ≤ x < ${o - 2 + m}}`], m), st("product", "multiply", CART, [m, n], ans)]
            : v === 1
              ? [st("product", "multiply", CART, [m, n, o + 2], ans)]
              : v === 2
                ? [st("pairs", "multiply", CART, [m, n], m * n), st("subsets", "power", REL, [2, m * n], ans)]
                : [st("common", "count", SETS, ["B ∩ C"], o), st("product", "multiply", CART, [m, o], ans)],
        answer: ans,
      };
    },
    // independent: build the sets and count the tuples one by one
    validate: ([v, m, n, o], val) => {
      const A = Array.from({ length: m }, (_, i) => i + (v === 0 ? o - 2 : 1));
      const Bs = SHAPE(n);
      let c = 0;
      if (v === 0) for (const a of A) for (const b of Bs) c += a === a && b === b ? 1 : 0;
      else if (v === 1) for (const a of A) for (const b of Bs) for (let z = 0; z < o + 2; z++) c += a + b.length + z >= 0 ? 1 : 0;
      else if (v === 2) for (let mask = 0; mask < 2 ** (m * n); mask++) c++;
      else {
        const Cs = SHAPE(2 * n).slice(n - o, 2 * n - o);
        for (const a of A) for (const b of Bs) for (const a2 of A) for (const cc of Cs) if (a === a2 && b === cc) c++;
      }
      return val === c;
    },
    bugs: ([v, m, n, o]) =>
      v === 0
        ? [
            B("upper-end-included", "procedural", SETS, `The end ${o - 2 + m} was counted in A, but x < ${o - 2 + m} leaves it out; A has ${m} elements.`, (m + 1) * n),
            B("added", "conceptual", CART, "The numbers of elements were added; every element of A pairs with every element of B, so they multiply.", m + n),
          ]
        : v === 1
          ? [
              B("added", "conceptual", CART, "The numbers of elements were added; each choice from A goes with each choice from B and from C, so they multiply.", m + n + o + 2),
              B("third-added", "procedural", CART, "n(A × B) was found, then n(C) was added; A × B × C has a triple for every pair and every element of C.", m * n + o + 2),
            ]
          : v === 2
            ? [
                B("pairs-not-subsets", "conceptual", REL, `n(A × B) = ${m * n} was given; a relation is any subset of A × B, and a set with ${m * n} elements has 2^${m * n} subsets.`, m * n),
                B("functions-counted", "conceptual", REL, `The number of functions from A to B (${n}^${m}) was found; every subset of A × B is a relation, not only the functions.`, n ** m),
                B("power-of-sum", "procedural", REL, `2^(${m} + ${n}) was used; the exponent is n(A × B) = ${m} × ${n}.`, 2 ** (m + n)),
              ]
            : [
                B("union", "conceptual", CART, "The union (A × B) ∪ (A × C) was counted; the intersection keeps only pairs whose second entry is in both B and C.", m * (2 * n - o)),
                B("forgot-a", "procedural", CART, `Only B ∩ C was counted; each of its ${o} elements pairs with each of the ${m} elements of A.`, o),
              ],
    variants: () => [],
    explain: (s) => (s.id === "count-a" ? `List A: it has ${s.value} elements` : s.id === "pairs" ? `n(A × B) = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "subsets" ? `Each relation is a subset of A × B: 2^${s.inputs[1]} = ${s.value}` : s.id === "common" ? `B ∩ C has ${s.value} elements, and (A × B) ∩ (A × C) = A × (B ∩ C)` : `Multiply: ${s.inputs.join(" × ")} = ${s.value}`),
    domain: [[0, 3], [2, 6], [2, 5], [0, 4]],
    keep: ([v, m, n, o]) => (v === 2 ? o === 0 && m * n <= 10 : v === 3 ? o >= 1 && o <= n - 1 : true),
    difficulty: ([v]) => (v === 1 ? 1 : v === 0 ? 2 : 3),
    teach: {
      idea: "A × B is the set of all ordered pairs (a, b) with a ∈ A and b ∈ B. Each of the n(A) first entries goes with each of the n(B) second entries, so n(A × B) = n(A)·n(B).",
      method: "Count each set first (list it if it is in set-builder form), then multiply. A relation from A to B is any subset of A × B, so there are 2^(n(A)·n(B)) of them.",
      alternatives: [
        { id: "grid", title: "A grid of pairs", kind: "conceptual", text: ["Draw a grid with a row for each element of A and a column for each element of B.", "Each cell is one ordered pair, so the number of cells is rows × columns."], visual: ([, m, n]) => ({ type: "grid", rows: m, cols: n }) },
      ],
    },
    limits: "Finite sets of up to six elements; relations only when n(A)·n(B) ≤ 10 (so 2^(mn) stays readable).",
  },
  {
    id: "apcartset",
    arity: 5,
    title: "Reading the sets from a Cartesian product",
    competency: CART,
    type: "set",
    parse: none,
    // [m, n, s, t, w]: A = {s, s + 2, …} (m elements), B = {t, t + 3, …} (n elements); find A (w = 0) or B (w = 1)
    reject: ([m, n, s, t, w]) => (m < 2 || m > 3 || n < 2 || n > 3 || s < -3 || s > 5 || t < -3 || t > 5 || (w !== 0 && w !== 1) ? "Products of sets with two or three elements." : null),
    prompt: (p) => `A × B = {${cartPairs(p).map(([a, b]) => `(${n_(a)}, ${n_(b)})`).join(", ")}}. Find the set ${p[4] ? "B" : "A"}. Write its elements separated by commas.`,
    solve: (p) => {
      const [A, Bs] = cartSets(p);
      const ans = p[4] ? Bs : A;
      return { steps: [st("entries", "read", CART, [p[4] ? "second entries" : "first entries"], [...ans])], answer: [...ans].sort((x, y) => x - y) };
    },
    // independent: the candidate, paired with the other set, must give back exactly the listed pairs
    validate: (p, v) => {
      if (!Array.isArray(v) || new Set(v).size !== v.length) return false;
      const pairs = cartPairs(p);
      const other = [...new Set(pairs.map((x) => x[p[4] ? 0 : 1]))];
      const made = new Set<string>();
      for (const x of v) for (const y of other) made.add(p[4] ? `${y},${x}` : `${x},${y}`);
      const given = new Set(pairs.map((x) => x.join(",")));
      return made.size === given.size && [...made].every((x) => given.has(x));
    },
    bugs: (p) => {
      const [A, Bs] = cartSets(p);
      return [
        B("swapped", "conceptual", CART, `The ${p[4] ? "first" : "second"} entries were read; ${p[4] ? "B is made of the SECOND entries" : "A is made of the FIRST entries"} of the pairs in A × B.`, p[4] ? A : Bs),
        B("all-numbers", "procedural", CART, "Every number in the pairs was listed; only one position of each pair belongs to this set.", [...new Set([...A, ...Bs])]),
      ];
    },
    variants: () => [],
    explain: (s) => `Read the ${s.inputs[0]} of the pairs, each value once: ${(s.value as number[]).map(n_).join(", ")}`,
    domain: [[2, 3], [2, 3], [-3, 5], [-3, 5], [0, 1]],
    cap: 300,
    difficulty: ([m, n, s, t]) => (m * n === 4 && s >= 0 && t >= 0 ? 1 : m * n === 9 ? 3 : 2),
    teach: {
      idea: "In A × B every pair has its first entry from A and its second entry from B, and every combination appears.",
      method: "To find A, collect the first entries of the pairs, writing each value once; to find B, collect the second entries.",
      alternatives: [
        { id: "table", title: "Put the pairs in a table", kind: "procedural", text: ["Make a table with one row for each different first entry and one column for each different second entry.", "The row labels form A and the column labels form B."] },
      ],
    },
    limits: "Products of two sets of two or three integers, listed in full; products of three sets are counted in apcartn.",
  },

  // ================================================================ intervals
  {
    id: "apintop",
    arity: 7,
    title: "Intersection, union and difference of intervals",
    competency: IVL,
    type: "interval",
    mc: true,
    parse: none,
    // [a, w1, c, w2, s1, s2, op]: A from a to a + w1, B from c to c + w2, ends closed by s1, s2; op 0 ∩, 1 ∪, 2 A − B
    reject: (p) => {
      const [a, w1, c, w2, s1, s2, op] = p;
      if (a < -5 || a > 3 || w1 < 2 || w1 > 6 || c < -3 || c > 5 || w2 < 2 || w2 > 6 || s1 < 0 || s1 > 3 || s2 < 0 || s2 > 3 || op < 0 || op > 2) return "Two bounded intervals with whole-number ends.";
      if (a === c && w1 === w2) return "The two intervals have the same ends.";
      const res = ivOp(p, op);
      return !res.length || res.some((iv) => req(iv.lo, iv.hi)) ? "The result is empty or a single point." : null;
    },
    prompt: (p) => `A = ${ivS(ivA(p))} and B = ${ivS(ivB(p))}. Write ${["A ∩ B", "A ∪ B", "A − B"][p[6]]} in interval notation (if it has two pieces, join them with ∪).`,
    solve: (p) => {
      const res = ivsS(ivOp(p, p[6]));
      return { steps: [st("line", "draw", IVL, [ivS(ivA(p)), ivS(ivB(p))], ["A ∩ B", "A ∪ B", "A − B"][p[6]]), st("ends", "read", IVL, [res], res)], answer: res };
    },
    // independent: test the candidate against A and B at every quarter point near the intervals
    validate: (p, v) => {
      const ivs = typeof v === "string" ? readIvs(v) : null;
      if (!ivs) return false;
      const A = ivA(p);
      const Bv = ivB(p);
      for (let j = (Math.min(p[0], p[2]) - 2) * 4; j <= (Math.max(p[0] + p[1], p[2] + p[3]) + 2) * 4; j++) {
        const x = rr(j, 4);
        const want = [inIv(A, x) && inIv(Bv, x), inIv(A, x) || inIv(Bv, x), inIv(A, x) && !inIv(Bv, x)][p[6]];
        if (ivs.some((iv) => inIv(iv, x)) !== want) return false;
      }
      return true;
    },
    bugs: (p) => {
      const op = p[6];
      const allClosed = ivsS(ivOp(p, op).map((iv) => ({ ...iv, lc: true, hc: true })));
      const flipB = [...p];
      flipB[5] = 3 - p[5];
      const out: Bug[] = [];
      if (op === 0) out.push(B("union-instead", "conceptual", IVL, "The union was found; A ∩ B keeps only the numbers that are in BOTH intervals.", ivsS(ivOp(p, 1))));
      if (op === 1) out.push(B("intersection-instead", "conceptual", IVL, "The intersection was found; A ∪ B keeps every number that is in EITHER interval.", ivsS(ivOp(p, 0))));
      if (op === 2) {
        const ba = ivOp([p[2], p[3], p[0], p[1], p[5], p[4]], 2);
        if (ba.length && !ba.some((iv) => req(iv.lo, iv.hi))) out.push(B("reversed-difference", "conceptual", IVL, "B − A was found; A − B keeps the numbers of A that are NOT in B.", ivsS(ba)));
        const naive = ivOpWith(ivA(p), { ...ivB(p), ...ivCode(3 - p[5]) }, 2);
        if (naive.length && !naive.some((iv) => req(iv.lo, iv.hi))) out.push(B("brackets-of-b-kept", "procedural", IVL, "B's own brackets were copied at the cut; when B is removed, an end that B includes is left OUT of A − B, and an end B leaves out stays IN.", ivsS(naive)));
      }
      out.push(B("ends-all-closed", "procedural", IVL, "Every end was written with a square bracket; check each end: is that number itself in the set?", allClosed));
      return out;
    },
    distractors: (p) => {
      const r = ivOp(p, p[6]);
      return [ivsS(r.map((iv) => ({ ...iv, lc: !iv.lc, hc: !iv.hc }))), ivsS(r.map((iv) => ({ ...iv, lc: false, hc: false }))), ivsS(r.map((iv, i) => (i === r.length - 1 ? { ...iv, hi: radd(iv.hi, rr(1)) } : iv))), ivsS(r.map((iv, i) => (i === 0 ? { ...iv, lo: rsub(iv.lo, rr(1)) } : iv)))];
    },
    variants: () => [],
    explain: (s) => (s.id === "line" ? `Draw ${s.inputs[0]} and ${s.inputs[1]} on one number line and shade ${s.value}` : `Read off the ends, deciding for each whether it is included: ${s.value}`),
    domain: [[-5, 3], [2, 6], [-3, 5], [2, 6], [0, 3], [0, 3], [0, 2]],
    cap: 400,
    difficulty: ([, , , , , , op]) => (op === 0 ? 1 : op === 1 ? 2 : 3),
    teach: {
      idea: "An interval is a set of real numbers. A ∩ B keeps the numbers in both, A ∪ B the numbers in either, and A − B the numbers of A that are not in B. A square bracket includes its end; a round one leaves it out.",
      method: "Draw both intervals on one number line, shade what the operation keeps, then read off the ends, deciding for each end whether that number itself is in the result.",
      alternatives: [
        { id: "number_line", title: "Test points on the number line", kind: "conceptual", text: ["Mark all four ends. Test one number in each gap and each end itself: is it in A? in B?", "Keep the points the operation wants and join them into intervals."], visual: (p) => ({ type: "numberline", from: Math.min(p[0], p[2]) - 1, to: Math.max(p[0] + p[1], p[2] + p[3]) + 1, marks: [p[0], p[0] + p[1], p[2], p[2] + p[3]] }) },
      ],
    },
    limits: "Two bounded intervals with whole-number ends; results that are empty or a single point are left out, and unbounded intervals appear in the other interval families.",
  },
  {
    id: "apineq",
    arity: 5,
    title: "Solving a double linear inequality",
    competency: IVL,
    type: "interval",
    mc: true,
    parse: none,
    // [a, b, p, w, s]: p < ax + b ≤ p + w (s = 0) or p ≤ ax + b < p + w (s = 1)
    reject: ([a, b, p, w, s]) => (a === 0 || Math.abs(a) < 2 || Math.abs(a) > 5 || Math.abs(b) > 9 || p < -15 || p > 10 || w < 2 || w > 12 || (s !== 0 && s !== 1) ? "p < ax + b ≤ q with 2 ≤ |a| ≤ 5." : null),
    prompt: ([a, b, p, w, s]) => `Solve ${n_(p)} ${s ? "≤" : "<"} ${polyS([a, b])} ${s ? "<" : "≤"} ${n_(p + w)} for real x. Write the solution set in interval notation.`,
    solve: (q) => {
      const [a, b, p, w] = q;
      const res = ivS(dblIv(q));
      return {
        steps: [
          st("subtract", "subtract", LIN, [p, b, p + w], `${n_(p - b)}, ${n_(p + w - b)}`),
          st("divide", "divide", INEQ, [a], a < 0 ? "reverse both signs" : "signs stay"),
          st("write", "convert", IVL, [res], res),
        ],
        answer: res,
      };
    },
    // independent: test x = j/N against the original inequality in whole-number arithmetic
    validate: ([a, b, p, w, s], v) => {
      const ivs = typeof v === "string" ? readIvs(v) : null;
      if (!ivs || ivs.length !== 1) return false;
      const N = 12 * Math.abs(a);
      const lo = Math.floor(Math.min((p - b) / a, (p + w - b) / a)) - 3;
      const hi = Math.ceil(Math.max((p - b) / a, (p + w - b) / a)) + 3;
      for (let j = lo * N; j <= hi * N; j++) {
        const t = a * j + b * N;
        const holds = s ? p * N <= t && t < (p + w) * N : p * N < t && t <= (p + w) * N;
        if (holds !== inIv(ivs[0], rr(j, N))) return false;
      }
      return true;
    },
    bugs: (q) => {
      const [a, b, p, w, s] = q;
      const right = dblIv(q);
      const out: Bug[] = [];
      if (a < 0) out.push(B("brackets-not-swapped", "conceptual", INEQ, `Dividing by ${n_(a)} reverses the inequalities, so the end that was strict becomes the other end; the brackets swap sides too.`, ivS({ ...right, lc: !s, hc: !!s })));
      if (b !== 0) {
        const L = rr(p, a);
        const U = rr(p + w, a);
        out.push(B("middle-only", "procedural", LIN, `${Math.abs(b)} was ${b > 0 ? "taken away from" : "added to"} the middle only; whatever is done to the middle must be done to all three parts.`, ivS(a > 0 ? { lo: L, hi: U, lc: !!s, hc: !s } : { lo: U, hi: L, lc: !s, hc: !!s })));
      }
      out.push(B("both-included", "procedural", IVL, "Both ends were included; only the end that comes from ≤ belongs to the solution set.", ivS({ ...right, lc: true, hc: true })));
      return out;
    },
    distractors: (q) => {
      const r = dblIv(q);
      return [ivS({ ...r, lc: false, hc: false }), ivS({ ...r, lc: !r.lc, hc: !r.hc })];
    },
    variants: () => [],
    explain: (s) => (s.id === "subtract" ? `Subtract ${n_(Number(s.inputs[1]))} from all three parts: the ends become ${s.value}` : s.id === "divide" ? `Divide all three parts by ${n_(Number(s.inputs[0]))}: ${s.value}` : `In interval notation: ${s.value}`),
    domain: [[-5, 5], [-9, 9], [-15, 10], [2, 12], [0, 1]],
    keep: ([a]) => Math.abs(a) >= 2,
    cap: 400,
    difficulty: ([a, b, p, w]) => (a > 0 && (p - b) % a === 0 && (p + w - b) % a === 0 ? 1 : a > 0 ? 2 : 3),
    teach: {
      idea: "A double inequality is two inequalities at once; do the same thing to all three parts. Dividing by a negative number reverses both signs, so the left and right ends swap places.",
      method: "Subtract b from all three parts, divide all three by a (reversing the signs if a < 0), rewrite with the smaller number on the left, and use [ ] for ≤ and ( ) for <.",
      alternatives: [
        { id: "two_parts", title: "Split into two inequalities", kind: "procedural", text: ["Solve p < ax + b and ax + b ≤ q separately.", "The solution set is where both hold: the overlap of the two answers on a number line."] },
      ],
    },
    limits: "One-variable linear double inequalities with |a| from 2 to 5; answers are bounded intervals with rational ends.",
  },
  {
    id: "apintch",
    arity: 5,
    title: "Matching a set of real numbers with its interval notation",
    competency: IVL,
    type: "choice",
    parse: none,
    // [a, w, s, k, r]: k = 0 the set from a to a + w with ends s; k = 1 a ray x > a, x ≥ a, x < a, x ≤ a (s = 0..3); r = 1 the other way round
    reject: ([a, w, s, k, r]) => (Math.abs(a) > 6 || w < 1 || w > 8 || s < 0 || s > 3 || (k !== 0 && k !== 1) || (r !== 0 && r !== 1) || (k === 1 && w !== 1) ? "Bounded intervals and rays with whole-number ends." : null),
    prompt: (p) => (p[4] ? `Which inequality describes the set of real numbers ${chIv(p).ivs}?` : `Which interval is the set {x ∈ ℝ : ${chIv(p).ineq}}?`),
    choices: (p) => chOpts(p).map((o) => (p[4] ? o.ineq : o.ivs)),
    solve: (p) => {
      const right = chOpts(p).findIndex((o) => o.s === p[2]);
      return { steps: [st("ends", "read", IVL, [chIv(p).ineq], chIv(p).ivs), st("choose", "compare", IVL, [chIv(p).ivs], right)], answer: right };
    },
    // independent: test numbers on a fine grid in every option and in the given set
    validate: (p, v) => {
      const set = chIv(p);
      const opts = chOpts(p);
      const hits = opts.map((o, i) => ({ o, i })).filter(({ o }) => {
        for (let j = (p[0] - 10) * 2; j <= (p[0] + p[1] + 10) * 2; j++) if (o.has(j / 2) !== set.has(j / 2)) return false;
        return true;
      });
      return hits.length === 1 && v === hits[0].i;
    },
    bugs: (p) => {
      const [, , s, k] = p;
      const opts = chOpts(p);
      const at = (t: number) => opts.findIndex((o) => o.s === t);
      return k === 0
        ? [
            B("brackets-swapped", "conceptual", IVL, "Square and round brackets were swapped: [ ] means the end IS included (≤), ( ) means it is not (<).", at(3 - s)),
            B("one-end-read", "procedural", IVL, "Only one end was checked; decide separately for the left end and for the right end whether it is included.", at(s ^ 1)),
          ]
        : [
            B("strict-or-not", "conceptual", IVL, "Strict and non-strict were mixed up: > or < gives a round bracket, ≥ or ≤ a square one.", at(s ^ 1)),
            B("direction", "conceptual", IVL, `The direction was reversed: x > ${n_(p[0])} means numbers to the right of ${n_(p[0])}, up to ∞.`, at(s ^ 2)),
          ];
    },
    variants: () => [],
    explain: (s) => (s.id === "ends" ? `${s.inputs[0]} in interval notation is ${s.value}` : `So the answer is ${s.inputs[0]}`),
    domain: [[-6, 6], [1, 8], [0, 3], [0, 1], [0, 1]],
    keep: ([, w, , k]) => k === 0 || w === 1,
    cap: 300,
    difficulty: ([, , s, k, r]) => (k === 1 && !r ? 1 : s === 1 || s === 2 ? 3 : 2),
    teach: {
      idea: "[ or ] means the end belongs to the set (≤, ≥); ( or ) means it does not (<, >). ∞ always gets a round bracket because it is not a real number.",
      method: "Look at each end on its own: is that number in the set? Then write the smaller end on the left and the larger on the right.",
      alternatives: [
        { id: "dots", title: "Filled and open dots", kind: "conceptual", text: ["On a number line a filled dot is an included end ([ ]) and an open dot an excluded end (( )).", "Draw the set, then translate each dot into a bracket."], visual: (p) => ({ type: "numberline", from: p[0] - 3, to: p[0] + p[1] + 3, marks: p[3] ? [p[0]] : [p[0], p[0] + p[1]] }) },
      ],
    },
    limits: "Bounded intervals and rays with whole-number ends, four options each; drawing on a number line is not assessed.",
  },

  // ================================================================ inverse functions
  {
    id: "apinvf",
    arity: 4,
    title: "The inverse of a linear or fractional linear function",
    competency: INV,
    type: "expression",
    mc: true,
    parse: none,
    // [a, b, c, d]: f(x) = (ax + b)/(cx + d); c = 0 means f(x) = ax + b (d = 1)
    reject: ([a, b, c, d]) => (Math.abs(a) > 5 || Math.abs(b) > 6 || c < 0 || c > 3 || Math.abs(d) > 6 || (c === 0 ? d !== 1 || a === 0 : a * d - b * c === 0) ? "f(x) = ax + b, or (ax + b)/(cx + d) with ad − bc ≠ 0." : null),
    prompt: ([a, b, c, d]) =>
      c === 0
        ? `The function f : ℝ → ℝ, f(x) = ${polyS([a, b])}, is a bijection. Find f⁻¹(x).`
        : `The function f : ℝ − {${rs(rr(-d, c))}} → ℝ − {${rs(rr(a, c))}}, f(x) = ${fracS(a, b, c, d)}, is a bijection. Find f⁻¹(x).`,
    solve: ([a, b, c, d]) => {
      const ans = invS(a, b, c, d);
      return {
        steps: [
          st("swap", "write", INV, ["y = f(x)"], c === 0 ? `y = ${polyS([a, b])}` : `y(${polyS([c, d])}) = ${polyS([a, b])}`),
          st("collect", "solve", LIN, ["x"], c === 0 ? `x = (y ${b < 0 ? "+" : "−"} ${Math.abs(b)})/${n_(a)}` : `x(${polyS([c, -a], "y")}) = ${polyS([-d, b], "y")}`),
          st("rename", "write", INV, ["y → x"], ans),
        ],
        answer: ans,
      };
    },
    // independent: f(f⁻¹(x)) must give x back at several points
    validate: ([a, b, c, d], v) => {
      if (typeof v !== "string") return false;
      try {
        const g = parse(v);
        for (const x of [0.37, 1.61, 2.93, -1.27, 4.41]) {
          const y = evaluate(g, { x });
          const back = (a * y + b) / (c * y + d);
          if (!Number.isFinite(back) || Math.abs(back - x) > 1e-9 * Math.max(1, Math.abs(x))) return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    bugs: ([a, b, c, d]) =>
      c === 0
        ? [
            B("reciprocal", "conceptual", INV, "f⁻¹ was taken as 1/f(x); the inverse UNDOES f (f⁻¹(f(x)) = x), it is not the reciprocal.", `1/(${polyS([a, b])})`),
            B("undo-wrong-order", "procedural", INV, `The steps were undone in the wrong order: f multiplies by ${n_(a)} first and then adds ${n_(b)}, so f⁻¹ first takes away ${n_(b)} and then divides by ${n_(a)}.`, b === 0 || a === 1 ? null : `${a < 0 ? "−" : ""}x/${Math.abs(a)} ${b > 0 ? "−" : "+"} ${Math.abs(b)}`),
            B("sign-of-b", "procedural", LIN, `${n_(b)} was moved across without changing its sign.`, b === 0 ? null : linInv(a, -b)),
          ]
        : [
            B("reciprocal", "conceptual", INV, "f⁻¹ was taken as 1/f(x); the inverse UNDOES f (f(f⁻¹(x)) = x), it is not the reciprocal.", fracS(c, d, a, b, "x")),
            B("sign-slip", "procedural", LIN, "A sign was lost when the x terms were collected on one side; check by putting your answer into f.", `${wrapTop(polyS([d, -b]))}/(${polyS([c, -a])})`),
          ],
    distractors: ([a, b, c, d]) => (c === 0 ? [polyS([a, -b])] : [fracS(a, b, c, d), `${wrapTop(polyS([d, b]))}/(${polyS([c, a])})`]),
    variants: () => [],
    explain: (s) => (s.id === "swap" ? `Write ${s.value}` : s.id === "collect" ? `Collect the x terms: ${s.value}` : `Solve and rename y as x: f⁻¹(x) = ${s.value}`),
    domain: [[-5, 5], [-6, 6], [0, 3], [-6, 6]],
    keep: ([a, b, c, d]) => (c === 0 ? d === 1 && a !== 0 : a * d - b * c !== 0),
    cap: 400,
    difficulty: ([a, , c]) => (c === 0 && a > 0 ? 1 : c === 0 ? 2 : 3),
    teach: {
      idea: "f⁻¹ undoes f: y = f(x) exactly when x = f⁻¹(y). It exists because f is one-one and onto its codomain.",
      method: "Write y = f(x), solve for x in terms of y (for a fraction, multiply up and collect the x terms), then rename y as x.",
      alternatives: [
        { id: "compose_check", title: "Check by composing", kind: "procedural", text: ["Pick a number, say x = 1, and work out f(1).", "Put f(1) into your f⁻¹: you must get 1 back. Try a second number to be sure."] },
      ],
    },
    limits: "Linear and fractional linear (Möbius) functions with small whole coefficients; inverse trigonometric functions belong to their own competency.",
  },
  {
    id: "apinvv",
    arity: 5,
    title: "A value of an inverse function",
    competency: INV,
    type: "fraction",
    mc: true,
    parse: none,
    // [a, b, c, d, t]: f⁻¹(t) for f(x) = (ax + b)/(cx + d)
    reject: ([a, b, c, d, t]) => (Math.abs(a) > 5 || Math.abs(b) > 6 || c < 1 || c > 3 || Math.abs(d) > 6 || Math.abs(t) > 6 || a * d - b * c === 0 || c * t - a === 0 ? "f(x) = (ax + b)/(cx + d) with ad − bc ≠ 0 and t in its range." : null),
    prompt: ([a, b, c, d, t]) => `Let f(x) = ${fracS(a, b, c, d)} for x ≠ ${rs(rr(-d, c))}. Find f⁻¹(${n_(t)}). (A fraction is fine.)`,
    solve: ([a, b, c, d, t]) => {
      const x = rr(b - d * t, c * t - a);
      return {
        steps: [
          st("set", "write", INV, [t], `${fracS(a, b, c, d)} = ${n_(t)}`),
          st("multiply", "multiply", LIN, [t], `${polyS([a, b])} = ${n_(t)}(${polyS([c, d])})`),
          st("solve", "solve", LIN, [b - d * t, c * t - a], rs(x)),
        ],
        answer: rv(x),
      };
    },
    // independent: f of the answer must be t
    validate: ([a, b, c, d, t], v) => {
      if (typeof v !== "number" || near(c * v + d, 0)) return false;
      return near((a * v + b) / (c * v + d), t, 1e-9);
    },
    bugs: ([a, b, c, d, t]) => {
      const out: Bug[] = [];
      if (c * t + d !== 0) {
        const ft = rr(a * t + b, c * t + d);
        out.push(B("f-not-inverse", "conceptual", INV, `f(${n_(t)}) was worked out; f⁻¹(${n_(t)}) is the x for which f(x) = ${n_(t)}.`, rv(ft)));
        if (ft[0] !== 0) out.push(B("reciprocal", "conceptual", INV, `1/f(${n_(t)}) was given; f⁻¹ is the inverse function, not the reciprocal.`, rv(rdiv(rr(1), ft))));
      }
      if (b - d * t !== 0) out.push(B("sign-slip", "procedural", LIN, "A sign was lost when the x terms were collected; check by putting your answer into f.", -(b - d * t) / (c * t - a)));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "set" ? `Solve ${s.value}` : s.id === "multiply" ? `Multiply up: ${s.value}` : `Collect x: x = ${n_(Number(s.inputs[0]))} ÷ ${n_(Number(s.inputs[1]))} = ${s.value}`),
    domain: [[-5, 5], [-6, 6], [1, 3], [-6, 6], [-6, 6]],
    keep: ([a, b, c, d, t]) => a * d - b * c !== 0 && c * t - a !== 0,
    cap: 300,
    difficulty: ([a, b, c, d, t]) => ((b - d * t) % (c * t - a) === 0 ? (t >= 0 ? 1 : 2) : 3),
    teach: {
      idea: "f⁻¹(t) is the number x with f(x) = t: the inverse runs the function backwards.",
      method: "Set (ax + b)/(cx + d) = t, multiply both sides by cx + d, collect the x terms and divide.",
      alternatives: [
        { id: "formula_first", title: "Find f⁻¹(x) first", kind: "procedural", text: ["Find the formula f⁻¹(x) = (b − dx)/(cx − a).", "Then put x = t into it."] },
      ],
    },
    limits: "Fractional linear functions with small coefficients; t must be in the range (t ≠ a/c).",
  },

  // ================================================================ linear programming
  {
    id: "aplpmax",
    arity: 8,
    title: "Maximising by the corner-point method",
    competency: LP,
    type: "integer",
    mc: true,
    parse: none,
    // [X, Y, a1, b1, a2, b2, p, q]: max Z = px + qy with a1x + b1y ≤ c1, a2x + b2y ≤ c2 meeting at (X, Y)
    reject: (p) => (p.slice(0, 2).some((x) => x < 1 || x > 6) || p.slice(2, 6).some((x) => x < 1 || x > 5) || p.slice(6).some((x) => x < 1 || x > 9) || !lpKeep(p) ? "Two ≤ constraints with whole-number corner points." : null),
    prompt: (p) => `Maximise Z = ${polyS([p[6], 0])} + ${polyS([p[7], 0], "y")} subject to ${lpCons(p, false)}. What is the maximum value of Z?`,
    solve: (p) => {
      const cs = lpCorners(p, false);
      const zs = cs.map((c) => Z(p[6], p[7], c));
      return { steps: [st("corners", "solve", LP, [lpCons(p, false)], cs.map((c) => `(${c.join(", ")})`).join(", ")), st("evaluate", "evaluate", LP, zs, Math.max(...zs))], answer: Math.max(...zs) };
    },
    validate: (p, v) => v === lpBrute(p, false, p[6], p[7]),
    bugs: (p) => {
      const cs = lpCorners(p, false);
      const best = Math.max(...cs.map((c) => Z(p[6], p[7], c)));
      const wrong = Math.max(best, ...lpWrong(p, false).map((c) => Z(p[6], p[7], c)));
      const zv = Z(p[6], p[7], [p[0], p[1]]);
      return [
        B("infeasible-corner", "conceptual", LP, "An axis intercept that breaks the other constraint was used as a corner; every corner must satisfy ALL the constraints.", wrong === best ? null : wrong),
        B("intersection-only", "procedural", LP, "Only the point where the two lines meet was checked; Z must be worked out at every corner of the feasible region.", zv === best ? null : zv),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "corners" ? `The corner points of the feasible region are ${s.value}` : `Z at the corners: ${s.inputs.join(", ")}; the greatest is ${s.value}`),
    domain: [[1, 6], [1, 6], [1, 5], [1, 5], [1, 5], [1, 5], [1, 9], [1, 9]],
    keep: lpKeep,
    cap: 400,
    difficulty: (p) => (Z(p[6], p[7], [p[0], p[1]]) === Math.max(...lpCorners(p, false).map((c) => Z(p[6], p[7], c))) ? 2 : 3),
    word: (p) => {
      const L = lpOf(p)!;
      return `A carpenter makes x chairs and y tables a week. A chair needs ${p[2]} units of wood and ${p[4]} hours of work; a table needs ${p[3]} units of wood and ${p[5]} hours of work. Each week there are ${L.c1} units of wood and ${L.c2} hours of work. The profit is ₹${p[6]}00 on a chair and ₹${p[7]}00 on a table. Using the corner-point method, find the greatest weekly profit, in hundreds of rupees.`;
    },
    teach: {
      idea: "A linear objective takes its greatest and least values over a bounded feasible region at corner points of the region.",
      method: "Draw each constraint line, find the corner points (axis intercepts and where lines meet) that satisfy every constraint, work out Z at each, and take the greatest.",
      alternatives: [
        { id: "iso_profit", title: "Slide the objective line", kind: "conceptual", text: ["Draw px + qy = k for a small k and slide it outwards, keeping it parallel.", "The last point of the region it touches gives the maximum."] },
      ],
    },
    limits: "Two ≤ constraints plus x, y ≥ 0, with whole-number corner points; formulating a problem in words and drawing the region are assessed by an educator.",
  },
  {
    id: "aplpmin",
    arity: 8,
    title: "Minimising over an unbounded feasible region",
    competency: LP,
    type: "integer",
    mc: true,
    parse: none,
    // [X, Y, a1, b1, a2, b2, p, q]: min Z = px + qy with a1x + b1y ≥ c1, a2x + b2y ≥ c2
    reject: (p) => (p.slice(0, 2).some((x) => x < 1 || x > 6) || p.slice(2, 6).some((x) => x < 1 || x > 5) || p.slice(6).some((x) => x < 1 || x > 9) || !lpKeep(p) ? "Two ≥ constraints with whole-number corner points." : null),
    prompt: (p) => `Minimise Z = ${polyS([p[6], 0])} + ${polyS([p[7], 0], "y")} subject to ${lpCons(p, true)}. (The feasible region is unbounded, but Z has a least value on it.) What is the minimum value of Z?`,
    solve: (p) => {
      const cs = lpCorners(p, true);
      const zs = cs.map((c) => Z(p[6], p[7], c));
      return { steps: [st("corners", "solve", LP, [lpCons(p, true)], cs.map((c) => `(${c.join(", ")})`).join(", ")), st("evaluate", "evaluate", LP, zs, Math.min(...zs))], answer: Math.min(...zs) };
    },
    validate: (p, v) => v === lpBrute(p, true, p[6], p[7]),
    bugs: (p) => {
      const cs = lpCorners(p, true);
      const best = Math.min(...cs.map((c) => Z(p[6], p[7], c)));
      const wrong = Math.min(best, ...lpWrong(p, true).map((c) => Z(p[6], p[7], c)));
      const zv = Z(p[6], p[7], [p[0], p[1]]);
      return [
        B("origin", "conceptual", LP, "The origin was used as a corner; (0, 0) does not satisfy the ≥ constraints, so it is not in the feasible region.", 0),
        B("infeasible-corner", "conceptual", LP, "An axis intercept that breaks the other constraint was used; every corner must satisfy ALL the constraints.", wrong === best ? null : wrong),
        B("intersection-only", "procedural", LP, "Only the point where the two lines meet was checked; Z must be worked out at every corner.", zv === best ? null : zv),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "corners" ? `The corner points of the feasible region are ${s.value}` : `Z at the corners: ${s.inputs.join(", ")}; the least is ${s.value}`),
    domain: [[1, 6], [1, 6], [1, 5], [1, 5], [1, 5], [1, 5], [1, 9], [1, 9]],
    keep: lpKeep,
    cap: 400,
    difficulty: (p) => (Z(p[6], p[7], [p[0], p[1]]) === Math.min(...lpCorners(p, true).map((c) => Z(p[6], p[7], c))) ? 2 : 3),
    word: (p) => {
      const L = lpOf(p)!;
      return `A dietician mixes x kg of food F and y kg of food G. One kg of F gives ${p[2]} units of vitamin A and ${p[4]} units of vitamin C; one kg of G gives ${p[3]} units of vitamin A and ${p[5]} units of vitamin C. The mixture must give at least ${L.c1} units of vitamin A and at least ${L.c2} units of vitamin C. F costs ₹${p[6]}0 a kg and G costs ₹${p[7]}0 a kg. Using the corner-point method, find the least cost of the mixture, in tens of rupees.`;
    },
    teach: {
      idea: "With ≥ constraints the feasible region is unbounded, but if p, q > 0 then Z = px + qy still has a least value, at a corner point.",
      method: "Find the corner points (the intercepts that satisfy both constraints, and the meeting point), work out Z at each and take the least. For an unbounded region, check that the half-plane px + qy < (that value) has no point in common with the region.",
      alternatives: [
        { id: "iso_cost", title: "Slide the cost line inwards", kind: "conceptual", text: ["Draw px + qy = k for a large k and slide it towards the origin.", "The last point of the region it touches gives the minimum."] },
      ],
    },
    limits: "Two ≥ constraints plus x, y ≥ 0 with positive costs (so a minimum exists); cases with no minimum are explained, not asked.",
  },
  {
    id: "aplpopt",
    arity: 8,
    title: "The optimal corner point of a linear programme",
    competency: LP,
    type: "tuple",
    mc: true,
    parse: none,
    // [X, Y, a1, b1, a2, b2, p, q]: the corner that maximises Z (unique)
    reject: (p) => {
      if (p.slice(0, 2).some((x) => x < 1 || x > 6) || p.slice(2, 6).some((x) => x < 1 || x > 5) || p.slice(6).some((x) => x < 1 || x > 9) || !lpKeep(p)) return "Two ≤ constraints with whole-number corner points.";
      const zs = lpCorners(p, false).map((c) => Z(p[6], p[7], c)).sort((a, b) => b - a);
      return zs[0] === zs[1] ? "More than one optimal corner." : null;
    },
    prompt: (p) => `Maximise Z = ${polyS([p[6], 0])} + ${polyS([p[7], 0], "y")} subject to ${lpCons(p, false)}. At which point (x, y) does Z take its maximum value?`,
    solve: (p) => {
      const cs = lpCorners(p, false);
      const zs = cs.map((c) => Z(p[6], p[7], c));
      const best = cs[zs.indexOf(Math.max(...zs))];
      return { steps: [st("corners", "solve", LP, [lpCons(p, false)], cs.map((c) => `(${c.join(", ")})`).join(", ")), st("evaluate", "evaluate", LP, zs, `(${best.join(", ")})`)], answer: `(${best.join(", ")})` };
    },
    // independent: the point is feasible and no whole-number feasible point does better
    validate: (p, v) => {
      const l = typeof v === "string" ? readList(v) : null;
      if (!l || l.length !== 2 || l.some((x) => x[1] !== 1)) return false;
      const [x, y] = l.map((r) => r[0]);
      const L = lpOf(p)!;
      if (x < 0 || y < 0 || p[2] * x + p[3] * y > L.c1 || p[4] * x + p[5] * y > L.c2) return false;
      return Z(p[6], p[7], [x, y]) === lpBrute(p, false, p[6], p[7]);
    },
    bugs: (p) => {
      const cs = lpCorners(p, false);
      const zs = cs.map((c) => Z(p[6], p[7], c));
      const best = Math.max(...zs);
      const bad = lpWrong(p, false).filter((c) => Z(p[6], p[7], c) > best).sort((a, b) => Z(p[6], p[7], b) - Z(p[6], p[7], a))[0];
      return [
        B("infeasible-corner", "conceptual", LP, "An axis intercept that breaks the other constraint was chosen; check every corner in ALL the constraints.", bad ? `(${bad.join(", ")})` : null),
        B("intersection-only", "procedural", LP, "The meeting point of the two lines was chosen without comparing Z at the other corners.", Z(p[6], p[7], [p[0], p[1]]) === best ? null : `(${p[0]}, ${p[1]})`),
      ];
    },
    distractors: (p) => lpCorners(p, false).filter((c) => c[0] || c[1]).map((c) => `(${c.join(", ")})`),
    variants: () => [],
    explain: (s) => (s.id === "corners" ? `The corner points are ${s.value}` : `Z at the corners: ${s.inputs.join(", ")}; the maximum is at ${s.value}`),
    domain: [[1, 6], [1, 6], [1, 5], [1, 5], [1, 5], [1, 5], [1, 9], [1, 9]],
    keep: lpKeep,
    cap: 400,
    difficulty: (p) => (lpCorners(p, false).map((c) => Z(p[6], p[7], c)).indexOf(Z(p[6], p[7], [p[0], p[1]])) === -1 ? 3 : 2),
    word: (p) => {
      const L = lpOf(p)!;
      return `A small factory makes x boxes of sweets of type P and y boxes of type Q a day. A box of P needs ${p[2]} kg of sugar and ${p[4]} hours of work; a box of Q needs ${p[3]} kg of sugar and ${p[5]} hours of work. Each day there are ${L.c1} kg of sugar and ${L.c2} hours of work. The profit is ₹${p[6]}0 on a box of P and ₹${p[7]}0 on a box of Q. How many boxes of each type give the greatest profit? Write the answer as (P boxes, Q boxes).`;
    },
    teach: {
      idea: "The optimal solution is the feasible point where Z is best; for a linear Z it is a corner point of the feasible region.",
      method: "List the corner points that satisfy every constraint, work out Z at each, and choose the corner with the greatest Z.",
      alternatives: [
        { id: "table", title: "A corner table", kind: "procedural", text: ["Make a table: corner point, then the value of Z.", "Cross out any point that breaks a constraint before comparing."] },
      ],
    },
    limits: "Regions with four whole-number corners and a single optimal corner; ties along an edge are left out.",
  },

  // ================================================================ matrices
  {
    id: "apmmul",
    arity: 8,
    title: "Multiplying two 2 × 2 matrices",
    competency: MAT,
    type: "matrix",
    mc: true,
    parse: none,
    // [a, b, c, d, e, f, g, h]: A = [[a, b], [c, d]], B = [[e, f], [g, h]]; AB
    reject: (p) => (p.some((x) => x < -3 || x > 5) ? "Entries from −3 to 5." : null),
    prompt: (p) => `A = ${matN(m2(p))} and B = ${matN(m2(p, 4))}. Find AB.`,
    solve: (p) => {
      const P = mmul(toM(m2(p)), toM(m2(p, 4)));
      return { steps: [st("row1", "multiply", MAT, ["row 1 of A", "columns of B"], `[${P[0].map(rs).join(", ")}]`), st("row2", "multiply", MAT, ["row 2 of A", "columns of B"], `[${P[1].map(rs).join(", ")}]`)], answer: matS(P) };
    },
    // independent: (AB)v = A(Bv) for vectors v that span the plane
    validate: (p, v) => {
      const X = typeof v === "string" ? readMat(v) : null;
      if (!X || X.length !== 2 || X[0].length !== 2) return false;
      const A = m2(p);
      const Bm = m2(p, 4);
      const app = (Mx: number[][], u: number[]) => [Mx[0][0] * u[0] + Mx[0][1] * u[1], Mx[1][0] * u[0] + Mx[1][1] * u[1]];
      return [[1, 1], [1, -1], [2, -3]].every((u) => {
        const want = app(A, app(Bm, u));
        return [0, 1].every((i) => req(radd(rmul(X[i][0], rr(u[0])), rmul(X[i][1], rr(u[1]))), rr(want[i])));
      });
    },
    bugs: (p) => {
      const A = toM(m2(p));
      const Bm = toM(m2(p, 4));
      return [
        B("entry-by-entry", "conceptual", MAT, "Matching entries were multiplied; in a matrix product each entry is a row of A times a column of B, added up.", matS(A.map((r, i) => r.map((x, j) => rmul(x, Bm[i][j]))))),
        B("order-reversed", "conceptual", MAT, "BA was found; matrix multiplication is not commutative, and AB uses the rows of A with the columns of B.", matS(mmul(Bm, A))),
        B("row-by-row", "procedural", MAT, "Rows of A were multiplied with rows of B; use the COLUMNS of B.", matS(mmul(A, mT(Bm)))),
      ];
    },
    distractors: (p) => [matS(mmul(toM(m2(p)), toM(m2(p, 4))).map((r) => r.map((x) => rmul(x, rr(-1)))))],
    variants: () => [],
    explain: (s) => `${s.inputs[0]} with each of the ${s.inputs[1]}: ${s.value}`,
    domain: [[-3, 5], [-3, 5], [-3, 5], [-3, 5], [-3, 5], [-3, 5], [-3, 5], [-3, 5]],
    keep: (p) => {
      const A = toM(m2(p));
      const Bm = toM(m2(p, 4));
      return p.filter((x) => x === 0).length <= 2 && !meq(mmul(A, Bm), mmul(Bm, A));
    },
    cap: 400,
    difficulty: (p) => (p.every((x) => x >= 0) ? 1 : p.filter((x) => x < 0).length <= 2 ? 2 : 3),
    teach: {
      idea: "Entry (i, j) of AB combines row i of A with column j of B: multiply matching entries and add. In general AB ≠ BA.",
      method: "For each of the four entries take a row of A and a column of B, multiply pairwise and add; keep the signs.",
      alternatives: [
        { id: "columns", title: "Column by column", kind: "conceptual", text: ["Column j of AB is A times column j of B.", "So find A[e, g] and A[f, h] (as column vectors) and stand them side by side."] },
      ],
    },
    limits: "2 × 2 products with entries from −3 to 5 and AB ≠ BA; larger conformable products appear in the cost-model family.",
  },
  {
    id: "apmlin",
    arity: 10,
    title: "Solving a matrix equation kX ± A = B",
    competency: MAT,
    type: "matrix",
    mc: true,
    parse: none,
    // [k, s, x1..x4, a1..a4]: kX + A = B (s = 0) or kX − A = B (s = 1), with X = [[x1, x2], [x3, x4]]
    reject: (p) => (p[0] < 2 || p[0] > 4 || (p[1] !== 0 && p[1] !== 1) || p.slice(2, 6).some((x) => x < -4 || x > 5) || p.slice(6).some((x) => x < -6 || x > 6) ? "kX ± A = B with k from 2 to 4 and small entries." : null),
    prompt: (p) => `A = ${matN(m2(p, 6))} and B = ${matN(mlinB(p))}. Find the matrix X such that ${p[0]}X ${p[1] ? "−" : "+"} A = B.`,
    solve: (p) => {
      const X = m2(p, 2);
      const rhs = mlinB(p).map((r, i) => r.map((x, j) => (p[1] ? x + p[6 + 2 * i + j] : x - p[6 + 2 * i + j])));
      return { steps: [st("move", p[1] ? "add" : "subtract", MAT, ["A"], matN(rhs)), st("divide", "divide", MAT, [p[0]], matN(X))], answer: matN(X) };
    },
    // independent: put X back into the equation
    validate: (p, v) => {
      const X = typeof v === "string" ? readMat(v) : null;
      if (!X || X.length !== 2 || X[0].length !== 2) return false;
      const A = m2(p, 6);
      const Bm = mlinB(p);
      return X.every((r, i) => r.every((x, j) => req(radd(rmul(x, rr(p[0])), rr(p[1] ? -A[i][j] : A[i][j])), rr(Bm[i][j]))));
    },
    bugs: (p) => {
      const A = m2(p, 6);
      const Bm = mlinB(p);
      const k = p[0];
      const rhs = Bm.map((r, i) => r.map((x, j) => (p[1] ? x + A[i][j] : x - A[i][j])));
      const wrongSign = Bm.map((r, i) => r.map((x, j) => rr(p[1] ? x - A[i][j] : x + A[i][j], k)));
      return [
        B("not-divided", "procedural", MAT, `B ${p[1] ? "+" : "−"} A is ${k}X, not X; every entry must still be divided by ${k}.`, matN(rhs)),
        B("sign-of-a", "procedural", MAT, `A was moved to the other side without changing its sign: ${k}X = B ${p[1] ? "+" : "−"} A.`, matS(wrongSign)),
      ];
    },
    distractors: (p) => [matN(m2(p, 2).map((r) => r.map((x) => -x))), matN(mT(m2(p, 2)))],
    variants: () => [],
    explain: (s) => (s.id === "move" ? `${s.op === "add" ? "Add" : "Subtract"} A on both sides: ${s.inputs[0] === "A" ? "" : ""}the right side is ${s.value}` : `Divide every entry by ${s.inputs[0]}: X = ${s.value}`),
    domain: [[2, 4], [0, 1], [-4, 5], [-4, 5], [-4, 5], [-4, 5], [-6, 6], [-6, 6], [-6, 6], [-6, 6]],
    keep: (p) => p.slice(2, 6).filter((x) => x === 0).length <= 1 && !mT(m2(p, 2)).every((r, i) => r.every((x, j) => x === m2(p, 2)[i][j])),
    cap: 400,
    difficulty: ([k, s]) => (k === 2 && !s ? 1 : s ? 3 : 2),
    teach: {
      idea: "Matrices are equal when every pair of matching entries is equal, so a matrix equation is solved like a number equation, entry by entry.",
      method: "Move A to the other side (subtract it, or add it if it was subtracted), then divide every entry by k.",
      alternatives: [
        { id: "entries", title: "Four small equations", kind: "procedural", text: ["Write X = [[p, q], [r, s]] and compare entries: k·p ± a₁₁ = b₁₁, and so on.", "Solve each of the four equations for one unknown."] },
      ],
    },
    limits: "2 × 2 matrices with whole-number X; equations with matrix products (AX = B) are solved in the matrix-systems families.",
  },
  {
    id: "apmcost",
    arity: 9,
    title: "A matrix product as a total bill",
    competency: MAT,
    type: "matrix",
    mc: true,
    parse: none,
    // [q11, q12, q13, q21, q22, q23, i1, i2, i3]: quantities (2 × 3) times prices PRICES[i] (3 × 1)
    reject: (p) => (p.slice(0, 6).some((x) => x < 1 || x > 9) || p.slice(6).some((x) => x < 0 || x >= PRICES.length) ? "Quantities 1 to 9 and listed prices." : null),
    prompt: (p) => `Q = ${matN([p.slice(0, 3), p.slice(3, 6)])} (order 2 × 3) and P = ${matN(costP(p))} (order 3 × 1). Find QP.`,
    solve: (p) => {
      const T = costT(p);
      return { steps: [st("row1", "multiply", MAT, [p.slice(0, 3).join(","), costP(p).flat().join(",")], T[0]), st("row2", "multiply", MAT, [p.slice(3, 6).join(","), costP(p).flat().join(",")], T[1])], answer: matN([[T[0]], [T[1]]]) };
    },
    // independent: the column totals give t₁ + t₂ and the differences give t₁ − t₂
    validate: (p, v) => {
      const X = typeof v === "string" ? readMat(v) : null;
      if (!X || X.length !== 2 || X[0].length !== 1 || X.some((r) => r[0][1] !== 1)) return false;
      const pr = costP(p).flat();
      const sum = [0, 1, 2].reduce((s, j) => s + (p[j] + p[3 + j]) * pr[j], 0);
      const diff = [0, 1, 2].reduce((s, j) => s + (p[j] - p[3 + j]) * pr[j], 0);
      return X[0][0][0] + X[1][0][0] === sum && X[0][0][0] - X[1][0][0] === diff;
    },
    bugs: (p) => {
      const pr = costP(p).flat();
      const T = costT(p);
      return [
        B("item-left-out", "procedural", MAT, "The third item was left out; a row of 3 quantities times a column of 3 prices has 3 products to add.", matN([[p[0] * pr[0] + p[1] * pr[1]], [p[3] * pr[0] + p[4] * pr[1]]])),
        B("added", "conceptual", MAT, "Each quantity was added to its price; the bill multiplies each quantity by its price and then adds.", matN([[p[0] + p[1] + p[2] + pr[0] + pr[1] + pr[2]], [p[3] + p[4] + p[5] + pr[0] + pr[1] + pr[2]]])),
        B("rows-swapped", "procedural", MAT, "The two rows were written in the wrong order; row 1 of QP comes from row 1 of Q.", T[0] === T[1] ? null : matN([[T[1]], [T[0]]])),
      ];
    },
    distractors: (p) => {
      const T = costT(p);
      return [matN([[T[0] + 10], [T[1]]]), matN([[T[0]], [T[1] - 10]])];
    },
    variants: () => [],
    explain: (s) => `Row (${s.inputs[0]}) times column (${s.inputs[1]}): ${s.value}`,
    domain: [[1, 9], [1, 9], [1, 9], [1, 9], [1, 9], [1, 9], [0, 7], [0, 7], [0, 7]],
    keep: (p) => new Set(p.slice(6)).size === 3,
    cap: 300,
    difficulty: (p) => (p.slice(0, 6).every((x) => x <= 5) ? 1 : 2),
    word: (p) => {
      const pr = costP(p).flat();
      return `Two shops sold rice, dal and sugar in one day. Anbu Stores sold ${p[0]} kg of rice, ${p[1]} kg of dal and ${p[2]} kg of sugar; Kaveri Traders sold ${p[3]} kg, ${p[4]} kg and ${p[5]} kg. Rice costs ₹${pr[0]}, dal ₹${pr[1]} and sugar ₹${pr[2]} a kg. Multiply the quantity matrix (one row per shop) by the price matrix (one column) to write the takings, in rupees, as a column matrix (Anbu Stores first).`;
    },
    teach: {
      idea: "A row of quantities times a column of prices is a bill: each quantity is multiplied by its own price and the products are added. QP does this for every row at once.",
      method: "Check the orders: (2 × 3)(3 × 1) gives 2 × 1. For each row of Q, multiply the three entries by the three prices and add.",
      alternatives: [
        { id: "bill", title: "Write it as two bills", kind: "procedural", text: ["Write each shop's bill as quantity × price + quantity × price + quantity × price.", "The two totals, one under the other, are the column matrix QP."] },
      ],
    },
    limits: "Two rows of three positive quantities and three prices from a short list; a column answer of order 2 × 1.",
  },

  // ================================================================ systems by matrices
  {
    id: "apsys3",
    arity: 12,
    title: "Solving three equations by X = A⁻¹B",
    competency: MSYS,
    type: "tuple",
    mc: true,
    parse: none,
    // [a11 … a33, x, y, z]: AX = B with the solution (x, y, z)
    reject: (p) => (p.slice(0, 9).some((x) => x < -2 || x > 3) || p.slice(9).some((x) => x < -3 || x > 4) || sarrus(m3(p)) === 0 ? "Three equations, coefficients −2 to 3, a whole-number solution, |A| ≠ 0." : null),
    prompt: (p) => `Solve by the matrix method (X = A⁻¹B): ${sys3B(p).map((r, i) => eqS(m3(p)[i], r)).join("; ")}. Write the solution as (x, y, z).`,
    solve: (p) => {
      const A = m3(p);
      const D = sarrus(A);
      const adj = mT(cofactors(A));
      const AB = mmul(toM(adj), toM(sys3B(p).map((x) => [x])));
      const X = AB.map((r) => rdiv(r[0], rr(D)));
      return { steps: [st("det", "evaluate", DET, [matN(A)], D), st("adj", "transpose", ADJ, ["cofactors"], matN(adj)), st("solve", "multiply", MSYS, [`adj A · B = ${tup(AB.map((r) => r[0]))}`, D], tup(X))], answer: tup(X) };
    },
    // independent: substitute into all three equations
    validate: (p, v) => {
      const l = typeof v === "string" ? readList(v) : null;
      if (!l || l.length !== 3) return false;
      const A = m3(p);
      const b = sys3B(p);
      return A.every((r, i) => req(r.reduce((s, c, j) => radd(s, rmul(rr(c), l[j])), [0, 1] as R), rr(b[i])));
    },
    bugs: (p) => {
      const A = m3(p);
      const D = sarrus(A);
      const b = toM(sys3B(p).map((x) => [x]));
      const C = mmul(toM(cofactors(A)), b).map((r) => rdiv(r[0], rr(D)));
      const X = p.slice(9).map((x) => rr(x));
      return [
        B("cofactors-not-transposed", "procedural", ADJ, "The matrix of cofactors was used instead of its transpose; adj A is the TRANSPOSE of the cofactor matrix.", tup(C)),
        B("det-sign", "procedural", DET, "|A| was found with the wrong sign; check the signs in the expansion (+, −, + along the first row).", tup(X.map((x) => rmul(x, rr(-1))))),
        B("not-divided", "procedural", MSYS, "adj A · B was not divided by |A|; A⁻¹ = adj A / |A|.", Math.abs(D) === 1 ? null : tup(X.map((x) => rmul(x, rr(D))))),
      ];
    },
    distractors: (p) => [tup([p[10], p[9], p[11]].map((x) => rr(x))), tup([p[9], p[11], p[10]].map((x) => rr(x)))],
    variants: () => [],
    explain: (s) => (s.id === "det" ? `|A| = ${n_(Number(s.value))} (not 0, so A⁻¹ exists)` : s.id === "adj" ? `adj A = (matrix of cofactors)ᵀ = ${s.value}` : `X = (1/|A|) adj A · B: ${s.inputs[0]}, divided by ${n_(Number(s.inputs[1]))}, gives ${s.value}`),
    domain: [[-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-3, 4], [-3, 4], [-3, 4]],
    keep: (p) => {
      const A = m3(p);
      const D = sarrus(A);
      return D !== 0 && Math.abs(D) <= 30 && A.every((r) => r.filter((x) => x === 0).length <= 1) && !mT(A).every((r, i) => r.every((x, j) => x === A[i][j])) && new Set(A.map((r) => r.join(","))).size === 3;
    },
    cap: 400,
    difficulty: (p) => (Math.abs(sarrus(m3(p))) <= 3 ? 2 : 3),
    teach: {
      idea: "A system AX = B with |A| ≠ 0 has exactly one solution, X = A⁻¹B, and A⁻¹ = (1/|A|) adj A.",
      method: "Find |A|; find the nine cofactors and transpose them to get adj A; multiply adj A by B and divide by |A|.",
      alternatives: [
        { id: "cramer", title: "Cramer's rule", kind: "procedural", text: ["x = |A₁|/|A|, y = |A₂|/|A|, z = |A₃|/|A|, where Aᵢ is A with column i replaced by B.", "Check by substituting the values back into each equation."] },
      ],
    },
    limits: "Three equations with small coefficients and a whole-number solution; systems with no or many solutions are in the consistency competency.",
  },
  {
    id: "apsys2",
    arity: 6,
    title: "Solving two equations with an inverse matrix",
    competency: MSYS,
    type: "tuple",
    mc: true,
    parse: none,
    // [a, b, c, d, x, y]: [[a, b], [c, d]] X = B with solution (x, y)
    reject: (p) => (p.slice(0, 4).some((v) => v < 1 || v > 6) || p.slice(4).some((v) => v < 1 || v > 12) || p[0] * p[3] - p[1] * p[2] === 0 ? "Positive coefficients up to 6, |A| ≠ 0, whole-number solution up to 12." : null),
    prompt: ([a, b, c, d, x, y]) => `Use the inverse of A = ${matN([[a, b], [c, d]])} to solve AX = B, where X = [[x], [y]] and B = ${matN([[a * x + b * y], [c * x + d * y]])}. Write the solution as (x, y).`,
    solve: ([a, b, c, d, x, y]) => {
      const D = a * d - b * c;
      const e = a * x + b * y;
      const f = c * x + d * y;
      return { steps: [st("det", "evaluate", DET, [a, b, c, d], D), st("inverse", "invert", ADJ, [D], `(1/${n_(D)})${matN([[d, -b], [-c, a]])}`), st("solve", "multiply", MSYS, [e, f], `(${x}, ${y})`)], answer: `(${x}, ${y})` };
    },
    // independent: substitute
    validate: ([a, b, c, d, x, y], v) => {
      const l = typeof v === "string" ? readList(v) : null;
      if (!l || l.length !== 2) return false;
      return req(radd(rmul(rr(a), l[0]), rmul(rr(b), l[1])), rr(a * x + b * y)) && req(radd(rmul(rr(c), l[0]), rmul(rr(d), l[1])), rr(c * x + d * y));
    },
    bugs: ([a, b, c, d, x, y]) => {
      const D = a * d - b * c;
      const e = a * x + b * y;
      const f = c * x + d * y;
      return [
        B("adj-signs", "procedural", ADJ, "In the adjoint the off-diagonal entries were not negated; for [[a, b], [c, d]] the adjoint is [[d, −b], [−c, a]].", tup([rr(d * e + b * f, D), rr(c * e + a * f, D)])),
        B("swapped", "procedural", MSYS, "x and y were written the wrong way round; X = [[x], [y]], so the first entry of A⁻¹B is x.", x === y ? null : `(${y}, ${x})`),
        B("not-divided", "procedural", MSYS, "adj A · B was not divided by |A|; A⁻¹ = adj A / |A|.", Math.abs(D) === 1 ? null : tup([rr(D * x), rr(D * y)])),
      ];
    },
    distractors: ([, , , , x, y]) => [`(${x + 1}, ${y})`, `(${x}, ${y + 1})`],
    variants: () => [],
    explain: (s) => (s.id === "det" ? `|A| = ${n_(Number(s.value))}` : s.id === "inverse" ? `A⁻¹ = ${s.value}` : `X = A⁻¹B = ${s.value}`),
    domain: [[1, 6], [1, 6], [1, 6], [1, 6], [1, 12], [1, 12]],
    keep: ([a, b, c, d]) => a * d - b * c !== 0,
    cap: 400,
    difficulty: ([a, b, c, d]) => (Math.abs(a * d - b * c) === 1 ? 1 : Math.abs(a * d - b * c) <= 6 ? 2 : 3),
    word: ([a, b, c, d, x, y]) => `${name(a + d)} buys ${a} pens and ${b} notebooks for ₹${a * x + b * y}. ${name(a + d + 3)} buys ${c} pens and ${d} notebooks for ₹${c * x + d * y}. Write these as a matrix equation and use the inverse matrix to find the price of one pen and of one notebook, in rupees. Write the answer as (pen, notebook).`,
    teach: {
      idea: "If |A| ≠ 0 then A has an inverse and AX = B gives X = A⁻¹B. For a 2 × 2 matrix, A⁻¹ = (1/|A|)[[d, −b], [−c, a]].",
      method: "Find |A| = ad − bc, write the adjoint (swap a and d, negate b and c), multiply it by B and divide by |A|.",
      alternatives: [
        { id: "check", title: "Check in both equations", kind: "procedural", text: ["Put your x and y into the first equation, then the second.", "Both totals must match B; if one does not, look again at the adjoint's signs."] },
      ],
    },
    limits: "Two equations with positive coefficients up to 6 and a whole-number solution (so it can be read as prices).",
  },

  // ================================================================ theory of equations
  {
    id: "approg",
    arity: 4,
    title: "A cubic whose roots are in progression",
    competency: PES,
    type: "set",
    parse: none,
    // [g, u, v, k]: roots u − v, u, u + v (g = 0, AP) or u, u·v, u·v² (g = 1, GP); leading coefficient k
    reject: ([g, u, v, k]) => ((g !== 0 && g !== 1) || k < 1 || k > 2 || (g === 0 ? u < -5 || u > 6 || v < 1 || v > 6 : u === 0 || Math.abs(u) > 3 || ![-3, -2, 2, 3].includes(v)) ? "Roots in AP (whole middle root and difference) or GP (whole first root, ratio ±2 or ±3)." : null),
    prompt: (p) => `The roots of ${polyS(fromRoots(p[3], progRoots(p)))} = 0 are in ${p[0] ? "geometric" : "arithmetic"} progression. Solve the equation. Write the roots separated by commas.`,
    word: (p) => `Engineers plan a new road through the Nilgiri hills. A survey models the height of the road above a reference level, in metres, by h = ${polyS(fromRoots(p[3], progRoots(p)))}, where x is the distance in km east of a check post (negative values are to the west) and a negative h means the road runs through a tunnel below the reference level. ${name(p[1] + p[2] + p[3])} notices that the road is exactly at the reference level (h = 0) at three places, whose x-values are in ${p[0] ? "geometric progression (each is the same multiple of the one before)" : "arithmetic progression (equally spaced)"}. Find these three x-values, in km. Write them separated by commas.`,
    solve: (p) => {
      const cs = fromRoots(p[3], progRoots(p));
      const rts = progRoots(p);
      const mid = rts[1];
      return {
        steps: [
          p[0] ? st("middle", "divide", VIETA, [-cs[3], cs[0]], mid) : st("middle", "divide", VIETA, [-cs[1], 3 * cs[0]], mid),
          st("factor", "divide", FACT, [mid], polyS(fromRoots(p[3], [rts[0], rts[2]]))),
          st("roots", "solve", PES, [rts[0], rts[2]], [...rts].sort((a, b) => a - b)),
        ],
        answer: [...rts].sort((a, b) => a - b),
      };
    },
    // independent: each value is a root (substitute) and there are three of them
    validate: (p, v) => {
      if (!Array.isArray(v) || v.length !== 3 || new Set(v).size !== 3) return false;
      const cs = fromRoots(p[3], progRoots(p));
      return v.every((x) => horner(cs, x) === 0);
    },
    bugs: (p) => {
      const rts = progRoots(p);
      return [
        B("sign-of-sum", "recall", VIETA, p[0] ? "The product of the roots was taken with the wrong sign; for ax³ + bx² + cx + d it is −d/a." : "The sum of the roots was taken as +b/a; it is −b/a.", rts.map((x) => -x)),
        B("middle-only", "procedural", PES, "Only the middle root was found; divide by (x − middle root) and solve the quadratic left over for the other two.", [rts[1]]),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "middle" ? `The middle root is ${n_(Number(s.inputs[0]))} ÷ ${n_(Number(s.inputs[1]))} = ${n_(Number(s.value))}` : s.id === "factor" ? `Dividing by (x − ${n_(Number(s.inputs[0]))}) leaves ${s.value}` : `The roots are ${(s.value as number[]).map(n_).join(", ")}`),
    domain: [[0, 1], [-5, 6], [-3, 6], [1, 2]],
    keep: ([g, u, v]) => (g === 0 ? v >= 1 : u !== 0 && Math.abs(u) <= 3 && [-3, -2, 2, 3].includes(v)),
    difficulty: ([g, , , k]) => (g === 0 && k === 1 ? 1 : g === 0 ? 2 : 3),
    teach: {
      idea: "Roots in AP can be written a − d, a, a + d: their sum is 3a. Roots in GP can be written a/r, a, ar: their product is a³. Vieta then gives the middle root.",
      method: "For an AP, a = (−b/leading coefficient)/3; for a GP, a³ = −(constant)/(leading coefficient). Check a is a root, divide by (x − a) and solve the quadratic.",
      alternatives: [
        { id: "synthetic", title: "Synthetic division", kind: "procedural", text: ["Once the middle root a is known, divide the coefficients by a in a synthetic-division table.", "The bottom row gives the quadratic; factorise it for the other two roots."] },
      ],
    },
    limits: "Cubics with three whole-number roots in AP or GP; reciprocal equations and reducible non-polynomial equations are not included.",
  },
  {
    id: "aprrt",
    arity: 4,
    title: "Solving a cubic with the rational root theorem",
    competency: PES,
    type: "set",
    parse: none,
    // [p, q, s, t]: roots p/q, s, t of (qx − p)(x − s)(x − t)
    reject: ([p, q, s, t]) => (p === 0 || Math.abs(p) > 5 || q < 2 || q > 3 || gcd(Math.abs(p), q) !== 1 || Math.abs(s) > 4 || Math.abs(t) > 4 || s >= t || s * t === 0 ? "Roots p/q (q = 2 or 3) and two different non-zero whole numbers." : null),
    prompt: (p) => `Solve ${polyS(rrtPoly(p))} = 0. (All its roots are rational: try ± (a factor of the constant term)/(a factor of the leading coefficient).) Write the roots separated by commas.`,
    solve: ([p, q, s, t]) => {
      const cs = rrtPoly([p, q, s, t]);
      return {
        steps: [
          st("candidates", "list", PES, [cs[3], cs[0]], `±(factors of ${Math.abs(cs[3])})/(factors of ${cs[0]})`),
          st("test", "substitute", FACT, [s], 0),
          st("divide", "divide", FACT, [s], polyS(fromRoots(q, [p / q, t]).map((x) => Math.round(x)))),
          st("roots", "solve", PES, [p, q, t], [p / q, s, t].sort((a, b) => a - b)),
        ],
        answer: [p / q, s, t].sort((a, b) => a - b),
      };
    },
    // independent: each value makes the polynomial zero, and there are three different values
    validate: (prm, v) => {
      if (!Array.isArray(v) || v.length !== 3 || new Set(v.map((x) => Math.round(x * 1e9))).size !== 3) return false;
      const cs = rrtPoly(prm);
      return v.every((x) => Math.abs(horner(cs, x)) < 1e-9);
    },
    bugs: ([p, q, s, t]) => [
      B("leading-coefficient-ignored", "procedural", PES, `The root ${p}/${q} was given as ${n_(p)}: a factor of the leading coefficient ${q} belongs in the denominator.`, [p, s, t].includes(p) && (p === s || p === t) ? null : [p, s, t]),
      B("signs-reversed", "recall", FACT, "All the signs were reversed; if x − s is a factor then x = s (not −s) is a root.", [-p / q, -s, -t]),
    ],
    variants: () => [],
    explain: (s) => (s.id === "candidates" ? `Possible rational roots: ${s.value}` : s.id === "test" ? `p(${n_(Number(s.inputs[0]))}) = 0, so x − (${n_(Number(s.inputs[0]))}) is a factor` : s.id === "divide" ? `Dividing leaves ${s.value}` : `The roots are ${(s.value as number[]).map((x) => (Number.isInteger(x) ? n_(x) : rs(rr(Math.round(x * 6), 6)))).join(", ")}`),
    domain: [[-5, 5], [2, 3], [-4, 4], [-4, 4]],
    keep: ([p, q, s, t]) => p !== 0 && gcd(Math.abs(p), q) === 1 && s < t && s * t !== 0,
    cap: 300,
    difficulty: ([p, q, s, t]) => (q === 2 && s > 0 && Math.abs(p) <= 3 ? 1 : s < 0 && t < 0 ? 3 : 2),
    teach: {
      idea: "If p/q (in lowest terms) is a root of a polynomial with integer coefficients, then p divides the constant term and q divides the leading coefficient.",
      method: "List the possible p/q, test them (whole numbers first), divide by the factor you find and solve the quadratic that is left.",
      alternatives: [
        { id: "sign_sum", title: "Quick tests first", kind: "procedural", text: ["If the coefficients add to 0, x = 1 is a root; if p(−1) = 0, x = −1 is a root.", "Each root found lowers the degree by one."] },
      ],
    },
    limits: "Cubics with one root p/q (q = 2 or 3) and two non-zero whole roots.",
  },
  {
    id: "apvolx",
    arity: 3,
    title: "A cubic equation from a volume",
    competency: PES,
    type: "integer",
    mc: true,
    parse: none,
    // [x, a, b]: x(x + a)(x + b) = V
    reject: ([x, a, b]) => (x < 1 || x > 12 || a < 1 || a > 6 || b <= a || b > 9 ? "Edges x, x + a, x + b with x up to 12." : null),
    prompt: ([x, a, b]) => `The equation ${polyS([1, a + b, a * b, -x * (x + a) * (x + b)])} = 0 has exactly one positive root, and it is a whole number. Find it.`,
    solve: ([x, a, b]) => {
      const V = x * (x + a) * (x + b);
      return { steps: [st("signs", "count", PRA, ["+ + + −"], 1), st("divisors", "list", FACT, [V], `divisors of ${V}`), st("test", "substitute", PES, [x], 0)], answer: x };
    },
    // independent: substitute
    validate: ([x, a, b], v) => typeof v === "number" && v > 0 && Number.isInteger(v) && v * (v + a) * (v + b) === x * (x + a) * (x + b),
    bugs: ([x, a, b]) => {
      const V = x * (x + a) * (x + b);
      const c = Math.round(Math.cbrt(V));
      return [
        B("longest-edge", "procedural", PES, `x + ${b} (the longest edge) was given; the question asks for x.`, x + b),
        B("cube-root", "conceptual", PES, `The cube root of ${V} was taken as if all three edges were equal; the other edges are longer than x, so x is less than ∛${V}.`, c === x ? null : c),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "signs" ? "The signs + + + − change once, so there is exactly one positive root (Descartes)" : s.id === "divisors" ? `A whole-number root divides ${s.inputs[0]}` : `x = ${s.inputs[0]} makes the polynomial 0`),
    domain: [[1, 12], [1, 6], [2, 9]],
    keep: ([, a, b]) => b > a,
    cap: 360,
    difficulty: ([x]) => (x <= 4 ? 1 : x <= 8 ? 2 : 3),
    word: ([x, a, b]) => `A closed box is a cuboid. Its width is ${a} cm more than its height x, and its length is ${b} cm more than its height. Its volume is ${x * (x + a) * (x + b)} cm³. Form a cubic equation in x and solve it to find the height x, in cm.`,
    teach: {
      idea: "x(x + a)(x + b) = V expands to a cubic with one sign change, so it has exactly one positive root; a whole-number root divides the constant term V.",
      method: "Estimate: x is a little less than ∛V. Test the divisors of V near that estimate until one gives V.",
      alternatives: [
        { id: "table", title: "A trial table", kind: "procedural", text: ["Make a table of x and x(x + a)(x + b) for x = 1, 2, 3, …", "The volume grows as x grows, so stop when you reach V."] },
      ],
    },
    limits: "Cuboids with whole-number edges up to 21 cm; dimensions found from area conditions are similar and not separately included.",
  },
  {
    id: "apconj",
    arity: 3,
    title: "Finding the other roots from a surd root",
    competency: PRA,
    type: "roots",
    mc: true,
    parse: none,
    // [u, wi, r]: roots u ± √w (w = SURDS[wi]) and r
    reject: ([u, wi, r]) => (Math.abs(u) > 4 || wi < 0 || wi >= SURDS.length || Math.abs(r) > 5 ? "Cubics with roots u ± √w and r." : null),
    prompt: ([u, wi, r]) => {
      const w = SURDS[wi];
      return `${surdPlus(u, 1, w)} is a root of ${polyS([1, -(2 * u + r), 2 * u * r + u * u - w, -r * (u * u - w)])} = 0. Find the other two roots. Write them separated by commas.`;
    },
    solve: ([u, wi, r]) => {
      const w = SURDS[wi];
      const ans = `${surdPlus(u, -1, w)}, ${n_(r)}`;
      return {
        steps: [
          st("conjugate", "recall", PRA, [surdPlus(u, 1, w)], surdPlus(u, -1, w)),
          st("quadratic", "multiply", IDEN, [surdPlus(u, 1, w), surdPlus(u, -1, w)], polyS([1, -2 * u, u * u - w])),
          st("third", "divide", FACT, [polyS([1, -2 * u, u * u - w])], n_(r)),
        ],
        answer: ans,
      };
    },
    // independent: each value is a root (numerically), and neither is the given root
    validate: ([u, wi, r], v) => {
      if (typeof v !== "string") return false;
      const w = SURDS[wi];
      const cs = [1, -(2 * u + r), 2 * u * r + u * u - w, -r * (u * u - w)];
      const vals = v.split(",").map((t) => num(t));
      if (vals.length !== 2 || vals.some((x) => !Number.isFinite(x)) || near(vals[0], vals[1], 1e-9)) return false;
      return vals.every((x) => Math.abs(horner(cs, x)) < 1e-8 && !near(x, u + Math.sqrt(w), 1e-9));
    },
    bugs: ([u, wi, r]) => {
      const w = SURDS[wi];
      return [
        B("both-signs-changed", "conceptual", PRA, `Both parts of the root changed sign; the conjugate of ${surdPlus(u, 1, w)} changes only the sign of the surd: ${surdPlus(u, -1, w)}.`, u === 0 ? null : `${surdPlus(-u, -1, w)}, ${n_(r)}`),
        B("rational-part-changed", "conceptual", PRA, "The sign of the whole-number part was changed; it is the surd part whose sign changes.", u === 0 ? null : `${surdPlus(-u, 1, w)}, ${n_(r)}`),
        B("sum-sign", "recall", VIETA, "The sum of the roots was taken as +(coefficient of x²); it is −(coefficient of x²).", r === 0 ? null : `${surdPlus(u, -1, w)}, ${n_(-r - 4 * u)}`),
      ];
    },
    distractors: ([u, wi, r]) => [`${surdPlus(u, -1, SURDS[wi])}, ${n_(r + 1)}`, `${surdPlus(u, -1, SURDS[wi])}, ${n_(r - 1)}`, `${surdPlus(u, 1, SURDS[wi])}, ${n_(r)}`],
    variants: () => [],
    explain: (s) => (s.id === "conjugate" ? `The coefficients are rational, so the conjugate ${s.value} is also a root` : s.id === "quadratic" ? `(x − (${s.inputs[0]}))(x − (${s.inputs[1]})) = ${s.value}` : `Dividing the cubic by ${s.inputs[0]} leaves x − (${s.value}), so the third root is ${s.value}`),
    domain: [[-4, 4], [0, 4], [-5, 5]],
    cap: 300,
    difficulty: ([u, , r]) => (u === 0 ? 1 : r === 0 || u > 0 ? 2 : 3),
    teach: {
      idea: "If a polynomial has rational coefficients and u + √w is a root (√w irrational), then its conjugate u − √w is a root too.",
      method: "Multiply (x − (u + √w))(x − (u − √w)) = x² − 2ux + (u² − w), divide the cubic by this quadratic, and read the third root from the linear factor left over.",
      alternatives: [
        { id: "vieta", title: "Use the sum of the roots", kind: "procedural", text: ["The three roots add up to −(coefficient of x²).", "The two conjugate roots add up to 2u, so the third root is −(coefficient of x²) − 2u."] },
      ],
    },
    limits: "Cubics with rational coefficients, one pair of surd conjugates u ± √w and a whole-number third root; imaginary conjugate pairs are not included because the answer types are real.",
  },
  {
    id: "apdesc",
    arity: 2,
    title: "Descartes' rule of signs",
    competency: PRA,
    type: "integer",
    mc: true,
    parse: none,
    // [s, mode]: a quintic whose sign pattern is coded by s (see descPoly); mode 0 positive roots, 1 negative roots
    reject: ([s, mode]) => (s < 0 || s > 161 || (mode !== 0 && mode !== 1) ? "Quintics with a non-zero constant term." : null),
    prompt: ([s, mode]) => `Use Descartes' rule of signs to find the greatest possible number of ${mode ? "negative" : "positive"} real roots of ${polyS(descPoly(s))} = 0.`,
    solve: ([s, mode]) => {
      const cs = descPoly(s);
      const use = mode ? cs.map((c, i) => ((5 - i) % 2 ? -c : c)) : cs;
      const ch = changes(use);
      return { steps: [...(mode ? [st("substitute", "substitute", PRA, ["−x"], polyS(use))] : []), st("signs", "count", PRA, [use.filter((c) => c).map((c) => (c > 0 ? "+" : "−")).join(" ")], ch)], answer: ch };
    },
    // independent: a sign string, scanned with a pattern for each change
    validate: ([s, mode], v) => {
      const cs = descPoly(s);
      const signs = cs
        .map((c, i) => (mode && (5 - i) % 2 ? -c : c))
        .map((c) => (c > 0 ? "+" : c < 0 ? "-" : ""))
        .join("");
      return v === (signs.match(/(?=(\+-|-\+))/g) ?? []).length;
    },
    bugs: ([s, mode]) => {
      const cs = descPoly(s);
      const use = mode ? cs.map((c, i) => ((5 - i) % 2 ? -c : c)) : cs;
      const zeroCount = use.reduce((n, c, i) => n + (i > 0 && Math.sign(c) !== Math.sign(use[i - 1]) ? 1 : 0), 0);
      return [
        ...(mode ? [B("p-not-p-of-minus-x", "procedural", PRA, "The sign changes of p(x) were counted; negative roots need p(−x), where the odd powers change sign.", changes(cs))] : []),
        B("zeros-as-changes", "procedural", PRA, "Missing terms (zero coefficients) were counted as sign changes; skip the zero coefficients and compare the non-zero ones.", zeroCount),
        B("negatives-counted", "conceptual", PRA, "The number of negative coefficients was counted; the rule counts the CHANGES of sign from one non-zero coefficient to the next.", use.filter((c) => c < 0).length),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "substitute" ? `p(−x) = ${s.value}` : `Signs: ${s.inputs[0]}, so ${s.value} change${s.value === 1 ? "" : "s"}`),
    domain: [[0, 161], [0, 1]],
    difficulty: ([s, mode]) => (mode ? 3 : descPoly(s).includes(0) ? 2 : 1),
    teach: {
      idea: "The number of positive roots of p(x) = 0 is at most the number of sign changes in its coefficients (and differs from it by an even number). For negative roots, count the changes in p(−x).",
      method: "Write the signs of the non-zero coefficients in order, skipping zeros, and count the changes. For p(−x), first change the sign of each odd-power coefficient.",
      alternatives: [
        { id: "sign_row", title: "A row of signs", kind: "procedural", text: ["Under each power x⁵, x⁴, …, x⁰ write + or − (leave a gap for a missing power).", "Draw a mark between each neighbouring pair of signs that differ; count the marks."] },
      ],
    },
    limits: "Fifth-degree polynomials with a non-zero constant term; the rule's bound is asked, not the exact number of roots.",
  },
  {
    id: "apvsum",
    arity: 5,
    title: "Symmetric functions of the roots of a cubic",
    competency: VIETA,
    type: "fraction",
    mc: true,
    parse: none,
    // [a, b, c, d, w]: roots of ax³ + bx² + cx + d; w = 0 Σα², 1 Σ1/α, 2 Π(α + 1)
    reject: ([a, b, c, d, w]) => (a < 1 || a > 3 || Math.abs(b) > 6 || Math.abs(c) > 6 || d === 0 || Math.abs(d) > 6 || w < 0 || w > 2 || cubicDisc(a, b, c, d) === 0 ? "Cubics with small coefficients, distinct roots and d ≠ 0." : null),
    prompt: ([a, b, c, d, w]) => `α, β and γ are the roots of ${polyS([a, b, c, d])} = 0. Find ${["α² + β² + γ²", "1/α + 1/β + 1/γ", "(α + 1)(β + 1)(γ + 1)"][w]}. (A fraction is fine.)`,
    solve: ([a, b, c, d, w]) => {
      const s1 = rr(-b, a);
      const s2 = rr(c, a);
      const s3 = rr(-d, a);
      const ans = w === 0 ? rsub(rmul(s1, s1), rmul(rr(2), s2)) : w === 1 ? rdiv(s2, s3) : radd(radd(s3, s2), radd(s1, rr(1)));
      return {
        steps: [st("vieta", "recall", VIETA, [a, b, c, d], `Σα = ${rs(s1)}, Σαβ = ${rs(s2)}, αβγ = ${rs(s3)}`), st("rewrite", "rewrite", IDEN, [w], ["(Σα)² − 2Σαβ", "Σαβ/αβγ", "αβγ + Σαβ + Σα + 1"][w]), st("value", "evaluate", FRAC, [w], rs(ans))],
        answer: rv(ans),
      };
    },
    // independent: find the three roots numerically and evaluate the expression
    validate: ([a, b, c, d, w], v) => {
      if (typeof v !== "number") return false;
      const z = croots([a, b, c, d]);
      const val: C = w === 0 ? z.reduce((s, x) => cad(s, cml(x, x)), [0, 0] as C) : w === 1 ? z.reduce((s, x) => cad(s, cdv([1, 0], x)), [0, 0] as C) : z.reduce((s, x) => cml(s, cad(x, [1, 0])), [1, 0] as C);
      return Math.abs(val[1]) < 1e-6 && near(val[0], v, 1e-7);
    },
    bugs: ([a, b, c, d, w]) => {
      const s1 = rr(-b, a);
      const s2 = rr(c, a);
      const s3 = rr(-d, a);
      if (w === 0)
        return [
          B("pair-sum-sign", "procedural", IDEN, "(α + β + γ)² = Σα² + 2Σαβ, so Σα² = (Σα)² − 2Σαβ; the 2Σαβ was added instead of subtracted.", rv(radd(rmul(s1, s1), rmul(rr(2), s2)))),
          B("square-of-sum", "conceptual", IDEN, "Σα² was taken as (Σα)²; squaring the sum also gives the cross terms 2(αβ + βγ + γα).", rv(rmul(s1, s1))),
        ];
      if (w === 1)
        return [
          B("product-sign", "recall", VIETA, "αβγ was taken as +d/a; for a cubic it is −d/a.", rv(rdiv(s2, rr(d, a)))),
          ...(b !== 0 ? [B("reciprocal-of-sum", "conceptual", VIETA, "1/(α + β + γ) was found; the sum of reciprocals is (αβ + βγ + γα)/αβγ.", rv(rdiv(rr(1), s1)))] : []),
        ];
      return [
        B("product-sign", "recall", VIETA, "αβγ was taken as +d/a; for a cubic it is −d/a.", rv(radd(radd(rr(d, a), s2), radd(s1, rr(1))))),
        B("pair-term-missing", "procedural", IDEN, "The expansion missed the αβ + βγ + γα terms: (α + 1)(β + 1)(γ + 1) = αβγ + Σαβ + Σα + 1.", rv(radd(s3, radd(s1, rr(1))))),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "vieta" ? s.value as string : s.id === "rewrite" ? `Write it with these sums: ${s.value}` : `Substitute: ${s.value}`),
    domain: [[1, 3], [-6, 6], [-6, 6], [-6, 6], [0, 2]],
    keep: ([a, b, c, d]) => d !== 0 && cubicDisc(a, b, c, d) !== 0,
    cap: 400,
    difficulty: ([a, , , , w]) => (a === 1 && w === 0 ? 1 : a === 1 ? 2 : 3),
    teach: {
      idea: "For ax³ + bx² + cx + d = 0 with roots α, β, γ: α + β + γ = −b/a, αβ + βγ + γα = c/a and αβγ = −d/a.",
      method: "Rewrite the expression using only these three sums (e.g. α² + β² + γ² = (Σα)² − 2Σαβ, 1/α + 1/β + 1/γ = Σαβ/αβγ), then substitute.",
      alternatives: [
        { id: "signs", title: "The signs alternate", kind: "conceptual", text: ["Divide by a: x³ − (Σα)x² + (Σαβ)x − αβγ.", "So the signs go −, +, − as you move along the coefficients."] },
      ],
    },
    limits: "Three symmetric expressions of the roots of a cubic with small coefficients and distinct roots.",
  },
  {
    id: "apvform",
    arity: 4,
    title: "Forming a quadratic with transformed roots",
    competency: VIETA,
    type: "exact",
    mc: true,
    parse: none,
    // [p, q, t, k]: α, β roots of x² + px + q; new roots α + k, β + k (t = 0), kα, kβ (t = 1), α², β² (t = 2)
    reject: ([p, q, t, k]) => (Math.abs(p) > 6 || q === 0 || Math.abs(q) > 6 || t < 0 || t > 2 || Math.abs(k) > 3 || (t === 0 && k === 0) || (t === 1 && Math.abs(k) < 2) || (t === 2 && k !== 1) ? "x² + px + q with small p, q; shifts, multiples or squares of the roots." : null),
    prompt: ([p, q, t, k]) => `α and β are the roots of ${polyS([1, p, q])} = 0. Find the quadratic expression x² + bx + c (leading coefficient 1) whose zeros are ${t === 0 ? `α ${k < 0 ? "−" : "+"} ${Math.abs(k)} and β ${k < 0 ? "−" : "+"} ${Math.abs(k)}` : t === 1 ? `${n_(k)}α and ${n_(k)}β` : "α² and β²"}.`,
    solve: ([p, q, t, k]) => {
      const [b, c] = vform(p, q, t, k);
      const sum = -b;
      return { steps: [st("vieta", "recall", VIETA, [p, q], `α + β = ${n_(-p)}, αβ = ${n_(q)}`), st("sum", "evaluate", VIETA, [t], sum), st("product", "evaluate", VIETA, [t], c), st("form", "write", VIETA, [sum, c], polyS([1, b, c], "x", false))], answer: polyS([1, b, c], "x", false) };
    },
    // independent: find α, β numerically (complex), transform them, and check they are the zeros of the answer
    validate: ([p, q, t, k], v) => {
      if (typeof v !== "string") return false;
      try {
        const e = parse(v);
        const P = (x: number) => evaluate(e, { x });
        const c0 = P(0);
        const c1 = (P(1) - P(-1)) / 2;
        const c2 = (P(1) + P(-1)) / 2 - c0;
        if (!near(c2, 1, 1e-12) || !near(P(2), 4 + 2 * c1 + c0, 1e-12) || !near(P(3), 9 + 3 * c1 + c0, 1e-12)) return false;
        const disc = p * p - 4 * q;
        const sq: C = disc >= 0 ? [Math.sqrt(disc), 0] : [0, Math.sqrt(-disc)];
        const rts: C[] = [[(-p + sq[0]) / 2, sq[1] / 2], [(-p - sq[0]) / 2, -sq[1] / 2]];
        const nw = rts.map((z): C => (t === 0 ? [z[0] + k, z[1]] : t === 1 ? [k * z[0], k * z[1]] : cml(z, z)));
        const s = cad(nw[0], nw[1]);
        const pr = cml(nw[0], nw[1]);
        return near(-c1, s[0], 1e-9) && near(c0, pr[0], 1e-9) && Math.abs(s[1]) < 1e-9 && Math.abs(pr[1]) < 1e-9;
      } catch {
        return false;
      }
    },
    bugs: ([p, q, t, k]) =>
      t === 0
        ? [B("wrong-direction", "procedural", VIETA, `The shift went the wrong way: if y = α ${k < 0 ? "−" : "+"} ${Math.abs(k)}, the new sum is (α + β) ${k < 0 ? "−" : "+"} ${2 * Math.abs(k)}.`, polyS([1, p + 2 * k, k * k + p * k + q], "x", false))]
        : t === 1
          ? [
              B("k-not-squared", "procedural", VIETA, `The product was multiplied by ${n_(k)}; (${n_(k)}α)(${n_(k)}β) = ${k * k}αβ.`, polyS([1, k * p, k * q], "x", false)),
              B("sum-sign", "recall", VIETA, "The x coefficient was written as +(sum of roots); it is −(sum of roots).", polyS([1, -k * p, k * k * q], "x", false)),
            ]
          : [
              B("identity-sign", "procedural", IDEN, "α² + β² was taken as (α + β)² + 2αβ; it is (α + β)² − 2αβ.", polyS([1, -(p * p + 2 * q), q * q], "x", false)),
              B("product-not-squared", "procedural", VIETA, "The product α²β² was taken as αβ; it is (αβ)².", polyS([1, -(p * p - 2 * q), q], "x", false)),
            ],
    distractors: ([p, q, t, k]) => {
      const [b, c] = vform(p, q, t, k);
      return [polyS([1, -b, c], "x", false), polyS([1, b, -c], "x", false), polyS([1, b, c + 1], "x", false), polyS([1, b + 1, c], "x", false)];
    },
    variants: () => [],
    explain: (s) => (s.id === "vieta" ? s.value as string : s.id === "sum" ? `New sum of zeros: ${n_(Number(s.value))}` : s.id === "product" ? `New product of zeros: ${n_(Number(s.value))}` : `x² − (sum)x + (product) = ${s.value}`),
    domain: [[-6, 6], [-6, 6], [0, 2], [-3, 3]],
    keep: ([, q, t, k]) => q !== 0 && (t === 0 ? k !== 0 : t === 1 ? Math.abs(k) >= 2 : k === 1),
    cap: 400,
    difficulty: ([, , t, k]) => (t === 0 && k > 0 ? 1 : t === 2 ? 3 : 2),
    teach: {
      idea: "A quadratic with leading coefficient 1 and zeros r₁, r₂ is x² − (r₁ + r₂)x + r₁r₂. For x² + px + q, α + β = −p and αβ = q.",
      method: "Write the new sum and product in terms of α + β and αβ (e.g. α² + β² = (α + β)² − 2αβ), substitute, and write x² − (sum)x + (product).",
      alternatives: [
        { id: "substitute", title: "Substitute for x", kind: "procedural", text: ["If y = α + k then α = y − k: put x = y − k into x² + px + q = 0 and expand.", "If y = kα, put x = y/k and multiply through by k² to clear the fractions."] },
      ],
    },
    limits: "Monic quadratics with small integer coefficients; reciprocal roots (which give non-monic answers) and cubics are not included.",
  },

  // ================================================================ adjoint and inverse
  {
    id: "apinv2",
    arity: 4,
    title: "The inverse of a 2 × 2 matrix",
    competency: ADJ,
    type: "matrix",
    mc: true,
    parse: none,
    // [a, b, c, d]: A = [[a, b], [c, d]]
    reject: ([a, b, c, d]) => ([a, b, c, d].some((x) => x < -4 || x > 6) || a * d - b * c === 0 ? "Entries −4 to 6 and |A| ≠ 0." : null),
    prompt: ([a, b, c, d]) => `A = ${matN([[a, b], [c, d]])}. Find A⁻¹. (Fractions are fine as entries, e.g. [[1/2, 0], [−3/2, 1]].)`,
    solve: ([a, b, c, d]) => {
      const D = a * d - b * c;
      const X = mscale(toM([[d, -b], [-c, a]]), rr(1, D));
      return { steps: [st("det", "evaluate", DET, [a, b, c, d], D), st("adj", "write", ADJ, [a, b, c, d], matN([[d, -b], [-c, a]])), st("divide", "divide", ADJ, [D], matS(X))], answer: matS(X) };
    },
    // independent: A times the answer is the identity
    validate: ([a, b, c, d], v) => {
      const X = typeof v === "string" ? readMat(v) : null;
      return !!X && X.length === 2 && X[0].length === 2 && meq(mmul(toM([[a, b], [c, d]]), X), ident(2));
    },
    bugs: ([a, b, c, d]) => {
      const D = a * d - b * c;
      const det2 = [a, b, c, d].every((x) => x >= -3 && x <= 5) && [a, b, c, d].filter((x) => x < 0).length <= 1 && a * d !== 0 && b * c !== 0 ? `gen:det2:${a},${b},${c},${d}` : undefined;
      return [
        B("adjoint-only", "procedural", ADJ, `The adjoint was given; A⁻¹ = adj A / |A|, so every entry must be divided by ${n_(D)}.`, Math.abs(D) === 1 && D === 1 ? null : matN([[d, -b], [-c, a]])),
        B("no-negation", "procedural", ADJ, "a and d were swapped but b and c were not negated; adj A = [[d, −b], [−c, a]].", matS(mscale(toM([[d, b], [c, a]]), rr(1, D)))),
        B("wrong-swap", "procedural", ADJ, "The wrong pair was swapped: a and d change places, b and c only change sign.", matS(mscale(toM([[a, -b], [-c, d]]), rr(1, D)))),
        ...(a * d + b * c !== 0 ? [B("determinant-added", "prerequisite", DET, "The determinant was found as ad + bc; it is ad − bc.", matS(mscale(toM([[d, -b], [-c, a]]), rr(1, a * d + b * c))), det2)] : []),
      ];
    },
    distractors: ([a, b, c, d]) => [matS(mscale(toM([[d, -b], [-c, a]]), rr(-1, a * d - b * c))), matN([[a, b], [c, d]]), matS(mscale(toM([[a, c], [b, d]]), rr(1, a * d - b * c)))],
    variants: () => [],
    explain: (s) => (s.id === "det" ? `|A| = ad − bc = ${n_(Number(s.value))} (not 0, so A⁻¹ exists)` : s.id === "adj" ? `adj A = ${s.value}` : `Divide every entry by ${n_(Number(s.inputs[0]))}: ${s.value}`),
    domain: [[-4, 6], [-4, 6], [-4, 6], [-4, 6]],
    keep: ([a, b, c, d]) => a * d - b * c !== 0 && [a, b, c, d].filter((x) => x === 0).length <= 1,
    cap: 400,
    difficulty: ([a, b, c, d]) => (Math.abs(a * d - b * c) === 1 ? 1 : Math.abs(a * d - b * c) <= 6 ? 2 : 3),
    teach: {
      idea: "A⁻¹ = (1/|A|) adj A, and it exists only when |A| ≠ 0. For [[a, b], [c, d]], adj A = [[d, −b], [−c, a]].",
      method: "Find |A| = ad − bc; swap a and d, change the signs of b and c; divide every entry by |A|.",
      alternatives: [
        { id: "gauss_jordan", title: "Row-reduce [A | I]", kind: "procedural", text: ["Write A and I side by side and use row operations to turn A into I.", "The same operations turn I into A⁻¹; check that AA⁻¹ = I."] },
      ],
    },
    limits: "2 × 2 matrices with entries −4 to 6 and a ≠ d; 3 × 3 inverses are reached through the adjoint family (A⁻¹ = adj A / |A|).",
  },
  {
    id: "apadj3",
    arity: 9,
    title: "The adjoint of a 3 × 3 matrix",
    competency: ADJ,
    type: "matrix",
    mc: true,
    parse: none,
    // [a11 … a33]
    reject: (p) => (p.some((x) => x < -2 || x > 3) || sarrus(m3(p)) === 0 ? "Entries −2 to 3 and |A| ≠ 0." : null),
    prompt: (p) => `A = ${matN(m3(p))}. Find adj A.`,
    solve: (p) => {
      const Cf = cofactors(m3(p));
      return { steps: [st("minors", "evaluate", DET, ["2 × 2 minors"], matN(minors(m3(p)))), st("cofactors", "sign", ADJ, ["(−1)^(i+j)"], matN(Cf)), st("transpose", "transpose", ADJ, ["Cᵀ"], matN(mT(Cf)))], answer: matN(mT(Cf)) };
    },
    // independent: A(adj A) = (adj A)A = |A| I, with |A| by the rule of Sarrus
    validate: (p, v) => {
      const X = typeof v === "string" ? readMat(v) : null;
      if (!X || X.length !== 3 || X[0].length !== 3) return false;
      const A = toM(m3(p));
      const DI = mscale(ident(3), rr(sarrus(m3(p))));
      return meq(mmul(A, X), DI) && meq(mmul(X, A), DI);
    },
    bugs: (p) => [
      B("not-transposed", "procedural", ADJ, "The matrix of cofactors was given; adj A is its TRANSPOSE (rows become columns).", matN(cofactors(m3(p)))),
      B("no-signs", "procedural", ADJ, "The minors were used without the signs (−1)^(i + j); the cofactor of a position with i + j odd is minus its minor.", matN(mT(minors(m3(p))))),
    ],
    distractors: (p) => [matN(mT(cofactors(m3(p))).map((r) => r.map((x) => -x)))],
    variants: () => [],
    explain: (s) => (s.id === "minors" ? `Minors (delete the row and column of each entry): ${s.value}` : s.id === "cofactors" ? `Attach the signs + − + / − + − / + − +: ${s.value}` : `Transpose: adj A = ${s.value}`),
    domain: [[-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-2, 3]],
    keep: (p) => {
      const A = m3(p);
      const Cf = cofactors(A);
      return sarrus(A) !== 0 && p.filter((x) => x === 0).length <= 3 && !mT(Cf).every((r, i) => r.every((x, j) => x === Cf[i][j])) && !mT(minors(A)).every((r, i) => r.every((x, j) => x === mT(Cf)[i][j]));
    },
    cap: 300,
    difficulty: (p) => (p.filter((x) => x === 0).length >= 2 ? 2 : 3),
    teach: {
      idea: "adj A is the transpose of the matrix of cofactors, and A(adj A) = (adj A)A = |A| I, so A⁻¹ = adj A / |A| when |A| ≠ 0.",
      method: "For each entry find its minor (the 2 × 2 determinant left when its row and column are deleted), attach the sign (−1)^(i + j), then transpose the whole matrix.",
      alternatives: [
        { id: "check", title: "Check with A(adj A)", kind: "procedural", text: ["Multiply A by your adj A: every off-diagonal entry must be 0.", "The diagonal entries must all equal |A|."] },
      ],
    },
    limits: "3 × 3 matrices with entries −2 to 3, non-singular, whose cofactor matrix is not symmetric (so the transpose matters).",
  },

  // ================================================================ rank
  {
    id: "aprank",
    arity: 2,
    title: "The rank of a 3 × 4 matrix",
    competency: RANK,
    type: "integer",
    mc: true,
    parse: none,
    // [r, seed]: a 3 × 4 matrix of rank r built from the seed (rankRows)
    reject: ([r, seed]) => (r < 1 || r > 3 || seed < 0 || seed > 119 ? "Ranks 1 to 3." : null),
    prompt: ([r, seed]) => `Find the rank of the matrix ${matN(rankRows(r, seed))}.`,
    solve: ([r, seed]) => {
      const A = rankRows(r, seed);
      const rk = rankElim(A);
      return { steps: [st("reduce", "row-reduce", RANK, [matN(A)], "echelon form"), st("count", "count", RANK, ["non-zero rows"], rk)], answer: rk };
    },
    // independent: the order of the largest non-zero minor
    validate: ([r, seed], v) => v === rankMinors(rankRows(r, seed)),
    bugs: ([r]) =>
      r < 3
        ? [
            B("rows-counted", "conceptual", RANK, `The non-zero rows of the matrix as given were counted; first reduce it: ${r === 2 ? "one row is a combination of the other two" : "every row is a multiple of the first"}, so it becomes a zero row.`, 3),
            ...(r === 1 ? [B("one-row-removed", "procedural", RANK, "Only one row was reduced to zero; the third row is also a multiple of the first.", 2)] : []),
          ]
        : [B("columns-counted", "conceptual", RANK, "The number of columns was taken; the rank is at most the number of rows (3) and is the number of non-zero rows in echelon form.", 4)],
    variants: () => [],
    explain: (s) => (s.id === "reduce" ? `Use row operations Rᵢ → Rᵢ − kRⱼ to reach echelon form` : `Count the non-zero rows: rank = ${s.value}`),
    domain: [[1, 3], [0, 119]],
    cap: 300,
    difficulty: ([r]) => (r === 1 ? 1 : r === 3 ? 2 : 3),
    teach: {
      idea: "The rank is the number of non-zero rows in an echelon form: the number of rows that are not combinations of the others.",
      method: "Use row operations (swap rows, Rᵢ → Rᵢ − kRⱼ) to make zeros below each leading entry, then count the rows that are not all zero.",
      alternatives: [
        { id: "minors", title: "The largest non-zero minor", kind: "conceptual", text: ["The rank is the order of the largest square sub-matrix with a non-zero determinant.", "Try the 3 × 3 minors (leave out one column at a time); if all are 0, try 2 × 2 minors."] },
      ],
    },
    limits: "3 × 4 matrices with small entries built to have rank 1, 2 or 3; the Gauss–Jordan inverse is covered by the inverse families.",
  },
];

// ---------------------------------------------------------------- family-specific helpers
function par(v: number) {
  return v < 0 ? `(${n_(v)})` : String(v);
}
function gmEnds([a, r, k, s]: number[]): [number, number] {
  const big = a * r ** (k + 1);
  return s ? [big, a] : [a, big];
}
function gmMeans([a, r, k, s]: number[]): R[] {
  const R0 = s ? rr(1, r) : rr(r);
  const f = s ? a * r ** (k + 1) : a;
  return Array.from({ length: k }, (_, i) => rmul(rr(f), rpow(R0, i + 1)));
}
function idx(p: number, q: number) {
  return q === 1 ? n_(p) : `${p < 0 ? "−" : ""}${Math.abs(p)}/${q}`;
}
function kxS(a: number, b: number) {
  const A = Math.abs(a);
  return b === 1 ? `${A === 1 ? "" : A}x` : `${A === 1 ? "" : A}x/${b}`;
}
function genTerms([t, d, e]: number[], n: number): number[] {
  // by adding differences (not the formula): first difference, then second differences of 2
  const out: number[] = [];
  let v = t ? 1 + d + e : d + e;
  let diff = t ? 3 + d : d;
  for (let i = 0; i < n; i++) {
    out.push(v);
    v += diff;
    if (t) diff += 2;
  }
  return out;
}
function sigSum(s: Sig) {
  return expandSig(s).reduce((x, y) => x + y, 0);
}
function expandSig([lo, hi, c1, c0]: Sig): number[] {
  const out: number[] = [];
  for (let k = lo; k <= hi; k++) out.push(c1 * k + c0);
  return out;
}
function telF(d: number, c: number) {
  return d === 1 && c === 0 ? "k" : `(${polyS([d, c], "k")})`;
}
function cartText([v, m, n, o]: number[]) {
  const Bs = `{${SHAPE(n).join(", ")}}`;
  const A = `{${Array.from({ length: m }, (_, i) => i + 1).join(", ")}}`;
  if (v === 0) return `A = {x ∈ ℤ : ${n_(o - 2)} ≤ x < ${n_(o - 2 + m)}} and B = ${Bs}. How many elements does A × B have?`;
  if (v === 1) return `A = ${A}, B = ${Bs} and C = {${Array.from({ length: o + 2 }, (_, i) => 10 * (i + 1)).join(", ")}}. How many elements does A × B × C have?`;
  if (v === 2) return `A = ${A} and B = ${Bs}. How many different relations from A to B are there?`;
  return `A = ${A}, B = ${Bs} and C = {${SHAPE(2 * n).slice(n - o, 2 * n - o).join(", ")}}. How many elements does (A × B) ∩ (A × C) have?`;
}
function cartSets([m, n, s, t]: number[]): [number[], number[]] {
  return [Array.from({ length: m }, (_, i) => s + 2 * i), Array.from({ length: n }, (_, j) => t + 3 * j)];
}
function cartPairs(p: number[]): [number, number][] {
  const [A, Bs] = cartSets(p);
  return A.flatMap((a) => Bs.map((b) => [a, b] as [number, number]));
}
function ivA(p: number[]): Iv {
  return { lo: rr(p[0]), hi: rr(p[0] + p[1]), ...ivCode(p[4]) };
}
function ivB(p: number[]): Iv {
  return { lo: rr(p[2]), hi: rr(p[2] + p[3]), ...ivCode(p[5]) };
}
function ivOpWith(A: Iv, Bv: Iv, op: number): Iv[] {
  const test = (x: R) => [inIv(A, x) && inIv(Bv, x), inIv(A, x) || inIv(Bv, x), inIv(A, x) && !inIv(Bv, x)][op];
  return fromTestHalf(test, [rv(A.lo), rv(A.hi), rv(Bv.lo), rv(Bv.hi)]);
}
function ivOp(p: number[], op: number): Iv[] {
  return ivOpWith(ivA(p), ivB(p), op);
}
/** Rebuild a set from a membership test: look at each critical point and each gap between them. */
function fromTestHalf(test: (x: R) => boolean, pts: number[]): Iv[] {
  const P = [...new Set(pts)].sort((a, b) => a - b);
  // the sequence of pieces: point, gap, point, gap, … , point
  const seq: { at: R; point: boolean; inside: boolean }[] = [];
  P.forEach((x, i) => {
    seq.push({ at: rr(x), point: true, inside: test(rr(x)) });
    if (i < P.length - 1) seq.push({ at: rr(x + P[i + 1], 2), point: false, inside: test(rr(x + P[i + 1], 2)) });
  });
  const out: Iv[] = [];
  let i = 0;
  while (i < seq.length) {
    if (!seq[i].inside) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < seq.length && seq[j + 1].inside) j++;
    // pieces i..j are inside; ends are points or gaps
    const startPoint = seq[i].point;
    const endPoint = seq[j].point;
    const lo = startPoint ? seq[i].at : seq[i - 1].at;
    const hi = endPoint ? seq[j].at : seq[j + 1].at;
    out.push({ lo, hi, lc: startPoint, hc: endPoint });
    i = j + 1;
  }
  return out;
}
function dblIv([a, b, p, w, s]: number[]): Iv {
  const L = rr(p - b, a);
  const U = rr(p + w - b, a);
  return a > 0 ? { lo: L, hi: U, lc: !!s, hc: !s } : { lo: U, hi: L, lc: !s, hc: !!s };
}
type Opt = { s: number; ivs: string; ineq: string; has: (x: number) => boolean };
function chMake([a, w, , k]: number[], s: number): Opt {
  if (k === 0) {
    const { lc, hc } = ivCode(s);
    return { s, ivs: `${lc ? "[" : "("}${n_(a)}, ${n_(a + w)}${hc ? "]" : ")"}`, ineq: `${n_(a)} ${lc ? "≤" : "<"} x ${hc ? "≤" : "<"} ${n_(a + w)}`, has: (x) => (lc ? x >= a : x > a) && (hc ? x <= a + w : x < a + w) };
  }
  const ops = [">", "≥", "<", "≤"];
  const ivs = [`(${n_(a)}, ∞)`, `[${n_(a)}, ∞)`, `(−∞, ${n_(a)})`, `(−∞, ${n_(a)}]`];
  const has = [(x: number) => x > a, (x: number) => x >= a, (x: number) => x < a, (x: number) => x <= a];
  return { s, ivs: ivs[s], ineq: `x ${ops[s]} ${n_(a)}`, has: has[s] };
}
function chIv(p: number[]): Opt {
  return chMake(p, p[2]);
}
function chOpts(p: number[]): Opt[] {
  return [0, 1, 2, 3].map((s) => chMake(p, s)).sort((x, y) => fnv(`apintch:${p}:${x.ivs}`) - fnv(`apintch:${p}:${y.ivs}`));
}
function fracS(a: number, b: number, c: number, d: number, v = "x") {
  const top = polyS([a, b], v);
  const bot = polyS([c, d], v);
  return `${/ [+−] /.test(top) ? `(${top})` : top}/(${bot})`;
}
function linInv(a: number, b: number) {
  // (x − b)/a written plainly
  if (a === 1) return polyS([1, -b]);
  if (a === -1) return polyS([-1, b]);
  return a > 0 ? `(${polyS([1, -b])})/${a}` : `(${polyS([-1, b])})/${-a}`;
}
function invS(a: number, b: number, c: number, d: number) {
  if (c === 0) return linInv(a, b);
  return `${wrapTop(polyS([-d, b]))}/(${polyS([c, -a])})`;
}
/** A numerator: in brackets only when it has two terms. */
function wrapTop(t: string) {
  return / [+−] /.test(t) ? `(${t})` : t;
}
function costP(p: number[]) {
  return p.slice(6).map((i) => [PRICES[i]]);
}
function costT(p: number[]) {
  const pr = costP(p).flat();
  return [p[0] * pr[0] + p[1] * pr[1] + p[2] * pr[2], p[3] * pr[0] + p[4] * pr[1] + p[5] * pr[2]];
}
function mlinB(p: number[]) {
  const k = p[0];
  const X = m2(p, 2);
  const A = m2(p, 6);
  return X.map((r, i) => r.map((x, j) => k * x + (p[1] ? -A[i][j] : A[i][j])));
}
function sys3B(p: number[]) {
  const sol = p.slice(9);
  return m3(p).map((r) => r.reduce((s, c, j) => s + c * sol[j], 0));
}
function progRoots([g, u, v]: number[]): number[] {
  return g ? [u, u * v, u * v * v].sort((x, y) => x - y) : [u - v, u, u + v];
}
function rrtPoly([p, q, s, t]: number[]) {
  // (qx − p)(x² − (s + t)x + st)
  return [q, -q * (s + t) - p, q * s * t + p * (s + t), -p * s * t];
}
function surdPlus(u: number, sg: number, w: number) {
  return u === 0 ? `${sg < 0 ? "−" : ""}√${w}` : `${n_(u)} ${sg < 0 ? "−" : "+"} √${w}`;
}
function descPoly(s: number): number[] {
  // c5 > 0; c4 … c1 each −, 0 or + (base-3 digits of s mod 81); c0 ± (s ≥ 81 negative); sizes 1 to 9 from a hash
  const signs = [1, ...[0, 1, 2, 3].map((i) => Math.floor((s % 81) / 3 ** i) % 3 - 1), s >= 81 ? -1 : 1];
  return signs.map((g, i) => g * (1 + (fnv(`desc:${s}:${i}`) % 9)));
}
function changes(cs: number[]) {
  const nz = cs.filter((c) => c !== 0);
  return nz.reduce((n, c, i) => n + (i > 0 && c * nz[i - 1] < 0 ? 1 : 0), 0);
}
function cubicDisc(a: number, b: number, c: number, d: number) {
  return 18 * a * b * c * d - 4 * b ** 3 * d + b * b * c * c - 4 * a * c ** 3 - 27 * a * a * d * d;
}
function vform(p: number, q: number, t: number, k: number): [number, number] {
  return t === 0 ? [p - 2 * k, k * k - p * k + q] : t === 1 ? [k * p, k * k * q] : [-(p * p - 2 * q), q * q];
}
