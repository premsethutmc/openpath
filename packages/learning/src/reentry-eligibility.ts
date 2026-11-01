/** Server-side replay of the existing H1 policy. No second allowance calculation. */
import { learnerState } from "./session";
import { moduleState, reentryContext } from "./intervention";
import type { HandoverAcknowledgement } from "./records";
export interface ReentryRequest {
  operation: "reentry"; learner: string; competency: string; questionId: string; now: number; sessionId: string;
  events: { kind: string }[]; acknowledgements: HandoverAcknowledgement[];
}
export function reentryEligibility(r: ReentryRequest): { allowed: boolean } {
  try {
    if (typeof r.sessionId !== "string" || !r.sessionId.startsWith(`learn:${r.learner}:`) || !Number.isFinite(r.now) || !Array.isArray(r.events) || !Array.isArray(r.acknowledgements) || r.events.length > 20_000) return { allowed: false };
    const s = learnerState(r.learner, r.events, r.now, { acknowledgements: r.acknowledgements, currentSession: r.sessionId });
    const ms = s.records.pathway?.active ? s.module(r.competency) : moduleState(r.competency, s.records, s.evidence(r.competency), r.now, r.sessionId, null, s.evidence);
    return { allowed: ms.phase === "reentry" && ms.question === r.questionId && ms.context === reentryContext(r.competency) };
  } catch { return { allowed: false }; }
}
