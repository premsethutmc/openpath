import { test } from "node:test";
import assert from "node:assert/strict";
import { solve, gate } from "./domain-engine.ts";

test("removable singularity: candidate equals an excluded value and is rejected", () => {
  const r = solve("(x^2-4)/(x-2)=4"); assert.equal(r.class, "none"); assert.deepEqual(r.candidatesRejected, ["2"]); assert.deepEqual(r.restrictions, ["2"]);
});
test("unique solution is verified in the original equation", () => {
  const r = solve("3/x=6"); assert.equal(r.class, "unique"); assert.deepEqual(r.solution, ["1/2"]);
  assert.ok(r.steps.at(-1)!.rule === "domain.accept-candidate");
});
test("restricted identity is not 'all real numbers'", () => {
  const r = solve("1/(x-1)+1/(x+1)=2*x/(x^2-1)"); assert.equal(r.class, "identity-on-domain"); assert.deepEqual(r.restrictions, ["-1", "1"]);
});
test("refusals carry oracle reason codes and never an answer", () => {
  assert.deepEqual(solve("2/(x+3)+4/(x-1)=1").reasons, ["reduced-degree>=2"]);
  assert.deepEqual(solve("2*x+1=7").reasons, ["no-variable-denominator"]);
  assert.deepEqual(gate("1/(x^2+1)=1").reasons.includes("denominator-outside-boundary"), true);
  for (const t of ["2/(x+3)+4/(x-1)=1", "2*x+1=7"]) assert.equal(solve(t).solution, null);
});
test("traces are deterministic and every step carries discharged obligations", () => {
  const a = JSON.stringify(solve("x/(x-2)=2/(x-2)+3")), b = JSON.stringify(solve("x/(x-2)=2/(x-2)+3"));
  const strip = (s: string) => s.replace(/"ms":[0-9.]+/, "");
  assert.equal(strip(a), strip(b));
  for (const s of solve("x/(x-2)=2/(x-2)+3").steps) assert.ok(s.obligations.every((o) => o.startsWith("discharged")) && s.preconditions.every((p) => p.startsWith("ok")));
});
test("a candidate written c = x is recognised (symmetry of equality)", () => {
  const r = solve("-6=x^2/x"); assert.equal(r.class, "unique"); assert.deepEqual(r.solution, ["-6"]);
});
