/**
 * The 16 misconception-targeted explanations in served modules (none of their families declares contrast evidence): the correct teaching
 * is kept, the claim about what the learner did is reworded as a common mix-up (no screen says "… was added" / "what went wrong"), and
 * each is pending educator review with a new revision. None needed to be withheld: every one teaches correct mathematics once the claim
 * sentence is reworded.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { modules } from "../../../packages/learning/src/content";

const SIXTEEN = ["fix_shaded_to_unshaded", "fix_count_only", "fix_middle_not_doubled", "fix_middle_sign", "fix_mean_for_median", "fix_one_middle", "fix_colours_equally_likely",
  "fix_assume_tens_read", "fix_assume_tens", "fix_added_both", "fix_added_both_taken", "fix_took_away_again", "fix_same_operation_add", "fix_same_operation_take", "fix_subtract_coefficient", "fix_add_for_multiply"];
/** the claim sentences these screens used to open with (what the learner was said to have done) */
const OLD_CLAIMS = ["The shaded squares were put over", "Only the shaded squares were counted", "The middle term was written as ab", "The mean was worked out",
  "Each colour was taken as", "Each line was taken as", "Both numbers you can see were added", "The number was taken away a second time",
  "The same operation was done again", "The number next to x was taken away", "The number was added instead of multiplied"];
/** two screens never made a claim (they state the mathematics only) and are unchanged apart from the title */
const NO_CLAIM = new Set(["fix_middle_sign", "fix_one_middle"]);

test("the 16 targeted explanations: correct teaching kept, no claim about the learner, pending educator review", () => {
  const found = modules.flatMap((m) => m.strategies.filter((s) => s.addresses).map((s) => ({ m, s })));
  assert.deepEqual(found.map((x) => x.s.id).sort(), [...SIXTEEN].sort(), "exactly the 16 reported");
  const reg = JSON.parse(readFileSync(new URL("../../../content/learning/explanation-review.v1.json", import.meta.url), "utf8")).entries as { competency: string; strategy: string; revisions: { status: string }[] }[];
  for (const { m, s } of found) {
    for (const sc of s.screens.filter((x) => x.role === "misconception")) {
      assert.doesNotMatch(sc.title, /what went wrong/i, `${s.id}: ${sc.title}`);
      for (const line of sc.text) assert.ok(!OLD_CLAIMS.some((c) => line.includes(c)), `${s.id}: ${line}`);
      if (!NO_CLAIM.has(s.id)) assert.match(sc.text[0], /^A common mix-up is to /, s.id);
      assert.ok(sc.math?.some((l) => /^Not .*, but /.test(l)), `${s.id}: the right value is still worked out`);
    }
    assert.ok(s.screens.some((x) => x.role !== "misconception"), `${s.id}: the solved-correctly part is kept`);
    const r = reg.find((x) => x.competency === m.competency && x.strategy === s.id)!;
    assert.equal(r.revisions.at(-1)!.status, "pending_review", s.id);
    assert.ok(r.revisions.length >= 2, `${s.id}: reworded content is a new revision (the earlier one no longer applies)`);
  }
});
