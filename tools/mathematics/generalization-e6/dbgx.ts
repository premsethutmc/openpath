import {readFileSync} from "node:fs";
const ENG=new URL("../../../packages/learning/src/",import.meta.url).pathname;
const {planGeneralizationE6}=await import(ENG+"natural-generalization-e6.ts");
const [file,...ids]=process.argv.slice(2);
const cases=JSON.parse(readFileSync(new URL("../"+file,import.meta.url),"utf8")).cases;
for(const c of cases){ if(!ids.some(i=>String(c.caseId??c.id).endsWith(i))) continue;
  const p:any=planGeneralizationE6(c.problem,c.studentWorking);
  console.log(`== ${c.caseId??c.id} ref=${c.reference?.classification} ${JSON.stringify(c.problem).slice(0,160)}`);
  if(!p){console.log("   (not owned)");continue} if(p.refused){console.log("   REFUSED:",p.refused);continue}
  p.parsed.lines.forEach((l:any,i:number)=>{const o=p.outcomes[i]; console.log(`   ${i}: ${o?.classification} | ${String(o?.justification).slice(0,110)} || ${l.source.text.slice(0,70)}`)});
  console.log("   complete="+p.nativeComplete+" "+p.obligations.join(";"));
}
