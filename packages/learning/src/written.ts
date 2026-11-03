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
  kind: "proof" | "construction" | "explanation" | "drawing" | "sketch";
  grade: number;
  prompt: string;
  figure?: { type: string; [k: string]: unknown };
  /** draw@1: "drawing" hands in a drawing (pen, straight edge, compass, points) with a note; otherwise text. A graph
   * sketch, a construction or a diagram is drawn; the educator marks the drawing as handed in. */
  answer?: "text" | "drawing";
  /** The sheet a drawing starts from: plain, squared, or axes with their ranges (graph sketches). */
  canvas?: { grid?: boolean; axes?: { x: [number, number]; y: [number, number]; step?: number } };
  /** The curriculum outcomes (syllabus ids) this task assesses. */
  serves?: string[];
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

/**
 * keyboard-offer@1: drawn answers (answer "drawing": constructions, sketches, diagrams) cannot be handed in while
 * handwriting is off (product policy, frontend/src/writing/features.ts HANDWRITING_ENABLED; written-offer.test.ts keeps
 * the two equal). Such a task is then never OFFERED. Nothing else changes: the content, its review hashes and the
 * module lists are as loaded, and a drawing already handed in (with its mark) is read and counts as before.
 */
export const DRAWN_ANSWERS_ACCEPTED: boolean = false;
/** Whether a question may be offered with keyboard input (every question that is not a drawn written task). */
export const keyboardOffered = (id: string) => DRAWN_ANSWERS_ACCEPTED || byId.get(id)?.answer !== "drawing";
/** The one place that lists the written tasks withheld from keyboard learners, by competency. */
export const withheldDrawings: ReadonlyMap<string, readonly string[]> = DRAWN_ANSWERS_ACCEPTED
  ? new Map()
  : writtenTasks.filter((t) => t.answer === "drawing").reduce((m, t) => m.set(t.competency, [...(m.get(t.competency) ?? []), t.id]), new Map<string, string[]>());
/** What the learner is told when a topic's remaining educator-marked work is drawn (never a trap: other topics stay open). */
export const KEYBOARD_UNAVAILABLE = "The rest of this topic is drawing or construction work, which is not available with keyboard input. Your answers so far are saved; other topics are open.";
