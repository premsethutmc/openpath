/** where-used@1: every entry is for a real skill, short, and has one right answer. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleFor } from "../../../packages/learning/src/content";
import { USES, useFor } from "../../../packages/learning/src/uses";
import { allSkills } from "./try-skills";

test("where a skill is used: real skills, two short lines, one playful question with one right answer", () => {
  for (const [c, u] of Object.entries(USES)) {
    assert.ok(moduleFor(c), `${c} is not a skill with a module`);
    assert.ok(u.title.length <= 30 && u.lines.length === 2 && u.lines.every((t) => t.length <= 140), c);
    assert.ok(u.ask.choices.length >= 2 && u.ask.choices.length <= 3 && new Set(u.ask.choices).size === u.ask.choices.length && u.ask.right >= 0 && u.ask.right < u.ask.choices.length && u.ask.reply.length > 5, c);
  }
  const c5 = allSkills().filter((s) => s.board === "icse" && s.release.grade === 5);
  const have = c5.filter((s) => useFor(s.competency)).length;
  console.log(`${have} of ${c5.length} Class 5 skills`);
  assert.ok(have >= 35);
  assert.equal(useFor("MATH.number.primes"), null, "no forced use");
  assert.equal(useFor(undefined), null);
});
