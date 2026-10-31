/**
 * D1 journey 15: restart and replay. A finished journey's events are stored with the server's decisions inside them (as Django keeps them:
 * learning.py puts the decision in the immutable event body), read back into a NEW session, and compared: the same evidence, the same next
 * step, and every recorded working assessment re-verified (grading/working.ts replayWorking: same authority version -> re-derived and compared;
 * another version -> reported historical, never reinterpreted).
 */
import { moduleState } from "../../../packages/learning/src/intervention";
import type { GradingDecision } from "../../../packages/learning/src/grading/decision";
import { replayWorking } from "../../../packages/learning/src/grading/working";
import { JOURNEYS, runJourney, C } from "./grader-journeys";
import { SliceSession } from "./session";

export function replayJourney() {
  const j = JOURNEYS.find((x) => x.id === "D1-13")!;
  const r = runJourney(j);
  const s0 = r.f.session, st0 = s0.state();
  const stored = JSON.parse(JSON.stringify(s0.events.map((e) => { const id = (e as { id?: string }).id; return id && s0.decisions[id] ? { ...e, decision: s0.decisions[id] } : e; })));
  const s1 = SliceSession.fromEvents(s0.learnerId, s0.competency, stored, s0.now, s0.session), st1 = s1.state();
  const e0 = st0.evidence(C), e1 = st1.evidence(C);
  const keys = ["status", "verified", "recoveryRequired", "independentAt", "retention"] as const;
  const m0 = moduleState(C, st0.records, e0, s0.now, s0.session, null, st0.evidence), m1 = moduleState(C, st1.records, e1, s0.now, s0.session, null, st1.evidence);
  const decisions = (stored as { record?: string; decision?: GradingDecision }[]).filter((e) => e.record === "attempt" || e.decision).map((e) => e.decision).filter((d): d is GradingDecision => !!d);
  const replays = decisions.filter((d) => d.working && d.working.status !== "none").map((d) => ({ question: d.questionId, status: d.working!.status, ...replayWorking(d) }));
  // an older authority's record is reported historical, not re-judged
  const old = decisions.find((d) => d.working?.certificates.length);
  const historical = old ? replayWorking({ ...old, working: { ...old.working!, versions: { ...old.working!.versions, authority: "openpath-derivation-authority@3" } } }) : null;
  return {
    id: "D1-15", title: "Restart and replay preserving authoritative evidence", from: j.id,
    events: stored.length, decisionsStored: decisions.length,
    evidenceEqual: Object.fromEntries(keys.map((k) => [k, JSON.stringify(e0[k]) === JSON.stringify(e1[k])])),
    retentionHistoryEqual: JSON.stringify(e0.retentionHistory) === JSON.stringify(e1.retentionHistory),
    nextStepEqual: JSON.stringify([m0.phase, m0.question, m0.strategy?.id ?? null]) === JSON.stringify([m1.phase, m1.question, m1.strategy?.id ?? null]),
    nextStep: [m1.phase, m1.question, m1.strategy?.id ?? null],
    after: { status: e1.status, verified: e1.verified, recoveryRequired: e1.recoveryRequired, retention: e1.retention, retentionHistory: e1.retentionHistory.map((h) => h.result) },
    workingReplays: replays, historicalVersionCheck: historical,
  };
}
