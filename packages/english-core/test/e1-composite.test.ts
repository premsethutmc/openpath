import assert from "node:assert/strict";
import { test } from "node:test";
import { applyDirect, bandUpdate, binaryUpdate, createComposite, inflate, itemParams, leafView, rng, type CodeItem } from "../src/index.ts";
import { T, ctx, near } from "./helpers.ts";

test("E1-3 the worked examples in COMPOSITE_MODEL.md reproduce to 2 decimals", () => {
  let e = { mean: 4, variance: 1.5 ** 2 };
  e = binaryUpdate(e, { a: 1.2, b: 4.5, c: 0 }, true);
  assert.ok(near(e.mean, 5.0) && near(Math.sqrt(e.variance), 1.14), `item 1: ${e.mean} ${Math.sqrt(e.variance)}`);
  e = binaryUpdate(e, { a: 1.2, b: 5.5, c: 0 }, false);
  assert.ok(near(e.mean, 4.62) && near(Math.sqrt(e.variance), 0.95), `item 2: ${e.mean} ${Math.sqrt(e.variance)}`);
  const j = bandUpdate({ mean: 4.62, variance: 0.95 ** 2 }, 3.5, 0.8);
  assert.ok(near(j.mean, 3.96) && near(Math.sqrt(j.variance), 0.61), `judged: ${j.mean} ${Math.sqrt(j.variance)}`);
  const q = ctx().index.framework.policy.time_variance_per_day;
  const later = inflate({ mean: 5, variance: 0.36 }, 60, q, 2.25);
  assert.ok(Math.abs(Math.sqrt(later.variance) - 0.8) < 0.02, `two months: sd ${Math.sqrt(later.variance)}`);
  assert.equal(later.mean, 5, "time never moves the mean");
});

test("E1-4 built-in rules hold over thousands of random evidence sequences", () => {
  const { index, content } = ctx();
  const items = [...content.items.values()].filter((i) => i.kind === "code") as (CodeItem & { kind: "code" })[];
  const prior = index.framework.prior.sd ** 2;
  const next = rng(4);
  let observations = 0;
  for (let run = 0; run < 60; run++) {
    const c = createComposite(index, `r${run}`);
    const sessionCount = 1 + Math.floor(next() * 4);
    for (let s = 0; s < sessionCount; s++)
      for (let k = 0; k < 40; k++) {
        const item = items[Math.floor(next() * items.length)];
        const at = T(k, s * (1 + Math.floor(next() * 10)));
        const node = c.nodes[item.target];
        const correct = next() < 0.6;
        const before = { combined: node.combined.variance, direct: node.direct.variance };
        // time first: uncertainty may grow, but never past the prior
        const viewBefore = leafView(c, index, item.target, at);
        assert.ok(viewBefore.sd ** 2 <= prior + 1e-9);
        applyDirect(c, index, { capability: item.target, at, session: `s${s}`, context: item.format, decisionId: `d${k}`, update: (e) => binaryUpdate(e, itemParams(item), correct), misconceptions: [], binary: { b: item.b, correct } });
        observations++;
        // evidence never raises uncertainty (beyond the time growth applied first)
        const grown = (v: number) => Math.min(prior, v + index.framework.policy.time_variance_per_day * 40);
        assert.ok(node.combined.variance <= grown(before.combined) + 1e-9);
        assert.ok(node.direct.variance <= grown(before.direct) + 1e-9);
      }
    for (const id of index.leafIds) {
      const v = leafView(c, index, id, T(0, 60));
      if (sessionCount === 1) assert.notEqual(v.stage, "mastered", "one session can never produce mastery");
      if (v.direct.n === 0) {
        assert.equal(v.demonstrated, null, "inferred changes never make a capability demonstrated");
        assert.equal(v.mastered, null);
        assert.equal(v.stage, "unassessed");
      }
    }
  }
  assert.ok(observations >= 2000, `${observations} observations`);
});

test("E1-4 a capability known only through couplings stays unassessed, however strong the coupled evidence", () => {
  const { index } = ctx();
  const c = createComposite(index, "x");
  for (let s = 0; s < 4; s++)
    for (let k = 0; k < 10; k++)
      applyDirect(c, index, { capability: "EN.GRM.VERB.sva", at: T(k, s * 8), session: `s${s}`, context: k % 2 ? "a" : "b", decisionId: `d${s}${k}`, update: (e) => bandUpdate(e, 7.5, 0.5), misconceptions: [] });
  const sva = leafView(c, index, "EN.GRM.VERB.sva", T(0, 40));
  const coupled = leafView(c, index, "EN.WRT.ACC.grammar", T(0, 40));
  assert.equal(sva.stage, "mastered");
  assert.ok(coupled.inferred && coupled.mean > index.framework.prior.mean, "the coupled capability moved, flagged as inferred");
  assert.equal(coupled.stage, "unassessed");
  assert.equal(coupled.demonstrated, null);
});
