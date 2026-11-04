/** Preview-only shared evidence policy; no production switch is changed. */
import { moduleFor, question } from "./content";
import { canonicalOrder, classifyQuestionWith, projectFromEventsWith, type SubSkillConfig } from "./subskill-projection";
import { graph } from "./graph";
import { evidenceFor } from "./evidence";
import { expectedWorkingAuthority } from "./grading/working";
import { readRecords } from "./records";
import { questionForRequirement, type ModuleState } from "./intervention";
export const FOUNDATION_POLICY = "mathematics-foundation@1";
export interface FoundationPolicy { version: typeof FOUNDATION_POLICY; config: SubSkillConfig; requirements: readonly { skill: string; method: boolean }[]; placement?: "readiness" }
export interface FoundationPlan {
  policy: typeof FOUNDATION_POLICY;
  status: "unobserved" | "weak" | "coverage" | "method-needed" | "recovery" | "retention" | "shown" | "unavailable";
  skill: string | null; question: string | null; reason: string;
}
/** All candidate questions pass the existing module filtering, quarantine and grade checks. */
export function foundationPlan(policy: FoundationPolicy, learner: string, events: readonly { kind: string }[], now: number, options: { trustedOnly?: boolean } = {}): FoundationPlan {
  const result = (status: FoundationPlan["status"], skill: string | null, q: string | null, reason: string): FoundationPlan => ({ policy: FOUNDATION_POLICY, status, skill, question: q, reason });
  if (policy.version !== FOUNDATION_POLICY || !policy.requirements.length) return result("unavailable", null, null, "No versioned evidence requirements configured.");
  events = canonicalOrder(events);
  const untrusted = new Set(events.filter((e) => {
    const r = e as { learnerId?: string; record?: string; decision?: { schema?: string; decidedBy?: string } };
    return r.learnerId === learner && r.record === "attempt" && (options.trustedOnly || r.decision !== undefined) && (!r.decision || r.decision.schema !== "grading-decision@1" || r.decision.decidedBy !== "server");
  }).map((e) => (e as unknown as { id: string }).id));
  const p = projectFromEventsWith(policy.config, learner, events, now, null, { exclude: (a) => untrusted.has(a.id) });
  if (p.outcome !== "projected") return result("unavailable", null, null, "Saved evidence could not be projected; no mastery is claimed.");
  const records = readRecords(learner, events);
  const needs = policy.requirements.map((r) => {
    const s = p.subSkills.find((x) => x.id === r.skill);
    if (!s) return { r, s, status: "unavailable" as const, priority: 0 };
    const status: FoundationPlan["status"] = s.status === "recovery-required" ? "recovery" : s.status === "retention-due" ? "retention"
      : s.status === "developing" ? "weak" : s.status === "not-attempted" ? "unobserved"
      : s.status === "insufficient-evidence" ? (s.attempts.independent > s.attempts.independentRight ? "weak" : "coverage")
      : r.method && !s.method.verified ? "method-needed" : "shown";
    return { r, s, status, priority: ["unavailable", "recovery", "retention", "weak", "unobserved", "coverage", "method-needed", "shown"].indexOf(status) };
  }).sort((a, b) => a.priority - b.priority || (a.r.skill < b.r.skill ? -1 : a.r.skill > b.r.skill ? 1 : 0));
  const need = needs.find((n) => n.status !== "shown");
  if (!need) return result("shown", null, null, "Each configured requirement has evidence; delayed checks remain scheduled.");
  const m = moduleFor(policy.config.competency);
  if (!m || !need.s) return result("unavailable", need.r.skill, null, "No supported learning opportunity is configured for this skill.");
  // An explicitly chosen supported target may be above the enrolment grade. Readiness
  // comes from its own prerequisite evidence, never from an unrelated easy success.
  // A delayed check (or recovery after it) maintains evidence already earned on
  // this exact target. Missing prerequisite records must not prevent that check.
  // Legacy/client-only answers cannot establish this exception, even for preview callers.
  let maintainingTrustedTarget = false;
  if (policy.placement === "readiness" && (need.status === "retention" || need.status === "recovery") && need.s.historical.everDemonstrated) {
    // Match the canonical reader's admission boundary. A marker on an ignored or
    // later duplicate record must never lend provenance to the admitted attempt.
    const admitted = new Map<string, { record?: string; decision?: { schema?: string; decidedBy?: string } }>();
    const contents = new Map<string, string>();
    const conflicts = new Set<string>();
    for (const e of events) {
      const r = e as { kind?: string; id?: string; at?: string; learnerId?: string; record?: string; decision?: { schema?: string; decidedBy?: string } };
      if (r.learnerId !== learner || typeof r.id !== "string") continue;
      const content = JSON.stringify(e);
      if (contents.has(r.id) && contents.get(r.id) !== content) conflicts.add(r.id);
      else contents.set(r.id, content);
      if (r.kind !== "learning_record" || typeof r.at !== "string" || !Number.isFinite(Date.parse(r.at)) || admitted.has(r.id)) continue;
      admitted.set(r.id, r);
    }
    const trustedIds = new Set(records.attempts.filter((a) => {
      const r = admitted.get(a.id);
      return !conflicts.has(a.id) && r?.record === "attempt" && r.decision?.schema === "grading-decision@1" && r.decision.decidedBy === "server";
    }).map((a) => a.id));
    const trusted = projectFromEventsWith(policy.config, learner, events, now, null, { exclude: (a) => !trustedIds.has(a.id) });
    maintainingTrustedTarget = trusted.subSkills.some((s) => s.id === need.r.skill && s.historical.everDemonstrated);
  }
  if (policy.placement === "readiness" && !maintainingTrustedTarget) {
    const ev = evidenceFor(learner, { ...records, attempts: records.attempts.filter((a) => !untrusted.has(a.id)) }, now);
    const missing = graph.relationsOf(policy.config.competency).filter((r) => r.type === "mandatory" || r.type === "plausible").map((r) => r.from).filter((id) => {
      const e = ev.get(id);
      return !["independent", "transfer", "verified"].includes(e.status) || e.recoveryRequired || e.retention === "due";
    });
    if (missing.length) return result("unavailable", need.r.skill, null, `This target is open for preparation. First probe or review its prerequisites: ${missing.join(", ")}. Your grade is not a mastery limit; an unrelated success is not readiness evidence.`);
  }
  const phase = need.status === "retention" ? "retention" : "check";
  const q = questionForRequirement(m, phase, records, (id) => {
    const c = classifyQuestionWith(policy.config, id);
    return c.kind === "mapped" && c.subSkill.id === need.r.skill
      && (need.status !== "method-needed" || (!!expectedWorkingAuthority(id) && !question(id).options?.length));
  }, policy.placement ?? "enrolment");
  return result(q ? need.status : "unavailable", need.r.skill, q, q
    ? `${need.s.name}: ${need.status === "unobserved" ? "not yet observed" : need.status === "recovery" ? "recheck the skill whose delayed check failed" : need.status === "retention" ? "a delayed check is due" : need.status === "method-needed" ? "show an intermediate step; answer credit alone does not establish a method" : "more evidence is needed on this skill"}.`
    : `${need.s.name}: no fresh supported question is available. Progress is saved; revisit the lesson for supported practice. This does not establish mastery.`);
}
/** Explicit preview callers only. Preserve the existing teaching and recovery flow. */
export function withFoundation(ms: ModuleState, plan: FoundationPlan): ModuleState {
  const resumeScopedRecovery = ms.phase === "explore" && plan.status === "recovery" && !!plan.question && !ms.context?.startsWith("investigate");
  if (ms.context?.startsWith("investigate") || ["chapter", "guided", "strategy", "recover", "pause", "reentry", "unavailable"].includes(ms.phase)
      || (ms.phase === "explore" && !resumeScopedRecovery)) return ms;
  if (plan.status === "shown") return ms;
  if (!plan.question) return { ...ms, phase: "unavailable", question: null, reason: plan.reason, why: FOUNDATION_POLICY };
  return { ...ms, phase: plan.status === "retention" ? "retention" : "check", question: plan.question,
    activity: plan.status === "retention" ? "retention" : "check", reason: plan.reason, context: `foundation:${plan.skill}`, why: FOUNDATION_POLICY };
}
