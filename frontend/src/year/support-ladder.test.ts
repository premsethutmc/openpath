import assert from "node:assert/strict";
import { test } from "node:test";
import { question } from "../../../packages/learning/src/content";
import { kidQuestion } from "../../../packages/learning/src/kid-say";
import { supportStep, type Tried } from "../../../packages/learning/src/support-ladder";

const R: Tried = { right: true, helped: false }, H: Tried = { right: true, helped: true }, W: Tried = { right: false, helped: false };
test("two right alone move up a step, two wrong move down, help never moves up", () => {
  assert.equal(supportStep([], 2), 0);
  assert.equal(supportStep([R], 2), 0);
  assert.equal(supportStep([R, R], 2), 1);
  assert.equal(supportStep([R, R, R, R], 2), 2);
  assert.equal(supportStep([R, R, R, R, R, R], 2), 2); // bare is the top
  assert.equal(supportStep([R, H, R], 2), 0); // help in between breaks the run
  assert.equal(supportStep([H, H, H, H], 2), 0);
  assert.equal(supportStep([R, R, W], 2), 1); // one slip stays
  assert.equal(supportStep([R, R, W, W], 2), 0);
  assert.equal(supportStep([R, R, W, R, W], 2), 1);
  assert.equal(supportStep([W, W, W], 2), 0);
});

test("a sum of money names its aids, most help first: coins, then columns", () => {
  const k = kidQuestion(question("gen:acmoneyadd:7,11,3,3,1"));
  assert.deepEqual(k.aids?.map((a) => a.name), ["coins", "columns"]);
  assert.equal((k.aids![0].figure as { type: string }).type, "money");
  assert.deepEqual(k.aids![1].figure, { type: "table", head: ["", "rupees", "paise"], rows: [["", 7, 55], ["−", 3, 15]] });
  assert.deepEqual(k.figure, k.aids![0].figure);
  // a question whose picture is its data (a bill) has no aids: its picture never fades
  assert.equal(kidQuestion(question("gen:acbill:0,0,0")).aids, undefined);
});
