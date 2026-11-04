/**
 * problem-identity@1 (freshness@2 of feat/math-teaching-content@4e655e73): when two generated questions are the SAME problem
 * for a learner, beyond the exposure key (which already joins the typed, :mc and :w forms of one variant). A recheck or a
 * delayed check must be a problem the learner has not met in any form, including a relabelled one.
 *   akdice  the same spinners and the same total, or the mirror total m + n + 2 − k: renumbering each face x → size + 1 − x
 *           maps every pair that makes k to a pair that makes m + n + 2 − k, so exactly the same pairs are counted.
 * Families without a rule keep the exposure key. A rule only JOINS problems; it never makes two exposures of one variant
 * different.
 */
import { exposureKey, problemOf } from "./families";
import type { LearnerRecords } from "./records";
import { moduleFor } from "./content";

const RULES: Record<string, (p: number[]) => string> = {
  akdice: ([m, n, q, k]) => (q === 0 ? `akdice:${Math.min(m, n)},${Math.max(m, n)},0,${Math.min(k, m + n + 2 - k)}` : `akdice:${m},${n},${q},${k}`),
};
export const PROBLEM_IDENTITY = "problem-identity@1" as const;

export function problemIdentity(id: string): string {
  const p = problemOf(id.replace(/:(mc|w)$/, ""));
  const rule = p ? RULES[p.family] : undefined;
  return rule ? `problem:${rule(p!.params)}` : exposureKey(id);
}

/** every problem this learner has met: answered (any status) and shown in teaching delivered to them (guided and screen instances) */
export function metProblems(records: LearnerRecords): Set<string> {
  const out = new Set<string>();
  for (const a of [...records.attempts, ...(records.unresolved ?? []), ...(records.pending ?? [])]) out.add(problemIdentity(a.questionId));
  for (const t of records.teaching ?? []) {
    const m = moduleFor(t.competency), s = m?.strategies.find((x) => x.id === t.strategy);
    for (const id of [s?.guided, ...(s?.screens.map((x) => x.instance) ?? [])]) if (id) out.add(problemIdentity(id));
  }
  return out;
}
