import { describe, expect, test } from "bun:test";
import { FAMILIES, pool, problemOf } from "./families.ts";
import { contractFor } from "./assessment.ts";
import { decide } from "./grade.ts";

const withContract = [...FAMILIES].filter(([, d]) => d.contract);
describe("generator-owned answer contracts", () => {
  test("46 families declare a contract; none is held across their whole pools", () => {
    expect(withContract.length).toBe(46);
    let verified = 0, legacy = 0;
    for (const [fam] of withContract) for (const it of pool(fam).items) {
      const c = contractFor(it.id)!;
      expect(c.verification === "held").toBe(false);
      if (c.verification === "verified") verified++; else legacy++;
    }
    expect(verified).toBeGreaterThan(20000);
    expect(legacy).toBeLessThan(200);
  }, 60000);
  test("verified questions: stored answer is credited, a shifted answer is not, garbage is unresolved", () => {
    for (const [fam, d] of withContract) {
      const items = pool(fam).items.filter((i) => !i.id.endsWith(":mc")).slice(0, 6);
      for (const it of items) {
        if (contractFor(it.id)!.verification !== "verified") continue;
        const pr = problemOf(it.id)!;
        expect(decide(it.id, pr.answer).credit).toBe(true);
        expect(decide(it.id, "abc").credit).toBe(null);
        if (d.contract!.kind === "value") expect(decide(it.id, `${pr.answer}+1`).credit).not.toBe(true);
      }
    }
  });
  test("families without a contract stay on the legacy route", () => {
    const it = pool("rect").items[0];
    expect(contractFor(it.id)!.verification).toBe("legacy");
  });
});
