/**
 * The platform directive's acceptance scenarios A–F and the content pipeline, through the same engine the app uses.
 * Synthetic learners only. These test behaviour, not learning effectiveness.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { modules, question, synthesisedModules } from "../../../packages/learning/src/content";
import { CATEGORIES, graphCoverage, releaseCoverage } from "../../../packages/learning/src/coverage";
import { sampleReleases } from "../../../packages/learning/src/curricula";
import { allOutcomesOf, assigned, review, synthesise, type CurriculumRelease } from "../../../packages/learning/src/curriculum";
import { DAY, useRegistry, useReviewFixture } from "../../../packages/learning/src/evidence";
import { extract } from "../../../packages/learning/src/extract";
import { decompose, problemOf, show } from "../../../packages/learning/src/families";
import { examPlan, overlay } from "../../../packages/learning/src/goals";
import { graph } from "../../../packages/learning/src/graph";
import { moduleState } from "../../../packages/learning/src/intervention";
import { synthesise as synthesiseModule, type Blueprint } from "../../../packages/learning/src/library";
import { years } from "../../../packages/learning/src/plan";
import { contentHashOf, decide, effectiveState, itemOf, registry, release as releaseModule, ReviewError, submit, sync, type Registry } from "../../../packages/learning/src/review";
import { flatten, tileAt, tilesFor, type Tile } from "../../../packages/learning/src/tiles";
import { validateModule } from "../../../packages/learning/src/validate";
import { Driver, right, type Answerer } from "./driver";

const T0 = Date.parse("2026-11-02T09:00:00Z");
const root = new URL("../../../", import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), "utf8");
const byId = (id: string) => sampleReleases.find((r) => r.id === id)!;
const G10B = "board-b-sample-mathematics-class-10";
const G12 = "openpath-sample-mathematics-grade-12";
/** Follow tile titles down from the subject. */
function path(tiles: Tile[], titles: string[]): Tile[] {
  const out: Tile[] = [];
  let level = tiles;
  for (const t of titles) {
    const hit = level.find((x) => x.title === t || x.title.endsWith(` ${t}`));
    assert.ok(hit, `tile “${t}” under ${out.at(-1)?.title ?? "the top"}: found ${level.map((x) => x.title).join(" | ")}`);
    out.push(hit!);
    level = hit!.children;
  }
  return out;
}
/** A learner who has one misunderstanding (a written explanation of a family) until the skill it names is taught. */
function withBug(d: Driver, bugId: string, taughtWhen: string): Answerer {
  return (qid) => {
    const p = problemOf(qid);
    const taught = d.events.some((e) => e.record === "teach" && (e as { competency: string }).competency === taughtWhen);
    const b = p?.bugs.find((x) => x.id === bugId);
    if (!p || taught || !b || b.predict === null) return right(qid);
    const v = Array.isArray(b.predict) && p.type !== "set" ? b.predict[0] : b.predict;
    return p.type === "choice" ? "ABCD"[v as number] : show(v as number);
  };
}
const fixtureOn = () => useReviewFixture({ items: [...modules.flatMap((m) => [...m.diagnostics, ...m.practice, ...m.transfer, ...m.retention, ...m.probes, ...m.strategies.flatMap((s) => [s.guided, s.check])])], releasedAt: "2020-01-01T00:00:00Z" });
const fixtureOff = () => useReviewFixture(null);

// ---------------------------------------------------------------- the content pipeline

test("pipeline: the library is exactly what the blueprints synthesise; every module validates; nothing is approved", () => {
  const bps = JSON.parse(read("content/learning/blueprints.v1.json")) as { version: string; blueprints: Blueprint[] };
  const fresh = bps.blueprints.map((b) => synthesiseModule(b, bps.version));
  assert.deepEqual(JSON.parse(JSON.stringify(fresh)), synthesisedModules, "library.v1.json is generated, never edited by hand");
  for (const m of modules) assert.deepEqual(validateModule(m), [], `${m.competency} validates`);
  // every synthesised question is a family question that passes its independent check, in two formats
  for (const m of synthesisedModules) {
    const ids = [...m.diagnostics, ...m.practice, ...m.transfer, ...m.retention, ...m.strategies.flatMap((s) => [s.guided, s.check])];
    for (const id of ids) assert.ok(problemOf(id), id);
    assert.ok(ids.some((id) => id.endsWith(":mc")) && ids.some((id) => !id.endsWith(":mc")));
  }
  // the registry: every module is in it, none approved or released, every entry matches its module's content
  for (const m of modules) {
    const e = registry.entries.find((x) => x.item === itemOf(m.competency));
    assert.ok(e, `${m.competency} is in the registry`);
    assert.equal(e!.contentHash, contentHashOf(m), `${m.competency}: the registry has the current content`);
    assert.ok(e!.state === "draft" || e!.state === "submitted", `${m.competency} is ${e!.state}: no educator has approved anything`);
  }
});

test("pipeline: review needs an educator who is not the author; only a released, unchanged module counts as validated", () => {
  const m = modules.find((x) => x.competency === "MATH.calculus.integration-methods")!;
  const at = "2026-10-20T00:00:00Z";
  let e = sync(undefined, m, "OpenPath author", at);
  assert.equal(e.state, "draft");
  assert.throws(() => submit(e, "eng", at, ["no chapter"]), ReviewError, "an invalid module cannot be submitted");
  e = submit(e, "eng", at, validateModule(m));
  assert.throws(() => decide(e, { by: "eng", role: "engineer" }, "approve", at, "looks fine"), /Only an educator/);
  assert.throws(() => decide(e, { by: "OpenPath author", role: "educator" }, "approve", at, "fine"), /not be the module's author/);
  assert.throws(() => decide(e, { by: "A. Teacher", role: "educator" }, "approve", at, " "), /needs a note/);
  assert.throws(() => releaseModule(e, "rm", at), /only an approved module/);
  e = decide(e, { by: "A. Teacher (test identity)", role: "educator" }, "approve", at, "checked every question and screen");
  e = releaseModule(e, "release manager (test)", at);
  assert.equal(effectiveState(e, m), "released");
  // a change to the module after release: the review no longer applies
  assert.equal(effectiveState(e, { ...m, title: m.title + "!" }), "draft");
  assert.deepEqual(e.history.map((h) => h.state), ["draft", "submitted", "approved", "released"]);
});

// ---------------------------------------------------------------- every tile leads to a functioning experience

test("every sample release: each skill tile with content opens a working module; a tile without content says so and is never counted", () => {
  for (const r of sampleReleases) {
    const d = new Driver(`synthetic-all-${r.id}`, T0);
    d.enrol(r.grade, "2026-27", r);
    const tiles = d.state().summary!.tiles;
    for (const t of flatten(tiles).filter((x) => x.kind === "skill")) {
      if (t.content!.level === "none") {
        assert.equal(t.assessable, false, `${t.title}: no content, not assessable`);
        assert.equal(t.label, "No learning content yet");
        continue;
      }
      const ms = moduleState(t.competency!, d.state().records, d.state().evidence(t.competency!), d.now, d.session);
      assert.equal(ms.phase, "explore", `${r.id} · ${t.title}: the module starts with Explore`);
      assert.ok(ms.question && question(ms.question), `${t.title}: a real first question`);
    }
    assert.equal(d.state().summary!.total, flatten(tiles).filter((x) => x.kind === "skill" && x.assessable).length);
  }
});

// ---------------------------------------------------------------- A: Grade 4, textbook to verified

test("A: Grade 4 textbook → dashboard → Fractions → Equivalent fractions → assessment, learning, delayed verification", async () => {
  fixtureOn();
  const d = new Driver("synthetic-A", T0);
  const draft = synthesise(read("content/learning/textbooks/sample-maths-grade4.md"));
  // the reviewer confirms each proposal, including the uncertain ones (the app asks them to choose)
  const r = review(draft, allOutcomesOf(draft).map(({ outcome: o }) => ({ outcome: o.id, accept: o.mapping.competencies.slice(0, 1).map((m) => m.id) })), "account owner", new Date(T0).toISOString());
  d.events.push({ ...(d.ctx() as object), kind: "learning_record", record: "curriculum", release: r } as never);
  d.enrol(4, "2026-27", r);
  const tiles = d.state().summary!.tiles;
  const [maths, fractions, eq] = path(tiles, ["Mathematics", "Fractions", "Generate equivalent fractions"]);
  assert.equal(maths.kind, "subject");
  assert.equal(fractions.kind, "chapter");
  assert.deepEqual(eq.children.map((c) => c.kind), ["micro", "micro", "micro"], "individual capabilities below the skill");
  // one misunderstanding in Explore (more than one early mistake: see the finding on engine evidence in the report)
  let slipped = false;
  const wrongThenRight: Answerer = (q, phase) => {
    if (phase !== "explore" || slipped || !question(q).misconceptions?.[0]) return right(q, phase);
    slipped = true;
    return question(q).misconceptions![0].when;
  };
  d.work(eq.competency!, wrongThenRight);
  assert.ok(d.trace[0].startsWith("diagnostic:"), "assessment first (Explore)");
  assert.ok(d.trace.some((t) => t.startsWith("practice:")) && d.trace.some((t) => t.startsWith("transfer:")), "then practice and a transfer question");
  assert.ok(["independent", "transfer"].includes(d.state().evidence(eq.competency!).status), "shown on your own");
  d.newSession(6.9);
  assert.notEqual(d.state().evidence(eq.competency!).retention, "due", "not before seven full days");
  d.newSession(0.2);
  assert.equal(d.state().next?.kind, "retention");
  d.work(eq.competency!, right);
  assert.equal(d.state().evidence(eq.competency!).status, "verified");
  const after = tileAt(d.state().summary!.tiles, [maths.id, fractions.id, eq.id])!;
  assert.equal(after.status, "verified");
  fixtureOff();
});

// ---------------------------------------------------------------- B: Grade 10 board book, quadratics, a prerequisite gap

test("B: Grade 10 board textbook → Algebra → Quadratic equations → a gap in expanding brackets found, repaired, and back", () => {
  fixtureOff();
  const r = byId(G10B);
  const d = new Driver("synthetic-B", T0);
  d.enrol(10, "2026-27", r);
  const tiles = d.state().summary!.tiles;
  const chain = path(tiles, ["Mathematics", "Algebra", "Quadratic equations", "Solving by factorisation", "Solve quadratic equations"]);
  assert.deepEqual(chain.map((t) => t.kind), ["subject", "unit", "chapter", "section", "skill"]);
  path(tiles, ["Mathematics", "Algebra", "Polynomials", "Expanding brackets", "Use algebraic identities", "Expand (x + a)(x + b)"]);
  // a learner who expands (x + a)(x + b) with a × b as the x term, and so cannot get quadratics right
  const original = "gen:expand:2,6";
  let learner: Answerer = () => "";
  learner = withBug(d, "product-for-sum", "MATH.algebra.identities");
  const phases = d.recover(original, learner);
  assert.ok(phases.includes("investigate"), "the wrong answer is investigated first");
  assert.ok(phases.some((p) => p === "teach:MATH.algebra.identities"), `the misunderstanding is taught: ${phases.join(" → ")}`);
  assert.equal(phases.at(-1), "solved_after_help");
  // and quadratics continues from where it was
  const q = d.work("MATH.algebra.quadratics", right);
  assert.ok(q.length > 1);
  assert.ok(["independent", "transfer"].includes(d.state().evidence("MATH.algebra.quadratics").status));
  // the Expand tile now shows the learning; the skill above it aggregates its constituent skills
  const unit = path(d.state().summary!.tiles, ["Mathematics", "Algebra"]).at(-1)!;
  assert.ok(unit.progress.total >= 3 && unit.progress.done >= 1, "a unit's progress is over its constituent skills");
});

// ---------------------------------------------------------------- C: Grade 12 calculus, integration recovery

test("C: Grade 12 → Calculus → Integrals → Techniques of integration → capabilities; a struggle leads to prerequisite recovery", () => {
  fixtureOff();
  const r = byId(G12);
  const d = new Driver("synthetic-C", T0);
  d.enrol(12, "2026-27", r);
  const tiles = d.state().summary!.tiles;
  const chain = path(tiles, ["Mathematics", "Calculus", "Integrals", "Techniques of integration", "Integrate by substitution and parts"]);
  const caps = chain.at(-1)!.children;
  assert.deepEqual(caps.map((c) => c.title), ["Integrate by substitution", "Integrate by parts"]);
  assert.equal(caps[0].content!.level, "module", "substitution: practised in the module");
  assert.equal(caps[1].content!.level, "none", "by parts: honestly no content yet");
  assert.equal(caps[1].label, "No learning content yet");
  // matrices, continuity, probability: on the map, without content, never counted
  assert.ok(flatten(tiles).filter((t) => t.kind === "skill" && !t.assessable).length >= 4);
  // an integral by substitution, worked out with powers as multiplication (2³ as 2 × 3)
  const original = "gen:subst:0,2,1,1";
  const phases = d.recover(original, withBug(d, "multiply-for-power", "MATH.number.exponents"));
  assert.ok(phases.includes("investigate"), phases.join(" → "));
  assert.ok(phases.some((p) => p.endsWith(":MATH.number.exponents")), `recovery goes to powers (a Grade 7 skill): ${phases.join(" → ")}`);
  assert.equal(phases.at(-1), "solved_after_help");
  const rec = d.state().records;
  assert.ok(rec.teaching.some((t) => t.competency === "MATH.number.exponents"), "a strategy for powers was taught");
  // a different misunderstanding on the same kind of problem: the integration skill itself is taught
  const d2 = new Driver("synthetic-C2", T0);
  d2.enrol(12, "2026-27", r);
  const p2 = d2.recover("gen:subst:1,2,1,1", withBug(d2, "limits-not-changed", "MATH.calculus.integration-methods"));
  assert.ok(p2.some((p) => p === "teach:MATH.calculus.integration-methods"), p2.join(" → "));
  // and the same recovery mechanism serves a Grade 4 learner (7 × 8 inside a fraction problem)
  const d4 = new Driver("synthetic-C4", T0);
  d4.enrol(4, "2026-27", sampleReleases.find((x) => x.id === "openpath-sample-mathematics-grade-4")!);
  const p4 = d4.recover("gen:eqfrac:7,9,72", withBug(d4, "fact-slip:7x8", "MATH.number.multiplication-tables"));
  assert.ok(p4.some((p) => p.endsWith(":MATH.number.multiplication-tables")), p4.join(" → "));
});

// ---------------------------------------------------------------- D: long-term goals

test("D: IIT-JEE: a Grade 5 learner builds age-appropriate foundations; a Grade 12 learner works full problems and their parts", () => {
  const ev = new Driver("synthetic-D", T0).state().evidence;
  const g5 = overlay("jee-advanced", 5, assigned(sampleReleases.find((r) => r.grade === 5)!).map((a) => a.competency), ev)!;
  assert.ok(g5.foundations.length > 0 && g5.foundations.every((c) => graph.get(c).gradeRange[0] <= 5), "foundations from the learner's own year only");
  // decomposition by grade: the same advanced problem gives a Grade 8 learner suitable fragments, a Grade 12 learner the whole
  const p = problemOf("gen:subst:0,2,1,2")!;
  const at8 = decompose(p, 8);
  assert.equal(at8.full, false);
  assert.ok(at8.forGrade.length > 0 && at8.forGrade.every((s) => s.grade <= 8), "Grade 8: only the steps of its grade (powers)");
  assert.equal(decompose(p, 12).full, true, "Grade 12: the complete problem");
  // an exam plan at Grade 12 from the same evidence record (goals add nothing to it)
  const plan = examPlan("jee-advanced", ev, 40, 0.75)!;
  assert.ok(plan.sections.length > 0);
});

// ---------------------------------------------------------------- E: a previously unseen textbook

const UNSEEN = `Sample Board C — Mathematics for Class 9 (synthetic test book, not a real board; CC0)
Subject: Mathematics
Academic year 2026–27
Part One: Algebra
Chapter 1: Brackets and powers (pages 1 to 24)
1.1 Expanding brackets (page 2)
By the end of this section learners can:
• expand brackets such as 3(x + 4) using the distributive property (page 3)
1.2 Powers (page 12)
By the end of this section learners can:
• work out powers such as 2⁵ (page 13)
Part Two: Geometry
Chapter 2: Constructions (pages 25 to 40)
By the end of this chapter learners can:
• construct the perpendicular bisector of a line segment (page 26)
• describe how a rainbow forms (page 30)
`;

test("E: an unseen textbook goes through the same pipeline with no new code; its modules are validated and reviewed the same way", async () => {
  fixtureOff();
  const doc = await extract({ text: UNSEEN });
  assert.equal(doc.provenance.extractor, "plain-text@1");
  assert.deepEqual(doc.chapters.map((c) => [c.unit?.title, c.title]), [["Algebra", "Brackets and powers"], ["Geometry", "Constructions"]]);
  const draft = synthesise(doc);
  assert.equal(draft.source.academicYear, "2026-27");
  const outs = allOutcomesOf(draft);
  const top = (text: string) => outs.find((o) => o.outcome.text.startsWith(text))!.outcome.mapping;
  assert.equal(top("expand brackets").competencies[0]?.id, "MATH.algebra.identities-intro");
  assert.equal(top("work out powers").competencies[0]?.id, "MATH.number.exponents");
  assert.equal(top("construct the perpendicular").competencies[0]?.id, "MATH.geometry.constructions-bisectors");
  assert.equal(top("describe how a rainbow").verdict, "missing", "not mathematics: a provisional proposal, never forced onto a skill");
  const r = review(draft, "accept-proposals", "account owner", new Date(T0).toISOString());
  const d = new Driver("synthetic-E", T0);
  d.events.push({ learnerId: d.learnerId, sessionId: d.session, kind: "learning_record", id: "e-cur", at: new Date(T0).toISOString(), record: "curriculum", release: r } as never);
  d.enrol(9, "2026-27", r);
  const tiles = d.state().summary!.tiles;
  const chain = path(tiles, ["Mathematics", "Algebra", "Brackets and powers", "Expanding brackets", "Expand simple products"]);
  assert.deepEqual(chain.map((t) => t.kind), ["subject", "unit", "chapter", "section", "skill"]);
  assert.equal(chain.at(-1)!.content!.level, "module");
  const bisector = flatten(tiles).find((t) => t.competency === "MATH.geometry.constructions-bisectors")!;
  assert.equal(bisector.content!.level, "none", "a construction skill has no module: shown as such");
  const cov = releaseCoverage(r);
  assert.equal(cov.extracted.sections, 2);
  assert.equal(cov.counts.approved, 0);
  // the module goes through review exactly as any other; once released (in a test registry) its questions validate,
  // so a learner can reach verified mastery on it; the repository registry is not changed
  const comp = "MATH.algebra.identities-intro";
  const m = modules.find((x) => x.competency === comp)!;
  const at = new Date(T0).toISOString();
  let e = submit(sync(undefined, m, "OpenPath (written with AI assistance; not educator-reviewed)", at), "eng", at, validateModule(m));
  e = releaseModule(decide(e, { by: "A. Teacher (test identity)", role: "educator" }, "approve", at, "checked"), "release manager (test)", "2020-01-01T00:00:00Z");
  const testRegistry: Registry = { ...registry, entries: [e] };
  useRegistry(testRegistry);
  try {
    d.work(comp, right);
    d.newSession(7.1);
    d.work(comp, right);
    assert.equal(d.state().evidence(comp).status, "verified", "released content can verify");
  } finally {
    useRegistry(null);
  }
  assert.notEqual(d.state().evidence(comp).status, "verified", "the repository's registry: nothing released, nothing verified");
});

// ---------------------------------------------------------------- F: academic transition

test("F: Grade 10 → Grade 12: every record kept, valid evidence carried over, a newly synthesised plan", () => {
  fixtureOff();
  const d = new Driver("synthetic-F", T0);
  d.enrol(10, "2026-27", byId(G10B));
  d.work("MATH.algebra.identities", right);
  const before = d.state().evidence("MATH.algebra.identities");
  assert.ok(["independent", "transfer"].includes(before.status));
  const n = d.events.length;
  d.newSession(240);
  d.enrol(12, "2027-28", byId(G12));
  const st = d.state();
  assert.equal(st.enrolment!.grade, 12);
  assert.equal(st.release!.id, G12);
  assert.equal(d.events.slice(0, n).length, n, "nothing removed");
  assert.deepEqual(years(st.records).map((y) => [y.grade, y.academicYear]), [[10, "2026-27"], [12, "2027-28"]]);
  // evidence is the learner's, not the year's: still shown, and its delayed check (long overdue) comes first
  assert.equal(st.evidence("MATH.algebra.identities").independentAt, before.independentAt);
  assert.equal(st.next!.kind, "retention", "a delayed check from last year comes back whatever the year");
  assert.equal(st.next!.competency, "MATH.algebra.identities");
  // the new year's plan is the new book's: its skills, its hierarchy
  assert.ok(flatten(st.summary!.tiles).some((t) => t.title === "Techniques of integration" || t.title.endsWith("Techniques of integration")));
  d.work("MATH.algebra.identities", right);
  assert.equal(d.state().next!.kind, "start");
  assert.ok(graph.get(d.state().next!.competency!).gradeRange[1] >= 11, "next: a Grade 12 skill of the new book");
  void DAY;
});

// ---------------------------------------------------------------- coverage

test("coverage: eight categories reported separately; complete platform ≠ complete content", () => {
  const g = graphCoverage();
  assert.equal(g.module, modules.filter((m) => validateModule(m).length === 0).length);
  assert.ok(g.module < g.total / 4, "most competencies have no module yet: the report must say so");
  assert.equal(g.counts.approved, 0);
  for (const r of sampleReleases) {
    const c = releaseCoverage(r as CurriculumRelease);
    assert.equal(c.counts.module + c.counts.partial + c.counts.none, c.counts.total);
    for (const k of CATEGORIES) assert.ok(c.counts[k] <= c.counts.total);
    assert.ok(c.mapping.accepted <= c.extracted.outcomes);
  }
});
