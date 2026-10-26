// Scope boundaries: what each strategy declares it can treat exactly. Outside the boundary the answer is a structured refusal, never a guess.
import { Rational, type MathExpr } from "../math-kernel.ts";
import { Poly, RatFun } from "../reasoner/domain/poly.ts";
import { zerosOfDenominators, denominatorsOf, parseEq } from "../reasoner/domain/domain-state.ts";
import { Refusal, type OutcomeCode } from "../reasoner/outcomes.ts";
import { hasVar } from "./tactics.ts";
import type { Eq } from "./tactics.ts";

/** Structural reasons the move set cannot handle an equation (reported, never guessed). */
export function linearScope(q: Eq): string | null {
  let reason: string | null = null;
  const walk = (e: MathExpr): void => {
    if (reason) return;
    if (e.kind === "div" && hasVar(e.right)) { reason = "variable in a denominator (needs excluded values; not in the move set)"; return; }
    if (e.kind === "pow" && hasVar(e.base)) { reason = "nonlinear: x raised to a power (not in the move set)"; return; }
    if (e.kind === "mul" && hasVar(e.left) && hasVar(e.right)) { reason = "nonlinear: x times x (not in the move set)"; return; }
    switch (e.kind) {
      case "add": case "sub": case "mul": case "div": walk(e.left); walk(e.right); break;
      case "neg": walk(e.operand); break;
      case "pow": walk(e.base); walk(e.exp); break;
      default: break;
    }
  };
  walk(q.left); walk(q.right);
  return reason;
}

const ORDER = ["no-variable-denominator", "denominator-outside-boundary", "numerator-outside-boundary", "reduced-degree>=2"];

/** Distribute numeric multipliers over sums so term lists match how a student reads the equation. */
function flat(e: MathExpr, sign = 1, out: { e: MathExpr; s: number }[] = []): { e: MathExpr; s: number }[] {
  if (e.kind === "add") { flat(e.left, sign, out); flat(e.right, sign, out); }
  else if (e.kind === "sub") { flat(e.left, sign, out); flat(e.right, -sign, out); }
  else if (e.kind === "neg") flat(e.operand, -sign, out);
  else if (e.kind === "mul" && e.left.kind === "num" && (e.right.kind === "add" || e.right.kind === "sub")) flat(e.right, sign, out);
  else out.push({ e, s: sign });
  return out;
}

/** Scope gate: exact analysis of the stated boundary. `reasons` are the oracle-compatible codes; `code` is the structured outcome (null = supported).
 *  Malformed or unsupported syntax is not caught here: it propagates as a Refusal (PARSE_ERROR, UNSUPPORTED_OPERATOR, ...). */
export function rationalScope(text: string): { reasons: string[]; code: OutcomeCode | null; excluded: Rational[] | null; reducedDegree: number | null } {
  const { left, right } = parseEq(text); const reasons = new Set<string>();
  let code: OutcomeCode | null = null; const mark = (c: OutcomeCode) => { if (code === null || c === "DOMAIN_UNRESOLVED") code = c; };
  let excluded: Rational[] | null = null;
  try { excluded = [...zerosOfDenominators(left), ...zerosOfDenominators(right)]; }
  catch (e) {
    if (e instanceof Refusal && e.code === "DOMAIN_UNRESOLVED") { for (const r of e.reasons) reasons.add(r); mark("DOMAIN_UNRESOLVED"); } else throw e;
  }
  const dens = [...denominatorsOf(left), ...denominatorsOf(right)];
  if (dens.length === 0) { reasons.add("no-variable-denominator"); mark("UNSUPPORTED_EXPRESSION"); }
  for (const side of [left, right]) for (const t of flat(side)) {
    const ds = denominatorsOf(t.e);
    if (ds.length) { let deg = 0; for (const d of ds) { const p = Poly.fromExpr(d); if (!p) { reasons.add("denominator-outside-boundary"); mark("UNSUPPORTED_EXPRESSION"); continue; } deg += p.degree; } if (deg > 3) { reasons.add("denominator-outside-boundary"); mark("UNSUPPORTED_EXPRESSION"); } }
    const f = RatFun.fromExpr(t.e);
    if (!f) { reasons.add("numerator-outside-boundary"); mark("UNSUPPORTED_EXPRESSION"); continue; }
    const n = f.n; if (n.degree > 2 || (n.degree === 2 && !n.splitLinear())) { reasons.add("numerator-outside-boundary"); mark("UNSUPPORTED_EXPRESSION"); }
  }
  let reducedDegree: number | null = null;
  if (excluded) {
    const l = RatFun.fromExpr(left), r = RatFun.fromExpr(right);
    if (l && r) { const f = l.sub(r).reduce(); reducedDegree = f.n.isZero() ? -1 : f.n.degree; if (reducedDegree >= 2) { reasons.add("reduced-degree>=2"); mark("UNSUPPORTED_EXPRESSION"); } }
  }
  return { reasons: ORDER.filter((r) => reasons.has(r)), code, excluded, reducedDegree };
}

