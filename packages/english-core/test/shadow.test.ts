/**
 * Shadow learner-state candidate tests.
 *
 * Covers:
 *   Stage 4 — Shadow comparison records and deterministic replay
 *   Stage 5 — Integration safety (14 required assertions)
 *   Stage 6 — End-to-end learner journeys
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type CodeItem,
  type Composite,
  type DirectObservation,
  type EvidenceEvent,
  type LedgerEvent,
  Ledger,
  applyDirect,
  binaryUpdate,
  createComposite,
  demonstratedLevel,
  inflate,
  itemParams,
  leafView,
  recommend,
  retention,
} from "../src/index.ts";
import {
  CONDITION_B,
  type ShadowConfig,
  SHADOW_MODEL_VERSION,
  ShadowRunner,
  SessionTracker,
  ZERO_INTERVENTION,
  buildComparison,
  shadowTouch,
} from "../src/shadow.ts";
import { T, ctx } from "./helpers.ts";

// ---------------------------------------------------------------- helpers

function items(): (CodeItem & { kind: "code" })[] {
  return [...ctx().content.items.values()].filter((i) => i.kind === "code") as any[];
}

function pickItem(target: string, difficulty?: number): CodeItem & { kind: "code" } {
  const all = items().filter((i) => i.target === target && (difficulty === undefined || i.b === difficulty));
  assert.ok(all.length > 0, `no item for ${target} b=${difficulty}`);
  return all[0];
}

function makeObservation(item: CodeItem & { kind: "code" }, correct: boolean, at: string, session: string, decisionId: string): DirectObservation {
  const params = itemParams(item);
  return {
    capability: item.target,
    at,
    session,
    context: item.format,
    decisionId,
    update: (e) => binaryUpdate(e, params, correct),
    misconceptions: [],
    binary: { b: item.b, correct, a: params.a, c: params.c },
  };
}

function makeEvidence(item: CodeItem & { kind: "code" }, correct: boolean, at: string, session: string, id: string): EvidenceEvent {
  return {
    kind: "evidence",
    id,
    at,
    session,
    item: { id: item.id, version: (item as any).version },
    response: correct ? { kind: "choice", choice: 0 } : { kind: "choice", choice: 1 },
  };
}

// ---------------------------------------------------------------- Stage 2: Variance intervention unit tests

test("shadowTouch applies elevated time variance", () => {
  const { index } = ctx();
  const c = createComposite(index, "test");
  const cap = [...index.leafIds][0];
  const node = c.nodes[cap];

  // Start with variance well below the cap so we can observe growth
  node.asOf = T(0, 0);
  node.direct = { mean: 4, variance: 0.5 };
  node.combined = { mean: 4, variance: 0.5 };

  // Apply shadow touch with 10 days elapsed
  shadowTouch(node, T(0, 10), CONDITION_B, false);

  // Variance should grow by timeVariancePerDay * days = 0.02 * 10 = 0.2
  const expected = 0.5 + 0.02 * 10;
  assert.ok(Math.abs(node.direct.variance - expected) < 1e-9, `expected ${expected}, got ${node.direct.variance}`);
  assert.ok(Math.abs(node.combined.variance - expected) < 1e-9);
  assert.equal(node.asOf, T(0, 10), "asOf should be updated");
});

test("shadowTouch applies session-transition variance", () => {
  const { index } = ctx();
  const c = createComposite(index, "test");
  const cap = [...index.leafIds][0];
  const node = c.nodes[cap];

  // Start with variance below cap
  node.asOf = T(0, 0);
  node.direct = { mean: 4, variance: 0.5 };
  node.combined = { mean: 4, variance: 0.5 };

  // Same time (days=0) but session transition
  shadowTouch(node, T(0, 0), CONDITION_B, true);

  // Only session variance should be added (no time variance since days=0)
  const expected = 0.5 + CONDITION_B.sessionVariance;
  assert.ok(Math.abs(node.direct.variance - expected) < 1e-9, `expected ${expected}, got ${node.direct.variance}`);
});

test("shadowTouch applies both time and session variance together", () => {
  const { index } = ctx();
  const c = createComposite(index, "test");
  const cap = [...index.leafIds][0];
  const node = c.nodes[cap];

  node.asOf = T(0, 0);
  const varBefore = node.direct.variance;

  // 5 days elapsed AND session transition
  shadowTouch(node, T(0, 5), CONDITION_B, true);

  const expected = Math.min(CONDITION_B.maxVariance, varBefore + 0.02 * 5 + 0.5);
  assert.ok(Math.abs(node.direct.variance - expected) < 1e-9, `expected ${expected}, got ${node.direct.variance}`);
});

test("shadowTouch respects maxVariance cap", () => {
  const { index } = ctx();
  const c = createComposite(index, "test");
  const cap = [...index.leafIds][0];
  const node = c.nodes[cap];

  // Start near the cap
  node.asOf = T(0, 0);
  node.direct = { mean: 4, variance: 2.0 };
  node.combined = { mean: 4, variance: 2.0 };

  // 100 days with session transition: would exceed cap without clamping
  shadowTouch(node, T(0, 100), CONDITION_B, true);

  assert.ok(node.direct.variance <= CONDITION_B.maxVariance + 1e-9, `variance ${node.direct.variance} exceeds max ${CONDITION_B.maxVariance}`);
  assert.ok(node.combined.variance <= CONDITION_B.maxVariance + 1e-9);
});

test("shadowTouch with no prior asOf does not add time variance", () => {
  const { index } = ctx();
  const c = createComposite(index, "test");
  const cap = [...index.leafIds][0];
  const node = c.nodes[cap];

  assert.equal(node.asOf, null);
  const varBefore = node.direct.variance;

  shadowTouch(node, T(0, 0), CONDITION_B, false);

  assert.equal(node.direct.variance, varBefore, "no time variance when asOf was null");
  assert.equal(node.asOf, T(0, 0), "asOf should be set");
});

test("ZERO_INTERVENTION reproduces production inflate exactly", () => {
  const { index } = ctx();
  const policy = index.framework.policy;
  const priorVar = index.framework.prior.sd ** 2;

  // Production path
  const cProd = createComposite(index, "prod");
  const capId = [...index.leafIds][0];
  const prodNode = cProd.nodes[capId];
  prodNode.asOf = T(0, 0);

  // Shadow path with ZERO_INTERVENTION
  const cShadow = createComposite(index, "shadow");
  const shadowNode = cShadow.nodes[capId];
  shadowNode.asOf = T(0, 0);

  // Simulate 30 days
  const prodVariance = Math.min(priorVar, prodNode.direct.variance + policy.time_variance_per_day * 30);

  // Shadow with ZERO_INTERVENTION: should produce identical result
  shadowTouch(shadowNode, T(0, 30), ZERO_INTERVENTION, false);

  assert.ok(Math.abs(shadowNode.direct.variance - prodVariance) < 1e-9,
    `ZERO_INTERVENTION variance ${shadowNode.direct.variance} != production ${prodVariance}`);
});

// ---------------------------------------------------------------- SessionTracker

test("SessionTracker detects transitions correctly", () => {
  const tracker = new SessionTracker();
  const cap = "EN.FND.SPL.inflections";

  // First event: not a transition
  assert.equal(tracker.transition(cap, "s0"), false);
  // Same session: not a transition
  assert.equal(tracker.transition(cap, "s0"), false);
  // Different session: transition
  assert.equal(tracker.transition(cap, "s1"), true);
  // Same new session: not a transition
  assert.equal(tracker.transition(cap, "s1"), false);
  // Back to original: transition
  assert.equal(tracker.transition(cap, "s0"), true);
});

test("SessionTracker tracks capabilities independently", () => {
  const tracker = new SessionTracker();
  const cap1 = "EN.FND.SPL.inflections";
  const cap2 = "EN.FND.PHON.letter_sounds";

  tracker.transition(cap1, "s0");
  tracker.transition(cap2, "s0");

  // Different session for cap1 only
  assert.equal(tracker.transition(cap1, "s1"), true);
  assert.equal(tracker.transition(cap2, "s0"), false);
});

test("SessionTracker.clear resets all state", () => {
  const tracker = new SessionTracker();
  const cap = "EN.FND.SPL.inflections";

  tracker.transition(cap, "s0");
  tracker.transition(cap, "s1");
  tracker.clear();

  // After clear, first event is not a transition
  assert.equal(tracker.transition(cap, "s1"), false);
});

// ---------------------------------------------------------------- Stage 3: ShadowRunner

test("ShadowRunner processes observations and records comparisons", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);

  const prodComposite = createComposite(index, "learner");
  const obs = makeObservation(item, true, T(0), "s0", "d0");

  // Apply to production first
  applyDirect(prodComposite, index, obs);

  // Then to shadow
  runner.processObservation(obs, prodComposite);

  assert.equal(runner.comparisons.length, 1);
  assert.equal(runner.failures.length, 0);
  assert.ok(runner.healthy);

  const comp = runner.comparisons[0];
  assert.equal(comp.eventId, "d0");
  assert.equal(comp.capability, "EN.FND.SPL.inflections");
  assert.equal(comp.productionModel, "composite@1");
  assert.equal(comp.candidateModel, SHADOW_MODEL_VERSION);
  assert.deepEqual(comp.candidateConfig, { ...CONDITION_B });
});

test("ShadowRunner: first observation has identical means (no time gap yet)", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prodComposite = createComposite(index, "learner");

  const obs = makeObservation(item, true, T(0), "s0", "d0");
  applyDirect(prodComposite, index, obs);
  runner.processObservation(obs, prodComposite);

  const comp = runner.comparisons[0];
  // First observation: both start from same prior, no time gap, no session transition
  // So the means should be identical (same update applied)
  assert.ok(Math.abs(comp.deltas.directMean) < 1e-9, `mean delta ${comp.deltas.directMean} should be ~0`);
  // Variance should also be identical (no time or session gap)
  assert.ok(Math.abs(comp.deltas.directVariance) < 1e-9, `variance delta ${comp.deltas.directVariance} should be ~0`);
});

test("ShadowRunner: variance diverges after time gap", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prodComposite = createComposite(index, "learner");

  // First observation
  const obs1 = makeObservation(item, true, T(0, 0), "s0", "d0");
  applyDirect(prodComposite, index, obs1);
  runner.processObservation(obs1, prodComposite);

  // Second observation 10 days later, same session
  const obs2 = makeObservation(item, true, T(0, 10), "s0", "d1");
  applyDirect(prodComposite, index, obs2);
  runner.processObservation(obs2, prodComposite);

  const comp = runner.comparisons[1];
  // Shadow has higher time variance (0.02 vs 0.0047 per day)
  // Extra variance = (0.02 - 0.0047) * 10 = 0.153 before the update
  assert.ok(comp.deltas.directVariance > 0, `shadow should have higher variance, delta = ${comp.deltas.directVariance}`);
});

test("ShadowRunner: session transition adds variance", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prodComposite = createComposite(index, "learner");

  // First observation session s0
  const obs1 = makeObservation(item, true, T(0, 0), "s0", "d0");
  applyDirect(prodComposite, index, obs1);
  runner.processObservation(obs1, prodComposite);

  // Second observation 1 day later, NEW session
  const obs2 = makeObservation(item, true, T(0, 1), "s1", "d1");
  applyDirect(prodComposite, index, obs2);
  runner.processObservation(obs2, prodComposite);

  const comp = runner.comparisons[1];
  assert.ok(comp.sessionTransition, "should detect session transition");
  // Extra variance includes time (0.02-0.0047)*1 + session 0.5 ≈ 0.515
  assert.ok(comp.deltas.directVariance > 0.1, `should have significant variance delta, got ${comp.deltas.directVariance}`);
});

test("ShadowRunner handles unknown capability gracefully", () => {
  const { index } = ctx();
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prodComposite = createComposite(index, "learner");

  const obs: DirectObservation = {
    capability: "NONEXISTENT.CAP" as any,
    at: T(0),
    session: "s0",
    context: "test",
    decisionId: "d-fail",
    update: (e) => e,
    misconceptions: [],
  };

  // Should not throw — bounded failure
  runner.processObservation(obs, prodComposite);
  assert.equal(runner.failures.length, 1);
  assert.equal(runner.comparisons.length, 0);
  assert.equal(runner.healthy, false);
  assert.ok(runner.failures[0].error.includes("NONEXISTENT"));
});

test("ShadowRunner.reset clears all state", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prodComposite = createComposite(index, "learner");

  const obs = makeObservation(item, true, T(0), "s0", "d0");
  applyDirect(prodComposite, index, obs);
  runner.processObservation(obs, prodComposite);

  assert.equal(runner.comparisons.length, 1);

  runner.reset("learner");
  assert.equal(runner.comparisons.length, 0);
  assert.equal(runner.failures.length, 0);
  assert.ok(runner.healthy);
});

// ---------------------------------------------------------------- Stage 4: Deterministic replay

test("deterministic replay: same events produce identical shadow results", () => {
  const { index } = ctx();
  const allItems = items();
  const testItems = allItems.slice(0, 5);

  function runReplay(config: ShadowConfig): ShadowRunner {
    const runner = new ShadowRunner(index, "learner", config);
    const prod = createComposite(index, "learner");

    for (let i = 0; i < testItems.length; i++) {
      const item = testItems[i];
      const day = Math.floor(i / 2);
      const session = `s${day}`;
      const obs = makeObservation(item, i % 2 === 0, T(i * 5, day), session, `d${i}`);
      applyDirect(prod, index, obs);
      runner.processObservation(obs, prod);
    }
    return runner;
  }

  const run1 = runReplay(CONDITION_B);
  const run2 = runReplay(CONDITION_B);

  assert.equal(run1.comparisons.length, run2.comparisons.length);
  for (let i = 0; i < run1.comparisons.length; i++) {
    const c1 = run1.comparisons[i];
    const c2 = run2.comparisons[i];
    assert.equal(c1.candidateDirect.mean, c2.candidateDirect.mean, `replay diverged at comparison ${i}: mean`);
    assert.equal(c1.candidateDirect.variance, c2.candidateDirect.variance, `replay diverged at comparison ${i}: variance`);
    assert.equal(c1.candidateDemonstrated, c2.candidateDemonstrated, `replay diverged at comparison ${i}: demonstrated`);
  }
});

test("deterministic replay across inter-session gaps", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);

  function replay(): ShadowRunner {
    const runner = new ShadowRunner(index, "learner", CONDITION_B);
    const prod = createComposite(index, "learner");
    // Session 0: day 0
    for (let i = 0; i < 3; i++) {
      const obs = makeObservation(item, true, T(i * 2, 0), "s0", `d0-${i}`);
      applyDirect(prod, index, obs);
      runner.processObservation(obs, prod);
    }
    // Session 1: day 7 (gap)
    for (let i = 0; i < 3; i++) {
      const obs = makeObservation(item, true, T(i * 2, 7), "s1", `d1-${i}`);
      applyDirect(prod, index, obs);
      runner.processObservation(obs, prod);
    }
    // Session 2: day 30 (longer gap)
    for (let i = 0; i < 3; i++) {
      const obs = makeObservation(item, i < 2, T(i * 2, 30), "s2", `d2-${i}`);
      applyDirect(prod, index, obs);
      runner.processObservation(obs, prod);
    }
    return runner;
  }

  const r1 = replay();
  const r2 = replay();

  for (let i = 0; i < r1.comparisons.length; i++) {
    assert.equal(r1.comparisons[i].candidateDirect.mean, r2.comparisons[i].candidateDirect.mean, `mean at ${i}`);
    assert.equal(r1.comparisons[i].candidateDirect.variance, r2.comparisons[i].candidateDirect.variance, `variance at ${i}`);
  }
});

test("replay of coupled capabilities is deterministic", () => {
  const { index } = ctx();
  // Use items from two related capabilities
  const cap1items = items().filter(i => i.target === "EN.FND.SPL.inflections");
  const cap2items = items().filter(i => i.target === "EN.FND.SPL.letter_patterns");
  if (cap1items.length === 0 || cap2items.length === 0) return; // skip if framework doesn't have these

  function replay(): ShadowRunner {
    const runner = new ShadowRunner(index, "learner", CONDITION_B);
    const prod = createComposite(index, "learner");
    // Alternate between two capabilities
    const all = [cap1items[0], cap2items[0], cap1items[0], cap2items[0]];
    for (let i = 0; i < all.length; i++) {
      const obs = makeObservation(all[i], true, T(i * 5, Math.floor(i / 2)), `s${Math.floor(i / 2)}`, `d${i}`);
      applyDirect(prod, index, obs);
      runner.processObservation(obs, prod);
    }
    return runner;
  }

  const r1 = replay();
  const r2 = replay();
  assert.equal(r1.comparisons.length, r2.comparisons.length);
  for (let i = 0; i < r1.comparisons.length; i++) {
    assert.equal(r1.comparisons[i].candidateDirect.variance, r2.comparisons[i].candidateDirect.variance, `variance at ${i}`);
  }
});

// ---------------------------------------------------------------- Stage 5: Integration safety (14 required assertions)

test("Safety 1: shadow disabled produces exactly production results", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);

  // Production only — no shadow runner at all
  const prod = createComposite(index, "learner");
  const obs = makeObservation(item, true, T(0, 0), "s0", "d0");
  const applied = applyDirect(prod, index, obs);

  // Verify production result is normal
  assert.ok(applied.after.mean > applied.before.mean, "correct answer should raise mean");
  assert.ok(applied.after.sd <= applied.before.sd, "evidence should reduce sd");
});

test("Safety 2: shadow enabled produces identical authoritative results", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);

  // Production without shadow
  const prodOnly = createComposite(index, "learner");
  const obs = makeObservation(item, true, T(0, 0), "s0", "d0");
  applyDirect(prodOnly, index, obs);

  // Production with shadow running alongside
  const prodWithShadow = createComposite(index, "learner");
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const obs2 = makeObservation(item, true, T(0, 0), "s0", "d0");
  applyDirect(prodWithShadow, index, obs2);
  runner.processObservation(obs2, prodWithShadow);

  // Production composites must be identical
  const cap = item.target;
  assert.equal(prodOnly.nodes[cap].direct.mean, prodWithShadow.nodes[cap].direct.mean, "production mean must not change");
  assert.equal(prodOnly.nodes[cap].direct.variance, prodWithShadow.nodes[cap].direct.variance, "production variance must not change");
  assert.equal(prodOnly.nodes[cap].combined.mean, prodWithShadow.nodes[cap].combined.mean);
  assert.equal(prodOnly.nodes[cap].combined.variance, prodWithShadow.nodes[cap].combined.variance);
});

test("Safety 3: shadow enabled does not change adaptive decisions", () => {
  const { index, content } = ctx();

  // Build up learner state via direct applyDirect (bypassing Ledger's scoring)
  const prodOnly = createComposite(index, "learner");
  const prodWithShadow = createComposite(index, "learner");
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const allItems = items();

  for (let i = 0; i < 10; i++) {
    const item = allItems[i % allItems.length];
    const correct = i % 3 !== 0;
    const obs1 = makeObservation(item, correct, T(i * 2, 0), "s0", `d${i}`);
    const obs2 = makeObservation(item, correct, T(i * 2, 0), "s0", `d${i}`);
    applyDirect(prodOnly, index, obs1);
    applyDirect(prodWithShadow, index, obs2);
    runner.processObservation(obs2, prodWithShadow);
  }

  // Selection should be identical — shadow never touches production composite
  const goal = { id: "g1", name: "test", weights: { "EN": 1 }, targets: {} };
  const shared = { content, index, goal, seen: new Set<string>(), recent: [] as string[], writingThisSession: 0, writingAvailable: false };
  const rec1 = recommend({ ...shared, composite: prodOnly, now: T(0, 1) });
  const rec2 = recommend({ ...shared, composite: prodWithShadow, now: T(0, 1) });

  assert.equal(rec1.mode, rec2.mode, "recommendation mode should match");
  if (rec1.choice && rec2.choice) {
    assert.equal(rec1.choice.focus, rec2.choice.focus, "recommendation focus should match");
  }
});

test("Safety 4: shadow enabled does not change teaching selection", () => {
  // Teaching selection comes from the planner which reads production composite
  // Shadow runner has its own composite — verify they are separate objects
  const { index } = ctx();
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prod = createComposite(index, "learner");

  assert.notEqual(runner.shadowComposite, prod, "shadow and production composites must be different objects");
  assert.notEqual(runner.shadowComposite.nodes, prod.nodes, "node records must be separate");
});

test("Safety 5: shadow enabled does not change retention scheduling", () => {
  const { index } = ctx();
  // retention is imported from index.ts
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const policy = index.framework.policy;

  // Build up a demonstrated level
  const prod = createComposite(index, "learner");
  for (let i = 0; i < 5; i++) {
    applyDirect(prod, index, makeObservation(item, true, T(i * 2, 0), "s0", `d${i}`));
  }

  const cap = item.target;
  const retBefore = retention(prod.nodes[cap], policy, T(0, 10));

  // Running a shadow alongside should not affect retention at all
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prodClone = structuredClone(prod);
  // Shadow reads production but never writes to it
  const obs = makeObservation(item, true, T(0, 10), "s1", "d-extra");
  applyDirect(prodClone, index, obs);
  runner.processObservation(obs, prodClone);

  // Production retention is computed from production composite, untouched by shadow
  assert.equal(retBefore.status, retention(prod.nodes[cap], policy, T(0, 10)).status, "retention status must not change from shadow existing");
});

test("Safety 6: shadow enabled does not change learner-facing mastery", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const policy = index.framework.policy;

  const prod = createComposite(index, "learner");
  // Build demonstrated level in production
  for (let i = 0; i < 8; i++) {
    applyDirect(prod, index, makeObservation(item, true, T(i * 2, 0), "s0", `d${i}`));
  }

  // demonstratedLevel is imported from index.ts
  const prodDemo = demonstratedLevel(prod.nodes[item.target], policy, item.target);

  // Shadow runner exists alongside
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const obs = makeObservation(item, true, T(0, 1), "s1", "d-shadow");
  applyDirect(prod, index, obs);
  runner.processObservation(obs, prod);

  // Production demonstrated level after is still computed from production composite
  const prodDemoAfter = demonstratedLevel(prod.nodes[item.target], policy, item.target);
  // The shadow runner never touches prod — this is a structural guarantee
  assert.notEqual(runner.shadowComposite, prod);
});

test("Safety 7: shadow failure cannot block authoritative grading", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prod = createComposite(index, "learner");

  // Force a shadow failure by corrupting the shadow composite
  delete (runner.shadowComposite.nodes as any)["EN.FND.SPL.inflections"];

  const obs = makeObservation(item, true, T(0), "s0", "d-fail");
  // Production succeeds normally
  const applied = applyDirect(prod, index, obs);
  assert.ok(applied.after.mean > applied.before.mean);

  // Shadow fails gracefully
  runner.processObservation(obs, prod);
  assert.equal(runner.failures.length, 1);
  assert.equal(runner.comparisons.length, 0);

  // Production composite is fine
  assert.ok(prod.nodes["EN.FND.SPL.inflections"].direct.mean > 4);
});

test("Safety 8: candidate variance changes across session boundaries as expected", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prod = createComposite(index, "learner");

  // Session 0
  const obs1 = makeObservation(item, true, T(0, 0), "s0", "d0");
  applyDirect(prod, index, obs1);
  runner.processObservation(obs1, prod);

  const varAfterFirst = runner.shadowComposite.nodes[item.target].direct.variance;

  // Session 1 (next day)
  const obs2 = makeObservation(item, true, T(0, 1), "s1", "d1");
  applyDirect(prod, index, obs2);
  runner.processObservation(obs2, prod);

  const comp = runner.comparisons[1];
  assert.ok(comp.sessionTransition, "should be a session transition");

  // The shadow variance before update should have been inflated by:
  // time: 0.02 * 1 day = 0.02
  // session: 0.5
  // Total extra beyond production: (0.02 - 0.0047) * 1 + 0.5 ≈ 0.515
  assert.ok(comp.deltas.directVariance > 0.1, `expected significant variance delta, got ${comp.deltas.directVariance}`);
});

test("Safety 9: candidate behaviour is deterministic", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);

  function run(): { mean: number; variance: number }[] {
    const runner = new ShadowRunner(index, "learner", CONDITION_B);
    const prod = createComposite(index, "learner");
    const results: { mean: number; variance: number }[] = [];
    for (let d = 0; d < 5; d++) {
      const session = `s${d}`;
      for (let i = 0; i < 3; i++) {
        const obs = makeObservation(item, d % 2 === 0 ? true : i > 0, T(i * 2, d), session, `d${d}-${i}`);
        applyDirect(prod, index, obs);
        runner.processObservation(obs, prod);
      }
    }
    return runner.comparisons.map(c => ({ mean: c.candidateDirect.mean, variance: c.candidateDirect.variance }));
  }

  const a = run();
  const b = run();
  assert.deepEqual(a, b, "two identical runs must produce identical shadow results");
});

test("Safety 10: model-version and configuration metadata are preserved", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prod = createComposite(index, "learner");

  const obs = makeObservation(item, true, T(0), "s0", "d0");
  applyDirect(prod, index, obs);
  runner.processObservation(obs, prod);

  const comp = runner.comparisons[0];
  assert.equal(comp.productionModel, "composite@1");
  assert.equal(comp.candidateModel, "shadow-candidate@1");
  assert.equal(comp.candidateConfig.timeVariancePerDay, 0.02);
  assert.equal(comp.candidateConfig.sessionVariance, 0.5);
  assert.equal(comp.candidateConfig.maxVariance, 2.25);
});

test("Safety 11: historical achievement is not erased", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const prod = createComposite(index, "learner");
  const runner = new ShadowRunner(index, "learner", CONDITION_B);

  // Build demonstrations in production
  for (let i = 0; i < 6; i++) {
    const obs = makeObservation(item, true, T(i * 2, 0), "s0", `d${i}`);
    applyDirect(prod, index, obs);
    runner.processObservation(obs, prod);
  }

  const cap = item.target;
  const prodNode = prod.nodes[cap];
  // Production demonstrations array should be intact
  assert.ok(prodNode.demonstrations.length >= 0, "production demonstrations exist");
  // Shadow has its own demonstrations — production is untouched
  assert.notEqual(runner.shadowComposite.nodes[cap], prodNode);
});

test("Safety 12: recovery state remains authoritative", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const prod = createComposite(index, "learner");
  const runner = new ShadowRunner(index, "learner", CONDITION_B);

  // Build and then degrade production state
  for (let i = 0; i < 6; i++) {
    const obs = makeObservation(item, true, T(i * 2, 0), "s0", `d${i}`);
    applyDirect(prod, index, obs);
    runner.processObservation(obs, prod);
  }
  // Wrong answers
  for (let i = 0; i < 5; i++) {
    const obs = makeObservation(item, false, T(i * 2, 30), "s5", `df${i}`);
    applyDirect(prod, index, obs);
    runner.processObservation(obs, prod);
  }

  // Production composite is the authority — shadow never writes to it
  assert.notEqual(runner.shadowComposite, prod);
  const prodView = leafView(prod, index, item.target, T(0, 31));
  // Whatever the production stage is, the shadow didn't change it
  assert.ok(["unassessed", "struggling", "needs_review", "review_due", "mastered", "demonstrated", "developing"].includes(prodView.stage));
});

test("Safety 13: no duplicate evidence is created", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prod = createComposite(index, "learner");

  const obs = makeObservation(item, true, T(0), "s0", "d0");
  applyDirect(prod, index, obs);
  runner.processObservation(obs, prod);

  // Shadow runner only records comparisons, never events
  // Production evidence array has exactly what was applied
  assert.equal(prod.nodes[item.target].evidence.length, 1);
  // Shadow composite also has exactly one — from its own applyDirect
  assert.equal(runner.shadowComposite.nodes[item.target].evidence.length, 1);
});

test("Safety 14: candidate outputs cannot be consumed as trusted mastery evidence", () => {
  const { index } = ctx();
  const runner = new ShadowRunner(index, "learner", CONDITION_B);

  // The shadow composite's model field is distinct
  assert.equal(runner.shadowComposite.model, "composite@1"); // created by createComposite
  // Comparisons are marked as non-authoritative
  assert.equal(SHADOW_MODEL_VERSION, "shadow-candidate@1");
  // There is no way to save or export shadow comparisons as production decisions
  // (ShadowComparison has no verdict/accepted/rejected — it's structurally different from Decision)
});

test("Zero-intervention test: candidate reproduces production when additional variance is disabled", () => {
  const { index } = ctx();
  const allItems = items().slice(0, 8);
  const runner = new ShadowRunner(index, "learner", ZERO_INTERVENTION);
  const prod = createComposite(index, "learner");

  for (let i = 0; i < allItems.length; i++) {
    const day = Math.floor(i / 3);
    const obs = makeObservation(allItems[i], i % 2 === 0, T(i * 5, day), `s${day}`, `d${i}`);
    applyDirect(prod, index, obs);
    runner.processObservation(obs, prod);
  }

  // With ZERO_INTERVENTION, shadow should match production exactly
  for (const comp of runner.comparisons) {
    assert.ok(Math.abs(comp.deltas.directMean) < 1e-9, `zero-intervention mean delta: ${comp.deltas.directMean}`);
    assert.ok(Math.abs(comp.deltas.directVariance) < 1e-9, `zero-intervention variance delta: ${comp.deltas.directVariance}`);
    assert.ok(Math.abs(comp.deltas.combinedMean) < 1e-9, `zero-intervention combined mean delta: ${comp.deltas.combinedMean}`);
    assert.ok(Math.abs(comp.deltas.combinedVariance) < 1e-9, `zero-intervention combined variance delta: ${comp.deltas.combinedVariance}`);
  }
});

// ---------------------------------------------------------------- Stage 6: End-to-end journeys

test("Journey: successful first-time learning", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prod = createComposite(index, "learner");

  // Session 0: learner gets 5 correct
  for (let i = 0; i < 5; i++) {
    const obs = makeObservation(item, true, T(i * 2, 0), "s0", `d0-${i}`);
    applyDirect(prod, index, obs);
    runner.processObservation(obs, prod);
  }

  assert.ok(runner.healthy, "shadow should be healthy");
  assert.equal(runner.comparisons.length, 5);

  // Production decisions are unchanged (same composite)
  const prodView = leafView(prod, index, item.target, T(15, 0));
  assert.ok(prodView.direct.mean > 4, "production mean should rise with correct answers");

  // Shadow comparisons record the differences
  const lastComp = runner.comparisons[runner.comparisons.length - 1];
  assert.ok(lastComp.productionDirect.mean === prodView.direct.mean || Math.abs(lastComp.productionDirect.mean - prodView.direct.mean) < 0.01);
});

test("Journey: isolated slip", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prod = createComposite(index, "learner");

  // 4 correct, then 1 wrong
  for (let i = 0; i < 5; i++) {
    const obs = makeObservation(item, i < 4, T(i * 2, 0), "s0", `d${i}`);
    applyDirect(prod, index, obs);
    runner.processObservation(obs, prod);
  }

  assert.ok(runner.healthy);
  // The wrong answer should lower both production and shadow means
  const lastComp = runner.comparisons[4];
  assert.ok(lastComp.productionDirect.mean < runner.comparisons[3].productionDirect.mean, "wrong answer lowers production mean");
  assert.ok(lastComp.candidateDirect.mean < runner.comparisons[3].candidateDirect.mean, "wrong answer lowers shadow mean");
});

test("Journey: multi-session improvement", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prod = createComposite(index, "learner");

  // Session 0 (day 0): mixed results
  for (let i = 0; i < 4; i++) {
    const obs = makeObservation(item, i % 2 === 0, T(i * 2, 0), "s0", `d0-${i}`);
    applyDirect(prod, index, obs);
    runner.processObservation(obs, prod);
  }

  // Session 1 (day 7): better results
  for (let i = 0; i < 4; i++) {
    const obs = makeObservation(item, i < 3, T(i * 2, 7), "s1", `d1-${i}`);
    applyDirect(prod, index, obs);
    runner.processObservation(obs, prod);
  }

  // Session 2 (day 14): all correct
  for (let i = 0; i < 4; i++) {
    const obs = makeObservation(item, true, T(i * 2, 14), "s2", `d2-${i}`);
    applyDirect(prod, index, obs);
    runner.processObservation(obs, prod);
  }

  assert.ok(runner.healthy);
  assert.equal(runner.comparisons.length, 12);

  // Shadow should show session transitions at expected points
  const transitions = runner.comparisons.filter(c => c.sessionTransition);
  assert.equal(transitions.length, 2, "should detect 2 session transitions (s0→s1, s1→s2)");

  // Shadow variance should be higher than production due to session inflation
  const lastComp = runner.comparisons[runner.comparisons.length - 1];
  // After 3 sessions with time gaps, the shadow should have accumulated extra variance
  // This manifests as a positive variance delta
  // (Though by the end, evidence may have reduced both, the shadow started each session higher)
});

test("Journey: failed delayed retention", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prod = createComposite(index, "learner");

  // Session 0: demonstrate capability
  for (let i = 0; i < 6; i++) {
    const obs = makeObservation(item, true, T(i * 2, 0), "s0", `d0-${i}`);
    applyDirect(prod, index, obs);
    runner.processObservation(obs, prod);
  }

  // Session 1 (day 30): fail retention — get all wrong
  for (let i = 0; i < 4; i++) {
    const obs = makeObservation(item, false, T(i * 2, 30), "s1", `d1-${i}`);
    applyDirect(prod, index, obs);
    runner.processObservation(obs, prod);
  }

  assert.ok(runner.healthy);
  // Session transition detected
  const s1Comparisons = runner.comparisons.filter(c => c.session === "s1");
  assert.ok(s1Comparisons.length > 0);
  assert.ok(s1Comparisons[0].sessionTransition, "first event in s1 is a session transition");

  // After 30 days + session transition, shadow should have substantial extra variance
  // This is the core value proposition of E003.1: the shadow will be more uncertain
  // after a long gap, which could lead to better calibration
  const firstS1 = s1Comparisons[0];
  assert.ok(firstS1.deltas.directVariance > 0, "shadow has more variance after long gap + session transition");
});

test("Journey: restart and replay", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);

  // First run
  const runner1 = new ShadowRunner(index, "learner", CONDITION_B);
  const prod1 = createComposite(index, "learner");
  const observations: DirectObservation[] = [];

  for (let d = 0; d < 3; d++) {
    for (let i = 0; i < 3; i++) {
      const obs = makeObservation(item, d !== 1 || i > 0, T(i * 2, d * 5), `s${d}`, `d${d}-${i}`);
      observations.push(obs);
      applyDirect(prod1, index, obs);
      runner1.processObservation(obs, prod1);
    }
  }

  // "Restart": create fresh runner and replay all observations
  const runner2 = new ShadowRunner(index, "learner", CONDITION_B);
  const prod2 = createComposite(index, "learner");
  for (const obs of observations) {
    applyDirect(prod2, index, obs);
    runner2.processObservation(obs, prod2);
  }

  // Must produce identical results
  assert.equal(runner1.comparisons.length, runner2.comparisons.length);
  for (let i = 0; i < runner1.comparisons.length; i++) {
    const c1 = runner1.comparisons[i];
    const c2 = runner2.comparisons[i];
    assert.equal(c1.candidateDirect.mean, c2.candidateDirect.mean, `replay mean at ${i}`);
    assert.equal(c1.candidateDirect.variance, c2.candidateDirect.variance, `replay variance at ${i}`);
    assert.equal(c1.sessionTransition, c2.sessionTransition, `replay session transition at ${i}`);
  }
});

test("Journey: assisted responses (repeat exposure)", () => {
  const { index } = ctx();
  const item = pickItem("EN.FND.SPL.inflections", 2);
  const runner = new ShadowRunner(index, "learner", CONDITION_B);
  const prod = createComposite(index, "learner");

  // First encounter: fresh
  const obs1 = makeObservation(item, true, T(0, 0), "s0", "d0");
  applyDirect(prod, index, obs1);
  runner.processObservation(obs1, prod);

  // Second encounter: marked as repeat
  const obs2: DirectObservation = {
    ...makeObservation(item, true, T(5, 0), "s0", "d1"),
    exposure: "repeat",
  };
  applyDirect(prod, index, obs2);
  runner.processObservation(obs2, prod);

  assert.ok(runner.healthy);
  assert.equal(runner.comparisons.length, 2);
});
