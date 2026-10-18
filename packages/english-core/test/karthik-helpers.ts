/**
 * Shared synthetic set-up for the planner-correction tests (K10, K13): Karthik's essays, a scripted record and the
 * TEST-ONLY stand-ins for reviewed plural questions at the target band (never shipped). Every learner is synthetic.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  analyseEssay,
  type BankItem,
  competencyOutcome,
  createJourney,
  essayView,
  type EssayContext,
  type EssayEvaluator,
  ESSAY_OBSERVE_PROTOCOL_V2,
  ESSAY_REWRITE_PROTOCOL_V2,
  extendContent,
  gapHypotheses,
  journeyStatus,
  type LearningJourney,
  type LedgerEvent,
  Ledger,
  leafView,
  planCheck,
  planDiagnosticFor,
  type Response,
  retentionDue,
  submitEssay,
} from "../src/index.ts";
import { loadAppEssayContext } from "../../../tools/english/essay-load.ts";

export const PLU = "EN.GRM.NOUN.plurals_countability";
export const SVA = "EN.GRM.VERB.sva";
export const LEARNER = "learner:k10";
export const DAY = 86_400_000;
export const T0 = Date.parse("2026-10-19T09:00:00.000Z");
export const FX = JSON.parse(readFileSync(new URL("../../../frontend/e2e/fixtures/essay-diagnostic-workflow.json", import.meta.url), "utf8")) as { essays: Record<string, { text: string; prompt: string }>; observations: Record<string, { competency: string; quote: string }[]> };

// Essay 2 (synthetic): plurals right throughout; whether it carries one plural error is chosen per test
export const ESSAY_2_CLEAN =
  "During the Pongal holidays we visited my grandmother's village near Melur. We cooked sweet pongal in two new clay pots outside the house. My cousins decorated the cows with bells and coloured horns. In the evening the children of the street drew kolams in front of every house. We went home tired but happy.";
export const ESSAY_2_ONE_ERROR =
  "During the Pongal holidays we visited my grandmother's village near Melur. We cooked sweet pongal in two new clay pots outside the house. My cousins decorated the cows with bells and coloured horns. In the evening the children of the street drew kolams in front of every house. The village headman shared many informations about the old temple tank.";

export function evaluator(essay2Errors: unknown[]): EssayEvaluator {
  return {
    id: "openpath-gateway:llm",
    version: "essay-llm@1",
    model: "mock-model",
    protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 },
    async observe(req) {
      const observations = req.essay.id === "essay:1" ? FX.observations.karthik : essay2Errors;
      return { essay_id: req.essay.id, rubric: req.rubric, observations, not_observable: [] };
    },
    async rewrite() {
      throw new Error("not used");
    },
  };
}
export const INFORMATIONS = [{ competency: PLU, kind: "error", quote: "many informations", explanation: "Information is uncountable: it has no plural form.", correction: "a lot of information", misconception: "plural_uncountable", confidence: "high", verification: "required", possible_slip: false }];

/** TEST-ONLY stand-ins for reviewed plural questions at the target band (as in K9). */
export const extra: BankItem[] = Array.from({ length: 16 }, (_, k): BankItem => {
  const b = 5 + (k % 6) * 0.25;
  const common = { kind: "code" as const, id: `test.k10.${k + 1}`, version: 1, family: `test.k10.${k + 1}`, target: PLU, b, a: 1.2, prompt: `Test-only plural question ${k + 1}: the ___ were there.` };
  return k % 2 ? { ...common, format: "choice:grammar", options: ["childs", "children", "childrens"], answer: 1 } : { ...common, format: "typed:cloze", answers: [`answer${k + 1}`] };
});
export const withExtra = (): EssayContext => {
  const base = loadAppEssayContext();
  return { ...base, ctx: { ...base.ctx, content: extendContent(base.ctx.content, extra, base.ctx.index) } };
};

export function record(ectx: EssayContext) {
  const events: LedgerEvent[] = [];
  let n = 0;
  let t = T0;
  const meta = (session = "s0") => ({ id: `k10:${++n}`, at: new Date((t += 60_000)).toISOString(), session });
  const now = () => new Date(t).toISOString();
  const days = (d: number) => void (t += d * DAY);
  const item = (id: string) => ectx.ctx.content.items.get(id) as BankItem;
  const respond = (it: BankItem, right: boolean): Response => {
    const kind = it.format.split(":")[0];
    if (kind === "typed") return { kind: "typed", text: right ? it.answers![0] : "zzzq" };
    if (kind === "multi") return { kind: "multi", choices: right ? it.answer_set! : [0] };
    return { kind: "choice", choice: right ? it.answer! : (it.answer! + 1) % it.options!.length };
  };
  const answer = (id: string, right: boolean, session: string) => {
    const m = meta(session);
    events.push({ kind: "evidence", id: m.id, at: m.at, session, item: { id, version: item(id).version }, response: respond(item(id), right), use: "assessment", provenance: { schema: "provenance@1", attempt: 1, hints: [], afterFeedback: false, policies: ["passage@1", "assisted@1"] } });
  };
  const practise = (id: string, session: string) => {
    const m = meta(session);
    events.push({ kind: "assisted_response", id: m.id, at: m.at, session, item: { id, version: item(id).version }, response: respond(item(id), true), attempt: 1, hints: [], afterFeedback: false });
  };
  const teach = (cap: string, lesson: string, session: string) => {
    const m = meta(session);
    events.push({ kind: "intervention", id: m.id, at: m.at, session, capability: cap, strategy: "lesson", content: lesson });
  };
  const essay = async (id: string, text: string, ev: EssayEvaluator, session: string) => {
    events.push(submitEssay(ectx, events, meta(session), { essayId: id, learner: LEARNER, text, source: { kind: "typed", dataUse: "synthetic_test", prompt: FX.essays.karthik.prompt } }).event);
    events.push((await analyseEssay(ectx, events, ev, id, meta(session))).event);
  };
  const view = (cap = PLU) => leafView(Ledger.rebuild(ectx.ctx, LEARNER, events).composite, ectx.ctx.index, cap, now());
  /** The essay layer's view: the schedule also anchored to the grade target (policy @4). */
  const tview = (cap = PLU) => essayView(ectx, Ledger.rebuild(ectx.ctx, LEARNER, events).composite, cap, now());
  return { events, meta, now, days, answer, practise, teach, essay, view, tview };
}

/**
 * Karthik's first essay through to the target shown at band 5 without help (confirmed gap → lesson → practice →
 * journey check → later checks), on the test-only bank. Returns the record and the first journey.
 */
export async function karthikShown(essay2Errors: unknown[], earlyLowLevel = false) {
  const ectx = withExtra();
  const r = record(ectx);
  const ev = evaluator(essay2Errors);
  if (earlyLowLevel) {
    // earlier practice in the app shows plurals at a LOW level: the engine's retention clock starts here
    r.answer("grm.plu.01", true, "early");
    r.answer("grm.plu.02", true, "early");
    r.answer("grm.plu.03", true, "early");
    r.answer("grm.plu.11", false, "early");
    assert.ok(r.view().demonstrated !== null && r.view().demonstrated! < 5, "shown below the target first");
    r.days(1);
  }
  await r.essay("essay:1", FX.essays.karthik.text, ev, "s0");
  const h = gapHypotheses(ectx, r.events).find((x) => x.competency === PLU)!;
  const d = planDiagnosticFor(ectx, r.events, h.id, r.meta());
  r.events.push(d.event);
  for (const i of d.request.items.slice(0, ectx.policy.confirmMinWrong)) r.answer(i.id, false, "s0");
  assert.equal(gapHypotheses(ectx, r.events).find((x) => x.id === h.id)!.status, "confirmed");
  r.days(0.01);
  const j = createJourney(ectx, r.events, r.meta("s1"), "essay:1");
  r.events.push(j.event);
  const node = j.journey.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.equal(node.decision, "gap", "a confirmed gap is taught first (unchanged)");
  assert.deepEqual(node.steps.map((x) => x.kind), ["teach", "guided_practice", "independent_check"]);
  r.teach(PLU, node.steps[0].content.refs[0], "s1");
  for (const id of node.steps[1].content.refs) r.practise(id, "s1");
  r.days(1);
  for (const id of node.steps[2].content.refs) r.answer(id, true, "s2");
  let st = journeyStatus(ectx, r.events, j.journey.id, r.now());
  let o = competencyOutcome(ectx, r.events, PLU, r.now(), st);
  for (let k = 0; k < ectx.policy.followUpChecks && !o.demonstrated; k++) {
    const p = planCheck(ectx, r.events, r.meta("plan"), PLU, st);
    r.events.push(p.event);
    r.days(Math.ceil((Date.parse(p.check.notBefore) - Date.parse(r.now())) / DAY) + 0.01);
    for (const i of p.check.items) r.answer(i.id, true, `later${k}`);
    st = journeyStatus(ectx, r.events, j.journey.id, r.now());
    o = competencyOutcome(ectx, r.events, PLU, r.now(), st);
  }
  assert.equal(o.demonstrated, true, `Karthik shows the target without help: ${o.pending}`);
  return { ectx, r, ev, first: j.journey };
}

export const journeyEvents = (events: LedgerEvent[]) => events.filter((e) => e.kind === "essay" && e.record.type === "journey") as (LedgerEvent & { record: { journey: LearningJourney } })[];

export async function karthikDue() {
  const s = await karthikShown(INFORMATIONS);
  // no sitting until the engine's delayed check falls due
  let k = 0;
  while (s.r.tview().atTarget!.verification.status !== "overdue" && k++ < 40) s.r.days(1);
  const v = s.r.tview();
  assert.equal(v.atTarget!.verification.status, "overdue", "the delayed check at the target is due");
  assert.ok(retentionDue(s.ectx, PLU, v), "a retention question, not a gap");
  return s;
}
