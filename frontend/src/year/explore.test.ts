/**
 * explore@1: a worked example's numbers can be changed only to questions the family itself makes, with a picture, and never
 * to a question a learner may later be tested on.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILIES, exposureKey, inPool, pool, problemOf } from "../../../packages/learning/src/families";
import { explored, explorerFor } from "../../../packages/learning/src/explore";

const firstPictured = [...FAMILIES.keys()].flatMap((f) => { const q = pool(f).items.find((x) => x.figure); return q ? [q] : []; });

test("every dial offers only valid, pictured questions outside the released pool; the example is on the dial", () => {
  let explorers = 0, variants = 0;
  for (const q of firstPictured) {
    const e = explorerFor(q.id);
    if (!e) continue;
    explorers++;
    const released = new Set(pool(e.family).items.map((x) => exposureKey(x.id)));
    assert.ok(e.dials.length >= 1 && e.dials.length <= 2, q.id);
    e.dials.forEach((d, i) => {
      const own = e.params[d.index];
      assert.ok(d.values.includes(own) && d.values.length >= 4 && d.values.length <= 9, `${q.id}: the example sits on a short dial`);
      assert.deepEqual([...d.values].sort((a, b) => a - b), d.values, q.id);
      for (const v of d.values) {
        const x = explored(e, i, v);
        assert.ok(x && x.prompt && x.figure && x.steps.length >= 1 && x.answer, `${q.id} at ${v}`);
        assert.equal(x!.changed, v !== own);
        if (v === own) { assert.equal(x!.prompt, problemOf(e.base)!.prompt); continue; }
        variants++;
        const params = [...e.params]; params[d.index] = v;
        const id = `gen:${e.family}:${params.join(",")}`, p = problemOf(id)!;
        assert.ok(!inPool(id) && !released.has(exposureKey(id)), `${id}: never a question a learner is tested on`);
        assert.equal(x!.answer, p.answer, "the answer shown is the family's verified answer for those numbers");
      }
      // what is said to change is a number written in the example's own question
      if (d.shown !== null) assert.ok(problemOf(e.base)!.prompt.includes(d.shown), q.id);
      assert.equal(explored(e, i, own + 1000), null);
    });
  }
  assert.ok(explorers >= 100 && variants >= 500, `explorers ${explorers}, changed questions ${variants}`);
});

test("the pie chart: change the total and the same slice gives a different number of children", () => {
  const e = explorerFor("gen:afpie:0,0,0,0")!;
  const total = e.dials.findIndex((d) => d.shown === "24");
  assert.ok(total >= 0, "the 24 children is a number that can be changed");
  const seen = e.dials[total].values.map((v) => explored(e, total, v)!);
  assert.ok(seen.every((x) => /How many children walk\?$/.test(x.prompt)), "the same question about the same slice");
  assert.ok(new Set(seen.map((x) => x.answer)).size === seen.length, "a different answer for each total");
  for (const x of seen) { const n = Number(/the (\d+) children/.exec(x.prompt)![1]); assert.equal(Number(x.answer), n / 2, "always half of the total"); }
});

test("no explorer for a question that is not generated, has no picture, or has nothing outside the pool to change to", () => {
  assert.equal(explorerFor("not-a-question"), null);
  assert.equal(explorerFor("gen:nosuch:1,2"), null);
  const plain = [...FAMILIES.keys()].flatMap((f) => pool(f).items.slice(0, 1)).find((q) => !q.figure)!;
  assert.equal(explorerFor(plain.id), null);
  assert.equal(explorerFor(explorerFor("gen:afpie:0,0,0,0")!.base + ":mc")?.base, "gen:afpie:0,0,0,0", "a form of the question explores the question");
});
