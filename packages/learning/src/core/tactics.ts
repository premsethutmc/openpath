// Shared exact tactics (moved unchanged from the K05.1 planner): term algebra, simplification, bracket removal, denominators.
// These are the reusable building blocks of the core rules; nothing here searches or decides what to do next.
import { Rational, Expr, evaluate, type MathExpr } from "../math-kernel.ts";
import { printExpr } from "../reasoner/expr-text.ts";
import { hasX as hasVar } from "../reasoner/domain/domain-state.ts";

export interface Eq { left: MathExpr; right: MathExpr }
const ZERO = Rational.zero;
export { hasVar };
export const eqText = (q: Eq) => `${printExpr(q.left)}=${printExpr(q.right)}`;
export const isNum = (e: MathExpr): e is Extract<MathExpr, { kind: "num" }> => e.kind === "num";
export const num = (r: Rational) => Expr.num(r);

/** Coefficient k if e is a product/quotient of numbers with exactly one x (k*x form). */
export function linCoef(e: MathExpr): Rational | null {
  switch (e.kind) {
    case "var": return Rational.one;
    case "neg": { const k = linCoef(e.operand); return k && k.neg(); }
    case "mul": {
      if (!hasVar(e.left) && !hasVar(e.right)) return null;
      if (!hasVar(e.left)) { const k = linCoef(e.right); const c = tryEval(e.left); return k && c && k.mul(c); }
      if (!hasVar(e.right)) { const k = linCoef(e.left); const c = tryEval(e.right); return k && c && k.mul(c); }
      return null;
    }
    case "div": {
      if (hasVar(e.right)) return null;
      const k = linCoef(e.left); const d = tryEval(e.right);
      return k && d && !d.isZero() ? k.div(d) : null;
    }
    default: return null;
  }
}
export function tryEval(e: MathExpr): Rational | null {
  if (hasVar(e)) return null;
  try { return evaluate(e); } catch { return null; }
}
export const canonLin = (k: Rational): MathExpr =>
  k.isZero() ? num(ZERO) : k.isOne() ? Expr.var("x") : Expr.mul(num(k), Expr.var("x"));

/** Flatten a +/- chain into signed terms. */
export function terms(e: MathExpr, sign = 1, out: { sign: number; t: MathExpr }[] = []): { sign: number; t: MathExpr }[] {
  if (e.kind === "add") { terms(e.left, sign, out); terms(e.right, sign, out); }
  else if (e.kind === "sub") { terms(e.left, sign, out); terms(e.right, -sign, out); }
  else out.push({ sign, t: e });
  return out;
}
export function rebuild(ts: { sign: number; t: MathExpr }[]): MathExpr {
  if (ts.length === 0) return num(ZERO);
  let acc: MathExpr = ts[0].sign > 0 ? ts[0].t : Expr.neg(ts[0].t);
  for (let i = 1; i < ts.length; i++) acc = ts[i].sign > 0 ? Expr.add(acc, ts[i].t) : Expr.sub(acc, ts[i].t);
  return acc;
}

/** Simplify: fold constants, canonicalise k*x terms, combine like terms. Returns [expr, notes]. */
export function simplify(e: MathExpr, notes: Set<string>): MathExpr {
  const c = tryEval(e);
  if (c && e.kind !== "num") { notes.add("evaluate numbers"); return num(c); }
  switch (e.kind) {
    case "add": case "sub": {
      const ts = terms(e).map(({ sign, t }) => ({ sign, t: simplify(t, notes) }));
      const lins = ts.filter((x) => linCoef(x.t) !== null);
      const consts = ts.filter((x) => isNum(x.t));
      const others = ts.filter((x) => linCoef(x.t) === null && !isNum(x.t));
      let kSum = ZERO; for (const l of lins) kSum = kSum.add(linCoef(l.t)!.mul(new Rational(l.sign)));
      let cSum = ZERO; for (const q of consts) cSum = cSum.add((q.t as { value: Rational }).value.mul(new Rational(q.sign)));
      if (lins.length > 1 || consts.length > 1) notes.add("combine like terms");
      const out: { sign: number; t: MathExpr }[] = [];
      if (lins.length) { if (!kSum.isZero()) out.push({ sign: kSum.lt(ZERO) ? -1 : 1, t: canonLin(kSum.lt(ZERO) ? kSum.neg() : kSum) }); }
      for (const o of others) out.push(o);
      if (consts.length && (!cSum.isZero() || out.length === 0)) out.push({ sign: cSum.lt(ZERO) ? -1 : 1, t: num(cSum.lt(ZERO) ? cSum.neg() : cSum) });
      if (out.length && out[0].sign < 0 && out[0].t.kind === "num") { const v = (out[0].t as { value: Rational }).value; out[0] = { sign: 1, t: num(v.neg()) }; }
      return rebuild(out);
    }
    case "mul": case "div": {
      const l = simplify(e.left, notes), r = simplify(e.right, notes);
      const n: MathExpr = e.kind === "mul" ? Expr.mul(l, r) : Expr.div(l, r);
      const k = linCoef(n);
      if (k !== null && !(n.kind === "var")) { const cl = canonLin(k); if (printExpr(cl) !== printExpr(n)) { notes.add("combine coefficient"); return cl; } }
      return n;
    }
    case "neg": {
      const o = simplify(e.operand, notes); const n = Expr.neg(o);
      const k = linCoef(n); if (k !== null) { notes.add("combine coefficient"); return canonLin(k); }
      return n;
    }
    case "pow": return Expr.pow(simplify(e.base, notes), simplify(e.exp, notes));
    default: return e;
  }
}

/** Every sub-expression position, rebuilt with a replacement. */
export function rewriteAt(e: MathExpr, f: (n: MathExpr) => { to: MathExpr; what: string }[]): { to: MathExpr; what: string }[] {
  const out = f(e).slice();
  const sub = (ch: MathExpr, wrap: (c: MathExpr) => MathExpr) => { for (const r of rewriteAt(ch, f)) out.push({ to: wrap(r.to), what: r.what }); };
  switch (e.kind) {
    case "add": case "sub": case "mul": case "div":
      sub(e.left, (c) => ({ ...e, left: c } as MathExpr)); sub(e.right, (c) => ({ ...e, right: c } as MathExpr)); break;
    case "neg": sub(e.operand, (c) => Expr.neg(c)); break;
    case "pow": sub(e.base, (c) => Expr.pow(c, e.exp)); sub(e.exp, (c) => Expr.pow(e.base, c)); break;
    default: break;
  }
  return out;
}

export const isSum = (e: MathExpr) => e.kind === "add" || e.kind === "sub";
export function distributeAt(n: MathExpr): { to: MathExpr; what: string }[] {
  const r: { to: MathExpr; what: string }[] = [];
  if (n.kind === "mul" && isSum(n.right)) { const s = n.right as { kind: "add" | "sub"; left: MathExpr; right: MathExpr }; r.push({ to: { kind: s.kind, left: Expr.mul(n.left, s.left), right: Expr.mul(n.left, s.right) } as MathExpr, what: "multiply the factor into each term of the bracket" }); }
  if (n.kind === "mul" && isSum(n.left)) { const s = n.left as { kind: "add" | "sub"; left: MathExpr; right: MathExpr }; r.push({ to: { kind: s.kind, left: Expr.mul(s.left, n.right), right: Expr.mul(s.right, n.right) } as MathExpr, what: "multiply the factor into each term of the bracket" }); }
  if (n.kind === "div" && isSum(n.left) && !hasVar(n.right)) { const s = n.left as { kind: "add" | "sub"; left: MathExpr; right: MathExpr }; r.push({ to: { kind: s.kind, left: Expr.div(s.left, n.right), right: Expr.div(s.right, n.right) } as MathExpr, what: "divide each term of the numerator by the denominator" }); }
  if (n.kind === "neg" && isSum(n.operand)) { const s = n.operand as { kind: "add" | "sub"; left: MathExpr; right: MathExpr }; r.push({ to: { kind: s.kind === "add" ? "sub" : "add", left: Expr.neg(s.left), right: s.right } as MathExpr, what: "remove the bracket by changing signs" }); }
  if (n.kind === "sub" && isSum(n.right)) { const s = n.right as { kind: "add" | "sub"; left: MathExpr; right: MathExpr }; r.push({ to: Expr.sub(Expr.sub(n.left, s.left), s.kind === "add" ? s.right : Expr.neg(s.right)) , what: "remove the bracket after a minus by changing signs" }); }
  return r;
}

export function denominators(e: MathExpr, acc: Rational[] = []): Rational[] | null {
  if (e.kind === "div") {
    if (hasVar(e.right)) return null;
    const d = tryEval(e.right); if (d && !d.isZero()) acc.push(d.lt(ZERO) ? d.neg() : d); else return null;
    return denominators(e.left, acc);
  }
  if (e.kind === "add" || e.kind === "sub" || e.kind === "mul") { return denominators(e.left, acc) && denominators(e.right, acc); }
  if (e.kind === "neg") return denominators(e.operand, acc);
  if (e.kind === "pow") return denominators(e.base, acc);
  return acc;
}
export const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));

