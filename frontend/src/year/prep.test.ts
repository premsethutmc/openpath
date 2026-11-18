/** prep@1: the steps before the answer, proved on the questions themselves. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { question } from "../../../packages/learning/src/content";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { compose, kidQuestion } from "../../../packages/learning/src/kid-say";
import { prepOf, prepRight } from "../../../packages/learning/src/prep";

test("a prep is offered only where its own arithmetic gives the verified answer, and never holds the answer", () => {
  const by = new Map<string, number>();
  for (const f of FAMILIES.keys()) {
    const ids = pool(f).items.map((p) => p.id).filter((id) => !/:(mc|w)$/.test(id));
    for (const id of ids.filter((_, i) => i % Math.max(1, Math.floor(ids.length / 40)) === 0)) {
      const q = question(id), k = kidQuestion(q as never), ask = k.aids?.[0]?.ask;
      if (!ask || ask.kind !== "prep") continue;
      by.set(f, (by.get(f) ?? 0) + 1);
      assert.ok(ask.steps.length >= 1 && ask.steps.length <= 2, id);
      for (const s of ask.steps) { assert.notEqual(Number(s.value), Number(q.answer), id); assert.ok(prepRight(s, s.value) && !prepRight(s, "") && s.why && s.tell, id); }
      // the line above the answer box works out to the answer
      const m = /^Now ([\d.]+) ([+−×÷]) ([\d.]+) =$/.exec(ask.then)!;
      const v = { "+": Number(m[1]) + Number(m[3]), "−": Number(m[1]) - Number(m[3]), "×": Number(m[1]) * Number(m[3]), "÷": Number(m[1]) / Number(m[3]) }[m[2]]!;
      assert.ok(Math.abs(v - Number(q.answer)) < 1e-9, `${id}: ${ask.then} vs ${q.answer}`);
      assert.equal(compose(ask, ["x", "y", q.answer], q.answer, q.type), q.answer, id);
    }
  }
  console.log([...by].map(([f, n]) => `${f}:${n}`).join(" "));
  for (const f of ["aeest", "aeestp", "adest", "aeestq", "avpest", "acmcm", "adhmin", "adsec", "aeconv"]) assert.ok((by.get(f) ?? 0) > 5, f);
});

test("prep reads the question's own words", () => {
  const e = prepOf("Estimate 12 + 67 by rounding each number to the nearest ten first.", "integer", "80")!;
  assert.deepEqual(e.steps.map((s) => [s.lead, s.value]), [["12 is about", "10"], ["67 is about", "70"]]);
  assert.equal(e.then, "Now 10 + 70 =");
  const x = prepOf("3 m 95 cm = how many centimetres?", "integer", "395")!;
  assert.deepEqual(x.steps.map((s) => [s.lead, s.value, s.after]), [["1 m =", "100", "cm"], ["So 3 m =", "300", "cm"]]);
  assert.equal(x.then, "Now 300 + 95 =");
  assert.equal(prepOf("How many minutes are there in 1 hour?", "integer", "60"), null, "the fact would be the answer");
  assert.equal(prepOf("How many paise are there in ₹8 and 50 paise?", "integer", "850")!.steps[0].lead, "₹1 =");
  assert.equal(prepOf("Estimate 12 + 67 by rounding each number to the nearest ten first.", "integer", "79"), null);
});
