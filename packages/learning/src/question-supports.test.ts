/** question-supports@1: recovery checks what the problem itself uses, not an unrelated competency-level relation. */
import { describe, expect, test } from "bun:test";
import { boardFor } from "./curricula.ts";
import { moduleFor, question } from "./content.ts";
import { graph, walkSupports } from "./graph.ts";
import { questionSupports, recovery, RECOVERY_DEPTH } from "./intervention.ts";
import { readRecords, type LearningRecord } from "./records.ts";
import { learnerState, make } from "./session.ts";

const ORIGINAL = "gen:acmissing:3,3,10"; // What number goes in the box? 10 × □ = 30
const T0 = Date.parse("2026-11-01T09:00:00Z");
function learner(board: "cbse" | "tn", grade: number) {
  const events: LearningRecord[] = []; let now = T0;
  const ctx = () => ({ learnerId: "synthetic-routing", sessionId: "s1", at: new Date((now += 60_000)).toISOString() });
  events.push(make.enrol(ctx(), grade, "2026-27", boardFor(board, grade)!));
  return { events, ctx, state: () => learnerState("synthetic-routing", events, now, { currentSession: "s1" }), now: () => now };
}

describe("question-supports@1", () => {
  test("a wrong 10 × □ = 30 is helped with multiplication facts, not calendar patterns", () => {
    expect(question(ORIGINAL).prompt).toContain("10 × □ = 30");
    for (const [board, grade] of [["cbse", 4], ["tn", 5], ["cbse", 5], ["tn", 6]] as const) {
      const l = learner(board, grade);
      l.events.push(make.attempt(l.ctx(), ORIGINAL, "13", "diagnostic"));
      const snapshot = structuredClone(l.events);
      const s = l.state();
      const r = recovery(ORIGINAL, s.records, s.evidence, l.now(), "s1");
      expect(r.phase).toBe("support");
      expect(r.active).toBe("MATH.number.multiplication-tables");
      expect(r.reason).toContain("This problem uses a skill that is not shown yet: Use multiplication facts.");
      expect(r.supports.map((x) => x.id)).not.toContain("MATH.algebra.number-patterns");
      const help = s.module(r.active!, true);
      expect(help.question && question(help.question).competency).toBe("MATH.number.multiplication-tables");
      expect(l.events).toEqual(snapshot); // recommendations only: records unchanged
    }
  }, 60_000);

  test("a shown step skill is skipped; the competency-level relation the problem does not use is not followed", () => {
    const l = learner("cbse", 4);
    for (const id of moduleFor("MATH.number.multiplication-tables")!.diagnostics) l.events.push(make.attempt(l.ctx(), id, question(id).answer, "diagnostic"));
    l.events.push(make.attempt(l.ctx(), ORIGINAL, "13", "diagnostic"));
    const s = l.state();
    const r = recovery(ORIGINAL, s.records, s.evidence, l.now(), "s1");
    expect(r.active).not.toBe("MATH.algebra.number-patterns");
  }, 60_000);

  test("a step skill outside the learner's grade falls back to the competency-level walk", () => {
    const l = learner("cbse", 2); // multiplication facts are a Grade 3 skill
    const got = questionSupports(ORIGINAL, l.state().records).map((s) => s.id);
    expect(got).toEqual(walkSupports(question(ORIGINAL).competency, RECOVERY_DEPTH).map((s) => s.id));
  });

  test("a question whose steps name no other skill keeps the competency-level walk", () => {
    const id = "gen:acfacts:3,33,0";
    expect(questionSupports(id, readRecords("x", [])).map((s) => s.id)).toEqual(walkSupports(question(id).competency, RECOVERY_DEPTH).map((s) => s.id));
  });

  test("background arithmetic comes after the competency-level relations", () => {
    const got = questionSupports("gen:condp:6,6,3,4", readRecords("x", []));
    const add = got.findIndex((s) => s.id === "MATH.number.addition");
    expect(add).toBeGreaterThan(0);
    expect(got[0].type).not.toBe("uses");
  });

  test("across every module question: never the own skill, no repeats, depth bounded, no question loses its only assessable support", () => {
    const rec = readRecords("x", []);
    let lost = 0;
    for (const c of graph.competencies) {
      const m = moduleFor(c.id); if (!m) continue;
      for (const id of new Set([...m.diagnostics, ...m.practice, ...m.strategies.map((s) => s.check)])) {
        let q; try { q = question(id); } catch { continue; }
        const got = questionSupports(id, rec);
        const own = graph.evidenceTarget(q.competency);
        expect(got.some((s) => s.id === own || s.id === q.competency)).toBe(false);
        expect(new Set(got.map((s) => s.id)).size).toBe(got.length);
        expect(got.every((s) => s.depth >= 1 && s.depth <= RECOVERY_DEPTH)).toBe(true);
        const before = walkSupports(q.competency, RECOVERY_DEPTH).some((s) => moduleFor(s.id));
        if (before && !got.some((s) => s.assessable)) lost++;
      }
    }
    expect(lost).toBe(0);
  }, 60_000);
});
