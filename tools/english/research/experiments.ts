/**
 * node tools/english/research/experiments.ts [--quick]
 *
 * Research only (E2a review). Runs the frozen simulation procedure under combinations of:
 *   bank:      e1 (as merged) | current (E2a)
 *   model:     production 3PL | slip-aware 4PL with s = 0.05 | s = 0.10   (research seam, never production)
 *   simulator: as frozen | every learner slips 3% | true difficulties differ from labels (sd 0.5, 0.75)
 * over 10 seeds, and writes tools/english/out/research/experiments.json.
 * Pass levels are not changed; these runs are context, not the frozen measurement.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type CodeItem, type Context, gaussian, leafView, rng } from "../../../packages/english-core/src/index.ts";
import { type Bank, REPO, loadContext } from "../load.ts";
import { PROTOCOL } from "../sim/criteria.ts";
import { CAP, LEARNERS, trueLevel } from "../sim/learners.ts";
import { type RunResult, runLearner } from "../sim/run.ts";
import type { ResponderOptions } from "../sim/learners.ts";
import { STRANDS, estimate, fingerprint, measures, trueValue } from "../sim/simulate.ts";
import { exactModel, slipModel } from "./slip.ts";

export const SEEDS = [20261012, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const MODELS: Record<string, Context["researchBinaryUpdate"] | undefined> = {
  production: undefined,
  "slip 0.05": slipModel(0.05),
  "slip 0.10": slipModel(0.1),
  // the production 3PL model with an exact (grid) posterior instead of one Laplace step
  "3PL exact update": exactModel(0),
};

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
/** True difficulty = label + N(0, sd), fixed per item (the same for every learner and seed). */
const noisyDifficulty = (sd: number) => {
  const cache = new Map<string, number>();
  return (item: CodeItem): CodeItem => {
    if (!cache.has(item.id)) cache.set(item.id, item.b + sd * gaussian(rng(hash(item.id))));
    return { ...item, b: cache.get(item.id)! };
  };
};
export const SIMULATORS: Record<string, ResponderOptions | undefined> = {
  "as frozen": undefined,
  "all learners slip 3%": { slip: 0.03 },
  "difficulty labels off by sd 0.5": { trueItem: noisyDifficulty(0.5) },
  "difficulty labels off by sd 0.75": { trueItem: noisyDifficulty(0.75) },
};

export interface Row {
  bank: Bank;
  model: string;
  simulator: string;
  seed: number;
  M: number[]; // M1..M6 values (M6 as guesser's largest strand error), M4 as %
  passes: boolean[];
  guesserBias: number; // L9 mean signed strand error
  bias: number; // mean signed error, directly observed skeleton capabilities, learners other than L9 and L10
  gapBias: number; // the same, capabilities whose true level is 3.5 or lower (real gaps)
  highBias: number; // the same, true level 6.5 or higher
  forgetterFlagged: number;
}

export async function runConfig(bank: Bank, model: string, simulator: string, seed: number): Promise<Row> {
  const ctx: Context = { ...loadContext({ allowCandidateAnchors: true, bank }), researchBinaryUpdate: MODELS[model] };
  const goal = ctx.content.goals.get(PROTOCOL.goal)!;
  const rs: RunResult[] = [];
  for (const l of LEARNERS)
    rs.push(await runLearner(ctx, l, { goal, sessionDays: PROTOCOL.sessionDays, itemsPerSession: PROTOCOL.itemsPerSession, seed, evaluatorNoise: PROTOCOL.evaluatorNoise, responder: SIMULATORS[simulator] }));
  const fp = fingerprint(rs);
  const ms = (await measures(ctx, rs, [fp, fp])).measures;
  const num = (s: string) => parseFloat(s.match(/-?\d+(\.\d+)?/)![0]);
  const g = ms[5].detail[0].match(/largest strand error ([\d.]+)/)!;
  const flagged = ms[5].detail.find((d: string) => d.includes("forgetter"))!.match(/(\d) of 4/)!;
  const endDay = PROTOCOL.sessionDays.at(-1)!;
  const l9 = rs.find((r) => r.learner.id === "L9")!;
  const errs: { t: number; e: number }[] = [];
  for (const r of rs.filter((x) => !["L9", "L10"].includes(x.learner.id))) {
    const now = r.sessions.at(-1)!.now;
    for (const cap of Object.values(CAP)) {
      const v = leafView(r.ledger.composite, ctx.index, cap, now);
      if (v.direct.n === 0) continue;
      errs.push({ t: trueLevel(r.learner, cap, endDay), e: v.mean - trueLevel(r.learner, cap, endDay) });
    }
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  return {
    bank,
    model,
    simulator,
    seed,
    M: [num(ms[0].value.split("=")[1]), num(ms[1].value), num(ms[2].value), num(ms[3].value), num(ms[4].value.split("ratio")[1]), parseFloat(g[1])],
    passes: ms.map((m) => m.pass),
    guesserBias: mean(STRANDS.map((s) => estimate(ctx, l9, s).mean - trueValue(l9.learner, s, endDay))),
    bias: mean(errs.map((x) => x.e)),
    gapBias: mean(errs.filter((x) => x.t <= 3.5).map((x) => x.e)),
    highBias: mean(errs.filter((x) => x.t >= 6.5).map((x) => x.e)),
    forgetterFlagged: parseInt(flagged[1]),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const quick = process.argv.includes("--quick");
  const banks: Bank[] = ["e1", "current"];
  const only = process.argv.find((a) => a.startsWith("--model="))?.slice(8);
  const rows: Row[] = [];
  for (const bank of banks)
    for (const model of Object.keys(MODELS).filter((m) => !only || m === only))
      for (const simulator of Object.keys(SIMULATORS))
        for (const seed of quick ? SEEDS.slice(0, 2) : SEEDS) {
          rows.push(await runConfig(bank, model, simulator, seed));
          process.stdout.write(".");
        }
  const out = join(REPO, "tools", "english", "out", "research");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, only ? `experiments-${only.replace(/\W+/g, "-")}.json` : "experiments.json"), JSON.stringify({ seeds: quick ? SEEDS.slice(0, 2) : SEEDS, rows }, null, 1));
  console.log(`\n${rows.length} runs written to tools/english/out/research/experiments.json`);
}
