/** Milestone 2 bounded interactions: unreadable input and the recovery return loop terminate in a safe stopping state (pause / escalate). */
import { describe, expect, test } from "bun:test";
import { question } from "./content.ts";
import { moduleState, recovery, retriesLeft, RETRY_LIMIT, UNREADABLE_LIMIT } from "./intervention.ts";
import { learnerState, make } from "./session.ts";
import { gradeRequest } from "./server-grader.ts";
import type { LearningRecord } from "./records.ts";

const T0 = Date.parse("2026-10-01T09:00:00Z");
function learner() {
  const events: LearningRecord[] = []; let now = T0, n = 0;
  const ctx = () => ({ learnerId: "synthetic-bounds", sessionId: "s1", at: new Date((now += 60_000)).toISOString() });
  const answer = (qid: string, response: string, activity: "diagnostic" | "original" | "practice" = "diagnostic", o: { context?: string } = {}) => {
    const r = make.attempt(ctx(), qid, response, activity, o) as LearningRecord & { id: string };
    const d = gradeRequest({ id: qid, response }).decision;
    events.push(d ? ({ ...r, decision: { ...d, schema: "grading-decision@1", decisionId: `d${++n}`, decidedBy: "server" } } as LearningRecord) : r);
  };
  const state = () => learnerState("synthetic-bounds", events, now, { currentSession: "s1" });
  return { events, answer, state, get now() { return now; } };
}

describe("bounded-input@1", () => {
  test("after UNREADABLE_LIMIT unreadable answers to the next question the module stops for a person, with no credit and no misconception", () => {
    const L = learner(), c = question("gen:lin:2,17,11").competency;
    let ms = moduleState(c, L.state().records, L.state().evidence(c), L.now, "s1");
    for (let i = 0; i < 10 && ms.question; i++) { L.answer(ms.question, "1..2"); const st = L.state(); ms = moduleState(c, st.records, st.evidence(c), L.now, "s1", null, st.evidence); }
    const st = L.state();
    expect(ms.phase).toBe("pause");
    expect(ms.why).toContain("bounded-input@1");
    expect(st.records.attempts.length).toBe(0);                 // never an attempt (P1), never a hypothesis
    expect(st.records.unresolved.length).toBe(UNREADABLE_LIMIT);
    expect(st.evidence(c).status).toBe("not_started");
  });
});

describe("bounded-retry@1", () => {
  test("retriesLeft allows the first try plus RETRY_LIMIT retries on a question", () => {
    const L = learner();
    expect(retriesLeft(L.state().records, "gen:lin:2,17,11")).toBe(1 + RETRY_LIMIT);
    for (let i = 0; i < 1 + RETRY_LIMIT; i++) L.answer("gen:lin:2,17,11", "22");
    expect(retriesLeft(L.state().records, "gen:lin:2,17,11")).toBe(0);
  });
  test("recovery does not send the original problem back more than RETRY_LIMIT times: it escalates", () => {
    const L = learner(), q = "gen:lin:2,17,11";
    for (let i = 0; i < 1 + RETRY_LIMIT; i++) L.answer(q, "28", "original", { context: `recovery:${q}` });
    const st = L.state();
    const r = recovery(q, st.records, st.evidence, L.now, "s1");
    expect(r.phase).toBe("escalate");
    expect(st.records.attempts.filter((a) => a.questionId === q && a.credit).length).toBe(0);
  });
});
