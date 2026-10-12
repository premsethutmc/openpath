/**
 * E2-1: framework 0.2.0 is valid, specifies 56 capabilities, and leaves 0.1.0 and the mathematics alone.
 * E2-2: a learner's state carries over from 0.1.0 to 0.2.0 unchanged.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Ledger, type Framework, leafView } from "../src/index.ts";
import { LOCK_FILE, checkLock, frameworkFiles } from "../../../tools/english/lock.ts";
import { FROZEN_FRAMEWORK, RUNTIME_FRAMEWORK, loadContext, loadFramework, frameworkFile } from "../../../tools/english/load.ts";
import { LEARNERS, CAP } from "../../../tools/english/sim/learners.ts";
import { runLearner } from "../../../tools/english/sim/run.ts";

const v1 = loadFramework(frameworkFile("0.1.0"));
const v2 = loadFramework(frameworkFile("0.2.0"));
const caps = (fw: Framework) => fw.strands.flatMap((s) => s.substrands.flatMap((ss) => ss.capabilities));

test("0.2.0 specifies all 56 skeleton and core capabilities completely", () => {
  const ctx2 = loadContext({ framework: "0.2.0" });
  const specified = caps(v2).filter((c) => c.bands);
  assert.equal(specified.length, 56);
  assert.deepEqual(new Set(specified.map((c) => c.tier)), new Set(["skeleton", "core"]));
  for (const c of specified) {
    assert.ok(c.description, c.id);
    assert.deepEqual(Object.keys(c.bands!).sort(), ["2", "4", "6", "8"], `${c.id} has descriptors for bands 2, 4, 6 and 8`);
    assert.ok(c.misconceptions!.length >= 1, c.id);
    assert.ok(c.references?.cefr?.length, `${c.id} names a CEFR scale`);
    assert.ok(c.observable_through?.length, c.id);
  }
  assert.equal(ctx2.index.key, "en@0.2.0");
  assert.equal(v2.review.status, "candidate-unvalidated");
});

test("0.2.0 keeps the mathematics, the 17 skeleton definitions and the E1 relationships unchanged", () => {
  assert.deepEqual(v2.scale, v1.scale);
  assert.deepEqual(v2.prior, v1.prior);
  assert.deepEqual(v2.policy, v1.policy);
  const before = new Map(caps(v1).map((c) => [c.id, c]));
  for (const c of caps(v2)) {
    const { references, ...rest } = c;
    if (c.tier === "skeleton") assert.deepEqual(rest, before.get(c.id), `${c.id} is unchanged apart from its references`);
    if (c.tier === "planned") assert.deepEqual(c, before.get(c.id), `${c.id} is unchanged`);
  }
  assert.deepEqual(v2.couplings.slice(0, v1.couplings.length), v1.couplings);
  for (const k of v2.couplings.slice(v1.couplings.length)) {
    assert.equal(k.status, "candidate");
    assert.ok(k.strength <= 0.35);
  }
  // no new prerequisites: the references checked state topics by class, not dependencies
  assert.deepEqual(v2.prerequisites.map(({ capability, requires }) => ({ capability, requires })), v1.prerequisites);
});

test("0.1.0 stays frozen; from E2b the runtime runs 0.2.0, and each version sees only its own capabilities' items", () => {
  const lock = JSON.parse(readFileSync(LOCK_FILE, "utf8"));
  assert.deepEqual(checkLock(lock, frameworkFiles()), []);
  assert.ok(lock["en@0.1.0"]);
  assert.equal(RUNTIME_FRAMEWORK, "0.2.0");
  assert.equal(FROZEN_FRAMEWORK, "0.1.0", "the frozen simulation and E1 demonstration stay on 0.1.0");
  assert.equal(loadContext().index.key, "en@0.2.0");
  const v1 = loadContext({ framework: "0.1.0" });
  const skeleton = new Set([...v1.index.leaves.values()].filter((c) => c.tier === "skeleton").map((c) => c.id));
  for (const i of v1.content.items.values()) {
    const caps = i.kind === "writing" ? [...i.targets, ...i.secondary] : [i.target];
    assert.ok(caps.every((c) => skeleton.has(c)), `${i.id} is visible to 0.1.0 only if 0.1.0 specifies its capabilities`);
  }
});

test("a learner's state carries over from 0.1.0 to 0.2.0 unchanged", async () => {
  const c1 = loadContext({ allowCandidateAnchors: true, framework: "0.1.0" });
  const c2 = loadContext({ allowCandidateAnchors: true, framework: "0.2.0" });
  const goal = c1.content.goals.get("overall")!;
  const days = [0, 1, 8, 15, 30];
  for (const learner of [LEARNERS[1], LEARNERS[9]]) {
    const run = await runLearner(c1, learner, { goal, sessionDays: days, itemsPerSession: 15, seed: 7, evaluatorNoise: 0.7 });
    const events = run.ledger.events;
    const migrated = Ledger.rebuild(c2, learner.id, events);
    const now = run.sessions.at(-1)!.now;
    // every decision is the same, except that inferred effects on newly coupled core capabilities are listed too
    const core = new Set(caps(v2).filter((x) => x.tier === "core").map((x) => x.id));
    const withoutCore = (ds: Ledger["decisions"]) =>
      ds.map((d) => ({ ...d, ...(d.inferred ? { inferred: d.inferred.filter((x) => !core.has(x.capability)) } : {}) }));
    assert.deepEqual(withoutCore(migrated.decisions), run.ledger.decisions, `${learner.id}: decisions`);
    assert.ok(migrated.decisions.some((d) => d.inferred?.some((x) => core.has(x.capability))), "coupled core capabilities receive inferred effects");
    for (const id of Object.values(CAP)) {
      assert.deepEqual(migrated.composite.nodes[id], run.ledger.composite.nodes[id], `${learner.id} ${id}: state`);
      const [a, b] = [leafView(run.ledger.composite, c1.index, id, now), leafView(migrated.composite, c2.index, id, now)];
      assert.deepEqual({ ...b }, { ...a }, `${learner.id} ${id}: estimate, stage, retention and verification`);
    }
    // the newly specified capabilities have no direct evidence and start from the starting value,
    // moved only by capped, flagged effects from couplings
    for (const c of caps(v2).filter((x) => x.tier === "core")) {
      const n = migrated.composite.nodes[c.id];
      assert.equal(n.directN, 0, c.id);
      assert.deepEqual(n.direct, { mean: v2.prior.mean, variance: v2.prior.sd ** 2 }, c.id);
      const coupled = v2.couplings.some((k) => (k.a === c.id || k.b === c.id) && (Object.values(CAP) as string[]).includes(k.a === c.id ? k.b : k.a));
      if (!coupled) assert.deepEqual(n.combined, n.direct, `${c.id} has no coupling to anything observed`);
      const v = leafView(migrated.composite, c2.index, c.id, now);
      assert.equal(v.verification.status, "not_demonstrated");
    }
  }
});
