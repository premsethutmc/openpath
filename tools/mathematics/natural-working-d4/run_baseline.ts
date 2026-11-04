import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root=process.env.OPENPATH_D3_ROOT;if(!root)throw Error("OPENPATH_D3_ROOT is required");
const mod=await import(resolve(root,"packages/learning/src/unified-math-engine.ts"));
const corpus=JSON.parse(readFileSync(new URL("./frozen-natural-working-cases.v1.json",import.meta.url),"utf8"));
const results=[] as any[];
for(const c of corpus.cases){const got=await mod.assessMathematicalWorking({domain:"symbolic",start:{kind:"constant",value:"0"}},{format:"natural",text:c.raw} as any);results.push({id:c.id,classification:got.classification,firstInvalidStep:got.firstInvalidStep})}
const summary={engineCommit:"c2108ec3e1bc1cce1a730431b8df7a1b1b02758a",total:results.length,assessable:results.filter(x=>!["malformed","unsupported"].includes(x.classification)).length,classification:Object.fromEntries([...new Set(results.map(x=>x.classification))].map(k=>[k,results.filter(x=>x.classification===k).length]))};
writeFileSync(new URL("./d3-baseline-results.v1.json",import.meta.url),JSON.stringify({summary,results},null,2)+"\n");console.log(summary);
