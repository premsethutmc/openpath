import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking, type AssessmentEnvelope } from "./unified-math-engine.ts";
import { parseNaturalWorking } from "./natural-working.ts";
import { checkAlgebraSubmission, certify, withCandidateEliminationPolicy, CHECKER_LIMITS } from "./independent-checker.ts";
import { checkSymbolicCertificate, type KernelCertificate } from "./proof-kernel.ts";
import { reconcileAlgebra } from "./acceptance-gate.ts";

const E4 = "tools/mathematics/coverage-e4/";
const read = (p: string) => readFileSync(p, "utf8");
const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const nat = (text: string) => ({ format: "natural" as const, text });
const alg = (statement: string) => ({ domain: "algebra", statement }) as never;
const run = (statement: string, lines: string[]) => assessMathematicalWorking(alg(statement), nat(lines.join("\n")));
const gate = (a: AssessmentEnvelope) => a.acceptanceGate;
const accepted = async (statement: string, lines: string[]) => { const a = await run(statement, lines); expect(a.classification).toBe("verified"); expect(gate(a)?.independentlyVerified).toBe(true); expect(gate(a)?.level).not.toBe("none"); expect(a.complete).toBe(true); return a; };
const never = async (statement: string, lines: string[], expected?: string) => { const a = await run(statement, lines); expect(a.classification).not.toBe("verified"); expect(a.complete).not.toBe(true); expect(gate(a)?.independentlyVerified ?? false).toBe(false); if (expected) expect(a.classification).toBe(expected); return a; };

describe("E4 frozen inputs are untouched", () => {
  test("the E4 development and sealed corpora match their recorded hashes", () => {
    for (const line of read(E4 + "FROZEN_SHA256").trim().split("\n")) { const [hash, file] = line.trim().split(/\s+/); expect(sha(E4 + file)).toBe(hash); }
  });
});

describe("E4 radical equations: squaring is non-equivalent and every retained root is checked against the original", () => {
  test("a squared candidate list followed by the single true root is accepted with independent evidence", async () => {
    await accepted("sqrt(x + 5) = x - 1", ["sqrt(x + 5) = x - 1", "x + 5 = (x - 1)^2", "x^2 - 3x - 4 = 0", "(x - 4)(x + 1) = 0", "x = 4 or x = -1", "x = 4"]);
    await accepted("sqrt(2x + 3) = x", ["sqrt(2x + 3) = x", "2x + 3 = x^2", "x^2 - 2x - 3 = 0", "x = 3"]);
  });
  test("keeping the extraneous root, or stopping at the candidates, is never accepted", async () => {
    await never("sqrt(x + 5) = x - 1", ["sqrt(x + 5) = x - 1", "x + 5 = (x - 1)^2", "x^2 - 3x - 4 = 0", "x = 4 or x = -1"], "invalid");
    await never("sqrt(x + 5) = x - 1", ["sqrt(x + 5) = x - 1", "x + 5 = (x - 1)^2", "x^2 - 3x - 4 = 0"], "incomplete");
    await never("sqrt(x + 5) = x - 1", ["sqrt(x + 5) = x - 1", "x + 5 = (x - 1)^2", "x^2 - 3x - 4 = 0", "x = -1"], "invalid");
  });
  test("two radicals: isolating, squaring and the exact root are accepted; a wrong squaring is not", async () => {
    await accepted("sqrt(x + 4) + sqrt(x) = 4", ["sqrt(x + 4) + sqrt(x) = 4", "sqrt(x + 4) = 4 - sqrt(x)", "x + 4 = 16 - 8*sqrt(x) + x", "8*sqrt(x) = 12", "sqrt(x) = 3/2", "x = 9/4"]);
    await never("sqrt(x + 4) + sqrt(x) = 4", ["sqrt(x + 4) + sqrt(x) = 4", "sqrt(x + 4) = 4 - sqrt(x)", "x + 4 = 16 + x", "x = 3/2"], "invalid");
    await never("sqrt(x + 4) + sqrt(x) = 4", ["sqrt(x + 4) + sqrt(x) = 4", "sqrt(x + 4) = 4 - sqrt(x)", "x + 4 = 16 - 8*sqrt(x) + x", "8*sqrt(x) = 12", "sqrt(x) = 3/2", "x = 3/2"], "invalid");
  });
  test("an equation with no real solution requires the explicit, exactly justified claim", async () => {
    await accepted("sqrt(x - 3) = -2", ["sqrt(x - 3) = -2", "x - 3 = 4", "x = 7", "no solution"]);
    await never("sqrt(x - 3) = -2", ["sqrt(x - 3) = -2", "x - 3 = 4", "x = 7"], "invalid");
    await never("sqrt(x - 3) = 2", ["sqrt(x - 3) = 2", "x - 3 = 4", "x = 7", "no solution"], "invalid");
  });
  test("irrational candidates are decided exactly (no floating point) and the extraneous conjugate root is rejected", async () => {
    await accepted("sqrt(x + 3) = x - 2", ["sqrt(x + 3) = x - 2", "x + 3 = (x - 2)^2", "x^2 - 5x + 1 = 0", "x = (5 + sqrt(21))/2"]);
    await never("sqrt(x + 3) = x - 2", ["sqrt(x + 3) = x - 2", "x + 3 = (x - 2)^2", "x^2 - 5x + 1 = 0", "x = (5 + sqrt(21))/2 or x = (5 - sqrt(21))/2"], "invalid");
  });
  test("sqrt = sqrt keeps the radicand domain: a root that makes a radicand negative is not a solution", async () => {
    await accepted("sqrt(5x - 21) = sqrt(2x - 6)", ["sqrt(5x - 21) = sqrt(2x - 6)", "5x - 21 = 2x - 6", "3x = 15", "x = 5"]);
    await never("sqrt(3x + 8) = sqrt(4x + 11)", ["sqrt(3x + 8) = sqrt(4x + 11)", "3x + 8 = 4x + 11", "x = -3"], "invalid");
    await accepted("sqrt(3x + 8) = sqrt(4x + 11)", ["sqrt(3x + 8) = sqrt(4x + 11)", "3x + 8 = 4x + 11", "x = -3", "no solution"]);
  });
});

describe("E4 rational equations keep their exclusions", () => {
  test("clearing a denominator may not gain an excluded solution", async () => {
    await never("x/(x - 2) = 2/(x - 2)", ["x/(x - 2) = 2/(x - 2)", "x = 2"], "invalid");
    await accepted("x/(x - 2) = 2/(x - 2)", ["x/(x - 2) = 2/(x - 2)", "x = 2", "no solution"]);
    await accepted("3/(x - 2) = 1", ["3/(x - 2) = 1", "3 = x - 2", "x = 5"]);
  });
  test("cancellation keeps x != 3; a lost exclusion is a missing assumption, never a verified solution", async () => {
    await accepted("(x^2 - 9)/(x - 3) = x + 3", ["(x^2 - 9)/(x - 3) = x + 3", "x != 3"]);
    await never("(x^2 - 9)/(x - 3) = x + 3", ["(x^2 - 9)/(x - 3) = x + 3", "x + 3 = x + 3", "this holds for all x"], "missing-assumption");
    await never("(x^2 - 9)/(x - 3) = x + 3", ["(x^2 - 9)/(x - 3) = x + 3", "x = 3"], "invalid");
  });
});

describe("E4 polynomial solution sets: completeness within the supported cases only", () => {
  test("factoring, both branches, quadratic formula with a plus-or-minus", async () => {
    await accepted("x^2 - 5x + 6 = 0", ["x^2 - 5x + 6 = 0", "(x - 2)(x - 3) = 0", "x = 2 or x = 3"]);
    await accepted("x^2 - 2x - 1 = 0", ["x^2 - 2x - 1 = 0", "x = 1 ± sqrt(2)"]);
    await accepted("x^3 - 6x^2 + 11x - 6 = 0", ["x^3 - 6x^2 + 11x - 6 = 0", "(x - 1)(x - 2)(x - 3) = 0", "x = 1 or x = 2 or x = 3"]);
  });
  test("a missing branch is incomplete; an invented root is invalid", async () => {
    await never("x^2 - 5x + 6 = 0", ["x^2 - 5x + 6 = 0", "(x - 2)(x - 3) = 0", "x = 2"], "incomplete");
    await never("x^2 - 2x - 1 = 0", ["x^2 - 2x - 1 = 0", "x = 1 + sqrt(2)"], "incomplete");
    await never("x^2 - 5x + 6 = 0", ["x^2 - 5x + 6 = 0", "x = 2 or x = 3 or x = 4"], "invalid");
    const w = await never("x^2 - 2x - 1 = 0", ["x^2 - 2x - 1 = 0", "x = 1 ± sqrt(3)"]); expect(["invalid", "unsupported"]).toContain(w.classification);
  });
  test("an unsupported higher-degree family abstains instead of claiming completeness", async () => {
    const a = await never("x^3 - 2 = 0", ["x^3 - 2 = 0", "x = 1"]);
    expect(["unsupported", "invalid", "incomplete", "resource-exhausted"]).toContain(a.classification);
    const b = await never("x^5 - x - 1 = 0", ["x^5 - x - 1 = 0", "x = 1"]);
    expect(["unsupported", "resource-exhausted", "invalid"]).toContain(b.classification);
  });
  test("large coefficients within the resource limits are exact", async () => {
    await accepted("x^2 - 1000000007x + 1000000006 = 0", ["x^2 - 1000000007x + 1000000006 = 0", "(x - 1)(x - 1000000006) = 0", "x = 1 or x = 1000000006"]);
  });
});

describe("E4 multivariable algebra: every inference is an exact consequence, symbols keep their scope", () => {
  const system = "2x + y = 7 and x - y = 2";
  test("substitution, elimination and a conjunction answer are accepted", async () => {
    await accepted(system, ["2x + y = 7", "x - y = 2", "x = y + 2", "2(y + 2) + y = 7", "3y + 4 = 7", "3y = 3", "y = 1", "x = 1 + 2", "x = 3", "x = 3 and y = 1"]);
    await accepted(system, ["2x + y = 7", "x - y = 2", "3x = 9", "x = 3", "y = 1"]);
    await accepted(system, ["2x + y = 7", "x - y = 2", "(x, y) = (3, 1)"]);
    await accepted("2a + b = 7 and a - b = 2", ["2a + b = 7", "a - b = 2", "3a = 9", "a = 3", "b = 1"]);
  });
  test("a correct final pair is not accepted when an intermediate line is wrong", async () => {
    await never(system, ["2x + y = 7", "x - y = 2", "3x = 8", "x = 3", "y = 1"], "invalid");
    await never(system, ["2x + y = 7", "x - y = 2", "x = y + 2", "2(y + 2) + y = 8", "y = 1", "x = 3"], "invalid");
    await never(system, ["2x + y = 7", "x - y = 2", "x = y + 3", "x = 3 and y = 1"], "invalid");
  });
  test("one value is not the solution set: a partial conclusion is incomplete, a wrong pair is invalid", async () => {
    await never(system, ["2x + y = 7", "x - y = 2", "3x = 9", "x = 3"], "incomplete");
    await never(system, ["2x + y = 7", "x - y = 2", "x = 3 and y = 2"], "invalid");
  });
  test("inconsistent and dependent systems", async () => {
    await accepted("x + y = 2 and x + y = 3", ["x + y = 2", "x + y = 3", "0 = 1", "no solution"]);
    await never("x + y = 2 and x + y = 3", ["x + y = 2", "x + y = 3", "x = 1 and y = 1"], "invalid");
    await never("x + y = 2 and 2x + 2y = 4", ["x + y = 2", "2x + 2y = 4", "x = 1 and y = 1"], "incomplete");
    await never("x + y = 2 and 2x + 2y = 4", ["x + y = 2", "2x + 2y = 4", "no solution"], "invalid");
    await accepted("x + y = 2 and 2x + 2y = 4", ["x + y = 2", "2x + 2y = 4", "y = 2 - x"]);
  });
  test("a symbol that is not an unknown of the problem is never silently bound", async () => {
    await never(system, ["2x + y = 7", "x - y = 2", "z = 1"]);
    await never(system, ["2x + y = 7", "x - y = 2", "3x = 9", "x = 3 and w = 1"]);
  });
  test("a nonlinear line inside a linear system abstains", async () => {
    const a = await never(system, ["2x + y = 7", "x - y = 2", "x*y = 3", "x = 3 and y = 1"]);
    expect(["unsupported", "invalid"]).toContain(a.classification);
  });
  test("three unknowns", async () => {
    await accepted("a - b - 2c = 1 and -a - 2b = 8 and 2b - c = -6", ["a - b - 2c = 1", "-a - 2b = 8", "2b - c = -6", "-3b - 2c = 9", "2b - c = -6", "c = 0", "b = -3", "a = -2", "a = -2 and b = -3 and c = 0"]);
    await never("a - b - 2c = 1 and -a - 2b = 8 and 2b - c = -6", ["a - b - 2c = 1", "-a - 2b = 8", "2b - c = -6", "-3b - 2c = 9", "c = 0", "b = -3"], "incomplete");
  });
  test("evaluation uses the given values exactly; swapped bindings are caught", async () => {
    await accepted("a^2 - 3b when a = 2 and b = 1", ["a^2 - 3b", "2^2 - 3*1", "4 - 3", "1"]);
    await never("a^2 - 3b when a = 2 and b = 1", ["a^2 - 3b", "1^2 - 3*2", "-5"], "invalid");
    await never("a^2 - 3b when a = 2 and b = 1", ["a^2 - 3b", "2^2 - 3*1", "4 - 3"], "incomplete");
  });
  test("expansion is exact and must be fully expanded", async () => {
    await accepted("Expand (a + 2b)^2", ["(a + 2b)^2", "a^2 + 2*a*(2b) + (2b)^2", "a^2 + 4ab + 4b^2"]);
    await never("Expand (a + 2b)^2", ["(a + 2b)^2", "a^2 + 2ab + 4b^2"], "invalid");
    await never("Expand (a + 2b)^2", ["(a + 2b)^2", "(a + 2b)(a + 2b)"], "incomplete");
    await never("Expand (a + 2b)^2", ["(a + 2b)^2", "a^2 + 4ab + 4b^2 + ab - ab"], "incomplete");
  });
});

describe("E4 attacks: nothing makes the gate certify an invalid or unproven solution", () => {
  test("an invalid intermediate line followed by the correct answer", async () => {
    await never("x^2 - 5x + 6 = 0", ["x^2 - 5x + 6 = 0", "(x - 1)(x - 6) = 0", "x = 2 or x = 3"], "invalid");
    await never("sqrt(x + 5) = x - 1", ["sqrt(x + 5) = x - 1", "x + 5 = x - 1", "x = 4"], "invalid");
  });
  test("an unsupported transformation between two valid lines is not skipped", async () => {
    const a = await never("x^2 - 5x + 6 = 0", ["x^2 - 5x + 6 = 0", "by the cubic resolvent theorem", "x = 2 or x = 3"]);
    expect(["unsupported", "malformed", "incomplete", "ambiguous"]).toContain(a.classification);
  });
  test("a forged dependency note cannot turn an unverified line into a verified one", async () => {
    await never("x^2 - 5x + 6 = 0", ["x^2 - 5x + 6 = 0", "x = 2 or x = 3 (by line 7)"]);
    await never("sqrt(x + 5) = x - 1", ["sqrt(x + 5) = x - 1", "x = 4 because line 2 proved it"]);
  });
  test("unsupported irrational structure abstains", async () => {
    await never("sqrt(x + sqrt(x)) = 2", ["sqrt(x + sqrt(x)) = 2", "x + sqrt(x) = 4", "x = 4"]);
    await never("sqrt(x) + sqrt(x + 1) + sqrt(x + 2) = 5", ["sqrt(x) + sqrt(x + 1) + sqrt(x + 2) = 5", "x = 2"]);
  });
  test("the acceptance gate still downgrades a candidate acceptance the checker cannot confirm", () => {
    expect(reconcileAlgebra("verified", { outcome: "unsupported", completenessAuthority: "checker" } as never).classification).not.toBe("verified");
    expect(reconcileAlgebra("invalid", { outcome: "verified", completenessAuthority: "checker" } as never).classification).not.toBe("verified");
    expect(reconcileAlgebra("incomplete", { outcome: "verified", completenessAuthority: "checker" } as never).classification).toBe("incomplete");
  });
});

describe("E4 independent proof evidence for the new multivariable identities", () => {
  const v = (n: string) => ({ kind: "variable", name: n }) as never;
  const k = (c: string) => ({ kind: "constant", value: c }) as never;
  const sq = { kind: "power", base: { kind: "add", terms: [v("a"), v("b")] }, exponent: 2 } as never;
  const expanded = { kind: "add", terms: [{ kind: "power", base: v("a"), exponent: 2 }, { kind: "multiply", factors: [k("2"), v("a"), v("b")] }, { kind: "power", base: v("b"), exponent: 2 }] } as never;
  const wrong = { kind: "add", terms: [{ kind: "power", base: v("a"), exponent: 2 }, { kind: "power", base: v("b"), exponent: 2 }] } as never;
  const mk = (b: unknown, a: unknown): KernelCertificate => {
    const body = { strategy: "rational-normal-form", sourceCanonical: JSON.stringify(b), targetCanonical: JSON.stringify(a), rules: [] as string[], assumptions: [], restrictions: [] as string[], obligations: [] as string[] };
    return { ...body, replayDigest: createHash("sha256").update(JSON.stringify(body)).digest("hex") } as KernelCertificate;
  };
  test("the U4 kernel verifies a true multivariable identity and refutes a false one", () => {
    expect(certify(sq, expanded).outcome).toBe("verified"); expect(certify(sq, wrong).outcome).not.toBe("verified");
  });
  test("an altered certificate or a certificate for a different claim is rejected", () => {
    expect(checkSymbolicCertificate(mk(sq, expanded), sq, expanded, [], []).outcome).toBe("verified");
    expect(checkSymbolicCertificate({ ...mk(sq, expanded), replayDigest: "0".repeat(64) }, sq, expanded, [], []).outcome).not.toBe("verified");
    expect(checkSymbolicCertificate(mk(sq, expanded), sq, wrong, [], []).outcome).not.toBe("verified");
  });
  test("an accepted system carries a per-line U4 replay digest", async () => {
    const a = await accepted("2x + y = 7 and x - y = 2", ["2x + y = 7", "x - y = 2", "3x = 9", "x = 3", "y = 1"]);
    const ev = gate(a)!.evidence; expect(ev.length).toBe(5); expect(ev.filter((e) => e.digest).length).toBeGreaterThanOrEqual(3);
  });
});

describe("E4 explicit resource bounds: exceed them and the answer is unsupported or resource-exhausted, never approximate", () => {
  test("too many unknowns", async () => {
    const names = ["a", "b", "c", "d", "e", "f", "g"], stmt = names.map((n, i) => `${n} + ${names[(i + 1) % 7]} = ${i}`).join(" and ");
    const a = await never(stmt, [...stmt.split(" and "), "a = 1 and b = 2"]);
    expect(["unsupported", "resource-exhausted", "malformed", "invalid", "incomplete"]).toContain(a.classification);
    const r = checkAlgebraSubmission(stmt, parseNaturalWorking(nat(stmt.split(" and ").join("\n"))));
    expect(["unsupported", "resource-exhausted"]).toContain(r.outcome);
  });
  test("polynomial degree and number size", () => {
    const deg = checkAlgebraSubmission("x^20 - 1 = 0", parseNaturalWorking(nat("x^20 - 1 = 0\nx = 1 or x = -1")));
    expect(["unsupported", "resource-exhausted"]).toContain(deg.outcome);
    const big = "9".repeat(90), r = checkAlgebraSubmission(`x + ${big} = 0`, parseNaturalWorking(nat(`x + ${big} = 0\nx = -${big}`)));
    expect(["unsupported", "resource-exhausted"]).toContain(r.outcome);
    expect(CHECKER_LIMITS.maxDegree).toBe(12);
  });
  test("radical nesting and a third distinct radicand", () => {
    for (const [s, w] of [["sqrt(x + sqrt(x)) = 2", "sqrt(x + sqrt(x)) = 2\nx = 4"], ["sqrt(x) + sqrt(x + 1) + sqrt(x + 2) = 5", "sqrt(x) + sqrt(x + 1) + sqrt(x + 2) = 5\nx = 2"]] as const) {
      const r = checkAlgebraSubmission(s, parseNaturalWorking(nat(w))); expect(["unsupported", "resource-exhausted"]).toContain(r.outcome);
    }
  });
});

describe("E4 candidate elimination policy", () => {
  const stmt = "sqrt(x + 2) = x", lines = ["sqrt(x + 2) = x", "x + 2 = x^2", "x^2 - x - 2 = 0", "x = 2"];
  test("implicit elimination is accepted by default because the exact partition proves the dropped candidate fails the ORIGINAL equation", () => {
    expect(checkAlgebraSubmission(stmt, parseNaturalWorking(nat(lines.join("\n")))).outcome).toBe("verified");
  });
  test("the stricter E3 policy (the student must write the check) is still available and still refuses", () => {
    expect(withCandidateEliminationPolicy("shown", () => checkAlgebraSubmission(stmt, parseNaturalWorking(nat(lines.join("\n")))).outcome)).toBe("incomplete");
  });
  test("an unjustified jump from an infinite set is incomplete under both policies", () => {
    const r = checkAlgebraSubmission("x^2 - 1 > 0", parseNaturalWorking(nat("x^2 - 1 > 0\nx > 5")));
    expect(r.outcome).not.toBe("verified");
  });
});

describe("E4 independent exact-oracle differential fuzz", () => {
  const path = E4 + "fuzz/e4-fuzz-cases.v1.json";
  test.skipIf(!existsSync(path))("the checker agrees with the oracle on every case it decides; abstentions are counted", () => {
    const cases = JSON.parse(read(path)).cases as { kind: string; problem: string; line: string; relation?: string; status?: string }[];
    const map: Record<string, string> = { equal: "equivalent", widening: "widening", narrowing: "narrowing", incomparable: "incomparable" };
    let agree = 0, abstain = 0, conservative = 0; const bad: string[] = [];
    for (const c of cases) {
      const p = parseNaturalWorking(nat(c.line)); if (p.classification !== "parsed") { abstain++; continue; }
      let r; try { r = checkAlgebraSubmission(c.problem, p); } catch { abstain++; continue; }
      const l = r.lines[0]; if (!l || r.outcome === "unsupported" || r.outcome === "resource-exhausted" || l.relation === "unsupported") { abstain++; continue; }
      if (c.kind === "line") { if (l.relation === map[c.relation!]) agree++; else if (l.relation === "independent-false" && c.relation === "equal" && /^[-\d\s.+*/()^=]+$/.test(c.line)) conservative++; else bad.push(`${c.problem} || ${c.line} oracle=${c.relation} checker=${l.relation}`); }
      else { const want = c.status === "implied" ? ["verified-valid"] : ["verified-invalid"]; if (want.includes(l.status)) agree++; else bad.push(`${c.problem} || ${c.line} oracle=${c.status} checker=${l.status}`); }
    }
    expect(bad).toEqual([]); expect(agree + abstain + conservative).toBe(cases.length); expect(conservative).toBeLessThan(cases.length * 0.05); expect(agree / cases.length).toBeGreaterThan(0.55);
  });
});
