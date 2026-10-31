/**
 * THE grading decision (grading-policy@1, UNIFIED_GRADING_ARCHITECTURE.md §5, §7). One function for every route: the app's preview
 * (grade.ts decide) and the trusted server grader (server-grader.ts, run by Django) call it with the same inputs and get the same result.
 *
 *   1 quarantined question           -> unresolved.quarantined
 *   2 contract inconsistency         -> unresolved.contract-inconsistency
 *   3 written answer                 -> pending-educator
 *   4 strict parse                   -> unresolved.invalid-response / unresolved.ambiguous
 *   5 verifier: the independent kernel ALONE where it validated the contract; otherwise the least complex value verifier for the
 *     answer semantics (grading/verify.ts). Nothing else's opinion is an input (no "legacy" comparison feeds a kernel decision).
 *   6 required forms (grading/contract.ts applyForms)
 * Verdicts: correct / incorrect / unresolved (with a reason) / pending-educator. Unresolved never costs credit, mastery or an attempt.
 */
import { assessSubmission, ASSESSMENT_CONTRACT, ASSESSMENT_POLICY, contractFor, legacyContract, type Assessment, type AssessmentContract } from "../assessment.ts";
import { question } from "../content.ts";
import { quarantined } from "../question-status.ts";
import { applyForms, contractV2, type ContractV2 } from "./contract.ts";
import { PARSER_VERSION } from "./parse.ts";
import { notAnAnswer, readResponse } from "./read.ts";
import { compareValues, type Verifier } from "./verify.ts";
import { certified, CERTIFICATIONS_HASH } from "./certify.ts";
import { assessWorking, type WorkingAssessment } from "./working.ts";

export const GRADING_POLICY = "grading-policy@1" as const;
export type Verdict = "correct" | "incorrect" | "unresolved" | "pending-educator";
export type ReasonCode =
  | "correct.equal" | "incorrect.value" | "incorrect.required-form"
  | "unresolved.invalid-response" | "unresolved.ambiguous" | "unresolved.unsupported" | "unresolved.form-undeterminable"
  | "unresolved.infrastructure" | "unresolved.contract-inconsistency" | "unresolved.quarantined" | "pending-educator";

export interface GradingDecision {
  schema: "grading-decision@1";
  policy: typeof GRADING_POLICY;
  questionId: string;
  contract: { schema: string; hash: string; status: ContractV2["status"]; keyAuthority: ContractV2["keyAuthority"] } | null;
  parser: typeof PARSER_VERSION;
  verifier: string | null;
  /** decision 1 (2026-10-29): true only under a certification for this semantics and family (grading/certify, stage 5); otherwise provisional */
  certified: boolean;
  /** hash of the certification registry the decision was made under */
  certifications: string;
  verdict: Verdict;
  reason: ReasonCode;
  response: { raw: string; working: string[] };
  interpretation: { canonical: string; value: string } | { readings: [string, string] } | null;
  form: Assessment["form"] | null;
  method: { examined: boolean; verified: boolean };
  diagnosis: Assessment["evidence"]["firstError"];
  /** working-assessment@1 (D1): the derivation authority's judgement of the submitted working, kept apart from the verdict above (which it never
   *  changes). Present for questions with a task statement (and for any submission with working); absent otherwise. */
  working?: WorkingAssessment;
}

const contractsV1 = new Map<string, AssessmentContract>();
const v1Of = (qid: string) => { let c = contractsV1.get(qid); if (!c) { c = contractFor(qid) ?? legacyContract(question(qid)); contractsV1.set(qid, c); } return c; };

function decision(qid: string, c: ContractV2 | null, raw: string, working: readonly string[], verdict: Verdict, reason: ReasonCode, extra: Partial<GradingDecision> = {}): GradingDecision {
  return { schema: "grading-decision@1", policy: GRADING_POLICY, questionId: qid, contract: c && { schema: c.schema, hash: c.contractHash, status: c.status, keyAuthority: c.keyAuthority }, parser: PARSER_VERSION, verifier: null, certified: false, certifications: CERTIFICATIONS_HASH, verdict, reason, response: { raw, working: [...working] }, interpretation: null, form: null, method: { examined: false, verified: false }, diagnosis: null, ...extra };
}
const verdictOf = (credit: boolean | null): Verdict => (credit === true ? "correct" : credit === false ? "incorrect" : "unresolved");

/** the decision and the assessment@1 evidence the app records with it (the record format is unchanged until decision records, stage 7).
 *  D1: the working is then judged by the derivation authority (grading/working.ts) and attached beside the verdict; a held, quarantined or
 *  educator-marked decision gets none (nothing is concluded about working the grader did not decide on). */
export function grade(qid: string, raw: string, working: readonly string[] = [], clarifications = 0): { decision: GradingDecision; assessment: Assessment } {
  const g = gradeAnswer(qid, raw, working, clarifications);
  const d = g.decision;
  if (d.reason === "unresolved.quarantined" || d.reason === "unresolved.contract-inconsistency" || d.reason === "pending-educator") return g;
  const value = d.interpretation && "value" in d.interpretation ? d.interpretation.value : null;
  const w = assessWorking(qid, working, d.verdict, value);
  return w ? { ...g, decision: { ...d, working: w } } : g;
}
function gradeAnswer(qid: string, raw: string, working: readonly string[] = [], clarifications = 0): { decision: GradingDecision; assessment: Assessment } {
  if (quarantined(qid)) {
    const a = assessSubmission(null, { response: raw, working, clarifications });
    return { decision: decision(qid, null, raw, working, "unresolved", "unresolved.quarantined"), assessment: a };
  }
  const q = question(qid), c = contractV2(qid);
  if (q.type === "written") {
    const a = assessSubmission(legacyContract(q), { response: raw, working, clarifications });
    return { decision: decision(qid, c, raw, working, "pending-educator", "pending-educator"), assessment: a };
  }
  if (c.inconsistencies.length) {
    const a = assessSubmission(null, { response: raw, working, clarifications });
    return { decision: decision(qid, c, raw, working, "unresolved", "unresolved.contract-inconsistency"), assessment: a };
  }
  const rd = readResponse({ type: q.type, answer: q.answer, options: q.options }, raw, c.semantics.variable ?? null, c.semantics);
  if (!rd.ok) {
    const a = notAnAnswer(rd, clarifications);
    const reason: ReasonCode = rd.parse.status === "ambiguous" ? "unresolved.ambiguous" : "unresolved.invalid-response";
    return { decision: decision(qid, c, raw, working, "unresolved", reason, { interpretation: rd.parse.status === "ambiguous" ? { readings: rd.parse.readings } : null }), assessment: a };
  }
  const interpretation = { canonical: rd.canonical, value: rd.value };
  const v1 = v1Of(qid);
  let a: Assessment, verifier: Verifier | { id: string; version: string };
  if (v1.verification === "verified") {
    // the independent kernel decides alone (no stored-answer opinion is passed in: D10)
    a = { ...assessSubmission(v1, { response: rd.value, working, clarifications, legacyCorrect: null }), normalised: rd.canonical, recordAs: undefined };
    verifier = { id: `kernel:${v1.capability}`, version: "1" };
  } else {
    const eq = compareValues(c.semantics.kind, interpretation, { canonical: c.expected.canonical!, value: c.expected.value! });
    verifier = eq.verifier;
    const credit = eq.eq === "equal" ? true : eq.eq === "different" ? false : null;
    a = {
      contract: ASSESSMENT_CONTRACT, credit, normalised: rd.canonical, fallbackEligible: false, clarification: null, ms: 0,
      evidence: { policy: ASSESSMENT_POLICY, answerCorrect: credit, methodExamined: false, derivationVerified: false, firstError: null, clarificationRequired: false, aiFallbackUsed: false, unresolved: credit === null, source: "verifier" },
      feedback: credit === true ? { kind: "correct", message: "Correct." } : credit === false ? { kind: "incorrect", message: "Not quite." } : { kind: "pending", message: "This answer could not be checked automatically. It is saved and has not been marked wrong." },
    };
  }
  a = applyForms(c, rd.parse, a);
  const reason: ReasonCode = a.credit === true ? "correct.equal" : a.credit === false ? (a.form?.result === "violated" ? "incorrect.required-form" : "incorrect.value") : a.form?.result === "undeterminable" ? "unresolved.form-undeterminable" : "unresolved.unsupported";
  return {
    decision: decision(qid, c, raw, working, verdictOf(a.credit), reason, { verifier: `${verifier.id}@${verifier.version}`, certified: certified(qid, `${verifier.id}@${verifier.version}`), certifications: CERTIFICATIONS_HASH, interpretation, form: a.form ?? null, method: { examined: a.evidence.methodExamined, verified: a.evidence.derivationVerified }, diagnosis: a.evidence.firstError }),
    assessment: a,
  };
}
