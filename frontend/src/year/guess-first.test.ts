/**
 * guess-first@1: the guess offered before a worked example is made only from the question's own verified answer and the
 * wrong answers its family predicts, each with that misunderstanding's own explanation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { moduleFor } from "../../../packages/learning/src/content";
import { guessOf, problemOf } from "../../../packages/learning/src/families";

const dir = new URL("../../../content/learning/curricula/", import.meta.url);
const competencies = new Set<string>();
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const d = JSON.parse(readFileSync(new URL(f, dir), "utf8")) as { subjects?: { chapters?: { outcomes?: { mapping?: { competencies?: { id: string }[] } }[] }[] }[] };
  for (const s of d.subjects ?? []) for (const ch of s.chapters ?? []) for (const o of ch.outcomes ?? []) for (const c of o.mapping?.competencies ?? []) competencies.add(c.id);
}
const instances = [...competencies].flatMap((c) => { const m = moduleFor(c); return m ? [...m.chapter, ...m.strategies.flatMap((s) => s.screens)].flatMap((x) => (x.instance ? [x.instance] : [])) : []; });

test("every guess is the verified answer among the family's own predicted wrong answers", () => {
  assert.ok(instances.length > 300, `lesson examples found: ${instances.length}`);
  let made = 0;
  for (const id of new Set(instances)) {
    const g = guessOf(id), p = problemOf(id.replace(/:(mc|w)$/, ""));
    if (!g) continue;
    made++;
    assert.ok(p, id);
    assert.equal(g.prompt, p!.prompt);
    assert.ok(g.choices.length >= 2 && g.choices.length <= 3, id);
    const right = g.choices.filter((c) => c.right);
    assert.equal(right.length, 1, id); assert.equal(right[0].label, p!.answer, id);
    assert.equal(new Set(g.choices.map((c) => c.label)).size, g.choices.length, `${id}: two choices read the same`);
    for (const c of g.choices) {
      assert.ok(c.label.length >= 1 && c.label.length <= 40 && c.reply.length >= 8, id);
      // a wrong choice is answered with an explanation the family wrote for exactly this wrong answer
      if (!c.right) assert.ok(p!.bugs.some((b) => b.says === c.reply), `${id}: ${c.label}`);
    }
    assert.deepEqual(guessOf(id), g, "the same question always gives the same guess, in the same order");
  }
  assert.ok(made > 150, `guesses made: ${made}`);
});

test("no guess where nothing is predicted, and none for a question that is itself a choice", () => {
  assert.equal(guessOf("gen:nosuchfamily:1,2"), null);
  assert.equal(guessOf("not-a-generated-question"), null);
  for (const id of new Set(instances)) { const p = problemOf(id.replace(/:(mc|w)$/, "")); if (p && (p.type === "choice" || !p.bugs.some((b) => b.predict !== null))) assert.equal(guessOf(id), null, id); }
});

test("the right answer is not always in the same place", () => {
  const places = new Set<number>();
  for (const id of new Set(instances)) { const g = guessOf(id); if (g) places.add(g.choices.findIndex((c) => c.right)); }
  assert.ok(places.size >= 3);
});
