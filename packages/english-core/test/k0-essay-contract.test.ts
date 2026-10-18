/** K0: the essay contract's ledger records are kept and change nothing in the engine. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ESSAY_CONTRACT, Ledger, type LedgerEvent } from "../src/index.ts";
import { ctx, qualified, T, writingEvidence } from "./helpers.ts";

const essayEvent: LedgerEvent = {
  kind: "essay",
  id: "x1",
  at: T(10),
  session: "s0",
  record: {
    type: "submission",
    submission: {
      contract: ESSAY_CONTRACT,
      id: "essay:1",
      learner: "learner",
      session: "s0",
      at: T(10),
      text: "My school have a big library.",
      words: 6,
      fingerprint: "f",
      source: { kind: "synthetic", grade: 8, profile: "openpath.g8-writing@1", dataUse: "synthetic_test" },
    },
  },
};

test("K0-1 an essay record is kept in the ledger with no decision and no change to the composite", () => {
  const base: LedgerEvent[] = [qualified(), writingEvidence()];
  const without = Ledger.rebuild(ctx(), "learner", base);
  const withEssay = Ledger.rebuild(ctx(), "learner", [...base, essayEvent]);
  assert.equal(withEssay.events.length, without.events.length + 1);
  assert.deepEqual(withEssay.decisions, without.decisions);
  assert.deepEqual(withEssay.composite, { ...without.composite, appliedThrough: "x1" });
});
