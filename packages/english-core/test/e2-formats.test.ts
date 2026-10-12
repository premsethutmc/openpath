/**
 * E2-3: new code-scored formats (order, match, multi). Each scores to right or wrong plus misconception
 * tags, so the composite update mathematics are unchanged; each format sets its own guessing floor.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type CodeItem, type ContentBundle, Ledger, binaryUpdate, guessingFloor, itemParams, responseKey, scoreCode, validateContent } from "../src/index.ts";
import { ctx } from "./helpers.ts";

const base = { version: 1, a: 1.2, b: 4, prompt: "test", review: "candidate-unvalidated" };

const ORDER: CodeItem = {
  ...base,
  id: "t.order",
  target: "EN.RDG.SUM.main_idea",
  format: "order:paragraphs",
  options: ["Then", "First", "Finally", "Next"],
  answer_order: [1, 3, 0, 2],
  wrong: { "0,1,3,2": "detail_as_main" },
};
const MATCH: CodeItem = {
  ...base,
  id: "t.match",
  target: "EN.VOC.BRD.general",
  format: "match:meaning",
  left: ["huge", "tiny", "rapid"],
  options: ["very small", "very big", "fast", "loud"],
  answer_pairs: [1, 0, 2],
};
const MULTI: CodeItem = {
  ...base,
  id: "t.multi",
  target: "EN.GRM.PUN.commas",
  format: "multi:comma_places",
  options: ["after 'Yesterday'", "after 'we'", "after 'shop'", "after 'bread'", "after 'milk'"],
  answer_set: [0, 3],
  wrong: { "1,3": "missing_intro_comma" },
};

test("order, match and multi score exactly, with no partial credit", () => {
  assert.equal(scoreCode(ORDER, { kind: "order", order: [1, 3, 0, 2] }).correct, true);
  assert.equal(scoreCode(ORDER, { kind: "order", order: [1, 0, 3, 2] }).correct, false);
  assert.equal(scoreCode(MATCH, { kind: "match", pairs: [1, 0, 2] }).correct, true);
  assert.equal(scoreCode(MATCH, { kind: "match", pairs: [1, 0, 3] }).correct, false, "two of three right is still wrong");
  assert.equal(scoreCode(MULTI, { kind: "multi", choices: [3, 0] }).correct, true, "the order of choices does not matter");
  assert.equal(scoreCode(MULTI, { kind: "multi", choices: [0, 3, 4] }).correct, false, "an extra choice is wrong");
  assert.equal(scoreCode(MULTI, { kind: "multi", choices: [0] }).correct, false, "a missing choice is wrong");
});

test("wrong answers map to the item's listed misconceptions only", () => {
  assert.deepEqual(scoreCode(ORDER, { kind: "order", order: [0, 1, 3, 2] }).misconceptions, ["detail_as_main"]);
  assert.deepEqual(scoreCode(MULTI, { kind: "multi", choices: [3, 1] }).misconceptions, ["missing_intro_comma"]);
  assert.deepEqual(scoreCode(MULTI, { kind: "multi", choices: [2, 4] }).misconceptions, []);
  assert.equal(responseKey({ kind: "multi", choices: [3, 1] }), "1,3");
});

test("a response of the wrong kind is refused, as before", () => {
  assert.throws(() => scoreCode(ORDER, { kind: "choice", choice: 1 }), /expects an order answer/);
  assert.throws(() => scoreCode(MATCH, { kind: "typed", text: "x" }), /expects a match answer/);
});

test("guessing floors follow from the format", () => {
  assert.equal(guessingFloor(ORDER), 1 / 24);
  assert.equal(guessingFloor(MATCH), 1 / 24, "3 entries, 4 options: 4 × 3 × 2 arrangements");
  assert.equal(guessingFloor(MULTI), 1 / 10, "2 of 5");
  assert.equal(guessingFloor({ ...MULTI, format: "choice:x", answer: 0 }), 1 / 5);
  assert.equal(guessingFloor({ ...MULTI, format: "typed:x", answers: ["a"] }), 0);
  // the floor enters the existing update as the 3PL c parameter; nothing else changes
  const e = { mean: 4, variance: 1 };
  assert.deepEqual(binaryUpdate(e, itemParams(ORDER), true), binaryUpdate(e, { a: 1.2, b: 4, c: 1 / 24 }, true));
});

test("content validation rejects badly formed order, match and multi items", () => {
  const check = (item: CodeItem) => validateContent({ items: [{ kind: "code", ...item }], passages: [], goals: [], misspellings: {} } as ContentBundle, ctx().index);
  assert.deepEqual(check(ORDER), []);
  assert.deepEqual(check(MATCH), []);
  assert.deepEqual(check(MULTI), []);
  assert.match(check({ ...ORDER, answer_order: [0, 1, 2, 3] }).join(), /already in the right order/);
  assert.match(check({ ...ORDER, answer_order: [1, 1, 0, 2] }).join(), /every option index exactly once/);
  assert.match(check({ ...MATCH, answer_pairs: [1, 1, 2] }).join(), /one distinct option per entry/);
  assert.match(check({ ...MULTI, answer_set: [0, 1, 2, 3, 4] }).join(), /some, not all/);
  assert.match(check({ ...MULTI, wrong: { "1,3": "not_a_tag" } }).join(), /uses misconception not_a_tag/);
});

test("the ledger applies a new-format answer through the unchanged updater", () => {
  const c = ctx();
  const items = new Map(c.content.items);
  items.set(MATCH.id, { kind: "code", ...MATCH });
  const l = new Ledger({ ...c, content: { ...c.content, items } }, "x");
  const [d] = l.apply({ kind: "evidence", id: "e1", at: "2026-10-12T10:00:00.000Z", session: "s", item: { id: MATCH.id, version: 1 }, response: { kind: "match", pairs: [1, 0, 2] } });
  assert.equal(d.verdict, "accepted");
  assert.equal(d.observation!.value, 1);
  const prior = { mean: 4, variance: 2.25 };
  const expected = binaryUpdate(prior, itemParams(MATCH), true);
  assert.ok(Math.abs(l.composite.nodes[MATCH.target].direct.mean - expected.mean) < 1e-12);
});
