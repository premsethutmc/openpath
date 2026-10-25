// K05.2 stage D2: reusable, domain-aware transformations registered as kernel MathRules.
// Every rule declares (a) preconditions, (b) whether it is an EQUIVALENCE step (solution set over the tracked domain is unchanged)
// or an IMPLICATION step (may add candidates, never loses one), and (c) proof obligations that the exact checker discharges.
// No rule knows about any particular equation. A step that could lose a solution has no applicable form.
import { Rational, Expr, RuleRegistry, type MathExpr, type MathRule, type MathState } from "../../math-kernel.ts";
import { Poly, RatFun, polyToExpr, ratFunToExpr } from "./poly.ts";
import { movesFrom } from "../planner.ts";
import * as V from "../verifier/verifier.ts";
import { Refusal } from "../outcomes.ts";
import { printExpr, parseExpr } from "../expr-text.ts";
import { hasX, denominatorsOf, zerosOfDenominators, excludedOf, checkTransition, constraintOf, type Effect, type DomainState, type Evidence, type Violation } from "./domain-state.ts";

type Params = Record<string, unknown>;
export interface Check { name: string; held: boolean; detail: string }
interface Def {
  id: string; effect: Effect; description: string; principle: string;
  checks(s: MathState, p: Params): Check[];
  apply(s: MathState, p: Params): MathState;
  action(s: MathState, a: MathState, p: Params): string;
  verify?: (before: MathState, after: MathState, p: Params) => boolean;
}
export const DEFS = new Map<string, Def>();

const eqOf = (s: MathState) => s.statements[0];
const withEq = (s: MathState, left: MathExpr, right: MathExpr): MathState => ({ ...s, statements: [{ left, relation: "=", right }, ...s.statements.slice(1)] });
const isZeroLit = (e: MathExpr) => e.kind === "num" && e.value.isZero();
const origRestr = (s: MathState): Rational[] => {
  const l = s.expressions.get("original.left"), r = s.expressions.get("original.right");
  return l && r ? [...zerosOfDenominators(l), ...zerosOfDenominators(r)] : [];
};
const asEq = (s: MathState) => ({ left: eqOf(s).left, right: eqOf(s).right });
const inSet = (v: Rational, xs: Rational[]) => xs.some((u) => u.eq(v));
export function terms(e: MathExpr, out: MathExpr[] = []): MathExpr[] { if (e.kind === "add" || e.kind === "sub") { terms(e.left, out); terms(e.right, out); } else out.push(e); return out; }
function collectDivs(e: MathExpr, out: MathExpr[] = []): MathExpr[] {
  switch (e.kind) {
    case "div": if (hasX(e.right)) out.push(e); collectDivs(e.left, out); collectDivs(e.right, out); break;
    case "add": case "sub": case "mul": collectDivs(e.left, out); collectDivs(e.right, out); break;
    case "neg": collectDivs(e.operand, out); break;
    case "pow": collectDivs(e.base, out); break;
    default: break;
  }
  return out;
}
function replaceNode(e: MathExpr, target: MathExpr, repl: MathExpr): MathExpr {
  if (e === target) return repl;
  switch (e.kind) {
    case "add": case "sub": case "mul": case "div": return { ...e, left: replaceNode(e.left, target, repl), right: replaceNode(e.right, target, repl) } as MathExpr;
    case "neg": return { ...e, operand: replaceNode(e.operand, target, repl) };
    case "pow": return { ...e, base: replaceNode(e.base, target, repl), exp: replaceNode(e.exp, target, repl) };
    default: return e;
  }
}
const allDivs = (s: MathState) => [...collectDivs(eqOf(s).left), ...collectDivs(eqOf(s).right)];
const noDen = (s: MathState) => denominatorsOf(eqOf(s).left).length === 0 && denominatorsOf(eqOf(s).right).length === 0;
const zerosIn = (p: Poly, restricted: Rational[]): { ok: boolean; detail: string } => {
  if (p.degree < 1) return { ok: !p.isZero(), detail: p.isZero() ? "the factor is the zero polynomial" : "a non-zero constant" };
  const sp = p.splitLinear();
  if (!sp) return { ok: false, detail: "zeros not all rational: cannot show they are restricted" };
  const missing = sp.roots.filter((r) => !inSet(r, restricted));
  return { ok: missing.length === 0, detail: missing.length ? `x = ${missing.map(String).join(", ")} is not restricted, so the factor may be zero` : `its zeros (${sp.roots.map(String).join(", ")}) are all restricted` };
};
const reg = (d: Def) => { DEFS.set(d.id, d); };

// ---- 1. restrict denominators (start of every derivation) ----
reg({
  id: "domain.restrict-denominators", effect: "equivalence", principle: "Division by zero is undefined, so every value that makes a denominator zero is excluded from the problem for ever.",
  description: "Record x != r for every real zero r of every denominator containing x.",
  checks(s) { let z: Rational[] = []; let ok = true, detail = ""; try { z = [...zerosOfDenominators(eqOf(s).left), ...zerosOfDenominators(eqOf(s).right)]; } catch (e) { ok = false; detail = String(e); }
    return [{ name: "every denominator splits into linear factors over Q", held: ok, detail: ok ? `zeros: ${z.map(String).join(", ") || "none"}` : detail }]; },
  apply(s) {
    const z = [...zerosOfDenominators(eqOf(s).left), ...zerosOfDenominators(eqOf(s).right)];
    const have = excludedOf(s); const add = z.filter((v, i) => !inSet(v, have) && z.findIndex((u) => u.eq(v)) === i);
    return { ...s, constraints: [...s.constraints, ...add.map(constraintOf)] };
  },
  action: (s, a) => `record the restrictions ${a.constraints.map((c) => `${printExpr(c.expr)} != 0`).join(", ") || "(none needed)"}`,
  verify(before, after) { return eqText2(before) === eqText2(after) && closureHolds(after) && origRestr(after).every((v) => inSet(v, excludedOf(after))); },
});
const eqText2 = (s: MathState) => `${printExpr(eqOf(s).left)}=${printExpr(eqOf(s).right)}`;
const closureHolds = (s: MathState) => [...zerosOfDenominators(eqOf(s).left), ...zerosOfDenominators(eqOf(s).right)].every((v) => inSet(v, excludedOf(s)));

// ---- 2. move everything to the left ----
reg({
  id: "domain.move-to-left", effect: "equivalence", principle: "Subtracting the same expression from both sides keeps the solution set (the expression is defined wherever the equation is).",
  description: "L = R becomes L - R = 0.",
  checks: (s) => [{ name: "the right side is not already 0", held: !isZeroLit(eqOf(s).right), detail: printExpr(eqOf(s).right) }],
  apply: (s) => withEq(s, Expr.sub(eqOf(s).left, eqOf(s).right), Expr.num(0)),
  action: (s) => `subtract ${printExpr(eqOf(s).right)} from both sides`,
});

// ---- 3. combine rational terms ----
reg({
  id: "domain.combine-terms", effect: "equivalence", principle: "a/b + c/d = (a*l/b + c*l/d)/l for the least common denominator l; the new denominator's zeros are already zeros of the old ones.",
  description: "Combine the terms of one side into a single fraction over their least common denominator (no cancelling).",
  checks(s, p) {
    const side = (p.side === "right" ? eqOf(s).right : eqOf(s).left); const f = RatFun.fromExpr(side);
    const tms = terms(side).length;
    return [{ name: "the side has at least two terms", held: tms >= 2, detail: `${tms} terms` },
            { name: "a term has x in a denominator", held: collectDivs(side).length > 0, detail: `${collectDivs(side).length} such fractions` },
            { name: "the side is a rational function of x", held: !!f, detail: f ? "yes" : "no" },
            { name: "the combined form differs from the written form", held: !!f && printExpr(ratFunToExpr(f)) !== printExpr(side), detail: "" }];
  },
  apply(s, p) { const side = p.side === "right" ? "right" : "left"; const f = RatFun.fromExpr(eqOf(s)[side])!; const e = ratFunToExpr(f); return side === "left" ? withEq(s, e, eqOf(s).right) : withEq(s, eqOf(s).left, e); },
  action: (s, a, p) => `combine the ${p.side === "right" ? "right" : "left"} side into one fraction`,
});

// ---- 4. cancel a common factor (restriction stays) ----
reg({
  id: "domain.cancel-common-factor", effect: "equivalence", principle: "A common factor f of numerator and denominator can be cancelled everywhere f != 0. Because f divides the denominator, f != 0 is already a restriction, so the restriction stays and nothing is lost or gained.",
  description: "Cancel the polynomial gcd of numerator and denominator in one fraction.",
  checks(s, p) {
    const n = allDivs(s)[Number(p.index)]; if (!n || n.kind !== "div") return [{ name: "the fraction exists", held: false, detail: `index ${p.index}` }];
    const pn = Poly.fromExpr(n.left), pd = Poly.fromExpr(n.right);
    if (!pn || !pd) return [{ name: "numerator and denominator are polynomials", held: false, detail: "no" }];
    const g = pn.gcd(pd); const z = zerosIn(g, excludedOf(s));
    return [{ name: "numerator and denominator have a common factor of degree >= 1", held: g.degree >= 1, detail: `gcd degree ${g.degree}` },
            { name: "the common factor's zeros are restricted", held: z.ok, detail: z.detail }];
  },
  apply(s, p) { const n = allDivs(s)[Number(p.index)]; const r = new RatFun(Poly.fromExpr((n as { left: MathExpr }).left)!, Poly.fromExpr((n as { right: MathExpr }).right)!).reduce();
    const e = ratFunToExpr(r); return withEq(s, replaceNode(eqOf(s).left, n, e), replaceNode(eqOf(s).right, n, e)); },
  action: (s, a, p) => { const n = allDivs(s)[Number(p.index)]; return `cancel the common factor in ${printExpr(n)}, keeping its restriction`; },
});

// ---- 5. clear denominators ----
reg({
  id: "domain.clear-denominators", effect: "equivalence", principle: "Multiplying both sides by an expression that is non-zero on the whole tracked domain keeps the solution set. The least common denominator is non-zero exactly because its zeros are restricted.",
  description: "Multiply both sides by the least common denominator and cancel, leaving a polynomial equation.",
  checks(s) {
    const dens = [...denominatorsOf(eqOf(s).left), ...denominatorsOf(eqOf(s).right)].map((d) => Poly.fromExpr(d));
    if (dens.length === 0) return [{ name: "there is a denominator containing x", held: false, detail: "none" }];
    if (dens.some((d) => !d)) return [{ name: "every denominator is a polynomial", held: false, detail: "no" }];
    let lcd = Poly.one; for (const d of dens) lcd = lcd.lcm(d!);
    const z = zerosIn(lcd, excludedOf(s));
    const l = RatFun.fromExpr(eqOf(s).left), r = RatFun.fromExpr(eqOf(s).right);
    const mulL = l && l.mul(RatFun.fromPoly(lcd)).reduce(), mulR = r && r.mul(RatFun.fromPoly(lcd)).reduce();
    return [{ name: "the LCD's zeros are restricted (it is non-zero on the domain)", held: z.ok, detail: z.detail },
            { name: "both sides become polynomials after multiplying", held: !!mulL && !!mulR && mulL.d.degree === 0 && mulR.d.degree === 0, detail: "" }];
  },
  apply(s) {
    const dens = [...denominatorsOf(eqOf(s).left), ...denominatorsOf(eqOf(s).right)].map((d) => Poly.fromExpr(d)!); let lcd = Poly.one; for (const d of dens) lcd = lcd.lcm(d);
    const f = (e: MathExpr) => polyToExpr(RatFun.fromExpr(e)!.mul(RatFun.fromPoly(lcd)).reduce().n);
    return withEq(s, f(eqOf(s).left), f(eqOf(s).right));
  },
  action: (s) => "multiply both sides by the least common denominator and cancel",
});

// ---- 6./7. multiply or divide both sides by an expression ----
const factorParam = (p: Params): Poly | null => { try { return Poly.fromExpr(parseExpr(String(p.factor))); } catch { return null; } };
reg({
  id: "domain.multiply-both-sides", effect: "equivalence", principle: "Multiplying by e keeps the solution set when e is non-zero everywhere on the tracked domain.",
  description: "Multiply both sides by e, provided e cannot be zero on the domain.",
  checks(s, p) { const f = factorParam(p); if (!f) return [{ name: "the factor is a polynomial", held: false, detail: String(p.factor) }]; const z = zerosIn(f, excludedOf(s)); return [{ name: "the factor is non-zero on the domain", held: z.ok, detail: z.detail }]; },
  apply: (s, p) => { const e = parseExpr(String(p.factor)); return withEq(s, Expr.mul(e, eqOf(s).left), Expr.mul(e, eqOf(s).right)); },
  action: (s, a, p) => `multiply both sides by ${p.factor}`,
});
reg({
  id: "domain.multiply-both-sides-expanding", effect: "implication", principle: "Multiplying by an expression that may be zero keeps every old solution but may add new ones (its zeros). The result is a set of CANDIDATES that must be checked against the original equation.",
  description: "Multiply both sides by e without showing e is non-zero: candidate-expanding. Never selected by the engine's equivalence search.",
  checks(s, p) { const f = factorParam(p); return [{ name: "the factor is a non-zero polynomial", held: !!f && !f.isZero(), detail: String(p.factor) }]; },
  apply: (s, p) => { const e = parseExpr(String(p.factor)); return withEq(s, Expr.mul(e, eqOf(s).left), Expr.mul(e, eqOf(s).right)); },
  action: (s, a, p) => `multiply both sides by ${p.factor} (candidate-expanding)`,
});
reg({
  id: "domain.divide-both-sides", effect: "equivalence", principle: "Dividing by e is valid only where e != 0. When every zero of e is already restricted, e is non-zero on the whole domain, so nothing is lost.",
  description: "Divide both sides by e, provided every zero of e is restricted. Otherwise not applicable: dividing could discard a solution.",
  checks(s, p) { const f = factorParam(p); if (!f) return [{ name: "the divisor is a polynomial", held: false, detail: String(p.factor) }]; const z = zerosIn(f, excludedOf(s)); return [{ name: "the divisor is non-zero on the domain", held: z.ok, detail: z.detail }]; },
  apply: (s, p) => { const e = parseExpr(String(p.factor)); const d = (x: MathExpr) => (isZeroLit(x) ? x : Expr.div(x, e)); return withEq(s, d(eqOf(s).left), d(eqOf(s).right)); },   // 0 / e = 0 because e is non-zero on the domain
  action: (s, a, p) => `divide both sides by ${p.factor}`,
});

// ---- 8. tidy a polynomial equation ----
reg({
  id: "domain.simplify-polynomial", effect: "equivalence", principle: "Expanding and collecting terms of a denominator-free expression is an identity between polynomial functions.",
  description: "Write each side of a denominator-free equation as an expanded polynomial.",
  checks(s) { const l = Poly.fromExpr(eqOf(s).left), r = Poly.fromExpr(eqOf(s).right);
    return [{ name: "both sides are polynomials (no x in a denominator)", held: !!l && !!r, detail: "" },
            { name: "the written form changes", held: !!l && !!r && (printExpr(polyToExpr(l)) !== printExpr(eqOf(s).left) || printExpr(polyToExpr(r)) !== printExpr(eqOf(s).right)), detail: "" }]; },
  apply: (s) => withEq(s, polyToExpr(Poly.fromExpr(eqOf(s).left)!), polyToExpr(Poly.fromExpr(eqOf(s).right)!)),
  action: () => "expand and collect terms on both sides",
});

// ---- 9. linear solving, reusing PR #75's moves on denominator-free linear equations ----
reg({
  id: "domain.linear-step", effect: "equivalence", principle: "On a denominator-free equation the PR #75 moves (add/subtract/divide by a constant, tidy) keep the solution set; restrictions are carried unchanged.",
  description: "One PR #75 linear move, applied only when no x is in a denominator and both sides have degree <= 1.",
  checks(s, p) {
    const l = Poly.fromExpr(eqOf(s).left), r = Poly.fromExpr(eqOf(s).right);
    const ms = l && r ? movesFrom(asEq(s)) : [];
    return [{ name: "no x in any denominator", held: noDen(s), detail: "" }, { name: "both sides are polynomials of degree <= 1", held: !!l && !!r && l.degree <= 1 && r.degree <= 1, detail: "" },
            { name: "the move exists", held: !!l && !!r && Number(p.index) < ms.length, detail: `index ${p.index} of ${ms.length}` }];
  },
  apply: (s, p) => { const m = movesFrom(asEq(s))[Number(p.index)]; return withEq(s, m.to.left, m.to.right); },
  action: (s, a, p) => movesFrom(asEq(s))[Number(p.index)].explain,
});

// ---- 10. accept a candidate: the precondition IS invariant I4 ----
reg({
  id: "domain.accept-candidate", effect: "equivalence", principle: "A value is a solution of the problem only if it is allowed by the original domain and makes the ORIGINAL equation true with both sides defined.",
  description: "Bind x = c when c is outside every restriction and satisfies the original equation exactly.",
  checks(s, p) {
    const c = new Rational(BigInt(String(p.value).split("/")[0]), BigInt(String(p.value).split("/")[1] ?? "1"));
    const ol = s.expressions.get("original.left"), or = s.expressions.get("original.right");
    const excluded = inSet(c, excludedOf(s)) || inSet(c, origRestr(s));
    let detail = "", holds = false;
    if (ol && or) { const b = new Map([["x", c]]); try { const a = evaluateAt(ol, b), z = evaluateAt(or, b); holds = a.eq(z); detail = `original: ${a} vs ${z}`; } catch (e) { detail = `undefined at x = ${c}`; } }
    return [{ name: "the value is not excluded by the original domain", held: !excluded, detail: excluded ? `x = ${c} is a restricted value` : "allowed" },
            { name: "exact substitution into the original equation gives equal, defined sides", held: holds, detail }];
  },
  apply: (s, p) => ({ ...s, bindings: new Map([...s.bindings, ["x", new Rational(BigInt(String(p.value).split("/")[0]), BigInt(String(p.value).split("/")[1] ?? "1"))]]) }),
  action: (s, a, p) => `accept x = ${p.value} after checking it against the original equation and domain`,
  verify: () => true,
});
import { evaluate } from "../../math-kernel.ts";
function evaluateAt(e: MathExpr, b: Map<string, Rational>): Rational { return evaluate(e, b); }

// ---- registry ----
function toMathRule(d: Def): MathRule {
  return {
    id: d.id, appliesTo: ["equation"], description: d.description,
    precondition: (s, p) => { const bad = d.checks(s, p).find((c) => !c.held); return bad ? `${bad.name} (${bad.detail})` : null; },
    apply: d.apply,
    verify: (before, after, p) => (d.verify ? d.verify(before, after, p) : true) && verifyEffect(d.effect, before, after),
    explain: (before, after, p) => ({ principle: d.principle, action: d.action(before, after, p), justification: d.principle, beforeText: eqText2(before), afterText: eqText2(after) }),
  };
}
/** Exact verification used by every rule unless it overrides: invariants I1-I3 plus the solution-set relation its effect promises. */
export function violations(effect: Effect, before: MathState, after: MathState): Violation[] {
  return checkTransition({ ...asEq(before), excluded: excludedOf(before) }, { ...asEq(after), excluded: excludedOf(after) }, effect, origRestr(after));
}
/** R1: a rule's result is accepted only if the INDEPENDENT verifier (own parser/polynomials) accepts it, working from the printed texts of the two states.
 *  The earlier Poly-based check must agree; a disagreement is a defect somewhere and raises PROOF_FAILED instead of being resolved silently. */
const stateText = (s: MathState) => ({ eq: eqText2(s), excluded: excludedOf(s).map(String) });
const originalText = (s: MathState) => { const l = s.expressions.get("original.left"), r = s.expressions.get("original.right"); return l && r ? `${printExpr(l)}=${printExpr(r)}` : undefined; };
export function verifyEffect(effect: Effect, before: MathState, after: MathState): boolean {
  const v = V.checkStep(stateText(before), stateText(after), effect, originalText(after));
  const legacyOk = violations(effect, before, after).length === 0;
  if (v.valid !== legacyOk) { DISAGREEMENTS.push(`${eqText2(before)} -> ${eqText2(after)} (${effect}): verifier ${v.valid ? "accepts" : "rejects"} [${v.reasons}], legacy ${legacyOk ? "accepts" : "rejects"}`); throw new Refusal("PROOF_FAILED", "independent verifier and internal check disagree"); }
  return v.valid;
}
export const DISAGREEMENTS: string[] = [];

export function createDomainRegistry(): RuleRegistry { const r = new RuleRegistry(); for (const d of DEFS.values()) r.register(toMathRule(d)); return r; }
export const effectOf = (ruleId: string): Effect => DEFS.get(ruleId)!.effect;

/** Apply a rule through the kernel registry and record the evidence (preconditions, obligations) on the DomainState. */
export function applyDomainRule(registry: RuleRegistry, ds: DomainState, ruleId: string, params: Params): DomainState {
  const def = DEFS.get(ruleId)!; const checks = def.checks(ds.math, params);
  const t = registry.applyRule(ds.math, ruleId, params);                          // throws if a precondition fails or exact verification fails
  const step = ds.evidence.length + 1;
  const v = violations(def.effect, t.before, t.after);
  const ob = (id: string, kind: string, bad: Violation[], how: string) => ({ id, kind, discharged: !bad.some((x) => x === id as Violation), how });
  const evidence: Evidence = {
    step, rule: ruleId, effect: def.effect, preconditions: checks,
    obligations: [
      { id: "I1-restrictions-retained", kind: "restriction", discharged: !v.includes("restriction-dropped"), how: "every earlier restriction is still present (exact set inclusion)" },
      { id: "I2-denominators-restricted", kind: "restriction", discharged: !v.includes("restriction-closure-violated"), how: "every zero of every denominator is in the restrictions (exact polynomial roots)" },
      { id: "I3-original-contained", kind: "restriction", discharged: !v.includes("original-restriction-lost"), how: "the original restrictions are contained in the current ones" },
      { id: def.effect === "equivalence" ? "solution-set-equal" : "solution-set-superset", kind: "solution-set", discharged: !v.includes("solution-set-changed") && !v.includes("solution-set-lost"), how: "reduced numerator, restricted factors removed, squarefree comparison (exact)" },
      { id: "independent-verifier-accepts", kind: "verification", discharged: V.checkStep(stateText(t.before), stateText(t.after), def.effect, originalText(t.after)).valid, how: "separate parser, polynomial code, restriction extraction and real-solution-set algebra (verifier.ts)" },
    ],
  };
  const known = ds.restrictions; const now = excludedOf(t.after);
  const restrictions = [...known, ...now.filter((x) => !inSet(x, known.map((r) => r.value))).map((x) => ({ expr: constraintOf(x).expr, value: x, origin: ruleId, step }))];
  return { ...ds, math: t.after, restrictions, evidence: [...ds.evidence, evidence] };
}
