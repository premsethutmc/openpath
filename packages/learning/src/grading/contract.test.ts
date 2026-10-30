/**
 * Stage 3 acceptance: contract openpath-assessment@2 and required-form enforcement (approved policy P2).
 */
import { formCertified } from "./certify.ts";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../families.ts";
import { decide } from "../grade.ts";
import { gradeRequest } from "../server-grader.ts";
import { semanticsOf } from "./parse.ts";
import { contractV2, CONTRACT_SCHEMA } from "./contract.ts";
import { declaredRules, FORM_INSTRUCTIONS, statedRules } from "./forms.ts";

const LONG = 900_000;
const first = (f: string, pred: (p: { answer: string; id: string }) => boolean = () => true) => pool(f).items.find(pred)!.id;
const verdict = (id: string, r: string) => { const a = decide(id, r); return { credit: a.credit, form: a.form?.result ?? null }; };

describe("contract@2", () => {
  test("is built from the definition, versioned and identified by its hash", () => {
    const id = first("aifdiv"), c = contractV2(id);
    expect(c).toMatchObject({ schema: CONTRACT_SCHEMA, questionId: id, source: { kind: "generator", family: "aifdiv" }, semantics: { kind: "rational", mixed: true }, keyAuthority: "generator-only" });
    // stage 5: the status follows the certification registry (audit evidence), and is not part of the contract's meaning or hash
    expect(c.status).toBe(formCertified(id) ? "certified" : "provisional");
    expect(c.contractHash).toMatch(/^[0-9a-f]{64}$/);
    expect(contractV2(first("aogp")).keyAuthority).toBe("independent-kernel");
    expect(contractV2("gen:adexp:9,8,5,7:w").status).toBe("quarantined");
  });
  test("a form rule is enforced only when the family declares it AND the question states it", () => {
    const typed = first("lineq"), word = `${typed}:w`;
    expect(contractV2(typed).form.map((f) => f.rule)).toEqual(["inequality-notation"]);
    if (problemOf(word)) expect(contractV2(word).form).toEqual([]); // the word form does not state it, so it is not enforced
  });
  test("the declared rules file is current with the families' wording", () => {
    const file = JSON.parse(readFileSync(new URL("../../../../content/learning/form-rules.v1.json", import.meta.url), "utf8"));
    const found: Record<string, Set<string>> = {};
    for (const [fam, def] of FAMILIES) for (const q of pool(fam).items) for (const s of ["", ":w"]) {
      const p = s ? (def.word ? problemOf(q.id + s) : null) : q;
      if (!p || p.type === "choice") continue;
      for (const r of statedRules(p.prompt, semanticsOf(p).kind)) (found[fam] ??= new Set()).add(r.rule);
    }
    const now = Object.fromEntries(Object.entries(found).map(([f, s]) => [f, [...s].sort()]));
    expect(now).toEqual(file.families);
  }, LONG);
});

describe("required forms (P2)", () => {
  test("simplest form: an equal but unreduced or decimal answer is incorrect, the reduced one correct", () => {
    const id = first("aifdiv", (p) => p.answer === "4");
    expect(verdict(id, "4")).toEqual({ credit: true, form: "satisfied" });
    for (const r of ["8/2", "4.0"]) expect(verdict(id, r)).toEqual({ credit: false, form: "violated" });
    const m = first("aifmul", (p) => p.answer.includes("/")), [a, b] = problemOf(m)!.answer.split("/");
    expect(verdict(m, `${2 * +a}/${2 * +b}`)).toEqual({ credit: false, form: "violated" });
    expect(gradeRequest({ id: m, response: `${2 * +a}/${2 * +b}` }).credit).toBe(false); // the trusted grader applies the same rule
  });
  test("interval notation vs inequality, as the question states", () => {
    const iv = first("aeineqs"), ineq = first("lineq");
    const lo = problemOf(iv)!.answer.replace(/[()[\]]/g, "").split(",").map((x) => x.trim().replace("−", "-"));
    expect(verdict(iv, `${lo[0]} < x < ${lo[1]}`).credit).not.toBe(true);
    expect(verdict(ineq, "(0, ∞)").credit).not.toBe(true);
  });
  test("expand: a factored answer is incorrect, the expanded one correct", () => {
    const id = first("aobinexp", (p) => p.answer === "x² − 10x + 25");
    expect(verdict(id, "(x - 5)^2")).toEqual({ credit: false, form: "violated" });
    expect(verdict(id, "x^2 - 10x + 25")).toEqual({ credit: true, form: "satisfied" });
  });
  test("simplest surd and ratio", () => {
    expect(verdict("gen:surd:8", "sqrt(8)")).toEqual({ credit: false, form: "violated" });
    expect(verdict("gen:surd:8", "2√2").credit).toBe(true);
    const r = first("ajrat", (p) => p.answer === "1:2");
    expect(verdict(r, "2:4").credit).toBe(false); // incorrect; the reason becomes "required-form" once values are compared by value (stage 4)
  });
  test("a form rule never turns a wrong value into a correct one, and no rule means equal forms are not penalised for form", () => {
    expect(verdict(first("aifdiv", (p) => p.answer === "4"), "5").credit).toBe(false);
    const free = first("mul");
    expect(contractV2(free).form).toEqual([]);
  });
  test("every instruction pattern names an answer kind it judges", () => { for (const f of FORM_INSTRUCTIONS) expect(f.kinds.length).toBeGreaterThan(0); });
  test("declared rules are only those the wording states (no rule is invented)", () => { expect(declaredRules("mul")).toEqual([]); expect(declaredRules("aifdiv")).toContain("lowest-terms"); });
});
