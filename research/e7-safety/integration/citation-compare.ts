// Old vs new wrong-citation policy on typed derivative steps. Usage: bun citation-compare.ts <repo-root>
const L = process.argv[2] + "/packages/learning/src/";
const { assessMathematicalWorking } = await import(L + "unified-math-engine.ts");
const C = (n: number) => ({ kind: "constant", value: String(n) }), X = { kind: "variable", name: "x" };
const run = (f: unknown, d: unknown, rule: string) => assessMathematicalWorking({ domain: "calculus", task: "derivative", expression: f, variable: "x" } as never, [{ id: "s0", rule, claim: { kind: "expression", value: d } }] as never);
const tally: Record<string, number> = {};
for (let a = 2; a <= 7; a++) for (let n = 2; n <= 6; n++) {
  const f = { kind: "multiply", factors: [C(a), { kind: "power", base: X, exponent: n }] }, d = { kind: "multiply", factors: [C(a * n), { kind: "power", base: X, exponent: n - 1 }] }, wrong = { kind: "multiply", factors: [C(a * n + 1), { kind: "power", base: X, exponent: n - 1 }] };
  for (const [label, expr, kind] of [["power rule", d, "right label"], ["chain rule", d, "wrong label"], ["product rule", d, "wrong label"], ["quadratic formula", d, "unknown label"], ["power rule", wrong, "wrong result"]] as const) {
    const r: any = await run(f, expr, label); const k = `${kind}: ${r.classification}${r.processFindings?.length ? " +" + r.processFindings.map((x: any) => x.kind).join(",") : ""}`; tally[k] = (tally[k] ?? 0) + 1;
  }
}
console.log(JSON.stringify(tally, null, 1)); process.exit(0);
