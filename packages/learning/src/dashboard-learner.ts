/**
 * The learner side of the dashboard (dashboard@1): one learner's records read by the SAME engine My Learning Year
 * uses (session.ts learnerState → evidence.ts). Nothing is recomputed differently and nothing is written: the dashboard
 * only reads. Loaded on demand (it brings in the module library and the shared engine).
 */
import { MARKED_RIGHT } from "./written";
import { overlay } from "./goals";
import { goal as goalById } from "./content";
import type { LearnerSkill } from "./dashboard";
import { learnerState } from "./session";
import type { WrittenMark } from "./written";
import { graph } from "./graph";
import { rightAnswer } from "./evidence";

export interface LearnerView {
  learnerId: string;
  enrolment: { grade: number; curriculum: { id: string; version: string } } | null;
  goals: { id: string; name: string }[];
  skillOf: (competency: string) => LearnerSkill;
  /** For a goal: the skills of the learner's own curriculum it builds on (nothing from later grades). */
  goalFoundations: (goalId: string, grade: number, curriculum: string[]) => { name: string; foundations: string[]; note: string } | null;
  /** Evidence history for one competency (shown behind "details"). */
  history: (competency: string) => { at: string; question: string; right: boolean; activity: string; independent: boolean }[];
  /** When this view was computed (the engine's "now"). */
  now: number;
}

export function learnerView(learnerId: string, events: readonly { kind: string }[], marks: readonly WrittenMark[], now: number): LearnerView {
  const st = learnerState(learnerId, events, now, { marks });
  const cache = new Map<string, LearnerSkill>();
  const skillOf = (id: string): LearnerSkill => {
    const hit = cache.get(id);
    if (hit) return hit;
    const e = st.evidence(id);
    const own = st.records.attempts.filter((a) => a.competency === id || graph.evidenceTarget(a.competency) === id);
    const s: LearnerSkill = {
      status: e.status,
      retention: e.retention,
      retentionDueAt: e.retentionDueAt,
      attempts: e.attempts.length,
      methodMarked: own.some((a) => a.written?.mark && a.response === MARKED_RIGHT),
      methodPending: st.records.pending.some((p) => p.competency === id),
    };
    cache.set(id, s);
    return s;
  };
  const enrol = st.enrolment;
  return {
    learnerId,
    enrolment: enrol ? { grade: enrol.grade, curriculum: { id: enrol.curriculum.id, version: enrol.curriculum.version } } : null,
    goals: [...st.records.goals.values()].map((g) => ({ id: g.pathway, name: goalById(g.pathway)?.name ?? g.pathway })),
    skillOf,
    goalFoundations: (goalId, grade, curriculum) => {
      const o = overlay(goalId, grade, curriculum, st.evidence);
      return o ? { name: o.goal.name, foundations: o.foundations, note: o.note } : null;
    },
    history: (id) =>
      st.records.attempts
        .filter((a) => a.competency === id || graph.evidenceTarget(a.competency) === id)
        .map((a) => ({ at: a.at, question: a.questionId, right: a.written ? a.response === MARKED_RIGHT : rightAnswer(a), activity: a.activity, independent: a.n === 1 && !a.hints && !a.solution && a.activity !== "guided" })),
    now,
  };
}
