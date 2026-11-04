/**
 * Diagnosis worker (m112), geometry: where recovery sends a learner after a wrong angle answer it cannot explain.
 *
 * Baseline 9830b27e: a slip on a complementary / supplementary pair (afpair) walked the expansion@1 support
 * "angle pairs < Use angles with parallel lines" (a Grade 7 skill that itself builds on angle pairs) and on to its mandatory
 * prerequisite "Use elementary triangle properties" ("This problem rests on a skill that is not shown yet: Use elementary
 * triangle properties"). A slip on an isosceles triangle (ahiso, no step labels) followed the 1.1.0 edge triangle properties <
 * "Construct simple figures with ruler and compass". Neither is needed for the question the learner got wrong.
 * Fix (relation audit, recovery only): graph-audit 1.1.2 disputes both; the mandatory graph, chapters and evidence are unchanged.
 * Synthetic learners only; the engine asks, teaches and recovers.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { runScenario, type Run } from "./scenarios";
import { right, wrong, type Learner } from "./learners";
import { problemOf } from "../../../packages/learning/src/families";
import { question } from "../../../packages/learning/src/content";
import { graph, walkSupports } from "../../../packages/learning/src/graph";

const PAIRS = "MATH.geometry.angle-pairs", TRI = "MATH.geometry.triangle-properties", PAR = "MATH.geometry.parallel-angles", CONS = "MATH.geometry.basic-constructions";
const famIs = (f: string) => (q: string) => problemOf(q.replace(/:(mc|w)$/, ""))?.family === f;
/** wrong (an answer no modelled mix-up predicts) on one family until something has been taught; right everywhere else unless `elsewhere` */
const careless = (on: (q: string) => boolean, elsewhere: (q: string) => boolean = () => false): Learner => ({ name: "careless", act: (v) => ({ answer: (v.taught === 0 && on(v.q)) || elsewhere(v.q) ? wrong(v.q) : right(v.q) }) });
const asked = (r: Run) => r.f.session.events.filter((e) => (e as { record?: string }).record === "attempt").map((e) => (e as { questionId: string }).questionId);
const askedOn = (r: Run, c: string) => asked(r).filter((q) => graph.evidenceTarget(question(q).competency) === c);
const taughtOn = (r: Run, c: string) => (r.f.session.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; strategy: string }[]).filter((t) => graph.evidenceTarget(t.competency) === c).map((t) => t.strategy);
const recoveryReasons = (r: Run) => r.f.session.trace.filter((t) => t.component === "intervention.recovery").map((t) => (t.output as { reason: string }).reason);

test("a slip on a complementary/supplementary pair is not followed to parallel lines or the triangle angle sum", () => {
  const r = runScenario({ id: "diag-geo-afpair", category: 2, start: "gen:afpair:1,29", entry: "practice", expect: {}, learner: () => careless(famIs("afpair")) });
  assert.deepEqual(askedOn(r, PAR), [], "no question on angles with parallel lines (Grade 7, builds on angle pairs)");
  assert.deepEqual(askedOn(r, TRI), [], "no question on the triangle angle sum");
  for (const why of recoveryReasons(r)) assert.doesNotMatch(why, /parallel lines|triangle properties/, why);
});

test("a learner also unsure on parallel lines is never taught a parallel-lines or triangle lesson for an angle-pair slip", () => {
  const r = runScenario({ id: "diag-geo-afpair-weak", category: 2, start: "gen:afpair:1,29", entry: "practice", expect: {},
    learner: () => careless(famIs("afpair"), (q) => [PAR, TRI].includes(graph.evidenceTarget(question(q).competency))) });
  assert.deepEqual(taughtOn(r, PAR), [], "no parallel-lines lesson");
  assert.deepEqual(taughtOn(r, TRI), [], "no triangle lesson");
});

test("a slip on an isosceles triangle is not sent to ruler-and-compass constructions", () => {
  const r = runScenario({ id: "diag-geo-ahiso", category: 2, start: "gen:ahiso:62,0", entry: "practice", expect: {}, learner: () => careless(famIs("ahiso")) });
  assert.deepEqual(askedOn(r, CONS), [], "no construction task");
  for (const why of recoveryReasons(r)) assert.doesNotMatch(why, /ruler and compass/, why);
});

test("only recovery changes: the mandatory graph and the unaudited view keep both relations (chapters, records and replay unchanged)", () => {
  assert.ok(graph.prerequisitesOf(TRI).includes(CONS));
  assert.ok(walkSupports(TRI, 1, { audit: false }).some((s) => s.id === CONS));
  assert.ok(walkSupports(PAIRS, 1, { audit: false }).some((s) => s.id === PAR));
  assert.ok(!walkSupports(PAIRS, 3).some((s) => s.id === PAR || s.id === TRI), walkSupports(PAIRS, 3).map((s) => s.id).join());
  assert.ok(!walkSupports(TRI, 3).some((s) => s.id === CONS));
  // what angle pairs still checks: measuring angles and lines (both below it)
  assert.deepEqual(walkSupports(PAIRS, 1).map((s) => s.id).sort(), ["MATH.geometry.angle-measure", "MATH.geometry.lines-segments"]);
});
