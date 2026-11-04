import {readFileSync,writeFileSync} from "node:fs";
import {performance} from "node:perf_hooks";
import {assessMathematicalWorking} from "../../../packages/learning/src/unified-math-engine.ts";
import {parseNaturalWorking} from "../../../packages/learning/src/natural-working.ts";
import {adaptNaturalWorking} from "../../../packages/learning/src/natural-domain-adapters.ts";
import {canonicalizeNaturalRelation} from "../../../packages/learning/src/canonical-math-ir.ts";

const root=new URL(".",import.meta.url).pathname;
const corpus=JSON.parse(readFileSync(`${root}/frozen-corpus.v1.json`,"utf8"));
const partition=process.argv[2]??"diagnostic";
if(!["diagnostic","sealed-holdout","all"].includes(partition))throw Error("partition must be diagnostic, sealed-holdout, or all");
const cases=corpus.cases.filter((c:any)=>partition==="all"||c.partition===partition);

function percentile(xs:number[],p:number){const a=[...xs].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor((a.length-1)*p))]??0}
function walk(x:any,visit:(x:any)=>void,seen=new Set<any>()){if(!x||typeof x!=="object"||seen.has(x))return;seen.add(x);visit(x);for(const v of Object.values(x))walk(v,visit,seen)}
function proofAudit(a:any){let certificates=0,kernelVerified=0,kernelRejected=0;walk(a.domainPayload,x=>{if(x&&typeof x==="object"&&"replayDigest" in x&&"rules" in x)certificates++;const kernel=!!x&&typeof x==="object"&&(typeof x.kernelVersion==="string"||/proof-kernel/.test(String(x.version??"")));if(kernel&&x.outcome==="verified")kernelVerified++;if(kernel&&x.outcome&&x.outcome!=="verified")kernelRejected++});const ids=a.reasoners.map((r:any)=>r.id),reasonerSignal=ids.some((id:string)=>["symbolic:m3","probability-statistics:b1","linear-algebra:b2","complex-polynomial:b3"].includes(id));return{certificates,kernelVerified,kernelRejected,reasonerSignal,adequate:a.classification!=="verified"||kernelVerified>0||reasonerSignal}}
function taxonomy(c:any,a:any,parsed:any,adapter:any){
 if(parsed.classification==="malformed")return"parsing-failure";
 if(parsed.classification==="ambiguous")return"ambiguous-notation";
 if(parsed.classification==="resource-exhausted"||a.classification==="resource-exhausted")return"resource-exhaustion";
 if(a.classification==="unsupported"){
  if(adapter?.outcome==="invalid-type")return"typed-ir-conversion-failure";
  if(adapter?.outcome==="unsupported")return /no lossless natural adapter/.test(adapter.message??"")?"missing-domain-adapter":"unsupported-mathematical-operation";
  return"unsupported-mathematical-operation";
 }
 if(a.classification==="missing-assumption")return"missing-domain-restriction";
 if(a.classification!==c.reference.classification){
  if(c.reference.classification==="invalid"&&a.firstInvalidStep!==c.reference.firstInvalidStep)return"incorrect-error-localization";
  return"incorrect-mathematical-verdict";
 }
 if(c.reference.classification==="invalid"&&a.firstInvalidStep!==c.reference.firstInvalidStep)return"incorrect-error-localization";
 return"none";
}

const results:any[]=[];
for(const c of cases){
 const t0=performance.now(),parsed=parseNaturalWorking(c.studentWorking),t1=performance.now();
 let canonicalMs=0,canonicalError:string|null=null;
 if(parsed.classification==="parsed")for(const line of parsed.lines){const a=performance.now();try{canonicalizeNaturalRelation(line.relation)}catch(e){canonicalError=e instanceof Error?e.message:String(e)}canonicalMs+=performance.now()-a}
 const a0=performance.now(),adapter=parsed.classification==="parsed"?adaptNaturalWorking(c.problem,parsed):null,adapterMs=performance.now()-a0;
 const s0=performance.now(),assessment=await assessMathematicalWorking(c.problem,c.studentWorking),totalMs=performance.now()-s0;
 const proof=proofAudit(assessment),ref=c.reference;
 const verdictMatch=assessment.classification===ref.classification;
 const assessed=["verified","invalid","incomplete","missing-assumption"].includes(assessment.classification);
 const firstMatch=ref.classification!=="invalid"?null:assessment.firstInvalidStep===ref.firstInvalidStep;
 const source=assessment.firstInvalidStep===null?null:assessment.steps[assessment.firstInvalidStep]?.source??null;
 const expectedLine=ref.firstInvalidStep===null?null:ref.firstInvalidStep+1;
 const sourceAccurate=expectedLine===null?null:source?.line===expectedLine;
 results.push({id:c.id,partition:c.partition,area:c.area,primaryCategory:c.primaryCategory,
  reference:ref,engine:{classification:assessment.classification,correct:assessment.correct,complete:assessment.complete,
   firstInvalidStep:assessment.firstInvalidStep,justification:assessment.justification,domainRestrictions:assessment.domainRestrictions,
   outstandingObligations:assessment.outstandingObligations,reasoners:assessment.reasoners,source},
  pipeline:{parseClassification:parsed.classification,parsedLines:parsed.classification==="parsed"?parsed.lines.length:0,
   adapterOutcome:adapter?.outcome??null,adapter:adapter?.outcome==="converted"?adapter.evidence.adapter:null,canonicalError},
  evidence:proof,metrics:{verdictMatch,assessed,firstInvalidStepMatch:firstMatch,sourceSpanAccurate:sourceAccurate,
   falseAcceptance:assessment.classification==="verified"&&ref.classification!=="verified",
   falseRejection:assessment.classification!=="verified"&&ref.classification==="verified",
   alternativeAccepted:ref.alternativeMethodValid?assessment.classification==="verified":null,
   restrictionDetected:c.primaryCategory==="missing-restriction-or-branch"?["missing-assumption","incomplete"].includes(assessment.classification):null,
   failureCategory:taxonomy(c,assessment,parsed,adapter)},
  timingMs:{parse:t1-t0,canonical:canonicalMs,adapter:adapterMs,total:totalMs,reasoningAndProof:Math.max(0,totalMs-(t1-t0)-canonicalMs-adapterMs)}})
}

const classifications=Object.fromEntries([...new Set(results.map(r=>r.engine.classification))].sort().map(k=>[k,results.filter(r=>r.engine.classification===k).length]));
const summary={benchmark:corpus.benchmark,version:corpus.version,partition,cases:results.length,
 parsed:results.filter(r=>r.pipeline.parseClassification==="parsed").length,assessable:results.filter(r=>r.metrics.assessed).length,
 classifications,verdictMatches:results.filter(r=>r.metrics.verdictMatch).length,falseAcceptances:results.filter(r=>r.metrics.falseAcceptance).length,
 falseRejections:results.filter(r=>r.metrics.falseRejection).length,
 invalidCases:results.filter(r=>r.reference.classification==="invalid").length,
 exactFirstInvalid:results.filter(r=>r.reference.classification==="invalid"&&r.metrics.firstInvalidStepMatch).length,
 alternativeTotal:results.filter(r=>r.reference.alternativeMethodValid).length,
 alternativeAccepted:results.filter(r=>r.metrics.alternativeAccepted).length,
 verifiedWithoutObservableKernelEvidence:results.filter(r=>r.engine.classification==="verified"&&!r.evidence.adequate).length,
 latencyMs:{p50:percentile(results.map(r=>r.timingMs.total),.5),p95:percentile(results.map(r=>r.timingMs.total),.95),p99:percentile(results.map(r=>r.timingMs.total),.99),max:Math.max(...results.map(r=>r.timingMs.total)),
  parsingP50:percentile(results.map(r=>r.timingMs.parse),.5),conversionP50:percentile(results.map(r=>r.timingMs.adapter),.5),canonicalP50:percentile(results.map(r=>r.timingMs.canonical),.5),reasoningAndProofP50:percentile(results.map(r=>r.timingMs.reasoningAndProof),.5)}};
const output={generatedAt:new Date().toISOString(),summary,results};
writeFileSync(`${root}/${partition}-results.v1.json`,JSON.stringify(output,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
