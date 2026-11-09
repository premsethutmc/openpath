import assert from "node:assert/strict";
import { test } from "node:test";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
/** choice@1: in every choice question the family's independent check accepts the keyed option and refuses every other one, and
 *  gives the same verdicts under Node and Bun. Regression for atgen (a sign-change scan missed roots on its grid, so it accepted
 *  options missing half the solutions) and abunit (overlapping unit ranges). Marking uses the key; this keeps the key checked. */
const verdicts = (fam: string) => {
  const def = FAMILIES.get(fam)!;
  return pool(fam).items.map((p) => {
    const t = problemOf(p.id)!;
    const ok = [...Array(p.options?.length ?? 4).keys()].filter((v) => { try { return def.validate(t.params, v as never); } catch { return false; } });
    return { id: p.id, key: "ABCDEF".indexOf(p.answer), ok };
  });
};
const choiceFamilies = () => [...FAMILIES.values()].filter((f) => f.domain && f.type === "choice").map((f) => f.id);

test("choice@1 (node): every choice question of every family: the check accepts exactly the key", () => {
  const fams = choiceFamilies();
  assert.ok(fams.length > 100);
  const bad = fams.flatMap((f) => verdicts(f).filter((v) => v.ok.length !== 1 || v.ok[0] !== v.key).map((v) => `${v.id}: key ${v.key}, accepted [${v.ok}]`));
  assert.deepEqual(bad, []);
});
test("choice@1 (node): atgen's ten questions with roots on the old grid accept only the key", () => {
  const at = new Map(verdicts("atgen").map((v) => [v.id, v]));
  for (const id of ["gen:atgen:1,1,2,0", "gen:atgen:1,1,2,1", "gen:atgen:1,5,1,0", "gen:atgen:1,5,1,1", "gen:atgen:2,0,1,0", "gen:atgen:2,0,1,1", "gen:atgen:2,4,2,0", "gen:atgen:2,4,2,1", "gen:atgen:0,5,1,0", "gen:atgen:0,5,1,1"])
    assert.deepEqual(at.get(id)!.ok, [at.get(id)!.key]);
  assert.equal(verdicts("atgen").length, 108);
});
