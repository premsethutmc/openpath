import { readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { assessMathematicalWorking, type MathematicalProblem, type StudentWorking } from "../../../packages/learning/src/unified-math-engine.ts";

type Case = {
  id: string;
  domain: string;
  problem: MathematicalProblem;
  working: StudentWorking;
  options: Record<string, unknown>;
  expected: { classification: string; firstInvalidStep: number | null };
};

const input = JSON.parse(readFileSync(new URL("./independent-cases.v1.json", import.meta.url), "utf8")) as { cases: Case[] };
const domains: Record<string, { cases: number; accepted: number; rejected: number; failures: number; elapsedMs: number }> = {};
let falseAcceptances = 0;
let falseRejections = 0;
let firstInvalidStepMatches = 0;
let failures = 0;
for (const item of input.cases) {
  const started = performance.now();
  const result = await assessMathematicalWorking(item.problem, item.working, item.options);
  const elapsedMs = performance.now() - started;
  const bucket = domains[item.domain] ??= { cases: 0, accepted: 0, rejected: 0, failures: 0, elapsedMs: 0 };
  bucket.cases++;
  bucket.elapsedMs += elapsedMs;
  const matched = result.classification === item.expected.classification && result.firstInvalidStep === item.expected.firstInvalidStep;
  if (matched) bucket.accepted++; else { bucket.rejected++; bucket.failures++; failures++; }
  if (result.classification === "verified" && item.expected.classification !== "verified") falseAcceptances++;
  if (result.classification !== "verified" && item.expected.classification === "verified") falseRejections++;
  if (result.firstInvalidStep === item.expected.firstInvalidStep) firstInvalidStepMatches++;
}
const report = {
  version: "unified-math-u1-evaluation@1",
  corpus: "independent-cases.v1.json",
  totalCases: input.cases.length,
  failures,
  falseAcceptances,
  falseRejections,
  firstInvalidStepMatches,
  domains: Object.fromEntries(Object.entries(domains).map(([name, value]) => [name, { ...value, meanMs: Number((value.elapsedMs / value.cases).toFixed(3)), elapsedMs: Number(value.elapsedMs.toFixed(3)) }])),
};
writeFileSync(new URL("./results.v1.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures) process.exitCode = 1;
