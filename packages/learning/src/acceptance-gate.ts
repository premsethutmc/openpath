/**
 * E3 mandatory acceptance gate (contract openpath-acceptance-gate@1).
 *
 * The gate is the ONLY authority that may let a complete solution through as "verified". Routes and adapters propose a
 * candidate verdict and evidence; this module decides what may be accepted. Rules:
 *   - a natural algebra working is accepted only if the independent exact checker (independent-checker.ts: U4 identities plus
 *     an exact solution-set engine, no math-core, no adapter) also verifies every line and the final conclusion;
 *   - an adapter-converted working is accepted only if every claim-step has independently re-derived binding evidence
 *     (U4 certificate replay on the ORIGINAL source lines, or an independent exact IR evaluation) and every line is verified;
 *   - a structured typed working is accepted only if its domain reasoner (no natural-language adapter in the path) verified
 *     every step; this is recorded as a weaker level and is reported separately from U4/independent-checker coverage;
 *   - an unsupported or inconclusive line, an unresolved obligation or a missing piece of evidence can never become "verified".
 * Disagreement between two independent verifiers is resolved conservatively: nothing is accepted.
 */
import type { AlgebraCheck, CheckerStatus } from "./independent-checker.ts";
import { INDEPENDENT_CHECKER_CONTRACT, CHECKER_SCOPE } from "./independent-checker.ts";
import { claimIdentity } from "./evidence-binding.ts";

export const ACCEPTANCE_GATE_CONTRACT = "openpath-acceptance-gate@1" as const;
export type GateRoute = "algebra-text" | "adapter-converted" | "structured-typed" | "natural-other";
export type GateLevel = "u4-kernel" | "independent-exact-checker" | "claim-recheck+destination-reasoner" | "domain-reasoner" | "none";
export type GateSource = "agreement" | "checker-authority" | "downgraded-no-independent-evidence" | "downgraded-unresolved-lines" | "conflict" | "candidate-unchanged";
export interface GateEvidenceItem { line: number | null; claim: string; checker: string; scope: string; outcome: string; digest?: string | null; /** E7 repair A: identity of the exact claim the checker established, and the digest of the task premises it was produced under (stamped by the route that holds the context) */ claimIdentity?: string | null; premises?: string | null }
export interface BindingEvidence { lineId: string; line: number; claim: string; checker: "u4-kernel" | "independent-ir-evaluator" | "independent-polynomial-identity" | "e5-independent-geocalc" | "e6-independent-exact"; destination: string; scope: string; outcome: "verified" | "mismatch" | "not-covered"; detail: string; digest?: string | null; /** E7: why the verified claim is about the task (premises, derived facts, student assumptions) */ grounding?: import("./claim-grounding.ts").Grounding }
export interface AcceptanceGateRecord {
  contract: typeof ACCEPTANCE_GATE_CONTRACT; route: GateRoute; candidateClassification: string; verdict: string;
  independentlyVerified: boolean; level: GateLevel; source: GateSource; evidence: GateEvidenceItem[]; obligations: string[]; reconciliation: string;
  checker: { contract: string; scope: string; mode: string; outcome: string; completenessAuthority: string; u4Steps: number; exactSteps: number } | null;
}
export const checkerStatusToStep = (s: CheckerStatus): "verified" | "invalid" | "incomplete" | "unsupported" | "resource-exhausted" | null =>
  s === "verified-valid" ? "verified" : s === "verified-invalid" ? "invalid" : s === "incomplete" ? "incomplete" : s === "resource-exhausted" ? "resource-exhausted" : s === "unsupported" ? "unsupported" : null;

export interface Reconciliation { classification: string; adoptChecker: boolean; source: GateSource; why: string }
/** Decide the final classification of an algebra text working from the candidate (math-core) verdict and the independent check. */
export function reconcileAlgebra(candidate: string, check: AlgebraCheck): Reconciliation {
  const abstains = check.outcome === "unsupported" || check.outcome === "resource-exhausted";
  const refutes = check.outcome === "invalid" || check.outcome === "incomplete" || check.outcome === "missing-assumption";
  if (check.completenessAuthority === "native") {
    // numeric / identity problems: the checker vouches for step equivalence only; the native engine keeps authority over the final form
    if (abstains) return candidate === "verified" ? { classification: "unsupported", adoptChecker: false, source: "downgraded-no-independent-evidence", why: "the independent checker could not verify this working, so it cannot be accepted" } : { classification: candidate, adoptChecker: false, source: "candidate-unchanged", why: "the candidate did not accept and the checker has no contrary finding" };
    if (check.outcome === "invalid") return { classification: "invalid", adoptChecker: true, source: candidate === "invalid" ? "agreement" : "checker-authority", why: "the independent checker refuted a step exactly" };
    return candidate === "verified" ? { classification: "verified", adoptChecker: false, source: "agreement", why: "the native engine and the independent checker agree" } : { classification: candidate, adoptChecker: false, source: "candidate-unchanged", why: "the checker verifies step equivalence but cannot judge the final form; the native verdict stands" };
  }
  if (abstains) return candidate === "verified" ? { classification: "unsupported", adoptChecker: false, source: "downgraded-no-independent-evidence", why: "no independent verification is available for this working, so the candidate acceptance is withdrawn" } : { classification: candidate, adoptChecker: false, source: "candidate-unchanged", why: "the candidate did not accept and the checker has no contrary finding" };
  if (refutes) return { classification: check.outcome, adoptChecker: true, source: candidate === check.outcome ? "agreement" : "checker-authority", why: candidate === "verified" ? "the independent checker refutes the candidate acceptance" : "the independent checker's exact finding is adopted" };
  // checker verified
  if (candidate === "verified") return { classification: "verified", adoptChecker: false, source: "agreement", why: "the native engine and the independent checker both verify every line" };
  if (candidate === "unsupported" || candidate === "resource-exhausted") return { classification: "verified", adoptChecker: true, source: "checker-authority", why: "the independent checker verifies every line and the conclusion exactly" };
  if (candidate === "incomplete") return { classification: "incomplete", adoptChecker: false, source: "candidate-unchanged", why: "the native engine requires more (for example a stricter final form); the stricter verdict stands" };
  return { classification: "unsupported", adoptChecker: false, source: "conflict", why: `the native engine says ${candidate} but the independent checker verifies the working; neither is accepted` };
}

/** `lineTexts[i]` is the submitted text of checked line i: the evidence is bound to that claim text (not to the relation label the checker computed about it) */
/** sourceLines: the student's own line number of each parsed line (several statements may share one line, e.g. "A ⇔ B"; blank lines are skipped) */
export function evidenceFromCheck(check: AlgebraCheck, lineTexts?: string[], sourceLines?: number[]): GateEvidenceItem[] {
  return check.lines.filter((l) => l.evidence).map((l) => ({
    line: sourceLines?.[l.index] ?? l.index + 1, claim: lineTexts?.[l.index] ?? l.relation, checker: l.evidence!.checker, scope: `${CHECKER_SCOPE}; relation to the previous line: ${l.relation}`, outcome: l.status,
    digest: l.evidence!.u4?.digest ?? null, claimIdentity: lineTexts?.[l.index] !== undefined ? claimIdentity(lineTexts[l.index]) : null,
  }));
}
export function checkerSummary(check: AlgebraCheck): AcceptanceGateRecord["checker"] {
  return { contract: INDEPENDENT_CHECKER_CONTRACT, scope: CHECKER_SCOPE, mode: check.mode, outcome: check.outcome, completenessAuthority: check.completenessAuthority, u4Steps: check.u4Steps, exactSteps: check.exactSteps };
}
