/**
 * families@2, batch b18 (Grade 11–12 calculus and conics): implicit, parametric and logarithmic differentiation;
 * l'Hôpital limits; linear approximation and errors; linear first-order differential equations; the mean value
 * theorem; monotonicity; limits of two variables; growth, decay and cooling models; partial derivatives and Euler's
 * theorem; partial fractions; reduction formulae; Maclaurin coefficients; volumes of revolution; improper and gamma
 * integrals; circles, parabolas, ellipses and hyperbolas. Every validator is numerical or substitution-based (central
 * differences, Simpson's rule, Runge–Kutta, a Cauchy contour sum, the focus–directrix and focal-distance properties),
 * never the solver's formula. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { fmt, gcd, simpson, near, sup } from "../family-kit";
import { evaluate, parse, canonicalOf, type Node } from "../answer-types";

const IMP = "MATH.calculus.implicit-parametric-differentiation";
const IMPG = "MATH.calculus.improper-gamma-integrals";
const LH = "MATH.calculus.lhopital";
const LA = "MATH.calculus.linear-approximation";
const LDE = "MATH.calculus.linear-first-order-de";
const MVT = "MATH.calculus.mean-value-theorems";
const MON = "MATH.calculus.monotonicity";
const MVL = "MATH.calculus.multivariable-limits";
const ODE = "MATH.calculus.ode-modelling";
const PD = "MATH.calculus.partial-derivatives";
const PF = "MATH.calculus.partial-fractions-integration";
const RED = "MATH.calculus.reduction-formulae";
const TAY = "MATH.calculus.taylor-series";
const VOL = "MATH.calculus.volumes-of-revolution";
const CON = "MATH.coordinate.conics";
const DR = "MATH.calculus.derivative-rules";
const LIM = "MATH.calculus.limits";
const LOG = "MATH.algebra.logarithms";
const DEF = "MATH.calculus.definite-integrals";
const IM = "MATH.calculus.integration-methods";
const DE = "MATH.calculus.differential-equations";
const AREA = "MATH.calculus.area-integrals";
const POLY = "MATH.algebra.polynomials";
const IND = "MATH.calculus.indefinite-integrals";
const SER = "MATH.sequences.infinite-series-expansions";
const CONT = "MATH.calculus.continuity";
const INTV = "MATH.sets-relations.real-intervals";
const SL = "MATH.coordinate.straight-lines";
const QUAD = "MATH.algebra.quadratics";
const RAD = "MATH.number.radicals";
const MODEL = "MATH.reasoning.model-selection";
const SOLID = "MATH.measurement.cones-spheres";

// ---------------------------------------------------------------- helpers

const none = () => null;
const inDom = (p: number[], d: [number, number][]) => p.length === d.length && p.every((v, i) => Number.isInteger(v) && v >= d[i][0] && v <= d[i][1]);
const mn = (s: string) => s.replace(/-/g, "−");
/** A number as printed (fractions as a/b, − for minus). */
const nf = (x: number) => mn(fmt(x));
/** v to a whole power, as printed: "", v, v², v⁻² … */
const pw = (v: string, e: number) => (e === 0 ? "" : e === 1 ? v : `${v}${sup(e)}`);
/** A coefficient before a letter: "", "−", "3", "−2". */
const coef = (k: number) => (k === 1 ? "" : k === -1 ? "−" : nf(k));
/** A sum of terms c·m, with − signs; a fraction coefficient before a monomial goes in brackets. */
function sum(terms: [number, string][]): string {
  const out: string[] = [];
  for (const [c, m] of terms) {
    if (Math.abs(c) < 1e-12) continue;
    const a = Math.abs(c);
    const body = m === "" ? fmt(a) : near(a, 1, 1e-12) ? m : Number.isInteger(a) ? `${a}${m}` : `(${fmt(a)})${m}`;
    out.push(out.length === 0 ? (c < 0 ? `−${body}` : body) : `${c < 0 ? "−" : "+"} ${body}`);
  }
  return out.length ? out.join(" ") : "0";
}
/** n/d reduced, as printed (whole numbers of any size). */
function rat(n: number, d: number): string {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  const [a, b] = [n / g, d / g];
  return mn(b === 1 ? `${a}` : `${a}/${b}`);
}
/** [numerator, denominator] of a rational number (denominators up to 100 000). */
function ratio(x: number): [number, number] {
  for (let d = 1; d <= 100000; d++) {
    const n = Math.round(x * d);
    if (Math.abs(n / d - x) < 1e-13 * Math.max(1, Math.abs(x))) {
      const g = gcd(n, d) || 1;
      return [n / g, d / g];
    }
  }
  throw new Error(`not a simple rational: ${x}`);
}
/** (N/D)·π as printed. */
function piStr(x: number): string {
  const [n, d] = ratio(x);
  return `${n === 1 ? "" : n === -1 ? "−" : mn(String(n))}π${d === 1 ? "" : `/${d}`}`;
}
/** n = k² m with m square-free. */
function sqf(n: number): [number, number] {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++) while (m % (p * p) === 0) {
    m /= p * p;
    k *= p;
  }
  return [k, m];
}
/** (N/D)·√m in simplest form (m square-free), with an optional factor written after the number (e.g. π). */
function surdC(N: number, D: number, m: number, mid = ""): string {
  if (m === 1) return mid ? piStr(N / D) : rat(N, D);
  if (D < 0) [N, D] = [-N, -D];
  const g = gcd(N, D) || 1;
  const [a, b] = [N / g, D / g];
  return `${a < 0 ? "−" : ""}${Math.abs(a) === 1 ? "" : Math.abs(a)}${mid}√${m}${b === 1 ? "" : `/${b}`}`;
}
/** √n / d in simplest form. */
const rootOver = (n: number, d: number) => {
  const [k, m] = sqf(n);
  return surdC(k, d, m);
};
/** (p0 + k√m)/d in simplest form (m square-free). */
function quadRoot(p0: number, k: number, m: number, d: number): string {
  if (m === 1) return rat(p0 + k, d);
  const g = gcd(gcd(Math.abs(p0), Math.abs(k)), d) || 1;
  const [P, K, D] = [p0 / g, k / g, d / g];
  const s = `${Math.abs(K) === 1 ? "" : Math.abs(K)}√${m}`;
  if (P === 0) return `${K < 0 ? "−" : ""}${s}${D === 1 ? "" : `/${D}`}`;
  const body = `${nf(P)} ${K < 0 ? "−" : "+"} ${s}`;
  return D === 1 ? body : `(${body})/${D}`;
}
const fact = (n: number) => (n <= 1 ? 1 : n * fact(n - 1));
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
const bug = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Value | null): Bug => ({ id, kind, competency, says, predict });
const node = (v: Value): Node | null => {
  if (typeof v !== "string") return null;
  try {
    return parse(v);
  } catch {
    return null;
  }
};
const ev = (n: Node | null, env: Record<string, number>) => {
  if (!n) return NaN;
  try {
    return evaluate(n, env);
  } catch {
    return NaN;
  }
};
/** The value of a constant answer (a number, or an exact expression such as 3π/16, ln(3/2), e⁶, 2√3). */
const constOf = (v: Value): number => (typeof v === "number" ? v : ev(node(v), {}));
/** A written expression agrees with `want` at the given points (points where `want` is undefined are skipped). */
function matches(v: Value, want: (env: Record<string, number>) => number, envs: Record<string, number>[], rel = 1e-6): boolean {
  const n = node(v);
  if (!n) return false;
  let ok = 0;
  for (const env of envs) {
    const w = want(env);
    if (!Number.isFinite(w)) continue;
    const g = ev(n, env);
    if (!Number.isFinite(g) || Math.abs(g - w) > rel * Math.max(1, Math.abs(w))) return false;
    ok++;
  }
  return ok >= 3;
}
/** Central difference. */
const d1 = (g: (x: number) => number, x: number, h = 1e-5) => (g(x + h) - g(x - h)) / (2 * h);
/** The numbers of a written tuple "(a, b, c)". */
function tupleNums(v: Value, n: number): number[] | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t.startsWith("(") || !t.endsWith(")")) return null;
  const parts = t.slice(1, -1).split(",");
  if (parts.length !== n) return null;
  const out = parts.map((x) => constOf(x.trim()));
  return out.every(Number.isFinite) ? out : null;
}
const ax = (a: number, v = "x") => `${coef(a)}${v}`;

// ---------------------------------------------------------------- implicit differentiation

const IMPL_D: [number, number][] = [[1, 5], [-4, 4], [1, 5], [-3, 3]];
const implKeep = (p: number[]) => inDom(p, IMPL_D) && p[1] !== 0;
const implParts = ([a, b, c, d]: number[]) => {
  const num = sum([[2 * a, "x"], [b, "y"]]);
  const den = sum([[b, "x"], [2 * c, "y"], [d, ""]]);
  return { num, den, ans: `−(${num})/(${den})`, curve: `${sum([[a, "x²"], [b, "xy"], [c, "y²"], [d, "y"]])} = ${a + c + 10}` };
};
const XY = [[0.7, 1.3], [1.1, 0.4], [1.6, 1.9], [0.5, 0.8], [1.9, 1.2], [0.35, 1.55]].map(([x, y]) => ({ x, y }));

// ---------------------------------------------------------------- parametric differentiation

const PAR_D: [number, number][] = [[1, 4], [1, 4], [-4, 4], [1, 4]];
const parKeep = (p: number[]) => inDom(p, PAR_D) && p[2] !== 0 && p[1] !== p[3];
/** C·tᵉ, with a negative power written as a quotient. */
function tpow(C: number, e: number, v = "t"): string {
  if (e >= 0) return sum([[C, pw(v, e)]]);
  const [N, D] = ratio(Math.abs(C));
  const s = C < 0 ? "−" : "";
  return D === 1 ? `${s}${N}/${pw(v, -e)}` : `${s}${N}/(${D}${pw(v, -e)})`;
}

// ---------------------------------------------------------------- logarithmic differentiation

const LOGD_D: [number, number][] = [[1, 4], [0, 5], [1, 4]];
const logdParts = ([a, b, k]: number[]) => {
  const I = b === 0 ? ax(a) : sum([[a, "x"], [b, ""]]);
  const B = a === 1 && b === 0 ? "x" : `(${I})`;
  const E = ax(k);
  const y = `${B}^(${E})`;
  const ans = b === 0 ? `${coef(k)}${y}(ln(${I}) + 1)` : `${y}(${coef(k)}ln(${I}) + ${k * a}x/(${I}))`;
  const bracket = b === 0 ? (k === 1 ? `ln(${I}) + 1` : `${k}(ln(${I}) + 1)`) : `${coef(k)}ln(${I}) + ${k * a}x/(${I})`;
  return { I, B, E, y, ans, bracket };
};

// ---------------------------------------------------------------- l'Hôpital

const LH_D: [number, number][] = [[0, 4], [1, 6], [1, 6]];
const lhKeep = (p: number[]) => inDom(p, LH_D) && (p[0] !== 2 || (p[1] >= 2 && p[2] >= 2 && p[1] !== p[2])) && (p[0] !== 3 || p[1] * p[2] <= 12);
/** log(a/b) (natural logarithm, written "log" as in the Grade 11–12 books), simplest form: log 3, −log 2, log(3/2). */
const lnFrac = (a: number, b: number) => {
  const g = gcd(a, b);
  const [n, d] = [a / g, b / g];
  return d === 1 ? `log ${n}` : n === 1 ? `−log ${d}` : `log(${n}/${d})`;
};
const ePow = (n: number) => (n === 1 ? "e" : `e${sup(n)}`);
const lhExpr = ([f, a, b]: number[]) =>
  [
    `(e^(${ax(a)}) − 1)/(${ax(b)})`,
    `(1 − cos ${ax(a)})/(${coef(b)}x²)`,
    `(${a}^x − ${b}^x)/x`,
    `(1 + ${ax(a)})^(${b}/x)`,
    `(tan ${ax(a)} − ${ax(a)})/(${coef(b)}x³)`,
  ][f];
const lhG = ([f, a, b]: number[]) =>
  [
    (x: number) => (Math.exp(a * x) - 1) / (b * x),
    (x: number) => (1 - Math.cos(a * x)) / (b * x * x),
    (x: number) => (a ** x - b ** x) / x,
    (x: number) => (1 + a * x) ** (b / x),
    (x: number) => (Math.tan(a * x) - a * x) / (b * x ** 3),
  ][f];
const lhAnswer = ([f, a, b]: number[]): string => [nf(a / b), nf((a * a) / (2 * b)), lnFrac(a, b), ePow(a * b), nf(a ** 3 / (3 * b))][f];

// ---------------------------------------------------------------- linear approximation

const LIN_D: [number, number][] = [[0, 1], [2, 10], [-9, 9]];
/** The change is small next to the known value (|d| at most a quarter of a² or a³), so the tangent line is a fair estimate. */
const linKeep = (p: number[]) => inDom(p, LIN_D) && p[2] !== 0 && (p[0] === 0 ? Math.abs(p[2]) <= 5 && 4 * Math.abs(p[2]) <= p[1] ** 2 : p[1] <= 6 && 4 * Math.abs(p[2]) <= p[1] ** 3);
const linAns = ([f, a, d]: number[]) => (f === 0 ? a + d / (2 * a) : a + d / (3 * a * a));
const ERR_D: [number, number][] = [[0, 2], [2, 20], [1, 5], [0, 1]];
const errN = (s: number) => (s === 1 ? 3 : 2);
const errC = (s: number) => (s === 2 ? 6 : 1);
const errKeep = (p: number[]) => inDom(p, ERR_D) && (p[3] === 0 || (100 * errN(p[0]) * p[2]) % p[1] === 0);
const errAns = ([s, x, k, q]: number[]) => {
  const n = errN(s);
  const c = errC(s);
  return q === 0 ? (n * c * x ** (n - 1) * k) / 100 : (n * k) / x;
};
const ERR_WHAT = ["area of the square", "volume of the cube", "total surface area of the cube"];
const ERR_UNIT = ["cm²", "cm³", "cm²"];

// ---------------------------------------------------------------- linear first-order differential equations

const LDE_D: [number, number][] = [[0, 1], [1, 4], [-5, 5], [-2, 3]];
const ldeKeep = ([f, a, b, c]: number[]) => inDom([f, a, b, c], LDE_D) && (f === 0 ? b !== 0 && c * a !== b : a <= 3 && b >= 0 && b <= 3);
const ldeAns = ([f, a, b, c]: number[]) => {
  if (f === 0) return sum([[b / a, ""], [c - b / a, `e^(−${ax(a)})`]]);
  const E = 1 / (a + b + 1);
  return sum([[E, pw("x", b + 1)], [c - E, pw("x", -a)]]);
};

// ---------------------------------------------------------------- mean value theorem

const MVT_D: [number, number][] = [[-3, 3], [-4, 3], [-3, 5]];
const mvtKeep = (p: number[]) => inDom(p, MVT_D) && p[2] > p[1] && p[2] - p[1] <= 6;
const mvtQ = ([p, a, b]: number[]) => (((a + b + p) % 5) + 5) % 5 - 2;
/** The roots of 3c² + 2pc + (q − s) = 0 written exactly, with the discriminant/4 = D, those strictly inside (a, b). */
function mvtRoots(p: number, D: number, a: number, b: number, all = false): string[] {
  if (D < 0) return [];
  const [k, m] = sqf(D);
  const out: [number, string][] = [];
  for (const s of D === 0 ? [1] : [-1, 1]) {
    const c = (-p + s * Math.sqrt(D)) / 3;
    if (all || (c > a + 1e-12 && c < b - 1e-12)) out.push([c, quadRoot(-p, s * k, m, 3)]);
  }
  return out.sort((x, y) => x[0] - y[0]).map((x) => x[1]);
}
const mvtF = (p: number, q: number) => (x: number) => x ** 3 + p * x * x + q * x;

// ---------------------------------------------------------------- monotonicity

const MON_D: [number, number][] = [[-5, 4], [-4, 5], [0, 1], [0, 1]];
const monKeep = (p: number[]) => inDom(p, MON_D) && p[1] > p[0] && p[1] - p[0] <= 6;
const monF = ([al, be, , k]: number[]) => {
  const s = k ? -1 : 1;
  const r = (((al - be) % 5) + 5) % 5 - 2;
  return { s, r, c3: 2 * s, c2: -3 * s * (al + be), c1: 6 * s * al * be };
};
const inside = (lo: number, hi: number) => `${nf(lo)} < x < ${nf(hi)}`;
const outside = (lo: number, hi: number) => `x < ${nf(lo)} or x > ${nf(hi)}`;
const monAns = ([al, be, s, k]: number[]) => {
  const up = k === 0; // f′ > 0 outside the stationary points
  return (s === 1) === up ? outside(al, be) : inside(al, be);
};
/** Membership in an interval answer, read through the app's own canonical form. */
function intervalTest(v: Value): ((x: number) => boolean) | null {
  if (typeof v !== "string") return null;
  const c = canonicalOf("interval", v);
  if (c === null) return null;
  if (c === "empty") return () => false;
  const num = (t: string) => (t === "-inf" ? -Infinity : t === "inf" ? Infinity : t.includes("/") ? Number(t.split("/")[0]) / Number(t.split("/")[1]) : Number(t));
  const pieces = c.split("U").map((s) => s.match(/^([[(])(.+?),(.+?)([\])])$/));
  if (pieces.some((m) => !m)) return null;
  return (x) => pieces.some((m) => {
    const lo = num(m![2]);
    const hi = num(m![3]);
    return (m![1] === "[" ? x >= lo : x > lo) && (m![4] === "]" ? x <= hi : x < hi);
  });
}

// ---------------------------------------------------------------- limits of two variables

const MVL_D: [number, number][] = [[0, 3], [1, 4], [-5, 5]];
const mvlKeep = (p: number[]) => inDom(p, MVL_D) && p[2] !== 0;
const mvlParts = ([t, k, b]: number[]) => {
  const K2 = k * k === 1 ? "" : String(k * k);
  const K3 = k ** 3 === 1 ? "" : String(k ** 3);
  return [
    { expr: `(x² − ${K2}y²)/(x − ${coef(k)}y)`, at: [k * b, b], ans: 2 * k * b, g: (x: number, y: number) => (x * x - k * k * y * y) / (x - k * y) },
    { expr: `sin(${coef(k)}xy)/x`, at: [0, b], ans: k * b, g: (x: number, y: number) => Math.sin(k * x * y) / x },
    { expr: `(e^(${coef(k)}xy) − 1)/y`, at: [b, 0], ans: k * b, g: (x: number, y: number) => (Math.exp(k * x * y) - 1) / y },
    { expr: `(x³ + ${K3}y³)/(x + ${coef(k)}y)`, at: [-k * b, b], ans: 3 * k * k * b * b, g: (x: number, y: number) => (x ** 3 + k ** 3 * y ** 3) / (x + k * y) },
  ][t];
};
const MVLX_D: [number, number][] = [[0, 3], [0, 3], [1, 4], [1, 4], [0, 1]];
/** The function: k xᵖ yᵠ/(x² + c y²) (s = 0), or (x² + c y² + k xᵖ yᵠ)/(x² + c y²) = 1 + k xᵖ yᵠ/(x² + c y²) (s = 1). */
const mvlxText = ([p, q, k, c, s]: number[]) => {
  const mono = `${pw("x", p)}${pw("y", q)}`;
  if (!s) return `${coef(k)}${mono}/(x² + ${coef(c)}y²)`;
  const terms = new Map<string, number>([["x²", 1], ["y²", c]]);
  terms.set(mono, (terms.get(mono) ?? 0) + k);
  return `(${sum([...terms].map(([m, v]) => [v, m] as [number, string]))})/(x² + ${coef(c)}y²)`;
};
const mvlxG = ([p, q, k, c, s]: number[]) => (x: number, y: number) => (s ? x * x + c * y * y + k * x ** p * y ** q : k * x ** p * y ** q) / (x * x + c * y * y);
const mvlxKeep = (p: number[]) => inDom(p, MVLX_D) && p[0] + p[1] >= 1;
const MVLX_CHOICES = ["The limit exists and equals 0", "The limit exists and is not 0", "The limit does not exist"];

// ---------------------------------------------------------------- growth, decay and cooling models

const ODE_D: [number, number][] = [[0, 2], [1, 9], [1, 6], [0, 4]];
const odeKeep = ([t, a, b, c]: number[]) =>
  inDom([t, a, b, c], ODE_D) && (t === 0 ? b >= 2 && c >= 2 && c <= 4 : t === 1 ? a <= 5 && c >= 1 && c <= 4 : a >= 2 && a <= 6 && b <= 3 && c <= 3);
const odeAns = ([t, a, b, c]: number[]) => (t === 0 ? 500 * a * 2 ** c : t === 1 ? (16 * a) / 2 ** c : 20 + 5 * c + a * b * b);
/** Classical Runge–Kutta for y′ = g(y) from 0 to T. */
function rk4(g: (y: number) => number, y0: number, T: number, n = 2000): number {
  const h = T / n;
  let y = y0;
  for (let i = 0; i < n; i++) {
    const k1 = g(y);
    const k2 = g(y + (h * k1) / 2);
    const k3 = g(y + (h * k2) / 2);
    const k4 = g(y + h * k3);
    y += (h * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
  }
  return y;
}

// ---------------------------------------------------------------- partial derivatives, Euler's theorem

const PD_D: [number, number][] = [[1, 4], [1, 3], [1, 3], [-3, 3], [-3, 3], [2, 4], [0, 1]];
const pdKeep = (p: number[]) => inDom(p, PD_D) && p[3] !== 0 && p[4] !== 0;
const pdF = ([a, m, n, b, c, p]: number[]) => (x: number, y: number) => a * x ** m * y ** n + b * x ** p + c * y ** p;
const EUL_D: [number, number][] = [[2, 4], [1, 3], [-3, 3], [-3, 3], [1, 3], [-2, 2]];
const eulF = ([d, A, B, C]: number[]) => (x: number, y: number) => A * x ** d + B * x ** (d - 1) * y + C * y ** d;
const eulKeep = (p: number[]) => inDom(p, EUL_D) && p[3] !== 0 && p[5] !== 0 && eulF(p)(p[4], p[5]) !== 0;

// ---------------------------------------------------------------- partial fractions

const PF_D: [number, number][] = [[-4, 3], [-3, 4], [-3, 3], [-3, 3]];
const pfKeep = (p: number[]) => inDom(p, PF_D) && p[1] > p[0] && p[2] !== 0 && p[3] !== 0;
const lin1 = (a: number) => sum([[1, "x"], [-a, ""]]);
const lnT = (c: number, s: string) => `${coef(c)}ln|${s}|`;
const pfTwo = (A: number, a: number, B: number, b: number) => `${lnT(A, lin1(a))} ${B < 0 ? "−" : "+"} ${lnT(Math.abs(B), lin1(b))} + C`;
const pfParts = ([a, b, A, B]: number[]) => ({
  num: sum([[A + B, "x"], [-(A * b + B * a), ""]]),
  den: sum([[1, "x²"], [-(a + b), "x"], [a * b, ""]]),
  ans: pfTwo(A, a, B, b),
});
const stripC = (v: string) => v.replace(/\s*\+\s*[cCkK]\s*$/, "");

// ---------------------------------------------------------------- reduction formulae

const RED_D: [number, number][] = [[0, 8], [0, 8], [0, 1]];
const redKeep = (p: number[]) => inDom(p, RED_D) && p[0] + p[1] >= 2 && (p[2] === 0 || p[1] % 2 === 0);
/** ∫₀^{π/2} sinᵐx cosⁿx dx = R or R·π (returned as [R, hasPi]), by the reduction formula. */
type W = [number, number, boolean];
function wallis(m: number, n: number): W {
  let [N, D] = [1, 1];
  while (m >= 2) {
    [N, D] = [N * (m - 1), D * (m + n)];
    m -= 2;
  }
  while (n >= 2) {
    [N, D] = [N * (n - 1), D * (m + n)];
    n -= 2;
  }
  const g = gcd(N, D);
  [N, D] = [N / g, D / g];
  if (m === 0 && n === 0) return [N, 2 * D, true];
  if (m === 1 && n === 1) return [N, 2 * D, false];
  return [N, D, false];
}
const scaleW = ([N, D, pi]: W, a: number, b: number): W => {
  const [n, d] = [N * a, D * b];
  const g = gcd(n, d);
  return [n / g, d / g, pi];
};
const piQ = (N: number, D: number) => {
  const g = gcd(N, D);
  const [n, d] = [N / g, D / g];
  return `${n === 1 ? "" : n}π${d === 1 ? "" : `/${d}`}`;
};
const redStr = ([N, D, pi]: W) => (pi ? piQ(N, D) : rat(N, D));
const redVal = ([m, n, r]: number[]): W => scaleW(wallis(m, n), r ? 2 : 1, 1);
const redIntegrand = ([m, n]: number[]) => {
  const s = m === 0 ? "" : m === 1 ? "sin x" : `sin${sup(m)}x`;
  const c = n === 0 ? "" : n === 1 ? "cos x" : `cos${sup(n)}x`;
  return [s, c].filter(Boolean).join(" ");
};

// ---------------------------------------------------------------- Maclaurin coefficients

const TAY_D: [number, number][] = [[0, 4], [-3, 3], [2, 6]];
const tayKeep = ([f, a, k]: number[]) => inDom([f, a, k], TAY_D) && a !== 0 && (f === 1 ? a > 0 && k % 2 === 1 : f === 2 ? a > 0 && k % 2 === 0 : true);
const tayCoef = ([f, a, k]: number[]) =>
  f === 0 ? a ** k / fact(k) : f === 1 ? ((-1) ** ((k - 1) / 2) * a ** k) / fact(k) : f === 2 ? ((-1) ** (k / 2) * a ** k) / fact(k) : f === 3 ? ((-1) ** (k + 1) * a ** k) / k : a ** k;
const tayName = ([f, a]: number[]) => {
  const one = (sgn: number) => `1 ${sgn < 0 ? "−" : "+"} ${ax(Math.abs(a))}`;
  return [`e^(${ax(a)})`, `sin(${ax(a)})`, `cos(${ax(a)})`, `ln(${one(a)})`, `1/(${one(-a)})`][f];
};
type C = [number, number];
const cmul = (p: C, q: C): C => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
const cdiv = (p: C, q: C): C => {
  const d = q[0] * q[0] + q[1] * q[1];
  return [(p[0] * q[0] + p[1] * q[1]) / d, (p[1] * q[0] - p[0] * q[1]) / d];
};
const cexp = ([x, y]: C): C => [Math.exp(x) * Math.cos(y), Math.exp(x) * Math.sin(y)];
const csin = ([x, y]: C): C => [Math.sin(x) * Math.cosh(y), Math.cos(x) * Math.sinh(y)];
const ccos = ([x, y]: C): C => [Math.cos(x) * Math.cosh(y), -Math.sin(x) * Math.sinh(y)];
const clog = ([x, y]: C): C => [Math.log(Math.hypot(x, y)), Math.atan2(y, x)];
/** The k-th Taylor coefficient at 0 by the Cauchy integral (a trapezoidal sum on a circle inside the disc of convergence). */
function cauchyCoef(F: (z: C) => C, k: number, r: number, N = 64): number {
  let s = 0;
  for (let j = 0; j < N; j++) {
    const t = (2 * Math.PI * j) / N;
    const w = F([r * Math.cos(t), r * Math.sin(t)]);
    s += cmul(w, [Math.cos(-k * t), Math.sin(-k * t)])[0];
  }
  return s / N / r ** k;
}

// ---------------------------------------------------------------- volumes of revolution

const VOL_D: [number, number][] = [[0, 3], [1, 8], [1, 8]];
const volKeep = ([f, a, b]: number[]) => inDom([f, a, b], VOL_D) && (f === 0 ? b <= 6 : f === 1 ? a <= 4 && b <= 5 : f === 2 ? a <= 3 && b <= 3 : a <= 4);
const volR = ([f, a, b]: number[]) => (f === 0 ? (a * b * b) / 2 : f === 1 ? (a * a * b ** 3) / 3 : f === 2 ? (a * a * b ** 5) / 5 : (b * b) / (2 * a));

// ---------------------------------------------------------------- improper and gamma integrals

const GAM_D: [number, number][] = [[0, 4], [0, 6], [1, 8]];
const gamKeep = ([t, u, v]: number[]) =>
  inDom([t, u, v], GAM_D) && (t === 0 ? v <= 4 && (u <= 5 || v <= 2) : t === 1 ? u >= 2 && u <= 5 && v <= 4 : t === 2 ? u === 0 : u >= 1 && u <= 5 && v <= 5);
const gamAns = ([t, u, v]: number[]): string =>
  t === 0 ? rat(fact(u), v ** (u + 1)) : t === 1 ? rat(1, (u - 1) * v ** (u - 1)) : t === 2 ? piStr(1 / (2 * v)) : t === 3 ? rat(v, u * u + v * v) : rat(u, u * u + v * v);
const gamH = ([t, u, v]: number[]) =>
  [(x: number) => x ** u * Math.exp(-v * x), (x: number) => x ** -u, (x: number) => 1 / (x * x + v * v), (x: number) => Math.exp(-u * x) * Math.sin(v * x), (x: number) => Math.exp(-u * x) * Math.cos(v * x)][t];

// ---------------------------------------------------------------- conics

const CIRC_D: [number, number][] = [[1, 3], [-5, 5], [-5, 5], [1, 30]];
const circEq = ([s, h, k, R]: number[]) => `${sum([[s, "x²"], [s, "y²"], [-2 * h * s, "x"], [-2 * k * s, "y"], [s * (h * h + k * k - R), ""]])} = 0`;
const tup = (...xs: (number | string)[]) => `(${xs.map((x) => (typeof x === "number" ? nf(x) : x)).join(", ")})`;
const PARA_D: [number, number][] = [[0, 1], [0, 1], [1, 16], [-3, 3], [-3, 3]];
const shifted = (v: string, c: number) => (c === 0 ? v : `(${sum([[1, v], [-c, ""]])})`);
const paraEq = ([o, sg, N, h, k]: number[]) => {
  const s = sg ? -N : N;
  const [sqV, sqC, lV, lC] = o === 0 ? ["y", k, "x", h] : ["x", h, "y", k];
  const lin = s === 1 && lC !== 0 ? sum([[1, lV], [-lC, ""]]) : `${coef(s)}${shifted(lV, lC)}`;
  return `${sqC === 0 ? `${sqV}²` : `${shifted(sqV, sqC)}²`} = ${lin}`;
};
const paraFocus = ([o, sg, N, h, k]: number[]): [number, number] => {
  const s = sg ? -N : N;
  return o === 0 ? [h + s / 4, k] : [h, k + s / 4];
};
const ECC_D: [number, number][] = [[0, 1], [1, 6], [1, 6], [0, 1]];
const eccKeep = (p: number[]) => inDom(p, ECC_D) && (p[0] === 1 || p[1] !== p[2]) && !(p[3] === 1 && p[1] === 1 && p[2] === 1);
const eccEq = ([kind, a, b, s]: number[]) => {
  const op = kind ? "−" : "+";
  if (s === 0) return `${a === 1 ? "x²" : `x²/${a * a}`} ${op} ${b === 1 ? "y²" : `y²/${b * b}`} = 1`;
  return `${b * b === 1 ? "" : b * b}x² ${op} ${a * a === 1 ? "" : a * a}y² = ${a * a * b * b}`;
};
const eccAns = ([kind, a, b]: number[]) => (kind ? rootOver(a * a + b * b, a) : a > b ? rootOver(a * a - b * b, a) : rootOver(b * b - a * a, b));
const CAR_D: [number, number][] = [[0, 2], [1, 8], [1, 6], [0, 1]];
const carKeep = ([t, u, v, w]: number[]) => inDom([t, u, v, w], CAR_D) && (t === 0 ? w === 0 : t === 1 ? u <= 3 && w === 0 : u <= 6 && u !== v);
const carAns = ([t, u, v, w]: number[]): string => {
  if (t === 0) {
    const [k, m] = sqf(u * v);
    return surdC(4 * v * k, 3, m);
  }
  if (t === 1) return rat(v ** 3, 6 * u * u);
  return piStr(w ? (u * v) / 4 : u * v);
};
const CID_D: [number, number][] = [[0, 3], [-3, 3], [-3, 3], [1, 3]];
const CID_CHOICES = ["a circle", "a parabola", "an ellipse", "a hyperbola"];
/** [A, C, D, E, F] of A x² + C y² + D x + E y + F = 0 for each kind of conic. */
const cidCoefs = ([t, h, k, q]: number[]): number[] => {
  if (t === 0) return [1, 1, -2 * h, -2 * k, h * h + k * k - (q + 1) ** 2];
  if (t === 1) {
    const s = (h + k + 6) % 2 ? -1 : 1;
    return [0, 1, -4 * s * q, -2 * k, k * k + 4 * s * q * h];
  }
  if (t === 2) {
    const [al, be] = [q, q + 2];
    return [al, be, -2 * al * h, -2 * be * k, al * h * h + be * k * k - al * be];
  }
  const [al, be] = [q, q + 1];
  return [al, -be, -2 * al * h, 2 * be * k, al * h * h - be * k * k - al * be];
};
const cidEq = (p: number[]) => {
  const [A, Cc, D, E, F] = cidCoefs(p);
  return `${sum([[A, "x²"], [Cc, "y²"], [D, "x"], [E, "y"], [F, ""]])} = 0`;
};

// ================================================================ the families

export const B18: Def[] = [
  // ------------------------------------------------------------ implicit / parametric / logarithmic
  {
    id: "arimpl",
    arity: 4,
    title: "Implicit differentiation of a second-degree curve",
    competency: IMP,
    type: "expression",
    mc: true,
    // [a, b, c, d]: a x² + b xy + c y² + d y = a + c + 10
    parse: none,
    reject: (p) => (implKeep(p) ? null : "a x² + b xy + c y² + d y = k with small whole coefficients (b ≠ 0)."),
    prompt: (p) => `The equation ${implParts(p).curve} defines y implicitly as a function of x. Find dy/dx in terms of x and y.`,
    solve: (p) => {
      const { num, den, ans, curve } = implParts(p);
      return {
        steps: [
          st("diff", "differentiate", DR, [curve], `${num} + (${den}) dy/dx = 0`),
          st("solve", "rearrange", IMP, [num, den], ans),
        ],
        answer: ans,
      };
    },
    // independent: −F_x / F_y with both partial derivatives found by central differences at points off the curve
    validate: ([a, b, c, d], v) => {
      const F = (x: number, y: number) => a * x * x + b * x * y + c * y * y + d * y;
      return matches(v, ({ x, y }) => {
        const Fy = d1((t) => F(x, t), y);
        return Math.abs(Fy) < 0.1 ? NaN : -d1((t) => F(t, y), x) / Fy;
      }, XY);
    },
    bugs: ([a, b, c, d]) => {
      const { num, den } = implParts([a, b, c, d]);
      return [
        bug("xy-product-rule", "procedural", DR, `The term ${coef(b)}xy was differentiated as ${coef(b)}y only; it is a product, so its derivative is ${coef(b)}(y + x dy/dx).`, `−(${num})/(${sum([[2 * c, "y"], [d, ""]])})`),
        bug("y-terms-no-dydx", "conceptual", IMP, "The y² and y terms were differentiated as if y were x, without the factor dy/dx; y depends on x, so d/dx(y²) = 2y dy/dx.", `−(${sum([[2 * a, "x"], [b + 2 * c, "y"], [d, ""]])})/(${sum([[b, "x"]])})`),
        bug("sign-lost", "procedural", IMP, "The minus sign was lost when the x-terms were moved to the other side.", `(${num})/(${den})`),
        bug("upside-down", "procedural", IMP, "The fraction was turned upside down: divide by the bracket that multiplies dy/dx.", `−(${den})/(${num})`),
      ];
    },
    distractors: ([a, b, c, d]) => [`−(${sum([[a, "x"], [b, "y"]])})/(${sum([[b, "x"], [c, "y"], [d, ""]])})`],
    variants: () => [],
    explain: (s) => (s.id === "diff" ? `Differentiate every term with respect to x, writing dy/dx for the derivative of y and using the product rule on xy: ${s.value}` : `Collect the dy/dx terms and divide: dy/dx = ${s.value}`),
    domain: IMPL_D,
    keep: implKeep,
    cap: 300,
    difficulty: ([, b, , d]) => (d === 0 && Math.abs(b) <= 2 ? 1 : d === 0 ? 2 : 3),
    teach: {
      idea: "y is a function of x, so every y term picks up a factor dy/dx by the chain rule: d/dx(y²) = 2y dy/dx, and d/dx(xy) = y + x dy/dx.",
      method: "Differentiate both sides term by term with respect to x, move the terms without dy/dx to the other side, factor out dy/dx and divide.",
      alternatives: [
        { id: "partials", title: "Use partial derivatives", kind: "procedural", text: ["Write the curve as F(x, y) = constant.", "Then dy/dx = −F_x / F_y, where F_x treats y as a constant and F_y treats x as a constant."] },
      ],
    },
    limits: "Second-degree curves a x² + b xy + c y² + d y = k with small whole coefficients; higher-degree and trigonometric implicit curves are not included.",
  },
  {
    id: "arparam",
    arity: 4,
    title: "dy/dx for a curve given in parametric form",
    competency: IMP,
    skill: "parametric differentiation",
    type: "expression",
    mc: true,
    // [p, m, q, n]: x = p tᵐ, y = q tⁿ
    parse: none,
    reject: (p) => (parKeep(p) ? null : "x = p tᵐ, y = q tⁿ with small whole p, q and different powers m, n up to 4."),
    prompt: ([p, m, q, n]) => `A curve is given by x = ${sum([[p, pw("t", m)]])}, y = ${sum([[q, pw("t", n)]])}. Find dy/dx in terms of t (t ≠ 0).`,
    solve: ([p, m, q, n]) => {
      const ans = tpow((q * n) / (p * m), n - m);
      return {
        steps: [
          st("dx", "differentiate", DR, [sum([[p, pw("t", m)]])], sum([[p * m, pw("t", m - 1)]])),
          st("dy", "differentiate", DR, [sum([[q, pw("t", n)]])], sum([[q * n, pw("t", n - 1)]])),
          st("divide", "divide", IMP, [], ans),
        ],
        answer: ans,
      };
    },
    // independent: (dy/dt)/(dx/dt) by central differences
    validate: ([p, m, q, n], v) => matches(v, ({ t }) => d1((s) => q * s ** n, t) / d1((s) => p * s ** m, t), [0.4, 0.75, 1.2, 1.6, 2.1].map((t) => ({ t }))),
    bugs: ([p, m, q, n]) => [
      bug("upside-down", "conceptual", IMP, "dx/dt was divided by dy/dt; dy/dx = (dy/dt) ÷ (dx/dt).", tpow((p * m) / (q * n), m - n)),
      bug("divide-functions", "conceptual", IMP, "y was divided by x without differentiating; dy/dx is the ratio of the two derivatives, not of x and y.", tpow(q / p, n - m)),
      bug("x-not-differentiated", "procedural", DR, "Only y was differentiated; the derivative of y was divided by x itself instead of by dx/dt.", tpow((q * n) / p, n - 1 - m)),
    ],
    distractors: ([p, m, q, n]) => [tpow((q * n) / (p * m), n - m + 1), tpow((-q * n) / (p * m), n - m)],
    variants: () => [],
    explain: (s) => (s.id === "dx" ? `dx/dt = ${s.value}` : s.id === "dy" ? `dy/dt = ${s.value}` : `dy/dx = (dy/dt) ÷ (dx/dt) = ${s.value}`),
    domain: PAR_D,
    keep: parKeep,
    cap: 300,
    difficulty: ([p, m, q, n]) => (Math.abs(n - m) === 1 && p === 1 ? 1 : n > m ? 2 : 3),
    word: ([p, m, q, n]) => `A small drone moves so that t seconds after launch its position is x = ${sum([[p, pw("t", m)]])}, y = ${sum([[q, pw("t", n)]])} (in metres). Find the slope dy/dx of its path at time t, in terms of t.`,
    teach: {
      idea: "When x and y both depend on t, a small change in t changes y by (dy/dt)Δt and x by (dx/dt)Δt, so dy/dx = (dy/dt) ÷ (dx/dt).",
      method: "Differentiate x and y with respect to t separately, then divide dy/dt by dx/dt and simplify the powers of t.",
      alternatives: [
        { id: "eliminate", title: "Eliminate t first", kind: "procedural", text: ["Write t in terms of x and substitute into y to get y as a function of x.", "Differentiate, then write the answer back in terms of t; it agrees with (dy/dt) ÷ (dx/dt)."] },
      ],
    },
    limits: "x and y single power terms in t; trigonometric parametrisations (x = a cos t, y = b sin t) are not included.",
  },
  {
    id: "arlogdiff",
    arity: 3,
    title: "Logarithmic differentiation of (ax + b) to the power kx",
    competency: IMP,
    skill: "logarithmic differentiation",
    type: "expression",
    mc: true,
    // [a, b, k]: y = (a x + b)^(k x)
    parse: none,
    reject: (p) => (inDom(p, LOGD_D) ? null : "y = (a x + b)^(k x) with a, k up to 4 and b from 0 to 5."),
    prompt: (p) => `Differentiate y = ${logdParts(p).y} with respect to x (x > 0).`,
    solve: (p) => {
      const [a, b, k] = p;
      const { I, E, ans } = logdParts(p);
      return {
        steps: [
          st("log", "take logarithms", LOG, [I, E], `ln y = ${E} ln(${I})`),
          st("diff", "differentiate", DR, [I, E], b === 0 ? `(1/y) dy/dx = ${k}ln(${I}) + ${k}` : `(1/y) dy/dx = ${k}ln(${I}) + ${k * a}x/(${I})`),
          st("multiply", "multiply", IMP, [], ans),
        ],
        answer: ans,
      };
    },
    // independent: a central difference of y itself
    validate: ([a, b, k], v) => matches(v, ({ x }) => d1((s) => (a * s + b) ** (k * s), x), [0.5, 0.9, 1.3, 1.8, 2.2].map((x) => ({ x }))),
    bugs: (p) => {
      const [a, , k] = p;
      const { I, B, E, y, bracket } = logdParts(p);
      return [
        bug("power-rule", "conceptual", DR, "The power rule was used as if the power were a fixed number; here the power depends on x, so take logarithms first.", `${coef(k * a)}x · ${B}^(${E} − 1)`),
        bug("base-constant", "conceptual", DR, "The base was treated as a constant (as for aˣ); the base also changes with x, which gives a second term from the product rule.", `${y} · ${coef(k)}ln(${I})`),
        bug("forgot-y", "procedural", LOG, "After differentiating ln y, the result was not multiplied by y; (1/y) dy/dx = … gives dy/dx = y × (…).", bracket),
      ];
    },
    distractors: (p) => {
      const { I, y } = logdParts(p);
      return [`${y} · ln(${I})`];
    },
    variants: () => [],
    explain: (s) => (s.id === "log" ? `Take logarithms: ${s.value}` : s.id === "diff" ? `Differentiate both sides (product rule on the right): ${s.value}` : `Multiply by y: dy/dx = ${s.value}`),
    domain: LOGD_D,
    difficulty: ([a, b]) => (a === 1 && b === 0 ? 1 : b === 0 ? 2 : 3),
    teach: {
      idea: "When both the base and the power change with x, neither the power rule nor the rule for aˣ applies; taking ln turns the power into a product, which the product rule can handle.",
      method: "Write ln y = (power) × ln(base), differentiate both sides (the left side gives (1/y) dy/dx), then multiply by y.",
      alternatives: [
        { id: "exp_form", title: "Rewrite as an exponential", kind: "procedural", text: ["Write y = e^(kx ln(ax + b)).", "Differentiate with the chain rule: y′ = e^(kx ln(ax + b)) × d/dx[kx ln(ax + b)], which is the same answer."] },
      ],
    },
    limits: "Functions (ax + b)^(kx) only; products of several factors and powers like (sin x)^x are not included.",
  },

  // ------------------------------------------------------------ l'Hôpital
  {
    id: "arlhop",
    arity: 3,
    title: "Indeterminate limits by l'Hôpital's rule",
    competency: LH,
    type: "expression",
    mc: true,
    // [f, a, b]: five standard forms, 0/0 and 1^∞
    parse: none,
    reject: (p) => (lhKeep(p) ? null : "One of five standard indeterminate forms with small whole a and b."),
    prompt: (p) => `Evaluate lim (x → 0) of ${lhExpr(p)}. Give the exact value${p[0] === 2 ? " (log is the natural logarithm)" : ""}.`,
    word: (p) => (p[0] === 3 ? `A bank pays interest so that ₹1 grows to (1 + ${ax(p[1])})^(${p[2]}/x) rupees when interest is added very often (x is the length of each interest period, in years). What does this amount approach as x → 0? Give the exact value.` : `A robot's sensor software works out ${lhExpr(p)} for each small non-zero reading x. What value does this approach as x → 0? Give the exact value${p[0] === 2 ? " (log is the natural logarithm)" : ""}.`),
    solve: (p) => {
      const [f, a, b] = p;
      const ans = lhAnswer(p);
      const steps: Step[] = [st("form", "evaluate", LIM, [lhExpr(p)], f === 3 ? "1^∞" : "0/0")];
      if (f === 3) steps.push(st("log", "take logarithms", LOG, [a, b], `log L = lim ${b} log(1 + ${ax(a)})/x = ${a * b}`));
      else steps.push(st("rule", "differentiate", LH, [f, a, b], ans));
      steps.push(st("value", "evaluate", LH, [], ans));
      return { steps, answer: ans };
    },
    // independent: the function itself near 0 (symmetric average and Richardson extrapolation)
    validate: (p, v) => {
      const g = lhG(p);
      const G = (h: number) => (g(h) + g(-h)) / 2;
      const h = 0.002;
      const L = (4 * G(h / 2) - G(h)) / 3;
      const x = constOf(v);
      return Number.isFinite(x) && Math.abs(x - L) <= 1e-6 * Math.max(1, Math.abs(L));
    },
    bugs: ([f, a, b]) => {
      if (f === 0) return [bug("chain-forgotten", "procedural", DR, `The derivative of e^(${ax(a)}) was taken as e^(${ax(a)}); the chain rule gives a factor ${a}.`, nf(1 / b)), bug("upside-down", "procedural", LH, "The limit of the denominator's derivative over the numerator's was taken; keep the numerator on top.", nf(b / a))];
      if (f === 1)
        return [
          bug("stopped-early", "procedural", LH, `After one application the limit of sin(${ax(a)})/x was taken as 1; it is ${a}.`, nf(a / (2 * b))),
          bug("x2-as-x", "procedural", DR, "The derivative of x² was taken as x; it is 2x.", nf((a * a) / b)),
          bug("cos-sign", "recall", DR, "The derivative of cos was taken as +sin; it is −sin, so the minus signs cancel.", nf((-a * a) / (2 * b))),
        ];
      if (f === 2) return [bug("ax-derivative", "recall", DR, `The derivative of ${a}^x was taken as ${a}; it is ${a}^x log ${a} (natural logarithm).`, nf(a - b)), bug("log-quotient", "recall", LOG, `log ${a} − log ${b} was written as log ${a} ÷ log ${b}; a difference of logarithms is the logarithm of a quotient.`, `log ${a}/log ${b}`)];
      if (f === 3)
        return [
          bug("one-to-infinity", "conceptual", LIM, "1 to any power was taken to be 1; here the base only tends to 1 while the power grows, which is an indeterminate form.", "1"),
          bug("no-exponential", "procedural", LOG, `The limit of log L was given (${a * b}) instead of L itself; L = e^(log L).`, nf(a * b)),
          bug("add-for-multiply", "procedural", LH, `The limit of log L is ${b} × ${a}, not ${b} + ${a}.`, ePow(a + b)),
        ];
      return [
        bug("tan-as-x", "conceptual", LIM, `tan ${ax(a)} was replaced by ${ax(a)} too early, which gives 0; the difference needs the next term, (${ax(a)})³/3.`, "0"),
        bug("chain-forgotten", "procedural", DR, `The factor ${a} from the chain rule was missed in each derivative.`, nf(a / (3 * b))),
        bug("x3-factor", "procedural", DR, "The factor 3 from differentiating x³ was lost.", nf(a ** 3 / b)),
      ];
    },
    distractors: ([f, a, b]) =>
      [
        [nf((2 * a) / b), nf(a * b), nf(a / b + 1), "0"],
        [nf(a / b), nf((a * a) / (4 * b))],
        [`log ${a * b}`, lnFrac(b, a)],
        [ePow(2 * a * b), ePow(a * b + 1)],
        [nf(a ** 3 / (6 * b)), nf(a ** 2 / (3 * b))],
      ][f],
    variants: () => [],
    explain: (s) => (s.id === "form" ? `Substituting x = 0 gives the indeterminate form ${s.value}` : s.id === "log" ? `Take logarithms and apply l'Hôpital's rule: ${s.value}` : s.id === "rule" ? "Differentiate the numerator and the denominator separately (as often as needed) and substitute x = 0" : `The limit is ${s.value}`),
    domain: LH_D,
    keep: lhKeep,
    difficulty: ([f]) => (f === 0 ? 1 : f === 1 || f === 2 ? 2 : 3),
    teach: {
      idea: "Near x = 0 a 0/0 quotient behaves like the ratio of the rates at which numerator and denominator leave 0, so lim f/g = lim f′/g′ while the form stays 0/0.",
      method: "Check the form; differentiate the numerator and the denominator separately (not the quotient rule) and substitute again; repeat while it is still 0/0. For 1^∞, take log (the natural logarithm) first and exponentiate at the end.",
      alternatives: [
        { id: "series", title: "Use standard series", kind: "conceptual", text: ["Replace each function by the start of its series: eᵘ ≈ 1 + u, cos u ≈ 1 − u²/2, tan u ≈ u + u³/3.", "Cancel the power of x and let x → 0."] },
      ],
    },
    limits: "Five standard forms at x → 0 with whole-number parameters; ∞/∞ forms, 0 × ∞ and ∞ − ∞ are not included.",
  },

  // ------------------------------------------------------------ linear approximation and errors
  {
    id: "arlinapp",
    arity: 3,
    title: "Estimating a root by linear approximation",
    competency: LA,
    type: "fraction",
    mc: true,
    // [f, a, d]: √(a² + d) (f = 0) or ∛(a³ + d) (f = 1)
    parse: none,
    reject: (p) => (linKeep(p) ? null : "√(a² + d) or ∛(a³ + d) with a small change d."),
    prompt: ([f, a, d]) =>
      f === 0
        ? `Use the linear approximation of f(x) = √x at x = ${a * a} to estimate √${a * a + d}. Give the value of the approximation as a fraction or a decimal.`
        : `Use the linear approximation of f(x) = ∛x at x = ${a ** 3} to estimate ∛${a ** 3 + d}. Give the value of the approximation as a fraction or a decimal.`,
    solve: ([f, a, d]) => {
      const x0 = f === 0 ? a * a : a ** 3;
      const der = f === 0 ? 1 / (2 * a) : 1 / (3 * a * a);
      return {
        steps: [
          st("base", "evaluate", LA, [x0], a),
          st("slope", "differentiate", DR, [x0], der),
          st("estimate", "add", LA, [a, der, d], linAns([f, a, d])),
        ],
        answer: linAns([f, a, d]),
      };
    },
    // independent: the slope by a central difference, and the estimate close to the true root
    validate: ([f, a, d], v) => {
      if (typeof v !== "number") return false;
      const F = f === 0 ? Math.sqrt : Math.cbrt;
      const x0 = f === 0 ? a * a : a ** 3;
      const est = F(x0) + d * d1(F, x0, 1e-3);
      return Math.abs(v - est) < 1e-6 && Math.abs(v - F(x0 + d)) < 0.1;
    },
    bugs: ([f, a, d]) =>
      f === 0
        ? [
            bug("no-half", "recall", DR, "The derivative of √x was taken as 1/√x; it is 1/(2√x).", a + d / a),
            bug("derivative-at-x", "procedural", LA, `The derivative 1/(2√x) was worked out as 1/(2x) at x = ${a * a}; √${a * a} = ${a}.`, a + d / (2 * a * a)),
            bug("change-sign", "procedural", LA, `The change Δx = ${nf(d)} was used with the wrong sign.`, a - d / (2 * a)),
          ]
        : [
            bug("no-square", "procedural", LA, `The derivative 1/(3x^(2/3)) was worked out as 1/(3∛x); at x = ${a ** 3} it is 1/(3 × ${a}²).`, a + d / (3 * a)),
            bug("no-third", "recall", DR, "The derivative of ∛x lost its factor 1/3.", a + d / (a * a)),
            bug("change-sign", "procedural", LA, `The change Δx = ${nf(d)} was used with the wrong sign.`, a - d / (3 * a * a)),
          ],
    variants: () => [],
    explain: (s) => (s.id === "base" ? `Start from a nearby value you know: f(${s.inputs[0]}) = ${s.value}` : s.id === "slope" ? `The slope there: f′(${s.inputs[0]}) = ${nf(Number(s.value))}` : `f(x₀ + Δx) ≈ f(x₀) + f′(x₀)Δx = ${s.inputs[0]} + ${nf(Number(s.inputs[1]))} × (${nf(Number(s.inputs[2]))}) = ${nf(Number(s.value))}`),
    domain: LIN_D,
    keep: linKeep,
    difficulty: ([f, a, d]) => (f === 0 && d > 0 && a <= 5 ? 1 : f === 0 ? 2 : 3),
    word: ([f, a, d]) =>
      f === 0
        ? `A square plot of land has an area of ${a * a + d} m². Using the linear approximation of √x at x = ${a * a}, estimate the length of a side of the plot in metres.`
        : `A cube-shaped water tank holds ${a ** 3 + d} m³. Using the linear approximation of ∛x at x = ${a ** 3}, estimate the length of an edge of the tank in metres.`,
    teach: {
      idea: "Close to a point, a smooth curve is almost its tangent line, so f(x₀ + Δx) ≈ f(x₀) + f′(x₀)Δx.",
      method: "Pick x₀ near the number where f(x₀) is easy (a perfect square or cube), find f′(x₀), and add f′(x₀) × Δx to f(x₀).",
      alternatives: [
        { id: "differential", title: "Think in differentials", kind: "conceptual", text: ["Write y = √x, so dy = dx/(2√x).", "With x = x₀ and dx = Δx, dy is the small change in the root; add it to the known root."] },
      ],
    },
    limits: "Square and cube roots near perfect squares and cubes, with small whole changes.",
  },
  {
    id: "arerror",
    arity: 4,
    title: "Approximate absolute and percentage errors by differentials",
    competency: LA,
    skill: "errors by differentials",
    type: "fraction",
    mc: true,
    decimals: true,
    // [s, x, k, q]: square area / cube volume / cube surface; side x cm, error k/100 cm; q = 0 absolute, 1 percentage
    parse: none,
    reject: (p) => (errKeep(p) ? null : "A square or cube of side 2–20 cm with a measurement error of 0.01–0.05 cm."),
    prompt: ([s, x, k, q]) =>
      `The side of a ${s === 0 ? "square" : "cube"} is measured as ${x} cm, with a possible error of ${(k / 100).toFixed(2)} cm. Use differentials to find the approximate ${q ? "percentage error" : "error"} in the ${ERR_WHAT[s]}${q ? "" : `, in ${ERR_UNIT[s]}`}.`,
    solve: (p) => {
      const [s, x, k] = p;
      const n = errN(s);
      const c = errC(s);
      const dV = (n * c * x ** (n - 1) * k) / 100;
      const steps = [st("derivative", "differentiate", DR, [n, c, x], n * c * x ** (n - 1)), st("abs", "multiply", LA, [n * c * x ** (n - 1), k / 100], dV)];
      if (p[3]) steps.push(st("pct", "divide", LA, [dV, c * x ** n], errAns(p)));
      return { steps, answer: errAns(p) };
    },
    // independent: the change in the quantity for a tiny fraction of the error, scaled up (a numerical derivative)
    validate: ([s, x, k, q], v) => {
      if (typeof v !== "number") return false;
      const V = (t: number) => errC(s) * t ** errN(s);
      const ds = k / 100;
      const e = 1e-4;
      const dV = ((V(x + e * ds) - V(x - e * ds)) / (2 * e));
      return near(v, q ? (100 * dV) / V(x) : dV, 1e-7);
    },
    bugs: ([s, x, k, q]) => {
      const n = errN(s);
      const c = errC(s);
      const ds = k / 100;
      if (q === 0)
        return [
          bug("no-power-factor", "recall", DR, `The derivative of x${sup(n)} was taken as x${sup(n - 1)}; it is ${n}x${sup(n - 1)}.`, c * x ** (n - 1) * ds),
          ...(s === 2 ? [bug("surface-six", "prerequisite", SOLID, "The surface area of a cube was taken as x²; a cube has 6 faces, so it is 6x².", n * x ** (n - 1) * ds)] : []),
        ];
      return [
        bug("side-percentage", "conceptual", LA, `The percentage error in the side was given; the ${ERR_WHAT[s].replace(/ of the.*/, "")} grows as the ${n === 2 ? "square" : "cube"} of the side, so its percentage error is ${n} times as large.`, (100 * ds) / x),
        bug("relative-not-percent", "procedural", LA, "The relative error was found but not multiplied by 100 to make a percentage.", (n * ds) / x),
      ];
    },
    // further real slips: the derivative not multiplied by the error, the error 0.0k read as 0.k, V × Δx; for a
    // percentage, the change not divided by the side, or divided by the side instead of by V
    distractors: ([s, x, k, q]) => {
      const n = errN(s);
      const c = errC(s);
      const ds = k / 100;
      const der = n * c * x ** (n - 1);
      if (q === 0) return [der, der * ds * 10, c * x ** n * ds];
      return [100 * n * ds, (100 * der * ds) / x];
    },
    variants: () => [],
    explain: (s) => (s.id === "derivative" ? `dV/dx = ${s.value} at x = ${s.inputs[2]}` : s.id === "abs" ? `ΔV ≈ (dV/dx) Δx = ${s.inputs[0]} × ${s.inputs[1]} = ${nf(Number(s.value))}` : `Percentage error = ΔV / V × 100 = ${nf(Number(s.inputs[0]))} ÷ ${s.inputs[1]} × 100 = ${nf(Number(s.value))}%`),
    domain: ERR_D,
    keep: errKeep,
    cap: 400,
    difficulty: ([s, , , q]) => (s === 0 && q === 0 ? 1 : q === 0 || s === 0 ? 2 : 3),
    word: ([s, x, k, q]) =>
      `${s === 0 ? "A square floor tile" : s === 1 ? "A cube-shaped block of ice" : "A cube-shaped gift box"} has a side of ${x} cm, measured with a possible error of ${(k / 100).toFixed(2)} cm. Using differentials, about how large is the ${q ? "percentage error" : "error"} in ${s === 0 ? "its area" : s === 1 ? "its volume" : "the area of paper needed to cover it (its surface area)"}${q ? "" : `, in ${ERR_UNIT[s]}`}?`,
    teach: {
      idea: "A small error Δx in the side changes the quantity V by about V′(x)Δx; the percentage error is that change divided by V, times 100.",
      method: "Write V in terms of the side, differentiate, multiply by the error in the side; for a percentage, divide by V and multiply by 100.",
      alternatives: [
        { id: "power_rule", title: "Powers multiply percentage errors", kind: "conceptual", text: ["If V = c xⁿ, then ΔV/V ≈ n Δx/x.", "So the percentage error in V is n times the percentage error in x."] },
      ],
    },
    limits: "Squares and cubes only, with errors of 0.01–0.05 cm; percentage questions only where the percentage has at most two decimals.",
  },

  // ------------------------------------------------------------ linear first-order differential equations
  {
    id: "arlinde",
    arity: 4,
    title: "Solving dy/dx + Py = Q with an integrating factor",
    competency: LDE,
    type: "expression",
    mc: true,
    // [f, a, b, c]: f = 0: y′ + a y = b, y(0) = c;  f = 1: y′ + (a/x) y = xᵇ, y(1) = c
    parse: none,
    reject: (p) => (ldeKeep(p) ? null : "y′ + a y = b or y′ + (a/x) y = xᵇ with a whole-number starting value."),
    prompt: ([f, a, b, c]) =>
      f === 0
        ? `Solve dy/dx + ${ax(a, "y")} = ${nf(b)}, given that y(0) = ${nf(c)}. Write y in terms of x.`
        : `Solve dy/dx + (${a}/x)y = ${b === 0 ? "1" : pw("x", b)} for x > 0, given that y(1) = ${nf(c)}. Write y in terms of x.`,
    word: ([f, a, b, c]) =>
      f === 0
        ? `The reading y of a temperature sensor (in °C above the room) changes with time x minutes so that dy/dx + ${ax(a, "y")} = ${nf(b)}, and y = ${nf(c)} when x = 0. Find y in terms of x.`
        : `In a curve-design program, a curve for x > 0 must satisfy dy/dx + (${a}/x)y = ${b === 0 ? "1" : pw("x", b)} and pass through the point (1, ${nf(c)}). Find y in terms of x.`,
    solve: (p) => {
      const [f, a, b, c] = p;
      const ans = ldeAns(p);
      const IF = f === 0 ? `e^(${ax(a)})` : pw("x", a);
      const general = f === 0 ? `y = ${nf(b / a)} + Ce^(−${ax(a)})` : `y = ${sum([[1 / (a + b + 1), pw("x", b + 1)]])} + C${pw("x", -a)}`;
      const Cv = f === 0 ? c - b / a : c - 1 / (a + b + 1);
      return {
        steps: [
          st("if", "integrating factor", LDE, [f === 0 ? a : `${a}/x`], IF),
          st("integrate", "integrate", IND, [IF], general),
          st("constant", "substitute", DE, [c], nf(Cv)),
        ],
        answer: ans,
      };
    },
    // independent: substitute the answer back into the equation (numerical derivative) and check the starting value
    validate: ([f, a, b, c], v) => {
      const n = node(v);
      if (!n) return false;
      const y = (x: number) => ev(n, { x });
      const x0 = f === 0 ? 0 : 1;
      if (!Number.isFinite(y(x0)) || Math.abs(y(x0) - c) > 1e-9) return false;
      const xs = f === 0 ? [0.3, 0.8, 1.4, 2.0] : [0.6, 1.1, 1.7, 2.3];
      return xs.every((x) => {
        const r = d1(y, x) + (f === 0 ? a : a / x) * y(x) - (f === 0 ? b : x ** b);
        return Number.isFinite(r) && Math.abs(r) < 1e-5 * Math.max(1, Math.abs(y(x)));
      });
    },
    bugs: ([f, a, b, c]) => {
      if (f === 0)
        return [
          bug("factor-sign", "procedural", LDE, `The exponential in the solution was written as e^(${ax(a)}); dividing by the integrating factor e^(${ax(a)}) gives e^(−${ax(a)}).`, sum([[b / a, ""], [c - b / a, `e^(${ax(a)})`]])),
          bug("constant-not-fitted", "procedural", DE, `The starting value ${nf(c)} was used directly as C; C must be found by putting x = 0 into the whole solution.`, sum([[b / a, ""], [c, `e^(−${ax(a)})`]])),
          bug("constant-dropped", "conceptual", DE, "The constant of integration was left out, so the solution cannot meet the starting condition.", nf(b / a)),
        ];
      const E = 1 / (a + b + 1);
      return [
        bug("q-not-multiplied", "procedural", LDE, `The right side was integrated without multiplying by the integrating factor ${pw("x", a)} first.`, sum([[1 / (b + 1), pw("x", b + 1 - a)], [c - 1 / (b + 1), pw("x", -a)]])),
        bug("constant-not-fitted", "procedural", DE, `The starting value ${nf(c)} was used directly as C; C must be found by putting x = 1 into the whole solution.`, sum([[E, pw("x", b + 1)], [c, pw("x", -a)]])),
        bug("constant-dropped", "conceptual", DE, "The constant of integration was left out, so the solution cannot meet the starting condition.", sum([[E, pw("x", b + 1)]])),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "if" ? `Integrating factor: e^(∫P dx) = ${s.value}` : s.id === "integrate" ? `Multiply through, integrate (IF × y) = ∫ IF × Q dx, and divide by the IF: ${s.value}` : `Put in the starting value: C = ${s.value}`),
    domain: LDE_D,
    keep: ldeKeep,
    difficulty: ([f, a, b, c]) => (f === 0 && c === 0 ? 1 : f === 0 ? 2 : 3),
    teach: {
      idea: "Multiplying dy/dx + Py = Q by e^(∫P dx) turns the left side into the derivative of a single product, (IF × y)′, which can be integrated directly.",
      method: "Find IF = e^(∫P dx); write IF × y = ∫ IF × Q dx + C; divide by IF; use the starting value to find C.",
      alternatives: [
        { id: "particular_plus", title: "Particular part plus free part", kind: "conceptual", text: ["Find one simple solution of the full equation (for y′ + ay = b, the constant y = b/a).", "Add C times a solution of y′ + Py = 0 (here e^(−ax) or x^(−a)) and choose C to fit the starting value."] },
      ],
    },
    limits: "Constant P with constant Q, and P = a/x with Q = xᵇ; dx/dy forms and trigonometric Q are not included.",
  },

  // ------------------------------------------------------------ mean value theorem
  {
    id: "armvt",
    arity: 3,
    title: "The point c in Lagrange's mean value theorem for a cubic",
    competency: MVT,
    type: "roots",
    mc: true,
    // [p, a, b]: f(x) = x³ + p x² + q x on [a, b], q fixed by the parameters
    parse: none,
    reject: (p) => (mvtKeep(p) ? null : "x³ + p x² + q x on an interval [a, b] of length at most 6."),
    prompt: (P) => {
      const [p, a, b] = P;
      return `Find all values of c in (${nf(a)}, ${nf(b)}) that satisfy the conclusion of Lagrange's mean value theorem for f(x) = ${sum([[1, "x³"], [p, "x²"], [mvtQ(P), "x"]])} on [${nf(a)}, ${nf(b)}]. If there is more than one, separate them with commas.`;
    },
    word: (P) => {
      const [p, a, b] = P;
      return `A car on a straight highway is s(t) = ${sum([[1, "t³"], [p, "t²"], [mvtQ(P), "t"]])} km past a toll plaza t hours after noon (negative t is before noon, negative s before the plaza). Between t = ${nf(a)} and t = ${nf(b)}, at which times c is its speedometer reading s′(c) equal to its average speed over that period? If there is more than one, separate them with commas.`;
    },
    solve: (P) => {
      const [p, a, b] = P;
      const q = mvtQ(P);
      const f = mvtF(p, q);
      const slope = (f(b) - f(a)) / (b - a);
      const D = p * p + 3 * (a * a + a * b + b * b + p * (a + b));
      const ans = mvtRoots(p, D, a, b).join(", ");
      return {
        steps: [
          st("slope", "evaluate", MVT, [f(a), f(b), a, b], slope),
          st("equation", "differentiate", DR, [p, q], `3c² ${p < 0 ? "−" : "+"} ${Math.abs(2 * p)}c ${q < 0 ? "−" : "+"} ${Math.abs(q)} = ${nf(slope)}`),
          st("solve", "solve", QUAD, [], mvtRoots(p, D, a, b, true).join(", ")),
          st("inside", "check", MVT, [a, b], ans),
        ],
        answer: ans,
      };
    },
    // independent: each value checked by a numerical derivative, and the number of solutions counted by a sign scan
    validate: (P, v) => {
      if (typeof v !== "string") return false;
      const [p, a, b] = P;
      const f = mvtF(p, mvtQ(P));
      const slope = (f(b) - f(a)) / (b - a);
      const cs = v.split(",").map((s) => constOf(s.trim()));
      if (!cs.length || cs.some((c) => !Number.isFinite(c) || c <= a || c >= b)) return false;
      if (cs.some((c, i) => cs.some((d, j) => j !== i && Math.abs(c - d) < 1e-9))) return false;
      if (cs.some((c) => Math.abs(d1(f, c) - slope) > 1e-6 * Math.max(1, Math.abs(slope)))) return false;
      const g = (x: number) => d1(f, x) - slope;
      let count = 0;
      const n = 3000;
      const e = 1e-6;
      const X = (i: number) => a + e + ((b - a - 2 * e) * i) / n;
      for (let i = 0; i < n; i++) if ((g(X(i)) < 0) !== (g(X(i + 1)) < 0)) count++;
      return count === cs.length;
    },
    bugs: (P) => {
      const [p, a, b] = P;
      const q = mvtQ(P);
      const f = mvtF(p, q);
      const D = p * p + 3 * (a * a + a * b + b * b + p * (a + b));
      const delta = f(b) - f(a);
      const noDiv = mvtRoots(p, p * p - 3 * (q - delta), a, b);
      return [
        bug("not-checked-inside", "procedural", MVT, `Both solutions of the quadratic were given; only values strictly between ${nf(a)} and ${nf(b)} count.`, mvtRoots(p, D, a, b, true).join(", ")),
        bug("midpoint", "conceptual", MVT, "The midpoint of the interval was given; that works for a quadratic, but for a cubic c must be found from f′(c) = (f(b) − f(a))/(b − a).", nf((a + b) / 2)),
        bug("no-divide", "procedural", MVT, `f(b) − f(a) was not divided by b − a = ${b - a}.`, noDiv.length ? noDiv.join(", ") : null),
      ];
    },
    distractors: ([p, a, b]) => [nf(a + (b - a) / 3), nf(b - (b - a) / 3)],
    variants: () => [],
    explain: (s) => (s.id === "slope" ? `Slope of the chord: (f(${nf(Number(s.inputs[3]))}) − f(${nf(Number(s.inputs[2]))}))/(${nf(Number(s.inputs[3]))} − (${nf(Number(s.inputs[2]))})) = ${nf(Number(s.value))}` : s.id === "equation" ? `Set f′(c) equal to it: ${s.value}` : s.id === "solve" ? `Solve the quadratic: c = ${s.value}` : `Keep only the values inside (${nf(Number(s.inputs[0]))}, ${nf(Number(s.inputs[1]))}): ${s.value}`),
    domain: MVT_D,
    keep: mvtKeep,
    difficulty: ([p, a]) => (p === 0 && a >= 0 ? 1 : a >= 0 ? 2 : 3),
    teach: {
      idea: "A polynomial is continuous on [a, b] and differentiable inside, so somewhere inside the tangent is parallel to the chord: f′(c) = (f(b) − f(a))/(b − a).",
      method: "Work out the chord slope, set f′(c) equal to it, solve the quadratic for c, and keep only the values strictly between a and b.",
      alternatives: [
        { id: "parallel_tangent", title: "Parallel tangent picture", kind: "conceptual", text: ["Draw the chord from (a, f(a)) to (b, f(b)).", "Slide a line with the same slope across the graph: where it just touches the curve is a point c."] },
      ],
    },
    limits: "Finds the guaranteed points for cubics x³ + px² + qx; verifying the hypotheses in words and proving inequalities are written work for an educator.",
  },

  // ------------------------------------------------------------ monotonicity
  {
    id: "armono",
    arity: 4,
    title: "Where a cubic is increasing or decreasing",
    competency: MON,
    type: "interval",
    mc: true,
    // [α, β, s, k]: f′ = 6σ(x − α)(x − β), σ = +1 (k = 0) or −1 (k = 1); s = 1 increasing, 0 decreasing
    parse: none,
    reject: (p) => (monKeep(p) ? null : "A cubic with whole-number stationary points α < β at most 6 apart."),
    prompt: (p) => {
      const { c3, c2, c1, r } = monF(p);
      return `For f(x) = ${sum([[c3, "x³"], [c2, "x²"], [c1, "x"], [r, ""]])}, find where f is strictly ${p[2] ? "increasing" : "decreasing"}. Write the open interval(s) as inequalities in x, e.g. 1 < x < 4, or x < 1 or x > 4.`;
    },
    word: (p) => {
      const { c3, c2, c1, r } = monF(p);
      return `The height of a drone above its launch pad, in metres, x minutes after 10 a.m. (negative x before 10 a.m.) is modelled by h(x) = ${sum([[c3, "x³"], [c2, "x²"], [c1, "x"], [r, ""]])}. When is the drone strictly ${p[2] ? "rising" : "falling"}? Write the open interval(s) as inequalities in x, e.g. 1 < x < 4, or x < 1 or x > 4.`;
    },
    solve: (p) => {
      const [al, be] = p;
      const { s } = monF(p);
      return {
        steps: [
          st("derivative", "differentiate", DR, [6 * s, al, be], `f′(x) = ${coef(6 * s)}(${lin1(al)})(${lin1(be)})`),
          st("critical", "solve", QUAD, [al, be], `${nf(al)}, ${nf(be)}`),
          st("sign", "sign chart", MON, [s], monAns(p)),
        ],
        answer: monAns(p),
      };
    },
    // independent: the sign of a numerical derivative at every tenth from −12 to 12, against membership of the answer
    validate: (p, v) => {
      const inSet = intervalTest(v);
      if (!inSet) return false;
      const { c3, c2, c1, r } = monF(p);
      const f = (x: number) => c3 * x ** 3 + c2 * x * x + c1 * x + r;
      for (let i = -120; i <= 120; i++) {
        const x = i / 10;
        const fp = d1(f, x, 1e-4);
        const want = p[2] ? fp > 1e-6 : fp < -1e-6;
        if (inSet(x) !== want) return false;
      }
      return true;
    },
    bugs: (p) => {
      const [al, be, s, k] = p;
      const ans = monAns(p);
      const isIn = ans === inside(al, be);
      return [
        bug("swapped", "conceptual", MON, `The ${s ? "decreasing" : "increasing"} part was given; f is ${s ? "increasing" : "decreasing"} where f′(x) is ${s ? "positive" : "negative"}${k ? ", and here the leading coefficient is negative" : ""}.`, isIn ? outside(al, be) : inside(al, be)),
        bug("root-signs", "procedural", QUAD, `The stationary points were read off the factors with the wrong sign: (x ${al < 0 ? "+" : "−"} ${Math.abs(al)}) = 0 gives x = ${nf(al)}.`, al === -be ? null : isIn ? inside(-be, -al) : outside(-be, -al)),
        ...(isIn ? [] : [bug("one-piece", "procedural", INTV, `Only one of the two pieces was given; f′ has the same sign for x < ${nf(al)} and for x > ${nf(be)}.`, `x > ${nf(be)}`)]),
      ];
    },
    distractors: ([al, be]) => [`x > ${nf(al)}`, `x < ${nf(be)}`],
    variants: () => [],
    explain: (s) => (s.id === "derivative" ? s.value as string : s.id === "critical" ? `f′(x) = 0 at x = ${s.value}` : `Test the sign of f′ on each side of the stationary points: ${s.value}`),
    domain: MON_D,
    keep: monKeep,
    difficulty: ([al, , s, k]) => (k === 0 && s === 0 && al >= 0 ? 1 : k === 0 ? 2 : 3),
    teach: {
      idea: "f is strictly increasing where f′(x) > 0 and strictly decreasing where f′(x) < 0; f′ can change sign only where it is 0.",
      method: "Differentiate and factor f′; mark its zeros on a number line; test one number in each part to find the sign of f′; read off the parts you need.",
      alternatives: [
        { id: "parabola", title: "Picture the graph of f′", kind: "conceptual", text: ["Here f′ is a quadratic: a parabola crossing the x-axis at the two stationary points.", "If it opens upwards it is negative between them and positive outside; if it opens downwards, the other way round."] },
      ],
    },
    limits: "Cubics with two whole-number stationary points; open intervals only (whether the end points may be included is not asked).",
  },

  // ------------------------------------------------------------ limits of two variables
  {
    id: "armvlim",
    arity: 3,
    title: "Limits of functions of two variables (0/0 that simplifies)",
    competency: MVL,
    type: "integer",
    mc: true,
    // [t, k, b]: four forms that are 0/0 at the point but have a limit
    parse: none,
    reject: (p) => (mvlKeep(p) ? null : "One of four removable 0/0 forms with small whole k and b."),
    prompt: (p) => {
      const { expr, at } = mvlParts(p);
      return `Evaluate lim ((x, y) → (${nf(at[0])}, ${nf(at[1])})) of ${expr}.`;
    },
    solve: (p) => {
      const { expr, at, ans } = mvlParts(p);
      const how = ["cancel the factor (x − ky)", "use sin u / u → 1", "use (eᵘ − 1)/u → 1", "cancel the factor (x + ky)"][p[0]];
      return { steps: [st("form", "evaluate", LIM, [expr, at[0], at[1]], "0/0"), st("simplify", "simplify", MVL, [how], ans)], answer: ans };
    },
    // independent: the function's values just next to the point along three different directions
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const { g, at } = mvlParts(p);
      return [[1, 0.3], [-0.7, 1], [0.5, -1]].every(([u, w]) => {
        const h = 1e-5;
        const val = g(at[0] + h * u, at[1] + h * w);
        return Number.isFinite(val) && Math.abs(val - v) <= 1e-3 * Math.max(1, Math.abs(v));
      });
    },
    bugs: ([t, k, b]) => {
      const zero = bug("zero-over-zero", "conceptual", LIM, "Substituting gives 0/0, which was read as 0; 0/0 says nothing yet, so simplify first.", 0);
      if (t === 0) return [zero, bug("factor-k", "procedural", POLY, `The factor x² − ${k * k}y² was split as (x − ${coef(k)}y)(x + y); it is (x − ${coef(k)}y)(x + ${coef(k)}y).`, k * b + b)];
      if (t === 1) return [zero, bug("dropped-y", "procedural", LIM, `sin(${coef(k)}xy)/x was taken to tend to ${k}; it is ${coef(k)}y × sin(${coef(k)}xy)/(${coef(k)}xy), and y → ${nf(b)}.`, k)];
      if (t === 2) return [zero, bug("dropped-x", "procedural", LIM, `(e^(${coef(k)}xy) − 1)/y was taken to tend to ${k}; it is ${coef(k)}x × (eᵘ − 1)/u with u = ${coef(k)}xy, and x → ${nf(b)}.`, k)];
      return [zero, bug("factor-sign", "recall", POLY, `a³ + b³ = (a + b)(a² − ab + b²) was used with + ab in the second bracket.`, k * k * b * b)];
    },
    // further real slips: the number k lost when substituting, the sign of the point's coordinate lost, and for the
    // cubes the middle term −ab dropped
    distractors: ([t, k, b]) => (t === 0 ? [2 * b, -2 * k * b, k * b] : t === 3 ? [2 * k * k * b * b, 3 * b * b, 3 * k * b * b] : [b, -k * b, k * k * b]),
    variants: () => [],
    explain: (s) => (s.id === "form" ? `Substituting (${nf(Number(s.inputs[1]))}, ${nf(Number(s.inputs[2]))}) gives 0/0` : `Simplify (${s.inputs[0]}), then substitute: the limit is ${nf(Number(s.value))}`),
    domain: MVL_D,
    keep: mvlKeep,
    difficulty: ([t, k]) => (t === 0 && k === 1 ? 1 : t <= 1 ? 2 : 3),
    teach: {
      idea: "A limit asks what the values approach, not the value at the point; if 0/0 comes from a common factor or a standard limit, removing it leaves a continuous function you can substitute into.",
      method: "Substitute to see the form; factor and cancel, or rewrite with a standard limit such as sin u / u → 1; then substitute the point.",
      alternatives: [
        { id: "paths", title: "Check along a few paths", kind: "conceptual", text: ["Approach the point along two or three different straight lines and watch the values.", "If they all head to the same number and the function simplifies to a continuous one, that number is the limit."] },
      ],
    },
    limits: "Removable 0/0 forms only; limits that do not exist are the family armvlimx.",
  },
  {
    id: "armvlimx",
    arity: 5,
    title: "Does a two-variable limit at the origin exist?",
    competency: MVL,
    skill: "existence of two-variable limits",
    type: "choice",
    // [p, q, k, c, s]: k xᵖ yᵠ / (x² + c y²) at (0, 0) (s = 0), or 1 plus it written as one fraction (s = 1)
    parse: none,
    reject: (p) => (mvlxKeep(p) ? null : "k xᵖ yᵠ / (x² + c y²), or (x² + c y² + k xᵖ yᵠ)/(x² + c y²), with p, q up to 3."),
    choices: () => MVLX_CHOICES,
    prompt: (p) => `Let f(x, y) = ${mvlxText(p)} for (x, y) ≠ (0, 0). Which statement about lim ((x, y) → (0, 0)) f(x, y) is true?`,
    solve: ([p, q, , , s]) => {
      const idx = p + q > 2 ? (s ? 1 : 0) : 2;
      return {
        steps: [
          ...(s ? [st("split", "divide", MVL, [], "f = 1 + (the fraction without the x² + cy² part)")] : []),
          st("degree", "compare", MVL, [p + q, 2], p + q - 2),
          st("paths", "compare", LIM, [p, q, s], idx),
        ],
        answer: idx,
      };
    },
    // independent: values along six directions very close to the origin
    validate: (P, v) => {
      const g = mvlxG(P);
      const r = 1e-6;
      const vals = [0, 0.4, 1.1, Math.PI / 2, 2.3, 3.0].map((t) => g(r * Math.cos(t), r * Math.sin(t)));
      const idx = vals.every((x) => Math.abs(x) < 1e-3) ? 0 : vals.every((x) => Number.isFinite(x) && Math.abs(x - vals[0]) < 1e-3) ? 1 : 2;
      return v === idx;
    },
    bugs: ([p, q, , , s]) =>
      p + q > 2
        ? [
            bug("zero-denominator", "conceptual", LIM, "The denominator is 0 at the origin, so it was decided that there is no limit; a limit looks at the values near the point, and here the top shrinks faster than the bottom.", 2),
            ...(s ? [bug("one-forgotten", "procedural", MVL, "The part k xᵖyᵠ/(x² + cy²) was seen to tend to 0, but the x² + cy² in the numerator, divided by the denominator, gives 1, which stays.", 0)] : []),
          ]
        : [
            bug("one-path", "conceptual", MVL, `Only one path (an axis) was tried; along an axis the values tend to ${s ? "a single number" : "0"}, but along a line y = mx they do not, so the limit does not exist.`, s ? 1 : 0),
            ...(!s && p + q === 2 && (p === 0 || q === 0) ? [bug("other-axis", "conceptual", MVL, "Only the other axis was tried, which gives a non-zero constant; along the first axis the values are 0.", 1)] : []),
          ],
    variants: ([p, q, k, c, s]) => [[p, q, k, c, 1 - s]],
    explain: (s) => (s.id === "split" ? `Divide: ${s.value}` : s.id === "degree" ? `Top degree ${s.inputs[0]}, bottom degree ${s.inputs[1]}` : s.value === 0 ? "In polar form |f| ≤ (constant) × r^(p+q−2) → 0, so the limit is 0" : s.value === 1 ? "The fraction part is at most (constant) × r^(p+q−2) in polar form, so it tends to 0 and the limit is 1" : "Along y = mx the value depends on m (or grows without bound), so the limit does not exist"),
    domain: MVLX_D,
    keep: mvlxKeep,
    cap: 300,
    difficulty: ([p, q, , , s]) => (p + q === 2 ? 2 : p + q < 2 ? 1 : s ? 3 : 2),
    word: (p) => `On a heated metal plate, the temperature (in °C above the room) at a point (x, y) near a small hole at the origin is modelled by T(x, y) = ${mvlxText(p)}. Which statement about lim ((x, y) → (0, 0)) T(x, y) is true?`,
    teach: {
      idea: "A limit at a point in the plane must be the same along every way of approaching; two paths with different limits prove there is no limit.",
      method: "Try y = mx: if the result depends on m (or blows up), the limit does not exist. If the top has higher degree than the bottom, use polar coordinates to show the values shrink to 0.",
      alternatives: [
        { id: "polar", title: "Polar coordinates", kind: "procedural", text: ["Put x = r cos θ, y = r sin θ.", "If f becomes rⁿ × (something bounded) with n > 0, the limit is 0; if r cancels and θ is left, the limit does not exist."] },
      ],
    },
    limits: "Rational functions k xᵖ yᵠ/(x² + c y²), alone or plus 1, at the origin; continuity of piecewise definitions is not included.",
  },

  // ------------------------------------------------------------ growth, decay and cooling
  {
    id: "arodemod",
    arity: 4,
    title: "Growth, decay and Newton's law of cooling",
    competency: ODE,
    type: "fraction",
    mc: true,
    decimals: true,
    // [t, a, b, c]: t = 0 bacteria doubling, 1 radioactive half-life, 2 Newton cooling
    parse: none,
    reject: (p) => (odeKeep(p) ? null : "A doubling, half-life or cooling model with whole-number data."),
    prompt: ([t, a, b, c]) =>
      t === 0
        ? `A culture starts with ${500 * a} bacteria and grows at a rate proportional to the number present (dN/dt = kN). The number doubles every ${b} hours. How many bacteria are there after ${b * c} hours?`
        : t === 1
          ? `A radioactive sample decays at a rate proportional to the amount present (dA/dt = −kA). Its half-life is ${5 * b} years and it starts at ${16 * a} g. How many grams remain after ${5 * b * c} years?`
          : `By Newton's law of cooling (dT/dt = −k(T − S)), a cup of tea at ${20 + 5 * c + 16 * a}°C is left in a room at ${20 + 5 * c}°C. After 10 minutes it is at ${20 + 5 * c + 4 * a * b}°C. What is its temperature, in °C, after 20 minutes?`,
    word: ([t, a, b, c]) =>
      t === 0
        ? `In a dairy in Erode, a curd culture starts with ${500 * a} bacteria, and the number grows at a rate proportional to the number present. It doubles every ${b} hours. How many bacteria are there after ${b * c} hours?`
        : t === 1
          ? `A hospital in Vellore receives ${16 * a} g of a radioactive tracer. It decays at a rate proportional to the amount left, with a half-life of ${5 * b} years. How many grams remain after ${5 * b * c} years?`
          : `A glass of hot milk at ${20 + 5 * c + 16 * a}°C is left on a table in a room at ${20 + 5 * c}°C and cools by Newton's law of cooling. After 10 minutes it is at ${20 + 5 * c + 4 * a * b}°C. What is its temperature, in °C, after 20 minutes?`,
    solve: (p) => {
      const [t, a, b, c] = p;
      const ans = odeAns(p);
      if (t === 2) {
        const S = 20 + 5 * c;
        return {
          steps: [
            st("model", "solve", DE, [S, 16 * a], `T − ${S} = ${16 * a}e^(−kt)`),
            st("ratio", "divide", ODE, [4 * a * b, 16 * a], b / 4),
            st("square", "multiply", ODE, [b / 4], ans),
          ],
          answer: ans,
        };
      }
      return {
        steps: [
          st("model", "solve", DE, [t === 0 ? 500 * a : 16 * a], t === 0 ? `N = ${500 * a}e^(kt)` : `A = ${16 * a}e^(−kt)`),
          st("periods", "divide", ODE, [t === 0 ? b * c : 5 * b * c, t === 0 ? b : 5 * b], c),
          st("value", "multiply", ODE, [c], ans),
        ],
        answer: ans,
      };
    },
    // independent: the rate constant from the data, then the differential equation integrated numerically (Runge–Kutta)
    validate: ([t, a, b, c], v) => {
      if (typeof v !== "number") return false;
      if (t === 0) return near(v, rk4((y) => (Math.log(2) / b) * y, 500 * a, b * c), 1e-8);
      if (t === 1) return near(v, rk4((y) => (-Math.log(2) / (5 * b)) * y, 16 * a, 5 * b * c), 1e-8);
      const S = 20 + 5 * c;
      const k = Math.log((16 * a) / (4 * a * b)) / 10;
      return near(v, rk4((T) => -k * (T - S), S + 16 * a, 20), 1e-8);
    },
    bugs: ([t, a, b, c]) => {
      if (t === 0) return [bug("linear-growth", "conceptual", MODEL, `The same number was added in each ${b} hours; growth proportional to size multiplies by 2 each period, so it is ×2^${c}.`, 500 * a * (1 + c)), bug("times-2c", "procedural", ODE, `The number was multiplied by 2 × ${c} instead of by 2^${c}.`, 500 * a * 2 * c)];
      if (t === 1) return [bug("divide-2c", "procedural", ODE, `The amount was divided by 2 × ${c} instead of by 2^${c}.`, (16 * a) / (2 * c)), bug("periods-off-by-one", "procedural", ODE, `The number of half-lives was miscounted: ${5 * b * c} years is ${c} half-lives of ${5 * b} years.`, (16 * a) / 2 ** (c + 1))];
      const S = 20 + 5 * c;
      const T0 = S + 16 * a;
      const T1 = S + 4 * a * b;
      // the room-ignored value is shown only when it is a terminating decimal (a learner would not leave 3721/73)
      const ignored = (T1 * T1) / T0;
      const terminates = (() => {
        let d = ratio(ignored)[1];
        for (const q of [2, 5]) while (d % q === 0) d /= q;
        return d === 1;
      })();
      return [
        // linear cooling would take the tea to or below the room's temperature when the first drop is half or more
        bug("linear-cooling", "conceptual", MODEL, "The tea was assumed to lose the same number of degrees in each 10 minutes; it cools faster when it is hotter, so the difference from the room is multiplied by the same fraction each time.", 2 * T1 - T0 > S ? 2 * T1 - T0 : null),
        bug("room-ignored", "conceptual", MODEL, `The room temperature was ignored; it is the difference T − ${S} that shrinks by the same fraction.`, terminates ? ignored : null),
      ];
    },
    // further real slips: one period too few or too many, the increase (or the amount lost) instead of the amount, and for
    // cooling the room temperature not added back, no further cooling after 10 minutes, or half-way to the room
    distractors: ([t, a, b, c]) => {
      if (t === 0) return [500 * a * 2 ** (c - 1), 500 * a * 2 ** (c + 1), 500 * a * (2 ** c - 1)];
      if (t === 1) return [(16 * a) / 2 ** (c - 1), 16 * a - (16 * a) / 2 ** c, (16 * a) / 2 ** (c + 1)];
      const S = 20 + 5 * c;
      const T1 = S + 4 * a * b;
      return [a * b * b, T1, (T1 + S) / 2];
    },
    variants: () => [],
    explain: (s) => (s.id === "model" ? `Solving the differential equation: ${s.value}` : s.id === "periods" ? `${s.inputs[0]} is ${s.value} periods of ${s.inputs[1]}` : s.id === "ratio" ? `In 10 minutes the difference from the room is multiplied by ${s.inputs[0]}/${s.inputs[1]} = ${nf(Number(s.value))}` : s.id === "square" ? `In 20 minutes it is multiplied by that twice: T = ${nf(Number(s.value))}` : `So the answer is ${nf(Number(s.value))}`),
    domain: ODE_D,
    keep: odeKeep,
    difficulty: ([t, , , c]) => (t === 0 && c === 2 ? 1 : t === 2 ? 3 : 2),
    teach: {
      idea: "dy/dt = ky has solution y = y₀e^(kt): in equal times the quantity is multiplied by the same factor. For cooling it is the difference from the room temperature that behaves this way.",
      method: "Write the solution, use the given data (a doubling time, a half-life, a first reading) to find the factor per period, then raise it to the number of periods.",
      alternatives: [
        { id: "table", title: "A table of periods", kind: "procedural", text: ["List the time in steps of one period: 0, T, 2T, …", "Each step multiplies the quantity (or the temperature difference) by the same factor; fill in the table to the time you need."] },
      ],
    },
    limits: "Data chosen so the time is a whole number of periods; times that need logarithms and mixing (tank) problems are not included.",
  },

  // ------------------------------------------------------------ partial derivatives
  {
    id: "arpartial",
    arity: 7,
    title: "First partial derivatives of a polynomial in x and y",
    competency: PD,
    type: "expression",
    mc: true,
    // [a, m, n, b, c, p, w]: f = a xᵐyⁿ + b xᵖ + c yᵖ; w = 0 ∂/∂x, 1 ∂/∂y
    parse: none,
    reject: (p) => (pdKeep(p) ? null : "a xᵐyⁿ + b xᵖ + c yᵖ with small whole coefficients."),
    prompt: (P) => {
      const [a, m, n, b, c, p, w] = P;
      return `For f(x, y) = ${sum([[a, pw("x", m) + pw("y", n)], [b, pw("x", p)], [c, pw("y", p)]])}, find ∂f/∂${w ? "y" : "x"}.`;
    },
    word: (P) => {
      const [a, m, n, b, c, p, w] = P;
      return `A dye-works in Tiruppur models the daily output of a dye (in suitable units) as f(x, y) = ${sum([[a, pw("x", m) + pw("y", n)], [b, pw("x", p)], [c, pw("y", p)]])}, where x and y are the amounts of two chemicals used. How fast does the output change with ${w ? "y" : "x"} when only ${w ? "y" : "x"} is varied? Find ∂f/∂${w ? "y" : "x"}.`;
    },
    solve: ([a, m, n, b, c, p, w]) => {
      const ans = w ? sum([[a * n, pw("x", m) + pw("y", n - 1)], [c * p, pw("y", p - 1)]]) : sum([[a * m, pw("x", m - 1) + pw("y", n)], [b * p, pw("x", p - 1)]]);
      return {
        steps: [
          st("hold", "treat as constant", PD, [w ? "x" : "y"], w ? "x" : "y"),
          st("diff", "differentiate", DR, [w ? "y" : "x"], ans),
        ],
        answer: ans,
      };
    },
    // independent: a central difference in one variable with the other held fixed
    validate: (P, v) => {
      const f = pdF(P);
      const w = P[6];
      return matches(v, ({ x, y }) => (w ? d1((t) => f(x, t), y) : d1((t) => f(t, y), x)), XY);
    },
    bugs: ([a, m, n, b, c, p, w]) => {
      const other = w ? "x" : "y";
      const [k1, e1] = w ? [b, pw("x", p)] : [c, pw("y", p)];
      const right: [number, string][] = w ? [[a * n, pw("x", m) + pw("y", n - 1)], [c * p, pw("y", p - 1)]] : [[a * m, pw("x", m - 1) + pw("y", n)], [b * p, pw("x", p - 1)]];
      const merged = (ts: [number, string][]) => {
        const out = new Map<string, number>();
        for (const [k, e] of ts) out.set(e, (out.get(e) ?? 0) + k);
        return sum([...out].map(([e, k]) => [k, e] as [number, string]));
      };
      return [
        bug("other-differentiated", "conceptual", PD, `The term ${sum([[k1, e1]])} was differentiated too; for ∂f/∂${w ? "y" : "x"}, ${other} is held constant, so that term gives 0.`, merged([...right, [k1 * p, pw(other, p - 1)]])),
        bug("constant-kept", "conceptual", PD, `The term ${sum([[k1, e1]])} was kept as it is; a constant term has derivative 0.`, merged([...right, [k1, e1]])),
        bug("factor-dropped", "procedural", PD, `The factor ${w ? pw("x", m) : pw("y", n)} in the first term was dropped; a constant factor stays in the derivative.`, merged(w ? [[a * n, pw("y", n - 1)], [c * p, pw("y", p - 1)]] : [[a * m, pw("x", m - 1)], [b * p, pw("x", p - 1)]])),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "hold" ? `Treat ${s.value} as a constant` : `Differentiate each term with respect to ${s.inputs[0]}: ${s.value}`),
    domain: PD_D,
    keep: pdKeep,
    cap: 400,
    difficulty: ([, m, n, , , p]) => (m === 1 && n === 1 ? 1 : p === 4 || m + n >= 5 ? 3 : 2),
    teach: {
      idea: "∂f/∂x measures how f changes when only x changes: y is held fixed, so it behaves exactly like a number.",
      method: "Go term by term: a term without the variable gives 0; in a term with the variable, keep the other letters as a constant factor and use the power rule.",
      alternatives: [
        { id: "substitute", title: "Put a number in for the other letter", kind: "conceptual", text: ["For ∂f/∂x, imagine y = 2: the function becomes an ordinary function of x.", "Differentiate it, then put y back where the 2 was."] },
      ],
    },
    limits: "Polynomials with three terms; mixed and second partials, and non-polynomial functions, are not included.",
  },
  {
    id: "areuler",
    arity: 6,
    title: "Euler's theorem for a homogeneous polynomial",
    competency: PD,
    skill: "Euler's theorem",
    type: "integer",
    mc: true,
    // [d, A, B, C, u, v]: f = A xᵈ + B xᵈ⁻¹y + C yᵈ at (u, v)
    parse: none,
    reject: (p) => (eulKeep(p) ? null : "A homogeneous polynomial of degree 2–4 at a whole-number point where it is not 0."),
    prompt: ([d, A, B, C, u, v]) => `f(x, y) = ${sum([[A, pw("x", d)], [B, pw("x", d - 1) + "y"], [C, pw("y", d)]])} is a homogeneous function. Find the value of x ∂f/∂x + y ∂f/∂y at (${u}, ${nf(v)}).`,
    solve: (P) => {
      const [d, , , , u, v] = P;
      const fv = eulF(P)(u, v);
      return { steps: [st("degree", "count", PD, [d], d), st("value", "evaluate", POLY, [u, v], fv), st("euler", "multiply", PD, [d, fv], d * fv)], answer: d * fv };
    },
    // independent: both partial derivatives by central differences at the point
    validate: (P, v) => {
      const f = eulF(P);
      const [, , , , u, w] = P;
      return typeof v === "number" && near(v, u * d1((t) => f(t, w), u, 1e-4) + w * d1((t) => f(u, t), w, 1e-4), 1e-6);
    },
    bugs: (P) => {
      const [d, , , , u, v] = P;
      const f = eulF(P);
      return [
        bug("forgot-degree", "recall", PD, `The value of f itself was given; Euler's theorem says x f_x + y f_y = n f, with n = ${d} here.`, f(u, v)),
        // for degree 2, degree − 1 = 1 gives f itself, the same as forgot-degree: then only that one is listed
        ...(d > 2 ? [bug("degree-off", "recall", PD, `The degree was taken as ${d - 1}; every term here has degree ${d}.`, (d - 1) * f(u, v))] : []),
        bug("one-part", "procedural", PD, "Only x ∂f/∂x was worked out; the y ∂f/∂y part was left out.", Math.round(u * d1((t) => f(t, v), u, 1e-4))),
      ];
    },
    // further real slips: the degree counted one too high, only y ∂f/∂y, and f_x + f_y without the factors x and y
    distractors: ([d, A, B, C, u, v]) => {
      const fx = d * A * u ** (d - 1) + (d - 1) * B * u ** (d - 2) * v;
      const fy = B * u ** (d - 1) + d * C * v ** (d - 1);
      return [(d + 1) * eulF([d, A, B, C])(u, v), v * fy, fx + fy];
    },
    variants: () => [],
    explain: (s) => (s.id === "degree" ? `Every term has degree ${s.value}` : s.id === "value" ? `f(${s.inputs[0]}, ${nf(Number(s.inputs[1]))}) = ${s.value}` : `By Euler's theorem, x f_x + y f_y = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: EUL_D,
    keep: eulKeep,
    cap: 300,
    difficulty: ([d, , B]) => (d === 2 && B === 0 ? 1 : d <= 3 ? 2 : 3),
    teach: {
      idea: "If every term of f has degree n, scaling (x, y) by t scales f by tⁿ; differentiating that at t = 1 gives x f_x + y f_y = n f.",
      method: "Check the degree of each term, work out f at the point, and multiply by the degree. (Working out both partial derivatives directly gives the same number.)",
      alternatives: [
        { id: "direct", title: "Work it out directly", kind: "procedural", text: ["Find f_x and f_y, put in the point, and form x f_x + y f_y.", "Compare with n f: they agree, which is Euler's theorem in action."] },
      ],
    },
    limits: "Values at a point for homogeneous polynomials of degree 2–4; proving Euler's theorem or the equality of mixed partials is written work for an educator.",
  },

  // ------------------------------------------------------------ partial fractions
  {
    id: "arpfint",
    arity: 4,
    title: "Integrating by partial fractions (two linear factors)",
    competency: PF,
    type: "antiderivative",
    mc: true,
    // [a, b, A, B]: ∫ [A/(x − a) + B/(x − b)] dx, written as one fraction over x² − (a+b)x + ab
    parse: none,
    reject: (p) => (pfKeep(p) ? null : "A proper fraction over (x − a)(x − b), a < b, with whole-number partial-fraction constants."),
    prompt: (p) => {
      const { num, den } = pfParts(p);
      return `Find ∫ ${/x/.test(num) ? `(${num})` : num}/(${den}) dx.`;
    },
    word: (p) => {
      const { num, den } = pfParts(p);
      return `In a water-flow model, the rate at which a quantity F changes with x is F′(x) = ${/x/.test(num) ? `(${num})` : num}/(${den}). Find F(x) (up to an added constant).`;
    },
    solve: (p) => {
      const [a, b, A, B] = p;
      const { den, ans } = pfParts(p);
      return {
        steps: [
          st("factor", "factorise", QUAD, [den], `(${lin1(a)})(${lin1(b)})`),
          st("split", "partial fractions", PF, [A, B], `${A}/(${lin1(a)}) + ${B}/(${lin1(b)})`),
          st("integrate", "integrate", IND, [], ans),
        ],
        answer: ans,
      };
    },
    // independent: the derivative of the answer (central differences) equals the integrand away from a and b
    validate: ([a, b, A, B], v) => {
      if (typeof v !== "string") return false;
      const n = node(stripC(v));
      if (!n) return false;
      const integrand = (x: number) => ((A + B) * x - (A * b + B * a)) / ((x - a) * (x - b));
      let ok = 0;
      for (const x of [-5.3, -3.6, -2.55, -1.45, 0.55, 2.35, 4.65, 6.2]) {
        if (Math.abs(x - a) < 0.25 || Math.abs(x - b) < 0.25) continue;
        const der = d1((t) => ev(n, { x: t }), x);
        if (!Number.isFinite(der) || Math.abs(der - integrand(x)) > 1e-5 * Math.max(1, Math.abs(integrand(x)))) return false;
        ok++;
      }
      return ok >= 4;
    },
    bugs: (p) => {
      const [a, b, A, B] = p;
      const { den } = pfParts(p);
      return [
        bug("log-of-denominator", "conceptual", IND, `The answer ln|${den}| was used; that is only right when the top is exactly the derivative of the bottom. Split into partial fractions first.`, `ln|${den}| + C`),
        bug("swapped-constants", "procedural", PF, "The two partial-fraction constants were attached to the wrong factors.", pfTwo(B, a, A, b)),
        bug("cover-up-sign", "procedural", PF, "One partial-fraction constant came out with the wrong sign; check by adding the fractions back together.", pfTwo(A, a, -B, b)),
      ];
    },
    distractors: ([a, b, A, B]) => [pfTwo(A + B, a, -B, b), `${lnT(A, lin1(a))} + C`],
    variants: () => [],
    explain: (s) => (s.id === "factor" ? `Factorise the denominator: ${s.value}` : s.id === "split" ? `Split into partial fractions: ${s.value}` : `Integrate each part: ∫ dx/(x − a) = ln|x − a|, so the answer is ${s.value}`),
    domain: PF_D,
    keep: pfKeep,
    cap: 400,
    difficulty: ([a, , A, B]) => (A > 0 && B > 0 && a >= 0 ? 1 : A > 0 || B > 0 ? 2 : 3),
    teach: {
      idea: "A fraction over (x − a)(x − b) is a sum A/(x − a) + B/(x − b), and each of those integrates to a logarithm.",
      method: "Factorise the denominator; find A by covering (x − a) and putting x = a in what is left, and B likewise; integrate to A ln|x − a| + B ln|x − b| + C.",
      alternatives: [
        { id: "compare", title: "Compare coefficients", kind: "procedural", text: ["Write px + q = A(x − b) + B(x − a).", "Match the x terms and the constant terms to get two equations for A and B."] },
      ],
    },
    limits: "Two distinct linear factors with whole-number constants; repeated and quadratic factors, and improper fractions, are not included.",
  },

  // ------------------------------------------------------------ reduction formulae
  {
    id: "arwallis",
    arity: 3,
    title: "∫ sinᵐx cosⁿx over [0, π/2] or [0, π] by reduction formulae",
    competency: RED,
    type: "expression",
    mc: true,
    // [m, n, r]: r = 0 over [0, π/2], r = 1 over [0, π] (n even)
    parse: none,
    reject: (p) => (redKeep(p) ? null : "Powers of sin and cos up to 8 (total at least 2); over [0, π] only with an even power of cos."),
    prompt: (p) => `Evaluate ∫ from 0 to ${p[2] ? "π" : "π/2"} of ${redIntegrand(p)} dx.`,
    word: (p) => `In an electronics lab, the energy delivered by a signal over ${p[2] ? "half a cycle" : "a quarter of a cycle"} is given (in joules) by ∫ from 0 to ${p[2] ? "π" : "π/2"} of ${redIntegrand(p)} dx. Find this energy.`,
    solve: (p) => {
      const [m, n, r] = p;
      const half = wallis(m, n);
      const ans = redStr(redVal(p));
      const steps = [st("reduce", "reduction formula", RED, [m, n], redStr(half))];
      if (r) steps.push(st("double", "symmetry", DEF, [redStr(half)], ans));
      return { steps, answer: ans };
    },
    // independent: Simpson's rule
    validate: ([m, n, r], v) => {
      const S = simpson((x) => Math.sin(x) ** m * Math.cos(x) ** n, 0, r ? Math.PI : Math.PI / 2);
      const x = constOf(v);
      return Number.isFinite(x) && near(x, S, 1e-8);
    },
    bugs: (p) => {
      const [m, n, r] = p;
      const [N, D, pi] = redVal(p);
      return [
        pi
          ? bug("pi-forgotten", "recall", RED, "When both powers are even, the reduction ends at ∫ 1 dx over [0, π/2], which is π/2; that factor was left out.", rat(2 * N, D))
          : bug("pi-added", "recall", RED, "A factor π/2 was put in; it appears only when both powers are even, and here the reduction ends at ∫ sin x dx or ∫ cos x dx, which is 1.", piQ(N, 2 * D)),
        ...(r ? [bug("no-doubling", "procedural", DEF, "The value over [0, π/2] was given; over [0, π] the integral is twice that (the graph is symmetric about x = π/2).", redStr(wallis(m, n)))] : []),
      ];
    },
    distractors: (p) => {
      const w = redVal(p);
      return [redStr(scaleW(w, 2, 1)), redStr(scaleW(w, 1, 2))];
    },
    variants: () => [],
    explain: (s) => (s.id === "reduce" ? `Lower the powers two at a time, Iₘ,ₙ = (m − 1)/(m + n) Iₘ₋₂,ₙ (and the same for n): over [0, π/2] the value is ${s.value}` : `Over [0, π] it is twice that: ${s.value}`),
    domain: RED_D,
    keep: redKeep,
    difficulty: ([m, n, r]) => (m === 0 || n === 0 ? (r ? 2 : 1) : r || m + n >= 8 ? 3 : 2),
    teach: {
      idea: "Integrating by parts once gives a formula that lowers a power by 2: ∫₀^{π/2} sinⁿx dx = ((n − 1)/n) ∫₀^{π/2} sinⁿ⁻²x dx, ending at π/2 (power 0) or 1 (power 1).",
      method: "Multiply the fractions (n − 1)/n, (n − 3)/(n − 2), … down to 1/2 or 2/3; include π/2 only when every power is even. For sinᵐ cosⁿ, the denominators are m + n, m + n − 2, ….",
      alternatives: [
        { id: "double_factorial", title: "The double-factorial pattern", kind: "procedural", text: ["Write (m − 1)(m − 3)… × (n − 1)(n − 3)… over (m + n)(m + n − 2)…, each down to 1 or 2.", "Multiply by π/2 when m and n are both even."] },
      ],
    },
    limits: "Powers up to 8 over [0, π/2], and over [0, π] with an even power of cos; reduction formulae for tan, sec or eˣxⁿ are not included.",
  },

  // ------------------------------------------------------------ Maclaurin series
  {
    id: "armaclaurin",
    arity: 3,
    title: "A coefficient in a Maclaurin series",
    competency: TAY,
    type: "fraction",
    mc: true,
    // [f, a, k]: coefficient of xᵏ in e^(ax), sin(ax), cos(ax), ln(1 + ax), 1/(1 − ax)
    parse: none,
    reject: (p) => (tayKeep(p) ? null : "e^(ax), sin(ax), cos(ax), ln(1 + ax) or 1/(1 − ax), a non-zero coefficient of x² to x⁶."),
    prompt: (p) => `Find the coefficient of ${pw("x", p[2])} in the Maclaurin series of ${tayName(p)}.`,
    word: (p) => `A calculator works out ${tayName(p)} for small x by adding up the first terms of its Maclaurin series. What coefficient does it use for the ${pw("x", p[2])} term?`,
    solve: (p) => {
      const [f, a, k] = p;
      const general = ["xⁿ/n!", "(−1)ʳ x²ʳ⁺¹/(2r + 1)!", "(−1)ʳ x²ʳ/(2r)!", "(−1)ⁿ⁺¹ xⁿ/n", "xⁿ"][f];
      return { steps: [st("series", "recall", SER, [f], general), st("substitute", "substitute", TAY, [a, k], tayCoef(p))], answer: tayCoef(p) };
    },
    // independent: the Cauchy integral formula, as a trapezoidal sum of the function round a circle in the complex plane
    validate: ([f, a, k], v) => {
      if (typeof v !== "number") return false;
      const F = [(z: C) => cexp(cmul([a, 0], z)), (z: C) => csin(cmul([a, 0], z)), (z: C) => ccos(cmul([a, 0], z)), (z: C) => clog([1 + a * z[0], a * z[1]]), (z: C) => cdiv([1, 0], [1 - a * z[0], -a * z[1]])][f];
      return near(v, cauchyCoef(F, k, f >= 3 ? 0.5 / Math.abs(a) : 1), 1e-9);
    },
    bugs: (p) => {
      const [f, a, k] = p;
      const c = tayCoef(p);
      const fk = fact(k);
      if (f === 0) return [bug("no-factorial", "recall", SER, `The ${k}! in the denominator was left out: eᵘ = Σ uⁿ/n!.`, a ** k), bug("no-power", "procedural", TAY, `Only 1/${k}! was given; with u = ${ax(a)}, the term is (${ax(a)})${sup(k)}/${k}!, which includes ${nf(a)}${sup(k)}.`, 1 / fk), bug("log-series", "recall", SER, `The term was divided by ${k} (as in the series for ln(1 + x)) instead of by ${k}!.`, a ** k / k)];
      if (f === 1 || f === 2) return [bug("sign-pattern", "recall", SER, `The signs in the ${f === 1 ? "sine" : "cosine"} series alternate (+, −, +, …); this term's sign was missed.`, Math.abs(c)), bug("no-factorial", "recall", SER, `The ${k}! in the denominator was left out.`, c * fk)];
      if (f === 3) return [bug("factorial", "recall", SER, `The term was divided by ${k}! (as in the series for eˣ) instead of by ${k}.`, c / fk * k), bug("sign-pattern", "recall", SER, "The series for ln(1 + u) alternates in sign: u − u²/2 + u³/3 − …; this term's sign was missed.", -c)];
      return [bug("factorial", "recall", SER, `The term was divided by ${k}!; the geometric series 1 + u + u² + … has no factorials.`, c / fk), bug("sign-of-a", "procedural", TAY, `The sign of u = ${ax(a)} was dropped before raising it to the power ${k}.`, Math.abs(a) ** k)];
    },
    // further real slips: a raised to the power k − 1 instead of k, and the opposite sign
    distractors: (p) => {
      const c = tayCoef(p);
      return [c / p[1], -c, c * p[1]];
    },
    variants: () => [],
    explain: (s) => (s.id === "series" ? `The general term of the standard series is ${s.value}` : `Put u = ${ax(Number(s.inputs[0]))} and pick out the ${pw("x", Number(s.inputs[1]))} term: its coefficient is ${nf(Number(s.value))}`),
    domain: TAY_D,
    keep: tayKeep,
    difficulty: ([f, a, k]) => (f === 4 || (f === 0 && a > 0 && k <= 3) ? 1 : a < 0 || k >= 5 ? 3 : 2),
    teach: {
      idea: "A Maclaurin series writes f(x) = Σ f⁽ⁿ⁾(0) xⁿ/n!; for standard functions the pattern is known, and replacing x by ax multiplies the xⁿ term by aⁿ.",
      method: "Write the standard series in u, put u = ax, and read off the xᵏ term: a power of a, the right sign, and the right denominator (k! for eˣ, sin, cos; k for ln; none for 1/(1 − u)).",
      alternatives: [
        { id: "derivatives", title: "From the derivatives", kind: "procedural", text: ["Differentiate f k times and put x = 0.", "Divide by k!: that is the coefficient of xᵏ."] },
      ],
    },
    limits: "Five standard functions with u = ax and powers x² to x⁶; products, quotients and Taylor series about other points are not included.",
  },

  // ------------------------------------------------------------ volumes of revolution
  {
    id: "arvolrev",
    arity: 3,
    title: "Volume of a solid of revolution",
    competency: VOL,
    type: "expression",
    mc: true,
    // [f, a, b]: y = √(ax), y = ax, y = ax² on [0, b] about the x-axis; y = ax², 0 ≤ y ≤ b about the y-axis
    parse: none,
    reject: (p) => (volKeep(p) ? null : "A region under √(ax), ax or ax² about the x-axis, or beside y = ax² about the y-axis."),
    prompt: ([f, a, b]) =>
      f === 3
        ? `The region bounded by y = ${coef(a)}x² (x ≥ 0), the y-axis and the line y = ${b} is rotated through 360° about the y-axis. Find the volume of the solid formed, in cubic units, in terms of π.`
        : `The region bounded by y = ${f === 0 ? `√(${ax(a)})` : f === 1 ? ax(a) : `${coef(a)}x²`}, the x-axis and the line x = ${b} is rotated through 360° about the x-axis. Find the volume of the solid formed, in cubic units, in terms of π.`,
    word: ([f, a, b]) =>
      f === 3
        ? `A brass bowl is made by turning, on a lathe, the region bounded by y = ${coef(a)}x² (x ≥ 0), the y-axis and the line y = ${b} through 360° about the y-axis (units in cm). Find the volume of brass, in cm³, in terms of π.`
        : `A wooden ${f === 1 ? "cone-shaped top" : "vase-shaped piece"} is made in Channapatna by turning the region bounded by y = ${f === 0 ? `√(${ax(a)})` : f === 1 ? ax(a) : `${coef(a)}x²`}, the x-axis and the line x = ${b} through 360° about the x-axis (units in cm). Find its volume, in cm³, in terms of π.`,
    solve: (p) => {
      const [f, a, b] = p;
      const ans = piStr(volR(p));
      const sq = f === 0 ? `${ax(a)}` : f === 1 ? `${a * a === 1 ? "" : a * a}x²` : f === 2 ? `${a * a === 1 ? "" : a * a}x⁴` : `y/${a}`;
      return {
        steps: [
          st("square", "square", VOL, [f], sq),
          st("integrate", "integrate", DEF, [sq, f === 3 ? "y" : "x", 0, b], ans),
        ],
        answer: ans,
      };
    },
    // independent: Simpson's rule on discs (about the x-axis), or cylindrical shells (about the y-axis)
    validate: ([f, a, b], v) => {
      const x = constOf(v);
      if (!Number.isFinite(x)) return false;
      const y = [(t: number) => Math.sqrt(a * t), (t: number) => a * t, (t: number) => a * t * t][f];
      const V = f === 3 ? 2 * Math.PI * simpson((t) => t * (b - a * t * t), 0, Math.sqrt(b / a)) : Math.PI * simpson((t) => y(t) ** 2, 0, b);
      return near(x, V, 1e-8);
    },
    bugs: (p) => {
      const [f, a, b] = p;
      const R = volR(p);
      const notSq = (): string => {
        if (f === 0) {
          const [k, m] = sqf(a * b ** 3);
          return surdC(2 * k, 3, m, "π");
        }
        if (f === 1) return piStr((a * b * b) / 2);
        if (f === 2) return piStr((a * b ** 3) / 3);
        const [k, m] = sqf(b ** 3 * a);
        return surdC(2 * k, 3 * a, m, "π");
      };
      return [
        bug("no-pi", "recall", VOL, "The factor π was left out: each thin slice is a disc of area πr².", nf(R)),
        bug("not-squared", "conceptual", VOL, `The radius was integrated instead of its square; a disc's area is π${f === 3 ? "x" : "y"}², so V = π∫${f === 3 ? "x² dy" : "y² dx"}.`, notSq()),
      ];
    },
    distractors: (p) => [piStr(2 * volR(p)), piStr(volR(p) / 2)],
    variants: () => [],
    explain: (s) => (s.id === "square" ? `Square the radius of a slice: ${s.inputs[0] === 3 ? "x²" : "y²"} = ${s.value}` : `V = π∫ from ${s.inputs[2]} to ${s.inputs[3]} of ${s.inputs[0]} d${s.inputs[1]} = ${s.value}`),
    domain: VOL_D,
    keep: volKeep,
    difficulty: ([f]) => (f === 1 ? 1 : f === 3 ? 3 : 2),
    teach: {
      idea: "Cut the solid into thin discs perpendicular to the axis: a disc of radius r and thickness dx has volume πr² dx, so the volume is π∫ r² dx.",
      method: "Write the radius of a slice in terms of the variable along the axis (y for the x-axis, x for the y-axis), square it, integrate over the range and keep π.",
      alternatives: [
        { id: "shells", title: "Cylindrical shells", kind: "procedural", text: ["For a rotation about the y-axis, slice the region into thin vertical strips at distance x.", "Each strip sweeps a shell of volume 2πx × (height) × dx; add them up: V = 2π∫ x × height dx."] },
      ],
    },
    limits: "Regions under a single curve starting at 0; regions between two curves (washers) are not included.",
  },

  // ------------------------------------------------------------ improper and gamma integrals
  {
    id: "argamma",
    arity: 3,
    title: "Improper integrals and the gamma integral",
    competency: IMPG,
    type: "expression",
    mc: true,
    // [t, u, v]: ∫₀^∞ xᵘe^(−vx); ∫ᵥ^∞ dx/xᵘ; ∫₀^∞ dx/(x² + v²); ∫₀^∞ e^(−ux) sin vx; ∫₀^∞ e^(−ux) cos vx
    parse: none,
    reject: (p) => (gamKeep(p) ? null : "One of five standard improper integrals with small whole parameters."),
    prompt: ([t, u, v]) =>
      t === 0
        ? `Evaluate ∫ from 0 to ∞ of ${u === 0 ? "" : `${pw("x", u)} `}e^(−${ax(v)}) dx.${u >= 2 ? " (You may use Γ(n + 1) = n!.)" : ""}`
        : t === 1
          ? `Evaluate ∫ from ${v} to ∞ of 1/${pw("x", u)} dx.`
          : t === 2
            ? `Evaluate ∫ from 0 to ∞ of 1/(x² + ${v * v}) dx.`
            : `Evaluate ∫ from 0 to ∞ of e^(−${ax(u)}) ${t === 3 ? "sin" : "cos"} ${ax(v)} dx.`,
    word: ([t, u, v]) =>
      t === 0
        ? `After a dose, a medicine enters a patient's blood at the rate ${u === 0 ? "" : `${pw("t", u)} `}e^(−${ax(v, "t")}) mg per hour, t hours later. Treating the time as unlimited, find the total amount absorbed, ∫ from 0 to ∞ of the rate dt, in mg.`
        : t === 1
          ? `A small probe is pulled away from a planet against a force of 1/${pw("x", u)} units at distance x. Find the total work needed to move it from x = ${v} out to infinity, ∫ from ${v} to ∞ of 1/${pw("x", u)} dx.`
          : t === 2
            ? `A street lamp hangs ${v} m above the middle of a very long straight road. The light reaching the road at a distance x along it is modelled by 1/(x² + ${v * v}). Find the total light falling on one side of the road, ∫ from 0 to ∞ of 1/(x² + ${v * v}) dx.`
            : `The voltage across a damped circuit t seconds after it is switched on is V(t) = e^(−${ax(u, "t")}) ${t === 3 ? "sin" : "cos"} ${ax(v, "t")} volts. Find the area under the voltage–time graph over all time, ∫ from 0 to ∞ of V(t) dt.`,
    solve: (p) => {
      const [t] = p;
      const ans = gamAns(p);
      const how = ["the gamma integral ∫₀^∞ xⁿe^(−ax) dx = n!/aⁿ⁺¹", "the antiderivative, then the limit as the upper end → ∞", "the antiderivative (1/a) tan⁻¹(x/a), and tan⁻¹ → π/2", "integration by parts twice (or the standard result)", "integration by parts twice (or the standard result)"][t];
      return { steps: [st("method", "integrate", IM, [how], ans), st("limit", "limit", LIM, [], ans)], answer: ans };
    },
    // independent: Simpson's rule after mapping [lo, ∞) onto [0, 1)
    validate: (p, v) => {
      const [t, , w] = p;
      const h = gamH(p);
      const lo = t === 1 ? w : 0;
      const S = simpson((s) => ((q: number) => h(lo + q / (1 - q)) / (1 - q) ** 2)(Math.min(s, 1 - 1e-9)), 0, 1, 4000);
      const x = constOf(v);
      return Number.isFinite(x) && near(x, S, 1e-7);
    },
    bugs: ([t, u, v]) => {
      if (t === 0) return [bug("power-one-short", "recall", IMPG, `The power of ${v} was taken as ${u}; the gamma integral gives n!/aⁿ⁺¹, so it is ${v}${sup(u + 1)}.`, rat(fact(u), v ** u)), ...(u >= 1 ? [bug("gamma-shift", "recall", IMPG, `Γ(${u}) = ${u - 1}! was used; here ∫ xⁿe^(−ax) dx needs Γ(n + 1) = n!.`, rat(fact(u - 1), v ** u))] : [])];
      if (t === 1) return [bug("lower-limit-ignored", "procedural", DEF, `The lower limit was treated as 1 (or ignored); put x = ${v} into the antiderivative.`, rat(1, u - 1)), bug("sign", "procedural", DEF, "The antiderivative was evaluated as (value at the bottom) − (value at the top limit); it is top − bottom, and the top value tends to 0.", rat(-1, (u - 1) * v ** (u - 1)))];
      if (t === 2) return [bug("half-missing", "recall", IND, "tan⁻¹ x tends to π/2 as x → ∞, not π.", piStr(1 / v)), bug("a-missing", "recall", IND, `∫ dx/(x² + a²) = (1/a) tan⁻¹(x/a); the factor 1/${v} was missed.`, piStr(1 / 2))];
      return [bug("sin-cos-swapped", "recall", IM, `The results for sin and cos were swapped: ∫₀^∞ e^(−ax) sin bx dx = b/(a² + b²) and with cos it is a/(a² + b²).`, t === 3 ? rat(u, u * u + v * v) : rat(v, u * u + v * v)), bug("minus-in-denominator", "procedural", IM, "The denominator came out as a² − b²; integrating by parts twice gives a² + b².", u === v ? null : t === 3 ? rat(v, u * u - v * v) : rat(u, u * u - v * v))];
    },
    distractors: (p) => {
      const x = constOf(gamAns(p));
      return p[0] === 2 ? [piStr(1 / (4 * p[2])), piStr(2 / p[2])] : [nf(2 * x), rat(...ratio(x / 2))];
    },
    variants: () => [],
    explain: (s) => (s.id === "method" ? `Use ${s.inputs[0]}` : `The integral converges to ${s.value}`),
    domain: GAM_D,
    keep: gamKeep,
    difficulty: ([t, u]) => (t === 1 || t === 2 ? 1 : t === 0 && u <= 2 ? 2 : 3),
    teach: {
      idea: "An integral to ∞ means the limit of the integral to b as b → ∞; when the integrand dies away fast enough, that limit is a finite number. The gamma integral Γ(n + 1) = ∫₀^∞ xⁿe^(−x) dx = n! packages repeated integration by parts.",
      method: "Find the antiderivative (or use Γ(n + 1)/aⁿ⁺¹ for ∫ xⁿe^(−ax)), evaluate from the lower end to b, and let b → ∞.",
      alternatives: [
        { id: "by_parts", title: "Integration by parts, step by step", kind: "procedural", text: ["For ∫₀^∞ xⁿe^(−ax) dx, integrate by parts once: it becomes (n/a) × ∫₀^∞ xⁿ⁻¹e^(−ax) dx.", "Repeat down to ∫₀^∞ e^(−ax) dx = 1/a."] },
      ],
    },
    limits: "Five standard convergent forms with small whole parameters; divergent integrals and Γ at half-integers are not included.",
  },

  // ------------------------------------------------------------ conics
  {
    id: "arcircle",
    arity: 4,
    title: "Centre and radius of a circle from its general equation",
    competency: CON,
    skill: "circle: centre and radius",
    type: "tuple",
    mc: true,
    // [s, h, k, R]: s(x² + y²) − 2hs x − 2ks y + s(h² + k² − R) = 0, centre (h, k), radius √R
    parse: none,
    reject: (p) => (inDom(p, CIRC_D) ? null : "A circle with a whole-number centre, r² up to 30, and the equation possibly multiplied by 2 or 3."),
    prompt: (p) => `Find the centre and the radius of the circle ${circEq(p)}. Write them as (h, k, r), where (h, k) is the centre and r is the radius.`,
    solve: ([s, h, k, R]) => {
      const ans = tup(h, k, rootOver(R, 1));
      const steps: Step[] = [];
      if (s > 1) steps.push(st("divide", "divide", POLY, [s], `x² + y² ${sum([[-2 * h, "x"], [-2 * k, "y"], [h * h + k * k - R, ""]]).replace(/^(?!−)/, "+ ").replace(/^−/, "− ")} = 0`));
      steps.push(st("centre", "complete the square", CON, [-h, -k], tup(h, k)));
      steps.push(st("radius", "evaluate", RAD, [h * h + k * k, h * h + k * k - R], rootOver(R, 1)));
      return { steps, answer: ans };
    },
    // independent: three points of the answer's circle substituted into the given equation
    validate: ([s, h, k, R], v) => {
      const t = tupleNums(v, 3);
      if (!t || t[2] <= 0) return false;
      const E = (x: number, y: number) => s * x * x + s * y * y - 2 * h * s * x - 2 * k * s * y + s * (h * h + k * k - R);
      return [0.3, 2.1, 4.0].every((th) => Math.abs(E(t[0] + t[2] * Math.cos(th), t[1] + t[2] * Math.sin(th))) < 1e-7 * s * (1 + R + h * h + k * k));
    },
    bugs: ([s, h, k, R]) => {
      const c = h * h + k * k - R;
      const r2 = 2 * (h * h + k * k) - R;
      const sr2 = s * s * (h * h + k * k) - s * c;
      return [
        bug("centre-sign", "procedural", CON, "The centre was read with the wrong signs: x² + y² + 2gx + 2fy + c = 0 has centre (−g, −f).", h === 0 && k === 0 ? null : tup(-h, -k, rootOver(R, 1))),
        bug("constant-sign", "procedural", CON, "The constant term was added instead of subtracted: r = √(g² + f² − c).", r2 > 0 ? tup(h, k, rootOver(r2, 1)) : null),
        bug("not-divided", "procedural", CON, `The equation was not divided by ${s} first; the x² and y² coefficients must be 1 before reading off g, f and c.`, s > 1 && sr2 > 0 ? tup(h * s, k * s, rootOver(sr2, 1)) : null),
        bug("radius-squared", "procedural", CON, "r² was given instead of r.", R === 1 ? null : tup(h, k, R)),
      ];
    },
    distractors: ([, h, k, R]) => [tup(k, h, rootOver(R, 1)), tup(2 * h, 2 * k, rootOver(R, 1))],
    variants: () => [],
    explain: (s) => (s.id === "divide" ? `Divide by ${s.inputs[0]}: ${s.value}` : s.id === "centre" ? `Compare with x² + y² + 2gx + 2fy + c = 0: g = ${nf(Number(s.inputs[0]))}, f = ${nf(Number(s.inputs[1]))}, so the centre is (−g, −f) = ${s.value}` : `r = √(g² + f² − c) = √(${s.inputs[0]} − (${nf(Number(s.inputs[1]))})) = ${s.value}`),
    domain: CIRC_D,
    cap: 400,
    difficulty: ([s, , , R]) => (s === 1 && Number.isInteger(Math.sqrt(R)) ? 1 : s === 1 ? 2 : 3),
    word: (p) => `On a coordinate plan of a park (in metres), the edge of a circular fountain is ${circEq(p)}. Give the centre and the radius of the fountain as (h, k, r).`,
    teach: {
      idea: "Completing the square turns x² + y² + 2gx + 2fy + c = 0 into (x + g)² + (y + f)² = g² + f² − c: a circle with centre (−g, −f) and radius √(g² + f² − c).",
      method: "Make the x² and y² coefficients 1 by dividing; halve the x and y coefficients to get g and f; the centre is (−g, −f); r = √(g² + f² − c).",
      alternatives: [
        { id: "complete_square", title: "Complete the square directly", kind: "procedural", text: ["Group the x terms and the y terms: (x² − 4x) + (y² + 6y) = −c.", "Add the squares of half the coefficients to both sides: (x − 2)² + (y + 3)² = 4 + 9 − c."] },
      ],
    },
    limits: "Circles with whole-number centres and r² up to 30; circles through three points or tangent conditions are not included.",
  },
  {
    id: "arparabola",
    arity: 5,
    title: "The focus of a parabola",
    competency: CON,
    skill: "parabola: focus",
    type: "tuple",
    mc: true,
    // [o, sg, N, h, k]: (y − k)² = ±N(x − h) (o = 0) or (x − h)² = ±N(y − k) (o = 1)
    parse: none,
    reject: (p) => (inDom(p, PARA_D) ? null : "A parabola (y − k)² = ±N(x − h) or (x − h)² = ±N(y − k) with N up to 16."),
    prompt: (p) => `Find the coordinates of the focus of the parabola ${paraEq(p)}.`,
    solve: (p) => {
      const [o, sg, N, h, k] = p;
      const a = (sg ? -N : N) / 4;
      const F = paraFocus(p);
      return {
        steps: [
          st("vertex", "read", CON, [h, k], tup(h, k)),
          st("a", "divide", CON, [sg ? -N : N, 4], a),
          st("focus", "add", CON, [o], tup(...F)),
        ],
        answer: tup(...F),
      };
    },
    // independent: the focus–directrix property at several points of the parabola
    validate: ([o, sg, N, h, k], v) => {
      const F = tupleNums(v, 2);
      if (!F) return false;
      const s = sg ? -1 : 1;
      return [-3, -1.2, 0.7, 2.5].every((t) => {
        // a point on the curve, written along (X) and across (Y) the axis
        const [X, Y] = o === 0 ? [h + (s * t * t) / N, k + t] : [h + t, k + (s * t * t) / N];
        const dist = Math.hypot(X - F[0], Y - F[1]);
        const toDirectrix = o === 0 ? Math.abs(X - (2 * h - F[0])) : Math.abs(Y - (2 * k - F[1]));
        return Math.abs(dist - toDirectrix) < 1e-9 * (1 + dist);
      });
    },
    bugs: (p) => {
      const [o, sg, N, h, k] = p;
      const s = sg ? -N : N;
      return [
        bug("no-quarter", "recall", CON, `The number ${N} was used as the focal distance; ${coef(s)}${N}·x means 4a = ${s}, so a = ${nf(s / 4)}.`, o === 0 ? tup(h + s, k) : tup(h, k + s)),
        bug("wrong-axis", "conceptual", CON, `The focus was put on the wrong axis; the parabola opens along the ${o === 0 ? "x" : "y"}-direction (the variable that is not squared).`, o === 0 ? tup(h, k + s / 4) : tup(h + s / 4, k)),
        bug("vertex-sign", "procedural", CON, "The vertex was read with the wrong signs: (x − h) means the vertex has x = h.", h === 0 && k === 0 ? null : o === 0 ? tup(-h + s / 4, -k) : tup(-h, -k + s / 4)),
        bug("direction-sign", "procedural", CON, "The parabola was taken to open the other way; the sign in front of the linear side gives the direction.", o === 0 ? tup(h - s / 4, k) : tup(h, k - s / 4)),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "vertex" ? `The vertex is ${s.value}` : s.id === "a" ? `4a = ${nf(Number(s.inputs[0]))}, so a = ${nf(Number(s.value))}` : `Move a units from the vertex along the axis: the focus is ${s.value}`),
    domain: PARA_D,
    cap: 300,
    difficulty: ([, sg, N, h, k]) => (h === 0 && k === 0 && N % 4 === 0 && !sg ? 1 : h === 0 && k === 0 ? 2 : 3),
    word: (p) => `The cross-section of a torch reflector is the parabola ${paraEq(p)} (in cm). The bulb must sit at the focus. Give the coordinates of the bulb's position.`,
    teach: {
      idea: "y² = 4ax is the set of points as far from the focus (a, 0) as from the directrix x = −a; shifting the vertex to (h, k) shifts the focus by the same amount.",
      method: "Read the vertex (h, k); set the coefficient of the linear bracket equal to 4a; move a from the vertex along the axis (the direction of the unsquared variable, the sign of a giving the way).",
      alternatives: [
        { id: "translate", title: "Shift to the origin", kind: "procedural", text: ["Put X = x − h and Y = y − k: the equation becomes Y² = 4aX (or X² = 4aY).", "Its focus is (a, 0) in X, Y; add (h, k) back."] },
      ],
    },
    limits: "Parabolas with axes parallel to the coordinate axes; directrix, latus rectum and parabolas from focus–directrix data are not asked here.",
  },
  {
    id: "areccentric",
    arity: 4,
    title: "Eccentricity of an ellipse or a hyperbola",
    competency: CON,
    skill: "ellipse and hyperbola: eccentricity",
    type: "exact",
    mc: true,
    // [kind, a, b, s]: x²/a² ± y²/b² = 1 (s = 0) or cleared of fractions (s = 1)
    parse: none,
    reject: (p) => (eccKeep(p) ? null : "x²/a² + y²/b² = 1 (a ≠ b) or x²/a² − y²/b² = 1 with a, b up to 6."),
    prompt: (p) => `Find the eccentricity of the ${p[0] ? "hyperbola" : "ellipse"} ${eccEq(p)}.`,
    solve: (p) => {
      const [kind, a, b, s] = p;
      const [A, B] = kind ? [a, b] : [Math.max(a, b), Math.min(a, b)];
      const c2 = kind ? a * a + b * b : A * A - B * B;
      const steps: Step[] = [];
      if (s) steps.push(st("standard", "divide", POLY, [a * a * b * b], eccEq([kind, a, b, 0])));
      steps.push(st("axes", "read", CON, [A, B], kind ? `a = ${a}, b = ${b}` : `semi-major axis ${A}${a < b ? " (along the y-axis)" : ""}, semi-minor axis ${B}`));
      steps.push(st("c", "evaluate", CON, [kind ? "+" : "−"], `c² = ${kind ? `${a * a} + ${b * b}` : `${A * A} − ${B * B}`} = ${c2}`));
      steps.push(st("e", "divide", RAD, [c2, A], eccAns(p)));
      return { steps, answer: eccAns(p) };
    },
    // independent: the foci placed at distance e × (semi-axis) and the focal-distance property checked at points of the curve
    validate: ([kind, a, b], v) => {
      const e = constOf(v);
      if (!Number.isFinite(e) || e <= 0) return false;
      if (kind) {
        const c = e * a;
        return [0.3, -0.8, 1.4].every((u) => {
          const [x, y] = [a * Math.cosh(u), b * Math.sinh(u)];
          return Math.abs(Math.abs(Math.hypot(x - c, y) - Math.hypot(x + c, y)) - 2 * a) < 1e-9;
        });
      }
      const A = Math.max(a, b);
      const c = e * A;
      return [0.4, 1.3, 2.2, 3.7].every((t) => {
        const [x, y] = [a * Math.cos(t), b * Math.sin(t)];
        const d = a > b ? Math.hypot(x - c, y) + Math.hypot(x + c, y) : Math.hypot(x, y - c) + Math.hypot(x, y + c);
        return Math.abs(d - 2 * A) < 1e-9;
      });
    },
    bugs: ([kind, a, b]) => {
      if (kind)
        return [
          bug("ellipse-formula", "recall", CON, "The ellipse rule c² = a² − b² was used; for a hyperbola c² = a² + b².", a === b ? null : rootOver(Math.abs(a * a - b * b), a)),
          bug("over-b", "procedural", CON, `c was divided by b; e = c/a, where a = ${a} goes with the x² term (the transverse axis).`, a === b ? null : rootOver(a * a + b * b, b)),
          bug("e-squared", "procedural", CON, "e² was given instead of e.", nf((a * a + b * b) / (a * a))),
        ];
      const [A, B] = [Math.max(a, b), Math.min(a, b)];
      return [
        bug("hyperbola-formula", "recall", CON, "The hyperbola rule c² = a² + b² was used; for an ellipse c² = a² − b² (and e < 1).", rootOver(A * A + B * B, A)),
        bug("smaller-axis", "procedural", CON, `c was divided by the semi-minor axis ${B}; e = c ÷ (semi-major axis ${A}).`, rootOver(A * A - B * B, B)),
        bug("e-squared", "procedural", CON, "e² was given instead of e.", nf((A * A - B * B) / (A * A))),
      ];
    },
    distractors: ([kind, a, b]) => [rootOver(kind ? a * a + b * b : Math.abs(a * a - b * b), a * a), nf(kind ? b / a : Math.min(a, b) / Math.max(a, b))],
    variants: () => [],
    explain: (s) => (s.id === "standard" ? `Divide by ${s.inputs[0]}: ${s.value}` : s.id === "axes" ? `${s.value}` : s.id === "c" ? `${s.value}` : `e = c/a = √${s.inputs[0]}/${s.inputs[1]} = ${s.value}`),
    domain: ECC_D,
    keep: eccKeep,
    difficulty: ([kind, a, b, s]) => (!kind && a > b && s === 0 ? 1 : s === 0 ? 2 : 3),
    word: ([kind, a, b, s]) =>
      kind
        ? `The cross-section of a cooling tower is drawn (in tens of metres) as the hyperbola ${eccEq([kind, a, b, s])}. What is its eccentricity?`
        : `A garden path is laid out (in metres) along the ellipse ${eccEq([kind, a, b, s])}. What is the eccentricity of the path?`,
    teach: {
      idea: "Eccentricity e = c/a compares the distance from the centre to a focus with the semi-axis on which the foci lie; for an ellipse c² = a² − b² (e < 1), for a hyperbola c² = a² + b² (e > 1).",
      method: "Write the equation in standard form, decide which axis is the major (or transverse) one, find c² by the right rule, and divide c by that semi-axis.",
      alternatives: [
        { id: "b_over_a", title: "Use e² = 1 ∓ b²/a²", kind: "procedural", text: ["For an ellipse, e² = 1 − (minor/major)²; for a hyperbola, e² = 1 + (b/a)².", "Take the square root at the end."] },
      ],
    },
    limits: "Centred ellipses and hyperbolas with axes along the coordinate axes; foci, vertices and latus rectum are not asked here.",
  },
  {
    id: "arconicarea",
    arity: 4,
    title: "Areas bounded by a parabola or an ellipse",
    competency: CON,
    skill: "areas bounded by conics",
    type: "expression",
    mc: true,
    // [t, u, v, w]: t = 0 y² = ux and x = v; 1 y = ux² and y = vx; 2 ellipse with semi-axes u, v (w = 1: first quadrant)
    parse: none,
    reject: (p) => (carKeep(p) ? null : "A parabola and a line, or an ellipse with whole-number semi-axes."),
    prompt: ([t, u, v, w]) =>
      t === 0
        ? `Find the area of the region bounded by the parabola y² = ${ax(u)} and the line x = ${v}.`
        : t === 1
          ? `Find the area of the region enclosed by the parabola y = ${coef(u)}x² and the line y = ${ax(v)}.`
          : `Find the area of ${w ? "the part of the ellipse region that lies in the first quadrant, for the ellipse" : "the region enclosed by the ellipse"} ${u === 1 ? "x²" : `x²/${u * u}`} + ${v === 1 ? "y²" : `y²/${v * v}`} = 1.`,
    solve: (p) => {
      const [t, u, v, w] = p;
      const ans = carAns(p);
      const setup = t === 0 ? `2∫ from 0 to ${v} of √(${ax(u)}) dx` : t === 1 ? `∫ from 0 to ${nf(v / u)} of (${ax(v)} − ${coef(u)}x²) dx` : `${w ? "" : "4"}∫ from 0 to ${u} of ${v === 1 ? "" : v}√(1 − x²/${u * u}) dx`;
      return { steps: [st("setup", "set up", AREA, [setup], setup), st("integrate", "integrate", DEF, [], ans)], answer: ans };
    },
    // independent: Simpson's rule on the vertical gap
    validate: ([t, u, v, w], v0) => {
      const x = constOf(v0);
      if (!Number.isFinite(x)) return false;
      const S =
        t === 0
          ? simpson((s) => 2 * Math.sqrt(u * s), 0, v, 20000)
          : t === 1
            ? simpson((s) => v * s - u * s * s, 0, v / u)
            : (w ? 1 : 4) * simpson((s) => v * Math.sqrt(Math.max(0, 1 - (s * s) / (u * u))), 0, u, 20000);
      return Math.abs(x - S) <= 1e-5 * Math.max(1, Math.abs(S));
    },
    bugs: ([t, u, v, w]) => {
      if (t === 0) {
        const [k, m] = sqf(u * v);
        return [bug("upper-half", "procedural", AREA, "Only the part above the x-axis was found; the parabola is symmetric about the x-axis, so double it.", surdC(2 * v * k, 3, m))];
      }
      if (t === 1)
        return [
          bug("wrong-order", "procedural", AREA, "The parabola was taken minus the line; between the meeting points the line is on top, so integrate (line − parabola).", rat(-(v ** 3), 6 * u * u)),
          bug("line-only", "conceptual", AREA, "The area under the line was found; the area under the parabola must be taken away.", rat(v ** 3, 2 * u * u)),
        ];
      return [
        bug("circle-formula", "recall", AREA, `The circle formula πr² was used with r = ${Math.max(u, v)}; an ellipse has area πab.`, piStr((w ? 0.25 : 1) * Math.max(u, v) ** 2)),
        w ? bug("whole-ellipse", "procedural", AREA, "The area of the whole ellipse was given; only the first-quadrant quarter was asked for.", piStr(u * v)) : bug("quarter", "procedural", AREA, "Only the first-quadrant part was found; the ellipse has four equal quarters.", piStr((u * v) / 4)),
      ];
    },
    distractors: (p) => {
      const x = constOf(carAns(p));
      const pi = p[0] === 2;
      return pi ? [piStr((2 * x) / Math.PI), piStr(x / Math.PI / 2)] : [carAnsScaled(p, 2), carAnsScaled(p, 1 / 2), carAnsScaled(p, 3 / 4)];
    },
    variants: () => [],
    explain: (s) => (s.id === "setup" ? `Area = ${s.value}` : `Integrate and substitute the limits: ${s.value}`),
    domain: CAR_D,
    keep: carKeep,
    difficulty: ([t, , , w]) => (t === 2 && !w ? 1 : t === 2 || t === 1 ? 2 : 3),
    teach: {
      idea: "An area between curves is ∫ (top − bottom) dx between the points where they meet; symmetry lets you find one part and multiply.",
      method: "Sketch the region, find where the curves meet, write the vertical gap (top minus bottom), integrate between the meeting points, and use symmetry (×2 for a parabola about its axis, ×4 for an ellipse).",
      alternatives: [
        { id: "horizontal", title: "Slice the other way", kind: "procedural", text: ["For y² = ux and x = v, slice horizontally: each strip runs from x = y²/u to x = v.", "Integrate (v − y²/u) dy from y = −√(uv) to √(uv); it gives the same area."] },
      ],
    },
    limits: "Parabola–line regions and ellipse areas in standard position; regions between two different conics are not included.",
  },
  {
    id: "arconicid",
    arity: 4,
    title: "Which conic does an equation represent?",
    competency: CON,
    skill: "identifying a conic from its equation",
    type: "choice",
    // [t, h, k, q]: a circle, parabola, ellipse or hyperbola centred (or with vertex) at (h, k), written expanded
    parse: none,
    reject: (p) => (inDom(p, CID_D) ? null : "A circle, parabola, ellipse or hyperbola with a small whole-number centre."),
    choices: () => CID_CHOICES,
    prompt: (p) => `Which curve does the equation ${cidEq(p)} represent?`,
    solve: (p) => {
      const [A, Cc] = cidCoefs(p);
      return { steps: [st("squares", "compare", CON, [A, Cc], A === 0 || Cc === 0 ? "one squared term" : A === Cc ? "equal coefficients" : A * Cc > 0 ? "same signs" : "opposite signs"), st("name", "classify", CON, [], p[0])], answer: p[0] };
    },
    // independent: the curve's points (solving for y along a fine grid of x) tested for boundedness, one-sidedness and constant distance from the centre
    validate: (p, v) => {
      const [A, Cc, D, E, F] = cidCoefs(p);
      const pts: [number, number][] = [];
      for (let i = -1200; i <= 1200; i++) {
        const x = i / 20;
        const r = A * x * x + D * x + F;
        if (Cc === 0) pts.push([x, -r / E]);
        else {
          const disc = E * E - 4 * Cc * r;
          if (disc < 0) continue;
          pts.push([x, (-E + Math.sqrt(disc)) / (2 * Cc)], [x, (-E - Math.sqrt(disc)) / (2 * Cc)]);
        }
      }
      if (!pts.length) return false;
      const far = pts.filter(([x, y]) => Math.abs(x) > 40 || Math.abs(y) > 40);
      let idx: number;
      if (!far.length) {
        const xs = pts.map((q) => q[0]);
        const ys = pts.map((q) => q[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const ds = pts.map(([x, y]) => Math.hypot(x - cx, y - cy));
        idx = Math.max(...ds) - Math.min(...ds) < 0.02 ? 0 : 2;
      } else {
        const right = far.some(([x]) => x > 40);
        const left = far.some(([x]) => x < -40);
        idx = Cc === 0 || right !== left ? 1 : 3;
      }
      return v === idx;
    },
    bugs: ([t]) =>
      t === 2
        ? [bug("both-squares-circle", "conceptual", CON, "Having both x² and y² was taken to mean a circle; a circle needs the x² and y² coefficients to be equal.", 0)]
        : t === 3
          ? [bug("sign-ignored", "conceptual", CON, "The minus sign between the x² and y² terms was missed; opposite signs give a hyperbola, not an ellipse.", 2)]
          : t === 0
            ? [bug("any-two-squares-ellipse", "conceptual", CON, "Two squared terms were taken to mean an ellipse; with equal coefficients the curve is a circle (a special ellipse with e = 0), which is the better answer.", 2)]
            : [bug("linear-as-square", "procedural", CON, "The single x term was treated like a squared term; only one variable is squared, which makes a parabola.", 2)],
    variants: () => [],
    explain: (s) => (s.id === "squares" ? `Look at the x² and y² coefficients (${s.inputs[0]} and ${s.inputs[1]}): ${s.value}` : `So the curve is ${CID_CHOICES[Number(s.value)]}`),
    domain: CID_D,
    cap: 300,
    difficulty: ([t, h, k]) => (t <= 1 && h === 0 && k === 0 ? 1 : t <= 1 || (h === 0 && k === 0) ? 2 : 3),
    word: (p) => `In a design for a garden in Ooty, the edge of a flower bed is drawn along the curve ${cidEq(p)} (units in metres). Which curve is the edge of the bed?`,
    teach: {
      idea: "For A x² + C y² + D x + E y + F = 0 (no xy term), the squared terms decide the shape: one squared variable gives a parabola, equal coefficients a circle, same signs an ellipse, opposite signs a hyperbola.",
      method: "Look only at the x² and y² coefficients first; then, if you want to be sure, complete the squares to see the standard form.",
      alternatives: [
        { id: "complete_square", title: "Complete the squares", kind: "procedural", text: ["Group the x terms and the y terms and complete each square.", "Compare with (x − h)² + (y − k)² = r², (x − h)²/a² ± (y − k)²/b² = 1, or (y − k)² = 4a(x − h)."] },
      ],
    },
    limits: "Non-degenerate conics with axes parallel to the coordinate axes (no xy term); describing conics as sections of a double cone in words is written work for an educator.",
  },
  // ------------------------------------------------------------ gap@1 additions: conics
  {
    id: "arcone",
    arity: 3,
    title: "Conic sections as sections of a double cone",
    competency: CON,
    skill: "sections of a double cone",
    type: "choice",
    // [a, b, v]: semi-vertical angle 5a°, the plane at 5b° to the axis, v = 1 through the vertex
    parse: none,
    reject: ([a, b, v]) => (a >= 3 && a <= 15 && b >= 0 && b <= 18 && (v === 0 || v === 1) ? null : "A semi-vertical angle from 15° to 75° and a plane at 0° to 90° to the axis."),
    prompt: ([a, b, v]) => `A right circular double cone has a semi-vertical angle of ${5 * a}° (the angle between its axis and its slant side). A plane makes an angle of ${5 * b}° with the axis of the cone and ${v ? "passes through the vertex" : "does not pass through the vertex"}. What is the section (the curve in which the plane cuts the cone)?`,
    choices: (p) => coneChoices(p),
    solve: (p) => {
      const [a, b, v] = p;
      const cat = coneCat(p);
      const cmp = b === 18 ? "β = 90°" : b > a ? "β > α" : b === a ? "β = α" : "β < α";
      return { steps: [st("compare", "compare", CON, [5 * a, 5 * b], cmp), st("vertex", "classify", CON, [v], v ? "through the vertex: a degenerate conic" : "not through the vertex"), st("name", "classify", CON, [], coneChoices(p).indexOf(CONE_NAMES[cat]))], answer: coneChoices(p).indexOf(CONE_NAMES[cat]) };
    },
    // independent: put the plane's points into the cone's equation and classify the resulting second-degree curve in the plane
    validate: (p, v) => {
      const [a, b, vv] = p;
      const T = Math.tan((5 * a * Math.PI) / 180) ** 2;
      const be = (5 * b * Math.PI) / 180;
      const d = vv ? 0 : 1;
      // points (s, t sin β, d + t cos β): s² + C t² + E t + F = 0
      const Cq = Math.sin(be) ** 2 - Math.cos(be) ** 2 * T;
      const E = -2 * d * Math.cos(be) * T;
      const Fq = -d * d * T;
      let cat: number;
      if (d === 0) cat = Math.abs(Cq) < 1e-9 ? 5 : Cq > 0 ? 4 : 6;
      else if (Math.abs(Cq) < 1e-9) cat = 2;
      else if (Cq > 0) cat = Math.abs(Cq - 1) < 1e-9 && Math.abs(E) < 1e-9 && Fq < 0 ? 0 : 1;
      else cat = 3;
      return coneChoices(p)[v as number] === CONE_NAMES[cat];
    },
    bugs: (p) => {
      const [a, b, v] = p;
      const cat = coneCat(p);
      const cs = coneChoices(p);
      const ix = (c: number) => cs.indexOf(CONE_NAMES[c]);
      const out: Bug[] = [];
      if (v) out.push(bug("vertex-ignored", "conceptual", CON, "The plane passes through the vertex, which was not taken into account; then the section shrinks to a point, a single line or a pair of lines (a degenerate conic).", ix(cat === 4 ? (b === 18 ? 0 : 1) : cat === 5 ? 2 : 3)));
      else if (cat === 1 || cat === 3) out.push(bug("comparison-reversed", "conceptual", CON, `The comparison was reversed: a plane steeper than the slant side (β = ${5 * b}° ${b > a ? ">" : "<"} α = ${5 * a}°) cuts ${b > a ? "only one nappe in a closed curve, an ellipse" : "both nappes, giving a hyperbola"}.`, ix(cat === 1 ? 3 : 1)));
      else if (cat === 2) out.push(bug("tilted-ellipse", "conceptual", CON, "Any slanted cut was taken to give an ellipse; when the plane is parallel to a slant side (β = α) the curve never closes up, and it is a parabola.", ix(1)));
      else out.push(bug("circle-ellipse", "recall", CON, "A plane perpendicular to the axis (β = 90°) was taken to give an ellipse; it cuts every slant line at the same distance from the vertex, so the section is a circle.", ix(1)));
      return out.filter((x) => x.predict !== -1);
    },
    variants: () => [],
    explain: (s) => (s.id === "compare" ? `Compare the plane's angle with the axis, β = ${s.inputs[1]}°, with the semi-vertical angle α = ${s.inputs[0]}°: ${s.value}` : s.id === "vertex" ? `The plane is ${s.value}` : `So the section is option ${"ABCD"[Number(s.value)]}`),
    domain: [[3, 15], [0, 18], [0, 1]],
    cap: 300,
    difficulty: ([a, b, v]) => (b === 18 && !v ? 1 : v ? 3 : 2),
    teach: {
      idea: "Let α be the semi-vertical angle and β the angle between the cutting plane and the axis. Not through the vertex: β = 90° gives a circle, α < β < 90° an ellipse, β = α a parabola, β < α a hyperbola (both nappes are cut). Through the vertex: β > α gives a point, β = α a single line, β < α a pair of intersecting lines.",
      method: "Compare β with α (and with 90°), then ask whether the plane passes through the vertex; that decides between the curve and its degenerate case.",
      alternatives: [{ id: "torch", title: "A torch on a wall", kind: "conceptual", text: ["The light from a torch is a cone. Point it straight at a wall: a circle. Tilt it a little: an ellipse.", "Tilt it until the edge of the beam is parallel to the wall: a parabola; tilt further: one branch of a hyperbola."] }],
    },
    limits: "Angles in steps of 5°; drawing the sections is written work for an educator.",
  },
  {
    id: "arcirceq",
    arity: 6,
    title: "The equation of a circle from given conditions",
    competency: CON,
    skill: "circle: equation from data",
    type: "exact",
    mc: true,
    // [kind, h, k, a, b, c]: centre (h, k); 0 radius a; 1 through (h + a, k + b); 2 a diameter from (h + a, k + b) to (h − a, k − b); 3 through three lattice points of the circle with r² = CE_R2[a] (pick b)
    parse: none,
    reject: (p) => (ceOk(p) ? null : "A circle with a whole-number centre from given data."),
    prompt: (p) => `${cePrompt(p)} Write its equation in the form x² + y² + 2gx + 2fy + c = 0 and type the left-hand side.`,
    solve: (p) => {
      const [kind, h, k] = p;
      const R2 = ceR2(p);
      const ans = ceEq(h, k, R2);
      const how = ["(x − h)² + (y − k)² = r²", "r² = (distance from the centre to the point)²", "the centre is the midpoint of the diameter, r is half its length", "the centre is equidistant from the three points"][kind];
      return { steps: [st("centre", "find", CON, [how], tup(h, k)), st("radius", "evaluate", CON, [h, k], R2), st("expand", "expand", POLY, [], ans)], answer: ans };
    },
    // independent: the given points (or points at the given radius) lie on the answer's circle, and the answer is x² + y² + (linear)
    validate: (p, v) => {
      const n = node(v);
      if (!n) return false;
      const Q = (x: number, y: number) => ev(n, { x, y });
      const lin = (x: number, y: number) => Q(x, y) - x * x - y * y;
      const L0 = lin(0, 0);
      if (![[1, 0], [0, 1], [2, 3], [-1.5, 4]].every(([x, y]) => Math.abs(lin(x, y) - L0 - x * (lin(1, 0) - L0) - y * (lin(0, 1) - L0)) < 1e-9)) return false;
      return cePoints(p).every(([x, y]) => Math.abs(Q(x, y)) < 1e-9 * (1 + x * x + y * y));
    },
    bugs: (p) => {
      const [kind, h, k] = p;
      const R2 = ceR2(p);
      const out: Bug[] = [bug("centre-sign", "procedural", CON, "The centre's coordinates went in with the wrong signs: (x − h)² gives −2hx, so the centre (h, k) gives 2g = −2h and 2f = −2k.", h === 0 && k === 0 ? null : ceEq(-h, -k, R2))];
      if (kind === 0) out.push(bug("radius-not-squared", "procedural", CON, `The radius ${p[3]} was used where r² = ${R2} belongs: c = h² + k² − r².`, p[3] === 1 ? null : ceEq(h, k, p[3])));
      if (kind === 2) out.push(bug("diameter-as-radius", "conceptual", CON, "The length of the diameter was used as the radius; the radius is half of it.", ceEq(h, k, 4 * R2)));
      if (kind === 1 || kind === 3) out.push(bug("constant-sign", "procedural", CON, "The constant was found as h² + k² + r²; expanding (x − h)² + (y − k)² = r² gives c = h² + k² − r².", ceEq2(h, k, h * h + k * k + R2)));
      return out;
    },
    distractors: (p) => {
      const [, h, k] = p;
      const R2 = ceR2(p);
      return [ceEq(k, h, R2), ceEq2(h, k, R2), ceEq(h, k, R2 + 1)];
    },
    variants: () => [],
    explain: (s) => (s.id === "centre" ? `Use ${s.inputs[0]}: the centre is ${s.value}` : s.id === "radius" ? `r² = ${s.value}` : `Expand (x − h)² + (y − k)² = r²: ${s.value} = 0`),
    domain: [[0, 3], [-4, 4], [-4, 4], [-5, 8], [-5, 5], [0, 0]],
    keep: (p) => ceOk(p),
    cap: 400,
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 3 ? 3 : 2),
    teach: {
      idea: "A circle is all the points at distance r from its centre (h, k): (x − h)² + (y − k)² = r². Expanded, it is x² + y² + 2gx + 2fy + c = 0 with g = −h, f = −k, c = h² + k² − r².",
      method: "Use the data to find the centre and r² (a midpoint for a diameter; a distance for a point on the circle; equal distances from three points), then expand (x − h)² + (y − k)² = r² and collect terms.",
      alternatives: [{ id: "general", title: "Put the points into the general form", kind: "procedural", text: ["Write x² + y² + 2gx + 2fy + c = 0 and put in each given point: each gives a linear equation in g, f and c.", "Solve them together; for a diameter AB, (x − x₁)(x − x₂) + (y − y₁)(y − y₂) = 0 gives the circle at once."] }],
    },
    limits: "Circles with whole-number centres; circles touching given lines are left out.",
  },
  {
    id: "arcircpos",
    arity: 5,
    title: "Is a point inside, on or outside a circle?",
    competency: CON,
    skill: "position of a point relative to a circle",
    type: "choice",
    // [h, k, r, u, w]: the circle (x − h)² + (y − k)² = r² written expanded; the point (h + u, k + w)
    parse: none,
    reject: ([h, k, r, u, w]) => (h >= -3 && h <= 3 && k >= -3 && k <= 3 && r >= 2 && r <= 6 && Math.abs(u) <= 7 && Math.abs(w) <= 7 && (u !== 0 || w !== 0) ? null : "A circle with a whole-number centre and radius, and a point near it."),
    prompt: ([h, k, r, u, w]) => `Where does the point (${nf(h + u)}, ${nf(k + w)}) lie relative to the circle ${ceEq(h, k, r * r)} = 0?`,
    choices: (p) => cpChoices(p),
    solve: (p) => {
      const [h, k, r, u, w] = p;
      const S1 = u * u + w * w - r * r;
      const lab = S1 < 0 ? 0 : S1 === 0 ? 1 : 2;
      return { steps: [st("power", "substitute", CON, [h + u, k + w], S1), st("sign", "classify", CON, [S1], cpChoices(p).indexOf(CP_NAMES[lab]))], answer: cpChoices(p).indexOf(CP_NAMES[lab]) };
    },
    // independent: the centre and radius read off by completing the square (−g, −f, √(g² + f² − c)) and compared with the point's distance from the centre
    validate: ([h, k, r, u, w], v) => {
      const g = -h;
      const f = -k;
      const c = h * h + k * k - r * r;
      const R = Math.sqrt(g * g + f * f - c);
      const d = Math.hypot(h + u + g, k + w + f);
      const lab = Math.abs(d - R) < 1e-9 ? 1 : d < R ? 0 : 2;
      return cpChoices([h, k, r, u, w])[v as number] === CP_NAMES[lab];
    },
    bugs: (p) => {
      const [, , r, u, w] = p;
      const d2 = u * u + w * w;
      const cs = cpChoices(p);
      const lab = d2 < r * r ? 0 : d2 === r * r ? 1 : 2;
      const out: Bug[] = [];
      if (lab !== 1) out.push(bug("sign-reversed", "conceptual", CON, `Putting the point into the left-hand side gives ${nf(d2 - r * r)}; the sign was read the wrong way round: a negative value means the point is inside, a positive value outside.`, cs.indexOf(CP_NAMES[2 - lab])));
      const d = Math.sqrt(d2);
      const wrong = Math.abs(d - r * r) < 1e-9 ? 1 : d < r * r ? 0 : 2;
      if (wrong !== lab) out.push(bug("radius-squared", "procedural", CON, `The distance from the centre (${rootOver(d2, 1)}) was compared with r² = ${r * r} instead of with the radius r = ${r}.`, cs.indexOf(CP_NAMES[wrong])));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "power" ? `Put (${nf(Number(s.inputs[0]))}, ${nf(Number(s.inputs[1]))}) into the left-hand side: ${nf(Number(s.value))}` : `${Number(s.inputs[0]) < 0 ? "Negative" : Number(s.inputs[0]) === 0 ? "Zero" : "Positive"}, so the answer is option ${"ABC"[Number(s.value)]}`),
    domain: [[-3, 3], [-3, 3], [2, 6], [-7, 7], [-7, 7]],
    keep: ([, , r, u, w]) => Math.abs(u * u + w * w - r * r) <= 2 * r + 4 && (u !== 0 || w !== 0),
    cap: 300,
    difficulty: ([, , r, u, w]) => (u * u + w * w === r * r ? 2 : Math.abs(u * u + w * w - r * r) <= r ? 3 : 1),
    teach: {
      idea: "For S(x, y) = x² + y² + 2gx + 2fy + c, S(x₁, y₁) = (distance from the centre)² − r². So the point is inside when S(x₁, y₁) < 0, on the circle when it is 0, and outside when it is positive.",
      method: "Substitute the point into the left-hand side of the equation (with x² and y² having coefficient 1) and look at the sign of the result.",
      alternatives: [{ id: "distance", title: "Compare with the radius", kind: "procedural", text: ["Find the centre (−g, −f) and the radius √(g² + f² − c).", "Work out the distance from the centre to the point and compare it with the radius."] }],
    },
    limits: "Circles with whole-number centres and radii and points with whole-number coordinates close to the circle.",
  },
  {
    id: "arconprop",
    arity: 6,
    title: "Latus rectum, directrix, foci and axes of a parabola, ellipse or hyperbola",
    competency: CON,
    skill: "parts of a conic in standard form",
    type: "fraction",
    mc: true,
    // [kind, o, i, s, ask, f]: 0 parabola (y − k)² = ±N(x − h) style (o axis, i = N, s sign; f picks the vertex); 1 ellipse, 2 hyperbola with the triple CP_T[i] (o = 1: major/transverse axis along y; f = 1 cleared of fractions)
    parse: none,
    reject: (p) => (cpOkk(p) ? null : "A parabola, ellipse or hyperbola in standard form and one of its measurements."),
    prompt: (p) => `For the ${["parabola", "ellipse", "hyperbola"][p[0]]} ${cpEq(p)}, ${cpQuestion(p)}.`,
    solve: (p) => {
      const ans = cpAnswer(p);
      const [kind] = p;
      const [A, B, C] = kind ? cpABC(p) : [0, 0, 0];
      return { steps: [st("read", "read", CON, [cpEq(p)], kind ? `a = ${A}, b = ${B}` : `4a = ${nf(cpN(p))}`), ...(kind ? [st("c", "evaluate", CON, [kind], `c = ${C}`)] : []), st("value", "evaluate", CON, [p[4]], ans)], answer: ans };
    },
    // independent: the curve's own points — foci from the focal-distance property, the directrix from the focus–directrix ratio, axes and latus rectum from where the curve meets lines — found numerically
    validate: (p, v) => typeof v === "number" && Math.abs(cpNumeric(p) - v) < 1e-6 * Math.max(1, Math.abs(v)),
    bugs: (p) => {
      const [kind, , , , ask] = p;
      const ans = cpAnswer(p);
      const out: Bug[] = [];
      if (kind === 0) {
        const N = cpN(p);
        const [h, k] = cpVertex(p);
        if (ask === 0) out.push(bug("lr-a", "recall", CON, "The focal distance a was given; the latus rectum of y² = 4ax has length 4a.", Math.abs(N) / 4));
        if (ask === 1) {
          out.push(bug("directrix-side", "conceptual", CON, "The directrix was put on the same side as the focus; it lies on the opposite side of the vertex.", (p[1] ? k : h) + N / 4));
          out.push(bug("no-quarter", "recall", CON, `4a = ${nf(N)} was used as a; a is a quarter of the coefficient.`, (p[1] ? k : h) - N));
        }
        if (ask === 2) out.push(bug("half", "procedural", CON, "Only the distance from the vertex to the focus was given; the focus and the directrix are each that far from the vertex, on opposite sides.", Math.abs(N) / 4));
        return out.filter((b) => b.predict !== ans);
      }
      const [A, B, C] = cpABC(p);
      if (ask === 0) out.push(bug("lr-b-over-a", "recall", CON, "The latus rectum was taken as b²/a; its length is 2b²/a.", (B * B) / A), bug("lr-axes-swapped", "procedural", CON, "a and b were swapped in 2b²/a; a is the semi-axis on which the foci lie.", (2 * A * A) / B));
      if (ask === 1) out.push(bug("directrix-ae", "recall", CON, "The distance ae (to a focus) was given; the directrices are at a/e from the centre.", C), bug("directrix-e", "procedural", CON, "a/e was worked out as a × e.", (A * C) / A));
      if (ask === 2) out.push(bug("one-focus", "procedural", CON, "The distance from the centre to one focus was given; the foci are 2c apart.", C), bug("rule-swapped", "recall", CON, kind === 1 ? "c² = a² + b² (the hyperbola rule) was used; for an ellipse c² = a² − b²." : "c² = a² − b² (the ellipse rule) was used; for a hyperbola c² = a² + b².", 2 * Math.sqrt(kind === 1 ? A * A + B * B : Math.abs(A * A - B * B))));
      if (ask === 3 || ask === 4) out.push(bug("semi-axis", "procedural", CON, "The semi-axis was given; the length of the axis is twice it.", ask === 3 ? A : B), bug("axis-swapped", "conceptual", CON, `The ${ask === 3 ? "minor (conjugate)" : "major (transverse)"} axis was used: the ${ask === 3 ? (kind === 1 ? "major" : "transverse") : kind === 1 ? "minor" : "conjugate"} axis goes with ${ask === 3 ? "the foci" : "the other denominator"}.`, ask === 3 ? 2 * B : 2 * A));
      if (ask === 5) out.push(bug("vertex-squared", "procedural", CON, `The denominator a² = ${A * A} was given; the vertex is at distance a = ${A} from the centre.`, A * A));
      return out.filter((b) => Number.isFinite(b.predict as number) && Math.abs((b.predict as number) - ans) > 1e-9);
    },
    distractors: (p) => [cpAnswer(p) + 1, 2 * cpAnswer(p)],
    variants: () => [],
    explain: (s) => (s.id === "read" ? `From ${s.inputs[0]}: ${s.value}` : s.id === "c" ? `${Number(s.inputs[0]) === 1 ? "c² = a² − b²" : "c² = a² + b²"}, so ${s.value}` : `So the answer is ${nf(Number(s.value))}`),
    domain: [[0, 2], [0, 1], [0, 16], [0, 1], [0, 5], [0, 3]],
    keep: (p) => cpOkk(p),
    cap: 400,
    difficulty: ([kind, , , , ask, f]) => (kind === 0 && f === 0 ? 1 : ask === 1 || f === 1 ? 3 : 2),
    teach: {
      idea: "For y² = 4ax: focus (a, 0), directrix x = −a, axis y = 0, latus rectum 4a. For x²/a² ± y²/b² = 1 (foci on the x-axis): c² = a² ∓ b², foci (±c, 0), vertices (±a, 0), e = c/a, directrices x = ±a/e, latus rectum 2b²/a, axes 2a and 2b.",
      method: "Bring the equation to standard form, read a and b (a goes with the axis carrying the foci), find c by the right rule, and use the formula for the part asked.",
      alternatives: [{ id: "sketch", title: "Sketch and label", kind: "conceptual", text: ["Draw the curve and mark the centre (or vertex), the foci and the vertices on the axis.", "The latus rectum is the chord through a focus perpendicular to the axis; the directrix is the line beyond the vertex at a/e from the centre (for a parabola, as far behind the vertex as the focus is in front)."] }],
    },
    limits: "Parabolas with axes parallel to the coordinate axes, and centred ellipses and hyperbolas whose a, b, c are whole numbers; general second-degree forms are other families.",
  },
  {
    id: "arconeq",
    arity: 5,
    title: "The equation of an ellipse or a hyperbola from given data",
    competency: CON,
    skill: "ellipse and hyperbola: equation from data",
    type: "tuple",
    mc: true,
    // [kind, o, i, data, m]: kind 1 ellipse, 2 hyperbola with the triple CP_T[i] scaled by m; o = 1 foci on the y-axis; data 0 foci and vertices, 1 vertices and e, 2 foci and a point, 3 foci and latus rectum
    parse: none,
    reject: (p) => (cqOk(p) ? null : "An ellipse or hyperbola with whole-number a, b, c from two pieces of data."),
    prompt: (p) => `${cqData(p)} Its equation is ${cqForm(p)}. Find A and B, typed as (A, B).`,
    solve: (p) => {
      const [A, B] = cqAB(p);
      const [a, b, c] = cqABC(p);
      return { steps: [st("a", "read", CON, [p[3]], `a = ${a}`), st("b", "evaluate", CON, [p[0]], `b² = ${p[0] === 1 ? `a² − c² = ${a * a} − ${c * c}` : `c² − a² = ${c * c} − ${a * a}`} = ${b * b}`), st("form", "write", CON, [], tup(A, B))], answer: tup(A, B) };
    },
    // independent: points of the answer's curve satisfy the focal-distance property with the given foci (sum for an ellipse, difference for a hyperbola, fixed by the given data)
    validate: (p, v) => {
      const t = tupleNums(v, 2);
      if (!t || t[0] <= 0 || t[1] <= 0) return false;
      return cqCheck(p, t[0], t[1]);
    },
    bugs: (p) => {
      const [A, B] = cqAB(p);
      const [a, b, c] = cqABC(p);
      const out: Bug[] = [bug("wrong-rule", "recall", CON, p[0] === 1 ? "b² was found as a² + c² (the hyperbola rule); for an ellipse b² = a² − c²." : "b² was found as a² + c²; for a hyperbola c² = a² + b², so b² = c² − a².", p[0] === 1 ? tup(p[1] ? a * a + c * c : a * a, p[1] ? a * a : a * a + c * c) : tup(A, a * a + c * c))];
      out.push(bug("not-squared", "procedural", CON, `a and b themselves were typed; the denominators are a² = ${a * a} and b² = ${b * b}.`, p[0] === 1 && p[1] ? tup(b, a) : tup(a, b)));
      if (p[0] === 1) out.push(bug("order", "procedural", CON, `The denominators were put the wrong way round; the larger one, a² = ${a * a}, goes under ${p[1] ? "y²" : "x²"}, because the foci lie on the ${p[1] ? "y" : "x"}-axis.`, tup(B, A)));
      return out;
    },
    distractors: (p) => {
      const [A, B] = cqAB(p);
      return [tup(A + 1, B), tup(A, B + 1), tup(2 * A, 2 * B)];
    },
    variants: () => [],
    explain: (s) => (s.id === "a" ? `From the data, ${s.value}` : s.id === "b" ? `${s.value}` : `So (A, B) = ${s.value}`),
    domain: [[1, 2], [0, 1], [0, 7], [0, 3], [1, 1]],
    keep: (p) => cqOk(p),
    difficulty: ([, , , data]) => (data === 0 ? 1 : data === 3 ? 3 : 2),
    teach: {
      idea: "An ellipse with foci (±c, 0) and vertices (±a, 0) has b² = a² − c²; a hyperbola has b² = c² − a². With e = c/a, a point on the curve, or the latus rectum 2b²/a, the same three numbers a, b, c are linked.",
      method: "Find a and c from the data (c from the foci; a from the vertices, from e = c/a, from the focal-distance sum or difference at the given point, or from 2b²/a), then b² by the right rule, and put a² and b² under the right squares.",
      alternatives: [{ id: "definition", title: "Use the definition", kind: "conceptual", text: ["For an ellipse, every point has PF₁ + PF₂ = 2a; for a hyperbola, |PF₁ − PF₂| = 2a.", "Measuring at one known point gives a directly."] }],
    },
    limits: "Centred conics with axes along the coordinate axes and whole-number a, b, c; parabola equations are the family arparaeq.",
  },
  {
    id: "arparaeq",
    arity: 4,
    title: "The equation of a parabola from its focus, directrix, a point or its latus rectum",
    competency: CON,
    skill: "parabola: equation from data",
    type: "fraction",
    mc: true,
    // [kind, o, u, v]: vertex at the origin, axis along x (o = 0) or y (o = 1); 0 focus at u, 1 directrix at −u, 2 through a point, 3 latus rectum length u, opening the negative way when v = 1
    parse: none,
    reject: (p) => (peOk(p) ? null : "A parabola with vertex at the origin and one piece of data with whole numbers."),
    prompt: (p) => `${pePrompt(p)} Its equation is ${p[1] ? "x² = ky" : "y² = kx"}. Find k.`,
    solve: (p) => {
      const k = peK(p);
      return { steps: [st("a", "find", CON, [p[0]], `a = ${nf(k / 4)}`), st("k", "multiply", CON, [4], k)], answer: k };
    },
    // independent: the focus–directrix property of the answer's parabola, checked against the given data at several of its points
    validate: (p, v) => typeof v === "number" && v !== 0 && peCheck(p, v),
    bugs: (p) => {
      const [kind, , u, v] = p;
      const k = peK(p);
      const out: Bug[] = [];
      if (kind === 0 || kind === 1) {
        out.push(bug("no-four", "recall", CON, `The focal distance a = ${nf(k / 4)} was used as k; y² = 4ax, so k = 4a.`, k / 4));
        if (kind === 1) out.push(bug("directrix-side", "conceptual", CON, "The parabola was opened towards the directrix; it opens away from it, towards the focus.", -k));
      }
      if (kind === 2) out.push(bug("swapped", "procedural", CON, "The coordinates were put into the equation the wrong way round.", (p[1] ? v * v : u * u) / (p[1] ? u : v)));
      if (kind === 3) out.push(bug("lr-a", "recall", CON, "The latus rectum was taken as 2a; it is 4a, so k equals ± the latus rectum.", 2 * k), bug("direction", "procedural", CON, "The sign was lost: the parabola opens the negative way, so k is negative.", Math.abs(k)));
      return out.filter((b) => Number.isFinite(b.predict as number) && b.predict !== k);
    },
    distractors: (p) => [peK(p) / 2, -peK(p)],
    variants: () => [],
    explain: (s) => (s.id === "a" ? `From the data, ${s.value}` : `k = 4a = ${nf(Number(s.value))}`),
    domain: [[0, 3], [0, 1], [-12, 12], [-12, 12]],
    keep: (p) => peOk(p),
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 2 ? 2 : 3),
    teach: {
      idea: "A parabola with vertex at the origin and axis along the x-axis is y² = 4ax: its focus is (a, 0), its directrix x = −a and its latus rectum has length 4|a|. Along the y-axis it is x² = 4ay.",
      method: "Find a from the data (the focus, minus the directrix, the latus rectum ÷ 4 with the right sign, or by putting the point into y² = 4ax), then k = 4a.",
      alternatives: [{ id: "definition", title: "From the definition", kind: "procedural", text: ["Take a point (x, y) and write its distance from the focus equal to its distance from the directrix.", "Square and simplify: for focus (a, 0) and directrix x = −a you get y² = 4ax."] }],
    },
    limits: "Vertex at the origin and axis along a coordinate axis; shifted parabolas are the family arparabola.",
  },
  {
    id: "arconapp",
    arity: 5,
    title: "Conics in real life: arches, reflectors, cables and orbits",
    competency: CON,
    skill: "modelling with conics",
    type: "fraction",
    mc: true,
    decimals: true,
    // [kind, u, v, w, z]: 0 parabolic arch (span 2u, height v, point w from the centre); 1 dish (diameter u, depth v); 2 semi-elliptical arch (half-span 5z, height v, w = 3 or 4 times z from the centre); 3 bridge cable (towers 2u apart, height v, lowest w, point z from the centre); 4 orbit (major axis 2u, e = v/10, w = 0 nearest, 1 farthest)
    parse: none,
    reject: (p) => (caAppOk(p) ? null : "One of five conic models with whole-number data."),
    prompt: (p) => caAppPrompt(p),
    solve: (p) => {
      const ans = caAppAnswer(p);
      const model = ["y = h(1 − x²/a²) (a parabola through the ends of the span)", "x² = 4fy through the rim point (radius, depth)", "x²/a² + y²/b² = 1 with y ≥ 0", "y = L + (H − L)x²/a²", "nearest a(1 − e), farthest a(1 + e)"][p[0]];
      return { steps: [st("model", "model", MODEL, [p[0]], model), st("value", "evaluate", CON, [], ans)], answer: ans };
    },
    // independent: the curve built from the given points numerically (interpolation, or bisection on the defining property) and measured
    validate: (p, v) => typeof v === "number" && Math.abs(caAppNumeric(p) - v) < 1e-6 * Math.max(1, Math.abs(v)),
    bugs: (p) => {
      const [kind, u, v, w, z] = p;
      const ans = caAppAnswer(p);
      const out: Bug[] = [];
      if (kind === 0) out.push(bug("linear", "conceptual", MODEL, "The height was taken to fall in proportion to the distance from the centre (a straight-line roof); a parabola falls like the square of the distance.", v * (1 - w / u)), bug("from-top", "procedural", CON, "The drop below the top was found, h × (d/a)², but not taken away from the height.", (v * w * w) / (u * u)));
      if (kind === 1) out.push(bug("diameter", "procedural", CON, "The diameter was used where the radius belongs: the rim point is (diameter ÷ 2, depth).", (u * u) / (4 * v)), bug("a-not-quarter", "recall", CON, "x² = 4fy was used as x² = fy, so the answer is 4 times too big.", (u * u) / (4 * v)));
      if (kind === 2) out.push(bug("linear", "conceptual", MODEL, "The height was taken to fall in proportion to the distance from the centre; an ellipse follows y = b√(1 − x²/a²).", v * (1 - w / (5 * z))), bug("circle", "conceptual", CON, "The arch was treated as a circle, y = √(a² − x²); a semi-elliptical arch of height b has y = b√(1 − x²/a²).", Math.sqrt(25 * z * z - w * w)));
      if (kind === 3) out.push(bug("linear", "conceptual", MODEL, "The cable was taken to rise in a straight line from the lowest point; it hangs in a parabola, rising like the square of the distance.", w + ((v - w) * z) / u), bug("from-top", "procedural", CON, "The height was measured down from the tower top: H − (H − L)x²/a² was used instead of L + (H − L)x²/a².", v - ((v - w) * z * z) / (u * u)));
      if (kind === 4) out.push(bug("swapped", "recall", CON, w === 2 ? "The nearest distance a(1 − e) was given; the farthest is a(1 + e)." : "The farthest distance a(1 + e) was given; the nearest is a(1 − e).", u * (1 + (w === 2 ? -1 : 1) * (v / 10))), bug("focus-distance", "procedural", CON, "The distance from the centre to the focus, ae, was given; the distances from the focus to the ends of the major axis are a − ae and a + ae.", (u * v) / 10));
      for (const b of out) b.predict = Math.round((b.predict as number) * 1e9) / 1e9;
      return out.filter((b) => Number.isFinite(b.predict as number) && Math.abs((b.predict as number) - ans) > 1e-9 && caTerm(b.predict as number));
    },
    distractors: (p) => [caAppAnswer(p) + 1, caAppAnswer(p) / 2].filter(caTerm),
    variants: () => [],
    explain: (s) => (s.id === "model" ? `Model: ${s.value}` : `So the answer is ${nf(Number(s.value))}`),
    range: [0, Infinity],
    domain: [[0, 4], [2, 40], [1, 12], [0, 12], [0, 6]],
    keep: (p) => caAppOk(p),
    cap: 400,
    difficulty: ([kind]) => (kind === 0 || kind === 4 ? 1 : kind === 1 ? 2 : 3),
    teach: {
      idea: "Parabolic arches and hanging bridge cables follow y = (constant) × x² from their lowest or highest point; a reflector sends light from its focus out parallel to its axis; arches can be half-ellipses; planets move on ellipses with the Sun at a focus.",
      method: "Put the origin at the vertex or centre, write the standard equation, find its constant from one known point (an end of the span, the rim of the dish, the top of a tower), then substitute the point you need.",
      alternatives: [{ id: "sketch", title: "Sketch with coordinates", kind: "procedural", text: ["Draw the arch or dish on axes with the vertex or centre at the origin.", "Mark the known points with their coordinates; they fix the equation."] }],
    },
    limits: "Five standard situations with whole-number data whose answers are exact decimals; drawing the conic is written work for an educator.",
  },
  {
    id: "arxyconic",
    arity: 5,
    title: "Which conic does a general second-degree equation with an xy term represent?",
    competency: CON,
    skill: "classifying by B² − 4AC",
    type: "choice",
    // [t, p, q, s, e]: t = 0 ellipse, 1 parabola, 2 hyperbola; coefficients from p, q, s and a linear part from e
    parse: none,
    reject: (P) => (xcOk(P) ? null : "A non-degenerate second-degree curve with an xy term."),
    prompt: (P) => `Which curve does the equation ${xcEq(P)} represent?`,
    choices: (P) => xcChoices(P),
    solve: (P) => {
      const [A, B, C] = xcCoefs(P);
      const D = B * B - 4 * A * C;
      const lab = D < 0 ? 0 : D === 0 ? 1 : 2;
      return { steps: [st("disc", "evaluate", CON, [A, B, C], D), st("name", "classify", CON, [D], xcChoices(P).indexOf(XC_NAMES[lab]))], answer: xcChoices(P).indexOf(XC_NAMES[lab]) };
    },
    // independent: the curve's points (solved for y along a wide grid of x) are bounded (ellipse), run off in one direction (parabola) or in two (hyperbola)
    validate: (P, v) => xcChoices(P)[v as number] === XC_NAMES[xcShape(P)],
    bugs: (P) => {
      const [A, B, C] = xcCoefs(P);
      const D = B * B - 4 * A * C;
      const lab = D < 0 ? 0 : D === 0 ? 1 : 2;
      const cs = xcChoices(P);
      const out: Bug[] = [];
      const noXy = A * C > 0 ? (A === C ? 3 : 0) : A * C < 0 ? 2 : 1;
      if (noXy !== lab) out.push(bug("xy-ignored", "conceptual", CON, `The xy term was ignored and only the x² and y² coefficients were compared; with an xy term the test is B² − 4AC = ${D}.`, cs.indexOf(XC_NAMES[noXy])));
      if (lab !== 1) out.push(bug("sign-reversed", "recall", CON, "The rule was used the wrong way round: B² − 4AC < 0 gives an ellipse and B² − 4AC > 0 a hyperbola.", cs.indexOf(XC_NAMES[2 - lab])));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "disc" ? `A = ${s.inputs[0]}, B = ${s.inputs[1]}, C = ${s.inputs[2]}: B² − 4AC = ${s.value}` : `${Number(s.inputs[0]) < 0 ? "Negative: an ellipse" : Number(s.inputs[0]) === 0 ? "Zero: a parabola" : "Positive: a hyperbola"} (option ${"ABCD"[Number(s.value)]})`),
    domain: [[0, 2], [1, 4], [1, 4], [-6, 6], [0, 8]],
    keep: (P) => xcOk(P),
    cap: 300,
    difficulty: ([t]) => (t === 1 ? 3 : 2),
    teach: {
      idea: "For Ax² + Bxy + Cy² + Dx + Ey + F = 0 (not degenerate), turning the axes removes the xy term without changing B² − 4AC. So B² − 4AC < 0 gives an ellipse, = 0 a parabola, > 0 a hyperbola.",
      method: "Read A (the x² coefficient), B (the xy coefficient) and C (the y² coefficient), work out B² − 4AC and read off its sign.",
      alternatives: [{ id: "rotate", title: "Why the xy term matters", kind: "conceptual", text: ["x² + 3xy + y² has A and C of the same sign, yet it is a hyperbola: B² − 4AC = 9 − 4 = 5 > 0.", "The xy term tilts the curve; its size decides whether the tilted curve closes up."] }],
    },
    limits: "Non-degenerate real conics with an xy term and small whole coefficients; finding the angle of rotation is left out.",
  },
  // ------------------------------------------------------------ gap@1 additions: calculus
  {
    id: "arrolle",
    arity: 3,
    title: "The point c in Rolle's theorem",
    competency: MVT,
    skill: "Rolle's theorem",
    type: "roots",
    mc: true,
    // [p, a, b]: f(x) = x³ + px² + qx on [a, b] with q chosen so that f(a) = f(b)
    parse: none,
    reject: (P) => (rolleOk(P) ? null : "x³ + px² + qx on [a, b] with f(a) = f(b) and a root of f′ inside."),
    prompt: (P) => {
      const [p, a, b] = P;
      return `Verify that f(x) = ${sum([[1, "x³"], [p, "x²"], [rolleQ(P), "x"]])} satisfies the conditions of Rolle's theorem on [${nf(a)}, ${nf(b)}], and find all values of c in (${nf(a)}, ${nf(b)}) with f′(c) = 0. If there is more than one, separate them with commas.`;
    },
    solve: (P) => {
      const [p, a, b] = P;
      const q = rolleQ(P);
      const f = mvtF(p, q);
      const D = p * p - 3 * q;
      const ans = mvtRoots(p, D, a, b).join(", ");
      return { steps: [st("conditions", "check", MVT, [f(a), f(b)], `a polynomial is continuous and differentiable, and f(${nf(a)}) = f(${nf(b)}) = ${nf(f(a))}`), st("equation", "differentiate", DR, [p, q], `3c² ${p < 0 ? "−" : "+"} ${Math.abs(2 * p)}c ${q < 0 ? "−" : "+"} ${Math.abs(q)} = 0`), st("solve", "solve", QUAD, [], mvtRoots(p, D, a, b, true).join(", ")), st("inside", "check", MVT, [a, b], ans)], answer: ans };
    },
    // independent: f′ by central differences at each value, and the number of sign changes of f′ inside (a, b) counted
    validate: (P, v) => {
      if (typeof v !== "string") return false;
      const [p, a, b] = P;
      const f = mvtF(p, rolleQ(P));
      if (Math.abs(f(a) - f(b)) > 1e-9) return false;
      const cs = v.split(",").map((s) => constOf(s.trim()));
      if (!cs.length || cs.some((c) => !Number.isFinite(c) || c <= a || c >= b)) return false;
      if (cs.some((c, i) => cs.some((d, j) => j !== i && Math.abs(c - d) < 1e-9))) return false;
      if (cs.some((c) => Math.abs(d1(f, c)) > 1e-6)) return false;
      let count = 0;
      const n = 3000;
      const e = 1e-6;
      const X = (i: number) => a + e + ((b - a - 2 * e) * i) / n;
      for (let i = 0; i < n; i++) if ((d1(f, X(i)) < 0) !== (d1(f, X(i + 1)) < 0)) count++;
      return count === cs.length;
    },
    bugs: (P) => {
      const [p, a, b] = P;
      const q = rolleQ(P);
      const D = p * p - 3 * q;
      const all = mvtRoots(p, D, a, b, true).join(", ");
      const inside = mvtRoots(p, D, a, b).join(", ");
      return [
        bug("not-checked-inside", "procedural", MVT, `Both solutions of f′(c) = 0 were given; Rolle's theorem is about c strictly between ${nf(a)} and ${nf(b)}.`, all === inside ? null : all),
        bug("midpoint", "conceptual", MVT, "The midpoint of the interval was given; that is right for a quadratic, but for a cubic c must be found from f′(c) = 0.", nf((a + b) / 2)),
      ];
    },
    distractors: ([, a, b]) => [nf(a + (b - a) / 3), nf(b - (b - a) / 3)],
    variants: () => [],
    explain: (s) => (s.id === "conditions" ? `Conditions: ${s.value}` : s.id === "equation" ? `Solve f′(c) = 0: ${s.value}` : s.id === "solve" ? `c = ${s.value}` : `Keep only the values inside (${nf(Number(s.inputs[0]))}, ${nf(Number(s.inputs[1]))}): ${s.value}`),
    domain: [[-4, 4], [-4, 3], [-3, 5]],
    keep: (P) => rolleOk(P),
    difficulty: ([p, a]) => (p === 0 ? 1 : a >= 0 ? 2 : 3),
    teach: {
      idea: "If f is continuous on [a, b], differentiable on (a, b) and f(a) = f(b), the graph must turn somewhere in between: there is at least one c in (a, b) with f′(c) = 0 (a horizontal tangent).",
      method: "Check the three conditions (polynomials are continuous and differentiable everywhere; work out f(a) and f(b)). Then solve f′(c) = 0 and keep only the roots strictly between a and b.",
      alternatives: [{ id: "picture", title: "A ball thrown up", kind: "conceptual", text: ["A ball that leaves your hand and comes back to the same height must stop rising at some moment.", "At that moment its height has a horizontal tangent: that is the c of Rolle's theorem."] }],
    },
    limits: "Cubics x³ + px² + qx on whole-number intervals; functions that fail the conditions and proofs of inequalities are written work for an educator.",
  },
  {
    id: "artaylor",
    arity: 3,
    title: "A coefficient in the Taylor series about a point a",
    competency: TAY,
    skill: "Taylor series about x = a",
    type: "fraction",
    mc: true,
    // [f, a, k]: the coefficient of (x − a)ᵏ for 0 a polynomial (fixed by a), 1 1/x, 2 log x, 3 √x (a = m²), 4 xⁿ (n = 6 − a)
    parse: none,
    reject: (p) => (tyOk(p) ? null : "x⁴ + 2x³ − 3x², 1/x, log x, √x or xⁿ about a whole-number point, a coefficient of (x − a) to (x − a)⁴."),
    prompt: (p) => `Find the coefficient of ${tyPow(p)} in the Taylor series of f(x) = ${tyName(p)} about x = ${tyCentre(p)}.${p[0] === 2 ? " (log is the natural logarithm.)" : ""}`,
    solve: (p) => {
      const [, , k] = p;
      const c = tyCoef(p);
      return { steps: [st("derivative", "differentiate", DR, [tyName(p), k], nf(c * fact(k))), st("divide", "divide", TAY, [fact(k)], c)], answer: c };
    },
    // independent: the Cauchy integral formula round a small circle centred at a (a trapezoidal sum of the function in the complex plane)
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const a = tyCentre(p);
      const F = tyComplex(p);
      const r = p[0] === 0 || p[0] === 4 ? 1 : Math.abs(a) / 2;
      let s = 0;
      const N = 96;
      const k = p[2];
      for (let j = 0; j < N; j++) {
        const t = (2 * Math.PI * j) / N;
        const w = F([a + r * Math.cos(t), r * Math.sin(t)]);
        s += cmul(w, [Math.cos(-k * t), Math.sin(-k * t)])[0];
      }
      return near(v, s / N / r ** k, 1e-9);
    },
    bugs: (p) => {
      const [f, , k] = p;
      const c = tyCoef(p);
      const out: Bug[] = [bug("no-factorial", "recall", TAY, `The ${k}th derivative at x = ${tyCentre(p)} was given without dividing by ${k}! = ${fact(k)}; the coefficient of (x − a)ᵏ is f⁽ᵏ⁾(a)/k!.`, c * fact(k))];
      if (f === 0 || f === 4) out.push(bug("maclaurin", "conceptual", TAY, `The coefficient of x${sup(k)} in f itself (the Maclaurin series about 0) was given; about x = ${tyCentre(p)} the powers are of (x − ${tyCentre(p)}).`, tyMac(p)));
      else out.push(bug("sign-pattern", "recall", TAY, "The sign was lost: each differentiation of a negative power brings another minus sign, so the signs alternate.", -c));
      return out.filter((b) => Number.isFinite(b.predict as number) && b.predict !== c);
    },
    distractors: (p) => [tyCoef(p) * 2, tyCoef(p) + 1],
    variants: () => [],
    explain: (s) => (s.id === "derivative" ? `f⁽ᵏ⁾(a) = ${s.value} for k = ${s.inputs[1]}` : `Divide by ${s.inputs[0]}: the coefficient is ${nf(Number(s.value))}`),
    domain: [[0, 4], [-3, 5], [1, 4]],
    keep: (p) => tyOk(p),
    difficulty: ([f, , k]) => (f === 4 || (f === 0 && k <= 2) ? 1 : f === 3 || k >= 3 ? 3 : 2),
    teach: {
      idea: "Near x = a, f(x) = f(a) + f′(a)(x − a) + f″(a)(x − a)²/2! + …: the coefficient of (x − a)ᵏ is f⁽ᵏ⁾(a)/k!. For a polynomial the series is just the polynomial rewritten in powers of (x − a).",
      method: "Differentiate k times, put x = a, and divide by k!. (For a polynomial you can instead put x = a + t, expand, and read off the coefficient of tᵏ.)",
      alternatives: [{ id: "shift", title: "Substitute x = a + t", kind: "procedural", text: ["Write x = a + t, so (x − a) = t.", "For 1/x = 1/(a + t) = (1/a) × 1/(1 + t/a), expand as a geometric series in t/a; for a polynomial, expand directly."] }],
    },
    limits: "Five functions about whole-number points, coefficients of (x − a) to (x − a)⁴; remainder terms are left out.",
  },
  {
    id: "arlhinf",
    arity: 3,
    title: "l'Hôpital's rule for ∞/∞, 0 × ∞ and ∞ − ∞",
    competency: LH,
    skill: "other indeterminate forms",
    type: "fraction",
    mc: true,
    // [f, a, b]: 0 ∞/∞ ratio of quadratics; 1 bx sin(a/x) (x → ∞); 2 bx cot(ax) (x → 0); 3 bx(e^(a/x) − 1) (x → ∞); 4 b(1/(x − 1) − a/(xᵃ − 1)) (x → 1); 5 b(1/x − a/(e^(ax) − 1)) (x → 0)
    parse: none,
    reject: (p) => (lhiOk(p) ? null : "One of six standard forms with small whole a and b."),
    prompt: (p) => `Evaluate ${lhiExpr(p)}, an indeterminate form of type ${LHI_FORM[p[0]]}.`,
    solve: (p) => {
      const ans = lhiAnswer(p);
      const how = ["divide (or apply the rule twice): the ratio of the x² coefficients", "write it as sin(a/x)/(1/x), a 0/0 form", "write it as x/tan(ax), a 0/0 form", "write it as (e^(a/x) − 1)/(1/x), a 0/0 form", "combine into one fraction, a 0/0 form, and apply the rule twice", "combine into one fraction, a 0/0 form, and apply the rule twice"][p[0]];
      return { steps: [st("rewrite", "rewrite", LH, [LHI_FORM[p[0]]], how), st("value", "evaluate", LIM, [], ans)], answer: ans };
    },
    // independent: the expression evaluated very close to the limit point, with Richardson extrapolation
    validate: (p, v) => typeof v === "number" && Math.abs(lhiNumeric(p) - v) < 1e-5 * Math.max(1, Math.abs(v)),
    bugs: (p) => {
      const [f, a, b] = p;
      const ans = lhiAnswer(p);
      const out: Bug[] = [];
      if (f === 0) {
        const [P, , R, Sx, , U] = lhiQuad(p);
        out.push(bug("constant-terms", "conceptual", LIM, "The constant terms were compared, as if x → 0; as x → ∞ the highest powers dominate.", U === 0 ? null : R / U));
        out.push(bug("upside-down", "procedural", LH, "The ratio was turned upside down; keep the numerator's coefficient on top.", Sx / P));
      } else if (f >= 1 && f <= 3) {
        out.push(bug("zero-times", "conceptual", LIM, "0 × ∞ was taken to be 0; it is indeterminate, so rewrite the product as a quotient first.", 0));
        out.push(bug("a-lost", "procedural", DR, `The chain-rule factor ${a} was lost when differentiating.`, f === 2 ? b : b));
      } else {
        out.push(bug("infinity-cancel", "conceptual", LIM, "∞ − ∞ was taken to be 0; combine the two fractions into one and then use the rule.", 0));
        out.push(bug("order-swapped", "procedural", LH, "The two fractions were combined in the wrong order, which changes the sign of the result.", -ans));
      }
      return out.filter((x) => x.predict !== null && Number.isFinite(x.predict as number) && Math.abs((x.predict as number) - ans) > 1e-12);
    },
    distractors: (p) => [lhiAnswer(p) * 2, lhiAnswer(p) + 1, -lhiAnswer(p)],
    variants: () => [],
    explain: (s) => (s.id === "rewrite" ? `For the form ${s.inputs[0]}: ${s.value}` : `The limit is ${nf(Number(s.value))}`),
    domain: [[0, 5], [1, 6], [1, 6]],
    keep: (p) => lhiOk(p),
    difficulty: ([f]) => (f === 0 ? 1 : f <= 3 ? 2 : 3),
    teach: {
      idea: "l'Hôpital's rule works directly only for 0/0 and ∞/∞. A product 0 × ∞ becomes a quotient by writing f·g = f/(1/g); a difference ∞ − ∞ becomes a quotient by combining the fractions.",
      method: "Identify the form; for 0 × ∞ or ∞ − ∞ rewrite it as one quotient that gives 0/0 or ∞/∞; then differentiate the numerator and the denominator separately, as often as needed, and take the limit.",
      alternatives: [{ id: "series", title: "Use the first terms of a series", kind: "conceptual", text: ["sin u ≈ u, tan u ≈ u, eᵘ − 1 ≈ u + u²/2 for small u.", "Replace each function by these terms, simplify and let x approach the point."] }],
    },
    limits: "Six standard forms with whole-number parameters; exponential forms 1^∞, 0⁰ and ∞⁰ are in the family arlhop (1^∞) or left out.",
  },
  {
    id: "armvcont",
    arity: 3,
    title: "Is a function of two variables continuous at the origin?",
    competency: MVL,
    skill: "continuity of two-variable functions",
    type: "choice",
    // [t, a, k]: f = g_t(x, y) for (x, y) ≠ (0, 0) and f(0, 0) = k
    parse: none,
    reject: ([t, a, k]) => (t >= 0 && t <= 7 && a >= 1 && a <= 4 && k >= -2 && k <= 4 ? null : "One of eight functions with a value k at the origin."),
    prompt: ([t, a, k]) => `f(x, y) = ${MVC[t].text(a)} for (x, y) ≠ (0, 0), and f(0, 0) = ${nf(k)}. Which statement is true?`,
    choices: (p) => mvcChoices(p),
    solve: (p) => {
      const [t, a, k] = p;
      const L = MVC[t].limit(a);
      const lab = L === null ? 2 : L === k ? 0 : 1;
      return { steps: [st("limit", "evaluate", MVL, [t], L === null ? "does not exist" : nf(L)), st("compare", "compare", CONT, [k], mvcChoices(p).indexOf(MVC_NAMES[lab]))], answer: mvcChoices(p).indexOf(MVC_NAMES[lab]) };
    },
    // independent: values very close to the origin along many straight lines and along the curve x = y²
    validate: (p, v) => {
      const [t, a, k] = p;
      const g = MVC[t].fn(a);
      const r = 1e-4;
      const vals = [0, 0.5, 1.1, 1.7, 2.4, 3.0, 4.2, 5.5].map((th) => g(r * Math.cos(th), r * Math.sin(th)));
      vals.push(g(r * r, r), g(r * r, -r));
      const exists = vals.every((x) => Number.isFinite(x) && Math.abs(x - vals[0]) < 1e-3);
      const lab = !exists ? 2 : Math.abs(vals[0] - k) < 1e-3 ? 0 : 1;
      return mvcChoices(p)[v as number] === MVC_NAMES[lab];
    },
    bugs: (p) => {
      const [t, a, k] = p;
      const L = MVC[t].limit(a);
      const cs = mvcChoices(p);
      const lab = L === null ? 2 : L === k ? 0 : 1;
      const out: Bug[] = [];
      if (L === null) {
        const axis = MVC[t].axis(a);
        out.push(bug("one-path", "conceptual", MVL, `${MVC[t].path}, so the limit does not exist.`, cs.indexOf(MVC_NAMES[axis === k ? 0 : 1])));
      } else {
        out.push(bug("zero-over-zero", "conceptual", MVL, "Since the formula gives 0/0 at the origin, f was taken to be discontinuous there; continuity depends on the limit of the values near the origin.", cs.indexOf(MVC_NAMES[2])));
        if (lab === 1) out.push(bug("value-not-compared", "procedural", CONT, `The limit (${nf(L)}) was found but not compared with f(0, 0) = ${nf(k)}; continuity needs them to be equal.`, cs.indexOf(MVC_NAMES[0])));
      }
      return out.filter((x) => x.predict !== mvcChoices(p).indexOf(MVC_NAMES[lab]));
    },
    variants: () => [],
    explain: (s) => (s.id === "limit" ? `The limit at the origin ${s.value === "does not exist" ? "does not exist" : `is ${s.value}`}` : `Compare with f(0, 0) = ${nf(Number(s.inputs[0]))}: option ${"ABC"[Number(s.value)]}`),
    domain: [[0, 7], [1, 4], [-2, 4]],
    keep: ([t, a, k]) => (MVC[t].limit(a) === null ? k >= -1 && k <= 1 : true),
    difficulty: ([t]) => (MVC[t].limit(1) === null ? (t === 7 ? 3 : 2) : 1),
    teach: {
      idea: "f is continuous at (0, 0) when lim ((x, y) → (0, 0)) f(x, y) exists and equals f(0, 0). The limit must be the same along every path into the origin.",
      method: "First decide whether the limit exists: polar coordinates (x = r cos θ, y = r sin θ) show a limit when r survives in the numerator; two paths with different limits show it does not. If it exists, compare it with f(0, 0).",
      alternatives: [{ id: "paths", title: "Try several paths", kind: "procedural", text: ["Go in along the x-axis, the y-axis, the line y = mx and, if needed, the curve x = y².", "If the values head to different numbers on two paths, there is no limit; if the function simplifies, find the limit and compare with f(0, 0)."] }],
    },
    limits: "Eight standard rational and transcendental functions at the origin; continuity at other points is left out.",
  },
  {
    id: "arlinapp2",
    arity: 7,
    title: "The total differential and the linear approximation of f(x, y)",
    competency: LA,
    skill: "linear approximation in two variables",
    type: "fraction",
    mc: true,
    decimals: true,
    // [a, b, c, x0, y0, d, ask]: f = a x² + b xy + c y²; (dx, dy) = LA_D[d]; ask 0 the approximation of f(x0 + dx, y0 + dy), 1 the total differential df
    parse: none,
    reject: (p) => (la2Ok(p) ? null : "f = ax² + bxy + cy² near a whole-number point, with small changes."),
    prompt: ([a, b, c, x0, y0, d, ask]) => {
      const [dx, dy] = LA_D[d];
      const f = sum([[a, "x²"], [b, "xy"], [c, "y²"]]);
      return ask ? `For f(x, y) = ${f}, find the total differential df at (${nf(x0)}, ${nf(y0)}) when dx = ${dec2(dx)} and dy = ${dec2(dy)}.` : `Use the linear approximation of f(x, y) = ${f} at (${nf(x0)}, ${nf(y0)}) to estimate f(${dec2(x0 + dx)}, ${dec2(y0 + dy)}).`;
    },
    solve: (p) => {
      const [a, b, c, x0, y0, d, ask] = p;
      const [dx, dy] = LA_D[d];
      const fx = 2 * a * x0 + b * y0;
      const fy = b * x0 + 2 * c * y0;
      const f0 = a * x0 * x0 + b * x0 * y0 + c * y0 * y0;
      const df = fx * dx + fy * dy;
      const ans = la2Answer(p);
      return { steps: [st("partials", "differentiate", PD, [x0, y0], `f_x = ${nf(fx)}, f_y = ${nf(fy)}`), st("df", "multiply", LA, [fx, dx, fy, dy], df), ...(ask ? [] : [st("add", "add", LA, [f0, df], ans)])], answer: ans };
    },
    // independent: both partial derivatives by central differences at the point
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const [a, b, c, x0, y0, d, ask] = p;
      const [dx, dy] = LA_D[d];
      const f = (x: number, y: number) => a * x * x + b * x * y + c * y * y;
      const df = d1((t) => f(t, y0), x0, 1e-4) * dx + d1((t) => f(x0, t), y0, 1e-4) * dy;
      return Math.abs((ask ? df : f(x0, y0) + df) - v) < 1e-8;
    },
    bugs: (p) => {
      const [a, b, c, x0, y0, d, ask] = p;
      const [dx, dy] = LA_D[d];
      const fx = 2 * a * x0 + b * y0;
      const fy = b * x0 + 2 * c * y0;
      const f0 = a * x0 * x0 + b * x0 * y0 + c * y0 * y0;
      const ans = la2Answer(p);
      const out: Bug[] = [
        bug("one-variable", "conceptual", LA, "Only the change in x was used; f changes through both variables: df = f_x dx + f_y dy.", (ask ? 0 : f0) + fx * dx),
        bug("swapped", "procedural", LA, "dx and dy were attached to the wrong partial derivatives (f_x dy + f_y dx).", (ask ? 0 : f0) + fx * dy + fy * dx),
      ];
      if (ask === 0) out.push(bug("no-base", "procedural", LA, `Only the change df was given; the estimate is f(${nf(x0)}, ${nf(y0)}) + df.`, fx * dx + fy * dy));
      else out.push(bug("plus-f", "procedural", LA, `f(${nf(x0)}, ${nf(y0)}) was added; the total differential is just the change f_x dx + f_y dy.`, f0 + fx * dx + fy * dy));
      return out.filter((x) => Math.abs((x.predict as number) - ans) > 1e-9);
    },
    distractors: (p) => [la2Answer(p) + 0.1, la2Answer(p) - 0.5],
    variants: () => [],
    explain: (s) => (s.id === "partials" ? `At (${nf(Number(s.inputs[0]))}, ${nf(Number(s.inputs[1]))}): ${s.value}` : s.id === "df" ? `df = f_x dx + f_y dy = ${nf(Number(s.value))}` : `f ≈ ${nf(Number(s.inputs[0]))} + (${nf(Number(s.inputs[1]))}) = ${nf(Number(s.value))}`),
    domain: [[-2, 3], [-3, 3], [-2, 3], [1, 4], [-3, 4], [0, 7], [0, 1]],
    keep: (p) => la2Ok(p),
    cap: 300,
    difficulty: ([a, b, c, , , , ask]) => (ask === 1 && b === 0 ? 1 : a < 0 || c < 0 ? 3 : 2),
    teach: {
      idea: "Near a point, f(x, y) is almost a plane: f(x₀ + dx, y₀ + dy) ≈ f(x₀, y₀) + f_x dx + f_y dy. The change df = f_x dx + f_y dy is the total differential.",
      method: "Find f_x and f_y, evaluate them at (x₀, y₀), multiply by dx and dy and add: that is df. For the estimate, add df to f(x₀, y₀).",
      alternatives: [{ id: "one_at_a_time", title: "One variable at a time", kind: "conceptual", text: ["Changing x alone by dx changes f by about f_x dx; changing y alone by dy changes it by about f_y dy.", "For small changes the two effects simply add."] }],
    },
    limits: "Quadratic forms in x and y with whole-number points and changes of 0.05 to 0.2; error estimates for products of measured lengths are other families.",
  },
  {
    id: "archain",
    arity: 7,
    title: "The chain rule for w = f(x, y) with x and y depending on t",
    competency: PD,
    skill: "multivariable chain rule",
    type: "integer",
    mc: true,
    // [a, b, c, p, u, v, t0]: w = a x² + b xy + c y², x = pt + u, y = t² + v, at t = t0
    parse: none,
    reject: (P) => (chOk(P) ? null : "w = ax² + bxy + cy² with x linear and y quadratic in t."),
    prompt: ([a, b, c, p, u, v, t0]) => `w = ${sum([[a, "x²"], [b, "xy"], [c, "y²"]])}, where x = ${sum([[p, "t"], [u, ""]])} and y = ${sum([[1, "t²"], [v, ""]])}. Use the chain rule to find dw/dt when t = ${nf(t0)}.`,
    solve: (P) => {
      const [a, b, c, p, u, v, t0] = P;
      const x = p * t0 + u;
      const y = t0 * t0 + v;
      const wx = 2 * a * x + b * y;
      const wy = b * x + 2 * c * y;
      const ans = wx * p + wy * 2 * t0;
      return { steps: [st("point", "evaluate", PD, [t0], `x = ${nf(x)}, y = ${nf(y)}`), st("partials", "differentiate", PD, [], `∂w/∂x = ${nf(wx)}, ∂w/∂y = ${nf(wy)}`), st("chain", "multiply", PD, [p, 2 * t0], ans)], answer: ans };
    },
    // independent: w(t) composed directly and differentiated by a central difference
    validate: ([a, b, c, p, u, v, t0], val) => {
      if (typeof val !== "number") return false;
      const w = (t: number) => {
        const x = p * t + u;
        const y = t * t + v;
        return a * x * x + b * x * y + c * y * y;
      };
      return Math.abs(d1(w, t0, 1e-4) - val) < 1e-6 * Math.max(1, Math.abs(val));
    },
    bugs: ([a, b, c, p, u, v, t0]) => {
      const x = p * t0 + u;
      const y = t0 * t0 + v;
      const wx = 2 * a * x + b * y;
      const wy = b * x + 2 * c * y;
      const ans = wx * p + wy * 2 * t0;
      return [
        bug("one-path", "conceptual", PD, "Only the path through x was used; w depends on t through both x and y: dw/dt = (∂w/∂x)(dx/dt) + (∂w/∂y)(dy/dt).", wx * p),
        bug("no-inner", "procedural", PD, "∂w/∂x and ∂w/∂y were added without multiplying by dx/dt and dy/dt.", wx + wy),
      ].filter((x) => x.predict !== ans);
    },
    distractors: (P) => {
      const [a, b, c, p, u, v, t0] = P;
      const x = p * t0 + u;
      const y = t0 * t0 + v;
      return [(b * x + 2 * c * y) * 2 * t0, (2 * a * x + b * y) * p - (b * x + 2 * c * y) * 2 * t0];
    },
    variants: () => [],
    explain: (s) => (s.id === "point" ? `At t = ${nf(Number(s.inputs[0]))}: ${s.value}` : s.id === "partials" ? s.value as string : `dw/dt = (∂w/∂x)(${nf(Number(s.inputs[0]))}) + (∂w/∂y)(${nf(Number(s.inputs[1]))}) = ${nf(Number(s.value))}`),
    domain: [[-2, 3], [-3, 3], [-2, 3], [-3, 3], [-3, 3], [-3, 3], [-2, 3]],
    keep: (P) => chOk(P),
    cap: 300,
    difficulty: ([a, b, c]) => (b === 0 ? 1 : a !== 0 && c !== 0 ? 3 : 2),
    teach: {
      idea: "When w depends on x and y, and both depend on t, a small change in t moves both: dw/dt = (∂w/∂x)(dx/dt) + (∂w/∂y)(dy/dt).",
      method: "Find x and y at the given t, the partial derivatives ∂w/∂x and ∂w/∂y there, and dx/dt and dy/dt; multiply in pairs and add.",
      alternatives: [{ id: "substitute", title: "Substitute first", kind: "procedural", text: ["Put x and y in terms of t into w, which gives w as a function of t alone.", "Differentiate it with respect to t; the answer agrees with the chain rule."] }],
    },
    limits: "Quadratic w with x linear and y quadratic in t; chain rules with two parameters (∂w/∂s, ∂w/∂t) are left out.",
  },
  {
    id: "arlindx",
    arity: 4,
    title: "Linear equations of the form dx/dy + P₁x = Q₁",
    competency: LDE,
    skill: "dx/dy form",
    type: "expression",
    mc: true,
    // [f, a, b, c]: 0 dx/dy + a x = b, x(0) = c; 1 dx/dy + (a/y)x = yᵇ, x(1) = c; 2 y dx − (x + a yᵇ⁺¹) dy = 0, x(1) = c
    parse: none,
    reject: (p) => (ldxOk(p) ? null : "dx/dy + ax = b, dx/dy + (a/y)x = yᵇ, or y dx − (x + a yᵇ⁺¹) dy = 0 with a starting value."),
    prompt: ([f, a, b, c]) =>
      f === 0
        ? `Solve dx/dy + ${ax(a, "x")} = ${nf(b)}, where x is a function of y, given that x = ${nf(c)} when y = 0. Write x in terms of y.`
        : f === 1
          ? `Solve dx/dy + (${a}/y)x = ${b === 0 ? "1" : pw("y", b)} for y > 0, given that x = ${nf(c)} when y = 1. Write x in terms of y.`
          : `Solve the differential equation y dx − (x + ${coef(a)}${pw("y", b + 1)}) dy = 0 for y > 0, given that x = ${nf(c)} when y = 1. Write x in terms of y.`,
    solve: (p) => {
      const [f, a, b, c] = p;
      const ans = ldxAns(p);
      const IF = f === 0 ? `e^(${ax(a, "y")})` : f === 1 ? pw("y", a) : "1/y";
      return { steps: [st("form", "rearrange", LDE, [f], f === 2 ? `dx/dy − x/y = ${sum([[a, pw("y", b)]])}` : "dx/dy + P₁x = Q₁"), st("if", "integrating factor", LDE, [], IF), st("integrate", "integrate", IND, [IF], ans)], answer: ans };
    },
    // independent: substitute the answer back (dx/dy by central differences) and check the starting value
    validate: ([f, a, b, c], v) => {
      const n = node(v);
      if (!n) return false;
      const x = (y: number) => ev(n, { y });
      const y0 = f === 0 ? 0 : 1;
      if (!Number.isFinite(x(y0)) || Math.abs(x(y0) - c) > 1e-9) return false;
      const ys = f === 0 ? [0.3, 0.8, 1.4, 2.0] : [0.6, 1.1, 1.7, 2.3];
      return ys.every((y) => {
        const r = f === 0 ? d1(x, y) + a * x(y) - b : f === 1 ? d1(x, y) + (a / y) * x(y) - y ** b : y * d1(x, y) - (x(y) + a * y ** (b + 1));
        return Number.isFinite(r) && Math.abs(r) < 1e-5 * Math.max(1, Math.abs(x(y)));
      });
    },
    bugs: (p) => {
      const [f, a, b, c] = p;
      const ans = ldxAns(p);
      const out: Bug[] = [];
      if (f === 0) out.push(bug("factor-sign", "procedural", LDE, `The exponential was written as e^(${ax(a, "y")}); dividing by the integrating factor e^(${ax(a, "y")}) gives e^(−${ax(a, "y")}).`, sum([[b / a, ""], [c - b / a, `e^(${ax(a, "y")})`]])), bug("constant-not-fitted", "procedural", DE, `The starting value ${nf(c)} was used directly as the constant C; C must be found by putting y = 0 into the whole solution.`, sum([[b / a, ""], [c, `e^(−${ax(a, "y")})`]])));
      else if (f === 1) {
        const E = 1 / (a + b + 1);
        out.push(bug("q-not-multiplied", "procedural", LDE, `The right side was integrated without first multiplying by the integrating factor ${pw("y", a)}.`, sum([[1 / (b + 1), pw("y", b + 1 - a)], [c - 1 / (b + 1), pw("y", -a)]])), bug("constant-not-fitted", "procedural", DE, `The starting value ${nf(c)} was used directly as C; C must be found by putting y = 1 into the whole solution.`, sum([[E, pw("y", b + 1)], [c, pw("y", -a)]])));
      } else out.push(bug("if-sign", "procedural", LDE, "The integrating factor was taken as y instead of 1/y: here P₁ = −1/y, so e^(∫P₁ dy) = e^(−log y) = 1/y.", sum([[a / (b + 2), pw("y", b + 1)], [c - a / (b + 2), pw("y", -1)]])), bug("constant-dropped", "conceptual", DE, "The constant of integration was left out, so the solution cannot meet the starting condition.", sum([[a / b, pw("y", b + 1)]])));
      return out.filter((x) => x.predict !== ans);
    },
    variants: () => [],
    explain: (s) => (s.id === "form" ? `Write it as ${s.value}` : s.id === "if" ? `Integrating factor e^(∫P₁ dy) = ${s.value}` : `x × (IF) = ∫ Q₁ × (IF) dy + C; with the starting value, x = ${s.value}`),
    domain: [[0, 2], [1, 4], [-5, 5], [-3, 4]],
    keep: (p) => ldxOk(p),
    difficulty: ([f]) => (f === 0 ? 1 : f === 1 ? 2 : 3),
    teach: {
      idea: "Sometimes the equation is linear in x rather than in y: dx/dy + P₁(y)x = Q₁(y). The same method works with the roles of x and y swapped: the integrating factor is e^(∫P₁ dy).",
      method: "Rearrange to dx/dy + P₁x = Q₁, find IF = e^(∫P₁ dy), write x × IF = ∫ Q₁ × IF dy + C, divide by IF and use the starting value for C.",
      alternatives: [{ id: "spot", title: "When to use the dx/dy form", kind: "conceptual", text: ["If writing dy/dx = … gives a term like y² or 1/(x + y²) that is not linear in y, try dx/dy instead.", "For y dx − (x + 2y²) dy = 0, dx/dy = x/y + 2y is linear in x."] }],
    },
    limits: "Three forms with whole-number data; Bernoulli equations are left out.",
  },
  {
    id: "armix",
    arity: 4,
    title: "A mixing (tank) problem with a differential equation",
    competency: ODE,
    skill: "mixture problems",
    type: "expression",
    mc: true,
    // [i, r, c, q]: tank of MIX_V[i] litres, brine of c g/L in at r L/min (c = 0: fresh water), mixture out at r L/min, q × 10 g of salt at the start
    parse: none,
    reject: (p) => (mixOk(p) ? null : "A tank with whole-number volume, flow rate, concentration and starting amount."),
    prompt: ([i, r, c, q]) => `A tank holds ${MIX_V[i]} litres of ${q ? `salt water containing ${10 * q} g of salt` : "fresh water"}. ${c ? `Salt water containing ${c} g of salt per litre` : "Fresh water"} flows in at ${r} litres per minute, and the well-stirred mixture flows out at the same rate. Find the amount of salt Q (in grams) in the tank after t minutes, as an expression in t.`,
    solve: (p) => {
      const [i, r, c, q] = p;
      const V = MIX_V[i];
      return { steps: [st("model", "model", ODE, [r, c, V], `dQ/dt = ${r * c} − Q/${V / r}`), st("solve", "solve", LDE, [V / r], `Q = ${V * c} + Ce^(−t/${V / r})`), st("constant", "evaluate", DE, [10 * q], mixAns(p))], answer: mixAns(p) };
    },
    // independent: a Runge–Kutta solution of dQ/dt = (rate in) − (rate out) from the starting amount
    validate: ([i, r, c, q], v) => {
      const n = node(v);
      if (!n) return false;
      const V = MIX_V[i];
      return [5, 20, 45].every((T) => {
        const want = rk4((Q) => r * c - (r / V) * Q, 10 * q, T);
        const got = ev(n, { t: T });
        return Number.isFinite(got) && Math.abs(got - want) < 1e-6 * Math.max(1, Math.abs(want));
      });
    },
    bugs: (p) => {
      const [i, r, c, q] = p;
      const V = MIX_V[i];
      const k = V / r;
      const ans = mixAns(p);
      const out: Bug[] = [
        bug("not-per-litre", "conceptual", ODE, `The salt leaving each minute was taken as ${r}Q instead of ${r} × Q/${V}; the outflow carries the concentration Q/${V} grams per litre.`, sum([[c, ""], [10 * q - c, `e^(−${r}t)`]])),
        bug("exponent-sign", "procedural", ODE, `The exponential was written e^(t/${k}); the amount approaches its long-run value, so the exponent is negative.`, sum([[V * c, ""], [10 * q - V * c, `e^(t/${k})`]])),
      ];
      if (c && q !== V * c / 10) out.push(bug("start-only", "conceptual", ODE, `Only the salt already in the tank was followed (as if fresh water flowed in); the incoming salt water adds ${r * c} g per minute, so Q tends to ${V * c} g.`, sum([[10 * q, `e^(−t/${k})`]])));
      return out.filter((x) => x.predict !== ans);
    },
    variants: () => [],
    explain: (s) => (s.id === "model" ? `Rate in − rate out: ${s.value}` : s.id === "solve" ? `This is linear: ${s.value}` : `Use Q(0) = ${s.inputs[0]}: Q = ${s.value}`),
    domain: [[0, 4], [1, 20], [0, 5], [0, 30]],
    keep: (p) => mixOk(p),
    cap: 300,
    difficulty: ([, , c, q]) => (c === 0 || q === 0 ? 1 : 2),
    teach: {
      idea: "In a mixing problem the amount of salt Q changes at (rate in) − (rate out). Salt comes in at (inflow rate) × (incoming concentration) and leaves at (outflow rate) × Q/V, because the mixture's concentration is Q/V.",
      method: "Write dQ/dt = r c − (r/V)Q, solve it (separable or linear): Q = Vc + Ce^(−rt/V), and use the starting amount to find C.",
      alternatives: [{ id: "long_run", title: "Think about the long run", kind: "conceptual", text: ["After a long time the tank is full of incoming water, so Q → V c.", "The difference from that value shrinks by the same factor every minute: an exponential decay."] }],
    },
    limits: "One tank with equal inflow and outflow rates; tanks whose volume changes are left out.",
  },
];

/** A t = 0 or t = 1 conic-area answer scaled by a factor (for wrong options). */
function carAnsScaled([t, u, v]: number[], f: number): string {
  if (t === 0) {
    const [k, m] = sqf(u * v);
    const [n, d] = ratio((4 * v * k * f) / 3);
    return surdC(n, d, m);
  }
  return rat(...ratio((v ** 3 * f) / (6 * u * u)));
}

// ---------------------------------------------------------------- gap@1 helpers

/** FNV-1a hash (a fixed, parameter-dependent order of options). */
const hash = (t: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) x = Math.imul(x ^ t.charCodeAt(i), 0x01000193) >>> 0;
  return x;
};
const mix = (xs: string[], key: string) => [...xs].sort((a, b) => hash(`${key}:${a}`) - hash(`${key}:${b}`) || (a < b ? -1 : 1));
/** Root of g on [lo, hi] by bisection (g changes sign there). */
function bisect(g: (x: number) => number, lo: number, hi: number): number {
  let [a, b] = [lo, hi];
  let ga = g(a);
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    const gm = g(m);
    if (ga * gm <= 0) b = m;
    else {
      a = m;
      ga = gm;
    }
  }
  return (a + b) / 2;
}
const dec2 = (x: number) => mn(String(Math.round(x * 1000) / 1000));

// sections of a double cone (arcone)
const CONE_NAMES = ["a circle", "an ellipse", "a parabola", "a hyperbola", "a single point (the vertex)", "a single straight line (along a slant side of the cone)", "a pair of intersecting straight lines"];
function coneCat([a, b, v]: number[]): number {
  if (!v) return b === 18 ? 0 : b > a ? 1 : b === a ? 2 : 3;
  return b > a ? 4 : b === a ? 5 : 6;
}
function coneChoices(p: number[]): string[] {
  const cat = coneCat(p);
  const list = p[2] ? [4, 5, 6, cat === 4 ? (p[1] === 18 ? 0 : 1) : cat === 5 ? 2 : 3] : [0, 1, 2, 3];
  return mix(list.map((i) => CONE_NAMES[i]), `cone:${p}`);
}

// circles (arcirceq, arcircpos)
const CE_R2 = [5, 10, 13, 25];
const lattice = (R2: number) => {
  const out: [number, number][] = [];
  for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) if (x * x + y * y === R2) out.push([x, y]);
  return out.sort((P, Q) => Math.atan2(P[1], P[0]) - Math.atan2(Q[1], Q[0]));
};
function ceThree([, h, k, a, b]: number[]): [number, number][] {
  const L = lattice(CE_R2[a]);
  return [b, b + 2, b + 5].map((i) => L[i % L.length]).map(([x, y]) => [h + x, k + y]);
}
const ceOk = (p: number[]) => {
  const [kind, h, k, a, b, c] = p;
  if (c !== 0 || Math.abs(h) > 4 || Math.abs(k) > 4) return false;
  if (kind === 0) return a >= 1 && a <= 8 && b === 0;
  if (kind === 1) return (a !== 0 || b !== 0) && Math.abs(a) <= 3 && Math.abs(b) <= 3;
  if (kind === 2) return a > 0 && b !== 0 && a <= 3 && Math.abs(b) <= 3;
  if (kind === 3) return a >= 0 && a <= 3 && b >= 0 && b <= 5;
  return false;
};
function ceR2([kind, , , a, b]: number[]): number {
  if (kind === 0) return a * a;
  if (kind === 3) return CE_R2[a];
  return a * a + b * b;
}
const ceEq = (h: number, k: number, R2: number) => sum([[1, "x²"], [1, "y²"], [-2 * h, "x"], [-2 * k, "y"], [h * h + k * k - R2, ""]]);
const ceEq2 = (h: number, k: number, c: number) => sum([[1, "x²"], [1, "y²"], [-2 * h, "x"], [-2 * k, "y"], [c, ""]]);
function cePrompt(p: number[]): string {
  const [kind, h, k, a, b] = p;
  if (kind === 0) return `Find the equation of the circle with centre ${tup(h, k)} and radius ${a}.`;
  if (kind === 1) return `Find the equation of the circle with centre ${tup(h, k)} that passes through the point ${tup(h + a, k + b)}.`;
  if (kind === 2) return `Find the equation of the circle drawn on the segment joining A${tup(h + a, k + b)} and B${tup(h - a, k - b)} as a diameter.`;
  const [P, Q, R] = ceThree(p);
  return `Find the equation of the circle passing through the points ${tup(...P)}, ${tup(...Q)} and ${tup(...R)}.`;
}
/** Points that must lie on the circle: at the radius in three directions; the given point and its mirror images in lines through the centre; the ends of the diameter and the two corners that see it at a right angle; the three given points. */
function cePoints(p: number[]): [number, number][] {
  const [kind, h, k, a, b] = p;
  if (kind === 0) return [0.3, 2, 4].map((t) => [h + a * Math.cos(t), k + a * Math.sin(t)]);
  if (kind === 1) return [[h + a, k + b], [h - a, k + b], [h + a, k - b], [h - a, k - b]];
  if (kind === 2) return [[h + a, k + b], [h - a, k - b], [h + a, k - b], [h - a, k + b]];
  return ceThree(p);
}
const CP_NAMES = ["inside the circle", "on the circle", "outside the circle"];
const cpChoices = (p: number[]) => mix(CP_NAMES, `cpos:${p}`);

// parts of a conic (arconprop)
const CP_E = [[5, 4, 3], [5, 3, 4], [13, 12, 5], [13, 5, 12], [10, 8, 6], [10, 6, 8], [17, 15, 8], [17, 8, 15]];
const CP_H = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [15, 8, 17]];
const VERT = [[0, 0], [1, 2], [-2, 1], [3, -1]];
const PARA_N = [2, 3, 4, 5, 6, 8, 10, 12, 16];
const cpOkk = ([kind, o, i, s, ask, f]: number[]) => {
  if (o < 0 || o > 1) return false;
  if (kind === 0) return PARA_N.includes(i) && (s === 0 || s === 1) && f >= 0 && f <= 1 && ask >= 0 && ask <= 3 && (ask !== 3 || f >= 1);
  return (kind === 1 || kind === 2) && i >= 0 && i <= 7 && s === 0 && ask >= 0 && ask <= 5 && f >= 0 && f <= 1;
};
const cpN = ([, , i, s]: number[]) => (s ? -i : i);
const cpVertex = (p: number[]) => VERT[p[5]];
const cpABC = ([kind, , i]: number[]) => (kind === 1 ? CP_E[i] : CP_H[i]);
function cpEq(p: number[]): string {
  const [kind, o, , s, , f] = p;
  if (kind === 0) return paraEq([o, s, p[2], ...cpVertex(p)]);
  const [A, B] = cpABC(p);
  const [X, Y] = o ? [B, A] : [A, B];
  if (kind === 1) return f ? `${Y * Y}x² + ${X * X}y² = ${X * X * Y * Y}` : `x²/${X * X} + y²/${Y * Y} = 1`;
  if (o) return f ? `${B * B}y² − ${A * A}x² = ${A * A * B * B}` : `y²/${A * A} − x²/${B * B} = 1`;
  return f ? `${B * B}x² − ${A * A}y² = ${A * A * B * B}` : `x²/${A * A} − y²/${B * B} = 1`;
}
function cpQuestion([kind, o, , , ask]: number[]): string {
  const v = o ? "y" : "x";
  if (kind === 0) return ["find the length of its latus rectum", `its directrix is the line ${v} = d; find d`, "find the distance between its focus and its directrix", `its axis is the line ${o ? "x" : "y"} = d; find d`][ask];
  return ["find the length of its latus rectum", `its directrices are the lines ${v} = ±d, with d > 0; find d`, "find the distance between its foci", `find the length of its ${kind === 1 ? "major" : "transverse"} axis`, `find the length of its ${kind === 1 ? "minor" : "conjugate"} axis`, `one of its vertices is ${o ? "(0, d)" : "(d, 0)"} with d > 0; find d`][ask];
}
function cpAnswer(p: number[]): number {
  const [kind, o, , , ask] = p;
  if (kind === 0) {
    const N = cpN(p);
    const [h, k] = cpVertex(p);
    return [Math.abs(N), (o ? k : h) - N / 4, Math.abs(N) / 2, o ? h : k][ask];
  }
  const [A, B, C] = cpABC(p);
  return [(2 * B * B) / A, (A * A) / C, 2 * C, 2 * A, 2 * B, A][ask];
}
/** The asked measurement found numerically from the curve itself (in coordinates along and across its axis). */
function cpNumeric(p: number[]): number {
  const [kind, o, , , ask] = p;
  if (kind === 0) {
    const n = cpN(p);
    const [h, k] = cpVertex(p);
    // v² = n u with the vertex at the origin; the focus (fa, 0) is where a point of the curve is as far from it as from u = −fa
    const P = [1 / n, 1];
    const fa = bisect((t) => Math.hypot(P[0] - t, P[1]) - Math.abs(P[0] + t), n > 0 ? 1e-9 : -100, n > 0 ? 100 : -1e-9);
    const half = bisect((v) => v * v - n * fa, 0, 100);
    return [2 * half, (o ? k : h) - fa, 2 * Math.abs(fa), o ? h : k][ask];
  }
  const [A0, B0] = cpABC(p);
  // the curve u²/A0² ± v²/B0² = 1 as written; everything else is measured on it
  const G = (u: number, v: number) => (u * u) / (A0 * A0) + (kind === 1 ? 1 : -1) * ((v * v) / (B0 * B0)) - 1;
  const a = bisect((u) => G(u, 0), 0.01, 100);
  if (kind === 1) {
    const b = bisect((v) => G(0, v), 0.01, 100);
    const c = bisect((t) => 2 * Math.hypot(b, t) - 2 * a, 0, a);
    const lr = 2 * bisect((v) => G(c, v), 0, 100);
    const d = bisect((t) => (a - c) / (t - a) - a / t, a + 1e-9, 1000 * a);
    return [lr, d, 2 * c, 2 * a, 2 * b, a][ask];
  }
  const v2 = bisect((v) => G(2 * a, v), 0, 1000);
  const c = bisect((t) => Math.abs(Math.hypot(2 * a + t, v2) - Math.hypot(2 * a - t, v2)) - 2 * a, a + 1e-9, 20 * a);
  const far = 1e6 * a;
  const b = (bisect((v) => G(far, v), 0, 1e9) / far) * a;
  const lr = 2 * bisect((v) => G(c, v), 0, 1000);
  const d = bisect((t) => (c - a) / (a - t) - Math.hypot(2 * a - c, v2) / (2 * a - t), 1e-9, a - 1e-9);
  return [lr, d, 2 * c, 2 * a, 2 * b, a][ask];
}

// the equation of an ellipse or hyperbola from data (arconeq)
const cqABC = ([kind, , i, , m]: number[]) => (kind === 1 ? CP_E[i] : CP_H[i]).map((x) => x * m);
const cqOk = ([kind, o, i, data, m]: number[]) => (kind === 1 || kind === 2) && (o === 0 || o === 1) && i >= 0 && i <= 7 && data >= 0 && data <= 3 && (m === 1 || m === 2) && Math.max(...cqABC([kind, o, i, data, m])) <= 20;
function cqAB(p: number[]): [number, number] {
  const [a, b] = cqABC(p);
  return p[0] === 1 && p[1] ? [b * b, a * a] : [a * a, b * b];
}
const cqForm = ([kind, o]: number[]) => (kind === 1 ? "x²/A + y²/B = 1" : o ? "y²/A − x²/B = 1" : "x²/A − y²/B = 1");
/** A point of the curve (along, across) with cos θ = 3/5 (ellipse) or sec θ = 5/3 (hyperbola). */
const cqPoint = (p: number[]): [number, number] => {
  const [a, b] = cqABC(p);
  return p[0] === 1 ? [(3 * a) / 5, (4 * b) / 5] : [(5 * a) / 3, (4 * b) / 3];
};
const onAxis = (o: number, u: number, v: number) => (o ? tup(v, u) : tup(u, v));
function cqData(p: number[]): string {
  const [kind, o, , data] = p;
  const [a, b, c] = cqABC(p);
  const name = kind === 1 ? "An ellipse" : "A hyperbola";
  const F = o ? `(0, ±${c})` : `(±${c}, 0)`;
  const V = o ? `(0, ±${a})` : `(±${a}, 0)`;
  if (data === 0) return `${name} has foci ${F} and vertices ${V}.`;
  if (data === 1) return `${name} has vertices ${V} and eccentricity ${rat(c, a)}.`;
  if (data === 2) return `${name} has foci ${F} and passes through the point ${onAxis(o, ...cqPoint(p))}.`;
  return `${name} has foci ${F} and a latus rectum of length ${rat(2 * b * b, a)}.`;
}
/** Points of the curve with these (A, B) satisfy the focal property fixed by the data. */
function cqCheck(p: number[], A: number, B: number): boolean {
  const [kind, o, , data] = p;
  const [a, b, c] = cqABC(p);
  // along-axis and across-axis squares of the candidate
  const [UA, VB] = kind === 1 && o ? [B, A] : [A, B];
  const focus = data === 1 ? a * (c / a) : c;
  const pts: [number, number][] = [0.2, 0.9, 1.7, 2.6].map((t) => (kind === 1 ? [Math.sqrt(UA) * Math.cos(t), Math.sqrt(VB) * Math.sin(t)] : [Math.sqrt(UA) * Math.cosh(t - 1), Math.sqrt(VB) * Math.sinh(t - 1)]));
  const val = ([u, v]: [number, number]) => {
    const d1v = Math.hypot(u - focus, v);
    const d2v = Math.hypot(u + focus, v);
    return kind === 1 ? d1v + d2v : Math.abs(d1v - d2v);
  };
  let want: number;
  if (data <= 1) want = 2 * a;
  else if (data === 2) {
    const P = cqPoint(p);
    const onC = (P[0] * P[0]) / UA + (kind === 1 ? 1 : -1) * ((P[1] * P[1]) / VB);
    if (Math.abs(onC - 1) > 1e-9) return false;
    want = val(P);
  } else {
    const P: [number, number] = [focus, (b * b) / a];
    const onC = (P[0] * P[0]) / UA + (kind === 1 ? 1 : -1) * ((P[1] * P[1]) / VB);
    if (Math.abs(onC - 1) > 1e-9) return false;
    want = val(P);
  }
  return pts.every((q) => Math.abs(val(q) - want) < 1e-9 * (1 + want));
}

// the equation of a parabola from data (arparaeq)
const peOk = ([kind, o, u, v]: number[]) => {
  if (o !== 0 && o !== 1) return false;
  if (kind === 0 || kind === 1) return u !== 0 && Math.abs(u) <= 12 && v === 0;
  if (kind === 2) return u !== 0 && v !== 0 && Math.abs(u) <= 6 && Math.abs(v) <= 6;
  if (kind === 3) return u >= 1 && u <= 12 && (v === 0 || v === 1);
  return false;
};
function peK([kind, o, u, v]: number[]): number {
  if (kind === 0) return 4 * u;
  if (kind === 1) return -4 * u;
  if (kind === 2) return o ? (u * u) / v : (v * v) / u;
  return v ? -u : u;
}
function pePrompt([kind, o, u, v]: number[]): string {
  const ax = o ? "y" : "x";
  if (kind === 0) return `A parabola has its vertex at the origin and its focus at ${o ? tup(0, u) : tup(u, 0)}.`;
  if (kind === 1) return `A parabola has its vertex at the origin and its directrix is the line ${ax} = ${nf(u)}.`;
  if (kind === 2) return `A parabola has its vertex at the origin, its axis along the ${ax}-axis, and passes through the point ${tup(u, v)}.`;
  return `A parabola has its vertex at the origin and its axis along the ${ax}-axis; its latus rectum has length ${u}, and it opens towards the ${v ? "negative" : "positive"} ${ax}-direction.`;
}
/** Points (along, across) = (t²/k, t) of v² = k u checked against the data. */
function peCheck([kind, o, u, v]: number[], k: number): boolean {
  const pts = [-2, 0.7, 1.9].map((t) => [(t * t) / k, t]);
  if (kind === 0) return pts.every(([x, y]) => Math.abs(Math.hypot(x - u, y) - Math.abs(x + u)) < 1e-9);
  if (kind === 1) return pts.every(([x, y]) => Math.abs(Math.hypot(x + u, y) - Math.abs(x - u)) < 1e-9);
  if (kind === 2) {
    const [al, ac] = o ? [v, u] : [u, v];
    return Math.abs(ac * ac - k * al) < 1e-9;
  }
  const P = pts[2];
  const fa = bisect((t) => Math.hypot(P[0] - t, P[1]) - Math.abs(P[0] + t), k > 0 ? 1e-9 : -100, k > 0 ? 100 : -1e-9);
  const half = bisect((y) => y * y - k * fa, 0, 100);
  return Math.abs(2 * half - u) < 1e-7 && (fa < 0) === (v === 1);
}

// conics in real life (arconapp)
function caTerm(x: number): boolean {
  if (!Number.isFinite(x)) return false;
  let d: number;
  try {
    d = ratio(x)[1];
  } catch {
    return false;
  }
  for (const q of [2, 5]) while (d % q === 0) d /= q;
  return d === 1;
}
const caAppOk = (p: number[]) => {
  const [kind, u, v, w, z] = p;
  if (kind === 0) return u >= 2 && u <= 20 && v >= 2 && v <= 12 && w >= 1 && w < u && z === 0 && caTerm(caAppAnswer(p));
  if (kind === 1) return u >= 10 && u <= 40 && u % 2 === 0 && v >= 2 && v <= 12 && w === 1 && z === 0 && caTerm(caAppAnswer(p));
  if (kind === 2) return u === 2 && v >= 2 && v <= 12 && (w === 3 || w === 4) && z >= 1 && z <= 6;
  if (kind === 3) return u >= 10 && u <= 40 && u % 5 === 0 && v >= 6 && v <= 12 && w >= 1 && w < v && z >= 1 && z <= 6 && caTerm(caAppAnswer(p));
  if (kind === 4) return u >= 2 && u <= 40 && v >= 1 && v <= 9 && (w === 1 || w === 2) && z === 0;
  return false;
};
function caAppAnswer(p: number[]): number {
  return Math.round(caAppRaw(p) * 1e9) / 1e9;
}
function caAppRaw([kind, u, v, w, z]: number[]): number {
  if (kind === 0) return v * (1 - (w * w) / (u * u));
  if (kind === 1) return (u * u) / (16 * v);
  if (kind === 2) return (v * (w === 3 ? 4 : 3)) / 5;
  if (kind === 3) return w + ((v - w) * z * z) / (u * u);
  return u * (1 + (w === 2 ? 1 : -1) * (v / 10));
}
function caAppPrompt([kind, u, v, w, z]: number[]): string {
  if (kind === 0) return `A parabolic arch over a temple gateway in Madurai is ${2 * u} m wide at the ground and ${v} m high at its centre. How high is the arch, in metres, at a point ${w} m from the centre (measured along the ground)?`;
  if (kind === 1) return `A dish antenna (a paraboloid) is ${u} cm across its rim and ${v} cm deep at its centre. The receiver must be at the focus. How far from the centre of the dish (its vertex), in cm, should the receiver be placed?`;
  if (kind === 2) return `A bridge over a canal in Kochi has a semi-elliptical arch ${10 * z} m wide at the water level and ${v} m high at its centre. How high is the arch, in metres, at a point ${w * z} m from the centre?`;
  if (kind === 3) return `The cable of a suspension bridge hangs in a parabola between two towers ${2 * u} m apart. It is ${v} m above the road at the towers and ${w} m above the road at the centre of the bridge. How high above the road, in metres, is the cable at a point ${z} m from the centre?`;
  return `A comet moves in an elliptical orbit with the Sun at one focus. The major axis of the orbit is ${2 * u} million km long and the eccentricity is ${dec2(v / 10)}. Find the comet's ${w === 2 ? "greatest" : "least"} distance from the Sun, in million km.`;
}
function caAppNumeric([kind, u, v, w, z]: number[]): number {
  // the parabola through three points, by Lagrange interpolation
  const through = (pts: [number, number][], x: number) => pts.reduce((s, [xi, yi], i) => s + yi * pts.reduce((m, [xj], j) => (j === i ? m : (m * (x - xj)) / (xi - xj)), 1), 0);
  if (kind === 0) return through([[-u, 0], [u, 0], [0, v]], w);
  if (kind === 3) return through([[-u, v], [u, v], [0, w]], z);
  if (kind === 1) {
    const R = u / 2;
    return bisect((f) => Math.hypot(R, v - f) - (v + f), 1e-9, 1000);
  }
  if (kind === 2) {
    const a = 5 * z;
    return bisect((y) => (w * z) ** 2 / (a * a) + (y * y) / (v * v) - 1, 0, v);
  }
  const e = v / 10;
  const b = u * Math.sqrt(1 - e * e);
  let best = w === 2 ? -Infinity : Infinity;
  for (let i = 0; i <= 3600; i++) {
    const t = (i * Math.PI) / 1800;
    const d = Math.hypot(u * Math.cos(t) - u * e, b * Math.sin(t));
    best = w === 2 ? Math.max(best, d) : Math.min(best, d);
  }
  return best;
}

// classifying Ax² + Bxy + Cy² + Dx + Ey + F = 0 (arxyconic)
const XC_NAMES = ["an ellipse", "a parabola", "a hyperbola", "a circle"];
const XC_DE = [[0, 0], [2, 0], [0, -2], [2, -4], [-4, 2], [4, 4], [-2, -6], [6, -2], [-6, 0]];
function xcCoefs([t, p, q, s, e]: number[]): number[] {
  const [D, E] = XC_DE[e];
  if (t === 1) return [p * p, 2 * p * q * Math.sign(s), q * q, D, E, -12];
  return [p, s, t === 3 ? -q : q, D, E, -12];
}
const xcOk = (P: number[]) => {
  const [t, p, q, s, e] = P;
  if (t < 0 || t > 3 || p < 1 || p > 4 || q < 1 || q > 4 || s === 0 || Math.abs(s) > 6 || e < 0 || e > 8) return false;
  if (t === 1 && Math.abs(s) !== 1) return false;
  if (t === 0 && s * s >= 4 * p * q) return false;
  if (t === 2 && s * s <= 4 * p * q) return false;
  const [A, B, C, D, E, F] = xcCoefs(P);
  const det = A * (C * F - (E * E) / 4) - (B / 2) * ((B / 2) * F - (E * D) / 4) + (D / 2) * ((B / 2) * (E / 2) - C * (D / 2));
  if (Math.abs(det) < 1e-9) return false;
  if (t === 0) {
    // real ellipse: the value at the centre is negative
    const den = 4 * A * C - B * B;
    const xc = (B * E - 2 * C * D) / den;
    const yc = (B * D - 2 * A * E) / den;
    if ((D * xc + E * yc) / 2 + F >= 0) return false;
  }
  return true;
};
const xcEq = (P: number[]) => {
  const [A, B, C, D, E, F] = xcCoefs(P);
  return `${sum([[A, "x²"], [B, "xy"], [C, "y²"], [D, "x"], [E, "y"], [F, ""]])} = 0`;
};
const xcChoices = (P: number[]) => mix(XC_NAMES, `xc:${P}`);
/** Shape from the curve's points: bounded (0), running off one way (1), or two opposite ways (2). */
function xcShape(P: number[]): number {
  const [A, B, C, D, E, F] = xcCoefs(P);
  const far: [number, number][] = [];
  let any = false;
  for (let i = -1200; i <= 1200; i++) {
    const x = i / 4;
    const qa = C;
    const qb = B * x + E;
    const qc = A * x * x + D * x + F;
    const ys: number[] = [];
    if (Math.abs(qa) < 1e-12) {
      if (Math.abs(qb) > 1e-12) ys.push(-qc / qb);
    } else {
      const disc = qb * qb - 4 * qa * qc;
      if (disc >= 0) ys.push((-qb + Math.sqrt(disc)) / (2 * qa), (-qb - Math.sqrt(disc)) / (2 * qa));
    }
    for (const y of ys) {
      any = true;
      const r = Math.hypot(x, y);
      if (r > 60) far.push([x / r, y / r]);
    }
  }
  if (!any) return -1;
  if (!far.length) return 0;
  return far.some((u) => far.some((w) => u[0] * w[0] + u[1] * w[1] < -0.5)) ? 2 : 1;
}

// Rolle's theorem (arrolle)
const rolleQ = ([p, a, b]: number[]) => -(a * a + a * b + b * b + p * (a + b));
const rolleOk = (P: number[]) => {
  const [p, a, b] = P;
  return p >= -4 && p <= 4 && a >= -4 && b > a && b - a <= 6 && b <= 5 && Math.abs(rolleQ(P)) <= 30;
};

// Taylor series about a (artaylor)
const TY_POLY = [0, 0, -3, 2, 1];
const binom = (n: number, k: number) => {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
};
const tyCentre = ([f, a]: number[]) => (f === 3 ? a * a : a);
const tyName = ([f]: number[]) => ["x⁴ + 2x³ − 3x²", "1/x", "log x", "√x", "x⁵"][f];
const tyPow = (p: number[]) => {
  const c = tyCentre(p);
  const base = c === 0 ? "x" : `(x ${c < 0 ? "+" : "−"} ${Math.abs(c)})`;
  return p[2] === 1 ? base : `${base}${sup(p[2])}`;
};
function tyCoef(p: number[]): number {
  const [f, a, k] = p;
  const c = tyCentre(p);
  if (f === 0) return TY_POLY.reduce((s, cj, j) => (j >= k ? s + cj * binom(j, k) * c ** (j - k) : s), 0);
  if (f === 1) return (-1) ** k / c ** (k + 1);
  if (f === 2) return (-1) ** (k + 1) / (k * c ** k);
  if (f === 3) return binom(0.5, k) * a ** (1 - 2 * k);
  return binom(5, k) * c ** (5 - k);
}
const tyMac = ([f, , k]: number[]) => (f === 0 ? TY_POLY[k] : NaN);
const tyOk = (p: number[]) => {
  const [f, a, k] = p;
  if (k < 1 || k > 4) return false;
  const ok = f === 0 ? a >= -3 && a <= 3 : f === 1 ? a !== 0 && a >= -3 && a <= 5 : f === 2 ? a >= 1 && a <= 5 : f === 3 ? a >= 1 && a <= 4 : f === 4 ? a !== 0 && a >= -3 && a <= 5 : false;
  return ok && tyCoef(p) !== 0 && !fmt(tyCoef(p)).includes(".");
};
const csqrt = ([x, y]: C): C => {
  const r = Math.sqrt(Math.hypot(x, y));
  const t = Math.atan2(y, x) / 2;
  return [r * Math.cos(t), r * Math.sin(t)];
};
const cpowi = (z: C, n: number): C => {
  let out: C = [1, 0];
  for (let i = 0; i < n; i++) out = cmul(out, z);
  return out;
};
function tyComplex([f]: number[]): (z: C) => C {
  if (f === 0) return (z) => {
    const [a, b, c] = [cpowi(z, 4), cpowi(z, 3), cpowi(z, 2)];
    return [a[0] + 2 * b[0] - 3 * c[0], a[1] + 2 * b[1] - 3 * c[1]];
  };
  if (f === 1) return (z) => cdiv([1, 0], z);
  if (f === 2) return clog;
  if (f === 3) return csqrt;
  return (z) => cpowi(z, 5);
}

// l'Hôpital for other forms (arlhinf)
const LHI_FORM = ["∞/∞", "0 × ∞", "0 × ∞", "0 × ∞", "∞ − ∞", "∞ − ∞"];
const lhiOk = ([f, a, b]: number[]) => f >= 0 && f <= 5 && a >= 1 && a <= 6 && b >= 1 && b <= (f === 0 ? 6 : 4) && (f !== 4 || a >= 2);
const lhiQuad = ([, a, b]: number[]) => [a, b - 3, a + 1, b, 3 - a, 2 * b + 1];
function lhiExpr(p: number[]): string {
  const [f, a, b] = p;
  const B = b === 1 ? "" : String(b);
  if (f === 0) {
    const [P, Q, R, S, T, U] = lhiQuad(p);
    return `lim (x → ∞) of (${sum([[P, "x²"], [Q, "x"], [R, ""]])})/(${sum([[S, "x²"], [T, "x"], [U, ""]])})`;
  }
  if (f === 1) return `lim (x → ∞) of ${B}x sin(${a}/x)`;
  if (f === 2) return `lim (x → 0) of ${B}x cot ${ax(a)}`;
  if (f === 3) return `lim (x → ∞) of ${B}x(e^(${a}/x) − 1)`;
  if (f === 4) return `lim (x → 1) of ${B}${B ? "(" : ""}1/(x − 1) − ${a}/(x${sup(a)} − 1)${B ? ")" : ""}`;
  return `lim (x → 0) of ${B}${B ? "(" : ""}1/x − ${a}/(e^(${ax(a)}) − 1)${B ? ")" : ""}`;
}
function lhiAnswer([f, a, b]: number[]): number {
  return [a / b, a * b, b / a, a * b, (b * (a - 1)) / 2, (a * b) / 2][f];
}
function lhiNumeric(p: number[]): number {
  const [f, a, b] = p;
  const [P, Q, R, S, T, U] = lhiQuad(p);
  const g = [
    (x: number) => (P * x * x + Q * x + R) / (S * x * x + T * x + U),
    (x: number) => b * x * Math.sin(a / x),
    (x: number) => (b * x) / Math.tan(a * x),
    (x: number) => b * x * Math.expm1(a / x),
    (x: number) => b * (1 / (x - 1) - a / (x ** a - 1)),
    (x: number) => b * (1 / x - a / Math.expm1(a * x)),
  ][f];
  if (f === 0 || f === 1 || f === 3) {
    const G = (h: number) => g(1 / h);
    const h = 1e-3;
    return (8 * G(h / 4) - 6 * G(h / 2) + G(h)) / 3;
  }
  const c = f === 4 ? 1 : 0;
  const G = (h: number) => (g(c + h) + g(c - h)) / 2;
  const h = 1e-2;
  return (4 * G(h / 2) - G(h)) / 3;
}

// continuity in two variables (armvcont)
type Mvc = { text: (a: number) => string; fn: (a: number) => (x: number, y: number) => number; limit: (a: number) => number | null; axis: (a: number) => number; path: string };
const k1 = (a: number) => (a === 1 ? "" : String(a));
const MVC: Mvc[] = [
  { text: (a) => `${k1(a)}x²y/(x² + y²)`, fn: (a) => (x, y) => (a * x * x * y) / (x * x + y * y), limit: () => 0, axis: () => 0, path: "" },
  { text: (a) => `${k1(a)}(x³ + y³)/(x² + y²)`, fn: (a) => (x, y) => (a * (x ** 3 + y ** 3)) / (x * x + y * y), limit: () => 0, axis: () => 0, path: "" },
  { text: (a) => `${k1(a)}(x⁴ − y⁴)/(x² + y²)`, fn: (a) => (x, y) => (a * (x ** 4 - y ** 4)) / (x * x + y * y), limit: () => 0, axis: () => 0, path: "" },
  { text: (a) => `${k1(a)}sin(x² + y²)/(x² + y²)`, fn: (a) => (x, y) => (a * Math.sin(x * x + y * y)) / (x * x + y * y), limit: (a) => a, axis: (a) => a, path: "" },
  { text: (a) => `${k1(a)}xy/(x² + y²)`, fn: (a) => (x, y) => (a * x * y) / (x * x + y * y), limit: () => null, axis: () => 0, path: "Only the axes were tried; along them the values are 0, but along the line y = x they tend to a different number" },
  { text: (a) => `${k1(a)}(x² − y²)/(x² + y²)`, fn: (a) => (x, y) => (a * (x * x - y * y)) / (x * x + y * y), limit: () => null, axis: (a) => a, path: "Only the x-axis was tried; along it the values tend to that number, but along the y-axis they tend to its negative" },
  { text: (a) => `(e^(${k1(a)}(x² + y²)) − 1)/(x² + y²)`, fn: (a) => (x, y) => Math.expm1(a * (x * x + y * y)) / (x * x + y * y), limit: (a) => a, axis: (a) => a, path: "" },
  { text: (a) => `${k1(a)}xy²/(x² + y⁴)`, fn: (a) => (x, y) => (a * x * y * y) / (x * x + y ** 4), limit: () => null, axis: () => 0, path: "Only straight lines through the origin were tried; along every one of them the values tend to 0, but along the curve x = y² they tend to a different number" },
];
const MVC_NAMES = ["f is continuous at (0, 0)", "f is not continuous at (0, 0): the limit exists but is not equal to f(0, 0)", "f is not continuous at (0, 0): the limit does not exist"];
const mvcChoices = (p: number[]) => mix(MVC_NAMES, `mvc:${p}`);

// linear approximation in two variables (arlinapp2)
const LA_D: [number, number][] = [[0.1, 0.2], [-0.1, 0.1], [0.2, -0.1], [0.05, 0.1], [-0.2, -0.1], [0.1, -0.05], [0.02, 0.1], [-0.05, 0.2]];
const la2Ok = ([a, b, c, x0, y0, d, ask]: number[]) => {
  if ((a === 0 && b === 0) || (b === 0 && c === 0) || (a === 0 && c === 0)) return false;
  const fx = 2 * a * x0 + b * y0;
  const fy = b * x0 + 2 * c * y0;
  return fx !== 0 && fy !== 0 && Math.abs(a * x0 * x0 + b * x0 * y0 + c * y0 * y0) <= 80 && d >= 0 && d <= 7 && (ask === 0 || ask === 1);
};
function la2Answer([a, b, c, x0, y0, d, ask]: number[]): number {
  const [dx, dy] = LA_D[d];
  const fx = 2 * a * x0 + b * y0;
  const fy = b * x0 + 2 * c * y0;
  const df = fx * dx + fy * dy;
  return Math.round((ask ? df : a * x0 * x0 + b * x0 * y0 + c * y0 * y0 + df) * 1e6) / 1e6;
}

// chain rule (archain)
const chOk = (P: number[]) => {
  const [a, b, c, p, u, v, t0] = P;
  if (p === 0 || (a === 0 && b === 0 && c === 0) || (b === 0 && (a === 0 || c === 0))) return false;
  const x = p * t0 + u;
  const y = t0 * t0 + v;
  const ans = (2 * a * x + b * y) * p + (b * x + 2 * c * y) * 2 * t0;
  return Math.abs(ans) <= 400 && t0 !== 0;
};

// the dx/dy form (arlindx)
const ldxOk = ([f, a, b, c]: number[]) => {
  if (c < -3 || c > 4) return false;
  if (f === 0) return a >= 1 && a <= 4 && b !== 0 && Math.abs(b) <= 5 && c * a !== b;
  if (f === 1) return a >= 1 && a <= 3 && b >= 0 && b <= 3 && Math.abs(c - 1 / (a + b + 1)) > 1e-9;
  if (f === 2) return a >= 1 && a <= 3 && b >= 1 && b <= 3 && Math.abs(c - a / b) > 1e-9;
  return false;
};
function ldxAns([f, a, b, c]: number[]): string {
  if (f === 0) return sum([[b / a, ""], [c - b / a, `e^(−${ax(a, "y")})`]]);
  if (f === 1) {
    const E = 1 / (a + b + 1);
    return sum([[E, pw("y", b + 1)], [c - E, pw("y", -a)]]);
  }
  return sum([[a / b, pw("y", b + 1)], [c - a / b, "y"]]);
}

// mixing (armix)
const MIX_V = [100, 200, 400, 500, 1000];
const mixOk = ([i, r, c, q]: number[]) => {
  if (i < 0 || i > 4 || ![1, 2, 4, 5, 10, 20].includes(r) || c < 0 || c > 5 || q < 0 || q > 30) return false;
  const V = MIX_V[i];
  return V % r === 0 && V / r <= 200 && !(c === 0 && q === 0) && 10 * q !== V * c;
};
function mixAns([i, r, c, q]: number[]): string {
  const V = MIX_V[i];
  return sum([[V * c, ""], [10 * q - V * c, `e^(−t/${V / r})`]]);
}
