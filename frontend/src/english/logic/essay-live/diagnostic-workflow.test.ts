/**
 * ESSAY-DIAG: the two-track essay workflow through the app's real learner record, with a mocked server (the model's
 * outputs come from e2e/fixtures/essay-diagnostic-workflow.json). Karthik's Grade 8 essay about the Chithirai Festival
 * → suspected plural errors with quotes → FORMAL bank diagnostic (confirms the gap; counted by the engine) → PRACTICE
 * on five fresh model-written questions (formative; held; decides nothing) → lesson and guided practice → the
 * independent recheck, blocked by missing reviewed content and said so → reload → second essay → a week later.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { QuestionRequest } from "../../../../../packages/english-core/src/index.ts";
import { loadContent } from "../content.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { rightAnswer, wrongAnswer } from "../test-helpers.ts";
import { estimateLabel, evidenceLabel, formativeLabel } from "./evidence-labels.ts";
import { connectEvaluator, EssayStudio, STUDIO_PROFILE_ID, STUDIO_PROFILE_NAME } from "./studio.ts";

const FX = JSON.parse(readFileSync(new URL("../../../../e2e/fixtures/essay-diagnostic-workflow.json", import.meta.url), "utf8")) as {
  essays: Record<string, { text: string; prompt: string; marker: string }>;
  observations: Record<string, unknown[]>;
  questions: Record<string, { stem: string }[][]>;
};
const content = loadContent();
const PLU = "EN.GRM.NOUN.plurals_countability";
const SVA = "EN.GRM.VERB.sva";
const DAY = 86_400_000;
const INFO = { available: true, id: "openpath-gateway:llm", version: "essay-llm@1", model: "mock-model", rubric: "openpath.g8-writing@2", protocols: { observe: "essay-observe.v2" as const, rewrite: "essay-rewrite.v2" as const, questions: "essay-questions.v1" as const } };

function testClock(start = "2026-10-19T09:00:00.000Z") {
  let t = Date.parse(start);
  const clock = () => ((t += 60_000), new Date(t).toISOString());
  clock.days = (n: number) => void (t += n * DAY);
  return clock;
}

/** The server, with a mocked model behind it: the fixture's observations and question sets. */
function mockServer() {
  const requests: QuestionRequest[] = [];
  return {
    requests,
    essayEvaluatorStatus: async () => INFO,
    essayEvaluate: async (body: { task: "observe" | "rewrite" | "questions"; request: unknown; data_use: "synthetic_test" }) => {
      assert.equal(body.data_use, "synthetic_test");
      const protocol = INFO.protocols[body.task];
      const evaluator = { id: INFO.id, version: INFO.version, model: INFO.model, rubric: INFO.rubric, protocol };
      if (body.task === "questions") {
        const req = body.request as QuestionRequest;
        requests.push(req);
        const rounds = FX.questions[req.competency.id];
        const round = rounds.find((r) => !r.some((q) => req.avoid.includes(q.stem))) ?? rounds[0];
        return { output: { request_id: req.request_id, competency: req.competency.id, questions: structuredClone(round) }, evaluator };
      }
      const req = body.request as { essay: { id: string; text: string }; rubric: string };
      const key = Object.keys(FX.essays).find((k) => req.essay.text.includes(FX.essays[k].marker));
      return { output: { essay_id: req.essay.id, rubric: req.rubric, observations: key ? FX.observations[key] : [], not_observable: [] }, evaluator };
    },
  };
}

test("ESSAY-DIAG two tracks: bank diagnosis confirms, model practice is formative only, verification unavailability is stated, the profile persists", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const server = mockServer();
  const learner = await Learner.create(content, repo, STUDIO_PROFILE_NAME, "guardian", clock, STUDIO_PROFILE_ID);
  let studio = new EssayStudio(learner, await connectEvaluator(server));
  assert.ok(studio.canGenerate);

  // essay → suspected plural errors, with quotes
  let v = await studio.submit(FX.essays.karthik.text, { kind: "typed", prompt: FX.essays.karthik.prompt });
  assert.equal(v.analysedBy, "llm");
  assert.deepEqual(v.analysis!.observations.filter((o) => o.competency === PLU).map((o) => o.span.quote), ["thousands of peoples", "many village", "Many womans", "the childrens", "bangle and wooden toys", "two box of jasmine"]);
  const hyp = v.hypotheses.find((h) => h.competency === PLU)!;
  assert.equal(hyp.status, "suspected");
  assert.equal(v.diagnostics.length, 0, "nothing is asked until the learner chooses");
  assert.equal(v.recommendation?.kind, "check_skill", "the formal track first");
  assert.equal(v.recommendation?.competency, PLU);
  assert.equal(v.recommendation?.verification?.available, false);
  let p = v.profile.competencies.find((c) => c.competency === PLU)!;
  assert.equal(evidenceLabel(p).key, "suspected");
  assert.match(estimateLabel(p), /none yet/);

  // formal track: an independent diagnostic on eligible, unseen bank questions
  v = await studio.checkSkill(hyp.id);
  const asked: string[] = [];
  for (; v.nextDiagnostic; ) {
    const item = v.nextDiagnostic.item;
    assert.ok(!item.id.startsWith("gen."), "bank questions only");
    asked.push(item.id);
    v = (await studio.answerDiagnostic(wrongAnswer(item))).view;
  }
  assert.ok(asked.length >= 2 && asked.every((id) => id.startsWith("grm.plu.")));
  const d = v.diagnostics.find((x) => x.request.competency === PLU)!;
  assert.equal(d.outcome.status, "confirmed");
  assert.ok(d.outcome.answers.every((a) => a.verdict === "accepted"), "counted by the engine's existing rules");
  p = v.profile.competencies.find((c) => c.competency === PLU)!;
  assert.equal(evidenceLabel(p).key, "confirmed");
  assert.ok(p.engine.estimate && p.engine.estimate.mean < 5, "an estimated level from counted answers, below the target");
  const node0 = JSON.stringify(learner.state.ledger.composite.nodes[PLU]);

  // practice track: five fresh model-written questions; formative only
  const g = await studio.practise(hyp.id);
  assert.equal(g.set.status, "accepted", JSON.stringify(g.set.rejected));
  v = g.view;
  assert.equal(v.nextPractice?.total, 5);
  assert.equal(v.stage, "diagnose");
  const practised: string[] = [];
  for (let k = 0; v.nextPractice; k++) {
    practised.push(v.nextPractice.item.id);
    v = (await studio.answerPractice(k < 3 ? wrongAnswer(v.nextPractice.item) : rightAnswer(v.nextPractice.item))).view;
  }
  assert.equal(practised.length, 5);
  for (const id of practised) {
    const e = learner.events.find((x) => x.kind === "evidence" && x.item.id === id)!;
    assert.equal(e.kind === "evidence" && e.provenance?.schema, "provenance@1");
    assert.equal(learner.state.ledger.decisions.find((x) => x.source === e.id)?.verdict, "held");
  }
  p = v.profile.competencies.find((c) => c.competency === PLU)!;
  assert.equal(p.formative?.status, "difficulty");
  assert.match(formativeLabel(p)!, /2 of 5 right. Formative only/);
  assert.equal(p.gap?.status, "confirmed", "practice decides nothing about the gap");
  assert.equal(JSON.stringify(learner.state.ledger.composite.nodes[PLU]), node0, "practice never moves the estimate");
  assert.equal(p.provenance.provisional.length, 5);

  // next activity: learn; verification stated as unavailable
  assert.equal(v.recommendation?.kind, "learn");
  assert.match(v.recommendation!.verification!.reason, /Mastery verification is not available/);
  v = await studio.plan();
  assert.equal(v.journey!.trees[0].root, PLU);
  for (let guard = 0; guard < 20 && v.next; guard++) {
    const n = v.next;
    if (n.node.competency !== PLU) break;
    v = n.step.kind === "teach" ? await studio.readLesson(n.lesson!.id, true) : (await studio.answerStep(rightAnswer(n.item!))).view;
  }
  const node = v.journey!.trees[0].nodes[0];
  assert.deepEqual(node.steps.map((x) => `${x.kind}:${x.status}`), ["teach:done", "guided_practice:done", "independent_check:blocked"]);
  assert.ok(node.steps[1].content.refs.every((r) => r.startsWith("grm.plu.")), "guided practice prefers the bank");
  const o = v.outcomes.find((x) => x.competency === PLU)!;
  assert.deepEqual([o.demonstrated, o.verified, o.retention], [false, false, "not_applicable"]);
  assert.match(o.pending!, /more reviewed questions are needed/);

  // reload: the same profile from the same record
  // (the estimate's sd widens with elapsed time, as the engine's time model says; everything else is identical)
  const strip = (x: unknown) => JSON.stringify(x, (k, val) => (k === "asOf" || k === "sd" ? undefined : val));
  const reopened = await Learner.open(content, repo, STUDIO_PROFILE_ID, clock);
  studio = new EssayStudio(reopened, await connectEvaluator(server));
  assert.equal(strip(studio.view().profile), strip(v.profile));

  // a second essay a week later: the earlier evidence informs it; still no verification and no retention claim
  clock.days(7);
  v = await studio.submit(FX.essays.second.text, { kind: "typed", prompt: FX.essays.second.prompt });
  const h2 = v.hypotheses.filter((h) => h.competency === PLU).at(-1)!;
  assert.equal(h2.status, "suspected");
  assert.match(h2.basis.join(" "), /earlier essay/);
  assert.match(v.recommendation!.history.join(" "), /essay:1: confirmed/);
  const p2 = v.profile.competencies.find((c) => c.competency === PLU)!;
  assert.notEqual(p2.state, "verified");
  assert.equal(v.outcomes.find((x) => x.competency === PLU)?.retention ?? "not_applicable", "not_applicable");
  const g2 = await studio.practise(h2.id);
  assert.equal(g2.set.status, "accepted");
  for (const id of practised) assert.ok(server.requests[1].avoid.includes((reopened.content.ctx.content.items.get(id) as { prompt: string }).prompt));
});

test("ESSAY-DIAG without a question writer, bank diagnostics are planned at once and no practice can be generated", async () => {
  const learner = await Learner.create(content, new MemoryRepo(), STUDIO_PROFILE_NAME, "guardian", testClock(), STUDIO_PROFILE_ID);
  const studio = new EssayStudio(learner);
  assert.equal(studio.canGenerate, false);
  const v = await studio.submit(FX.essays.karthik.text);
  assert.equal(v.analysedBy, "patterns");
  await assert.rejects(() => studio.practise(v.hypotheses[0]?.id ?? "x"), /server's evaluator/);
});
