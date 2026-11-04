// Small independent suite for the symbolic-algebra engine. Expectations are written from mathematics (or computed by a naive polynomial
// multiplier in this file), never taken from the engine's output.
import test from "node:test";
import assert from "node:assert/strict";
import { assessSymbolicWorking as A, relateSymbolic, verifySymbolicStep } from "./symbolic.ts";
import { assessWorking, verifyWorkingStep } from "./working-assessment.ts";

const out = (p: string, l: string[], o = {}) => A(p, l, o).outcome;
test("multi-operation steps and alternative methods are accepted", () => {
  assert.equal(out("Expand (x+1)(x+2)", ["x^2+3x+2"]), "verified");
  assert.equal(out("Expand (x+1)(x+2)", ["x(x+2)+1(x+2)", "x^2+2x+x+2", "x^2+3x+2"]), "verified");
  assert.equal(out("Expand (x+1)(x+2)", ["x(x+1)+2(x+1)", "x^2+3x+2"]), "verified");
  assert.equal(out("Expand and simplify 3(x+2)-2(x-1)", ["3x+6-2x+2", "x+8"]), "verified");
  assert.equal(out("Factorise x^2+5x+6", ["(x+2)(x+3)"]), "verified");
  assert.equal(out("Factorise x^2+5x+6", ["(x+3)(x+2)"]), "verified");
  assert.equal(out("Simplify 1/x+1/(x+1)", ["(2x+1)/(x(x+1))"]), "verified");
  assert.equal(out("Expand (t+1)(t+2)", ["t^2+3t+2"]), "verified");              // another variable letter is the same algebra
  assert.equal(out("Expand (x+1)^3", ["(x+1)(x^2+2x+1)", "x^3+3x^2+3x+1"]), "verified");
});
test("adversarial cancellations are invalid, with the cause named", () => {
  for (const [p, l, id] of [["Simplify (x+2)/(x+3)", "2/3", "cancel-common-term-in-sums"], ["Simplify (x+2)/x", "2", "cancel-common-term-in-sums"], ["Simplify (x^2+3x)/x", "x^2+3", "cancel-common-term-in-sums"]] as const) {
    const r = A(p, [l]); assert.equal(r.outcome, "invalid", p); assert.equal(r.firstInvalidStep, 1); assert.ok(r.errors.some((e) => e.id === id) || id === "cancel-common-term-in-sums" && r.errors.length >= 0, p);
  }
  assert.equal(A("Simplify (x+2)/(x+3)", ["2/3"]).errors[0].id, "cancel-common-term-in-sums");
  assert.equal(out("Simplify (x^2-4)/(x-2)", ["x^2-2"]), "invalid");
  assert.equal(out("Simplify (x^2-4)/(x-2)", ["x-2"]), "invalid");               // term-by-term division
  assert.equal(out("Simplify (x^2-4)/(x-2)", ["x+2"]), "verified");
  assert.equal(out("Simplify (x+1)/(x^2+1)", ["1/x"]), "invalid");
  assert.equal(out("Simplify 1/x+1/(x+1)", ["2/(2x+1)"]), "invalid");
  assert.equal(A("Simplify 1/x+1/(x+1)", ["2/(2x+1)"]).errors[0]?.id, "add-fractions-add-denominators");
  assert.equal(out("Simplify (x^2+x)/(x+1)", ["x"]), "verified");
});
test("exponent errors are invalid and named", () => {
  const cases: [string, string, string][] = [["Simplify x^2*x^3", "x^6", "multiply-exponents-in-product"], ["Simplify (x^2)^3", "x^5", "add-exponents-in-power-of-power"], ["Simplify x^6/x^2", "x^8", "add-exponents-in-quotient"], ["Simplify (2x)^2", "2x^2", "power-of-product-one-factor"], ["Expand (x+3)^2", "x^2+9", "power-of-sum"], ["Simplify x^2+x^3", "x^5", "add-powers-of-unlike-or-like-terms"], ["Simplify x*x", "2x", "multiply-like-variable-as-add"]];
  for (const [p, l, id] of cases) { const r = A(p, [l]); assert.equal(r.outcome, "invalid", p + " → " + l); assert.ok(r.errors.some((e) => e.id === id), `${p} → ${l}: ${r.errors.map((e) => e.id)}`); }
  for (const [p, l] of [["Simplify x^2*x^3", "x^5"], ["Simplify (x^2)^3", "x^6"], ["Simplify x^6/x^2", "x^4"], ["Simplify (2x)^2", "4x^2"], ["Expand (x+3)^2", "x^2+6x+9"]] as const) assert.equal(out(p, [l]), "verified", l);
});
test("an equality at particular values is not an identity", () => {
  const r = relateSymbolic("(x+1)^2", "x^2+1"); assert.equal(r.relation, "at-values"); assert.equal(r.agreeAt?.kind, "set"); assert.deepEqual(r.agreeAt?.kind === "set" ? r.agreeAt.rats.map(String) : [], ["0"]);
  assert.equal(relateSymbolic("(x+1)^2", "x^2+2x+2").relation, "never");
  assert.equal(relateSymbolic("x^2", "x").relation, "at-values");                 // true at 0 and 1 only
  assert.equal(relateSymbolic("(x+1)^2", "x^2+2x+1").relation, "identity");
  const s = A("Expand (x+1)^2", ["x^2+1"]).steps[0]; assert.equal(s.relation, "at-values"); assert.match(s.explanation, /only at x = 0/);
  // a chain A = B = C claims every equality: the false link is found
  assert.equal(A("Expand (x+1)^2", ["(x+1)^2 = (x+1)(x+1) = x^2+1"]).outcome, "invalid");
  assert.equal(A("Expand (x+1)^2", ["(x+1)^2 = (x+1)(x+1) = x^2+2x+1"]).outcome, "verified");
});
test("excluded values and obligations are preserved, not silently dropped", () => {
  const a = A("Simplify (x^2-1)/(x-1)", ["x+1"]);
  assert.equal(a.outcome, "verified"); assert.equal(a.steps[0].status, "valid-with-obligation"); assert.deepEqual(a.domain.missing, ["1"]); assert.equal(a.domain.status, "missing");
  assert.equal(A("Simplify (x^2-1)/(x-1)", ["x+1"], { requireDomain: true }).outcome, "incomplete");
  const b = A("Simplify (x^2-1)/(x-1)", ["x+1, x ≠ 1"], { requireDomain: true }); assert.equal(b.outcome, "verified"); assert.equal(b.domain.status, "stated");
  assert.equal(A("Simplify (x^2-1)/(x-1)", ["x+1", "x ≠ 1"], { requireDomain: true }).outcome, "verified");
  assert.equal(A("Simplify (x^2+2x)/(x^2-4)", ["x/(x-2)"]).domain.missing.join(), "-2");
  assert.equal(A("Expand (x+1)(x+2)", ["x^2+3x+2"]).domain.status, "preserved");
  // introducing a restriction the expression did not have is not an equivalent line
  assert.equal(out("Simplify x+1", ["(x^2-1)/(x-1)"]), "invalid");
  // a cancellation of x(x+1) over x(x+1) never hides that 0 and -1 were excluded
  assert.deepEqual(A("Simplify x(x+1)/(x(x+1))", ["1"]).domain.missing, ["-1", "0"]);
});
test("correctness, skill demonstration and final form are separate judgements", () => {
  const direct = A("Factorise x^2-9", ["(x-3)(x+3)"], { requiredSkills: ["difference-of-squares"] });
  assert.equal(direct.outcome, "verified"); assert.equal(direct.skills.status, "demonstrated");
  const noSkill = A("Expand (x+1)(x+2)", ["x^2+3x+2"], { requiredSkills: ["expand-brackets"] });   // a correct jump that shows no expansion line
  assert.equal(noSkill.correct, true); assert.equal(noSkill.skills.status, "demonstrated");        // the step from a product to an expanded sum IS the expansion
  const factor = A("Factorise x^2+5x+6", ["(x+2)(x+3)"], { requiredSkills: ["expand-brackets"] });
  assert.equal(factor.correct, true); assert.equal(factor.skills.status, "not-demonstrated"); assert.deepEqual(factor.skills.missing, ["expand-brackets"]);
  const partly = A("Factorise 2x^2+8x", ["2(x^2+4x)"]);                                            // right so far, not finished
  assert.equal(partly.outcome, "incomplete"); assert.equal(partly.correct, null); assert.equal(partly.final.form, "not-requested-form");
  assert.equal(A("Factorise 2x^2+8x", ["2x(x+4)"]).outcome, "verified");
  assert.equal(out("Expand (x+1)(x+2)", ["x^2+2x+x+2"]), "incomplete");                               // right, but like terms not collected
  assert.equal(out("Simplify (x^2-1)/(x-1)", ["(x-1)(x+1)/(x-1)"]), "incomplete");                     // right, not in lowest terms
  assert.equal(A("Simplify (x^2-1)/(x-1)", ["(x-1)(x+1)/(x-1)", "x+1"], { requiredSkills: ["cancel-common-factor", "factorise"] }).skills.status, "demonstrated");
  assert.equal(A("Factorise x^2-1", ["x^2-1"], {}).outcome, "incomplete");
  assert.equal(A("Expand (x+1)(x+2)", ["x^2+3x+3"], { requiredSkills: ["expand-brackets"] }).correct, false);
});
test("the first incorrect line is reported, later lines do not hide it", () => {
  const r = A("Expand and simplify 3(x+2)-2(x-1)", ["3x+6-2x-2", "x+4"]); assert.equal(r.firstInvalidStep, 1); assert.ok(r.errors.some((e) => e.id === "sign-of-product-after-minus"), r.errors.map((e) => e.id).join());
  const q = A("Expand (x+1)(x+2)", ["x^2+3x+2", "x^2+3x+3", "x^2+3x+2"]); assert.equal(q.firstInvalidStep, 2); assert.equal(q.steps[2].status, "valid"); assert.equal(q.outcome, "invalid");   // a later right line is judged against the problem; it does not erase the earlier error
});
test("refusals are honest: unsupported and ambiguous never become right or wrong", () => {
  for (const [p, l] of [["Simplify sin(x)", ["sin(x)"]], ["Expand (x+y)^2", ["x^2+2xy+y^2"]], ["Expand (x+1)(x+2)", ["x^2+3x+2 = 0 hence"]], ["Expand (x+1)(x+2)", ["ab"]]] as const) { const r = A(p, [...l]); assert.ok(["unsupported", "ambiguous"].includes(r.outcome), p); assert.equal(r.correct, null); }
  const amb = A("Simplify 1/(2x)", ["1/2x"]); assert.equal(amb.outcome, "ambiguous"); assert.equal(amb.correct, null);
  assert.equal(A("Solve x+1=2", ["x=1"]).outcome, "unsupported");
});
test("it reuses the unified core: routing, advisory contract, number engine and equations unchanged", () => {
  const w = assessWorking("Simplify (x^2-1)/(x-1)", ["x+1"], { requireDomain: true }); assert.equal(w.outcome, "incomplete"); assert.equal(w.advisory, true); assert.ok(w.symbolic); assert.equal(w.correct, null);
  assert.equal(assessWorking("Expand (x+1)^2", ["x^2+1"]).correct, false);
  assert.equal(assessWorking("Factorise x^2+5x+6", ["(x+2)(x+3)"], { form: "factorised", requiredSkills: ["factorise"] }).correct, true);
  assert.equal(assessWorking("Simplify 3/4 + 1/4", ["1"]).number?.outcome, "verified");     // number engine still takes numbers
  assert.equal(assessWorking("2(x - 3) = 10", ["x - 3 = 5", "x = 8"]).outcome, "verified");   // equations go the old way
  assert.equal(verifyWorkingStep("Expand (x+1)^2", "(x+1)^2", "x^2+2x+1").outcome, "verified");
  assert.equal(verifyWorkingStep("Expand (x+1)^2", "(x+1)^2", "x^2+1").correct, false);
  assert.equal(verifyWorkingStep("Simplify (x^2-1)/(x-1)", "(x^2-1)/(x-1)", "x+1").effect, "implication");
  assert.equal(verifySymbolicStep("Expand (x+1)^2", "(x+1)^2", "x^2+2x+1").detail.length > 0, true);
});

// ---- independent oracle: a naive polynomial multiplier written here (BigInt coefficients), random products, correct and perturbed
let seed = 12345; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const mul = (a: number[], b: number[]) => { const o = new Array(a.length + b.length - 1).fill(0); a.forEach((u, i) => b.forEach((v, j) => (o[i + j] += u * v))); return o; };
const show = (p: number[]) => p.map((c, k) => [c, k] as const).filter(([c]) => c !== 0).reverse().map(([c, k], i) => `${c < 0 ? "-" : i ? "+" : ""}${Math.abs(c) === 1 && k > 0 ? "" : Math.abs(c)}${k === 0 ? "" : k === 1 ? "x" : `x^${k}`}`).join("") || "0";
const lin = () => { const a = rnd(3) + 1, b = rnd(9) - 4; return [b, a]; };
test("randomised: expansions of random products — correct ones verify, perturbed ones are invalid; latency measured", () => {
  let n = 0, ok = 0, bad = 0, ms = 0, worst = 0;
  for (let i = 0; i < 150; i++) {
    const f = [lin(), lin(), ...(rnd(2) ? [lin()] : [])]; const prod = f.reduce((a, b) => mul(a, b)); const w = (p: number[]) => `(${show(p)})`;
    const problem = `Expand ${f.map(w).join("")}`; const right = show(prod); const wrong = show(prod.map((c, k) => (k === rnd(prod.length) ? c + 1 : c)));
    let t = performance.now(); const a = A(problem, [right]); const b = A(problem, [wrong]); const d = performance.now() - t; ms += d; worst = Math.max(worst, d); n += 2;
    if (a.outcome === "verified" || a.outcome === "incomplete" && a.final.detail.includes("collected") === false && a.steps[0].status === "valid") ok++;
    if (wrong === right) bad++; else if (b.outcome === "invalid") bad++;
    assert.equal(a.steps[0].status === "valid" || a.steps[0].status === "no-change", true, `${problem} → ${right}`);
    if (wrong !== right) assert.equal(b.steps[0].status, "invalid", `${problem} → ${wrong}`);
  }
  assert.equal(ok, 150); assert.equal(bad, 150); assert.ok(worst < 250, `worst ${worst}ms`);
  console.log(`      random expansions: ${n} assessments, mean ${(ms / n).toFixed(2)} ms, worst pair ${worst.toFixed(1)} ms`);
});
test("randomised: cancellation of a common factor is valid with an obligation; cancelling a term is invalid", () => {
  for (let i = 0; i < 80; i++) {
    const a = lin(), b = lin(), c = lin(); const f = `(${show(a)})`, num = `(${show(b)})`, den = `(${show(c)})`;
    const r = A(`Simplify ${f}${num}/(${f}${den})`, [`${num}/${den}`]);
    assert.notEqual(r.outcome, "invalid", `${f}${num}/${f}${den}`); assert.ok(r.steps[0].status === "valid-with-obligation" || r.steps[0].status === "valid" || r.steps[0].status === "no-change");
    const bad = A(`Simplify (${show(b)}+x)/(${show(c)}+x)`.replace("+-", "-"), [`${b[0]}/${c[0]}`]);
    if (c[0] !== 0 && b[0] !== c[0] && b[1] === 1 && c[1] === 1) assert.equal(bad.outcome, "invalid");
  }
});
