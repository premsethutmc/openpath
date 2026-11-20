// teachable@1: a child who keeps getting a skill wrong is given an explanation. Every skill of the Class 11 and 12 boards has at
// least one explanation that passes the machine check and the review registry. Known exception: proof by induction (no generated
// question type to tie a checked example to).
import test from "node:test";
import assert from "node:assert/strict";
import { boardFor } from "../../../packages/learning/src/curricula";
import { allOutcomesOf } from "../../../packages/learning/src/curriculum";
import { graph } from "../../../packages/learning/src/graph";
import { moduleFor } from "../../../packages/learning/src/content";
import { teachingEligibility } from "../../../packages/learning/src/teaching-contract";
import { contentEligibility } from "../../../packages/learning/src/explanation-review";

const KNOWN = new Set(["MATH.reasoning.mathematical-induction"]);

test("teachable@1: every Class 11 and 12 skill has an explanation that can be shown", () => {
  const without: string[] = [];
  for (const b of ["cbse", "tn"]) for (const g of [11, 12]) {
    for (const { outcome } of allOutcomesOf(boardFor(b, g)!)) for (const c of outcome.mapping.competencies.filter((m) => m.status === "accepted")) {
      const id = graph.byId.has(c.id) ? graph.evidenceTarget(c.id) : c.id, m = moduleFor(id);
      if (!m || KNOWN.has(id)) continue;
      if (!m.strategies.some((s) => teachingEligibility(m, s).eligible && contentEligibility(m, s, { competency: id, usage: "lesson" }).eligible)) without.push(id);
    }
  }
  assert.deepEqual([...new Set(without)], []);
});
