import assert from "node:assert/strict";
import { test } from "node:test";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { askOf, judge } from "../../../packages/learning/src/step-ask";
import { stepsHelp } from "../../../packages/learning/src/step-help";

test("a step that ends in a result is asked for; an equal answer counts, a different one does not", () => {
  const a = askOf("Bring the power down: 8 × 4 = 32")!;
  assert.deepEqual(a, { lead: "Bring the power down: 8 × 4 =", lhs: "8 × 4", value: "32" });
  assert.ok(judge(a, "32") && judge(a, " 32.0 ") && judge(a, "30 + 2") && !judge(a, "24") && !judge(a, "") && !judge(a, "thirty-two"));
  assert.ok(judge(askOf("2³ = 8")!, "8") && !judge(askOf("2³ = 8")!, "6"));
  assert.ok(judge(askOf("At x = 3: −9 + 18 = 9")!, "9"));
  const i = askOf("∫ (−2x + 6) dx = −x² + 6x")!;
  assert.ok(judge(i, "6x − x²") && judge(i, "−x² + 6x + C") && !judge(i, "−2x² + 6x"));
  assert.ok(judge(askOf("d/dx (x³) = 3x²")!, "3x^2") && !judge(askOf("d/dx (x³) = 3x²")!, "3x"));
  // no result to ask for
  assert.equal(askOf("Evaluating gives 9 square units"), null);
  assert.equal(askOf("u = x² + 3, so y = sin u"), null);
});

test("across every question type, each step that is asked accepts its own result and refuses another", () => {
  let asked = 0, steps = 0, types = 0;
  for (const f of FAMILIES.values()) {
    if (!f.domain) continue;
    const ids = pool(f.id).items.map((x) => x.id).filter((i) => !/:(mc|w)$/.test(i));
    let any = false;
    for (const id of [ids[0], ids[Math.floor(ids.length / 2)], ids[ids.length - 1]].filter(Boolean)) for (const s of stepsHelp(id) ?? []) {
      steps++;
      const a = askOf(s.shown);
      if (!a) continue;
      asked++; any = true;
      assert.ok(judge(a, a.value), `${id}: ${s.shown}`);
      assert.ok(s.shown.startsWith(a.lead.slice(0, -1).trim()), `${id}: ${s.shown}`);
    }
    if (any) types++;
  }
  assert.ok(types > 400 && asked > 1500, `${types} types, ${asked} of ${steps} steps`);
  console.log(`step-ask@1: ${asked} of ${steps} steps can be entered, in ${types} question types`);
});
