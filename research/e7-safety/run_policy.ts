// Runs the unchanged audit adapter (research/generalization-audit/adapter/run_e7.ts) on the current engine.
// Usage (repo root): bun research/e7-safety/run_policy.ts <adapter-inputs.json> <out.json>
// (The earlier solution-loss switch was removed in the finalisation: explicit ⇔ claims are invalid, incomplete answers incomplete.)
await import("../generalization-audit/adapter/run_e7.ts");
