import assert from "node:assert/strict";
import { test } from "node:test";
import { createWork, freeLayout, manual, packet } from "./model";
import { writingEvidence } from "./evidence";
import type { WritingReceipt } from "./lesson-service";
import { generate } from "../../../packages/mathematics/src/generator";
import { evaluateWithExistingEngine } from "./engine-adapter";
import {
  groups,
  probabilities,
  LocalDigitRecognizer,
} from "./digit-recognizer";
import { MathematicsRepo } from "../mathematics/journey/service";
import { Api } from "../english/logic/account";
function receipt(id: string, help = false): WritingReceipt {
  return {
    kind: "math_writing",
    id,
    at: "2026-10-20T00:00:00Z",
    learnerId: "existing-child",
    draftId: "draft",
    action: "validation",
    problem: { id: "division:379:3", statement: "379 ÷ 3" },
    assisted: help,
    admissible: false,
    payload: {
      competency: "MATH.number.long-division",
      afterFeedback: help,
      result: {
        outcome: "complete",
        observations: [
          {
            region: "quotient",
            operation: "quotient selection",
            expected: "2",
            response: "2",
            correct: true,
            position: 1,
          },
        ],
      },
    },
  };
}
test("canonical ledger records provisional practice without changing estimates or verification; helped corrections stay assisted", () => {
  const r = writingEvidence("existing-child", [
    receipt("a"),
    receipt("b", true),
  ]);
  assert.equal(r.ledger.learnerId, "existing-child");
  assert.equal(r.ledger.events.length, 2);
  assert.equal(r.ledger.events[1].kind, "assisted_response");
  assert.ok(r.ledger.decisions.every((d) => d.verdict === "held"));
  assert.ok([...r.eligibility.values()].every((v) => v !== "eligible"));
  assert.equal(r.claim.level, null);
  const disputed = {
    ...receipt("input-correction"),
    action: "input-correction",
    payload: { receiptId: "a" },
  };
  assert.equal(
    writingEvidence("existing-child", [receipt("a"), disputed]).ledger.events
      .length,
    0,
  );
  assert.throws(
    () => writingEvidence("different-child", [receipt("x")]),
    /owner/,
  );
});
test("shared region codec feeds existing arithmetic, fraction, linear and polynomial validators unchanged", () => {
  for (const family of [
    "arithmetic",
    "fractions",
    "linear",
    "polynomial",
  ] as const) {
    const item = generate(family, 17);
    const work = manual(
      createWork(
        "same-input",
        { id: item.id, statement: item.statement },
        freeLayout(),
      ),
      "working",
      item.answer.value,
    );
    const result = evaluateWithExistingEngine(packet(work), "working", item);
    assert.equal(result.supported, true);
    assert.equal(result.correct, true);
  }
});
test("local model provider has no Node/browser substitution; scores and segmentation are deterministic", () => {
  const r = new LocalDigitRecognizer();
  assert.equal(r.available(), false);
  const p = probabilities([1, 2, 3]);
  assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-10);
  const s = {
    id: "a",
    points: [
      { x: 10, y: 10, t: 0, pressure: 0.5, tiltX: 0, tiltY: 0, twist: 0 },
    ],
    pointerType: "pen" as const,
    regionId: "q",
    width: 3,
    tool: "ink" as const,
    startedAt: "2026-10-20",
  };
  assert.equal(
    groups([
      s,
      { ...s, id: "b", points: s.points.map((p) => ({ ...p, x: 40 })) },
    ]).length,
    2,
  );
});
test("existing fractions repository retains total stream sequence but filters new writing receipts for its strict replay", async () => {
  const fake = {
    request: async () => ({
      count: 2,
      events: [{ kind: "math_activity", id: "old" }, receipt("new")],
    }),
  } as unknown as Api;
  const r = new MathematicsRepo(fake, "existing-child");
  assert.deepEqual(
    (await r.load()).map((x) => x.id),
    ["old"],
  );
});
