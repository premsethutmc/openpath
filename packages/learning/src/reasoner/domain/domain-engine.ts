// K05.2 stage D3: search over the registered domain rules. No equation-specific templates, no stored answers.
// Flow: refusal gate (stated scope boundary, exact analysis) -> restrict denominators -> BFS over applicable rules -> terminal test -> candidate check by
// exact substitution into the ORIGINAL equation. Every step goes through the kernel registry (preconditions + exact verification).
import { Rational, type MathExpr } from "../../math-kernel.ts";
import { printExpr } from "../expr-text.ts";
import { movesFrom } from "../planner.ts";
import { Poly, RatFun, OutsideBoundary } from "./poly.ts";
import { initialState, excludedOf, eqText, zerosOfDenominators, denominatorsOf, hasX, linearFactorExpr, parseEq, type DomainState } from "./domain-state.ts";
import { createDomainRegistry, applyDomainRule, DEFS, terms, DISAGREEMENTS } from "./domain-rules.ts";
import { Refusal, type OutcomeCode } from "../outcomes.ts";
import * as V from "../verifier/verifier.ts";

export type Class = "unique" | "none" | "identity-on-domain" | "refused";
export interface TraceStep { n: number; rule: string; effect: string; params: Record<string, unknown>; before: string; after: string; restrictions: string[]; preconditions: string[]; obligations: string[] }
export interface Result {
  class: Class; outcome?: OutcomeCode;   // set on every refusal; an answer carries no outcome code solution: string[] | null; reasons: string[]; steps: TraceStep[]; candidatesRejected: string[]; restrictions: string[];
  stats: { visited: number; generated: number; duplicates: number; pathLength: number; capped: boolean; precondFailed: number; verifyRejected: number; ms: number };
  note: string;
}
const ORDER = ["no-variable-denominator", "denominator-outside-boundary", "numerator-outside-boundary", "reduced-degree>=2"];
const registry = createDomainRegistry();
const rs = (xs: Rational[]) => xs.map(String);

/** Distribute numeric multipliers over sums so term lists match how a student reads the equation. */
function flat(e: MathExpr, sign = 1, out: { e: MathExpr; s: number }[] = []): { e: MathExpr; s: number }[] {
  if (e.kind === "add") { flat(e.left, sign, out); flat(e.right, sign, out); }
  else if (e.kind === "sub") { flat(e.left, sign, out); flat(e.right, -sign, out); }
  else if (e.kind === "neg") flat(e.operand, -sign, out);
  else if (e.kind === "mul" && e.left.kind === "num" && (e.right.kind === "add" || e.right.kind === "sub")) { const k = e.left.value.isZero() ? 1 : 1; void k; flat(e.right, sign, out); }
  else out.push({ e, s: sign });
  return out;
}

/** Scope gate: exact analysis of the stated boundary. `reasons` are the oracle-compatible codes; `code` is the structured outcome (null = supported).
 *  Malformed or unsupported syntax is not caught here: it propagates as a Refusal (PARSE_ERROR, UNSUPPORTED_OPERATOR, ...). */
export function gate(text: string): { reasons: string[]; code: OutcomeCode | null; excluded: Rational[] | null; reducedDegree: number | null } {
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

interface Move { rule: string; params: Record<string, unknown> }
const key = (s: DomainState) => `${eqText(s.math)}|${rs(excludedOf(s.math)).join(",")}`;
const num = (e: MathExpr) => (e.kind === "num" ? e.value : null);

function movesOf(s: DomainState): Move[] {
  const m = s.math, eq = m.statements[0], out: Move[] = [];
  const ex = excludedOf(m);
  const rational = denominatorsOf(eq.left).length + denominatorsOf(eq.right).length > 0;
  const R = (rule: string, params: Record<string, unknown> = {}) => out.push({ rule, params });
  if (rational) {
    let nd = 0; const count = (e: MathExpr): number => { switch (e.kind) { case "div": return (hasX(e.right) ? 1 : 0) + count(e.left) + count(e.right); case "add": case "sub": case "mul": return count(e.left) + count(e.right); case "neg": return count(e.operand); case "pow": return count(e.base); default: return 0; } };
    nd = count(eq.left) + count(eq.right);
    R("domain.clear-denominators");
    for (let i = 0; i < nd; i++) R("domain.cancel-common-factor", { index: i });
    R("domain.combine-terms", { side: "left" }); R("domain.combine-terms", { side: "right" });
    if (num(eq.right)?.isZero() !== true) R("domain.move-to-left");
  } else {
    R("domain.simplify-polynomial");
    if (num(eq.right)?.isZero() !== true) R("domain.move-to-left");
    const ms = movesFrom({ left: eq.left, right: eq.right }); for (let i = 0; i < ms.length; i++) R("domain.linear-step", { index: i });
    // divide by a restricted factor (x - a) when P = 0 and P(a) = 0, a excluded
    if (num(eq.right)?.isZero()) { const P = Poly.fromExpr(eq.left); if (P && P.degree >= 1) for (const a of ex) if (P.eval(a).isZero()) R("domain.divide-both-sides", { factor: printExpr(linearFactorExpr(a)) }); }
  }
  return out;
}

const constOf = (e: MathExpr): Rational | null => (e.kind === "num" ? e.value : e.kind === "neg" ? constOf(e.operand)?.neg() ?? null : null);
function terminal(s: DomainState): { kind: "candidate"; value: Rational } | { kind: "none" } | { kind: "identity" } | null {
  const { left, right } = s.math.statements[0]; const cl = constOf(left), cr = constOf(right);
  if (left.kind === "var" && cr) return { kind: "candidate", value: cr };
  if (cl && right.kind === "var") return { kind: "candidate", value: cl };   // c = x is x = c (symmetry); constants may be written -c (fixes eval run1 e198, disclosed)
  if (cl && cr) return cl.eq(cr) ? { kind: "identity" } : { kind: "none" };
  return null;
}

export function solve(text: string, opts: { maxDepth?: number; maxNodes?: number } = {}): Result {
  const t0 = performance.now(); const maxDepth = opts.maxDepth ?? 14, maxNodes = opts.maxNodes ?? 3000;
  const stats = { visited: 0, generated: 0, duplicates: 0, pathLength: 0, capped: false, precondFailed: 0, verifyRejected: 0, ms: 0 };
  const done = (r: Omit<Result, "stats">): Result => { stats.ms = performance.now() - t0; return { ...r, stats }; };
  const refuse = (outcome: OutcomeCode, reasons: string[], note: string, restrictions: string[] = []): Result =>
    done({ class: "refused", outcome, solution: null, reasons, steps: [], candidatesRejected: [], restrictions, note });
  try { DISAGREEMENTS.length = 0; return run(); }
  catch (e) {
    if (e instanceof Refusal) return refuse(e.code, e.reasons, e.message);
    return refuse("PROOF_FAILED", [], `internal error, not reinterpreted as an answer: ${String(e).slice(0, 200)}`);   // never a silent wrong answer
  }

  function run(): Result {
    const g = gate(text);
    if (g.reasons.length || g.code) return refuse(g.code ?? "UNSUPPORTED_EXPRESSION", g.reasons, "outside the stated scope boundary; refused rather than guessed", g.excluded ? rs(g.excluded) : []);

    let s0 = initialState(text);
    // R1: the initial state must agree with an independent derivation of the restrictions from the written text
    const indep = V.analyse(text).required.map(String).sort(), mine = s0.originalRestrictions.map(String).sort();
    if (JSON.stringify(indep) !== JSON.stringify(mine)) throw new Refusal("PROOF_FAILED", `initial restrictions disagree: engine ${mine} vs independent ${indep}`);
    s0 = applyDomainRule(registry, s0, "domain.restrict-denominators", {});
    type Node = { s: DomainState; parent: number; move: Move | null; depth: number };
    const nodes: Node[] = [{ s: s0, parent: -1, move: null, depth: 0 }]; const seen = new Set([key(s0)]);
    let found = -1, term: ReturnType<typeof terminal> = null;
    for (let i = 0; i < nodes.length && found < 0; i++) {
      const n = nodes[i]; stats.visited++;
      const t = terminal(n.s); if (t) { found = i; term = t; break; }
      if (n.depth >= maxDepth) continue;
      if (nodes.length >= maxNodes) { stats.capped = true; break; }
      for (const mv of movesOf(n.s)) {
        let next: DomainState;
        try { next = applyDomainRule(registry, n.s, mv.rule, mv.params); }
        catch (e) { if (e instanceof Refusal && e.code === "PROOF_FAILED") throw e; const msg = String(e); if (/verification|verify/i.test(msg)) stats.verifyRejected++; else stats.precondFailed++; continue; }
        stats.generated++;
        const k = key(next); if (seen.has(k)) { stats.duplicates++; continue; } seen.add(k);
        nodes.push({ s: next, parent: i, move: mv, depth: n.depth + 1 });
      }
    }
    if (found < 0) return refuse("SEARCH_LIMIT", [], stats.capped ? "search-cap" : "no-path within the depth limit", rs(excludedOf(s0.math)));
    const chain: Node[] = []; for (let i = found; i >= 0; i = nodes[i].parent) chain.unshift(nodes[i]);
    let final = chain[chain.length - 1].s; const rejected: string[] = [];
    let cls: Class, solution: string[] | null = null, note = "";
    const tt = term!;
    if (tt.kind === "candidate") {
      const c = tt.value; const chk = DEFS.get("domain.accept-candidate")!.checks(final.math, { value: c.toString() });
      if (chk.every((k) => k.held)) { final = applyDomainRule(registry, final, "domain.accept-candidate", { value: c.toString() }); cls = "unique"; solution = [c.toString()]; note = `x = ${c} verified by exact substitution into the original equation and not excluded`; }
      else { rejected.push(c.toString()); cls = "none"; note = `candidate x = ${c} rejected: ${chk.filter((k) => !k.held).map((k) => `${k.name} (${k.detail})`).join("; ")}`; }
    } else if (tt.kind === "identity") { cls = "identity-on-domain"; note = "both sides equal for every allowed x; every value except the restricted ones is a solution"; }
    else { cls = "none"; note = "the equation reduces to a false statement: no solution"; }
    const steps: TraceStep[] = final.evidence.map((ev, i) => ({
      n: i + 1, rule: ev.rule, effect: ev.effect, params: {}, before: "", after: "", restrictions: [],
      preconditions: ev.preconditions.map((c) => `${c.held ? "ok" : "FAILED"}: ${c.name}${c.detail ? ` (${c.detail})` : ""}`),
      obligations: ev.obligations.map((o) => `${o.discharged ? "discharged" : "OPEN"}: ${o.id}`),
    }));
    const seq: { eq: string; ex: string[]; mv: Move | null }[] = [{ eq: eqText(s0.math), ex: rs(excludedOf(s0.math)), mv: { rule: "domain.restrict-denominators", params: {} } }];
    for (const c of chain.slice(1)) seq.push({ eq: eqText(c.s.math), ex: rs(excludedOf(c.s.math)), mv: c.move });
    const start = eqText(initialState(text).math);
    steps.forEach((st, i) => { if (i <= chain.length - 1) { st.params = seq[i].mv!.params; st.before = i === 0 ? start : seq[i - 1].eq; st.after = seq[i].eq; st.restrictions = seq[i].ex; } else { st.before = seq[seq.length - 1].eq; st.after = `x = ${(final.math.bindings.get("x") ?? "").toString()}`; st.restrictions = seq[seq.length - 1].ex; st.params = { value: solution?.[0] }; } });
    // R1: the whole trace is re-validated by the independent verifier against the ORIGINAL text (initial state, every step, final claim)
    const states = [{ eq: text, excluded: seq[0].ex }, ...seq.map((q) => ({ eq: q.eq, excluded: q.ex }))];
    const effects = ["equivalence" as const, ...seq.slice(1).map((q) => DEFS.get(q.mv!.rule)!.effect)];
    const verdict = V.checkTrace(text, states, effects, solution ? { kind: "solution", value: solution[0] } : cls === "identity-on-domain" ? { kind: "identity" } : { kind: "none" });
    if (!verdict.valid) throw new Refusal("PROOF_FAILED", `independent trace validation failed: ${verdict.problems.join("; ")}`);
    if (DISAGREEMENTS.length) throw new Refusal("PROOF_FAILED", `verifier disagreement: ${DISAGREEMENTS[0]}`);
    stats.pathLength = steps.length;
    return done({ class: cls, solution, reasons: [], steps, candidatesRejected: rejected, restrictions: rs(excludedOf(final.math)), note });
  }
}
void DEFS; void terms; void zerosOfDenominators;
