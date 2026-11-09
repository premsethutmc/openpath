/**
 * deep-recovery@0 real-app adapter (RESEARCH, flag-gated, default off: see year/deep-recovery-flag.ts). It turns the prototype's
 * decision (packages/learning/src/deep-recovery.ts `deepRecovery`, called unchanged) into the one screen the app shows next, from
 * the learner's SAVED records only. Nothing is kept outside the ledger: the goal (the original question), the diagnosis path and the
 * next step are rebuilt from attempt contexts (`deep:<original>|<path>@<skill>`) and teaching records (optional `episode`), so a
 * reload, a sign-out or another device resumes at the same place.
 *
 * Sittings: the prototype's `sessionBudget` counts effort per session id, but the app's session id changes on every page load, so a
 * reload would reset the sitting budget. The adapter therefore groups the learner's attempts and lessons into sittings by time (a
 * new sitting after SITTING_GAP_MS without any activity) and gives the engine those sitting ids instead. A pause holds until the gap
 * has passed, across reloads and sign-outs. Nothing else in the records is changed.
 *
 * Nothing here grades, diagnoses, chooses teaching, authors or approves content. Synthetic success is not evidence of learning.
 */
import { question, type Strategy } from "../../../packages/learning/src/content";
import { deepRecovery, type DeepRecoveryOptions, type DeepRecoveryState } from "../../../packages/learning/src/deep-recovery";
import { RETENTION_DAYS, type SkillEvidence } from "../../../packages/learning/src/evidence";
import { graph } from "../../../packages/learning/src/graph";
import type { ModuleState } from "../../../packages/learning/src/intervention";
import type { LearnerRecords, LearningActivity } from "../../../packages/learning/src/records";
import { activityFor } from "./driver";

/** TEST BUILDS ONLY: `build-year.mjs --test --deep-recovery --deep-sitting=N` lowers the per-sitting limit so a browser journey can
 *  reach a pause; every other build defines 0 (the default below applies) */
declare const OPENPATH_DEEP_SITTING: number;
export const DEFAULT_SITTING = 40;
export const sittingLimit = (defined: unknown = typeof OPENPATH_DEEP_SITTING === "undefined" ? undefined : OPENPATH_DEEP_SITTING) =>
  typeof defined === "number" && Number.isInteger(defined) && defined > 0 && defined < DEFAULT_SITTING ? defined : DEFAULT_SITTING;
/** the phase-4 configuration (research/deep-recovery results): selective confirmation, reuse, 40 per sitting, 120 per episode */
export const DEEP_APP_OPTIONS: DeepRecoveryOptions = { confirm: "selective", reuse: true, sessionBudget: sittingLimit(), budget: 120, validDays: RETENTION_DAYS };
/** a sitting ends after this long without an answer or a lesson (reloads and sign-outs inside it are the same sitting) */
export const SITTING_GAP_MS = 2 * 3_600_000;
export const DEEP_TAG = "deep:";

/** the records with each attempt's and lesson's session replaced by its sitting, and the sitting `now` belongs to */
export function bySitting(records: LearnerRecords, now: number): { records: LearnerRecords; current: string } {
  const times = [...records.attempts.map((a) => a.at), ...records.teaching.map((t) => t.at)].sort();
  const of = new Map<string, string>();
  let start: string | null = null, prev = -Infinity;
  for (const at of times) {
    const t = Date.parse(at);
    if (start === null || t - prev > SITTING_GAP_MS) start = at;
    of.set(at, `sitting:${start}`);
    prev = t;
  }
  const current = start !== null && now - prev <= SITTING_GAP_MS ? `sitting:${start}` : `sitting:${new Date(now).toISOString()}`;
  return {
    records: { ...records, attempts: records.attempts.map((a) => ({ ...a, session: of.get(a.at)! })), teaching: records.teaching.map((t) => ({ ...t, session: of.get(t.at)! })) },
    current,
  };
}

export type DeepScreen =
  | { kind: "ask"; qid: string; activity: LearningActivity; context: string; heading: string; reason: string; state: DeepRecoveryState }
  | { kind: "lesson"; competency: string; strategy: Strategy; rule: string; episode: string | null; heading: string; reason: string; module: ModuleState; state: DeepRecoveryState }
  | { kind: "end"; phase: DeepRecoveryState["phase"]; title: string; reason: string; handover: boolean; state: DeepRecoveryState };

const END_TITLE: Record<string, string> = {
  solved: "Solved on your own",
  solved_after_help: "Solved after help",
  pause: "Paused: your place is saved",
  blocked: "OpenPath cannot teach this step yet",
  escalate: "Ask a teacher or parent about this one",
};
const name = (id: string | null) => (id && graph.byId.has(id) ? graph.get(id).name : id ?? "");

/** the screen to show now for the recovery from `original` (a pure function of the saved records and the time) */
export function deepScreen(original: string, records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number, o: DeepRecoveryOptions = DEEP_APP_OPTIONS): DeepScreen {
  const s = bySitting(records, now);
  const st = deepRecovery(original, s.records, evidence, now, s.current, o);
  const end = (phase: DeepRecoveryState["phase"], reason: string): DeepScreen => ({ kind: "end", phase, title: END_TITLE[phase] ?? END_TITLE.escalate, reason, handover: phase === "blocked" || phase === "escalate", state: st });
  if (st.phase === "attempt" || st.phase === "slip-check" || st.phase === "return" || st.phase === "probe") {
    const heading = st.phase === "attempt" ? "A problem you are stuck on" : st.phase === "slip-check" ? "One more of the same kind" : st.phase === "return" ? "Back to a fresh problem of the same kind" : `Finding what this problem needs: ${name(st.active)}`;
    // probes are recorded as "diagnostic" (the backend counts "probe" as not independent; family/learning.py INDEPENDENT)
    return { kind: "ask", qid: st.question!, activity: st.phase === "probe" ? "diagnostic" : "original", context: st.context!, heading, reason: st.reason, state: st };
  }
  if (st.phase === "teach") {
    const ms = st.module;
    if (ms?.phase === "chapter" && ms.strategy)
      return { kind: "lesson", competency: st.active!, strategy: ms.strategy, rule: (ms.decision?.diagnosis.kind ?? ms.diagnosis?.result ?? "diagnosis").slice(0, 40), episode: st.episode, heading: `Learning ${name(st.active)}`, reason: st.reason, module: ms, state: st };
    // every answer of the episode carries its context, the module's own questions too (episode evidence, effort, saved path)
    if (ms?.question) return { kind: "ask", qid: ms.question, activity: activityFor(ms), context: st.context!, heading: `Practising ${name(st.active)}`, reason: ms.reason || st.reason, state: st };
    return end("escalate", ms?.reason ? `${ms.reason} Go through it with a teacher or parent.` : st.reason);
  }
  return end(st.phase, st.reason);
}

/** the original question of a deep-recovery context, or null */
export const originalOf = (context: string | undefined): string | null => {
  if (!context?.startsWith(DEEP_TAG)) return null;
  const bar = context.indexOf("|");
  return bar > DEEP_TAG.length ? context.slice(DEEP_TAG.length, bar) : null;
};

/** recoveries the learner can come back to (not finished: running or paused), newest first, from saved records only */
export function openDeepRecoveries(records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number, o: DeepRecoveryOptions = DEEP_APP_OPTIONS): { original: string; screen: DeepScreen }[] {
  const seen: string[] = [];
  for (const a of [...records.attempts].reverse()) { const q = originalOf(a.context); if (q && !seen.includes(q)) seen.push(q); }
  const out: { original: string; screen: DeepScreen }[] = [];
  for (const q of seen.slice(0, 5)) {
    try { question(q); } catch { continue; }
    const screen = deepScreen(q, records, evidence, now, o);
    if (screen.kind !== "end" || screen.phase === "pause") out.push({ original: q, screen });
  }
  return out;
}
