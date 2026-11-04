import { describe, expect, test } from "bun:test";
import { grade } from "./decision.ts";
import { certified, presentationOf } from "./certify.ts";
import { quarantinedIds } from "../question-status.ts";
import { pool } from "../families.ts";
import data from "../../../../content/learning/grading-certifications.v1.json";

describe("certification (decision 1: evidence per family, form and verifier; never the 'verified' label)", () => {
  test("a decision in a certified family is certified only for the verifier that the audit saw decide", () => {
    const e = (data as any).entries.find((x: any) => x.form === "typed" && x.verifier === "rational-exact@1");
    const q = pool(e.family).items[0];
    const d = grade(q.id, q.answer).decision;
    expect(d.verdict).toBe("correct");
    expect(d.certified).toBe(certified(q.id, d.verifier));
    expect(certified(q.id, "some-other-verifier@1")).toBe(false);
  });
  test("a quarantined presentation is never certified and never decided", () => {
    for (const id of quarantinedIds().slice(0, 50)) { const d = grade(id, "1").decision; expect(d.certified).toBe(false); expect(d.reason).toBe("unresolved.quarantined"); }
  });
  test("authored questions are not certified by the generated-question audit", () => expect(presentationOf("eq-d1")).toBeNull());
  test("certification rules exist only where the audit shows zero blocking findings", () => {
    const refused = Object.keys((data as any).refused);
    for (const e of (data as any).entries) expect(refused).not.toContain(e.family);
  });
});
