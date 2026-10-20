/**
 * Building learning records (the UI and the test drivers use the same constructors), and the learner's whole derived
 * state from their records at a moment: evidence, current year, tiles, plan.
 */
import { question } from "./content";
import { releaseFor } from "./curricula";
import type { CurriculumRelease } from "./curriculum";
import { evidenceFor } from "./evidence";
import { graph } from "./graph";
import { nextActivity, planChange, yearSummary } from "./plan";
import { currentEnrolment, readRecords, type LearningActivity, type LearningRecord } from "./records";
import type { WrittenMark } from "./written";

let counter = 0;
const rid = () => `lr-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
type Ctx = { learnerId: string; sessionId: string; at: string };
const base = (c: Ctx) => ({ kind: "learning_record" as const, id: rid(), at: c.at, learnerId: c.learnerId, sessionId: c.sessionId });

export const make = {
  enrol: (c: Ctx, grade: number, academicYear: string, r: CurriculumRelease): LearningRecord => ({ ...base(c), record: "enrol", grade, academicYear, curriculum: { id: r.id, version: r.version, hash: r.hash } }),
  goal: (c: Ctx, pathway: string, active = true, targetYear?: number): LearningRecord => ({ ...base(c), record: "goal", pathway, active, ...(targetYear ? { targetYear } : {}) }),
  curriculum: (c: Ctx, release: CurriculumRelease): LearningRecord => ({ ...base(c), record: "curriculum", release }),
  attempt: (c: Ctx, questionId: string, response: string, activity: LearningActivity, o: { hints?: number; solution?: boolean; context?: string; working?: string[] } = {}): LearningRecord => ({ ...base(c), record: "attempt", questionId, response, activity, hints: o.hints ?? 0, solution: o.solution ?? false, competency: question(questionId).competency, ...(o.context ? { context: o.context } : {}), ...(o.working?.length ? { working: o.working.slice(0, 8).map((l) => l.slice(0, 80)) } : {}) }),
  teach: (c: Ctx, competency: string, strategy: string, rule: string): LearningRecord => ({ ...base(c), record: "teach", competency, strategy, rule }),
};

export function learnerState(learnerId: string, events: readonly { kind: string }[], now: number, o: { currentSession?: string; marks?: readonly WrittenMark[] } = {}) {
  const records = readRecords(learnerId, events, o.marks ?? []);
  const ev = evidenceFor(learnerId, records, now);
  const enrol = currentEnrolment(records);
  const release = enrol ? releaseFor(enrol.curriculum, records.curricula) : null;
  const next = release ? nextActivity(release, ev.get, records) : null;
  // the plan at the end of the previous visit: the same derivation, without this visit's records
  let change: string | null = null;
  if (next && release) {
    const own = (e: { kind: string }) => (e as LearningRecord).sessionId;
    const sessions = [...new Set(events.filter((e) => e.kind === "learning_record").map(own))];
    const last = o.currentSession && sessions.includes(o.currentSession) ? o.currentSession : null;
    const before = events.filter((e) => e.kind !== "learning_record" || own(e) !== last);
    if (last && before.length < events.length) {
      const r0 = readRecords(learnerId, before, o.marks ?? []);
      const e0 = evidenceFor(learnerId, r0, now);
      const enrol0 = currentEnrolment(r0);
      const rel0 = enrol0 ? releaseFor(enrol0.curriculum, r0.curricula) : null;
      if (rel0 && rel0.id === release.id) change = planChange(nextActivity(rel0, e0.get, r0), next, e0.get, ev.get, (id) => graph.get(id).name);
    } else if (!last && sessions.length) {
      // a new visit: what changed since the last record (time passing makes a delayed check due)
      const lastAt = records.attempts.at(-1)?.at;
      if (lastAt) {
        const then = evidenceFor(learnerId, records, Date.parse(lastAt) + 1);
        change = planChange(nextActivity(release, then.get, records), next, then.get, ev.get, (id) => graph.get(id).name);
      }
    }
  }
  return {
    records,
    evidence: ev.get,
    ledger: ev.ledger,
    enrolment: enrol,
    release,
    summary: release ? yearSummary(release, ev.get) : null,
    next,
    /** Why the next activity differs from the end of the previous visit (null: unchanged). */
    change,
  };
}
