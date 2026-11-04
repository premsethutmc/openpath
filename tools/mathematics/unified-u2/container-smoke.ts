import {readFileSync} from "node:fs";
import {assessMathematicalWorking} from "../../../packages/learning/src/unified-math-engine.ts";
import {healthGeometryWorker,shutdownGeometryWorkerPools} from "../../../packages/learning/src/geometry-worker.ts";
const root=`${process.cwd()}/research/geometry-reasoner`;
const health=await healthGeometryWorker(root);
if(process.argv.includes("--health")){if((health as any).status!=="ok")process.exitCode=1;await shutdownGeometryWorkerPools(1000);}
else if(process.argv.includes("--serve")){console.log(JSON.stringify({status:"ready",protocol:(health as any).protocol}));await new Promise<void>(resolve=>{const stop=async()=>{await shutdownGeometryWorkerPools(1000);resolve();};process.once("SIGTERM",stop);process.once("SIGINT",stop);});}
else{try{const fixture=JSON.parse(readFileSync("tools/mathematics/unified-u2/independent-cases.v2.json","utf8")).cases[0];const result=await assessMathematicalWorking(fixture.problem,fixture.working);if(result.classification!=="verified")throw new Error("container assessment failed");console.log(JSON.stringify({status:"ok",classification:result.classification,protocol:(health as any).protocol}));}finally{await shutdownGeometryWorkerPools(1000);}}
