/**
 * node tools/english/research/breadth.ts [--seeds 5]
 * Research only (E2b): run the engine on framework 0.2.0 (all 56 capabilities) with the ten simulated
 * learners, to expose weaknesses that the frozen 17-capability simulation cannot show. It changes no
 * production behaviour and is not an acceptance test: there are no pass levels, and the frozen
 * simulation (0.1.0) remains the measure of record.
 *
 * The simulated learners only have true levels for the 17 skeleton capabilities. Two stated assumptions
 * give them levels for the 39 core capabilities:
 *   "strand"  each core capability = the mean of the learner's skeleton capabilities in the same strand
 *             (so the forgetter's grammar drop reaches the core grammar capabilities too);
 *   "varied"  the same, plus a fixed offset per learner and capability, uniform in ±1 band, so that
 *             capabilities inside a strand differ and within-strand recovery can be seen.
 * Both are assumptions about learners, not findings; real profiles may be quite different.
 */
import { createHash } from "node:crypto";
import { type CapabilityId, type Context, aggregate, normalQuantile } from "../../../packages/english-core/src/index.ts";
import { FROZEN_FRAMEWORK, loadContext } from "../load.ts";
import { PROTOCOL } from "../sim/criteria.ts";
import { CAP, LEARNERS, type SimLearner, trueLevel } from "../sim/learners.ts";
import { type RunResult, runLearner } from "../sim/run.ts";
import { STRANDS, estimate, spearman } from "../sim/simulate.ts";

const SKELETON = new Set<string>(Object.values(CAP));
const strandOf = (cap: string) => cap.split(".").slice(0, 2).join(".");
const offset = (learner: string, cap: string) => (parseInt(createHash("sha256").update(`${learner}:${cap}`).digest("hex").slice(0, 8), 16) / 0xffffffff) * 2 - 1;

export type Scenario = "strand" | "varied";

export function withCoreLevels(l: SimLearner, scenario: Scenario): SimLearner {
  const skeletonIn = (strand: string) => Object.values(CAP).filter((c) => strandOf(c) === strand);
  return {
    ...l,
    coreLevel: (cap: CapabilityId, day: number) => {
      const caps = skeletonIn(strandOf(cap));
      const base = caps.reduce((s, c) => s + trueLevel(l, c, day), 0) / caps.length;
      const v = base + (scenario === "varied" ? offset(l.id, cap) : 0);
      return Math.min(8, Math.max(1, v));
    },
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);

export interface BreadthRow {
  learner: string;
  capsWithEvidence: number;
  capsSpecified: number;
  itemsPerCapability: number;
  rhoAll: number;
  rhoSkeleton: number;
  rhoCore: number;
  absErrorSkeleton: number;
  absErrorCore: number;
  coverage80Skeleton: number;
  coverage80Core: number;
  sdSkeleton: number;
  sdCore: number;
  weakestStrandRight: boolean;
  writingResponses: number;
}

export function measure(ctx: Context, r: RunResult): BreadthRow {
  const now = r.sessions.at(-1)!.now;
  const day = r.sessions.at(-1)!.day;
  const caps = [...ctx.index.leaves.values()].filter((c) => c.bands).map((c) => c.id);
  const evidence = new Map<string, number>();
  let writing = 0;
  for (const d of r.ledger.decisions) {
    if (d.verdict !== "accepted") continue;
    if (d.observation?.kind === "binary") {
      const it = ctx.content.items.get(d.observation.item);
      if (it?.kind === "code") evidence.set(it.target, (evidence.get(it.target) ?? 0) + 1);
    } else if (d.capability) evidence.set(d.capability, (evidence.get(d.capability) ?? 0) + 1);
  }
  for (const e of r.ledger.events) if (e.kind === "evidence" && e.response.kind === "writing") writing++;
  const z = normalQuantile(0.9);
  const rows = caps.map((c) => {
    const t = trueLevel(r.learner, c, day);
    const e = estimate(ctx, r, c);
    return { c, t, e, core: !SKELETON.has(c), inside: Math.abs(t - e.mean) <= z * e.sd };
  });
  const sel = (core: boolean) => rows.filter((x) => x.core === core);
  const rho = (xs: typeof rows) => spearman(xs.map((x) => x.t), xs.map((x) => x.e.mean));
  // weakest strand: truth = mean of all specified leaves in the strand; estimate = the engine's aggregate
  const agg = aggregate(r.ledger.composite, ctx.index, now);
  const strands = STRANDS.map((s) => ({ s, t: mean(rows.filter((x) => strandOf(x.c) === s).map((x) => x.t)), e: agg.get(s)!.mean }));
  const minT = Math.min(...strands.map((x) => x.t));
  const weakestEst = [...strands].sort((a, b) => a.e - b.e)[0];
  return {
    learner: r.learner.id,
    capsWithEvidence: caps.filter((c) => (evidence.get(c) ?? 0) > 0).length,
    capsSpecified: caps.length,
    itemsPerCapability: mean(caps.map((c) => evidence.get(c) ?? 0)),
    rhoAll: rho(rows),
    rhoSkeleton: rho(sel(false)),
    rhoCore: rho(sel(true)),
    absErrorSkeleton: mean(sel(false).map((x) => Math.abs(x.t - x.e.mean))),
    absErrorCore: mean(sel(true).map((x) => Math.abs(x.t - x.e.mean))),
    coverage80Skeleton: mean(sel(false).map((x) => (x.inside ? 1 : 0))),
    coverage80Core: mean(sel(true).map((x) => (x.inside ? 1 : 0))),
    sdSkeleton: mean(sel(false).map((x) => x.e.sd)),
    sdCore: mean(sel(true).map((x) => x.e.sd)),
    // ties among the true weakest strands count as right; flat profiles (L1, L7, L9) are excluded below
    weakestStrandRight: Math.abs(strands.find((x) => x.s === weakestEst.s)!.t - minT) < 0.25,
    writingResponses: writing,
  };
}

export async function runBreadth(opts: { framework: "0.1.0" | "0.2.0"; scenario: Scenario; seed: number; sessions: number[] }): Promise<BreadthRow[]> {
  const ctx = loadContext({ allowCandidateAnchors: true, framework: opts.framework });
  const goal = ctx.content.goals.get(PROTOCOL.goal)!;
  const out: BreadthRow[] = [];
  for (const l of LEARNERS) {
    const learner = opts.framework === FROZEN_FRAMEWORK ? l : withCoreLevels(l, opts.scenario);
    const r = await runLearner(ctx, learner, { goal, sessionDays: opts.sessions, itemsPerSession: PROTOCOL.itemsPerSession, seed: opts.seed, evaluatorNoise: PROTOCOL.evaluatorNoise });
    out.push(measure(ctx, r));
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const k = process.argv.indexOf("--seeds");
  const nSeeds = k > 0 ? Number(process.argv[k + 1]) : 5;
  const seeds = Array.from({ length: nSeeds }, (_, i) => PROTOCOL.seed + i);
  const long = [0, 1, 8, 15, 16, 22, 29, 30, 36, 43, 44, 50];
  const configs = [
    { name: "0.1.0 (17 capabilities), protocol 120 items", framework: "0.1.0" as const, scenario: "strand" as const, sessions: PROTOCOL.sessionDays },
    { name: "0.2.0 (56), strand truth, 120 items", framework: "0.2.0" as const, scenario: "strand" as const, sessions: PROTOCOL.sessionDays },
    { name: "0.2.0 (56), varied truth, 120 items", framework: "0.2.0" as const, scenario: "varied" as const, sessions: PROTOCOL.sessionDays },
    { name: "0.2.0 (56), varied truth, 240 items", framework: "0.2.0" as const, scenario: "varied" as const, sessions: long },
  ];
  const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "—");
  const results: Record<string, BreadthRow[]> = {};
  for (const c of configs) {
    const rows: BreadthRow[] = [];
    for (const seed of seeds) rows.push(...(await runBreadth({ ...c, seed })));
    results[c.name] = rows;
  }
  console.log(`Breadth simulation (research only, ${nSeeds} seeds; no pass levels)\n`);
  console.log("| Configuration | Capabilities with evidence | Items per capability | ρ all | ρ skeleton | ρ core | |error| skeleton | |error| core | 80% coverage skeleton | 80% coverage core | sd skeleton | sd core | Weakest strand right (L2–L6, L8, L10) | Writing responses |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const [name, rows] of Object.entries(results)) {
    const m = (g: (r: BreadthRow) => number) => mean(rows.map(g).filter(Number.isFinite));
    const profiled = rows.filter((r) => !["L1", "L7", "L9"].includes(r.learner));
    console.log(`| ${name} | ${f(m((r) => r.capsWithEvidence), 1)} of ${rows[0].capsSpecified} | ${f(m((r) => r.itemsPerCapability), 1)} | ${f(m((r) => r.rhoAll))} | ${f(m((r) => r.rhoSkeleton))} | ${f(m((r) => r.rhoCore))} | ${f(m((r) => r.absErrorSkeleton))} | ${f(m((r) => r.absErrorCore))} | ${f(100 * m((r) => r.coverage80Skeleton), 0)}% | ${f(100 * m((r) => r.coverage80Core), 0)}% | ${f(m((r) => r.sdSkeleton))} | ${f(m((r) => r.sdCore))} | ${f(100 * mean(profiled.map((r) => (r.weakestStrandRight ? 1 : 0))), 0)}% | ${f(m((r) => r.writingResponses), 1)} |`);
  }
  for (const c of [configs[0], configs[2], configs[3]]) {
    console.log(`\nPer learner, ${c.name} (mean over seeds):\n`);
    console.log("| Learner | ρ skeleton | ρ core | |error| skeleton | |error| core | 80% coverage skeleton | 80% coverage core |");
    console.log("|---|---|---|---|---|---|---|");
    const rows = results[c.name];
    for (const l of LEARNERS) {
      const xs = rows.filter((r) => r.learner === l.id);
      const m = (g: (r: BreadthRow) => number) => mean(xs.map(g).filter(Number.isFinite));
      console.log(`| ${l.id} ${l.name} | ${f(m((r) => r.rhoSkeleton))} | ${f(m((r) => r.rhoCore))} | ${f(m((r) => r.absErrorSkeleton))} | ${f(m((r) => r.absErrorCore))} | ${f(100 * m((r) => r.coverage80Skeleton), 0)}% | ${f(100 * m((r) => r.coverage80Core), 0)}% |`);
    }
  }
}
