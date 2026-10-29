/** THE one grading decision. Every screen, record builder and replay asks this function; nothing else compares a response with a stored answer.
 *  Kernel where the family has one, otherwise the stored answer labelled "legacy"; an answer the comparison cannot read is undecided (null), never wrong. */
import { assessSubmission, contractFor, legacyContract, type Assessment, type AssessmentContract } from "./assessment.ts";
import { canonical, isCorrect, needsMarking, question } from "./content";
import { quarantined } from "./question-status";
import { notAnAnswer, readResponse } from "./grading/read.ts";

const contracts = new Map<string, AssessmentContract>();
const contractOf = (qid: string) => { let c = contracts.get(qid); if (!c) { c = contractFor(qid) ?? legacyContract(question(qid)); contracts.set(qid, c); } return c; };
/** THE authoritative decision for one submission: the answer field first (kernel where the family has one, otherwise the stored answer), working only when the answer is not correct. Every attempt record carries its result. */
export function decide(qid: string, response: string, working: readonly string[] = [], clarifications = 0): Assessment {
  // question-status@1: a quarantined question receives no verdict from any route (the response is kept, nothing is decided)
  if (quarantined(qid)) return assessSubmission(null, { response, working, clarifications });
  const q = question(qid);
  // grading-policy@1: the strict parser reads the response first; nothing that is not an answer reaches a comparison or a kernel
  const raw = response;
  let formOk = true;
  let value = response;
  if (q.type !== "written") {
    const rd = readResponse({ type: q.type, answer: q.answer, options: q.options }, response, contractOf(qid).variable);
    if (!rd.ok) return notAnAnswer(rd, clarifications);
    response = rd.canonical;
    value = rd.value;
    if (q.expanded) formOk = rd.parse.notation.expanded;
  }
  // an answer the comparison cannot read is undecided, never wrong; a written form requirement (form@1 "expanded") is judged on what the learner wrote, not on the parser's plain form
  const c = contractOf(qid), legacy = (r: string) => (q.type === "written" || canonical(q, r) === null ? null : formOk && isCorrect({ ...q, expanded: undefined }, r));
  const a = assessSubmission(c, { response: value, working, clarifications, legacyCorrect: legacy(response) });
  // mathematically decided in a form the stored-answer comparison cannot read ("x = 2, x = 3", "x = 4"): decide on the plain form and record that, so the replay and the server (which reads only the plain form) agree
  if (a.evidence.source === "disagreement" && a.normalised && a.normalised !== response) {
    const b = assessSubmission(c, { response: a.normalised, working, clarifications, legacyCorrect: legacy(a.normalised) });
    if (b.evidence.source !== "disagreement") return { ...b, recordAs: a.normalised };
  }
  if (a.credit !== null && a.normalised && a.normalised !== response && canonical(q, response) === null && canonical(q, a.normalised) !== null) return { ...a, recordAs: a.normalised };
  // the learner's text is kept as written unless the stored-answer comparison cannot read it but can read the parser's plain form
  if (a.credit !== null && response !== raw && canonical(q, raw) === null && canonical(q, response) !== null) return { ...a, recordAs: response };
  return a;
}
/** The credit this response earns: true, false, or null (undecided / marked by a teacher). Deterministic, so the replay of stored records agrees with the decision made at submission. */
export const creditOf = (qid: string, response: string): boolean | null => (quarantined(qid) ? null : needsMarking(question(qid)) ? isCorrect(question(qid), response) : decide(qid, response).credit);
