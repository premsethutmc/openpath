import assert from "node:assert/strict";
import { test } from "node:test";
import { question } from "../../../packages/learning/src/content";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { compose, kidQuestion } from "../../../packages/learning/src/kid-say";
import { changePaise, changeRupee, coinsOf, needsChange, totals, type Coin, type MoneyPicture } from "../../../packages/learning/src/money-piles";

/** Pay exactly [r, p] with the unpaid coins, largest first; null when the coins shown cannot make it. */
function pay(cs: Coin[], r: number, p: number): Coin[] | null {
  let out = cs;
  for (const [pile, want] of [["rupees", r * 100], ["paise", p]] as const) {
    let need = want;
    for (const c of [...out].filter((c) => c.pile === pile && !c.paid).sort((x, y) => y.paise - x.paise)) if (c.paise <= need) { need -= c.paise; out = out.map((x) => (x.id === c.id ? { ...x, paid: true } : x)); }
    if (need) return null;
  }
  return out;
}

test("every rupees-and-paise sum is said in words, answered in two boxes, and can be done with its coins", () => {
  let n = 0;
  const sums = [...FAMILIES.values()].filter((f) => f.domain).flatMap((f) => pool(f.id).items.slice(0, 1).some((x) => /^₹\d+\.\d\d [+−] ₹\d+\.\d\d = \?/.test(question(x.id.replace(/:(mc|w)$/, "")).prompt)) ? pool(f.id).items : []);
  assert.ok(new Set(sums.map((x) => x.id.split(":")[1])).has("acmoneyadd"));
  for (const { id } of sums) {
    if (!/^gen:[a-z0-9]+:[\d,]+$/.test(id)) continue;
    const q = question(id), k = kidQuestion(q);
    const m = k.figure as unknown as MoneyPicture;
    assert.equal(k.ask.kind, "money", id);
    assert.equal(m.type, "money", id);
    assert.ok(!/₹|\d\.\d/.test(k.say), `${id}: ${k.say}`);
    let cs = coinsOf(m);
    assert.deepEqual(totals(cs).left.map((x, i) => (i ? x : x * 100)).reduce((s, x) => s + x), m.have[0] * 100 + m.have[1] + (m.take ? 0 : m.other[0] * 100 + m.other[1]), id);
    if (m.take) {
      if (needsChange(m)) { assert.equal(pay(cs, m.other[0], m.other[1]), null, `${id}: paise must not be enough before the change`); cs = changeRupee(cs); }
      const done = pay(cs, m.other[0], m.other[1]);
      assert.ok(done, `${id}: the coins shown cannot pay`);
      cs = done!;
    } else if (totals(cs).left[1] >= 100) cs = changePaise(cs);
    const [r, p] = totals(cs).left;
    assert.ok(p < 100, id);
    // counting what is left and writing it in the two boxes is the answer
    assert.equal(compose(k.ask, [String(r), String(p)], q.answer, q.type), q.answer, id);
    n++;
  }
  assert.ok(n > 50);
});

test("the words: rupees and paise, never a decimal point", () => {
  const say = (id: string) => kidQuestion(question(id)).say;
  assert.equal(say("gen:acmoneyadd:7,11,3,3,1"), "You have 7 rupees and 55 paise. You pay 3 rupees and 15 paise. How much do you have left?");
  assert.equal(compose({ kind: "money" }, ["4", "5"]), "4.05");
  assert.equal(compose({ kind: "money" }, ["", "40"]), "0.40");
  assert.equal(compose({ kind: "money" }, ["10", "140"]), "10.140");
});
