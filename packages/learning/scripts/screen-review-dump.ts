/**
 * screen-review@1: dump every maths lesson screen as plain text in six even shards, one per reader, for the screen
 * review (see src/screen-corrections.ts). Run from frontend/: bun ../packages/learning/scripts/screen-review-dump.ts <dir>
 */
import { modules } from "../src/content";
import { classOfSkill } from "../../../frontend/src/year/StepCoach";
import { mkdirSync, writeFileSync } from "fs";
const dir = process.argv[2] ?? "screen-review"; mkdirSync(dir, { recursive: true });
const ms=modules.filter(m=>m.competency.startsWith("MATH.")).sort((a,b)=>a.competency.localeCompare(b.competency));
const N=6, out:string[][]=Array.from({length:N},()=>[]); let size=Array(N).fill(0);
for (const m of ms){
  
  let s=`\n=== ${m.competency} | ${m.title} | class ${classOfSkill(m.competency)??"?"}\n`;
  m.chapter.forEach((x,i)=>{ s+=`[chapter ${i}] ${x.title??""}: ${(x.text??[]).join(" / ")}\n`; });
  m.strategies.forEach((st:any)=>st.screens.forEach((x:any,i:number)=>{ s+=`[${st.id??st.kind??"strategy"} ${i}] ${x.title??""}: ${(x.text??[]).join(" / ")}\n`; }));
  const k=size.indexOf(Math.min(...size)); out[k].push(s); size[k]+=s.length;
}
out.forEach((o,i)=>writeFileSync(`${dir}/shard${i}.txt`,o.join("")));
console.log(size);
