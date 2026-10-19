/**
 * Batch b13 (families@2): Grades 9–10 geometry, measurement and number — cones, spheres, hemispheres and shells,
 * pyramids, combined solids, recasting and frustums; Heron's and Brahmagupta's formulas; segments, clock hands and
 * sectors worked backwards; recurring decimals, terminating expansions and irrational numbers; similar triangles, the
 * basic proportionality theorem and areas of similar triangles; tangents; Ceva and Menelaus; the midpoint theorem;
 * tests for a parallelogram; reasons for proof steps and congruence rules (the parts of proof that can be marked
 * automatically); the angle bisector theorem. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { gcd, near, par, fmt, simpson } from "../family-kit";

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Lakshmi", "Selvi", "Farhan", "Priya"];
const name = (k: number) => NAMES[((Math.round(k) % NAMES.length) + NAMES.length) % NAMES.length];

const CS = "MATH.measurement.cones-spheres";
const HER = "MATH.measurement.heron";
const BRA = "MATH.measurement.brahmagupta-formula";
const PYR = "MATH.measurement.pyramids";
const COMB = "MATH.measurement.combined-solids";
const FR = "MATH.measurement.frustum";
const SEC = "MATH.measurement.sectors";
const RN = "MATH.number.real-numbers";
const SIM = "MATH.geometry.similarity";
const TAN = "MATH.geometry.circle-tangents";
const CEVA = "MATH.geometry.ceva-menelaus";
const MID = "MATH.geometry.midpoint-theorem";
const PG = "MATH.geometry.parallelogram-proofs";
const TP = "MATH.geometry.triangle-proof";
const EUC = "MATH.geometry.euclidean";
// prerequisites named by explanations
const PYTH = "MATH.geometry.pythagoras";
const CIRC = "MATH.measurement.circle-area";
const CYL = "MATH.measurement.cylinder";
const SURD = "MATH.number.radicals";
const PAR = "MATH.geometry.parallel-angles";
const CONG = "MATH.geometry.congruence";
const RAT = "MATH.number.ratio";
const LIN = "MATH.algebra.linear-equations";
const TRI = "MATH.measurement.triangle-area";
const CVOL = "MATH.measurement.cube-volume";
const TPROP = "MATH.geometry.triangle-properties";
const EXP = "MATH.number.exponents";

// ---------------------------------------------------------------- exact rationals (small integers)

type R = [number, number];
const q = (n: number, d = 1): R => {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
};
const qa = (a: R, b: R) => q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const qs = (a: R, b: R) => q(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const qm = (a: R, b: R) => q(a[0] * b[0], a[1] * b[1]);
const qd = (a: R, b: R) => q(a[0] * b[1], a[1] * b[0]);
const qe = (a: R, b: R) => a[0] * b[1] === b[0] * a[1];
const qn = (a: R) => a[0] / a[1];
const Q = (n: number): R => [n, 1];
/** A rational as written: a whole number, a terminating decimal, or a fraction a/b in lowest terms. */
function dec(r: R): string {
  const [n, d] = q(r[0], r[1]);
  if (d === 1) return String(n);
  let m = d;
  let twos = 0;
  let fives = 0;
  while (m % 2 === 0) (m /= 2), twos++;
  while (m % 5 === 0) (m /= 5), fives++;
  if (m !== 1) return `${n}/${d}`;
  const p = Math.max(twos, fives);
  const scaled = Math.abs(n) * (10 ** p / d);
  const s = String(Math.round(scaled)).padStart(p + 1, "0");
  return `${n < 0 ? "-" : ""}${s.slice(0, s.length - p)}.${s.slice(s.length - p)}`.replace(/\.?0+$/, "");
}
const D = (n: number, d = 1) => dec(q(n, d));
const terminating = (r: R) => !dec(r).includes("/");
/** Read an answer written as a whole number, a decimal or a fraction (null when it is none of these). */
function val(v: Value): R | null {
  if (typeof v === "number") {
    if (Number.isInteger(v)) return [v, 1];
    const f = fmt(v).match(/^(-?\d+)\/(\d+)$/);
    return f ? q(Number(f[1]), Number(f[2])) : null;
  }
  if (typeof v !== "string") return null;
  const s = v.replace(/−/g, "-").replace(/\s+/g, "");
  let m = s.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (m) {
    const frac = m[3] ?? "";
    return q((m[1] ? -1 : 1) * Number(m[2] + frac), 10 ** frac.length);
  }
  m = s.match(/^(-?)(\d+)\/(\d+)$/);
  return m && Number(m[3]) ? q((m[1] ? -1 : 1) * Number(m[2]), Number(m[3])) : null;
}
const is = (v: Value, r: R) => {
  const x = val(v);
  return !!x && qe(x, r);
};
/** n = k² m with m square-free. */
const sqfree = (n: number): [number, number] => {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++) while (m % (p * p) === 0) {
    m /= p * p;
    k *= p;
  }
  return [k, m];
};
/** √n in simplest form: "12", "3√5", "√7". */
const surd = (n: number): string => {
  if (n === 0) return "0";
  const [k, m] = sqfree(n);
  return m === 1 ? String(k) : `${k === 1 ? "" : k}√${m}`;
};
/** The value of an answer written as a whole number, decimal, fraction or k√m (null otherwise). */
function num(v: Value): number | null {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return null;
  const s = v.replace(/−/g, "-").replace(/\s+/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)?√(\d+)$/);
  if (m) return (m[1] ? Number(m[1]) : 1) * Math.sqrt(Number(m[2]));
  const r = val(v);
  return r ? r[0] / r[1] : null;
}
const close = (v: Value, x: number) => {
  const n = num(v);
  return n !== null && Number.isFinite(x) && near(n, x, 1e-9);
};
/** The whole number whose square is n, found by counting up (null when n is not a perfect square). */
const isqrt = (n: number): number | null => {
  for (let k = 0; k * k <= n; k++) if (k * k === n) return k;
  return null;
};
const B = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Value | null, probe?: string): Bug => ({ id, kind, competency, says, predict, ...(probe ? { probe } : {}) });
const step = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
const vs = (v: Value) => (typeof v === "number" ? (Number.isInteger(v) ? String(v).replace(/^-/, "−") : fmt(v)) : String(v));
/** A learner-facing sentence for an arithmetic step, with an optional label per step id. */
const say = (labels: Record<string, string> = {}) => (s: Step) => {
  const i = s.inputs.map((x) => (typeof x === "number" ? par(x) : x));
  const v = vs(s.value);
  const body =
    s.op === "multiply" ? `${i.join(" × ")} = ${v}`
    : s.op === "add" ? `${i.join(" + ")} = ${v}`
    : s.op === "subtract" ? `${i.join(" − ")} = ${v}`
    : s.op === "divide" ? `${i[0]} ÷ ${i[1]} = ${v}`
    : s.op === "half" ? `half of ${i[0]} = ${v}`
    : s.op === "root" ? `√${i[0]} = ${v}`
    : s.op === "squares" ? `${i.map((x) => `${x}²`).join(" + ")} = ${v}`
    : s.op === "third" ? `⅓ × ${i.join(" × ")} = ${v}`
    : s.op === "note" ? `${i.join(" ")}${v === "" ? "" : `: ${v}`}`
    : `${i.join(", ")} → ${v}`;
  return labels[s.id] ? `${labels[s.id]}: ${body}` : body;
};
const inDom = (dom: [number, number][], p: number[]) => p.length === dom.length && p.every((v, i) => Number.isInteger(v) && v >= dom[i][0] && v <= dom[i][1]);
const rj = (dom: [number, number][], keep: (p: number[]) => boolean, why: string) => (p: number[]) => (inDom(dom, p) && keep(p) ? null : why);

const PI7: R = [22, 7];
const PI314: R = [157, 50];
/** π = 22/7 when the radius is a multiple of 7 (the boards' convention), otherwise 3.14. */
const piFor = (r: number): R => (r % 7 === 0 ? PI7 : PI314);
const piName = (pi: R) => (pi[0] === 22 ? "22/7" : "3.14");
const TRIPLES: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [12, 35, 37], [9, 40, 41]];
/** The two legs and hypotenuse of TRIPLES[t] × k (o swaps the legs). */
const leg = (t: number, k: number, o: number): [number, number, number] => {
  const [x, y, z] = TRIPLES[t];
  return o ? [y * k, x * k, z * k] : [x * k, y * k, z * k];
};

// ---------------------------------------------------------------- small numeric geometry (for independent checks)

type P2 = [number, number];
const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const add2 = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]];
const mul2 = (a: P2, k: number): P2 => [a[0] * k, a[1] * k];
const len = (a: P2) => Math.hypot(a[0], a[1]);
const dist = (a: P2, b: P2) => len(sub(a, b));
const cross = (a: P2, b: P2) => a[0] * b[1] - a[1] * b[0];
const unit = (a: P2) => mul2(a, 1 / len(a));
const angleAt = (v: P2, a: P2, b: P2) => {
  const x = sub(a, v);
  const y = sub(b, v);
  return (Math.acos(Math.max(-1, Math.min(1, (x[0] * y[0] + x[1] * y[1]) / (len(x) * len(y))))) * 180) / Math.PI;
};
/** Where line p + s·u meets line r + t·w. */
const meet = (p: P2, u: P2, r: P2, w: P2): P2 => add2(p, mul2(u, cross(sub(r, p), w) / cross(u, w)));
/** A triangle B = (0, 0), C = (a, 0), A above BC with AB = c and AC = b. */
const place = (a: number, b: number, c: number): [P2, P2, P2] => {
  const x = (c * c - b * b + a * a) / (2 * a);
  return [[x, Math.sqrt(Math.max(0, c * c - x * x))], [0, 0], [a, 0]];
};
/** A root of f between lo and hi by halving the interval (f changes sign there). */
const bisect = (f: (x: number) => number, lo: number, hi: number) => {
  let a = lo;
  let b = hi;
  const fa = f(a);
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    if (Math.sign(f(m)) === Math.sign(fa)) a = m;
    else b = m;
  }
  return (a + b) / 2;
};
const heronN = (a: number, b: number, c: number) => {
  // ½ab sin C, with C from the cosine rule
  const cosC = (a * a + b * b - c * c) / (2 * a * b);
  return 0.5 * a * b * Math.sqrt(Math.max(0, 1 - cosC * cosC));
};

// ---------------------------------------------------------------- domains

const CONE_DOM: [number, number][] = [[0, 6], [1, 10], [0, 1], [0, 2]];
const coneOk = ([t, k, o]: number[]) => {
  const [r, h] = leg(t, k, o);
  return r >= 3 && r <= 50 && h <= 80;
};
const CONEV_DOM: [number, number][] = [[0, 6], [1, 10], [0, 1], [0, 1]];
const SPH_DOM: [number, number][] = [[1, 14], [0, 1], [0, 1], [0, 1]];
const SHELL_DOM: [number, number][] = [[2, 20], [1, 6], [0, 2]];
const HER_DOM: [number, number][] = [[3, 24], [3, 24], [3, 24]];
const herOk = ([a, b, c]: number[]) => a <= b && b <= c && a + b > c && (a + b + c) % 2 === 0;

/** Triangles with whole-number sides up to 25 and a whole-number area: [x, y, z, area]. */
const HTRI: [number, number, number, number][] = [];
for (let x = 3; x <= 25; x++)
  for (let y = x; y <= 25; y++)
    for (let z = y; z < x + y && z <= 25; z++) {
      if ((x + y + z) % 2) continue;
      const s = (x + y + z) / 2;
      const P = s * (s - x) * (s - y) * (s - z);
      const A = Math.round(Math.sqrt(P));
      if (A * A === P) HTRI.push([x, y, z, A]);
    }
/** Quadrilaterals ABCD split by the diagonal AC into two whole-area triangles: [AB, BC, CD, DA, AC, area ABC, area ACD]. */
const QUADS: number[][] = [];
{
  const seen = new Set<string>();
  for (let i = 0; i < HTRI.length; i++)
    for (let j = i; j < HTRI.length; j++) {
      const t1 = HTRI[i];
      const t2 = HTRI[j];
      for (let u = 0; u < 3; u++)
        for (let w = 0; w < 3; w++) {
          const d = t1[u];
          if (t2[w] !== d) continue;
          const [a, b] = t1.slice(0, 3).filter((_, k) => k !== u);
          const [c, e] = t2.slice(0, 3).filter((_, k) => k !== w);
          // convex: the angles at A and at C, each made of two triangle angles, are under 180°
          const ang = (p: number, r: number, opp: number) => Math.acos((p * p + r * r - opp * opp) / (2 * p * r));
          const atA = ang(a, d, b) + ang(e, d, c);
          const atC = ang(b, d, a) + ang(c, d, e);
          if (atA >= Math.PI - 0.05 || atC >= Math.PI - 0.05) continue;
          if (new Set([a, b, c, e]).size < 3) continue;
          const key = [a, b, c, e, d].join(",");
          if (seen.has(key)) continue;
          seen.add(key);
          QUADS.push([a, b, c, e, d, t1[3], t2[3]]);
        }
    }
}
const BRA_DOM: [number, number][] = [[2, 16], [2, 16], [2, 16], [2, 16]];
const braOk = ([a, b, c, d]: number[]) => {
  const p = a + b + c + d;
  if (p % 2) return false;
  const s = p / 2;
  return [a, b, c, d].every((x) => s - x > 0) && a <= c;
};
const PYRS_DOM: [number, number][] = [[0, 6], [1, 5], [0, 1], [0, 1], [0, 1]];
const pyrsOk = ([t, k, o]: number[]) => {
  const [m, h] = leg(t, k, o);
  return 2 * m <= 40 && h <= 50 && m >= 3;
};
const PYRV_DOM: [number, number][] = [[0, 2], [2, 20], [2, 20], [3, 30]];
const pyrvOk = ([bt, x, y, h]: number[]) => (bt === 0 ? y === x : bt === 1 ? y > x && (x + y + h) % 3 === 0 : y >= x && (x + y + h) % 3 === 0);
const CV_DOM: [number, number][] = [[0, 3], [1, 6], [2, 20], [2, 24]];
const cvOk = ([s, , H, h]: number[]) => (s === 0 ? H === 2 : s === 1 ? H <= 12 && h <= 12 && (H + h) % 3 === 0 : h === 2);
const CS_DOM: [number, number][] = [[0, 3], [0, 6], [1, 4], [0, 1], [3, 24]];
const csOk = ([s, t, k, o, H]: number[]) => {
  if (s >= 2) return t === 0 && o === 0 && H % 2 === 0;
  const [r, h] = leg(t, k, o);
  if (r < 3 || r > 30 || h > 40) return false;
  return s === 0 ? H === 3 : H % 3 === 0;
};
const RC_DOM: [number, number][] = [[0, 2], [1, 12], [1, 30], [1, 6], [1, 12]];
const rcOk = ([m, a, b, c, d]: number[]) => {
  if (m === 0) return b >= 2 && b <= 6 && a <= 10 && c === 1 && d === 1;
  if (m === 1) return b < a && b <= 4 && c === 1 && d === 1;
  if (c >= a || d > b) return false;
  const n = q(3 * a * a * b, c * c * d);
  return n[1] === 1 && n[0] >= 2 && n[0] <= 400 && b <= 20 && b % 2 === 0;
};
const FR_DOM: [number, number][] = [[0, 2], [0, 6], [1, 3], [0, 1], [1, 20]];
const frParts = ([, t, k, o, r]: number[]) => {
  const [dR, h, l] = leg(t, k, o);
  return { R: r + dR, r, h, l };
};
const frAnswer = (p: number[]): R => {
  const { R, r, h, l } = frParts(p);
  if (p[0] === 0) return qm(PI7, q(h * (R * R + r * r + R * r), 3));
  if (p[0] === 1) return qm(PI7, Q(l * (R + r)));
  return qm(PI7, Q(l * (R + r) + R * R + r * r));
};
const frOk = (p: number[]) => {
  const { R, h } = frParts(p);
  return R <= 40 && h <= 40 && frAnswer(p)[1] <= 3;
};
const SEG_ANG = [60, 90, 120];
const SEG_DOM: [number, number][] = [[3, 42], [0, 2], [0, 1]];
const segOk = ([r, ai]: number[]) => (ai === 0 ? r % 6 === 0 : ai === 2 ? r % 3 === 0 : true);
const CLK_DOM: [number, number][] = [[4, 21], [1, 11], [0, 1], [0, 1]];
const INV_ANG = [30, 36, 40, 45, 60, 72, 80, 90, 108, 120, 135, 144, 150, 180, 210, 240, 270, 300];
const INV_DOM: [number, number][] = [[1, 6], [0, 17], [0, 2]];
const invData = ([k, ti]: number[]) => {
  const th = INV_ANG[ti];
  return { r: 7 * k, th, arc: qm(q(th, 360), qm(PI7, Q(14 * k))), area: qm(q(th, 360), qm(PI7, Q(49 * k * k))) };
};
const invOk = (p: number[]) => {
  const { arc, area } = invData(p);
  return p[2] === 0 ? terminating(arc) : terminating(area);
};
const REC_DOM: [number, number][] = [[0, 2], [0, 9], [0, 98]];
const recOk = ([f, n, x]: number[]) => {
  if (f === 0) return x >= 1 && x <= 8;
  if (f === 1) return n <= 2 && x >= 1 && x % 11 !== 0;
  return n >= 1 && x >= 1 && x <= 8 && x !== n;
};
const TERM_M = [1, 3, 7, 9, 11, 13, 21];
const TERM_DOM: [number, number][] = [[1, 40], [0, 4], [0, 3], [0, 6]];
const termQ = ([, i, j, mi]: number[]) => 2 ** i * 5 ** j * TERM_M[mi];
const termOk = (p: number[]) => {
  const qq = termQ(p);
  return qq >= 2 && qq <= 2000 && p[0] % qq !== 0 && (p[3] === 0 || p[0] % TERM_M[p[3]] === 0 || p[0] % 2 === 1);
};
const PL_DOM: [number, number][] = [[1, 60], [0, 6], [0, 5]];
const plQ = ([, m, n]: number[]) => 2 ** m * 5 ** n;
const plOk = (p: number[]) => {
  const qq = plQ(p);
  return qq >= 2 && qq <= 20000 && p[0] % qq !== 0 && (p[0] % 2 === 1 || p[0] % 4 === 2 || p[0] % 5 === 0) && p[0] % 3 !== 0;
};
const IRR_DOM: [number, number][] = [[0, 2], [2, 40], [0, 9], [0, 3]];
const irrOk = ([, n]: number[]) => isqrt(n) === null;
const SIM_TRIS: [number, number, number][] = [[2, 3, 4], [3, 4, 5], [4, 5, 6], [5, 6, 7], [3, 5, 7], [4, 7, 9], [5, 7, 8], [6, 7, 9], [3, 6, 7], [4, 6, 9], [5, 8, 9], [7, 8, 10]];
const SIM_N = [1, 2, 4, 5];
const SIM_DOM: [number, number][] = [[0, 11], [1, 9], [0, 3], [0, 2]];
const simOk = ([, m, ni]: number[]) => gcd(m, SIM_N[ni]) === 1 && m !== SIM_N[ni];
const BPT_DOM: [number, number][] = [[0, 2], [1, 12], [1, 12], [2, 24]];
const bptAns = ([mode, p, qq, r]: number[]): R => (mode === 0 ? q(qq * r, p) : q(r * p, p + qq));
const bptOk = (p: number[]) => {
  const a = bptAns(p);
  return terminating(a) && dec(a).replace(/^\d+\.?/, "").length <= 2 && p[1] !== p[2] && (p[0] !== 0 || a[1] === 1 || a[1] === 2);
};
const SA_DOM: [number, number][] = [[0, 1], [1, 9], [1, 9], [1, 30]];
const saOk = ([mode, m, n, x]: number[]) => gcd(m, n) === 1 && m < n && (mode === 0 ? x * m * m <= 400 : x <= 12);
const TL_DOM: [number, number][] = [[2, 20], [3, 30], [0, 2]];
const tlOk = ([x, y, a]: number[]) => (a === 1 ? y >= 2 && y <= 24 : y > x);
const TG_DOM: [number, number][] = [[10, 80], [0, 3]];
const tgOk = ([u, m]: number[]) => (m === 3 ? u <= 44 : true);
const TQ_DOM: [number, number][] = [[0, 1], [3, 20], [3, 20], [3, 20]];
const tqOk = ([m, p, qq, r]: number[]) => (m === 0 ? p + r - qq > 0 && p + r - qq <= 30 && p !== qq && qq !== r : p + r > qq && p + qq > r && qq + r > p && (p + r - qq) % 2 === 0 && p <= r);
const CEVA_DOM: [number, number][] = [[0, 1], [1, 6], [1, 6], [1, 6], [1, 6]];
const cevaOk = ([m, a, b, c, d]: number[]) => gcd(a, b) === 1 && gcd(c, d) === 1 && (m === 0 || a !== b) && !(a === b && c === d);
const MID_DOM: [number, number][] = [[0, 2], [3, 40], [3, 30], [3, 30]];
const midOk = ([m, x, y, z]: number[]) => (m < 2 ? y === 3 && z === 3 : x <= y && y <= z && z <= 20 && x + y > z && (x + y + z) % 4 === 0);
const PG_COEF = [[2, 3, 3, 1, 4, 3], [3, -2, 1, 2, 1, 4], [4, 1, 2, 3, -1, 1], [5, -3, 3, 2, 5, 3], [1, 7, 2, 4, -3, 2], [3, 4, 5, 1, 6, 2]];
const PG_DOM: [number, number][] = [[1, 12], [1, 12], [0, 1], [0, 5]];
const pgParts = ([x, y, , s]: number[]) => {
  const [p1, q1, p2, p3, q3, p4] = PG_COEF[s];
  return { p1, q1, p2, q2: (p1 - p2) * x + q1, p3, q3, p4, q4: (p3 - p4) * y + q3 };
};
const pgOk = (p: number[]) => {
  const c = pgParts(p);
  return c.p1 * p[0] + c.q1 > 0 && c.p3 * p[1] + c.q3 > 0 && (p[0] + p[1] + p[3]) % 2 === 0;
};
const REASONS = [
  "Vertically opposite angles are equal.",
  "Angles in a linear pair add up to 180°.",
  "Alternate angles between parallel lines are equal.",
  "Corresponding angles between parallel lines are equal.",
  "Co-interior angles between parallel lines add up to 180°.",
  "The three angles of a triangle add up to 180°.",
  "An exterior angle of a triangle equals the sum of the two interior opposite angles.",
];
const REASON_MIS = [1, 0, 3, 2, 1, 6, 5];
const RS_DOM: [number, number][] = [[0, 6], [5, 31], [0, 5]];
const rsB = (a: number) => 5 * (((a * 3) % 9) + 4);
const rsOk = ([c, a]: number[]) => (c >= 5 ? 5 * a + rsB(a) <= 170 : true);
const CRIT = ["SSS", "SAS", "ASA", "AAS", "RHS", "None of these: the facts are not enough"];
const CRIT_MIS = [5, 2, 3, 2, 5, 1];
const CR_DOM: [number, number][] = [[0, 5], [3, 12], [0, 11]];
const AB_DOM: [number, number][] = [[0, 1], [2, 15], [2, 15], [2, 15]];
const abAns = ([m, x, y, z]: number[]): R => (m === 0 ? q(z * x, x + y) : q(z * y, x));
const abOk = (p: number[]) => {
  const [m, x, y, z] = p;
  if (x === y) return false;
  const a = abAns(p);
  if (!terminating(a) || dec(a).replace(/^\d+\.?/, "").length > 2) return false;
  if (m === 0) return x + y > z && x + z > y && y + z > x;
  const ac = qn(a);
  return z + ac > x + y && z + x + y > ac && ac + x + y > z && z <= 12;
};
const TC_DOM: [number, number][] = [[2, 12], [0, 24]];
const tcOk = ([r, d]: number[]) => d <= 2 * r && (d >= r - 3 || d % 2 === 0);

// ---------------------------------------------------------------- choice-family helpers

/** Four options: the right one, the predicted wrong one, and two others, in an order fixed by a seed. */
function fourOf(total: number, right: number, mis: number, seed: number): number[] {
  const rest = Array.from({ length: total }, (_, i) => i).filter((i) => i !== right && i !== mis);
  const o1 = rest[seed % rest.length];
  const o2 = rest[(seed + 2) % rest.length];
  const base = [right, mis, o1, o2];
  const k = seed % 4;
  return [...base.slice(k), ...base.slice(0, k)];
}
/** The reason-for-a-step configurations: (where the angles are, the relation the step uses). */
const RS_GEO: { config: "cross" | "line" | "parallel" | "triangle" | "exterior"; a1?: [string, boolean]; a2?: [string, boolean]; rel: "equal" | "sum180" | "tri" | "ext" }[] = [
  { config: "cross", rel: "equal" },
  { config: "line", rel: "sum180" },
  { config: "parallel", a1: ["left", true], a2: ["right", true], rel: "equal" },
  { config: "parallel", a1: ["right", false], a2: ["right", true], rel: "equal" },
  { config: "parallel", a1: ["right", true], a2: ["right", true], rel: "sum180" },
  { config: "triangle", rel: "tri" },
  { config: "exterior", rel: "ext" },
];
const rsText = (c: number, a: number) => {
  const A = 5 * a;
  const b = rsB(a);
  return [
    `Lines AB and CD cross at O. ∠AOC = ${A}°. A proof says: "so ∠BOD = ${A}°."`,
    `O is a point on line AB, and ray OC starts at O. ∠AOC = ${A}°. A proof says: "so ∠BOC = ${180 - A}°."`,
    `AB ∥ CD. A line crosses AB at X and CD at Y, with A and D on opposite sides of XY. ∠AXY = ${A}°. A proof says: "so ∠XYD = ${A}°."`,
    `AB ∥ CD. A line PQ crosses AB at X and CD at Y, in the order P, X, Y, Q, with B and D on the same side of PQ. ∠PXB = ${A}°. A proof says: "so ∠XYD = ${A}°."`,
    `AB ∥ CD. A line crosses AB at X and CD at Y, with B and D on the same side of XY. ∠BXY = ${A}°. A proof says: "so ∠XYD = ${180 - A}°."`,
    `In ΔABC, ∠A = ${A}° and ∠B = ${b}°. A proof says: "so ∠C = ${180 - A - b}°."`,
    `In ΔABC, side BC is extended beyond C to a point D. ∠A = ${A}° and ∠B = ${b}°. A proof says: "so ∠ACD = ${A + b}°."`,
  ][c];
};
type Fact = { k: "s"; i: number; j: number; v: number } | { k: "a"; i: number; v: number };
/** The facts given for congruence case c, with vertex names rotated by rot and lengths/angles from L. */
function critFacts(c: number, L: number, rot: number): Fact[] {
  const [u, v, w] = [rot % 3, (rot + 1) % 3, (rot + 2) % 3];
  const deg = (k: number) => 30 + 5 * ((L * 3 + k) % 13);
  const s = (i: number, j: number, k: number): Fact => ({ k: "s", i, j, v: L + k });
  const an = (i: number, k: number): Fact => ({ k: "a", i, v: deg(k) });
  if (c === 0) return [s(u, v, 0), s(v, w, 1), s(w, u, 2)];
  if (c === 1) return [s(u, v, 0), an(v, 0), s(v, w, 1)];
  if (c === 2) return [an(u, 0), s(u, v, 0), an(v, 3)];
  if (c === 3) return [an(u, 0), an(v, 3), s(v, w, 1)];
  if (c === 4) return [{ k: "a", i: v, v: 90 }, s(w, u, 3), s(u, v, 0)];
  return [s(u, v, 0), s(v, w, 1), an(u, 0)];
}
const V1 = ["A", "B", "C"];
const V2 = ["P", "Q", "R"];
const factText = (f: Fact) => (f.k === "s" ? `${V1[f.i]}${V1[f.j]} = ${V2[f.i]}${V2[f.j]} = ${f.v} cm` : `∠${V1[f.i]} = ∠${V2[f.i]} = ${f.v}°`);
/** Which options amirr shows: the irrational number first, then three traps (before the seeded rotation). */
const IRR_COMBOS = [[0, 1, 2], [0, 1, 3], [0, 1, 4], [0, 2, 3], [0, 2, 4], [0, 3, 4], [1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4]];
const IRR_PAIRS = [[2, 8], [3, 12], [2, 18], [5, 20], [3, 27], [2, 32], [6, 24], [7, 28]];
const NONSQ = [2, 3, 5, 6, 7, 10, 11];
function irrOptions([ik, n, ts, ord]: number[]): { opts: string[]; kinds: number[] } {
  const irr = ik === 0 ? `√${n}` : ik === 1 ? `${(n % 4) + 1} + √${n}` : `√${n}/${(n % 3) + 2}`;
  const s = (n % 7) + 3;
  const [u, w] = IRR_PAIRS[n % 8];
  const ab = String(((n * 7) % 89) + 10);
  const traps = [`√${s * s}`, "22/7", `√${u} × √${w}`, `0.${ab}${ab}${ab}… (the block ${ab} repeats)`, `(√${NONSQ[n % 7]})²`];
  const base = [irr, ...IRR_COMBOS[ts].map((k) => traps[k])];
  const kinds = [-1, ...IRR_COMBOS[ts]];
  const r = ord % 4;
  return { opts: [...base.slice(r), ...base.slice(0, r)], kinds: [...kinds.slice(r), ...kinds.slice(0, r)] };
}
/** Whether a number written as amirr writes it is rational, read from its text (an independent reading). */
function rationalText(t: string): boolean | null {
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^√(\d+)$/))) return isqrt(Number(m[1])) !== null;
  if ((m = t.match(/^\d+ \+ √(\d+)$/))) return isqrt(Number(m[1])) !== null;
  if ((m = t.match(/^√(\d+)\/\d+$/))) return isqrt(Number(m[1])) !== null;
  if ((m = t.match(/^√(\d+) × √(\d+)$/))) return isqrt(Number(m[1]) * Number(m[2])) !== null;
  if (/^\d+\/\d+$/.test(t)) return true;
  if (/^0\.\d+… \(the block \d+ repeats\)$/.test(t)) return true;
  if (/^\(√\d+\)²$/.test(t)) return true;
  return null;
}
/** Long division of a/b: the integer part and the first k decimal digits. */
function longDivision(a: number, b: number, k: number): string {
  const ip = Math.floor(a / b);
  let rem = a - ip * b;
  let s = "";
  for (let i = 0; i < k; i++) {
    rem *= 10;
    s += String(Math.floor(rem / b));
    rem %= b;
  }
  return `${ip}.${s}`;
}
/** How many decimal digits a/b has before the division comes out exactly (null if it has not stopped after 60). */
function digitsUntilExact(a: number, b: number): number | null {
  let rem = a % b;
  for (let i = 0; i <= 60; i++) {
    if (rem === 0) return i;
    rem = (rem * 10) % b;
  }
  return null;
}
const recText = ([f, n, x]: number[]) => {
  if (f === 0) return `${n}.${String(x).repeat(4)}…`;
  if (f === 1) {
    const ab = String(x).padStart(2, "0");
    return `${n}.${ab.repeat(3)}…`;
  }
  return `0.${n}${String(x).repeat(4)}…`;
};
const recNote = ([f, n, x]: number[]) => (f === 0 ? `the digit ${x} repeats for ever` : f === 1 ? `the block ${String(x).padStart(2, "0")} repeats for ever` : `only the ${x} repeats`);
const recValue = ([f, n, x]: number[]): R => (f === 0 ? qa(Q(n), q(x, 9)) : f === 1 ? qa(Q(n), q(x, 99)) : q(10 * n + x - n, 90));
const linText = (p: number, c: number, v: string) => `${p === 1 ? "" : p}${v}${c === 0 ? "" : c < 0 ? ` − ${-c}` : ` + ${c}`}`;

export const B13: Def[] = [
  // ============================================================ cones and spheres
  {
    id: "amcone",
    arity: 4,
    title: "Slant height and surface area of a cone",
    competency: CS,
    type: "exact",
    mc: true,
    // [t, k, o, ask]: radius and height are the legs of TRIPLES[t] × k (o swaps them); ask 0 slant height, 1 curved surface area, 2 total surface area
    parse: none,
    reject: rj(CONE_DOM, coneOk, "Cones with radius 3–50 cm and height up to 80 cm whose slant height is a whole number."),
    prompt: ([t, k, o, a]) => {
      const [r, h] = leg(t, k, o);
      return a === 0 ? `A right circular cone has a base radius of ${r} cm and a height of ${h} cm. Find its slant height, in cm.` : `A right circular cone has a base radius of ${r} cm and a height of ${h} cm. Taking π = ${piName(piFor(r))}, find its ${a === 1 ? "curved surface area" : "total surface area"}, in cm².`;
    },
    solve: ([t, k, o, a]) => {
      const [r, h, l] = leg(t, k, o);
      const pi = piFor(r);
      const steps: Step[] = [step("squares", "squares", PYTH, [r, h], r * r + h * h), step("slant", "root", PYTH, [r * r + h * h], l)];
      if (a === 0) return { steps, answer: String(l) };
      const csa = qm(pi, Q(r * l));
      steps.push(step("csa", "multiply", CS, [piName(pi), r, l], dec(csa)));
      if (a === 1) return { steps, answer: dec(csa) };
      const base = qm(pi, Q(r * r));
      steps.push(step("base", "multiply", CIRC, [piName(pi), r, r], dec(base)), step("tsa", "add", CS, [dec(csa), dec(base)], dec(qa(csa, base))));
      return { steps, answer: dec(qa(csa, base)) };
    },
    // independent: the slant height by searching for the whole number whose square is r² + h²; the curved surface
    // unrolled into a sector of radius l whose arc is the base circumference, area ½ × arc × l
    validate: ([t, k, o, a], v) => {
      const [r, h] = leg(t, k, o);
      const L = isqrt(r * r + h * h);
      if (L === null) return false;
      if (a === 0) return is(v, Q(L));
      const arc = qm(piFor(r), Q(2 * r));
      const lateral = qm(qm(arc, Q(L)), q(1, 2));
      return is(v, a === 1 ? lateral : qa(lateral, qm(qm(arc, Q(r)), q(1, 2))));
    },
    bugs: ([t, k, o, a]) => {
      const [r, h, l] = leg(t, k, o);
      const pi = piFor(r);
      if (a === 0)
        return [
          B("add-legs", "conceptual", PYTH, "The radius and the height were added. The slant height is the longest side of a right triangle, so l² = r² + h².", String(r + h)),
          B("no-root", "procedural", PYTH, "r² + h² was found, but its square root was not taken.", String(r * r + h * h)),
          ...(h > r ? [B("subtract-squares", "procedural", PYTH, "h² − r² was used. The slant height is the hypotenuse, so the two squares are added.", surd(h * h - r * r))] : []),
        ];
      if (a === 1)
        return [
          B("height-for-slant", "conceptual", CS, "The height was used in πrl. The curved surface needs the slant height l, measured along the sloping side.", dec(qm(pi, Q(r * h)))),
          B("cylinder-formula", "conceptual", CS, "2πrl was used, as for a cylinder. A cone's curved surface is πrl.", dec(qm(pi, Q(2 * r * l)))),
          B("added-base", "procedural", CS, "The base circle was added. The curved surface area leaves the base out.", dec(qm(pi, Q(r * (l + r))))),
        ];
      return [
        B("no-base", "procedural", CS, "Only the curved surface was found. The total surface area also includes the circular base, πr².", dec(qm(pi, Q(r * l)))),
        B("height-for-slant", "conceptual", CS, "The height was used instead of the slant height in πrl.", dec(qm(pi, Q(r * (h + r))))),
        B("two-bases", "procedural", CS, "Two circles were added, as for a cylinder. A cone has only one base.", dec(qm(pi, Q(r * (l + 2 * r))))),
      ];
    },
    distractors: ([t, k, o, a]) => {
      const [r, , l] = leg(t, k, o);
      const pi = piFor(r);
      return a === 0 ? [String(l + 1), String(l - 1), String(2 * l)] : [dec(qm(pi, Q(r * r))), dec(qm(pi, Q(2 * r * (l + r)))), dec(qm(pi, Q(r * l * 2 + r * r)))];
    },
    variants: () => [],
    explain: say({ squares: "r² + h²", slant: "Slant height l", csa: "Curved surface πrl", base: "Base πr²", tsa: "Total surface area" }),
    domain: CONE_DOM,
    cap: 300,
    difficulty: ([, , , a]) => (a === 0 ? 1 : a === 1 ? 2 : 3),
    figure: ([t, k, o]) => {
      const [r, h] = leg(t, k, o);
      return { type: "solid", name: "cone", dims: [`r = ${r} cm`, `h = ${h} cm`] };
    },
    word: ([t, k, o, a]) => {
      const [r, h] = leg(t, k, o);
      const pi = piName(piFor(r));
      return a === 0 ? `A conical tent has a base radius of ${r} m and a height of ${h} m. A rope runs from the top of the tent straight down its sloping side to the edge of the base. How long is the rope, in m?`
        : a === 1 ? `${name(r + h)} makes a joker's cap shaped like a cone, with a base radius of ${r} cm and a height of ${h} cm. The cap has no base. How much paper is needed, in cm²? (π = ${pi})`
        : `A solid wooden cone with a base radius of ${r} cm and a height of ${h} cm is painted all over, including its base. What area is painted, in cm²? (π = ${pi})`;
    },
    teach: {
      idea: "Cut a cone's curved surface along a slant line and flatten it: it becomes a sector of a circle of radius l whose arc is the base circumference 2πr, so its area is ½ × 2πr × l = πrl.",
      method: "Find the slant height first: l = √(r² + h²). Curved surface area = πrl; total surface area = πrl + πr² = πr(l + r).",
      alternatives: [
        { id: "hidden_triangle", title: "The hidden right triangle", kind: "conceptual", text: ["Slice the cone straight down through its tip: the radius, the height and the slant height form a right triangle.", "The slant height is the hypotenuse, so l² = r² + h²."], visual: ([t, k, o]) => {
          const [r, h] = leg(t, k, o);
          return { type: "triangle", sides: [`r = ${r}`, "l = ?", `h = ${h}`], right: true };
        } },
      ],
    },
    limits: "Radius and height chosen so the slant height is a whole number; π = 22/7 when the radius is a multiple of 7, otherwise 3.14.",
  },
  {
    id: "amconev",
    arity: 4,
    title: "Volume of a cone",
    competency: CS,
    type: "exact",
    mc: true,
    // [t, k, o, g]: radius and height from TRIPLES[t] × k; g 0 radius and height given, 1 radius and slant height given
    parse: none,
    reject: rj(CONEV_DOM, coneOk, "Cones with radius 3–50 cm and height up to 80 cm whose slant height is a whole number."),
    prompt: ([t, k, o, g]) => {
      const [r, h, l] = leg(t, k, o);
      return `A right circular cone has a base radius of ${r} cm and ${g ? `a slant height of ${l}` : `a height of ${h}`} cm. Taking π = ${piName(piFor(r))}, find its volume, in cm³. (A fraction is fine.)`;
    },
    solve: ([t, k, o, g]) => {
      const [r, h, l] = leg(t, k, o);
      const pi = piFor(r);
      const steps: Step[] = g ? [step("height", "root", PYTH, [`${l}² − ${r}² = ${l * l - r * r}`], h)] : [];
      const V = qm(qm(pi, Q(r * r * h)), q(1, 3));
      steps.push(step("volume", "third", CS, [piName(pi), `${r}²`, h], dec(V)));
      return { steps, answer: dec(V) };
    },
    // independent: add up thin circular slices from the base to the tip (Simpson's rule)
    validate: ([t, k, o, g], v) => {
      const [r, hh, l] = leg(t, k, o);
      const h = g ? isqrt(l * l - r * r) : hh;
      if (!h) return false;
      const pi = qn(piFor(r));
      return close(v, simpson((y) => pi * (r * (1 - y / h)) ** 2, 0, h, 200));
    },
    bugs: ([t, k, o, g]) => {
      const [r, h, l] = leg(t, k, o);
      const pi = piFor(r);
      return [
        B("no-third", "conceptual", CS, "πr²h is the volume of a cylinder. A cone holds one third of that: V = ⅓πr²h.", dec(qm(pi, Q(r * r * h)))),
        ...(g ? [B("slant-for-height", "conceptual", CS, "The slant height was used as the height. The height is measured straight up from the centre of the base: h = √(l² − r²).", dec(qm(qm(pi, Q(r * r * l)), q(1, 3))))] : []),
        B("not-squared", "procedural", CIRC, "The radius was not squared. The base is a circle of area πr².", dec(qm(qm(pi, Q(r * h)), q(1, 3)))),
        B("half", "recall", CS, "½ was used instead of ⅓, as for a triangle's area.", dec(qm(qm(pi, Q(r * r * h)), q(1, 2)))),
      ];
    },
    distractors: ([t, k, o]) => {
      const [r, h] = leg(t, k, o);
      const pi = piFor(r);
      return [dec(qm(qm(pi, Q(r * r * h)), q(2, 3))), dec(qm(qm(pi, Q(4 * r * r * h)), q(1, 3)))];
    },
    variants: () => [],
    explain: say({ height: "Height h", volume: "Volume ⅓πr²h" }),
    domain: CONEV_DOM,
    cap: 300,
    difficulty: ([t, k, o, g]) => (g ? 3 : leg(t, k, o)[0] % 7 === 0 ? 1 : 2),
    figure: ([t, k, o, g]) => {
      const [r, h, l] = leg(t, k, o);
      return { type: "solid", name: "cone", dims: [`r = ${r} cm`, g ? `slant height = ${l} cm` : `h = ${h} cm`] };
    },
    word: ([t, k, o, g]) => {
      const [r, h, l] = leg(t, k, o);
      return `A heap of rice at a mill is shaped like a cone with a base radius of ${r} m and ${g ? `a slant height of ${l}` : `a height of ${h}`} m. What volume of rice is in the heap, in m³? (π = ${piName(piFor(r))}; a fraction is fine.)`;
    },
    teach: {
      idea: "A cone fits exactly three times into a cylinder with the same base and height, so its volume is one third of the cylinder's: ⅓πr²h.",
      method: "If the slant height is given, find the height first with h = √(l² − r²). Then V = ⅓ × π × r² × h.",
      alternatives: [{ id: "pour", title: "Pour and count", kind: "conceptual", text: ["Fill a paper cone with sand and pour it into a cylinder with the same base and height.", "It takes three cones to fill the cylinder."] }],
    },
    limits: "Radius and height chosen so the slant height is a whole number; hollow cones are left out.",
  },
  {
    id: "amsph",
    arity: 4,
    title: "Surface area and volume of a sphere or hemisphere",
    competency: CS,
    type: "exact",
    mc: true,
    // [k, s, a, g]: radius 7k/2 cm; s 0 sphere, 1 solid hemisphere; a 0 surface area, 1 volume; g 0 radius given, 1 diameter given
    parse: none,
    reject: rj(SPH_DOM, () => true, "Radii from 3.5 cm to 49 cm in steps of 3.5 cm."),
    prompt: ([k, s, a, g]) => `A ${s ? "solid hemisphere" : "sphere"} has a ${g ? `diameter of ${7 * k}` : `radius of ${D(7 * k, 2)}`} cm. Taking π = 22/7, find its ${a ? "volume, in cm³" : s ? "total surface area (curved surface and flat face), in cm²" : "surface area, in cm²"}. (A fraction is fine.)`,
    solve: ([k, s, a, g]) => {
      const r = q(7 * k, 2);
      const steps: Step[] = g ? [step("radius", "half", CS, [7 * k], dec(r))] : [];
      const r2 = qm(r, r);
      if (a === 0) {
        if (!s) {
          const A = qm(qm(PI7, Q(4)), r2);
          steps.push(step("surface", "multiply", CS, [4, "22/7", dec(r), dec(r)], dec(A)));
          return { steps, answer: dec(A) };
        }
        const curved = qm(qm(PI7, Q(2)), r2);
        const flat = qm(PI7, r2);
        steps.push(step("curved", "multiply", CS, [2, "22/7", dec(r), dec(r)], dec(curved)), step("flat", "multiply", CIRC, ["22/7", dec(r), dec(r)], dec(flat)), step("total", "add", CS, [dec(curved), dec(flat)], dec(qa(curved, flat))));
        return { steps, answer: dec(qa(curved, flat)) };
      }
      const V = qm(qm(PI7, s ? q(2, 3) : q(4, 3)), qm(r2, r));
      steps.push(step("volume", "multiply", CS, [s ? "2/3" : "4/3", "22/7", `${dec(r)}³`], dec(V)));
      return { steps, answer: dec(V) };
    },
    // independent: volume by adding thin circular slices π(r² − x²) (Simpson's rule); surface area by Archimedes'
    // result that a sphere's surface equals the curved surface of the cylinder that just wraps it (2πr × 2r)
    validate: ([k, s, a], v) => {
      const r = 3.5 * k;
      const rr = q(7 * k, 2);
      if (a === 1) return close(v, simpson((x) => (22 / 7) * (r * r - x * x), s ? 0 : -r, r, 200));
      const wrap = qm(qm(PI7, qm(Q(2), rr)), s ? rr : qm(Q(2), rr));
      return is(v, s ? qa(wrap, qm(qm(qm(PI7, Q(2)), rr), qm(rr, q(1, 2)))) : wrap);
    },
    bugs: ([k, s, a, g]) => {
      const r = q(7 * k, 2);
      const d = Q(7 * k);
      const r2 = qm(r, r);
      const r3 = qm(r2, r);
      const out: Bug[] = [];
      if (a === 0 && !s) out.push(B("circle-area", "conceptual", CS, "πr² is the area of a flat circle. A sphere's surface is four times that: 4πr².", dec(qm(PI7, r2))), B("cubed", "procedural", CS, "The radius was cubed. A surface area is an area, so the radius is squared: 4πr².", dec(qm(qm(PI7, Q(4)), r3))));
      if (a === 0 && s) out.push(B("curved-only", "procedural", CS, "Only the curved surface (2πr²) was found. A solid hemisphere also has a flat circular face, πr².", dec(qm(qm(PI7, Q(2)), r2))), B("whole-sphere", "conceptual", CS, "The whole sphere's surface (4πr²) was found. A hemisphere has half of it, 2πr², plus its flat face.", dec(qm(qm(PI7, Q(4)), r2))));
      if (a === 1 && !s) out.push(B("squared", "procedural", CS, "The radius was squared. A volume uses r³: V = 4/3 πr³.", dec(qm(qm(PI7, q(4, 3)), r2))), B("no-third", "recall", CS, "4πr³ was used. The volume of a sphere is 4/3 πr³.", dec(qm(qm(PI7, Q(4)), r3))));
      if (a === 1 && s) out.push(B("whole-sphere", "conceptual", CS, "The whole sphere's volume (4/3 πr³) was found. A hemisphere is half of it: 2/3 πr³.", dec(qm(qm(PI7, q(4, 3)), r3))), B("squared", "procedural", CS, "The radius was squared. A volume uses r³.", dec(qm(qm(PI7, q(2, 3)), r2))));
      if (g) {
        const d2 = qm(d, d);
        const wrong = a === 0 ? qm(qm(PI7, Q(s ? 3 : 4)), d2) : qm(qm(PI7, s ? q(2, 3) : q(4, 3)), qm(d2, d));
        out.push(B("diameter-as-radius", "procedural", CS, `The diameter (${7 * k} cm) was used as the radius. The radius is half of it, ${dec(r)} cm.`, dec(wrong)));
      }
      return out;
    },
    distractors: ([k, s, a]) => {
      const r = q(7 * k, 2);
      const r2 = qm(r, r);
      return a === 0 ? [dec(qm(qm(PI7, Q(s ? 4 : 2)), r2)), dec(qm(qm(PI7, Q(6)), r2))] : [dec(qm(qm(PI7, Q(2)), qm(r2, r))), dec(qm(qm(PI7, q(1, 3)), qm(r2, r)))];
    },
    variants: () => [],
    explain: say({ radius: "Radius", surface: "Surface area 4πr²", curved: "Curved surface 2πr²", flat: "Flat face πr²", total: "Total surface area", volume: "Volume" }),
    domain: SPH_DOM,
    difficulty: ([, s, , g]) => (!s && !g ? 1 : s && g ? 3 : 2),
    figure: ([k, s, , g]) => (s ? null : { type: "solid", name: "sphere", dims: [g ? `d = ${7 * k} cm` : `r = ${D(7 * k, 2)} cm`] }),
    word: ([k, s, a, g]) => {
      const size = g ? `a diameter of ${7 * k}` : `a radius of ${D(7 * k, 2)}`;
      if (!s) return a ? `A solid steel ball for a machine has ${size} cm. How much steel is in it, in cm³? (π = 22/7; a fraction is fine.)` : `A leather football has ${size} cm. How much leather covers it, in cm²? (π = 22/7; a fraction is fine.)`;
      return a ? `A solid hemispherical paperweight of glass has ${size} cm. How much glass is in it, in cm³? (π = 22/7; a fraction is fine.)` : `${name(k)} paints a solid wooden hemisphere with ${size} cm all over, including its flat face. What area is painted, in cm²? (π = 22/7; a fraction is fine.)`;
    },
    teach: {
      idea: "A sphere's surface is exactly four circles of the same radius (4πr²), and its volume is 4/3 πr³. A hemisphere is half a sphere: curved surface 2πr², volume 2/3 πr³.",
      method: "Halve a diameter to get the radius. For a solid hemisphere's total surface add the flat circle: 2πr² + πr² = 3πr².",
      alternatives: [{ id: "orange", title: "Peel an orange", kind: "conceptual", text: ["Draw round an orange four times on paper, then peel it.", "The peel just fills the four circles: the surface of a sphere is 4πr²."] }],
    },
    limits: "Radii that are multiples of 3.5 cm with π = 22/7; hollow shells are another family.",
  },
  {
    id: "amshell",
    arity: 3,
    title: "Hollow spheres and hemispherical bowls",
    competency: CS,
    type: "exact",
    mc: true,
    // [r, t, s]: inner radius r cm, thickness t cm (outer radius R = r + t); s 0 metal in a hollow sphere, 1 metal in a hemispherical bowl, 2 total surface of the bowl (inside, outside, rim)
    parse: none,
    reject: rj(SHELL_DOM, () => true, "Inner radii 2–20 cm and thicknesses 1–6 cm."),
    prompt: ([r, t, s]) => {
      const R = r + t;
      const what = s === 0 ? `A hollow metal ball has an inner radius of ${r} cm and an outer radius of ${R} cm. Find the volume of metal in it, in cm³.`
        : s === 1 ? `A hemispherical metal bowl has an inner radius of ${r} cm and an outer radius of ${R} cm. Find the volume of metal in the bowl, in cm³.`
        : `A hemispherical bowl has an inner radius of ${r} cm and an outer radius of ${R} cm. Find its total surface area (inside, outside and the flat ring at the rim), in cm².`;
      return `${what} Write the answer as a multiple of π and give only the number in front of π (for 52π, write 52; a fraction is fine).`;
    },
    solve: ([r, t, s]) => {
      const R = r + t;
      if (s < 2) {
        const c = qm(s ? q(2, 3) : q(4, 3), Q(R ** 3 - r ** 3));
        return { steps: [step("cubes", "subtract", EXP, [`${R}³`, `${r}³`], R ** 3 - r ** 3), step("volume", "multiply", CS, [s ? "2/3" : "4/3", R ** 3 - r ** 3], dec(c))], answer: dec(c) };
      }
      return {
        steps: [step("outer", "multiply", CS, [2, `${R}²`], 2 * R * R), step("inner", "multiply", CS, [2, `${r}²`], 2 * r * r), step("rim", "subtract", CIRC, [`${R}²`, `${r}²`], R * R - r * r), step("total", "add", CS, [2 * R * R, 2 * r * r, R * R - r * r], 3 * R * R + r * r)],
        answer: String(3 * R * R + r * r),
      };
    },
    // independent: the metal as thin slices (outer disc minus inner disc, Simpson's rule, in units of π); the
    // surfaces by Archimedes' wrapping cylinder and the rim ring as thin circular strips 2x dx
    validate: ([r, t, s], v) => {
      const R = r + t;
      if (s < 2) {
        const half = simpson(() => R * R - r * r, 0, r, 20) + simpson((x) => R * R - x * x, r, R, 200);
        return close(v, s ? half : 2 * half);
      }
      return close(v, 2 * R * R + 2 * r * r + simpson((x) => 2 * x, r, R, 20));
    },
    bugs: ([r, t, s]) => {
      const R = r + t;
      if (s === 0) return [B("outer-only", "conceptual", CS, "The volume of the whole outer ball was found. The hollow inside must be taken away: 4/3 π(R³ − r³).", dec(q(4 * R ** 3, 3))), B("thickness-cubed", "procedural", EXP, "The thickness was cubed. Cube each radius first, then subtract: R³ − r³ is not (R − r)³.", dec(q(4 * t ** 3, 3)))];
      if (s === 1) return [B("whole-shell", "conceptual", CS, "4/3 was used, as for a whole sphere. A bowl is half a shell: 2/3 π(R³ − r³).", dec(q(4 * (R ** 3 - r ** 3), 3))), B("outer-only", "conceptual", CS, "The volume of a solid hemisphere of the outer radius was found; the space inside the bowl must be taken away.", dec(q(2 * R ** 3, 3))), B("thickness-cubed", "procedural", EXP, "The thickness was cubed. R³ − r³ is not (R − r)³.", dec(q(2 * t ** 3, 3)))];
      return [B("no-rim", "procedural", CS, "The flat ring at the rim, π(R² − r²), was left out.", String(2 * R * R + 2 * r * r)), B("solid-hemisphere", "conceptual", CS, "The bowl was treated as a solid hemisphere (3πR²). A bowl has an inside surface too, and only a ring at the top.", String(3 * R * R)), B("outside-only", "procedural", CS, "The inside surface of the bowl, 2πr², was left out.", String(3 * R * R - r * r))];
    },
    distractors: ([r, t, s]) => {
      const R = r + t;
      return s < 2 ? [dec(q((s ? 2 : 4) * (R ** 3 + r ** 3), 3)), dec(q((s ? 2 : 4) * (R * R - r * r), 1))] : [String(4 * R * R), String(2 * (R * R + r * r) + 2 * (R * R - r * r))];
    },
    variants: () => [],
    explain: say({ cubes: "R³ − r³", volume: "Metal, as a multiple of π", outer: "Outside 2πR²", inner: "Inside 2πr²", rim: "Rim ring π(R² − r²)", total: "Total, as a multiple of π" }),
    domain: SHELL_DOM,
    cap: 300,
    difficulty: ([, , s]) => (s === 0 ? 1 : s === 1 ? 2 : 3),
    figure: ([r, t, s]) => (s === 0 ? { type: "solid", name: "sphere", dims: [`inner r = ${r} cm`, `outer R = ${r + t} cm`] } : null),
    word: ([r, t, s]) => {
      const R = r + t;
      return s === 0 ? `A shot-put shell is a hollow iron ball with an outer radius of ${R} cm and walls ${t} cm thick. How much iron is in it, in cm³? Give only the number in front of π (a fraction is fine).`
        : s === 1 ? `${name(r)}'s brass bowl is half of a hollow sphere: its inside radius is ${r} cm and the brass is ${t} cm thick. How much brass is in the bowl, in cm³? Give only the number in front of π (a fraction is fine).`
        : `A hemispherical steel bowl ${t} cm thick has an inside radius of ${r} cm. It is polished inside, outside and on its flat rim. What area is polished, in cm²? Give only the number in front of π.`;
    },
    teach: {
      idea: "A hollow solid is the big solid with the small one taken out, so its volume is the difference of the two volumes.",
      method: "Outer radius R = inner radius + thickness. Metal in a hollow sphere = 4/3 π(R³ − r³); in a hemispherical bowl = 2/3 π(R³ − r³). The bowl's total surface = 2πR² + 2πr² + π(R² − r²).",
      alternatives: [{ id: "two_solids", title: "Two solids, one taken away", kind: "procedural", text: ["Work out the volume of the solid with the outer radius.", "Work out the volume of the empty space with the inner radius, and subtract."] }],
    },
    limits: "Answers as multiples of π, whole-number radii; shells with an off-centre hole are left out.",
  },
  // ============================================================ Heron and Brahmagupta
  {
    id: "amheron",
    arity: 3,
    title: "Area of a triangle by Heron's formula",
    competency: HER,
    type: "exact",
    mc: true,
    // [a, b, c]: sides with a ≤ b ≤ c and an even perimeter (so s is a whole number)
    parse: none,
    reject: rj(HER_DOM, herOk, "Triangles with whole-number sides 3–24 cm (shortest first) and an even perimeter."),
    prompt: ([a, b, c]) => `A triangle has sides of ${a} cm, ${b} cm and ${c} cm. Use Heron's formula to find its area, in cm². Give the exact value (a surd such as 6√5 is fine).`,
    solve: ([a, b, c]) => {
      const s = (a + b + c) / 2;
      const P = s * (s - a) * (s - b) * (s - c);
      return {
        steps: [step("s", "half", HER, [a + b + c], s), step("differences", "note", HER, [`s − a = ${s - a}, s − b = ${s - b}, s − c = ${s - c}`], ""), step("product", "multiply", HER, [s, s - a, s - b, s - c], P), step("root", "root", SURD, [P], surd(P))],
        answer: surd(P),
      };
    },
    // independent: area = ½ab sin C, with C found from the cosine rule
    validate: ([a, b, c], v) => close(v, heronN(a, b, c)),
    bugs: ([a, b, c]) => {
      const p = a + b + c;
      const s = p / 2;
      const P = s * (s - a) * (s - b) * (s - c);
      return [
        B("perimeter-for-s", "procedural", HER, "The whole perimeter was used for s. In Heron's formula s is the semi-perimeter, half the perimeter.", surd(p * (p - a) * (p - b) * (p - c))),
        B("no-root", "procedural", HER, "s(s − a)(s − b)(s − c) was found, but its square root was not taken.", String(P)),
        B("half-two-sides", "conceptual", TRI, "½ × one side × another side works only when the angle between them is a right angle; it is not this triangle's area.", a * a + b * b === c * c ? null : D(a * b, 2)),
      ];
    },
    distractors: ([a, b, c]) => {
      const s = (a + b + c) / 2;
      const P = s * (s - a) * (s - b) * (s - c);
      return [surd(4 * P), surd(P * 2)];
    },
    variants: () => [],
    explain: say({ s: "Semi-perimeter s", differences: "Differences", product: "s(s − a)(s − b)(s − c)", root: "Area" }),
    domain: HER_DOM,
    cap: 400,
    difficulty: ([a, b, c]) => {
      const s = (a + b + c) / 2;
      return isqrt(s * (s - a) * (s - b) * (s - c)) !== null ? 1 : c <= 15 ? 2 : 3;
    },
    figure: ([a, b, c]) => ({ type: "triangle", sides: [`${c} cm`, `${a} cm`, `${b} cm`] }),
    word: ([a, b, c]) => `${name(a + b)}'s family owns a triangular plot of land with sides of ${a} m, ${b} m and ${c} m. What is the area of the plot, in m²? Give the exact value (a surd such as 6√5 is fine).`,
    teach: {
      idea: "Three sides fix a triangle, so they fix its area. Heron's formula gives it without the height: area = √(s(s − a)(s − b)(s − c)), where s is half the perimeter.",
      method: "Find s = (a + b + c)/2, then s − a, s − b and s − c. Multiply the four numbers and take the square root, simplifying the surd.",
      alternatives: [{ id: "altitude", title: "Find the height instead", kind: "procedural", text: ["Drop a perpendicular from the top corner to the longest side; it splits the triangle into two right triangles.", "Use Pythagoras on both to find where the foot lies and how tall the height is, then area = ½ × base × height."] }],
    },
    limits: "Whole-number sides up to 24 cm with an even perimeter; answers in simplest surd form.",
  },
  {
    id: "amherq",
    arity: 1,
    title: "Area of a quadrilateral split along a diagonal",
    competency: HER,
    type: "integer",
    mc: true,
    // [i]: QUADS[i] = [AB, BC, CD, DA, AC, area ABC, area ACD]
    parse: none,
    reject: ([i]) => (Number.isInteger(i) && i >= 0 && i < QUADS.length ? null : "A quadrilateral from the list of whole-area splits."),
    prompt: ([i]) => {
      const [a, b, c, e, d] = QUADS[i];
      return `A quadrilateral field ABCD has AB = ${a} m, BC = ${b} m, CD = ${c} m and DA = ${e} m. The diagonal AC is ${d} m long. Split the field along AC and use Heron's formula to find its area, in m².`;
    },
    solve: ([i]) => {
      const [a, b, c, e, d, A1, A2] = QUADS[i];
      const s1 = (a + b + d) / 2;
      const s2 = (c + e + d) / 2;
      return {
        steps: [step("abc", "root", HER, [`${s1} × ${s1 - a} × ${s1 - b} × ${s1 - d} = ${A1 * A1}`], A1), step("acd", "root", HER, [`${s2} × ${s2 - c} × ${s2 - e} × ${s2 - d} = ${A2 * A2}`], A2), step("total", "add", HER, [A1, A2], A1 + A2)],
        answer: A1 + A2,
      };
    },
    // independent: put the corners on a coordinate grid (A at the origin, C on the x-axis, B above, D below) and use the shoelace formula
    validate: ([i], v) => {
      const [a, b, c, e, d] = QUADS[i];
      const bx = (a * a - b * b + d * d) / (2 * d);
      const dx = (e * e - c * c + d * d) / (2 * d);
      const pts: P2[] = [[0, 0], [bx, Math.sqrt(a * a - bx * bx)], [d, 0], [dx, -Math.sqrt(e * e - dx * dx)]];
      let s2 = 0;
      for (let k = 0; k < 4; k++) s2 += cross(pts[k], pts[(k + 1) % 4]);
      return typeof v === "number" && near(v, Math.abs(s2) / 2, 1e-9);
    },
    bugs: ([i]) => {
      const [a, b, c, e, , A1, A2] = QUADS[i];
      const s = (a + b + c + e) / 2;
      const P = (s - a) * (s - b) * (s - c) * (s - e);
      return [
        B("one-triangle", "procedural", HER, "Only one of the two triangles was found. The diagonal splits the field into two triangles; add both areas.", A1 === A2 ? A1 : [A1, A2]),
        ...(Number.isInteger(s) && isqrt(P) !== null ? [B("cyclic-formula", "conceptual", BRA, "Brahmagupta's formula was used on the four sides. It works only when the corners lie on a circle; split along the diagonal instead.", isqrt(P)!)] : []),
      ];
    },
    distractors: ([i]) => {
      const [, , , , , A1, A2] = QUADS[i];
      return [2 * (A1 + A2), Math.abs(A1 - A2) || A1 + A2 + 6];
    },
    variants: () => [],
    explain: say({ abc: "Area of ΔABC", acd: "Area of ΔACD", total: "Area of the field" }),
    domain: [[0, QUADS.length - 1]],
    cap: 300,
    difficulty: ([i]) => (QUADS[i][4] <= 12 ? 1 : QUADS[i][4] <= 18 ? 2 : 3),
    word: ([i]) => {
      const [a, b, c, e, d] = QUADS[i];
      return `A school garden is a quadrilateral PQRS with PQ = ${a} m, QR = ${b} m, RS = ${c} m and SP = ${e} m. A straight path from P to R is ${d} m long. What is the area of the garden, in m²?`;
    },
    teach: {
      idea: "A diagonal cuts any quadrilateral into two triangles, and each triangle's three sides are known, so Heron's formula gives each area.",
      method: "Use Heron's formula on ΔABC (sides AB, BC, AC) and on ΔACD (sides CD, DA, AC), then add the two areas.",
      alternatives: [{ id: "two_plots", title: "Two triangular plots", kind: "conceptual", text: ["Imagine a fence along the diagonal: it makes two triangular plots.", "Measure each plot separately; the field is the two plots together."] }],
    },
    limits: "Convex quadrilaterals whose two triangles have whole-number areas (sides up to 25 m).",
  },
  {
    id: "ambrahma",
    arity: 4,
    title: "Area of a cyclic quadrilateral by Brahmagupta's formula",
    competency: BRA,
    type: "exact",
    mc: true,
    // [a, b, c, d]: AB, BC, CD, DA with an even perimeter and each side shorter than the other three together
    parse: none,
    reject: rj(BRA_DOM, braOk, "Cyclic quadrilaterals with whole-number sides 2–16 cm and an even perimeter."),
    prompt: ([a, b, c, d]) => `ABCD is a cyclic quadrilateral (its four corners lie on a circle) with AB = ${a} cm, BC = ${b} cm, CD = ${c} cm and DA = ${d} cm. Use Brahmagupta's formula to find its area, in cm². Give the exact value (a surd such as 4√15 is fine).`,
    solve: ([a, b, c, d]) => {
      const s = (a + b + c + d) / 2;
      const P = (s - a) * (s - b) * (s - c) * (s - d);
      return { steps: [step("s", "half", BRA, [a + b + c + d], s), step("product", "multiply", BRA, [s - a, s - b, s - c, s - d], P), step("root", "root", SURD, [P], surd(P))], answer: surd(P) };
    },
    // independent: opposite angles of a cyclic quadrilateral add to 180°, so the diagonal AC gives
    // cos B = (a² + b² − c² − d²) / (2(ab + cd)); area = ½(ab + cd) sin B
    validate: ([a, b, c, d], v) => {
      const cosB = (a * a + b * b - c * c - d * d) / (2 * (a * b + c * d));
      if (Math.abs(cosB) >= 1) return false;
      return close(v, 0.5 * (a * b + c * d) * Math.sqrt(1 - cosB * cosB));
    },
    bugs: ([a, b, c, d]) => {
      const p = a + b + c + d;
      const s = p / 2;
      const P = (s - a) * (s - b) * (s - c) * (s - d);
      return [
        B("no-root", "procedural", BRA, "(s − a)(s − b)(s − c)(s − d) was found, but its square root was not taken.", String(P)),
        B("perimeter-for-s", "procedural", BRA, "The whole perimeter was used for s. s is the semi-perimeter, half the perimeter.", surd((p - a) * (p - b) * (p - c) * (p - d))),
        B("heron-extra-s", "conceptual", HER, "An extra factor s was put in, as in Heron's formula. Brahmagupta's formula has only the four factors s − a, s − b, s − c, s − d.", surd(s * P)),
      ];
    },
    distractors: ([a, b, c, d]) => {
      const s = (a + b + c + d) / 2;
      const P = (s - a) * (s - b) * (s - c) * (s - d);
      return [surd(4 * P), surd(P + s)];
    },
    variants: () => [],
    explain: say({ s: "Semi-perimeter s", product: "(s − a)(s − b)(s − c)(s − d)", root: "Area" }),
    domain: BRA_DOM,
    cap: 300,
    difficulty: ([a, b, c, d]) => {
      const s = (a + b + c + d) / 2;
      return isqrt((s - a) * (s - b) * (s - c) * (s - d)) !== null ? 1 : s <= 16 ? 2 : 3;
    },
    word: ([a, b, c, d]) => `The four corners of a temple courtyard ABCD lie on a circle. Its sides are AB = ${a} m, BC = ${b} m, CD = ${c} m and DA = ${d} m. What is the area of the courtyard, in m²? Give the exact value (a surd such as 4√15 is fine).`,
    teach: {
      idea: "For a quadrilateral whose corners lie on a circle, the area depends only on its sides: √((s − a)(s − b)(s − c)(s − d)), with s half the perimeter (Brahmagupta, 7th century).",
      method: "Find s = (a + b + c + d)/2, then the four differences s − a, s − b, s − c, s − d. Multiply them and take the square root, simplifying the surd.",
      alternatives: [{ id: "heron_special", title: "Heron's formula hides inside", kind: "conceptual", text: ["Let side d shrink to 0: the quadrilateral becomes a triangle with sides a, b, c.", "Then s − d = s, and the formula becomes √(s(s − a)(s − b)(s − c)), which is Heron's formula."] }],
    },
    limits: "Whole-number sides up to 16 cm with an even perimeter; why Heron's formula is the case d = 0 is explained in teaching, not marked.",
  },
  // ============================================================ pyramids
  {
    id: "ampyrs",
    arity: 5,
    title: "Surface area of a square pyramid",
    competency: PYR,
    type: "exact",
    mc: true,
    // [t, k, o, a, g]: half the base side m, the height h and the slant height l are TRIPLES[t] × k; a 0 lateral, 1 total; g 0 slant height given, 1 height given
    parse: none,
    reject: rj(PYRS_DOM, pyrsOk, "Square pyramids with base side up to 40 cm whose slant height is a whole number."),
    prompt: ([t, k, o, a, g]) => {
      const [m, h, l] = leg(t, k, o);
      return `A square pyramid has a base of side ${2 * m} cm and ${g ? `a vertical height of ${h}` : `a slant height (the height of each triangular face) of ${l}`} cm. Find its ${a ? "total surface area" : "lateral surface area (the four triangular faces)"}, in cm².`;
    },
    solve: ([t, k, o, a, g]) => {
      const [m, h, l] = leg(t, k, o);
      const steps: Step[] = g ? [step("slant", "root", PYTH, [`${h}² + ${m}² = ${h * h + m * m}`], l)] : [];
      steps.push(step("face", "multiply", TRI, ["½", 2 * m, l], m * l), step("lateral", "multiply", PYR, [4, m * l], 4 * m * l));
      if (a) steps.push(step("base", "multiply", PYR, [2 * m, 2 * m], 4 * m * m), step("total", "add", PYR, [4 * m * l, 4 * m * m], 4 * m * l + 4 * m * m));
      return { steps, answer: String(a ? 4 * m * l + 4 * m * m : 4 * m * l) };
    },
    // independent: each face is an isosceles triangle with sides e, e and the base side, where the sloping edge
    // e² = l² + m²; its area comes from ½ab sin C (cosine rule)
    validate: ([t, k, o, a, g], v) => {
      const [m, h, ll] = leg(t, k, o);
      const l = g ? isqrt(h * h + m * m) : ll;
      if (!l) return false;
      const e = Math.sqrt(l * l + m * m);
      const lateral = 4 * heronN(e, e, 2 * m);
      return close(v, a ? lateral + 4 * m * m : lateral);
    },
    bugs: ([t, k, o, a, g]) => {
      const [m, h, l] = leg(t, k, o);
      const extra = a ? 4 * m * m : 0;
      return [
        ...(g ? [B("height-for-slant", "conceptual", PYR, "The vertical height was used as the height of each face. Each triangular face slopes, so use the slant height l = √(h² + (half the base)²).", String(4 * m * h + extra))] : []),
        B("no-half", "procedural", TRI, "Each face was taken as base × slant height. A triangle's area is ½ × base × height.", String(8 * m * l + extra)),
        ...(a ? [B("no-base", "procedural", PYR, "Only the four triangular faces were found. The total surface also includes the square base.", String(4 * m * l))] : [B("added-base", "procedural", PYR, "The square base was added. The lateral surface is only the four triangular faces.", String(4 * m * l + 4 * m * m))]),
      ];
    },
    distractors: ([t, k, o, a]) => {
      const [m, , l] = leg(t, k, o);
      return [String(2 * m * l + (a ? 4 * m * m : 0)), String(4 * m * l + (a ? 8 * m * m : 2 * m * m))];
    },
    variants: () => [],
    explain: say({ slant: "Slant height", face: "One face", lateral: "Four faces", base: "Base", total: "Total surface area" }),
    domain: PYRS_DOM,
    difficulty: ([, , , a, g]) => (a + g === 0 ? 1 : a + g === 1 ? 2 : 3),
    figure: ([t, k, o, , g]) => {
      const [m, h, l] = leg(t, k, o);
      return { type: "solid", name: "pyramid", dims: [`base side = ${2 * m} cm`, g ? `height = ${h} cm` : `slant height = ${l} cm`] };
    },
    word: ([t, k, o, a, g]) => {
      const [m, h, l] = leg(t, k, o);
      const size = g ? `a vertical height of ${h}` : `a slant height of ${l}`;
      return a ? `A glass paperweight is a square pyramid with a base of side ${2 * m} cm and ${size} cm. It is wrapped all over in gift paper. How much paper is needed, in cm²?` : `A tent is a square pyramid with a base of side ${2 * m} m and ${size} m. How much canvas is needed for its four sloping sides (no floor), in m²?`;
    },
    teach: {
      idea: "The lateral surface of a square pyramid is four equal triangles, each with the base side as its base and the slant height as its height.",
      method: "Lateral surface = 4 × ½ × side × slant height = 2 × side × slant height. Add side² for the total. If the vertical height is given, find the slant height first: l = √(h² + (side/2)²).",
      alternatives: [{ id: "net", title: "Unfold the net", kind: "conceptual", text: ["Unfold the pyramid: a square with a triangle on each edge.", "Add the areas of the five pieces (or only the four triangles for the lateral surface)."] }],
    },
    limits: "Square bases with whole-number slant heights; pyramids with other polygon bases are left out of surface area.",
  },
  {
    id: "ampyrv",
    arity: 4,
    title: "Volume of a pyramid",
    competency: PYR,
    type: "exact",
    mc: true,
    // [bt, x, y, h]: base 0 square of side x, 1 rectangle x × y, 2 right triangle with legs x and y; height h
    parse: none,
    reject: rj(PYRV_DOM, pyrvOk, "Square, rectangular or right-triangle bases with sides 2–20 cm and heights 3–30 cm."),
    prompt: ([bt, x, y, h]) => `A pyramid has ${bt === 0 ? `a square base of side ${x} cm` : bt === 1 ? `a rectangular base ${x} cm by ${y} cm` : `a base that is a right-angled triangle with shorter sides ${x} cm and ${y} cm`} and a vertical height of ${h} cm. Find its volume, in cm³. (A fraction is fine.)`,
    solve: ([bt, x, y, h]) => {
      const base = bt === 2 ? q(x * y, 2) : Q(x * y);
      const V = qm(base, q(h, 3));
      return { steps: [step("base", "multiply", bt === 2 ? TRI : CVOL, bt === 2 ? ["½", x, y] : [x, y], dec(base)), step("volume", "third", PYR, [dec(base), h], dec(V))], answer: dec(V) };
    },
    // independent: add up thin slices parallel to the base, each a smaller copy scaled by (1 − z/h) (Simpson's rule)
    validate: ([bt, x, y, h], v) => {
      const base = bt === 2 ? (x * y) / 2 : x * y;
      return close(v, simpson((z) => base * (1 - z / h) ** 2, 0, h, 200));
    },
    bugs: ([bt, x, y, h]) => {
      const base = bt === 2 ? q(x * y, 2) : Q(x * y);
      return [
        B("no-third", "conceptual", PYR, "Base area × height is the volume of a prism. A pyramid holds one third of that.", dec(qm(base, Q(h)))),
        B("half", "recall", PYR, "½ was used instead of ⅓.", dec(qm(base, q(h, 2)))),
        ...(bt === 2 ? [B("triangle-no-half", "prerequisite", TRI, "The base triangle's area was taken as x × y. A right triangle's area is ½ × x × y.", dec(q(x * y * h, 3)))] : []),
      ];
    },
    distractors: ([bt, x, y, h]) => {
      const base = bt === 2 ? q(x * y, 2) : Q(x * y);
      return [dec(qm(base, q(2 * h, 3))), dec(qm(base, q(h, 6)))];
    },
    variants: () => [],
    explain: say({ base: "Base area", volume: "Volume" }),
    domain: PYRV_DOM,
    cap: 300,
    difficulty: ([bt]) => (bt === 0 ? 1 : bt === 1 ? 2 : 3),
    figure: ([bt, x, y, h]) => ({ type: "solid", name: "pyramid", dims: [bt === 0 ? `base ${x} cm × ${x} cm` : bt === 1 ? `base ${x} cm × ${y} cm` : `right-triangle base ${x} cm, ${y} cm`, `height = ${h} cm`] }),
    word: ([bt, x, y, h]) => `A souvenir of solid glass is a pyramid ${h} cm tall with ${bt === 0 ? `a square base of side ${x} cm` : bt === 1 ? `a rectangular base ${x} cm by ${y} cm` : `a right-angled triangular base with shorter sides ${x} cm and ${y} cm`}. How much glass is in it, in cm³? (A fraction is fine.)`,
    teach: {
      idea: "Three equal pyramids fill a prism with the same base and height, so a pyramid's volume is ⅓ × base area × height.",
      method: "Find the base area (side², length × breadth, or ½ × the two shorter sides for a right triangle), multiply by the height and divide by 3.",
      alternatives: [{ id: "cube_split", title: "A cube cut into pyramids", kind: "conceptual", text: ["A cube can be cut into three equal pyramids, each with one face of the cube as its base and the cube's edge as its height.", "So each pyramid is ⅓ of base × height."] }],
    },
    limits: "Square, rectangular and right-triangle bases with the vertical height given.",
  },
  // ============================================================ combined solids
  {
    id: "amcombv",
    arity: 4,
    title: "Volume of a solid made of two or three basic solids",
    competency: COMB,
    type: "exact",
    mc: true,
    // [s, k, H, h]: radius 7k/2 cm; s 0 cone on a hemisphere (cone height h), 1 cylinder (height H) with a cone (height h), 2 capsule (cylinder H with two hemispheres), 3 cylinder H with one hemisphere
    parse: none,
    reject: rj(CV_DOM, cvOk, "Radii 3.5–21 cm with whole-number heights."),
    prompt: ([s, k, H, h]) => {
      const r = D(7 * k, 2);
      const shape = s === 0 ? `A toy is a cone standing on a hemisphere of the same radius, ${r} cm. The cone is ${h} cm tall.`
        : s === 1 ? `A solid is a cylinder of radius ${r} cm and height ${H} cm with a cone of the same radius and height ${h} cm on top.`
        : s === 2 ? `A capsule is a cylinder of radius ${r} cm and length ${H} cm with a hemisphere of the same radius on each end.`
        : `A solid is a cylinder of radius ${r} cm and height ${H} cm with a hemisphere of the same radius on top.`;
      return `${shape} Taking π = 22/7, find its volume, in cm³. (A fraction is fine.)`;
    },
    solve: ([s, k, H, h]) => {
      const r = q(7 * k, 2);
      const r2 = qm(PI7, qm(r, r));
      const cyl = qm(r2, Q(H));
      const cone = qm(r2, q(h, 3));
      const hem = qm(r2, qm(r, q(2, 3)));
      const parts: [string, string, R][] = s === 0 ? [["hem", "Hemisphere 2/3 πr³", hem], ["cone", "Cone ⅓πr²h", cone]] : s === 1 ? [["cyl", "Cylinder πr²H", cyl], ["cone", "Cone ⅓πr²h", cone]] : s === 2 ? [["cyl", "Cylinder πr²H", cyl], ["hem", "Two hemispheres = one sphere 4/3 πr³", qm(hem, Q(2))]] : [["cyl", "Cylinder πr²H", cyl], ["hem", "Hemisphere 2/3 πr³", hem]];
      const total = parts.reduce((acc, p) => qa(acc, p[2]), Q(0));
      return { steps: [...parts.map(([id, lab, v]) => step(id, "note", id === "cone" ? CS : id === "cyl" ? CYL : CS, [lab], dec(v))), step("total", "add", COMB, parts.map((p) => dec(p[2])), dec(total))], answer: dec(total) };
    },
    // independent: slice the solid across its axis and add the slices (Simpson's rule on each piece)
    validate: ([s, k, H, h], v) => {
      const r = 3.5 * k;
      const pi = 22 / 7;
      const cyl = simpson(() => pi * r * r, 0, H, 20);
      const cone = simpson((x) => pi * (r * (1 - x / h)) ** 2, 0, h, 200);
      const hem = simpson((x) => pi * (r * r - x * x), 0, r, 200);
      const total = s === 0 ? hem + cone : s === 1 ? cyl + cone : s === 2 ? cyl + 2 * hem : cyl + hem;
      return close(v, total);
    },
    bugs: ([s, k, H, h]) => {
      const r = q(7 * k, 2);
      const r2 = qm(PI7, qm(r, r));
      const cyl = qm(r2, Q(H));
      const cone = qm(r2, q(h, 3));
      const hem = qm(r2, qm(r, q(2, 3)));
      if (s === 0) return [B("sphere-for-hemisphere", "conceptual", CS, "4/3 πr³ (a whole sphere) was used for the hemisphere. A hemisphere is half: 2/3 πr³.", dec(qa(qm(hem, Q(2)), cone))), B("cone-no-third", "recall", CS, "πr²h was used for the cone. A cone is ⅓πr²h.", dec(qa(hem, qm(cone, Q(3))))), B("one-part", "procedural", COMB, "Only one of the two parts was found. The toy's volume is the hemisphere plus the cone.", dec(cone))];
      if (s === 1) return [B("cone-no-third", "recall", CS, "πr²h was used for the cone. A cone is ⅓πr²h.", dec(qa(cyl, qm(cone, Q(3))))), B("one-part", "procedural", COMB, "Only the cylinder was found. Add the cone on top.", dec(cyl))];
      if (s === 2) return [B("one-hemisphere", "procedural", COMB, "Only one hemisphere was added. A capsule has one on each end, which together make a whole sphere.", dec(qa(cyl, hem))), B("one-part", "procedural", COMB, "Only the cylinder was found. Add the two hemispherical ends.", dec(cyl))];
      return [B("sphere-for-hemisphere", "conceptual", CS, "4/3 πr³ (a whole sphere) was used for the dome. A hemisphere is half: 2/3 πr³.", dec(qa(cyl, qm(hem, Q(2))))), B("one-part", "procedural", COMB, "Only the cylinder was found. Add the hemisphere on top.", dec(cyl))];
    },
    distractors: ([s, k, H, h]) => {
      const r = q(7 * k, 2);
      const r2 = qm(PI7, qm(r, r));
      return [dec(qm(r2, Q(H + h))), dec(qm(r2, qa(Q(s === 0 ? h : H), r)))];
    },
    variants: () => [],
    explain: say({ total: "Total volume" }),
    domain: CV_DOM,
    cap: 300,
    difficulty: ([s, k]) => (s === 1 && k % 2 === 0 ? 1 : s === 0 || s === 3 ? 2 : s === 1 ? 2 : 3),
    word: ([s, k, H, h]) => {
      const r = D(7 * k, 2);
      return s === 0 ? `${name(k + h)}'s wooden spinning top is a cone ${h} cm tall on a hemisphere, both of radius ${r} cm. How much wood is in the top, in cm³? (π = 22/7; a fraction is fine.)`
        : s === 1 ? `A model rocket is a cylinder of radius ${r} cm and height ${H} cm topped by a cone ${h} cm tall of the same radius. How much space is inside the model, in cm³? (π = 22/7; a fraction is fine.)`
        : s === 2 ? `A medicine capsule is a cylinder ${H} mm long and ${r} mm in radius, with half a ball of the same radius at each end. How much medicine does it hold, in mm³? (π = 22/7; a fraction is fine.)`
        : `A grain store is a cylinder of radius ${r} m and height ${H} m with a dome shaped like a hemisphere on top. How much grain can it hold when full to the top of the dome, in m³? (π = 22/7; a fraction is fine.)`;
    },
    teach: {
      idea: "Volume adds up: a solid made of two pieces holds what the two pieces hold together.",
      method: "Name each basic solid in the object, find each volume (cylinder πr²H, cone ⅓πr²h, hemisphere 2/3 πr³), and add them.",
      alternatives: [{ id: "take_apart", title: "Take the object apart", kind: "procedural", text: ["Sketch the object and draw lines where one solid meets the next.", "Write each piece's formula under it, then add."] }],
    },
    limits: "Pieces sharing one radius (multiples of 3.5) with π = 22/7; solids with a piece scooped out are left out.",
  },
  {
    id: "amcombs",
    arity: 5,
    title: "Surface area of a combined solid (only the outside faces)",
    competency: COMB,
    type: "exact",
    mc: true,
    // [s, t, k, o, H]: s 0 cone on a hemisphere, 1 cylinder with a cone on top, 2 capsule, 3 cylinder with a hemisphere on top;
    // for s 0–1 the cone's radius, height and slant are TRIPLES[t] × k; for s 2–3 the radius is 7k/2
    parse: none,
    reject: rj(CS_DOM, csOk, "Cones whose slant height is a whole number, radii up to 30 cm, cylinder heights 3–24 cm."),
    prompt: ([s, t, k, o, H]) => {
      if (s >= 2) {
        const r = D(7 * k, 2);
        return `${s === 2 ? `A solid capsule is a cylinder of radius ${r} cm and length ${H} cm with a hemisphere of the same radius on each end.` : `A solid is a cylinder of radius ${r} cm and height ${H} cm, standing on its base, with a hemisphere of the same radius on top.`} Taking π = 22/7, find the total area of its outside surface, in cm². (A fraction is fine.)`;
      }
      const [r, h] = leg(t, k, o);
      return `${s === 0 ? `A solid toy is a cone of height ${h} cm on a hemisphere, both of radius ${r} cm.` : `A solid is a cylinder of radius ${r} cm and height ${H} cm, standing on its base, with a cone of the same radius and height ${h} cm on top.`} Taking π = ${piName(piFor(r))}, find the total area of its outside surface, in cm². (A fraction is fine.)`;
    },
    solve: (p) => {
      const { pi, parts } = combsParts(p);
      const total = parts.reduce((acc, x) => qa(acc, x[2]), Q(0));
      return { steps: [...parts.map(([id, lab, v]) => step(id, "note", id === "cone" ? CS : id === "side" ? CYL : id === "base" ? CIRC : CS, [lab], dec(qm(pi, v)))), step("total", "add", COMB, parts.map((x) => dec(qm(pi, x[2]))), dec(qm(pi, total)))], answer: dec(qm(pi, total)) };
    },
    // independent: Pappus's theorem: each piece of the outline turned round the axis sweeps an area of
    // 2π × (distance of the piece's middle from the axis) × (its length); then the answer uses the stated π
    validate: ([s, t, k, o, H], v) => {
      const [rr, h] = s >= 2 ? [3.5 * k, 0] : leg(t, k, o);
      const r = rr;
      const pi = s >= 2 ? 22 / 7 : qn(piFor(r));
      const sweep = (lengthOf: number, mid: number) => 2 * Math.PI * mid * lengthOf;
      const slant = Math.sqrt(r * r + h * h);
      const coneS = sweep(slant, r / 2);
      const hemS = sweep((Math.PI * r) / 2, (2 * r) / Math.PI);
      const sideS = sweep(H, r);
      const discS = sweep(r, r / 2);
      const area = s === 0 ? coneS + hemS : s === 1 ? discS + sideS + coneS : s === 2 ? sideS + 2 * hemS : discS + sideS + hemS;
      return close(v, (area / Math.PI) * pi);
    },
    bugs: (p) => {
      const [s, t, k, o] = p;
      const { pi, parts } = combsParts(p);
      const total = parts.reduce((acc, x) => qa(acc, x[2]), Q(0));
      const r = s >= 2 ? q(7 * k, 2) : Q(leg(t, k, o)[0]);
      const r2 = qm(r, r);
      const out: Bug[] = [B("hidden-faces", "conceptual", COMB, "The surface areas of the separate solids were added, including the circles where they are joined. Those faces are inside the solid and are not part of its outside.", dec(qm(pi, qa(total, qm(Q(2), r2)))))];
      if (s <= 1) {
        const [rr, h, l] = leg(t, k, o);
        out.push(B("height-for-slant", "conceptual", CS, "The cone's height was used in πrl. The cone's surface needs the slant height.", dec(qm(pi, qs(total, Q(rr * (l - h)))))));
      }
      if (s === 1 || s === 3) out.push(B("no-base", "procedural", COMB, "The circular base the solid stands on was left out. It is part of the outside surface.", dec(qm(pi, qs(total, r2)))));
      if (s === 2) out.push(B("cylinder-only", "procedural", COMB, "Only the cylinder (with its two flat ends) was found. The ends are covered by the hemispheres, whose curved surfaces must be used instead.", dec(qm(pi, qa(qm(qm(Q(2), r), Q(p[4])), qm(Q(2), r2))))));
      return out;
    },
    distractors: (p) => {
      const { pi, parts } = combsParts(p);
      const total = parts.reduce((acc, x) => qa(acc, x[2]), Q(0));
      return [dec(qm(pi, qm(total, Q(2)))), dec(qm(pi, qa(total, Q(10))))];
    },
    variants: () => [],
    explain: say({ total: "Outside surface" }),
    domain: CS_DOM,
    cap: 300,
    difficulty: ([s]) => (s === 2 ? 1 : s === 0 || s === 3 ? 2 : 3),
    word: ([s, t, k, o, H]) => {
      if (s >= 2) {
        const r = D(7 * k, 2);
        return s === 2 ? `A capsule-shaped solid soap is a cylinder ${H} cm long and ${r} cm in radius with a hemisphere on each end. It is wrapped in a thin film that covers it exactly. How much film is used, in cm²? (π = 22/7; a fraction is fine.)` : `A stone pillar is a cylinder of radius ${r} m and height ${H} m with a hemispherical cap. It is to be painted all over, including the base it stands on (before it is set up). What area is painted, in m²? (π = 22/7; a fraction is fine.)`;
      }
      const [r, h] = leg(t, k, o);
      const pi = piName(piFor(r));
      return s === 0 ? `${name(r + h)} paints a solid toy made of a cone ${h} cm tall on a hemisphere, both of radius ${r} cm. What area is painted, in cm²? (π = ${pi}; a fraction is fine.)` : `A solid wooden model of a temple tower is a cylinder of radius ${r} cm and height ${H} cm with a cone ${h} cm tall on top. It is varnished all over, including its base. What area is varnished, in cm²? (π = ${pi}; a fraction is fine.)`;
    },
    teach: {
      idea: "When two solids are joined, the faces where they touch disappear inside; only the faces you could still touch from outside count.",
      method: "List the outside pieces (cone πrl, cylinder side 2πrH, hemisphere 2πr², a flat base πr²), find each and add. Do not include the circle where two pieces meet.",
      alternatives: [{ id: "paint_test", title: "The paint test", kind: "conceptual", text: ["Imagine dipping the solid in paint: which faces get wet?", "A face pressed against another piece stays dry, so leave it out."] }],
    },
    limits: "Pieces sharing one radius; cones with whole-number slant heights; open shapes (tents with no floor) are left out.",
  },
  {
    id: "amrecast",
    arity: 5,
    title: "Melting and recasting solids",
    competency: COMB,
    type: "exact",
    mc: true,
    // [m, a, b, c, d]: m 0 sphere radius a·b into spheres of radius a (count); 1 sphere radius a drawn into a rod of radius b (length);
    // 2 cylinder radius a, height b recast into cones of radius c, height d (count)
    parse: none,
    reject: rj(RC_DOM, rcOk, "Whole-number sizes where the recast pieces come out as stated."),
    prompt: ([m, a, b, c, d]) =>
      m === 0 ? `A solid metal sphere of radius ${a * b} cm is melted and recast into small solid spheres, each of radius ${a} cm. How many small spheres are made?`
      : m === 1 ? `A solid metal sphere of radius ${a} cm is melted and drawn into a solid cylindrical rod of radius ${b} cm. How long is the rod, in cm? (A fraction is fine.)`
      : `A solid metal cylinder of radius ${a} cm and height ${b} cm is melted and recast into solid cones, each of radius ${c} cm and height ${d} cm. How many cones are made?`,
    solve: ([m, a, b, c, d]) => {
      if (m === 0) return { steps: [step("big", "note", CS, [`4/3 π × ${a * b}³`], ""), step("ratio", "divide", COMB, [`${a * b}³`, `${a}³`], b ** 3)], answer: String(b ** 3) };
      if (m === 1) {
        const L = q(4 * a ** 3, 3 * b * b);
        return { steps: [step("equal", "note", COMB, [`π × ${b}² × length = 4/3 π × ${a}³`], ""), step("length", "divide", COMB, [dec(q(4 * a ** 3, 3)), b * b], dec(L))], answer: dec(L) };
      }
      const n = q(3 * a * a * b, c * c * d);
      return { steps: [step("equal", "note", COMB, [`n × ⅓π × ${c}² × ${d} = π × ${a}² × ${b}`], ""), step("count", "divide", COMB, [3 * a * a * b, c * c * d], dec(n))], answer: dec(n) };
    },
    // independent: work out both volumes with π itself (not cancelled) and check that the metal is the same before and after
    validate: ([m, a, b, c, d], v) => {
      const x = num(v);
      if (x === null) return false;
      if (m === 0) return Number.isInteger(x) && near(x * (4 / 3) * Math.PI * a ** 3, (4 / 3) * Math.PI * (a * b) ** 3, 1e-9);
      if (m === 1) return near(Math.PI * b * b * x, (4 / 3) * Math.PI * a ** 3, 1e-9);
      return Number.isInteger(x) && near((x * Math.PI * c * c * d) / 3, Math.PI * a * a * b, 1e-9);
    },
    bugs: ([m, a, b, c, d]) => {
      if (m === 0) return [B("radius-ratio", "conceptual", COMB, "The radii were divided. Volume grows with the cube of the radius, so divide the volumes: (R/r)³.", String(b)), B("squared", "conceptual", COMB, "The ratio of radii was squared, as for surface areas. Volumes use cubes.", String(b * b))];
      if (m === 1) return [B("no-third", "recall", CS, "4πr³ was used for the sphere. Its volume is 4/3 πr³.", dec(q(4 * a ** 3, b * b))), B("not-squared", "procedural", CYL, "The rod's radius was not squared. The rod is a cylinder of volume πr² × length.", dec(q(4 * a ** 3, 3 * b)))];
      return [B("no-third", "conceptual", CS, "The cones were treated as cylinders. A cone holds ⅓πr²h, so three times as many are made.", dec(q(a * a * b, c * c * d))), B("not-squared", "procedural", CYL, "The radii were not squared. Volumes use πr².", dec(q(3 * a * b, c * d)))];
    },
    distractors: ([m, a, b, c, d]) => (m === 0 ? [String(b ** 3 * 2), String(3 * b)] : m === 1 ? [dec(q(2 * a ** 3, 3 * b * b)), dec(q(4 * a * a, 3 * b))] : [dec(q(6 * a * a * b, c * c * d)), dec(q(a * a * b, 3 * c * c * d))]),
    variants: () => [],
    explain: say({ big: "Volume of the big sphere", ratio: "Number of small spheres", equal: "Same volume of metal", length: "Length", count: "Number of cones" }),
    domain: RC_DOM,
    cap: 300,
    difficulty: ([m]) => (m === 0 ? 1 : m === 2 ? 2 : 3),
    word: ([m, a, b, c, d]) =>
      m === 0 ? `A jeweller melts a silver ball of radius ${a * b} mm and makes small round beads of radius ${a} mm from it. How many beads can be made?`
      : m === 1 ? `${name(a + b)} melts a solid copper ball of radius ${a} cm and draws it into a rod of radius ${b} cm. How long is the rod, in cm? (A fraction is fine.)`
      : `Kulfi is packed in a cylindrical tin of radius ${a} cm and height ${b} cm. It is all served in full cones of radius ${c} cm and height ${d} cm (no ice-cream on top). How many cones can be filled?`,
    teach: {
      idea: "Melting and recasting changes the shape but not the amount of metal, so the volume before equals the total volume after.",
      method: "Write volume before = volume after (× the number of pieces), cancel π, and solve for the unknown.",
      alternatives: [{ id: "clay", title: "Squash the clay", kind: "conceptual", text: ["Roll a ball of clay into a long snake: it looks bigger, but there is the same amount of clay.", "So the snake's volume equals the ball's volume."] }],
    },
    limits: "Whole numbers of pieces, rods of exact lengths; waste during melting is ignored.",
  },
  // ============================================================ frustum
  {
    id: "amfrust",
    arity: 5,
    title: "Volume and surface area of a frustum of a cone",
    competency: FR,
    type: "exact",
    mc: true,
    // [a, t, k, o, r]: R − r, the height h and the slant height l are TRIPLES[t] × k; small radius r; a 0 volume, 1 curved surface, 2 total surface
    parse: none,
    reject: rj(FR_DOM, frOk, "Frustums with radii up to 40 cm, heights up to 40 cm and whole-number slant heights, where π = 22/7 cancels."),
    prompt: (p) => {
      const { R, r, h } = frParts(p);
      return `A frustum of a cone (a cone with its top cut off parallel to the base) has end radii of ${R} cm and ${r} cm and a height of ${h} cm. Taking π = 22/7, find its ${["volume, in cm³", "curved surface area, in cm²", "total surface area (curved surface and both circular ends), in cm²"][p[0]]}.${p[0] === 0 ? " (A fraction is fine.)" : ""}`;
    },
    solve: (p) => {
      const { R, r, h, l } = frParts(p);
      const ans = frAnswer(p);
      if (p[0] === 0) return { steps: [step("sum", "add", FR, [`${R}²`, `${r}²`, `${R} × ${r}`], R * R + r * r + R * r), step("volume", "third", FR, ["22/7", h, R * R + r * r + R * r], dec(ans))], answer: dec(ans) };
      const steps: Step[] = [step("slant", "root", PYTH, [`${h}² + ${R - r}² = ${h * h + (R - r) ** 2}`], l), step("csa", "multiply", FR, ["22/7", l, `(${R} + ${r})`], dec(qm(PI7, Q(l * (R + r)))))];
      if (p[0] === 2) steps.push(step("ends", "multiply", CIRC, ["22/7", `(${R}² + ${r}²)`], dec(qm(PI7, Q(R * R + r * r)))), step("tsa", "add", FR, [dec(qm(PI7, Q(l * (R + r)))), dec(qm(PI7, Q(R * R + r * r)))], dec(ans)));
      return { steps, answer: dec(ans) };
    },
    // independent: the frustum is a big cone minus the small cone cut off; similar triangles give the big cone's
    // height H = hR/(R − r) and slant L = lR/(R − r)
    validate: (p, v) => {
      const { R, r, h } = frParts(p);
      const H = q(h * R, R - r);
      if (p[0] === 0) return is(v, qs(qm(qm(PI7, q(R * R, 3)), H), qm(qm(PI7, q(r * r, 3)), qs(H, Q(h)))));
      const l = isqrt(h * h + (R - r) ** 2);
      if (l === null) return false;
      const L = q(l * R, R - r);
      const csa = qs(qm(PI7, qm(Q(R), L)), qm(PI7, qm(Q(r), qs(L, Q(l)))));
      return is(v, p[0] === 1 ? csa : qa(csa, qm(PI7, Q(R * R + r * r))));
    },
    bugs: (p) => {
      const { R, r, h, l } = frParts(p);
      if (p[0] === 0)
        return [
          B("no-Rr", "recall", FR, "The middle term Rr was left out. The volume is ⅓πh(R² + r² + Rr).", dec(qm(PI7, q(h * (R * R + r * r), 3)))),
          B("no-third", "recall", FR, "The ⅓ was left out. A frustum is part of a cone, so its volume formula has ⅓.", dec(qm(PI7, Q(h * (R * R + r * r + R * r))))),
          B("average-cylinder", "conceptual", FR, "The frustum was treated as a cylinder with the average radius. Its sides slope, so that does not give its volume.", dec(qm(PI7, q(h * (R + r) * (R + r), 4)))),
        ];
      const csa = qm(PI7, Q(l * (R + r)));
      if (p[0] === 1) return [B("height-for-slant", "conceptual", FR, "The height was used instead of the slant height. The curved surface is measured along the sloping side: π l (R + r).", dec(qm(PI7, Q(h * (R + r))))), B("difference", "recall", FR, "π l (R − r) was used. The curved surface uses the sum of the radii: π l (R + r).", dec(qm(PI7, Q(l * (R - r)))))];
      return [B("one-end", "procedural", FR, "Only one circular end was added. A closed frustum has two ends, πR² and πr².", dec(qa(csa, qm(PI7, Q(R * R))))), B("no-ends", "procedural", FR, "Only the curved surface was found. The total surface also includes both circular ends.", dec(csa)), B("height-for-slant", "conceptual", FR, "The height was used instead of the slant height in π l (R + r).", dec(qm(PI7, Q(h * (R + r) + R * R + r * r))))];
    },
    distractors: (p) => {
      const { R, r, h, l } = frParts(p);
      return p[0] === 0 ? [dec(qm(PI7, q(h * (R * R - r * r), 3))), dec(qm(PI7, q(h * R * R, 3)))] : [dec(qm(PI7, Q(l * (R + r) * 2))), dec(qm(PI7, Q(l * (R + r) + (R - r) ** 2)))];
    },
    variants: () => [],
    explain: say({ sum: "R² + r² + Rr", volume: "Volume ⅓πh(R² + r² + Rr)", slant: "Slant height l", csa: "Curved surface π l (R + r)", ends: "Two ends π(R² + r²)", tsa: "Total surface area" }),
    domain: FR_DOM,
    cap: 300,
    difficulty: ([a]) => (a === 1 ? 1 : a === 0 ? 2 : 3),
    word: (p) => {
      const { R, r, h } = frParts(p);
      return p[0] === 0 ? `A steel bucket is shaped like a frustum: ${h} cm deep, with a radius of ${R} cm at the top and ${r} cm at the bottom. How much water does it hold when full, in cm³? (π = 22/7; a fraction is fine.)`
        : p[0] === 1 ? `A lampshade is the sloping side of a frustum ${h} cm tall, with end radii of ${R} cm and ${r} cm. How much cloth covers it (no top or bottom), in cm²? (π = 22/7)`
        : `${name(R + r)} makes a closed tin shaped like a frustum, ${h} cm tall, with end radii of ${R} cm and ${r} cm. How much metal sheet is needed for all of it, in cm²? (π = 22/7)`;
    },
    teach: {
      idea: "A frustum is a big cone with a small cone cut off its top, so its volume and curved surface are the big cone's minus the small cone's.",
      method: "Volume = ⅓πh(R² + r² + Rr). Slant height l = √(h² + (R − r)²); curved surface = π l (R + r); total = π l (R + r) + πR² + πr².",
      alternatives: [{ id: "two_cones", title: "Big cone minus small cone", kind: "conceptual", text: ["Extend the sloping side up to a point: you get a big cone, and the part cut off is a small cone of the same shape.", "Similar triangles give the big cone's height; subtract the two cone volumes."] }],
    },
    limits: "Slant heights that are whole numbers and π = 22/7 chosen so it cancels to whole numbers or thirds.",
  },
  // ============================================================ sectors and segments (Grade 10)
  {
    id: "amseg",
    arity: 3,
    title: "Area of a segment of a circle",
    competency: SEC,
    type: "exact",
    mc: true,
    // [r, ai, ask]: radius r cm, central angle 60°, 90° or 120°; ask 0 minor segment, 1 major segment
    parse: none,
    reject: rj(SEG_DOM, segOk, "Radii 3–42 cm (multiples of 6 for 60°, of 3 for 120°) so that the decimals stay short."),
    prompt: ([r, ai, ask]) => `In a circle of radius ${r} cm, the chord AB makes an angle of ${SEG_ANG[ai]}° at the centre O. Taking π = 3.14${ai === 1 ? "" : " and √3 = 1.73"}, find the area of the ${ask ? "major" : "minor"} segment cut off by AB, in cm².`,
    solve: ([r, ai, ask]) => {
      const th = SEG_ANG[ai];
      const sector = qm(q(th, 360), qm(PI314, Q(r * r)));
      const tri = ai === 1 ? q(r * r, 2) : qm(q(173, 400), Q(r * r));
      const minor = qs(sector, tri);
      const steps: Step[] = [step("sector", "multiply", SEC, [`${th}/360`, "3.14", `${r}²`], dec(sector)), step("triangle", "multiply", TRI, ai === 1 ? ["½", r, r] : ["1.73/4", `${r}²`], dec(tri)), step("minor", "subtract", SEC, [dec(sector), dec(tri)], dec(minor))];
      if (!ask) return { steps, answer: dec(minor) };
      const circle = qm(PI314, Q(r * r));
      steps.push(step("circle", "multiply", CIRC, ["3.14", `${r}²`], dec(circle)), step("major", "subtract", SEC, [dec(circle), dec(minor)], dec(qs(circle, minor))));
      return { steps, answer: dec(qs(circle, minor)) };
    },
    // independent: the segment as ½r²(θ − sin θ), with θ in radians (θ° × 3.14/180) and sin 60° = sin 120° = 1.73/2
    validate: ([r, ai, ask], v) => {
      const th = SEG_ANG[ai];
      const rad = qm(q(th, 180), PI314);
      const sin = ai === 1 ? Q(1) : q(173, 200);
      const minor = qm(q(r * r, 2), qs(rad, sin));
      return is(v, ask ? qs(qm(PI314, Q(r * r)), minor) : minor);
    },
    bugs: ([r, ai, ask]) => {
      const th = SEG_ANG[ai];
      const sector = qm(q(th, 360), qm(PI314, Q(r * r)));
      const tri = ai === 1 ? q(r * r, 2) : qm(q(173, 400), Q(r * r));
      const minor = qs(sector, tri);
      const circle = qm(PI314, Q(r * r));
      if (!ask)
        return [
          B("sector-only", "conceptual", SEC, "The area of the sector was given. The segment is the sector with the triangle OAB taken away.", dec(sector)),
          B("added-triangle", "procedural", SEC, "The triangle was added to the sector. The segment is the sector minus the triangle.", dec(qa(sector, tri))),
          ...(ai !== 1 ? [B("right-triangle", "prerequisite", TRI, `The triangle OAB was taken as ½ × r × r, which is right only for a 90° angle. For ${th}° its area is (√3/4)r².`, dec(qs(sector, q(r * r, 2))))] : []),
        ];
      return [B("major-sector", "conceptual", SEC, "The major sector was found. The major segment is the whole circle minus the minor segment, so the triangle must be counted.", dec(qs(circle, sector))), B("gave-minor", "procedural", SEC, "The minor segment was given. The question asks for the major (larger) segment: subtract the minor one from the whole circle.", dec(minor))];
    },
    distractors: ([r, ai, ask]) => {
      const th = SEG_ANG[ai];
      const sector = qm(q(th, 360), qm(PI314, Q(r * r)));
      const tri = ai === 1 ? q(r * r, 2) : qm(q(173, 400), Q(r * r));
      return ask ? [dec(qa(qm(PI314, Q(r * r)), tri)), dec(qs(qm(PI314, Q(r * r)), tri))] : [dec(qm(sector, Q(2))), dec(qs(qm(sector, Q(2)), tri))];
    },
    variants: () => [],
    explain: say({ sector: "Sector OAB", triangle: "Triangle OAB", minor: "Minor segment", circle: "Whole circle", major: "Major segment" }),
    domain: SEG_DOM,
    difficulty: ([, ai, ask]) => (ai === 1 && !ask ? 1 : !ask ? 2 : 3),
    word: ([r, ai, ask]) => `A round table top of radius ${r} cm has a straight line painted across it, from A to B on the edge, making an angle of ${SEG_ANG[ai]}° at the centre. The ${ask ? "larger" : "smaller"} part cut off by the line is painted blue. What area is blue, in cm²? (π = 3.14${ai === 1 ? "" : ", √3 = 1.73"})`,
    teach: {
      idea: "A chord cuts a circle into two segments. The minor segment is the sector OAB with the triangle OAB taken away; the major segment is the rest of the circle.",
      method: "Sector = θ/360 × πr². Triangle OAB = ½r² for 90°, or (√3/4)r² for 60° and 120°. Minor segment = sector − triangle; major = πr² − minor.",
      alternatives: [{ id: "cut_out", title: "Cut the slice", kind: "conceptual", text: ["Cut a slice (sector) out of a paper circle, then cut straight along the chord.", "The triangle falls away; the curved strip left is the segment."] }],
    },
    limits: "Central angles of 60°, 90° and 120° with π = 3.14 and √3 = 1.73.",
  },
  {
    id: "amclock",
    arity: 4,
    title: "Area swept and distance travelled by a clock hand",
    competency: SEC,
    type: "exact",
    mc: true,
    // [L, t, hand, ask]: hand length L cm; hand 0 minute hand for 5t minutes, 1 hour hand for t hours; ask 0 area swept, 1 distance travelled by the tip
    parse: none,
    reject: rj(CLK_DOM, () => true, "Hands 4–21 cm long, 5–55 minutes or 1–11 hours."),
    prompt: ([L, t, hand, ask]) => `The ${hand ? "hour" : "minute"} hand of a clock is ${L} cm long. Taking π = ${piName(piFor(L))}, find the ${ask ? "distance its tip travels" : "area it sweeps"} in ${hand ? `${t} hour${t === 1 ? "" : "s"}` : `${5 * t} minutes`}, in ${ask ? "cm" : "cm²"}. (A fraction is fine.)`,
    solve: ([L, t, hand, ask]) => {
      const pi = piFor(L);
      const angle = 30 * t;
      const whole = ask ? qm(pi, Q(2 * L)) : qm(pi, Q(L * L));
      const part = qm(q(angle, 360), whole);
      return { steps: [step("angle", "multiply", SEC, hand ? [t, "30°"] : [5 * t, "6°"], `${angle}°`), step("whole", "multiply", CIRC, ask ? [2, piName(pi), L] : [piName(pi), `${L}²`], dec(whole)), step("part", "multiply", SEC, [`${angle}/360`, dec(whole)], dec(part))], answer: dec(part) };
    },
    // independent: count the marks the hand passes (minute marks out of 60, or hour marks out of 12); the circle's area as ½ × circumference × radius
    validate: ([L, t, hand, ask], v) => {
      const pi = piFor(L);
      let passed = 0;
      for (let i = 0; i < (hand ? t : 5 * t); i++) passed++;
      const frac = q(passed, hand ? 12 : 60);
      const C = qm(pi, Q(2 * L));
      return is(v, qm(frac, ask ? C : qm(C, q(L, 2))));
    },
    bugs: ([L, t, hand, ask]) => {
      const pi = piFor(L);
      const whole = ask ? qm(pi, Q(2 * L)) : qm(pi, Q(L * L));
      const other = ask ? qm(pi, Q(L * L)) : qm(pi, Q(2 * L));
      return [
        hand ? B("six-per-hour", "conceptual", SEC, "The hour hand was turned 6° per hour, like the minute hand per minute. The hour hand turns 30° each hour (360° in 12 hours).", dec(qm(q(6 * t, 360), whole))) : B("minutes-as-degrees", "conceptual", SEC, `${5 * t} minutes was used as ${5 * t}°. The minute hand turns 6° each minute (360° in 60 minutes).`, dec(qm(q(5 * t, 360), whole))),
        ask ? B("area-formula", "conceptual", SEC, "The area formula was used. The distance the tip travels is an arc length, a part of 2πr.", dec(qm(q(30 * t, 360), other))) : B("arc-formula", "conceptual", SEC, "The arc-length formula was used. The area swept is a sector, a part of πr².", dec(qm(q(30 * t, 360), other))),
        B("whole-circle", "procedural", SEC, "The whole circle was given. The hand only turns part of the way round.", dec(whole)),
      ];
    },
    distractors: ([L, t, , ask]) => {
      const pi = piFor(L);
      const whole = ask ? qm(pi, Q(2 * L)) : qm(pi, Q(L * L));
      return [dec(qm(q(30 * t, 180), whole)), dec(qm(q(30 * t + 30, 360), whole))];
    },
    variants: () => [],
    explain: say({ angle: "Angle turned", whole: "Whole circle", part: "The part turned" }),
    domain: CLK_DOM,
    cap: 300,
    difficulty: ([, t, hand]) => (!hand && [3, 6, 9].includes(t) ? 1 : !hand ? 2 : 3),
    word: ([L, t, hand, ask]) => `${name(L + t)} watches the classroom clock, whose ${hand ? "hour" : "minute"} hand is ${L} cm long. During ${hand ? `${t} hour${t === 1 ? "" : "s"}` : `a ${5 * t}-minute lesson`}, how ${ask ? "far does the tip of the hand travel, in cm" : "much of the clock face does the hand sweep over, in cm²"}? (π = ${piName(piFor(L))}; a fraction is fine.)`,
    teach: {
      idea: "A clock hand sweeps out a sector. The minute hand turns 360° in 60 minutes (6° a minute); the hour hand turns 360° in 12 hours (30° an hour).",
      method: "Find the angle turned, then take that fraction of 360° of the whole circle: area θ/360 × πr², or distance θ/360 × 2πr.",
      alternatives: [{ id: "fraction", title: "Think of the fraction of a turn", kind: "conceptual", text: ["15 minutes is a quarter of an hour, so the minute hand sweeps a quarter of the circle.", "In general, the minute hand turns minutes/60 of a full turn and the hour hand hours/12."] }],
    },
    limits: "Whole multiples of 5 minutes or whole hours; both hands moving together is left out.",
  },
  {
    id: "amsecinv",
    arity: 3,
    title: "Finding the angle or radius of a sector",
    competency: SEC,
    type: "exact",
    mc: true,
    // [k, ti, ask]: radius 7k cm, angle INV_ANG[ti]; ask 0 angle from arc length, 1 angle from area, 2 radius from area and angle
    parse: none,
    reject: rj(INV_DOM, invOk, "Radii 7–42 cm and angles 30°–300° that give a terminating arc length or area."),
    prompt: (p) => {
      const { r, th, arc, area } = invData(p);
      return p[2] === 0 ? `An arc of a circle of radius ${r} cm is ${dec(arc)} cm long. Taking π = 22/7, find the angle the arc makes at the centre, in degrees.`
        : p[2] === 1 ? `A sector of a circle of radius ${r} cm has an area of ${dec(area)} cm². Taking π = 22/7, find the angle of the sector, in degrees.`
        : `A sector with an angle of ${th}° has an area of ${dec(area)} cm². Taking π = 22/7, find the radius of the circle, in cm.`;
    },
    solve: (p) => {
      const { r, th, arc, area } = invData(p);
      if (p[2] === 0) return { steps: [step("circ", "multiply", CIRC, [2, "22/7", r], dec(qm(PI7, Q(2 * r)))), step("angle", "multiply", SEC, [`${dec(arc)} ÷ ${dec(qm(PI7, Q(2 * r)))}`, 360], th)], answer: String(th) };
      if (p[2] === 1) return { steps: [step("circle", "multiply", CIRC, ["22/7", `${r}²`], dec(qm(PI7, Q(r * r)))), step("angle", "multiply", SEC, [`${dec(area)} ÷ ${dec(qm(PI7, Q(r * r)))}`, 360], th)], answer: String(th) };
      return { steps: [step("r2", "note", SEC, [`r² = ${dec(area)} × 360 ÷ (${th} × 22/7)`], r * r), step("radius", "root", SURD, [r * r], r)], answer: String(r) };
    },
    // independent: put the answer back: the arc or area it gives must be the one stated
    validate: (p, v) => {
      const { r, th, arc, area } = invData(p);
      const x = val(v);
      if (!x || x[0] <= 0) return false;
      if (p[2] === 0) return qe(qm(qd(x, Q(360)), qm(PI7, Q(2 * r))), arc);
      if (p[2] === 1) return qe(qm(qd(x, Q(360)), qm(PI7, Q(r * r))), area);
      return qe(qm(q(th, 360), qm(PI7, qm(x, x))), area);
    },
    bugs: (p) => {
      const { r, th } = invData(p);
      if (p[2] === 0) return [B("pi-r", "recall", SEC, "πr was used for the whole circumference. The circumference is 2πr.", String(2 * th)), B("over-180", "recall", SEC, "180° was used for a full turn. A full turn is 360°.", D(th, 2))];
      if (p[2] === 1) return [B("arc-formula", "conceptual", SEC, "The arc-length formula (2πr) was used with the area. The area of a sector is θ/360 × πr².", D(th * r, 2)), B("not-squared", "procedural", CIRC, "The radius was not squared: the whole circle's area is πr².", String(th * r))];
      return [B("no-root", "procedural", SEC, "r² was found, but its square root was not taken.", String(r * r)), B("arc-formula", "conceptual", SEC, "The arc-length formula was used. The area of a sector is θ/360 × πr².", D(r * r, 2))];
    },
    distractors: (p) => {
      const { r, th } = invData(p);
      return p[2] === 2 ? [String(r + 7), String(2 * r)] : [String(360 - th), String(th + 30)];
    },
    variants: () => [],
    explain: say({ circ: "Whole circumference", circle: "Whole circle's area", angle: "Angle = fraction of the circle × 360°", r2: "r²", radius: "Radius" }),
    domain: INV_DOM,
    difficulty: ([, , ask]) => (ask === 0 ? 1 : ask === 1 ? 2 : 3),
    word: (p) => {
      const { r, th, arc, area } = invData(p);
      return p[2] === 0 ? `The tip of a swinging pendulum ${r} cm long travels along an arc ${dec(arc)} cm long. Through what angle does the pendulum swing, in degrees? (π = 22/7)`
        : p[2] === 1 ? `A garden sprinkler throws water ${r} m and waters a sector-shaped area of ${dec(area)} m². Through what angle does it turn, in degrees? (π = 22/7)`
        : `A fan-shaped design is a sector with an angle of ${th}° and an area of ${dec(area)} cm². What is its radius, in cm? (π = 22/7)`;
    },
    teach: {
      idea: "A sector is θ/360 of its circle, so the arc is θ/360 of the circumference and the area is θ/360 of the circle's area. Knowing the part and the whole gives θ.",
      method: "Angle = (arc ÷ 2πr) × 360°, or (area ÷ πr²) × 360°. For the radius, r² = area × 360 ÷ (θπ), then take the square root.",
      alternatives: [{ id: "fraction_first", title: "Fraction of the circle first", kind: "procedural", text: ["Work out the whole circle (2πr or πr²).", "Divide the given part by it: that fraction of 360° is the angle."] }],
    },
    limits: "Radii that are multiples of 7 with π = 22/7, and angles that give terminating decimals.",
  },
  // ============================================================ real numbers
  {
    id: "amrec",
    arity: 3,
    title: "Writing a recurring decimal as a fraction",
    competency: RN,
    type: "exact",
    mc: true,
    // [f, n, x]: f 0 n.ddd… (x = d), 1 n.ababab… (x = ab), 2 0.nxxx… (n = the digit that does not repeat)
    parse: none,
    reject: rj(REC_DOM, recOk, "Recurring decimals with one repeating digit, a two-digit repeating block, or one digit before a repeating digit."),
    prompt: (p) => `Write ${recText(p)} (${recNote(p)}) as a fraction p/q in its simplest form.`,
    solve: (p) => {
      const [f, n, x] = p;
      const v = recValue(p);
      if (f === 0) return { steps: [step("times10", "note", RN, [`10x − x = ${10 * n + x}.${x}${x}… − ${n}.${x}${x}…`], `9x = ${9 * n + x}`), step("divide", "divide", RN, [9 * n + x, 9], dec(v))], answer: dec(v) };
      if (f === 1) return { steps: [step("times100", "note", RN, ["100x − x removes the repeating block"], `99x = ${99 * n + x}`), step("divide", "divide", RN, [99 * n + x, 99], dec(v))], answer: dec(v) };
      return { steps: [step("times", "note", RN, [`100x − 10x = ${10 * n + x}.${x}${x}… − ${n}.${x}${x}…`], `90x = ${9 * n + x}`), step("divide", "divide", RN, [9 * n + x, 90], dec(v))], answer: dec(v) };
    },
    // independent: long division of the answer must reproduce the decimal's digits
    validate: (p, v) => {
      const [f, n, x] = p;
      const r = val(v);
      if (!r || r[0] < 0) return false;
      const want = f === 0 ? `${n}.${String(x).repeat(14)}` : f === 1 ? `${n}.${String(x).padStart(2, "0").repeat(7)}` : `0.${n}${String(x).repeat(13)}`;
      return longDivision(r[0], r[1], 14) === want;
    },
    bugs: (p) => {
      const [f, n, x] = p;
      if (f === 0) return [B("over-ten", "conceptual", RN, `The decimal was cut off after one digit (${n}.${x}). It goes on for ever, so it equals ${x}/9, not ${x}/10, after the whole part.`, D(10 * n + x, 10)), ...(n > 0 ? [B("whole-part-lost", "procedural", RN, `The whole-number part ${n} was dropped.`, D(x, 9))] : [])];
      if (f === 1) return [B("over-hundred", "conceptual", RN, "The decimal was cut off after two digits. A repeating block of two digits goes over 99, not 100.", D(100 * n + x, 100)), B("one-nine", "procedural", RN, "Only one 9 was used. A block of two repeating digits needs 99 (100x − x).", dec(qa(Q(n), q(x, 9)))), ...(n > 0 ? [B("whole-part-lost", "procedural", RN, `The whole-number part ${n} was dropped.`, D(x, 99))] : [])];
      return [B("all-repeating", "conceptual", RN, `Both digits were treated as repeating (0.${n}${x}${n}${x}…). Only the ${x} repeats.`, D(10 * n + x, 99)), B("no-subtract", "procedural", RN, `${n}${x} was put over 90 without taking away the part that does not repeat (${n}${x} − ${n}).`, D(10 * n + x, 90)), B("over-hundred", "conceptual", RN, "The decimal was cut off after two digits; it goes on for ever.", D(10 * n + x, 100))];
    },
    distractors: (p) => {
      const v = recValue(p);
      return [dec(qa(v, q(1, 9))), dec(qm(v, q(10, 11)))];
    },
    variants: () => [],
    explain: say({ times10: "Multiply by 10 and subtract", times100: "Multiply by 100 and subtract", times: "Multiply by 100 and by 10 and subtract", divide: "Divide" }),
    domain: REC_DOM,
    cap: 400,
    difficulty: ([f, n]) => (f === 0 && n === 0 ? 1 : f < 2 ? 2 : 3),
    word: (p) => `${name(p[1] + p[2])}'s calculator shows ${recText(p)} and ${name(p[1] + p[2])} knows ${recNote(p)}. Which fraction p/q, in its simplest form, is this?`,
    teach: {
      idea: "A recurring decimal is rational: multiplying by a power of 10 shifts the repeating part, and subtracting makes the endless tail cancel.",
      method: "Let x be the number. Multiply by 10 for one repeating digit, by 100 for two, and subtract so the repeating tails cancel; then divide and simplify.",
      alternatives: [{ id: "nines", title: "The nines rule", kind: "procedural", text: ["0.ddd… = d/9 and 0.ababab… = ab/99.", "If one digit comes before the repeat, as in 0.2777…, use (27 − 2)/90."] }],
    },
    limits: "One repeating digit, a two-digit repeating block, or one digit before one repeating digit.",
  },
  {
    id: "amterm",
    arity: 4,
    title: "Will the decimal terminate or recur?",
    competency: RN,
    type: "choice",
    // [p, i, j, mi]: the fraction p / (2^i × 5^j × TERM_M[mi])
    parse: none,
    reject: rj(TERM_DOM, termOk, "Fractions p/q with q up to 2000 built from 2s, 5s and one other factor."),
    choices: () => ["It terminates (it stops after some digits).", "It goes on for ever, with a block of digits that repeats.", "It goes on for ever and never repeats."],
    prompt: (p) => `Without dividing it out, decide what kind of decimal expansion ${p[0]}/${termQ(p)} has.`,
    solve: (p) => {
      const qq = termQ(p);
      const g = gcd(p[0], qq);
      let m = qq / g;
      while (m % 2 === 0) m /= 2;
      while (m % 5 === 0) m /= 5;
      return { steps: [step("simplify", "divide", RN, [`${p[0]}/${qq}`, g], `${p[0] / g}/${qq / g}`), step("factors", "note", RN, [`denominator ${qq / g}: ${m === 1 ? "only 2s and 5s" : `has the factor ${m}`}`], "")], answer: m === 1 ? 0 : 1 };
    },
    // independent: do the long division and see whether it stops within 60 digits
    validate: (p, v) => v === (digitsUntilExact(p[0], termQ(p)) === null ? 1 : 0),
    bugs: (p) => {
      const qq = termQ(p);
      const m = TERM_M[p[3]];
      const g = gcd(p[0], qq);
      const ends = digitsUntilExact(p[0], qq) !== null;
      return [
        ...(ends && m > 1 ? [B("not-simplified", "procedural", RN, `The factor ${m} in ${qq} was looked at before simplifying. ${p[0]}/${qq} = ${p[0] / g}/${qq / g}, and that denominator has only 2s and 5s.`, 1)] : []),
        ...(ends && m === 1 && qq % 2 === 1 ? [B("odd-recurs", "conceptual", RN, `An odd denominator was taken to mean a recurring decimal. ${qq} is made only of 5s, so the decimal stops.`, 1)] : []),
        ...(!ends ? [B("forever-irrational", "conceptual", RN, "A decimal that goes on for ever was taken to never repeat. Every fraction of whole numbers either stops or repeats; only irrational numbers never repeat.", 2)] : []),
      ];
    },
    variants: () => [],
    explain: say({ simplify: "Simplify first", factors: "Look at the denominator's prime factors" }),
    domain: TERM_DOM,
    cap: 300,
    difficulty: ([p, , , mi]) => (mi === 0 ? 1 : p % TERM_M[mi] === 0 ? 3 : 2),
    teach: {
      idea: "A fraction in its simplest form terminates exactly when its denominator has no prime factors other than 2 and 5, because only then can it be written over a power of 10.",
      method: "Simplify the fraction first. Factorise the denominator: only 2s and 5s means it terminates; any other prime means it recurs.",
      alternatives: [{ id: "power_of_ten", title: "Make the denominator a power of 10", kind: "conceptual", text: ["7/40 = 7/(2³ × 5) = (7 × 25)/(2³ × 5³) = 175/1000 = 0.175.", "With a factor like 3 or 7 in the denominator, no multiplying can make a power of 10."] }],
    },
    limits: "Rational numbers only, so the third option is never right; deciding for irrational numbers is the amirr family.",
  },
  {
    id: "amplaces",
    arity: 3,
    title: "How many decimal places before a fraction terminates",
    competency: RN,
    type: "integer",
    mc: true,
    // [p, m, n]: p / (2^m × 5^n)
    parse: none,
    reject: rj(PL_DOM, plOk, "Fractions p/(2^m × 5^n) up to a denominator of 20 000."),
    prompt: (p) => `${p[0]}/${plQ(p)} has a terminating decimal expansion. After how many decimal places does it terminate?`,
    solve: (p) => {
      const qq = plQ(p);
      const g = gcd(p[0], qq);
      let d = qq / g;
      let m = 0;
      let n = 0;
      while (d % 2 === 0) (d /= 2), m++;
      while (d % 5 === 0) (d /= 5), n++;
      return { steps: [step("simplify", "divide", RN, [`${p[0]}/${qq}`, g], `${p[0] / g}/${qq / g}`), step("factors", "note", RN, [`${qq / g} = 2${sup(m)} × 5${sup(n)}`], ""), step("places", "note", RN, ["the larger power"], Math.max(m, n))], answer: Math.max(m, n) };
    },
    // independent: long division, counting digits until the remainder is 0
    validate: (p, v) => v === digitsUntilExact(p[0], plQ(p)),
    bugs: (p) => {
      const qq = plQ(p);
      const g = gcd(p[0], qq);
      let d = qq / g;
      let m = 0;
      let n = 0;
      while (d % 2 === 0) (d /= 2), m++;
      while (d % 5 === 0) (d /= 5), n++;
      return [
        B("add-powers", "conceptual", RN, "The two powers were added. To make 10s, each 2 pairs with a 5, so the number of places is the larger power.", m + n),
        B("smaller-power", "procedural", RN, "The smaller power was used. The number of places is the larger of the two powers.", Math.min(m, n) || null),
        ...(g > 1 ? [B("not-simplified", "procedural", RN, `The fraction was not simplified first: ${p[0]}/${qq} = ${p[0] / g}/${qq / g}.`, Math.max(p[1], p[2]))] : []),
      ];
    },
    variants: () => [],
    explain: say({ simplify: "Simplify", factors: "Denominator", places: "Places" }),
    domain: PL_DOM,
    cap: 300,
    difficulty: ([p, m, n]) => (gcd(p, plQ([p, m, n])) > 1 ? 3 : m === 0 || n === 0 ? 1 : 2),
    word: (p) => `₹${p[0]} is shared equally among ${plQ(p)} people, and each share is written as an exact decimal number of rupees. How many digits come after the decimal point?`,
    teach: {
      idea: "p/(2^m 5^n) can be rewritten over 10^k, where k is the larger of m and n, so it has exactly k decimal places (after simplifying).",
      method: "Simplify the fraction, write the denominator as 2^m × 5^n, and take the larger power.",
      alternatives: [{ id: "make_ten", title: "Make a power of 10", kind: "procedural", text: ["3/40 = 3/(2³ × 5): multiply top and bottom by 5² to get 75/1000.", "1000 = 10³, so there are 3 decimal places: 0.075."] }],
    },
    limits: "Denominators made only of 2s and 5s, up to 20 000.",
  },
  {
    id: "amirr",
    arity: 4,
    title: "Picking out the irrational number",
    competency: RN,
    type: "choice",
    // [ik, n, ts, ord]: the irrational option (√n, c + √n or √n/d), three rational traps IRR_COMBOS[ts], rotated by ord
    parse: none,
    reject: rj(IRR_DOM, irrOk, "One irrational number √n (n not a square, up to 40) and three rational ones."),
    choices: (p) => irrOptions(p).opts,
    prompt: () => "Which one of these numbers is irrational?",
    solve: (p) => {
      const { opts, kinds } = irrOptions(p);
      const i = kinds.indexOf(-1);
      return { steps: [step("check", "note", RN, [`${opts[i]} cannot be written as p/q, because ${p[1]} is not a perfect square`], "")], answer: i };
    },
    // independent: read each option's text and decide whether it is rational; exactly the chosen one must be irrational
    validate: (p, v) => {
      const { opts } = irrOptions(p);
      if (typeof v !== "number" || !opts[v]) return false;
      return opts.every((o, i) => rationalText(o) === (i !== v));
    },
    bugs: (p) => {
      const { opts, kinds } = irrOptions(p);
      const at = (k: number) => kinds.indexOf(k);
      const n = p[1];
      const s = (n % 7) + 3;
      const [u, w] = IRR_PAIRS[n % 8];
      const out: Bug[] = [];
      if (at(0) >= 0) out.push(B("root-means-irrational", "conceptual", RN, `A square-root sign was taken to mean irrational. ${opts[at(0)]} = ${s}, a whole number.`, at(0)));
      if (at(1) >= 0) out.push(B("22-7-is-pi", "conceptual", RN, "22/7 was taken to be π. It is only close to π; as a fraction of whole numbers it is rational.", at(1)));
      if (at(2) >= 0) out.push(B("product-of-roots", "procedural", SURD, `Each factor is irrational, but √${u} × √${w} = √${u * w} = ${isqrt(u * w)}, which is rational.`, at(2)));
      if (at(3) >= 0) out.push(B("forever-decimal", "conceptual", RN, "A decimal that goes on for ever was taken as irrational. A repeating decimal is rational.", at(3)));
      if (at(4) >= 0) out.push(B("square-of-root", "procedural", SURD, `(√${NONSQ[n % 7]})² = ${NONSQ[n % 7]}, a whole number.`, at(4)));
      return out;
    },
    variants: () => [],
    explain: say({ check: "Irrational" }),
    domain: IRR_DOM,
    cap: 300,
    difficulty: ([ik, , ts]) => (ik === 0 && ts >= 6 ? 3 : ik === 0 ? 1 : 2),
    teach: {
      idea: "A number is rational if it can be written as p/q with whole numbers p and q (q ≠ 0); its decimal stops or repeats. √n is irrational unless n is a perfect square.",
      method: "Simplify each number first: √49 = 7, √2 × √8 = √16 = 4, (√5)² = 5, a repeating decimal is a fraction. Whatever is still a non-square root is irrational.",
      alternatives: [{ id: "decimal_test", title: "The decimal test", kind: "conceptual", text: ["Rational numbers have decimals that stop or repeat a block for ever.", "√2 = 1.41421356… never repeats; 22/7 = 3.142857142857… repeats, so it is rational even though it is close to π."] }],
    },
    limits: "Square roots of whole numbers up to 40 and simple traps; proofs of irrationality are marked by an educator.",
  },
  // ============================================================ similarity
  {
    id: "amsim",
    arity: 4,
    title: "Unknown side of similar triangles",
    competency: SIM,
    type: "exact",
    mc: true,
    // [ti, m, ni, ask]: ΔABC with sides SIM_TRIS[ti] and ΔPQR ~ ΔABC with scale m/SIM_N[ni]; ask 0 QR, 1 RP, 2 the perimeter of PQR
    parse: none,
    reject: rj(SIM_DOM, simOk, "Similar triangles with a scale factor m/n (n = 1, 2, 4 or 5) that is not 1."),
    prompt: ([ti, m, ni, ask]) => {
      const [a, b, c] = SIM_TRIS[ti];
      const PQ = q(a * m, SIM_N[ni]);
      return `ΔABC ~ ΔPQR (A matches P, B matches Q and C matches R). AB = ${a} cm, BC = ${b} cm, CA = ${c} cm and PQ = ${dec(PQ)} cm. Find ${["QR", "RP", "the perimeter of ΔPQR"][ask]}, in cm.`;
    },
    solve: ([ti, m, ni, ask]) => {
      const [a, b, c] = SIM_TRIS[ti];
      const k = q(m, SIM_N[ni]);
      const PQ = qm(Q(a), k);
      const side = ask === 0 ? b : ask === 1 ? c : a + b + c;
      const ans = qm(Q(side), k);
      return { steps: [step("scale", "divide", SIM, [dec(PQ), a], dec(k)), step("side", "multiply", SIM, [side, dec(k)], dec(ans))], answer: dec(ans) };
    },
    // independent: cross-multiplication: the unknown side × AB must equal the matching side × PQ
    validate: ([ti, m, ni, ask], v) => {
      const [a, b, c] = SIM_TRIS[ti];
      const x = val(v);
      if (!x) return false;
      const PQ = q(a * m, SIM_N[ni]);
      const side = ask === 0 ? b : ask === 1 ? c : a + b + c;
      return qe(qm(x, Q(a)), qm(Q(side), PQ));
    },
    bugs: ([ti, m, ni, ask]) => {
      const [a, b, c] = SIM_TRIS[ti];
      const n = SIM_N[ni];
      const k = q(m, n);
      const PQ = qm(Q(a), k);
      const side = ask === 0 ? b : ask === 1 ? c : a + b + c;
      const diff = qs(PQ, Q(a));
      return [
        B("add-difference", "conceptual", SIM, `The same amount (${dec(diff[0] < 0 ? qm(diff, Q(-1)) : diff)} cm) was ${diff[0] < 0 ? "taken from" : "added to"} every side. Similar triangles are scaled by multiplying: every side is × ${dec(k)}.`, ask === 2 ? dec(qa(Q(side), qm(diff, Q(3)))) : dec(qa(Q(side), diff))),
        B("inverted-scale", "procedural", RAT, `The scale factor was turned upside down (${a} ÷ ${dec(PQ)}). ΔPQR's sides are ΔABC's sides × PQ/AB.`, dec(qm(Q(side), q(n, m)))),
        ...(ask < 2 ? [B("wrong-match", "procedural", SIM, `The wrong side was matched. ${ask === 0 ? "QR matches BC" : "RP matches CA"}, from the order of the letters in ΔABC ~ ΔPQR.`, dec(qm(Q(ask === 0 ? c : b), k)))] : [B("not-scaled", "procedural", SIM, "The perimeter of ΔABC was given. ΔPQR's perimeter is scaled by the same factor as its sides.", String(a + b + c))]),
      ];
    },
    distractors: ([ti, m, ni, ask]) => {
      const [a, b, c] = SIM_TRIS[ti];
      const side = ask === 0 ? b : ask === 1 ? c : a + b + c;
      return [dec(qm(Q(side), q(m * m, SIM_N[ni] * SIM_N[ni]))), dec(qm(Q(side + 1), q(m, SIM_N[ni])))];
    },
    variants: () => [],
    explain: say({ scale: "Scale factor PQ ÷ AB", side: "Multiply the matching side" }),
    domain: SIM_DOM,
    cap: 300,
    difficulty: ([, , ni, ask]) => (ni === 0 && ask < 2 ? 1 : ask < 2 ? 2 : 3),
    word: ([ti, m, ni, ask]) => {
      const [a, b, c] = SIM_TRIS[ti];
      const PQ = dec(q(a * m, SIM_N[ni]));
      return ask < 2 ? `At the same time of day, a pole ${ask === 0 ? b : c} m tall casts a shadow ${a} m long, and a tower casts a shadow ${PQ} m long. How tall is the tower, in m?` : `${name(ti + m)} draws a triangular garden with sides ${a} m, ${b} m and ${c} m, then plans a ${m > SIM_N[ni] ? "larger" : "smaller"} garden of exactly the same shape whose side matching the ${a} m side is ${PQ} m. What is the perimeter of the ${m > SIM_N[ni] ? "larger" : "smaller"} garden, in m?`;
    },
    teach: {
      idea: "Similar triangles have the same shape: matching angles are equal and every side is multiplied by the same scale factor.",
      method: "Match the sides from the order of the letters (AB ↔ PQ, BC ↔ QR, CA ↔ RP). Scale factor = PQ ÷ AB; multiply the matching side by it.",
      alternatives: [{ id: "proportion", title: "Write a proportion", kind: "procedural", text: ["Write PQ/AB = QR/BC, put in the numbers you know and cross-multiply.", "Check: the larger triangle should have the larger sides."] }],
    },
    limits: "Scale factors m/n with n = 1, 2, 4 or 5, so answers are short decimals; proofs of similarity are marked by an educator.",
  },
  {
    id: "ambpt",
    arity: 4,
    title: "The basic proportionality theorem",
    competency: SIM,
    type: "exact",
    mc: true,
    // [mode, p, q, r]: DE ∥ BC with D on AB, E on AC; AD = p, DB = q; mode 0 AE = r → EC, 1 BC = r → DE, 2 AC = r → AE
    parse: none,
    reject: rj(BPT_DOM, bptOk, "AD and DB from 1 to 12 cm (not equal) and answers with at most two decimal places."),
    prompt: ([mode, p, qq, r]) => `In ΔABC, D is on AB and E is on AC with DE ∥ BC. AD = ${p} cm, DB = ${qq} cm and ${["AE", "BC", "AC"][mode]} = ${r} cm. Find ${["EC", "DE", "AE"][mode]}, in cm.`,
    solve: (p) => {
      const [mode, a, b, r] = p;
      const ans = bptAns(p);
      if (mode === 0) return { steps: [step("ratio", "note", SIM, [`AD/DB = AE/EC, so ${a}/${b} = ${r}/EC`], ""), step("ec", "divide", SIM, [`${r} × ${b}`, a], dec(ans))], answer: dec(ans) };
      return { steps: [step("ratio", "note", SIM, [mode === 1 ? `ΔADE ~ ΔABC, so DE/BC = AD/AB = ${a}/${a + b}` : `AE/AC = AD/AB = ${a}/${a + b}`], ""), step("x", "divide", SIM, [`${r} × ${a}`, a + b], dec(ans))], answer: dec(ans) };
    },
    // independent: draw the triangle on coordinates and find the unknown point by halving an interval until DE is parallel to BC
    validate: ([mode, p, qq, r], v) => {
      const x = num(v);
      if (x === null) return false;
      const A: P2 = [0.4, 2.3];
      const u = unit([-0.35, -1]);
      const w = unit([0.8, -1]);
      const Bp = add2(A, mul2(u, p + qq));
      const Dp = add2(A, mul2(u, p));
      if (mode === 0) {
        const E = add2(A, mul2(w, r));
        const L = bisect((Lc) => cross(sub(E, Dp), sub(add2(A, mul2(w, Lc)), Bp)), r + 1e-9, 2000);
        return near(x, L - r, 1e-7);
      }
      if (mode === 1) {
        const e: P2 = [1, 0];
        const C = add2(Bp, mul2(e, r));
        const t = bisect((tc) => cross(sub(add2(Dp, mul2(e, tc)), A), sub(C, A)), 0, r);
        return near(x, t, 1e-7);
      }
      const C = add2(A, mul2(w, r));
      const s = bisect((sc) => cross(sub(add2(A, mul2(w, sc)), Dp), sub(C, Bp)), 0, r);
      return near(x, s, 1e-7);
    },
    bugs: ([mode, p, qq, r]) => {
      if (mode === 0) return [B("inverted", "procedural", SIM, "The ratio was turned round: EC was matched with AD. AD/DB = AE/EC, so EC goes with DB.", dec(q(r * p, qq))), B("whole-side", "conceptual", SIM, "AD was compared with the whole side AB instead of with DB. In AD/DB = AE/EC both ratios compare the two parts of a side.", dec(q(r * (p + qq), p))), ...(r + qq - p > 0 ? [B("add-difference", "conceptual", SIM, "The same difference was added on both sides. The theorem is about equal ratios, not equal differences.", String(r + qq - p))] : [])];
      if (mode === 1) return [B("parts-ratio", "conceptual", SIM, "DE/BC was taken as AD/DB. DE and BC belong to the triangles ADE and ABC, so the ratio is AD/AB, the part over the whole side.", dec(q(r * p, qq))), B("half", "conceptual", MID, "DE was taken as half of BC, as if D were the midpoint. That is only true when AD = DB.", dec(q(r, 2)))];
      return [B("parts-ratio", "conceptual", SIM, "AE/AC was taken as AD/DB. Compare the part with the whole side: AE/AC = AD/AB.", dec(q(r * p, qq))), B("gave-ec", "procedural", SIM, "EC was found instead of AE.", dec(q(r * qq, p + qq)))];
    },
    distractors: ([mode, p, qq, r]) => [dec(qa(bptAns([mode, p, qq, r]), Q(1))), dec(q(r * qq, p + qq + 1))],
    variants: () => [],
    explain: say({ ratio: "Equal ratios", ec: "EC", x: "Unknown length" }),
    domain: BPT_DOM,
    cap: 300,
    difficulty: ([mode]) => (mode === 0 ? 1 : mode === 2 ? 2 : 3),
    word: ([mode, p, qq, r]) => (mode === 0 ? `Two straight roads start at a village A. A canal crosses them parallel to a railway line BC. Along one road it is ${p} km from A to the canal and ${qq} km from the canal to the railway. Along the other road it is ${r} km from A to the canal. How far is it along that road from the canal to the railway, in km?` : mode === 1 ? `A ladder-shaped frame is a triangle ABC with a crossbar DE parallel to the base BC. AD = ${p} cm, DB = ${qq} cm and the base BC is ${r} cm. How long is the crossbar DE, in cm?` : `A triangular sail ABC has a seam DE parallel to its foot BC. AD = ${p} m, DB = ${qq} m and the edge AC = ${r} m. How far is it from A to E along AC, in m?`),
    teach: {
      idea: "A line parallel to one side of a triangle cuts off a smaller triangle of the same shape, so it divides the other two sides in the same ratio.",
      method: "Use AD/DB = AE/EC for the parts of the sides, or AD/AB = AE/AC = DE/BC when a whole side is involved. Cross-multiply to find the unknown.",
      alternatives: [{ id: "small_triangle", title: "See the small triangle", kind: "conceptual", text: ["Shade ΔADE: it is ΔABC shrunk by the factor AD/AB.", "Every length in ΔADE is that fraction of the matching length in ΔABC."] }],
    },
    limits: "Whole-number lengths with short decimal answers; the converse (showing lines are parallel) and proofs are left to an educator.",
  },
  {
    id: "amsarea",
    arity: 4,
    title: "Areas of similar triangles",
    competency: SIM,
    type: "exact",
    mc: true,
    // [mode, m, n, x]: sides in the ratio m : n; mode 0 the first area is x·m² → find the second; 1 areas x·m² and x·n², first side m·t → find the matching side (t = x mod 4 + 1)
    parse: none,
    reject: rj(SA_DOM, saOk, "Side ratios m : n in simplest form with m < n up to 9."),
    prompt: ([mode, m, n, x]) => (mode === 0 ? `Two triangles are similar, and their corresponding sides are in the ratio ${m} : ${n}. The area of the smaller triangle is ${x * m * m} cm². Find the area of the larger triangle, in cm².` : `The areas of two similar triangles are ${x * m * m} cm² and ${x * n * n} cm². A side of the smaller triangle is ${m * ((x % 4) + 1)} cm. Find the corresponding side of the larger triangle, in cm.`),
    solve: ([mode, m, n, x]) => {
      const t = (x % 4) + 1;
      if (mode === 0) return { steps: [step("ratio", "note", SIM, [`areas are in the ratio ${m}² : ${n}² = ${m * m} : ${n * n}`], ""), step("area", "multiply", SIM, [x * m * m, `${n * n}/${m * m}`], x * n * n)], answer: String(x * n * n) };
      return { steps: [step("ratio", "note", SIM, [`area ratio ${x * m * m} : ${x * n * n} = ${m * m} : ${n * n}, so sides are ${m} : ${n}`], ""), step("side", "multiply", SIM, [m * t, `${n}/${m}`], n * t)], answer: String(n * t) };
    },
    // independent: build a reference triangle (5, 6, 7) at both sizes and compare their areas worked out from the sides
    validate: ([mode, m, n, x], v) => {
      const y = num(v);
      if (y === null || y <= 0) return false;
      const t = (x % 4) + 1;
      if (mode === 0) return near(y, (x * m * m * heronN(5 * n, 6 * n, 7 * n)) / heronN(5 * m, 6 * m, 7 * m), 1e-9);
      const k = y / (m * t);
      return near(heronN(5 * k, 6 * k, 7 * k) / heronN(5, 6, 7), (x * n * n) / (x * m * m), 1e-9);
    },
    bugs: ([mode, m, n, x]) => {
      const t = (x % 4) + 1;
      if (mode === 0) return [B("linear", "conceptual", SIM, `The area was scaled by ${n}/${m}, like a side. Areas of similar triangles are in the ratio of the squares of the sides.`, D(x * m * m * n, m)), B("inverted", "procedural", SIM, "The ratio was turned upside down, which makes the larger triangle smaller.", D(x * m * m * m * m, n * n))];
      return [B("area-ratio-for-sides", "conceptual", SIM, `The side was scaled by the area ratio ${n * n}/${m * m}. Sides scale by the square root of the area ratio, ${n}/${m}.`, D(m * t * n * n, m * m)), B("root-of-area", "procedural", SIM, "The square root of the larger area was given. Use the ratio of the areas, not one area alone.", surd(x * n * n))];
    },
    distractors: ([mode, m, n, x]) => (mode === 0 ? [String(x * n * n * 2), String(x * (n * n - m * m))] : [String(n * ((x % 4) + 1) + 1), String(2 * n * ((x % 4) + 1))]),
    variants: () => [],
    explain: say({ ratio: "Ratio", area: "Area of the larger triangle", side: "Side of the larger triangle" }),
    domain: SA_DOM,
    cap: 300,
    difficulty: ([mode, m]) => (mode === 0 && m === 1 ? 1 : mode === 0 ? 2 : 3),
    word: ([mode, m, n, x]) => (mode === 0 ? `${name(m + n + x)} enlarges a triangular logo so that every side becomes ${n}/${m} times as long. The small logo uses ${x * m * m} cm² of card. How much card does the large logo use, in cm²?` : `Two triangular flags have exactly the same shape. One has an area of ${x * m * m} cm² and the other ${x * n * n} cm². The shorter flag's bottom edge is ${m * ((x % 4) + 1)} cm. How long is the matching edge of the other flag, in cm?`),
    teach: {
      idea: "If every side is multiplied by k, every height is multiplied by k too, so the area (½ × base × height) is multiplied by k².",
      method: "Area ratio = (side ratio)². To go from areas to sides, take the square root of the area ratio.",
      alternatives: [{ id: "grid", title: "Count small triangles", kind: "conceptual", text: ["Double every side of a triangle and draw it: it is made of 4 copies of the original.", "Triple every side: 9 copies. The area grows with the square of the scale factor."] }],
    },
    limits: "Side ratios in simplest form up to 9 with whole-number answers; ratios of altitudes and medians are left out.",
  },
  // ============================================================ tangents
  {
    id: "amtlen",
    arity: 3,
    title: "Length of a tangent from an external point",
    competency: TAN,
    type: "exact",
    mc: true,
    // [x, y, ask]: ask 0 radius x, OP = y → PT; 1 radius x, PT = y → OP; 2 PT = x, OP = y → radius
    parse: none,
    reject: rj(TL_DOM, tlOk, "Whole-number lengths up to 30 cm with the point outside the circle."),
    prompt: ([x, y, ask]) =>
      ask === 0 ? `A point P is ${y} cm from the centre O of a circle of radius ${x} cm. The tangent from P touches the circle at T. Find the length PT, in cm. Give the exact value (a surd such as 2√6 is fine).`
      : ask === 1 ? `The tangent from a point P to a circle with centre O and radius ${x} cm touches the circle at T, and PT = ${y} cm. How far is P from O, in cm? Give the exact value (a surd such as 2√6 is fine).`
      : `The tangent from a point P touches a circle with centre O at T. PT = ${x} cm and OP = ${y} cm. Find the radius of the circle, in cm. Give the exact value (a surd such as 2√6 is fine).`,
    solve: ([x, y, ask]) => {
      const right = step("right", "note", TAN, ["OT ⟂ PT (a tangent is perpendicular to the radius at the point of contact)"], "");
      if (ask === 1) return { steps: [right, step("squares", "squares", PYTH, [x, y], x * x + y * y), step("root", "root", SURD, [x * x + y * y], surd(x * x + y * y))], answer: surd(x * x + y * y) };
      return { steps: [right, step("diff", "subtract", PYTH, [`${y}²`, `${x}²`], y * y - x * x), step("root", "root", SURD, [y * y - x * x], surd(y * y - x * x))], answer: surd(y * y - x * x) };
    },
    // independent: construct the tangent point T on coordinates (the angle at O has cos = radius ÷ OP) and measure PT
    validate: ([x, y, ask], v) => {
      const z = num(v);
      if (z === null || z <= 0) return false;
      const tangent = (r: number, d: number) => {
        if (d <= r) return NaN;
        const c = r / d;
        const T: P2 = [r * c, r * Math.sqrt(1 - c * c)];
        return dist(T, [d, 0]);
      };
      if (ask === 0) return near(z, tangent(x, y), 1e-9);
      if (ask === 1) return near(tangent(x, z), y, 1e-9);
      return near(tangent(z, y), x, 1e-9);
    },
    bugs: ([x, y, ask]) => {
      if (ask === 0) return [B("added-squares", "conceptual", PYTH, "The squares were added. OP is the hypotenuse of the right triangle OTP (the right angle is at T), so PT² = OP² − OT².", surd(x * x + y * y)), B("subtract-lengths", "procedural", PYTH, "The lengths were subtracted directly. Use the squares: PT = √(OP² − OT²).", String(y - x)), B("no-root", "procedural", PYTH, "OP² − OT² was found, but its square root was not taken.", String(y * y - x * x))];
      if (ask === 1) return [...(y !== x ? [B("subtracted-squares", "conceptual", PYTH, "The squares were subtracted. OP is the hypotenuse (opposite the right angle at T), so OP² = OT² + PT².", surd(Math.abs(y * y - x * x)))] : []), B("added-lengths", "procedural", PYTH, "The lengths were added. Use the squares: OP = √(OT² + PT²).", String(x + y)), B("no-root", "procedural", PYTH, "OT² + PT² was found, but its square root was not taken.", String(x * x + y * y))];
      return [B("added-squares", "conceptual", PYTH, "The squares were added. OP is the hypotenuse, so OT² = OP² − PT².", surd(x * x + y * y)), B("subtract-lengths", "procedural", PYTH, "The lengths were subtracted directly. Use the squares.", String(y - x))];
    },
    distractors: ([x, y, ask]) => (ask === 1 ? [surd(x * x + y * y + 1), surd(2 * (x * x + y * y))] : [surd(y * y - x * x + 1), surd(2 * (y * y - x * x))]),
    variants: () => [],
    explain: say({ right: "Right angle at T", squares: "OT² + PT²", diff: "OP² − OT²", root: "Length" }),
    domain: TL_DOM,
    cap: 300,
    difficulty: ([x, y, ask]) => (isqrt(ask === 1 ? x * x + y * y : y * y - x * x) !== null ? 1 : ask === 0 ? 2 : 3),
    figure: ([x, y, ask]) => ({ type: "triangle", sides: ask === 0 ? ["PT = ?", `OP = ${y} cm`, `OT = ${x} cm`] : ask === 1 ? [`PT = ${y} cm`, "OP = ?", `OT = ${x} cm`] : [`PT = ${x} cm`, `OP = ${y} cm`, "OT = ?"], angles: ["T", "P", "O"], right: true }),
    word: ([x, y, ask]) =>
      ask === 0 ? `A goat is tied at a post P, ${y} m from the centre of a round pond of radius ${x} m. A straight fence from P just touches the edge of the pond. How long is the fence from P to the touching point, in m? (A surd such as 2√6 is fine.)`
      : ask === 1 ? `A straight path from a gate P just touches a round flower bed of radius ${x} m; the path is ${y} m long from P to the touching point. How far is the gate from the centre of the bed, in m? (A surd such as 2√6 is fine.)`
      : `A straight rope from a pole P just touches a round well; it is ${x} m from P to the touching point, and P is ${y} m from the centre of the well. What is the radius of the well, in m? (A surd such as 2√6 is fine.)`,
    teach: {
      idea: "A tangent meets the radius at the point of contact at a right angle, so the centre O, the point P and the point of contact T make a right triangle with OP as the hypotenuse.",
      method: "Use Pythagoras in ΔOTP: OP² = OT² + PT². Then PT = √(OP² − r²), and simplify the surd.",
      alternatives: [{ id: "draw_radius", title: "Always draw the radius", kind: "procedural", text: ["Join the centre to the point of contact and mark the right angle.", "Now it is a Pythagoras question with OP as the longest side."] }],
    },
    limits: "Whole-number lengths up to 30 cm; tangents to two circles (common tangents) are left out.",
  },
  {
    id: "amtang",
    arity: 2,
    title: "Angles made by tangents",
    competency: TAN,
    type: "integer",
    mc: true,
    // [u, mode]: angle x = 2u degrees; mode 0 ∠APB → ∠AOB; 1 ∠APB → ∠PAB; 2 ∠APB → ∠OAB; 3 tangent–chord angle → angle in the alternate segment
    parse: none,
    reject: rj(TG_DOM, tgOk, "Angles from 20° to 160° in steps of 2° (acute for the alternate segment)."),
    prompt: ([u, mode]) => {
      const x = 2 * u;
      if (mode === 3) return `PT is the tangent to a circle at A, and AB is a chord with ∠BAT = ${x}°. C is a point on the circle on the other side of AB from T. Find ∠ACB, in degrees.`;
      return `PA and PB are tangents from a point P to a circle with centre O, touching it at A and B. ∠APB = ${x}°. Find ${["∠AOB", "∠PAB", "∠OAB"][mode]}, in degrees.`;
    },
    solve: ([u, mode]) => {
      const x = 2 * u;
      if (mode === 0) return { steps: [step("right", "note", TAN, ["∠OAP = ∠OBP = 90°"], ""), step("quad", "subtract", TAN, [360, 90, 90, x], 180 - x)], answer: 180 - x };
      if (mode === 1) return { steps: [step("equal", "note", TAN, ["PA = PB, so ΔPAB is isosceles"], ""), step("base", "divide", TPROP, [`180 − ${x}`, 2], 90 - u)], answer: 90 - u };
      if (mode === 2) return { steps: [step("pab", "divide", TPROP, [`180 − ${x}`, 2], 90 - u), step("oab", "subtract", TAN, [90, 90 - u], u)], answer: u };
      return { steps: [step("alt", "note", TAN, ["the angle between a tangent and a chord equals the angle in the alternate segment"], x)], answer: x };
    },
    // independent: build the figure on coordinates with a unit circle and measure the angle
    validate: ([u, mode], v) => {
      const x = 2 * u;
      const rad = (x * Math.PI) / 180;
      if (mode < 3) {
        const d = 1 / Math.sin(rad / 2);
        const phi = Math.acos(1 / d);
        const O: P2 = [0, 0];
        const P: P2 = [d, 0];
        const A: P2 = [Math.cos(phi), Math.sin(phi)];
        const Bp: P2 = [Math.cos(phi), -Math.sin(phi)];
        const got = mode === 0 ? angleAt(O, A, Bp) : mode === 1 ? angleAt(A, P, Bp) : angleAt(A, O, Bp);
        return typeof v === "number" && Math.abs(v - got) < 1e-6;
      }
      const A: P2 = [0, -1];
      const dir: P2 = [Math.cos(rad), Math.sin(rad)];
      // B: where the ray from A at angle x meets the unit circle again (solve |A + s·dir| = 1 by halving)
      const s = bisect((sc) => len(add2(A, mul2(dir, sc))) - 1, 1e-6, 2.000001);
      const Bp = add2(A, mul2(dir, s));
      const T: P2 = [1, -1];
      const side = (p: P2) => Math.sign(cross(sub(Bp, A), sub(p, A)));
      let C: P2 | null = null;
      for (let k = 0; k < 36 && !C; k++) {
        const c: P2 = [Math.cos((k * Math.PI) / 18 + 0.01), Math.sin((k * Math.PI) / 18 + 0.01)];
        if (side(c) !== 0 && side(c) !== side(T)) C = c;
      }
      return !!C && typeof v === "number" && Math.abs(v - angleAt(C, A, Bp)) < 1e-6;
    },
    bugs: ([u, mode]) => {
      const x = 2 * u;
      if (mode === 0) return [B("double", "conceptual", "MATH.geometry.circle-theorems", "∠AOB was taken as twice ∠APB, as for an angle at the centre and an angle on the circle. P is outside the circle; use the quadrilateral OAPB with two right angles.", 2 * x < 360 ? 2 * x : null), B("complement", "procedural", TAN, "Only one right angle was used (90° − x). OAPB has two right angles, at A and at B, and its angles add to 360°.", 90 - x > 0 ? 90 - x : null), B("equal", "conceptual", TAN, "∠AOB was taken to equal ∠APB. They add up to 180°.", x)];
      if (mode === 1) return [B("half", "procedural", TPROP, "∠APB was halved. ∠PAB is a base angle of the isosceles triangle PAB: (180° − x)/2.", u), B("supplement", "procedural", TPROP, "180° − x was given; that is the sum of the two base angles, so halve it.", 180 - x), B("complement", "conceptual", TAN, "90° − x was used.", 90 - x > 0 ? 90 - x : null)];
      if (mode === 2) return [B("gave-pab", "procedural", TAN, "∠PAB was given. ∠OAB is what is left of the right angle OAP: 90° − ∠PAB.", 90 - u), B("right-angle", "conceptual", TAN, "∠OAP = 90° was given; ∠OAB is only part of it.", 90), B("equal", "conceptual", TAN, "∠OAB was taken to equal ∠APB; it is half of it.", x)];
      return [B("complement", "conceptual", TAN, "90° − x was used, as if the radius were involved. The tangent–chord angle equals the angle in the alternate segment.", 90 - x), B("supplement", "conceptual", TAN, "180° − x was used. That is the angle in the segment on the same side, not the alternate one.", 180 - x), B("double", "conceptual", "MATH.geometry.circle-theorems", "The angle was doubled. 2x is the angle at the centre on the chord AB, not the angle at C.", 2 * x)];
    },
    variants: () => [],
    explain: say({ right: "Tangent ⟂ radius", quad: "Angles of OAPB add to 360°", equal: "Equal tangents", base: "Base angle", pab: "∠PAB", oab: "∠OAB = 90° − ∠PAB", alt: "Alternate segment theorem" }),
    domain: TG_DOM,
    difficulty: ([, mode]) => (mode === 0 ? 1 : mode === 1 ? 2 : 3),
    word: ([u, mode]) => {
      const x = 2 * u;
      if (mode === 3) return `A straight road PT just touches a circular park at A. A straight path AB across the park makes an angle of ${x}° with the road, and a lamp C stands on the park's edge on the far side of the path. What angle ACB is made at the lamp, in degrees?`;
      return `Two straight fences from a corner post P just touch a round water tank (centre O) at A and B, and meet at P at an angle of ${x}°. What is ${["∠AOB, the angle at the centre between the two radii OA and OB", "∠PAB, between fence PA and the line AB", "∠OAB, between the radius OA and the line AB"][mode]}, in degrees?`;
    },
    teach: {
      idea: "Tangents from an outside point are equal, and each is perpendicular to the radius at its point of contact; so OAPB has two right angles and ΔPAB is isosceles.",
      method: "∠AOB = 180° − ∠APB. ∠PAB = ∠PBA = (180° − ∠APB)/2. ∠OAB = 90° − ∠PAB. The tangent–chord angle equals the angle in the alternate segment.",
      alternatives: [{ id: "kite", title: "OAPB is a kite", kind: "conceptual", text: ["OA = OB (radii) and PA = PB (tangents), so OAPB is a kite with right angles at A and B.", "Its angles add to 360°, so the angles at O and P add to 180°."] }],
    },
    limits: "Even angles so answers are whole numbers; proofs of the tangent properties are marked by an educator.",
  },
  {
    id: "amtquad",
    arity: 4,
    title: "Tangent lengths in shapes drawn round a circle",
    competency: TAN,
    type: "exact",
    mc: true,
    // [m, p, q, r]: m 0 quadrilateral ABCD round a circle, AB = p, BC = q, CD = r → DA; 1 triangle with incircle, AB = p, BC = q, CA = r → AF (F on AB)
    parse: none,
    reject: rj(TQ_DOM, tqOk, "Whole-number sides 3–20 cm that a circle can be drawn inside."),
    prompt: ([m, p, qq, r]) => (m === 0 ? `A circle touches all four sides of quadrilateral ABCD. AB = ${p} cm, BC = ${qq} cm and CD = ${r} cm. Find DA, in cm.` : `The incircle of ΔABC touches AB at F, BC at D and CA at E. AB = ${p} cm, BC = ${qq} cm and CA = ${r} cm. Find AF, in cm.`),
    solve: ([m, p, qq, r]) => {
      if (m === 0) return { steps: [step("pitot", "note", TAN, ["equal tangents from each corner give AB + CD = BC + DA"], ""), step("da", "subtract", TAN, [p + r, qq], p + r - qq)], answer: String(p + r - qq) };
      const s = q(p + qq + r, 2);
      return { steps: [step("s", "half", TAN, [p + qq + r], dec(s)), step("af", "subtract", TAN, [dec(s), qq], dec(qs(s, Q(qq))))], answer: dec(qs(s, Q(qq))) };
    },
    // independent: search for the four (or three) tangent lengths, in steps of 0.5 cm, that fit the given sides
    validate: ([m, p, qq, r], v) => {
      const x = num(v);
      if (x === null) return false;
      if (m === 0) {
        for (let t = 0.5; t < Math.min(p, qq); t += 0.5) {
          const w = p - t;
          const y = qq - t;
          const z = r - y;
          if (w > 0 && y > 0 && z > 0) return near(x, z + w);
        }
        return false;
      }
      for (let t = 0.5; t < p; t += 0.5) if (near(p - t + (r - t), qq)) return near(x, t);
      return false;
    },
    bugs: ([m, p, qq, r]) => {
      if (m === 0) return [B("opposite-equal", "conceptual", TAN, "DA was taken to equal BC, as in a parallelogram. For a quadrilateral round a circle it is the SUMS of opposite sides that are equal: AB + CD = BC + DA.", String(qq)), ...(p + qq - r > 0 ? [B("adjacent-sum", "procedural", TAN, "Adjacent sides were paired. The rule pairs opposite sides: AB with CD, and BC with DA.", String(p + qq - r))] : [])];
      const s = q(p + qq + r, 2);
      return [B("half-side", "conceptual", TAN, "AF was taken as half of AB, as if F were the midpoint. The touching point divides AB into the tangent lengths from A and from B, which are usually different.", D(p, 2)), B("wrong-corner", "procedural", TAN, "s − CA was found; that is the tangent length from B. From A it is s − BC.", dec(qs(s, Q(r)))), B("semi-perimeter", "procedural", TAN, "The semi-perimeter s was given; subtract the side opposite A.", dec(s))];
    },
    distractors: ([m, p, qq, r]) => (m === 0 ? [String(p + r - qq + 1), String(p + r)] : [D(p + qq + r, 3), D(r, 2)]),
    variants: () => [],
    explain: say({ pitot: "Opposite sides", da: "DA = AB + CD − BC", s: "Semi-perimeter s", af: "AF = s − BC" }),
    domain: TQ_DOM,
    cap: 300,
    difficulty: ([m, p, qq, r]) => (m === 0 ? 1 : (p + qq + r) % 2 === 0 ? 2 : 3),
    word: ([m, p, qq, r]) => (m === 0 ? `A round mirror fits inside a four-sided wooden frame ABCD, touching all four sides. AB = ${p} cm, BC = ${qq} cm and CD = ${r} cm. How long is the fourth side DA, in cm?` : `A round coaster fits inside a triangular tray ABC, touching all three sides; it touches AB at F. AB = ${p} cm, BC = ${qq} cm and CA = ${r} cm. How far is F from corner A, in cm?`),
    teach: {
      idea: "The two tangents from any corner to the circle are equal, so every side is made of two tangent lengths, one from each end.",
      method: "Quadrilateral: AB + CD = BC + DA. Triangle: the tangent length from A is s − BC, where s is half the perimeter.",
      alternatives: [{ id: "label_tangents", title: "Label the tangent lengths", kind: "procedural", text: ["Call the tangent lengths from the corners w, x, y, z; then AB = w + x, BC = x + y, CD = y + z, DA = z + w.", "Add opposite sides: both sums are w + x + y + z."] }],
    },
    limits: "Whole-number sides up to 20 cm; the proofs themselves are marked by an educator.",
  },
  // ============================================================ Ceva and Menelaus
  {
    id: "amceva",
    arity: 5,
    title: "Ceva's and Menelaus' theorems: the missing ratio",
    competency: CEVA,
    type: "ratio",
    mc: true,
    // [m, a, b, c, d]: BD : DC = a : b, CE : EA = c : d; m 0 cevians AD, BE, CF meet at a point; 1 a straight line cuts AB at F, CA at E and BC extended at D
    parse: none,
    reject: rj(CEVA_DOM, cevaOk, "Ratios with parts from 1 to 6, in simplest form."),
    prompt: ([m, a, b, c, d]) => `${m === 0 ? "In ΔABC, the lines AD, BE and CF meet at one point, with D on BC, E on CA and F on AB." : "A straight line cuts side AB of ΔABC at F, side CA at E, and side BC extended at D."} BD : DC = ${a} : ${b} and CE : EA = ${c} : ${d}. Find AF : FB in its simplest form.`,
    solve: ([m, a, b, c, d]) => {
      const g = gcd(b * d, a * c);
      return { steps: [step("rule", "note", CEVA, [`${m === 0 ? "Ceva" : "Menelaus"}: (BD/DC) × (CE/EA) × (AF/FB) = 1`], ""), step("solve", "divide", CEVA, [1, `(${a}/${b}) × (${c}/${d})`], `${b * d}/${a * c}`), step("simplify", "divide", RAT, [`${b * d} : ${a * c}`, g], `${(b * d) / g}:${(a * c) / g}`)], answer: `${(b * d) / g}:${(a * c) / g}` };
    },
    // independent: draw the triangle on coordinates, construct D and E, find F as an intersection, and measure AF/FB
    validate: ([m, a, b, c, d], v) => {
      const mm = String(v).replace(/\s/g, "").match(/^(\d+):(\d+)$/);
      if (!mm || gcd(Number(mm[1]), Number(mm[2])) !== 1) return false;
      const A: P2 = [0.7, 2.6];
      const Bp: P2 = [0, 0];
      const C: P2 = [3.1, 0];
      const E = add2(C, mul2(sub(A, C), c / (c + d)));
      let F: P2;
      if (m === 0) {
        const Dp = add2(Bp, mul2(sub(C, Bp), a / (a + b)));
        const X = meet(A, sub(Dp, A), Bp, sub(E, Bp));
        F = meet(C, sub(X, C), A, sub(Bp, A));
      } else {
        // D on line BC, outside the segment, with BD : DC = a : b
        const t = bisect((tt) => Math.abs(tt) / Math.abs(tt - 1) - a / b, a > b ? 1 + 1e-12 : -1e6, a > b ? 1e6 : -1e-12);
        const Dp = add2(Bp, mul2(sub(C, Bp), t));
        F = meet(Dp, sub(E, Dp), A, sub(Bp, A));
      }
      return near(dist(A, F) / dist(F, Bp), Number(mm[1]) / Number(mm[2]), 1e-6);
    },
    bugs: ([, a, b, c, d]) => {
      const red = (x: number, y: number) => `${x / gcd(x, y)}:${y / gcd(x, y)}`;
      return [
        B("not-inverted", "conceptual", CEVA, "The two ratios were multiplied and the result used as AF : FB. The product of all three ratios is 1, so AF/FB is the reciprocal of that product.", red(a * c, b * d)),
        B("added-ratios", "procedural", RAT, "The parts of the ratios were added. The theorem multiplies the ratios.", red(a + c, b + d)),
        ...(gcd(b * d, a * c) > 1 ? [B("not-simplified", "procedural", RAT, "The ratio was not given in its simplest form.", `${b * d}:${a * c}`)] : []),
      ];
    },
    distractors: ([, a, b, c, d]) => {
      const red = (x: number, y: number) => `${x / gcd(x, y)}:${y / gcd(x, y)}`;
      return [red(b * c, a * d), red(a * d, b * c), red(b * d + 1, a * c)];
    },
    variants: () => [],
    explain: say({ rule: "The theorem", solve: "AF/FB", simplify: "Simplest form" }),
    domain: CEVA_DOM,
    cap: 300,
    difficulty: ([m, a, b, c, d]) => (m === 0 && gcd(b * d, a * c) === 1 ? 1 : m === 0 ? 2 : 3),
    word: ([m, a, b, c, d]) => (m === 0 ? `Three straight paths in a triangular park ABC go from each corner to the opposite side and cross at one fountain. The path from A meets BC at D with BD : DC = ${a} : ${b}; the path from B meets CA at E with CE : EA = ${c} : ${d}. The path from C meets AB at F. Find AF : FB in its simplest form.` : `A straight canal crosses a triangular field ABC: it cuts side AB at F and side CA at E, and meets the line BC beyond the field at D. BD : DC = ${a} : ${b} and CE : EA = ${c} : ${d}. Find AF : FB in its simplest form.`),
    teach: {
      idea: "Going round the triangle, the three ratios (BD/DC)(CE/EA)(AF/FB) multiply to 1, both when three lines from the corners meet at a point (Ceva) and when one straight line cuts the three sides, one of them extended (Menelaus).",
      method: "Put the two known ratios into the product, solve for AF/FB (it is the reciprocal of their product), and simplify.",
      alternatives: [{ id: "mass_points", title: "Balance the corners (mass points)", kind: "conceptual", text: ["Hang weights at B and C so that D balances them: weight at B × BD = weight at C × DC.", "Do the same at E for C and A; the weights at A and B then give AF : FB = weight at B : weight at A."] }],
    },
    limits: "Unsigned ratios with parts up to 6; testing concurrency or collinearity and the proofs are left to an educator.",
  },
  // ============================================================ midpoint theorem
  {
    id: "ammid",
    arity: 4,
    title: "Using the midpoint theorem",
    competency: MID,
    type: "exact",
    mc: true,
    // [m, x, y, z]: m 0 BC = x → DE; 1 DE = x → BC; 2 sides x ≤ y ≤ z → perimeter of the triangle joining the midpoints
    parse: none,
    reject: rj(MID_DOM, midOk, "Lengths 3–40 cm; whole triangles with sides up to 20 cm."),
    prompt: ([m, x, y, z]) => (m === 0 ? `In ΔABC, D and E are the midpoints of AB and AC. BC = ${x} cm. Find DE, in cm.` : m === 1 ? `In ΔABC, D and E are the midpoints of AB and AC, and DE = ${x} cm. Find BC, in cm.` : `ΔABC has sides of ${x} cm, ${y} cm and ${z} cm. D, E and F are the midpoints of its three sides. Find the perimeter of ΔDEF, in cm.`),
    solve: ([m, x, y, z]) => {
      const rule = step("rule", "note", MID, ["the segment joining the midpoints of two sides is parallel to the third side and half as long"], "");
      if (m === 0) return { steps: [rule, step("de", "half", MID, [x], D(x, 2))], answer: D(x, 2) };
      if (m === 1) return { steps: [rule, step("bc", "multiply", MID, [2, x], 2 * x)], answer: String(2 * x) };
      return { steps: [rule, step("sides", "note", MID, [`ΔDEF has sides ${D(x, 2)}, ${D(y, 2)} and ${D(z, 2)} cm`], ""), step("perimeter", "add", MID, [D(x, 2), D(y, 2), D(z, 2)], D(x + y + z, 2))], answer: D(x + y + z, 2) };
    },
    // independent: draw the triangle on coordinates, find the midpoints by averaging, and measure
    validate: ([m, x, y, z], v) => {
      const n = num(v);
      if (n === null) return false;
      const midpt = (p: P2, r: P2): P2 => [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2];
      if (m < 2) {
        const bc = m === 0 ? x : n;
        const [A, Bp, C] = [[1.7, 3.9] as P2, [0, 0] as P2, [bc, 0] as P2];
        const de = dist(midpt(A, Bp), midpt(A, C));
        return near(m === 0 ? n : de, m === 0 ? de : x, 1e-9);
      }
      const [A, Bp, C] = place(y, z, x);
      const Dm = midpt(A, Bp);
      const Em = midpt(Bp, C);
      const Fm = midpt(C, A);
      return near(n, dist(Dm, Em) + dist(Em, Fm) + dist(Fm, Dm), 1e-9);
    },
    bugs: ([m, x, y, z]) => {
      if (m === 0) return [B("equal", "conceptual", MID, "DE was taken to equal BC. DE is parallel to BC but only half as long.", String(x)), B("double", "procedural", MID, "BC was doubled. DE is half of BC.", String(2 * x))];
      if (m === 1) return [B("halved", "procedural", MID, "DE was halved. BC is twice DE.", D(x, 2)), B("equal", "conceptual", MID, "BC was taken to equal DE.", String(x))];
      return [B("full-perimeter", "procedural", MID, "The perimeter of ΔABC was given. Each side of ΔDEF is half of a side of ΔABC.", String(x + y + z)), B("quarter", "procedural", MID, "The perimeter was divided by 4; it is halved.", D(x + y + z, 4))];
    },
    distractors: ([m, x, y, z]) => (m === 0 ? [D(x, 4), D(x + 2, 2)] : m === 1 ? [String(4 * x), String(2 * x + 2)] : [D(x + y + z, 3), String(2 * (x + y + z))]),
    variants: () => [],
    explain: say({ rule: "Midpoint theorem", de: "DE", bc: "BC", sides: "Sides", perimeter: "Perimeter" }),
    domain: MID_DOM,
    cap: 300,
    difficulty: ([m]) => (m === 0 ? 1 : m === 1 ? 2 : 3),
    word: ([m, x, y, z]) => (m === 0 ? `A triangular frame has a bottom bar BC ${x} cm long. A crossbar joins the midpoints of the two sloping sides. How long is the crossbar, in cm?` : m === 1 ? `In a triangular roof truss, a beam joining the midpoints of the two sloping sides is ${x} m long. How long is the bottom beam of the truss, in m?` : `${name(x + y + z)} has a triangular garden with sides of ${x} m, ${y} m and ${z} m and lays a path joining the midpoints of the three sides. How long is the path all the way round, in m?`),
    teach: {
      idea: "The segment joining the midpoints of two sides of a triangle is parallel to the third side and half as long (it cuts off a half-size copy of the triangle).",
      method: "DE = ½ BC, so BC = 2 DE. Joining all three midpoints gives a triangle with half the perimeter.",
      alternatives: [{ id: "fold", title: "Fold the triangle", kind: "conceptual", text: ["Fold the top corner of a paper triangle down to the middle of the base: the crease joins the midpoints of the two sides.", "The crease is parallel to the base and half its length."] }],
    },
    limits: "Lengths only; the converse and the proofs are marked by an educator.",
  },
  // ============================================================ tests for a parallelogram
  {
    id: "ampgx",
    arity: 4,
    title: "Finding x and y so a quadrilateral is a parallelogram",
    competency: PG,
    type: "tuple",
    mc: true,
    // [x, y, m, s]: m 0 diagonals bisect each other, 1 opposite sides equal; expressions from PG_COEF[s]
    parse: none,
    reject: rj(PG_DOM, pgOk, "Whole-number x and y from 1 to 12 with positive lengths."),
    prompt: (p) => {
      const [, , m] = p;
      const c = pgParts(p);
      const e = (a: number, b: number, v: string) => linText(a, b, v);
      return m === 0 ? `The diagonals of quadrilateral ABCD meet at O. OA = ${e(c.p1, c.q1, "x")}, OC = ${e(c.p2, c.q2, "x")}, OB = ${e(c.p3, c.q3, "y")} and OD = ${e(c.p4, c.q4, "y")} (in cm). ABCD is a parallelogram exactly when its diagonals bisect each other. Find x and y, written as (x, y).` : `In quadrilateral ABCD, AB = ${e(c.p1, c.q1, "x")}, CD = ${e(c.p2, c.q2, "x")}, AD = ${e(c.p3, c.q3, "y")} and BC = ${e(c.p4, c.q4, "y")} (in cm). ABCD is a parallelogram when both pairs of opposite sides are equal. Find x and y, written as (x, y).`;
    },
    solve: (p) => {
      const [x, y, m] = p;
      const c = pgParts(p);
      const n = m === 0 ? ["OA = OC", "OB = OD"] : ["AB = CD", "AD = BC"];
      return { steps: [step("eq1", "note", LIN, [`${n[0]}: ${linText(c.p1, c.q1, "x")} = ${linText(c.p2, c.q2, "x")}`], `x = ${x}`), step("eq2", "note", LIN, [`${n[1]}: ${linText(c.p3, c.q3, "y")} = ${linText(c.p4, c.q4, "y")}`], `y = ${y}`)], answer: `(${x}, ${y})` };
    },
    // independent: substitute back: both pairs must be equal and every length positive
    validate: (p, v) => {
      const mm = String(v).replace(/−/g, "-").replace(/\s/g, "").match(/^\((-?\d+),(-?\d+)\)$/);
      if (!mm) return false;
      const X = Number(mm[1]);
      const Y = Number(mm[2]);
      const c = pgParts(p);
      const lens = [c.p1 * X + c.q1, c.p2 * X + c.q2, c.p3 * Y + c.q3, c.p4 * Y + c.q4];
      return lens[0] === lens[1] && lens[2] === lens[3] && lens.every((l) => l > 0);
    },
    bugs: ([x, y]) => [
      ...(x !== y ? [B("swapped", "procedural", LIN, "x and y were swapped: the first pair of lengths gives x, the second pair gives y.", `(${y}, ${x})`)] : []),
      B("sign-slip", "procedural", LIN, "A number was moved to the other side of the equation without changing its sign.", `(${-x}, ${-y})`),
    ],
    distractors: ([x, y]) => [`(${x + 1}, ${y})`, `(${x}, ${y + 1})`, `(${x + 1}, ${y + 1})`],
    variants: () => [],
    explain: say({ eq1: "First pair", eq2: "Second pair" }),
    domain: PG_DOM,
    cap: 300,
    difficulty: ([, , m, s]) => (m === 1 && s % 2 === 0 ? 1 : m === 1 ? 2 : 3),
    word: (p) => {
      const c = pgParts(p);
      return p[2] === 0 ? `A carpenter makes a gate frame ABCD with two cross-braces AC and BD that meet at O. The four pieces of the braces measure OA = ${linText(c.p1, c.q1, "x")}, OC = ${linText(c.p2, c.q2, "x")}, OB = ${linText(c.p3, c.q3, "y")} and OD = ${linText(c.p4, c.q4, "y")} (in cm). For the frame to be a parallelogram each brace must be cut in half at O. Find x and y, written as (x, y).` : `${name(p[0] + p[1])} cuts four sticks for a frame ABCD: AB = ${linText(c.p1, c.q1, "x")}, CD = ${linText(c.p2, c.q2, "x")}, AD = ${linText(c.p3, c.q3, "y")} and BC = ${linText(c.p4, c.q4, "y")} (in cm). For the frame to be a parallelogram, opposite sticks must be equal. Find x and y, written as (x, y).`;
    },
    teach: {
      idea: "A quadrilateral is a parallelogram if its diagonals bisect each other, or if both pairs of opposite sides are equal (the converses of the parallelogram's properties).",
      method: "Write one equation for each pair that must be equal, solve each for its letter, and check the lengths are positive.",
      alternatives: [{ id: "check_back", title: "Check by putting the numbers back", kind: "procedural", text: ["Put your x and y back into all four expressions.", "Each pair must give the same length, and no length may be zero or negative."] }],
    },
    limits: "Two linear conditions with whole-number solutions; proving that a quadrilateral is a parallelogram is marked by an educator.",
  },
  // ============================================================ deductive reasoning: reasons for steps
  {
    id: "amreason",
    arity: 3,
    title: "Choosing the reason for a step in an angle proof",
    competency: EUC,
    type: "choice",
    // [c, a, seed]: configuration c (0 vertically opposite … 6 exterior angle), angle 5a degrees, seed orders the options
    parse: none,
    reject: rj(RS_DOM, rsOk, "Angles from 25° to 155° in steps of 5° (triangles with a third angle of at least 10°)."),
    choices: ([c, , seed]) => fourOf(7, c, REASON_MIS[c], seed).map((i) => REASONS[i]),
    prompt: ([c, a]) => `${rsText(c, a)} Which reason justifies this step?`,
    solve: ([c, , seed]) => ({ steps: [step("reason", "note", EUC, [REASONS[c]], "")], answer: fourOf(7, c, REASON_MIS[c], seed).indexOf(c) }),
    // independent: classify the situation from where the two angles lie (same or opposite side of the transversal,
    // between the parallel lines or outside) and the relation the numbers in the step satisfy
    validate: ([c, a, seed], v) => {
      if (typeof v !== "number") return false;
      const text = fourOf(7, c, REASON_MIS[c], seed).map((i) => REASONS[i])[v];
      if (!text) return false;
      const g = RS_GEO[c];
      const nums = (rsText(c, a).match(/\d+(?=°)/g) ?? []).map(Number);
      const stepVal = nums[nums.length - 1];
      const relOk = g.rel === "equal" ? stepVal === nums[0] : g.rel === "sum180" ? stepVal + nums[0] === 180 : g.rel === "tri" ? nums[0] + nums[1] + stepVal === 180 : stepVal === nums[0] + nums[1];
      if (!relOk) return false;
      if (g.config === "cross") return /^Vertically/.test(text);
      if (g.config === "line") return /linear pair/.test(text);
      if (g.config === "triangle") return /three angles/.test(text);
      if (g.config === "exterior") return /exterior angle/.test(text);
      const [s1, in1] = g.a1!;
      const [s2, in2] = g.a2!;
      if (s1 !== s2 && in1 && in2) return /^Alternate/.test(text);
      if (s1 === s2 && in1 !== in2) return /^Corresponding/.test(text);
      if (s1 === s2 && in1 && in2) return /^Co-interior/.test(text);
      return false;
    },
    bugs: ([c, , seed]) => {
      const opts = fourOf(7, c, REASON_MIS[c], seed);
      const says = [
        "The linear-pair reason was chosen, but the two angles are opposite each other at a crossing, and they are equal.",
        "Vertically opposite angles was chosen, but these two angles sit side by side on a straight line and add up to 180°.",
        "Corresponding angles was chosen, but these angles are on opposite sides of the crossing line, between the parallels (a Z shape): they are alternate angles.",
        "Alternate angles was chosen, but these angles are in matching positions at the two crossings (an F shape): they are corresponding angles.",
        "The linear-pair reason was chosen, but the two angles are at different points, between the parallel lines on the same side (a C shape): they are co-interior angles.",
        "The exterior-angle reason was chosen, but the step uses the three angles inside the triangle.",
        "The angle-sum reason was chosen, but the step finds an exterior angle directly as the sum of the two opposite interior angles.",
      ];
      return [B(`mix-${c}`, "conceptual", c >= 5 ? TPROP : PAR, says[c], opts.indexOf(REASON_MIS[c]))];
    },
    variants: () => [],
    explain: (s) => `The reason: ${s.inputs[0]}`,
    domain: RS_DOM,
    cap: 300,
    difficulty: ([c]) => (c <= 1 || c === 5 ? 1 : c === 6 ? 2 : 3),
    teach: {
      idea: "Each step of a proof must follow from something already accepted: a definition, an axiom or a theorem. The reason names it.",
      method: "Look at where the two angles are: at one crossing (vertically opposite or linear pair), at two crossings of parallel lines (Z = alternate, F = corresponding, C = co-interior), or in a triangle (angle sum, exterior angle).",
      alternatives: [{ id: "letters", title: "Z, F and C shapes", kind: "conceptual", text: ["Trace the lines around the two angles with your finger.", "A Z shape means alternate (equal), an F shape corresponding (equal), a C shape co-interior (adding to 180°)."] }],
    },
    limits: "Choosing the reason for one given step; writing whole deductive proofs is marked by an educator.",
  },
  // ============================================================ triangle proofs: congruence rules and the angle bisector theorem
  {
    id: "amcrit",
    arity: 3,
    title: "Which congruence rule applies?",
    competency: TP,
    type: "choice",
    // [c, L, seed]: case c (0 SSS, 1 SAS, 2 ASA, 3 AAS, 4 RHS, 5 two sides and a non-included angle); lengths from L; seed: vertex rotation and option order
    parse: none,
    reject: rj(CR_DOM, () => true, "Six kinds of given facts with lengths from 3 cm."),
    choices: ([c, , seed]) => fourOf(6, c, CRIT_MIS[c], Math.floor(seed / 3)).map((i) => CRIT[i]),
    prompt: ([c, L, seed]) => `In ΔABC and ΔPQR (A matches P, B matches Q and C matches R): ${critFacts(c, L, seed % 3).map(factText).join("; ")}. Which rule shows that the two triangles are congruent?`,
    solve: ([c, , seed]) => ({ steps: [step("rule", "note", CONG, [c === 5 ? "two sides and an angle that is not between them do not fix a triangle" : `${CRIT[c]} fits the given facts`], "")], answer: fourOf(6, c, CRIT_MIS[c], Math.floor(seed / 3)).indexOf(c) }),
    // independent: classify the facts themselves: count sides and angles and check whether the angle lies between the sides (or the side between the angles)
    validate: ([c, L, seed], v) => {
      if (typeof v !== "number") return false;
      const opt = fourOf(6, c, CRIT_MIS[c], Math.floor(seed / 3)).map((i) => CRIT[i])[v];
      const facts = critFacts(c, L, seed % 3);
      const sides = facts.filter((f): f is Extract<Fact, { k: "s" }> => f.k === "s");
      const angles = facts.filter((f): f is Extract<Fact, { k: "a" }> => f.k === "a");
      let rule = "";
      if (sides.length === 3) rule = "SSS";
      else if (sides.length === 2) {
        const at = angles[0].i;
        const onBoth = sides.every((s) => s.i === at || s.j === at);
        rule = onBoth ? "SAS" : angles[0].v === 90 && sides.some((s) => s.i !== at && s.j !== at) ? "RHS" : CRIT[5];
      } else {
        const ends = [sides[0].i, sides[0].j].sort().join();
        rule = [angles[0].i, angles[1].i].sort().join() === ends ? "ASA" : "AAS";
      }
      return opt === rule;
    },
    bugs: ([c, , seed]) => {
      const opts = fourOf(6, c, CRIT_MIS[c], Math.floor(seed / 3));
      const says = [
        "It was thought that an angle is always needed. Three pairs of equal sides are enough on their own (SSS).",
        "ASA was chosen, but two sides and the angle between them are given: that is SAS.",
        "AAS was chosen, but the equal side lies between the two equal angles: that is ASA.",
        "ASA was chosen, but the equal side is not between the two equal angles: that is AAS.",
        "It was thought that two sides and an angle not between them are never enough. With a right angle, the hypotenuse and one side do fix the triangle (RHS).",
        "SAS was chosen, but the equal angle is not between the two equal sides. Two sides and a non-included angle (SSA) can fit two different triangles, so they are not enough.",
      ];
      return [B(`rule-${c}`, "conceptual", CONG, says[c], opts.indexOf(CRIT_MIS[c]))];
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]}.`,
    domain: CR_DOM,
    cap: 300,
    difficulty: ([c]) => (c <= 1 ? 1 : c <= 3 ? 2 : 3),
    teach: {
      idea: "Some sets of three facts fix a triangle completely, so two triangles sharing them are congruent: SSS, SAS (the angle between the sides), ASA or AAS, and RHS for right triangles. Two sides with an angle that is not between them (SSA) do not.",
      method: "Mark the equal parts. Count sides and angles, then check where the angle is: between the two sides (SAS) or not; is the side between the two angles (ASA) or not (AAS); is there a right angle with the hypotenuse (RHS)?",
      alternatives: [{ id: "build", title: "Try to build it", kind: "conceptual", text: ["With straws and a protractor, try to build a triangle from the facts.", "If only one triangle can be built, the facts fix it; with SSA you can often swing the last side to two different places."] }],
    },
    limits: "Choosing the rule from given facts; writing the congruence proof itself is marked by an educator.",
  },
  {
    id: "amabis",
    arity: 4,
    title: "The angle bisector theorem",
    competency: TP,
    type: "exact",
    mc: true,
    // [m, x, y, z]: AD bisects ∠A, D on BC; m 0 AB = x, AC = y, BC = z → BD; 1 BD = x, DC = y, AB = z → AC
    parse: none,
    reject: rj(AB_DOM, abOk, "Triangles with whole-number sides up to 15 cm and answers with at most two decimal places."),
    prompt: ([m, x, y, z]) => (m === 0 ? `In ΔABC, the bisector of ∠A meets BC at D. AB = ${x} cm, AC = ${y} cm and BC = ${z} cm. Find BD, in cm.` : `In ΔABC, the bisector of ∠A meets BC at D. BD = ${x} cm, DC = ${y} cm and AB = ${z} cm. Find AC, in cm.`),
    solve: (p) => {
      const [m, x, y, z] = p;
      const ans = abAns(p);
      const rule = step("rule", "note", TP, ["BD/DC = AB/AC (the angle bisector theorem)"], "");
      return m === 0 ? { steps: [rule, step("bd", "multiply", TP, [z, `${x}/${x + y}`], dec(ans))], answer: dec(ans) } : { steps: [rule, step("ac", "multiply", TP, [z, `${y}/${x}`], dec(ans))], answer: dec(ans) };
    },
    // independent: draw the triangle on coordinates, draw the bisector as the sum of the unit vectors along AB and AC, and measure where it meets BC
    validate: ([m, x, y, z], v) => {
      const n = num(v);
      if (n === null || n <= 0) return false;
      const foot = (ab: number, ac: number, bc: number) => {
        const [A, Bp, C] = place(bc, ac, ab);
        const dir = add2(unit(sub(Bp, A)), unit(sub(C, A)));
        return dist(meet(A, dir, Bp, sub(C, Bp)), Bp);
      };
      return m === 0 ? near(n, foot(x, y, z), 1e-9) : near(foot(z, n, x + y), x, 1e-9);
    },
    bugs: ([m, x, y, z]) => (m === 0 ? [B("midpoint", "conceptual", TP, "D was taken as the midpoint of BC. The bisector of the angle splits BC in the ratio AB : AC, not equally.", D(z, 2)), B("swapped", "procedural", TP, "The sides were swapped: BD goes with AB, so BD = BC × AB/(AB + AC).", dec(q(z * y, x + y)))] : [B("swapped", "procedural", TP, "The ratio was turned round: AC goes with DC, so AC = AB × DC/BD.", dec(q(z * x, y))), ...(z + y - x > 0 ? [B("add-difference", "conceptual", TP, "The same difference was added. The theorem is about equal ratios.", String(z + y - x))] : [])]),
    distractors: ([m, x, y, z]) => (m === 0 ? [dec(q(z * x, y)), dec(qa(abAns([m, x, y, z]), Q(1)))] : [dec(q(z * y, x + y)), dec(qa(abAns([m, x, y, z]), Q(1)))]),
    variants: () => [],
    explain: say({ rule: "Angle bisector theorem", bd: "BD = BC × AB/(AB + AC)", ac: "AC = AB × DC/BD" }),
    domain: AB_DOM,
    cap: 300,
    difficulty: ([m, x, y, z]) => (abAns([m, x, y, z])[1] === 1 ? 1 : m === 0 ? 2 : 3),
    word: ([m, x, y, z]) => (m === 0 ? `A triangular field ABC has AB = ${x} m, AC = ${y} m and BC = ${z} m. A straight hedge from A cuts the angle at A exactly in half and meets BC at D. How far is D from B, in m?` : `A straight path from corner A of a triangular park cuts the angle at A in half and meets the side BC at D, with BD = ${x} m and DC = ${y} m. AB = ${z} m. How long is AC, in m?`),
    teach: {
      idea: "The bisector of an angle of a triangle divides the opposite side in the ratio of the two sides that make the angle: BD/DC = AB/AC.",
      method: "Write BD : DC = AB : AC. To find BD, share BC in that ratio: BD = BC × AB/(AB + AC). To find a side, cross-multiply.",
      alternatives: [{ id: "share", title: "Share in a ratio", kind: "procedural", text: ["If AB : AC = 3 : 5, then BC is cut into 3 + 5 = 8 equal parts.", "BD is 3 of those parts and DC is 5 of them."] }],
    },
    limits: "Internal bisectors with whole-number sides; the converse and the proof are marked by an educator.",
  },
  // ============================================================ tangents: how many
  {
    id: "amtcount",
    arity: 2,
    title: "How many tangents from a point",
    competency: TAN,
    type: "integer",
    mc: true,
    // [r, d]: a circle of radius r cm and a point d cm from its centre
    parse: none,
    reject: rj(TC_DOM, tcOk, "Radii 2–12 cm and points up to twice the radius from the centre."),
    prompt: ([r, d]) => `A circle has radius ${r} cm. A point P is ${d} cm from its centre${d === 0 ? " (P is the centre)" : ""}. How many tangents to the circle can be drawn through P?`,
    solve: ([r, d]) => ({ steps: [step("compare", "note", TAN, [d < r ? `${d} < ${r}: P is inside the circle` : d === r ? `${d} = ${r}: P is on the circle` : `${d} > ${r}: P is outside the circle`], d < r ? 0 : d === r ? 1 : 2)], answer: d < r ? 0 : d === r ? 1 : 2 }),
    // independent: turn a line round P and count the directions in which its distance from the centre equals the radius
    validate: ([r, d], v) => {
      let count = 0;
      const N = 3600;
      const g = (i: number) => d * Math.abs(Math.sin((i * Math.PI) / N)) - r;
      for (let i = 0; i < N; i++) {
        const a = g(i);
        const b = g(i + 1);
        if (Math.abs(a) < 1e-12) count++;
        else if (Math.abs(b) >= 1e-12 && Math.sign(a) !== Math.sign(b)) count++;
      }
      return v === count;
    },
    bugs: ([r, d]) => (d < r ? [B("inside-two", "conceptual", TAN, "From a point inside the circle every line through it cuts the circle twice, so no line just touches it: there are no tangents.", 2), B("inside-one", "conceptual", TAN, "There is no tangent through a point inside the circle; every line through it is a secant.", 1)] : d === r ? [B("on-two", "conceptual", TAN, "At a point on the circle there is exactly one tangent, perpendicular to the radius there.", 2)] : [B("outside-one", "conceptual", TAN, "From a point outside the circle there are two tangents, one touching each side of the circle.", 1)]),
    variants: () => [],
    explain: (s) => `${s.inputs[0]}, so the number of tangents is ${s.value}.`,
    domain: TC_DOM,
    difficulty: ([r, d]) => (d === r ? 2 : d === 0 ? 1 : Math.abs(d - r) <= 1 ? 3 : 1),
    word: ([r, d]) => `A round pond has a radius of ${r} m, and a lamp post stands ${d} m from its centre. How many straight paths through the lamp post just touch the edge of the pond without crossing it?`,
    teach: {
      idea: "A tangent touches a circle at exactly one point. Compare the point's distance from the centre with the radius: inside, on, or outside.",
      method: "Distance less than the radius: 0 tangents. Equal to the radius: 1 tangent. Greater: 2 tangents.",
      alternatives: [{ id: "ruler", title: "Turn a ruler", kind: "conceptual", text: ["Put a pin at P and turn a ruler around it over a drawn circle.", "Count how many times the ruler's edge just touches the circle without cutting it."] }],
    },
    limits: "Single points and one circle; common tangents to two circles are left out.",
  },
];

/** The outside surface of amcombs, as multiples of π: [id, label, coefficient] for each piece. */
function combsParts([s, t, k, o, H]: number[]): { pi: R; parts: [string, string, R][] } {
  if (s >= 2) {
    const r = q(7 * k, 2);
    const r2 = qm(r, r);
    const side = qm(qm(Q(2), r), Q(H));
    return { pi: PI7, parts: s === 2 ? [["side", "Cylinder side 2πrH", side], ["hem", "Two hemispheres 2 × 2πr²", qm(Q(4), r2)]] : [["base", "Base πr²", r2], ["side", "Cylinder side 2πrH", side], ["hem", "Hemisphere 2πr²", qm(Q(2), r2)]] };
  }
  const [r, , l] = leg(t, k, o);
  const pi = piFor(r);
  return { pi, parts: s === 0 ? [["cone", "Cone πrl", Q(r * l)], ["hem", "Hemisphere 2πr²", Q(2 * r * r)]] : [["base", "Base πr²", Q(r * r)], ["side", "Cylinder side 2πrH", Q(2 * r * H)], ["cone", "Cone πrl", Q(r * l)]] };
}
const sup = (n: number) => String(n).replace(/./g, (c) => ({ "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" })[c] ?? c);
