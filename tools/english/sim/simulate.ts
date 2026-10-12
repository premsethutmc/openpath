/**
 * The ten-learner simulation (E1-9). Runs every measure in criteria.ts and
 * returns plain results; report.ts turns them into a page.
 *
 *   node tools/english/sim/main.ts          writes tools/english/out/simulation-report.html and .json
 */
import { createHash } from "node:crypto";
import {
  type Context,
  type Goal,
  Ledger,
  type LedgerEvent,
  aggregate,
  buildEvaluationRequest,
  leafView,
  normalQuantile,
  qualify,
  spellingCeiling,
  misspellingRate,
  type WritingTask,
  LOW_GUESSING,
  guessingFloor,
} from "../../../packages/english-core/src/index.ts";
import { CRITERIA, PROTOCOL } from "./criteria.ts";
import { CAP, LEARNERS, type SimLearner, trueLevel, trueLevels, writeResponse } from "./learners.ts";
import { type RunResult, anchorRequest, at, runLearner, simEvaluator, writingTasks } from "./run.ts";

export const STRANDS = ["EN.FND", "EN.VOC", "EN.GRM", "EN.SEN", "EN.RDG", "EN.WRT"];

/** True value of any node: a leaf's level, or the equal-weight mean of the skeleton leaves under it. */
export function trueValue(l: SimLearner, node: string, day: number): number {
  const leaves = Object.values(CAP).filter((c) => c === node || c.startsWith(node + ".") || node === "EN");
  return leaves.reduce((s, c) => s + trueLevel(l, c, day), 0) / leaves.length;
}

export function estimate(ctx: Context, r: RunResult, node: string, composite = r.ledger.composite, now = r.sessions.at(-1)!.now): { mean: number; sd: number } {
  if (ctx.index.leaves.has(node)) {
    const v = leafView(composite, ctx.index, node, now);
    return { mean: v.mean, sd: v.sd };
  }
  const a = aggregate(composite, ctx.index, now).get(node)!;
  return { mean: a.mean, sd: a.sd };
}

export function spearman(a: number[], b: number[]): number {
  const rank = (x: number[]) => {
    const idx = x.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(x.length);
    for (let i = 0; i < idx.length; ) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
      i = j + 1;
    }
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : NaN;
}

export interface Measure {
  id: string;
  name: string;
  value: string;
  passLevel: string;
  pass: boolean;
  detail: string[];
}

export async function runAll(ctx: Context, seed = PROTOCOL.seed): Promise<RunResult[]> {
  const goal = ctx.content.goals.get(PROTOCOL.goal)!;
  const out: RunResult[] = [];
  for (const l of LEARNERS)
    out.push(await runLearner(ctx, l, { goal, sessionDays: PROTOCOL.sessionDays, itemsPerSession: PROTOCOL.itemsPerSession, seed, evaluatorNoise: PROTOCOL.evaluatorNoise }));
  return out;
}

export function fingerprint(results: RunResult[]): string {
  const h = createHash("sha256");
  for (const r of results) h.update(JSON.stringify({ c: r.ledger.composite, d: r.ledger.decisions, rec: r.recommendations }));
  return h.digest("hex");
}

// ---------------------------------------------------------------- efficiency (M5)

const GRAMMAR = [CAP.art, CAP.asp, CAP.sva, CAP.com];

async function itemsToThreshold(ctx: Context, l: SimLearner, order: "adaptive" | "random", seed: number): Promise<number> {
  const goal: Goal = { id: "grammar4", name: "The four grammar capabilities", weights: Object.fromEntries(GRAMMAR.map((g) => [g, 1])) };
  const only = new Set([...ctx.content.items.values()].filter((i) => i.kind === "code" && GRAMMAR.includes(i.target as never)).map((i) => i.id));
  let reached: number | null = null;
  const r = await runLearner(ctx, l, {
    goal,
    sessionDays: [0],
    itemsPerSession: only.size,
    seed,
    evaluatorNoise: PROTOCOL.evaluatorNoise,
    order,
    only,
    writing: false,
    stop: (ledger, now) => {
      const sd = GRAMMAR.reduce((s, c) => s + leafView(ledger.composite, ctx.index, c, now).sd, 0) / GRAMMAR.length;
      return sd <= CRITERIA.efficiency.sdThreshold;
    },
    onItem: ({ n, ledger, now }) => {
      if (reached !== null) return;
      const sd = GRAMMAR.reduce((s, c) => s + leafView(ledger.composite, ctx.index, c, now).sd, 0) / GRAMMAR.length;
      if (sd <= CRITERIA.efficiency.sdThreshold) reached = n;
    },
  });
  void r;
  return reached ?? only.size + 1;
}

// ---------------------------------------------------------------- safety (M7)

type Case = "invent_quote" | "out_of_range" | "unknown_tag" | "foreign_capability" | "set_stage" | "bad_schema" | "off_task_flag" | "inflate_spelling" | "unqualified" | "drifting";
export const CASES: Case[] = ["invent_quote", "out_of_range", "unknown_tag", "foreign_capability", "set_stage", "bad_schema", "off_task_flag", "inflate_spelling", "unqualified", "drifting"];

export async function faultInjection(ctx: Context, results: RunResult[]): Promise<{ total: number; applied: number; byCase: Record<string, { cases: number; applied: number; outcomes: Record<string, number> }> }> {
  const byCase: Record<string, { cases: number; applied: number; outcomes: Record<string, number> }> = {};
  let total = 0;
  let applied = 0;
  for (const r of results) {
    const base = r.ledger.events.slice(0, 1 + 20); // qualification + first session
    const day = 1;
    const when = at(day, 30);
    for (const task of writingTasks(ctx)) {
      const text = writeResponse(r.learner, task, day);
      const evId = `${r.learner.id}:fault:${task.id}`;
      const evidence: LedgerEvent = { kind: "evidence", id: evId, at: when, session: `${r.learner.id}:fault`, item: { id: task.id, version: task.version }, response: { kind: "writing", text } };
      const before = Ledger.rebuild(ctx, r.learner.id, [...base, evidence]);
      const req = buildEvaluationRequest(task as WritingTask, evId, text, before.composite, ctx.index, when, "candidates");
      for (const c of CASES) {
        if (c === "inflate_spelling" && spellingCeiling(misspellingRate(text, ctx.content).rate) === null) continue; // only a fault where code can see the misspellings
        const extra: LedgerEvent[] = [];
        let evaluatorId = "mock:stand-in";
        let faults: Parameters<typeof simEvaluator>[3]["faults"];
        if (c === "unqualified") evaluatorId = "mock:unqualified";
        else if (c === "drifting") {
          evaluatorId = "mock:drifting";
          const drifter = simEvaluator(ctx, null, () => day, { id: evaluatorId, noise: 0.7, seed: 7, bias: 1.5 });
          extra.push(await qualify(drifter, writingTasks(ctx), (t, id) => anchorRequest(ctx, t, id, when), when, { drifting: true, candidateAnchors: true }));
        } else faults = () => [c];
        const ev = simEvaluator(ctx, r.learner, () => day, { id: evaluatorId, noise: PROTOCOL.evaluatorNoise, seed: PROTOCOL.seed, faults });
        const pid = `p:${evId}:${c}`;
        const ledger = Ledger.rebuild(ctx, r.learner.id, [...base, ...extra, evidence, { kind: "proposal", id: pid, at: when, evidence: evId, evaluator: { id: evaluatorId }, body: await ev.evaluate(req) }]);
        const ds = ledger.decisions.filter((d) => d.source === pid);
        const accepted = ds.filter((d) => d.verdict === "accepted");
        let bad = false;
        if (c === "invent_quote" || c === "out_of_range") bad = accepted.some((d) => d.capability === task.targets[0]);
        else if (c === "foreign_capability") bad = accepted.some((d) => d.capability === "EN.RDG.INF.motives");
        else if (c === "unknown_tag") bad = Object.values(ledger.composite.nodes).some((n) => "made_up_tag" in n.misconceptions);
        else if (c === "inflate_spelling") bad = accepted.some((d) => d.capability === CAP.wsp);
        else bad = accepted.length > 0;
        const b = (byCase[c] ??= { cases: 0, applied: 0, outcomes: {} });
        b.cases++;
        total++;
        if (bad) {
          b.applied++;
          applied++;
        }
        const key = ds.map((d) => d.verdict).sort().join("+") || "none";
        b.outcomes[key] = (b.outcomes[key] ?? 0) + 1;
      }
    }
  }
  return { total, applied, byCase };
}

// ---------------------------------------------------------------- all measures

export async function measures(ctx: Context, results: RunResult[], determinismFingerprints: [string, string]): Promise<{ measures: Measure[]; efficiency: { learner: string; adaptive: number; random: number }[]; safety: Awaited<ReturnType<typeof faultInjection>> }> {
  const byId = new Map(results.map((r) => [r.learner.id, r]));
  const endDay = PROTOCOL.sessionDays.at(-1)!;
  const early = PROTOCOL.earlyCheckAfterSessions - 1;
  const ms: Measure[] = [];

  // M1
  {
    const rows = CRITERIA.profileRecovery.learners.map((id) => {
      const r = byId.get(id)!;
      const s = r.sessions[early];
      const est = STRANDS.map((n) => estimate(ctx, r, n, s.composite, s.now).mean);
      const tru = STRANDS.map((n) => trueValue(r.learner, n, s.day));
      return { id, rho: spearman(tru, est) };
    });
    const mean = rows.reduce((s, x) => s + x.rho, 0) / rows.length;
    // For context only (not the pass level): the same measure at the end of the run.
    const endRows = CRITERIA.profileRecovery.learners.map((id) => {
      const r = byId.get(id)!;
      return spearman(STRANDS.map((n) => trueValue(r.learner, n, endDay)), STRANDS.map((n) => estimate(ctx, r, n).mean));
    });
    rows.push({ id: "for context, after 120 items: mean", rho: endRows.reduce((s, x) => s + x, 0) / endRows.length });
    ms.push({ id: "M1", name: "Profile recovery after 40 items", value: `mean ρ = ${mean.toFixed(2)}`, passLevel: `≥ ${CRITERIA.profileRecovery.minMeanSpearman}`, pass: mean >= CRITERIA.profileRecovery.minMeanSpearman, detail: rows.map((x) => `${x.id}: ρ = ${x.rho.toFixed(2)}`) });
  }
  // M2
  {
    const rows = CRITERIA.weakestStrand.learners.map((id) => {
      const r = byId.get(id)!;
      const tru = STRANDS.map((n) => trueValue(r.learner, n, endDay));
      const est = STRANDS.map((n) => estimate(ctx, r, n).mean);
      const t = STRANDS[tru.indexOf(Math.min(...tru))];
      const e = STRANDS[est.indexOf(Math.min(...est))];
      return { id, t, e, ok: t === e };
    });
    const n = rows.filter((x) => x.ok).length;
    ms.push({ id: "M2", name: "Weakest strand named correctly", value: `${n} of ${rows.length}`, passLevel: `≥ ${CRITERIA.weakestStrand.minCorrect} of ${rows.length}`, pass: n >= CRITERIA.weakestStrand.minCorrect, detail: rows.map((x) => `${x.id}: true ${x.t}, estimated ${x.e}${x.ok ? "" : " ✗"}`) });
  }
  // M3
  {
    const rows = CRITERIA.separation.map((p) => {
      const A = byId.get(p.a)!;
      const B = byId.get(p.b)!;
      const ea = estimate(ctx, A, p.node);
      const eb = estimate(ctx, B, p.node);
      const gap = Math.abs(ea.mean - eb.mean);
      return { ...p, gap, need: ea.sd + eb.sd, ok: gap > ea.sd + eb.sd, ea, eb };
    });
    const n = rows.filter((x) => x.ok).length;
    ms.push({ id: "M3", name: "Pairs told apart on their distinguishing dimension", value: `${n} of ${rows.length}`, passLevel: "all", pass: n === rows.length, detail: rows.map((x) => `${x.a} vs ${x.b} on ${x.node}: ${x.ea.mean.toFixed(2)} vs ${x.eb.mean.toFixed(2)}, gap ${x.gap.toFixed(2)} vs needed ${x.need.toFixed(2)}${x.ok ? "" : " ✗"}`) });
  }
  // M4
  {
    const z = normalQuantile(0.5 + CRITERIA.coverage.level / 2);
    let inside = 0;
    let n = 0;
    for (const r of results) {
      const now = r.sessions.at(-1)!.now;
      for (const c of Object.values(CAP)) {
        const v = leafView(r.ledger.composite, ctx.index, c, now);
        if (v.direct.n < 2) continue;
        n++;
        if (Math.abs(trueLevel(r.learner, c, endDay) - v.mean) <= z * v.sd) inside++;
      }
    }
    const share = inside / n;
    ms.push({ id: "M4", name: "Honest uncertainty: 80% ranges containing the truth", value: `${(share * 100).toFixed(0)}% (${inside}/${n})`, passLevel: `${CRITERIA.coverage.min * 100}–${CRITERIA.coverage.max * 100}%`, pass: share >= CRITERIA.coverage.min && share <= CRITERIA.coverage.max, detail: [] });
  }
  // M5
  const efficiency: { learner: string; adaptive: number; random: number }[] = [];
  {
    for (const l of LEARNERS) {
      const adaptive = await itemsToThreshold(ctx, l, "adaptive", PROTOCOL.seed);
      let random = 0;
      for (let s = 0; s < CRITERIA.efficiency.randomSeeds; s++) random += await itemsToThreshold(ctx, l, "random", PROTOCOL.seed + 1 + s);
      efficiency.push({ learner: l.id, adaptive, random: random / CRITERIA.efficiency.randomSeeds });
    }
    const a = efficiency.reduce((s, x) => s + x.adaptive, 0) / efficiency.length;
    const rnd = efficiency.reduce((s, x) => s + x.random, 0) / efficiency.length;
    ms.push({ id: "M5", name: `Efficiency: items to mean sd ≤ ${CRITERIA.efficiency.sdThreshold} on grammar`, value: `adaptive ${a.toFixed(1)} vs random ${rnd.toFixed(1)} (ratio ${(a / rnd).toFixed(2)})`, passLevel: `ratio ≤ ${CRITERIA.efficiency.maxRatio}`, pass: a / rnd <= CRITERIA.efficiency.maxRatio, detail: efficiency.map((x) => `${x.learner}: ${x.adaptive} vs ${x.random.toFixed(1)}`) });
  }
  // M6
  {
    const g = byId.get("L9")!;
    const tru = STRANDS.map((n) => trueValue(g.learner, n, endDay));
    const est = STRANDS.map((n) => estimate(ctx, g, n).mean);
    const maxErr = Math.max(...est.map((e, i) => Math.abs(e - tru[i])));
    const range = Math.max(...est) - Math.min(...est);
    const f = byId.get("L10")!;
    const now = f.sessions.at(-1)!.now;
    const views = GRAMMAR.map((c) => leafView(f.ledger.composite, ctx.index, c, now));
    const flagged = views.filter((v) => v.stage === "needs_review" || v.mean <= CRITERIA.robustness.forgetterFlagAt).length;
    const overMastered = views.filter((v) => v.mastered !== null && v.mastered > CRITERIA.robustness.forgetterMaxMastered).length;
    const R = CRITERIA.robustness;
    const guesserOk = maxErr <= R.guesserMaxError && range <= R.guesserMaxRange;
    const forgetterOk = flagged >= R.forgetterMinFlagged && overMastered === 0;
    ms.push({
      id: "M6",
      name: "Robustness: guesser and forgetter",
      value: `guesser ${guesserOk ? "ok" : "not ok"}; forgetter ${forgetterOk ? "ok" : "not ok"}`,
      passLevel: "both ok",
      pass: guesserOk && forgetterOk,
      detail: [
        `L9 guesser: largest strand error ${maxErr.toFixed(2)} (≤ ${R.guesserMaxError}), estimated range ${range.toFixed(2)} (≤ ${R.guesserMaxRange})`,
        `L10 forgetter: ${flagged} of 4 grammar capabilities flagged (needs review or ≤ ${R.forgetterFlagAt}); ${overMastered} reported mastered above ${R.forgetterMaxMastered}`,
        ...views.map((v) => `   ${v.name}: ${v.mean.toFixed(2)} ± ${v.sd.toFixed(2)}, ${v.stage}${v.masteredBefore ? ` (mastered at ${v.masteredBefore} before)` : ""}`),
      ],
    });
  }
  // M7
  const safety = await faultInjection(ctx, results);
  ms.push({
    id: "M7",
    name: "Safety: faulty evaluator output applied",
    value: `${safety.applied} of ${safety.total} injected faults`,
    passLevel: `${CRITERIA.safety.maxApplied}`,
    pass: safety.applied <= CRITERIA.safety.maxApplied,
    detail: Object.entries(safety.byCase).map(([c, b]) => `${c}: ${b.cases} cases, ${b.applied} applied (${Object.entries(b.outcomes).map(([k, v]) => `${k} ×${v}`).join(", ")})`),
  });
  // M8
  ms.push({ id: "M8", name: "Determinism: two runs identical", value: determinismFingerprints[0] === determinismFingerprints[1] ? "identical" : "different", passLevel: "identical", pass: determinismFingerprints[0] === determinismFingerprints[1], detail: [`run 1 ${determinismFingerprints[0].slice(0, 16)}…`, `run 2 ${determinismFingerprints[1].slice(0, 16)}…`] });
  return { measures: ms, efficiency, safety };
}

export { trueLevels };


// ---------------------------------------------------------------- what the item bank prevents (reported separately)

export interface BankLimits {
  bankSize: number;
  perCapability: { capability: string; name: string; items: number; formats: string[]; guessable: boolean; maxDifficulty: number }[];
  itemsUsedPerLearner: number;
  exhaustedAtEnd: { learner: string; capabilities: number }[];
  learningRecs: number;
  learningRecsWithGap: number;
  learningGapsByCapability: Record<string, number>;
  retentionChecksBlocked: number;
  /** Retention checks that ran, by the exposure of the item used (fresh, variant, flagged repeat). */
  retentionChecksByExposure: Record<string, number>;
  overdueUnverifiableAtEnd: { learner: string; capability: string }[];
  ceilingLearner: { learner: string; trueLevel: number; meanEstimate: number };
}

export function bankLimits(ctx: Context, results: RunResult[]): BankLimits {
  // the frozen simulation never offers short written responses (E3), so they are not part of its bank
  const items = [...ctx.content.items.values()].filter((i) => i.kind !== "short");
  const perCapability = Object.values(CAP).map((cap) => {
    const its = items.filter((i) => (i.kind === "writing" ? i.targets.includes(cap) : i.target === cap));
    const formats = [...new Set(its.map((i) => i.format))];
    return { capability: cap, name: ctx.index.names.get(cap)!, items: its.length, formats, guessable: its.every((i) => i.kind === "code" && guessingFloor(i) > LOW_GUESSING), maxDifficulty: Math.max(...its.map((i) => i.b)) };
  });
  const gapsByCap: Record<string, number> = {};
  let learningRecs = 0;
  let learningRecsWithGap = 0;
  let blocked = 0;
  const byExposure: Record<string, number> = { fresh: 0, variant: 0, repeat: 0 };
  for (const r of results)
    for (const rec of r.recommendations) {
      if (rec.path === "retention_check") byExposure[rec.exposure] = (byExposure[rec.exposure] ?? 0) + 1;
      blocked += rec.retentionBlocked.length;
      const learningGaps = rec.gaps;
      if (rec.mode === "learning") {
        learningRecs++;
        if (learningGaps.length) learningRecsWithGap++;
      }
      for (const g of learningGaps) gapsByCap[ctx.index.names.get(g)!] = (gapsByCap[ctx.index.names.get(g)!] ?? 0) + 1;
    }
  const overdue: BankLimits["overdueUnverifiableAtEnd"] = [];
  const exhausted: BankLimits["exhaustedAtEnd"] = [];
  for (const r of results) {
    const used = new Set(r.recommendations.map((x) => x.item));
    const now = r.sessions.at(-1)!.now;
    let n = 0;
    for (const cap of Object.values(CAP)) {
      const left = items.filter((i) => !used.has(i.id) && (i.kind === "writing" ? i.targets.includes(cap) : i.target === cap)).length;
      if (left === 0) n++;
      if (left === 0 && leafView(r.ledger.composite, ctx.index, cap, now).retention.status === "overdue") overdue.push({ learner: r.learner.id, capability: ctx.index.names.get(cap)! });
    }
    exhausted.push({ learner: r.learner.id, capabilities: n });
  }
  const l7 = results.find((r) => r.learner.id === "L7")!;
  const now7 = l7.sessions.at(-1)!.now;
  const mean7 = Object.values(CAP).reduce((s, c) => s + leafView(l7.ledger.composite, ctx.index, c, now7).mean, 0) / Object.values(CAP).length;
  return {
    bankSize: items.length,
    perCapability,
    itemsUsedPerLearner: Math.round(results.reduce((s, r) => s + r.items, 0) / results.length),
    exhaustedAtEnd: exhausted,
    learningRecs,
    learningRecsWithGap,
    learningGapsByCapability: gapsByCap,
    retentionChecksBlocked: blocked,
    retentionChecksByExposure: byExposure,
    overdueUnverifiableAtEnd: overdue,
    ceilingLearner: { learner: "L7", trueLevel: 7.5, meanEstimate: mean7 },
  };
}
