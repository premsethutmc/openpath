/** THE one grading decision. Every screen, record builder and replay asks this function; nothing else compares a response with a stored answer.
 *  Kernel where the family has one, otherwise the stored answer labelled "legacy"; an answer the comparison cannot read is undecided (null), never wrong. */
import { assessSubmission, contractFor, legacyContract, type Assessment, type AssessmentContract } from "./assessment.ts";
import { canonical, isCorrect, needsMarking, question } from "./content";
import { quarantined } from "./question-status";
import { notAnAnswer, readResponse } from "./grading/read.ts";
import { applyForms, contractV2 } from "./grading/contract.ts";

const contracts = new Map<string, AssessmentContract>();
const contractOf = (qid: string) => { let c = contracts.get(qid); if (!c) { c = contractFor(qid) ?? legacyContract(question(qid)); contracts.set(qid, c); } return c; };
/** THE authoritative decision for one submission: the answer field first (kernel where the family has one, otherwise the stored answer), working only when the answer is not correct. Every attempt record carries its result. */
export function decide(qid: string, response: string, working: readonly string[] = [], clarifications = 0): Assessment {
  // question-status@1: a quarantined question receives no verdict from any route (the response is kept, nothing is decided)
  if (quarantined(qid)) return assessSubmission(null, { response, working, clarifications });
  const q = question(qid);
  // grading-policy@1: the strict parser reads the response first; nothing that is not an answer reaches a comparison or a kernel
  const raw = response;
  let value = response;
  const v2 = contractV2(qid);
  let parsed: Extract<ReturnType<typeof readResponse>, { ok: true }>["parse"] | null = null;
  if (q.type !== "written") {
    const rd = readResponse({ type: q.type, answer: q.answer, options: q.options }, response, v2.semantics.variable ?? null, v2.semantics);
    if (!rd.ok) return notAnAnswer(rd, clarifications);
    response = rd.canonical;
    value = rd.value;
    parsed = rd.parse;
  }
  // an answer the comparison cannot read is undecided, never wrong; required forms (form@2, including form@1 "expanded") are judged
  // separately on what the learner wrote (applyForms), so the comparison here is of value only
  const formed = (a: Assessment) => (parsed ? applyForms(v2, parsed, a) : a);
  const c = contractOf(qid), legacy = (r: string) => (q.type === "written" || canonical(q, r) === null ? null : isCorrect({ ...q, expanded: undefined }, r));
  const a = assessSubmission(c, { response: value, working, clarifications, legacyCorrect: legacy(response) });
  // mathematically decided in a form the stored-answer comparison cannot read ("x = 2, x = 3", "x = 4"): decide on the plain form and record that, so the replay and the server (which reads only the plain form) agree
  if (a.evidence.source === "disagreement" && a.normalised && a.normalised !== response) {
    const b = assessSubmission(c, { response: a.normalised, working, clarifications, legacyCorrect: legacy(a.normalised) });
    if (b.evidence.source !== "disagreement") return formed({ ...b, recordAs: a.normalised });
  }
  if (a.credit !== null && a.normalised && a.normalised !== response && canonical(q, response) === null && canonical(q, a.normalised) !== null) return formed({ ...a, recordAs: a.normalised });
  // the learner's text is kept as written unless the stored-answer comparison cannot read it but can read the parser's plain form
  if (a.credit !== null && response !== raw && canonical(q, raw) === null && canonical(q, response) !== null) return formed({ ...a, recordAs: response });
  return formed(a);
}
/** The credit this response earns: true, false, or null (undecided / marked by a teacher). Deterministic, so the replay of stored records agrees with the decision made at submission. */
export const creditOf = (qid: string, response: string): boolean | null => (quarantined(qid) ? null : needsMarking(question(qid)) ? isCorrect(question(qid), response) : decide(qid, response).credit);
