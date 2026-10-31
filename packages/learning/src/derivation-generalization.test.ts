/**
 * Grader generalization (@3): general, replayable rules with examples of valid, invalid and unsupported working for every newly supported family,
 * the exact solution-set engine (solution-sets@1), domain handling, and the structured working evidence (openpath-working-evidence@1).
 */
import { describe, expect, test } from "bun:test";
import { assessChain, replayDerivationChain, normalizeTask, ambiguousNotation, AUTHORITY_VERSION } from "./derivation-authority.ts";
import { compareStatements, fullDomain, provablyNonzero, provableSign, rationalSolutionSet, approximatesAllRoots } from "./solution-sets.ts";
import { parseTree } from "./rewrite-registry.ts";

const st = (s: string) => { const m = /(<=|>=|<|>|=)/.exec(s)!; return { left: parseTree(s.slice(0, m.index))!, rel: m[1] as "=", right: parseTree(s.slice(m.index + m[1].length))! }; };
const D = fullDomain("x");
const verified = (t: string, ls: string[]) => { const v = assessChain(t, ls); expect(v.status).toBe("verified"); expect(replayDerivationChain(t, ls, v.chain).ok).toBe(true); return v; };
const status = (t: string, ls: string[]) => assessChain(t, ls).status;

describe("solution-sets@1: exact real solution sets", () => {
  test("relations, with exact or isolated counterexamples", () => {
    expect(compareStatements(st("2*x+3=7"), st("2*x=4"), D)!.relation).toBe("equivalent");
    expect(compareStatements(st("x^2=6*x"), st("x=6"), D)!.lost).toEqual({ kind: "exact", value: "0" });
    expect(compareStatements(st("x-3=0"), st("x^2-9=0"), D)!.relation).toBe("implies");
    expect(compareStatements(st("x^2=2"), st("x=1"), D)!.lost!.kind).toBe("between");          // -sqrt(2), isolated by Sturm
    expect(compareStatements(st("(x-1)*(x^2+1)=0"), st("x-1=0"), D)!.relation).toBe("equivalent");   // the other factor has no real root
    expect(compareStatements(st("-2*x>4"), st("x<-2"), D)!.relation).toBe("equivalent");
    expect(compareStatements(st("-2*x>4"), st("x>-2"), D)!.relation).toBe("neither");
    expect(compareStatements(st("x^2<4"), st("x<2"), D)!.relation).toBe("implies");
  });
  test("domains: excluded points, intervals, and points where a line is undefined count as false", () => {
    expect(compareStatements(st("x*(x-3)=0"), st("x=0"), { ...D, excluded: [{ n: 3n, d: 1n }] })!.relation).toBe("equivalent");
    expect(compareStatements(st("x^2=4"), st("x=2"), { ...D, lower: { at: { n: 0n, d: 1n }, strict: true } })!.relation).toBe("equivalent");
    expect(compareStatements(st("x^2=x"), st("x^2/x=x/x"), D)!.lost).toEqual({ kind: "exact", value: "0" });   // dividing by x loses x = 0
    expect(rationalSolutionSet(st("x^2-5*x+6=0"), D)!.map((q) => q.n)).toEqual([2n, 3n]);
  });
  test("provably nonzero and provable sign", () => {
    expect(provablyNonzero(parseTree("x^2+1")!, D)).toBe(true);
    expect(provablyNonzero(parseTree("x-2")!, D)).toBe(false);
    expect(provableSign(parseTree("-x^2-3")!, D)).toBe(-1);
    expect(provableSign(parseTree("x")!, D)).toBe(0);
  });
  test("approximations: roundings of every irrational root, never of an exact one", () => {
    expect(approximatesAllRoots(st("x^2-2=0"), D, [{ n: 141n, d: 100n }, { n: -141n, d: 100n }])).toBe(true);
    expect(approximatesAllRoots(st("x^2-2=0"), D, [{ n: 141n, d: 100n }])).toBe(false);
    expect(approximatesAllRoots(st("x^2-4=0"), D, [{ n: 2n, d: 1n }, { n: -2n, d: 1n }])).toBe(false);
  });
});

describe("general equation moves (one operation per line, any visible term / factor / denominator)", () => {
  test("addition and subtraction on both sides, including variable terms and whole sides", () => {
    verified("Solve 2x + 3 = x + 7", ["x + 3 = 7", "x = 4"]);
    verified("Solve 5x - 2 = 3x + 10", ["2x - 2 = 10", "2x = 12", "x = 6"]);
    verified("Solve x^2 = 9", ["x^2 - 9 = 0", "(x - 3)(x + 3) = 0", "x = 3 or x = -3"]);
    expect(status("Solve 2x + 3 = x + 7", ["x + 3 = 10", "x = 7"])).toBe("invalid");
    expect(status("Solve 2x + 3 = x + 7", ["x + 3 = 7 and x = 4"])).toBe("unsupported");
  });
  test("multiplication and division by provably nonzero numbers and expressions", () => {
    verified("Solve 3(x + 2) = 18", ["x + 2 = 6", "x = 4"]);
    verified("Solve x/3 + 15 = 20", ["x + 45 = 60", "x = 15"]);
    verified("Solve (x + 1)/(x - 3) = 2", ["x + 1 = 2(x - 3)", "x + 1 = 2x - 6", "7 = x - 0", "x = 7"].slice(0, 2));
    // dividing by an expression that may be zero is refused; when it loses a root it is invalid
    expect(status("Solve x^2 = 6x", ["x = 6"])).toBe("invalid");
    expect(status("Solve x^2 = 4x, x ≠ 0", ["x = 4"])).toBe("verified");
  });
  test("multiple legitimate solution paths for the same equation", () => {
    for (const ls of [["2x + 2 = 10", "2x = 8", "x = 4"], ["x + 1 = 5", "x = 4"]]) verified("Solve 2(x + 1) = 10", ls);
  });
  test("factorization and zero-product reading; branches solved on their own", () => {
    verified("Solve x^2 - 4x - 21 = 0", ["(x - 7)(x + 3) = 0", "x - 7 = 0 or x + 3 = 0", "x = 7 or x = -3"]);
    verified("Solve (x - 4)^2 = 9", ["x - 4 = 3 or x - 4 = -3", "x = 7 or x = 1"]);
    expect(status("Solve x^2 - 4x - 21 = 0", ["(x - 7)(x + 3) = 0", "x - 7 = 0 or x + 3 = 0", "x = 7 or x = 3"])).toBe("invalid");
    expect(status("Solve x^2 - 4x - 21 = 0", ["x = 7 or x = -3"].concat([]))).toBe("verified");   // a bare first-line answer claim
    expect(status("Solve x^2 - 4x - 21 = 0", ["x^2 - 4x = 21", "x = 7 or x = -3"])).toBe("unsupported");   // solve-jump: roots not visible
  });
});

describe("implication-only steps and candidate checking", () => {
  test("squaring both sides is an implication; candidates must be checked against the task", () => {
    const v = assessChain("Solve x - 4 = 2", ["(x - 4)^2 = 4", "x^2 - 8x + 12 = 0", "(x - 2)(x - 6) = 0", "x = 2 or x = 6", "x = 6"]);
    expect(v.evidence.transitions[0].status).toBe("certified-implication");
    expect(v.evidence.transitions[4].status).toBe("certified-candidate-check");
    expect(v.status).toBe("verified");
    expect(status("Solve x - 4 = 2", ["(x - 4)^2 = 4", "x^2 - 8x + 12 = 0", "(x - 2)(x - 6) = 0", "x = 2 or x = 6"])).toBe("invalid");   // keeps the extraneous 2
  });
  test("rational equations: the task's denominators are nonzero; excluded candidates are discarded", () => {
    verified("Solve x^2/(x - 2) = 4/(x - 2)", ["x^2 = 4", "x^2 - 4 = 0", "(x - 2)(x + 2) = 0", "x = 2 or x = -2", "x = -2"]);
    expect(status("Solve x/(x - 1) = 1/(x - 1)", ["x = 1"])).toBe("invalid");           // the only candidate is excluded
  });
});

describe("inequalities", () => {
  test("flips for negative multipliers, refusal for unknown signs, equivalence required", () => {
    verified("Solve -2x > 4", ["x < -2"]);
    verified("Solve 2x - 3 > 7", ["2x > 10", "x > 5"]);
    expect(status("Solve -2x > 4", ["x > -2"])).toBe("invalid");
    expect(status("Solve 6/x > 2", ["6 > 2x", "x < 3"])).toBe("invalid");             // multiplying by x of unknown sign widens the set
    expect(assessChain("Solve x^2 < 25", ["x < 5"]).evidence.transitions[0].status).toBe("invalid");
  });
});

describe("substitution under established equalities; task-statement normalization", () => {
  test("bindings and definitions", () => {
    verified("Evaluate 5x^2 - 7x + 5 when x = 4", ["5(4)^2 - 7(4) + 5", "80 - 28 + 5", "57"]);
    verified("Given x = -6, find y where y = 5x + 10", ["y = 5(-6) + 10", "y = -30 + 10", "y = -20"]);
    verified("Given a = 9 and b = 5, evaluate 6a + 9b", ["6(9) + 9(5)", "54 + 45", "99"]);
    expect(status("Evaluate 5x^2 - 7x + 5 when x = 4", ["5(4)^2 - 7(4) + 5", "80 - 28 + 5", "47"])).toBe("invalid");
    expect(status("Evaluate x^2 - 6x + 9 when x = 3.5", ["(3.5 - 3)^2", "0.25"])).not.toBe("invalid");   // substitution combined with factorisation: a jump, not an error
  });
  test("verbs, brackets, superscripts and conjunctive conditions", () => {
    for (const s of ["Solve for x: 9x + 20 = 74", "Find x: 5x + 2 = 17", "Expand and simplify 6[x − 4] + 5", "Work out 24² − 15²", "Simplify (x^2−400)/(x−20) for x ≠ 20 and x ≠ −20", "Solve 2x - 3 > 7"]) expect(normalizeTask(s).ok).toBe(true);
    expect(normalizeTask("Simplify x/x for x ≠ 0").ok && normalizeTask("Simplify x/x").ok).toBe(true);
  });
  test("ambiguous notation is never read", () => {
    for (const t of ["1/2x = 4", "x/2/4 = 1", "x = 9^1/2", "1/2(x + 4) = 6"]) expect(ambiguousNotation(t)).toBe(true);
    for (const t of ["x/3 + 15 = 20", "9/5*3/10", "x^2/x = 4x/x", "x = -2/3 or x = 5", "(x + 1)/(x - 3) = 2"]) expect(ambiguousNotation(t)).toBe(false);
    expect(status("Solve 1/2x = 4", ["x = 8"])).toBe("unsupported");
  });
});

describe("structured working evidence (openpath-working-evidence@1)", () => {
  test("first invalid step: later lines that follow from the error are not labelled invalid", () => {
    const v = assessChain("Solve 2x + 3 = 7", ["2x = 10", "x = 5"]);
    expect(v.evidence.firstInvalid).toBe(0);
    expect(v.evidence.transitions[1].status).not.toBe("invalid");
    expect(v.evidence.transitions[1].relation).toBe("equivalent");
    expect(v.evidence.finalAnswer).toMatchObject({ present: true, correct: false });
  });
  test("a correct final answer reached through an invalid step is still invalid working", () => {
    const v = assessChain("Solve 2x + 4 = 10", ["2x = 14", "x = 3"]);
    expect(v.status).toBe("invalid"); expect(v.evidence.finalAnswer.correct).toBe(true); expect(v.evidence.firstInvalid).toBe(0);
  });
  test("partial working: certified progress, incomplete, no score", () => {
    const v = assessChain("Solve x^2 - 5x + 6 = 0", ["(x - 2)(x - 3) = 0"]);
    expect(v.evidence.completeness).toBe("incomplete");
    expect(v.evidence.method).toBe("certified");
    expect(v.evidence.progress.length).toBe(1);
    expect(v.evidence.finalAnswer.present).toBe(false);
    expect(Object.keys(v.evidence)).not.toContain("score");
  });
  test("unsupported is never reported as invalid; invalid is never reported as unsupported when refuted", () => {
    expect(status("Solve x^2 - 2 = 0", ["x^2 - 2 = 0", "x = 1.41 or x = -1.41"])).toBe("unsupported");     // approximation: a marking decision
    expect(status("Solve x^2 - 2 = 0", ["x = 1.41"])).toBe("invalid");                                     // loses -sqrt(2)
  });
  test("versions", () => { expect(AUTHORITY_VERSION).toBe("openpath-derivation-authority@3"); expect(assessChain("Solve x = 1", ["x = 1"]).evidence.contract).toBe("openpath-working-evidence@1"); });
});
