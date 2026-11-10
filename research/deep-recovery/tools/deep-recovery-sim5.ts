/**
 * deep-recovery@0 phase-5 (confidence) simulation. SIMULATED learners only; not evidence about real children.
 * Confirmation rules compared on the same seeded learner (paired), all with the SAME effort limits: 40 per sitting, 120 in total,
 * at most 3 sittings (a learner who ends a sitting paused or provisional comes back the next day):
 *   selective        phase-4 rule (P4 options)                                              [current]
 *   three-fresh      three fresh unaided goal answers in a row, same sitting               [more questions]
 *   different-form   two, of different formats (typed + picked from options) when available
 *   delayed-add      the selective rule now, plus one fresh goal answer in a later sitting   [more questions + more sittings]
 *   delayed-replace  one typed right now, one in a later sitting                             [more sittings, not more questions]
 *   delayed-first    delayed-replace, and a right FIRST try also waits for a later-sitting check
 *   consistent       selective, but wrong goal answers since the last lesson count against a later streak (right - wrong)
 *   consistent-first consistent + delayed-first
 * Outcome per run: solved-fresh-unaided | false-reassurance | provisional | pause | blocked | handed-over | error
 *   node --import tsx ../research/deep-recovery/tools/deep-recovery-sim5.ts <seedFrom> <seedTo> <rule,...> [orig:type,...]
 */

import type { DeepRecoveryOptions } from "../../../packages/learning/src/deep-recovery";
import { RETENTION_DAYS } from "../../../packages/learning/src/evidence";
import { phasePool } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { runDeep } from "../../../frontend/src/journey/deep-recovery-journey";
import { mulberry32, SimLearner, type Truth } from "./deep-recovery-sim";
import { ORIGINALS, TYPES } from "./deep-recovery-sim3";
import { right } from "../../../frontend/src/journey/learners";
import { SliceSession } from "../../../frontend/src/journey/session";
import { wrongShaped } from "../../../frontend/src/journey/wrong-answers";

const BASE: DeepRecoveryOptions = { confirm: "selective", reuse: true, sessionBudget: 40, budget: 120, validDays: RETENTION_DAYS };
export const RULES: Record<string, DeepRecoveryOptions> = {
  selective: BASE,
  "three-fresh": { ...BASE, confirm: "three-fresh" },
  "different-form": { ...BASE, confirm: "different-form" },
  "delayed-add": { ...BASE, delayed: "add" },
  "delayed-replace": { ...BASE, delayed: "replace" },
  "delayed-first": { ...BASE, delayed: "replace", firstTry: "provisional" },
  // added after the tuning seeds (5001-5010) showed claims after mixed right/wrong sequences
  consistent: { ...BASE, consistent: true },
  "consistent-first": { ...BASE, consistent: true, delayed: "replace", firstTry: "provisional" },
};
type T5 = Truth & { history?: boolean };
/** learner types: phase-3 models, renamed, plus a strong learner who gets it right first time */
const T: Record<string, (ok: "O1" | "O2", r: () => number) => T5 | null> = {
  "strong-right": () => ({ deps: {}, gap: [], roots: [], slip: 0.05, guess: 0 }),
  "strong-slips": (ok, r) => TYPES["strong-slips"][ok]!(r),
  "strong-history": (ok, r) => TYPES["strong-history"][ok]!(r),
  "single-gap": (ok, r) => TYPES["single-gap"][ok]!(r),
  "multiple-gaps": (ok, r) => TYPES["multiple-gaps"][ok]!(r),
  /** light: right by luck 5% on a typed answer, 25% on a pick from options */
  "light-guesser": (ok, r) => TYPES.lucky[ok]!(r),
  /** heavy (stress case): 20% on a typed answer, 30% on a pick */
  "heavy-guesser": (ok, r) => TYPES["typed-guesser"][ok]!(r),
};
export const CELLS5 = (["O1", "O2"] as const).flatMap((o) => Object.keys(T).map((t) => `${o}:${t}`));
const MAX_SITTINGS = 3;

/** `onAnswer` (analysis only; no effect on the run) */
/** `answers` (phase 6): "old" = the shared learners.ts wrong answers (phase 5 as committed); "corrected" = wrong-answers.ts shaped ones */
export function simulate5(rule: string, ok: "O1" | "O2", type: string, seed: number, onAnswer?: (x: { qid: string; answer: string; can: boolean; sitting: number }) => void, answers: "old" | "corrected" = "old") {
  const t0 = Date.now();
  const O = ORIGINALS[ok];
  const rec: Record<string, unknown> = { phase: 5, rule, orig: ok, type, seed };
  // the same seeding as phases 3-4 (sim3/sim4) for the same type names; new types use their own name
  const rnd = mulberry32(seed * 7919 + type.length * 31 + (ok === "O1" ? 1 : 2));
  const truth = T[type](ok, rnd)!;
  const pool = phasePool(O.family, "diagnostic");
  const original = pool[Math.floor(rnd() * pool.length)];
  rec.original = original;
  const L = answers === "corrected" ? new SimLearner(truth, rnd, wrongShaped) : new SimLearner(truth, rnd);
  if (answers === "corrected") rec.answers = "corrected";
  try {
    const s = new SliceSession(`sim5-${rule}-${ok}-${type}-${seed}`, O.own, Date.parse("2026-11-05T09:00:00Z"));
    if (truth.history) { for (const q of phasePool(O.family, "practice").filter((x) => !x.endsWith(":mc")).slice(0, 3)) s.submit(q, right(q), "practice"); s.wait(3); }
    const q0 = s.replies.length;
    const sittings: { outcome: string; questions: number }[] = [];
    let final = null as ReturnType<typeof runDeep>["final"];
    let claimAt: { questions: number; sitting: number } | null = null;
    for (let k = 0; k < MAX_SITTINGS; k++) {
      if (k) s.wait(1);
      const qs = s.replies.length;
      final = runDeep(s, original, (q, c) => { const ans = L.answer(q, { ...c, answered: s.replies.length - q0 }); onAnswer?.({ qid: q, answer: ans, can: L.can(q.replace(/:(mc|w)$/, "")), sitting: k + 1 }); return ans; }, RULES[rule]).final;
      sittings.push({ outcome: final!.phase, questions: s.replies.length - qs });
      if (final!.phase === "solved" || final!.phase === "solved_after_help") claimAt = { questions: s.replies.length - q0, sitting: k + 1 };
      if (final!.phase !== "pause" && final!.phase !== "provisional") break;
    }
    const taught = s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => graph.evidenceTarget((e as { competency: string }).competency));
    L.sync(taught);
    const can = L.can(original.replace(/:(mc|w)$/, ""));
    const f = final!;
    const claims = f.phase === "solved" || f.phase === "solved_after_help";
    const outcome = claims ? (can ? "solved-fresh-unaided" : "false-reassurance") : ["provisional", "pause", "blocked"].includes(f.phase) ? f.phase : f.phase === "escalate" ? "handed-over" : `other:${f.phase}`;
    return {
      ...rec, status: "ok", outcome, enginePhase: f.phase, diagnosis: f.diagnosis ?? null, sittings: sittings.length, perSitting: sittings,
      questions: s.replies.length - q0, lessons: taught.length, wrongLessons: taught.filter((x) => !truth.gap.includes(x)).length,
      noGap: truth.gap.length === 0, can, claimAt, ms: Date.now() - t0,
    };
  } catch (e) {
    return { ...rec, status: "error", error: String((e as Error).stack ?? e).slice(0, 400), ms: Date.now() - t0 };
  }
}

if (process.argv[1]?.endsWith("deep-recovery-sim5.ts")) {
  const from = Number(process.argv[2]), to = Number(process.argv[3]);
  const rules = (process.argv[4] ?? Object.keys(RULES).join(",")).split(",");
  const cells = (process.argv[5] ? process.argv[5].split(",") : CELLS5).map((c) => c.split(":") as ["O1" | "O2", string]);
  const answers = process.env.SIM_ANSWERS === "corrected" ? "corrected" : "old";
  for (const [o, t] of cells) for (let seed = from; seed <= to; seed++) for (const r of rules) console.log(JSON.stringify(simulate5(r, o, t, seed, undefined, answers)));
}
