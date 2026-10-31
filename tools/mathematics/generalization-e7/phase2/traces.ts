// E7 Phase 2 execution traces: the same scenarios against a baseline engine (ENGINE_ROOT, default E6-R 0f22913) and the current engine.
// Usage: ENGINE_ROOT=/path/to/baseline bun traces.ts <label> > out.json
import { readFileSync } from "node:fs";
const root = process.env.ENGINE_ROOT ?? new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const { assessMathematicalWorking } = await import(root + "/packages/learning/src/unified-math-engine.ts");
const H2 = JSON.parse(readFileSync(new URL("../../generalization-e6r/holdout2/holdout-cases.v1.json", import.meta.url), "utf8")).cases;
const id = (x: string) => H2.find((c: any) => c.caseId === x);
const LIMIT = { domain: "calculus", task: "limit", expression: { kind: "multiply", factors: [{ kind: "add", terms: [{ kind: "power", base: { kind: "variable", name: "x" }, exponent: 2 }, { kind: "constant", value: "-4" }] }, { kind: "power", base: { kind: "add", terms: [{ kind: "variable", name: "x" }, { kind: "constant", value: "-2" }] }, exponent: -1 }] }, variable: "x", approach: "2", side: "both" };
const VIETA = id("s6-238").problem;
const LN = { domain: "calculus", task: "derivative", expression: { kind: "log", argument: { kind: "power", base: { kind: "variable", name: "x" }, exponent: 2 } }, restrictions: ["x<0"], variable: "x" };
const S: { bypass: string; name: string; problem: any; text: string; mustNotVerify: boolean }[] = [
  { bypass: "1 prose is proof", name: "s6-217 forged identity", problem: id("s6-217").problem, text: id("s6-217").studentWorking.text, mustNotVerify: true },
  { bypass: "1 prose is proof", name: "s6-226 forged symmetry", problem: id("s6-226").problem, text: id("s6-226").studentWorking.text, mustNotVerify: true },
  { bypass: "1 prose is proof", name: "s6-238 forged Vieta formula", problem: id("s6-238").problem, text: id("s6-238").studentWorking.text, mustNotVerify: true },
  { bypass: "1 prose is proof", name: "false limit sentence", problem: LIMIT, text: "The limit of x^2 as x->2 equals 9.\nlim_(x->2) (x^2-4)/(x-2) = 4", mustNotVerify: true },
  { bypass: "1 prose is proof", name: "false arithmetic in prose", problem: LIMIT, text: "Recall that 1+1=3 and so the limit is hard.\nlim_(x->2) (x^2-4)/(x-2) = 4", mustNotVerify: true },
  { bypass: "1 prose is proof", name: "derivative sentence, wrong", problem: { domain: "calculus", task: "derivative", expression: { kind: "power", base: { kind: "variable", name: "x" }, exponent: 2 }, variable: "x" }, text: "The derivative of x^2 is 3x.\nf'(x) = 2x", mustNotVerify: true },
  { bypass: "2 label-agnostic answer", name: "sum of roots = 5/2 (product task)", problem: VIETA, text: "sum of roots = 5/2", mustNotVerify: true },
  { bypass: "2 label-agnostic answer", name: "banana = 5/2", problem: VIETA, text: "banana = 5/2", mustNotVerify: true },
  { bypass: "3 back-solved event", name: "s6-182", problem: id("s6-182").problem, text: id("s6-182").studentWorking.text, mustNotVerify: true },
  { bypass: "3 back-solved event", name: "unfamiliar: tails", problem: id("s6-182").problem, text: "P(at least one tail) = 1 - P(no tail) = 7/8", mustNotVerify: true },
  { bypass: "4 student assumption vs task", name: "Assume x>0 under x<0", problem: LN, text: "Assume x>0.\nln(x^2) = 2ln(x)\nf'(x) = 2/x", mustNotVerify: true },
  { bypass: "6 shared blind spot", name: "s6-299 disjoint domain components", problem: id("s6-299").problem, text: id("s6-299").studentWorking.text, mustNotVerify: true },
  { bypass: "control", name: "valid: direct", problem: LIMIT, text: "lim_(x->2) (x^2-4)/(x-2) = lim_(x->2) (x+2) = 4", mustNotVerify: false },
  { bypass: "control", name: "valid: prose + true identity", problem: LIMIT, text: "Factor first: x^2-4 = (x-2)(x+2).\nlim_(x->2) (x^2-4)/(x-2) = lim_(x->2) (x+2) = 4", mustNotVerify: false },
  { bypass: "control", name: "valid: compatible student assumption", problem: LN, text: "Assume x<-1.\nln(x^2) = 2ln(-x)\nf'(x) = 2/x", mustNotVerify: false },
  { bypass: "control", name: "valid: Vieta labelled", problem: VIETA, text: "product of roots = 5/2", mustNotVerify: false },
];
const out: any[] = [];
for (const s of S) {
  const r: any = await assessMathematicalWorking(s.problem, { format: "natural", text: s.text });
  const led = r.domainPayload?.claimLedger?.claims ?? null;
  out.push({ bypass: s.bypass, name: s.name, verdict: r.classification, ok: s.mustNotVerify ? r.classification !== "verified" : r.classification === "verified", why: String(r.justification).slice(0, 140), ledger: led ? led.map((c: any) => `${c.kind}[${c.text}]=${c.outcome}`) : null });
}
console.log(JSON.stringify({ engine: root, rows: out }, null, 1));
