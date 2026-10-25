import { pool } from "../../../packages/learning/src/families";
const keys = process.argv.slice(2);
for (const key of keys) {
  const [fam, ...r] = key.split("/"), op = r.join("/");
  const items = pool(fam).items;
  console.log("=====", key, items.length, "ops:", [...new Set(items.flatMap(p=>p.steps.map(s=>s.op)))].join(" | "));
  let n=0;
  for (const idx of [0, Math.floor(items.length/2), items.length-1]) { const p = items[idx];
    console.log(JSON.stringify({id:p.id,prompt:p.prompt,params:p.params,options:p.options,figure:p.figure,answer:(p as any).answer,steps:p.steps.map(s=>({id:s.id,op:s.op,inputs:s.inputs,value:s.value}))}));
  }
}
