/** deeper-support@1: recovery goes further down only below a supporting skill she keeps getting wrong. */
import { describe, expect, test } from "bun:test";
import { moduleState, recovery } from "./intervention.ts";
import { learnerState, make } from "./session.ts";
import { gradeRequest } from "./server-grader.ts";
import type { LearningRecord } from "./records.ts";

function run(start: string, rightOnSupports: boolean) {
  const events: LearningRecord[] = []; let now = Date.parse("2026-10-01T09:00:00Z"), n = 0;
  const ctx = () => ({ learnerId: "syn", sessionId: "s1", at: new Date((now += 60_000)).toISOString() });
  const answer = (qid: string, response: string, activity: "original" | "probe" | "practice" | "guided") => {
    const r = make.attempt(ctx(), qid, response, activity) as LearningRecord;
    const d = gradeRequest({ id: qid, response }).decision;
    events.push(d ? ({ ...r, decision: { ...d, schema: "grading-decision@1", decisionId: `d${++n}`, decidedBy: "server" } } as LearningRecord) : r);
  };
  const reply = (qid: string) => (rightOnSupports ? (gradeRequest({ id: qid, response: "" }) as { expected?: string }).expected ?? "1" : "1");
  const st = () => learnerState("syn", events, now, { currentSession: "s1" });
  answer(start, "1", "original");
  const active: string[] = [];
  for (let i = 0; i < 40; i++) {
    const s = st(); const r = recovery(start, s.records, s.evidence, now, "s1");
    if (r.active) active.push(r.active);
    if (r.phase === "escalate" || r.phase.startsWith("solved")) break;
    if (r.question) { answer(r.question, reply(r.question), "probe"); continue; }
    if (r.active) {
      const ms = moduleState(r.active, s.records, s.evidence(r.active), now, "s1", null, s.evidence);
      if (ms.question) { answer(ms.question, reply(ms.question), ms.phase === "guided" ? "guided" : "practice"); continue; }
      if (ms.phase === "chapter") { events.push(make.teach(ctx(), r.active, (ms as { strategy?: { id: string } }).strategy?.id ?? "x", "test") as LearningRecord); continue; }
      break;
    }
    if (r.phase === "return") { answer(start, "1", "original"); continue; }
    break;
  }
  return [...new Set(active)];
}

describe("deeper-support@1", () => {
  test("wrong on long division and on everything it builds on: recovery reaches place value, three levels down", () => {
    expect(run("gen:ldiv:18,2", false)).toContain("MATH.number.place-value-tens");
  });
  test("the skills it builds on come out right: never further down than before", () => {
    expect(run("gen:ldiv:18,2", true)).not.toContain("MATH.number.place-value-tens");
  });
});
