import corpus from "./independent-cases.v1.json";
import { assessMathematicalWorking } from "../../../packages/learning/src/unified-math-engine";

const output: any = { version: "complex-b3-performance@1", results: {} };
for (const area of ["arithmetic", "polar", "polynomial", "geometry"]) {
  const cases = corpus.cases.filter(
    (item) => item.area === area && item.expected.classification === "verified",
  );
  const measurements: number[] = [];
  for (let repeat = 0; repeat < 20; repeat += 1) {
    for (const item of cases) {
      const started = performance.now();
      await assessMathematicalWorking(item.problem as any, item.working as any);
      measurements.push(performance.now() - started);
    }
  }
  measurements.sort((left, right) => left - right);
  const percentile = (fraction: number) => measurements[Math.floor((measurements.length - 1) * fraction)];
  output.results[area] = {
    n: measurements.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
  };
}
await Bun.write(
  new URL("./performance-results.v1.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(output);
