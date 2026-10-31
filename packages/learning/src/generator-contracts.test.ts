import { describe, expect, test } from "bun:test";
import { FAMILIES, pool, problemOf } from "./families.ts";
import { contractFor } from "./assessment.ts";
import { decide } from "./grade.ts";

const withContract = [...FAMILIES].filter(([, d]) => d.contract);
describe("generator-owned answer contracts", () => {
  // 96 since Workstream A3 (lboth, lbrk)
  test("96 families declare a contract; none is held across their whole pools", () => {
    expect(withContract.length).toBe(96);
    let verified = 0, legacy = 0;
    for (const [fam] of withContract) for (const it of pool(fam).items) {
      const c = contractFor(it.id)!;
      expect(c.verification === "held").toBe(false);
      if (c.verification === "verified") verified++; else legacy++;
    }
    expect(verified).toBeGreaterThan(38000);
    expect(legacy).toBeLessThan(2100);
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

describe("typed contracts and the server grader", () => {
  const typed = withContract.filter(([, d]) => d.contract!.kind === "typed");
  test("48 typed families; stored answer credited, wrong neighbour never credited, garbage unresolved", () => {
    expect(typed.length).toBe(48);
    for (const [fam] of typed) {
      const items = pool(fam).items.filter((i) => !i.id.endsWith(":mc")).slice(0, 8);
      for (const it of items) {
        if (contractFor(it.id)!.verification !== "verified") continue;
        const pr = problemOf(it.id)!;
        expect(decide(it.id, pr.answer).credit).toBe(true);
        expect(decide(it.id, "abc").credit).not.toBe(true);
        expect(decide(it.id, pr.answer + "7").credit).not.toBe(true);
      }
    }
  }, 60000);
  test("gradeRequest returns the kernel verdict and is independent of working", async () => {
    const { gradeRequest } = await import("./server-grader.ts");
    const it = pool("mean4").items.find((i) => !i.id.endsWith(":mc"))!;
    const pr = problemOf(it.id)!;
    const ok = gradeRequest({ id: it.id, response: pr.answer, working: ["nonsense"] });
    expect(ok.credit).toBe(true);
    expect(gradeRequest({ id: it.id, response: "abc" }).credit).toBe(null);
    expect(gradeRequest({ id: it.id, response: pr.answer + "1" }).credit).not.toBe(true);
  });
  test("grader bundle manifest matches its inputs", async () => {
    const { createHash } = await import("node:crypto");
    const { readFileSync } = await import("node:fs");
    const m = JSON.parse(readFileSync(new URL("../../../backend/family/grader/grader.manifest.json", import.meta.url), "utf8"));
    const bundle = readFileSync(new URL("../../../backend/family/grader/grader.mjs", import.meta.url));
    expect(createHash("sha256").update(bundle).digest("hex")).toBe(m.sha256);
    const root = new URL("../../../", import.meta.url);
    for (const [f, h] of Object.entries(m.inputs as Record<string, string>))
      expect(createHash("sha256").update(readFileSync(new URL(f, root))).digest("hex")).toBe(h);
  });
});
