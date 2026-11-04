// E5 diagnosis: per-case parser outcome, IR relation kinds, adapter outcome, engine verdict, reasoner availability.
import {readFileSync,writeFileSync} from "node:fs";
const S="../../../packages/learning/src/";const here=new URL(".",import.meta.url).pathname;
const {assessMathematicalWorking}=await import(new URL(S+"unified-math-engine.ts",import.meta.url).href);
const {parseNaturalWorking}=await import(new URL(S+"natural-working.ts",import.meta.url).href);
const {adaptNaturalWorking}=await import(new URL(S+"natural-domain-adapters.ts",import.meta.url).href);
const E=JSON.parse(readFileSync(here+"../end-to-end-e1/frozen-corpus.v1.json","utf8")).cases;
const ov=Object.fromEntries(JSON.parse(readFileSync(here+"../verification-closure-e3/e1-adjudication-overlay.v1.json","utf8")).adjudications.map((a:any)=>[a.caseId,a]));
const out:any[]=[];
for(const c of E){
  if(!["geometry","calculus"].includes(c.problem?.domain))continue;
  const text=c.studentWorking?.text??"";const p:any=parseNaturalWorking({format:"natural",text});
  const ad:any=p.classification==="parsed"?adaptNaturalWorking(c.problem,p):{outcome:p.classification,message:p.message};
  const a:any=await assessMathematicalWorking(c.problem,c.studentWorking);
  const ref=ov[c.id]?ov[c.id].correctedClassification:c.reference.classification;
  out.push({id:c.id,domain:c.problem.domain,task:c.problem.task??c.problem.problem?.goal?.predicate??"statement",referenceVerdict:ref,
    problem:c.problem,studentText:text,parser:p.classification,lineKinds:p.lines?.map((l:any)=>l.relation.kind)??[],parserMessage:p.message??null,
    adapter:ad.outcome,adapterMessage:ad.message??null,engineVerdict:a.classification,engineJustification:(a.justification??"").slice(0,160),
    gate:a.acceptanceGate?.independentlyVerified??null});
}
writeFileSync(here+"results/e1-geocalc-diagnosis.json",JSON.stringify(out,null,1));
const k=(f:(x:any)=>string)=>{const m:any={};for(const x of out){const s=f(x);m[s]=(m[s]||0)+1}return m};
console.log(JSON.stringify({n:out.length,parser:k(x=>x.domain+":"+x.parser),adapter:k(x=>x.domain+":"+x.adapter),engine:k(x=>x.domain+":"+x.engineVerdict+"/ref="+x.referenceVerdict)}));
