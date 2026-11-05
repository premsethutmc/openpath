/**
 * learner-state-eval@1 (research only). Seeded synthetic learners with a HIDDEN per-skill-unit knowledge state, driven through the real
 * OpenPath math journey (frontend/src/journey/session.ts SliceSession: real moduleState selection, real server grader, real evidenceFor
 * status/retention, real teaching events). The only simulated thing is whether the learner answers right.
 *
 * Reuses: SliceSession + start/unitKey/wrongAnswer (frontend/src/journey/evid-driver.ts), activityFor (frontend/src/learning/driver.ts),
 * the seeded RNG of the S1 simulator (research/synthetic-learners/src/rng.ts).
 *
 * Every number in PROFILES is a synthetic assumption, not an empirical statistic about real students.
 */
import { moduleFor, question } from "../../../packages/learning/src/content";
import { skillUnits, unitOfStrategy } from "../../../packages/learning/src/skill-units";
import { DAY } from "../../../packages/learning/src/evidence";
import { activityFor } from "../../../frontend/src/learning/driver";
import { start, unitKey, wrongAnswer, SHOWN } from "../../../frontend/src/journey/evid-driver";
import type { SliceSession } from "../../../frontend/src/journey/session";
import { Rng, fnv } from "../../synthetic-learners/src/rng";
import { withCoverageGate } from "./coverage-gate";

export const HARNESS_VERSION = "learner-state-eval@1" as const;
export type Kind = "strong-slipper" | "weak-guesser" | "improver" | "forgetter" | "sibling-gap";
export const KINDS: Kind[] = ["strong-slipper", "weak-guesser", "improver", "forgetter", "sibling-gap"];
export const SUBJECTS = ["MATH.algebra.linear-intro", "MATH.number.equivalent-fractions", "MATH.measurement.money-decimals"];
/** Synthetic parameters (assumptions). slip: P(wrong | knows unit). guess: P(right | does not know unit). learn: P(unit learned when its
 *  scoped explanation is shown). forget: P(each known unit is lost over the between-session gap). */
export interface Params { slip: number; guess: number; learn: number; forget: number; initial: "all" | "none" | "all-but-one" }
export const PROFILES: Record<Kind, Params> = {
  "strong-slipper": { slip: 0.2, guess: 0.2, learn: 0.9, forget: 0, initial: "all" },
  "weak-guesser": { slip: 0.05, guess: 0.35, learn: 0, forget: 0, initial: "none" },
  improver: { slip: 0.05, guess: 0.1, learn: 0.85, forget: 0, initial: "none" },
  forgetter: { slip: 0.05, guess: 0.15, learn: 0.6, forget: 1, initial: "all" },
  "sibling-gap": { slip: 0.05, guess: 0.15, learn: 0, forget: 0, initial: "all-but-one" },
};
/** Protocol (assumption): session 1 up to S1_MAX engine steps; gap GAP_DAYS (past the 7-day delayed check); session 2 up to S2_MAX steps
 *  with the delayed check answered. Questions outside every declared unit are on the "core" skill, known iff the learner knows >= half the units. */
export const S1_MAX = 40, S2_MAX = 25, GAP_DAYS = 8;

export interface StepRec { sess: 1 | 2; i: number; phase: string; q?: string; unit?: string | null; right?: boolean; truth: boolean; status: string; retention: string; strategy?: string; reason?: string }
export interface Run { kind: Kind; subject: string; seed: number; steps: StepRec[]; unknownUnit: string | null }

export type Variant = "baseline" | "coverage-gate" | "coverage-gate-strict" | "coverage-gate-strict-refresh";
export const VARIANTS: Variant[] = ["baseline", "coverage-gate", "coverage-gate-strict", "coverage-gate-strict-refresh"];
const realStatus = (s: SliceSession, c: string) => { const e = s.state().evidence(c); return { status: e.status, retention: e.retention }; };

export function simulate(kind: Kind, subject: string, seed: number, variant: Variant = "baseline", p: Params = PROFILES[kind]): Run {
  const statusFn = realStatus;
  const m = moduleFor(subject)!;
  const units = skillUnits(m).map((u) => u.key);
  const rng = new Rng(fnv(`${HARNESS_VERSION}:${kind}:${subject}:${seed}`));
  const ans = rng.stream("answers"), learnR = rng.stream("learn"), forgetR = rng.stream("forget");
  const known = new Map<string, boolean>(units.map((u) => [u, p.initial === "all"]));
  let unknownUnit: string | null = null;
  if (p.initial === "all-but-one") { units.forEach((u) => known.set(u, true)); unknownUnit = rng.stream("gap").pick(units); known.set(unknownUnit, false); }
  const knowsQ = (u: string | null) => (u ? !!known.get(u) : [...known.values()].filter(Boolean).length * 2 >= units.length);
  const truth = () => units.every((u) => known.get(u));
  const s = start(`lse-${kind}-${seed}`, subject, Date.parse("2026-01-05T09:00:00Z"));
  memoState(s, variant === "coverage-gate" ? (x) => withCoverageGate(x) : variant === "coverage-gate-strict" ? (x) => withCoverageGate(x, true) : variant === "coverage-gate-strict-refresh" ? (x) => withCoverageGate(x, { strict: true, refresh: true }) : (x) => x);
  const steps: StepRec[] = [];
  const run = (sess: 1 | 2, max: number) => {
    for (let i = 0; i < max; i++) {
      const n = s.next(subject);
      if (n.phase === "chapter" && n.strategy) {
        s.taught(n);
        const u = unitOfStrategy(m, n.strategy)?.key ?? null;
        if (u && !known.get(u) && learnR.chance(p.learn)) known.set(u, true);
        if (!u) for (const k of units) if (!known.get(k) && learnR.chance(p.learn / units.length)) known.set(k, true);
        steps.push({ sess, i, phase: "chapter", unit: u, strategy: n.strategy.id, truth: truth(), ...statusFn(s, subject) });
        continue;
      }
      if (!n.question) { steps.push({ sess, i, phase: n.phase, reason: n.reason, truth: truth(), ...statusFn(s, subject) }); return; }
      if (n.phase === "retention" && sess === 1) { steps.push({ sess, i, phase: "retention-offered", truth: truth(), ...statusFn(s, subject) }); return; }
      const q = n.question, u = unitKey(subject, q);
      const ok = knowsQ(u) ? !ans.chance(p.slip) : ans.chance(p.guess);
      s.submit(q, ok ? question(q).answer : wrongAnswer(q), activityFor(n), n.context ? { context: n.context } : {});
      steps.push({ sess, i, phase: activityFor(n), q, unit: u, right: ok, truth: truth(), ...statusFn(s, subject) });
    }
  };
  run(1, S1_MAX);
  s.wait(GAP_DAYS);
  if (p.forget > 0) for (const u of units) if (known.get(u) && forgetR.chance(p.forget)) known.set(u, false);
  steps.push({ sess: 2, i: -1, phase: "gap", truth: truth(), ...statusFn(s, subject) });
  run(2, S2_MAX);
  return { kind, subject, seed, steps, unknownUnit };
}

/** the variant transform is applied to every state() the real session reads (selection, recovery, status). Memo is performance only: the session's state() is a pure function of (events, decisions, now, session, acknowledgements); reuse it while none changed */
function memoState(s: SliceSession, transform: (st: ReturnType<SliceSession["state"]>) => ReturnType<SliceSession["state"]>) {
  const orig = s.state.bind(s);
  let key = "", val: ReturnType<SliceSession["state"]> | null = null;
  (s as { state: SliceSession["state"] }).state = () => {
    const k = `${s.events.length}|${Object.keys(s.decisions).length}|${s.now}|${s.session}|${s.acknowledgements.length}`;
    if (k !== key || !val) { val = transform(orig()); key = k; }
    return val;
  };
}

/** ------------------------------------------------------------------ metrics */
export const claimed = (st: string) => SHOWN.includes(st);
export interface Metrics {
  /** the engine claimed mastery (independent/transfer/verified) at some answered step while the hidden state was NOT mastered */
  falseMastery: boolean;
  /** the hidden state was mastered at some point in session 1, and no claim was made in session 1 */
  missedMastery: boolean | null;
  /** answered questions from the first answered step with true mastery to the first claim (session 1); null if n/a */
  qToRecognition: number | null;
  /** answered questions in session 1 before the first claim (any claim) */
  qToFirstClaim: number | null;
  /** post-forgetting (session 2, truth not mastered): answered questions while the claim still stands; did the engine withdraw it? */
  staleClaimQs: number | null;
  withdrawn: boolean | null;
  /** session 2: the delayed check was answered, and failed */
  retentionFailed: boolean | null;
  answered: number;
}
export function metrics(r: Run): Metrics {
  const ans = r.steps.filter((x) => x.right !== undefined);
  const s1 = ans.filter((x) => x.sess === 1);
  const falseMastery = ans.some((x) => claimed(x.status) && !x.truth);
  const t0 = s1.findIndex((x) => x.truth);
  const c1 = s1.findIndex((x) => claimed(x.status));
  const missedMastery = t0 >= 0 ? c1 < 0 : null;
  const qToRecognition = t0 >= 0 && c1 >= 0 ? Math.max(0, c1 - t0) + 1 : null;
  let staleClaimQs: number | null = null, withdrawn: boolean | null = null, retentionFailed: boolean | null = null;
  const s2 = ans.filter((x) => x.sess === 2);
  const gap = r.steps.find((x) => x.phase === "gap")!;
  if (r.kind === "forgetter" && claimed(gap.status) && !gap.truth) {
    const w = s2.findIndex((x) => !claimed(x.status));
    withdrawn = w >= 0;
    staleClaimQs = w >= 0 ? w : s2.length;
  }
  const ret = s2.filter((x) => x.phase === "retention");
  if (ret.length) retentionFailed = ret.some((x) => x.retention === "failed" || !x.right);
  return { falseMastery, missedMastery, qToRecognition, qToFirstClaim: c1 >= 0 ? c1 + 1 : null, staleClaimQs, withdrawn, retentionFailed, answered: ans.length };
}

/** ------------------------------------------------------------------ statistics */
export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (!n) return [NaN, NaN];
  const p = k / n, d = 1 + (z * z) / n, c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
/** percentile bootstrap CI of the mean (fixed seed) */
export function bootMean(xs: number[], B = 2000, seed = 7): [number, number, number] {
  if (!xs.length) return [NaN, NaN, NaN];
  const r = new Rng(seed), mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const ms: number[] = [];
  for (let b = 0; b < B; b++) { const a: number[] = []; for (let i = 0; i < xs.length; i++) a.push(xs[r.int(0, xs.length - 1)]); ms.push(mean(a)); }
  ms.sort((a, b) => a - b);
  return [mean(xs), ms[Math.floor(0.025 * B)], ms[Math.floor(0.975 * B)]];
}
export const brief = (r: Run) => r.steps.map((x) => `${x.sess}:${x.phase}${x.q ? ` ${x.q}` : ""}${x.unit ? `[${x.unit}]` : ""}${x.right === undefined ? "" : x.right ? " ok" : " X"}${x.strategy ? ` <${x.strategy}>` : ""} truth=${x.truth ? "M" : "-"} -> ${x.status}/${x.retention}`);
export { DAY };
