/**
 * Workstream H1: hand-over and return journeys through the real journey controller (SliceFlow → SliceSession → moduleState / recovery,
 * trusted grader, records, evidence). Only learner answers, when they come back, and (as server data) an educator's acknowledgement are
 * scripted. `traceH1` records what the learner was offered on every visit, the hand-over state and the evidence.
 */
import { moduleFor, question } from "../../../packages/learning/src/content";
import { DAY } from "../../../packages/learning/src/evidence";
import { handoverState, reentryContext, setHandoverPolicy, handoverPolicy } from "../../../packages/learning/src/intervention";
import { problemOf } from "../../../packages/learning/src/families";
import type { HandoverAcknowledgement } from "../../../packages/learning/src/records";
import { SliceFlow } from "./flow";
import { learners, misconception, right, wrong, type Learner, type LearnerView } from "./learners";
import { T0 } from "./scenarios";
import { SliceSession } from "./session";

export const LE = "MATH.algebra.linear-equations";
export const START = "gen:lin:2,17,11";
/** a learner who makes the forgot-divide error everywhere it applies (wrong elsewhere) until `learnsAt` (a day count since T0), then right */
export const stuck = (learnsAtDay = Infinity): Learner => ({ name: `forgot-divide${learnsAtDay === Infinity ? " (never learns)" : ` until day ${learnsAtDay}`}`, act: (v) => ({ answer: (v as LearnerView & { day?: number }).day !== undefined && (v as LearnerView & { day: number }).day >= learnsAtDay ? right(v.q) : misconception(v.q, new Set(["forgot-divide"])) ?? wrong(v.q) }) });

export interface VisitRecord { visit: number; at: string; offered: string[]; answers: { q: string; phase: string; activity: string; context: string | null; verdict: string | null }[]; ended: string | null; reason: string | null; note: string | null; handover: { route: string; since: string | null; eligibleAt: string | null; selfReentriesLeft: number; reentries: number } | null; evidence: { status: string; verified: boolean; retention: string; recoveryRequired: boolean; history: string[] } }

/** drive the flow with a learner until a summary; returns what was offered and answered in this visit */
export function visit(f: SliceFlow, L: Learner, day: number, max = 250) {
  const offered: string[] = [], answers: VisitRecord["answers"] = [];
  const before = f.session.replies.length;
  for (let i = 0; i < max && f.stage !== "summary"; i++) {
    if (f.stage === "question") {
      const q = f.currentQuestion!;
      offered.push(`${f.currentPhase}:${q}`);
      const v = { q, phase: f.currentPhase, activity: f.currentActivity, taught: f.session.events.filter((e) => (e as { record?: string }).record === "teach").length, answered: f.session.replies.length, hintShown: false, hintAsked: true, session: f.session.session, retentionFails: 0, taughtSkills: [], day } as LearnerView & { day: number };
      const a = L.act(v) as { answer: string };
      answers.push({ q, phase: f.currentPhase, activity: f.currentActivity, context: null, verdict: null });
      f.on({ type: "answer_submitted", value: a.answer, timestamp: 0 } as Parameters<SliceFlow["on"]>[0]);
    } else { if (f.stage === "teaching") offered.push(`teaching:${f.frames.at(-1)?.strategyId ?? ""}`); f.on({ type: "skip_requested", timestamp: 0 } as Parameters<SliceFlow["on"]>[0]); }
  }
  const replies = f.session.replies.slice(before);
  const recs = f.session.state().records.attempts.concat();
  answers.forEach((x, i) => { x.verdict = replies[i]?.verdict ?? null; const rec = [...recs].reverse().find((a) => a.questionId === x.q); x.context = rec?.context ?? null; });
  return { offered, answers };
}
export function record(f: SliceFlow, n: number, v: ReturnType<typeof visit>): VisitRecord {
  const st = f.session.state(), e = st.evidence(LE);
  const h = handoverState(LE, st.records, f.session.now);
  const paused = f.ended?.phase === "pause";
  return { visit: n, at: new Date(f.session.now).toISOString(), offered: v.offered, answers: v.answers, ended: f.ended?.phase ?? null, reason: f.ended?.reason ?? null, note: (f.spec.teacherGuide?.detail as string | undefined) ?? null,
    handover: paused || v.answers.some((a) => a.phase === "reentry") ? { route: h.route, since: h.since, eligibleAt: h.eligibleAt, selfReentriesLeft: h.selfReentriesLeft, reentries: h.reentries.length } : null,
    evidence: { status: e.status, verified: e.verified, retention: e.retention, recoveryRequired: e.recoveryRequired, history: e.retentionHistory.map((x) => x.result) } };
}
/** a whole journey: first visit, then come back after each listed number of days (an acknowledgement may be added before a return) */
export function journey(id: string, L: Learner, returns: { days: number; ack?: boolean }[], o: { timeZone?: string; start?: string; learnerId?: string } = {}) {
  const f = new SliceFlow(o.start ?? START, o.learnerId ?? `h1-${id}`, T0, { timeZone: o.timeZone ?? "UTC" });
  const out: VisitRecord[] = [];
  let day = 0;
  out.push(record(f, 1, visit(f, L, day)));
  returns.forEach((r, i) => {
    if (r.ack) f.session.acknowledgements.push({ id: `ack-${id}-${i}`, at: new Date(f.session.now + (r.days * DAY) / 2).toISOString(), competency: LE, by: "educator" } satisfies HandoverAcknowledgement);
    day += r.days; f.later(r.days);
    out.push(record(f, i + 2, visit(f, L, day)));
  });
  return { id, flow: f, visits: out };
}
export const counts = (visits: VisitRecord[]) => ({
  visits: visits.length,
  visitsWithNothing: visits.filter((v) => !v.answers.length && !v.offered.some((o) => o.startsWith("teaching"))).length,
  reentryQuestions: visits.flatMap((v) => v.answers).filter((a) => a.context === reentryContext(LE)).length,
  questions: visits.flatMap((v) => v.answers).length,
});
export { handoverPolicy, setHandoverPolicy, learners, right, wrong, moduleFor, question, problemOf, SliceSession };
