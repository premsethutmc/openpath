import { readFileSync } from "node:fs";
const U = await import("/home/claude/e7/packages/learning/src/_audit-trace.ts");
const { planGeneralizationE6 } = await import("/home/claude/e7/packages/learning/src/natural-generalization-e6.ts");
const H2 = JSON.parse(readFileSync("/home/claude/e6r-holdout2/holdout-cases.v1.json","utf8")).cases, H1 = JSON.parse(readFileSync("/home/claude/e6r-holdout/holdout-cases.v1.json","utf8")).cases;
const all = new Map([...H1,...H2].map((c:any)=>[c.caseId,c]));
const short=(a:any)=>a? `${a.classification}${a.complete?"(complete)":""} [${(a.reasoners??[]).map((r:any)=>r.id).join(",")}] ${String(a.justification).slice(0,90)}`:"null";
for (const id of process.argv.slice(2)) { const c:any = all.get(id); console.log("=== ",id,"ref=",c.reference.classification,c.family); console.log("   W:",c.studentWorking.text.replace(/\n/g," ⏎ ").slice(0,200));
  const w = c.studentWorking;
  const base = await U.assessCandidateBase(c.problem,w,{}); console.log("   base  :",short(base));
  const e5 = (c.problem.domain==="geometry"||c.problem.domain==="calculus") ? await U.assessE5Route(c.problem,w,{}) : null; console.log("   e5    :",short(e5));
  const e6 = await U.assessE6Route(c.problem,w,{}); console.log("   e6    :",short(e6));
  const m = await U.assessCandidate(c.problem,w,{}); console.log("   merged:",short(m));
  const g = U.applyAcceptanceGate(c.problem,w,m); console.log("   gated :",short(g), g.acceptanceGate? JSON.stringify(g.acceptanceGate).slice(0,200):"");
  const p:any = planGeneralizationE6(c.problem,w); if (p && !p.refused) console.log("   E6 lines:", p.parsed.lines.map((l:any,i:number)=>`${i}:${p.outcomes[i]?.classification}`).join(" ")); }
