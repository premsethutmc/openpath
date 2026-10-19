/**
 * Batch b20 (families@2): Grades 11–12 probability (continuous and discrete random variables, independence, total
 * probability), reasoning (converses, counterexamples, truth tables), statistics (variance, standard deviation,
 * coefficient of variation, mean deviation), trigonometry (allied angles, periods, compound and multiple angles,
 * product-to-sum, equations, radians, triangle laws, inverse functions) and vectors (components, section formula,
 * magnitude, direction cosines, dot and cross products, triple products). Written by OpenPath; CC0.
 *
 * Every `validate` uses a different method from `solve`: enumeration of outcomes, Simpson's rule, pairwise formulas,
 * bitmask truth tables, sieves, numerical evaluation with Math.sin / Math.asin, geometric constructions, or
 * coordinate checks (perpendicularity, Lagrange's identity, collinearity).
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { fmt, gcd, near, neg, simpson, sup } from "../family-kit";
import { evaluate, parse } from "../answer-types";

const CRV = "MATH.probability.continuous-random-variables";
const IND = "MATH.probability.independent-events";
const RV = "MATH.probability.random-variables";
const TOT = "MATH.probability.total-probability";
const LOG = "MATH.reasoning.logic";
const PROP = "MATH.reasoning.propositional-logic";
const DISP = "MATH.statistics.dispersion";
const MD = "MATH.statistics.mean-deviation";
const COMP = "MATH.trigonometry.compound-angle-identities";
const EQN = "MATH.trigonometry.equations";
const TF = "MATH.trigonometry.functions";
const RAD = "MATH.trigonometry.radians";
const TRL = "MATH.trigonometry.triangle-laws";
const INV = "MATH.trigonometry.inverse";
const VA = "MATH.vectors.algebra";
const DC = "MATH.vectors.direction-cosines";
const VP = "MATH.vectors.products";
const TP = "MATH.vectors.triple-products";
const INTG = "MATH.calculus.definite-integrals";
const COND = "MATH.probability.conditional";
const DETM = "MATH.algebra.determinants";
const RATIOS = "MATH.trigonometry.ratios";
const SURDS = "MATH.number.radicals";
const MEAN = "MATH.statistics.grouped-mean";

// ---------------------------------------------------------------- helpers

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi"];
const nameOf = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const hsh = (p: number[], salt = 0) => {
  let h = (2166136261 ^ salt) >>> 0;
  for (const v of p) h = Math.imul(h ^ (v + 1000), 16777619) >>> 0;
  return h ^ (h >>> 13);
};
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
/** A fraction as printed, with a true minus sign. */
const F = (x: number) => neg(fmt(x));
const inBox = (p: number[], d: [number, number][]) => p.length === d.length && p.every((v, i) => Number.isInteger(v) && v >= d[i][0] && v <= d[i][1]);
const gate = (d: [number, number][], keep: (p: number[]) => boolean, why: string) => (p: number[]) => (inBox(p, d) && keep(p) ? null : why);
const lv = (x: number, a: number, b: number): 1 | 2 | 3 => (x <= a ? 1 : x <= b ? 2 : 3);
/** The numerical value of an answer written as a number or an exact expression (√, π allowed). */
const num = (v: Value): number | null => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return null;
  try {
    const x = evaluate(parse(v), {});
    return Number.isFinite(x) ? x : null;
  } catch {
    return null;
  }
};
const tup = (v: Value): number[] | null => {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/^\(/, "").replace(/\)$/, "");
  try {
    const xs = s.split(",").map((x) => evaluate(parse(x), {}));
    return xs.every(Number.isFinite) ? xs : null;
  } catch {
    return null;
  }
};
const tupS = (xs: (number | string)[]) => `(${xs.map((x) => (typeof x === "number" ? F(x) : x)).join(", ")})`;
const sqf = (n: number): [number, number] => {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++) while (m % (p * p) === 0) {
    m /= p * p;
    k *= p;
  }
  return [k, m];
};
/** (p/q)√m, reduced, as printed. */
const surdQ = (p: number, q: number, m: number): string => {
  if (p === 0) return "0";
  if (q < 0) {
    p = -p;
    q = -q;
  }
  const g = gcd(p, q);
  p /= g;
  q /= g;
  const a = Math.abs(p);
  const s = p < 0 ? "−" : "";
  if (m === 1) return `${s}${a}${q === 1 ? "" : `/${q}`}`;
  return `${s}${a === 1 ? "" : a}√${m}${q === 1 ? "" : `/${q}`}`;
};
/** √N simplified. */
const rootS = (N: number) => {
  const [k, m] = sqf(N);
  return surdQ(k, 1, m);
};
/** d/√N, rationalised. */
const overRoot = (d: number, N: number) => {
  const [k, m] = sqf(N);
  return surdQ(d, k * m, m);
};
/** √(P/Q), rationalised. */
const fracRoot = (P: number, Q: number) => {
  const g = gcd(P, Q);
  const [k, m] = sqf((P / g) * (Q / g));
  return surdQ(k, Q / g, m);
};
const piStr = (n: number, d: number) => {
  if (n === 0) return "0";
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  n /= g;
  d /= g;
  const a = Math.abs(n);
  return `${n < 0 ? "−" : ""}${a === 1 ? "" : a}π${d === 1 ? "" : `/${d}`}`;
};
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i]);
const len2 = (a: number[]) => dot(a, a);
const isZero = (a: number[]) => a.every((x) => x === 0);
/** A vector in î, ĵ, k̂ form. */
const vt = (v: number[]) => {
  const u = ["î", "ĵ", "k̂"];
  const terms = v.map((c, i) => [c, u[i]] as const).filter(([c]) => c !== 0);
  if (!terms.length) return "0";
  return terms.map(([c, e], j) => `${c < 0 ? (j ? " − " : "−") : j ? " + " : ""}${Math.abs(c) === 1 ? "" : Math.abs(c)}${e}`).join("");
};
const pt = (v: number[]) => `(${v.map((x) => neg(x)).join(", ")})`;
const xpow = (n: number) => (n === 0 ? "" : n === 1 ? "x" : `x${sup(n)}`);
const signedTerm = (c: number, t: string, first = false) => `${c < 0 ? (first ? "−" : " − ") : first ? "" : " + "}${Math.abs(c) === 1 && t ? "" : Math.abs(c)}${t}`;

// ---------------------------------------------------------------- exact numbers in Q(√2, √3) (trigonometry)

type Qn = [number, number];
const qn = (n: number, d = 1): Qn => {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
};
const qadd = (a: Qn, b: Qn) => qn(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const qmul = (a: Qn, b: Qn) => qn(a[0] * b[0], a[1] * b[1]);
type S = Map<number, Qn>;
const sOf = (n: number, d = 1, m = 1): S => (n === 0 ? new Map() : new Map([[m, qn(n, d)]]));
const sClean = (s: S): S => new Map([...s].filter(([, r]) => r[0] !== 0));
const sAdd = (a: S, b: S): S => {
  const o = new Map(a);
  for (const [m, r] of b) o.set(m, qadd(o.get(m) ?? [0, 1], r));
  return sClean(o);
};
const sNeg = (a: S): S => new Map([...a].map(([m, r]) => [m, [-r[0], r[1]] as Qn]));
const sSub = (a: S, b: S) => sAdd(a, sNeg(b));
const sMul = (a: S, b: S): S => {
  let o: S = new Map();
  for (const [m1, r1] of a)
    for (const [m2, r2] of b) {
      const [k, m] = sqf(m1 * m2);
      o = sAdd(o, new Map([[m, qmul(qmul(r1, r2), [k, 1])]]));
    }
  return o;
};
const sScale = (a: S, r: Qn) => sMul(a, new Map([[1, qn(r[0], r[1])]]));
const sConj = (a: S, p: number): S => new Map([...a].map(([m, r]) => [m, (m % p === 0 ? [-r[0], r[1]] : r) as Qn]));
const sInv = (x: S): S => {
  const c2 = sConj(x, 2);
  const y = sMul(x, c2);
  const c3 = sConj(y, 3);
  const z = sMul(y, c3);
  const r = z.get(1);
  if (!r || z.size !== 1) throw new Error("division by zero");
  return sScale(sMul(c2, c3), [r[1], r[0]]);
};
const sDiv = (a: S, b: S) => sMul(a, sInv(b));
const sVal = (x: S) => [...x].reduce((s, [m, r]) => s + (r[0] / r[1]) * Math.sqrt(m), 0);
const sFmt = (x: S): string => {
  const ts = [1, 6, 3, 2].filter((m) => x.has(m)).map((m) => [m, x.get(m)!] as const);
  if (!ts.length) return "0";
  const D = ts.reduce((d, [, r]) => (d * r[1]) / gcd(d, r[1]), 1);
  let cs = ts.map(([m, r]) => [m, (r[0] * D) / r[1]] as [number, number]);
  const g = cs.reduce((g, [, c]) => gcd(g, c), D);
  const den = D / g;
  cs = cs.map(([m, c]) => [m, c / g]);
  const allNeg = cs.every(([, c]) => c < 0);
  const term = (m: number, c: number) => (m === 1 ? String(Math.abs(c)) : `${Math.abs(c) === 1 ? "" : Math.abs(c)}√${m}`);
  const line = (xs: [number, number][]) => xs.map(([m, c], j) => `${c < 0 ? (j ? " − " : "−") : j ? " + " : ""}${term(m, c)}`).join("");
  if (cs.length === 1) return `${line(cs)}${den === 1 ? "" : `/${den}`}`;
  if (den === 1) return line([...cs].sort((a, b) => (b[1] > 0 ? 1 : 0) - (a[1] > 0 ? 1 : 0)));
  if (allNeg) return `−(${line(cs.map(([m, c]) => [m, -c]))})/${den}`;
  return `(${line([...cs].sort((a, b) => (b[1] > 0 ? 1 : 0) - (a[1] > 0 ? 1 : 0)))})/${den}`;
};
const SB: Record<number, S> = { 0: new Map(), 30: sOf(1, 2), 45: sOf(1, 2, 2), 60: sOf(1, 2, 3), 90: sOf(1) };
/** sin of a multiple of 30° or 45°, exactly. */
const sinE = (d: number): S => {
  const r = ((d % 360) + 360) % 360;
  if (r <= 90) return SB[r];
  if (r <= 180) return SB[180 - r];
  if (r <= 270) return sNeg(SB[r - 180]);
  return sNeg(SB[360 - r]);
};
const cosE = (d: number) => sinE(d + 90);
const FN = ["sin", "cos", "tan", "cosec", "sec", "cot"];
/** f(d°) exactly, or null where it is undefined. */
const fE = (f: number, d: number): S | null => {
  const s = sinE(d);
  const c = cosE(d);
  try {
    return [() => s, () => c, () => sDiv(s, c), () => sInv(s), () => sInv(c), () => sDiv(c, s)][f]();
  } catch {
    return null;
  }
};
const fNum = (f: number, x: number) => [Math.sin(x), Math.cos(x), Math.tan(x), 1 / Math.sin(x), 1 / Math.cos(x), 1 / Math.tan(x)][f];
const deg = (d: number) => (d * Math.PI) / 180;

// ---------------------------------------------------------------- logic

const LITS = ["p", "¬p", "q", "¬q", "r", "¬r"];
const OPS = ["∧", "∨", "→", "↔"];
/** Connectives 0 ∧, 1 ∨, 2 →, 3 ↔; 4 is exclusive or ("one but not both"), used only for the misreading of ∨. */
const opB = (o: number, x: boolean, y: boolean) => [x && y, x || y, !x || y, x === y, x !== y][o];
const opM = (o: number, x: number, y: number, mask: number) => [x & y, x | y, (~x | y) & mask, ~(x ^ y) & mask, (x ^ y) & mask][o];
const pop = (x: number) => {
  let c = 0;
  for (; x; x &= x - 1) c++;
  return c;
};

// ---------------------------------------------------------------- statistics

const meanOf = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

// ---------------------------------------------------------------- the families

const D_PDFP: [number, number][] = [[1, 3], [2, 6], [0, 5], [1, 6]];
const K_PDFP = ([n, a, b, c]: number[]) => a ** (n + 1) <= 1000 && b < c && c <= a && !(b === 0 && c === a);
const pdfK = (n: number, a: number) => {
  const g = gcd(n + 1, a ** (n + 1));
  return [(n + 1) / g, a ** (n + 1) / g];
};
const pdfText = (n: number, a: number) => {
  const [p, q] = pdfK(n, a);
  return `${p === 1 ? "" : p}${xpow(n)}/${q}`;
};

const D_PDFK: [number, number][] = [[0, 3], [0, 5], [1, 9]];
const K_PDFK = ([n, lo, hi]: number[]) => hi > lo && hi ** (n + 1) - lo ** (n + 1) <= 1000 && !(n === 0 && lo === 0);

const D_INDU: [number, number][] = [[1, 9], [1, 9], [0, 3]];
const indDec = (a: number) => `0.${a}`;

const D_INDT: [number, number][] = [[6, 30], [2, 6], [1, 29]];
const indtCounts = ([N, a, m]: number[]) => ({ nA: Math.floor(N / a), nB: m, nAB: Math.floor(m / a) });
const indtAns = (p: number[]) => {
  const { nA, nB, nAB } = indtCounts(p);
  return nAB === 0 ? 1 : nAB * p[0] === nA * nB ? 0 : 2;
};
const K_INDT = (p: number[]) => {
  const [N, a, m] = p;
  if (m >= N || a > N) return false;
  const ans = indtAns(p);
  // about as many problems of each kind (independent ones are the rarest)
  const h = hsh(p, 4) >>> 0;
  return ans === 0 || (ans === 1 && h % 5 < 3) || (ans === 2 && h % 20 < 3);
};
const INDT_CHOICES = ["A and B are independent", "A and B are mutually exclusive, so they are not independent", "A and B are neither independent nor mutually exclusive"];

const D_RV: [number, number][] = [[-2, 3], [1, 4], [1, 4], [1, 4], [1, 4]];
/** The weights in lowest terms (proportional weights give the same table, so the same question). */
const K_RV = ([, ...w]: number[]) => w.reduce((g, x) => gcd(g, x), 0) === 1;
const rvData = ([s, ...w]: number[]) => {
  const xs = [s, s + 1, s + 2, s + 3];
  const T = w.reduce((a, b) => a + b, 0);
  return { xs, w, T };
};
const rvTable = (p: number[]) => {
  const { xs, w, T } = rvData(p);
  return { type: "table" as const, head: ["x", ...xs.map((x) => neg(x))], rows: [["P(X = x)", ...w.map((v) => F(v / T))]] };
};

const D_TOT: [number, number][] = [[1, 5], [1, 6], [1, 6], [1, 6], [1, 6]];
const dieFaces = (k: number) => (k === 1 ? "1" : `${Array.from({ length: k - 1 }, (_, i) => i + 1).join(", ")} or ${k}`);

const D_CONV: [number, number][] = [[0, 2], [2, 30], [2, 30]];
const K_CONV = ([kind, a, b]: number[]) =>
  kind === 1 ? b === 2 : kind === 2 ? a < b && b <= 12 && a * b <= 120 : a !== b && (a % b === 0 || b % a === 0 || hsh([a, b], 8) % 9 === 0);
const squareFree = (a: number) => sqf(a)[0] === 1;
const convTruth = ([kind, a, b]: number[]) => (kind === 0 ? [a % b === 0, b % a === 0] : kind === 1 ? [true, squareFree(a)] : [true, gcd(a, b) === 1]);
const CONV_CHOICES = ["The statement and its converse are both true", "The statement is true, but its converse is false", "The statement is false, but its converse is true", "The statement and its converse are both false"];
const convIndex = (s: boolean, c: boolean) => (s ? (c ? 0 : 1) : c ? 2 : 3);
const convStatements = ([kind, a, b]: number[]) =>
  kind === 0
    ? [`If n is a multiple of ${a}, then n is a multiple of ${b}.`, `If n is a multiple of ${b}, then n is a multiple of ${a}.`]
    : kind === 1
      ? [`If n is a multiple of ${a}, then n² is a multiple of ${a}.`, `If n² is a multiple of ${a}, then n is a multiple of ${a}.`]
      : [`If n is a multiple of ${a * b}, then n is a multiple of both ${a} and ${b}.`, `If n is a multiple of both ${a} and ${b}, then n is a multiple of ${a * b}.`];

const D_CEX: [number, number][] = [[-8, 12], [2, 299]];
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
const cexF = (a: number, c: number) => (n: number) => n * n + a * n + c;
const cexAns = (a: number, c: number) => {
  for (let n = 1; n <= 300; n++) if (!isPrime(cexF(a, c)(n))) return n;
  return 0;
};
const K_CEX = ([a, c]: number[]) => {
  if (!isPrime(c)) return false;
  const k = cexAns(a, c);
  return k >= 3 && k <= 80;
};
const cexText = (a: number, c: number) => `n²${a === 0 ? "" : signedTerm(a, "n")} + ${c}`;

const D_ROWS: [number, number][] = [[0, 5], [0, 3], [0, 5], [0, 3], [0, 5]];
const K_ROWS = ([x, , y, , z]: number[]) => new Set([x >> 1, y >> 1, z >> 1]).size === 3;
const rowsCount = ([x, o1, y, o2, z]: number[], swap: (o: number) => number = (o) => o, rev = false) => {
  let c = 0;
  for (let r = 0; r < 8; r++) {
    const v = [Boolean(r & 4), Boolean(r & 2), Boolean(r & 1)];
    const L = (i: number) => (i % 2 ? !v[i >> 1] : v[i >> 1]);
    const ap = (o: number, s: boolean, t: boolean) => (rev && o === 2 ? opB(2, t, s) : opB(swap(o), s, t));
    if (ap(o2, ap(o1, L(x), L(y)), L(z))) c++;
  }
  return c;
};
const rowsText = ([x, o1, y, o2, z]: number[]) => `(${LITS[x]} ${OPS[o1]} ${LITS[y]}) ${OPS[o2]} ${LITS[z]}`;
const SENT = [["Anu studies", "Anu does not study"], ["it rains", "it does not rain"], ["the shop is open", "the shop is not open"]];
const sentLit = (i: number) => SENT[i >> 1][i % 2];
const joinS = (o: number, s: string, t: string) => [`${s} and ${t}`, `${s} or ${t}`, `if ${s}, then ${t}`, `${s} if and only if ${t}`][o];

const D_CLASS: [number, number][] = [[0, 3], [0, 3], [0, 3], [0, 3], [0, 3], [0, 3], [0, 3]];
const L2 = ["p", "¬p", "q", "¬q"];
const classMask = ([A, o1, B, o2, C, o3, D]: number[]) => {
  const lm = (i: number) => {
    const m = i >> 1 ? 0b1010 : 0b1100;
    return i % 2 ? ~m & 15 : m;
  };
  return opM(o2, opM(o1, lm(A), lm(B), 15), opM(o3, lm(C), lm(D), 15), 15);
};
const classRows = ([A, o1, B, o2, C, o3, D]: number[]) => {
  const out: boolean[] = [];
  for (const [pv, qv] of [[true, true], [true, false], [false, true], [false, false]]) {
    const L = (i: number) => {
      const v = i >> 1 ? qv : pv;
      return i % 2 ? !v : v;
    };
    out.push(opB(o2, opB(o1, L(A), L(B)), opB(o3, L(C), L(D))));
  }
  return out;
};
const K_CLASS = (p: number[]) => {
  const [A, , B, , C, , D] = p;
  if (A >> 1 === B >> 1 || C >> 1 === D >> 1) return false;
  const t = pop(classMask(p));
  // about as many tautologies as contradictions and contingencies (tautologies are the most common)
  const h = hsh(p, 11) >>> 0;
  return t === 0 || (t === 4 && h % 8 < 3) || (t !== 4 && h % 9 === 0);
};
const classText = ([A, o1, B, o2, C, o3, D]: number[]) => `(${L2[A]} ${OPS[o1]} ${L2[B]}) ${OPS[o2]} (${L2[C]} ${OPS[o3]} ${L2[D]})`;
const SENT2 = ["the bus is late", "the bus is not late", "Kavya walks to school", "Kavya does not walk to school"];
const classWords = ([A, o1, B, o2, C, o3, D]: number[]) => joinS(o2, `[${joinS(o1, SENT2[A], SENT2[B])}]`, `[${joinS(o3, SENT2[C], SENT2[D])}]`).replace(/^./, (ch) => ch.toUpperCase());

const D_VAR: [number, number][] = [[1, 20], [1, 5], [1, 6], [1, 6], [1, 6], [1, 6], [1, 6]];
const varData = ([a, d, ...f]: number[]) => ({ xs: [0, 1, 2, 3, 4].map((i) => a + i * d), f });
const varTable = (p: number[]) => {
  const { xs, f } = varData(p);
  return { type: "table" as const, head: ["x", ...xs.map(String)], rows: [["f", ...f.map(String)]] };
};

const D_SD: [number, number][] = [[2, 30], [2, 30], [2, 30], [2, 30], [2, 30], [2, 30]];
const K_SD = (p: number[]) => new Set(p).size >= 3;
const sdM = (xs: number[]) => {
  const n = xs.length;
  const S = xs.reduce((a, b) => a + b, 0);
  const Q = xs.reduce((a, b) => a + b * b, 0);
  return n * Q - S * S;
};

const D_CV: [number, number][] = [[30, 70], [2, 14], [30, 70], [2, 14]];
const K_CV = (p: number[]) => {
  const [m1, s1, m2, s2] = p;
  if (m1 === m2 || s1 === s2) return false;
  // equal coefficients of variation (equally consistent) are rare: keep all of them and a matching share of the rest
  if (s1 * m2 === s2 * m1) return true;
  const h = hsh(p, 5) >>> 0;
  if (h % 120 !== 0) return false;
  const sdLow = s1 < s2;
  const cvLow = s1 * m2 < s2 * m1;
  return sdLow !== cvLow || h % 360 === 0;
};
const cvNames = ([m1, , m2]: number[]) => {
  const n1 = nameOf(m1);
  return [n1, nameOf(m2 + 1) === n1 ? nameOf(m2 + 2) : nameOf(m2 + 1)];
};
const cvIndex = ([m1, s1, m2, s2]: number[]) => (s1 * m2 === s2 * m1 ? 2 : s1 * m2 < s2 * m1 ? 0 : 1);

const D_MD6: [number, number][] = [[1, 40], [1, 40], [1, 40], [1, 40], [1, 40], [1, 40]];
const K_MD6 = (p: number[]) => new Set(p).size >= 4;
const D_MD7: [number, number][] = [[1, 50], [1, 50], [1, 50], [1, 50], [1, 50], [1, 50], [1, 50]];
const median7 = (xs: number[]) => [...xs].sort((a, b) => a - b)[3];
const K_MD7 = (p: number[]) => new Set(p).size === 7 && p[3] !== median7(p);

const CA = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 45, 135, 225, 315];
const CB = [30, 45, 60, 120, 135, 150];
const D_COMP: [number, number][] = [[0, 14], [0, 5], [0, 1], [0, 2]];
/** A ± B must be an odd multiple of 15° (not itself a standard angle, which needs no formula). */
const K_COMP = ([ai, bi, o, f]: number[]) => {
  const A = CA[ai];
  const B = CB[bi];
  const S = o ? A - B : A + B;
  return S % 30 !== 0 && S % 45 !== 0 && !(f === 2 && (A === 90 || A === 270));
};
const compParts = (A: number, B: number) => ({ sA: sinE(A), cA: cosE(A), sB: sinE(B), cB: cosE(B) });
/** f(A ± B) by the compound-angle formula (o = 0: +, 1: −); flip uses the wrong sign in the formula. */
const compValue = (f: number, A: number, B: number, o: number, flip = false): S => {
  const { sA, cA, sB, cB } = compParts(A, B);
  const plus = (o === 0) !== flip;
  if (f === 0) return plus ? sAdd(sMul(sA, cB), sMul(cA, sB)) : sSub(sMul(sA, cB), sMul(cA, sB));
  if (f === 1) return plus ? sSub(sMul(cA, cB), sMul(sA, sB)) : sAdd(sMul(cA, cB), sMul(sA, sB));
  const tA = sDiv(sA, cA);
  const tB = sDiv(sB, cB);
  const top = o === 0 ? sAdd(tA, tB) : sSub(tA, tB);
  const bot = (o === 0) !== flip ? sSub(sOf(1), sMul(tA, tB)) : sAdd(sOf(1), sMul(tA, tB));
  return sDiv(top, bot);
};

const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];
const D_DBL: [number, number][] = [[0, 4], [0, 1], [1, 4], [0, 2]];
const QSIGN = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
const QTEXT = ["0 < A < π/2", "π/2 < A < π", "π < A < 3π/2", "3π/2 < A < 2π"];
const dblSC = ([t, , q]: number[]) => {
  const [a, b, c] = TRIPLES[t];
  const [ss, sc] = QSIGN[q - 1];
  return [(ss * a) / c, (sc * b) / c];
};
const dblOf = (h: number, s: number, c: number) => [2 * s * c, c * c - s * s, (2 * (s / c)) / (1 - (s / c) ** 2)][h];
const DBL_F = ["sin 2A", "cos 2A", "tan 2A"];

const D_P2S: [number, number][] = [[0, 3], [2, 9], [1, 8]];
const K_P2S = ([, a, b]: number[]) => b < a;
const ax = (k: number) => (k === 1 ? "x" : `${k}x`);
const p2sText = (t: number, a: number, b: number) => [`2 sin ${ax(a)} cos ${ax(b)}`, `2 cos ${ax(a)} sin ${ax(b)}`, `2 cos ${ax(a)} cos ${ax(b)}`, `2 sin ${ax(a)} sin ${ax(b)}`][t];
const p2sFn = (t: number, a: number, b: number) => (x: number) => [2 * Math.sin(a * x) * Math.cos(b * x), 2 * Math.cos(a * x) * Math.sin(b * x), 2 * Math.cos(a * x) * Math.cos(b * x), 2 * Math.sin(a * x) * Math.sin(b * x)][t];
/** The four sum forms offered for a product: [the right one, the sign slip, halved, the other slip]; each as text and
 * as a number-valued function, built from its terms (c₁ f₁(m₁x) + c₂ f₂(m₂x), times h). */
const p2sForms = (t: number, a: number, b: number) => {
  const s = a + b;
  const d = a - b;
  const fn = t <= 1 ? "sin" : "cos";
  const other = t <= 1 ? "cos" : "sin";
  type Form = [string, number, number, string, number, number, number];
  const right: Form = t === 0 ? [fn, s, 1, fn, d, 1, 1] : t === 1 ? [fn, s, 1, fn, d, -1, 1] : t === 2 ? [fn, s, 1, fn, d, 1, 1] : [fn, d, 1, fn, s, -1, 1];
  const swapped: Form = [right[0], right[1], right[2], right[3], right[4], -right[5], 1];
  const halved: Form = [...right.slice(0, 6), 0.5] as Form;
  const fourth: Form = t === 3 ? [fn, s, 1, fn, d, -1, 1] : [other, s, 1, other, d, right[5], 1];
  const text = ([f1, m1, , f2, m2, c2, h]: Form) => {
    const inner = `${f1} ${ax(m1)} ${c2 < 0 ? "−" : "+"} ${f2} ${ax(m2)}`;
    return h === 1 ? inner : `½(${inner})`;
  };
  const value = ([f1, m1, c1, f2, m2, c2, h]: Form) => (x: number) => h * (c1 * (f1 === "sin" ? Math.sin : Math.cos)(m1 * x) + c2 * (f2 === "sin" ? Math.sin : Math.cos)(m2 * x));
  return [right, swapped, halved, fourth].map((f) => ({ text: text(f), value: value(f) }));
};
/** The order the four forms are shown in (fixed per problem, so the right letter is not always the same). */
const p2sOrder = (p: number[]) => {
  const perms = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0], [1, 2, 3, 0], [2, 0, 1, 3], [3, 1, 0, 2], [0, 3, 2, 1]];
  return perms[(hsh(p, 31) >>> 0) % perms.length];
};

// equations: values of sin, cos, tan with their principal angles (degrees)
type EqVal = { t: string; v: number; a: number; n: string; d: string; s: number };
const EV = (t: string, v: number, a: number, n: string, d: string, s: number): EqVal => ({ t, v, a, n, d, s });
const SINV: EqVal[] = [EV("−1", -1, -90, "1", "1", -1), EV("−√3/2", -Math.sqrt(3) / 2, -60, "√3", "2", -1), EV("−1/√2", -Math.SQRT1_2, -45, "1", "√2", -1), EV("−1/2", -0.5, -30, "1", "2", -1), EV("0", 0, 0, "0", "1", 1), EV("1/2", 0.5, 30, "1", "2", 1), EV("1/√2", Math.SQRT1_2, 45, "1", "√2", 1), EV("√3/2", Math.sqrt(3) / 2, 60, "√3", "2", 1), EV("1", 1, 90, "1", "1", 1)];
const COSV: EqVal[] = SINV.map((e) => ({ ...e, a: 90 - e.a }));
const TANV: EqVal[] = [EV("−√3", -Math.sqrt(3), -60, "√3", "1", -1), EV("−1", -1, -45, "1", "1", -1), EV("−1/√3", -1 / Math.sqrt(3), -30, "1", "√3", -1), EV("0", 0, 0, "0", "1", 1), EV("1/√3", 1 / Math.sqrt(3), 30, "1", "√3", 1), EV("1", 1, 45, "1", "1", 1), EV("√3", Math.sqrt(3), 60, "√3", "1", 1)];
const EQV = [SINV, COSV, TANV];
const kxs = (k: number) => (k === 1 ? "x" : `${k}x`);
const eqText = (f: number, e: EqVal, k: number, w: number) => {
  const fx = `${FN[f]} ${kxs(k)}`;
  if (w === 0 || e.v === 0) return `${fx} = ${e.t}`;
  return `${e.d === "1" ? "" : `${e.d} `}${fx} ${e.s > 0 ? "−" : "+"} ${e.n} = 0`;
};

const D_PRINC: [number, number][] = [[0, 2], [0, 8], [1, 3], [0, 1]];
const PRINC_FORM = "Write every solution as a multiple of π and type only the multipliers, as fractions separated by commas: for example, the solutions π/4 and 3π/2 are typed 1/4, 3/2 (and x = 0 is typed 0).";
const K_PRINC = ([f, v, , w]: number[]) => v < EQV[f].length && !(w === 1 && EQV[f][v].v === 0);
const princSolve = (f: number, a: number, k: number, limit = 360 * k) => {
  const base = f === 0 ? [a, 180 - a] : f === 1 ? [a, -a] : [a, a + 180];
  const out = new Set<number>();
  for (const y0 of base) for (let j = -4; j <= 4 * k; j++) {
    const y = y0 + (f === 2 ? 180 : 360) * j;
    if (y >= 0 && y < limit) out.add(y / k);
  }
  return [...out].sort((x, y) => x - y);
};

// general solutions: the four forms (0 sine type, 1 cosine type, 2 tangent type, 3 one branch only)
const D_GEN: [number, number][] = [[0, 2], [0, 5], [1, 3], [0, 1]];
const GENV = [SINV.filter((e) => Math.abs(e.v) !== 1 && e.v !== 0), COSV.filter((e) => Math.abs(e.v) !== 1 && e.v !== 0), TANV.filter((e) => e.v !== 0)];
const nTerm = (c: number, k: number) => {
  const g = gcd(c, k);
  const a = c / g;
  const d = k / g;
  return `${a === 1 ? "" : a}nπ${d === 1 ? "" : `/${d}`}`;
};
const genOrder = ([, v, k, w]: number[]) => {
  const r = (v + k + w) % 4;
  return [0, 1, 2, 3].map((i) => (i + r) % 4);
};
const genForm = (kind: number, betaN: number, betaD: number, k: number) => {
  const b = piStr(betaN, betaD);
  const ab = piStr(Math.abs(betaN), betaD);
  const sg = betaN < 0 ? "−" : "+";
  return [`x = ${nTerm(1, k)} + (−1)ⁿ(${b}), n ∈ ℤ`, `x = ${nTerm(2, k)} ± ${ab}, n ∈ ℤ`, `x = ${nTerm(1, k)} ${sg} ${ab}, n ∈ ℤ`, `x = ${nTerm(2, k)} ${sg} ${ab}, n ∈ ℤ`][kind];
};
/** The solutions a general-solution form gives, for n from −m to m (radians). */
const genSet = (kind: number, beta: number, k: number, m = 12) => {
  const out: number[] = [];
  for (let n = -m; n <= m; n++) {
    if (kind === 0) out.push((n * Math.PI) / k + (n % 2 ? -beta : beta));
    else if (kind === 1) out.push((2 * n * Math.PI) / k + beta, (2 * n * Math.PI) / k - beta);
    else if (kind === 2) out.push((n * Math.PI) / k + beta);
    else out.push((2 * n * Math.PI) / k + beta);
  }
  return out;
};

const D_VAL: [number, number][] = [[0, 5], [-48, 72]];
const K_VAL = ([f, m]: number[]) => {
  const d = 15 * m;
  return (d % 30 === 0 || d % 45 === 0) && !(d >= 0 && d <= 90) && fE(f, d) !== null;
};
const valText = (f: number, d: number) => (d < 0 ? `${FN[f]}(${neg(d)}°)` : `${FN[f]} ${d}°`);

const D_PER: [number, number][] = [[0, 5], [2, 6], [1, 4], [0, 3]];
const perOrder = ([f, , a, c]: number[]) => {
  const r = (a + c + f) % 4;
  return [0, 1, 2, 3].map((i) => (i + r) % 4);
};
const perValue = (kind: number, k: number) => [(2 * Math.PI) / k, Math.PI / k, 2 * k * Math.PI, k * Math.PI][kind];
const perText = (kind: number, k: number) => [piStr(2, k), piStr(1, k), piStr(2 * k, 1), piStr(k, 1)][kind];
const perExpr = ([f, k, a, c]: number[]) => `y = ${a === 1 ? "" : `${a} `}${FN[f]}(${k}x${c ? ` + ${c}` : ""})`;

const D_RAD: [number, number][] = [[-144, 144]];
const D_DEG: [number, number][] = [[-24, 24], [1, 12]];
const K_DEG = ([k, d]: number[]) => k !== 0 && d !== 7 && d !== 11 && gcd(Math.abs(k), d) === 1 && (d > 1 || Math.abs(k) <= 4);

const D_ARC: [number, number][] = [[0, 2], [1, 30], [1, 24]];
const K_ARC = ([kind, a, b]: number[]) => (kind === 0 ? a <= 6 : kind === 1 ? b >= 2 && b <= 12 && a % b !== 0 : a <= 12 && b <= 12);
const dec = (x: number) => String(x);

const SPAIRS = [[30, 45], [30, 60], [30, 90], [30, 120], [30, 135], [45, 30], [45, 60], [45, 90], [45, 120], [60, 30], [60, 45], [60, 90], [90, 30], [90, 45], [90, 60], [120, 30], [120, 45], [135, 30]];
const D_SINR: [number, number][] = [[0, 17], [2, 20]];
const D_COSR: [number, number][] = [[2, 15], [2, 15], [2, 15]];
const K_COSR = ([a, b, c]: number[]) => a < b + c && b < a + c && c < a + b && !(a === b && b === c) && b * b + c * c !== a * a;
const D_TAREA: [number, number][] = [[2, 20], [2, 20], [0, 6]];
const TANG = [30, 45, 60, 90, 120, 135, 150];
const K_TAREA = ([a, b]: number[]) => a <= b;

// inverse trigonometric functions: arguments with principal values in units of π/12
type IA = { t: string; v: number; k: number };
const ia = (t: string, v: number, k: number): IA => ({ t, v, k });
const r3 = Math.sqrt(3);
const r2 = Math.SQRT2;
const ARGS1 = [ia("−1", -1, 0), ia("−√3/2", -r3 / 2, 0), ia("−1/√2", -1 / r2, 0), ia("−1/2", -0.5, 0), ia("0", 0, 0), ia("1/2", 0.5, 0), ia("1/√2", 1 / r2, 0), ia("√3/2", r3 / 2, 0), ia("1", 1, 0)];
const ARGT = [ia("−√3", -r3, 0), ia("−1", -1, 0), ia("−1/√3", -1 / r3, 0), ia("0", 0, 0), ia("1/√3", 1 / r3, 0), ia("1", 1, 0), ia("√3", r3, 0)];
const ARGS = [ia("−2", -2, 0), ia("−√2", -r2, 0), ia("−2/√3", -2 / r3, 0), ia("−1", -1, 0), ia("1", 1, 0), ia("2/√3", 2 / r3, 0), ia("√2", r2, 0), ia("2", 2, 0)];
const INVT: { n: string; args: IA[] }[] = [
  { n: "sin⁻¹", args: ARGS1.map((x, i) => ({ ...x, k: [-6, -4, -3, -2, 0, 2, 3, 4, 6][i] })) },
  { n: "cos⁻¹", args: ARGS1.map((x, i) => ({ ...x, k: [12, 10, 9, 8, 6, 4, 3, 2, 0][i] })) },
  { n: "tan⁻¹", args: ARGT.map((x, i) => ({ ...x, k: [-4, -3, -2, 0, 2, 3, 4][i] })) },
  { n: "cot⁻¹", args: ARGT.map((x, i) => ({ ...x, k: [10, 9, 8, 6, 4, 3, 2][i] })) },
  { n: "sec⁻¹", args: ARGS.map((x, i) => ({ ...x, k: [8, 9, 10, 12, 0, 2, 3, 4][i] })) },
  { n: "cosec⁻¹", args: ARGS.map((x, i) => ({ ...x, k: [-2, -3, -4, -6, 6, 4, 3, 2][i] })) },
];
const D_INV: [number, number][] = [[0, 5], [0, 8], [0, 5], [0, 8], [0, 2]];
const K_INV = (p: number[]) => {
  const [f, i, g, j, s] = p;
  if (i >= INVT[f].args.length) return false;
  if (s === 0) return g === 0 && j === 0;
  return j < INVT[g].args.length && !(f === g && i === j) && hsh(p, 21) % 14 === 0;
};
const invNum = (f: number, x: number) => {
  if (f === 0) return Math.asin(x);
  if (f === 1) return Math.acos(x);
  if (f === 2) return Math.atan(x);
  if (f === 3) return x > 0 ? Math.atan(1 / x) : x < 0 ? Math.PI + Math.atan(1 / x) : Math.PI / 2;
  if (f === 4) return Math.acos(1 / x);
  return Math.asin(1 / x);
};
const invTerms = ([f, i, g, j, s]: number[]) => (s === 0 ? [{ f, a: INVT[f].args[i], sg: 1 }] : [{ f, a: INVT[f].args[i], sg: 1 }, { f: g, a: INVT[g].args[j], sg: s === 1 ? 1 : -1 }]);
const invExpr = (p: number[]) => invTerms(p).map((t, i) => `${i ? (t.sg > 0 ? " + " : " − ") : ""}${INVT[t.f].n}(${t.a.t})`).join("");
/** The principal value of the matching positive argument (same function), in units of π/12. */
const posK = (f: number, a: IA) => INVT[f].args.find((b) => near(b.v, -a.v))!.k;

const D_INVC: [number, number][] = [[0, 2], [-30, 30], [3, 10]];
const K_INVC = ([f, k, m]: number[]) => {
  if (k === 0 || gcd(Math.abs(k), m) !== 1 || Math.abs(k) > 3 * m) return false;
  const t = k / m;
  return f === 0 ? Math.abs(t) > 0.5 : f === 1 ? t < 0 || t > 1 : Math.abs(t) > 0.5;
};
const invcReduce = (f: number, k: number, m: number, reflect = true) => {
  if (f === 0) {
    let K = ((((k + m) % (2 * m)) + 2 * m) % (2 * m)) - m;
    if (reflect && 2 * K > m) K = m - K;
    if (reflect && 2 * K < -m) K = -m - K;
    return K;
  }
  if (f === 1) {
    let K = ((k % (2 * m)) + 2 * m) % (2 * m);
    if (reflect && K > m) K = 2 * m - K;
    return K;
  }
  let K = ((k % m) + m) % m;
  if (2 * K > m) K -= m;
  return K;
};

const V5: [number, number] = [-5, 5];
const V4: [number, number] = [-4, 4];
const V3: [number, number] = [-3, 3];

const D_LIN: [number, number][] = [V5, V5, V5, V5, V5, V5, V3, V3];
const K_LIN = (p: number[]) => p[6] !== 0 && p[7] !== 0 && !isZero(p.slice(0, 3)) && !isZero(p.slice(3, 6)) && Math.abs(p[6]) + Math.abs(p[7]) > 2;
const D_MAG: [number, number][] = [[-6, 6], [-6, 6], [-6, 6], [-6, 6], [-6, 6], [-6, 6]];
const K_MAG = (p: number[]) => !isZero(sub(p.slice(3), p.slice(0, 3))) && sub(p.slice(3), p.slice(0, 3)).filter((x) => x !== 0).length >= 2;
const D_SEC: [number, number][] = [V5, V5, V5, V5, V5, V5, [1, 4], [1, 4], [0, 1]];
const K_SEC = (p: number[]) => {
  const [, , , , , , m, n, e] = p;
  const P = p.slice(0, 3);
  const Q = p.slice(3, 6);
  return gcd(m, n) === 1 && (e === 0 || m !== n) && !isZero(P) && !isZero(Q) && !isZero(sub(P, Q)) && (e === 1 || m !== n || hsh(p, 3) % 4 === 0);
};
const secPoint = (P: number[], Q: number[], m: number, n: number, e: number) => P.map((x, i) => (e ? (m * Q[i] - n * x) / (m - n) : (m * Q[i] + n * x) / (m + n)));

const D_DC: [number, number][] = [[-6, 6], [-6, 6], [-6, 6], V4, V4, V4];
const K_DC = (p: number[]) => p.slice(0, 3).filter((x) => x !== 0).length >= 2;

const D_VV: [number, number][] = [V4, V4, V4, V4, V4, V4];
const K_ANG = (p: number[]) => !isZero(p.slice(0, 3)) && !isZero(p.slice(3)) && !isZero(cross(p.slice(0, 3), p.slice(3)));
const K_CROSS = (p: number[]) => K_ANG(p) && p.slice(0, 3).filter((x) => x !== 0).length >= 2 && p.slice(3).filter((x) => x !== 0).length >= 2;
const D_TRI: [number, number][] = [V4, V4, V4, V4, V4, V4, V4, V4, V4];
const triV = (p: number[]) => {
  const A = p.slice(0, 3);
  const B = p.slice(3, 6);
  const C = p.slice(6, 9);
  return { A, B, C, AB: sub(B, A), AC: sub(C, A) };
};
const K_TRI = (p: number[]) => {
  const { AB, AC } = triV(p);
  return !isZero(cross(AB, AC));
};
const D_V3: [number, number][] = [V3, V3, V3, V3, V3, V3, V3, V3, V3];
const det3 = (a: number[], b: number[], c: number[]) => a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
const abc = (p: number[]) => [p.slice(0, 3), p.slice(3, 6), p.slice(6, 9)];
const K_STP = (p: number[]) => {
  const [a, b, c] = abc(p);
  return det3(a, b, c) !== 0 && [a, b, c].every((v) => v.filter((x) => x !== 0).length >= 2);
};
const D_COPL: [number, number][] = [V3, V3, V3, V3, V3, V3, V3, V3];
const coplAB = (p: number[]) => {
  const a = p.slice(0, 3);
  const b = p.slice(3, 6);
  const [c1, c2] = p.slice(6, 8);
  const alpha = det3(a, b, [c1, c2, 0]);
  const beta = a[0] * b[1] - a[1] * b[0];
  return { a, b, c1, c2, alpha, beta };
};
const K_COPL = (p: number[]) => {
  const { a, b, alpha, beta, c1, c2 } = coplAB(p);
  return beta !== 0 && alpha !== 0 && !isZero(cross(a, b)) && (c1 !== 0 || c2 !== 0) && a.filter((x) => x !== 0).length >= 2;
};
const K_VTP = (p: number[]) => {
  const [a, b, c] = abc(p);
  const r = cross(a, cross(b, c));
  const w = cross(cross(a, b), c);
  return !isZero(r) && sub(r, w).some((x) => x !== 0) && [a, b, c].every((v) => v.filter((x) => x !== 0).length >= 2);
};

export const B20: Def[] = [
  // ======================================================== continuous random variables
  {
    id: "atpdfp",
    arity: 4,
    title: "Probability from a density function",
    competency: CRV,
    type: "fraction",
    mc: true,
    // [n, a, b, c]: f(x) = (n+1)xⁿ/aⁿ⁺¹ on [0, a]; P(b ≤ X ≤ c)
    parse: none,
    reject: gate(D_PDFP, K_PDFP, "A density k xⁿ on [0, a] (n up to 3) and a probability over [b, c] inside it."),
    prompt: ([n, a, b, c]) => `A continuous random variable X has probability density function f(x) = ${pdfText(n, a)} for 0 ≤ x ≤ ${a}, and f(x) = 0 otherwise. Find ${b === 0 ? `P(X ≤ ${c})` : `P(${b} ≤ X ≤ ${c})`}.`,
    solve: ([n, a, b, c]) => {
      const A = a ** (n + 1);
      const ans = (c ** (n + 1) - b ** (n + 1)) / A;
      return {
        steps: [
          st("cdf", "integrate", INTG, [pdfText(n, a)], `F(x) = x${sup(n + 1)}/${A}`),
          st("limits", "substitute", CRV, [c, b], ans),
        ],
        answer: ans,
      };
    },
    // independent: Simpson's rule on the density itself
    validate: ([n, a, b, c], v) => {
      if (typeof v !== "number") return false;
      const [p, q] = pdfK(n, a);
      return near(simpson((x) => (p / q) * x ** n, b, c, 400), v, 1e-9);
    },
    bugs: ([n, a, b, c]) => {
      const [p, q] = pdfK(n, a);
      const k = p / q;
      const A = a ** (n + 1);
      const out: Bug[] = [
        { id: "density-not-area", kind: "conceptual", competency: CRV, says: b === 0 ? `The density value f(${c}) was taken as the probability; for a continuous variable the probability is the AREA under f, found by integrating.` : `The density values were subtracted, f(${c}) − f(${b}); a probability is the AREA under f between ${b} and ${c}, found by integrating.`, predict: k * (c ** n - b ** n) },
        { id: "power-not-divided", kind: "procedural", competency: INTG, says: `${xpow(n)} was integrated to ${xpow(n + 1)} without dividing by ${n + 1}.`, predict: k * (c ** (n + 1) - b ** (n + 1)) },
      ];
      if (b > 0) out.push({ id: "lower-limit-ignored", kind: "procedural", competency: CRV, says: `Only P(X ≤ ${c}) was found; the part below ${b} must be taken away.`, predict: c ** (n + 1) / A });
      return out;
    },
    variants: ([n, a, b, c]) => [[n, a, 0, c], [n, a, b, a]].filter((q) => K_PDFP(q) && q.join() !== [n, a, b, c].join()),
    explain: (s) => (s.id === "cdf" ? `Integrate the density from 0: ${s.value}` : `P = F(${s.inputs[0]}) − F(${s.inputs[1]}) = ${F(Number(s.value))}`),
    domain: D_PDFP,
    keep: K_PDFP,
    difficulty: ([n]) => (n === 1 ? 1 : n === 2 ? 2 : 3),
    word: ([n, a, b, c]) => `The time X (in hours) that a mobile phone takes to charge fully is modelled by the density f(x) = ${pdfText(n, a)} for 0 ≤ x ≤ ${a}, and 0 otherwise. Find the probability that a charge takes ${b === 0 ? `at most ${c} hour${c === 1 ? "" : "s"}` : `between ${b} and ${c} hours`}.`,
    teach: {
      idea: "For a continuous random variable, probability is AREA under the density curve: P(b ≤ X ≤ c) is the integral of f(x) from b to c, and the whole area is 1.",
      method: "Integrate the density from the lower limit to the upper limit (or find F(x) = P(X ≤ x) first), then subtract: F(c) − F(b).",
      alternatives: [
        { id: "cdf_first", title: "Find the distribution function first", kind: "procedural", text: ["F(x) = ∫ f(t) dt from 0 to x. For f(x) = (n + 1)xⁿ/aⁿ⁺¹ this gives F(x) = (x/a)ⁿ⁺¹.", "Check F(a) = 1, then P(b ≤ X ≤ c) = F(c) − F(b)."] },
        { id: "triangle_area", title: "See it as an area (when f is a straight line)", kind: "conceptual", text: ["When f(x) = 2x/a², the graph from 0 to a is a triangle of base a and height 2/a: area 1.", "P(X ≤ c) is the smaller triangle with base c and height 2c/a², whose area is c²/a²."] },
      ],
    },
    limits: "Densities (n + 1)xⁿ/aⁿ⁺¹ on [0, a] with n from 1 to 3; piecewise and exponential densities are left out.",
  },
  {
    id: "atpdfk",
    arity: 3,
    title: "The constant that makes a density function",
    competency: CRV,
    type: "fraction",
    mc: true,
    // [n, lo, hi]: f(x) = k xⁿ on [lo, hi]
    parse: none,
    reject: gate(D_PDFK, K_PDFK, "f(x) = k xⁿ on [lo, hi] with n up to 3 and a denominator up to 1000."),
    prompt: ([n, lo, hi]) => `The function f(x) = k${xpow(n)} for ${lo} ≤ x ≤ ${hi}, and f(x) = 0 otherwise, is a probability density function. Find the value of k.`,
    solve: ([n, lo, hi]) => {
      const D = hi ** (n + 1) - lo ** (n + 1);
      return {
        steps: [
          st("total", "integrate", INTG, [n, lo, hi], `k(${hi}${sup(n + 1)} − ${lo}${sup(n + 1)})/${n + 1} = ${D}k/${n + 1}`),
          st("solve", "divide", CRV, [n + 1, D], (n + 1) / D),
        ],
        answer: (n + 1) / D,
      };
    },
    // independent: Simpson's rule — with this k the total area must be 1
    validate: ([n, lo, hi], v) => typeof v === "number" && near(simpson((x) => v * x ** n, lo, hi, 400), 1, 1e-9),
    bugs: ([n, lo, hi]) => {
      const D = hi ** (n + 1) - lo ** (n + 1);
      const out: Bug[] = [];
      if (n >= 1) {
        out.push({ id: "power-not-divided", kind: "procedural", competency: INTG, says: `${xpow(n)} was integrated to ${xpow(n + 1)} without dividing by ${n + 1}.`, predict: 1 / D });
        out.push({ id: "height-one", kind: "conceptual", competency: CRV, says: `f(${hi}) was set equal to 1; it is the total AREA under f that must be 1, not its largest value.`, predict: 1 / hi ** n });
      }
      if (lo > 0) out.push({ id: "lower-limit-ignored", kind: "procedural", competency: INTG, says: `The integral was taken from 0 instead of from ${lo}; f is 0 below ${lo}.`, predict: (n + 1) / hi ** (n + 1) });
      return out;
    },
    variants: ([n, lo, hi]) => [[n, 0, hi], [n, lo, hi + 1]].filter((q) => K_PDFK(q) && q.join() !== [n, lo, hi].join()),
    explain: (s) => (s.id === "total" ? `The total area is ${s.value}` : `Set it equal to 1: k = ${s.inputs[0]}/${s.inputs[1]} = ${F(Number(s.value))}`),
    domain: D_PDFK,
    keep: K_PDFK,
    difficulty: ([n, lo]) => (n <= 1 && lo === 0 ? 1 : n <= 2 ? 2 : 3),
    word: ([n, lo, hi]) => `The distance X (in km) that a delivery rider in Chennai travels for one order is modelled by f(x) = k${xpow(n)} for ${lo} ≤ x ≤ ${hi}, and 0 for other distances. For f to be a probability density, what must k be?`,
    teach: {
      idea: "A density never gives negative values and the total area under it is exactly 1 (X must take some value).",
      method: "Integrate k xⁿ over the interval where f is not zero, set the result equal to 1 and solve for k.",
      alternatives: [{ id: "uniform_case", title: "Start from the flat case", kind: "conceptual", text: ["When n = 0, f is a rectangle of width hi − lo, so its height must be 1/(hi − lo).", "For k xⁿ the same idea holds: area = k(hiⁿ⁺¹ − loⁿ⁺¹)/(n + 1) = 1."] }],
    },
    limits: "Powers k xⁿ (n up to 3) on intervals with whole-number end points up to 9; other density shapes are left out.",
  },
  // ======================================================== independent events
  {
    id: "atindu",
    arity: 3,
    title: "Probabilities of independent events",
    competency: IND,
    type: "fraction",
    mc: true,
    // [a, b, kind]: P(A) = a/10, P(B) = b/10; kind 0 both, 1 at least one, 2 neither, 3 exactly one
    parse: none,
    reject: gate(D_INDU, () => true, "P(A), P(B) in tenths; both, at least one, neither or exactly one."),
    prompt: ([a, b, k]) => `A and B are independent events with P(A) = ${indDec(a)} and P(B) = ${indDec(b)}. Find ${["P(A ∩ B)", "P(A ∪ B)", "the probability that neither A nor B happens", "the probability that exactly one of A and B happens"][k]}.`,
    solve: ([a, b, k]) => {
      const pa = a / 10;
      const pb = b / 10;
      const both = pa * pb;
      const ans = [both, pa + pb - both, (1 - pa) * (1 - pb), pa + pb - 2 * both][k];
      return { steps: [st("both", "multiply", IND, [pa, pb], both), st("combine", "combine", IND, [k], ans)], answer: ans };
    },
    // independent: a 10 × 10 grid of equally likely outcomes, A in the first a rows, B in the first b columns
    validate: ([a, b, k], v) => {
      if (typeof v !== "number") return false;
      let c = 0;
      for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
        const A = i < a;
        const B = j < b;
        if ([A && B, A || B, !A && !B, A !== B][k]) c++;
      }
      return near(c / 100, v, 1e-9);
    },
    bugs: ([a, b, k]) => {
      const pa = a / 10;
      const pb = b / 10;
      if (k === 0) return [
        { id: "exclusive-for-independent", kind: "conceptual", competency: IND, says: "Independent events were treated as if they cannot happen together; independent means P(A ∩ B) = P(A) × P(B).", predict: 0 },
        { id: "add-for-and", kind: "procedural", competency: IND, says: "The probabilities were added; for both of two independent events to happen, multiply them.", predict: pa + pb },
      ];
      if (k === 1) return [
        { id: "no-overlap-taken", kind: "procedural", competency: IND, says: "P(A) and P(B) were added without taking away P(A ∩ B), so the outcomes where both happen were counted twice.", predict: pa + pb },
        { id: "union-as-product", kind: "conceptual", competency: IND, says: "'At least one' was worked out as 'both'.", predict: pa * pb },
      ];
      if (k === 2) return [
        { id: "exclusive-complement", kind: "procedural", competency: IND, says: "1 − P(A) − P(B) treats A and B as unable to happen together; for independent events use (1 − P(A))(1 − P(B)).", predict: 1 - pa - pb },
        { id: "complement-of-both", kind: "conceptual", competency: IND, says: "'Neither' was taken as 'not both', 1 − P(A ∩ B); 'neither' means A does not happen AND B does not happen.", predict: 1 - pa * pb },
      ];
      return [
        { id: "union-for-exactly-one", kind: "conceptual", competency: IND, says: "P(A ∪ B) includes the outcomes where both happen; 'exactly one' leaves them out.", predict: pa + pb - pa * pb },
        { id: "one-way-only", kind: "procedural", competency: IND, says: "Only 'A but not B' was counted; 'B but not A' is the other way of exactly one happening.", predict: pa * (1 - pb) },
      ];
    },
    variants: ([a, b, k]) => [0, 1, 2, 3].filter((x) => x !== k).map((x) => [a, b, x]),
    explain: (s) => (s.id === "both" ? `P(A ∩ B) = P(A) × P(B) = ${s.inputs[0]} × ${s.inputs[1]} = ${dec(+Number(s.value).toFixed(4))}` : `Combine: ${["P(A ∩ B)", "P(A) + P(B) − P(A ∩ B)", "(1 − P(A))(1 − P(B))", "P(A) + P(B) − 2P(A ∩ B)"][Number(s.inputs[0])]} = ${F(Number(s.value))}`),
    domain: D_INDU,
    difficulty: ([, , k]) => (k === 0 ? 1 : k === 1 ? 2 : 3),
    word: ([a, b, k]) => {
      const n1 = nameOf(a);
      const n2 = nameOf(b + 3) === n1 ? nameOf(b + 4) : nameOf(b + 3);
      return `${n1} and ${n2} try to solve a puzzle on their own, independently. The probability that ${n1} solves it is ${indDec(a)} and that ${n2} solves it is ${indDec(b)}. Find the probability that ${["both of them solve it", "at least one of them solves it", "neither of them solves it", "exactly one of them solves it"][k]}.`;
    },
    decimals: true,
    teach: {
      idea: "A and B are independent when knowing that one happened does not change the chance of the other, so P(A ∩ B) = P(A) × P(B).",
      method: "Multiply for 'both'. Use P(A ∪ B) = P(A) + P(B) − P(A ∩ B) for 'at least one', complements (1 − P) for 'not', and add the two separate ways for 'exactly one'.",
      alternatives: [{ id: "grid", title: "A 10 by 10 grid", kind: "conceptual", text: ["Shade 10 × P(A) rows for A and 10 × P(B) columns for B in a 10 by 10 grid of equally likely squares.", "Both is the overlap of rows and columns; count the squares you need and divide by 100."] }],
    },
    limits: "Probabilities in tenths for two independent events; three or more events are left out.",
  },
  {
    id: "atindt",
    arity: 3,
    title: "Independent or mutually exclusive?",
    competency: IND,
    type: "choice",
    // [N, a, m]: a number from 1..N; A = multiple of a, B = at most m
    parse: none,
    reject: gate(D_INDT, K_INDT, "A number from 1 to N (6–30); A a multiple of a, B at most m."),
    choices: () => INDT_CHOICES,
    prompt: ([N, a, m]) => `A number is chosen at random from 1, 2, 3, …, ${N}. Let A be the event "the number is a multiple of ${a}" and B the event "the number is at most ${m}". Which statement is true?`,
    solve: (p) => {
      const { nA, nB, nAB } = indtCounts(p);
      const ans = indtAns(p);
      return { steps: [st("count", "count", COND, [nA, nB, nAB], nAB), st("compare", "compare", IND, [nAB * p[0], nA * nB], ans)], answer: ans };
    },
    // independent: list the outcomes one by one and compare the probabilities as decimals
    validate: ([N, a, m], v) => {
      let nA = 0;
      let nB = 0;
      let nAB = 0;
      for (let k = 1; k <= N; k++) {
        const A = k % a === 0;
        const B = k <= m;
        if (A) nA++;
        if (B) nB++;
        if (A && B) nAB++;
      }
      const ind = near(nAB / N, (nA / N) * (nB / N), 1e-12);
      return v === (nAB === 0 ? 1 : ind ? 0 : 2);
    },
    bugs: (p) => {
      const ans = indtAns(p);
      const { nA, nB, nAB } = indtCounts(p);
      return [
        { id: "independent-means-apart", kind: "conceptual", competency: IND, says: "'Independent' was taken to mean 'cannot happen together'. That is mutually exclusive; independent means P(A ∩ B) = P(A) × P(B).", predict: ans === 1 ? 0 : ans === 0 ? 2 : null },
        { id: "counts-not-probabilities", kind: "procedural", competency: IND, says: "n(A ∩ B) was compared with n(A) × n(B); the test uses probabilities: n(A ∩ B)/N against (n(A)/N) × (n(B)/N).", predict: ans === 0 && nAB !== nA * nB ? 2 : null },
      ];
    },
    variants: ([N, a, m]) => [[N, a, m + 1], [N, a, m - 1]].filter((q) => inBox(q, D_INDT) && K_INDT(q)),
    explain: (s) => (s.id === "count" ? `n(A) = ${s.inputs[0]}, n(B) = ${s.inputs[1]}, n(A ∩ B) = ${s.inputs[2]}` : `Compare N × n(A ∩ B) = ${s.inputs[0]} with n(A) × n(B) = ${s.inputs[1]}: ${INDT_CHOICES[Number(s.value)]}`),
    domain: D_INDT,
    keep: K_INDT,
    cap: 400,
    difficulty: ([N]) => lv(N, 12, 20),
    word: ([N, a, m]) => `In a school lucky draw, ${N} tickets numbered 1 to ${N} are in a box and one is drawn at random. The ${a === 2 ? "even-numbered tickets win a pen" : `tickets whose number is a multiple of ${a} win a pen`} (event A), and the tickets numbered up to ${m} belong to Class XI students (event B). Which statement is true?`,
    teach: {
      idea: "Mutually exclusive events cannot happen together (A ∩ B is empty). Independent events have P(A ∩ B) = P(A) × P(B). Two events that both can happen cannot be both.",
      method: "Count n(A), n(B) and n(A ∩ B). If n(A ∩ B) = 0 they are mutually exclusive. Otherwise compare P(A ∩ B) with P(A) × P(B).",
      alternatives: [{ id: "conditional", title: "Does B change the chance of A?", kind: "conceptual", text: ["Work out P(A) and P(A | B) = n(A ∩ B)/n(B).", "If they are equal, knowing B tells you nothing about A: the events are independent."] }],
    },
    limits: "Events 'a multiple of a' and 'at most m' on 1 to N; dice, cards and three events are left out.",
  },
  // ======================================================== discrete random variables
  {
    id: "atrvmean",
    arity: 5,
    title: "Mean of a discrete random variable",
    competency: RV,
    type: "fraction",
    mc: true,
    decimals: true,
    // [s, w0..w3]: X takes s, s+1, s+2, s+3 with probabilities w_i / Σw
    parse: none,
    reject: gate(D_RV, K_RV, "Four consecutive values with probabilities in small whole-number proportions (in lowest terms: weights 2, 2, 2, 2 are the same table as 1, 1, 1, 1)."),
    prompt: () => `The probability distribution of a random variable X is given in the table. Find the mean E(X).`,
    solve: (p) => {
      const { xs, w, T } = rvData(p);
      const s = xs.reduce((a, x, i) => a + x * w[i], 0);
      return { steps: [st("products", "multiply", RV, [xs.map((x, i) => `${neg(x)} × ${F(w[i] / T)}`).join(" + ")], s / T)], answer: s / T };
    },
    // independent: list T equally likely outcomes (each value repeated in proportion) and average them
    validate: (p, v) => {
      const { xs, w } = rvData(p);
      const list: number[] = [];
      xs.forEach((x, i) => {
        for (let k = 0; k < w[i]; k++) list.push(x);
      });
      return typeof v === "number" && near(meanOf(list), v, 1e-9);
    },
    bugs: (p) => {
      const { xs, w, T } = rvData(p);
      const mu = xs.reduce((a, x, i) => a + x * w[i], 0) / T;
      return [
        { id: "plain-average", kind: "conceptual", competency: RV, says: "The four values were averaged as if equally likely; each value must be weighted by its probability.", predict: meanOf(xs) },
        { id: "divided-by-count", kind: "procedural", competency: RV, says: "Σ x P(x) was divided by the number of values; the probabilities already do the averaging, so E(X) = Σ x P(x).", predict: mu / 4 },
      ];
    },
    variants: (p) => [[p[0] + 1, ...p.slice(1)]].filter((q) => inBox(q, D_RV)),
    explain: (s) => `E(X) = Σ x P(x) = ${s.inputs.join("")} = ${F(Number(s.value))}`,
    domain: D_RV,
    keep: K_RV,
    cap: 400,
    difficulty: ([s]) => (s >= 0 ? 1 : s === -1 ? 2 : 3),
    figure: rvTable,
    word: () => `At a school fair game, a player's gain X (in rupees; a negative gain is a loss) has the probability distribution in the table. Find the expected gain E(X) in rupees.`,
    teach: {
      idea: "The mean of a random variable is a weighted average: each value counts in proportion to its probability.",
      method: "Multiply each value x by its probability P(x) and add the products: E(X) = Σ x P(x).",
      alternatives: [{ id: "many_trials", title: "Imagine many trials", kind: "conceptual", text: ["If the probabilities have denominator T, imagine T trials: value x turns up T × P(x) times.", "Add all the results and divide by T: that average is E(X)."] }],
    },
    limits: "Four consecutive whole-number values with probabilities in sixteenths or simpler; functions of X are left out.",
  },
  {
    id: "atrvvar",
    arity: 5,
    title: "Variance of a discrete random variable",
    competency: RV,
    type: "fraction",
    mc: true,
    parse: none,
    reject: gate(D_RV, K_RV, "Four consecutive values with probabilities in small whole-number proportions (in lowest terms: weights 2, 2, 2, 2 are the same table as 1, 1, 1, 1)."),
    prompt: () => `The probability distribution of a random variable X is given in the table. Find the variance Var(X).`,
    solve: (p) => {
      const { xs, w, T } = rvData(p);
      const mu = xs.reduce((a, x, i) => a + x * w[i], 0) / T;
      const ex2 = xs.reduce((a, x, i) => a + x * x * w[i], 0) / T;
      return { steps: [st("mean", "multiply", RV, [], mu), st("ex2", "multiply", RV, [], ex2), st("var", "subtract", RV, [ex2, mu], ex2 - mu * mu)], answer: ex2 - mu * mu };
    },
    // independent: weighted squared deviations from the mean of the listed outcomes
    validate: (p, v) => {
      const { xs, w, T } = rvData(p);
      const list: number[] = [];
      xs.forEach((x, i) => {
        for (let k = 0; k < w[i]; k++) list.push(x);
      });
      const m = meanOf(list);
      return typeof v === "number" && near(list.reduce((a, x) => a + (x - m) ** 2, 0) / T, v, 1e-9);
    },
    bugs: (p) => {
      const { xs, w, T } = rvData(p);
      const mu = xs.reduce((a, x, i) => a + x * w[i], 0) / T;
      const ex2 = xs.reduce((a, x, i) => a + x * x * w[i], 0) / T;
      return [
        { id: "mean-square-missing", kind: "procedural", competency: RV, says: "E(X²) was given as the variance; the square of the mean must be taken away: Var(X) = E(X²) − [E(X)]².", predict: ex2 },
        { id: "mean-not-squared", kind: "procedural", competency: RV, says: "E(X) was taken away instead of [E(X)]².", predict: ex2 - mu },
        { id: "probabilities-ignored", kind: "conceptual", competency: RV, says: "The four values were treated as equally likely; each squared deviation must be weighted by its probability.", predict: 1.25 },
      ];
    },
    variants: (p) => [[p[0] - 1, ...p.slice(1)]].filter((q) => inBox(q, D_RV)),
    explain: (s) => (s.id === "mean" ? `E(X) = Σ x P(x) = ${F(Number(s.value))}` : s.id === "ex2" ? `E(X²) = Σ x² P(x) = ${F(Number(s.value))}` : `Var(X) = E(X²) − [E(X)]² = ${F(Number(s.inputs[0]))} − (${F(Number(s.inputs[1]))})² = ${F(Number(s.value))}`),
    domain: D_RV,
    keep: K_RV,
    cap: 400,
    difficulty: ([s]) => (s >= 0 ? 2 : 3),
    figure: rvTable,
    word: () => `In a lucky-draw game at a Pongal fair, a player's gain X (in rupees; a negative gain is a loss) has the probability distribution in the table. Find the variance of the gain.`,
    teach: {
      idea: "The variance measures how far the values spread from the mean, each squared distance weighted by its probability.",
      method: "Find E(X) = Σ x P(x) and E(X²) = Σ x² P(x); then Var(X) = E(X²) − [E(X)]².",
      alternatives: [{ id: "deviations", title: "Use deviations from the mean", kind: "procedural", text: ["Work out x − E(X) for each value and square it.", "Multiply each square by P(x) and add: Var(X) = Σ (x − μ)² P(x)."] }],
    },
    limits: "Four consecutive whole-number values with probabilities in sixteenths or simpler.",
  },
  // ======================================================== total probability
  {
    id: "attotal",
    arity: 5,
    title: "The law of total probability (two bags)",
    competency: TOT,
    type: "fraction",
    mc: true,
    // [k, r1, b1, r2, b2]: die shows 1..k → bag I, else bag II
    parse: none,
    reject: gate(D_TOT, () => true, "A die chooses one of two bags of up to 12 balls."),
    prompt: ([k, r1, b1, r2, b2]) => `A die is thrown. If it shows ${dieFaces(k)}, a ball is drawn from Bag I, which has ${r1} red and ${b1} black balls; otherwise a ball is drawn from Bag II, which has ${r2} red and ${b2} black balls. Find the probability that the ball drawn is red.`,
    solve: ([k, r1, b1, r2, b2]) => {
      const p1 = k / 6;
      const ans = p1 * (r1 / (r1 + b1)) + (1 - p1) * (r2 / (r2 + b2));
      return {
        steps: [
          st("bag1", "multiply", COND, [F(p1), F(r1 / (r1 + b1))], p1 * (r1 / (r1 + b1))),
          st("bag2", "multiply", COND, [F(1 - p1), F(r2 / (r2 + b2))], (1 - p1) * (r2 / (r2 + b2))),
          st("total", "add", TOT, [], ans),
        ],
        answer: ans,
      };
    },
    // independent: count equally likely (die face, ball slot) outcomes with L = lcm of the bag sizes slots per bag
    validate: ([k, r1, b1, r2, b2], v) => {
      const n1 = r1 + b1;
      const n2 = r2 + b2;
      const L = (n1 * n2) / gcd(n1, n2);
      let red = 0;
      for (let f = 1; f <= 6; f++) {
        const [r, n] = f <= k ? [r1, n1] : [r2, n2];
        for (let i = 0; i < L; i++) if (Math.floor((i * n) / L) < r) red++;
      }
      return typeof v === "number" && near(red / (6 * L), v, 1e-9);
    },
    bugs: ([k, r1, b1, r2, b2]) => [
      { id: "bags-equally-likely", kind: "conceptual", competency: TOT, says: `The two bags were treated as equally likely; the die chooses Bag I with probability ${k}/6, not 1/2.`, predict: (r1 / (r1 + b1) + r2 / (r2 + b2)) / 2 },
      { id: "pooled-bags", kind: "conceptual", competency: TOT, says: "All the balls were put together in one bag; the bag is chosen first, so each bag's chance must be weighted by the chance of choosing it.", predict: (r1 + r2) / (r1 + b1 + r2 + b2) },
      { id: "one-case-only", kind: "procedural", competency: TOT, says: "Only the Bag I case was counted; a red ball can also come from Bag II, so add both cases.", predict: (k / 6) * (r1 / (r1 + b1)) },
    ],
    variants: ([k, ...r]) => [[k === 3 ? 2 : 3, ...r]],
    explain: (s) => (s.id === "total" ? `Add the two cases: P(red) = ${F(Number(s.value))}` : `P(${s.id === "bag1" ? "Bag I" : "Bag II"}) × P(red | ${s.id === "bag1" ? "Bag I" : "Bag II"}) = ${s.inputs[0]} × ${s.inputs[1]} = ${F(Number(s.value))}`),
    domain: D_TOT,
    cap: 400,
    difficulty: ([k]) => (k === 3 ? 1 : k === 2 || k === 4 ? 2 : 3),
    word: ([k, r1, b1, r2, b2]) => `A factory has two machines. Machine I makes ${k} out of every 6 bulbs and Machine II makes the rest. Of the bulbs from Machine I, ${r1} out of every ${r1 + b1} are faulty; of those from Machine II, ${r2} out of every ${r2 + b2} are faulty. A bulb is picked at random from the day's output. Find the probability that it is faulty.`,
    teach: {
      idea: "When the outcome can come about in separate ways (a partition: Bag I or Bag II), its probability is the sum over the ways of P(way) × P(outcome | way).",
      method: "List the cases, multiply the chance of each case by the chance of red in that case, and add: P(R) = P(E₁)P(R | E₁) + P(E₂)P(R | E₂).",
      alternatives: [{ id: "tree", title: "Draw a tree diagram", kind: "procedural", text: ["First branches: the bags, with their probabilities from the die.", "Second branches: red or black from each bag. Multiply along each red path and add the paths."] }],
    },
    limits: "Two bags chosen by a die; three or more cases and the reverse question (Bayes) are other families.",
  },
  // ======================================================== logic: converses and counterexamples
  {
    id: "atconv",
    arity: 3,
    title: "A statement and its converse",
    competency: LOG,
    type: "choice",
    // [kind, a, b]: kind 0 "multiple of a ⇒ multiple of b"; kind 1 "multiple of a ⇒ n² multiple of a" (b unused, 2)
    parse: none,
    reject: gate(D_CONV, K_CONV, "If-then statements about multiples, with whole numbers from 2 to 30."),
    choices: () => CONV_CHOICES,
    prompt: (p) => `For whole numbers n, consider the statement: "${convStatements(p)[0]}" Which is correct about this statement and its converse?`,
    word: ([kind, a, b]) =>
      kind === 0
        ? `In a counting game, the class says the whole numbers n = 1, 2, 3, … in turn. ${nameOf(a + b)} claps whenever n is a multiple of ${a}, and ${nameOf(a + b + 1)} stamps whenever n is a multiple of ${b}. ${nameOf(a + b)} claims: "${convStatements([kind, a, b])[0]}" (that is, every time I clap, you stamp). Which is correct about this claim (the statement) and its converse?`
        : kind === 2
          ? `${nameOf(a + b)} runs a sweet shop and, for any whole number n, may have n laddus to pack. ${nameOf(a + b)} claims: "${convStatements([kind, a, b])[0]}" (that is, if the laddus fill boxes of ${a * b} exactly, they also fill boxes of ${a} exactly and boxes of ${b} exactly). Which is correct about this claim (the statement) and its converse?`
          : `${nameOf(a + 3)} lays square tiles in an n × n square, for whole numbers n, and then packs all n² tiles into boxes that hold ${a} tiles each. ${nameOf(a + 3)} claims: "${convStatements([kind, a, b])[0]}" (that is, if the side has a multiple of ${a} tiles, the tiles fill the boxes exactly). Which is correct about this claim (the statement) and its converse?`,
    solve: (p) => {
      const [s, c] = convTruth(p);
      return { steps: [st("converse", "converse", LOG, [convStatements(p)[0]], convStatements(p)[1]), st("decide", "decide", LOG, [String(s), String(c)], convIndex(s, c))], answer: convIndex(s, c) };
    },
    // independent: search n = 1 … 3600 for a counterexample to each statement
    validate: ([kind, a, b], v) => {
      let s = true;
      let c = true;
      for (let n = 1; n <= 3600; n++) {
        if (kind === 0) {
          if (n % a === 0 && n % b !== 0) s = false;
          if (n % b === 0 && n % a !== 0) c = false;
        } else if (kind === 2) {
          const both = n % a === 0 && n % b === 0;
          if (n % (a * b) === 0 && !both) s = false;
          if (both && n % (a * b) !== 0) c = false;
        } else {
          if (n % a === 0 && (n * n) % a !== 0) s = false;
          if ((n * n) % a === 0 && n % a !== 0) c = false;
        }
      }
      return v === convIndex(s, c);
    },
    bugs: (p) => {
      const [s] = convTruth(p);
      return [
        { id: "converse-same-truth", kind: "conceptual", competency: LOG, says: "The converse was assumed to be true exactly when the statement is; a converse swaps the 'if' and 'then' parts and must be checked on its own.", predict: s ? 0 : 3 },
        { id: "one-example", kind: "procedural", competency: LOG, says: "One example where both parts are true was taken as proof; a general statement needs every case, and one counterexample shows it is false.", predict: 0 },
      ];
    },
    variants: ([kind, a, b]) => (kind === 0 ? [[0, b, a]] : []),
    explain: (s) => (s.id === "converse" ? `The converse swaps the parts: "${s.value}"` : `The statement is ${s.inputs[0]}; the converse is ${s.inputs[1]}`),
    domain: D_CONV,
    keep: K_CONV,
    difficulty: ([kind, a, b]) => (kind === 1 ? 3 : kind === 2 ? 2 : a % b === 0 || b % a === 0 ? 1 : 2),
    teach: {
      idea: "The converse of 'if P then Q' is 'if Q then P'. A statement can be true while its converse is false, so each needs its own check.",
      method: "Try to find a counterexample: a case where the 'if' part is true and the 'then' part is false. If none can exist, the statement is true; one counterexample makes it false.",
      alternatives: [{ id: "divisibility", title: "Think in factors", kind: "conceptual", text: ["Every multiple of a is a multiple of b exactly when b divides a (6 → 3 works, 3 → 6 does not: 9).", "For n² and n: if a has no square factor, every prime of a must already divide n."] }],
    },
    limits: "If-then statements about multiples and squares of whole numbers; geometric statements need written reasons and are left out.",
  },
  {
    id: "atcex",
    arity: 2,
    title: "A counterexample to a 'prime for every n' claim",
    competency: LOG,
    type: "integer",
    mc: true,
    // [a, c]: n² + a n + c, the first positive n giving a number that is not prime
    parse: none,
    reject: gate(D_CEX, K_CEX, "n² + an + c with c prime, where the claim holds for n = 1 and 2 and first fails by n = 80."),
    prompt: ([a, c]) => `${nameOf(c)} claims: "${cexText(a, c)} is a prime number for every positive whole number n." Find the smallest positive whole number n for which ${cexText(a, c)} is NOT prime; it shows the claim is false.`,
    solve: ([a, c]) => {
      const k = cexAns(a, c);
      const v = cexF(a, c)(k);
      let d = 2;
      while (v >= 2 && v % d !== 0) d++;
      return { steps: [st("search", "evaluate", LOG, [1, k - 1], "prime"), st("factor", "factorise", "MATH.number.primes", [v, d], k)], answer: k };
    },
    // independent: a sieve of Eratosthenes, checking every earlier value is prime and this one is not
    validate: ([a, c], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1) return false;
      const f = cexF(a, c);
      let max = 2;
      for (let n = 1; n <= v; n++) max = Math.max(max, f(n));
      const comp = new Uint8Array(max + 1);
      comp[0] = 1;
      comp[1] = 1;
      for (let i = 2; i * i <= max; i++) if (!comp[i]) for (let j = i * i; j <= max; j += i) comp[j] = 1;
      for (let n = 1; n < v; n++) if (f(n) < 2 || comp[f(n)]) return false;
      return f(v) < 2 || comp[f(v)] === 1;
    },
    bugs: ([a, c]) => [{ id: "obvious-factor-not-smallest", kind: "procedural", competency: LOG, says: `n = ${c} makes every term a multiple of ${c}, so it is a counterexample, but the question asks for the SMALLEST one; check n = 1, 2, 3, … in order.`, predict: c }],
    distractors: ([a, c]) => [cexAns(a, c) + 1, cexAns(a, c) - 1, c - 1],
    variants: ([a, c]) => [[a + 1, c]].filter((q) => inBox(q, D_CEX) && K_CEX(q)),
    explain: (s) => (s.id === "search" ? `For n = ${s.inputs[0]} to ${s.inputs[1]} the values are all prime` : Number(s.inputs[0]) < 2 ? `At n = ${s.value} the value is ${s.inputs[0]}, which is not prime` : `At n = ${s.value} the value is ${s.inputs[0]} = ${s.inputs[1]} × ${Number(s.inputs[0]) / Number(s.inputs[1])}, not prime`),
    domain: D_CEX,
    keep: K_CEX,
    difficulty: ([a, c]) => lv(cexAns(a, c), 4, 10),
    word: ([a, c]) => `A coding club in Coimbatore writes a program that prints ${cexText(a, c)} for n = 1, 2, 3, … and checks each printed number for primes. Which value of n gives the first printed number that is not prime?`,
    teach: {
      idea: "A claim about EVERY n is false as soon as one n fails; that n is a counterexample. Checking many n that work never proves the claim.",
      method: "Work out the value for n = 1, 2, 3, … in order and test each for a factor (try primes up to its square root). The first value with a factor gives the answer.",
      alternatives: [{ id: "spot_factor", title: "Look for a forced factor", kind: "conceptual", text: ["When n = c, every term of n² + an + c is a multiple of c, so the value cannot be prime.", "That proves the claim false, but a smaller n may already fail: still check from n = 1."] }],
    },
    limits: "Quadratics n² + an + c with c prime and first failure by n = 80; other claims need a written counterexample.",
  },
  // ======================================================== propositional logic
  {
    id: "atrows",
    arity: 5,
    title: "True rows of a truth table",
    competency: PROP,
    type: "integer",
    mc: true,
    // [x, o1, y, o2, z]: (x o1 y) o2 z over p, q, r
    parse: none,
    reject: gate(D_ROWS, K_ROWS, "(X ∘ Y) ∘ Z where X, Y, Z are p, q, r or their negations, each letter once."),
    prompt: (p) => `How many rows of the truth table of ${rowsText(p)} are true? (The table has 8 rows, one for each choice of truth values of p, q and r.)`,
    solve: (p) => {
      const c = rowsCount(p);
      return { steps: [st("rows", "evaluate", PROP, [rowsText(p)], c)], answer: c };
    },
    // independent: 8-bit masks, one bit per row, combined with bitwise operations
    validate: ([x, o1, y, o2, z], v) => {
      const M = [0b11110000, 0b11001100, 0b10101010];
      const lm = (i: number) => (i % 2 ? ~M[i >> 1] & 255 : M[i >> 1]);
      return v === pop(opM(o2, opM(o1, lm(x), lm(y), 255), lm(z), 255));
    },
    bugs: (p) => {
      const [, o1, , o2] = p;
      const out: Bug[] = [];
      if (o1 === 2 || o2 === 2) {
        out.push({ id: "conditional-as-and", kind: "conceptual", competency: PROP, says: "'If A then B' was taken as true only when A and B are both true; it is false ONLY when A is true and B is false.", predict: rowsCount(p, (o) => (o === 2 ? 0 : o)) });
        out.push({ id: "conditional-reversed", kind: "conceptual", competency: PROP, says: "The conditional was read backwards (as 'if B then A'); A → B is false only when A is true and B is false.", predict: rowsCount(p, (o) => o, true) });
      }
      if (o1 === 3 || o2 === 3) out.push({ id: "biconditional-as-and", kind: "conceptual", competency: PROP, says: "'A if and only if B' was taken as true only when both are true; it is also true when both are false.", predict: rowsCount(p, (o) => (o === 3 ? 0 : o)) });
      if (o1 === 1 || o2 === 1) out.push({ id: "or-as-exclusive", kind: "conceptual", competency: PROP, says: "'Or' was read as 'one but not both'; in logic A ∨ B is also true when both are true.", predict: rowsCount(p, (o) => (o === 1 ? 4 : o)) });
      return out;
    },
    variants: ([x, o1, y, o2, z]) => [[x, o2, y, o1, z]].filter((q) => q.join() !== [x, o1, y, o2, z].join()),
    explain: (s) => `Work out ${s.inputs[0]} in each of the 8 rows: ${s.value} rows are true`,
    domain: D_ROWS,
    keep: K_ROWS,
    cap: 400,
    difficulty: ([, o1, , o2]) => ((o1 < 2 ? 0 : 1) + (o2 < 2 ? 0 : 1) === 0 ? 1 : (o1 < 2 ? 0 : 1) + (o2 < 2 ? 0 : 1) === 1 ? 2 : 3),
    word: ([x, o1, y, o2, z]) => `Let p be "Anu studies", q be "it rains" and r be "the shop is open". Consider the statement: "${joinS(o2, `[${joinS(o1, sentLit(x), sentLit(y))}]`, sentLit(z)).replace(/^./, (ch) => ch.toUpperCase())}." In how many of the 8 possible combinations of truth values of p, q and r is this statement true?`,
    teach: {
      idea: "A truth table lists every combination of truth values; the compound statement's value in each row follows from the connectives: ∧ needs both, ∨ needs at least one, A → B fails only for T → F, A ↔ B needs the same value.",
      method: "Write the 8 rows of p, q, r. Add a column for each negation, then for the bracket, then for the whole statement, and count the T's.",
      alternatives: [{ id: "count_false", title: "Count the false rows instead", kind: "procedural", text: ["For an outer →, the statement is false only when the bracket is true and the last part is false.", "Count those rows and take them away from 8."] }],
      // older ⊕ used for the exclusive-or misconception only
    },
    limits: "Statements (X ∘ Y) ∘ Z in p, q, r with ∧, ∨, →, ↔; longer statements and writing out the table are left out.",
  },
  {
    id: "atclass",
    arity: 7,
    title: "Tautology, contradiction or contingency",
    competency: PROP,
    type: "choice",
    // [A, o1, B, o2, C, o3, D]: (A o1 B) o2 (C o3 D) over p, q
    parse: none,
    reject: gate(D_CLASS, K_CLASS, "(A ∘ B) ∘ (C ∘ D) where each bracket uses p and q (or their negations) once."),
    choices: () => ["a tautology", "a contradiction", "a contingency"],
    prompt: (p) => `Is the statement ${classText(p)} a tautology, a contradiction or a contingency?`,
    solve: (p) => {
      const rows = classRows(p);
      const t = rows.filter(Boolean).length;
      return { steps: [st("rows", "evaluate", PROP, [classText(p)], t), st("classify", "classify", PROP, [t], t === 4 ? 0 : t === 0 ? 1 : 2)], answer: t === 4 ? 0 : t === 0 ? 1 : 2 };
    },
    // independent: 4-bit masks, one bit per row
    validate: (p, v) => {
      const t = pop(classMask(p));
      return v === (t === 4 ? 0 : t === 0 ? 1 : 2);
    },
    bugs: (p) => {
      const rows = classRows(p);
      const t = rows.filter(Boolean).length;
      return [
        { id: "first-row-only", kind: "procedural", competency: PROP, says: "Only the first row (p and q both true) was checked; a tautology must be true in EVERY row, a contradiction false in every row.", predict: t > 0 && t < 4 ? (rows[0] ? 0 : 1) : null },
        { id: "mostly-true", kind: "conceptual", competency: PROP, says: "A statement true in most rows was called a tautology; even one false row makes it a contingency.", predict: t === 3 ? 0 : t === 1 ? 1 : null },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "rows" ? `Work out ${s.inputs[0]} in the 4 rows: true in ${s.value} of them` : `${s.inputs[0]} true rows out of 4: ${["a tautology", "a contradiction", "a contingency"][Number(s.value)]}`),
    domain: D_CLASS,
    keep: K_CLASS,
    cap: 300,
    difficulty: ([, o1, , o2, , o3]) => lv([o1, o2, o3].filter((o) => o >= 2).length, 0, 1),
    word: (p) => `Let p be "the bus is late" and q be "Kavya walks to school". Consider the statement: "${classWords(p)}." Is this statement (that is, ${classText(p)}) a tautology, a contradiction or a contingency?`,
    teach: {
      idea: "A tautology is true in every row of its truth table, a contradiction is false in every row, and a contingency is true in some rows and false in others.",
      method: "Make the 4-row table for p and q, work out each bracket and then the whole statement, and look at the final column.",
      alternatives: [{ id: "laws", title: "Simplify with laws first", kind: "procedural", text: ["Replace A → B by ¬A ∨ B and use De Morgan's laws.", "A ∨ ¬A is always true and A ∧ ¬A is always false; if the statement reduces to one of these, it is a tautology or a contradiction."] }],
    },
    limits: "Statements in two letters with two brackets; duals and written proofs of equivalence are left out.",
  },
  // ======================================================== dispersion
  {
    id: "atvar",
    arity: 7,
    title: "Variance of a frequency distribution",
    competency: DISP,
    type: "fraction",
    mc: true,
    decimals: true,
    // [a, d, f1..f5]: x = a, a+d, …, a+4d with frequencies f
    parse: none,
    reject: gate(D_VAR, () => true, "Five equally spaced values with frequencies from 1 to 6."),
    prompt: () => `Find the variance of the distribution in the table (x is the value, f its frequency).`,
    solve: (p) => {
      const { xs, f } = varData(p);
      const N = f.reduce((a, b) => a + b, 0);
      const S = xs.reduce((a, x, i) => a + f[i] * x, 0);
      const Q = xs.reduce((a, x, i) => a + f[i] * x * x, 0);
      const v = (N * Q - S * S) / (N * N);
      return { steps: [st("mean", "divide", MEAN, [S, N], S / N), st("ex2", "divide", DISP, [Q, N], Q / N), st("var", "subtract", DISP, [Q / N, S / N], v)], answer: v };
    },
    // independent: the pairwise formula σ² = ΣΣ fᵢfⱼ(xᵢ − xⱼ)² / (2N²)
    validate: (p, v) => {
      const { xs, f } = varData(p);
      const N = f.reduce((a, b) => a + b, 0);
      let s = 0;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) s += f[i] * f[j] * (xs[i] - xs[j]) ** 2;
      return typeof v === "number" && near(s / (2 * N * N), v, 1e-9);
    },
    bugs: (p) => {
      const { xs, f, } = varData(p);
      const N = f.reduce((a, b) => a + b, 0);
      const S = xs.reduce((a, x, i) => a + f[i] * x, 0);
      const Q = xs.reduce((a, x, i) => a + f[i] * x * x, 0);
      const v = (N * Q - S * S) / (N * N);
      return [
        { id: "mean-not-squared", kind: "procedural", competency: DISP, says: "The mean was taken away instead of the square of the mean: σ² = Σfx²/N − x̄².", predict: Q / N - S / N },
        { id: "divide-by-n-minus-1", kind: "conceptual", competency: DISP, says: `The sum of squared deviations was divided by N − 1 = ${N - 1}; for the variance of a distribution divide by N = ${N}.`, predict: (N * v) / (N - 1) },
        { id: "divide-by-values", kind: "procedural", competency: DISP, says: "Σf(x − x̄)² was divided by the number of different values (5) instead of the total frequency N.", predict: (N * v) / 5 },
        { id: "frequencies-ignored", kind: "conceptual", competency: DISP, says: "The frequencies were ignored, as if each value appeared once.", predict: 2 * p[1] * p[1] },
      ];
    },
    variants: (p) => [[p[0] + 1, ...p.slice(1)]].filter((q) => inBox(q, D_VAR)),
    explain: (s) => (s.id === "mean" ? `x̄ = Σfx/N = ${s.inputs[0]}/${s.inputs[1]} = ${F(Number(s.value))}` : s.id === "ex2" ? `Σfx²/N = ${s.inputs[0]}/${s.inputs[1]} = ${F(Number(s.value))}` : `σ² = Σfx²/N − x̄² = ${F(Number(s.inputs[0]))} − (${F(Number(s.inputs[1]))})² = ${F(Number(s.value))}`),
    domain: D_VAR,
    cap: 400,
    difficulty: ([a, d]) => (a <= 5 && d === 1 ? 1 : a <= 12 ? 2 : 3),
    figure: varTable,
    word: () => `The table shows how many books (x) the students of a class read in the summer holidays, and how many students (f) read each number. Find the variance of the number of books read.`,
    teach: {
      idea: "Variance is the mean of the squared distances from the mean; squaring stops positive and negative deviations from cancelling.",
      method: "Find N = Σf, x̄ = Σfx/N and Σfx²/N, then σ² = Σfx²/N − x̄² (or Σf(x − x̄)²/N).",
      alternatives: [{ id: "step_deviation", title: "Step-deviation (shortcut) method", kind: "procedural", text: ["Choose an assumed mean A (the middle value) and the gap h between values; let u = (x − A)/h.", "Then σ² = h² [Σfu²/N − (Σfu/N)²]: the numbers stay small."] }],
    },
    limits: "Five equally spaced values with frequencies up to 6; grouped classes use the same steps with mid-points and are left out.",
  },
  {
    id: "atsd",
    arity: 6,
    title: "Standard deviation of raw data (exact)",
    competency: DISP,
    type: "exact",
    mc: true,
    parse: none,
    reject: gate(D_SD, K_SD, "Six whole numbers from 2 to 30."),
    prompt: (p) => `Find the standard deviation of the data ${p.join(", ")}. Give the exact value; a square root may stay in the answer.`,
    solve: (p) => {
      const M = sdM(p);
      const [k, m] = sqf(M);
      const ans = surdQ(k, 6, m);
      return { steps: [st("mean", "divide", MEAN, [p.reduce((a, b) => a + b, 0), 6], meanOf(p)), st("var", "divide", DISP, [M, 36], M / 36), st("sd", "root", SURDS, [F(M / 36)], ans)], answer: ans };
    },
    // independent: squared deviations from the decimal mean, then a numerical square root
    validate: (p, v) => {
      const m = meanOf(p);
      const sd = Math.sqrt(p.reduce((a, x) => a + (x - m) ** 2, 0) / p.length);
      const x = num(v);
      return x !== null && near(x, sd, 1e-9);
    },
    bugs: (p) => {
      const M = sdM(p);
      const m = meanOf(p);
      return [
        { id: "variance-given", kind: "procedural", competency: DISP, says: "The variance was given; the standard deviation is its square root.", predict: F(M / 36) },
        { id: "divide-by-n-minus-1", kind: "conceptual", competency: DISP, says: "The squared deviations were divided by n − 1 = 5; for the standard deviation of these data divide by n = 6.", predict: fracRoot(M, 180) },
        { id: "mean-deviation-given", kind: "conceptual", competency: MD, says: "The mean of the distances from the mean (mean deviation) was found; the standard deviation squares the deviations first.", predict: F(p.reduce((a, x) => a + Math.abs(x - m), 0) / 6) },
      ];
    },
    distractors: (p) => [rootS(sdM(p)), fracRoot(sdM(p), 6)],
    variants: (p) => [p.map((x) => x + 1)].filter((q) => inBox(q, D_SD)),
    explain: (s) => (s.id === "mean" ? `x̄ = ${s.inputs[0]}/6 = ${F(Number(s.value))}` : s.id === "var" ? `σ² = Σ(x − x̄)²/6 = ${F(Number(s.value))}` : `σ = √(${s.inputs[0]}) = ${s.value}`),
    domain: D_SD,
    keep: K_SD,
    cap: 400,
    difficulty: (p) => (Number.isInteger(meanOf(p)) ? 1 : sqf(sdM(p))[1] === 1 ? 2 : 3),
    word: (p) => `The number of customers at a tea stall in Tirunelveli on six days was ${p.join(", ")}. Find the standard deviation of the daily number of customers, exactly.`,
    teach: {
      idea: "The standard deviation is the square root of the variance, so it is in the same units as the data.",
      method: "Find the mean, the squared deviations (x − x̄)², their mean (the variance), then take the square root and simplify the surd.",
      alternatives: [{ id: "sum_squares", title: "Use Σx² instead of deviations", kind: "procedural", text: ["σ² = Σx²/n − x̄² avoids fractions in the deviations.", "With n = 6: σ = √(6Σx² − (Σx)²)/6."] }],
    },
    limits: "Six whole numbers up to 30; grouped data and the step-deviation method are in the variance family.",
  },
  {
    id: "atcv",
    arity: 4,
    title: "Comparing consistency by the coefficient of variation",
    competency: DISP,
    type: "choice",
    // [m1, s1, m2, s2]
    parse: none,
    reject: gate(D_CV, K_CV, "Means 30–70 and standard deviations 2–14 (different means, different standard deviations)."),
    choices: (p) => [`${cvNames(p)[0]} is more consistent`, `${cvNames(p)[1]} is more consistent`, "Both are equally consistent"],
    prompt: (p) => {
      const [m1, s1, m2, s2] = p;
      const [n1, n2] = cvNames(p);
      return `Over a season, ${n1}'s cricket scores have mean ${m1} runs and standard deviation ${s1} runs; ${n2}'s scores have mean ${m2} runs and standard deviation ${s2} runs. Using the coefficient of variation, who is the more consistent batter?`;
    },
    solve: ([m1, s1, m2, s2]) => {
      const c1 = (100 * s1) / m1;
      const c2 = (100 * s2) / m2;
      const ans = near(c1, c2, 1e-12) ? 2 : c1 < c2 ? 0 : 1;
      return { steps: [st("cv1", "divide", DISP, [s1, m1], c1), st("cv2", "divide", DISP, [s2, m2], c2), st("compare", "compare", DISP, [c1, c2], ans)], answer: ans };
    },
    // independent: cross-multiply s₁m₂ against s₂m₁ (no division)
    validate: (p, v) => v === cvIndex(p),
    bugs: ([m1, s1, m2, s2]) => [
      { id: "smaller-sd", kind: "conceptual", competency: DISP, says: "The smaller standard deviation was chosen; spread must be compared relative to the mean, CV = σ/x̄ × 100.", predict: s1 < s2 ? 0 : 1 },
      { id: "higher-mean", kind: "conceptual", competency: DISP, says: "The higher average was chosen; a higher mean means scoring more, not scoring more steadily.", predict: m1 > m2 ? 0 : 1 },
    ],
    variants: () => [],
    explain: (s) => (s.id === "compare" ? (Number(s.value) === 2 ? "The two CVs are equal, so they are equally consistent" : "The smaller CV is more consistent") : `CV = ${s.inputs[0]}/${s.inputs[1]} × 100 = ${+Number(s.value).toFixed(2)}%`),
    domain: D_CV,
    keep: K_CV,
    cap: 300,
    difficulty: (p) => {
      const [, s1, , s2] = p;
      const i = cvIndex(p);
      return i === 2 || (s1 < s2) !== (i === 0) ? 3 : 2;
    },
    word: (p) => {
      const [m1, s1, m2, s2] = p;
      const [n1, n2] = cvNames(p);
      return `${n1} and ${n2} each run a tea stall near a bus stand in Madurai. Over a month, ${n1} sells a mean of ${m1} cups a day with standard deviation ${s1} cups; ${n2} sells a mean of ${m2} cups a day with standard deviation ${s2} cups. Using the coefficient of variation, whose daily sales are more consistent?`;
    },
    teach: {
      idea: "The coefficient of variation CV = (σ/x̄) × 100 measures spread as a percentage of the mean, so groups with different means can be compared. The smaller CV is the more consistent.",
      method: "Work out CV for each batter, then choose the smaller one (equal CVs mean equally consistent).",
      alternatives: [{ id: "cross_multiply", title: "Compare without dividing", kind: "procedural", text: ["σ₁/x̄₁ < σ₂/x̄₂ exactly when σ₁ × x̄₂ < σ₂ × x̄₁.", "Multiply across and compare the two whole numbers."] }],
    },
    limits: "Two groups given by mean and standard deviation; computing both from raw data is in the other dispersion families.",
  },
  // ======================================================== mean deviation
  {
    id: "atmdmean",
    arity: 6,
    title: "Mean deviation about the mean",
    competency: MD,
    type: "fraction",
    mc: true,
    decimals: true,
    parse: none,
    reject: gate(D_MD6, K_MD6, "Six whole numbers from 1 to 40, at least four different."),
    prompt: (p) => `Find the mean deviation about the mean of the data ${p.join(", ")}.`,
    solve: (p) => {
      const S = p.reduce((a, b) => a + b, 0);
      const md = p.reduce((a, x) => a + Math.abs(6 * x - S), 0) / 36;
      return { steps: [st("mean", "divide", MEAN, [S, 6], S / 6), st("deviations", "subtract", MD, p.map((x) => F(Math.abs(x - S / 6))).join(", "), md * 6), st("md", "divide", MD, [md * 6, 6], md)], answer: md };
    },
    // independent: twice the sum of the deviations above the mean, divided by n (they balance those below)
    validate: (p, v) => {
      const S = p.reduce((a, b) => a + b, 0);
      const up = p.filter((x) => 6 * x > S).reduce((a, x) => a + (6 * x - S), 0);
      return typeof v === "number" && near((2 * up) / 36, v, 1e-9);
    },
    bugs: (p) => {
      const S = p.reduce((a, b) => a + b, 0);
      const sorted = [...p].sort((a, b) => a - b);
      const M = (sorted[2] + sorted[3]) / 2;
      const md = p.reduce((a, x) => a + Math.abs(6 * x - S), 0) / 36;
      return [
        { id: "signs-kept", kind: "conceptual", competency: MD, says: "The deviations x − x̄ were added with their signs, and they always add up to 0; mean deviation uses the distances |x − x̄|.", predict: 0 },
        { id: "divide-by-n-minus-1", kind: "procedural", competency: MD, says: "The sum of the distances was divided by 5; divide by the number of values, 6.", predict: (md * 6) / 5 },
        { id: "about-median", kind: "procedural", competency: MD, says: "The distances were measured from the median; this question asks about the mean.", predict: p.reduce((a, x) => a + Math.abs(x - M), 0) / 6 },
      ];
    },
    variants: (p) => [p.map((x) => x + 2)].filter((q) => inBox(q, D_MD6)),
    explain: (s) => (s.id === "mean" ? `x̄ = ${s.inputs[0]}/6 = ${F(Number(s.value))}` : s.id === "deviations" ? `The distances |x − x̄| are ${s.inputs[0]}; they add up to ${F(Number(s.value))}` : `M.D. = ${F(Number(s.inputs[0]))}/6 = ${F(Number(s.value))}`),
    domain: D_MD6,
    keep: K_MD6,
    cap: 400,
    difficulty: (p) => (Number.isInteger(meanOf(p)) ? 1 : 2),
    word: (p) => `The weights (in kg) of six parcels at a post office in Salem are ${p.join(", ")}. Find the mean deviation of the weights about their mean, in kg.`,
    teach: {
      idea: "Mean deviation is the average DISTANCE of the values from the mean; distances are never negative, so signs are dropped.",
      method: "Find x̄, write each |x − x̄|, add them and divide by the number of values.",
      alternatives: [{ id: "balance", title: "Use the balance of the mean", kind: "conceptual", text: ["The deviations above the mean add up to the same amount as those below it.", "So M.D. = 2 × (sum of x − x̄ for the values above the mean) ÷ n."] }],
    },
    limits: "Six whole numbers; discrete and continuous frequency tables use the same idea and are left out.",
  },
  {
    id: "atmdmed",
    arity: 7,
    title: "Mean deviation about the median",
    competency: MD,
    type: "fraction",
    mc: true,
    decimals: true,
    parse: none,
    reject: gate(D_MD7, K_MD7, "Seven different whole numbers from 1 to 50, not listed in order."),
    prompt: (p) => `Find the mean deviation about the median of the data ${p.join(", ")}.`,
    solve: (p) => {
      const M = median7(p);
      const s = p.reduce((a, x) => a + Math.abs(x - M), 0);
      return { steps: [st("order", "sort", MD, [[...p].sort((a, b) => a - b).join(", ")], M), st("distances", "subtract", MD, [M], s), st("md", "divide", MD, [s, 7], s / 7)], answer: s / 7 };
    },
    // independent: (sum of the three largest − sum of the three smallest) / 7
    validate: (p, v) => {
      const q = [...p].sort((a, b) => a - b);
      return typeof v === "number" && near((q[4] + q[5] + q[6] - q[0] - q[1] - q[2]) / 7, v, 1e-9);
    },
    bugs: (p) => {
      const m = meanOf(p);
      return [
        { id: "middle-unsorted", kind: "procedural", competency: MD, says: `The middle value of the list as written (${p[3]}) was taken as the median; put the data in order first.`, predict: p.reduce((a, x) => a + Math.abs(x - p[3]), 0) / 7 },
        { id: "about-mean", kind: "procedural", competency: MD, says: "The distances were measured from the mean; this question asks about the median.", predict: p.reduce((a, x) => a + Math.abs(x - m), 0) / 7 },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "order" ? `In order: ${s.inputs[0]}; the median is ${s.value}` : s.id === "distances" ? `The distances |x − ${s.inputs[0]}| add up to ${s.value}` : `M.D. = ${s.inputs[0]}/7 = ${F(Number(s.value))}`),
    domain: D_MD7,
    keep: K_MD7,
    cap: 400,
    difficulty: (p) => lv(Math.max(...p), 20, 35),
    word: (p) => `The runs scored by a school cricket team in seven matches were ${p.join(", ")}. Find the mean deviation of the runs about the median.`,
    teach: {
      idea: "The median is the middle value of the ORDERED data; the mean deviation about it is the average distance from it.",
      method: "Sort the data, take the 4th value as the median M, add the distances |x − M| and divide by 7.",
      alternatives: [{ id: "halves", title: "Top half minus bottom half", kind: "procedural", text: ["Distances from the median: the three largest values are above M, the three smallest below.", "So the sum of distances = (sum of the top three) − (sum of the bottom three)."] }],
    },
    limits: "Seven different whole numbers; even-sized data and frequency tables are left out.",
  },
  // ======================================================== compound angles
  {
    id: "atcomp",
    arity: 4,
    title: "Exact values by compound-angle formulas",
    competency: COMP,
    type: "exact",
    mc: true,
    // [ai, bi, o, f]: f(A ± B), A from CA, B from CB
    parse: none,
    reject: gate(D_COMP, K_COMP, "sin, cos or tan of A ± B with A, B standard angles giving an odd multiple of 15°."),
    prompt: ([ai, bi, o, f]) => `Use a compound-angle formula to find the exact value of ${FN[f]}(${CA[ai]}° ${o ? "−" : "+"} ${CB[bi]}°). Simplify fully, with no square root in the denominator.`,
    solve: ([ai, bi, o, f]) => {
      const A = CA[ai];
      const B = CB[bi];
      const ans = sFmt(compValue(f, A, B, o));
      return { steps: [st("parts", "evaluate", RATIOS, [A, B], `${sFmt(sinE(A))}, ${sFmt(cosE(A))}; ${sFmt(sinE(B))}, ${sFmt(cosE(B))}`), st("formula", "combine", COMP, [FN[f], o], ans)], answer: ans };
    },
    // independent: Math.sin / Math.cos / Math.tan of the combined angle, compared with the answer's value
    validate: ([ai, bi, o, f], v) => {
      const x = num(v);
      const t = deg(o ? CA[ai] - CB[bi] : CA[ai] + CB[bi]);
      return x !== null && near(x, fNum(f, t), 1e-9);
    },
    bugs: ([ai, bi, o, f]) => {
      const A = CA[ai];
      const B = CB[bi];
      const dist = fE(f, A) && fE(f, B) ? sFmt(o ? sSub(fE(f, A)!, fE(f, B)!) : sAdd(fE(f, A)!, fE(f, B)!)) : null;
      return [
        { id: "distribute", kind: "conceptual", competency: COMP, says: `${FN[f]}(A ${o ? "−" : "+"} B) was split as ${FN[f]} A ${o ? "−" : "+"} ${FN[f]} B; ${FN[f]} does not distribute over a sum, so use the compound-angle formula.`, predict: dist },
        { id: "formula-sign", kind: "recall", competency: COMP, says: f === 1 ? "The sign in the cosine formula was wrong: cos(A + B) = cos A cos B − sin A sin B (the sign flips)." : f === 0 ? "The sign in the sine formula was wrong: sin(A − B) = sin A cos B − cos A sin B (the sign stays)." : "The sign in the denominator was wrong: tan(A + B) = (tan A + tan B)/(1 − tan A tan B).", predict: sFmt(compValue(f, A, B, o, true)) },
      ];
    },
    distractors: ([ai, bi, o, f]) => [sFmt(sNeg(compValue(f, CA[ai], CB[bi], o))), sFmt(compValue(f === 0 ? 1 : f === 1 ? 0 : 2, CA[ai], CB[bi], o)), sFmt(compValue(f, CA[ai], CB[bi], 1 - o)), ...(f === 2 ? ["2 + √3", "2 − √3", "−2 − √3", "√3 − 2"] : ["(√6 + √2)/4", "(√6 − √2)/4", "−(√6 + √2)/4", "(√2 − √6)/4"])],
    variants: ([ai, bi, o, f]) => [[ai, bi, 1 - o, f]].filter((q) => K_COMP(q)),
    explain: (s) => (s.id === "parts" ? `sin ${s.inputs[0]}°, cos ${s.inputs[0]}° and sin ${s.inputs[1]}°, cos ${s.inputs[1]}°: ${s.value}` : `Put them into the ${s.inputs[0]}(A ${Number(s.inputs[1]) ? "−" : "+"} B) formula and simplify: ${s.value}`),
    domain: D_COMP,
    keep: K_COMP,
    difficulty: ([ai, , , f]) => (f === 2 ? 3 : CA[ai] <= 90 ? 1 : 2),
    teach: {
      idea: "sin(A ± B) = sin A cos B ± cos A sin B, cos(A ± B) = cos A cos B ∓ sin A sin B, tan(A ± B) = (tan A ± tan B)/(1 ∓ tan A tan B): angles like 75° or 165° come from standard ones.",
      method: "Write down sin and cos (or tan) of each angle, substitute into the formula, multiply out the surds and simplify; rationalise a tan answer.",
      alternatives: [{ id: "unit_circle", title: "Check with the unit circle", kind: "conceptual", text: ["Locate A ± B on the unit circle: the quadrant tells you the sign of the answer.", "For example cos(120° − 45°) = cos 75° must be positive and small (about 0.26)."] }],
    },
    limits: "A ± B giving odd multiples of 15°; three-angle formulas and identities to prove are left out.",
  },
  {
    id: "atdbl",
    arity: 4,
    title: "Double-angle values from one ratio",
    competency: COMP,
    type: "fraction",
    mc: true,
    // [t, g, q, h]: triple t, given sin (g = 0) or cos (g = 1), quadrant q, target sin2A / cos2A / tan2A
    parse: none,
    reject: gate(D_DBL, () => true, "A Pythagorean-triple ratio in a given quadrant; sin 2A, cos 2A or tan 2A."),
    prompt: (p) => {
      const [, g, q, h] = p;
      const [s, c] = dblSC(p);
      return `Given ${g ? `cos A = ${F(c)}` : `sin A = ${F(s)}`} and ${QTEXT[q - 1]}, find ${DBL_F[h]}.`;
    },
    solve: (p) => {
      const [, g, , h] = p;
      const [s, c] = dblSC(p);
      const ans = dblOf(h, s, c);
      return { steps: [st("other", "evaluate", "MATH.trigonometry.identities", [g ? "sin A" : "cos A"], g ? s : c), st("double", "evaluate", COMP, [DBL_F[h]], ans)], answer: ans };
    },
    // independent: build the angle with Math.atan2 from the two ratios and evaluate Math.sin / Math.cos / Math.tan of 2A
    validate: (p, v) => {
      const [t, , q, h] = p;
      const [a, b, c] = TRIPLES[t];
      const [ss, sc] = QSIGN[q - 1];
      const A = Math.atan2(ss * a, sc * b) + 0 * c;
      return typeof v === "number" && near([Math.sin, Math.cos, Math.tan][h](2 * A), v, 1e-9);
    },
    bugs: (p) => {
      const [, g, , h] = p;
      const [s, c] = dblSC(p);
      const out: Bug[] = [
        { id: "double-the-ratio", kind: "conceptual", competency: COMP, says: `${DBL_F[h]} was taken as 2 × ${DBL_F[h].replace(" 2A", " A")}; doubling the angle does not double the ratio.`, predict: 2 * [s, c, s / c][h] },
      ];
      if (h !== 1) out.push({ id: "quadrant-sign", kind: "conceptual", competency: TF, says: `${g ? "sin A" : "cos A"} was taken as positive; in this quadrant its sign must come from where A lies.`, predict: dblOf(h, g ? Math.abs(s) : s, g ? c : Math.abs(c)) });
      else out.push({ id: "formula-mixed", kind: "recall", competency: COMP, says: "Two forms of the formula were mixed up: cos 2A = 1 − 2 sin²A = 2 cos²A − 1, not 1 − 2 cos²A.", predict: 1 - 2 * c * c });
      return out;
    },
    distractors: (p) => {
      const [s, c] = dblSC(p);
      const v = dblOf(p[3], s, c);
      return [-v, 1 / v, v / 2];
    },
    variants: ([t, g, q, h]) => [0, 1, 2].filter((x) => x !== h).map((x) => [t, g, q, x]),
    explain: (s) => (s.id === "other" ? `From sin²A + cos²A = 1 with the quadrant's sign: ${s.inputs[0]} = ${F(Number(s.value))}` : `${s.inputs[0]} = ${["2 sin A cos A", "cos²A − sin²A", "2 tan A/(1 − tan²A)"][DBL_F.indexOf(String(s.inputs[0]))]} = ${F(Number(s.value))}`),
    domain: D_DBL,
    difficulty: ([t, , q, h]) => (q === 1 && t === 0 ? 1 : h === 2 || q > 2 ? 3 : 2),
    teach: {
      idea: "sin 2A = 2 sin A cos A, cos 2A = cos²A − sin²A, tan 2A = 2 tan A/(1 − tan²A); the quadrant fixes the sign of the ratio you work out.",
      method: "Use sin²A + cos²A = 1 to find the other ratio, give it the sign of its quadrant, then substitute into the double-angle formula.",
      alternatives: [{ id: "triangle", title: "Draw the reference triangle", kind: "conceptual", text: ["Sketch a right triangle with the given ratio (for example opposite 3, hypotenuse 5) and find the third side.", "Put A in its quadrant: the x-side takes the sign of x there, the y-side the sign of y."] }],
    },
    limits: "Ratios from five Pythagorean triples in any quadrant; half-angles and triple angles are left out.",
  },
  {
    id: "atp2s",
    arity: 3,
    title: "Products of sines and cosines as sums",
    competency: COMP,
    type: "choice",
    // [t, a, b]: 2 sin ax cos bx, 2 cos ax sin bx, 2 cos ax cos bx, 2 sin ax sin bx; choose the equal sum or difference
    parse: none,
    reject: gate(D_P2S, K_P2S, "2 sin ax cos bx (and the other three products) with 1 ≤ b < a ≤ 9."),
    choices: ([t, a, b]) => {
      const forms = p2sForms(t, a, b);
      return p2sOrder([t, a, b]).map((i) => forms[i].text);
    },
    prompt: ([t, a, b]) => `Which of these is equal to ${p2sText(t, a, b)}, written as a sum or difference of sines or cosines?`,
    solve: ([t, a, b]) => {
      const ans = p2sOrder([t, a, b]).indexOf(0);
      return { steps: [st("formula", "rewrite", COMP, [p2sText(t, a, b), a + b, a - b], p2sForms(t, a, b)[0].text), st("choose", "compare", COMP, [], ans)], answer: ans };
    },
    // independent: evaluate the product and the chosen option numerically at several points
    validate: ([t, a, b], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 3) return false;
      const opt = p2sForms(t, a, b)[p2sOrder([t, a, b])[v]].value;
      const g = p2sFn(t, a, b);
      return [0.31, 0.77, 1.13, 1.9, 2.47].every((x) => near(opt(x), g(x), 1e-9));
    },
    bugs: ([t, a, b]) => {
      const ord = p2sOrder([t, a, b]);
      const out: Bug[] = [
        { id: "sign-between-terms", kind: "recall", competency: COMP, says: t === 3 ? "The two cosines were combined with the wrong sign, as cos(A − B) + cos(A + B); that sum is 2 cos A cos B. For 2 sin A sin B the two cosines are subtracted: cos(A − B) − cos(A + B)." : t === 1 ? "The two sines were added, as sin(A + B) + sin(A − B); that sum is 2 sin A cos B. For 2 cos A sin B they are subtracted: sin(A + B) − sin(A − B)." : `The two terms were subtracted; for ${t === 0 ? "2 sin A cos B" : "2 cos A cos B"} they are added.`, predict: ord.indexOf(1) },
        { id: "halved", kind: "procedural", competency: COMP, says: "A ½ was put in front, from the form sin A cos B = ½[sin(A + B) + sin(A − B)]; here the product already carries the 2, so the ½ and the 2 cancel.", predict: ord.indexOf(2) },
        t === 3
          ? { id: "minus-dropped", kind: "procedural", competency: COMP, says: "The cosines were subtracted in the wrong order, cos(A + B) − cos(A − B); that is the negative of 2 sin A sin B.", predict: ord.indexOf(3) }
          : { id: "wrong-function", kind: "recall", competency: COMP, says: t <= 1 ? "Cosines were written where the formula gives sines: a product of a sine and a cosine becomes a sum of SINES." : "Sines were written where the formula gives cosines: a product of two cosines becomes a sum of COSINES.", predict: ord.indexOf(3) },
      ];
      return out;
    },
    variants: ([t, a, b]) => [0, 1, 2, 3].filter((x) => x !== t).map((x) => [x, a, b]),
    explain: (s) => (s.id === "choose" ? `So the equal option is ${"ABCD"[Number(s.value)]}` : `The angles are A + B = ${ax(Number(s.inputs[1]))} and A − B = ${ax(Number(s.inputs[2]))}: ${s.inputs[0]} = ${s.value}`),
    domain: D_P2S,
    keep: K_P2S,
    difficulty: ([t]) => (t === 0 || t === 2 ? 2 : 3),
    teach: {
      idea: "Adding sin(A + B) and sin(A − B) cancels the cos A sin B parts and leaves 2 sin A cos B; the other three product formulas come the same way.",
      method: "Pick the formula for the product, put A = ax and B = bx, and write the angles A + B and A − B.",
      alternatives: [{ id: "derive", title: "Derive it from the compound-angle formulas", kind: "procedural", text: ["Write cos(A − B) = cos A cos B + sin A sin B and cos(A + B) = cos A cos B − sin A sin B.", "Subtract: cos(A − B) − cos(A + B) = 2 sin A sin B."] }],
    },
    limits: "Products with whole-number multiples of x; sum-to-product and identities to prove are left out.",
  },
  // ======================================================== trigonometric equations
  {
    id: "atprinc",
    arity: 4,
    title: "Solutions of a trigonometric equation in 0 ≤ x < 2π",
    competency: EQN,
    // radians, as the Tamil Nadu and CBSE senior-secondary books give them: each solution is a multiple of π, and the
    // learner types the multipliers (π/6 and 5π/6 as 1/6, 5/6), compared as a set of exact fractions in any order
    type: "set",
    // [f, v, k, w]: f(kx) = value v; w = 1 writes it rearranged
    parse: none,
    reject: gate(D_PRINC, K_PRINC, "sin kx, cos kx or tan kx equal to a standard value, k up to 3."),
    prompt: ([f, v, k, w]) => `Solve ${eqText(f, EQV[f][v], k, w)} for 0 ≤ x < 2π (x in radians). ${PRINC_FORM}`,
    solve: ([f, v, k]) => {
      const e = EQV[f][v];
      const ans = princSolve(f, e.a, k).map((d) => d / 180);
      return { steps: [st("principal", "evaluate", INV, [FN[f], e.t], piStr(e.a, 180)), st("general", "solve", EQN, [k], ans)], answer: ans };
    },
    // independent: scan x = jπ/144 over [0, 2π) and keep the values that satisfy the equation numerically
    validate: ([f, v, k], ans) => {
      if (!Array.isArray(ans)) return false;
      const e = EQV[f][v];
      const found: number[] = [];
      for (let j = 0; j < 288; j++) {
        const t = k * j * (Math.PI / 144);
        if (f === 2 && Math.abs(Math.cos(t)) < 1e-9) continue;
        if (Math.abs(fNum(f, t) - e.v) < 1e-9) found.push(j / 144);
      }
      const a = [...ans].sort((x, y) => x - y);
      return a.length === found.length && a.every((x, i) => near(x, found[i], 1e-9));
    },
    bugs: ([f, v, k]) => {
      const e = EQV[f][v];
      const all = princSolve(f, e.a, k);
      const out: Bug[] = [{ id: "principal-only", kind: "conceptual", competency: EQN, says: `Only the principal value was given; ${FN[f]} takes each value ${f === 2 ? "once in every π" : "twice in every 2π"}, so look in every quadrant where it has this sign.`, predict: [e.a / (180 * k)] }];
      if (k > 1) out.push({ id: "one-turn-only", kind: "procedural", competency: EQN, says: `Only angles ${k}x below 2π were used; when 0 ≤ x < 2π, ${k}x runs from 0 up to ${2 * k}π.`, predict: princSolve(f, e.a, k, 360).map((d) => d / 180) });
      out.push({ id: "degrees-not-radians", kind: "procedural", competency: RAD, says: "The solutions were worked out in degrees and the degree numbers typed; in radians 180° is π, so 30° is π/6 and is typed 1/6.", predict: all });
      return out;
    },
    variants: ([f, v, k, w]) => [[f, v, k === 1 ? 2 : 1, w]].filter((q) => K_PRINC(q)),
    explain: (s) => (s.id === "principal" ? `The principal value of ${s.inputs[0]}⁻¹(${s.inputs[1]}) is ${s.value}` : `All angles with this value, divided by ${s.inputs[0]} and kept in 0 ≤ x < 2π: x = ${(s.value as number[]).map((c) => piStr(Math.round(c * 144), 144)).join(", ")} (typed ${(s.value as number[]).map((c) => F(c)).join(", ")})`),
    domain: D_PRINC,
    keep: K_PRINC,
    difficulty: ([f, v, k]) => (k === 1 && EQV[f][v].v >= 0 ? 1 : k === 1 ? 2 : 3),
    word: ([f, v, k, w]) => `${nameOf(f + v + k)} is setting up a rotating light for a school science fair. It shines on the screen exactly at the angles x (in radians) with ${eqText(f, EQV[f][v], k, w)}. Find every such angle with 0 ≤ x < 2π. ${PRINC_FORM}`,
    teach: {
      idea: "sin and cos repeat every 2π and take each value twice per turn (tan repeats every π and takes each value once); the quadrant signs (All, Sin, Tan, Cos) tell you where.",
      method: "Find the reference angle from the standard values (π/6, π/4, π/3), place it in each quadrant where the function has the right sign, then (for kx) add multiples of 2π until kx reaches 2kπ, and divide by k.",
      alternatives: [{ id: "graph", title: "Read it off the graph", kind: "conceptual", text: ["Sketch y = sin x for 0 to 2π and the line y = value.", "Each crossing is a solution; for sin kx the graph squeezes k waves into 0 to 2π, so there are k times as many crossings."] }],
    },
    limits: "Standard values only, solutions in radians in [0, 2π) typed as multiples of π (the set type reads fractions, not π); quadratic trigonometric equations are left out.",
  },
  {
    id: "atgen",
    arity: 4,
    title: "General solution of a trigonometric equation",
    competency: EQN,
    type: "choice",
    // [f, v, k, w]: f(kx) = value; choose the general solution
    parse: none,
    reject: gate(D_GEN, () => true, "sin kx, cos kx or tan kx equal to a standard non-zero value (not ±1), k up to 3."),
    choices: (p) => {
      const [f, v, k] = p;
      const e = GENV[f][v];
      return genOrder(p).map((kind) => genForm(kind, e.a, 180 * k, k));
    },
    prompt: ([f, v, k, w]) => `Which is the general solution of ${eqText(f, GENV[f][v], k, w)}?`,
    solve: (p) => {
      const [f, v, k] = p;
      const e = GENV[f][v];
      const ans = genOrder(p).indexOf(f);
      return { steps: [st("principal", "evaluate", INV, [FN[f], e.t], piStr(e.a, 180)), st("general", "solve", EQN, [FN[f], k], ans)], answer: ans };
    },
    // independent: list the solutions each option gives and compare with roots found numerically in [−π, π]
    validate: (p, v) => {
      const [f, vi, k] = p;
      if (typeof v !== "number" || v < 0 || v > 3) return false;
      const kind = genOrder(p)[v];
      const e = GENV[f][vi];
      const beta = deg(e.a) / k;
      const sols = genSet(kind, beta, k);
      const g = (x: number) => fNum(f, k * x) - e.v;
      if (!sols.every((x) => Math.abs(g(x)) < 1e-7)) return false;
      const N = 24000;
      for (let i = 0; i < N; i++) {
        let lo = -Math.PI + (2 * Math.PI * i) / N;
        let hi = lo + (2 * Math.PI) / N;
        if (Math.sign(g(lo)) === Math.sign(g(hi))) continue;
        for (let it = 0; it < 60; it++) {
          const mid = (lo + hi) / 2;
          if (Math.sign(g(mid)) === Math.sign(g(lo))) lo = mid;
          else hi = mid;
        }
        const r = (lo + hi) / 2;
        if (Math.abs(g(r)) > 1e-6) continue;
        if (!sols.some((x) => Math.abs(x - r) < 1e-6)) return false;
      }
      return true;
    },
    bugs: (p) => {
      const [f] = p;
      const ord = genOrder(p);
      return [
        { id: "wrong-pattern", kind: "recall", competency: EQN, says: f === 0 ? "The cosine pattern 2nπ ± α was used for a sine equation; sin y = sin α gives y = nπ + (−1)ⁿα." : f === 1 ? "The sine pattern nπ + (−1)ⁿα was used for a cosine equation; cos y = cos α gives y = 2nπ ± α." : "The sine pattern was used for a tangent equation; tan y = tan α gives y = nπ + α, because tan repeats every π.", predict: ord.indexOf(f === 0 ? 1 : 0) },
        { id: "one-family-only", kind: "conceptual", competency: EQN, says: f === 2 ? "Only every 2π was counted; tan repeats every π, so the solutions come every π (divided by the multiple of x)." : "Only one family of solutions was written; in each turn there are two angles with this value.", predict: ord.indexOf(3) },
      ];
    },
    variants: ([f, v, k, w]) => [[f, v, k === 1 ? 2 : 1, w]],
    explain: (s) => (s.id === "principal" ? `The principal value of ${s.inputs[0]}⁻¹(${s.inputs[1]}) is α = ${s.value}` : `For ${s.inputs[0]}: ${["kx = nπ + (−1)ⁿα", "kx = 2nπ ± α", "kx = nπ + α"][FN.indexOf(String(s.inputs[0]))]}, then divide by ${s.inputs[1]}`),
    domain: D_GEN,
    difficulty: ([f, v, k]) => (k === 1 && GENV[f][v].v > 0 ? 1 : k === 1 ? 2 : 3),
    word: ([f, v, k, w]) => `In a physics lab, a signal is recorded as y = ${FN[f]} ${kxs(k)}, with x in radians. An alarm is set to sound at every x where ${eqText(f, GENV[f][v], k, w)}. Which describes all the values of x at which the alarm sounds?`,
    teach: {
      idea: "sin y = sin α ⇔ y = nπ + (−1)ⁿα; cos y = cos α ⇔ y = 2nπ ± α; tan y = tan α ⇔ y = nπ + α (n any integer), with α the principal value.",
      method: "Write the right side as f(α) using the principal value, apply the matching general form to kx, then divide everything by k.",
      alternatives: [{ id: "list_check", title: "List and check a few solutions", kind: "procedural", text: ["Put n = 0, 1, 2, −1 into an option and check each angle in the equation.", "Also find the solutions in one turn from the quadrants: the right option must give all of them and nothing else."] }],
    },
    limits: "Single-function equations with standard values (not 0 or ±1); equations needing factorising are left out.",
  },
  // ======================================================== trigonometric functions
  {
    id: "atval",
    arity: 2,
    title: "Trigonometric functions of any angle",
    competency: TF,
    type: "exact",
    mc: true,
    // [f, m]: f(15m°)
    parse: none,
    reject: gate(D_VAL, K_VAL, "sin, cos, tan, cosec, sec or cot of a multiple of 30° or 45° outside 0°–90°, where defined."),
    prompt: ([f, m]) => `Find the exact value of ${valText(f, 15 * m)}. Simplify fully, with no square root in the denominator.`,
    solve: ([f, m]) => {
      const d = 15 * m;
      const r = ((d % 360) + 360) % 360;
      const ref = r <= 90 ? r : r <= 180 ? 180 - r : r <= 270 ? r - 180 : 360 - r;
      const ans = sFmt(fE(f, d)!);
      return { steps: [st("reduce", "reduce", TF, [d], r), st("reference", "evaluate", RATIOS, [r, ref], ref), st("sign", "evaluate", TF, [FN[f], r], ans)], answer: ans };
    },
    // independent: Math.sin and Math.cos of the angle in radians
    validate: ([f, m], v) => {
      const x = num(v);
      return x !== null && near(x, fNum(f, deg(15 * m)), 1e-9);
    },
    bugs: ([f, m]) => {
      const d = 15 * m;
      const val = fE(f, d)!;
      const out: Bug[] = [];
      if (val.size) out.push({ id: "quadrant-sign", kind: "conceptual", competency: TF, says: `The sign was wrong: in the quadrant of ${d}°, ${FN[f]} is ${sVal(val) > 0 ? "positive" : "negative"}.`, predict: sFmt(sNeg(val)) });
      const r90 = ((d % 90) + 90) % 90;
      const w = r90 ? fE(f, r90) : null;
      if (w) out.push({ id: "no-cofunction-change", kind: "procedural", competency: TF, says: `The angle was written as a multiple of 90° plus ${r90}°, but ${FN[f]} was kept; after an ODD multiple of 90° the function changes to its co-function (sin ↔ cos, tan ↔ cot, sec ↔ cosec).`, predict: sFmt(sVal(val) < 0 ? sNeg(w) : w) });
      if (d < 0) {
        const u = fE(f, -d);
        if (u) out.push({ id: "negative-ignored", kind: "conceptual", competency: TF, says: `${valText(f, d)} was worked out as ${FN[f]} ${-d}°; a negative angle is measured clockwise (sin, tan, cosec, cot change sign; cos and sec do not).`, predict: sFmt(u) });
      }
      return out;
    },
    distractors: ([f, m]) => {
      const val = fE(f, 15 * m)!;
      const out: string[] = [sFmt(sNeg(val))];
      try {
        out.push(sFmt(sInv(val)));
      } catch {
        out.push("1");
      }
      out.push(val.size ? "0" : "1", "1", "−1", "1/2", "√3/2");
      return out;
    },
    variants: ([f, m]) => [[f, m + 2], [f, -m]].filter((q) => inBox(q, D_VAL) && K_VAL(q)),
    explain: (s) => (s.id === "reduce" ? `${neg(Number(s.inputs[0]))}° is the same position as ${s.value}°` : s.id === "reference" ? `${s.inputs[0]}° has reference angle ${s.value}°` : `Use the reference angle with the sign of ${s.inputs[0]} in that quadrant: ${s.value}`),
    domain: D_VAL,
    keep: K_VAL,
    cap: 400,
    difficulty: ([f, m]) => (f <= 1 && m > 0 && m <= 24 ? 1 : f <= 2 ? 2 : 3),
    teach: {
      idea: "Every angle has the same trigonometric values as its position on the unit circle; the value is the reference angle's value with the sign of the quadrant (All, Sin, Tan, Cos).",
      method: "Add or take away 360° until the angle is between 0° and 360°, find its reference angle (its distance from the x-axis), then attach the sign of the function in that quadrant.",
      alternatives: [{ id: "allied", title: "Allied-angle rules", kind: "procedural", text: ["Write the angle as 90° × n ± θ.", "If n is even keep the function; if n is odd change to its co-function. Then fix the sign from the quadrant of the original angle."] }],
    },
    limits: "Multiples of 30° and 45° from −720° to 1080°; non-standard angles need tables or a calculator.",
  },
  {
    id: "atper",
    arity: 4,
    title: "The period of a trigonometric function",
    competency: TF,
    type: "choice",
    // [f, k, a, c]: y = a f(kx + c)
    parse: none,
    reject: gate(D_PER, () => true, "y = a f(kx + c) with k from 2 to 6."),
    choices: (p) => perOrder(p).map((kind) => perText(kind, p[1])),
    prompt: (p) => `What is the period of ${perExpr(p)}?`,
    solve: (p) => {
      const [f, k] = p;
      const kind = f === 2 || f === 5 ? 1 : 0;
      return { steps: [st("base", "recall", TF, [FN[f]], f === 2 || f === 5 ? "π" : "2π"), st("divide", "divide", TF, [k], perText(kind, k))], answer: perOrder(p).indexOf(kind) };
    },
    // independent: test numerically that y(x + T) = y(x) for T but not for T/2 … T/6
    validate: (p, v) => {
      const [f, k, a, c] = p;
      if (typeof v !== "number" || v < 0 || v > 3) return false;
      const y = (x: number) => a * fNum(f, k * x + c);
      const xs = [0.137, 0.411, 0.73, 1.29, 2.03, 2.71];
      const isPer = (T: number) => xs.every((x) => {
        const u = y(x);
        const w = y(x + T);
        return !Number.isFinite(u) || Math.abs(u) > 1e6 || Math.abs(w - u) < 1e-6 * Math.max(1, Math.abs(u));
      });
      const T = perValue(perOrder(p)[v], k);
      return isPer(T) && [2, 3, 4, 5, 6].every((m) => !isPer(T / m));
    },
    bugs: (p) => {
      const [f] = p;
      const ord = perOrder(p);
      const tanLike = f === 2 || f === 5;
      return [
        { id: "multiply-not-divide", kind: "procedural", competency: TF, says: "The period was multiplied by the number in front of x; a bigger multiple of x makes the graph repeat SOONER, so divide.", predict: ord.indexOf(tanLike ? 3 : 2) },
        { id: "period-mixed", kind: "recall", competency: TF, says: tanLike ? `${FN[f]} repeats every π, not every 2π.` : `${FN[f]} repeats every 2π; only tan and cot repeat every π.`, predict: ord.indexOf(tanLike ? 0 : 1) },
      ];
    },
    variants: ([f, k, a, c]) => [[f, k === 6 ? 2 : k + 1, a, c]],
    explain: (s) => (s.id === "base" ? `${s.inputs[0]} x repeats every ${s.value}` : `Multiplying x by ${s.inputs[0]} divides the period by ${s.inputs[0]}: ${s.value}`),
    domain: D_PER,
    cap: 300,
    difficulty: ([f, , a, c]) => (f <= 1 && a === 1 && c === 0 ? 1 : f <= 2 ? 2 : 3),
    word: (p) => `In a computer simulation, a quantity changes with time x (in seconds) as ${perExpr(p)}. After how many seconds does the pattern of values first repeat (the period)?`,
    teach: {
      idea: "sin, cos, sec and cosec repeat every 2π; tan and cot every π. Replacing x by kx makes the graph repeat k times as fast; the number in front and the shift inside do not change the period.",
      method: "Take the basic period (2π or π) and divide it by k.",
      alternatives: [{ id: "solve_for_turn", title: "When does the inside complete a cycle?", kind: "conceptual", text: ["The inside kx + c must grow by one basic period (2π or π).", "kx grows by 2π when x grows by 2π/k: that is the period."] }],
    },
    limits: "Whole-number multiples k from 2 to 6; sums like sin x + cos 2x are left out.",
  },
  // ======================================================== radians
  {
    id: "atrad",
    arity: 1,
    title: "Degrees to radians",
    competency: RAD,
    type: "expression",
    mc: true,
    // [m]: 5m degrees
    parse: none,
    reject: gate(D_RAD, ([m]) => m !== 0, "A non-zero multiple of 5° between −720° and 720°."),
    prompt: ([m]) => `Convert ${neg(5 * m)}° into radians. Write the answer in terms of π (you may type pi).`,
    solve: ([m]) => {
      const ans = piStr(5 * m, 180);
      return { steps: [st("multiply", "multiply", RAD, [5 * m, "π/180"], ans)], answer: ans };
    },
    // independent: the inverse conversion (radians back to degrees) must give the angle
    validate: ([m], v) => {
      const x = num(v);
      return x !== null && near((x * 180) / Math.PI, 5 * m, 1e-9);
    },
    bugs: ([m]) => [
      { id: "pi-dropped", kind: "procedural", competency: RAD, says: "The π was left out; 180° is π radians, so the answer is a fraction OF π.", predict: F((5 * m) / 180) },
      { id: "factor-flipped", kind: "recall", competency: RAD, says: "The angle was multiplied by 180/π; to change degrees to radians multiply by π/180.", predict: `${neg(5 * m * 180)}/π` },
      { id: "full-turn-as-pi", kind: "conceptual", competency: RAD, says: "A full turn was taken as π radians; a full turn is 2π radians, and π is a half turn (180°).", predict: piStr(5 * m, 360) },
    ],
    distractors: ([m]) => [piStr(5 * m, 90), piStr(-5 * m, 180)],
    variants: ([m]) => [[-m]],
    explain: (s) => `${neg(Number(s.inputs[0]))}° × π/180 = ${s.value}`,
    domain: D_RAD,
    keep: ([m]) => m !== 0,
    difficulty: ([m]) => lv(Math.abs(5 * m), 180, 360),
    word: ([m]) => `A giant wheel at a fair in Madurai turns through ${neg(5 * m)}°${m < 0 ? " (the minus sign means clockwise)" : ""}. Write this angle in radians, in terms of π.`,
    teach: {
      idea: "One radian is the angle whose arc equals the radius; a half turn, 180°, is π radians.",
      method: "Multiply the angle in degrees by π/180 and simplify the fraction.",
      alternatives: [{ id: "known_angles", title: "Build from known angles", kind: "conceptual", text: ["30° = π/6, 45° = π/4, 60° = π/3, 90° = π/2, 180° = π.", "75° = 30° + 45° = π/6 + π/4 = 5π/12."] }],
    },
    limits: "Multiples of 5° up to two full turns either way; minutes and seconds of arc are left out.",
  },
  {
    id: "atdeg",
    arity: 2,
    title: "Radians to degrees",
    competency: RAD,
    type: "fraction",
    mc: true,
    // [k, d]: kπ/d radians
    parse: none,
    reject: gate(D_DEG, K_DEG, "kπ/d radians with d from 1 to 12 (not 7 or 11)."),
    prompt: ([k, d]) => `Convert ${piStr(k, d)} radians into degrees.`,
    solve: ([k, d]) => ({ steps: [st("multiply", "multiply", RAD, [piStr(k, d), "180°/π"], (180 * k) / d)], answer: (180 * k) / d }),
    // independent: inverse — the answer times π/180 must equal kπ/d (cross-multiplied)
    validate: ([k, d], v) => typeof v === "number" && near(v * d, 180 * k, 1e-9),
    bugs: ([k, d]) => [
      { id: "denominator-dropped", kind: "procedural", competency: RAD, says: `π was replaced by 180° but the division by ${d} was forgotten.`, predict: 180 * k },
      { id: "pi-as-full-turn", kind: "conceptual", competency: RAD, says: "π was replaced by 360°; π radians is a half turn, 180°.", predict: (360 * k) / d },
    ],
    distractors: ([k, d]) => [(90 * k) / d, (180 * d) / k, -(180 * k) / d],
    variants: ([k, d]) => [[-k, d]],
    explain: (s) => `Replace π by 180°: ${s.inputs[0]} = ${F(Number(s.value))}°`,
    domain: D_DEG,
    keep: K_DEG,
    cap: 300,
    difficulty: ([k, d]) => ((180 * k) % d !== 0 ? 3 : Math.abs(k) <= d ? 1 : 2),
    word: ([k, d]) => `A pendulum in a science lab swings through an angle of ${piStr(k, d)} radians${k < 0 ? " (measured clockwise)" : ""}. How many degrees is that?`,
    teach: {
      idea: "π radians is 180°, so 1 radian = 180°/π (about 57.3°).",
      method: "Multiply by 180/π; with π in the angle, simply replace π by 180° and simplify.",
      alternatives: [{ id: "fraction_of_turn", title: "As a fraction of a half turn", kind: "conceptual", text: ["kπ/d radians is k/d of a half turn.", "So it is (k/d) × 180°."] }],
    },
    limits: "Rational multiples of π; radians without π (like 2 radians in degrees and minutes) are left out.",
  },
  {
    id: "atarc",
    arity: 3,
    title: "Arc length and sector area",
    competency: RAD,
    type: "fraction",
    mc: true,
    decimals: true,
    // kind 0: arc length, r = 7a, angle 15b°, π = 22/7; kind 1: angle = l/r with l = a, r = b; kind 2: sector area, r = a, θ = b/4
    parse: none,
    reject: gate(D_ARC, K_ARC, "Arc length with π = 22/7, an angle from l = rθ, or a sector area ½r²θ."),
    prompt: ([kind, a, b]) =>
      kind === 0
        ? `A circle has radius ${7 * a} cm. Find the length of the arc that subtends an angle of ${15 * b}° at the centre, in cm. Use π = 22/7.`
        : kind === 1
          ? `An arc of length ${a} cm lies on a circle of radius ${b} cm. Find the angle it subtends at the centre, in radians.`
          : `Find the area (in cm²) of a sector of a circle of radius ${a} cm whose angle at the centre is ${dec(b / 4)} radians.`,
    solve: ([kind, a, b]) => {
      if (kind === 0) {
        const th = (15 * b * 22) / (180 * 7);
        return { steps: [st("radians", "convert", RAD, [15 * b], th), st("arc", "multiply", RAD, [7 * a, F(th)], 7 * a * th)], answer: 7 * a * th };
      }
      if (kind === 1) return { steps: [st("angle", "divide", RAD, [a, b], a / b)], answer: a / b };
      return { steps: [st("area", "multiply", RAD, [a, b / 4], (a * a * b) / 8)], answer: (a * a * b) / 8 };
    },
    // independent: as a fraction of the whole circle (circumference 2πr or area πr²)
    validate: ([kind, a, b], v) => {
      if (typeof v !== "number") return false;
      if (kind === 0) return near(((15 * b) / 360) * 2 * (22 / 7) * 7 * a, v, 1e-9);
      if (kind === 1) return near(v * b, a, 1e-9);
      return near((b / 4 / (2 * Math.PI)) * Math.PI * a * a, v, 1e-9);
    },
    bugs: ([kind, a, b]) => {
      if (kind === 0) return [
        { id: "degrees-used", kind: "conceptual", competency: RAD, says: "The angle in degrees was multiplied by the radius; l = rθ needs θ in radians.", predict: 7 * a * 15 * b },
        { id: "area-formula", kind: "recall", competency: RAD, says: "The sector-area formula ½r²θ was used; the arc length is rθ.", predict: (7 * a * 7 * a * ((15 * b * 22) / (180 * 7))) / 2 },
      ];
      if (kind === 1) return [
        { id: "inverted", kind: "procedural", competency: RAD, says: "r was divided by l; from l = rθ, θ = l ÷ r.", predict: b / a },
        { id: "multiplied", kind: "procedural", competency: RAD, says: "l and r were multiplied; θ = l ÷ r.", predict: a * b },
      ];
      return [
        { id: "half-dropped", kind: "recall", competency: RAD, says: "The ½ was left out; the sector area is ½r²θ.", predict: (a * a * b) / 4 },
        { id: "radius-not-squared", kind: "recall", competency: RAD, says: "r was not squared; the sector area is ½r²θ.", predict: (a * b) / 8 },
      ];
    },
    variants: ([kind, a, b]) => [[kind, a, b + 1]].filter((q) => inBox(q, D_ARC) && K_ARC(q)),
    explain: (s) => (s.id === "radians" ? `${s.inputs[0]}° = ${s.inputs[0]} × π/180 = ${F(Number(s.value))} radians (π = 22/7)` : s.id === "arc" ? `l = rθ = ${s.inputs[0]} × ${s.inputs[1]} = ${F(Number(s.value))}` : s.id === "angle" ? `θ = l/r = ${s.inputs[0]}/${s.inputs[1]} = ${F(Number(s.value))}` : `A = ½r²θ = ½ × ${s.inputs[0]}² × ${s.inputs[1]} = ${F(Number(s.value))}`),
    domain: D_ARC,
    keep: K_ARC,
    cap: 400,
    difficulty: ([kind]) => (kind === 1 ? 1 : kind === 2 ? 2 : 3),
    word: ([kind, a, b]) =>
      kind === 0
        ? `A pendulum ${7 * a} cm long swings through an angle of ${15 * b}°. How far (in cm) does its tip travel along the arc? Use π = 22/7.`
        : kind === 1
          ? `A cyclist rides ${a} m along a circular track of radius ${b} m. Through what angle, in radians, has the cyclist turned about the centre?`
          : `A garden sprinkler waters a sector of radius ${a} m with an angle of ${dec(b / 4)} radians. What area (in m²) does it water?`,
    teach: {
      idea: "With θ in radians, the arc is θ radii long (l = rθ) and the sector is the fraction θ/2π of the circle (A = ½r²θ).",
      method: "Change degrees to radians first (× π/180), then use l = rθ or A = ½r²θ; to find θ use θ = l/r.",
      alternatives: [{ id: "fraction_of_circle", title: "Fraction of the whole circle", kind: "conceptual", text: ["An angle of x° is x/360 of a full turn.", "So the arc is (x/360) × 2πr and the sector is (x/360) × πr²."] }],
    },
    limits: "Arc lengths with π = 22/7, angles from l and r, and sector areas; segment areas are left out.",
  },
  // ======================================================== triangle laws
  {
    id: "atsiner",
    arity: 2,
    title: "Finding a side with the sine rule",
    competency: TRL,
    type: "exact",
    mc: true,
    // [pair, a]: angles A, B and side a; find b
    parse: none,
    reject: gate(D_SINR, () => true, "Two standard angles and the side opposite one of them."),
    prompt: ([pi, a]) => `In triangle ABC, A = ${SPAIRS[pi][0]}°, B = ${SPAIRS[pi][1]}° and a = ${a} cm. Using the sine rule, find b in cm. Give the exact value.`,
    solve: ([pi, a]) => {
      const [A, B] = SPAIRS[pi];
      const ans = sFmt(sScale(sDiv(sinE(B), sinE(A)), [a, 1]));
      return { steps: [st("rule", "rewrite", TRL, [a, A, B], `b = ${a} sin ${B}°/sin ${A}°`), st("evaluate", "evaluate", RATIOS, [sFmt(sinE(B)), sFmt(sinE(A))], ans)], answer: ans };
    },
    // independent: construct the triangle from B = (0, 0), C = (a, 0) and the two angles; measure CA
    validate: ([pi, a], v) => {
      const [A, B] = SPAIRS[pi];
      const C = 180 - A - B;
      const u = [Math.cos(deg(B)), Math.sin(deg(B))];
      const w = [Math.cos(Math.PI - deg(C)), Math.sin(Math.PI - deg(C))];
      const det = -u[0] * w[1] + w[0] * u[1];
      const s = (-a * w[1]) / det;
      const P = [s * u[0], s * u[1]];
      const x = num(v);
      return x !== null && near(Math.hypot(P[0] - a, P[1]), x, 1e-9);
    },
    bugs: ([pi, a]) => {
      const [A, B] = SPAIRS[pi];
      return [
        { id: "ratio-inverted", kind: "procedural", competency: TRL, says: "The sines were the wrong way up; a/sin A = b/sin B gives b = a sin B / sin A.", predict: sFmt(sScale(sDiv(sinE(A), sinE(B)), [a, 1])) },
        { id: "angles-proportional", kind: "conceptual", competency: TRL, says: "The sides were taken in the same ratio as the angles; sides are in the ratio of the SINES of the opposite angles.", predict: F((a * B) / A) },
      ];
    },
    distractors: ([pi, a]) => [sFmt(sScale(sMul(sinE(SPAIRS[pi][1]), sinE(SPAIRS[pi][0])), [a, 1])), String(a)],
    variants: ([pi, a]) => [[pi, a + 1]].filter((q) => inBox(q, D_SINR)),
    explain: (s) => (s.id === "rule" ? `a/sin A = b/sin B, so ${s.value}` : `sin B = ${s.inputs[0]}, sin A = ${s.inputs[1]}: b = ${s.value}`),
    domain: D_SINR,
    cap: 300,
    difficulty: ([pi]) => (SPAIRS[pi].includes(90) ? 1 : SPAIRS[pi].some((x) => x > 90) ? 3 : 2),
    word: ([pi, a]) => `A surveyor marks three points A, B and C in a field. The angle at A is ${SPAIRS[pi][0]}°, the angle at B is ${SPAIRS[pi][1]}°, and the distance BC is ${a} m. How far is it from C to A, in metres? Give the exact value.`,
    teach: {
      idea: "In any triangle a/sin A = b/sin B = c/sin C: each side is proportional to the sine of the angle opposite it.",
      method: "Write a/sin A = b/sin B, put in the known values and solve for b; then simplify the surds.",
      alternatives: [{ id: "altitude", title: "Drop a perpendicular", kind: "conceptual", text: ["The height from C to AB equals b sin A and also a sin B.", "So b sin A = a sin B, which is the sine rule."] }],
    },
    limits: "Standard angles and whole-number sides; the ambiguous case (two triangles) is left out.",
  },
  {
    id: "atcosr",
    arity: 3,
    title: "The cosine of an angle from three sides",
    competency: TRL,
    type: "fraction",
    mc: true,
    parse: none,
    reject: gate(D_COSR, K_COSR, "Three whole-number sides from 2 to 15 that make a triangle (not equilateral, not right-angled at A)."),
    prompt: ([a, b, c]) => `In triangle ABC, a = ${a} cm, b = ${b} cm and c = ${c} cm. Find cos A.`,
    solve: ([a, b, c]) => {
      const ans = (b * b + c * c - a * a) / (2 * b * c);
      return { steps: [st("rule", "substitute", TRL, [b * b, c * c, a * a, 2 * b * c], b * b + c * c - a * a), st("divide", "divide", TRL, [b * b + c * c - a * a, 2 * b * c], ans)], answer: ans };
    },
    // independent: build the triangle with B = (0, 0), C = (a, 0), find A by bisection on the angle at B, then use vectors
    validate: ([a, b, c], v) => {
      if (typeof v !== "number") return false;
      let lo = 0;
      let hi = Math.PI;
      const P = (t: number) => [c * Math.cos(t), c * Math.sin(t)];
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const [x, y] = P(mid);
        if (Math.hypot(x - a, y) < b) lo = mid;
        else hi = mid;
      }
      const [x, y] = P((lo + hi) / 2);
      const AB = [-x, -y];
      const AC = [a - x, -y];
      return near((AB[0] * AC[0] + AB[1] * AC[1]) / (Math.hypot(...AB) * Math.hypot(...AC)), v, 1e-8);
    },
    bugs: ([a, b, c]) => [
      { id: "wrong-sign", kind: "recall", competency: TRL, says: `The squares were combined the wrong way; cos A = (b² + c² − a²)/(2bc), with the side opposite A taken away.`, predict: (a * a - b * b - c * c) / (2 * b * c) },
      { id: "two-dropped", kind: "recall", competency: TRL, says: "The 2 in the denominator was left out: cos A = (b² + c² − a²)/(2bc).", predict: (b * b + c * c - a * a) / (b * c) },
      { id: "wrong-angle", kind: "procedural", competency: TRL, says: "The formula for a different angle was used; for A, the side a (opposite A) is the one taken away.", predict: (a * a + c * c - b * b) / (2 * a * c) },
    ],
    variants: ([a, b, c]) => [[b, a, c]].filter((q) => K_COSR(q)),
    explain: (s) => (s.id === "rule" ? `b² + c² − a² = ${s.inputs[0]} + ${s.inputs[1]} − ${s.inputs[2]} = ${s.value}` : `cos A = ${s.inputs[0]}/${s.inputs[1]} = ${F(Number(s.value))}`),
    domain: D_COSR,
    keep: K_COSR,
    cap: 400,
    difficulty: ([a, b, c]) => (b * b + c * c - a * a < 0 ? 3 : Math.max(a, b, c) <= 8 ? 1 : 2),
    word: ([a, b, c]) => `Three villages P, Q and R are joined by straight roads: QR = ${a} km, RP = ${b} km and PQ = ${c} km. Find the cosine of the angle between the roads at P.`,
    teach: {
      idea: "The cosine rule a² = b² + c² − 2bc cos A extends Pythagoras: the extra term corrects for A not being 90°.",
      method: "Rearrange to cos A = (b² + c² − a²)/(2bc) and substitute; a negative answer means A is obtuse.",
      alternatives: [{ id: "coordinates", title: "Use coordinates", kind: "conceptual", text: ["Put A at the origin and AB along the x-axis: B = (c, 0), C = (b cos A, b sin A).", "Then a² = (b cos A − c)² + (b sin A)² = b² + c² − 2bc cos A."] }],
    },
    limits: "Whole-number sides up to 15; finding the angle itself from cos A needs tables and is left out.",
  },
  {
    id: "atarea",
    arity: 3,
    title: "Area of a triangle from two sides and the included angle",
    competency: TRL,
    type: "exact",
    mc: true,
    parse: none,
    reject: gate(D_TAREA, K_TAREA, "Two sides from 2 to 20 and a standard included angle."),
    prompt: ([a, b, ci]) => `In triangle ABC, a = ${a} cm, b = ${b} cm and C = ${TANG[ci]}°. Find the area of the triangle in cm². Give the exact value.`,
    solve: ([a, b, ci]) => {
      const ans = sFmt(sScale(sinE(TANG[ci]), [a * b, 2]));
      return { steps: [st("formula", "multiply", TRL, [a, b, sFmt(sinE(TANG[ci]))], ans)], answer: ans };
    },
    // independent: the third side from coordinates, then Heron's formula
    validate: ([a, b, ci], v) => {
      const C = deg(TANG[ci]);
      const c = Math.hypot(a * Math.cos(C) - b, a * Math.sin(C));
      const s = (a + b + c) / 2;
      const x = num(v);
      return x !== null && near(Math.sqrt(s * (s - a) * (s - b) * (s - c)), x, 1e-8);
    },
    bugs: ([a, b, ci]) => [
      { id: "half-dropped", kind: "recall", competency: TRL, says: "The ½ was left out; the area is ½ab sin C (ab sin C is the parallelogram).", predict: sFmt(sScale(sinE(TANG[ci]), [a * b, 1])) },
      { id: "cos-for-sin", kind: "recall", competency: TRL, says: "cos C was used; the height of the triangle on side b is a sin C, so the area uses sin C.", predict: sFmt(sScale(cosE(TANG[ci]), [a * b, 2])) },
    ],
    distractors: ([a, b]) => [F((a * b) / 2), String(a * b)],
    variants: ([a, b, ci]) => [[a, b, (ci + 1) % 7]],
    explain: (s) => `Area = ½ab sin C = ½ × ${s.inputs[0]} × ${s.inputs[1]} × ${s.inputs[2]} = ${s.value}`,
    domain: D_TAREA,
    keep: K_TAREA,
    cap: 300,
    difficulty: ([, , ci]) => (TANG[ci] === 90 || TANG[ci] === 30 || TANG[ci] === 150 ? 1 : 2),
    word: ([a, b, ci]) => `A triangular plot of land has two sides of ${a} m and ${b} m, with an angle of ${TANG[ci]}° between them. Find the area of the plot in m², exactly.`,
    teach: {
      idea: "Taking b as the base, the height is a sin C, so the area is ½ × b × a sin C.",
      method: "Multiply the two sides, multiply by sin of the angle between them, and halve.",
      alternatives: [{ id: "heron", title: "Check with Heron's formula", kind: "procedural", text: ["Find the third side with the cosine rule.", "Then area = √(s(s − a)(s − b)(s − c)) with s half the perimeter."] }],
    },
    limits: "Standard included angles; areas from three sides (Heron) are another competency.",
  },
  // ======================================================== inverse trigonometric functions
  {
    id: "atinv",
    arity: 5,
    title: "Principal values of inverse trigonometric functions",
    competency: INV,
    type: "expression",
    mc: true,
    // [f, i, g, j, s]: f⁻¹(arg i) (s = 0), or f⁻¹(arg i) ± g⁻¹(arg j) (s = 1, 2)
    parse: none,
    reject: gate(D_INV, K_INV, "Principal values of sin⁻¹ … cosec⁻¹ at standard arguments, alone or as a sum or difference of two."),
    prompt: (p) => `Find the value of ${invExpr(p)} using principal values. Write the answer in terms of π (you may type pi).`,
    solve: (p) => {
      const ts = invTerms(p);
      const K = ts.reduce((s, t) => s + t.sg * t.a.k, 0);
      return { steps: [...ts.map((t, i) => st(`term${i}`, "evaluate", INV, [INVT[t.f].n, t.a.t], piStr(t.a.k, 12))), st("total", "add", INV, [], piStr(K, 12))], answer: piStr(K, 12) };
    },
    // independent: Math.asin / Math.acos / Math.atan of the arguments, added numerically
    validate: (p, v) => {
      const x = num(v);
      const tot = invTerms(p).reduce((s, t) => s + t.sg * invNum(t.f, t.a.v), 0);
      return x !== null && near(x, tot, 1e-9);
    },
    bugs: (p) => {
      const ts = invTerms(p);
      const K = ts.reduce((s, t) => s + t.sg * t.a.k, 0);
      const out: Bug[] = [];
      const oddWrong = ts.filter((t) => [1, 3, 4].includes(t.f) && t.a.v < 0);
      if (oddWrong.length) out.push({ id: "odd-rule-misused", kind: "conceptual", competency: INV, says: `${INVT[oddWrong[0].f].n}(−x) was taken as −${INVT[oddWrong[0].f].n}(x); for cos⁻¹, sec⁻¹ and cot⁻¹ the rule is π − ${INVT[oddWrong[0].f].n}(x), because their principal values lie between 0 and π.`, predict: piStr(K + oddWrong.reduce((s, t) => s + t.sg * (-posK(t.f, t.a) - t.a.k), 0), 12) });
      const branchWrong = ts.filter((t) => [0, 2, 5].includes(t.f) && t.a.v < 0);
      if (branchWrong.length) out.push({ id: "outside-branch", kind: "conceptual", competency: INV, says: `An angle outside the principal range was given for ${INVT[branchWrong[0].f].n} of a negative number; its principal value lies between −π/2 and π/2, so it is negative here.`, predict: piStr(K + branchWrong.reduce((s, t) => s + t.sg * 24, 0), 12) });
      return out;
    },
    distractors: (p) => {
      const K = invTerms(p).reduce((s, t) => s + t.sg * t.a.k, 0);
      return [piStr(K + 6, 12), piStr(K - 6, 12), piStr(12 - K, 12), piStr(-K, 12)];
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `Add the principal values: ${s.value}` : `${s.inputs[0]}(${s.inputs[1]}) = ${s.value}`),
    domain: D_INV,
    keep: K_INV,
    difficulty: (p) => (p[4] !== 0 ? 3 : INVT[p[0]].args[p[1]].v < 0 ? 2 : 1),
    teach: {
      idea: "Each inverse function returns one angle from its principal range: sin⁻¹, tan⁻¹, cosec⁻¹ in [−π/2, π/2]; cos⁻¹, cot⁻¹, sec⁻¹ in [0, π]. That is why it has a single value.",
      method: "Find the standard angle whose ratio is the argument, then make sure it lies in the principal range: for a negative argument use −θ (sin⁻¹, tan⁻¹, cosec⁻¹) or π − θ (cos⁻¹, sec⁻¹, cot⁻¹).",
      alternatives: [{ id: "reciprocal", title: "Turn sec⁻¹, cosec⁻¹, cot⁻¹ into the basic three", kind: "procedural", text: ["sec⁻¹ x = cos⁻¹(1/x) and cosec⁻¹ x = sin⁻¹(1/x).", "cot⁻¹ x = tan⁻¹(1/x) for x > 0, and π + tan⁻¹(1/x) for x < 0."] }],
    },
    limits: "Standard arguments only; equations in inverse functions and their sum formulas are left out.",
  },
  {
    id: "atinvc",
    arity: 3,
    title: "sin⁻¹(sin θ), cos⁻¹(cos θ) and tan⁻¹(tan θ)",
    competency: INV,
    type: "expression",
    mc: true,
    // [f, k, m]: f⁻¹(f(kπ/m)), θ outside the principal range
    parse: none,
    reject: gate(D_INVC, K_INVC, "θ = kπ/m (m from 3 to 10, up to 3π either way) outside the principal range."),
    prompt: ([f, k, m]) => `Find the value of ${["sin⁻¹(sin", "cos⁻¹(cos", "tan⁻¹(tan"][f]}(${piStr(k, m)})). Write the answer in terms of π (you may type pi).`,
    solve: ([f, k, m]) => {
      const K = invcReduce(f, k, m);
      return { steps: [st("shift", "reduce", TF, [piStr(k, m)], piStr(invcReduce(f, k, m, false), m)), st("branch", "evaluate", INV, [["[−π/2, π/2]", "[0, π]", "(−π/2, π/2)"][f]], piStr(K, m))], answer: piStr(K, m) };
    },
    // independent: Math.asin(Math.sin θ) and the others, numerically
    validate: ([f, k, m], v) => {
      const t = (k * Math.PI) / m;
      const x = num(v);
      return x !== null && near(x, [Math.asin(Math.sin(t)), Math.acos(Math.cos(t)), Math.atan(Math.tan(t))][f], 1e-9);
    },
    bugs: ([f, k, m]) => {
      const out: Bug[] = [{ id: "cancel", kind: "conceptual", competency: INV, says: `The inverse and the function were 'cancelled'; ${["sin⁻¹(sin θ) = θ", "cos⁻¹(cos θ) = θ", "tan⁻¹(tan θ) = θ"][f]} only when θ is in the principal range.`, predict: piStr(k, m) }];
      if (f < 2) out.push({ id: "shift-no-reflect", kind: "procedural", competency: INV, says: f === 0 ? "A multiple of 2π was removed, but the angle was not reflected into [−π/2, π/2]: use sin(π − θ) = sin θ." : "A multiple of 2π was removed, but the angle was not brought into [0, π]: use cos(2π − θ) = cos θ.", predict: piStr(invcReduce(f, k, m, false), m) });
      else out.push({ id: "period-2pi", kind: "recall", competency: INV, says: "Multiples of 2π were removed; tan repeats every π, so remove multiples of π.", predict: piStr((((k + m) % (2 * m)) + 2 * m) % (2 * m) - m === -m ? m : ((((k + m) % (2 * m)) + 2 * m) % (2 * m)) - m, m) });
      return out;
    },
    distractors: ([f, k, m]) => {
      const K = invcReduce(f, k, m);
      return [piStr(-K, m), piStr(m - K, m), piStr(K + m, m)];
    },
    variants: ([f, k, m]) => [[f, k + 1, m]].filter((q) => inBox(q, D_INVC) && K_INVC(q)),
    explain: (s) => (s.id === "shift" ? `${s.inputs[0]} has the same ratio as ${s.value} (a whole number of turns removed)` : `The angle in ${s.inputs[0]} with the same ratio is ${s.value}`),
    domain: D_INVC,
    keep: K_INVC,
    cap: 300,
    difficulty: ([, k, m]) => lv(Math.abs(k / m), 1, 2),
    teach: {
      idea: "sin⁻¹(sin θ) is the angle in [−π/2, π/2] with the same sine as θ; it equals θ only when θ is already in that range (similarly [0, π] for cos⁻¹ and (−π/2, π/2) for tan⁻¹).",
      method: "Find an angle in the principal range with the same ratio: use sin(π − θ) = sin θ, cos(2π − θ) = cos θ, tan(θ − π) = tan θ, and add or remove whole turns.",
      alternatives: [{ id: "unit_circle", title: "Use the unit circle", kind: "conceptual", text: ["Mark θ on the unit circle. For sine, move to the point with the same height on the right half.", "For cosine, move to the point with the same x on the upper half; for tangent, to the same line through the origin on the right half."] }],
    },
    limits: "Single compositions with rational multiples of π; cos⁻¹(sin θ) and similar cross compositions are left out.",
  },
  // ======================================================== vector algebra
  {
    id: "atlin",
    arity: 8,
    title: "Linear combinations of vectors in components",
    competency: VA,
    type: "tuple",
    mc: true,
    // [a1..a3, b1..b3, p, q]: p a + q b
    parse: none,
    reject: gate(D_LIN, K_LIN, "p a + q b for vectors with components from −5 to 5 and p, q from −3 to 3 (not 0)."),
    prompt: (x) => {
      const [p, q] = x.slice(6);
      return `If a = ${vt(x.slice(0, 3))} and b = ${vt(x.slice(3, 6))}, find ${p === 1 ? "" : p === -1 ? "−" : neg(p)}a ${q < 0 ? "−" : "+"} ${Math.abs(q) === 1 ? "" : Math.abs(q)}b. Write it as components (x, y, z).`;
    },
    solve: (x) => {
      const a = x.slice(0, 3);
      const b = x.slice(3, 6);
      const [p, q] = x.slice(6);
      const r = a.map((v, i) => p * v + q * b[i]);
      return { steps: [st("scale", "multiply", VA, [p, q], tupS(a.map((v) => p * v))), st("add", "add", VA, [tupS(b.map((v) => q * v))], tupS(r))], answer: tupS(r) };
    },
    // independent: repeated addition of a and b, one copy at a time
    validate: (x, v) => {
      const t = tup(v);
      if (!t || t.length !== 3) return false;
      const a = x.slice(0, 3);
      const b = x.slice(3, 6);
      const [p, q] = x.slice(6);
      const r = [0, 0, 0];
      for (let k = 0; k < Math.abs(p); k++) for (let i = 0; i < 3; i++) r[i] += Math.sign(p) * a[i];
      for (let k = 0; k < Math.abs(q); k++) for (let i = 0; i < 3; i++) r[i] += Math.sign(q) * b[i];
      return r.every((c, i) => near(c, t[i], 1e-12));
    },
    bugs: (x) => {
      const a = x.slice(0, 3);
      const b = x.slice(3, 6);
      const [p, q] = x.slice(6);
      const out: Bug[] = [{ id: "scalar-first-only", kind: "procedural", competency: VA, says: "The number in front of a vector was multiplied into its first component only; it multiplies every component.", predict: tupS([p * a[0] + q * b[0], a[1] + b[1], a[2] + b[2]]) }];
      if (q < 0) out.push({ id: "minus-first-only", kind: "procedural", competency: VA, says: `The minus sign before ${Math.abs(q) === 1 ? "" : Math.abs(q)}b was applied to its first component only; it changes the sign of every component.`, predict: tupS([p * a[0] + q * b[0], p * a[1] - q * b[1], p * a[2] - q * b[2]]) });
      return out;
    },
    distractors: (x) => {
      const a = x.slice(0, 3);
      const b = x.slice(3, 6);
      const [p, q] = x.slice(6);
      return [tupS(a.map((v, i) => p * v - q * b[i])), tupS(a.map((v, i) => q * v + p * b[i]))];
    },
    variants: () => [],
    explain: (s) => (s.id === "scale" ? `${s.inputs[0]}a = ${s.value}` : `Add ${s.inputs[0]} component by component: ${s.value}`),
    domain: D_LIN,
    keep: K_LIN,
    cap: 300,
    difficulty: (x) => (x[6] > 0 && x[7] > 0 ? 1 : x[6] > 0 || x[7] > 0 ? 2 : 3),
    word: (x) => {
      const [p, q] = x.slice(6);
      return `A drone's control program stores two moves, a = ${vt(x.slice(0, 3))} and b = ${vt(x.slice(3, 6))} (in metres). It runs move a ${Math.abs(p)} time${Math.abs(p) === 1 ? "" : "s"}${p < 0 ? " in reverse" : ""} and move b ${Math.abs(q)} time${Math.abs(q) === 1 ? "" : "s"}${q < 0 ? " in reverse" : ""}. Find its total displacement as components (x, y, z).`;
    },
    teach: {
      idea: "Vectors in î, ĵ, k̂ form are added and scaled component by component, because î, ĵ and k̂ point in independent directions.",
      method: "Multiply every component of a by p and every component of b by q, then add the matching components.",
      alternatives: [{ id: "column", title: "Write them as columns", kind: "procedural", text: ["Write each vector as a column of three numbers.", "Scale each column, then add across each row."] }],
    },
    limits: "Two vectors with small whole components; geometric (triangle-law) diagrams are drawn by learners and marked by an educator.",
  },
  {
    id: "atmag",
    arity: 6,
    title: "Magnitude of the vector joining two points",
    competency: VA,
    type: "exact",
    mc: true,
    parse: none,
    reject: gate(D_MAG, K_MAG, "Two points with whole coordinates from −6 to 6."),
    prompt: (x) => `Points A and B have position vectors ${vt(x.slice(0, 3))} and ${vt(x.slice(3))}. Find the magnitude |AB| of the vector AB. Give the exact value.`,
    solve: (x) => {
      const d = sub(x.slice(3), x.slice(0, 3));
      return { steps: [st("vector", "subtract", VA, [], tupS(d)), st("square", "add", VA, d, len2(d)), st("root", "root", SURDS, [len2(d)], rootS(len2(d)))], answer: rootS(len2(d)) };
    },
    // independent: Math.hypot of the coordinate differences
    validate: (x, v) => {
      const n = num(v);
      return n !== null && near(n, Math.hypot(x[3] - x[0], x[4] - x[1], x[5] - x[2]), 1e-9);
    },
    bugs: (x) => {
      const d = sub(x.slice(3), x.slice(0, 3));
      const s = x.slice(0, 3).map((v, i) => v + x[3 + i]);
      return [
        { id: "root-missing", kind: "procedural", competency: VA, says: "The square root was not taken; |AB| = √(x² + y² + z²).", predict: String(len2(d)) },
        { id: "added-points", kind: "conceptual", competency: VA, says: "The position vectors were added; the vector AB is (position of B) − (position of A).", predict: isZero(s) ? null : rootS(len2(s)) },
        { id: "components-added", kind: "conceptual", competency: VA, says: "The components were added without squaring; the length comes from Pythagoras in three dimensions.", predict: String(Math.abs(d[0] + d[1] + d[2])) },
      ];
    },
    distractors: (x) => [rootS(len2(sub(x.slice(3), x.slice(0, 3))) + 1), String(len2(sub(x.slice(3), x.slice(0, 3))) * 2)],
    variants: () => [],
    explain: (s) => (s.id === "vector" ? `AB = OB − OA = ${s.value}` : s.id === "square" ? `x² + y² + z² = ${s.value}` : `|AB| = √${s.inputs[0]} = ${s.value}`),
    domain: D_MAG,
    keep: K_MAG,
    cap: 300,
    difficulty: (x) => (sqf(len2(sub(x.slice(3), x.slice(0, 3))))[1] === 1 ? 1 : 2),
    word: (x) => `A drone flies in a straight line from the point A${pt(x.slice(0, 3))} to the point B${pt(x.slice(3))} (coordinates in metres). How far does it fly? Give the exact value in metres.`,
    teach: {
      idea: "The vector AB is OB − OA; its length is √(x² + y² + z²), Pythagoras used twice.",
      method: "Subtract A's components from B's, square the three differences, add, and take the square root (simplify the surd).",
      alternatives: [{ id: "box", title: "The diagonal of a box", kind: "conceptual", text: ["The differences are the edges of a box with A and B at opposite corners.", "The floor diagonal is √(x² + y²); with the height z, the full diagonal is √(x² + y² + z²)."] }],
    },
    limits: "Whole-number coordinates up to 6; unit vectors are with direction cosines.",
  },
  {
    id: "atsec",
    arity: 9,
    title: "The section formula with position vectors",
    competency: VA,
    type: "tuple",
    mc: true,
    // [P, Q, m, n, e]: internal (e = 0) or external (e = 1) division in m : n
    parse: none,
    reject: gate(D_SEC, K_SEC, "P and Q with components from −5 to 5, a ratio m : n in lowest terms (m, n up to 4)."),
    prompt: (x) => {
      const [m, n, e] = x.slice(6);
      return `Points P and Q have position vectors ${vt(x.slice(0, 3))} and ${vt(x.slice(3, 6))}. Find the position vector of the point R that divides PQ ${e ? "externally" : "internally"} in the ratio ${m} : ${n}. Write its components as (x, y, z).`;
    },
    solve: (x) => {
      const P = x.slice(0, 3);
      const Q = x.slice(3, 6);
      const [m, n, e] = x.slice(6);
      const R = secPoint(P, Q, m, n, e);
      return { steps: [st("formula", "rewrite", VA, [m, n, e], e ? `(${m}q − ${n}p)/(${m} − ${n})` : `(${m}q + ${n}p)/(${m} + ${n})`), st("evaluate", "evaluate", VA, [], tupS(R))], answer: tupS(R) };
    },
    // independent: R is on line PQ (cross product zero), |PR| : |RQ| = m : n, and between P and Q exactly when internal
    validate: (x, v) => {
      const R = tup(v);
      if (!R || R.length !== 3) return false;
      const P = x.slice(0, 3);
      const Q = x.slice(3, 6);
      const [m, n, e] = x.slice(6);
      const PR = sub(R, P);
      const RQ = sub(Q, R);
      const c = cross(PR, sub(Q, P));
      if (!c.every((t) => Math.abs(t) < 1e-9)) return false;
      if (!near(len2(PR) * n * n, len2(RQ) * m * m, 1e-9)) return false;
      const d = dot(PR, RQ);
      return e ? d < 0 : d > 0;
    },
    bugs: (x) => {
      const P = x.slice(0, 3);
      const Q = x.slice(3, 6);
      const [m, n, e] = x.slice(6);
      const out: Bug[] = [{ id: "ratio-swapped", kind: "procedural", competency: VA, says: `The ratio was used the wrong way round; for ${m} : ${n} from P, multiply q by ${m} and p by ${n}.`, predict: m === n ? null : tupS(secPoint(P, Q, n, m, e)) }];
      if (e) out.push({ id: "external-as-internal", kind: "conceptual", competency: VA, says: "The internal formula was used; for external division R lies outside PQ and r = (mq − np)/(m − n).", predict: tupS(secPoint(P, Q, m, n, 0)) });
      else if (m !== n) out.push({ id: "internal-as-external", kind: "conceptual", competency: VA, says: "The external formula was used; for internal division r = (mq + np)/(m + n).", predict: tupS(secPoint(P, Q, m, n, 1)) });
      return out;
    },
    distractors: (x) => [tupS(x.slice(0, 3).map((v, i) => (v + x[3 + i]) / 2)), tupS(x.slice(3, 6).map((v, i) => v - x[i])), tupS(x.slice(3, 6).map((v, i) => v + x[i])), tupS(x.slice(3, 6).map((v, i) => 2 * v - x[i]))],
    variants: () => [],
    explain: (s) => (s.id === "formula" ? `r = ${s.value}` : `Component by component: r = ${s.value}`),
    domain: D_SEC,
    keep: K_SEC,
    cap: 400,
    difficulty: (x) => (x[8] === 1 ? 3 : x[6] === x[7] ? 1 : 2),
    teach: {
      idea: "R divides PQ in m : n internally when PR : RQ = m : n with R between P and Q; then r = (mq + np)/(m + n). Externally, R is outside the segment and r = (mq − np)/(m − n).",
      method: "Choose the formula, multiply q by m and p by n, add (or subtract), and divide each component by m + n (or m − n).",
      alternatives: [{ id: "steps_along", title: "Walk along the segment", kind: "conceptual", text: ["Internally, R is m/(m + n) of the way from P to Q: r = p + (m/(m + n))(q − p).", "Externally, R = p + (m/(m − n))(q − p), which goes past Q (or behind P)."] }],
    },
    limits: "Whole-number position vectors and ratios up to 4; proofs with the section formula need written reasons.",
  },
  // ======================================================== direction cosines
  {
    id: "atdc",
    arity: 6,
    title: "Direction cosines of a vector joining two points",
    competency: DC,
    type: "tuple",
    mc: true,
    // [d1, d2, d3, A1, A2, A3]: B = A + d
    parse: none,
    reject: gate(D_DC, K_DC, "A with components from −4 to 4 and AB with components from −6 to 6 (at least two non-zero)."),
    prompt: (x) => {
      const A = x.slice(3);
      const B = A.map((v, i) => v + x[i]);
      return `A and B are the points ${pt(A)} and ${pt(B)}. Find the direction cosines of the vector AB. Write them as (l, m, n); square roots may stay in the answer.`;
    },
    solve: (x) => {
      const d = x.slice(0, 3);
      const N = len2(d);
      const ans = tupS(d.map((c) => overRoot(c, N)));
      return { steps: [st("ratios", "subtract", "MATH.coordinate.space-coordinates", [], tupS(d)), st("length", "root", VA, [N], rootS(N)), st("divide", "divide", DC, [rootS(N)], ans)], answer: ans };
    },
    // independent: l² + m² + n² = 1, and (l, m, n) points the same way as B − A (zero cross product, positive dot)
    validate: (x, v) => {
      const t = tup(v);
      if (!t || t.length !== 3) return false;
      const d = x.slice(0, 3);
      return near(len2(t), 1, 1e-9) && cross(t, d).every((c) => Math.abs(c) < 1e-9) && dot(t, d) > 0;
    },
    bugs: (x) => {
      const d = x.slice(0, 3);
      const N = len2(d);
      const S = d[0] + d[1] + d[2];
      return [
        { id: "ratios-given", kind: "conceptual", competency: DC, says: "The direction ratios (the components of AB) were given; direction cosines are the components divided by the length |AB|.", predict: tupS(d) },
        { id: "reversed", kind: "procedural", competency: DC, says: "The vector BA was used; AB is (B − A), and reversing it changes every sign.", predict: tupS(d.map((c) => overRoot(-c, N))) },
        { id: "divided-by-sum", kind: "conceptual", competency: DC, says: "The components were divided by their sum; divide by the length √(a² + b² + c²), so that l² + m² + n² = 1.", predict: S === 0 ? null : tupS(d.map((c) => c / S)) },
      ];
    },
    distractors: (x) => [tupS(x.slice(0, 3).map((c) => c / len2(x.slice(0, 3))))],
    variants: () => [],
    explain: (s) => (s.id === "ratios" ? `Direction ratios: B − A = ${s.value}` : s.id === "length" ? `|AB| = √${s.inputs[0]} = ${s.value}` : `Divide each by ${s.inputs[0]}: ${s.value}`),
    domain: D_DC,
    keep: K_DC,
    cap: 300,
    difficulty: (x) => (sqf(len2(x.slice(0, 3)))[1] === 1 ? 1 : x.slice(0, 3).some((c) => c < 0) ? 3 : 2),
    teach: {
      idea: "The direction cosines (l, m, n) of a vector are the cosines of the angles it makes with the x-, y- and z-axes; they are the components of the unit vector, so l² + m² + n² = 1.",
      method: "Find the direction ratios B − A, find the length √(a² + b² + c²), divide each ratio by it and rationalise.",
      alternatives: [{ id: "angles", title: "Think of the angles", kind: "conceptual", text: ["The angle α with the x-axis has cos α = (x-component)/(length), as in a right triangle.", "Do the same for the y- and z-axes."] }],
    },
    limits: "Vectors with whole-number components; finding a third direction cosine from two angles is left out.",
  },
  // ======================================================== dot and cross products
  {
    id: "atang",
    arity: 6,
    title: "The angle between two vectors (cos θ)",
    competency: VP,
    type: "exact",
    mc: true,
    parse: none,
    reject: gate(D_VV, K_ANG, "Two non-parallel vectors with components from −4 to 4."),
    prompt: (x) => `Find cos θ, where θ is the angle between the vectors a = ${vt(x.slice(0, 3))} and b = ${vt(x.slice(3))}. Give the exact value.`,
    solve: (x) => {
      const a = x.slice(0, 3);
      const b = x.slice(3);
      const ans = overRoot(dot(a, b), len2(a) * len2(b));
      return { steps: [st("dot", "multiply", VP, [], dot(a, b)), st("lengths", "root", VA, [len2(a), len2(b)], `${rootS(len2(a))}, ${rootS(len2(b))}`), st("cos", "divide", VP, [dot(a, b)], ans)], answer: ans };
    },
    // independent: the cosine rule in the triangle with sides |a|, |b|, |a − b|
    validate: (x, v) => {
      const a = x.slice(0, 3);
      const b = x.slice(3);
      const A = Math.sqrt(len2(a));
      const B = Math.sqrt(len2(b));
      const C2 = len2(sub(a, b));
      const n = num(v);
      return n !== null && near(n, (A * A + B * B - C2) / (2 * A * B), 1e-9);
    },
    bugs: (x) => {
      const a = x.slice(0, 3);
      const b = x.slice(3);
      const d = dot(a, b);
      return [
        { id: "dot-only", kind: "conceptual", competency: VP, says: "Only a · b was found; cos θ = a · b / (|a| |b|), so divide by both lengths.", predict: d === 0 ? null : String(d) },
        { id: "one-length", kind: "procedural", competency: VP, says: "a · b was divided by |a| only; that is the projection of b on a. Divide by |a| |b|.", predict: d === 0 ? null : overRoot(d, len2(a)) },
      ];
    },
    distractors: (x) => {
      const a = x.slice(0, 3);
      const b = x.slice(3);
      const d = dot(a, b);
      // the last two always lie in [−1, 1] (a cosine's range): a · b over |a|²|b|² or over |a|² + |b|² (square roots forgotten)
      const e = d === 0 ? 1 : d;
      return [overRoot(-d === 0 ? 1 : -d, len2(a) * len2(b)), overRoot(e, len2(a) + len2(b)), overRoot(d, len2(b)), overRoot(e, (len2(a) * len2(b)) ** 2), overRoot(e, (len2(a) + len2(b)) ** 2)];
    },
    variants: () => [],
    explain: (s) => (s.id === "dot" ? `a · b = ${s.value}` : s.id === "lengths" ? `|a| = ${String(s.value).split(", ")[0]}, |b| = ${String(s.value).split(", ")[1]}` : `cos θ = ${s.inputs[0]}/(|a||b|) = ${s.value}`),
    domain: D_VV,
    keep: K_ANG,
    cap: 400,
    difficulty: (x) => (dot(x.slice(0, 3), x.slice(3)) === 0 ? 1 : sqf(len2(x.slice(0, 3)) * len2(x.slice(3)))[1] === 1 ? 2 : 3),
    word: (x) => `Two ropes pull a cart from the same hook, one along a = ${vt(x.slice(0, 3))} and the other along b = ${vt(x.slice(3))}. Find the cosine of the angle between the ropes, exactly.`,
    teach: {
      idea: "a · b = |a| |b| cos θ, and a · b = a₁b₁ + a₂b₂ + a₃b₃; together they give the angle. a · b = 0 means the vectors are perpendicular.",
      method: "Multiply matching components and add (a · b), find |a| and |b|, then cos θ = a · b/(|a| |b|); rationalise.",
      alternatives: [{ id: "cosine_rule", title: "Use the cosine rule", kind: "conceptual", text: ["a, b and a − b form a triangle with sides |a|, |b| and |a − b|.", "cos θ = (|a|² + |b|² − |a − b|²)/(2|a||b|), the same as the dot-product formula."] }],
    },
    limits: "Small whole-number components; the angle itself (from cos θ) needs tables unless it is standard.",
  },
  {
    id: "atproj",
    arity: 6,
    title: "Projection of one vector on another",
    competency: VP,
    type: "exact",
    mc: true,
    parse: none,
    reject: gate(D_VV, (x) => K_ANG(x) && dot(x.slice(0, 3), x.slice(3)) !== 0, "Two non-parallel, non-perpendicular vectors with components from −4 to 4."),
    prompt: (x) => `Find the projection of the vector a = ${vt(x.slice(0, 3))} on the vector b = ${vt(x.slice(3))}. Give the exact value.`,
    solve: (x) => {
      const a = x.slice(0, 3);
      const b = x.slice(3);
      const ans = overRoot(dot(a, b), len2(b));
      return { steps: [st("dot", "multiply", VP, [], dot(a, b)), st("length", "root", VA, [len2(b)], rootS(len2(b))), st("divide", "divide", VP, [dot(a, b), rootS(len2(b))], ans)], answer: ans };
    },
    // independent: |a| cos θ with cos θ from the cosine rule in the triangle a, b, a − b
    validate: (x, v) => {
      const a = x.slice(0, 3);
      const b = x.slice(3);
      const A = Math.sqrt(len2(a));
      const B = Math.sqrt(len2(b));
      const cos = (A * A + B * B - len2(sub(a, b))) / (2 * A * B);
      const n = num(v);
      return n !== null && near(n, A * cos, 1e-9);
    },
    bugs: (x) => {
      const a = x.slice(0, 3);
      const b = x.slice(3);
      const d = dot(a, b);
      return [
        { id: "wrong-length", kind: "procedural", competency: VP, says: "a · b was divided by |a|; that is the projection of b on a. The projection on b divides by |b|.", predict: overRoot(d, len2(a)) },
        { id: "dot-only", kind: "conceptual", competency: VP, says: "Only a · b was found; the projection is a · b/|b|.", predict: String(d) },
        { id: "length-squared", kind: "procedural", competency: VP, says: "a · b was divided by |b|²; that number scales b to give the projection VECTOR. The projection (a length) is a · b/|b|.", predict: F(d / len2(b)) },
      ];
    },
    distractors: (x) => [overRoot(-dot(x.slice(0, 3), x.slice(3)), len2(x.slice(3)))],
    variants: (x) => [[...x.slice(3), ...x.slice(0, 3)]],
    explain: (s) => (s.id === "dot" ? `a · b = ${s.value}` : s.id === "length" ? `|b| = ${s.value}` : `Projection = a · b/|b| = ${s.inputs[0]}/${s.inputs[1]} = ${s.value}`),
    domain: D_VV,
    keep: (x) => K_ANG(x) && dot(x.slice(0, 3), x.slice(3)) !== 0,
    cap: 400,
    difficulty: (x) => (sqf(len2(x.slice(3)))[1] === 1 ? 1 : dot(x.slice(0, 3), x.slice(3)) < 0 ? 3 : 2),
    word: (x) => `A force F = ${vt(x.slice(0, 3))} (in newtons) acts on a trolley that can only move along the direction b = ${vt(x.slice(3))}. Find the component of F along b (the projection of F on b), in newtons, exactly.`,
    teach: {
      idea: "The projection of a on b is the length of a's shadow on the line of b: |a| cos θ = a · b/|b|. It is negative when the angle is obtuse.",
      method: "Find a · b and |b|, divide, and rationalise.",
      alternatives: [{ id: "unit_vector", title: "Dot with the unit vector", kind: "procedural", text: ["Make b into a unit vector b̂ = b/|b|.", "The projection is a · b̂."] }],
    },
    limits: "Scalar projections with small whole-number components; the projection vector is left out.",
  },
  {
    id: "atcross",
    arity: 6,
    title: "The cross product in components",
    competency: VP,
    type: "tuple",
    mc: true,
    parse: none,
    reject: gate(D_VV, K_CROSS, "Two non-parallel vectors with components from −4 to 4 (at least two non-zero each)."),
    prompt: (x) => `Find a × b for a = ${vt(x.slice(0, 3))} and b = ${vt(x.slice(3))}. Write it as components (x, y, z).`,
    solve: (x) => {
      const c = cross(x.slice(0, 3), x.slice(3));
      return { steps: [st("i", "evaluate", VP, ["a₂b₃ − a₃b₂"], c[0]), st("j", "evaluate", VP, ["−(a₁b₃ − a₃b₁)"], c[1]), st("k", "evaluate", VP, ["a₁b₂ − a₂b₁"], c[2])], answer: tupS(c) };
    },
    // independent: c is perpendicular to a and b, |c|² = |a|²|b|² − (a · b)² (Lagrange), and [a b c] > 0 (right-handed)
    validate: (x, v) => {
      const c = tup(v);
      if (!c || c.length !== 3) return false;
      const a = x.slice(0, 3);
      const b = x.slice(3);
      return Math.abs(dot(c, a)) < 1e-9 && Math.abs(dot(c, b)) < 1e-9 && near(len2(c), len2(a) * len2(b) - dot(a, b) ** 2, 1e-9) && dot(cross(a, b), c) > 0;
    },
    bugs: (x) => {
      const c = cross(x.slice(0, 3), x.slice(3));
      const a = x.slice(0, 3);
      const b = x.slice(3);
      return [
        { id: "middle-sign", kind: "procedural", competency: DETM, says: "The ĵ component's minus sign was forgotten when expanding the determinant; the middle term is −(a₁b₃ − a₃b₁).", predict: c[1] === 0 ? null : tupS([c[0], -c[1], c[2]]) },
        { id: "order-reversed", kind: "conceptual", competency: VP, says: "b × a was found; the cross product changes sign when the order changes: a × b = −(b × a).", predict: tupS(c.map((t) => -t)) },
        { id: "componentwise", kind: "conceptual", competency: VP, says: "Matching components were multiplied; that is part of the dot product. The cross product uses the determinant.", predict: tupS(a.map((t, i) => t * b[i])) },
      ];
    },
    variants: (x) => [[...x.slice(3), ...x.slice(0, 3)]],
    explain: (s) => `${s.id === "i" ? "î" : s.id === "j" ? "ĵ" : "k̂"}: ${s.inputs[0]} = ${neg(Number(s.value))}`,
    domain: D_VV,
    keep: K_CROSS,
    cap: 400,
    difficulty: (x) => lv(x.filter((t) => t < 0).length, 1, 3),
    word: (x) => `A force F = ${vt(x.slice(3))} (in newtons) acts at a point with position vector r = ${vt(x.slice(0, 3))} (in metres) from a hinge. Find the torque r × F as components (x, y, z).`,
    teach: {
      idea: "a × b is a vector perpendicular to both a and b (right-hand rule), with length |a||b| sin θ, the area of the parallelogram on a and b.",
      method: "Expand the determinant with rows (î ĵ k̂), (a₁ a₂ a₃), (b₁ b₂ b₃): î(a₂b₃ − a₃b₂) − ĵ(a₁b₃ − a₃b₁) + k̂(a₁b₂ − a₂b₁).",
      alternatives: [{ id: "cycle", title: "The cyclic pattern", kind: "procedural", text: ["x: a₂b₃ − a₃b₂; y: a₃b₁ − a₁b₃; z: a₁b₂ − a₂b₁ (follow 1 → 2 → 3 → 1).", "Check: the answer dotted with a, and with b, must give 0."] }],
    },
    limits: "Small whole-number components; proofs using cross products are marked by an educator.",
  },
  {
    id: "atvarea",
    arity: 9,
    title: "Area of a triangle by the cross product",
    competency: VP,
    type: "exact",
    mc: true,
    parse: none,
    reject: gate(D_TRI, K_TRI, "Three non-collinear points with coordinates from −4 to 4."),
    prompt: (x) => {
      const { A, B, C } = triV(x);
      return `Find the area of the triangle with vertices A${pt(A)}, B${pt(B)} and C${pt(C)}. Give the exact value.`;
    },
    solve: (x) => {
      const { AB, AC } = triV(x);
      const c = cross(AB, AC);
      const N = len2(c);
      const [k, m] = sqf(N);
      const ans = surdQ(k, 2, m);
      return { steps: [st("sides", "subtract", VA, [tupS(AB)], tupS(AC)), st("cross", "evaluate", VP, [], tupS(c)), st("area", "root", VP, [N], ans)], answer: ans };
    },
    // independent: Heron's formula from the three side lengths
    validate: (x, v) => {
      const { A, B, C } = triV(x);
      const a = Math.sqrt(len2(sub(B, C)));
      const b = Math.sqrt(len2(sub(A, C)));
      const c = Math.sqrt(len2(sub(A, B)));
      const s = (a + b + c) / 2;
      const n = num(v);
      return n !== null && near(n, Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c))), 1e-7);
    },
    bugs: (x) => {
      const { AB, AC } = triV(x);
      const N = len2(cross(AB, AC));
      return [
        { id: "half-dropped", kind: "recall", competency: VP, says: "The ½ was left out; |AB × AC| is the area of the parallelogram, and the triangle is half of it.", predict: rootS(N) },
        { id: "root-missing", kind: "procedural", competency: VA, says: "The square root of |AB × AC|² was not taken.", predict: F(N / 2) },
      ];
    },
    distractors: (x) => {
      const { AB, AC } = triV(x);
      return [overRoot(Math.abs(dot(AB, AC)) || 1, 4), rootS(len2(cross(AB, AC)) * 4)];
    },
    variants: () => [],
    explain: (s) => (s.id === "sides" ? `AB = ${s.inputs[0]}, AC = ${s.value}` : s.id === "cross" ? `AB × AC = ${s.value}` : `Area = ½|AB × AC| = ½√${s.inputs[0]} = ${s.value}`),
    domain: D_TRI,
    keep: K_TRI,
    cap: 300,
    difficulty: (x) => (sqf(len2(cross(triV(x).AB, triV(x).AC)))[1] === 1 ? 1 : 2),
    word: (x) => {
      const { A, B, C } = triV(x);
      return `A triangular sail has its corners at A${pt(A)}, B${pt(B)} and C${pt(C)} (coordinates in metres). Find the area of the sail in m², exactly.`;
    },
    teach: {
      idea: "|AB × AC| = |AB||AC| sin A is the area of the parallelogram on AB and AC; the triangle is half of it.",
      method: "Find AB and AC, their cross product, its length, and halve it.",
      alternatives: [{ id: "heron_check", title: "Check with Heron's formula", kind: "procedural", text: ["Find the three side lengths with the distance formula.", "Area = √(s(s − a)(s − b)(s − c)), where s is half the perimeter."] }],
    },
    limits: "Whole-number coordinates up to 4; areas of quadrilaterals are left out.",
  },
  // ======================================================== triple products
  {
    id: "atstp",
    arity: 9,
    title: "The scalar triple product",
    competency: TP,
    type: "integer",
    mc: true,
    parse: none,
    reject: gate(D_V3, K_STP, "Three non-coplanar vectors with components from −3 to 3 (at least two non-zero each)."),
    prompt: (x) => {
      const [a, b, c] = abc(x);
      return `Find the scalar triple product [a b c] = a · (b × c) for a = ${vt(a)}, b = ${vt(b)} and c = ${vt(c)}.`;
    },
    solve: (x) => {
      const [a, b, c] = abc(x);
      const m = [b[1] * c[2] - b[2] * c[1], b[0] * c[2] - b[2] * c[0], b[0] * c[1] - b[1] * c[0]];
      const v = a[0] * m[0] - a[1] * m[1] + a[2] * m[2];
      return { steps: [st("minors", "evaluate", DETM, [], tupS(m)), st("expand", "evaluate", TP, [a[0], a[1], a[2]], v)], answer: v };
    },
    // independent: the rule of Sarrus (diagonal products) on the 3 × 3 array
    validate: (x, v) => {
      const [a, b, c] = abc(x);
      const s = a[0] * b[1] * c[2] + a[1] * b[2] * c[0] + a[2] * b[0] * c[1] - a[2] * b[1] * c[0] - a[0] * b[2] * c[1] - a[1] * b[0] * c[2];
      return v === s;
    },
    bugs: (x) => {
      const [a, b, c] = abc(x);
      const m = [b[1] * c[2] - b[2] * c[1], b[0] * c[2] - b[2] * c[0], b[0] * c[1] - b[1] * c[0]];
      return [
        { id: "middle-sign", kind: "procedural", competency: DETM, says: "The middle term of the expansion was added; the signs go +, −, + along the first row.", predict: a[0] * m[0] + a[1] * m[1] + a[2] * m[2] },
        { id: "order-swapped", kind: "conceptual", competency: TP, says: "Two of the vectors were swapped ([b a c]); swapping two rows changes the sign of the triple product.", predict: -det3(a, b, c) },
      ];
    },
    // further real slips: Sarrus' rule with only the three down-diagonals (the up-diagonals not taken away), and the
    // signs +, −, − along the first row
    distractors: (x) => {
      const [a, b, c] = abc(x);
      const m = [b[1] * c[2] - b[2] * c[1], b[0] * c[2] - b[2] * c[0], b[0] * c[1] - b[1] * c[0]];
      return [a[0] * b[1] * c[2] + a[1] * b[2] * c[0] + a[2] * b[0] * c[1], a[0] * m[0] - a[1] * m[1] - a[2] * m[2], -(a[2] * b[1] * c[0] + a[0] * b[2] * c[1] + a[1] * b[0] * c[2])];
    },
    variants: () => [],
    explain: (s) => (s.id === "minors" ? `The 2 × 2 minors of b and c: ${s.value}` : `Expand along a = (${s.inputs.join(", ")}) with signs +, −, +: ${s.value}`),
    domain: D_V3,
    keep: K_STP,
    cap: 400,
    difficulty: (x) => lv(x.filter((t) => t < 0).length, 2, 4),
    teach: {
      idea: "[a b c] = a · (b × c) is the determinant with rows a, b, c; its size is the volume of the parallelepiped on a, b, c, and it is 0 exactly when they are coplanar.",
      method: "Write the 3 × 3 determinant and expand along the first row with signs +, −, +.",
      alternatives: [{ id: "cross_then_dot", title: "Cross first, then dot", kind: "procedural", text: ["Work out b × c as a vector.", "Then dot it with a: multiply matching components and add."] }],
    },
    limits: "Small whole-number components; Lagrange's and Jacobi's identities (proofs) are marked by an educator.",
  },
  {
    id: "atcopl",
    arity: 8,
    title: "Coplanar vectors: find λ",
    competency: TP,
    type: "fraction",
    mc: true,
    // [a, b, c1, c2]: c = c1 î + c2 ĵ + λ k̂
    parse: none,
    reject: gate(D_COPL, K_COPL, "a, b with components from −3 to 3 and c = c₁î + c₂ĵ + λk̂ with one value of λ."),
    prompt: (x) => {
      const { a, b, c1, c2 } = coplAB(x);
      const cTxt = `${c1 ? vt([c1, 0, 0]) : ""}${c2 ? (c1 ? (c2 < 0 ? " − " : " + ") + (Math.abs(c2) === 1 ? "" : Math.abs(c2)) + "ĵ" : vt([0, c2, 0])) : ""} + λk̂`;
      return `Find the value of λ for which the vectors a = ${vt(a)}, b = ${vt(b)} and c = ${cTxt} are coplanar.`;
    },
    solve: (x) => {
      const { alpha, beta } = coplAB(x);
      return { steps: [st("det", "evaluate", DETM, [alpha, beta], `${alpha} ${beta < 0 ? "−" : "+"} ${Math.abs(beta)}λ`), st("solve", "solve", TP, [alpha, beta], -alpha / beta)], answer: -alpha / beta };
    },
    // independent: put λ into c and compute (a × b) · c numerically: it must be 0
    validate: (x, v) => {
      if (typeof v !== "number") return false;
      const { a, b, c1, c2 } = coplAB(x);
      return Math.abs(dot(cross(a, b), [c1, c2, v])) < 1e-9;
    },
    bugs: (x) => {
      const { a, c1, c2, alpha, beta } = coplAB(x);
      return [
        { id: "sign-slip", kind: "procedural", competency: TP, says: "A sign slipped when solving the linear equation for λ; check by putting λ back into the determinant.", predict: alpha / beta },
        { id: "perpendicular-for-coplanar", kind: "conceptual", competency: TP, says: "a · c = 0 was used (a perpendicular to c); coplanar means [a b c] = 0.", predict: a[2] === 0 ? null : -(a[0] * c1 + a[1] * c2) / a[2] },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "det" ? `[a b c] = ${s.value}` : `Set it to 0: λ = ${F(Number(s.value))}`),
    domain: D_COPL,
    keep: K_COPL,
    cap: 300,
    difficulty: (x) => (Number.isInteger(-coplAB(x).alpha / coplAB(x).beta) ? 2 : 3),
    teach: {
      idea: "Three vectors are coplanar exactly when the parallelepiped they make is flat: [a b c] = 0.",
      method: "Write the determinant with rows a, b, c (λ in it), expand to get an expression in λ, set it equal to 0 and solve.",
      alternatives: [{ id: "combination", title: "c as a combination of a and b", kind: "conceptual", text: ["Coplanar means c = xa + yb for some numbers x, y.", "Find x and y from the î and ĵ components; the k̂ component then gives λ."] }],
    },
    limits: "λ in the k̂ component only; coplanarity of four points is left out.",
  },
  {
    id: "atvtp",
    arity: 9,
    title: "The vector triple product a × (b × c)",
    competency: TP,
    type: "tuple",
    mc: true,
    parse: none,
    reject: gate(D_V3, K_VTP, "Three vectors with components from −3 to 3 (at least two non-zero each)."),
    prompt: (x) => {
      const [a, b, c] = abc(x);
      return `Find a × (b × c) for a = ${vt(a)}, b = ${vt(b)} and c = ${vt(c)}. Write it as components (x, y, z).`;
    },
    solve: (x) => {
      const [a, b, c] = abc(x);
      const ac = dot(a, c);
      const ab = dot(a, b);
      const r = b.map((t, i) => ac * t - ab * c[i]);
      return { steps: [st("dots", "multiply", VP, [ac], ab), st("combine", "combine", TP, [ac, ab], tupS(r))], answer: tupS(r) };
    },
    // independent: two cross products, b × c first, then a × (that)
    validate: (x, v) => {
      const t = tup(v);
      if (!t || t.length !== 3) return false;
      const [a, b, c] = abc(x);
      const r = cross(a, cross(b, c));
      return r.every((q, i) => near(q, t[i], 1e-12));
    },
    bugs: (x) => {
      const [a, b, c] = abc(x);
      const r = cross(a, cross(b, c));
      return [
        { id: "terms-swapped", kind: "recall", competency: TP, says: "The two terms were swapped: a × (b × c) = (a · c)b − (a · b)c.", predict: tupS(r.map((q) => -q)) },
        { id: "bracket-moved", kind: "conceptual", competency: TP, says: "(a × b) × c was found; the cross product is not associative, so the bracket matters.", predict: tupS(cross(cross(a, b), c)) },
      ];
    },
    distractors: (x) => {
      const [a, b, c] = abc(x);
      return [tupS(cross(b, c)), tupS(cross(a, b))];
    },
    variants: () => [],
    explain: (s) => (s.id === "dots" ? `a · c = ${s.inputs[0]}, a · b = ${s.value}` : `(a · c)b − (a · b)c = ${s.inputs[0]}b − (${s.inputs[1]})c = ${s.value}`),
    domain: D_V3,
    keep: K_VTP,
    cap: 300,
    difficulty: (x) => lv(x.filter((t) => t < 0).length, 2, 4),
    teach: {
      idea: "a × (b × c) is perpendicular to b × c, so it lies in the plane of b and c: a × (b × c) = (a · c)b − (a · b)c.",
      method: "Work out the two dot products a · c and a · b, then form (a · c)b − (a · b)c component by component.",
      alternatives: [{ id: "two_crosses", title: "Two cross products", kind: "procedural", text: ["Find b × c first.", "Then cross a with that result; the answers agree."] }],
    },
    limits: "Small whole-number components; Jacobi's identity and proofs are marked by an educator.",
  },
];
