import { pool } from "../../../packages/learning/src/families";
const [fam, op, pat] = process.argv.slice(2);
let n=0;
for (const p of pool(fam).items) if (p.prompt.includes(pat) && p.steps.some(s=>s.op===op)) { console.log(JSON.stringify({prompt:p.prompt,options:p.options,figure:p.figure,steps:p.steps.map(s=>({id:s.id,op:s.op,inputs:s.inputs,value:s.value}))})); if(++n>=2) break; }
