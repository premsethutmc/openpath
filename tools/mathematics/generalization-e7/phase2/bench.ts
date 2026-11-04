// Latency/memory comparison on the E6 + E6-R corpora. Usage: ENGINE_ROOT=<worktree> bun bench.ts
import { readFileSync } from "node:fs"; import { performance } from "node:perf_hooks";
const root = process.env.ENGINE_ROOT ?? new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const { assessMathematicalWorking } = await import(root + "/packages/learning/src/unified-math-engine.ts");
const T = new URL("../../", import.meta.url).pathname;
const files = ["generalization-e6/dev-cases.v1.json", "generalization-e6/validation-cases.v1.json", "generalization-e6/sealed-cases.v1.json", "generalization-e6r/holdout1/holdout-cases.v1.json", "generalization-e6r/holdout2/holdout-cases.v1.json"];
const cases = files.flatMap((f) => JSON.parse(readFileSync(T + f, "utf8")).cases).filter((c: any) => c.studentWorking && !Array.isArray(c.studentWorking) && c.studentWorking.format === "natural");
const lat: number[] = [];
for (let pass = 0; pass < 2; pass++) for (const c of cases) { const t = performance.now(); await assessMathematicalWorking(c.problem, c.studentWorking); if (pass) lat.push(performance.now() - t); }
lat.sort((a, b) => a - b); const q = (p: number) => lat[Math.floor(p * (lat.length - 1))];
console.log(JSON.stringify({ engine: root, cases: cases.length, totalMs: Math.round(lat.reduce((a, b) => a + b, 0)), p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +lat[lat.length - 1].toFixed(1), rssMB: Math.round(process.memoryUsage().rss / 1e6) }));
