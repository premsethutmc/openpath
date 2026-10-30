/** THE one grading decision for the app. Every screen, record builder and replay asks this function; it is grading/decision.ts grade(), the
 *  same code the trusted server grader runs. An answer that cannot be read or decided is undecided (null), never wrong. */
import type { Assessment } from "./assessment.ts";
import { isCorrect, needsMarking, question } from "./content";
import { quarantined } from "./question-status";
import { grade } from "./grading/decision.ts";

/** THE authoritative decision for one submission (grading/decision.ts grade): the same function the trusted server grader runs. The
 *  learner's response is kept exactly as written; nothing is rewritten into another form for the record. */
export function decide(qid: string, response: string, working: readonly string[] = [], clarifications = 0): Assessment {
  return grade(qid, response, working, clarifications).assessment;
}
/** The credit this response earns: true, false, or null (undecided / marked by a teacher). Deterministic, so the replay of stored records agrees with the decision made at submission. */
export const creditOf = (qid: string, response: string): boolean | null => (quarantined(qid) ? null : needsMarking(question(qid)) ? isCorrect(question(qid), response) : decide(qid, response).credit);
