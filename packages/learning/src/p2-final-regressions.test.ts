/** P2-FINAL permanent regressions. Each defect found by the independent corpora is checked on EVERY exposed route, not only the authority API:
 *  engine arithmetic domain, engine algebra domain, list-of-lines working, natural text working, and the authority/replay API. */
import { afterAll, describe, expect, test } from "bun:test";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import { assessChain, DerivationSession, replayDerivationChain, type DerivationCertificate } from "./derivation-authority.ts";
import { sha256Hex } from "./digest.ts";
import { stopGeometryWorkers } from "./geometry-worker.ts";
afterAll(() => stopGeometryWorkers());

type Route = { name: string; run: (statement: string, lines: string[]) => Promise<string> };
const eng = (domain: string, as: "natural" | "list"): Route => ({
  name: `engine ${domain}/${as}`,
  run: async (statement, lines) => (await assessMathematicalWorking({ domain, statement } as never, (as === "natural" ? { format: "natural", text: lines.join("\n") } : lines) as never)).classification,
});
const ROUTES: Route[] = [eng("arithmetic", "natural"), eng("arithmetic", "list"), eng("algebra", "natural"), eng("algebra", "list"),
  { name: "authority", run: async (s, l) => assessChain(s, l).status }];
const everywhere = (title: string, statement: string, lines: string[], accept: (v: string) => boolean = (v) => v !== "verified") => {
  for (const r of ROUTES) test(`${title} [${r.name}]`, async () => expect(accept(await r.run(statement, lines))).toBe(true));
};

describe("defect 1: circular evidence (the answer re-expressed through itself) is never a derivation", () => {
  everywhere("77+32 = 77+(109−77)", "Compute 77+32", ["77+32 = 77+(109−77)", "77+(109−77) = 109"]);
  everywhere("answer used to rewrite a as S−b", "Evaluate 18 + 86", ["18 + 86 = (104 − 86) + 86", "(104 − 86) + 86 = 104"]);
  everywhere("difference rebuilt from its answer", "Compute 29 − 28", ["29 − 28 = 29 − (29 − 1)", "29 − (29 − 1) = 1"]);
  everywhere("three-term sum rebuilt from its answer", "Compute 58 + 70 + 64", ["58 + 70 + 64 = 58 + 70 + (192 − 58 − 70)", "58 + 70 + (192 − 58 − 70) = 192"]);
  everywhere("arbitrary non-place-value split", "Calculate 58 + 91", ["58 + 91 = 58 + (69 + 22)", "58 + (69 + 22) = 149"]);
  test("a genuine partition and a round-target compensation are still authorized", () => {
    expect(assessChain("Compute 3−9", ["3−9 = 3−3−6", "3−3−6 = 0−6", "0−6 = −6"]).status).toBe("verified");
    expect(assessChain("Compute 37 + 22", ["37 + 22 = (37 + 3) + (22 − 3)", "(37 + 3) + (22 − 3) = 40 + 19", "40 + 19 = 59"]).status).toBe("verified");
  });
});

describe("defect 2: words and function names are not products of letters (log(xy) is not l·o·g·x·y)", () => {
  everywhere("log(xy) = log x + log y", "Simplify log(xy)", ["log(xy)=log(x)+log(y)"]);
  everywhere("log(xy) with conditions", "Simplify log(xy) for x > 0 and y > 0", ["log(xy)=log(x)+log(y)"]);
  everywhere("a false log identity", "Simplify log(xy)", ["log(xy)=log(x)log(y)"]);
  everywhere("ln(xy) is not l·n·x·y", "Simplify ln(xy)", ["ln(xy)=ln(x)+ln(y)"]);
  everywhere("a phrase is not a product", "Compute a thing happened", ["a thing happened = 5"]);
});

describe("defect 3: no dead-branch laundering (a refused line keeps its numerals free and the line before it)", () => {
  everywhere("9×8 = 72; 72 = 8×9; 8×9 = 72", "Compute 9×8", ["9×8 = 72", "72 = 8×9", "8×9 = 72"]);
  test("the refused middle line is not authorized and the line that rests on it is not either", () => {
    const s = new DerivationSession("Compute 9×8");
    expect(s.append("9×8 = 72").authorized).toBe(true);
    const mid = s.append("72 = 8×9"); const last = s.append("8×9 = 72");
    expect(mid.authorized && last.authorized).toBe(false);
  });
});

describe("defect 4: a certificate belongs to ONE task", () => {
  const chain = assessChain("Compute 77+32", ["77+32 = 70+7+30+2", "70+7+30+2 = (70+30)+(7+2)", "(70+30)+(7+2) = 109"]);
  test("the source chain verifies and replays under its own task", () => {
    expect(chain.status).toBe("verified");
    expect(replayDerivationChain("Compute 77+32", ["77+32 = 70+7+30+2", "70+7+30+2 = (70+30)+(7+2)", "(70+30)+(7+2) = 109"], chain.chain).ok).toBe(true);
  });
  for (const other of ["Compute 77+33", "Compute 77+23", "Compute 32+77+1", "Compute 78+32", "Evaluate 77 − 32"])
    test(`replay under "${other}" is refused`, () => expect(replayDerivationChain(other, ["77+32 = 70+7+30+2", "70+7+30+2 = (70+30)+(7+2)", "(70+30)+(7+2) = 109"], chain.chain).ok).toBe(false));
  for (const other of ["Compute 77+33", "Compute 78+32"])
    everywhere(`the same lines under "${other}" are never verified by any route`, other, ["77+32 = 70+7+30+2", "70+7+30+2 = (70+30)+(7+2)", "(70+30)+(7+2) = 109"]);
});

describe("defect 5: domain conditions are carried, never silently lost", () => {
  test("x/x = 1 needs x ≠ 0; a different exclusion does not cover it", () => {
    expect(assessChain("Simplify x/x", ["x/x = 1"]).status).not.toBe("verified");
    expect(assessChain("Simplify x/x for x ≠ 3", ["x/x = 1"]).status).not.toBe("verified");
    expect(assessChain("Simplify x/x for x ≠ 0", ["x/x = 1"]).status).toBe("verified");
  });
  test("(x²−9)/(x−3) = x+3 needs x ≠ 3", () => {
    expect(assessChain("Simplify (x^2 − 9)/(x − 3)", ["(x^2 − 9)/(x − 3) = x + 3"]).status).not.toBe("verified");
    expect(assessChain("Simplify (x^2 − 9)/(x − 3) for x ≠ 3", ["(x^2 − 9)/(x − 3) = x + 3"]).status).toBe("verified");
    expect(assessChain("Simplify (x^2 − 9)/(x − 3) for x ≠ 4", ["(x^2 − 9)/(x − 3) = x + 3"]).status).not.toBe("verified");
  });
  test("sqrt(x²) = x needs x ≥ 0", () => {
    expect(assessChain("Simplify sqrt(x^2)", ["sqrt(x^2) = x"]).status).not.toBe("verified");
  });
  everywhere("x/x = 1 with no condition", "Simplify x/x", ["x/x = 1"]);
  everywhere("x/x = 1 under a different exclusion", "Simplify x/x for x ≠ 3", ["x/x = 1"]);
  everywhere("(x²−9)/(x−3) = x+3 with no condition", "Simplify (x^2 − 9)/(x − 3)", ["(x^2 − 9)/(x − 3) = x + 3"]);
});

describe("independent certificate replay: a self-consistent digest is not validity", () => {
  const T = "Compute 77+32", L = ["77+32 = 70+7+30+2", "70+7+30+2 = (70+30)+(7+2)", "(70+30)+(7+2) = 109"];
  const good = assessChain(T, L).chain;
  /** edit certificate i, then recompute ITS digest and re-link every later dependency/digest, so the forged chain is perfectly self-consistent */
  const forge = (chain: readonly DerivationCertificate[], i: number, edit: (body: any) => void): DerivationCertificate[] => {
    const out = JSON.parse(JSON.stringify(chain)) as DerivationCertificate[];
    for (let k = i; k < out.length; k++) {
      const { digest: _d, ...body } = out[k] as any;
      if (k === i) edit(body); else body.dependencies = [{ line: out[k - 1].line, digest: out[k - 1].digest }];
      out[k] = { ...body, digest: sha256Hex(JSON.stringify(body)) };
    }
    return out;
  };
  test("sanity: an unmodified re-digested chain replays", () => expect(replayDerivationChain(T, L, forge(good, 0, () => {})).ok).toBe(true));
  const cases: [string, (b: any) => void][] = [
    ["a different rule identifier", (b) => { b.parts[0].rule = "distribute"; }],
    ["a different embedded rewrite rule", (b) => { if (b.parts[0].rewrite) b.parts[0].rewrite.steps[0].rule = "evaluate"; }],
    ["a different replacement expression", (b) => { b.parts[0].replacement = "70+7+30+3"; b.results = ["70+7+30+3"]; }],
    ["a different source expression", (b) => { b.parts[0].source = "78+32"; b.sources = ["78+32"]; }],
    ["an injected assumption", (b) => { b.parts[0].assumptions = [{ kind: "positive", variable: "x" }]; b.assumptions = [{ kind: "positive", variable: "x" }]; }],
    ["a dropped domain condition", (b) => { b.task.conditions = []; }],
    ["an invented domain condition", (b) => { b.task.conditions = ["x != 0"]; }],
    ["a different grade", (b) => { b.parts[0].grade = "determined"; }],
    ["a different task digest", (b) => { b.task.digest = sha256Hex("another task"); }],
    ["a different authority version", (b) => { b.versions.authority = "openpath-derivation-authority@0"; }],
    ["a different line index", (b) => { b.line = 5; }],
    ["a self-referencing dependency", (b) => { b.dependencies = [{ line: b.line, digest: "0".repeat(64) }]; }],
  ];
  for (const [name, edit] of cases) for (let i = 0; i < good.length; i++)
    test(`${name} in certificate ${i}, digests recomputed and chain re-linked: refused`, () => { const f = forge(good, i, edit); if (JSON.stringify(f) === JSON.stringify(good)) return; /* the edit does not apply to this certificate */ expect(replayDerivationChain(T, L, f).ok).toBe(false); });
  test("a conditioned chain: dropping or changing the carried condition (digests recomputed) is refused", () => {
    const T2 = "Simplify (x^2 − 9)/(x − 3) for x ≠ 3", L2 = ["(x^2 − 9)/(x − 3) = x + 3"], c2 = assessChain(T2, L2).chain;
    expect(replayDerivationChain(T2, L2, forge(c2, 0, () => {})).ok).toBe(true);
    expect(replayDerivationChain(T2, L2, forge(c2, 0, (b) => { b.task.conditions = []; })).ok).toBe(false);
    expect(replayDerivationChain(T2, L2, forge(c2, 0, (b) => { b.task.conditions = ["x != 4"]; })).ok).toBe(false);
    expect(replayDerivationChain(T2, L2, forge(c2, 0, (b) => { b.assumptions = []; b.parts.forEach((p: any) => { p.assumptions = []; }); })).ok).toBe(false);
    expect(replayDerivationChain("Simplify (x^2 − 9)/(x − 3)", L2, c2).ok).toBe(false);
  });
  test("a compensation certificate cannot be re-graded as determined (digests recomputed)", () => {
    const T3 = "Compute 37 + 22", L3 = ["37 + 22 = (37 + 3) + (22 − 3)"], c3 = assessChain(T3, L3).chain;
    expect(replayDerivationChain(T3, L3, c3).ok).toBe(true);
    const f = forge(c3, 0, (b) => { b.parts.forEach((p: any) => { p.grade = p.grade === "anchored" ? "determined" : "anchored"; }); });
    expect(replayDerivationChain(T3, L3, f).ok).toBe(false);
  });
  test("kernel evidence swapped for evidence of another step is refused", () => {
    const a = assessChain("Simplify (2x + 6)/2", ["(2x + 6)/2 = x + 3"]).chain, b = assessChain("Simplify (3x + 6)/3", ["(3x + 6)/3 = x + 2"]).chain;
    const k = (b[0].parts.find((p) => p.kernel) ?? null)?.kernel;
    if (!k) return;                                                                                 // evidence form changed: nothing to swap
    expect(replayDerivationChain("Simplify (2x + 6)/2", ["(2x + 6)/2 = x + 3"], forge(a, 0, (body) => { const p = body.parts.find((q: any) => q.kernel); if (p) p.kernel = k; })).ok).toBe(false);
  });
  test("a chain with a missing, extra, reordered or duplicated certificate is refused", () => {
    expect(replayDerivationChain(T, L, good.slice(0, 2)).ok).toBe(false);
    expect(replayDerivationChain(T, L, [...good, good[2]]).ok).toBe(false);
    expect(replayDerivationChain(T, L, [good[1], good[0], good[2]]).ok).toBe(false);
    expect(replayDerivationChain(T, L, [good[0], good[0], good[2]]).ok).toBe(false);
  });
  test("the right certificates against edited lines are refused (original expressions)", () => {
    expect(replayDerivationChain(T, ["77+32 = 70+7+30+2", "70+7+30+2 = (70+30)+(7+2)", "(70+30)+(7+2) = 110"], good).ok).toBe(false);
    expect(replayDerivationChain(T, ["77+32 = 60+17+30+2", L[1], L[2]], good).ok).toBe(false);
  });
});

describe("balance and solved-form moves keep their conditions (P2-FINAL)", () => {
  test("dividing both sides by a variable needs the task to declare it nonzero", () => {
    expect(assessChain("x^2 = 4x, x ≠ 0", ["x^2 = 4x", "x^2/x = 4x/x", "x = 4"]).status).toBe("verified");
    expect(assessChain("x^2 = 4x", ["x^2 = 4x", "x^2/x = 4x/x", "x = 4"]).status).not.toBe("verified");        // x = 0 is lost
    expect(assessChain("x^2 = 4x, x ≠ 3", ["x^2 = 4x", "x^2/x = 4x/x", "x = 4"]).status).not.toBe("verified");
    expect(assessChain("x^2 = 4x, x ≠ 0", ["x^2 = 4x", "x^2/(x−1) = 4x/(x−1)", "x = 4"]).status).not.toBe("verified");   // (x−1) is not declared nonzero
  });
  test("skipped balance operations in a presented derivation are unsupported; a bare answer claim and single inverse steps are not", () => {
    expect(assessChain("x/6 − 1 = 4", ["x/6 − 1 = 4", "x = 30"]).status).toBe("unsupported");
    expect(assessChain("3(x − 5) = −21", ["3(x − 5) = −21", "x = −2"]).status).toBe("unsupported");
    expect(assessChain("3x − 6 = x − 12", ["3x − 6 = x − 12", "x = −3"]).status).toBe("unsupported");
    expect(assessChain("2x + 3 = 7", ["x = 2"]).status).toBe("verified");                      // a bare answer claim: the solution is a function of the task alone (graded as an answer)
    expect(assessChain("2x = 4", ["2x = 4", "x = 2"]).status).toBe("verified");               // one inverse operation
    expect(assessChain("2x + 3 = 7", ["2x + 3 = 7", "x = 2"]).status).toBe("unsupported");     // two operations hidden after a presented line
  });
  test("a wrong claim is never made verified by these moves", () => {
    expect(assessChain("2x + 3 = 7", ["x = 3"]).status).not.toBe("verified");
    expect(assessChain("x/7 + 4 = 2", ["x/7 + 4 = 2", "x/7 = −2", "x/7 × 7 = −2 × 8", "x = −14"]).status).not.toBe("verified");
  });
  for (const r of ROUTES.slice(2, 4)) test(`wrong balance on the same parameter is never verified [${r.name}]`, async () => expect(await r.run("9x − 6 = −51", ["9x − 6 = −51", "9x − 6 + 6 = −51 + 7", "9x = −44", "x = −44/9"])).not.toBe("verified"));
  test("the solution-set conclusion is exactly the roots of the equation before it", () => {
    expect(assessChain("x^2 + 5x + 6 = 0", ["x^2 + 5x + 6 = 0", "(x + 2)(x + 3) = 0", "x = −2 or x = −3"]).status).toBe("verified");
    expect(assessChain("x^2 + 5x + 6 = 0", ["x^2 + 5x + 6 = 0", "(x + 2)(x + 3) = 0", "x = −2"]).status).not.toBe("verified");
    expect(assessChain("x^2 + 5x + 6 = 0", ["x^2 + 5x + 6 = 0", "(x + 2)(x + 3) = 0", "x = −2 or x = −3 or x = 7"]).status).not.toBe("verified");
    expect(assessChain("x^2 + 5x + 6 = 0", ["x^2 + 5x + 6 = 0", "(x + 2)(x + 3) = 0", "x = 2 or x = 3"]).status).not.toBe("verified");
  });
});
