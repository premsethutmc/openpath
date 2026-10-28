import { readFileSync } from "node:fs";
const U = await import("/home/claude/e7/packages/learning/src/_audit-trace.ts");
const { planGeneralizationE6 } = await import("/home/claude/e7/packages/learning/src/natural-generalization-e6.ts");
const all = new Map(JSON.parse(readFileSync("/home/claude/e6r-holdout2/holdout-cases.v1.json","utf8")).cases.map((c:any)=>[c.caseId,c]));
const s=(a:any)=>a? `${a.classification}`.slice(0,9).padEnd(9)+" "+String(a.justification).replace(/\s+/g," ").slice(0,70):"null";
for (const id of process.argv.slice(2)) { const c:any=all.get(id), w=c.studentWorking, P=c.problem;
 const base=await U.assessCandidateBase(P,w,{}); const e5=(P.domain==="calculus"||P.domain==="geometry")?await U.assessE5Route(P,w,{}):null; const e6=await U.assessE6Route(P,w,{}); const m=await U.assessCandidate(P,w,{});
 console.log(`## ${id} ref=${c.reference.classification} :: ${w.text.replace(/\n/g," ⏎ ").slice(0,110)}`);
 console.log(`   base ${s(base)}\n   e5   ${s(e5)}\n   e6   ${s(e6)}\n   merge ${s(m)} [${(m.reasoners??[]).map((r:any)=>r.id.replace("natural-","")).join(",")}]`);
 const p:any=planGeneralizationE6(P,w); if(p&&!p.refused) console.log("   e6 lines:",p.parsed.lines.map((l:any,i:number)=>`${i}:${String(p.outcomes[i]?.classification).slice(0,5)}`).join(" "),"|",p.parsed.lines.map((l:any,i:number)=>String(p.outcomes[i]?.justification).slice(0,45)).join(" | ")); else if (p) console.log("   e6 refused:",p.refused);
}
