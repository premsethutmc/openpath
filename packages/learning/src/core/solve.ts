// The core's solving entry point: parse -> scope -> strategy -> setup -> search -> finish (candidate acceptance) -> proof trace -> independent
// whole-trace validation. Nothing here is specific to an equation; the strategies are data (allowed operations + bounds + scope).
import { Rational } from "../math-kernel.ts";
import { Refusal, type OutcomeCode } from "../reasoner/outcomes.ts";
import { parseEq, zerosOfDenominators, denominatorsOf, excludedOf, type Evidence } from "../reasoner/domain/domain-state.ts";
import * as V from "../reasoner/verifier/verifier.ts";
import { startState, type CoreState, type Claim } from "./state.ts";
import { library } from "./rules.ts";
import { search, applyMove, movesFor, stateKey, type Goal, type Reached, type Strategy, type SearchStats, type Move, type Node } from "./planner.ts";
import { eqText, DISAGREEMENTS } from "./verify.ts";
import { linearScope, rationalScope } from "./scope.ts";
import { hasVar, tryEval } from "./tactics.ts";
import type { MathExpr } from "../math-kernel.ts";

const ops = (xs: string[]) => new Set(xs);
export const STRATEGIES: Record<string, Strategy> = {
  linear: { id: "linear", allowed: ops(["collect-terms", "expand", "add-sub-both-sides", "mul-div-const", "swap-sides"]), prune: true, maxDepth: 24, maxNodes: 100000 },
  rational: { id: "rational", allowed: ops(["restrict", "move-to-left", "combine-terms", "cancel-common-factor", "clear-denominators", "expand", "collect-terms", "add-sub-both-sides", "mul-div-const", "divide-restricted-factor", "swap-sides"]), prune: true, maxDepth: 14, maxNodes: 3000 },
};

// ---------- the SOLVE goal ----------
const constOf = (e: MathExpr): Rational | null => (e.kind === "num" ? e.value : e.kind === "neg" ? constOf(e.operand)?.neg() ?? null : null);
export const SOLVE: Goal = {
  id: "SOLVE",
  test(s) {
    const { left, right } = s.math.statements[0]; const cr = constOf(right);
    if (left.kind === "var" && cr) return { kind: "candidate", value: cr };
    if (!hasVar(left) && !hasVar(right)) { const a = tryEval(left), b = tryEval(right); if (a && b) return a.eq(b) ? { kind: "identity" } : { kind: "none" }; }
    return null;
  },
};

// ---------- results ----------
export type Class = "unique" | "none" | "identity-on-domain" | "goal-reached" | "refused";
export interface ProofStep { n: number; rule: string; name: string; effect: string; params: Record<string, unknown>; before: string; after: string; restrictions: string[]; preconditions: string[]; obligations: string[]; action: string }
export interface CoreResult {
  class: Class; outcome?: OutcomeCode;   // outcome is set on every refusal; an answer carries none
  solution: string[] | null; reasons: string[]; steps: ProofStep[]; alternatives: ProofStep[][]; candidatesRejected: string[]; restrictions: string[];
  stats: SearchStats & { pathLength: number }; note: string; strategy: string; final?: CoreState;
}
const rs = (xs: Rational[]) => xs.map(String);

export interface SolveOptions { strategy?: "auto" | keyof typeof STRATEGIES | Strategy; goal?: Goal; alternatives?: number; maxDepth?: number; maxNodes?: number; onEdge?: Parameters<typeof search>[3] extends infer O ? O extends { onEdge?: infer F } ? F : never : never }

/** Pick a strategy from the written problem: no x in a denominator -> linear, otherwise rational. A choice among declared strategies, not a pipeline. */
export function chooseStrategy(text: string): Strategy {
  const { left, right } = parseEq(text);
  return denominatorsOf(left).length + denominatorsOf(right).length === 0 ? STRATEGIES.linear : STRATEGIES.rational;
}

export function solve(text: string, opts: SolveOptions = {}): CoreResult {
  const t0 = performance.now();
  const blank: SearchStats = { visited: 0, generated: 0, duplicates: 0, depth: 0, capped: false, precondFailed: 0, verifyRejected: 0, ms: 0 };
  const refuse = (outcome: OutcomeCode, reasons: string[], note: string, strategy: string, stats = blank, restrictions: string[] = []): CoreResult =>
    ({ class: "refused", outcome, solution: null, reasons, steps: [], alternatives: [], candidatesRejected: [], restrictions, stats: { ...stats, ms: performance.now() - t0, pathLength: 0 }, note, strategy });
  let strategyId = "?";
  try {
    DISAGREEMENTS.length = 0;
    let st: Strategy = typeof opts.strategy === "object" ? opts.strategy : opts.strategy && opts.strategy !== "auto" ? STRATEGIES[opts.strategy] : chooseStrategy(text);
    st = { ...st, maxDepth: opts.maxDepth ?? st.maxDepth, maxNodes: opts.maxNodes ?? st.maxNodes }; strategyId = st.id;
    // scope: each strategy states what it treats exactly
    if (st.id === "linear") {
      const { left, right } = parseEq(text); const why = linearScope({ left, right });
      if (why) return refuse("UNSUPPORTED_EXPRESSION", [why], why, st.id);
    } else {
      const g = rationalScope(text);
      if (g.reasons.length || g.code) return refuse(g.code ?? "UNSUPPORTED_EXPRESSION", g.reasons, "outside the stated scope boundary; refused rather than guessed", st.id, blank, g.excluded ? rs(g.excluded) : []);
    }
    const init = startState(text);
    // the initial state must agree with an independent derivation of the restrictions from the written text
    const indep = V.analyse(text).required.map(String).sort(), mine = init.originalRestrictions.map(String).sort();
    if (JSON.stringify(indep) !== JSON.stringify(mine)) throw new Refusal("PROOF_FAILED", `initial restrictions disagree: engine ${mine} vs independent ${indep}`);
    // setup: state the domain explicitly as the first verified step whenever the problem has restrictions
    let s0 = init; const setupSteps: ProofStep[] = [];
    if (init.originalRestrictions.length) { const m: Move = { rule: library.get("core.restrict"), params: {}, name: "restrict" }; const t = applyMove(s0, m); setupSteps.push(stepOf(1, m, s0, t)); s0 = t; }
    const goal = opts.goal ?? SOLVE;
    const r = search(s0, goal, st, { alternatives: opts.alternatives, onEdge: opts.onEdge });
    if (!r.found) return refuse("SEARCH_LIMIT", [], r.stats.capped ? "node cap reached" : `no solution path within depth ${st.maxDepth}`, st.id, r.stats, rs(excludedOf(s0.math)));
    // proof trace(s): the setup step(s), then one step per edge of the path
    const trace = (path: Node[]): { steps: ProofStep[]; final: CoreState } => {
      const steps = [...setupSteps];
      for (let i = 1; i < path.length; i++) { const e = path[i].edges.find((x) => x.parent === path[i - 1].key)!; steps.push(stepOf(steps.length + 1, e.move, path[i - 1].state, path[i].state)); }
      return { steps, final: path[path.length - 1].state };
    };
    const primary = trace(r.paths[0]);
    let final = primary.final; let steps = primary.steps;
    const rejected: string[] = []; let cls: Class; let solution: string[] | null = null; let note = ""; let claim: Claim;
    const reached = r.reached as Reached;
    if (reached.kind === "candidate") {
      const acc: Move = { rule: library.get("core.accept-candidate"), params: { value: reached.value.toString() }, name: "accept-candidate" };
      const chk = acc.rule.checks(final.math, acc.params);
      if (chk.every((k) => k.held)) { const fin2 = applyMove(final, acc); steps = [...steps, stepOf(steps.length + 1, acc, final, fin2)]; final = fin2; cls = "unique"; solution = [reached.value.toString()]; claim = { kind: "solution", value: solution[0] }; note = `x = ${reached.value} verified by exact substitution into the original equation and not excluded`; }
      else { rejected.push(reached.value.toString()); cls = "none"; claim = { kind: "none" }; note = `candidate x = ${reached.value} rejected: ${chk.filter((k) => !k.held).map((k) => `${k.name} (${k.detail})`).join("; ")}`; }
    } else if (reached.kind === "identity") { cls = "identity-on-domain"; claim = { kind: "identity" }; note = "both sides equal for every allowed x; every value except the restricted ones is a solution"; }
    else if (reached.kind === "none") { cls = "none"; claim = { kind: "none" }; note = "the equation reduces to a false statement: no solution"; }
    else { cls = "goal-reached"; claim = { kind: "state" }; note = `goal ${goal.id} reached`; }
    // the whole trace is re-validated by the independent verifier against the ORIGINAL text: initial state, every step, final claim
    validate(text, init, steps, claim);
    if (DISAGREEMENTS.length) throw new Refusal("PROOF_FAILED", `verifier disagreement: ${DISAGREEMENTS[0]}`);
    const alternatives = r.paths.slice(1).map((p) => trace(p).steps);
    const result: CoreResult = { class: cls, solution, reasons: [], steps, alternatives, candidatesRejected: rejected, restrictions: rs(excludedOf(final.math)), stats: { ...r.stats, ms: performance.now() - t0, pathLength: steps.length }, note, strategy: st.id };
    Object.defineProperty(result, "final", { value: final, enumerable: false });   // the live state (exact rationals) is not part of the serialisable result
    return result;
  } catch (e) {
    if (e instanceof Refusal) return refuse(e.code, e.reasons, e.message, strategyId);
    return refuse("PROOF_FAILED", [], `internal error, not reinterpreted as an answer: ${String(e).slice(0, 200)}`, strategyId);   // never a silent wrong answer
  }
}

// ---------- proof steps and independent whole-trace validation ----------
function stepOf(n: number, m: Move, before: CoreState, after: CoreState): ProofStep {
  const ev: Evidence = after.evidence[after.evidence.length - 1];
  return {
    n, rule: m.rule.id, name: m.name, effect: m.rule.effect, params: m.params, before: eqText(before.math), after: eqText(after.math), restrictions: rs(excludedOf(after.math)),
    preconditions: ev.preconditions.map((c) => `${c.held ? "ok" : "FAILED"}: ${c.name}${c.detail ? ` (${c.detail})` : ""}`),
    obligations: ev.obligations.map((o) => `${o.discharged ? "discharged" : "OPEN"}: ${o.id}`),
    action: m.rule.action(before.math, after.math, m.params),
  };
}
function validate(text: string, init: CoreState, steps: ProofStep[], claim: Claim): void {
  const states = [{ eq: text, excluded: rs(excludedOf(init.math)) }, ...steps.map((q) => ({ eq: q.after, excluded: q.restrictions }))];
  const verdict = V.checkTrace(text, states, steps.map((q) => q.effect as "equivalence" | "implication"), claim);
  if (!verdict.valid) throw new Refusal("PROOF_FAILED", `independent trace validation failed: ${verdict.problems.join("; ")}`);
}
export { movesFor, stateKey };
