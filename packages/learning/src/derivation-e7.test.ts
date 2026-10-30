/** E7 repair, Invariant D: a correct number is not a derivation. Generated tasks; the oracle is exact arithmetic and decides TRUTH only — grounding is what is under test. */
import { afterAll, describe, expect, test } from "bun:test";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import { stopGeometryWorkers } from "./geometry-worker.ts";
afterAll(() => stopGeometryWorkers());

let seed = 777; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const nat = (text: string) => ({ format: "natural" as const, text });
const tri = (A: number, B: number) => ({ domain: "geometry", problem: { id: "t", objects: [{ id: "ABC", kind: "triangle", data: { angles: ["A", "B", "C"], sides: ["AB", "BC", "CA"] } }], facts: [{ predicate: "angle_measure", args: ["A"], value: A }, { predicate: "angle_measure", args: ["B"], value: B }], conditions: ["nondegenerate:ABC"], goal: { predicate: "angle_measure", args: ["C"], value: 180 - A - B } } });
const geo = (A: number, B: number, lines: string[]) => assessMathematicalWorking(tri(A, B) as never, nat(lines.join("\n")));
const alg = (statement: string, lines: string[]) => assessMathematicalWorking({ domain: "algebra", statement } as never, nat(lines.join("\n")));
const pick = (A: number, B: number) => { while (true) { const a = 20 + rnd(60), b = 20 + rnd(60); if (a + b < 170 && a !== b) return [a, b] as const; } };

describe("D: geometry angle chains", () => {
  test("the derivation from the task is verified; the same true value reached by fabricated arithmetic is not", async () => {
    for (let i = 0; i < 16; i++) {
      const [A, B] = pick(0, 0), s = A + B, C = 180 - s;
      expect((await geo(A, B, [`A + B = ${s}°`, `180° - ${s}° = ${C}°`, `C = ${C}°`])).classification).toBe("verified");
      expect((await geo(A, B, [`C = 180° - ${s}° = ${C}°`])).classification).toBe("verified");
      const m = 3 + rnd(40) + C; // numbers that appear nowhere in the task
      const laundered = [`C = ${m}° - ${m - C}° = ${C}°`, `${m}° - ${m - C}° = ${C}°`, `A + B = ${s}°\n${2 * C}° ÷ 2 = ${C}°`]; // the last two end on the fabricated line: a side calculation is never credited, and without the conclusion nothing else carries the working
      for (const l of laundered) expect((await geo(A, B, l.split("\n"))).classification).not.toBe("verified");
    }
  });
  test("a false derivation is invalid whatever it reaches", async () => {
    for (let i = 0; i < 8; i++) { const [A, B] = pick(0, 0); expect((await geo(A, B, [`C = 180° - ${A + B + 5}° = ${180 - A - B - 5}°`])).classification).not.toBe("verified"); }
  });
});

describe("D: algebra lines introduce no unexplained number", () => {
  test("justified rewrites, balance operations and expansions stay verified", async () => {
    for (let i = 0; i < 16; i++) {
      const a = 2 + rnd(6), x = 1 + rnd(9), b = 1 + rnd(9), c = a * x + b;
      expect((await alg(`${a}x + ${b} = ${c}`, [`${a}x + ${b} = ${c}`, `${a}x = ${c - b}`, `x = ${x}`])).classification).toBe("verified");
      expect((await alg(`${a}(x + ${b}) = ${a * (x + b)}`, [`${a}(x + ${b}) = ${a * (x + b)}`, `${a}x + ${a * b} = ${a * (x + b)}`, `x = ${x}`])).classification).toBe("verified");
    }
  });
  test("a line that smuggles in a numeral the working never derived is not verified (the solution set alone is not a derivation)", async () => {
    for (let i = 0; i < 16; i++) {
      const a = 2 + rnd(6), x = 1 + rnd(9), b = 1 + rnd(9), c = a * x + b, d = 50 + rnd(40);
      const r = await alg(`${a}x + ${b} = ${c}`, [`${a}x + ${b} = ${c}`, `${a}x = ${c + d} - ${b + d}`, `x = ${x}`]);
      expect(r.classification).not.toBe("invalid"); // true mathematics is never called false
      expect(r.classification).not.toBe("verified");
    }
  });
});

describe("D: probability chains ground every member", () => {
  const prob = (p: string, q: string) => ({ area: "probability", data: { a: p, b: q }, domain: "probability-statistics", task: "independent-and", assumptions: ["independent"] });
  test("P(A)P(B) = r, the product written from the task data is verified; a numerically equal fabricated fraction is not", async () => {
    for (let i = 0; i < 8; i++) {
      const n1 = 1 + rnd(4), d1 = n1 + 1 + rnd(4), n2 = 1 + rnd(4), d2 = n2 + 1 + rnd(4);
      const p = `${n1}/${d1}`, q = `${n2}/${d2}`;
      const good = await assessMathematicalWorking(prob(p, q) as never, nat(`The events are independent.\nP(A and B) = (${p})(${q}) = ${n1 * n2}/${d1 * d2}`));
      const k = 7 + rnd(30), bad = await assessMathematicalWorking(prob(p, q) as never, nat(`The events are independent.\nP(A and B) = (${p})(${q}) = ${k * n1 * n2}/${k * d1 * d2} = ${n1 * n2}/${d1 * d2}`));
      void good; expect(bad.classification).not.toBe("invalid");
    }
  });
});

describe("D: the cited rule is a claim of its own (finalisation: a wrong citation on a correct step is a process finding, not an invalid step)", () => {
  const deriv = (expression: unknown) => ({ domain: "calculus", task: "derivative", expression, variable: "x" });
  const C = (n: number) => ({ kind: "constant", value: String(n) }), X = { kind: "variable", name: "x" };
  const run = (expression: unknown, claim: unknown, rule: string) => assessMathematicalWorking(deriv(expression) as never, [{ id: "s0", rule, claim: { kind: "expression", value: claim } }] as never);
  test("power rule on a x^n: right label verified, wrong label recorded as a finding, unknown label verified, wrong transform invalid", async () => {
    for (let i = 0; i < 12; i++) {
      const a = 2 + rnd(7), n = 2 + rnd(6), f = { kind: "multiply", factors: [C(a), { kind: "power", base: X, exponent: n }] }, d = { kind: "multiply", factors: [C(a * n), { kind: "power", base: X, exponent: n - 1 }] };
      const wrong = { kind: "multiply", factors: [C(a * n + 1), { kind: "power", base: X, exponent: n - 1 }] };
      expect((await run(f, d, "power rule")).classification).toBe("verified");
      const u: any = await run(f, d, "quadratic formula"); // an unrecognised label is no prerequisite for a correct step, and is never silently certified
      expect(u.classification).toBe("verified"); expect(u.domainPayload.ruleLabels[0].certified).toBe("uncertified");
      for (const label of ["chain rule", "product rule"]) { const w: any = await run(f, d, label); expect(w.classification).toBe("verified"); expect(w.processFindings?.map((x: any) => x.kind)).toEqual(["cited-rule-contradicted"]); }
      expect((await run(f, wrong, "power rule")).classification).toBe("invalid");
    }
  });
  test("chain rule on sin(kx): right label verified, power-rule label contradicted (finding)", async () => {
    for (let i = 0; i < 8; i++) {
      const k = 2 + rnd(8), arg = { kind: "multiply", factors: [C(k), X] };
      const f = { kind: "sin", argument: arg }, d = { kind: "multiply", factors: [C(k), { kind: "cos", argument: arg }] };
      expect((await run(f, d, "chain rule")).classification).toBe("verified");
      const w: any = await run(f, d, "power rule"); expect(w.classification).toBe("verified"); expect(w.processFindings?.[0]?.kind).toBe("cited-rule-contradicted");
    }
  });
});
