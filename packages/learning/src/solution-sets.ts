/**
 * solution-sets@1: EXACT real solution sets of one-variable polynomial / rational equations and inequalities, and the
 * relation between two of them, within a declared domain. Used by the derivation authority to decide whether a line
 * follows from the line before it (validity), never to authorize a step by itself.
 *
 * Everything is exact rational arithmetic (bigint). Real roots are handled without approximation: Sturm sequences count
 * them in rational intervals, isolation refines intervals until each holds one root, and the truth of a relation at an
 * irrational root is decided by gcd membership (a polynomial vanishes at a root of a squarefree C iff the gcd has a root
 * in that root's isolating interval). The relation of two solution sets is read from a finite truth table: every
 * critical point (roots of every numerator, denominator and exclusion) and one rational sample in every open cell
 * between them. Over the reals; the domain is an interval with rational ends, minus finitely many excluded points, minus
 * the zeros of every denominator.
 *
 * Returns null (outside the surface) for anything else: several variables, non-integer or negative exponents in the
 * variable, degree above MAX_DEGREE, or coefficients beyond the size limit.
 */
import type { Tree } from "./rewrite-registry.ts";

export const SOLUTION_SETS_VERSION = "openpath-solution-sets@1" as const;
const MAX_DEGREE = 12;
const MAX_BITS = 512n;

// ------------------------------------------------------------------------------------------------ rationals
export type Q = { n: bigint; d: bigint };
const g = (a: bigint, b: bigint) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; };
export const q = (n: bigint, d = 1n): Q => { if (d === 0n) throw new Error("zero denominator"); if (d < 0n) { n = -n; d = -d; } const k = g(n, d); return { n: n / k, d: d / k }; };
const ZERO = q(0n), ONE = q(1n);
const add = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
const div = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
const sgn = (a: Q) => (a.n > 0n ? 1 : a.n < 0n ? -1 : 0);
const cmp = (a: Q, b: Q) => sgn(sub(a, b));
const isZ = (a: Q) => a.n === 0n;
export const showQ = (a: Q) => (a.d === 1n ? `${a.n}` : `${a.n}/${a.d}`);
const big = (a: Q) => { const lim = 1n << MAX_BITS; return a.n > lim || -a.n > lim || a.d > lim; };

// ------------------------------------------------------------------------------------------------ polynomials over Q (coefficients low -> high)
export type Poly = Q[];
const trim = (p: Poly): Poly => { const a = [...p]; while (a.length > 1 && isZ(a[a.length - 1])) a.pop(); return a.length ? a : [ZERO]; };
const deg = (p: Poly) => { const t = trim(p); return t.length === 1 && isZ(t[0]) ? -1 : t.length - 1; };
const lead = (p: Poly) => trim(p)[trim(p).length - 1];
const padd = (a: Poly, b: Poly) => trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => add(a[i] ?? ZERO, b[i] ?? ZERO)));
const psub = (a: Poly, b: Poly) => trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => sub(a[i] ?? ZERO, b[i] ?? ZERO)));
const pmul = (a: Poly, b: Poly): Poly => { const z: Q[] = Array.from({ length: a.length + b.length - 1 }, () => ZERO); for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) z[i + j] = add(z[i + j], mul(a[i], b[j])); return trim(z); };
const pscale = (a: Poly, k: Q) => trim(a.map((x) => mul(x, k)));
function pdivmod(a: Poly, b: Poly): [Poly, Poly] {
  const db = deg(b); if (db < 0) throw new Error("division by the zero polynomial");
  let r = trim(a); const out: Q[] = Array.from({ length: Math.max(1, deg(a) - db + 1) }, () => ZERO); const lb = lead(b);
  while (deg(r) >= db) { const k = deg(r) - db, c = div(lead(r), lb); out[k] = c; r = psub(r, [...Array.from({ length: k }, () => ZERO), ...trim(b).map((x) => mul(x, c))]); }
  return [trim(out), r];
}
const monic = (p: Poly) => (deg(p) < 0 ? p : pscale(p, div(ONE, lead(p))));
export function pgcd(a: Poly, b: Poly): Poly { let x = trim(a), y = trim(b); while (deg(y) >= 0) { const [, r] = pdivmod(x, y); x = y; y = r; } return deg(x) < 0 ? [ZERO] : monic(x); }
const deriv = (p: Poly): Poly => trim(p.slice(1).map((c, i) => mul(c, q(BigInt(i + 1)))));
/** the squarefree part (same roots, each once); the zero polynomial stays zero */
export function squarefree(p: Poly): Poly { if (deg(p) <= 0) return trim(p); return monic(pdivmod(p, pgcd(p, deriv(p)))[0]); }
export function evalP(p: Poly, x: Q): Q { let acc = ZERO; for (let i = p.length - 1; i >= 0; i--) acc = add(mul(acc, x), p[i]); return acc; }
const isZeroPoly = (p: Poly) => deg(p) < 0;

// ------------------------------------------------------------------------------------------------ Sturm sequences, counting and isolation
const sturm = (p: Poly): Poly[] => { const s = [trim(p), deriv(p)]; while (deg(s[s.length - 1]) > 0) { const [, r] = pdivmod(s[s.length - 2], s[s.length - 1]); if (deg(r) < 0) break; s.push(pscale(r, q(-1n))); } return s; };
const signAt = (p: Poly, x: Q | "-inf" | "+inf") => (x === "+inf" ? sgn(lead(p)) : x === "-inf" ? (deg(p) % 2 === 0 ? sgn(lead(p)) : -sgn(lead(p))) : sgn(evalP(p, x)));
const variations = (s: Poly[], x: Q | "-inf" | "+inf") => { let v = 0, last = 0; for (const p of s) { const z = signAt(p, x); if (z === 0) continue; if (last && z !== last) v++; last = z; } return v; };
type End = Q | "-inf" | "+inf";
/** number of distinct real roots of a squarefree p in (a, b] */
function countRoots(p: Poly, a: End, b: End): number { if (deg(p) <= 0) return 0; const s = sturm(p); return variations(s, a) - variations(s, b); }
/** a rational bound with every real root of p strictly inside (-B, B) (Cauchy) */
function cauchy(p: Poly): Q { const l = lead(p); let m = ZERO; for (const c of trim(p).slice(0, -1)) { const t = div(c, l); const a = t.n < 0n ? q(-t.n, t.d) : t; if (cmp(a, m) > 0) m = a; } return add(m, q(2n)); }
/** isolating intervals (a, b] with rational ends, one root each, sorted, pairwise disjoint (b_i < a_{i+1}) */
function isolate(p: Poly): { a: Q; b: Q }[] {
  if (deg(p) <= 0) return [];
  const B = cauchy(p); const out: { a: Q; b: Q }[] = [];
  const go = (a: Q, b: Q, depth: number) => { const n = countRoots(p, a, b); if (n === 0) return; if (n === 1) { out.push({ a, b }); return; } if (depth > 400) throw new Error("isolation did not converge"); const m = q(a.n * b.d + b.n * a.d, 2n * a.d * b.d); go(a, m, depth + 1); go(m, b, depth + 1); };
  go(q(-B.n, B.d), B, 0);
  return out.sort((x, y) => cmp(x.a, y.a));
}
/** the sign of polynomial f at the unique root of squarefree C in (a, b] (f's own roots among C's, or none in (a, b]) */
function signAtRoot(f: Poly, C: Poly, iv: { a: Q; b: Q }): number {
  if (isZeroPoly(f)) return 0;
  const G = pgcd(f, C); if (deg(G) > 0 && countRoots(squarefree(G), iv.a, iv.b) === 1) return 0;
  // f has no root in (a, b] other than possibly ones not in C: refine until it has none, then read the sign at b
  let { a, b } = iv; for (let k = 0; k < 400 && countRoots(squarefree(f), a, b) > 0; k++) { const m = q(a.n * b.d + b.n * a.d, 2n * a.d * b.d); if (countRoots(C, a, m) === 1) b = m; else a = m; }
  return signAt(f, b);
}

// ------------------------------------------------------------------------------------------------ expressions -> rational functions in one variable
export type RatFn = { num: Poly; den: Poly };
/** a tree as a rational function in `v`, plus every denominator polynomial that must be nonzero for it to be defined */
export function ratOf(t: Tree, v: string): { f: RatFn; dens: Poly[] } | null {
  const dens: Poly[] = [];
  const go = (x: Tree): RatFn | null => {
    if (x.k === "n") { const r = q((x.v as any).n, (x.v as any).d); return { num: [r], den: [ONE] }; }
    if (x.k === "v") return x.name === v ? { num: [ZERO, ONE], den: [ONE] } : null;
    const a = go(x.l); if (!a) return null;
    if (x.op === "^") { if (x.r.k !== "n") return null; const e = (x.r.v as any); if (e.d !== 1n || e.n < 0n || e.n > BigInt(MAX_DEGREE)) return null; let r: RatFn = { num: [ONE], den: [ONE] }; for (let i = 0n; i < e.n; i++) r = { num: pmul(r.num, a.num), den: pmul(r.den, a.den) }; return r; }
    const b = go(x.r); if (!b) return null;
    if (x.op === "+") return { num: padd(pmul(a.num, b.den), pmul(b.num, a.den)), den: pmul(a.den, b.den) };
    if (x.op === "-") return { num: psub(pmul(a.num, b.den), pmul(b.num, a.den)), den: pmul(a.den, b.den) };
    if (x.op === "*") return { num: pmul(a.num, b.num), den: pmul(a.den, b.den) };
    if (isZeroPoly(b.num)) return null;                                    // division by the literal zero
    if (deg(b.num) > 0) dens.push(b.num);
    return { num: pmul(a.num, b.den), den: pmul(a.den, b.num) };
  };
  const f = go(t); if (!f) return null;
  const all = [f.num, f.den, ...dens]; if (all.some((p) => deg(p) > MAX_DEGREE || p.some(big))) return null;
  return { f, dens };
}
/** the single variable of some trees ("" when there is none; null when several) */
export function variableOf(ts: Tree[]): string | null { const s = new Set<string>(); const w = (t: Tree): void => { if (t.k === "v") s.add(t.name); else if (t.k === "b") { w(t.l); w(t.r); } }; ts.forEach(w); return s.size > 1 ? null : [...s][0] ?? ""; }

// ------------------------------------------------------------------------------------------------ statements, domains and their solution sets
export type Rel = "=" | "<" | ">" | "<=" | ">=";
export interface Statement { left: Tree; rel: Rel; right: Tree }
export interface Domain { v: string; lower: { at: Q; strict: boolean } | null; upper: { at: Q; strict: boolean } | null; excluded: Q[]; nonzero: Poly[] }
export const fullDomain = (v: string): Domain => ({ v, lower: null, upper: null, excluded: [], nonzero: [] });
interface Prepared { f: RatFn; rel: Rel; dens: Poly[] }
function prepare(s: Statement, v: string): Prepared | null {
  const L = ratOf(s.left, v), R = ratOf(s.right, v); if (!L || !R) return null;
  const f: RatFn = { num: psub(pmul(L.f.num, R.f.den), pmul(R.f.num, L.f.den)), den: pmul(L.f.den, R.f.den) };
  return { f, rel: s.rel, dens: [...L.dens, ...R.dens, L.f.den, R.f.den].filter((p) => deg(p) > 0) };
}
const truth = (rel: Rel, s: number) => (rel === "=" ? s === 0 : rel === "<" ? s < 0 : rel === ">" ? s > 0 : rel === "<=" ? s <= 0 : s >= 0);

/** One point of the finite truth table: an exact rational, or the root of C isolated in (a, b] */
type Pt = { kind: "q"; x: Q } | { kind: "root"; iv: { a: Q; b: Q } };
export type Witness = { kind: "exact"; value: string } | { kind: "between"; low: string; high: string };
const witness = (p: Pt): Witness => (p.kind === "q" ? { kind: "exact", value: showQ(p.x) } : { kind: "between", low: showQ(p.iv.a), high: showQ(p.iv.b) });

export type Relation = "equivalent" | "implies" | "implied-by" | "neither";
export interface Comparison {
  version: typeof SOLUTION_SETS_VERSION;
  relation: Relation;
  /** a domain point where the earlier statement holds and the later one does not (a lost solution) */
  lost: Witness | null;
  /** a domain point where the later statement holds and the earlier one does not (a gained / extraneous solution) */
  gained: Witness | null;
}

/**
 * The relation between the solution sets of `a` and `b` (as sets of reals in the domain where BOTH are defined and the
 * domain's own conditions hold). Points where either statement is undefined are outside the comparison: the domain of
 * the derivation is the task's, carried in `dom.nonzero` / `dom.excluded`, plus the denominators of both statements.
 */
export function compareStatements(a: Statement, b: Statement, dom: Domain): Comparison | null {
  const A = prepare(a, dom.v), B = prepare(b, dom.v); if (!A || !B) return null;
  const crit = [A.f.num, A.f.den, B.f.num, B.f.den, ...A.dens, ...B.dens, ...dom.nonzero].filter((p) => !isZeroPoly(p) && deg(p) > 0);
  let C: Poly = [ONE]; for (const p of crit) C = pmul(C, squarefree(p)); C = squarefree(C);
  if (deg(C) > MAX_DEGREE * 4 || C.some(big)) return null;
  const roots = isolate(C);
  const pts: Pt[] = [];
  const bounds: Q[] = [...(dom.lower ? [dom.lower.at] : []), ...(dom.upper ? [dom.upper.at] : []), ...dom.excluded];
  // rational samples: one in every cell between consecutive roots, below the first and above the last, and the domain's own end / excluded points
  const ends: Q[] = []; for (const r of roots) ends.push(r.a, r.b);
  const lo = roots.length ? sub(roots[0].a, ONE) : q(-1n), hi = roots.length ? add(roots[roots.length - 1].b, ONE) : ONE;
  const samples: Q[] = [lo, hi]; for (let i = 0; i + 1 < roots.length; i++) samples.push(q(roots[i].b.n * roots[i + 1].a.d + roots[i + 1].a.n * roots[i].b.d, 2n * roots[i].b.d * roots[i + 1].a.d));
  if (!roots.length) samples.push(ZERO);
  for (const x of [...samples, ...bounds]) pts.push({ kind: "q", x });
  for (const r of roots) pts.push({ kind: "root", iv: r });
  // the bounds may cut a cell: also sample just inside each bound (the midpoint between the bound and its nearest critical point)
  for (const x of bounds) { const near = [...ends, ...bounds].filter((y) => cmp(y, x) !== 0); const above = near.filter((y) => cmp(y, x) > 0).sort(cmp)[0] ?? add(x, ONE), below = near.filter((y) => cmp(y, x) < 0).sort(cmp).reverse()[0] ?? sub(x, ONE); pts.push({ kind: "q", x: q(x.n * above.d + above.n * x.d, 2n * x.d * above.d) }, { kind: "q", x: q(x.n * below.d + below.n * x.d, 2n * x.d * below.d) }); }
  const inDomainQ = (x: Q) => (!dom.lower || (dom.lower.strict ? cmp(x, dom.lower.at) > 0 : cmp(x, dom.lower.at) >= 0)) && (!dom.upper || (dom.upper.strict ? cmp(x, dom.upper.at) < 0 : cmp(x, dom.upper.at) <= 0)) && !dom.excluded.some((e) => cmp(e, x) === 0);
  const zeroAt = (d: Poly, p: Pt) => (p.kind === "q" ? isZ(evalP(d, p.x)) : signAtRoot(d, C, p.iv) === 0);
  const evalAt = (P: Prepared, p: Pt): boolean | null => {           // null: this statement is undefined at the point
    for (const d of [...P.dens, P.f.den]) if (zeroAt(d, p)) return null;
    return p.kind === "q" ? truth(P.rel, sgn(evalP(P.f.num, p.x)) * sgn(evalP(P.f.den, p.x))) : truth(P.rel, signAtRoot(P.f.num, C, p.iv) * signAtRoot(P.f.den, C, p.iv));
  };
  // a rational root is an exact point; an irrational root's interval is refined until no (rational) bound lies in it,
  // so the whole interval, and the root, is on one side of every bound
  const exactOrRefined = (iv: { a: Q; b: Q }): Pt => {
    const r = rationalRootIn(C, iv); if (r) return { kind: "q", x: r };
    let { a, b } = iv;
    for (let k = 0; k < 400 && bounds.some((x) => cmp(x, a) >= 0 && cmp(x, b) <= 0); k++) { const m = q(a.n * b.d + b.n * a.d, 2n * a.d * b.d); if (countRoots(C, a, m) === 1) b = m; else a = m; }
    return { kind: "root", iv: { a, b } };
  };
  let lost: Witness | null = null, gained: Witness | null = null;
  for (const p0 of pts) {
    const p: Pt = p0.kind === "root" ? exactOrRefined(p0.iv) : p0;
    if (p.kind === "q" && !inDomainQ(p.x)) continue;
    if (p.kind === "root" && !inDomainQ(p.iv.b)) continue;
    if (dom.nonzero.some((d) => zeroAt(d, p))) continue;                                 // outside the task's domain
    // the earlier statement undefined: outside the comparison; the later statement undefined where the earlier one holds: that solution is lost
    const ta = evalAt(A, p); if (ta === null) continue; const tb = evalAt(B, p) ?? false;
    // an irrational witness is reported by an isolating interval narrowed to width at most 1/100 (exact, still one root)
    const shown = (x: Pt): Pt => { if (x.kind !== "root") return x; let { a, b } = x.iv; for (let k = 0; k < 200 && cmp(sub(b, a), q(1n, 100n)) > 0; k++) { const m = q(a.n * b.d + b.n * a.d, 2n * a.d * b.d); if (countRoots(C, a, m) === 1) b = m; else a = m; } return { kind: "root", iv: { a, b } }; };
    if (ta && !tb && !lost) lost = witness(shown(p));
    if (!ta && tb && !gained) gained = witness(shown(p));
  }
  const relation: Relation = !lost && !gained ? "equivalent" : !lost ? "implies" : !gained ? "implied-by" : "neither";
  return { version: SOLUTION_SETS_VERSION, relation, lost, gained };
}
/** the rational root of squarefree C inside (a, b], if that root is rational */
function rationalRootIn(C: Poly, iv: { a: Q; b: Q }): Q | null {
  for (const r of rationalRoots(C)) if (cmp(r, iv.a) > 0 && cmp(r, iv.b) <= 0) return r;
  return null;
}
/** every rational root of p (rational root theorem on the integer-scaled polynomial) */
export function rationalRoots(p: Poly): Q[] {
  const t = trim(p); if (deg(t) <= 0) return [];
  let L = 1n; for (const c of t) L = (L * c.d) / g(L, c.d);
  const ints = t.map((c) => (c.n * L) / c.d); const out: Q[] = [];
  let k = 0; while (k < ints.length - 1 && ints[k] === 0n) k++; if (k > 0) out.push(ZERO);
  const lo = ints[k], hi = ints[ints.length - 1]; const divs = (n: bigint) => { n = n < 0n ? -n : n; const o: bigint[] = []; if (n > 10n ** 12n) return o; for (let d = 1n; d * d <= n; d++) if (n % d === 0n) { o.push(d); if (d * d !== n) o.push(n / d); } return o; };
  for (const a of divs(lo)) for (const b of divs(hi)) for (const s of [1n, -1n]) { const r = q(s * a, b); if (isZ(evalP(t, r)) && !out.some((x) => cmp(x, r) === 0)) out.push(r); }
  return out.sort(cmp);
}
/** the finite real solution set of an equation, when it is finite and every solution is rational (else null) */
export function rationalSolutionSet(s: Statement, dom: Domain): Q[] | null {
  const P = prepare(s, dom.v); if (!P || P.rel !== "=" || isZeroPoly(P.f.num)) return null;
  const sq = squarefree(P.f.num); const rr = rationalRoots(sq); if (countRoots(sq, "-inf", "+inf") !== rr.length) return null;
  const ok = (x: Q) => [...P.dens, P.f.den, ...dom.nonzero].every((d) => !isZ(evalP(d, x))) && (!dom.lower || (dom.lower.strict ? cmp(x, dom.lower.at) > 0 : cmp(x, dom.lower.at) >= 0)) && (!dom.upper || (dom.upper.strict ? cmp(x, dom.upper.at) < 0 : cmp(x, dom.upper.at) <= 0)) && !dom.excluded.some((e) => cmp(e, x) === 0);
  return rr.filter(ok);
}
/** is the polynomial p (in v) nonzero at every point of the domain? (exact: no real root inside it) */
export function provablyNonzero(t: Tree, dom: Domain): boolean {
  const r = ratOf(t, dom.v); if (!r || r.dens.length || deg(r.f.den) > 0) return false;
  const p = r.f.num; if (isZeroPoly(p)) return false; if (deg(p) === 0) return true;
  const zero: Statement = { left: t, rel: "=", right: { k: "n", v: { n: 0n, d: 1n } as any } };
  const set = compareStatements(zero, { left: { k: "n", v: { n: 0n, d: 1n } as any }, rel: "=", right: { k: "n", v: { n: 1n, d: 1n } as any } }, dom);
  return !!set && set.relation !== "neither" && !set.lost;                       // t = 0 has no solution in the domain: nothing is lost going to the false statement 0 = 1
}
/** the sign of t on the whole domain: 1 (positive everywhere), -1, or 0 (unknown / changes / vanishes) */
export function provableSign(t: Tree, dom: Domain): 1 | -1 | 0 {
  if (!provablyNonzero(t, dom)) return 0;
  const zero: Tree = { k: "n", v: { n: 0n, d: 1n } as any };
  const pos = compareStatements({ left: t, rel: ">", right: zero }, { left: zero, rel: "=", right: zero }, dom);   // t > 0 everywhere iff (t > 0) is equivalent to the always-true 0 = 0
  if (pos && pos.relation === "equivalent") return 1;
  const neg = compareStatements({ left: t, rel: "<", right: zero }, { left: zero, rel: "=", right: zero }, dom);
  return neg && neg.relation === "equivalent" ? -1 : 0;
}
/**
 * approximate@1: every claimed value is a decimal rounding (to its own number of decimal places) of a DISTINCT real root
 * of the equation, none of them exact, and together they account for every real root. Rounding is a marking-policy
 * matter (whether an approximation is acceptable), not a mathematical error, so such a claim is neither certified nor
 * refuted. Exact: each rounding interval is checked with a Sturm count.
 */
export function approximatesAllRoots(s: Statement, dom: Domain, claimed: Q[]): boolean {
  const P = prepare(s, dom.v); if (!P || P.rel !== "=" || isZeroPoly(P.f.num) || !claimed.length) return false;
  const sq = squarefree(P.f.num); if (deg(sq) <= 0) return false;
  const total = countRoots(sq, "-inf", "+inf");
  const ivs: { a: Q; b: Q }[] = [];
  for (const c of claimed) {
    let k = 0n, d = c.d; while (d % 10n === 0n) { d /= 10n; k++; } if (d !== 1n || k === 0n) return false;     // a terminating decimal with at least one place
    if (isZ(evalP(sq, c))) return false;                                                                        // exact, not an approximation
    const h = q(5n, 10n ** (k + 1n)); const iv = { a: sub(c, h), b: add(c, h) };
    if (countRoots(sq, iv.a, iv.b) !== 1) return false;
    if (ivs.some((o) => cmp(o.a, iv.b) < 0 && cmp(iv.a, o.b) < 0)) return false;                               // two claims rounding the same root
    ivs.push(iv);
  }
  return total === claimed.length;
}
/** exact identity of two expressions as rational functions of v (null outside the surface) */
export function sameRational(a: Tree, b: Tree, v: string): boolean | null {
  const A = ratOf(a, v), B = ratOf(b, v); if (!A || !B) return null;
  return isZeroPoly(psub(pmul(A.f.num, B.f.den), pmul(B.f.num, A.f.den)));
}
