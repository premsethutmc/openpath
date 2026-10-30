import { describe, expect, test } from "bun:test";
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
    expect(g.status).not.toBe("authorized"); expect(workingEvidence(g)).toBe("no-method-evidence");
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

test("closure: an authorized answer-only or jump working is NOT method evidence (P2 solve-conclusion checks the solution set, not the route)", () => {
  const S = "Solve x^2 + 11x + 18 = 0", E = "x^2 + 11x + 18 = 0";
  for (const ls of [["x = \u22129 or x = \u22122"], [E, "x = \u22129 or x = \u22122"]]) {
    const a = authorizeWorking(S, ls);
    expect(a.status).toBe("authorized");
    expect(workingEvidence(a)).toBe("no-method-evidence");
  }
  const full = authorizeWorking(S, [E, "(x + 9)(x + 2) = 0", "x = \u22129 or x = \u22122"]);
  expect(workingEvidence(full)).toBe("method-verified");
  expect(authorizeWorking(S, [E, "(x + 9)(x + 2) = 0", "x = \u22129"]).status).toBe("unsupported");
  expect(authorizeWorking(S, [E, "(x + 3)(x + 6) = 0", "x = \u22123 or x = \u22126"]).status).toBe("unsupported");
});
