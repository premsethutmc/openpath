/** step-help@1: help at a step is made from the question's own verified steps; a card from the skill's own lesson. */
import { WORKED_OUT } from "../../../packages/learning/src/worked-out";
import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILIES, explainStep, pool, problemOf } from "../../../packages/learning/src/families";
import { cardFor, stepsHelp, helpMethods, statesAnswer } from "../../../packages/learning/src/step-help";
import { smallerOf } from "../../../packages/learning/src/working";

const sample = [...FAMILIES.keys()].flatMap((f) => { const items = pool(f).items; return [items[0], items[items.length >> 1]].filter(Boolean); });

test("every question's help is its own steps, in order, with nothing worked in the 'what to do' line", () => {
  let needing = 0, folded = 0, boards = 0, named = 0, closed = 0;
  for (const q of sample) {
    // worked-out@1: a type with its whole working written for it is proved in worked-out.test.ts
    if (WORKED_OUT.includes(q.family) || helpMethods(q.id)[0] !== "Step by step") continue;
    const all = stepsHelp(q.id);
    // deepen@1: lines of working made by rule sit between the question's own steps; they tell what to do without its result
    for (const f of all!.filter((x) => x.finer)) {
      assert.ok(/[.?]$/.test(f.next) && f.next.length <= 110 && !f.next.replace(/[a-z] = [−\d./]+/g, "").replace("∫ u dv = uv − ∫ v du", "").includes("="), `${q.id}: ${f.next} / ${f.shown}`);
    }
    // lead-in@1: a run of arithmetic working opens by naming the calculation it works out, and the help opens with "First"
    all!.forEach((x, i) => { if (x.finer && !all![i - 1]?.finer && /^\d+ = \d+ \+ \d+$|which leaves/.test(x.shown)) assert.ok(/^(First: t|T)o work out \d+ [×÷+−] \d+: /.test(x.next), `${q.id}: ${x.next}`); });
    assert.ok(/^First: /.test(all![0].next), `${q.id}: ${all![0].next}`);
    // cue-label@1: a cue taken from the step's own label is a name or an instruction, never a sentence, and gives no result
    for (const x of all!) if (/^(First|Next|Last|Now): find /.test(x.next)) {
      named++;
      assert.ok(!/=|\b(is|are|says?|gives?|means?|decides?|adds?)\b/.test(x.next) && x.next.length <= 70, `${q.id}: ${x.next}`);
    }
    // how@1: arithmetic inside a step is folded onto the step, never walked through as steps of its own
    for (const x of all!) {
      assert.ok(/calculus|integra|differen/.test(q.competency) || !(x.finer && /^\d+ [×÷+−] \d+ = \d+(, which leaves \d+)?$|^\d+ = \d+( \+ \d+)+$/.test(x.shown)), `${q.id}: ${x.shown} is still a step`);
      if (x.how) { folded++; assert.ok(x.how.lines.length >= 2 && !x.finer, q.id); if (x.how.board) { boards++; assert.ok(/ \) /.test(x.how.board[1]), q.id); } }
    }
    // closing@1: a help that never writes a numeric answer ends by writing it, in one added step that is the last
    const end = all!.filter((x) => x.closing);
    if (end.length) { closed++; assert.ok(end.length === 1 && all!.at(-1) === end[0] && end[0].shown === `The answer: ${q.answer}` && !all!.slice(0, -1).some((x) => /^Last: /.test(x.next)), q.id); }
    assert.ok(statesAnswer(all!, q.answer), `${q.id}: the help states the answer`);
    const h = all && all.filter((x) => !x.finer && !x.closing);
    assert.ok(h && h.length === q.steps.length, q.id);
    h!.forEach((x, i) => {
      assert.equal(x.shown, explainStep(q, q.steps[i]), q.id);
      // what to do is the step's operation in words; it never contains the step's own result
      assert.ok(/^(First|Next|Last|Now): .+\.$/.test(x.next), `${q.id}: ${x.next}`);
      assert.ok(x.next.length <= 80 && x.next !== `${i === 0 ? "First" : "Next"}: ${x.shown}.`, `${q.id}: ${x.next}`);
      // the other skill a step leans on is named only when it is another skill, and only when it has a card
      if (x.needs) { needing++; assert.notEqual(x.needs, q.competency); assert.equal(x.needs, q.steps[i].competency); assert.ok(cardFor(x.needs)); }
    });
    assert.deepEqual(stepsHelp(`${q.id}`), all);
  }
  assert.ok(needing > 500, `steps that lean on another skill: ${needing}`);
  assert.ok(named > 100, `cues that name what the step finds: ${named}`);
  assert.ok(closed > 20, `helps closed with their answer: ${closed}`);
  console.log(`how@1: ${folded} steps carry folded working, ${boards} with a written layout`);
  assert.ok(folded > 200 && boards > 5, `${folded} ${boards}`);
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
