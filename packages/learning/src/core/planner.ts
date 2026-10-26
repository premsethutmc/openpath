// THE reasoning planner. One search loop, one rule library, one verification path, for every supported capability.
// What it does:   discover (which rules match the state, restricted by the strategy's allowed operations) -> generate candidate states (each rule
//                 application is precondition-checked, applied, and verified by the independent verifier) -> deduplicate -> bounded breadth-first
//                 search for the nearest state satisfying the GOAL -> alternative shortest paths -> structured refusal when no verified path exists.
// What it does not: know any equation, any fixed operation order, or any answer. Strategies only choose WHICH operations are allowed and the
//                 search bounds; confluent pruning (eager tidy-up tiers) is an explicit, switchable strategy option, off by default.
import { Rational } from "../math-kernel.ts";
import { Refusal } from "../reasoner/outcomes.ts";
import { excludedOf, constraintOf, type Violation, type Evidence } from "../reasoner/domain/domain-state.ts";
import type { CoreState } from "./state.ts";
import { library } from "./rules.ts";
import type { Move, Params } from "./rule.ts";
import { eqText, verifyStep } from "./verify.ts";

export class RuleFailure extends Error { readonly kind: "precondition" | "verification"; constructor(kind: "precondition" | "verification", detail: string) { super(`${kind}: ${detail}`); this.kind = kind; } }
const inSet = (v: Rational, xs: Rational[]) => xs.some((u) => u.eq(v));

/** Apply one move to a state: exact preconditions -> transformation -> independent verification -> evidence. Throws RuleFailure when a precondition or the verification fails. */
export function applyMove(ds: CoreState, m: Move): CoreState {
  const checks = m.rule.checks(ds.math, m.params);
  const bad = checks.find((c) => !c.held);
  if (bad) throw new RuleFailure("precondition", `${bad.name} (${bad.detail})`);
  const after = m.rule.apply(ds.math, m.params);
  if (m.rule.verify && !m.rule.verify(ds.math, after, m.params)) throw new RuleFailure("verification", `${m.rule.id} rule check`);
  const { ok, violations } = verifyStep(m.rule.effect, ds.math, after);
  if (!ok) throw new RuleFailure("verification", `independent verifier rejects: ${violations.join(", ")}`);
  const step = ds.evidence.length + 1, v = (x: Violation) => violations.includes(x);
  const evidence: Evidence = {
    step, rule: m.rule.id, effect: m.rule.effect, preconditions: checks,
    obligations: [
      { id: "I1-restrictions-retained", kind: "restriction", discharged: !v("restriction-dropped"), how: "every earlier restriction is still present (exact set inclusion)" },
      { id: "I2-denominators-restricted", kind: "restriction", discharged: !v("restriction-closure-violated"), how: "every zero of every denominator is in the restrictions (exact polynomial roots)" },
      { id: "I3-original-contained", kind: "restriction", discharged: !v("original-restriction-lost"), how: "the original restrictions are contained in the current ones" },
      { id: m.rule.effect === "equivalence" ? "solution-set-equal" : "solution-set-superset", kind: "solution-set", discharged: !v("solution-set-changed") && !v("solution-set-lost"), how: "reduced numerator, restricted factors removed, squarefree comparison (exact)" },
      { id: "independent-verifier-accepts", kind: "verification", discharged: true, how: "separate parser, polynomial code, restriction extraction and real-solution-set algebra (verifier.ts)" },
    ],
  };
  const known = ds.restrictions, now = excludedOf(after);
  const restrictions = [...known, ...now.filter((x) => !inSet(x, known.map((r) => r.value))).map((x) => ({ expr: constraintOf(x).expr, value: x, origin: m.rule.id, step }))];
  let next: CoreState = { ...ds, math: after, restrictions, evidence: [...ds.evidence, evidence] };
  if (m.rule.introduces) next = { ...next, obligations: [...next.obligations, { id: `${m.rule.introduces}@${step}`, kind: m.rule.introduces, opened: step }] };
  if (m.rule.bookkeeping) next = { ...next, ...m.rule.bookkeeping(next, m.params) };
  return next;
}

// ---------- goals ----------
export type Reached = { kind: "candidate"; value: Rational } | { kind: "none" } | { kind: "identity" } | { kind: "state" };
export interface Goal { id: string; test(s: CoreState): Reached | null }

// ---------- strategies ----------
export interface Strategy {
  id: string;
  allowed: ReadonlySet<string>;     // vocabulary operations the planner may use
  level?: "macro" | "fine";        // rule granularity (default macro)
  prune: boolean;                   // confluent pruning: if an information-preserving tidy-up applies, offer only the highest-priority tier
  maxDepth: number; maxNodes: number;
}
export interface SearchStats { visited: number; generated: number; duplicates: number; depth: number; capped: boolean; precondFailed: number; verifyRejected: number; ms: number }
export interface Edge { parent: string; move: Move }
export interface Node { key: string; state: CoreState; depth: number; edges: Edge[] }
export interface SearchResult {
  found: boolean; reached?: Reached; goalNode?: Node;
  paths: Node[][];                  // up to `alternatives` distinct shortest paths (state sequences from the start); empty when not found
  edgesOf: (n: Node) => Edge[];
  nodes: Map<string, Node>; stats: SearchStats; why: "goal" | "depth" | "nodes" | "exhausted";
}
export const stateKey = (s: CoreState) => `${eqText(s.math)}|${excludedOf(s.math).map(String).join(",")}`;

/** Which moves does the strategy see in this state? Applies the optional confluent-pruning tiers. */
export function movesFor(s: CoreState, st: Strategy): Move[] {
  const all = library.discover(s.math, st.allowed, st.level);
  if (!st.prune) return all;
  const tiers = [...new Set(all.filter((m) => m.rule.eager !== undefined).map((m) => m.rule.eager!))].sort((a, b) => a - b);
  return tiers.length ? all.filter((m) => m.rule.eager === tiers[0]) : all;
}

export function search(start: CoreState, goal: Goal, st: Strategy, opts: { alternatives?: number; onEdge?: (from: string, name: string, to: string, status: "new" | "duplicate") => void } = {}): SearchResult {
  const t0 = performance.now(); const stats: SearchStats = { visited: 0, generated: 0, duplicates: 0, depth: 0, capped: false, precondFailed: 0, verifyRejected: 0, ms: 0 };
  const alts = Math.max(1, opts.alternatives ?? 1);
  const nodes = new Map<string, Node>(); const k0 = stateKey(start);
  const root: Node = { key: k0, state: start, depth: 0, edges: [] }; nodes.set(k0, root);
  const finish = (found: boolean, why: SearchResult["why"], goalNodes: { node: Node; reached: Reached }[]): SearchResult => {
    stats.ms = performance.now() - t0;
    const paths: Node[][] = [];
    if (found) {
      const walk = (n: Node, tail: Node[]) => { if (paths.length >= alts) return; if (!n.edges.length) { paths.push([n, ...tail]); return; } for (const e of n.edges) walk(nodes.get(e.parent)!, [n, ...tail]); };
      for (const g of goalNodes) walk(g.node, []);
    }
    return { found, reached: goalNodes[0]?.reached, goalNode: goalNodes[0]?.node, paths, edgesOf: (n) => n.edges, nodes, stats, why };
  };
  const r0 = goal.test(start); if (r0) return finish(true, "goal", [{ node: root, reached: r0 }]);
  let frontier = [k0];
  for (let depth = 1; depth <= st.maxDepth && frontier.length; depth++) {
    const next: string[] = []; const hits: { node: Node; reached: Reached }[] = [];
    for (const k of frontier) {
      stats.visited++;
      const node = nodes.get(k)!;
      for (const mv of movesFor(node.state, st)) {
        stats.generated++;
        let ns: CoreState;
        try { ns = applyMove(node.state, mv); }
        catch (e) { if (e instanceof RuleFailure) { if (e.kind === "verification") stats.verifyRejected++; else stats.precondFailed++; continue; } throw e; }
        const tk = stateKey(ns); const known = nodes.get(tk);
        if (known) { stats.duplicates++; opts.onEdge?.(k, mv.name, tk, "duplicate"); if (known.depth === depth && alts > 1) known.edges.push({ parent: k, move: mv }); continue; }
        const nn: Node = { key: tk, state: ns, depth, edges: [{ parent: k, move: mv }] }; nodes.set(tk, nn); stats.depth = depth; opts.onEdge?.(k, mv.name, tk, "new");
        const t = goal.test(ns);
        if (t) { if (alts === 1) return finish(true, "goal", [{ node: nn, reached: t }]); hits.push({ node: nn, reached: t }); continue; }
        next.push(tk);
        if (nodes.size > st.maxNodes) { stats.capped = true; return finish(false, "nodes", []); }
      }
    }
    if (hits.length) return finish(true, "goal", hits);
    frontier = next;
  }
  return finish(false, frontier.length ? "depth" : "exhausted", []);
}

/** Best-first variant of the same search: identical rule discovery, application, verification and deduplication; only the order in which states are expanded
 *  differs (f = depth + weight * heuristic). Not optimal; it exists to reduce search effort, and returns the path it found. */
export function searchBest(start: CoreState, goal: Goal, st: Strategy, h: (s: CoreState) => number, weight = 1): SearchResult {
  const t0 = performance.now(); const stats: SearchStats = { visited: 0, generated: 0, duplicates: 0, depth: 0, capped: false, precondFailed: 0, verifyRejected: 0, ms: 0 };
  const nodes = new Map<string, Node>(); const k0 = stateKey(start); const root: Node = { key: k0, state: start, depth: 0, edges: [] }; nodes.set(k0, root);
  const done = (found: boolean, why: SearchResult["why"], n?: Node, reached?: Reached): SearchResult => {
    stats.ms = performance.now() - t0; const paths: Node[][] = [];
    if (found && n) { const p: Node[] = [n]; let c = n; while (c.edges.length) { c = nodes.get(c.edges[0].parent)!; p.unshift(c); } paths.push(p); }
    return { found, reached, goalNode: n, paths, edgesOf: (x) => x.edges, nodes, stats, why };
  };
  const r0 = goal.test(start); if (r0) return done(true, "goal", root, r0);
  const open: { f: number; seq: number; key: string }[] = [{ f: weight * h(start), seq: 0, key: k0 }]; let seq = 1;
  const pop = () => { let b = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[b].f || (open[i].f === open[b].f && open[i].seq < open[b].seq)) b = i; return open.splice(b, 1)[0]; };
  while (open.length) {
    const cur = pop(); const node = nodes.get(cur.key)!; if (node.depth >= st.maxDepth) continue; stats.visited++;
    for (const mv of movesFor(node.state, st)) {
      stats.generated++; let ns: CoreState;
      try { ns = applyMove(node.state, mv); } catch (e) { if (e instanceof RuleFailure) { if (e.kind === "verification") stats.verifyRejected++; else stats.precondFailed++; continue; } throw e; }
      const tk = stateKey(ns); if (nodes.has(tk)) { stats.duplicates++; continue; }
      const nn: Node = { key: tk, state: ns, depth: node.depth + 1, edges: [{ parent: cur.key, move: mv }] }; nodes.set(tk, nn); stats.depth = Math.max(stats.depth, nn.depth);
      const t = goal.test(ns); if (t) return done(true, "goal", nn, t);
      if (nodes.size > st.maxNodes) { stats.capped = true; return done(false, "nodes"); }
      open.push({ f: nn.depth + weight * h(ns), seq: seq++, key: tk });
    }
  }
  return done(false, "exhausted");
}
export type { Params, Move };
export { Refusal };
