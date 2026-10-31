// Structured outcomes (R1). A refusal is a result, not a crash: every input the reasoner cannot treat exactly ends in one of these codes.
export type OutcomeCode = "PARSE_ERROR" | "UNSUPPORTED_OPERATOR" | "UNSUPPORTED_EXPRESSION" | "DOMAIN_UNRESOLVED" | "PROOF_FAILED" | "SEARCH_LIMIT";
export class Refusal extends Error {
  readonly code: OutcomeCode;
  /** Oracle-compatible reason codes (e.g. "denominator-outside-boundary"), when the refusal comes from the scope gate. */
  readonly reasons: string[];
  constructor(code: OutcomeCode, detail: string, reasons: string[] = []) { super(`${code}: ${detail}`); this.name = "Refusal"; this.code = code; this.reasons = reasons; }
}
