// B2: parser-to-P2 integration. The engine reads the task with P2's canonical reader, refuses ambiguous notation, and adopts only definite, replayed P2 verdicts.
import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import { AUTHORITY_VERSION, DERIVATION_CERTIFICATE_VERSION, ambiguousNotation, assessChain, chainVerificationStatus, normalizeTask, replayDerivationChain } from "./derivation-authority.ts";
import { authorizeWorking, workingEvidence } from "./derivation-interface.ts";

const run = async (statement: string, lines: string[]) => (await assessMathematicalWorking({ domain: "algebra", statement } as never, { format: "natural", text: lines.join("\n") } as never)) as any;
const da = (r: any) => r.domainPayload?.derivationAuthority;

describe("Stage 3: P2-supported forms reach P2 through the engine", () => {
  const verified: [string, string, string[]][] = [
    ["linear", "Solve 3(x - 2) = 2x + 5", ["3x - 6 = 2x + 5", "x - 6 = 5", "x = 11"]],
    ["quadratic, factorised", "Solve x^2 - 5x + 6 = 0", ["(x - 2)(x - 3) = 0", "x - 2 = 0 or x - 3 = 0", "x = 2 or x = 3"]],
    ["superscript and unicode minus", "Solve x² − 5x + 6 = 0", ["(x − 2)(x − 3) = 0", "x = 2 or x = 3"]],
    ["rational equation", "Solve 6/(x + 1) = 2", ["6 = 2(x + 1)", "6 = 2x + 2", "4 = 2x", "x = 2"]],
    ["domain restriction discards the excluded root", "Solve x^2/(x - 3) = 9/(x - 3)", ["x^2 = 9", "x = 3 or x = -3", "x = -3"]],
    ["square-root split", "Solve (2x + 1)^2 = 49", ["2x + 1 = 7 or 2x + 1 = -7", "2x = 6 or 2x = -8", "x = 3 or x = -4"]],
    ["inequality with sign flip", "Solve 7 - 3x > 19", ["-3x > 12", "x < -4"]],
    ["inequality: balance then symmetry", "Solve 6/x < 2 for x > 0", ["6 < 2x", "x > 3"]],
    ["substitution under a binding", "Given x = 3, find y where y = 2x^2 - 5", ["y = 2(3)^2 - 5", "y = 18 - 5", "y = 13"]],
    ["rearrangement", "Solve 5 = 2x - 7", ["12 = 2x", "x = 6"]],
    ["rational simplification in lowest terms", "Simplify (x^2 - 9)/(x^2 + 6x + 9) for x ≠ -3", ["(x - 3)(x + 3)/(x + 3)^2", "(x - 3)/(x + 3)"]],
  ];
  for (const [name, s, l] of verified) test(name, async () => {
    const r = await run(s, l);
    expect(r.classification).toBe("verified");
    expect(da(r)?.adopted).toBe(true);
    expect(da(r)?.replay?.ok).toBe(true);
    expect(r.acceptanceGate.level).toBe("p2-derivation-authority");
    expect(r.certification).toBeDefined();
  });
  test("statements the established route reads are not re-judged", async () => {
    const r = await run("2x + 4 = 10", ["2x = 6", "x = 3"]);
    expect(r.classification).toBe("verified");
    expect(da(r)).toBeUndefined();
  });
});

describe("ambiguity fails closed with a structured result (never a mathematical judgement)", () => {
  const cases: [string, string, string[], "statement" | "line"][] = [
    ["1/2x in the task", "Solve 1/2x = 3", ["x = 6"], "statement"],
    ["x/2/4", "Solve 2x = 6", ["x = 6/2/1"], "line"],
    ["unclear fraction grouping", "Solve 2x = 6", ["1/(x+3)(x-2) = 1"], "line"],
    ["exponent scope x^2x", "Solve x^2 = 64", ["x^2x = 64"], "line"],
    ["exponent chain", "Solve x = 2^3^2", ["x = 512"], "statement"],
    ["letter then digit", "Solve 2x = 6", ["x2 = 6"], "line"],
    ["missing operator between numerals", "Solve 2x = 6", ["2 3 = 6"], "line"],
  ];
  for (const [name, s, l] of cases) test(name, async () => {
    const r = await run(s, l);
    expect(r.classification).toBe("ambiguous");
    expect(r.firstInvalidStep).toBeNull();
    expect(r.correct).toBeNull();
  });
  test("the notation rules are shared with P2 (one reader)", () => {
    for (const t of ["1/(x+3)(x-2) = 1", "x^2x = 9", "2^3^2", "x2 = 6", "2 3 = 6"]) expect(ambiguousNotation(t)).toBe(true);
    for (const t of ["(x - 3)(x + 3)/(x + 3)^2", "x^2/(x - 3) = 9/(x - 3)", "2x(x + 3)/(4x)", "x^2(x + 1) = 0", "2 x = 6", "x = -2/3 or x = 5"]) expect(ambiguousNotation(t)).toBe(false);
    const t = normalizeTask("Solve 1/(x+3)(x-2) = 1"); expect(t.ok).toBe(false); expect(!t.ok && t.ambiguous).toBe(true);
  });
  test("mismatched parentheses are malformed, not judged", async () => {
    const r = await run("Solve 2x = 6", ["(2x = 6", "x = 3"]);
    expect(["malformed", "ambiguous"]).toContain(r.classification);
    expect(r.firstInvalidStep).toBeNull();
  });
});

describe("Stage 4: the six outcomes stay distinct", () => {
  test("correct multi-step: verified, final answer correct", async () => {
    const r = await run("Solve 3(x - 2) = 2x + 5", ["3x - 6 = 2x + 5", "x - 6 = 5", "x = 11"]);
    expect(r.classification).toBe("verified"); expect(da(r).finalAnswer.correct).toBe(true); expect(da(r).methodShown).toBe(true);
  });
  test("correct final answer with invalid working: invalid method, final answer recorded as correct separately", async () => {
    const r = await run("Solve 2x + 4 = 10", ["2x = 14", "x = 3"]);
    expect(r.classification).toBe("invalid"); expect(r.firstInvalidStep).toBe(0); expect(da(r).finalAnswer.correct).toBe(true);
  });
  test("valid partial derivation: incomplete, never invalid", async () => {
    const r = await run("Solve 3(x - 2) = 2x + 5", ["3x - 6 = 2x + 5", "x - 6 = 5"]);
    expect(r.classification).toBe("incomplete"); expect(r.correct).toBeNull(); expect(r.firstInvalidStep).toBeNull();
  });
  test("invalid intermediate step: earliest invalid line with a counterexample", async () => {
    const r = await run("Solve 2x + 4 = 10", ["2x = 6", "x = 4"]);
    expect(r.classification).toBe("invalid"); expect(r.firstInvalidStep).toBe(1); expect(r.justification).toMatch(/satisfies/); expect(da(r).finalAnswer.correct).toBe(false);
  });
  test("unsupported but plausible method stays unsupported (not invalid)", async () => {
    const r = await run("Solve x^2 - 5x + 6 = 0", ["x = (5 ± √(25 - 24))/2", "x = 2 or x = 3"]);
    expect(r.classification).toBe("unsupported"); expect(r.firstInvalidStep).toBeNull(); expect(r.correct).toBeNull();
  });
  test("a two-operation jump P2 does not decompose stays unsupported", async () => {
    const r = await run("Solve x/(x - 1) = 2", ["x = 2(x - 1)", "x = 2x - 2", "x = 2"]);
    expect(r.classification).toBe("unsupported"); expect(r.correct).toBeNull();
  });
  test("a bare answer is flagged as no method shown", async () => {
    const r = await run("Solve 2x + 4 = 10", ["x = 3"]);
    expect(da(r)?.methodShown).toBe(false);
  });
});

describe("Stage 5: domain and inequality safeguards at engine level", () => {
  const invalid: [string, string, string[], number][] = [
    ["keeps an excluded value", "Solve x^2/(x - 3) = 9/(x - 3)", ["x^2 = 9", "x = 3 or x = -3"], 1],
    ["lost root after dividing by x", "Solve x^2 = 3x", ["x = 3"], 0],
    ["keeps an extraneous root outside the declared domain", "Solve x^2 = 9 for x > 0", ["x = 3 or x = -3"], 0],
    ["negative multiplier without flipping", "Solve 7 - 3x > 19", ["-3x > 12", "x > -4"], 1],
    ["multiplier of unknown sign (no domain)", "Solve 6/x < 2", ["6 < 2x", "x > 3"], 0],
    ["narrowing an inequality", "Solve 6 < 2x", ["x < 3"], 0],
    ["division by zero in substitution (asserting an undefined value is the first false line)", "Given x = 1, find y where y = 3/(x - 1)", ["y = 3/(1 - 1)", "y = 0"], 0],
  ];
  for (const [name, s, l, at] of invalid) test(name, async () => {
    const r = await run(s, l);
    expect(r.classification).not.toBe("verified");
    if (r.classification === "invalid") expect(r.firstInvalidStep).toBe(at);
  });
  test("clearing a denominator the domain makes nonzero is certified", async () => {
    expect((await run("Solve 3/(x - 1) = 2", ["3 = 2(x - 1)", "3 = 2x - 2", "5 = 2x", "x = 5/2"])).classification).toBe("verified");
  });
  test("the task domain is carried into the result", async () => {
    const r = await run("Solve 6/x < 2 for x > 0", ["6 < 2x", "x > 3"]);
    expect(r.domainRestrictions.join(" ")).toMatch(/x > 0/);
  });
});

describe("Stage 6: certificate compatibility", () => {
  const s = "Solve 3(x - 2) = 2x + 5", l = ["3x - 6 = 2x + 5", "x - 6 = 5", "x = 11"];
  const chain = () => JSON.parse(JSON.stringify(assessChain(s, l).chain));
  test("a current chain replays", () => { expect(chainVerificationStatus(s, l, chain()).status).toBe("replayable-current"); });
  test("a version-2 certificate is never treated as version 3", () => {
    const c = chain(); c[1].version = "openpath-derivation-certificate@2";
    expect(chainVerificationStatus(s, l, c).status).toBe("historical-version-not-replayable");
    expect(replayDerivationChain(s, l, c).ok).toBe(false);
    const d = chain(); d[0].versions.authority = "openpath-derivation-authority@2";
    expect(chainVerificationStatus(s, l, d).status).toBe("historical-version-not-replayable");
    expect(DERIVATION_CERTIFICATE_VERSION).toMatch(/@3$/); expect(AUTHORITY_VERSION).toMatch(/@3$/);
  });
  test("tampered, truncated, cross-task and forged chains fail", () => {
    const t = chain(); t[2].results = ["x = 12"]; expect(chainVerificationStatus(s, l, t).status).toBe("failed-replay");
    expect(chainVerificationStatus(s, l, chain().slice(0, 2)).status).toBe("failed-replay");
    expect(chainVerificationStatus("Solve 3(x - 2) = 2x + 6", l, chain()).status).toBe("failed-replay");
    const f = chain(); f[2].digest = "0".repeat(64); expect(chainVerificationStatus(s, l, f).status).toBe("failed-replay");
  });
  test("the engine adopts a verdict only with a replayed chain and records the certificate digests", async () => {
    const r = await run(s, l);
    expect(r.acceptanceGate.evidence.map((e: any) => e.digest)).toEqual(assessChain(s, l).chain.map((c) => c.digest));
  });
});

describe("Stage 8: learner evidence is unchanged by the engine integration", () => {
  test("the journey's trusted contract still decides method evidence", () => {
    expect(workingEvidence(authorizeWorking("Solve 3(x - 2) = 2x + 5", ["3x - 6 = 2x + 5", "x - 6 = 5", "x = 11"]))).toBe("method-verified");
    expect(workingEvidence(authorizeWorking("Solve 2x + 4 = 10", ["x = 3"]))).toBe("no-method-evidence");
    expect(workingEvidence(authorizeWorking("Solve 2x + 4 = 10", ["2x = 14", "x = 3"]))).toBe("method-false-step");
    expect(workingEvidence(authorizeWorking("Solve 2x = 6", ["x2 = 6"]))).toBe("no-method-evidence");
    expect(workingEvidence(authorizeWorking("Solve x^2 - 5x + 6 = 0", ["x = (5 ± √(25 - 24))/2", "x = 2 or x = 3"]))).toBe("no-method-evidence");
  });
});
