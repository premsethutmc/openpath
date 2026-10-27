// E2-1: reproduce the E1 false acceptances with per-line adapter retention and proof evidence.
import {readFileSync,writeFileSync} from "node:fs";
import {assessMathematicalWorking} from "../../../packages/learning/src/unified-math-engine.ts";
import {parseNaturalWorking} from "../../../packages/learning/src/natural-working.ts";
import {adaptNaturalWorking} from "../../../packages/learning/src/natural-domain-adapters.ts";
const e1=new URL("../end-to-end-e1/",import.meta.url).pathname;
const corpus=JSON.parse(readFileSync(e1+"frozen-corpus.v1.json","utf8")).cases as any[];
const res=JSON.parse(readFileSync(e1+"case-level-results.v1.json","utf8")).results as any[];
const ids=res.filter(r=>r.metrics.falseAcceptance).map(r=>r.id);
const label=process.argv[2];if(!["before","after"].includes(label))throw Error("usage: bun repro_false_accepts.ts <before|after>");const out:any[]=[];
for(const id of ids){
  const c=corpus.find(x=>x.id===id),parsed=parseNaturalWorking(c.studentWorking);
  const a=await assessMathematicalWorking(c.problem,c.studentWorking);
  const ad=parsed.classification==="parsed"?adaptNaturalWorking(c.problem,parsed):null;
  const lines=parsed.classification==="parsed"?parsed.lines.map(l=>({id:l.id,line:l.source.line,text:l.source.text})):[];
  const matched=ad&&ad.outcome==="converted"?(ad.evidence as any).matchedLines??[]:[];const kept=ad&&ad.outcome==="converted"?[...ad.evidence.sourceLines,...matched]:[];const acct=(a.domainPayload as any)?.lineAccount;
  const walkCerts=(x:any,seen=new Set<any>()):number=>{if(!x||typeof x!=="object"||seen.has(x))return 0;seen.add(x);let n=("replayDigest" in x&&"rules" in x)?1:0;for(const v of Object.values(x))n+=walkCerts(v,seen);return n};
  out.push({id,area:c.area,category:c.primaryCategory,problem:c.problem,working:c.studentWorking.text,
    expected:{classification:c.reference.classification,firstInvalidStep:c.reference.firstInvalidStep},
    actual:{classification:a.classification,complete:a.complete,firstInvalidStep:a.firstInvalidStep,reasoners:a.reasoners.map(r=>r.id)},
    originalLines:lines,linesRetained:kept,linesDiscarded:lines.filter(l=>!kept.includes(l.line)).map(l=>l.line),
    adapter:ad?.outcome==="converted"?ad.evidence.adapter:ad?.outcome??null,certificates:walkCerts(a.domainPayload),
    adapterChecks:ad?.outcome==="converted"?ad.evidence.checks:null,lineStatuses:acct?acct.records.map((r:any)=>({line:r.line,status:r.status,role:r.role})):null,u4:{certificates:walkCerts(a.domainPayload),claimBinding:acct?(acct.violations.length?"violations":"bound"):"n/a"},reasonerVerdict:a.justification});
}
writeFileSync(new URL(`./false-accepts-${label}.json`,import.meta.url).pathname,JSON.stringify(out,null,1));
console.log(out.length);
for(const o of out)console.log(o.id,o.area,o.expected.classification,"->",o.actual.classification,"adapter="+o.adapter,"retained="+JSON.stringify(o.linesRetained),"discarded="+JSON.stringify(o.linesDiscarded),"certs="+o.certificates,"reasoners="+o.actual.reasoners.join("|"));
