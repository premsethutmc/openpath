/** explore-once@1: an exploratory question already answered is never served again (curriculum entry: lesson reviewed first). */
import { expect, test } from "bun:test";
import { boardFor } from "./curricula.ts";
import { moduleFor, question } from "./content.ts";
import { exposureKey } from "./families.ts";
import type { LearningRecord } from "./records.ts";
import { learnerState, make } from "./session.ts";

const C = "MATH.number.fraction-comparison";
function walk(withLessonReview: boolean) {
  let now = Date.parse("2026-11-01T09:00:00Z");
  const S = "learn:synthetic-explore:1";
  const ctx = () => ({ learnerId: "synthetic-explore", sessionId: S, at: new Date((now += 60_000)).toISOString() });
  const events: LearningRecord[] = [make.enrol(ctx(), 3, "2026-27", boardFor("cbse", 3)!)];
  // the curriculum entry records the lesson review before Assessment opens the module (CurriculumPractice)
  if (withLessonReview) events.push(make.teach(ctx(), C, moduleFor(C)!.strategies[0].id, "foundation-lesson-review@1"));
  const served: string[] = [];
  for (let i = 0; i < 6; i++) {
    const st = learnerState("synthetic-explore", events, now, { currentSession: S });
    const ms = st.module(C);
    if (ms.phase === "chapter") { events.push(make.teach(ctx(), C, ms.strategy!.id, "test")); continue; }
    if (!ms.question) break;
    served.push(`${ms.phase}:${ms.question}`);
    events.push(make.attempt(ctx(), ms.question, question(ms.question).answer, ms.activity ?? "diagnostic", ms.context ? { context: ms.context } : {}));
  }
  return served;
}

test("after a lesson review in the same session, right answers move the module on instead of repeating a diagnostic", () => {
  const served = walk(true);
  const keys = served.map((s) => exposureKey(s.split(":").slice(1).join(":")));
  expect(new Set(keys).size).toBe(keys.length); // nothing served twice
  expect(served.filter((s) => s.startsWith("explore:")).length).toBeLessThanOrEqual(moduleFor(C)!.diagnostics.length);
  expect(served.some((s) => !s.startsWith("explore:"))).toBe(true);
}, 60_000);

test("the plain route (no lesson review) is unchanged", () => {
  const served = walk(false);
  expect(served.slice(0, 2)).toEqual(["explore:fc-d2", "explore:fc-d1"]);
  expect(served[2].startsWith("explore:")).toBe(false);
}, 60_000);
