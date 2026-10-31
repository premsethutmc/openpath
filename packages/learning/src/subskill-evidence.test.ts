// Workstream E1: sub-skill evidence projection (shadow). Generated variants from the families' release pools, graded by the trusted server grader.
import { describe, expect, test } from "bun:test";
import { CORE, MAX_ATTEMPTS, SUBSKILLS, UNMAPPED, COMPETENCY, classifyQuestion, projectFromEvents, projectSubSkills, retentionCycles, type SubSkillId } from "./subskill-evidence";
import { FAMILIES, exposureKey, phasePool, problemOf, type Phase } from "./families";
import { DAY, INDEPENDENT_MIN, skillEvidence } from "./evidence";
import { gradeRequest } from "./server-grader";
import type { Attempt, LearnerRecords } from "./records";

const T0 = Date.parse("2026-03-02T09:00:00Z");
let rng = 1;
const rand = () => { rng = (rng * 1103515245 + 12345) % 2147483648; return rng / 2147483648; };
const typed = (f: string, ph: Phase) => phasePool(f, ph).filter((q) => !q.endsWith(":mc") && !q.endsWith(":w"));
const pick = (f: string, ph: Phase, k: number) => { const all = typed(f, ph); const s = Math.floor(rand() * all.length); return Array.from({ length: k }, (_, i) => all[(s + i * 17) % all.length]).filter((q, i, a) => a.indexOf(q) === i); };
const ans = (q: string) => problemOf(q.replace(/:(mc|w)$/, ""))!.answer;
const off = (q: string) => String(Number(ans(q)) + 1);
class H {
  attempts: Attempt[] = []; t = T0; private n = new Map<string, number>();
  add(q: string, response: string, o: Partial<Pick<Attempt, "activity" | "hints" | "solution" | "working" | "assessment">> = {}) {
    this.t += 60_000; const k = exposureKey(q); const n = (this.n.get(k) ?? 0) + 1; this.n.set(k, n);
    const credit = gradeRequest({ id: q, response }).credit;
    this.attempts.push({ id: `a${this.attempts.length}`, at: new Date(this.t).toISOString(), session: "s1", questionId: q, response, activity: o.activity ?? "practice", hints: o.hints ?? 0, solution: o.solution ?? false, competency: problemOf(q.replace(/:(mc|w)$/, ""))!.competency, n, ...(credit === null ? {} : { credit }), ...(o.working ? { working: o.working } : {}), ...(o.assessment ? { assessment: o.assessment } : {}) });
    return this;
  }
  right(qs: string[], o: Parameters<H["add"]>[2] = {}) { for (const q of qs) this.add(q, ans(q), o); return this; }
  wrong(qs: string[], o: Parameters<H["add"]>[2] = {}) { for (const q of qs) this.add(q, off(q), o); return this; }
  wait(days: number) { this.t += days * DAY; return this; }
  rec(): Pick<LearnerRecords, "attempts"> { return { attempts: this.attempts }; }
  proj(auth?: { status: string; verified: boolean } | null) { return projectSubSkills(this.rec(), this.t, auth); }
}
const st = (p: ReturnType<H["proj"]>, id: SubSkillId) => p.subSkills.find((s) => s.id === id)!;
const FAM: Record<SubSkillId, string> = { "linear-equations.one-step@1": "ahone", "linear-equations.two-step@1": "lin", "linear-equations.both-sides@1": "lboth", "linear-equations.brackets@1": "lbrk", "linear-equations.modelling@1": "auleq" };
const linW = (q: string, bad = false) => { const [a, b, x] = problemOf(q)!.params; const c = a * x + b; return [`${a}x = ${bad ? c + b : c - b}`, `x = ${x}`]; };
const SEEDS = [1, 7, 19, 42, 101];

describe("mapping (linear-equations-subskills@1)", () => {
  test("every family of the competency is mapped or explicitly unmapped; ids are stable and versioned", () => {
    const fams = [...FAMILIES.values()].filter((d) => d.competency === COMPETENCY).map((d) => d.id);
    for (const f of fams) expect(SUBSKILLS.some((s) => s.families.includes(f)) || f in UNMAPPED).toBe(true);
    for (const s of SUBSKILLS) { expect(s.id).toMatch(/^linear-equations\.[a-z-]+@1$/); for (const f of s.families) expect(FAMILIES.has(f)).toBe(true); }
    expect(new Set(SUBSKILLS.flatMap((s) => s.families)).size).toBe(SUBSKILLS.flatMap((s) => s.families).length);
  });
  test("the sub-skill comes from the generator id only, never from text; unreadable ids are unknown", () => {
    for (const s of SUBSKILLS) for (const f of s.families) for (const q of phasePool(f, "practice").slice(0, 20)) { const c = classifyQuestion(q); expect(c.kind === "mapped" && c.subSkill.id).toBe(s.id); }
    for (const q of ["Solve 2x + 5 = 17", "lin-7", "gen:lin", "gen:lin:a,b", "gen:nofamily:1,2", 42, null, "gen:meet:3,0"]) expect(classifyQuestion(q).kind).toBe("unknown");
    expect((classifyQuestion("gen:meet:3,0") as { reason: string }).reason).toBe("unmapped-family");
  });
});

describe("retention@2 is reused, not re-invented", () => {
  test("scoped cycles equal evidence.ts skillEvidence on the whole competency (generated histories)", () => {
    for (const seed of SEEDS) {
      rng = seed; const h = new H();
      for (let r = 0; r < 6; r++) {
        const f = ["lin", "lboth", "lbrk", "auleq"][Math.floor(rand() * 4)];
        if (rand() < 0.7) h.right(pick(f, "practice", 1)); else h.wrong(pick(f, "practice", 1));
        if (rand() < 0.3) { h.wait(8); const q = pick("lin", "retention", 2); if (rand() < 0.5) h.right(q, { activity: "retention" }); else h.wrong(q.slice(0, 1), { activity: "retention" }); }
      }
      const recs = { ...h.rec(), teaching: [] } as unknown as LearnerRecords;
      const se = skillEvidence(COMPETENCY, recs, "unavailable", h.t);
      const ind = h.attempts.filter((a) => a.n === 1 && a.hints === 0 && !a.solution && a.activity !== "guided" && a.activity !== "probe");
      const mine = retentionCycles(ind, se.independentAt, 2, h.t);
      expect(mine.history).toEqual(se.retentionHistory);
      expect(mine.retention).toBe(se.retention);
    }
  });
});

describe("no cross-sub-skill leakage (generated variants, several seeds)", () => {
  test("repeated one-step success does not verify two-step", () => { for (const s of SEEDS) { rng = s; const p = new H().right(pick("ahone", "practice", 6)).proj(); expect(st(p, "linear-equations.one-step@1").status).toBe("independently-demonstrated"); expect(st(p, "linear-equations.two-step@1").status).toBe("not-attempted"); } });
  test("repeated two-step success verifies neither both-sides nor brackets", () => { for (const s of SEEDS) { rng = s; const p = new H().right(pick("lin", "practice", 8)).proj(); expect(st(p, "linear-equations.two-step@1").status).toBe("independently-demonstrated"); expect(st(p, "linear-equations.both-sides@1").status).toBe("not-attempted"); expect(st(p, "linear-equations.brackets@1").status).toBe("not-attempted"); } });
  test("success in any one family verifies only that family's sub-skill", () => {
    for (const s of SEEDS) for (const [id, f] of Object.entries(FAM) as [SubSkillId, string][]) {
      rng = s; const p = new H().right(pick(f, "practice", 5)).proj();
      for (const x of p.subSkills) expect(x.status === "independently-demonstrated").toBe(x.id === id);
    }
  });
  test("a bracket success is only listed as supporting the one-step prerequisite (explicit graph edge), never verifying it", () => {
    rng = 3; const p = new H().right(pick("lbrk", "practice", 3)).proj();
    const one = st(p, "linear-equations.one-step@1");
    expect(one.status).toBe("not-attempted"); expect(one.prerequisiteSupport.map((x) => x.from)).toEqual(["linear-equations.brackets@1"]);
    for (const id of CORE) expect(st(p, id).prerequisiteSupport).toEqual([]);
  });
});

describe("method, assistance and client claims", () => {
  test("a correct answer with invalid working cannot establish the method, and is contradictory evidence", () => {
    for (const s of SEEDS) { rng = s; const h = new H(); for (const q of pick("lin", "practice", 3)) h.add(q, ans(q), { working: linW(q, true) }); const x = st(h.proj(), "linear-equations.two-step@1");
      expect(x.method.status).toBe("contradicted"); expect(x.attempts.contradicted).toBe(3); expect(x.status).not.toBe("independently-demonstrated"); }
  });
  test("valid working is a verified method; a bare answer is not", () => {
    rng = 5; const h = new H(); for (const q of pick("lin", "practice", 3)) h.add(q, ans(q), { working: linW(q) });
    expect(st(h.proj(), "linear-equations.two-step@1").method.status).toBe("verified");
    const b = new H(); for (const q of pick("lin", "practice", 3)) b.add(q, ans(q), { working: [`x = ${ans(q)}`] });
    const x = st(b.proj(), "linear-equations.two-step@1"); expect(x.method.status).toBe("not-established"); expect(x.method.noMethodEvidence).toBe(3);
  });
  test("unsupported working is never false-step evidence", () => {
    rng = 9; const h = new H(); for (const q of pick("lin", "practice", 3)) { const [a, b, x] = problemOf(q)!.params; h.add(q, ans(q), { working: [`${a}x + ${b} - ${b} = ${a * x + b} - ${b}`, `x = ${x}`] }); }
    const x = st(h.proj(), "linear-equations.two-step@1"); expect(x.method.falseStep).toBe(0); expect(x.attempts.contradicted).toBe(0); expect(x.status).toBe("independently-demonstrated");
  });
  test("a client claim of a verified derivation establishes nothing", () => {
    rng = 11; const h = new H(); for (const q of pick("lin", "practice", 3)) h.add(q, ans(q), { assessment: { policy: "assessment@1", answerCorrect: true, methodExamined: true, derivationVerified: true, firstError: null, clarificationRequired: false, aiFallbackUsed: false, unresolved: false, source: "client" } as never });
    expect(st(h.proj(), "linear-equations.two-step@1").method.status).toBe("not-established");
  });
  test("assisted success never establishes independent demonstration", () => {
    for (const s of SEEDS) { rng = s; const p = new H().right(pick("lbrk", "practice", 6), { hints: 1 }).right(pick("lbrk", "practice", 3), { activity: "guided" }).proj(); const x = st(p, "linear-equations.brackets@1");
      expect(x.status).toBe("insufficient-evidence"); expect(x.attempts.independent).toBe(0); expect(x.attempts.assistedRight).toBeGreaterThan(0); }
  });
});

describe("retention and recovery", () => {
  test("a failed delayed check changes the sub-skill's current status, keeps its history, and leaves other sub-skills alone", () => {
    rng = 13; const h = new H().right(pick("lin", "practice", 2)).right(pick("lboth", "practice", 2)).wait(8).wrong(pick("lin", "retention", 1), { activity: "retention" });
    const p = h.proj(), two = st(p, "linear-equations.two-step@1"), both = st(p, "linear-equations.both-sides@1");
    expect(two.status).toBe("recovery-required"); expect(two.historical.everDemonstrated).toBe(true); expect(two.retention.history.at(-1)!.result).toBe("failed");
    expect(both.status).toBe("retention-due"); expect(both.historical.everDemonstrated).toBe(true);
    h.right(pick("lin", "practice", 2).map((q) => q)); // recovery: two fresh right answers alone
    const after = st(h.proj(), "linear-equations.two-step@1"); expect(after.retention.history[0].recoveredAt).not.toBeNull(); expect(after.retention.history[0].result).toBe("failed");
  });
  test("the module's delayed check samples two-step and modelling only (the gap is reported, not filled)", () => {
    const p = new H().proj(); const sampled = (id: SubSkillId) => st(p, id).retention.sampledByModuleCheck;
    expect(sampled("linear-equations.two-step@1")).toBe(true); expect(sampled("linear-equations.modelling@1")).toBe(true);
    expect(sampled("linear-equations.both-sides@1")).toBe(false); expect(sampled("linear-equations.brackets@1")).toBe(false);
  });
});

describe("discrepancies, determinism and safety", () => {
  test("a broad authoritative claim beyond the sub-skill evidence is exposed, not changed", () => {
    rng = 17; const p = new H().right(pick("lin", "practice", 3)).proj({ status: "independent", verified: false });
    expect(p.discrepancies.length).toBe(1); expect(p.discrepancies[0].unsupported.map((u) => u.id).sort()).toEqual(["linear-equations.both-sides@1", "linear-equations.brackets@1"]);
    expect(p.authoritative).toBe(false);
  });
  test("order of the stored records does not change the projection; the input is not mutated", () => {
    for (const s of SEEDS) { rng = s; const h = new H().right(pick("lin", "practice", 3)).wrong(pick("lboth", "practice", 2)).right(pick("lbrk", "check", 2), { activity: "check" });
      const before = JSON.stringify(h.attempts); const a = JSON.stringify(h.proj()); const rev = projectSubSkills({ attempts: [...h.attempts].reverse() }, h.t);
      expect(JSON.stringify(rev)).toBe(a); expect(JSON.stringify(h.attempts)).toBe(before); }
  });
  test("bounded and fails safe on malformed or unknown metadata", () => {
    const big = { attempts: Array.from({ length: MAX_ATTEMPTS + 1 }, () => ({}) as Attempt) };
    const r = projectSubSkills(big, T0); expect(r.outcome).toBe("resource-limit"); expect(r.subSkills).toEqual([]);
    const bad = projectSubSkills({ attempts: [null, { id: "x" }, { id: "y", at: "not a date", questionId: "gen:lin:2,3,4", activity: "practice", hints: 0, n: 1 }] as unknown as Attempt[] }, T0);
    expect(bad.rejected.length).toBe(3); expect(bad.subSkills.every((s) => s.status === "not-attempted")).toBe(true);
    expect(projectSubSkills(undefined as never, T0).subSkills.every((s) => s.status === "not-attempted")).toBe(true);
  });
});

describe("independent review fixes (E1 review round 1)", () => {
  test("an id the generator would never produce is unknown (parameters outside the family, a format it lacks)", () => {
    expect(classifyQuestion("gen:lin:1,1,1")).toMatchObject({ kind: "unknown", reason: "malformed-question-id" });
    const ok = typed("lin", "practice")[0]; expect(classifyQuestion(`${ok}:w`)).toMatchObject({ kind: "unknown" });
    const cred = (q: string): Attempt => ({ id: q, at: new Date(T0).toISOString(), session: "s", questionId: q, response: "1", activity: "practice", hints: 0, solution: false, competency: COMPETENCY, n: 1, credit: true });
    const p = projectSubSkills({ attempts: [cred("gen:lin:1,1,1"), { ...cred("gen:lin:1,1,2"), at: new Date(T0 + 60_000).toISOString() }] }, T0 + DAY);
    expect(st(p, "linear-equations.two-step@1").status).toBe("not-attempted"); expect(p.unknown.count).toBe(2);
  });
  test("a contradicted answer is neutral: it neither credits nor fails a delayed check", () => {
    rng = 23; const h = new H().right(pick("lin", "practice", 2)).wait(8);
    const q = pick("lin", "retention", 1)[0]; h.add(q, ans(q), { activity: "retention", working: linW(q, true) });
    const x = st(h.proj(), "linear-equations.two-step@1"); expect(x.retention.state).not.toBe("failed"); expect(x.status).not.toBe("recovery-required"); expect(x.method.status).toBe("contradicted");
  });
  test("a sub-skill the module's delayed check never samples keeps the competency's bar (two answers), never one", () => {
    rng = 29; const h = new H().right(pick("lboth", "practice", 2)).wait(8).right(pick("lboth", "retention", 1), { activity: "retention" });
    const x = st(h.proj(), "linear-equations.both-sides@1"); expect(x.retention.need).toBe(2); expect(x.retention.state).toBe("due");
  });
  test("time order is by instant, not by text (a timestamp with an offset)", () => {
    rng = 31; const h = new H().right(pick("lin", "practice", 2)); const due = Date.parse(h.attempts[1].at) + 7 * DAY;
    const q = pick("lin", "retention", 1)[0];
    h.attempts.push({ id: "early", at: new Date(due - 3600_000).toISOString().replace("Z", "+00:00").replace(/T(\d\d)/, (_m, hh) => `T${hh}`), session: "s", questionId: q, response: ans(q), activity: "retention", hints: 0, solution: false, competency: COMPETENCY, n: 1, credit: true });
    const early = new Date(due - 3600_000); const shifted = new Date(early.getTime() + 5.5 * 3600_000).toISOString().replace("Z", "+05:30").replace(/\.\d+/, "");
    h.attempts[h.attempts.length - 1].at = shifted;   // the same instant written in +05:30: one hour BEFORE the check is due
    const x = st(projectSubSkills(h.rec(), due + DAY), "linear-equations.two-step@1"); expect(x.retention.state).not.toBe("passed");
  });
  test("events the existing reader cannot read fail safe (nothing projected)", () => {
    const p = projectFromEvents("L", [{ kind: "learning_record", record: "attempt", id: "x", learnerId: "L", sessionId: "s", at: new Date(T0).toISOString(), questionId: 7, response: "1", activity: "practice", hints: 0, solution: false, competency: COMPETENCY } as never], T0);
    expect(["unreadable-events", "projected"]).toContain(p.outcome); expect(p.subSkills.every((s) => s.status === "not-attempted")).toBe(true);
  });
});
