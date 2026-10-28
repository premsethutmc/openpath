import { readFileSync, writeFileSync } from "node:fs";
const U = await import("/home/claude/e7/packages/learning/src/_audit-trace.ts");
const T="/home/claude/e7/tools/mathematics/";
const parts:[string,string][]= [["e2dev",T+"proof-integrity-e2/dev-cases.v1.json"],["e2sealed",T+"proof-integrity-e2/sealed-cases.v1.json"],["e3dev",T+"verification-closure-e3/dev-cases.v1.json"],["e3sealed",T+"verification-closure-e3/sealed-cases.v1.json"],["e4dev",T+"coverage-e4/dev-cases.v1.json"],["e4sealed",T+"coverage-e4/sealed-cases.v1.json"],["e5dev",T+"geocalc-e5/dev-cases.v1.json"],["e5sealed",T+"geocalc-e5/sealed-cases.v1.json"],["e6dev",T+"generalization-e6/dev-cases.v1.json"],["e6val",T+"generalization-e6/validation-cases.v1.json"],["e6sealed",T+"generalization-e6/sealed-cases.v1.json"],["h1",T+"generalization-e6r/holdout1/holdout-cases.v1.json"],["h2",T+"generalization-e6r/holdout2/holdout-cases.v1.json"]];
const rows:any[]=[];
for (const [name,f] of parts) { let cs:any[]; try { cs=JSON.parse(readFileSync(f,"utf8")).cases; } catch { continue; }
 for (const c of cs) { const w=c.studentWorking; const P=c.problem; if(!w||Array.isArray(w)||w.format!=="natural"||!P) continue; const id=c.caseId??c.id;
  try { const base=await U.assessCandidateBase(P,w,{}); const e5=(P.domain==="calculus"||P.domain==="geometry")?await U.assessE5Route(P,w,{}):null; const e6=(["geometry","calculus","probability-statistics","complex-polynomial"].includes(P.domain))?await U.assessE6Route(P,w,{}):null; const m=await U.assessMathematicalWorking(P,w,{});
   rows.push({part:name,id,ref:c.reference?.classification??c.expected?.classification??null,base:base.classification,e5:e5?.classification??null,e6:e6?.classification??null,final:m.classification,reasoners:(m.reasoners??[]).map((r:any)=>r.id).join("+")}); } catch(e:any){ rows.push({part:name,id,err:String(e).slice(0,60)}); } } }
writeFileSync("/tmp/claude-0/a/scan.json",JSON.stringify(rows));
const V=rows.filter(r=>r.final==="verified"); console.log("rows",rows.length,"final verified",V.length);
const abst=(x:any)=>x&&x!=="verified"; 
const combos:Record<string,number>={}; for(const r of V){ const k=`base=${r.base==="verified"?"V":r.base} e5=${r.e5===null?"-":r.e5==="verified"?"V":r.e5} e6=${r.e6===null?"-":r.e6==="verified"?"V":r.e6}`; combos[k]=(combos[k]??0)+1; }
console.log(JSON.stringify(Object.entries(combos).sort((a,b)=>b[1]-a[1]),null,0));
