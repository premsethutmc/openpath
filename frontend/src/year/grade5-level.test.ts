/**
 * grade5-level@1: a Class 5 learner's lesson and practice hold no question kind from a later class. A kind that belongs to
 * no particular class has no grade (null), so learners of every other grade see what they saw before.
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

test("grades given to question kinds: taking away a negative number, sizes above 20, the test for 8, billions", () => {
  assert.equal(gradeOfQuestion("gen:aiint:-3,1,0"), null);
  assert.equal(gradeOfQuestion("gen:aiint:26,-25,1"), 6);
  assert.equal(gradeOfQuestion("gen:aiint:-40,-36,0"), 6);
  assert.equal(gradeOfQuestion("gen:akdsort:5,10"), 6);
  assert.equal(gradeOfQuestion("gen:akdsort:2,50"), null);
  assert.equal(gradeOfQuestion("gen:ajcrore:2,89,0,0"), 6);
  assert.equal(gradeOfQuestion("gen:avpctof:45,300,3"), 7);
  assert.equal(gradeOfQuestion("gen:avpctof:5,60,0"), null);
});
