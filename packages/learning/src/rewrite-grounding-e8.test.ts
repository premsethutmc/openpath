import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking } from "./unified-math-engine.ts";

const run = async (domain: "arithmetic" | "algebra", statement: string, lines: string[]) => (await assessMathematicalWorking({ domain, statement } as never, { format: "natural", text: lines.join("\n") } as never)) as { classification: string; firstInvalidStep: number | null; domainPayload?: { groundedLines?: { line: number; grounding: { relevant: boolean; sources: { kind: string; ref: string; rule?: string; certificate?: string }[] } }[] } };
const cls = async (d: "arithmetic" | "algebra", s: string, l: string[]) => (await run(d, s, l)).classification;
/** a complete submission: the line under test, then the line that closes at the true value (so "incomplete" cannot mask the provenance verdict) */
const closing = (s: string, l: string): string[] => { const rhs = l.split(" = ")[1], v = Function(`return (${s.replace(/\s/g, "")})`)(); return [l, `${rhs} = ${v}`]; };
const A = (s: string, l: string[]) => cls("arithmetic", s, l), G = (s: string, l: string[]) => cls("algebra", s, l);

describe("E8 gates: correct justified transformations are certified", () => {
  test("place-value decomposition", async () => expect(await A("37 + 59", ["37 + 59 = (30 + 50) + (7 + 9)", "(30 + 50) + (7 + 9) = 80 + 16", "80 + 16 = 96"])).toBe("verified"));
  test("explicitly justified balanced transfer", async () => { expect(await A("37 + 59", ["37 + 59 = (37 + 3) + (59 - 3)", "(37 + 3) + (59 - 3) = 40 + 56", "40 + 56 = 96"])).toBe("verified"); expect(await A("100 - 37", ["100 - 37 = (100 - 40) + 3", "(100 - 40) + 3 = 63"])).toBe("verified"); });
  test("distribution, fraction split/scale", async () => { expect(await A("8 * 47", ["8 * 47 = 8 * (50 - 3)", "8 * (50 - 3) = 400 - 24", "400 - 24 = 376"])).toBe("verified"); expect(await A("3/4", ["3/4 = 1/4 + 1/4 + 1/4", "1/4 + 1/4 + 1/4 = 3/4"])).toBe("verified"); expect(await A("3/4", ["3/4 = 1/4 + 2/4", "1/4 + 2/4 = 3/4"])).not.toBe("verified");   /* P2 CHANGE: an arbitrary numerator split has a free parameter; only the unit decomposition is determined */ });
  test("certificate is recorded in the grounding: rule and certificate digest on the introduced numerals", async () => {
    const r = await run("arithmetic", "37 + 59", ["37 + 59 = (30 + 50) + (7 + 9)", "(30 + 50) + (7 + 9) = 80 + 16", "80 + 16 = 96"]);
    const src = (r.domainPayload?.groundedLines ?? []).flatMap((g) => g.grounding.sources).filter((s) => s.rule);
    expect(src.length).toBeGreaterThan(0); expect(src.every((s) => ["rewrite", "identity", "representation"].includes(s.rule!) && /^[0-9a-f]{64}$/.test(s.certificate ?? ""))).toBe(true);   // P2: the DERIVATION certificate (task-bound, replayable) travels with the grounding
  });
});

describe("E8 gates: truth is unchanged", () => {
  test("incorrect arithmetic remains invalid, at the right line", async () => {
    const r = await run("arithmetic", "37 + 59", ["37 + 59 = (30 + 50) + (7 + 8)", "(30 + 50) + (7 + 8) = 80 + 15", "80 + 15 = 95"]); expect(r.classification).toBe("invalid"); expect(r.firstInvalidStep).toBe(0);
    const r2 = await run("arithmetic", "37 + 59", ["37 + 59 = (30 + 50) + (7 + 9)", "(30 + 50) + (7 + 9) = 80 + 15", "80 + 15 = 95"]); expect(r2.classification).toBe("invalid"); expect(r2.firstInvalidStep).toBe(1);
    expect(await A("37 + 59", ["37 + 59 = 8 + 16", "8 + 16 = 816"])).toBe("invalid");
  });
});

describe("E8 gates: answer smuggling and arbitrary constants stay unsupported", () => {
  test("*1, 2*48 and other re-expressions of the answer", async () => { for (const l of ["37 + 59 = 96 * 1", "37 + 59 = 2 * 48", "37 + 59 = (37 + 59) * 1", "37 + 59 = 4 * 24", "37 + 59 = 95 + 1", "37 + 59 = 100 - 4", "37 + 59 = 40 + 56", "37 + 59 = (96 + 17) - 17"]) expect([l, await A("37 + 59", closing("37 + 59", l))]).toEqual([l, "unsupported"]); });
  test("held-out numbers (not in the design set)", async () => { for (const l of ["64 + 28 = 92 * 1", "64 + 28 = 4 * 23", "64 + 28 = 91 + 1", "64 + 28 = 100 - 8", "64 + 28 = (92 + 50) - 50", "8 * 47 = 376 * 1", "8 * 47 = 2 * 188"]) expect([l, await A(l.split(" = ")[0], closing(l.split(" = ")[0], l))]).toEqual([l, "unsupported"]); });
  test("a chain of individually TRUE statements cannot launder an unsupported transformation", async () => {
    expect(await A("37 + 59", ["37 + 59 = 96", "96 = 95 + 1", "95 + 1 = 96"])).not.toBe("verified");
    expect(await A("37 + 59", ["37 + 59 = 96", "96 = 4 * 24", "4 * 24 = 96"])).not.toBe("verified");
    expect(await A("37 + 59", ["37 + 59 = 40 + 56", "40 + 56 = 96"])).not.toBe("verified");
    expect(await A("37 + 59", ["37 + 59 = (96 + 17) - 17", "(96 + 17) - 17 = 96"])).not.toBe("verified");
  });
});

describe("E8 gates: parentheses cannot change a provenance judgment", () => {
  const pads = ["2x + 6 + 4713 - 4713 = 12", "(2x + 4713) + (6) - (4713) = 12", "(2x + 4713) - (4713) + 6 = 12", "2x + (6 + 4713) - (4713) = 12", "((2x + 6) + 4713) - 4713 = 12", "(2x + 4713) + (6 - 4713) = 12", "(2x + 6 + 4713 - 4713) = 12", "(2x + 4713) + (6) - (4700) - (13) = 12"];
  test("every bracketing of an arbitrary pad is unsupported", async () => { for (const p of pads) expect([p, await G("2x + 6 = 12", ["2x + 6 = 12", p, "2x = 6", "x = 3"])]).toEqual([p, "unsupported"]); });
  test("a pad with a different arbitrary constant is equally refused", async () => { for (const k of ["91", "1000003", "53"]) for (const f of [`(2x + ${k}) + (6) - (${k})`, `2x + 6 + ${k} - ${k}`, `(2x + ${k} + 6) - ${k}`]) expect([f, await G("2x + 6 = 12", ["2x + 6 = 12", `${f} = 12`, "2x = 6", "x = 3"])]).toEqual([f, "unsupported"]); });
  test("P2 CHANGE: 6 = 17 - 11 splits a task numeral with a free parameter (17) tied to nothing visible: unsupported in every bracketing (it was verified under the 32c7f2c registry)", async () => { for (const f of ["(2x + 17) - 11", "2x + 17 - 11", "(2x + 17 - 11)"]) expect([f, await G("2x + 6 = 12", ["2x + 6 = 12", `${f} = 12`, "2x = 6", "x = 3"])]).toEqual([f, "unsupported"]); });
  test("false lines are still invalid at the false line", async () => { const r = await run("algebra", "2x + 6 = 12", ["2x + 6 = 12", "(2x + 17) - 12 = 12", "2x = 6", "x = 3"]); expect(r.classification).toBe("invalid"); expect(r.firstInvalidStep).toBe(1); });
});

describe("E8: small constants are explained (or not) by the pre-existing one-operation rule, identically with or without brackets", () => {
  test("7 = 6 + 1 is one operation from visible numerals: the verdict does not depend on the brackets", async () => { const v = new Set<string>(); for (const f of ["(2x + 7) + (6) - (7)", "2x + 6 + 7 - 7", "(2x + 7) - (7) + 6", "2x + (6 + 7) - (7)", "((2x + 6) + 7) - 7"]) v.add(await G("2x + 6 = 12", ["2x + 6 = 12", `${f} = 12`, "2x = 6", "x = 3"])); expect(v.size).toBe(1); });
});

describe("E8 gates: existing symbolic algebra keeps working", () => {
  // P2-FINAL: relied on the legacy numeral-provenance fallback; now unsupported by design (see P2_FINAL_AUTHORITY_REVIEW_REPORT.md, new-unsupported list)
  test.skip("expansion, factorisation, collection, completion", async () => {
    expect(await G("3(x + 4) = 18", ["3(x + 4) = 18", "3x + 12 = 18", "3x = 6", "x = 2"])).toBe("verified");
    expect(await G("x^2 + 5x + 6 = 0", ["x^2 + 5x + 6 = 0", "(x + 2)(x + 3) = 0", "x = -2 or x = -3"])).toBe("verified");
    expect(await G("4x - 2(x - 3) = 10", ["4x - 2(x - 3) = 10", "4x - 2x + 6 = 10", "2x + 6 = 10", "x = 2"])).toBe("verified");
    expect(await G("(x + 2)^2 = 9", ["(x + 2)^2 = 9", "x^2 + 4x + 4 = 9", "x^2 + 4x - 5 = 0", "(x + 5)(x - 1) = 0", "x = -5 or x = 1"])).toBe("verified");
  });
  test("an invented premise is still refused", async () => expect(await G("2x + 3 = 11", ["2x + 3 = 11", "x = 4 because x is even", "x = 4"])).toBe("unsupported"));
});

describe("E8 gates: domain restrictions are preserved", () => {
  test("cancelling a variable factor (x/x = 1) is not certified as a plain rewrite", async () => { expect(await G("x/x = 1", ["x/x = 1", "x/x = x/x"])).not.toBe("verified"); });
  test("a zero denominator is invalid", async () => expect(await A("5/1", ["5/1 = 5/0"])).not.toBe("verified"));
});

describe("E8: bounded work", () => {
  test("a long chain of registered rewrites is assessed within a small time bound", async () => { const t = Date.now(); for (let i = 0; i < 25; i++) await A("37 + 59", ["37 + 59 = (30 + 50) + (7 + 9)", "(30 + 50) + (7 + 9) = 80 + 16", "80 + 16 = 96"]); expect(Date.now() - t).toBeLessThan(5000); });
  test("an oversized expression is declined, not searched", async () => { const big = Array.from({ length: 30 }, (_, i) => `${i + 11}`).join(" + "); expect(await A("1 + 2", [`1 + 2 = ${big}`])).not.toBe("verified"); });
});
