import test from "node:test";
import assert from "node:assert/strict";
import history from "../../../content/learning/historical-answers.v1.json";
import generated from "../../../content/learning/generated.v1.json";
import { inPool, problemOf } from "../../../packages/learning/src/families";
import { question } from "../../../packages/learning/src/content";

test("previously served questions retain answers and choice letters in the app and server table", () => {
  const table = generated.families as Record<string, { items: Record<string, string> }>;
  let count = 0;
  for (const [family, items] of Object.entries(history.families)) for (const [key, answer] of Object.entries(items)) {
    const id = `gen:${family}:${key}`;
    assert.equal(question(id).answer, answer, id);
    assert.equal(table[family].items[key], answer, `server: ${id}`);
    count++;
  }
  assert.equal(count, 2372);
});

test("historical rational questions remain readable without restoring them to new release pools", () => {
  const id = "gen:ajinv:2,-7,6,3,5";
  assert.ok(problemOf(id));
  assert.equal(inPool(id), false);
});
