import { test } from "node:test";
import assert from "node:assert/strict";
import { library } from "./rules.ts";
import { startState } from "./state.ts";
import { applyMove, RuleFailure, movesFor } from "./planner.ts";
import { STRATEGIES } from "./solve.ts";
import { excludedOf } from "../reasoner/domain/domain-state.ts";
import { eqText } from "./verify.ts";

const mv = (id: string, params = {}) => ({ rule: library.get(id), params, name: id });
const go = (t: string, id: string, params = {}) => applyMove(startState(t), mv(id, params));

test("every rule declares an effect, operations and a pattern matcher", () => {
  assert.ok(library.all().length >= 14);
  for (const r of library.all()) { assert.ok(["equivalence", "implication"].includes(r.effect), r.id); assert.ok(r.opsOf({}).length > 0 || r.id.includes("divide"), r.id); assert.equal(typeof r.match, "function"); }
  assert.equal(library.get("core.multiply-both-sides-expanding").effect, "implication");
  assert.equal(library.get("core.multiply-both-sides-expanding").introduces, "candidate-check");
});
test("cancel keeps the restriction and is an equivalence", () => {
  const s = go("(x^2-4)/(x-2)=4", "core.cancel-common-factor", { index: 0 });
  assert.equal(eqText(s.math), "x+2=4");
  assert.deepEqual(excludedOf(s.math).map(String), ["2"]);
  assert.ok(s.evidence[0].obligations.every((o) => o.discharged));
});
test("dividing by an expression that may be zero is not applicable", () => {
  assert.throws(() => go("2*x=6", "core.divide-both-sides", { factor: "x" }), (e: unknown) => e instanceof RuleFailure && /not restricted|may be zero/.test(e.message));
  assert.throws(() => go("2*x=6", "core.divide-both-sides", { factor: "x-3" }), /not restricted/);
});
test("dividing by a restricted factor is applicable; by a non-zero constant too", () => {
  const s = go("(x-2)*(x+1)/(x-2)=3*(x-2)/(x-2)", "core.divide-both-sides", { factor: "x-2" });
  assert.ok(s.evidence[0].preconditions.every((c) => c.held));
  assert.equal(eqText(go("2*x=6", "core.divide-both-sides", { factor: "2" }).math), "2*x/2=6/2");
});
test("multiply-both-sides needs a proven non-zero factor; the expanding variant is an implication that opens an obligation", () => {
  assert.throws(() => go("2*x=6", "core.multiply-both-sides", { factor: "x-1" }), /not restricted/);
  const s = go("2*x=6", "core.multiply-both-sides-expanding", { factor: "x-1" });
  assert.equal(s.evidence[0].effect, "implication");
  assert.ok(s.evidence[0].obligations.find((o) => o.id === "solution-set-superset")!.discharged);
  assert.equal(s.obligations.filter((o) => o.closed === undefined).length, 1);
});
test("a candidate must pass the original domain and exact substitution; accepting closes the obligations", () => {
  assert.throws(() => go("(x^2-4)/(x-2)=4", "core.accept-candidate", { value: "2" }), /restricted/);
  const ok = go("3/x=6", "core.accept-candidate", { value: "1/2" });
  assert.equal(ok.math.bindings.get("x")!.toString(), "1/2"); assert.equal(ok.candidates[0].status, "accepted");
  assert.throws(() => go("3/x=6", "core.accept-candidate", { value: "3" }), /equal, defined sides/);
});
test("clear denominators yields a polynomial equation and keeps restrictions", () => {
  const s = go("1/(x-1)+1/(x+1)=2*x/(x^2-1)", "core.clear-denominators");
  assert.deepEqual(excludedOf(s.math).map(String), ["-1", "1"]);
  assert.ok(!/\/\(/.test(eqText(s.math)));
});
test("discovery is pattern-driven and strategy-filtered: the same state offers different moves to different strategies", () => {
  const s = startState("3*(x+2)=21");
  const s2 = startState("3*(x+2)+1=21");
  const names = (st: keyof typeof STRATEGIES) => movesFor(s, STRATEGIES[st]).map((m) => m.name);
  assert.deepEqual(names("linear"), ["expand"]);                         // confluent pruning: bracket removal first
  const r = movesFor(s2, { ...STRATEGIES.linear, prune: false, allowed: new Set(["expand", "add-sub-both-sides"]) }).map((m) => m.rule.id);
  assert.ok(r.includes("core.expand-brackets") && r.includes("core.add-sub-both-sides") && !r.includes("core.swap-sides"));
});
test("an operation outside the allowed set is never offered", () => {
  const moves = library.discover(startState("(x^2-4)/(x-2)=4").math, new Set(["cancel-common-factor"]));
  assert.ok(moves.length > 0 && moves.every((m) => m.rule.id === "core.cancel-common-factor"));
});
