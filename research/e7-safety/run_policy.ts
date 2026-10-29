// Runs the unchanged audit adapter (research/generalization-audit/adapter/run_e7.ts) under a chosen F7 solution-loss policy.
// Usage (repo root): bun research/e7-safety/run_policy.ts <incomplete|invalid> <adapter-inputs.json> <out.json>
const policy = process.argv[2] as "incomplete" | "invalid";
if (policy !== "incomplete" && policy !== "invalid") throw Error("policy must be incomplete or invalid");
const { withSolutionLossPolicyAsync } = await import("../../packages/learning/src/independent-checker.ts");
process.argv.splice(2, 1); // run_e7 reads argv[2], argv[3]
await withSolutionLossPolicyAsync(policy, async () => { await import("../generalization-audit/adapter/run_e7.ts"); });
