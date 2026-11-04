/** Phase C stage 7 (D11, G8): the app replays the SERVER's recorded decisions, never a recomputation with the current grader. */
import { describe, expect, test } from "bun:test";
import { make } from "./session.ts";
import { readRecords, withDecisions, type ServerDecision } from "./records.ts";
import { rightAnswer, skillEvidence } from "./evidence.ts";

const at = (n: number) => ({ learnerId: "L", sessionId: "S", at: new Date(Date.UTC(2026, 9, 1, 9, n)).toISOString() });
const lin = "gen:lin:3,5,4"; // 3x + 5 = 17: x = 4
const dec = (id: string, verdict: ServerDecision["verdict"], extra: Partial<ServerDecision> = {}): ServerDecision => ({ schema: "grading-decision@1", decisionId: `d-${id}-${verdict}`, decidedBy: "server", verdict, reason: verdict === "correct" ? "correct.equal" : verdict === "incorrect" ? "incorrect.value" : "unresolved.infrastructure", ...extra });
const withDec = (n: number, response: string, d: ServerDecision | null) => { const r = make.attempt(at(n), lin, response, "practice") as any; return d ? { ...r, decision: { ...d, attemptId: r.id } } : r; };

describe("replay from recorded server decisions", () => {
  test("the recorded verdict is used even where today's grader would decide otherwise", () => {
    const a = withDec(0, "5", dec("a", "correct")), b = withDec(1, "4", dec("b", "incorrect"));
    const rr = readRecords("L", [a, b]);
    expect(rr.attempts.map((x) => [x.response, x.credit, rightAnswer(x)])).toEqual([["5", true, true], ["4", false, false]]);
  });
  test("a server 'unresolved' is never an attempt, whatever the response", () => {
    const rr = readRecords("L", [withDec(0, "4", dec("u", "unresolved"))]);
    expect(rr.attempts.length).toBe(0); expect(rr.unresolved.length).toBe(1);
  });
  test("a superseding decision (an infrastructure regrade) replaces the recorded one", () => {
    const u = withDec(0, "4", dec("u", "unresolved"));
    const later = { [u.id]: { ...dec("u2", "correct"), supersedes: "d-u-unresolved" } };
    const rr = readRecords("L", withDecisions([u], later));
    expect(rr.attempts.map((x) => x.credit)).toEqual([true]);
  });
  test("a decision not marked as the server's is ignored (the browser cannot supply one)", () => {
    const forged = { ...(make.attempt(at(0), lin, "5", "practice") as any), decision: { ...dec("f", "correct"), decidedBy: "client-preview" } };
    expect(readRecords("L", [forged]).attempts[0].credit).toBeUndefined();
    expect(rightAnswer(readRecords("L", [forged]).attempts[0])).toBe(false);   // historical path: compared again
  });
  test("mastery is computed from the recorded verdicts", () => {
    const ok = [0, 1, 2].map((n) => { const r = make.attempt(at(n), `gen:lin:${3 + n},5,${4 + n}`, "999", "diagnostic") as any; return { ...r, decision: { ...dec(`m${n}`, "correct"), attemptId: r.id } }; });
    const rr = readRecords("L", ok);
    expect(rr.attempts.every((x) => x.credit === true)).toBe(true);
    const comp = rr.attempts[0].competency;
    expect(skillEvidence(comp, rr, "unknown", Date.UTC(2026, 9, 2)).independentAt).not.toBeNull();
  });
});
