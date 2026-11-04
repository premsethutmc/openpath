/**
 * skill-units@1: the skills a module teaches with explicitly scoped explanations (Strategy.scope), as units of evidence inside the
 * competency. A unit is the declared scope of its explanations: a mapped sub-skill (the competency's versioned skill mapping) or a
 * family with parameter constraints (e.g. two dice, "the total is exactly k"). Read only; it never changes what an answer is worth.
 *
 *   same-skill@1   after teaching, the recheck is a fresh question inside the taught scope (never another skill of the competency);
 *                  a unit taught and not yet rechecked right on the learner's own, or whose latest answer alone is wrong, holds back
 *                  transfer questions and the transfer / verified status of the competency
 *   retention      a delayed check after a unit was taught includes a question of that unit; recovery after a failed delayed check
 *                  on a unit returns to that unit
 *   freshness@2    a recheck is never the same problem, relabelled or in another answer format, as anything shown or answered
 *                  (families.problemKeyOf)
 * Modules without scoped explanations have no units: everything here is then a no-op.
 */
import type { Module, Strategy } from "./content";
import { problemKeyOf, problemOf } from "./families";
import type { Attempt, LearnerRecords } from "./records";
import { teachingScopeFor } from "./teaching-presentation";

export interface SkillUnit { key: string; strategies: Strategy[]; accepts: (qid: string) => boolean }
const base = (id: string) => id.replace(/:(mc|w)$/, "");
const memo = new WeakMap<Module, SkillUnit[]>();
const scopeKey = (s: Strategy) => s.scope!.subSkill ?? `${s.scope!.family}|${JSON.stringify(s.scope!.parameters ?? [])}`;

export function skillUnits(m: Module): SkillUnit[] {
  let out = memo.get(m);
  if (out) return out;
  const groups = new Map<string, Strategy[]>();
  for (const s of m.strategies) if (s.scope && typeof s.scope.family === "string") groups.set(scopeKey(s), [...(groups.get(scopeKey(s)) ?? []), s]);
  out = [...groups].map(([key, strategies]) => {
    const scopes = strategies.map((s) => teachingScopeFor(m, s));
    return { key, strategies, accepts: (qid: string) => { if (!qid.startsWith("gen:")) return false; const p = problemOf(base(qid)); return !!p && scopes.some((sc) => sc.accepts(p)); } };
  });
  memo.set(m, out);
  return out;
}
export const unitOfStrategy = (m: Module, s: Strategy | null | undefined) => (s?.scope ? skillUnits(m).find((u) => u.strategies.includes(s)) ?? null : null);
export const unitOfQuestion = (m: Module, qid: string) => skillUnits(m).find((u) => u.accepts(qid)) ?? null;

export interface Judge { independent: (a: Attempt) => boolean; right: (a: Attempt) => boolean }
export interface UnitState {
  unit: SkillUnit;
  /** the latest delivery of one of the unit's explanations */
  taughtAt: string | null;
  /** a right answer alone on the unit after that teaching (guided practice never counts) */
  rechecked: boolean;
  /** the learner's latest answer alone on the unit is wrong */
  latestWrong: boolean;
  /** status@2 on the unit's own answers alone: wrong now and never shown (fewer than two distinct right), or two of its last three wrong */
  notShown: boolean;
}
export function unitStates(m: Module, records: LearnerRecords, judge: Judge): UnitState[] {
  return skillUnits(m).map((unit) => {
    const ids = new Set(unit.strategies.map((s) => s.id));
    const taughtAt = records.teaching.filter((t) => t.competency === m.competency && ids.has(t.strategy)).at(-1)?.at ?? null;
    const mine = records.attempts.filter((a) => judge.independent(a) && unit.accepts(a.questionId));
    const rechecked = !!taughtAt && mine.some((a) => a.at > taughtAt && a.activity !== "guided" && judge.right(a));
    const last = mine.at(-1);
    const latestWrong = !!last && !judge.right(last);
    const rights = new Set(mine.filter(judge.right).map((a) => a.questionId)).size;
    const notShown = latestWrong && (rights < 2 || mine.slice(-3).filter((a) => !judge.right(a)).length >= 2);
    return { unit, taughtAt, rechecked, latestWrong, notShown };
  });
}
/** taught and not rechecked right alone since, or wrong again since: the competency is not ready for transfer or verification */
export const heldByTeaching = (s: UnitState) => !!s.taughtAt && (!s.rechecked || s.latestWrong);
/** answers on other skills of the competency never establish it while this skill's own answers show it is not there yet */
export const holdsCompetency = (s: UnitState) => heldByTeaching(s) || s.notShown;
/** no transfer question while a unit is held, or its latest answer alone is wrong (not yet rechecked) */
export const blocksTransfer = (s: UnitState) => heldByTeaching(s) || s.latestWrong;

/** freshness@2: the problems already shown (taught screens, guided items) or answered, by problem key */
export function presentedProblems(records: LearnerRecords, moduleOf: (competency: string) => Module | null): Set<string> {
  const keys = new Set([...records.attempts, ...records.unresolved, ...(records.pending ?? [])].map((a) => problemKeyOf(a.questionId)));
  for (const t of records.teaching) {
    const m = moduleOf(t.competency), s = m?.strategies.find((x) => x.id === t.strategy);
    for (const id of [s?.guided, ...(m?.chapter.map((c) => c.instance) ?? []), ...(s?.screens.map((c) => c.instance) ?? [])]) if (id) keys.add(problemKeyOf(id));
  }
  return keys;
}
