import { readFileSync } from "node:fs";
const { planGeneralizationE6 } = await import("/home/claude/e7/packages/learning/src/natural-generalization-e6.ts");
const all = new Map([...JSON.parse(readFileSync("/home/claude/e6r-holdout2/holdout-cases.v1.json","utf8")).cases,...JSON.parse(readFileSync("/home/claude/e6r-holdout/holdout-cases.v1.json","utf8")).cases].map((c:any)=>[c.caseId,c]));
for (const id of process.argv.slice(2)) { const c:any=all.get(id); const p:any=planGeneralizationE6(c.problem,c.studentWorking); console.log("==",id,"family",p?.family,"nativeComplete",p?.nativeComplete);
 p.parsed.lines.forEach((l:any,i:number)=>{ const o=p.outcomes[i]; console.log(`  ${i} ${o?.classification} | ${String(o?.justification).slice(0,100)} | evidence=${JSON.stringify(o?.evidence??null)?.slice(0,80)} || ${l.source.text.slice(0,80)}`);}); console.log("  accounts:",JSON.stringify(p.accounts).slice(0,300)); }
