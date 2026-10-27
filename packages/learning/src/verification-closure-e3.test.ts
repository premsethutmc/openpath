import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking, type AssessmentEnvelope } from "./unified-math-engine.ts";
import { parseNaturalWorking } from "./natural-working.ts";
import { checkAlgebraSubmission, certify, CHECKER_LIMITS } from "./independent-checker.ts";
import { checkSymbolicCertificate, type KernelCertificate } from "./proof-kernel.ts";
import { reconcileAlgebra } from "./acceptance-gate.ts";

const E3 = "tools/mathematics/verification-closure-e3/";
const E1 = "tools/mathematics/end-to-end-e1/";
const read = (p: string) => readFileSync(p, "utf8");
const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const nat = (text: string) => ({ format: "natural" as const, text });
const alg = (statement: string) => ({ domain: "algebra", statement }) as never;
const run = (statement: string, lines: string[]) => assessMathematicalWorking(alg(statement), nat(lines.join("\n")));
const gate = (a: AssessmentEnvelope) => a.acceptanceGate;
const fn = (coefficients: string[], input: string) => ({ domain: "function", task: "evaluate", f: { kind: "polynomial", coefficients }, input }) as never;

describe("E3 frozen inputs are untouched", () => {
  test("E1 corpus, E3 corpora and the adjudication overlay's base hash match", () => {
    expect(sha(E1 + "frozen-corpus.v1.json")).toBe(read(E1 + "FROZEN_SHA256").trim().split(/\s+/)[0]);
    for (const line of read(E3 + "FROZEN_SHA256").trim().split("\n")) { const [hash, file] = line.split(/\s+/); expect(sha(E3 + file)).toBe(hash); }
    expect(JSON.parse(read(E3 + "e1-adjudication-overlay.v1.json")).baseCorpusSha256).toBe(sha(E1 + "frozen-corpus.v1.json"));
  });
});

describe("E3 the 16 original E1 false acceptances", () => {
  const corpus = (JSON.parse(read(E1 + "frozen-corpus.v1.json")).cases ?? JSON.parse(read(E1 + "frozen-corpus.v1.json"))) as { id: string; problem: never; studentWorking: never }[];
  const ids: string[] = JSON.parse(read("tools/mathematics/proof-integrity-e2/false-accepts-before.json")).map((x: { id: string }) => x.id);
  const disputed = ["e1-116", "e1-126", "e1-141"];
  test("there are 16, all present in the frozen corpus", () => { expect(ids.length).toBe(16); for (const id of ids) expect(corpus.some((c) => c.id === id)).toBe(true); });
  for (const id of ids.filter((i) => !disputed.includes(i))) {
    test(`${id}: a wrong or incomplete working is not accepted`, async () => {
      const c = corpus.find((x) => x.id === id)!; const a = await assessMathematicalWorking(c.problem, c.studentWorking);
      expect(a.classification).not.toBe("verified"); expect(a.complete).not.toBe(true);
    });
  }
  for (const id of disputed) {
    test(`${id}: adjudicated as correct working, accepted only with independent evidence`, async () => {
      const overlay = JSON.parse(read(E3 + "e1-adjudication-overlay.v1.json")).adjudications.find((x: { caseId: string }) => x.caseId === id);
      expect(overlay.correctedClassification).toBe("verified"); expect(overlay.referenceLabelWrong).toBe(true); expect(overlay.engineDefect).toBe(false);
      const c = corpus.find((x) => x.id === id)!; const a = await assessMathematicalWorking(c.problem, c.studentWorking);
      expect(a.classification).toBe("verified"); expect(gate(a)?.independentlyVerified).toBe(true); expect(gate(a)?.evidence.length).toBeGreaterThan(0);
    });
  }
  test("the same disputed working is rejected when the input is not 1 (n*x is not n)", async () => {
    const a = await assessMathematicalWorking(fn(["2", "1", "1"], "3"), nat("f(x) = x^2 + 1x + 2\nf(3) = 3^2 + 1 + 2\nf(3) = 12"));
    expect(a.classification).toBe("invalid");
  });
});

describe("E3 independent verification of complete algebra solutions", () => {
  test("a correct final answer after an invalid intermediate line is rejected at that line", async () => {
    const a = await run("2x + 9 = 5x + 3", ["2x + 9 = 5x + 3", "-3x + 9 = 3", "-3x = 12", "x = 2"]);
    expect(a.classification).toBe("invalid"); expect(a.firstInvalidStep).toBe(2); expect(gate(a)?.independentlyVerified).toBe(false);
  });
  test("a correct intermediate line followed by a narrower conclusion is incomplete", async () => {
    for (const lines of [["x^2 = 9", "x = 3"], ["|x| = 2", "x = 2"], ["x^2 - 5x + 6 = 0", "(x - 2)(x - 3) = 0", "x = 2"]]) {
      const a = await run(lines[0], lines); expect(a.classification).toBe("incomplete"); expect(a.complete).not.toBe(true);
    }
  });
  test("valid alternative methods are accepted with independent evidence", async () => {
    const cases: [string, string[]][] = [
      ["x^2 - 5x + 6 = 0", ["x^2 - 5x + 6 = 0", "(x - 2)(x - 3) = 0", "x = 2 or x = 3"]],
      ["x^2 - 5x + 6 = 0", ["x^2 - 5x + 6 = 0", "x^2 - 5x = -6", "x = 2 or x = 3"]],
      ["2x + 3 = 11", ["2x + 3 = 11", "x + 3/2 = 11/2", "x = 4"]],
      ["x^2 = 9", ["x^2 = 9", "x = 3 or x = -3"]],
      ["-2x < 6", ["-2x < 6", "x > -3"]],
    ];
    for (const [s, l] of cases) { const a = await run(s, l); expect(a.classification).toBe("verified"); expect(gate(a)?.independentlyVerified).toBe(true); expect(gate(a)?.level).not.toBe("none"); }
  });
  test("multiplying an inequality by a negative number must reverse it", async () => {
    expect((await run("-2x < 6", ["-2x < 6", "x < -3"])).classification).toBe("invalid");
    expect((await run("-2x < 6", ["-2x < 6", "x > -3"])).classification).toBe("verified");
  });
  test("extraneous roots from squaring are checked against the original equation", async () => {
    const bad = await run("sqrt(x + 2) = x", ["sqrt(x + 2) = x", "x + 2 = x^2", "x^2 - x - 2 = 0", "x = 2 or x = -1"]);
    expect(bad.classification).not.toBe("verified"); expect(bad.complete).not.toBe(true);
    // E4 policy change (candidate elimination): the right root after squaring is accepted when the exact checker proves that the dropped
    // candidate fails the ORIGINAL equation and the final set equals the problem's solution set. The E3 rule (the student must write the check)
    // remains available as the "shown" policy and is asserted in verification-closure-e4.test.ts.
    const good = await run("sqrt(x + 2) = x", ["sqrt(x + 2) = x", "x + 2 = x^2", "x^2 - x - 2 = 0", "x = 2"]);
    expect(good.classification).toBe("verified"); expect(good.acceptanceGate?.independentlyVerified).toBe(true);
  });
  test("cancellation may not erase a domain restriction", async () => {
    const a = await run("(x^2 - 1)/(x - 1) = x + 1", ["(x^2 - 1)/(x - 1) = x + 1", "x + 1 = x + 1", "this holds for all x"]);
    expect(a.classification).not.toBe("verified"); expect(a.complete).not.toBe(true);
    const ok = await run("(x^2 - 1)/(x - 1) = x + 1", ["(x^2 - 1)/(x - 1) = x + 1", "x + 1 = x + 1", "this holds for all x except x = 1"]);
    expect(ok.classification).not.toBe("invalid");
  });
  test("a false completeness claim is refuted", async () => {
    const a = await run("x^2 = 9", ["x^2 = 9", "x = 3", "this is the complete solution"]);
    expect(a.classification).toBe("invalid");
  });
  test("an unsupported intermediate line can never become verified", async () => {
    for (const mid of ["gcd(4, 6) = 2", "tan(0) = 0", "5! = 120"]) {
      const a = await run("x + 1 = 2", ["x + 1 = 2", mid, "x = 1"]); expect(a.classification).not.toBe("verified"); expect(gate(a)?.independentlyVerified).not.toBe(true);
    }
  });
  test("a wrong final conclusion is invalid even when every step is a true equation about different things", async () => {
    expect((await run("x + 9 = 14", ["x + 9 = 14", "x = 4"])).classification).toBe("invalid");
  });
});

describe("E3 cross-domain dependency integrity", () => {
  const F = fn(["4", "3", "1"], "3");
  test("a correct chain is accepted with U4 evidence", async () => {
    const a = await assessMathematicalWorking(F, nat("f(x) = x^2 + 3x + 4\nf(3) = 3^2 + 3*3 + 4\nf(3) = 22"));
    expect(a.classification).toBe("verified"); expect(gate(a)?.level).toBe("u4-kernel"); expect(gate(a)?.independentlyVerified).toBe(true);
  });
  test("a correct final value after a wrong substitution line is invalid", async () => {
    const a = await assessMathematicalWorking(F, nat("f(x) = x^2 + 3x + 4\nf(3) = 3^2 + 3 + 4\nf(3) = 22"));
    expect(a.classification).toBe("invalid"); expect(a.firstInvalidStep).toBe(1);
  });
  test("an incomplete chain that stops before the answer is not verified", async () => {
    const a = await assessMathematicalWorking(F, nat("f(x) = x^2 + 3x + 4\nf(3) = 3^2 + 3*3 + 4"));
    expect(a.classification).not.toBe("verified");
  });
  test("a wrong value carried into a later line is not accepted", async () => {
    const a = await assessMathematicalWorking(F, nat("f(x) = x^2 + 3x + 4\nf(3) = 9 + 9 + 4\nf(3) = 21"));
    expect(a.classification).toBe("invalid");
  });
});

describe("E3 forged or mismatched proof certificates", () => {
  const before = { kind: "multiply", factors: [{ kind: "constant", value: "2" }, { kind: "variable", name: "x" }] } as never;
  const after = { kind: "add", terms: [{ kind: "variable", name: "x" }, { kind: "variable", name: "x" }] } as never;
  const other = { kind: "multiply", factors: [{ kind: "constant", value: "3" }, { kind: "variable", name: "x" }] } as never;
  const mk = (b: unknown, a: unknown): KernelCertificate => {
    const body = { strategy: "rational-normal-form", sourceCanonical: JSON.stringify(b), targetCanonical: JSON.stringify(a), rules: [] as string[], assumptions: [], restrictions: [] as string[], obligations: [] as string[] };
    return { ...body, replayDigest: createHash("sha256").update(JSON.stringify(body)).digest("hex") } as KernelCertificate;
  };
  test("an honest certificate verifies", () => { expect(checkSymbolicCertificate(mk(before, after), before, after, [], []).outcome).toBe("verified"); expect(certify(before, after).outcome).toBe("verified"); });
  test("a certificate for one claim does not verify a different claim", () => { expect(checkSymbolicCertificate(mk(before, after), before, other, [], []).outcome).not.toBe("verified"); });
  test("a certificate with a tampered digest is rejected", () => { expect(checkSymbolicCertificate({ ...mk(before, after), replayDigest: "0".repeat(64) }, before, after, [], []).outcome).not.toBe("verified"); });
  test("a cancellation certificate cannot drop the restriction it depends on", () => {
    const x = { kind: "variable", name: "x" } as never as { kind: string }, k = (v: string) => ({ kind: "constant", value: v });
    const src = { kind: "multiply", factors: [{ kind: "add", terms: [{ kind: "power", base: x, exponent: 2 }, k("-1")] }, { kind: "power", base: { kind: "add", terms: [x, k("-1")] }, exponent: -1 }] } as never;
    const dst = { kind: "add", terms: [x, k("1")] } as never;
    const res = checkSymbolicCertificate(mk(src, dst), src, dst, [], []);
    expect(res.outcome).toBe("unsupported"); expect(res.obligations.join(" ")).toContain("nonzero");
    expect(certify(src, dst).restrictions.join(" ")).toContain("nonzero");
  });
  test("a false identity is refuted by the independent identity check", () => { expect(certify(before, other).outcome).not.toBe("verified"); });
});

describe("E3 the independent checker agrees with an exact oracle", () => {
  const cases = JSON.parse(read(E3 + "fuzz/fuzz-cases.v1.json")).cases as { problem: string; line: string; relation: string }[];
  const map: Record<string, string> = { equal: "equivalent", subset: "widening", superset: "narrowing", incomparable: "incomparable" };
  test("no disagreement over the differential fuzz set; coverage is reported, not hidden", () => {
    let agree = 0, abstain = 0; const bad: string[] = [];
    for (const c of cases) {
      const p = parseNaturalWorking(nat(c.line)); if (p.classification !== "parsed") { abstain++; continue; }
      const r = checkAlgebraSubmission(c.problem, p), l = r.lines[0];
      if (!l || l.relation === "unsupported" || r.outcome === "unsupported" || r.outcome === "resource-exhausted") { abstain++; continue; }
      // E4: the checker now decides cases whose critical points are irrational (quadratic surds). The E3 grid oracle behind this fuzz file only
      // sees rational points, so it is blind to those roots; they are compared against the E4 irrational-aware oracle instead (verification-closure-e4.test.ts).
      if (/sqrt\(/.test(JSON.stringify([r.problemSolutionSet, r.finalSolutionSet, l.solutionSet, l.detail]))) { abstain++; continue; }
      if (l.relation === map[c.relation]) agree++; else bad.push(`${c.problem} || ${c.line}`);
    }
    expect(bad).toEqual([]); expect(agree + abstain).toBe(cases.length); expect(agree / cases.length).toBeGreaterThan(0.75);
  });
  test("resource limits are explicit", () => { expect(CHECKER_LIMITS).toBeDefined(); });
});

describe("E3 gate reconciliation rules", () => {
  const mkCheck = (outcome: string, authority = "checker") => ({ outcome, completenessAuthority: authority }) as never;
  test("no independent evidence: a candidate acceptance is withdrawn", () => { expect(reconcileAlgebra("verified", mkCheck("unsupported")).classification).toBe("unsupported"); });
  test("a checker refutation overrides a candidate acceptance", () => { for (const o of ["invalid", "incomplete", "missing-assumption"]) expect(reconcileAlgebra("verified", mkCheck(o)).classification).toBe(o); });
  test("a disagreement between verifiers accepts nothing", () => { expect(reconcileAlgebra("invalid", mkCheck("verified")).classification).toBe("unsupported"); });
  test("the checker never relaxes a stricter native verdict", () => { expect(reconcileAlgebra("incomplete", mkCheck("verified")).classification).toBe("incomplete"); });
});

describe("E3 every accepted route carries the independent verification gate", () => {
  for (const [name, file] of [["E3 dev", E3 + "dev-cases.v1.json"], ["E2 dev", "tools/mathematics/proof-integrity-e2/dev-cases.v1.json"]] as const) {
    test(`${name}: every verified assessment has gate evidence and no unresolved obligation`, async () => {
      const cases = JSON.parse(read(file)).cases as { id?: string; problem: never; studentWorking: never }[]; let verified = 0;
      for (const c of cases) {
        const a = await assessMathematicalWorking(c.problem, c.studentWorking);
        if (a.classification !== "verified") continue; verified++;
        const g = gate(a); expect(g).toBeDefined(); expect(g!.independentlyVerified).toBe(true); expect(g!.level).not.toBe("none");
        expect(g!.obligations).toEqual([]); expect(a.outstandingObligations).toEqual([]); expect(a.steps.every((s) => s.classification === "verified")).toBe(true);
      }
      expect(verified).toBeGreaterThan(10);
    });
  }
});
