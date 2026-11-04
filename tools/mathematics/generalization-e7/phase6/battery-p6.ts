// E7 Phase 6 focused battery: certification-boundary cases written from the mathematics (not from any engine output). Usage: ENGINE_ROOT=<worktree> bun battery-p6.ts > out.json
const root = process.env.ENGINE_ROOT ?? new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const { assessMathematicalWorking } = await import(root + "/packages/learning/src/unified-math-engine.ts");
const K = (v: string) => ({ kind: "constant", value: v }), X = { kind: "variable", name: "x" };
const pw = (b: unknown, e: number) => ({ kind: "power", base: b, exponent: e }), mul = (...f: unknown[]) => ({ kind: "multiply", factors: f }), add = (...t: unknown[]) => ({ kind: "add", terms: t });
const der = { domain: "calculus", task: "derivative", expression: pw(add(mul(K("3"), X), K("1")), 5), variable: "x" };
const ind = { domain: "calculus", task: "indefinite-integral", integrand: add(mul(K("5"), pw(X, 4)), K("1")), variable: "x" };
const sinI = { domain: "calculus", task: "indefinite-integral", integrand: { kind: "sin", argument: mul(K("5"), X) }, variable: "x" };
const inv = { domain: "calculus", task: "indefinite-integral", integrand: pw(X, -1), variable: "x" };
const tri = { domain: "geometry", problem: { id: "tri", objects: [{ id: "ABC", kind: "triangle" }], facts: [{ predicate: "angle_measure", args: ["A"], value: 50 }, { predicate: "angle_measure", args: ["B"], value: 60 }], conditions: ["nondegenerate:ABC"], goal: { predicate: "angle_measure", args: ["C"], value: 70 } } };
const alg = { domain: "algebra", statement: "2x+3=7" };
const bin = { domain: "probability-statistics", area: "distribution", task: "binomial-variance", data: { n: 10, p: "3/10" } };
type C = [string, string, unknown, string, string]; // id, group, problem, text, expected: "verified" | "not-verified" | "not-invalid" (non-verified and not a false-math claim)
const cases: C[] = [
  ["side-der-1", "side-claim", der, "2+2 = 4\nd/dx (3x+1)^5 = 15(3x+1)^4", "verified"],
  ["side-der-2", "side-claim", der, "d/dx (3x+1)^5 = 15(3x+1)^4\nsin(x)^2 + cos(x)^2 = 1", "verified"],
  ["side-der-3", "side-claim", der, "x^2 = x*x\nd/dx (3x+1)^5 = 5(3x+1)^4 * 3 = 15(3x+1)^4", "verified"],
  ["side-int-1", "side-claim", ind, "x^2 = x*x\n∫(5x^4+1)dx = x^5 + x + C", "verified"],
  ["side-int-2", "side-claim", ind, "∫2x dx = x^2 + C\n∫(5x^4+1)dx = x^5 + x + C", "verified"],
  ["side-geo-1", "side-claim", tri, "3*4 = 12\nangle C = 70°", "verified"],
  ["side-geo-2", "side-claim", tri, "angle A = 50°\nangle B = 60°\nangle C = 70°\n7 + 7 = 14", "verified"],
  ["offtask-int-1", "unrelated-true", ind, "∫3x^2 dx = x^3 + C", "not-invalid"],
  ["offtask-int-2", "unrelated-true", ind, "∫2x dx = x^2 + C", "not-invalid"],
  ["offtask-der-1", "unrelated-true", der, "d/dx x^2 = 2x", "not-invalid"],
  ["offtask-der-2", "unrelated-true", der, "2+2 = 4", "not-verified"],
  ["offtask-geo-1", "unrelated-true", tri, "3*4 = 12", "not-verified"],
  ["numerology-geo-1", "ungrounded-derivation", tri, "angle C = 100 - 30 = 70°", "not-verified"],
  ["numerology-geo-2", "ungrounded-derivation", tri, "angle C = 123 - 53 = 70", "not-verified"],
  ["numerology-geo-3", "ungrounded-derivation", tri, "angle C = 17 * 4 + 2 = 70", "not-verified"],
  ["geo-grounded-1", "valid-method", tri, "angle C = 180 - 110 = 70", "verified"],
  ["geo-grounded-2", "valid-method", tri, "50 + 60 = 110\nangle C = 180 - 110 = 70", "verified"],
  ["geo-grounded-3", "valid-method", tri, "angle A + angle B + angle C = 180\n50 + 60 + angle C = 180\nangle C = 70", "verified"],
  ["geo-concise", "valid-method", tri, "angle C = 70°", "verified"],
  ["geo-wrong", "wrong-answer", tri, "angle C = 80°", "not-verified"],
  ["geo-wrong-derived", "wrong-answer", tri, "angle C = 180 - 110 = 80", "not-verified"],
  ["der-wrong", "wrong-answer", der, "d/dx (3x+1)^5 = 14(3x+1)^4", "not-verified"],
  ["der-concise", "valid-method", der, "d/dx (3x+1)^5 = 15(3x+1)^4", "verified"],
  ["der-chain", "valid-method", der, "d/dx (3x+1)^5 = 5(3x+1)^4 * 3 = 15(3x+1)^4", "verified"],
  ["der-bare-answer", "bare-answer", der, "15(3x+1)^4", "not-verified"],
  ["der-unfinished", "incomplete", der, "d/dx (3x+1)^5 = 5(3x+1)^4 * 3\nso the derivative is found", "not-verified"],
  ["int-ok", "valid-method", ind, "∫(5x^4+1)dx = x^5 + x + C", "verified"],
  ["int-no-C", "missing-assumption", ind, "∫ 5x^4 + 1 dx = x^5 + x", "not-verified"],
  ["sin-form", "route-disagreement", sinI, "∫ sin(5x) dx = -cos(5x)/5 + C", "verified"],
  ["sin-wrong", "route-disagreement", sinI, "∫ sin(5x) dx = cos(5x)/5 + C", "not-verified"],
  ["ln-domain", "missing-assumption", inv, "∫ 1/x dx = ln(x) + C", "not-verified"],
  ["alg-ok", "valid-method", alg, "2x = 4\nx = 2", "verified"],
  ["alg-alt", "valid-method", alg, "2x+3-3 = 7-3\n2x = 4\nx = 4/2\nx = 2", "verified"],
  ["alg-wrong", "wrong-answer", alg, "2x = 4\nx = 3", "not-verified"],
  ["alg-side", "side-claim", alg, "Note that 2 + 2 = 4.\n2x = 4\nx = 2", "verified"],
  ["bin-ok", "valid-method", bin, "Var(X) = 10(3/10)*(7/10) = 21/10", "verified"],
  ["bin-wrong", "wrong-answer", bin, "Var(X) = 10(3/10) = 3", "not-verified"],
  ["bin-coincidence", "ungrounded-derivation", bin, "Var(X) = 42/20 = 21/10", "not-verified"],
];
const out: Record<string, unknown>[] = []; let bad = 0;
for (const [id, group, problem, text, expect] of cases) {
  const r: any = await assessMathematicalWorking(problem as never, { format: "natural", text });
  const ok = expect === "verified" ? r.classification === "verified" : expect === "not-verified" ? r.classification !== "verified" : r.classification !== "verified" && r.classification !== "invalid";
  if (!ok) bad++; out.push({ id, group, expect, got: r.classification, ok, rule: r.certification?.rule ?? null });
}
console.log(JSON.stringify({ engine: root, cases: out.length, mismatches: bad, results: out }));
try { const g = await import(root + "/packages/learning/src/geometry-worker.ts"); g.stopGeometryWorkers?.(); } catch { /* absent */ }
process.exit(0);
