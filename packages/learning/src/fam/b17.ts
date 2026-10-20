/**
 * families@2, batch b17: Grade 11–12 matrices (rank test for consistency, symmetric/skew-symmetric parts, (AB)′),
 * relations, functions and binary operations, and calculus (first principles, rates, monotonicity, extrema,
 * continuity, differentiability, concavity, area, properties of definite integrals, second derivatives and
 * differential equations). Every validator uses a different method from its solver: determinants (Cramer) against
 * row reduction, brute force over sample triples or grids, central differences, Simpson's rule, a midpoint sum, or a
 * Runge–Kutta integration of the differential equation. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value, Visual } from "../family-kit";
import { coef, fmt, gcd, near, simpson, sup } from "../family-kit";
import { evaluate, parse } from "../answer-types";

const SC = "MATH.matrices.system-consistency";
const RANK = "MATH.matrices.rank-row-reduction";
const MSYS = "MATH.algebra.matrix-systems";
const DET = "MATH.algebra.determinants";
const MAT = "MATH.algebra.matrices";
const TS = "MATH.matrices.transpose-symmetry";
const BIN = "MATH.sets-relations.binary-operations";
const FT = "MATH.sets-relations.function-types";
const FUN = "MATH.algebra.functions";
const RP = "MATH.sets-relations.relation-properties";
const REL = "MATH.algebra.relations";
const DER = "MATH.calculus.derivatives";
const LIM = "MATH.calculus.limits";
const APP = "MATH.calculus.applications";
const RULES = "MATH.calculus.derivative-rules";
const AREA = "MATH.calculus.area-integrals";
const DEFI = "MATH.calculus.definite-integrals";
const CONT = "MATH.calculus.continuity";
const CURVE = "MATH.calculus.curve-sketching";
const DIP = "MATH.calculus.definite-integral-properties";
const DIFF = "MATH.calculus.differentiability";
const DE = "MATH.calculus.differential-equations";
const HD = "MATH.calculus.higher-derivatives";
const HOM = "MATH.calculus.homogeneous-de";
const INDEF = "MATH.calculus.indefinite-integrals";
const METH = "MATH.calculus.integration-methods";
const FACT = "MATH.algebra.factorisation";
const INV = "MATH.trigonometry.inverse";

// ---------------------------------------------------------------- printing helpers

const none = () => null;
/** An integer as printed, − for minus. */
const N = (v: number) => (v < 0 ? `−${-v}` : String(v));
/** A rational as printed (3/2, −1/4). */
const F = (x: number) => {
  const s = fmt(x);
  return s.startsWith("-") ? `−${s.slice(1)}` : s;
};
/** " + 3" / " − 3" / "" for a constant appended to a term. */
const sg = (v: number) => (v < 0 ? ` − ${-v}` : v > 0 ? ` + ${v}` : "");
/** Coefficient × body terms joined with signs; a body "" is a constant, a body "/r" divides; rational coefficients. */
function sum(terms: [number, string][]): string {
  const out: string[] = [];
  for (const [c, body] of terms) {
    if (Math.abs(c) < 1e-12) continue;
    const a = Math.abs(c);
    const [n, d] = fmt(a).split("/");
    let t: string;
    if (!body) t = fmt(a);
    else if (body.startsWith("/")) t = d ? `${n}/(${d}${body.slice(1)})` : `${n}/${body.slice(1)}`;
    else if (!d) t = a === 1 ? body : `${a}${body.startsWith("log") ? " " : ""}${body}`;
    else t = `${n === "1" ? "" : n}${body}/${d}`;
    out.push(out.length ? `${c < 0 ? "−" : "+"} ${t}` : c < 0 ? `−${t}` : t);
  }
  return out.length ? out.join(" ") : "0";
}
/** x to a power as a body: superscripts (pretty) or ^ (answers); negative powers divide. */
const xb = (e: number, v = "x", pretty = true): string => (e === 0 ? "" : e < 0 ? `/${xb(-e, v, pretty)}` : e === 1 ? v : pretty ? `${v}${sup(e)}` : `${v}^${e}`);
/** A polynomial for a prompt (x², x³) and for an answer (x^2). */
const pp = (t: [number, number][], v = "x") => sum(t.map(([c, e]) => [c, xb(e, v)] as [number, string]));
const pa = (t: [number, number][], v = "x") => sum(t.map(([c, e]) => [c, xb(e, v, false)] as [number, string]));
/** The factor x − r as written in a product: a lone x is not bracketed. */
const fx = (r: number) => (r === 0 ? "x" : `(x${sg(-r)})`);
/** (x − r)(x − t) with the bare x first: x(x + 4), (x − 1)(x − 3). */
const fx2 = (r: number, t: number) => (t === 0 && r !== 0 ? `x${fx(r)}` : `${fx(r)}${fx(t)}`);
/** A sum in brackets only when it has more than one term. */
const br = (t: string) => (/ [+−] /.test(t) ? `(${t})` : t);
/** k·x inside a function: x, 2x, −x. */
const kx = (k: number, v = "x") => (k === 1 ? v : k === -1 ? `−${v}` : `${N(k)}${v}`);
/** e^(ax) as an answer body: e^x, e^(2x), e^(−x); "" when a = 0. */
const ex = (a: number) => (a === 0 ? "" : a === 1 ? "e^x" : `e^(${kx(a)})`);
const exPretty = (a: number) => (a === 0 ? "" : a === 1 ? "eˣ" : `e^(${kx(a)})`);
const SUBS: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "-": "₋" };
const sub = (n: number) => String(n).replace(/./g, (c) => SUBS[c] ?? c);
/** ∫ with integer limits written as sub- and superscripts. */
const intg = (a: number, b: number) => `∫${sub(a)}${sup(b)}`;
const mat = (M: number[][]) => `[${M.map((r) => `[${r.map(F).join(", ")}]`).join(", ")}]`;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sqfree = (n: number): [number, number] => {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++)
    while (m % (p * p) === 0) {
      m /= p * p;
      k *= p;
    }
  return [k, m];
};
/** r√m in simplest exact form (r rational). */
const surdQ = (r: number, m: number) => {
  if (m === 1) return fmt(r);
  const [n, d] = fmt(Math.abs(r)).split("/");
  return `${r < 0 ? "-" : ""}${n === "1" ? "" : n}√${m}${d ? `/${d}` : ""}`;
};

// ---------------------------------------------------------------- reading answers (validators)

const rat = (t: string) => {
  const m = t.match(/^([+-]?\d+)(?:\/(\d+))?$/);
  return m ? Number(m[1]) / (m[2] ? Number(m[2]) : 1) : NaN;
};
const clean = (v: string) => v.replace(/[−–]/g, "-").replace(/\s+/g, "");
function readMat(v: Value): number[][] | null {
  if (typeof v !== "string") return null;
  const s = clean(v);
  if (!/^\[\[.*\]\]$/.test(s)) return null;
  const M = s.slice(2, -2).split("],[").map((r) => r.split(",").map(rat));
  return M.some((r) => r.some((x) => !Number.isFinite(x)) || r.length !== M[0].length) ? null : M;
}
function readTuple(v: Value): number[] | null {
  if (typeof v !== "string") return null;
  const s = clean(v).replace(/^\((.*)\)$/, "$1");
  const t = s.split(",").map(rat);
  return t.length >= 2 && t.every(Number.isFinite) ? t : null;
}
type Piece = { lo: number; hi: number; lc: boolean; hc: boolean };
function readIv(v: Value): Piece[] | null {
  if (typeof v !== "string") return null;
  const s = clean(v).replace(/∞|infinity/gi, "inf");
  const out: Piece[] = [];
  for (const part of s.split(/∪|U/)) {
    const m = part.match(/^([[(])(-?inf|[+-]?\d+(?:\/\d+)?),(\+?inf|[+-]?\d+(?:\/\d+)?)([\])])$/);
    if (!m) return null;
    const num = (t: string) => (t === "-inf" ? -Infinity : t.replace("+", "") === "inf" ? Infinity : rat(t));
    out.push({ lo: num(m[2]), hi: num(m[3]), lc: m[1] === "[", hc: m[4] === "]" });
  }
  return out;
}
/** Whether an open-interval answer is exactly the set where `pos` holds, with end points where `zero` vanishes. */
function ivMatches(v: Value, pos: (x: number) => boolean, zero: (x: number) => number): boolean {
  const iv = readIv(v);
  if (!iv || iv.some((p) => p.lc || p.hc || !(p.lo < p.hi))) return false;
  for (const p of iv) for (const e of [p.lo, p.hi]) if (Number.isFinite(e) && Math.abs(zero(e)) > 1e-3) return false;
  const inside = (x: number) => iv.some((p) => x > p.lo && x < p.hi);
  for (let x = -12.0137; x < 12; x += 0.05) if (pos(x) !== inside(x)) return false;
  return true;
}
/** An exact numeric answer's value (√, fractions). */
const valueOf = (v: Value): number => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  try {
    return evaluate(parse(v), {});
  } catch {
    return NaN;
  }
};
/** Whether an expression answer in x agrees with `truth` at the given points. */
function agrees(v: Value, truth: (x: number) => number, xs: number[], tol = 1e-6): boolean {
  if (typeof v !== "string") return false;
  try {
    const e = parse(v);
    for (const x of xs) {
      const t = truth(x);
      const a = evaluate(e, { x });
      if (!Number.isFinite(a) || !Number.isFinite(t) || Math.abs(a - t) > tol * Math.max(1, Math.abs(t))) return false;
    }
    return true;
  } catch {
    return false;
  }
}
const d1 = (f: (x: number) => number, x: number, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);
const d2 = (f: (x: number) => number, x: number, h = 5e-4) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
/** y(x1) for y′ = F(x, y), y(x0) = y0, by the classical Runge–Kutta method. */
function rk4(Fn: (x: number, y: number) => number, x0: number, y0: number, x1: number, n = 4000): number {
  const h = (x1 - x0) / n;
  let x = x0;
  let y = y0;
  for (let i = 0; i < n; i++) {
    const k1 = Fn(x, y);
    const k2 = Fn(x + h / 2, y + (h * k1) / 2);
    const k3 = Fn(x + h / 2, y + (h * k2) / 2);
    const k4 = Fn(x + h, y + h * k3);
    y += (h * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
    x += h;
  }
  return y;
}
/** Whether an answer y(x) agrees with the numerical solution of y′ = F, y(x0) = y0. */
const solvesIvp = (v: Value, Fn: (x: number, y: number) => number, x0: number, y0: number, xs: number[]) => {
  const ys = new Map(xs.map((x) => [x, rk4(Fn, x0, y0, x)]));
  return agrees(v, (x) => ys.get(x)!, xs, 1e-6);
};
const det3 = (M: number[][]) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
const withCol = (M: number[][], j: number, b: number[]) => M.map((r, i) => r.map((x, jj) => (jj === j ? b[i] : x)));
const step = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });

// ---------------------------------------------------------------- linear systems (rank method)

const P0 = [2, -1, 1];
/** Rows (1, a, 1) and (c, d, 2), a third row m·r1 + k·r2 (+ δ in z), right sides from the point (2, −1, 1). */
function system(a: number, c: number, d: number, m: number, k: number) {
  const r1 = [1, a, 1];
  const r2 = [c, d, 2];
  const comb = r1.map((x, i) => m * x + k * r2[i]);
  const dot = (r: number[]) => r[0] * P0[0] + r[1] * P0[1] + r[2] * P0[2];
  return { r1, r2, comb, b1: dot(r1), b2: dot(r2) };
}
const eqn = (r: number[], b: number | string) => `${sum([[r[0], "x"], [r[1], "y"], [r[2], "z"]])} = ${typeof b === "number" ? N(b) : b}`;
const rankSys = ([a, c, d, m, k, cat]: number[]) => {
  const { r1, r2, comb, b1, b2 } = system(a, c, d, m, k);
  const delta = cat === 0 ? ((a + d) % 2 === 0 ? 1 : -1) : 0;
  const eps = cat === 2 ? (k > 0 ? 3 : -2) : 0;
  const r3 = [comb[0], comb[1], comb[2] + delta];
  return { A: [r1, r2, r3], B: [b1, b2, m * b1 + k * b2 + delta * P0[2] + eps] };
};
const SYS_CHOICES = ["exactly one solution", "infinitely many solutions", "no solution"];
/** Cramer's determinants: 0 unique, 1 infinitely many, 2 none (for ρ(A) ≥ 2); null when ρ(A) < 2. */
function cramer(A: number[][], B: number[]): number | null {
  const minors = [0, 1].flatMap((i) => [1, 2].filter((j) => j > i).flatMap((j) => [0, 1].flatMap((p) => [1, 2].filter((q) => q > p).map((q) => A[i][p] * A[j][q] - A[i][q] * A[j][p]))));
  if (minors.every((x) => x === 0)) return null;
  if (det3(A) !== 0) return 0;
  return [0, 1, 2].some((j) => det3(withCol(A, j, B)) !== 0) ? 2 : 1;
}
const sysKeep = ([a, c, d, m, k]: number[]) => {
  if (k === 0 || d - a * c === 0) return false;
  const { comb } = system(a, c, d, m, k);
  return comb[0] !== 0 || comb[1] !== 0;
};

// ---------------------------------------------------------------- binary operations

const binIdOp = (form: number, k: number) => (a: number, b: number) => (form === 0 ? a + b - k : form === 1 ? a + b + k : form === 2 ? (a * b) / k : a + b + k * a * b);
const binIdSet = (form: number, k: number) => (form <= 1 ? "ℤ" : form === 2 ? "ℚ − {0}" : `ℚ − {${F(-1 / k)}}`);
const binIdDef = (form: number, k: number) => (form === 0 ? `a + b − ${k}` : form === 1 ? `a + b + ${k}` : form === 2 ? `ab/${k}` : `a + b ${k < 0 ? "−" : "+"} ${Math.abs(k) === 1 ? "" : Math.abs(k)}ab`);
const binIdE = (form: number, k: number) => (form === 0 ? k : form === 1 ? -k : form === 2 ? k : 0);
const binIdInv = (form: number, k: number, t: number) => (form === 0 ? 2 * k - t : form === 1 ? -2 * k - t : form === 2 ? (k * k) / t : -t / (1 + k * t));

/** a ∗ b for the property family: [display, operation, category 0 both, 1 commutative only, 2 associative only, 3 neither]. */
function binProp(form: number, k: number, l: number): [string, (a: number, b: number) => number, number] | null {
  const co = (x: number) => (x === 1 ? "" : String(x));
  const plus = (x: number) => (x === 0 ? "" : ` ${x < 0 ? "−" : "+"} ${Math.abs(x)}`);
  switch (form) {
    case 0:
      return k >= 1 && k <= 5 && l >= -3 && l <= 3 ? [`${co(k)}a + ${co(k)}b${plus(l)}`, (a, b) => k * a + k * b + l, k === 1 ? 0 : 1] : null;
    case 1:
      return k >= 1 && k <= 5 && l >= 1 && l <= 5 && k !== l ? [`${co(k)}a + ${co(l)}b`, (a, b) => k * a + l * b, 3] : null;
    case 2:
      return k !== 0 && l === 0 ? [`a + b ${k < 0 ? "−" : "+"} ${co(Math.abs(k))}ab`, (a, b) => a + b + k * a * b, 0] : null;
    case 3:
      return k === 1 && l !== 0 ? [`ab${plus(l)}`, (a, b) => a * b + l, 1] : null;
    case 4:
      return k === 1 && l === 0 ? ["|a − b|", (a, b) => Math.abs(a - b), 1] : null;
    case 5:
      return k >= 2 && k <= 5 && l === 0 ? [`${k}ab`, (a, b) => k * a * b, 0] : null;
    case 6:
      return k >= 1 && k <= 4 && l === 0 ? [["a", "b", "a|b|", "|a|b"][k - 1], [(a: number) => a, (_: number, b: number) => b, (a: number, b: number) => a * Math.abs(b), (a: number, b: number) => Math.abs(a) * b][k - 1] as (a: number, b: number) => number, 2] : null;
    case 7:
      return k === 1 && l >= -3 && l <= 3 ? [`a − b${plus(l)}`, (a, b) => a - b + l, 3] : null;
    case 8:
      return k >= 2 && k <= 5 && l === 0 ? [`(a + b)/${k}`, (a, b) => (a + b) / k, 1] : null;
    case 9:
      return k >= 1 && k <= 3 ? [`ab + ${co(k)}a + ${co(k)}b${plus(l)}`, (a, b) => a * b + k * a + k * b + l, l === k * k - k ? 0 : 1] : null;
    case 10:
      // one entry compared with a fixed number: associative (the other entry is ignored) but not commutative
      return k >= 1 && k <= 4 && l >= -2 && l <= 3
        ? [[`max{a, ${N(l)}}`, `min{a, ${N(l)}}`, `max{b, ${N(l)}}`, `min{b, ${N(l)}}`][k - 1], [(a: number) => Math.max(a, l), (a: number) => Math.min(a, l), (_: number, b: number) => Math.max(b, l), (_: number, b: number) => Math.min(b, l)][k - 1] as (a: number, b: number) => number, 2]
        : null;
    default:
      return null;
  }
}
const BIN_CHOICES = ["commutative and associative", "commutative but not associative", "associative but not commutative", "neither commutative nor associative"];

// ---------------------------------------------------------------- one-one and onto

type Dom = "R" | "N" | "Z" | "H";
type Cod = "R" | "N" | "Z" | "B";
const SETNAME: Record<string, string> = { R: "ℝ", N: "ℕ", Z: "ℤ", H: "[0, ∞)" };
/** [domain, codomain, f as printed, f, answer index] for kind, a, b; null outside the kind. */
function ontoKind(kind: number, a: number, b: number): [Dom, Cod, string, (x: number) => number, number] | null {
  const lin = `${kx(a)}${sg(b)}`;
  const sq = `${a === 1 ? "" : a === -1 ? "−" : N(a)}x²${sg(b)}`;
  switch (kind) {
    case 0:
      return a !== 0 ? ["R", "R", lin, (x) => a * x + b, 0] : null;
    case 1:
      return a >= 1 && b >= 0 && !(a === 1 && b === 0) ? ["N", "N", lin, (x) => a * x + b, 1] : null;
    case 2:
      return a !== 0 ? ["R", "R", sq, (x) => a * x * x + b, 3] : null;
    case 3:
      return a > 0 ? ["R", "B", sq, (x) => a * x * x + b, 2] : null;
    case 4:
      return a > 0 ? ["H", "B", sq, (x) => a * x * x + b, 0] : null;
    case 5:
      return Math.abs(a) >= 2 ? ["Z", "Z", lin, (x) => a * x + b, 1] : null;
    case 6:
      return a !== 0 ? ["R", "R", `${a === 1 ? "" : a === -1 ? "−" : N(a)}x³${sg(b)}`, (x) => a * x ** 3 + b, 0] : null;
    case 7:
      return a > 0 ? ["Z", "Z", sq, (x) => a * x * x + b, 3] : null;
    case 8:
      return ["R", "B", `${a === 0 ? "|x|" : `|x${sg(-a)}|`}${sg(b)}`, (x) => Math.abs(x - a) + b, 2];
    default:
      return null;
  }
}
const ONTO_CHOICES = ["one-one and onto (bijective)", "one-one but not onto", "onto but not one-one", "neither one-one nor onto"];
/** Classify by brute force: integer windows, or a fine grid with sign changes for continuous functions. */
function classifyMap(dom: Dom, cod: Cod, g: (x: number) => number, b: number): number | null {
  const discrete = dom === "N" || dom === "Z";
  const xs = dom === "N" ? range(1, 300) : dom === "Z" ? range(-300, 300) : dom === "R" ? range(-2000, 2000).map((i) => i / 100) : range(0, 2000).map((i) => i / 100);
  const ys = xs.map(g);
  if (cod === "N" && ys.some((y) => !Number.isInteger(y) || y < 1)) return null;
  if (cod === "Z" && ys.some((y) => !Number.isInteger(y))) return null;
  if (cod === "B" && ys.some((y) => y < b - 1e-9)) return null;
  let one: boolean;
  if (discrete) one = new Set(ys).size === ys.length;
  else {
    const dd = ys.slice(1).map((y, i) => y - ys[i]);
    one = dd.every((v) => v > 0) || dd.every((v) => v < 0);
  }
  const targets = cod === "N" ? range(1, 40) : cod === "Z" ? range(-40, 40) : cod === "R" ? [-15, -7.5, -1, 0, 0.3, 2, 9, 15] : [b, b + 0.25, b + 1, b + 7, b + 15];
  const hit = (t: number) => (discrete ? ys.includes(t) : ys.some((y, i) => Math.abs(y - t) < 1e-9 || (i > 0 && (ys[i - 1] - t) * (y - t) < 0)));
  const onto = targets.every(hit);
  return one && onto ? 0 : one ? 1 : onto ? 2 : 3;
}

// ---------------------------------------------------------------- relations

const pairsOf = (mask: number, n: number) => {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (mask & (1 << (i * n + j))) out.push([i + 1, j + 1]);
  return out;
};
const showRel = (ps: [number, number][]) => `{${ps.map(([a, b]) => `(${a}, ${b})`).join(", ")}}`;
const popcount = (m: number) => {
  let c = 0;
  for (let x = m; x; x >>= 1) c += x & 1;
  return c;
};
/** Reflexive, symmetric, transitive by checking the pair list. */
function relProps(ps: [number, number][], n: number): [boolean, boolean, boolean] {
  const has = (a: number, b: number) => ps.some(([x, y]) => x === a && y === b);
  const r = range(1, n).every((a) => has(a, a));
  const s = ps.every(([a, b]) => has(b, a));
  const t = ps.every(([a, b]) => ps.every(([c, d]) => c !== b || has(a, d)));
  return [r, s, t];
}
const propText = ([r, s, t]: boolean[]) => `${r ? "reflexive" : "not reflexive"}, ${s ? "symmetric" : "not symmetric"}, ${t ? "transitive" : "not transitive"}`;
/** FNV-1a hash of a string (a fixed, parameter-dependent order for the options). */
const fnv = (t: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) x = Math.imul(x ^ t.charCodeAt(i), 0x01000193) >>> 0;
  return x;
};
/** The true statement and its three one-property flips, in an order fixed by a hash of the relation (so the letter of
 * the right answer is not predictable). The everyday form uses the same choices and index. */
const relChoices = (mask: number) => {
  const T = relProps(pairsOf(mask, 3), 3);
  const flips = [0, 1, 2].map((i) => T.map((x, j) => (j === i ? !x : x)));
  return [T, ...flips].map(propText).sort((x, y) => fnv(`${mask}:${x}`) - fnv(`${mask}:${y}`) || (x < y ? -1 : 1));
};
/** The pairs coded by the 16 bits of m: on {1, 2, 3, 4} every pair; on {1, …, 5} the 16 pairs (a, b) with a ≠ b and
 * a ≤ 4 (so 5 appears only as a second entry). */
const EQ5: [number, number][] = range(1, 4).flatMap((a) => range(1, 5).filter((b) => b !== a).map((b) => [a, b] as [number, number]));
const eqPairs = (n: number, m: number): [number, number][] => (n === 4 ? pairsOf(m, 4) : EQ5.filter((_, i) => m & (1 << i)));
/** Union–find classes of A = {1, …, n} joined by R. */
function classes(ps: [number, number][], n: number): number[] {
  const parent = range(0, n);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (const [a, b] of ps) parent[find(a)] = find(b);
  const size = new Map<number, number>();
  for (let x = 1; x <= n; x++) size.set(find(x), (size.get(find(x)) ?? 0) + 1);
  return [...size.values()];
}

// ---------------------------------------------------------------- calculus helpers

/** f(x) = s(2x³ − 3(α+β)x² + 6αβx) + c, so f′(x) = 6s(x − α)(x − β). */
const cubic = (al: number, be: number, s: number, c: number) => (x: number) => s * (2 * x ** 3 - 3 * (al + be) * x * x + 6 * al * be * x) + c;
const cubicText = (al: number, be: number, s: number, c: number) => pp([[2 * s, 3], [-3 * s * (al + be), 2], [6 * s * al * be, 1], [c, 0]]);
const openIv = (al: number, be: number, outer: boolean) => (outer ? `(−∞, ${N(al)}) ∪ (${N(be)}, ∞)` : `(${N(al)}, ${N(be)})`);
/** Breakpoints where g changes sign on [lo, hi], then Simpson's rule on |g| piece by piece. */
function absArea(g: (x: number) => number, lo: number, hi: number): number {
  const M = 2000;
  const pts = [lo];
  for (let i = 0; i < M; i++) {
    const x0 = lo + ((hi - lo) * i) / M;
    const x1 = lo + ((hi - lo) * (i + 1)) / M;
    const g0 = g(x0);
    const g1 = g(x1);
    if (g0 === 0 && i > 0) pts.push(x0);
    else if (g0 * g1 < 0) {
      let a = x0;
      let b = x1;
      for (let k = 0; k < 80; k++) {
        const mid = (a + b) / 2;
        if (g(a) * g(mid) <= 0) b = mid;
        else a = mid;
      }
      pts.push((a + b) / 2);
    }
  }
  pts.push(hi);
  let s = 0;
  for (let i = 0; i + 1 < pts.length; i++) s += Math.abs(simpson(g, pts[i], pts[i + 1], 400));
  return s;
}
/** Symmetric Richardson estimate of lim g(x) as x → a. */
const limitAt = (g: (x: number) => number, a: number, h = 1e-2) => {
  const s = (t: number) => (g(a + t) + g(a - t)) / 2;
  return (4 * s(h / 2) - s(h)) / 3;
};
const D = (k: number) => (k === 0 ? "y" : k === 1 ? "dy/dx" : `d${sup(k)}y/dx${sup(k)}`);
const DP = (k: number, p: number) => (p === 1 ? D(k) : k === 0 ? `y${sup(p)}` : `(${D(k)})${sup(p)}`);

export const B17: Def[] = [
  // ============================================================== matrices
  {
    id: "aqrank",
    arity: 6,
    title: "Deciding the number of solutions of a 3 × 3 system by ranks",
    competency: SC,
    type: "choice",
    parse: none,
    reject: (p) => {
      const [a, c, d, m, k, cat] = p;
      return a < -2 || a > 2 || c < 1 || c > 3 || d < -2 || d > 3 || m < 1 || m > 2 || k < -2 || k > 2 || cat < 0 || cat > 2 || !sysKeep(p) ? "Three equations in x, y, z whose coefficient matrix has rank at least 2." : null;
    },
    prompt: (p) => {
      const { A, B } = rankSys(p);
      return `Use the rank method to decide how many solutions this system has: ${eqn(A[0], B[0])}, ${eqn(A[1], B[1])}, ${eqn(A[2], B[2])}.`;
    },
    word: (p) => {
      const { A, B } = rankSys(p);
      const [who, friend] = [["Meena", "Kavin"], ["Fatima", "Ravi"], ["Anu", "Arjun"], ["Selvi", "Imran"]][Math.abs(p[0] + 2 * p[2] + p[4]) % 4];
      return `For a maths-club puzzle, ${who} writes three clues about three unknown numbers x, y and z (they may be negative or fractions): ${eqn(A[0], B[0])}; ${eqn(A[1], B[1])}; ${eqn(A[2], B[2])}. Before trying to solve, ${friend} checks whether the clues fix the numbers, leave them undecided, or contradict each other. Using the rank method, how many solutions do the three clues have together?`;
    },
    choices: () => SYS_CHOICES,
    solve: (p) => {
      const cat = p[5];
      const rA = cat === 0 ? 3 : 2;
      const rAB = cat === 1 ? 2 : 3;
      return {
        steps: [step("rankA", "row-reduce", RANK, ["A"], rA), step("rankAB", "row-reduce", RANK, ["[A | B]"], rAB), step("compare", "compare", SC, [rA, rAB], cat)],
        answer: cat,
      };
    },
    // independent: Cramer's determinants (|A| and the three with a column replaced by B), not row reduction
    validate: (p, v) => {
      const { A, B } = rankSys(p);
      return v === cramer(A, B);
    },
    bugs: ([, , , , , cat]) =>
      cat === 0
        ? [{ id: "equal-ranks-infinite", kind: "conceptual", competency: SC, says: "Equal ranks were read as 'infinitely many solutions'. Equal ranks mean the system is consistent; the solution is unique when that rank equals the number of unknowns (3).", predict: 1 }]
        : cat === 1
          ? [
              { id: "rank-less-none", kind: "conceptual", competency: SC, says: "ρ(A) < 3 was read as 'no solution'. When ρ(A) = ρ([A | B]) < 3 the system is consistent with infinitely many solutions.", predict: 2 },
              { id: "equal-ranks-unique", kind: "conceptual", competency: SC, says: "Equal ranks were taken to mean one solution; one solution needs the common rank to be 3, the number of unknowns.", predict: 0 },
            ]
          : [{ id: "singular-infinite", kind: "conceptual", competency: SC, says: "ρ(A) = 2 was taken to mean infinitely many solutions without comparing with ρ([A | B]). Here the augmented matrix has rank 3, so the system is inconsistent.", predict: 1 }],
    variants: () => [],
    explain: (s) => (s.id === "rankA" ? `Row-reduce A: it has ${s.value} non-zero rows, so ρ(A) = ${s.value}` : s.id === "rankAB" ? `Row-reduce [A | B]: ρ([A | B]) = ${s.value}` : s.value === 0 ? "ρ(A) = ρ([A | B]) = 3 = number of unknowns: exactly one solution" : s.value === 1 ? "ρ(A) = ρ([A | B]) = 2 < 3: consistent, with infinitely many solutions" : "ρ(A) = 2 ≠ ρ([A | B]) = 3: inconsistent, no solution"),
    domain: [[-2, 2], [1, 3], [-2, 3], [1, 2], [-2, 2], [0, 2]],
    keep: sysKeep,
    cap: 400,
    difficulty: ([, , , m, k, cat]) => (cat === 0 && m === 1 ? 1 : cat === 0 || Math.abs(k) === 1 ? 2 : 3),
    teach: {
      idea: "AX = B is consistent exactly when ρ(A) = ρ([A | B]). If that common rank equals the number of unknowns there is one solution; if it is smaller there are infinitely many.",
      method: "Write [A | B], reduce it to echelon form with row operations, count the non-zero rows of A and of [A | B], and compare them with each other and with 3.",
      alternatives: [{ id: "det_first", title: "Determinant first", kind: "procedural", text: ["Find |A|. If |A| ≠ 0 the system has exactly one solution.", "If |A| = 0, replace each column of A by B in turn: if any of these determinants is non-zero there is no solution; here (with ρ(A) = 2) if all are zero there are infinitely many."] }],
    },
    limits: "Three equations in three unknowns with ρ(A) = 2 or 3 and small whole coefficients; homogeneous systems and ρ(A) = 1 are left out.",
  },
  {
    id: "aqcpar",
    arity: 6,
    title: "Finding the parameter values that make a system singular or consistent",
    competency: SC,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => {
      const [a, c, d, m, k, q] = p;
      return a < -2 || a > 2 || c < 1 || c > 3 || d < -2 || d > 3 || m < 1 || m > 2 || k < -2 || k > 2 || q < 0 || q > 1 || !sysKeep(p) ? "Three equations in x, y, z with λ in the third equation." : null;
    },
    prompt: ([a, c, d, m, k, q]) => {
      const { r1, r2, comb, b1, b2 } = system(a, c, d, m, k);
      const xy = sum([[comb[0], "x"], [comb[1], "y"]]);
      if (q === 0) return `For which value of λ does the system ${eqn(r1, b1)}, ${eqn(r2, b2)}, ${xy === "0" ? "" : `${xy} + `}λz = μ fail to have a unique solution?`;
      return `For which value of μ does the system ${eqn(r1, b1)}, ${eqn(r2, b2)}, ${eqn(comb, "μ")} have infinitely many solutions?`;
    },
    solve: ([a, c, d, m, k, q]) => {
      const { comb, b1, b2 } = system(a, c, d, m, k);
      if (q === 0) return { steps: [step("det", "evaluate", DET, ["|A|", "λ"], `${d - a * c === 1 ? "" : d - a * c === -1 ? "−" : N(d - a * c)}(λ${sg(-comb[2])})`), step("solve", "solve", SC, ["|A| = 0"], comb[2])], answer: comb[2] };
      const mu = m * b1 + k * b2;
      return { steps: [step("combine", "compare", RANK, [m, k], `R₃ = ${m}R₁ ${k < 0 ? "−" : "+"} ${Math.abs(k)}R₂`), step("rhs", "evaluate", SC, [m, b1, k, b2], mu)], answer: mu };
    },
    // independent: q = 0, |A| = 0 by cofactor expansion at λ = v; q = 1, all of Cramer's determinants vanish at μ = v
    validate: ([a, c, d, m, k, q], v) => {
      if (typeof v !== "number") return false;
      const { r1, r2, comb, b1, b2 } = system(a, c, d, m, k);
      if (q === 0) return det3([r1, r2, [comb[0], comb[1], v]]) === 0;
      const A = [r1, r2, comb];
      return det3(A) === 0 && [0, 1, 2].every((j) => det3(withCol(A, j, [b1, b2, v])) === 0);
    },
    bugs: ([a, c, d, m, k, q]) => {
      const { r1, r2, comb, b1, b2 } = system(a, c, d, m, k);
      const out: Bug[] = [];
      if (q === 0) {
        const detPlus = (l: number) => {
          const M = [r1, r2, [comb[0], comb[1], l]];
          return M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) + M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
        };
        const f0 = detPlus(0);
        const f1 = detPlus(1) - f0;
        const root = f1 !== 0 ? -f0 / f1 : NaN;
        if (Number.isInteger(root)) out.push({ id: "cofactor-sign", kind: "procedural", competency: DET, says: "The determinant was expanded with a + sign on the middle term; the signs along a row are +, −, +.", predict: root });
        // |A| = (d − ac)(λ − λ₀): the linear equation pλ − pλ₀ = 0 solved with the sign of λ₀ slipped
        if (comb[2] !== 0) out.push({ id: "solve-sign", kind: "procedural", competency: "MATH.algebra.linear-equations", says: `|A| = ${d - a * c === 1 ? "" : d - a * c === -1 ? "−" : N(d - a * c)}λ${sg(-(d - a * c) * comb[2])} = 0 was solved with a sign slip, giving λ = ${N(-comb[2])}; moving ${N(-(d - a * c) * comb[2])} across changes its sign.`, predict: -comb[2] });
        out.push({ id: "copy-row", kind: "conceptual", competency: SC, says: "λ was chosen to copy the z-coefficient of the second equation; the third row must be the same combination of the first two rows in every column.", predict: 2 });
      } else {
        if (m * b1 + k * b2 !== 0) out.push({ id: "homogeneous-zero", kind: "conceptual", competency: SC, says: "μ = 0 was chosen, as for a homogeneous system; here the third equation must be the same combination of the first two on the right side too.", predict: 0 });
        if (!(m === 1 && k === 1)) out.push({ id: "just-add", kind: "procedural", competency: RANK, says: `The first two equations were simply added; the third row is ${m}R₁ ${k < 0 ? "−" : "+"} ${Math.abs(k)}R₂, so the right side must be ${m} × ${N(b1)} ${k < 0 ? "−" : "+"} ${Math.abs(k)} × ${N(b2)}.`, predict: b1 + b2 });
      }
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "det" ? `Expanding, |A| = ${s.value}` : s.id === "solve" ? `|A| = 0 when λ = ${N(Number(s.value))}: then there is no unique solution` : s.id === "combine" ? `The left side of the third equation is ${s.value}` : `For ρ([A | B]) = ρ(A) = 2 the right side must match: μ = ${N(Number(s.value))}`),
    domain: [[-2, 2], [1, 3], [-2, 3], [1, 2], [-2, 2], [0, 1]],
    keep: sysKeep,
    cap: 400,
    difficulty: ([, , , m, k, q]) => (q === 0 && m === 1 ? 1 : q === 0 || Math.abs(k) === 1 ? 2 : 3),
    teach: {
      idea: "A unique solution needs |A| ≠ 0. When |A| = 0 the third row is a combination of the other two; the system is consistent (infinitely many solutions) only if the right sides follow the same combination.",
      method: "For λ: expand |A| (it is linear in λ) and solve |A| = 0. For μ: find m, k with R₃ = mR₁ + kR₂ from the x and y columns, then μ = m b₁ + k b₂.",
      alternatives: [{ id: "row_reduce", title: "Row-reduce with the letters", kind: "procedural", text: ["Row-reduce [A | B] keeping λ and μ as letters.", "The last row becomes (0 0 λ − λ₀ | μ − μ₀): λ = λ₀ removes the pivot, and then μ = μ₀ makes the row all zeros."] }],
    },
    limits: "The parameter sits only in the third equation (λ for z, μ on the right); systems with λ in several places are left out.",
  },
  {
    id: "aqsym",
    arity: 7,
    title: "Writing a 3 × 3 matrix as a symmetric plus a skew-symmetric matrix",
    competency: TS,
    type: "matrix",
    mc: true,
    parse: none,
    reject: (p) => (p.slice(0, 6).some((x) => x < -4 || x > 5) || p[6] < 0 || p[6] > 1 ? "Off-diagonal entries from −4 to 5." : null),
    prompt: (p) => `A = ${mat(symA(p))}. Write A = P + Q, where P is symmetric and Q is skew-symmetric. Find ${p[6] ? "Q" : "P"}, written as [[a, b, c], [d, e, f], [g, h, k]].`,
    word: (p) => `A survey records, for three bus stands A, B and C, the change in the number of buses between each pair of stands in a week (row = from, column = to; a negative number is a fall): the table is the matrix ${mat(symA(p))}. A planner splits the table as A = P + Q, where P (symmetric) shows the two-way part and Q (skew-symmetric) the one-way imbalance. Find ${p[6] ? "Q" : "P"}, written as [[a, b, c], [d, e, f], [g, h, k]].`,
    solve: (p) => {
      const A = symA(p);
      const At = A[0].map((_, j) => A.map((r) => r[j]));
      const S = A.map((r, i) => r.map((x, j) => (p[6] ? x - At[i][j] : x + At[i][j])));
      const R = S.map((r) => r.map((x) => x / 2));
      return { steps: [step("transpose", "transpose", MAT, ["A"], mat(At)), step("combine", p[6] ? "subtract" : "add", TS, [p[6] ? "A − A′" : "A + A′"], mat(S)), step("halve", "divide", TS, [2], mat(R))], answer: mat(R) };
    },
    // independent: the answer has the required symmetry, and what is left over (A − answer) has the other one
    validate: (p, v) => {
      const M = readMat(v);
      if (!M || M.length !== 3 || M[0].length !== 3) return false;
      const A = symA(p);
      const L = A.map((r, i) => r.map((x, j) => x - M[i][j]));
      const symm = (X: number[][]) => X.every((r, i) => r.every((x, j) => near(x, X[j][i])));
      const skew = (X: number[][]) => X.every((r, i) => r.every((x, j) => near(x, -X[j][i])));
      return p[6] ? skew(M) && symm(L) : symm(M) && skew(L);
    },
    bugs: (p) => {
      const A = symA(p);
      const At = A[0].map((_, j) => A.map((r) => r[j]));
      if (p[6] === 0)
        return [
          { id: "not-halved", kind: "procedural", competency: TS, says: "A + A′ was not halved: P = ½(A + A′), so that P + Q gives back A.", predict: mat(A.map((r, i) => r.map((x, j) => x + At[i][j]))) },
          { id: "transpose-as-symmetric", kind: "conceptual", competency: MAT, says: "A′ was given as the symmetric part; A′ is just A with rows and columns swapped, and is not symmetric unless A is.", predict: mat(At) },
        ];
      return [
        { id: "wrong-order", kind: "procedural", competency: TS, says: "A′ − A was used; Q = ½(A − A′). The other order gives −Q.", predict: mat(A.map((r, i) => r.map((x, j) => (At[i][j] - x) / 2))) },
        { id: "not-halved", kind: "procedural", competency: TS, says: "A − A′ was not halved: Q = ½(A − A′).", predict: mat(A.map((r, i) => r.map((x, j) => x - At[i][j]))) },
      ];
    },
    distractors: (p) => {
      const A = symA(p);
      return [mat(A), mat(A.map((r, i) => r.map((x, j) => (i === j ? (p[6] ? x : 0) : x))))];
    },
    variants: () => [],
    explain: (s) => (s.id === "transpose" ? `Swap rows and columns: A′ = ${s.value}` : s.id === "combine" ? `${s.inputs[0]} = ${s.value}` : `Halve every entry: ${s.value}`),
    domain: [[-4, 5], [-4, 5], [-4, 5], [-4, 5], [-4, 5], [-4, 5], [0, 1]],
    keep: ([u, v, w, x, y, z]) => [u !== v, w !== x, y !== z].filter(Boolean).length >= 2,
    cap: 400,
    difficulty: ([u, v, w, x, y, z]) => ((u + v) % 2 === 0 && (w + x) % 2 === 0 && (y + z) % 2 === 0 ? 1 : (u + v + w + x + y + z) % 2 === 0 ? 2 : 3),
    teach: {
      idea: "(A + A′)′ = A′ + A, so ½(A + A′) is symmetric; (A − A′)′ = −(A − A′), so ½(A − A′) is skew-symmetric. Their sum is A.",
      method: "Write A′, add (for P) or subtract (for Q) entry by entry, and halve. Check: Q has zeros on its diagonal and P + Q = A.",
      alternatives: [{ id: "pairs", title: "Average each pair", kind: "conceptual", text: ["Look at a pair of entries in mirror positions, aᵢⱼ and aⱼᵢ.", "P gets their average in both places; Q gets half their difference, with opposite signs in the two places."] }],
    },
    limits: "3 × 3 matrices with small whole entries; the diagonal is fixed by the other entries so that it varies without adding parameters.",
  },
  {
    id: "aqtrab",
    arity: 8,
    title: "The transpose of a product of 2 × 2 matrices",
    competency: TS,
    type: "matrix",
    mc: true,
    parse: none,
    reject: (p) => (p.some((x) => x < -3 || x > 4) ? "2 × 2 matrices with entries from −3 to 4." : null),
    prompt: ([a, b, c, d, e, f, g, h]) => `A = ${mat([[a, b], [c, d]])} and B = ${mat([[e, f], [g, h]])}. Find (AB)′, written as [[a, b], [c, d]].`,
    solve: ([a, b, c, d, e, f, g, h]) => {
      const At = [[a, c], [b, d]];
      const Bt = [[e, g], [f, h]];
      const R = [0, 1].map((i) => [0, 1].map((j) => Bt[i][0] * At[0][j] + Bt[i][1] * At[1][j]));
      return { steps: [step("transposes", "transpose", MAT, [mat(At), mat(Bt)], mat(Bt)), step("product", "multiply", TS, ["B′A′"], mat(R))], answer: mat(R) };
    },
    // independent: multiply A by B entry by entry, then swap rows and columns
    validate: ([a, b, c, d, e, f, g, h], v) => {
      const M = readMat(v);
      if (!M || M.length !== 2 || M[0].length !== 2) return false;
      const A = [[a, b], [c, d]];
      const B = [[e, f], [g, h]];
      let ok = true;
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          let s = 0;
          for (let r = 0; r < 2; r++) s += A[i][r] * B[r][j];
          if (!near(M[j][i], s)) ok = false;
        }
      return ok;
    },
    bugs: ([a, b, c, d, e, f, g, h]) => {
      const AB = [0, 1].map((i) => [0, 1].map((j) => [[a, b], [c, d]][i][0] * [[e, f], [g, h]][0][j] + [[a, b], [c, d]][i][1] * [[e, f], [g, h]][1][j]));
      const AtBt = [0, 1].map((i) => [0, 1].map((j) => [[a, c], [b, d]][i][0] * [[e, g], [f, h]][0][j] + [[a, c], [b, d]][i][1] * [[e, g], [f, h]][1][j]));
      return [
        { id: "same-order", kind: "conceptual", competency: TS, says: "A′B′ was found; the transpose of a product reverses the order: (AB)′ = B′A′.", predict: mat(AtBt) },
        { id: "no-transpose", kind: "procedural", competency: MAT, says: "AB was found but not transposed; swap its rows and columns.", predict: mat(AB) },
      ];
    },
    distractors: ([a, b, c, d, e, f, g, h]) => {
      const BA = [0, 1].map((i) => [0, 1].map((j) => [[e, f], [g, h]][i][0] * [[a, b], [c, d]][0][j] + [[e, f], [g, h]][i][1] * [[a, b], [c, d]][1][j]));
      const R = [0, 1].map((i) => [0, 1].map((j) => [[e, g], [f, h]][i][0] * [[a, c], [b, d]][0][j] + [[e, g], [f, h]][i][1] * [[a, c], [b, d]][1][j]));
      return [mat(BA), mat(R.map((r) => r.map((x) => -x))), mat([[R[0][0], R[1][0]], [R[0][1], R[1][1]]]), mat(R.map((r) => r.map((x) => x + 1)))];
    },
    variants: () => [],
    explain: (s) => (s.id === "transposes" ? `A′ = ${s.inputs[0]}, B′ = ${s.inputs[1]}` : `(AB)′ = B′A′ = ${s.value}`),
    domain: [[-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4], [-3, 4]],
    keep: ([a, b, c, d, e, f, g, h]) => {
      const AB = [a * e + b * g, a * f + b * h, c * e + d * g, c * f + d * h];
      const AtBt = [a * e + c * f, a * g + c * h, b * e + d * f, b * g + d * h];
      // AB not symmetric, and A′B′ differs from (AB)′
      return AB[1] !== AB[2] && !(AtBt[0] === AB[0] && AtBt[1] === AB[2] && AtBt[2] === AB[1] && AtBt[3] === AB[3]) && [a, b, c, d].filter((x) => x === 0).length <= 1 && [e, f, g, h].filter((x) => x === 0).length <= 1;
    },
    cap: 400,
    difficulty: (p) => (p.every((x) => x >= 0) ? 1 : p.filter((x) => x < 0).length <= 2 ? 2 : 3),
    teach: {
      idea: "Transposing swaps rows with columns, and for a product it reverses the order: (AB)′ = B′A′. (The sizes only fit in that order for non-square matrices.)",
      method: "Either find AB and transpose it, or transpose each matrix and multiply B′ by A′; both give the same matrix.",
      alternatives: [{ id: "entry", title: "Follow one entry", kind: "conceptual", text: ["The (i, j) entry of (AB)′ is the (j, i) entry of AB: row j of A times column i of B.", "That is column j of A′ times row i of B′, which is the (i, j) entry of B′A′."] }],
    },
    limits: "2 × 2 matrices with entries from −3 to 4, chosen so that A′B′ and AB are both different from (AB)′.",
  },
  // ============================================================== binary operations, functions, relations
  {
    id: "aqbinid",
    arity: 4,
    title: "The identity element and inverses for a binary operation",
    competency: BIN,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([form, k, t, ask]) => {
      const ok = form === 0 || form === 1 ? k >= 1 && k <= 9 : form === 2 ? k >= 2 && k <= 9 && t !== 0 : form === 3 ? k !== 0 && Math.abs(k) <= 3 && ask === 1 && t !== 0 && 1 + k * t !== 0 : false;
      if (!ok || t < -5 || t > 6 || ask < 0 || ask > 1 || (ask === 1 && t === binIdE(form, k))) return "a + b ∓ k on ℤ, ab/k on ℚ − {0}, or a + b + kab.";
      // the identity question does not use t: one choice of t per rule, so the same question is not listed twice
      return ask === 0 && t !== (form === 2 ? 1 : 0) ? "For the identity element, t is not used (t = 0, or 1 for ab/k)." : null;
    },
    prompt: ([form, k, t, ask]) => `On ${binIdSet(form, k)}, the binary operation ∗ is defined by a ∗ b = ${binIdDef(form, k)}. ${ask ? `Find the inverse of ${N(t)}.` : "Find the identity element."}`,
    word: ([form, k, t, ask]) => `In a number game at a school maths club, two cards a and b from ${binIdSet(form, k)} are combined into the score a ∗ b = ${binIdDef(form, k)}. ${ask ? `A player holds ${N(t)}. Which card must be combined with it to give the neutral score — the score e that leaves every card unchanged (a ∗ e = a)?` : "Which card e leaves every card unchanged, so that a ∗ e = e ∗ a = a for every card a (the identity element)?"}`,
    solve: ([form, k, t, ask]) => {
      const e = binIdE(form, k);
      const steps = [step("identity", "solve", BIN, ["a ∗ e = a"], e)];
      if (!ask) return { steps, answer: e };
      const inv = binIdInv(form, k, t);
      return { steps: [...steps, step("inverse", "solve", BIN, [t, e], inv)], answer: inv };
    },
    // independent: test the defining property at several elements
    validate: ([form, k, t, ask], v) => {
      if (typeof v !== "number" || !Number.isFinite(v)) return false;
      const op = binIdOp(form, k);
      const xs = [-2.5, 0.75, 3, 7];
      if (form === 2 && v === 0) return false;
      if (!ask) return xs.every((x) => near(op(v, x), x) && near(op(x, v), x));
      const e = op(t, v);
      return near(op(v, t), e) && xs.every((x) => near(op(e, x), x) && near(op(x, e), x));
    },
    bugs: ([form, k, t, ask]) => {
      const out: Bug[] = [];
      if (!ask) {
        if (form === 2) out.push({ id: "identity-one", kind: "conceptual", competency: BIN, says: "1 was taken as the identity because the rule multiplies; the identity must satisfy a ∗ e = a for THIS rule.", predict: 1 });
        else out.push({ id: "identity-zero", kind: "conceptual", competency: BIN, says: "0 was taken as the identity because the rule adds; solve a ∗ e = a for this rule.", predict: 0 });
        if (form <= 1) out.push({ id: "identity-sign", kind: "procedural", competency: BIN, says: `a + e ${form === 0 ? "−" : "+"} ${k} = a gives e ${form === 0 ? "=" : "= −"} ${k}; the sign was slipped.`, predict: form === 0 ? -k : k });
        return out;
      }
      if (form === 2) {
        out.push({ id: "reciprocal", kind: "conceptual", competency: BIN, says: `1/${N(t)} (the ordinary inverse) was given; the inverse b must satisfy ${N(t)} ∗ b = e, where e = ${k} is this operation's identity.`, predict: 1 / t });
        out.push({ id: "identity-one", kind: "conceptual", competency: BIN, says: `${N(t)} ∗ b = 1 was solved; the inverse gives the identity of ∗, which is ${k}, not 1.`, predict: k / t });
      } else {
        out.push({ id: "negative", kind: "conceptual", competency: BIN, says: `−${t < 0 ? `(${N(t)})` : t} (the inverse for ordinary addition) was given; the inverse b must satisfy ${N(t)} ∗ b = e for this operation's identity e.`, predict: -t });
        if (form <= 1) out.push({ id: "identity-zero", kind: "conceptual", competency: BIN, says: `${N(t)} ∗ b = 0 was solved; the identity of ∗ is ${N(binIdE(form, k))}, not 0.`, predict: form === 0 ? k - t : -k - t });
        else out.push({ id: "identity-one", kind: "conceptual", competency: BIN, says: `${N(t)} ∗ b = 1 was solved; the identity of ∗ is 0, so solve ${N(t)} + b ${k < 0 ? "−" : "+"} ${Math.abs(k) === 1 ? "" : Math.abs(k)}(${N(t)})b = 0.`, predict: (1 - t) / (1 + k * t) });
      }
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "identity" ? `Solve a ∗ e = a for every a: e = ${F(Number(s.value))}` : `Solve ${N(Number(s.inputs[0]))} ∗ b = ${F(Number(s.inputs[1]))}: b = ${F(Number(s.value))}`),
    domain: [[0, 3], [-3, 9], [-5, 6], [0, 1]],
    cap: 300,
    difficulty: ([form, , , ask]) => (form <= 1 && !ask ? 1 : form <= 1 || !ask ? 2 : 3),
    teach: {
      idea: "The identity e leaves every element unchanged: a ∗ e = e ∗ a = a. An inverse of a is an element b with a ∗ b = b ∗ a = e. Both depend on the rule, not on ordinary + or ×.",
      method: "Write a ∗ e = a with the rule and solve for e (it must not depend on a). Then write a ∗ b = e with the given a and solve for b.",
      alternatives: [{ id: "check_back", title: "Guess and check", kind: "procedural", text: ["Try a candidate e with two or three different values of a: if a ∗ e = a every time, e is the identity.", "For the inverse, work out a ∗ b with your b: you must get e."] }],
    },
    limits: "Four rules (a + b − k, a + b + k, ab/k, a + b + kab); operations on matrices, tables and modulo n are left out.",
  },
  {
    id: "aqbinp",
    arity: 3,
    title: "Is a binary operation commutative, associative, both or neither?",
    competency: BIN,
    type: "choice",
    parse: none,
    reject: ([form, k, l]) => (binProp(form, k, l) ? null : "One of eleven rules for a ∗ b on ℝ."),
    prompt: ([form, k, l]) => `On ℝ, a binary operation ∗ is defined by a ∗ b = ${binProp(form, k, l)![0]}. Which is true?`,
    choices: () => BIN_CHOICES,
    solve: ([form, k, l]) => {
      const cat = binProp(form, k, l)![2];
      return { steps: [step("swap", "compare", BIN, ["a ∗ b", "b ∗ a"], cat <= 1 ? "equal" : "not equal"), step("group", "compare", BIN, ["(a ∗ b) ∗ c", "a ∗ (b ∗ c)"], cat === 0 || cat === 2 ? "equal" : "not equal"), step("decide", "classify", BIN, [], cat)], answer: cat };
    },
    // independent: test every pair and triple from a set of sample numbers
    validate: ([form, k, l], v) => {
      const op = binProp(form, k, l)![1];
      const S = [-3, -1.5, 0, 0.5, 1, 2, 3.25];
      const comm = S.every((a) => S.every((b) => near(op(a, b), op(b, a))));
      const assoc = S.every((a) => S.every((b) => S.every((c) => near(op(op(a, b), c), op(a, op(b, c))))));
      return v === (comm && assoc ? 0 : comm ? 1 : assoc ? 2 : 3);
    },
    bugs: ([form, k, l]) => {
      const cat = binProp(form, k, l)![2];
      return [
        cat === 0
          ? { id: "product-term", kind: "conceptual", competency: BIN, says: "The rule looked too complicated to be associative; expand (a ∗ b) ∗ c and a ∗ (b ∗ c) fully: they are the same.", predict: 1 }
          : cat === 1
            ? { id: "comm-implies-assoc", kind: "conceptual", competency: BIN, says: "Commutative was taken to mean associative as well; associativity must be checked separately with three elements.", predict: 0 }
            : cat === 2
              ? { id: "not-comm-not-assoc", kind: "conceptual", competency: BIN, says: "Because the rule is not commutative it was assumed not associative either; check (a ∗ b) ∗ c = a ∗ (b ∗ c) on its own.", predict: 3 }
              : { id: "equal-test", kind: "procedural", competency: BIN, says: "Commutativity was checked with a = b, where it always holds; try two different numbers.", predict: 1 },
      ] as Bug[];
    },
    variants: () => [],
    explain: (s) => (s.id === "swap" ? `a ∗ b and b ∗ a are ${s.value}` : s.id === "group" ? `(a ∗ b) ∗ c and a ∗ (b ∗ c) are ${s.value}` : `So ∗ is ${BIN_CHOICES[Number(s.value)]}`),
    domain: [[0, 10], [-4, 5], [-3, 6]],
    difficulty: ([form]) => (form === 0 || form === 1 || form === 7 ? 1 : form === 2 || form === 9 ? 3 : 2),
    teach: {
      idea: "Commutative: a ∗ b = b ∗ a for all a, b. Associative: (a ∗ b) ∗ c = a ∗ (b ∗ c) for all a, b, c. Either can hold without the other.",
      method: "Swap a and b in the rule and compare. Then work out (a ∗ b) ∗ c and a ∗ (b ∗ c) in full and compare. One counter-example (with actual numbers) is enough to show a property fails.",
      alternatives: [{ id: "counterexample", title: "Hunt for a counter-example", kind: "procedural", text: ["Try small numbers such as a = 1, b = 2, c = 3.", "If the two sides differ, the property fails; if they agree for several choices, prove it with letters."] }],
    },
    limits: "Eleven rules on ℝ with small parameters (max{a, b} type rules use one fixed number); operation tables and modulo n are left out.",
  },
  {
    id: "aqonto",
    arity: 3,
    title: "Classifying a function as one-one, onto or bijective",
    competency: FT,
    type: "choice",
    parse: none,
    reject: ([kind, a, b]) => (ontoKind(kind, a, b) && a >= -3 && a <= 3 && b >= -3 && b <= 3 ? null : "Linear, square, cube and modulus functions on ℕ, ℤ, ℝ or half-lines."),
    prompt: ([kind, a, b]) => {
      const [dom, cod, f] = ontoKind(kind, a, b)!;
      return `f: ${SETNAME[dom]} → ${cod === "B" ? `[${N(b)}, ∞)` : SETNAME[cod]} is given by f(x) = ${f}. Which is true?`;
    },
    word: ([kind, a, b]) => {
      const [dom, cod, f] = ontoKind(kind, a, b)!;
      const who = ["Fatima", "Kavin", "Meena", "Ravi"][Math.abs(a + 2 * b) % 4];
      const inSet = { R: "any real number", N: "any natural number 1, 2, 3, …", Z: "any integer", H: "any real number that is 0 or more" }[dom];
      const outSet = cod === "B" ? `any real number from ${N(b)} upwards` : cod === "R" ? "any real number" : cod === "N" ? "any natural number" : "any integer";
      return `For the school computer club, ${who} writes a coding program f. It accepts as input x ${inSet} and turns it into the code f(x) = ${f}, and an allowed code can be ${outSet}. ${who} wants to know two things: can every input be recovered from its code (do different inputs always get different codes)? Is every allowed code actually produced by some input? Which is true of f?`;
    },
    choices: () => ONTO_CHOICES,
    solve: ([kind, a, b]) => {
      const ans = ontoKind(kind, a, b)![4];
      return { steps: [step("one-one", "compare", FT, ["f(x₁) = f(x₂)"], ans <= 1 ? "x₁ = x₂" : "not always x₁ = x₂"), step("onto", "solve", FT, ["f(x) = y"], ans === 0 || ans === 2 ? "solvable for every y" : "not solvable for some y"), step("decide", "classify", FT, [], ans)], answer: ans };
    },
    // independent: brute force over integer windows, or a fine grid (monotonicity and sign changes) for real domains
    validate: ([kind, a, b], v) => {
      const [dom, cod, , g] = ontoKind(kind, a, b)!;
      return v === classifyMap(dom, cod, g, b);
    },
    bugs: ([kind, a, b]) => {
      const says = [
        `A straight line was thought to miss some values; over ℝ every y is reached, at x = (y ${b < 0 ? "+" : "−"} ${Math.abs(b)})/${N(a)}.`,
        `x = (y − ${b})/${a} works over ℝ, but here inputs must be natural numbers: y = 1 has no natural-number input.`,
        `Only the values y ≥ ${N(b)} were thought of; the codomain ℝ also contains values that x² never reaches.`,
        `A square was assumed never to be onto; the codomain here is [${N(b)}, ∞), and every y in it is reached. It is not one-one, since f(−1) = f(1).`,
        "x² was assumed never to be one-one; here the domain is [0, ∞), so no negative inputs: f(x₁) = f(x₂) forces x₁ = x₂.",
        `Over ℤ the line ${kx(a)}${sg(b)} skips integers (it goes up in steps of ${Math.abs(a)}), so it is not onto.`,
        "x³ was treated like x²; but x³ is strictly increasing, so different inputs give different outputs.",
        "The square was assumed to reach every integer; most integers are not of this form.",
        `|x${sg(-a)}| was thought one-one; f(${a - 1}) = f(${a + 1}), so it is not.`,
      ][kind];
      const predict = [1, 0, 2, 3, 2, 0, 2, 2, 0][kind];
      return [{ id: `kind-${kind}`, kind: "conceptual", competency: FT, says, predict } as Bug];
    },
    variants: () => [],
    explain: (s) => (s.id === "one-one" ? `If f(x₁) = f(x₂), then ${s.value}` : s.id === "onto" ? `f(x) = y is ${s.value} in the codomain` : `So f is ${ONTO_CHOICES[Number(s.value)]}`),
    domain: [[0, 8], [-3, 3], [-3, 3]],
    cap: 300,
    difficulty: ([kind]) => (kind === 0 || kind === 2 ? 1 : kind === 3 || kind === 4 || kind === 8 ? 3 : 2),
    teach: {
      idea: "One-one: different inputs give different outputs. Onto: every element of the codomain is an output. Both depend on the domain and codomain, not only on the formula.",
      method: "For one-one, set f(x₁) = f(x₂) and see whether x₁ = x₂ follows. For onto, take any y in the codomain, solve f(x) = y, and check the solution lies in the domain.",
      alternatives: [{ id: "graph", title: "Horizontal lines", kind: "conceptual", text: ["Draw horizontal lines y = c for c in the codomain.", "One-one: no line meets the graph twice. Onto: every such line meets it at least once."] }],
    },
    limits: "Linear, square, cube and modulus formulas on ℕ, ℤ, ℝ and [0, ∞); principal-value branches of inverse trigonometric functions are left to another family.",
  },
  {
    id: "aqrel",
    arity: 1,
    title: "Testing a relation for reflexivity, symmetry and transitivity",
    competency: RP,
    type: "choice",
    parse: none,
    reject: ([m]) => (m < 0 || m > 511 || popcount(m) < 3 || popcount(m) > 7 ? "A relation on {1, 2, 3} with 3 to 7 pairs." : null),
    prompt: ([m]) => `On A = {1, 2, 3}, the relation R = ${showRel(pairsOf(m, 3))}. Which statement about R is true?`,
    word: ([m]) => `Three classmates have roll numbers 1 (Anu), 2 (Ravi) and 3 (Meena). For each pair, the class teacher records (a, b) when student a has saved student b's phone number in their phone (saving your own number counts as (a, a)). The records are R = ${showRel(pairsOf(m, 3))}, a relation on A = {1, 2, 3}. Which statement about R is true?`,
    choices: ([m]) => relChoices(m),
    solve: ([m]) => {
      const T = relProps(pairsOf(m, 3), 3);
      const idx = relChoices(m).indexOf(propText(T));
      return { steps: [step("reflexive", "check", RP, ["(a, a)"], T[0] ? "yes" : "no"), step("symmetric", "check", RP, ["(b, a)"], T[1] ? "yes" : "no"), step("transitive", "check", RP, ["(a, c)"], T[2] ? "yes" : "no")], answer: idx };
    },
    // independent: the relation matrix M: diagonal all 1, M = Mᵀ, and the Boolean product M² inside M
    validate: ([m], v) => {
      const M = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (m >> (i * 3 + j)) & 1));
      const r = M.every((row, i) => row[i] === 1);
      const s = M.every((row, i) => row.every((x, j) => x === M[j][i]));
      const t = M.every((row, i) => row.every((_, j) => !M[i].some((x, k) => x && M[k][j]) || M[i][j] === 1));
      return v === relChoices(m).indexOf(propText([r, s, t]));
    },
    bugs: ([m]) => {
      const ps = pairsOf(m, 3);
      const T = relProps(ps, 3);
      const ch = relChoices(m);
      const flip = (i: number) => ch.indexOf(propText(T.map((x, j) => (j === i ? !x : x))));
      return [
        { id: "reflexive", kind: "conceptual", competency: RP, says: T[0] ? "Extra pairs do not stop R being reflexive: it only needs (1, 1), (2, 2) and (3, 3)." : "Reflexive needs (a, a) for EVERY a in A; one missing pair is enough to fail.", predict: flip(0) },
        { id: "symmetric", kind: "conceptual", competency: RP, says: T[1] ? "Pairs such as (1, 1) are their own reverse; every other pair in R has its reverse in R, so R is symmetric." : "Every pair (a, b) needs its reverse (b, a) in R; one pair without its reverse is enough to fail.", predict: flip(1) },
        { id: "transitive", kind: "conceptual", competency: RP, says: T[2] ? "Transitivity only asks about chains (a, b), (b, c) that are in R; each such chain here has its (a, c)." : "A chain such as (a, b), (b, a) needs (a, a) too; check every chain (a, b), (b, c) for (a, c).", predict: flip(2) },
      ] as Bug[];
    },
    variants: () => [],
    explain: (s) => (s.id === "reflexive" ? `Is every (a, a) in R? ${s.value}` : s.id === "symmetric" ? `Does each (a, b) have its reverse (b, a)? ${s.value}` : `Does each chain (a, b), (b, c) have (a, c)? ${s.value}`),
    domain: [[0, 511]],
    cap: 400,
    difficulty: ([m]) => (popcount(m) <= 4 ? 1 : popcount(m) <= 5 ? 2 : 3),
    teach: {
      idea: "Reflexive: (a, a) ∈ R for every a in A. Symmetric: (a, b) ∈ R ⇒ (b, a) ∈ R. Transitive: (a, b), (b, c) ∈ R ⇒ (a, c) ∈ R.",
      method: "Check the three properties one by one: list the (a, a) pairs; pair each element with its reverse; and for each pair (a, b) look for pairs starting with b.",
      alternatives: [{ id: "matrix", title: "The relation matrix", kind: "procedural", text: ["Write a 3 × 3 table with a 1 in row a, column b when (a, b) ∈ R.", "Reflexive: 1s on the diagonal. Symmetric: the table equals its mirror image. Transitive: wherever row a has a 1 in column b, row a must contain every 1 of row b."] }],
    },
    limits: "Relations on {1, 2, 3} given as lists of 3 to 7 pairs; justifications (proofs) are marked by an educator, not here.",
  },
  {
    id: "aqeqcl",
    arity: 2,
    title: "The fewest pairs that make a relation an equivalence relation",
    competency: RP,
    type: "integer",
    mc: true,
    parse: none,
    // [n, m]: a relation on {1, …, n} (n = 4 or 5) whose pairs are the bits of m (eqPairs)
    reject: ([n, m]) => {
      if ((n !== 4 && n !== 5) || m < 0 || m > 65535 || popcount(m) < 2 || popcount(m) > 5) return "A relation on {1, 2, 3, 4} or {1, …, 5} with 2 to 5 pairs.";
      const ps = eqPairs(n, m);
      return classes(ps, n).reduce((s, c) => s + c * c, 0) === ps.length ? "Already an equivalence relation." : null;
    },
    prompt: ([n, m]) => `On A = {${range(1, n).join(", ")}}, R = ${showRel(eqPairs(n, m))}. What is the least number of ordered pairs that must be added to R to make it an equivalence relation?`,
    solve: ([n, m]) => {
      const ps = eqPairs(n, m);
      const cs = classes(ps, n);
      const total = cs.reduce((s, c) => s + c * c, 0);
      return { steps: [step("classes", "group", REL, [ps.length], cs.slice().sort((a, b) => b - a).join(" + ")), step("pairs", "count", RP, cs, total), step("added", "subtract", RP, [total, ps.length], total - ps.length)], answer: total - ps.length };
    },
    // independent: keep adding the pairs reflexivity, symmetry and transitivity demand until nothing changes
    validate: ([n, m], v) => {
      const ps = eqPairs(n, m);
      const S = new Set(ps.map(([a, b]) => `${a},${b}`));
      let grew = true;
      while (grew) {
        const before = S.size;
        for (let a = 1; a <= n; a++) S.add(`${a},${a}`);
        const cur = [...S].map((t) => t.split(",").map(Number));
        for (const [a, b] of cur) S.add(`${b},${a}`);
        for (const [a, b] of cur) for (const [c, d] of cur) if (b === c) S.add(`${a},${d}`);
        grew = S.size > before;
      }
      return v === S.size - ps.length;
    },
    bugs: ([n, m]) => {
      const ps = eqPairs(n, m);
      const has = (a: number, b: number) => ps.some(([x, y]) => x === a && y === b);
      const diag = range(1, n).filter((a) => !has(a, a)).length;
      const rs = new Set([...ps.map(([a, b]) => `${a},${b}`), ...ps.map(([a, b]) => `${b},${a}`), ...range(1, n).map((a) => `${a},${a}`)]);
      const total = classes(ps, n).reduce((s, c) => s + c * c, 0) - ps.length;
      const isolated = range(1, n).filter((a) => !ps.some(([x, y]) => x === a || y === a)).length;
      const out: Bug[] = [
        { id: "reflexive-only", kind: "conceptual", competency: RP, says: "Only the pairs (a, a) were added; an equivalence relation must also be symmetric and transitive.", predict: diag },
        { id: "no-transitive", kind: "procedural", competency: RP, says: "Reflexive and symmetric pairs were added, but the pairs that transitivity forces (from chains (a, b), (b, c)) were missed.", predict: rs.size - ps.length },
      ];
      if (isolated) out.push({ id: "unmentioned-elements", kind: "conceptual", competency: RP, says: "Elements of A that do not appear in R were forgotten; each still needs its pair (a, a).", predict: total - isolated });
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "classes" ? `R links the elements into classes of sizes ${s.value}` : s.id === "pairs" ? `An equivalence relation with these classes has ${s.value} pairs (a class of size n gives n² pairs)` : `Pairs to add: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    domain: [[4, 5], [0, 65535]],
    cap: 400,
    difficulty: ([n, m]) => (n === 4 && popcount(m) <= 3 ? 2 : 3),
    teach: {
      idea: "The smallest equivalence relation containing R splits A into classes of elements linked by R; within a class every element is related to every element.",
      method: "Join elements that appear together in a pair of R into classes; a class of n elements needs n² pairs; add up, then subtract the pairs R already has.",
      alternatives: [{ id: "close", title: "Close it step by step", kind: "procedural", text: ["Add every (a, a); add the reverse of every pair; then add (a, c) for every chain (a, b), (b, c).", "Repeat until nothing new appears, and count what you added."] }],
    },
    limits: "Relations on {1, 2, 3, 4} or {1, …, 5} with 2 to 5 pairs; describing the classes in words is left to an educator.",
  },
  // ============================================================== derivatives
  {
    id: "aqfp",
    arity: 4,
    title: "The derivative from first principles",
    competency: DER,
    type: "expression",
    mc: true,
    parse: none,
    reject: (p) => (fpOk(p) ? null : "k x² + qx + c, k/(x + q), k√(x + q), kx³ + qx, sin kx or cos kx."),
    prompt: (p) => `Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = ${fpText(p)}.`,
    solve: (p) => {
      const ans = fpAnswer(p);
      return { steps: [step("quotient", "simplify", LIM, [fpText(p)], "[f(x + h) − f(x)]/h"), step("limit", "evaluate", DER, ["h → 0"], ans)], answer: ans };
    },
    // independent: central differences of f at several points
    validate: (p, v) => agrees(v, (x) => d1(fpFn(p), x), [0.45, 1.35, 2.55, 3.35], 1e-6),
    bugs: ([kind, k, q, c]) => {
      const out: Bug[] = [];
      if (kind === 0) {
        if (c !== 0) out.push({ id: "constant-kept", kind: "procedural", competency: DER, says: `The constant ${N(c)} was kept; in f(x + h) − f(x) it cancels, so it does not appear in f′(x).`, predict: pa([[2 * k, 1], [q + c, 0]]) });
        if (q !== 0) out.push({ id: "only-square", kind: "procedural", competency: DER, says: `Only the x² term was worked out; the ${N(q)}x term gives ${N(q)}h/h = ${N(q)}.`, predict: pa([[2 * k, 1]]) });
      } else if (kind === 1) {
        const base = q === 0 ? "x" : `(x${sg(q)})`;
        out.push({ id: "sign-lost", kind: "procedural", competency: DER, says: `The minus sign was lost: k/(x + h${sg(q)}) − k/${q === 0 ? "x" : `(x${sg(q)})`} has numerator −kh.`, predict: `${k}/${base}²` });
        out.push({ id: "not-squared", kind: "procedural", competency: DER, says: "Only one bracket was kept in the denominator; after cancelling h, both (x + h + q) and (x + q) remain and become (x + q)².", predict: `−${k}/${base}` });
      } else if (kind === 2) {
        const r = q === 0 ? "√x" : `√(x${sg(q)})`;
        out.push({ id: "half-lost", kind: "procedural", competency: DER, says: "After rationalising, the denominator is √(x + h + q) + √(x + q), which tends to 2√(x + q); the 2 was lost.", predict: `${k}/${r}` });
      } else if (kind === 3) {
        out.push({ id: "cube-expanded-wrongly", kind: "prerequisite", competency: "MATH.algebra.identities", says: "(x + h)³ was expanded as x³ + h³; it is x³ + 3x²h + 3xh² + h³.", predict: String(q) });
      } else if (c === 0) {
        out.push({ id: "sin-split", kind: "conceptual", competency: "MATH.trigonometry.identities", says: `sin(${kx(k)} + ${kx(k, "h")}) was split as sin ${kx(k)} + sin ${kx(k, "h")}; use sin(A + B) = sin A cos B + cos A sin B.`, predict: String(k) });
        if (k > 1) out.push({ id: "inner-lost", kind: "procedural", competency: DER, says: `sin(${k}h)/h tends to ${k}, not 1: write it as ${k} × sin(${k}h)/(${k}h).`, predict: `cos(${kx(k)})` });
      } else out.push({ id: "cos-sign", kind: "recall", competency: "MATH.trigonometry.identities", says: "cos(A + B) − cos A tends to −sin A × B: the derivative of cos is −sin.", predict: `${k === 1 ? "" : k}sin(${kx(k)})` });
      return out;
    },
    distractors: (p) => [fpAnswerText(p), `−(${fpAnswer(p)})`],
    variants: () => [],
    explain: (s) => (s.id === "quotient" ? `Write [f(x + h) − f(x)]/h for f(x) = ${s.inputs[0]} and simplify until h cancels` : `Let h → 0: f′(x) = ${s.value}`),
    domain: [[0, 4], [1, 6], [-5, 5], [-5, 5]],
    keep: fpOk,
    cap: 300,
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 1 || kind === 3 ? 2 : 3),
    teach: {
      idea: "f′(x) is the limit of the slope of a chord, [f(x + h) − f(x)]/h, as the second point slides towards the first (h → 0).",
      method: "Work out f(x + h) − f(x), simplify so that h is a factor of the top (expand, combine fractions, or rationalise a root), cancel h, then let h → 0.",
      alternatives: [{ id: "numbers", title: "Shrink h with numbers", kind: "conceptual", text: ["Pick x = 1 and work out the chord slope for h = 0.1, 0.01, 0.001.", "The slopes settle on a value: that is f′(1). The algebra does the same for every x at once."] }],
    },
    limits: "Quadratics, k/(x + q), k√(x + q), kx³ + qx and sin kx, cos kx; quotients and products by first principles are left out.",
  },
  {
    id: "aqvel",
    arity: 4,
    title: "Instantaneous velocity from a distance–time formula",
    competency: DER,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (velOk(p) ? null : "s = at³ + bt² + ct with a positive velocity at t₀."),
    prompt: ([a, b, c, t0]) => `A particle moves along a straight line so that its distance from a fixed point O after t seconds is s = ${pp([[a, 3], [b, 2], [c, 1]], "t")} metres. Find its instantaneous velocity, in m/s, at t = ${t0}.`,
    solve: ([a, b, c, t0]) => {
      const v = 3 * a * t0 * t0 + 2 * b * t0 + c;
      return { steps: [step("ds", "differentiate", RULES, ["s"], pa([[3 * a, 2], [2 * b, 1], [c, 0]], "t")), step("sub", "evaluate", DER, [t0], v)], answer: v };
    },
    // independent: the average velocity over shrinking symmetric intervals around t₀
    validate: ([a, b, c, t0], v) => {
      const s = (t: number) => a * t ** 3 + b * t * t + c * t;
      return typeof v === "number" && Math.abs(d1(s, t0) - v) < 1e-5;
    },
    bugs: ([a, b, c, t0]) => {
      const s = a * t0 ** 3 + b * t0 * t0 + c * t0;
      const out: Bug[] = [{ id: "position", kind: "conceptual", competency: DER, says: "The distance at that moment was found; velocity is the rate of change of distance, ds/dt.", predict: s }];
      if (s % t0 === 0) out.push({ id: "average", kind: "conceptual", competency: DER, says: `The average velocity over the first ${t0} seconds (s ÷ t) was found; the instantaneous velocity is ds/dt at t = ${t0}.`, predict: s / t0 });
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "ds" ? `v = ds/dt = ${s.value}` : `At t = ${s.inputs[0]}: v = ${s.value} m/s`),
    word: ([a, b, c, t0]) => `A toy train on a straight track at a Chennai exhibition is s = ${pp([[a, 3], [b, 2], [c, 1]], "t")} metres from the station t seconds after it starts. How fast, in m/s, is it moving at t = ${t0}?`,
    domain: [[0, 2], [-3, 5], [0, 12], [1, 5]],
    keep: velOk,
    cap: 300,
    difficulty: ([a, , , t0]) => (a === 0 && t0 <= 2 ? 1 : a === 0 || t0 <= 2 ? 2 : 3),
    teach: {
      idea: "Velocity is the instantaneous rate of change of distance: the slope of the distance–time graph at that moment, ds/dt.",
      method: "Differentiate s term by term (d/dt tⁿ = n tⁿ⁻¹), then substitute the given time.",
      alternatives: [{ id: "average_shrink", title: "Shrink the time interval", kind: "conceptual", text: ["Average velocity from t₀ to t₀ + h is [s(t₀ + h) − s(t₀)]/h.", "Work it out for h = 0.1 and h = 0.01: it approaches ds/dt at t₀."] }],
    },
    limits: "Polynomial distance formulas of degree up to 3 with whole coefficients and a positive velocity.",
  },
  // ============================================================== applications of derivatives
  {
    id: "aqmono",
    arity: 5,
    title: "Intervals where a cubic is increasing or decreasing",
    competency: APP,
    type: "interval",
    mc: true,
    parse: none,
    reject: ([al, be, s, ask, c]) => (al >= be || al < -4 || be > 5 || (s !== 1 && s !== -1) || ask < 0 || ask > 1 || c < -3 || c > 3 ? "f(x) = s(2x³ − 3(α+β)x² + 6αβx) + c with α < β." : null),
    prompt: ([al, be, s, ask, c]) => `Find the interval(s) on which f(x) = ${cubicText(al, be, s, c)} is strictly ${ask ? "decreasing" : "increasing"}. Write open intervals, joined by ∪ if there are two (for example (−∞, p) ∪ (q, ∞)).`,
    word: ([al, be, s, ask, c]) => `The temperature (in °C above 20 °C) of a solution in a Chennai college laboratory, t hours after noon (t is negative before noon), is modelled by T(t) = ${pp([[2 * s, 3], [-3 * s * (al + be), 2], [6 * s * al * be, 1], [c, 0]], "t")}. During which time interval(s) is the temperature strictly ${ask ? "falling" : "rising"}? Write open intervals of t, joined by ∪ if there are two.`,
    solve: ([al, be, s, ask]) => {
      const ans = openIv(al, be, (s > 0) === (ask === 0));
      return { steps: [step("derivative", "differentiate", RULES, [], `${s > 0 ? "" : "−"}6${fx2(al, be)}`), step("critical", "solve", FACT, ["f′(x) = 0"], `${N(al)}, ${N(be)}`), step("sign", "classify", APP, [ask ? "f′ < 0" : "f′ > 0"], ans)], answer: ans };
    },
    // independent: the sign of a central-difference derivative on a fine grid, and f′ ≈ 0 at the end points
    validate: ([al, be, s, ask, c], v) => {
      const f = cubic(al, be, s, c);
      return ivMatches(v, (x) => (ask ? d1(f, x) < 0 : d1(f, x) > 0), (x) => d1(f, x));
    },
    bugs: ([al, be, s, ask]) => {
      const outer = (s > 0) === (ask === 0);
      const out: Bug[] = [{ id: s > 0 ? "inside-outside" : "leading-sign", kind: "conceptual", competency: APP, says: s > 0 ? `The two kinds of interval were swapped: f′(x) = 6${fx2(al, be)} is negative between the roots and positive outside them.` : "The negative leading coefficient was ignored: f′ opens downwards, so it is positive between the roots and negative outside them.", predict: openIv(al, be, !outer) }];
      if (outer) out.push({ id: "one-piece", kind: "procedural", competency: APP, says: `Only one piece was given; f′ has the same sign on (−∞, ${N(al)}) and on (${N(be)}, ∞), so both pieces belong to the answer.`, predict: `(${N(be)}, ∞)` });
      if (!(al === -be)) out.push({ id: "root-signs", kind: "procedural", competency: FACT, says: `The roots of f′ were read with the wrong signs: ${al === 0 ? `x${sg(-be)} = 0 gives x = ${N(be)}` : `x${sg(-al)} = 0 gives x = ${N(al)}`}.`, predict: openIv(-be, -al, outer) });
      return out;
    },
    distractors: ([al, be]) => [`(−∞, ${N(al)})`, `(${N(al)}, ∞)`, `(−∞, ${N(be)})`],
    variants: () => [],
    explain: (s) => (s.id === "derivative" ? `f′(x) = ${s.value}` : s.id === "critical" ? `f′(x) = 0 at x = ${s.value}` : `Test the sign of f′ on each side of the roots: ${s.inputs[0]} on ${s.value}`),
    domain: [[-4, 4], [-4, 5], [-1, 1], [0, 1], [-3, 3]],
    keep: ([al, be, s]) => al < be && s !== 0 && Math.abs(al * be) <= 12,
    cap: 400,
    difficulty: ([al, , s]) => (s > 0 && al >= 0 ? 1 : s > 0 ? 2 : 3),
    teach: {
      idea: "f is strictly increasing where f′(x) > 0 and strictly decreasing where f′(x) < 0; the sign of f′ can only change at its roots.",
      method: "Differentiate and factorise f′. Mark the roots on a number line, test one value of x in each part, and collect the parts with the sign you need.",
      visual: ([al, be]) => ({ type: "numberline", from: al - 3, to: be + 3, marks: [al, be] }),
      alternatives: [{ id: "sign_chart", title: "A sign chart", kind: "procedural", text: ["Make a table with columns (−∞, α), (α, β), (β, ∞).", "Write the sign of each factor of f′ in each column and multiply the signs."], visual: ([al, be]) => ({ type: "numberline", from: al - 3, to: be + 3, marks: [al, be] }) }],
    },
    limits: "Cubics whose derivative is ±6(x − α)(x − β) with whole α < β; answers are open intervals (closed end points are also accepted in some textbooks).",
  },
  {
    id: "aqext",
    arity: 5,
    title: "The local maximum or minimum value of a cubic",
    competency: APP,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([al, be, s, ask, c]) => (al >= be || al < -4 || be > 5 || (s !== 1 && s !== -1) || ask < 0 || ask > 1 || c < -5 || c > 10 ? "f(x) = s(2x³ − 3(α+β)x² + 6αβx) + c with α < β." : null),
    prompt: ([al, be, s, ask, c]) => `Find the local ${ask ? "minimum" : "maximum"} value of f(x) = ${cubicText(al, be, s, c)}.`,
    solve: ([al, be, s, ask, c]) => {
      const f = cubic(al, be, s, c);
      const xMax = s > 0 ? al : be;
      const x = ask ? (xMax === al ? be : al) : xMax;
      return { steps: [step("critical", "solve", RULES, ["f′(x) = 0"], `${N(al)}, ${N(be)}`), step("test", "classify", APP, [ask ? "minimum" : "maximum"], x), step("value", "evaluate", APP, [x], f(x))], answer: f(x) };
    },
    // independent: scan a fine grid for the point higher (or lower) than its neighbours
    validate: ([al, be, s, ask, c], v) => {
      const f = cubic(al, be, s, c);
      const found: number[] = [];
      for (let i = -10000; i <= 10000; i++) {
        const y = f(i / 1000);
        const l = f((i - 1) / 1000);
        const r = f((i + 1) / 1000);
        if (ask ? y < l && y <= r : y > l && y >= r) found.push(y);
      }
      return typeof v === "number" && found.length === 1 && near(found[0], v, 1e-9);
    },
    bugs: ([al, be, s, ask, c]) => {
      const f = cubic(al, be, s, c);
      const xMax = s > 0 ? al : be;
      const x = ask ? (xMax === al ? be : al) : xMax;
      const other = x === al ? be : al;
      return [
        { id: "x-for-value", kind: "procedural", competency: APP, says: "The point where it happens (the x value) was given; the question asks for the value f(x) there.", predict: x },
        { id: "max-min-swapped", kind: "conceptual", competency: APP, says: `The two turning points were swapped: f′ changes from ${ask ? "− to +" : "+ to −"} at x = ${N(x)}, which makes it the local ${ask ? "minimum" : "maximum"}.`, predict: f(other) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "critical" ? `f′(x) = 0 at x = ${s.value}` : s.id === "test" ? `By the sign of f′ (or f″), the local ${s.inputs[0]} is at x = ${N(Number(s.value))}` : `f(${N(Number(s.inputs[0]))}) = ${N(Number(s.value))}`),
    domain: [[-4, 4], [-4, 5], [-1, 1], [0, 1], [-5, 10]],
    keep: ([al, be, s, , c]) => al < be && s !== 0 && Math.abs(al * be) <= 12 && Math.abs(cubic(al, be, s, c)(al)) <= 250 && Math.abs(cubic(al, be, s, c)(be)) <= 250,
    cap: 400,
    difficulty: ([al, , s]) => (s > 0 && al >= 0 ? 1 : s > 0 ? 2 : 3),
    teach: {
      idea: "At a local maximum f′ changes from + to − (f″ < 0 there); at a local minimum from − to + (f″ > 0).",
      method: "Solve f′(x) = 0, decide which root is the maximum and which the minimum (first or second derivative test), then substitute that x into f.",
      alternatives: [{ id: "second", title: "Second-derivative test", kind: "procedural", text: ["f″(x) = 12x − 6(α + β) for these cubics (times the sign of the leading term).", "Negative f″ at a root means a local maximum; positive means a local minimum."] }],
    },
    limits: "Cubics with whole turning points; f″ = 0 cases and higher-degree functions are left out.",
  },
  {
    id: "aqabs",
    arity: 5,
    title: "Absolute maximum and minimum on a closed interval",
    competency: APP,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([al, be, p, q, ask]) => (al >= be || al < -3 || be > 3 || p >= q || p < -4 || q > 5 || q - p > 6 || ask < 0 || ask > 1 || !((al > p && al < q) || (be > p && be < q)) ? "f(x) = 2x³ − 3(α+β)x² + 6αβx on [p, q] containing a turning point." : null),
    prompt: ([al, be, p, q, ask]) => `Find the absolute ${ask ? "minimum" : "maximum"} value of f(x) = ${cubicText(al, be, 1, 0)} on the interval [${N(p)}, ${N(q)}].`,
    solve: ([al, be, p, q, ask]) => {
      const f = cubic(al, be, 1, 0);
      const cand = [p, q, ...[al, be].filter((x) => x > p && x < q)];
      const vals = cand.map(f);
      const best = ask ? Math.min(...vals) : Math.max(...vals);
      return { steps: [step("critical", "solve", RULES, ["f′(x) = 0"], cand.slice(2).map(N).join(", ")), step("values", "evaluate", APP, cand, vals.map(N).join(", ")), step("compare", "compare", APP, [ask ? "least" : "greatest"], best)], answer: best };
    },
    // independent: the greatest (least) value over a fine grid of the interval
    validate: ([al, be, p, q, ask], v) => {
      const f = cubic(al, be, 1, 0);
      let best = ask ? Infinity : -Infinity;
      for (let i = 0; i <= 1000 * (q - p); i++) {
        const y = f(p + i / 1000);
        best = ask ? Math.min(best, y) : Math.max(best, y);
      }
      return typeof v === "number" && near(best, v, 1e-9);
    },
    bugs: ([al, be, p, q, ask]) => {
      const f = cubic(al, be, 1, 0);
      const ends = [f(p), f(q)];
      const inner = [al, be].filter((x) => x > p && x < q).map(f);
      const pick = (xs: number[]) => (ask ? Math.min(...xs) : Math.max(...xs));
      return [
        { id: "ends-only", kind: "conceptual", competency: APP, says: "Only the end points were checked; the turning points inside the interval are candidates too.", predict: pick(ends) },
        { id: "turning-only", kind: "conceptual", competency: APP, says: "Only the turning points were checked; on a closed interval the end points can give the absolute extreme.", predict: pick(inner) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "critical" ? `Turning points inside the interval: x = ${s.value}` : s.id === "values" ? `f at the end points and turning points: ${s.value}` : `The ${s.inputs[0]} of these is ${N(Number(s.value))}`),
    domain: [[-3, 3], [-3, 3], [-4, 3], [-3, 5], [0, 1]],
    cap: 300,
    difficulty: ([al, be, p, q]) => (al > p && al < q && be > p && be < q ? 3 : q - p <= 3 ? 1 : 2),
    teach: {
      idea: "A continuous function on a closed interval has an absolute maximum and minimum, and they occur either at a turning point inside or at an end point.",
      method: "Find the critical points inside [p, q]; evaluate f there and at p and q; the largest value is the absolute maximum, the smallest the absolute minimum.",
      alternatives: [{ id: "table", title: "A table of candidates", kind: "procedural", text: ["List x = p, the critical points inside, and x = q in one row.", "Write f(x) under each and circle the largest and the smallest."] }],
    },
    limits: "Cubics with whole turning points on intervals of length at most 6 with whole end points.",
  },
  {
    id: "aqrr",
    arity: 4,
    title: "Rates of change of related quantities",
    competency: APP,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (rrOk(p) ? null : "Cube, circle, revenue or rectangle rates with small whole numbers."),
    prompt: ([kind, x0, r, e]) =>
      [
        `The edge of a cube is increasing at ${r} cm/s. How fast, in cm³/s, is its volume increasing when the edge is ${x0} cm?`,
        `The edge of a cube is increasing at ${r} cm/s. How fast, in cm²/s, is its total surface area increasing when the edge is ${x0} cm?`,
        `The radius of a circular ripple is increasing at ${r} cm/s. When the radius is ${x0} cm the area is increasing at kπ cm²/s. Find k.`,
        `The total revenue, in rupees, from selling x items is R(x) = ${pp([[r, 2], [e, 1]])}. Find the marginal revenue, in rupees per item, when x = ${x0}.`,
        `The length of a rectangle is decreasing at ${r} cm/s and its width is increasing at ${r + 1} cm/s. Find the rate of change of its area, in cm²/s, when the length is ${x0} cm and the width is ${e} cm (negative if the area is decreasing).`,
      ][kind],
    solve: ([kind, x0, r, e]) => {
      const ans = rrAnswer(kind, x0, r, e);
      const formula = ["dV/dt = 3x² dx/dt", "dS/dt = 12x dx/dt", "dA/dt = 2πr dr/dt", "MR = dR/dx", "dA/dt = (dl/dt) b + l (db/dt)"][kind];
      return { steps: [step("chain", "differentiate", RULES, [formula], formula), step("substitute", "evaluate", APP, [x0, r], ans)], answer: ans };
    },
    // independent: the quantity as a function of time (or of x), differentiated by central differences
    validate: ([kind, x0, r, e], v) => {
      const q = [(t: number) => (x0 + r * t) ** 3, (t: number) => 6 * (x0 + r * t) ** 2, (t: number) => (x0 + r * t) ** 2, (t: number) => r * (x0 + t) ** 2 + e * (x0 + t), (t: number) => (x0 - r * t) * (e + (r + 1) * t)][kind];
      return typeof v === "number" && Math.abs(d1(q, 0, 1e-4) - v) < 1e-5 * Math.max(1, Math.abs(v));
    },
    bugs: ([kind, x0, r, e]) => {
      const out: Bug[] = [];
      const add = (id: string, says: string, predict: number, k: Bug["kind"] = "procedural") => out.push({ id, kind: k, competency: APP, says, predict });
      if (kind === 0) {
        if (r !== 1) add("rate-forgotten", `dV/dx = 3x² was found but not multiplied by dx/dt = ${r} (chain rule).`, 3 * x0 * x0);
        add("quantity", "The volume itself was found, not its rate of change.", x0 ** 3, "conceptual");
      } else if (kind === 1) {
        if (r !== 1) add("rate-forgotten", `dS/dx = 12x was found but not multiplied by dx/dt = ${r}.`, 12 * x0);
        add("quantity", "The surface area itself was found, not its rate of change.", 6 * x0 * x0, "conceptual");
      } else if (kind === 2) {
        if (r !== 1) add("rate-forgotten", `dA/dr = 2πr was found but not multiplied by dr/dt = ${r}.`, 2 * x0);
        add("quantity", "The area (as a multiple of π) was found, not its rate of change.", x0 * x0, "conceptual");
      } else if (kind === 3) {
        add("revenue", "The total revenue R(x) was found; the marginal revenue is its derivative R′(x).", r * x0 * x0 + e * x0, "conceptual");
        add("average", "The revenue per item, R(x)/x, was found; the marginal revenue is R′(x).", r * x0 + e, "conceptual");
      } else {
        add("one-term", "Only the change in width was used; the area A = lb changes through both l and b: dA/dt = (dl/dt)b + l(db/dt).", x0 * (r + 1));
        add("sign", `The length is decreasing, so dl/dt = −${r}; the minus sign was lost.`, r * e + x0 * (r + 1));
      }
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "chain" ? `Differentiate with respect to time (chain rule): ${s.value}` : `Substitute the values: ${N(Number(s.value))}`),
    domain: [[0, 4], [2, 12], [1, 5], [1, 20]],
    keep: rrOk,
    cap: 400,
    difficulty: ([kind]) => (kind === 3 ? 1 : kind === 4 ? 3 : 2),
    teach: {
      idea: "If a quantity Q depends on x and x changes with time, then dQ/dt = (dQ/dx) × (dx/dt): the rates are linked by the chain rule.",
      method: "Write the formula linking the quantities, differentiate both sides with respect to t, then substitute the values at the moment asked about.",
      alternatives: [{ id: "small_change", title: "A small change in time", kind: "conceptual", text: ["In a short time Δt, x changes by about (dx/dt)Δt.", "Q then changes by about (dQ/dx) × (dx/dt)Δt; divide by Δt."] }],
    },
    limits: "Cubes, circles (as multiples of π), quadratic revenue and rectangles with whole numbers; ladders, cones and shadows are left out.",
  },
  // ============================================================== area, continuity, concavity
  {
    id: "aqarea",
    arity: 4,
    title: "Areas bounded by a parabola, a cubic or a quadratic and the axis",
    competency: AREA,
    type: "exact",
    mc: true,
    parse: none,
    reject: (p) => (areaOk(p) ? null : "y² = 4ax with x = c, y = kx³ from −p to q, or y = x² − d² from 0 to e."),
    prompt: ([kind, u, v, w]) =>
      kind === 0
        ? `Find the area of the region bounded by the parabola y² = ${4 * u}x and the line x = ${v}.`
        : kind === 1
          ? `Find the area of the region bounded by the curve y = ${u === 1 ? "" : u}x³, the x-axis and the lines x = −${v} and x = ${w}.`
          : `Find the area of the region bounded by the curve y = x² − ${u * u}, the x-axis and the lines x = 0 and x = ${v}.`,
    word: ([kind, u, v, w]) => `A sign-maker in Sivakasi cuts a flat metal plate (units in dm) in the shape of the region bounded by ${kind === 0 ? `the parabola y² = ${4 * u}x and the line x = ${v}` : kind === 1 ? `the curve y = ${u === 1 ? "" : u}x³, the x-axis and the lines x = −${v} and x = ${w}` : `the curve y = x² − ${u * u}, the x-axis and the lines x = 0 and x = ${v}`}. Find the area of the plate, in dm².`,
    solve: (p) => {
      const ans = areaAnswer(p);
      const [kind, u, v, w] = p;
      const setup = kind === 0 ? `2∫₀^${v} 2√(${u}x) dx` : kind === 1 ? `∫ |${u}x³| dx, split at x = 0` : `∫ |x² − ${u * u}| dx, split at x = ${u}`;
      return { steps: [step("setup", "integrate", AREA, [kind, u, v, w], setup), step("evaluate", "evaluate", DEFI, [], ans)], answer: ans };
    },
    // independent: Simpson's rule (horizontal strips for the parabola; |y| split at numerically found crossings)
    validate: ([kind, u, v, w], ans) => {
      const val = valueOf(ans);
      if (!Number.isFinite(val)) return false;
      let area: number;
      if (kind === 0) {
        const Y = 2 * Math.sqrt(u * v);
        area = simpson((y) => v - (y * y) / (4 * u), -Y, Y, 200);
      } else if (kind === 1) area = absArea((x) => u * x ** 3, -v, w);
      else area = absArea((x) => x * x - u * u, 0, v);
      return near(area, val, 1e-7);
    },
    bugs: ([kind, u, v, w]) => {
      if (kind === 0) {
        const [s, m] = sqfree(u * v);
        return [{ id: "half", kind: "conceptual", competency: AREA, says: "Only the part above the x-axis was found; the parabola is symmetric about the x-axis, so double it.", predict: surdQ((4 * v * s) / 3, m) } as Bug];
      }
      if (kind === 1)
        return [
          { id: "signed", kind: "conceptual", competency: AREA, says: "The integral was taken across x = 0 in one go, so the part below the axis cancelled part of the area; split at x = 0 and add the sizes.", predict: fmt((u * (w ** 4 - v ** 4)) / 4) },
          { id: "from-zero", kind: "procedural", competency: AREA, says: `The region from x = −${v} to 0 was left out.`, predict: fmt((u * w ** 4) / 4) },
        ] as Bug[];
      return [
        { id: "signed", kind: "conceptual", competency: AREA, says: `The curve is below the axis for 0 < x < ${u}; integrating straight through subtracted that part. Split at x = ${u} and add the sizes.`, predict: fmt((v ** 3 - 3 * u * u * v) / 3) },
        { id: "above-only", kind: "procedural", competency: AREA, says: `Only the part from x = ${u} to ${v} (above the axis) was found; the part between 0 and ${u} is also bounded by the curve and the axis.`, predict: fmt((v ** 3 - 3 * u * u * v + 2 * u ** 3) / 3) },
      ] as Bug[];
    },
    distractors: (p) => {
      const ans = areaAnswer(p);
      const [kind, u, v] = p;
      if (kind === 0) {
        const [s, m] = sqfree(u * v);
        return [surdQ((16 * v * s) / 3, m), surdQ(4 * v * s, m)];
      }
      return [fmt(2 * valueOf(ans)), fmt(valueOf(ans) + 1)];
    },
    variants: () => [],
    explain: (s) => (s.id === "setup" ? `Area = ${s.value}` : `Evaluating gives ${s.value} square units`),
    // an area is never negative: negative options are not offered
    range: [0, Infinity],
    domain: [[0, 2], [1, 4], [1, 9], [1, 4]],
    keep: areaOk,
    difficulty: ([kind]) => (kind === 0 ? 2 : kind === 1 ? 2 : 3),
    teach: {
      idea: "Area is always positive: integrate the height |y| of the region. Where a curve dips below the x-axis, its integral there is negative, so split the interval at the crossing and add the sizes.",
      method: "Sketch the region, find where the curve meets the axis, write the area as a sum of integrals of positive heights (use symmetry where it helps), and evaluate.",
      alternatives: [{ id: "horizontal", title: "Horizontal strips", kind: "procedural", text: ["For y² = 4ax and x = c, take strips parallel to the x-axis: their length is c − y²/(4a).", "Integrate from y = −2√(ac) to 2√(ac)."] }],
    },
    limits: "A parabola cut off by its own vertical line, y = kx³, and y = x² − d²; circles and ellipses (answers in π) and two curves are left to other families.",
  },
  {
    id: "aqcontk",
    arity: 5,
    title: "Choosing k to make a function continuous",
    competency: CONT,
    type: "fraction",
    mc: true,
    parse: none,
    reject: (p) => (contOk(p) ? null : "A piecewise polynomial, or sin(mx)/(nx), (1 − cos mx)/(nx²), (√(1 + mx) − 1)/(nx), (x³ − u³)/(x − u)."),
    prompt: ([kind, u, v, w, z]) => {
      if (kind === 0) return `f(x) = ${pp([[1, 1]]).replace("x", "kx")}${sg(v)} for x ≤ ${u}, and f(x) = ${pp([[w, 2], [z, 0]])} for x > ${u}. Find the value of k for which f is continuous at x = ${u}.`;
      const bot = (t: string) => (t === "x" ? t : `(${t})`);
      const top = kind === 1 ? `sin(${kx(u)})/${bot(kx(v))}` : kind === 2 ? `(1 − cos(${kx(u)}))/${bot(`${v === 1 ? "" : v}x²`)}` : kind === 3 ? `(√(1 + ${kx(u)}) − 1)/${bot(kx(v))}` : `(x³ − ${u ** 3})/(x − ${u})`;
      const at = kind === 4 ? u : 0;
      return `f(x) = ${top} for x ≠ ${at}, and f(${at}) = k. Find the value of k for which f is continuous at x = ${at}.`;
    },
    word: ([kind, u, v, w, z]) => {
      if (kind === 0) return `In a drawing app, a curve is made of two pieces: y = kx${sg(v)} for x ≤ ${u}, and y = ${pp([[w, 2], [z, 0]])} for x > ${u}. For which value of k do the two pieces join without a gap at x = ${u} (so that the curve is continuous there)?`;
      const bot = (t: string) => (t === "x" ? t : `(${t})`);
      const top = kind === 1 ? `sin(${kx(u)})/${bot(kx(v))}` : kind === 2 ? `(1 − cos(${kx(u)}))/${bot(`${v === 1 ? "" : v}x²`)}` : kind === 3 ? `(√(1 + ${kx(u)}) − 1)/${bot(kx(v))}` : `(x³ − ${u ** 3})/(x − ${u})`;
      const at = kind === 4 ? u : 0;
      return `A data-logging app on a phone shows the reading f(x) = ${top} when a dial is at any setting x ≠ ${at}, and a fixed value k when the dial is exactly at ${at}. Which value of k makes the reading change continuously, with no jump, as the dial passes ${at}?`;
    },
    solve: (p) => {
      const k = contAnswer(p);
      return { steps: [step("limit", "evaluate", LIM, [p[0]], k), step("match", "solve", CONT, ["f(a) = lim f(x)"], k)], answer: k };
    },
    // independent: the other piece's value just beside the point (Richardson-extrapolated), compared with f(a)
    validate: ([kind, u, v, w, z], k) => {
      if (typeof k !== "number") return false;
      if (kind === 0) return Math.abs(k * u + v - (w * (u + 1e-9) ** 2 + z)) < 1e-6;
      const g = kind === 1 ? (x: number) => Math.sin(u * x) / (v * x) : kind === 2 ? (x: number) => (1 - Math.cos(u * x)) / (v * x * x) : kind === 3 ? (x: number) => (Math.sqrt(1 + u * x) - 1) / (v * x) : (x: number) => (x ** 3 - u ** 3) / (x - u);
      const L = limitAt(g, kind === 4 ? u : 0);
      return Math.abs(L - k) < 1e-6 * Math.max(1, Math.abs(L));
    },
    bugs: ([kind, u, v, w, z]) => {
      const out: Bug[] = [];
      if (kind === 0) {
        const R = w * u * u + z;
        const lhs = `${coef(u)}k${sg(v)}`;
        // the slip: uk + v = R written as uk = R + v (the sign of v kept when it moves across)
        if (v !== 0) out.push({ id: "move-sign", kind: "prerequisite", competency: "MATH.algebra.linear-equations", says: `${N(v)} was moved across without changing its sign: ${lhs} = ${N(R)} was written as ${coef(u)}k = ${N(R)}${sg(v)}. Moving a number to the other side changes its sign: ${coef(u)}k = ${N(R)}${sg(-v)}.`, predict: (R + v) / u });
        if (u !== 1 && R - v !== (R - v) / u) out.push({ id: "no-divide", kind: "procedural", competency: CONT, says: `The equation ${lhs} = ${N(R)} was not finished: ${u}k = ${N(R - v)} was given as the answer, but k = ${N(R - v)} ÷ ${u}.`, predict: R - v });
      } else if (kind === 1) {
        if (u !== v) out.push({ id: "upside-down", kind: "procedural", competency: LIM, says: `The ratio was turned over, giving ${F(v / u)}: the number in the sine goes on top, since sin(${kx(u)})/${v === 1 ? "x" : `(${kx(v)})`} = ${v === 1 ? u : `(${u}/${v})`} × sin(${kx(u)})/${u === 1 ? "x" : `(${kx(u)})`}, which tends to ${F(u / v)}.`, predict: v / u });
        if (u !== 1) out.push({ id: "m-lost", kind: "procedural", competency: LIM, says: `sin(${u}x)/x was taken as 1; it tends to ${u}, since sin θ/θ → 1 needs θ = ${u}x in both places.`, predict: 1 / v });
      } else if (kind === 2) {
        out.push({ id: "half-lost", kind: "procedural", competency: LIM, says: "1 − cos θ is about θ²/2 for small θ; the ½ was lost.", predict: (u * u) / v });
        if (u !== 1) out.push({ id: "not-squared", kind: "procedural", competency: LIM, says: `1 − cos(${u}x) = 2 sin²(${u}x/2), which gives (${u}x)²/2: the ${u} is squared.`, predict: u / (2 * v) });
      } else if (kind === 3) {
        out.push({ id: "half-lost", kind: "procedural", competency: LIM, says: `After multiplying top and bottom by √(1 + ${kx(u)}) + 1, the bottom has the factor √(1 + ${kx(u)}) + 1, which tends to 2; that 2 was lost.`, predict: u / v });
      } else {
        out.push({ id: "cube-factor", kind: "prerequisite", competency: FACT, says: `x³ − ${u ** 3} was factorised as (x − ${u})(x² + ${u * u}); it is (x − ${u})(x² + ${u}x + ${u * u}).`, predict: 2 * u * u });
        out.push({ id: "zero", kind: "conceptual", competency: LIM, says: `0/0 was taken as 0; it means the expression must be simplified (cancel x − ${u}) before substituting.`, predict: 0 });
      }
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "limit" ? `The limit of the other piece at the point is ${F(Number(s.value))}` : `Continuity needs f(a) = that limit, so k = ${F(Number(s.value))}`),
    domain: [[0, 4], [1, 6], [-3, 6], [-3, 6], [-3, 3]],
    keep: contOk,
    cap: 300,
    difficulty: ([kind]) => (kind === 0 || kind === 4 ? 1 : kind === 1 ? 2 : 3),
    teach: {
      idea: "f is continuous at a when lim (x → a) f(x) exists and equals f(a): the left limit, the right limit and the value all agree.",
      method: "Find the limit of the formula near a (substitute for a polynomial; use sin θ/θ → 1, 1 − cos θ = 2 sin²(θ/2), rationalising or factorising otherwise), then set f(a) equal to it.",
      alternatives: [{ id: "both_sides", title: "Left value, right value", kind: "conceptual", text: ["For a function in two pieces, work out each piece at x = a.", "Continuity means the two values are equal: that is an equation for k."] }],
    },
    limits: "One unknown k; testing continuity on a whole domain and classifying discontinuities are left to an educator.",
  },
  {
    id: "aqconc",
    arity: 5,
    title: "Intervals of concavity of a cubic or quartic",
    competency: CURVE,
    type: "interval",
    mc: true,
    parse: none,
    reject: ([kind, al, be, ask, p]) => (kind < 0 || kind > 1 || ask < 0 || ask > 1 || p < -5 || p > 5 || al < -3 || be > 4 || (kind === 0 ? al >= be : al !== be) ? "x⁴ − 2(α+β)x³ + 6αβx² + px with α < β, or x³ − 3αx² + px." : null),
    prompt: ([kind, al, be, ask, p]) => `Find the interval(s) on which the curve y = ${concText(kind, al, be, p)} is concave ${ask ? "downward" : "upward"}. Write open intervals, joined by ∪ if there are two.`,
    word: ([kind, al, be, ask, p]) => `A highway engineer models a stretch of hill road on a side view by y = ${concText(kind, al, be, p)}, where x is the horizontal distance in hundreds of metres (negative to the west of a milestone) and y the height. Where does the road bend ${ask ? "downward, like the top of a hill (concave downward)" : "upward, like the bottom of a valley (concave upward)"}? Write open intervals of x, joined by ∪ if there are two.`,
    solve: ([kind, al, be, ask]) => {
      const ans = kind === 0 ? openIv(al, be, ask === 0) : ask ? `(−∞, ${N(al)})` : `(${N(al)}, ∞)`;
      return { steps: [step("second", "differentiate", HD, [], kind === 0 ? `12${fx2(al, be)}` : `6${fx(al)}`), step("sign", "classify", CURVE, [ask ? "y″ < 0" : "y″ > 0"], ans)], answer: ans };
    },
    // independent: the sign of a second difference on a fine grid, and y″ ≈ 0 at the end points
    validate: ([kind, al, be, ask, p], v) => {
      const f = (x: number) => (kind === 0 ? x ** 4 - 2 * (al + be) * x ** 3 + 6 * al * be * x * x + p * x : x ** 3 - 3 * al * x * x + p * x);
      return ivMatches(v, (x) => (ask ? d2(f, x, 1e-3) < 0 : d2(f, x, 1e-3) > 0), (x) => d2(f, x, 1e-3));
    },
    bugs: ([kind, al, be, ask]) => {
      const out: Bug[] = [];
      if (kind === 0) {
        out.push({ id: "swapped", kind: "conceptual", competency: CURVE, says: `Upward and downward were swapped: y″ = 12${fx2(al, be)} is positive outside the roots (concave upward) and negative between them.`, predict: openIv(al, be, ask !== 0) });
        if (ask === 0) out.push({ id: "one-piece", kind: "procedural", competency: CURVE, says: "Only one piece was given; y″ > 0 on both outer pieces.", predict: `(${N(be)}, ∞)` });
      } else {
        out.push({ id: "swapped", kind: "conceptual", competency: CURVE, says: `Upward and downward were swapped: y″ = 6(x${sg(-al)}) is positive to the right of x = ${N(al)}, so the curve is concave upward there.`, predict: ask ? `(${N(al)}, ∞)` : `(−∞, ${N(al)})` });
        if (al !== 0) out.push({ id: "root-sign", kind: "procedural", competency: FACT, says: `y″ = 0 at x = ${N(al)}, not ${N(-al)}: the sign was slipped.`, predict: ask ? `(−∞, ${N(-al)})` : `(${N(-al)}, ∞)` });
      }
      return out;
    },
    distractors: ([, al, be]) => [`(${N(al)}, ∞)`, `(−∞, ${N(be)})`, `(${N(be)}, ∞)`, `(−∞, ${N(al)})`, `(${N(al - 1)}, ∞)`, `(−∞, ${N(be + 1)})`],
    variants: () => [],
    explain: (s) => (s.id === "second" ? `y″ = ${s.value}` : `${s.inputs[0]} on ${s.value}`),
    domain: [[0, 1], [-3, 4], [-3, 4], [0, 1], [-5, 5]],
    keep: ([kind, al, be]) => (kind === 0 ? al < be : al === be),
    cap: 400,
    difficulty: ([kind, al]) => (kind === 1 && al >= 0 ? 1 : kind === 1 ? 2 : 3),
    teach: {
      idea: "A curve is concave upward where y″ > 0 (its slope is increasing) and concave downward where y″ < 0; points of inflection are where y″ changes sign.",
      method: "Differentiate twice, factorise y″, mark its roots on a number line and test the sign of y″ in each part.",
      visual: ([, al, be]) => ({ type: "numberline", from: al - 3, to: be + 3, marks: al === be ? [al] : [al, be] }),
      alternatives: [{ id: "slope_trend", title: "Watch the slope", kind: "conceptual", text: ["Concave upward means the tangent slope increases as x increases, like a cup.", "So check where y′ is increasing: that is where y″ > 0."] }],
    },
    limits: "Concavity intervals of cubics and quartics with whole inflection points; asymptotes, symmetry and the sketch itself are marked by an educator.",
  },
  // ============================================================== definite integrals: properties
  {
    id: "aqodd",
    arity: 4,
    title: "Definite integrals over [−a, a] using odd and even functions",
    competency: DIP,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([o, a, k, m]) => (o < 0 || o > 4 || a < 1 || a > 3 || k < 0 || k > 6 || m < 0 || m > 5 || k + m === 0 ? "An odd function plus kx² + m over [−a, a]." : null),
    prompt: ([o, a, k, m]) => `Evaluate ${intg(-a, a)} (${ODD[o][0]} + ${pp([[k, 2], [m, 0]])}) dx.`,
    word: ([o, a, k, m]) => `Water flows into a storage tank at a rate of r(t) = ${ODD[o][0].replace(/x/g, "t")} + ${pp([[k, 2], [m, 0]], "t")} litres per minute, t minutes after 10 a.m. (a negative rate means water flows out, and negative t is before 10 a.m.). Find the net amount of water, in litres, that flows into the tank from t = −${a} to t = ${a}.`,
    solve: ([o, a, k, m]) => {
      const ans = (2 * k * a ** 3 + 6 * m * a) / 3;
      return { steps: [step("odd", "classify", DIP, [ODD[o][0]], 0), step("even", "integrate", DIP, [k, m, a], `2${intg(0, a)} (${pp([[k, 2], [m, 0]])}) dx`), step("value", "evaluate", DEFI, [], ans)], answer: ans };
    },
    // independent: Simpson's rule on the whole integrand
    validate: ([o, a, k, m], v) => typeof v === "number" && near(simpson((x) => ODD[o][1](x) + k * x * x + m, -a, a, 4000), v, 1e-7),
    bugs: ([, a, k, m]) => [
      { id: "all-vanish", kind: "conceptual", competency: DIP, says: "Every term was taken to vanish over a symmetric interval; only the odd part does. The even part kx² + m gives twice its integral from 0 to a.", predict: 0 },
      { id: "not-doubled", kind: "procedural", competency: DIP, says: "The even part was integrated from 0 to a but not doubled: ∫₋ₐᵃ g = 2∫₀ᵃ g for an even g.", predict: (k * a ** 3 + 3 * m * a) / 3 },
    ],
    variants: () => [],
    explain: (s) => (s.id === "odd" ? `${s.inputs[0]} is odd (f(−x) = −f(x)), so its integral over [−a, a] is 0` : s.id === "even" ? `The even part gives ${s.value}` : `= ${F(Number(s.value))}`),
    domain: [[0, 4], [1, 3], [0, 6], [0, 5]],
    keep: ([, , k, m]) => k + m > 0,
    cap: 300,
    difficulty: ([, a, k]) => (k === 0 ? 1 : a <= 2 ? 2 : 3),
    teach: {
      idea: "If f is odd (f(−x) = −f(x)), ∫₋ₐᵃ f(x) dx = 0: the areas on the two sides cancel. If f is even (f(−x) = f(x)), ∫₋ₐᵃ f(x) dx = 2∫₀ᵃ f(x) dx.",
      method: "Split the integrand into its odd part and its even part, drop the odd part, and integrate the even part from 0 to a and double it.",
      alternatives: [{ id: "substitute", title: "Substitute x = −t", kind: "procedural", text: ["Write ∫₋ₐᵃ f = ∫₋ₐ⁰ f + ∫₀ᵃ f and put x = −t in the first integral.", "It becomes ∫₀ᵃ f(−t) dt, which is −∫₀ᵃ f for an odd f and +∫₀ᵃ f for an even f."] }],
    },
    limits: "Five odd functions that have no easy antiderivative (so the property is needed) plus kx² + m.",
  },
  {
    id: "aqking",
    arity: 3,
    title: "Definite integrals with the property ∫ f(x) dx = ∫ f(a + b − x) dx",
    competency: DIP,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([kind, a, b]) => (kind < 0 || kind > 4 || a < 0 || a > 15 || b > 40 || b - a < 2 || (kind === 3 && a < 2) ? "∫ₐᵇ g(x)/(g(x) + g(a + b − x)) dx for √x, x², x³, log x or eˣ." : null),
    prompt: ([kind, a, b]) => `Evaluate ${intg(a, b)} ${KING[kind][0](a + b)} dx.`,
    solve: ([, a, b]) => ({ steps: [step("reflect", "substitute", DIP, [a + b], "I = ∫ g(a + b − x)/(g(a + b − x) + g(x)) dx"), step("add", "add", DIP, [b, a], b - a), step("halve", "divide", DEFI, [2], (b - a) / 2)], answer: (b - a) / 2 }),
    // independent: Simpson's rule on the integrand itself
    validate: ([kind, a, b], v) => typeof v === "number" && Math.abs(simpson((x) => KING[kind][1](x, a + b), a, b, 20000) - v) < 1e-4,
    bugs: ([, a, b]) => {
      const out: Bug[] = [{ id: "not-halved", kind: "procedural", competency: DIP, says: `Adding the two forms of I gives 2I = ∫ 1 dx = ${b - a}; the last step, dividing by 2, was missed.`, predict: b - a }];
      if (a > 0) out.push({ id: "sum-of-limits", kind: "procedural", competency: DEFI, says: `∫ₐᵇ 1 dx = b − a = ${b - a}, not a + b.`, predict: (a + b) / 2 });
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "reflect" ? `Replace x by ${s.inputs[0]} − x: ${s.value}` : s.id === "add" ? `Add the two forms: 2I = ∫ 1 dx = ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : `So I = ${F(Number(s.value))}`),
    // the answer (b − a)/2 is the smallest of the explained answers: further options below or above it, varying
    distractors: ([kind, a, b]) => [[(b - a) / 4, (b - a) / 3], [(b - a) / 4, b - a + 1], [b - a + 1, b - a + 2]][(kind + a + 2 * b) % 3],
    domain: [[0, 4], [0, 15], [1, 40]],
    cap: 300,
    difficulty: ([kind, a]) => (a === 0 ? 1 : kind === 3 ? 3 : 2),
    teach: {
      idea: "∫ₐᵇ f(x) dx = ∫ₐᵇ f(a + b − x) dx: replacing x by a + b − x runs over the same interval backwards. For g(x)/(g(x) + g(a + b − x)), the two forms add up to 1.",
      method: "Call the integral I, write it again with x replaced by a + b − x, add the two: 2I = ∫ₐᵇ 1 dx = b − a, so I = (b − a)/2.",
      alternatives: [{ id: "symmetry", title: "Symmetry about the middle", kind: "conceptual", text: ["At x and at a + b − x (mirror points about (a + b)/2) the integrand's values add up to 1.", "So on average the integrand is ½, and the integral is ½ × (b − a)."] }],
    },
    limits: "Five functions g with whole limits; trigonometric forms over [0, π/2] (answers in π) are left out.",
  },
  {
    id: "aqabsint",
    arity: 4,
    title: "Splitting the interval: |x − c| and the greatest integer function",
    competency: DIP,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([kind, a, b, c]) => (kind === 0 ? (a < -4 || a > 2 || !(a < c && c < b) || b > 6 ? "∫ₐᵇ |x − c| dx with a < c < b." : null) : kind === 1 ? (a < -3 || a > 2 || b < a + 2 || b > 6 || c !== 0 ? "∫ₐᵇ [x] dx with whole limits." : null) : "Two kinds."),
    prompt: ([kind, a, b, c]) => (kind === 0 ? `Evaluate ${intg(a, b)} |x${sg(-c)}| dx.` : `Evaluate ${intg(a, b)} [x] dx, where [x] is the greatest integer less than or equal to x.`),
    solve: ([kind, a, b, c]) => {
      if (kind === 0) {
        const ans = ((c - a) ** 2 + (b - c) ** 2) / 2;
        return { steps: [step("split", "split", DIP, [c], `${intg(a, c)} ${c === 0 ? "(−x)" : `(${N(c)} − x)`} dx + ${intg(c, b)} ${c === 0 ? "x" : `(x${sg(-c)})`} dx`), step("pieces", "evaluate", DEFI, [(c - a) ** 2 / 2, (b - c) ** 2 / 2], ans)], answer: ans };
      }
      const ks = range(a, b - 1);
      const ans = ks.reduce((s, k) => s + k, 0);
      return { steps: [step("split", "split", DIP, ks, `unit intervals [k, k + 1] from ${N(a)} to ${N(b)}`), step("pieces", "add", DEFI, ks, ans)], answer: ans };
    },
    // independent: Simpson (kink on a node) for |x − c|; an exact midpoint sum for [x]
    validate: ([kind, a, b, c], v) => {
      if (typeof v !== "number") return false;
      if (kind === 0) return near(simpson((x) => Math.abs(x - c), a, b, 2000 * (b - a)), v, 1e-8);
      let s = 0;
      const h = 1e-3;
      for (let i = 0; i < (b - a) / h; i++) s += Math.floor(a + (i + 0.5) * h) * h;
      return Math.abs(s - v) < 1e-6;
    },
    bugs: ([kind, a, b, c]) =>
      kind === 0
        ? [
            { id: "no-split", kind: "conceptual", competency: DIP, says: `|x${sg(-c)}| was integrated as x${sg(-c)} all the way; for x < ${N(c)} it is ${N(c)} − x, so split at x = ${N(c)}.`, predict: ((b - c) ** 2 - (c - a) ** 2) / 2 },
            { id: "right-only", kind: "procedural", competency: DIP, says: `Only the part from ${N(c)} to ${N(b)} was found; the part from ${N(a)} to ${N(c)} also counts.`, predict: (b - c) ** 2 / 2 },
          ]
        : [
            { id: "as-x", kind: "conceptual", competency: DIP, says: "[x] was integrated as if it were x; [x] is constant on each interval [k, k + 1), so split at the integers.", predict: (b * b - a * a) / 2 },
            { id: "one-too-many", kind: "procedural", competency: DIP, says: `The last unit interval was counted up to ${N(b)}; the pieces are [${N(a)}, ${N(a + 1)}), …, [${N(b - 1)}, ${N(b)}), with values ${N(a)} to ${N(b - 1)}.`, predict: range(a, b).reduce((s, k) => s + k, 0) },
          ],
    variants: () => [],
    explain: (s) => (s.id === "split" ? `Split: ${s.value}` : `Add the pieces: ${F(Number(s.value))}`),
    domain: [[0, 1], [-4, 2], [-1, 6], [-3, 5]],
    keep: ([kind, a, b, c]) => (kind === 0 ? a < c && c < b : c === 0 && a >= -3 && b >= a + 2),
    // the integral of |x − c| is never negative (the integral of [x] can be)
    range: ([kind]) => (kind === 0 ? [0, Infinity] : null),
    difficulty: ([kind, a]) => (kind === 0 && a >= 0 ? 1 : kind === 0 ? 2 : 3),
    teach: {
      idea: "∫ₐᵇ f = ∫ₐᶜ f + ∫ᶜᵇ f for any c in between. Split where the formula changes: at x = c for |x − c|, at each integer for [x].",
      method: "Find where the integrand changes its formula, split the interval there, write each piece without | | or [ ], integrate each piece and add.",
      alternatives: [{ id: "areas", title: "Count areas", kind: "conceptual", text: ["|x − c| makes two triangles above the axis: (c − a)²/2 and (b − c)²/2.", "[x] makes rectangles of width 1 and heights a, a + 1, …, b − 1 (below the axis when negative)."] }],
    },
    limits: "Whole-number limits; |x − c| with one kink and [x]; other piecewise functions are left out.",
  },
  // ============================================================== differentiability
  {
    id: "aqdiffab",
    arity: 3,
    title: "Choosing a and b to make a piecewise function differentiable",
    competency: DIFF,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([c, p, q]) => (c === 0 || c < -3 || c > 3 || p < -5 || p > 5 || q < -5 || q > 5 ? "x² + ax + b for x < c, px + q for x ≥ c, with c ≠ 0." : null),
    prompt: ([c, p, q]) => `f(x) = x² + ax + b for x < ${N(c)}, and f(x) = ${pp([[p, 1], [q, 0]])} for x ≥ ${N(c)}. Find a and b so that f is differentiable at x = ${N(c)}. Write the answer as (a, b).`,
    word: ([c, p, q]) => `A children's slide in a Chennai park is designed (in metres, on a side view) as the curve y = x² + ax + b for x < ${N(c)}, joined to the straight part y = ${pp([[p, 1], [q, 0]])} for x ≥ ${N(c)}. For the slide to be smooth at the join — no gap and no corner — the function must be differentiable at x = ${N(c)}. Find a and b, written as (a, b).`,
    solve: ([c, p, q]) => {
      const a = p - 2 * c;
      const b = q + c * c;
      return { steps: [step("slopes", "differentiate", DIFF, [c, p], a), step("join", "solve", CONT, [c, q], b)], answer: `(${N(a)}, ${N(b)})` };
    },
    // independent: one-sided difference quotients at c and the gap between the pieces
    validate: ([c, p, q], v) => {
      const t = readTuple(v);
      if (!t || t.length !== 2) return false;
      const [a, b] = t;
      const left = (x: number) => x * x + a * x + b;
      const h = 1e-6;
      return Math.abs(left(c) - (p * c + q)) < 1e-9 && Math.abs((left(c) - left(c - h)) / h - p) < 1e-4;
    },
    bugs: ([c, p, q]) => [
      { id: "slope-without-x", kind: "procedural", competency: DIFF, says: `The slopes were matched as a = ${N(p)}, forgetting the 2x from x²: the left derivative at x = ${N(c)} is 2(${N(c)}) + a.`, predict: `(${N(p)}, ${N(q - c * c)})` },
      { id: "sign-slip", kind: "procedural", competency: DIFF, says: `2(${N(c)}) + a = ${N(p)} was solved as a = ${N(p)}${sg(2 * c)}; subtract 2(${N(c)}) = ${N(2 * c)} from both sides instead.`, predict: `(${N(p + 2 * c)}, ${N(q - 3 * c * c)})` },
    ],
    distractors: ([c, p, q]) => [`(${N(p - 2 * c)}, ${N(q - c * c)})`, `(${N(p)}, ${N(q)})`],
    variants: () => [],
    explain: (s) => (s.id === "slopes" ? `Equal one-sided derivatives: 2(${N(Number(s.inputs[0]))}) + a = ${N(Number(s.inputs[1]))}, so a = ${N(Number(s.value))}` : `Equal values at x = ${N(Number(s.inputs[0]))} (continuity): b = ${N(Number(s.value))}`),
    domain: [[-3, 3], [-5, 5], [-5, 5]],
    keep: ([c]) => c !== 0,
    cap: 300,
    difficulty: ([c]) => (c > 0 ? 2 : 3),
    teach: {
      idea: "Differentiable at c means the left and right derivatives at c are equal; this also needs f to be continuous at c (the pieces must meet).",
      method: "Match the slopes of the two pieces at x = c to find a; then match their values at x = c to find b.",
      alternatives: [{ id: "tangent", title: "One tangent line", kind: "conceptual", text: ["The line px + q must be the tangent to the parabola at x = c.", "So the parabola must pass through (c, pc + q) with slope p there."] }],
    },
    limits: "A parabola joined to a line at a whole number c ≠ 0; explaining why differentiable implies continuous is marked by an educator.",
  },
  // ============================================================== differential equations
  {
    id: "aqsep",
    arity: 4,
    title: "Separating the variables in an initial value problem",
    competency: DE,
    type: "expression",
    mc: true,
    parse: none,
    reject: ([kind, p, q, y0]) => (y0 < 1 || y0 > 5 || (kind === 0 ? (p === 0 && q === 0) || p < -4 || p > 4 || q < -3 || q > 3 : kind === 1 ? p === 0 || p < -3 || p > 4 || q !== 0 : true) ? "dy/dx = (px + q)y with y(0) = y₀, or dy/dx = py/x with y(1) = y₀." : null),
    prompt: ([kind, p, q, y0]) => (kind === 0 ? `Solve the differential equation dy/dx = ${q === 0 ? `${p === 1 ? "" : p === -1 ? "−" : N(p)}xy` : p === 0 ? `${q === 1 ? "" : q === -1 ? "−" : N(q)}y` : `(${pp([[p, 1], [q, 0]])})y`}, given that y = ${y0} when x = 0. Write y in terms of x.` : `Solve the differential equation dy/dx = ${p === 1 ? "" : p === -1 ? "−" : N(p)}y/x, x > 0, given that y = ${y0} when x = 1. Write y in terms of x.`),
    solve: ([kind, p, q, y0]) => {
      const ans = sepAnswer(kind, p, q, y0);
      return { steps: [step("separate", "separate", DE, [], kind === 0 ? `dy/y = ${br(pp([[p, 1], [q, 0]]))} dx` : `dy/y = ${N(p)} dx/x`), step("integrate", "integrate", INDEF, [], kind === 0 ? `log y = ${sepExpo(p, q)} + C` : `log y = ${N(p)} log x + C`), step("constant", "evaluate", DE, [y0], ans)], answer: ans };
    },
    // independent: a Runge–Kutta solution of the equation from the initial condition
    validate: ([kind, p, q, y0], v) => (kind === 0 ? solvesIvp(v, (x, y) => (p * x + q) * y, 0, y0, [0.5, 1.2, 1.9]) : solvesIvp(v, (x, y) => (p * y) / x, 1, y0, [0.5, 1.6, 2.3])),
    bugs: ([kind, p, q, y0]) => {
      const out: Bug[] = [];
      if (kind === 0) {
        const e = sepExpo(p, q);
        if (y0 !== 1) out.push({ id: "constant-dropped", kind: "procedural", competency: DE, says: `The constant of integration was dropped; y = ${y0} at x = 0 fixes it: y = Ae^(…) with A = ${y0}.`, predict: `e^(${e})` });
        out.push({ id: "constant-in-exponent", kind: "procedural", competency: DE, says: `log y = ${e} + C gives C = log ${y0}, not ${y0}; the constant was put into the exponent as ${y0}.`, predict: `e^(${e} + ${y0})` });
        out.push({ id: "y-dropped", kind: "conceptual", competency: DE, says: "The y on the right was ignored and only (px + q) was integrated; divide by y first: dy/y = (px + q) dx.", predict: sum([[p / 2, "x²"], [q, "x"], [y0, ""]]) });
      } else {
        if (y0 !== 1) out.push({ id: "constant-dropped", kind: "procedural", competency: DE, says: `The constant was dropped; y(1) = ${y0} gives y = ${y0}${xp1(p)}.`, predict: xp1(p) });
        out.push({ id: "constant-added-late", kind: "procedural", competency: DE, says: "The constant was added after taking exponentials; log y = p log x + C gives y = Axᵖ, a constant multiple.", predict: `${xp1(p)} + ${y0 - 1 === 0 ? "1" : y0 - 1}` });
      }
      return out;
    },
    distractors: (p) => { const a = String(B17.find((d) => d.id === "aqsep")!.solve(p).answer); return [`−${/^[a-z][^ ]*$/.test(a) ? a : `(${a})`}`, `2${/^[a-z][^ ]*$/.test(a) ? a : `(${a})`}`, `${a} + 1`]; },
    variants: () => [],
    explain: (s) => (s.id === "separate" ? `Separate the variables: ${s.value}` : s.id === "integrate" ? `Integrate both sides: ${s.value}` : `Use y = ${s.inputs[0]} at the starting point to find the constant: y = ${s.value}`),
    word: ([kind, p, q, y0]) => (kind === 0 ? `A quantity y changes so that its rate of change dy/dx equals ${br(pp([[p, 1], [q, 0]]))} times y, and y = ${y0} when x = 0. Find y as an expression in x.` : `For x > 0, a quantity y changes so that dy/dx = ${N(p)}y/x, and y = ${y0} when x = 1. Find y as an expression in x.`),
    domain: [[0, 1], [-4, 4], [-3, 3], [1, 5]],
    cap: 300,
    difficulty: ([kind, p, q]) => (kind === 1 ? 1 : p === 0 || q === 0 ? 2 : 3),
    teach: {
      idea: "When dy/dx is a function of x times a function of y, the variables can be separated: dy/g(y) = f(x) dx, and each side integrated.",
      method: "Divide by y, integrate both sides (log y on the left, the natural logarithm), add one constant, exponentiate, and use the initial condition to find the constant.",
      alternatives: [{ id: "check", title: "Check by differentiating", kind: "procedural", text: ["Differentiate your y and see whether you get the right side of the equation.", "Then put in the starting x and check you get the starting y."] }],
    },
    limits: "Two separable forms with exponential or power solutions; equations needing partial fractions are left out.",
  },
  {
    id: "aqorddeg",
    arity: 4,
    title: "The order and degree of a differential equation",
    competency: DE,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([n, pw, m, r]) => (n < 1 || n > 4 || pw < 1 || pw > 5 || m < 1 || m > 6 || r < 0 || r > 2 ? "Polynomial in the derivatives, highest order 1 to 4." : null),
    prompt: (p) => `Find the order and the degree of the differential equation ${odeText(p)}. Write the answer as (order, degree).`,
    solve: ([n, pw]) => ({ steps: [step("order", "classify", DE, [], n), step("degree", "classify", DE, [n], pw)], answer: `(${n}, ${pw})` }),
    // independent: read the terms of the equation and pick the highest derivative and its power
    validate: (p, v) => {
      const t = readTuple(v);
      if (!t || t.length !== 2) return false;
      const terms = odeTerms(p);
      const top = Math.max(...terms.map((x) => x[0]));
      return t[0] === top && t[1] === terms.find((x) => x[0] === top)![1];
    },
    bugs: ([n, pw, m]) => {
      const out: Bug[] = [];
      if (m > pw) out.push({ id: "largest-power", kind: "conceptual", competency: DE, says: "The largest power anywhere was taken as the degree; the degree is the power of the highest-order derivative only.", predict: `(${n}, ${m})` });
      if (pw !== n) out.push({ id: "swapped", kind: "recall", competency: DE, says: "Order and degree were swapped: the order is how many times y is differentiated in the highest derivative; the degree is that derivative's power.", predict: `(${pw}, ${n})` });
      return out;
    },
    distractors: ([n, pw]) => [`(${n + 1}, ${pw})`, `(${n}, ${pw + 1})`, `(${n === 1 ? 2 : n - 1}, ${pw})`],
    variants: () => [],
    explain: (s) => (s.id === "order" ? `The highest derivative is ${D(Number(s.value))}: order ${s.value}` : `It appears to the power ${s.value}: degree ${s.value}`),
    domain: [[1, 4], [1, 5], [1, 6], [0, 2]],
    difficulty: ([n, pw, m]) => (m <= pw ? 1 : n === 1 ? 2 : 3),
    teach: {
      idea: "The order is that of the highest derivative in the equation; the degree (defined when the equation is a polynomial in the derivatives) is the power of that highest derivative.",
      method: "Find the derivative with the most dashes (the largest k in dᵏy/dxᵏ): that k is the order. Its power is the degree; powers of lower derivatives do not matter.",
      alternatives: [{ id: "dash", title: "Rewrite with dashes", kind: "procedural", text: ["Write dy/dx as y′, d²y/dx² as y″, d³y/dx³ as y‴.", "The most dashes give the order; the power on that term gives the degree."] }],
    },
    limits: "Equations polynomial in their derivatives; cases where the degree is not defined (sin(y′), eʸ′) are left to an educator.",
  },
  {
    id: "aqlinde",
    arity: 4,
    title: "A linear differential equation with an integrating factor",
    competency: DE,
    type: "expression",
    mc: true,
    parse: none,
    reject: ([k, m, n, y1]) => (k < 1 || k > 3 || m < 1 || m > 6 || n < 0 || n > 3 || y1 < -3 || y1 > 4 ? "dy/dx + (k/x)y = mxⁿ with y(1) = y₁." : null),
    prompt: ([k, m, n, y1]) => `Solve dy/dx + ${k === 1 ? "y/x" : `${k}y/x`} = ${pp([[m, n]])}, x > 0, given that y = ${N(y1)} when x = 1. Write y in terms of x.`,
    solve: ([k, m, n, y1]) => {
      const A = m / (n + k + 1);
      const C = y1 - A;
      const ans = pp([[A, n + 1], [C, -k]]);
      return { steps: [step("if", "evaluate", DE, [k], k === 1 ? "x" : `x${sup(k)}`), step("integrate", "integrate", INDEF, [m, n + k], `y·${k === 1 ? "x" : `x${sup(k)}`} = ${pp([[A, n + k + 1]])} + C`), step("constant", "evaluate", DE, [y1], ans)], answer: ans };
    },
    // independent: a Runge–Kutta solution from x = 1
    validate: ([k, m, n, y1], v) => solvesIvp(v, (x, y) => m * x ** n - (k * y) / x, 1, y1, [0.5, 1.7, 2.4]),
    bugs: ([k, m, n, y1]) => {
      const A = m / (n + k + 1);
      const C = y1 - A;
      const out: Bug[] = [];
      if (Math.abs(C) > 1e-12) out.push({ id: "constant-dropped", kind: "procedural", competency: DE, says: `The constant of integration was dropped; y·${k === 1 ? "x" : `x${sup(k)}`} = … + C, and y(1) = ${N(y1)} fixes C.`, predict: pp([[A, n + 1]]) });
      out.push({ id: "q-not-multiplied", kind: "procedural", competency: DE, says: `The right side was integrated without multiplying it by the integrating factor ${k === 1 ? "x" : `x${sup(k)}`}: y·(IF) = ∫ Q·(IF) dx.`, predict: pp([[m / (n + 1), n + 1 - k], [y1 - m / (n + 1), -k]]) });
      return out;
    },
    distractors: (p) => { const a = String(B17.find((d) => d.id === "aqlinde")!.solve(p).answer); return [`−${/^[a-z][^ ]*$/.test(a) ? a : `(${a})`}`, `2${/^[a-z][^ ]*$/.test(a) ? a : `(${a})`}`, `${a} + 1`]; },
    variants: () => [],
    explain: (s) => (s.id === "if" ? `Integrating factor: e^(∫${s.inputs[0]}/x dx) = ${s.value}` : s.id === "integrate" ? `Multiply through and integrate: ${s.value}` : `Use y(1) = ${N(Number(s.inputs[0]))}: y = ${s.value}`),
    domain: [[1, 3], [1, 6], [0, 3], [-3, 4]],
    cap: 300,
    difficulty: ([k, m, n]) => (m % (n + k + 1) === 0 ? 1 : k === 1 ? 2 : 3),
    teach: {
      idea: "For dy/dx + Py = Q, multiplying by the integrating factor e^(∫P dx) turns the left side into the derivative of y × IF.",
      method: "Find IF = e^(∫P dx) (here xᵏ), write y × IF = ∫ Q × IF dx + C, divide by IF, and use the initial condition for C.",
      alternatives: [{ id: "product", title: "See the product rule", kind: "conceptual", text: ["d/dx (xᵏy) = xᵏ dy/dx + k xᵏ⁻¹ y = xᵏ (dy/dx + (k/x)y).", "So multiplying the equation by xᵏ makes the left side d/dx (xᵏy)."] }],
    },
    limits: "P = k/x and Q = m xⁿ (integrating factor xᵏ); P constant and dx/dy forms are left out.",
  },
  {
    id: "aqhom",
    arity: 4,
    title: "A homogeneous differential equation with y = vx",
    competency: HOM,
    type: "expression",
    mc: true,
    parse: none,
    reject: (p) => (homOk(p) ? null : "dy/dx = (y + kx)/x, (my + kx)/x or (kx² + y²)/(xy), with y(1) = c."),
    prompt: ([kind, k, m, c]) => `Solve the homogeneous differential equation dy/dx = ${kind === 0 ? `(y + ${kx(k)})/x` : kind === 1 ? `(${m}y + ${kx(k)})/x` : `(${k === 1 ? "" : k}x² + y²)/(xy)`}, x > 0, given that y = ${N(c)} when x = 1. Write y in terms of x.`,
    word: ([kind, k, m, c]) => `A cycling track on a town map is drawn so that at every point (x, y) with x > 0 its slope is dy/dx = ${kind === 0 ? `(y + ${kx(k)})/x` : kind === 1 ? `(${m}y + ${kx(k)})/x` : `(${k === 1 ? "" : k}x² + y²)/(xy)`}, and it passes through the point (1, ${N(c)}). Find the equation of the track, y in terms of x.`,
    solve: (p) => {
      const [kind, k, m] = p;
      const ans = homAnswer(p);
      const vEq = kind === 0 ? `x dv/dx = ${k}` : kind === 1 ? `x dv/dx = ${m - 1 === 1 ? "" : m - 1}v + ${k}` : `x dv/dx = ${k}/v`;
      return { steps: [step("substitute", "substitute", HOM, ["y = vx"], `v + x dv/dx = …, so ${vEq}`), step("separate", "integrate", DE, [], vEq), step("constant", "evaluate", DE, [p[3]], ans)], answer: ans };
    },
    // independent: a Runge–Kutta solution from x = 1
    validate: ([kind, k, m, c], v) => solvesIvp(v, (x, y) => (kind === 0 ? (y + k * x) / x : kind === 1 ? (m * y + k * x) / x : (k * x * x + y * y) / (x * y)), 1, c, [0.5, 1.6, 2.3]),
    bugs: ([kind, k, m, c]) => {
      const out: Bug[] = [];
      if (kind === 0) {
        if (c !== 0) out.push({ id: "constant-dropped", kind: "procedural", competency: DE, says: `The constant was dropped: v = ${k} log x + C, and y(1) = ${N(c)} gives C = ${N(c)}.`, predict: sum([[k, "x log x"]]) });
        out.push({ id: "dv-for-dy", kind: "conceptual", competency: HOM, says: "With y = vx, dy/dx was taken as dv/dx; by the product rule dy/dx = v + x dv/dx.", predict: `x(${F(c + k)}e^(x − 1) − ${k})` });
      } else if (kind === 1) {
        out.push({ id: "constant-dropped", kind: "procedural", competency: DE, says: "The constant of integration was dropped (taken as 0); the initial condition fixes it.", predict: sum([[-k / (m - 1), "x"]]) });
        out.push({ id: "dv-for-dy", kind: "conceptual", competency: HOM, says: "With y = vx, dy/dx was taken as dv/dx; by the product rule dy/dx = v + x dv/dx.", predict: `x((${F(c + k / m)})e^(${m}(x − 1)) − ${F(k / m)})` });
      } else out.push({ id: "two-lost", kind: "procedural", competency: INDEF, says: "∫ v dv = v²/2; the factor 2 was lost when solving for v².", predict: `x√(${k === 1 ? "" : k}log x + ${c * c})` });
      return out;
    },
    distractors: (p) => { const a = String(B17.find((d) => d.id === "aqhom")!.solve(p).answer); return [`−${/^[a-z][^ ]*$/.test(a) ? a : `(${a})`}`, `2${/^[a-z][^ ]*$/.test(a) ? a : `(${a})`}`, `${a} + 1`]; },
    variants: () => [],
    explain: (s) => (s.id === "substitute" ? `Put y = vx, dy/dx = v + x dv/dx: ${s.value}` : s.id === "separate" ? `Separate and integrate ${s.value}` : `Use y(1) = ${N(Number(s.inputs[0]))}: y = ${s.value}`),
    domain: [[0, 2], [1, 4], [1, 4], [-3, 6]],
    keep: homOk,
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 1 ? 2 : 3),
    teach: {
      idea: "In a homogeneous equation dy/dx depends only on y/x. Putting y = vx (so dy/dx = v + x dv/dx) turns it into a separable equation in v and x.",
      method: "Substitute y = vx and dy/dx = v + x dv/dx, simplify to x dv/dx = g(v), separate and integrate, put v = y/x back, and use the initial condition.",
      alternatives: [{ id: "check", title: "Check your answer", kind: "procedural", text: ["Differentiate your y and work out the right side of the equation with it.", "They must agree, and your y must equal the given value at x = 1."] }],
    },
    limits: "Three homogeneous forms whose solutions involve x log x (natural logarithm), powers of x or a square root; implicit solutions are left out.",
  },
  // ============================================================== second derivatives
  {
    id: "aqd2",
    arity: 3,
    title: "Second-order derivatives",
    competency: HD,
    type: "expression",
    mc: true,
    parse: none,
    reject: (p) => (d2Ok(p) ? null : "eᵃˣ sin bx, eᵃˣ cos bx, log(ax + b), kxⁿ log x, kxeᵃˣ, x sin ax or x cos ax."),
    prompt: (p) => `If y = ${d2Text(p)}, find d²y/dx².${p[0] === 1 || p[0] === 2 ? " (log is the natural logarithm.)" : ""}`,
    word: (p) => `A sensor on a moving platform records y = ${d2Text(p)} at time x seconds${p[0] === 1 || p[0] === 2 ? " (log is the natural logarithm)" : ""}. How quickly its rate of change is itself changing is d²y/dx². Find d²y/dx².`,
    solve: (p) => {
      const [first, second] = d2Answers(p);
      return { steps: [step("first", "differentiate", RULES, [d2Text(p)], first), step("second", "differentiate", HD, [first], second)], answer: second };
    },
    // independent: a second central difference of y at several points
    validate: (p, v) => agrees(v, (x) => d2(d2Fn(p), x), [0.6, 1.1, 1.7], 1e-5),
    bugs: (p) => {
      const [kind, a, b] = p;
      const [first] = d2Answers(p);
      const out: Bug[] = [{ id: "stopped-early", kind: "procedural", competency: HD, says: "Only the first derivative was found; d²y/dx² means differentiate once more.", predict: first }];
      const e = ex(a);
      if (kind === 0) out.push({ id: "b-squared-sign", kind: "recall", competency: RULES, says: `The derivative of cos(${kx(b)}) is −${b === 1 ? "" : b}sin(${kx(b)}); with the minus sign lost, −b² became +b².`, predict: `${e}(${sum([[a * a + b * b, `sin(${kx(b)})`], [2 * a * b, `cos(${kx(b)})`]])})` });
      if (kind === 4) out.push({ id: "b-squared-sign", kind: "recall", competency: RULES, says: `The derivative of sin(${kx(b)}) is +${b === 1 ? "" : b}cos(${kx(b)}); a sign slip turned −b² into +b².`, predict: `${e}(${sum([[a * a + b * b, `cos(${kx(b)})`], [-2 * a * b, `sin(${kx(b)})`]])})` });
      if (kind === 1 && a > 1) out.push({ id: "chain-once", kind: "procedural", competency: RULES, says: `The chain-rule factor ${a} was used only once; each differentiation of (${kx(a)}${sg(b)}) brings a factor ${a}.`, predict: b === 0 ? `−1/(${a}x²)` : `−${a}/(${kx(a)}${sg(b)})²` });
      if (kind === 3) out.push({ id: "product-once", kind: "procedural", competency: RULES, says: "Only the eᵃˣ factor was differentiated each time; the product rule also differentiates the x.", predict: `${sum([[b * a * a, "x"]])}${e}` });
      if (kind === 5) out.push({ id: "x-as-constant", kind: "procedural", competency: RULES, says: "x was treated as a constant multiplier; x sin ax is a product, so use the product rule.", predict: b ? `${sum([[-a * a, `x cos(${kx(a)})`]])}` : `${sum([[-a * a, `x sin(${kx(a)})`]])}` });
      return out;
    },
    distractors: (p) => {
      const [first] = d2Answers(p);
      return [`(${first})²`, `−(${d2Answers(p)[1]})`];
    },
    variants: () => [],
    explain: (s) => (s.id === "first" ? `dy/dx = ${s.value}` : `Differentiate again: d²y/dx² = ${s.value}`),
    domain: [[0, 5], [-2, 5], [0, 5]],
    keep: d2Ok,
    difficulty: ([kind]) => (kind === 1 || kind === 5 ? 1 : kind === 3 || kind === 2 ? 2 : 3),
    teach: {
      idea: "The second derivative d²y/dx² is the derivative of dy/dx: how fast the slope itself is changing.",
      method: "Differentiate once (product and chain rules), simplify, then differentiate the result again; collect like terms at the end.",
      alternatives: [{ id: "pattern", title: "Spot the pattern", kind: "conceptual", text: ["For eᵃˣ times sin bx or cos bx, each differentiation keeps the factor eᵃˣ and mixes sin and cos.", "Write dy/dx = eᵃˣ(…), then differentiate the bracket and the eᵃˣ again."] }],
    },
    limits: "Seven standard forms with small whole parameters; second derivatives in parametric form are left to another family.",
  },
  {
    id: "aqd2rel",
    arity: 3,
    title: "The differential equation satisfied by a family of functions",
    competency: HD,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([kind, m, n]) => (kind === 0 ? (m >= n || m < -5 || n > 6 ? "m < n." : null) : kind === 1 ? (m < -3 || m > 3 || n < 1 || n > 4 ? "a from −3 to 3, b from 1 to 4." : null) : kind === 2 ? (m === 0 || m < -5 || m > 5 || n !== 0 ? "m ≠ 0." : null) : "Three kinds."),
    prompt: ([kind, m, n]) => {
      const y = kind === 0 ? `A${exPretty(m)} + B${exPretty(n)}` : kind === 1 ? `${exPretty(m)}(A cos ${kx(n)} + B sin ${kx(n)})` : `(A + Bx)${exPretty(m)}`;
      return `If y = ${y}, where A and B are arbitrary constants, find the constants p and q for which d²y/dx² + p dy/dx + qy = 0. Write the answer as (p, q).`;
    },
    solve: ([kind, m, n]) => {
      const [p, q] = kind === 0 ? [-(m + n), m * n] : kind === 1 ? [-2 * m, m * m + n * n] : [-2 * m, m * m];
      return { steps: [step("derivatives", "differentiate", HD, [kind], "y′, y″"), step("eliminate", "solve", HD, ["A", "B"], `(${N(p)}, ${N(q)})`)], answer: `(${N(p)}, ${N(q)})` };
    },
    // independent: put a member of the family into y″ + py′ + qy by central differences and check it vanishes
    validate: ([kind, m, n], v) => {
      const t = readTuple(v);
      if (!t || t.length !== 2) return false;
      const [p, q] = t;
      const A = 1.3;
      const B = -0.7;
      const y = (x: number) => (kind === 0 ? A * Math.exp(m * x) + B * Math.exp(n * x) : kind === 1 ? Math.exp(m * x) * (A * Math.cos(n * x) + B * Math.sin(n * x)) : (A + B * x) * Math.exp(m * x));
      return [0.3, 0.8, 1.4].every((x) => {
        const yy = d2(y, x, 1e-3);
        const y1 = d1(y, x, 1e-4);
        const scale = Math.abs(yy) + Math.abs(p * y1) + Math.abs(q * y(x)) + Math.abs(y1) + Math.abs(y(x));
        return Math.abs(yy + p * y1 + q * y(x)) < 1e-5 * scale;
      });
    },
    bugs: ([kind, m, n]) => {
      const [p, q] = kind === 0 ? [-(m + n), m * n] : kind === 1 ? [-2 * m, m * m + n * n] : [-2 * m, m * m];
      const out: Bug[] = [];
      if (p !== 0) out.push({ id: "sign-p", kind: "procedural", competency: HD, says: "The sign of p was slipped: the roots r of r² + pr + q = 0 add up to −p.", predict: `(${N(-p)}, ${N(q)})` });
      if (kind === 1) out.push({ id: "b-sign", kind: "recall", competency: RULES, says: "The derivative of cos is −sin; a sign slip turned a² + b² into a² − b².", predict: `(${N(p)}, ${N(m * m - n * n)})` });
      else if (q !== 0) out.push({ id: "sign-q", kind: "procedural", competency: HD, says: "The sign of q was slipped: the product of the roots is +q.", predict: `(${N(p)}, ${N(-q)})` });
      return out;
    },
    distractors: ([kind, m, n]) => {
      const [p, q] = kind === 0 ? [-(m + n), m * n] : kind === 1 ? [-2 * m, m * m + n * n] : [-2 * m, m * m];
      return [`(${N(q)}, ${N(p)})`, `(${N(p + 1)}, ${N(q)})`, `(${N(-p)}, ${N(-q)})`];
    },
    variants: () => [],
    explain: (s) => (s.id === "derivatives" ? "Find dy/dx and d²y/dx²" : `Eliminate A and B (or use the roots of r² + pr + q = 0): (p, q) = ${s.value}`),
    domain: [[0, 2], [-5, 6], [-5, 6]],
    keep: ([kind, m, n]) => (kind === 0 ? m < n : kind === 1 ? m >= -3 && m <= 3 && n >= 1 && n <= 4 : m !== 0 && m <= 5 && n === 0),
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 2 ? 2 : 3),
    teach: {
      idea: "y = eʳˣ satisfies y″ + py′ + qy = 0 exactly when r² + pr + q = 0. A family with two arbitrary constants comes from the two roots of that quadratic.",
      method: "Read off the roots r₁, r₂ from the exponents (a repeated root for (A + Bx)eᵐˣ, a ± ib for eᵃˣ(A cos bx + B sin bx)); then p = −(r₁ + r₂) and q = r₁r₂.",
      alternatives: [{ id: "eliminate", title: "Eliminate A and B", kind: "procedural", text: ["Write y, y′ and y″ in terms of A and B.", "Combine them so that A and B cancel; the coefficients give p and q."] }],
    },
    limits: "Two-constant families from real, repeated and complex roots with small whole parameters; verifying a stated relation in words is marked by an educator.",
  },
  // ============================================================== gap@1 additions
  {
    id: "aqinvbr",
    arity: 3,
    title: "Domain and range of the principal value branches of the inverse trigonometric functions",
    competency: INV,
    skill: "principal value branches",
    type: "choice",
    // [f, ask, s]: f = sin⁻¹ … cosec⁻¹; ask 0 the range, 1 the domain, 2 which angle is a principal value, 3 which x is in the domain
    parse: none,
    reject: (p) => (ibrOk(p) ? null : "One of the six inverse functions; for the angle and number questions a choice of candidates."),
    prompt: ([f, ask]) =>
      [
        `Which of these is the range of the principal value branch of ${IBR_NAME[f]}?`,
        `What is the domain of ${IBR_NAME[f]} (the set of real numbers x for which ${IBR_NAME[f]}(x) is defined)?`,
        `Which one of these angles is a possible principal value of ${IBR_NAME[f]}(x), for some real number x?`,
        `For which one of these numbers x is ${IBR_NAME[f]}(x) defined as a real number?`,
      ][ask],
    choices: (p) => ibrChoices(p).map((c) => c.text),
    solve: (p) => {
      const [f, ask] = p;
      const cs = ibrChoices(p);
      const right = cs.findIndex((c) => c.right);
      const what = ask === 0 ? `range ${IBR_RANGES[f].text}` : ask === 1 ? `domain ${IBR_DOMS[IBR_DOM_OF[f]].text}` : ask === 2 ? `principal values lie in ${IBR_RANGES[f].text}` : `defined for x in ${IBR_DOMS[IBR_DOM_OF[f]].text}`;
      return { steps: [step("branch", "recall", INV, [IBR_NAME[f]], what), step("pick", "classify", INV, [ask], right)], answer: right };
    },
    // independent: the branch found numerically from Math.asin/acos/atan (round trips θ → f(θ) → f⁻¹, and where f⁻¹(x) is a real number)
    validate: (p, v) => {
      const [f, ask] = p;
      const c = ibrChoices(p)[v as number];
      if (!c) return false;
      if (ask === 1) {
        for (let i = -320; i <= 320; i++) if (inPSet(c.set!, i / 64) !== Number.isFinite(ibrInv(f, i / 64))) return false;
        return true;
      }
      if (ask === 3) return Number.isFinite(ibrInv(f, c.value!));
      if (ask === 2) return ibrAttained(f, c.value!);
      for (let i = -240; i <= 480; i++) {
        const th = (i * Math.PI) / 240;
        if (inPSet(c.set!, th) !== ibrAttained(f, th)) return false;
      }
      return true;
    },
    bugs: (p) => {
      const [f, ask] = p;
      const cs = ibrChoices(p);
      const at = (tag: string) => {
        const i = cs.findIndex((c) => c.tag === tag);
        return i < 0 ? null : i;
      };
      const n = IBR_NAME[f];
      const out: Bug[] = [];
      if (ask === 0) {
        out.push({ id: "branch-mix", kind: "recall", competency: INV, says: IBR_RANGE_SLIP[f], predict: at("partner") });
        out.push({ id: "domain-for-range", kind: "conceptual", competency: INV, says: `The domain of ${n} was given instead of its range: the range is the set of angles that ${n} gives back.`, predict: at("swap") });
      } else if (ask === 1) {
        out.push({ id: "range-for-domain", kind: "conceptual", competency: INV, says: `The principal range of ${n} was given instead of its domain: the domain is the set of numbers x that ${n} accepts.`, predict: at("swap") });
        out.push({ id: "domain-mix", kind: "recall", competency: INV, says: IBR_DOM_SLIP[f], predict: at("partner") });
      } else if (ask === 2) out.push({ id: "branch-edge", kind: "conceptual", competency: INV, says: IBR_ANGLE_SLIP[f], predict: at("partner") });
      else out.push({ id: "domain-mix", kind: "recall", competency: INV, says: IBR_NUM_SLIP[f], predict: at("partner") });
      return out.filter((b) => b.predict !== null);
    },
    variants: () => [],
    explain: (s) => (s.id === "branch" ? `For ${s.inputs[0]}: ${s.value}` : `So the answer is option ${"ABCD"[Number(s.value)]}`),
    domain: [[0, 5], [0, 3], [0, 7]],
    keep: (p) => ibrOk(p),
    difficulty: ([f, ask]) => (f <= 1 && ask <= 1 ? 1 : f >= 4 || ask >= 2 ? 3 : 2),
    teach: {
      idea: "No trigonometric function is one-one on its whole domain, so to invert it we keep one piece on which it is one-one and takes every value once: the principal value branch. sin⁻¹ and cosec⁻¹ give angles in [−π/2, π/2], cos⁻¹ and sec⁻¹ in [0, π], tan⁻¹ in (−π/2, π/2), cot⁻¹ in (0, π); sec⁻¹ leaves out π/2 and cosec⁻¹ leaves out 0.",
      method: "For the range, recall the branch and remove the angles where the function itself is not defined (π/2 for sec, 0 for cosec, the end points for tan and cot). For the domain, ask which values the function takes on the branch: [−1, 1] for sin and cos, every real number for tan and cot, x ≤ −1 or x ≥ 1 for sec and cosec.",
      alternatives: [{ id: "graphs", title: "Reflect the graph", kind: "conceptual", text: ["Draw y = sec x for 0 ≤ x ≤ π: it is not defined at π/2 and its values are ≤ −1 or ≥ 1.", "Reflecting that piece in the line y = x gives y = sec⁻¹ x: its domain is the old set of values and its range is the old piece of x-axis."] }],
    },
    limits: "Recognising the domain and the principal range of each of the six functions; explaining in words why the restriction is needed is written work for an educator.",
  },
  {
    id: "aqcontd",
    arity: 8,
    title: "Is a piecewise function continuous on ℝ or on an interval?",
    competency: CONT,
    skill: "continuity on a domain or an interval",
    type: "choice",
    // [a, d, p, m1, m3, j1, j2, ask]: m1x + c1 (x < a), x² + px (a ≤ x < b), m3x + c3 (x ≥ b), b = a + d; jumps j1, j2 at a and b; ask 0 on ℝ, 1 on an interval round a, 2 round b
    parse: none,
    reject: (p) => (cdOk(p) ? null : "Three pieces joined at whole numbers a < b, asked on ℝ or on an interval containing one break point."),
    prompt: (p) => `f(x) = ${cdText(p)}. ${p[7] === 0 ? "Which statement about the continuity of f on ℝ is true?" : `Which statement about the continuity of f on the closed interval [${cdIv(p).map(dec).join(", ")}] is true?`}`,
    word: (p) => `A designer describes the height of a toy roller-coaster track (in cm above the table) at a horizontal distance x (in dm, measured from a mark on the table, negative to the left) by f(x) = ${cdText(p)}. A break in the track means f is not continuous there. ${p[7] === 0 ? "Which statement about the track (f on ℝ) is true?" : `Which statement about the part of the track over [${cdIv(p).map(dec).join(", ")}] is true?`}`,
    choices: (p) => cdChoices(p).map((c) => c.text),
    solve: (p) => {
      const [a, d, , , , j1, j2, ask] = p;
      const b = a + d;
      const brk = [a, b].filter((x, i) => (i === 0 ? j1 : j2) !== 0 && (ask === 0 || ask === i + 1));
      const idx = cdChoices(p).findIndex((c) => sameSet(c.at, brk));
      return { steps: [step("pieces", "classify", CONT, [], "each piece is a polynomial, so f is continuous away from x = a and x = b"), step("left-right", "evaluate", LIM, [a, b], `jumps ${N(2 * j1)} at x = ${N(a)}, ${N(2 * j2)} at x = ${N(b)}`), step("decide", "classify", CONT, [ask], idx)], answer: idx };
    },
    // independent: scan the interval on a fine grid for jumps between the values just left and just right of each point
    validate: (p, v) => {
      const c = cdChoices(p)[v as number];
      if (!c) return false;
      const f = cdFn(p);
      const [lo, hi] = p[7] === 0 ? [-8, 8] : cdIv(p);
      const found: number[] = [];
      for (let i = Math.ceil(lo * 200); i <= Math.floor(hi * 200); i++) {
        const x = i / 200;
        if (Math.abs(f(x + 1e-9) - f(x - 1e-9)) > 1e-6) found.push(x);
      }
      return sameSet(found, c.at);
    },
    bugs: (p) => {
      const [a, d, , , , j1, j2, ask] = p;
      const b = a + d;
      const cs = cdChoices(p);
      const truth = [a, b].filter((x, i) => (i === 0 ? j1 : j2) !== 0 && (ask === 0 || ask === i + 1));
      const idx = (at: number[]) => cs.findIndex((c) => sameSet(c.at, at));
      const out: Bug[] = [];
      if (truth.length) out.push({ id: "pieces-polynomial", kind: "conceptual", competency: CONT, says: "Each piece is a polynomial, so f was taken to be continuous everywhere; at a point where the formula changes, the two pieces must also give the same value.", predict: idx([]) });
      if (truth.length < 2 && ask === 0) out.push({ id: "every-break", kind: "conceptual", competency: CONT, says: "Every point where the formula changes was taken to be a discontinuity; there f is continuous when the left-hand limit, the right-hand limit and f(a) all agree.", predict: idx([a, b]) });
      if (ask !== 0) {
        const other = ask === 1 ? b : a;
        const otherJump = ask === 1 ? j2 : j1;
        if (otherJump !== 0) out.push({ id: "outside-point", kind: "procedural", competency: CONT, says: `The break at x = ${N(other)} was counted, but x = ${N(other)} is not in the interval; only points of the interval matter.`, predict: idx([...truth, other].sort((x, y) => x - y)) });
      }
      return out.filter((x) => x.predict !== -1);
    },
    variants: () => [],
    explain: (s) => (s.id === "pieces" ? `A polynomial is continuous everywhere, so ${s.value}` : s.id === "left-right" ? `Compare the two pieces at each break point (right-hand value minus left-hand value): ${s.value}` : `So the true statement is option ${"ABCD"[Number(s.value)]}`),
    domain: [[-3, 2], [1, 3], [-2, 2], [-2, 2], [-2, 2], [-2, 2], [-2, 2], [0, 2]],
    keep: (p) => cdOk(p),
    cap: 300,
    difficulty: ([, , , , , j1, j2, ask]) => (ask === 0 && (j1 === 0) === (j2 === 0) ? 1 : ask === 0 ? 2 : 3),
    teach: {
      idea: "A function is continuous on a set when it is continuous at every point of it. Polynomials are continuous everywhere, so a piecewise function can only fail where its formula changes, and there it fails exactly when the two pieces do not meet.",
      method: "List the points where the formula changes that lie in the set. At each one, work out the value of the left piece and of the right piece there (and f at the point). Equal values: continuous there; different: a discontinuity.",
      alternatives: [{ id: "pencil", title: "Draw it without lifting the pencil", kind: "conceptual", text: ["Sketch each piece on its own part of the number line.", "At each change point, see whether the end of one piece meets the start of the next; a gap is a discontinuity."], visual: ([a, d]) => ({ type: "numberline", from: a - 2, to: a + d + 2, marks: [a, a + d] }) }],
    },
    limits: "Three pieces (two lines and a parabola) with whole-number break points; removable discontinuities from rational functions and the classification of discontinuities are left out.",
  },
  {
    id: "aqd2test",
    arity: 5,
    title: "Classifying a critical point by the second-derivative test",
    competency: APP,
    skill: "second-derivative test",
    type: "choice",
    // [kind, u, v, s, w]: 0 a cubic with f′ = 6s(x − u)(x − v) at x = u (w = 0) or v (w = 1); 1 s(x − u)⁴ + v; 2 ux + uv²/x at x = sv; 3 s(x − u)³ + v
    parse: none,
    reject: (p) => (d2tOk(p) ? null : "A cubic at one of its turning points, s(x − c)⁴ + k, (x − c)³ + k, or ax + b/x at a critical point."),
    prompt: (p) => `For f(x) = ${d2tText(p)}, x = ${N(d2tPoint(p))} is a critical point (f′(${N(d2tPoint(p))}) = 0). What does the second-derivative test say about x = ${N(d2tPoint(p))}?`,
    choices: (p) => d2tChoices(p),
    solve: (p) => {
      const c = d2tPoint(p);
      const f2 = d2tSecond(p);
      const label = f2 > 0 ? 1 : f2 < 0 ? 0 : 2;
      return { steps: [step("second", "differentiate", HD, [d2tText(p)], d2tSecondText(p)), step("value", "evaluate", HD, [c], f2), step("test", "classify", APP, [f2], d2tChoices(p).indexOf(D2T[label]))], answer: d2tChoices(p).indexOf(D2T[label]) };
    },
    // independent: a second central difference of f at the point (and f′ ≈ 0 there)
    validate: (p, v) => {
      const f = d2tFn(p);
      const c = d2tPoint(p);
      if (Math.abs(d1(f, c, 1e-5)) > 1e-5) return false;
      const s2 = d2(f, c, 1e-3);
      const label = Math.abs(s2) < 1e-4 ? 2 : s2 > 0 ? 1 : 0;
      return d2tChoices(p)[v as number] === D2T[label];
    },
    bugs: (p) => {
      const f2 = d2tSecond(p);
      const cs = d2tChoices(p);
      const ix = (l: number) => cs.indexOf(D2T[l]);
      if (f2 === 0) return [{ id: "zero-as-min", kind: "conceptual", competency: APP, says: "f″ = 0 at the point was read as if it were positive, so a minimum was concluded; the test decides only when f″ is strictly positive or strictly negative, and here it gives no conclusion (the first-derivative test is needed).", predict: ix(1) }];
      return [
        { id: "sign-rule-swapped", kind: "conceptual", competency: APP, says: `The sign rule was swapped: f″ = ${N(f2)} ${f2 > 0 ? "> 0 means the curve bends upward (a cup), which is a local minimum" : "< 0 means the curve bends downward (a cap), which is a local maximum"}.`, predict: ix(f2 > 0 ? 0 : 1) },
        { id: "first-derivative", kind: "procedural", competency: HD, says: "f′ was used in place of f″; f′ is 0 at every critical point, so it cannot decide. Differentiate once more and put the point into f″.", predict: ix(2) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "second" ? `f″(x) = ${s.value}` : s.id === "value" ? `At x = ${N(Number(s.inputs[0]))}, f″ = ${N(Number(s.value))}` : `So: ${D2T_TEXT(Number(s.inputs[0]))}`),
    domain: [[0, 3], [-4, 4], [-4, 5], [-1, 1], [0, 1]],
    keep: (p) => d2tOk(p),
    cap: 300,
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 2 ? 2 : 3),
    teach: {
      idea: "At a critical point c (f′(c) = 0): if f″(c) < 0 the graph bends downward there, so c is a local maximum; if f″(c) > 0 it bends upward, a local minimum; if f″(c) = 0 the test gives no conclusion.",
      method: "Differentiate twice, substitute the critical point into f″, and read the sign. If f″(c) = 0, say the test fails and use the first-derivative test instead.",
      alternatives: [{ id: "cup_cap", title: "Cup or cap", kind: "conceptual", text: ["f″ > 0: the slope is increasing, like the bottom of a cup — a minimum.", "f″ < 0: the slope is decreasing, like the top of a cap — a maximum."] }],
    },
    limits: "Polynomials and ax + b/x with whole-number critical points; when f″(c) = 0 the further classification (first-derivative test) is not asked here.",
  },
  {
    id: "aqlarea",
    arity: 5,
    title: "Areas bounded by straight lines and the coordinate axes",
    competency: AREA,
    skill: "areas bounded by lines",
    type: "fraction",
    mc: true,
    // [kind, u, v, w, z]: 0 the line vx + uy = uv and the axes; 1 y = ux + v, the x-axis, x = w and x = z; 2 y = u(x − w), y = −v(x − z) and the x-axis
    parse: none,
    reject: (p) => (laOk(p) ? null : "A line and the axes, a line between two vertical lines, or two lines and the x-axis, with whole numbers."),
    prompt: (p) => {
      const [kind, u, v, w, z] = p;
      if (kind === 0) return `Using integration, find the area of the region bounded by the line ${laLine0(u, v)} and the coordinate axes.`;
      if (kind === 1) return `Using integration, find the area of the region bounded by the line y = ${pp([[u, 1], [v, 0]])}, the x-axis and the lines x = ${N(w)} and x = ${N(z)}.`;
      return `Using integration, find the area of the triangular region bounded by the lines y = ${pp([[u, 1], [-u * w, 0]])}, y = ${pp([[-v, 1], [v * z, 0]])} and the x-axis.`;
    },
    solve: (p) => {
      const ans = laAnswer(p);
      const [kind, u, v, w, z] = p;
      const setup = kind === 0 ? `∫₀^${u} ${v}(1 − x/${u}) dx` : kind === 1 ? (laCross(p) !== null ? `split at x = ${F(laCross(p)!)} where the line crosses the axis` : `∫ from ${N(w)} to ${N(z)} of |${pp([[u, 1], [v, 0]])}| dx`) : `∫ from ${N(w)} to ${F(laApex(p))} of the first line + ∫ from ${F(laApex(p))} to ${N(z)} of the second`;
      return { steps: [step("setup", "integrate", AREA, [kind, u, v, w, z], setup), step("evaluate", "evaluate", DEFI, [], ans)], answer: ans };
    },
    // independent: Simpson's rule on the height of the region (split at numerically found crossings), not the triangle formulas
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const [kind, u, vv, w, z] = p;
      const area = kind === 0 ? absArea((x) => vv * (1 - x / u), 0, u) : kind === 1 ? absArea((x) => u * x + vv, w, z) : simpson((x) => Math.max(0, Math.min(u * (x - w), -vv * (x - z))), w, z, 20000 * (z - w));
      return Math.abs(area - v) < 1e-6 * Math.max(1, v);
    },
    bugs: (p) => {
      const [kind, u, v, w, z] = p;
      const ans = laAnswer(p);
      if (kind === 0) return [{ id: "no-half", kind: "procedural", competency: DEFI, says: `∫₀^${u} ${v}(1 − x/${u}) dx = ${v}[x − x²/(${2 * u})]; the x² term was taken as x²/${u}, without the 2, which gives the rectangle ${u} × ${v}.`, predict: u * v } as Bug];
      if (kind === 1) {
        const out: Bug[] = [];
        const signed = Math.abs((u * (z * z - w * w)) / 2 + v * (z - w));
        if (laCross(p) !== null) out.push({ id: "signed", kind: "conceptual", competency: AREA, says: `The line crosses the x-axis at x = ${F(laCross(p)!)}; integrating straight through let the part below the axis cancel part of the area. Split at the crossing and add the sizes.`, predict: signed });
        if (laCross(p) === null && u * (w + z) / 2 + v < 0) out.push({ id: "negative", kind: "conceptual", competency: AREA, says: "The line lies below the x-axis here, so the integral came out negative and was given as it is; an area is the size of the region, so take the absolute value.", predict: -ans });
        if (w !== 0 && z > 0) out.push({ id: "from-zero", kind: "procedural", competency: DEFI, says: `The integral was taken from x = 0 instead of from x = ${N(w)}.`, predict: absAreaExact(u, v, 0, z) });
        return out.filter((b) => Math.abs((b.predict as number) - ans) > 1e-9);
      }
      const xa = laApex(p);
      const one = (u * (xa - w) ** 2) / 2;
      return [
        { id: "one-line", kind: "procedural", competency: AREA, says: `Only the part under the first line, from x = ${N(w)} to the meeting point x = ${F(xa)}, was found; beyond the meeting point the region lies under the second line.`, predict: one },
        { id: "no-half", kind: "procedural", competency: DEFI, says: "Each piece ∫ u(x − w) dx was evaluated without the ½ from integrating x, which doubles the area.", predict: 2 * ans },
      ].filter((b) => Math.abs(b.predict - ans) > 1e-9) as Bug[];
    },
    distractors: (p) => [laAnswer(p) + 1, laAnswer(p) / 2],
    variants: () => [],
    explain: (s) => (s.id === "setup" ? `Area = ${s.value}` : `Evaluating gives ${F(Number(s.value))} square units`),
    range: [0, Infinity],
    domain: [[0, 2], [-3, 8], [-6, 8], [-4, 4], [-3, 6]],
    keep: (p) => laOk(p),
    cap: 300,
    difficulty: ([kind, , , w]) => (kind === 0 ? 1 : kind === 1 && w >= 0 ? 2 : 3),
    teach: {
      idea: "The area between a curve and the x-axis is ∫ |y| dx; for straight lines the region is made of triangles and trapeziums, so integration must agree with ½ × base × height.",
      method: "Sketch the lines, find where they meet each other and the axes, split the interval at those points, write the height of the region on each part and integrate.",
      alternatives: [{ id: "geometry", title: "Check with a triangle", kind: "procedural", text: ["Find the corners of the region from where the lines meet.", "Its area by ½ × base × height (or two triangles) must equal the integral."] }],
    },
    limits: "Regions bounded by one or two straight lines, the x-axis or both axes, with whole-number data; regions between a line and a curve are other families.",
  },
  {
    id: "aqcarea",
    arity: 3,
    title: "Areas of regions bounded by a circle and a straight line",
    competency: AREA,
    skill: "areas bounded by circles",
    type: "exact",
    mc: true,
    // [kind, r, t]: 0 x² + y² = r² cut by x + y = r (t = 0 smaller part, 1 larger); 1 the sector between an axis and a line through O (t = 0 … 5);
    //               2 x² + y² = 4r² cut by x = r; 3 x² + y² = 2r² cut by x = r (t = 0 smaller part, 1 larger)
    parse: none,
    reject: (p) => (caOk(p) ? null : "A circle centred at the origin cut by a chord or by a line through the centre."),
    prompt: (p) => caPrompt(p),
    solve: (p) => {
      const [a, b, c] = caParts(p);
      const ans = piSurd(a, b, c);
      return { steps: [step("setup", "integrate", AREA, [p[0]], caSetup(p)), step("evaluate", "evaluate", DEFI, [], ans)], answer: ans };
    },
    // independent: the area in polar coordinates, ∫ ½(ρ_out² − ρ_in²) dθ, by Simpson's rule
    validate: (p, v) => {
      const val = valueOf(v);
      return Number.isFinite(val) && Math.abs(val - caPolar(p)) < 1e-7 * Math.max(1, Math.abs(val));
    },
    bugs: (p) => {
      const [kind, r, t] = p;
      const [a, b, c] = caParts(p);
      const out: Bug[] = [];
      const sm = caParts([kind, r, 0]);
      if (t === 1 && kind !== 1) out.push({ id: "smaller-part", kind: "procedural", competency: AREA, says: "The smaller part cut off by the line was found; the question asks for the larger part, which is the whole circle minus it.", predict: piSurd(...sm) });
      if (kind === 0 && t === 0) out.push({ id: "no-triangle", kind: "procedural", competency: AREA, says: `The area under the circle from 0 to ${r} (a quarter circle) was found, but the triangle under the line x + y = ${r} must be taken away.`, predict: piSurd(r * r / 4, 0, 0) });
      if ((kind === 2 || kind === 3) && t === 0) {
        const sector = kind === 2 ? piSurd((4 * r * r) / 3, 0, 0) : piSurd((r * r) / 2, 0, 0);
        out.push({ id: "sector-only", kind: "procedural", competency: AREA, says: "The sector cut off by the two radii to the ends of the chord was found; the triangle between those radii and the chord must be taken away to leave the segment.", predict: sector });
      }
      if (kind === 1) {
        out.push({ id: "quarter", kind: "conceptual", competency: AREA, says: "The whole quarter circle in the first quadrant was given; the line through the centre cuts it, and only the part between the line and the axis is asked for.", predict: piSurd((r * r) / 4, 0, 0) });
        const deg = CA_SECTOR_DEG[t];
        if (deg !== 45) out.push({ id: "other-axis", kind: "procedural", competency: AREA, says: `The angle between the line and the other axis (${90 - deg}°) was used; the region is between the line and the ${t % 2 ? "y" : "x"}-axis, an angle of ${deg}°.`, predict: piSurd(((90 - deg) / 360) * r * r, 0, 0) });
      }
      return out.filter((x) => x.predict !== piSurd(a, b, c));
    },
    distractors: (p) => {
      const [a, b, c] = caParts(p);
      return [piSurd(2 * a, 2 * b, 2 * c), piSurd(a, -b, -c), piSurd(a / 2, b / 2, c / 2)];
    },
    variants: () => [],
    explain: (s) => (s.id === "setup" ? `Area = ${s.value}` : `Evaluating gives ${s.value} square units`),
    range: [0, Infinity],
    domain: [[0, 3], [1, 12], [0, 5]],
    keep: (p) => caOk(p),
    difficulty: ([kind]) => (kind === 1 ? 1 : kind === 0 ? 2 : 3),
    teach: {
      idea: "Under the circle x² + y² = r² the height above the x-axis is √(r² − x²), and ∫ √(r² − x²) dx = (x/2)√(r² − x²) + (r²/2) sin⁻¹(x/r). A region cut off by a line is (area under the circle) minus (area under the line).",
      method: "Sketch the circle and the line, find where they meet, write the area as ∫ (upper boundary − lower boundary) dx between those points (using symmetry where it helps), and evaluate; keep π and surds exact.",
      alternatives: [{ id: "sector", title: "Sector minus triangle", kind: "conceptual", text: ["A chord cuts off a segment: the sector with angle θ (area ½r²θ) minus the triangle formed by the two radii (area ½r² sin θ).", "A line through the centre cuts off a sector, whose area is (angle ÷ 360°) × πr²."], visual: ([, r]) => ({ type: "circle", radius: `${r}` }) }],
    },
    limits: "Circles centred at the origin cut by x + y = r, by a vertical chord at half the radius or at r/√2, or by a line through the centre at 30°, 45° or 60°; circle–parabola regions are left out.",
  },
  {
    id: "aqivp",
    arity: 6,
    title: "Recovering a quantity from its rate of change and a starting value",
    competency: INDEF,
    skill: "antiderivative with an initial condition",
    type: "fraction",
    mc: true,
    // [kind, a, b, c, d, T]: 0 position from velocity at² + bt + c with s(0) = d; 1 cost from marginal cost ax + b with fixed cost 100d; 2 f′ = ax² + bx + c with f(1) = d, f(T)
    parse: none,
    reject: (p) => (ivpOk(p) ? null : "A polynomial rate with a whole-number starting value; whole-number answers."),
    prompt: ([kind, a, b, c, d, T]) =>
      kind === 0
        ? `A cycle moves along a straight road with velocity v(t) = ${pp([[a, 2], [b, 1], [c, 0]], "t")} m/s at time t seconds. At t = 0 it is ${d} m past a milestone. Find its distance past the milestone, in metres, at t = ${T}.`
        : kind === 1
          ? `A small workshop in Tiruppur finds that the marginal cost of making x shirts is C′(x) = ${pp([[a, 1], [b, 0]])} rupees per shirt, and its fixed cost (the cost when x = 0) is ₹${100 * d}. Find the total cost, in rupees, of making ${10 * T} shirts.`
          : `f′(x) = ${pp([[a, 2], [b, 1], [c, 0]])} and f(1) = ${N(d)}. Find f(${T}).`,
    solve: (p) => {
      const [kind, a, b, c, d, T] = p;
      const ans = ivpAnswer(p);
      const anti = kind === 1 ? pp([[a / 2, 2], [b, 1]]) : pp([[a / 3, 3], [b / 2, 2], [c, 1]], kind === 0 ? "t" : "x");
      const C = kind === 0 ? d : kind === 1 ? 100 * d : d - (a / 3 + b / 2 + c);
      return { steps: [step("antiderivative", "integrate", INDEF, [], `${anti} + C`), step("constant", "evaluate", DE, [kind === 2 ? 1 : 0], C), step("value", "evaluate", INDEF, [kind === 1 ? 10 * T : T], ans)], answer: ans };
    },
    // independent: the starting value plus Simpson's rule on the rate from the starting point
    validate: ([kind, a, b, c, d, T], v) => {
      if (typeof v !== "number") return false;
      const val = kind === 0 ? d + simpson((t) => a * t * t + b * t + c, 0, T, 200) : kind === 1 ? 100 * d + simpson((x) => a * x + b, 0, 10 * T, 200) : d + simpson((x) => a * x * x + b * x + c, 1, T, 200);
      return Math.abs(val - v) < 1e-7 * Math.max(1, Math.abs(v));
    },
    bugs: (p) => {
      const [kind, a, b, c, d, T] = p;
      const ans = ivpAnswer(p);
      const out: Bug[] = [];
      if (kind === 0) {
        if (d !== 0) out.push({ id: "constant-dropped", kind: "procedural", competency: INDEF, says: `The constant of integration was taken as 0; the starting position s(0) = ${d} m fixes it, so ${d} must be added.`, predict: ans - d });
        out.push({ id: "rate-for-amount", kind: "conceptual", competency: INDEF, says: "The velocity at the given time was found; the distance is recovered by integrating the velocity, not by evaluating it.", predict: a * T * T + b * T + c });
      } else if (kind === 1) {
        out.push({ id: "constant-dropped", kind: "procedural", competency: INDEF, says: `The fixed cost ₹${100 * d} was left out; C(0) = ${100 * d} gives the constant of integration.`, predict: ans - 100 * d });
        out.push({ id: "rate-for-amount", kind: "conceptual", competency: INDEF, says: "The marginal cost at that output was found; the total cost is found by integrating the marginal cost and adding the fixed cost.", predict: a * 10 * T + b });
      } else {
        out.push({ id: "constant-at-zero", kind: "procedural", competency: INDEF, says: `The given value was used as if it were f(0); f(1) = ${N(d)} means the constant C satisfies ${F(a / 3 + b / 2 + c)} + C = ${N(d)}.`, predict: (a * T ** 3) / 3 + (b * T * T) / 2 + c * T + d });
        out.push({ id: "rate-for-amount", kind: "conceptual", competency: INDEF, says: `f′(${T}) was found; f(${T}) needs the antiderivative of f′.`, predict: a * T * T + b * T + c });
      }
      return out.filter((x) => x.predict !== ans);
    },
    distractors: (p) => [ivpAnswer(p) + 1, ivpAnswer(p) * 2],
    variants: () => [],
    explain: (s) => (s.id === "antiderivative" ? `Integrate the rate: ${s.value}` : s.id === "constant" ? `Use the starting value at ${s.inputs[0] === 1 ? "x = 1" : "the start"}: C = ${F(Number(s.value))}` : `Substitute ${s.inputs[0]}: ${F(Number(s.value))}`),
    domain: [[0, 2], [0, 3], [-3, 6], [-4, 10], [-5, 20], [1, 6]],
    keep: (p) => ivpOk(p),
    cap: 300,
    difficulty: ([kind, a]) => (kind === 1 ? 1 : kind === 0 && a === 0 ? 1 : kind === 0 ? 2 : 3),
    teach: {
      idea: "If you know how fast a quantity changes, integrating the rate gives the quantity up to a constant; one known value (where it starts) fixes the constant.",
      method: "Find an antiderivative of the rate, add C, use the starting value to find C, then substitute the time (or amount) asked about.",
      alternatives: [{ id: "net_change", title: "Start plus net change", kind: "conceptual", text: ["The amount at the end = the amount at the start + ∫ (rate) over the time in between.", "So s(T) = s(0) + ∫₀ᵀ v(t) dt."] }],
    },
    limits: "Polynomial rates of degree at most 2 with whole-number answers; rates involving exponentials or trigonometric functions are left out.",
  },
  {
    id: "aqsolset",
    arity: 8,
    title: "The solution set of a system with infinitely many solutions",
    competency: SC,
    skill: "parametric solution set",
    type: "tuple",
    mc: true,
    // [a, b, c, e, x0, y0, m, k]: rows (1, a, b), (c, 1 + ac, e), m·row1 + k·row2; the solutions (x0, y0, 0) + t·(row1 × row2)
    parse: none,
    reject: (p) => (ssOk(p) ? null : "Two independent equations and a combination of them, with whole-number solutions."),
    prompt: (p) => {
      const { A, B } = ssSys(p);
      return `The system ${eqn(A[0], B[0])}, ${eqn(A[1], B[1])}, ${eqn(A[2], B[2])} has infinitely many solutions. Taking z = t, write every solution as x = p + qt, y = r + st, z = t. Type (p, q, r, s).`;
    },
    solve: (p) => {
      const [, , , , x0, y0] = p;
      const D = ssDir(p);
      const ans = `(${N(x0)}, ${N(D[0])}, ${N(y0)}, ${N(D[1])})`;
      return { steps: [step("rank", "classify", RANK, [], "ρ(A) = ρ([A | B]) = 2 < 3"), step("reduce", "eliminate", MSYS, [], "keep two independent equations, put z = t"), step("solve", "solve", SC, [], ans)], answer: ans };
    },
    // independent: substitute the answer back into all three equations for several values of t
    validate: (p, v) => {
      const t = readTuple(v);
      if (!t || t.length !== 4) return false;
      const { A, B } = ssSys(p);
      return [0, 1, -2, 3.5].every((tt) => A.every((r, i) => Math.abs(r[0] * (t[0] + t[1] * tt) + r[1] * (t[2] + t[3] * tt) + r[2] * tt - B[i]) < 1e-9));
    },
    bugs: (p) => {
      const [, , , , x0, y0] = p;
      const D = ssDir(p);
      const out: Bug[] = [];
      if (D[0] !== 0 || D[1] !== 0) out.push({ id: "move-sign", kind: "procedural", competency: MSYS, says: "The terms in t were moved to the right-hand side without changing their sign, which reverses the direction of the line of solutions.", predict: `(${N(x0)}, ${N(-D[0])}, ${N(y0)}, ${N(-D[1])})` });
      if (D[0] !== y0) out.push({ id: "order", kind: "procedural", competency: SC, says: "The numbers were typed in the order x-constant, y-constant, x-coefficient, y-coefficient; the answer asks for (p, q, r, s) with x = p + qt and y = r + st.", predict: `(${N(x0)}, ${N(y0)}, ${N(D[0])}, ${N(D[1])})` });
      return out;
    },
    distractors: ([, , , , x0, y0]) => [`(${N(x0)}, 0, ${N(y0)}, 0)`, `(${N(y0)}, 1, ${N(x0)}, 1)`],
    variants: () => [],
    explain: (s) => (s.id === "rank" ? `By row reduction, ${s.value}: infinitely many solutions` : s.id === "reduce" ? `${s.value[0].toUpperCase()}${String(s.value).slice(1)}` : `Solve for x and y in terms of t: ${s.value}`),
    domain: [[-2, 2], [-2, 2], [1, 2], [-2, 2], [-2, 3], [-2, 3], [1, 2], [-1, 1]],
    keep: (p) => ssOk(p),
    cap: 300,
    difficulty: ([a, b, , e]) => (a === 0 || b === 0 ? 1 : e === 0 ? 2 : 3),
    teach: {
      idea: "When ρ(A) = ρ([A | B]) = 2 for three unknowns, one equation is a combination of the others and one unknown is free; the solutions form a line, described by one parameter.",
      method: "Keep two independent equations, put z = t, move the t terms to the right-hand side (changing their sign), and solve the two equations for x and y in terms of t.",
      alternatives: [{ id: "check", title: "Check with two values of t", kind: "procedural", text: ["Put t = 0 and t = 1 into your x, y, z.", "Both points must satisfy all three equations."] }],
    },
    limits: "Systems of rank 2 whose solutions have whole-number coefficients, with z as the free unknown; systems of rank 1 are left out.",
  },
  {
    id: "aqtann",
    arity: 6,
    title: "Tangents and normals to a curve, and the angle between two curves",
    competency: APP,
    skill: "tangents, normals and angles between curves",
    type: "exact",
    mc: true,
    // [kind, d, a, b, c, x0]: 0 tangent, 1 normal to y = dx³ + ax² + bx + c at x = x0; 2 tan θ between y = ax² + c and y = c + (a + b)x0² − bx² where they meet at x = x0 > 0
    parse: none,
    reject: (p) => (tnOk(p) ? null : "A cubic or quadratic with small whole coefficients at a whole-number point, or two parabolas meeting at x = x₀."),
    prompt: (p) => {
      const [kind, d, a, b, c, x0] = p;
      if (kind === 2) return `The curves y = ${pp([[a, 2], [c, 0]])} and y = ${pp([[-b, 2], [c + (a + b) * x0 * x0, 0]])} meet at a point with x = ${x0}. Find tan θ, where θ is the acute angle between the curves there (the angle between their tangents).`;
      return `Find the equation of the ${kind ? "normal" : "tangent"} to the curve y = ${pp([[d, 3], [a, 2], [b, 1], [c, 0]])} at the point where x = ${N(x0)}. Write it as y = mx + k and type the right-hand side.`;
    },
    solve: (p) => {
      const [kind, d, a, b, c, x0] = p;
      if (kind === 2) {
        const m1 = 2 * a * x0;
        const m2 = -2 * b * x0;
        const ans = F(Math.abs((m1 - m2) / (1 + m1 * m2)));
        return { steps: [step("slopes", "differentiate", RULES, [x0], `${N(m1)}, ${N(m2)}`), step("angle", "evaluate", APP, [m1, m2], ans)], answer: ans };
      }
      const y0 = d * x0 ** 3 + a * x0 * x0 + b * x0 + c;
      const m = 3 * d * x0 * x0 + 2 * a * x0 + b;
      const ans = tnLine(kind, m, x0, y0);
      return { steps: [step("point", "evaluate", APP, [x0], y0), step("slope", "differentiate", RULES, [x0], m), step("line", "write", APP, [kind ? F(-1 / m) : m], ans)], answer: ans };
    },
    // independent: the answer line checked against the curve (it passes through the point; its slope matches a central-difference slope, or is perpendicular to it); the angle from slopes found numerically at a numerically found meeting point
    validate: (p, v) => {
      const [kind, d, a, b, c, x0] = p;
      if (kind === 2) {
        const g = (x: number) => a * x * x + c - (c + (a + b) * x0 * x0 - b * x * x);
        let [lo, hi] = [1e-9, 50];
        for (let i = 0; i < 200; i++) {
          const mid = (lo + hi) / 2;
          if (g(lo) * g(mid) <= 0) hi = mid;
          else lo = mid;
        }
        const X = (lo + hi) / 2;
        const t1 = Math.atan(d1((x) => a * x * x + c, X));
        const t2 = Math.atan(d1((x) => c + (a + b) * x0 * x0 - b * x * x, X));
        let th = Math.abs(t1 - t2);
        if (th > Math.PI / 2) th = Math.PI - th;
        const val = valueOf(v);
        return Number.isFinite(val) && Math.abs(val - Math.tan(th)) < 1e-6 * Math.max(1, val);
      }
      const f = (x: number) => d * x ** 3 + a * x * x + b * x + c;
      const ys = [x0, x0 + 1, x0 + 2.5].map((x) => valAt(v, x));
      if (ys.some((y) => !Number.isFinite(y)) || Math.abs(ys[0] - f(x0)) > 1e-9) return false;
      const slope = ys[1] - ys[0];
      if (Math.abs((ys[2] - ys[0]) / 2.5 - slope) > 1e-9) return false;
      const fs = d1(f, x0, 1e-4);
      return kind === 0 ? Math.abs(slope - fs) < 1e-6 : Math.abs(slope * fs + 1) < 1e-6;
    },
    bugs: (p) => {
      const [kind, d, a, b, c, x0] = p;
      if (kind === 2) {
        const m1 = 2 * a * x0;
        const m2 = -2 * b * x0;
        return [
          { id: "plus-minus", kind: "recall", competency: APP, says: "The formula was used with 1 − m₁m₂ in the denominator; tan θ = |(m₁ − m₂)/(1 + m₁m₂)|.", predict: F(Math.abs((m1 - m2) / (1 - m1 * m2))) },
          { id: "one-slope", kind: "conceptual", competency: APP, says: "Only the slope of the first curve was given; the angle between the curves depends on both tangent slopes.", predict: F(m1) },
        ] as Bug[];
      }
      const y0 = d * x0 ** 3 + a * x0 * x0 + b * x0 + c;
      const m = 3 * d * x0 * x0 + 2 * a * x0 + b;
      const right = tnLine(kind, m, x0, y0);
      const out: Bug[] = [];
      if (kind === 0) {
        out.push({ id: "through-origin", kind: "procedural", competency: APP, says: `The slope ${N(m)} was found but the line was written as y = ${N(m)}x, through the origin; it must pass through (${N(x0)}, ${N(y0)}).`, predict: pa([[m, 1]]) });
        out.push({ id: "intercept-sign", kind: "procedural", competency: APP, says: `In y − y₁ = m(x − x₁), the term −m·x₁ was added instead of subtracted.`, predict: pa([[m, 1], [y0 + m * x0, 0]]) });
      } else {
        out.push({ id: "tangent-for-normal", kind: "conceptual", competency: APP, says: "The tangent was given; the normal is perpendicular to it, so its slope is −1/m.", predict: tnLine(0, m, x0, y0) });
        if (Math.abs(m) !== 1) out.push({ id: "negative-only", kind: "procedural", competency: APP, says: `The normal's slope was taken as −m = ${N(-m)}; perpendicular slopes multiply to −1, so it is −1/m = ${F(-1 / m)}.`, predict: pa([[-m, 1], [y0 + m * x0, 0]]) });
        out.push({ id: "reciprocal-only", kind: "procedural", competency: APP, says: `The normal's slope was taken as 1/m = ${F(1 / m)}; the minus sign was lost (perpendicular slopes multiply to −1).`, predict: pa([[1 / m, 1], [y0 - x0 / m, 0]]) });
      }
      return out.filter((x) => x.predict !== right);
    },
    distractors: (p) => {
      const [kind, d, a, b, c, x0] = p;
      if (kind === 2) return [F(2 * (a + b) * x0), F((4 * a * b * x0 * x0 - 1) / (2 * (a + b) * x0))];
      const y0 = d * x0 ** 3 + a * x0 * x0 + b * x0 + c;
      const m = 3 * d * x0 * x0 + 2 * a * x0 + b;
      const sl = kind ? -1 / m : m;
      const k = y0 - sl * x0;
      return [pa([[sl, 1], [y0, 0]]), pa([[sl + 1, 1], [y0 - (sl + 1) * x0, 0]]), pa([[sl, 1], [k + 1, 0]]), pa([[sl, 1], [k - 2, 0]]), pa([[-sl, 1], [k, 0]])];
    },
    variants: () => [],
    explain: (s) => (s.id === "point" ? `At x = ${N(Number(s.inputs[0]))}, y = ${N(Number(s.value))}` : s.id === "slope" ? `dy/dx at x = ${N(Number(s.inputs[0]))} is ${N(Number(s.value))}` : s.id === "line" ? `y − y₁ = m(x − x₁) with slope ${s.inputs[0]}: y = ${s.value}` : s.id === "slopes" ? `The tangent slopes at x = ${s.inputs[0]} are ${s.value}` : `tan θ = |(m₁ − m₂)/(1 + m₁m₂)| = ${s.value}`),
    range: (p) => (p[0] === 2 ? [0, Infinity] : null),
    domain: [[0, 2], [0, 1], [-3, 3], [-4, 4], [-5, 5], [-2, 3]],
    keep: (p) => tnOk(p),
    cap: 400,
    difficulty: ([kind, d]) => (kind === 0 && d === 0 ? 1 : kind === 2 ? 3 : 2),
    teach: {
      idea: "The tangent at a point has slope dy/dx there; the normal is perpendicular to it, with slope −1/(dy/dx). The angle between two curves where they meet is the angle between their tangents there.",
      method: "Find the point (x₁, y₁) and the slope m = f′(x₁). Tangent: y − y₁ = m(x − x₁); normal: y − y₁ = −(1/m)(x − x₁). For two curves, find both slopes m₁, m₂ at the meeting point and use tan θ = |(m₁ − m₂)/(1 + m₁m₂)|.",
      alternatives: [{ id: "picture", title: "Draw the slopes", kind: "conceptual", text: ["The tangent just touches the curve and has the curve's steepness at that point.", "Turning it through a right angle about the point gives the normal."] }],
    },
    limits: "Polynomial curves of degree at most 3 at whole-number points, and pairs of parabolas symmetric about the y-axis; vertical tangents and curves in parametric form are left out.",
  },
  {
    id: "aqdecl",
    arity: 2,
    title: "Ordinary or partial, linear or non-linear: classifying a differential equation",
    competency: DE,
    skill: "classifying differential equations",
    type: "choice",
    // [t, a]: template t of DECL with the whole number a in it
    parse: none,
    reject: ([t, a]) => (t >= 0 && t < DECL.length && a >= 1 && a <= 5 ? null : "One of the equation templates with a from 1 to 5."),
    prompt: ([t, a]) => `Classify the differential equation ${DECL[t].text(a)}${DECL[t].partial ? ", where u is a function of x and y (or of x and t)" : ""}.`,
    choices: (p) => declChoices(p),
    solve: (p) => {
      const d = DECL[p[0]];
      const label = (d.partial ? 2 : 0) + (d.nonlinear ? 1 : 0);
      return { steps: [step("kind", "classify", DE, [], d.partial ? "partial derivatives: partial" : "only d/dx: ordinary"), step("linear", "classify", DE, [], d.nonlinear ? `non-linear (${d.why})` : "linear: the unknown and its derivatives appear only to the first power, never multiplied together or inside a function"), step("pick", "classify", DE, [], declChoices(p).indexOf(DECL_LABELS[label]))], answer: declChoices(p).indexOf(DECL_LABELS[label]) };
    },
    // independent: read the equation's term list (each term's derivative type, its power and what multiplies it) and classify it from that
    validate: (p, v) => {
      const terms = DECL[p[0]].terms;
      const partial = terms.some((t) => t.d === "p");
      const nonlinear = terms.some((t) => t.pow > 1 || t.times > 0 || t.fn);
      return declChoices(p)[v as number] === DECL_LABELS[(partial ? 2 : 0) + (nonlinear ? 1 : 0)];
    },
    bugs: (p) => {
      const d = DECL[p[0]];
      const cs = declChoices(p);
      const ix = (partial: boolean, nonlinear: boolean) => cs.indexOf(DECL_LABELS[(partial ? 2 : 0) + (nonlinear ? 1 : 0)]);
      const out: Bug[] = [];
      if (!d.nonlinear && d.varCoef) out.push({ id: "coefficient-nonlinear", kind: "conceptual", competency: DE, says: `The coefficient (${d.varCoef}) was taken to make the equation non-linear; coefficients may depend on the independent variable. Linearity is about the unknown function and its derivatives only.`, predict: ix(d.partial, true) });
      if (d.nonlinear) out.push({ id: "missed-nonlinear", kind: "conceptual", competency: DE, says: `The term that makes it non-linear (${d.why}) was missed; the unknown function and its derivatives must appear only to the first power and not multiplied together.`, predict: ix(d.partial, false) });
      if (d.partial) out.push({ id: "curly-d", kind: "recall", competency: DE, says: "∂ was read as an ordinary d; ∂ means a partial derivative, so the unknown depends on more than one variable and the equation is partial.", predict: ix(false, d.nonlinear) });
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "pick" ? `So the answer is option ${"ABCD"[Number(s.value)]}` : String(s.value)),
    domain: [[0, 23], [1, 5]],
    difficulty: ([t]) => (DECL[t].varCoef || (DECL[t].nonlinear && DECL[t].why.includes("multiplied")) ? 3 : DECL[t].partial ? 2 : 1),
    teach: {
      idea: "An ordinary differential equation has one independent variable (derivatives d/dx); a partial one has several (∂/∂x, ∂/∂y). It is linear when the unknown and its derivatives appear only to the first power, are not multiplied together and are not inside functions such as sin or e^( ).",
      method: "First look at the derivative signs: d means ordinary, ∂ means partial. Then check every term containing the unknown: a square, a product of the unknown with a derivative, or a function of the unknown makes it non-linear; coefficients that depend only on x do not.",
      alternatives: [{ id: "test", title: "The superposition test", kind: "conceptual", text: ["For a linear equation with right side 0, the sum of two solutions is again a solution.", "Terms like y², y dy/dx or sin y break this, which is what non-linear means."] }],
    },
    limits: "Twenty-four equation patterns with one whole-number coefficient; order and degree are another family.",
  },
  {
    id: "aqsubsep",
    arity: 4,
    title: "dy/dx = f(ax + y + c) by a substitution that separates the variables",
    competency: DE,
    skill: "reducible to variables separable",
    type: "expression",
    mc: true,
    // [m, c, k, s]: dy/dx = (mx + y + c)² + k² − m, y(0) = sk − c; v = mx + y + c gives dv/dx = v² + k²
    parse: none,
    reject: ([m, c, k, s]) => (m < -3 || m > 3 || c < -3 || c > 3 || k < 1 || k > 3 || s < -1 || s > 1 || k * k - m === 0 ? "dy/dx = (mx + y + c)² + (k² − m) with y(0) = sk − c." : null),
    prompt: (p) => `Solve dy/dx = ${ssubRhs(p)}, given that y = ${N(p[2] * p[3] - p[1])} when x = 0, by a substitution that makes the variables separable. Write y in terms of x.`,
    solve: (p) => {
      const [m, c, k] = p;
      const ans = ssubAnswer(p);
      return { steps: [step("substitute", "substitute", DE, [`v = ${ssubV(m, c)}`], `dv/dx = ${N(m)} + dy/dx = v² + ${k * k}`), step("separate", "integrate", INDEF, [k], `(1/${k}) tan⁻¹(v/${k}) = x + C`), step("constant", "evaluate", DE, [p[3]], ans)], answer: ans };
    },
    // independent: a Runge–Kutta solution from x = 0 (short range, before the tangent blows up)
    validate: ([m, c, k, s], v) => solvesIvp(v, (x, y) => (m * x + y + c) ** 2 + k * k - m, 0, s * k - c, [0.05 / k, 0.1 / k, 0.18 / k]),
    bugs: (p) => {
      const [m, c, k, s] = p;
      const out: Bug[] = [
        { id: "v-for-y", kind: "procedural", competency: DE, says: `The answer was left in terms of v; v = ${ssubV(m, c)}, so y is found by taking the other terms of v away from it.`, predict: ssubTan(k, s) },
        { id: "back-sign", kind: "procedural", competency: DE, says: `When going back from v to y, the other terms of v = ${ssubV(m, c)} were added to v instead of being taken away.`, predict: ssubBack(p) },
      ];
      if (s !== 0) out.push({ id: "constant-dropped", kind: "procedural", competency: DE, says: `The constant of integration was taken as 0; at x = 0, v = ${N(s * k)}, so tan⁻¹(v/${k}) = ${s > 0 ? "π/4" : "−π/4"} there.`, predict: ssubAnswer([m, c, k, 0]) });
      return out.filter((x) => (m !== 0 || c !== 0 || x.id !== "back-sign") && x.predict !== ssubAnswer(p));
    },
    distractors: (p) => {
      const a = ssubAnswer(p);
      return [`−(${a})`, `${a} + 1`];
    },
    variants: () => [],
    explain: (s) => (s.id === "substitute" ? `Put ${s.inputs[0]}: ${s.value}` : s.id === "separate" ? `Separate: dv/(v² + ${Number(s.inputs[0]) ** 2}) = dx, so ${s.value}` : `Use the starting value and go back to y: y = ${s.value}`),
    domain: [[-3, 3], [-3, 3], [1, 3], [-1, 1]],
    cap: 300,
    difficulty: ([m, c, , s]) => (s === 0 && (m === 0 || c === 0) ? 1 : s === 0 ? 2 : 3),
    teach: {
      idea: "When dy/dx is a function of one combination v = ax + y + c, that combination is the natural new unknown: dv/dx = a + dy/dx depends on v alone, so the variables separate.",
      method: "Put v = mx + y + c, so dy/dx = dv/dx − m. Rewrite the equation as dv/dx = g(v), separate and integrate (here ∫ dv/(v² + k²) = (1/k) tan⁻¹(v/k)), use the starting value, and finally write y = v − mx − c.",
      alternatives: [{ id: "check", title: "Check by differentiating", kind: "procedural", text: ["Differentiate your y and compute (mx + y + c)² + k² − m with it.", "They must agree, and y(0) must be the given value."] }],
    },
    limits: "Equations dy/dx = (mx + y + c)² + (k² − m) whose solutions involve tan; other substitutions (homogeneous, Bernoulli) are other families.",
  },
  {
    id: "aqbinmod",
    arity: 4,
    title: "Binary operations modulo n, by a table and on matrices",
    competency: BIN,
    skill: "binary operations on finite sets, tables and matrices",
    type: "choice",
    // [kind, n, op, k]: 0 an operation modulo n on {0, …, n − 1}; 1 closure modulo n on {1, …, n − 1}; 2 a table on three letters (op = base table, k = relabelling); 3 an operation on 2 × 2 matrices
    parse: none,
    reject: (p) => (bmOk(p) ? null : "An operation modulo n (3 ≤ n ≤ 12), a table on three elements, or an operation on 2 × 2 matrices."),
    prompt: (p) => bmPrompt(p),
    figure: (p) => (p[0] === 2 ? bmFigure(p) : null),
    choices: (p) => bmChoices(p),
    solve: (p) => {
      const cat = bmCat(p);
      const cs = bmChoices(p);
      const label = p[0] === 1 ? BM_CLOSE[cat] : BIN_CHOICES[cat];
      return { steps: [step("rule", "classify", BIN, [p[0]], bmReason(p)), step("decide", "classify", BIN, [], cs.indexOf(label))], answer: cs.indexOf(label) };
    },
    // independent: every pair and triple of elements checked (the matrices at several sample matrices)
    validate: (p, v) => {
      const cs = bmChoices(p);
      const label = cs[v as number];
      if (!label) return false;
      if (p[0] === 1) {
        const [, n, op] = p;
        const S = range(1, n - 1);
        const closed = S.every((a) => S.every((b) => S.includes(op === 0 ? (a * b) % n : (a + b) % n)));
        return label === BM_CLOSE[closed ? 0 : 1];
      }
      const { elems, op, eq } = bmBrute(p);
      const comm = elems.every((a) => elems.every((b) => eq(op(a, b), op(b, a))));
      const assoc = elems.every((a) => elems.every((b) => elems.every((c) => eq(op(op(a, b), c), op(a, op(b, c))))));
      return label === BIN_CHOICES[comm && assoc ? 0 : comm ? 1 : assoc ? 2 : 3];
    },
    bugs: (p) => {
      const cat = bmCat(p);
      const cs = bmChoices(p);
      if (p[0] === 1) {
        const n = p[1];
        return [
          cat === 1
            ? { id: "zero-missed", kind: "conceptual", competency: BIN, says: `Every answer modulo ${n} lies between 0 and ${n - 1}, so the set was taken to be closed; but 0 is not in S, and ${p[2] === 0 ? `${bmZeroPair(n)} gives 0` : `1 ∗ ${n - 1} gives 0`}.`, predict: cs.indexOf(BM_CLOSE[0]) }
            : { id: "zero-feared", kind: "conceptual", competency: BIN, says: `It was assumed some product of non-zero remainders gives 0; for a prime n = ${n} that never happens, so every product lies in S.`, predict: cs.indexOf(BM_CLOSE[1]) },
        ] as Bug[];
      }
      const ix = (c: number) => cs.indexOf(BIN_CHOICES[c]);
      return [
        cat === 0
          ? { id: "looks-complicated", kind: "conceptual", competency: BIN, says: "The rule (or table) was assumed not to be associative because it looked complicated; checking (a ∗ b) ∗ c = a ∗ (b ∗ c) shows it is.", predict: ix(1) }
          : cat === 1
            ? { id: "comm-implies-assoc", kind: "conceptual", competency: BIN, says: "Commutative was taken to mean associative as well; associativity must be checked separately, with three elements.", predict: ix(0) }
            : cat === 2
              ? { id: "not-comm-not-assoc", kind: "conceptual", competency: BIN, says: "Because ∗ is not commutative it was assumed not associative either; check (a ∗ b) ∗ c = a ∗ (b ∗ c) on its own.", predict: ix(3) }
              : { id: "equal-test", kind: "procedural", competency: BIN, says: "Commutativity was checked only with a = b, where a ∗ b = b ∗ a always holds; try two different elements.", predict: ix(1) },
      ] as Bug[];
    },
    variants: () => [],
    explain: (s) => (s.id === "rule" ? String(s.value) : `So the true statement is option ${"ABCD"[Number(s.value)]}`),
    domain: [[0, 3], [0, 12], [0, 7], [0, 11]],
    keep: (p) => bmOk(p),
    cap: 300,
    difficulty: ([kind, , op]) => (kind === 1 ? 2 : kind === 2 ? (op <= 1 ? 2 : 3) : kind === 3 ? 2 : op <= 1 ? 1 : 3),
    teach: {
      idea: "∗ is a binary operation on S when a ∗ b is in S for every a, b in S (closure). It is commutative when a ∗ b = b ∗ a for all a, b, and associative when (a ∗ b) ∗ c = a ∗ (b ∗ c) for all a, b, c. For a finite set the table shows everything: commutative means the table is symmetric about its leading diagonal.",
      method: "For closure, look for a pair whose answer falls outside S. For commutativity, swap a and b (or compare the table with its mirror image). For associativity, work out both groupings — with letters for a rule, with all triples (or a counter-example) for a table; matrix multiplication is associative but not commutative.",
      alternatives: [{ id: "counterexample", title: "One counter-example is enough", kind: "procedural", text: ["To show a property fails, give one pair (or triple) of actual elements where the two sides differ.", "To show it holds, you must argue for all elements — for a small table, check every case."] }],
    },
    limits: "Rules modulo n up to 12, tables on three elements built from a few standard operations, and five operations on 2 × 2 matrices; identity elements in tables are left out.",
  },
];

// ---------------------------------------------------------------- family-specific helpers (hoisted functions)

function symA([u, v, w, x, y, z]: number[]): number[][] {
  const m = (t: number, n: number) => ((t % n) + n) % n;
  return [
    [1 + m(u + v, 4), u, w],
    [v, -m(w + x, 3), y],
    [x, z, 2 + m(y + z, 3)],
  ];
}
function fpOk([kind, k, q, c]: number[]): boolean {
  if (k < 1 || k > 6 || q < -5 || q > 5 || c < -5 || c > 5) return false;
  if (kind === 0) return k <= 4 && (q + c) % 3 === 0;
  if (kind === 1) return q >= -2 && c === 0;
  if (kind === 2) return q >= 0 && c === 0;
  if (kind === 3) return k <= 4 && c === 0;
  if (kind === 4) return k <= 4 && q === 0 && (c === 0 || c === 1);
  return false;
}
function fpText([kind, k, q, c]: number[]): string {
  const sh = q === 0 ? "x" : `x${sg(q)}`;
  if (kind === 0) return pp([[k, 2], [q, 1], [c, 0]]);
  if (kind === 1) return q === 0 ? `${k}/x` : `${k}/(${sh})`;
  if (kind === 2) return `${k === 1 ? "" : k}${q === 0 ? "√x" : `√(${sh})`}`;
  if (kind === 3) return pp([[k, 3], [q, 1]]);
  return `${c ? "cos" : "sin"} ${kx(k)}`;
}
function fpAnswerText([kind, k, q, c]: number[]): string {
  const sh = q === 0 ? "x" : `x${sg(q)}`;
  if (kind === 0) return pa([[k, 2], [q, 1], [c, 0]]);
  if (kind === 1) return q === 0 ? `${k}/x` : `${k}/(${sh})`;
  if (kind === 2) return `${k === 1 ? "" : k}${q === 0 ? "√x" : `√(${sh})`}`;
  if (kind === 3) return pa([[k, 3], [q, 1]]);
  return `${c ? "cos" : "sin"}(${kx(k)})`;
}
function fpFn([kind, k, q, c]: number[]): (x: number) => number {
  if (kind === 0) return (x) => k * x * x + q * x + c;
  if (kind === 1) return (x) => k / (x + q);
  if (kind === 2) return (x) => k * Math.sqrt(x + q);
  if (kind === 3) return (x) => k * x ** 3 + q * x;
  return c ? (x) => Math.cos(k * x) : (x) => Math.sin(k * x);
}
function fpAnswer([kind, k, q, c]: number[]): string {
  const sh = q === 0 ? "x" : `x${sg(q)}`;
  if (kind === 0) return pa([[2 * k, 1], [q, 0]]);
  if (kind === 1) return q === 0 ? `−${k}/x^2` : `−${k}/(${sh})^2`;
  if (kind === 2) {
    const r = q === 0 ? "√x" : `√(${sh})`;
    return k % 2 === 0 ? `${k / 2}/${r}` : `${k}/(2${r})`;
  }
  if (kind === 3) return pa([[3 * k, 2], [q, 0]]);
  return c ? `−${k === 1 ? "" : k}sin(${kx(k)})` : `${k === 1 ? "" : k}cos(${kx(k)})`;
}
function velOk([a, b, c, t0]: number[]): boolean {
  if (a < 0 || a > 2 || b < -3 || b > 5 || c < 0 || c > 12 || t0 < 1 || t0 > 5) return false;
  if (a === 0 && b === 0) return false;
  const s = (t: number) => a * t ** 3 + b * t * t + c * t;
  for (let t = 0.25; t <= t0; t += 0.25) if (s(t) <= 0) return false;
  return 3 * a * t0 * t0 + 2 * b * t0 + c > 0;
}
function rrOk([kind, x0, r, e]: number[]): boolean {
  if (x0 < 2 || x0 > 12 || r < 1 || r > 5 || e < 1 || e > 20) return false;
  if (kind <= 2) return e === 1;
  if (kind === 3) return e % 4 === 0 && (x0 + e) % 2 === 0;
  if (kind === 4) return e >= 3 && e % 3 === 0 && (x0 + e) % 2 === 0;
  return false;
}
function rrAnswer(kind: number, x0: number, r: number, e: number): number {
  return [3 * x0 * x0 * r, 12 * x0 * r, 2 * x0 * r, 2 * r * x0 + e, -r * e + x0 * (r + 1)][kind];
}
function areaOk([kind, u, v, w]: number[]): boolean {
  if (u < 1 || u > 4 || v < 1 || v > 9 || w < 1 || w > 4) return false;
  if (kind === 0) return w === 1;
  if (kind === 1) return v <= 4;
  if (kind === 2) return u <= 3 && v > u && w === 1;
  return false;
}
function areaAnswer([kind, u, v, w]: number[]): string {
  if (kind === 0) {
    const [s, m] = sqfree(u * v);
    return surdQ((8 * v * s) / 3, m);
  }
  if (kind === 1) return fmt((u * (v ** 4 + w ** 4)) / 4);
  return fmt((4 * u ** 3 + v ** 3 - 3 * u * u * v) / 3);
}
function contOk([kind, u, v, w, z]: number[]): boolean {
  if (u < 1 || u > 6) return false;
  if (kind === 0) return u <= 3 && v >= -3 && v <= 3 && w >= 1 && w <= 3 && z >= -3 && z <= 3 && (v + z) % 3 === 0;
  if (kind === 1) return v >= 1 && v <= 6 && w === 0 && z === 0;
  if (kind === 2 || kind === 3) return v >= 1 && v <= 4 && w === 0 && z === 0;
  if (kind === 4) return v === 0 && w === 0 && z === 0;
  return false;
}
function contAnswer([kind, u, v, w, z]: number[]): number {
  if (kind === 0) return (w * u * u + z - v) / u;
  if (kind === 1) return u / v;
  if (kind === 2) return (u * u) / (2 * v);
  if (kind === 3) return u / (2 * v);
  return 3 * u * u;
}
function concText(kind: number, al: number, be: number, p: number): string {
  return kind === 0 ? pp([[1, 4], [-2 * (al + be), 3], [6 * al * be, 2], [p, 1]]) : pp([[1, 3], [-3 * al, 2], [p, 1]]);
}
/** The odd parts for aqodd: [as printed, function]. */
const ODD: [string, (x: number) => number][] = [
  ["x³ cos x", (x) => x ** 3 * Math.cos(x)],
  ["sin⁵ x", (x) => Math.sin(x) ** 5],
  ["x e^(x²)", (x) => x * Math.exp(x * x)],
  ["x⁵ √(1 + x²)", (x) => x ** 5 * Math.sqrt(1 + x * x)],
  ["x cos² x", (x) => x * Math.cos(x) ** 2],
];
/** The integrands for aqking with s = a + b: [as printed, function]. */
const KING: [(s: number) => string, (x: number, s: number) => number][] = [
  [(s) => `√x/(√x + √(${s} − x))`, (x, s) => Math.sqrt(x) / (Math.sqrt(x) + Math.sqrt(s - x))],
  [(s) => `x²/(x² + (${s} − x)²)`, (x, s) => (x * x) / (x * x + (s - x) ** 2)],
  [(s) => `x³/(x³ + (${s} − x)³)`, (x, s) => x ** 3 / (x ** 3 + (s - x) ** 3)],
  [(s) => `log x/(log x + log(${s} − x))`, (x, s) => Math.log(x) / (Math.log(x) + Math.log(s - x))],
  [(s) => `eˣ/(eˣ + e^(${s} − x))`, (x, s) => Math.exp(x) / (Math.exp(x) + Math.exp(s - x))],
];
function sepExpo(p: number, q: number): string {
  return sum([[p / 2, "x²"], [q, "x"]]);
}
/** x to a whole power, written with superscripts: x, x³, x⁻². */
const xp1 = (p: number) => (p === 1 ? "x" : `x${sup(p)}`);
function sepAnswer(kind: number, p: number, q: number, y0: number): string {
  if (kind === 0) return `${y0 === 1 ? "" : y0}${sepExpo(p, q) === "x" ? "e^x" : `e^(${sepExpo(p, q)})`}`;
  return `${y0 === 1 ? "" : y0}${xp1(p)}`;
}
function odeTerms([n, pw, m]: number[]): [number, number][] {
  return [[n, pw], [n - 1, m]];
}
function odeText([n, pw, m, r]: number[]): string {
  const hi = DP(n, pw);
  const lo = DP(n - 1, m);
  const extra = r === 0 ? (n === 1 ? "x" : "y") : r === 1 ? "sin x" : "eˣ";
  if (r === 0) return `${hi} + ${lo} + ${extra} = 0`;
  if (r === 1) return `${lo} + ${hi} = ${extra}`;
  return `${hi} − ${lo} = ${extra}`;
}
function homOk([kind, k, m, c]: number[]): boolean {
  if (k < 1 || k > 4 || c < -3 || c > 6) return false;
  if (kind === 0) return m === 1 && c <= 4;
  if (kind === 1) return m >= 2 && m <= 4 && c <= 4;
  if (kind === 2) return m === 1 && k <= 3 && c >= 2 && c * c > 2 * k + 1;
  return false;
}
function homAnswer([kind, k, m, c]: number[]): string {
  if (kind === 0) return sum([[k, "x log x"], [c, "x"]]);
  if (kind === 1) return sum([[c + k / (m - 1), `x${sup(m)}`], [-k / (m - 1), "x"]]);
  return `x√(${2 * k}log x + ${c * c})`;
}
function d2Ok([kind, a, b]: number[]): boolean {
  if (kind === 0 || kind === 4) return a !== 0 && a <= 3 && b >= 1 && b <= 3;
  if (kind === 1) return a >= 1 && a <= 5 && b >= 0 && b <= 5 && gcd(a, b) === 1;
  if (kind === 2) return a >= 2 && a <= 5 && b >= 1 && b <= 3;
  if (kind === 3) return a !== 0 && a <= 3 && b >= 1 && b <= 4;
  if (kind === 5) return a >= 1 && a <= 4 && (b === 0 || b === 1);
  return false;
}
function d2Text([kind, a, b]: number[]): string {
  const e = exPretty(a);
  if (kind === 0) return `${e} sin ${kx(b)}`;
  if (kind === 4) return `${e} cos ${kx(b)}`;
  if (kind === 1) return b === 0 && a === 1 ? "log x" : `log(${kx(a)}${sg(b)})`;
  if (kind === 2) return `${b === 1 ? "" : b}x${sup(a)} log x`;
  if (kind === 3) return `${b === 1 ? "" : b}x${e}`;
  return `x ${b ? "cos" : "sin"} ${kx(a)}`;
}
function d2Fn([kind, a, b]: number[]): (x: number) => number {
  if (kind === 0) return (x) => Math.exp(a * x) * Math.sin(b * x);
  if (kind === 4) return (x) => Math.exp(a * x) * Math.cos(b * x);
  if (kind === 1) return (x) => Math.log(a * x + b);
  if (kind === 2) return (x) => b * x ** a * Math.log(x);
  if (kind === 3) return (x) => b * x * Math.exp(a * x);
  return b ? (x) => x * Math.cos(a * x) : (x) => x * Math.sin(a * x);
}
/** [dy/dx, d²y/dx²] as answers. */
function d2Answers([kind, a, b]: number[]): [string, string] {
  const e = ex(a);
  const sb = `sin(${kx(b)})`;
  const cb = `cos(${kx(b)})`;
  if (kind === 0) return [`${e}(${sum([[a, sb], [b, cb]])})`, `${e}(${sum([[a * a - b * b, sb], [2 * a * b, cb]])})`];
  if (kind === 4) return [`${e}(${sum([[a, cb], [-b, sb]])})`, `${e}(${sum([[a * a - b * b, cb], [-2 * a * b, sb]])})`];
  if (kind === 1) {
    if (b === 0) return ["1/x", "−1/x²"];
    const lin = `${kx(a)}${sg(b)}`;
    return [`${a}/(${lin})`, `−${a * a}/(${lin})²`];
  }
  if (kind === 2) {
    const n = a;
    const pre = (pw: number) => `${b === 1 ? "" : b}${pw === 0 ? "" : pw === 1 ? "x" : `x${sup(pw)}`}`;
    const inner2 = sum([[n * (n - 1), "log x"], [2 * n - 1, ""]]);
    const p2 = pre(n - 2);
    return [`${pre(n - 1)}(${sum([[n, "log x"], [1, ""]])})`, p2 ? `${p2}(${inner2})` : inner2];
  }
  if (kind === 3) return [`${b === 1 ? "" : b}${e}(${sum([[a, "x"], [1, ""]])})`, `${b === 1 ? "" : b}${e}(${sum([[a * a, "x"], [2 * a, ""]])})`];
  const sa = `sin(${kx(a)})`;
  const ca = `cos(${kx(a)})`;
  return b ? [sum([[1, ca], [-a, `x ${sa}`]]), sum([[-2 * a, sa], [-a * a, `x ${ca}`]])] : [sum([[1, sa], [a, `x ${ca}`]]), sum([[2 * a, ca], [-a * a, `x ${sa}`]])];
}

// ---------------------------------------------------------------- gap@1 helpers

/** A list in an order fixed by a hash of the parameters (so the right letter is not predictable). */
const shuffled = <T,>(xs: T[], key: string, txt: (x: T) => string = (x) => String(x)): T[] => [...xs].sort((x, y) => fnv(`${key}:${txt(x)}`) - fnv(`${key}:${txt(y)}`) || (txt(x) < txt(y) ? -1 : 1));
const sameSet = (a: number[], b: number[]) => a.length === b.length && [...a].sort((x, y) => x - y).every((x, i) => Math.abs(x - [...b].sort((u, w) => u - w)[i]) < 1e-6);
/** A number as printed with a decimal point when needed (−1.5). */
const dec = (x: number) => (x < 0 ? `−${String(-x)}` : String(x));
/** The value of an answer in x at a point (NaN when unreadable). */
const valAt = (v: Value, x: number) => {
  if (typeof v !== "string") return NaN;
  try {
    return evaluate(parse(v), { x });
  } catch {
    return NaN;
  }
};

// principal value branches (aqinvbr)
type PSet = { iv: [number, number, boolean, boolean][]; holes: number[]; text: string };
const PI = Math.PI;
const IBR_NAME = ["sin⁻¹", "cos⁻¹", "tan⁻¹", "cot⁻¹", "sec⁻¹", "cosec⁻¹"];
const IBR_RANGES: PSet[] = [
  { iv: [[-PI / 2, PI / 2, true, true]], holes: [], text: "[−π/2, π/2]" },
  { iv: [[0, PI, true, true]], holes: [], text: "[0, π]" },
  { iv: [[-PI / 2, PI / 2, false, false]], holes: [], text: "(−π/2, π/2)" },
  { iv: [[0, PI, false, false]], holes: [], text: "(0, π)" },
  { iv: [[0, PI, true, true]], holes: [PI / 2], text: "[0, π] − {π/2}" },
  { iv: [[-PI / 2, PI / 2, true, true]], holes: [0], text: "[−π/2, π/2] − {0}" },
];
const IBR_DOMS: PSet[] = [
  { iv: [[-1, 1, true, true]], holes: [], text: "[−1, 1]" },
  { iv: [[-Infinity, Infinity, false, false]], holes: [], text: "ℝ (all real numbers)" },
  { iv: [[-Infinity, -1, false, true], [1, Infinity, true, false]], holes: [], text: "ℝ − (−1, 1), that is, x ≤ −1 or x ≥ 1" },
  { iv: [[-1, 1, false, false]], holes: [], text: "(−1, 1)" },
  { iv: [[-Infinity, Infinity, false, false]], holes: [0], text: "ℝ − {0}" },
];
const IBR_DOM_OF = [0, 0, 1, 1, 2, 2];
const IBR_RANGE_PARTNER = [1, 0, 0, 2, 1, 0];
const IBR_DOM_PARTNER = [2, 2, 0, 0, 0, 0];
const IBR_RANGE_SLIP = [
  "The principal ranges of sin⁻¹ and cos⁻¹ were swapped: [0, π] belongs to cos⁻¹, while sin⁻¹ gives angles from −π/2 to π/2.",
  "The principal ranges of cos⁻¹ and sin⁻¹ were swapped: [−π/2, π/2] belongs to sin⁻¹, while cos⁻¹ gives angles from 0 to π.",
  "The end points ±π/2 were included; tan(±π/2) is not defined, so tan⁻¹ never gives ±π/2 and its range is an open interval.",
  "cot⁻¹ was given the range of tan⁻¹; cot is not even defined at 0, and it is one-one on (0, π) instead.",
  "π/2 was left in the range; sec(π/2) is not defined, so sec⁻¹ never gives π/2.",
  "0 was left in the range; cosec 0 is not defined, so cosec⁻¹ never gives 0.",
];
const IBR_DOM_SLIP = [
  "The domains of sin⁻¹ and cosec⁻¹ were mixed up: sin θ always lies between −1 and 1, so sin⁻¹ accepts exactly the numbers −1 ≤ x ≤ 1.",
  "The domains of cos⁻¹ and sec⁻¹ were mixed up: cos θ always lies between −1 and 1, so cos⁻¹ accepts exactly the numbers −1 ≤ x ≤ 1.",
  "tan⁻¹(x) was taken to need −1 ≤ x ≤ 1, as for sin⁻¹ and cos⁻¹; tan takes every real value, so tan⁻¹ accepts every real number.",
  "cot⁻¹(x) was taken to need −1 ≤ x ≤ 1, as for sin⁻¹ and cos⁻¹; cot takes every real value, so cot⁻¹ accepts every real number.",
  "sec⁻¹(x) was taken to need −1 ≤ x ≤ 1, as for cos⁻¹; sec θ is never strictly between −1 and 1, so the domain is x ≤ −1 or x ≥ 1.",
  "cosec⁻¹(x) was taken to need −1 ≤ x ≤ 1, as for sin⁻¹; cosec θ is never strictly between −1 and 1, so the domain is x ≤ −1 or x ≥ 1.",
];
const IBR_ANGLE_SLIP = [
  "2π/3 was taken as a principal value of sin⁻¹, as if its range were [0, π] (that of cos⁻¹); sin⁻¹ gives angles from −π/2 to π/2 only.",
  "−π/3 was taken as a principal value of cos⁻¹, as if its range were [−π/2, π/2] (that of sin⁻¹); cos⁻¹ gives angles from 0 to π only.",
  "π/2 was taken as a value of tan⁻¹; tan(π/2) is not defined, so the range (−π/2, π/2) leaves out its end points.",
  "0 was taken as a value of cot⁻¹; cot 0 is not defined, so the range (0, π) leaves out 0.",
  "π/2 was taken as a value of sec⁻¹; sec(π/2) is not defined, so π/2 is left out of [0, π].",
  "0 was taken as a value of cosec⁻¹; cosec 0 is not defined, so 0 is left out of [−π/2, π/2].",
];
const IBR_NUM_SLIP = [
  "3/2 was accepted, as if sin⁻¹ had the domain of cosec⁻¹; sin θ is never more than 1, so sin⁻¹(3/2) is not defined.",
  "3/2 was accepted, as if cos⁻¹ had the domain of sec⁻¹; cos θ is never more than 1, so cos⁻¹(3/2) is not defined.",
  "",
  "",
  "1/2 was accepted, as if sec⁻¹ had the domain [−1, 1] of cos⁻¹; sec θ is never strictly between −1 and 1, so sec⁻¹(1/2) is not defined.",
  "1/2 was accepted, as if cosec⁻¹ had the domain [−1, 1] of sin⁻¹; cosec θ is never strictly between −1 and 1, so cosec⁻¹(1/2) is not defined.",
];
/** Angles kπ/12 offered as candidates, and the tricky one for each function. */
const IBR_K = [-12, -9, -8, -6, -4, -3, -2, 0, 2, 3, 4, 6, 8, 9, 10, 12, 15, 18];
const IBR_TRICKY_K = [8, -4, 6, 0, 6, 0];
const IBR_X: [string, number][] = [["−3", -3], ["−2", -2], ["−3/2", -1.5], ["−1", -1], ["−1/2", -0.5], ["−1/3", -1 / 3], ["0", 0], ["1/4", 0.25], ["1/2", 0.5], ["2/3", 2 / 3], ["1", 1], ["5/4", 1.25], ["3/2", 1.5], ["2", 2], ["5/2", 2.5]];
const IBR_TRICKY_X = ["3/2", "3/2", "", "", "1/2", "1/2"];
const angleText = (k: number) => {
  if (k === 0) return "0";
  const g = gcd(Math.abs(k), 12);
  const [n, d] = [k / g, 12 / g];
  return `${n < 0 ? "−" : ""}${Math.abs(n) === 1 ? "" : Math.abs(n)}π${d === 1 ? "" : `/${d}`}`;
};
function inPSet(s: PSet, v: number): boolean {
  const e = 1e-12;
  const inIv = s.iv.some(([lo, hi, lc, hc]) => (v > lo + e || (lc && Math.abs(v - lo) <= e)) && (v < hi - e || (hc && Math.abs(v - hi) <= e)));
  return inIv && !s.holes.some((h) => Math.abs(v - h) <= e);
}
/** f⁻¹(x) from Math (NaN where not a real number). */
function ibrInv(f: number, x: number): number {
  return [Math.asin(x), Math.acos(x), Math.atan(x), PI / 2 - Math.atan(x), Math.acos(1 / x), Math.asin(1 / x)][f];
}
/** f(θ), NaN where it is not defined. */
function ibrFwd(f: number, t: number): number {
  const s = Math.sin(t);
  const c = Math.cos(t);
  const zs = Math.abs(s) < 1e-12;
  const zc = Math.abs(c) < 1e-12;
  return [s, c, zc ? NaN : s / c, zs ? NaN : c / s, zc ? NaN : 1 / c, zs ? NaN : 1 / s][f];
}
/** Whether θ is a principal value: f(θ) is defined and f⁻¹(f(θ)) gives θ back. */
function ibrAttained(f: number, t: number): boolean {
  const y = ibrFwd(f, t);
  return Number.isFinite(y) && Math.abs(ibrInv(f, y) - t) < 1e-9;
}
const ibrOk = ([f, ask, s]: number[]) => f >= 0 && f <= 5 && ask >= 0 && ask <= 3 && s >= 0 && s <= 7 && (ask >= 2 || s <= 2) && (ask !== 3 || f <= 1 || f >= 4);
type IbrChoice = { text: string; right: boolean; tag: string; set?: PSet; value?: number };
function ibrChoices([f, ask, s]: number[]): IbrChoice[] {
  const key = `ibr:${f}:${ask}:${s}`;
  let out: IbrChoice[];
  if (ask <= 1) {
    const right = ask === 0 ? IBR_RANGES[f] : IBR_DOMS[IBR_DOM_OF[f]];
    const partner = ask === 0 ? IBR_RANGES[IBR_RANGE_PARTNER[f]] : IBR_DOMS[IBR_DOM_PARTNER[f]];
    const swap = ask === 0 ? IBR_DOMS[IBR_DOM_OF[f]] : IBR_RANGES[f];
    const used = [right.text, partner.text, swap.text];
    const rest = [...IBR_RANGES, ...IBR_DOMS].filter((x) => !used.includes(x.text));
    const filler = rest[s % rest.length];
    out = [
      { text: right.text, right: true, tag: "right", set: right },
      { text: partner.text, right: false, tag: "partner", set: partner },
      { text: swap.text, right: false, tag: "swap", set: swap },
      { text: filler.text, right: false, tag: "filler", set: filler },
    ];
  } else if (ask === 2) {
    const ins = IBR_K.filter((k) => inPSet(IBR_RANGES[f], (k * PI) / 12));
    const tricky = IBR_TRICKY_K[f];
    const outs = IBR_K.filter((k) => !inPSet(IBR_RANGES[f], (k * PI) / 12) && k !== tricky);
    const r = ins[s % ins.length];
    out = [
      { text: angleText(r), right: true, tag: "right", value: (r * PI) / 12 },
      { text: angleText(tricky), right: false, tag: "partner", value: (tricky * PI) / 12 },
      ...[outs[s % outs.length], outs[(s + 3) % outs.length]].map((k) => ({ text: angleText(k), right: false, tag: "other", value: (k * PI) / 12 })),
    ];
  } else {
    const dom = IBR_DOMS[IBR_DOM_OF[f]];
    const ins = IBR_X.filter(([, x]) => inPSet(dom, x));
    const tricky = IBR_X.find(([t]) => t === IBR_TRICKY_X[f])!;
    const outs = IBR_X.filter(([t, x]) => !inPSet(dom, x) && t !== tricky[0]);
    const r = ins[s % ins.length];
    out = [
      { text: r[0], right: true, tag: "right", value: r[1] },
      { text: tricky[0], right: false, tag: "partner", value: tricky[1] },
      ...[outs[s % outs.length], outs[(s + 3) % outs.length]].map(([t, x]) => ({ text: t, right: false, tag: "other", value: x })),
    ];
  }
  return shuffled(out, key, (c) => c.text);
}

// continuity on a domain or an interval (aqcontd)
const cdB = ([a, d]: number[]) => a + d;
const cdP2 = ([, , p]: number[]) => (x: number) => x * x + p * x;
const cdC1 = (q: number[]) => cdP2(q)(q[0]) + 2 * q[5] - q[3] * q[0];
const cdC3 = (q: number[]) => cdP2(q)(cdB(q)) + 2 * q[6] - q[4] * cdB(q);
function cdFn(q: number[]): (x: number) => number {
  const [a, , , m1, m3] = q;
  const b = cdB(q);
  const P2 = cdP2(q);
  const c1 = cdC1(q);
  const c3 = cdC3(q);
  return (x) => (x < a ? m1 * x + c1 : x < b ? P2(x) : m3 * x + c3);
}
function cdText(q: number[]): string {
  const [a, , p, m1, m3] = q;
  const b = cdB(q);
  return `${pp([[m1, 1], [cdC1(q), 0]])} for x < ${N(a)}; ${pp([[1, 2], [p, 1]])} for ${N(a)} ≤ x < ${N(b)}; and ${pp([[m3, 1], [cdC3(q), 0]])} for x ≥ ${N(b)}`;
}
const cdIv = (q: number[]): [number, number] => (q[7] === 1 ? [q[0] - 1, q[0] + q[1] / 2] : [q[0] + q[1] / 2, cdB(q) + 1]);
const cdOk = (q: number[]) => {
  const [a, d, p, m1, m3, j1, j2, ask] = q;
  return a >= -3 && a + d <= 3 && d >= 1 && d <= 3 && p >= -2 && p <= 2 && m1 !== 0 && m3 !== 0 && Math.abs(m1) <= 2 && Math.abs(m3) <= 2 && Math.abs(j1) <= 1 && Math.abs(j2) <= 1 && ask >= 0 && ask <= 2;
};
function cdChoices(q: number[]): { text: string; at: number[] }[] {
  const a = q[0];
  const b = cdB(q);
  const where = q[7] === 0 ? "" : ` on [${cdIv(q).map(dec).join(", ")}]`;
  const list = [
    { text: q[7] === 0 ? "f is continuous at every real number" : `f is continuous at every point of [${cdIv(q).map(dec).join(", ")}]`, at: [] as number[] },
    { text: `f is discontinuous${where} only at x = ${N(a)}`, at: [a] },
    { text: `f is discontinuous${where} only at x = ${N(b)}`, at: [b] },
    { text: `f is discontinuous${where} at both x = ${N(a)} and x = ${N(b)}`, at: [a, b] },
  ];
  return shuffled(list, `cd:${q}`, (c) => c.text);
}

// second-derivative test (aqd2test)
const D2T = ["f has a local maximum at this point", "f has a local minimum at this point", "the test gives no conclusion, because f″ = 0 there"];
const D2T_TEXT = (f2: number) => (f2 < 0 ? `f″ < 0, so ${D2T[0]}` : f2 > 0 ? `f″ > 0, so ${D2T[1]}` : `f″ = 0, so ${D2T[2]}`);
const d2tOk = ([kind, u, v, s, w]: number[]) => {
  if (s !== 1 && s !== -1) return false;
  if (kind === 0) return u < v && u >= -4 && v <= 5 && v - u <= 6 && Math.abs(u * v) <= 12 && (w === 0 || w === 1);
  if (kind === 1 || kind === 3) return u >= -3 && u <= 3 && v >= -1 && v <= 2 && w === 0;
  if (kind === 2) return u >= 1 && u <= 4 && v >= 1 && v <= 4 && w === 0;
  return false;
};
const d2tPoint = ([kind, u, v, s, w]: number[]) => (kind === 0 ? (w ? v : u) : kind === 2 ? s * v : u);
function d2tText([kind, u, v, s]: number[]): string {
  if (kind === 0) return cubicText(u, v, s, 0);
  if (kind === 1) return pp([[s, 4], [-4 * s * u, 3], [6 * s * u * u, 2], [-4 * s * u ** 3, 1], [s * u ** 4 + v, 0]]);
  if (kind === 3) return pp([[s, 3], [-3 * s * u, 2], [3 * s * u * u, 1], [-s * u ** 3 + v, 0]]);
  return `${u === 1 ? "" : u}x + ${u * v * v}/x`;
}
function d2tFn([kind, u, v, s]: number[]): (x: number) => number {
  if (kind === 0) return cubic(u, v, s, 0);
  if (kind === 1) return (x) => s * (x - u) ** 4 + v;
  if (kind === 3) return (x) => s * (x - u) ** 3 + v;
  return (x) => u * x + (u * v * v) / x;
}
function d2tSecond(p: number[]): number {
  const [kind, u, v, s] = p;
  const c = d2tPoint(p);
  if (kind === 0) return s * (12 * c - 6 * (u + v));
  if (kind === 2) return (2 * u * v * v) / c ** 3;
  return 0;
}
function d2tSecondText([kind, u, v, s]: number[]): string {
  if (kind === 0) return pp([[12 * s, 1], [-6 * s * (u + v), 0]]);
  if (kind === 1) return pp([[12 * s, 2], [-24 * s * u, 1], [12 * s * u * u, 0]]);
  if (kind === 3) return pp([[6 * s, 1], [-6 * s * u, 0]]);
  return `${2 * u * v * v}/x³`;
}
const d2tChoices = (p: number[]) => shuffled(D2T, `d2t:${p}`);

// areas bounded by lines (aqlarea)
const laOk = ([kind, u, v, w, z]: number[]) => {
  if (kind === 0) return u >= 1 && u <= 8 && v >= 1 && v <= 8 && w === 0 && z === 0;
  if (kind === 1) return u !== 0 && Math.abs(u) <= 3 && v >= -6 && v <= 8 && w < z && w >= -4 && z <= 6 && z - w <= 6 && u * w + v !== 0 && u * z + v !== 0;
  if (kind === 2) return u >= 1 && u <= 3 && v >= 1 && v <= 3 && w < z && w >= -4 && z <= 6 && z - w <= 6;
  return false;
};
function laLine0(u: number, v: number): string {
  const g = gcd(u, v);
  return `${pp([[v / g, 1]])} + ${pp([[u / g, 1]], "y")} = ${(u * v) / g}`;
}
const laCross = ([, u, v, w, z]: number[]) => {
  const r = -v / u;
  return r > w && r < z ? r : null;
};
const laApex = ([, u, v, w, z]: number[]) => (u * w + v * z) / (u + v);
function absAreaExact(m: number, q: number, lo: number, hi: number): number {
  const Fn = (x: number) => (m * x * x) / 2 + q * x;
  const r = -q / m;
  return r > lo && r < hi ? Math.abs(Fn(r) - Fn(lo)) + Math.abs(Fn(hi) - Fn(r)) : Math.abs(Fn(hi) - Fn(lo));
}
function laAnswer(p: number[]): number {
  const [kind, u, v, w, z] = p;
  if (kind === 0) return (u * v) / 2;
  if (kind === 1) return absAreaExact(u, v, w, z);
  return (u * v * (z - w) ** 2) / (2 * (u + v));
}

// areas bounded by a circle (aqcarea)
const CA_SECTOR_DEG = [45, 45, 60, 30, 30, 60];
const CA_LINE = ["y = x", "y = x", "y = √3x", "y = √3x", "√3y = x", "√3y = x"];
const caOk = ([kind, r, t]: number[]) => (kind === 0 ? r >= 1 && r <= 12 && t <= 1 : kind === 1 ? r >= 1 && r <= 12 && t <= 5 : (kind === 2 || kind === 3) && r >= 1 && r <= 6 && t <= 1);
/** [coefficient of π, rational part, coefficient of √3]. */
function caParts([kind, r, t]: number[]): [number, number, number] {
  const r2 = r * r;
  if (kind === 0) return t ? [(3 * r2) / 4, r2 / 2, 0] : [r2 / 4, -r2 / 2, 0];
  if (kind === 1) return [(CA_SECTOR_DEG[t] * r2) / 360, 0, 0];
  if (kind === 2) return t ? [(8 * r2) / 3, 0, r2] : [(4 * r2) / 3, 0, -r2];
  return t ? [(3 * r2) / 2, r2, 0] : [r2 / 2, -r2, 0];
}
/** aπ + b + c√3 in simplest form. */
function piSurd(a: number, b: number, c: number): string {
  const out: string[] = [];
  const put = (v: number, body: (n: string, d: string | undefined) => string) => {
    if (Math.abs(v) < 1e-12) return;
    const [n, d] = fmt(Math.abs(v)).split("/");
    const t = body(n, d);
    out.push(out.length ? `${v < 0 ? "−" : "+"} ${t}` : `${v < 0 ? "−" : ""}${t}`);
  };
  put(a, (n, d) => `${n === "1" ? "" : n}π${d ? `/${d}` : ""}`);
  put(b, (n, d) => `${n}${d ? `/${d}` : ""}`);
  put(c, (n, d) => `${n === "1" ? "" : n}√3${d ? `/${d}` : ""}`);
  return out.length ? out.join(" ") : "0";
}
function caPrompt([kind, r, t]: number[]): string {
  const part = t ? "larger" : "smaller";
  if (kind === 0) return `Find the area of the ${part} of the two regions into which the line x + y = ${r} divides the region enclosed by the circle x² + y² = ${r * r}.`;
  if (kind === 1) return `Find the area of the region in the first quadrant bounded by the ${t % 2 ? "y" : "x"}-axis, the line ${CA_LINE[t]} and the circle x² + y² = ${r * r}.`;
  const R2 = kind === 2 ? 4 * r * r : 2 * r * r;
  return `Find the area of the ${part} of the two regions into which the line x = ${r} divides the region enclosed by the circle x² + y² = ${R2}.`;
}
function caSetup([kind, r, t]: number[]): string {
  if (kind === 0) return `${t ? `${r * r}π − ` : ""}(∫₀^${r} √(${r * r} − x²) dx − ∫₀^${r} (${r} − x) dx)`;
  if (kind === 1) return `the sector between the ${t % 2 ? "y" : "x"}-axis and the line, an angle of ${CA_SECTOR_DEG[t]}°: (${CA_SECTOR_DEG[t]}/360) × π × ${r * r}`;
  const R2 = kind === 2 ? 4 * r * r : 2 * r * r;
  const seg = `2∫ from ${r} to √${R2} of √(${R2} − x²) dx`;
  return t ? `${R2}π − ${seg}` : seg;
}
function caPolar([kind, r, t]: number[]): number {
  if (kind === 0) {
    const inner = simpson((th) => 0.5 * (r / (Math.cos(th) + Math.sin(th))) ** 2, 0, PI / 2, 2000);
    return t ? inner + 0.5 * r * r * (1.5 * PI) : 0.5 * r * r * (PI / 2) - inner;
  }
  if (kind === 1) {
    const thL = Math.atan2([1, 1, Math.sqrt(3), Math.sqrt(3), 1, 1][t], [1, 1, 1, 1, Math.sqrt(3), Math.sqrt(3)][t]);
    const [lo, hi] = t % 2 ? [thL, PI / 2] : [0, thL];
    return simpson(() => 0.5 * r * r, lo, hi, 200);
  }
  const R = kind === 2 ? 2 * r : Math.sqrt(2) * r;
  const th0 = Math.acos(r / R);
  const seg = simpson((th) => 0.5 * (R * R - (r / Math.cos(th)) ** 2), -th0, th0, 2000);
  return t ? simpson((th) => 0.5 * (r / Math.cos(th)) ** 2, -th0, th0, 2000) + 0.5 * R * R * (2 * PI - 2 * th0) : seg;
}

// a quantity from its rate (aqivp)
const ivpOk = ([kind, a, b, c, d, T]: number[]) => {
  if (kind === 0) {
    if (a > 3 || b < -3 || c < 0 || d < 0 || T < 1 || (a * T ** 3) % 3 !== 0 || (b * T * T) % 2 !== 0 || (a === 0 && b === 0)) return false;
    for (let t = 0; t <= T; t += 0.25) if (a * t * t + b * t + c <= 0) return false;
    return true;
  }
  if (kind === 1) return a >= 1 && b >= 1 && c === 0 && d >= 1 && T >= 1;
  if (kind === 2) return T >= 2 && (a !== 0 || b !== 0) && Number.isInteger(Math.round(ivpAnswer([2, a, b, c, d, T]) * 1e9) / 1e9);
  return false;
};
function ivpAnswer([kind, a, b, c, d, T]: number[]): number {
  if (kind === 0) return (a * T ** 3) / 3 + (b * T * T) / 2 + c * T + d;
  if (kind === 1) return (a * (10 * T) ** 2) / 2 + b * 10 * T + 100 * d;
  return (a * (T ** 3 - 1)) / 3 + (b * (T * T - 1)) / 2 + c * (T - 1) + d;
}

// solution set of a rank-2 system (aqsolset)
function ssSys([a, b, c, e, x0, y0, m, k]: number[]) {
  const r1 = [1, a, b];
  const r2 = [c, 1 + a * c, e];
  const r3 = r1.map((x, i) => m * x + k * r2[i]);
  const P = [x0, y0, 0];
  const dotP = (r: number[]) => r[0] * P[0] + r[1] * P[1] + r[2] * P[2];
  return { A: [r1, r2, r3], B: [dotP(r1), dotP(r2), dotP(r3)] };
}
const ssDir = ([a, b, c, e]: number[]) => [a * e - b * (1 + a * c), b * c - e, 1];
const ssOk = (p: number[]) => {
  const [a, b, c, e, x0, y0, m, k] = p;
  if (a < -2 || a > 2 || b < -2 || b > 2 || c < 1 || c > 2 || e < -2 || e > 2 || x0 < -2 || x0 > 3 || y0 < -2 || y0 > 3 || m < 1 || m > 2 || k === 0 || Math.abs(k) > 1) return false;
  const { A, B } = ssSys(p);
  const D = ssDir(p);
  return A.every((r) => r.every((x) => Math.abs(x) <= 9)) && B.every((x) => Math.abs(x) <= 20) && D.every((x) => Math.abs(x) <= 8) && A[2].some((x) => x !== 0);
};

// tangents, normals, angles between curves (aqtann)
const tnOk = ([kind, d, a, b, c, x0]: number[]) => {
  if (kind === 2) return d === 0 && a >= 1 && a <= 3 && b >= 1 && b <= 3 && x0 >= 1 && x0 <= 3 && c >= -2 && c <= 2;
  if (kind !== 0 && kind !== 1) return false;
  if (d === 0 && a === 0) return false;
  const y0 = d * x0 ** 3 + a * x0 * x0 + b * x0 + c;
  const m = 3 * d * x0 * x0 + 2 * a * x0 + b;
  return Math.abs(y0) <= 40 && Math.abs(m) <= 30 && (kind === 0 || m !== 0);
};
const tnLine = (kind: number, m: number, x0: number, y0: number) => (kind === 0 ? pa([[m, 1], [y0 - m * x0, 0]]) : pa([[-1 / m, 1], [y0 + x0 / m, 0]]));

// classifying differential equations (aqdecl)
type DeTerm = { d: "o" | "p"; pow: number; times: number; fn: boolean };
type DeclT = { text: (a: number) => string; partial: boolean; nonlinear: boolean; why: string; varCoef: string; rhs: string; terms: DeTerm[] };
const O = (pow = 1, times = 0, fn = false): DeTerm => ({ d: "o", pow, times, fn });
const Pd = (pow = 1, times = 0, fn = false): DeTerm => ({ d: "p", pow, times, fn });
const DECL: DeclT[] = [
  { text: (a) => `d²y/dx² + ${a}x dy/dx + y = sin x`, partial: false, nonlinear: false, why: "", varCoef: "x", rhs: "sin x", terms: [O(), O(), O()] },
  { text: (a) => `x² d²y/dx² − ${a}x dy/dx + ${a + 1}y = 0`, partial: false, nonlinear: false, why: "", varCoef: "x²", rhs: "", terms: [O(), O(), O()] },
  { text: (a) => `dy/dx + ${a}y = eˣ`, partial: false, nonlinear: false, why: "", varCoef: "", rhs: "eˣ", terms: [O(), O()] },
  { text: (a) => `dy/dx + (sin x)y = ${a}x`, partial: false, nonlinear: false, why: "", varCoef: "sin x", rhs: "", terms: [O(), O()] },
  { text: (a) => `d³y/dx³ − ${a} d²y/dx² + y = cos x`, partial: false, nonlinear: false, why: "", varCoef: "", rhs: "cos x", terms: [O(), O(), O()] },
  { text: (a) => `eˣ dy/dx + ${a}y = x²`, partial: false, nonlinear: false, why: "", varCoef: "eˣ", rhs: "x²", terms: [O(), O()] },
  { text: (a) => `dy/dx + ${a}y² = x`, partial: false, nonlinear: true, why: "the term in y²", varCoef: "", rhs: "", terms: [O(), O(2)] },
  { text: (a) => `y d²y/dx² + ${a} dy/dx = 0`, partial: false, nonlinear: true, why: "y multiplied by d²y/dx²", varCoef: "", rhs: "", terms: [O(1, 1), O()] },
  { text: (a) => `(dy/dx)² + ${a}y = x`, partial: false, nonlinear: true, why: "the square of dy/dx", varCoef: "", rhs: "", terms: [O(2), O()] },
  { text: (a) => `dy/dx = ${a} sin y`, partial: false, nonlinear: true, why: "sin y", varCoef: "", rhs: "", terms: [O(), O(1, 0, true)] },
  { text: (a) => `d²y/dx² + ${a}eʸ = 0`, partial: false, nonlinear: true, why: "eʸ", varCoef: "", rhs: "", terms: [O(), O(1, 0, true)] },
  { text: (a) => `y dy/dx = ${a}x`, partial: false, nonlinear: true, why: "y multiplied by dy/dx", varCoef: "", rhs: "", terms: [O(1, 1)] },
  { text: (a) => `∂u/∂x + ${a} ∂u/∂y = 0`, partial: true, nonlinear: false, why: "", varCoef: "", rhs: "", terms: [Pd(), Pd()] },
  { text: (a) => `∂²u/∂x² + ${a} ∂²u/∂y² = 0`, partial: true, nonlinear: false, why: "", varCoef: "", rhs: "", terms: [Pd(), Pd()] },
  { text: (a) => `∂u/∂t = ${a} ∂²u/∂x²`, partial: true, nonlinear: false, why: "", varCoef: "", rhs: "", terms: [Pd(), Pd()] },
  { text: (a) => `x ∂u/∂x + y ∂u/∂y = ${a}u`, partial: true, nonlinear: false, why: "", varCoef: "x and y", rhs: "", terms: [Pd(), Pd(), Pd()] },
  { text: (a) => `∂²u/∂t² = ${a * a} ∂²u/∂x²`, partial: true, nonlinear: false, why: "", varCoef: "", rhs: "", terms: [Pd(), Pd()] },
  { text: (a) => `∂u/∂x − ${a} ∂u/∂y = x + y`, partial: true, nonlinear: false, why: "", varCoef: "", rhs: "x + y", terms: [Pd(), Pd()] },
  { text: (a) => `u ∂u/∂x + ${a} ∂u/∂y = 0`, partial: true, nonlinear: true, why: "u multiplied by ∂u/∂x", varCoef: "", rhs: "", terms: [Pd(1, 1), Pd()] },
  { text: (a) => `(∂u/∂x)² + (∂u/∂y)² = ${a}`, partial: true, nonlinear: true, why: "the squares of the derivatives", varCoef: "", rhs: "", terms: [Pd(2), Pd(2)] },
  { text: (a) => `∂u/∂t + u ∂u/∂x = ${a} ∂²u/∂x²`, partial: true, nonlinear: true, why: "u multiplied by ∂u/∂x", varCoef: "", rhs: "", terms: [Pd(), Pd(1, 1), Pd()] },
  { text: (a) => `∂u/∂x + ${a} ∂u/∂y = u²`, partial: true, nonlinear: true, why: "the term u²", varCoef: "", rhs: "", terms: [Pd(), Pd(), Pd(2)] },
  { text: (a) => `∂²u/∂x² + ∂²u/∂y² = ${a} sin u`, partial: true, nonlinear: true, why: "sin u", varCoef: "", rhs: "", terms: [Pd(), Pd(), Pd(1, 0, true)] },
  { text: (a) => `(∂u/∂x)(∂u/∂y) = ${a}`, partial: true, nonlinear: true, why: "two derivatives multiplied together", varCoef: "", rhs: "", terms: [Pd(1, 1)] },
];
const DECL_LABELS = ["ordinary and linear", "ordinary and non-linear", "partial and linear", "partial and non-linear"];
const declChoices = (p: number[]) => shuffled(DECL_LABELS, `decl:${p}`);

// reducible to separable (aqsubsep)
const ssubV = (m: number, c: number) => (m === 0 ? `y${sg(c)}` : `${kx(m)} + y${sg(c)}`);
const ssubRhs = ([m, c, k]: number[]) => `(${ssubV(m, c)})²${sg(k * k - m)}`;
const ssubPhase = (s: number) => (s === 0 ? "" : s > 0 ? " + π/4" : " − π/4");
const ssubTan = (k: number, s: number) => `${k === 1 ? "" : k}tan(${kx(k)}${ssubPhase(s)})`;
const ssubAnswer = ([m, c, k, s]: number[]) => `${ssubTan(k, s)}${m === 0 ? "" : ` ${m > 0 ? "−" : "+"} ${Math.abs(m) === 1 ? "" : Math.abs(m)}x`}${sg(-c)}`;
const ssubBack = ([m, c, k, s]: number[]) => `${ssubTan(k, s)}${m === 0 ? "" : ` ${m > 0 ? "+" : "−"} ${Math.abs(m) === 1 ? "" : Math.abs(m)}x`}${sg(c)}`;

// binary operations modulo n, by tables, on matrices (aqbinmod)
const BM_CLOSE = ["Yes: a ∗ b is in S for all a and b in S", "No: some a ∗ b is not in S"];
const BM_MOD = (k: number) => ["a + b + K", "ab", "a − b", "a + Kb", "ab + a + b", "Kab"].map((t) => t.replace("K", String(k)));
const BM_MAT = ["AB", "A + B", "AB − BA", "AB + BA", "A − B", "A + B + AB"];
const BM_BASE: ((a: number, b: number) => number)[] = [(a, b) => (a + b) % 3, (a) => a, (a, b) => (2 * a + 2 * b) % 3, (a, b) => (((a - b) % 3) + 3) % 3, (a, b) => Math.max(a, b), (a, b) => (a * b) % 3, (_, b) => b, (a, b) => (a + 2 * b) % 3];
const BM_BASE_CAT = [0, 2, 1, 3, 0, 0, 2, 3];
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const isPrime = (n: number) => n >= 2 && range(2, Math.floor(Math.sqrt(n))).every((d) => n % d !== 0);
const bmOk = ([kind, n, op, k]: number[]) => {
  if (kind === 0) return n >= 3 && n <= 9 && op >= 0 && op <= 5 && (op === 0 ? k >= 1 && k <= n - 1 : op === 3 || op === 5 ? k >= 2 && k <= n - 1 : k === 0);
  if (kind === 1) return n >= 3 && n <= 12 && op >= 0 && op <= 1 && k === 0;
  if (kind === 2) {
    if (n !== 0 || op < 0 || op > 7 || k < 0 || k > 11) return false;
    // the same table from another relabelling (with the same letters) is the same question: keep the first
    const t = JSON.stringify(bmTable([2, 0, op, k]).rows);
    return range(k >= 6 ? 6 : 0, k - 1).every((j) => JSON.stringify(bmTable([2, 0, op, j]).rows) !== t);
  }
  if (kind === 3) return n === 0 && op >= 0 && op <= 5 && k === 0;
  return false;
};
function bmCat([kind, n, op, k]: number[]): number {
  if (kind === 0) return [0, 0, 3, (k * k - k) % n === 0 ? 2 : 3, 0, 0][op];
  if (kind === 1) return op === 0 && isPrime(n) ? 0 : 1;
  if (kind === 2) return BM_BASE_CAT[op];
  return [2, 0, 3, 1, 3, 2][op];
}
/** The table of a kind-2 operation: letters, and the entry letter for each row and column. */
function bmTable([, , op, k]: number[]) {
  const L = k >= 6 ? ["p", "q", "r"] : ["a", "b", "c"];
  const perm = PERMS[k % 6];
  const inv = [0, 1, 2].map((i) => perm.indexOf(i));
  const rows = [0, 1, 2].map((i) => [0, 1, 2].map((j) => perm[BM_BASE[op](inv[i], inv[j])]));
  return { L, rows };
}
function bmPrompt(p: number[]): string {
  const [kind, n, op, k] = p;
  if (kind === 0) return `On S = {0, 1, …, ${n - 1}}, a binary operation ∗ is defined by a ∗ b = (${BM_MOD(k)[op]}) mod ${n}, the remainder on dividing ${BM_MOD(k)[op]} by ${n}${op === 2 ? ` (taken in S; for example −1 mod ${n} = ${n - 1})` : ""}. Which is true?`;
  if (kind === 1) return `Let S = {1, 2, …, ${n - 1}} and a ∗ b = (${op ? "a + b" : "ab"}) mod ${n}, the remainder on dividing ${op ? "a + b" : "ab"} by ${n}. Is ∗ a binary operation on S?`;
  if (kind === 2) {
    const { L, rows } = bmTable(p);
    return `On S = {${L.join(", ")}}, the operation ∗ is given by the table in the picture (the entry in row x and column y is x ∗ y): ${rows.map((r, i) => `row ${L[i]}: ${r.map((x) => L[x]).join(", ")}`).join("; ")}. Which is true?`;
  }
  return `On the set of all 2 × 2 matrices with real entries, a binary operation ∗ is defined by A ∗ B = ${BM_MAT[op]}. Which is true?`;
}
function bmFigure(p: number[]): Visual {
  const { L, rows } = bmTable(p);
  return { type: "table", head: ["∗", ...L], rows: rows.map((r, i) => [L[i], ...r.map((x) => L[x])]) };
}
const bmChoices = (p: number[]) => (p[0] === 1 ? shuffled(BM_CLOSE, `bm:${p}`) : shuffled(BIN_CHOICES, `bm:${p}`));
function bmReason(p: number[]): string {
  const [kind, n, op, k] = p;
  const cat = bmCat(p);
  if (kind === 1) return cat === 0 ? `${n} is prime, so a product of two numbers from 1 to ${n - 1} is never a multiple of ${n}: the remainder is never 0` : op === 0 ? `${bmZeroPair(n)} = ${n}, whose remainder is 0, and 0 is not in S` : `1 + ${n - 1} = ${n}, whose remainder is 0, and 0 is not in S`;
  if (kind === 0 && op === 3) return `a ∗ b and b ∗ a differ (k = ${k} ≠ 1); (a ∗ b) ∗ c = a + ${k}b + ${k}c and a ∗ (b ∗ c) = a + ${k}b + ${k * k}c, equal modulo ${n} only if ${k * k} − ${k} is a multiple of ${n}`;
  if (kind === 2) return "Compare the table with its mirror image in the leading diagonal (commutativity), then check (x ∗ y) ∗ z = x ∗ (y ∗ z) for the triples";
  return `Swap the two elements to test commutativity, and compare (a ∗ b) ∗ c with a ∗ (b ∗ c): ${BIN_CHOICES[cat]}`;
}
function bmZeroPair(n: number): string {
  const f = range(2, n - 1).find((d) => n % d === 0) ?? 1;
  return `${f} × ${n / f}`;
}
function bmBrute(p: number[]): { elems: number[]; op: (a: number, b: number) => number; eq: (a: number, b: number) => boolean } | { elems: number[][][]; op: (a: number[][], b: number[][]) => number[][]; eq: (a: number[][], b: number[][]) => boolean } {
  const [kind, n, op, k] = p;
  if (kind === 0) {
    const md = (x: number) => ((x % n) + n) % n;
    const f = [(a: number, b: number) => md(a + b + k), (a: number, b: number) => md(a * b), (a: number, b: number) => md(a - b), (a: number, b: number) => md(a + k * b), (a: number, b: number) => md(a * b + a + b), (a: number, b: number) => md(k * a * b)][op];
    return { elems: range(0, n - 1), op: f, eq: (a, b) => a === b };
  }
  if (kind === 2) {
    const { rows } = bmTable(p);
    return { elems: [0, 1, 2], op: (a, b) => rows[a][b], eq: (a, b) => a === b };
  }
  const mm = (A: number[][], B: number[][]) => [0, 1].map((i) => [0, 1].map((j) => A[i][0] * B[0][j] + A[i][1] * B[1][j]));
  const add = (A: number[][], B: number[][], s = 1) => A.map((r, i) => r.map((x, j) => x + s * B[i][j]));
  const f = [(A: number[][], B: number[][]) => mm(A, B), (A: number[][], B: number[][]) => add(A, B), (A: number[][], B: number[][]) => add(mm(A, B), mm(B, A), -1), (A: number[][], B: number[][]) => add(mm(A, B), mm(B, A)), (A: number[][], B: number[][]) => add(A, B, -1), (A: number[][], B: number[][]) => add(add(A, B), mm(A, B))][op];
  const elems = [[[1, 2], [0, -1]], [[0.5, -1], [3, 2]], [[2, 0], [1, 1]], [[-1, 1], [1, 0.25]]];
  return { elems, op: f, eq: (A, B) => A.every((r, i) => r.every((x, j) => Math.abs(x - B[i][j]) < 1e-9)) };
}
