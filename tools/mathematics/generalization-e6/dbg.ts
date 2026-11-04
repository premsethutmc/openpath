import {readFileSync} from "node:fs";
const ENG=new URL("../../../packages/learning/src/",import.meta.url).pathname;
const {assessMathematicalWorking}=await import(ENG+"unified-math-engine.ts");
const part=process.argv[2]??"dev"; const cat=process.argv[3]??""; const only=process.argv[4]??"mismatch";
if(part!=="dev") throw Error("dbg.ts is restricted to the dev partition");
const cases=JSON.parse(readFileSync(new URL(`${part}-cases.v1.json`,import.meta.url),"utf8")).cases;
for(const c of cases){ if(cat&&!c.category.startsWith(cat)&&!String(c.caseId).endsWith(cat)) continue;
  const a=await assessMathematicalWorking(c.problem,c.studentWorking); const ref=c.reference.classification;
  const mism=a.classification!==ref; if(only==="mismatch"&&!mism) continue;
  const rec=(a.domainPayload?.lineAccount?.records??[]).find((r:any)=>r.status!=="verified-valid");
  console.log(`${String(c.caseId).slice(-3)} ${c.family} | ref=${ref}${c.reference.firstInvalidStep!=null?"@"+c.reference.firstInvalidStep:""} got=${a.classification}${a.firstInvalidStep!=null?"@"+a.firstInvalidStep:""} | ${rec?`L${rec.line}:${rec.status}:${String(rec.reason).slice(0,110)}`:(a.justification??"").slice(0,110)}`);
  if(only==="verbose") console.log("    "+c.studentWorking.text.replace(/\n/g," ‖ ").slice(0,200));
}
