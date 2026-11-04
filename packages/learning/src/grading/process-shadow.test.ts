import { describe, expect, test } from "bun:test";
import { FAMILIES, pool } from "../families.ts";
import { contractFor } from "../assessment.ts";
import { assessWithPolicy, type PolicyGrade } from "../assessment-policy.ts";
import { grade } from "./decision.ts";
import { impliedMethod, impliedVerdict, shadowProcessRecord } from "./process-shadow.ts";

const pg = (x: Partial<PolicyGrade>): PolicyGrade => ({ contract: "openpath-e7-process-policy@1", mode: "method-required", mathematicalValidity: "valid", completeness: "complete", evidence: "sufficient", findings: [], deductions: [], credit: "full", reason: "", ...x });
const deepFreeze = <T>(o: T): T => { Object.values(o as object).forEach((v) => v && typeof v === "object" && deepFreeze(v)); return Object.freeze(o); };

describe("E7 process policy -> grading-decision@1 (shadow mapping)", () => {
  test("validity, completeness, process deductions and unresolved map to the binary decision contract", () => {
    expect(impliedVerdict(pg({ mathematicalValidity: "invalid", completeness: "undetermined", credit: "none" }))).toBe("incorrect");
    expect(impliedVerdict(pg({ completeness: "incomplete", credit: "partial" }))).toBe("incorrect"); // no partial verdict: the answer is not correct
    expect(impliedVerdict(pg({ credit: "partial", deductions: ["candidate-check-not-shown"], evidence: "insufficient" }))).toBe("correct"); // the answer is right; only process credit drops
    expect(impliedVerdict(pg({ credit: "unresolved", mathematicalValidity: "undetermined", completeness: "undetermined" }))).toBe("unresolved");
    expect(impliedMethod(pg({}))).toEqual({ examined: true, verified: true });
    expect(impliedMethod(pg({ credit: "partial", deductions: ["restriction-not-stated"] }))).toEqual({ examined: true, verified: false });
    expect(impliedMethod(pg({ mode: "answer-only" }))).toEqual({ examined: false, verified: false });
    expect(impliedMethod(pg({ credit: "unresolved" }))).toEqual({ examined: false, verified: false });
    for (const mode of ["answer-only", "method-required", "proof-required"] as const) for (const credit of ["full", "partial", "none", "unresolved"] as const) {
      const v = impliedVerdict(pg({ mode, credit, mathematicalValidity: credit === "none" ? "invalid" : credit === "unresolved" ? "undetermined" : "valid" }));
      if (credit === "none") expect(v).toBe("incorrect"); if (credit === "unresolved") expect(v).toBe("unresolved");
    }
  });

  test("the authoritative decision is never modified, and a shadow disagreement is reported, not applied", async () => {
    const qid = sampleAlgebraQuestions(1)[0];
    const d = deepFreeze(grade(qid, "999999").decision);
    const g = (await assessWithPolicy({ domain: "algebra", statement: (contractFor(qid)!.problem as { statement: string }).statement }, { format: "natural", text: "x = 999999" }, { mode: "answer-only" })).grade;
    const rec = shadowProcessRecord(d, g);
    expect(rec.authoritative.verdict).toBe(d.verdict); expect(d.verdict).toBe(grade(qid, "999999").decision.verdict);
    expect(["agree", "process-unresolved", "process-decided", "conflict"]).toContain(rec.agreement);
  });

  test("real kernel questions: no conflict between the authoritative decision and the answer-only process policy", async () => {
    const counts: Record<string, number> = {}, conflicts: string[] = [];
    for (const qid of sampleAlgebraQuestions(150)) {
      const c = contractFor(qid)!, stmt = (c.problem as { statement: string }).statement, v = c.variable ?? "x";
      const vals = c.expected.values, responses = [vals.join(", "), vals.length > 1 ? vals[0] : String(Number(vals[0]) + 1), "abc"];
      for (const raw of responses) {
        const d = grade(qid, raw).decision;
        const text = /^[+-]?\d/.test(raw) && c.variable ? raw.split(/\s*,\s*/).map((x) => `${v} = ${x}`).join(" or ") : raw;
        const g = (await assessWithPolicy({ domain: "algebra", statement: stmt }, { format: "natural", text }, { mode: "answer-only" })).grade;
        const r = shadowProcessRecord(d, g); counts[r.agreement] = (counts[r.agreement] ?? 0) + 1;
        if (r.agreement === "conflict") conflicts.push(`${qid} "${raw}": ${r.note}`);
      }
    }
    expect(conflicts).toEqual([]);
    expect(counts.agree).toBeGreaterThan(200);
  }, 120_000);

  test("method-required shadow: the working sets method fields only; the authoritative verdict does not move", async () => {
    const qid = sampleAlgebraQuestions(400).find((q) => contractFor(q)!.expected.values.length === 1 && !!contractFor(q)!.variable && (contractFor(q)!.problem as { statement: string }).statement.includes("="))!;
    const c = contractFor(qid)!, stmt = (c.problem as { statement: string }).statement, val = c.expected.values[0], v = c.variable ?? "x";
    const d = grade(qid, val).decision;
    const full = shadowProcessRecord(d, (await assessWithPolicy({ domain: "algebra", statement: stmt }, { format: "natural", text: `${stmt}\n${v} = ${val}` }, { mode: "method-required" })).grade);
    const bare = shadowProcessRecord(d, (await assessWithPolicy({ domain: "algebra", statement: stmt }, { format: "natural", text: `${v} = ${val}` }, { mode: "proof-required" })).grade);
    expect(d.verdict).toBe("correct");
    for (const r of [full, bare]) { expect(r.authoritative.verdict).toBe("correct"); expect(r.agreement).not.toBe("conflict"); }
    expect(bare.process.credit).toBe("partial"); expect(bare.implied).toEqual({ verdict: "correct", method: { examined: true, verified: false } });
  }, 60_000);
});

function sampleAlgebraQuestions(n: number): string[] {
  const out: string[] = [];
  for (const [fam, d] of FAMILIES) {
    if (!d.contract) continue;
    const items = pool(fam).items;
    for (let i = 0; i < items.length && out.length < n; i += Math.max(1, Math.floor(items.length / 3))) {
      const c = contractFor(items[i].id);
      if (c && c.verification === "verified" && c.problem && c.problem.domain === "algebra" && c.expected.values.length && c.expected.values.every((x) => /^[+-]?\d+(?:\/\d+)?$/.test(x))) out.push(items[i].id);
    }
    if (out.length >= n) break;
  }
  return out;
}
