import { benchmark, fixture } from "./benchmark-fixtures";
import { execFileSync } from "node:child_process";

const engineRoot = process.env.OPENPATH_B3_ROOT;
if (!engineRoot) throw new Error("Set OPENPATH_B3_ROOT to an isolated checkout of B3 commit 9bcda37");
const commit = execFileSync("git", ["-C", engineRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (commit !== "9bcda37cc98fd4561979156a0f4362580800a4d3") throw new Error(`B3 baseline requires 9bcda37, received ${commit}`);
const { assessMathematicalWorking } = await import(`${engineRoot}/packages/learning/src/unified-math-engine.ts`);
const { shutdownGeometryWorkerPools } = await import(`${engineRoot}/packages/learning/src/geometry-worker.ts`);

const results: any[] = [];
for (const item of benchmark.cases) {
  const { problem, working } = fixture(item);
  const assessment = await assessMathematicalWorking(problem, working, {
    geometryWorkerCount: 2,
    geometryQueueLimit: 64,
  });
  results.push({
    id: item.id,
    category: item.category,
    selectedRoute: item.selectedRoute,
    expected: item.expected,
    actual: { classification: assessment.classification, firstInvalidStep: assessment.firstInvalidStep },
    match: assessment.classification === item.expected.classification && assessment.firstInvalidStep === item.expected.firstInvalidStep,
  });
}
const valid = results.filter((item) => item.expected.classification === "verified");
const output = {
  version: "openpath-d2-b3-baseline@1",
  engineCommit: "9bcda37cc98fd4561979156a0f4362580800a4d3",
  benchmarkSha256: "ebdcbadc6a8824340154569f0669812ab2f1ab61a35cd86e5a7292064d41f9c9",
  total: results.length,
  exactMatches: results.filter((item) => item.match).length,
  validSolutions: valid.length,
  validAccepted: valid.filter((item) => item.actual.classification === "verified").length,
  falseAcceptances: results.filter((item) => item.actual.classification === "verified" && item.expected.classification !== "verified").length,
  falseRejections: valid.filter((item) => item.actual.classification !== "verified").length,
  unsupported: results.filter((item) => item.actual.classification === "unsupported").length,
  inconclusive: results.filter((item) => item.actual.classification === "inconclusive").length,
  resourceExhausted: results.filter((item) => item.actual.classification === "resource-exhausted").length,
  results,
};
await Bun.write(new URL("./b3-baseline-results.v1.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ ...output, results: undefined }, null, 2));
await shutdownGeometryWorkerPools(500);
