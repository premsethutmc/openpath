import { describe, expect, test } from "bun:test";
import { decide } from "./grade";
import { authorizeWorking, workingEvidence } from "./derivation-interface.ts";

describe("derivation-authorization@1: the explicit P2 interface", () => {
  test("a justified, replayable chain is authorized and carries one certificate per line", () => {
    const a = authorizeWorking("3x+5=14", ["3x+5=14", "3x=9", "x=3"]);
    expect(a.status).toBe("authorized"); expect(a.replayed).toBe(true); expect(a.certificates.length).toBe(3);
    expect(workingEvidence(a)).toBe("method-verified");
  });
  test("a false arithmetic step is invalid; a false equation step the authority has no move for is unsupported; neither is method-verified", () => {
    const f = authorizeWorking("37+59", ["37+59 = 95"]);
    expect(f.status).toBe("invalid"); expect(workingEvidence(f)).toBe("method-false-step");
    const g = authorizeWorking("3x+5=14", ["3x+5=14", "3x=8", "x=3"]);
    // M2 (loses-solution@1): x = 3 satisfies 3x + 5 = 14 but not 3x = 8, so the step is now invalid (was unsupported); never method-verified
    expect(g.status).toBe("invalid"); expect(workingEvidence(g)).toBe("method-false-step");
  });
  test("an unrecognized route is unsupported and yields NO method evidence (not verified, not wrong)", () => {
    for (const [s, l] of [["sqrt(x+2)=x", ["sqrt(x+2)=x", "x+2=x^2", "x=2"]], ["3x+5=14", ["x=3 because I checked"]], ["log(xy)", ["log(xy)=log(x)+log(y)"]]] as [string, string[]][]) {
      const a = authorizeWorking(s, l); expect(a.status).not.toBe("authorized"); expect(workingEvidence(a)).not.toBe("method-verified");
    }
  });
  test("true-but-unjustified working (the answer re-expressed through itself) is not authorized", () => {
    expect(workingEvidence(authorizeWorking("77+32", ["77+32 = 77+(109−77)", "77+(109−77) = 109"]))).toBe("no-method-evidence");
  });
  test("empty, malformed or missing input never throws and is not evidence", () => {
    expect(workingEvidence(authorizeWorking("", ["x=1"]))).toBe("no-method-evidence");
    expect(workingEvidence(authorizeWorking("3x+5=14", []))).toBe("no-method-evidence");
    expect(workingEvidence(authorizeWorking("3x+5=14", [undefined as never, "((("]))).toBe("no-method-evidence");
    expect(workingEvidence(null)).toBe("no-method-evidence");
  });
  test("an unverified authorization object cannot be promoted by hand", () => {
    const a = authorizeWorking("3x+5=14", ["x=3 because I checked"]);
    expect(workingEvidence({ ...a, status: "authorized" })).toBe("no-method-evidence");     // not replayed, no certificates
  });
});

test("disputed labels: restatement-only working is unsupported; a factorised quadratic with its roots is authorized (independently checked)", () => {
  expect(authorizeWorking("Compute 52 \u2212 20", ["52 \u2212 20 = (52 \u2212 20)", "(52 \u2212 20) = 32"]).status).toBe("unsupported");
  expect(workingEvidence(authorizeWorking("Compute 82 \u2212 25", ["82 \u2212 25 = (82 \u2212 25)", "(82 \u2212 25) = 57"]))).toBe("no-method-evidence");
  // (x+9)(x+2) = x^2+11x+18 ; (x-4)(x+2) = x^2-2x-8 ; (x-8)(x-9) = x^2-17x+72 (checked by expansion): valid working, roots follow by zero product
  for (const [st, ls] of [["Solve x^2 + 11x + 18 = 0", ["x^2 + 11x + 18 = 0", "(x + 9)(x + 2) = 0", "x = \u22129 or x = \u22122"]], ["Solve x^2 \u2212 2x \u2212 8 = 0", ["x^2 \u2212 2x \u2212 8 = 0", "(x \u2212 4)(x + 2) = 0", "x = 4 or x = \u22122"]], ["Solve x^2 \u2212 17x + 72 = 0", ["x^2 \u2212 17x + 72 = 0", "(x \u2212 8)(x \u2212 9) = 0", "x = 8 or x = 9"]]] as [string, string[]][])
    expect(authorizeWorking(st, ls).status).toBe("authorized");
});

test("Milestone 2: answer versus method (general), zero-product, and invalid versus unsupported", () => {
  const S = "Solve x^2 + 11x + 18 = 0", E = "x^2 + 11x + 18 = 0";
  // a bare answer is certified as an answer claim, never as a method (linear, polynomial, arithmetic)
  for (const [st, ls] of [[S, ["x = \u22129 or x = \u22122"]], ["Solve 2x + 17 = 39", ["x = 11"]], ["Compute 52 \u2212 20", ["32"]], ["Compute 52 \u2212 20", ["52 \u2212 20 = 32"]]] as [string, string[]][]) {
    const a = authorizeWorking(st, ls);
    expect(a.status).toBe("authorized");
    expect(workingEvidence(a)).toBe("no-method-evidence");
  }
  // a jump from the unfactored equation to its roots is refused by P2 now (zero-product@1): the roots are read only off factors
  expect(authorizeWorking(S, [E, "x = \u22129 or x = \u22122"]).status).toBe("unsupported");
  const full = authorizeWorking(S, [E, "(x + 9)(x + 2) = 0", "x = \u22129 or x = \u22122"]);
  expect(full.moves).toEqual(["identity", "side-rewrite", "zero-product"]);
  expect(workingEvidence(full)).toBe("method-verified");
  expect(workingEvidence(authorizeWorking("Solve 2x + 17 = 39", ["2x = 22", "x = 11"]))).toBe("method-verified");
  // loses-solution@1: a line that drops an exact root of the line before is invalid (was unsupported); the counterexample is in the reason
  for (const ls of [[E, "(x + 9)(x + 2) = 0", "x = \u22129"], [E, "(x + 3)(x + 6) = 0", "x = \u22123 or x = \u22126"]]) {
    const a = authorizeWorking(S, ls);
    expect(a.status).toBe("invalid");
    expect(a.reason).toContain("loses-solution");
    expect(workingEvidence(a)).toBe("method-false-step");
  }
  // grader generalization (@3, solution-sets@1): an irrational root is now decided exactly. "x = 1.41" loses the root -sqrt(2) (isolated in a rational
  // interval), so the line is invalid; a claim that rounds EVERY root is an approximation (a marking decision): unsupported, never invalid
  expect(authorizeWorking("Solve x^2 \u2212 2 = 0", ["x^2 \u2212 2 = 0", "x = 1.41"]).status).toBe("invalid");
  expect(authorizeWorking("Solve x^2 \u2212 2 = 0", ["x^2 \u2212 2 = 0", "x = 1.41 or x = \u22121.41"]).status).toBe("unsupported");
});

test("Milestone 2: production grading never records a verified derivation from an answer", () => {
  const a = decide("gen:lin:2,17,11", "11", ["x = 11"]);
  expect(a.evidence.derivationVerified).toBe(false);
});
