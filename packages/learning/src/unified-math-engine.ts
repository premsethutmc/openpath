/** Unified mathematics assessment U1. Thin dispatch only; native engines remain authoritative. */
import { assessWorking, verifyWorkingStep, type WorkingOptions } from "./core/working-assessment.ts";
import { requestGeometryWorker, GeometryTransportError, type GeometryFailureCode } from "./geometry-worker.ts";
import { MATHEMATICAL_OBLIGATION_CONTRACT, constant, statementText, symbol, validateObligation, type MathExpression, type MathematicalObligation, type MathematicalStatement } from "./mathematical-obligations.ts";
import { assessDomainWorking, M1_CONTRACT, type M1Problem, type M1Step } from "./domains-m1.ts";
import { assessM2Working, M2_CONTRACT, type M2Problem, type M2Step } from "./domains-m2.ts";
import { assessCalculusWorking, CALCULUS_CONTRACT, type CalculusProblem, type CalculusStep } from "./calculus-core.ts";
import { assessCalculusMethodWorking, CALCULUS_METHODS_CONTRACT, type CalculusMethodProblem, type CalculusMethodStep } from "./calculus-methods.ts";
import { assessSymbolicWorking, SYMBOLIC_EQUIVALENCE_CONTRACT, type SymbolicBudget, type SymbolicProblem, type SymbolicStep } from "./symbolic-equivalence.ts";
import { assessProbabilityStatistics, PROBABILITY_B1_CONTRACT, type B1Problem, type B1Step } from "./probability-statistics.ts";
import { assessLinearAlgebra, LINEAR_ALGEBRA_B2_CONTRACT, type LAProblem, type LAStep } from "./linear-algebra.ts";
import { assessComplex, COMPLEX_B3_CONTRACT, type ComplexProblem, type ComplexStep } from "./complex-polynomial.ts";
import { D2_MAX_STAGES, D2_PROOF_STATE_VERSION, D2ProofState } from "./d2-proof-state.ts";
import { D3_BINDING_CONTRACT, MathematicalBindingStore, type D3Problem, type D3Working } from "./cross-domain-bindings.ts";
import { NATURAL_WORKING_CONTRACT, equationAsExpression, naturalRestrictionKeys, parseNaturalWorking, type NaturalWorkingInput, type SourceLocation } from "./natural-working.ts";
import { NATURAL_ADAPTER_CONTRACT, adaptNaturalWorking, type NaturalAdapterResult } from "./natural-domain-adapters.ts";
import { evaluateLedger } from "./claim-certifier.ts";
import { CLAIM_LEDGER_CONTRACT, type CoverageRecord } from "./claim-ledger.ts";
import { buildLineAccount, resolveVerdict, unparsedLineAccount, validateAccounts, type AccountEntry, type LineAccount, type LineStatus, type StepClassification } from "./proof-integrity.ts";
import { bindClaimsDetailed, replaySymbolicSteps } from "./claim-binding.ts";
import { ACCEPTANCE_GATE_CONTRACT, checkerStatusToStep, checkerSummary, evidenceFromCheck, reconcileAlgebra, type AcceptanceGateRecord, type BindingEvidence, type GateEvidenceItem, type GateLevel } from "./acceptance-gate.ts";
import { checkAlgebraSubmission } from "./independent-checker.ts";
import { GEOCALC_E5_CONTRACT, planGeoCalcE5, type E5Plan } from "./natural-geocalc-e5.ts";
import { buildObligations, type ObligationSet } from "./proof-obligations.ts";
import { buildProofContext, relateStudentRestriction, routeUse, withProved, withStudent, withUnresolved, type ProofContext, type RouteUse } from "./proof-context.ts";
import { GENERALIZATION_E6_CONTRACT, planGeneralizationE6 } from "./natural-generalization-e6.ts";
import { polyAntiderivative, polyOf, polyToExpr } from "./calculus-binder-e5.ts";
import type { NaturalParseResult } from "./natural-working.ts";

export const UNIFIED_MATH_CONTRACT = "openpath-unified-math-assessment@1" as const;
export type Classification = "verified" | "invalid" | "incomplete" | "missing-assumption" | "unsupported" | "contradictory" | "resource-exhausted" | "malformed" | "ambiguous";
export interface TextProblem { domain?: "auto" | "arithmetic" | "algebra"; statement: string }
export interface GeometryProblem { domain: "geometry"; problem: Record<string, unknown> }
export interface AngleSumHandoff { kind: "triangle-angle-sum"; unknown: string; total: number; knownAngles: number[] }
export type TransferFamily = "triangle-angle-sum" | "isosceles-angle" | "similar-triangle-proportion" | "pythagorean" | "parallel-angle";
export interface GeometryQuantityBinding { geometryId: string; quantity: "angle-degrees" | "segment-length"; expression: MathExpression }
export interface CrossDomainTransfer { family: TransferFamily; geometryConclusion: { predicate: string; args: string[]; value?: unknown }; bindings: GeometryQuantityBinding[]; obligation: MathematicalObligation }
export interface MixedProblem { domain: "mixed"; geometry: GeometryProblem; handoff?: AngleSumHandoff; transfer?: CrossDomainTransfer }
export interface M2CrossDomainProblem { domain:"m2-cross-domain"; stages:{id:string;problem:TextProblem|GeometryProblem|MixedProblem|M1Problem|M2Problem|CalculusProblem|CalculusMethodProblem|SymbolicProblem|B1Problem|LAProblem|ComplexProblem;dependsOn:string[]}[] }
export interface M2CrossDomainWorking { stages:{id:string;working:string[]|M1Step[]|M2Step[]|CalculusStep[]|CalculusMethodStep[]|SymbolicStep[]|B1Step[]|LAStep[]|ComplexStep[]|{steps:Record<string,unknown>[]} | {geometry:{steps:Record<string,unknown>[]};calculation:string[];domainConclusion?:{symbol:string;value:number}}}[] }
export type MathematicalProblem = TextProblem | GeometryProblem | MixedProblem | M1Problem | M2Problem | CalculusProblem | CalculusMethodProblem | SymbolicProblem | B1Problem | LAProblem | ComplexProblem | M2CrossDomainProblem | D3Problem;
export type StudentWorking = string[] | NaturalWorkingInput | M1Step[] | M2Step[] | CalculusStep[] | CalculusMethodStep[] | SymbolicStep[] | B1Step[] | LAStep[] | ComplexStep[] | M2CrossDomainWorking | D3Working | { steps: Record<string, unknown>[] } | { geometry: { steps: Record<string, unknown>[] }; calculation: string[]; domainConclusion?: { symbol: string; value: number } };
export interface AssessOptions extends WorkingOptions { maxRuleApplications?: number; python?: string; geometryRoot?: string; geometryTimeoutMs?: number; geometryWorkerCount?: number; geometryQueueLimit?: number; signal?: AbortSignal; proofContext?: ProofContext; symbolicBudget?: SymbolicBudget; maxCrossDomainStages?: number }
export interface AssessmentStep { index: number; classification: Classification; justification: string; reasoner: string; dependencies: unknown[]; source?:SourceLocation }
export interface AssessmentEnvelope { contractVersion: typeof UNIFIED_MATH_CONTRACT; domain: "arithmetic" | "algebra" | "geometry" | "mixed" | "m2-cross-domain" | "d3-cross-domain" | M1Problem["domain"] | M2Problem["domain"] | "calculus" | "symbolic" | "probability-statistics" | "linear-algebra" | "complex-polynomial"; classification: Classification; correct: true | false | null; complete: boolean; firstInvalidStep: number | null; steps: AssessmentStep[]; proofDependencies: unknown[]; domainRestrictions: string[]; outstandingObligations: string[]; skills: string[]; reasoners: { id: string; version: string }[]; justification: string; domainPayload: unknown; failureKind?: "transport" | "mathematical"; infrastructureFailure?: GeometryFailureCode; /** E3: the mandatory final gate record; present on every envelope returned by assessMathematicalWorking */ acceptanceGate?: AcceptanceGateRecord }
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


const NATURAL_PARSER_ID={id:"natural-working-parser",version:NATURAL_WORKING_CONTRACT};
const lineClass=(status:LineStatus):Classification=>status==="verified-valid"||status==="not-mathematical"?"verified":status==="verified-invalid"?"invalid":status==="incomplete"?"incomplete":status==="inconclusive"?"unsupported":status;
function unresolvedSteps(parsed:NaturalParseResult,why:string,classification:Classification,unaccounted?:number[]):AssessmentStep[]{return parsed.lines.map((line,index)=>({index,classification:classification==="verified"||classification==="invalid"?"unsupported":unaccounted&&!unaccounted.includes(index)?"unsupported":classification,justification:unaccounted&&!unaccounted.includes(index)?`line ${line.source.line} was not certified: the submission cannot be certified while other lines are unverified`:`line ${line.source.line} was not verified: ${why}`,reasoner:"natural-working-parser",dependencies:index?[index-1]:["problem"],source:line.source}))}
function stepsFromAccount(parsed:NaturalParseResult,account:LineAccount,assessed?:AssessmentEnvelope):AssessmentStep[]{return account.records.map((r,index)=>({index,classification:lineClass(r.status),justification:r.reason,reasoner:r.role==="claim-step"&&r.stepIndex!==null?assessed?.steps[r.stepIndex]?.reasoner??"unverified":r.role==="given-matched"?"natural-adapter:typed-match":"unverified",dependencies:r.dependencies.length?r.dependencies:["problem"],source:parsed.lines[index].source}))}

/** Text (algebra) route: math-core judges every submitted line; certification additionally requires 1:1 line accounting. */
/** A step that only loses solutions is a valid-but-incomplete narrowing, not a false statement (E2 completeness rule). */
function refineLoss(statement:string,lines:string[],assessed:AssessmentEnvelope):AssessmentEnvelope{
  if(assessed.classification!=="invalid"||assessed.domain==="arithmetic")return assessed;
  const steps=assessed.steps.map(step=>({...step}));let loss=false,firstBad=-1;const lost:string[]=[];
  const completeness=/\b(?:the\s+)?(?:complete|full|entire|whole)\s+(?:solution|answer|set)\b|\bthis is (?:the )?(?:only|whole|entire|complete)\b|\ball (?:the )?solutions\b|\bthe only solution\b/i;
  for(let i=1;i<steps.length&&i<lines.length;i++){if(steps[i].classification!=="invalid")continue;const v=verifyWorkingStep(statement,lines[i-1],lines[i]);
    if(v.effect==="invalid-loss"&&!lines.slice(i+1).some(l=>completeness.test(l))){loss=true;lost.push(`line ${i+1}: ${v.detail}`);steps[i]={...steps[i],classification:"incomplete",justification:`valid but incomplete narrowing: ${v.detail}`}}else if(firstBad<0)firstBad=i}
  if(!loss)return assessed;
  if(firstBad>=0)return{...assessed,steps,firstInvalidStep:firstBad,justification:`line ${firstBad+1} is not an equivalent step`};
  return{...assessed,classification:"incomplete",correct:null,complete:false,firstInvalidStep:null,steps,justification:"every step is valid, but the working narrows the solution set and does not account for all solutions",outstandingObligations:[...assessed.outstandingObligations,...lost]}}

function gateTextRoute(domain:AssessmentEnvelope["domain"],parsed:NaturalParseResult,assessed0:AssessmentEnvelope,input:NaturalWorkingInput,statement?:string):AssessmentEnvelope{
  const assessed=statement?refineLoss(statement,parsed.lines.map(l=>l.source.text),assessed0):assessed0;
  const finalClaimInvalid=assessed.classification==="invalid"&&assessed.firstInvalidStep===null&&(assessed.domainPayload as {invalidAt?:string}|null)?.invalidAt==="final-claim"&&assessed.steps.length===parsed.lines.length;
  const accounts:AccountEntry[]=parsed.lines.map((l,i)=>({lineId:l.id,role:"claim-step" as const,stepIndex:i,dependsOn:i?[parsed.lines[i-1].id]:[]}));
  const violations:string[]=[];if(assessed.steps.length>parsed.lines.length)violations.push(`reasoner returned ${assessed.steps.length} steps for ${parsed.lines.length} lines`);
  const outcomes=parsed.lines.map((_,i)=>assessed.steps[i]?{classification:(finalClaimInvalid&&i===parsed.lines.length-1?"invalid":assessed.steps[i].classification) as StepClassification,justification:finalClaimInvalid&&i===parsed.lines.length-1?`the final claim is not a valid solution: ${assessed.justification}`:assessed.steps[i].justification}:undefined);
  const account=buildLineAccount(parsed,accounts,outcomes,input.text,violations);
  let result:AssessmentEnvelope={...assessed,firstInvalidStep:finalClaimInvalid?parsed.lines.length-1:assessed.firstInvalidStep,steps:assessed.steps.map((step,index)=>({...step,classification:finalClaimInvalid&&index===parsed.lines.length-1?"invalid":step.classification,source:parsed.lines[index]?.source})),reasoners:[NATURAL_PARSER_ID,...assessed.reasoners],domainPayload:{naturalInput:parsed,assessment:assessed.domainPayload,lineAccount:account}};
  if(assessed.classification==="verified"){
    const verdict=resolveVerdict(account,assessed.complete,[]);
    if(verdict.classification!=="verified")result={...result,classification:verdict.classification,correct:verdict.correct,complete:false,firstInvalidStep:verdict.firstInvalidStep,justification:verdict.justification,outstandingObligations:[...result.outstandingObligations,...verdict.obligations],steps:stepsFromAccount(parsed,account,assessed)}
  }
  return result}

/** Adapter route: re-validate the adapter's line accounts, judge every claim, bind certificates, and derive the verdict from the per-line account. */
async function assessConverted(problem:MathematicalProblem,domain:AssessmentEnvelope["domain"],parsed:NaturalParseResult,adapted:Extract<NaturalAdapterResult,{outcome:"converted"}>,input:NaturalWorkingInput,options:AssessOptions):Promise<AssessmentEnvelope>{
  const reasoners=[NATURAL_PARSER_ID,{id:`natural-adapter:${adapted.evidence.adapter}`,version:NATURAL_ADAPTER_CONTRACT}];
  const stepCount=Array.isArray(adapted.working)?adapted.working.length:-1;
  const violations=validateAccounts(parsed,adapted.accounts,stepCount,adapted.sourceMap);
  if(violations.length){const account=buildLineAccount(parsed,[],[],input.text,violations);return{...malformed(domain,violations[0]),classification:"unsupported",steps:unresolvedSteps(parsed,violations[0],"unsupported"),outstandingObligations:violations,reasoners,domainPayload:{naturalInput:parsed,conversion:adapted.evidence,lineAccount:account}}}
  const assessed=await assessCandidate(adapted.problem as MathematicalProblem,adapted.working as StudentWorking,options);
  const claimCount=adapted.accounts.filter(a=>a.role==="claim-step").length;
  const outcomes=Array.from({length:claimCount},(_,k)=>assessed.steps[k]?{classification:assessed.steps[k].classification as StepClassification,justification:assessed.steps[k].justification}:undefined);
  const extra:string[]=assessed.steps.length>claimCount?[`reasoner returned ${assessed.steps.length} steps for ${claimCount} claims`]:[];
  const binding=bindClaimsDetailed(parsed,adapted,assessed);extra.push(...binding.errors);
  const account=buildLineAccount(parsed,adapted.accounts,outcomes,input.text,extra);
  const nativeComplete=assessed.classification==="verified"&&assessed.complete;
  let verdict=resolveVerdict(account,nativeComplete,adapted.obligations);
  if(verdict.classification==="incomplete"&&!nativeComplete&&["missing-assumption","resource-exhausted","contradictory","unsupported","ambiguous","malformed"].includes(assessed.classification)&&!account.records.some(r=>r.status!=="verified-valid"))verdict={...verdict,classification:assessed.classification,justification:assessed.justification,obligations:[...verdict.obligations,...assessed.outstandingObligations]};
  const steps=stepsFromAccount(parsed,account,assessed);
  return{...assessed,domain,classification:verdict.classification,correct:verdict.correct,complete:verdict.complete,firstInvalidStep:verdict.firstInvalidStep,steps,proofDependencies:steps.map(s=>s.dependencies),
    outstandingObligations:[...new Set([...assessed.outstandingObligations,...verdict.obligations])],justification:verdict.justification,reasoners:[...reasoners,...assessed.reasoners],
    domainPayload:{naturalInput:parsed,conversion:adapted.evidence,assessment:assessed.domainPayload,lineAccount:account,bindingEvidence:binding.evidence}}}


/**
 * Destination-reasoner cross-check for the E5 route. The independent binders already hold the evidence; the destination reasoners
 * (geometry-reasoner G2-G4 and calculus-core C1-C3) can only VETO an acceptance by contradicting it. A destination that cannot decide is recorded, not trusted.
 */
async function e5DestinationCheck(problem: MathematicalProblem, input: NaturalWorkingInput, plan: E5Plan, classification: Classification, options: AssessOptions): Promise<{ note: string; contradicts: boolean } | null> {
  void input;
  if (classification !== "verified") return null;
  try {
    if (plan.domain === "geometry" && plan.geometry) {
      const steps = plan.geometry.steps.filter((s) => s.statement.predicate !== "angle_measure");
      if (!steps.length) return { note: "geometry-reasoner: no relational step to cross-check", contradicts: false };
      const native = await runGeometry({ domain: "geometry", problem: plan.geometry.problem as unknown as Record<string, unknown> }, steps.map((s) => ({ id: s.id, statement: s.statement, cited_step_ids: [] })), options);
      const verdicts = native.steps.map((s) => s.status);
      const bad = verdicts.find((v) => v === "invalid" || v === "missing_assumption");
      if (bad) return { note: `geometry-reasoner reports ${bad} for a step the independent check accepted`, contradicts: true };
      return { note: `geometry-reasoner: ${verdicts.filter((v) => v === "verified").length}/${verdicts.length} relational steps verified, others undecided`, contradicts: false };
    }
    if (plan.domain === "calculus" && plan.final) {
      const cp = problem as CalculusProblem; const v = "variable" in cp ? cp.variable : "x";
      // The core's normal form does not expand products, so for derivative/antiderivative claims its rejection is recorded but cannot veto.
      if (cp.task === "derivative" || cp.task === "indefinite-integral") {
        const r = assessCalculusWorking(cp, [{ id: "e5-final", rule: "e5-final-claim", claim: plan.final }]);
        return { note: `calculus-core: ${r.classification}${r.classification === "invalid" ? " (its normal form does not expand products; the exact U4 evidence stands)" : ""}`, contradicts: false };
      }
      if (cp.task === "definite-integral" && plan.final.kind === "value") {
        const p = polyOf(cp.integrand, v); if (!p) return { note: "calculus-core: not run (non-polynomial integrand)", contradicts: false };
        const F = polyToExpr(polyAntiderivative(p), v);
        const antiderivative = assessCalculusWorking(cp, [{ id: "F", rule: "antiderivative", claim: { kind: "expression", value: F } }]);
        if (antiderivative.classification !== "verified") return { note: "calculus-core: could not confirm the antiderivative in its normal form (undecided)", contradicts: false };
        const r = assessCalculusWorking(cp, [{ id: "F", rule: "antiderivative", claim: { kind: "expression", value: F } }, { id: "value", rule: "fundamental-theorem", claim: plan.final, dependencies: ["F"] }]);
        return r.classification === "invalid" ? { note: "calculus-core contradicts the independently verified value", contradicts: true } : { note: `calculus-core: ${r.classification}`, contradicts: false };
      }
      const r = assessCalculusWorking(cp, [{ id: "e5-final", rule: "e5-final-claim", claim: plan.final }]);
      if (r.classification === "invalid") return { note: "calculus-core contradicts the independently verified final claim", contradicts: true };
      return { note: `calculus-core: ${r.classification}`, contradicts: false };
    }
  } catch { return { note: "destination reasoner unavailable; independent evidence stands", contradicts: false }; }
  return null;
}
/**
 * E5 route: natural geometry/calculus working (degree signs, angle notation, Leibniz/prime notation, integrals, limits, coordinates).
 * The proposer (natural-geocalc-e5) only translates notation into typed claims; every claim is judged by the independent binders,
 * the per-line account is built by the same proof-integrity code as every other route, and the E3 gate re-checks the evidence.
 */
const E5_DEFINITE: Classification[] = ["verified", "invalid", "incomplete", "missing-assumption"];
async function assessE5Route(problem: MathematicalProblem, input: NaturalWorkingInput, options: AssessOptions): Promise<AssessmentEnvelope | null> {
  const domain = (problem as { domain: "geometry" | "calculus" }).domain;
  const plan = planGeoCalcE5(problem, input);
  if (!plan) return null;
  const reasoners = [{ id: "natural-geocalc-e5", version: GEOCALC_E5_CONTRACT }];
  if ("refused" in plan) { const lineAccount = unparsedLineAccount(input, parseNaturalWorking); return { ...malformed(domain, plan.refused), classification: plan.resource ? "resource-exhausted" : "unsupported", steps: lineAccount.records.map((r, index) => ({ index, classification: lineClass(r.status), justification: r.reason, reasoner: "natural-geocalc-e5", dependencies: ["problem"], source: { line: r.line, start: r.span.start, end: r.span.end, text: r.text } })), domainPayload: { lineAccount }, reasoners }; }
  const extra: string[] = [];
  const account = buildLineAccount(plan.parsed, plan.accounts, plan.outcomes, input.text, extra);
  let verdict = resolveVerdict(account, plan.nativeComplete, plan.obligations);
  let classification: Classification = verdict.classification as Classification;
  if (classification === "incomplete" && plan.terminal === "missing-assumption") classification = "missing-assumption";
  const destination = await e5DestinationCheck(problem, input, plan, classification, options);
  let notes = [...plan.notes];
  if (destination) { notes.push(destination.note); if (classification === "verified" && destination.contradicts) { classification = "unsupported"; verdict = { ...verdict, classification: "unsupported", correct: null, complete: false, justification: `the destination reasoner contradicts the independent check (${destination.note}); nothing is accepted`, obligations: [destination.note] }; } }
  const steps = stepsFromAccount(plan.parsed, account);
  return { contractVersion: UNIFIED_MATH_CONTRACT, domain, classification, correct: classification === "verified" ? true : classification === "invalid" ? false : null, complete: classification === "verified", firstInvalidStep: classification === "invalid" ? verdict.firstInvalidStep : null,
    steps, proofDependencies: steps.map((s) => s.dependencies), domainRestrictions: plan.restrictions, outstandingObligations: classification === "verified" ? [] : verdict.obligations, skills: [`${domain}.natural-e5.${plan.family}`], reasoners,
    justification: classification === "missing-assumption" ? verdict.obligations[0] ?? "an assumption is missing" : verdict.justification,
    domainPayload: { naturalInput: plan.parsed, conversion: { contractVersion: NATURAL_ADAPTER_CONTRACT, adapter: `natural-geocalc-e5:${plan.family}`, sourceLines: plan.parsed.lines.map((l) => l.source.line), checks: notes, assumptions: [], restrictions: plan.restrictions.map(String), obligations: classification === "verified" ? [] : verdict.obligations, matchedLines: plan.parsed.lines.map((l) => l.source.line), accounts: plan.accounts, outputs: {} }, lineAccount: account, bindingEvidence: plan.evidence, e5: { contract: GEOCALC_E5_CONTRACT, family: plan.family, destination: plan.destination, notes } } };
}

/**
 * E6 route: generalised natural working (calculus rules, substitution/parts/partial-fraction chains, limits, continuity, and the number-chain
 * domains). The proposer in natural-generalization-e6 translates notation into typed claims; the independent exact kernels (e6-cas, e6-series)
 * judge every claim; the same proof-integrity account and E3 gate apply. A float agreement never accepts.
 */
const E6_DEFINITE: Classification[] = ["verified", "invalid", "incomplete", "missing-assumption"];
async function assessE6Route(problem: MathematicalProblem, input: NaturalWorkingInput, options: AssessOptions): Promise<AssessmentEnvelope | null> {
  const domain = (problem as { domain: string }).domain as AssessmentEnvelope["domain"];
  const ctx = options.proofContext ?? buildProofContext(problem);
  const plan = planGeneralizationE6(problem, input, ctx);
  if (!plan) return null;
  const reasoners = [{ id: "natural-generalization-e6", version: GENERALIZATION_E6_CONTRACT }];
  if ("refused" in plan) { const lineAccount = unparsedLineAccount(input, parseNaturalWorking); return { ...malformed(domain, plan.refused), classification: plan.resource ? "resource-exhausted" : "unsupported", steps: lineAccount.records.map((r, index) => ({ index, classification: lineClass(r.status), justification: r.reason, reasoner: "natural-generalization-e6", dependencies: ["problem"], source: { line: r.line, start: r.span.start, end: r.span.end, text: r.text } })), domainPayload: { lineAccount }, reasoners }; }
  const account = buildLineAccount(plan.parsed, plan.accounts, plan.outcomes, input.text, []);
  const verdict = resolveVerdict(account, plan.nativeComplete, plan.obligations);
  let classification: Classification = verdict.classification as Classification;
  if (classification === "incomplete" && plan.terminal === "missing-assumption") classification = "missing-assumption";
  const steps = stepsFromAccount(plan.parsed, account);
  return { contractVersion: UNIFIED_MATH_CONTRACT, domain, classification, correct: classification === "verified" ? true : classification === "invalid" ? false : null, complete: classification === "verified", firstInvalidStep: classification === "invalid" ? verdict.firstInvalidStep : null,
    steps, proofDependencies: steps.map((s) => s.dependencies), domainRestrictions: plan.restrictions, outstandingObligations: classification === "verified" ? [] : verdict.obligations, skills: [`${domain}.natural-e6.${plan.family}`], reasoners,
    justification: classification === "missing-assumption" ? verdict.obligations[0] ?? "an assumption is missing" : verdict.justification,
    domainPayload: { groundedLines: plan.grounded, naturalInput: plan.parsed, conversion: { contractVersion: NATURAL_ADAPTER_CONTRACT, adapter: `natural-generalization-e6:${plan.family}`, sourceLines: plan.parsed.lines.map((l) => l.source.line), checks: plan.notes, assumptions: [], restrictions: plan.restrictions.map(String), obligations: classification === "verified" ? [] : verdict.obligations, matchedLines: plan.parsed.lines.map((l) => l.source.line), accounts: plan.accounts, outputs: {} }, lineAccount: account, bindingEvidence: plan.evidence, e6: { contract: GENERALIZATION_E6_CONTRACT, family: plan.family, destination: plan.destination, notes: plan.notes, diagnostics: plan.diagnostics, finalValue: plan.finalValue ?? null } } };
}
const NON_DEFINITE = (c: Classification) => !E6_DEFINITE.includes(c);
/** E6 may complete a verdict the established routes could not reach, may veto an acceptance it independently contradicts, and may refine a non-definite verdict; it never overrides a definite rejection into an acceptance. */
function mergeE6(prior: AssessmentEnvelope, e6: AssessmentEnvelope | null, problem: MathematicalProblem): AssessmentEnvelope {
  if (!e6) return prior;
  if (!E6_DEFINITE.includes(e6.classification)) return (NON_DEFINITE(prior.classification) && prior.classification !== "resource-exhausted") || (prior.classification === "verified" && e6.classification === "ambiguous") ? e6 : prior;
  if (prior.classification === "verified") return e6.classification === "verified" ? prior : e6;
  // E6-R: an earlier route that found every line true but not finished (its final-form grammar is narrower) is completed by the independent exact route
  if (prior.classification === "incomplete" && e6.classification === "verified") return e6;
  if (NON_DEFINITE(prior.classification)) return prior.classification === "resource-exhausted" ? prior : e6;
  // D5 contract revision (E6): a missing integration constant is `missing-assumption`; the earlier `invalid` label is kept only in the historical regression record.
  if (prior.classification === "invalid" && e6.classification === "missing-assumption" && (problem as { task?: string }).task === "indefinite-integral") return e6;
  if (e6.classification === "invalid" && prior.classification !== "invalid") return e6;
  return prior;
}
async function assessCandidate(problem: MathematicalProblem, studentWorking: StudentWorking, options: AssessOptions = {}): Promise<AssessmentEnvelope> {
  if (problem && typeof problem === "object" && "domain" in problem && (problem.domain === "geometry" || problem.domain === "calculus" || problem.domain === "probability-statistics" || problem.domain === "complex-polynomial") && studentWorking && !Array.isArray(studentWorking) && "format" in studentWorking && "text" in studentWorking) {
    // Precedence: an existing definite verdict of the established route is kept (D1-D8 behaviour is not re-labelled). The E5 route is
    // consulted for every geometry/calculus submission; it supplies the verdict unless the established route already verified (then the established
    // evidence is kept when E5 agrees) and it vetoes an acceptance it independently contradicts (the veto can only downgrade, never certify).
    // E7 Phase 4: ONE immutable proof context for every route. A route that cannot consume part of it says so (RouteUse); nothing is dropped silently.
    const ctx = options.proofContext ?? buildProofContext(problem);
    options = { ...options, proofContext: ctx };
    const uses: RouteUse[] = [routeUse(ctx, "base-algebra")];
    const base = await assessCandidateBase(problem, studentWorking, options);
    const e5 = problem.domain === "geometry" || problem.domain === "calculus" ? await assessE5Route(problem, studentWorking as NaturalWorkingInput, options) : null;
    if (e5) uses.push(routeUse(ctx, "e5-geocalc"));
    const stage = (() => {
      if (!e5 || !E5_DEFINITE.includes(e5.classification)) return base;
      if (base.classification === "verified") return e5.classification === "verified" ? base : e5;
      // D5 contract (E5): both labels for a missing constant are non-accepting; E6 revises the label below.
      if (base.classification === "invalid" && e5.classification === "missing-assumption" && (problem as { task?: string }).task === "indefinite-integral") return base;
      return e5;
    })();
    const e6 = await assessE6Route(problem, studentWorking as NaturalWorkingInput, options);
    if (e6) { const e6notes = ((e6.domainPayload as { conversion?: { checks?: string[] } } | undefined)?.conversion?.checks ?? []).filter((n) => /could not be read by the exact calculus route/.test(n)); uses.push({ ...routeUse(ctx, problem.domain === "calculus" ? "e6-calculus" : "e6-numbers", e6notes), grounded: (e6.domainPayload as { groundedLines?: RouteUse["grounded"] } | undefined)?.groundedLines }); }
    const merged = mergeE6(stage, e6, problem);
    return { ...merged, domainPayload: { ...(merged.domainPayload && typeof merged.domainPayload === "object" ? merged.domainPayload : {}), proofContextUse: uses } };
  }
  return assessCandidateBase(problem, studentWorking, options);
}
async function assessCandidateBase(problem: MathematicalProblem, studentWorking: StudentWorking, options: AssessOptions = {}): Promise<AssessmentEnvelope> {
  if (!problem || typeof problem !== "object" || !("domain" in problem || "statement" in problem)) return malformed("algebra", "problem must be a typed mathematical problem");
  if(studentWorking&&!Array.isArray(studentWorking)&&"format" in studentWorking&&"text" in studentWorking){
    const parsed=parseNaturalWorking(studentWorking as NaturalWorkingInput),domain=(problem.domain==="symbolic"?"symbolic":problem.domain==="auto"||problem.domain==="arithmetic"||problem.domain==="algebra"||!("domain" in problem)?"algebra":problem.domain) as AssessmentEnvelope["domain"];
    if(parsed.classification!=="parsed"){const lineAccount=unparsedLineAccount(studentWorking as NaturalWorkingInput,parseNaturalWorking);return{...malformed(domain,parsed.message),classification:parsed.classification,steps:lineAccount.records.map((r,index)=>({index,classification:lineClass(r.status),justification:r.reason,reasoner:"natural-working-parser",dependencies:["problem"],source:{line:r.line,start:r.span.start,end:r.span.end,text:r.text}})),domainPayload:{naturalInput:parsed,lineAccount},reasoners:[{id:"natural-working-parser",version:NATURAL_WORKING_CONTRACT}]}}
    let assessed:AssessmentEnvelope;
    if("statement" in problem){assessed=textAssessment(problem,parsed.lines.map(x=>x.source.text),options);const square=problem.statement.replace(/\s/g,"").match(/^([A-Za-z][A-Za-z0-9_]*)\^2=(\d+)$/),single=parsed.lines.length===1?parsed.lines[0].source.text.replace(/\s/g,"").match(/^([A-Za-z][A-Za-z0-9_]*)=(-?\d+)$/):null;if(assessed.classification==="invalid"&&square&&single&&square[1]===single[1]&&Number(single[2])**2===Number(square[2])&&Number(square[2])>0)assessed={...assessed,classification:"incomplete",correct:null,complete:false,firstInvalidStep:null,justification:"one square-root branch is valid, but the opposite root is still required",outstandingObligations:[`include both ${square[1]} = ${Math.abs(Number(single[2]))} and ${square[1]} = ${-Math.abs(Number(single[2]))}`],steps:assessed.steps.map(step=>({...step,classification:"verified",justification:"this is one valid solution branch"}))}}
    else if(problem.domain==="symbolic"){
      const adapted=adaptNaturalWorking(problem,parsed);
      if(adapted.outcome==="converted")return assessConverted(problem,domain,parsed,adapted,studentWorking as NaturalWorkingInput,options);
      if(adapted.outcome!=="unsupported"&&adapted.outcome!=="partial")return{...malformed(domain,adapted.message),classification:adapted.outcome==="missing-assumption"?"missing-assumption":adapted.outcome==="ambiguous"?"ambiguous":adapted.outcome==="resource-exhausted"?"resource-exhausted":"unsupported",outstandingObligations:adapted.obligations??[adapted.message],domainPayload:{naturalInput:parsed,conversion:adapted},reasoners:[{id:"natural-working-parser",version:NATURAL_WORKING_CONTRACT},{id:"natural-domain-adapter",version:NATURAL_ADAPTER_CONTRACT}]};
      const unsupported=parsed.lines.find(line=>!["expression","equation"].includes(line.relation.kind));if(unsupported)return{...malformed(domain,`line ${unsupported.source.line} has no lossless symbolic adapter`),classification:"unsupported",domainPayload:{naturalInput:parsed},reasoners:[{id:"natural-working-parser",version:NATURAL_WORKING_CONTRACT}]};
      const steps:SymbolicStep[]=parsed.lines.map((line,index)=>({id:line.id,expression:line.relation.kind==="equation"?equationAsExpression(line.relation):line.relation.expression,dependencies:index?[parsed.lines[index-1].id]:undefined,...(line.restrictions?.length?{carriedRestrictions:naturalRestrictionKeys(line)}:{})}));
      assessed=await assessCandidate(problem,steps,options);const replay=replaySymbolicSteps(parsed,problem.start,steps,assessed);const gatedText=gateTextRoute(domain,parsed,assessed,studentWorking as NaturalWorkingInput,undefined);const bindingErrors=replay.errors;return bindingErrors.length&&gatedText.classification==='verified'?{...gatedText,classification:'unsupported',correct:null,complete:false,justification:`U4 replay rejected the certificate: ${bindingErrors[0]}`,outstandingObligations:[...gatedText.outstandingObligations,...bindingErrors],domainPayload:{...(gatedText.domainPayload as object),bindingEvidence:replay.evidence}}:{...gatedText,domainPayload:{...(gatedText.domainPayload as object),bindingEvidence:replay.evidence}};
    }else{const adapted=adaptNaturalWorking(problem,parsed);if(adapted.outcome!=="converted"){const classification:Classification=adapted.outcome==="missing-assumption"?"missing-assumption":adapted.outcome==="ambiguous"?"ambiguous":adapted.outcome==="resource-exhausted"?"resource-exhausted":"unsupported";return{...malformed(domain,adapted.message),classification,outstandingObligations:adapted.obligations??[adapted.message],steps:unresolvedSteps(parsed,adapted.message,classification,"unaccounted"in adapted?adapted.unaccounted:undefined),domainPayload:{naturalInput:parsed,conversion:adapted,lineAccount:buildLineAccount(parsed,[],[],(studentWorking as NaturalWorkingInput).text,[adapted.message],"unaccounted"in adapted?adapted.unaccounted:undefined)},reasoners:[{id:"natural-working-parser",version:NATURAL_WORKING_CONTRACT},{id:"natural-domain-adapter",version:NATURAL_ADAPTER_CONTRACT}]}}return assessConverted(problem,domain,parsed,adapted,studentWorking as NaturalWorkingInput,options)}
    return gateTextRoute(domain,parsed,assessed,studentWorking as NaturalWorkingInput,"statement" in problem?problem.statement:undefined);
  }
  if (problem.domain === "d3-cross-domain") {
    if (!studentWorking || Array.isArray(studentWorking) || !("stages" in studentWorking) || !Array.isArray(studentWorking.stages)) return malformed("d3-cross-domain","typed binding working must contain stages");
    if(!Array.isArray(problem.stages)||!problem.stages.length||problem.stages.length>D2_MAX_STAGES)return{...malformed("d3-cross-domain",`typed binding proof requires 1 to ${D2_MAX_STAGES} stages`),classification:problem.stages?.length>D2_MAX_STAGES?"resource-exhausted":"malformed"};
    const submittedIds=studentWorking.stages.map(stage=>stage.id);if(new Set(submittedIds).size!==submittedIds.length||submittedIds.some(id=>!problem.stages.some(stage=>stage.id===id)))return malformed("d3-cross-domain","submitted stages must be unique and declared");
    const proofState=new D2ProofState(),bindingStore=new MathematicalBindingStore(),steps:AssessmentStep[]=[],restrictions:string[]=[],obligations:string[]=[],skills:string[]=[],reasoners:AssessmentEnvelope["reasoners"]=[],payload:unknown[]=[];let offset=0;
    const fail=(classification:Classification,explanation:string,firstInvalidStep:number|null):AssessmentEnvelope=>({contractVersion:UNIFIED_MATH_CONTRACT,domain:"d3-cross-domain",classification,correct:classification==="invalid"?false:null,complete:false,firstInvalidStep,steps,proofDependencies:steps.map(step=>step.dependencies),domainRestrictions:[...new Set(restrictions)],outstandingObligations:[...obligations,explanation],skills:[...new Set(skills)],reasoners:[...new Map(reasoners.map(item=>[`${item.id}:${item.version}`,item])).values(),{id:"unified:d3-bindings",version:D3_BINDING_CONTRACT}],justification:explanation,domainPayload:{stages:payload,bindings:[...bindingStore.bindings.values()],proofState:proofState.snapshot(problem.stages.at(-1)?.id??null)}});
    for(const stage of problem.stages){const dependencyErrors=proofState.checkDependencies(stage.id,stage.dependsOn);if(dependencyErrors.length)return fail("malformed",dependencyErrors.join("; "),offset);const submitted=studentWorking.stages.find(item=>item.id===stage.id);if(!submitted)return fail("incomplete",`stage ${stage.id} is incomplete`,null);
      const resolved=bindingStore.resolve(stage.problem,stage.imports??[]);if(resolved.failure)return fail(resolved.failure.classification,resolved.failure.explanation,resolved.failure.classification==="invalid"?offset:null);
      for(const bindingId of resolved.used){const binding=bindingStore.bindings.get(bindingId)!;if(!stage.dependsOn.includes(binding.sourceStageId))return fail("invalid",`stage ${stage.id} does not depend on binding source ${binding.sourceStageId}`,offset)}
      const result=await assessCandidate(resolved.problem!,submitted.working as StudentWorking,options);restrictions.push(...result.domainRestrictions);obligations.push(...result.outstandingObligations);skills.push(...result.skills);reasoners.push(...result.reasoners);payload.push({id:stage.id,assessment:result.domainPayload,usedBindings:resolved.used});steps.push(...result.steps.map(step=>({...step,index:step.index+offset,dependencies:[...stage.dependsOn,...resolved.used,...step.dependencies]})));
      if(result.classification!=="verified")return fail(result.classification,`stage ${stage.id}: ${result.justification}`,result.firstInvalidStep===null?null:offset+result.firstInvalidStep);
      const transferErrors=proofState.establish(stage.id,stage.dependsOn,result,offset);if(transferErrors.length)return fail("unsupported",transferErrors.join("; "),null);
      for(const declaration of stage.exports??[]){const failure=bindingStore.export(stage.id,declaration,submitted.working,result,stage.dependsOn);if(failure)return fail(failure.classification,failure.explanation,failure.classification==="invalid"?offset:null)}offset=steps.length;
    }
    return{contractVersion:UNIFIED_MATH_CONTRACT,domain:"d3-cross-domain",classification:"verified",correct:true,complete:true,firstInvalidStep:null,steps,proofDependencies:steps.map(step=>step.dependencies),domainRestrictions:[...new Set(restrictions)],outstandingObligations:obligations,skills:[...new Set(skills)],reasoners:[...new Map(reasoners.map(item=>[`${item.id}:${item.version}`,item])).values(),{id:"unified:d3-bindings",version:D3_BINDING_CONTRACT}],justification:"all domain stages and typed binding substitutions are independently verified",domainPayload:{stages:payload,bindings:[...bindingStore.bindings.values()],proofState:proofState.snapshot(problem.stages.at(-1)?.id??null)}};
  }
  if (problem.domain === "complex-polynomial") {
    if (!Array.isArray(studentWorking)) return malformed("complex-polynomial","B3 working must contain structured steps");
    const native=assessComplex(problem,studentWorking as ComplexStep[]);
    return {contractVersion:UNIFIED_MATH_CONTRACT,domain:"complex-polynomial",classification:native.classification,correct:native.correct,complete:native.complete,firstInvalidStep:native.firstInvalidStep,steps:native.steps.map(s=>({index:s.index,classification:s.classification,justification:s.justification,reasoner:"complex-polynomial:b3",dependencies:s.dependencies})),proofDependencies:native.steps.map(s=>s.dependencies),domainRestrictions:native.domainRestrictions,outstandingObligations:native.outstandingObligations,skills:native.skills,reasoners:[{id:"complex-polynomial:b3",version:COMPLEX_B3_CONTRACT}],justification:native.justification,domainPayload:native};
  }
  if (problem.domain === "linear-algebra") {
    if (!Array.isArray(studentWorking)) return malformed("linear-algebra","B2 working must contain structured steps");
    const native=assessLinearAlgebra(problem,studentWorking as LAStep[]);
    return {contractVersion:UNIFIED_MATH_CONTRACT,domain:"linear-algebra",classification:native.classification,correct:native.correct,complete:native.complete,firstInvalidStep:native.firstInvalidStep,steps:native.steps.map(s=>({index:s.index,classification:s.classification,justification:s.justification,reasoner:"linear-algebra:b2",dependencies:s.dependencies})),proofDependencies:native.steps.map(s=>s.dependencies),domainRestrictions:native.domainRestrictions,outstandingObligations:native.outstandingObligations,skills:native.skills,reasoners:[{id:"linear-algebra:b2",version:LINEAR_ALGEBRA_B2_CONTRACT}],justification:native.justification,domainPayload:native};
  }
  if (problem.domain === "probability-statistics") {
    if (!Array.isArray(studentWorking)) return malformed("probability-statistics","B1 working must contain structured steps");
    const native=assessProbabilityStatistics(problem,studentWorking as B1Step[]);
    return {contractVersion:UNIFIED_MATH_CONTRACT,domain:"probability-statistics",classification:native.classification,correct:native.correct,complete:native.complete,firstInvalidStep:native.firstInvalidStep,steps:native.steps.map(s=>({index:s.index,classification:s.classification,justification:s.justification,reasoner:"probability-statistics:b1",dependencies:s.dependencies})),proofDependencies:native.steps.map(s=>s.dependencies),domainRestrictions:native.domainRestrictions,outstandingObligations:native.outstandingObligations,skills:native.skills,reasoners:[{id:"probability-statistics:b1",version:PROBABILITY_B1_CONTRACT}],justification:native.justification,domainPayload:native};
  }
  if (problem.domain === "symbolic") {
    if (!Array.isArray(studentWorking) || studentWorking.some(x=>!x||typeof x!=="object")) return malformed("symbolic","symbolic working must contain structured steps");
    const native=assessSymbolicWorking(problem,studentWorking as SymbolicStep[],options.symbolicBudget);
    return {contractVersion:UNIFIED_MATH_CONTRACT,domain:"symbolic",classification:native.classification,correct:native.correct,complete:native.complete,firstInvalidStep:native.firstInvalidStep,steps:native.steps.map(s=>({index:s.index,classification:s.classification,justification:s.justification,reasoner:"symbolic:m3",dependencies:s.dependencies})),proofDependencies:native.steps.map(s=>s.dependencies),domainRestrictions:native.domainRestrictions,outstandingObligations:native.outstandingObligations,skills:native.skills,reasoners:[{id:"symbolic:m3",version:SYMBOLIC_EQUIVALENCE_CONTRACT}],justification:native.justification,domainPayload:native};
  }
  if (problem.domain === "m2-cross-domain") {
    if (!studentWorking || Array.isArray(studentWorking) || !("stages" in studentWorking) || !Array.isArray(studentWorking.stages)) return malformed("m2-cross-domain","cross-domain working must contain structured stages");
    const requestedLimit=options.maxCrossDomainStages??D2_MAX_STAGES,maxStages=Math.max(1,Math.min(requestedLimit,D2_MAX_STAGES));
    if (!Array.isArray(problem.stages) || problem.stages.length===0 || problem.stages.length>maxStages) return {...malformed("m2-cross-domain",`cross-domain proof requires 1 to ${maxStages} stages`),classification:problem.stages?.length>maxStages?"resource-exhausted":"malformed"};
    const submittedIds=studentWorking.stages.map(stage=>stage.id);
    if(new Set(submittedIds).size!==submittedIds.length||submittedIds.some(id=>!problem.stages.some(stage=>stage.id===id)))return malformed("m2-cross-domain","submitted stages must be unique and declared by the problem");
    const ids=new Set<string>(),proofState=new D2ProofState(),steps:AssessmentStep[]=[],restrictions:string[]=[],obligations:string[]=[],skills:string[]=[],reasoners:AssessmentEnvelope["reasoners"]=[],payload:unknown[]=[];let offset=0;
    for(const stage of problem.stages){
      const dependencyErrors=proofState.checkDependencies(stage.id,stage.dependsOn);
      if(dependencyErrors.length||!stage.id||ids.has(stage.id))return {...malformed("m2-cross-domain","stage dependencies must be unique, acyclic, and refer to established stages"),firstInvalidStep:offset,outstandingObligations:dependencyErrors};
      ids.add(stage.id);const submitted=studentWorking.stages.find(x=>x.id===stage.id);if(!submitted)return {contractVersion:UNIFIED_MATH_CONTRACT,domain:"m2-cross-domain",classification:"incomplete",correct:null,complete:false,firstInvalidStep:null,steps,proofDependencies:steps.map(x=>x.dependencies),domainRestrictions:restrictions,outstandingObligations:[`complete stage ${stage.id}`],skills,reasoners,justification:`stage ${stage.id} is incomplete`,domainPayload:payload};
      const result=await assessCandidate(stage.problem,submitted.working as StudentWorking,options);payload.push({id:stage.id,assessment:result.domainPayload});restrictions.push(...result.domainRestrictions);obligations.push(...result.outstandingObligations);skills.push(...result.skills);reasoners.push(...result.reasoners);
      steps.push(...result.steps.map(x=>({...x,index:x.index+offset,dependencies:[...stage.dependsOn,...x.dependencies]})));
      if(result.classification!=="verified")return {contractVersion:UNIFIED_MATH_CONTRACT,domain:"m2-cross-domain",classification:result.classification,correct:result.correct,complete:false,firstInvalidStep:result.firstInvalidStep===null?null:offset+result.firstInvalidStep,steps,proofDependencies:steps.map(x=>x.dependencies),domainRestrictions:[...new Set(restrictions)],outstandingObligations:obligations,skills:[...new Set(skills)],reasoners:[...new Map(reasoners.map(x=>[`${x.id}:${x.version}`,x])).values(),{id:"unified:m2-proof-state",version:"1"}],justification:`stage ${stage.id}: ${result.justification}`,domainPayload:payload};
      const transferErrors=proofState.establish(stage.id,stage.dependsOn,result,offset);
      if(transferErrors.length)return {...malformed("m2-cross-domain",`stage ${stage.id} proof transfer is unverifiable`),classification:"unsupported",steps,firstInvalidStep:null,outstandingObligations:transferErrors,domainPayload:{stages:payload,proofState:proofState.snapshot(stage.id)}};
      offset=steps.length;
    }
    return {contractVersion:UNIFIED_MATH_CONTRACT,domain:"m2-cross-domain",classification:"verified",correct:true,complete:true,firstInvalidStep:null,steps,proofDependencies:steps.map(x=>x.dependencies),domainRestrictions:[...new Set(restrictions)],outstandingObligations:obligations,skills:[...new Set(skills)],reasoners:[...new Map(reasoners.map(x=>[`${x.id}:${x.version}`,x])).values(),{id:"unified:d2-proof-state",version:D2_PROOF_STATE_VERSION}],justification:"all bounded cross-domain stages, mathematical results, and dependency transfers are independently verified",domainPayload:{stages:payload,proofState:proofState.snapshot(problem.stages.at(-1)?.id??null)}};
  }
  if (["inequality","quadratic","function","coordinate"].includes((problem as any).domain)) {
    if (!Array.isArray(studentWorking) || studentWorking.some(x=>!x||typeof x!=="object")) return malformed((problem as M1Problem).domain,"M1 working must contain structured mathematical steps");
    const native=assessDomainWorking(problem as M1Problem,studentWorking as M1Step[]);
    return {contractVersion:UNIFIED_MATH_CONTRACT,domain:native.domain,classification:native.classification,correct:native.correct,complete:native.complete,firstInvalidStep:native.firstInvalidStep,steps:native.steps.map(s=>({index:s.index,classification:s.classification,justification:s.justification,reasoner:"math-domains-m1",dependencies:s.index?[s.index-1]:["problem"]})),proofDependencies:native.steps.map(s=>s.index?[s.index-1]:["problem"]),domainRestrictions:native.domainRestrictions,outstandingObligations:native.outstandingObligations,skills:native.skills,reasoners:[{id:"math-domains-m1",version:M1_CONTRACT}],justification:native.justification,domainPayload:native};
  }
  if (["trigonometry","exponential-log","sequence-series","radical"].includes((problem as any).domain)) {
    if (!Array.isArray(studentWorking) || studentWorking.some(x=>!x||typeof x!=="object")) return malformed((problem as M2Problem).domain,"M2 working must contain structured mathematical steps");
    const native=assessM2Working(problem as M2Problem,studentWorking as M2Step[]);
    return {contractVersion:UNIFIED_MATH_CONTRACT,domain:native.domain,classification:native.classification,correct:native.correct,complete:native.complete,firstInvalidStep:native.firstInvalidStep,steps:native.steps.map(s=>({index:s.index,classification:s.classification,justification:s.justification,reasoner:"math-domains-m2",dependencies:s.dependencies})),proofDependencies:native.steps.map(s=>s.dependencies),domainRestrictions:native.domainRestrictions,outstandingObligations:native.outstandingObligations,skills:native.skills,reasoners:[{id:"math-domains-m2",version:M2_CONTRACT}],justification:native.justification,domainPayload:native};
  }
  if ((problem as any).domain === "calculus" && ["substitution","integration-by-parts","partial-fractions","lhopital","piecewise-integral","improper-family"].includes((problem as any).task)) {
    if (!Array.isArray(studentWorking) || studentWorking.some(x=>!x||typeof x!=="object")) return malformed("calculus","calculus-method working must contain structured steps");
    const native=assessCalculusMethodWorking(problem as CalculusMethodProblem,studentWorking as CalculusMethodStep[]);
    return {contractVersion:UNIFIED_MATH_CONTRACT,domain:"calculus",classification:native.classification,correct:native.correct,complete:native.complete,firstInvalidStep:native.firstInvalidStep,steps:native.steps.map(s=>({index:s.index,classification:s.classification,justification:s.justification,reasoner:"calculus:methods",dependencies:s.dependencies})),proofDependencies:native.steps.map(s=>s.dependencies),domainRestrictions:native.domainRestrictions,outstandingObligations:native.outstandingObligations,skills:native.skills,reasoners:[{id:"calculus:methods",version:CALCULUS_METHODS_CONTRACT}],justification:native.justification,domainPayload:native};
  }
  if ((problem as any).domain === "calculus") {
    if (!Array.isArray(studentWorking) || studentWorking.some(x=>!x||typeof x!=="object")) return malformed("calculus","calculus working must contain structured mathematical steps");
    const native=assessCalculusWorking(problem as CalculusProblem,studentWorking as CalculusStep[]);
    return {contractVersion:UNIFIED_MATH_CONTRACT,domain:"calculus",classification:native.classification,correct:native.correct,complete:native.complete,firstInvalidStep:native.firstInvalidStep,steps:native.steps.map(s=>({index:s.index,classification:s.classification,justification:s.justification,reasoner:"calculus:exact",dependencies:s.dependencies})),proofDependencies:native.steps.map(s=>s.dependencies),domainRestrictions:native.domainRestrictions,outstandingObligations:native.outstandingObligations,skills:native.skills,reasoners:[{id:"calculus:exact",version:CALCULUS_CONTRACT}],justification:native.justification,domainPayload:native};
  }
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

/* ======================================================================================================
 * E3 mandatory acceptance gate. assessCandidate() (above) only PROPOSES a verdict; this boundary is the single
 * authority that may let a solution through as "verified" (see acceptance-gate.ts for the rules).
 * ====================================================================================================== */
const isNaturalInput = (w: unknown): w is NaturalWorkingInput => !!w && !Array.isArray(w) && typeof w === "object" && "format" in (w as object) && "text" in (w as object);
const gateRecord = (route: AcceptanceGateRecord["route"], cand: AssessmentEnvelope, extra: Partial<AcceptanceGateRecord> = {}): AcceptanceGateRecord => ({ contract: ACCEPTANCE_GATE_CONTRACT, route, candidateClassification: cand.classification, verdict: cand.classification, independentlyVerified: false, level: "none", source: "candidate-unchanged", evidence: [], obligations: [], reconciliation: "", checker: null, ...extra });
function withdrawAcceptance(cand: AssessmentEnvelope, route: AcceptanceGateRecord["route"], source: AcceptanceGateRecord["source"], why: string, evidence: GateEvidenceItem[] = [], checker: AcceptanceGateRecord["checker"] = null): AssessmentEnvelope {
  return { ...cand, classification: "unsupported", correct: null, complete: false, justification: `acceptance withdrawn: ${why}`, outstandingObligations: [...cand.outstandingObligations, why], acceptanceGate: gateRecord(route, cand, { verdict: "unsupported", source, evidence, obligations: [why], reconciliation: why, checker }) };
}
function gateAlgebraText(statement: string, parsed: NaturalParseResult, rawText: string, cand: AssessmentEnvelope): AssessmentEnvelope {
  if (parsed.classification !== "parsed") return cand.classification === "verified" ? withdrawAcceptance(cand, "algebra-text", "downgraded-no-independent-evidence", "the working could not be parsed for independent verification") : { ...cand, acceptanceGate: gateRecord("algebra-text", cand, { reconciliation: "the working is not parsed; nothing is accepted" }) };
  const check = checkAlgebraSubmission(statement, parsed), dec = reconcileAlgebra(cand.classification, check);
  const evidence = evidenceFromCheck(check), summary = checkerSummary(check);
  const allU4 = evidence.length > 0 && evidence.every((e) => e.checker === "u4+exact-solution-set" || e.checker === "u4-identity" || e.checker === "exact-arithmetic");
  const level: GateLevel = dec.classification === "verified" ? (allU4 && check.u4Steps > 0 && check.exactSteps === 0 ? "u4-kernel" : "independent-exact-checker") : "none";
  const record = gateRecord("algebra-text", cand, { verdict: dec.classification, independentlyVerified: dec.classification === "verified", level, source: dec.source, evidence, obligations: check.obligations, reconciliation: dec.why, checker: summary });
  if (!dec.adoptChecker) {
    if (dec.classification === cand.classification) return { ...cand, acceptanceGate: record };
    return { ...cand, classification: dec.classification as Classification, correct: null, complete: false, justification: `acceptance withdrawn: ${dec.why}`, outstandingObligations: [...cand.outstandingObligations, dec.why], acceptanceGate: record };
  }
  const accounts: AccountEntry[] = parsed.lines.map((l, i) => ({ lineId: l.id, role: "claim-step" as const, stepIndex: i, dependsOn: i ? [parsed.lines[i - 1].id] : [] }));
  const outcomes = parsed.lines.map((_, i) => { const st = checkerStatusToStep(check.lines[i]?.status ?? "inconclusive"); return st && check.lines[i]?.status !== "inconclusive" ? { classification: st as StepClassification, justification: check.lines[i].detail } : undefined; });
  const account = buildLineAccount(parsed, accounts, outcomes, rawText, []);
  const steps: AssessmentStep[] = account.records.map((r, index) => ({ index, classification: lineClass(r.status), justification: r.reason, reasoner: "independent-checker", dependencies: index ? [index - 1] : ["problem"], source: parsed.lines[index].source }));
  const cls = dec.classification as Classification, payload = (cand.domainPayload && typeof cand.domainPayload === "object" ? cand.domainPayload : {}) as Record<string, unknown>;
  return { ...cand, classification: cls, correct: cls === "verified" ? true : cls === "invalid" ? false : null, complete: cls === "verified", firstInvalidStep: check.firstInvalidStep, steps, proofDependencies: steps.map((s) => s.dependencies),
    domainRestrictions: [...new Set([...cand.domainRestrictions, ...check.restrictions])], outstandingObligations: check.obligations, justification: check.justification,
    reasoners: [...cand.reasoners, { id: "independent-checker", version: INDEPENDENT_CHECKER_VERSION }], domainPayload: { ...payload, naturalInput: parsed, lineAccount: account, independentCheck: check }, acceptanceGate: record };
}
const INDEPENDENT_CHECKER_VERSION = "openpath-independent-algebra-checker@1";
function gateConverted(cand: AssessmentEnvelope, payload: { lineAccount?: LineAccount; bindingEvidence?: BindingEvidence[] }): AssessmentEnvelope {
  const ev = payload.bindingEvidence ?? [], account = payload.lineAccount;
  const evidence: GateEvidenceItem[] = ev.map((e) => ({ line: e.line, claim: e.claim, checker: e.checker, scope: e.scope, outcome: e.outcome, digest: e.digest ?? null }));
  if (cand.classification !== "verified") return { ...cand, acceptanceGate: gateRecord("adapter-converted", cand, { evidence, reconciliation: "the candidate did not accept" }) };
  const claims = account?.records.filter((r) => r.role === "claim-step") ?? [];
  const problems: string[] = [];
  if (!account) problems.push("no per-line account");
  else {
    if (account.violations.length) problems.push(`account violations: ${account.violations.join("; ")}`);
    if (account.unaccounted.length) problems.push("unaccounted lines");
    const unresolved = account.records.filter((r) => r.status !== "verified-valid" && r.status !== "not-mathematical"); if (unresolved.length) problems.push(`line ${unresolved[0].line} is ${unresolved[0].status}`);
    if (!claims.length) problems.push("no claim-step was produced");
    for (const r of claims) if (!ev.some((e) => e.lineId === r.id && e.outcome === "verified")) problems.push(`line ${r.line} has no independently verified binding evidence`);
  }
  if (problems.length) return withdrawAcceptance(cand, "adapter-converted", "downgraded-no-independent-evidence", problems.join("; "), evidence);
  const level: GateLevel = ev.every((e) => e.checker === "u4-kernel") ? "u4-kernel" : "claim-recheck+destination-reasoner";
  return { ...cand, acceptanceGate: gateRecord("adapter-converted", cand, { verdict: "verified", independentlyVerified: true, level, source: "agreement", evidence, reconciliation: "every claim-step is bound to its source line and independently re-verified" }) };
}
function gateStructured(cand: AssessmentEnvelope): AssessmentEnvelope {
  const evidence: GateEvidenceItem[] = [{ line: null, claim: "all typed steps", checker: [...new Set(cand.reasoners.map((r) => r.id))].join("+"), scope: "typed domain reasoner (exact arithmetic); no natural-language adapter in the path", outcome: cand.classification }];
  if (cand.classification !== "verified") return { ...cand, acceptanceGate: gateRecord("structured-typed", cand, { evidence, reconciliation: "the candidate did not accept" }) };
  const bad = cand.steps.find((s) => s.classification !== "verified");
  if (bad) return withdrawAcceptance(cand, "structured-typed", "downgraded-unresolved-lines", `step ${bad.index + 1} is ${bad.classification}, so the solution cannot be certified`, evidence);
  if (cand.outstandingObligations.some((o) => /unresolved|unsupported|inconclusive/i.test(o))) return withdrawAcceptance(cand, "structured-typed", "downgraded-unresolved-lines", "an unresolved proof obligation remains", evidence);
  return { ...cand, acceptanceGate: gateRecord("structured-typed", cand, { verdict: "verified", independentlyVerified: true, level: "domain-reasoner", source: "agreement", evidence, reconciliation: "every typed step was verified by its domain reasoner" }) };
}
function applyAcceptanceGate(problem: MathematicalProblem, working: StudentWorking, cand: AssessmentEnvelope): AssessmentEnvelope {
  const textProblem = problem && typeof problem === "object" && "statement" in problem && typeof (problem as { statement: unknown }).statement === "string";
  if (isNaturalInput(working)) {
    const payload = (cand.domainPayload && typeof cand.domainPayload === "object" ? cand.domainPayload : {}) as { naturalInput?: NaturalParseResult; bindingEvidence?: BindingEvidence[]; lineAccount?: LineAccount };
    if (payload.bindingEvidence) return gateConverted(cand, payload);
    if (textProblem) return gateAlgebraText((problem as { statement: string }).statement, payload.naturalInput ?? parseNaturalWorking(working), working.text, cand);
    if (cand.classification === "verified") return withdrawAcceptance(cand, "natural-other", "downgraded-no-independent-evidence", "a natural-language working was accepted without any independent verifier");
    return { ...cand, acceptanceGate: gateRecord("natural-other", cand, { reconciliation: "the candidate did not accept" }) };
  }
  if (textProblem && Array.isArray(working) && working.every((x) => typeof x === "string")) {
    const text = (working as string[]).join("\n");
    return gateAlgebraText((problem as { statement: string }).statement, parseNaturalWorking({ format: "natural", text }), text, cand);
  }
  return gateStructured(cand);
}
/**
 * E7 claim accounting. The ledger is built from the raw text, independently of every parser, and each claim must be covered by a verified,
 * credited record. This step can withdraw an acceptance (or report a demonstrably contradicted submission as invalid); it never grants one.
 */
function certifyClaims(problem: MathematicalProblem, working: StudentWorking, cand: AssessmentEnvelope): AssessmentEnvelope {
  if (!isNaturalInput(working)) return cand;
  const payload = (cand.domainPayload && typeof cand.domainPayload === "object" ? cand.domainPayload : {}) as { lineAccount?: LineAccount };
  const records: CoverageRecord[] = payload.lineAccount
    ? payload.lineAccount.records.map((r) => ({ line: r.line, start: r.span.start, end: r.span.end, verified: r.status === "verified-valid" || r.status === "not-mathematical", credited: r.role === "claim-step" || r.role === "given-matched", reason: r.reason }))
    : cand.steps.filter((s) => s.source).map((s) => ({ line: s.source!.line, start: s.source!.start, end: s.source!.end, verified: s.classification === "verified", credited: true, reason: s.justification }));
  const ctx0 = buildProofContext(problem);
  const lv = evaluateLedger(problem, working.text, records, (cs, t) => relateStudentRestriction(ctx0, cs, t));
  // E7 Phase 3: provenance of each claim. It is read from the grounding the checker recorded; a claim without recorded grounding is only "unrecorded" (never promoted)
  const evid = ((cand.domainPayload && typeof cand.domainPayload === "object" ? (cand.domainPayload as { bindingEvidence?: BindingEvidence[] }).bindingEvidence : undefined) ?? []);
  const provenance = lv.summary.map((c) => {
    if (c.kind === "assumption") return { ...c, provenance: /task-supplied/.test(c.reason) ? "task-premise" : c.outcome === "proven" ? "student-assumption" : "unresolved" };
    const g = evid.find((e) => e.line === c.line && e.grounding)?.grounding;
    if (c.outcome !== "proven") return { ...c, provenance: "unsupported" };
    return g ? { ...c, provenance: g.relevant ? "derived-from-task" : "ungrounded", grounding: { relevant: g.relevant, reason: g.reason, sources: g.sources.map((x) => `${x.kind}:${x.ref}`) } } : { ...c, provenance: "unrecorded" };
  });
  // E7 Phase 4: the certification boundary re-checks that every route saw the SAME context and reports what the context holds with provenance kinds kept apart
  const uses = ((cand.domainPayload as { proofContextUse?: RouteUse[] } | undefined)?.proofContextUse) ?? [];
  // E7 Phase 5: per-claim obligations. Only fully proven (and grounded) claims become proved facts; unsupported / unresolved / disproven ones never do.
  const obs: ObligationSet = buildObligations({
    text: working.text, claims: lv.ledger.claims.map((c) => ({ line: c.line, start: c.start, end: c.end, text: c.text, kind: c.kind, outcome: c.outcome, reason: c.reason })), relations: lv.relations,
    records: payload.lineAccount ? payload.lineAccount.records.map((r) => ({ role: r.role, text: r.text, id: r.id, line: r.line, span: r.span, status: r.status, dependencies: r.dependencies, premiseEligible: r.premiseEligible, reason: r.reason })) : [],
    evidence: cand.acceptanceGate?.evidence ?? [], grounded: uses.flatMap((u) => u.grounded ?? []),
    verdict: { classification: cand.classification, complete: cand.complete, independentlyVerified: cand.acceptanceGate?.independentlyVerified ?? false, route: cand.acceptanceGate?.route ?? "natural-other", justification: cand.justification },
  });
  const finalCtx = withUnresolved(
    withStudent(withProved(ctx0, obs.proved), lv.relations.map((r) => ({ text: r.text, line: r.line, relation: r.relation as never, coveredBranches: r.coveredBranches, obligation: r.obligation }))),
    uses.flatMap((u) => u.grounded ?? []).flatMap((e) => e.grounding.sources.filter((x) => x.kind === "student-assumption").map((x) => ({ text: `the working relies on the quantity ${x.ref}; nothing in the task supplies it, so it is a missing scenario premise, not evidence`, origin: `line-${e.line}` }))));
  const ctxReport = { contract: finalCtx.contract, taskDigest: finalCtx.digest, routesShareContext: uses.every((u) => u.contextDigest === finalCtx.digest), routes: uses,
    task: { premises: finalCtx.premises.length, restrictions: finalCtx.restrictions, domainBranches: finalCtx.branches, assumptions: finalCtx.assumptions, impliedRestrictions: finalCtx.implied.map((i) => i.text), unreadable: finalCtx.unreadable },
    provedFacts: finalCtx.proved.map((i) => ({ origin: i.origin, text: i.text })), studentAssumptions: finalCtx.student, unresolvedPremises: finalCtx.unresolved.map((i) => ({ origin: i.origin, text: i.text })) };
  const withLedger = (c: AssessmentEnvelope): AssessmentEnvelope => ({ ...c, domainPayload: { ...(c.domainPayload && typeof c.domainPayload === "object" ? c.domainPayload : {}), claimLedger: { contract: CLAIM_LEDGER_CONTRACT, claims: provenance }, proofContext: ctxReport, proofObligations: obs } });
  if (lv.disproven.length && ["verified", "incomplete", "missing-assumption"].includes(cand.classification)) {
    const c = lv.disproven[0], idx = Math.max(0, cand.steps.findIndex((s) => s.source?.line === c.line));
    const steps = cand.steps.map((s, k) => (k === idx ? { ...s, classification: "invalid" as Classification, justification: c.reason } : s));
    return withLedger({ ...cand, classification: "invalid", correct: false, complete: false, firstInvalidStep: idx, steps, justification: `line ${c.line}: ${c.reason}`, outstandingObligations: [...cand.outstandingObligations, c.reason], acceptanceGate: cand.acceptanceGate ? { ...cand.acceptanceGate, verdict: "invalid", obligations: [c.reason] } : cand.acceptanceGate });
  }
  if (cand.classification === "verified" && lv.unfinished.length && !lv.blocking.length) {
    const u = lv.unfinished[0], why = `line ${u.line} states that the working is unfinished ("${u.text}")`;
    return withLedger({ ...cand, classification: "incomplete", correct: null, complete: false, justification: why, outstandingObligations: [...cand.outstandingObligations, why], acceptanceGate: cand.acceptanceGate ? { ...cand.acceptanceGate, verdict: "incomplete", obligations: [why] } : cand.acceptanceGate });
  }
  if (cand.classification === "verified" && !lv.blocking.length && obs.blocking.length) {
    const o = obs.blocking[0], why = `proof obligation ${o.id} (${o.kind}, line ${o.line ?? "-"}) is ${o.status}: ${o.reason}`;
    return withLedger(withdrawAcceptance(cand, (cand.acceptanceGate?.route ?? "natural-other") as AcceptanceGateRecord["route"], "downgraded-unresolved-lines", why, cand.acceptanceGate?.evidence ?? []));
  }
  if (cand.classification !== "verified" || !lv.blocking.length) return withLedger(cand);
  const why = `claim accounting: ${lv.blocking.length} recognized claim(s) are not proven (line ${lv.blocking[0].line}: ${lv.blocking[0].reason})`;
  return withLedger(withdrawAcceptance(cand, (cand.acceptanceGate?.route ?? "natural-other") as AcceptanceGateRecord["route"], "downgraded-unresolved-lines", why, cand.acceptanceGate?.evidence ?? []));
}
export async function assessMathematicalWorking(problem: MathematicalProblem, studentWorking: StudentWorking, options: AssessOptions = {}): Promise<AssessmentEnvelope> {
  const candidate = await assessCandidate(problem, studentWorking, options);
  try { return certifyClaims(problem, studentWorking, applyAcceptanceGate(problem, studentWorking, candidate)); }
  catch (e) { return withdrawAcceptance(candidate, "natural-other", "downgraded-no-independent-evidence", `the acceptance gate could not complete (${e instanceof Error ? e.message : "error"}); nothing is accepted`); }
}
