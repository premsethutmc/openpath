// E7 Phase 5 execution traces: proof obligations. Usage: ENGINE_ROOT=<worktree at b487d50> bun traces.ts > traces-p4.json ; bun traces.ts > traces-e7.json
const root = process.env.ENGINE_ROOT ?? new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const { assessMathematicalWorking } = await import(root + "/packages/learning/src/unified-math-engine.ts");
const K = (v: string) => ({ kind: "constant", value: v }), X = { kind: "variable", name: "x" };
const INV = { kind: "multiply", factors: [K("1"), { kind: "power", base: X, exponent: -1 }] };
const I = (extra: object) => ({ domain: "calculus", task: "indefinite-integral", variable: "x", integrand: INV, ...extra });
const QU = { domain: "complex-polynomial", area: "polynomial", task: "quadratic-roots", coefficientDomain: "complex", data: { coefficients: ["1", "4", "13"] } };
const VP = { area: "polynomial", coefficientDomain: "complex", data: { coefficients: ["2", "-6", "5"] }, domain: "complex-polynomial", task: "vieta-product" };
const VS = { ...VP, data: { coefficients: ["1", "-6", "25"] }, task: "vieta-sum" };
const MEAN = { domain: "probability-statistics", area: "statistics", task: "mean", data: { values: ["4", "8", "3"] }, assumptions: [] };
const BM = { domain: "probability-statistics", area: "probability", task: "binomial-mean", data: { n: 12, p: "1/4" }, assumptions: [] };
const FIN = { domain: "probability-statistics", area: "probability", task: "finite", data: { favourable: 6, total: 45 }, assumptions: ["equiprobable"] };
const AL = { domain: "algebra", statement: "2x + 3 = 7" }, AL2 = { domain: "algebra", statement: "x^2 - 5x + 6 = 0" };
const S: [string, string, any, string][] = [
  ["unjustified-step", "Vieta product: product of roots = 10/4 = 5/2", VP, "product of roots = 10/4 = 5/2"],
  ["unjustified-step", "mean: mean = 20/4 = 5", MEAN, "mean = 20/4 = 5"],
  ["unjustified-step", "mean: mean = (9+9+7)/5 = 5", MEAN, "mean = (9+9+7)/5 = 5"],
  ["unjustified-step", "binomial mean from unrelated numbers", BM, "E[X] = 6*(1/2) = 3"],
  ["unjustified-step", "Vieta sum through roots that are not the task's", VS, "z = 1 + 2i\nw = 5 - 2i\nz + w = 6"],
  ["unjustified-step", "algebra: right final value after a wrong step", AL, "2x = 5\nx = 2"],
  ["irrelevant", "Vieta product: 10/4 = 5/2", VP, "10/4 = 5/2"],
  ["irrelevant", "mean: 20/4 = 5", MEAN, "20/4 = 5"],
  ["alternative", "Vieta product: c/a", VP, "c/a = 5/2"],
  ["alternative", "Vieta product: through the roots", VP, "z = (3+i)/2\nw = (3-i)/2\nz*w = 10/4 = 5/2"],
  ["alternative", "Vieta sum: through the roots", VS, "z = 3 + 4i\nw = 3 - 4i\nz + w = 6"],
  ["alternative", "mean: via a sum", MEAN, "sum = 4+8+3 = 15\nmean = 15/3 = 5"],
  ["alternative", "binomial mean: complement form", BM, "E[X] = 12(1 - 3/4) = 3"],
  ["alternative", "quadratic roots with the discriminant", QU, "D = 4^2 - 4*1*13 = -36\nx = (-4 + 6i)/2 = -2 + 3i\nx = (-4 - 6i)/2 = -2 - 3i"],
  ["alternative", "algebra: concise answer", AL, "x = 2"],
  ["alternative", "algebra: factor then solve", AL2, "(x-2)(x-3) = 0\nx = 2 or x = 3"],
  ["conditional", "derivation under a disclosed assumption", I({}), "Assume x > 0.\n∫ 1/x dx = ln(x) + C"],
  ["conditional", "the same, claimed for the whole domain", I({}), "Assume x > 0.\n∫ 1/x dx = ln(x) + C\nHence this holds for all real x."],
  ["conditional", "narrowing one of two task branches", I({ domainComponents: ["x<0", "x>0"] }), "Assume x > 0.\n∫ 1/x dx = ln(x) + C"],
  ["missing-premise", "undefined symbol", VP, "product of roots = d/e = 5/2"],
  ["missing-premise", "scenario quantities only in the working", FIN, "P(two white), 4 white, 6 black, no replacement\n4/10·3/9 = 12/90 = 2/15"],
];
const out: any[] = [];
for (const [kind, name, problem, text] of S) {
  const a: any = await assessMathematicalWorking(problem, { format: "natural", text });
  const ob = a.domainPayload?.proofObligations;
  out.push({ kind, name, classification: a.classification, obligations: ob ? ob.obligations.map((o: any) => `${o.kind}@${o.line ?? "-"}:${o.status}${o.conditionalOn.length ? "(cond)" : ""}`) : null });
}
console.log(JSON.stringify(out, null, 1));
