import test from "node:test";
import assert from "node:assert/strict";
import { ROUNDS, SOUNDS, nextGroup, roundsFor, soundProblems, soundSummary } from "./sounds.ts";

test("SO-1 content: six pairs of sounds, five or more word pairs each, real single words", () => {
  assert.deepEqual(soundProblems(), []);
  assert.deepEqual(SOUNDS.groups.map((g) => g.id), ["v_w", "f_p", "z_j", "s_sh", "th_t", "i_ee"]);
});

test("SO-2 a sitting: eight rounds, every pair met, both words of a pair said, no pair twice running", () => {
  for (const g of SOUNDS.groups)
    for (const seed of [1, 2, 3, 99, 12345]) {
      const r = roundsFor(g, seed);
      assert.equal(r.length, ROUNDS);
      assert.ok(new Set(r.map((x) => x.pair)).size >= Math.min(g.pairs.length, ROUNDS) - 1, g.id);
      for (let i = 1; i < r.length; i++) assert.notEqual(r[i].pair, r[i - 1].pair);
      for (const x of r) assert.ok(x.pair.includes(x.said));
    }
  const said = SOUNDS.groups.flatMap((g) => [1, 2, 3, 4, 5, 6, 7, 8].flatMap((s) => roundsFor(g, s).map((x) => x.pair.indexOf(x.said))));
  const first = said.filter((i) => i === 0).length / said.length;
  assert.ok(first > 0.35 && first < 0.65, `first word ${first}`);
});

test("SO-3 what to suggest: untried first, then the least sure; sure after two strong sittings", () => {
  assert.equal(nextGroup([]), "v_w");
  const strong = (group: string) => ({ type: "sitting" as const, group, right: 8, asked: 8 });
  const recs = SOUNDS.groups.map((g) => strong(g.id));
  recs.push({ type: "sitting", group: "f_p", right: 3, asked: 8 });
  assert.equal(nextGroup(recs), "f_p");
  const s = soundSummary([...recs, strong("v_w")]);
  assert.equal(s.find((x) => x.id === "v_w")!.sure, true);
  assert.equal(s.find((x) => x.id === "f_p")!.sure, false);
});
