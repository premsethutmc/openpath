// bun perf.ts <repo-root> <label>  — stage latencies over E3 dev + E2 dev (known sets; sealed data never used).
import {readFileSync,writeFileSync} from "node:fs";
const [root,label]=[process.argv[2],process.argv[3]];const src=`${root}/packages/learning/src/`;
const eng=await import(src+"unified-math-engine.ts"),nat=await import(src+"natural-working.ts");
const chk=await import(src+"independent-checker.ts").catch(()=>null);
const load=(p:string)=>JSON.parse(readFileSync(p,"utf8")).cases as any[];
const cases=[...load("/home/claude/e3/tools/mathematics/verification-closure-e3/dev-cases.v1.json"),...load("/home/claude/e3/tools/mathematics/proof-integrity-e2/dev-cases.v1.json")];
const q=(a:number[],p:number)=>{const s=[...a].sort((x,y)=>x-y);return +s[Math.min(s.length-1,Math.floor(p*s.length))].toFixed(3)};
const st:Record<string,number[]>={parse:[],candidateAssessment:[],independentVerification:[],overall:[]};
const T=async<R>(k:string,f:()=>R|Promise<R>)=>{const t=performance.now();const r=await f();st[k].push(performance.now()-t);return r};
for(let rep=0;rep<5;rep++)for(const c of cases){
  const w=c.studentWorking;
  if(w?.format==="natural")await T("parse",()=>nat.parseNaturalWorking(w));
  await T("overall",()=>eng.assessMathematicalWorking(c.problem,w));
  if(eng.assessCandidate)await T("candidateAssessment",()=>eng.assessCandidate(c.problem,w));
  if(chk&&c.problem?.domain==="algebra"&&typeof c.problem.statement==="string"&&w?.format==="natural"){const p=nat.parseNaturalWorking(w);if(p.classification==="parsed")await T("independentVerification",()=>chk.checkAlgebraSubmission(c.problem.statement,p))}
}
const out:any={label,samples:cases.length*5,stages:{}};for(const [k,v] of Object.entries(st))if(v.length)out.stages[k]={n:v.length,p50:q(v,.5),p95:q(v,.95),max:+Math.max(...v).toFixed(3)};
out.memoryMB=Math.round(process.memoryUsage().rss/1e6);
writeFileSync(`/home/claude/e3/tools/mathematics/verification-closure-e3/results/perf-${label}.json`,JSON.stringify(out,null,1));console.log(JSON.stringify(out));
