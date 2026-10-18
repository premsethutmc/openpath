/**
 * Estimator recovery study (research only, shadow): does the production estimator under-represent genuine
 * improvement after instruction, and would a recency-weighted or a learning-phase-aware estimator do better without
 * creating false mastery?
 *
 *   node tools/english/research/estimator-recovery.ts          JSON
 *   node tools/english/research/estimator-recovery.ts --md     the Markdown tables used in the docs
 *
 * SHADOW ONLY. Nothing here is used by the app or the ledger: production estimates, evidence thresholds and the
 * demonstrated rule are unchanged. Each method is computed beside the ledger from the same observations:
 *
 *   cumulative     the production rule, re-implemented: one Gaussian estimate per capability, updated by the same
 *                  3PL step (model.ts binaryUpdate), uncertainty growing by time_variance_per_day between answers
 *   recency        the same, plus a fixed forgetting step before every answer (variance += RECENCY_Q): older answers
 *                  weigh less (an exponentially weighted / random-walk estimate)
 *   phase          learning-phase aware: at each instruction on the capability, the estimate keeps its mean but its
 *                  uncertainty is widened to the prior's (so pre-instruction answers become a weak starting point),
 *                  and a demonstration needs the minimum answers and contexts again, from after the instruction
 *
 * The demonstrated level is the same for all three: the lower bound at demonstrated_probability, in half bands, with
 * demonstrated_min_direct answers and demonstrated_min_contexts formats (composite.ts demonstratedLevel). Answers
 * straight after teaching in the same session update the estimate but never count towards demonstrating (as in the
 * ledger). The "cumulative" re-implementation is checked against the ledger's own direct estimate.
 *
 * Learners are synthetic 3PL responders (seeded, deterministic). They test the estimators' behaviour, not learning.
 */
import { binaryUpdate, inflate, itemParams, type ItemParams, Ledger, leafView, normalQuantile, rng, type LedgerEvent } from "../../../packages/english-core/src/index.ts";
import { loadFramework, frameworkFile, RUNTIME_FRAMEWORK } from "../load.ts";
import { runScenarios, scenarioRecord, SVA, type ScenarioBank } from "../assessment-simulations.ts";

const fw = loadFramework(frameworkFile(RUNTIME_FRAMEWORK));
const P = fw.policy;
const PRIOR = { mean: fw.prior.mean, variance: fw.prior.sd ** 2 };
const Z = normalQuantile(P.demonstrated_probability);
export const RECENCY_Q = 0.25;
export const TARGET = 5;
const DAY = 86_400_000;

export type Method = "cumulative" | "recency" | "phase";
export const METHODS: Method[] = ["cumulative", "recency", "phase"];

export interface Obs {
  at: string;
  session: string;
  b: number;
  a: number;
  c: number;
  correct: boolean;
  context: string;
  /** False for an answer straight after teaching in the same session (updates, never demonstrates). */
  qualifying: boolean;
}

export interface Trace {
  at: string;
  mean: number;
  sd: number;
  level: number | null;
}

/** Run one method over observations and instruction times; the level after each answer. */
export function shadow(method: Method, obs: Obs[], instructions: string[]): Trace[] {
  let est = { ...PRIOR };
  let last: string | null = null;
  let qualifyingN = 0;
  const contexts = new Set<string>();
  const teach = [...instructions].sort();
  let ti = 0;
  const out: Trace[] = [];
  for (const o of [...obs].sort((x, y) => x.at.localeCompare(y.at))) {
    if (last) est = inflate(est, (Date.parse(o.at) - Date.parse(last)) / DAY, P.time_variance_per_day, PRIOR.variance);
    while (ti < teach.length && teach[ti] <= o.at) {
      if (method === "phase") {
        est = { mean: est.mean, variance: Math.max(est.variance, PRIOR.variance) };
        qualifyingN = 0;
        contexts.clear();
      }
      ti++;
    }
    if (method === "recency") est = { mean: est.mean, variance: Math.min(PRIOR.variance, est.variance + RECENCY_Q) };
    const p: ItemParams = { a: o.a, b: o.b, c: o.c };
    est = binaryUpdate(est, p, o.correct);
    last = o.at;
    if (o.qualifying) {
      qualifyingN++;
      contexts.add(o.context);
    }
    const lb = Math.floor((est.mean - Z * Math.sqrt(est.variance)) * 2) / 2;
    const level = qualifyingN >= P.demonstrated_min_direct && contexts.size >= P.demonstrated_min_contexts && lb >= 1 ? Math.min(lb, 8) : null;
    out.push({ at: o.at, mean: est.mean, sd: Math.sqrt(est.variance), level });
  }
  return out;
}

// ---------------------------------------------------------------- 1. replay the scenario records

/** The ledger's accepted, estimate-moving answers on a capability, as shadow observations. */
export function observationsFrom(events: LedgerEvent[], ctx: Parameters<typeof Ledger.rebuild>[0], cap: string): { obs: Obs[]; instructions: string[] } {
  const L = Ledger.rebuild(ctx, "shadow", events);
  const byId = new Map(events.map((e) => [e.id, e]));
  const obs: Obs[] = [];
  for (const d of L.decisions) {
    if (d.capability !== cap || d.verdict !== "accepted" || !d.observation || d.observation.kind !== "binary") continue;
    const o = d.observation as { item: string; value: number; context: string; exposure?: string; setting?: string };
    if (o.exposure === "repeat") continue;
    const it = ctx.content.items.get(o.item);
    if (!it || it.kind !== "code") continue;
    const ev = byId.get(d.source)!;
    const { c } = itemParams(it);
    obs.push({ at: d.at, session: (ev as { session: string }).session, b: it.b, a: it.a, c, correct: o.value === 1, context: o.context, qualifying: o.setting !== "after_teaching" });
  }
  const instructions = events.filter((e) => e.kind === "intervention" && (e as { capability?: string }).capability === cap).map((e) => e.at);
  return { obs, instructions };
}

export async function scenarioReplay(bank: ScenarioBank) {
  const rs = await runScenarios(bank);
  return rs.map((r) => {
    const { events, ectx } = scenarioRecord(r);
    const { obs, instructions } = observationsFrom(events, ectx.ctx, SVA);
    const L = Ledger.rebuild(ectx.ctx, "shadow", events);
    const at = obs.at(-1)?.at ?? events.at(-1)!.at;
    const v = leafView(L.composite, ectx.ctx.index, SVA, at);
    const per = Object.fromEntries(METHODS.map((m) => [m, shadow(m, obs, instructions).at(-1) ?? null])) as Record<Method, Trace | null>;
    return {
      scenario: r.id,
      title: r.title,
      answers: obs.length,
      instructions: instructions.length,
      engine: { directMean: Math.round(v.direct.mean * 100) / 100, directSd: Math.round(v.direct.sd * 100) / 100 },
      // the re-implemented production rule should match the ledger's own direct estimate
      cumulativeMatchesEngine: per.cumulative ? Math.abs(per.cumulative.mean - v.direct.mean) < 0.05 && Math.abs(per.cumulative.sd - v.direct.sd) < 0.05 : obs.length === 0,
      level: Object.fromEntries(METHODS.map((m) => [m, per[m]?.level ?? null])),
      mean: Object.fromEntries(METHODS.map((m) => [m, per[m] ? Math.round(per[m]!.mean * 100) / 100 : null])),
    };
  });
}

// ---------------------------------------------------------------- 2. Monte Carlo learners on the essay schedule

/**
 * The essay workflow's schedule for one competency, with an unlimited supply of reviewed questions (to separate the
 * estimator from content shortage): a diagnostic of 3 near the target before teaching (day 0), teaching (day 0),
 * guided practice (held, not evidence), the journey's check of 2 (day 1), up to three later checks of 2 (spaced 1, 3
 * and 7 days, while not shown), and a delayed retention check of 2 at least 7 days after the target is first shown.
 * Formats alternate: choice (a 1.1, c 0.25) and typed (a 1.3, c 0).
 */
interface Learner {
  name: string;
  /** True ability at a day, given whether teaching has happened. */
  theta: (day: number, taught: boolean) => number;
  /** Choice questions only (worst case for lucky guesses). */
  choiceOnly?: boolean;
}

const LEARNERS: Learner[] = [
  { name: "improver: 3.5 before teaching, 6 after", theta: (_d, t) => (t ? 6 : 3.5) },
  { name: "slow improver: 3.5 before, 5.5 after", theta: (_d, t) => (t ? 5.5 : 3.5) },
  { name: "below target throughout: 4", theta: () => 4 },
  { name: "well below, choice questions only (lucky guesses): 3", theta: () => 3, choiceOnly: true },
  { name: "just below, choice questions only (lucky guesses): 4.5", theta: () => 4.5, choiceOnly: true },
  { name: "at target throughout: 6", theta: () => 6 },
  { name: "forgets: 6 after teaching, 3.5 from day 7", theta: (d, t) => (t ? (d < 7 ? 6 : 3.5) : 3.5) },
];

export const SEEDS = 400;

interface RunOut {
  shownEver: boolean;
  shownAtEnd: boolean;
  /** Answers after teaching until first shown (null: never). */
  answersToShow: number | null;
  /** Times the shown-at-target status changed after first being shown. */
  flips: number;
  /** Shown at target after the retention check's answers (null: no retention check was reached). */
  shownAfterRetention: boolean | null;
  /** Shown at target at a moment when the true ability was below the target. */
  falseShown: boolean;
}

function simulate(method: Method, learner: Learner, seed: number): RunOut {
  const next = rng(seed * 7919 + learner.name.length);
  const obs: Obs[] = [];
  const instructions: string[] = [];
  const day0 = Date.parse("2026-10-19T09:00:00.000Z");
  let k = 0;
  let minute = 0;
  const iso = (day: number) => new Date(day0 + day * DAY + ++minute * 60_000).toISOString();
  let taught = false;
  const ask = (day: number, b: number, session: string, qualifying = true) => {
    const choice = learner.choiceOnly || k % 2 === 0;
    k++;
    const p = { a: choice ? 1.1 : 1.3, b, c: choice ? 0.25 : 0 };
    const th = learner.theta(day, taught);
    const pr = p.c + (1 - p.c) / (1 + Math.exp(-p.a * (th - p.b)));
    obs.push({ at: iso(day), session, ...p, correct: next() < pr, context: choice ? (learner.choiceOnly && k % 2 ? "choice:proofread" : "choice:grammar") : "typed:cloze", qualifying });
  };
  const level = () => shadow(method, obs, instructions).at(-1)?.level ?? null;
  const shown = () => (level() ?? 0) >= TARGET;
  const out: RunOut = { shownEver: false, shownAtEnd: false, answersToShow: null, flips: 0, shownAfterRetention: null, falseShown: false };
  let prev: boolean | null = null;
  let afterTeach = 0;
  const observe = (day: number) => {
    const s = shown();
    if (s && learner.theta(day, taught) < TARGET) out.falseShown = true;
    if (s && !out.shownEver) {
      out.shownEver = true;
      out.answersToShow = afterTeach;
    }
    if (prev !== null && out.shownEver && s !== prev) out.flips++;
    prev = s;
  };
  // diagnostic (before teaching)
  for (const b of [4.5, 5, 5.5]) {
    ask(0, b, "d0");
    observe(0);
  }
  // teaching (same day): later answers that day would not qualify; none are asked
  instructions.push(iso(0));
  taught = true;
  // journey's check, next day
  let day = 1;
  let shownDay: number | null = null;
  const check = (d: number, bs: number[]) => {
    for (const b of bs) {
      ask(d, b, `c${d}`);
      afterTeach++;
      observe(d);
    }
    if (shown() && shownDay === null) shownDay = d;
  };
  check(day, [5.25, 5.75]);
  for (const gap of [1, 3, 7]) {
    if (shownDay !== null) break;
    day += gap;
    check(day, [5.25, 5.75]);
  }
  if (shownDay !== null) {
    const rd = Math.max(day + 1, shownDay + 7);
    check(rd, [5, 5.5]);
    out.shownAfterRetention = shown();
    day = rd;
  }
  out.shownAtEnd = shown();
  return out;
}

export function monteCarlo(seeds = SEEDS) {
  return LEARNERS.map((l) => {
    const row: Record<string, unknown> = { learner: l.name };
    for (const m of METHODS) {
      const rs = Array.from({ length: seeds }, (_, s) => simulate(m, l, s + 1));
      const shownAfter = rs.filter((r) => r.shownAfterRetention !== null);
      const toShow = rs.map((r) => r.answersToShow).filter((x): x is number => x !== null);
      row[m] = {
        shownEver: rs.filter((r) => r.shownEver).length / seeds,
        falseShown: rs.filter((r) => r.falseShown).length / seeds,
        shownAtEnd: rs.filter((r) => r.shownAtEnd).length / seeds,
        meanAnswersToShow: toShow.length ? Math.round((toShow.reduce((a, b) => a + b, 0) / toShow.length) * 10) / 10 : null,
        meanFlips: Math.round((rs.reduce((a, r) => a + r.flips, 0) / seeds) * 100) / 100,
        retentionReached: shownAfter.length / seeds,
        shownAfterRetention: shownAfter.length ? shownAfter.filter((r) => r.shownAfterRetention).length / shownAfter.length : null,
      };
    }
    return row;
  });
}

/**
 * Lucky guesses, deterministically: a learner at band 3 misses every diagnostic question, then guesses the two
 * choice questions of the journey's check and the first later check right. What does each method show?
 */
export function luckyStreak() {
  const day0 = Date.parse("2026-10-19T09:00:00.000Z");
  const at = (d: number, m: number) => new Date(day0 + d * DAY + m * 60_000).toISOString();
  const ch = (d: number, m: number, b: number, correct: boolean): Obs => ({ at: at(d, m), session: `d${d}`, a: 1.1, b, c: 0.25, correct, context: m % 2 ? "choice:grammar" : "choice:punctuation", qualifying: true });
  const obs = [ch(0, 1, 4.5, false), ch(0, 2, 5, false), ch(0, 3, 5.5, false), ch(1, 1, 5.25, true), ch(1, 2, 5.75, true), ch(2, 1, 5.25, true), ch(2, 2, 5.75, true)];
  return Object.fromEntries(METHODS.map((m) => [m, shadow(m, obs, [at(0, 4)]).map((t) => t.level)]));
}

function markdown(replay: Record<string, Awaited<ReturnType<typeof scenarioReplay>>>, mc: ReturnType<typeof monteCarlo>): string {
  const pct = (x: number | null | undefined) => (x === null || x === undefined ? "–" : `${Math.round(x * 100)}%`);
  const lines = ["**Scenario replays (subject–verb agreement): final demonstrated level per method.** The cumulative column is the production rule re-implemented; ✓ where it matches the ledger's own estimate.", ""];
  for (const [bank, rows] of Object.entries(replay)) {
    lines.push(`*${bank} bank*`, "", "| Scenario | Answers | Cumulative (production) | Recency-weighted | Phase-aware |", "|---|---:|---|---|---|");
    for (const r of rows) lines.push(`| ${r.scenario}. ${r.title} | ${r.answers} | ${r.level.cumulative ?? "—"} ${r.cumulativeMatchesEngine ? "✓" : "✗"} | ${r.level.recency ?? "—"} | ${r.level.phase ?? "—"} |`);
    lines.push("");
  }
  lines.push(
    `**Monte Carlo (${SEEDS} seeded learners each, unlimited reviewed questions, the essay schedule with up to three later checks).** "Shown" = demonstrated at band ${TARGET} or above.`,
    "",
    "| Learner | Method | Ever shown | Shown while truly below 5 (false mastery) | Answers after teaching to be shown | Status flips after first shown | Shown after the delayed check |",
    "|---|---|---:|---:|---:|---:|---:|",
  );
  for (const row of mc)
    for (const m of METHODS) {
      const x = row[m] as Record<string, number | null>;
      lines.push(`| ${row.learner} | ${m} | ${pct(x.shownEver)} | ${pct(x.falseShown)} | ${x.meanAnswersToShow ?? "–"} | ${x.meanFlips} | ${pct(x.shownAfterRetention)} (of ${pct(x.retentionReached)} reaching it) |`);
    }
  const ls = luckyStreak();
  lines.push("", "**Lucky streak (deterministic):** a band-3 learner misses all three diagnostic questions, is taught, then guesses four choice questions right (b 5.25–5.75) over two days. Level after each answer:", "", "| Method | Levels |", "|---|---|", ...METHODS.map((m) => `| ${m} | ${ls[m].map((x: number | null) => x ?? "—").join(" → ")} |`));
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const replay: Record<string, Awaited<ReturnType<typeof scenarioReplay>>> = {};
  for (const b of ["app", "core", "reviewed-supplement"] as ScenarioBank[]) replay[b] = await scenarioReplay(b);
  const mc = monteCarlo();
  console.log(process.argv.includes("--md") ? markdown(replay, mc) : JSON.stringify({ shadowOnly: true, recencyQ: RECENCY_Q, target: TARGET, seeds: SEEDS, replay, monteCarlo: mc, luckyStreak: luckyStreak() }, null, 1));
}
