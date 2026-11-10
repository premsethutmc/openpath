/**
 * deep-recovery@0 phase-6 simulation (worker A). SIMULATED learners only; not evidence about real children.
 * Corrected (server-verified, shape-preserving) wrong answers throughout. Same effort limits for every policy: 40 per sitting,
 * 120 in total, at most 3 sittings.
 *   Experiment A  (after recovery) confirmation: "selective" (current) vs "three-fresh" (candidate). Each run records whether the
 *                 confirming goal answers were different problems from each other and from every teaching screen shown.
 *   Experiment B  (right first try): "accept" (current) | "confirm" (one fresh same-sitting check, always) | "proportionate"
 *                 (only for a small answer space or no prior record) | "proportionate-space" | "delayed-first" (phase 5: a later
 *                 sitting) - all with the current selective rule after recovery.
 * Guesser assumptions: right by luck on a typed answer 2%, 10% or 20% (and 25-30% on a pick from options).
 *   node --import tsx ../research/deep-recovery/tools/deep-recovery-sim6.ts <A|B> <seedFrom> <seedTo> [policy,...] [orig:type,...]
 */
import { moduleFor, question } from "../../../packages/learning/src/content";
import type { DeepRecoveryOptions } from "../../../packages/learning/src/deep-recovery";
import { independentAttempt, rightAnswer, RETENTION_DAYS } from "../../../packages/learning/src/evidence";
import { phasePool, problemKeyOf } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { presentedProblems } from "../../../packages/learning/src/skill-units";
import { runDeep } from "../../../frontend/src/journey/deep-recovery-journey";
import { mulberry32, SimLearner, type Truth } from "./deep-recovery-sim";
import { ORIGINALS, TYPES } from "./deep-recovery-sim3";
import { right } from "../../../frontend/src/journey/learners";
import { SliceSession } from "../../../frontend/src/journey/session";
import { wrongShaped } from "../../../frontend/src/journey/wrong-answers";

const BASE: DeepRecoveryOptions = { confirm: "selective", reuse: true, sessionBudget: 40, budget: 120, validDays: RETENTION_DAYS };
export const POLICIES: Record<"A" | "B", Record<string, DeepRecoveryOptions>> = {
  A: { selective: BASE, "three-fresh": { ...BASE, confirm: "three-fresh" } },
  B: {
    accept: BASE,
    confirm: { ...BASE, firstTry: "confirm" },
    proportionate: { ...BASE, firstTry: "proportionate" },
    "proportionate-space": { ...BASE, firstTry: "proportionate-space" },
    "delayed-first": { ...BASE, delayed: "replace", firstTry: "provisional" },
  },
};
type T6 = Truth & { history?: boolean };
const P = "MATH.";
const gapA: Record<"O1" | "O2", { deps: Record<string, string[]>; gap: string[]; roots: string[] }> = {
  O1: { deps: { "fam:aupfr": [P + "algebra.partial-fractions"], [P + "algebra.partial-fractions"]: [P + "algebra.linear-systems"], [P + "algebra.linear-systems"]: [P + "algebra.linear-two-variables"] }, gap: [P + "algebra.partial-fractions", P + "algebra.linear-systems", P + "algebra.linear-two-variables"], roots: [P + "algebra.linear-two-variables"] },
  O2: { deps: { "fam:aulax": [P + "calculus.derivative-rules"], [P + "calculus.derivative-rules"]: [P + "number.exponents"] }, gap: [P + "calculus.derivative-rules", P + "number.exponents"], roots: [P + "number.exponents"] },
};
const guesser = (typed: number, choice: number) => (ok: "O1" | "O2"): T6 => ({ ...gapA[ok], slip: 0.05, guess: typed, guessChoice: choice });
export const TYPES6: Record<string, (ok: "O1" | "O2", r: () => number) => T6> = {
  // capable learners: right first time (5% slips), without and with an earlier record of the skill
  "capable-new": () => ({ deps: {}, gap: [], roots: [], slip: 0.05, guess: 0 }),
  "capable-record": () => ({ deps: {}, gap: [], roots: [], slip: 0.05, guess: 0, history: true }),
  "strong-slips": (ok, r) => TYPES["strong-slips"][ok]!(r),
  "strong-history": (ok, r) => TYPES["strong-history"][ok]!(r),
  "single-gap": (ok, r) => TYPES["single-gap"][ok]!(r),
  "multiple-gaps": (ok, r) => TYPES["multiple-gaps"][ok]!(r),
  "guesser-2": guesser(0.02, 0.25),
  "guesser-10": guesser(0.1, 0.25),
  "guesser-20": guesser(0.2, 0.3),
};
export const CELLS6: Record<"A" | "B", string[]> = {
  A: (["O1", "O2"] as const).flatMap((o) => ["strong-slips", "strong-history", "single-gap", "multiple-gaps", "guesser-2", "guesser-10", "guesser-20"].map((t) => `${o}:${t}`)),
  B: (["O1", "O2"] as const).flatMap((o) => ["capable-new", "capable-record", "guesser-2", "guesser-10", "guesser-20"].map((t) => `${o}:${t}`)),
};
const MAX_SITTINGS = 3;
const base = (q: string) => q.replace(/:(mc|w)$/, "");

export function simulate6(exp: "A" | "B", policy: string, ok: "O1" | "O2", type: string, seed: number) {
  const t0 = Date.now();
  const O = ORIGINALS[ok];
  const rec: Record<string, unknown> = { phase: 6, exp, policy, orig: ok, type, seed, answers: "corrected" };
  const rnd = mulberry32(seed * 7919 + type.length * 31 + (ok === "O1" ? 1 : 2));
  const truth = TYPES6[type](ok, rnd);
  const pool = phasePool(O.family, "diagnostic").filter((q) => !q.endsWith(":mc"));
  const original = pool[Math.floor(rnd() * pool.length)];
  rec.original = original;
  const L = new SimLearner(truth, rnd, wrongShaped);
  try {
    const s = new SliceSession(`sim6-${exp}-${policy}-${ok}-${type}-${seed}`, O.own, Date.parse("2026-11-06T09:00:00Z"));
    if (truth.history) { for (const q of phasePool(O.family, "practice").filter((x) => !x.endsWith(":mc")).slice(0, 3)) s.submit(q, right(q), "practice"); s.wait(3); }
    const q0 = s.replies.length, a0 = s.state().records.attempts.length;
    const sittings: string[] = [];
    let final = null as ReturnType<typeof runDeep>["final"];
    let claimAt: { questions: number; sitting: number } | null = null;
    for (let k = 0; k < MAX_SITTINGS; k++) {
      if (k) s.wait(1);
      final = runDeep(s, original, (q, c) => L.answer(q, { ...c, answered: s.replies.length - q0 }), POLICIES[exp][policy]).final;
      sittings.push(final!.phase);
      if (final!.phase === "solved" || final!.phase === "solved_after_help") claimAt = { questions: s.replies.length - q0, sitting: k + 1 };
      if (final!.phase !== "pause" && final!.phase !== "provisional") break;
    }
    const recs = s.state().records;
    const taught = recs.teaching.map((t) => graph.evidenceTarget(t.competency));
    L.sync(taught);
    const can = L.can(base(original));
    const f = final!;
    const claims = f.phase === "solved" || f.phase === "solved_after_help";
    // the answers the claim rests on: the trailing run of right, unaided goal answers of this episode
    const goal = recs.attempts.slice(a0).filter((a) => graph.evidenceTarget(question(base(a.questionId)).competency) === O.own && independentAttempt(a));
    const run: typeof goal = [];
    for (let i = goal.length - 1; i >= 0 && rightAnswer(goal[i]); i--) run.unshift(goal[i]);
    const keys = run.map((a) => problemKeyOf(a.questionId));
    const teachingKeys = presentedProblems({ ...recs, attempts: [], unresolved: [], pending: [] }, (c) => moduleFor(c) ?? null);
    return {
      ...rec, status: "ok", outcome: claims ? (can ? "solved-fresh-unaided" : "false-reassurance") : f.phase === "escalate" ? "handed-over" : f.phase,
      enginePhase: f.phase, firstTryClaim: claims && f.phase === "solved" && goal.length >= 1 && goal[0].questionId === original && rightAnswer(goal[0]),
      sittings: sittings.length, perSitting: sittings, questions: s.replies.length - q0, lessons: taught.length, noGap: truth.gap.length === 0, can, claimAt,
      confirming: claims ? { n: run.length, distinctKeys: new Set(keys).size, fromTeaching: keys.filter((k) => teachingKeys.has(k)).length } : null,
      ms: Date.now() - t0,
    };
  } catch (e) {
    return { ...rec, status: "error", error: String((e as Error).stack ?? e).slice(0, 400), ms: Date.now() - t0 };
  }
}

if (process.argv[1]?.endsWith("deep-recovery-sim6.ts")) {
  const exp = process.argv[2] as "A" | "B";
  const from = Number(process.argv[3]), to = Number(process.argv[4]);
  const pols = (process.argv[5] || Object.keys(POLICIES[exp]).join(",")).split(",");
  const cells = (process.argv[6] ? process.argv[6].split(",") : CELLS6[exp]).map((c) => c.split(":") as ["O1" | "O2", string]);
  for (const [o, t] of cells) for (let seed = from; seed <= to; seed++) for (const p of pols) console.log(JSON.stringify(simulate6(exp, p, o, t, seed)));
}
