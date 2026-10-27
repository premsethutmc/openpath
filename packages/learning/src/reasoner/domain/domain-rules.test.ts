import { test } from "node:test";
import assert from "node:assert/strict";
import { createDomainRegistry, applyDomainRule, DEFS, effectOf } from "./domain-rules.ts";
import { initialState, eqText, excludedOf } from "./domain-state.ts";
import { printExpr } from "../expr-text.ts";

const reg = createDomainRegistry();
const fresh = (t: string) => initialState(t);

test("every rule is registered with an effect kind", () => {
  assert.ok(reg.listRules().length >= 10);
  for (const id of reg.listRules()) assert.ok(["equivalence", "implication"].includes(effectOf(id)), id);
  assert.equal(effectOf("domain.multiply-both-sides-expanding"), "implication");
});
test("cancel keeps the restriction and is an equivalence", () => {
  const s = applyDomainRule(reg, fresh("(x^2-4)/(x-2)=4"), "domain.cancel-common-factor", { index: 0 });
  assert.equal(eqText(s.math), "x+2=4");
  assert.deepEqual(excludedOf(s.math).map(String), ["2"]);
  assert.ok(s.evidence[0].obligations.every((o) => o.discharged));
});
test("dividing by an expression that may be zero is not applicable", () => {
  assert.throws(() => applyDomainRule(reg, fresh("2*x=6"), "domain.divide-both-sides", { factor: "x" }), /may be zero|not restricted/);
  assert.throws(() => applyDomainRule(reg, fresh("2*x=6"), "domain.divide-both-sides", { factor: "x-3" }), /not restricted/);
});
test("dividing by a restricted factor is applicable", () => {
  const s = applyDomainRule(reg, fresh("(x-2)*(x+1)/(x-2)=3*(x-2)/(x-2)"), "domain.divide-both-sides", { factor: "x-2" });
  assert.ok(s.evidence[0].preconditions.every((c) => c.held));
});
test("multiply-both-sides needs a proven non-zero factor; the expanding variant is an implication", () => {
  assert.throws(() => applyDomainRule(reg, fresh("2*x=6"), "domain.multiply-both-sides", { factor: "x-1" }), /not restricted/);
  const s = applyDomainRule(reg, fresh("2*x=6"), "domain.multiply-both-sides-expanding", { factor: "x-1" });
  assert.equal(s.evidence[0].effect, "implication");
  assert.ok(s.evidence[0].obligations.find((o) => o.id === "solution-set-superset")!.discharged);
});
test("a candidate must pass the original domain and exact substitution", () => {
  let s = fresh("(x^2-4)/(x-2)=4");
  assert.throws(() => applyDomainRule(reg, s, "domain.accept-candidate", { value: "2" }), /restricted/);
  s = fresh("3/x=6");
  const ok = applyDomainRule(reg, s, "domain.accept-candidate", { value: "1/2" });
  assert.equal(ok.math.bindings.get("x")!.toString(), "1/2");
  assert.throws(() => applyDomainRule(reg, s, "domain.accept-candidate", { value: "3" }), /equal, defined sides/);
});
test("clear denominators yields a polynomial equation and keeps restrictions", () => {
  const s = applyDomainRule(reg, fresh("1/(x-1)+1/(x+1)=2*x/(x^2-1)"), "domain.clear-denominators", {});
  assert.deepEqual(excludedOf(s.math).map(String), ["-1", "1"]);
  assert.ok(!/\/\(/.test(eqText(s.math)));
});
