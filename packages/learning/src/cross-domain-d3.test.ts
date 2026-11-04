import { describe, expect, test } from "bun:test";
import benchmark from "../../../tools/mathematics/cross-domain-d3/frozen-cross-domain-cases.v1.json";
import { fixture } from "../../../tools/mathematics/cross-domain-d3/benchmark-fixtures";
import { assessMathematicalWorking } from "./unified-math-engine";
import { MathematicalBindingStore, type BindingType } from "./cross-domain-bindings";
import type { AssessmentEnvelope } from "./unified-math-engine";
import m1 from "../../../tools/mathematics/m1/independent-cases.v1.json";
import m2 from "../../../tools/mathematics/m2/independent-cases.v1.json";
import b1 from "../../../tools/mathematics/probability-b1/independent-cases.v1.json";
import b2 from "../../../tools/mathematics/linear-algebra-b2/independent-cases.v1.json";
import b3 from "../../../tools/mathematics/complex-b3/independent-cases.v1.json";
import calculus from "../../../tools/mathematics/calculus/independent-cases.v1.json";

describe("D3 generalized typed mathematical bindings", () => {
  test("150 frozen cross-domain transfers preserve type, scope, and proof status", async () => {
    expect(benchmark.cases).toHaveLength(150);
    let matches=0,valid=0,accepted=0,falseAcceptances=0,falseRejections=0,firstInvalid=0,verifiedBindings=0;
    for(const item of benchmark.cases){const value=fixture(item);const assessment=await assessMathematicalWorking(value.problem,value.working);matches+=Number(assessment.classification===item.expected.classification&&assessment.firstInvalidStep===item.expected.firstInvalidStep);valid+=Number(item.expected.classification==="verified");accepted+=Number(item.expected.classification==="verified"&&assessment.classification==="verified");falseAcceptances+=Number(item.expected.classification!=="verified"&&assessment.classification==="verified");falseRejections+=Number(item.expected.classification==="verified"&&assessment.classification!=="verified");firstInvalid+=Number(item.expected.classification==="invalid"&&assessment.firstInvalidStep===item.expected.firstInvalidStep);verifiedBindings+=((assessment.domainPayload as any)?.bindings??[]).filter((binding:any)=>binding.proofVerificationStatus==="verified").length;expect([item.id,assessment.classification,assessment.firstInvalidStep]).toEqual([item.id,item.expected.classification,item.expected.firstInvalidStep]);}
    expect({matches,valid,accepted,falseAcceptances,falseRejections,firstInvalid,verifiedBindings}).toEqual({matches:150,valid:60,accepted:60,falseAcceptances:0,falseRejections:0,firstInvalid:55,verifiedBindings:105});
  },30_000);

  test("all bounded binding types retain proof provenance and exact structure", () => {
    const samples: [BindingType, any][] = [
      ["exact-scalar", { kind: "integer", value: "2" }],
      ["symbolic-expression", { kind: "variable", name: "x" }],
      ["equation", { kind: "equation", left: "x", right: "2" }],
      ["inequality", { kind: "inequality", left: "x", relation: ">", right: "0" }],
      ["interval", { kind: "solution-set", intervals: [{ min: "0", max: "1", includeMin: true, includeMax: false }] }],
      ["finite-solution-set", { kind: "solutions", values: ["-1", "1"] }],
      ["vector", { kind: "vector", value: ["1", "2", "3"] }],
      ["matrix", { kind: "matrix", value: [["1", "0"], ["0", "1"]] }],
      ["geometric-relation", { predicate: "perpendicular", args: ["AB", "CD"] }],
      ["probability", { kind: "rational", value: "1/3" }],
      ["calculus-expression", { kind: "expression", value: { kind: "variable", name: "x" } }],
    ];
    const assessment = { domain: "symbolic", classification: "verified", complete: true, correct: true, steps: [{ index: 0, classification: "verified" }], domainRestrictions: [], outstandingObligations: [], skills: ["test"], reasoners: [{ id: "u4", version: "test" }], domainPayload: { exact: true } } as unknown as AssessmentEnvelope;
    for (const [mathematicalType, raw] of samples) {
      const store = new MathematicalBindingStore();
      const working: any = [{ id: "proof", result: raw }];
      const failure = store.export("source", { id: "fact", mathematicalType, symbol: { name: "q", scope: "problem" }, source: { workingPath: ["0", "result"], proofStepId: "proof" }, assumptions: [], domainRestrictions: [], outstandingObligations: [] }, working, assessment, []);
      expect(failure).toBeNull();
      expect(store.bindings.get("fact")?.proofVerificationStatus).toBe("verified");
      const dimensions = mathematicalType === "vector" ? [3] : mathematicalType === "matrix" ? [2, 2] : undefined;
      const resolved = store.resolve({ domain: "linear-algebra", area: "vector", task: "add", data: { injected: { kind: "binding-reference", bindingId: "fact", expectedType: mathematicalType, symbol: { name: "q", scope: "problem" }, dimensions } }, assumptions: [] } as any, [{ bindingId: "fact", expectedType: mathematicalType, symbol: { name: "q", scope: "problem" }, dimensions }]);
      expect(resolved.failure).toBeUndefined();
    }
  });

  test("forged, stale, shadowed, and dependency-invalid bindings fail closed", async () => {
    const validCase = benchmark.cases.find((item) => item.mode === "valid-reference")!;
    const scopeCase = benchmark.cases.find((item) => item.mode === "wrong-scope")!;
    let checked = 0;
    for (let index = 0; index < 10; index += 1) {
      const forged = fixture(validCase) as any;
      forged.problem.stages[0].exports[0].source.proofStepId = `forged-${index}`;
      expect((await assessMathematicalWorking(forged.problem, forged.working)).classification).toBe("invalid");
      checked += 1;

      const stale = fixture(validCase) as any;
      stale.problem.stages[1].dependsOn = [];
      expect((await assessMathematicalWorking(stale.problem, stale.working)).classification).toBe("invalid");
      checked += 1;

      const shadowed = fixture(scopeCase) as any;
      expect((await assessMathematicalWorking(shadowed.problem, shadowed.working)).classification).toBe("invalid");
      checked += 1;

      const missingDependency = fixture(validCase) as any;
      missingDependency.problem.stages[0].dependsOn = [`unknown-${index}`];
      expect((await assessMathematicalWorking(missingDependency.problem, missingDependency.working)).classification).toBe("malformed");
      checked += 1;
    }
    expect(checked).toBe(40);
  });

  test("binding, substitution-depth, and expression-node budgets fail closed", async () => {
    const validCase = benchmark.cases.find((item) => item.mode === "valid-reference")!;
    const tooMany = fixture(validCase) as any;
    tooMany.problem.stages = [tooMany.problem.stages[0]];
    tooMany.working.stages = [tooMany.working.stages[0]];
    tooMany.problem.stages[0].exports = Array.from({ length: 65 }, (_, index) => ({ ...tooMany.problem.stages[0].exports[0], id: `binding-${index}` }));
    expect((await assessMathematicalWorking(tooMany.problem, tooMany.working)).classification).toBe("resource-exhausted");

    const store = new MathematicalBindingStore();
    let nested: any = { kind: "binding-reference", bindingId: "missing", expectedType: "exact-scalar", symbol: { name: "x", scope: "p" } };
    for (let index = 0; index < 18; index += 1) nested = { nested };
    expect(store.resolve({ domain: "linear-algebra", area: "vector", task: "add", data: nested, assumptions: [] } as any, []).failure?.classification).toBe("resource-exhausted");
    const wide = Object.fromEntries(Array.from({ length: 257 }, (_, index) => [`v${index}`, index]));
    expect(store.resolve({ domain: "linear-algebra", area: "vector", task: "add", data: wide, assumptions: [] } as any, []).failure?.classification).toBe("resource-exhausted");
  });

  test("verified scalars transfer from six existing mathematical domains", async () => {
    const multiply = (value: string, factor: bigint) => { const parts=value.split("/").map(BigInt),n=parts[0],d=parts[1]??1n;let numerator=n*factor,denominator=d;const gcd=(a:bigint,b:bigint):bigint=>b===0n?(a<0n?-a:a):gcd(b,a%b),g=gcd(numerator,denominator);numerator/=g;denominator/=g;return denominator===1n?String(numerator):`${numerator}/${denominator}`; };
    const find = (source: any, predicate: (item: any) => boolean) => source.cases.find((item: any) => item.expected.classification === "verified" && predicate(item));
    const sources = [
      [find(m1, (item) => item.id === "fn-0"), ["0", "value"], "$index:0", "6"],
      [find(m2, (item) => item.id === "seq-0"), ["0", "result"], "$index:0", "1"],
      [find(b1, (item) => item.id === "b1-probability-000"), ["0", "result"], "s0", "1/2"],
      [find(b2, (item) => item.id === "b2-determinant-003"), ["0", "result"], "s0", "18"],
      [find(b3, (item) => item.id === "b3-arithmetic-060"), ["0", "result"], "s0", "5"],
      [find(calculus, (item) => item.id === "definite-improper-45"), ["0", "claim"], "s0", "1/4"],
    ] as const;
    for (const [source, workingPath, proofStepId, scalar] of sources) {
      const problem: any = { domain: "d3-cross-domain", stages: [
        { id: "source", problem: source.problem, dependsOn: [], exports: [{ id: "value", mathematicalType: "exact-scalar", symbol: { name: "q", scope: "journey" }, source: { workingPath, proofStepId }, assumptions: [], domainRestrictions: [], outstandingObligations: [] }] },
        { id: "destination", dependsOn: ["source"], imports: [{ bindingId: "value", expectedType: "exact-scalar", symbol: { name: "q", scope: "journey" } }], problem: { domain: "linear-algebra", area: "vector", task: "scalar-multiply", data: { a: ["1", "2", "3"], scalar: { kind: "binding-reference", bindingId: "value", expectedType: "exact-scalar", symbol: { name: "q", scope: "journey" } } }, assumptions: [] } },
      ] };
      const working: any = { stages: [
        { id: "source", working: source.working },
        { id: "destination", working: [{ id: "s0", rule: "component-wise", result: { kind: "vector", value: [scalar, multiply(scalar,2n), multiply(scalar,3n)] }, dependencies: [] }] },
      ] };
      const assessment = await assessMathematicalWorking(problem, working);
      expect([source.id, assessment.classification, assessment.justification]).toEqual([source.id, "verified", "all domain stages and typed binding substitutions are independently verified"]);
    }
  });
});
