// E6 diagnosis: per-case record for every E1 (adjudicated) and E5-sealed case the E5 engine does not get exactly right.
import {readFileSync,writeFileSync} from "node:fs";
import {assessMathematicalWorking} from "../../../packages/learning/src/unified-math-engine.ts";
import {parseNaturalWorking} from "../../../packages/learning/src/natural-working.ts";
const T="../end-to-end-e1/",G="../geocalc-e5/";
const rd=(p:string)=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const ov=Object.fromEntries(rd("../verification-closure-e3/e1-adjudication-overlay.v1.json").adjudications.map((a:any)=>[a.caseId,a]));
const e5ov=Object.fromEntries(rd(G+"e5-adjudication-overlay.v1.json").adjudications.map((a:any)=>[a.caseId,a]));
const sets:[string,any[]][]=[["e1",rd(T+"frozen-corpus.v1.json").cases],["e5sealed",rd(G+"sealed-cases.v1.json").cases]];
const out:any[]=[];
for(const[name,cases]of sets)for(const c of cases){
  const o=name==="e1"?ov[c.id]:e5ov[c.id];const ref=o?o.correctedClassification:c.reference.classification;
  const a:any=await assessMathematicalWorking(c.problem,c.studentWorking);
  if(a.classification===ref)continue;
  let parse:any=null;try{const p=parseNaturalWorking(c.studentWorking);parse={classification:p.classification,lines:p.lines?.length,message:(p as any).message?.slice(0,120)}}catch(e){parse={threw:String(e).slice(0,80)}}
  const stop=a.steps?.findIndex((s:any)=>s.classification!=="verified");
  out.push({set:name,id:c.id,area:c.area??c.category,category:c.primaryCategory??c.category,problem:c.problem,working:c.studentWorking,reference:ref,engine:a.classification,justification:a.justification?.slice(0,200),reasoners:a.reasoners?.map((r:any)=>r.id),parse,stopLine:stop>=0?stop:null,stopReason:stop>=0?a.steps[stop].justification?.slice(0,160):null});
}
writeFileSync(new URL("results/diagnosis-cases.v1.json",import.meta.url).pathname,JSON.stringify(out,null,1));
console.log(out.length);process.exit(0)
