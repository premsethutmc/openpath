/** grade-order@1: a Grade 8 learner meets Grade 8 questions before earlier-grade ones, and their lesson shows no section from a
 *  later grade (BPT, (x ± a)³, ⁿPᵣ, segments). A preview (no learner) is unchanged. */
import { describe, expect, test } from "bun:test";
import { moduleFor } from "./content";
import { diagnose } from "./diagnostic";
import { gradeOfQuestion } from "./families";
import { gradeFirst, gradeRank, learnerDiagnosis } from "./intervention";
import { lessonBlocks, sectionsForGrade, teachingLesson } from "./teaching-contract";
import type { LearnerRecords } from "./records";

const learner = (grade: number) => ({ enrolments: [{ grade }], attempts: [], teaching: [], unresolved: [], pending: [] }) as unknown as LearnerRecords;
const g = (id: string) => gradeOfQuestion(id.replace(/:(mc|w)$/, ""));

describe("grade-order@1", () => {
  test("on-grade questions first, stable within a grade; below-grade ones kept", () => {
    const m = moduleFor("MATH.number.exponents")!;
    const ids = [...m.practice, ...m.transfer];
    const out = gradeFirst(learner(8), ids);
    expect([...out].sort()).toEqual([...ids].sort());
    const ranks = out.map(gradeRank(learner(8)));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect((g(out[0]) ?? 8) >= 8).toBe(true);
  });
  test("the exploratory question a Grade 8 learner meets first is on grade when the module has one", () => {
    const m = moduleFor("MATH.number.scientific-notation")!;
    expect(m.diagnostics.some((id) => g(id) === 8)).toBe(true);
    expect(g(learnerDiagnosis(m, learner(8)).next!)).toBe(8);
    // the diagnosis itself (what an answer counts as) is unchanged: no rank gives the module's own order
    expect(diagnose(m, []).next).toBe(diagnose(m, [], () => 0).next);
  });
  test("a Grade 8 lesson shows no later-grade section; a preview shows them all", () => {
    for (const c of ["MATH.geometry.similarity", "MATH.algebra.identities", "MATH.algebra.permutations", "MATH.measurement.sectors"]) {
      const m = moduleFor(c)!;
      const all = lessonBlocks(m);
      expect(all.some((b) => b.instance && (g(b.instance) ?? 0) > 8)).toBe(true);
      const kept = sectionsForGrade(all, 8);
      expect(kept.some((b) => b.instance && (g(b.instance) ?? 0) > 8)).toBe(false);
      expect(kept.some((b) => b.instance)).toBe(true);
      expect(sectionsForGrade(all, null)).toBe(all);
      const L = teachingLesson(m, [...m.practice, ...m.transfer], 8);
      expect(L.blocks.some((b) => b.instance && (g(b.instance) ?? 0) > 8)).toBe(false);
      expect(L.practice.some((id) => (g(id) ?? 0) > 8)).toBe(false);
    }
  });
  test("lesson practice for a Grade 8 learner puts Grade 8 questions before earlier-grade ones", () => {
    const m = moduleFor("MATH.algebra.inverse-proportion")!;
    const L = teachingLesson(m, [...m.practice, ...m.transfer], 8);
    const first = L.practice.findIndex((id) => (g(id) ?? 8) < 8), last8 = L.practice.map(g).lastIndexOf(8);
    expect(L.practice.some((id) => g(id) === 8)).toBe(true);
    // shown-on-the-page questions stay last; among fresh ones Grade 8 comes first
    expect(g(L.practice[0])).toBe(8);
    expect(first === -1 || last8 === -1 || L.practice.slice(0, first).every((id) => (g(id) ?? 8) >= 8)).toBe(true);
  });
});
