import assert from "node:assert/strict";
import { test } from "node:test";
import { question } from "../../../packages/learning/src/content";
import { pool } from "../../../packages/learning/src/families";
import { kidQuestion } from "../../../packages/learning/src/kid-say";
import { check } from "../../../packages/learning/src/scene";

test("lakh, crore and million questions carry the number with movable commas as an aid that fades", () => {
  let n = 0;
  for (const fam of ["ajmill", "ajmilr"]) for (const { id } of pool(fam).items) {
    if (/:(mc|w)$/.test(id)) continue;
    const q = question(id), k = kidQuestion(q);
    if (!k.aids) continue; // the "how many crore" wording has its own rule
    n++;
    const s = k.aids[0].figure as unknown as { type: string; kind: string; digits: string; style: string };
    assert.deepEqual([k.aids.length, k.aids[0].name, s.type, s.kind, s.style], [1, "commas", "scene", "commas", fam === "ajmill" ? "international" : "indian"], id);
    assert.deepEqual(check(s), [], id);
    assert.equal(k.figure, k.aids[0].figure, id);
    // the digits are the question's own number, and the picture never states the answer
    assert.ok(q.prompt.replace(/,/g, "").includes(s.digits), id);
    assert.ok(!JSON.stringify(s).includes(`"${q.answer}"`) && !/\b(?:is|are) \d/.test((s as unknown as { success: string }).success), id);
  }
  assert.ok(n > 100, String(n));
});
