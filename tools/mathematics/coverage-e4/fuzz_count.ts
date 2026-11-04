import {readFileSync} from "node:fs";
import {parseNaturalWorking} from "/home/claude/e4/packages/learning/src/natural-working.ts";
import {checkAlgebraSubmission} from "/home/claude/e4/packages/learning/src/independent-checker.ts";
const cs=JSON.parse(readFileSync("/home/claude/e4/tools/mathematics/coverage-e4/fuzz/e4-fuzz-cases.v1.json","utf8")).cases;
const map:any={equal:"equivalent",widening:"widening",narrowing:"narrowing",incomparable:"incomparable"};
let a=0,ab=0,cons=0,bad=0;
for(const c of cs){const p=parseNaturalWorking({format:"natural",text:c.line} as any) as any;if(p.classification!=="parsed"){ab++;continue}
let r:any;try{r=checkAlgebraSubmission(c.problem,p)}catch{ab++;continue}
const l=r.lines[0];if(!l||r.outcome==="unsupported"||r.outcome==="resource-exhausted"||l.relation==="unsupported"){ab++;continue}
if(c.kind==="line"){if(l.relation===map[c.relation])a++;else if(l.relation==="independent-false")cons++;else bad++}
else{const w=c.status==="implied"?"verified-valid":"verified-invalid";if(l.status===w)a++;else bad++}}
console.log({total:cs.length,agree:a,abstain:ab,conservative:cons,disagree:bad});
