// E4 evaluator (derived from the E3 evaluator, E3 file untouched). Usage: bun evaluate.ts <e1|e1adj|e2dev|e2sealed|e3dev|e3sealed|e4dev|e4sealed> <label>
// ENGINE_ROOT=<worktree> evaluates another code base (used for the E3 baseline).
// Hash-gated against every frozen corpus. "e1adj" scores E1 under the versioned adjudication overlay (original labels are never modified).
import {readFileSync,writeFileSync} from "node:fs";
import {performance} from "node:perf_hooks";
import {createHash} from "node:crypto";
const ENG=process.env.ENGINE_ROOT?process.env.ENGINE_ROOT+"/packages/learning/src/":new URL("../../../packages/learning/src/",import.meta.url).pathname;
const {assessMathematicalWorking}=await import(ENG+"unified-math-engine.ts");
const here=new URL(".",import.meta.url).pathname,part=process.argv[2]??"e3dev",label=process.argv[3]??"after";
const sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex");
const frozenOf=(f:string,dir:string)=>Object.fromEntries(readFileSync(dir+f,"utf8").trim().split("\n").map(l=>{const[h,n]=l.trim().split(/\s+/);return[n,h]}));
const E2=here+"../proof-integrity-e2/",E1=here+"../end-to-end-e1/",E3=here+"../verification-closure-e3/";
let cases:any[],overlay:Record<string,any>={};
const load=(dir:string,file:string,frozen:Record<string,string>)=>{if(sha(dir+file)!==frozen[file])throw Error(`${file} hash mismatch`);return JSON.parse(readFileSync(dir+file,"utf8")).cases};
if(part==="e1"||part==="e1adj"){const h=readFileSync(E1+"FROZEN_SHA256","utf8").trim().split(/\s+/)[0];if(sha(E1+"frozen-corpus.v1.json")!==h)throw Error("E1 corpus hash mismatch");cases=JSON.parse(readFileSync(E1+"frozen-corpus.v1.json","utf8")).cases;
  if(part==="e1adj")overlay=Object.fromEntries(JSON.parse(readFileSync(E3+"e1-adjudication-overlay.v1.json","utf8")).adjudications.map((a:any)=>[a.caseId,a]))}
else if(part==="e2dev"||part==="e2sealed")cases=load(E2,part==="e2dev"?"dev-cases.v1.json":"sealed-cases.v1.json",frozenOf("FROZEN_SHA256",E2));
else if(part==="e3dev"||part==="e3sealed")cases=load(E3,part==="e3dev"?"dev-cases.v1.json":"sealed-cases.v1.json",frozenOf("FROZEN_SHA256",E3));
else if(part==="e4dev"||part==="e4sealed")cases=load(here,part==="e4dev"?"dev-cases.v1.json":"sealed-cases.v1.json",frozenOf("FROZEN_SHA256",here));
else throw Error("partition");
const pct=(xs:number[],p:number)=>{const a=[...xs].sort((x,y)=>x-y);return a.length?a[Math.min(a.length-1,Math.floor((a.length-1)*p))]:0};
const srcRoot=ENG;
const codeDigest=createHash("sha256").update(["natural-domain-adapters.ts","unified-math-engine.ts","proof-integrity.ts","claim-binding.ts","d2-proof-state.ts","cross-domain-bindings.ts","natural-working.ts","acceptance-gate.ts","independent-checker.ts","completeness.ts"].map(f=>{try{return f+":"+sha(srcRoot+f)}catch{return f+":absent"}}).join("|")).digest("hex");
const VALID_CLS=["verified","invalid","incomplete","missing-assumption"];
const out:any[]=[],lat:number[]=[];
for(const c of cases){
  const ov=overlay[c.id],ref0=c.reference??{},ref={...ref0,...(ov?{classification:ov.correctedClassification,firstInvalidStep:ov.correctedFirstInvalidStep??null,firstInvalidAcceptable:ov.correctedFirstInvalidAcceptable??[]}:{})};
  const t0=performance.now();let a:any,err:string|null=null;
  try{a=await assessMathematicalWorking(c.problem,c.studentWorking)}catch(e){err=String(e);a={classification:"malformed",steps:[],firstInvalidStep:null,complete:false,reasoners:[]}}
  const ms=performance.now()-t0;lat.push(ms);
  const cat=c.category??c.primaryCategory,refCls=ref.classification,verified=a.classification==="verified";
  const acceptable:number[]=ref.firstInvalidAcceptable?.length?ref.firstInvalidAcceptable:(ref.firstInvalidStep!=null?[ref.firstInvalidStep]:[]);
  const gate=a.acceptanceGate??a.domainPayload?.acceptanceGate??null;
  const acct=a.domainPayload?.lineAccount??null;
  const unaccounted=verified&&acct&&acct.records?acct.records.some((r:any)=>r.status!=="verified-valid"):false;
  const fi=a.firstInvalidStep??null,src=fi===null?null:a.steps?.[fi]?.source??null;
  const m={
    falseAcceptance:verified&&refCls!=="verified",
    falseRejection:refCls==="verified"&&["invalid","incomplete","missing-assumption"].includes(a.classification),
    correctlyVerified:verified&&refCls==="verified",
    correctlyInvalid:refCls==="invalid"&&a.classification==="invalid",
    exact:a.classification===refCls,
    assessed:VALID_CLS.includes(a.classification),
    firstInvalidMatch:refCls==="invalid"?(a.classification==="invalid"&&(acceptable.length?acceptable.includes(fi as number):fi===null)):null,
    alternativeAccepted:ref.alternativeMethodValid===true?verified:null,
    restrictionDetected:(cat==="missing-restriction-or-branch"&&refCls==="invalid")||refCls==="missing-assumption"||(refCls==="invalid"&&/rational/.test(String(c.family??"")))||(cat==="rational-domain-restrictions"&&refCls==="invalid")?(a.classification===refCls):null,
    branchDetected:(cat==="missing-restriction-or-branch"&&refCls==="incomplete")||(refCls==="incomplete"&&(ref.tags??[]).some((t:string)=>/missing|lost|branch|stop/.test(t)))?a.classification==="incomplete":null,
    safeOnDefective:refCls!=="verified"&&refCls!=="ambiguous"&&refCls!=="unsupported"&&refCls!=="malformed"?a.classification!=="verified":null,
    independentlyVerified:verified?(gate?gate.independentlyVerified===true:false):null,
    unaccountedAcceptance:unaccounted,thrown:err};
  out.push({id:c.id,partition:c.partition,category:cat,family:c.family??null,tags:ref.tags??[],area:c.area,coverage:ref.coverage??"in-scope",adjudicated:!!ov,reference:{classification:refCls,firstInvalidAcceptable:acceptable},
    engine:{classification:a.classification,complete:a.complete??null,firstInvalidStep:fi,firstInvalidLine:src?.line??null,reasoners:(a.reasoners??[]).map((r:any)=>r.id),justification:a.justification??null,obligations:a.outstandingObligations??[],gate:gate?{independentlyVerified:gate.independentlyVerified,verdict:gate.verdict,evidence:gate.evidence?.length??null}:null},metrics:m,ms});
}
const n=(f:(r:any)=>boolean)=>out.filter(f).length,ratio=(f:(r:any)=>boolean|null,g?:(r:any)=>boolean)=>[n(r=>f(r)===true),n(r=>f(r)!==null)];
const cls=(k:string)=>n(r=>r.engine.classification===k);
const summary={label,partition:part,codeDigest,cases:out.length,
  falseAcceptances:n(r=>r.metrics.falseAcceptance),falseRejections:n(r=>r.metrics.falseRejection),correctlyVerified:n(r=>r.metrics.correctlyVerified),referenceVerified:n(r=>r.reference.classification==="verified"),
  correctlyInvalid:n(r=>r.metrics.correctlyInvalid),referenceInvalid:n(r=>r.reference.classification==="invalid"),exactVerdicts:n(r=>r.metrics.exact),
  engineClassCounts:Object.fromEntries([...new Set(out.map(r=>r.engine.classification))].map(k=>[k,cls(k)])),
  assessed:n(r=>r.metrics.assessed),assessedCorrect:n(r=>r.metrics.assessed&&r.metrics.exact),assessmentCoverage:n(r=>r.metrics.assessed)/out.length,correctAssessmentCoverage:n(r=>r.metrics.assessed&&r.metrics.exact)/out.length,
  abstentions:n(r=>!r.metrics.assessed),unaccountedAcceptances:n(r=>r.metrics.unaccountedAcceptance),
  firstInvalidExact:ratio(r=>r.metrics.firstInvalidMatch),alternativeAccepted:ratio(r=>r.metrics.alternativeAccepted),restrictionDetected:ratio(r=>r.metrics.restrictionDetected),
  branchDetected:ratio(r=>r.metrics.branchDetected),defectiveRestrictionBranchSafe:ratio(r=>r.metrics.safeOnDefective),
  verifiedTotal:cls("verified"),independentlyVerified:n(r=>r.metrics.independentlyVerified===true),independentVerificationCoverage:cls("verified")?n(r=>r.metrics.independentlyVerified===true)/cls("verified"):null,
  thrown:n(r=>!!r.metrics.thrown),maxRssMB:Math.round(process.resourceUsage().maxRSS/1024),slowest:[...out].sort((a,b)=>b.ms-a.ms).slice(0,5).map(r=>({id:r.id,ms:Math.round(r.ms*10)/10})),latencyMs:{p50:pct(lat,.5),p95:pct(lat,.95),p99:pct(lat,.99),max:Math.max(...lat)},
  byFamily:Object.fromEntries([...new Set(out.map(r=>String(r.family??r.area).split('/')[0]))].map(k=>[k,{n:n(r=>String(r.family??r.area).split('/')[0]===k),assessed:n(r=>String(r.family??r.area).split('/')[0]===k&&r.metrics.assessed),exact:n(r=>String(r.family??r.area).split('/')[0]===k&&r.metrics.exact),falseAccept:n(r=>String(r.family??r.area).split('/')[0]===k&&r.metrics.falseAcceptance)}])),
  byCategory:Object.fromEntries([...new Set(out.map(r=>r.category))].map(k=>[k,{n:n(r=>r.category===k),falseAccept:n(r=>r.category===k&&r.metrics.falseAcceptance),falseReject:n(r=>r.category===k&&r.metrics.falseRejection),verified:n(r=>r.category===k&&r.engine.classification==="verified"),exact:n(r=>r.category===k&&r.metrics.exact)}]))};
writeFileSync(here+`results/${part}-${label}.json`,JSON.stringify({summary,cases:out},null,1));
console.log(JSON.stringify(summary));
