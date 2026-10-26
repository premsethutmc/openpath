// Targeted independent tests: multivariate / parameter / symbolic-exponent expressions and the domain-restriction semantics.
// Expectations come from mathematics or from a naive multiplier written in this file; one-off SymPy cross-checks are reported in the docs.
import test from "node:test";
import assert from "node:assert/strict";
import { assessMultivariateWorking as M, verifyMultivariateStep, isMvProblem, relateMultivariate } from "./index.ts";
import { assessSymbolicWorking as S } from "../symbolic.ts";
import { assessWorking, verifyWorkingStep } from "../working-assessment.ts";
import { Poly, gcd, irreducibleCert, divExact } from "./poly.ts";
import { Rational } from "../../math-kernel.ts";

const out = (p: string, l: string[], o = {}) => M(p, l, o).outcome;
test("polynomial identities, expansion and factorisation in several letters, any valid route", () => {
  assert.equal(out("Expand (x+y)^2", ["x^2+2xy+y^2"]), "verified");
  assert.equal(out("Expand (x+y)^2", ["(x+y)(x+y)", "x(x+y)+y(x+y)", "x^2+xy+xy+y^2", "x^2+2xy+y^2"]), "verified");
  assert.equal(out("Expand (a+b+c)^2", ["a^2+b^2+c^2+2ab+2bc+2ca"]), "verified");
  assert.equal(out("Expand (x+a)(x+b)", ["x^2+(a+b)x+ab"]), "incomplete");           // right, but (a+b)x is not an expanded term: parameters are letters like any other
  assert.equal(out("Expand (x+a)(x+b)", ["x^2+ax+bx+ab"]), "verified");
  assert.equal(out("Factorise x^2-y^2", ["(x-y)(x+y)"]), "verified");
  assert.equal(out("Factorise x^3-y^3", ["(x-y)(x^2+xy+y^2)"]), "verified");
  assert.equal(out("Factorise x^3+y^3", ["(x+y)(x^2-xy+y^2)"]), "verified");
  assert.equal(out("Factorise 2ax+2ay", ["2a(x+y)"]), "verified");
  assert.equal(out("Factorise ax+ay+bx+by", ["a(x+y)+b(x+y)", "(a+b)(x+y)"]), "verified");
  assert.equal(out("Factorise x^4-y^4", ["(x^2-y^2)(x^2+y^2)"]), "incomplete");     // x^2-y^2 still splits
  assert.equal(out("Factorise x^4-y^4", ["(x-y)(x+y)(x^2+y^2)"]), "verified");
  assert.equal(out("Simplify (a+b)^2-(a-b)^2", ["4ab"]), "verified");
});
test("wrong transformations are invalid; the first bad line is found; causes are candidates", () => {
  for (const [p, l, id] of [["Expand (x+y)^2", "x^2+y^2", "power-of-sum"], ["Simplify (a+b)/(a+c)", "b/c", "cancel-common-term-in-sums"], ["Simplify a/b+c/d", "(a+c)/(b+d)", "add-fractions-add-denominators"], ["Simplify x^n*x^m", "x^(n*m)", "multiply-exponents-symbolic"], ["Simplify (x^n)^m", "x^(n+m)", "add-exponents-power-of-power-symbolic"], ["Simplify x^(m+n)", "x^m+x^n", "split-sum-exponent-as-sum"]] as const) {
    const r = M(p, [l]); assert.equal(r.outcome, "invalid", p); assert.ok(r.errors.some((e) => e.id === id), `${p} → ${l}: ${r.errors.map((e) => e.id)}`);
  }
  assert.equal(out("Expand (x+y)^2", ["x^2+2xy+y^2+1"]), "invalid");
  assert.equal(out("Expand (x-y)^2", ["x^2+2xy+y^2"]), "invalid");
  assert.equal(out("Simplify (x^2-y^2)/(x-y)", ["x-y"]), "invalid");
  assert.equal(out("Simplify (x^2-y^2)/(x-y)", ["x+y"]), "verified");
  const r = M("Expand (a+b)(a-b)", ["a^2-b^2", "a^2+b^2", "a^2-b^2"]); assert.equal(r.firstInvalidStep, 2); assert.equal(r.steps[2].status, "valid");
  const eq = M("Expand (x+y)^2", ["x^2+y^2"]); assert.equal(eq.steps[0].relation, "not-identity"); assert.match(eq.steps[0].explanation, /agree only at particular values such as x = 0, y = 0/);
  assert.equal(relateMultivariate("(x+y)^2", "x^2+2xy+y^2").relation, "identity");
  assert.equal(relateMultivariate("x*y", "x+y").relation, "not-identity");     // true only at some points (e.g. x = y = 2): not an identity
});
test("symbolic exponent laws", () => {
  const ok = (p: string, l: string) => assert.equal(out(p, [l], { form: "any" }), "verified", `${p} → ${l}`), bad = (p: string, l: string) => assert.equal(out(p, [l]), "invalid", `${p} → ${l}`);
  ok("Simplify x^n*x^m", "x^(n+m)"); ok("Simplify x^(n+m)", "x^n*x^m"); ok("Simplify (x^n)^m", "x^(n*m)"); ok("Simplify x^(n+1)", "x*x^n"); ok("Simplify (xy)^n", "x^n*y^n");
  ok("Simplify (2x)^n", "2^n*x^n"); ok("Simplify 4^n", "2^(2n)"); ok("Simplify (x+1)^n*(x+1)^m", "(x+1)^(n+m)"); ok("Simplify x^(2n)", "(x^n)^2"); ok("Simplify x^n*x^(-n)", "1");
  ok("Simplify x^(n+1)/x^n", "x"); ok("Simplify (x^(n+1)-x^n)/x^n", "x-1");
  bad("Simplify x^n*x^m", "x^(n*m)"); bad("Simplify (x^n)^m", "x^(n+m)"); bad("Simplify x^n+x^m", "x^(n+m)"); bad("Simplify (x+y)^n", "x^n+y^n"); bad("Simplify (2x)^n", "2x^n"); bad("Simplify x^n/x^m", "x^(n+m)");
  assert.ok(M("Simplify x^n*x^m", ["x^(n+m)"]).assumptions[0].includes("positive bases or integer exponents"));
});
test("rational expressions: multivariate domain restrictions are kept, stated, or reported lost", () => {
  const a = M("Simplify (a^2-b^2)/(a-b)", ["a+b"]); assert.equal(a.outcome, "verified"); assert.deepEqual(a.domain.missing, ["a-b ≠ 0"]); assert.equal(a.steps[0].status, "valid-with-obligation");
  assert.equal(M("Simplify (a^2-b^2)/(a-b)", ["a+b"], { requireDomain: true }).outcome, "incomplete");
  assert.equal(M("Simplify (a^2-b^2)/(a-b)", ["a+b, a ≠ b"], { requireDomain: true }).outcome, "verified");
  assert.equal(M("Simplify (a^2-b^2)/(a-b)", ["a+b", "a - b ≠ 0"], { requireDomain: true }).outcome, "verified");
  assert.equal(M("Simplify (x^2*y)/(x*y^2)", ["x/y"]).domain.missing[0], "x ≠ 0");           // y ≠ 0 is still needed by x/y; only x ≠ 0 is lost
  assert.equal(M("Simplify (x^2*y)/(x*y^2)", ["x/y", "x ≠ 0, y ≠ 0"], { requireDomain: true }).outcome, "verified");   // y ≠ 0 is carried (implied), x ≠ 0 discharges the loss
  assert.equal(M("Simplify (x^2*y)/(x*y^2)", ["x/y, y ≠ 0"], { requireDomain: true }).outcome, "incomplete");   // x ≠ 0 still missing
  assert.equal(out("Simplify 1/(x-y)-1/(x+y)", ["2y/((x-y)(x+y))"]), "verified");
  assert.equal(out("Simplify 1/(x-y)-1/(x+y)", ["2y/(x^2-y^2)"]), "verified");
  assert.equal(out("Simplify 1/(x-y)-1/(x+y)", ["2/(x^2-y^2)"]), "invalid");
  assert.equal(out("Simplify (x^3-y^3)/(x^2-y^2)", ["(x^2+xy+y^2)/(x+y)"]), "verified");
  assert.equal(M("Simplify (x^3-y^3)/(x^2-y^2)", ["(x^2+xy+y^2)/(x+y)"], { form: "lowest-terms" }).final.form, "ok");
  assert.equal(M("Simplify (x^3-y^3)/(x^2-y^2)", ["(x^2+xy+y^2)(x-y)/((x+y)(x-y))"], { form: "lowest-terms" }).outcome, "incomplete");
});
test("domain semantics: implied, carried, newly introduced, conditional (univariate and multivariate)", () => {
  // 1. implied by the original expression: stating it first on a later line is never wrong
  const imp = S("Simplify (x^2-1)/(x-1)", ["x+1, x ≠ 1"]); assert.equal(imp.outcome, "verified"); assert.deepEqual(imp.domain.implied, ["1"]); assert.deepEqual(imp.domain.narrowed, []);
  // 2. carried forward by the student, on its own line
  assert.equal(S("Simplify (x^2-1)/(x-1)", ["x+1", "x ≠ 1"], { requireDomain: true }).outcome, "verified");
  // 3. a restriction the line itself needs is accounted for; one nobody needs is flagged as excluding valid inputs, without calling the algebra wrong
  const nw = S("Simplify (x^2-1)/(x-1)", ["x+1, x ≠ 1, x ≠ 5"]); assert.equal(nw.outcome, "verified"); assert.deepEqual(nw.domain.narrowed, ["5"]); assert.equal(nw.domain.status, "narrowed");
  assert.equal(S("Simplify (x^2-1)/(x-1)", ["x+1, x ≠ 1, x ≠ 5"], { requireDomain: true }).outcome, "incomplete");
  // 4. a conditional transformation: the new line is undefined where the old was defined; stated ⇒ valid with an obligation, unstated ⇒ invalid
  const cond = S("Simplify x+1", ["(x^2-1)/(x-1), x ≠ 1"]); assert.equal(cond.steps[0].status, "valid-with-obligation"); assert.notEqual(cond.outcome, "invalid");
  assert.equal(S("Simplify x+1", ["(x^2-1)/(x-1)"]).outcome, "invalid");
  assert.equal(S("Simplify x+1", ["x ≠ 1", "(x^2-1)/(x-1)"]).steps[1].status, "valid-with-obligation");   // stated first, carried to the next line
  // restoring a restriction the ORIGINAL expression already had is not a new restriction
  assert.notEqual(S("Simplify (x^2-1)/(x-1)", ["x+1", "(x^2-1)/(x-1)"]).outcome, "invalid");
  // multivariate: same four cases
  assert.deepEqual(M("Simplify (a^2-b^2)/(a-b)", ["a+b, a ≠ b"]).domain.implied, ["a ≠ b"]);
  assert.equal(M("Simplify (a^2-b^2)/(a-b)", ["a+b, a ≠ b, a ≠ 3"]).domain.status, "narrowed");
  assert.equal(M("Simplify a+b", ["(a^2-b^2)/(a-b), a ≠ b"]).steps[0].status, "valid-with-obligation");
  assert.equal(M("Simplify a+b", ["(a^2-b^2)/(a-b)"]).outcome, "invalid");
  assert.notEqual(M("Simplify (a^2-b^2)/(a-b)", ["a+b", "(a^2-b^2)/(a-b)"]).outcome, "invalid");
});
test("correctness, skill demonstration, form are separate; refusals are honest; routing and contract", () => {
  const f = M("Factorise x^2-y^2", ["(x-y)(x+y)"], { requiredSkills: ["difference-of-squares", "expand-brackets"] }); assert.equal(f.correct, true); assert.deepEqual(f.skills.missing, ["expand-brackets"]);
  assert.equal(M("Factorise 2x^2+8xy", ["2x(x+4y)"], { requiredSkills: ["common-factor"] }).skills.status, "demonstrated");
  assert.equal(M("Expand (x+y)(x-y)", ["x^2-y^2"], { requiredSkills: ["expand-brackets"] }).skills.status, "demonstrated");
  assert.equal(M("Simplify (a^2-b^2)/(a-b)", ["(a-b)(a+b)/(a-b)", "a+b"], { requiredSkills: ["factorise", "cancel-common-factor"] }).skills.status, "demonstrated");
  assert.equal(M("Factorise x^2-y^2", ["x^2-y^2"]).outcome, "incomplete");
  for (const [p, l] of [["Simplify sin(x)+y", ["sin(x)+y"]], ["Expand (x+y)^2", ["x^2+2xz+y^2"]], ["Simplify x^(1/2)*y", ["x*y"]]] as const) { const r = M(p, [...l]); assert.ok(["unsupported", "ambiguous"].includes(r.outcome), p); assert.equal(r.correct, null); }
  assert.equal(M("Expand (x+y)^2", ["x^2+2xy+y^2 = 0"]).outcome, "invalid");   // a chain claims the equality: it holds only at some points
  assert.equal(M("Simplify a/2b", ["a/(2b)"]).outcome, "ambiguous");
  assert.equal(isMvProblem("Simplify 2x+3x"), false); assert.equal(isMvProblem("Simplify x+y = 3"), false);   // one letter: the one-variable engine; equations: not here
  const w = assessWorking("Simplify (a^2-b^2)/(a-b)", ["a+b"], { requireDomain: true }); assert.ok(w.multivariate); assert.equal(w.advisory, true); assert.equal(w.outcome, "incomplete"); assert.equal(w.correct, null);
  assert.equal(assessWorking("Expand (x+y)^2", ["x^2+y^2"]).correct, false);
  assert.equal(assessWorking("Expand (x+1)^2", ["x^2+2x+1"]).symbolic?.outcome, "verified");          // one letter still goes the old way
  assert.equal(assessWorking("2(x - 3) = 10", ["x - 3 = 5", "x = 8"]).outcome, "verified");
  assert.equal(verifyWorkingStep("Expand (x+y)^2", "(x+y)^2", "x^2+2xy+y^2").outcome, "verified");
  assert.equal(verifyWorkingStep("Simplify (a^2-b^2)/(a-b)", "(a^2-b^2)/(a-b)", "a+b").effect, "implication");
  assert.equal(verifyMultivariateStep("Expand (x+y)^2", "(x+y)^2", "x^2+y^2").correct, false);
});
test("poly kernel: gcd, division, irreducibility certificates (independent hand-computed cases)", () => {
  const x = Poly.v("x"), y = Poly.v("y"), k = (n: number) => Poly.const(new Rational(n));
  assert.equal(gcd(x.pow(2).sub(y.pow(2)), x.sub(y).mul(x.add(k(1)))).toString(), "x-y");
  assert.equal(gcd(x.pow(3).sub(y.pow(3)), x.pow(2).sub(y.pow(2))).toString(), "x-y");
  assert.ok(gcd(x.add(y), x.sub(y)).isConst());
  assert.equal(divExact(x.pow(2).sub(y.pow(2)), x.add(y))!.toString(), "x-y"); assert.equal(divExact(x.pow(2).add(y.pow(2)), x.add(y)), null);
  const cases: [Poly, boolean | null][] = [[x.pow(2).sub(y.pow(2)), false], [x.pow(2).add(y.pow(2)), true], [x.pow(3).sub(y.pow(3)), false], [x.sub(y), true], [x.pow(2).add(x.mul(y)).add(y.pow(2)), true], [x.pow(4).add(y.pow(4).scale(new Rational(4))), false], [x.pow(2).sub(y.pow(2).scale(new Rational(2))), true], [x.pow(2).mul(y).add(x), false]];
  for (const [p, want] of cases) assert.equal(irreducibleCert(p), want, p.toString());
});
// ---- independent oracle: naive multivariate multiplier (sparse maps over BigInt-free small ints), random products, correct and perturbed
let seed = 4242; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
type NP = Map<string, number>;
const npMul = (a: NP, b: NP): NP => { const o: NP = new Map(); for (const [ka, ca] of a) for (const [kb, cb] of b) { const e = ka.split(",").map(Number), f = kb.split(",").map(Number); const k = e.map((v, i) => v + f[i]).join(","); o.set(k, (o.get(k) ?? 0) + ca * cb); } for (const [k, c] of o) if (c === 0) o.delete(k); return o; };
const VARS = ["x", "y", "z"]; const npShow = (p: NP): string => [...p].map(([k, c]) => { const e = k.split(",").map(Number); const m = e.map((d, i) => (d === 0 ? "" : d === 1 ? VARS[i] : `${VARS[i]}^${d}`)).filter(Boolean).join("*"); const a = Math.abs(c); return `${c < 0 ? "-" : "+"}${m ? (a === 1 ? m : `${a}*${m}`) : a}`; }).join("").replace(/^\+/, "") || "0";
const linear = (): NP => { const p: NP = new Map(); for (let i = 0; i < 3; i++) { const c = rnd(5) - 2; if (c) p.set([0, 1, 2].map((j) => (j === i ? 1 : 0)).join(","), c); } const c0 = rnd(5) - 2; if (c0) p.set("0,0,0", c0); if (!p.size) p.set("1,0,0", 1); return p; };
test("randomised: expansions of random 3-letter products — right verifies, perturbed is invalid; latency measured", () => {
  let n = 0, ms = 0, worst = 0, good = 0, caught = 0, trials = 0;
  for (let i = 0; i < 120; i++) {
    const fs = [linear(), linear(), ...(rnd(2) ? [linear()] : [])]; const prod = fs.reduce((a, b) => npMul(a, b)); const wr = (p: NP) => `(${npShow(p)})`;
    const problem = `Expand ${fs.map(wr).join("")}`; const right = npShow(prod); const keys = [...prod.keys()]; const pert = new Map(prod); const kk = keys[rnd(keys.length)]; pert.set(kk, (pert.get(kk) ?? 0) + 1); if (pert.get(kk) === 0) pert.delete(kk);
    if (!isMvProblem(problem)) continue; trials++;
    const t = performance.now(); const a = M(problem, [right]); const b = M(problem, [npShow(pert)]); const d = performance.now() - t; ms += d; worst = Math.max(worst, d); n += 2;
    if (a.steps[0]?.status === "valid" || a.steps[0]?.status === "no-change") good++; if (b.steps[0]?.status === "invalid") caught++;
  }
  assert.equal(good, trials); assert.equal(caught, trials); assert.ok(worst < 400, `worst ${worst}`);
  console.log(`      random 3-letter expansions: ${n} assessments, mean ${(ms / n).toFixed(1)} ms, worst pair ${worst.toFixed(0)} ms`);
});
test("randomised: cancelling a common multivariate factor is a valid step with the obligation; cancelling an added term is invalid", () => {
  let checked = 0;
  for (let i = 0; i < 60; i++) {
    const a = npShow(linear()), b = npShow(linear()), c = npShow(linear()); const p = `Simplify (${a})(${b})/((${a})(${c}))`; if (!isMvProblem(p)) continue;
    const r = M(p, [`(${b})/(${c})`]); assert.notEqual(r.outcome, "invalid", p); checked++;
  }
  assert.ok(checked > 40);
});
