/**
 * Policy @4 in the studio (synthetic data only): Karthik's plural journey through the app's real learner record. When
 * his planned delayed check fails, the review is recorded as soon as the last answer is given and shows in his
 * existing journey, before any new essay; the journey's own steps and completion percentage stay as they were.
 * The extra plural questions are TEST-ONLY stand-ins for reviewed bank questions (never shipped).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ESSAY_OBSERVE_PROTOCOL_V2, ESSAY_REWRITE_PROTOCOL_V2, extendContent, type Item } from "../../../../../packages/english-core/src/index.ts";
import { loadContent } from "../content.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { rightAnswer, wrongAnswer } from "../test-helpers.ts";
import { EssayStudio, STUDIO_PROFILE_ID, STUDIO_PROFILE_NAME } from "./studio.ts";

const PLU = "EN.GRM.NOUN.plurals_countability";
const DAY = 86_400_000;
const FX = JSON.parse(readFileSync(new URL("../../../../e2e/fixtures/essay-diagnostic-workflow.json", import.meta.url), "utf8")) as { essays: Record<string, { text: string }>; observations: Record<string, unknown[]> };

const extra = Array.from({ length: 16 }, (_, k) => {
  const common = { kind: "code" as const, id: `test.s13.${k + 1}`, version: 1, family: `test.s13.${k + 1}`, target: PLU, b: 5 + (k % 6) * 0.25, a: 1.2, prompt: `Test-only plural question ${k + 1}: the ___ were there.` };
  return k % 2 ? { ...common, format: "choice:grammar", options: ["childs", "children", "childrens"], answer: 1 } : { ...common, format: "typed:cloze", answers: [`answer${k + 1}`] };
}) as unknown as Item[];
const base = loadContent();
const content = { ...base, ctx: { ...base.ctx, content: extendContent(base.ctx.content, extra as never, base.index) } };

const karthikEvaluator = {
  id: "openpath-gateway:llm",
  version: "essay-llm@1",
  model: "mock-model",
  protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 },
  async observe(req: { essay: { id: string }; rubric: unknown }) {
    return { essay_id: req.essay.id, rubric: req.rubric, observations: req.essay.id === "essay:1" ? FX.observations.karthik : [], not_observable: [] };
  },
  async rewrite(): Promise<unknown> {
    throw new Error("not used");
  },
};

test("STUDIO-REVIEW a failed delayed check records the review at once, in Karthik's existing journey, without another essay", async () => {
  let t = Date.parse("2026-10-19T09:00:00.000Z");
  const clock = Object.assign(() => new Date((t += 60_000)).toISOString(), {});
  const days = (n: number) => void (t += n * DAY);
  const learner = await Learner.create(content, new MemoryRepo(), STUDIO_PROFILE_NAME, "guardian", clock, STUDIO_PROFILE_ID);
  const studio = new EssayStudio(learner, karthikEvaluator as never);
  let v = await studio.submit(FX.essays.karthik.text);
  while (v.nextDiagnostic) v = (await studio.answerDiagnostic(v.nextDiagnostic.request.competency === PLU ? wrongAnswer(v.nextDiagnostic.item) : rightAnswer(v.nextDiagnostic.item))).view;
  v = await studio.plan();
  assert.ok(v.journey!.trees.some((t) => t.root === PLU));
  // the journey, then later checks until plurals is shown and its delayed check is planned
  let retention = null as null | string;
  for (let guard = 0; guard < 60 && !retention; guard++) {
    if (v.next) {
      v = v.next.step.kind === "teach" ? await studio.readLesson(v.next.lesson!.id, true) : (await studio.answerStep(rightAnswer(v.next.item!))).view;
      continue;
    }
    if (v.laterCheck) {
      v = (await studio.answerLaterCheck(rightAnswer(v.laterCheck.item))).view;
      continue;
    }
    v = await studio.planLaterChecks();
    retention = v.checks.find((c) => c.competency === PLU && c.kind === "retention")?.id ?? null;
    if (!retention) days(1);
  }
  assert.ok(retention, "plurals shown and the delayed check planned");
  const before = v.journey!.progress;
  const assigned = JSON.stringify(v.journey!.trees.flatMap((x) => x.nodes.flatMap((n) => n.steps.map((s) => [s.id, s.kind]))));
  // the delayed check, when due: wrong
  for (let k = 0; k < 20 && v.laterCheck?.check.id !== retention; k++) {
    days(1);
    v = studio.view();
  }
  assert.equal(v.laterCheck?.check.id, retention);
  while (v.laterCheck?.check.id === retention) v = (await studio.answerLaterCheck(wrongAnswer(v.laterCheck.item))).view;
  // recorded at once: no essay, no button
  const review = v.checks.find((c) => c.review?.after === retention);
  assert.ok(review, "the review is recorded when the last answer is given");
  assert.equal(studio.events.filter((e) => e.kind === "essay" && e.record.type === "submission").length, 1, "no new essay was needed");
  assert.equal(v.journey!.reviews?.length, 1, "shown in the existing journey");
  assert.equal(v.next?.step.kind, "teach", "the review's lesson is next");
  assert.equal(v.next?.node.decision, "review");
  assert.deepEqual(v.journey!.progress, before, "the journey's completion percentage is unchanged");
  assert.equal(JSON.stringify(v.journey!.trees.flatMap((x) => x.nodes.flatMap((n) => n.steps.map((s) => [s.id, s.kind])))), assigned, "and its assigned steps");
  // planning again does not add a second review
  v = await studio.planLaterChecks();
  assert.equal(v.checks.filter((c) => c.review).length, 1);
});
