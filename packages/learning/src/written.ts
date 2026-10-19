/**
 * Written answers (written@1): proofs, constructions, explanations and drawings that a computer cannot mark
 * reliably. They are NEVER marked automatically:
 *
 *   - a written task (content/learning/written.v1.json) has a rubric and guidance for the marker;
 *   - the learner's answer is saved as an ordinary attempt (its text), and is PENDING: it is not evidence of anything;
 *   - an educator the parent has chosen marks it once (server: written.py), append-only;
 *   - only a mark of "correct" (full marks on the rubric) is evidence of success, through the same shared engine as
 *     every other answer (records.ts turns a marked attempt into a marked response).
 */
import data from "../../../content/learning/written.v1.json";

export const WRITTEN_POLICY = "written@1";
export interface WrittenTask {
  id: string;
  competency: string;
  kind: "proof" | "construction" | "explanation" | "drawing";
  grade: number;
  prompt: string;
  figure?: { type: string; [k: string]: unknown };
  rubric: { id: string; criterion: string; points: number }[];
  guidance: string;
  source: string;
  licence: string;
  review: "provisional";
}
export interface WrittenMark {
  attemptId: string;
  questionId: string;
  verdict: "correct" | "partial" | "incorrect";
  score: number;
  outOf: number;
  feedback: string;
  at: string;
  role: "educator";
}
export const writtenTasks = (data as unknown as { tasks: WrittenTask[] }).tasks;
const byId = new Map(writtenTasks.map((t) => [t.id, t]));
export const writtenTask = (id: string) => byId.get(id) ?? null;
export const isWritten = (id: string) => byId.has(id);
export const tasksFor = (competency: string) => writtenTasks.filter((t) => t.competency === competency);
export const outOf = (t: WrittenTask) => t.rubric.reduce((n, r) => n + r.points, 0);
/** The response a marked written attempt carries into the shared engine (the learner's own text never decides). */
export const MARKED_RIGHT = "written:marked-correct";
export const MARKED_NOT = "written:marked-not-yet";
