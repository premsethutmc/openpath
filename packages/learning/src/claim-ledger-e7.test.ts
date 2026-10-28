/**
 * E7 Phase 2: claim ledger and claim accounting.
 * (1) extraction invariants (property-tested: no claim disappears between the raw text and the ledger),
 * (2) every identified bypass is blocked, with unfamiliar combinations that exercise the same invariants,
 * (3) valid alternative methods and valid prose are not rejected.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import { extractLedger } from "./claim-ledger.ts";
import { contradictsTask, parseConstraints, taskDomain } from "./claim-certifier.ts";

const H2 = JSON.parse(readFileSync("tools/mathematics/generalization-e6r/holdout2/holdout-cases.v1.json", "utf8")).cases as { caseId: string; problem: any; studentWorking: { format: "natural"; text: string } }[];
const byId = (id: string) => H2.find((c) => c.caseId === id)!;
const run = async (problem: any, text: string) => (await assessMathematicalWorking(problem, { format: "natural", text })).classification;
const nat = (text: string) => ({ format: "natural" as const, text });

// ---------------------------------------------------------------------------------------------------------------- 1. extraction
describe("claim ledger extraction", () => {
  const claims = (t: string) => extractLedger(t).claims.map((c) => `${c.kind}:${c.text}`);
  test("claims embedded in prose are extracted with exact source spans", () => {
    const text = "By Vieta, the product of the roots is -b/a = 6.";
    const L = extractLedger(text); expect(L.claims.length).toBe(1);
    const c = L.claims[0]; expect(text.slice(c.start, c.end)).toBe(c.text); expect(c.text).toBe("-b/a = 6"); expect(c.line).toBe(1);
  });
  test("verbal statements without a relation sign are recorded as assertions", () => {
    expect(claims("The derivative of x^2 is 3x.")).toEqual(["assertion:The derivative of x^2 is 3x"]);
    expect(claims("The limit of x^2 as x->2 equals 9.")).toEqual(["assertion:The limit of x^2 as x->2 equals 9"]);
  });
  test("compound lines yield one claim each; limit arrows are not relations", () => {
    expect(claims("Since x^2 = 9, x = ±3")).toEqual(["relation:x^2 = 9", "relation:x = ±3"]);
    expect(claims("u = 3x, du = dx/3")).toEqual(["relation:u = 3x", "relation:du = dx/3"]);
    expect(claims("lim_(x->2) (x^2-4)/(x-2) = 4")).toEqual(["relation:lim_(x->2) (x^2-4)/(x-2) = 4"]);
  });
  test("sentences with no mathematics carry no claim", () => {
    expect(claims("Apply the chain rule here.")).toEqual([]);
    expect(claims("We now simplify and collect terms")).toEqual([]);
  });
  test("a labelled relation keeps its label inside the claim", () => {
    const c = extractLedger("sum of roots = 5/2").claims[0]; expect(c.labelled).toBeTrue(); expect(c.text).toBe("sum of roots = 5/2");
  });
  test("a qualitative conclusion is one claim, not a point specification", () => {
    expect(claims("Therefore f is continuous at x = 2.")).toEqual(["assertion:Therefore f is continuous at x = 2"]);
  });
  test("PROPERTY: no injected claim disappears, whatever prose surrounds it", () => {
    let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const frags = ["x^2 = 9", "2x + 1 = 7", "P(A∩B) = 1/3 * 1/2", "f'(x) = 2x", "3 + 4 = 7", "(x-2)(x+2) = x^2 - 4", "y >= 3", "a/b = 6"];
    const lead = ["", "Since ", "By Vieta, the product of the roots is ", "Therefore ", "Now note that ", "We get ", "Recall that "];
    const tail = ["", ".", ", so we continue.", " by the power rule.", " and we are done."];
    for (let n = 0; n < 400; n++) {
      const k = 1 + Math.floor(rnd() * 3); const used: string[] = []; let line = "";
      for (let i = 0; i < k; i++) { const f = frags[Math.floor(rnd() * frags.length)]; used.push(f); line += (i ? (rnd() < 0.5 ? "; " : ". ") : "") + lead[Math.floor(rnd() * lead.length)] + f + (i === k - 1 ? tail[Math.floor(rnd() * tail.length)] : ""); }
      const got = extractLedger(line).claims.map((c) => c.text);
      for (const f of used) expect(got.some((g) => g.includes(f))).toBeTrue();
      for (const c of extractLedger(line).claims) expect(line.slice(c.start, c.end)).toBe(c.text);
    }
  });
  test("PROPERTY: spans are inside their line and ordered; every non-blank line is preserved", () => {
    const text = "1. f(x) = x^2\n\nSo we differentiate: f'(x) = 2x\n   Therefore the answer is 2x.";
    const L = extractLedger(text); expect(L.lines.map((l) => l.line)).toEqual([1, 3, 4]);
    for (const ln of L.lines) { let prev = -1; for (const c of ln.claims) { expect(c.start).toBeGreaterThanOrEqual(prev); expect(c.end).toBeLessThanOrEqual(ln.text.length); prev = c.end; } }
  });
});

// ---------------------------------------------------------------------------------------------------------------- 2. restrictions
describe("task restrictions are immutable; a student assumption cannot replace them", () => {
  test("interval reasoning", () => {
    const dom = taskDomain({ restrictions: ["x<0"] });
    expect(contradictsTask(parseConstraints("x>0")!, dom)).toBeTrue();
    expect(contradictsTask(parseConstraints("x<-1")!, dom)).toBeFalse();
    expect(contradictsTask(parseConstraints("-3 < x < -1")!, dom)).toBeFalse();
    expect(contradictsTask(parseConstraints("x >= 0")!, dom)).toBeTrue();
  });
  test("a disjunctive domain is contradicted only when every component is", () => {
    const dom = taskDomain({ domainComponents: ["x<2", "x>2"] });
    expect(contradictsTask(parseConstraints("x>5")!, dom)).toBeFalse();
    expect(contradictsTask(parseConstraints("x=2")!, taskDomain({ restrictions: ["x!=2"] }))).toBeTrue();
  });
});

// ---------------------------------------------------------------------------------------------------------------- 3. bypasses are blocked
const LIMIT = { domain: "calculus", task: "limit", expression: { kind: "multiply", factors: [{ kind: "add", terms: [{ kind: "power", base: { kind: "variable", name: "x" }, exponent: 2 }, { kind: "constant", value: "-4" }] }, { kind: "power", base: { kind: "add", terms: [{ kind: "variable", name: "x" }, { kind: "constant", value: "-2" }] }, exponent: -1 }] }, variable: "x", approach: "2", side: "both" };
const VIETA = { area: "polynomial", coefficientDomain: "complex", data: { coefficients: ["2", "-6", "5"] }, domain: "complex-polynomial", task: "vieta-product" };
const LN_NEG = { domain: "calculus", task: "derivative", expression: { kind: "log", argument: { kind: "power", base: { kind: "variable", name: "x" }, exponent: 2 } }, restrictions: ["x<0"], variable: "x" };

describe("bypass 1: prose is never proof", () => {
  test("a false sentence before a correct final line is not verified (the s6-217/226/238 mechanism)", async () => {
    expect(await run(LIMIT, "The limit of x^2 as x->2 equals 9.\nlim_(x->2) (x^2-4)/(x-2) = 4")).toBe("unsupported");
    expect(await run(LIMIT, "Recall that 1+1=3 and so the limit is hard.\nlim_(x->2) (x^2-4)/(x-2) = 4")).toBe("invalid");
    expect(await run(VIETA, "the product of the roots is -c/a\nproduct of roots = 5/2")).not.toBe("verified");
  });
  for (const id of ["s6-217", "s6-226", "s6-238"]) test(`${id} is no longer verified`, async () => { const c = byId(id); expect(await run(c.problem, c.studentWorking.text)).not.toBe("verified"); });
  test("a working made only of prose cannot be verified", async () => { expect(await run(LIMIT, "We take the limit by factoring and cancelling.")).not.toBe("verified"); });
  test("an unfamiliar false statement embedded in prose is caught by the same invariant", async () => {
    expect(await run(LIMIT, "Because 2 + 2 = 5 the factor cancels.\nlim_(x->2) (x^2-4)/(x-2) = 4")).not.toBe("verified");
    expect(await run(LIMIT, "Note that (x-2)(x+2) = x^2 + 4.\nlim_(x->2) (x^2-4)/(x-2) = 4")).not.toBe("verified");
  });
});
describe("bypass 2: a matching number is not an answer", () => {
  test("a value under another quantity's name or an unrelated name is not the requested quantity", async () => {
    expect(await run(VIETA, "sum of roots = 5/2")).not.toBe("verified");
    expect(await run(VIETA, "banana = 5/2")).not.toBe("verified");
    expect(await run(VIETA, "product of roots = 5/2")).toBe("verified");
  });
});
describe("bypass 3: an unbound event is never back-solved from the claimed result", () => {
  test("s6-182 is missing-assumption (the event P(no head) is not bound to the premises)", async () => { const c = byId("s6-182"); expect(await run(c.problem, c.studentWorking.text)).toBe("missing-assumption"); });
  test("an unfamiliar complement chain gets the same treatment", async () => {
    const c = byId("s6-182");
    expect(await run(c.problem, "P(at least one tail) = 1 - P(no tail) = 7/8")).toBe("missing-assumption");
  });
});
describe("bypass 4: student assumptions cannot override the task", () => {
  test("a demonstrably contradicting assumption is invalid", async () => { expect(await run(LN_NEG, "Assume x>0.\nln(x^2) = 2ln(x)\nf'(x) = 2/x")).toBe("invalid"); });
  test("a compatible narrowing is carried as a student premise, not rejected", async () => { expect(await run(LN_NEG, "Assume x<-1.\nln(x^2) = 2ln(-x)\nf'(x) = 2/x")).toBe("verified"); });
});
describe("bypass 6: agreement of two routes with a shared blind spot", () => {
  test("s6-299 (domain components) is no longer verified", async () => { const c = byId("s6-299"); expect(await run(c.problem, c.studentWorking.text)).not.toBe("verified"); });
});

// ---------------------------------------------------------------------------------------------------------------- 4. valid work still passes
describe("valid alternative methods and valid prose are still accepted", () => {
  test("direct substitution is impossible; factoring then evaluating", async () => {
    expect(await run(LIMIT, "lim_(x->2) (x^2-4)/(x-2) = lim_(x->2) (x+2) = 4")).toBe("verified");
    expect(await run(LIMIT, "Factor first: x^2-4 = (x-2)(x+2).\nlim_(x->2) (x^2-4)/(x-2) = lim_(x->2) (x+2) = 4")).toBe("verified");
  });
  test("L'Hopital as an alternative method", async () => { expect(await run(LIMIT, "lim_(x->2) (x^2-4)/(x-2) = lim_(x->2) 2x/1 = 4")).toBe("verified"); });
  test("pure explanation between true lines does not harm a valid working", async () => {
    expect(await run(LIMIT, "We cancel the common factor.\nlim_(x->2) (x^2-4)/(x-2) = lim_(x->2) (x+2)\nNow evaluate at the point.\nlim_(x->2) (x+2) = 4")).toBe("verified");
  });
  test("a true relation stated inside a sentence is checked and accepted", async () => {
    expect(await run(LIMIT, "Since x^2-4 = (x-2)(x+2), the limit is\nlim_(x->2) (x+2) = 4")).not.toBe("invalid");
  });
});

// ---------------------------------------------------------------------------------------------------------------- 5. end-to-end preservation
describe("end-to-end claim preservation (the ledger is not downstream of any parser)", () => {
  const base = ["lim_(x->2) (x^2-4)/(x-2) = lim_(x->2) (x+2)", "lim_(x->2) (x+2) = 4"];
  const falseClaims = ["1+1=3", "2*3 = 7", "(x-2)(x+2) = x^2+4", "4 = 5", "x^2 - 4 = x^2 + 4"];
  const trueClaims = ["1+1=2", "2*3 = 6", "(x-2)(x+2) = x^2-4", "x^2 - 4 = (x-2)(x+2)"];
  const wraps = [(c: string) => `Note that ${c}.`, (c: string) => `Since ${c}, we proceed.`, (c: string) => `Recall: ${c}`, (c: string) => `We use the fact that ${c} here.`, (c: string) => `So ${c} and the factor cancels.`];
  test("PROPERTY: a false relation injected in prose at any position is never verified; a true one never makes a valid working invalid", async () => {
    let seed = 777; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; let falseSeen = 0, trueOk = 0, trueN = 0;
    for (let n = 0; n < 60; n++) {
      const isFalse = rnd() < 0.5; const pool = isFalse ? falseClaims : trueClaims; const c = pool[Math.floor(rnd() * pool.length)];
      const sentence = wraps[Math.floor(rnd() * wraps.length)](c); const pos = Math.floor(rnd() * 3); const lines = [...base]; lines.splice(pos > 2 ? 2 : pos, 0, sentence);
      const got = await run(LIMIT, lines.join("\n"));
      if (isFalse) { expect([sentence, got === "verified"]).toEqual([sentence, false]); falseSeen++; }
      else { trueN++; expect(got).not.toBe("invalid"); trueOk += got === "verified" ? 1 : 0; }
    }
    expect(falseSeen).toBeGreaterThan(10); expect(trueN).toBeGreaterThan(10);
  });
  test("the ledger of a verified submission accounts for every recognized claim", async () => {
    const env = await assessMathematicalWorking(LIMIT, nat("Factor first: x^2-4 = (x-2)(x+2).\nlim_(x->2) (x^2-4)/(x-2) = lim_(x->2) (x+2) = 4"));
    const led = (env.domainPayload as any).claimLedger; expect(led.claims.length).toBeGreaterThanOrEqual(2);
    for (const c of led.claims) expect(c.outcome).toBe("proven");
  });
  test("a claim dropped by a parser is still blocking: it is unsupported, never proven", async () => {
    const env = await assessMathematicalWorking(LIMIT, nat("lim_(x->2) (x^2-4)/(x-2) = 4"));
    expect(env.classification).toBe("verified");
  });
});

describe("a recognized check credits only what it examined", () => {
  const QUAD = { area: "polynomial", coefficientDomain: "real", data: { coefficients: ["1", "6", "13"] }, domain: "complex-polynomial", task: "quadratic-roots" };
  test("the discriminant sentence is credited alone, never together with an unexamined second claim", async () => {
    expect(await run(QUAD, "discriminant = 6² - 4·1·13 = -16\nThe discriminant is negative, so there are no real roots.")).toBe("verified");
    expect(await run(QUAD, "Note that the polynomial has no real roots and the function is odd.\ndiscriminant = 6² - 4·1·13 = -16\nThe discriminant is negative, so there are no real roots.")).not.toBe("verified");
  });
  test("a stated modelling assumption is a premise with provenance; denying a task assumption is invalid", async () => {
    const conj = { domain: "complex-polynomial", area: "polynomial", task: "conjugate-root", assumptions: ["real-coefficients"], coefficientDomain: "real", data: { coefficients: ["1", "-6", "13"], root: { re: "3", im: "2" } } };
    expect(await run(conj, "The coefficients of p are real.\nconj(3 + 2i) = 3 - 2i")).toBe("verified");
    expect(await run(conj, "The coefficients of p are not real.\nconj(3 + 2i) = 3 - 2i")).not.toBe("verified");
  });
});
