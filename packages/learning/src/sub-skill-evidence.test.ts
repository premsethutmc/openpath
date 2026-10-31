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
    expect([two.method.verified, two.method.invalid, two.method["no-working"], two.method.unsupported, two.method.correctWithInvalidMethod, two.method.correctWithVerifiedMethod]).toEqual([1, 1, 1, 1, 1, 1]);
    // both sides: wrong answer through invalid working
    expect([both.answers.independentWrong, both.method.invalid, both.method.correctWithInvalidMethod, both.status]).toEqual([1, 1, 0, "exposure"]);
    // brackets: one alone (verified), one with a hint (assisted, verified method): assisted performance never counts as independent
    expect(br.answers).toEqual({ independentRight: 1, independentWrong: 0, assistedRight: 1, assistedWrong: 0 });
    expect([br.method.verified, br.status]).toEqual([2, "emerging"]);
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

describe("non-authoritative by construction", () => {
  test("no production module imports the projection", () => {
    const root = new URL("../../../", import.meta.url).pathname;
    const files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (f === "node_modules" || f.startsWith(".") || f.startsWith("dist")) continue; if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx|mts|mjs)$/.test(f)) files.push(p); } };
    walk(join(root, "packages/learning/src")); walk(join(root, "frontend/src")); walk(join(root, "backend/family"));
    const importers = files.filter((f) => /sub-skill-evidence/.test(readFileSync(f, "utf8")) && !/sub-skill-evidence\.ts$/.test(f));
    const allowed = (f: string) => /\.test\.(ts|tsx)$/.test(f) || /frontend\/src\/journey\/sub-skill-journeys\.ts$/.test(f);
    expect(importers.filter((f) => !allowed(f)).map((f) => f.replace(root, ""))).toEqual([]);
  });
});
