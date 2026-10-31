// D1: the trusted grader's working assessment (working-assessment@1) on the reference problem "3x = 19 - 4" and its safety properties.
import { describe, expect, test } from "bun:test";
import { gradeRequest } from "../server-grader.ts";
import { readSubmission } from "./submission.ts";
import { replayWorking, taskStatement, WORKING_ASSESSMENT } from "./working.ts";
import { AUTHORITY_VERSION } from "../derivation-authority.ts";

const REF = "le-ref-3x-19-4";
const grade = (typed: string) => { const s = readSubmission(typed, true); const r = gradeRequest({ id: REF, ...s }); return { s, r, d: r.decision!, w: r.decision!.working! }; };

describe("reference problem 3x = 19 - 4 (cases A-G)", () => {
  test("the statement comes from the question, not the request", () => {
    expect(taskStatement(REF)).toBe("3x = 19 - 4");
    const r = gradeRequest({ id: REF, response: "x = 5", working: ["3x = 15", "x = 5"], statement: "3x = 16" } as never);
    expect(r.decision!.working!.statement).toBe("3x = 19 - 4");
    expect(r.decision!.working!.status).toBe("verified");
  });
  test("A  x = 4: incorrect answer, no working judged, no misconception, substitution shows the mismatch", () => {
    const { s, r, d, w } = grade("x = 4");
    expect(s).toEqual({ response: "x = 4", working: [] });
    expect([r.verdict, r.reason, r.credit]).toEqual(["incorrect", "incorrect.value", false]);
    expect([w.status, w.methodEvidence, w.completeness, w.firstInvalid]).toEqual(["none", "no-method-evidence", "no-working", null]);
    expect(w.substitution).toEqual({ variable: "x", value: "4", left: "3x", right: "19 - 4", leftValue: "12", rightValue: "15", holds: false });
    expect(d.diagnosis).toBeNull();
  });
  test("B  x = 5: correct answer; a bare answer is not method evidence", () => {
    const { r, w } = grade("x = 5");
    expect([r.verdict, r.credit]).toEqual(["correct", true]);
    expect([w.status, w.methodEvidence, w.certificates.length, w.substitution]).toEqual(["none", "no-method-evidence", 0, null]);
  });
  test("C  3x = 15; x = 5: correct answer and verified, replayed working", () => {
    const { s, r, w } = grade("3x = 15; x = 5");
    expect(s).toEqual({ response: "x = 5", working: ["3x = 15", "x = 5"] });
    expect(r.verdict).toBe("correct");
    expect([w.status, w.methodEvidence, w.completeness, w.replayed, w.replayedLines, w.certificates.length, w.agreesWithResponse]).toEqual(["verified", "method-verified", "complete", true, 2, 2, true]);
    expect(w.lines.map((l) => l.status)).toEqual(["certified-equivalence", "certified-equivalence"]);
    expect(w.versions.authority).toBe(AUTHORITY_VERSION);
  });
  test("D  3x = 15; x = 4: incorrect answer; the first invalid transformation is line 2, line 1 stays checked", () => {
    const { r, w } = grade("3x = 15; x = 4");
    expect(r.verdict).toBe("incorrect");
    expect([w.status, w.methodEvidence, w.replayedLines]).toEqual(["invalid", "method-false-step", 1]);
    expect(w.firstInvalid).toEqual({ index: 1, text: "x = 4", from: "3x = 15", reason: "loses-solution: x = 5 satisfies the line before but not this one", lost: "5", gained: "4" });
  });
  test("E  3x = 16; x = 16/3: the first invalid step is the first line (from the original equation)", () => {
    const { r, w } = grade("3x = 16; x = 16/3");
    expect([r.verdict, r.reason]).toEqual(["incorrect", "incorrect.value"]);
    expect(w.firstInvalid).toEqual({ index: 0, text: "3x = 16", from: "3x = 19 - 4", reason: "loses-solution: x = 5 satisfies the line before but not this one", lost: "5", gained: "16/3" });
    expect([w.replayedLines, w.lines[1].status]).toEqual([0, "unsupported"]);
  });
  test("F  3x = 15: valid partial working, no final answer; not marked right or wrong", () => {
    const { s, r, w } = grade("3x = 15");
    expect(s).toEqual({ response: "", working: ["3x = 15"] });
    expect([r.verdict, r.credit]).toEqual(["unresolved", null]);
    expect([w.status, w.completeness, w.methodEvidence, w.replayedLines, w.workingAnswer]).toEqual(["partial", "incomplete", "no-method-evidence", 1, null]);
  });
  test("G  unsupported or ambiguous notation: no verdict about the method, no fabricated answer", () => {
    for (const t of ["3x=15 => x=5", "x = 15/3x", "divide by 3 so x is 5", "3x = 15 => x = 5; x = 5", "3x = 15; x2 = 25"]) {
      const { r, w } = grade(t);
      expect([w.status, w.methodEvidence, w.firstInvalid, w.workingAnswer, w.certificates.length]).toEqual(["unsupported", "no-method-evidence", null, null, 0]);
      expect(r.verdict === "correct" || r.verdict === "unresolved").toBe(true);   // never marked wrong because of its notation
    }
  });
  test("a correct answer through invalid working keeps both verdicts apart", () => {
    const { r, w } = grade("3x = 16; x = 5");
    expect([r.verdict, r.credit]).toEqual(["correct", true]);
    expect([w.status, w.methodEvidence, w.firstInvalid?.index]).toEqual(["invalid", "method-false-step", 0]);
  });
  test("the answer alone written as working is not method evidence and not an invalid step", () => {
    for (const [resp, verdict] of [["x = 4", "incorrect"], ["x = 5", "correct"]] as const) {
      const w = gradeRequest({ id: REF, response: resp, working: [resp] }).decision!.working!;
      expect(gradeRequest({ id: REF, response: resp, working: [resp] }).verdict).toBe(verdict);
      expect([w.status, w.methodEvidence, w.firstInvalid]).toEqual(["answer-only", "no-method-evidence", null]);
    }
  });
});

describe("contract safety", () => {
  test("the answer verdict never depends on the working", () => {
    for (const resp of ["x = 5", "x = 4", "5", "16/3"]) {
      const bare = gradeRequest({ id: REF, response: resp });
      for (const working of [["3x = 15", resp], ["3x = 16", resp], ["divide by 3"], ["3x = 15"]]) {
        const r = gradeRequest({ id: REF, response: resp, working });
        expect([r.verdict, r.reason, r.credit]).toEqual([bare.verdict, bare.reason, bare.credit]);
      }
    }
  });
  test("questions with no task statement keep their decision exactly (no working field)", () => {
    for (const id of ["gen:auleq:1,2,9,10", "ch-triangle"]) {
      const r = gradeRequest({ id, response: "C" });
      expect(r.decision && "working" in r.decision).toBe(false);
    }
    expect(gradeRequest({ id: "ch-triangle", response: "36", working: ["1+2+3+4+5+6+7+8 = 36"] }).decision!.working!.status).toBe("unsupported");
  });
  test("generated equation questions are judged against their family's own statement", () => {
    const w = gradeRequest({ id: "gen:lin:3,4,5", response: "x = 4", working: ["3x = 15", "x = 4"] }).decision!.working!;
    expect([w.schema, w.statement, w.status, w.firstInvalid?.index]).toEqual([WORKING_ASSESSMENT, "3x+4=19", "invalid", 1]);
    const v = gradeRequest({ id: "gen:lin:3,4,5", response: "x = 5", working: ["3x = 15", "x = 5"] }).decision!.working!;
    expect(v.status).toBe("verified");
  });
  test("a recorded assessment replays as current; another authority version is historical; a tampered one fails", () => {
    const d = gradeRequest({ id: REF, response: "x = 5", working: ["3x = 15", "x = 5"] }).decision!;
    expect(replayWorking(d).replay).toBe("replayable-current");
    expect(replayWorking({ ...d, working: { ...d.working!, versions: { ...d.working!.versions, authority: "openpath-derivation-authority@3" } } }).replay).toBe("historical-version-not-replayable");
    expect(replayWorking({ ...d, working: { ...d.working!, certificates: ["0".repeat(64), d.working!.certificates[1]] } }).replay).toBe("failed-replay");
    expect(replayWorking({ ...d, working: { ...d.working!, status: "invalid" } }).replay).toBe("failed-replay");
  });
  test("submission splitting is syntax only and applies only to stated questions", () => {
    expect(readSubmission("2x + 3", false)).toEqual({ response: "2x + 3", working: [] });
    expect(readSubmission("x = 2 or x = 3", true)).toEqual({ response: "x = 2 or x = 3", working: [] });
    expect(readSubmission("3x = 15\nx = 5", true)).toEqual({ response: "x = 5", working: ["3x = 15", "x = 5"] });
    expect(readSubmission("  ", true)).toEqual({ response: "", working: [] });
  });
  test("invalid working never becomes verified method evidence, even when the final answer is correct", () => {
    const ref: string[][] = [["3x = 16", "x = 5"], ["3x = 15", "3x = 16", "x = 5"], ["3x = 14", "x = 5"], ["x = 15/3", "3x = 16", "x = 5"], ["3x = 19 + 4", "x = 5"], ["x + 3 = 8", "x = 5"]];
    for (const working of ref) {
      const r = gradeRequest({ id: REF, response: "x = 5", working });
      expect(r.verdict).toBe("correct");
      expect(r.decision!.working!.methodEvidence).not.toBe("method-verified");
      expect(["invalid", "unsupported"]).toContain(r.decision!.working!.status);
    }
    // every generated ax + b = c question: a false intermediate line (a·x = c − b + 1) followed by the right answer
    let n = 0;
    for (let a = 2; a <= 9; a++) for (let b = 1; b <= 12; b += 3) for (let x = 1; x <= 9; x += 2) {
      const id = `gen:lin:${a},${b},${x}`, c = a * x + b;
      const r = gradeRequest({ id, response: `x = ${x}`, working: [`${a}x = ${c - b + 1}`, `x = ${x}`] });
      expect(r.verdict).toBe("correct");
      const w = r.decision!.working!;
      expect([w.status, w.methodEvidence, w.firstInvalid?.index]).toEqual(["invalid", "method-false-step", 0]);
      expect(w.replayedLines).toBe(0);
      n++;
    }
    expect(n).toBe(160);
  });
});
