/**
 * recovery-handoff@0 (RESEARCH, deep-recovery@0; only the `--test --deep-recovery` build with ?deep=1 reaches it, and the server answers
 * 404 unless OPENPATH_DEEP_RECOVERY_HANDOFF=1). When the flagged recovery stops without teaching the learner through (blocked or escalated),
 * the app records one hand-off on the server (backend/family/handoff.py). It is shown ONLY in Content review → Marking to an educator the
 * parent has shared this pupil with; nobody is emailed or messaged. This module turns the stop screen into that report and chooses the
 * learner's sentence from what the server says is true (an educator can see it, or not; resolved, or not). Pure; tested in node.
 */
import { question } from "../../../packages/learning/src/content";
import type { DeepRecoveryOptions } from "../../../packages/learning/src/deep-recovery";
import type { SkillEvidence } from "../../../packages/learning/src/evidence";
import { graph } from "../../../packages/learning/src/graph";
import { moduleState } from "../../../packages/learning/src/intervention";
import type { LearnerRecords } from "../../../packages/learning/src/records";
import { DEEP_MODULE_POLICY, deepModuleState, moduleOriginals } from "./deep-module";
import { DEEP_APP_OPTIONS, deepScreen, type DeepScreen } from "./deep-recovery-app";

export type HandoffReason = "missing-content" | "no-fresh-question" | "teaching-not-worked" | "budget-exhausted" | "unsettled";
export interface HandoffReport { original: string; skill: string; step: string; episode: string; reason: HandoffReason; path: string[]; detail: string }
export interface HandoffStatus { id: number; skill: string; episode: string; status: "open" | "resolved"; resolvedAt: string | null; note: string }

const target = (id: string) => (graph.byId.has(id) ? graph.evidenceTarget(id) : id);

/**
 * why the recovery stopped, from STRUCTURED fields deepRecovery already returns (never its English text):
 *   blocked (or `blocked` set)                                   missing-content   (an unteachable step)
 *   the adapter's own escalate (engine phase still "teach"):     the module's phase: unavailable -> missing-content,
 *                                                                pause/reentry -> teaching-not-worked, else unsettled
 *   diagnosis "prerequisite" (a found gap, escalated)            teaching-not-worked (its explanations have not clicked)
 *   diagnosis "unexplained": with `module`                        missing-content   (the skill's module has nothing to offer now)
 *                            the skill itself taught this episode teaching-not-worked
 *                            not taught                           missing-content   (OpenPath cannot teach the skill itself)
 *   no diagnosis: effort at the episode budget                   budget-exhausted
 *                 a skill still active                           no-fresh-question (no fresh question to check it / the original)
 *                 otherwise                                     unsettled
 * The "skill itself taught this episode" test reads the saved lessons: those carrying this episode's id, or (older records without one)
 * any lesson on that skill after the episode began. Upstream, a `stop` field on DeepRecoveryState would make this a lookup (HANDOFF.md).
 */
export function stopCode(s: DeepScreen, records: LearnerRecords, o: DeepRecoveryOptions = DEEP_APP_OPTIONS): HandoffReason {
  const st = s.state;
  if ((s.kind === "end" && s.phase === "blocked") || st.blocked) return "missing-content";
  if (st.phase === "teach") { const mp = st.module?.phase; return mp === "unavailable" ? "missing-content" : mp === "pause" || mp === "reentry" ? "teaching-not-worked" : "unsettled"; }
  if (st.diagnosis === "prerequisite") return "teaching-not-worked";
  if (st.diagnosis === "unexplained") {
    if (st.module) return "missing-content";
    const own = st.path[0] ?? st.active, t0 = st.episode?.split("#")[1] ?? "";
    const taught = records.teaching.some((t) => target(t.competency) === own && (t.episode !== undefined ? t.episode === st.episode : t.at > t0));
    return taught ? "teaching-not-worked" : "missing-content";
  }
  if (o.budget !== undefined && st.effort >= o.budget) return "budget-exhausted";
  if (st.active) return "no-fresh-question";
  return "unsettled";
}

/** the original question's skill (what the educator is asked to help with) */
export const originalSkill = (original: string): string => { const c = question(original).competency; return graph.byId.has(c) ? graph.evidenceTarget(c) : c; };

/** the report for a stop screen that hands over; null for any other screen (a routine pause included), or a recovery that never started */
export function handoffReport(original: string, s: DeepScreen, records: LearnerRecords, o: DeepRecoveryOptions = DEEP_APP_OPTIONS): HandoffReport | null {
  if (s.kind !== "end" || !s.handover || !s.state.episode) return null;
  const st = s.state;
  return {
    original, skill: originalSkill(original), step: st.blocked?.skill ?? st.active ?? "", episode: st.episode!, reason: stopCode(s, records, o),
    path: st.path.slice(0, 16), detail: st.reason.replace(/</g, "‹").slice(0, 1000),
  };
}

/**
 * In a module (deep-module.ts): the stopped episode that paused the module, or null. Only a genuine stop counts: the module is paused BY
 * deep recovery (why "deep-recovery-module@0: blocked|escalate") and that episode's screen hands over. A routine sitting-limit pause keeps
 * the module on "recover" showing the episode's own pause screen (no hand-off), so it is never returned here.
 */
export function moduleStop(competency: string, records: LearnerRecords, ev: SkillEvidence, now: number, session: string, evidence: (id: string) => SkillEvidence): { original: string; screen: DeepScreen } | null {
  const ms = deepModuleState(true, competency, records, ev, now, session, null, evidence);
  if (ms.phase !== "pause" || !ms.why?.startsWith(`${DEEP_MODULE_POLICY}: `)) return null;
  const shipped = moduleState(competency, records, ev, now, session, null, evidence);
  const candidates = [...moduleOriginals(competency, records), ...(shipped.phase === "recover" && shipped.original ? [shipped.original] : [])];
  for (const q of new Set(candidates)) {
    const screen = deepScreen(q, records, evidence, now, DEEP_APP_OPTIONS);
    if (screen.kind === "end" && screen.handover) return { original: q, screen };
  }
  return null;
}

/** a routine sitting-limit pause: the place is saved and nothing is handed to anyone */
export const ROUTINE_PAUSE = "This is a routine break, not a problem: your place is saved and you carry on next time. Nothing has been sent to anyone.";

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
