/** Release check A: in shadow / legacy mode the learner never sees a unified preview that differs from the authoritative server decision. */
import { afterEach, describe, expect, test } from "bun:test";
import { decide } from "../grade.ts";
import { authoritativeView } from "./view.ts";
import { setGradingMode } from "./mode.ts";
import { programDecision } from "../../../mathematics/src/program-grading.ts";
import { readRecords, type ServerDecision } from "../records.ts";
import { make } from "../session.ts";
import { rightAnswer } from "../evidence.ts";

const lin = "gen:lin:3,5,4";   // x = 4
const rec = (verdict: ServerDecision["verdict"]): ServerDecision => ({ schema: "grading-decision@1", decisionId: "d", decidedBy: "server", verdict, reason: "legacy" });
afterEach(() => setGradingMode("unified"));

describe("what the learner is shown after an answer", () => {
  test("shadow: the authoritative (legacy) decision is shown even where the unified preview differs", () => {
    setGradingMode("shadow");
    const preview = decide(lin, "4");                         // unified: correct
    expect(authoritativeView(preview, rec("incorrect"))!.credit).toBe(false);
    expect(authoritativeView(preview, rec("incorrect"))!.feedback.kind).toBe("incorrect");
    const unread = decide(lin, "four");                      // unified: unresolved
    expect(authoritativeView(unread, rec("incorrect"))!.credit).toBe(false);    // legacy marked it: that is what is shown
    expect(authoritativeView(unread, rec("unresolved"))).toBe(unread);         // both undecided: the clarification is kept
  });
  test("shadow without a server decision: no unified verdict is shown", () => {
    setGradingMode("shadow");
    const v = authoritativeView(decide(lin, "4"), null)!;
    expect([v.credit, v.feedback.kind]).toEqual([null, "pending"]);
  });
  test("unified: the preview is shown when the server agrees, the server's verdict when it does not", () => {
    setGradingMode("unified");
    const p = decide(lin, "4");
    expect(authoritativeView(p, rec("correct"))).toBe(p);
    expect(authoritativeView(p, null)).toBe(p);
    expect(authoritativeView(p, rec("unresolved"))!.credit).toBeNull();
  });
  test("an unknown or missing mode from the server is treated as legacy", () => {
    expect(setGradingMode(undefined)).toBe("legacy");
    expect(setGradingMode("anything")).toBe("legacy");
  });
  test("program engines: the earlier marking decides in shadow mode; a recorded server decision always wins", () => {
    const id = "program:equivalent-fractions:independent-2";   // 3/5, in simplest form
    setGradingMode("shadow");
    expect(programDecision(id, "6/10", undefined, () => true).verdict).toBe("correct");      // earlier marking (as before), not the unified "required form"
    expect(programDecision(id, "x", undefined, () => null).verdict).toBe("unresolved");
    expect(programDecision(id, "3/5", rec("incorrect"), () => true).verdict).toBe("incorrect");
    setGradingMode("unified");
    expect(programDecision(id, "6/10", undefined, () => true).verdict).toBe("incorrect");
  });
  test("replay of a historical record (no server decision) uses the earlier comparison until the unified grader is authoritative", () => {
    const at = { learnerId: "L", sessionId: "S", at: new Date(Date.UTC(2026, 9, 1, 9, 0)).toISOString() };
    const r = make.attempt(at, "gen:lin:3,5,4", "x = 4", "practice") as any;   // the unified grader reads "x = 4"; the earlier comparison does not
    setGradingMode("shadow");
    expect(rightAnswer(readRecords("L", [r]).attempts[0])).toBe(false);
    setGradingMode("unified");
    expect(rightAnswer(readRecords("L", [r]).attempts[0])).toBe(true);
  });
});
