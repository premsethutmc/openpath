/**
 * grade5-level@1 and example-grade@1: a Class 5 learner's lesson and practice hold no question kind from a later class,
 * and a section is not lost just because its example was drawn from a later class.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { moduleFor } from "../../../packages/learning/src/content";
import { gradeOfQuestion } from "../../../packages/learning/src/families";
import { lessonBlocks, sectionsForGrade } from "../../../packages/learning/src/teaching-contract";

const shown = (skill: string) => sectionsForGrade(lessonBlocks(moduleFor(skill)!), 5);
const titles = (skill: string) => shown(skill).map((b) => b.title);

test("a Class 5 lesson shows no section whose example is from a later class", () => {
  for (const s of ["MATH.number.integer-add", "MATH.number.percentage", "MATH.number.prime-factorisation", "MATH.number.indian-international-numeration", "MATH.reasoning.divisibility"])
    for (const b of shown(s)) if (b.instance) assert.ok((gradeOfQuestion(b.instance) ?? 0) <= 5, `${s}: "${b.title}" uses ${b.instance}`);
});

test("later-class kinds are left out for Class 5: powers and co-primeness, perfect-square multipliers, three changes in a row", () => {
  assert.ok(!titles("MATH.number.prime-factorisation").some((t) => /co-primeness|perfect square|smallest multiplier/i.test(t)));
  assert.ok(!titles("MATH.number.integer-add").some((t) => /Several integer changes/.test(t)));
});

test("sections whose family also serves Class 5 are kept, with a Class 5 example", () => {
  const crores = shown("MATH.number.indian-international-numeration").find((b) => /Crores and lakhs in figures/.test(b.title));
  assert.ok(crores?.instance && !/billion/.test(crores.worked?.question ?? ""), "crores and lakhs in figures, without billions");
  const pct = shown("MATH.number.percentage").find((b) => /Percentage of one quantity in another/.test(b.title));
  assert.ok(pct?.instance && /What percentage of/.test(pct.worked?.question ?? ""), "what percentage of, not percentage change");
});

test("grades given to question kinds: taking away a negative number, sizes above 20, the test for 8, billions", () => {
  assert.equal(gradeOfQuestion("gen:aiint:-3,1,0"), 5);
  assert.equal(gradeOfQuestion("gen:aiint:26,-25,1"), 6);
  assert.equal(gradeOfQuestion("gen:aiint:-40,-36,0"), 6);
  assert.equal(gradeOfQuestion("gen:akdsort:5,10"), 6);
  assert.equal(gradeOfQuestion("gen:akdsort:2,50"), 5);
  assert.equal(gradeOfQuestion("gen:ajcrore:2,89,0,0"), 6);
  assert.equal(gradeOfQuestion("gen:avpctof:45,300,3"), 7);
  assert.equal(gradeOfQuestion("gen:avpctof:5,60,0"), 4);
});
