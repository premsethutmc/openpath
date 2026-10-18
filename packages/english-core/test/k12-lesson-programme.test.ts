/**
 * K12: the fixed, multi-session lesson programme. Completion is learning progress read from the ledger's lesson
 * records: kept apart from demonstrated understanding and verified mastery, never reduced when assessment content is
 * missing, fixed by the first journey (a later content change does not rewrite it), and carried into a second essay.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  analyseEssay,
  competencyOutcome,
  createJourney,
  type EssayEvaluator,
  essayProfile,
  ESSAY_OBSERVE_PROTOCOL_V2,
  ESSAY_REWRITE_PROTOCOL_V2,
  gapHypotheses,
  journeyStatus,
  Ledger,
  type LedgerEvent,
  lessonProgramme,
  nextProgrammeLesson,
  planDiagnosticFor,
  submitEssay,
  verificationAvailability,
} from "../src/index.ts";
import { loadAppEssayContext } from "../../../tools/english/essay-load.ts";

const PLU = "EN.GRM.NOUN.plurals_countability";
const LEARNER = "learner:k12";
const FX = JSON.parse(readFileSync(new URL("../../../frontend/e2e/fixtures/essay-diagnostic-workflow.json", import.meta.url), "utf8")) as { essays: Record<string, { text: string; prompt: string; marker: string }>; observations: Record<string, unknown[]> };
const model: EssayEvaluator = {
  id: "openpath-gateway:llm",
  version: "essay-llm@1",
  model: "mock-model",
  protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 },
  async observe(req) {
    const k = Object.keys(FX.essays).find((x) => req.essay.text.includes(FX.essays[x].marker))!;
    return { essay_id: req.essay.id, rubric: req.rubric, observations: FX.observations[k], not_observable: [] };
  },
  async rewrite() {
    throw new Error("not used");
  },
};
const T0 = Date.parse("2026-10-19T09:00:00.000Z");

test("K12 lessons: completed over several sessions, kept apart from evidence, never erased by missing content, carried into a second essay", async () => {
  const ectx = loadAppEssayContext();
  const events: LedgerEvent[] = [];
  let n = 0;
  let t = T0;
  const meta = (session: string) => ({ id: `k12:${++n}`, at: new Date((t += 60_000)).toISOString(), session });
  const essay = async (key: string, id: string) => {
    events.push(submitEssay(ectx, events, meta("s0"), { essayId: id, learner: LEARNER, text: FX.essays[key].text, source: { kind: "typed", dataUse: "synthetic_test", prompt: FX.essays[key].prompt } }).event);
    events.push((await analyseEssay(ectx, events, model, id, meta("s0"))).event);
  };
  await essay("karthik", "essay:1");
  const h = gapHypotheses(ectx, events).find((x) => x.competency === PLU)!;
  const d = planDiagnosticFor(ectx, events, h.id, meta("s0"));
  events.push(d.event);
  for (const i of d.request.items.slice(0, 2)) {
    const m = meta("s0");
    events.push({ kind: "evidence", id: m.id, at: m.at, session: "s0", item: { id: i.id, version: i.version }, response: { kind: "typed", text: "zzzq" }, use: "assessment", provenance: { schema: "provenance@1", attempt: 1, hints: [], afterFeedback: false, policies: [] } });
  }
  const j = createJourney(ectx, events, meta("s1"), "essay:1");
  events.push(j.event);
  const programme = j.journey.trees.find((x) => x.root === PLU)!.nodes[0].steps[0].content.refs;
  assert.equal(programme.length, 5);
  const before = JSON.stringify(Ledger.rebuild(ectx.ctx, LEARNER, events).composite.nodes[PLU]);
  const read = (id: string, session: string) => {
    const m = meta(session);
    events.push({ kind: "intervention", id: m.id, at: m.at, session, capability: PLU, strategy: "lesson", content: id });
  };
  // three sessions on three days
  read(programme[0], "s1");
  t += 86_400_000;
  read(programme[1], "s2");
  read(programme[2], "s2");
  let p = lessonProgramme(ectx, events, PLU)!;
  assert.deepEqual([p.completed, p.total, p.percent, p.sessions, p.fixedBy], [3, 5, 60, 2, j.journey.id]);
  assert.equal(nextProgrammeLesson(ectx, events, PLU), programme[3]);
  t += 86_400_000;
  read(programme[3], "s3");
  read(programme[4], "s3");
  read(programme[0], "s3"); // reading a lesson again changes nothing
  p = lessonProgramme(ectx, events, PLU)!;
  assert.deepEqual([p.completed, p.percent, p.sessions], [5, 100, 3]);
  assert.equal(nextProgrammeLesson(ectx, events, PLU), null);
  // learning progress is not evidence: no estimate moved, nothing is shown or verified
  assert.equal(JSON.stringify(Ledger.rebuild(ectx.ctx, LEARNER, events).composite.nodes[PLU]), before);
  const now = new Date(t).toISOString();
  const prof = essayProfile(ectx, LEARNER, events, now).competencies.find((c) => c.competency === PLU)!;
  assert.equal(prof.lessons?.percent, 100);
  assert.ok(!["demonstrated", "verified"].includes(prof.state), "all lessons complete, awaiting verification");
  // the missing check content blocks verification, never the completed lessons
  const st = journeyStatus(ectx, events, j.journey.id, now);
  const node = st.trees.find((x) => x.root === PLU)!.nodes[0];
  assert.equal(node.steps[0].status, "done");
  assert.equal(node.steps[2].status, "blocked");
  const o = competencyOutcome(ectx, events, PLU, now, st);
  assert.deepEqual([o.demonstrated, o.verified], [false, false]);
  assert.equal(verificationAvailability(ectx, events, PLU).available, false, "verification is unavailable, and says so");
  // a second essay and a second journey: the completion history is carried, with its dates
  t += 7 * 86_400_000;
  await essay("second", "essay:2");
  const j2 = createJourney(ectx, events, meta("s4"), "essay:2");
  events.push(j2.event);
  const p2 = lessonProgramme(ectx, events, PLU)!;
  assert.deepEqual(p2, p, "the programme and its history are unchanged by the next essay");
  // a later change to the app's lesson list does not rewrite the fixed programme
  const changed = { ...ectx, lessons: new Map([...ectx.lessons].map(([k, v]) => [k, k === PLU ? v.slice(0, 2) : v])) };
  assert.deepEqual(lessonProgramme(changed, events, PLU), p);
});
