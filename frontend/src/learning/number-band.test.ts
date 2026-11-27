/**
 * number-band@1: a Class 1–3 question belongs to the class whose numbers it uses (Class 1 up to 99 and patterns that grow
 * by 1 or 2; Class 2 up to 999 and growth up to 10; Class 3 up to 9,999), and a lesson for a young learner shows an
 * example of the class the skill starts in.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { modules } from "../../../packages/learning/src/content";
import { FAMILIES, gradeOfQuestion, phasePool, pool, problemOf } from "../../../packages/learning/src/families";
import { firstClassOf } from "../../../packages/learning/src/first-class";
import { bandClass } from "../../../packages/learning/src/number-band";

test("a growing pattern belongs to the class of its numbers and how much it grows", () => {
  const ask = (a: number, d: number, k: number) => gradeOfQuestion(`gen:acgrow:${a},${d},${k}`);
  assert.equal(ask(1, 2, 5), null); // 1, 3, 5 … grows by 2: the class the skill starts in (no later class)
  assert.equal(ask(7, 3, 5), 2); // 7, 10, 13 … grows by 3: not Class 1
  assert.equal(bandClass(1, { prompt: "What comes next? 100, 200, 300, ?", answer: "400" }), 3); // grows by 100
  assert.equal(bandClass(1, { prompt: "What comes next? 10, 20, 30, ?", answer: "40" }), 2);
  assert.equal(bandClass(1, { prompt: "Add 4,500 and 3,200.", answer: "7700" }), 3);
  assert.equal(bandClass(1, { prompt: "Add 45,000 and 3,200.", answer: "48200" }), 4);
});

test("years are not amounts: a calendar question about 2026 is a Class 1 question", () => {
  assert.equal(bandClass(1, { prompt: "On the calendar for January 2026, what day comes after 4 January?", answer: "5" }), 1);
});

test("every skill first taught in Class 1–3 has at least 12 questions of that class", () => {
  const onClass = new Map<string, number>();
  for (const [id, def] of FAMILIES) {
    const first = firstClassOf(def.competency);
    if (first === null || first > 3 || def.grade) continue; // a family that gives its own grade is placed by it
    const n = pool(id).items.filter((p) => { const g = gradeOfQuestion(p.id); return g === null || g <= first; }).length;
    onClass.set(def.competency, (onClass.get(def.competency) ?? 0) + n);
  }
  assert.deepEqual([...onClass].filter(([, n]) => n < 12), []);
});

test("a Class 1–3 lesson example uses numbers of the class the skill starts in, when its family has such practice questions", () => {
  const above: string[] = [];
  for (const m of modules) {
    const first = firstClassOf(m.competency);
    if (first === null || first > 3) continue;
    for (const sc of m.chapter) {
      const id = (sc as { instance?: string }).instance?.replace(/:(mc|w)$/, "");
      if (!id) continue;
      const g = gradeOfQuestion(id), fam = problemOf(id)?.family;
      if (g === null || g <= first || !fam) continue;
      // lesson examples are drawn from the family's practice set
      const hasOnClass = phasePool(fam, "practice").some((id) => { const x = gradeOfQuestion(id.replace(/:(mc|w)$/, "")); return x === null || x <= first; });
      if (hasOnClass) above.push(`${m.competency}: ${id} (Class ${g})`);
    }
  }
  assert.deepEqual(above.slice(0, 10), []);
});
