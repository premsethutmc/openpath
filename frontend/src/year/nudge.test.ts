import assert from "node:assert/strict";
import { test } from "node:test";
import { initial, met, nudge, set, type Scene } from "../../../packages/learning/src/scene";

const intl = { type: "scene", kind: "commas", digits: "213000000", style: "international", prompt: "p", success: "s", goal: { measure: "miss", equals: 0 } } as unknown as Scene;
const at = (s: Scene, a: number, b: number) => set(s, set(s, initial(s), "a", a), "b", b);
test("a nudge names the first group from the right that is the wrong size, and never the answer", () => {
  assert.equal(nudge(intl, at(intl, 2, 6)), "The last group on the right has 2 digits; it should have 3.");
  assert.equal(nudge(intl, at(intl, 3, 8)), "The last group is right. The group before it has 5 digits; it should have 3.");
  assert.equal(nudge(intl, at(intl, 8, 3)), "The last group is right. The group before it has 5 digits; it should have 3."); // either comma may be the first
  assert.equal(nudge(intl, at(intl, 4, 4)), "The last group on the right has 4 digits; it should have 3.");
  const done = at(intl, 3, 6);
  assert.ok(met(intl, done));
  assert.equal(nudge(intl, done), null);
  const indian = { ...(intl as object), style: "indian" } as unknown as Scene;
  assert.match(nudge(indian, set(indian, set(indian, set(indian, initial(indian), "a", 3), "b", 6), "c", 7))!, /^The last group is right\. The group before it has 3 digits; it should have 2\.$/);
  for (const n of [nudge(intl, at(intl, 2, 6)), nudge(intl, at(intl, 3, 8))]) assert.ok(!/213|million/.test(n!));
});
