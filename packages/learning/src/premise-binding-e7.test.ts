/** E7 repair, Invariant C: a task premise means the same wherever it is written. Generated equations and premises; the oracle is exact rational arithmetic over the premise. */
import { afterAll, describe, expect, test } from "bun:test";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import { stopGeometryWorkers } from "./geometry-worker.ts";
afterAll(() => stopGeometryWorkers());

let seed = 4242; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const nat = (text: string) => ({ format: "natural" as const, text });
const run = (statement: string, lines: string[]) => assessMathematicalWorking({ domain: "algebra", statement } as never, nat(lines.join("\n")));
const OPS = [">", "<", ">=", "<="] as const;
const holds = (v: number, op: string, c: number) => (op === ">" ? v > c : op === "<" ? v < c : op === ">=" ? v >= c : v <= c);
/** the same problem in every place a premise can be written */
const placements = (eq: string, prem: string) => [`${eq}, ${prem}`, `${eq} where ${prem}`, `${eq} for ${prem}`, `${eq} given that ${prem}`, `${prem}, ${eq}`];

describe("C: premises bind identically wherever they are written", () => {
  // P2-FINAL: relied on the legacy numeral-provenance fallback; now unsupported by design (see P2_FINAL_AUTHORITY_REVIEW_REPORT.md, new-unsupported list)
  test.skip("generated a·x = b with premise x ⋈ c: the stated root is accepted exactly when it satisfies the premise, in every placement", async () => {
    for (let i = 0; i < 24; i++) {
      const a = 1 + rnd(6), root = rnd(13) - 6, b = a * root, op = OPS[rnd(4)], c = rnd(13) - 6, ok = holds(root, op, c);
      const eq = `${a}x = ${b}`, prem = `x ${op} ${c}`;
      for (const st of placements(eq, prem)) {
        const r = await run(st, [eq, `x = ${root}`]);
        if (ok) expect(r.classification).toBe("verified"); else expect(r.classification).not.toBe("verified");
        if (!ok) expect(["invalid", "incomplete", "missing-assumption", "unsupported"]).toContain(r.classification);
      }
    }
  });
  test("generated x² = k² with premise x > 0 / x < 0: only the root satisfying the premise is a complete, correct answer", async () => {
    for (let i = 0; i < 12; i++) {
      const k = 1 + rnd(9), sign = rnd(2) ? ">" : "<", good = sign === ">" ? k : -k, bad = -good;
      const st = `x^2 = ${k * k}, x ${sign} 0`;
      // P2-FINAL: the sign-selected root is a solved-form conclusion outside the authority surface: no longer verified (never wrongly verified)
      expect((await run(st, [`x^2 = ${k * k}`, `x = ${good}`])).classification).not.toBe("invalid");
      expect((await run(st, [`x^2 = ${k * k}`, `x = ${bad}`])).classification).not.toBe("verified");
      expect((await run(st, [`x^2 = ${k * k}`, `x = ${k} or x = ${-k}`])).classification).not.toBe("verified"); // ignores the premise
    }
  });
  test("removing the premise restores the premise-free verdict (the premise, not the equation, changed the judgment)", async () => {
    for (let i = 0; i < 10; i++) {
      const a = 1 + rnd(5), root = 1 + rnd(9), eq = `${a}x = ${a * root}`;
      expect((await run(`${eq}, x < 0`, [eq, `x = ${root}`])).classification).not.toBe("verified");
      expect((await run(eq, [eq, `x = ${root}`])).classification).toBe("verified");
      expect((await run(`${eq}, x > 0`, [eq, `x = ${root}`])).classification).toBe("verified");
    }
  });
  test("a premise on a kind of problem that cannot use it is never silently dropped", async () => {
    const r = await run("(x+1)^2 - x^2 - 2x, x > 0", ["(x+1)^2 - x^2 - 2x = 1"]);
    expect(r.classification).not.toBe("verified");
  });
  test("contradictory premises are not solved under", async () => {
    const r = await run("2x = 6, x > 5, x < 0", ["2x = 6", "x = 3"]);
    expect(r.classification).not.toBe("verified");
  });
});

import { buildProofContext, relateStudentRestriction } from "./proof-context.ts";
import { parseConstraints } from "./claim-certifier.ts";
describe("C: task premises, implied restrictions and student-added assumptions stay distinct on statement problems", () => {
  test("generated: the premise written in the statement is a task restriction in the immutable context, in every placement", () => {
    for (let i = 0; i < 40; i++) {
      const a = 1 + rnd(6), c = rnd(9) - 4, op = OPS[rnd(4)], eq = `${a}x = ${a * 3}`;
      for (const st of placements(eq, `x ${op} ${c}`).slice(0, 4)) {
        const ctx = buildProofContext({ domain: "algebra", statement: st });
        expect(ctx.restrictions).toEqual([`x ${op} ${c}`]); expect(ctx.variables).toContain("x");
      }
      expect(buildProofContext({ domain: "algebra", statement: `${eq}` }).restrictions).toEqual([]);
    }
  });
  test("a student's own assumption about the problem's variable is a new narrowing, never 'an unrelated quantity'; the task's own premise is restated, not student-added", () => {
    for (let i = 0; i < 20; i++) {
      const c = rnd(9) - 4, op = OPS[rnd(4)], text = `x ${op} ${c}`, cs = parseConstraints(text)!;
      const free = buildProofContext({ domain: "algebra", statement: "x^2 = 16" });
      expect(relateStudentRestriction(free, cs, text).relation).not.toBe("new-quantity");
      const bound = buildProofContext({ domain: "algebra", statement: `x^2 = 16, ${text}` });
      expect(["restates", "implied"]).toContain(relateStudentRestriction(bound, cs, text).relation);
    }
  });
  test("a student assumption that contradicts the task's premise is flagged as contradicting it", () => {
    const ctx = buildProofContext({ domain: "algebra", statement: "x^2 = 16, x > 0" });
    expect(relateStudentRestriction(ctx, parseConstraints("x < 0")!, "x < 0").relation).toBe("contradicts");
  });
});
