/** Unified mathematics assessment U1. Thin dispatch only; native engines remain authoritative. */
import { assessWorking, type WorkingOptions } from "./core/working-assessment.ts";
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
import { NATURAL_ADAPTER_CONTRACT, adaptNaturalWorking } from "./natural-domain-adapters.ts";

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
export interface AssessOptions extends WorkingOptions { maxRuleApplications?: number; python?: string; geometryRoot?: string; geometryTimeoutMs?: number; geometryWorkerCount?: number; geometryQueueLimit?: number; signal?: AbortSignal; symbolicBudget?: SymbolicBudget; maxCrossDomainStages?: number }
export interface AssessmentStep { index: number; classification: Classification; justification: string; reasoner: string; dependencies: unknown[]; source?:SourceLocation }
export interface AssessmentEnvelope { contractVersion: typeof UNIFIED_MATH_CONTRACT; domain: "arithmetic" | "algebra" | "geometry" | "mixed" | "m2-cross-domain" | "d3-cross-domain" | M1Problem["domain"] | M2Problem["domain"] | "calculus" | "symbolic" | "probability-statistics" | "linear-algebra" | "complex-polynomial"; classification: Classification; correct: true | false | null; complete: boolean; firstInvalidStep: number | null; steps: AssessmentStep[]; proofDependencies: unknown[]; domainRestrictions: string[]; outstandingObligations: string[]; skills: string[]; reasoners: { id: string; version: string }[]; justification: string; domainPayload: unknown; failureKind?: "transport" | "mathematical"; infrastructureFailure?: GeometryFailureCode }
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
  if(studentWorking&&!Array.isArray(studentWorking)&&"format" in studentWorking&&"text" in studentWorking){
    const parsed=parseNaturalWorking(studentWorking as NaturalWorkingInput),domain=(problem.domain==="symbolic"?"symbolic":problem.domain==="auto"||problem.domain==="arithmetic"||problem.domain==="algebra"||!("domain" in problem)?"algebra":problem.domain) as AssessmentEnvelope["domain"];
    if(parsed.classification!=="parsed"){return{...malformed(domain,parsed.message),classification:parsed.classification,domainPayload:{naturalInput:parsed},reasoners:[{id:"natural-working-parser",version:NATURAL_WORKING_CONTRACT}]}}
    let assessed:AssessmentEnvelope;
    if("statement" in problem){assessed=textAssessment(problem,parsed.lines.map(x=>x.source.text),options);const square=problem.statement.replace(/\s/g,"").match(/^([A-Za-z][A-Za-z0-9_]*)\^2=(\d+)$/),single=parsed.lines.length===1?parsed.lines[0].source.text.replace(/\s/g,"").match(/^([A-Za-z][A-Za-z0-9_]*)=(-?\d+)$/):null;if(assessed.classification==="invalid"&&square&&single&&square[1]===single[1]&&Number(single[2])**2===Number(square[2])&&Number(square[2])>0)assessed={...assessed,classification:"incomplete",correct:null,complete:false,firstInvalidStep:null,justification:"one square-root branch is valid, but the opposite root is still required",outstandingObligations:[`include both ${square[1]} = ${Math.abs(Number(single[2]))} and ${square[1]} = ${-Math.abs(Number(single[2]))}`],steps:assessed.steps.map(step=>({...step,classification:"verified",justification:"this is one valid solution branch"}))}}
    else if(problem.domain==="symbolic"){
      const unsupported=parsed.lines.find(line=>!["expression","equation"].includes(line.relation.kind));if(unsupported)return{...malformed(domain,`line ${unsupported.source.line} has no lossless symbolic adapter`),classification:"unsupported",domainPayload:{naturalInput:parsed},reasoners:[{id:"natural-working-parser",version:NATURAL_WORKING_CONTRACT}]};
      const steps:SymbolicStep[]=parsed.lines.map((line,index)=>({id:line.id,expression:line.relation.kind==="equation"?equationAsExpression(line.relation):line.relation.expression,dependencies:index?[parsed.lines[index-1].id]:undefined,...(line.restrictions?.length?{carriedRestrictions:naturalRestrictionKeys(line)}:{})}));
      assessed=await assessMathematicalWorking(problem,steps,options);
    }else{const adapted=adaptNaturalWorking(problem,parsed);if(adapted.outcome!=="converted"){const classification:Classification=adapted.outcome==="missing-assumption"?"missing-assumption":adapted.outcome==="ambiguous"?"ambiguous":adapted.outcome==="resource-exhausted"?"resource-exhausted":"unsupported";return{...malformed(domain,adapted.message),classification,outstandingObligations:adapted.obligations??[adapted.message],domainPayload:{naturalInput:parsed,conversion:adapted},reasoners:[{id:"natural-working-parser",version:NATURAL_WORKING_CONTRACT},{id:"natural-domain-adapter",version:NATURAL_ADAPTER_CONTRACT}]}}assessed=await assessMathematicalWorking(adapted.problem as MathematicalProblem,adapted.working as StudentWorking,options);return{...assessed,domain,steps:assessed.steps.map((step,index)=>({...step,source:adapted.sourceMap[index]})),reasoners:[{id:"natural-working-parser",version:NATURAL_WORKING_CONTRACT},{id:`natural-adapter:${adapted.evidence.adapter}`,version:NATURAL_ADAPTER_CONTRACT},...assessed.reasoners],domainPayload:{naturalInput:parsed,conversion:adapted.evidence,assessment:assessed.domainPayload}}}
    return{...assessed,steps:assessed.steps.map((step,index)=>({...step,source:parsed.lines[index]?.source})),reasoners:[{id:"natural-working-parser",version:NATURAL_WORKING_CONTRACT},...assessed.reasoners],domainPayload:{naturalInput:parsed,assessment:assessed.domainPayload}};
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
      const result=await assessMathematicalWorking(resolved.problem!,submitted.working as StudentWorking,options);restrictions.push(...result.domainRestrictions);obligations.push(...result.outstandingObligations);skills.push(...result.skills);reasoners.push(...result.reasoners);payload.push({id:stage.id,assessment:result.domainPayload,usedBindings:resolved.used});steps.push(...result.steps.map(step=>({...step,index:step.index+offset,dependencies:[...stage.dependsOn,...resolved.used,...step.dependencies]})));
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
      const result=await assessMathematicalWorking(stage.problem,submitted.working as StudentWorking,options);payload.push({id:stage.id,assessment:result.domainPayload});restrictions.push(...result.domainRestrictions);obligations.push(...result.outstandingObligations);skills.push(...result.skills);reasoners.push(...result.reasoners);
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
