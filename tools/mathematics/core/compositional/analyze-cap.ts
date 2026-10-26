// Why did a search hit the node cap? Re-runs the SAME deterministic breadth-first search (the first N nodes of its trace) for tasks the run reports as capped, and measures
//   dupCanonical   share of distinct-text states that are the same mathematical state as an earlier one (canonical form of (L-R) reduced, restrictions) -> "repeated equivalent states"
//   cycleShare     share of generated children that are mathematically equal to an ANCESTOR of their parent (add t then subtract t, multiply then divide) -> "inverse-rule cycles"
//   growthShare    share of distinct states whose written size exceeds 3x the start's size -> "expression growth"
//   branching      mean successors per expanded state; depthReached
// Dominant cause = largest of the three ratios when above 0.30, otherwise "branching" (genuine combinatorial branching) -- thresholds stated, not tuned.
// Usage: analyze-cap.ts <ids.json> <out.json> <nodes>
import { readFileSync, writeFileSync } from "node:fs";
const C = await import("../../../../packages/learning/src/core/contenders.ts");
const K = await import("../../../../packages/learning/src/core/compose.ts");
const P = await import("../../../../packages/learning/src/core/planner.ts");
const { RatFun } = await import("../../../../packages/learning/src/reasoner/domain/poly.ts");
const { eqOf } = await import("../../../../packages/learning/src/core/verify.ts");
const D = "/home/claude/r2/tools/mathematics/r2/"; const tasks = new Map<string, any>(JSON.parse(readFileSync(D + "composition.json", "utf8")).tasks.map((t: any) => [t.id, t]));
const ids: string[] = JSON.parse(readFileSync(process.argv[2], "utf8")); const N = Number(process.argv[4] ?? 4000);
const canon = (s: any) => { const { left, right } = eqOf(s.math); const l = RatFun.fromExpr(left), r = RatFun.fromExpr(right); if (!l || !r) return "T:" + P.stateKey(s); const f = l.sub(r).reduce(); const fmt = (p: any) => p.monic().c.map(String).join(","); return (f.n.isZero() ? "0" : fmt(f.n) + "/" + fmt(f.d)) + "|" + P.stateKey(s).split("|")[1]; };
const out: any[] = [];
for (const id of ids) {
  const t = tasks.get(id)!; const allowed = new Set<string>(t.allowed); const s0 = K.begin(t.start); const st = K.fineStrategy([...allowed].filter((o) => o !== "restrict"), 8, N);
  const goal = K.goalFor(t.goal, t.start); const parent = new Map<string, string>(); const keyCanon = new Map<string, string>(); const seenCanon = new Set<string>([canon(s0)]); keyCanon.set(P.stateKey(s0), canon(s0));
  let children = 0, cycle = 0, dupCanon = 0, grown = 0, distinct = 0; const size0 = K.sizeOf(s0); const sizes: number[] = [];
  const r = P.search(s0, goal, st, { onEdge: (from, _n, to, status) => { children++; if (status === "new") parent.set(to, from); } });
  // the state objects are in r.nodes: measure after the fact
  for (const [k, n] of r.nodes) { const c = canon(n.state); keyCanon.set(k, c); }
  for (const [k, n] of r.nodes) { if (k === P.stateKey(s0)) continue; distinct++; const c = keyCanon.get(k)!; if (seenCanon.has(c)) dupCanon++; else seenCanon.add(c); const z = K.sizeOf(n.state); sizes.push(z); if (z > 3 * size0) grown++;
    let a = parent.get(k); let hops = 0, isCycle = false; const mine = c; let p = a ? parent.get(a) : undefined; while (p && hops++ < 40) { if (keyCanon.get(p) === mine) { isCycle = true; break; } p = parent.get(p); } if (isCycle) cycle++; }
  const expanded = r.stats.visited || 1; const branching = r.stats.generated / expanded;
  const dup = dupCanon / Math.max(1, distinct), cyc = cycle / Math.max(1, distinct), gro = grown / Math.max(1, distinct);
  const ratios: [string, number][] = [["repeated equivalent states", dup], ["inverse-rule cycles", cyc], ["expression growth", gro]]; ratios.sort((a, b) => b[1] - a[1]);
  const cause = ratios[0][1] >= 0.3 ? ratios[0][0] : "genuine combinatorial branching";
  sizes.sort((a, b) => a - b);
  out.push({ id, family: t.family, reachable: t.reachable, goal: t.goal, nodes: r.nodes.size, depthReached: r.stats.depth, expanded, branching: Math.round(branching * 10) / 10, dupCanonical: Math.round(dup * 100) / 100, cycleShare: Math.round(cyc * 100) / 100, growthShare: Math.round(gro * 100) / 100, startSize: size0, medianSize: sizes[sizes.length >> 1], maxSize: sizes[sizes.length - 1], cause, found: r.found });
}
writeFileSync(process.argv[3], JSON.stringify(out, null, 1)); const c: Record<string, number> = {}; for (const o of out) c[o.cause] = (c[o.cause] ?? 0) + 1; console.log(c);
