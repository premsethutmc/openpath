// Deterministic resource limits. A computation that exceeds them REFUSES (Refusal "SEARCH_LIMIT"), which every engine reports as "unsupported";
// it never returns a mathematical conclusion (never "not divisible", "not identical" or "equal" because it ran out of budget).
// The budget counts abstract operations (term products, long-division steps), not time, so the outcome is the same on every machine.
import { Refusal } from "../reasoner/outcomes.ts";
export const LIMITS = { ops: 3_000_000, maxLines: 40, maxChars: 400, maxNesting: 40 } as const;
let used = 0; let cap: number = LIMITS.ops; let tripped = false; let depth = 0;
let defaultOps: number = LIMITS.ops;
/** test hook: lets the limit tests run the same corpus under a deliberately tiny budget */
export function setDefaultOps(n: number): void { defaultOps = n; }
export function resetBudget(ops: number = defaultOps): void { used = 0; cap = ops; tripped = false; }
export function budgetTripped(): boolean { return tripped; }
export function spend(n: number): void { if (depth === 0) return; used += n; if (used > cap) { tripped = true; throw new Refusal("SEARCH_LIMIT", `resource limit reached (${cap} operations)`); } }
/** input-size gate used by the unified API before any parsing */
export function inputWithinLimits(problem: string, lines: string[]): boolean {
  const nest = (s: string) => { let d = 0, m = 0; for (const c of s) { if (c === "(" || c === "[") m = Math.max(m, ++d); else if (c === ")" || c === "]") d--; } return m; };
  return lines.length <= LIMITS.maxLines && problem.length <= LIMITS.maxChars && lines.every((l) => l.length <= LIMITS.maxChars) && nest(problem) <= LIMITS.maxNesting && lines.every((l) => nest(l) <= LIMITS.maxNesting);
}
/** Runs `f` inside a budget scope. The OUTERMOST scope resets the budget; nested calls share it. Outside any scope `spend` is a no-op, so a direct call to an
 *  inner function can never inherit an exhausted budget. The tripped flag stays readable until the next outermost scope starts. */
export function bounded<T>(f: () => T): T { if (depth === 0) resetBudget(); depth++; try { return f(); } finally { depth--; } }
