import type {StudyTime,StudyAdvice,StudySummary} from "./study-session";
/**
 * A learner's My Learning Year records: kind "learning_record" in the existing (append-only) mathematics record of the
 * same OpenPath account and learner. Everything else (year, curriculum, tiles, statuses, plan) is derived from them.
 */
import type { CurriculumRelease } from "./curriculum";
import { isQuestion } from "./content";
import { exposureKey } from "./families";
import { isWritten, MARKED_NOT, MARKED_RIGHT, type WrittenMark } from "./written";

export type LearningActivity = "diagnostic" | "probe" | "guided" | "check" | "practice" | "transfer" | "retention" | "original" | "challenge";
interface Base {
  kind: "learning_record";
  id: string;
  at: string;
  learnerId: string;
  sessionId: string;
}
/** assessment@1: what the authoritative assessment decided, kept apart (a correct answer is not method mastery; unresolved is not incorrect) */
export interface AttemptAssessment {
  policy: "assessment@1";
  answerCorrect: boolean | null;
  methodExamined: boolean;
  derivationVerified: boolean;
  firstError: null | { transition: number; from: string; to: string; kind: string; explanation: string };
  clarificationRequired: boolean;
  aiFallbackUsed: boolean;
  unresolved: boolean;
  source: "kernel" | "legacy" | "educator" | "held" | "disagreement";
}
export type LearningRecord =
  | (Base & { record: "enrol"; grade: number; academicYear: string; curriculum: { id: string; version: string; hash: string } })
  | (Base & { record: "goal"; pathway: string; targetYear?: number; active: boolean })
  | (Base & { record: "curriculum"; release: CurriculumRelease })
  | (Base & { record: "attempt"; questionId: string; response: string; activity: LearningActivity; hints: number; solution: boolean; competency: string; context?: string; working?: string[]; assessment?: AttemptAssessment })
  | (Base & { record: "teach"; rule: string; strategy: string; competency: string })
  | (Base & { record: "topic_session"; academicYear: string; stage: "diagnostic" | "plan"; target: string; minutes?: 15 | 30 | 60; curriculum: { id: string; version: string; hash: string } })
  | (Base & { record: "study_session"; planId:string; revision:number; phase:"start"|"active"|"ended"; time:StudyTime; advice?:StudyAdvice; summary?:StudySummary })
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
  /** The learner's written working, line by line (working@1); never part of how the answer counts. */
  working?: string[];
  /** written@1: the learner's written answer and the educator's mark (the response is then the mark, never the text). */
  written?: { text: string; mark: WrittenMark };
}
/** A written answer waiting for an educator's mark: kept, shown, and not evidence of anything. */
export interface PendingWritten {
  id: string;
  at: string;
  questionId: string;
  text: string;
  competency: string;
}
export const UNRESOLVED_CAP = 2;
export interface LearnerRecords {
  enrolments: { at: string; grade: number; academicYear: string; curriculum: { id: string; version: string; hash: string } }[];
  goals: Map<string, { pathway: string; targetYear?: number; since: string }>;
  curricula: Map<string, CurriculumRelease>;
  attempts: Attempt[];
  teaching: { at: string; rule: string; strategy: string; competency: string; session: string }[];
  skips: { at: string; target: string }[];
  sessions: Record<string, string>;
  /** written@1: written answers not yet marked. */
  pending: PendingWritten[];
  /** assessment@1: submissions the assessment could not decide. They are not attempts: no credit either way, no effect on mastery or on the attempt number. */
  unresolved: { id: string; at: string; questionId: string; assessment: AttemptAssessment }[];
}

export function readRecords(learnerId: string, events: readonly { kind: string }[], marks: readonly WrittenMark[] = []): LearnerRecords {
  const out: LearnerRecords = { enrolments: [], goals: new Map(), curricula: new Map(), attempts: [], teaching: [], skips: [], sessions: {}, pending: [], unresolved: [] };
  const markOf = new Map(marks.map((m) => [m.attemptId, m]));
  const seen = new Set<string>();
  const count = new Map<string, number>(), held = new Map<string, number>();
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
    else if (r.record === "attempt" && isWritten(r.questionId) && !markOf.has(r.id)) out.pending.push({ id: r.id, at: r.at, questionId: r.questionId, text: r.response, competency: r.competency });
    // at most UNRESOLVED_CAP undecided submissions per problem sit outside the attempts: a learner cannot park wrong answers as "unresolved" to avoid the demotion rule
    else if (r.record === "attempt" && isQuestion(r.questionId) && r.assessment?.unresolved === true && held.set(exposureKey(r.questionId), (held.get(exposureKey(r.questionId)) ?? 0) + 1).get(exposureKey(r.questionId))! <= UNRESOLVED_CAP) out.unresolved.push({ id: r.id, at: r.at, questionId: r.questionId, assessment: r.assessment });
    else if (r.record === "attempt" && isQuestion(r.questionId)) {
      // the same problem in another answer format is the same exposure: a second sight is never fresh evidence
      const key = exposureKey(r.questionId);
      const n = (count.get(key) ?? 0) + 1;
      count.set(key, n);
      const mark = isWritten(r.questionId) ? markOf.get(r.id) : undefined;
      // a marked written answer enters the engine as the educator's mark, never as the learner's own text
      const response = mark ? (mark.verdict === "correct" ? MARKED_RIGHT : MARKED_NOT) : r.response;
      out.attempts.push({ id: r.id, at: r.at, session: r.sessionId, questionId: r.questionId, response, activity: r.activity, hints: r.hints, solution: r.solution, competency: r.competency, n, context: r.context, ...(r.working ? { working: r.working } : {}), ...(mark ? { written: { text: r.response, mark } } : {}) });
    } else if (r.record === "teach") out.teaching.push({ at: r.at, rule: r.rule, strategy: r.strategy, competency: r.competency, session: r.sessionId });
    else if (r.record === "skip") out.skips.push({ at: r.at, target: r.target });
  }
  return out;
}

export const currentEnrolment = (r: LearnerRecords) => r.enrolments.at(-1) ?? null;
