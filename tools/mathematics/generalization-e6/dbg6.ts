import {readFileSync} from "node:fs";
const ENG=new URL("../../../packages/learning/src/",import.meta.url).pathname;
const {planGeneralizationE6}=await import(ENG+"natural-generalization-e6.ts");
const part=process.argv[2]; if(part!=="dev") throw Error("dev only");
const ids=process.argv.slice(3);
const cases=JSON.parse(readFileSync(new URL(`${part}-cases.v1.json`,import.meta.url),"utf8")).cases;
for(const c of cases){ const sid=String(c.caseId).slice(-3); if(ids.length&&!ids.includes(sid)) continue;
  const p:any=planGeneralizationE6(c.problem,c.studentWorking);
  console.log(`== ${sid} ${c.family} ref=${c.reference.classification}${c.reference.firstInvalidStep!=null?"@"+c.reference.firstInvalidStep:""}`);
  if(!p){console.log("   (route does not own)");continue}
  if(p.refused){console.log("   REFUSED:",p.refused);continue}
  p.parsed.lines.forEach((l:any,i:number)=>{const o=p.outcomes[i]; console.log(`   ${i}: ${o?.classification} | ${String(o?.justification).slice(0,120)} || ${l.source.text.slice(0,80)}`)});
  console.log("   complete="+p.nativeComplete+" obligations="+p.obligations.join(";")+" terminal="+p.terminal);
}
