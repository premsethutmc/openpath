/** step-check@1, operation-tags@1, assisted-first@1 (Class 10 recovery audit, Nov 2026). */
import { describe, expect, test } from "bun:test";
import { problemOf } from "./families.ts";
import { question } from "./content.ts";
import { arithmeticTag, IA, IM, LDIV, MMUL, MT } from "./step-check.ts";
import { investigateContext, moduleState, questionSupports, recovery, type Established } from "./intervention.ts";
import { learnerState, make } from "./session.ts";
import { boardFor } from "./curricula.ts";
import type { LearningRecord } from "./records.ts";

function learner(grade: number) {
  const events: LearningRecord[] = []; let now = Date.parse("2026-11-02T09:00:00Z");
  const ctx = () => ({ learnerId: "syn-step", sessionId: "s1", at: new Date((now += 60_000)).toISOString() });
  events.push(make.enrol(ctx(), grade, "2026-27", boardFor("tn", grade)!) as LearningRecord);
  const answer = (qid: string, response: string, activity: "original" | "practice" | "diagnostic", o: { hints?: number; solution?: boolean; context?: string } = {}) => events.push(make.attempt(ctx(), qid, response, activity, o) as LearningRecord);
  const state = () => learnerState("syn-step", events, now, { currentSession: "s1" });
  const rec = (qid: string) => { const s = state(); return recovery(qid, s.records, s.evidence, now, "s1"); };
  const module = (c: string, est: Established | null) => { const s = state(); return moduleState(c, s.records, s.evidence(c), now, "s1", est); };
  const teach = (c: string, strategy: string) => events.push(make.teach(ctx(), c, strategy, "test") as LearningRecord);
  return { answer, rec, module, teach };
}

describe("operation-tags@1", () => {
  test("a step is tagged by the operation it performs", () => {
    expect(arithmeticTag({ op: "multiply", inputs: [4, -20], value: -80 })).toBe(IM);
    expect(arithmeticTag({ op: "subtract", inputs: [16, -80], value: 96 })).toBe(IA);
    expect(arithmeticTag({ op: "multiply", inputs: [7, 8], value: 56 })).toBe(MT);
    expect(arithmeticTag({ op: "multiply", inputs: [6, 16], value: 96 })).toBe(MMUL);
    expect(arithmeticTag({ op: "divide", inputs: [2400, 75], value: 32 })).toBe(LDIV);
    expect(arithmeticTag({ op: "divide", inputs: [56, 7], value: 8 })).toBe(MT);
  });
  test("4 × (−20) in a discriminant is integer multiplication, and recovery can check it", () => {
    expect(problemOf("gen:disc:-4,-20")!.steps.find((s) => s.id === "four-q")!.competency).toBe(IM);
    expect(questionSupports("gen:disc:-4,-20", learnerState("x", [], Date.now()).records).map((s) => s.id)).toContain(IM);
  });
  test("a multi-digit product tagged as a times-table fact is multi-digit multiplication", () => {
    expect(problemOf("gen:avprop:2,4,4,2")!.steps.find((s) => s.id === "extremes")!.competency).toBe(MMUL);
  });
});

describe("assisted-first@1", () => {
  for (const o of [{ hints: 1 }, { solution: true }]) test(`a first answer right with ${JSON.stringify(o)} is solved with help`, () => {
    const l = learner(10);
    l.answer("gen:disc:-4,-20", question("gen:disc:-4,-20").answer, "original", o);
    const r = l.rec("gen:disc:-4,-20");
    expect(r.phase).toBe("solved_after_help");
    expect(r.reason).not.toBe("Solved on your own.");
  });
  test("an unaided right first answer is still solved on your own", () => {
    const l = learner(10);
    l.answer("gen:disc:-4,-20", "2", "original");
    expect(l.rec("gen:disc:-4,-20").phase).toBe("solved");
  });
});

describe("step-check@1", () => {
  test("tables shown on other facts: a wrong 126 ÷ 7 asks the exact fact it uses, and teaches it after two wrong", () => {
    const l = learner(5);
    for (const [q, a] of [["mt-d2", "42"], ["gen:mul:9,6", "54"], ["gen:mul:4,3", "12"], ["gen:mul:6,6", "36"]]) l.answer(q, a, "practice");
    l.answer("gen:ldiv:18,7", "19", "original");
    // the learner's own wrong fact: 7 × 8 = 54; everything else right
    const reply = (q: string) => (/7 × 8|8 × 7|56 ÷|× [78] = 56/.test(question(q).prompt) ? (/= 56/.test(question(q).prompt) ? "9" : "54") : question(q).answer);
    const asked: string[] = []; let taughtTables = false; let r = l.rec("gen:ldiv:18,7");
    for (let i = 0; i < 40 && !taughtTables; i++) {
      if (r.phase === "investigate" && r.question) { asked.push(r.question); l.answer(r.question, reply(r.question), "diagnostic", { context: r.context ?? investigateContext("gen:ldiv:18,7") }); }
      else if ((r.phase === "support" || r.phase === "teach") && r.active) {
        if (r.active === MT && r.established?.id?.startsWith("step:")) { taughtTables = true; break; }
        const ms = l.module(r.active, r.established ?? null);
        if (ms.question) { asked.push(ms.question); l.answer(ms.question, reply(ms.question), "practice"); }
        else if (ms.phase === "chapter") l.teach(r.active, (ms as { strategy?: { id: string } }).strategy?.id ?? "x");
        else break;
      } else break;
      r = l.rec("gen:ldiv:18,7");
    }
    expect(asked.some((q) => /7 × 8|8 × 7|56 ÷ [78]/.test(question(q).prompt))).toBe(true);
    expect(taughtTables).toBe(true);
    expect(r.established?.id).toMatch(/^step:MT:7x8/);
  }, 60_000);
});
