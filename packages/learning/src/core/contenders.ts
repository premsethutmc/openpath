// The contenders of the compositional challenge. All of them use the same fine-grained rule library, the same applyMove (precondition checks +
// independent per-step verification) and the same goal predicates; they differ only in HOW they choose moves.
//   planner      shared planner, best-first (size heuristic), deduplicating
//   bfs          shared planner, breadth-first (no heuristic): the exhaustive reference (P3)
//   P1           fixed-rule pipeline: cancel, clear, expand, collect, move-to-left, divide restricted factors, then a linear delegate
//   P2           fixed priority list of the operations (first applicable move); the list per goal is chosen on the tuning set only
//   P4           greedy: the move whose result has the smallest size (never revisits)
import type { Goal } from "./planner.ts";
import { applyMove, RuleFailure, search, searchBest, stateKey } from "./planner.ts";
import { library } from "./rules.ts";
import "./fine.ts";
import type { Move } from "./rule.ts";
import type { CoreState } from "./state.ts";
import { OPS, fineStrategy, goalFor, sizeOf, begin, stateOut, type RefStep } from "./compose.ts";
import { eqOf } from "./verify.ts";
import { excludedOf } from "../reasoner/domain/domain-state.ts";

export interface Run { ok: boolean; trace: RefStep[]; states: { eq: string; restr: string[] }[]; visited: number; generated: number; capped: boolean; ms: number; why?: string; unique?: number }
const opOf = (m: Move) => m.rule.opsOf(m.params)[0];
const stepOf = (m: Move): RefStep => ({ op: opOf(m), params: m.params as Record<string, unknown> });
const moves = (s: CoreState, allowed: Set<string>) => library.discover(s.math, allowed, "fine");
const attempt = (s: CoreState, m: Move): CoreState | null => { try { return applyMove(s, m); } catch (e) { if (e instanceof RuleFailure) return null; throw e; } };
const head = (allowed: Set<string>): RefStep[] => (allowed.has("restrict") ? [{ op: "restrict", params: {} }] : []);
const finish = (start: CoreState, goalName: string, text: string, trace: RefStep[], s: CoreState, st: { visited: number; generated: number; capped: boolean; unique?: number }, t0: number, states: Run["states"]): Run =>
  ({ ok: !!goalFor(goalName, text).test(s), trace, states, visited: st.visited, generated: st.generated, capped: st.capped, unique: st.unique, ms: performance.now() - t0 });

function pathRun(text: string, allowed: Set<string>, goalName: string, mode: "best" | "bfs", maxNodes = 20000, maxDepth = 8, key: "text" | "canonical" = "text"): Run {
  const t0 = performance.now(); const s0 = begin(text); const goal = goalFor(goalName, text); const st = fineStrategy([...allowed].filter((o) => o !== "restrict"), maxDepth, maxNodes, key);
  const r = mode === "bfs" ? search(s0, goal, st) : searchBest(s0, goal, st, sizeOf, 1);
  const stats = { visited: r.stats.visited, generated: r.stats.generated, capped: r.stats.capped, unique: r.nodes.size };
  if (!r.found) return { ok: false, trace: [], states: [stateOut(s0)], ...stats, ms: performance.now() - t0, why: r.why };
  const path = r.paths[0]; const trace: RefStep[] = [...head(allowed)]; const states = [stateOut(s0)];
  for (let i = 1; i < path.length; i++) { const e = path[i].edges.find((x) => x.parent === path[i - 1].key)!; trace.push(stepOf(e.move)); states.push(stateOut(path[i].state)); }
  return finish(s0, goalName, text, trace, path[path.length - 1].state, stats, t0, states);
}
export const runPlanner = (t: string, a: Set<string>, g: string, key: "text" | "canonical" = "text", cap = 20000) => pathRun(t, a, g, "best", cap, 8, key);
export const runBFS = (t: string, a: Set<string>, g: string, cap = 20000, key: "text" | "canonical" = "text") => pathRun(t, a, g, "bfs", cap, 8, key);

class Walker {
  s: CoreState; trace: RefStep[]; states: Run["states"]; seen = new Set<string>(); generated = 0; text: string; allowed: Set<string>;
  constructor(text: string, allowed: Set<string>) { this.text = text; this.allowed = allowed; this.s = begin(text); this.trace = [...head(allowed)]; this.states = [stateOut(this.s)]; this.seen.add(stateKey(this.s)); }
  take(m: Move): boolean { this.generated++; const n = attempt(this.s, m); if (!n) return false; const k = stateKey(n); if (this.seen.has(k)) return false; this.seen.add(k); this.s = n; this.trace.push(stepOf(m)); this.states.push(stateOut(n)); return true; }
  op(name: string, pick?: (m: Move) => boolean): boolean { if (!this.allowed.has(name)) return false; for (const m of moves(this.s, new Set([name]))) if ((!pick || pick(m)) && this.take(m)) return true; return false; }
}
function done(w: Walker, goal: string, t0: number, extra: Partial<Run> = {}): Run {
  return { ok: !!goalFor(goal, w.text).test(w.s), trace: w.trace, states: w.states, visited: w.trace.length, generated: w.generated, capped: false, ms: performance.now() - t0, ...extra };
}

export function runP1(text: string, allowed: Set<string>, goal: string): Run {
  const t0 = performance.now(); const w = new Walker(text, allowed);
  for (let i = 0; i < 12 && w.op("cancel-common-factor"); i++);
  w.op("clear-denominators"); w.op("expand"); w.op("collect-terms"); w.op("move-to-left");
  for (const a of excludedOf(w.s.math)) for (let i = 0; i < 4 && w.op("divide-restricted-factor", (m) => m.params.a === a.toString()); i++);
  // linear delegate: collect, move x-terms to the left and constants to the right with add/sub, divide by the coefficient, then accept
  for (let i = 0; i < 40; i++) {
    if (goalFor(goal, text).test(w.s)) break;
    const { left, right } = eqOf(w.s.math);
    if (w.op("collect-terms")) continue;
    if (w.op("add-sub-both-sides", (m) => { const t = String(m.params.term); const neg = t.startsWith("-"); const body = neg ? t.slice(1) : t; return hasXs(body) && ((!neg && true) || neg) && sideHas(right, body, neg); })) continue;
    if (w.op("add-sub-both-sides", (m) => { const t = String(m.params.term); const body = t.startsWith("-") ? t.slice(1) : t; return !hasXs(body) && sideHas(left, body, !t.startsWith("-")) && !isZeroTxt(body); })) continue;
    if (w.op("mul-div-const")) continue;
    if (w.op("accept-candidate")) continue;
    break;
  }
  return done(w, goal, t0);
}
const hasXs = (t: string) => /x/.test(t); const isZeroTxt = (t: string) => t.trim() === "0";
import { printExpr } from "../reasoner/expr-text.ts";
import { flat } from "./fine.ts";
import type { MathExpr } from "../math-kernel.ts";
const sideHas = (e: MathExpr, body: string, negated: boolean) => flat(e).some((t) => printExpr(t.t).replace(/\s+/g, "") === body.replace(/\s+/g, "") && (t.sign < 0) === negated);

export function runPriority(text: string, allowed: Set<string>, goal: string, order: string[], cap = 30): Run {
  const t0 = performance.now(); const w = new Walker(text, allowed); const g = goalFor(goal, text);
  for (let i = 0; i < cap && !g.test(w.s); i++) { let moved = false; for (const name of order) { if (w.op(name)) { moved = true; break; } } if (!moved) break; }
  return done(w, goal, t0);
}
export function runP4(text: string, allowed: Set<string>, goal: string, cap = 30): Run {
  const t0 = performance.now(); const w = new Walker(text, allowed); const g = goalFor(goal, text);
  for (let i = 0; i < cap && !g.test(w.s); i++) {
    let best: { size: number; m: Move; n: CoreState } | null = null;
    for (const m of moves(w.s, new Set([...allowed].filter((o) => o !== "restrict")))) { w.generated++; const n = attempt(w.s, m); if (!n || w.seen.has(stateKey(n))) continue; const z = sizeOf(n); if (!best || z < best.size) best = { size: z, m, n }; }
    if (!best) break; w.seen.add(stateKey(best.n)); w.s = best.n; w.trace.push(stepOf(best.m)); w.states.push(stateOut(best.n));
  }
  return done(w, goal, t0);
}
export const P1_ORDER = ["restrict", "cancel-common-factor", "clear-denominators", "expand", "collect-terms", "move-to-left", "divide-restricted-factor", "add-sub-both-sides", "mul-div-const", "combine-terms", "accept-candidate"];
export { OPS };
