/** Unified mathematics assessment U1. Thin dispatch only; native engines remain authoritative. */
import { assessWorking, type WorkingOptions } from "./core/working-assessment.ts";

export const UNIFIED_MATH_CONTRACT = "openpath-unified-math-assessment@1" as const;
export type Classification = "verified" | "invalid" | "incomplete" | "missing-assumption" | "unsupported" | "contradictory" | "resource-exhausted" | "malformed" | "ambiguous";
export interface TextProblem { domain?: "auto" | "arithmetic" | "algebra"; statement: string }
export interface GeometryProblem { domain: "geometry"; problem: Record<string, unknown> }
export interface AngleSumHandoff { kind: "triangle-angle-sum"; unknown: string; total: number; knownAngles: number[] }
export interface MixedProblem { domain: "mixed"; geometry: GeometryProblem; handoff: AngleSumHandoff }
export type MathematicalProblem = TextProblem | GeometryProblem | MixedProblem;
export type StudentWorking = string[] | { steps: Record<string, unknown>[] } | { geometry: { steps: Record<string, unknown>[] }; calculation: string[] };
export interface AssessOptions extends WorkingOptions { maxRuleApplications?: number; python?: string; geometryRoot?: string }
export interface AssessmentStep { index: number; classification: Classification; justification: string; reasoner: string; dependencies: unknown[] }
export interface AssessmentEnvelope { contractVersion: typeof UNIFIED_MATH_CONTRACT; domain: "arithmetic" | "algebra" | "geometry" | "mixed"; classification: Classification; correct: true | false | null; complete: boolean; firstInvalidStep: number | null; steps: AssessmentStep[]; proofDependencies: unknown[]; domainRestrictions: string[]; outstandingObligations: string[]; skills: string[]; reasoners: { id: string; version: string }[]; justification: string; domainPayload: unknown }
type GeometryNative = { outcome: string; correct: boolean | null; firstInvalidStep: number | null; steps: { index: number; status: string; explanation: string }[]; summary: string; resourceLimit: boolean; geometry: { native_verdicts: string[]; proof_dependencies: unknown[]; mathematical_dependencies: unknown[]; unresolved_obligations: string[]; skill_ids: string[]; resource_limit_reached: boolean } };

const malformed = (domain: AssessmentEnvelope["domain"], why: string): AssessmentEnvelope => ({ contractVersion: UNIFIED_MATH_CONTRACT, domain, classification: "malformed", correct: null, complete: false, firstInvalidStep: null, steps: [], proofDependencies: [], domainRestrictions: [], outstandingObligations: [why], skills: [], reasoners: [{ id: "unified-dispatch", version: "u1" }], justification: why, domainPayload: null });
const mapOutcome = (outcome: string, resource = false): Classification => resource ? "resource-exhausted" : outcome === "verified" ? "verified" : outcome === "invalid" ? "invalid" : outcome === "incomplete" ? "incomplete" : outcome === "ambiguous" ? "ambiguous" : "unsupported";

function textAssessment(problem: TextProblem, lines: string[], options: AssessOptions): AssessmentEnvelope {
  const native = assessWorking(problem.statement, lines, options);
  const domain = native.number ? "arithmetic" : "algebra";
  const specialised = native.number ?? native.symbolic ?? native.multivariate;
  const restrictions = native.symbolic?.domain.original ?? native.multivariate?.domain.original ?? [];
  const outstanding = native.symbolic?.domain.missing ?? native.multivariate?.domain.missing ?? [];
  const skills = specialised?.skills.demonstrated ?? [];
  const steps = native.steps.map((s, i) => ({ index: i, classification: s.status === "invalid" ? "invalid" : s.status === "unsupported" ? "unsupported" : "verified", justification: s.explanation, reasoner: native.number ? "math-core:number" : native.symbolic ? "math-core:symbolic" : native.multivariate ? "math-core:multivariate" : "math-core:equation", dependencies: i ? [i - 1] : ["problem"] } as AssessmentStep));
  return { contractVersion: UNIFIED_MATH_CONTRACT, domain, classification: mapOutcome(native.outcome, !!native.resourceLimit), correct: native.correct, complete: native.outcome === "verified", firstInvalidStep: native.firstInvalidStep === null ? null : native.firstInvalidStep - 1, steps, proofDependencies: steps.map((s) => s.dependencies), domainRestrictions: restrictions, outstandingObligations: outstanding, skills, reasoners: [{ id: native.number ? "math-core:number" : native.symbolic ? "math-core:symbolic" : native.multivariate ? "math-core:multivariate" : "math-core:equation", version: "feat/math-core@93127dd" }], justification: native.summary, domainPayload: native };
}

async function runGeometry(problem: GeometryProblem, steps: Record<string, unknown>[], options: AssessOptions): Promise<GeometryNative> {
  const { spawnSync } = await import("node:child_process");
  const root = options.geometryRoot ?? `${process.cwd()}/research/geometry-reasoner`;
  const request = { domain: "geometry", problem: problem.problem, steps, resource_budget: { max_rule_applications: options.maxRuleApplications ?? 10000 } };
  const proc = spawnSync(options.python ?? "python3", ["-m", "geometry_reasoner.unified_api"], { cwd: root, input: JSON.stringify(request), encoding: "utf8", env: { ...process.env, PYTHONPATH: "." }, timeout: 5000, maxBuffer: 2_000_000 });
  if (proc.error || proc.status !== 0) throw new Error(proc.error?.message ?? proc.stderr ?? "geometry adapter failed");
  return JSON.parse(proc.stdout) as GeometryNative;
}
function geometryEnvelope(native: GeometryNative): AssessmentEnvelope {
  const nv = native.geometry.native_verdicts;
  const contradictory = native.geometry.unresolved_obligations.includes("consistent premises");
  const missing = nv.includes("missing_assumption");
  const classification: Classification = native.resourceLimit ? "resource-exhausted" : contradictory ? "contradictory" : missing ? "missing-assumption" : mapOutcome(native.outcome);
  return { contractVersion: UNIFIED_MATH_CONTRACT, domain: "geometry", classification, correct: classification === "verified" ? true : classification === "invalid" ? false : null, complete: classification === "verified", firstInvalidStep: native.firstInvalidStep, steps: native.steps.map((s) => ({ index: s.index, classification: nv[s.index] === "missing_assumption" ? "missing-assumption" : mapOutcome(nv[s.index] ?? s.status), justification: s.explanation, reasoner: "geometry:synthetic", dependencies: native.geometry.mathematical_dependencies[s.index] ?? [] })), proofDependencies: native.geometry.proof_dependencies, domainRestrictions: [], outstandingObligations: native.geometry.unresolved_obligations, skills: native.geometry.skill_ids, reasoners: [{ id: "geometry:synthetic", version: "g4@d1fb026" }], justification: native.summary, domainPayload: native };
}

export async function assessMathematicalWorking(problem: MathematicalProblem, studentWorking: StudentWorking, options: AssessOptions = {}): Promise<AssessmentEnvelope> {
  if (!problem || typeof problem !== "object" || !("domain" in problem || "statement" in problem)) return malformed("algebra", "problem must be a typed mathematical problem");
  if (problem.domain === "geometry") {
    if (!studentWorking || Array.isArray(studentWorking) || !("steps" in studentWorking) || !Array.isArray(studentWorking.steps)) return malformed("geometry", "geometry working must contain structured steps");
    try { return geometryEnvelope(await runGeometry(problem, studentWorking.steps, options)); } catch { return { ...malformed("geometry", "geometry reasoner failed safely"), classification: "unsupported" }; }
  }
  if (problem.domain === "mixed") {
    if (!studentWorking || Array.isArray(studentWorking) || !("geometry" in studentWorking) || !("calculation" in studentWorking) || !Array.isArray(studentWorking.geometry.steps) || !Array.isArray(studentWorking.calculation)) return malformed("mixed", "mixed working needs geometry steps and calculation lines");
    let g: AssessmentEnvelope; try { g = geometryEnvelope(await runGeometry(problem.geometry, studentWorking.geometry.steps, options)); } catch { return { ...malformed("mixed", "geometry reasoner failed safely"), classification: "unsupported" }; }
    if (g.classification !== "verified") return { ...g, domain: "mixed", complete: false, reasoners: [...g.reasoners, { id: "unified:mixed", version: "u1" }] };
    const h = problem.handoff;
    if (h.kind !== "triangle-angle-sum" || !Number.isFinite(h.total) || !h.knownAngles.every(Number.isFinite)) return malformed("mixed", "invalid typed handoff");
    const equation = `x+${h.knownAngles.join("+")}=${h.total}`;
    const a = textAssessment({ domain: "algebra", statement: equation }, studentWorking.calculation, options);
    const classification = a.classification;
    return { contractVersion: UNIFIED_MATH_CONTRACT, domain: "mixed", classification, correct: classification === "verified" ? true : classification === "invalid" ? false : null, complete: classification === "verified", firstInvalidStep: classification === "invalid" ? g.steps.length + (a.firstInvalidStep ?? 0) : null, steps: [...g.steps, ...a.steps.map((s) => ({ ...s, index: s.index + g.steps.length, dependencies: ["geometry-handoff", ...s.dependencies] }))], proofDependencies: [g.proofDependencies, { kind: h.kind, theorem: "triangle-sum", unknown: h.unknown, equation }, a.proofDependencies], domainRestrictions: a.domainRestrictions, outstandingObligations: [...g.outstandingObligations, ...a.outstandingObligations], skills: [...new Set([...g.skills, ...a.skills])], reasoners: [...g.reasoners, ...a.reasoners, { id: "unified:mixed", version: "u1" }], justification: `${g.justification} ${a.justification}`, domainPayload: { geometry: g.domainPayload, calculation: a.domainPayload, handoff: h } };
  }
  if (!("statement" in problem) || typeof problem.statement !== "string" || !Array.isArray(studentWorking) || !studentWorking.every((x) => typeof x === "string")) return malformed(problem.domain === "arithmetic" ? "arithmetic" : "algebra", "text mathematics needs a statement and text lines");
  return textAssessment(problem, studentWorking, options);
}
