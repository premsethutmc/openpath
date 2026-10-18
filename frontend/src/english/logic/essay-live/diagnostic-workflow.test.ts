/**
 * ESSAY-DIAG: the essay-to-diagnostic workflow through the app's real learner record, with a mocked server (the
 * model's outputs come from e2e/fixtures/essay-diagnostic-workflow.json). Karthik's Grade 8 essay about the
 * Chithirai Festival → suspected competencies with quotes → five fresh questions on plurals → answers recorded with
 * provenance and held by the engine → provisional profile updated → next activity → reload → second essay.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { QuestionRequest } from "../../../../../packages/english-core/src/index.ts";
import { loadContent } from "../content.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { rightAnswer, wrongAnswer } from "../test-helpers.ts";
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

test("ESSAY-DIAG Karthik's essay → five fresh questions → held evidence → provisional profile → next activity → reload → second essay", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const server = mockServer();
  const learner = await Learner.create(content, repo, STUDIO_PROFILE_NAME, "guardian", clock, STUDIO_PROFILE_ID);
  let studio = new EssayStudio(learner, await connectEvaluator(server));
  assert.ok(studio.canGenerate);

  // 1–3. an arbitrary typed essay, analysed by the server's (mocked) model; the dashboard's competencies and quotes
  let v = await studio.submit(FX.essays.karthik.text, { kind: "typed", prompt: FX.essays.karthik.prompt });
  assert.equal(v.analysedBy, "llm");
  assert.equal(v.analysis!.status, "accepted");
  const plural = v.analysis!.observations.filter((o) => o.competency === PLU);
  assert.deepEqual(plural.map((o) => o.span.quote), ["thousands of peoples", "many village", "Many womans", "the childrens", "bangle and wooden toys", "two box of jasmine"]);
  assert.equal(v.hypotheses.find((h) => h.competency === PLU)?.status, "suspected");
  assert.equal(v.hypotheses.find((h) => h.competency === SVA)?.status, "suspected");
  assert.equal(v.diagnostics.length, 0, "with a question writer, nothing is asked until the learner chooses");
  assert.equal(v.recommendation?.kind, "check_skill");

  // 4. choose plurals: five fresh questions, checked and provisional
  const hyp = v.hypotheses.find((h) => h.competency === PLU)!;
  const g = await studio.generateQuestions(hyp.id);
  assert.equal(g.set.status, "accepted", JSON.stringify(g.set.rejected));
  v = g.view;
  assert.equal(v.nextDiagnostic?.total, 5);
  assert.ok(v.nextDiagnostic!.item.id.startsWith("gen."));
  assert.equal(v.stage, "diagnose");

  // 5–6. answer them (three wrong, two right): evidence with item ids, competency and provenance, held by the engine
  const before = JSON.stringify(learner.state.ledger.composite.nodes[PLU]);
  const asked: string[] = [];
  for (let k = 0; v.nextDiagnostic; k++) {
    const item = v.nextDiagnostic.item;
    asked.push(item.id);
    v = (await studio.answerDiagnostic(k < 3 ? wrongAnswer(item) : rightAnswer(item))).view;
  }
  assert.equal(asked.length, 5, "all five generated questions are asked");
  const evidence = learner.events.filter((e) => e.kind === "evidence" && asked.includes(e.item.id));
  assert.equal(evidence.length, 5);
  for (const e of evidence) {
    if (e.kind !== "evidence") continue;
    assert.equal(e.provenance?.schema, "provenance@1");
    assert.equal(learner.content.ctx.content.items.get(e.item.id)?.kind === "code" && (learner.content.ctx.content.items.get(e.item.id) as { target: string }).target, PLU);
    const d = learner.state.ledger.decisions.find((x) => x.source === e.id)!;
    assert.equal(d.verdict, "held");
    assert.equal(d.capability, PLU);
  }
  assert.equal(JSON.stringify(learner.state.ledger.composite.nodes[PLU]), before, "no estimate moved");
  const d = v.diagnostics.find((x) => x.request.competency === PLU)!;
  assert.equal(d.request.source, "generated");
  assert.equal(d.outcome.status, "confirmed");
  const prof = v.profile.competencies.find((c) => c.competency === PLU)!;
  assert.equal(prof.gap?.status, "confirmed");
  assert.notEqual(prof.state, "verified");
  assert.notEqual(prof.state, "demonstrated");
  assert.equal(prof.provenance.held.length, 5);

  // 7. the next activity
  assert.equal(v.recommendation?.kind, "learn");
  assert.equal(v.recommendation?.competency, PLU);
  v = await studio.plan();
  assert.equal(v.journey!.trees[0].root, PLU, "the confirmed gap comes first on the path");
  assert.deepEqual(v.journey!.trees[0].nodes[0].steps.map((s) => s.kind), ["teach", "guided_practice", "independent_check"]);
  const journeyRefs = v.journey!.trees.flatMap((t) => t.nodes.flatMap((n) => n.steps.flatMap((s) => (s.kind === "teach" ? [] : s.content.refs))));
  assert.ok(journeyRefs.every((r) => !r.startsWith("gen.")), "generated questions are never reused for practice or checks");

  // 8. reload: a new learner object from the same repository gives the same profile (the questions are in the record)
  const strip = (x: unknown) => JSON.stringify(x, (k, val) => (k === "asOf" ? undefined : val));
  const reopened = await Learner.open(content, repo, STUDIO_PROFILE_ID, clock);
  studio = new EssayStudio(reopened, await connectEvaluator(server));
  const again = studio.view();
  assert.equal(strip(again.profile), strip(v.profile));
  assert.equal(again.diagnostics.find((x) => x.request.competency === PLU)?.outcome.status, "confirmed");
  assert.ok(reopened.content.ctx.content.items.has(asked[0]), "the generated questions are rebuilt from the record");

  // 9. a second essay a week later: the earlier evidence informs the new journey
  clock.days(7);
  v = await studio.submit(FX.essays.second.text, { kind: "typed", prompt: FX.essays.second.prompt });
  const h2 = v.hypotheses.filter((h) => h.competency === PLU).at(-1)!;
  assert.equal(h2.status, "suspected", "one error, suspected because an earlier essay showed the same");
  assert.match(h2.basis.join(" "), /earlier essay/);
  assert.equal(v.recommendation?.kind, "check_skill");
  assert.match(v.recommendation!.history.join(" "), /essay:1: confirmed/);
  const g2 = await studio.generateQuestions(h2.id);
  assert.equal(g2.set.status, "accepted", JSON.stringify(g2.set.rejected));
  for (const id of asked) assert.ok(server.requests[1].avoid.includes(reopened.content.ctx.content.items.get(id)!.kind === "code" ? (reopened.content.ctx.content.items.get(id) as { prompt: string }).prompt : ""), "the first set is avoided");
  v = g2.view;
  for (; v.nextDiagnostic; ) {
    assert.ok(!asked.includes(v.nextDiagnostic.item.id), "no question is asked twice");
    v = (await studio.answerDiagnostic(rightAnswer(v.nextDiagnostic.item))).view;
  }
  assert.equal(v.hypotheses.filter((h) => h.competency === PLU).at(-1)!.status, "weakened");
  assert.equal(v.recommendation?.kind, "write_again");
  const p2 = v.profile.competencies.find((c) => c.competency === PLU)!;
  assert.equal(p2.provenance.held.length, 10, "both sets' answers are kept, all held");
  assert.notEqual(p2.state, "verified");
});

test("ESSAY-DIAG without a question writer, the bank diagnostics run as before and nothing is generated", async () => {
  const learner = await Learner.create(content, new MemoryRepo(), STUDIO_PROFILE_NAME, "guardian", testClock(), STUDIO_PROFILE_ID);
  const studio = new EssayStudio(learner);
  assert.equal(studio.canGenerate, false);
  const v = await studio.submit(FX.essays.karthik.text);
  assert.equal(v.analysedBy, "patterns");
  await assert.rejects(() => studio.generateQuestions(v.hypotheses[0]?.id ?? "x"), /server's evaluator/);
});
