// Workstream E1: sub-skill evidence projection (shadow). Generated variants from the families' release pools, graded by the trusted server grader.
import { describe, expect, test } from "bun:test";
import { CORE, MAX_ATTEMPTS, SUBSKILLS, UNMAPPED, COMPETENCY, classifyQuestion, projectFromEvents, projectSubSkills, retentionCycles, type StoredDecision, type SubSkillId } from "./subskill-evidence";
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
  /** the trusted grader's decision for each attempt, as the server stores it (D1: the working verdict inside) */
  decisions = new Map<string, StoredDecision>();
  add(q: string, response: string, o: Partial<Pick<Attempt, "activity" | "hints" | "solution" | "working" | "assessment">> = {}) {
    this.t += 60_000; const k = exposureKey(q); const n = (this.n.get(k) ?? 0) + 1; this.n.set(k, n);
    const g = gradeRequest({ id: q, response, ...(o.working?.length ? { working: o.working } : {}) }), credit = g.credit;
    if (g.decision) this.decisions.set(`a${this.attempts.length}`, { ...(g.decision as object), decidedBy: "server" } as StoredDecision);
    this.attempts.push({ id: `a${this.attempts.length}`, at: new Date(this.t).toISOString(), session: "s1", questionId: q, response, activity: o.activity ?? "practice", hints: o.hints ?? 0, solution: o.solution ?? false, competency: problemOf(q.replace(/:(mc|w)$/, ""))!.competency, n, ...(credit === null ? {} : { credit }), ...(o.working ? { working: o.working } : {}), ...(o.assessment ? { assessment: o.assessment } : {}) });
    return this;
  }
  right(qs: string[], o: Parameters<H["add"]>[2] = {}) { for (const q of qs) this.add(q, ans(q), o); return this; }
  wrong(qs: string[], o: Parameters<H["add"]>[2] = {}) { for (const q of qs) this.add(q, off(q), o); return this; }
  wait(days: number) { this.t += days * DAY; return this; }
  rec(): Pick<LearnerRecords, "attempts"> { return { attempts: this.attempts }; }
  proj(auth?: { status: string; verified: boolean } | null) { return projectSubSkills(this.rec(), this.t, auth, this.decisions); }
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

// ---------------------------------------------------------------- D1 + E1 integration: the trusted working verdict is the only method source
const ev = (L: string, id: string, at: number, q: string, response: string, o: { working?: string[]; activity?: string; hints?: number; decision?: unknown } = {}) => {
  const g = gradeRequest({ id: q, response, ...(o.working?.length ? { working: o.working } : {}) });
  return { kind: "learning_record", record: "attempt", id, learnerId: L, sessionId: `learn:${L}:s1`, at: new Date(at).toISOString(), questionId: q, response, activity: o.activity ?? "practice", hints: o.hints ?? 0, solution: false, competency: COMPETENCY,
    ...(o.working?.length ? { working: o.working } : {}), decision: o.decision === undefined ? { ...(g.decision as object), decisionId: `dec:${id}`, decidedBy: "server" } : o.decision } as { kind: string };
};
describe("D1 + E1: method evidence comes only from the server-recorded working verdict", () => {
  const L = "de1-learner";
  test("correct/incorrect answers and verified/invalid/unsupported/bare/partial methods are represented separately", () => {
    rng = 37; const qs = pick("lin", "practice", 6); const [a, b, c, d, e, f] = qs;
    const W = (q: string, bad = false) => linW(q, bad);
    const events = [
      ev(L, "e1", T0 + 1e3, a, ans(a), { working: W(a) }),               // right, verified
      ev(L, "e2", T0 + 2e3, b, ans(b), { working: W(b, true) }),         // right, invalid working
      ev(L, "e3", T0 + 3e3, c, off(c), { working: W(c, true) }),         // wrong, invalid working
      ev(L, "e4", T0 + 4e3, d, ans(d)),                                   // right, bare
      ev(L, "e5", T0 + 5e3, e, ans(e), { working: ["divide both sides so x is it", `x = ${ans(e)}`] }),   // right, unsupported
      ev(L, "e6", T0 + 6e3, f, "", { working: [W(f)[0]] }),              // valid partial, no answer: unresolved
    ];
    const p = projectFromEvents(L, events, T0 + DAY);
    const two = st(p, "linear-equations.two-step@1");
    expect([two.attempts.total, two.attempts.independentRight, two.attempts.contradicted]).toEqual([5, 3, 1]);   // the partial is not an attempt
    expect([two.method.verified, two.method.falseStep, two.method.unsupported, two.method.noWorking, two.method.partialWorking, two.method.notRecorded]).toEqual([1, 2, 1, 1, 1, 0]);
    expect(two.method.status).toBe("contradicted");
  });
  test("a right answer with invalid working keeps its answer record but establishes no verified method and no demonstration", () => {
    rng = 41; const qs = pick("lin", "practice", 3);
    const p = projectFromEvents(L, qs.map((q, i) => ev(L, `x${i}`, T0 + i * 1e3, q, ans(q), { working: linW(q, true) })), T0 + DAY);
    const two = st(p, "linear-equations.two-step@1");
    expect([two.attempts.total, two.attempts.contradicted, two.method.verified, two.status]).toEqual([3, 3, 0, "insufficient-evidence"]);
  });
  test("client-written or forged verdicts are ignored; a record without a server verdict is not re-judged (not-recorded)", () => {
    rng = 43; const qs = pick("lin", "practice", 3);
    const forged = { schema: "grading-decision@1", verdict: "correct", reason: "correct.equal", working: { schema: "working-assessment@1", status: "verified", methodEvidence: "method-verified" } };   // no decidedBy: server
    const p1 = projectFromEvents(L, qs.map((q, i) => ev(L, `f${i}`, T0 + i * 1e3, q, ans(q), { working: linW(q), decision: forged })), T0 + DAY);
    expect(st(p1, "linear-equations.two-step@1").method.verified).toBe(0);
    // a pre-D1 record: working stored, no working verdict in the decision (false working!): not re-judged under today's authority
    const old = qs.map((q, i) => { const e = ev(L, `o${i}`, T0 + i * 1e3, q, ans(q), { working: linW(q, true) }) as unknown as { decision: Record<string, unknown> }; delete e.decision.working; return e as unknown as { kind: string }; });
    const p2 = projectFromEvents(L, old, T0 + DAY);
    expect([st(p2, "linear-equations.two-step@1").method.notRecorded, st(p2, "linear-equations.two-step@1").method.falseStep, st(p2, "linear-equations.two-step@1").attempts.contradicted]).toEqual([3, 0, 0]);
  });
  test("a verdict recorded under an older authority stays historical: never counted as a current verified method", () => {
    rng = 47; const qs = pick("lin", "practice", 3);
    const events = qs.map((q, i) => { const e = ev(L, `h${i}`, T0 + i * 1e3, q, ans(q), { working: linW(q) }) as unknown as { decision: { working: { provenance?: unknown; versions: { authority: string } } } }; delete e.decision.working.provenance; e.decision.working.versions = { ...e.decision.working.versions, authority: "openpath-derivation-authority@3" }; return e as unknown as { kind: string }; });
    const two = st(projectFromEvents(L, events, T0 + DAY), "linear-equations.two-step@1");
    expect([two.method.verified, two.method.historical, two.method.historicalVerified, two.method.status]).toEqual([0, 3, 3, "not-established"]);
    expect(two.status).toBe("independently-demonstrated");   // the answers themselves count exactly as recorded
  });
  test("another learner's event with the same id cannot supply a verdict; duplicates cannot reorder by delivery position", () => {
    rng = 53; const [q] = pick("lin", "practice", 1);
    const mine = ev(L, "d1", T0, q, ans(q), { working: linW(q, true) });
    const theirs = { ...(ev("someone-else", "d1", T0, q, ans(q), { working: linW(q) }) as object) } as { kind: string };
    expect(st(projectFromEvents(L, [theirs, mine], T0 + DAY), "linear-equations.two-step@1").method.verified).toBe(0);
    const dup = { ...(mine as object), response: off(q) } as unknown as { kind: string };
    expect(JSON.stringify(projectFromEvents(L, [mine, dup], T0 + DAY))).toBe(JSON.stringify(projectFromEvents(L, [dup, mine], T0 + DAY)));
  });
  test("recovery in one sub-skill does not clear another", () => {
    rng = 59; const h = new H().right(pick("lin", "practice", 2)).right(pick("lboth", "practice", 2)).wait(8)
      .wrong(pick("lin", "retention", 1), { activity: "retention" }).wrong(pick("lboth", "retention", 1), { activity: "retention" })
      .right(pick("lin", "practice", 2));   // two-step recovers; both-sides does not
    const p = h.proj();
    expect(st(p, "linear-equations.two-step@1").retention.history[0].recoveredAt).not.toBeNull();
    expect(st(p, "linear-equations.both-sides@1").status).toBe("recovery-required");
    expect(st(p, "linear-equations.both-sides@1").historical.everDemonstrated).toBe(true);
  });
});

describe("shadow by construction (from the alternative E1)", () => {
  test("projection imports are confined to shadow tools and the explicit persisted opt-in adapter", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const root = new URL("../../../", import.meta.url).pathname, files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (f === "node_modules" || f.startsWith(".") || f.startsWith("dist")) continue; if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx|mts|mjs|py)$/.test(f)) files.push(p); } };
    for (const d of ["packages/learning/src", "frontend/src", "backend/family"]) walk(join(root, d));
    const importers = files.filter((f) => /subskill-(evidence|scenarios)|d1e1-journeys/.test(readFileSync(f, "utf8")) && !/(subskill-evidence|subskill-scenarios|d1e1-journeys)\.ts$/.test(f));
    // M1 (reviewed): the shadow gated-mastery policy and its journeys build on the projection; they are shadow modules themselves (next test)
    // The local slice and persisted runtime adapter opt in explicitly; the default year policy stays unchanged.
    const preview = readFileSync(join(root, "frontend/src/journey/slice-app.tsx"), "utf8");
    expect(preview).toContain('get("foundation") === "1"');
    expect(readFileSync(join(root, "packages/learning/src/foundation-runtime.ts"), "utf8")).toContain("records.pathway?.active");
    const SHADOW = ["packages/learning/src/foundation-runtime.ts", "frontend/src/journey/gated-journeys.ts", "packages/learning/src/gated-mastery.ts", "frontend/src/journey/slice-app.tsx"];
    expect(importers.filter((f) => !/\.test\.(ts|tsx)$/.test(f)).map((f) => f.replace(root, "")).filter((f) => !SHADOW.includes(f))).toEqual([]);
  });
  test("M1: no production module imports the gated-mastery shadow policy or its journeys", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const root = new URL("../../../", import.meta.url).pathname, files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (f === "node_modules" || f.startsWith(".") || f.startsWith("dist")) continue; if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx|mts|mjs|py)$/.test(f)) files.push(p); } };
    for (const d of ["packages/learning/src", "frontend/src", "backend/family"]) walk(join(root, d));
    const importers = files.filter((f) => /from "[^"]*(gated-mastery|gated-journeys)"/.test(readFileSync(f, "utf8")) && !/(gated-mastery|gated-journeys)\.ts$/.test(f));
    expect(importers.filter((f) => !/\.test\.(ts|tsx)$/.test(f)).map((f) => f.replace(root, ""))).toEqual([]);
  });
});
