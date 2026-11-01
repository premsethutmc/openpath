/** Adapter for explicitly opted-in persisted sessions; no new statistical model. */
import { foundationPlan, withFoundation, FOUNDATION_POLICY } from "./foundation";
import { LINEAR_EQUATIONS_CONFIG } from "./subskill-evidence";
import { TRIANGLE_PROPERTIES_CONFIG, ANGLE_PAIRS_CONFIG } from "./subskill-config-geometry";
import { ADDITION_CONFIG } from "./subskill-config-addition";
import { pathwayRoute } from "./plan";
import { isQuestion } from "./content";
import { moduleState } from "./intervention";
import { readRecords, type LearnerRecords, type HandoverAcknowledgement, type LearningRecord } from "./records";
import type { WrittenMark } from "./written";
import type { SkillEvidence } from "./evidence";
const configs = [LINEAR_EQUATIONS_CONFIG, TRIANGLE_PROPERTIES_CONFIG, ANGLE_PAIRS_CONFIG, ADDITION_CONFIG];
export function pathwayRecords(learner: string, events: readonly { kind: string }[], marks: readonly WrittenMark[] = [], acknowledgements: readonly HandoverAcknowledgement[] = []) {
  // Only persisted server decisions (or educator-marked written work) establish new-policy readiness.
  const marked = new Set(marks.map((m) => m.attemptId));
  const trusted = events.filter((e) => {
    const r = e as LearningRecord & { decision?: { schema?: string; decidedBy?: string; working?: { status?: string; methodEvidence?: string } } };
    return r.record !== "attempt" || marked.has(r.id) || (r.decision?.schema === "grading-decision@1" && r.decision.decidedBy === "server" && r.decision.working?.status !== "invalid" && r.decision.working?.methodEvidence !== "false-step");
  });
  const out = readRecords(learner, trusted, marks, acknowledgements);
  const accepted = new Set(trusted);
  for (const e of events) {
    const r = e as LearningRecord;
    if (!accepted.has(e) && r.record === "attempt" && r.learnerId === learner && isQuestion(r.questionId) && !out.unresolved.some((a) => a.id === r.id)) out.unresolved.push({ id: r.id, at: r.at, questionId: r.questionId, assessment: { policy: "assessment@1", answerCorrect: null, methodExamined: false, derivationVerified: false, firstError: null, clarificationRequired: false, aiFallbackUsed: false, unresolved: true, source: "infrastructure" } });
  }
  if (out.pathway?.active) out.readinessRoute = pathwayRoute(out.pathway.target).ids;
  return out;
}
export function pathwayModule(competency: string, learner: string, events: readonly { kind: string }[], records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number, session: string) {
  const ordinary = moduleState(competency, records, evidence(competency), now, session, null, evidence);
  const config = records.pathway?.active && records.readinessRoute?.includes(competency) && configs.find((c) => c.competency === competency);
  if (!config) return ordinary;
  const plan = foundationPlan({ version: FOUNDATION_POLICY, config, placement: "readiness", requirements: config.core.map((skill) => ({ skill, method: false })) }, learner, events, now, { trustedOnly: true });
  return { ...withFoundation(ordinary, plan), requirementsMet: plan.status === "shown" };
}
