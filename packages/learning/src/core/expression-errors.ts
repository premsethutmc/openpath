// Mal-rules for EXPRESSION lines (expand / factorise / simplify): the common wrong single transformations on powers, brackets, sums and fractions.
// Same shape and role as MALRULES in misconceptions.ts (a pattern producing a wrong next state, used only to NAME a likely cause of a step the
// independent verifier has already proved invalid), written over expressions rather than equations, and rewritten with the same T.rewriteAt.
// Validity is never decided here; a name is a candidate misconception, matched by exact identity of the wrong result with the student's line.
import { Rational, Expr, type MathExpr } from "../math-kernel.ts";
import * as T from "./tactics.ts";

export interface ExprMalRule { id: string; label: string; explanation: string; generate(e: MathExpr): { to: MathExpr; note: string }[] }
type R = { to: MathExpr; note: string };
const rw = (e: MathExpr, f: (n: MathExpr) => R[]): R[] => T.rewriteAt(e, (n) => f(n).map((x) => ({ to: x.to, what: x.note }))).map((r) => ({ to: r.to, note: r.what }));
const isInt = (e: MathExpr): e is Extract<MathExpr, { kind: "num" }> => e.kind === "num" && e.value.isInteger();
const same = (a: MathExpr, b: MathExpr) => JSON.stringify(a, rep) === JSON.stringify(b, rep);
const rep = (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v instanceof Rational ? v.toString() : v);
/** c·x^k as {c,k} (single-variable monomial), else null */
function mono(e: MathExpr): { c: Rational; k: number } | null {
  if (e.kind === "num") return { c: e.value, k: 0 };
  if (e.kind === "var") return { c: Rational.one, k: 1 };
  if (e.kind === "neg") { const m = mono(e.operand); return m && { c: m.c.neg(), k: m.k }; }
  if (e.kind === "pow" && e.base.kind === "var" && isInt(e.exp)) return { c: Rational.one, k: e.exp.value.num };
  if (e.kind === "mul") { const a = mono(e.left), b = mono(e.right); return a && b && { c: a.c.mul(b.c), k: a.k + b.k }; }
  return null;
}
const fromMono = (c: Rational, k: number): MathExpr => (k === 0 ? Expr.num(c) : (c.isOne() ? (k === 1 ? Expr.var("x") : Expr.pow(Expr.var("x"), Expr.num(new Rational(k)))) : Expr.mul(Expr.num(c), k === 1 ? Expr.var("x") : Expr.pow(Expr.var("x"), Expr.num(new Rational(k))))));
const termsOf = (e: MathExpr) => T.terms(e);
const sumOf = (ts: { sign: number; t: MathExpr }[]) => T.rebuild(ts);

export const EXPRESSION_MALRULES: ExprMalRule[] = [
  { id: "power-of-sum", label: "squared (or cubed) each term of a bracket instead of multiplying the bracket out",
    explanation: "(a + b)² means (a + b)(a + b), which has a middle term 2ab; it is not a² + b². The same holds for any power of a sum.",
    generate: (e) => rw(e, (n) => (n.kind === "pow" && termsOf(n.base).length > 1 ? [{ to: sumOf(termsOf(n.base).map((t) => ({ sign: t.sign, t: Expr.pow(t.t, n.exp) }))), note: "each term of the bracket was raised to the power" }] : [])) },
  { id: "multiply-exponents-in-product", label: "multiplied the powers' exponents when multiplying powers of the same base",
    explanation: "a^m × a^n = a^(m+n): when multiplying powers of one base the exponents are added, not multiplied.",
    generate: (e) => rw(e, (n) => { if (n.kind !== "mul") return []; const a = n.left, b = n.right; if (a.kind === "pow" && b.kind === "pow" && same(a.base, b.base) && isInt(a.exp) && isInt(b.exp)) return [{ to: Expr.pow(a.base, Expr.num(a.exp.value.mul(b.exp.value))), note: "exponents multiplied" }]; return []; }) },
  { id: "add-exponents-in-power-of-power", label: "added the exponents in a power of a power",
    explanation: "(a^m)^n = a^(m×n): for a power of a power the exponents are multiplied, not added.",
    generate: (e) => rw(e, (n) => (n.kind === "pow" && n.base.kind === "pow" && isInt(n.base.exp) && isInt(n.exp) ? [{ to: Expr.pow(n.base.base, Expr.num(n.base.exp.value.add(n.exp.value))), note: "exponents added" }] : [])) },
  { id: "add-exponents-in-quotient", label: "added the exponents when dividing powers of the same base",
    explanation: "a^m ÷ a^n = a^(m−n): when dividing powers of one base the exponents are subtracted.",
    generate: (e) => rw(e, (n) => (n.kind === "div" && n.left.kind === "pow" && n.right.kind === "pow" && same(n.left.base, n.right.base) && isInt(n.left.exp) && isInt(n.right.exp) ? [{ to: Expr.pow(n.left.base, Expr.num(n.left.exp.value.add(n.right.exp.value))), note: "exponents added" }, { to: Expr.pow(n.left.base, Expr.num(n.right.exp.value.sub(n.left.exp.value))), note: "exponents subtracted the wrong way round" }] : [])) },
  { id: "power-of-product-one-factor", label: "applied a power to only one factor of a product",
    explanation: "(ab)^n = a^n × b^n: the power applies to every factor inside the bracket, including a number.",
    generate: (e) => rw(e, (n) => (n.kind === "pow" && n.base.kind === "mul" ? [{ to: Expr.mul(Expr.pow(n.base.left, n.exp), n.base.right), note: "power applied to the first factor only" }, { to: Expr.mul(n.base.left, Expr.pow(n.base.right, n.exp)), note: "power applied to the second factor only" }] : [])) },
  { id: "add-powers-of-unlike-or-like-terms", label: "added the exponents (or coefficients and exponents) when adding terms",
    explanation: "Adding terms combines coefficients of LIKE terms only (same power of x); the power stays the same: x² + x² = 2x², and x² + x stays x² + x.",
    generate: (e) => rw(e, (n) => { if (n.kind !== "add" && n.kind !== "sub") return []; const a = mono(n.left), b = mono(n.right); if (!a || !b) return []; const s = n.kind === "add" ? 1 : -1; const c = a.c.add(b.c.mul(new Rational(s)));
      const out: R[] = [{ to: fromMono(c, a.k + b.k), note: "coefficients combined and exponents added" }, { to: fromMono(Rational.one, a.k + b.k), note: "exponents added and the coefficient dropped" }];
      if (a.k !== b.k) out.push({ to: fromMono(c, Math.max(a.k, b.k)), note: "unlike terms combined as if they were like" }, { to: fromMono(c, Math.min(a.k, b.k)), note: "unlike terms combined as if they were like" });
      if (a.k === b.k) out.push({ to: fromMono(c, a.k * 2), note: "exponent doubled when adding like terms" }); return out; }) },
  { id: "multiply-like-variable-as-add", label: "wrote a repeated factor as a multiple (x · x = 2x) instead of a power",
    explanation: "x × x = x², not 2x; repeated multiplication gives a power, repeated addition gives a multiple.",
    generate: (e) => rw(e, (n) => { if (n.kind !== "mul") return []; const a = mono(n.left), b = mono(n.right); return a && b ? [{ to: fromMono(a.c.mul(b.c), a.k === 0 ? b.k : b.k === 0 ? a.k : 1), note: "exponents not added" }, { to: fromMono(a.c.add(b.c), a.k + b.k), note: "coefficients added instead of multiplied" }, { to: fromMono(a.c.add(b.c), Math.max(a.k, b.k)), note: "the repeated factor written as a multiple" }, { to: fromMono(a.c.mul(b.c), Math.max(a.k, b.k)), note: "the larger power kept" }] : []; }) },
  { id: "distribute-first-term-only", label: "multiplied only the first term of a bracket",
    explanation: "A factor outside a bracket multiplies every term inside it.",
    generate: (e) => rw(e, (n) => { const out: R[] = []; if (n.kind === "mul") for (const [f, s] of [[n.left, n.right], [n.right, n.left]] as const) { const ts = termsOf(s); if (ts.length > 1 && termsOf(f).length === 1) out.push({ to: sumOf(ts.map((t, i) => (i === 0 ? { sign: t.sign, t: Expr.mul(f, t.t) } : t))), note: "only the first term was multiplied" }, { to: sumOf(ts.map((t, i) => (i === ts.length - 1 ? { sign: t.sign, t: Expr.mul(f, t.t) } : t))), note: "only the last term was multiplied" }); } return out; }) },
  { id: "sign-after-minus-bracket", label: "did not change every sign when removing a bracket after a minus",
    explanation: "−(a + b) = −a − b and −(a − b) = −a + b: a minus in front of a bracket changes the sign of every term inside.",
    generate: (e) => rw(e, (n) => { const out: R[] = []; const sum = n.kind === "neg" ? n.operand : n.kind === "sub" ? n.right : null; if (sum && termsOf(sum).length > 1) { const ts = termsOf(sum); const head = n.kind === "sub" ? [n.left] : []; const keep = ts.map((t, i) => (i === 0 ? { sign: -t.sign, t: t.t } : t)); out.push({ to: n.kind === "sub" ? Expr.add(n.left, sumOf(keep)) : sumOf(keep), note: "only the first sign was changed" }); void head; } return out; }) },
  { id: "sign-of-product-after-minus", label: "ignored the sign inside the bracket when subtracting a multiple of a bracket",
    explanation: "a − k(b − c) = a − kb + kc: subtracting k times a bracket changes the sign of every term of k(b − c), so the sign inside the bracket matters.",
    generate: (e) => rw(e, (n) => { if (n.kind !== "sub" || n.right.kind !== "mul") return []; const out: R[] = []; for (const [f, s] of [[n.right.left, n.right.right], [n.right.right, n.right.left]] as const) { const ts = termsOf(s); if (ts.length > 1 && termsOf(f).length === 1) { out.push({ to: Expr.sub(n.left, sumOf(ts.map((t) => ({ sign: 1, t: Expr.mul(f, t.t) })))), note: "the signs inside the bracket were ignored" }, { to: Expr.sub(n.left, sumOf(ts.map((t, i) => ({ sign: i === 0 ? t.sign : -t.sign, t: Expr.mul(f, t.t) })))), note: "the sign of a later term was reversed" }); } } return out; }) },
  { id: "multiply-exponents-symbolic", label: "multiplied the exponents when multiplying powers of the same base",
    explanation: "a^m × a^n = a^(m+n): exponents are added when powers of one base are multiplied.",
    generate: (e) => rw(e, (n) => (n.kind === "mul" && n.left.kind === "pow" && n.right.kind === "pow" && same(n.left.base, n.right.base) ? [{ to: Expr.pow(n.left.base, Expr.mul(n.left.exp, n.right.exp)), note: "exponents multiplied" }] : [])) },
  { id: "add-exponents-power-of-power-symbolic", label: "added the exponents in a power of a power",
    explanation: "(a^m)^n = a^(m×n): exponents are multiplied for a power of a power.",
    generate: (e) => rw(e, (n) => (n.kind === "pow" && n.base.kind === "pow" ? [{ to: Expr.pow(n.base.base, Expr.add(n.base.exp, n.exp)), note: "exponents added" }] : [])) },
  { id: "add-exponents-in-quotient-symbolic", label: "added the exponents when dividing powers of the same base",
    explanation: "a^m ÷ a^n = a^(m−n): exponents are subtracted when powers of one base are divided.",
    generate: (e) => rw(e, (n) => (n.kind === "div" && n.left.kind === "pow" && n.right.kind === "pow" && same(n.left.base, n.right.base) ? [{ to: Expr.pow(n.left.base, Expr.add(n.left.exp, n.right.exp)), note: "exponents added" }, { to: Expr.pow(n.left.base, Expr.div(n.left.exp, n.right.exp)), note: "exponents divided" }] : [])) },
  { id: "split-sum-exponent-as-sum", label: "wrote a power with a sum in the exponent as a sum of powers",
    explanation: "a^(m+n) = a^m × a^n, not a^m + a^n: a sum in the exponent becomes a product of powers.",
    generate: (e) => rw(e, (n) => (n.kind === "pow" && (n.exp.kind === "add" || n.exp.kind === "sub") ? [{ to: n.exp.kind === "add" ? Expr.add(Expr.pow(n.base, n.exp.left), Expr.pow(n.base, n.exp.right)) : Expr.sub(Expr.pow(n.base, n.exp.left), Expr.pow(n.base, n.exp.right)), note: "the exponent's terms became separate powers added together" }] : [])) },
  { id: "add-powers-same-base-symbolic", label: "added the exponents when adding powers of the same base",
    explanation: "a^m + a^n cannot be combined into one power: exponents are added only when MULTIPLYING powers of the same base.",
    generate: (e) => rw(e, (n) => (n.kind === "add" && n.left.kind === "pow" && n.right.kind === "pow" && same(n.left.base, n.right.base) ? [{ to: Expr.pow(n.left.base, Expr.add(n.left.exp, n.right.exp)), note: "exponents added in a sum of powers" }] : [])) },
  { id: "cancel-common-term-in-sums", label: "cancelled a term that is added, as if it were a factor",
    explanation: "Only a factor common to the whole numerator and the whole denominator can be cancelled; a term that is added to something else cannot.",
    generate: (e) => rw(e, (n) => { if (n.kind !== "div") return []; const nt = termsOf(n.left), dt = termsOf(n.right); const out: R[] = [];
      if (nt.length > 1 && dt.length === 1) nt.forEach((t, i) => { if (same(t.t, n.right) && t.sign > 0) out.push({ to: sumOf(nt.filter((_, j) => j !== i)), note: "a term of the numerator cancelled against the denominator" }); });
      if (nt.length > 1 && dt.length > 1) nt.forEach((t, i) => dt.forEach((u, j) => { if (same(t.t, u.t) && t.sign === u.sign) out.push({ to: Expr.div(sumOf(nt.filter((_, k) => k !== i)), sumOf(dt.filter((_, k) => k !== j))), note: "a common added term was cancelled from top and bottom" }); }));
      return out; }) },
  { id: "divide-terms-of-numerator-by-denominator-terms", label: "divided numerator terms by denominator terms one by one",
    explanation: "(a + b) ÷ (c + d) is not a ÷ c + b ÷ d: a sum in the denominator cannot be split term by term. (Only a single-term denominator can be shared out.)",
    generate: (e) => rw(e, (n) => { if (n.kind !== "div") return []; const nt = termsOf(n.left), dt = termsOf(n.right); const out: R[] = [];
      if (nt.length === 2 && dt.length === 2) out.push({ to: sumOf([{ sign: nt[0].sign, t: Expr.div(nt[0].t, dt[0].t) }, { sign: nt[1].sign * dt[1].sign, t: Expr.div(nt[1].t, dt[1].t) }]), note: "numerator and denominator split term by term" });
      if (nt.length > 1 && dt.length > 1) nt.forEach((t, i) => out.push({ to: sumOf(nt.map((u, j) => (j === i ? { sign: u.sign, t: Expr.div(u.t, n.right) } : u))), note: "only one numerator term was divided" }));
      return out; }) },
  { id: "add-fractions-add-denominators", label: "added numerators and denominators separately",
    explanation: "a/b + c/d is not (a + c)/(b + d); fractions need a common denominator first.",
    generate: (e) => rw(e, (n) => (n.kind === "add" && n.left.kind === "div" && n.right.kind === "div" ? [{ to: Expr.div(Expr.add(n.left.left, n.right.left), Expr.add(n.left.right, n.right.right)), note: "numerators and denominators added separately" }, { to: Expr.div(Expr.add(n.left.left, n.right.left), n.left.right), note: "numerators added, the first denominator kept" }] : [])) },
  { id: "reciprocal-sum", label: "took the reciprocal of each term of a sum",
    explanation: "1/(a + b) is not 1/a + 1/b.",
    generate: (e) => rw(e, (n) => (n.kind === "div" && termsOf(n.right).length > 1 ? [{ to: sumOf(termsOf(n.right).map((t) => ({ sign: 1, t: Expr.div(n.left, t.t) }))), note: "denominator split into separate fractions" }] : [])) },
];
/** Name candidate causes: a single wrong rewrite of `from` that is identical (as a function) to `to`. `same(candidate, to)` is decided by the verifier through the callback. */
export function nameExpressionErrors(from: MathExpr, matches: (candidate: MathExpr) => boolean, cap = 600): { id: string; label: string; explanation: string; detail: string }[] {
  const out: { id: string; label: string; explanation: string; detail: string }[] = []; let budget = cap;
  for (const m of EXPRESSION_MALRULES) {
    if (budget <= 0) break;
    try { for (const c of m.generate(from)) { if (budget-- <= 0) break; if (matches(c.to)) { out.push({ id: m.id, label: m.label, explanation: m.explanation, detail: c.note }); break; } } } catch { /* a rule that cannot apply here */ }
  }
  return out;
}
