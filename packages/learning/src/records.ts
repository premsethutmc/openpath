/**
 * A learner's My Learning Year records: kind "learning_record" in the existing (append-only) mathematics record of the
 * same OpenPath account and learner. Everything else (year, curriculum, tiles, statuses, plan) is derived from them.
 */
import type { CurriculumRelease } from "./curriculum";
import { isQuestion } from "./content";

export type LearningActivity = "diagnostic" | "probe" | "guided" | "check" | "practice" | "transfer" | "retention" | "original" | "challenge";
interface Base {
  kind: "learning_record";
  id: string;
  at: string;
  learnerId: string;
  sessionId: string;
}
export type LearningRecord =
  | (Base & { record: "enrol"; grade: number; academicYear: string; curriculum: { id: string; version: string; hash: string } })
  | (Base & { record: "goal"; pathway: string; targetYear?: number; active: boolean })
  | (Base & { record: "curriculum"; release: CurriculumRelease })
  | (Base & { record: "attempt"; questionId: string; response: string; activity: LearningActivity; hints: number; solution: boolean; competency: string; context?: string })
  | (Base & { record: "teach"; rule: string; strategy: string; competency: string })
  | (Base & { record: "skip"; target: string });

export interface Attempt {
  id: string;
  at: string;
  session: string;
  questionId: string;
  response: string;
  activity: LearningActivity;
  hints: number;
  solution: boolean;
  competency: string;
  /** Which attempt at this question (1 = first). Only a first, unaided attempt can be independent evidence. */
  n: number;
  context?: string;
}
export interface LearnerRecords {
  enrolments: { at: string; grade: number; academicYear: string; curriculum: { id: string; version: string; hash: string } }[];
  goals: Map<string, { pathway: string; targetYear?: number; since: string }>;
  curricula: Map<string, CurriculumRelease>;
  attempts: Attempt[];
  teaching: { at: string; rule: string; strategy: string; competency: string; session: string }[];
  skips: { at: string; target: string }[];
  sessions: Record<string, string>;
}

export function readRecords(learnerId: string, events: readonly { kind: string }[]): LearnerRecords {
  const out: LearnerRecords = { enrolments: [], goals: new Map(), curricula: new Map(), attempts: [], teaching: [], skips: [], sessions: {} };
  const seen = new Set<string>();
  const count = new Map<string, number>();
  for (const raw of events) {
    if (raw.kind !== "learning_record") continue;
    const r = raw as LearningRecord;
    if (seen.has(r.id) || r.learnerId !== learnerId || !Number.isFinite(Date.parse(r.at))) continue;
    seen.add(r.id);
    out.sessions[r.sessionId] ??= r.at;
    if (r.record === "enrol") out.enrolments.push({ at: r.at, grade: r.grade, academicYear: r.academicYear, curriculum: r.curriculum });
    else if (r.record === "goal") {
      if (r.active) out.goals.set(r.pathway, { pathway: r.pathway, targetYear: r.targetYear, since: r.at });
      else out.goals.delete(r.pathway);
    } else if (r.record === "curriculum") out.curricula.set(`${r.release.id}@${r.release.version}#${r.release.hash}`, r.release);
    else if (r.record === "attempt" && isQuestion(r.questionId)) {
      const n = (count.get(r.questionId) ?? 0) + 1;
      count.set(r.questionId, n);
      out.attempts.push({ id: r.id, at: r.at, session: r.sessionId, questionId: r.questionId, response: r.response, activity: r.activity, hints: r.hints, solution: r.solution, competency: r.competency, n, context: r.context });
    } else if (r.record === "teach") out.teaching.push({ at: r.at, rule: r.rule, strategy: r.strategy, competency: r.competency, session: r.sessionId });
    else if (r.record === "skip") out.skips.push({ at: r.at, target: r.target });
  }
  return out;
}

export const currentEnrolment = (r: LearnerRecords) => r.enrolments.at(-1) ?? null;
