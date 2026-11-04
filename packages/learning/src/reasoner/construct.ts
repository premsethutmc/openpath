// Constraint-driven construction of linear equations (E3). No question templates and no planner involved:
// we state constraints (class, target solution, structural features), sample random expression trees from a
// grammar, and SOLVE FOR the free constant so the constraints hold exactly (exact rational arithmetic).
// Anything that misses a constraint is rejected and resampled.
import { Rational, Expr, evaluate, type MathExpr } from "../math-kernel.ts";
import { printExpr } from "./expr-text.ts";

export type EqClass = "unique" | "no-solution" | "identity";
export interface Features { brackets: boolean; fraction: boolean; bothSides: boolean; decimal: boolean }
export interface Constraint { cls: EqClass; solution?: string; features: Features; maxOps: number }
export interface Built { id: string; text: string; class: EqClass; solution?: string; features: Features; constraint: Constraint; attempts: number }

export function rng(seed: number) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const X = Expr.var("x");
const Q = (n: number | string) => Expr.num(typeof n === "string" ? new Rational(BigInt(n)) : new Rational(n));
const ev = (e: MathExpr, x: Rational) => evaluate(e, new Map([["x", x]]));

interface Ctx { r: () => number; ops: number; decimal: boolean; xLeft: number }
const int = (c: Ctx, lo: number, hi: number) => lo + Math.floor(c.r() * (hi - lo + 1));

/** Random expression from the grammar. `xs` = how many x leaves this subtree must still place. */
function tree(c: Ctx, xs: number, depth: number): MathExpr {
  if (depth <= 0 || c.ops <= 0) return leaf(c, xs);
  const k = c.r();
  c.ops--;
  if (k < 0.35) { const a = int(c, 0, xs), b = xs - a; const l = tree(c, a, depth - 1), r = tree(c, b, depth - 1); return c.r() < 0.5 ? Expr.add(l, r) : Expr.sub(l, r); }
  if (k < 0.62) { const inner = tree(c, xs, depth - 1); const f = Q(int(c, 2, 9)); return c.r() < 0.5 ? Expr.mul(f, inner) : Expr.mul(inner, f); }
  if (k < 0.8) { const inner = tree(c, xs, depth - 1); return Expr.div(inner, Q(int(c, 2, 9))); }
  return leaf(c, xs);
}
function leaf(c: Ctx, xs: number): MathExpr {
  if (xs > 0) { let e: MathExpr = X; for (let i = 1; i < xs; i++) e = Expr.add(e, X); return xs === 1 && c.r() < 0.5 ? Expr.mul(Q(int(c, 2, 9)), X) : e; }
  if (c.decimal && c.r() < 0.3) return Expr.num(new Rational(int(c, 1, 19) * 5, 10));
  return Q(int(c, 1, 20));
}
function count(e: MathExpr, f: (n: MathExpr) => boolean): number {
  let n = f(e) ? 1 : 0;
  switch (e.kind) {
    case "add": case "sub": case "mul": case "div": return n + count(e.left, f) + count(e.right, f);
    case "neg": return n + count(e.operand, f);
    case "pow": return n + count(e.base, f) + count(e.exp, f);
    default: return n;
  }
}
const isSum = (e: MathExpr) => e.kind === "add" || e.kind === "sub";
export function featuresOf(l: MathExpr, r: MathExpr): Features {
  const any = (f: (n: MathExpr) => boolean) => count(l, f) + count(r, f) > 0;
  return {
    brackets: any((n) => n.kind === "mul" && (isSum(n.left) || isSum(n.right))),
    fraction: any((n) => n.kind === "div"),
    bothSides: count(l, (n) => n.kind === "var") > 0 && count(r, (n) => n.kind === "var") > 0,
    decimal: any((n) => n.kind === "num" && !n.value.isInteger()), // printed as a decimal (printExpr(..., true))
  };
}
/** Exact affine coefficients of e in x: e(x) = a*x + b (the tree is linear by construction; checked by a 3rd point). */
function affine(e: MathExpr): { a: Rational; b: Rational } | null {
  const f0 = ev(e, Rational.zero), f1 = ev(e, Rational.one), f2 = ev(e, new Rational(2));
  const a = f1.sub(f0);
  return f2.sub(f1).eq(a) ? { a, b: f0 } : null;
}
function decText(r: Rational): string | null { // terminating decimal text for a constant, else null
  let d = r.den; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5;
  if (d !== 1) return null;
  if (r.isInteger()) return r.toString();
  const neg = r.lt(Rational.zero); const a = neg ? r.neg() : r;
  let k = 0, p = 1; while ((a.num * p) % a.den !== 0) { p *= 10; k++; }
  const digits = String((a.num * p) / a.den).padStart(k + 1, "0");
  return (neg ? "-" : "") + digits.slice(0, digits.length - k) + "." + digits.slice(digits.length - k);
}
function constNode(c: Rational): MathExpr | null {
  const t = decText(c.lt(Rational.zero) ? c.neg() : c); if (t === null) return null;
  const n = t.includes(".") ? Expr.num(new Rational(BigInt(t.replace(".", "")), 10n ** BigInt(t.split(".")[1].length))) : Expr.num(c.lt(Rational.zero) ? c.neg() : c);
  return n;
}
const sizeOk = (t: string) => t.length <= 60;

export function build(id: string, con: Constraint, r: () => number): Built {
  for (let attempts = 1; attempts < 20000; attempts++) {
    const c: Ctx = { r, ops: con.maxOps, decimal: con.features.decimal, xLeft: 0 };
    const nx = con.cls === "unique" ? int(c, 1, 3) : int(c, 1, 3);
    const xl = con.features.bothSides ? int(c, 1, Math.max(1, nx - 1)) : nx;
    const xr = con.features.bothSides ? Math.max(1, nx - xl) : 0;
    const L = tree(c, xl, 3), R0 = tree(c, xr, 3);
    const fl = affine(L), fr = affine(R0); if (!fl || !fr) continue;
    let R: MathExpr = R0;
    if (con.cls !== "unique") { // equal slopes: add the missing x-term to the right side
      const need = fl.a.sub(fr.a); if (!need.isZero()) R = Expr.add(R, Expr.mul(Expr.num(need), X));
    }
    const fr2 = affine(R); if (!fr2) continue;
    const slope = fl.a.sub(fr2.a);
    let eqR: MathExpr = R;
    if (con.cls === "unique") {
      if (slope.isZero()) continue;
      const target = new Rational(BigInt(con.solution!));
      // choose the free constant c so that L(target) = R(target) + c
      const cst = ev(L, target).sub(ev(R, target));
      if (!cst.isZero()) { const n = constNode(cst); if (!n) continue; eqR = cst.lt(Rational.zero) ? Expr.sub(R, n) : Expr.add(R, n); }
    } else {
      const diff = fl.b.sub(fr2.b); // constant gap between the sides once the x-terms match
      if (con.cls === "identity") {
        if (!diff.isZero()) { const n = constNode(diff); if (!n) continue; eqR = diff.lt(Rational.zero) ? Expr.sub(R, n) : Expr.add(R, n); }
      } else if (diff.isZero()) { // no-solution needs a non-zero gap: shift the right side by a non-zero constant
        eqR = Expr.add(R, Q(int(c, 1, 9)));
      }
    }
    const a1 = affine(L), a2 = affine(eqR); if (!a1 || !a2) continue;
    const s = a1.a.sub(a2.a), k = a1.b.sub(a2.b);
    if (con.cls === "unique" && (s.isZero() || !k.neg().div(s).eq(new Rational(BigInt(con.solution!))))) continue;
    if (con.cls === "no-solution" && !(s.isZero() && !k.isZero())) continue;
    if (con.cls === "identity" && !(s.isZero() && k.isZero())) continue;
    const text = `${printExpr(L, true)}=${printExpr(eqR, true)}`;
    const feat = featuresOf(L, eqR);
    feat.fraction = text.includes("/"); feat.decimal = text.includes("."); // features are defined on the printed text
    if (feat.brackets !== con.features.brackets || feat.fraction !== con.features.fraction || feat.bothSides !== con.features.bothSides || feat.decimal !== con.features.decimal) continue;
    if (!sizeOk(text) || /x\s*[*/]\s*x/.test(text)) continue;
    return { id, text, class: con.cls, ...(con.cls === "unique" ? { solution: con.solution } : {}), features: feat, constraint: con, attempts };
  }
  throw new Error(`could not satisfy constraint ${JSON.stringify(con)}`);
}

export function constructSet(seed: number, counts: { unique: number; noSolution: number; identity: number }): Built[] {
  const r = rng(seed);
  const out: Built[] = []; const seen = new Set<string>();
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const make = (cls: EqClass, n: number, prefix: string) => {
    let i = 0, guard = 0;
    while (i < n && guard++ < n * 50) {
      const features: Features = { brackets: r() < 0.5, fraction: r() < 0.4, bothSides: r() < 0.6, decimal: r() < 0.1 };
      const con: Constraint = { cls, features, maxOps: pick([3, 4, 5, 6, 7]), ...(cls === "unique" ? { solution: String(Math.floor(r() * 61) - 30) } : {}) };
      let b: Built; try { b = build(`${prefix}${String(i).padStart(3, "0")}`, con, r); } catch { continue; }
      if (seen.has(b.text)) continue;
      seen.add(b.text); out.push(b); i++;
    }
  };
  make("unique", counts.unique, "c"); make("no-solution", counts.noSolution, "n"); make("identity", counts.identity, "i");
  return out;
}
