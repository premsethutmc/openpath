/**
 * node tools/english/research/sim-weaknesses.ts
 *
 * Research only. Why the frozen ten-learner simulation misses M1 (profile recovery after 40 items)
 * and the guesser half of M6, measured rather than assumed. Findings: docs/product/SIMULATION_WEAKNESSES.md.
 *
 * Nothing here changes production code, the frozen simulation or its pass levels, and nothing is
 * tuned to make a measure pass. Counterfactual runs use only seams that already exist for research:
 *   - runLearner options (seed, sessionDays, mode, order, responder), as the frozen tools use them;
 *   - Context.researchBinaryUpdate (an alternative right/wrong update, never set in production);
 *   - an in-memory copy of the framework index with its couplings removed (the file is untouched).
 * Each counterfactual is a diagnostic: it isolates one cause. None is a proposal.
 *
 * Deterministic (fixed seeds, the engine's own seeded generator); about a minute on a laptop.
 */
import {
  type CodeItem,
  type Context,
  type Estimate,
  type ItemParams,
  aggregate,
  formatKind,
  gaussian,
  guessingFloor,
  leafView,
  logistic,
  pCorrect,
  rng,
} from "../../../packages/english-core/src/index.ts";
import { FROZEN_FRAMEWORK, loadContext } from "../load.ts";
import { CRITERIA, PROTOCOL } from "../sim/criteria.ts";
import { CAP, LEARNERS, type SimLearner, trueLevel } from "../sim/learners.ts";
import { type RunOptions, type RunResult, runLearner } from "../sim/run.ts";
import { STRANDS, estimate, spearman, trueValue } from "../sim/simulate.ts";
import { SEEDS, SIMULATORS } from "./experiments.ts";
import { lz } from "./person-fit.ts";
import { exactModel } from "./slip.ts";

const t0 = Date.now();
const ctx = loadContext({ allowCandidateAnchors: true, framework: FROZEN_FRAMEWORK });
const goal = ctx.content.goals.get(PROTOCOL.goal)!;
const M1 = CRITERIA.profileRecovery.learners;
const byId = new Map(LEARNERS.map((l) => [l.id, l]));
const EARLY = PROTOCOL.earlyCheckAfterSessions - 1; // session index 1 = after 40 items
const END_DAY = PROTOCOL.sessionDays.at(-1)!;
const strandOf = (cap: string) => cap.split(".").slice(0, 2).join(".");
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const se = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1) / xs.length);
};
const f2 = (x: number) => (Number.isNaN(x) ? "  n/a" : (x >= 0 ? " " : "") + x.toFixed(2));
const pm = (xs: number[]) => `${f2(mean(xs))} ± ${se(xs).toFixed(2)}`;
const h = (title: string) => console.log(`\n${"=".repeat(100)}\n${title}\n${"=".repeat(100)}`);
const table = (head: string[], rows: (string | number)[][]) => {
  const cells = [head, ...rows.map((r) => r.map((c) => (typeof c === "number" ? f2(c) : c)))];
  const w = head.map((_, i) => Math.max(...cells.map((r) => String(r[i]).length)));
  for (const [k, r] of cells.entries()) {
    console.log(r.map((c, i) => String(c).padEnd(w[i])).join("  "));
    if (k === 0) console.log(w.map((x) => "-".repeat(x)).join("  "));
  }
};

const base = (seed: number, extra: Partial<RunOptions> = {}): RunOptions => ({ goal, sessionDays: PROTOCOL.sessionDays, itemsPerSession: PROTOCOL.itemsPerSession, seed, evaluatorNoise: PROTOCOL.evaluatorNoise, ...extra });
async function run(c: Context, ids: string[], o: RunOptions): Promise<Map<string, RunResult>> {
  const out = new Map<string, RunResult>();
  for (const id of ids) out.set(id, await runLearner(c, byId.get(id)!, o));
  return out;
}

/** Strand estimates at a snapshot: production (aggregate of combined leaf means) or direct-only. */
function strandEst(c: Context, r: RunResult, k: number, which: "combined" | "direct" = "combined"): number[] {
  const s = r.sessions[k];
  if (which === "combined") return STRANDS.map((n) => estimate(c, r, n, s.composite, s.now).mean);
  return STRANDS.map((n) => mean(Object.values(CAP).filter((cap) => strandOf(cap) === n).map((cap) => leafView(s.composite, c.index, cap, s.now).direct.mean)));
}
const strandTrue = (l: SimLearner, day: number) => STRANDS.map((n) => trueValue(l, n, day));
const rhoAt = (c: Context, r: RunResult, k: number, which: "combined" | "direct" = "combined") => spearman(strandTrue(r.learner, r.sessions[k].day), strandEst(c, r, k, which));
/** The frozen M1 value for a set of runs: mean ρ over L2, L3, L4, L5, L6, L8 at the snapshot after `k + 1` sessions. */
const m1 = (c: Context, rs: Map<string, RunResult>, k = EARLY, which: "combined" | "direct" = "combined") => mean(M1.map((id) => rhoAt(c, rs.get(id)!, k, which)));

/** Strand errors with each learner-run's own mean error removed (a shift common to all strands cannot change ranks). */
function centredErrors(runs: Map<number, Map<string, RunResult>>, k: number, c: Context = ctx): number[] {
  const out: number[] = [];
  for (const rs of runs.values())
    for (const id of M1) {
      const r = rs.get(id)!;
      if (r.sessions.length <= k) continue;
      const t = strandTrue(r.learner, r.sessions[k].day);
      const e = strandEst(c, r, k).map((v, i) => v - t[i]);
      const m = mean(e);
      out.push(...e.map((x) => x - m));
    }
  return out;
}
const crmsAt = (runs: Map<number, Map<string, RunResult>>, k: number) => Math.sqrt(mean(centredErrors(runs, k).map((e) => e * e)));

// ------------------------------------------------------------------------------------------------ runs
// One production run per seed for every learner (the frozen procedure; seed 20261012 is the frozen run).
const prod = new Map<number, Map<string, RunResult>>();
for (const seed of SEEDS) prod.set(seed, await run(ctx, LEARNERS.map((l) => l.id), base(seed)));
const frozen = prod.get(PROTOCOL.seed)!;

// ================================================================================================ M1
h("M1 · 0. How the measure is computed, and the frozen value reproduced");
console.log(`Learners ${M1.join(", ")}; snapshot after session ${EARLY + 1} (${frozen.get("L2")!.sessions[EARLY].items} items, day ${frozen.get("L2")!.sessions[EARLY].day}).`);
console.log(`Strands ${STRANDS.join(", ")}. Truth: equal-weight mean of the learner's skeleton leaves in the strand.`);
console.log(`Estimate: aggregate() = weighted mean of the COMBINED leaf means of specified leaves (framework ${FROZEN_FRAMEWORK}: 17 specified leaves, all weights 1).`);
{
  // check: the aggregate is exactly the plain mean of the strand's specified leaves (no unassessed or unspecified leaves count)
  let maxDiff = 0;
  for (const id of M1) {
    const r = frozen.get(id)!;
    const s = r.sessions[EARLY];
    const agg = aggregate(s.composite, ctx.index, s.now);
    for (const n of STRANDS) {
      const plain = mean(Object.values(CAP).filter((c) => strandOf(c) === n).map((c) => leafView(s.composite, ctx.index, c, s.now).mean));
      maxDiff = Math.max(maxDiff, Math.abs(plain - agg.get(n)!.mean));
      if (agg.get(n)!.coverage.counted !== Object.values(CAP).filter((c) => strandOf(c) === n).length) throw new Error("unexpected leaf count");
    }
  }
  console.log(`Check: aggregate equals the plain mean of the strand's skeleton leaves (largest difference ${maxDiff.toExponential(1)}).`);
  const rows = M1.map((id) => {
    const r = frozen.get(id)!;
    const t = strandTrue(r.learner, r.sessions[EARLY].day);
    const e = strandEst(ctx, r, EARLY);
    return [id, ...STRANDS.map((_, i) => `${t[i].toFixed(2)}→${e[i].toFixed(2)}`), rhoAt(ctx, r, EARLY)];
  });
  table(["learner", ...STRANDS.map((s) => `${s} true→est`), "ρ"], rows);
  console.log(`Mean ρ (the frozen M1 value): ${m1(ctx, frozen).toFixed(2)}`);
}

h("M1 · 1. Ceiling from tied true values: the best ρ any estimate could reach (all estimates distinct)");
const ceiling = new Map<string, number>();
{
  const rows = M1.map((id) => {
    const t = strandTrue(byId.get(id)!, 1);
    const best = spearman(t, t.map((v, i) => v + i * 1e-9)); // the perfect order, ties broken arbitrarily
    ceiling.set(id, best);
    const sorted = [...t].sort((a, b) => a - b);
    const gaps = sorted.slice(1).map((v, i) => v - sorted[i]);
    return [id, t.map((v) => v.toFixed(2)).join(" "), `${(sorted.at(-1)! - sorted[0]).toFixed(2)}`, `${Math.min(...gaps).toFixed(2)}`, best, frozen && rhoAt(ctx, frozen.get(id)!, EARLY)];
  });
  table(["learner", "true strand values (FND VOC GRM SEN RDG WRT)", "range", "smallest gap", "best ρ", "frozen ρ"], rows);
  console.log(`Mean of the best attainable ρ: ${mean([...ceiling.values()]).toFixed(3)} (pass level ${CRITERIA.profileRecovery.minMeanSpearman}).`);
}

h("M1 · 2. Noise ceiling: expected ρ if every strand estimate were the truth plus independent unbiased error of sd σ");
const noisyRho = (t: number[], sigma: number, draws = 4000) => {
  const next = rng(4242);
  const xs: number[] = [];
  for (let d = 0; d < draws; d++) xs.push(spearman(t, t.map((v) => v + sigma * gaussian(next))));
  return mean(xs);
};
{
  // observed strand error after 40 items, pooled over seeds
  const errs: number[] = [];
  for (const rs of prod.values())
    for (const id of M1) {
      const r = rs.get(id)!;
      const t = strandTrue(r.learner, r.sessions[EARLY].day);
      strandEst(ctx, r, EARLY).forEach((e, i) => errs.push(e - t[i]));
    }
  const rms = Math.sqrt(mean(errs.map((e) => e * e)));
  console.log(`Observed strand error after 40 items, 6 learners × 6 strands × ${SEEDS.length} seeds: mean ${f2(mean(errs))}, RMS ${rms.toFixed(2)}.`);
  const crms = Math.sqrt(mean(centredErrors(prod, EARLY).map((e) => e * e)));
  console.log(`The part that can change ranks (each learner's own mean error removed): RMS ${crms.toFixed(2)}.`);
  const sigmas = [0.2, 0.3, 0.4, 0.5, Math.round(crms * 100) / 100];
  const rows = M1.map((id) => [id, ...sigmas.map((s) => noisyRho(strandTrue(byId.get(id)!, 1), s))]);
  rows.push(["mean", ...sigmas.map((_, j) => mean(rows.map((r) => r[j + 1] as number)))]);
  table(["learner", ...sigmas.map((s) => `σ = ${s.toFixed(2)}`)], rows);
  // the error is not independent of the truth: estimates are compressed towards the start value, which shrinks the signal
  let sxy = 0;
  let sxx = 0;
  const pairs: { t: number; e: number }[] = [];
  for (const rs of prod.values())
    for (const id of M1) {
      const r = rs.get(id)!;
      const t = strandTrue(r.learner, r.sessions[EARLY].day);
      const e = strandEst(ctx, r, EARLY);
      const mt = mean(t);
      const me = mean(e);
      t.forEach((v, i) => {
        sxy += (v - mt) * (e[i] - me);
        sxx += (v - mt) ** 2;
        pairs.push({ t: v - mt, e: e[i] - me });
      });
    }
  const slope = sxy / sxx;
  const resid = Math.sqrt(mean(pairs.map((p) => (p.e - slope * p.t) ** 2)));
  console.log(`Within each learner, estimated strand profile ≈ ${slope.toFixed(2)} × true profile + residual of sd ${resid.toFixed(2)} (pooled, 10 seeds).`);
  console.log(`So the profile is compressed to ${Math.round(slope * 100)}% of its true spread, and the effective noise is ${resid.toFixed(2)} / ${slope.toFixed(2)} = ${(resid / slope).toFixed(2)} bands on the true scale.`);
  const eff = M1.map((id) => noisyRho(strandTrue(byId.get(id)!, 1), resid / slope));
  console.log(`Expected ρ at that effective noise: ${M1.map((id, i) => `${id} ${eff[i].toFixed(2)}`).join(", ")}; mean ${mean(eff).toFixed(2)} (observed over 10 seeds: see section 3).`);
}

h("M1 · 3. Seed spread: is 0.40 typical? (frozen procedure, 10 seeds)");
const m1Prod = SEEDS.map((s) => m1(ctx, prod.get(s)!));
{
  const rows = M1.map((id) => [id, ...SEEDS.map((s) => rhoAt(ctx, prod.get(s)!.get(id)!, EARLY)), mean(SEEDS.map((s) => rhoAt(ctx, prod.get(s)!.get(id)!, EARLY)))]);
  rows.push(["M1", ...m1Prod, mean(m1Prod)]);
  table(["learner", ...SEEDS.map((s) => (s === PROTOCOL.seed ? "frozen" : `seed ${s}`)), "mean"], rows);
  console.log(`M1 over 10 seeds: ${pm(m1Prod)}; seeds at ≥ 0.8: ${m1Prod.filter((x) => x >= 0.8).length} of 10.`);
}

h("M1 · 4. Hypothesis (a)/(b): evidence per strand after 40 items (accepted direct observations; a writing band counts once per capability it scores)");
{
  const evIndex = (src: string) => Number(src.replace(/^p:/, "").match(/:e(\d+)$/)?.[1] ?? -1);
  const count = (r: RunResult, limit: number) => {
    const per: Record<string, number> = Object.fromEntries(STRANDS.map((s) => [s, 0]));
    const leaf: Record<string, number> = Object.fromEntries(Object.values(CAP).map((c) => [c, 0]));
    let held = 0;
    for (const d of r.ledger.decisions) {
      const n = evIndex(d.source);
      if (n < 0 || n >= limit || !d.capability) continue;
      if (d.verdict !== "accepted") {
        held++;
        continue;
      }
      if (!d.observation || d.observation.exposure === "repeat") continue;
      per[strandOf(d.capability)]++;
      leaf[d.capability]++;
    }
    return { per, leaf, held };
  };
  const rows = M1.map((id) => {
    const c = count(frozen.get(id)!, 40);
    const leaves = Object.values(c.leaf);
    return [id, ...STRANDS.map((s) => String(c.per[s])), `${Math.min(...leaves)}–${Math.max(...leaves)}`, String(leaves.filter((x) => x === 0).length), String(leaves.filter((x) => x === 1).length), String(c.held)];
  });
  table(["learner (frozen seed)", ...STRANDS, "per leaf", "leaves with 0", "leaves with 1", "held/rejected"], rows);
  // pooled over seeds: per strand mean and range, and the relation between evidence and error
  const pooled: Record<string, number[]> = Object.fromEntries(STRANDS.map((s) => [s, []]));
  const pairs: { n: number; abs: number }[] = [];
  let zero = 0;
  let total = 0;
  for (const rs of prod.values())
    for (const id of M1) {
      const r = rs.get(id)!;
      const c = count(r, 40);
      const t = strandTrue(r.learner, r.sessions[EARLY].day);
      const e = strandEst(ctx, r, EARLY);
      STRANDS.forEach((s, i) => {
        pooled[s].push(c.per[s]);
        pairs.push({ n: c.per[s] / Object.values(CAP).filter((x) => strandOf(x) === s).length, abs: Math.abs(e[i] - t[i]) });
      });
      zero += Object.values(c.leaf).filter((x) => x === 0).length;
      total += 17;
    }
  console.log(`\nPooled over 10 seeds (observations per strand after 40 items): ${STRANDS.map((s) => `${s} ${mean(pooled[s]).toFixed(1)} (${Math.min(...pooled[s])}–${Math.max(...pooled[s])})`).join(", ")}.`);
  console.log(`Leaves with no direct evidence after 40 items: ${zero} of ${total} learner-leaves.`);
  const byStrand: Record<string, number[]> = Object.fromEntries(STRANDS.map((s) => [s, []]));
  centredErrors(prod, EARLY).forEach((e, i) => byStrand[STRANDS[i % STRANDS.length]].push(e));
  console.log(`Centred strand error (RMS) after 40 items, by strand: ${STRANDS.map((s) => `${s} ${Math.sqrt(mean(byStrand[s].map((e) => e * e))).toFixed(2)} (${Object.values(CAP).filter((c) => strandOf(c) === s).length} leaves)`).join(", ")}.`);
  const lo = pairs.filter((p) => p.n < 2.5);
  const hi = pairs.filter((p) => p.n >= 2.5);
  console.log(`Strand |error| when the strand has < 2.5 observations per leaf: ${mean(lo.map((p) => p.abs)).toFixed(2)} (n=${lo.length}); ≥ 2.5 per leaf: ${mean(hi.map((p) => p.abs)).toFixed(2)} (n=${hi.length}).`);
  // the scheduler's mix in the first 40 activities
  const mix: Record<string, number> = {};
  for (const rs of prod.values()) for (const id of M1) for (const x of rs.get(id)!.recommendations.slice(0, 40)) mix[x.reason] = (mix[x.reason] ?? 0) + 1;
  const tot = Object.values(mix).reduce((a, b) => a + b, 0);
  console.log(`Scheduler mix in the first 40 activities (6 learners × 10 seeds): ${Object.entries(mix).map(([k, v]) => `${k} ${((100 * v) / tot).toFixed(0)}%`).join(", ")}.`);
}

h("M1 · 5. Hypothesis (c): inferred shifts (combined vs direct estimates) and shrinkage towards the 4.0 start");
{
  const diffs: number[] = [];
  const rhoD: number[] = [];
  const shrink: { lo: number[]; hi: number[] } = { lo: [], hi: [] };
  for (const rs of prod.values()) {
    rhoD.push(m1(ctx, rs, EARLY, "direct"));
    for (const id of M1) {
      const r = rs.get(id)!;
      const s = r.sessions[EARLY];
      for (const c of Object.values(CAP)) {
        const v = leafView(s.composite, ctx.index, c, s.now);
        diffs.push(Math.abs(v.mean - v.direct.mean));
      }
      const t = strandTrue(r.learner, s.day);
      strandEst(ctx, r, EARLY).forEach((e, i) => (t[i] <= 3.5 ? shrink.lo : t[i] >= 5.5 ? shrink.hi : []).push(e - t[i]));
    }
  }
  const sorted = [...diffs].sort((a, b) => a - b);
  console.log(`|combined − direct| per leaf after 40 items: mean ${mean(diffs).toFixed(2)}, 90th percentile ${sorted[Math.floor(0.9 * sorted.length)].toFixed(2)}, max ${sorted.at(-1)!.toFixed(2)}.`);
  console.log(`M1 with direct-only strand estimates (same runs): ${pm(rhoD)}  vs production (combined): ${pm(m1Prod)}; paired difference ${pm(rhoD.map((x, i) => x - m1Prod[i]))}.`);
  console.log(`Frozen seed: direct-only M1 = ${rhoD[0].toFixed(2)} (per learner ${M1.map((id) => `${id} ${rhoAt(ctx, frozen.get(id)!, EARLY, "direct").toFixed(2)}`).join(", ")}).`);
  console.log(`Shrinkage: strand error where truth ≤ 3.5: ${pm(shrink.lo)} (n=${shrink.lo.length}); truth ≥ 5.5: ${pm(shrink.hi)} (n=${shrink.hi.length}).`);
  // couplings removed from the framework index (in memory only): does inference also change what is selected?
  const noInf: Context = { ...ctx, index: { ...ctx.index, couplings: new Map() } };
  const vals: number[] = [];
  for (const seed of SEEDS) vals.push(m1(noInf, await run(noInf, M1, base(seed))));
  console.log(`Counterfactual, couplings removed (selection and estimates both change): M1 ${pm(vals)}; paired vs production ${pm(vals.map((x, i) => x - m1Prod[i]))}; frozen seed ${vals[0].toFixed(2)}.`);
}

h("M1 · 6. Held writing evidence in the first 40 items (check 9: a band far from the current estimate waits for a second evaluation)");
{
  const rows: string[][] = [];
  for (const id of M1) {
    const r = frozen.get(id)!;
    for (const d of r.ledger.decisions) {
      const n = Number(d.source.replace(/^p:/, "").match(/:e(\d+)$/)?.[1] ?? -1);
      if (n < 0 || n >= 40 || d.verdict === "accepted" || !d.capability) continue;
      rows.push([id, d.capability, trueLevel(r.learner, d.capability, 1).toFixed(1), d.verdict, d.reasons[0].slice(0, 90)]);
    }
  }
  table(["learner", "capability", "true", "verdict", "reason"], rows);
  const r = frozen.get("L8")!;
  const v = leafView(r.sessions[EARLY].composite, ctx.index, CAP.run, r.sessions[EARLY].now);
  console.log(`L8 run-ons (its defining weakness, true 3.0) after 40 items: combined ${v.mean.toFixed(2)} ± ${v.sd.toFixed(2)}, direct ${v.direct.mean.toFixed(2)}, ${v.direct.n} direct observation(s).`);
}

h("M1 · 7. Hypothesis (e): more items (snapshots of the same runs; then runs extended to 200 items)");
{
  const ks = [0, 1, 2, 3, 4, 5];
  const rows: (string | number)[][] = [
    ["M1, combined (production)", ...ks.map((k) => mean(SEEDS.map((s) => m1(ctx, prod.get(s)!, k))))],
    ["M1, direct only", ...ks.map((k) => mean(SEEDS.map((s) => m1(ctx, prod.get(s)!, k, "direct"))))],
    ["centred strand error (RMS)", ...ks.map((k) => crmsAt(prod, k))],
  ];
  table(["10 seeds", ...ks.map((k) => `${(k + 1) * 20} items`)], rows);
  const days = [0, 1, 8, 15, 16, 22, 29, 30, 36, 43];
  const ext: number[][] = [];
  const extRuns = new Map<number, Map<string, RunResult>>();
  for (const seed of SEEDS) {
    const rs = await run(ctx, M1, base(seed, { sessionDays: days }));
    extRuns.set(seed, rs);
    ext.push([1, 3, 5, 7, 9].map((k) => (M1.every((id) => rs.get(id)!.sessions.length > k) ? m1(ctx, rs, k) : NaN)));
  }
  table(["extended run (10 seeds)", "40", "80", "120", "160", "200"], [
    ["M1 mean", ...[0, 1, 2, 3, 4].map((j) => mean(ext.map((e) => e[j])))],
    ["seeds ≥ 0.8", ...[0, 1, 2, 3, 4].map((j) => String(ext.filter((e) => e[j] >= 0.8).length))],
    ["centred strand error (RMS)", ...[1, 3, 5, 7, 9].map((k) => crmsAt(extRuns, k))],
  ]);
  const per = M1.map((id) => [id, ceiling.get(id)!, ...[1, 5].map((k) => mean(SEEDS.map((s) => rhoAt(ctx, prod.get(s)!.get(id)!, k))))]);
  table(["learner", "best attainable", "40 items (10 seeds)", "120 items (10 seeds)"], per);
}

h("M1 · 8. Selection policy at 40 items (10 seeds)");
{
  const rows: (string | number)[][] = [["hybrid (frozen procedure)", pm(m1Prod), String(m1Prod.filter((x) => x >= 0.8).length)]];
  for (const [name, o] of [
    ["assessment only", { mode: "assessment" as const }],
    ["random order (code items only, no writing)", { order: "random" as const, writing: false }],
  ] as const) {
    const vals: number[] = [];
    for (const seed of SEEDS) vals.push(m1(ctx, await run(ctx, M1, base(seed, o))));
    rows.push([name, pm(vals), String(vals.filter((x) => x >= 0.8).length)]);
  }
  table(["policy", "M1 (mean ± se)", "seeds ≥ 0.8"], rows);
}

h("M1 · 9. Hypothesis (d): item difficulties, ceiling and the response model");
{
  const items = [...ctx.content.items.values()].filter((i) => i.kind === "code") as CodeItem[];
  const rows = Object.values(CAP).map((cap) => {
    const bs = items.filter((i) => i.target === cap).map((i) => i.b);
    const fm = [...new Set(items.filter((i) => i.target === cap).map((i) => formatKind(i.format)))].join("/");
    const highNeed = M1.filter((id) => trueLevel(byId.get(id)!, cap, 1) >= 6).map((id) => `${id}@${trueLevel(byId.get(id)!, cap, 1)}`);
    const lowNeed = M1.filter((id) => trueLevel(byId.get(id)!, cap, 1) <= 2.5).map((id) => `${id}@${trueLevel(byId.get(id)!, cap, 1)}`);
    return [cap, String(bs.length), `${Math.min(...bs)}–${Math.max(...bs)}`, String(bs.filter((b) => b >= 6).length), String(bs.filter((b) => b <= 2.5).length), fm, highNeed.join(" ") || "-", lowNeed.join(" ") || "-"];
  });
  table(["capability", "code items", "b range", "b ≥ 6", "b ≤ 2.5", "formats", "M1 learners ≥ 6", "M1 learners ≤ 2.5"], rows);
  let learn = 0;
  let gap = 0;
  for (const id of M1)
    for (const x of frozen.get(id)!.recommendations.slice(0, 40))
      if (x.mode === "learning") {
        learn++;
        if (x.gaps.length) gap++;
      }
  console.log(`\nLearning choices with a bank gap in the first 40 items (frozen seed, M1 learners): ${gap} of ${learn}. A gap means the top-need capability had no unused item at 55–85% predicted success; it changes which item is practised, not how answers are scored.`);
  console.log("In the frozen simulation the learners answer with the SAME item parameters the engine uses, so difficulty mislabelling cannot cause the miss. For context, responses drawn from true difficulties that differ from the labels:");
  const rows2: (string | number)[][] = [];
  for (const sim of ["difficulty labels off by sd 0.5", "difficulty labels off by sd 0.75"]) {
    const vals: number[] = [];
    for (const seed of SEEDS) vals.push(m1(ctx, await run(ctx, M1, base(seed, { responder: SIMULATORS[sim] }))));
    rows2.push([sim, pm(vals), pm(vals.map((x, i) => x - m1Prod[i]))]);
  }
  const ex: number[] = [];
  for (const seed of SEEDS) ex.push(m1({ ...ctx, researchBinaryUpdate: exactModel(0) }, await run({ ...ctx, researchBinaryUpdate: exactModel(0) }, M1, base(seed))));
  rows2.push(["exact (grid) posterior instead of one Laplace step", pm(ex), pm(ex.map((x, i) => x - m1Prod[i]))]);
  table(["variant (10 seeds)", "M1", "paired change vs production"], rows2);
}

// ================================================================================================ M6 guesser
h("M6 · 0. The guesser (L9) on the frozen run: end of run (120 items), true level 4.0 everywhere");
const R = CRITERIA.robustness;
const guesser = (c: Context, r: RunResult) => {
  const est = STRANDS.map((n) => estimate(c, r, n).mean);
  const tru = STRANDS.map((n) => trueValue(r.learner, n, END_DAY));
  const err = est.map((e, i) => e - tru[i]);
  return { est, err, maxErr: Math.max(...err.map(Math.abs)), range: Math.max(...est) - Math.min(...est), worst: STRANDS[err.map(Math.abs).indexOf(Math.max(...err.map(Math.abs)))] };
};
{
  const g = guesser(ctx, frozen.get("L9")!);
  table(["", ...STRANDS], [["estimate", ...g.est], ["error", ...g.err]]);
  console.log(`Largest |error| ${g.maxErr.toFixed(2)} on ${g.worst} (limit ${R.guesserMaxError}) → ${g.maxErr <= R.guesserMaxError ? "ok" : "FAILS"}; range ${g.range.toFixed(2)} (limit ${R.guesserMaxRange}) → ${g.range <= R.guesserMaxRange ? "ok" : "FAILS"}; mean signed error ${f2(mean(g.err))}.`);
  const r = frozen.get("L9")!;
  const now = r.sessions.at(-1)!.now;
  const rows = Object.values(CAP).map((cap) => {
    const v = leafView(r.ledger.composite, ctx.index, cap, now);
    const ds = r.ledger.decisions.filter((d) => d.capability === cap && d.verdict === "accepted" && d.observation && d.observation.exposure !== "repeat");
    const by: Record<string, [number, number]> = {};
    for (const d of ds) {
      const it = ctx.content.items.get(d.observation!.item)!;
      const k = it.kind === "code" ? formatKind(it.format) : "writing";
      by[k] ??= [0, 0];
      by[k][0]++;
      if (d.observation!.kind === "binary") by[k][1] += d.observation!.value;
    }
    return [cap, v.mean, v.direct.mean, v.sd, String(v.direct.n), Object.entries(by).map(([k, [n, ok]]) => (k === "writing" ? `writing ${n}` : `${k} ${ok}/${n}`)).join(", ")];
  });
  table(["capability", "combined", "direct", "sd", "n", "evidence (right/total)"], rows);
}

h("M6 · 1. Over 10 seeds: which half of the criterion fails, and on which strand");
const g10 = SEEDS.map((s) => guesser(ctx, prod.get(s)!.get("L9")!));
{
  table(["seed", "max |error|", "worst strand", "range", "mean signed error", "error ok", "range ok"], g10.map((g, i) => [SEEDS[i] === PROTOCOL.seed ? "frozen" : String(SEEDS[i]), g.maxErr, g.worst, g.range, mean(g.err), g.maxErr <= R.guesserMaxError ? "yes" : "no", g.range <= R.guesserMaxRange ? "yes" : "no"]));
  console.log(`Error ok ${g10.filter((g) => g.maxErr <= R.guesserMaxError).length}/10, range ok ${g10.filter((g) => g.range <= R.guesserMaxRange).length}/10, both ${g10.filter((g) => g.maxErr <= R.guesserMaxError && g.range <= R.guesserMaxRange).length}/10.`);
  table(["mean signed error by strand (10 seeds)", ...STRANDS], [["L9", ...STRANDS.map((_, j) => mean(g10.map((g) => g.err[j])))]]);
  // the same quantity for an honest learner at a similar level: L1 is flat at 5
  const l1 = SEEDS.map((s) => guesser(ctx, prod.get(s)!.get("L1")!));
  console.log(`For comparison, L1 (flat at 5, no guessing): max |error| ${pm(l1.map((g) => g.maxErr))}, range ${pm(l1.map((g) => g.range))}, mean signed error ${pm(l1.map((g) => mean(g.err)))}.`);
  console.log(`The guesser criterion applied to L1, who answers honestly: error ok ${l1.filter((g) => g.maxErr <= R.guesserMaxError).length}/10, range ok ${l1.filter((g) => g.range <= R.guesserMaxRange).length}/10, both ${l1.filter((g) => g.maxErr <= R.guesserMaxError && g.range <= R.guesserMaxRange).length}/10.`);
}

h("M6 · 2. Why the estimate is pulled down: the level the model settles on when 30% of answers are random");
console.log("For many answers to items of difficulty b, the estimate settles where the model's P(right) equals the learner's real success rate");
console.log("0.7 · P(right | θ = 4) + 0.3 · (chance of a random answer being right). Random answers: choice 1/n; typed 5% (the simulator); order/match/multi the guessing floor.");
{
  const settle = (p: ItemParams, pg: number, theta = 4, g = 0.3) => {
    const actual = (1 - g) * pCorrect(theta, p) + g * pg;
    const L = (actual - p.c) / (1 - p.c);
    return L <= 0 ? -Infinity : p.b + Math.log(L / (1 - L)) / p.a;
  };
  const fmts: [string, number, number, number][] = [
    ["choice, 4 options", 1.1, 0.25, 0.25],
    ["choice, 3 options", 1.0, 1 / 3, 1 / 3],
    ["typed", 1.3, 0, 0.05],
    ["match 3 to 4 / order 4", 1.2, 1 / 24, 1 / 24],
    ["multi, 2 of 5", 1.1, 0.1, 0.1],
  ];
  const bs = [2, 3, 4, 5, 6];
  table(["format", "a", "c", ...bs.map((b) => `b = ${b}`)], fmts.map(([n, a, c, pg]) => [n, String(a), c.toFixed(3), ...bs.map((b) => settle({ a, b, c }, pg) - 4)]));
  console.log("(Values are the settled estimate minus the true 4.0. Easier items pull further: a learner who knows the answer still misses 30% × (1 − 1/n).)");
  // selection pitches items near the current estimate, so the estimate and the items drift down together:
  // the fixed point where the items' difficulty equals the settled estimate
  const fixed = (a: number, c: number, pg: number) => {
    let th = 4;
    for (let k = 0; k < 200; k++) th = settle({ a, b: th, c }, pg);
    return th - 4;
  };
  console.log(`If items are pitched at the current estimate (b = estimate), the estimate settles at: ${fmts.map(([n, a, c, pg]) => `${n} ${f2(fixed(a, c, pg))}`).join("; ")}.`);
  // the items L9 actually answered, frozen run: the expected bias per strand from those exact items
  const r = frozen.get("L9")!;
  const per: Record<string, { b: number[]; kinds: Record<string, number> }> = {};
  for (const d of r.ledger.decisions) {
    if (d.verdict !== "accepted" || d.observation?.kind !== "binary" || d.observation.exposure === "repeat") continue;
    const it = ctx.content.items.get(d.observation.item) as CodeItem;
    const s = strandOf(it.target);
    per[s] ??= { b: [], kinds: {} };
    per[s].b.push(it.b);
    per[s].kinds[formatKind(it.format)] = (per[s].kinds[formatKind(it.format)] ?? 0) + 1;
  }
  const writing = (s: string) => r.ledger.decisions.filter((d) => d.verdict === "accepted" && d.observation?.kind === "band" && d.capability && strandOf(d.capability) === s).length;
  console.log("\nItems L9 actually answered (frozen run, right/wrong items only) and its writing bands, by strand:");
  table(["strand", "right/wrong items", "mean b", "formats", "writing bands (no guessing)"], STRANDS.map((s) => [s, String(per[s]?.b.length ?? 0), mean(per[s]?.b ?? []), Object.entries(per[s]?.kinds ?? {}).map(([k, n]) => `${k} ${n}`).join(", "), String(writing(s))]));
}

h("M6 · 3. Is it the one-step Laplace update, or the response model? (L9, 10 seeds)");
{
  // diagnostic only: the exact posterior for the production model, and the exact posterior for a model that knows 30% of answers are random
  const pg = (p: ItemParams) => (p.c > 0 ? p.c : 0.05);
  const mixtureUpdate = (g: number) => (est: Estimate, p: ItemParams, correct: boolean): Estimate => {
    const sd = Math.sqrt(est.variance);
    let w0 = 0;
    let w1 = 0;
    let w2 = 0;
    for (let k = 0; k < 801; k++) {
      const th = est.mean + sd * (-8 + (16 * k) / 800);
      const P = g * pg(p) + (1 - g) * (p.c + (1 - p.c) * logistic(p.a * (th - p.b)));
      const w = Math.exp(-0.5 * ((th - est.mean) / sd) ** 2) * (correct ? P : 1 - P);
      w0 += w;
      w1 += w * th;
      w2 += w * th * th;
    }
    const m = w1 / w0;
    return { mean: m, variance: w2 / w0 - m * m };
  };
  const variants: [string, Context][] = [
    ["production (3PL, one Laplace step)", ctx],
    ["3PL, exact grid posterior", { ...ctx, researchBinaryUpdate: exactModel(0) }],
    ["DIAGNOSTIC: model told the true 30% random rate (exact)", { ...ctx, researchBinaryUpdate: mixtureUpdate(0.3) }],
  ];
  const rows: (string | number)[][] = [];
  for (const [name, c] of variants) {
    const gs: ReturnType<typeof guesser>[] = [];
    for (const seed of SEEDS) gs.push(guesser(c, c === ctx ? prod.get(seed)!.get("L9")! : (await run(c, ["L9"], base(seed))).get("L9")!));
    rows.push([name, pm(gs.map((g) => mean(g.err))), pm(gs.map((g) => g.maxErr)), pm(gs.map((g) => g.range)), `${gs.filter((g) => g.maxErr <= R.guesserMaxError && g.range <= R.guesserMaxRange).length}/10`]);
  }
  table(["update for right/wrong answers", "mean signed error", "max |error|", "range", "M6 guesser ok"], rows);
}

h("M6 · 4. Selection: contradiction probes and concentration (120 items, 10 seeds)");
{
  const rows = LEARNERS.map((l) => {
    const probes = SEEDS.map((s) => prod.get(s)!.get(l.id)!.recommendations.filter((x) => x.reason === "contradiction").length);
    const maxN = SEEDS.map((s) => {
      const r = prod.get(s)!.get(l.id)!;
      const now = r.sessions.at(-1)!.now;
      return Math.max(...Object.values(CAP).map((c) => leafView(r.ledger.composite, ctx.index, c, now).direct.n));
    });
    return [l.id, mean(probes), mean(maxN)];
  });
  table(["learner", "contradiction probes", "most observations on one capability"], rows);
}

h("M6 · 5. Does the existing person-fit statistic (research/person-fit.ts, l_z) detect the guesser? (10 seeds, current bank)");
{
  const by: Record<string, number[]> = {};
  for (const seed of SEEDS) for (const l of LEARNERS) (by[l.id] ??= []).push(lz(ctx, prod.get(seed)!.get(l.id)!));
  const others = Object.entries(by).filter(([id]) => id !== "L9").flatMap(([, x]) => x).sort((a, b) => a - b);
  const flag = others[Math.floor(0.05 * (others.length - 1))];
  const g = by.L9;
  const auc = g.reduce((s, x) => s + others.filter((o) => o > x).length + 0.5 * others.filter((o) => o === x).length, 0) / (g.length * others.length);
  table(["learner", "l_z mean", "min", "frozen seed"], LEARNERS.map((l) => [l.id, mean(by[l.id]), Math.min(...by[l.id]), by[l.id][0]]));
  console.log(`Guesser vs the other nine: AUC ${auc.toFixed(2)}; at the threshold giving 5% false flags among the others (l_z < ${flag.toFixed(2)}), the guesser is flagged in ${g.filter((x) => x < flag).length} of 10 seeds (frozen seed: ${g[0] < flag ? "flagged" : "not flagged"}). Textbook cut-off −2 flags ${g.filter((x) => x < -2).length} of 10 guesser runs.`);
  console.log("The statistic is research code only: the engine, the report and the frozen M6 measure do not use it.");
}

console.error(`\nDone in ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
