/** E7 Phase 4: one immutable provenance-aware proof context shared by every route and by the certification boundary. */
import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import { buildProofContext, relateStudentRestriction, routeUse, withProved, withStudent } from "./proof-context.ts";
import { parseConstraints } from "./claim-certifier.ts";

const K = (v: string) => ({ kind: "constant", value: v }), X = { kind: "variable", name: "x" };
const add = (...t: unknown[]) => ({ kind: "add", terms: t }), mul = (...f: unknown[]) => ({ kind: "multiply", factors: f }), pw = (b: unknown, e: number) => ({ kind: "power", base: b, exponent: e }), ln = (a: unknown) => ({ kind: "log", argument: a });
const run = (p: unknown, text: string) => assessMathematicalWorking(p as never, { format: "natural", text });
const payload = (a: unknown) => (a as { domainPayload: { proofContext: any } }).domainPayload.proofContext;
const INV = mul(K("1"), pw(X, -1));
const integral = (extra: object) => ({ domain: "calculus", task: "indefinite-integral", variable: "x", integrand: INV, ...extra });
const rel = (p: unknown, t: string) => relateStudentRestriction(buildProofContext(p), parseConstraints(t)!, t);

describe("E7 Phase 4: the context is immutable and kinds are never merged", () => {
  test("built once, frozen, extended only by returning a new context; the task digest does not change", () => {
    const c = buildProofContext(integral({ restrictions: ["x != 1"], domainComponents: ["x<0", "x>2"] }));
    expect(Object.isFrozen(c)).toBe(true); expect(Object.isFrozen(c.branches)).toBe(true);
    const c2 = withProved(c, [{ ref: "line-1", text: "x = 3" }]);
    expect(c2).not.toBe(c); expect(c.proved.length).toBe(0); expect(c2.proved.length).toBe(1); expect(c2.digest).toBe(c.digest);
    const c3 = withStudent(c2, [{ text: "x>5", line: 2, relation: "narrows", coveredBranches: [1], obligation: "o" }]);
    expect(c3.student.length).toBe(1); expect(c3.restrictions).toEqual(["x != 1"]); // the task is untouched by a student assumption
    expect(() => { (c as { restrictions: string[] }).restrictions.push("x>9"); }).toThrow();
  });
  test("domain components stay alternatives (never one conjunction)", () => {
    const c = buildProofContext(integral({ domainComponents: ["x<-1", "x>2"] }));
    expect(c.branches).toEqual(["x<-1", "x>2"]);
    expect(rel(integral({ domainComponents: ["x<-1", "x>2"] }), "x>2").relation).toBe("narrows"); // fits one branch only
    expect(rel(integral({ domainComponents: ["x<-1", "x>2"] }), "x!=1").relation).toBe("implied"); // holds on every branch
  });
  test("implied restrictions come from the typed expression, not from the working", () => {
    const c = buildProofContext({ domain: "calculus", task: "derivative", variable: "x", expression: ln(add(X, K("-1"))) });
    expect(c.implied.map((i) => i.text)).toEqual(["x > 1"]);
    expect(rel({ domain: "calculus", task: "derivative", variable: "x", expression: ln(add(X, K("-1"))) }, "x>1").relation).toBe("restates");
    expect(rel({ domain: "calculus", task: "derivative", variable: "x", expression: ln(add(X, K("-1"))) }, "x<1").relation).toBe("contradicts");
  });
});

describe("E7 Phase 4: a student assumption cannot override, strengthen or contradict the task without an obligation", () => {
  test("contradicting the task restriction is invalid", async () => {
    const a = await run(integral({ restrictions: ["x<0"] }), "Assume x > 0.\n∫ 1/x dx = ln(x) + C");
    expect(a.classification).toBe("invalid");
  });
  test("an assumption that fits only one of the task's alternative branches is not verified", async () => {
    const a = await run(integral({ domainComponents: ["x<0", "x>0"] }), "Assume x > 0.\n∫ 1/x dx = ln(x) + C");
    expect(a.classification).not.toBe("verified");
    expect(payload(a).studentAssumptions[0].relation).toBe("narrows");
    expect(payload(a).studentAssumptions[0].obligation).toContain("branch");
  });
  test("the same working over a task with no stated domain is a disclosed scoping choice, still reported", async () => {
    const a = await run(integral({}), "Assume x > 0.\n∫ 1/x dx = ln(x) + C");
    expect(payload(a).studentAssumptions[0].relation).toBe("narrows");
    expect(payload(a).studentAssumptions[0].obligation).toBeTruthy();
  });
  test("restating an implied restriction is accepted and recorded as implied", async () => {
    const p = { domain: "calculus", task: "derivative", variable: "x", expression: ln(add(X, K("-1"))) };
    const a = await run(p, "Since the argument must be positive, x > 1.\nd/dx[ln(x - 1)] = 1/(x - 1)");
    expect(payload(a).task.impliedRestrictions).toEqual(["x > 1"]);
  });
  test("a student-introduced quantity unrelated to the task variables is carried as student-stated", async () => {
    const a = await run(integral({}), "Assume k > 0.\n∫ 1/x dx = ln|x| + C");
    expect(payload(a).studentAssumptions.length).toBe(1);
    expect(payload(a).studentAssumptions.every((s: { relation: string }) => s.relation === "new-quantity")).toBe(true);
  });
});

describe("E7 Phase 4: the same context reaches every route; what a legacy route cannot represent is exposed", () => {
  test("all routes carry the same task digest and the limitations are listed", async () => {
    const a = await run(integral({ restrictions: ["x != 1"], domainComponents: ["x<0", "x>0"] }), "∫ 1/x dx = ln|x| + C");
    const c = payload(a);
    expect(c.routesShareContext).toBe(true);
    const routes = Object.fromEntries(c.routes.map((r: { route: string }) => [r.route, r]));
    expect(routes["e6-calculus"].consumed).toContain("branches");
    expect(routes["base-algebra"].limitation).toContain("does not read");
    expect(routes["e5-geocalc"].limitation).toContain("flattens");
    expect(new Set(c.routes.map((r: { contextDigest: string }) => r.contextDigest)).size).toBe(1);
  });
  test("an unreadable task restriction is reported by the route that cannot read it, not dropped", async () => {
    const a = await run(integral({ restrictions: ["x is a prime"] }), "∫ 1/x dx = ln|x| + C");
    const c = payload(a);
    expect(c.task.unreadable).toEqual(["x is a prime"]);
    expect(c.routes.find((r: { route: string }) => r.route === "e6-calculus").limitation).toContain("x is a prime");
  });
  test("routeUse is a pure function of the context", () => {
    const c = buildProofContext(integral({ domainComponents: ["x<0", "x>0"] }));
    expect(routeUse(c, "e6-calculus")).toEqual(routeUse(c, "e6-calculus"));
    expect(routeUse(c, "no-such-route").limitation).toContain("unknown route");
  });
});

describe("E7 Phase 4: missing scenario data is missing evidence", () => {
  const FIN = { domain: "probability-statistics", area: "probability", task: "finite", data: { favourable: 6, total: 45 }, assumptions: ["equiprobable"] };
  test("quantities only the student stated are an unresolved premise, and the calculation is not certified by its final value", async () => {
    const a = await run(FIN, "P(two white), 4 white, 6 black, no replacement\n4/10·3/9 = 12/90 = 2/15");
    expect(a.classification).not.toBe("verified");
    expect(payload(a).unresolvedPremises.length).toBeGreaterThan(0);
    expect(payload(a).unresolvedPremises[0].text).toContain("nothing in the task supplies it");
  });
  test("the expected answer is never used to reconstruct a premise", async () => {
    const a = await run(FIN, "2/15");
    expect(a.classification).not.toBe("verified");
  });
});

describe("E7 Phase 4: unfamiliar combinations of supported operations", () => {
  test("a derivative whose domain is the intersection of an implied restriction and a task branch", async () => {
    const p = { domain: "calculus", task: "derivative", variable: "x", expression: ln(add(X, K("-1"))), domainComponents: ["x>1", "x>3"] };
    const a = await run(p, "d/dx[ln(x - 1)] = 1/(x - 1)");
    expect(payload(a).routesShareContext).toBe(true);
    expect(["verified", "missing-assumption", "incomplete"]).toContain(a.classification);
  });
  test("a student restriction contradicting an implied restriction is invalid even with no task restriction", async () => {
    const p = { domain: "calculus", task: "derivative", variable: "x", expression: ln(add(X, K("-1"))) };
    expect((await run(p, "Assume x < 1.\nd/dx[ln(x - 1)] = 1/(x - 1)")).classification).toBe("invalid");
  });
  test("Vieta product with a stated real-coefficient assumption keeps assumption provenance and the grounding", async () => {
    const p = { area: "polynomial", coefficientDomain: "real", assumptions: ["real-coefficients"], data: { coefficients: ["2", "-6", "5"] }, domain: "complex-polynomial", task: "vieta-product" };
    const a = await run(p, "The coefficients are real.\nproduct of roots = c/a = 5/2");
    expect(a.classification).toBe("verified");
    expect(payload(a).studentAssumptions.length).toBe(0);
    expect((await run(p, "The coefficients are real.\n10/4 = 5/2")).classification).not.toBe("verified");
  });
});
