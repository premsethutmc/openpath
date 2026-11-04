// E2 evaluator. Usage: bun evaluate.ts <dev|sealed|e1> <label>   (label: before|after)
import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {performance} from "node:perf_hooks";
import {createHash} from "node:crypto";
import {assessMathematicalWorking} from "../../../packages/learning/src/unified-math-engine.ts";
import {parseNaturalWorking} from "../../../packages/learning/src/natural-working.ts";
import {adaptNaturalWorking} from "../../../packages/learning/src/natural-domain-adapters.ts";
const here=new URL(".",import.meta.url).pathname,part=process.argv[2]??"dev",label=process.argv[3]??"after";
if(!["dev","sealed","e1"].includes(part))throw Error("partition");
// frozen-hash gate: refuse to run if corpus bytes changed
const frozen=Object.fromEntries(readFileSync(here+"FROZEN_SHA256","utf8").trim().split("\n").map(l=>{const[h,f]=l.split(/\s+/);return[f,h]}));
const sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex");
let cases:any[];
if(part==="e1"){const p=here+"../end-to-end-e1/frozen-corpus.v1.json";if(sha(p)!==readFileSync(here+"../end-to-end-e1/FROZEN_SHA256","utf8").trim().split(/\s+/)[0])throw Error("E1 corpus hash mismatch");cases=JSON.parse(readFileSync(p,"utf8")).cases}
else{const f=part==="dev"?"dev-cases.v1.json":"sealed-cases.v1.json";if(sha(here+f)!==frozen[f])throw Error(`${f} hash mismatch`);cases=JSON.parse(readFileSync(here+f,"utf8")).cases}
const pct=(xs:number[],p:number)=>{const a=[...xs].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor((a.length-1)*p))]??0};
const VERIFIED_OK=(c:any)=>c.reference.classification==="verified";
const srcRoot=here+"../../../packages/learning/src/";
const codeDigest=createHash("sha256").update(["natural-domain-adapters.ts","unified-math-engine.ts","proof-integrity.ts","claim-binding.ts","d2-proof-state.ts","cross-domain-bindings.ts","natural-working.ts"].map(f=>f+":"+createHash("sha256").update(readFileSync(srcRoot+f)).digest("hex")).join("\n")).digest("hex");
const out:any[]=[],lat:number[]=[];
for(const c of cases){
  const t0=performance.now();let a:any,err:string|null=null;
  try{a=await assessMathematicalWorking(c.problem,c.studentWorking)}catch(e){err=String(e);a={classification:"malformed",steps:[],firstInvalidStep:null,complete:false,reasoners:[]}}
  const ms=performance.now()-t0;lat.push(ms);
  const ref=c.reference,acct=(a.domainPayload as any)?.lineAccount??null;
  const nat=c.studentWorking?.format?parseNaturalWorking(c.studentWorking):null;
  const mathLines=nat&&nat.classification==="parsed"?nat.lines.length:null;
  const ad=nat&&nat.classification==="parsed"&&c.problem?.domain!=="d3-cross-domain"?adaptNaturalWorking(c.problem,nat):null;
  const consumed=acct?acct.consumed.length:(ad&&ad.outcome==="converted"?ad.evidence.sourceLines.length:null);
  const verified=a.classification==="verified",src=a.firstInvalidStep===null||a.firstInvalidStep===undefined?null:a.steps?.[a.firstInvalidStep]?.source??null;
  const unaccounted=verified&&mathLines!==null&&consumed!==null&&consumed<mathLines;
  const mustNot=ref.mustNotVerify===true||(c.reference.classification!=="verified"&&c.reference.classification!==undefined);
  out.push({id:c.id,partition:c.partition,category:c.category??c.primaryCategory,area:c.area,reference:{classification:ref.classification,firstInvalidStep:ref.firstInvalidStep,mustNotVerify:mustNot},
    engine:{classification:a.classification,complete:a.complete??null,firstInvalidStep:a.firstInvalidStep??null,firstInvalidSource:src,reasoners:(a.reasoners??[]).map((r:any)=>r.id),justification:a.justification??null,obligations:a.outstandingObligations??[]},
    integrity:{mathematicalLines:mathLines,linesConsumed:consumed,lineStatuses:acct?.statuses??null,unaccountedAcceptance:unaccounted},
    metrics:{falseAcceptance:verified&&mustNot,falseRejection:!verified&&VERIFIED_OK(c)&&!(ref.lineTruth??[]).some((t:string)=>t==="unsupported-true"),
      exact:a.classification===ref.classification,assessed:["verified","invalid","incomplete","missing-assumption"].includes(a.classification),
      firstInvalidMatch:ref.classification==="invalid"?a.firstInvalidStep===ref.firstInvalidStep:null,
      firstInvalidLineMatch:ref.classification==="invalid"&&ref.firstInvalidStep!==null?src?.line===ref.firstInvalidStep+1:null,
      alternativeAccepted:(ref.alternativeMethodValid===true)?verified:null,
      restrictionDetected:((c.category??c.primaryCategory)==="missing-restriction-or-branch")?(["missing-assumption","incomplete"].includes(a.classification)||(ref.classification==="invalid"&&a.classification==="invalid")):null,
      unaccountedAcceptance:unaccounted,thrown:err},ms});
}
const sum=(f:(r:any)=>boolean)=>out.filter(f).length;
const summary={label,partition:part,codeDigest,cases:out.length,falseAcceptances:sum(r=>r.metrics.falseAcceptance),unaccountedAcceptances:sum(r=>r.metrics.unaccountedAcceptance),falseRejections:sum(r=>r.metrics.falseRejection),
  verified:sum(r=>r.engine.classification==="verified"),assessed:sum(r=>r.metrics.assessed),unsupportedOrInconclusive:sum(r=>["unsupported","resource-exhausted","ambiguous","malformed","missing-assumption"].includes(r.engine.classification)&&!r.metrics.assessed),
  firstInvalidExact:[sum(r=>r.metrics.firstInvalidMatch===true),sum(r=>r.metrics.firstInvalidMatch!==null)],firstInvalidLine:[sum(r=>r.metrics.firstInvalidLineMatch===true),sum(r=>r.metrics.firstInvalidLineMatch!==null)],
  alternativeAccepted:[sum(r=>r.metrics.alternativeAccepted===true),sum(r=>r.metrics.alternativeAccepted!==null)],restrictionDetected:[sum(r=>r.metrics.restrictionDetected===true),sum(r=>r.metrics.restrictionDetected!==null)],
  thrown:sum(r=>!!r.metrics.thrown),latencyMs:{p50:pct(lat,.5),p95:pct(lat,.95),p99:pct(lat,.99),max:Math.max(...lat)},
  byCategory:Object.fromEntries([...new Set(out.map(r=>r.category))].map(k=>[k,{n:sum(r=>r.category===k),falseAccept:sum(r=>r.category===k&&r.metrics.falseAcceptance),verified:sum(r=>r.category===k&&r.engine.classification==="verified")}]))};
writeFileSync(here+`results/${part}-${label}.json`,JSON.stringify({summary,cases:out},null,1));
console.log(JSON.stringify(summary));
