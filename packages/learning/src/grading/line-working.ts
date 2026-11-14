/**
 * line-working@1: calculus working for questions no task-specific checker reads (areas, volumes, improper integrals,
 * partial derivatives, approximations, …), judged LINE BY LINE ON ITS OWN TRUTH.
 *
 * Every "=" in a line is checked by itself, exactly:
 *  - ∫ₐᵇ f dx = [F]ₐᵇ and ∫ f dx = F + C hold when F′ = f (the exact kernel, e6-cas);
 *  - [F]ₐᵇ is F(b) − F(a) (a limit at ∞), d/dx(…) and ∂/∂x(…) are differentiated, lim (x → a) … is the exact limit
 *    (e6-series), f(a) and f′(a) use the function the question defines;
 *  - what is left must be an exact identity (every other letter is an independent constant).
 * A line is wrong only when it visibly fails at sample points (a definite integral is compared with a converged numerical
 * value). Because a line can be true while the working sets up the wrong region or the wrong integral, the working is called
 * complete ("verified") only when every line is true AND it ends at the question's own answer; otherwise it is at most
 * "partial". What cannot be read is unchecked, never right.
 */
import { createHash } from "node:crypto";
import { question } from "../content.ts";
import { N, S, add, mul, neg, normalize, parseExpression, splitEquals, type A } from "../e6-parse.ts";
import { compareExpr, d6, evalNum } from "../e6-cas.ts";
import { constantValue, limitOf } from "../e6-series.ts";
import { constQ, polyCoeffs } from "../e6-calc.ts";
import type { Q } from "../exact-e5.ts";
import { toCheckerNotation } from "./calculus-working.ts";
import type { WorkingAssessment } from "./working.ts";
import { definiteValue } from "./antiderivative.ts";

export const LINE_WORKING = "line-working@1" as const;
const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).digest("hex");

class Unchecked extends Error {}
const json = (a: unknown) => JSON.stringify(a, (_k, v) => (typeof v === "bigint" ? `${v}n` : v));
const unjson = (s: string, f: (v: Record<string, unknown>) => unknown = (v) => v) => JSON.parse(s, (_k, v) => (typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v && typeof v === "object" ? f(v) : v));
const subst = (a: A, map: Record<string, A>): A => unjson(json(a), (v) => (v.t === "s" && typeof v.name === "string" && v.name in map ? map[v.name as string] : v)) as A;

interface Def { params: string[]; body: A }
export interface Piece { f: A; lo: number; hi: number; loIn: boolean; hiIn: boolean }
/** a piecewise f: its pieces, the joining point the question asks about, and the values of its parameters (k; a, b) that
 *  the question's condition (continuous / differentiable there) fixes */
export interface Piecewise { pieces: Piece[]; at: number | null; params: string[]; solution: Record<string, A> | null }
export interface LineTask { v: string; defs: Map<string, Def>; answer: A | null; point: Record<string, A>; slope?: A; pw?: Piecewise; sums?: Map<string, { r: string; lo: string; hi: string; e: string }>; mv?: Map<string, { vars: string[]; at: string[]; e: string }>; approx?: { target: A; value: A }; given: A[]; limitAt?: [A, A]; integrand?: A }
const PD = ["PDx", "PDy", "PDz", "PDt"];
const YP = "Yp"; // y′ on an implicit curve

const notation = (t: string) => toCheckerNotation(t)
  .replace(/[×·]/g, "*").replace(/′/g, "'").replace(/″/g, "''")
  // ∂f/∂x and ∂/∂x(…) as their own operator, so a d/dt beside them is never read as partial
  .replace(/∂\s*([a-z])\s*\/\s*∂\s*([a-z])/g, "PD$2($1)").replace(/∂\s*\/\s*∂\s*([a-z])\s*/g, "PD$1")
  .replace(/(?<![a-z])log\b/g, "ln")
  .trim();
/** "A = …", "Area = …", "V = …": a name for what follows, not a claim */
const LABEL = /^\s*(?:the\s+)?(?:required\s+)?(?:area|volume|answer|a|v|i)\s*=\s*/i;

const readIn = (t: string, v: string, fns: Set<string>) => parseExpression(normalize(notation(t)), { fnNames: fns, variable: v });

/** what the question defines (f(x) = …, f(x, y) = …, w = … in terms of other letters) and its answer */
export function lineTaskOf(qid: string): LineTask | null {
  let q: { prompt: string; answer: unknown; type?: string };
  try { q = question(qid.replace(/:mc$/, "")) as typeof q; } catch { return null; }
  const p = q.prompt.replace(/\s+/g, " ").replace(/[−–]/g, "-");
  const v = (/\bd[a-z]\/dt\b|\bt seconds\b|\bs = .*\bt\b/.test(p) && !/\bdx\b/.test(p)) || /given by x = /.test(p) ? "t" : "x";
  const defs = new Map<string, Def>();
  if (!/ for [a-z] [<>≤≥]/.test(p)) { // never a piecewise function ("for (x, y) ≠ (0, 0)" is not one)
    for (const m of p.matchAll(/\b([a-zA-Z])\(([a-z](?:, ?[a-z])*)\) = (.+?)(?= for | is |, (?:find|and|where|use)|; |\. |\.$| at | on |\?)/g)) {
      try { defs.set(m[1], { params: m[2].split(/, ?/), body: readIn(m[3], v, new Set()) }); } catch { /* not read */ }
    }
    // a parametric curve: "x = t², y = t" (both in terms of t)
    const par = p.match(/given by x = ([^,]+?), y = ([^.,;]+?)(?=[.,;]| \()/);
    if (par) try { defs.set("x", { params: [], body: readIn(par[1], "t", new Set()) }); defs.set("y", { params: [], body: readIn(par[2], "t", new Set()) }); } catch { /* not read */ }
    for (const m of p.matchAll(/\b([wzu]) = ([^,.;]+?)(?=,| where| and |\.|;)/g)) {
      try { defs.set(m[1], { params: [], body: readIn(m[2], v, new Set()) }); } catch { /* not read */ }
    }
  }
  // the point the question asks about: "at (1, −1)" for f(x, y), "when t = 2", "at x = 16"
  const point: Record<string, A> = {};
  const two = [...defs.values()].find((d) => d.params.length === 2);
  const at2 = p.match(/at \((-?[\d/.]+), (-?[\d/.]+)\)/);
  try {
    if (two && at2) { point[two.params[0]] = readIn(at2[1], v, new Set()); point[two.params[1]] = readIn(at2[2], v, new Set()); }
    for (const m of p.matchAll(/(?:when|at|and) (d?[a-z]) = (-?\d+(?:[./]\d+)?)/g)) point[m[1]] = readIn(m[2], v, new Set());
  } catch { /* none */ }
  // a curve that defines y implicitly: G(x, y) = c; the true slope is −G_x/G_y (x and y independent letters)
  let slope: A | undefined;
  const imp = p.match(/^The equation (.+?) defines y implicitly/);
  if (imp) try { const [l, r] = splitEquals(normalize(notation(imp[1]))).map((x) => parseExpression(x, { fnNames: new Set(), variable: "x" })); const G = add(l, neg(r)); slope = neg({ t: "div", a: d6(G, "x"), b: d6(G, "y") }); } catch { /* not read */ }
  // every number the question states (a value the working takes must be one of them, or solve an equation before it)
  const given: A[] = [];
  for (const m of p.matchAll(/(?<![\w.])-?\d+(?:\.\d+)?(?:\/\d+)?/g)) { try { given.push(readIn(m[0], v, new Set())); } catch { /* */ } }
  const lm = p.match(/\(x, y\) → \((-?[\d/]+), (-?[\d/]+)\)/);
  let limitAt: [A, A] | undefined;
  try { if (lm) limitAt = [readIn(lm[1], v, new Set()), readIn(lm[2], v, new Set())]; else if (/\(x, y\) ≠ \(0, 0\)/.test(p)) limitAt = [N(0), N(0)]; } catch { /* */ }
  // the question's integrand: a line that starts from it ("(5x + 8)/(x + 1)² = 5/(x + 1) + 3/(x + 1)²") claims an identity
  let integrand: A | undefined;
  const im = p.match(/∫ (?:from \S+ to \S+ of )?(.+?) d([a-z])\b/);
  if (im && im[2] === v) try { integrand = readIn(im[1], v, new Set()); } catch { /* */ }
  const pwise = piecewiseOf(p, v);
  const approx = approximationOf(p, v, defs);
  let answer: A | null = null;
  if (q.type !== "choice") try { answer = readIn(String(q.answer), v, new Set()); } catch { answer = null; }
  return { v, defs, answer, point, slope, pw: pwise ?? undefined, approx: approx ?? undefined, given, limitAt, integrand };
}

/** "the linear approximation of f(x) = √x at x = 16 to estimate √18": the target √18 = f(b) and the method's value
 *  f(a) + f′(a)(b − a) — an "≈" line is judged against the method the question names, not against the true value */
function approximationOf(p: string, v: string, defs: Map<string, Def>): { target: A; value: A } | null {
  const m = p.match(/linear approximation of ([a-z])\(([a-z])\) = .+? at \2 = (-?[\d/.]+) to estimate (.+?)\. /); if (!m) return null;
  const d = defs.get(m[1]); if (!d || d.params.length !== 1) return null;
  try {
    const x = d.params[0], a = readIn(m[3], v, new Set()), T = readIn(m[4], v, new Set());
    const f = (z: A) => subst(d.body, { [x]: z });
    // b with f(b) = T: Newton from a, then the nearest simple fraction, confirmed exactly
    let b = evalNum(a, {}); const tv = evalNum(T, {});
    for (let i = 0; i < 60; i++) { const y = evalNum(d.body, { [x]: b }) - tv, dy = evalNum(d6(d.body, x), { [x]: b }); if (!dy) break; b -= y / dy; }
    const B = { t: "n", v: ratQ(b) } as A;
    if (compareExpr(add(f(B), neg(T)), N(0), "x").status !== "equal") return null;
    return { target: T, value: add(f(a), mul(subst(d6(d.body, x), { [x]: a }), add(B, neg(a)))) };
  } catch { return null; }
}
/** "f(x) = kx − 3 for x ≤ 2, and f(x) = x² + 3 for x > 2", "f(x) = x + 6 for x < −2; x² − x for −2 ≤ x < 1; and …" */
function piecewiseOf(p: string, v: string): Piecewise | null {
  const m = p.match(/f\(x\) = (.+? for [^.]+?)\.(?: |$)/); if (!m) return null;
  const num = (s: string) => { const [a, b = "1"] = s.replace(/\s/g, "").split("/"); return Number(a) / Number(b); };
  const pieces: Piece[] = [];
  for (const part of m[1].split(/;\s*(?:and\s+)?|,\s*and\s+(?:f\(x\)\s*=\s*)?/)) {
    const pm = part.trim().match(/^(.+?) for (.+)$/); if (!pm) return null;
    let f: A; try { f = readIn(pm[1], v, new Set()); } catch { return null; }
    const c = pm[2].replace(/\s/g, "");
    let r: RegExpMatchArray | null;
    if ((r = c.match(/^(-?[\d/.]+)(<|≤)x(<|≤)(-?[\d/.]+)$/))) pieces.push({ f, lo: num(r[1]), loIn: r[2] === "≤", hi: num(r[4]), hiIn: r[3] === "≤" });
    else if ((r = c.match(/^x(<|≤)(-?[\d/.]+)$/))) pieces.push({ f, lo: -Infinity, loIn: false, hi: num(r[2]), hiIn: r[1] === "≤" });
    else if ((r = c.match(/^x(>|≥)(-?[\d/.]+)$/))) pieces.push({ f, lo: num(r[2]), loIn: r[1] === "≥", hi: Infinity, hiIn: false });
    else return null;
  }
  if (pieces.length < 2) return null;
  const atM = p.match(/at x = (-?[\d/.]+)/) ?? p.match(/x → (-?[\d/.]+)/);
  const at = atM ? num(atM[1]) : pieces.length === 2 ? pieces[0].hi : null;
  const params = [...new Set(pieces.flatMap((x) => [...symbolsOf(x.f)]))].filter((n) => n !== v).sort();
  let solution: Record<string, A> | null = null;
  if (at !== null && params.length && params.length <= 2) {
    const L = pieceAt(pieces, at, -1), R = pieceAt(pieces, at, 1);
    if (L && R) {
      const X = { t: "n", v: ratQ(at) } as A;
      const conds = [add(subst(L.f, { [v]: X }), neg(subst(R.f, { [v]: X })))];
      if (/differentiable/.test(p)) conds.push(add(subst(d6(L.f, v), { [v]: X }), neg(subst(d6(R.f, v), { [v]: X }))));
      solution = solveLinear(conds, params);
    }
  }
  return { pieces, at, params, solution };
}
const ratQ = (x: number): Q => { for (let d = 1; d <= 1000; d++) { const n = Math.round(x * d); if (Math.abs(n / d - x) < 1e-12) return { n: BigInt(n), d: BigInt(d) } as Q; } throw new Unchecked("point"); };
function pieceAt(ps: Piece[], a: number, side: -1 | 0 | 1): Piece | null {
  const x = a + side * 1e-9;
  return ps.find((q) => (x > q.lo || (x === q.lo && q.loIn)) && (x < q.hi || (x === q.hi && q.hiIn))) ?? null;
}
/** the unique solution of linear equations in the parameters (exact), or null */
function solveLinear(eqs: A[], ps: string[]): Record<string, A> | null {
  if (eqs.length !== ps.length) return null;
  const at = (e: A, vals: number[]) => constantValue(subst(e, Object.fromEntries(ps.map((p, i) => [p, N(vals[i])]))));
  const rows: number[][] = [];
  for (const e of eqs) {
    const c0 = at(e, ps.map(() => 0)); if (!c0) return null;
    const row = ps.map((_, i) => { const c = at(e, ps.map((__, j) => (i === j ? 1 : 0))); return c ? Number(c.n) / Number(c.d) - Number(c0.n) / Number(c0.d) : NaN; });
    rows.push([...row, -(Number(c0.n) / Number(c0.d))]);
  }
  if (rows.flat().some((x) => !Number.isFinite(x))) return null;
  let sol: number[];
  if (ps.length === 1) { if (rows[0][0] === 0) return null; sol = [rows[0][1] / rows[0][0]]; }
  else { const [[a, b, e], [c, d, f]] = rows; const det = a * d - b * c; if (Math.abs(det) < 1e-12) return null; sol = [(e * d - b * f) / det, (a * f - e * c) / det]; }
  const out = Object.fromEntries(ps.map((p, i) => [p, { t: "n", v: ratQ(sol[i]) } as A]));
  // exact: every condition holds at the solution
  return eqs.every((e) => { const c = constantValue(subst(e, out)); return !!c && c.n === 0n; }) ? out : null;
}
/** f(2⁻), lim (x → 2⁻) f(x), LHL, f′(2⁺), RHD … as operators on the pieces */
function piecewiseNotation(raw: string, t: LineTask): string {
  if (!t.pw) return raw;
  const at = t.pw.at === null ? "" : String(t.pw.at);
  return raw
    .replace(/lim\s*\(\s*x\s*(?:→|->)\s*(-?[\d/.]+)\s*([⁻⁺])\s*\)\s*(?:of\s+)?f\s*\(\s*x\s*\)/g, (_, a, s) => `${s === "⁻" ? "PWL" : "PWR"}(${a})`)
    .replace(/f\s*['′]\s*\(\s*(-?[\d/.]+)\s*([⁻⁺])\s*\)/g, (_, a, s) => `${s === "⁻" ? "PWDL" : "PWDR"}(${a})`)
    .replace(/f\s*\(\s*(-?[\d/.]+)\s*([⁻⁺])\s*\)/g, (_, a, s) => `${s === "⁻" ? "PWL" : "PWR"}(${a})`)
    .replace(/\bLHL\b/g, `PWL(${at})`).replace(/\bRHL\b/g, `PWR(${at})`).replace(/\bLHD\b/g, `PWDL(${at})`).replace(/\bRHD\b/g, `PWDR(${at})`)
    .replace(/\bf\s*\(\s*(-?[\d/.]+)\s*\)/g, "PWV($1)");
}
const PW = ["PWL", "PWR", "PWDL", "PWDR", "PWV"];

// ---------------------------------------------------------------------------------------------- Σ from r = a to b of …
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const SUMS = LETTERS.map((c) => `SUM${c}`);
/** Σ_{r=L}^{U} E(r) in closed form when E is a polynomial of degree ≤ 3 in r (any other letters are constants) */
function sumClosed(E0: A, r: string, L: A, U: A): A {
  // E = g · h(r) with g free of r and h a polynomial with rational coefficients: Faulhaber on h's coefficients
  const parts: A[] = E0.t === "mul" ? E0.xs : E0.t === "div" ? [E0.a, { t: "pow", a: E0.b, b: N(-1) } as A] : [E0];
  const flat = parts.flatMap((x) => (x.t === "mul" ? x.xs : [x]));
  const g = flat.filter((x) => !symbolsOf(x).has(r)), h = flat.filter((x) => symbolsOf(x).has(r));
  const hc = h.length ? polyCoeffs(h.length === 1 ? h[0] : mul(...h), r) : null;
  if (hc && hc.length <= 4) {
    const cs = [0, 1, 2, 3].map((k) => (hc[k] ? ({ t: "n", v: hc[k] } as A) : N(0)));
    return mul(...(g.length ? g : [N(1)]), faulhaber(cs, L, U));
  }
  return sumGeneral(E0, r, L, U);
}
function faulhaber(c: A[], L: A, U: A): A {
  const half = { t: "pow", a: N(2), b: N(-1) } as A, sixth = { t: "pow", a: N(6), b: N(-1) } as A;
  const S = (m: A): A => add(mul(c[0], m), mul(c[1], m, add(m, N(1)), half), mul(c[2], m, add(m, N(1)), add(mul(N(2), m), N(1)), sixth), mul(c[3], { t: "pow", a: mul(m, add(m, N(1)), half), b: N(2) } as A));
  return add(S(U), neg(S(add(L, N(-1)))));
}
function sumGeneral(E: A, r: string, L: A, U: A): A {
  const at = (k: number) => subst(E, { [r]: N(k) });
  const e = [0, 1, 2, 3].map(at);
  // Newton forward differences → power basis c0 + c1 r + c2 r² + c3 r³
  const d1 = [1, 2, 3].map((i) => add(e[i], neg(e[i - 1]))), d2 = [1, 2].map((i) => add(d1[i], neg(d1[i - 1]))), d3 = add(d2[1], neg(d2[0]));
  const R: A = { t: "s", name: r };
  const P = add(e[0], mul(d1[0], R), mul(div2(d2[0], 2), R, add(R, N(-1))), mul(div2(d3, 6), R, add(R, N(-1)), add(R, N(-2))));
  if (compareExpr(add(E, neg(P)), N(0), r).status !== "equal") throw new Unchecked("not a polynomial in the index");
  const c = [0, 1, 2, 3].map((k) => { // coefficient of r^k in P, by exact differentiation at 0
    let g: A = P; let f = 1; for (let i = 0; i < k; i++) { g = d6(g, r); f *= i + 1; }
    return div2(subst(g, { [r]: N(0) }), f);
  });
  const S = (m: A): A => add(mul(c[0], m), mul(c[1], m, add(m, N(1)), { t: "pow", a: N(2), b: N(-1) } as A), mul(c[2], m, add(m, N(1)), add(mul(N(2), m), N(1)), { t: "pow", a: N(6), b: N(-1) } as A), mul(c[3], { t: "pow", a: mul(m, add(m, N(1)), { t: "pow", a: N(2), b: N(-1) } as A), b: N(2) } as A));
  return add(S(U), neg(S(add(L, N(-1)))));
}
const div2 = (a: A, k: number): A => mul(a, { t: "pow", a: N(k), b: N(-1) } as A);
// ---------------------------------------------------------------------------------------------- lim ((x, y) → (a, b)) of …
const MVS = LETTERS.map((c) => `MVL${c}`); // kept across lines, so "= −4" on the next line still knows its limit
function mvNotation(line: string, mv: Map<string, { vars: string[]; at: string[]; e: string }>): string {
  return line.replace(/lim\s*\(\s*\(\s*([a-z])\s*,\s*([a-z])\s*\)\s*(?:→|->)\s*\(\s*([^,()]+?)\s*,\s*([^()]+?)\s*\)\s*\)\s*(?:of\s+)?(.+?)(?=\s*=|$)/g, (_, x, y, a, b, e) => { const k = MVS[mv.size]; mv.set(k, { vars: [x, y], at: [a, b], e }); return `${k}(0)`; });
}
/** a side's "Σ from r = 1 to n of E" becomes SUMA(0), its closed form kept aside */
function sumNotation(side: string, sums: Map<string, { r: string; lo: string; hi: string; e: string }>): string {
  return side.replace(/Σ\s*from\s+([a-z])\s*=\s*(\S+)\s+to\s+(\S+)\s+of\s+(.+?)(?=\s*=|$)/g, (_, r, lo, hi, e) => { const k = SUMS[sums.size]; sums.set(k, { r, lo, hi, e }); return `${k}(0)`; });
}

const symbolsOf = (a: A, out = new Set<string>()): Set<string> => { unjson(json(a), (x) => { if (x.t === "s") out.add(x.name as string); return x; }); return out; };
const hasNode = (a: A, kind: string) => json(a).includes(`"t":"${kind}"`);

/** a with every operator that has an exact value replaced by it */
function reduce(a: A, t: LineTask): A {
  const r = (x: A) => reduce(x, t);
  switch (a.t) {
    case "n": case "pi": case "e": return a;
    case "C": return S("C0");
    case "s": {
      const d = t.defs.get(a.name); if (d) return d.body; // f in ∂f/∂x is f(x, y)
      const dd = a.name.length === 2 && a.name[0] === "d" ? t.defs.get(a.name[1]) : undefined;
      if (dd) { // the differential dA = A′(x) dx, df = f_x dx + f_y dy
        const vars = dd.params.length ? dd.params : [...symbolsOf(dd.body)];
        return add(...vars.map((p) => mul(d6(dd.body, p), { t: "s", name: `d${p}` } as A)));
      }
      return a;
    }
    case "neg": return neg(r(a.a));
    case "add": return { t: "add", xs: a.xs.map(r) };
    case "mul": return { t: "mul", xs: a.xs.map(r) };
    case "div": return { t: "div", a: r(a.a), b: r(a.b) };
    case "pow": return { t: "pow", a: r(a.a), b: r(a.b) };
    case "fn": return { t: "fn", f: a.f === "log" ? "ln" : a.f, a: r(a.a) };
    case "call": {
      const ml = t.mv?.get(a.name);
      if (ml) { // continuous at the point (finite there): the limit is the value
        const e = r(readIn(ml.e, t.v, new Set())), pt = Object.fromEntries(ml.vars.map((x, i) => [x, r(readIn(ml.at[i], t.v, new Set()))]));
        const val = subst(e, pt);
        let y: number; try { y = evalNum(val, {}); } catch { throw new Unchecked("not continuous there"); }
        if (!Number.isFinite(y)) throw new Unchecked("not continuous there");
        return val;
      }
      const sm = t.sums?.get(a.name);
      if (sm) return sumClosed(r(readIn(sm.e, t.v, new Set())), sm.r, r(readIn(sm.lo, t.v, new Set())), r(readIn(sm.hi, t.v, new Set())));
      if (t.pw && PW.includes(a.name) && a.args.length === 1) {
        const pt = constantValue(r(a.args[0])); if (!pt) throw new Unchecked("point");
        const x = Number(pt.n) / Number(pt.d), side = a.name === "PWV" ? 0 : a.name.endsWith("L") ? -1 : 1;
        const piece = pieceAt(t.pw.pieces, x, side as -1 | 0 | 1); if (!piece) throw new Unchecked("piece");
        const g = a.name.startsWith("PWD") ? d6(piece.f, t.v) : piece.f;
        return subst(g, { [t.v]: { t: "n", v: pt } as A }); // pieces are polynomials: continuous inside their range
      }
      if (PD.includes(a.name) && a.args.length === 1) return d6(r(a.args[0]), a.name.slice(2)); // ∂/∂x: other letters constant
      const d = t.defs.get(a.name); if (!d || d.params.length !== a.args.length) throw new Unchecked(a.name); return subst(d.body, Object.fromEntries(d.params.map((p, i) => [p, r(a.args[i])]))); }
    case "Dcall": { const d = t.defs.get(a.name); if (!d || d.params.length !== 1) throw new Unchecked(a.name); let g = d.body; for (let i = 0; i < a.k; i++) g = d6(g, d.params[0]); return subst(g, { [d.params[0]]: r(a.arg) }); }
    case "D": {
      // d/dx of a letter the question does not define (dy/dx, d/dx(xy), dx/dt) may depend on x: not read
      const free = [...symbolsOf(a.of)].filter((n) => n !== a.v && !t.defs.has(n) && n !== "C0");
      if (t.slope && a.v === "x" && a.k === 1 && free.every((n) => n === "y")) { // implicit: d/dx = ∂/∂x + ∂/∂y · y′
        const g = r(a.of); return add(d6(g, "x"), mul(d6(g, "y"), S(YP)));
      }
      if (free.length) throw new Unchecked("derivative of an unknown function");
      const by = t.defs.get(a.v);
      if (by && a.k === 1) { // dy/dx on a parametric curve: (dy/dt)/(dx/dt)
        const tv = [...symbolsOf(by.body)][0]; if (!tv) throw new Unchecked("parameter");
        return { t: "div", a: d6(r(a.of), tv), b: d6(by.body, tv) };
      }
      let g = r(a.of); for (let i = 0; i < a.k; i++) g = d6(g, a.v); return g; }
    case "EV": {
      const F = r(a.f);
      const at = (b: A): A => {
        if (b.t === "V") { if (b.k === "dne") throw new Unchecked("bound"); const L = limitOf(F, a.v, b.k, b.k === "inf" ? "left" : "right"); if (L.kind !== "finite") throw new Unchecked("limit"); return { t: "n", v: L.value }; }
        return subst(F, { [a.v]: r(b) });
      };
      return add(at(a.hi), neg(at(a.lo)));
    }
    case "LIM": {
      const pt = a.at === "inf" || a.at === "-inf" ? a.at : constQ(r(a.at)); if (!pt) throw new Unchecked("limit point");
      const L = limitOf(r(a.f), a.v, pt as Q | "inf" | "-inf", a.side); if (L.kind !== "finite") throw new Unchecked("limit");
      return { t: "n", v: L.value };
    }
    default: throw new Unchecked(a.t);
  }
}

type Verdict = "right" | "wrong" | "unchecked" | "label";

/** sample every letter at a few points; "differ" when the two sides visibly disagree at two or more */
function samples(F: A, names: string[]): "zero" | "differ" | "few" {
  let good = 0, off = 0;
  const pts = [0.37, 0.71, 1.13, 1.61, 2.23, 0.53];
  for (let i = 0; i < pts.length; i++) {
    const env = Object.fromEntries(names.map((n, j) => [n, pts[(i + j * 2) % pts.length] + 0.1 * j]));
    let y: number; try { y = evalNum(F, env); } catch { continue; }
    if (!Number.isFinite(y)) continue;
    good++; if (Math.abs(y) > 1e-7) off++;
  }
  return good >= 3 && off >= 2 ? "differ" : good >= 3 && off === 0 ? "zero" : "few";
}
/** L = R exactly; `claim` false for a relation between letters (y = 6 − 2x, x² = x + 6), which may be an equation to
 *  solve rather than an identity: then it is never called wrong */
function identity(L: A, R: A, claim = true, point?: Record<string, A>): Verdict {
  const F = add(L, neg(R));
  const names = [...symbolsOf(F)];
  try { if (compareExpr(F, N(0), names[0] ?? "x").status === "equal") return "right"; } catch { /* unproven */ }
  // an expression worked out at the question's point (2x² + 4y² = 6 at (1, −1), 2x dx = 0.32 at x = 8, dx = 0.02)
  if (names.length && point && names.every((n) => n in point) && [L, R].some((s) => !symbolsOf(s).size)) {
    const at = subst(F, point);
    try { if (compareExpr(at, N(0), "x").status === "equal") return "right"; } catch { /* */ }
    if (claim) { const c = constantValue(at); if (c && c.n !== 0n) return "wrong"; }
    return "unchecked";
  }
  if (names.length && !claim) return "unchecked";
  return samples(F, names) === "differ" ? "wrong" : "unchecked";
}
const OPS = ["I", "EV", "D", "LIM", "call", "Dcall"];
/** a side that works something out (an integral, a derivative, a limit, f(a), a differential dA of a defined A) makes a claim */
const hasOp = (a: A, t?: LineTask) => OPS.some((k) => hasNode(a, k)) || (!!t && [...symbolsOf(a)].some((n) => n.length === 2 && n[0] === "d" && t.defs.has(n[1])));
/** ∫ₐᵇ f by Simpson's rule (only to call a value wrong, never right) */
function numericIntegral(f: A, v: string, lo: number, hi: number): number | null {
  const at = (x: number) => evalNum(f, { [v]: x });
  const simpson = (n: number) => { const h = (hi - lo) / n; let s = at(lo) + at(hi); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * at(lo + i * h); return (s * h) / 3; };
  try { const a = simpson(400), b = simpson(800); return Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b)) ? b : null; } catch { return null; }
}
/** an integral side split as c·∫ (c free of the integral) */
function asIntegral(a: A): { c: A; I: Extract<A, { t: "I" }> } | null {
  if (a.t === "I") return { c: N(1), I: a };
  if (a.t === "mul") { const i = a.xs.findIndex((x) => x.t === "I"); if (i >= 0 && a.xs.filter((x) => hasNode(x, "I")).length === 1) return { c: mul(...a.xs.filter((_, j) => j !== i)), I: a.xs[i] as Extract<A, { t: "I" }> }; }
  if (a.t === "neg") { const r = asIntegral(a.a); return r && { c: neg(r.c), I: r.I }; }
  return null;
}
const asBracket = (a: A): { c: A; E: Extract<A, { t: "EV" }> } | null => {
  if (a.t === "EV") return { c: N(1), E: a };
  if (a.t === "mul") { const i = a.xs.findIndex((x) => x.t === "EV"); if (i >= 0) return { c: mul(...a.xs.filter((_, j) => j !== i)), E: a.xs[i] as Extract<A, { t: "EV" }> }; }
  return null;
};

// ---------------------------------------------------------------------------------------------- limits along paths
let paths: { value: A; right: boolean }[] = [];
/** "along y = mx, the limit is 1/(1 + 3m²)", "along x = 0: lim = 1", and "so the limit does not exist" */
function pathLine(raw: string, t: LineTask): Verdict | null {
  const f = t.defs.get("f");
  const text = raw.replace(/[−–]/g, "-");
  if (/does not exist|doesn't exist|\bDNE\b|not exist/i.test(text) && !/=/.test(text.replace(/along[^,:]*[,:]/i, ""))) {
    if (!/along/i.test(text)) { // the conclusion: two checked paths with different limits
      for (let i = 0; i < paths.length; i++) for (let j = i + 1; j < paths.length; j++) {
        if (paths[i].right && paths[j].right && identity(paths[i].value, paths[j].value) === "wrong") return "right";
      }
      return "unchecked";
    }
  }
  const m = text.match(/along\s+(?:the\s+(?:line|path|curve|axis)\s+)?([xy])\s*=\s*([^,:;]+?)\s*[,:;]\s*(.+)$/i);
  if (!m || !f || f.params.length !== 2 || !t.limitAt) return null;
  const [px, py] = f.params, [ax, ay] = t.limitAt;
  const pieces = m[3].split(/=|\bis\b|→|->/); if (pieces.length < 2) return "unchecked";
  const valueText = pieces[pieces.length - 1].replace(/[.\s]+$/, "").trim();
  try {
    const curve = readIn(m[2], t.v, new Set()), claimed = reduce(readIn(valueText, t.v, new Set()), t);
    // along y = g(x): one variable left; its limit point is the other coordinate
    const [free, at, onPath] = m[1] === py ? [px, ax, { [py]: subst(curve, { x: { t: "s", name: px } as A }) }] : [py, ay, { [px]: subst(curve, { y: { t: "s", name: py } as A }) }];
    const g = subst(f.body, onPath);
    const pt = constantValue(at); if (!pt) return "unchecked";
    const L = limitOf(g, free, pt, "both"); if (L.kind !== "finite") return "unchecked";
    const value = { t: "n", v: L.value } as A;
    const v = identity(claimed, value);
    paths.push({ value, right: v === "right" });
    return v;
  } catch { return "unchecked"; }
}

/** L ≈ R: right when the two are equal, or when one is the quantity being estimated and the other is the method's value */
function approxPair(L0: A, R0: A, t: LineTask): Verdict {
  const L = reduce(L0, t), R = reduce(R0, t);
  if (identity(L, R, false) === "right") return "right";
  if (!t.approx) return "unchecked";
  for (const [X, Y] of [[L, R], [R, L]]) {
    if (identity(X, t.approx.target, false) !== "right") continue;
    if (symbolsOf(Y).size) return "unchecked";
    return identity(Y, t.approx.value);
  }
  return "unchecked";
}
function pair(L0: A, R0: A, t: LineTask): Verdict {
  // lim ((x, y) → P) of g = lim ((x, y) → P) of h: g and h agree wherever both are defined
  if (L0.t === "call" && R0.t === "call" && t.mv?.has(L0.name) && t.mv.has(R0.name)) {
    const a = t.mv.get(L0.name)!, b = t.mv.get(R0.name)!;
    if (json(a.at) === json(b.at) && json(a.vars) === json(b.vars)) return identity(reduce(readIn(a.e, t.v, new Set()), t), reduce(readIn(b.e, t.v, new Set()), t));
  }
  for (const [X, Y] of [[L0, R0], [R0, L0]]) {
    const ii = asIntegral(X);
    if (!ii) continue;
    const { c, I } = ii;
    const f = reduce(I.f, t);
    const J = asIntegral(Y);
    if (!I.lo && J && !J.I.lo) { // ∫ f dx = ∫ g du (u = u(x)): the integrands agree as f(x) = g(u(x))·u′(x)
      const slopeOf = (k: A, K: Extract<A, { t: "I" }>) => { const g = mul(reduce(k, t), reduce(K.f, t)); if (K.v === t.v) return g; const d = t.defs.get(K.v); if (!d) throw new Unchecked("variable"); return mul(g, d6(d.body, t.v)); };
      return identity(slopeOf(c, I), slopeOf(J.c, J.I));
    }
    if (!I.lo) { // ∫ f dx = F + C: F′ = f
      const Yr = reduce(Y, t);
      const sv = I.v !== t.v ? t.defs.get(I.v) : undefined; // ∫ g(u) du = G(u): checked in x, as g(u(x))·u′(x) = d/dx G(u(x))
      if (sv) return identity(mul(reduce(c, t), f, d6(sv.body, t.v)), d6(Yr, t.v));
      return identity(mul(reduce(c, t), f), d6(Yr, I.v));
    }
    const b = asBracket(Y);
    if (b && json(b.E.lo) === json(I.lo) && json(b.E.hi) === json(I.hi)) { // ∫ₐᵇ f = [F]ₐᵇ: F′ = f, same factor
      const ok = identity(f, d6(reduce(b.E.f, t), I.v)), k = identity(reduce(c, t), reduce(b.c, t));
      return ok === "right" && k === "right" ? "right" : ok === "wrong" || k === "wrong" ? "wrong" : "unchecked";
    }
    // a value: worked out exactly when an antiderivative is found (and proved); otherwise only refuted numerically
    try {
      const Yr = reduce(Y, t), cr = reduce(c, t);
      if (symbolsOf(Yr).size || symbolsOf(cr).size || I.lo.t === "V" || I.hi!.t === "V") return "unchecked";
      const exact = definiteValue(f, I.v, reduce(I.lo, t), reduce(I.hi!, t), (F, x) => subst(F, { [I.v]: x }));
      if (exact) return identity(mul(cr, exact), Yr);
      const val = numericIntegral(f, I.v, evalNum(reduce(I.lo, t), {}), evalNum(reduce(I.hi!, t), {}));
      if (val === null) return "unchecked";
      const want = evalNum(cr, {}) * val, got = evalNum(Yr, {});
      return Math.abs(want - got) > 1e-6 * Math.max(1, Math.abs(want)) ? "wrong" : "unchecked";
    } catch { return "unchecked"; }
  }
  if (hasNode(L0, "I") || hasNode(R0, "I")) return "unchecked";
  if (t.pw?.solution && !hasOp(L0) && !hasOp(R0)) { // an equation in the parameters only: true exactly when the condition gives it
    const F = add(reduce(L0, t), neg(reduce(R0, t))), names = [...symbolsOf(F)];
    if (names.length && names.every((n) => t.pw!.params.includes(n))) {
      const c = constantValue(subst(F, t.pw.solution));
      return c ? (c.n === 0n ? "right" : "wrong") : "unchecked";
    }
  }
  if (t.slope) { // a relation with y′ is true exactly when it gives the curve's slope
    const F = add(reduce(L0, t), neg(reduce(R0, t)));
    if (symbolsOf(F).has(YP)) {
      const b = subst(F, { [YP]: N(0) }), a = add(subst(F, { [YP]: N(1) }), neg(b));
      try { if (compareExpr(F, add(mul(a, S(YP)), b), YP).status !== "equal") return "unchecked"; } catch { return "unchecked"; }
      return identity(mul(t.slope, a), neg(b)); // a·y′ + b = 0 with y′ = slope
    }
  }
  const Lr = reduce(L0, t), Rr = reduce(R0, t);
  const fromIntegrand = !!t.integrand && [Lr, Rr].some((x) => { try { return compareExpr(add(x, neg(t.integrand!)), N(0), t.v).status === "equal"; } catch { return false; } });
  return identity(Lr, Rr, hasOp(L0, t) || hasOp(R0, t) || fromIntegrand, t.point);
}

export function lineVerdicts(t: LineTask, lines: string[]): { verdicts: Verdict[]; last: A | null } {
  let last: A | null = null, lastEq: A | null = null;
  paths = [];
  t.sums = new Map(); t.mv = new Map();
  const fns = new Set([...[...t.defs.entries()].filter(([, d]) => d.params.length).map(([k]) => k), ...PD, ...SUMS, ...MVS, ...(t.pw ? PW : [])]);
  const verdicts = lines.map((raw): Verdict => {
    try {
      raw = piecewiseNotation(raw, t);
      if (!t.pw) raw = raw.replace(/\b(d?)([AV])\b/g, (_, d, X) => d + X.toLowerCase()); // A, dA as a, da (the reader splits dA)
      // a value the working takes (x = 8, dx = 0.02): a premise, not a claim; later lines use it
      const given = raw.replace(/[−–]/g, "-").match(/^\s*(d?[a-z])\s*=\s*(-?[\d./]+)\s*(?:[a-z]{1,2})?\s*$/);
      if (given && !t.pw) {
        // a value the working takes: right when the question states it (for this letter, or as a number) or it solves the
        // equation just before; otherwise only an assumption, and the working can then be at most partly checked
        const val = readIn(given[2], t.v, new Set());
        t.point[given[1]] = val;
        const same = (a: A) => { try { return compareExpr(add(a, neg(val)), N(0), "x").status === "equal"; } catch { return false; } };
        const solves = lastEq && [...symbolsOf(lastEq)].every((n) => n === given[1]) && (() => { const c = constantValue(subst(lastEq!, { [given[1]]: val })); return !!c && c.n === 0n; })();
        return t.given.some(same) || solves ? "right" : "unchecked";
      }
      const sub = raw.match(/^\s*(?:let|put|substitute|set|take)\s+([a-z])\s*=\s*(.+)$/i);
      if (sub && sub[1] !== t.v && !t.defs.has(sub[1])) { // a substitution: u = x² + 1
        t.defs.set(sub[1], { params: [], body: reduce(readIn(sub[2], t.v, new Set()), t) });
        return "label";
      }
      const path = pathLine(raw, t);
      if (path) return path;
      const labelled = LABEL.test(raw);
      t.sums ??= new Map(); t.mv ??= new Map();
      const text = sumNotation(normalize(notation(mvNotation(labelled ? raw.replace(LABEL, "") : raw, t.mv))), t.sums);
      const seps = [...text.matchAll(/≈|(?<![<>!])=(?!=)/g)].map((m) => m[0]);
      const parts = splitEquals(text.replace(/≈/g, "="));
      if (labelled && parts.length === 1) {
        last = parseExpression(parts[0], { fnNames: fns, variable: t.v });
        const name = raw.match(/^\s*([A-Za-z])\s*=/)?.[1];
        if (name && !t.defs.has(name) && symbolsOf(last).size) { try { t.defs.set(name, { params: [], body: reduce(last, t) }); } catch { /* an integral: only a name */ } } // A = x²
        return "label";
      }
      const cont = parts[0].trim() === "";
      const sides = parts.filter((_, i) => !(cont && i === 0)).map((s) => parseExpression(s, { fnNames: fns, variable: t.v }));
      if (cont) { if (!last) return "unchecked"; sides.unshift(last); }
      if (sides.length < 2) return "unchecked";
      last = sides[sides.length - 1];
      if (sides.length === 2) { try { const F = add(reduce(sides[0], t), neg(reduce(sides[1], t))); lastEq = symbolsOf(F).size === 1 ? F : lastEq; } catch { /* */ } }
      const off = cont ? 1 : 0; // the separators of a continued line start after the one in front
      const vs = sides.slice(1).map((R, i) => { try { return seps[i + off - (cont ? 1 : 0)] === "≈" ? approxPair(sides[i], R, t) : pair(sides[i], R, t); } catch { return "unchecked" as Verdict; } });
      return vs.includes("wrong") ? "wrong" : vs.every((v) => v === "right") ? "right" : "unchecked";
    } catch {
      return "unchecked";
    }
  });
  return { verdicts, last };
}

/** the working ends at the question's own answer (exactly) */
function endsAtAnswer(t: LineTask, last: A | null): boolean {
  if (!last || !t.answer) return false;
  try { return identity(reduce(last, t), reduce(t.answer, t)) === "right"; } catch { return false; }
}

export function lineWorking(qid: string, lines: string[], base: WorkingAssessment): WorkingAssessment {
  const t = lineTaskOf(qid);
  if (!t || !lines.length || base.status !== "unsupported") return base;
  const qq = question(qid);
  const { verdicts: v, last } = lineVerdicts(t, lines);
  const first = v.indexOf("wrong");
  let lead = 0;
  while (lead < v.length && (v[lead] === "right" || v[lead] === "label")) lead++;
  const status: WorkingAssessment["status"] = first >= 0 ? "invalid" : lead === v.length && v.includes("right") && endsAtAnswer(t, last) ? "verified" : v.includes("right") ? "partial" : "unsupported";
  return {
    ...base,
    statement: qq.prompt,
    status,
    methodEvidence: status === "verified" ? "method-verified" : status === "invalid" ? "method-false-step" : "no-method-evidence",
    completeness: status === "verified" ? "complete" : "incomplete",
    lines: lines.map((text, i) => ({ text, status: v[i] === "right" && (first < 0 || i < first) ? "certified-calculus" : i === first ? "invalid" : "unsupported", move: null })),
    firstInvalid: first < 0 ? null : { index: first, text: lines[first], from: first ? lines[first - 1] : qq.prompt, reason: "The two sides of this line are not equal.", lost: null, gained: null },
    workingAnswer: null,
    agreesWithResponse: null,
    substitution: null,
    certificates: status === "verified" ? [digest({ policy: LINE_WORKING, qid, lines })] : [],
    replayed: status === "verified",
    replayedLines: first >= 0 ? Math.min(lead, first) : lead,
    reason: status === "verified" ? "Every line is true and the working ends at the answer." : "",
    provenance: { schema: "working-provenance@1" as const, questionId: qid, competency: qq.competency, checker: "line-reasoner", version: LINE_WORKING, reasoning: status === "verified" ? "demonstrated" : status === "invalid" ? "refuted" : "not-established" },
  } as WorkingAssessment;
}
