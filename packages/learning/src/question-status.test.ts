/**
 * question-status@1 acceptance tests (Phase C stage 1, D09). A quarantined presentation must not be selectable through any learning,
 * practice, diagnostic, transfer, retention, probe, recovery, revision or study route, and must receive no authoritative grade.
 * Definitions and historical records are kept.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { contractFor } from "./assessment.ts";
import { moduleFor, modules, poolFamilies, question, quarantinedFromModules, withoutQuarantined } from "./content.ts";
import { FAMILIES, inPool, phasePool, pool, problemOf, variantsOf, type Phase } from "./families.ts";
import { decide, creditOf } from "./grade.ts";
import { fromPool } from "./intervention.ts";
import { modulePhasePool, moduleQuestions } from "./library.ts";
import { quarantined, quarantinedIds, selectable, statusEntry } from "./question-status.ts";
import { readRecords } from "./records.ts";
import { gradeRequest } from "./server-grader.ts";
import { learnerState, make } from "./session.ts";
import { Driver } from "../../../frontend/src/learning/driver.ts";
import libraryData from "../../../content/learning/library.v1.json";

const Q = quarantinedIds();
const PHASES: Phase[] = ["diagnostic", "check", "practice", "retention"];
const FAMS = [...new Set(Q.map((id) => id.split(":")[1]))];

const LONG = 900_000;
describe("registry", () => {
  test("lists exactly the 951 word-form presentations found by the audit (D09)", () => {
    expect(Q.length).toBe(951);
    expect(FAMS.sort()).toEqual(["adexp", "aiintx", "auaps"]);
    expect(Q.every((id) => id.endsWith(":w"))).toBe(true);
  }, LONG);
  test("is current: every held contract is quarantined and every entry is a held contract or a reviewed manual entry", () => {
    const held = new Set<string>();
    for (const [fam, def] of FAMILIES) {
      if (!def.contract) continue;
      for (const q of pool(fam).items) for (const s of ["", ":mc", ":w"]) { const id = q.id + s; if ((!s || problemOf(id)) && contractFor(id)?.verification === "held") held.add(id); }
    }
    expect([...held].filter((id) => !quarantined(id))).toEqual([]);
    expect(Q.filter((id) => !held.has(id) && statusEntry(id)!.evidence.indexOf("manual") < 0)).toEqual([]);
  }, LONG);
  test("definitions are kept: every quarantined question still builds and keeps its answer", () => {
    for (const id of Q) expect(problemOf(id)?.id).toBe(id);
  }, LONG);
});

describe("selectors never return a quarantined question", () => {
  test("release pool membership", () => { for (const id of Q) expect(inPool(id)).toBe(false); });
  test("phase pools and module phase pools, every family and module", () => {
    for (const f of FAMS) for (const ph of PHASES) expect(phasePool(f, ph).filter(quarantined)).toEqual([]);
    for (const m of modules) for (const ph of PHASES) expect(modulePhasePool(m, ph).filter(quarantined)).toEqual([]);
  }, LONG);
  test("every question list of every module (compiled library and authored), including strategies, probes and written tasks", () => {
    for (const m of modules) {
      const lists = Object.values(moduleQuestions(m)).flat().concat(m.strategies.flatMap((s) => s.needs), m.written ?? []);
      expect(lists.filter((x) => typeof x === "string" && quarantined(x))).toEqual([]);
    }
  }, LONG);
  test("the compiled library is rebuilt without them, and load-time filtering removes any that reach a module", () => {
    expect((JSON.stringify(libraryData).match(/gen:[a-z0-9]+:[-0-9,]+(?::mc|:w)?/g) ?? []).filter(quarantined)).toEqual([]);
    expect(quarantinedFromModules).toEqual([]);
    const m = modules.find((x) => x.competency === "MATH.number.thousands")!, bad = Q.find((id) => id.startsWith("gen:adexp:"))!;
    const f = withoutQuarantined({ ...m, transfer: [bad, ...m.transfer], practice: [bad, ...m.practice], strategies: m.strategies.map((s) => ({ ...s, needs: [bad, ...s.needs] })) });
    expect([...f.transfer, ...f.practice, ...f.strategies.flatMap((s) => s.needs)].filter(quarantined)).toEqual([]);
    expect(f.transfer).toEqual(m.transfer);
    quarantinedFromModules.length = 0;
  }, LONG);
  test("variants (recovery / investigate) of every quarantined problem's typed form", () => {
    for (const id of Q.filter((_, i) => i % 7 === 0)) expect(variantsOf(problemOf(id.replace(/:w$/, ""))!).map((v) => v.id).filter(quarantined)).toEqual([]);
  }, LONG);
  test("next unseen question from the pool, every phase, for the affected modules", () => {
    const empty = readRecords("L", []);
    for (const m of modules.filter((x) => poolFamilies(x).some((f) => FAMS.includes(f)))) for (const ph of PHASES) { const id = fromPool(m, ph, empty); expect(id === null || selectable(id)).toBe(true); }
  }, LONG);
  test("a synthetic learner working every affected module end to end is never offered one", () => {
    const affected = [...new Set(["MATH.algebra.arithmetic-sequences", "MATH.number.thousands", "MATH.number.integer-multiply"].concat(modules.filter((x) => poolFamilies(x).some((f) => FAMS.includes(f))).map((x) => x.competency)))];
    expect(affected.length).toBeGreaterThanOrEqual(3);
    for (const c of affected) {
      const d = new Driver(`syn-${c}`, Date.UTC(2026, 9, 1));
      for (const day of [0, 8, 30]) { d.newSession(day); d.work(c, (q) => question(q).answer, { max: 60 }); }
      expect(d.events.filter((e: any) => e.record === "attempt" && quarantined(e.questionId))).toEqual([]);
    }
  }, LONG);
  test("selection code is registered: only these files import the pool selectors (each applies selectable() or reads filtered modules)", () => {
    // a new selector must apply selectable() and be added here in a reviewed change
    const ALLOWED = ["frontend/src/curriculum/TeachingContent.tsx", "frontend/src/review/Main.tsx", "packages/learning/src/compiler.ts", "packages/learning/src/exact/verify.ts",
      "packages/learning/src/intervention.ts", "packages/learning/src/library.ts", "packages/learning/src/reasoning.ts", "packages/learning/src/spec.ts"];
    const root = new URL("../../../", import.meta.url).pathname, hits: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const r = `${d}/${e.name}`; if (e.isDirectory()) { if (e.name !== "node_modules") walk(r); } else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && /import \{[^}]*\b(pool|phasePool|variantsOf|modulePhasePool|fromPool)\b[^}]*\} from/.test(readFileSync(join(root, r), "utf8"))) hits.push(r); } };
    for (const d of ["packages/learning/src", "packages/mathematics/src", "frontend/src"]) walk(d);
    expect(hits.sort()).toEqual(ALLOWED);
  }, LONG);
});

describe("no authoritative grade for a quarantined question", () => {
  const id = "gen:adexp:9,8,5,7:w", right = problemOf(id)!.answer;
  test("the app decides nothing, whatever is typed", () => { for (const r of [right, "1", "x"]) { expect(decide(id, r).credit).toBe(null); expect(creditOf(id, r)).toBe(null); } });
  test("the server grader decides nothing", () => expect(gradeRequest({ id, response: right })).toMatchObject({ verification: "held", credit: null }));
  test("existing records: answers to a quarantined question are kept but are never attempts or evidence, however many", () => {
    const at = (n: number) => ({ learnerId: "L", sessionId: "S", at: new Date(Date.UTC(2026, 9, 1, 9, n)).toISOString() });
    const evs = [0, 1, 2, 3, 4].map((n) => make.attempt(at(n), id, right, "transfer"));
    const rr = readRecords("L", evs);
    expect(rr.attempts.filter((a) => a.questionId === id)).toEqual([]);
    expect(rr.unresolved.filter((u) => u.questionId === id).length).toBe(5);
    const st = learnerState("L", evs, Date.UTC(2026, 9, 2), { currentSession: "S2" });
    expect(st.evidence(question(id).competency).status).toBe(learnerState("L", [], Date.UTC(2026, 9, 2), { currentSession: "S2" }).evidence(question(id).competency).status);
  }, LONG);
  test("the three modules that drew a quarantined word form still have their transfer questions", () => { for (const c of ["MATH.algebra.arithmetic-sequences", "MATH.number.thousands", "MATH.number.integer-multiply"]) expect(moduleFor(c)?.transfer.length).toBe(3); });
});
