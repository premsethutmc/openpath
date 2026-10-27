// Counts the gate level / route of every verified assessment on the KNOWN sets (E1, E2 dev/sealed, E3 dev). The E3 sealed set is not touched.
import {readFileSync,writeFileSync} from "node:fs";
import {assessMathematicalWorking} from "../../../packages/learning/src/unified-math-engine.ts";
const T="tools/mathematics/";const ld=(p:string)=>{const j=JSON.parse(readFileSync(T+p,"utf8"));return j.cases??j};
const sets:Record<string,any[]>={e1:ld("end-to-end-e1/frozen-corpus.v1.json"),e2dev:ld("proof-integrity-e2/dev-cases.v1.json"),e2sealed:ld("proof-integrity-e2/sealed-cases.v1.json"),e3dev:ld("verification-closure-e3/dev-cases.v1.json")};
const out:any={};
for(const[k,cs]of Object.entries(sets)){const m:Record<string,number>={};for(const c of cs){const a:any=await assessMathematicalWorking(c.problem,c.studentWorking);if(a.classification!=="verified")continue;const g=a.acceptanceGate;const key=`${g?.route}/${g?.level}/${g?.independentlyVerified}`;m[key]=(m[key]??0)+1}out[k]=m}
writeFileSync(T+"verification-closure-e3/results/gate-levels.json",JSON.stringify(out,null,1));console.log(JSON.stringify(out));
