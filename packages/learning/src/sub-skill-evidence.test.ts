// E1: the sub-skill projection (non-authoritative). Method categories from real D1 trusted-grader decisions, determinism, replay, and that
// nothing in production reads it.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { subSkillProjection, subSkillOf, SUB_SKILL_EVIDENCE } from "./sub-skill-evidence.ts";
import { learnerState } from "./session.ts";

const fx = JSON.parse(readFileSync(new URL("./fixtures/d1-working-decisions.json", import.meta.url), "utf8")) as { events: { kind: string; learnerId: string; at: string; id: string }[] };
const L = fx.events[0].learnerId;
const now = Date.parse(fx.events.at(-1)!.at) + 60_000;
const sub = (p: ReturnType<typeof subSkillProjection>, id: string) => p.subSkills.find((s) => s.id === id)!;

describe("sub-skill projection from stored events", () => {
  test("is labelled non-authoritative", () => {
    const p = subSkillProjection(L, fx.events, now);
    expect([p.schema, p.authoritative]).toEqual([SUB_SKILL_EVIDENCE, false]);
  });
  test("families map to sub-skills; nothing is inferred from text", () => {
    expect(["gen:lin:2,17,11", "gen:lin:7,9,11:mc", "gen:lboth:9,7,8,2", "gen:lbrk:5,-4,2,1", "gen:auleq:1,2,9,10", "gen:aulwp:1,5,2,9:w", "gen:ahone:1,6,7"].map(subSkillOf))
      .toEqual(["two-step", "two-step", "variables-both-sides", "brackets", "forming-equations", "forming-equations", "one-step"]);
    expect(subSkillOf("eq-d1")).toBeNull();
  });
  test("D1 trusted working verdicts are kept apart from answers: correct, verified, invalid, unsupported, assisted", () => {
    const p = subSkillProjection(L, fx.events, now);
    const two = sub(p, "two-step"), both = sub(p, "variables-both-sides"), br = sub(p, "brackets");
    // two-step: four answers right alone; methods: one verified, one invalid (with a right answer), one bare, one unsupported
    expect(two.answers).toEqual({ independentRight: 4, independentWrong: 0, assistedRight: 0, assistedWrong: 0 });
    expect([two.method.verified, two.method.invalid, two.method["no-working"], two.method.unsupported]).toEqual([1, 1, 1, 1]);
    expect(two.alone).toEqual({ correctWithVerifiedMethod: 1, correctWithInvalidMethod: 1, verified: 1, invalid: 1 });
    // both sides: wrong answer through invalid working
    expect([both.answers.independentWrong, both.method.invalid, both.alone.correctWithInvalidMethod, both.status]).toEqual([1, 1, 0, "exposure"]);
    // brackets: one alone (verified), one with a hint (assisted, verified method): assisted performance never counts as independent
    expect(br.answers).toEqual({ independentRight: 1, independentWrong: 0, assistedRight: 1, assistedWrong: 0 });
    expect([br.method.verified, br.alone.verified, br.alone.correctWithVerifiedMethod, br.status]).toEqual([2, 1, 1, "emerging"]);
  });
  test("working without a trusted verdict is never verified; a malformed verdict is not verified", () => {
    const stripped = fx.events.map((e) => { const { decision, ...rest } = e as { decision?: unknown }; return rest as typeof e; });
    const p = subSkillProjection(L, stripped, now);
    for (const s of p.subSkills) { expect(s.method.verified).toBe(0); expect(s.method.invalid).toBe(0); }
    expect(sub(p, "two-step").method.unverified).toBe(3);         // three answers carried working the learner wrote; none was judged here
    const forged = fx.events.map((e) => { const d = (e as { decision?: { working?: object } }).decision; return d?.working ? { ...e, decision: { ...d, working: { ...d.working, status: "verified", methodEvidence: "method-false-step" } } } : e; });
    expect(subSkillProjection(L, forged, now).subSkills.every((s) => s.method.verified === 0)).toBe(true);
  });
  test("deterministic and replayable: same digest from shuffled and from JSON-round-tripped events", () => {
    const a = subSkillProjection(L, fx.events, now);
    const b = subSkillProjection(L, [...fx.events].reverse(), now);
    const c = subSkillProjection(L, JSON.parse(JSON.stringify(fx.events)), now);
    expect(b.digest).toBe(a.digest);
    expect(c.digest).toBe(a.digest);
    expect(subSkillProjection(L, fx.events, now + 1).digest).not.toBe(a.digest);   // the time is part of what is projected
  });
  test("computing the projection changes no production evidence", () => {
    const before = JSON.stringify(learnerState(L, fx.events, now).evidence("MATH.algebra.linear-equations"));
    subSkillProjection(L, fx.events, now);
    expect(JSON.stringify(learnerState(L, fx.events, now).evidence("MATH.algebra.linear-equations"))).toBe(before);
  });
});

// synthetic stored events built from a real stored attempt (only id, time, question, activity and the server's verdict change)
const base = fx.events.find((e) => (e as { record?: string }).record === "attempt")! as unknown as Record<string, unknown> & { decision: Record<string, unknown> };
const DAYMS = 86_400_000, T = Date.parse("2026-10-01T09:00:00Z");
const mk = (id: string, q: string, day: number, activity: string, verdict: "correct" | "incorrect", extra: Record<string, unknown> = {}) =>
  ({ ...base, id, questionId: q, at: new Date(T + day * DAYMS + Number(id.replace(/\D/g, "") || 0) * 1000).toISOString(), activity, hints: 0, response: "x", working: undefined, decision: { ...base.decision, verdict, working: undefined, questionId: q }, ...extra }) as unknown as { kind: string };

describe("review fixes (independent review)", () => {
  test("a failed delayed check, not yet recovered, is review (as production), and the first success is kept", () => {
    const ev = [mk("a1", "gen:lin:3,3,2", 0, "practice", "correct"), mk("a2", "gen:lin:2,17,11", 0, "practice", "correct"), mk("a3", "gen:lin:6,17,2", 8, "retention", "incorrect")];
    const p = subSkillProjection(L, ev, T + 9 * DAYMS);
    const two = sub(p, "two-step");
    expect([two.status, two.retention, two.firstShownAt !== null, two.retentionHistory.map((h) => h.result)]).toEqual(["review", "failed", true, ["failed"]]);
    expect(p.competencies[0].production.status).toBe("review");
  });
  test("passing a delayed check needs production's number of distinct answers; brackets and both-sides are never in the module's check", () => {
    const ev = [mk("a1", "gen:lin:3,3,2", 0, "practice", "correct"), mk("a2", "gen:lin:2,17,11", 0, "practice", "correct"), mk("a3", "gen:lin:6,17,2", 8, "retention", "correct"),
      mk("b1", "gen:lbrk:5,-4,2,1", 0, "practice", "correct"), mk("b2", "gen:lbrk:4,4,2,2", 0, "practice", "correct")];
    const p = subSkillProjection(L, ev, T + 9 * DAYMS);
    expect([sub(p, "two-step").checkNeeds, sub(p, "two-step").retention]).toEqual([1, "passed"]);   // the module's check holds one lin question
    expect([sub(p, "brackets").checkNeeds, sub(p, "brackets").retention, sub(p, "brackets").status]).toEqual([0, "not-in-delayed-check", "shown"]);
    expect(p.competencies.find((c) => c.competency === "MATH.algebra.linear-equations")!.notInDelayedCheck).toEqual(["variables-both-sides", "brackets"]);
  });
  test("probes are not evidence for the sub-skill (production rule)", () => {
    const p = subSkillProjection(L, [mk("a1", "gen:lin:3,3,2", 0, "probe", "correct"), mk("a2", "gen:lin:2,17,11", 0, "probe", "correct")], T + DAYMS);
    expect([sub(p, "two-step").status, sub(p, "two-step").answers.independentRight]).toEqual(["exposure", 0]);
  });
  test("a decision the server did not record, or another learner's event, never supplies a method verdict", () => {
    const verified = { schema: "working-assessment@1", status: "verified", methodEvidence: "method-verified" };
    const own = mk("a1", "gen:lin:3,3,2", 0, "practice", "correct") as unknown as Record<string, unknown> & { decision: Record<string, unknown> };
    const clientMade = { ...own, decision: { working: verified } };
    expect(sub(subSkillProjection(L, [clientMade as never], T + DAYMS), "two-step").method.verified).toBe(0);
    const foreign = { ...own, learnerId: "someone-else", decision: { ...own.decision, working: verified } };
    const p = subSkillProjection(L, [own as never, foreign as never], T + DAYMS);
    expect(sub(p, "two-step").method.verified).toBe(0);
  });
  test("ties and duplicates cannot reorder by input position", () => {
    const a = mk("a1", "gen:lin:3,3,2", 0, "practice", "correct"), b = { ...(a as object), response: "y", decision: { ...(a as unknown as { decision: object }).decision, verdict: "incorrect" } } as never;
    const many = [...fx.events, a, b, mk("a2", "gen:lin:2,17,11", 0, "practice", "correct")];
    const d0 = subSkillProjection(L, many, now).digest;
    let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;   // seeded: the test itself is deterministic
    for (let k = 0; k < 20; k++) { const sh = [...many].map((e) => ({ e, r: rnd() })).sort((x, y) => x.r - y.r).map((x) => x.e); expect(subSkillProjection(L, sh, now).digest).toBe(d0); }
  });
});

describe("non-authoritative by construction", () => {
  test("no production module imports the projection", () => {
    const root = new URL("../../../", import.meta.url).pathname;
    const files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (f === "node_modules" || f.startsWith(".") || f.startsWith("dist")) continue; if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx|mts|mjs)$/.test(f)) files.push(p); } };
    walk(join(root, "packages/learning/src")); walk(join(root, "frontend/src")); walk(join(root, "backend/family"));
    const importers = files.filter((f) => /sub-skill-(evidence|journeys)/.test(readFileSync(f, "utf8")) && !/sub-skill-evidence\.ts$/.test(f) && !/sub-skill-journeys\.ts$/.test(f));
    const allowed = (f: string) => /\.test\.(ts|tsx)$/.test(f);
    expect(importers.filter((f) => !allowed(f)).map((f) => f.replace(root, ""))).toEqual([]);
  });
});
