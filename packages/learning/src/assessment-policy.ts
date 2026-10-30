/**
 * Assessment-specific grading policy (finalisation). Three separate dimensions:
 *   1. mathematical validity  — from the engine's classification; never changed by a rubric;
 *   2. completeness of the answer;
 *   3. evidence of reasoning   — process findings (an unstated but implied restriction, a candidate dropped without a written check,
 *                                a wrong cited rule, no derivation at all).
 * The assessment mode and rubric decide how the three combine into credit. A process finding is never turned into "invalid"; domain validity
 * is always enforced by the engine (a result that violates the domain is invalid or missing-assumption whatever the rubric says).
 *
 *   answer-only     the engine independently verifies the submitted final answer (answer-first); working and shown checks are not required.
 *   method-required every written transformation must be valid; omissions cost process credit only where the rubric requires them.
 *   proof-required  the student must demonstrate the reasoning: the engine proving the conclusion is not the student demonstrating it, so a
 *                   bare answer and an engine-proved but unshown candidate elimination are insufficient evidence.
 * No new grading architecture: this reads the existing envelopes (unified engine, answer-first, independent checker).
 */
import { assessAnswerFirst } from "./answer-first.ts";
import { checkAlgebraSubmission } from "./independent-checker.ts";
import { expandEquivalenceRows, parseNaturalWorking, withNotationConventions, type NotationConventions } from "./natural-working.ts";
import { assessMathematicalWorking, type AssessmentEnvelope, type AssessOptions, type ProcessFinding } from "./unified-math-engine.ts";

/** distinct from the unified grading decision's "grading-policy@1" (feat/unified-grading grading/decision.ts): this is the E7 process-evidence policy it can consume */
export const E7_PROCESS_POLICY_CONTRACT = "openpath-e7-process-policy@1" as const;
import type { AssessmentMode } from "./assessment.ts";
export type { AssessmentMode };
export interface GradingRubric {
  mode: AssessmentMode;
  /** process credit requires the excluded values the problem implies to be stated */
  requireStatedRestrictions?: boolean;
  /** process credit requires a written check of every candidate that is discarded (extraneous or excluded) */
  requireShownCandidateChecks?: boolean;
  /** process credit is reduced when a cited rule cannot produce the step (the step itself may still be correct) */
  deductForWrongCitation?: boolean;
  /** notation conventions of the assessment or curriculum (the question's own take precedence) */
  conventions?: NotationConventions;
}
export type Credit = "full" | "partial" | "none" | "unresolved";
export interface PolicyGrade {
  contract: typeof E7_PROCESS_POLICY_CONTRACT;
  mode: AssessmentMode;
  mathematicalValidity: "valid" | "invalid" | "undetermined";
  completeness: "complete" | "incomplete" | "undetermined";
  evidence: "sufficient" | "insufficient" | "not-assessed";
  findings: ProcessFinding[];
  /** the findings that cost process credit under this mode and rubric */
  deductions: ProcessFinding["kind"][];
  credit: Credit;
  reason: string;
}

const UNRESOLVED = new Set(["unsupported", "malformed", "ambiguous", "resource-exhausted", "contradictory"]);

/** process findings of a natural algebra working, read from the independent checker's own line record (the same evidence the engine used) */
export function algebraProcessFindings(statement: string, text: string, conventions?: NotationConventions): ProcessFinding[] {
  const parsed = parseNaturalWorking({ format: "natural", text: expandEquivalenceRows(text), conventions });
  if (parsed.classification !== "parsed") return [];
  let check; try { check = withNotationConventions(conventions, () => checkAlgebraSubmission(statement, parsed)); } catch { return []; }
  const out: ProcessFinding[] = [];
  const stated = parsed.lines.some((l) => (l.relation.kind === "inequality" && l.relation.operator === "!=") || (l.restrictions ?? []).length > 0);
  const restrictions = (check as { restrictions?: string[] }).restrictions ?? [];
  if (restrictions.length && !stated) out.push({ kind: "restriction-not-stated", line: null, detail: `the working never states the excluded value(s) ${restrictions.join(", ")}` });
  const writtenCheck = parsed.lines.some((l, i) => check.lines[i]?.relation === "independent-true" || check.lines[i]?.relation === "independent-false");
  // values the student excluded in writing (x != a): dropping exactly those candidates is shown reasoning, not an unshown check
  const excludedInWriting = new Set<string>(); for (const l of parsed.lines) for (const r of [l.relation, ...(l.restrictions ?? [])]) if (r.kind === "inequality" && r.operator === "!=") { const t = l.source.text.split(",").map((z) => z.trim()).find((z) => /!=|≠/.test(z)); const m = t ? /(?:!=|≠)\s*(.+)$/.exec(t) : null; if (m) excludedInWriting.add(m[1].replace(/\s+/g, "")); }
  const dropped = (detail: string): string[] | null => { const m = /\(\{([^}]*)\} became (?:\{([^}]*)\}|no real solutions)\)/.exec(detail); if (!m) return null; const after = new Set((m[2] ?? "").split(",").map((z) => z.trim().replace(/\s+/g, "")).filter(Boolean)); return m[1].split(",").map((z) => z.trim().replace(/\s+/g, "")).filter((z) => z && !after.has(z)); };
  for (const l of check.lines) if (l.status === "verified-valid" && l.relation === "narrowing" && /^eliminates candidates/.test(l.detail) && !writtenCheck) {
    const d = dropped(l.detail); if (d && d.length && d.every((z) => excludedInWriting.has(z))) continue;
    out.push({ kind: "candidate-check-not-shown", line: l.index + 1, detail: `${l.detail}; the student does not show this check` });
  }
  return out;
}

/** combine an engine verdict, its findings and the rubric into credit */
export function gradeEnvelope(env: Pick<AssessmentEnvelope, "classification" | "steps" | "processFindings" | "justification">, rubric: GradingRubric, extraFindings: ProcessFinding[] = []): PolicyGrade {
  const findings = [...(env.processFindings ?? []), ...extraFindings];
  if (rubric.mode === "proof-required" && env.classification === "verified" && (env.steps?.length ?? 0) <= 1) findings.push({ kind: "no-derivation-shown", line: null, detail: "only the conclusion is written; the reasoning that establishes it is not shown" });
  const c = env.classification;
  const validity = c === "invalid" ? "invalid" : c === "verified" || c === "incomplete" || c === "missing-assumption" ? "valid" : "undetermined";
  const completeness = c === "verified" ? "complete" : c === "incomplete" || c === "missing-assumption" ? "incomplete" : "undetermined";
  const deducted = new Set<ProcessFinding["kind"]>();
  for (const f of findings) {
    if (rubric.mode === "answer-only") continue;
    if (f.kind === "restriction-not-stated" && rubric.requireStatedRestrictions) deducted.add(f.kind);
    if (f.kind === "candidate-check-not-shown" && (rubric.requireShownCandidateChecks || rubric.mode === "proof-required")) deducted.add(f.kind);
    if (f.kind === "cited-rule-contradicted" && rubric.deductForWrongCitation) deducted.add(f.kind);
    if (f.kind === "no-derivation-shown" && rubric.mode === "proof-required") deducted.add(f.kind);
  }
  const deductions = [...deducted];
  const evidence = rubric.mode === "answer-only" ? "not-assessed" : deductions.length ? "insufficient" : "sufficient";
  const base = { contract: E7_PROCESS_POLICY_CONTRACT, mode: rubric.mode, mathematicalValidity: validity, completeness, evidence, findings, deductions } as const;
  if (UNRESOLVED.has(c)) return { ...base, credit: "unresolved", reason: `the engine could not decide the work (${c}): ${env.justification}` };
  if (c === "invalid") return { ...base, credit: "none", reason: `mathematically invalid: ${env.justification}` };
  if (c === "incomplete" || c === "missing-assumption") return { ...base, credit: "partial", reason: `valid but ${c === "incomplete" ? "incomplete" : "missing a required domain condition"}: ${env.justification}` };
  if (deductions.length) return { ...base, credit: "partial", reason: `mathematically correct and complete; process credit reduced for: ${deductions.join(", ")}` };
  return { ...base, credit: "full", reason: rubric.mode === "answer-only" ? "the final answer is independently verified" : "every written step is valid and the answer is complete" };
}

/**
 * One call for an algebra/calculus submission under an assessment rubric. Answer-only algebra statements are graded by answer-first
 * (the final answer is independently verified; the working is not required); every other case by the unified engine.
 */
export async function assessWithPolicy(problem: { domain: string; statement?: string; conventions?: NotationConventions } & Record<string, unknown>, working: { format: "natural" | "latex"; text: string }, rubric: GradingRubric, options: AssessOptions = {}): Promise<{ grade: PolicyGrade; envelope: AssessmentEnvelope | null }> {
  const conventions = { ...(rubric.conventions ?? {}), ...(options.conventions ?? {}) };
  if (rubric.mode === "answer-only" && problem.domain === "algebra" && typeof problem.statement === "string") {
    const af = assessAnswerFirst(problem, working, { diagnose: false, conventions });
    if ((af.answer.status as string) !== "unsupported") {
      const cls: AssessmentEnvelope["classification"] = af.answer.status === "correct" ? "verified" : af.answer.status === "incomplete" ? "incomplete" : af.answer.status === "incorrect" ? "invalid" : "unsupported";
      return { grade: gradeEnvelope({ classification: cls, steps: [], justification: af.answer.reason }, rubric), envelope: null };
    }
  }
  const envelope = await assessMathematicalWorking(problem as never, working, { ...options, conventions });
  const extra = problem.domain === "algebra" && typeof problem.statement === "string" && envelope.classification === "verified" ? algebraProcessFindings(problem.statement, working.text, { ...conventions, ...(problem.conventions ?? {}) }) : [];
  // an expression simplification whose final line is defined where the problem was not, with that restriction unstated (the symbolic core's domain report)
  if (envelope.classification === "verified" && /restriction is not stated/.test(envelope.justification) && !extra.some((f) => f.kind === "restriction-not-stated"))
    extra.push({ kind: "restriction-not-stated", line: null, detail: `the final line is defined at ${envelope.outstandingObligations.length ? `x = ${envelope.outstandingObligations.join(", ")}` : "values"} where the problem was not, and the working does not state the restriction` });
  return { grade: gradeEnvelope(envelope, rubric, extra), envelope };
}
