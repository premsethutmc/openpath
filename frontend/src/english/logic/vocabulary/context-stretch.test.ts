import test from "node:test";
import assert from "node:assert/strict";
import { firstContextItem, nextContextItems, observedContextCount } from "./context-stretch.ts";

test("stretch starts with one hard item and branches to two fresh items without repeating the word", () => {
  assert.equal(firstContextItem.word, "equivocal");
  const deeper = nextContextItems(firstContextItem.answer);
  const bridge = nextContextItems(null);
  assert.deepEqual(deeper.map((q) => q.word), ["attenuate", "preclude"]);
  assert.deepEqual(bridge.map((q) => q.word), ["reluctant", "tentative"]);
  assert.deepEqual(nextContextItems(0), bridge);
  for (const q of [firstContextItem, ...deeper, ...bridge]) {
    assert.ok(q.sentence.includes(q.word));
    assert.equal(new Set(q.choices).size, 3);
    assert.ok(q.choices[q.answer] && q.why.every(Boolean) && q.clue);
  }
  assert.equal(observedContextCount([firstContextItem, ...deeper], [firstContextItem.answer, 0, 2]), 3);
  assert.equal(observedContextCount([firstContextItem, ...bridge], [null, 1, 2]), 1);
});
