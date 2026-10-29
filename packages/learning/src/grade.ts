/** THE one grading decision. Every screen, record builder and replay asks this function; nothing else compares a response with a stored answer.
 *  Kernel where the family has one, otherwise the stored answer labelled "legacy"; an answer the comparison cannot read is undecided (null), never wrong. */
import { assessSubmission, contractFor, legacyContract, type Assessment, type AssessmentContract } from "./assessment.ts";
import { canonical, isCorrect, needsMarking, question } from "./content";
import { quarantined } from "./question-status";

const contracts = new Map<string, AssessmentContract>();
const contractOf = (qid: string) => { let c = contracts.get(qid); if (!c) { c = contractFor(qid) ?? legacyContract(question(qid)); contracts.set(qid, c); } return c; };
/** THE authoritative decision for one submission: the answer field first (kernel where the family has one, otherwise the stored answer), working only when the answer is not correct. Every attempt record carries its result. */
export function decide(qid: string, response: string, working: readonly string[] = [], clarifications = 0): Assessment {
  // question-status@1: a quarantined question receives no verdict from any route (the response is kept, nothing is decided)
  if (quarantined(qid)) return assessSubmission(null, { response, working, clarifications });
  const q = question(qid);
  const c = contractOf(qid), legacy = (r: string) => (q.type === "written" || canonical(q, r) === null ? null : isCorrect(q, r)); // an answer the comparison cannot read is undecided, never wrong
  const a = assessSubmission(c, { response, working, clarifications, legacyCorrect: legacy(response) });
  // mathematically decided in a form the stored-answer comparison cannot read ("x = 2, x = 3", "x = 4"): decide on the plain form and record that, so the replay and the server (which reads only the plain form) agree
  if (a.evidence.source === "disagreement" && a.normalised && a.normalised !== response) {
    const b = assessSubmission(c, { response: a.normalised, working, clarifications, legacyCorrect: legacy(a.normalised) });
    if (b.evidence.source !== "disagreement") return { ...b, recordAs: a.normalised };
  }
  if (a.credit !== null && a.normalised && a.normalised !== response && canonical(q, response) === null && canonical(q, a.normalised) !== null) return { ...a, recordAs: a.normalised };
  return a;
}
/** The credit this response earns: true, false, or null (undecided / marked by a teacher). Deterministic, so the replay of stored records agrees with the decision made at submission. */
export const creditOf = (qid: string, response: string): boolean | null => (quarantined(qid) ? null : needsMarking(question(qid)) ? isCorrect(question(qid), response) : decide(qid, response).credit);
