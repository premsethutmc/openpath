// Probes of the routes that can STILL produce an unjustified `verified` after Phase 2 (each line states what the probe shows).
import { readFileSync } from "node:fs";
const root = process.env.ENGINE_ROOT ?? new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const { assessMathematicalWorking } = await import(root + "/packages/learning/src/unified-math-engine.ts");
const H2 = JSON.parse(readFileSync(new URL("../../generalization-e6r/holdout2/holdout-cases.v1.json", import.meta.url), "utf8")).cases;
const VIETA = H2.find((c: any) => c.caseId === "s6-238").problem;
const LIMIT = { domain: "calculus", task: "limit", expression: { kind: "multiply", factors: [{ kind: "add", terms: [{ kind: "power", base: { kind: "variable", name: "x" }, exponent: 2 }, { kind: "constant", value: "-4" }] }, { kind: "power", base: { kind: "add", terms: [{ kind: "variable", name: "x" }, { kind: "constant", value: "-2" }] }, exponent: -1 }] }, variable: "x", approach: "2", side: "both" };
const P: [string, string, any, string][] = [
  ["RR1 unbound numeric chain ending at the truth (no use of task data)", "10/4 = 5/2", VIETA, "verified expected = REMAINING"],
  ["RR1 coincidental chain", "(2+3)/2 = 5/2", VIETA, "verified expected = REMAINING"],
  ["RR2 vague non-mathematical-looking claim not in the predicate vocabulary", "The curve is steeper near the origin.\nlim_(x->2) (x^2-4)/(x-2) = lim_(x->2) (x+2) = 4", LIMIT, "verified expected = REMAINING (recall limit of the ledger)"],
  ["RR3 recognised predicate (control: blocked)", "The curve is increasing near the origin.\nlim_(x->2) (x^2-4)/(x-2) = lim_(x->2) (x+2) = 4", LIMIT, "not verified expected"],
];
for (const id of ["s6-034", "s6-048", "s6-314"]) { const c = H2.find((x: any) => x.caseId === id); P.push([`RR4 route precedence (${id}; ref=${c.reference.classification})`, c.studentWorking.text, c.problem, "see ref"]); }
for (const [name, text, prob, exp] of P) { const r: any = await assessMathematicalWorking(prob, { format: "natural", text }); console.log(JSON.stringify({ probe: name, verdict: r.classification, expectation: exp })); }
