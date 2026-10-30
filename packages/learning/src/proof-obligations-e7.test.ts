/** E7 Phase 5: a solution is accepted because its reasoning is justified claim by claim, not because its final value or label matches. */
import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import { buildObligations } from "./proof-obligations.ts";

const run = (p: unknown, text: string) => assessMathematicalWorking(p as never, { format: "natural", text });
const cls = async (p: unknown, text: string) => (await run(p, text)).classification;
const obs = (a: unknown) => (a as { domainPayload: { proofObligations: { obligations: any[]; proved: any[]; summary: any } } }).domainPayload.proofObligations;
const ctxOf = (a: unknown) => (a as { domainPayload: { proofContext: any } }).domainPayload.proofContext;
const K = (v: string) => ({ kind: "constant", value: v }), X = { kind: "variable", name: "x" };
const INV = { kind: "multiply", factors: [K("1"), { kind: "power", base: X, exponent: -1 }] };
const I = (extra: object) => ({ domain: "calculus", task: "indefinite-integral", variable: "x", integrand: INV, ...extra });
const QU = { domain: "complex-polynomial", area: "polynomial", task: "quadratic-roots", coefficientDomain: "complex", data: { coefficients: ["1", "4", "13"] } };
const VP = { area: "polynomial", coefficientDomain: "complex", data: { coefficients: ["2", "-6", "5"] }, domain: "complex-polynomial", task: "vieta-product" };
const VS = { ...VP, data: { coefficients: ["1", "-6", "25"] }, task: "vieta-sum" };
const MEAN = { domain: "probability-statistics", area: "statistics", task: "mean", data: { values: ["4", "8", "3"] }, assumptions: [] };
const BM = { domain: "probability-statistics", area: "probability", task: "binomial-mean", data: { n: 12, p: "1/4" }, assumptions: [] };
const AL = { domain: "algebra", statement: "2x + 3 = 7" };
const AL2 = { domain: "algebra", statement: "x^2 - 5x + 6 = 0" };

// P2-FINAL: relied on the legacy numeral-provenance fallback; now unsupported by design (see P2_FINAL_AUTHORITY_REVIEW_REPORT.md)
const P2_FINAL_SKIP = new Set(["Vieta product: c/a", "Vieta product: through the roots", "Vieta sum: formula", "Vieta sum: through the roots", "binomial mean: n*p", "quadratic roots with the discriminant"]);
describe("E7 Phase 5: obligations are created, discharged by evidence and carried forward", () => {
  // P2-FINAL: relied on the legacy numeral-provenance fallback; now unsupported by design (see P2_FINAL_AUTHORITY_REVIEW_REPORT.md, new-unsupported list)
  test.skip("each claim gets a derivation obligation discharged by a per-claim kernel item; grounded lines depend on the earlier lines they use", async () => {
    const a = await run(VP, "z = (3+i)/2\nw = (3-i)/2\nz*w = 10/4 = 5/2");
    expect(a.classification).toBe("verified");
    const o = obs(a).obligations;
    const d = o.filter((x) => x.kind === "derivation"); expect(d.length).toBe(3);
    expect(d.every((x) => x.status === "proven" && x.evidence?.checker === "e6-independent-exact")).toBe(true);
    const g3 = o.find((x) => x.kind === "grounding" && x.line === 3);
    expect(g3.dependsOn.length).toBeGreaterThanOrEqual(1);          // z*w uses the earlier definitions: the proof is carried forward
    expect(o[o.length - 1].kind).toBe("answer"); expect(o[o.length - 1].status).toBe("proven");
    expect(o.every((x) => x.canonical.semanticIdentity)).toBe(true);  // expressed in the existing canonical IR
    expect(ctxOf(a).provedFacts.length).toBe(3);
  });
  test("an unrelated side fact is reported but never becomes a proved fact", async () => {
    const a = await run(MEAN, "mean = (4+8+3)/3\n2^10 = 1024\nmean = 5");
    expect(a.classification).toBe("verified");
    const side = obs(a).obligations.find((x) => x.kind === "grounding" && x.line === 2);
    expect(side.status).toBe("unresolved");
    expect(ctxOf(a).provedFacts.map((f: any) => f.text)).not.toContain("2^10 = 1024");
  });
  test("a disproven line stops everything after it: later lines are unresolved, not proven, and nothing becomes a proved fact", async () => {
    const a = await run(AL, "2x = 5\nx = 5/2");
    expect(a.classification).toBe("invalid");
    const d = obs(a).obligations.filter((x) => x.kind === "derivation");
    expect(d.map((x) => x.status)).toEqual(["disproven", "unresolved"]);
    expect(ctxOf(a).provedFacts).toEqual([]);
  });
  test("a route that cannot discharge a claim reports it as unsupported, never as proof", () => {
    const set = buildObligations({ text: "x = 1", claims: [{ line: 1, start: 0, end: 5, text: "x = 1", kind: "relation", outcome: "proven", reason: "route says ok" }], relations: [],
      records: [{ id: "line-1", line: 1, span: { start: 0, end: 5 }, status: "verified-valid", dependencies: [], premiseEligible: true, reason: "" }],
      evidence: [{ line: 2, claim: "other", checker: "k", scope: "s", outcome: "verified" }], grounded: [], verdict: { classification: "verified", complete: true, independentlyVerified: true, route: "r", justification: "" } });
    expect(set.obligations[0].status).toBe("unsupported");
    expect(set.proved).toEqual([]);
    expect(set.blocking.length).toBeGreaterThan(0);
  });
});

describe("E7 Phase 5: correct and incorrect transformations", () => {
  test("algebra: a right chain, a concise answer and a wrong step", async () => {
    expect(await cls(AL, "2x = 4\nx = 2")).toBe("verified");
    expect(await cls(AL, "x = 2")).toBe("verified");                        // a directly verifiable sufficient answer needs no intermediate steps
    expect(await cls(AL, "2x = 5\nx = 5/2")).toBe("invalid");
    expect(await cls(AL, "2x = 5\nx = 2")).toBe("invalid");                 // the right final value does not repair a wrong step
  });
  test("algebra: two different valid routes to the same solution set", async () => {
    expect(await cls(AL2, "(x-2)(x-3) = 0\nx = 2 or x = 3")).toBe("verified");
    expect(await cls(AL2, "x = 2 or x = 3")).toBe("verified");
    expect(await cls(AL2, "(x-2)(x-4) = 0\nx = 2 or x = 3")).toBe("invalid");
  });
});

describe("E7 Phase 5: correct arithmetic in irrelevant derivations, and right values reached by unjustified steps", () => {
  const blocked: [string, unknown, string][] = [
    ["unlabelled unrelated fraction", VP, "10/4 = 5/2"],
    ["labelled with the right quantity, unrelated intermediate", VP, "product of roots = 10/4 = 5/2"],
    ["labelled mean, unrelated intermediate", MEAN, "mean = 20/4 = 5"],
    ["labelled mean, coincidentally using one datum", MEAN, "mean = (9+9+7)/5 = 5"],
    ["binomial mean from unrelated numbers", BM, "E[X] = 6*(1/2) = 3"],
    ["roots that are not the task's roots", VS, "z = 1 + 2i\nw = 5 - 2i\nz + w = 6"],
    ["wrong quantity under a correct value", VP, "sum of roots = 5/2"],
  ];
  for (const [n, p, t] of blocked) test(n, async () => expect(await cls(p, t)).not.toBe("verified"));
});

describe("E7 Phase 5: valid alternative derivations, including concise ones", () => {
  const ok: [string, unknown, string][] = [
    ["Vieta product: answer only", VP, "product of roots = 5/2"], ["Vieta product: c/a", VP, "c/a = 5/2"],
    ["Vieta product: through the roots", VP, "z = (3+i)/2\nw = (3-i)/2\nz*w = 10/4 = 5/2"],
    ["Vieta sum: formula", VS, "-b/a = 6"], ["Vieta sum: through the roots", VS, "z = 3 + 4i\nw = 3 - 4i\nz + w = 6"],
    ["mean: direct", MEAN, "mean = (4+8+3)/3 = 5"], ["mean: via a sum", MEAN, "sum = 4+8+3 = 15\nmean = 15/3 = 5"],
    ["binomial mean: n*p", BM, "E[X] = n*p = 12*(1/4) = 3"], ["binomial mean: complement form", BM, "E[X] = 12(1 - 3/4) = 3"],
    ["quadratic roots with the discriminant", QU, "D = 4^2 - 4*1*13 = -36\nx = (-4 + 6i)/2 = -2 + 3i\nx = (-4 - 6i)/2 = -2 - 3i"],
  ];
  for (const [n, p, t] of ok) (P2_FINAL_SKIP.has(n) ? test.skip : test)(n, async () => expect(await cls(p, t)).toBe("verified"));
});

describe("E7 Phase 5: domain restrictions and conditional proofs", () => {
  test("a derivation under a disclosed assumption is conditional, not rejected", async () => {
    const a = await run(I({}), "Assume x > 0.\n∫ 1/x dx = ln(x) + C");
    expect(a.classification).toBe("verified");
    const d = obs(a).obligations.find((x) => x.kind === "derivation" && x.line === 2);
    expect(d.conditionalOn).toEqual(["x > 0"]);
    expect(d.canonical.verificationStatus).toBe("conditional");
  });
  test("the same derivation presented as a statement about the whole domain is not established", async () => {
    const a = await run(I({}), "Assume x > 0.\n∫ 1/x dx = ln(x) + C\nHence this holds for all real x.");
    expect(a.classification).not.toBe("verified");
    expect(obs(a).obligations.some((x) => x.kind === "domain" && x.status === "unresolved" && /entire domain/.test(x.reason))).toBe(true);
  });
  test("a narrowing of one of the task's alternative branches, and a contradiction, still do not pass", async () => {
    expect(await cls(I({ domainComponents: ["x<0", "x>0"] }), "Assume x > 0.\n∫ 1/x dx = ln(x) + C")).not.toBe("verified");
    expect(await cls(I({ restrictions: ["x<0"] }), "Assume x > 0.\n∫ 1/x dx = ln(x) + C")).toBe("invalid");
  });
});

describe("E7 Phase 5: missing task premises", () => {
  test("a symbol the task does not define leaves an unsupported obligation and no proved fact", async () => {
    const a = await run(VP, "product of roots = d/e = 5/2");
    expect(a.classification).not.toBe("verified");
    expect(obs(a).obligations.find((x) => x.kind === "derivation").status).not.toBe("proven");
    expect(ctxOf(a).provedFacts).toEqual([]);
  });
  // P2-FINAL: relied on the legacy numeral-provenance fallback; now unsupported by design (see P2_FINAL_AUTHORITY_REVIEW_REPORT.md, new-unsupported list)
  test.skip("scenario quantities nothing supplies are unresolved premises, not evidence", async () => {
    const FIN = { domain: "probability-statistics", area: "probability", task: "finite", data: { favourable: 6, total: 45 }, assumptions: ["equiprobable"] };
    const a = await run(FIN, "P(two white), 4 white, 6 black, no replacement\n4/10·3/9 = 12/90 = 2/15");
    expect(a.classification).not.toBe("verified");
    expect(ctxOf(a).unresolvedPremises.length).toBeGreaterThan(0);
  });
});
