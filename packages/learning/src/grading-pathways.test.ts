/** Stabilisation (Gate 6): the real submission path — make.attempt → stored record → readRecords → mastery replay — for each shared answer semantic. */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { make, decide, creditOf } from "./session.ts";
import { readRecords } from "./records.ts";
import { evidenceFor, rightAnswer } from "./evidence.ts";
import { question } from "./content.ts";
import { pool } from "./families.ts";

const ctx = (n = 0) => ({ learnerId: "L", sessionId: "S", at: new Date(Date.UTC(2026, 9, 1, 9, n)).toISOString() });
const lin = "gen:lin:3,5,4", quad = "gen:quad:-5,6", Q = "MATH.algebra.linear-equations";
const credit = (id: string, r: string, w: string[] = []) => decide(id, r, w).credit;
const firstOf = (f: string) => pool(f).items.find((i) => !i.id.endsWith(":mc"))!.id;
const attemptOf = (qid: string, r: string, n = 0) => make.attempt(ctx(n), qid, r, "practice") as any;

describe("numeric equivalence (shared answer semantics, not string exceptions)", () => {
  test("4, 4.0, +4, 4., x = 4 are correct; 5, 4.5 and 40 are not; a kernel family and a legacy family agree", () => {
    for (const r of ["4", "4.0", "+4", "4.", "x = 4", "x=4"]) expect(credit(lin, r)).toBe(true);
    for (const r of ["5", "4.5", "40", "-4"]) expect(credit(lin, r)).toBe(false);
    const legacy = firstOf("rect"); // area family without a kernel: "4" stored
    expect(credit(legacy, "4")).toBe(true); expect(credit(legacy, "4.0")).toBe(true); expect(credit(legacy, "4.5")).toBe(false);
  });
  test("the stored record keeps a form the server can read", () => {
    expect(attemptOf(lin, "4.0").response).toBe("4.0");     // the server reads 4.0 as 4
    expect(attemptOf(lin, "x = 4").response).toBe("4");     // plain form recorded
  });
});

describe("sets are unordered, tuples are ordered", () => {
  test("kernel set: any order, braces, words", () => { for (const r of ["2, 3", "3, 2", "{3,2}", "{ 2 , 3 }", "x = 3 or x = 2"]) expect(credit(quad, r)).toBe(true); for (const r of ["2", "{2}", "2, 4", "{2, 3, 4}"]) expect(credit(quad, r)).toBe(false); });
  test("legacy set type: braces and order", () => {
    const id = firstOf("ajzero"), p = question(id); expect(p.type).toBe("set");
    const els = p.answer.split(",").map((s) => s.trim());
    expect(credit(id, `{${[...els].reverse().join(",")}}`)).toBe(true); expect(credit(id, [...els].reverse().join(", "))).toBe(true);
    expect(credit(id, `{${els.slice(1).join(",")}}`)).toBe(false);
  });
  test("tuple: reversed is wrong, a brace set is not a tuple", () => {
    const id = firstOf("aaorder"), p = question(id); expect(p.type).toBe("tuple");
    const els = p.answer.split(",").map((s) => s.trim());
    expect(credit(id, els.join(", "))).toBe(true); expect(credit(id, [...els].reverse().join(", "))).toBe(false);
    expect(creditOf(id, `{${els.join(",")}}`)).not.toBe(true);
  });
});

describe("interval endpoint inclusion is part of the comparison", () => {
  for (const [f, ends] of [["aeineqs", ["(−8, −7)", "(−8, −7]", "[−8, −7)", "[−8, −7]"]], ["aoqin", ["[−8, −7]", "[−8, −7)", "(−8, −7]", "(−8, −7)"]]] as const) {
    test(`${f}: only the stored closure is credited (all four combinations)`, () => {
      const id = firstOf(f), want = question(id).answer.replace(/−/g, "-").replace(/\s/g, "");
      for (const sub of ["(−8,−7)", "(−8,−7]", "[−8,−7)", "[−8,−7]"]) expect(credit(id, sub)).toBe(sub.replace(/−/g, "-") === want);
      expect(ends.length).toBe(4);
    });
  }
});

describe("unreadable input is undecided, never wrong, and never moves mastery", () => {
  test("decision, record, replay", () => {
    for (const id of [lin, quad, firstOf("fadd"), firstOf("ajzero")]) for (const r of ["four-ish", "x = ?", "?"]) {
      const a = decide(id, r); expect(a.credit).toBeNull(); expect(a.evidence.unresolved).toBe(true);
      const rec = attemptOf(id, r); expect(rec.assessment.unresolved).toBe(true); expect(rec.assessment.answerCorrect).toBeNull();
      const rr = readRecords("L", [rec]); expect(rr.attempts.length).toBe(0); expect(rr.unresolved.length).toBe(1);
    }
  });
  test("clarification: one question, then the clarified plain answer is decided", () => {
    const first = decide(quad, "two and three-ish"); expect(first.credit).toBeNull(); expect(first.clarification).toBeTruthy();
    expect(decide(quad, "2 and 3", [], 1).credit).toBe(true);
    expect(decide(quad, "4 and 5", [], 1).credit).toBe(false);
    const still = decide(quad, "two and three-ish", [], 1); expect(still.credit).toBeNull(); expect(still.evidence.clarificationRequired).toBe(true);
  });
});

describe("answer-first behaviour (4979fe3) is preserved", () => {
  test("correct answer, bad working: credited, working not examined", () => {
    const a = decide(lin, "4", ["3x = 99", "x = 33"]); expect(a.credit).toBe(true); expect(a.evidence.methodExamined).toBe(false); expect(a.evidence.firstError).toBeNull();
  });
  test("wrong answer, wrong first step then locally valid steps: first error is the first step only", () => {
    const a = decide(lin, "22/3", ["3x + 5 = 17", "3x = 22", "x = 22/3"]); expect(a.credit).toBe(false); expect(a.evidence.methodExamined).toBe(true);
    expect(a.evidence.firstError?.transition).toBe(1);
  });
  test("wrong answer, no working: wrong, an optional step is offered", () => { const a = decide(lin, "5"); expect(a.credit).toBe(false); expect(a.clarification?.kind).toBe("show-step"); });
});

describe("forged client claims do not change the grade (replay recomputes from the response)", () => {
  test("a wrong answer claiming correct, and a right answer claiming wrong", () => {
    const wrong = { ...attemptOf(lin, "5"), assessment: { ...attemptOf(lin, "4").assessment } };
    const right = { ...attemptOf(lin, "4", 1), id: "r2", assessment: { ...attemptOf(lin, "5").assessment } };
    const rr = readRecords("L", [wrong, right]);
    expect(rr.attempts.map((a) => rightAnswer(a))).toEqual([false, true]);
  });
  test("a decidable wrong answer flagged unresolved is an attempt, not parked", () => {
    const parked = { ...attemptOf(lin, "5"), assessment: { ...attemptOf(lin, "four-ish").assessment } };
    const rr = readRecords("L", [parked]); expect(rr.attempts.length).toBe(1); expect(rr.unresolved.length).toBe(0); expect(rightAnswer(rr.attempts[0])).toBe(false);
  });
});

describe("legacy pathway is labelled, not presented as verified", () => {
  test("a family without a kernel decides on the stored answer and says so", () => {
    const id = firstOf("rect"), a = decide(id, question(id).answer);
    expect(a.credit).toBe(true); expect(a.evidence.source).toBe("legacy"); expect(attemptOf(id, "4").assessment.source).toBe("legacy");
    expect(decide(lin, "4").evidence.source).toBe("kernel");
  });
});

describe("mastery", () => {
  test("correct and incorrect move the evidence; unresolved do not", () => {
    const ids = [lin, "gen:lin:2,3,5", quad];
    const base = ids.map((id, i) => attemptOf(id, question(id).answer, i));
    const none = evidenceFor("L", readRecords("L", []), Date.UTC(2026, 9, 2)).get(Q);
    const a = evidenceFor("L", readRecords("L", base.slice(0, 1)), Date.UTC(2026, 9, 2)).get(Q);
    const noise = [attemptOf(lin, "four-ish", 5), attemptOf(lin, "x = ?", 6)];
    const b = evidenceFor("L", readRecords("L", [...base.slice(0, 1), ...noise]), Date.UTC(2026, 9, 2)).get(Q);
    expect(a.independent.total).toBeGreaterThan(none.independent.total);
    expect(b.independent).toEqual(a.independent); expect(b.attempts).toEqual(a.attempts);       // unresolved: no change
    const w = evidenceFor("L", readRecords("L", [attemptOf(lin, "5", 0)]), Date.UTC(2026, 9, 2)).get(Q);
    expect(w.independent.total).toBe(1); expect(w.independent.right).toBe(0);                   // incorrect: counted, no credit
  });
});

describe("integrity: no Node built-ins in the browser path; no screen compares a response with a stored answer on its own", () => {
  const root = new URL("../../..", import.meta.url).pathname;
  const files = (d: string, out: string[] = []) => { for (const e of readdirSync(d)) { const p = `${d}/${e}`; if (e === "node_modules" || e === "dist") continue; if (statSync(p).isDirectory()) files(p, out); else if (/\.(ts|tsx)$/.test(e) && !/\.test\./.test(e)) out.push(p); } return out; };
  test("the module closure of session.ts imports no node: module", () => {
    const seen = new Set<string>(), bad: string[] = [];
    const visit = (f: string) => { if (seen.has(f)) return; seen.add(f); const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) { const s = m[1]; if (s.startsWith("node:")) { bad.push(`${f}: ${s}`); continue; } if (!s.startsWith(".")) continue;
        const base = new URL(s, "file://" + f).pathname.replace(/\.ts$/, ""); for (const c of [base + ".ts", base + "/index.ts", base + ".tsx"]) { try { statSync(c); visit(c); break; } catch { /* next */ } } } };
    visit(`${root}/packages/learning/src/session.ts`); visit(`${root}/packages/learning/src/grade.ts`); visit(`${root}/packages/learning/src/assessment.ts`);
    expect(bad).toEqual([]); expect(seen.size).toBeGreaterThan(10);
  });
  test("student screens do not call isCorrect", () => {
    const hits = files(`${root}/frontend/src/year`).filter((f) => /\bisCorrect\(/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
