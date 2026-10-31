/**
 * teaching-contract@1: semantic alignment, not rendering. These tests check that a section's text, its question, its
 * solution and its picture are about the same mathematical instance, that every arithmetic claim holds and the result is
 * the checked answer, and that labels follow roles. They do not (and cannot) establish that the teaching is good:
 * explanations remain for educator review.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { modules, question, type Module } from "./content";
import { FAMILIES, pool, problemOf } from "./families";
import { contractReport, evalArithmetic, lessonBlocks, ROLE_LABEL } from "./teaching-contract";

const LONG = 120_000;
const affig = FAMILIES.get("affig")!;
const teach = affig.teach!.instance!;
const PATTERNS = ["square", "triangular", "rectangular", "cube", "doubling", "odd"];
const promptTerms = (prompt: string) => (/: ([\d, ]+)\./.exec(prompt)?.[1] ?? "").split(",").map((x) => Number(x.trim()));
const numbers = (s: string) => (s.match(/\d+/g) ?? []).map(Number);

describe("arithmetic claims", () => {
  test("plain arithmetic evaluates exactly, anything else is refused", () => {
    expect(evalArithmetic("2 × 13 − 1")).toBe(25);
    expect(evalArithmetic("4 × (4 + 1) ÷ 2")).toBe(10);
    expect(evalArithmetic("2^11")).toBe(2048);
    expect(evalArithmetic("1 + 2 + 3 + 4")).toBe(10);
    expect(() => evalArithmetic("n × n")).toThrow();
    expect(() => evalArithmetic("2 ×")).toThrow();
  });
});

describe("affig (number patterns): every question of all six kinds is taught as itself", () => {
  const items = pool("affig").items.filter((p) => p.form === "typed");
  test("the pool covers all six kinds", () => {
    expect(new Set(items.map((p) => p.params[0]))).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  }, LONG);

  test("worked solution: every claim holds and the result is the question's checked answer", () => {
    for (const p of items) {
      const t = teach(p.params);
      for (const s of t.worked.steps) for (const c of s.claims ?? []) expect(evalArithmetic(c.expr), `${p.id}: ${c.expr}`).toBe(c.value);
      expect(t.worked.result, p.id).toBe(Number(p.answer));
      expect(affig.validate(p.params, t.worked.result), p.id).toBe(true);
      // the last step states the result for this question's own term
      expect(t.worked.steps.at(-1)!.expression.endsWith(`= ${p.answer}`), p.id).toBe(true);
      expect(t.worked.steps.at(-1)!.claims?.some((c) => c.value === Number(p.answer)), p.id).toBe(true);
    }
  }, LONG);

  test("concept text, picture and question share the same terms (the original defect: square-number text on an odd-number table)", () => {
    for (const p of items) {
      const t = teach(p.params), given = promptTerms(p.prompt);
      expect(given.length, p.id).toBe(4);
      // the concept quotes the question's own first terms, in order
      expect(t.concept.text[0].includes(given.join(", ")), `${p.id}: ${t.concept.text[0]}`).toBe(true);
      const r = t.representation!;
      if (r.kind === "sequence-table") expect(r.rows.map((x) => x.value), p.id).toEqual(given);
      else expect(given.includes(r.value), p.id).toBe(true);
      // and names its own kind of pattern
      expect(t.concept.title.toLowerCase(), p.id).toContain(PATTERNS[p.params[0]].slice(0, 5));
    }
  }, LONG);

  test("pictures are the actual objects: square arrays, rectangular arrays, triangular arrangements, sequence tables", () => {
    const at = (kind: number) => teach([kind, 10]).representation!;
    expect(at(0)).toMatchObject({ kind: "dot-array", rows: 4, cols: 4, value: 16 });
    expect(at(1)).toMatchObject({ kind: "dot-triangle", rows: 4, value: 10 });
    expect(at(2)).toMatchObject({ kind: "dot-array", rows: 4, cols: 5, value: 20 });
    expect(at(3)).toMatchObject({ kind: "sequence-table" });
    expect(at(4)).toMatchObject({ kind: "sequence-table", change: "ratio" });
    expect(at(5)).toMatchObject({ kind: "sequence-table", change: "difference" });
    for (const kind of [3, 4, 5]) {
      const r = at(kind) as Extract<ReturnType<typeof at>, { kind: "sequence-table" }>;
      for (const row of r.rows) if (row.how && row.how !== "start") expect(evalArithmetic(row.how), `${kind}: ${row.how}`).toBe(row.value);
    }
    // the odd-number table has a constant gap of 2; the doubling table a constant ratio of 2
    const odd = at(5) as Extract<ReturnType<typeof at>, { kind: "sequence-table" }>;
    expect(odd.rows.slice(1).map((r, k) => r.value - odd.rows[k].value)).toEqual([2, 2, 2]);
    const dbl = at(4) as Extract<ReturnType<typeof at>, { kind: "sequence-table" }>;
    expect(dbl.rows.slice(1).map((r, k) => r.value / dbl.rows[k].value)).toEqual([2, 2, 2]);
  });

  test("solutions differ by concept: no universal step template", () => {
    const shapes = new Set([0, 1, 2, 3, 4, 5].map((k) => teach([k, 10]).worked.steps.length));
    expect(shapes.size).toBeGreaterThan(1);
    const firstSteps = new Set([0, 1, 2, 3, 4, 5].map((k) => teach([k, 10]).worked.steps[0].explanation));
    expect(firstSteps.size).toBe(6);
  });

  test("'Look at the gaps' is only paired with patterns it explains, and its text is about that pattern", () => {
    const gaps = affig.teach!.alternatives!.find((a) => a.id === "gaps")!;
    expect([0, 1, 2, 3, 4, 5].filter((k) => gaps.applies!([k, 10]))).toEqual([0, 1, 2, 5]);
    for (const k of [0, 1, 2, 5]) {
      const text = gaps.textFor!([k, 10]).join(" "), terms = [1, 2, 3, 4].map((n) => teach([k, n]).worked.result);
      expect(text.includes(terms.join(", ")), `${k}: ${text}`).toBe(true);
      for (const v of numbers(text)) expect([...terms, 1, 2, ...terms.slice(1).map((t, i) => t - terms[i])].includes(v), `${k}: ${v} in ${text}`).toBe(true);
    }
  });
});

describe("lesson assembly (affig reference lesson)", () => {
  const m = modules.find((x) => x.competency === affig.competency)!;
  const blocks = lessonBlocks(m);
  test("every section has a role and its own question; no violations", () => {
    expect(blocks.map((b) => b.role)).toEqual(["concept", "worked-example", "strategy", "misconception"]);
    for (const b of blocks) {
      expect(b.violations, `${b.title}`).toEqual([]);
      expect(b.instance, b.title).toMatch(/^gen:affig:\d,\d+$/);
    }
    // sections are about different kinds of pattern, each taught as itself
    const kinds = blocks.map((b) => problemOf(b.instance!)!.params[0]);
    expect(new Set(kinds).size).toBe(blocks.length);
    expect(affig.teach!.alternatives![0].applies!(problemOf(blocks[2].instance!)!.params)).toBe(true);
  });

  test("the text, solution and picture of each section are about its question", () => {
    for (const b of blocks) {
      const p = problemOf(b.instance!)!, terms = promptTerms(p.prompt).join(", ");
      expect(b.text.join(" ").includes(terms) || b.role === "worked-example", `${b.title}: ${b.text.join(" ")}`).toBe(true);
      if (b.worked) expect(b.worked.question).toBe(question(p.id).prompt);
      if (b.representation?.kind === "sequence-table") expect(b.representation.rows.map((r) => r.value).join(", ")).toBe(terms);
      if (b.widget) expect(JSON.stringify(b.widget)).toContain(`"${promptTerms(p.prompt)[3]}"`);
    }
  });

  test("only the complete, checked solution is labelled Worked example; mechanical checks are kept apart from explanations", () => {
    const w = blocks.find((b) => b.role === "worked-example")!;
    expect(w.label).toBe(ROLE_LABEL["worked-example"]);
    expect(w.worked!.verified).toBe(true);
    expect(w.worked!.source).toBe("contract");
    expect(w.claims.verified.length).toBeGreaterThan(1);
    expect(w.claims.review.length).toBeGreaterThan(1); // explanations still need an educator
    expect(blocks.filter((b) => b.label === "Worked example").length).toBe(1);
    expect(blocks.some((b) => b.widget?.type === "dots")).toBe(false);
  });

  test("the original defect is caught: family-level square/triangular gaps text paired with an odd-number question", () => {
    const wrong: Module = { ...m, chapter: [{ ...m.chapter[0] }], strategies: [{ ...m.strategies[1], screens: [{ title: "Look at the gaps", role: "strategy", instance: "gen:affig:5,6", text: affig.teach!.alternatives![0].text, widget: affig.teach!.alternatives![0].visual!([5, 6]) as never }] }] };
    const b = lessonBlocks(wrong).find((x) => x.title === "Look at the gaps")!;
    expect(b.violations).toContain("text-not-instance");
  });
});

describe("platform-wide", () => {
  test("a section is labelled Worked example only when its solution is complete and checked", () => {
    for (const m of modules) for (const b of lessonBlocks(m)) {
      if (b.label === ROLE_LABEL["worked-example"]) expect(b.worked?.verified, `${m.competency} ${b.title}`).toBe(true);
      if (b.role === "worked-example" && !b.worked?.verified) expect(b.label, `${m.competency} ${b.title}`).toBe("Method");
    }
  }, LONG);

  test("Tamil Nadu Grade 10 Relations keeps its three-step kernel worked example", () => {
    const b = lessonBlocks(modules.find((m) => m.competency === "MATH.algebra.relations")!)[0];
    expect(b.worked!.verified).toBe(true);
    expect(b.worked!.steps.map((s) => s.expression)).toEqual(["n(A × B) = n(A) × n(B)", "6 = 3 × n(B)", "6 ÷ 3 = 2"]);
  }, LONG);

  test("ratchet: no rule and no module has more violations than the baseline", () => {
    const base = JSON.parse(readFileSync(join(import.meta.dirname, "../../../content/learning/teaching-contract-baseline.v1.json"), "utf8"));
    const now = contractReport(modules);
    for (const [rule, n] of Object.entries(now.byRule)) expect(n, rule).toBeLessThanOrEqual(base.byRule[rule] ?? 0);
    for (const [mod, rules] of Object.entries(now.byModule)) for (const [rule, n] of Object.entries(rules)) expect(n, `${mod} ${rule}`).toBeLessThanOrEqual(base.byModule[mod]?.[rule] ?? 0);
    expect(now.byModule[affig.competency]).toBeUndefined();
  }, LONG);
});
