import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalKey, search } from "./planner.ts";
import { begin, fineStrategy, goalFor } from "./compose.ts";
import { Expr, Rational } from "../math-kernel.ts";
import { constraintOf } from "../reasoner/domain/domain-state.ts";

const k = (t: string) => canonicalKey(begin(t));
test("canonical key: order of terms and factors does not matter", () => {
  assert.equal(k("x+2*3+1/(x-1)=0"), k("1/(x-1)+3*2+x=0"));
  assert.equal(k("x*2-3=1"), k("-3+2*x=1"));
  assert.equal(k("3*(x+1)/(x+2)=4"), k("(x+1)*3/(x+2)=4"));
});
test("canonical key keeps what changes meaning or goal-relevant structure apart", () => {
  assert.notEqual(k("x=0"), k("0=x"));                        // sides
  assert.notEqual(k("x+(2+3)=0"), k("x+2+3=0"));             // bracket group (EXPANDED_POLY looks at brackets)
  assert.notEqual(k("1/(x-1)=2"), k("1/(x+1)=2"));
  assert.notEqual(k("x/(x-1)=2"), k("(x-1)/x=2"));           // numerator vs denominator is not commutativity
  assert.notEqual(k("x-3=1"), k("3-x=1"));                    // subtraction is not commutative
});
test("canonical key never merges different domains, constraints or open obligations", () => {
  const s = begin("x+1=2");
  const withRestriction = { ...s, math: { ...s.math, constraints: [...s.math.constraints, constraintOf(new Rational(3n, 1n))] } };
  assert.notEqual(canonicalKey(s), canonicalKey(withRestriction));
  const withObligation = { ...s, obligations: [{ id: "o1", kind: "candidate-check" as const, opened: 1 }] };
  assert.notEqual(canonicalKey(s), canonicalKey(withObligation));
  const closed = { ...s, obligations: [{ id: "o1", kind: "candidate-check" as const, opened: 1, closed: 2 }] };
  assert.equal(canonicalKey(s), canonicalKey(closed));
});
test("canonical dedup keeps the first-reached presentation and never loses a goal reachable with text dedup", () => {
  const start = "3*(x*2-2)/(x-1)+6*(x+3)/((x+3)*(x+3))=3/(x+3)+3/(x+3)";
  const ops = ["combine-terms", "cancel-common-factor", "add-sub-both-sides", "mul-div-const"];
  const g = goalFor("ONE_FRACTION_ZERO", start);
  const a = search(begin(start), g, fineStrategy(ops, 6, 4000, "text"));
  const b = search(begin(start), g, fineStrategy(ops, 6, 4000, "canonical"));
  assert.equal(a.found, b.found); assert.ok(b.nodes.size <= a.nodes.size);
  void Expr;
});
