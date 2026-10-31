// Final integration gate for the E7 process policy: incomplete vs incorrect stay distinguishable without changing authoritative credit;
// E7 is advisory only (no authoritative module reaches it, the trusted server bundle does not contain it); quarantine stays unresolved.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assessWithPolicy } from "../assessment-policy.ts";
import { contractFor } from "../assessment.ts";
import { quarantinedIds } from "../question-status.ts";
import { grade } from "./decision.ts";
import { learnerProjection, shadowProcessRecord } from "./process-shadow.ts";

const SRC = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const nat = (text: string) => ({ format: "natural" as const, text });

describe("incomplete work stays distinguishable from incorrect work", () => {
  test("same authoritative verdict and credit, different shadow evidence and projection", async () => {
    const qid = pickTwoRootQuestion();
    const c = contractFor(qid)!, stmt = (c.problem as { statement: string }).statement, v = c.variable!, [r1, r2] = c.expected.values;
    const wrong = String(Number(r1) + Number(r2) + 7);
    const dIncomplete = grade(qid, r1).decision, dWrong = grade(qid, wrong).decision;
    expect(dIncomplete.verdict).toBe("incorrect"); expect(dWrong.verdict).toBe("incorrect"); // authoritative credit is unchanged and equal
    const gInc = (await assessWithPolicy({ domain: "algebra", statement: stmt }, nat(`${v} = ${r1}`), { mode: "answer-only" })).grade;
    const gWrong = (await assessWithPolicy({ domain: "algebra", statement: stmt }, nat(`${v} = ${wrong}`), { mode: "answer-only" })).grade;
    const a = shadowProcessRecord(dIncomplete, gInc), b = shadowProcessRecord(dWrong, gWrong);
    expect([a.agreement, b.agreement]).toEqual(["agree", "agree"]);
    expect(a.process.completeness).toBe("incomplete"); expect(a.process.credit).toBe("partial"); expect(a.projection).toBe("incomplete");
    expect(b.process.credit).toBe("none"); expect(b.projection).toBe("incorrect");
    expect(a.authoritative).toEqual({ verdict: "incorrect", reason: dIncomplete.reason, method: dIncomplete.method });
  });
  test("method mode: an explicit false equivalence is incorrect; a valid incomplete working is incomplete", async () => {
    const g1 = (await assessWithPolicy({ domain: "algebra", statement: "x^2 = 9" }, nat("x^2 = 9\nx = 3"), { mode: "method-required" })).grade;
    const g2 = (await assessWithPolicy({ domain: "algebra", statement: "x^2 = 9" }, nat("x^2 = 9 ⇔ x = 3"), { mode: "method-required" })).grade;
    expect([learnerProjection(g1), learnerProjection(g2)]).toEqual(["incomplete", "incorrect"]);
  });
});

describe("E7 findings are advisory only", () => {
  const imports = (file: string): string[] => [...readFileSync(file, "utf8").matchAll(/(?:^|\n)\s*(?:import|export)\s(?!type\s)[^;]*?from\s+["'](\.[^"']+)["']/g)].map((m) => { const p = resolve(dirname(file), m[1]); return p.endsWith(".ts") ? p : p + ".ts"; });
  const reach = (entry: string): Set<string> => { const seen = new Set<string>(), stack = [entry]; while (stack.length) { const f = stack.pop()!; if (seen.has(f)) continue; seen.add(f); try { stack.push(...imports(f)); } catch { /* json or missing: not a module */ } } return seen; };
  const ADVISORY = ["assessment-policy.ts", "grading/process-shadow.ts"].map((f) => join(SRC, f));
  test("no authoritative grading, mastery or record module can reach the E7 process policy", () => {
    expect(reach(join(SRC, "grading/decision.ts")).has(join(SRC, "assessment.ts"))).toBe(true); // positive control: the scan follows imports
    expect(reach(join(SRC, "grading/process-shadow.ts")).has(join(SRC, "grading/decision.ts"))).toBe(false); // the shadow module imports decision types only (erased at runtime)
    for (const entry of ["grading/decision.ts", "grade.ts", "server-grader.ts", "records.ts", "evidence.ts", "session.ts", "assessment.ts", "grading/program.ts", "question-status.ts"]) {
      const r = reach(join(SRC, entry));
      for (const a of ADVISORY) expect([entry, r.has(a)]).toEqual([entry, false]);
    }
  });
  test("the trusted server grader bundle does not contain the process policy", () => {
    const m = JSON.parse(readFileSync(join(SRC, "../../../backend/family/grader/grader.manifest.json"), "utf8")) as { inputs: Record<string, string> };
    expect(Object.keys(m.inputs).some((p) => /assessment-policy|process-shadow/.test(p))).toBe(false);
  });
  test("a shadow record cannot write to the decision it reads", async () => {
    const qid = pickTwoRootQuestion(), d = grade(qid, "1").decision, before = JSON.stringify(d);
    const g = (await assessWithPolicy({ domain: "algebra", statement: (contractFor(qid)!.problem as { statement: string }).statement }, nat("x = 1"), { mode: "proof-required" })).grade;
    const frozen = Object.freeze({ ...d, method: Object.freeze({ ...d.method }) }); shadowProcessRecord(frozen, g);
    expect(JSON.stringify(d)).toBe(before);
  });
});

describe("quarantined presentations remain unresolved", () => {
  test("every quarantined id is decided unresolved.quarantined, whatever the response", () => {
    const ids = quarantinedIds(); expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) for (const raw of ["1", "0", "x = 2", ""]) { const d = grade(id, raw).decision; expect([id, raw, d.verdict, d.reason]).toEqual([id, raw, "unresolved", "unresolved.quarantined"]); }
  }, 120_000);
});

function pickTwoRootQuestion(): string {
  const { FAMILIES, pool } = require("../families.ts");
  for (const [fam, d] of FAMILIES as Map<string, { contract?: unknown }>) { if (!d.contract) continue; for (const it of pool(fam).items.slice(0, 40)) { const c = contractFor(it.id); if (c && c.verification === "verified" && c.problem?.domain === "algebra" && c.variable && c.expected.values.length === 2 && c.expected.values.every((x: string) => /^-?\d+$/.test(x))) return it.id; } }
  throw Error("no two-root kernel question");
}
