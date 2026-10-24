/**
 * The Mathematics curriculum dashboard (dashboard@1): mapping integrity against the board releases, coverage against
 * the compiler's output, review state against review.ts, aggregation over unique competencies, mastery that only
 * the shared engine can turn green, and display order that changes nothing underneath.
 */
import assert from "node:assert/strict";
import test from "node:test";
import matrix from "../../../content/learning/coverage-matrix.v1.json";
import { boardReleases } from "../../../packages/learning/src/board-releases";
import { moduleFor, moduleOrigin, modules, questions } from "../../../packages/learning/src/content";
import { boardFor } from "../../../packages/learning/src/curricula";
import { assigned, allOutcomesOf } from "../../../packages/learning/src/curriculum";
import { buildDashboard } from "../../../packages/learning/src/dashboard-build";
import { learnerView } from "../../../packages/learning/src/dashboard-learner";
import { coverageRollup, findNode, masteryOf, masteryRollup, methodRequired, move, ordered, reviewState, scopeOf, scopeOfAll, type DashNode, type LearnerSkill, type Mastery } from "../../../packages/learning/src/dashboard";
import { useReviewFixture } from "../../../packages/learning/src/evidence";
import { FAMILIES } from "../../../packages/learning/src/families";
import { effectiveState, familyItem, itemOf, registry } from "../../../packages/learning/src/review";
import { writtenTasks } from "../../../packages/learning/src/written";
import { Driver, right } from "./driver";

const { index, releases } = buildDashboard();
const byId = new Map(releases.map((r) => [r.release.id, r]));
const T0 = Date.parse("2026-09-01T09:00:00Z");
// every question, generated ones included, treated as released (TEST ONLY)
const fixtureOn = () => useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
const fixtureOff = () => useReviewFixture(null);
const walk = (ns: DashNode[], f: (n: DashNode, parent: DashNode | null) => void, parent: DashNode | null = null) => ns.forEach((n) => (f(n, parent), walk(n.children, f, n)));

test("real counts come from the repository, not constants", () => {
  assert.equal(index.generated.families, [...FAMILIES.values()].filter((d) => d.domain).length);
  assert.equal(index.generated.writtenTasks, writtenTasks.length);
  assert.equal(index.generated.requirements, (matrix as { summary: { requirements: number } }).summary.requirements);
  assert.equal(index.generated.requirements, releases.reduce((n, r) => n + Object.keys(r.outcomes).length, 0), "every outcome of every board release is in the dashboard");
  assert.equal(index.releases.length, boardReleases.length);
  assert.ok(index.releases.every((e) => e.grade >= 1 && e.grade <= 12));
  for (const g of [1, 5, 10, 12]) for (const b of ["cbse", "tn"] as const) assert.ok(index.releases.some((e) => e.board === b && e.grade === g), `${b} grade ${g}`);
});

test("mapping integrity: exactly the release's accepted mappings, the same stable ids, one scope per board", () => {
  for (const rel of boardReleases) {
    const d = byId.get(rel.id)!;
    assert.equal(d.release.hash, rel.hash);
    // every (outcome, competency) the release accepts is placed under that outcome's chapter, and nothing else is
    const want = new Set(assigned(rel).map((a) => `${a.chapter.id}|${a.competency}`));
    const got = new Set<string>();
    for (const ch of d.nodes) for (const c of scopeOf(ch).competencies) got.add(`${ch.id.split(":").at(-1)}|${c}`);
    assert.deepEqual([...got].sort(), [...want].sort(), `${rel.id}: chapter → competency placement`);
    // every outcome appears exactly once in the structure, and its coverage row is the compiler's
    const placed: string[] = [];
    walk(d.nodes, (n) => placed.push(...(n.outcomes ?? [])));
    assert.deepEqual([...placed].sort(), allOutcomesOf(rel).map((o) => o.outcome.id).sort(), `${rel.id}: outcomes`);
    // ids: chapters and sections carry the release id; a competency node is its graph id (shared evidence record)
    walk(d.nodes, (n) => {
      if (n.kind === "chapter" || n.kind === "section") assert.ok(n.id.startsWith(`${n.kind}:${rel.id}:`), n.id);
      if (n.kind === "competency") assert.equal(n.id, `skill:${n.competency}`);
    });
    // board scopes stay separate
    const prefix = rel.id.startsWith("tn-") ? "tn-" : "cbse-";
    assert.ok(Object.keys(d.outcomes).every((o) => o.startsWith(prefix)), `${rel.id}: only its own board's outcomes`);
  }
});

test("coverage per release is the compiler's own count (no new judgement)", () => {
  for (const g of (matrix as unknown as { grades: { release: string; classes: Record<string, number> }[] }).grades) {
    const d = byId.get(g.release);
    if (!d) continue;
    const c = coverageRollup(d, scopeOfAll(d.nodes).outcomes);
    for (const k of ["validated", "awaiting", "partial", "unsupported"] as const) assert.equal(c.counts[k], g.classes[k], `${g.release} ${k}`);
  }
});

test("M: a partially covered outcome stays partial at every level above it", () => {
  const partial = releases.flatMap((d) => Object.values(d.outcomes).filter((o) => o.class === "partial").map((o) => ({ d, o })));
  assert.ok(partial.length > 0, "the repository has partial outcomes");
  for (const { d, o } of partial.slice(0, 40)) {
    walk(d.nodes, (n) => {
      if (n.kind !== "competency" && scopeOf(n).outcomes.includes(o.id)) {
        const c = coverageRollup(d, scopeOf(n).outcomes);
        assert.ok(c.counts.partial >= 1 && c.assessedPct < 100, `${n.id} keeps ${o.id} partial`);
      }
    });
  }
});

test("review state shown is review.ts's effective state (a changed item is draft; nothing is approved by the UI)", () => {
  for (const m of modules) {
    const d = releases.map((r) => r.competencies[m.competency]).find((c) => c?.module);
    if (!d) continue;
    assert.equal(reviewState(registry, itemOf(m.competency), d.module!.hash), effectiveState(registry.entries.find((e) => e.item === itemOf(m.competency)), m));
  }
  const fams = releases.flatMap((r) => Object.values(r.competencies).flatMap((c) => c.families));
  for (const f of fams.slice(0, 300)) assert.equal(reviewState(registry, familyItem(f.id), f.fingerprint), effectiveState(registry.entries.find((e) => e.item === familyItem(f.id))));
  assert.equal(reviewState(registry, "module:nothing", "x"), "missing");
  assert.equal(reviewState({ entries: [{ item: "family:x", state: "approved", contentHash: "old" }] }, "family:x", "new"), "draft", "a changed generator is not approved");
});

test("I: a competency that appears in several places is one record and counts once", () => {
  // Grade 10 (CBSE) Real Numbers places the Euclid skill at chapter level and again inside section 1.2
  const d = byId.get("cbse-ncert-mathematics-grade-10")!;
  const rn = d.nodes.find((n) => n.title === "Real Numbers")!;
  let places = 0;
  walk([rn], (n) => (n.competency === "MATH.number.euclid-algorithm" && n.kind === "competency" ? places++ : 0));
  assert.ok(places >= 2, "appears more than once");
  assert.equal(scopeOf(rn).competencies.filter((c) => c === "MATH.number.euclid-algorithm").length, 1);
  const only = (c: string): Mastery => (c === "MATH.number.euclid-algorithm" ? "verified" : "not_assessed");
  const r = masteryRollup(scopeOf(rn).competencies, only);
  assert.equal(r.counts.verified, 1);
  assert.equal(r.total, new Set(scopeOf(rn).competencies).size);
  // the grade total counts unique competencies across chapters (not a sum of chapter totals, not an average)
  const sum = d.nodes.reduce((n, c) => n + scopeOf(c).competencies.length, 0);
  const unique = scopeOfAll(d.nodes).competencies.length;
  assert.ok(unique <= sum);
  assert.equal(index.releases.find((e) => e.release === d.release.id)!.competencies.length, unique);
  // no averaging: two chapters at 100 % (1 of 1) and 0 % (0 of 3) are 25 % together, not 50 %
  const pct = masteryRollup(["a", "b", "c", "d"], (c) => (c === "a" ? "verified" : "not_assessed")).verifiedPct;
  assert.equal(pct, 25);
});

test("mastery display: green only for verified; awaiting the delayed check and learning are not green; no evidence is not assessed", () => {
  const s = (status: LearnerSkill["status"], extra: Partial<LearnerSkill> = {}): LearnerSkill => ({ status, retention: "none", retentionDueAt: null, attempts: 1, methodMarked: false, methodPending: false, ...extra });
  assert.equal(masteryOf(undefined, false), "not_assessed");
  assert.equal(masteryOf(s("not_started", { attempts: 0 }), false), "not_assessed");
  assert.equal(masteryOf(s("exposure"), false), "learning");
  assert.equal(masteryOf(s("guided"), false), "learning");
  assert.equal(masteryOf(s("independent", { retention: "scheduled" }), false), "pending");
  assert.equal(masteryOf(s("transfer", { retention: "due" }), false), "pending");
  assert.equal(masteryOf(s("review"), false), "review");
  assert.equal(masteryOf(s("verified"), false), "verified");
  // method@1: right final answers never verify an outcome that asks for an educator-marked method
  assert.equal(masteryOf(s("verified"), true), "pending");
  assert.equal(masteryOf(s("verified", { methodMarked: true }), true), "verified");
  assert.equal(masteryRollup([], () => "verified").state, "not_assessed");
  assert.equal(masteryRollup(["a", "b"], (c) => (c === "a" ? "verified" : "pending")).state, "pending", "a chapter is green only when every competency is");
  // releases that ask for proofs mark the competency as method-required
  const g10 = byId.get("cbse-ncert-mathematics-grade-10")!;
  assert.ok(Object.values(g10.outcomes).some((o) => o.method), "Grade 10 has method outcomes (e.g. irrationality proofs)");
  assert.ok(Object.keys(g10.competencies).some((c) => methodRequired(g10, c)));
});

test("E–H through the shared engine: no evidence → not assessed; a lesson → not verified; shown → awaiting; seven full days later → verified", () => {
  const rel = boardFor("cbse", 5)!;
  const d5 = byId.get(rel.id)!;
  // a synthesised module (generated questions from its families), the common case
  const target = scopeOfAll(d5.nodes).competencies.find((c) => moduleOrigin(c) === "synthesised" && moduleFor(c)?.retention.length && !methodRequired(d5, c))!;
  assert.ok(target, "a Grade 5 skill with a module and a delayed check");
  const view = (drv: Driver) => learnerView(drv.learnerId, drv.events, [], drv.now);
  const mastery = (drv: Driver) => (c: string) => masteryOf(view(drv).skillOf(c), methodRequired(d5, c));
  fixtureOn();
  try {
    const drv = new Driver("synthetic-dashboard", T0);
    drv.enrol(5, "2026-27", rel);
    // E: enrolled, no evidence: everything not assessed, 0 verified
    const none = masteryRollup(scopeOfAll(d5.nodes).competencies, mastery(drv));
    assert.equal(none.counts.not_assessed, none.total);
    assert.equal(none.verifiedPct, 0);
    // F: a lesson (a strategy chapter read to its end) is never verification
    drv.events.push({ kind: "learning_record", id: "t1", at: new Date(drv.now).toISOString(), learnerId: drv.learnerId, sessionId: drv.session, record: "teach", competency: target, strategy: moduleFor(target)!.strategies[0].id, rule: "diagnosis" } as never);
    assert.equal(mastery(drv)(target), "learning");
    // G: next day, worked to "shown on your own": awaiting the delayed check, not green (answers in the lesson's own
    // session are not qualifying evidence for the shared engine, so the practice is a later visit)
    drv.newSession(1);
    drv.work(target, right);
    const shown = mastery(drv)(target);
    assert.ok(shown === "pending", `shown → pending (got ${shown})`);
    drv.newSession(6);
    assert.equal(mastery(drv)(target), "pending", "not before seven full days");
    // H: the delayed check after seven full days verifies, and the grade's total moves by exactly one
    drv.newSession(2);
    drv.work(target, right);
    assert.equal(mastery(drv)(target), "verified");
    const after = masteryRollup(scopeOfAll(d5.nodes).competencies, mastery(drv));
    assert.equal(after.counts.verified, 1);
    assert.equal(after.verifiedPct, Math.floor(100 / after.total));
    // every chapter that includes it moves; others do not
    for (const ch of d5.nodes) assert.equal(masteryRollup(scopeOf(ch).competencies, mastery(drv)).counts.verified, scopeOf(ch).competencies.includes(target) ? 1 : 0);
  } finally {
    fixtureOff();
  }
  // on shipped (provisional) content the same records are never green
  const drv = new Driver("synthetic-dashboard-provisional", T0);
  drv.enrol(5, "2026-27", rel);
  drv.work(target, right);
  drv.newSession(8);
  drv.work(target, right);
  assert.notEqual(mastery(drv)(target), "verified");
});

test("B: a Grade 5 learner's goal adds only skills from their own year", () => {
  const rel = boardFor("cbse", 5)!;
  const d5 = byId.get(rel.id)!;
  const drv = new Driver("synthetic-goal", T0);
  drv.enrol(5, "2026-27", rel);
  drv.goal("jee-advanced");
  const v = learnerView(drv.learnerId, drv.events, [], drv.now);
  assert.deepEqual(v.goals.map((g) => g.id), ["jee-advanced"]);
  const own = scopeOfAll(d5.nodes).competencies;
  const f = v.goalFoundations("jee-advanced", 5, own)!;
  assert.ok(f.foundations.length > 0);
  assert.ok(f.foundations.every((c) => own.includes(c)), "nothing from later grades");
  assert.equal(v.enrolment?.grade, 5);
});

test("J: display order is presentation only", () => {
  const d = byId.get("cbse-ncert-mathematics-grade-10")!;
  const before = JSON.stringify(d);
  const ids = d.nodes.map((n) => n.id);
  const order = move(move(ids, ids[3], -1), ids[0], 1);
  const shown = ordered(d.nodes, order);
  assert.deepEqual(shown.map((n) => n.id).sort(), [...ids].sort(), "same tiles");
  assert.notDeepEqual(shown.map((n) => n.id), ids);
  assert.equal(JSON.stringify(d), before, "the release index is unchanged");
  const m = (c: string): Mastery => (c.length % 3 === 0 ? "verified" : "learning");
  assert.deepEqual(masteryRollup(scopeOfAll(shown).competencies, m), masteryRollup(scopeOfAll(d.nodes).competencies, m), "totals unchanged");
  // a saved order never hides a node a curriculum update adds, and ignores ids that are gone
  const extra = [...d.nodes, { id: "chapter:new", kind: "chapter", title: "New", children: [] } as DashNode];
  assert.equal(ordered(extra, [...order, "chapter:gone"]).at(-1)!.id, "chapter:new");
  assert.deepEqual(move(ids, ids[0], -1), ids, "cannot move past the start");
});

test("N: each board and grade has its own structure (no tiles shared between scopes)", () => {
  const a = byId.get("cbse-ncert-mathematics-grade-10")!;
  const b = byId.get(boardFor("tn", 10)!.id)!;
  const ids = (d: typeof a) => {
    const out: string[] = [];
    walk(d.nodes, (n) => (n.kind === "chapter" || n.kind === "section" ? out.push(n.id) : 0));
    return out;
  };
  assert.equal(ids(a).filter((x) => ids(b).includes(x)).length, 0);
  assert.ok(findNode(a.nodes, a.nodes[0].id));
  assert.equal(findNode(b.nodes, a.nodes[0].id), null);
});

test("D: Grade 12 Integrals has nested skills with modules and assessment", () => {
  const d = byId.get("cbse-ncert-mathematics-grade-12")!;
  const ch = d.nodes.find((n) => /^Integrals$/i.test(n.title))!;
  assert.ok(ch, "Integrals chapter");
  const cs = scopeOf(ch).competencies;
  assert.ok(cs.length >= 2);
  assert.ok(ch.children.some((k) => k.kind === "section"), "nested sections");
  assert.ok(cs.some((c) => d.competencies[c].module && d.competencies[c].families.length), "modules and families");
});
