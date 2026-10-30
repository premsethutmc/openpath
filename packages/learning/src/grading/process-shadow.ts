/**
 * E7 process policy (openpath-e7-process-policy@1) in SHADOW beside the authoritative grading decision (grading-policy@1).
 *
 * The authoritative decision is never read for writing and never changed: this module only derives what the process policy WOULD record
 * and compares it with the decision, so the comparison can be reviewed before the process policy is allowed to influence anything.
 *
 * Mapping into grading-decision@1, whose verdict is binary on the answer (correct / incorrect / unresolved / pending-educator):
 *   mathematically invalid, or wrong final answer       -> verdict incorrect; method { examined, verified: false }
 *   incomplete answer (solutions missing)               -> verdict incorrect (the contract has no partial verdict; partial credit is kept
 *                                                          in the shadow record); method verified: false
 *   correct and complete, process findings deducted     -> verdict correct (the answer is right); method verified: false;
 *                                                          the deduction is process credit only
 *   correct and complete, no deductions                 -> verdict correct; method verified: true when the mode examines the method
 *   engine undecided (unsupported/ambiguous/malformed)  -> verdict unresolved: never costs credit, mastery or an attempt
 *   answer-only mode                                    -> method { examined: false, verified: false } (the method is not assessed)
 */
import type { GradingDecision, Verdict } from "./decision.ts";
import type { PolicyGrade } from "../assessment-policy.ts";

export const PROCESS_SHADOW_SCHEMA = "e7-process-shadow@1" as const;
export type ShadowAgreement = "agree" | "process-unresolved" | "process-decided" | "conflict";
export interface ProcessShadowRecord {
  schema: typeof PROCESS_SHADOW_SCHEMA;
  questionId: string;
  /** the authoritative decision's own fields, copied for the comparison */
  authoritative: { verdict: Verdict; reason: GradingDecision["reason"]; method: GradingDecision["method"] };
  /** what the process policy implies in the decision contract's vocabulary */
  implied: { verdict: Verdict; method: GradingDecision["method"] };
  /** advisory projection for future learner-facing feedback; never an input to credit, mastery or records */
  projection: LearnerProjection;
  process: Pick<PolicyGrade, "contract" | "mode" | "mathematicalValidity" | "completeness" | "evidence" | "credit" | "deductions"> & { findings: { kind: string; line: number | null }[] };
  agreement: ShadowAgreement;
  note: string;
}

/**
 * Future learner-facing projection (advisory; nothing reads it for credit). The binary decision contract records an incomplete answer and a
 * wrong one alike as "incorrect"; the projection keeps them apart so feedback can say "keep going: solutions are missing" instead of "wrong".
 */
export type LearnerProjection = "correct" | "correct-process-feedback" | "incomplete" | "incorrect" | "unresolved";
export function learnerProjection(g: PolicyGrade): LearnerProjection {
  if (g.credit === "unresolved") return "unresolved";
  if (g.mathematicalValidity === "invalid" || g.credit === "none") return "incorrect";
  if (g.completeness === "incomplete") return "incomplete";
  return g.deductions.length ? "correct-process-feedback" : "correct";
}
export function impliedVerdict(g: PolicyGrade): Verdict {
  if (g.credit === "unresolved") return "unresolved";
  if (g.mathematicalValidity === "invalid" || g.credit === "none") return "incorrect";
  if (g.completeness === "incomplete") return "incorrect";
  return "correct"; // full, or partial for process evidence only
}
export function impliedMethod(g: PolicyGrade): GradingDecision["method"] {
  if (g.mode === "answer-only" || g.credit === "unresolved") return { examined: false, verified: false };
  return { examined: true, verified: g.credit === "full" };
}

/** the shadow record for one submission; `decision` is read only */
export function shadowProcessRecord(decision: Readonly<GradingDecision>, g: PolicyGrade): ProcessShadowRecord {
  const implied = { verdict: impliedVerdict(g), method: impliedMethod(g) };
  const auth = decision.verdict;
  const agreement: ShadowAgreement = implied.verdict === auth ? "agree"
    : implied.verdict === "unresolved" ? "process-unresolved"
    : auth === "unresolved" || auth === "pending-educator" ? "process-decided"
    : "conflict";
  const note = agreement === "agree" ? (g.deductions.length ? `same verdict; process credit reduced for ${g.deductions.join(", ")}` : "same verdict")
    : agreement === "process-unresolved" ? "the process policy could not decide; the authoritative decision stands"
    : agreement === "process-decided" ? `the authoritative decision is ${auth}; the process policy decided ${implied.verdict} (review only)`
    : `CONFLICT: authoritative ${auth}, process policy implies ${implied.verdict} (${g.reason})`;
  return {
    schema: PROCESS_SHADOW_SCHEMA, questionId: decision.questionId,
    authoritative: { verdict: auth, reason: decision.reason, method: { ...decision.method } },
    implied, projection: learnerProjection(g),
    process: { contract: g.contract, mode: g.mode, mathematicalValidity: g.mathematicalValidity, completeness: g.completeness, evidence: g.evidence, credit: g.credit, deductions: [...g.deductions], findings: g.findings.map((f) => ({ kind: f.kind, line: f.line })) },
    agreement, note,
  };
}
