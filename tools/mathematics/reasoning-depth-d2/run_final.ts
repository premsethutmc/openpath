import { assessMathematicalWorking } from "../../../packages/learning/src/unified-math-engine";
import { shutdownGeometryWorkerPools } from "../../../packages/learning/src/geometry-worker";
import { benchmark, fixture } from "./benchmark-fixtures";

const results: any[] = [];
for (const item of benchmark.cases) {
  const { problem, working } = fixture(item);
  const assessment = await assessMathematicalWorking(problem, working, {
    geometryWorkerCount: 2,
    geometryQueueLimit: 64,
  });
  const proofState = (assessment.domainPayload as any)?.proofState;
  results.push({
    id: item.id,
    category: item.category,
    selectedRoute: item.selectedRoute,
    expected: item.expected,
    actual: { classification: assessment.classification, firstInvalidStep: assessment.firstInvalidStep },
    kernelBacked: assessment.classification !== "verified" || (
      assessment.reasoners.some((reasoner) => reasoner.id === "unified:d2-proof-state") &&
      proofState?.establishedFacts?.every((fact: any) => fact.independentlyVerified === true)
    ),
    match: assessment.classification === item.expected.classification && assessment.firstInvalidStep === item.expected.firstInvalidStep,
  });
}
const valid = results.filter((item) => item.expected.classification === "verified");
const invalid = results.filter((item) => item.expected.classification === "invalid");
const output = {
  version: "openpath-d2-final@1",
  benchmarkSha256: "ebdcbadc6a8824340154569f0669812ab2f1ab61a35cd86e5a7292064d41f9c9",
  total: results.length,
  exactMatches: results.filter((item) => item.match).length,
  validSolutions: valid.length,
  validAccepted: valid.filter((item) => item.actual.classification === "verified").length,
  newlyAcceptedValidRoutes: valid.filter((item) => item.selectedRoute === "reference-long" && item.actual.classification === "verified").length,
  falseAcceptances: results.filter((item) => item.actual.classification === "verified" && item.expected.classification !== "verified").length,
  falseRejections: valid.filter((item) => item.actual.classification !== "verified").length,
  firstInvalidStepMatches: invalid.filter((item) => item.actual.firstInvalidStep === item.expected.firstInvalidStep).length,
  invalidCases: invalid.length,
  unsupported: results.filter((item) => item.actual.classification === "unsupported").length,
  inconclusive: results.filter((item) => item.actual.classification === "inconclusive").length,
  resourceExhausted: results.filter((item) => item.actual.classification === "resource-exhausted").length,
  kernelCoverage: results.filter((item) => item.kernelBacked).length,
  results,
};
await Bun.write(new URL("./final-results.v1.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ ...output, results: undefined }, null, 2));
await shutdownGeometryWorkerPools(500);
