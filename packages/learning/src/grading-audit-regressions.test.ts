/**
 * Permanent regression fixtures from the curriculum grading audit (MATH_CURRICULUM_GRADING_AUDIT_REPORT.md, defect ids D01–D10).
 * Each fixture states the verdict the unified grading policy requires. A defect that is still open is a `test.failing`: the suite
 * stays green while it is open, and the day it is fixed the test reports, so it must be flipped to `test` in the same change.
 * Verdicts: true = credited, false = incorrect, null = unresolved (never marked wrong).
 */
import { describe, expect, test } from "bun:test";
import { decide } from "./grade.ts";
import { gradeRequest } from "./server-grader.ts";
import { make } from "./session.ts";
import { readRecords } from "./records.ts";

type V = boolean | null;
const client = (id: string, r: string, w: string[] = []): V => decide(id, r, w).credit;
const server = (id: string, r: string): V => gradeRequest({ id, response: r }).credit;

describe("controls (must stay true today and after every fix)", () => {
  const controls: [string, string, V][] = [
    ["gen:aogp:-9,-3,10", "177147", true], ["gen:aogp:-9,-3,10", "177148", false], ["gen:akmed:0,8", "40.5", true],
    ["gen:amrop:3,9,4,2,5", "53 + 29√2", true], ["gen:aenbhd:2,10,9", "(−∞, 1) ∪ (19, ∞)", true],
    ["gen:akmode:0", "5", true], ["gen:asdist3:-5,-5,-5,-2,-2,-3", "√22", true], ["gen:aabig:0,2,0", "B", true], ["gen:aabig:0,2,0", "A", false],
  ];
  for (const [id, r, want] of controls) test(`${id} ${JSON.stringify(r)} -> ${want}`, () => expect(client(id, r)).toBe(want));
});

describe("open defects (flip test.failing -> test when fixed)", () => {
  // D02 malformed text credited by the kernel answer readers: a trailing operator is dropped, and spaces are deleted inside numbers
  test.failing("D02 '177147 +' is not credited (aogp, M2 reader)", () => { expect(client("gen:aogp:-9,-3,10", "177147 +")).toBe(null); expect(server("gen:aogp:-9,-3,10", "177147 +")).toBe(null); });
  test.failing("D02 '17714 7' is not read as 177147", () => { expect(client("gen:aogp:-9,-3,10", "17714 7")).toBe(null); expect(server("gen:aogp:-9,-3,10", "17714 7")).toBe(null); });
  // D03 the legacy interval reader accepts brackets closed at infinity
  test.failing("D03 '[−∞, 1) ∪ (19, ∞]' is not credited", () => expect(client("gen:aenbhd:2,10,9", "[−∞, 1) ∪ (19, ∞]")).not.toBe(true));
  test.failing("D03 '[−∞, 1) ∪ (19, ∞)' is not credited", () => expect(client("gen:aenbhd:2,10,9", "[−∞, 1) ∪ (19, ∞)")).not.toBe(true));
  // D04 the legacy exact reader does not read a coefficient written against sqrt(...)
  test.failing("D04 '53 + 29sqrt(2)' is credited", () => expect(client("gen:amrop:3,9,4,2,5", "53 + 29sqrt(2)")).toBe(true));
  test.failing("D04 '29sqrt(2) + 53' is credited", () => expect(client("gen:amrop:3,9,4,2,5", "29sqrt(2) + 53")).toBe(true));
  // D05 equal answers left unresolved by the kernel readers (safe, but a missed credit)
  test.failing("D05 '+5' is credited (akmode)", () => expect(client("gen:akmode:0", "+5")).toBe(true));
  test.failing("D05 'sqrt(22)' is credited (asdist3)", () => expect(client("gen:asdist3:-5,-5,-5,-2,-2,-3", "sqrt(22)")).toBe(true));
  test.failing("D05 'tan^-1(x) + C' is credited (auinvf)", () => expect(client("gen:auinvf:0,1,0,1,0", "tan^-1(x) + C")).toBe(true));
  // D06 the B1 reader deletes the space of a mixed number: "40 1/2" is read as 401/2 and the server marks an equal answer wrong
  test.failing("D06 '40 1/2' is not marked incorrect by the server (akmed, 40.5)", () => expect(server("gen:akmed:0,8", "40 1/2")).not.toBe(false));
  // D10 the client falls back to the stored-answer comparison where the server does not: the two verdicts differ
  test.failing("D10 client and server agree on '4 21/25' (agdec, 4.84)", () => expect(client("gen:agdec:11,374,0", "4 21/25")).toBe(server("gen:agdec:11,374,0", "4 21/25")));
  test.failing("D10 client and server agree on '40 1/2' (akmed)", () => expect(client("gen:akmed:0,8", "40 1/2")).toBe(server("gen:akmed:0,8", "40 1/2")));
  // D09 a held (quarantined) word-form question is served; the learner's correct answer is never decided on the client
  test.failing("D09 a correct answer to a served :w question is decided (adexp)", () => expect(client("gen:adexp:9,8,5,7:w", "9857")).toBe(true));
  // D01 invalid input recorded as incorrect instead of unresolved
  test.failing("D01 'C' on a two-option question is unresolved (aabig)", () => expect(client("gen:aabig:0,2,0", "C")).toBe(null));
  test.failing("D01 '1/0' is unresolved (apinvf, expression)", () => expect(client("gen:apinvf:-5,-5,0,1", "1/0")).toBe(null));
  // D08 (policy proposal) text with two differing readings is not credited without clarification
  test.failing("D08 '−1/2x − 9/2' for −(1/2)x − 9/2 is unresolved (asfam)", () => expect(client("gen:asfam:-3,-3,0,2,2,4", "−1/2x − 9/2")).toBe(null));
  // D16 (approved policy 1, 2026-10-29): an unreadable submission never consumes an assessed attempt, however many are sent (abuse is rate-limited elsewhere)
  test.failing("D16 four unreadable submissions create no attempt", () => {
    const at = (n: number) => ({ learnerId: "L", sessionId: "S", at: new Date(Date.UTC(2026, 9, 1, 9, n)).toISOString() });
    const rr = readRecords("L", [0, 1, 2, 3].map((n) => make.attempt(at(n), "gen:lin:3,5,4", "four-ish", "practice")));
    expect(rr.attempts.length).toBe(0);
  });
});
