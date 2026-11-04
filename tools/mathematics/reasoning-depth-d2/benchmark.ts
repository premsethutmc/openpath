import { assessMathematicalWorking } from "../../../packages/learning/src/unified-math-engine";
import { benchmark, fixture } from "./benchmark-fixtures";

const source = benchmark.cases.find((item) => item.category === "multi-domain" && item.selectedRoute === "alternative")!;
const base = fixture(source) as any;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function sized(size: number) {
  const problemStages = clone(base.problem.stages);
  const workingStages = clone(base.working.stages);
  return {
    problem: {
      domain: "m2-cross-domain",
      stages: Array.from({ length: size }, (_, index) => ({
        ...clone(problemStages[index % problemStages.length]),
        id: `bench-${index}`,
        dependsOn: index ? [`bench-${index - 1}`] : [],
      })),
    },
    working: {
      stages: Array.from({ length: size }, (_, index) => ({
        id: `bench-${index}`,
        working: clone(workingStages[index % workingStages.length].working),
      })),
    },
  };
}

const workloads: Record<string, ReturnType<typeof sized>> = {
  "5-step": sized(5),
  "10-step": sized(10),
  "20-step": sized(20),
  "mixed-domain": sized(12),
  "adversarial-31-step": sized(31),
};
const output: any = { version: "openpath-d2-performance@1", iterationsPerWorkload: 200, results: {} };
for (const [name, workload] of Object.entries(workloads)) {
  const elapsed: number[] = [];
  for (let index = 0; index < 200; index += 1) {
    const started = performance.now();
    await assessMathematicalWorking(workload.problem as any, workload.working as any);
    elapsed.push(performance.now() - started);
  }
  elapsed.sort((left, right) => left - right);
  const percentile = (fraction: number) => elapsed[Math.floor((elapsed.length - 1) * fraction)];
  output.results[name] = { p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99) };
}
await Bun.write(new URL("./performance-results.v1.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(output);
