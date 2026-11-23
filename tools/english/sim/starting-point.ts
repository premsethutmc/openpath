/** Experiment: the frozen simulation with learners started from a placement result instead of the middle. */
import { FROZEN_FRAMEWORK, loadContext } from "../load.ts";
import { PROTOCOL } from "./criteria.ts";
import { LEARNERS } from "./learners.ts";
import { runLearner } from "./run.ts";
import { fingerprint, measures } from "./simulate.ts";
const ctx = loadContext({ allowCandidateAnchors: true, framework: FROZEN_FRAMEWORK });
const goal = ctx.content.goals.get(PROTOCOL.goal)!;
const variants: [string, { noise: number; strands: string[] } | undefined][] = [
  ["middle of the scale (today)", undefined],
  ["overall level only (gap check)", { noise: 0.7, strands: [] }],
  ["per part: words, reading, grammar, spelling", { noise: 0.7, strands: ["EN.VOC", "EN.RDG", "EN.GRM", "EN.FND"] }],
];
const num = (v: string) => Number((v.match(/-?\d+(\.\d+)?/) ?? ["NaN"])[0]);
for (const [name, start] of variants) {
  const m1: number[] = [];
  const m4: number[] = [];
  const pass: Record<string, number> = {};
  const seeds = Array.from({ length: 10 }, (_, i) => PROTOCOL.seed + i);
  for (const seed of seeds) {
    const rs = [];
    for (const l of LEARNERS) rs.push(await runLearner(ctx, l, { goal, sessionDays: PROTOCOL.sessionDays, itemsPerSession: PROTOCOL.itemsPerSession, seed, evaluatorNoise: PROTOCOL.evaluatorNoise, start }));
    const fp = fingerprint(rs);
    const ms = (await measures(ctx, rs, [fp, fp])).measures;
    for (const m of ms) pass[m.id] = (pass[m.id] ?? 0) + (m.pass ? 1 : 0);
    m1.push(num(ms[0].value));
    m4.push(num(ms[3].value));
  }
  const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
  const se = (x: number[]) => Math.sqrt(x.reduce((a, b) => a + (b - mean(x)) ** 2, 0) / (x.length - 1) / x.length);
  console.log(`== ${name}: M1 ${mean(m1).toFixed(2)} ± ${se(m1).toFixed(2)} | M4 ${mean(m4).toFixed(0)}% | passes of 10: ${Object.entries(pass).map(([k, v]) => `${k} ${v}`).join(", ")}`);
}
