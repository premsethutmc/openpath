/** Adapter for explicitly opted-in persisted sessions; no new statistical model. */
import { foundationPlan, withFoundation, FOUNDATION_POLICY } from "./foundation";
import { LINEAR_EQUATIONS_CONFIG } from "./subskill-evidence";
import { TRIANGLE_PROPERTIES_CONFIG, ANGLE_PAIRS_CONFIG } from "./subskill-config-geometry";
import { ADDITION_CONFIG } from "./subskill-config-addition";
import { pathwayRoute } from "./plan";
import { isQuestion, moduleFor } from "./content";
import { moduleState, teachable, teachingStatus, contentReviewOf } from "./intervention";
import { readRecords, type LearnerRecords, type HandoverAcknowledgement, type LearningRecord } from "./records";
import type { WrittenMark } from "./written";
import { hypothesesFor, discriminatingProbe, teachingMatchesMisconception } from "./hypotheses";
import type { SkillEvidence } from "./evidence";
const configs = [LINEAR_EQUATIONS_CONFIG, TRIANGLE_PROPERTIES_CONFIG, ANGLE_PAIRS_CONFIG, ADDITION_CONFIG];
export function pathwayRecords(learner: string, events: readonly { kind: string }[], marks: readonly WrittenMark[] = [], acknowledgements: readonly HandoverAcknowledgement[] = []) {
  // Only persisted server decisions (or educator-marked written work) establish new-policy readiness.
  const marked = new Set(marks.map((m) => m.attemptId));
  const trusted = events.filter((e) => {
    const r = e as LearningRecord & { decision?: { schema?: string; decidedBy?: string; verdict?: string; working?: { status?: string; methodEvidence?: string } } };
    return r.record !== "attempt" || marked.has(r.id) || (r.decision?.schema === "grading-decision@1" && r.decision.decidedBy === "server" && !(r.decision.verdict === "correct" && (r.decision.working?.status === "invalid" || r.decision.working?.methodEvidence === "method-false-step")));
  });
  const out = readRecords(learner, events, marks, acknowledgements);
  const trustedIds = new Set(trusted.map((e) => (e as LearningRecord).id));
  // Keep original exposure numbers: excluding an earlier verdict cannot make a repeat independent.
  out.attempts = out.attempts.filter((a) => trustedIds.has(a.id));
  const accepted = new Set(trusted);
  for (const e of events) {
    const r = e as LearningRecord;
    if (!accepted.has(e) && r.record === "attempt" && r.learnerId === learner && isQuestion(r.questionId) && !out.unresolved.some((a) => a.id === r.id)) out.unresolved.push({ id: r.id, at: r.at, questionId: r.questionId, assessment: { policy: "assessment@1", answerCorrect: null, methodExamined: false, derivationVerified: false, firstError: null, clarificationRequired: false, aiFallbackUsed: false, unresolved: true, source: "infrastructure" } });
  }
  if (out.pathway?.active) { const route = pathwayRoute(out.pathway.target); if (!route.error) out.readinessRoute = route.ids; }
  return out;
}
export function pathwayModule(competency: string, learner: string, events: readonly { kind: string }[], records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number, session: string) {
  const ordinary = moduleState(competency, records, evidence(competency), now, session, null, evidence);
  const active = records.pathway?.active && records.readinessRoute?.includes(competency);
  if (!active) return ordinary;
  // A broad answer count cannot clear a diagnosed gap. Keep the existing hypotheses,
  // content gates and discriminating selector; only connect their outstanding obligation.
  const gaps = hypothesesFor(competency, records).filter((h) => h.status === "established");
  const gap = gaps.find((h) => h.teachingDue) ?? gaps[0];
  if (gap?.claim) {
    const pending = { ...ordinary, requirementsMet: false, question: null, strategy: null, decision: null, why: "foundation-misconception-resolution@1" };
    const m = moduleFor(competency);
    if (gap.teachingDue) {
      const strategy = m?.strategies.find((s) => teachingMatchesMisconception(s, gap.scope.question, gap.claim!.explanation, competency, gap.scope.about)
        && teachable(m, s, [gap.claim!.explanation])
        && !records.teaching.some((t) => t.competency === competency && t.strategy === s.id && t.at > (gap.provenance.established ?? "")));
      if (strategy && m) return { ...pending, phase: "chapter" as const, strategy, teachingReview: teachingStatus(m, strategy), contentReview: contentReviewOf(m, strategy, [gap.claim.explanation]), reason: `${gap.claim.says} Review this kind of problem, then answer a fresh question that checks this misunderstanding.` };
      return { ...pending, phase: "unavailable" as const, reason: "This diagnosed gap still needs attention, but no eligible explanation for it is available here. This is a content limitation, not a learner failure. Review a supported lesson or choose another goal; the gap remains open." };
    }
    const probe = discriminatingProbe(gap, records);
    if (probe) return { ...pending, phase: "check" as const, question: probe, activity: "check" as const, context: "foundation:resolution", reason: "One fresh question on your own to check the diagnosed misunderstanding. Other skills' answers cannot resolve it." };
    return { ...pending, phase: "unavailable" as const, reason: "The diagnosed misunderstanding has no fresh supported resolution question available. Your work is saved; review a supported lesson or choose another goal. The gap remains open." };
  }
  const config = configs.find((c) => c.competency === competency);
  if (!config) return ordinary;
  const plan = foundationPlan({ version: FOUNDATION_POLICY, config, placement: "readiness", requirements: config.core.map((skill) => ({ skill, method: false })) }, learner, events, now, { trustedOnly: true });
  return { ...withFoundation(ordinary, plan), requirementsMet: plan.status === "shown" };
}
