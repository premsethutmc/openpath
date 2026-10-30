import { readFileSync } from "node:fs";
import { assessMathematicalWorking } from "/home/claude/cert/packages/learning/src/unified-math-engine.ts";
import { ROUTE_STATS } from "/home/claude/cert/packages/learning/src/derivation-authority.ts";
for (const f of process.argv.slice(2)) { const corp=JSON.parse(readFileSync(f,"utf8")); let viaOutside:string[]=[], verified=0;
  for (const c of corp){ const b=ROUTE_STATS.outsideSurface; const r:any=await assessMathematicalWorking({domain:c.domain,statement:c.statement} as any,{format:"natural",text:c.lines.join("\n")}); if(r.classification==="verified"){ verified++; if(ROUTE_STATS.outsideSurface>b) viaOutside.push(c.id+":"+c.expect); } }
  console.log(f.split("/").pop(),"verified",verified,"of which used the outside-surface tier",viaOutside.length, viaOutside.slice(0,40).join(" ")); }
console.log(JSON.stringify(ROUTE_STATS));
