// R1: independent exact verifier for one-variable rational-equation reasoning.
// Independence: this file imports ONLY the kernel's Rational and the outcome codes. It has its own parser (whitespace-aware, rejects implicit
// multiplication), its own polynomial code (primitive-PRS gcd, Sturm sequences), its own restriction extraction (from the WRITTEN tree: division,
// negative and zero powers, nested denominators) and its own solution-set algebra over the REAL numbers. It never calls or re-runs a reasoning rule.
// It does not use poly.ts, domain-state.ts, expr-text.ts or the planner. Everything is exact; nothing is sampled.
import { Rational } from "../../math-kernel.ts";
import { Refusal } from "../outcomes.ts";
import { spend } from "../../core/budget.ts";

const Z = Rational.zero, ONE = Rational.one;
// ---------------------------------------------------------------- syntax
export type N = { t: "num"; v: Rational } | { t: "x" } | { t: "neg"; a: N } | { t: "bin"; op: "+" | "-" | "*" | "/"; a: N; b: N } | { t: "pow"; a: N; e: N };
type Tok = { k: "num" | "x" | "op" | "(" | ")"; s: string };
const FUNCS = new Set(["sqrt", "abs", "ln", "log", "exp", "sin", "cos", "tan", "floor", "ceil", "min", "max"]);
function tokenize(src: string): Tok[] {
  if (src.length > 2000) throw new Refusal("UNSUPPORTED_EXPRESSION", "input too long");
  const out: Tok[] = []; let i = 0; let sawSpace = false;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { sawSpace = true; i++; continue; }
    if (/[0-9]/.test(c)) {
      const m = /^\d+(\.\d+)?/.exec(src.slice(i))!; if (sawSpace && out.length && out[out.length - 1].k === "num") throw new Refusal("PARSE_ERROR", "whitespace inside a number");
      out.push({ k: "num", s: m[0] }); i += m[0].length; sawSpace = false; continue;
    }
    sawSpace = false;
    if ("+-*/^".includes(c)) { out.push({ k: "op", s: c }); i++; continue; }
    if (c === "(" || c === ")") { out.push({ k: c, s: c }); i++; continue; }
    if (/[a-zA-Z]/.test(c)) { const w = /^[a-zA-Z]+/.exec(src.slice(i))![0]; i += w.length;
      if (w === "x") out.push({ k: "x", s: "x" }); else if (FUNCS.has(w.toLowerCase())) throw new Refusal("UNSUPPORTED_OPERATOR", `function ${w}`); else throw new Refusal("PARSE_ERROR", `unknown symbol ${w}`); continue; }
    if ("!|%√".includes(c)) throw new Refusal("UNSUPPORTED_OPERATOR", `operator ${c}`);
    throw new Refusal("PARSE_ERROR", `unexpected character ${JSON.stringify(c)}`);
  }
  return out;
}
export function parseSide(src: string): N {
  const t = tokenize(src); let i = 0; let depth = 0;
  if (t.length === 0) throw new Refusal("PARSE_ERROR", "empty expression");
  const peekOp = (...ops: string[]) => t[i] && t[i].k === "op" && ops.includes(t[i].s);
  const sum = (): N => { let l = prod(); while (peekOp("+", "-")) { const op = t[i++].s as "+" | "-"; l = { t: "bin", op, a: l, b: prod() }; } return l; };
  const prod = (): N => { let l = unary(); while (peekOp("*", "/")) { const op = t[i++].s as "*" | "/"; l = { t: "bin", op, a: l, b: unary() }; } return l; };
  const unary = (): N => { if (peekOp("-")) { i++; return { t: "neg", a: unary() }; } return power(); };
  const power = (): N => { const b = atom(); if (peekOp("^")) { i++; return { t: "pow", a: b, e: unary() }; } return b; };
  const atom = (): N => {
    const k = t[i]; if (!k) throw new Refusal("PARSE_ERROR", "unexpected end");
    if (k.k === "(") { if (++depth > 150) throw new Refusal("UNSUPPORTED_EXPRESSION", "nesting too deep"); i++; const e = sum(); if (!t[i] || t[i].k !== ")") throw new Refusal("PARSE_ERROR", "expected )"); i++; depth--; return e; }
    if (k.k === "x") { i++; return { t: "x" }; }
    if (k.k === "num") { i++; const [a, b = ""] = k.s.split("."); return { t: "num", v: new Rational(BigInt(a + b), 10n ** BigInt(b.length)) }; }
    throw new Refusal("PARSE_ERROR", `unexpected token ${k.s}`);
  };
  const e = sum(); if (i !== t.length) throw new Refusal("PARSE_ERROR", `trailing input at token ${i}`); return e;
}
export function parseEquation(text: string): { l: N; r: N } {
  const parts = text.split("="); if (parts.length !== 2) throw new Refusal("PARSE_ERROR", parts.length < 2 ? "not an equation" : "more than one '='");
  return { l: parseSide(parts[0]), r: parseSide(parts[1]) };
}
/** Exact evaluation at a rational x; null where the expression is undefined (division by zero, 0^0, 0^negative). */
export function evalAt(n: N, x: Rational): Rational | null {
  switch (n.t) {
    case "num": return n.v; case "x": return x;
    case "neg": { const a = evalAt(n.a, x); return a && a.neg(); }
    case "bin": { const a = evalAt(n.a, x), b = evalAt(n.b, x); if (!a || !b) return null;
      return n.op === "+" ? a.add(b) : n.op === "-" ? a.sub(b) : n.op === "*" ? a.mul(b) : b.isZero() ? null : a.div(b); }
    case "pow": { const k = constInt(n.e); const a = evalAt(n.a, x); if (!a || k === null) return null; if (k === 0) return a.isZero() ? null : ONE;
      if (k < 0 && a.isZero()) return null; let r = ONE; for (let i = 0; i < Math.abs(k); i++) r = r.mul(a); return k < 0 ? r.inv() : r; }
  }
}
const hasX = (n: N): boolean => n.t === "x" || (n.t === "neg" ? hasX(n.a) : n.t === "bin" ? hasX(n.a) || hasX(n.b) : n.t === "pow" ? hasX(n.a) || hasX(n.e) : false);
function constVal(n: N): Rational | null { if (hasX(n)) return null; return evalAt(n, Z); }
/** Integer value of a constant exponent expression, or null when it is not a constant integer. */
function constInt(n: N): number | null { const v = constVal(n); if (!v || !v.isInteger()) return null; const b = v.numBig; return b > 1000n || b < -1000n ? null : Number(b); }

// ---------------------------------------------------------------- polynomials (coefficients low -> high, no trailing zeros)
type P = Rational[];
const trim = (p: P): P => { let n = p.length; while (n > 0 && p[n - 1].isZero()) n--; return p.slice(0, n); };
const deg = (p: P) => p.length - 1;
const padd = (a: P, b: P): P => { spend(16 * Math.max(a.length, b.length) + 1); const o: P = []; for (let i = 0; i < Math.max(a.length, b.length); i++) o.push((a[i] ?? Z).add(b[i] ?? Z)); return trim(o); };
const pneg = (a: P): P => a.map((v) => v.neg());
const psub = (a: P, b: P) => padd(a, pneg(b));
/** rough size of the coefficients (hex digits of the middle one): arithmetic on big numbers costs more, so it is charged more */
const bigW = (p: P): number => (p.length ? 1 + (((p[p.length >> 1].numBig < 0n ? -p[p.length >> 1].numBig : p[p.length >> 1].numBig).toString(16).length + p[p.length >> 1].denBig.toString(16).length) >> 4) : 1);
const pmul = (a: P, b: P): P => { spend(32 * a.length * b.length * Math.max(bigW(a), bigW(b)) + 1); if (!a.length || !b.length) return []; const o: P = new Array(a.length + b.length - 1).fill(Z); a.forEach((u, i) => b.forEach((v, j) => { o[i + j] = o[i + j].add(u.mul(v)); })); return trim(o); };
const ppow = (a: P, k: number): P => { let r: P = [ONE]; for (let i = 0; i < k; i++) r = pmul(r, a); return r; };
const pscale = (a: P, k: Rational): P => trim(a.map((v) => v.mul(k)));
const pdivmod = (a: P, b: P): { q: P; r: P } => { let r = a; const q: P = new Array(Math.max(0, a.length - b.length + 1)).fill(Z);
  while (r.length >= b.length && r.length) { spend(8 * r.length * bigW(r) + 1); const k = r[r.length - 1].div(b[b.length - 1]), d = r.length - b.length; q[d] = k; r = psub(r, pmul(new Array(d).fill(Z).concat([k]), b)); } return { q: trim(q), r }; };
const gcdB = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
/** Integer primitive part with positive leading coefficient: the normal form used for gcds and comparisons. */
function prim(p: P): P { if (!p.length) return p; let l = 1n; for (const c of p) l = (l * c.denBig) / gcdB(l, c.denBig);
  const ints = p.map((c) => (c.numBig * l) / c.denBig); let g = 0n; for (const v of ints) g = gcdB(g, v); if (p[p.length - 1].numBig < 0n) g = -g;
  return ints.map((v) => new Rational(v / g)); }
/** both parts have integer coefficients with a common integer factor greater than 1 (e.g. (3x+6)/(3x+9)): not in lowest terms. Skipped when a coefficient is not an integer. */
function commonNumericContent(a: P, b: P): boolean { const c = (p: P): bigint | null => { let g = 0n; for (const v of p) { if (v.denBig !== 1n) return null; g = gcdB(g, v.numBig); } return g === 0n ? null : g; }; const x = c(a), y = c(b); return x !== null && y !== null && gcdB(x, y) > 1n; }
function pgcd(a: P, b: P): P { a = prim(a); b = prim(b); while (b.length) { const r = pdivmod(a, b).r; a = b; b = prim(r); } return a; }
const pderiv = (a: P): P => trim(a.slice(1).map((v, i) => v.mul(new Rational(i + 1))));
function pexact(a: P, b: P): P | null { const { q, r } = pdivmod(a, b); return r.length ? null : q; }
const peval = (p: P, x: Rational): Rational => { let r = Z; for (let i = p.length - 1; i >= 0; i--) r = r.mul(x).add(p[i]); return r; };

/** Rational roots with multiplicity and the cofactor that has none. Refuses (DOMAIN_UNRESOLVED) rather than guess when the search is too large. */
function rationalFactor(p: P): { roots: Rational[]; rest: P } {
  const roots: Rational[] = []; let q = p;
  while (q.length > 1 && q[0].isZero()) { roots.push(Z); q = q.slice(1); }
  if (q.length <= 1) return { roots, rest: q };
  const ip = prim(q); const c0 = ip[0].numBig < 0n ? -ip[0].numBig : ip[0].numBig, an = ip[ip.length - 1].numBig;
  if (c0 > 10n ** 15n || an > 10n ** 15n) throw new Refusal("DOMAIN_UNRESOLVED", "coefficients too large for exact root search");
  const divs = (n: bigint): bigint[] => { const o: bigint[] = []; for (let d = 1n; d * d <= n; d++) if (spend(1), true) if (n % d === 0n) { o.push(d); if (d * d !== n) o.push(n / d); } return o; };
  const A = divs(c0), B = divs(an); if (A.length * B.length > 200000) throw new Refusal("DOMAIN_UNRESOLVED", "too many rational-root candidates");
  const cands = new Map<string, Rational>(); for (const a of A) for (const b of B) { for (const s of [1n, -1n]) { const r = new Rational(s * a, b); cands.set(r.toString(), r); } }
  for (const r of [...cands.values()].sort((u, v) => (u.lt(v) ? -1 : u.gt(v) ? 1 : 0))) {
    for (;;) { const d = pexact(q, [r.neg(), ONE]); if (!d || !peval(q, r).isZero()) break; roots.push(r); q = d; if (q.length <= 1) break; }
    if (q.length <= 1) break;
  }
  return { roots, rest: q };
}
/** Number of distinct real roots of a polynomial (Sturm sequence, exact). */
function realRootCount(p: P): number {
  if (p.length <= 1) return 0; const sq = pexact(p, pgcd(p, pderiv(p)))!; const seq: P[] = [sq, pderiv(sq)];
  while (seq[seq.length - 1].length > 1) { const r = pdivmod(seq[seq.length - 2], seq[seq.length - 1]).r; if (!r.length) break; seq.push(pneg(r)); }
  const v = (atPlus: boolean) => { let last = 0, c = 0; for (const s of seq) { let sg = s[s.length - 1].numBig < 0n ? -1 : 1; if (!atPlus && (s.length - 1) % 2 === 1) sg = -sg; if (last && sg !== last) c++; last = sg; } return c; };
  return v(false) - v(true);
}

// ---------------------------------------------------------------- rational functions and restrictions read from the WRITTEN tree
interface RF { n: P; d: P }
interface Built extends RF { conds: P[] }
/** Build n/d unreduced and collect every polynomial that must be non-zero for the written expression to be defined. */
function build(n: N, conds: P[]): RF {
  switch (n.t) {
    case "num": return { n: n.v.isZero() ? [] : [n.v], d: [ONE] };
    case "x": return { n: [Z, ONE], d: [ONE] };
    case "neg": { const a = build(n.a, conds); return { n: pneg(a.n), d: a.d }; }
    case "bin": {
      const a = build(n.a, conds), b = build(n.b, conds);
      if (n.op === "+") return { n: padd(pmul(a.n, b.d), pmul(b.n, a.d)), d: pmul(a.d, b.d) };
      if (n.op === "-") return { n: psub(pmul(a.n, b.d), pmul(b.n, a.d)), d: pmul(a.d, b.d) };
      if (n.op === "*") return { n: pmul(a.n, b.n), d: pmul(a.d, b.d) };
      need(b.n, conds); return { n: pmul(a.n, b.d), d: pmul(a.d, b.n) };
    }
    case "pow": {
      if (hasX(n.e)) throw new Refusal("UNSUPPORTED_OPERATOR", "x in an exponent");
      const ev = constVal(n.e); if (ev === null) throw new Refusal("DOMAIN_UNRESOLVED", "exponent is undefined");
      if (!ev.isInteger()) throw new Refusal("UNSUPPORTED_OPERATOR", "non-integer exponent");
      const k = constInt(n.e); if (k === null) throw new Refusal("UNSUPPORTED_EXPRESSION", "exponent too large");
      const b = build(n.a, conds);
      if (k > 0) return { n: ppow(b.n, k), d: ppow(b.d, k) };
      need(b.n, conds);                                  // base^0 and base^-k both require base != 0
      return k === 0 ? { n: [ONE], d: [ONE] } : { n: ppow(b.d, -k), d: ppow(b.n, -k) };
    }
  }
}
function need(p: P, conds: P[]) { if (!p.length) throw new Refusal("DOMAIN_UNRESOLVED", "division by an expression that is zero everywhere"); if (p.length > 1) conds.push(p); }
export interface Analysed { f: RF; required: Rational[] }
/** Restriction values required by the written equation (zeros of every condition polynomial); refuses if any is not an exact rational linear root. */
export function analyse(text: string): Analysed {
  const { l, r } = parseEquation(text); const conds: P[] = []; const L = build(l, conds), R = build(r, conds);
  const req = new Map<string, Rational>();
  for (const c of conds) { const { roots, rest } = rationalFactor(c);
    if (rest.length > 1) throw new Refusal("DOMAIN_UNRESOLVED", "a denominator has a zero that is not an exact rational number", ["denominator-outside-boundary"]);
    for (const v of roots) req.set(v.toString(), v); }
  return { f: { n: psub(pmul(L.n, R.d), pmul(R.n, L.d)), d: pmul(L.d, R.d) }, required: sortVals([...req.values()]) };
}
const sortVals = (a: Rational[]) => a.slice().sort((u, v) => (u.lt(v) ? -1 : u.gt(v) ? 1 : 0));
const sub = (a: Rational[], b: Rational[]) => a.every((v) => b.some((u) => u.eq(v)));

// ---------------------------------------------------------------- real solution sets
export type Sol = { kind: "all"; excluded: Rational[] } | { kind: "set"; rats: Rational[]; irr: P };
/** Real solution set of f = 0 on the domain: reduce, remove factors already excluded, split off rational roots, decide the rest by Sturm. */
export function solution(f: RF, excluded: Rational[]): Sol {
  const ex = sortVals(excluded);
  const g = pgcd(f.n, f.d); let N = g.length > 1 ? pexact(f.n, g)! : f.n;
  if (!N.length) return { kind: "all", excluded: ex };
  for (const v of ex) for (;;) { const d = N.length > 1 ? pexact(N, [v.neg(), ONE]) : null; if (!d) break; N = d; }
  const { roots, rest } = rationalFactor(N); const rats = sortVals([...new Map(roots.map((r) => [r.toString(), r])).values()]);
  let irr: P = [ONE]; if (rest.length > 1) { const sq = pexact(rest, pgcd(rest, pderiv(rest)))!; if (realRootCount(sq) > 0) irr = prim(sq); }
  return { kind: "set", rats, irr };
}
const isEmpty = (s: Sol) => s.kind === "set" && !s.rats.length && s.irr.length === 1;
const samePoly = (a: P, b: P) => a.length === b.length && a.every((v, i) => v.eq(b[i]));
export const solEq = (a: Sol, b: Sol): boolean => a.kind === "all" ? b.kind === "all" && a.excluded.length === b.excluded.length && a.excluded.every((v, i) => v.eq(b.excluded[i]))
  : b.kind === "set" && a.rats.length === b.rats.length && a.rats.every((v, i) => v.eq(b.rats[i])) && samePoly(a.irr, b.irr);
export function solSub(a: Sol, b: Sol): boolean {
  if (isEmpty(a)) return true;
  if (a.kind === "set" && b.kind === "set") return sub(a.rats, b.rats) && (a.irr.length === 1 || (b.irr.length > 1 && pexact(b.irr, a.irr) !== null));
  if (a.kind === "set" && b.kind === "all") return a.rats.every((v) => !b.excluded.some((u) => u.eq(v))) && (a.irr.length === 1 || b.excluded.every((v) => !peval(a.irr, v).isZero()));
  if (a.kind === "all" && b.kind === "all") return sub(b.excluded, a.excluded);
  return false;
}

// ---------------------------------------------------------------- the checker
export type Effect = "equivalence" | "implication";
export interface StateText { eq: string; excluded: string[] }
export const toVals = (xs: string[]): Rational[] => sortVals([...new Map(xs.map((s) => { const [a, b] = s.split("/"); const r = new Rational(BigInt(a), BigInt(b ?? "1")); return [r.toString(), r] as const; })).values()]);
export type Reason = "from-restriction-missing" | "restriction-closure-violated" | "restriction-dropped" | "original-restriction-lost" | "solution-set-changed" | "solution-set-lost" | "state-unanalysable";
/** Check one step between two explicit states. Both states are validated first: an invalid starting state is never accepted. */
// ---------------------------------------------------------------- finite disjunctions ("x=2 or x=3")
/** A line may be a finite disjunction of equations. Its domain is R minus the zeros of the denominators of ALL disjuncts (and the explicitly excluded values);
 *  its solution set is the UNION of the solution sets of the disjuncts over that common domain. */
export const splitDisjuncts = (text: string): string[] => text.split(/\s+or\s+/i).map((t) => t.trim()).filter(Boolean);
export const isDisjunction = (text: string) => splitDisjuncts(text).length > 1;
export function solUnion(a: Sol, b: Sol): Sol {
  if (a.kind === "all" && b.kind === "all") return { kind: "all", excluded: a.excluded.filter((v) => b.excluded.some((u) => u.eq(v))) };
  if (a.kind === "all" || b.kind === "all") {
    const [al, st] = a.kind === "all" ? [a, b as Extract<Sol, { kind: "set" }>] : [b as Extract<Sol, { kind: "all" }>, a as Extract<Sol, { kind: "set" }>];
    return { kind: "all", excluded: al.excluded.filter((v) => !st.rats.some((u) => u.eq(v)) && !(st.irr.length > 1 && peval(st.irr, v).isZero())) };
  }
  const rats = sortVals([...new Map([...a.rats, ...b.rats].map((r) => [r.toString(), r])).values()]);
  const irr = a.irr.length === 1 ? b.irr : b.irr.length === 1 ? a.irr : samePoly(a.irr, b.irr) ? a.irr : prim(pmul(a.irr, pexact(b.irr, pgcd(a.irr, b.irr))!));
  return { kind: "set", rats, irr };
}
export interface AnalysedLine { required: Rational[]; solve: (excluded: Rational[]) => Sol }
export function analyseLine(text: string): AnalysedLine {
  const parts = splitDisjuncts(text).map((t) => analyse(t));
  const req = new Map<string, Rational>(); for (const p of parts) for (const v of p.required) req.set(v.toString(), v);
  return { required: sortVals([...req.values()]), solve: (ex) => parts.map((p) => solution(p.f, ex)).reduce(solUnion) };
}
export function checkStep(from: StateText, to: StateText, effect: Effect = "equivalence", originalText?: string): { valid: boolean; reasons: Reason[]; refusal?: string } {
  let A: AnalysedLine, B: AnalysedLine, O: Analysed | null = null;
  try { A = analyseLine(from.eq); B = analyseLine(to.eq); O = originalText ? analyse(originalText) : null; }
  catch (e) { if (e instanceof Refusal) return { valid: false, reasons: ["state-unanalysable"], refusal: e.code }; throw e; }
  const ex1 = toVals(from.excluded), ex2 = toVals(to.excluded); const why: Reason[] = [];
  if (!sub(A.required, ex1)) why.push("from-restriction-missing");
  if (!sub(B.required, ex2)) why.push("restriction-closure-violated");
  if (!sub(ex1, ex2)) why.push("restriction-dropped");
  if (O && !sub(O.required, ex2)) why.push("original-restriction-lost");
  const a = A.solve(ex1), b = B.solve(ex2);
  if (effect === "equivalence") { if (!solEq(a, b)) why.push("solution-set-changed"); } else if (!solSub(a, b)) why.push("solution-set-lost");
  return { valid: why.length === 0, reasons: why };
}
// ---------------------------------------------------------------- layered domain semantics (student working)
// Four layers are kept apart:
//   original    zeros of the denominators of the ORIGINAL problem: permanently excluded, every line is judged with them removed;
//   expression  zeros of the denominators written in THIS line;
//   assumptions expression \ original: values excluded only because the line is written with an introduced denominator; they restrict THAT line's
//               meaning, never the original solution set and never later lines; a later line that drops them may GAIN those values;
//   carried     explicit case assumptions ("case x != c") that stay in force for the lines of that branch.
// The meaning of a line is its solution set over  R \ (original U expression U carried).  A step is judged by comparing the two meanings:
//   equivalent  -> valid;   gain (old set inside new set) -> implication, creates an outstanding proof obligation;   loss or both -> NOT a valid step.
export interface DomainLayers { original: Rational[]; expression: Rational[]; assumptions: Rational[]; carried: Rational[]; domain: Rational[] }
const uniqSorted = (xs: Rational[]) => sortVals([...new Map(xs.map((r) => [r.toString(), r] as const)).values()]);
export function domainLayers(line: AnalysedLine, original: Rational[], carried: Rational[] = []): DomainLayers {
  const assumptions = line.required.filter((v) => !original.some((u) => u.eq(v)));
  return { original, expression: line.required, assumptions, carried, domain: uniqSorted([...original, ...line.required, ...carried]) };
}
export type Relation = "equivalent" | "gain" | "loss" | "both";
export interface Relate { relation: Relation; before: Sol; after: Sol; fromLayers: DomainLayers; toLayers: DomainLayers; refusal?: string }
export function relateLines(fromText: string, toText: string, originalText: string, carriedFrom: Rational[] = [], carriedTo: Rational[] = []): Relate | { refusal: string } {
  let A: AnalysedLine, B: AnalysedLine, O: Analysed;
  try { A = analyseLine(fromText); B = analyseLine(toText); O = analyse(originalText); }
  catch (e) { if (e instanceof Refusal) return { refusal: e.code }; throw e; }
  const fromLayers = domainLayers(A, O.required, carriedFrom), toLayers = domainLayers(B, O.required, carriedTo);
  const before = A.solve(fromLayers.domain), after = B.solve(toLayers.domain);
  const up = solSub(before, after), down = solSub(after, before);
  return { relation: up && down ? "equivalent" : up ? "gain" : down ? "loss" : "both", before, after, fromLayers, toLayers };
}
/** Exact description of the solution set of the written equation over its natural domain. */
export function solutionOf(text: string): { sol: Sol; required: Rational[] } { const a = analyse(text); return { sol: solution(a.f, a.required), required: a.required }; }
export function checkClaim(eq: string, claimed: string[] | "all-except-excluded" | "all-real"): { valid: boolean; truth: string[] | "all-except-excluded" | "undecidable" } {
  const { sol } = solutionOf(eq);
  if (sol.kind === "all") return { valid: claimed === "all-except-excluded", truth: "all-except-excluded" };
  if (sol.irr.length > 1) return { valid: false, truth: "undecidable" };          // real irrational solutions exist: a rational list cannot be complete
  const truth = sol.rats.map(String);
  if (claimed === "all-except-excluded" || claimed === "all-real") return { valid: false, truth };
  const c = toVals(claimed); return { valid: c.length === truth.length && c.every((v, i) => v.toString() === truth[i]), truth };
}
/** Validate a complete reasoning trace against the ORIGINAL equation text: initial state, every step, and the final claim.
 *  states[0] must be the original equation with all required restrictions; effects[i] describes the step states[i] -> states[i+1]. */
export function checkTrace(originalText: string, states: StateText[], effects: Effect[], final: { kind: "solution"; value: string } | { kind: "none" } | { kind: "identity" } | { kind: "state" }):
  { valid: boolean; problems: string[] } {
  const problems: string[] = [];
  let O: Analysed; try { O = analyse(originalText); } catch (e) { if (e instanceof Refusal) return { valid: false, problems: [`original unanalysable: ${e.code} ${e.message}`] }; throw e; }
  if (!states.length) return { valid: false, problems: ["empty trace"] };
  const norm = (s: string) => { const q = parseEquation(s); return JSON.stringify(q, (_k, v) => (typeof v === "bigint" ? v.toString() : v instanceof Rational ? v.toString() : v)); };
  try { if (norm(states[0].eq) !== norm(originalText)) problems.push("first state is not the original equation"); } catch { problems.push("first state unparseable"); }
  if (!sub(O.required, toVals(states[0].excluded))) problems.push("initial restrictions missing a required value");
  for (let i = 0; i + 1 < states.length; i++) { const r = checkStep(states[i], states[i + 1], effects[i] ?? "equivalence", originalText); if (!r.valid) problems.push(`step ${i + 1}: ${r.reasons.join(",")}${r.refusal ? " " + r.refusal : ""}`); }
  const truth = solution(O.f, O.required); const lastEx = toVals(states[states.length - 1].excluded);
  if (!sub(O.required, lastEx)) problems.push("final restrictions lose an original restriction");
  if (final.kind === "state") { /* a goal state, not a claim: the steps and restrictions above are the whole obligation */ }
  else if (final.kind === "identity") { if (truth.kind !== "all") problems.push("claimed identity but the solution set is not all-except-excluded"); }
  else if (final.kind === "none") { if (!isEmpty(truth)) problems.push("claimed no solution but the solution set is not empty"); }
  else {
    const c = toVals([final.value])[0]; const { l, r } = parseEquation(originalText); const a = evalAt(l, c), b = evalAt(r, c);
    if (!a || !b || !a.eq(b)) problems.push(`x = ${final.value} does not satisfy the original equation with both sides defined`);
    if (truth.kind === "set" && (truth.irr.length > 1 || truth.rats.length !== 1 || !truth.rats[0].eq(c))) problems.push("claimed unique solution but the exact solution set differs");
    if (truth.kind === "all") problems.push("claimed unique solution but the equation is an identity on its domain");
  }
  return { valid: problems.length === 0, problems };
}

// ---------------------------------------------------------------- expression-level analysis (no equals sign): identity, domain, form
// Used by the student-working layer for lines that are EXPRESSIONS (expand / factorise / simplify). Same parser, same rational-function builder,
// same restriction extraction as the equation checker; nothing here samples or uses floating point.
const sqfree = (p: P): P => (p.length <= 1 ? [ONE] : prim(pexact(p, pgcd(p, pderiv(p)))!));
/** Product of the polynomials that must be non-zero for the WRITTEN expression to be defined (1 when there are none). */
export interface ExprAnalysis { f: RF; cond: P; tree: N }
export function analyseExpression(text: string): ExprAnalysis {
  const tree = parseSide(text); const conds: P[] = []; const f = build(tree, conds);
  return { f, cond: conds.reduce((a, c) => pmul(a, c), [ONE]), tree };
}
/** Real restrictions of `p` (a squarefree product of conditions): the rational values, and whether further irrational real values exist. */
export function restrictionsOf(cond: P): { rats: Rational[]; irrational: boolean } {
  if (cond.length <= 1) return { rats: [], irrational: false };
  const { roots, rest } = rationalFactor(cond);
  return { rats: uniqSorted(roots), irrational: rest.length > 1 && realRootCount(sqfree(rest)) > 0 };
}
/** The part of `a`'s restrictions that `b` does not have: a squarefree polynomial, [1] when no real value is involved. */
function extraRestriction(a: P, b: P): P {
  const sa = sqfree(a), sb = sqfree(b); const g = pgcd(sa, sb); const q = g.length > 1 ? pexact(sa, g)! : sa;
  return q.length > 1 && realRootCount(q) > 0 ? prim(q) : [ONE];
}
export interface ExprRelation {
  /** identical: equal for every x where both are defined (a general identity); conditional: equal only at some values; never: equal nowhere */
  kind: "identical" | "conditional" | "never";
  /** values where `from` is undefined but `to` is defined (a cancellation widened the domain) */
  dropped: { rats: Rational[]; irrational: boolean };
  /** values where `to` is undefined but `from` is defined (a restriction was introduced) */
  added: { rats: Rational[]; irrational: boolean };
  /** for a conditional equality: where the two lines agree */
  agreeAt?: Sol;
}
export function relateExpressions(fromText: string, toText: string): ExprRelation {
  const A = analyseExpression(fromText), B = analyseExpression(toText);
  const dropped = restrictionsOf(extraRestriction(A.cond, B.cond)), added = restrictionsOf(extraRestriction(B.cond, A.cond));
  const D = psub(pmul(A.f.n, B.f.d), pmul(B.f.n, A.f.d));
  if (!D.length) return { kind: "identical", dropped, added };
  const ra = restrictionsOf(sqfree(A.cond)), rb = restrictionsOf(sqfree(B.cond));
  const agreeAt = solution({ n: D, d: [ONE] }, uniqSorted([...ra.rats, ...rb.rats]));
  const none = agreeAt.kind === "set" && !agreeAt.rats.length && agreeAt.irr.length === 1;
  return { kind: none ? "never" : "conditional", dropped, added, agreeAt };
}
/** Evaluate a written expression exactly at a rational point (null where undefined). */
export const evalExpressionAt = (text: string, x: Rational): Rational | null => evalAt(parseSide(text), x);

// ---- factorisation over Q (Gauss: primitive integer polynomials; roots by the rational-root test, quadratic/cubic factors by Kronecker)
const content = (p: P) => { const q = prim(p); return q.length ? q : p; };
function ints(p: P): bigint[] { let l = 1n; for (const c of p) l = (l * c.denBig) / gcdB(l, c.denBig); return p.map((c) => (c.numBig * l) / c.denBig); }
function divisorsOf(n: bigint): bigint[] { n = n < 0n ? -n : n; const o: bigint[] = []; for (let d = 1n; d * d <= n; d++) if (n % d === 0n) { o.push(d); if (d * d !== n) o.push(n / d); } return o; }
/** Does p (degree >= 2) have a factor of degree d over Q? Kronecker interpolation; refuses when the search is too large. */
function hasFactorOfDegree(p: P, d: number): boolean {
  const ip = ints(prim(p)).map((v) => new Rational(v)); const pts: bigint[] = []; for (let a = 0n; pts.length < d + 1; a = a <= 0n ? -a + 1n : -a) { if (!peval(ip, new Rational(a)).isZero()) pts.push(a); }
  const lists = pts.map((a) => { const v = peval(ip, new Rational(a)).numBig; return divisorsOf(v).flatMap((x) => [x, -x]); });
  if (lists.reduce((n, l) => n * l.length, 1) > 400000) throw new Refusal("DOMAIN_UNRESOLVED", "factorisation search too large");
  const tryTuple = (vals: bigint[]): boolean => {
    let poly: P = [];                                   // Lagrange interpolation over Q
    for (let i = 0; i < pts.length; i++) { let basis: P = [ONE], den = ONE;
      for (let j = 0; j < pts.length; j++) if (j !== i) { basis = pmul(basis, [new Rational(-pts[j]), ONE]); den = den.mul(new Rational(pts[i] - pts[j])); }
      poly = padd(poly, pscale(basis, new Rational(vals[i]).div(den))); }
    if (poly.length - 1 !== d) return false;
    return pexact(ip, poly) !== null;
  };
  const rec = (i: number, acc: bigint[]): boolean => (i === lists.length ? tryTuple(acc) : lists[i].some((v) => rec(i + 1, [...acc, v])));
  return rec(0, []);
}
/** Irreducible over Q (degree >= 1). */
export function irreducible(p: P): boolean {
  const n = p.length - 1; if (n <= 1) return n === 1;
  if (rationalFactor(p).roots.length) return false;
  if (n <= 3) return true;
  for (let d = 2; d <= Math.floor(n / 2); d++) if (hasFactorOfDegree(p, d)) return false;
  return true;
}
const isPrimitiveInt = (p: P) => p.every((c) => c.isInteger()) && p.reduce((g, c) => gcdB(g, c.numBig), 0n) === 1n;

// ---- structural facts about how an expression is WRITTEN
export interface FormFacts {
  /** every term is a single coefficient times a single power of x (no brackets to multiply out) */
  expandedShape: boolean;
  /** …and no two terms have the same power of x */
  collected: boolean;
  /** a product of irreducible, primitive factors (and a constant), not a sum */
  factorisedCompletely: boolean;
  /** one fraction (or none) whose numerator and denominator have no common factor, with no fraction inside either */
  lowestTerms: boolean;
  /** no x-power is multiplied by another power of the same base, no power of a power or of a product */
  powersCombined: boolean;
  /** has x in a denominator or a negative power */
  rational: boolean;
}
const flat = (n: N, op: "+" | "*"): N[] => (n.t === "bin" && n.op === op ? [...flat(n.a, op), ...flat(n.b, op)] : [n]);
function addTerms(n: N, sign = 1, out: { s: number; n: N }[] = []): { s: number; n: N }[] {
  if (n.t === "bin" && n.op === "+") { addTerms(n.a, sign, out); addTerms(n.b, sign, out); }
  else if (n.t === "bin" && n.op === "-") { addTerms(n.a, sign, out); addTerms(n.b, -sign, out); }
  else if (n.t === "neg") addTerms(n.a, -sign, out); else out.push({ s: sign, n });
  return out;
}
const noX = (n: N) => !hasX(n);
/** degree of a single-monomial term c·x^k written canonically (one coefficient, one power of x), else null */
function monomialDegree(t: N): number | null {
  let nums = 0, xs = 0, k = 0; let ok = true;
  const walk = (n: N) => {
    if (n.t === "neg") return walk(n.a);
    if (n.t === "bin" && n.op === "*") { walk(n.a); walk(n.b); return; }
    if (n.t === "bin" && n.op === "/" && noX(n.b) && n.b.t === "num") { nums++; walk(n.a); return; }
    if (n.t === "num") { nums++; return; }
    if (n.t === "x") { xs++; k += 1; return; }
    if (n.t === "pow" && n.a.t === "x") { const e = constInt(n.e); if (e === null || e < 2) ok = false; xs++; k += e ?? 0; return; }
    if (noX(n) && n.t === "pow") { nums++; return; }
    ok = false;
  };
  walk(t); return ok && nums <= 1 && xs <= 1 ? k : null;
}
export function formFacts(text: string): FormFacts {
  const tree = parseSide(text); const conds: P[] = []; build(tree, conds);
  const terms = addTerms(tree); const degs = terms.map((t) => monomialDegree(t.n));
  const expandedShape = degs.every((d) => d !== null);
  const collected = expandedShape && new Set(degs).size === degs.length;
  // lowest terms: strip a leading minus, then either a single fraction of two fraction-free polynomial expressions, or a fraction-free expression
  const frFree = (n: N): boolean => n.t === "num" || n.t === "x" || (n.t === "neg" && frFree(n.a)) || (n.t === "bin" && n.op !== "/" && frFree(n.a) && frFree(n.b)) || (n.t === "bin" && n.op === "/" && noX(n.b) && frFree(n.a)) || (n.t === "pow" && frFree(n.a) && noX(n.e) && (constInt(n.e) ?? -1) >= 0);
  let top: N = tree; while (top.t === "neg") top = top.a;
  const lowestTerms = frFree(tree) || (top.t === "bin" && top.op === "/" && frFree(top.a) && frFree(top.b) && hasX(top.b) && pgcd(build(top.a, []).n, build(top.b, []).n).length <= 1 && !commonNumericContent(build(top.a, []).n, build(top.b, []).n));
  // factorised completely: a single product of a constant and primitive irreducible factors (each possibly to a positive power)
  let factorisedCompletely = false;
  if (addTerms(tree).length === 1) {
    factorisedCompletely = true;
    for (const f of flat(top, "*")) {
      let base: N = f, k = 1; if (f.t === "pow" && noX(f.e)) { base = f.a; k = constInt(f.e) ?? 0; }
      if (k < 1) { factorisedCompletely = false; break; }
      if (noX(base)) continue;
      if (!frFree(base) || (base.t === "bin" && base.op === "*")) { factorisedCompletely = false; break; }
      const q = build(base, []), poly = pscale(q.n, q.d[0].inv());
      if (poly.length < 2 || !isPrimitiveInt(poly) || !irreducible(poly)) { factorisedCompletely = false; break; }
    }
  }
  // powers combined: no repeated base within any product, no power of a power or of a product/quotient
  let powersCombined = true;
  const key = (n: N): string => (n.t === "pow" ? key(n.a) : n.t === "x" ? "x" : JSON.stringify(n, (_k, v) => (typeof v === "bigint" ? v.toString() : v instanceof Rational ? v.toString() : v)));
  const chk = (n: N): void => {
    if (n.t === "bin" && n.op === "*") { const fs = flat(n, "*").filter((f) => hasX(f)); const ks = fs.map(key); if (new Set(ks).size !== ks.length) powersCombined = false; fs.forEach(chk); return; }
    if (n.t === "pow") { if (n.a.t === "pow" || (n.a.t === "bin" && (n.a.op === "*" || n.a.op === "/")) || (n.a.t === "neg")) powersCombined = false; chk(n.a); return; }
    if (n.t === "bin") { chk(n.a); chk(n.b); } else if (n.t === "neg") chk(n.a);
  };
  chk(tree);
  return { expandedShape, collected, factorisedCompletely, lowestTerms, powersCombined, rational: conds.length > 0 };
}
