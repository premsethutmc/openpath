/**
 * mixed-practice@1: interleaved practice. Practice on one skill is blocked (aaa…); the research says mixing in earlier skills
 * (aab-aac…) helps learners keep them and learn to choose the method, not just repeat it (Rohrer et al. 2019, a preregistered
 * randomized trial in 7th-grade mathematics: d = 0.83 on a test a month later). So after every MIX_EVERY first answers on the
 * current skill in a sitting, practice slips in one fresh question from a skill the learner showed earlier, the most faded first
 * (learner-vector@2 recall). The answer is an ordinary practice answer on that skill: it counts for that skill exactly as any
 * other unaided practice answer would (it carries no special context, so the evidence, misconception and recovery rules read it
 * unchanged), and the current skill's run starts again after it.
 *
 * Only practice with feedback is mixed: a check or test ("on your own", marked at the end) stays contained to its own skill.
 * Nothing is mixed in when no earlier skill has a fresh question left.
 */
import { moduleFor } from "./content";
import { graph } from "./graph";
import { fromPool } from "./intervention";
import { learnerVector, REVIEW_AT } from "./learner-vector";
import type { LearnerRecords } from "./records";
import { keyboardOffered } from "./written";

export const MIXED_PRACTICE = "mixed-practice@1";
/** First answers on the current skill, in a row in this sitting, before one earlier skill is mixed in. */
export const MIX_EVERY = 3;

export interface MixedItem { competency: string; question: string; recall: number }

/** How many first answers in a row, most recent first, this sitting's records hold on `skill` (another skill's answer ends the run). */
export function runOn(skill: string, records: LearnerRecords, session: string): number {
  const own = graph.evidenceTarget(skill);
  let run = 0;
  const mine = records.attempts.filter((a) => a.session === session && a.n === 1).sort((x, y) => y.at.localeCompare(x.at));
  for (const a of mine) {
    let target: string;
    try { target = graph.evidenceTarget(a.competency); } catch { break; }
    if (target !== own) break;
    run += 1;
  }
  return run;
}

/** The question to mix in now, or null (not yet due, or no earlier skill with a fresh question). */
export function mixedPracticeItem(current: string, records: LearnerRecords, now: number, session: string): MixedItem | null {
  if (runOn(current, records, session) < MIX_EVERY) return null;
  const own = graph.evidenceTarget(current);
  const shown = [...learnerVector(records, { now }).values()]
    .filter((v) => v.skill !== own && v.direct > 0 && v.estimate >= REVIEW_AT)
    .sort((a, b) => a.recall - b.recall || a.skill.localeCompare(b.skill));
  for (const v of shown) {
    const m = moduleFor(v.skill);
    const q = m ? fromPool(m, "practice", records) : null;
    if (q && keyboardOffered(q)) return { competency: v.skill, question: q, recall: v.recall };
  }
  return null;
}
