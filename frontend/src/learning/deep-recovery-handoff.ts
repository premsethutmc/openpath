/**
 * recovery-handoff@0 (RESEARCH, deep-recovery@0; only the `--test --deep-recovery` build with ?deep=1 reaches it, and the server answers
 * 404 unless OPENPATH_DEEP_RECOVERY_HANDOFF=1). When the flagged recovery stops without teaching the learner through (blocked or escalated),
 * the app records one hand-off on the server (backend/family/handoff.py). It is shown ONLY in Content review → Marking to an educator the
 * parent has shared this pupil with; nobody is emailed or messaged. This module turns the stop screen into that report and chooses the
 * learner's sentence from what the server says is true (an educator can see it, or not; resolved, or not). Pure; tested in node.
 */
import { question } from "../../../packages/learning/src/content";
import { graph } from "../../../packages/learning/src/graph";
import type { DeepScreen } from "./deep-recovery-app";

export type HandoffReason = "missing-content" | "no-fresh-question" | "teaching-not-worked" | "budget-exhausted" | "unsettled";
export interface HandoffReport { original: string; skill: string; step: string; episode: string; reason: HandoffReason; path: string[]; detail: string }
export interface HandoffStatus { id: number; skill: string; episode: string; status: "open" | "resolved"; resolvedAt: string | null; note: string }

/** why the recovery stopped, from the engine's own state (phase, then the reason it gave the learner) */
export function reasonOf(phase: string, reason: string): HandoffReason {
  if (phase === "blocked") return "missing-content";
  if (/effort limit/i.test(reason)) return "budget-exhausted";
  if (/no fresh question/i.test(reason)) return "no-fresh-question";
  if (/have not clicked|did not fix it/i.test(reason)) return "teaching-not-worked";
  if (/cannot teach|no explanation to offer/i.test(reason)) return "missing-content";
  return "unsettled";
}

/** the original question's skill (what the educator is asked to help with) */
export const originalSkill = (original: string): string => { const c = question(original).competency; return graph.byId.has(c) ? graph.evidenceTarget(c) : c; };

/** the report for a stop screen that hands over; null for any other screen, or a recovery that never started (no episode id) */
export function handoffReport(original: string, s: DeepScreen): HandoffReport | null {
  if (s.kind !== "end" || !s.handover || !s.state.episode) return null;
  const st = s.state;
  return {
    original, skill: originalSkill(original), step: st.blocked?.skill ?? st.active ?? "", episode: st.episode!, reason: reasonOf(st.phase, st.reason),
    path: st.path.slice(0, 16), detail: st.reason.replace(/</g, "‹").slice(0, 1000),
  };
}

/** the honest note shown before the server has answered, when it cannot be reached, or when the hand-off switch is off on the server */
export const NOT_SENT = "Nothing here is counted as solved. Your answers so far are saved in your record, where a teacher or parent can go through them with you. OpenPath has not sent this to anyone.";

/** what the learner is told, from the server's answer only (never claims a message was sent) */
export function handoffText(h: HandoffStatus | null, educatorCanSee: boolean): string {
  if (!h) return NOT_SENT;
  if (h.status === "resolved") {
    const when = h.resolvedAt ? ` on ${h.resolvedAt.slice(0, 10)}` : "";
    return `An educator marked this as dealt with${when}.${h.note ? ` Their note: “${h.note}”` : ""} Nothing here is counted as solved.`;
  }
  if (educatorCanSee) return "Nothing here is counted as solved. OpenPath has put this on the help list of the educator your family shared your work with: they will see which skill and why when they next sign in to OpenPath. Nobody has been emailed or messaged.";
  return "Nothing here is counted as solved. Your answers so far are saved in your record, where a teacher or parent can go through them with you. OpenPath has kept a note of this for an educator, but no educator can see it yet: your family has not shared your work with one. OpenPath has not sent this to anyone.";
}
