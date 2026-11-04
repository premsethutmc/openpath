import { readFileSync, writeFileSync } from "node:fs";
import { assessChain, replayDerivationChain } from "/home/claude/cert/packages/learning/src/derivation-authority.ts";
const corp=JSON.parse(readFileSync(process.argv[2],"utf8")); const out:any[]=[]; let replayFail=0, replayN=0; const ms:number[]=[];
for (const c of corp){ const t=performance.now(); const v=assessChain(c.statement,c.lines); ms.push(performance.now()-t);
  let rp=null; if (v.status==="verified"){ replayN++; const r=replayDerivationChain(c.statement,c.lines,v.chain); rp=r.ok; if(!r.ok) replayFail++; }
  out.push({id:c.id,category:c.category,expect:c.expect,got:v.status,at:v.at,reason:v.reason,replay:rp}); }
writeFileSync(process.argv[3],JSON.stringify(out)); ms.sort((a,b)=>a-b);
console.log("replayed",replayN,"replay failures",replayFail,"ms p50",ms[Math.floor(ms.length/2)].toFixed(2),"p99",ms[Math.floor(ms.length*0.99)].toFixed(2),"max",ms[ms.length-1].toFixed(1));
