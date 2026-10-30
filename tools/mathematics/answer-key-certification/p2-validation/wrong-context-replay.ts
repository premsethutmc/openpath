import { readFileSync } from "node:fs";
import { assessChain, replayDerivationChain, normalizeTask } from "/home/claude/cert/packages/learning/src/derivation-authority.ts";
const corp=JSON.parse(readFileSync("/home/claude/heldout2/corpus.json","utf8")).concat(JSON.parse(readFileSync("tools/mathematics/answer-key-certification/architecture-repair/FROZEN-heldout-corpus.json","utf8")));
const V=corp.map((c:any)=>({c,v:assessChain(c.statement,c.lines)})).filter((x:any)=>x.v.status==="verified");
let wrong=0, tested=0, same=0, truncated=0, tamper=0, tamperTested=0;
V.forEach((x:any,i:number)=>{ const y=V[(i+7)%V.length]; const tx=normalizeTask(x.c.statement), ty=normalizeTask(y.c.statement); if(tx.ok&&ty.ok&&tx.task.digest===ty.task.digest){same++;return;} tested++; if(replayDerivationChain(y.c.statement,x.c.lines,x.v.chain).ok) wrong++;
  if (x.v.chain.length>1){ truncated+= replayDerivationChain(x.c.statement,x.c.lines.slice(0,-1),x.v.chain).ok?1:0; }
  const cp=structuredClone(x.v.chain); cp[0].results=["999"]; tamperTested++; if(replayDerivationChain(x.c.statement,x.c.lines,cp).ok) tamper++; });
console.log({verifiedChains:V.length, crossTaskReplays:tested, replayedInWrongContext:wrong, sameDigestSkipped:same, truncatedAccepted:truncated, tamperedAccepted:tamper, tamperTested});
