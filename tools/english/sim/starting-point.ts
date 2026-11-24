/** Experiment: the frozen simulation with learners started from a placement result instead of the middle. */
import { FROZEN_FRAMEWORK, loadContext } from "../load.ts";
import { PROTOCOL } from "./criteria.ts";
import { LEARNERS } from "./learners.ts";
import { runLearner } from "./run.ts";
import { fingerprint, measures } from "./simulate.ts";
const ctx = loadContext({ allowCandidateAnchors: true, framework: FROZEN_FRAMEWORK });
const goal = ctx.content.goals.get(PROTOCOL.goal)!;
// The app's rule (frontend engine-start.ts): the five parts Find my level measures, the centre moved and the spread
// left as wide as the framework's own (1.5), and the other strands left alone. The later rows read every ladder off
// the framework's scale, in opposite directions for neighbouring parts: the worst case for parts whose ladders have
// not been put on that scale.
const APP = ["EN.VOC", "EN.RDG", "EN.GRM", "EN.FND", "EN.LIS"];
const off = (by: number) => ({ "EN.VOC": by, "EN.RDG": -by, "EN.GRM": by, "EN.FND": -by, "EN.LIS": by });
const app = (by?: number) => ({ noise: 0.7, strands: APP, only: true, sd: 1.5, ...(by ? { bias: off(by) } : {}) });
const variants: [string, { noise: number; strands: string[]; only?: boolean; bias?: Record<string, number>; sd?: number } | undefined][] = [
  ["middle of the scale (before)", undefined],
  ["overall level only (gap check)", { noise: 0.7, strands: [] }],
  ["per part: words, reading, grammar, spelling", { noise: 0.7, strands: ["EN.VOC", "EN.RDG", "EN.GRM", "EN.FND"] }],
  ["the app's rule: five parts, spread 1.5, others untouched", app()],
  ["the app's rule, ladders 1 level off (+ - + - +)", app(1)],
  ["the app's rule, ladders 1 level off (- + - + -)", app(-1)],
  ["the app's rule, ladders 1.5 levels off (+ - + - +)", app(1.5)],
  ["the app's rule, ladders 1.5 levels off (- + - + -)", app(-1.5)],
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
