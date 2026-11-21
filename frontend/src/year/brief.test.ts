/** brief@1: a rule opened inside a question is one short line and a one-line example, for every skill with a card. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { briefOf, cardFor } from "../../../packages/learning/src/step-help";
import { graph } from "../../../packages/learning/src/graph";

const cards = [...graph.byId.keys()].map((id) => cardFor(id)).filter((c) => c !== null);

test("every opened rule is short, without bracketed asides, and its example is one line", () => {
  assert.ok(cards.length > 50);
  for (const c of cards) {
    const b = briefOf(c!);
    assert.ok(b.rule.length > 0, c!.competency);
    assert.ok(b.rule.length <= 160 || !/[.!?]\s+\S.*[.!?]/.test(b.rule), `${c!.competency}: ${b.rule}`);
    assert.doesNotMatch(b.rule, /\(/, c!.competency);
    if (b.example) assert.ok(b.example.length <= 140 && !b.example.includes("\n"), c!.competency);
  }
});

test("rounding: both halves of the rule, in one line", () => {
  const c = cards.find((x) => /digit just to the right/.test(x!.rule.join(" ")))!;
  const b = briefOf(c);
  assert.match(b.rule, /less than five, round down\. If it is five or more, round up\.$/);
  assert.match(b.example ?? "", /7,?274.*→ 7,?300/);
});
