/**
 * End-to-end essay-to-mastery run on a synthetic Grade 8 essay, with no LLM:
 * essay → observations (pattern stand-in) → diagnostic questions (answered by a scripted synthetic learner) →
 * journey → rewrite (recorded judgement) → learner profile. Prints each stage as JSON.
 *
 *   node tools/english/essay-demo.ts
 */
import {
  analyseEssay,
  type CodeItem,
  createJourney,
  currentHypotheses,
  essayProfile,
  evaluateRewrite,
  fixtureEssayEvaluator,
  journeyStatus,
  type LedgerEvent,
  patternEssayEvaluator,
  planDiagnostics,
  profileUpdates,
  scoreCode,
  submitEssay,
  type Response,
} from "../../packages/english-core/src/index.ts";
import { loadEssayContext } from "./essay-load.ts";

const ectx = loadEssayContext();
const LEARNER = "learner:demo";
let n = 0;
const at = (minute: number) => new Date(Date.UTC(2026, 9, 18, 9, 0) + minute * 60_000).toISOString();
const meta = (minute: number) => ({ id: `demo:${++n}`, at: at(minute), session: "demo-s1" });
const events: LedgerEvent[] = [];
const show = (title: string, value: unknown) => console.log(`\n=== ${title}\n${JSON.stringify(value, null, 2)}`);

const ESSAY =
  "My school have a big library on the first floor. Every day my friend go there after lunch and read comics. The librarian discuss about new books with us on morning. In order to borrow a book, a student need a library card. I think reading is important because it help us learn new words. However, some students depend of the internet for everything. Our library should open on Sunday so that everyone can come and read.";

const s = submitEssay(ectx, events, meta(0), { essayId: "essay:demo", learner: LEARNER, text: ESSAY, source: { kind: "synthetic", dataUse: "synthetic_test", genre: "persuasive" } });
events.push(s.event);
const a = await analyseEssay(ectx, events, patternEssayEvaluator(), "essay:demo", meta(1));
events.push(a.event);
show("observations (tentative)", a.analysis.observations.map((o) => ({ competency: o.competency, kind: o.kind, quote: o.span.quote, sentence: o.span.sentence })));
show("hypotheses", [...currentHypotheses(ectx, events).values()].map((h) => ({ competency: h.competency, status: h.status, uncertainty: h.uncertainty, basis: h.basis })));

const d = planDiagnostics(ectx, events, () => meta(5));
events.push(...d.events);
show("diagnostic requests", d.requests.map((r) => ({ competency: r.competency, items: r.items, contentGap: r.contentGap })));

// a scripted synthetic learner: wrong on agreement questions, right on everything else
const respond = (item: CodeItem, right: boolean): Response => {
  const kind = item.format.split(":")[0];
  const tries: Response[] =
    kind === "choice" ? [...Array(item.options?.length ?? 4).keys()].map((choice) => ({ kind: "choice" as const, choice }))
    : kind === "typed" ? [{ kind: "typed", text: item.answers![0] }, { kind: "typed", text: "qqqq" }]
    : kind === "multi" ? [{ kind: "multi", choices: [...(item.answer_set ?? [])] }, { kind: "multi", choices: [] }]
    : kind === "match" ? [{ kind: "match", pairs: [...(item.answer_pairs ?? [])] }, { kind: "match", pairs: [...(item.answer_pairs ?? [])].reverse() }]
    : [{ kind: "order", order: [...(item.answer_order ?? [])] }, { kind: "order", order: [...(item.answer_order ?? [])].reverse() }];
  return tries.find((r) => scoreCode(item, r).correct === right)!;
};
let minute = 10;
for (const r of d.requests)
  for (const it of r.items) {
    const item = ectx.ctx.content.items.get(it.id) as CodeItem;
    events.push({ kind: "evidence", id: `demo:ev${++n}`, at: at(minute++), session: "demo-s1", item: { id: it.id, version: it.version }, response: respond(item, r.competency !== "EN.GRM.VERB.sva"), use: "assessment", provenance: { schema: "provenance@1", attempt: 1, hints: [], afterFeedback: false, policies: ["passage@1", "assisted@1"] } });
  }
show("hypotheses after diagnosis", [...currentHypotheses(ectx, events).values()].map((h) => ({ competency: h.competency, status: h.status, reason: h.diagnostic?.reason })));

const j = createJourney(ectx, events, meta(40), "essay:demo");
events.push(j.event);
const now = journeyStatus(ectx, events, j.journey.id, at(41));
show("journey", { trees: now.trees.map((t) => ({ root: t.root, nodes: t.nodes.map((x) => ({ competency: x.competency, role: x.role, green: x.green, steps: x.steps.map((st) => `${st.kind}: ${st.status}`) })) })), skipped: now.skipped, contentGaps: now.contentGaps, finalRewrite: now.finalRewrite });

const REWRITE = "Our school library is important. My friend goes there daily, and the librarian discusses new books with us in the morning. Students need a card to borrow books. Reading helps us learn new words, but some students depend on the internet. The library should open on Sundays.";
const judge = fixtureEssayEvaluator({ id: "demo-judge", version: "demo@1", rewrites: { "rw:demo": { rewrite_id: "rw:demo", dimensions: [
  { dimension: "meaning_preservation", rating: "mostly", quotes: [], note: "One idea dropped." },
  { dimension: "clarity", rating: "mostly", quotes: ["Students need a card to borrow books."], note: "Clear." },
  { dimension: "coherence", rating: "mostly", quotes: ["but some students depend on the internet"], note: "Linked." },
  { dimension: "grammar", rating: "fully", quotes: ["My friend goes there daily"], note: "Agreement fixed." },
  { dimension: "concision", rating: "mostly", quotes: [], note: "Within the limit." },
], key_ideas: [
  { original_quote: "Every day my friend go there", rewrite_quote: "My friend goes there daily" },
  { original_quote: "a student need a library card", rewrite_quote: "Students need a card to borrow books" },
  { original_quote: "Our library should open on Sunday", rewrite_quote: "The library should open on Sundays" },
  { original_quote: "In order to borrow a book", rewrite_quote: null },
] } } });
const rw = await evaluateRewrite(ectx, events, judge, meta(60), { rewriteId: "rw:demo", essayId: "essay:demo", text: REWRITE });
events.push(rw.event);
show("rewrite evaluation", { words: rw.evaluation.words, dimensions: rw.evaluation.dimensions.map((x) => `${x.dimension}: ${x.rating ?? x.status}`), affectsEstimates: rw.evaluation.affectsEstimates });

const profile = essayProfile(ectx, LEARNER, events, at(61));
show("learner profile (non-unknown)", profile.competencies.filter((c) => c.state !== "unknown").map((c) => ({ competency: c.competency, state: c.state, gap: c.gap?.status ?? null, engine: c.engine.verification, notes: c.notes })));
show("profile updates since before the essay", profileUpdates(ectx, LEARNER, [], events, at(61)).map((u) => `${u.competency}: ${u.reason}`));
