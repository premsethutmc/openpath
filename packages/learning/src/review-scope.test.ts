/** review-scope@1: "Review a supported lesson" teaches the skill of the question the learner is looking at. */
import { expect, test } from "bun:test";
import { moduleFor, question } from "./content.ts";
import { teachingEligibility } from "./teaching-contract.ts";
import { contentEligibility } from "./explanation-review.ts";
import { reviewStrategy } from "./intervention.ts";
import { readRecords } from "./records.ts";
import { graph } from "./graph.ts";
import { connectionConfig } from "./skill-connections.ts";

const MISS = moduleFor("MATH.algebra.missing-number")!;
const none = readRecords("synthetic-review", []);

test("a wrong 10 × □ = 30 is reviewed with the multiplying lesson, not the adding one", () => {
  expect(question("gen:acmissing:3,3,10").prompt).toContain("10 × □ = 30");
  expect(reviewStrategy(MISS, none, "gen:acmissing:3,3,10")?.id).toBe("k_times_box");
  expect(reviewStrategy(MISS, none, "gen:acmissing:3,3,10:mc")?.id).toBe("k_times_box");
  expect(reviewStrategy(MISS, none, "gen:acmissing:2,15,6")?.id).toBe("box_minus_k");
  expect(reviewStrategy(MISS, none, "gen:acfacts:2,9,1")?.id).toBe("division_fact");
});

test("a question the mapping leaves outside every skill gets no lesson written for another skill", () => {
  expect(reviewStrategy(MISS, none, "gen:acplace:87,2")).toBeNull();
});

test("never a misconception fix without its recorded finding; unmapped competencies keep module order", () => {
  for (const id of ["gen:acmissing:0,8,3", "gen:acmissing:1,15,4", "gen:acmissing:2,10,3"]) expect(reviewStrategy(MISS, none, id)?.id.startsWith("fix_")).toBe(false);
  let checked = 0;
  for (const c of graph.competencies) {
    const m = moduleFor(c.id);
    if (!m || connectionConfig(c.id)) continue;
    const before = m.strategies.find((s) => teachingEligibility(m, s).eligible && contentEligibility(m, s, { competency: c.id, usage: "lesson" }).eligible) ?? null;
    expect(reviewStrategy(m, none, m.diagnostics[0] ?? null)?.id ?? null).toBe(before?.id ?? null);
    if (++checked >= 40) break;
  }
  expect(checked).toBe(40);
}, 60_000);
