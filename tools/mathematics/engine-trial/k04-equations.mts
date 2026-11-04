/**
 * K04 benchmark, step 1 of 2: generate 1,000 seeded, unseen linear and quadratic equations and solve each with
 * the CortexJS Compute Engine (MIT). Step 2 (check.py) verifies every answer independently with SymPy.
 *
 *   node --import tsx tools/mathematics/engine-trial/k04-equations.mts out/k04.json [seed]
 *
 * The equations come from this file's own generator, not from the 1,080 question families, so they are unseen by
 * every OpenPath solver. Each equation is stored twice:
 *   poly    exact coefficients of both sides (constant, x, x²) — what the equation IS, for the checker;
 *   latex   how it is shown to the solver (sometimes with brackets or terms on both sides).
 * The solver's own parse of the LaTeX is recorded too, so the checker can confirm the solver read the equation that
 * was intended before it judges the answer.
 *
 * Set CE_MODULE to a local build of the Compute Engine if it is not installed from npm.
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Rational } from "../../../packages/learning/src/math-kernel";
import { rng } from "./rng.mts";

const [, , outPath = "k04.json", seedArg = "20261023"] = process.argv;
const seed = Number(seedArg);
const r = rng(seed);

const require = createRequire(import.meta.url);
const { ComputeEngine } = require(process.env.CE_MODULE ?? "@cortex-js/compute-engine");
const ce = new ComputeEngine();

type Poly = [Rational, Rational, Rational]; // c0 + c1·x + c2·x²
const R = (n: number, d = 1) => new Rational(n, d);
const ZERO: Poly = [R(0), R(0), R(0)];

// ── LaTeX rendering of exact coefficients ──
const num = (q: Rational) => (q.isInteger() ? `${q.numBig < 0n ? -q.numBig : q.numBig}` : `\\frac{${q.numBig < 0n ? -q.numBig : q.numBig}}{${q.denBig}}`);
function term(q: Rational, power: 0 | 1 | 2, first: boolean): string {
  if (q.isZero()) return "";
  const neg = q.numBig < 0n;
  const abs = neg ? q.neg() : q;
  const v = power === 0 ? "" : power === 1 ? "x" : "x^2";
  const coef = power > 0 && abs.isOne() ? "" : num(abs);
  return `${neg ? "-" : first ? "" : "+"}${coef}${v}`;
}
function side(p: Poly): string {
  let s = "";
  for (const k of [2, 1, 0] as const) s += term(p[k], k, s === "");
  return s === "" ? "0" : s;
}

// ── generators: each returns [lhs, rhs, latex?, kind] ──
type Eq = { kind: string; lhs: Poly; rhs: Poly; latex?: string };
const lin = (a: Rational, b: Rational): Poly => [b, a, R(0)];
const fracNZ = () => R(r.nz(-12, 12), r.int(1, 9));

const LINEAR: [string, number, () => Eq][] = [
  ["linear: ax + b = c", 150, () => { const a = R(r.nz(-15, 15)), x = R(r.int(-20, 20)), b = R(r.int(-50, 50)); return { kind: "linear-basic", lhs: lin(a, b), rhs: [a.mul(x).add(b), R(0), R(0)] }; }],
  ["linear: x on both sides", 120, () => { let a = R(r.nz(-12, 12)), c = R(r.nz(-12, 12)); if (a.eq(c)) c = c.add(R(1)); return { kind: "linear-both-sides", lhs: lin(a, R(r.int(-40, 40))), rhs: lin(c, R(r.int(-40, 40))) }; }],
  ["linear: fractional coefficients", 120, () => ({ kind: "linear-fractions", lhs: lin(fracNZ(), fracNZ()), rhs: [fracNZ(), R(0), R(0)] })],
  ["linear: brackets a(x + b) = c", 60, () => {
    const a = R(r.nz(-9, 9)), b = R(r.nz(-15, 15)), c = R(r.int(-60, 60));
    const latex = `${a.eq(R(-1)) ? "-" : a.isOne() ? "" : String(a.numBig)}\\left(x${b.numBig < 0n ? "-" : "+"}${b.numBig < 0n ? -b.numBig : b.numBig}\\right)=${c.numBig}`;
    return { kind: "linear-brackets", lhs: lin(a, a.mul(b)), rhs: [c, R(0), R(0)], latex };
  }],
  ["linear: no solution", 25, () => { const a = R(r.nz(-9, 9)); const b = R(r.int(-20, 20)); return { kind: "linear-no-solution", lhs: lin(a, b), rhs: lin(a, b.add(R(r.nz(-9, 9)))) }; }],
  ["linear: every x is a solution", 25, () => { const a = R(r.nz(-9, 9)), b = R(r.int(-20, 20)); return { kind: "linear-identity", lhs: lin(a, b), rhs: lin(a, b) }; }],
];

/** (p x − q)(s x − t) expanded: roots q/p and t/s. */
const fromRoots = (p: number, q: number, s: number, t: number): Poly => [R(q * t), R(-(p * t + q * s)), R(p * s)];
const QUADRATIC: [string, number, () => Eq][] = [
  ["quadratic: monic, integer roots", 150, () => ({ kind: "quadratic-integer-roots", lhs: fromRoots(1, r.int(-15, 15), 1, r.int(-15, 15)), rhs: ZERO })],
  ["quadratic: rational roots", 100, () => { const k = R(r.nz(-3, 3)); const p = fromRoots(r.nz(1, 6), r.int(-12, 12), r.nz(1, 6), r.int(-12, 12)); return { kind: "quadratic-rational-roots", lhs: [p[0].mul(k), p[1].mul(k), p[2].mul(k)], rhs: ZERO }; }],
  ["quadratic: irrational roots", 100, () => {
    for (;;) { const a = R(r.nz(-5, 5)), b = R(r.int(-12, 12)), c = R(r.int(-20, 20)); const d = b.mul(b).sub(R(4).mul(a).mul(c)); const s = Math.round(Math.sqrt(d.toNumber())); if (d.gt(R(0)) && !R(s * s).eq(d)) return { kind: "quadratic-irrational-roots", lhs: [c, b, a], rhs: ZERO }; }
  }],
  ["quadratic: no real roots", 60, () => {
    for (;;) { const a = R(r.nz(1, 5)), b = R(r.int(-10, 10)), c = R(r.int(1, 30)); if (b.mul(b).lt(R(4).mul(a).mul(c))) return { kind: "quadratic-no-real-roots", lhs: [c, b, a], rhs: ZERO }; }
  }],
  ["quadratic: repeated root", 40, () => { const p = r.nz(1, 5), q = r.int(-12, 12); return { kind: "quadratic-repeated-root", lhs: fromRoots(p, q, p, q), rhs: ZERO }; }],
  ["quadratic: not in standard form", 50, () => {
    // a x² + b x = c, or a x² = k: the solver has to rearrange first
    const a = R(r.nz(-6, 6)), b = R(r.pick([0, r.int(-10, 10)])), c = R(r.int(-30, 30));
    return { kind: "quadratic-rearrange", lhs: [R(0), b, a], rhs: [c, R(0), R(0)] };
  }],
];

const toText = (p: Poly) => p.map((q) => q.toString());
const out: unknown[] = [];
let i = 0;
for (const [, count, make] of [...LINEAR, ...QUADRATIC]) {
  for (let k = 0; k < count; k++) {
    const eq = make();
    const latex = eq.latex ?? `${side(eq.lhs)}=${side(eq.rhs)}`;
    const record: Record<string, unknown> = { id: `eq-${i++}`, kind: eq.kind, latex, poly: { lhs: toText(eq.lhs), rhs: toText(eq.rhs) } };
    try {
      const parsed = ce.parse(latex);
      record.parsed = parsed.json;
      const sols = parsed.solve("x");
      record.solutions = Array.isArray(sols) ? sols.map((s: { json: unknown }) => s.json) : null;
    } catch (e) {
      record.error = (e as Error).message.slice(0, 160);
    }
    out.push(record);
  }
}

writeFileSync(outPath, JSON.stringify({ benchmark: "k04-equations", seed, solver: "@cortex-js/compute-engine", count: out.length, equations: out }));
console.log(`k04: ${out.length} equations → ${outPath}`);
