import { describe, expect, test } from "bun:test";
import { FAMILIES, pool, problemOf } from "./families";
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

describe("choice@1 (bun)", () => {
  test("every choice question of every family: the check accepts exactly the key", () => {
    const fams = choiceFamilies();
    expect(fams.length).toBeGreaterThan(100);
    const bad = fams.flatMap((f) => verdicts(f).filter((v) => v.ok.length !== 1 || v.ok[0] !== v.key).map((v) => `${v.id}: key ${v.key}, accepted [${v.ok}]`));
    expect(bad).toEqual([]);
  }, 600_000);
  test("atgen: options that miss solutions on grid points are refused (the eight that were accepted)", () => {
    const at = new Map(verdicts("atgen").map((v) => [v.id, v]));
    for (const id of ["gen:atgen:1,1,2,0", "gen:atgen:1,1,2,1", "gen:atgen:1,5,1,0", "gen:atgen:1,5,1,1", "gen:atgen:2,0,1,0", "gen:atgen:2,0,1,1", "gen:atgen:2,4,2,0", "gen:atgen:2,4,2,1", "gen:atgen:0,5,1,0", "gen:atgen:0,5,1,1"])
      expect(at.get(id)!.ok).toEqual([at.get(id)!.key]);
    expect(verdicts("atgen").length).toBe(108);
  });
});
