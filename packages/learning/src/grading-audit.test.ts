import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "./families.ts";
import { contractFor } from "./assessment.ts";
import { decide } from "./grade.ts";
import { quarantined } from "./question-status.ts";
import { submissions } from "../../../tools/mathematics/grading-audit/oracle.ts";

const corpus = JSON.parse(readFileSync(new URL("../../../tools/mathematics/grading-audit/data/regression-corpus.json", import.meta.url), "utf8")) as { id: string; defect: string; response: string; expect: boolean | null }[];
describe("grading audit: permanent regression corpus (every confirmed grading defect)", () => {
  test("each confirmed defect stays fixed", () => {
    expect(corpus.length).toBeGreaterThan(0);
    // merged into staging/unified-grading-shadow: a presentation quarantined by the owner (decision 4, D09; or the release review) gets no
    // verdict, whatever the corpus expected; its contract repair (G1: no longer held) is still checked
    for (const c of corpus) {
      if (quarantined(c.id)) { expect(decide(c.id, c.response).credit, `${c.defect} ${c.id} quarantined`).toBe(null); expect(contractFor(c.id)!.verification).not.toBe("held"); continue; }
      expect(decide(c.id, c.response).credit, `${c.defect} ${c.id} "${c.response}"`).toBe(c.expect);
    }
  });
  test("no contract family is held in any presentation (typed, multiple choice, word) for a sample of its pool", () => {
    for (const [fam, d] of FAMILIES) {
      if (!d.contract) continue;
      const items = pool(fam).items; const step = Math.max(1, Math.floor(items.length / 12));
      for (let i = 0; i < items.length; i += step) for (const sfx of ["", ":mc", ":w"]) if (problemOf(items[i].id + sfx)) expect(contractFor(items[i].id + sfx)!.verification, items[i].id + sfx).not.toBe("held");
    }
  }, 120000);
});
describe("grading audit: independent-oracle sample", () => {
  test("a deterministic sample of families: no false acceptance, no false rejection, unreadable stays unresolved", () => {
    const fams = [...FAMILIES.keys()]; const sample = fams.filter((_, i) => i % 18 === 0);
    let subs = 0;
    for (const fam of sample) {
      const items = pool(fam).items;
      for (let k = 0; k < 4; k++) {
        const base = items[Math.floor((k * items.length) / 4)];
        for (const sfx of ["", ":mc", ":w"]) {
          const p = problemOf(base.id + sfx); if (!p) continue;
          for (const s of submissions(p.type, p.answer, p.options, !!p.expanded).subs) {
            if (s.cat === "equiv-policy") continue; const a = decide(p.id, s.resp, s.working ?? []); subs++;
            if (s.want === "credit") expect(a.credit, `${p.id} ${s.cat} "${s.resp}"`).toBe(true);
            else if (s.want === "no-credit") expect(a.credit, `${p.id} ${s.cat} "${s.resp}"`).not.toBe(true);
            else expect(a.credit, `${p.id} ${s.cat} "${s.resp}"`).toBe(null);
          }
        }
      }
    }
    expect(subs).toBeGreaterThan(1500);
  }, 120000);
});
