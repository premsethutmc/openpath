import { describe, expect, test } from "bun:test";
import { assessChain, replayDerivationChain, normalizeTask, checkSymbolicStep, covered, DerivationSession } from "./derivation-authority.ts";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import type { Expr } from "./calculus-core";

const A = (t: string, ls: string[]) => assessChain(t, ls);
const E = async (domain: "arithmetic" | "algebra", statement: string, lines: string[]) => (await assessMathematicalWorking({ domain, statement } as never, { format: "natural", text: lines.join("\n") })).classification;
const V = (name: string): Expr => ({ kind: "variable", name } as Expr), C = (value: string): Expr => ({ kind: "constant", value } as Expr);
const sqrtOf = (e: Expr): Expr => ({ kind: "root", radicand: e, index: 2 } as unknown as Expr), sq = (e: Expr): Expr => ({ kind: "power", base: e, exponent: 2 } as Expr);

describe("two independent judgments: validity and authorization", () => {
  test("a false claim is invalid, a true unjustified claim is unsupported, a justified one is verified", () => {
    expect(A("Compute 37+59", ["37+59 = 97"]).status).toBe("invalid");
    expect(A("Compute 37+59", ["37+59 = 95+1"]).status).toBe("unsupported");
    expect(A("Compute 37+59", ["37+59 = 96*1"]).status).toBe("unsupported");
    expect(A("Compute 37+59", ["37+59 = 96"]).status).toBe("verified");
  });
  test("a false later line is invalid even when an earlier line is merely unauthorized", () => {
    const v = A("Compute 37+59", ["37+59 = 95+1", "95+1 = 97"]); expect([v.status, v.at]).toEqual(["invalid", 1]);
  });
  test("round-number transformations are certified (98 = 100 - 2, 7 x 98 = 7 x (100 - 2)); pedagogy never changes validity", () => {
    expect(A("Compute 98", ["98 = 100-2"]).status).toBe("verified");
    expect(A("Compute 7×98", ["7×98 = 7×(100-2)", "7×(100-2) = 7×100-7×2", "7×100-7×2 = 700-14", "700-14 = 686"]).status).toBe("verified");
    expect(A("Compute 7×98", ["7×98 = 7×(97+1)"]).status).toBe("unsupported");     // true, but 97 is not anchored to anything visible
  });
  test("new general rules: unevaluated distribution, fraction product/quotient, evaluation inside powers and quotients, grouped factors", () => {
    for (const [t, ls] of [["Compute 5×(2+9)", ["5×(2+9) = 5×2+5×9", "5×2+5×9 = 10+45", "10+45 = 55"]], ["Compute (90+3)÷3", ["(90+3)÷3 = 90÷3+3÷3", "90÷3+3÷3 = 30+1", "30+1 = 31"]], ["Compute (2/3)×(3/5)", ["(2/3)×(3/5) = (2×3)/(3×5)", "(2×3)/(3×5) = 6/15", "6/15 = 2/5"]], ["Compute (11-6)^2", ["(11-6)^2 = 5^2", "5^2 = 25"]], ["Compute 25×4×9", ["25×4×9 = 100×9", "100×9 = 900"]], ["Compute (1/2)÷(3/4)", ["(1/2)÷(3/4) = (1/2)×(4/3)", "(1/2)×(4/3) = 4/6", "4/6 = 2/3"]]] as [string, string[]][]) expect([t, A(t, ls).status]).toEqual([t, "verified"]);
  });
  test("a cyclic pad cannot establish anything", () => { expect(A("Compute 7", ["7 = 3+4", "3+4 = 7-4+4"]).status).not.toBe("verified"); });
});

describe("fail-closed: no 'not applicable', no fallback", () => {
  test("an unparseable task refuses every line", () => { const v = A("a thing happened", ["1+1 = 2"]); expect(v.status).toBe("unsupported"); expect(v.reason).toBe("task-unparsed"); });
  test("an unparseable line is refused, not skipped", () => { expect(A("Compute 37+59", ["37 + 59 equals ninety six"]).status).toBe("unsupported"); });
  test("a source that is not visible is refused", () => { expect(A("Compute 37+59", ["41+55 = 96"]).reason).toBe("source-not-visible"); });
  test("a refused line is not added to the chain: later lines cannot depend on it", () => { const s = new DerivationSession("Compute 37+59"); expect(s.append("37+59 = 95+1").authorized).toBe(false); expect(s.append("95+1 = 96").authorized).toBe(false); expect(s.chain.length).toBe(0); });
  test("engine routes agree: arithmetic and algebra statements give the same verdict for the same working", async () => {
    for (const [ls, want] of [[["37+59 = 95+1", "95+1 = 96"], "unsupported"], [["37+59 = 96*1"], "incomplete"], [["37+59 = 96"], "verified"], [["37+59 = (30+50)+(7+9)", "(30+50)+(7+9) = 80+16", "80+16 = 96"], "verified"]] as [string[], string][])
      expect([ls[0], await E("arithmetic", "37+59", ls), await E("algebra", "37+59", ls)]).toEqual([ls[0], want, want]);
  });
  test("symbolic and equation lines are protected too (the symbolic bypass of 32c7f2c)", async () => {
    for (const ls of [["2x+6 = 12", "2x+6 = 3+13+(12-12)", "2x = 6", "x = 3"], ["2x+6 = 12", "2x*1+6 = 12", "2x = 6", "x = 3"], ["2x+6 = 12", "2x = 12-6", "x = 8-6/2", "x = 3"]]) expect([ls[1], await E("algebra", "2x+6=12", ls)]).not.toEqual([ls[1], "verified"]);
    expect(await E("algebra", "2x+6=12", ["2x+6 = 12", "2x = 12-6", "2x = 6", "x = 6/2", "x = 3"])).toBe("verified");
  });
});

describe("assumption and domain tracking", () => {
  test("division by zero: x/x = 1 needs x != 0; the condition is carried, never invented", () => {
    expect(A("Simplify x/x", ["x/x = 1"]).status).toBe("unsupported");
    expect(A("Simplify x/x", ["x/x = 1"]).reason).toMatch(/^missing-assumption/);
    expect(A("Simplify x/x for x ≠ 0", ["x/x = 1"]).status).toBe("verified");
  });
  test("rational cancellation needs the exact excluded value", () => {
    expect(A("Simplify (x^2-9)/(x-3)", ["(x^2-9)/(x-3) = x+3"]).status).toBe("unsupported");
    expect(A("Simplify (x^2-9)/(x-3) for x ≠ 3", ["(x^2-9)/(x-3) = x+3"]).status).toBe("verified");
    expect(A("Simplify (x^2-9)/(x-3) for x ≠ 4", ["(x^2-9)/(x-3) = x+3"]).status).toBe("unsupported");   // a different exclusion does not cover it
  });
  test("square roots and logarithms (kernel level): the sign / positivity assumption must be declared", () => {
    const x = V("x"), y = V("y");
    expect(checkSymbolicStep(sqrtOf(sq(x)), x, []).ok).toBe(false);
    expect(checkSymbolicStep(sqrtOf(sq(x)), x, [{ kind: "nonnegative", expression: x }]).ok).toBe(true);
    const logxy = { kind: "log", argument: { kind: "multiply", factors: [x, y] } } as unknown as Expr, sum = { kind: "add", terms: [{ kind: "log", argument: x }, { kind: "log", argument: y }] } as unknown as Expr;
    expect(checkSymbolicStep(logxy, sum, []).ok).toBe(false);
    expect(checkSymbolicStep(logxy, sum, [{ kind: "positive", expression: x }]).ok).toBe(false);
    expect(checkSymbolicStep(logxy, sum, [{ kind: "positive", expression: x }, { kind: "positive", expression: y }]).ok).toBe(true);
  });
  test("a stronger declared assumption covers a weaker need (positive covers nonzero), never the reverse", () => {
    const x = V("x"); expect(covered({ kind: "nonzero", expression: x }, [{ kind: "positive", expression: x }])).toBe(true); expect(covered({ kind: "positive", expression: x }, [{ kind: "nonzero", expression: x }])).toBe(false);
  });
  test("the task digest includes its conditions", () => { const a = normalizeTask("Simplify x/x for x ≠ 0"), b = normalizeTask("Simplify x/x"); expect(a.ok && b.ok && a.task.digest !== b.task.digest).toBe(true); });
});

describe("context-bound certificates and independent replay", () => {
  const T = "Compute 7×98", L = ["7×98 = 7×(100-2)", "7×(100-2) = 7×100-7×2", "7×100-7×2 = 700-14", "700-14 = 686"];
  const v = A(T, L);
  test("replay succeeds in the original task context", () => { expect(replayDerivationChain(T, L, v.chain).ok).toBe(true); });
  test("a certificate chain cannot be replayed in a different task", () => { expect(replayDerivationChain("Compute 7×99", L, v.chain).ok).toBe(false); expect(replayDerivationChain("Compute 7×98 for x ≠ 0", L, v.chain).ok).toBe(false); });
  test("a different condition set is a different task context", () => { const c = A("Simplify x/x for x ≠ 0", ["x/x = 1"]); expect(replayDerivationChain("Simplify x/x for x ≠ 0", ["x/x = 1"], c.chain).ok).toBe(true); expect(replayDerivationChain("Simplify x/x", ["x/x = 1"], c.chain).ok).toBe(false); });
  test("tampering, reordering, duplication and dropped dependencies are rejected", () => {
    const ch = v.chain.map((c) => structuredClone(c));
    expect(replayDerivationChain(T, L, [ch[1], ch[0], ch[2], ch[3]]).ok).toBe(false);
    expect(replayDerivationChain(T, L, [ch[0], ch[0], ch[2], ch[3]]).ok).toBe(false);
    const forged = structuredClone(ch); forged[2].results = ["999"]; expect(replayDerivationChain(T, L, forged).ok).toBe(false);
    const noDep = structuredClone(ch); noDep[1].dependencies = []; expect(replayDerivationChain(T, L, noDep).ok).toBe(false);
    expect(replayDerivationChain(T, L.slice(0, 3), v.chain).ok).toBe(false);
  });
  test("a certificate is for its own working: replaying other lines fails", () => { expect(replayDerivationChain(T, ["7×98 = 7×(100-2)", "7×(100-2) = 700-14", "700-14 = 686", "686 = 686"], v.chain).ok).toBe(false); });
  test("versions are part of the certificate", () => { const c = structuredClone(v.chain); c[0].versions.registry = "openpath-rewrite-registry@1"; expect(replayDerivationChain(T, L, c).ok).toBe(false); });
  test("every authorized line carries registry and kernel evidence", () => { for (const c of v.chain) { expect(c.versions.kernel).toBeTruthy(); expect(c.parts.every((p) => p.rewrite || p.kernel || ["identity", "representation"].includes(p.rule))).toBe(true); } });
});

describe("performance", () => { test("a 6-line chain authorizes and replays in well under a second", () => { const t0 = performance.now(); const x = A("Compute 7×98", ["7×98 = 7×(100-2)", "7×(100-2) = 7×100-7×2", "7×100-7×2 = 700-14", "700-14 = 686"]); replayDerivationChain("Compute 7×98", ["7×98 = 7×(100-2)", "7×(100-2) = 7×100-7×2", "7×100-7×2 = 700-14", "700-14 = 686"], x.chain); expect(performance.now() - t0).toBeLessThan(1000); }); });

describe("regressions found by the independent held-out corpus (kept as tests)", () => {
  test("circular re-expression of the answer is unsupported: 77+32 = 77+(109-77)", () => {
    expect(A("Compute 77+32", ["77+32 = 77+(109−77)", "77+(109−77) = 109"]).status).toBe("unsupported");
    expect(A("Compute 3−9", ["3−9 = 3−3−6", "3−3−6 = 0−6", "0−6 = −6"]).status).toBe("verified");        // a real partition of the source that cancels a sibling is legitimate
  });
  test("words and function names are not products of letters (log(xy) must not parse as l*o*g*x*y)", () => {
    expect(A("Simplify log(xy) for x > 0 and y > 0", ["log(xy)=log(x)+log(y)"]).status).toBe("unsupported");
    expect(A("Simplify log(xy)", ["log(xy)=log(x)+log(y)"]).reason).toBe("task-unparsed");
  });
  test("fraction products written with and without brackets, evaluated inside or out, and the rule of signs", () => {
    for (const [t, ls] of [["9/5*3/10", ["9/5*3/10 = (9*3)/(5*10)", "(9*3)/(5*10) = 27/50"]], ["9/5*3/10", ["(9/5)*(3/10) = (9*3)/(5*10)", "(9*3)/(5*10) = 27/50"]], ["(15/2)/(5/15)", ["(15/2)/(5/15) = 15/2×15/5", "15/2×15/5 = 225/10", "225/10 = 45/2"]], ["(-24)×21", ["(-24)×21 = -(24×21)", "-(24×21) = -504"]], ["(-9)×(-11)", ["(-9)×(-11) = 9×11", "9×11 = 99"]], ["14×5", ["14×5 = 10×5+4×5", "10×5+4×5 = 50+20", "50+20 = 70"]], ["6×999", ["6×999 = 6×(1000−1)", "6×(1000−1) = 6×1000−6×1", "6×1000−6×1 = 6000−6", "6000−6 = 5994"]]] as [string, string[]][]) expect([t, A(t, ls).status]).toEqual([t, "verified"]);
  });
  test("an arbitrary numerator split of an answer is not determined (5/9 = 1/9 + 4/9) but the unit decomposition is", () => {
    expect(A("Compute 3/9+2/9", ["3/9+2/9 = 5/9", "5/9 = 1/9+4/9", "1/9+4/9 = 5/9"]).status).toBe("unsupported");
    expect(A("Compute 3/4", ["3/4 = 1/4+1/4+1/4"]).status).toBe("verified");
  });
  test("an unauthorized line cannot be bypassed by a later line that restates the task (no dead-branch laundering)", async () => {
    expect(await E("arithmetic", "Compute 9×8", ["9×8 = 72", "72 = 8×9", "8×9 = 72"])).not.toBe("verified");
  });
  test("collected unit coefficients and moved monomials in equations", () => {
    expect(A("3x+3=2x+8", ["3x+3=2x+8", "3x-2x+3=8", "1x+3=8", "1x=5", "x=5"]).status).toBe("verified");
    expect(A("x+14=26", ["x+0=12", "x=12"]).status).toBe("verified");
    expect(A("x+14=26", ["x+14=26", "x=26-14-0*7"]).status).not.toBe("verified");
  });
});
