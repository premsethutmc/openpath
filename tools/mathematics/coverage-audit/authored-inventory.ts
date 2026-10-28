import { questions, modules } from "../../../packages/learning/src/content.ts";
import { readdirSync, readFileSync } from "node:fs";
const ids = questions.map((q:any)=>q.id); const qq:any=Object.fromEntries(questions.map((q:any)=>[q.id,q])); const question=(i:string)=>qq[i];
const t:Record<string,number>={}; const s:Record<string,number>={};
for (const id of ids){ const q=question(id); t[q.type]=(t[q.type]||0)+1; const st=(String(q.competency||"?").split(".")[1]||"?"); s[st]=(s[st]||0)+1; }
console.log("authored learning questions",ids.length,t,s);
const dir="../../../content/mathematics/programs"; let n=0; const ut:Record<string,number>={}; const files=readdirSync(dir).filter(f=>f.endsWith(".json"));
for (const f of files){ const j=JSON.parse(readFileSync(dir+"/"+f,"utf8")); const walk=(o:any)=>{ if(Array.isArray(o)) o.forEach(walk); else if(o&&typeof o==="object"){ if(typeof o.answer==="string"&&typeof o.prompt==="string"&&o.type){ n++; ut[o.type]=(ut[o.type]||0)+1;} Object.values(o).forEach(walk);} }; walk(j); }
console.log("mathematics unit programs files",files.length,"questions",n,ut);
