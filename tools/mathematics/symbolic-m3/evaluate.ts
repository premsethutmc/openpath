import independent from "./independent-cases.v1.json";
import heldout from "./heldout-cases.v1.json";
import { assessMathematicalWorking } from "../../../packages/learning/src/unified-math-engine";

type Case = {id:string;area:string;problem:any;working:any[];expected:{classification:string;firstInvalidStep:number|null}};
function percentile(values:number[], p:number) { const s=[...values].sort((a,b)=>a-b); return s[Math.min(s.length-1,Math.floor((s.length-1)*p))] ?? 0; }
async function evaluate(name:string,cases:Case[]) {
  const failures:any[]=[]; const latency:number[]=[]; const counts:Record<string,number>={}; let falseAccept=0,falseReject=0,firstCorrect=0,firstTotal=0;
  for(const c of cases){const t=performance.now();const actual=await assessMathematicalWorking(c.problem,c.working,{});latency.push(performance.now()-t);counts[actual.classification]=(counts[actual.classification]??0)+1;
    if(actual.classification==="verified"&&c.expected.classification!=="verified")falseAccept++;
    if(actual.classification!=="verified"&&c.expected.classification==="verified")falseReject++;
    if(c.expected.firstInvalidStep!==null){firstTotal++;if(actual.firstInvalidStep===c.expected.firstInvalidStep)firstCorrect++;}
    if(actual.classification!==c.expected.classification||actual.firstInvalidStep!==c.expected.firstInvalidStep)failures.push({id:c.id,expected:c.expected,actual:{classification:actual.classification,firstInvalidStep:actual.firstInvalidStep,justification:actual.justification}});
  }
  return{name,total:cases.length,matched:cases.length-failures.length,falseAccept,falseReject,firstInvalidStep:{correct:firstCorrect,total:firstTotal},outcomes:counts,latencyMs:{median:percentile(latency,.5),p95:percentile(latency,.95),p99:percentile(latency,.99),throughputPerSecond:1000*cases.length/latency.reduce((a,b)=>a+b,0)},failures:failures.slice(0,30)};
}
const result={version:"symbolic-m3-evaluation@1",independent:await evaluate("independent",independent.cases as Case[]),heldout:await evaluate("heldout",heldout.cases as Case[])};
await Bun.write(new URL("./evaluation-results.v1.json",import.meta.url),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
