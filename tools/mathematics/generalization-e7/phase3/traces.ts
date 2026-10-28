// E7 Phase 3 execution traces: semantic grounding. Same scenarios against a baseline engine (ENGINE_ROOT, default = this tree) and compare.
// Usage: ENGINE_ROOT=/home/claude/e6r bun traces.ts > traces-e6r.json ; bun traces.ts > traces-e7.json
const root = process.env.ENGINE_ROOT ?? new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const { assessMathematicalWorking } = await import(root + "/packages/learning/src/unified-math-engine.ts");
const VP = { area: "polynomial", coefficientDomain: "complex", data: { coefficients: ["2", "-6", "5"] }, domain: "complex-polynomial", task: "vieta-product" };
const VS = { ...VP, task: "vieta-sum" };
const MEAN = { domain: "probability-statistics", area: "statistics", task: "mean", data: { values: ["4", "8", "3"] }, assumptions: [] };
const FIN = { domain: "probability-statistics", area: "probability", task: "finite", data: { favourable: 3, total: 8 }, assumptions: ["equiprobable"] };
const S: [string, string, any, string[]][] = [
  // correct but irrelevant arithmetic: must never be verified
  ["irrelevant", "Vieta product: 10/4 = 5/2", VP, ["10/4 = 5/2"]],
  ["irrelevant", "Vieta product: (2+3)/2 = 5/2", VP, ["(2+3)/2 = 5/2"]],
  ["irrelevant", "Vieta product: 7/14 + 2 = 5/2", VP, ["7/14 + 2 = 5/2"]],
  ["irrelevant", "Vieta product: student-chosen numbers in prose", VP, ["Let the numbers be 10 and 4", "10/4 = 5/2"]],
  ["irrelevant", "mean: 20/4 = 5", MEAN, ["20/4 = 5"]],
  ["irrelevant", "mean: (9+9+7)/5 = 5", MEAN, ["(9+9+7)/5 = 5"]],
  ["irrelevant", "finite probability: 6/16 = 3/8", FIN, ["6/16 = 3/8"]],
  // wrong quantity, right number
  ["wrong-quantity", "Vieta product: sum of roots = 5/2", VP, ["sum of roots = 5/2"]],
  ["wrong-quantity", "Vieta sum: product of roots = 3", VS, ["product of roots = 3"]],
  // valid, different methods
  ["alternative", "Vieta product: formula", VP, ["product of roots = c/a = 5/2"]],
  ["alternative", "Vieta product: c/a", VP, ["c/a = 5/2"]],
  ["alternative", "Vieta product: answer only", VP, ["product of roots = 5/2"]],
  ["alternative", "Vieta product: roots defined, then multiplied", VP, ["z = (3+i)/2", "w = (3-i)/2", "z*w = 10/4 = 5/2"]],
  ["alternative", "Vieta product: quadratic formula, then multiplied", VP, ["x = (6 + sqrt(36-40))/4 = (3+i)/2", "y = (6 - sqrt(36-40))/4 = (3-i)/2", "product of roots = x*y = 10/4 = 5/2"]],
  ["alternative", "Vieta product: roots multiplied in one line", VP, ["(3+i)/2 * (3-i)/2 = 10/4 = 5/2"]],
  ["alternative", "mean: from the data", MEAN, ["mean = (4+8+3)/3 = 5"]],
  ["alternative", "mean: via an intermediate sum", MEAN, ["sum = 4+8+3 = 15", "mean = 15/3 = 5"]],
  ["alternative", "finite probability: by a complement", FIN, ["P = 1 - 5/8 = 3/8"]],
];
const out: any[] = [];
for (const [kind, name, problem, lines] of S) {
  const a: any = await assessMathematicalWorking(problem, { format: "natural", text: lines.join("\n") });
  const claims = a.domainPayload?.claimLedger?.claims ?? [];
  out.push({ kind, name, lines, classification: a.classification, justification: String(a.justification ?? "").slice(0, 160), provenance: claims.map((c: any) => c.provenance ?? null) });
}
console.log(JSON.stringify(out, null, 1));
