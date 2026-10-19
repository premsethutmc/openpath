/**
 * Building learning records (the UI and the test drivers use the same constructors), and the learner's whole derived
 * state from their records at a moment: evidence, current year, tiles, plan.
 */
import { question } from "./content";
import { releaseFor } from "./curricula";
import type { CurriculumRelease } from "./curriculum";
import { evidenceFor } from "./evidence";
import { nextActivity, yearSummary } from "./plan";
import { currentEnrolment, readRecords, type LearningActivity, type LearningRecord } from "./records";

let counter = 0;
const rid = () => `lr-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
type Ctx = { learnerId: string; sessionId: string; at: string };
const base = (c: Ctx) => ({ kind: "learning_record" as const, id: rid(), at: c.at, learnerId: c.learnerId, sessionId: c.sessionId });

export const make = {
  enrol: (c: Ctx, grade: number, academicYear: string, r: CurriculumRelease): LearningRecord => ({ ...base(c), record: "enrol", grade, academicYear, curriculum: { id: r.id, version: r.version, hash: r.hash } }),
  goal: (c: Ctx, pathway: string, active = true, targetYear?: number): LearningRecord => ({ ...base(c), record: "goal", pathway, active, ...(targetYear ? { targetYear } : {}) }),
  curriculum: (c: Ctx, release: CurriculumRelease): LearningRecord => ({ ...base(c), record: "curriculum", release }),
  attempt: (c: Ctx, questionId: string, response: string, activity: LearningActivity, o: { hints?: number; solution?: boolean; context?: string } = {}): LearningRecord => ({ ...base(c), record: "attempt", questionId, response, activity, hints: o.hints ?? 0, solution: o.solution ?? false, competency: question(questionId).competency, ...(o.context ? { context: o.context } : {}) }),
  teach: (c: Ctx, competency: string, strategy: string, rule: string): LearningRecord => ({ ...base(c), record: "teach", competency, strategy, rule }),
};

export function learnerState(learnerId: string, events: readonly { kind: string }[], now: number) {
  const records = readRecords(learnerId, events);
  const ev = evidenceFor(learnerId, records, now);
  const enrol = currentEnrolment(records);
  const release = enrol ? releaseFor(enrol.curriculum, records.curricula) : null;
  return {
    records,
    evidence: ev.get,
    ledger: ev.ledger,
    enrolment: enrol,
    release,
    summary: release ? yearSummary(release, ev.get) : null,
    next: release ? nextActivity(release, ev.get, records) : null,
  };
}
