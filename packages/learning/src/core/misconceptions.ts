// Mal-rules: the common WRONG transformations students make, written as the same kind of object as a rule (a pattern that matches a state and
// produces a next state), but kept in a separate library the planner never sees. The student evaluator uses them only to NAME a likely cause
// of a step that the independent verifier has already proved invalid. Naming is advisory ("candidate misconception"); validity is never
// decided here.
import { Rational, Expr, type MathExpr } from "../math-kernel.ts";
import { printExpr } from "../reasoner/expr-text.ts";
import * as T from "./tactics.ts";

export interface MalRule { id: string; label: string; explanation: string; generate(q: T.Eq): { to: T.Eq; note: string }[] }
type Sum = Extract<MathExpr, { kind: "add" | "sub" }>;
const isSum = (e: MathExpr): e is Sum => e.kind === "add" || e.kind === "sub";
const sides = ["left", "right"] as const;
const withSide = (q: T.Eq, side: "left" | "right", e: MathExpr): T.Eq => (side === "left" ? { left: e, right: q.right } : { left: q.left, right: e });
const other = (s: "left" | "right") => (s === "left" ? "right" : "left");

/** All single-node rewrites inside both sides: f maps a node to wrong replacements. */
function rewrites(q: T.Eq, f: (n: MathExpr) => { to: MathExpr; note: string }[]): { to: T.Eq; note: string }[] {
  const out: { to: T.Eq; note: string }[] = [];
  for (const side of sides) for (const r of T.rewriteAt(q[side], (n) => f(n).map((x) => ({ to: x.to, what: x.note })))) out.push({ to: withSide(q, side, r.to), note: r.what });
  return out;
}

export const MALRULES: MalRule[] = [
  {
    id: "sign-error-moving-term", label: "moved a term to the other side without changing its sign",
    explanation: "Adding or subtracting the same quantity on both sides changes the sign of a term that moves across the equals sign; the sign was kept.",
    generate(q) {
      const out: { to: T.Eq; note: string }[] = [];
      for (const side of sides) { const ts = T.terms(q[side]); if (ts.length < 2) continue;
        ts.forEach((t, i) => { const rest = ts.filter((_, j) => j !== i); const moved = [...T.terms(q[other(side)]), { sign: t.sign, t: t.t }];
          const a = T.rebuild(rest), b = T.rebuild(moved); out.push({ to: side === "left" ? { left: a, right: b } : { left: b, right: a }, note: `${printExpr(t.t)} moved with its sign unchanged` }); }); }
      return out;
    },
  },
  {
    id: "one-sided-term-removal", label: "removed a term from one side only",
    explanation: "An operation must be done to both sides of an equation. A term was removed (or cancelled) from one side while the other side was left unchanged.",
    generate(q) {
      const out: { to: T.Eq; note: string }[] = [];
      for (const side of sides) { const ts = T.terms(q[side]); if (ts.length < 2) continue;
        ts.forEach((t, i) => out.push({ to: withSide(q, side, T.rebuild(ts.filter((_, j) => j !== i))), note: `${printExpr(t.t)} dropped from the ${side} side only` })); }
      return out;
    },
  },
  {
    id: "partial-division", label: "divided only some of the terms by the coefficient",
    explanation: "Dividing both sides by a number divides EVERY term of both sides; only some terms were divided.",
    generate(q) {
      // the divisor is a term's coefficient with either sign (people divide by -6, not by 6); the other side is divided completely, this side only in one term
      const out: { to: T.Eq; note: string }[] = [];
      for (const side of sides) { const ts = T.terms(q[side]); if (ts.length < 2) continue;
        ts.forEach((t, i) => { const k = T.linCoef(t.t); if (!k || k.isZero() || k.isOne()) return;
          for (const kk of [k, k.neg()]) { if (kk.isOne()) continue; const div = (e: MathExpr) => Expr.div(e, T.num(kk));
            const newSide = T.rebuild(ts.map((u, j) => (j === i ? { sign: u.sign, t: T.canonLin(T.linCoef(u.t)!.div(kk).lt(Rational.zero) ? T.linCoef(u.t)!.div(kk).neg() : T.linCoef(u.t)!.div(kk)) } : u)));
            out.push({ to: { ...withSide(q, side, newSide), [other(side)]: div(q[other(side)]) } as T.Eq, note: `only ${printExpr(t.t)} was divided by ${kk}` }); } }); }
      return out;
    },
  },
  {
    id: "unbalanced-division", label: "divided one side only by the coefficient",
    explanation: "Both sides of an equation must be divided by the same non-zero number; only one side was divided.",
    generate(q) {
      const out: { to: T.Eq; note: string }[] = [];
      for (const side of sides) { const ts = T.terms(q[side]);
        for (const t of ts) { const k = T.linCoef(t.t); if (!k || k.isZero() || k.isOne()) continue;
          for (const kk of [k, k.neg()]) out.push({ to: withSide(q, side, T.simplify(Expr.div(q[side], T.num(kk)), new Set())), note: `only the ${side} side divided by ${kk}` }); } }
      return out;
    },
  },
  {
    id: "partial-distribution", label: "multiplied only the first term of a bracket",
    explanation: "A factor outside a bracket multiplies every term inside it; it was applied to the first term only.",
    generate(q) {
      return rewrites(q, (n) => {
        const r: { to: MathExpr; note: string }[] = [];
        if (n.kind === "mul" && isSum(n.right)) r.push({ to: { kind: n.right.kind, left: Expr.mul(n.left, n.right.left), right: n.right.right } as MathExpr, note: "factor applied to the first term of the bracket only" });
        if (n.kind === "mul" && isSum(n.left)) r.push({ to: { kind: n.left.kind, left: Expr.mul(n.left.left, n.right), right: n.left.right } as MathExpr, note: "factor applied to the first term of the bracket only" });
        return r;
      });
    },
  },
  {
    id: "distribute-sign-error", label: "got a sign wrong when removing a bracket",
    explanation: "A minus sign in front of a bracket (or a negative factor) changes the sign of every term inside it; one sign was not changed.",
    generate(q) {
      return rewrites(q, (n) => {
        const r: { to: MathExpr; note: string }[] = [];
        if (n.kind === "sub" && isSum(n.right)) r.push({ to: Expr.sub(Expr.sub(n.left, n.right.left), n.right.kind === "add" ? Expr.neg(n.right.right) : n.right.right), note: "sign of the second term in the bracket not changed" });
        if (n.kind === "neg" && isSum(n.operand)) r.push({ to: { kind: n.operand.kind, left: Expr.neg(n.operand.left), right: n.operand.right } as MathExpr, note: "sign of the second term in the bracket not changed" });
        if (n.kind === "mul" && isSum(n.right) && n.right.kind === "sub") r.push({ to: Expr.add(Expr.mul(n.left, n.right.left), Expr.mul(n.left, n.right.right)), note: "the subtraction became an addition after distributing" });
        return r;
      });
    },
  },
  {
    id: "add-denominators", label: "added the numerators and the denominators",
    explanation: "Fractions are added over a common denominator: a/b + c/d = (ad + bc)/(bd). Adding numerators and denominators separately gives a different number.",
    generate(q) {
      return rewrites(q, (n) => (n.kind === "add" || n.kind === "sub") && n.left.kind === "div" && n.right.kind === "div"
        ? [{ to: Expr.div(n.kind === "add" ? Expr.add(n.left.left, n.right.left) : Expr.sub(n.left.left, n.right.left), n.kind === "add" ? Expr.add(n.left.right, n.right.right) : Expr.sub(n.left.right, n.right.right)), note: "numerators and denominators combined separately" }] : []);
    },
  },
  {
    id: "cross-multiply-straight", label: "multiplied straight across when cross-multiplying",
    explanation: "From a/b = c/d the correct step is a*d = b*c (each numerator times the other side's denominator). Multiplying numerator by denominator on the same side, or numerator by numerator, is not an equivalent step.",
    generate(q) {
      if (q.left.kind !== "div" || q.right.kind !== "div") return [];
      const a = q.left.left, b = q.left.right, c = q.right.left, d = q.right.right;
      return [{ to: { left: Expr.mul(a, b), right: Expr.mul(c, d) }, note: "a*b = c*d" }, { to: { left: Expr.mul(a, c), right: Expr.mul(b, d) }, note: "a*c = b*d" }];
    },
  },
  {
    id: "cancel-additive-term", label: "cancelled a term that is not a factor",
    explanation: "Only a common FACTOR of the whole numerator and the whole denominator can be cancelled. A term that is added or subtracted cannot.",
    generate(q) {
      return rewrites(q, (n) => {
        if (n.kind !== "div" || !isSum(n.left) && !isSum(n.right)) return [];
        const nt = T.terms(n.left), dt = T.terms(n.right); const out: { to: MathExpr; note: string }[] = [];
        nt.forEach((a, i) => dt.forEach((b, j) => {
          const sameTerm = printExpr(a.t) === printExpr(b.t) && a.sign === b.sign;
          const bothX = T.hasVar(a.t) && T.hasVar(b.t) && T.linCoef(a.t)?.eq(T.linCoef(b.t) ?? Rational.zero) && a.sign === b.sign;
          if (!(sameTerm || bothX) || (nt.length < 2 && dt.length < 2)) return;
          out.push({ to: Expr.div(T.rebuild(nt.filter((_, k) => k !== i)), T.rebuild(dt.filter((_, k) => k !== j))), note: `${printExpr(a.t)} cancelled as if it were a factor` });
        }));
        return out;
      });
    },
  },
  {
    id: "inverse-operation", label: "used the wrong inverse operation",
    explanation: "Undoing a multiplication needs a division, and undoing a division needs a multiplication. The opposite operation was used.",
    generate(q) {
      const out: { to: T.Eq; note: string }[] = [];
      for (const side of sides) { const e = q[side], o = q[other(side)]; const mk = (v: MathExpr): T.Eq => (side === "left" ? { left: Expr.var("x"), right: v } : { left: v, right: Expr.var("x") });
        if (e.kind === "mul" && e.left.kind === "num" && e.right.kind === "var") out.push({ to: mk(Expr.mul(o, e.left)), note: "multiplied by the coefficient instead of dividing" });
        if (e.kind === "div" && e.left.kind === "var" && e.right.kind === "num") out.push({ to: mk(Expr.div(o, e.right)), note: "divided by the denominator instead of multiplying" });
        if (e.kind === "div" && e.left.kind === "var" && e.right.kind === "num") out.push({ to: mk(Expr.mul(o, e.right)), note: "(correct inverse)" }); }
      return out.filter((x) => x.note !== "(correct inverse)");
    },
  },
  {
    id: "partial-clearing", label: "multiplied only the fractions when clearing denominators",
    explanation: "Multiplying both sides by a common denominator multiplies EVERY term of both sides, including the terms that are not fractions.",
    generate(q) {
      const a = T.denominators(q.left), b = T.denominators(q.right); if (!a || !b) return []; const dens = [...a, ...b]; if (!dens.length) return [];
      let l = 1n; for (const d of dens) { const n = BigInt(d.num); l = (l * n) / T.gcd(l, n); }
      const L = T.num(new Rational(l)); const notes = new Set<string>();
      const clear = (e: MathExpr) => T.rebuild(T.terms(e).map((t) => (T.denominators(t.t)?.length ? { sign: t.sign, t: T.simplify(Expr.mul(L, t.t), notes) } : t)));
      return [{ to: { left: clear(q.left), right: clear(q.right) }, note: `terms without a fraction were not multiplied by ${l}` }];
    },
  },
  {
    id: "drop-denominator", label: "ignored a denominator containing x",
    explanation: "A denominator cannot simply be dropped: both sides must be multiplied by it (and it must be shown to be non-zero).",
    generate(q) { return rewrites(q, (n) => (n.kind === "div" && T.hasVar(n.right) ? [{ to: n.left, note: "the denominator was removed from one side" }] : [])); },
  },
  {
    id: "unbalanced-multiplication", label: "multiplied or divided one side only",
    explanation: "Both sides of an equation must be multiplied (or divided) by the same non-zero number; only one side was changed.",
    generate(q) {
      const dens = [...(T.denominators(q.left) ?? []), ...(T.denominators(q.right) ?? [])]; const out: { to: T.Eq; note: string }[] = [];
      for (const d of dens) for (const side of sides) out.push({ to: withSide(q, side, T.simplify(Expr.mul(T.num(d), q[side]), new Set())), note: `only the ${side} side multiplied by ${d}` });
      return out;
    },
  },
];
export const malRuleById = (id: string) => MALRULES.find((m) => m.id === id)!;
