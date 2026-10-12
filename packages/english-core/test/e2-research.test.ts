/**
 * E2a review: the E1 baseline stays reproducible, and the research seams change nothing in production.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { binaryUpdate } from "../src/index.ts";
import { REPO, loadContext } from "../../../tools/english/load.ts";
import { exactUpdate, slipUpdate } from "../../../tools/english/research/slip.ts";
import { fingerprint, runAll } from "../../../tools/english/sim/simulate.ts";
import { LEARNERS } from "../../../tools/english/sim/learners.ts";
import { runLearner } from "../../../tools/english/sim/run.ts";

test("the frozen simulation on the preserved E1 bank reproduces E1's results exactly", async () => {
  const baseline = JSON.parse(readFileSync(join(REPO, "tools", "english", "baselines", "e1-simulation-results.json"), "utf8"));
  const rs = await runAll(loadContext({ allowCandidateAnchors: true, bank: "e1" }));
  assert.equal(fingerprint(rs), baseline.fingerprint);
  assert.equal(loadContext({ bank: "e1" }).content.items.size, 126);
});

test("the research response-model seam is off in production and changes nothing when unset", async () => {
  const ctx = loadContext({ allowCandidateAnchors: true });
  assert.equal(ctx.researchBinaryUpdate, undefined);
  const goal = ctx.content.goals.get("overall")!;
  const o = { goal, sessionDays: [0, 1, 8], itemsPerSession: 15, seed: 3, evaluatorNoise: 0.7 };
  const a = await runLearner(ctx, LEARNERS[3], o);
  const b = await runLearner({ ...ctx, researchBinaryUpdate: binaryUpdate }, LEARNERS[3], o);
  assert.deepEqual(b.ledger.composite, a.ledger.composite);
  // production code never imports the research tools
  for (const f of readdirSync(join(REPO, "packages", "english-core", "src"))) assert.doesNotMatch(readFileSync(join(REPO, "packages", "english-core", "src", f), "utf8"), /research\//, f);
});

test("the slip-aware research model reduces to the production update when s = 0", () => {
  for (const [mean, variance, b, c, correct] of [[5, 0.36, 3, 0, false], [3, 2.25, 6, 0.25, true], [4, 1, 4, 1 / 24, false]] as const) {
    const p = { a: 1.2, b, c };
    const x = binaryUpdate({ mean, variance }, p, correct);
    const y = slipUpdate({ mean, variance }, p, correct, 0);
    assert.ok(Math.abs(x.mean - y.mean) < 1e-12 && Math.abs(x.variance - y.variance) < 1e-12);
    // with a tight prior, the exact posterior and the one-step update agree closely
    const e = exactUpdate({ mean, variance: 0.01 }, p, correct, 0);
    const o = binaryUpdate({ mean, variance: 0.01 }, p, correct);
    assert.ok(Math.abs(e.mean - o.mean) < 2e-3, `${e.mean} vs ${o.mean}`);
  }
});
