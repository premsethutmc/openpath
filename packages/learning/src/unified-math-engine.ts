/** Unified mathematics assessment U1. Thin dispatch only; native engines remain authoritative. */
import { assessWorking, type WorkingOptions } from "./core/working-assessment.ts";
import { requestGeometryWorker, GeometryTransportError, type GeometryFailureCode } from "./geometry-worker.ts";
import { MATHEMATICAL_OBLIGATION_CONTRACT, constant, statementText, symbol, validateObligation, type MathExpression, type MathematicalObligation, type MathematicalStatement } from "./mathematical-obligations.ts";

export const UNIFIED_MATH_CONTRACT = "openpath-unified-math-assessment@1" as const;
export type Classification = "verified" | "invalid" | "incomplete" | "missing-assumption" | "unsupported" | "contradictory" | "resource-exhausted" | "malformed" | "ambiguous";
export interface TextProblem { domain?: "auto" | "arithmetic" | "algebra"; statement: string }
export interface GeometryProblem { domain: "geometry"; problem: Record<string, unknown> }
export interface AngleSumHandoff { kind: "triangle-angle-sum"; unknown: string; total: number; knownAngles: number[] }
export type TransferFamily = "triangle-angle-sum" | "isosceles-angle" | "similar-triangle-proportion" | "pythagorean" | "parallel-angle";
export interface GeometryQuantityBinding { geometryId: string; quantity: "angle-degrees" | "segment-length"; expression: MathExpression }
export interface CrossDomainTransfer { family: TransferFamily; geometryConclusion: { predicate: string; args: string[]; value?: unknown }; bindings: GeometryQuantityBinding[]; obligation: MathematicalObligation }
export interface MixedProblem { domain: "mixed"; geometry: GeometryProblem; handoff?: AngleSumHandoff; transfer?: CrossDomainTransfer }
export type MathematicalProblem = TextProblem | GeometryProblem | MixedProblem;
export type StudentWorking = string[] | { steps: Record<string, unknown>[] } | { geometry: { steps: Record<string, unknown>[] }; calculation: string[]; domainConclusion?: { symbol: string; value: number } };
export interface AssessOptions extends WorkingOptions { maxRuleApplications?: number; python?: string; geometryRoot?: string; geometryTimeoutMs?: number; geometryWorkerCount?: number; geometryQueueLimit?: number; signal?: AbortSignal }
export interface AssessmentStep { index: number; classification: Classification; justification: string; reasoner: string; dependencies: unknown[] }
export interface AssessmentEnvelope { contractVersion: typeof UNIFIED_MATH_CONTRACT; domain: "arithmetic" | "algebra" | "geometry" | "mixed"; classification: Classification; correct: true | false | null; complete: boolean; firstInvalidStep: number | null; steps: AssessmentStep[]; proofDependencies: unknown[]; domainRestrictions: string[]; outstandingObligations: string[]; skills: string[]; reasoners: { id: string; version: string }[]; justification: string; domainPayload: unknown; failureKind?: "transport" | "mathematical"; infrastructureFailure?: GeometryFailureCode }
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
  const root = options.geometryRoot ?? `${process.cwd()}/research/geometry-reasoner`;
  const request = { domain: "geometry", problem: problem.problem, steps, resource_budget: { max_rule_applications: options.maxRuleApplications ?? 10000 } };
  return await requestGeometryWorker(root, options.python ?? "python3", request, options.geometryTimeoutMs ?? 5000, { workerCount: options.geometryWorkerCount, maxQueue: options.geometryQueueLimit, signal: options.signal }) as GeometryNative;
}
function geometryEnvelope(native: GeometryNative): AssessmentEnvelope {
  const nv = native.geometry.native_verdicts;
  const contradictory = native.geometry.unresolved_obligations.includes("consistent premises");
  const missing = nv.includes("missing_assumption");
  const classification: Classification = native.resourceLimit ? "resource-exhausted" : contradictory ? "contradictory" : missing ? "missing-assumption" : mapOutcome(native.outcome);
  return { contractVersion: UNIFIED_MATH_CONTRACT, domain: "geometry", classification, correct: classification === "verified" ? true : classification === "invalid" ? false : null, complete: classification === "verified", firstInvalidStep: native.firstInvalidStep, steps: native.steps.map((s) => ({ index: s.index, classification: nv[s.index] === "missing_assumption" ? "missing-assumption" : mapOutcome(nv[s.index] ?? s.status), justification: s.explanation, reasoner: "geometry:synthetic", dependencies: native.geometry.mathematical_dependencies[s.index] ?? [] })), proofDependencies: native.geometry.proof_dependencies, domainRestrictions: [], outstandingObligations: native.geometry.unresolved_obligations, skills: native.geometry.skill_ids, reasoners: [{ id: "geometry:synthetic", version: "g4@d1fb026" }], justification: native.summary, domainPayload: native };
}

const factEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function transferPredicate(family: TransferFamily) { return family === "triangle-angle-sum" ? "angle_measure" : family === "isosceles-angle" || family === "parallel-angle" ? "equal_angle" : family === "similar-triangle-proportion" ? "similar" : "length_squared"; }
function transferStatementKind(family: TransferFamily) { return family === "similar-triangle-proportion" ? "proportion" : family === "pythagorean" ? ["pythagorean", "polynomial-equation"] : ["equality", "polynomial-equation"]; }
function hasRestriction(list: MathematicalStatement[], kinds: MathematicalStatement["kind"][]) { return list.some((x) => kinds.includes(x.kind)); }
const expressionEqual = (a: MathExpression, b: MathExpression) => JSON.stringify(a) === JSON.stringify(b);
function binding(transfer: CrossDomainTransfer, id: string, quantity: GeometryQuantityBinding["quantity"]) { return transfer.bindings.find((x) => x.geometryId === id && x.quantity === quantity)?.expression; }
function verifyTransfer(problem: MixedProblem, transfer: CrossDomainTransfer, steps: Record<string, unknown>[]): string[] {
  const errors = validateObligation(transfer.obligation);
  const goal = problem.geometry.problem.goal as Record<string, unknown> | undefined;
  if (!goal || goal.predicate !== transfer.geometryConclusion.predicate || !factEqual(goal.args, transfer.geometryConclusion.args) || ("value" in transfer.geometryConclusion && !factEqual(goal.value, transfer.geometryConclusion.value))) errors.push("geometry conclusion must equal the verified geometry goal");
  if (transfer.geometryConclusion.predicate !== transferPredicate(transfer.family)) errors.push("transfer family does not match geometry conclusion");
  const permitted = transferStatementKind(transfer.family); if (!(Array.isArray(permitted) ? permitted : [permitted]).includes(transfer.obligation.statement.kind as never)) errors.push("transfer family does not match obligation statement");
  const ids = steps.map((x) => x.id).filter((x): x is string => typeof x === "string");
  if (!transfer.obligation.sourceProofStepIds.length || transfer.obligation.sourceProofStepIds.some((id) => !ids.includes(id))) errors.push("obligation lacks valid source proof steps");
  if (new Set(transfer.obligation.dependencyReferences).size !== transfer.obligation.dependencyReferences.length || transfer.obligation.dependencyReferences.includes(transfer.obligation.id)) errors.push("circular or duplicate obligation dependency");
  const statement = transfer.obligation.statement;
  if (transfer.family === "triangle-angle-sum") {
    const triangle = (problem.geometry.problem.objects as any[] | undefined)?.find((x) => x.kind === "triangle" && (x.data?.angles ?? []).includes(transfer.geometryConclusion.args[0]));
    const expressions = (triangle?.data?.angles ?? []).map((id: string) => binding(transfer, id, "angle-degrees"));
    if (expressions.length !== 3 || expressions.some((x: unknown) => !x) || statement.kind !== "equality" || statement.left.kind !== "add" || statement.left.terms.length !== 3 || !statement.left.terms.every((x, i) => expressionEqual(x, expressions[i])) || !expressionEqual(statement.right, constant(180))) errors.push("angle-sum obligation does not match triangle angle bindings");
  }
  if (transfer.family === "isosceles-angle" || transfer.family === "parallel-angle") {
    const left = binding(transfer, transfer.geometryConclusion.args[0], "angle-degrees"), right = binding(transfer, transfer.geometryConclusion.args[1], "angle-degrees");
    if (!left || !right || statement.kind !== "equality" || !expressionEqual(statement.left, left) || !expressionEqual(statement.right, right)) errors.push("angle equality obligation does not match verified angle bindings");
  }
  if (transfer.family === "similar-triangle-proportion" && !hasRestriction(transfer.obligation.domainRestrictions, ["nonzero"])) errors.push("similarity proportion needs a nonzero denominator restriction");
  if (transfer.family === "similar-triangle-proportion") {
    const objects = problem.geometry.problem.objects as any[] | undefined, triangles = transfer.geometryConclusion.args.map((id) => objects?.find((x) => x.id === id));
    if (statement.kind !== "proportion" || triangles.some((x) => !x)) errors.push("similarity obligation needs two known triangles");
    else { const [a,b] = triangles; const candidates = [0,1,2].map((i) => [binding(transfer,a.data.sides[i],"segment-length"),binding(transfer,b.data.sides[i],"segment-length")] as const); const matches = (x: MathExpression,y: MathExpression) => candidates.some(([l,r]) => l && r && expressionEqual(x,l) && expressionEqual(y,r)); if (!matches(statement.leftNumerator,statement.rightNumerator) || !matches(statement.leftDenominator,statement.rightDenominator)) errors.push("proportion does not use corresponding side bindings"); }
  }
  if (transfer.family === "pythagorean" && !hasRestriction([...transfer.obligation.assumptions, ...transfer.obligation.domainRestrictions], ["positive", "domain-membership"])) errors.push("Pythagorean length needs a positive geometric domain assumption");
  if (transfer.family === "pythagorean") {
    const triangle = (problem.geometry.problem.objects as any[] | undefined)?.find((x) => x.kind === "triangle" && (x.data?.sides ?? []).includes(transfer.geometryConclusion.args[0]));
    if (statement.kind !== "pythagorean" || !triangle) errors.push("Pythagorean obligation needs a triangle and typed relationship");
    else { const hyp = binding(transfer,triangle.data.hypotenuse,"segment-length"), legs = triangle.data.sides.filter((x:string)=>x!==triangle.data.hypotenuse).map((x:string)=>binding(transfer,x,"segment-length")); if (!hyp || legs.some((x:unknown)=>!x) || !expressionEqual(statement.hypotenuse,hyp) || !expressionEqual(statement.legA,legs[0]) || !expressionEqual(statement.legB,legs[1])) errors.push("Pythagorean obligation does not match side bindings"); }
  }
  return errors;
}
function legacyTransfer(h: AngleSumHandoff, steps: Record<string, unknown>[]): CrossDomainTransfer {
  const left = { kind: "add", terms: [...h.knownAngles.map(constant), symbol("x")] } as const;
  return { family: "triangle-angle-sum", geometryConclusion: { predicate: "angle_measure", args: [h.unknown], value: h.total - h.knownAngles.reduce((a,b)=>a+b,0) }, bindings: [{geometryId:h.unknown,quantity:"angle-degrees",expression:symbol("x")},{geometryId:"A",quantity:"angle-degrees",expression:constant(h.knownAngles[0])},{geometryId:"B",quantity:"angle-degrees",expression:constant(h.knownAngles[1])}], obligation: { contractVersion: MATHEMATICAL_OBLIGATION_CONTRACT, id: "legacy-triangle-angle-sum", statement: { kind: "equality", left, right: constant(h.total) }, originatingReasoner: "geometry:synthetic", sourceProofStepIds: [String(steps.at(-1)?.id ?? "s1")], dependencyReferences: [], assumptions: [], domainRestrictions: [], status: "verified", dischargeEvidence: [] } };
}
function missingTransferAssumptions(problem: MixedProblem, transfer: CrossDomainTransfer): string[] {
  const conditions = new Set((problem.geometry.problem.conditions as string[] | undefined) ?? []), objects = (problem.geometry.problem.objects as any[] | undefined) ?? [], facts = (problem.geometry.problem.facts as any[] | undefined) ?? [];
  if (["triangle-angle-sum","isosceles-angle","pythagorean"].includes(transfer.family)) { const triangle = objects.find((x) => x.kind === "triangle" && (transfer.geometryConclusion.args.some((id) => (x.data?.angles ?? []).includes(id) || (x.data?.sides ?? []).includes(id)) || transfer.geometryConclusion.args.includes(x.id))); if (triangle && !conditions.has(`nondegenerate:${triangle.id}`)) return [`nondegenerate:${triangle.id}`]; }
  if (transfer.family === "similar-triangle-proportion") { const missing = transfer.geometryConclusion.args.filter((id) => !conditions.has(`nondegenerate:${id}`)); if (missing.length) return missing.map((id) => `nondegenerate:${id}`); }
  if (transfer.family === "parallel-angle" && !facts.some((x) => x.predicate === "parallel")) return ["parallel lines required by the angle theorem"];
  return [];
}

export async function assessMathematicalWorking(problem: MathematicalProblem, studentWorking: StudentWorking, options: AssessOptions = {}): Promise<AssessmentEnvelope> {
  if (!problem || typeof problem !== "object" || !("domain" in problem || "statement" in problem)) return malformed("algebra", "problem must be a typed mathematical problem");
  if (problem.domain === "geometry") {
    if (!studentWorking || Array.isArray(studentWorking) || !("steps" in studentWorking) || !Array.isArray(studentWorking.steps)) return malformed("geometry", "geometry working must contain structured steps");
    try { return geometryEnvelope(await runGeometry(problem, studentWorking.steps, options)); } catch (error) { return { ...malformed("geometry", "geometry transport failed safely"), classification: "unsupported", failureKind: "transport", infrastructureFailure: error instanceof GeometryTransportError ? error.code : "transport", domainPayload: { transportError: error instanceof Error ? error.message : "geometry worker failure" } }; }
  }
  if (problem.domain === "mixed") {
    if (!studentWorking || Array.isArray(studentWorking) || !("geometry" in studentWorking) || !("calculation" in studentWorking) || !Array.isArray(studentWorking.geometry.steps) || !Array.isArray(studentWorking.calculation)) return malformed("mixed", "mixed working needs geometry steps and calculation lines");
    const transfer = problem.transfer ?? (problem.handoff ? legacyTransfer(problem.handoff, studentWorking.geometry.steps) : null);
    if (!transfer) return malformed("mixed", "mixed problem needs a typed transfer");
    let g: AssessmentEnvelope; try { g = geometryEnvelope(await runGeometry(problem.geometry, studentWorking.geometry.steps, options)); } catch (error) { return { ...malformed("mixed", "geometry transport failed safely"), classification: "unsupported", failureKind: "transport", infrastructureFailure: error instanceof GeometryTransportError ? error.code : "transport", domainPayload: { transportError: error instanceof Error ? error.message : "geometry worker failure" } }; }
    if (g.classification !== "verified") { const missing = g.classification === "unsupported" ? missingTransferAssumptions(problem, transfer) : []; return { ...g, domain: "mixed", classification: missing.length ? "missing-assumption" : g.classification, outstandingObligations: [...g.outstandingObligations, ...missing], complete: false, reasoners: [...g.reasoners, { id: "unified:proof-state", version: "u2" }] }; }
    const transferErrors = verifyTransfer(problem, transfer, studentWorking.geometry.steps);
    if (transferErrors.length) return { ...malformed("mixed", "invalid proof-carrying transfer"), outstandingObligations: transferErrors, domainPayload: { geometry: g.domainPayload, transfer } };
    const provenObligation: MathematicalObligation = { ...transfer.obligation, status: "verified", dischargeEvidence: [...transfer.obligation.dischargeEvidence, { reasoner: "geometry:synthetic", detail: g.justification, assessmentStepIndexes: g.steps.map((x)=>x.index) }] };
    let equation: string; try { equation = statementText(provenObligation.statement); } catch { return malformed("mixed", "obligation cannot be discharged by algebra"); }
    const a = textAssessment({ domain: "algebra", statement: equation }, studentWorking.calculation, options);
    let classification = a.classification;
    let domainStep: AssessmentStep | null = null;
    if (classification === "verified" && transfer.family === "pythagorean") {
      const selected = studentWorking.domainConclusion;
      const squared = Number(transfer.geometryConclusion.value);
      if (!selected) classification = "incomplete";
      else if (!Number.isFinite(selected.value) || selected.value <= 0 || selected.value * selected.value !== squared) { classification = "invalid"; domainStep = { index: g.steps.length + a.steps.length, classification: "invalid", justification: "The selected side length must be positive and its square must equal the verified squared length.", reasoner: "unified:proof-state", dependencies: [transfer.obligation.id] }; }
      else domainStep = { index: g.steps.length + a.steps.length, classification: "verified", justification: "The positive root is selected because a nondegenerate segment length is positive.", reasoner: "unified:proof-state", dependencies: [transfer.obligation.id] };
    }
    const discharged: MathematicalObligation = { ...provenObligation, status: classification === "verified" ? "discharged" : provenObligation.status, dischargeEvidence: classification === "verified" ? [...provenObligation.dischargeEvidence, { reasoner: a.reasoners[0]?.id ?? "math-core", detail: a.justification, assessmentStepIndexes: a.steps.map((x) => x.index + g.steps.length) }] : provenObligation.dischargeEvidence };
    return { contractVersion: UNIFIED_MATH_CONTRACT, domain: "mixed", classification, correct: classification === "verified" ? true : classification === "invalid" ? false : null, complete: classification === "verified", firstInvalidStep: classification === "invalid" ? (a.classification === "invalid" ? g.steps.length + (a.firstInvalidStep ?? 0) : domainStep?.index ?? null) : null, steps: [...g.steps, ...a.steps.map((s) => ({ ...s, index: s.index + g.steps.length, dependencies: [transfer.obligation.id, ...s.dependencies] })), ...(domainStep ? [domainStep] : [])], proofDependencies: [g.proofDependencies, { transferFamily: transfer.family, obligationId: transfer.obligation.id, sourceProofStepIds: transfer.obligation.sourceProofStepIds, equation }, a.proofDependencies], domainRestrictions: [...a.domainRestrictions, ...transfer.obligation.domainRestrictions.map((x) => JSON.stringify(x))], outstandingObligations: [...g.outstandingObligations, ...a.outstandingObligations, ...(classification === "incomplete" && transfer.family === "pythagorean" ? ["select the positive segment-length root"] : [])], skills: [...new Set([...g.skills, ...a.skills])], reasoners: [...g.reasoners, ...a.reasoners, { id: "unified:proof-state", version: "u2" }], justification: `${g.justification} ${a.justification}${domainStep ? ` ${domainStep.justification}` : ""}`, domainPayload: { geometry: g.domainPayload, calculation: a.domainPayload, transfer: { ...transfer, obligation: discharged } } };
  }
  if (!("statement" in problem) || typeof problem.statement !== "string" || !Array.isArray(studentWorking) || !studentWorking.every((x) => typeof x === "string")) return malformed(problem.domain === "arithmetic" ? "arithmetic" : "algebra", "text mathematics needs a statement and text lines");
  return textAssessment(problem, studentWorking, options);
}
