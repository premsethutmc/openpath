/**
 * Batch b15 (families@2), Grades 11–12 algebra: set operations and counting subsets, Cartesian products and
 * properties of relations, domains and ranges of real functions, one-one and onto functions, points on transformed
 * graphs, the greatest-integer function, corner points of a feasible region, modulus equations and inequalities,
 * quadratic and rational inequalities, partial fractions, permutations and combinations, the binomial theorem,
 * geometric, arithmetico-geometric and harmonic progressions, logarithms, and quadratics over the complex numbers.
 * Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { fmt, gcd, near, sup, xp } from "../family-kit";
import { evaluate, parse } from "../answer-types";

const SETS = "MATH.algebra.sets";
const REL = "MATH.algebra.relations";
const FUN = "MATH.algebra.functions";
const TRANS = "MATH.algebra.function-transformations";
const STD = "MATH.algebra.standard-function-graphs";
const IN2 = "MATH.algebra.inequalities-two-variables";
const ABS = "MATH.algebra.absolute-value";
const NLI = "MATH.algebra.nonlinear-inequalities";
const INEQ = "MATH.algebra.inequalities";
const PF = "MATH.algebra.partial-fractions";
const PERM = "MATH.algebra.permutations";
const BIN = "MATH.algebra.binomial";
const GP = "MATH.algebra.geometric-sequences";
const AGP = "MATH.sequences.agp-hp";
const LOG = "MATH.algebra.logarithms";
const QC = "MATH.algebra.quadratic-complex";
const QUAD = "MATH.algebra.quadratics";
const LSYS = "MATH.algebra.linear-systems";
const EXPN = "MATH.number.exponents";
const REAL = "MATH.number.real-numbers";
const FACT = "MATH.algebra.factorisation";
const AP = "MATH.algebra.arithmetic-sequences";
const DISC = "MATH.algebra.quadratic-discriminant";
const LIN = "MATH.algebra.linear-equations";

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi"];
const nm = (k: number) => NAMES[((Math.round(k) % NAMES.length) + NAMES.length) % NAMES.length];
const SUBS: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const sub = (n: number | string) => String(n).replace(/\d/g, (c) => SUBS[c]);
/** A number as printed: − for minus. */
const n_ = (v: number) => (v < 0 ? `−${-v}` : String(v));
/** A rational number as printed: 3/2, −1/4. */
const fr = (v: number) => fmt(v).replace(/^-/, "−");
const inDom = (p: number[], d: [number, number][]) => p.length === d.length && p.every((v, i) => Number.isInteger(v) && v >= d[i][0] && v <= d[i][1]);
const fnv = (s: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return x;
};
/** A polynomial in v from its coefficients, highest power first: [2, −3, 1] → 2x² − 3x + 1. */
function poly(cs: number[], v = "x"): string {
  const deg = cs.length - 1;
  let out = "";
  cs.forEach((c, i) => {
    const d = deg - i;
    if (c === 0) return;
    const m = Math.abs(c);
    const body = `${m === 1 && d > 0 ? "" : fr(m)}${d === 0 ? "" : d === 1 ? v : v + sup(d)}`;
    out += out ? (c < 0 ? ` − ${body}` : ` + ${body}`) : c < 0 ? `−${body}` : body;
  });
  return out || "0";
}
/** A linear combination of letters and a constant: [[3, "a"], [2, "b"], [−1, ""]] → 3a + 2b − 1. */
function combo(ts: [number, string][]): string {
  let out = "";
  for (const [c, v] of ts) {
    if (c === 0) continue;
    const m = Math.abs(c);
    const body = `${m === 1 && v ? "" : fr(m)}${v}`;
    out += out ? (c < 0 ? ` − ${body}` : ` + ${body}`) : c < 0 ? `−${body}` : body;
  }
  return out || "0";
}
const lin = (a: number, b: number) => poly([a, b]);
/** x − a written as a factor: x − 3, x + 2, x. */
const fac = (a: number) => lin(1, -a);
/** The factor x − a as written in a product or under a fraction bar: a lone x is not bracketed. */
const bx = (a: number) => (a === 0 ? "x" : `(${fac(a)})`);
/** A numerator or denominator in brackets only when it has more than one term. */
const brk = (t: string) => (/ /.test(t) ? `(${t})` : t);
const prod2 = (a: number, b: number) => (b === 0 && a !== 0 ? `x${bx(a)}` : `${bx(a)}${bx(b)}`);
const choose = (n: number, r: number) => {
  if (r < 0 || r > n) return 0;
  let v = 1;
  for (let i = 0; i < r; i++) v = (v * (n - i)) / (i + 1);
  return Math.round(v);
};
const fact = (n: number) => {
  let v = 1;
  for (let i = 2; i <= n; i++) v *= i;
  return v;
};
const perm = (n: number, r: number) => {
  let v = 1;
  for (let i = 0; i < r; i++) v *= n - i;
  return v;
};

// ---------------------------------------------------------------- intervals (answers in interval notation)

/** [lo, lo closed, hi, hi closed]; null is an infinite end. */
type Piece = [number | null, boolean, number | null, boolean];
const ivs = (ps: Piece[]) => ps.map(([lo, lc, hi, hc]) => `${lc ? "[" : "("}${lo === null ? "−∞" : fr(lo)}, ${hi === null ? "∞" : fr(hi)}${hc ? "]" : ")"}`).join(" ∪ ");
const rat = (s: string): [number, number] | null => {
  const m = s.replace(/−/g, "-").trim().match(/^(-?\d+)(?:\/(\d+))?$/);
  return m ? [Number(m[1]), m[2] ? Number(m[2]) : 1] : null;
};
type RP = { lo: [number, number] | null; lc: boolean; hi: [number, number] | null; hc: boolean };
function readIv(v: Value): RP[] | null {
  if (typeof v !== "string") return null;
  const out: RP[] = [];
  for (const part of v.split("∪")) {
    const m = part.trim().match(/^([[(])\s*(.+?)\s*,\s*(.+?)\s*([\])])$/);
    if (!m) return null;
    const lo = m[2] === "−∞" ? null : rat(m[2]);
    const hi = m[3] === "∞" ? null : rat(m[3]);
    if ((m[2] !== "−∞" && !lo) || (m[3] !== "∞" && !hi)) return null;
    out.push({ lo, lc: m[1] === "[", hi, hc: m[4] === "]" });
  }
  return out;
}
/** Is k/N in the union? (exact, in whole numbers) */
const inside = (iv: RP[], k: number, N: number) =>
  iv.some(({ lo, lc, hi, hc }) => {
    const a = lo === null ? 1 : k * lo[1] - lo[0] * N;
    const b = hi === null ? 1 : hi[0] * N - k * hi[1];
    return (a > 0 || (a === 0 && lc)) && (b > 0 || (b === 0 && hc));
  });
/** Independent check of an interval answer: test every x = k/120 from −30 to 30 in the original condition. */
function agrees(v: Value, cond: (k: number, N: number) => boolean, N = 120, R = 30) {
  const iv = readIv(v);
  if (!iv) return false;
  for (let k = -R * N; k <= R * N; k++) if (cond(k, N) !== inside(iv, k, N)) return false;
  return true;
}
const OPS = ["<", "≤", ">", "≥"];

// ---------------------------------------------------------------- tuples

const tup = (...xs: (number | string)[]) => `(${xs.map((x) => (typeof x === "number" ? fr(x) : x)).join(", ")})`;
/** A number written as a fraction or a surd k√m/d. */
const num = (s: string): number => {
  const t = s.trim().replace(/−/g, "-");
  const r = rat(t);
  if (r) return r[0] / r[1];
  const m = t.match(/^(-)?(\d*)√(\d+)(?:\/(\d+))?$/);
  if (!m) return NaN;
  return (m[1] ? -1 : 1) * (m[2] ? Number(m[2]) : 1) * Math.sqrt(Number(m[3])) / (m[4] ? Number(m[4]) : 1);
};
const readTup = (v: Value, n: number): number[] | null => {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^\((.*)\)$/);
  if (!m) return null;
  const out = m[1].split(",").map(num);
  return out.length === n && out.every(Number.isFinite) ? out : null;
};
/** k√m/d in simplest form, for √D / den. */
function surdOver(D: number, den: number): string {
  let k = 1;
  let m = D;
  for (let p = 2; p * p <= m; p++) while (m % (p * p) === 0) {
    m /= p * p;
    k *= p;
  }
  if (m === 1) return fr(k / den);
  const g = gcd(k, den);
  const top = k / g;
  const bot = den / g;
  return `${top === 1 ? "" : top}√${m}${bot === 1 ? "" : `/${bot}`}`;
}
const sameSet = (v: Value, want: number[]) => Array.isArray(v) && v.length === want.length && [...v].sort((x, y) => x - y).every((x, i) => near(x, [...want].sort((p, q) => p - q)[i]));

// ---------------------------------------------------------------- sets

const mults = (N: number, a: number) => {
  const out: number[] = [];
  for (let k = a; k <= N; k += a) out.push(k);
  return out;
};
const SETOPS = ["A ∪ B", "A ∩ B", "A − B", "B − A", "(A ∪ B)′"];
function setop(N: number, a: number, b: number, op: number): number[] {
  const A = mults(N, a);
  const B = mults(N, b);
  const inA = new Set(A);
  const inB = new Set(B);
  const U = Array.from({ length: N }, (_, i) => i + 1);
  if (op === 0) return [...new Set([...A, ...B])].sort((x, y) => x - y);
  if (op === 1) return A.filter((x) => inB.has(x));
  if (op === 2) return A.filter((x) => !inB.has(x));
  if (op === 3) return B.filter((x) => !inA.has(x));
  if (op === 4) return U.filter((x) => !inA.has(x) && !inB.has(x));
  return U.filter((x) => !inA.has(x) || !inB.has(x)); // (A ∩ B)′, for a prediction
}
const D_SETOP: [number, number][] = [[10, 20], [2, 6], [2, 6], [0, 4]];
const setopOk = (p: number[]) => inDom(p, D_SETOP) && p[1] !== p[2] && setop(p[0], p[1], p[2], p[3]).length >= 1 && setop(p[0], p[1], p[2], p[3]).length <= 12;
const orNull = (xs: number[]) => (xs.length ? xs : null);
const SETWORD = ["in at least one of the two teams", "in both teams", "in the kabaddi team but not in the kho-kho team", "in the kho-kho team but not in the kabaddi team", "in neither team"];

const D_SUB: [number, number][] = [[2, 12], [0, 4], [0, 11]];
const subOk = (p: number[]) => inDom(p, D_SUB) && (p[1] === 3 ? p[2] >= 1 && p[2] <= p[0] - 1 : p[2] === 0);
const LETTERS = "abcdefghijkl";
const setOf = (n: number) => `{${LETTERS.slice(0, n).split("").join(", ")}}`;
function subCount([n, q, r]: number[]) {
  const all = 2 ** n;
  return q === 0 ? all : q === 1 ? all - 1 : q === 2 ? all - 2 : q === 3 ? choose(n, r) : all / 2;
}

const D_INEX: [number, number][] = [[8, 60], [8, 60], [1, 40], [0, 2]];
const inexOk = (p: number[]) => inDom(p, D_INEX) && p[2] < Math.min(p[0], p[1]);

// ---------------------------------------------------------------- relations

const D_CART: [number, number][] = [[1, 10], [1, 10], [0, 2]];
const cartOk = (p: number[]) => inDom(p, D_CART) && (p[2] !== 1 || p[0] * p[1] <= 12) && !(p[0] === 1 && p[1] === 1);
const nums = (m: number) => `{${Array.from({ length: m }, (_, i) => i + 1).join(", ")}}`;
const lets = (n: number) => `{${"pqrstuvwyz".slice(0, n).split("").join(", ")}}`;
/** n with its noun, singular only for 1. */
const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const popcount = (m: number) => {
  let c = 0;
  for (let x = m; x; x >>= 1) c += x & 1;
  return c;
};
/** Relations on A = {1, …, n} given by a rule (set-builder form): the rule's text for k, its test, and its values of k.
 * (Relations given as a list of pairs are the relation-properties family aqrel.) */
const RRULES: [(k: number) => string, (a: number, b: number, k: number) => boolean, number[]][] = [
  [(k) => `a − b is divisible by ${k}`, (a, b, k) => (a - b) % k === 0, [2, 3, 4]],
  [() => "a ≤ b", (a, b) => a <= b, [0]],
  [() => "a < b", (a, b) => a < b, [0]],
  [(k) => `a + b = ${k}`, (a, b, k) => a + b === k, [4, 5, 6]],
  [(k) => `|a − b| ≤ ${k}`, (a, b, k) => Math.abs(a - b) <= k, [1, 2]],
  [(k) => `b = a + ${k}`, (a, b, k) => b === a + k, [1, 2]],
  [() => "a divides b", (a, b) => b % a === 0, [0]],
  [() => "ab is even", (a, b) => (a * b) % 2 === 0, [0]],
  [(k) => `a + b ≤ ${k}`, (a, b, k) => a + b <= k, [4, 5, 6]],
];
const D_REL: [number, number][] = [[0, 8], [0, 2], [3, 8]];
const relOk = (p: number[]) => inDom(p, D_REL) && p[1] < RRULES[p[0]][2].length && relPairs(p).length >= 1;
const relK = ([rule, ki]: number[]) => RRULES[rule][2][ki];
const relText = (p: number[]) => `{(a, b) : a, b ∈ A, ${RRULES[p[0]][0](relK(p))}}`;
/** The pairs of R, listed by going through A × A. */
function relPairs(p: number[]): [number, number][] {
  const n = p[2];
  const out: [number, number][] = [];
  for (let a = 1; a <= n; a++) for (let b = 1; b <= n; b++) if (RRULES[p[0]][1](a, b, relK(p))) out.push([a, b]);
  return out;
}
/** The properties by going through the list of pairs. */
function relProps(p: number[]) {
  const ps = relPairs(p);
  const has = (a: number, b: number) => ps.some(([x, y]) => x === a && y === b);
  const missing = Array.from({ length: p[2] }, (_, i) => i + 1).filter((a) => !has(a, a));
  const r = missing.length === 0;
  const s = ps.every(([a, b]) => has(b, a));
  const noRev = ps.filter(([a, b]) => !has(b, a));
  const fails: [number, number, number][] = [];
  for (const [a, b] of ps) for (const [b2, c] of ps) if (b === b2 && !has(a, c)) fails.push([a, b, c]);
  return { r, s, t: fails.length === 0, fails, ps, has, missing, noRev };
}
const relLabel = (r: boolean, s: boolean, t: boolean) => `R is ${r ? "" : "not "}reflexive, ${s ? "" : "not "}symmetric and ${t ? "" : "not "}transitive`;
function relChoices(p: number[]) {
  const { r, s, t } = relProps(p);
  const opts = [relLabel(r, s, t), relLabel(!r, s, t), relLabel(r, !s, t), relLabel(r, s, !t)];
  return [...opts].sort((x, y) => fnv(`${p.join(",")}:${x}`) - fnv(`${p.join(",")}:${y}`) || (x < y ? -1 : 1));
}

// ---------------------------------------------------------------- functions

const D_DOM: [number, number][] = [[0, 4], [-6, 6], [-12, 12]];
const domOk = (p: number[]) => inDom(p, D_DOM) && (p[0] === 0 ? p[1] !== 0 : p[1] < p[2] && p[2] <= 6);
function domText([t, a, b]: number[]) {
  const q = poly([1, -(a + b), a * b]);
  return t === 0 ? `√(${lin(a, b)})` : t === 1 ? `1/(${q})` : t === 2 ? `√(${q})` : t === 3 ? `1/√(${q})` : `√(${poly([-1, a + b, -a * b])})`;
}
function domAnswer(t: number, a: number, b: number): string {
  if (t === 0) {
    const e = -b / a;
    return a > 0 ? ivs([[e, true, null, false]]) : ivs([[null, false, e, true]]);
  }
  return t === 1 ? ivs([[null, false, a, false], [a, false, b, false], [b, false, null, false]]) : t === 2 ? ivs([[null, false, a, true], [b, true, null, false]]) : t === 3 ? ivs([[null, false, a, false], [b, false, null, false]]) : ivs([[a, true, b, true]]);
}

const D_RANGE: [number, number][] = [[-3, 3], [-6, 6], [-9, 9]];
const rangeOk = (p: number[]) => inDom(p, D_RANGE) && p[0] !== 0;
const rangeCs = ([a, h, k]: number[]) => [a, -2 * a * h, a * h * h + k];
const ray = (v: number, up: boolean, closed = true) => (up ? ivs([[v, closed, null, false]]) : ivs([[null, false, v, closed]]));

/** [h, c, d, s]: f(x) = (x − h)² + c, written expanded, on the domain [d, ∞), into ℝ (s = 0), [c, ∞) (s = 1) or
 * [f(d), ∞) (s = 2). (Linear, cube and modulus functions on ℕ, ℤ, ℝ are the function-types family aqonto.) */
const D_FCL: [number, number][] = [[-5, 5], [-9, 9], [-5, 5], [0, 2]];
// (with d = h the codomains [c, ∞) and [f(d), ∞) are the same, so s = 2 is left out there)
const fclOk = (p: number[]) => inDom(p, D_FCL) && Math.abs(p[2] - p[0]) <= 3 && !(p[2] === p[0] && p[3] === 2);
const FCH = ["f is one-one and onto (a bijection)", "f is one-one but not onto", "f is onto but not one-one", "f is neither one-one nor onto"];
const fclCs = (h: number, c: number) => [1, -2 * h, h * h + c];
const fclAt = (h: number, c: number, x: number) => (x - h) ** 2 + c;
const fclCod = ([h, c, d, s]: number[]) => (s === 0 ? "ℝ" : `[${n_(s === 1 ? c : fclAt(h, c, d))}, ∞)`);
const fclIdx = (oo: boolean, onto: boolean) => (oo ? (onto ? 0 : 1) : onto ? 2 : 3);

const D_TR: [number, number][] = [[-5, 5], [-5, 5], [-5, 5], [-5, 5], [-3, 3], [-1, 1]];
const trOk = (p: number[]) => inDom(p, D_TR) && p[4] !== 0 && p[5] !== 0 && p[2] !== 0;
function trText([, , h, v, a, s]: number[]) {
  const inner = s === 1 ? fac(h) : h === 0 ? "−x" : `${n_(h)} − x`;
  const A = a === 1 ? "" : a === -1 ? "−" : n_(a);
  return `y = ${A}f(${inner})${v === 0 ? "" : v < 0 ? ` − ${-v}` : ` + ${v}`}`;
}

const D_STD: [number, number][] = [[-99, 99], [-99, 99], [0, 1]];
const stdOk = (p: number[]) => inDom(p, D_STD) && p[0] % 10 !== 0 && p[1] % 10 !== 0 && (p[0] < 0 || p[1] < 0);
const dec = (u: number) => `${u < 0 ? "−" : ""}${Math.floor(Math.abs(u) / 10)}.${Math.abs(u) % 10}`;

const D_COR: [number, number][] = [[1, 8], [1, 8], [1, 5], [1, 5], [1, 5], [1, 5]];
const corOk = (p: number[]) => inDom(p, D_COR) && p[2] * p[5] !== p[3] * p[4] && gcd(p[2], p[3]) === 1 && gcd(p[4], p[5]) === 1;

// ---------------------------------------------------------------- modulus and inequalities

const D_ABSE: [number, number][] = [[1, 6], [-12, 12], [1, 15]];
const D_ABSI: [number, number][] = [[1, 6], [-12, 12], [1, 12], [0, 3]];
function absIneqAnswer(L: number, R: number, r: number) {
  return r === 0 ? ivs([[L, false, R, false]]) : r === 1 ? ivs([[L, true, R, true]]) : r === 2 ? ivs([[null, false, L, false], [R, false, null, false]]) : ivs([[null, false, L, true], [R, true, null, false]]);
}
const between = (lo: number, hi: number, closed: boolean) => ivs([[lo, closed, hi, closed]]);
const outside = (lo: number, hi: number, closed: boolean) => ivs([[null, false, lo, closed], [hi, closed, null, false]]);
const cmp = (x: number, r: number) => (r === 0 ? x < 0 : r === 1 ? x <= 0 : r === 2 ? x > 0 : x >= 0);

const D_QIN: [number, number][] = [[-8, 8], [-8, 8], [0, 3], [-2, 2]];
const qinOk = (p: number[]) => inDom(p, D_QIN) && p[0] < p[1] && p[3] !== 0;
/** m(x − a)(x − b) op 0 → interval (a < b). */
function qinAnswer(a: number, b: number, r: number, m: number) {
  const out = (r >= 2) !== (m < 0);
  const closed = r % 2 === 1;
  return out ? outside(a, b, closed) : between(a, b, closed);
}
const D_RAT: [number, number][] = [[-8, 8], [-8, 8], [0, 3]];
const ratOk = (p: number[]) => inDom(p, D_RAT) && p[0] !== p[1];
function ratAnswer(a: number, b: number, r: number, closeB = false) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const cl = (v: number) => r % 2 === 1 && (v === a || closeB);
  return r >= 2 ? ivs([[null, false, lo, cl(lo)], [hi, cl(hi), null, false]]) : ivs([[lo, cl(lo), hi, cl(hi)]]);
}

// ---------------------------------------------------------------- partial fractions

const D_PF: [number, number][] = [[-6, 6], [-6, 6], [-6, 6], [-6, 6]];
const pfOk = (p: number[]) => inDom(p, D_PF) && p[0] < p[1] && p[2] !== 0 && p[3] !== 0;
const D_PFQ: [number, number][] = [[-5, 5], [1, 9], [-5, 5], [-5, 5], [-5, 5]];
const pfqOk = (p: number[]) => inDom(p, D_PFQ) && p[2] !== 0 && (p[3] !== 0 || p[4] !== 0);
const pfqNum = ([a, k, A, B, C]: number[]) => [A + B, C - a * B, A * k - a * C];

// ---------------------------------------------------------------- counting

const D_NPR: [number, number][] = [[3, 30], [2, 30]];
const nprOk = (p: number[]) => inDom(p, D_NPR) && p[1] <= p[0] && perm(p[0], p[1]) <= 1e6;
const D_NCR: [number, number][] = [[4, 20], [2, 18]];
const ncrOk = (p: number[]) => inDom(p, D_NCR) && p[1] <= p[0] - 2;
const D_COMM: [number, number][] = [[3, 9], [3, 9], [3, 6], [1, 5]];
const commOk = (p: number[]) => inDom(p, D_COMM) && p[3] < p[2] && p[3] <= p[1] && p[2] - p[3] <= p[0];
const D_MUL: [number, number][] = [[1, 5], [1, 5], [0, 4]];
const mulOk = (p: number[]) => inDom(p, D_MUL) && p[0] + p[1] + p[2] >= 4 && p[0] + p[1] + p[2] <= 11 && Math.max(...p) >= 2;
const flags = (c: number, col: string) => (c === 1 ? `1 ${col} flag` : `${c} identical ${col} flags`);

// ---------------------------------------------------------------- binomial theorem

const D_BCO: [number, number][] = [[-3, 3], [-3, 3], [3, 8], [1, 7]];
const bcoOk = (p: number[]) => inDom(p, D_BCO) && p[0] !== 0 && p[1] !== 0 && p[3] <= p[2] - 1;
const bco = (a: number, b: number, n: number, r: number) => choose(n, r) * a ** r * b ** (n - r);
const D_BEX: [number, number][] = [[1, 3], [-5, 5], [2, 5]];
const bexOk = (p: number[]) => inDom(p, D_BEX) && p[1] !== 0 && !(p[0] === 3 && p[2] === 5 && Math.abs(p[1]) > 3);
const bexCs = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => choose(n, n - i) * a ** (n - i) * b ** i);
const D_BIND: [number, number][] = [[1, 3], [1, 3], [-3, 3], [2, 12]];
const bindR = ([p, q, , n]: number[]) => (p * n) / (p + q);
const bindOk = (P: number[]) => {
  if (!inDom(P, D_BIND) || P[2] === 0) return false;
  const r = bindR(P);
  return Number.isInteger(r) && r >= 1 && r <= P[3] - 1 && Math.abs(choose(P[3], r) * P[2] ** r) <= 1e9;
};
const bindText = ([p, q, k, n]: number[]) => `(${xp(p)} ${k < 0 ? "−" : "+"} ${Math.abs(k)}/${xp(q)})${sup(n)}`;

// ---------------------------------------------------------------- progressions

const D_GP: [number, number][] = [[-9, 9], [-3, 3], [4, 10]];
const gpOk = (p: number[]) => inDom(p, D_GP) && p[0] !== 0 && Math.abs(p[1]) >= 2;
const D_GPS: [number, number][] = [[-9, 9], [-3, 3], [3, 9]];
const gpsOk = (p: number[]) => inDom(p, D_GPS) && p[0] !== 0 && Math.abs(p[1]) >= 2;
const gpSum = (a: number, r: number, n: number) => (a * (r ** n - 1)) / (r - 1);
const ORD = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;
/** a + b + c written with signs: 6 − 3 + 3/2. */
const series = (ts: number[]) => ts.map((t, i) => (i === 0 ? fr(t) : t < 0 ? ` − ${fr(-t)}` : ` + ${fr(t)}`)).join("");
const D_GPI: [number, number][] = [[-20, 20], [-4, 4], [2, 5]];
const gpiOk = (p: number[]) => inDom(p, D_GPI) && p[0] !== 0 && p[1] !== 0 && Math.abs(p[1]) < p[2] && gcd(Math.abs(p[1]), p[2]) === 1;
const D_AGP: [number, number][] = [[1, 9], [1, 6], [1, 3], [2, 5]];
const agpOk = (p: number[]) => inDom(p, D_AGP) && p[2] < p[3] && gcd(p[2], p[3]) === 1;
/** Remove floating error from a rational value (so 8.999… is 9). */
const clean = (x: number) => (Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : x);
const agpSum = (a: number, d: number, r: number) => clean(a / (1 - r) + (d * r) / (1 - r) ** 2);
const D_HM: [number, number][] = [[1, 30], [1, 30]];
const hmOk = (p: number[]) => inDom(p, D_HM) && p[0] < p[1];

// ---------------------------------------------------------------- logarithms

const D_LAW: [number, number][] = [[-2, 5], [0, 4], [-2, 2]];
const lawOk = (p: number[]) => inDom(p, D_LAW) && (p[0] - p[2] !== 0 || p[1] !== 0) && Math.abs(p[0]) + p[1] + Math.abs(p[2]) >= 2;
/** 2^i 3^j 5^k as a terminating decimal. */
function lawNumber([i, j, k]: number[]): { text: string; places: number } {
  const top = 2 ** Math.max(i, 0) * 3 ** j * 5 ** Math.max(k, 0);
  const d = Math.max(-i, -k, 0);
  const scaled = (top * 10 ** d) / (2 ** Math.max(-i, 0) * 5 ** Math.max(-k, 0));
  const s = String(Math.round(scaled)).padStart(d + 1, "0");
  return { text: d ? `${s.slice(0, s.length - d)}.${s.slice(s.length - d)}` : s, places: d };
}
const lawAnswer = (ca: number, cb: number, c0: number) => combo([[ca, "a"], [cb, "b"], [c0, ""]]);

const LB = [2, 3, 5, 7];
const D_LOG: [number, number][] = [[0, 3], [1, 6], [-8, 8]];
const logOk = (p: number[]) => inDom(p, D_LOG) && p[2] !== 0 && p[2] !== p[1] && LB[p[0]] ** Math.abs(p[2]) <= 3125 && LB[p[0]] ** p[1] <= 625;
const logArg = (c: number, j: number) => (j > 0 ? String(c ** j) : `(1/${c ** -j})`);

const EB = [2, 3, 5, 10, 4, 6, 7];
const D_LEQ: [number, number][] = [[0, 6], [1, 12], [1, 4096], [0, 1]];
const leqOk = (p: number[]) => {
  if (!inDom(p, D_LEQ)) return false;
  const P = EB[p[0]] ** p[1];
  return P <= 4096 && P % p[2] === 0 && p[2] * p[2] > P;
};
const logb = (B: number) => (B === 10 ? "log" : `log${sub(B)}`);

// ---------------------------------------------------------------- complex numbers

const D_CQ: [number, number][] = [[1, 3], [-8, 8], [1, 20]];
const cqOk = (p: number[]) => inDom(p, D_CQ) && p[1] * p[1] - 4 * p[0] * p[2] < 0 && gcd(gcd(p[0], Math.abs(p[1])), p[2]) === 1;
const D_CJ: [number, number][] = [[1, 3], [-6, 6], [1, 6]];
const cplx = (a: number, b: number) => `${a === 0 ? "" : `${n_(a)} + `}${b === 1 ? "" : b}i`;
const cconj = (a: number, b: number) => `${a === 0 ? "−" : `${n_(a)} − `}${b === 1 ? "" : b}i`;

export const B15: Def[] = [
  // ============================================================ sets
  {
    id: "aosetop",
    arity: 4,
    title: "Union, intersection, difference and complement of finite sets",
    competency: SETS,
    type: "set",
    parse: none,
    reject: (p) => (setopOk(p) ? null : "U = {1, …, N} with 10 ≤ N ≤ 20, A and B the multiples of two different numbers from 2 to 6, and a result with 1 to 12 elements."),
    prompt: ([N, a, b, op]) => `Let U = {1, 2, 3, …, ${N}}, A = {x ∈ U : x is a multiple of ${a}} and B = {x ∈ U : x is a multiple of ${b}}. List the elements of ${SETOPS[op]}, separated by commas.`,
    solve: ([N, a, b, op]) => {
      const ans = setop(N, a, b, op);
      return {
        steps: [
          { id: "A", op: "list", competency: SETS, inputs: [a, N], value: mults(N, a) },
          { id: "B", op: "list", competency: SETS, inputs: [b, N], value: mults(N, b) },
          { id: "combine", op: "combine", competency: SETS, inputs: [SETOPS[op]], value: ans },
        ],
        answer: ans,
      };
    },
    // independent: go through U element by element with a divisibility test
    validate: ([N, a, b, op], v) => {
      const want: number[] = [];
      for (let x = 1; x <= N; x++) {
        const A = x % a === 0;
        const B = x % b === 0;
        if ([A || B, A && B, A && !B, B && !A, !A && !B][op]) want.push(x);
      }
      return Array.isArray(v) && v.length === want.length && [...v].sort((x, y) => x - y).every((x, i) => x === want[i]);
    },
    bugs: ([N, a, b, op]) => {
      const S = (o: number) => setop(N, a, b, o);
      const out: Bug[] = [];
      if (op === 0) out.push({ id: "union-intersection", kind: "conceptual", competency: SETS, says: "A ∪ B was read as the elements in both sets; the union takes every element that is in A or in B (or both).", predict: orNull(S(1)) });
      if (op === 1) {
        out.push({ id: "union-intersection", kind: "conceptual", competency: SETS, says: "A ∩ B was read as all the elements of both sets together; the intersection keeps only the elements common to A and B.", predict: S(0) });
        const ab = a * b;
        const l = (a * b) / gcd(a, b);
        if (l !== ab && ab <= N) out.push({ id: "product-not-lcm", kind: "conceptual", competency: SETS, says: `The common multiples were taken as the multiples of ${a} × ${b} = ${ab}; numbers that are multiples of both ${a} and ${b} are the multiples of their LCM, ${l}.`, predict: mults(N, ab) });
      }
      if (op === 2 || op === 3) {
        out.push({ id: "difference-order", kind: "conceptual", competency: SETS, says: `The difference was taken the wrong way round; ${SETOPS[op]} keeps the elements of the first set that are not in the second.`, predict: orNull(S(op === 2 ? 3 : 2)) });
        out.push({ id: "common-not-removed", kind: "procedural", competency: SETS, says: `The common elements were not removed; ${SETOPS[op]} leaves out every element that is also in ${op === 2 ? "B" : "A"}.`, predict: op === 2 ? mults(N, a) : mults(N, b) });
      }
      if (op === 4) {
        out.push({ id: "complement-forgotten", kind: "procedural", competency: SETS, says: "The union was found but its complement was not taken; (A ∪ B)′ is everything in U outside A ∪ B.", predict: S(0) });
        out.push({ id: "de-morgan", kind: "conceptual", competency: SETS, says: "(A ∪ B)′ was taken as A′ ∪ B′; by De Morgan's law (A ∪ B)′ = A′ ∩ B′, the elements in neither set.", predict: S(5) });
      }
      return out;
    },
    variants: ([N, a, b, op]) => [[N, a, b, (op + 1) % 5], [N, b, a, op]].filter(setopOk),
    explain: (s) => (s.id === "A" ? `A = {${(s.value as number[]).join(", ")}}` : s.id === "B" ? `B = {${(s.value as number[]).join(", ")}}` : `${s.inputs[0]} = {${(s.value as number[]).join(", ")}}`),
    domain: D_SETOP,
    keep: setopOk,
    cap: 400,
    difficulty: ([, , , op]) => (op <= 1 ? 1 : op <= 3 ? 2 : 3),
    word: ([N, a, b, op]) => `The ${N} children in a class have roll numbers 1 to ${N}. Children whose roll number is a multiple of ${a} are in the kabaddi team, and children whose roll number is a multiple of ${b} are in the kho-kho team. List the roll numbers of the children who are ${SETWORD[op]}, separated by commas.`,
    teach: {
      idea: "A ∪ B collects every element in A or in B, A ∩ B keeps only the elements in both, A − B keeps what is in A but not in B, and the complement A′ is everything in U outside A.",
      method: "First write A and B in roster form. Then go through U one element at a time and decide, from the definition, whether it belongs to the set asked for.",
      alternatives: [
        { id: "venn", title: "Place the elements in a Venn diagram", kind: "conceptual", text: ["Draw two overlapping circles A and B inside a rectangle U and write each element of U in its region: A only, both, B only, or outside both.", "Then read off the regions the operation asks for: the union is all three circle regions, the intersection the middle, the complement of the union the outside."] },
        { id: "table", title: "A membership table", kind: "procedural", text: ["Make a row for each element with two columns, 'in A?' and 'in B?', filled with yes or no.", "Each operation is a rule on the two columns: ∪ needs at least one yes, ∩ two yeses, A − B yes then no."] },
      ],
    },
    limits: "U = {1, …, N} with N up to 20 and A, B the multiples of two numbers; drawing the Venn diagram is done on paper.",
  },
  {
    id: "aosub",
    arity: 3,
    title: "Counting subsets and proper subsets of a finite set",
    competency: SETS,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (subOk(p) ? null : "A set of 2 to 12 elements: all subsets, proper subsets, non-empty proper subsets, subsets of a given size, or subsets containing a given element."),
    prompt: ([n, q, r]) =>
      `A = ${setOf(n)}. ${["How many subsets does A have (that is, how many elements does the power set P(A) have)?", "How many proper subsets does A have?", "How many non-empty proper subsets does A have?", `How many subsets of A have exactly ${r} element${r === 1 ? "" : "s"}?`, "How many subsets of A contain the element a?"][q]}`,
    solve: ([n, q, r]) => {
      const steps: Step[] = [{ id: "power", op: "evaluate", competency: EXPN, inputs: [2, n], value: 2 ** n }];
      if (q === 3) steps.push({ id: "choose", op: "choose", competency: PERM, inputs: [n, r], value: choose(n, r) });
      else if (q > 0) steps.push({ id: "adjust", op: q === 4 ? "halve" : "subtract", competency: SETS, inputs: [q], value: subCount([n, q, r]) });
      return { steps, answer: subCount([n, q, r]) };
    },
    // independent: list every subset as a bit pattern and count the ones that qualify
    validate: ([n, q, r], v) => {
      let c = 0;
      const full = 2 ** n - 1;
      for (let m = 0; m <= full; m++) if ([true, m !== full, m !== 0 && m !== full, popcount(m) === r, (m & 1) === 1][q]) c++;
      return v === c;
    },
    bugs: ([n, q, r]) => {
      const all = 2 ** n;
      if (q === 0)
        return [
          { id: "double-not-power", kind: "conceptual", competency: SETS, says: `Each of the ${n} elements was counted twice (2 × ${n}); each element is either in or out of a subset, independently, so the count is 2 multiplied by itself ${n} times.`, predict: 2 * n },
          { id: "empty-or-whole-left-out", kind: "conceptual", competency: SETS, says: "The empty set (or A itself) was left out; both ∅ and A are subsets of A.", predict: all - 1 },
        ];
      if (q === 1)
        return [
          { id: "whole-set-included", kind: "conceptual", competency: SETS, says: "A itself was counted; a proper subset of A must be different from A.", predict: all },
          { id: "empty-removed", kind: "conceptual", competency: SETS, says: "The empty set was removed as well; ∅ is a proper subset of every non-empty set.", predict: all - 2 },
        ];
      if (q === 2)
        return [
          { id: "one-removed", kind: "procedural", competency: SETS, says: "Only one of ∅ and A was removed; non-empty proper subsets leave out both.", predict: all - 1 },
          { id: "none-removed", kind: "procedural", competency: SETS, says: "All the subsets were counted; ∅ and A must both be removed.", predict: all },
        ];
      if (q === 3)
        return [
          { id: "order-counted", kind: "conceptual", competency: PERM, says: `The ${r} elements were counted in order (${sup(n)}P${sub(r)}); a subset has no order, so it is ${sup(n)}C${sub(r)}.`, predict: perm(n, r) },
          { id: "all-subsets", kind: "procedural", competency: SETS, says: `All subsets were counted; only those with exactly ${r} element${r === 1 ? "" : "s"} are asked for.`, predict: all },
        ];
      return [
        { id: "all-subsets", kind: "procedural", competency: SETS, says: "Every subset was counted; only half of them contain a (pair each subset with the same subset with a added or removed).", predict: all },
        { id: "one-per-element", kind: "conceptual", competency: SETS, says: `Only the ${n} subsets of the form {a} and {a, x} were counted; a can be joined by any subset of the other ${n - 1} elements.`, predict: n },
      ];
    },
    variants: ([n, q, r]) => [[n + 1, q, r], [n, (q + 1) % 3, 0]].filter(subOk),
    explain: (s) => (s.id === "power" ? `Each of the ${s.inputs[1]} elements is either in a subset or not: 2${sup(Number(s.inputs[1]))} = ${s.value} subsets` : s.id === "choose" ? `Choose ${s.inputs[1]} of the ${s.inputs[0]} elements: ${sup(Number(s.inputs[0]))}C${sub(Number(s.inputs[1]))} = ${s.value}` : `So the number asked for is ${s.value}`),
    domain: D_SUB,
    keep: subOk,
    difficulty: ([n, q]) => (q === 0 && n <= 5 ? 1 : q <= 2 ? 2 : 3),
    word: ([n, q, r]) =>
      `A dosa stall lets you add any of ${n} different toppings. ${["Counting the plain dosa with no toppings, how many different dosas can be ordered?", "How many different choices of toppings leave out at least one of the toppings (the plain dosa counts)?", "How many different choices have at least one topping but not all of them?", `How many different dosas have exactly ${r} topping${r === 1 ? "" : "s"}?`, "One of the toppings is cheese. How many different choices of toppings include cheese?"][q]}`,
    teach: {
      idea: "Building a subset means deciding, for each element, in or out: two choices per element, so a set of n elements has 2ⁿ subsets, including ∅ and the set itself.",
      method: "Count all subsets as 2ⁿ, then remove what the question excludes: A itself for proper subsets, ∅ as well for non-empty proper subsets. Subsets of a fixed size r are ⁿCᵣ.",
      alternatives: [
        { id: "list-small", title: "List a small case", kind: "conceptual", text: ["For {a, b}: ∅, {a}, {b}, {a, b} — four subsets, 2².", "Adding an element c doubles the list: every old subset, and every old subset with c added."] },
      ],
    },
    limits: "Sets of 2 to 12 elements; power sets of power sets are left out.",
  },
  {
    id: "aoinex",
    arity: 4,
    title: "Counting with n(A ∪ B) = n(A) + n(B) − n(A ∩ B)",
    competency: SETS,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (inexOk(p) ? null : "n(A) and n(B) from 8 to 60 with a smaller, non-zero n(A ∩ B)."),
    prompt: ([a, b, c, k]) => (k === 0 ? `For finite sets A and B, n(A) = ${a}, n(B) = ${b} and n(A ∩ B) = ${c}. Find n(A ∪ B).` : `For finite sets A and B, n(A) = ${a}, n(B) = ${b} and n(A ∪ B) = ${a + b - c}. Find ${k === 1 ? "n(A ∩ B)" : "n(A − B)"}.`),
    solve: ([a, b, c, k]) => {
      const steps: Step[] = [{ id: "formula", op: k === 0 ? "add" : "subtract", competency: SETS, inputs: [a, b, k === 0 ? c : a + b - c], value: k === 0 ? a + b - c : c }];
      if (k === 2) steps.push({ id: "only", op: "subtract", competency: SETS, inputs: [a, c], value: a - c });
      return { steps, answer: k === 0 ? a + b - c : k === 1 ? c : a - c };
    },
    // independent: search for the size of the overlap that fits the counts, then add up the regions
    validate: ([a, b, c, k], v) => {
      const u = a + b - c;
      for (let x = 0; x <= Math.min(a, b); x++) {
        const onlyA = a - x;
        const onlyB = b - x;
        if (k === 0 ? x === c : onlyA + onlyB + x === u) return v === (k === 0 ? onlyA + onlyB + x : k === 1 ? x : onlyA);
      }
      return false;
    },
    bugs: ([a, b, c, k]) => {
      const u = a + b - c;
      if (k === 0)
        return [
          { id: "common-twice", kind: "conceptual", competency: SETS, says: `n(A) and n(B) were added; the ${c} common elements are then counted twice, once in each set.`, predict: a + b },
          { id: "common-removed-twice", kind: "procedural", competency: SETS, says: "n(A ∩ B) was taken away twice; it is counted twice in n(A) + n(B), so it is taken away once.", predict: a + b - 2 * c },
        ];
      if (k === 1)
        return [
          { id: "only-part", kind: "conceptual", competency: SETS, says: "n(A ∪ B) − n(B) (or n(A ∪ B) − n(A)) was given; that counts the elements in only one of the sets, not those in both.", predict: [u - b, u - a] },
        ];
      return [
        { id: "common-not-removed", kind: "conceptual", competency: SETS, says: "n(A) was given; A − B leaves out the elements of A that are also in B.", predict: a },
        { id: "wrong-set", kind: "procedural", competency: SETS, says: "n(A ∪ B) − n(A) was found; that is n(B − A), not n(A − B).", predict: u - a },
        { id: "intersection-given", kind: "procedural", competency: SETS, says: "n(A ∩ B) was found and given; take it away from n(A) to get n(A − B).", predict: c },
      ];
    },
    variants: ([a, b, c, k]) => [[a, b, c, (k + 1) % 3]].filter(inexOk),
    explain: (s) => (s.id === "only" ? `n(A − B) = n(A) − n(A ∩ B) = ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : s.op === "add" ? `n(A ∪ B) = ${s.inputs[0]} + ${s.inputs[1]} − ${s.inputs[2]} = ${s.value}` : `n(A ∩ B) = n(A) + n(B) − n(A ∪ B) = ${s.inputs[0]} + ${s.inputs[1]} − ${s.inputs[2]} = ${s.value}`),
    domain: D_INEX,
    keep: inexOk,
    cap: 300,
    difficulty: ([, , , k]) => (k === 0 ? 1 : k === 1 ? 2 : 3),
    word: ([a, b, c, k]) =>
      k === 0
        ? `In a survey of families in a Madurai street, ${a} families read a Tamil newspaper, ${b} read an English newspaper and ${c} read both. How many families read at least one of the two newspapers?`
        : `In a survey of families in a Madurai street, ${a} families read a Tamil newspaper, ${b} read an English newspaper and ${a + b - c} read at least one of the two. How many families read ${k === 1 ? "both newspapers" : "only the Tamil newspaper"}?`,
    teach: {
      idea: "When n(A) and n(B) are added, the elements in both sets are counted twice, so n(A ∪ B) = n(A) + n(B) − n(A ∩ B).",
      method: "Write the formula, put in the three numbers you know and solve for the fourth. For 'A only', take n(A ∩ B) away from n(A).",
      alternatives: [
        { id: "venn-regions", title: "Fill the Venn regions from the middle", kind: "conceptual", text: ["Write n(A ∩ B) in the overlap first.", "Then A only = n(A) − overlap and B only = n(B) − overlap; the union is the three regions added."] },
      ],
    },
    limits: "Two sets only; three-set problems are another family.",
  },
  // ============================================================ relations
  {
    id: "aocart",
    arity: 3,
    title: "Counting elements of A × B and relations from A to B",
    competency: REL,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (cartOk(p) ? null : "Sets of 1 to 10 elements; for counting relations, n(A) × n(B) at most 12."),
    prompt: ([m, n, q]) => (q === 0 ? `A = ${nums(m)} and B = ${lets(n)}. How many ordered pairs are in A × B?` : q === 1 ? `A = ${nums(m)} and B = ${lets(n)}. How many relations are there from A to B?` : `A = ${nums(m)} and n(A × B) = ${m * n}. How many elements does B have?`),
    solve: ([m, n, q]) => {
      const steps: Step[] = [{ id: "pairs", op: q === 2 ? "divide" : "multiply", competency: REL, inputs: q === 2 ? [m * n, m] : [m, n], value: q === 2 ? n : m * n }];
      if (q === 1) steps.push({ id: "subsets", op: "evaluate", competency: EXPN, inputs: [2, m * n], value: 2 ** (m * n) });
      return { steps, answer: q === 0 ? m * n : q === 1 ? 2 ** (m * n) : n };
    },
    // independent: build the pairs one by one; count subsets of them by doubling; search for n(B)
    validate: ([m, n, q], v) => {
      if (q === 2) {
        for (let x = 1; x <= 20; x++) if (m * x === m * n) return v === x;
        return false;
      }
      let pairs = 0;
      for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) pairs++;
      if (q === 0) return v === pairs;
      let rels = 1;
      for (let i = 0; i < pairs; i++) rels += rels;
      return v === rels;
    },
    bugs: ([m, n, q]) =>
      q === 0
        ? [{ id: "added", kind: "conceptual", competency: REL, says: `n(A) and n(B) were added; each of the ${m} elements of A pairs with each of the ${n} elements of B, so they multiply.`, predict: m + n }]
        : q === 1
          ? [
              { id: "pairs-not-subsets", kind: "conceptual", competency: REL, says: "The number of ordered pairs was given; a relation is any subset of A × B, and a set of mn pairs has 2^(mn) subsets.", predict: m * n },
              { id: "power-of-sum", kind: "procedural", competency: REL, says: `2 was raised to n(A) + n(B); A × B has ${m} × ${n} = ${m * n} pairs, so the count is 2^${m * n}.`, predict: 2 ** (m + n) },
              { id: "empty-relation-left-out", kind: "conceptual", competency: REL, says: "The empty relation was left out; ∅ is a subset of A × B, so it is a relation too.", predict: 2 ** (m * n) - 1 },
            ]
          : [{ id: "subtracted", kind: "conceptual", competency: REL, says: `n(A) was subtracted from n(A × B); n(A × B) = n(A) × n(B), so divide by ${m}.`, predict: m * n - m }],
    variants: ([m, n, q]) => [[m, n, (q + 1) % 3]].filter(cartOk),
    explain: (s) => (s.id === "subsets" ? `A relation is any subset of the ${s.inputs[1]} pairs: 2^${s.inputs[1]} = ${s.value}` : s.op === "divide" ? `n(B) = n(A × B) ÷ n(A) = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}` : `n(A × B) = n(A) × n(B) = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: D_CART,
    keep: cartOk,
    difficulty: ([, , q]) => (q === 0 ? 1 : q === 2 ? 2 : 3),
    word: ([m, n, q]) =>
      q === 0
        ? `A tiffin centre makes ${pl(m, "kind", "kinds")} of dosa and ${pl(n, "kind", "kinds")} of chutney. A plate is one dosa with one chutney. How many different plates are possible?`
        : q === 1
          ? `${m === 1 ? "A student says" : `Each of ${m} students says`}, for ${n === 1 ? "one game" : `each of ${n} games`}, whether or not they like it. How many different sets of answers are possible${m === 1 ? "" : " for the whole group"}?`
          : `A tiffin centre makes ${pl(m, "kind", "kinds")} of dosa. A plate is one dosa with one chutney, and ${m * n} different plates are possible. How many kinds of chutney are there?`,
    teach: {
      idea: "A × B is the set of all ordered pairs (a, b) with a in A and b in B, so n(A × B) = n(A) × n(B). A relation from A to B is any subset of A × B.",
      method: "Multiply the sizes for the product. For the number of relations, raise 2 to the power n(A) × n(B).",
      alternatives: [{ id: "grid", title: "Draw the pairs as a grid", kind: "conceptual", text: ["Write A down the side and B along the top: each cell is one ordered pair.", "The grid has n(A) rows and n(B) columns; a relation is a choice of cells to tick."] }],
    },
    limits: "Two finite sets of up to 10 elements; products of three sets are not included.",
  },
  {
    id: "aorel",
    arity: 3,
    title: "Is a relation given by a rule reflexive, symmetric, transitive?",
    competency: REL,
    type: "choice",
    parse: none,
    // [rule, k, n]: R = {(a, b) : a, b ∈ {1, …, n}, rule} (RRULES)
    reject: (p) => (relOk(p) ? null : "A relation on {1, …, n} (n from 3 to 8) given by one of nine rules."),
    prompt: (p) => `On the set A = ${p[2] <= 5 ? `{${Array.from({ length: p[2] }, (_, i) => i + 1).join(", ")}}` : `{1, 2, …, ${p[2]}}`}, the relation R = ${relText(p)}. Which statement is true?`,
    choices: (p) => relChoices(p),
    solve: (p) => {
      const { r, s, t } = relProps(p);
      return {
        steps: [
          { id: "reflexive", op: "check", competency: REL, inputs: ["(a, a) for every a"], value: r ? 1 : 0 },
          { id: "symmetric", op: "check", competency: REL, inputs: ["(a, b) → (b, a)"], value: s ? 1 : 0 },
          { id: "transitive", op: "check", competency: REL, inputs: ["(a, b), (b, c) → (a, c)"], value: t ? 1 : 0 },
        ],
        answer: relChoices(p).indexOf(relLabel(r, s, t)),
      };
    },
    // independent: the relation as a 0–1 matrix: diagonal, transpose, and the boolean square M² ≤ M
    validate: (p, v) => {
      const n = p[2];
      const I = Array.from({ length: n }, (_, i) => i);
      const M = I.map((i) => I.map((j) => (RRULES[p[0]][1](i + 1, j + 1, relK(p)) ? 1 : 0)));
      const r = M.every((row, i) => row[i] === 1);
      const s = M.every((row, i) => row.every((x, j) => x === M[j][i]));
      const t = M.every((row, i) => row.every((x, j) => x === 1 || !I.some((k) => M[i][k] === 1 && M[k][j] === 1)));
      return typeof v === "number" && relChoices(p)[v] === relLabel(r, s, t);
    },
    bugs: (p) => {
      const { r, s, t, fails, ps, missing, noRev } = relProps(p);
      const ch = relChoices(p);
      const out: Bug[] = [];
      if (!r && ps.some(([a, b]) => a === b)) out.push({ id: "some-diagonal", kind: "conceptual", competency: REL, says: `Some pairs (a, a) are in R, so R was called reflexive; reflexive needs (a, a) for every a in A, and (${missing[0]}, ${missing[0]}) is not in R.`, predict: ch.indexOf(relLabel(!r, s, t)) });
      if (!s && ps.some(([a, b]) => a !== b && ps.some(([x, y]) => x === b && y === a))) out.push({ id: "some-pairs-checked", kind: "procedural", competency: REL, says: `Only some pairs were checked for symmetry; (${noRev[0][0]}, ${noRev[0][1]}) is in R but (${noRev[0][1]}, ${noRev[0][0]}) is not.`, predict: ch.indexOf(relLabel(r, !s, t)) });
      if (!t) {
        const onlySame = fails.every(([a, , c]) => a === c);
        const [a, b, c] = onlySame ? fails[0] : fails.find(([x, , z]) => x !== z)!;
        out.push(
          onlySame
            ? { id: "transitive-a-equals-c", kind: "conceptual", competency: REL, says: `Chains that come back to the start were skipped: (${a}, ${b}) and (${b}, ${c}) in R need (${a}, ${c}) in R too.`, predict: ch.indexOf(relLabel(r, s, !t)) }
            : { id: "chain-missed", kind: "procedural", competency: REL, says: `A chain was missed: (${a}, ${b}) and (${b}, ${c}) are in R, but (${a}, ${c}) is not.`, predict: ch.indexOf(relLabel(r, s, !t)) },
        );
      }
      return out;
    },
    variants: ([rule, k, n]) => [[rule, k, n + 1], [rule, k + 1, n]].filter(relOk),
    explain: (s) => (s.id === "reflexive" ? `Reflexive (every (a, a) in R): ${s.value ? "yes" : "no"}` : s.id === "symmetric" ? `Symmetric (each (a, b) has its (b, a)): ${s.value ? "yes" : "no"}` : `Transitive (each chain (a, b), (b, c) has its (a, c)): ${s.value ? "yes" : "no"}`),
    domain: D_REL,
    keep: relOk,
    difficulty: ([rule]) => (rule === 1 || rule === 2 || rule === 5 ? 1 : rule === 0 || rule === 4 || rule === 6 ? 2 : 3),
    teach: {
      idea: "Reflexive: every element is related to itself. Symmetric: whenever (a, b) is in R, so is (b, a). Transitive: whenever (a, b) and (b, c) are in R, so is (a, c) — including chains with a = c.",
      method: "Test the rule itself: put b = a for reflexive; swap a and b for symmetric; for transitive, take a chain (a, b), (b, c) and check (a, c). A single counter-example from A is enough to say 'not'.",
      alternatives: [
        { id: "list", title: "List the pairs first", kind: "procedural", text: ["Write out R as a list of pairs by going through every a and b in A.", "Then check (a, a) for every a, the reverse of every pair, and every chain (a, b), (b, c)."] },
        { id: "matrix", title: "Write R as a table", kind: "procedural", text: ["Put a 1 in row a, column b when (a, b) is in R.", "Reflexive: 1s all along the diagonal. Symmetric: the table equals its mirror image across the diagonal. Transitive: whenever row a has a 1 in column b and row b has a 1 in column c, row a has a 1 in column c."], visual: (p) => ({ type: "table", head: ["R", ...Array.from({ length: p[2] }, (_, j) => String(j + 1))], rows: Array.from({ length: p[2] }, (_, i) => [String(i + 1), ...Array.from({ length: p[2] }, (_, j) => (RRULES[p[0]][1](i + 1, j + 1, relK(p)) ? "1" : "0"))]) }) },
      ],
    },
    limits: "Relations on {1, …, n} for n ≤ 8 given by a rule; relations given as a list of pairs are the relation-properties family (aqrel), and proofs on infinite sets are written work for an educator.",
  },
  // ============================================================ functions
  {
    id: "aodom",
    arity: 3,
    title: "The domain of a real function",
    competency: FUN,
    type: "interval",
    mc: true,
    parse: none,
    reject: (p) => (domOk(p) ? null : "√(ax + b), or 1/q(x), √q(x), 1/√q(x) or √(−q(x)) for q(x) = (x − a)(x − b) with whole-number roots a < b."),
    prompt: (p) => `Find the domain of the real function f(x) = ${domText(p)}. Write it in interval notation.`,
    solve: ([t, a, b]) => {
      const ans = domAnswer(t, a, b);
      const steps: Step[] =
        t === 0
          ? [
              { id: "condition", op: "write", competency: FUN, inputs: [`${lin(a, b)} ≥ 0`], value: `${lin(a, b)} ≥ 0` },
              { id: "solve", op: "solve", competency: INEQ, inputs: [a, b], value: ans },
            ]
          : [
              { id: "factor", op: "factorise", competency: FACT, inputs: [a, b], value: `${prod2(a, b)}` },
              { id: "condition", op: "write", competency: FUN, inputs: [["≠ 0", "≥ 0", "> 0", "≤ 0"][t - 1]], value: ans },
              { id: "solve", op: "solve", competency: NLI, inputs: [a, b], value: ans },
            ];
      return { steps, answer: ans };
    },
    // independent: test every x = k/120 in [−30, 30] in the defining condition, in whole numbers
    validate: ([t, a, b], v) =>
      agrees(v, (k, N) => {
        if (t === 0) return a * k + b * N >= 0;
        const q = (k - a * N) * (k - b * N);
        return t === 1 ? q !== 0 : t === 2 ? q >= 0 : t === 3 ? q > 0 : q <= 0;
      }),
    bugs: ([t, a, b]) => {
      if (t === 0) {
        const e = -b / a;
        const out: Bug[] = [{ id: "end-left-out", kind: "procedural", competency: FUN, says: `x = ${fr(e)} was left out; √0 = 0 is a real number, so the end point belongs to the domain.`, predict: a > 0 ? ivs([[e, false, null, false]]) : ivs([[null, false, e, false]]) }];
        if (a < 0) out.push({ id: "sign-not-reversed", kind: "conceptual", competency: INEQ, says: `Both sides were divided by ${n_(a)} without reversing the inequality; dividing by a negative number reverses it.`, predict: ivs([[e, true, null, false]]) });
        if (b !== 0) out.push({ id: "b-sign", kind: "procedural", competency: LIN, says: `${Math.abs(b)} was moved across without changing its sign.`, predict: a > 0 ? ivs([[b / a, true, null, false]]) : ivs([[null, false, b / a, true]]) });
        return out;
      }
      const neg: Bug = { id: "root-signs", kind: "procedural", competency: FACT, says: `The roots were read with the wrong signs: ${poly([1, -(a + b), a * b])} = ${prod2(a, b)} is zero at x = ${n_(a)} and x = ${n_(b)}.`, predict: domAnswer(t, -b, -a) };
      if (t === 1) return [{ id: "root-rule-used", kind: "conceptual", competency: FUN, says: "The quadratic was made positive, as under a square root; a denominator only has to be non-zero, so just x = a and x = b are removed.", predict: domAnswer(3, a, b) }, neg];
      if (t === 2) return [{ id: "sign-region", kind: "conceptual", competency: NLI, says: `The interval between the roots was chosen; ${prod2(a, b)} is negative there and ≥ 0 outside.`, predict: ivs([[a, true, b, true]]) }, { id: "ends-left-out", kind: "procedural", competency: FUN, says: "The roots were left out; √0 = 0 is defined, so they belong to the domain.", predict: domAnswer(3, a, b) }, neg];
      if (t === 3) return [{ id: "denominator-zero", kind: "conceptual", competency: FUN, says: `The roots ${n_(a)} and ${n_(b)} were included; there the denominator is √0 = 0.`, predict: domAnswer(2, a, b) }, { id: "sign-region", kind: "conceptual", competency: NLI, says: "The interval between the roots was chosen; the quadratic is negative there.", predict: ivs([[a, false, b, false]]) }, neg];
      return [{ id: "minus-ignored", kind: "conceptual", competency: NLI, says: `The minus sign in front of x² was ignored; ${poly([-1, a + b, -a * b])} = ${bx(a)}(${n_(b)} − x) is ≥ 0 between the roots.`, predict: domAnswer(2, a, b) }, { id: "ends-left-out", kind: "procedural", competency: FUN, says: "The roots were left out; √0 = 0 is defined.", predict: ivs([[a, false, b, false]]) }, neg];
    },
    distractors: ([t, a, b]) => (t === 0 ? ["(−∞, ∞)", a > 0 ? ivs([[null, false, -b / a, true]]) : ivs([[-b / a, true, null, false]])] : ["(−∞, ∞)", ivs([[a, false, b, false]]), ivs([[null, false, a, true], [b, false, null, false]])]),
    variants: ([t, a, b]) => [[(t + 1) % 5, a, b]].filter(domOk),
    explain: (s) => (s.id === "factor" ? `Factorise: ${s.value}` : s.id === "condition" ? (s.inputs.length === 1 && typeof s.inputs[0] === "string" && s.inputs[0].includes("x") ? `The quantity under the root must be non-negative: ${s.value}` : `Condition on (x − a)(x − b): ${s.inputs[0]}`) : `Solve the condition: x ∈ ${s.value}`),
    domain: D_DOM,
    keep: domOk,
    cap: 450,
    difficulty: ([t, a]) => (t === 0 && a > 0 ? 1 : t <= 1 ? 2 : 3),
    teach: {
      idea: "The domain of a real function is every real x for which the formula gives a real number: what is under a square root must be ≥ 0, and a denominator must not be 0.",
      method: "Write the condition (≥ 0, > 0 or ≠ 0), factorise any quadratic, decide the sign of each region between the roots, and write the answer in interval notation.",
      alternatives: [
        { id: "sign-chart", title: "A sign chart", kind: "procedural", text: ["Mark the roots on a number line; they cut it into regions.", "Pick one number in each region and find the sign of the quadratic there; keep the regions that meet the condition, and decide each end point separately."], visual: ([, a, b]) => ({ type: "numberline", from: Math.min(a, b) - 3, to: Math.max(a, b) + 3, marks: [a, b] }) },
        { id: "test-points", title: "Test numbers in f", kind: "conceptual", text: ["Try a few values of x in the formula: if you need the square root of a negative number, or divide by zero, x is not in the domain.", "The boundary values are where the quantity is exactly 0: test them separately."] },
      ],
    },
    limits: "Square roots of linear expressions and quadratics with whole-number roots; logarithmic and trigonometric domains are other families.",
  },
  {
    id: "aorange",
    arity: 3,
    title: "The range of a quadratic function",
    competency: FUN,
    type: "interval",
    mc: true,
    parse: none,
    reject: (p) => (rangeOk(p) ? null : "f(x) = a(x − h)² + k written out, with a from −3 to 3 (not 0)."),
    prompt: (p) => `Find the range of f : ℝ → ℝ, f(x) = ${poly(rangeCs(p))}. Write it in interval notation.`,
    solve: ([a, h, k]) => ({
      steps: [
        { id: "vertex", op: "complete-square", competency: QUAD, inputs: [a, h, k], value: `${a === 1 ? "" : a === -1 ? "−" : n_(a)}${bx(h)}² ${k < 0 ? "−" : "+"} ${Math.abs(k)}` },
        { id: "extreme", op: "evaluate", competency: FUN, inputs: [h, a > 0 ? "least" : "greatest"], value: k },
      ],
      answer: ray(k, a > 0),
    }),
    // independent: scan f over a fine grid for its least (or greatest) value and check the answer is the ray from it
    validate: ([a, h, k], v) => {
      const cs = rangeCs([a, h, k]);
      let ext = a > 0 ? Infinity : -Infinity;
      for (let i = -2400; i <= 2400; i++) {
        const x = i / 120;
        const y = cs[0] * x * x + cs[1] * x + cs[2];
        ext = a > 0 ? Math.min(ext, y) : Math.max(ext, y);
      }
      const iv = readIv(v);
      if (!iv || iv.length !== 1) return false;
      const [{ lo, lc, hi, hc }] = iv;
      return a > 0 ? !!lo && lc && hi === null && near(lo[0] / lo[1], ext) : !!hi && hc && lo === null && near(hi[0] / hi[1], ext);
    },
    bugs: ([a, h, k]) => {
      const c = a * h * h + k;
      return [
        { id: "f-at-zero", kind: "conceptual", competency: FUN, says: `f(0) = ${n_(c)} was taken as the ${a > 0 ? "least" : "greatest"} value; the extreme value is at the vertex, x = ${n_(h)}.`, predict: ray(c, a > 0) },
        { id: "direction", kind: "conceptual", competency: QUAD, says: `The parabola was taken to open the other way; with a ${a > 0 ? "positive" : "negative"} x² coefficient f has a ${a > 0 ? "least" : "greatest"} value.`, predict: ray(k, a < 0) },
        { id: "end-open", kind: "procedural", competency: FUN, says: `${n_(k)} was left out; f(${n_(h)}) = ${n_(k)}, so it is in the range.`, predict: ray(k, a > 0, false) },
        { id: "x-for-y", kind: "conceptual", competency: FUN, says: `The x-coordinate of the vertex (${n_(h)}) was used; the range is about the values of f, so use f(${n_(h)}).`, predict: h !== k ? ray(h, a > 0) : null },
        ...(h !== 0 ? [{ id: "vertex-sign", kind: "procedural", competency: QUAD, says: `The vertex was put at x = ${n_(-h)}; it is at x = −b/(2a) = ${n_(h)}.`, predict: ray(4 * a * h * h + k, a > 0) } as Bug] : []),
      ];
    },
    distractors: ([, , k]) => ["(−∞, ∞)", ray(k + 1, true), ray(k - 1, false)],
    variants: ([a, h, k]) => [[-a, h, k], [a, h + 1, k]].filter(rangeOk),
    explain: (s) => (s.id === "vertex" ? `Complete the square: f(x) = ${s.value}` : `The square is never negative, so the ${s.inputs[1]} value is f(${n_(Number(s.inputs[0]))}) = ${n_(Number(s.value))}`),
    domain: D_RANGE,
    keep: rangeOk,
    cap: 300,
    difficulty: ([a, h]) => (a === 1 ? 1 : a > 0 || h === 0 ? 2 : 3),
    teach: {
      idea: "Writing f(x) = a(x − h)² + k shows the range: (x − h)² takes every value ≥ 0, so f takes every value from k upwards when a > 0, and from k downwards when a < 0.",
      method: "Complete the square (or find the vertex at x = −b/(2a)), work out k = f(h), and write [k, ∞) or (−∞, k].",
      alternatives: [{ id: "vertex-formula", title: "Use the vertex formula", kind: "procedural", text: ["For ax² + bx + c the vertex is at x = −b/(2a).", "Substitute it to get the least (a > 0) or greatest (a < 0) value; the range is the ray from there."] }],
    },
    limits: "Quadratics on all of ℝ with whole-number vertices; ranges on restricted domains and of rational functions are other families.",
  },
  {
    id: "aofclass",
    arity: 4,
    title: "Is a quadratic on a restricted domain one-one, onto, both or neither?",
    competency: FUN,
    type: "choice",
    parse: none,
    reject: (p) => (fclOk(p) ? null : "f(x) = (x − h)² + c (written out) on [d, ∞) with |d − h| ≤ 3, into ℝ, [c, ∞) or [f(d), ∞)."),
    prompt: (p) => `Let f : [${n_(p[2])}, ∞) → ${fclCod(p)} be given by f(x) = ${poly(fclCs(p[0], p[1]))}. Which statement is true?`,
    choices: () => FCH,
    solve: ([h, c, d, s]) => {
      const oo = d >= h;
      const onto = s === 2 || (s === 1 && d <= h);
      return {
        steps: [
          { id: "vertex", op: "complete-square", competency: QUAD, inputs: [h, c], value: `${bx(h)}²${c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}`}` },
          { id: "one-one", op: "check", competency: FUN, inputs: [h, d], value: oo ? 1 : 0 },
          { id: "onto", op: "check", competency: FUN, inputs: [d >= h ? fclAt(h, c, d) : c, s], value: onto ? 1 : 0 },
        ],
        answer: fclIdx(oo, onto),
      };
    },
    // independent: sample points for one-one (half-steps catch the mirror pairs); scan the domain for a solution of
    // f(x) = y for sample y in the codomain
    validate: ([h, c, d, s], v) => {
      const f = (x: number) => x * x - 2 * h * x + h * h + c;
      const xs = Array.from({ length: 25 }, (_, j) => d + j / 2);
      let oo = true;
      for (const x of xs) for (const y of xs) if (x !== y && Math.abs(f(x) - f(y)) < 1e-12) oo = false;
      const lo = s === 1 ? c : f(d);
      const ys = s === 0 ? [c - 40, c - 1, c, f(d), f(d) + 5] : [lo, lo + 0.5, lo + 3, lo + 20];
      const hit = (y: number) => {
        for (let i = 0; i < 12000; i++) {
          const u = f(d + i / 200) - y;
          const w = f(d + (i + 1) / 200) - y;
          if (Math.abs(u) < 1e-12 || u * w < 0) return true;
        }
        return false;
      };
      return v === fclIdx(oo, ys.every(hit));
    },
    bugs: ([h, c, d, s]) => {
      const oo = d >= h;
      const onto = s === 2 || (s === 1 && d <= h);
      const least = d >= h ? fclAt(h, c, d) : c;
      const out: Bug[] = [];
      if (!oo) out.push({ id: "vertex-inside", kind: "conceptual", competency: FUN, says: `The vertex x = ${n_(h)} was not compared with the domain; it lies inside [${n_(d)}, ∞), so f goes down and then up: f(${n_(d)}) = f(${n_(2 * h - d)}) = ${fclAt(h, c, d)}.`, predict: fclIdx(true, onto) });
      if (oo) out.push({ id: "square-never-one-one", kind: "conceptual", competency: FUN, says: `A quadratic was taken as never one-one; here the domain starts at ${n_(d)}, ${d === h ? "the vertex" : "to the right of the vertex"} x = ${n_(h)}, so f only increases and different inputs give different outputs.`, predict: fclIdx(false, onto) });
      if (s === 1 && d > h) out.push({ id: "vertex-value-reached", kind: "conceptual", competency: FUN, says: `The least value ${n_(c)} (at the vertex x = ${n_(h)}) was taken as reached; x = ${n_(h)} is not in the domain, so f only reaches values from f(${n_(d)}) = ${fclAt(h, c, d)} upwards.`, predict: fclIdx(oo, true) });
      if (s === 0) out.push({ id: "codomain-as-range", kind: "conceptual", competency: FUN, says: `The range was taken to be all of ℝ; on this domain f never goes below ${n_(least)}.`, predict: fclIdx(oo, true) });
      return out;
    },
    variants: ([h, c, d, s]) => [[h, c, d, (s + 1) % 3], [h, c, d + 1, s]].filter(fclOk),
    explain: (s) => (s.id === "vertex" ? `Complete the square: f(x) = ${s.value}, so the vertex is at x = ${n_(Number(s.inputs[0]))}` : s.id === "one-one" ? `One-one (the domain starts at ${n_(Number(s.inputs[1]))}, ${Number(s.inputs[1]) >= Number(s.inputs[0]) ? "not left of" : "left of"} the vertex): ${s.value ? "yes" : "no"}` : `Onto (the range is [${n_(Number(s.inputs[0]))}, ∞); is every element of the codomain reached?): ${s.value ? "yes" : "no"}`),
    domain: D_FCL,
    keep: fclOk,
    cap: 300,
    difficulty: ([h, , d, s]) => (d === h && s === 1 ? 1 : d < h || s === 2 ? 2 : 3),
    teach: {
      idea: "One-one: f(x₁) = f(x₂) only when x₁ = x₂. Onto: every element of the codomain is f(x) for some x in the domain. For a quadratic both depend on where the domain starts compared with the vertex.",
      method: "Complete the square to find the vertex (h, c). If the domain [d, ∞) starts at or to the right of h, f only increases (one-one) and its range is [f(d), ∞); otherwise f(d) = f(2h − d) and the range is [c, ∞). Compare the range with the codomain.",
      alternatives: [{ id: "lines", title: "Horizontal lines on the graph", kind: "conceptual", text: ["Sketch the parabola and keep only the part over the domain [d, ∞).", "One-one: no horizontal line meets it twice. Onto: every horizontal line at a height in the codomain meets it at least once."], visual: ([h, c, d]) => ({ type: "plane", points: [[h, c, "vertex"], [d, fclAt(h, c, d), "start"]], range: 12 }) }],
    },
    limits: "Upward parabolas (x − h)² + c on a half-line [d, ∞); linear, cube and modulus functions on ℕ, ℤ and ℝ are the function-types family (aqonto), and proofs are written work for an educator.",
  },
  // ============================================================ transformations (partial)
  {
    id: "aotrans",
    arity: 6,
    title: "A point on a transformed graph",
    competency: TRANS,
    type: "tuple",
    mc: true,
    parse: none,
    reject: (p) => (trOk(p) ? null : "y = a·f(±(x − h)) + v with small whole numbers, h ≠ 0, a ≠ 0."),
    prompt: (p) => `The point (${n_(p[0])}, ${n_(p[1])}) lies on the graph of y = f(x). Which point must lie on the graph of ${trText(p)}? Write it as (x, y).`,
    solve: ([p, q, h, v, a, s]) => ({
      steps: [
        { id: "inside", op: "solve", competency: TRANS, inputs: [s, h, p], value: h + s * p },
        { id: "outside", op: "evaluate", competency: TRANS, inputs: [a, q, v], value: a * q + v },
      ],
      answer: tup(h + s * p, a * q + v),
    }),
    // independent: substitute back: the input to f must be p, and the output a·q + v
    validate: ([p, q, h, v, a, s], ans) => {
      const t = readTup(ans, 2);
      return !!t && s * (t[0] - h) === p && t[1] === a * q + v;
    },
    bugs: ([p, q, h, v, a, s]) => [
      { id: "shift-direction", kind: "conceptual", competency: TRANS, says: `The graph was moved the wrong way; f(${s === 1 ? fac(h) : `${n_(h)} − x`}) takes the value f(${n_(p)}) when x = ${n_(h + s * p)}.`, predict: tup(s * p - h, a * q + v) },
      ...(a !== 1 ? [{ id: "stretch-after-shift", kind: "procedural", competency: TRANS, says: `${n_(v)} was added to ${n_(q)} before multiplying by ${n_(a)}; in ${trText([p, q, h, v, a, s])} the value of f is multiplied by ${n_(a)} first, and then ${v < 0 ? `${-v} is taken away` : `${v} is added`}.`, predict: tup(h + s * p, a * (q + v)) } as Bug] : []),
      ...(s === -1 ? [{ id: "reflection-forgotten", kind: "conceptual", competency: TRANS, says: "The −x inside f was ignored; it reflects the graph in the y-axis, so the x-coordinate changes sign before the shift.", predict: tup(h + p, a * q + v) } as Bug] : []),
    ],
    distractors: ([p, q, h, v, a, s]) => [tup(h + s * p, -(a * q + v)), tup(p + v, a * q + h), tup(h + s * p + 1, a * q + v)],
    variants: ([p, q, h, v, a, s]) => [[p, q, h, v, a, -s], [p, q, -h, v, a, s]].filter(trOk),
    explain: (s) => (s.id === "inside" ? `The input to f must be ${n_(Number(s.inputs[2]))}: x = ${n_(Number(s.value))}` : `Then y = ${n_(Number(s.inputs[0]))} × ${n_(Number(s.inputs[1]))} ${Number(s.inputs[2]) < 0 ? "−" : "+"} ${Math.abs(Number(s.inputs[2]))} = ${n_(Number(s.value))}`),
    domain: D_TR,
    keep: trOk,
    cap: 300,
    difficulty: ([, , , v, a, s]) => (a === 1 && s === 1 ? 1 : s === 1 || (a === 1 && v === 0) ? 2 : 3),
    teach: {
      idea: "In y = a·f(x − h) + v, the graph moves h to the right, is stretched by a (reflected if a < 0) and moves v up. A point (p, q) goes to (p + h, aq + v); f(h − x) also reflects it in the line x = h.",
      method: "Find the x that makes the input of f equal to p, then work out the output: multiply q by a, then add v.",
      alternatives: [{ id: "table", title: "Track one point in a table", kind: "procedural", text: ["Write three columns: x, the input to f, and y.", "Choose x so the input is p; then f gives q, and the outside numbers turn q into y."] }],
    },
    limits: "Where one point goes under a shift, stretch or reflection; sketching the transformed graph is marked by an educator.",
  },
  // ============================================================ standard functions (partial)
  {
    id: "aostd",
    arity: 3,
    title: "Evaluating the greatest integer function",
    competency: STD,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (stdOk(p) ? null : "Two numbers with one decimal place between −10 and 10, not whole, at least one negative."),
    prompt: ([u, w, op]) => `[x] denotes the greatest integer less than or equal to x. Find [${dec(u)}] ${op ? "−" : "+"} [${dec(w)}].`,
    solve: ([u, w, op]) => {
      const fu = Math.floor(u / 10);
      const fw = Math.floor(w / 10);
      return {
        steps: [
          { id: "first", op: "floor", competency: STD, inputs: [u / 10], value: fu },
          { id: "second", op: "floor", competency: STD, inputs: [w / 10], value: fw },
          { id: "combine", op: op ? "subtract" : "add", competency: REAL, inputs: [fu, fw], value: op ? fu - fw : fu + fw },
        ],
        answer: op ? fu - fw : fu + fw,
      };
    },
    // independent: search for the largest whole m with 10m ≤ u (in whole numbers)
    validate: ([u, w, op], v) => {
      const g = (t: number) => {
        let m = -10;
        while (10 * (m + 1) <= t) m++;
        return m;
      };
      return v === (op ? g(u) - g(w) : g(u) + g(w));
    },
    bugs: ([u, w, op]) => {
      const c = (f: (x: number) => number) => (op ? f(u / 10) - f(w / 10) : f(u / 10) + f(w / 10));
      return [
        { id: "drop-decimals", kind: "conceptual", competency: STD, says: "The decimal part was simply removed; for a negative number that moves up, but [x] is the integer at or below x: [−2.3] = −3.", predict: c(Math.trunc) },
        { id: "nearest", kind: "conceptual", competency: STD, says: "The numbers were rounded to the nearest integer; [x] always goes down to the integer at or below x.", predict: c((x) => Math.round(x)) },
        { id: "ceiling", kind: "recall", competency: STD, says: "The integer above was taken; the greatest integer function takes the integer at or below x.", predict: c(Math.ceil) },
      ];
    },
    variants: ([u, w, op]) => [[u, w, 1 - op], [-u, w, op]].filter(stdOk),
    explain: (s) => (s.id === "combine" ? `${n_(Number(s.inputs[0]))} ${s.op === "add" ? "+" : "−"} ${Number(s.inputs[1]) < 0 ? `(${n_(Number(s.inputs[1]))})` : s.inputs[1]} = ${n_(Number(s.value))}` : `[${fr(Number(s.inputs[0])).includes("/") ? n_(Number(s.inputs[0])) : n_(Number(s.inputs[0]))}] = ${n_(Number(s.value))}: the integer at or just below it`),
    domain: D_STD,
    keep: stdOk,
    cap: 300,
    difficulty: ([u, w]) => (u < 0 && w < 0 ? 3 : 2),
    teach: {
      idea: "[x] is the greatest integer that is not more than x: on the number line it is the integer at x or the first one to its left. So [2.7] = 2 but [−2.7] = −3.",
      method: "Place each number on the number line and step left to the nearest integer (stay if it is already an integer), then add or subtract.",
      alternatives: [{ id: "number-line", title: "Step left on the number line", kind: "conceptual", text: ["Mark the number between two integers.", "The greatest integer function always takes the left-hand one, even for negative numbers."], visual: ([u]) => ({ type: "numberline", from: Math.floor(u / 10) - 1, to: Math.floor(u / 10) + 2, marks: [u / 10] }) }],
    },
    limits: "Evaluating [x] at numbers with one decimal place; sketching and reading the graphs of standard functions is marked by an educator.",
  },
  // ============================================================ two-variable inequalities (partial)
  {
    id: "aocorner",
    arity: 6,
    title: "The corner point of a feasible region off the axes",
    competency: IN2,
    type: "tuple",
    mc: true,
    parse: none,
    reject: (p) => (corOk(p) ? null : "x ≥ 0, y ≥ 0 and two constraints ax + by ≤ c, dx + ey ≤ f meeting at a whole-number point in the first quadrant."),
    prompt: ([x, y, a, b, d, e]) => `The feasible region of x ≥ 0, y ≥ 0, ${lin(a, 0).replace(/^x$/, "x")} + ${b === 1 ? "" : b}y ≤ ${a * x + b * y} and ${d === 1 ? "" : d}x + ${e === 1 ? "" : e}y ≤ ${d * x + e * y} has exactly one corner point that is on neither axis. Find it, as (x, y).`,
    solve: ([x, y, a, b, d, e]) => ({
      steps: [
        { id: "lines", op: "write", competency: IN2, inputs: [a, b, a * x + b * y, d, e, d * x + e * y], value: `${a}x + ${b}y = ${a * x + b * y}, ${d}x + ${e}y = ${d * x + e * y}` },
        { id: "solve", op: "solve", competency: LSYS, inputs: [a, b, d, e], value: tup(x, y) },
      ],
      answer: tup(x, y),
    }),
    // independent: substitute the point into both boundary lines
    validate: ([x, y, a, b, d, e], v) => {
      const t = readTup(v, 2);
      return !!t && near(a * t[0] + b * t[1], a * x + b * y) && near(d * t[0] + e * t[1], d * x + e * y) && t[0] > 0 && t[1] > 0;
    },
    bugs: ([x, y, a, b, d, e]) => {
      const c = a * x + b * y;
      const f = d * x + e * y;
      return [
        ...(x !== y ? [{ id: "swapped", kind: "procedural", competency: LSYS, says: "The coordinates were written the wrong way round; give the x value first.", predict: tup(y, x) } as Bug] : []),
        { id: "intercepts-combined", kind: "conceptual", competency: IN2, says: "The smaller x-intercept and the smaller y-intercept were put together; the corner off the axes is where the two lines cross, found by solving them together.", predict: tup(Math.min(c / a, f / d), Math.min(c / b, f / e)) },
      ];
    },
    distractors: ([x, y]) => [tup(x + 1, y), tup(x, y + 1), tup(x + 1, y - 1)],
    variants: ([x, y, a, b, d, e]) => [[x, y, d, e, a, b], [y, x, a, b, d, e]].filter(corOk),
    explain: (s) => (s.id === "lines" ? `The corner is where the boundary lines meet: ${s.value}` : `Solve them together: (x, y) = ${s.value}`),
    domain: D_COR,
    keep: corOk,
    cap: 300,
    difficulty: ([, , a, b, d, e]) => (a === 1 || b === 1 || d === 1 || e === 1 ? 2 : 3),
    teach: {
      idea: "Each constraint ≤ is a half-plane bounded by a line; the corner points of the feasible region are where two boundary lines meet inside the region.",
      method: "Replace ≤ by = in the two constraints and solve the pair of equations (by elimination); check the point satisfies x ≥ 0 and y ≥ 0.",
      alternatives: [{ id: "elimination", title: "Eliminate one variable", kind: "procedural", text: ["Multiply the equations so that the y terms have the same coefficient, and subtract to find x.", "Put x back into either equation to find y."], visual: ([x, y]) => ({ type: "plane", points: [[x, y, "corner"]], range: 10 }) }],
    },
    limits: "Finding the corner point off the axes; drawing and shading the region is marked by an educator.",
  },
  // ============================================================ absolute value
  {
    id: "aoabseq",
    arity: 3,
    title: "Solving |ax + b| = c",
    competency: ABS,
    type: "set",
    parse: none,
    reject: (p) => (inDom(p, D_ABSE) ? null : "|ax + b| = c with a from 1 to 6, b from −12 to 12, c from 1 to 15."),
    prompt: ([a, b, c]) => `Solve |${lin(a, b)}| = ${c}. Give every solution, separated by commas.`,
    solve: ([a, b, c]) => ({
      steps: [
        { id: "cases", op: "split", competency: ABS, inputs: [`${lin(a, b)} = ${c}`, `${lin(a, b)} = −${c}`], value: [c - b, -c - b] },
        { id: "divide", op: "divide", competency: LIN, inputs: [a], value: [(c - b) / a, (-c - b) / a].sort((x, y) => x - y) },
      ],
      answer: [(c - b) / a, (-c - b) / a].sort((x, y) => x - y),
    }),
    // independent: substitute each value back into |ax + b| and check there are exactly two
    validate: ([a, b, c], v) => Array.isArray(v) && v.length === 2 && !near(v[0], v[1]) && v.every((x) => near(Math.abs(a * x + b), c)),
    bugs: ([a, b, c]) => [
      { id: "one-case", kind: "conceptual", competency: ABS, says: `Only ${lin(a, b)} = ${c} was solved; the modulus is also ${c} when ${lin(a, b)} = −${c}.`, predict: [(c - b) / a] },
      ...(b !== 0 && c !== b ? [{ id: "second-case-sign", kind: "procedural", competency: ABS, says: `In the second case the sign of ${Math.abs(b)} was lost: −(${lin(a, b)}) = ${c} gives ${lin(a, b)} = −${c}.`, predict: [(c - b) / a, (b - c) / a] } as Bug] : []),
      ...(b !== 0 ? [{ id: "b-sign", kind: "procedural", competency: LIN, says: `${Math.abs(b)} was moved across without changing its sign.`, predict: [(c + b) / a, (b - c) / a] } as Bug] : []),
    ],
    variants: ([a, b, c]) => [[a, b, c + 1], [a, -b, c]].filter((p) => inDom(p, D_ABSE)),
    explain: (s) => (s.id === "cases" ? `|A| = ${s.inputs[0].toString().split(" = ")[1]} means A = ${s.inputs[0].toString().split(" = ")[1]} or A = −${s.inputs[0].toString().split(" = ")[1]}: ${s.inputs[0]} or ${s.inputs[1]}` : `Divide by ${s.inputs[0]}: x = ${(s.value as number[]).map(fr).join(" or x = ")}`),
    domain: D_ABSE,
    cap: 300,
    difficulty: ([a, b]) => (a === 1 ? 1 : (b % a === 0) ? 2 : 3),
    word: ([a, b, c]) => `${nm(a + c)} thinks of a number x. On the number line, ${a === 1 ? "x" : `${a}x`} is exactly ${c} unit${c === 1 ? "" : "s"} away from ${n_(-b)}. Which numbers could x be? Give every answer, separated by commas.`,
    teach: {
      idea: "|A| is the distance of A from 0, so |A| = c (with c > 0) means A = c or A = −c: two equations.",
      method: "Write the two cases ax + b = c and ax + b = −c, and solve each.",
      alternatives: [{ id: "distance", title: "Distance on the number line", kind: "conceptual", text: ["|ax + b| = c says ax is at distance c from −b.", "Step c units left and right of −b to find the two values of ax, then divide by a."], visual: ([a, b, c]) => ({ type: "numberline", from: -b - c - 2, to: -b + c + 2, marks: [-b - c, -b, -b + c] }) }],
    },
    limits: "|ax + b| = c with c > 0; equations with a modulus on both sides are another family.",
  },
  {
    id: "aoabsin",
    arity: 4,
    title: "Solving |ax + b| < c, ≤ c, > c, ≥ c",
    competency: ABS,
    type: "interval",
    mc: true,
    parse: none,
    reject: (p) => (inDom(p, D_ABSI) ? null : "|ax + b| compared with c, a from 1 to 6, b from −12 to 12, c from 1 to 12."),
    prompt: ([a, b, c, r]) => `Solve |${lin(a, b)}| ${OPS[r]} ${c}. Write the answer in interval notation.`,
    solve: ([a, b, c, r]) => {
      const L = (-c - b) / a;
      const R = (c - b) / a;
      return {
        steps: [
          { id: "unfold", op: "rewrite", competency: ABS, inputs: [r], value: r < 2 ? `−${c} ${OPS[r]} ${lin(a, b)} ${OPS[r]} ${c}` : `${lin(a, b)} ${r === 2 ? "<" : "≤"} −${c} or ${lin(a, b)} ${OPS[r]} ${c}` },
          { id: "solve", op: "solve", competency: INEQ, inputs: [L, R], value: absIneqAnswer(L, R, r) },
        ],
        answer: absIneqAnswer(L, R, r),
      };
    },
    // independent: every x = k/120 in [−30, 30] tested in |ax + b| op c, in whole numbers
    validate: ([a, b, c, r], v) => agrees(v, (k, N) => cmp(Math.abs(a * k + b * N) - c * N, r)),
    bugs: ([a, b, c, r]) => {
      const L = (-c - b) / a;
      const R = (c - b) / a;
      return [
        { id: "wrong-region", kind: "conceptual", competency: ABS, says: r < 2 ? `The outside was chosen; |${lin(a, b)}| ${OPS[r]} ${c} keeps ${lin(a, b)} within ${c} of 0, between −${c} and ${c}.` : `The inside was chosen; |${lin(a, b)}| ${OPS[r]} ${c} means ${lin(a, b)} is more than ${c} from 0, on either side.`, predict: absIneqAnswer(L, R, r ^ 2) },
        { id: "one-side", kind: "conceptual", competency: ABS, says: `Only ${lin(a, b)} ${OPS[r]} ${c} was solved; the modulus also counts the negative side.`, predict: r < 2 ? ivs([[null, false, R, r === 1]]) : ivs([[R, r === 3, null, false]]) },
        { id: "end-points", kind: "procedural", competency: INEQ, says: r % 2 ? `The end points were left out; with ${OPS[r]} they belong to the answer.` : `The end points were included; with ${OPS[r]} they do not belong to the answer.`, predict: absIneqAnswer(L, R, r ^ 1) },
        ...(b !== 0 ? [{ id: "b-sign", kind: "procedural", competency: LIN, says: `${Math.abs(b)} was moved across without changing its sign.`, predict: absIneqAnswer((b - c) / a, (b + c) / a, r) } as Bug] : []),
      ];
    },
    distractors: ([a, b, c, r]) => [absIneqAnswer((-c - b) / a, (c - b) / a, r ^ 3), "(−∞, ∞)"],
    variants: ([a, b, c, r]) => [[a, b, c, (r + 2) % 4]].filter((p) => inDom(p, D_ABSI)),
    explain: (s) => (s.id === "unfold" ? `Remove the modulus: ${s.value}` : `Solve for x: ${s.value}`),
    domain: D_ABSI,
    cap: 400,
    difficulty: ([a, , , r]) => (a === 1 && r < 2 ? 1 : r < 2 ? 2 : 3),
    word: ([a, b, c, r]) => `The number ${a === 1 ? "x" : `${a}x`} is ${["less than", "at most", "more than", "at least"][r]} ${c} unit${c === 1 ? "" : "s"} away from ${n_(-b)} on the number line. Which numbers x are possible? Write the answer in interval notation.`,
    teach: {
      idea: "|A| < c means A is within c of 0: −c < A < c. |A| > c means A is further than c from 0: A < −c or A > c.",
      method: "Rewrite without the modulus (one double inequality, or two inequalities joined by 'or'), solve for x, and write the answer in interval notation with the right brackets.",
      alternatives: [{ id: "distance", title: "Distance from a point", kind: "conceptual", text: ["|ax + b| is the distance between ax and −b on the number line.", "'Less than c' is the stretch of length 2c centred at −b; 'more than c' is everything outside it."], visual: ([a, b, c]) => ({ type: "numberline", from: Math.floor((-c - b) / a) - 2, to: Math.ceil((c - b) / a) + 2, marks: [(-c - b) / a, (c - b) / a] }) }],
    },
    limits: "|ax + b| compared with a positive constant; inequalities with a modulus on both sides are another family.",
  },
  // ============================================================ quadratic and rational inequalities
  {
    id: "aoqin",
    arity: 4,
    title: "Solving a quadratic inequality",
    competency: NLI,
    type: "interval",
    mc: true,
    parse: none,
    reject: (p) => (qinOk(p) ? null : "m(x − a)(x − b) compared with 0, written out, whole-number roots a < b, m from −2 to 2 (not 0)."),
    prompt: ([a, b, r, m]) => `Solve ${poly([m, -m * (a + b), m * a * b])} ${OPS[r]} 0. Write the answer in interval notation.`,
    solve: ([a, b, r, m]) => ({
      steps: [
        { id: "factor", op: "factorise", competency: FACT, inputs: [a, b, m], value: `${m === 1 ? "" : m === -1 ? "−" : n_(m)}${prod2(a, b)}` },
        { id: "signs", op: "sign-chart", competency: NLI, inputs: [a, b, m > 0 ? "+" : "−"], value: qinAnswer(a, b, r, m) },
      ],
      answer: qinAnswer(a, b, r, m),
    }),
    validate: ([a, b, r, m], v) => agrees(v, (k, N) => cmp(m * (k - a * N) * (k - b * N), r)),
    bugs: ([a, b, r, m]) => [
      m < 0
        ? { id: "leading-sign", kind: "conceptual", competency: NLI, says: `The negative x² coefficient was ignored; ${m === -1 ? "−" : n_(m)}${prod2(a, b)} is positive between the roots and negative outside.`, predict: qinAnswer(a, b, r, -m) }
        : { id: "wrong-region", kind: "conceptual", competency: NLI, says: `The wrong region was chosen; ${prod2(a, b)} is negative between ${n_(a)} and ${n_(b)} and positive outside.`, predict: qinAnswer(a, b, r ^ 2, m) },
      { id: "end-points", kind: "procedural", competency: INEQ, says: r % 2 ? "The roots were left out; with ≤ or ≥ the value 0 is allowed." : "The roots were included; there the expression is 0, which does not satisfy a strict inequality.", predict: qinAnswer(a, b, r ^ 1, m) },
      ...(a !== -b ? [{ id: "root-signs", kind: "procedural", competency: FACT, says: `The roots were read with the wrong signs; the expression is zero at x = ${n_(a)} and x = ${n_(b)}.`, predict: qinAnswer(-b, -a, r, m) } as Bug] : []),
    ],
    distractors: ([a, b, r, m]) => [ivs([[b, r % 2 === 1, null, false]]), ivs([[null, false, a, r % 2 === 1]])],
    variants: ([a, b, r, m]) => [[a, b, (r + 2) % 4, m], [a, b, r, -m]].filter(qinOk),
    explain: (s) => (s.id === "factor" ? `Factorise: ${s.value}` : `Roots ${n_(Number(s.inputs[0]))} and ${n_(Number(s.inputs[1]))}; with the sign of each region: ${s.value}`),
    domain: D_QIN,
    keep: qinOk,
    cap: 400,
    difficulty: ([, , r, m]) => (m === 1 && r < 2 ? 1 : m > 0 ? 2 : 3),
    teach: {
      idea: "A quadratic with roots a < b keeps one sign between the roots and the other sign outside them; the sign outside is the sign of the x² coefficient.",
      method: "Factorise, mark the roots on a number line, find the sign in each region, keep the regions the inequality asks for, and include the roots only for ≤ or ≥.",
      alternatives: [
        { id: "parabola", title: "Picture the parabola", kind: "conceptual", text: ["With a positive x² coefficient the parabola opens upwards: it is below the x-axis only between the roots.", "With a negative coefficient it opens downwards: it is above the x-axis only between the roots."] },
        { id: "sign-chart", title: "A sign chart", kind: "procedural", text: ["Write the sign of each factor in each region.", "Multiply the signs (and the sign of the leading number) to get the sign of the product."], visual: ([a, b]) => ({ type: "numberline", from: a - 3, to: b + 3, marks: [a, b] }) },
      ],
    },
    limits: "Quadratics with two whole-number roots; quadratics with no real roots are another family.",
  },
  {
    id: "aorat",
    arity: 3,
    title: "Solving a rational inequality (x − a)/(x − b) compared with 0",
    competency: NLI,
    type: "interval",
    mc: true,
    parse: none,
    reject: (p) => (ratOk(p) ? null : "(x − a)/(x − b) compared with 0, whole numbers a ≠ b from −8 to 8."),
    prompt: ([a, b, r]) => `Solve ${a === 0 ? "x" : `${bx(a)}`}/${bx(b)} ${OPS[r]} 0. Write the answer in interval notation.`,
    solve: ([a, b, r]) => ({
      steps: [
        { id: "critical", op: "find", competency: NLI, inputs: [a, b], value: [a, b].sort((x, y) => x - y) },
        { id: "signs", op: "sign-chart", competency: NLI, inputs: [a, b], value: ratAnswer(a, b, r) },
      ],
      answer: ratAnswer(a, b, r),
    }),
    validate: ([a, b, r], v) => agrees(v, (k, N) => k !== b * N && cmp((k - a * N) * (k - b * N), r)),
    bugs: ([a, b, r]) => [
      ...(r % 2 ? [{ id: "denominator-zero", kind: "conceptual", competency: NLI, says: `x = ${n_(b)} was included; there the denominator is 0 and the fraction is not defined.`, predict: ratAnswer(a, b, r, true) } as Bug] : []),
      { id: "multiplied-out", kind: "conceptual", competency: NLI, says: `Both sides were multiplied by ${fac(b)} as if it were positive; its sign changes at x = ${n_(b)}, so compare signs of top and bottom instead.`, predict: r < 2 ? ivs([[null, false, a, r === 1]]) : ivs([[a, r === 3, null, false]]) },
      { id: "wrong-region", kind: "conceptual", competency: NLI, says: `The wrong region was chosen; the fraction is negative between ${n_(Math.min(a, b))} and ${n_(Math.max(a, b))}, where top and bottom have opposite signs.`, predict: ratAnswer(a, b, r ^ 2) },
    ],
    distractors: ([a, b, r]) => [ratAnswer(b, a, r), "(−∞, ∞)"],
    variants: ([a, b, r]) => [[b, a, r], [a, b, (r + 1) % 4]].filter(ratOk),
    explain: (s) => (s.id === "critical" ? `The top is 0 at x = ${n_(Number((s.inputs as number[])[0]))}; the bottom is 0 at x = ${n_(Number((s.inputs as number[])[1]))}, which is never allowed` : `Signs in each region give ${s.value}`),
    domain: D_RAT,
    keep: ratOk,
    cap: 300,
    difficulty: ([, , r]) => (r % 2 ? 3 : 2),
    teach: {
      idea: "A fraction is positive when top and bottom have the same sign and negative when they differ; it is 0 where the top is 0 and undefined where the bottom is 0.",
      method: "Mark the zeros of the top and of the bottom, find the sign of the fraction in each region, and keep the regions asked for. The zero of the bottom is always left out.",
      alternatives: [{ id: "product", title: "Same sign as the product", kind: "procedural", text: ["(x − a)/(x − b) has the same sign as (x − a)(x − b) wherever x ≠ b.", "Solve the product inequality, then remove x = b."], visual: ([a, b]) => ({ type: "numberline", from: Math.min(a, b) - 3, to: Math.max(a, b) + 3, marks: [a, b] }) }],
    },
    limits: "(x − a)/(x − b) compared with 0; fractions with quadratic parts are another family.",
  },
  // ============================================================ partial fractions
  {
    id: "aopf",
    arity: 4,
    title: "Partial fractions with two distinct linear factors",
    competency: PF,
    type: "tuple",
    mc: true,
    parse: none,
    reject: (p) => (pfOk(p) ? null : "(px + q)/((x − a)(x − b)) with whole-number roots a < b and whole-number A, B, not 0."),
    prompt: ([a, b, A, B]) => `Resolve ${brk(lin(A + B, -(A * b + B * a)))}/(${poly([1, -(a + b), a * b])}) into partial fractions of the form A/${bx(a)} + B/${bx(b)}. Write the pair (A, B).`,
    solve: ([a, b, A, B]) => ({
      steps: [
        { id: "factor", op: "factorise", competency: FACT, inputs: [a, b], value: `${prod2(a, b)}` },
        { id: "A", op: "substitute", competency: PF, inputs: [a, (A + B) * a - (A * b + B * a), a - b], value: A },
        { id: "B", op: "substitute", competency: PF, inputs: [b, (A + B) * b - (A * b + B * a), b - a], value: B },
      ],
      answer: tup(A, B),
    }),
    // independent: compare both sides numerically at three values of x
    validate: ([a, b, A, B], v) => {
      const t = readTup(v, 2);
      if (!t) return false;
      return [0.37, 2.9, -7.3].every((x) => near(((A + B) * x - (A * b + B * a)) / ((x - a) * (x - b)), t[0] / (x - a) + t[1] / (x - b), 1e-9));
    },
    bugs: ([a, b, A, B]) => [
      { id: "cover-up-sign", kind: "procedural", competency: PF, says: `In the cover-up step the other factor was worked out the wrong way round: at x = ${n_(a)} the factor ${fac(b)} is ${n_(a - b)}, not ${n_(b - a)}.`, predict: tup(-A, -B) },
      { id: "swapped", kind: "procedural", competency: PF, says: `A and B were swapped; A goes with ${fac(a)}, found by putting x = ${n_(a)}.`, predict: tup(B, A) },
      { id: "not-divided", kind: "procedural", competency: PF, says: "The numerator's value was not divided by the value of the other factor.", predict: tup(A * (a - b), B * (b - a)) },
    ],
    distractors: ([, , A, B]) => [tup(A, -B), tup(-A, B), tup(A + 1, B)],
    variants: ([a, b, A, B]) => [[a, b, B, A], [a, b + 1, A, B]].filter(pfOk),
    explain: (s) => (s.id === "factor" ? `Factorise the denominator: ${s.value}` : `Put x = ${n_(Number(s.inputs[0]))}: ${s.id} = ${n_(Number(s.inputs[1]))} ÷ ${par2(Number(s.inputs[2]))} = ${n_(Number(s.value))}`),
    domain: D_PF,
    keep: pfOk,
    cap: 400,
    difficulty: ([a, b, A, B]) => (a >= 0 && A > 0 && B > 0 ? 1 : A > 0 || B > 0 ? 2 : 3),
    teach: {
      idea: "(px + q)/((x − a)(x − b)) = A/(x − a) + B/(x − b) means px + q = A(x − b) + B(x − a) for every x, so choosing x = a and x = b each removes one unknown.",
      method: "Factorise the denominator, multiply through, then put x = a to find A and x = b to find B. Check at one more value of x.",
      alternatives: [{ id: "compare", title: "Compare coefficients", kind: "procedural", text: ["Expand A(x − b) + B(x − a) = (A + B)x − (Ab + Ba).", "Match the x coefficient and the constant with px + q and solve the two equations for A and B."] }],
    },
    limits: "Proper fractions over two distinct linear factors; repeated factors and improper fractions are other families.",
  },
  {
    id: "aopfq",
    arity: 5,
    title: "Partial fractions with a linear and an irreducible quadratic factor",
    competency: PF,
    type: "tuple",
    mc: true,
    parse: none,
    reject: (p) => (pfqOk(p) ? null : "N(x)/((x − a)(x² + k)) with whole numbers a, k > 0 and A ≠ 0."),
    prompt: (p) => `Resolve ${brk(poly(pfqNum(p)))}/(${bx(p[0])}(x² + ${p[1]})) into partial fractions of the form A/${bx(p[0])} + (Bx + C)/(x² + ${p[1]}). Write the triple (A, B, C).`,
    solve: ([a, k, A, B, C]) => {
      const [p2, p1, p0] = pfqNum([a, k, A, B, C]);
      return {
        steps: [
          { id: "A", op: "substitute", competency: PF, inputs: [a, p2 * a * a + p1 * a + p0, a * a + k], value: A },
          { id: "B", op: "compare", competency: PF, inputs: [p2, A], value: B },
          { id: "C", op: "compare", competency: PF, inputs: [p1, a, B], value: C },
        ],
        answer: tup(A, B, C),
      };
    },
    validate: ([a, k, A, B, C], v) => {
      const t = readTup(v, 3);
      if (!t) return false;
      const [p2, p1, p0] = pfqNum([a, k, A, B, C]);
      return [0.37, 2.9, -7.3, 11.1].every((x) => near((p2 * x * x + p1 * x + p0) / ((x - a) * (x * x + k)), t[0] / (x - a) + (t[1] * x + t[2]) / (x * x + k), 1e-9));
    },
    bugs: ([a, k, A, B, C]) => {
      const [p2, p1] = pfqNum([a, k, A, B, C]);
      const A2 = A * (a * a + k);
      return [
        { id: "not-divided", kind: "procedural", competency: PF, says: `N(${n_(a)}) was taken as A without dividing by ${par2(a)}² + ${k} = ${a * a + k}.`, predict: tup(A2, p2 - A2, p1 + a * (p2 - A2)) },
        { id: "x2-as-B", kind: "procedural", competency: PF, says: `B was taken as the whole x² coefficient ${n_(p2)}; the x² terms come from A·x² and Bx·x, so B = ${n_(p2)} − A.`, predict: tup(A, p2, p1 + a * p2) },
        ...(a !== 0 && B !== 0 ? [{ id: "c-sign", kind: "procedural", competency: PF, says: `A sign slip matching the x terms: (Bx + C)${bx(a)} gives (C ${a > 0 ? "−" : "+"} ${Math.abs(a) === 1 ? "" : Math.abs(a)}B)x.`, predict: tup(A, B, p1 - a * B) } as Bug] : []),
      ];
    },
    distractors: ([, , A, B, C]) => [tup(A, -B, C), tup(A, B, -C), tup(-A, B, C)],
    variants: ([a, k, A, B, C]) => [[a, k + 1, A, B, C]].filter(pfqOk),
    explain: (s) => (s.id === "A" ? `Put x = ${n_(Number(s.inputs[0]))}: A = ${n_(Number(s.inputs[1]))} ÷ ${s.inputs[2]} = ${n_(Number(s.value))}` : s.id === "B" ? `x² terms: A + B = ${n_(Number(s.inputs[0]))}, so B = ${n_(Number(s.value))}` : `x terms: C − (${n_(Number(s.inputs[1]))})B = ${n_(Number(s.inputs[0]))}, so C = ${n_(Number(s.value))}`),
    domain: D_PFQ,
    keep: pfqOk,
    cap: 300,
    difficulty: ([a, , A, B, C]) => (a === 0 || (A > 0 && B >= 0 && C >= 0) ? 2 : 3),
    teach: {
      idea: "A quadratic factor x² + k with no real roots needs a linear numerator Bx + C. Multiplying out, N(x) = A(x² + k) + (Bx + C)(x − a) holds for every x.",
      method: "Put x = a to find A. Then compare the x² coefficients to find B and the x (or constant) terms to find C.",
      alternatives: [{ id: "system", title: "Three equations", kind: "procedural", text: ["Expand the right side and match the x², x and constant coefficients with N(x).", "This gives three equations in A, B and C; solve them together."] }],
    },
    limits: "A proper fraction over one linear factor and x² + k; repeated quadratic factors are left out.",
  },
  // ============================================================ permutations and combinations
  {
    id: "aonpr",
    arity: 2,
    title: "Permutations of r out of n distinct objects",
    competency: PERM,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (nprOk(p) ? null : "ⁿPᵣ for 3 ≤ n ≤ 30, 2 ≤ r ≤ n, at most 10⁶."),
    prompt: ([n, r]) => `Find ${sup(n)}P${sub(r)}, the number of ways of arranging ${r} of ${n} distinct objects in a row.`,
    solve: ([n, r]) => ({
      steps: [
        { id: "slots", op: "multiply", competency: PERM, inputs: Array.from({ length: r }, (_, i) => n - i), value: perm(n, r) },
      ],
      answer: perm(n, r),
    }),
    // independent: n!/(n − r)! from factorials (exact, in big integers)
    validate: ([n, r], v) => {
      const F = (k: number) => (k <= 1 ? 1n : BigInt(k) * F(k - 1));
      return typeof v === "number" && Number.isInteger(v) && BigInt(v) === F(n) / F(n - r);
    },
    bugs: ([n, r]) => [
      { id: "order-ignored", kind: "conceptual", competency: PERM, says: `The objects were chosen without order (${sup(n)}C${sub(r)}); in an arrangement the order matters.`, predict: choose(n, r) },
      ...(n ** r <= 1e12 ? [{ id: "repetition", kind: "conceptual", competency: PERM, says: `Every place was given all ${n} choices; an object used in one place cannot be used again, so the choices go down by one each time.`, predict: n ** r } as Bug] : []),
      ...(r < n && n <= 10 ? [{ id: "all-arranged", kind: "procedural", competency: PERM, says: `All ${n} objects were arranged (${n}!); only ${r} places are filled.`, predict: fact(n) } as Bug] : []),
      ...(r < n - 1 && n <= 10 ? [{ id: "divide-by-r", kind: "recall", competency: PERM, says: `${n}! was divided by ${r}!; ${sup(n)}P${sub(r)} = ${n}!/(${n} − ${r})!.`, predict: fact(n) / fact(r) } as Bug] : []),
    ],
    variants: ([n, r]) => [[n, r - 1], [n + 1, r]].filter(nprOk),
    explain: (s) => `${s.inputs.length} places, filled one after another: ${s.inputs.join(" × ")} = ${s.value}`,
    domain: D_NPR,
    keep: nprOk,
    difficulty: ([n, r]) => (r <= 2 ? 1 : n <= 9 ? 2 : 3),
    word: ([n, r]) => `${n} students take part in a quiz, and ${r} different prizes (${r === 2 ? "first and second" : r === 3 ? "first, second and third" : "first, second, third and so on"}) are to be given to ${r} of them, one prize each. In how many ways can the prizes be given?`,
    teach: {
      idea: "Filling r places in order from n distinct objects: n choices for the first place, n − 1 for the second, and so on, so ⁿPᵣ = n(n − 1)…(n − r + 1) = n!/(n − r)!.",
      method: "Multiply r numbers, starting at n and going down by one each time.",
      alternatives: [{ id: "boxes", title: "Draw the places as boxes", kind: "conceptual", text: ["Draw r boxes in a row and write in each how many objects are still free to go there.", "By the multiplication principle, multiply the numbers in the boxes."] }],
    },
    limits: "Arrangements of distinct objects without repetition; restrictions and circular arrangements are other families.",
  },
  {
    id: "aoncr",
    arity: 2,
    title: "Combinations: choosing r out of n",
    competency: PERM,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (ncrOk(p) ? null : "ⁿCᵣ for 4 ≤ n ≤ 20 and 2 ≤ r ≤ n − 2."),
    prompt: ([n, r]) => `Find ${sup(n)}C${sub(r)}, the number of ways of choosing ${r} of ${n} distinct objects.`,
    solve: ([n, r]) => {
      const s = Math.min(r, n - r);
      return {
        steps: [
          ...(s !== r ? [{ id: "symmetry", op: "rewrite", competency: PERM, inputs: [n, r, n - r], value: s } as Step] : []),
          { id: "arrange", op: "multiply", competency: PERM, inputs: [n, s], value: perm(n, s) },
          { id: "divide", op: "divide", competency: PERM, inputs: [perm(n, s), fact(s)], value: choose(n, r) },
        ],
        answer: choose(n, r),
      };
    },
    // independent: build Pascal's triangle by addition
    validate: ([n, r], v) => {
      let row = [1];
      for (let i = 1; i <= n; i++) row = row.map((x, j) => x + (j > 0 ? row[j - 1] : 0)).concat([1]);
      return v === row[r];
    },
    bugs: ([n, r]) => [
      ...(perm(n, r) <= 1e12 ? [{ id: "order-counted", kind: "conceptual", competency: PERM, says: `The ${r} objects were counted in order (${sup(n)}P${sub(r)}); a selection has no order, so divide by ${r}!.`, predict: perm(n, r) } as Bug] : []),
      ...(perm(n, r) % r === 0 && perm(n, r) / r <= 1e12 ? [{ id: "divide-by-r-not-factorial", kind: "recall", competency: PERM, says: `${sup(n)}P${sub(r)} was divided by ${r}; each selection of ${r} can be arranged in ${r}! ways, so divide by ${r}!.`, predict: perm(n, r) / r } as Bug] : []),
      { id: "multiply-n-r", kind: "conceptual", competency: PERM, says: `${n} and ${r} were multiplied; count the ordered choices ${n} × ${n - 1} × … and divide by ${r}!.`, predict: n * r },
    ],
    variants: ([n, r]) => [[n, n - r], [n + 1, r]].filter(ncrOk),
    explain: (s) => (s.id === "symmetry" ? `${sup(Number(s.inputs[0]))}C${sub(Number(s.inputs[1]))} = ${sup(Number(s.inputs[0]))}C${sub(Number(s.inputs[2]))} (choosing ${s.inputs[1]} to take is choosing ${s.inputs[2]} to leave)` : s.id === "arrange" ? `In order: ${sup(Number(s.inputs[0]))}P${sub(Number(s.inputs[1]))} = ${s.value}` : `Each choice was counted ${s.inputs[1]} times (its arrangements): ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: D_NCR,
    keep: ncrOk,
    difficulty: ([n, r]) => (Math.min(r, n - r) <= 2 ? 1 : n <= 12 ? 2 : 3),
    word: ([n, r]) => `A school must choose ${r} of its ${n} best players for a tournament team. In how many ways can the team be chosen?`,
    teach: {
      idea: "Choosing without order: each group of r objects appears r! times among the ordered arrangements, so ⁿCᵣ = ⁿPᵣ / r! = n!/(r!(n − r)!).",
      method: "Use the smaller of r and n − r (ⁿCᵣ = ⁿCₙ₋ᵣ), multiply that many numbers down from n, and divide by its factorial.",
      alternatives: [{ id: "pascal", title: "Pascal's triangle", kind: "conceptual", text: ["Each entry of Pascal's triangle is the sum of the two above it; row n, place r (counting from 0) is ⁿCᵣ.", "This is because a choice of r from n either includes a particular object or not: ⁿCᵣ = ⁿ⁻¹Cᵣ₋₁ + ⁿ⁻¹Cᵣ."] }],
    },
    limits: "ⁿCᵣ for n up to 20; equations in n (such as ⁿC₂ = 45) are another family.",
  },
  {
    id: "aocomm",
    arity: 4,
    title: "Selections with a condition: exactly k from one group",
    competency: PERM,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (commOk(p) ? null : "A committee of 3 to 6 from 3–9 men and 3–9 women with exactly k women, 1 ≤ k < r."),
    prompt: ([m, w, r, k]) => `A committee of ${r} is to be chosen from ${m} men and ${w} women. In how many ways can this be done if the committee must have exactly ${k} wom${k === 1 ? "an" : "en"}?`,
    solve: ([m, w, r, k]) => ({
      steps: [
        { id: "women", op: "choose", competency: PERM, inputs: [w, k], value: choose(w, k) },
        { id: "men", op: "choose", competency: PERM, inputs: [m, r - k], value: choose(m, r - k) },
        { id: "together", op: "multiply", competency: PERM, inputs: [choose(w, k), choose(m, r - k)], value: choose(w, k) * choose(m, r - k) },
      ],
      answer: choose(w, k) * choose(m, r - k),
    }),
    // independent: go through the people one at a time, counting selections by (women chosen, people chosen)
    validate: ([m, w, r, k], v) => {
      let ways = [[1]] as number[][];
      for (let i = 0; i < m + w; i++) {
        const isW = i < w;
        const next = Array.from({ length: w + 1 }, () => Array(r + 1).fill(0));
        ways.forEach((row, x) => row.forEach((c, y) => {
          if (!c) return;
          next[x][y] += c;
          if (y + 1 <= r && (!isW || x + 1 <= w)) next[isW ? x + 1 : x][y + 1] += c;
        }));
        ways = next;
      }
      return v === (ways[k]?.[r] ?? 0);
    },
    bugs: ([m, w, r, k]) => [
      { id: "added", kind: "conceptual", competency: PERM, says: `The two choices were added; each choice of women goes with each choice of men, so multiply.`, predict: choose(w, k) + choose(m, r - k) },
      { id: "condition-ignored", kind: "conceptual", competency: PERM, says: `${r} were chosen from all ${m + w} people; the condition fixes exactly ${k} wom${k === 1 ? "an" : "en"} and ${r - k} m${r - k === 1 ? "an" : "en"}.`, predict: choose(m + w, r) },
      ...(perm(w, k) * perm(m, r - k) <= 1e12 ? [{ id: "order-counted", kind: "conceptual", competency: PERM, says: "The members were arranged in order; a committee is a selection, so use combinations.", predict: perm(w, k) * perm(m, r - k) } as Bug] : []),
    ],
    variants: ([m, w, r, k]) => [[m, w, r, k + 1], [m, w, r, k - 1]].filter(commOk),
    explain: (s) => (s.id === "together" ? `Each choice of women goes with each choice of men: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `${s.id === "women" ? "Women" : "Men"}: ${sup(Number(s.inputs[0]))}C${sub(Number(s.inputs[1]))} = ${s.value}`),
    domain: D_COMM,
    keep: commOk,
    cap: 300,
    difficulty: ([m, w, r]) => (r === 3 ? 1 : m + w <= 12 ? 2 : 3),
    word: ([m, w, r, k]) => `A school quiz team of ${r} is to be picked from ${m} boys and ${w} girls. In how many ways can the team be picked if it must have exactly ${k} girl${k === 1 ? "" : "s"}?`,
    teach: {
      idea: "A condition splits the selection into independent parts: choose the women, choose the men, and multiply (every choice of one goes with every choice of the other).",
      method: "Work out ʷCₖ for the women and ᵐCᵣ₋ₖ for the men, then multiply.",
      alternatives: [{ id: "small-list", title: "List a tiny case", kind: "conceptual", text: ["With 2 women and 2 men, a committee of 2 with exactly 1 woman: 2 choices of woman × 2 choices of man = 4 committees.", "Listing them shows each woman paired with each man."] }],
    },
    limits: "Exactly k from one of two groups; 'at least k' conditions are another family.",
  },
  {
    id: "aomulti",
    arity: 3,
    title: "Arrangements when some objects are identical",
    competency: PERM,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (mulOk(p) ? null : "Up to 5 red, 5 blue and 4 green identical objects, 4 to 11 in all."),
    prompt: ([r, b, g]) => `Find the number of distinct arrangements in a row of the ${r + b + g} letters ${[..."A".repeat(r), ..."B".repeat(b), ..."C".repeat(g)].join(", ")}, where equal letters are identical.`,
    solve: ([r, b, g]) => {
      const n = r + b + g;
      return {
        steps: [
          { id: "all", op: "evaluate", competency: PERM, inputs: [n], value: fact(n) },
          { id: "divide", op: "divide", competency: PERM, inputs: [fact(n), fact(r), fact(b), fact(g)], value: fact(n) / (fact(r) * fact(b) * fact(g)) },
        ],
        answer: fact(n) / (fact(r) * fact(b) * fact(g)),
      };
    },
    // independent: count recursively by the first letter of the arrangement
    validate: ([r, b, g], v) => {
      const memo = new Map<string, number>();
      const cnt = (x: number, y: number, z: number): number => {
        if (x + y + z === 0) return 1;
        const key = `${x},${y},${z}`;
        if (!memo.has(key)) memo.set(key, (x ? cnt(x - 1, y, z) : 0) + (y ? cnt(x, y - 1, z) : 0) + (z ? cnt(x, y, z - 1) : 0));
        return memo.get(key)!;
      };
      return v === cnt(r, b, g);
    },
    bugs: ([r, b, g]) => {
      const n = r + b + g;
      const big = Math.max(r, b, g);
      const prod = Math.max(r, 1) * Math.max(b, 1) * Math.max(g, 1);
      return [
        { id: "identical-as-distinct", kind: "conceptual", competency: PERM, says: `All ${n} letters were treated as different (${n}!); swapping two equal letters gives the same arrangement.`, predict: fact(n) },
        { id: "one-group-only", kind: "procedural", competency: PERM, says: `Only the largest group of equal letters was divided out; divide by the factorial of every group.`, predict: fact(n) / fact(big) },
        ...(fact(n) % prod === 0 ? [{ id: "counts-not-factorials", kind: "recall", competency: PERM, says: "The total was divided by the group sizes; divide by their factorials (the ways each group can be shuffled).", predict: fact(n) / prod } as Bug] : []),
      ];
    },
    variants: ([r, b, g]) => [[r + 1, b, g], [r, b, g + 1]].filter(mulOk),
    explain: (s) => (s.id === "all" ? `If all letters were different: ${s.inputs[0]}! = ${s.value}` : `Divide by the shuffles of equal letters: ${s.inputs[0]} ÷ (${s.inputs.slice(1).join(" × ")}) = ${s.value}`),
    domain: D_MUL,
    keep: mulOk,
    difficulty: ([r, b, g]) => (g === 0 ? 1 : r + b + g <= 7 ? 2 : 3),
    word: ([r, b, g]) => `Flags are hung in a row on a festival string: ${flags(r, "red")}, ${flags(b, "blue")}${g ? ` and ${flags(g, "green")}` : ""}. How many different-looking rows are possible?`,
    teach: {
      idea: "If all n objects were different there would be n! arrangements; each arrangement of identical objects is counted p! × q! × … times, once for every shuffle of equal objects.",
      method: "Work out n! and divide by the factorial of the size of each group of identical objects.",
      alternatives: [{ id: "places", title: "Choose places for each colour", kind: "procedural", text: ["Choose the places for the first colour (ⁿCₚ), then for the second colour from the places left, and so on.", "Multiply the choices: this gives the same number as n!/(p! q! …)."] }],
    },
    limits: "Up to three groups of identical objects in a row; circular arrangements are another family.",
  },
  // ============================================================ binomial theorem
  {
    id: "aobinco",
    arity: 4,
    title: "A coefficient in the expansion of (ax + b)ⁿ",
    competency: BIN,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (bcoOk(p) ? null : "(ax + b)ⁿ with a, b from −3 to 3 (not 0), n from 3 to 8, and 1 ≤ r ≤ n − 1."),
    prompt: ([a, b, n, r]) => `Find the coefficient of ${xp(r)} in the expansion of (${lin(a, b)})${sup(n)}.`,
    solve: ([a, b, n, r]) => ({
      steps: [
        { id: "term", op: "write", competency: BIN, inputs: [n, r], value: `${sup(n)}C${sub(r)} (${lin(a, 0)})${sup(r)} (${n_(b)})${sup(n - r)}` },
        { id: "choose", op: "choose", competency: PERM, inputs: [n, r], value: choose(n, r) },
        { id: "powers", op: "evaluate", competency: EXPN, inputs: [a, r, b, n - r], value: a ** r * b ** (n - r) },
        { id: "coefficient", op: "multiply", competency: BIN, inputs: [choose(n, r), a ** r * b ** (n - r)], value: bco(a, b, n, r) },
      ],
      answer: bco(a, b, n, r),
    }),
    // independent: expand by multiplying (ax + b) by itself n times
    validate: ([a, b, n, r], v) => {
      let c = [1];
      for (let i = 0; i < n; i++) c = Array.from({ length: c.length + 1 }, (_, j) => (j < c.length ? c[j] * b : 0) + (j > 0 ? c[j - 1] * a : 0));
      return v === c[r];
    },
    bugs: ([a, b, n, r]) => [
      { id: "powers-left-out", kind: "conceptual", competency: BIN, says: `Only ${sup(n)}C${sub(r)} was given; the term also carries (${lin(a, 0)})${sup(r)} and (${n_(b)})${sup(n - r)}, so their powers are part of the coefficient.`, predict: choose(n, r) },
      { id: "general-term-index", kind: "procedural", competency: BIN, says: `The general term was used with the wrong index: the term with ${xp(r)} uses ${sup(n)}C${sub(r)} and the powers ${r} and ${n - r}.`, predict: bco(a, b, n, r - 1) },
      ...(bco(a, b, n, r) < 0 ? [{ id: "sign-lost", kind: "procedural", competency: EXPN, says: `The minus sign was dropped; ${([[a, r], [b, n - r]] as [number, number][]).filter(([v, e]) => v < 0 && e % 2).map(([v, e]) => `(${n_(v)})${sup(e)}`).join(" and ")} is negative (a negative number to an odd power), so the coefficient is negative.`, predict: Math.abs(bco(a, b, n, r)) } as Bug] : []),
      ...(Math.abs(a) !== 1 ? [{ id: "a-power-forgotten", kind: "procedural", competency: EXPN, says: `The ${n_(a)} in (${lin(a, 0)})${sup(r)} was not raised to the power ${r}.`, predict: choose(n, r) * a * b ** (n - r) } as Bug] : []),
    ],
    variants: ([a, b, n, r]) => [[a, b, n, r + 1], [a, -b, n, r]].filter(bcoOk),
    explain: (s) => (s.id === "term" ? `The term with ${xp(Number(s.inputs[1]))} is ${s.value}` : s.id === "choose" ? `${sup(Number(s.inputs[0]))}C${sub(Number(s.inputs[1]))} = ${s.value}` : s.id === "powers" ? `${par2(Number(s.inputs[0]))}${sup(Number(s.inputs[1]))} × ${par2(Number(s.inputs[2]))}${sup(Number(s.inputs[3]))} = ${n_(Number(s.value))}` : `Coefficient: ${s.inputs[0]} × ${par2(Number(s.inputs[1]))} = ${n_(Number(s.value))}`),
    domain: D_BCO,
    keep: bcoOk,
    cap: 400,
    difficulty: ([a, b, n]) => (a === 1 && b > 0 ? 1 : n <= 5 ? 2 : 3),
    teach: {
      idea: "The general term of (u + v)ⁿ is ⁿCᵣ uʳ vⁿ⁻ʳ. With u = ax and v = b, the term with xʳ is ⁿCᵣ aʳ bⁿ⁻ʳ xʳ.",
      method: "Pick the term whose power of x is r, then multiply ⁿCᵣ by aʳ and by bⁿ⁻ʳ, keeping the signs.",
      alternatives: [{ id: "pascal", title: "Read the row of Pascal's triangle", kind: "conceptual", text: ["Row n of Pascal's triangle gives ⁿC₀, ⁿC₁, … ⁿCₙ.", "Each one multiplies a power of ax and a power of b whose powers add up to n."] }],
    },
    limits: "(ax + b)ⁿ with small a, b and n ≤ 8; terms independent of x and middle terms are other families.",
  },
  {
    id: "aobinexp",
    arity: 3,
    title: "Expanding (ax + b)ⁿ",
    competency: BIN,
    type: "exact",
    mc: true,
    parse: none,
    reject: (p) => (bexOk(p) ? null : "(ax + b)ⁿ with a from 1 to 3, b from −5 to 5 (not 0), n from 2 to 5."),
    prompt: ([a, b, n]) => `Expand (${lin(a, b)})${sup(n)} using the binomial theorem.`,
    solve: ([a, b, n]) => ({
      steps: [
        { id: "row", op: "pascal", competency: BIN, inputs: [n], value: Array.from({ length: n + 1 }, (_, i) => choose(n, i)) },
        { id: "terms", op: "multiply", competency: BIN, inputs: [a, b, n], value: poly(bexCs(a, b, n)) },
      ],
      answer: poly(bexCs(a, b, n)),
    }),
    // independent: evaluate the written answer at several x and compare with (ax + b)ⁿ
    validate: ([a, b, n], v) => {
      if (typeof v !== "string") return false;
      try {
        const e = parse(v);
        return [-2, -1, 0, 1, 2, 3, 0.5].every((x) => near(evaluate(e, { x }), (a * x + b) ** n, 1e-9));
      } catch {
        return false;
      }
    },
    bugs: ([a, b, n]) => [
      { id: "ends-only", kind: "conceptual", competency: BIN, says: `Only the first and last terms were written; (${lin(a, b)})${sup(n)} is not ${poly([a ** n, ...Array(n - 1).fill(0), b ** n])} — there are ${n + 1} terms.`, predict: poly([a ** n, ...Array(n - 1).fill(0), b ** n]) },
      { id: "no-binomial-coefficients", kind: "procedural", competency: BIN, says: `The binomial coefficients ${Array.from({ length: n + 1 }, (_, i) => choose(n, i)).join(", ")} were left out.`, predict: poly(Array.from({ length: n + 1 }, (_, i) => a ** (n - i) * b ** i)) },
      ...(b < 0 ? [{ id: "signs-lost", kind: "procedural", competency: EXPN, says: `The signs were lost; odd powers of ${n_(b)} are negative, so the signs alternate.`, predict: poly(bexCs(a, -b, n)) } as Bug] : []),
    ],
    distractors: ([a, b, n]) => [poly(bexCs(a, b, n).map((c, i) => (i === 1 ? c + 1 : c))), poly(bexCs(a, b, n).map((c, i) => (i === n ? c * 2 : c)))],
    variants: ([a, b, n]) => [[a, b, n + 1], [a, -b, n]].filter(bexOk),
    explain: (s) => (s.id === "row" ? `Row ${s.inputs[0]} of Pascal's triangle: ${(s.value as number[]).join(", ")}` : `Multiply each by the powers of ${s.inputs[0] === 1 ? "x" : `${s.inputs[0]}x`} and ${n_(Number(s.inputs[1]))}: ${s.value}`),
    domain: D_BEX,
    keep: bexOk,
    difficulty: ([a, b, n]) => (a === 1 && b > 0 && n <= 3 ? 1 : a === 1 || n <= 3 ? 2 : 3),
    teach: {
      idea: "(u + v)ⁿ = ⁿC₀uⁿ + ⁿC₁uⁿ⁻¹v + … + ⁿCₙvⁿ: the power of u goes down while the power of v goes up, and the coefficients are a row of Pascal's triangle.",
      method: "Write the row of Pascal's triangle for n, then each term ⁿCᵣ (ax)ⁿ⁻ʳ bʳ, and simplify each coefficient with its sign.",
      alternatives: [{ id: "repeated", title: "Multiply step by step", kind: "procedural", text: ["(ax + b)² = a²x² + 2abx + b²; multiply by (ax + b) again for the cube, and so on.", "This shows where the Pascal numbers come from: each new row adds neighbours."] }],
    },
    limits: "Powers up to 5 of ax + b; expansions with two letters or fractional terms are left out.",
  },
  {
    id: "aobinind",
    arity: 4,
    title: "The term independent of x in (xᵖ ± k/x^q)ⁿ",
    competency: BIN,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (bindOk(p) ? null : "(xᵖ + k/x^q)ⁿ with p, q from 1 to 3, k from −3 to 3 (not 0), n up to 12, and a constant term."),
    prompt: (p) => `Find the term independent of x in the expansion of ${bindText(p)}.`,
    solve: (P) => {
      const [p, q, k, n] = P;
      const r = bindR(P);
      return {
        steps: [
          { id: "general", op: "write", competency: BIN, inputs: [n, p, q], value: `${sup(n)}Cᵣ x^(${p * n} − ${p + q}r) ${n_(k)}ʳ` },
          { id: "r", op: "solve", competency: LIN, inputs: [p * n, p + q], value: r },
          { id: "term", op: "evaluate", competency: BIN, inputs: [choose(n, r), k, r], value: choose(n, r) * k ** r },
        ],
        answer: choose(n, r) * k ** r,
      };
    },
    // independent: expand by repeated multiplication, keeping each power of x (negative powers too)
    validate: ([p, q, k, n], v) => {
      let c = new Map<number, number>([[0, 1]]);
      for (let i = 0; i < n; i++) {
        const next = new Map<number, number>();
        for (const [e, x] of c) {
          next.set(e + p, (next.get(e + p) ?? 0) + x);
          next.set(e - q, (next.get(e - q) ?? 0) + x * k);
        }
        c = next;
      }
      return v === (c.get(0) ?? 0);
    },
    bugs: (P) => {
      const [p, q, k, n] = P;
      const r = bindR(P);
      const out: Bug[] = [{ id: "k-power-forgotten", kind: "procedural", competency: BIN, says: `Only ${sup(n)}C${sub(r)} was given; the term also carries (${n_(k)})${sup(r)} from k/x${q === 1 ? "" : sup(q)}.`, predict: choose(n, r) }];
      if (n % 2 === 0 && n / 2 !== r) out.push({ id: "middle-term", kind: "conceptual", competency: BIN, says: "The middle term was taken; the constant term is where the powers of x cancel, which need not be the middle.", predict: choose(n, n / 2) * k ** (n / 2) });
      if (k < 0 && r % 2 === 1) out.push({ id: "sign-lost", kind: "procedural", competency: EXPN, says: `(${n_(k)})${sup(r)} is negative, since ${r} is odd.`, predict: -choose(n, r) * k ** r });
      if (q !== 1 && Number.isInteger((p * n) / (p + 1)) && (p * n) / (p + 1) !== r) out.push({ id: "q-ignored", kind: "procedural", competency: EXPN, says: `The power of x in the denominator was taken as 1; 1/x${sup(q)} contributes x^(−${q}r).`, predict: choose(n, (p * n) / (p + 1)) * k ** ((p * n) / (p + 1)) });
      return out;
    },
    variants: ([p, q, k, n]) => [[p, q, -k, n], [p, q, k, n + p + q]].filter(bindOk),
    explain: (s) => (s.id === "general" ? `General term: ${s.value}` : s.id === "r" ? `The power of x is 0 when ${s.inputs[1]}r = ${s.inputs[0]}: r = ${s.value}` : `Term: ${s.inputs[0]} × (${n_(Number(s.inputs[1]))})${sup(Number(s.inputs[2]))} = ${n_(Number(s.value))}`),
    domain: D_BIND,
    keep: bindOk,
    difficulty: ([p, q, , n]) => (p === 1 && q === 1 && n <= 6 ? 1 : n <= 8 ? 2 : 3),
    teach: {
      idea: "In (xᵖ + k/x^q)ⁿ the general term is ⁿCᵣ (xᵖ)ⁿ⁻ʳ (k/x^q)ʳ = ⁿCᵣ kʳ x^(p(n − r) − qr). The term independent of x is the one whose power of x is 0.",
      method: "Write the power of x in the general term, set it equal to 0 to find r, then work out ⁿCᵣ kʳ.",
      alternatives: [{ id: "powers-table", title: "List the powers of x", kind: "procedural", text: ["Write the power of x in each term for r = 0, 1, 2, …: it goes down by p + q each time.", "The term where the power reaches 0 is the constant term."] }],
    },
    limits: "Expansions with a constant term and small powers; middle terms of other expansions are another family.",
  },
  // ============================================================ geometric progressions
  {
    id: "aogp",
    arity: 3,
    title: "The nth term of a geometric progression",
    competency: GP,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (gpOk(p) ? null : "A GP with first term from −9 to 9 (not 0), ratio ±2 or ±3, term 4 to 10."),
    prompt: ([a, r, n]) => `Find the ${ORD(n)} term of the geometric progression ${[a, a * r, a * r * r].map(n_).join(", ")}, …`,
    solve: ([a, r, n]) => ({
      steps: [
        { id: "ratio", op: "divide", competency: GP, inputs: [a * r, a], value: r },
        { id: "power", op: "evaluate", competency: EXPN, inputs: [r, n - 1], value: r ** (n - 1) },
        { id: "term", op: "multiply", competency: GP, inputs: [a, r ** (n - 1)], value: a * r ** (n - 1) },
      ],
      answer: a * r ** (n - 1),
    }),
    // independent: write the terms out one by one
    validate: ([a, r, n], v) => {
      let t = a;
      for (let i = 1; i < n; i++) t *= r;
      return v === t;
    },
    bugs: ([a, r, n]) => [
      { id: "power-n", kind: "procedural", competency: GP, says: `r was raised to the power ${n}; the ${ORD(n)} term is a r^${n - 1}, because the first term has no factor r.`, predict: a * r ** n },
      { id: "arithmetic", kind: "conceptual", competency: AP, says: `The common difference was used as in an AP; each term here is ${n_(r)} times the one before.`, predict: a + (n - 1) * (a * r - a) },
      ...(Math.abs((a * r) ** (n - 1)) <= 1e9 && a !== 1 ? [{ id: "ar-power", kind: "procedural", competency: EXPN, says: `(ar)^${n - 1} was worked out; only r is raised to the power, then multiply by a.`, predict: (a * r) ** (n - 1) } as Bug] : []),
    ],
    variants: ([a, r, n]) => [[a, r, n + 1], [a, -r, n]].filter(gpOk),
    explain: (s) => (s.id === "ratio" ? `r = ${n_(Number(s.inputs[0]))} ÷ ${par2(Number(s.inputs[1]))} = ${n_(Number(s.value))}` : s.id === "power" ? `r^${s.inputs[1]} = ${n_(Number(s.value))}` : `aₙ = a r^(n − 1) = ${n_(Number(s.inputs[0]))} × ${par2(Number(s.inputs[1]))} = ${n_(Number(s.value))}`),
    domain: D_GP,
    keep: gpOk,
    cap: 300,
    difficulty: ([a, r, n]) => (a > 0 && r > 0 && n <= 6 ? 1 : r > 0 ? 2 : 3),
    teach: {
      idea: "In a GP each term is the one before times r, so going from the 1st to the nth term multiplies by r exactly n − 1 times: aₙ = a r^(n − 1).",
      method: "Find r by dividing the second term by the first, then work out a r^(n − 1), keeping track of the sign.",
      alternatives: [{ id: "list", title: "Keep multiplying", kind: "conceptual", text: ["Write the terms out, multiplying by r each time, until you reach the term asked for.", "Count the multiplications: one fewer than the term's position."] }],
    },
    limits: "Whole-number GPs with ratio ±2 or ±3; fractional ratios and finding n are other families.",
  },
  {
    id: "aogpsum",
    arity: 3,
    title: "The sum of the first n terms of a GP",
    competency: GP,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (gpsOk(p) ? null : "A GP with first term from −9 to 9 (not 0), ratio ±2 or ±3, 3 to 9 terms."),
    prompt: ([a, r, n]) => `Find the sum of the first ${n} terms of the geometric progression ${series([a, a * r, a * r * r])} + ⋯`,
    solve: ([a, r, n]) => ({
      steps: [
        { id: "ratio", op: "divide", competency: GP, inputs: [a * r, a], value: r },
        { id: "power", op: "evaluate", competency: EXPN, inputs: [r, n], value: r ** n },
        { id: "sum", op: "evaluate", competency: GP, inputs: [a, r ** n, r], value: gpSum(a, r, n) },
      ],
      answer: gpSum(a, r, n),
    }),
    // independent: add the terms one by one
    validate: ([a, r, n], v) => {
      let s = 0;
      let t = a;
      for (let i = 0; i < n; i++) {
        s += t;
        t *= r;
      }
      return v === s;
    },
    bugs: ([a, r, n]) => [
      { id: "last-term", kind: "conceptual", competency: GP, says: `The ${ORD(n)} term was found; the question asks for the sum of all ${n} terms.`, predict: a * r ** (n - 1) },
      { id: "one-term-short", kind: "procedural", competency: GP, says: `r^${n - 1} was used in the formula; Sₙ = a(rⁿ − 1)/(r − 1) uses r^${n}.`, predict: gpSum(a, r, n - 1) },
      ...(Number.isInteger((a * (r ** n - 1)) / r) ? [{ id: "divide-by-r", kind: "recall", competency: GP, says: "The formula was divided by r; it is divided by r − 1.", predict: (a * (r ** n - 1)) / r } as Bug] : []),
    ],
    variants: ([a, r, n]) => [[a, r, n + 1], [a, -r, n]].filter(gpsOk),
    explain: (s) => (s.id === "ratio" ? `r = ${n_(Number(s.inputs[0]))} ÷ ${par2(Number(s.inputs[1]))} = ${n_(Number(s.value))}` : s.id === "power" ? `r^${s.inputs[1]} = ${n_(Number(s.value))}` : `Sₙ = a(rⁿ − 1)/(r − 1) = ${n_(Number(s.inputs[0]))} × (${n_(Number(s.inputs[1]))} − 1) ÷ (${n_(Number(s.inputs[2]))} − 1) = ${n_(Number(s.value))}`),
    domain: D_GPS,
    keep: gpsOk,
    cap: 300,
    difficulty: ([a, r, n]) => (a > 0 && r > 0 && n <= 5 ? 1 : r > 0 ? 2 : 3),
    teach: {
      idea: "Sₙ = a + ar + … + arⁿ⁻¹. Multiplying by r shifts every term along one place, so rSₙ − Sₙ = arⁿ − a and Sₙ = a(rⁿ − 1)/(r − 1).",
      method: "Find a and r, then put them in Sₙ = a(rⁿ − 1)/(r − 1), working out rⁿ with its sign first.",
      alternatives: [{ id: "add", title: "Add the terms", kind: "conceptual", text: ["For a few terms, list them and add.", "Check that the formula gives the same total — then trust it for many terms."] }],
    },
    limits: "Whole-number GPs with ratio ±2 or ±3 and up to 9 terms; sums with fractional ratios are in the sum-to-infinity family.",
  },
  {
    id: "aogpinf",
    arity: 3,
    title: "The sum to infinity of a geometric series",
    competency: GP,
    type: "fraction",
    mc: true,
    parse: none,
    reject: (p) => (gpiOk(p) ? null : "A geometric series with first term from −20 to 20 (not 0) and ratio p/q, |p| < q ≤ 5."),
    prompt: ([a, p, q]) => `Find the sum to infinity of the geometric series ${series([a, (a * p) / q, (a * p * p) / (q * q)])} + ⋯ (A fraction is fine.)`,
    solve: ([a, p, q]) => ({
      steps: [
        { id: "ratio", op: "divide", competency: GP, inputs: [(a * p) / q, a], value: p / q },
        { id: "sum", op: "divide", competency: GP, inputs: [a, 1 - p / q], value: (a * q) / (q - p) },
      ],
      answer: (a * q) / (q - p),
    }),
    // independent: add 400 terms of the series
    validate: ([a, p, q], v) => {
      let s = 0;
      let t = a;
      for (let i = 0; i < 400; i++) {
        s += t;
        t *= p / q;
      }
      return typeof v === "number" && near(v, s, 1e-9);
    },
    bugs: ([a, p, q]) => [
      { id: "plus-r", kind: "procedural", competency: GP, says: `1 + r was used; the sum to infinity is a/(1 − r), with r = ${fr(p / q)}.`, predict: (a * q) / (q + p) },
      ...(a !== 1 ? [{ id: "a-left-out", kind: "procedural", competency: GP, says: "The first term was left out; the sum is a/(1 − r), not 1/(1 − r).", predict: q / (q - p) } as Bug] : []),
      { id: "first-terms-only", kind: "conceptual", competency: GP, says: "Only the terms shown were added; the series goes on for ever, and the sum to infinity adds all of them.", predict: clean(a + (a * p) / q + (a * p * p) / (q * q)) },
    ],
    variants: ([a, p, q]) => [[a, -p, q], [a, p, q + 1]].filter(gpiOk),
    explain: (s) => (s.id === "ratio" ? `r = ${fr(Number(s.inputs[0]))} ÷ ${par2(Number(s.inputs[1]))} = ${fr(Number(s.value))}; |r| < 1, so the series converges` : `S∞ = a/(1 − r) = ${n_(Number(s.inputs[0]))} ÷ ${fr(Number(s.inputs[1]))} = ${fr(Number(s.value))}`),
    domain: D_GPI,
    keep: gpiOk,
    cap: 300,
    difficulty: ([a, p, q]) => (p > 0 && q === 2 ? 1 : p > 0 ? 2 : 3),
    teach: {
      idea: "When |r| < 1 the terms shrink towards 0 and the partial sums a(1 − rⁿ)/(1 − r) approach a/(1 − r), because rⁿ → 0.",
      method: "Find r = second term ÷ first term, check |r| < 1, and work out a/(1 − r).",
      alternatives: [{ id: "partial", title: "Watch the partial sums", kind: "conceptual", text: ["Add 1, 2, 3, 4 … terms and write each total down.", "The totals get closer and closer to one number: that number is the sum to infinity."] }],
    },
    limits: "Ratios p/q with q up to 5; recurring decimals are another family.",
  },
  // ============================================================ AGP and HP
  {
    id: "aoagp",
    arity: 4,
    title: "The sum to infinity of an arithmetico-geometric series",
    competency: AGP,
    type: "fraction",
    mc: true,
    parse: none,
    reject: (p) => (agpOk(p) ? null : "Σ (a + (n − 1)d) rⁿ⁻¹ with a from 1 to 9, d from 1 to 6 and r = p/q < 1, q ≤ 5."),
    prompt: ([a, d, p, q]) => `Find the sum to infinity of the arithmetico-geometric series ${a} + ${a + d}(${fr(p / q)}) + ${a + 2 * d}(${fr(p / q)})² + ${a + 3 * d}(${fr(p / q)})³ + ⋯ (A fraction is fine.)`,
    solve: ([a, d, p, q]) => {
      const r = p / q;
      return {
        steps: [
          { id: "shift", op: "subtract", competency: AGP, inputs: [a, d, r], value: `S(1 − r) = ${a} + ${d}r + ${d}r² + ⋯` },
          { id: "gp", op: "sum", competency: GP, inputs: [d * r, r], value: clean(a + (d * r) / (1 - r)) },
          { id: "divide", op: "divide", competency: AGP, inputs: [clean(a + (d * r) / (1 - r)), 1 - r], value: agpSum(a, d, r) },
        ],
        answer: agpSum(a, d, r),
      };
    },
    // independent: add 600 terms
    validate: ([a, d, p, q], v) => {
      let s = 0;
      let g = 1;
      for (let n = 0; n < 600; n++) {
        s += (a + n * d) * g;
        g *= p / q;
      }
      return typeof v === "number" && near(v, s, 1e-9);
    },
    bugs: ([a, d, p, q]) => {
      const r = p / q;
      return [
        { id: "gp-only", kind: "conceptual", competency: AGP, says: "Only the geometric part was summed, as if every coefficient were the first one; the coefficients grow by d each time.", predict: clean(a / (1 - r)) },
        { id: "one-minus-r-once", kind: "procedural", competency: AGP, says: "After subtracting rS from S, the result was not divided by 1 − r again.", predict: clean(a + (d * r) / (1 - r)) },
        { id: "d-without-r", kind: "procedural", competency: AGP, says: "The shifted series was taken to start with d instead of dr.", predict: clean(a / (1 - r) + d / (1 - r) ** 2) },
      ];
    },
    variants: ([a, d, p, q]) => [[a, d + 1, p, q], [a, d, p, q + 1]].filter(agpOk),
    explain: (s) => (s.id === "shift" ? `Subtract r times the series from itself: ${s.value}` : s.id === "gp" ? `The geometric part sums to ${fr(Number(s.inputs[0]))}/(1 − ${fr(Number(s.inputs[1]))}), so S(1 − r) = ${fr(Number(s.value))}` : `Divide by 1 − r = ${fr(Number(s.inputs[1]))}: S = ${fr(Number(s.value))}`),
    domain: D_AGP,
    keep: agpOk,
    cap: 300,
    difficulty: ([, , p, q]) => (q === 2 ? 1 : p === 1 ? 2 : 3),
    teach: {
      idea: "In an AGP the coefficients form an AP and the powers of r a GP. Subtracting rS from S lines up equal powers of r, and the differences of the AP are all d, leaving a GP.",
      method: "Write S and rS one place apart, subtract to get S(1 − r) = a + dr + dr² + ⋯ = a + dr/(1 − r), then divide by 1 − r.",
      alternatives: [{ id: "formula", title: "Use the formula", kind: "procedural", text: ["For |r| < 1, S∞ = a/(1 − r) + dr/(1 − r)².", "Check it by adding the first few terms: the totals approach your answer."] }],
    },
    limits: "Positive a, d and 0 < r < 1; finite AGP sums are another family.",
  },
  {
    id: "aohm",
    arity: 2,
    title: "The harmonic mean of two numbers",
    competency: AGP,
    type: "fraction",
    mc: true,
    parse: none,
    reject: (p) => (hmOk(p) ? null : "Two different whole numbers from 1 to 30."),
    prompt: ([a, b]) => `Find the harmonic mean of ${a} and ${b}. (A fraction is fine.)`,
    solve: ([a, b]) => ({
      steps: [
        { id: "reciprocals", op: "add", competency: AGP, inputs: [a, b], value: 1 / a + 1 / b },
        { id: "hm", op: "divide", competency: AGP, inputs: [2, 1 / a + 1 / b], value: (2 * a * b) / (a + b) },
      ],
      answer: (2 * a * b) / (a + b),
    }),
    // independent: a, H, b must be in harmonic progression: 1/a, 1/H, 1/b in AP
    validate: ([a, b], v) => typeof v === "number" && v !== 0 && near(1 / v - 1 / a, 1 / b - 1 / v, 1e-12),
    bugs: ([a, b]) => [
      { id: "arithmetic-mean", kind: "conceptual", competency: AGP, says: "The arithmetic mean was found; the harmonic mean is the reciprocal of the mean of the reciprocals.", predict: (a + b) / 2 },
      ...(Number.isInteger(Math.sqrt(a * b)) ? [{ id: "geometric-mean", kind: "conceptual", competency: AGP, says: "The geometric mean √(ab) was found; the harmonic mean is 2ab/(a + b).", predict: Math.sqrt(a * b) } as Bug] : []),
      // shown only when it is a fraction with a readable denominator
      ...((2 * a * b) / gcd(a + b, 2 * a * b) <= 1000 ? [{ id: "not-inverted", kind: "procedural", competency: AGP, says: "The mean of the reciprocals was found but not turned back over.", predict: (a + b) / (2 * a * b) } as Bug] : []),
    ],
    variants: ([a, b]) => [[a, b + 1], [a + 1, b]].filter(hmOk),
    explain: (s) => (s.id === "reciprocals" ? `1/${s.inputs[0]} + 1/${s.inputs[1]} = ${fr(Number(s.value))}` : `H = 2 ÷ ${fr(Number(s.inputs[1]))} = ${fr(Number(s.value))}`),
    domain: D_HM,
    keep: hmOk,
    cap: 300,
    difficulty: ([a, b]) => (b % a === 0 ? 1 : b <= 15 ? 2 : 3),
    word: ([a, b]) =>
      a >= 8
        ? `${nm(a + b)} cycles from home to a temple at ${a} km/h and comes back along the same road at ${b} km/h. What is the average speed for the whole journey, in km/h? (A fraction is fine.)`
        : `Toffee packets cost ₹${a} each at one shop and ₹${b} each at another. ${nm(a + b)} spends the same amount of money at each shop. What is the average price of all the packets bought, in rupees? (A fraction is fine.)`,
    teach: {
      idea: "Numbers are in harmonic progression when their reciprocals are in AP. The harmonic mean H of a and b is the middle one: 1/H is the average of 1/a and 1/b, so H = 2ab/(a + b).",
      method: "Add the reciprocals, halve, and turn the result upside down — or use 2ab/(a + b) directly.",
      alternatives: [{ id: "means", title: "Compare the three means", kind: "conceptual", text: ["For positive a ≠ b, AM > GM > HM, and GM² = AM × HM.", "So the harmonic mean should come out smaller than (a + b)/2 — a quick check."] }],
    },
    limits: "Two whole numbers up to 30; nth terms of HPs and inserting several harmonic means are other families.",
  },
  // ============================================================ logarithms
  {
    id: "aologlaw",
    arity: 3,
    title: "Using the laws of logarithms: log N in terms of log 2 and log 3",
    competency: LOG,
    type: "exact",
    mc: true,
    parse: none,
    reject: (p) => (lawOk(p) ? null : "N = 2ⁱ3ʲ5ᵏ as a terminating decimal, with small powers."),
    prompt: (p) => `Given log 2 = a and log 3 = b (logarithms to base 10), express log ${lawNumber(p).text} in terms of a and b.`,
    solve: ([i, j, k]) => ({
      steps: [
        { id: "factor", op: "factorise", competency: EXPN, inputs: [i, j, k], value: lawNumber([i, j, k]).text },
        { id: "five", op: "rewrite", competency: LOG, inputs: ["log 5 = log 10 − log 2"], value: "1 − a" },
        { id: "laws", op: "combine", competency: LOG, inputs: [i, j, k], value: lawAnswer(i - k, j, k) },
      ],
      answer: lawAnswer(i - k, j, k),
    }),
    // independent: put the true values of log 2 and log 3 into the answer and compare with log N
    validate: ([i, j, k], v) => {
      if (typeof v !== "string") return false;
      try {
        return near(evaluate(parse(v), { a: Math.log10(2), b: Math.log10(3) }), Math.log10(2 ** i * 3 ** j * 5 ** k), 1e-10);
      } catch {
        return false;
      }
    },
    bugs: ([i, j, k]) => {
      const out: Bug[] = [];
      if (k !== 0) out.push({ id: "five-as-sum", kind: "conceptual", competency: LOG, says: "log 5 was taken as log 2 + log 3, because 2 + 3 = 5; logs turn products into sums, and 5 = 10 ÷ 2, so log 5 = 1 − a.", predict: lawAnswer(i + k, j + k, 0) });
      const d = lawNumber([i, j, k]).places;
      if (d > 0) out.push({ id: "decimal-ignored", kind: "procedural", competency: LOG, says: `The decimal point was ignored; ${lawNumber([i, j, k]).text} is a whole number divided by 10${d > 1 ? sup(d) : ""}, which subtracts ${d}.`, predict: lawAnswer(i - k, j, k + d) });
      // the slip: every power is written as 1 (keeping its sign), so log 2ⁱ3ʲ5ᵏ becomes sgn(i)·a + sgn(j)·b + sgn(k)·(1 − a)
      const big = ([[2, i], [3, j], [5, k]] as [number, number][]).find(([, e]) => Math.abs(e) >= 2);
      if (big) {
        const [base, e] = big;
        out.push({ id: "powers-not-multiplied", kind: "procedural", competency: LOG, says: `The powers were not brought down: log ${base}${sup(e)} was taken as ${e < 0 ? "−" : ""}log ${base}; log xⁿ = n log x, so log ${base}${sup(e)} = ${e < 0 ? "−" : ""}${Math.abs(e)} log ${base}.`, predict: lawAnswer(Math.sign(i) - Math.sign(k), Math.sign(j), Math.sign(k)) });
      }
      return out;
    },
    distractors: ([i, j, k]) => [lawAnswer(j, i - k, k), lawAnswer(i - k, j, -k), lawAnswer(i - k + 1, j, k), lawAnswer(i - k, j + 1, k), lawAnswer(i - k, j, k + 1)],
    variants: ([i, j, k]) => [[i + 1, j, k], [i, j, k - 1]].filter(lawOk),
    explain: (s) => (s.id === "factor" ? `Write ${s.value} with powers of 2, 3 and 5: 2${sup(Number(s.inputs[0]))} × 3${sup(Number(s.inputs[1]))} × 5${sup(Number(s.inputs[2]))}` : s.id === "five" ? `log 5 = log(10/2) = 1 − a` : `log(xy) = log x + log y and log xⁿ = n log x give ${s.value}`),
    domain: D_LAW,
    keep: lawOk,
    difficulty: ([i, j, k]) => (k === 0 && i >= 0 ? 1 : k >= 0 && i >= 0 ? 2 : 3),
    teach: {
      idea: "log(xy) = log x + log y, log(x/y) = log x − log y and log xⁿ = n log x. With log 10 = 1, log 5 = log(10/2) = 1 − log 2.",
      method: "Write the number as a product of powers of 2, 3 and 5 (a decimal is a whole number over a power of 10), take logs term by term, and replace log 5 by 1 − a.",
      alternatives: [{ id: "check", title: "Check with a calculator", kind: "conceptual", text: ["log 2 ≈ 0.3010 and log 3 ≈ 0.4771.", "Put these into your answer: it should match log of the number to four decimal places."] }],
    },
    limits: "Numbers built from 2, 3 and 5 in base 10; other bases are in the change-of-base family.",
  },
  {
    id: "aolog",
    arity: 3,
    title: "Evaluating a logarithm by writing both numbers as powers of one base",
    competency: LOG,
    type: "fraction",
    mc: true,
    parse: none,
    reject: (p) => (logOk(p) ? null : "log of cʲ to base cⁱ for c = 2, 3, 5, 7, with i ≠ j and j ≠ 0."),
    prompt: ([c, i, j]) => `Evaluate log${sub(LB[c] ** i)} ${logArg(LB[c], j)}. (A fraction is fine.)`,
    solve: ([c, i, j]) => ({
      steps: [
        { id: "powers", op: "rewrite", competency: EXPN, inputs: [LB[c], i, j], value: `${LB[c] ** i} = ${LB[c]}${sup(i)}, ${logArg(LB[c], j).replace(/[()]/g, "")} = ${LB[c]}${sup(j)}` },
        { id: "ratio", op: "divide", competency: LOG, inputs: [j, i], value: j / i },
      ],
      answer: j / i,
    }),
    // independent: raise the base to the answer and compare with the number
    validate: ([c, i, j], v) => typeof v === "number" && near(v * i * Math.log(LB[c]), j * Math.log(LB[c]), 1e-12),
    bugs: ([c, i, j]) => {
      const B = LB[c] ** i;
      const X = LB[c] ** j;
      return [
        { id: "upside-down", kind: "conceptual", competency: LOG, says: `The exponents were divided the wrong way; log${sub(B)} x asks which power of ${B} gives x, so it is ${fr(j / i)}.`, predict: i / j },
        { id: "subtract-exponents", kind: "procedural", competency: EXPN, says: "The powers were subtracted; the logarithm is the power that turns the base into the number, here a quotient of the powers.", predict: j - i },
        ...(j > 0 && X % B === 0 ? [{ id: "divide-numbers", kind: "conceptual", competency: LOG, says: `${X} was divided by ${B}; a logarithm is a power, not a quotient of the numbers.`, predict: X / B } as Bug] : []),
        ...(j < 0 ? [{ id: "sign-lost", kind: "procedural", competency: EXPN, says: `1/${LB[c] ** -j} = ${LB[c]}^${j}: the power is negative.`, predict: -j / i } as Bug] : []),
      ];
    },
    variants: ([c, i, j]) => [[c, i, -j], [c, i + 1, j]].filter(logOk),
    explain: (s) => (s.id === "powers" ? `Write both as powers of ${s.inputs[0]}: ${s.value}` : `(c^${s.inputs[1]})^y = c^${s.inputs[0]} when ${s.inputs[1]}y = ${s.inputs[0]}, so the logarithm is ${fr(Number(s.value))}`),
    domain: D_LOG,
    keep: logOk,
    difficulty: ([, i, j]) => (i === 1 && j > 0 ? 1 : j > 0 ? 2 : 3),
    teach: {
      idea: "log_B X = y means Bʸ = X. If B = cⁱ and X = cʲ, then (cⁱ)ʸ = cʲ, so iy = j and y = j/i.",
      method: "Write the base and the number as powers of the same prime, then divide the power of the number by the power of the base.",
      alternatives: [{ id: "change-base", title: "Change of base", kind: "procedural", text: ["log_B X = log_c X / log_c B.", "With X = cʲ and B = cⁱ this is j/i."] }],
    },
    limits: "Bases and numbers that are powers of 2, 3, 5 or 7; logarithms needing a calculator are left out.",
  },
  {
    id: "aologeq",
    arity: 4,
    title: "Solving log x + log(x ± c) = k",
    competency: LOG,
    type: "set",
    parse: none,
    reject: (p) => (leqOk(p) ? null : "log_B x + log_B(x ± c) = k with B = 2, 3, 4, 5, 6, 7 or 10, Bᵏ ≤ 4096 and a whole-number solution."),
    prompt: ([bi, k, u, t]) => {
      const B = EB[bi];
      const P = B ** k;
      return `Solve ${logb(B)} x + ${logb(B)}(x ${t ? "+" : "−"} ${u - P / u}) = ${k}. Give every solution, separated by commas.`;
    },
    solve: ([bi, k, u, t]) => {
      const B = EB[bi];
      const P = B ** k;
      const w = P / u;
      return {
        steps: [
          { id: "combine", op: "combine", competency: LOG, inputs: [B, k], value: `x(x ${t ? "+" : "−"} ${u - w}) = ${P}` },
          { id: "roots", op: "solve", competency: QUAD, inputs: [u - w, P], value: t ? [w, -u] : [u, -w] },
          { id: "check", op: "check", competency: LOG, inputs: ["x > 0"], value: [t ? w : u] },
        ],
        answer: [t ? w : u],
      };
    },
    // independent: substitute back: both logarithms defined, and x(x ± c) = Bᵏ
    validate: ([bi, k, u, t], v) => {
      const P = EB[bi] ** k;
      const c = u - P / u;
      const s = t ? 1 : -1;
      return Array.isArray(v) && v.length === 1 && v.every((x) => x > 0 && x + s * c > 0 && near(x * (x + s * c), P));
    },
    bugs: ([bi, k, u, t]) => {
      const B = EB[bi];
      const P = B ** k;
      const w = P / u;
      const c = u - w;
      const out: Bug[] = [{ id: "extraneous-kept", kind: "conceptual", competency: LOG, says: `The negative root was kept; log of a negative number is not defined, so x = ${n_(t ? -u : -w)} is rejected.`, predict: t ? [w, -u] : [u, -w] }];
      const alt = t ? (P - c) / 2 : (P + c) / 2;
      if (alt > 0 && alt !== (t ? w : u)) out.push({ id: "sum-inside", kind: "conceptual", competency: LOG, says: `log x + log(x ${t ? "+" : "−"} ${c}) was taken as log(2x ${t ? "+" : "−"} ${c}); the sum of logs is the log of the product, x(x ${t ? "+" : "−"} ${c}).`, predict: [alt] });
      const D = c * c + 4 * B * k;
      const sq = Math.round(Math.sqrt(D));
      if (sq * sq === D && B * k !== P) out.push({ id: "power-as-product", kind: "prerequisite", competency: EXPN, says: `${B}${sup(k)} was worked out as ${B} × ${k}.`, predict: [t ? (-c + sq) / 2 : (c + sq) / 2] });
      return out;
    },
    variants: ([bi, k, u, t]) => [[bi, k, u, 1 - t]].filter(leqOk),
    explain: (s) => (s.id === "combine" ? `log x + log y = log(xy), and log_B(…) = ${s.inputs[1]} means … = ${s.inputs[0]}${sup(Number(s.inputs[1]))}: ${s.value}` : s.id === "roots" ? `Solve the quadratic: x = ${(s.value as number[]).map(n_).join(" or x = ")}` : `Only x = ${(s.value as number[])[0]} keeps both logarithms defined`),
    domain: D_LEQ,
    keep: leqOk,
    difficulty: ([bi, k]) => (EB[bi] ** k <= 16 ? 1 : EB[bi] ** k <= 100 ? 2 : 3),
    teach: {
      idea: "log x + log y = log(xy), and log_B N = k means N = Bᵏ. A logarithm is only defined for positive numbers, so every root must be checked.",
      method: "Combine the logs into one, rewrite as x(x ± c) = Bᵏ, solve the quadratic, and keep only roots that make both x and x ± c positive.",
      alternatives: [{ id: "check-each", title: "Substitute each root", kind: "procedural", text: ["Put each root back into the original equation.", "If any logarithm would have a zero or negative number inside, that root is not a solution."] }],
    },
    limits: "Sums of two logs with the same base and a whole-number solution; exponential equations are another family.",
  },
  // ============================================================ complex numbers
  {
    id: "aocq",
    arity: 3,
    title: "Solving a quadratic with negative discriminant over ℂ",
    competency: QC,
    type: "tuple",
    mc: true,
    parse: none,
    reject: (p) => (cqOk(p) ? null : "ax² + bx + c = 0 with b² < 4ac, a from 1 to 3, |b| ≤ 8, c up to 20, no common factor."),
    prompt: ([a, b, c]) => `Solve ${poly([a, b, c])} = 0 over the complex numbers. The roots are p + qi and p − qi with q > 0; write the pair (p, q).`,
    solve: ([a, b, c]) => {
      const D = b * b - 4 * a * c;
      return {
        steps: [
          { id: "disc", op: "evaluate", competency: DISC, inputs: [a, b, c], value: D },
          { id: "root", op: "simplify", competency: QC, inputs: [-D], value: `${surdOver(-D, 1)}i` },
          { id: "roots", op: "divide", competency: QC, inputs: [-b, 2 * a], value: tup(-b / (2 * a), surdOver(-D, 2 * a)) },
        ],
        answer: tup(-b / (2 * a), surdOver(-D, 2 * a)),
      };
    },
    // independent: substitute p + qi into the equation (real and imaginary parts)
    validate: ([a, b, c], v) => {
      if (typeof v !== "string") return false;
      const m = v.trim().match(/^\((.*), (.*)\)$/);
      if (!m) return false;
      const p = num(m[1]);
      const q = num(m[2]);
      return Number.isFinite(p) && q > 0 && near(a * (p * p - q * q) + b * p + c, 0, 1e-9) && near((2 * a * p + b) * q, 0, 1e-9);
    },
    bugs: ([a, b, c]) => {
      const D = 4 * a * c - b * b;
      return [
        { id: "q-not-divided", kind: "procedural", competency: QC, says: `√(${D}) was not divided by 2a = ${2 * a}; the whole of −b ± √(b² − 4ac) is divided by 2a.`, predict: tup(-b / (2 * a), surdOver(D, 1)) },
        ...(b !== 0 ? [{ id: "p-sign", kind: "procedural", competency: QUAD, says: `The real part was taken as b/(2a); it is −b/(2a) = ${fr(-b / (2 * a))}.`, predict: tup(b / (2 * a), surdOver(D, 2 * a)) } as Bug] : []),
        ...(a > 1 ? [{ id: "half-only", kind: "procedural", competency: QUAD, says: `The imaginary part was divided by 2 only; divide by 2a = ${2 * a}.`, predict: tup(-b / (2 * a), surdOver(D, 2)) } as Bug] : []),
      ];
    },
    distractors: ([a, b, c]) => [tup(-b / (2 * a), surdOver(4 * a * c - b * b, 4 * a)), tup(-b / a, surdOver(4 * a * c - b * b, 2 * a)), tup(-b / (2 * a), surdOver(4 * a * c + b * b, 2 * a))],
    variants: ([a, b, c]) => [[a, -b, c], [a, b, c + 1]].filter(cqOk),
    explain: (s) => (s.id === "disc" ? `b² − 4ac = ${n_(Number(s.value))} < 0: the roots are not real` : s.id === "root" ? `√(${n_(-Number(s.inputs[0]))}) = ${s.value}` : `x = (${n_(Number(s.inputs[0]))} ± √(b² − 4ac))/${s.inputs[1]}, so (p, q) = ${s.value}`),
    domain: D_CQ,
    keep: cqOk,
    cap: 300,
    difficulty: ([a, b]) => (a === 1 && b % 2 === 0 ? 1 : a === 1 ? 2 : 3),
    teach: {
      idea: "The quadratic formula works over ℂ: when b² − 4ac < 0, √(b² − 4ac) = i√(4ac − b²), so the roots are −b/(2a) ± i√(4ac − b²)/(2a), a conjugate pair.",
      method: "Find D = b² − 4ac, write √D = i√(−D) and simplify the surd, then divide both −b and √(−D) by 2a.",
      alternatives: [{ id: "complete-square", title: "Complete the square", kind: "procedural", text: ["Divide by a and write (x + b/(2a))² = (b² − 4ac)/(4a²), a negative number.", "Take square roots using i: x + b/(2a) = ± i√(4ac − b²)/(2a)."] }],
    },
    limits: "Real quadratics with no real roots and small coefficients; equations with complex coefficients are left out.",
  },
  {
    id: "aoconj",
    arity: 3,
    title: "A real quadratic from one complex root",
    competency: QC,
    type: "tuple",
    mc: true,
    parse: none,
    reject: (p) => (inDom(p, D_CJ) ? null : "A root a + bi with a from −6 to 6, b from 1 to 6, leading coefficient 1 to 3."),
    prompt: ([k, a, b]) => `The number ${cplx(a, b)} is a root of ${k === 1 ? "" : k}x² + px + q = 0, where p and q are real. Find (p, q).`,
    solve: ([k, a, b]) => ({
      steps: [
        { id: "conjugate", op: "conjugate", competency: QC, inputs: [a, b], value: cconj(a, b) },
        { id: "sum", op: "add", competency: QC, inputs: [a, b], value: 2 * a },
        { id: "product", op: "multiply", competency: QC, inputs: [a, b], value: a * a + b * b },
        { id: "coefficients", op: "multiply", competency: QUAD, inputs: [k], value: tup(-2 * a * k, k * (a * a + b * b)) },
      ],
      answer: tup(-2 * a * k, k * (a * a + b * b)),
    }),
    // independent: substitute a + bi into kx² + px + q (real and imaginary parts are 0)
    validate: ([k, a, b], v) => {
      const t = readTup(v, 2);
      if (!t) return false;
      const [p, q] = t;
      return near(k * (a * a - b * b) + p * a + q, 0) && near(2 * k * a * b + p * b, 0);
    },
    bugs: ([k, a, b]) => [
      ...(a !== 0 ? [{ id: "sum-sign", kind: "procedural", competency: QUAD, says: `p was taken as k × (sum of roots); the sum of the roots is −p/k, so p = −${k === 1 ? "" : `${k} × `}${par2(2 * a)} = ${n_(-2 * a * k)}.`, predict: tup(2 * a * k, k * (a * a + b * b)) } as Bug] : []),
      { id: "i-squared", kind: "recall", competency: QC, says: `(${cplx(a, b)})(${cconj(a, b)}) was worked out with i² = +1; since i² = −1 the product is a² + b² = ${a * a + b * b}.`, predict: tup(-2 * a * k, k * (a * a - b * b)) },
      ...(k > 1 ? [{ id: "k-forgotten", kind: "procedural", competency: QUAD, says: `The leading coefficient ${k} was forgotten; the quadratic is ${k}(x² − (sum)x + product).`, predict: tup(-2 * a, a * a + b * b) } as Bug] : []),
    ],
    distractors: ([k, a, b]) => [tup(-a * k, k * (a * a + b * b)), tup(-2 * a * k, k * (a * a + b * b) + 1), tup(2 * a * k, k * (a * a - b * b))],
    variants: ([k, a, b]) => [[k, -a, b], [k, a, b + 1]].filter((p) => inDom(p, D_CJ)),
    explain: (s) => (s.id === "conjugate" ? `Real coefficients: the conjugate ${s.value} is also a root` : s.id === "sum" ? `Sum of roots = ${n_(Number(s.value))}` : s.id === "product" ? `Product of roots = a² + b² = ${s.value}` : `${s.inputs[0] === 1 ? "" : s.inputs[0]}(x² − (sum)x + product), so (p, q) = ${s.value}`),
    domain: D_CJ,
    difficulty: ([k, a]) => (k === 1 && a >= 0 ? 1 : k === 1 ? 2 : 3),
    teach: {
      idea: "A polynomial with real coefficients has its non-real roots in conjugate pairs: if a + bi is a root, so is a − bi. Their sum is 2a and their product is a² + b².",
      method: "Write the quadratic as k(x² − (sum)x + product) and read off p and q.",
      alternatives: [{ id: "substitute", title: "Substitute and match parts", kind: "procedural", text: ["Put x = a + bi into kx² + px + q and expand, using i² = −1.", "The real part and the imaginary part must both be 0: two equations for p and q."] }],
    },
    limits: "Quadratics from one complex root with whole-number parts; cubics with a conjugate pair are another family.",
  },
];

/** A number as a factor in a step: in brackets when negative. */
function par2(v: number) {
  return v < 0 ? `(${n_(v)})` : String(v);
}
