/**
 * G1 — strict parser properties (UNIFIED_GRADING_ARCHITECTURE.md §4.1, §12) and the published syntax examples.
 */
import { describe, expect, test } from "bun:test";
import { FAMILIES, pool, problemOf } from "../families.ts";
import { parseResponse, semanticsOf, type Semantics, type SemanticsKind } from "./parse.ts";
import { SYNTAX } from "./syntax.ts";

const S = (kind: SemanticsKind, mixed = false, options = 4): Semantics => ({ kind, mixed, options });
const P = (sem: Semantics, s: string) => parseResponse(sem, s);
const ok = (sem: Semantics, s: string) => { const r = P(sem, s); return r.status === "parsed" ? r.canonical : null; };
const why = (sem: Semantics, s: string) => { const r = P(sem, s); return r.status === "invalid" ? r.reason : r.status; };

describe("fixtures (hand-written; each names the rule it pins)", () => {
  test("total consumption: a trailing or leading operator is never dropped (D02)", () => {
    for (const s of ["177147 +", "177147+", "26 +", "0 +", "5 *", "3/", "-"]) expect(why(S("rational"), s)).not.toBe("parsed");
    for (const s of ["√22 +", "2√2 -", "* 3"]) expect(why(S("exact-real"), s)).not.toBe("parsed");
    for (const s of ["x +", "sin(x) *", "x^"]) expect(why(S("expression"), s)).not.toBe("parsed");
  });
  test("no digit joining: a space never joins two numerals (D02)", () => {
    for (const s of ["17714 7", "1 77147", "2 6", "1 0"]) expect(why(S("rational"), s)).toBe("split-number");
    for (const s of ["√2 2", "3√6 5"]) expect(why(S("exact-real"), s)).toBe("split-number");
    for (const s of ["-2 12", "1 2, 3"]) expect(why(S("solution-set"), s)).toBe("split-number");
    expect(why(S("tuple"), "(2 7/10, 1)")).toBe("split-number");
  });
  test("mixed numbers only where the semantics permit them (D06)", () => {
    expect(P(S("rational", true), "40 1/2")).toMatchObject({ status: "parsed", canonical: "40 1/2", value: "81/2" });
    expect(P(S("rational", true), "-2 3/4")).toMatchObject({ status: "parsed", value: "-11/4" });
    expect(why(S("rational", false), "40 1/2")).toBe("unsupported-notation");
    expect(why(S("rational", true), "3 5/4")).toBe("syntax");
  });
  test("ambiguous grouping is never guessed (D08)", () => {
    for (const s of ["1/2x", "−1/8x + 115/8", "x/2y", "2^3x", "e^2x", "sin x/2", "sin x^2", "sec x tan x", "√2x", "1/2 sin(x)", "e^x(2cos(x))"]) expect(P(S("expression"), s).status).toBe("ambiguous");
    for (const s of ["(1/2)x", "x/2", "1/(2x)", "2^(3x)", "(2^3)x", "x^2 cos(x)", "sin(x/2)", "sin(x)/2", "sec(x)tan(x)", "√(2x)", "(√2)x", "e^(x)(2cos(x))"]) expect(P(S("expression"), s).status).toBe("parsed");
  });
  test("ASCII and unicode spellings read the same value (D04, D05)", () => {
    expect(ok(S("exact-real"), "53 + 29sqrt(2)")).toBe(ok(S("exact-real"), "29√2 + 53"));
    expect(ok(S("exact-real"), "sqrt(22)")).toBe("√22");
    expect(ok(S("exact-real"), "-pi/6")).toBe(ok(S("exact-real"), "−π/6"));
    expect(ok(S("expression"), "tan^-1(x/2)")).toBe(ok(S("expression"), "tan⁻¹(x/2)"));
    expect(ok(S("real-subset"), "(-oo, 1) U (19, oo)")).toBe(ok(S("real-subset"), "(−∞, 1) ∪ (19, ∞)"));
    expect(ok(S("rational"), "+5")).toBe("5");
  });
  test("intervals: closed at infinity and empty intervals are not answers (D03)", () => {
    for (const s of ["[−∞, 1) ∪ (19, ∞)", "(−∞, 1) ∪ (19, ∞]", "[-oo, 3]"]) expect(why(S("real-subset"), s)).toBe("closed-at-infinity");
    for (const s of ["(6, 6)", "(7, 3)", "5 < x < 2"]) expect(why(S("real-subset"), s)).toBe("empty-interval");
    expect(why(S("real-subset"), "x < = 3")).toBe("syntax");
  });
  test("division by zero and option letters that do not exist are not answers (D01)", () => {
    for (const [k, s] of [["rational", "1/0"], ["expression", "1/0"], ["solution-set", "1/0, 2"], ["exact-real", "3/0"]] as const) expect(why(S(k), s)).toBe("division-by-zero");
    expect(why(S("choice", false, 2), "C")).toBe("no-such-option");
    expect(why(S("choice", false, 4), "B and C")).toBe("type-mismatch");
  });
  test("letters where a number is expected are a type mismatch, not a wrong number", () => {
    for (const s of ["xyz", "twelve", "x"]) expect(why(S("rational"), s)).toBe("type-mismatch");
    expect(why(S("exact-real"), "xyz")).toBe("type-mismatch");
  });
  test("braces make a set: an ordered list is not written with braces", () => { expect(why(S("tuple"), "{1, 2, 3}")).toBe("type-mismatch"); expect(ok(S("solution-set"), "{3, 2}")).toBe("3, 2"); });
  test("an equation answer: x = 4 is read as 4 only where the question has that unknown", () => {
    expect(P({ ...S("rational"), variable: "x" }, "x = 4")).toMatchObject({ status: "parsed", value: "4" });
    expect(why({ ...S("rational"), variable: "x" }, "y = 4")).not.toBe("parsed");
    expect(why(S("rational"), "x = 4")).not.toBe("parsed");
  });
});

describe("published syntax examples are exactly what the parser does", () => {
  for (const g of SYNTAX) test(g.kind, () => {
    for (const s of g.accepted) expect([g.kind, s, P(S(g.kind, false, 4), s).status]).toEqual([g.kind, s, "parsed"]);
    for (const s of g.mixedOnly ?? []) { expect(P(S(g.kind, true), s).status).toBe("parsed"); expect(P(S(g.kind, false), s).status).not.toBe("parsed"); }
    for (const x of g.notAccepted) expect([g.kind, x.text, P(S(g.kind, false, 4), x.text).status]).not.toEqual([g.kind, x.text, "parsed"]);
  });
});

describe("properties over released stored answers (deterministic sample of every family)", () => {
  const sample: { id: string; type: string; answer: string; options?: string[] }[] = [];
  for (const [fam] of FAMILIES) { const it = pool(fam).items; for (let i = 0; i < it.length; i += Math.max(1, Math.floor(it.length / 6))) { const p = it[i]; sample.push({ id: p.id, type: p.type, answer: p.answer, options: p.options }); const w = problemOf(`${p.id}:w`); if (w) sample.push({ id: w.id, type: w.type, answer: w.answer, options: w.options }); } }
  test("a space inserted between two digits never yields an accepted answer (except a valid mixed number where permitted)", () => {
    const bad: string[] = [];
    for (const q of sample) {
      const sem = semanticsOf(q);
      if (sem.kind === "choice" || sem.kind === "educator") continue;
      for (const m of q.answer.matchAll(/\d{2,}/g)) {
        const at = m.index! + 1, mutated = q.answer.slice(0, at) + " " + q.answer.slice(at);
        const r = parseResponse(sem, mutated);
        if (r.status === "parsed" && !(sem.mixed && /^-?\d+ \d+\/\d+$/.test(r.canonical))) bad.push(`${q.id}: ${JSON.stringify(mutated)} -> ${r.canonical}`);
      }
    }
    expect(bad).toEqual([]);
  }, 600_000);
  test("an operator appended to any stored answer is never accepted", () => {
    const bad: string[] = [];
    for (const q of sample) { const sem = semanticsOf(q); if (sem.kind === "choice" || sem.kind === "educator") continue; for (const op of [" +", " -", "*", "/"]) { const r = parseResponse(sem, q.answer + op); if (r.status === "parsed") bad.push(`${q.id}: ${JSON.stringify(q.answer + op)}`); } }
    expect(bad).toEqual([]);
  }, 600_000);
  test("every stored answer parses, except the known ambiguous notation of aqd2 (D18, open)", () => {
    const bad = sample.filter((q) => parseResponse(semanticsOf(q), q.answer).status !== "parsed").map((q) => `${q.id}: ${q.answer}`);
    expect(bad.filter((b) => !b.startsWith("gen:aqd2:"))).toEqual([]);
  }, 600_000);
});
