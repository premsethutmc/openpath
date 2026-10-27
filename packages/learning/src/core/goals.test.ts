import { test } from "node:test";
import assert from "node:assert/strict";
import { begin, goalFor } from "./compose.ts";

// Regression for A-6-017: a start term such as 3*(2x-2)/(x-1) is the polynomial 6 once cancelled, so it must not count as a fraction.
// The planner's earlier end state below keeps FOUR fraction terms against a start of THREE and must not satisfy REDUCED.
const START = "3*(x*2-2)/(x-1)+6*(x+3)/((x+3)*(x+3))=3/(x+3)+3/(x+3)";
test("A-6-017: REDUCED rejects a state with more fraction terms than the reduced start", () => {
  const g = goalFor("REDUCED", START);
  assert.equal(g.test(begin("-6-6/(x+3)-(0*(x+3)+(-3)-3)/(x+3)=(0*(x+3)+-3-3)/(x+3)-(0*(x+3)+(-3)-3)/(x+3)")), null);
});
test("A-6-017: REDUCED still accepts the reference final state", () => {
  const g = goalFor("REDUCED", START);
  assert.ok(g.test(begin("6+6/(x+3)=3/(x+3)+3/(x+3)")));
  assert.equal(g.test(begin(START)), null);
});
