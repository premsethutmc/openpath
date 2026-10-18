/** K2: Essay Intelligence v2 — the v2 observation protocol, stricter evidence rules, the gateway evaluator and rewrites. */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyseEssay,
  buildObservationRequest,
  currentHypotheses,
  ESSAY_OBSERVE_PROTOCOL_V2,
  ESSAY_REWRITE_PROTOCOL_V2,
  type EssayEvaluator,
  type EssayGatewayInfo,
  essayProfile,
  evaluateRewrite,
  gapHypotheses,
  gatewayEssayEvaluator,
  Ledger,
  type LedgerEvent,
  planDiagnostics,
  submitEssay,
  validateObservations,
} from "../src/index.ts";
import { answer, codeItem, ectx, ESSAY_LIBRARY, ESSAY_STRONG, LEARNER, meta, REWRITE_GOOD, REWRITES, withoutEssays } from "./essay-helpers.ts";

const SVA = "EN.GRM.VERB.sva";
const RUBRIC = "openpath.g8-writing@1";
const REF = { id: "llm-test", version: "1", protocol: ESSAY_OBSERVE_PROTOCOL_V2, rubric: RUBRIC };
const src = { kind: "synthetic" as const, dataUse: "synthetic_test" as const, prompt: "Write about a place in your school that matters to you." };
const sub = (id = "essay:v2", text = ESSAY_LIBRARY) => submitEssay(ectx(), [], meta(0), { essayId: id, learner: LEARNER, text, source: src }).submission;
const ob = (o: Record<string, unknown> = {}) => ({ competency: SVA, kind: "error", quote: "my friend go", explanation: "A singular subject (my friend) needs goes.", correction: "my friend goes", confidence: "high", verification: "required", ...o });
const out = (observations: unknown[], extra: Record<string, unknown> = {}) => ({ essay_id: "essay:v2", rubric: RUBRIC, observations, not_observable: [], ...extra });

test("K2-1 a v2 output is accepted with explanation, verification, style and possible slips; the request carries rubric and prompt", () => {
  const s = sub();
  const req = buildObservationRequest(ectx(), s, ESSAY_OBSERVE_PROTOCOL_V2);
  assert.equal(req.rubric, RUBRIC);
  assert.match(req.prompt!, /place in your school/);
  const a = validateObservations(ectx(), s, out([
    ob(),
    ob({ quote: "it help", correction: "it helps", possible_slip: true, verification: "not_required" }),
    ob({ competency: "EN.SEN.PRE.concision", kind: "style", quote: "In order to", correction: "To", explanation: "\"To\" says the same in fewer words.", verification: "required" }),
    ob({ competency: "EN.SEN.COH.connectives", kind: "strength", quote: "However, some students", correction: undefined, explanation: "However marks the contrast with the previous point.", verification: "not_required" }),
  ]), REF, "an:1");
  assert.equal(a.status, "accepted");
  assert.deepEqual(a.observations.map((o) => o.kind), ["error", "error", "style", "strength"]);
  assert.equal(a.observations[0].verification, "required");
  assert.equal(a.observations[1].possibleSlip, true);
  assert.equal(a.observations[2].verification, "not_required", "a style suggestion never needs a diagnostic");
  assert.equal(a.observations[0].evaluator.rubric, RUBRIC);
});

test("K2-2 invented quotes, unsupported competencies, malformed fields, no-op corrections and over-broad quotes are rejected", () => {
  const s = sub();
  const a = validateObservations(ectx(), s, out([
    ob({ quote: "my friend goes to the library daily" }), // invented
    ob({ competency: "EN.RDG.SUM.main_idea" }), // not in the Grade 8 writing profile
    ob({ competency: "EN.MADE.UP" }), // not a competency at all
    ob({ explanation: "wrong" }), // no explanation grounded in the text
    ob({ verification: "maybe" }),
    ob({ correction: "My  Friend go" }), // the "correction" is the quote
    ob({ quote: ESSAY_LIBRARY.slice(0, 260), correction: "x" }), // a whole passage is not specific evidence
    ob({ score: 2 }), // an evaluator may not add fields
    ob({ kind: "mastered" }),
  ]), REF, "an:2");
  assert.equal(a.observations.length, 0);
  const starts = ["quote not found word for word", "EN.RDG.SUM.main_idea is not a competency in profile", "EN.MADE.UP is not a competency", "no explanation grounded in the text", "verification must be", "the correction is the same as the quoted text", "the quote is too broad", 'unexpected field "score"', "kind must be"];
  assert.equal(a.rejected.length, starts.length);
  a.rejected.forEach((r, i) => assert.ok(r.reason.startsWith(starts[i]), `${i}: ${r.reason}`));
  assert.equal(validateObservations(ectx(), s, out([ob()], { rubric: "other@1" }), REF, "an:3").status, "rejected", "a different rubric");
  assert.equal(validateObservations(ectx(), s, { essay_id: "essay:v2", observations: [] }, REF, "an:4").status, "rejected", "malformed output");
  assert.equal(validateObservations(ectx(), s, "not json", REF, "an:5").status, "rejected");
});

test("K2-3 contradictory observations cancel out; a competency cannot be both observed and not observable", () => {
  const s = sub();
  const a = validateObservations(ectx(), s, out([
    ob({ quote: "My school have" }),
    ob({ quote: "My school have", kind: "strength", correction: undefined, explanation: "The verb agrees with the subject here.", verification: "not_required" }),
    ob({ quote: "a student need" }),
  ], { not_observable: [SVA, "EN.WRT.ORG.paragraphing"] }), REF, "an:6");
  assert.deepEqual(a.observations.map((o) => o.span.quote), ["a student need"]);
  assert.equal(a.rejected.filter((r) => /contradictory/.test(r.reason)).length, 2);
  assert.deepEqual(a.notObservable, ["EN.WRT.ORG.paragraphing"]);
  assert.match(a.reasons.join(" "), /both observed and called not observable/);
});

async function analysed(observations: unknown[], text = ESSAY_LIBRARY, id = "essay:v2", extra: Record<string, unknown> = {}) {
  const events: LedgerEvent[] = [];
  const s = submitEssay(ectx(), events, meta(0), { essayId: id, learner: LEARNER, text, source: src });
  events.push(s.event);
  const ev: EssayEvaluator = { id: "llm-test", version: "1", protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 }, observe: async () => ({ ...out(observations), essay_id: id, ...extra }), rewrite: async () => ({}) };
  const a = await analyseEssay(ectx(), events, ev, id, meta(1));
  events.push(a.event);
  return { events, analysis: a.analysis };
}

test("K2-4 style suggestions and low-confidence errors never make a gap; a correct essay gives no gap and no mastery", async () => {
  const style = await analysed([
    ob({ competency: "EN.SEN.PRE.concision", kind: "style", quote: "In order to", correction: "To", explanation: "\"To\" says the same in fewer words." }),
    ob({ competency: "EN.SEN.PRE.concision", kind: "style", quote: "so that everyone can come and read", correction: "for everyone", explanation: "A shorter phrase keeps the meaning." }),
    ob({ quote: "My school have", confidence: "low" }),
    ob({ quote: "my friend go", confidence: "low" }),
  ]);
  assert.equal(gapHypotheses(ectx(), style.events).length, 0);
  const p = essayProfile(ectx(), LEARNER, style.events, style.events.at(-1)!.at);
  const concision = p.competencies.find((c) => c.competency === "EN.SEN.PRE.concision")!;
  assert.equal(concision.essays.style, 2);
  assert.match(concision.notes.join(" "), /preferences, not errors/);

  const clean = await analysed([ob({ competency: "EN.SEN.COH.connectives", kind: "strength", quote: "For example", correction: undefined, explanation: "For example introduces a supporting case.", verification: "not_required" })], ESSAY_STRONG, "essay:clean", { not_observable: ["EN.WRT.ORG.paragraphing"] });
  assert.equal(gapHypotheses(ectx(), clean.events).length, 0);
  const cp = essayProfile(ectx(), LEARNER, clean.events, clean.events.at(-1)!.at);
  const conn = cp.competencies.find((c) => c.competency === "EN.SEN.COH.connectives")!;
  assert.equal(conn.state, "observed", "used well is observed, never demonstrated");
  assert.match(conn.notes.join(" "), /not mastery/);
  assert.match(cp.competencies.find((c) => c.competency === "EN.WRT.ORG.paragraphing")!.notes.join(" "), /no chance to show/);
  assert.ok(cp.competencies.every((c) => c.state !== "demonstrated" && c.state !== "verified"));
});

test("K2-5 an evaluator failure or invalid output records a rejected analysis and changes nothing else", async () => {
  const events: LedgerEvent[] = [];
  const s = submitEssay(ectx(), events, meta(0), { essayId: "essay:f", learner: LEARNER, text: ESSAY_LIBRARY, source: src });
  events.push(s.event);
  const down: EssayEvaluator = { id: "llm-test", version: "1", protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 }, observe: async () => { throw new Error("timed out"); }, rewrite: async () => ({}) };
  const a = await analyseEssay(ectx(), events, down, "essay:f", meta(1));
  assert.equal(a.analysis.status, "rejected");
  assert.match(a.analysis.reasons[0], /timed out/);
  assert.equal(a.analysis.observations.length, 0);
  const garbled: EssayEvaluator = { ...down, observe: async () => "```json {not json" };
  assert.equal((await analyseEssay(ectx(), events, garbled, "essay:f", meta(2))).analysis.status, "rejected");
  events.push(a.event);
  assert.equal(gapHypotheses(ectx(), events).length, 0);
  assert.deepEqual(Ledger.rebuild(ectx().ctx, LEARNER, events).composite.nodes, Ledger.rebuild(ectx().ctx, LEARNER, withoutEssays(events)).composite.nodes);
});

const INFO: EssayGatewayInfo = { available: true, id: "openpath-gateway:llm", version: "essay-llm@1", model: "test-model", rubric: RUBRIC, protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 } };

test("K2-6 the gateway evaluator sends synthetic-only requests and refuses a reply from a different configuration", async () => {
  const sent: unknown[] = [];
  const evaluator = { id: INFO.id, version: INFO.version, model: INFO.model, rubric: RUBRIC, protocol: ESSAY_OBSERVE_PROTOCOL_V2 };
  const g = gatewayEssayEvaluator({ info: INFO, post: async (body) => (sent.push(body), { output: out([ob()], { essay_id: "essay:g" }), evaluator }) });
  const events: LedgerEvent[] = [];
  events.push(submitEssay(ectx(), events, meta(0), { essayId: "essay:g", learner: LEARNER, text: ESSAY_LIBRARY, source: src }).event);
  const a = await analyseEssay(ectx(), events, g, "essay:g", meta(1));
  assert.equal(a.analysis.status, "accepted");
  assert.equal(a.analysis.evaluator.model, "test-model");
  assert.equal((sent[0] as { data_use: string }).data_use, "synthetic_test");
  assert.equal(((sent[0] as { request: { protocol: string } }).request).protocol, ESSAY_OBSERVE_PROTOCOL_V2);
  const other = gatewayEssayEvaluator({ info: INFO, post: async () => ({ output: out([ob()]), evaluator: { ...evaluator, model: "another-model" } }) });
  const b = await analyseEssay(ectx(), events, other, "essay:g", meta(2));
  assert.equal(b.analysis.status, "rejected");
  assert.match(b.analysis.reasons[0], /different configuration/);
});

test("K2-7 a v2 rewrite is compared with the original and its prompt, names its rubric, and is transfer evidence only", async () => {
  const events: LedgerEvent[] = [];
  events.push(submitEssay(ectx(), events, meta(0), { essayId: "essay:library", learner: LEARNER, text: ESSAY_LIBRARY, source: src }).event);
  let seen: { prompt?: string; rubric?: string; protocol: string } | null = null;
  const judgement = { ...(REWRITES["rw:good"] as object), rewrite_id: "rw:v2" };
  const ev = (withRubric: boolean): EssayEvaluator => ({ id: "llm-test", version: "1", protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 }, observe: async () => ({}), rewrite: async (req) => ((seen = req), withRubric ? { ...judgement, rubric: RUBRIC } : judgement) });
  const r = await evaluateRewrite(ectx(), events, ev(true), meta(5), { rewriteId: "rw:v2", essayId: "essay:library", text: REWRITE_GOOD });
  assert.equal(seen!.protocol, ESSAY_REWRITE_PROTOCOL_V2);
  assert.match(seen!.prompt!, /place in your school/);
  assert.equal(seen!.rubric, RUBRIC);
  assert.equal(r.evaluation.status, "evaluated");
  assert.equal(r.evaluation.evidenceRole, "transfer");
  assert.equal(r.evaluation.affectsEstimates, false);
  assert.equal(r.evaluation.verifiesCompetencies, false);
  const noRubric = await evaluateRewrite(ectx(), events, ev(false), meta(6), { rewriteId: "rw:v2", essayId: "essay:library", text: REWRITE_GOOD });
  assert.equal(noRubric.evaluation.status, "rejected");
});

test("K2-8 a later essay without errors does not undo a confirmed gap: absence of an error is not mastery", async () => {
  const first = await analysed([ob(), ob({ quote: "a student need" }), ob({ quote: "it help" })], ESSAY_LIBRARY, "essay:a");
  const events = first.events;
  const d = planDiagnostics(ectx(), events, () => meta(5));
  events.push(...d.events);
  const sva = d.requests.find((r) => r.competency === SVA)!;
  sva.items.forEach((it, k) => events.push(answer(codeItem(it.id), k === 2, 10 + k)));
  assert.equal(currentHypotheses(ectx(), events).get(SVA)!.status, "confirmed");
  const ev: EssayEvaluator = { id: "llm-test", version: "1", protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 }, observe: async () => ({ ...out([]), essay_id: "essay:b" }), rewrite: async () => ({}) };
  events.push(submitEssay(ectx(), events, meta(30, "s2", 7), { essayId: "essay:b", learner: LEARNER, text: ESSAY_STRONG, source: src }).event);
  events.push((await analyseEssay(ectx(), events, ev, "essay:b", meta(31, "s2", 7))).event);
  assert.equal(currentHypotheses(ectx(), events).get(SVA)!.status, "confirmed", "only independent answers can weaken it");
  const p = essayProfile(ectx(), LEARNER, events, events.at(-1)!.at).competencies.find((c) => c.competency === SVA)!;
  assert.notEqual(p.state, "demonstrated");
  assert.equal(p.gap!.status, "confirmed");
});
