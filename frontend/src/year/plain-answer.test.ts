import assert from "node:assert/strict";
import { test } from "node:test";
import { plainAnswer } from "../../../packages/learning/src/plain-answer";

const Q = "There are 12 birds on a wire. 5 birds fly away. How many birds are left?";
test("a number followed by the question's own thing is read as the number", () => {
  assert.equal(plainAnswer(Q, "integer", "7 birds"), "7");
  assert.equal(plainAnswer(Q, "integer", " 7 Bird. "), "7");
  assert.equal(plainAnswer("Each box holds 6 mangoes. How many mangoes are in 3 boxes?", "integer", "18 mangoes"), "18");
});
test("nothing is guessed: units, other words, two numbers and other answer types stay as typed", () => {
  for (const t of ["7 cm", "7 crows", "7 birds 5", "seven birds", "7birds", "7 left over birds flew"]) assert.equal(plainAnswer(Q, "integer", t), t);
  assert.equal(plainAnswer("A ribbon is 3 m long. How many metres are 4 ribbons?", "integer", "12 metres"), "12 metres");
  assert.equal(plainAnswer("How many rupees are 3 notes of 10 rupees?", "integer", "30 rupees"), "30 rupees");
  assert.equal(plainAnswer(Q, "choice", "7 birds"), "7 birds");
  assert.equal(plainAnswer(Q, "integer", "7"), "7");
});
