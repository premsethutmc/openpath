/**
 * The essay integration acceptance test: the whole essay-to-mastery flow through the app's real learner record
 * (Learner → Repo → fold → core Ledger) and the core essay intelligence, with synthetic essays and recorded
 * evaluator outputs. Nothing here is scripted: every status is read back from the engine.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { engineClaim, type Item, type LedgerEvent, leafView } from "../../../../../packages/english-core/src/index.ts";
import { loadContent } from "../content.ts";
import { Learner, PilotRefusal } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { rightAnswer, wrongAnswer } from "../test-helpers.ts";
import { connectEvaluator, EssayStudio, SAMPLES, STUDIO_PROFILE_ID, STUDIO_PROFILE_NAME } from "./studio.ts";

const content = loadContent();
const SVA = "EN.GRM.VERB.sva";
const DAY = 86_400_000;

function testClock(start = "2026-10-18T09:00:00.000Z") {
  let t = Date.parse(start);
  const clock = () => {
    t += 60_000;
    return new Date(t).toISOString();
  };
  clock.days = (n: number) => void (t += n * DAY);
  return clock;
}

const itemIds = (events: LedgerEvent[]) => new Set(events.flatMap((e) => ("item" in e && e.item ? [e.item.id] : [])));

test("ESSAY-INT acceptance: essay → observations → diagnosis → profile → steps → rewrite → reload → second essay", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const learner = await Learner.create(content, repo, STUDIO_PROFILE_NAME, "guardian", clock, STUDIO_PROFILE_ID);
  let studio = new EssayStudio(learner);
  const [library, weekend] = SAMPLES.essays;

  // 1. submit a synthetic Grade 8 essay
  let v = await studio.submit(library.text);
  assert.equal(v.essay!.source.dataUse, "synthetic_test");
  assert.equal(v.essay!.source.profile, "openpath.g8-writing@1");
  assert.equal(learner.events.filter((e) => e.kind === "essay").length >= 2, true, "stored in the learner's own record");
  assert.ok((await repo.load(STUDIO_PROFILE_ID)).some((e) => e.kind === "essay"), "and in the repository");

  // 2. competency-linked observations, validated by the core
  assert.equal(v.analysedBy, "recorded");
  assert.equal(v.analysis!.status, "accepted");
  assert.ok(v.analysis!.observations.length >= 5);
  for (const o of v.analysis!.observations) {
    assert.ok(studio.ectx.profile.byCapability.has(o.competency), o.competency);
    assert.equal(library.text.slice(o.span.start, o.span.end), o.span.quote);
  }
  assert.equal(v.hypotheses.find((h) => h.competency === SVA)?.status, "suspected");
  assert.equal(v.stage, "diagnose");

  // 3. answer the diagnostic questions (real bank items, through the app's present/answer path)
  const beforeDiagnosis = [...studio.events];
  const asked: Item[] = [];
  for (let guard = 0; guard < 20 && v.nextDiagnostic; guard++) {
    const item = v.nextDiagnostic.item;
    asked.push(item);
    const wrong = v.nextDiagnostic.request.competency === SVA;
    v = (await studio.answerDiagnostic(wrong ? wrongAnswer(item) : rightAnswer(item))).view;
  }
  assert.equal(v.nextDiagnostic, null);
  assert.ok(asked.length >= 2);
  const sva = v.diagnostics.find((d) => d.request.competency === SVA)!;
  assert.equal(sva.outcome.status, "confirmed");
  assert.ok(sva.outcome.answers.every((a) => a.independent));
  const dep = v.diagnostics.find((d) => d.request.competency === "EN.GRM.PREP.dependent")!;
  assert.match(dep.request.contentGap!, /not specified/, "a missing question bank is reported, not filled");

  // 4. independent evidence changes the profile under the existing rules
  const updates = studio.updates(beforeDiagnosis);
  const u = updates.find((x) => x.competency === SVA)!;
  assert.equal(u.gapFrom, "suspected");
  assert.equal(u.gapTo, "confirmed");
  const accepted = sva.outcome.answers.map((a) => learner.state.ledger.decisions.find((d) => d.source === a.evidence)!);
  assert.ok(accepted.every((d) => d.verdict === "accepted" || d.verdict === "held"), "the engine decided each answer");
  assert.equal(u.estimateChanged, accepted.some((d) => d.verdict === "accepted"), "the estimate moves only when the engine accepted evidence");
  assert.ok(u.estimateChanged, "candidate bank questions are accepted evidence under the existing rules");
  assert.notEqual(v.profile.competencies.find((c) => c.competency === SVA)!.state, "verified");

  // 5. build the journey and complete every available step
  v = await studio.plan();
  const tree = v.journey!.trees.find((t) => t.root === SVA)!;
  assert.deepEqual(tree.nodes[0].steps.map((s) => s.kind), ["teach", "guided_practice", "independent_check"]);
  const blocked = v.journey!.trees.flatMap((t) => t.nodes.flatMap((n) => n.steps)).filter((s) => s.status === "blocked");
  assert.ok(blocked.length > 0, "dependent prepositions has no content: blocked, not invented");
  const used = itemIds(studio.events);
  assert.ok(tree.nodes[0].steps.filter((s) => s.kind !== "teach").every((s) => s.content.refs.every((r) => !used.has(r))), "unseen questions only");
  let sittings = 0;
  for (let guard = 0; guard < 30 && v.next; guard++) {
    const n = v.next;
    if (n.step.kind === "teach") v = await studio.readLesson(n.lesson!.id, true);
    else {
      if (n.newSitting) sittings++;
      v = (await studio.answerStep(rightAnswer(n.item!))).view;
    }
  }
  assert.equal(v.next, null);
  assert.equal(sittings, 1, "the check was asked in a new sitting, not straight after the lesson");
  const node = v.journey!.trees.find((t) => t.root === SVA)!.nodes[0];
  assert.deepEqual(node.steps.slice(0, 2).map((s) => s.status), ["done", "done"], "a lesson and practice are done, never green");
  const claim = engineClaim(studio.ectx, SVA, leafView(learner.state.ledger.composite, content.index, SVA, clock()));
  // the engine records "demonstrated" at band 4, below the draft Grade 8 target (band 5): done, not green
  assert.equal(claim.status, "demonstrated");
  assert.ok(claim.currentLevel! < claim.target!);
  assert.equal(node.green, false, "green only when the engine supports the grade target");
  assert.equal(node.steps[2].status, "done");
  assert.match(v.profile.competencies.find((c) => c.competency === SVA)!.notes.join(" "), /below the draft Grade 8 target/);
  const practice = node.steps[1].evidence.map((id) => learner.state.ledger.decisions.find((d) => d.source === id));
  assert.ok(practice.every((d) => !d || d.verdict === "held"), "practice answers are assisted: held, never an estimate change");
  assert.equal(v.stage, "rewrite");

  // 6. the 50-word rewrite
  const before = JSON.stringify(learner.state.ledger.composite.nodes);
  v = await studio.rewrite(SAMPLES.rewrites[0].text);
  assert.equal(v.rewrite!.status, "evaluated");
  assert.deepEqual(v.rewrite!.dimensions.map((d) => d.status), ["accepted", "accepted", "accepted", "accepted", "accepted"]);
  assert.equal(v.rewrite!.affectsEstimates, false);
  assert.equal(JSON.stringify(learner.state.ledger.composite.nodes), before, "a rewrite changes no estimate");
  assert.equal(v.stage, "done");

  // 7. reload: a new learner object from the same repository gives the same studio
  const strip = (x: unknown) => JSON.stringify(x, (k, val) => (k === "asOf" ? undefined : val));
  const reopened = await Learner.open(content, repo, STUDIO_PROFILE_ID, clock);
  studio = new EssayStudio(reopened);
  const reloaded = studio.view();
  assert.equal(strip(reloaded), strip(v));
  assert.equal(reloaded.stage, "done");
  assert.equal(reloaded.rewrite!.status, "evaluated");

  // 8. a second essay a week later: the earlier record shapes the next journey
  clock.days(7);
  const usedBefore = itemIds(studio.events);
  v = await studio.submit(weekend.text);
  const h = v.hypotheses.filter((x) => x.competency === SVA).at(-1)!;
  assert.equal(h.status, "suspected", "one error, but the earlier essay makes it a suspected gap, not a slip");
  assert.deepEqual(h.essays, ["essay:1", "essay:2"]);
  assert.match(h.basis.join(" "), /earlier essay/);
  for (let guard = 0; guard < 20 && v.nextDiagnostic; guard++) {
    assert.ok(!usedBefore.has(v.nextDiagnostic.item.id), "questions already used are never asked again");
    v = (await studio.answerDiagnostic(rightAnswer(v.nextDiagnostic.item))).view;
  }
  v = await studio.plan();
  const second = v.journey!;
  const refs = second.trees.flatMap((t) => t.nodes.flatMap((n) => n.steps.flatMap((s) => (s.kind === "teach" ? [] : s.content.refs))));
  assert.ok(refs.every((r) => !usedBefore.has(r)));
  // right without help this time: the gap is weakened and agreement is not retaught
  assert.equal(v.hypotheses.filter((x) => x.competency === SVA).at(-1)!.status, "weakened");
  assert.ok(!second.trees.some((t) => t.root === SVA));
  assert.match(second.skipped.find((x) => x.competency === SVA)!.reason, /right/);
  // the unresolved gap from the first essay (no questions exist for it) is still on the path, still blocked
  const carried = second.trees.find((t) => t.root === "EN.GRM.PREP.dependent")!;
  assert.ok(carried.nodes[0].steps.every((s) => s.status === "blocked"));
  assert.deepEqual(v.profile.essays.map((e) => e.id), ["essay:1", "essay:2"]);
});

test("ESSAY-INT second essay, wrong again: agreement is taught again with questions never used before", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const learner = await Learner.create(content, repo, STUDIO_PROFILE_NAME, "guardian", clock, STUDIO_PROFILE_ID);
  const studio = new EssayStudio(learner);
  let v = await studio.submit(SAMPLES.essays[0].text);
  while (v.nextDiagnostic) v = (await studio.answerDiagnostic(wrongAnswer(v.nextDiagnostic.item))).view;
  v = await studio.plan();
  const firstRefs = new Set(v.journey!.trees.flatMap((t) => t.nodes.flatMap((n) => n.steps.flatMap((s) => s.content.refs))));
  clock.days(7);
  v = await studio.submit(SAMPLES.essays[1].text);
  while (v.nextDiagnostic) v = (await studio.answerDiagnostic(wrongAnswer(v.nextDiagnostic.item))).view;
  assert.equal(v.hypotheses.filter((x) => x.competency === SVA).at(-1)!.status, "confirmed");
  v = await studio.plan();
  const node = v.journey!.trees.find((t) => t.root === SVA)!.nodes[0];
  assert.equal(node.level, "none");
  assert.deepEqual(node.steps.map((s) => s.kind), ["teach", "guided_practice", "independent_check"]);
  const newRefs = node.steps.filter((s) => s.kind !== "teach").flatMap((s) => s.content.refs);
  assert.ok(newRefs.length > 0);
  assert.ok(newRefs.every((r) => !firstRefs.has(r)), "the first journey's questions are never reused");
});

test("ESSAY-INT a rewrite with no connected evaluator is kept and held, never judged", async () => {
  const repo = new MemoryRepo();
  const learner = await Learner.create(content, repo, STUDIO_PROFILE_NAME, "guardian", testClock(), STUDIO_PROFILE_ID);
  const studio = new EssayStudio(learner);
  await studio.submit(SAMPLES.essays[0].text);
  const v = await studio.rewrite("Our library matters because reading helps everyone learn new words, and it should open on Sundays so more students can visit and borrow books together.");
  assert.equal(v.rewrite!.status, "held");
  assert.ok(v.rewrite!.dimensions.every((d) => d.status === "not_assessed" && d.rating === null));
});

test("ESSAY-INT other text goes to the pattern stand-in, labelled as such, through the same validation", async () => {
  const learner = await Learner.create(content, new MemoryRepo(), STUDIO_PROFILE_NAME, "guardian", testClock(), STUDIO_PROFILE_ID);
  const v = await new EssayStudio(learner).submit(
    "My brother go to school by bus every day. He say the bus is always late in the morning. We discuss about this problem at home. In order to arrive on time, my brother wake up early. I think the school should change the bus timetable for everyone.",
    { kind: "typed" },
  );
  assert.equal(v.analysedBy, "patterns");
  assert.equal(v.analysis!.status, "accepted");
  assert.ok(v.analysis!.observations.every((o) => o.evaluator.id === "openpath-studio"));
});

test("ESSAY-INT a pilot build refuses the essay studio before anything is recorded", async () => {
  const pilot = loadContent({ mode: "pilot" });
  const learner = await Learner.create(pilot, new MemoryRepo(), STUDIO_PROFILE_NAME, "guardian", testClock(), STUDIO_PROFILE_ID);
  const count = learner.events.length;
  await assert.rejects(new EssayStudio(learner).submit(SAMPLES.essays[0].text), PilotRefusal);
  assert.equal(learner.events.length, count);
});

// ---------------------------------------------------------------- the server's evaluator (Essay Intelligence v2)

const INFO = { available: true, id: "openpath-gateway:llm", version: "essay-llm@1", model: "test-model", rubric: "openpath.g8-writing@1", protocols: { observe: "essay-observe.v2" as const, rewrite: "essay-rewrite.v2" as const } };

/** A stand-in for the server: answers essay-observe.v2 from the recorded sample outputs, converted to v2. */
function fakeServer(opts: { fail?: boolean } = {}) {
  const calls: { task: string; data_use: string }[] = [];
  return {
    calls,
    essayEvaluatorStatus: async () => INFO,
    essayEvaluate: async (body: { task: "observe" | "rewrite"; request: unknown; data_use: "synthetic_test" }) => {
      calls.push({ task: body.task, data_use: body.data_use });
      if (opts.fail) throw new Error("OpenPath's server did not answer within 120 seconds.");
      const req = body.request as { essay?: { id: string; text: string }; rewrite?: { id: string } };
      const evaluator = { id: INFO.id, version: INFO.version, model: INFO.model, rubric: INFO.rubric, protocol: body.task === "observe" ? INFO.protocols.observe : INFO.protocols.rewrite };
      if (body.task === "rewrite") return { output: { ...(SAMPLES.rewrites[0].judgement as object), rewrite_id: req.rewrite!.id, rubric: INFO.rubric }, evaluator };
      const sample = SAMPLES.essays.find((s) => s.text === req.essay!.text)!;
      const v1 = sample.observations as { observations: { note: string; [k: string]: unknown }[] };
      const observations = v1.observations.map(({ note, ...o }) => ({ ...o, explanation: `In the quoted words: ${note}`, verification: o.kind === "error" ? "required" : "not_required" }));
      return { output: { essay_id: req.essay!.id, rubric: INFO.rubric, observations, not_observable: [] }, evaluator };
    },
  };
}

test("ESSAY-INT v2: with the server's evaluator connected, analyses and rewrites go through it and keep their provenance", async () => {
  const server = fakeServer();
  const evaluator = await connectEvaluator(server);
  assert.ok(evaluator);
  const learner = await Learner.create(content, new MemoryRepo(), STUDIO_PROFILE_NAME, "guardian", testClock(), STUDIO_PROFILE_ID);
  const studio = new EssayStudio(learner, evaluator);
  let v = await studio.submit(SAMPLES.essays[0].text);
  assert.equal(v.analysedBy, "llm");
  assert.equal(v.analysis!.evaluator.protocol, "essay-observe.v2");
  assert.equal(v.analysis!.evaluator.rubric, "openpath.g8-writing@1");
  assert.ok(v.analysis!.observations.every((o) => o.verification && o.note.startsWith("In the quoted words")));
  assert.equal(v.hypotheses.find((h) => h.competency === SVA)?.status, "suspected");
  assert.ok(server.calls.every((c) => c.data_use === "synthetic_test"));
  // any rewrite is judged by the server (not only the sample), and stays transfer evidence
  v = await studio.rewrite("Our library matters because reading helps everyone learn new words, and it should open on Sundays so more students can visit and borrow books together.");
  assert.equal(v.rewrite!.status, "evaluated");
  assert.equal(v.rewrite!.evidenceRole, "transfer");
  assert.equal(v.rewrite!.affectsEstimates, false);
});

test("ESSAY-INT v2: when the server's evaluator fails, the failure is recorded and the local fallback answers, labelled", async () => {
  const learner = await Learner.create(content, new MemoryRepo(), STUDIO_PROFILE_NAME, "guardian", testClock(), STUDIO_PROFILE_ID);
  const studio = new EssayStudio(learner, await connectEvaluator(fakeServer({ fail: true })));
  const v = await studio.submit(SAMPLES.essays[0].text);
  assert.equal(v.analysedBy, "recorded");
  assert.equal(v.failedAnalyses.length, 1);
  assert.match(v.failedAnalyses[0], /did not answer/);
  assert.equal(v.analysis!.status, "accepted");
  assert.equal(await connectEvaluator({ essayEvaluatorStatus: async () => { throw new Error("403"); }, essayEvaluate: async () => ({}) }), null, "not a developer: no server evaluator");
});
