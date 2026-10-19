/**
 * The shared learning engine behind My Learning Year: content keys, curriculum synthesis, the graph, diagnostics,
 * strategy choice, recovery, evidence and status, tiles, goals, decomposition and year transitions. Synthetic learners
 * only. These test what the program does; they are not evidence of learning gains.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonical, isCorrect, misconceptionOf, moduleFor, modules, problems, question, questions } from "../../../packages/learning/src/content";
import { allReleases, releaseFor, sampleFor, sampleReleases } from "../../../packages/learning/src/curricula";
import { assigned, hashOf, propose, review, synthesise, validateRelease } from "../../../packages/learning/src/curriculum";
import { offersFor, trace } from "../../../packages/learning/src/decomposition";
import { diagnose, DIAGNOSTIC_POLICY } from "../../../packages/learning/src/diagnostic";
import { DAY, useReviewFixture } from "../../../packages/learning/src/evidence";
import { examPlan, examPlanApplies, overlay } from "../../../packages/learning/src/goals";
import { graph, walkSupports } from "../../../packages/learning/src/graph";
import { familyOf, investigateContext, orderStrategies } from "../../../packages/learning/src/intervention";
import { reason } from "../../../packages/learning/src/reasoning";
import { years } from "../../../packages/learning/src/plan";
import { readRecords } from "../../../packages/learning/src/records";
import { aggregate, flatten, tileAt, tilesFor, type Tile } from "../../../packages/learning/src/tiles";
import { Driver, right } from "./driver";

const book = (g: number) => readFileSync(new URL(`../../../content/learning/textbooks/sample-maths-grade${g}.md`, import.meta.url), "utf8");
const T0 = Date.parse("2026-09-01T09:00:00Z");
const EQ = "MATH.number.equivalent-fractions";
const MT = "MATH.number.multiplication-tables";
const all = () => questions.map((q) => q.id);
const fixtureOn = () => useReviewFixture({ items: all(), releasedAt: "2020-01-01T00:00:00Z" });
const fixtureOff = () => useReviewFixture(null);

// ---------------------------------------------------------------- content: every key checked against a second key

/** A second answer key, worked out separately from the content source (keep in step when questions are added). */
const KEY: Record<string, string> = {
  "eq-d1": "2", "eq-d2": "2", "eq-d3": "15", "eq-s1g": "4", "eq-s1c": "6", "eq-s2g": "8", "eq-s2c": "12", "eq-s3g": "12", "eq-s3c": "21", "eq-p1": "9", "eq-p2": "B", "eq-p3": "18", "eq-t1": "4", "eq-r1": "6", "eq-r2": "15",
  "fm-d1": "B", "fm-d2": "4", "fm-g1": "5", "fm-c1": "3", "fm-r1": "3", "fm-p1": "2", "fm-r2": "2",
  "fc-d1": "B", "fc-d2": "C", "fc-g1": "A", "fc-c1": "A", "fc-r1": "B", "fc-p1": "5", "fc-r2": "A",
  "fa-d1": "5/8", "fa-d2": "3/10", "fa-g1": "5/6", "fa-c1": "7/9", "fa-r1": "3/7", "fa-p1": "A", "fa-r2": "5/6",
  "mt-d1": String(7 * 8), "mt-d2": String(6 * 7), "mt-k-77": String(7 * 7), "mt-k-75": String(7 * 5), "mt-k-73": String(7 * 3), "mt-k-72": String(7 * 2), "mt-k-add": String(7 + 7 + 7),
  "mt-near-g": String(8 * 9), "mt-near-c": String(6 * 7), "mt-dec-g": String(7 * 6), "mt-dec-c": String(6 * 8), "mt-dbl-g": String(6 * 4), "mt-dbl-c": String(9 * 8), "mt-add-g": String(6 * 4), "mt-add-c": String(4 * 7),
  "mt-arr-g": String(3 * 6), "mt-arr-c": String(4 * 6), "mt-r1": String(8 * 7), "mt-r2": String(9 * 6), "mt-p1": "C",
  "ra-d1": String(6 * 4), "ra-d2": String(5 * 5), "ra-g1": String(9 * 3), "ra-c1": String(8 * 5), "ra-r1": String(7 * 4), "ra-p1": "B", "ra-r2": String(9 * 3),
  "ca-d1": "C", "ca-d2": "7", "ca-g1": "B", "ca-c1": "6", "ca-r1": "C", "ca-p1": "B", "ca-r2": "D",
  "fm-p2": "A", "fm-t1": String(8 - 3), "fc-p2": "2", "fc-t1": "B", "fa-p2": "5/7", "fa-t1": "7/9", "mt-p2": String(7 * 6), "mt-t1": String(8 * 7),
  "ra-p2": String(9 * 4), "ra-t1": String(6 * 5), "ca-p2": "0", "ca-t1": String(1 - 3), "di-p2": String((7 - 2) * 3), "di-t1": String((10 - 3) * 4), "fx-p2": "12", "fx-t1": String([...Array(22).keys()].map((k) => k + 2).filter((k) => 24 % k === 0).length),
  "di-d1": String(3 * 4), "di-d2": String(2 * 4), "di-g1": String(5 * 6), "di-c1": String(4 * 5), "di-r1": String(9 * 3), "di-p1": "C", "di-r2": String(5 * 4),
  "ai-original": String(7 * 8), "ai-c1": String(6 * 9),
  "fx-d1": "6", "fx-d2": "12", "fx-g1": "6", "fx-c1": "24", "fx-r1": "6", "fx-p1": "D", "fx-r2": "4",
  "ch-remainder": "13", "ch-triangle": "36", "ch-counter": "B",
  "qd-d1": "3,2", "qd-d2": "7", "qd-d3": "A", "qd-g1": "4,3", "qd-c1": "3,-2", "qd-p1": "-1,-4", "qd-p2": "B", "qd-t1": "3", "qd-s2g": "C", "qd-s2c": "A", "qd-r1": "5,3", "qd-r2": "1,-2",
  "area-parabola-line.full": "4.5", "area-parabola-line.g7": "5", "area-parabola-line.g8": "2,-1", "area-parabola-line.g10": "2,-1", "area-parabola-line.g11": "A",
};
const factors = (n: number) => [...Array(n).keys()].map((k) => k + 1).filter((k) => n % k === 0).length;

test("every question and fragment has an answer that its own checker accepts, and that matches a second key", () => {
  const ids = [...all(), ...problems.flatMap((p) => [p.full.id, ...p.fragments.map((f) => f.id)])];
  assert.deepEqual(ids.filter((id) => !(id in KEY)), [], "every question is in the second key");
  for (const id of ids) {
    const q = question(id);
    assert.ok(canonical(q, q.answer) !== null, `${id}: the stored answer parses`);
    assert.ok(isCorrect(q, KEY[id]), `${id}: the second key (${KEY[id]}) is accepted (stored ${q.answer})`);
    if (q.type === "choice") assert.ok(q.options && q.options.length >= 2 && "ABCD".indexOf(q.answer) < q.options.length, `${id}: the answer is one of the options`);
    for (const m of q.misconceptions ?? []) assert.ok(!isCorrect(q, m.when), `${id}: a misconception answer (${m.when}) is wrong`);
  }
  // independent arithmetic for the counting questions
  assert.equal(factors(12), 6);
  assert.equal(factors(18), 6);
  assert.equal(factors(20), 6);
  assert.equal(factors(15), 4);
  // the advanced problem: the area between y = x² and y = x + 2 (they meet at −1 and 2)
  const F = (x: number) => x * x / 2 + 2 * x - x ** 3 / 3;
  assert.equal(F(2) - F(-1), 4.5);
});

test("answers are checked by meaning: equivalent forms are accepted, malformed ones are not", () => {
  assert.ok(isCorrect(question("fa-d1"), "10/16"), "an equivalent fraction");
  assert.ok(isCorrect(question("fa-d1"), " 5/8 "));
  assert.ok(isCorrect(question("qd-c1"), "3, −2"), "a set in any order, with a typographic minus");
  assert.ok(isCorrect(question("eq-p2"), "b"), "a choice letter in either case");
  assert.ok(!isCorrect(question("qd-c1"), "3,3"), "a repeated element is not a set of two");
  assert.ok(!isCorrect(question("mt-d1"), "56.0x"));
  assert.equal(canonical(question("mt-d1"), ""), null);
  assert.equal(misconceptionOf(question("mt-d1"), "54")?.hypothesis !== undefined, true, "a written misconception is recognised");
});

test("modules are complete: diagnostics, strategies with their own guided and check questions, practice and a two-question delayed check", () => {
  for (const m of modules) {
    assert.ok(m.diagnostics.length >= 2 && m.diagnostics.length <= 3, `${m.competency}: 2 or 3 diagnostic questions`);
    assert.ok(m.strategies.length >= 1, `${m.competency}: at least one strategy`);
    assert.ok(m.retention.length >= 2, `${m.competency}: a delayed check of two questions (two fresh answers are needed to verify)`);
    const used = [...m.diagnostics, ...m.practice, ...m.transfer, ...m.retention, ...m.probes, ...m.strategies.flatMap((s) => [s.guided, s.check])];
    assert.equal(new Set(used).size, used.length, `${m.competency}: no question has two roles`);
    for (const id of used.filter((x) => !m.probes.includes(x))) assert.equal(graph.evidenceTarget(question(id).competency), m.competency, `${id} belongs to ${m.competency}`);
    // a probe asks about what the skill builds on: its own skill, or one a relation names (7 × 8 inside 7 × 8 = ?; 3 × 4 inside 3(x + 4))
    for (const id of m.probes) assert.ok(question(id).competency === m.competency || graph.relationsOf(m.competency).some((r) => r.from === question(id).competency), `${id}: a probe about ${m.competency} or something it builds on`);
    const formats = new Set([...m.diagnostics, ...m.practice, ...m.transfer, ...m.strategies.map((s) => s.check)].map((id) => question(id).type));
    assert.ok(formats.size >= 2, `${m.competency}: two question formats (the shared engine needs two contexts to demonstrate)`);
    for (const s of m.strategies) for (const n of s.needs) assert.ok(m.probes.includes(n), `${s.id} needs a probe of this module`);
  }
});

// ---------------------------------------------------------------- curriculum ingestion

test("a textbook becomes a draft with mapped outcomes and source references, and only a review makes it assignable", () => {
  const draft = synthesise(book(4));
  assert.equal(draft.status, "draft");
  assert.equal(assigned(draft).length, 0, "a draft assigns nothing");
  const fractions = draft.subjects[0].chapters.find((c) => c.title === "Fractions")!;
  assert.equal(fractions.pages, "33–52");
  assert.deepEqual(fractions.outcomes.map((o) => o.mapping.competencies[0]?.id), ["MATH.number.fraction-models", EQ, "MATH.number.fraction-comparison", "MATH.number.fraction-add-like"]);
  assert.ok(fractions.outcomes.every((o) => o.mapping.competencies.every((m) => m.status === "proposed")), "never silently accepted");
  const proposals = draft.subjects[0].chapters.flatMap((c) => c.outcomes).filter((o) => o.mapping.proposal);
  assert.equal(proposals.length, 2, "outcomes with no match become provisional proposals, not new verified competencies");
  assert.ok(proposals.every((o) => o.mapping.proposal!.status === "provisional-proposal" && o.mapping.proposal!.source.pages));
  assert.ok(proposals.every((o) => !graph.byId.has(o.mapping.proposal!.id)), "a proposal is not added to the graph");
  const rel = review(draft, "accept-proposals", "test reviewer", "2026-09-01T00:00:00Z");
  assert.equal(rel.status, "reviewed");
  assert.equal(rel.review!.educatorReviewed, false);
  assert.deepEqual(validateRelease(rel), []);
  // "Generate equivalent fractions by multiplying numerator and denominator" is close to "multiply fractions":
  // flagged uncertain, so it is NOT accepted without an explicit decision
  assert.equal(fractions.outcomes[1].mapping.verdict, "uncertain");
  assert.ok(!assigned(rel).some((a) => a.competency === EQ), "an uncertain mapping needs a reviewer's decision");
  assert.ok(assigned(review(draft, [{ outcome: fractions.outcomes[1].id, accept: [EQ] }], "t", "t")).some((a) => a.competency === EQ));
  assert.throws(() => review(rel, "accept-proposals", "x", "y"), /Only a draft/);
  // explicit decisions: the reviewer rejects one mapping and adds another
  const custom = review(draft, [{ outcome: fractions.outcomes[1].id, accept: ["MATH.number.fraction-models"] }], "test", "2026-09-01T00:00:00Z");
  assert.deepEqual(assigned(custom).map((a) => a.competency), ["MATH.number.fraction-models"]);
  assert.throws(() => review(draft, [{ outcome: fractions.outcomes[1].id, accept: ["MATH.not-real"] }], "t", "t"), /Unknown competency/);
});

test("mapping proposals pick the right competency for every outcome of the sample textbooks", () => {
  for (const g of [4, 5, 7, 8, 10, 11]) {
    const rel = sampleFor(g)!;
    assert.deepEqual(validateRelease(rel), [], `grade ${g} sample release is valid`);
    for (const a of assigned(rel)) {
      const [lo, hi] = graph.get(a.competency).gradeRange;
      assert.ok(lo <= g + 1 && hi >= g - 1, `grade ${g}: ${a.competency} (${lo}–${hi}) suits the grade`);
    }
  }
  assert.equal(propose("Read a bus timetable to plan a journey", 4).length, 0);
});

test("releases are versioned by content: a changed release has a different hash, and a reference to a stale hash resolves to nothing", () => {
  const r = sampleFor(4)!;
  assert.equal(r.hash, hashOf({ ...r, hash: "" }));
  const changed = { ...r, title: r.title + " (edited)" };
  assert.notEqual(hashOf({ ...changed, hash: "" }), r.hash);
  assert.equal(releaseFor({ id: r.id, version: r.version, hash: r.hash }, new Map()), r);
  assert.equal(releaseFor({ id: r.id, version: r.version, hash: "deadbeef" }, new Map()), null);
  assert.equal(sampleReleases.length, 9, "the latest version of seven sample books (Grades 4, 5, 7, 8, 10, 11, 12) and two second-board books (Grades 4 and 10)");
  // earlier versions stay readable: a learner enrolled on 1.0.0 still finds their curriculum
  const old = allReleases.find((x) => x.id === r.id && x.version === "1.0.0")!;
  assert.equal(releaseFor({ id: old.id, version: "1.0.0", hash: old.hash }, new Map()), old);
  assert.notEqual(old.hash, r.hash);
});

// ---------------------------------------------------------------- graph

test("the graph: micro-skills are part of one competency, and the support walk is bounded and cycle-safe", () => {
  assert.deepEqual(graph.childrenOf(MT).sort(), ["MLY.mult.derive", "MLY.mult.facts-2-5-10", "MLY.mult.facts-3-4", "MLY.mult.facts-6-9"]);
  assert.equal(graph.evidenceTarget("MLY.mult.facts-6-9"), MT);
  const w = walkSupports("MATH.calculus.area-integrals", 2);
  assert.deepEqual(w.filter((s) => s.depth === 1).map((s) => s.id), ["MATH.calculus.definite-integrals", "MATH.measurement.rectangle-area", "MATH.coordinate.cartesian"]);
  assert.ok(w.some((s) => s.id === MT && s.depth === 2 && s.via === "MATH.measurement.rectangle-area"));
  assert.equal(new Set(w.map((s) => s.id)).size, w.length, "each skill once");
  assert.ok(w.every((s) => s.depth <= 2));
  // every competency's whole support closure terminates (no infinite loop on a cycle)
  for (const c of graph.competencies) assert.ok(walkSupports(c.id, 50).length < graph.competencies.length);
  const ids = graph.competencies.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "no duplicate competency records");
});

// ---------------------------------------------------------------- diagnostics

const attempt = (questionId: string, response: string, n = 1) => ({ id: `a-${questionId}-${n}`, at: "2026-09-01T09:00:00Z", session: "s", questionId, response, activity: "diagnostic" as const, hints: 0, solution: false, competency: question(questionId).competency, n });

test("diagnostics: at most three questions, chosen by expected information, distinguishing kinds of difficulty", () => {
  const m = moduleFor(EQ)!;
  const first = diagnose(m, []);
  assert.ok(first.next && m.diagnostics.includes(first.next));
  const conceptual = diagnose(m, [attempt("eq-d1", "4"), attempt("eq-d2", "4"), attempt("eq-d3", "9")]);
  assert.equal(conceptual.result, "conceptual");
  assert.equal(conceptual.next, null);
  const secure = diagnose(m, m.diagnostics.map((id) => attempt(id, question(id).answer)));
  assert.equal(secure.result, "secure");
  const recall = diagnose(m, [attempt("eq-d1", "2"), attempt("eq-d2", "2"), attempt("eq-d3", "13")]);
  assert.notEqual(recall.result, "conceptual", "a slip in a multiplication fact is not a conceptual gap");
  // a wrong answer with no written misconception is not proof of anything specific
  const vague = diagnose(moduleFor(MT)!, [attempt("mt-d1", "50"), attempt("mt-d2", "42")]);
  assert.ok(vague.result === "insufficient_evidence" || vague.confidence < DIAGNOSTIC_POLICY.stopAt);
  assert.ok(diagnose(m, [attempt("eq-d1", "2", 2)]).asked.length === 0, "a second attempt is not diagnostic evidence");
});

// ---------------------------------------------------------------- strategy choice (7 × 8)

test("strategy choice by prior knowledge: knows 7 × 5 and 7 × 3 but not 7 × 7 → decomposition", () => {
  const m = moduleFor(MT)!;
  const records = readRecords("L", [
    ...["mt-d1:54", "mt-d2:48", "mt-k-77:47", "mt-k-75:35", "mt-k-73:21"].map((x, k) => {
      const [q, r] = x.split(":");
      return { kind: "learning_record", id: `r${k}`, at: `2026-09-01T09:0${k}:00Z`, learnerId: "L", sessionId: "s", record: "attempt", questionId: q, response: r, activity: q.includes("-k-") ? "probe" : "diagnostic", hints: 0, solution: false, competency: MT };
    }),
  ]);
  const d = diagnose(m, records.attempts);
  assert.equal(orderStrategies(m, d, records)[0].id, "decomposition");
  const knowsSquare = readRecords("L", [...records.attempts.map((a, k) => ({ kind: "learning_record", id: `q${k}`, at: a.at, learnerId: "L", sessionId: "s", record: "attempt", questionId: a.questionId, response: a.questionId === "mt-k-77" ? "49" : a.response, activity: a.activity, hints: 0, solution: false, competency: MT }))]);
  assert.equal(orderStrategies(m, diagnose(m, knowsSquare.attempts), knowsSquare)[0].id, "near_fact", "knows 7 × 7: use the fact next door");
});

// ---------------------------------------------------------------- evidence and status

test("help is never independence: guided answers, hints and second attempts stay assisted", () => {
  fixtureOff();
  const d = new Driver("synthetic-help", T0);
  d.enrol(4, "2026-27", sampleFor(4)!);
  d.answer("eq-d1", "2", "diagnostic", { hints: 1 });
  d.answer("eq-d2", "4", "diagnostic");
  d.answer("eq-d2", "2", "diagnostic");
  d.answer("eq-s1g", "4", "guided");
  const e = d.state().evidence(EQ);
  assert.equal(e.independent.right, 0);
  assert.equal(e.assisted.right, 3);
  assert.equal(e.status, "guided");
});

test("journey F: a missed delayed check means review, not verified, even when every question counts for verification", () => {
  fixtureOn();
  const d = new Driver("synthetic-f", T0);
  d.enrol(4, "2026-27", sampleFor(4)!);
  d.work(EQ, right);
  let e = d.state().evidence(EQ);
  assert.ok(e.status === "independent" || e.status === "transfer");
  assert.equal(e.retention, "scheduled");
  d.newSession(3);
  assert.equal(d.state().evidence(EQ).retention, "scheduled", "not due before seven days");
  d.newSession(5);
  assert.equal(d.state().evidence(EQ).retention, "due");
  assert.equal(d.state().next?.kind, "retention");
  d.work(EQ, (q) => (q === "eq-r1" ? "8" : question(q).answer), { max: 1 });
  e = d.state().evidence(EQ);
  assert.equal(e.retention, "failed");
  assert.equal(e.status, "review");
  assert.notEqual(e.engine, "verified");
  const tile = flatten(d.state().summary!.tiles).find((t) => t.competency === EQ)!;
  assert.equal(tile.status, "active");
  assert.equal(tile.label, "Review needed");
  assert.equal(d.state().next?.kind, "review");
  fixtureOff();
});

test("verification is the shared engine's alone: on shipped (provisional) content a skill is at most shown, never green", () => {
  fixtureOff();
  const d = new Driver("synthetic-provisional", T0);
  d.enrol(4, "2026-27", sampleFor(4)!);
  d.work(EQ, right);
  d.newSession(8);
  d.work(EQ, right);
  const e = d.state().evidence(EQ);
  assert.equal(e.retention, "passed");
  assert.equal(e.status, "transfer");
  assert.notEqual(e.engine, "verified");
  // with the test-only review fixture the same records verify through the same engine
  fixtureOn();
  assert.equal(d.state().evidence(EQ).status, "verified");
  fixtureOff();
});

// ---------------------------------------------------------------- tiles

test("tiles: subject → chapter → skill → micro-skills, with labels and icons, and aggregation that never turns a full orange bar green", () => {
  fixtureOff();
  const d = new Driver("synthetic-tiles", T0);
  d.enrol(4, "2026-27", sampleFor(4)!);
  const tiles = d.state().summary!.tiles;
  assert.equal(tiles.length, 1);
  const fractions = tiles[0].children.find((c) => c.title === "Fractions")!;
  assert.equal(fractions.kind, "chapter");
  assert.deepEqual(fractions.children.map((c) => c.status), ["not_started", "not_started", "not_started", "not_started"]);
  const eq = fractions.children.find((c) => c.competency === EQ)!;
  assert.deepEqual(eq.children.map((c) => c.kind), ["micro", "micro", "micro"]);
  assert.ok(tileAt(tiles, [tiles[0].id, fractions.id, eq.id, eq.children[0].id]), "navigation down to a micro-skill and back by path");
  assert.ok(flatten(tiles).every((t) => t.label && t.icon), "never colour alone");
  assert.ok(flatten(tiles).filter((t) => t.kind === "proposal").every((t) => !t.assessable && t.label === "Not mapped yet"));
  // aggregate@1 edge cases
  const leaf = (status: Tile["status"]): Tile => ({ id: status + Math.random(), kind: "skill", title: "", children: [], status, label: "", icon: "", progress: { done: 0, total: 4, verified: 0 }, objectives: [], evidence: [], assessable: true, strategies: [], curriculumRefs: [], goalRefs: [] });
  assert.equal(aggregate("p", "chapter", "", [leaf("verified"), leaf("shown")]).status, "shown");
  assert.equal(aggregate("p", "chapter", "", [leaf("verified"), leaf("verified")]).status, "verified");
  const allShown = aggregate("p", "chapter", "", [leaf("shown"), leaf("shown")]);
  assert.equal(allShown.progress.done, allShown.progress.total, "a full bar…");
  assert.notEqual(allShown.status, "verified", "…is not green");
  assert.equal(aggregate("p", "chapter", "", [leaf("active"), leaf("not_started")]).status, "active");
  assert.equal(aggregate("p", "chapter", "", [leaf("not_started")]).status, "not_started");
  assert.equal(aggregate("p", "chapter", "", []).status, "no_questions");
});

test("one competency, one evidence record: the same skill in two curricula shows the same status", () => {
  fixtureOff();
  const d = new Driver("synthetic-shared", T0);
  d.enrol(4, "2026-27", sampleFor(4)!);
  d.work(EQ, right);
  const st = d.state();
  const in4 = flatten(tilesFor(sampleFor(4)!, st.evidence)).find((t) => t.competency === EQ)!;
  const in5 = flatten(tilesFor(sampleFor(5)!, st.evidence)).find((t) => t.competency === EQ)!;
  assert.equal(in4.status, in5.status);
  assert.deepEqual(in4.evidence, in5.evidence);
});

// ---------------------------------------------------------------- journeys A–F (engine level; the browser journeys are in e2e)

test("journey A: Grade 4 textbook → Fractions → diagnostic → strategy → practice, and it all persists across sessions", () => {
  fixtureOff();
  const d = new Driver("synthetic-a", T0);
  const rel = review(synthesise(book(4)), "accept-proposals", "account owner", new Date(T0).toISOString());
  d.events.push({ kind: "learning_record", id: "cur", at: new Date(T0).toISOString(), learnerId: d.learnerId, sessionId: d.session, record: "curriculum", release: rel });
  d.enrol(4, "2026-27", rel);
  assert.equal(d.state().release?.hash, rel.hash, "the learner's own reviewed release is found by hash");
  const wrongs: Record<string, string> = { "eq-d1": "4", "eq-d2": "4", "eq-d3": "9" };
  const steps = d.work(EQ, (q) => wrongs[q] ?? question(q).answer);
  const phases = steps.map((s) => s.phase);
  const explored = phases.indexOf("chapter");
  assert.ok(explored >= 1 && explored <= 3 && phases.slice(0, explored).every((p) => p === "explore"), "one to three diagnostic questions first");
  assert.equal(diagnose(moduleFor(EQ)!, d.state().records.attempts).result, "conceptual", "it stops once one explanation is clearly ahead");
  assert.ok(phases.includes("chapter") && phases.includes("guided") && phases.includes("check") && phases.includes("verify"));
  assert.equal(d.trace.find((t) => t.startsWith("teach:")), "teach:strip_model", "a conceptual diagnosis starts with the picture");
  const before = d.state();
  // log out, log in: a new session reading the same stored records (as JSON) gives the same state
  const stored = JSON.parse(JSON.stringify(d.events));
  d.newSession(0);
  const after = new Driver(d.learnerId, d.now);
  after.events = stored;
  const st = after.state();
  assert.equal(st.evidence(EQ).status, before.evidence(EQ).status);
  assert.deepEqual(st.summary, before.summary);
  assert.equal(st.enrolment?.grade, 4);
});

test("journey B: Grade 5 with an IIT-JEE Advanced goal sees age-appropriate tiles, goal-marked foundations and gated enrichment; nothing advanced", () => {
  fixtureOff();
  const d = new Driver("synthetic-b", T0);
  d.enrol(5, "2026-27", sampleFor(5)!);
  d.goal("jee-advanced");
  const st = d.state();
  const skills = flatten(st.summary!.tiles).filter((t) => t.kind === "skill");
  assert.ok(skills.every((t) => graph.get(t.competency!).gradeRange[0] <= 6), "only this year's curriculum");
  assert.ok(!skills.some((t) => t.competency!.startsWith("MATH.calculus")));
  const ids = assigned(sampleFor(5)!).map((a) => a.competency);
  let o = overlay("jee-advanced", 5, ids, st.evidence)!;
  assert.ok(o.foundations.length > 0 && o.foundations.every((id) => ids.includes(id)));
  assert.ok(o.challenges.length >= 2 && o.challenges.every((c) => !c.ready), "challenges wait until their skill is shown");
  assert.equal(examPlanApplies("jee-advanced", 5), false, "no exam plan, no acceleration at Grade 5");
  const offer = offersFor(5, st.evidence)[0];
  assert.equal(offer.full, null);
  assert.deepEqual(offer.fragments, [], "no fragment of the advanced problem below Grade 7");
  d.work("MATH.number.factors-multiples", right);
  o = overlay("jee-advanced", 5, ids, d.state().evidence)!;
  assert.ok(o.challenges.every((c) => c.ready));
  assert.equal(d.state().next?.kind === "start" || d.state().next?.kind === "challenge", true);
});

test("journey C: Grade 10 integration problem → supports traced, verified ones skipped, 7 × 8 fails → decomposition → back to the problem", () => {
  fixtureOn();
  const d = new Driver("synthetic-c", T0);
  d.enrol(10, "2026-27", sampleFor(10)!);
  d.goal("jee-main");
  for (const c of ["MATH.measurement.rectangle-area", "MATH.coordinate.cartesian"]) d.work(c, right);
  d.newSession(8);
  for (const c of ["MATH.measurement.rectangle-area", "MATH.coordinate.cartesian"]) d.work(c, right);
  d.newSession(1);
  assert.equal(d.state().evidence("MATH.measurement.rectangle-area").status, "verified");
  assert.equal(d.state().evidence("MATH.coordinate.cartesian").status, "verified");
  // a learner for whom 7 × 8 is not reliable (it comes out as 54, wherever it appears), everything else right
  const known: Record<string, string> = { "mt-d1": "54", "mt-d2": "48", "mt-k-77": "47", "ai-original": "54", "gen:mul:7,8": "54" };
  const phases = d.recover("ai-original", (q, ph) => (q === "ai-original" && ph === "return" ? "56" : known[q] ?? question(q).answer));
  // the wrong answer is investigated first (diagnostic@2); the established explanation (7 × 8) sends it straight to
  // multiplication facts, without re-checking definite integrals, which the investigation showed are fine
  assert.deepEqual(phases, ["attempt", "investigate", `support:${MT}`, "return", "solved_after_help"]);
  const st0 = d.state();
  const follow = st0.records.attempts.filter((a) => a.context === investigateContext("ai-original"));
  assert.ok(follow.some((a) => a.questionId === "gen:mul:7,8"), "the fact itself was asked");
  assert.equal(reason(familyOf("ai-original")!, [{ questionId: "gen:cint:0,8,7", response: "54" }, ...follow.map((a) => ({ questionId: a.questionId, response: a.response }))])?.best?.id, "fact-slip:7x8");
  assert.ok(d.trace.includes("diagnostic:gen:mul:7,8=54"), "uncertain multiplication is assessed with 7 × 8 itself");
  assert.ok(d.trace.includes("teach:decomposition"));
  const t = d.trace.indexOf("teach:decomposition");
  assert.deepEqual(d.trace.slice(t + 1, t + 3), ["guided:mt-dec-g=42", "check:mt-dec-c=48"]);
  const st = d.state();
  const ai = st.evidence("MATH.calculus.area-integrals");
  assert.deepEqual(ai.independent, { right: 0, total: 1 }, "the first, unaided attempt is the only independent one");
  assert.deepEqual(ai.assisted, { right: 1, total: 1 }, "solved after help: assisted, kept separate");
  assert.notEqual(ai.status, "independent");
  fixtureOff();
});

test("journey D: an advanced problem decomposed: Grade 7 and Grade 8 fragments, the full problem only for a ready learner", () => {
  fixtureOff();
  const ev7 = new Driver("synthetic-d7", T0).state().evidence;
  const g7 = offersFor(7, ev7)[0];
  assert.deepEqual(g7.fragments.map((f) => f.id), ["area-parabola-line.g7"]);
  assert.equal(g7.full, null);
  const g8 = offersFor(8, ev7)[0];
  assert.deepEqual(g8.fragments.map((f) => f.id), ["area-parabola-line.g8"]);
  for (const f of [...g7.fragments, ...g8.fragments]) {
    assert.ok(!f.prompt.includes("{(x, y)"), "a fragment does not contain the original problem");
    const tr = trace(f.id)!;
    assert.equal(tr.problem, "area-parabola-line");
    assert.ok(tr.licence && tr.source && tr.validation);
  }
  const d = new Driver("synthetic-d11", T0);
  d.enrol(11, "2026-27", sampleFor(11)!);
  assert.equal(offersFor(11, d.state().evidence)[0].full, null, "Grade 11 without the readiness evidence: not yet");
  d.work("MATH.algebra.quadratics", right);
  d.work("MATH.calculus.definite-integrals", right);
  const ready = offersFor(11, d.state().evidence)[0];
  assert.equal(ready.full?.id, "area-parabola-line.full");
  assert.ok(examPlanApplies("jee-advanced", 11));
  const plan = examPlan("jee-advanced", d.state().evidence, 20, 0.75)!;
  assert.ok(plan.estimate.low <= plan.estimate.high);
  assert.ok(plan.priorities.every((p) => p.weight[0] < p.weight[1]), "weight ranges, never fixed marks");
  assert.match(plan.caveat, /not a prediction/);
  assert.ok(plan.priorities.filter((p) => p.chance <= 0.2).every((p) => !p.attempt), "negative marking: a guess is not worth it");
});

test("journey E: Grade 4 → Grade 5 keeps every record; a skill shown in Grade 4 is still shown in Grade 5", () => {
  fixtureOff();
  const d = new Driver("synthetic-e", T0);
  d.enrol(4, "2026-27", sampleFor(4)!);
  d.work(EQ, right);
  const before = d.state().evidence(EQ);
  d.newSession(300);
  d.enrol(5, "2027-28", sampleFor(5)!);
  const st = d.state();
  assert.equal(st.enrolment?.grade, 5);
  assert.deepEqual(years(st.records).map((y) => [y.grade, y.current]), [[4, false], [5, true]]);
  assert.equal(st.evidence(EQ).attempts.length, before.attempts.length, "no record lost");
  assert.ok(["independent", "transfer"].includes(st.evidence(EQ).status) || st.evidence(EQ).status === "review");
  const in5 = flatten(st.summary!.tiles).find((t) => t.competency === EQ)!;
  assert.notEqual(in5.status, "not_started", "Grade 5 More fractions builds on what was shown in Grade 4");
  assert.ok(flatten(tilesFor(sampleFor(4)!, st.evidence)).length > 0, "last year's curriculum can still be shown");
  assert.equal(d.state().next?.kind, "retention", "the delayed check from last year comes back first");
});

test("records from another learner, malformed times and duplicates are ignored", () => {
  const good = { kind: "learning_record", id: "x", at: "2026-09-01T09:00:00Z", learnerId: "L", sessionId: "s", record: "attempt", questionId: "mt-d1", response: "56", activity: "diagnostic", hints: 0, solution: false, competency: MT };
  const r = readRecords("L", [good, good, { ...good, id: "y", learnerId: "M" }, { ...good, id: "z", at: "not a time" }, { ...good, id: "w", questionId: "nope" }, { kind: "math_activity" }]);
  assert.equal(r.attempts.length, 1);
  void DAY;
});
