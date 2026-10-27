import {afterEach,beforeEach,describe,expect,test} from "bun:test";
import {readFileSync} from "node:fs";
import {assessMathematicalWorking,type MathematicalProblem,type StudentWorking} from "./unified-math-engine.ts";
import {geometryWorkerDiagnostics,shutdownGeometryWorkerPools,terminateGeometryWorker} from "./geometry-worker.ts";
const root=`${process.cwd()}/research/geometry-reasoner`;
const cases=(JSON.parse(readFileSync("tools/mathematics/unified-u2/independent-cases.v2.json","utf8")) as {cases:{id:string;problem:MathematicalProblem;working:StudentWorking}[]}).cases;
const source=cases.find(x=>x.id==="u2-angle-00")!;
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
const configured=(problem:MathematicalProblem,working:StudentWorking,extra:Record<string,unknown>={})=>assessMathematicalWorking(problem,working,{geometryWorkerCount:2,geometryQueueLimit:128,...extra});
// E3: bun runs every test file in one process and the geometry pools are process-global; without a clean start the counters include other files' work (observed completed=204 in the full run, 100 in isolation).
beforeEach(async()=>{await shutdownGeometryWorkerPools(100);});
afterEach(async()=>{delete process.env.OPENPATH_GEOMETRY_TEST_DELAY_ID;delete process.env.OPENPATH_GEOMETRY_TEST_DELAY_MS;await shutdownGeometryWorkerPools(100);});

describe("bounded geometry worker pool",()=>{
 test("pool diagnostics belong to one pool lifetime (no leakage from earlier users of the process)",async()=>{
  await configured(source.problem,source.working);await configured(source.problem,source.working);await shutdownGeometryWorkerPools(100);
  await configured(source.problem,source.working);const d=geometryWorkerDiagnostics(root,"python3",{workerCount:2,maxQueue:128});expect(d.completed).toBe(1);expect(d.workerStarts).toBeLessThanOrEqual(2);
 });
 test("100 concurrent assessments preserve U2 mathematical verdicts",async()=>{
  const results=await Promise.all(Array.from({length:100},()=>configured(source.problem,source.working)));
  expect(results.every(x=>x.classification==="verified")).toBe(true);
  const d=geometryWorkerDiagnostics(root,"python3",{workerCount:2,maxQueue:128});
  expect(d.workerStarts).toBe(2);expect(d.completed).toBe(100);expect(d.queueDepthHighWater).toBeGreaterThan(1);expect(d.latency.p99).toBeGreaterThanOrEqual(d.latency.p50);
 });
 test("a deliberately slow worker does not block an independent worker",async()=>{
  await shutdownGeometryWorkerPools(0);process.env.OPENPATH_GEOMETRY_TEST_DELAY_ID="slow-case";process.env.OPENPATH_GEOMETRY_TEST_DELAY_MS="300";
  const slowProblem=clone(source.problem) as any;slowProblem.geometry.problem.id="slow-case";
  const slow=configured(slowProblem,source.working,{geometryTimeoutMs:1000});
  await new Promise(r=>setTimeout(r,20));const started=performance.now();const fast=await configured(source.problem,source.working,{geometryTimeoutMs:200});const elapsed=performance.now()-started;
  expect(fast.classification).toBe("verified");expect(elapsed).toBeLessThan(200);expect((await slow).classification).toBe("verified");
 });
 test("queue saturation and queued cancellation are explicit",async()=>{
  await shutdownGeometryWorkerPools(0);process.env.OPENPATH_GEOMETRY_TEST_DELAY_ID="slow-case";process.env.OPENPATH_GEOMETRY_TEST_DELAY_MS="300";
  const p=clone(source.problem) as any;p.geometry.problem.id="slow-case";const opts={geometryWorkerCount:1,geometryQueueLimit:1,geometryTimeoutMs:1000};
  const active=assessMathematicalWorking(p,source.working,opts);const controller=new AbortController();const queued=assessMathematicalWorking(p,source.working,{...opts,signal:controller.signal});
  const saturated=await assessMathematicalWorking(p,source.working,opts);expect(saturated.infrastructureFailure).toBe("queue-full");controller.abort();expect((await queued).infrastructureFailure).toBe("cancelled");expect((await active).classification).toBe("verified");
 });
 test("crash isolation, repeated replacement, and algebra isolation",async()=>{
  const opts={workerCount:2,maxQueue:8};await configured(source.problem,source.working,{geometryQueueLimit:8});
  for(let i=0;i<3;i++){terminateGeometryWorker(root,"python3",0,opts);const result=await configured(source.problem,source.working,{geometryQueueLimit:8});expect(result.classification).toBe("verified");}
  const algebra=await assessMathematicalWorking({domain:"algebra",statement:"x+9=14"},["x=5"]);expect(algebra.classification).toBe("verified");
 });
 test("graceful shutdown drains in-flight work and leaves no live child",async()=>{
  await shutdownGeometryWorkerPools(0);process.env.OPENPATH_GEOMETRY_TEST_DELAY_ID="slow-case";process.env.OPENPATH_GEOMETRY_TEST_DELAY_MS="80";const p=clone(source.problem) as any;p.geometry.problem.id="slow-case";
  const inFlight=configured(p,source.working,{geometryTimeoutMs:500});await new Promise(r=>setTimeout(r,10));const pids=geometryWorkerDiagnostics(root).pids.filter((x):x is number=>typeof x==="number");await shutdownGeometryWorkerPools(500);expect((await inFlight).classification).toBe("verified");await new Promise(r=>setTimeout(r,20));for(const pid of pids){let alive=true;try{process.kill(pid,0);}catch{alive=false;}expect(alive).toBe(false);}
 });
 test("proof and dependency size limits fail as resource exhaustion",async()=>{
  const p=clone(source.problem) as any;p.domain="geometry";p.problem=p.geometry.problem;delete p.geometry;const statement=p.problem.goal;const working={steps:Array.from({length:2049},(_,i)=>({id:`s${i}`,statement}))};const got=await assessMathematicalWorking(p,working,{geometryTimeoutMs:1000});expect(got.classification).toBe("resource-exhausted");expect(got.correct).toBeNull();
 });
});
