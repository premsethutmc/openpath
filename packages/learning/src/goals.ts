/**
 * Long-term goal pathways as overlays on the shared graph (goals@1).
 *
 * A young learner with a far-off goal (a Grade 5 learner choosing IIT-JEE): nothing above their grade is shown. The
 * goal marks the skills of their OWN curriculum that later reasoning builds on (its "foundations" strands), and offers
 * enrichment challenges once the skill they rest on has been shown. Elementary evidence never counts as evidence of an
 * advanced competency.
 *
 * A learner near the exam: target topics with provisional weight RANGES (never a fixed marks allocation), an estimate
 * of where they stand from their own evidence, and priorities within the time left, under the paper's marking.
 */
import { goal as goalById, questions, type Goal } from "./content";
import type { SkillEvidence } from "./evidence";
import { graph } from "./graph";

const shown = (e: SkillEvidence) => e.status === "independent" || e.status === "transfer" || e.status === "verified";

export interface Challenge {
  question: string;
  competency: string;
  ready: boolean;
  /** What must be shown on your own first. */
  readiness: string[];
}
export interface GoalOverlay {
  goal: Goal;
  foundations: string[];
  challenges: Challenge[];
  note: string;
}

/** The goal's overlay on this learner's current curriculum (and only on it). */
export function overlay(goalId: string, grade: number, curriculum: string[], ev: (id: string) => SkillEvidence): GoalOverlay | null {
  const g = goalById(goalId);
  if (!g) return null;
  const inYear = new Set(curriculum);
  const foundations = curriculum.filter((id) => g.foundations.strands.includes(graph.get(id).strand));
  const challenges = questions
    .filter((q) => q.role === "challenge" && q.goals?.includes(goalId))
    .filter((q) => (q.readiness ?? []).every((r) => inYear.has(r)) && graph.get(q.competency).gradeRange[0] <= grade + 1)
    .map((q) => ({ question: q.id, competency: q.competency, readiness: q.readiness ?? [], ready: (q.readiness ?? []).every((r) => shown(ev(r))) }));
  return { goal: g, foundations, challenges, note: `${g.name} is a long-term goal. These are skills from your own year that it builds on; nothing from later grades is shown.` };
}

// ---------------------------------------------------------------- near the exam: priorities under a target

/** The exam plan is for learners near the exam (JEE: Grade 11 and above; GRE: after school). Younger: the overlay only. */
export const examPlanApplies = (goalId: string, grade: number) => (goalId === "gre-quant" ? grade >= 12 : grade >= 11);

export interface TopicPlan {
  topic: string;
  weight: [number, number];
  /** A rough chance of answering a question on this topic right (from your own evidence; uncalibrated). */
  chance: number;
  /** Whether attempting a question is worth it under the marking (expected marks above zero). */
  attempt: boolean;
  priority: number;
  competencies: { id: string; status: SkillEvidence["status"] }[];
}
const CHANCE: Record<SkillEvidence["status"], number> = { verified: 0.85, transfer: 0.75, independent: 0.65, review: 0.45, guided: 0.4, exposure: 0.3, not_started: 0.2 };
export function examPlan(goalId: string, ev: (id: string) => SkillEvidence, weeksLeft: number, target: 0.6 | 0.75 | 0.9) {
  const g = goalById(goalId);
  if (!g) return null;
  const { correct, wrong } = g.marking;
  const topics: TopicPlan[] = g.topics.map((t) => {
    const cs = t.competencies.filter((id) => graph.byId.has(id)).map((id) => ({ id, status: ev(id).status }));
    const chance = cs.reduce((s, c) => s + CHANCE[c.status], 0) / Math.max(cs.length, 1);
    const mid = (t.weight[0] + t.weight[1]) / 2;
    return { topic: t.id, weight: t.weight, chance, attempt: chance * correct + (1 - chance) * wrong > 0, priority: mid * (1 - chance), competencies: cs };
  });
  // expected share of marks, attempting only where expected marks are positive (a range, from the weight ranges)
  const share = (pick: (t: TopicPlan) => number) => topics.reduce((s, t) => s + pick(t) * (t.attempt ? (t.chance * correct + (1 - t.chance) * wrong) / correct : 0), 0);
  const low = share((t) => t.weight[0]);
  const high = share((t) => t.weight[1]);
  const weekly = Math.max(1, Math.min(3, Math.round(topics.length / Math.max(weeksLeft, 1))));
  return {
    goal: g,
    target,
    estimate: { low: Math.round(low * 100), high: Math.round(high * 100) },
    onTrack: low >= target,
    priorities: [...topics].sort((a, b) => b.priority - a.priority),
    perWeek: weekly,
    caveat: "A rough estimate from your own practice answers with provisional topic weight ranges. It is not a prediction of an exam score.",
  };
}
