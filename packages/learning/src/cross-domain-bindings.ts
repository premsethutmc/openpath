import type { AssessmentEnvelope, MathematicalProblem, StudentWorking } from "./unified-math-engine";
import { canonicalizeMathematicalObject } from "./canonical-math-ir";

export const D3_BINDING_CONTRACT = "openpath-mathematical-binding@1" as const;
export const D3_BINDING_KERNEL = "openpath-proof-kernel-binding@1" as const;
export const D3_MAX_BINDINGS = 64;
export const D3_MAX_SUBSTITUTION_DEPTH = 16;
export const D3_MAX_SUBSTITUTION_NODES = 256;

export type BindingType = "exact-scalar" | "symbolic-expression" | "equation" | "inequality" | "interval" | "finite-solution-set" | "vector" | "matrix" | "geometric-relation" | "probability" | "calculus-expression";
export interface SymbolIdentity { name: string; scope: string }
export interface BindingSource { workingPath: string[]; proofStepId: string }
export interface BindingExport { id: string; mathematicalType: BindingType; symbol: SymbolIdentity; source: BindingSource; assumptions: string[]; domainRestrictions: string[]; outstandingObligations: string[] }
export interface BindingImport { bindingId: string; expectedType: BindingType; symbol: SymbolIdentity; dimensions?: number[] }
export interface BindingReference { kind: "binding-reference"; bindingId: string; expectedType: BindingType; symbol: SymbolIdentity; dimensions?: number[] }
export interface D3Stage { id: string; problem: MathematicalProblem; dependsOn: string[]; exports?: BindingExport[]; imports?: BindingImport[] }
export interface D3Problem { domain: "d3-cross-domain"; stages: D3Stage[] }
export interface D3Working { stages: { id: string; working: StudentWorking }[] }
export interface MathematicalBinding { contractVersion: typeof D3_BINDING_CONTRACT; id: string; mathematicalType: BindingType; symbol: SymbolIdentity; value: unknown; sourceStageId: string; sourceProofStepId: string; assumptions: string[]; domainRestrictions: string[]; dependencies: string[]; outstandingObligations: string[]; proofVerificationStatus: "verified"; semanticIdentity:string; verification:{kernel:typeof D3_BINDING_KERNEL;rule:"verified-source-substitution"} }
export interface BindingFailure { classification: "invalid" | "missing-assumption" | "unsupported" | "resource-exhausted"; explanation: string }

const exactString=(value:unknown):string|null=>typeof value==="string"&&/^-?\d+(?:\/\d+)?$/.test(value)?value:typeof value==="number"&&Number.isSafeInteger(value)?String(value):null;
const sameSymbol=(a:SymbolIdentity,b:SymbolIdentity)=>a.name===b.name&&a.scope===b.scope;
const pathValue=(root:unknown,path:string[])=>{let value:any=root;for(const part of path){if(value===null||value===undefined||!(part in Object(value)))return undefined;value=value[part]}return value};

function normalize(type:BindingType,raw:any):unknown|null{
  if(type==="exact-scalar"||type==="probability"){
    const value=exactString(raw)??exactString(raw?.value)??exactString(raw?.value?.rational);
    if(!value)return null;
    if(type==="probability"){const[n,d="1"]=value.split("/").map(BigInt);if(d===0n||n<0n||n>d)return null}
    return{kind:type,value};
  }
  if(type==="vector"&&raw?.kind==="vector"&&Array.isArray(raw.value)&&raw.value.every((x:unknown)=>exactString(x)))return{kind:type,value:raw.value.map(String),dimension:raw.value.length};
  if(type==="matrix"&&raw?.kind==="matrix"&&Array.isArray(raw.value)&&raw.value.length&&raw.value.every((r:unknown)=>Array.isArray(r))){const rows=raw.value as unknown[][],columns=rows[0].length;if(!columns||rows.some(r=>r.length!==columns||r.some(x=>!exactString(x))))return null;return{kind:type,value:rows.map(r=>r.map(String)),rows:rows.length,columns}}
  if(type==="interval"&&raw?.kind==="solution-set"&&Array.isArray(raw.intervals))return{kind:type,value:raw.intervals};
  if(type==="finite-solution-set"&&(raw?.kind==="complex-set"||raw?.kind==="roots"||raw?.kind==="solutions"))return{kind:type,value:raw.values};
  if((type==="symbolic-expression"||type==="calculus-expression")&&raw&&typeof raw==="object")return{kind:type,value:raw.value??raw.expression??raw};
  if((type==="equation"||type==="inequality"||type==="geometric-relation")&&raw&&typeof raw==="object")return{kind:type,value:raw};
  return null;
}

function destinationValue(binding:MathematicalBinding,expected:BindingType,dimensions?:number[]):unknown|BindingFailure{
  if(binding.mathematicalType===expected){
    const value:any=binding.value;
    if(dimensions&&expected==="vector"&&dimensions[0]!==value.dimension)return{classification:"invalid",explanation:`binding ${binding.id} has vector dimension ${value.dimension}, not ${dimensions[0]}`};
    if(dimensions&&expected==="matrix"&&(dimensions[0]!==value.rows||dimensions[1]!==value.columns))return{classification:"invalid",explanation:`binding ${binding.id} has matrix dimensions ${value.rows}x${value.columns}`};
    if(expected==="exact-scalar"||expected==="probability")return value.value;
    return value.value;
  }
  if(binding.mathematicalType==="probability"&&expected==="exact-scalar")return (binding.value as any).value;
  return{classification:"invalid",explanation:`binding ${binding.id} has type ${binding.mathematicalType}, not ${expected}`};
}

export class MathematicalBindingStore{
  readonly bindings=new Map<string,MathematicalBinding>();conversionAttempts=0;

  export(stageId:string,declaration:BindingExport,working:StudentWorking,assessment:AssessmentEnvelope,dependencies:string[]):BindingFailure|null{
    if(this.bindings.size>=D3_MAX_BINDINGS)return{classification:"resource-exhausted",explanation:"binding count exceeds the bounded limit"};
    if(!declaration.id||this.bindings.has(declaration.id))return{classification:"invalid",explanation:"binding identifiers must be unique"};
    const natural=!Array.isArray(working)&&working&&typeof working==="object"&&"format"in working&&["$natural","$conversion"].includes(declaration.source.workingPath[0]),parsedLines=natural?(assessment.domainPayload as any)?.naturalInput?.lines:undefined,naturalLine=natural?parsedLines?.findIndex((line:any)=>line.id===declaration.source.proofStepId):null,index=naturalLine??Number(declaration.source.workingPath[0]);
    const submitted=natural?parsedLines?.[index]:Array.isArray(working)?(working as any[])[index]:undefined;
    const verified=natural?assessment.steps.some(step=>step.classification==="verified"&&step.source?.line===submitted?.source?.line):assessment.steps.find(step=>step.index===index)?.classification==="verified";
    const account=(assessment.domainPayload as any)?.lineAccount;const exportedRecord=natural&&account?account.records.find((r:any)=>r.id===declaration.source.proofStepId):undefined;
    if(natural&&account&&(!exportedRecord||!exportedRecord.premiseEligible||account.unaccounted.length||account.violations.length))return{classification:"invalid",explanation:"binding source line is not a verified premise of a fully accounted proof"};
    const submittedId=submitted?.id??`$index:${index}`;
    if(!submitted||submittedId!==declaration.source.proofStepId||!verified)return{classification:"invalid",explanation:"binding source is not a verified proof step"};
    const missing=[...declaration.assumptions,...declaration.domainRestrictions].filter(item=>!assessment.domainRestrictions.includes(item));
    if(missing.length)return{classification:"missing-assumption",explanation:`source proof does not establish ${missing.join(", ")}`};
    if(declaration.outstandingObligations.length||assessment.outstandingObligations.length)return{classification:"missing-assumption",explanation:"conditional binding retains unresolved obligations"};
    const naturalRoot=declaration.source.workingPath[0]==="$conversion"?(assessment.domainPayload as any)?.conversion:parsedLines,raw=natural?pathValue(naturalRoot,declaration.source.workingPath.slice(1)):pathValue(working,declaration.source.workingPath),value=normalize(declaration.mathematicalType,raw);
    if(!value)return{classification:"unsupported",explanation:`source value cannot be represented as ${declaration.mathematicalType}`};
    let semanticIdentity:string;try{semanticIdentity=canonicalizeMathematicalObject({mathematicalType:declaration.mathematicalType,value,symbol:declaration.symbol,assumptions:declaration.assumptions,domainRestrictions:[...assessment.domainRestrictions,...declaration.domainRestrictions],outstandingObligations:[],dependencies,verificationStatus:"verified"}).semanticIdentity}catch(error){return{classification:error instanceof Error&&error.message.includes("budget")?"resource-exhausted":"unsupported",explanation:error instanceof Error?error.message:"binding cannot be canonicalized"}}
    this.bindings.set(declaration.id,{contractVersion:D3_BINDING_CONTRACT,id:declaration.id,mathematicalType:declaration.mathematicalType,symbol:{...declaration.symbol},value,sourceStageId:stageId,sourceProofStepId:declaration.source.proofStepId,assumptions:[...declaration.assumptions],domainRestrictions:[...new Set([...assessment.domainRestrictions,...declaration.domainRestrictions])],dependencies:[...dependencies],outstandingObligations:[],proofVerificationStatus:"verified",semanticIdentity,verification:{kernel:D3_BINDING_KERNEL,rule:"verified-source-substitution"}});return null;
  }

  resolve(problem:MathematicalProblem,imports:BindingImport[]):{problem?:MathematicalProblem;failure?:BindingFailure;used:string[]}{
    const declared=new Map(imports.map(item=>[item.bindingId,item])),used:string[]=[];let nodes=0;
    const visit=(value:any,depth:number):any=>{if(depth>D3_MAX_SUBSTITUTION_DEPTH)throw{classification:"resource-exhausted",explanation:"substitution depth exceeds limit"};if(++nodes>D3_MAX_SUBSTITUTION_NODES)throw{classification:"resource-exhausted",explanation:"substitution expression exceeds node limit"};
      if(value&&typeof value==="object"&&value.kind==="binding-reference"){
        const reference=value as BindingReference,request=declared.get(reference.bindingId),binding=this.bindings.get(reference.bindingId);this.conversionAttempts++;if(this.conversionAttempts>128)throw{classification:"resource-exhausted",explanation:"conversion-attempt limit exceeded"};
        if(!request||request.expectedType!==reference.expectedType||!sameSymbol(request.symbol,reference.symbol)||JSON.stringify(request.dimensions??[])!==JSON.stringify(reference.dimensions??[]))throw{classification:"invalid",explanation:"binding reference is not declared by the destination stage"};
        if(!binding||binding.proofVerificationStatus!=="verified")throw{classification:"invalid",explanation:"binding source is absent or unverified"};
        if(!sameSymbol(binding.symbol,reference.symbol))throw{classification:"invalid",explanation:"binding symbol identity or scope does not match"};
        const converted=destinationValue(binding,reference.expectedType,reference.dimensions);if(converted&&typeof converted==="object"&&"classification"in converted)throw converted;used.push(binding.id);return converted;
      }
      if(Array.isArray(value))return value.map(item=>visit(item,depth+1));if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,visit(item,depth+1)]));return value};
    try{return{problem:visit(problem,0),used:[...new Set(used)]}}catch(failure){return{failure:failure as BindingFailure,used:[...new Set(used)]}}
  }
}
