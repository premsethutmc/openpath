/** Adapter for explicitly opted-in persisted sessions; no new statistical model. */
import { foundationPlan, withFoundation, FOUNDATION_POLICY } from "./foundation";
import { connectionConfig, connectionStrategies, strategyConnects, connectedSkill } from "./skill-connections";
import { pathwayRoute } from "./plan";
import { isQuestion, moduleFor } from "./content";
import { moduleState, teachable, teachingStatus, contentReviewOf, questionForRequirement, establishedIds } from "./intervention";
import { readRecords, type LearnerRecords, type HandoverAcknowledgement, type LearningRecord } from "./records";
import type { WrittenMark } from "./written";
import { hypothesesFor, discriminatingProbe, teachingMatchesMisconception } from "./hypotheses";
import { independentAttempt, rightAnswer, type SkillEvidence } from "./evidence";

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
export function pathwayModule(competency: string, learner: string, events: readonly { kind: string }[], records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number, session: string, withinRecovery = false) {
  // Recovery already owns prerequisite investigation. Match its resolver while
  // retaining the same opt-in coverage and misconception requirements below.
  const ordinary = moduleState(competency, records, evidence(competency), now, session, null, withinRecovery ? undefined : evidence);
  const active = records.pathway?.active && records.readinessRoute?.includes(competency);
  if (!active) return ordinary;
  // A broad answer count cannot clear a diagnosed gap. Keep the existing hypotheses,
  // content gates and discriminating selector; only connect their outstanding obligation.
  const config = connectionConfig(competency);
  const gaps = hypothesesFor(competency, records).filter((h) => h.status === "established");
  const gap = gaps.find((h) => h.teachingDue) ?? gaps[0];
  if (gap?.claim) {
    const pending = { ...ordinary, requirementsMet: false, question: null, strategy: null, decision: null, why: "foundation-misconception-resolution@1" };
    const m = moduleFor(competency);
    const gapSkill = config ? connectedSkill(config, gap.scope.question) : null;
    if (gap.teachingDue) {
      const strategy = m?.strategies.find((s) => teachingMatchesMisconception(s, gap.scope.question, gap.claim!.explanation, competency, gap.scope.about)
        && (!config || (!!gapSkill && strategyConnects(config, gapSkill, s)))
        && teachable(m, s, [gap.claim!.explanation])
        && !records.teaching.some((t) => t.competency === competency && t.strategy === s.id && t.at > (gap.provenance.established ?? "")));
      if (strategy && m) return { ...pending, phase: "chapter" as const, strategy, teachingReview: teachingStatus(m, strategy), contentReview: contentReviewOf(m, strategy, [gap.claim.explanation]), reason: `${gap.claim.says} Review this kind of problem, then answer a fresh question that checks this misunderstanding.` };
      return { ...pending, phase: "unavailable" as const, reason: "This diagnosed gap still needs attention, but no eligible explanation for it is available here. This is a content limitation, not a learner failure. Review a supported lesson or choose another goal; the gap remains open." };
    }
    const probe = discriminatingProbe(gap, records, (id) => !config || (!!gapSkill && connectedSkill(config, id) === gapSkill));
    if (probe && (!config || (gapSkill && connectedSkill(config, probe) === gapSkill))) return { ...pending, phase: "check" as const, question: probe, activity: "check" as const, context: "foundation:resolution", reason: "One fresh question on your own to check the diagnosed misunderstanding. Other skills' answers cannot resolve it." };
    return { ...pending, phase: "unavailable" as const, reason: "The diagnosed misunderstanding has no fresh supported resolution question available. Your work is saved; review a supported lesson or choose another goal. The gap remains open." };
  }
  if (!config) return ordinary;
  const m = moduleFor(competency)!;
  // Keep a delivered block on its own skill until its first reassessment (assistance remains evidence, never independent credit).
  // Otherwise broad coverage ordering can jump to an unobserved skill after guided work.
  const delivered = records.teaching.filter((t) => t.competency === competency).at(-1);
  const taught = delivered && m.strategies.find((s) => s.id === delivered.strategy);
  const taughtSkill = taught ? connectedSkill(config, taught.guided) : null;
  const checked = delivered && taughtSkill && records.attempts.some((a) => a.at > delivered.at && connectedSkill(config, a.questionId) === taughtSkill && !["guided", "probe"].includes(a.activity));
  if (delivered && taught && taughtSkill && !checked && strategyConnects(config, taughtSkill, taught)
      && !ordinary.context?.startsWith("investigate")
      && !["recover", "pause", "reentry", "unavailable"].includes(ordinary.phase)
      && teachable(m, taught, establishedIds(competency, records))) {
    const guided = records.attempts.some((a) => a.at > delivered.at && a.questionId === taught.guided && a.activity === "guided");
    const q = guided ? questionForRequirement(m, "check", records, (id) => connectedSkill(config, id) === taughtSkill, "readiness") : taught.guided;
    return { ...ordinary, phase: q ? guided ? "check" as const : "guided" as const : "unavailable" as const, question: q, strategy: taught,
      activity: guided ? "check" as const : "guided" as const, context: `foundation:${taughtSkill}`, requirementsMet: false,
      reason: q ? guided ? "One fresh question on the skill you just practised. Help remains recorded in this session." : "Practise this same skill with help before a fresh check." : "No fresh check of the taught skill is available. Your work is saved; other chapters remain open." };
  }
  const plan = foundationPlan({ version: FOUNDATION_POLICY, config, placement: "readiness", requirements: config.core.map((skill) => ({ skill, method: false })) }, learner, events, now, { trustedOnly: true });
  // Teaching must address the evidence obligation selected by the same policy as its check.
  // Preserve recovery/handover ownership and the existing review/assistance machinery.
  if (plan.skill && ["chapter", "guided"].includes(ordinary.phase)) {
    const lastWrong = records.attempts.filter((a) => independentAttempt(a) && !rightAnswer(a) && connectedSkill(config, a.questionId)).at(-1);
    const targetSkill = (lastWrong && connectedSkill(config, lastWrong.questionId)) ?? (ordinary.strategy && connectedSkill(config, ordinary.strategy.guided)) ?? plan.skill;
    const current = ordinary.strategy;
    if (!current || !strategyConnects(config, targetSkill, current)) {
      const strategy = connectionStrategies(m, config, targetSkill).find((s) => teachable(m, s, []) && !records.teaching.some((t) => t.competency === competency && t.strategy === s.id));
      if (strategy) return { ...ordinary, phase: "chapter" as const, question: null, strategy, teachingReview: teachingStatus(m, strategy), contentReview: contentReviewOf(m, strategy, []), requirementsMet: false, reason: `${plan.reason} Review an example of this same skill before a fresh check.` };
      return { ...ordinary, phase: "unavailable" as const, question: null, strategy: null, requirementsMet: false, reason: `${plan.reason} No eligible teaching example and fresh-check connection is available for this exact skill. Your work is saved; other chapters remain open.` };
    }
  }
  return { ...withFoundation(ordinary, plan), requirementsMet: plan.status === "shown" };
}
