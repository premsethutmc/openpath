/** worked-out@1: the full working written for a type, proved on every one of its questions. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { question } from "../../../packages/learning/src/content";
import { pool } from "../../../packages/learning/src/families";
import { checkWorkingLines } from "../../../packages/learning/src/line-check";
import { askOf } from "../../../packages/learning/src/step-ask";
import { stepsHelp } from "../../../packages/learning/src/step-help";
import { WORKED_OUT } from "../../../packages/learning/src/worked-out";

test("every question of a worked-out type gets the whole working, every calculation in it is true, and it ends on the answer", () => {
  for (const f of WORKED_OUT) {
    let n = 0, boxes = 0, lines = 0;
    for (const { id } of pool(f).items) {
      if (/:(mc|w)$/.test(id)) continue;
      const h = stepsHelp(id)!, q = question(id);
      n++;
      assert.ok(h.length >= 3, `${id}: ${h.length} steps`);
      assert.ok(new RegExp(`(^|\\D)${q.answer}(\\D|$)`).test(h[h.length - 1].shown), `${id}: ${h[h.length - 1].shown}`);
      for (const s of h) {
        lines++;
        if (askOf(s.shown)) boxes++;
        // every "a × b = c", "a ÷ b = c", "a − b = c" and digit sum written in the working is true
        for (const m of s.shown.matchAll(/(\d+(?: [×÷+−] \d+)+) = (\d+)/g)) assert.equal(checkWorkingLines([`${m[1]} = ${m[2]}`])[0].state, "right", `${id}: ${m[0]}`);
        assert.ok(!/undefined|NaN/.test(s.next + s.shown), id);
      }
    }
    console.log(f, n, "questions,", lines, "steps,", boxes, "to fill");
    assert.ok(n > 50 && boxes / lines > 0.3, f);
  }
});

test("the working for the smallest prime factor of 551", () => {
  const h = stepsHelp("gen:agptest:1,551")!;
  assert.equal(h[0].shown, "It is 23: 23 × 23 = 529");
  assert.ok(h.some((s) => s.shown === "7 × 78 = 546. Left over: 551 − 546 = 5"));
  assert.ok(h.some((s) => s.shown === "551 ÷ 19 = 29"));
  assert.match(h[h.length - 1].shown, /smallest prime factor is 19\.$/);
});

test("cue-numbers@1: a plain calculation's cue names its numbers and never its result", () => {
  // a long division's "50 × 6" is the learner's own choice of 50: it is not named
  const div = pool("ldiv").items[0];
  assert.ok(stepsHelp(div.id)!.every((s) => !/: multiply \d/.test(s.next)), div.id);
  let named = 0;
  for (const f of ["acstory", "aeshop", "agchange", "aedrip", "acstory4", "aebig"]) for (const { id } of pool(f).items.slice(0, 40)) for (const s of stepsHelp(id) ?? []) {
    const m = /^(?:First|Next|Last): (add|take|multiply|divide) ([\d,.]+) (?:and|away from|by) ([\d,.]+)(?:,| and|\.)/.exec(s.next);
    if (!m) continue;
    named++;
    const a = Number(m[2].replace(/,/g, "")), b = Number(m[3].replace(/,/g, "")), r = m[1] === "add" ? null : m[1] === "take" ? b - a : m[1] === "multiply" ? a * b : a / b;
    // the result is in the step as shown, and is not said in the cue
    if (r !== null) { assert.ok(s.shown.replace(/(\d),(?=\d)/g, "$1").includes(String(Math.round(r * 1000) / 1000)), `${id}: ${s.next} / ${s.shown}`); assert.ok(r !== a && r !== b, id); }
  }
  assert.ok(named > 20, String(named));
});
