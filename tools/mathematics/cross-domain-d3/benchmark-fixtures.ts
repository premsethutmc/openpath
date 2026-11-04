import benchmark from "./frozen-cross-domain-cases.v1.json";
import b1 from "../probability-b1/independent-cases.v1.json";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const source = clone((b1 as any).cases.find((item: any) => item.id === "b1-combinatorics-000"));
const invalidSource = clone((b1 as any).cases.find((item: any) => item.expected.classification === "invalid" && item.working.length === 1));

const scalarReference = (scope = "problem") => ({
  kind: "binding-reference",
  bindingId: "count",
  expectedType: "exact-scalar",
  symbol: { name: "n", scope },
});

export function fixture(item: (typeof benchmark.cases)[number]): { problem: any; working: any } {
  const sourceCase = item.mode === "unverified-source" ? invalidSource : source;
  const destinationProblem = {
    domain: "linear-algebra",
    area: "vector",
    task: "scalar-multiply",
    data: { a: ["1", "2", "3"], scalar: scalarReference(item.mode === "wrong-scope" ? "local-shadow" : "problem") },
    assumptions: [],
  };
  const sourceStage: any = {
    id: "source",
    problem: clone(sourceCase.problem),
    dependsOn: item.mode === "circular" ? ["destination"] : [],
    exports: [{
      id: "count",
      mathematicalType: "exact-scalar",
      symbol: { name: "n", scope: "problem" },
      source: { workingPath: ["0", "result"], proofStepId: "s0" },
      assumptions: item.mode === "missing-assumption" ? ["positive:n"] : [],
      domainRestrictions: [],
      outstandingObligations: [],
    }],
  };
  const destinationStage: any = {
    id: "destination",
    problem: destinationProblem,
    dependsOn: ["source"],
    imports: [{
      bindingId: "count",
      expectedType: item.mode === "invalid-type" ? "vector" : item.mode === "domain-mismatch" ? "probability" : "exact-scalar",
      symbol: { name: "n", scope: "problem" },
    }],
  };
  const stages: any[] = [sourceStage, destinationStage];
  const submitted: any[] = [
    { id: "source", working: clone(sourceCase.working) },
    { id: "destination", working: [{ id: "s0", rule: "component-wise", result: { kind: "vector", value: ["6", "12", "18"] }, dependencies: [] }] },
  ];
  if (item.mode === "valid-alternative") {
    stages.push({
      id: "reuse",
      problem: clone(destinationProblem),
      dependsOn: ["source"],
      imports: [{ bindingId: "count", expectedType: "exact-scalar", symbol: { name: "n", scope: "problem" } }],
    });
    submitted.push({ id: "reuse", working: clone(submitted[1].working) });
  }
  if (item.mode === "resource-exhausted") {
    const first = clone(sourceStage);
    first.exports = [];
    const oneWorking = clone(sourceCase.working);
    return {
      problem: { domain: "d3-cross-domain", stages: Array.from({ length: 31 }, (_, index) => ({ ...clone(first), id: `stage-${index}`, dependsOn: index ? [`stage-${index - 1}`] : [] })) },
      working: { stages: Array.from({ length: 31 }, (_, index) => ({ id: `stage-${index}`, working: clone(oneWorking) })) },
    };
  }
  return { problem: { domain: "d3-cross-domain", stages }, working: { stages: submitted } };
}

export { benchmark };
