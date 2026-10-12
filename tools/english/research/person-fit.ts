/**
 * node tools/english/research/person-fit.ts
 * Research only: does a person-fit statistic separate the random guesser (L9) from other learners,
 * including learners who make ordinary careless slips? It changes no estimate; it would only flag a
 * profile as unreliable. Uses the standardised log-likelihood l_z (Drasgow, Levine and Williams, 1985),
 * computed with the production 3PL model at each capability's final estimate.
 */
import { itemParams, leafView, pCorrect } from "../../../packages/english-core/src/index.ts";
import { FROZEN_FRAMEWORK, loadContext } from "../load.ts";
import { PROTOCOL } from "../sim/criteria.ts";
import { LEARNERS } from "../sim/learners.ts";
import { type RunResult, runLearner } from "../sim/run.ts";
import { SEEDS, SIMULATORS } from "./experiments.ts";

export function lz(ctx: ReturnType<typeof loadContext>, r: RunResult): number {
  const now = r.sessions.at(-1)!.now;
  let l0 = 0;
  let e = 0;
  let v = 0;
  for (const d of r.ledger.decisions) {
    if (d.verdict !== "accepted" || d.observation?.kind !== "binary" || d.observation.exposure === "repeat") continue;
    const item = ctx.content.items.get(d.observation.item)!;
    if (item.kind !== "code") continue;
    const theta = leafView(r.ledger.composite, ctx.index, item.target, now).mean;
    const P = Math.min(1 - 1e-6, Math.max(1e-6, pCorrect(theta, itemParams(item))));
    const u = d.observation.value;
    l0 += u * Math.log(P) + (1 - u) * Math.log(1 - P);
    e += P * Math.log(P) + (1 - P) * Math.log(1 - P);
    v += P * (1 - P) * Math.log(P / (1 - P)) ** 2;
  }
  return (l0 - e) / Math.sqrt(v);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const bank of ["e1", "current"] as const)
    for (const sim of ["as frozen", "all learners slip 3%"]) {
      const ctx = loadContext({ allowCandidateAnchors: true, bank, framework: FROZEN_FRAMEWORK });
      const goal = ctx.content.goals.get(PROTOCOL.goal)!;
      const by: Record<string, number[]> = {};
      for (const seed of SEEDS)
        for (const l of LEARNERS) {
          const r = await runLearner(ctx, l, { goal, sessionDays: PROTOCOL.sessionDays, itemsPerSession: PROTOCOL.itemsPerSession, seed, evaluatorNoise: PROTOCOL.evaluatorNoise, responder: SIMULATORS[sim] });
          (by[l.id] ??= []).push(lz(ctx, r));
        }
      const others = Object.entries(by).filter(([id]) => id !== "L9").flatMap(([, x]) => x);
      const g = by.L9;
      const sorted = [...others].sort((a, b) => a - b);
      const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))];
      // the threshold that keeps false flags among the other learners to about 5%
      const flag = q(0.05);
      const auc = g.reduce((s, x) => s + others.filter((o) => o > x).length + 0.5 * others.filter((o) => o === x).length, 0) / (g.length * others.length);
      console.log(`${bank} ${sim}: guesser ${g.map((x) => x.toFixed(2)).join(" ")} | others min ${sorted[0].toFixed(2)}, 5% ${q(0.05).toFixed(2)}, median ${q(0.5).toFixed(2)} | AUC ${auc.toFixed(2)}`);
      console.log(
        `${bank.padEnd(8)} ${sim.padEnd(22)} guesser l_z mean ${(g.reduce((a, b) => a + b, 0) / g.length).toFixed(2)} (flagged at ${flag.toFixed(2)}: ${g.filter((x) => x < flag).length}/${g.length})   others mean ${(others.reduce((a, b) => a + b, 0) / others.length).toFixed(2)} (false flags ${others.filter((x) => x < flag).length}/${others.length})`,
      );
    }
}
