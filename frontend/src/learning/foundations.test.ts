/** foundations@1: every start-here entry belongs to a real skill and is complete enough to teach from. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleFor } from "../../../packages/learning/src/content";
import { foundations, foundationsOf, PICTURES } from "../../../packages/learning/src/foundations";

test("start-here teaching is attached to real skills and is well formed", () => {
  const seen = new Set<string>();
  for (const f of foundations) {
    assert.ok(moduleFor(f.competency), `${f.competency} is not a skill with a lesson`);
    assert.ok(!seen.has(`${f.competency}|${f.concept}`), `${f.competency}: ${f.concept} twice`);
    seen.add(`${f.competency}|${f.concept}`);
    assert.ok(f.concept.trim() && f.screens.length >= 1 && f.screens.length <= 3, `${f.competency}: ${f.concept}`);
    for (const s of f.screens) {
      assert.ok(s.title.trim() && s.text.length >= 1 && s.text.every((t) => t.trim().length > 0), `${f.competency}: ${s.title}`);
      assert.ok(!s.picture || (PICTURES as readonly string[]).includes(s.picture), `${f.competency}: picture ${s.picture}`);
      assert.ok(!s.check || (s.check.question.trim() && s.check.answer.trim()), `${f.competency}: check`);
      assert.ok(![s.title, ...s.text, ...(s.example ?? [])].some((t) => /\\\(|\$\$|\*\*|undefined|NaN/.test(t)), `${f.competency}: markup in ${s.title}`);
    }
  }
});

test("trigonometry starts with what sin, cos and tan are", () => {
  const f = foundationsOf("MATH.trigonometry.ratios");
  const all = JSON.stringify(f).toLowerCase();
  assert.ok(f.length > 0 && all.includes("opposite") && all.includes("hypotenuse") && all.includes("adjacent"));
  assert.ok(f.some((x) => x.screens.some((s) => s.picture === "right-triangle")));
});
