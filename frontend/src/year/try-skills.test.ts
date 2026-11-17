import assert from "node:assert/strict";
import { test } from "node:test";
import { allSkills, findSkills } from "./try-skills";

test("every board's classes can be opened, and a search finds a skill in any class", () => {
  const all = allSkills();
  assert.ok(all.length > 800, String(all.length));
  for (const b of ["icse", "cbse", "tn"] as const) assert.ok(all.some((s) => s.board === b));
  const c5 = findSkills(all, "icse", 5, "");
  assert.ok(c5.length > 40 && c5.every((s) => s.board === "icse" && s.release.grade === 5));
  assert.equal(new Set(c5.map((s) => s.competency)).size, c5.length);
  const money = findSkills(all, "icse", 5, "rupees paise");
  assert.ok(money.length >= 1 && money[0].board === "icse" && money[0].release.grade === 5, "the chosen class comes first");
  assert.ok(findSkills(all, "icse", 5, "integra").some((s) => s.release.grade >= 11), "a search looks through every class");
  assert.deepEqual(findSkills(all, "icse", 5, "zzzz"), []);
});
