import { assessMathematicalWorking } from "../../../packages/learning/src/unified-math-engine";
import { benchmark, fixture } from "./benchmark-fixtures";

const select = (mode: string) => fixture(benchmark.cases.find((item) => item.mode === mode)!);
const workloads: Record<string, ReturnType<typeof fixture>> = {
  "verified-two-stage-transfer": select("valid-reference"),
  "verified-nonadjacent-reuse": select("valid-alternative"),
  "invalid-scope": select("wrong-scope"),
  "invalid-type": select("invalid-type"),
  "31-stage-resource-boundary": select("resource-exhausted"),
};
const output: any = { version: "openpath-d3-performance@1", iterationsPerWorkload: 500, results: {} };
for (const [name, workload] of Object.entries(workloads)) {
  const elapsed: number[] = [];
  for (let index = 0; index < 500; index += 1) {
    const started = performance.now();
    await assessMathematicalWorking(workload.problem, workload.working);
    elapsed.push(performance.now() - started);
  }
  elapsed.sort((a, b) => a - b);
  const percentile = (fraction: number) => elapsed[Math.floor((elapsed.length - 1) * fraction)];
  output.results[name] = { p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99) };
}
await Bun.write(new URL("./performance-results.v1.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(output);
