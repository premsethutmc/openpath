// E7 Phase 4 execution traces: one proof context across routes. Usage: ENGINE_ROOT=/home/claude/e7p3 bun traces.ts > traces-p3.json ; bun traces.ts > traces-e7.json
const root = process.env.ENGINE_ROOT ?? new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const { assessMathematicalWorking } = await import(root + "/packages/learning/src/unified-math-engine.ts");
const K = (v: string) => ({ kind: "constant", value: v }), X = { kind: "variable", name: "x" };
const add = (...t: unknown[]) => ({ kind: "add", terms: t }), mul = (...f: unknown[]) => ({ kind: "multiply", factors: f }), pw = (b: unknown, e: number) => ({ kind: "power", base: b, exponent: e }), ln = (a: unknown) => ({ kind: "log", argument: a });
const INV = mul(K("1"), pw(X, -1));
const I = (extra: object) => ({ domain: "calculus", task: "indefinite-integral", variable: "x", integrand: INV, ...extra });
const LN1 = { domain: "calculus", task: "derivative", variable: "x", expression: ln(add(X, K("-1"))) };
const FIN = { domain: "probability-statistics", area: "probability", task: "finite", data: { favourable: 6, total: 45 }, assumptions: ["equiprobable"] };
const VP = { area: "polynomial", coefficientDomain: "real", assumptions: ["real-coefficients"], data: { coefficients: ["2", "-6", "5"] }, domain: "complex-polynomial", task: "vieta-product" };
const S: [string, string, any, string][] = [
  ["contradiction", "student x>0 against task restriction x<0", I({ restrictions: ["x<0"] }), "Assume x > 0.\n∫ 1/x dx = ln(x) + C"],
  ["contradiction", "student x<1 against the implied domain of ln(x-1)", LN1, "Assume x < 1.\nd/dx[ln(x - 1)] = 1/(x - 1)"],
  ["disjoint-domain", "student x>0 against task alternatives x<0 | x>0", I({ domainComponents: ["x<0", "x>0"] }), "Assume x > 0.\n∫ 1/x dx = ln(x) + C"],
  ["disjoint-domain", "no student assumption, both alternatives kept", I({ domainComponents: ["x<0", "x>0"] }), "∫ 1/x dx = ln|x| + C"],
  ["implied", "student restates the implied restriction x>1", LN1, "Since the argument must be positive, x > 1.\nd/dx[ln(x - 1)] = 1/(x - 1)"],
  ["new-quantity", "student introduces k>0 unrelated to x", I({}), "Assume k > 0.\n∫ 1/x dx = ln|x| + C"],
  ["scoping", "task with no stated domain, student scopes to x>0", I({}), "Assume x > 0.\n∫ 1/x dx = ln(x) + C"],
  ["missing-scenario", "scenario quantities exist only in the working", FIN, "P(two white), 4 white, 6 black, no replacement\n4/10·3/9 = 12/90 = 2/15"],
  ["missing-scenario", "only the expected value is given", FIN, "2/15"],
  ["unreadable-restriction", "typed restriction no route can read", I({ restrictions: ["x is a prime"] }), "∫ 1/x dx = ln|x| + C"],
  ["alternative", "Vieta by c/a under a stated real-coefficient assumption", VP, "The coefficients are real.\nproduct of roots = c/a = 5/2"],
  ["alternative", "Vieta by roots", VP, "z = (3+i)/2\nw = (3-i)/2\nz*w = 10/4 = 5/2"],
  ["false-accept-guard", "Vieta unrelated arithmetic under the same assumption", VP, "The coefficients are real.\n10/4 = 5/2"],
];
const out: any[] = [];
for (const [kind, name, problem, text] of S) {
  const a: any = await assessMathematicalWorking(problem, { format: "natural", text });
  const c = a.domainPayload?.proofContext;
  out.push({ kind, name, classification: a.classification, why: String(a.justification ?? "").slice(0, 150),
    context: c ? { sameDigestInAllRoutes: c.routesShareContext, routes: c.routes.map((r: any) => ({ route: r.route, consumed: r.consumed, limitation: r.limitation })), student: c.studentAssumptions.map((s: any) => ({ text: s.text, relation: s.relation })), unresolved: c.unresolvedPremises.map((u: any) => u.text.slice(0, 70)), implied: c.task.impliedRestrictions, unreadable: c.task.unreadable } : null });
}
console.log(JSON.stringify(out, null, 1));
