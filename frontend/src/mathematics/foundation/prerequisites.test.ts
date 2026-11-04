import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  activeGraphVersion,
  competencyGraph,
  applyPrerequisiteCorrections,
  graphErrors,
  prerequisitePatch,
  type GraphNode,
} from "../../../../packages/mathematics/src/prerequisites";
import { mathematicsContext } from "../../../../packages/mathematics/src/registration";
import { mathematicsModule } from "../../../../packages/mathematics/src/adapter";
import { indexFramework } from "../../../../packages/english-core/src/framework";
import { indexContent } from "../../../../packages/english-core/src/content";
import {
  Ledger,
  type Context,
} from "../../../../packages/english-core/src/updater";
import {
  verificationEligibility,
  verificationClaim,
  PILOT_VERIFICATION,
} from "../../../../packages/english-core/src/verification";
import { leafView } from "../../../../packages/english-core/src/composite";
import type {
  CodeItem,
  EvidenceEvent,
} from "../../../../packages/english-core/src/types";
import audit from "../../../../content/mathematics/foundation/graph-audit.v1.json";
type NativeItem = CodeItem & { kind: "code" };
const learner = "synthetic-historical-graph-learner",
  at = "2026-10-21T00:00:00Z";
function context(nodes: GraphNode[]): Context {
  const base = mathematicsContext("1.0.0");
  const index = indexFramework(
    {
      ...base.index.framework,
      prerequisites: nodes.flatMap((n) =>
        n.prerequisites.map((p) => ({ capability: n.id, requires: p })),
      ),
    },
    { root: "MATH", stableCapabilityIds: true },
  );
  return { ...base, index };
}
/** Synthetic test fixtures only: no review approval or release of repository learning content. */
function history(target: string) {
  const make = (id: string, extra: Partial<CodeItem>): NativeItem => ({
    kind: "code",
    id: `test-only:${target}:${id}`,
    version: 1,
    family: `test-only:${target}:${id}`,
    target,
    format: "typed:integer",
    prompt: "Synthetic history fixture",
    answers: ["1"],
    a: 1,
    b: 4,
    ...extra,
  });
  const items = [
    make("provisional", { evidence_status: "provisional" }),
    make("future-release", {
      evidence_status: "validated",
      released_at: "2026-10-22T00:00:00Z",
    }),
    make("released", {
      evidence_status: "validated",
      released_at: "2026-10-01T00:00:00Z",
    }),
  ];
  const event = (item: NativeItem, i: number): EvidenceEvent => ({
    kind: "evidence",
    id: `history-${i}`,
    at,
    session: `visit-${i}`,
    item: { id: item.id, version: item.version },
    response: { kind: "typed", text: i % 2 ? "0" : "1" },
    use: "practice",
  });
  return { items, events: [...items.map(event), event(items[2], 3)] };
}
function replay(
  ctx: Context,
  items: NativeItem[],
  events: EvidenceEvent[],
  target: string,
) {
  ctx.content = indexContent(
    { items, passages: [], goals: [], misspellings: {} },
    ctx.index,
  );
  const ledger = Ledger.rebuild(ctx, learner, events);
  return {
    ledger,
    eligibility: [...verificationEligibility(ctx, events)],
    claim: verificationClaim(
      ctx,
      learner,
      events,
      target,
      at,
      PILOT_VERIFICATION,
      leafView(ledger.composite, ctx.index, target, at),
    ),
  };
}
test("exactly 34 mandatory removals; all IDs, frozen inventory and the remaining 49 proposals stay untouched", () => {
  const old = competencyGraph("1.0.0"),
    result = applyPrerequisiteCorrections();
  assert.equal(activeGraphVersion, "1.1.0");
  assert.equal(result.checks.length, 34);
  assert.equal(old.length, 200);
  assert.deepEqual(
    result.nodes.map((n) => n.id),
    old.map((n) => n.id),
  );
  assert.equal(
    old.reduce((n, c) => n + c.prerequisites.length, 0) -
      result.nodes.reduce((n, c) => n + c.prerequisites.length, 0),
    34,
  );
  const changed = new Set(
    prerequisitePatch.corrections.map((c) => c.capability),
  );
  assert.equal(
    audit.revisions.filter(
      (r) =>
        JSON.stringify(r.previousPrerequisites) !==
          JSON.stringify(r.prerequisites) && !changed.has(r.id),
    ).length,
    49,
  );
  for (const n of old) {
    const next = result.nodes.find((c) => c.id === n.id)!;
    if (!changed.has(n.id)) assert.deepEqual(next, n);
    else {
      assert.deepEqual(next.prerequisites, []);
      assert.deepEqual(
        {
          ...next,
          prerequisites: n.prerequisites,
          rootJustification: n.rootJustification,
        },
        n,
      );
    }
  }
  assert.deepEqual(graphErrors(result.nodes), []);
  assert.ok(
    result.checks.every(
      (c) =>
        !c.beforeErrors.length &&
        !c.afterErrors.length &&
        c.addedMandatoryEdges === 0 &&
        c.idsPreserved,
    ),
  );
  assert.equal(
    createHash("sha256")
      .update(readFileSync("../content/mathematics/curriculum.v1.json"))
      .digest("hex"),
    "e4c17772945ff4ad1892b8839d99d3f1a5d149cebdaeb8d138ecfcc112df44d4",
  );
  assert.equal(mathematicsModule.prerequisiteGraphVersion, "1.1.0");
  assert.equal(mathematicsModule.curriculumVersion, "1.0.0");
});
test("each intermediate correction preserves policies, item eligibility, evidence, decisions and all learner estimates", () => {
  let before = competencyGraph("1.0.0");
  for (const correction of prerequisitePatch.corrections) {
    assert.deepEqual(graphErrors(before), []);
    const after = before.map((n) =>
      n.id === correction.capability
        ? {
            ...n,
            prerequisites: n.prerequisites.filter(
              (p) => p !== correction.removeRequires,
            ),
            rootJustification: correction.rootJustification,
          }
        : structuredClone(n),
    );
    assert.deepEqual(graphErrors(after), []);
    const a = context(before),
      b = context(after),
      sample = history(correction.capability),
      saved = JSON.stringify(sample.events);
    assert.deepEqual(a.index.framework.policy, b.index.framework.policy);
    assert.deepEqual(a.index.framework.prior, b.index.framework.prior);
    assert.deepEqual(a.index.leafIds, b.index.leafIds);
    assert.deepEqual([...a.index.leaves], [...b.index.leaves]);
    const unreleased = {
      ...sample.items[0],
      evidence_status: "validated" as const,
    };
    for (const ctx of [a, b])
      assert.throws(
        () =>
          indexContent(
            { items: [unreleased], passages: [], goals: [], misspellings: {} },
            ctx.index,
          ),
        /released_at/,
      );
    const old = replay(a, sample.items, sample.events, correction.capability),
      next = replay(b, sample.items, sample.events, correction.capability);
    assert.deepEqual(old.eligibility, next.eligibility);
    assert.deepEqual(
      next.eligibility.map((x) => x[1]),
      ["unreviewed", "before_release", "eligible", "repeat"],
    );
    assert.deepEqual(old.claim, next.claim);
    assert.deepEqual(old.ledger.events, next.ledger.events);
    assert.deepEqual(old.ledger.decisions, next.ledger.decisions);
    assert.deepEqual(old.ledger.composite, next.ledger.composite);
    assert.equal(JSON.stringify(sample.events), saved);
    before = after;
  }
});
test("versioned registration allows explicit historical replay and only changes framework key and mandatory edges", () => {
  const old = mathematicsContext("1.0.0"),
    current = mathematicsContext();
  assert.equal(old.index.key, "math@1.0.0");
  assert.equal(current.index.key, "math@1.1.0");
  const expected = {
    ...old.index.framework,
    version: "1.1.0",
    prerequisites: current.index.framework.prerequisites,
  };
  assert.deepEqual(expected, current.index.framework);
  const sample = history("MATH.number.equivalent-fractions"),
    a = replay(
      old,
      sample.items,
      sample.events,
      "MATH.number.equivalent-fractions",
    ),
    b = replay(
      current,
      sample.items,
      sample.events,
      "MATH.number.equivalent-fractions",
    );
  assert.deepEqual(
    { ...b.ledger.composite, framework: "math@1.0.0" },
    a.ledger.composite,
  );
  assert.deepEqual(a.ledger.events, b.ledger.events);
  assert.deepEqual(a.ledger.decisions, b.ledger.decisions);
  assert.deepEqual(a.claim, b.claim);
  assert.deepEqual(a.eligibility, b.eligibility);
  assert.deepEqual(old.index.requires.get("MATH.number.equivalent-fractions"), [
    "MATH.number.long-division",
  ]);
  assert.equal(
    current.index.requires.has("MATH.number.equivalent-fractions"),
    false,
  );
});
test("patch is fail closed on stale preconditions, invalid IDs or cycles; source graph cannot be mutated by callers", () => {
  const g = competencyGraph("1.0.0");
  g[0].prerequisites = ["missing"];
  assert.throws(() => applyPrerequisiteCorrections(g), /Missing/);
  const stale = competencyGraph("1.0.0");
  stale.find(
    (n) => n.id === prerequisitePatch.corrections[0].capability,
  )!.prerequisites = [];
  assert.throws(() => applyPrerequisiteCorrections(stale));
  const cycle = competencyGraph("1.0.0");
  cycle[0].prerequisites = [cycle[1].id];
  assert.throws(() => applyPrerequisiteCorrections(cycle), /Cycle/);
  const first = competencyGraph();
  first[0].name = "changed";
  assert.notEqual(competencyGraph()[0].name, "changed");
});
