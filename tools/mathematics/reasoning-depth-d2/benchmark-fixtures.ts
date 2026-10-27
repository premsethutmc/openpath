import benchmark from "./frozen-external-benchmark.v1.json";
import m1 from "../m1/independent-cases.v1.json";
import m2 from "../m2/independent-cases.v1.json";
import b1 from "../probability-b1/independent-cases.v1.json";
import b2 from "../linear-algebra-b2/independent-cases.v1.json";
import b3 from "../complex-b3/independent-cases.v1.json";
import calculus from "../calculus/independent-cases.v1.json";
import u2 from "../unified-u2/independent-cases.v2.json";
import type { M2CrossDomainProblem, M2CrossDomainWorking } from "../../../packages/learning/src/unified-math-engine";

type NativeCase = { problem: any; working: any; expected?: { classification: string } };
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const verified = (source: { cases: NativeCase[] }, predicate: (item: NativeCase) => boolean = () => true) =>
  copy(source.cases.find((item) => item.expected?.classification === "verified" && predicate(item))!);

const library: Record<string, NativeCase[]> = {
  "algebra-equations": [verified(m1 as any), verified(m1 as any, (x) => x.problem.domain === "quadratic"), verified(m2 as any, (x) => x.problem.domain === "radical")],
  trigonometry: [verified(m2 as any, (x) => x.problem.domain === "trigonometry"), verified(m1 as any, (x) => x.problem.domain === "quadratic"), verified(m2 as any, (x) => x.problem.domain === "exponential-log")],
  geometry: [verified(m1 as any, (x) => x.problem.domain === "coordinate"), verified(m2 as any, (x) => x.problem.domain === "trigonometry"), verified(u2 as any, (x) => x.problem.domain === "mixed")],
  calculus: [verified(calculus as any, (x) => x.working.length === 1), verified(m1 as any, (x) => x.problem.domain === "quadratic"), verified(m2 as any, (x) => x.problem.domain === "radical")],
  "probability-combinatorics": [verified(b1 as any, (x) => x.problem.area === "combinatorics"), verified(b1 as any, (x) => x.problem.area === "probability"), verified(m1 as any)],
  "vectors-matrices": [verified(b2 as any, (x) => x.problem.area === "vector"), verified(b2 as any, (x) => x.problem.area === "system"), verified(m1 as any, (x) => x.problem.domain === "coordinate")],
  "complex-numbers": [verified(b3 as any, (x) => x.problem.area === "arithmetic"), verified(b3 as any, (x) => x.problem.area === "polynomial"), verified(m1 as any, (x) => x.problem.domain === "quadratic")],
  "multi-domain": [verified(b1 as any), verified(b2 as any), verified(b3 as any), verified(m2 as any), verified(calculus as any, (x) => x.working.length === 1)],
};

const invalid = copy((b3 as any).cases.find((item: NativeCase) => item.expected?.classification === "invalid" && item.working.length === 1)!);
const unsupported = copy((b3 as any).cases.find((item: NativeCase) => item.expected?.classification === "unsupported")!);

export type D2BenchmarkCase = (typeof benchmark.cases)[number];

export function fixture(item: D2BenchmarkCase): { problem: M2CrossDomainProblem; working: M2CrossDomainWorking } {
  const source = copy(library[item.category]);
  if (item.selectedRoute === "alternative") source.reverse();
  const stageCount = item.selectedStageCount;
  const selected = Array.from({ length: stageCount }, (_, index) => copy(source[index % source.length]));
  if (item.selectedRoute === "incorrect") selected[2] = copy(invalid);
  if (item.selectedRoute === "unsupported") selected[2] = copy(unsupported);

  const stages = selected.map((entry, index) => ({
    id: `stage-${index}`,
    problem: entry.problem,
    dependsOn: index ? [`stage-${index - 1}`] : [],
  }));
  if (item.selectedRoute === "circular") stages[0].dependsOn = [stages[0].id];
  const submitted = selected.map((entry, index) => ({ id: `stage-${index}`, working: entry.working }));
  if (item.selectedRoute === "incomplete") submitted.pop();
  return { problem: { domain: "m2-cross-domain", stages } as M2CrossDomainProblem, working: { stages: submitted } as M2CrossDomainWorking };
}

export { benchmark };
