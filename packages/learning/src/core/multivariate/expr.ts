// Multivariate / symbolic-parameter expressions: MathExpr (from the existing parser, `parseExpr(text, true)`) → exact rational function over Q.
// Symbolic exponents are handled by GENERATORS: x^(n+1) = x · [x^n]; [x^n], [x^m] are independent symbols, [x^n]·[x^m] = [x^(n+m)] by construction,
// (x^n)^m = [x^(n·m)], (xy)^n = [x^n][y^n], 2^n = [2^n]. Identity in this ring implies equality as functions for positive bases / integer exponents (reported as an
// assumption). Non-identity is only ever claimed from an EXACT witness point; if neither is available the answer is "undecided", never a guess.
import { Rational, Expr, type MathExpr } from "../../math-kernel.ts";
import { Refusal } from "../../reasoner/outcomes.ts";
import { parseExpr } from "../../reasoner/expr-text.ts";
import { Poly, gcd, divExact, radical, extra, normalise, noRealZero, squarefreeDecomposition, type Mon } from "./poly.ts";

export interface RF { n: Poly; d: Poly }
export interface Built { rf: RF; conds: Poly[]; gens: Map<string, { base: Poly; mu: Mon }>; expSyms: Set<string>; vars: Set<string> }
const ONE = Rational.one;
const fail = (m: string): never => { throw new Refusal("UNSUPPORTED_EXPRESSION", m); };
const FUNCS = /\b(?:sin|cos|tan|log|ln|exp|sqrt|abs|min|max|floor|ceil)\b/i;
/** how people write algebra → the explicit text the parser reads: glyphs, implicit multiplication (2x, xy, a(b+c), (a+b)(a−b)) */
export function mvNormalise(raw: string): string {
  if (FUNCS.test(raw)) fail("functions are not supported");
  let s = raw.trim().replace(/[−–—‐‑‒﹣－]/g, "-").replace(/[×·⋅∙∗⨯]/g, "*").replace(/[÷∕⁄]/g, "/").replace(/²/g, "^2").replace(/³/g, "^3").replace(/\s+/g, "");
  if (/[a-zA-Z]\d/.test(s)) fail("a letter followed by a digit is ambiguous");
  s = s.replace(/(\d|[a-zA-Z]|\))(?=[a-zA-Z(])/g, "$1*").replace(/\)(?=\d)/g, ")*");
  return s;
}
export const parseMv = (text: string): MathExpr => parseExpr(mvNormalise(text), true);

const isFn = (r: RF) => r.d.isConst();
const rfC = (c: Rational): RF => ({ n: Poly.const(c), d: Poly.one() });
function primeFactors(n: bigint): Map<bigint, number> | null { const m = new Map<bigint, number>(); let k = n < 0n ? -n : n; for (let p = 2n; p * p <= k && p < 1000000n; p++) while (k % p === 0n) { m.set(p, (m.get(p) ?? 0) + 1); k /= p; } if (k > 1n) { if (k > 1000000000000n) return null; m.set(k, (m.get(k) ?? 0) + 1); } return m; }
const monStr = (m: Mon) => Object.keys(m).sort().map((v) => (m[v] === 1 ? v : `${v}^${m[v]}`)).join("*") || "1";
function monomials(p: Poly): { a: bigint; mu: Mon }[] { const out: { a: bigint; mu: Mon }[] = []; for (const e of p.t.values()) { if (e.c.denBig !== 1n) fail("exponent coefficients must be integers"); out.push({ a: e.c.numBig, mu: e.m }); } return out; }
const mulMon = (a: Mon, b: Mon): Mon => { const m: Mon = { ...a }; for (const v of Object.keys(b)) m[v] = (m[v] ?? 0) + b[v]; return m; };

export function build(e: MathExpr): Built {
  const conds: Poly[] = []; const gens = new Map<string, { base: Poly; mu: Mon }>(); const expSyms = new Set<string>(); const vars = new Set<string>();
  /** a condition "p ≠ 0"; a monomial in generators reads as the conditions on their bases ([x^m] ≠ 0 means x ≠ 0) */
  const need = (p: Poly) => {
    if (p.isConst()) return;
    // peel the monomial common to every term (variables and generators): a generator [B^e] ≠ 0 reads as B ≠ 0; what is left is a condition in itself
    let M: Record<string, number> | null = null; for (const t of p.t.values()) { if (!M) M = { ...t.m }; else for (const v of Object.keys(M)) M[v] = Math.min(M[v], t.m[v] ?? 0); }
    for (const v of Object.keys(M ?? {})) if (M![v] > 0) conds.push(v.startsWith("[") ? gens.get(v)!.base : Poly.v(v));
    const q = new Poly(); for (const t of p.t.values()) { const m: Mon = { ...t.m }; for (const v of Object.keys(M ?? {})) { m[v] = (m[v] ?? 0) - M![v]; if (m[v] === 0) delete m[v]; } const one = new Poly(); one.t.set(Object.keys(m).sort().map((v) => `${v}^${m[v]}`).join("*"), { c: t.c, m }); q.t.set([...one.t.keys()][0], [...one.t.values()][0]); }
    if (!q.isConst()) conds.push(q);
  };
  const inv = (r: RF): RF => { need(r.n); if (r.n.isZero()) fail("division by zero"); return { n: r.d, d: r.n }; };
  const mul = (a: RF, b: RF): RF => ({ n: a.n.mul(b.n), d: a.d.mul(b.d) });
  const add = (a: RF, b: RF): RF => ({ n: a.n.mul(b.d).add(b.n.mul(a.d)), d: a.d.mul(b.d) });
  const hasVar = (e: any): boolean => e && typeof e === "object" && (e.kind === "var" || Object.values(e).some((c) => c && typeof c === "object" && hasVar(c)));
  const ipow = (r: RF, k: number): RF => { if (Math.abs(k) > 200) fail("exponent too large"); return k >= 0 ? { n: r.n.pow(k), d: r.d.pow(k) } : (() => { const q = inv(r); return { n: q.n.pow(-k), d: q.d.pow(-k) }; })(); };
  const gen = (base: Poly, mu: Mon, a: bigint): RF => {                      // [base^mu]^a
    const name = `[${base.toString()}^${monStr(mu)}]`; gens.set(name, { base, mu }); const g: RF = { n: Poly.v(name), d: Poly.one() };
    if (a === 0n) return rfC(ONE); const k = Number(a); if (Math.abs(k) > 200) fail("exponent too large");
    if (k < 0 && !base.isConst()) conds.push(base); return k > 0 ? ipow(g, k) : { n: Poly.one(), d: Poly.v(name).pow(-k) };
  };
  /** N^(a·mu) for a polynomial N, mu a monomial of exponent symbols */
  function polyPowSym(N: Poly, a: bigint, mu: Mon): RF {
    if (N.isZero()) fail("0 to a symbolic power");
    let out = rfC(ONE); const factors: [Poly, number][] = [];
    // monomial part
    const mons = [...N.t.values()]; let M: Mon | null = null; for (const t of mons) { if (!M) M = { ...t.m }; else for (const v of Object.keys(M)) M[v] = Math.min(M[v], t.m[v] ?? 0); }
    const rest = divExact(N, (() => { const q = new Poly(); q.t.set(Object.keys(M ?? {}).sort().map((v) => `${v}^${M![v]}`).join("*"), { c: ONE, m: M ?? {} }); return q; })())!;
    const R = normalise(rest); const c = rest.isConst() ? rest.constVal() : divExact(rest, R) ? divExact(rest, R)!.constVal() : ONE;
    for (const v of Object.keys(M ?? {})) if (M![v] > 0) factors.push([Poly.v(v), M![v]]);
    if (!R.isConst()) for (const [F, k] of squarefreeDecomposition(R)) factors.push([F, k]);   // (a²+2ab+b²)^E = [(a+b)^E]²
    for (const [B, k] of factors) {
      const nm = B.t.size === 1 && B.t.values().next().value!.c.isOne() && Object.keys(B.t.values().next().value!.m).length === 1 && B.t.values().next().value!.m[B.vars()[0]] === 1 ? B.vars()[0] : null;
      const g0 = nm && nm.startsWith("[") ? { base: parseGenBase(nm, gens), mu: gens.get(nm)!.mu } : null;
      out = mul(out, g0 ? gen(g0.base, mulMon(g0.mu, mu), a * BigInt(k)) : gen(B, mu, a * BigInt(k)));
    }
    if (!c.eq(ONE)) {
      const sign = c.lt(Rational.zero) ? -1n : 1n; if (sign < 0n) out = mul(out, gen(Poly.const(new Rational(-1)), mu, a));
      const pn = primeFactors(c.numBig), pd = primeFactors(c.denBig); if (!pn || !pd) fail("constant too large for a symbolic power");
      for (const [p, e] of pn) out = mul(out, gen(Poly.const(new Rational(p)), mu, a * BigInt(e)));
      for (const [p, e] of pd) out = mul(out, gen(Poly.const(new Rational(p)), mu, -a * BigInt(e)));
    }
    return out;
  }
  const rec = (x: MathExpr): RF => {
    switch (x.kind) {
      case "num": return rfC(x.value);
      case "var": vars.add(x.name); return { n: Poly.v(x.name), d: Poly.one() };
      case "neg": { const a = rec(x.operand); return { n: a.n.neg(), d: a.d }; }
      case "add": return add(rec(x.left), rec(x.right));
      case "sub": { const b = rec(x.right); return add(rec(x.left), { n: b.n.neg(), d: b.d }); }
      case "mul": return mul(rec(x.left), rec(x.right));
      case "div": return mul(rec(x.left), inv(rec(x.right)));
      case "pow": {
        const E = rec(x.exp); const base = rec(x.base);
        if (!isFn(E)) fail("an exponent must be a polynomial (no division)");
        const EP = E.n.scale(ONE.div(E.d.constVal()));
        if (EP.isConst()) { if (hasVar(x.exp)) need(base.n); const k = EP.constVal(); if (!k.isInteger()) fail("non-integer exponent"); return ipow(base, Number(k.numBig)); }
        for (const v of EP.vars()) expSyms.add(v);
        need(base.n);                    // a power with a symbolic exponent is read as defined only for a non-zero base (the exponent's sign is unknown): the same on every line, as written
        let out = rfC(ONE);
        for (const { a, mu } of monomials(EP)) {
          if (Object.keys(mu).length === 0) { out = mul(out, ipow(base, Number(a))); continue; }
          const top = polyPowSym(base.n, a, mu); const bot = polyPowSym(base.d, a, mu);
          out = mul(out, mul(top, { n: bot.d, d: bot.n }));
        }
        return out;
      }
      default: return fail(`unsupported construct ${x.kind}`);
    }
  };
  const rf = rec(e); return { rf, conds, gens, expSyms, vars };
}
/** recover the base polynomial of a generator variable name (kept in the registry by `gen`) */
function parseGenBase(name: string, gens: Map<string, { base: Poly; mu: Mon }>): Poly { return gens.get(name)!.base; }

/** radical of the product of all conditions: the hypersurface where the written expression is undefined */
export function domainPoly(b: Built): Poly { let p = Poly.one(); for (const c of b.conds) p = p.mul(radical(c)); return radical(p); }
/** the non-vacuous part of `extra(a, b)` (a polynomial; constant when nothing real is lost) */
export function lost(a: Poly, b: Poly): Poly { const q = extra(a, b); return q.isConst() || noRealZero(q) ? Poly.one() : q; }

// ---- exact evaluation at a rational point (variables → rationals; exponent symbols → small integers)
export function evalAt(e: MathExpr, pt: Record<string, Rational>): Rational | null {
  const go = (x: MathExpr): Rational | null => {
    switch (x.kind) {
      case "num": return x.value; case "var": return pt[x.name] ?? null; case "neg": { const a = go(x.operand); return a && a.neg(); }
      case "add": { const a = go(x.left), b = go(x.right); return a && b && a.add(b); } case "sub": { const a = go(x.left), b = go(x.right); return a && b && a.sub(b); }
      case "mul": { const a = go(x.left), b = go(x.right); return a && b && a.mul(b); } case "div": { const a = go(x.left), b = go(x.right); return a && b && !b.isZero() ? a.div(b) : null; }
      case "pow": { const b = go(x.base), k = go(x.exp); if (!b || !k || !k.isInteger() || Math.abs(Number(k.numBig)) > 64) return null; let n = Number(k.numBig); if (b.isZero() && n <= 0) return null; let r = ONE; for (let i = 0; i < Math.abs(n); i++) r = r.mul(b); return n < 0 ? ONE.div(r) : r; }
      default: return null;
    }
  };
  return go(e);
}
export interface Witness { differ?: Record<string, string>; agree?: Record<string, string> }
const GRID = [0, 1, -1, 2, -2, 3, 5, 7].map((n) => new Rational(n)); const SMALL = [0, 1, 2, 3, -1].map((n) => new Rational(n));
/** search exact points where both are defined: one where they DIFFER (proves non-identity) and one where they AGREE (the equality holds only at particular values) */
export function witness(a: MathExpr, b: MathExpr, vars: string[], expSyms: Set<string>): Witness {
  const w: Witness = {}; const per = (v: string) => (expSyms.has(v) ? SMALL : GRID); let seed = 987654;
  const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const test = (pt: Record<string, Rational>) => { const x = evalAt(a, pt), y = evalAt(b, pt); if (!x || !y) return; const rec = () => Object.fromEntries(Object.entries(pt).map(([k, v]) => [k, v.toString()])); if (x.eq(y)) w.agree ??= rec(); else w.differ ??= rec(); };
  const total = vars.reduce((t, v) => t * per(v).length, 1);
  if (total <= 2000) { const idx = vars.map(() => 0); for (let c = 0; c < total; c++) { test(Object.fromEntries(vars.map((v, i) => [v, per(v)[idx[i]]]))); if (w.differ && w.agree) break; for (let i = 0; i < idx.length; i++) { if (++idx[i] < per(vars[i]).length) break; idx[i] = 0; } } }
  for (let t = 0; t < 400 && !w.differ; t++) test(Object.fromEntries(vars.map((v) => [v, expSyms.has(v) ? SMALL[rnd(5)] : new Rational(rnd(41) - 20, rnd(6) + 1)])));
  return w;
}
export interface MvRelation { relation: "identity" | "not-identity" | "undecided"; dropped: Poly; added: Poly; witness: Witness }
export function relateMv(fromText: string, toText: string): MvRelation {
  const ea = parseMv(fromText), eb = parseMv(toText); const A = build(ea), B = build(eb);
  const dA = domainPoly(A), dB = domainPoly(B); const dropped = lost(dA, dB), added = lost(dB, dA);
  const diff = A.rf.n.mul(B.rf.d).sub(B.rf.n.mul(A.rf.d));
  if (diff.isZero()) return { relation: "identity", dropped, added, witness: {} };
  const vars = [...new Set([...A.vars, ...B.vars])].sort(); const w = witness(ea, eb, vars, new Set([...A.expSyms, ...B.expSyms]));
  return { relation: w.differ ? "not-identity" : "undecided", dropped, added, witness: w };
}
export { gcd, Poly };
