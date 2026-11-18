/** step-help@1: help at a step is made from the question's own verified steps; a card from the skill's own lesson. */
import { WORKED_OUT } from "../../../packages/learning/src/worked-out";
import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILIES, explainStep, pool, problemOf } from "../../../packages/learning/src/families";
import { cardFor, stepsHelp } from "../../../packages/learning/src/step-help";
import { smallerOf } from "../../../packages/learning/src/working";

const sample = [...FAMILIES.keys()].flatMap((f) => { const items = pool(f).items; return [items[0], items[items.length >> 1]].filter(Boolean); });

test("every question's help is its own steps, in order, with nothing worked in the 'what to do' line", () => {
  let needing = 0;
  for (const q of sample) {
    // worked-out@1: a type with its whole working written for it is proved in worked-out.test.ts
    if (WORKED_OUT.includes(q.family)) continue;
    const all = stepsHelp(q.id);
    // deepen@1: lines of working made by rule sit between the question's own steps; they tell what to do without its result
    for (const f of all!.filter((x) => x.finer)) {
      assert.ok(/[.?]$/.test(f.next) && f.next.length <= 110 && !f.next.replace(/[a-z] = [−\d./]+/g, "").replace("∫ u dv = uv − ∫ v du", "").includes("="), `${q.id}: ${f.next} / ${f.shown}`);
    }
    const h = all && all.filter((x) => !x.finer);
    assert.ok(h && h.length === q.steps.length, q.id);
    h!.forEach((x, i) => {
      assert.equal(x.shown, explainStep(q, q.steps[i]), q.id);
      // what to do is the step's operation in words; it never contains the step's own result
      assert.ok(/^(First|Next|Last): .+\.$/.test(x.next), `${q.id}: ${x.next}`);
      assert.ok(x.next.length <= 80 && x.next !== `${i === 0 ? "First" : "Next"}: ${x.shown}.`, `${q.id}: ${x.next}`);
      // the other skill a step leans on is named only when it is another skill, and only when it has a card
      if (x.needs) { needing++; assert.notEqual(x.needs, q.competency); assert.equal(x.needs, q.steps[i].competency); assert.ok(cardFor(x.needs)); }
    });
    assert.deepEqual(stepsHelp(`${q.id}`), all);
  }
  assert.ok(needing > 500, `steps that lean on another skill: ${needing}`);
  assert.equal(stepsHelp("not-a-question"), null);
});

test("the owner's example: a division's first step leans on multiplication facts, and that skill has a card", () => {
  const fam = [...FAMILIES.entries()].find(([, d]) => d.competency === "MATH.number.long-division")![0];
  const q = pool(fam).items[0], h = stepsHelp(q.id)!;
  assert.match(h[0].next, /^First: .*How many \d+s fit in \d+, without going over\?$/);
  assert.equal(h[0].needs, "MATH.number.multiplication-tables");
  // and before the step is shown, a stuck child is asked the fact underneath it
  assert.deepEqual(smallerOf("50 × 2 = 100"), { lead: "50 is 5 tens. Start with the fact underneath:", ask: "5 × 2 = ?", answer: 10 });
  assert.deepEqual(smallerOf("4 ÷ 2 = 2"), { lead: "Turn it round into a times fact:", ask: "2 × ? = 4", answer: 2 });
  assert.equal(smallerOf("So 120 ÷ 3 = 40"), null);
  const card = cardFor("MATH.number.multiplication-tables")!;
  assert.equal(card.name, "Use multiplication facts"); assert.ok(card.rule.length >= 1 && card.rule[0].length > 20);
});

test("a card is the skill's own lesson words and, where it has one, its own verified example", () => {
  const skills = new Set(sample.flatMap((q) => [q.competency, ...q.steps.map((s) => s.competency)]));
  let cards = 0, examples = 0;
  for (const c of skills) {
    const k = cardFor(c);
    if (!k) continue;
    cards++;
    assert.ok(k.name && k.rule.length >= 1 && k.rule.length <= 2 && k.rule.every((t) => t.length <= 260), c);
    if (k.example) { examples++; assert.ok(k.example.steps.length >= 1 && k.example.answer); }
    assert.equal(cardFor(c), k);
  }
  assert.ok(cards >= 300 && examples >= 280, `cards ${cards}, with an example ${examples}, of ${skills.size} skills`);
  assert.equal(cardFor("MATH.no.such.skill"), null);
  assert.ok(problemOf(sample[0].id));
});
