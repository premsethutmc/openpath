import { afterAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { assessMathematicalWorking, type MathematicalProblem, type StudentWorking } from "./unified-math-engine.ts";
import { geometryWorkerDiagnostics, healthGeometryWorker, stopGeometryWorkers, terminateGeometryWorker } from "./geometry-worker.ts";

const root = `${process.cwd()}/research/geometry-reasoner`;
const fixture = JSON.parse(readFileSync("tools/mathematics/unified-u2/independent-cases.v2.json", "utf8")) as { cases: { id:string; category:string; problem:MathematicalProblem; working:StudentWorking; options:Record<string,unknown>; expected:{classification:string;firstInvalidStep:number|null} }[] };
afterAll(() => stopGeometryWorkers());

describe("unified mathematics engine U2", () => {
  test("250 independently labelled proof-carrying transfer cases", async () => {
    expect(fixture.cases.length).toBe(250);
    let falseAcceptances=0,falseRejections=0,firstMatches=0;
    for (const item of fixture.cases) {
      const got=await assessMathematicalWorking(item.problem,item.working,item.options);
      falseAcceptances+=Number(got.classification==="verified"&&item.expected.classification!=="verified");
      falseRejections+=Number(got.classification!=="verified"&&item.expected.classification==="verified");
      firstMatches+=Number(got.firstInvalidStep===item.expected.firstInvalidStep);
      expect([item.id,got.classification,got.firstInvalidStep]).toEqual([item.id,item.expected.classification,item.expected.firstInvalidStep]);
    }
    expect({falseAcceptances,falseRejections,firstMatches}).toEqual({falseAcceptances:0,falseRejections:0,firstMatches:250});
  },30_000);

  test("repeated and concurrent requests reuse one persistent worker", async () => {
    stopGeometryWorkers();
    const before=await healthGeometryWorker(root) as {pid:number};
    const sample=fixture.cases.find((x)=>x.id==="u2-angle-00")!;
    const results=await Promise.all(Array.from({length:20},()=>assessMathematicalWorking(sample.problem,sample.working,sample.options)));
    const after=await healthGeometryWorker(root) as {pid:number};
    expect(results.every((x)=>x.classification==="verified")).toBe(true);
    expect(after.pid).toBe(before.pid);
    expect(geometryWorkerDiagnostics(root).starts).toBe(1);
  });

  test("worker termination and timeout fail closed and recover", async () => {
    const sample=fixture.cases.find((x)=>x.id==="u2-angle-01")!;
    const first=await assessMathematicalWorking(sample.problem,sample.working,sample.options);
    expect(first.classification).toBe("verified");
    const oldPid=geometryWorkerDiagnostics(root).pid;
    terminateGeometryWorker(root);
    const recovered=await assessMathematicalWorking(sample.problem,sample.working,sample.options);
    expect(recovered.classification).toBe("verified");
    expect(geometryWorkerDiagnostics(root).pid).not.toBe(oldPid);
    const timed=await assessMathematicalWorking(sample.problem,sample.working,{geometryTimeoutMs:0});
    expect(timed.classification).toBe("unsupported");
    expect(timed.failureKind).toBe("transport");
    const algebra=await assessMathematicalWorking({domain:"algebra",statement:"x+2=7"},["x=5"]);
    expect(algebra.classification).toBe("verified");
    const afterTimeout=await assessMathematicalWorking(sample.problem,sample.working,sample.options);
    expect(afterTimeout.classification).toBe("verified");
  });

  test("proof-carrying obligations reject circular, mismatched, and missing-domain transfers", async () => {
    for (const id of ["u2-adversarial-00","u2-adversarial-10","u2-adversarial-45"]) {
      const item=fixture.cases.find((x)=>x.id===id)!; const got=await assessMathematicalWorking(item.problem,item.working,item.options);
      expect(got.classification).toBe("malformed"); expect(got.correct).toBeNull();
    }
  });
});
