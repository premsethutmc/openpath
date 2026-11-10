/**
 * deep-recovery@0 phase-4 simulation (research only; SIMULATED learners, not evidence about real children).
 * Engines on the same seeded learner (paired):
 *   p3  phase-3 prototype settings (selective confirmation, effort limit 40 for the episode, hand-over at the limit)
 *   p4  phase-4 options: reuse, a 40-step sitting ending in a resumable pause, 120 across sittings, evidence valid
 *       RETENTION_DAYS; a paused learner comes back the next day, at most 3 sittings
 * Outcome (one per run):  solved-fresh-unaided (claims solved, learner model can do the goal) | false-reassurance (claims solved,
 *   cannot) | pause (still paused after the last sitting) | blocked | handed-over (escalate) | error
 *   node --import tsx ../research/deep-recovery/tools/deep-recovery-sim4.ts <seedFrom> <seedTo> <p3,p4> [orig:type,...]
 */
import { question } from "../../../packages/learning/src/content";
import type { DeepRecoveryOptions } from "../../../packages/learning/src/deep-recovery";
import { independentAttempt, rightAnswer, RETENTION_DAYS } from "../../../packages/learning/src/evidence";
import { phasePool } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { runDeep } from "../../../frontend/src/journey/deep-recovery-journey";
import { mulberry32, SimLearner } from "./deep-recovery-sim";
import { ORIGINALS, TYPES } from "./deep-recovery-sim3";
import { SliceSession } from "../../../frontend/src/journey/session";

export const P4_OPTIONS: DeepRecoveryOptions = { confirm: "selective", reuse: true, sessionBudget: 40, budget: 120, validDays: RETENTION_DAYS };
export const P3_OPTIONS: DeepRecoveryOptions = { confirm: "selective" };
export const CELLS = ["O1:single-gap", "O2:single-gap", "O1:multiple-gaps", "O2:multiple-gaps", "O1:strong-slips", "O2:strong-slips", "O1:typed-guesser", "O2:typed-guesser", "O1:missing-content", "O1:fails-to-learn", "O2:fails-to-learn"];
const MAX_SITTINGS = 3;
const skillOf = (q: string) => graph.evidenceTarget(question(q.replace(/:(mc|w)$/, "")).competency);

/** `onAnswer` (analysis only; no effect on the run): sees each answer with whether the learner model could do the item */
export function simulate4(engine: "p3" | "p4", ok: "O1" | "O2", type: string, seed: number, onAnswer?: (x: { qid: string; answer: string; can: boolean; phase: number }) => void) {
  const t0 = Date.now();
  const O = ORIGINALS[ok];
  const rec: Record<string, unknown> = { phase: 4, engine, orig: ok, type, seed };
  const make = TYPES[type]?.[ok];
  if (!make) return { ...rec, status: "n/a" };
  const rnd = mulberry32(seed * 7919 + type.length * 31 + (ok === "O1" ? 1 : 2));
  const truth = make(rnd);
  const pool = phasePool(O.family, "diagnostic");
  const original = pool[Math.floor(rnd() * pool.length)];
  rec.original = original;
  const L = new SimLearner(truth, rnd);
  try {
    const s = new SliceSession(`sim4-${engine}-${ok}-${type}-${seed}`, O.own, Date.parse("2026-11-05T09:00:00Z"));
    const o = engine === "p4" ? P4_OPTIONS : P3_OPTIONS;
    const sittings: { outcome: string; questions: number; lessons: number; effort: number }[] = [];
    let final = null as ReturnType<typeof runDeep>["final"];
    for (let k = 0; k < (engine === "p4" ? MAX_SITTINGS : 1); k++) {
      if (k) s.wait(1);
      const q0 = s.replies.length, l0 = s.events.filter((e) => (e as { record?: string }).record === "teach").length;
      const r = runDeep(s, original, (q, c) => { const ans = L.answer(q, { ...c, answered: s.replies.length }); onAnswer?.({ qid: q, answer: ans, can: L.can(q.replace(/:(mc|w)$/, "")), phase: k }); return ans; }, o);
      final = r.final;
      sittings.push({ outcome: final!.phase, questions: s.replies.length - q0, lessons: s.events.filter((e) => (e as { record?: string }).record === "teach").length - l0, effort: final!.effort });
      if (final!.phase !== "pause") break;
    }
    const taught = s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => graph.evidenceTarget((e as { competency: string }).competency));
    L.sync(taught);
    const truthCan = L.can(original.replace(/:(mc|w)$/, ""));
    const f = final!;
    const claims = f.phase === "solved" || f.phase === "solved_after_help";
    const outcome = claims ? (truthCan ? "solved-fresh-unaided" : "false-reassurance") : f.phase === "pause" ? "pause" : f.phase === "blocked" ? "blocked" : f.phase === "escalate" ? "handed-over" : `other:${f.phase}`;
    const attempts = s.state().records.attempts;
    const repaired = truth.roots.filter((root) => { const i = taught.indexOf(root); if (i < 0) return false; const at = (s.events.filter((e) => (e as { record?: string }).record === "teach")[i] as { at: string }).at; return attempts.some((a) => a.at > at && skillOf(a.questionId) === root && a.n === 1 && independentAttempt(a) && rightAnswer(a)); });
    // a lesson on a skill outside the learner model's gap (the goal skill itself included) is wrong / unnecessary teaching
    const lessonsWrong = taught.filter((x) => !truth.gap.includes(x));
    return {
      ...rec, status: "ok", outcome, enginePhase: f.phase, diagnosis: f.diagnosis ?? null, cause: f.cause ?? null, next: f.next ?? null,
      sittings: sittings.length, pauses: sittings.filter((x) => x.outcome === "pause").length, perSitting: sittings,
      questions: s.replies.length, lessons: taught.length, effort: f.effort,
      wrongLessons: lessonsWrong.length, ownLessons: taught.filter((x) => x === O.own).length, unnecessaryLessons: truth.gap.length === 0 ? taught.length : 0,
      roots: truth.roots, identified: truth.roots.filter((x) => taught.includes(x) || f.blocked?.skill === x || f.cause === x), taught: truth.roots.filter((x) => taught.includes(x)), repaired,
      truthCan, ms: Date.now() - t0,
    };
  } catch (e) {
    return { ...rec, status: "error", error: String((e as Error).stack ?? e).slice(0, 400), ms: Date.now() - t0 };
  }
}

if (process.argv[1]?.endsWith("deep-recovery-sim4.ts")) {
  const from = Number(process.argv[2]), to = Number(process.argv[3]);
  const engines = (process.argv[4] ?? "p3,p4").split(",") as ("p3" | "p4")[];
  const cells = (process.argv[5] ? process.argv[5].split(",") : CELLS).map((c) => c.split(":") as ["O1" | "O2", string]);
  for (const [o, t] of cells) for (let seed = from; seed <= to; seed++) for (const e of engines) console.log(JSON.stringify(simulate4(e, o, t, seed)));
}
