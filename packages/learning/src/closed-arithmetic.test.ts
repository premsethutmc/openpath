/** One invariant (the exact value of the closed numeric expression the prompt shows) serving many unrelated families. Evidence: tools/mathematics/coverage-audit/closed-arith-proof.ts */
import { describe, expect, test } from "bun:test";
import { CLOSED_ARITHMETIC_FAMILIES, closedExpression } from "./closed-arithmetic.ts";
import { contractFor } from "./assessment.ts";
import { pool, problemOf } from "./families.ts";
import { decide } from "./grade.ts";

describe("closedExpression reads only what is plainly an expression", () => {
  test("accepts", () => { expect(closedExpression("7 × 8 = ?")).toBe("7*8"); expect(closedExpression("Work out 1/3 + 1/3.")).toBe("1/3+1/3"); expect(closedExpression("12 − 5 + (3 × 2) = ?")).toBe("12-5+(3*2)"); expect(closedExpression("84 ÷ 7")).toBe("84/7"); });
  test("refuses prose, bare numbers, two numbers side by side, unbalanced brackets", () => { for (const p of ["Solve 2x + 3 = 7", "A rectangle is 2 cm by 2 cm", "7", "3 4 + 1", "(3 + 4", "Write 3/2 as a mixed number"]) expect(closedExpression(p)).toBeNull(); });
});
describe("whole released pools of the mapped families", () => {
  test("every question is verified or keeps the legacy comparison; none is held", () => {
    let verified = 0, legacy = 0;
    for (const f of CLOSED_ARITHMETIC_FAMILIES) for (const q of pool(f).items) { const c = contractFor(q.id)!; expect(c.verification === "held").toBe(false); if (c.verification === "verified") verified++; else { legacy++; expect(c.verification).toBe("legacy"); } }
    expect(CLOSED_ARITHMETIC_FAMILIES.size).toBe(25); expect(verified).toBeGreaterThan(10_000); expect(legacy).toBeLessThan(500);
  });
  test("a family that is not mapped is never routed here, whatever its prompt looks like", () => {
    const id = pool("rect").items[0].id; expect(contractFor(id)!.verification).toBe("legacy");
    const sub = pool("avfexp").items[0]; expect(closedExpression(problemOf(sub.id)!.prompt)).not.toBeNull(); expect(CLOSED_ARITHMETIC_FAMILIES.has("avfexp")).toBe(false); expect(contractFor(sub.id)!.verification).toBe("legacy");
  });
  test("correct, equivalent, incorrect and unreadable answers through the real decision (unrelated families)", () => {
    for (const fam of ["fadd", "ldiv", "agbod", "aidmul", "aiint", "adcol3"]) {
      const id = pool(fam).items.find((i) => !i.id.endsWith(":mc"))!.id, a = problemOf(id)!.answer;
      const ok = decide(id, a); expect(ok.credit).toBe(true); expect(ok.evidence.source).toBe("kernel");
      expect(decide(id, ` ${a} `).credit).toBe(true);
      expect(decide(id, a.startsWith("-") ? a.slice(1) : `-${a}`).credit).toBe(a === "0" ? true : false);
      expect(decide(id, "abc").credit).toBeNull(); expect(decide(id, "1/0").credit).toBeNull();
    }
  });
});
