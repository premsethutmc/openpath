// node scripts/end-state.mjs <prefix>: per kind x subject, false claims standing at the end of session 1 / end of run (research/learner-state-eval)
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const rd = (f) => (f.endsWith(".gz") ? gunzipSync(readFileSync(f)).toString("utf8") : readFileSync(f, "utf8"));
const pre=process.argv[2]||"baseline-dev";
const rows = readdirSync("results").filter(f=>f.startsWith(pre)).flatMap(f=>rd("results/"+f).trim().split("\n").map(l=>JSON.parse(l)));
const SH=["independent","transfer","verified"]; const t={};
for (const r of rows){ const k=r.kind+"|"+r.subject.split(".")[2]; t[k]??={n:0,endS1:0,endRun:0,verifiedFalse:0,stepsFalse:0,steps:0};
 const s1=r.steps.filter(s=>s[0]===1), last1=s1.at(-1), last=r.steps.at(-1);
 const x=t[k]; x.n++; if(SH.includes(last1[5])&&!last1[4]) x.endS1++; if(SH.includes(last[5])&&!last[4]) x.endRun++; if(r.steps.some(s=>s[5]==="verified"&&!s[4])) x.verifiedFalse++;
 for(const s of r.steps) if(s[3]!==null){x.steps++; if(SH.includes(s[5])&&!s[4]) x.stepsFalse++;}}
for(const [k,x] of Object.entries(t).sort()) console.log(k.padEnd(40),"N",x.n,"falseAtEndS1",x.endS1,"falseAtEnd",x.endRun,"falseVerified",x.verifiedFalse,"falseClaimStepShare",(x.stepsFalse/x.steps).toFixed(2));
