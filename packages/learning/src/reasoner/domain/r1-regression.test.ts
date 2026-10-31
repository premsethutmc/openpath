// R1 regression tests: one group per reproduced defect. The expected values were derived independently of the code (by hand / by the independent suite's Fraction reference).
import { test } from "node:test";
import assert from "node:assert/strict";
import { solve } from "./domain-engine.ts";
import { checkStepText } from "./domain-checker.ts";
import * as V from "../verifier/verifier.ts";
import { Poly } from "./poly.ts";
import { Rational } from "../../math-kernel.ts";

test("D1: negative exponents carry their restriction, also when algebra later cancels the denominator", () => {
  const a = solve("x^-1=2"); assert.equal(a.class, "unique"); assert.deepEqual(a.solution, ["1/2"]); assert.deepEqual(a.restrictions, ["0"]);
  const b = solve("1/(x-1)-1/(x-1)=x^-1*x-1"); assert.equal(b.class, "identity-on-domain"); assert.deepEqual(b.restrictions, ["0", "1"]);
  const c = solve("(x+1)^-2=(x+1)^-2*(x-1)^0"); assert.equal(c.class, "identity-on-domain"); assert.deepEqual(c.restrictions, ["-1", "1"]);
  const n = solve("1/(1/x)=3");   // nested denominator: answering correctly or refusing with a code are both acceptable; a wrong answer is not
  if (n.class === "refused") assert.ok(n.outcome); else { assert.deepEqual(n.solution, ["3"]); assert.deepEqual(n.restrictions, ["0"]); }
  assert.equal(V.solutionOf("1/(1/x)=3").required.map(String).join(), "0");
});
test("D1: expressions undefined everywhere or outside the grammar are refused with codes", () => {
  assert.equal(solve("x/0=1").outcome, "DOMAIN_UNRESOLVED");
  assert.equal(solve("1/(x-x)=1").outcome, "DOMAIN_UNRESOLVED");
  assert.equal(solve("x^(1/2)/(x-1)=1").outcome, "UNSUPPORTED_OPERATOR");
  assert.equal(solve("x^(x/x)=x").outcome, "UNSUPPORTED_OPERATOR");
  assert.equal(solve("1/(x^2+1)=1").outcome, "DOMAIN_UNRESOLVED");
});
test("D2: a step from an invalid starting state is rejected, and a missing original restriction is detected", () => {
  assert.equal(checkStepText({ eq: "(x^2-1)/(x-1)=2", excluded: [] }, { eq: "x+1=2", excluded: [] }).valid, false);
  assert.equal(checkStepText({ eq: "x^-1*x=1", excluded: [] }, { eq: "1=1", excluded: [] }).valid, false);
  assert.equal(checkStepText({ eq: "x^-1*x=1", excluded: ["0"] }, { eq: "1=1", excluded: ["0"] }).valid, true);
  assert.deepEqual(checkStepText({ eq: "1/x=2", excluded: ["0"] }, { eq: "1=2*x", excluded: [] }).reasons.includes("restriction-dropped"), true);
});
test("D2: a trace is invalid if its first state is not the original or lacks the original restrictions", () => {
  const ok = V.checkTrace("1/(x-1)=2", [{ eq: "1/(x-1)=2", excluded: ["1"] }, { eq: "1=2*(x-1)", excluded: ["1"] }, { eq: "1=2*x-2", excluded: ["1"] }, { eq: "x=3/2", excluded: ["1"] }], ["equivalence", "equivalence", "equivalence"], { kind: "solution", value: "3/2" });
  assert.equal(ok.valid, true);
  const bad1 = V.checkTrace("1/(x-1)=2", [{ eq: "1/(x-1)=2", excluded: [] }, { eq: "1=2*(x-1)", excluded: [] }], ["equivalence"], { kind: "solution", value: "3/2" });
  assert.equal(bad1.valid, false); assert.ok(bad1.problems.some((p) => p.includes("initial restrictions")));
  const bad2 = V.checkTrace("1/(x-1)=2", [{ eq: "1/(x-1)=3", excluded: ["1"] }, { eq: "x=4/3", excluded: ["1"] }], ["equivalence"], { kind: "solution", value: "4/3" });
  assert.equal(bad2.valid, false);
});
test("D3: malformed and unsupported input gives a structured refusal, never an exception", () => {
  const cases: [string, string][] = [["2x/(x-1)=1", "PARSE_ERROR"], ["2(x-1)/(x-1)=2", "PARSE_ERROR"], ["x/(x-1)=.5", "PARSE_ERROR"], ["1/(x-1)=1e0", "PARSE_ERROR"],
    ["+1/(x-1)=2", "PARSE_ERROR"], ["1/(x-1)=y", "PARSE_ERROR"], ["1/(x-1)=2=3", "PARSE_ERROR"], ["1 0/(x-1)=10/(x-1)", "PARSE_ERROR"], ["1/(x-1)=", "PARSE_ERROR"],
    ["sqrt(x)/(x-1)=1", "UNSUPPORTED_OPERATOR"], ["x!/(x-1)=1", "UNSUPPORTED_OPERATOR"], ["|x|/(x-1)=1", "UNSUPPORTED_OPERATOR"], ["1/(x-1)=(1+(2", "PARSE_ERROR"]];
  for (const [t, code] of cases) { const r = solve(t); assert.equal(r.class, "refused", t); assert.equal(r.outcome, code, t); assert.equal(r.solution, null, t); }
  assert.equal(solve("1/(x-1)=" + "(".repeat(5000) + "1").outcome, "PARSE_ERROR");
  assert.equal(solve("1/(x-1)=2+  3").class, "unique");                        // spaces between tokens are still fine
});
test("D4/exactness: decimal literals are exact rationals in the engine and the verifier", () => {
  const r = solve("0.001/(x-1)=0.002/(x+1)"); assert.deepEqual(r.solution, ["3"]); assert.deepEqual(r.restrictions, ["-1", "1"]);
  assert.deepEqual(solve("1/(0.25*x)=8").solution, ["1/2"]);
});
test("independence: a defect shared by the engine's polynomial code and the old check is caught by the independent verifier", () => {
  const orig = Poly.prototype.mul;
  try {
    (Poly.prototype as any).mul = function (this: Poly, o: Poly) { const r = orig.call(this, o); return r.degree >= 2 ? new Poly(r.c.map((v, i) => (i === 1 ? v.add(Rational.one) : v))) : r; };
    const r = solve("1/(x-1)+1/(x+1)=2*x/(x^2-1)");
    assert.ok(r.class === "refused" && r.outcome === "PROOF_FAILED", `expected PROOF_FAILED, got ${r.class} ${r.outcome}`);
  } finally { (Poly.prototype as any).mul = orig; }
  assert.equal(solve("1/(x-1)+1/(x+1)=2*x/(x^2-1)").class, "identity-on-domain");   // and the unpatched engine is fine again
});
test("S3: complex roots do not count as real roots in the verifier", () => {
  assert.equal(V.checkStep({ eq: "x^2+1=0", excluded: [] }, { eq: "x^2+4=0", excluded: [] }).valid, true);
  assert.equal(V.checkStep({ eq: "x^2+1=0", excluded: [] }, { eq: "x-1=0", excluded: [] }).valid, false);
  assert.equal(V.checkClaim("(x-1)*(x^2+1)=0", ["1"]).valid, true);
});
