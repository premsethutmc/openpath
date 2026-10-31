/** E7 Phase 6: one certification authority, decided from proof obligations and registered evidence mechanisms. */
import { afterAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { assessMathematicalWorking, type AssessmentEnvelope } from "./unified-math-engine.ts";
import { adjudicate, standsOnObligations, structuredObligations } from "./certification-authority.ts";
import { attribute, MECHANISMS } from "./evidence-provenance.ts";
import { assemble, internalEv, make } from "./proof-obligations.ts";
import { stopGeometryWorkers } from "./geometry-worker.ts";

afterAll(() => stopGeometryWorkers());
const K = (v: string) => ({ kind: "constant", value: v }), X = { kind: "variable", name: "x" };
const pw = (b: unknown, e: number) => ({ kind: "power", base: b, exponent: e }), mul = (...f: unknown[]) => ({ kind: "multiply", factors: f }), add = (...t: unknown[]) => ({ kind: "add", terms: t });
const nat = (text: string) => ({ format: "natural" as const, text });
const der = { domain: "calculus", task: "derivative", expression: pw(add(mul(K("3"), X), K("1")), 5), variable: "x" };
const ind = { domain: "calculus", task: "indefinite-integral", integrand: add(mul(K("5"), pw(X, 4)), K("1")), variable: "x" };
const sinInt = { domain: "calculus", task: "indefinite-integral", integrand: { kind: "sin", argument: mul(K("5"), X) }, variable: "x" };
const tri = { domain: "geometry", problem: { id: "tri", objects: [{ id: "ABC", kind: "triangle" }], facts: [{ predicate: "angle_measure", args: ["A"], value: 50 }, { predicate: "angle_measure", args: ["B"], value: 60 }], conditions: ["nondegenerate:ABC"], goal: { predicate: "angle_measure", args: ["C"], value: 70 } } };
const run = (p: unknown, text: string) => assessMathematicalWorking(p as never, nat(text));
const obsOf = (a: AssessmentEnvelope) => a.proofObligations ?? (a.domainPayload as { proofObligations?: ReturnType<typeof assemble> }).proofObligations!;
const env = (classification: string, obs: ReturnType<typeof assemble> | undefined, extra: Partial<AssessmentEnvelope> = {}): AssessmentEnvelope => ({ contractVersion: "openpath-unified-math@1", domain: "calculus", classification, correct: classification === "verified" ? true : null, complete: classification === "verified", firstInvalidStep: null, steps: [], proofDependencies: [], domainRestrictions: [], outstandingObligations: [], skills: [], reasoners: [], justification: "synthetic", domainPayload: obs ? { proofObligations: obs } : {}, ...extra } as unknown as AssessmentEnvelope);
const proven = (claim: string, line: number, mech = "e6-independent-exact") => make("ob:0", "derivation", line, claim, "s", "proven", "ok", { checker: mech, scope: "s", digest: null, detail: claim, mechanism: mech, kernel: MECHANISMS[mech]?.kernel ?? null, trusted: true, bound: true }, [], []);
const obsFor = (list: ReturnType<typeof make>[], answerOk = true) => assemble([...list.map((o, i) => ({ ...o, id: `ob:${i}` })), make(`ob:${list.length}`, "answer", list[list.length - 1]?.line ?? null, "a", "s", answerOk ? "proven" : "unresolved", "r", answerOk ? internalEv("completeness", "s", null, "d") : null, list.length ? [`ob:${list.length - 1}`] : [], [])]);

describe("E7 Phase 6: evidence provenance is a registered mechanism, never a route-provided label", () => {
  test("an unregistered label, a wrong-route label and a missing producer are all untrusted", () => {
    expect(attribute("totally-checked", "adapter-converted", []).trusted).toBe(false);
    expect(attribute("e6-independent-exact", "adapter-converted", ["natural-working-parser"]).trusted).toBe(false);
    expect(attribute("e6-independent-exact", "adapter-converted", ["natural-generalization-e6"]).trusted).toBe(true);
    expect(attribute("u4-kernel", "structured-typed", []).trusted).toBe(false);
    expect(attribute("symbolic:m3", "structured-typed", ["symbolic:m3"]).trusted).toBe(true);
    expect(attribute("symbolic:m3", "structured-typed", ["calculus:exact"]).trusted).toBe(false);
  });
  test("internal mechanisms cannot discharge a mathematical derivation", () => {
    expect(MECHANISMS["grounding"].mayDischargeDerivation).toBe(false);
    expect(MECHANISMS["proof-context"].mayDischargeDerivation).toBe(false);
  });
  test("every proven derivation of every verified natural result names its kernel", async () => {
    for (const [p, t] of [[der, "d/dx (3x+1)^5 = 5(3x+1)^4 * 3 = 15(3x+1)^4"], [ind, "∫(5x^4+1)dx = x^5 + x + C"], [tri, "angle C = 70°"], [{ domain: "algebra", statement: "2x+3=7" }, "2x = 4\nx = 2"]] as [unknown, string][]) {
      const a = await run(p, t); expect(a.classification).toBe("verified");
      const c = a.certification!; expect(c.integrity.provenDerivations).toBeGreaterThan(0); expect(c.integrity.unattributed).toBe(0);
      for (const o of obsOf(a).obligations.filter((x) => x.kind === "derivation")) expect(MECHANISMS[o.evidence!.mechanism!]).toBeDefined();
    }
  });
  test("a route label that is not a registered mechanism cannot prove a claim", async () => {
    // the obligation builder is the only place evidence is converted to proof: an untrusted label leaves the claim unsupported
    const { buildObligations } = await import("./proof-obligations.ts");
    const o = buildObligations({ text: "x = 1", claims: [{ line: 1, start: 0, end: 5, text: "x = 1", kind: "relation", outcome: "proven", reason: "r" }], relations: [],
      records: [{ role: "claim-step", text: "x = 1", id: "l1", line: 1, span: { start: 0, end: 5 }, status: "verified-valid", dependencies: [], premiseEligible: true, reason: "r" }],
      evidence: [{ line: 1, claim: "x = 1", checker: "trust-me", scope: "s", outcome: "verified" }], grounded: [], verdict: { classification: "verified", complete: true, independentlyVerified: true, route: "adapter-converted", justification: "j" }, reasoners: [] });
    expect(o.obligations[0].status).toBe("unsupported"); expect(o.blocking.length).toBeGreaterThan(0);
  });
});

describe("E7 Phase 6: no route grants the verdict; the obligations do", () => {
  test("a verified report without obligations, or with an unproven answer, is not an acceptance", () => {
    expect(standsOnObligations(env("verified", undefined)).ok).toBe(false);
    expect(standsOnObligations(env("verified", obsFor([proven("x = 1", 1)], false))).ok).toBe(false);
    expect(standsOnObligations(env("verified", obsFor([proven("x = 1", 1)]))).ok).toBe(true);
    const final = adjudicate([{ route: "e6", env: env("verified", undefined) }], null);
    expect(final.classification).not.toBe("verified");
  });
  test("a proven derivation without a registered mechanism makes the acceptance void", () => {
    const o = obsFor([proven("x = 1", 1, "made-up")]);
    expect(standsOnObligations(env("verified", o)).ok).toBe(false);
  });
  test("distinctions are kept: invalid, incomplete, missing-assumption, unsupported, verified", async () => {
    expect((await run(der, "d/dx (3x+1)^5 = 14(3x+1)^4")).classification).toBe("invalid");
    expect((await run(der, "d/dx (3x+1)^5 = 5(3x+1)^4 * 3\nso the derivative is found")).classification).toBe("incomplete");
    expect((await run(ind, "∫ 5x^4 + 1 dx = x^5 + x")).classification).toBe("missing-assumption");
    expect((await run(der, "15(3x+1)^4")).classification).toBe("unsupported");
    expect((await run(der, "d/dx (3x+1)^5 = 15(3x+1)^4")).classification).toBe("verified");
  });
  test("a list of text lines is the same input as natural text and gets the same obligations", async () => {
    const lines = ["2x+3=7", "2x = 4", "x = 2"], p = { domain: "algebra", statement: "2x+3=7" };
    const a = await assessMathematicalWorking(p as never, lines), b = await assessMathematicalWorking(p as never, nat(lines.join("\n")));
    expect(a.classification).toBe(b.classification); expect(obsOf(a).summary).toEqual(obsOf(b).summary);
  });
});

describe("E7 Phase 6: route disagreement is resolved by evidence, not by route priority", () => {
  test("a rule-form rejection by the legacy calculus kernel does not refute a claim two exact kernels proved", async () => {
    const a = await run(sinInt, "∫ sin(5x) dx = -cos(5x)/5 + C");
    expect(a.classification).toBe("verified");
    const base = a.certification!.routes.find((r) => r.route === "base")!; expect(base.reported).toBe("invalid"); expect(base.role).toBe("scope-only");
  });
  test("two trusted mechanisms that contradict each other certify nothing", () => {
    const yes = obsFor([proven("x = 1", 1)]), no = assemble([make("ob:0", "derivation", 1, "x = 1", "s", "disproven", "false", null, [], []), make("ob:1", "answer", 1, "x = 1", "s", "disproven", "r", null, ["ob:0"], [])]);
    const final = adjudicate([{ route: "e6", env: env("verified", yes) }, { route: "e5", env: env("invalid", no, { steps: [{ index: 0, classification: "invalid", justification: "j", reasoner: "e5", dependencies: [] }] }) }], null);
    expect(final.classification).toBe("unsupported"); expect(final.certification!.rule).toBe("kernel-contradiction");
  });
  test("a disproved claim the accepting route never proved stands", () => {
    const yes = obsFor([proven("x = 1", 1)]), no = assemble([make("ob:0", "derivation", 2, "y = 2", "s", "disproven", "false", null, [], []), make("ob:1", "answer", 2, "y = 2", "s", "disproven", "r", null, ["ob:0"], [])]);
    const final = adjudicate([{ route: "e6", env: env("verified", yes) }, { route: "e5", env: env("invalid", no) }], null);
    expect(final.classification).toBe("invalid");
  });
  test("an explicit missing domain assumption from a route that models it stands against an acceptance that does not", async () => {
    expect((await run({ domain: "calculus", task: "indefinite-integral", integrand: pw(X, -1), variable: "x" }, "∫ 1/x dx = ln(x) + C")).classification).toBe("missing-assumption");
  });
  test("a generic text route's ambiguity over derivative notation is not an objection to a specialised route's acceptance", async () => {
    const a = await run(der, "d/dx (3x+1)^5 = 5(3x+1)^4 * 3\n= 15(3x+1)^4"); expect(a.classification).toBe("verified");
    expect(a.certification!.routes.some((r) => r.reported === "ambiguous" && r.role === "abstains")).toBe(true);
  });
  test("a competent route's genuine ambiguity still blocks an acceptance", async () => {
    expect((await run({ domain: "calculus", task: "derivative", expression: { kind: "log", argument: X }, variable: "x" }, "d/dx log(x) = 1/x")).classification).not.toBe("verified");
  });
});

describe("E7 Phase 6: typed (structured) input gets the same obligations or is non-certifiable", () => {
  const fx = JSON.parse(readFileSync("tools/mathematics/unified-u2/independent-cases.v2.json", "utf8")).cases as { id: string; problem: unknown; working: unknown; options?: object; expected: { classification: string } }[];
  test("a typed acceptance carries per-step derivation and grounding obligations with registered typed mechanisms", async () => {
    const c = fx.find((x) => x.expected.classification === "verified")!;
    const a = await assessMathematicalWorking(c.problem as never, c.working as never, c.options as never);
    expect(a.classification).toBe("verified"); const o = a.proofObligations!;
    expect(o.obligations.filter((x) => x.kind === "derivation").length).toBeGreaterThan(0); expect(o.obligations.some((x) => x.kind === "grounding")).toBe(true);
    expect(o.obligations[o.obligations.length - 1].kind).toBe("answer"); expect(a.certification!.integrity.unattributed).toBe(0);
  });
  test("a step verified by an unregistered reasoner, or a solution without steps, cannot be certified", () => {
    const base = { steps: [{ index: 0, classification: "verified", justification: "j", reasoner: "mystery:v9", dependencies: ["problem"] }], reasoners: [{ id: "mystery:v9", version: "1" }], classification: "verified", complete: true, justification: "j" } as unknown as AssessmentEnvelope;
    expect(structuredObligations(base).blocking.length).toBeGreaterThan(0);
    const empty = { ...base, steps: [] } as AssessmentEnvelope; expect(structuredObligations(empty).blocking.length).toBeGreaterThan(0);
  });
  test("a typed step that depends on an unproven step is not proven", () => {
    const e = { steps: [{ index: 0, classification: "incomplete", justification: "j", reasoner: "symbolic:m3", dependencies: ["problem"] }, { index: 1, classification: "verified", justification: "j", reasoner: "symbolic:m3", dependencies: ["s0"] }], reasoners: [{ id: "symbolic:m3", version: "1" }], classification: "verified", complete: true, justification: "j" } as unknown as AssessmentEnvelope;
    const o = structuredObligations(e); expect(o.obligations.find((x) => x.line === 2 && x.kind === "derivation")!.status).toBe("unresolved");
  });
  test("every typed fixture keeps its verdict and no accepted typed result is unattributed", async () => {
    let checked = 0;
    for (const c of fx.slice(0, 60)) { const a = await assessMathematicalWorking(c.problem as never, c.working as never, c.options as never); expect(a.classification).toBe(c.expected.classification); if (a.classification === "verified") { checked++; expect(a.certification!.integrity.unattributed).toBe(0); } }
    expect(checked).toBeGreaterThan(5);
  });
});

describe("E7 Phase 6: task relevance for calculus and geometry; side claims and scenario gaps", () => {
  test("a true statement about a different integral is not called invalid, and does not answer the task", async () => {
    const a = await run(ind, "∫3x^2 dx = x^3 + C"); expect(a.classification).toBe("incomplete"); expect(a.classification).not.toBe("invalid");
  });
  test("a true side claim neither blocks a complete derivation nor is credited", async () => {
    for (const side of ["2+2 = 4", "x^2 = x*x", "sin(x)^2 + cos(x)^2 = 1"]) {
      const a = await run(der, `${side}\nd/dx (3x+1)^5 = 15(3x+1)^4`);
      expect(a.classification).toBe("verified"); expect(a.certification!.rule).toBe("side-claims-excluded");
      expect(a.certification!.sideClaims![0].status).toBe("unproven"); expect(obsOf(a).obligations.every((o) => !o.claim.includes(side.replace(/\s/g, "")))).toBe(true);
    }
    expect((await run(ind, "x^2 = x*x\n∫(5x^4+1)dx = x^5 + x + C")).classification).toBe("verified");
    expect((await run(tri, "3*4 = 12\nangle C = 70°")).classification).toBe("verified");
  });
  test("a side claim never rescues wrong work", async () => {
    expect((await run(der, "2+2 = 4\nd/dx (3x+1)^5 = 14(3x+1)^4")).classification).toBe("invalid");
    expect((await run(der, "2+2 = 4")).classification).not.toBe("verified");
    expect((await run(tri, "3*4 = 12\nangle C = 80°")).classification).not.toBe("verified");
  });
  test("anchored lines carry a grounding obligation proven by the task's own function", async () => {
    const a = await run(der, "d/dx (3x+1)^5 = 5(3x+1)^4 * 3 = 15(3x+1)^4"); const g = obsOf(a).obligations.filter((o) => o.kind === "grounding");
    expect(g.length).toBeGreaterThan(0); expect(g.every((o) => o.status === "proven")).toBe(true);
  });
  test("a concise answer and a different valid method are still certified", async () => {
    expect((await run(tri, "angle C = 70°")).classification).toBe("verified");
    expect((await run(ind, "∫(5x^4+1)dx = x^5 + x + C")).classification).toBe("verified");
    expect((await run({ domain: "algebra", statement: "2x+3=7" }, "x = 2")).classification).toBe("verified");
    expect((await run({ domain: "algebra", statement: "2x+3=7" }, "2x+3-3 = 7-3\n2x = 4\nx = 4/2\nx = 2")).classification).toBe("verified");
  });
  test("an unresolved scenario premise is reported as missing evidence, not as false mathematics", async () => {
    const pmf = { domain: "probability-statistics", area: "distribution", task: "pmf-mean", data: { probabilities: ["1/6", "1/3", "1/2"], values: ["1", "2", "3"] } };
    const a = await run(pmf, "E[X] = 1(1/6) + 2(1/3) + 3(1/2) = 7/3"); expect(a.classification).not.toBe("invalid");
  });
  test("limits: a true limit of another function or a bare identity is a side claim, not a refutation and not a step", async () => {
    const lim = { domain: "calculus", task: "limit", expression: mul({ kind: "sin", argument: X }, pw(X, -1)), variable: "x", approach: "0" };
    const a = await run(lim, "lim_(x→2) x^2 = 4\nlim_(x→0) sin(x)/x = 1"); expect(a.classification).toBe("verified"); expect(a.certification!.sideClaims!.length).toBe(1);
    expect((await run(lim, "2 + 2 = 4\nlim_(x→0) sin(x)/x = 1")).certification!.rule).toBe("side-claims-excluded");
    expect((await run(lim, "lim_(x→2) x^2 = 4")).classification).not.toBe("verified");
    expect((await run(lim, "lim_(x→0) sin(x)/x = 0")).classification).toBe("invalid");
  });
  test("geometry: numbers that come from nowhere leave a true calculation ungrounded; numbers from the task or earlier lines ground it", async () => {
    expect((await run(tri, "angle C = 100 - 30 = 70°")).classification).not.toBe("verified");
    expect((await run(tri, "angle C = 123 - 53 = 70")).classification).not.toBe("verified");
    expect((await run(tri, "angle C = 180 - 110 = 70")).classification).toBe("verified");
    expect((await run(tri, "50 + 60 = 110\nangle C = 180 - 110 = 70")).classification).toBe("verified");
    expect((await run(tri, "angle C = 180 - 110 = 80")).classification).not.toBe("verified");
  });
  test("a side claim inside a derivation that is itself wrong stays wrong", async () => {
    expect((await run(ind, "x^2 = x*x\n∫(5x^4+1)dx = x^5 + x")).classification).toBe("missing-assumption");
    expect((await run(ind, "x^2 = x*x\n∫(5x^4+1)dx = x^5 + 2x + C")).classification).not.toBe("verified");
  });
});
