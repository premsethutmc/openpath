import { describe, expect, test } from "bun:test";
import adversarial from "../../../tools/mathematics/reasoning-depth-d2/adversarial-cases.v1.json";
import benchmark from "../../../tools/mathematics/reasoning-depth-d2/frozen-external-benchmark.v1.json";
import b3 from "../../../tools/mathematics/complex-b3/independent-cases.v1.json";
import { fixture } from "../../../tools/mathematics/reasoning-depth-d2/benchmark-fixtures";
import { assessMathematicalWorking } from "./unified-math-engine";
import { shutdownGeometryWorkerPools } from "./geometry-worker";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function adversarialFixture(item: (typeof adversarial.cases)[number]) {
  const reference = benchmark.cases.find((entry) => entry.selectedRoute === "alternative" && entry.category === "multi-domain")!;
  const result = fixture(reference) as any;
  if (item.category === "incorrect-cross-domain-assumption") result.problem.stages[0].dependsOn = ["unproved-fact"];
  if (item.category === "circular-reasoning") result.problem.stages[0].dependsOn = [result.problem.stages[0].id];
  if (item.category === "invalid-substitution" || item.category === "correct-final-after-invalid") {
    const bad = clone((b3 as any).cases.find((entry: any) => entry.expected.classification === "invalid" && entry.working.length === 1));
    result.problem.stages[2].problem = bad.problem;
    result.working.stages[2].working = bad.working;
  }
  if (item.category === "missing-domain-restriction") {
    const missing = clone((b3 as any).cases.find((entry: any) => entry.expected.classification === "missing-assumption"));
    result.problem.stages[0].problem = missing.problem;
    result.working.stages[0].working = missing.working;
  }
  if (item.category === "incorrect-method-transition") {
    const unsupported = clone((b3 as any).cases.find((entry: any) => entry.expected.classification === "unsupported"));
    result.problem.stages[2].problem = unsupported.problem;
    result.working.stages[2].working = unsupported.working;
  }
  if (item.category === "valid-unconventional-route") {
    const stages = [...result.problem.stages].reverse();
    const working = [...result.working.stages].reverse();
    result.problem.stages = Array.from({ length: 10 }, (_, index) => {
      const source = clone(stages[index % stages.length]);
      source.id = `unconventional-${index}`;
      source.dependsOn = index ? [`unconventional-${index - 1}`] : [];
      return source;
    });
    result.working.stages = Array.from({ length: 10 }, (_, index) => ({
      id: `unconventional-${index}`,
      working: clone(working[index % working.length].working),
    }));
  }
  if (item.category === "resource-exhaustion") {
    const sourceProblem = clone(result.problem.stages[0].problem);
    const sourceWorking = clone(result.working.stages[0].working);
    result.problem.stages = Array.from({ length: 31 }, (_, index) => ({ id: `exhaust-${index}`, problem: sourceProblem, dependsOn: index ? [`exhaust-${index - 1}`] : [] }));
    result.working.stages = Array.from({ length: 31 }, (_, index) => ({ id: `exhaust-${index}`, working: sourceWorking }));
  }
  return result;
}

describe("D2 generalized cross-domain reasoning depth", () => {
  test("the frozen external benchmark improves without label changes", async () => {
    expect(benchmark.cases).toHaveLength(200);
    let matches = 0, valid = 0, accepted = 0, falseAcceptances = 0, falseRejections = 0, firstInvalid = 0;
    for (const item of benchmark.cases) {
      const current = fixture(item);
      const assessment = await assessMathematicalWorking(current.problem, current.working, { geometryWorkerCount: 2, geometryQueueLimit: 64 });
      matches += Number(assessment.classification === item.expected.classification && assessment.firstInvalidStep === item.expected.firstInvalidStep);
      valid += Number(item.expected.classification === "verified");
      accepted += Number(item.expected.classification === "verified" && assessment.classification === "verified");
      falseAcceptances += Number(item.expected.classification !== "verified" && assessment.classification === "verified");
      falseRejections += Number(item.expected.classification === "verified" && assessment.classification !== "verified");
      firstInvalid += Number(item.expected.classification === "invalid" && assessment.firstInvalidStep === item.expected.firstInvalidStep);
      if (assessment.classification === "verified") {
        expect(assessment.reasoners.some((reasoner) => reasoner.id === "unified:d2-proof-state")).toBeTrue();
        expect((assessment.domainPayload as any).proofState.establishedFacts.every((fact: any) => fact.independentlyVerified)).toBeTrue();
      }
    }
    expect({ matches, valid, accepted, falseAcceptances, falseRejections, firstInvalid }).toEqual({ matches: 200, valid: 120, accepted: 120, falseAcceptances: 0, falseRejections: 0, firstInvalid: 40 });
    await shutdownGeometryWorkerPools(500);
  }, 30_000);

  test("150 focused adversarial proof states fail closed", async () => {
    expect(adversarial.cases).toHaveLength(150);
    let matches = 0, falseAcceptances = 0, firstInvalid = 0, kernelVerified = 0;
    for (const item of adversarial.cases) {
      const current = adversarialFixture(item);
      const assessment = await assessMathematicalWorking(current.problem, current.working);
      matches += Number(assessment.classification === item.expected.classification && assessment.firstInvalidStep === item.expected.firstInvalidStep);
      falseAcceptances += Number(assessment.classification === "verified" && item.expected.classification !== "verified");
      firstInvalid += Number(item.expected.classification === "invalid" && assessment.firstInvalidStep === item.expected.firstInvalidStep);
      kernelVerified += Number(assessment.classification !== "verified" || (assessment.domainPayload as any).proofState.establishedFacts.every((fact: any) => fact.independentlyVerified));
      expect([item.id, assessment.classification, assessment.firstInvalidStep]).toEqual([item.id, item.expected.classification, item.expected.firstInvalidStep]);
    }
    expect({ matches, falseAcceptances, firstInvalid, kernelVerified }).toEqual({ matches: 150, falseAcceptances: 0, firstInvalid: 40, kernelVerified: 150 });
  }, 30_000);
});
