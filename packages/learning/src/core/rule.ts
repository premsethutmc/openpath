// The unified rule contract and the library the planner discovers rules in.
// A rule declares: when it could apply (match: state patterns -> parameter sets), what must hold for those parameters (checks: exact
// preconditions), what it does (apply), the logical effect of the step (equivalence or implication), the operations of the shared vocabulary
// it embodies (opsOf, used by strategies to allow or forbid it), what it introduces (proof obligations), and how it is verified.
// Rules know nothing about any particular equation, goal, strategy or other rule.
import type { MathState, MathRule } from "../math-kernel.ts";
import type { Effect } from "../reasoner/domain/domain-state.ts";
import type { CoreState } from "./state.ts";

export type Params = Record<string, unknown>;
export interface Check { name: string; held: boolean; detail: string }
export interface CoreRule {
  id: string;
  level?: "macro" | "fine" | "both";                   // granularity: macro rules (K05.1/K05.2 tidy-ups) or fine single-step rules; strategies choose a level
  opsOf(p: Params): string[];                       // vocabulary operations this application embodies (strategy filter)
  effect: Effect;
  eager?: number;                                   // confluent tier (information-preserving tidy-up); only used when a strategy enables pruning
  introduces?: "candidate-check";                   // an implication step opens a proof obligation: the result is only a set of candidates
  description: string; principle: string;
  match(s: MathState): Params[];                    // pattern discovery: parameter sets worth trying, in a deterministic order
  checks(s: MathState, p: Params): Check[];         // exact preconditions
  apply(s: MathState, p: Params): MathState;
  name?(p: Params): string;                         // short name of this application in traces
  action(s: MathState, after: MathState, p: Params): string;
  verify?(before: MathState, after: MathState, p: Params): boolean;   // extra rule-specific check; the effect check by the independent verifier always runs
  bookkeeping?(s: CoreState, p: Params): Partial<CoreState>;
}
export interface Move { rule: CoreRule; params: Params; name: string }

export class RuleLibrary {
  private rules: CoreRule[] = [];
  register(r: CoreRule): this { if (this.rules.some((x) => x.id === r.id)) throw new Error(`rule already registered: ${r.id}`); this.rules.push(r); return this; }
  get(id: string): CoreRule { const r = this.rules.find((x) => x.id === id); if (!r) throw new Error(`unknown rule ${id}`); return r; }
  all(): readonly CoreRule[] { return this.rules; }
  /** Every candidate application of every allowed rule to the state, in registration order. `allowed` = vocabulary operations (undefined: all). */
  discover(s: MathState, allowed?: ReadonlySet<string>, level: "macro" | "fine" = "macro"): Move[] {
    const out: Move[] = [];
    for (const rule of this.rules) if (rule.level === "both" || (rule.level ?? "macro") === level) for (const params of rule.match(s)) {
      if (allowed && !rule.opsOf(params).every((o) => allowed.has(o))) continue;
      out.push({ rule, params, name: rule.name ? rule.name(params) : rule.id.replace(/^core\./, "") });
    }
    return out;
  }
  /** Adapter to the kernel's MathRule contract (the kernel registry stays the base contract; discovery is the extension). */
  toKernelRules(verifyEffect: (effect: Effect, a: MathState, b: MathState) => boolean): MathRule[] {
    return this.rules.map((d) => ({
      id: d.id, appliesTo: ["equation"], description: d.description,
      precondition: (s, p) => { const bad = d.checks(s, p).find((c) => !c.held); return bad ? `${bad.name} (${bad.detail})` : null; },
      apply: d.apply,
      verify: (a, b, p) => (d.verify ? d.verify(a, b, p) : true) && verifyEffect(d.effect, a, b),
      explain: (a, b, p) => ({ principle: d.principle, action: d.action(a, b, p), justification: d.principle, beforeText: "", afterText: "" }),
    }));
  }
}
