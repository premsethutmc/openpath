// K05.1's public interface, now a thin view over the core planner (core/planner.ts) with the "linear" strategy.
// The moves, the search loop, the verification and the trace all come from the core; this file only maps the core's result onto the
// K05.1 result shape (outcome names, step records, search statistics) that K05.1's callers and frozen results use.
import { printExpr } from "./expr-text.ts";
import { Refusal } from "./outcomes.ts";
import { solve } from "../core/solve.ts";
import type { Eq } from "../core/tactics.ts";
import { tryEval } from "../core/tactics.ts";
import { parseExpr } from "./expr-text.ts";

export type { Eq };
export interface TraceStep { rule: string; explain: string; to: string }
export type Outcome = "solved" | "no-solution" | "identity" | "unsupported" | "not-found";
export interface PlanResult {
  outcome: Outcome;
  reason: string;
  answer: string | null;
  steps: TraceStep[];
  stats: { visited: number; generated: number; duplicates: number; depth: number; capped: boolean };
  visitLog?: { from: string; rule: string; to: string; status: "new" | "duplicate" }[];
}

export function plan(text: string, opts: { maxDepth?: number; maxNodes?: number; log?: boolean } = {}): PlanResult {
  const parts = text.split("=");
  if (parts.length !== 2) throw new Refusal("PARSE_ERROR", `not an equation: ${text}`);
  parseExpr(parts[0]); parseExpr(parts[1]);   // malformed text is a structured refusal, thrown
  const visitLog: NonNullable<PlanResult["visitLog"]> = [];
  const r = solve(text, { strategy: "linear", maxDepth: opts.maxDepth ?? 24, maxNodes: opts.maxNodes ?? 100000, onEdge: opts.log ? (from, rule, to, status) => visitLog.push({ from: from.split("|")[0], rule, to: to.split("|")[0], status }) : undefined });
  const s = r.stats, stats = { visited: s.visited, generated: s.generated, duplicates: s.duplicates, depth: s.depth, capped: s.capped };
  const log = opts.log ? { visitLog } : {};
  if (r.class === "refused") {
    if (r.outcome === "SEARCH_LIMIT") return { outcome: "not-found", reason: r.note, answer: null, steps: [], stats, ...log };
    if (r.outcome === "UNSUPPORTED_EXPRESSION") return { outcome: "unsupported", reason: r.note, answer: null, steps: [], stats, ...log };
    throw new Refusal(r.outcome ?? "PROOF_FAILED", r.note);
  }
  const steps: TraceStep[] = r.steps.filter((x) => x.rule !== "core.accept-candidate").map((x) => ({ rule: x.name, explain: x.action, to: x.after }));
  const fin = r.final!.math.statements[0];
  if (r.class === "unique") return { outcome: "solved", reason: "x isolated", answer: printExpr(fin.right), steps, stats, ...log };
  if (r.class === "identity-on-domain") return { outcome: "identity", reason: "both sides equal for every x", answer: null, steps, stats, ...log };
  const a = tryEval(fin.left), b = tryEval(fin.right);
  return { outcome: "no-solution", reason: `reduces to ${a!.toString()} = ${b!.toString()}, which is false for every x`, answer: null, steps, stats, ...log };
}
