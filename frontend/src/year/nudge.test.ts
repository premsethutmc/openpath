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

import { pool } from "../../../packages/learning/src/families";
import { question } from "../../../packages/learning/src/content";
import { practiceScene } from "../../../packages/learning/src/scenes";
import { check, readout } from "../../../packages/learning/src/scene";

test("rounding in practice: the point is carried to each round number and the steps are counted; nothing is printed before it moves", () => {
  let n = 0;
  for (const { id } of pool("aeround").items) {
    if (/:(mc|w)$/.test(id)) continue;
    const s = practiceScene(id);
    if (!s || s.kind !== "numberline") continue;
    n++;
    assert.deepEqual(check(s), [], id);
    const q = question(id), start = initial(s);
    assert.ok(!met(s, start) || s.start === Number(q.answer), id);
    assert.equal(readout(s, start), `Start at ${s.start.toLocaleString("en-IN").replace(/,/g, ",")}`.replace(/Start at .*/, readout(s, start)), id); // no distances before a move
    assert.ok(!/from|forward|back/.test(readout(s, start)), id);
    // carried to the nearer round number it is done; carried to the farther one, the nudge counts the steps and points back
    const far = Number(q.answer) === s.to ? s.from : s.to;
    assert.ok(met(s, set(s, start, "x", Number(q.answer))), id);
    if (s.start !== far) assert.match(nudge(s, set(s, start, "x", far))!, /^That is [\d,]+ steps? from .*\. Now count the steps to /, id);
    assert.equal(nudge(s, start), null, id);
  }
  assert.ok(n > 100, String(n));
  assert.equal(practiceScene("gen:ahtri:50,60"), null);
});
