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
/** n with its noun, singular only for 1. */
const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
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
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));

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

// ================================================================================== gap@1 additions (b16)
const shuf16 = (tag: string, p: number[], xs: string[]) => [...xs].sort((x, y) => fnv(`${tag}:${p.join(",")}:${x}`) - fnv(`${tag}:${p.join(",")}:${y}`) || (x < y ? -1 : 1));
const rnd16 = (tag: string) => {
  let s = (fnv(tag) % 2147483646) + 1;
  return (lo: number, hi: number) => {
    s = (s * 48271) % 2147483647;
    return lo + (s % (hi - lo + 1));
  };
};
const inD = (p: number[], d: [number, number][]) => p.length === d.length && p.every((v, i) => Number.isInteger(v) && v >= d[i][0] && v <= d[i][1]);

// ---------------------------------------------------------------- listing Cartesian products
const D_CL16: [number, number][] = [[0, 3], [2, 3], [1, 3], [-3, 6]];
const clSets = ([k, m, n, s]: number[]) => {
  const A = Array.from({ length: m }, (_, i) => n_(s + i));
  const Bs = ["p", "q", "r"].slice(0, k === 3 ? 2 : n);
  const C = k === 3 ? ["10", "20"].slice(0, n === 1 ? 1 : 2) : [];
  return { A, B: Bs, C };
};
const tupS = (xs: string[]) => `(${xs.join(", ")})`;
const setS = (xs: string[]) => `{${xs.join(", ")}}`;
const cl16Ok = (p: number[]) => inD(p, D_CL16) && (p[0] === 1 || p[0] === 3 ? (p[0] === 3 ? p[1] === 2 && p[2] <= 2 : p[2] === 1) : p[2] >= 2 && p[1] * p[2] <= 9);
function cl16Lists(p: number[]): { list: string[][]; why: string }[] {
  const [k] = p;
  const { A, B: Bs, C } = clSets(p);
  const X = k === 1 ? A : k === 2 ? Bs : A;
  const Y = k === 1 ? A : k === 2 ? A : Bs;
  if (k === 3) {
    const right = A.flatMap((a) => Bs.flatMap((b) => C.map((c) => [a, b, c])));
    return [
      { list: right, why: "right" },
      { list: A.flatMap((a) => Bs.map((b) => [a, b])), why: "pairs" },
      { list: Bs.flatMap((b) => A.flatMap((a) => C.map((c) => [b, a, c]))), why: "order" },
      { list: right.slice(0, -1), why: "missing" },
    ];
  }
  const right = X.flatMap((x) => Y.map((y) => [x, y]));
  const out = [{ list: right, why: "right" }];
  if (k === 1) out.push({ list: right.filter(([x, y]) => Number(x.replace("−", "-")) <= Number(y.replace("−", "-"))), why: "half" }, { list: right.filter(([x, y]) => x !== y), why: "diagonal" });
  else out.push({ list: Y.flatMap((y) => X.map((x) => [y, x])), why: "order" });
  if (k === 1) {
    out.push({ list: right.slice(0, -1), why: "missing" });
    return out;
  }
  else out.push({ list: X.slice(0, Math.min(X.length, Y.length)).map((x, i) => [x, Y[i]]), why: "zip" });
  out.push({ list: right.slice(0, -1), why: "missing" });
  return out;
}
const cl16Choices = (p: number[]) => shuf16("apcartl", p, cl16Lists(p).map((o) => setS(o.list.map(tupS))));

// ---------------------------------------------------------------- equality of ordered pairs
const D_CEQ: [number, number][] = [[0, 2], [-6, 6], [-6, 6], [0, 5]];
const ceqK = (s: number) => 2 + (s % 2);
const ceqU = (s: number) => 1 + (s % 3);
const ceqW = (s: number) => (s % 2 ? -1 : 1) * (1 + ((s + 1) % 3));
function ceqText([f, x, y, s]: number[]) {
  if (f === 0) {
    const k = ceqK(s);
    const u = ceqU(s);
    const w = ceqW(s);
    return `If (x/${k} + ${u}, y ${w < 0 ? "−" : "+"} ${Math.abs(w)}/${k}) = (${rs(rr(x + u * k, k))}, ${rs(rr(y * k + w, k))}), find x and y. Write the answer as (x, y).`;
  }
  if (f === 1) return `If (x + y, x − y) = (${n_(x + y)}, ${n_(x - y)}), find x and y. Write the answer as (x, y).`;
  return `If (2x + y, x − 3y) = (${n_(2 * x + y)}, ${n_(x - 3 * y)}), find x and y. Write the answer as (x, y).`;
}
// f 0: w/k is never a whole number, so the prompt never shows "y + 2/2"
const ceqOk = (p: number[]) => inD(p, D_CEQ) && (p[0] === 0 || p[3] === 0) && !(p[1] === 0 && p[2] === 0) && (p[0] !== 0 || ceqW(p[3]) % ceqK(p[3]) !== 0);

// ---------------------------------------------------------------- constructing a matrix from a rule
const MRULES: { text: string; f: (i: number, j: number) => R }[] = [
  { text: "i + j", f: (i, j) => rr(i + j) },
  { text: "i − j", f: (i, j) => rr(i - j) },
  { text: "2i + j", f: (i, j) => rr(2 * i + j) },
  { text: "ij", f: (i, j) => rr(i * j) },
  { text: "(i + 2j)²/2", f: (i, j) => rr((i + 2 * j) ** 2, 2) },
  { text: "|i − 3j|/2", f: (i, j) => rr(Math.abs(i - 3 * j), 2) },
  { text: "i² − j", f: (i, j) => rr(i * i - j) },
  { text: "(i − j)²", f: (i, j) => rr((i - j) ** 2) },
  { text: "3i − 2j", f: (i, j) => rr(3 * i - 2 * j) },
  { text: "i/j", f: (i, j) => rr(i, j) },
];
const MRULE_TYPED = ["i + j", "i - j", "2i + j", "i*j", "(i + 2j)^2/2", "abs(i - 3j)/2", "i^2 - j", "(i - j)^2", "3i - 2j", "i/j"];
const D_MCON: [number, number][] = [[1, 3], [1, 3], [0, 9], [0, 1]];
const mconOk = (p: number[]) => inD(p, D_MCON) && p[0] * p[1] >= 2;
const mconA = ([m, n, t]: number[]): M => Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => MRULES[t].f(i + 1, j + 1)));

// ---------------------------------------------------------------- order and type of a matrix
const MTYPE = ["a row matrix", "a column matrix", "a square matrix that is not a diagonal matrix", "a diagonal matrix that is not a scalar matrix", "a scalar matrix that is not the identity matrix", "an identity matrix", "a zero matrix", "a rectangular matrix that is neither a row nor a column matrix"];
const MTCONF = [[1, 7, 6], [0, 7, 6], [3, 7, 4], [4, 2, 5], [5, 3, 6], [4, 3, 6], [5, 4, 0], [2, 0, 1]];
const D_MTY: [number, number][] = [[0, 1], [0, 11], [0, 29]];
const MORD: [number, number][] = [[1, 2], [1, 3], [1, 4], [2, 1], [3, 1], [4, 1], [2, 3], [3, 2], [2, 4], [4, 2], [3, 4], [4, 3]];
function mtyMatrix([q, t, seed]: number[]): number[][] {
  const r = rnd16(`apmtype:${q}:${t}:${seed}`);
  const fill = (m: number, n: number, f: (i: number, j: number) => number) => Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => f(i, j)));
  const nz = () => [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7][r(0, 11)];
  if (q === 0) {
    const [m, n] = MORD[t];
    return fill(m, n, () => r(-5, 9));
  }
  const n = r(2, 3);
  if (t === 0) return [Array.from({ length: r(2, 4) }, nz)];
  if (t === 1) return Array.from({ length: r(2, 4) }, () => [nz()]);
  if (t === 2) return fill(n, n, (i, j) => (i === 0 && j === 1 ? nz() : r(-4, 6)));
  if (t === 3) {
    const d = Array.from({ length: n }, nz);
    if (d.every((x) => x === d[0])) d[1] = d[0] + 1 === 0 ? 2 : d[0] + 1;
    return fill(n, n, (i, j) => (i === j ? d[i] : 0));
  }
  if (t === 4) {
    const k = [2, 3, 4, 5, -1, -2, -3, 7][r(0, 7)];
    return fill(n, n, (i, j) => (i === j ? k : 0));
  }
  if (t === 5) return fill(n, n, (i, j) => (i === j ? 1 : 0));
  if (t === 6) return fill(r(2, 3), r(2, 3), () => 0);
  const m2_ = r(2, 3);
  return fill(m2_, m2_ === 2 ? 3 : 2, (i, j) => (i === 0 && j === 0 ? nz() : r(-4, 6)));
}
const mtyKey = (p: number[]) => JSON.stringify(mtyMatrix(p));
const mtyOk = (p: number[]) => inD(p, D_MTY) && (p[0] === 0 || p[1] <= 7) && (p[0] === 1 || p[2] <= 9) && !Array.from({ length: p[2] }, (_, s) => s).some((s) => mtyKey([p[0], p[1], s]) === mtyKey(p));
const ordS = (m: number, n: number) => `order ${m} × ${n}`;
function mtyOpts(p: number[]): string[] {
  const [q, t] = p;
  if (q === 0) {
    const [m, n] = MORD[t];
    const cands = [ordS(n, m), `order ${m * n} × 1`, `order 1 × ${m * n}`, ordS(Math.max(m, n), Math.max(m, n)), ordS(m + 1, n)];
    const opts = [ordS(m, n)];
    for (const c of cands) if (!opts.includes(c) && opts.length < 4) opts.push(c);
    return shuf16("apmtype", p, opts);
  }
  return shuf16("apmtype", p, [t, ...MTCONF[t]].map((i) => MTYPE[i]));
}
/** The type read from the entries (the independent check). */
function mtyRead(A: number[][]): number {
  const m = A.length;
  const n = A[0].length;
  if (A.every((r) => r.every((x) => x === 0))) return 6;
  if (m === 1) return 0;
  if (n === 1) return 1;
  if (m !== n) return 7;
  const diag = A.every((r, i) => r.every((x, j) => i === j || x === 0));
  if (!diag) return 2;
  const same = A.every((r, i) => r[i] === A[0][0]);
  if (!same) return 3;
  return A[0][0] === 1 ? 5 : 4;
}

// ---------------------------------------------------------------- equality of matrices
const D_MEQ: [number, number][] = [[0, 2], [-6, 6], [-6, 6], [-5, 5]];
const meqOk = (p: number[]) => inD(p, D_MEQ) && (p[0] === 2 || p[3] === 0) && !(p[1] === p[2] && p[0] < 2);
function meqText([f, x, y, z]: number[]) {
  const M = (rows: string[][]) => `[${rows.map((r) => `[${r.join(", ")}]`).join(", ")}]`;
  if (f === 0) return `If ${M([["x + y", "3"], ["−1", "x − y"]])} = ${M([[n_(x + y), "3"], ["−1", n_(x - y)]])}, find x and y. Write the answer as (x, y).`;
  if (f === 1) return `If ${M([["2x − y", "5"], ["x + 2y", "0"]])} = ${M([[n_(2 * x - y), "5"], [n_(x + 2 * y), "0"]])}, find x and y. Write the answer as (x, y).`;
  return `If ${M([["x + 3", "2y"], ["z − 4", "7"]])} = ${M([[n_(x + 3), n_(2 * y)], [n_(z - 4), "7"]])}, find x, y and z. Write the answer as (x, y, z).`;
}

// ---------------------------------------------------------------- modelling with a matrix product
const MMR: number[][][] = [[[3, 2], [5, 4], [8, 6]], [[2, 3], [4, 5], [6, 4]], [[4, 1], [6, 3], [9, 5]], [[1, 2], [3, 3], [5, 4]]];
const D_MMOD: [number, number][] = [[1, 6], [1, 6], [1, 6], [1, 6], [1, 6], [1, 6], [0, 1], [0, 3]];
const mmodOk = (p: number[]) => inD(p, D_MMOD) && (p[0] !== p[3] || p[1] !== p[4] || p[2] !== p[5]);
const mmodQ = (p: number[]) => [p.slice(0, 3), p.slice(3, 6)];
const mmodP = (p: number[]) => mmul(toM(mmodQ(p)), toM(MMR[p[7]]));
function mmodText(p: number[], w = false) {
  const [a, b, c, d, e, f, ctx, s] = p;
  const R = MMR[s];
  const C = (ctx + (w ? 1 : 0)) % 2;
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  if (C === 0) return `Two furniture workshops in Madurai make chairs, tables and cupboards. Each day workshop P makes ${n(a, "chair", "chairs")}, ${n(b, "table", "tables")} and ${n(c, "cupboard", "cupboards")}, and workshop Q makes ${n(d, "chair", "chairs")}, ${n(e, "table", "tables")} and ${n(f, "cupboard", "cupboards")}. A chair needs ${n(R[0][0], "unit", "units")} of wood and ${n(R[0][1], "hour", "hours")} of labour, a table ${n(R[1][0], "unit", "units")} and ${n(R[1][1], "hour", "hours")}, and a cupboard ${n(R[2][0], "unit", "units")} and ${n(R[2][1], "hour", "hours")}. Write the daily production as a 2 × 3 matrix and the needs per item as a 3 × 2 matrix, and multiply them to find, for each workshop, the total wood and the total labour each day. Write the product as [[a, b], [c, d]] (workshop P first; wood, then labour).`;
  return `Two school canteens in Coimbatore make idlis, dosas and vadas. On a day canteen P makes ${a} dozen idlis, ${b} dozen dosas and ${c} dozen vadas, and canteen Q makes ${d}, ${e} and ${f} dozen. One dozen idlis needs ${n(R[0][0], "cup", "cups")} of batter and ${n(R[0][1], "spoon", "spoons")} of oil, a dozen dosas ${n(R[1][0], "cup", "cups")} and ${n(R[1][1], "spoon", "spoons")}, and a dozen vadas ${n(R[2][0], "cup", "cups")} and ${n(R[2][1], "spoon", "spoons")}. Using a matrix product of the 2 × 3 production matrix and the 3 × 2 needs matrix, find for each canteen the total batter and the total oil. Write the product as [[a, b], [c, d]] (canteen P first; batter, then oil).`;
}

// ---------------------------------------------------------------- systems in words, three methods
const SYSCTX = [
  { who: ["Anu", "Ravi", "Meena"], verb: "buys", items: ["notebooks", "pens", "erasers"], one: ["notebook", "pen", "eraser"], unit: "₹", what: "the price of one notebook, one pen and one eraser, in rupees" },
  { who: ["Monday", "Tuesday", "Wednesday"], verb: "sold", items: ["adult tickets", "senior-citizen tickets", "child tickets"], one: ["adult ticket", "senior-citizen ticket", "child ticket"], unit: "₹", what: "the price of an adult, a senior-citizen and a child ticket, in rupees" },
  { who: ["Farm P", "Farm Q", "Farm R"], verb: "used", items: ["bags of fertiliser A", "bags of fertiliser B", "bags of fertiliser C"], one: ["bag of fertiliser A", "bag of fertiliser B", "bag of fertiliser C"], unit: "kg of nitrogen", what: "the kilograms of nitrogen in one bag of A, of B and of C" },
];
function sysA(s: number): number[][] {
  const r = rnd16(`apsysw:${s}`);
  for (let t = 0; t < 200; t++) {
    const A = [0, 1, 2].map(() => [0, 1, 2].map(() => r(0, 4)));
    if (A.some((row) => row.filter((x) => x > 0).length < 2) || [0, 1, 2].some((j) => A.every((row) => row[j] === 0))) continue;
    const D = sarrus(A);
    if (D !== 0 && Math.abs(D) <= 30) return A;
  }
  return [[1, 1, 1], [1, 2, 3], [2, 1, 1]];
}
const D_SYSW: [number, number][] = [[1, 12], [1, 12], [1, 12], [0, 2], [0, 2], [0, 19]];
const METH = ["the matrix method (X = A⁻¹B)", "Cramer's rule", "Gaussian elimination (reduce the augmented matrix to echelon form and back-substitute)"];
function syswText([x, y, z, t, m, s]: number[]): string {
  const A = sysA(s);
  const C = SYSCTX[t];
  const sol = [x, y, z];
  const lines = A.map((row, i) => {
    const parts = row.map((c, j) => (c ? `${c} ${c === 1 ? C.one[j] : C.items[j]}` : "")).filter(Boolean);
    const total = row.reduce((a, c, j) => a + c * sol[j], 0);
    const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
    return t === 0 ? `${C.who[i]} buys ${list} for ₹${total}` : t === 1 ? `on ${C.who[i]} the theatre sold ${list} for ₹${total}` : `${C.who[i]} used ${list}, giving ${total} kg of nitrogen`;
  });
  const lead = t === 0 ? "At a stationery shop in Erode," : t === 1 ? "For a Tamil drama in Thanjavur," : "In a farm survey near Namakkal,";
  return `${lead} ${lines.join("; ")}. Form the equations and solve them by ${METH[m]} to find ${C.what}. Write the answer as (x, y, z).`;
}
// sensible prices in every situation (the everyday form uses the next one): x > y > z, a pen (y) at least ₹5, an eraser
// (z) at least ₹2; senior-citizen tickets (y) cost less than adult ones and more than child ones
const syswOk = (p: number[]) => inD(p, D_SYSW) && p[0] > p[1] && p[1] > p[2] && p[1] >= 5 && p[2] >= 2;

// ---------------------------------------------------------------- feasible, infeasible, unbounded
/** [k, a, b, m, d, P, Q]: c = a·b·m. k 0 infeasible (ax + by ≤ c and x ≥ c/a + d); 1 unbounded max (ax + by ≥ c); 2 bounded max (ax + by ≤ c); 3 min over ax + by ≥ c. */
const D_LPF: [number, number][] = [[0, 3], [1, 5], [1, 5], [1, 3], [1, 4], [1, 9], [1, 9]];
const lpfOk = (p: number[]) => inD(p, D_LPF) && p[1] !== p[2] && gcd(p[1], p[2]) === 1 && (p[0] === 0 || p[4] === 1) && p[5] * p[2] !== p[6] * p[1] && p[1] * p[2] * p[3] <= 40;
function lpfCons([k, a, b, m, d]: number[]): [number, number, number, number][] {
  const c = a * b * m;
  if (k === 0) return [[a, b, c, -1], [1, 0, b * m + d, 1]];
  return [[a, b, c, k === 2 ? -1 : 1]];
}
const consS = (cs: [number, number, number, number][]) => cs.map(([a, b, c, s]) => (a && b ? `${eqS([a, b], c, ["x", "y"])}` : eqS([a, b], c, ["x", "y"])).replace("=", s < 0 ? "≤" : "≥")).join(", ") + ", x ≥ 0, y ≥ 0";
function lpfLabels(p: number[]) {
  const [k, a, b, m, , P, Q] = p;
  const c = a * b * m;
  const vx = (P * c) / a;
  const vy = (Q * c) / b;
  const word = k === 3 ? "minimum" : "maximum";
  const best = k === 3 ? Math.min(vx, vy) : Math.max(vx, vy);
  const other = k === 3 ? Math.max(vx, vy) : Math.min(vx, vy);
  return {
    best: `The ${word} value of Z is ${best}`,
    other: `The ${word} value of Z is ${other}`,
    unb: `Z has no ${word}: the feasible region is unbounded`,
    inf: "There is no feasible region: the constraints cannot all be satisfied, so there is no optimal value",
  };
}
const lpfRight = (p: number[]) => (p[0] === 0 ? "inf" : p[0] === 1 ? "unb" : "best");
const lpfChoices = (p: number[]) => {
  const L = lpfLabels(p);
  return shuf16("aplpfeas", p, [L.best, L.other, L.unb, L.inf]);
};

// ---------------------------------------------------------------- approximations with the series
/** [q, ni, k, m]: q 0 binomial (1 + k/100)^n, n = SN[ni] (m = 1: √(100 + k) = 10(1 + k/100)^(1/2)); q 1 e^(k/100); q 2 log(1 + 3k/100) */
const SN: [number, number][] = [[1, 2], [-1, 1], [-2, 1], [1, 3], [-1, 2]];
const D_SAPP: [number, number][] = [[0, 2], [0, 4], [-9, 9], [0, 1]];
const sappOk = (p: number[]) => {
  if (!inD(p, D_SAPP)) return false;
  const [q, ni, k, m] = p;
  if (k === 0) return false;
  // the server reads decimal answers to at most six places: an exact three-term sum must fit
  if ((String(sappAns(p)).split(".")[1] ?? "").length > 6) return false;
  if (q === 0) return (ni !== 3 || k % 3 === 0) && (m === 0 || ni === 0);
  if (q === 1) return ni === 0 && m === 0;
  return ni === 0 && m === 0 && Math.abs(k) <= 4;
};
function sappTerms([q, ni, k, m]: number[]): R[] {
  if (q === 0) {
    const n = rr(...SN[ni]);
    const x = rr(k, 100);
    const t = [rr(1), rmul(n, x), rmul(rdiv(rmul(n, rsub(n, rr(1))), rr(2)), rmul(x, x))];
    return m ? t.map((v) => rmul(v, rr(10))) : t;
  }
  if (q === 1) {
    const x = rr(k, 100);
    return [rr(1), x, rdiv(rmul(x, x), rr(2))];
  }
  const x = rr(3 * k, 100);
  return [x, rmul(rr(-1, 2), rmul(x, x)), rdiv(rmul(x, rmul(x, x)), rr(3))];
}
const sappAns = (p: number[]) => rv(sappTerms(p).reduce((a, b) => radd(a, b), [0, 1] as R));
const decS = (v: number) => String(Math.round(v * 1e9) / 1e9);
function sappExpr([q, ni, k, m]: number[]): string {
  const base = decS(1 + k / 100);
  if (q === 0) {
    if (m) return `√${100 + k}`;
    return [`√${base}`, `1/${base}`, `1/(${base})²`, `∛${base}`, `1/√${base}`][ni];
  }
  if (q === 1) return `e^(${decS(k / 100)})`;
  return `log ${decS(1 + (3 * k) / 100)}`;
}
function sappText(p: number[], w = false) {
  return sappText0(p, w).replace(/Give the decimal\.|, as a decimal\./, (t) => `${t.startsWith(",") ? ". " : ""}${sappPlaces(p)}`);
}
/** The three-term sum is exact; say how many decimal places it has so no rounding is expected. */
function sappPlaces(p: number[]) {
  const d = (decS(sappAns(p)).split(".")[1] ?? "").length;
  return `Give the sum of the three terms exactly, as a decimal (it has ${d} decimal place${d === 1 ? "" : "s"}; do not round).`;
}
function sappText0(p: number[], w = false) {
  const [q, , , m] = p;
  const e = sappExpr(p);
  if (!w) return q === 0 ? `Use the first three terms of the binomial series to find an approximate value of ${e}${m ? ` (write it as 10(1 ${p[2] < 0 ? "−" : "+"} ${decS(Math.abs(p[2]) / 100)})^(1/2))` : ""}. Give the decimal.` : q === 1 ? `Use the first three terms of the exponential series to find an approximate value of ${e}. Give the decimal.` : `Use the first three terms of the logarithmic series to find an approximate value of ${e} (log is the natural logarithm). Give the decimal.`;
  if (q === 1) return `Money in an account that grows continuously at ${Math.abs(p[2])}% a year is multiplied by e^(${decS(p[2] / 100)}) each year${p[2] < 0 ? " (here it shrinks, because of charges)" : ""}. Using the first three terms of the exponential series, find this multiplying factor approximately. Give the decimal.`;
  if (q === 2) return `A town's population is multiplied by ${decS(1 + (3 * p[2]) / 100)} each year. The continuous growth rate that does the same is log ${decS(1 + (3 * p[2]) / 100)} (natural logarithm). Using the first three terms of the logarithmic series, find this rate approximately, as a decimal.`;
  return `${nm16(p[2] + p[1])}'s calculator has no keys for roots or powers. Use the first three terms of the binomial series to work out ${e} approximately for a science project. Give the decimal.`;
}
const nm16 = (k: number) => name(k);

// ---------------------------------------------------------------- transformations of the plane
const TRM: { text: string; M: number[][] }[] = [
  { text: "a rotation through 90° anticlockwise about the origin", M: [[0, -1], [1, 0]] },
  { text: "a rotation through 180° about the origin", M: [[-1, 0], [0, -1]] },
  { text: "a rotation through 270° anticlockwise about the origin", M: [[0, 1], [-1, 0]] },
  { text: "a reflection in the x-axis", M: [[1, 0], [0, -1]] },
  { text: "a reflection in the y-axis", M: [[-1, 0], [0, 1]] },
  { text: "a reflection in the line y = x", M: [[0, 1], [1, 0]] },
];
const D_ROT: [number, number][] = [[0, 5], [-6, 6], [-6, 6]];
const rotOk = (p: number[]) => inD(p, D_ROT) && p[1] !== 0 && p[2] !== 0 && Math.abs(p[1]) !== Math.abs(p[2]);
const rotImg = ([t, x, y]: number[]) => {
  const M = TRM[t].M;
  return [M[0][0] * x + M[0][1] * y, M[1][0] * x + M[1][1] * y];
};

// ---------------------------------------------------------------- orthogonal matrices
const TRIPLES: [number, number, number][] = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25]];
const ORTH3: [number, number[][]][] = [[3, [[1, 2, 2], [2, 1, -2], [2, -2, 1]]], [7, [[2, 3, 6], [3, -6, 2], [6, 2, -3]]], [9, [[1, 4, 8], [4, 7, -4], [8, -4, 1]]]];
const PERMS3 = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const D_ORTH: [number, number][] = [[0, 1], [0, 7], [0, 47]];
const orthOk = (p: number[]) => inD(p, D_ORTH) && (p[0] === 0 ? p[2] <= 7 : p[1] <= 2);
function orthA([d, i, s]: number[]): { k: number; M: number[][] } {
  if (d === 0) {
    const [a, b, k] = TRIPLES[i];
    const sa = s & 1 ? -1 : 1;
    const sb = s & 2 ? -1 : 1;
    return { k, M: s & 4 ? [[sa * a, sb * b], [sb * b, -sa * a]] : [[sa * a, -sb * b], [sb * b, sa * a]] };
  }
  const [k, M0] = ORTH3[i];
  const P = PERMS3[s % 6];
  const sg = Math.floor(s / 6);
  return { k, M: P.map((r) => M0[r].map((x, j) => ((sg >> j) & 1 ? -x : x))) };
}
const orthM = (p: number[]) => {
  const { k, M } = orthA(p);
  return mscale(toM(M), rr(1, k));
};

// ---------------------------------------------------------------- coding messages with a matrix
const CODEA = [[[1, 2], [1, 3]], [[2, 1], [3, 2]], [[3, 5], [1, 2]], [[1, 1], [2, 3]], [[2, 3], [1, 2]], [[4, 3], [1, 1]], [[3, 2], [4, 3]], [[5, 3], [3, 2]]];
const D_CODE: [number, number][] = [[0, 1], [0, 7], [1, 26], [1, 26]];
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const codeC = ([, i, m1, m2]: number[]) => {
  const A = CODEA[i];
  return [A[0][0] * m1 + A[0][1] * m2, A[1][0] * m1 + A[1][1] * m2];
};
function codeText(p: number[], w = false) {
  const [dir, i, m1, m2] = p;
  const C = codeC(p);
  const lead = w ? `${nm16(i + m1)} and ${nm16(i + m2 + 3)} pass secret notes in class.` : "In a matrix code,";
  const rule = `each letter is replaced by its position in the alphabet (A = 1, B = 2, …, Z = 26), a pair of letters is written as a column M = [[m₁], [m₂]], and the coded column is C = AM with A = ${matN(CODEA[i])}.`;
  return dir === 0
    ? `${lead} ${w ? "They agree that " : ""}${rule} A coded column [[${C[0]}], [${C[1]}]] is received. Decode it using A⁻¹: find (m₁, m₂).`
    : `${lead} ${w ? "They agree that " : ""}${rule} Encode the letters ${ABC[m1 - 1]}${ABC[m2 - 1]}: find the coded column C and write it as (c₁, c₂).`;
}

// ---------------------------------------------------------------- the Gauss–Jordan inverse
const GJM = new Map<number, number[][]>();
function gjA(seed: number): number[][] {
  if (!GJM.has(seed)) GJM.set(seed, gjA0(seed));
  return GJM.get(seed)!;
}
function gjA0(seed: number): number[][] {
  const r = rnd16(`apgj3:${seed}`);
  for (let t = 0; t < 400; t++) {
    let A = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let k = 0; k < 4; k++) {
      const i = r(0, 2);
      const j = (i + r(1, 2)) % 3;
      const c = [-2, -1, 1, 2][r(0, 3)];
      A = A.map((row, a) => (a === i ? row.map((x, b) => x + c * A[j][b]) : row));
    }
    if (r(0, 1)) A = [A[1], A[0], A[2]];
    const inv = mT(cofactors(A)).map((row) => row.map((x) => x * sarrus(A)));
    if (A.flat().every((x) => Math.abs(x) <= 6) && inv.flat().every((x) => Math.abs(x) <= 9) && A.flat().filter((x) => x === 0).length <= 4 && !meq(toM(A), ident(3)) && !meq(toM(inv), toM(A))) return A;
  }
  return [[1, 1, 0], [0, 1, 1], [1, 0, 2]];
}
const gjInv = (A: number[][]) => mT(cofactors(A)).map((row) => row.map((x) => x * sarrus(A)));
const D_GJ: [number, number][] = [[0, 199]];
const gjKey = (s: number) => JSON.stringify(gjA(s));
const gjOk = (p: number[]) => inD(p, D_GJ) && !Array.from({ length: p[0] }, (_, s) => s).some((s) => gjKey(s) === gjKey(p[0]));

// ---------------------------------------------------------------- reciprocal equations
const RT: [number, number][] = [[2, 1], [3, 1], [4, 1], [5, 1], [-2, 1], [-3, 1], [-4, 1], [-5, 1], [3, 2], [-3, 2], [5, 2], [4, 3]];
const D_REC: [number, number][] = [[0, 11], [0, 11], [0, 1]];
const recOk = (p: number[]) => inD(p, D_REC) && p[0] < p[1];
/** (pqx² − (p² + q²)x + pq) for each root p/q, times (x + 1) when odd. */
function recPoly([i, j, odd]: number[]): number[] {
  const f = ([a, b]: [number, number]) => [a * b, -(a * a + b * b), a * b];
  const mulP = (u: number[], v: number[]) => {
    const out = Array(u.length + v.length - 1).fill(0);
    u.forEach((x, a) => v.forEach((y, b) => (out[a + b] += x * y)));
    return out;
  };
  let P = mulP(f(RT[i]), f(RT[j]));
  if (odd) P = mulP(P, [1, 1]);
  const g = P.reduce((a, b) => gcd(a, b), 0);
  return P.map((c) => c / g).map((c, _, arr) => (arr[0] < 0 ? -c : c));
}
const recRoots = ([i, j, odd]: number[]) => [...[RT[i], RT[j]].flatMap(([a, b]) => [a / b, b / a]), ...(odd ? [-1] : [])].sort((x, y) => x - y);

// ---------------------------------------------------------------- equations reducible to quadratics
const D_RED: [number, number][] = [[0, 3], [0, 9], [1, 9]];
const redOk = (p: number[]) => {
  if (!inD(p, D_RED)) return false;
  const [q, a, b] = p;
  if (q === 0) return a >= 1 && a < b;
  if (q === 1) return a < b && b <= 5;
  if (q === 2) return a < b && b <= 3;
  return a >= 1 && a !== b;
};
function redText([q, a, b]: number[]) {
  if (q === 0) return `Solve x − ${a + b}√x + ${a * b} = 0 for real x (put y = √x). Give every solution, separated by commas.`;
  if (q === 1) return `Solve 4^x − ${2 ** a + 2 ** b} × 2^x + ${2 ** (a + b)} = 0 (put y = 2^x). Give every solution, separated by commas.`;
  if (q === 2) return `Solve 9^x − ${3 ** a + 3 ** b} × 3^x + ${3 ** (a + b)} = 0 (put y = 3^x). Give every solution, separated by commas.`;
  const c = b - a;
  return `Solve x ${c < 0 ? "−" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}√x − ${a * b} = 0 for real x (put y = √x). Give every solution, separated by commas.`;
}
const redAns = ([q, a, b]: number[]) => (q === 0 ? [a * a, b * b] : q === 3 ? [a * a] : [a, b]);
const redF = ([q, a, b]: number[]) => (x: number) => (q === 0 ? x - (a + b) * Math.sqrt(x) + a * b : q === 1 ? 4 ** x - (2 ** a + 2 ** b) * 2 ** x + 2 ** (a + b) : q === 2 ? 9 ** x - (3 ** a + 3 ** b) * 3 ** x + 3 ** (a + b) : x + (b - a) * Math.sqrt(x) - a * b);

// ---------------------------------------------------------------- volume problems giving cubics
/** apgj3: the inverse with the sign of its last non-zero entry changed (one slip in the working). */
function gjSlip(inv: number[][]): number[][] {
  const out = inv.map((r) => [...r]);
  for (let k = 8; k >= 0; k--) if (out[Math.floor(k / 3)][k % 3] !== 0) return (out[Math.floor(k / 3)][k % 3] *= -1), out;
  return out;
}
const D_VOLG: [number, number][] = [[0, 1], [2, 20], [-3, 6]];
const volgOk = (p: number[]) => inD(p, D_VOLG) && p[2] !== 0 && (p[0] === 0 ? p[1] + p[2] >= 1 : p[2] >= 1);
const volgV = ([q, x, a]: number[]) => (q === 0 ? x * x * (x + a) : 2 * x * x * (x + a));
function volgText(p: number[], w = false) {
  const [q, x, a] = p;
  const V = volgV(p);
  if (q === 0) return w ? `A gift box has a square base of side x cm, and its height is ${Math.abs(a)} cm ${a > 0 ? "more" : "less"} than the side of the base. Its volume is ${V} cm³. Form a cubic equation in x and solve it to find x, in cm.` : x <= 4 ? `A water tank in the shape of a cuboid has a square base of side x m and a height of (x ${a < 0 ? "−" : "+"} ${Math.abs(a)}) m. Its volume is ${V} m³. Form a cubic equation in x and solve it to find x, in metres.` : `A cardboard carton in the shape of a cuboid has a square base of side x cm and a height of (x ${a < 0 ? "−" : "+"} ${Math.abs(a)}) cm. Its volume is ${V} cm³. Form a cubic equation in x and solve it to find x, in cm.`;
  return w ? `A wooden chest has height x cm; its length is twice its height, and its width is ${a} cm more than its height. Its volume is ${V} cm³. Form a cubic equation in x and solve it to find the height x, in cm.` : x <= 4 ? `A cuboid-shaped storage room has height x m, length 2x m and width (x + ${a}) m. Its volume is ${V} m³. Form a cubic equation in x and solve it to find x, in metres.` : `A cuboid-shaped drawer has height x cm, length 2x cm and width (x + ${a}) cm. Its volume is ${V} cm³. Form a cubic equation in x and solve it to find x, in cm.`;
}

// ---------------------------------------------------------------- Vieta with a box
const D_VBOX: [number, number][] = [[1, 9], [1, 9], [1, 9], [0, 3]];
const vboxOk = (p: number[]) => inD(p, D_VBOX) && p[0] <= p[1] && p[1] <= p[2];
const vboxS = ([a, b, c]: number[]) => ({ p: a + b + c, q: a * b + b * c + c * a, r: a * b * c });
const VBQ = ["the total surface area of the box, in cm²", "the total length of all 12 edges of the box, in cm", "the volume of the box, in cm³", "the square of the length of a diagonal of the box (from one corner to the opposite corner), in cm²"];
const vboxAns = (p: number[]) => {
  const { p: s1, q, r } = vboxS(p);
  return [2 * q, 4 * s1, r, s1 * s1 - 2 * q][p[3]];
};
function vboxText(p: number[], w = false) {
  const { p: s1, q, r } = vboxS(p);
  const eq = `x³ − ${s1}x² + ${q}x − ${r} = 0`;
  return w ? `An engineer designing a water tank finds that its length, breadth and height, in metres, are the three roots of ${eq}. Without solving the equation, find ${VBQ[p[3]].replace(/cm/g, "m").replace(/box/g, "tank")}.` : `The length, breadth and height of a cuboid-shaped box, in cm, are the three roots of ${eq}. Without solving the equation, use the relations between roots and coefficients to find ${VBQ[p[3]]}.`;
}

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
      return [surd(4 * k, m), String(2 * a * b), surd(3 * k, m), String(2 * (a + b)), String(a * b)];
    },
    variants: () => [],
    explain: (s) => (s.id === "product" ? `${s.inputs[0] === "x" ? "x" : `(${s.inputs[0]})`}(${s.inputs[1]}) = ${s.value}: x cancels, so the product is fixed` : s.id === "gm" ? `GM = √${s.inputs[0]} = ${s.value}` : `AM ≥ GM: the sum ≥ 2 × ${s.inputs[1]} = ${s.value}, with equality when the two terms are equal`),
    domain: [[1, 12], [1, 30]],
    cap: 360,
    difficulty: ([a, b]) => (sqfree(a * b)[1] === 1 ? 1 : a === 1 ? 2 : 3),
    word: ([a, b]) => `An engineer finds that a frame of width x metres (x > 0) needs (${a === 1 ? "" : a}x + ${b}/x) metres of steel rod. What is the least length of rod the frame can need, in metres? Give the exact value (a surd such as 4√3 is fine).`,
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
        : `Find the coefficient of x${sup(r)} in the expansion of ${a === 1 && b === 1 ? "eˣ" : `e^(${a < 0 ? "−" : ""}${kx})`} in ascending powers of x.`;
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
            ...(k[0] !== 1 || k[1] !== 1 ? [B("k-not-raised", "procedural", SER, `The ${rs(k)} inside was not raised to the power ${r}: the term is (${a < 0 ? "−" : ""}${kxS(a, b)})${sup(r)}.`, rs(rmul(sign, rdiv(k, rr(r)))))] : []),
          ]
        : [
            B("no-factorial", "recall", SER, `The term was not divided by ${r}!; e^y = 1 + y + y²/2! + y³/3! + …`, rs(kr)),
            B("divide-by-r", "recall", SER, `The term was divided by ${r}, as in the log series; the exponential series divides by ${r}! = ${fact(r)}.`, rs(rdiv(kr, rr(r)))),
            ...(k[0] !== 1 || k[1] !== 1 ? [B("k-not-raised", "procedural", SER, `The ${rs(k)} inside was not raised to the power ${r}: the term is (${a < 0 ? "−" : ""}${kxS(a, b)})${sup(r)}/${r}!.`, rs(rdiv(k, rr(fact(r)))))] : []),
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
      const ans = polyS(t ? [1, d, e] : [d, e], "n");
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
          B("n-not-n-minus-1", "procedural", AP, `aₙ = a + nd was used; the first term has no d added, so aₙ = a + (n − 1)d.`, polyS([d, t1], "n")),
          // the difference found as a₁ − a₂ (subtracted the wrong way round), then a + (n − 1)d used correctly
          B("difference-reversed", "procedural", AP, `The difference was worked out as a₁ − a₂ = ${n_(-d)}; the common difference is a₂ − a₁ = ${n_(d)} (later term minus earlier term).`, polyS([-d, t1 + d], "n")),
          ...(t1 === d || t1 === 0 ? [] : [B("constant-left-out", "procedural", NOTE, `Only the step ${n_(d)}n was written; ${n_(d)}n gives ${n_(d)} at n = 1, but the first term is ${n_(t1)}, so a constant ${n_(t1 - d)} must be added.`, polyS([d, 0], "n"))]),
        ];
      const B2 = t2 - t1 - 6;
      return [
        B("treated-as-ap", "conceptual", NOTE, "Only the first difference was used, as if the sequence were an AP; here the differences themselves change, so aₙ has an n² term.", polyS([D, t1 - D], "n")),
        B("whole-second-difference", "procedural", NOTE, "The coefficient of n² was taken as the second difference (2); it is half of it, because n² itself has second difference 2.", polyS([2, B2, t1 - 2 - B2], "n")),
        ...(d === 0 ? [] : [B("square-only", "procedural", NOTE, "Only n² was matched to the first term; the n term is needed too (check a₂ and a₃).", polyS([1, 0, t1 - 1], "n"))]),
      ];
    },
    distractors: ([t, d, e]) => (t ? [polyS([1, d, e + 1], "n"), polyS([1, -d, e], "n")] : [polyS([d, e + 1], "n"), polyS([d, -e], "n"), polyS([-d, e], "n")]),
    variants: () => [],
    explain: (s) => (s.id === "first-diff" ? `a₂ − a₁ = ${n_(Number(s.value))}` : s.id === "second-diff" ? "The differences go up by 2 each time, so aₙ = n² + bn + c" : `Match a₁ and a₂: aₙ = ${s.value}`),
    domain: [[0, 1], [-6, 9], [-9, 9]],
    keep: ([t, d, e]) => (t === 0 ? d !== 0 : Math.abs(d) <= 4 && Math.abs(e) <= 5),
    cap: 400,
    difficulty: ([t, d, e]) => (t ? 3 : d > 0 && e >= 0 ? 1 : 2),
    word: (p) => `A savings club in Karaikudi writes down its balance, in hundreds of rupees, at the end of each month (a negative number means the club owes money). For months 1 to 5 the balances are ${genTerms(p, 5).map(n_).join(", ")}, and the pattern continues.${p[0] ? " (The month-to-month changes go up by the same amount each time.)" : ""} Write a formula for the balance aₙ at the end of month n.`,
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
    word: ([c3, c2, c1, c0, n]) => `In a science-club experiment in Vellore, the change in the number of seedlings in tray k is ${polyS([c3, c2, c1, c0], "k")} (a negative number means seedlings were lost). The club has trays 1 to ${n}. What is the total change over all ${n} trays?`,
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
    // [v, m, n, o]: v = 0 n(A × B) with A in set-builder form; 1 n(A × B × C); 2 n((A × B) ∪ (B × A)) for disjoint A, B; 3 n((A × B) ∩ (A × C))
    // (counting relations from A to B is the relations family aocart; this family stays with products of sets)
    reject: ([v, m, n, o]) => (v < 0 || v > 3 || m < 2 || m > 6 || n < 2 || n > 5 || o < 0 || o > 4 || (v === 2 && o !== 0) || (v === 3 && (o < 1 || o > n - 1)) ? "Small finite sets: products of two or three sets, unions and intersections of products." : null),
    prompt: (p) => cartText(p),
    solve: ([v, m, n, o]) => {
      const ans = v === 0 ? m * n : v === 1 ? m * n * (o + 2) : v === 2 ? 2 * m * n : m * o;
      return {
        steps:
          v === 0
            ? [
                { ...st("count-a", "count", SETS, [`{x ∈ ℤ : ${o - 2} ≤ x < ${o - 2 + m}}`], m), justification: { rule: "arithmetic-fact" as const, operation: "count elements of a set-builder set", supports: "product-counting" } },
                { ...st("product", "multiply", CART, [m, n], ans), justification: { rule: "product-counting" as const, what: "ordered pairs in A × B", factors: [m, n] } },
              ]
            : v === 1
              ? [{ ...st("product", "multiply", CART, [m, n, o + 2], ans), justification: { rule: "product-counting" as const, what: "ordered triples in A × B × C", factors: [m, n, o + 2] } }]
              : v === 2
                ? [
                    { ...st("pairs", "multiply", CART, [m, n], m * n), justification: { rule: "product-counting" as const, what: "ordered pairs in one product", factors: [m, n] } },
                    { ...st("union", "add", SETS, [m * n, m * n], ans), justification: { rule: "additive-combination" as const, what: "pairs from A × B and B × A (disjoint union)", parts: [m * n, m * n] } },
                  ]
                : [
                    { ...st("common", "count", SETS, ["B ∩ C"], o), justification: { rule: "arithmetic-fact" as const, operation: "count elements of B ∩ C", supports: "product-counting" } },
                    { ...st("product", "multiply", CART, [m, o], ans), justification: { rule: "product-counting" as const, what: "ordered pairs in A × (B ∩ C)", factors: [m, o] } },
                  ],
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
      else if (v === 2) c = new Set([...A.flatMap((a) => Bs.map((b) => `${a}|${b}`)), ...Bs.flatMap((b) => A.map((a) => `${b}|${a}`))]).size;
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
                B("product-commutes", "conceptual", CART, `A × B and B × A were taken to be the same set, so only ${m * n} pairs were counted; (1, a) is in A × B but (a, 1) is in B × A — different pairs — and no pair is in both, because A and B have no common element.`, m * n),
                ...(m + n === m * n ? [] : [B("added", "conceptual", CART, "The numbers of elements were added; each element of A pairs with each element of B, so n(A × B) = n(A) × n(B).", 2 * (m + n))]),
                B("square-of-union", "procedural", CART, `(A ∪ B) × (A ∪ B) was counted (${m + n}²); it also contains pairs like (1, 2) and (a, b) that are in neither A × B nor B × A.`, (m + n) ** 2),
              ]
            : [
                B("union", "conceptual", CART, "The union (A × B) ∪ (A × C) was counted; the intersection keeps only pairs whose second entry is in both B and C.", m * (2 * n - o)),
                B("forgot-a", "procedural", CART, `Only B ∩ C was counted; each of its ${o} elements pairs with each of the ${m} elements of A.`, o),
              ],
    variants: () => [],
    explain: (s) => (s.id === "count-a" ? `List A: it has ${s.value} elements` : s.id === "pairs" ? `n(A × B) = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "union" ? `B × A has ${s.inputs[1]} pairs too, none of them in A × B (A and B have no common element): ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : s.id === "common" ? `B ∩ C has ${s.value} elements, and (A × B) ∩ (A × C) = A × (B ∩ C)` : `Multiply: ${s.inputs.join(" × ")} = ${s.value}`),
    domain: [[0, 3], [2, 6], [2, 5], [0, 4]],
    keep: ([v, , n, o]) => (v === 2 ? o === 0 : v === 3 ? o >= 1 && o <= n - 1 : true),
    difficulty: ([v]) => (v === 1 ? 1 : v === 0 ? 2 : 3),
    word: ([v, m, n, o]) => {
      const Bs = SHAPE(n).join(", ");
      if (v === 0) return `A lift in a Chennai office stops at the floors numbered x with ${n_(o - 2)} ≤ x < ${n_(o - 2 + m)} (negative numbers are basement floors). A courier has parcels marked ${Bs}. A delivery is a pair (floor, parcel). How many different deliveries are possible?`;
      if (v === 1) return `A school uniform shop sells shirts in sizes 1 to ${m}, trousers in styles ${Bs} and caps in ${o + 2} colours. An outfit is an ordered triple (shirt size, trouser style, cap colour). How many different outfits are there?`;
      if (v === 2) return `School P has kabaddi teams numbered 1 to ${m} and school Q has teams named ${Bs}. Every team of P plays every team of Q twice, once at home and once away. A match is written as (home team, away team). How many different matches are there?`;
      return `A shoe shop sells sizes 1 to ${m} in the colours ${Bs}. A second shop sells sizes 1 to ${m} in the colours ${SHAPE(2 * n).slice(n - o, 2 * n - o).join(", ")}. How many different (size, colour) pairs can be bought at BOTH shops?`;
    },
    teach: {
      idea: "A × B is the set of all ordered pairs (a, b) with a ∈ A and b ∈ B. Each of the n(A) first entries goes with each of the n(B) second entries, so n(A × B) = n(A)·n(B).",
      method: "Count each set first (list it if it is in set-builder form), then multiply. A × B and B × A have the same number of pairs, but different pairs: (a, b) ≠ (b, a) unless a = b.",
      alternatives: [
        { id: "grid", title: "A grid of pairs", kind: "conceptual", text: ["Draw a grid with a row for each element of A and a column for each element of B.", "Each cell is one ordered pair, so the number of cells is rows × columns."], visual: ([, m, n]) => ({ type: "grid", rows: m, cols: n }) },
      ],
    },
    limits: "Finite sets of up to six elements; counting relations from A to B is the relations family (aocart).",
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
    word: (p) => `Machine A in a Hosur factory works safely for temperatures (in °C) in the interval ${ivS(ivA(p))}, and machine B for temperatures in ${ivS(ivB(p))}. Find the set of temperatures at which ${["both machines work safely", "at least one of the machines works safely", "machine A works safely but machine B does not"][p[6]]}. Write it in interval notation (if it has two pieces, join them with ∪).`,
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
      if (a < 0) out.push(B("brackets-not-swapped", "conceptual", INEQ, `The ends were swapped after dividing by ${n_(a)}, but the brackets were kept where they were; reversing the inequalities moves the strict end to the other side, so the brackets swap sides too.`, ivS({ ...right, lc: !!s, hc: !s })));
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
          st("swap", "write", INV, ["y = f(x)"], c === 0 ? `y = ${polyS([a, b])}` : `${polyS([c, d]) === "x" ? "xy" : `y(${polyS([c, d])})`} = ${polyS([a, b])}`),
          st("collect", "solve", LIN, ["x"], c === 0 ? `x = (y ${b < 0 ? "+" : "−"} ${Math.abs(b)})/${n_(a)}` : `${polyS([c, -a], "y") === "y" ? "xy" : `x(${polyS([c, -a], "y")})`} = ${polyS([-d, b], "y")}`),
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
            B("reciprocal", "conceptual", INV, "f⁻¹ was taken as 1/f(x); the inverse UNDOES f (f⁻¹(f(x)) = x), it is not the reciprocal.", `1/${wrapBot(polyS([a, b]))}`),
            ...(b === 0 || a === 1 ? [] : [B("undo-wrong-order", "procedural", INV, `The steps were undone in the wrong order: f multiplies by ${n_(a)} first and then adds ${n_(b)}, so f⁻¹ first takes away ${n_(b)} and then divides by ${n_(a)}.`, `${a < 0 ? "−" : ""}x/${Math.abs(a)} ${b > 0 ? "−" : "+"} ${Math.abs(b)}`)]),
            ...(b === 0 ? [] : [B("sign-of-b", "procedural", LIN, `${n_(b)} was moved across without changing its sign.`, linInv(a, -b))]),
          ]
        : [
            B("reciprocal", "conceptual", INV, "f⁻¹ was taken as 1/f(x); the inverse UNDOES f (f(f⁻¹(x)) = x), it is not the reciprocal.", fracS(c, d, a, b, "x")),
            B("sign-slip", "procedural", LIN, "A sign was lost when the x terms were collected on one side; check by putting your answer into f.", `${wrapTop(polyS([d, -b]))}/${wrapBot(polyS([c, -a]))}`),
          ],
    distractors: ([a, b, c, d]) => (c === 0 ? [polyS([a, -b])] : [fracS(a, b, c, d), `${wrapTop(polyS([d, b]))}/${wrapBot(polyS([c, a]))}`]),
    variants: () => [],
    explain: (s) => (s.id === "swap" ? `Write ${s.value}` : s.id === "collect" ? `Collect the x terms: ${s.value}` : `Solve and rename y as x: f⁻¹(x) = ${s.value}`),
    domain: [[-5, 5], [-6, 6], [0, 3], [-6, 6]],
    keep: ([a, b, c, d]) => (c === 0 ? d === 1 && a !== 0 : a * d - b * c !== 0),
    cap: 400,
    difficulty: ([a, , c]) => (c === 0 && a > 0 ? 1 : c === 0 ? 2 : 3),
    word: ([a, b, c, d]) => `A shop's billing app hides each price x by turning it into a code number y = f(x) = ${c === 0 ? polyS([a, b]) : fracS(a, b, c, d)}. The manager needs the formula that turns a code number back into the price. Find f⁻¹(x).`,
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
          st("multiply", "multiply", LIN, [t], `${polyS([a, b])} = ${polyS([c, d]) === "x" ? polyS([t, 0]) : `${n_(t)}(${polyS([c, d])})`}`),
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
        ...(wrong === best ? [] : [B("infeasible-corner", "conceptual", LP, "An axis intercept that breaks the other constraint was used as a corner; every corner must satisfy ALL the constraints.", wrong)]),
        ...(zv === best ? [] : [B("intersection-only", "procedural", LP, "Only the point where the two lines meet was checked; Z must be worked out at every corner of the feasible region.", zv)]),
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
      // the lathe-time constraint is written in minutes (both sides × 10: the same feasible region)
      return `A carpenter makes x chairs and y tables a day. A chair needs ${pl(p[2], "unit", "units")} of wood and ${10 * p[4]} minutes on the lathe; a table needs ${pl(p[3], "unit", "units")} of wood and ${10 * p[5]} minutes on the lathe. Each day there are ${L.c1} units of wood and ${10 * L.c2} minutes of lathe time. The profit is ₹${p[6]}00 on a chair and ₹${p[7]}00 on a table. Using the corner-point method, find the greatest daily profit, in hundreds of rupees.`;
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
        ...(wrong === best ? [] : [B("infeasible-corner", "conceptual", LP, "An axis intercept that breaks the other constraint was used; every corner must satisfy ALL the constraints.", wrong)]),
        ...(zv === best ? [] : [B("intersection-only", "procedural", LP, "Only the point where the two lines meet was checked; Z must be worked out at every corner.", zv)]),
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
      return `A dietician mixes x kg of food F and y kg of food G. One kg of F gives ${pl(p[2], "unit", "units")} of vitamin A and ${pl(p[4], "unit", "units")} of vitamin C; one kg of G gives ${pl(p[3], "unit", "units")} of vitamin A and ${pl(p[5], "unit", "units")} of vitamin C. The mixture must give at least ${L.c1} units of vitamin A and at least ${L.c2} units of vitamin C. F costs ₹${p[6]}0 a kg and G costs ₹${p[7]}0 a kg. Using the corner-point method, find the least cost of the mixture, in tens of rupees.`;
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
        ...(bad ? [B("infeasible-corner", "conceptual", LP, "An axis intercept that breaks the other constraint was chosen; check every corner in ALL the constraints.", `(${bad.join(", ")})`)] : []),
        ...(Z(p[6], p[7], [p[0], p[1]]) === best ? [] : [B("intersection-only", "procedural", LP, "The meeting point of the two lines was chosen without comparing Z at the other corners.", `(${p[0]}, ${p[1]})`)]),
      ];
    },
    distractors: (p) => lpCorners(p, false).filter((c) => c[0] || c[1]).map((c) => `(${c.join(", ")})`),
    variants: () => [],
    explain: (s) => (s.id === "corners" ? `The corner points are ${s.value}` : `Z at the corners: ${s.inputs.join(", ")}; the maximum is at ${s.value}`),
    domain: [[1, 6], [1, 6], [1, 5], [1, 5], [1, 5], [1, 5], [1, 9], [1, 9]],
    keep: lpKeep,
    cap: 400,
    // harder when the best corner is not the meeting point (X, Y) of the two lines
    difficulty: (p) => (Z(p[6], p[7], [p[0], p[1]]) === Math.max(...lpCorners(p, false).map((c) => Z(p[6], p[7], c))) ? 2 : 3),
    word: (p) => {
      const L = lpOf(p)!;
      return `A small factory makes x boxes of sweets of type P and y boxes of type Q a day. A box of P needs ${p[2]} kg of sugar and ${10 * p[4]} minutes of packing; a box of Q needs ${p[3]} kg of sugar and ${10 * p[5]} minutes of packing. Each day there are ${L.c1} kg of sugar and ${10 * L.c2} minutes of packing time. The profit is ₹${p[6]}0 on a box of P and ₹${p[7]}0 on a box of Q. How many boxes of each type give the greatest profit? Write the answer as (P boxes, Q boxes).`;
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
    prompt: (p) => `A = ${matN(m2(p))} and B = ${matN(m2(p, 4))}. Find AB, written as [[a, b], [c, d]].`,
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
    prompt: (p) => `A = ${matN(m2(p, 6))} and B = ${matN(mlinB(p))}. Find the matrix X such that ${p[0]}X ${p[1] ? "−" : "+"} A = B, written as [[a, b], [c, d]].`,
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
    prompt: (p) => `Q = ${matN([p.slice(0, 3), p.slice(3, 6)])} (order 2 × 3) and P = ${matN(costP(p))} (order 3 × 1). Find QP, written as a column [[a], [b]].`,
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
      const rev = [0, 3].map((o) => p[o] * pr[2] + p[o + 1] * pr[1] + p[o + 2] * pr[0]);
      return [
        B("item-left-out", "procedural", MAT, "The third item was left out; a row of 3 quantities times a column of 3 prices has 3 products to add.", matN([[p[0] * pr[0] + p[1] * pr[1]], [p[3] * pr[0] + p[4] * pr[1]]])),
        B("not-added", "procedural", MAT, "Each quantity was multiplied by its price, but the three products in a row were not added; QP has one entry per row of Q, the sum of those products.", matN([0, 3].map((o) => [0, 1, 2].map((j) => p[o + j] * pr[j])))),
        // the column of prices read from the bottom up: the first quantity is paired with the last price
        ...(rev[0] === T[0] && rev[1] === T[1] ? [] : [B("prices-reversed", "procedural", MAT, "The prices were paired with the quantities in the wrong order (the column read from the bottom up); the first entry of a row goes with the first entry of the column.", matN(rev.map((t) => [t])))]),
        ...(T[0] === T[1] ? [] : [B("rows-swapped", "procedural", MAT, "The two rows were written in the wrong order; row 1 of QP comes from row 1 of Q.", matN([[T[1]], [T[0]]]))]),
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
      return `Two shops sold rice, dal and sugar in one day. Anbu Stores sold ${p[0]} kg of rice, ${p[1]} kg of dal and ${p[2]} kg of sugar; Kaveri Traders sold ${p[3]} kg, ${p[4]} kg and ${p[5]} kg. Rice costs ₹${pr[0]}, dal ₹${pr[1]} and sugar ₹${pr[2]} a kg. Multiply the quantity matrix (one row per shop) by the price matrix (one column) to write the takings, in rupees, as a column matrix [[a], [b]] (Anbu Stores first).`;
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
    distractors: (p) => [tup([p[10], p[9], p[11]].map((x) => rr(x))), tup([p[9], p[11], p[10]].map((x) => rr(x))), tup([p[9] + 1, p[10], p[11]].map((x) => rr(x))), tup([p[9], p[10] - 1, p[11]].map((x) => rr(x)))],
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
        ...(x === y ? [] : [B("swapped", "procedural", MSYS, "x and y were written the wrong way round; X = [[x], [y]], so the first entry of A⁻¹B is x.", `(${y}, ${x})`)]),
        ...(Math.abs(D) === 1 ? [] : [B("not-divided", "procedural", MSYS, "adj A · B was not divided by |A|; A⁻¹ = adj A / |A|.", tup([rr(D * x), rr(D * y)]))]),
      ];
    },
    distractors: ([, , , , x, y]) => [`(${x + 1}, ${y})`, `(${x}, ${y + 1})`],
    variants: () => [],
    explain: (s) => (s.id === "det" ? `|A| = ${n_(Number(s.value))}` : s.id === "inverse" ? `A⁻¹ = ${s.value}` : `X = A⁻¹B = ${s.value}`),
    domain: [[1, 6], [1, 6], [1, 6], [1, 6], [1, 12], [1, 12]],
    keep: ([a, b, c, d]) => a * d - b * c !== 0,
    cap: 400,
    difficulty: ([a, b, c, d]) => (Math.abs(a * d - b * c) === 1 ? 1 : Math.abs(a * d - b * c) <= 6 ? 2 : 3),
    word: ([a, b, c, d, x, y]) => `${name(a + d)} buys ${pl(a, "pen", "pens")} and ${pl(b, "notebook", "notebooks")} for ₹${a * x + b * y}. ${name(a + d + 3)} buys ${pl(c, "pen", "pens")} and ${pl(d, "notebook", "notebooks")} for ₹${c * x + d * y}. Write these as a matrix equation and use the inverse matrix to find the price of one pen and of one notebook, in rupees. Write the answer as (pen, notebook).`,
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
    explain: (s) => (s.id === "middle" ? `The middle root is ${n_(Number(s.inputs[0]))} ÷ ${n_(Number(s.inputs[1]))} = ${n_(Number(s.value))}` : s.id === "factor" ? `Dividing by (x ${Number(s.inputs[0]) < 0 ? "+" : "−"} ${Math.abs(Number(s.inputs[0]))}) leaves ${s.value}` : `The roots are ${(s.value as number[]).map(n_).join(", ")}`),
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
    reject: ([x, a, b]) => (x < 1 || x > 40 || a < 1 || a > 6 || b <= a || b > 9 ? "Edges x, x + a, x + b with x up to 40." : null),
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
      const lin = V / (a * b);
      return [
        ...(c === x ? [] : [B("cube-root", "conceptual", PES, `The equation was treated as x³ = ${V}, leaving out the terms in x² and x; for x > 0 those terms are positive, so the root is less than ∛${V} ≈ ${c}.`, c)]),
        ...(Number.isInteger(lin) && lin !== x ? [B("linear-only", "procedural", PES, `Only the x term was kept: ${a * b}x = ${V} gives ${lin}, but x³ and ${a + b}x² also add to the left side, so the root is much smaller.`, lin)] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "signs" ? "The signs + + + − change once, so there is exactly one positive root (Descartes)" : s.id === "divisors" ? `A whole-number root divides ${s.inputs[0]}` : `x = ${s.inputs[0]} makes the polynomial 0`),
    distractors: ([x]) => [x - 1, x + 1, x - 2, x + 2],
    // a positive root: 0 and negative numbers are not offered
    range: [1, Infinity],
    domain: [[1, 40], [1, 6], [2, 9]],
    keep: ([, a, b]) => b > a,
    cap: 360,
    difficulty: ([x]) => (x <= 6 ? 1 : x <= 20 ? 2 : 3),
    word: ([x, a, b]) => `A closed box is a cuboid. Its width is ${a} cm more than its height x, and its length is ${b} cm more than its height. Its volume is ${x * (x + a) * (x + b)} cm³. Form a cubic equation in x and solve it to find the height x, in cm.`,
    teach: {
      idea: "x(x + a)(x + b) = V expands to a cubic with one sign change, so it has exactly one positive root; a whole-number root divides the constant term V.",
      method: "Estimate: x is a little less than ∛V. Test the divisors of V near that estimate until one gives V.",
      alternatives: [
        { id: "table", title: "A trial table", kind: "procedural", text: ["Make a table of x and x(x + a)(x + b) for x = 1, 2, 3, …", "The volume grows as x grows, so stop when you reach V."] },
      ],
    },
    limits: "Cuboids with whole-number edges up to 49 cm; dimensions found from area conditions are similar and not separately included.",
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
        ...(u === 0
          ? []
          : [
              B("both-signs-changed", "conceptual", PRA, `Both parts of the root changed sign; the conjugate of ${surdPlus(u, 1, w)} changes only the sign of the surd: ${surdPlus(u, -1, w)}.`, `${surdPlus(-u, -1, w)}, ${n_(r)}`),
              B("rational-part-changed", "conceptual", PRA, "The sign of the whole-number part was changed; it is the surd part whose sign changes.", `${surdPlus(-u, 1, w)}, ${n_(r)}`),
            ]),
        ...(r === -2 * u ? [] : [B("sum-sign", "recall", VIETA, "The sum of the roots was taken as +(coefficient of x²); it is −(coefficient of x²).", `${surdPlus(u, -1, w)}, ${n_(-r - 4 * u)}`)]),
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
    // [s, mode]: a quintic whose sign pattern is coded by s (see descPoly); mode 0 positive roots, 1 negative roots, 2 the least number of non-real roots
    reject: ([s, mode]) => (s < 0 || s > 161 || mode < 0 || mode > 2 || !Number.isInteger(mode) ? "Quintics with a non-zero constant term." : null),
    prompt: ([s, mode]) => (mode === 2 ? `Use Descartes' rule of signs to find the least possible number of non-real (complex) roots of ${polyS(descPoly(s))} = 0.` : `Use Descartes' rule of signs to find the greatest possible number of ${mode ? "negative" : "positive"} real roots of ${polyS(descPoly(s))} = 0.`),
    solve: ([s, mode]) => {
      const cs = descPoly(s);
      if (mode === 2) {
        const neg = cs.map((c, i) => ((5 - i) % 2 ? -c : c));
        const pc = changes(cs);
        const nc = changes(neg);
        return { steps: [st("signs", "count", PRA, [cs.filter((c) => c).map((c) => (c > 0 ? "+" : "−")).join(" ")], pc), st("substitute", "substitute", PRA, ["−x"], polyS(neg)), st("signs-neg", "count", PRA, [neg.filter((c) => c).map((c) => (c > 0 ? "+" : "−")).join(" ")], nc), st("nonreal", "subtract", PRA, [5, pc, nc], 5 - pc - nc)], answer: 5 - pc - nc };
      }
      const use = mode ? cs.map((c, i) => ((5 - i) % 2 ? -c : c)) : cs;
      const ch = changes(use);
      return { steps: [...(mode ? [st("substitute", "substitute", PRA, ["−x"], polyS(use))] : []), st("signs", "count", PRA, [use.filter((c) => c).map((c) => (c > 0 ? "+" : "−")).join(" ")], ch)], answer: ch };
    },
    // independent: a sign string, scanned with a pattern for each change
    validate: ([s, mode], v) => {
      const cs = descPoly(s);
      if (mode === 2) {
        const count = (m: number) => (cs.map((c, i) => (m && (5 - i) % 2 ? -c : c)).map((c) => (c > 0 ? "+" : c < 0 ? "-" : "")).join("").match(/(?=(\+-|-\+))/g) ?? []).length;
        // 0 is not a root (constant term ≠ 0), so at most count(0) + count(1) of the 5 roots are real
        return v === 5 - count(0) - count(1);
      }
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
      if (mode === 2) {
        const pc = changes(cs);
        const nc = changes(cs.map((c, i) => ((5 - i) % 2 ? -c : c)));
        const ans = 5 - pc - nc;
        return [
          B("real-count-given", "conceptual", PRA, `The greatest possible number of real roots (${pc} + ${nc} = ${pc + nc}) was given; the question asks how many roots at least are NOT real: 5 − ${pc + nc}.`, pc + nc),
          B("positive-only", "procedural", PRA, "Only the positive roots were taken away from 5; the negative roots (sign changes of p(−x)) are real too.", 5 - pc),
          B("zeros-as-changes", "procedural", PRA, "Missing terms were counted as sign changes; skip the zero coefficients.", Math.max(0, 5 - zeroCount - nc)),
        ].filter((b) => b.predict !== ans);
      }
      return [
        ...(mode ? [B("p-not-p-of-minus-x", "procedural", PRA, "The sign changes of p(x) were counted; negative roots need p(−x), where the odd powers change sign.", changes(cs))] : []),
        B("zeros-as-changes", "procedural", PRA, "Missing terms (zero coefficients) were counted as sign changes; skip the zero coefficients and compare the non-zero ones.", zeroCount),
        B("negatives-counted", "conceptual", PRA, "The number of negative coefficients was counted; the rule counts the CHANGES of sign from one non-zero coefficient to the next.", use.filter((c) => c < 0).length),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "substitute" ? `p(−x) = ${s.value}` : s.id === "nonreal" ? `At most ${s.inputs[1]} positive and ${s.inputs[2]} negative roots, and 0 is not a root, so at least 5 − ${s.inputs[1]} − ${s.inputs[2]} = ${s.value} roots are not real` : `Signs: ${s.inputs[0]}, so ${s.value} change${s.value === 1 ? "" : "s"}`),
    // a quintic has at most 5 sign changes
    range: [0, 5],
    domain: [[0, 161], [0, 2]],
    difficulty: ([s, mode]) => (mode ? 3 : descPoly(s).includes(0) ? 2 : 1),
    word: ([s, mode]) => `An engineer models the bending of a long beam by p(x) = ${polyS(descPoly(s))}, where x is the distance in metres from a support (positive to the east, negative to the west); the beam is level where p(x) = 0. Without solving, use Descartes' rule of signs to find ${mode === 2 ? "the least possible number of the five roots of p(x) = 0 that are not real numbers (and so give no level point)" : `the greatest possible number of level points to the ${mode ? "west (negative x)" : "east (positive x)"}`}.`,
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
      return { steps: [st("vieta", "recall", VIETA, [p, q], `α + β = ${n_(-p)}, αβ = ${n_(q)}`), st("sum", "evaluate", VIETA, [t], sum), st("product", "evaluate", VIETA, [t], c), st("form", "write", VIETA, [sum, c], polyS([1, b, c]))], answer: polyS([1, b, c]) };
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
        ? [B("wrong-direction", "procedural", VIETA, `The shift went the wrong way: if y = α ${k < 0 ? "−" : "+"} ${Math.abs(k)}, the new sum is (α + β) ${k < 0 ? "−" : "+"} ${2 * Math.abs(k)}.`, polyS([1, p + 2 * k, k * k + p * k + q]))]
        : t === 1
          ? [
              B("k-not-squared", "procedural", VIETA, `The product was multiplied by ${n_(k)}; (${n_(k)}α)(${n_(k)}β) = ${k * k}αβ.`, polyS([1, k * p, k * q])),
              B("sum-sign", "recall", VIETA, "The x coefficient was written as +(sum of roots); it is −(sum of roots).", polyS([1, -k * p, k * k * q])),
            ]
          : [
              B("identity-sign", "procedural", IDEN, "α² + β² was taken as (α + β)² + 2αβ; it is (α + β)² − 2αβ.", polyS([1, -(p * p + 2 * q), q * q])),
              B("product-not-squared", "procedural", VIETA, "The product α²β² was taken as αβ; it is (αβ)².", polyS([1, -(p * p - 2 * q), q])),
            ],
    distractors: ([p, q, t, k]) => {
      const [b, c] = vform(p, q, t, k);
      return [polyS([1, -b, c]), polyS([1, b, -c]), polyS([1, b, c + 1]), polyS([1, b + 1, c])];
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
    word: ([a, b, c, d]) => `Two friends send secret messages: each pair of letter numbers is written as a column and multiplied by A = ${matN([[a, b], [c, d]])}. To read the messages, the receiver must multiply by A⁻¹. Find A⁻¹. (Fractions are fine as entries.)`,
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
    prompt: (p) => `A = ${matN(m3(p))}. Find adj A, written as [[a, b, c], [d, e, f], [g, h, i]].`,
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
    // the ranks a non-zero 3 × 4 matrix can have; 4 is offered only as the column-count mistake (for a rank-3 matrix)
    distractors: () => [1, 2, 3],
    range: ([r]) => (r === 3 ? [1, 4] : [1, 3]),
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
  if (v === 2) return `A = ${A} and B = ${Bs}. How many elements does (A × B) ∪ (B × A) have?`;
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
  return `${/ [+−] /.test(top) ? `(${top})` : top}/${wrapBot(bot)}`;
}
/** A denominator: a lone variable is not bracketed. */
function wrapBot(t: string) {
  return /^[a-z]$/.test(t) ? t : `(${t})`;
}
function linInv(a: number, b: number) {
  // (x − b)/a written plainly
  if (a === 1) return polyS([1, -b]);
  if (a === -1) return polyS([-1, b]);
  if (b === 0) return `${a < 0 ? "−" : ""}x/${Math.abs(a)}`;
  return a > 0 ? `(${polyS([1, -b])})/${a}` : `(${polyS([-1, b])})/${-a}`;
}
function invS(a: number, b: number, c: number, d: number) {
  if (c === 0) return linInv(a, b);
  return `${wrapTop(polyS([-d, b]))}/${wrapBot(polyS([c, -a]))}`;
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

// gap@1 additions, registered with the batch
const NEW16: Def[] = [
  // ================================================================ gap@1: listing products, ordered pairs, constructing and classifying matrices
  {
    id: "apcartl",
    arity: 4,
    title: "Writing out the ordered pairs (or triples) of a Cartesian product",
    competency: CART,
    type: "choice",
    parse: none,
    // [k, m, n, s]: A = {s, …, s + m − 1}, B = {p, q, r} (n letters); k 0 A × B, 1 A × A, 2 B × A, 3 A × B × C with C = {10, 20} (n = 2) or {10}
    reject: (p) => (cl16Ok(p) ? null : "Small sets: A × B, A × A, B × A, or A × B × C."),
    prompt: (p) => {
      const { A, B: Bs, C } = clSets(p);
      const what = ["A × B", "A × A", "B × A", "A × B × C"][p[0]];
      return `A = ${setS(A)}${p[0] === 1 ? "" : ` and B = ${setS(Bs)}`}${p[0] === 3 ? `, C = ${setS(C)}` : ""}. Which set is ${what}?`;
    },
    choices: cl16Choices,
    solve: (p) => {
      const right = setS(cl16Lists(p)[0].list.map(tupS));
      return { steps: [st("pairs", "list", CART, [["A × B", "A × A", "B × A", "A × B × C"][p[0]]], right), st("pick", "compare", CART, [right], cl16Choices(p).indexOf(right))], answer: cl16Choices(p).indexOf(right) };
    },
    // independent: read the option back and check it has exactly the tuples (x, y[, z]) with x, y, z from the right sets
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const opt = cl16Choices(p)[v];
      if (!opt) return false;
      const { A, B: Bs, C } = clSets(p);
      const sets = [[A, Bs], [A, A], [Bs, A], [A, Bs, C]][p[0]];
      const tuples = [...opt.matchAll(/\(([^()]*)\)/g)].map((m) => m[1].split(", "));
      const keys = new Set(tuples.map((t) => t.join("|")));
      const want = sets.reduce((n, S) => n * S.length, 1);
      return keys.size === tuples.length && tuples.length === want && tuples.every((t) => t.length === sets.length && t.every((x, i) => sets[i].includes(x)));
    },
    bugs: (p) => {
      const ch = cl16Choices(p);
      const out: Bug[] = [];
      for (const o of cl16Lists(p)) {
        const i = ch.indexOf(setS(o.list.map(tupS)));
        if (o.why === "order") out.push(B("order-swapped", "conceptual", CART, `The entries were written the wrong way round; in ${["A × B", "A × A", "B × A", "A × B × C"][p[0]]} the first entry comes from the first set named.`, i));
        if (o.why === "zip") out.push(B("matched-only", "conceptual", CART, "Only the first element was paired with the first, the second with the second; a Cartesian product pairs EVERY element of the first set with EVERY element of the second.", i));
        if (o.why === "half") out.push(B("pair-once", "conceptual", CART, "Each pair of different elements was written only once; (a, b) and (b, a) are different ordered pairs, and both belong to A × A.", i));
        if (o.why === "diagonal") out.push(B("same-left-out", "conceptual", CART, "Pairs like (a, a) were left out; A × A contains every ordered pair from A, including pairs with equal entries.", i));
        if (o.why === "missing") out.push(B("pair-missed", "procedural", CART, `One ${p[0] === 3 ? "triple" : "pair"} was missed; there must be ${o.list.length + 1} of them (the product of the numbers of elements).`, i));
        if (o.why === "pairs") out.push(B("third-set-ignored", "conceptual", CART, "Only A × B was written; A × B × C is made of ordered TRIPLES (a, b, c).", i));
      }
      return out.filter((b) => b.predict !== -1);
    },
    variants: () => [],
    explain: (s) => (s.id === "pairs" ? `Go through the first set and pair each element with every element of the next: ${s.value}` : `So the answer is ${s.inputs[0]}`),
    domain: D_CL16,
    keep: cl16Ok,
    difficulty: ([k]) => (k === 0 ? 1 : k === 3 ? 3 : 2),
    word: (p) => {
      const { A, B: Bs, C } = clSets(p);
      if (Math.min(...A.map((a) => Number(a.replace("−", "-")))) < 1) {
        // zero or negative numbers: the positions on a number track of a board game, not table numbers
        const wh = ["(position, player)", "(position, position)", "(player, position)", "(position, player, bonus)"][p[0]];
        return `In a board game, the squares of a number track are numbered A = ${setS(A)} (squares behind the start have zero or negative numbers)${p[0] === 1 ? "" : `, the players are called B = ${setS(Bs)}`}${p[0] === 3 ? ` and the bonus cards are numbered C = ${setS(C)}` : ""}. The game lists every possible ${wh}${p[0] === 1 ? " pair (for a move from one square to another, including staying put)" : ""}. Which set is this list, the Cartesian product ${["A × B", "A × A", "B × A", "A × B × C"][p[0]]}?`;
      }
      const what = ["(table number, waiter)", "(table number, table number)", "(waiter, table number)", "(table number, waiter, menu number)"][p[0]];
      return `At a restaurant in Tirunelveli the tables are numbered A = ${setS(A)}${p[0] === 1 ? "" : `, the waiters are called B = ${setS(Bs)}`}${p[0] === 3 ? ` and the menus are numbered C = ${setS(C)}` : ""}. The manager lists every possible ${what}${p[0] === 1 ? " pair (for moving a group from one table to another, including staying put)" : ""}. Which set is this list, the Cartesian product ${["A × B", "A × A", "B × A", "A × B × C"][p[0]]}?`;
    },
    teach: {
      idea: "A × B is the set of all ordered pairs (a, b) with a ∈ A and b ∈ B; A × B × C is the set of all ordered triples (a, b, c). Order matters: (1, p) is not (p, 1).",
      method: "Take the first element of the first set and pair it with every element of the second set; then the next element; and so on. Check the count: n(A) × n(B) (× n(C)).",
      alternatives: [
        { id: "grid", title: "A table of pairs", kind: "procedural", text: ["Write the first set down the side and the second across the top.", "Each cell is one ordered pair; read them row by row."] },
        { id: "tree", title: "A tree for triples", kind: "conceptual", text: ["Branch for each element of A, then for each element of B, then of C.", "Each path from the root gives one ordered triple."] },
      ],
    },
    limits: "Sets of up to three elements; the number of pairs is counted in apcartn.",
  },
  {
    id: "apcarteq",
    arity: 4,
    title: "Equal ordered pairs",
    competency: CART,
    type: "tuple",
    mc: true,
    parse: none,
    // [f, x, y, s]: f 0 (x/k + u, y + w/k) = (…, …); 1 (x + y, x − y) = (…); 2 (2x + y, x − 3y) = (…)
    reject: (p) => (ceqOk(p) ? null : "Pairs with whole-number solutions x, y from −6 to 6."),
    prompt: ceqText,
    solve: ([f, x, y, s]) => ({
      steps: [st("equate", "compare", CART, ["first entries", "second entries"], f === 0 ? "two equations, one in each unknown" : "two simultaneous equations"), st("solve", "solve", f === 0 ? LIN : "MATH.algebra.linear-systems", [f, s], `(${n_(x)}, ${n_(y)})`)],
      answer: `(${n_(x)}, ${n_(y)})`,
    }),
    // independent: substitute the answer into both entries
    validate: ([f, x, y, s], v) => {
      const l = typeof v === "string" ? readList(v) : null;
      if (!l || l.length !== 2) return false;
      const [X, Y] = l;
      if (f === 0) return req(radd(rdiv(X, rr(ceqK(s))), rr(ceqU(s))), rr(x + ceqU(s) * ceqK(s), ceqK(s))) && req(radd(Y, rr(ceqW(s), ceqK(s))), rr(y * ceqK(s) + ceqW(s), ceqK(s)));
      if (f === 1) return req(radd(X, Y), rr(x + y)) && req(rsub(X, Y), rr(x - y));
      return req(radd(rmul(rr(2), X), Y), rr(2 * x + y)) && req(rsub(X, rmul(rr(3), Y)), rr(x - 3 * y));
    },
    bugs: ([f, x, y, s]) => {
      const ans = `(${n_(x)}, ${n_(y)})`;
      const out: Bug[] = [];
      if (f === 0) {
        const k = ceqK(s);
        const u = ceqU(s);
        out.push(B("not-multiplied", "procedural", LIN, `x/${k} = ${rs(rr(x, k))} was found, but not multiplied by ${k} to get x.`, tup([rr(x, k), rr(y)])));
        out.push(B("entries-swapped", "conceptual", CART, "The first entry was matched with the second; equal ordered pairs have equal FIRST entries and equal SECOND entries.", null));
        out.push(B("sign-of-u", "procedural", LIN, `${u} was moved across without changing its sign.`, tup([rr(x + 2 * u * k), rr(y)])));
      } else {
        if (x !== y) out.push(B("swapped", "procedural", CART, "x and y were written the wrong way round; the answer is (x, y).", `(${n_(y)}, ${n_(x)})`));
        if (f === 1 && y !== 0) out.push(B("half-forgotten", "procedural", LIN, "Adding the equations gives 2x; it must be divided by 2.", `(${n_(2 * x)}, ${n_(y)})`));
        if (f === 2) out.push(B("sign", "procedural", LIN, "A sign was lost when one equation was subtracted from the other; check by substituting.", `(${n_(x)}, ${n_(-y)})`));
      }
      return out.filter((b) => b.predict !== null && b.predict !== ans);
    },
    distractors: ([, x, y]) => [`(${n_(x + 1)}, ${n_(y)})`, `(${n_(x)}, ${n_(y - 1)})`],
    variants: () => [],
    explain: (s) => (s.id === "equate" ? `Equal ordered pairs: equate the ${s.inputs[0]} and the ${s.inputs[1]}: ${s.value}` : `Solving gives (x, y) = ${s.value}`),
    domain: D_CEQ,
    keep: ceqOk,
    difficulty: ([f]) => (f === 0 ? 2 : f === 1 ? 1 : 3),
    teach: {
      idea: "(a, b) = (c, d) exactly when a = c AND b = d: the order of the entries matters, so each position is compared on its own.",
      method: "Write first entry = first entry and second entry = second entry, then solve the two equations (together, if both contain x and y).",
      alternatives: [{ id: "check", title: "Check by substituting", kind: "procedural", text: ["Put your x and y back into both entries of the left-hand pair.", "You must get exactly the right-hand pair, in the same order."] }],
    },
    limits: "Pairs with whole-number solutions; equality of triples is handled in the matrix-equality family.",
  },
  {
    id: "apmcon",
    arity: 4,
    title: "Constructing a matrix from a rule aᵢⱼ (and its transpose)",
    competency: MAT,
    type: "matrix",
    mc: true,
    parse: none,
    // [m, n, t, T]: an m × n matrix with aᵢⱼ = MRULES[t]; T = 1 asks for Aᵀ
    reject: (p) => (mconOk(p) ? null : "Orders up to 3 × 3 with one of ten rules."),
    prompt: ([m, n, t, T]) => `Construct the ${m} × ${n} matrix A = [aᵢⱼ] whose elements are given by aᵢⱼ = ${MRULES[t].text}${T ? ", and write its transpose Aᵀ" : ""}. Write ${T ? "Aᵀ" : "A"} as [[…], […]], row by row. (Fractions are fine as entries.)`,
    solve: (p) => {
      const A = mconA(p);
      return { steps: [st("entries", "evaluate", MAT, [MRULES[p[2]].text], matS(A)), ...(p[3] ? [st("transpose", "transpose", "MATH.matrices.transpose-symmetry", ["Aᵀ"], matS(mT(A)))] : [])], answer: matS(p[3] ? mT(A) : A) };
    },
    // independent: read the rule as an expression and evaluate it for each (i, j) with the expression evaluator
    validate: ([m, n, t, T], v) => {
      const X = typeof v === "string" ? readMat(v) : null;
      if (!X) return false;
      const rows = T ? n : m;
      const cols = T ? m : n;
      if (X.length !== rows || X[0].length !== cols) return false;
      const e = parse(MRULE_TYPED[t]);
      return X.every((r, a) => r.every((x, b) => near(rv(x), evaluate(e, T ? { i: b + 1, j: a + 1 } : { i: a + 1, j: b + 1 }), 1e-12)));
    },
    bugs: (p) => {
      const [m, n, t, T] = p;
      const A = mconA(p);
      const want = matS(T ? mT(A) : A);
      const swapped = Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => MRULES[t].f(j + 1, i + 1)));
      const zero = t === 9 ? null : Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => MRULES[t].f(i, j)));
      const out: Bug[] = [
        B("i-j-swapped", "conceptual", MAT, "i and j were swapped: i is the ROW number and j the COLUMN number, so a₁₂ is in row 1, column 2.", matS(T ? mT(swapped) : swapped)),
        ...(zero ? [B("from-zero", "procedural", MAT, "The rows and columns were numbered from 0; they start from 1, so the top-left entry is a₁₁.", matS(T ? mT(zero) : zero))] : []),
      ];
      if (T) out.push(B("not-transposed", "procedural", "MATH.matrices.transpose-symmetry", "A was given; the transpose Aᵀ turns each row of A into a column.", matS(A)));
      return out.filter((b) => b.predict !== want && (typeof b.predict !== "string" || readMat(b.predict)?.length === (T ? n : m)) || b.id === "not-transposed").filter((b) => b.predict !== want);
    },
    distractors: (p) => {
      const A = mconA(p);
      const X = p[3] ? mT(A) : A;
      return [matS(X.map((r) => r.map((x) => radd(x, rr(1))))), matS(X.map((r) => r.map((x) => rmul(x, rr(-1)))))];
    },
    variants: () => [],
    explain: (s) => (s.id === "entries" ? `Put i = row number and j = column number into aᵢⱼ = ${s.inputs[0]}: A = ${s.value}` : `Rows become columns: Aᵀ = ${s.value}`),
    domain: D_MCON,
    keep: mconOk,
    difficulty: ([m, n, t, T]) => (m * n <= 4 && t <= 3 && !T ? 1 : t >= 4 || T ? 3 : 2),
    teach: {
      idea: "A = [aᵢⱼ] of order m × n has m rows and n columns; aᵢⱼ is the entry in row i and column j. The transpose Aᵀ has the rows of A as its columns, so it has order n × m.",
      method: "Draw an empty m × n grid. For each cell put in its row number i and column number j and work out the rule. For Aᵀ, write the first row of A as the first column, and so on.",
      alternatives: [{ id: "label", title: "Label the cells", kind: "procedural", text: ["Write the label ij in each cell first (11, 12, 13 / 21, 22, 23).", "Then replace each label by the value of the rule."] }],
    },
    limits: "Orders up to 3 × 3 with simple rules; the transpose of a product is in the transpose family.",
  },
  {
    id: "apmtype",
    arity: 3,
    title: "The order and the type of a matrix",
    competency: MAT,
    type: "choice",
    parse: none,
    // [q, t, seed]: q 0 the order (MORD[t]); q 1 the type MTYPE[t]
    reject: (p) => (mtyOk(p) ? null : "Matrices up to 4 × 4 of each type."),
    prompt: (p) => `A = ${matN(mtyMatrix(p))}. ${p[0] === 0 ? "What is the order of A?" : "Which description of A is the most precise true one?"}`,
    choices: mtyOpts,
    solve: (p) => {
      const A = mtyMatrix(p);
      const lab = p[0] === 0 ? ordS(A.length, A[0].length) : MTYPE[p[1]];
      return { steps: [st("look", "count", MAT, [A.length, A[0].length], lab), st("pick", "compare", MAT, [lab], mtyOpts(p).indexOf(lab))], answer: mtyOpts(p).indexOf(lab) };
    },
    // independent: count rows and columns and inspect the entries
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const A = mtyMatrix(p);
      return mtyOpts(p)[v] === (p[0] === 0 ? ordS(A.length, A[0].length) : MTYPE[mtyRead(A)]);
    },
    bugs: (p) => {
      const ch = mtyOpts(p);
      const A = mtyMatrix(p);
      const out: Bug[] = [];
      if (p[0] === 0) {
        out.push(B("columns-first", "recall", MAT, "The number of columns was given first; the order is (number of rows) × (number of columns).", ch.indexOf(ordS(A[0].length, A.length))));
        if (A.length !== 1) out.push(B("entries-counted", "conceptual", MAT, "The number of entries was used; the order gives the numbers of rows and of columns.", ch.indexOf(`order ${A.length * A[0].length} × 1`)));
      } else {
        const t = p[1];
        const say: Record<string, string> = {
          "0-1": "A single row was called a column matrix; a row matrix has one row, a column matrix one column.",
          "1-0": "A single column was called a row matrix; a column matrix has one column.",
          "2-3": "A square matrix with a non-zero entry off the diagonal was called diagonal; a diagonal matrix has zeros everywhere off the main diagonal.",
          "3-4": "A diagonal matrix with different diagonal entries was called scalar; a scalar matrix has all its diagonal entries equal.",
          "4-5": "A scalar matrix was called the identity; the identity has 1s on the diagonal.",
          "5-4": "The identity was described only as a scalar matrix 'not the identity'; it IS the identity (scalar with k = 1).",
          "6-5": "The zero matrix was called the identity; every entry of a zero matrix is 0.",
          "7-2": "A rectangular matrix was called square; a square matrix has as many rows as columns.",
        };
        for (const d of MTCONF[t]) {
          const tx = say[`${t}-${d}`];
          if (tx) out.push(B(`confused-${t}-${d}`, "conceptual", MAT, tx, ch.indexOf(MTYPE[d])));
        }
      }
      return out.filter((b) => b.predict !== -1);
    },
    variants: () => [],
    explain: (s) => (s.id === "look" ? `A has ${s.inputs[0]} row${Number(s.inputs[0]) === 1 ? "" : "s"} and ${s.inputs[1]} column${Number(s.inputs[1]) === 1 ? "" : "s"}: ${s.value}` : `So the answer is ${s.inputs[0]}`),
    domain: D_MTY,
    keep: mtyOk,
    difficulty: ([q, t]) => (q === 0 ? 1 : t <= 1 || t >= 5 ? 1 : t === 7 ? 2 : 3),
    teach: {
      idea: "The order of a matrix is rows × columns. A row matrix has one row, a column matrix one column, a square matrix as many rows as columns. A diagonal matrix is square with zeros off the main diagonal; a scalar matrix is diagonal with equal diagonal entries; the identity is scalar with 1s; a zero matrix has every entry 0.",
      method: "Count the rows, then the columns. Then check, from the most general to the most special: square? zeros off the diagonal? equal diagonal entries? are they 1? (or are all entries 0?)",
      alternatives: [{ id: "ladder", title: "A ladder of types", kind: "conceptual", text: ["square ⊃ diagonal ⊃ scalar ⊃ identity: each is a special case of the one before.", "The most precise description is the lowest rung the matrix reaches."] }],
    },
    limits: "Matrices up to 4 × 4; triangular, symmetric and skew-symmetric matrices are in the transpose family.",
  },
  {
    id: "apmeq",
    arity: 4,
    title: "Equality of matrices",
    competency: MAT,
    type: "tuple",
    mc: true,
    parse: none,
    // [f, x, y, z]: f 0 [[x + y, 3], [−1, x − y]]; f 1 [[2x − y, 5], [x + 2y, 0]]; f 2 [[x + 3, 2y], [z − 4, 7]]
    reject: (p) => (meqOk(p) ? null : "Whole-number unknowns from −6 to 6."),
    prompt: meqText,
    solve: ([f, x, y, z]) => {
      const ans = f === 2 ? `(${n_(x)}, ${n_(y)}, ${n_(z)})` : `(${n_(x)}, ${n_(y)})`;
      return { steps: [st("equate", "compare", MAT, ["corresponding entries"], f === 2 ? "three equations" : "two simultaneous equations"), st("solve", "solve", f === 2 ? LIN : "MATH.algebra.linear-systems", [f], ans)], answer: ans };
    },
    // independent: substitute into every entry
    validate: ([f, x, y, z], v) => {
      const l = typeof v === "string" ? readList(v) : null;
      if (!l) return false;
      if (f === 2) return l.length === 3 && req(radd(l[0], rr(3)), rr(x + 3)) && req(rmul(rr(2), l[1]), rr(2 * y)) && req(rsub(l[2], rr(4)), rr(z - 4));
      if (l.length !== 2) return false;
      const [X, Y] = l;
      return f === 0 ? req(radd(X, Y), rr(x + y)) && req(rsub(X, Y), rr(x - y)) : req(rsub(rmul(rr(2), X), Y), rr(2 * x - y)) && req(radd(X, rmul(rr(2), Y)), rr(x + 2 * y));
    },
    bugs: ([f, x, y, z]) => {
      const out: Bug[] = [];
      if (f === 2) {
        if (y !== 0) out.push(B("halving", "procedural", LIN, `2y = ${n_(2 * y)} was solved by subtracting 2; divide by 2.`, `(${n_(x)}, ${n_(2 * y - 2)}, ${n_(z)})`));
        out.push(B("sign", "procedural", LIN, "A number was moved across without changing its sign.", `(${n_(x + 6)}, ${n_(y)}, ${n_(z - 8)})`));
      } else {
        if (x !== y) out.push(B("swapped", "procedural", MAT, "x and y were written the wrong way round.", `(${n_(y)}, ${n_(x)})`));
        if (f === 0 && y !== 0) out.push(B("half-forgotten", "procedural", LIN, "Adding the two equations gives 2x; divide by 2.", `(${n_(2 * x)}, ${n_(y)})`));
      }
      out.push(B("entries-mismatched", "conceptual", MAT, "Entries in different positions were set equal; equal matrices have equal entries in the SAME position.", null));
      return out.filter((b) => b.predict !== null);
    },
    distractors: ([f, x, y, z]) => (f === 2 ? [`(${n_(x + 1)}, ${n_(y)}, ${n_(z)})`, `(${n_(x)}, ${n_(y)}, ${n_(z + 1)})`] : [`(${n_(x + 1)}, ${n_(y)})`, `(${n_(x)}, ${n_(y + 1)})`]),
    variants: () => [],
    explain: (s) => (s.id === "equate" ? `Equal matrices have equal ${s.inputs[0]}: ${s.value}` : `Solving: ${s.value}`),
    domain: D_MEQ,
    keep: meqOk,
    difficulty: ([f]) => (f === 2 ? 1 : f === 0 ? 2 : 3),
    teach: {
      idea: "Two matrices are equal when they have the same order and every pair of corresponding entries is equal.",
      method: "Set each entry on the left equal to the entry in the same position on the right, then solve the equations you get.",
      alternatives: [{ id: "check", title: "Check every entry", kind: "procedural", text: ["Put your values back into the left-hand matrix.", "Every entry must match the right-hand matrix, position by position."] }],
    },
    limits: "2 × 2 matrices with whole-number unknowns.",
  },
  {
    id: "apmmod",
    arity: 8,
    title: "Modelling a situation with a matrix product",
    competency: MAT,
    type: "matrix",
    mc: true,
    parse: none,
    // [q11 … q23, ctx, s]: production (2 × 3) times needs per item MMR[s] (3 × 2); ctx 0 workshops, 1 canteens
    reject: (p) => (mmodOk(p) ? null : "Daily quantities 1 to 6 for two producers and three items."),
    prompt: (p) => mmodText(p),
    solve: (p) => {
      const P = mmodP(p);
      return { steps: [st("model", "write", MAT, [matN(mmodQ(p)), matN(MMR[p[7]])], "(2 × 3)(3 × 2) gives a 2 × 2 matrix"), st("product", "multiply", MAT, ["rows × columns"], matS(P))], answer: matS(P) };
    },
    // independent: add up each total item by item (quantity × need), straight from the situation
    validate: (p, v) => {
      const X = typeof v === "string" ? readMat(v) : null;
      if (!X || X.length !== 2 || X[0].length !== 2) return false;
      const R = MMR[p[7]];
      for (let f = 0; f < 2; f++) for (let k = 0; k < 2; k++) {
        let tot = 0;
        for (let item = 0; item < 3; item++) tot += p[3 * f + item] * R[item][k];
        if (!req(X[f][k], rr(tot))) return false;
      }
      return true;
    },
    bugs: (p) => {
      const P = mmodP(p);
      const R = MMR[p[7]];
      const Q = mmodQ(p);
      const want = matS(P);
      return [
        B("columns-swapped", "procedural", MAT, "The two columns of the needs matrix were put the other way round, so the totals came out in the wrong order; follow the order the question asks for.", matS(P.map((r) => [r[1], r[0]]))),
        B("rows-swapped", "procedural", MAT, "The producers were put in the other order; row 1 of the product comes from row 1 of the production matrix.", matS([P[1], P[0]])),
        B("item-left-out", "procedural", MAT, "The third item was left out of each total; a row of 3 quantities times a column of 3 needs has 3 products to add.", matN(Q.map((r) => [0, 1].map((k) => r[0] * R[0][k] + r[1] * R[1][k])))),
      ].filter((b) => b.predict !== want);
    },
    distractors: (p) => [matS(mmodP(p).map((r) => r.map((x) => radd(x, rr(2)))))],
    variants: () => [],
    explain: (s) => (s.id === "model" ? `Production ${s.inputs[0]} times needs ${s.inputs[1]}: ${s.value}` : `Multiply ${s.inputs[0]}: ${s.value}`),
    domain: D_MMOD,
    keep: mmodOk,
    cap: 300,
    difficulty: (p) => (p.slice(0, 6).every((x) => x <= 3) ? 2 : 3),
    word: (p) => mmodText(p, true),
    teach: {
      idea: "When each of several producers makes several items, and each item needs fixed amounts of resources, the totals are a matrix product: (production matrix) × (needs per item matrix). The inner orders must match: (2 × 3)(3 × 2).",
      method: "Write one row per producer and one column per item for the production; one row per item and one column per resource for the needs. Multiply: each entry is a row of quantities times a column of needs, added up.",
      alternatives: [{ id: "bills", title: "Write each total as a sum", kind: "procedural", text: ["For producer P and resource 1: (number of item 1) × (need of item 1) + … for all three items.", "The four totals, arranged by producer and resource, are the product matrix."] }],
    },
    limits: "Two producers, three items and two resources with small numbers.",
  },
  // ================================================================ gap@1: systems in words, LP cases, approximations, transformations, codes, Gauss–Jordan
  {
    id: "apsysw",
    arity: 6,
    title: "Word problems with three unknowns, solved by the inverse, Cramer's rule or Gaussian elimination",
    competency: MSYS,
    type: "tuple",
    mc: true,
    parse: none,
    // [x, y, z, t, m, s]: the solution, the situation SYSCTX[t], the method METH[m], the coefficient matrix sysA(s)
    reject: (p) => (syswOk(p) ? null : "Three purchases, sales or mixtures with whole-number answers 1 to 12."),
    prompt: (p) => syswText(p),
    solve: (p) => {
      const [x, y, z, , m, s] = p;
      const A = sysA(s);
      const D = sarrus(A);
      const b = A.map((row) => row[0] * x + row[1] * y + row[2] * z);
      const ans = `(${x}, ${y}, ${z})`;
      const model = st("model", "write", MSYS, [matN(A), matN(b.map((v) => [v]))], `AX = B with A = ${matN(A)}, B = ${matN(b.map((v) => [v]))}`);
      if (m === 0) return { steps: [model, st("det", "evaluate", DET, [matN(A)], D), st("inverse", "invert", ADJ, ["adj A / |A|"], matN(mT(cofactors(A)))), st("solve", "multiply", MSYS, ["A⁻¹B"], ans)], answer: ans };
      if (m === 1) {
        const Ds = [0, 1, 2].map((c) => sarrus(A.map((row, i) => row.map((v, j) => (j === c ? b[i] : v)))));
        return { steps: [model, st("det", "evaluate", DET, [matN(A)], D), st("cramer", "evaluate", DET, Ds, Ds.join(", ")), st("solve", "divide", MSYS, ["Δᵢ/Δ"], ans)], answer: ans };
      }
      return { steps: [model, st("echelon", "row-reduce", RANK, ["[A | B]"], "upper triangular form"), st("solve", "back-substitute", MSYS, ["z, then y, then x"], ans)], answer: ans };
    },
    // independent: substitute the three values into the three situations
    validate: (p, v) => {
      const l = typeof v === "string" ? readList(v) : null;
      if (!l || l.length !== 3) return false;
      const A = sysA(p[5]);
      return A.every((row) => req(row.reduce((acc, c, j) => radd(acc, rmul(rr(c), l[j])), [0, 1] as R), rr(row[0] * p[0] + row[1] * p[1] + row[2] * p[2])));
    },
    bugs: (p) => {
      const [x, y, z, , m, s] = p;
      const A = sysA(s);
      const D = sarrus(A);
      const b = A.map((row) => row[0] * x + row[1] * y + row[2] * z);
      const ans = `(${x}, ${y}, ${z})`;
      const out: Bug[] = [];
      if (m === 0) {
        const C = mmul(toM(cofactors(A)), toM(b.map((v) => [v]))).map((r) => rdiv(r[0], rr(D)));
        out.push(B("cofactors-not-transposed", "procedural", ADJ, "The matrix of cofactors was used instead of its transpose; adj A is the TRANSPOSE of the cofactor matrix.", tup(C)));
      }
      if (m === 1) out.push(B("det-sign", "procedural", DET, "Δ was worked out with the wrong sign (check the + − + signs of the expansion); every value then changes sign.", `(${n_(-x)}, ${n_(-y)}, ${n_(-z)})`));
      if (m === 2) out.push(B("back-order", "procedural", MSYS, "The values were written in the order they were found (z first); write the answer as (x, y, z).", `(${z}, ${y}, ${x})`));
      out.push(B("rows-columns", "conceptual", MSYS, "The equations were written with the purchases as columns instead of rows; each situation gives one equation (one ROW of A).", null));
      return out.filter((bb) => bb.predict !== null && bb.predict !== ans);
    },
    distractors: ([x, y, z]) => [`(${y}, ${x}, ${z})`, `(${x}, ${z}, ${y})`, `(${x + 1}, ${y}, ${z})`],
    variants: () => [],
    explain: (s) => (s.id === "model" ? `Write the equations as ${s.value}` : s.id === "det" ? `|A| = ${n_(Number(s.value))} ≠ 0, so there is exactly one solution` : s.id === "inverse" ? `adj A = ${s.value}` : s.id === "cramer" ? `Δ₁, Δ₂, Δ₃ = ${s.value}` : s.id === "echelon" ? `Row-reduce ${s.inputs[0]} to ${s.value}` : `So (x, y, z) = ${s.value}`),
    domain: D_SYSW,
    keep: syswOk,
    cap: 400,
    difficulty: ([, , , , m, s]) => (Math.abs(sarrus(sysA(s))) <= 3 ? 2 : m === 1 ? 2 : 3),
    word: ([x, y, z, t, m, s]) => syswText([x, y, z, (t + 1) % 3, m, s]),
    teach: {
      idea: "Each fact in the story gives one linear equation in the three unknowns; together they form AX = B. With |A| ≠ 0 there is exactly one solution, found by X = A⁻¹B, by Cramer's rule (x = Δ₁/Δ, …) or by Gaussian elimination (row-reduce [A | B] and back-substitute).",
      method: "Name the unknowns (x, y, z), write one equation per fact, write A and B, then use the method asked for. Check the answer in every fact of the story.",
      alternatives: [
        { id: "cramer", title: "Cramer's rule", kind: "procedural", text: ["Δ = |A|; Δ₁ is |A| with column 1 replaced by B, and so on.", "x = Δ₁/Δ, y = Δ₂/Δ, z = Δ₃/Δ."] },
        { id: "gauss", title: "Gaussian elimination", kind: "procedural", text: ["Use row operations on [A | B] to make zeros below the diagonal.", "Find z from the last row, then y, then x."] },
      ],
    },
    limits: "Three unknowns with small whole-number coefficients and answers 1 to 12.",
  },
  {
    id: "aplpfeas",
    arity: 7,
    title: "Linear programming: bounded, unbounded or infeasible?",
    competency: LP,
    type: "choice",
    parse: none,
    // [k, a, b, m, d, P, Q]: see lpfCons
    reject: (p) => (lpfOk(p) ? null : "One constraint ax + by ≤ or ≥ c (with x ≥ … for the infeasible case), objective with whole coefficients."),
    prompt: (p) => `${p[0] === 3 ? "Minimise" : "Maximise"} Z = ${polyS([p[5], 0])} + ${polyS([p[6], 0], "y")} subject to ${consS(lpfCons(p))}. Which statement is true?`,
    choices: lpfChoices,
    solve: (p) => {
      const L = lpfLabels(p);
      const lab = L[lpfRight(p) as "best"];
      return { steps: [st("region", "draw", LP, [consS(lpfCons(p))], p[0] === 0 ? "empty" : p[0] === 2 ? "bounded" : "unbounded"), st("decide", "evaluate", LP, [lab], lpfChoices(p).indexOf(lab))], answer: lpfChoices(p).indexOf(lab) };
    },
    // independent: search the whole-number points of a large square for feasible points and for the best Z; a region that is
    // still improving at the edge of the square is unbounded
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const cs = lpfCons(p);
      const [k, , , , , P, Q] = p;
      const feas = (x: number, y: number) => cs.every(([a, b, c, s]) => (s < 0 ? a * x + b * y <= c : a * x + b * y >= c));
      let any = false;
      let best = k === 3 ? Infinity : -Infinity;
      let edgeBest = false;
      const N = 120;
      for (let x = 0; x <= N; x++) for (let y = 0; y <= N; y++) {
        if (!feas(x, y)) continue;
        any = true;
        const z = P * x + Q * y;
        if (k === 3 ? z < best : z > best) best = z;
        if ((x === N || y === N) && k !== 3) edgeBest = true;
      }
      const opt = lpfChoices(p)[v];
      if (!opt) return false;
      if (!any) return opt.startsWith("There is no feasible region");
      if (edgeBest) return opt.includes("unbounded");
      return opt === `The ${k === 3 ? "minimum" : "maximum"} value of Z is ${best}`;
    },
    bugs: (p) => {
      const L = lpfLabels(p);
      const ch = lpfChoices(p);
      const k = p[0];
      const out: Bug[] = [];
      if (k === 0) out.push(B("corner-of-one-constraint", "conceptual", LP, "Z was worked out at a corner of one constraint alone; first check that some point satisfies ALL the constraints — here none does.", ch.indexOf(L.best)));
      if (k === 1) out.push(B("intercept-as-max", "conceptual", LP, "Z was worked out at the corner points, but the region goes on for ever in the direction where Z grows, so Z has no maximum.", ch.indexOf(L.best)));
      if (k === 3) out.push(B("unbounded-no-optimum", "conceptual", LP, "An unbounded region was taken to have no optimal value; with positive costs Z still has a least value, at a corner.", ch.indexOf(L.unb)));
      if (k >= 2) out.push(B("wrong-corner", "procedural", LP, `The ${k === 3 ? "larger" : "smaller"} corner value was chosen; compare Z at both corners and take the ${k === 3 ? "smaller" : "larger"}.`, ch.indexOf(L.other)));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "region" ? `Draw ${s.inputs[0]}: the feasible region is ${s.value}` : `So: ${s.inputs[0]}`),
    domain: D_LPF,
    keep: lpfOk,
    cap: 400,
    difficulty: ([k]) => (k === 2 ? 1 : k === 0 ? 2 : 3),
    teach: {
      idea: "Before using corner points, look at the feasible region. If no point satisfies every constraint, the problem is infeasible. If the region is unbounded, Z may have no maximum (or no minimum) — check whether Z can be made as large (or small) as you like inside it.",
      method: "Draw the constraints. Empty region: infeasible. Bounded region: evaluate Z at every corner. Unbounded region: evaluate Z at the corners, then test whether a better value is possible further out (for a maximum, the half-plane Z > M meets the region).",
      alternatives: [{ id: "test-point", title: "Try a far-away point", kind: "procedural", text: ["Pick a feasible point far from the origin, such as (100, 100) if it is allowed.", "If Z there beats every corner value, Z has no maximum."] }],
    },
    limits: "One main constraint (two for the infeasible case) plus x, y ≥ 0; drawing the region is done on paper.",
  },
  {
    id: "apsapp",
    arity: 4,
    title: "Approximate values from the binomial, exponential and logarithmic series",
    competency: SER,
    type: "fraction",
    decimals: true,
    mc: true,
    parse: none,
    // [q, ni, k, m]: q 0 (1 + k/100)^n with n = SN[ni] (m = 1: √(100 + k)); q 1 e^(k/100); q 2 log(1 + 3k/100)
    reject: (p) => (sappOk(p) ? null : "Small x = k/100 in the binomial series (n = 1/2, −1, −2, 1/3, −1/2), eˣ, or log(1 + x)."),
    prompt: (p) => sappText(p),
    solve: (p) => {
      const t = sappTerms(p);
      return { steps: [st("terms", "evaluate", SER, t.map((v) => decS(rv(v))), decS(sappAns(p))), st("add", "add", FRAC, t.map((v) => decS(rv(v))), decS(sappAns(p)))], answer: sappAns(p) };
    },
    // independent: the Taylor coefficients of the function, computed numerically (Cauchy's formula), summed for the first three terms
    validate: ([q, ni, k, m], v) => {
      if (typeof v !== "number") return false;
      if (q === 0) {
        const n = SN[ni][0] / SN[ni][1];
        const x = k / 100;
        const c = [0, 1, 2].map((r) => taylor((z) => cpow([1 + z[0], z[1]], n), r, 0.5));
        return near(v, (m ? 10 : 1) * (c[0] + c[1] * x + c[2] * x * x), 1e-9);
      }
      if (q === 1) {
        const x = k / 100;
        const c = [0, 1, 2].map((r) => taylor((z) => cexp(z), r, 1));
        return near(v, c[0] + c[1] * x + c[2] * x * x, 1e-9);
      }
      const x = (3 * k) / 100;
      const c = [1, 2, 3].map((r) => taylor((z) => clog([1 + z[0], z[1]]), r, 0.5));
      return near(v, c[0] * x + c[1] * x * x + c[2] * x ** 3, 1e-9);
    },
    bugs: (p) => {
      const [q, ni, k, m] = p;
      const t = sappTerms(p);
      const ans = sappAns(p);
      const out: Bug[] = [];
      const sum = (xs: R[]) => rv(xs.reduce((a, b) => radd(a, b), [0, 1] as R));
      out.push(B("two-terms", "procedural", SER, "Only the first two terms were used; the question asks for three.", sum(t.slice(0, 2))));
      if (q === 0) {
        const n = rr(...SN[ni]);
        const x = rr(k, 100);
        const rise = rmul(rdiv(rmul(n, radd(n, rr(1))), rr(2)), rmul(x, x));
        out.push(B("rising-factor", "conceptual", SER, "The x² coefficient was taken as n(n + 1)/2; it is n(n − 1)/2, also for a negative or fractional n.", sum([t[0], t[1], m ? rmul(rise, rr(10)) : rise])));
        if (m) out.push(B("ten-forgotten", "procedural", SER, `√${100 + k} = 10√(1 ${k < 0 ? "−" : "+"} ${decS(Math.abs(k) / 100)}); the factor 10 was left out.`, Math.round((ans / 10) * 1e9) / 1e9));
      }
      if (q === 1) out.push(B("no-factorial", "recall", SER, "The x² term was not divided by 2! = 2; eˣ = 1 + x + x²/2! + …", rv(radd(radd(t[0], t[1]), rmul(t[2], rr(2))))));
      if (q === 2) out.push(B("signs", "recall", SER, "All the terms were added; the logarithmic series alternates: x − x²/2 + x³/3 − …", rv(radd(radd(t[0], rmul(t[1], rr(-1))), t[2]))));
      return out.filter((b, i) => !near(Number(b.predict), ans, 1e-12) && !out.slice(0, i).some((o) => near(Number(o.predict), Number(b.predict), 1e-12)));
    },
    distractors: (p) => [Math.round((sappAns(p) + 0.001) * 1e6) / 1e6],
    variants: () => [],
    explain: (s) => (s.id === "terms" ? `The first three terms are ${s.inputs.join(", ")}` : `Adding them: ${s.value}`),
    domain: D_SAPP,
    keep: sappOk,
    difficulty: ([q, ni, , m]) => (q === 1 ? 1 : q === 2 || m ? 3 : ni === 0 || ni === 1 ? 2 : 3),
    word: (p) => sappText(p, true),
    teach: {
      idea: "For small x the later terms of a series are tiny, so the first few give a good approximation: (1 + x)ⁿ ≈ 1 + nx + n(n − 1)x²/2, eˣ ≈ 1 + x + x²/2, log(1 + x) ≈ x − x²/2 + x³/3.",
      method: "Write the number as (1 + x) with x small (√102 = 10(1 + 0.02)^(1/2)), work out each of the first terms as a decimal, and add them.",
      alternatives: [{ id: "size", title: "How good is it?", kind: "conceptual", text: ["With x = 0.02 the x² term is about 0.0004 and the x³ term about 0.000008.", "So three terms are correct to about five decimal places."] }],
    },
    limits: "Values of x up to 0.12 so the approximations are good; error bounds are not asked.",
  },
  {
    id: "aprot",
    arity: 3,
    title: "Rotating and reflecting points with a 2 × 2 matrix",
    competency: MAT,
    type: "tuple",
    mc: true,
    parse: none,
    // [t, x, y]: TRM[t] applied to the point (x, y)
    reject: (p) => (rotOk(p) ? null : "A point with non-zero coordinates of different sizes, and one of six transformations."),
    prompt: ([t, x, y]) => `The matrix T = ${matN(TRM[t].M)} represents ${TRM[t].text}. Find the image of the point (${n_(x)}, ${n_(y)}) by working out T[[${n_(x)}], [${n_(y)}]]. Write it as (x, y).`,
    solve: (p) => {
      const [X, Y] = rotImg(p);
      return { steps: [st("multiply", "multiply", MAT, [matN(TRM[p[0]].M), `[[${n_(p[1])}], [${n_(p[2])}]]`], `(${n_(X)}, ${n_(Y)})`)], answer: `(${n_(X)}, ${n_(Y)})` };
    },
    // independent: the geometric rule itself (turning by multiplying x + iy by i, i², i³; reflections by changing signs or swapping)
    validate: ([t, x, y], v) => {
      const l = typeof v === "string" ? readList(v) : null;
      if (!l || l.length !== 2) return false;
      let z: C = [x, y];
      if (t <= 2) for (let k = 0; k <= t; k++) z = cml(z, [0, 1]);
      const want = t <= 2 ? z : t === 3 ? [x, -y] : t === 4 ? [-x, y] : [y, x];
      return req(l[0], rr(Math.round(want[0]))) && req(l[1], rr(Math.round(want[1])));
    },
    bugs: ([t, x, y]) => {
      const M = TRM[t].M;
      const [X, Y] = rotImg([t, x, y]);
      const ans = `(${n_(X)}, ${n_(Y)})`;
      const rowV = [x * M[0][0] + y * M[1][0], x * M[0][1] + y * M[1][1]];
      return [
        B("row-vector", "procedural", MAT, "The point was multiplied as a row, (x y)T, which uses the columns of T the wrong way; the image is T times the COLUMN [[x], [y]].", `(${n_(rowV[0])}, ${n_(rowV[1])})`),
        B("swapped", "procedural", MAT, "The coordinates of the image were written the wrong way round.", `(${n_(Y)}, ${n_(X)})`),
      ].filter((b) => b.predict !== ans);
    },
    distractors: ([t, x, y]) => {
      const [X, Y] = rotImg([t, x, y]);
      return [`(${n_(-X)}, ${n_(Y)})`, `(${n_(X)}, ${n_(-Y)})`, `(${n_(-X)}, ${n_(-Y)})`];
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`,
    domain: D_ROT,
    keep: rotOk,
    cap: 400,
    difficulty: ([t]) => (t === 1 || t >= 3 ? 1 : 2),
    teach: {
      idea: "Multiplying a column [[x], [y]] by a 2 × 2 matrix moves the point (x, y); the matrix [[cos θ, −sin θ], [sin θ, cos θ]] turns the plane through θ anticlockwise about the origin. Rotation and reflection matrices are orthogonal: TTᵀ = I.",
      method: "Work out T[[x], [y]]: first entry = (row 1 of T)·(x, y), second entry = (row 2 of T)·(x, y).",
      alternatives: [{ id: "picture", title: "Check with a sketch", kind: "conceptual", text: ["Plot the point and imagine turning it (or folding the plane along the mirror line).", "The image should be in the quadrant your sketch shows."] }],
    },
    limits: "Rotations through multiples of 90° and reflections in the axes and y = x; other angles need surds.",
  },
  {
    id: "aporth",
    arity: 3,
    title: "The inverse of an orthogonal matrix",
    competency: MAT,
    type: "matrix",
    mc: true,
    parse: none,
    // [d, i, s]: d 0 a 2 × 2 rotation or reflection from a Pythagorean triple; d 1 a 3 × 3 orthogonal matrix (rows permuted, columns signed)
    reject: (p) => (orthOk(p) ? null : "2 × 2 matrices (1/k)[[a, ∓b], [b, ±a]] from Pythagorean triples, or three 3 × 3 orthogonal patterns."),
    prompt: (p) => `A = ${matS(orthM(p))} is an orthogonal matrix (AAᵀ = I). Find A⁻¹, written as a matrix (fractions are fine as entries).`,
    solve: (p) => ({ steps: [st("rule", "recall", MAT, ["AAᵀ = I"], "A⁻¹ = Aᵀ"), st("transpose", "transpose", "MATH.matrices.transpose-symmetry", [matS(orthM(p))], matS(mT(orthM(p))))], answer: matS(mT(orthM(p))) }),
    // independent: A times the answer must be the identity
    validate: (p, v) => {
      const X = typeof v === "string" ? readMat(v) : null;
      const A = orthM(p);
      return !!X && X.length === A.length && X[0].length === A.length && meq(mmul(A, X), ident(A.length));
    },
    bugs: (p) => {
      const A = orthM(p);
      const want = matS(mT(A));
      return [
        B("matrix-itself", "conceptual", MAT, "A itself was given; A⁻¹ = Aᵀ, so rows become columns (they agree only when A is symmetric).", matS(A)),
        B("negated", "conceptual", MAT, "Every entry was negated; for an orthogonal matrix the inverse is the transpose, not −A or −Aᵀ.", matS(mT(A).map((r) => r.map((x) => rmul(x, rr(-1)))))),
        B("k-not-divided", "procedural", MAT, `The factor 1/${orthA(p).k} was left off; Aᵀ keeps the same factor.`, matN(mT(orthA(p).M))),
      ].filter((b) => b.predict !== want);
    },
    distractors: (p) => [matS(orthM(p).map((r) => r.map((x) => rmul(x, rr(2)))))],
    variants: () => [],
    explain: (s) => (s.id === "rule" ? `For an orthogonal matrix AAᵀ = I, so ${s.value}` : `Transpose A: ${s.value}`),
    domain: D_ORTH,
    keep: orthOk,
    difficulty: ([d]) => (d === 0 ? 2 : 3),
    teach: {
      idea: "A square matrix is orthogonal when AAᵀ = AᵀA = I. Then A⁻¹ = Aᵀ — no determinant or adjoint is needed. Rotations and reflections of the plane have orthogonal matrices.",
      method: "Check (or use, if given) AAᵀ = I, then write A⁻¹ = Aᵀ by turning the rows of A into columns.",
      alternatives: [{ id: "check", title: "Check by multiplying", kind: "procedural", text: ["Multiply A by your answer.", "You must get I: 1s on the diagonal and 0s elsewhere."] }],
    },
    limits: "2 × 2 and 3 × 3 orthogonal matrices with rational entries.",
  },
  {
    id: "apcode",
    arity: 4,
    title: "Encoding and decoding a message with a matrix",
    competency: MAT,
    type: "tuple",
    mc: true,
    parse: none,
    // [dir, i, m1, m2]: dir 0 decode the column CODEA[i]·M; dir 1 encode M
    reject: (p) => (inD(p, D_CODE) ? null : "Two letters (1 to 26) and one of eight encoding matrices with determinant ±1."),
    prompt: (p) => codeText(p),
    solve: (p) => {
      const [dir, i, m1, m2] = p;
      const C = codeC(p);
      const A = CODEA[i];
      const D = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      return dir === 0
        ? { steps: [st("inverse", "invert", ADJ, [matN(A)], matS(mscale(toM([[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]]), rr(1, D)))), st("decode", "multiply", MAT, [`A⁻¹[[${C[0]}], [${C[1]}]]`], `(${m1}, ${m2})`)], answer: `(${m1}, ${m2})` }
        : { steps: [st("letters", "convert", MAT, [`${ABC[m1 - 1]}${ABC[m2 - 1]}`], `(${m1}, ${m2})`), st("encode", "multiply", MAT, [matN(A)], `(${C[0]}, ${C[1]})`)], answer: `(${C[0]}, ${C[1]})` };
    },
    // independent: decoding is checked by encoding the answer again; encoding by decoding the answer with the adjugate
    validate: (p, v) => {
      const l = typeof v === "string" ? readList(v) : null;
      if (!l || l.length !== 2 || l.some((x) => x[1] !== 1)) return false;
      const [dir, i, m1, m2] = p;
      const A = CODEA[i];
      const [a, b] = l.map((x) => x[0]);
      if (dir === 0) {
        const C = codeC(p);
        return A[0][0] * a + A[0][1] * b === C[0] && A[1][0] * a + A[1][1] * b === C[1] && a >= 1 && a <= 26 && b >= 1 && b <= 26;
      }
      const D = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      return (A[1][1] * a - A[0][1] * b) / D === m1 && (-A[1][0] * a + A[0][0] * b) / D === m2;
    },
    bugs: (p) => {
      const [dir, i, m1, m2] = p;
      const A = CODEA[i];
      const C = codeC(p);
      if (dir === 0) {
        const ans = `(${m1}, ${m2})`;
        const D = A[0][0] * A[1][1] - A[0][1] * A[1][0];
        const noNeg = [(A[1][1] * C[0] + A[0][1] * C[1]) * D, (A[1][0] * C[0] + A[0][0] * C[1]) * D];
        return [
          B("used-A", "conceptual", MAT, "The coded column was multiplied by A again; to decode, multiply by A⁻¹.", `(${A[0][0] * C[0] + A[0][1] * C[1]}, ${A[1][0] * C[0] + A[1][1] * C[1]})`),
          B("adjoint-signs", "procedural", ADJ, "In A⁻¹ the off-diagonal entries were not negated; for [[a, b], [c, d]], A⁻¹ = (1/(ad − bc))[[d, −b], [−c, a]].", `(${noNeg[0]}, ${noNeg[1]})`),
        ].filter((b, k, all) => b.predict !== ans && !all.slice(0, k).some((o) => o.predict === b.predict));
      }
      const ans = `(${C[0]}, ${C[1]})`;
      return [B("row-vector", "procedural", MAT, "M was multiplied as a row, (m₁ m₂)A; the code is A times the COLUMN M.", `(${m1 * A[0][0] + m2 * A[1][0]}, ${m1 * A[0][1] + m2 * A[1][1]})`), B("letters-swapped", "procedural", MAT, "The two letters were put in the wrong order in M.", `(${A[0][0] * m2 + A[0][1] * m1}, ${A[1][0] * m2 + A[1][1] * m1})`)].filter((b) => b.predict !== ans);
    },
    distractors: (p) => {
      const C = codeC(p);
      return p[0] === 0 ? [`(${p[2] + 1}, ${p[3]})`, `(${p[3]}, ${p[2]})`] : [`(${C[0] + 1}, ${C[1]})`, `(${C[1]}, ${C[0]})`];
    },
    variants: () => [],
    explain: (s) => (s.id === "inverse" ? `A⁻¹ = ${s.value}` : s.id === "decode" ? `${s.inputs[0]} = ${s.value}, the letters ${(() => { const m = String(s.value).match(/\d+/g)!; return m.map((x) => ABC[Number(x) - 1]).join(""); })()}` : s.id === "letters" ? `${s.inputs[0]} is ${s.value}` : `C = ${s.inputs[0]}M = ${s.value}`),
    domain: D_CODE,
    cap: 300,
    difficulty: ([dir]) => (dir === 1 ? 1 : 2),
    word: (p) => codeText(p, true),
    teach: {
      idea: "A message can be hidden by multiplying columns of letter numbers by an invertible matrix A: C = AM. The receiver, who knows A, recovers M = A⁻¹C. A matrix with determinant ±1 has an inverse with whole-number entries.",
      method: "To encode, multiply A by the column of letter numbers. To decode, find A⁻¹ = (1/|A|) adj A and multiply it by the coded column; then turn the numbers back into letters.",
      alternatives: [{ id: "check", title: "Check by re-encoding", kind: "procedural", text: ["After decoding, multiply A by your answer.", "You must get the coded column back."] }],
    },
    limits: "Pairs of letters with 2 × 2 matrices of determinant ±1; longer messages repeat the same step for each pair.",
  },
  {
    id: "apgj3",
    arity: 1,
    title: "The inverse of a 3 × 3 matrix by the Gauss–Jordan method",
    competency: RANK,
    type: "matrix",
    mc: true,
    parse: none,
    // [seed]: a 3 × 3 matrix with determinant ±1 built from row operations (gjA)
    reject: (p) => (gjOk(p) ? null : "3 × 3 matrices with determinant ±1 and small entries."),
    prompt: ([s]) => `A = ${matN(gjA(s))}. Find A⁻¹ by the Gauss–Jordan method: use elementary row operations to turn [A | I] into [I | A⁻¹].`,
    solve: ([s]) => {
      const A = gjA(s);
      return { steps: [st("augment", "write", RANK, [matN(A)], "[A | I]"), st("reduce", "row-reduce", RANK, ["Rᵢ ↔ Rⱼ, Rᵢ → Rᵢ + kRⱼ"], "[I | A⁻¹]"), st("read", "read", ADJ, ["right half"], matN(gjInv(A)))], answer: matN(gjInv(A)) };
    },
    // independent: A times the answer is the identity
    validate: ([s], v) => {
      const X = typeof v === "string" ? readMat(v) : null;
      return !!X && X.length === 3 && X[0].length === 3 && meq(mmul(toM(gjA(s)), X), ident(3));
    },
    bugs: ([s]) => {
      const inv = gjInv(gjA(s));
      const want = matN(inv);
      return [
        B("read-transposed", "procedural", ADJ, "The right-hand block was read off column by column; A⁻¹ is the right half of [I | A⁻¹] read row by row.", matN(mT(inv))),
        B("left-half-only", "conceptual", RANK, "The row operations were done on A but not on I; the same operations must be applied to the whole row of [A | I].", matN([[1, 0, 0], [0, 1, 0], [0, 0, 1]])),
        B("sign-slip", "procedural", RANK, "A sign slip in a row operation Rᵢ → Rᵢ − kRⱼ left one entry with the wrong sign; check by multiplying A by your answer.", matN(gjSlip(inv))),
      ].filter((b) => b.predict !== want);
    },
    distractors: ([s]) => [matN(gjA(s))],
    variants: () => [],
    explain: (s) => (s.id === "augment" ? `Write ${s.value} with A = ${s.inputs[0]}` : s.id === "reduce" ? `Use ${s.inputs[0]} until the left half is I: ${s.value}` : `The ${s.inputs[0]} is A⁻¹ = ${s.value}`),
    domain: D_GJ,
    keep: gjOk,
    difficulty: ([s]) => (gjA(s).flat().filter((x) => x === 0).length >= 3 ? 2 : 3),
    word: ([s]) => `A school's quiz club sends coded answers: each group of three letter numbers is written as a column and multiplied by the coding matrix A = ${matN(gjA(s))}. To decode, the quizmaster needs A⁻¹. Find it by the Gauss–Jordan method (row-reduce [A | I] to [I | A⁻¹]).`,
    teach: {
      idea: "Each elementary row operation is multiplication on the left by an invertible matrix. If the operations turn A into I, their product is A⁻¹ — so doing the same operations to I produces A⁻¹.",
      method: "Write [A | I]. Make the first column (1, 0, 0) using row swaps and Rᵢ → Rᵢ + kRⱼ (and Rᵢ → cRᵢ), then the second column, then the third, always on whole rows. Read A⁻¹ from the right half and check AA⁻¹ = I.",
      alternatives: [{ id: "adjoint", title: "Compare with the adjoint method", kind: "conceptual", text: ["A⁻¹ = adj A / |A| gives the same matrix.", "Gauss–Jordan avoids nine 2 × 2 determinants and works for larger matrices too."] }],
    },
    limits: "3 × 3 matrices with determinant ±1, so every step keeps whole numbers; showing each row operation is assessed in a written task.",
  },
  // ================================================================ gap@1: reciprocal and reducible equations, volumes, Vieta with a box
  {
    id: "aprecip",
    arity: 3,
    title: "Solving a reciprocal equation",
    competency: PES,
    type: "set",
    parse: none,
    // [i, j, odd]: roots RT[i], 1/RT[i], RT[j], 1/RT[j] (and −1 when odd = 1)
    reject: (p) => (recOk(p) ? null : "Two different root pairs t, 1/t from a list, with or without the root −1."),
    prompt: (p) => `${polyS(recPoly(p))} = 0 is a reciprocal equation. Solve it${p[2] ? " (first divide by x + 1, as x = −1 is a root)" : ""} by dividing by x² and putting y = x + 1/x. Give every root, separated by commas.`,
    solve: (p) => {
      const [i, j] = p;
      const ys = [RT[i], RT[j]].map(([a, b]) => rs(rr(a * a + b * b, a * b)));
      return { steps: [...(p[2] ? [st("factor", "divide", FACT, [-1], "x + 1 is a factor")] : []), st("substitute", "substitute", PES, ["y = x + 1/x"], `y = ${ys.join(" or y = ")}`), st("roots", "solve", PES, ys, recRoots(p))], answer: recRoots(p) };
    },
    // independent: substitute each value into the polynomial (exactly zero) and check the count matches the degree
    validate: (p, v) => {
      if (!Array.isArray(v)) return false;
      const P = recPoly(p);
      if (v.length !== P.length - 1 || new Set(v.map((x) => Math.round(x * 1e9))).size !== v.length) return false;
      return v.every((x) => Math.abs(horner(P, x)) < 1e-7 * Math.max(1, ...P.map(Math.abs)));
    },
    bugs: (p) => {
      const [i, j, odd] = p;
      const out: Bug[] = [B("reciprocals-missed", "conceptual", PES, "Only one root of each pair was given; in a reciprocal equation if t is a root then so is 1/t.", [...[RT[i], RT[j]].map(([a, b]) => a / b), ...(odd ? [-1] : [])])];
      out.push(B("y-values", "procedural", PES, "The values of y = x + 1/x were given; each value of y must be turned back into two values of x by solving x + 1/x = y.", [RT[i], RT[j]].map(([a, b]) => (a * a + b * b) / (a * b))));
      if (odd) out.push(B("minus-one-forgotten", "procedural", PES, "The root x = −1 (the factor x + 1 of an odd-degree reciprocal equation) was left out.", recRoots(p).filter((x) => x !== -1)));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "factor" ? `x = −1 is a root, so ${s.value}` : s.id === "substitute" ? `Dividing by x² and putting ${s.inputs[0]} gives a quadratic in y: ${s.value}` : `Solving x + 1/x = y for each y: x = ${(s.value as number[]).map((x) => rs(rr(Math.round(x * 6), 6))).join(", ")}`),
    domain: D_REC,
    keep: recOk,
    difficulty: ([i, j, odd]) => (i <= 3 && j <= 3 && !odd ? 2 : 3),
    teach: {
      idea: "A reciprocal equation is unchanged when x is replaced by 1/x: its coefficients read the same forwards and backwards (or with signs changed). So its roots come in pairs t, 1/t, and dividing by x² and putting y = x + 1/x halves the degree.",
      method: "For an odd degree, first take out the factor x + 1 (or x − 1). Divide by x², group (x² + 1/x²) and (x + 1/x), use x² + 1/x² = y² − 2, solve the quadratic in y, then solve x + 1/x = y for each y.",
      alternatives: [{ id: "pairs", title: "Use the pairs", kind: "conceptual", text: ["Try t = 2: if 2 is a root, so is 1/2, and (x − 2)(2x − 1) = 2x² − 5x + 2 is a factor.", "Dividing by it leaves a quadratic for the other pair."] }],
    },
    limits: "Reciprocal equations of degree 4 and 5 with rational roots.",
  },
  {
    id: "apredu",
    arity: 3,
    title: "Equations reducible to quadratics: √x and exponential substitutions",
    competency: PES,
    type: "set",
    parse: none,
    // [q, a, b]: q 0 x − (a + b)√x + ab = 0; q 1 4^x − (2^a + 2^b)2^x + 2^(a+b) = 0; q 2 the same with 9 and 3; q 3 x + (b − a)√x − ab = 0 (one root rejected)
    reject: (p) => (redOk(p) ? null : "Substitutions y = √x, 2^x or 3^x giving a quadratic with simple roots."),
    prompt: redText,
    solve: (p) => {
      const [q, a, b] = p;
      const ys = q === 0 ? [a, b] : q === 3 ? [a, -b] : q === 1 ? [2 ** a, 2 ** b] : [3 ** a, 3 ** b];
      return { steps: [st("quadratic", "substitute", PES, [["y = √x", "y = 2^x", "y = 3^x", "y = √x"][q]], `y = ${ys.map(n_).join(" or y = ")}`), ...(q === 3 ? [st("reject", "check", PES, [-b], "√x cannot be negative")] : []), st("back", "solve", PES, ys, redAns(p))], answer: redAns(p) };
    },
    // independent: the solutions are whole numbers, so try every whole x from 0 to 100 in the original equation
    validate: (p, v) => {
      if (!Array.isArray(v)) return false;
      const f = redF(p);
      const roots: number[] = [];
      for (let x = 0; x <= 100; x++) if (Math.abs(f(x)) < 1e-9 * Math.max(1, x ** 2)) roots.push(x);
      return v.length === roots.length && [...v].sort((x, y) => x - y).every((x, i) => near(x, roots[i]));
    },
    bugs: (p) => {
      const [q, a, b] = p;
      if (q === 0) return [B("y-given", "procedural", PES, "The values of y = √x were given; x = y², so square them.", [a, b]), ...(a * a !== 2 * a ? [B("doubled", "prerequisite", "MATH.number.exponents", "√x = y was undone by doubling; x = y² (y × y).", [2 * a, 2 * b])] : [])];
      if (q === 3) return [B("extraneous-kept", "conceptual", PES, `√x = −${b} was kept; √x is never negative, so x = ${b * b} does not satisfy the equation.`, [a * a, b * b]), B("y-given", "procedural", PES, "The value of y = √x was given; x = y².", [a])];
      const base = q === 1 ? 2 : 3;
      return [B("y-given", "procedural", PES, `The values of y = ${base}^x were given; x is the power: ${base}^x = y.`, [base ** a, base ** b])];
    },
    variants: () => [],
    explain: (s) => (s.id === "quadratic" ? `With ${s.inputs[0]} the equation becomes a quadratic: ${s.value}` : s.id === "reject" ? `y = ${n_(Number(s.inputs[0]))} is rejected: ${s.value}` : `Back to x: ${(s.value as number[]).join(", ")}`),
    domain: D_RED,
    keep: redOk,
    difficulty: ([q]) => (q === 0 ? 1 : q === 3 ? 3 : 2),
    teach: {
      idea: "Some equations that are not polynomials become quadratics after a substitution: x − 5√x + 6 = 0 is y² − 5y + 6 = 0 with y = √x, and 4^x − 6·2^x + 8 = 0 is y² − 6y + 8 = 0 with y = 2^x.",
      method: "Spot the substitution, solve the quadratic in y, then go back to x — and reject any value of y the substitution cannot take (√x ≥ 0, 2^x > 0). Check each x in the original equation.",
      alternatives: [{ id: "check", title: "Check in the original", kind: "procedural", text: ["Put each value of x back into the equation you were given.", "A value that fails (for example from √x = −3) is not a solution."] }],
    },
    limits: "Substitutions √x, 2^x and 3^x with whole-number answers.",
  },
  {
    id: "apvolg",
    arity: 3,
    title: "A volume condition giving a cubic equation",
    competency: PES,
    type: "integer",
    mc: true,
    parse: none,
    // [q, x, a]: q 0 square base x, height x + a; q 1 height x, length 2x, width x + a
    reject: (p) => (volgOk(p) ? null : "Whole-number dimensions with a positive height."),
    prompt: (p) => volgText(p),
    solve: (p) => {
      const [q, x, a] = p;
      const V = volgV(p);
      const cs = q === 0 ? [1, a, 0, -V] : [2, 2 * a, 0, -V];
      return { steps: [st("cubic", "write", PES, [V], `${polyS(cs)} = 0`), st("signs", "count", PRA, [cs.join(",")], 1), st("root", "substitute", FACT, [x], x)], answer: x };
    },
    // independent: build the box for each whole x and compare its volume
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return false;
      const [q, , a] = p;
      const vol = (x: number) => (q === 0 ? x * x * (x + a) : x * 2 * x * (x + a));
      return vol(v) === volgV(p) && v + a > 0;
    },
    bugs: (p) => {
      const [, x] = p;
      const V = volgV(p);
      const c = Math.round(Math.cbrt(p[0] === 0 ? V : V / 2));
      return [
        ...(c !== x ? [B("cube-root", "conceptual", PES, `The box was treated as a cube (x³ = ${p[0] === 0 ? V : V / 2}); the other dimensions differ from x, so the x² term matters.`, c)] : []),
        ...(p[0] === 1 ? [B("factor-two", "procedural", PES, "The length 2x was taken as x; the volume is x × 2x × (x + a).", (() => { for (let t = 1; t <= 60; t++) if (t * t * (t + p[2]) === V) return t; return null; })())] : []),
      ].filter((b) => b.predict !== null && b.predict !== x);
    },
    distractors: ([, x]) => [x + 1, x - 1, x + 2].filter((t) => t > 0),
    range: [1, Infinity],
    variants: () => [],
    explain: (s) => (s.id === "cubic" ? `Volume = ${s.inputs[0]} gives ${s.value}` : s.id === "signs" ? "The coefficients change sign once, so there is exactly one positive root (Descartes' rule)" : `x = ${s.inputs[0]} makes the cubic 0 (it divides the constant term)`),
    domain: D_VOLG,
    keep: volgOk,
    difficulty: ([, x]) => (x <= 6 ? 1 : x <= 12 ? 2 : 3),
    word: (p) => volgText(p, true),
    teach: {
      idea: "Writing the volume in terms of one unknown dimension gives a cubic equation. Only a positive root makes sense, and a whole-number root must divide the constant term.",
      method: "Write V = (length)(breadth)(height) in x, expand to a cubic = 0, then test whole numbers near ∛V (factors of the constant term) until one fits; check every dimension is positive.",
      alternatives: [{ id: "table", title: "A table of volumes", kind: "procedural", text: ["Work out the volume for x = 1, 2, 3, …", "The volume increases with x, so stop when you reach the given volume."] }],
    },
    limits: "Cuboids with whole-number dimensions; problems with two possible positive answers are left out.",
  },
  {
    id: "apvbox",
    arity: 4,
    title: "Roots and coefficients: the measurements of a box",
    competency: VIETA,
    type: "integer",
    mc: true,
    parse: none,
    // [a, b, c, w]: edges a ≤ b ≤ c; w 0 surface area 2Σαβ, 1 edge length 4Σα, 2 volume αβγ, 3 diagonal² (Σα)² − 2Σαβ
    reject: (p) => (vboxOk(p) ? null : "Edges from 1 to 9 cm."),
    prompt: (p) => vboxText(p),
    solve: (p) => {
      const { p: s1, q, r } = vboxS(p);
      return { steps: [st("vieta", "recall", VIETA, [s1, q, r], `α + β + γ = ${s1}, αβ + βγ + γα = ${q}, αβγ = ${r}`), st("value", "evaluate", VIETA, [p[3]], vboxAns(p))], answer: vboxAns(p) };
    },
    // independent: find the three roots by trying whole numbers, then measure the box directly
    validate: (p, v) => {
      const { p: s1, q, r } = vboxS(p);
      const roots: number[] = [];
      let P = [1, -s1, q, -r];
      for (let x = 1; x <= 30 && P.length > 1; x++) {
        while (P.length > 1 && horner(P, x) === 0) {
          roots.push(x);
          // synthetic division by (x − root)
          const Q: number[] = [];
          P.slice(0, -1).forEach((c, i) => Q.push(c + (i ? Q[i - 1] * x : 0)));
          P = Q;
        }
      }
      if (roots.length !== 3) return false;
      const [a, b, c] = roots;
      return v === [2 * (a * b + b * c + c * a), 4 * (a + b + c), a * b * c, a * a + b * b + c * c][p[3]];
    },
    bugs: (p) => {
      const { p: s1, q, r } = vboxS(p);
      const w = p[3];
      const ans = vboxAns(p);
      const out: Bug[] = [];
      if (w === 0) out.push(B("half-area", "procedural", VIETA, "αβ + βγ + γα was given; the box has two faces of each kind, so the surface area is 2(αβ + βγ + γα).", q));
      if (w === 1) out.push(B("sum-only", "procedural", VIETA, "α + β + γ was given; a cuboid has 4 edges of each length, so the total is 4(α + β + γ).", s1));
      if (w === 2) out.push(B("pair-sum", "recall", VIETA, "The coefficient of x was used; the product of the roots is the constant term with its sign changed: αβγ = −(−" + r + ") = " + r + ".", q));
      if (w === 3) {
        out.push(B("square-of-sum", "conceptual", "MATH.algebra.identities", "(α + β + γ)² was given; it includes 2(αβ + βγ + γα), which must be taken away to leave α² + β² + γ².", s1 * s1));
        out.push(B("sign", "procedural", "MATH.algebra.identities", "2(αβ + βγ + γα) was added instead of subtracted.", s1 * s1 + 2 * q));
      }
      return out.filter((b) => b.predict !== ans);
    },
    distractors: (p) => [vboxAns(p) + 2, vboxAns(p) * 2],
    range: [1, Infinity],
    variants: () => [],
    explain: (s) => (s.id === "vieta" ? `For x³ − px² + qx − r = 0: ${s.value}` : `So the value asked for is ${s.value}`),
    domain: D_VBOX,
    keep: vboxOk,
    difficulty: ([, , , w]) => (w === 2 || w === 1 ? 1 : w === 0 ? 2 : 3),
    word: (p) => vboxText(p, true),
    teach: {
      idea: "If α, β, γ are the roots of x³ − px² + qx − r = 0 then α + β + γ = p, αβ + βγ + γα = q and αβγ = r. For a box with edges α, β, γ these are a quarter of the edge length, half the surface area, and the volume.",
      method: "Read p, q and r from the equation (watch the signs), then write the quantity asked for in terms of them: surface area 2q, edges 4p, volume r, diagonal² = p² − 2q.",
      alternatives: [{ id: "solve", title: "Check by finding the edges", kind: "procedural", text: ["Try whole numbers in the cubic to find the three edges.", "Measure the box from them; you get the same answers without solving."] }],
    },
    limits: "Boxes with whole-number edges up to 9; the roots are not needed.",
  },
];
B16.push(...NEW16);
