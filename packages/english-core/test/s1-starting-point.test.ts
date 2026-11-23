/**
 * starting-point@1: a placement result may set where a learner's estimates start. It is never evidence: it moves
 * only capabilities with no direct evidence, adds nothing that could make a capability "shown", and leaves a
 * history without one exactly as it was.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { LEARNERS } from "../../../tools/english/sim/learners.ts";
import { PROTOCOL } from "../../../tools/english/sim/criteria.ts";
import { runLearner } from "../../../tools/english/sim/run.ts";
import { Ledger, strandOf, type LedgerEvent } from "../src/index.ts";
import { T, ctx } from "./helpers.ts";

const start = (strands: Record<string, { mean: number; sd: number }>, id = "sp1"): LedgerEvent => ({ kind: "starting_point", id, at: T(0), source: "test", strands });

test("S1-1 a starting point moves the start of a strand's capabilities and nothing else", () => {
  const c = ctx();
  const { mean, sd } = c.index.framework.prior;
  const l = new Ledger(c, "x");
  const decisions = l.apply(start({ "EN.VOC": { mean: 2.5, sd: 1 }, "EN.RDG": { mean: 99, sd: 0.5 }, "EN.GRM": { mean: 3, sd: 0 } }));
  assert.deepEqual(decisions, [], "no decision: it is not evidence");
  for (const [id, n] of Object.entries(l.composite.nodes)) {
    const s = strandOf(id);
    const want = s === "EN.VOC" ? [2.5, 1] : s === "EN.RDG" ? [c.index.framework.scale.max, 0.25] : [mean, sd * sd];
    assert.deepEqual([n.direct.mean, n.direct.variance, n.combined.mean, n.combined.variance], [want[0], want[1], want[0], want[1]], id);
    assert.deepEqual([n.directN, n.contexts.length, n.demonstrations.length, n.evidence.length], [0, 0, 0, 0], `${id}: nothing that could count as shown`);
  }
  // a later starting point replaces an earlier one while there is still no evidence
  l.apply(start({ "EN.VOC": { mean: 5, sd: 1.2 } }, "sp2"));
  assert.ok(Object.entries(l.composite.nodes).filter(([id]) => strandOf(id) === "EN.VOC").every(([, n]) => n.direct.mean === 5));
  // and a rebuild from the same events gives the same record
  assert.deepEqual(Ledger.rebuild(c, "x", l.events).composite.nodes, l.composite.nodes);
});

test("S1-2 capabilities that already have evidence are left alone", async () => {
  const c = ctx();
  const goal = c.content.goals.get(PROTOCOL.goal)!;
  const r = await runLearner(c, LEARNERS[1], { goal, sessionDays: PROTOCOL.sessionDays.slice(0, 1), itemsPerSession: 12, seed: PROTOCOL.seed, evaluatorNoise: PROTOCOL.evaluatorNoise });
  const before = structuredClone(r.ledger.composite.nodes);
  const strands = Object.fromEntries([...new Set(Object.keys(before).map(strandOf))].map((s) => [s, { mean: 1.5, sd: 0.9 }]));
  r.ledger.apply(start(strands));
  let withEvidence = 0;
  for (const [id, n] of Object.entries(r.ledger.composite.nodes)) {
    if (before[id].directN > 0) {
      withEvidence++;
      assert.deepEqual(n.direct, before[id].direct, `${id}: evidence is never overwritten`);
    } else assert.equal(n.direct.mean, 1.5, id);
  }
  assert.ok(withEvidence > 0);
});
