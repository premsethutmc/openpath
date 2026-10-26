// Constraint-based problem construction.
// A specification states what the problem must be (outcome, exact solution, exact restricted values, which operations a solver NEEDS, how long the
// shortest verified route is). The constructor builds candidates by REVERSE SCRAMBLING: it starts from a state whose answer is known (x = c, a
// contradiction, an identity) and applies randomly chosen INVERSE operations (add a term to both sides, scale both sides, multiply a side by
// (x-r)/(x-r), add a fraction to both sides, divide both sides by (x-r), ...). Each inverse operation keeps the solution set on the (extended) domain, so
// the intended answer is known by construction. Nothing is stored or substituted: structure, constants and restricted values are sampled.
// Then every candidate is checked INDEPENDENTLY of the construction logic: the independent verifier recomputes the domain and the exact solution set,
// and the core planner solves the problem (the required operations are proven necessary by removing each one and watching the planner fail).
import { Rational, Expr, type MathExpr } from "../math-kernel.ts";
import { printExpr } from "../reasoner/expr-text.ts";
import { rng } from "../reasoner/construct.ts";
import * as V from "../reasoner/verifier/verifier.ts";
import { solve, STRATEGIES, type CoreResult } from "./solve.ts";
import type { Strategy } from "./planner.ts";

export interface Spec {
  seed: number;
  kind: "linear" | "rational";
  outcome: "unique" | "none" | "identity-on-domain";
  solution?: string;                       // unique: the exact answer wanted
  excluded?: string[];                     // rational: the exact set of restricted values wanted
  excludedCount?: number;                  // rational: how many distinct restricted values
  extraneous?: boolean;                    // none: the only candidate that appears while solving is a restricted value
  requireOps?: string[];                   // every route within the planner's bounds needs these vocabulary operations
  steps?: { min: number; max: number };   // length of the shortest verified route (planner)
  maxChars?: number; maxScramble?: number; maxAttempts?: number;
}
export interface Built {
  text: string; outcome: Spec["outcome"]; solution: string | null; excluded: string[]; extraneous: boolean; recipe: string[]; attempts: number;
  verification: { verifierDomain: string[]; verifierOutcome: string; verifierSolution: string[] | null; plannerClass: string; plannerSolution: string[] | null; routeLength: number; opsUsed: string[]; opsRequired: string[] };
}
const X = Expr.var("x"); const Q = (n: number | Rational) => Expr.num(typeof n === "number" ? new Rational(n) : n);
type Eq = { left: MathExpr; right: MathExpr };
interface Cand { eq: Eq; excluded: Rational[]; solution: Rational | null; kind: Spec["outcome"]; recipe: string[]; extraneous: boolean }
const lin = (r: Rational): MathExpr => (r.isZero() ? X : r.lt(Rational.zero) ? Expr.add(X, Q(r.neg())) : Expr.sub(X, Q(r)));   // x - r
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];
const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const nz = (r: () => number, lo: number, hi: number) => { let v = 0; while (v === 0) v = int(r, lo, hi); return v; };

/** e + sign*t, written the way a person would: constants are merged into a constant-only side or into a trailing constant. */
const isNumLeaf = (e: MathExpr): e is Extract<MathExpr, { kind: "num" }> => e.kind === "num";
const hasXn = (e: MathExpr): boolean => (e.kind === "var" ? true : e.kind === "num" ? false : e.kind === "neg" ? hasXn(e.operand) : e.kind === "pow" ? hasXn(e.base) : e.kind === "frac" ? hasXn(e.num) || hasXn(e.den) : e.kind === "quantity" ? hasXn(e.value) : hasXn(e.left) || hasXn(e.right));
const xCoef = (e: MathExpr): Rational | null => (e.kind === "var" ? Rational.one : e.kind === "mul" && isNumLeaf(e.left) && e.right.kind === "var" ? e.left.value : null);
const xTerm = (k: Rational): MathExpr => (k.isOne() ? X : Expr.mul(Q(k), X));
function addTo(e: MathExpr, t: MathExpr, sign: 1 | -1): MathExpr {
  const tk = xCoef(t);
  if (tk) {   // an x-term merges into an existing x-term (a person would write 3*x, not x+2*x)
    const v = sign > 0 ? tk : tk.neg();
    const own = xCoef(e); if (own) { const tot = own.add(v); return tot.isZero() ? Q(0) : tot.lt(Rational.zero) ? Expr.neg(xTerm(tot.neg())) : xTerm(tot); }
    if ((e.kind === "add" || e.kind === "sub") && xCoef(e.right)) { const old = e.kind === "add" ? xCoef(e.right)! : xCoef(e.right)!.neg(); const tot = old.add(v); return tot.isZero() ? e.left : tot.lt(Rational.zero) ? Expr.sub(e.left, xTerm(tot.neg())) : Expr.add(e.left, xTerm(tot)); }
    if (isNumLeaf(e)) {   // c + k*x is written k*x + c
      if (v.lt(Rational.zero)) return e.value.lt(Rational.zero) ? Expr.sub(Expr.neg(xTerm(v.neg())), Q(e.value.neg())) : Expr.sub(e, xTerm(v.neg()));
      return e.value.lt(Rational.zero) ? Expr.sub(xTerm(v), Q(e.value.neg())) : Expr.add(xTerm(v), e);
    }
    return v.lt(Rational.zero) ? Expr.sub(e, xTerm(v.neg())) : Expr.add(e, xTerm(v));
  }
  if (isNumLeaf(t)) {
    const v = sign > 0 ? t.value : t.value.neg();
    if (isNumLeaf(e)) return Q(e.value.add(v));
    if ((e.kind === "add" || e.kind === "sub") && isNumLeaf(e.right)) { const old = e.kind === "add" ? e.right.value : e.right.value.neg(); const tot = old.add(v); return tot.isZero() ? e.left : tot.lt(Rational.zero) ? Expr.sub(e.left, Q(tot.neg())) : Expr.add(e.left, Q(tot)); }
    if (!hasXn(e)) return Q(v);
    return v.lt(Rational.zero) ? Expr.sub(e, Q(v.neg())) : Expr.add(e, Q(v));
  }
  return sign > 0 ? Expr.add(e, t) : Expr.sub(e, t);
}
type Op = { id: string; rationalOnly?: boolean; run(c: Cand, r: () => number): Cand | null };
const withEq = (c: Cand, eq: Eq, note: string, extra: Partial<Cand> = {}): Cand => ({ ...c, eq, recipe: [...c.recipe, note], ...extra });
const addRestriction = (c: Cand, rr: Rational): { excluded: Rational[]; solution: Rational | null; kind: Spec["outcome"]; extraneous: boolean } => {
  const excluded = c.excluded.some((u) => u.eq(rr)) ? c.excluded : [...c.excluded, rr].sort((a, b) => (a.lt(b) ? -1 : a.gt(b) ? 1 : 0));
  const lost = c.solution !== null && c.solution.eq(rr);
  return { excluded, solution: lost ? null : c.solution, kind: lost && c.kind === "unique" ? "none" : c.kind, extraneous: c.extraneous || lost };
};
const OPS: Op[] = [
  { id: "add-term-both-sides", run(c, r) {            // inverse of add-sub-both-sides
    const t = pick(r, [() => Expr.mul(Q(int(r, 2, 6)), X), () => Q(int(r, 1, 9)), () => X])(); const minus = r() < 0.5;
    const f = (e: MathExpr) => addTo(e, t, minus ? -1 : 1);
    return withEq(c, { left: f(c.eq.left), right: f(c.eq.right) }, `${minus ? "subtract" : "add"} ${printExpr(t)} on both sides`); } },
  { id: "scale-both-sides", run(c, r) {                 // inverse of mul-div-const
    const k = nz(r, 2, 6); const div = r() < 0.35;
    const f = (e: MathExpr) => (div ? Expr.div(e, Q(k)) : Expr.mul(Q(k), e));
    return withEq(c, { left: f(c.eq.left), right: f(c.eq.right) }, `${div ? "divide" : "multiply"} both sides by ${k}`); } },
  { id: "move-term", run(c, r) {                         // inverse of the same move: a term crosses the equals sign
    const t = Expr.mul(Q(int(r, 2, 5)), X); const sign: 1 | -1 = r() < 0.5 ? 1 : -1;
    return withEq(c, { left: addTo(c.eq.left, t, sign), right: addTo(c.eq.right, t, sign) }, "introduce an x-term on both sides"); } },
  { id: "multiply-side-by-unit", rationalOnly: true, run(c, r) {      // inverse of cancel-common-factor: e = e*(x-r)/(x-r), restriction r appears
    const rr = c.solution && r() < 0.18 ? c.solution : new Rational(nz(r, -7, 7)); const f = (e: MathExpr) => Expr.div(Expr.mul(e, lin(rr)), lin(rr));
    const side = r() < 0.5 ? "left" : "right"; const a = addRestriction(c, rr);
    return withEq(c, side === "left" ? { left: f(c.eq.left), right: c.eq.right } : { left: c.eq.left, right: f(c.eq.right) }, `write one side as (side*(${printExpr(lin(rr))}))/(${printExpr(lin(rr))})`, a); } },
  { id: "add-fraction-both-sides", rationalOnly: true, run(c, r) {      // inverse of subtracting a fraction from both sides
    const rr = new Rational(nz(r, -7, 7)); const t = Expr.div(Q(int(r, 1, 5)), lin(rr)); const a = addRestriction(c, rr); const sign: 1 | -1 = r() < 0.5 ? 1 : -1;
    return withEq(c, { left: addTo(c.eq.left, t, sign), right: addTo(c.eq.right, t, sign) }, `${sign > 0 ? "add" : "subtract"} ${printExpr(t)} on both sides`, a); } },
  { id: "divide-both-sides-by-factor", rationalOnly: true, run(c, r) {  // inverse of multiply-both-sides by a restricted factor
    const rr = new Rational(nz(r, -7, 7)); const a = addRestriction(c, rr);
    return withEq(c, { left: Expr.div(c.eq.left, lin(rr)), right: Expr.div(c.eq.right, lin(rr)) }, `divide both sides by (${printExpr(lin(rr))})`, a); } },
];
const BASES: Record<Spec["outcome"], (r: () => number, spec: Spec) => Cand> = {
  unique: (r, s) => { const v = new Rational(BigInt(s.solution ?? String(nz(r, -12, 12)))); return { eq: { left: X, right: Q(v) }, excluded: [], solution: v, kind: "unique", recipe: [`start from x = ${v}`], extraneous: false }; },
  none: (r) => { const a = nz(r, -9, 9); let b = nz(r, -9, 9); if (b === a) b += 1; return { eq: { left: Q(a), right: Q(b) }, excluded: [], solution: null, kind: "none", recipe: [`start from the contradiction ${a} = ${b}`], extraneous: false }; },
  "identity-on-domain": (r) => { const a = nz(r, -9, 9); return { eq: { left: Q(a), right: Q(a) }, excluded: [], solution: null, kind: "identity-on-domain", recipe: [`start from the identity ${a} = ${a}`], extraneous: false }; },
} as never;
const baseOf = (s: Spec): ((r: () => number, spec: Spec) => Cand) => (s.outcome === "none" ? BASES.none : BASES[s.outcome]);

const sortRs = (xs: Rational[]) => xs.slice().sort((a, b) => (a.lt(b) ? -1 : a.gt(b) ? 1 : 0));
const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const ALL_OPS = ["restrict", "move-to-left", "combine-terms", "cancel-common-factor", "clear-denominators", "expand", "collect-terms", "add-sub-both-sides", "mul-div-const", "divide-restricted-factor", "swap-sides"];

/** Independently verify a candidate and measure it. Returns a reason string if it fails any constraint. */
function check(text: string, cand: Cand, spec: Spec): { why?: string; built?: Built["verification"] & { routeLen: number } } {
  let an: V.Analysed; try { an = V.analyse(text); } catch { return { why: "verifier cannot analyse the text" }; }
  const dom = an.required.map(String);
  if (spec.excluded && !same(dom, sortRs(spec.excluded.map((s) => new Rational(BigInt(s)))).map(String))) return { why: "restricted values differ from the specification" };
  if (spec.excludedCount !== undefined && dom.length !== spec.excludedCount) return { why: "number of restricted values differs from the specification" };
  if (!same(dom, cand.excluded.map(String))) return { why: "verifier's domain differs from the construction's" };
  const sol = V.solutionOf(text).sol;
  const vOutcome = sol.kind === "all" ? "identity-on-domain" : sol.rats.length === 0 && sol.irr.length === 1 ? "none" : sol.rats.length === 1 && sol.irr.length === 1 ? "unique" : "other";
  const vSol = sol.kind === "set" && sol.irr.length === 1 ? sol.rats.map(String) : null;
  if (cand.kind !== spec.outcome) return { why: `constructed outcome ${cand.kind} is not the requested ${spec.outcome}` };
  if (vOutcome !== cand.kind) return { why: `verifier outcome ${vOutcome} differs from the constructed outcome ${cand.kind}` };
  if (cand.kind === "unique" && (!vSol || vSol[0] !== cand.solution!.toString())) return { why: "verifier's solution differs from the intended one" };
  if (spec.extraneous !== undefined && cand.extraneous !== spec.extraneous) return { why: "extraneous flag differs" };
  const strat: Strategy = spec.kind === "linear" ? STRATEGIES.linear : STRATEGIES.rational;
  const res: CoreResult = solve(text, { strategy: strat });
  if (res.class === "refused") return { why: `planner refused: ${res.outcome}` };
  if (res.class !== cand.kind) return { why: `planner class ${res.class} differs` };
  if (cand.kind === "unique" && res.solution?.[0] !== cand.solution!.toString()) return { why: "planner's solution differs" };
  const used = [...new Set(res.steps.flatMap((s) => (s.rule === "core.divide-both-sides" ? [(s.params as { kind?: string }).kind === "restricted-factor" ? "divide-restricted-factor" : "mul-div-const"] : opsOfStep(s.rule))))];
  if (spec.steps && (res.stats.pathLength < spec.steps.min || res.stats.pathLength > spec.steps.max)) return { why: `route length ${res.stats.pathLength} outside ${spec.steps.min}..${spec.steps.max}` };
  for (const op of spec.requireOps ?? []) {
    const s2: Strategy = { ...strat, allowed: new Set([...strat.allowed].filter((o) => o !== op)) };
    const r2 = solve(text, { strategy: s2 });
    if (r2.class !== "refused") return { why: `the problem is solvable without ${op}` };
  }
  return { built: { verifierDomain: dom, verifierOutcome: vOutcome, verifierSolution: vSol, plannerClass: res.class, plannerSolution: res.solution, routeLength: res.stats.pathLength, routeLen: res.stats.pathLength, opsUsed: used, opsRequired: spec.requireOps ?? [] } };
}
const OPS_OF: Record<string, string[]> = {
  "core.restrict": ["restrict"], "core.collect-terms": ["collect-terms"], "core.expand-brackets": ["expand"], "core.add-sub-both-sides": ["add-sub-both-sides"], "core.multiply-both-sides": ["mul-div-const"],
  "core.swap-sides": ["swap-sides"], "core.move-to-left": ["move-to-left"], "core.combine-terms": ["combine-terms"], "core.cancel-common-factor": ["cancel-common-factor"], "core.clear-denominators": ["clear-denominators"],
  "core.expand-collect-polynomial": ["expand", "collect-terms"], "core.accept-candidate": ["accept-candidate"],
};
const opsOfStep = (rule: string) => OPS_OF[rule] ?? [];

export function construct(spec: Spec): Built {
  const r = rng(spec.seed); const maxAttempts = spec.maxAttempts ?? 4000; const rejections: Record<string, number> = {};
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const wantExtraneous = spec.extraneous === true;
    let c = (wantExtraneous ? BASES.unique : baseOf(spec))(r, spec); const n = int(r, 2, spec.maxScramble ?? 5); const forceAt = wantExtraneous ? int(r, 0, n - 1) : -1;
    for (let i = 0; i < n; i++) {
      if (i === forceAt && c.solution) { c = OPS.find((o) => o.id === "multiply-side-by-unit")!.run({ ...c }, () => 0.01)!; continue; }   // the restricted value is the solution itself
      const used = (id: string) => c.recipe.filter((x) => x.startsWith(id)).length;
      const pool = OPS.filter((o) => (spec.kind === "rational" || !o.rationalOnly) && !(o.id === "divide-both-sides-by-factor" && used("divide both sides by (") > 0));
      const next = pick(r, pool).run(c, r); if (next) c = next;
    }
    const text = `${printExpr(c.eq.left)}=${printExpr(c.eq.right)}`;
    if (text.length > (spec.maxChars ?? 80)) { rejections.size = (rejections.size ?? 0) + 1; continue; }
    if (/\+-|--|\*-|\(\+/.test(text)) { rejections.ugly = (rejections.ugly ?? 0) + 1; continue; }
    if (spec.kind === "rational" && c.excluded.length === 0) { rejections.noRestriction = (rejections.noRestriction ?? 0) + 1; continue; }
    if (spec.kind === "linear" && c.excluded.length) continue;
    const v = check(text, c, spec);
    if (v.why) { rejections[v.why] = (rejections[v.why] ?? 0) + 1; continue; }
    return { text, outcome: c.kind, solution: c.solution ? c.solution.toString() : null, excluded: c.excluded.map(String), extraneous: c.extraneous, recipe: c.recipe, attempts: attempt, verification: v.built! };
  }
  throw new Error(`could not satisfy the specification in ${maxAttempts} attempts; rejections: ${JSON.stringify(rejections)}`);
}
void ALL_OPS;
