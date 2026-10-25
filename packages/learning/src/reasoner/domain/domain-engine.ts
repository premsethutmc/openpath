// K05.2 stage D3: search over the registered domain rules. No equation-specific templates, no stored answers.
// Flow: refusal gate (stated scope boundary, exact analysis) -> restrict denominators -> BFS over applicable rules -> terminal test -> candidate check by
// exact substitution into the ORIGINAL equation. Every step goes through the kernel registry (preconditions + exact verification).
import { Rational, type MathExpr } from "../../math-kernel.ts";
import { printExpr } from "../expr-text.ts";
import { movesFrom } from "../planner.ts";
import { Poly, RatFun, OutsideBoundary } from "./poly.ts";
import { initialState, excludedOf, eqText, zerosOfDenominators, denominatorsOf, hasX, linearFactorExpr, parseEq, type DomainState } from "./domain-state.ts";
import { createDomainRegistry, applyDomainRule, DEFS, terms } from "./domain-rules.ts";

export type Class = "unique" | "none" | "identity-on-domain" | "refused";
export interface TraceStep { n: number; rule: string; effect: string; params: Record<string, unknown>; before: string; after: string; restrictions: string[]; preconditions: string[]; obligations: string[] }
export interface Result {
  class: Class; solution: string[] | null; reasons: string[]; steps: TraceStep[]; candidatesRejected: string[]; restrictions: string[];
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

/** Scope gate: exact analysis of the stated boundary. Returns the reason codes (empty = supported). */
export function gate(text: string): { reasons: string[]; excluded: Rational[] | null; reducedDegree: number | null } {
  const { left, right } = parseEq(text); const reasons = new Set<string>();
  let excluded: Rational[] | null = null;
  try { excluded = [...zerosOfDenominators(left), ...zerosOfDenominators(right)]; } catch (e) { if (e instanceof OutsideBoundary) reasons.add("denominator-outside-boundary"); else throw e; }
  const dens = [...denominatorsOf(left), ...denominatorsOf(right)];
  if (dens.length === 0) reasons.add("no-variable-denominator");
  for (const side of [left, right]) for (const t of flat(side)) {
    const ds = denominatorsOf(t.e);
    if (ds.length) { let deg = 0; for (const d of ds) { const p = Poly.fromExpr(d); if (!p) { reasons.add("denominator-outside-boundary"); continue; } deg += p.degree; } if (deg > 3) reasons.add("denominator-outside-boundary"); }
    const f = RatFun.fromExpr(t.e);
    if (!f) { reasons.add("numerator-outside-boundary"); continue; }
    const n = f.n; if (n.degree > 2 || (n.degree === 2 && !n.splitLinear())) reasons.add("numerator-outside-boundary");
  }
  let reducedDegree: number | null = null;
  if (excluded) {
    const l = RatFun.fromExpr(left), r = RatFun.fromExpr(right);
    if (l && r) { const f = l.sub(r).reduce(); reducedDegree = f.n.isZero() ? -1 : f.n.degree; if (reducedDegree >= 2) reasons.add("reduced-degree>=2"); }
  }
  return { reasons: ORDER.filter((r) => reasons.has(r)), excluded, reducedDegree };
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

function terminal(s: DomainState): { kind: "candidate"; value: Rational } | { kind: "none" } | { kind: "identity" } | null {
  const { left, right } = s.math.statements[0];
  if (left.kind === "var" && right.kind === "num") return { kind: "candidate", value: right.value };
  if (left.kind === "num" && right.kind === "num") return left.value.eq(right.value) ? { kind: "identity" } : { kind: "none" };
  return null;
}

export function solve(text: string, opts: { maxDepth?: number; maxNodes?: number } = {}): Result {
  const t0 = performance.now(); const maxDepth = opts.maxDepth ?? 14, maxNodes = opts.maxNodes ?? 3000;
  const stats = { visited: 0, generated: 0, duplicates: 0, pathLength: 0, capped: false, precondFailed: 0, verifyRejected: 0, ms: 0 };
  const done = (r: Omit<Result, "stats">): Result => { stats.ms = performance.now() - t0; return { ...r, stats }; };
  const g = gate(text);
  if (g.reasons.length) return done({ class: "refused", solution: null, reasons: g.reasons, steps: [], candidatesRejected: [], restrictions: g.excluded ? rs(g.excluded) : [], note: "outside the stated scope boundary; refused rather than guessed" });

  let s0 = initialState(text);
  s0 = applyDomainRule(registry, s0, "domain.restrict-denominators", {});
  const path: { move: Move; state: DomainState }[] = [];
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
      catch (e) { const msg = String(e); if (/verification|verify/i.test(msg)) stats.verifyRejected++; else stats.precondFailed++; continue; }
      stats.generated++;
      const k = key(next); if (seen.has(k)) { stats.duplicates++; continue; } seen.add(k);
      nodes.push({ s: next, parent: i, move: mv, depth: n.depth + 1 });
    }
  }
  if (found < 0) return done({ class: "refused", solution: null, reasons: [], steps: [], candidatesRejected: [], restrictions: rs(excludedOf(s0.math)), note: stats.capped ? "search-cap" : "no-path" });
  const chain: Node[] = []; for (let i = found; i >= 0; i = nodes[i].parent) chain.unshift(nodes[i]);
  let final = chain[chain.length - 1].s; const rejected: string[] = [];
  let cls: Class, solution: string[] | null = null, note = "";
  const tt = term!;
  if (tt.kind === "candidate") {
    const c = tt.value;
    try { final = applyDomainRule(registry, final, "domain.accept-candidate", { value: c.toString() }); cls = "unique"; solution = [c.toString()]; note = `x = ${c} verified by exact substitution into the original equation and not excluded`; }
    catch { rejected.push(c.toString()); cls = "none"; note = `candidate x = ${c} rejected: it is excluded by the original domain or fails the original equation`; }
  } else if (tt.kind === "identity") { cls = "identity-on-domain"; note = "both sides equal for every allowed x; every value except the restricted ones is a solution"; }
  else { cls = "none"; note = "the equation reduces to a false statement: no solution"; }
  const steps: TraceStep[] = final.evidence.map((ev, i) => ({
    n: i + 1, rule: ev.rule, effect: ev.effect, params: {}, before: "", after: "", restrictions: [],
    preconditions: ev.preconditions.map((c) => `${c.held ? "ok" : "FAILED"}: ${c.name}${c.detail ? ` (${c.detail})` : ""}`),
    obligations: ev.obligations.map((o) => `${o.discharged ? "discharged" : "OPEN"}: ${o.id}`),
  }));
  // fill before/after/params from the search chain (restrict step first)
  const seq: { eq: string; ex: string[]; mv: Move | null }[] = [{ eq: eqText(s0.math), ex: rs(excludedOf(s0.math)), mv: { rule: "domain.restrict-denominators", params: {} } }];
  for (const c of chain.slice(1)) seq.push({ eq: eqText(c.s.math), ex: rs(excludedOf(c.s.math)), mv: c.move });
  const start = eqText(initialState(text).math);
  steps.forEach((st, i) => { if (i <= chain.length - 1) { st.params = seq[i].mv!.params; st.before = i === 0 ? start : seq[i - 1].eq; st.after = seq[i].eq; st.restrictions = seq[i].ex; } else { st.before = seq[seq.length - 1].eq; st.after = `x = ${(final.math.bindings.get("x") ?? "").toString()}`; st.restrictions = seq[seq.length - 1].ex; st.params = { value: solution?.[0] }; } });
  stats.pathLength = steps.length;
  return done({ class: cls, solution, reasons: [], steps, candidatesRejected: rejected, restrictions: rs(excludedOf(final.math)), note });
}
void DEFS; void terms; void zerosOfDenominators;
