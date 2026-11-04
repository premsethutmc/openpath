/**
 * Synthetic Grade 8 essays and recorded evaluator outputs for the essay tests. Every essay here was written
 * for the tests; no child's writing is used.
 */
import { type CodeItem, type EssayContext, type EssayEvaluator, type EvidenceEvent, type LedgerEvent, type Response, fixtureEssayEvaluator, responseKey, scoreCode } from "../src/index.ts";
import { loadEssayContext } from "../../../tools/english/essay-load.ts";

let cached: EssayContext | null = null;
export const ectx = (): EssayContext => (cached ??= loadEssayContext());

export const LEARNER = "learner:essay-test";
export const at = (minute: number, day = 0) => new Date(Date.UTC(2026, 9, 18, 9, 0) + day * 86_400_000 + minute * 60_000).toISOString();

/** Repeated subject–verb agreement errors (four sentences), two preposition errors, wordiness, one connective. */
export const ESSAY_LIBRARY =
  "My school have a big library on the first floor. Every day my friend go there after lunch and read comics. The librarian discuss about new books with us on morning. In order to borrow a book, a student need a library card. I think reading is important because it help us learn new words. However, some students depend of the internet for everything. Our library should open on Sunday so that everyone can come and read.";

/** Strong writing with a single article slip. */
export const ESSAY_SLIP =
  "Last summer my family visited my grandmother's village near the river. We woke up early every morning and walked to the fields before the sun became too hot. My cousin showed me how to milk a cow, which was harder than it looked. In the evening we sat outside and listened to the frogs. It took me a hour to fall asleep on the first night because the village was so quiet. I hope we go back next year.";

/** Strong writing: strengths only. */
export const ESSAY_STRONG =
  "Many people believe that homework should be banned, but I disagree. Homework gives students a chance to practise what they learned in class. For example, a short set of maths problems helps me remember the method the next day. However, teachers should keep homework short, because students also need time to rest and play. As a result, a balanced amount of homework helps everyone.";

/** Run-on sentences and comma errors (for prerequisite trees: subordination → run-ons → commas). */
export const ESSAY_RUNONS =
  "Yesterday was sports day at our school it was very exciting. I ran in the relay race, my team came second. My best friend Arjun won the long jump, he jumped further than anyone. After the races we had lunch under the trees and then we watched the football match and our class cheered loudly. When the day ended everyone was tired but happy.";

type Obs = { competency: string; kind: "error" | "strength"; quote: string; correction?: string; misconception?: string; confidence: "high" | "medium" | "low"; note: string };
const err = (competency: string, quote: string, extra: Partial<Obs> = {}): Obs => ({ competency, kind: "error", quote, confidence: "high", note: "test", ...extra });
const good = (competency: string, quote: string): Obs => ({ competency, kind: "strength", quote, confidence: "medium", note: "test" });
const out = (essay_id: string, observations: Obs[], not_observable: string[] = []) => ({ essay_id, observations, not_observable });

export const RECORDED: Record<string, unknown> = {
  "essay:library": out("essay:library", [
    err("EN.GRM.VERB.sva", "My school have", { correction: "My school has", misconception: "third_person_s" }),
    err("EN.GRM.VERB.sva", "my friend go", { correction: "my friend goes", misconception: "third_person_s" }),
    err("EN.GRM.VERB.sva", "a student need", { correction: "a student needs", misconception: "third_person_s" }),
    err("EN.GRM.VERB.sva", "it help", { correction: "it helps", misconception: "third_person_s" }),
    err("EN.GRM.PREP.dependent", "discuss about", { correction: "discuss" }),
    err("EN.GRM.PREP.dependent", "depend of", { correction: "depend on" }),
    err("EN.GRM.PREP.time_place", "on morning", { correction: "in the morning", misconception: "in_on_at_confusion" }),
    err("EN.SEN.PRE.concision", "In order to", { correction: "To" }),
    good("EN.SEN.COH.connectives", "However, some students"),
  ]),
  "essay:slip": out("essay:slip", [err("EN.GRM.NOUN.articles", "a hour", { correction: "an hour", misconception: "a_an_sound" }), good("EN.WRT.ORG.sequencing", "In the evening we sat outside")]),
  "essay:strong": out("essay:strong", [good("EN.SEN.COH.connectives", "For example"), good("EN.SEN.COH.connectives", "As a result"), good("EN.SEN.CMB.subordination", "because students also need time to rest")]),
  "essay:runons": out("essay:runons", [
    err("EN.SEN.CMP.run_ons", "Yesterday was sports day at our school it was very exciting", { misconception: "fused_sentence" }),
    err("EN.SEN.CMP.run_ons", "I ran in the relay race, my team came second", { misconception: "comma_splice" }),
    err("EN.SEN.CMP.run_ons", "My best friend Arjun won the long jump, he jumped further than anyone", { misconception: "comma_splice" }),
    err("EN.GRM.PUN.commas", "I ran in the relay race, my team", { misconception: "comma_splice" }),
    err("EN.GRM.PUN.commas", "When the day ended everyone", { misconception: "missing_intro_comma" }),
  ]),
  // the same SVA pattern in a later essay (persistence across sessions)
  "essay:library-2": out("essay:library-2", [
    err("EN.GRM.VERB.sva", "my brother play", { misconception: "third_person_s" }),
  ]),
};

export const ESSAY_LIBRARY_2 =
  "On weekends my brother play cricket with his friends in the park near our house. I usually stay at home and read a novel or help my mother in the kitchen. Last week we all went to the park together and had a picnic under a big tree. It was a lovely day and nobody wanted to go home.";

export const evaluator = (): EssayEvaluator => fixtureEssayEvaluator({ id: "fixture-evaluator", version: "fixtures@1", observations: RECORDED, rewrites: REWRITES });

export const REWRITE_GOOD = "Our school library is important. My friend goes there daily, and the librarian discusses new books with us in the morning. Students need a card to borrow books. Reading helps us learn new words, but some students depend on the internet. The library should open on Sundays.";

export const REWRITES: Record<string, unknown> = {
  "rw:good": {
    rewrite_id: "rw:good",
    dimensions: [
      { dimension: "meaning_preservation", rating: "fully", quotes: [], note: "All main ideas kept." },
      { dimension: "clarity", rating: "mostly", quotes: ["Students need a card to borrow books."], note: "Clear." },
      { dimension: "coherence", rating: "mostly", quotes: ["but some students depend on the internet"], note: "Linked ideas." },
      { dimension: "grammar", rating: "fully", quotes: ["My friend goes there daily"], note: "Agreement fixed." },
      { dimension: "concision", rating: "mostly", quotes: [], note: "Within the limit." },
    ],
    key_ideas: [
      { original_quote: "My school have a big library", rewrite_quote: "Our school library is important" },
      { original_quote: "Every day my friend go there", rewrite_quote: "My friend goes there daily" },
      { original_quote: "a student need a library card", rewrite_quote: "Students need a card to borrow books" },
      { original_quote: "some students depend of the internet", rewrite_quote: "some students depend on the internet" },
      { original_quote: "Our library should open on Sunday", rewrite_quote: "The library should open on Sundays" },
    ],
  },
  "rw:bad-quote": {
    rewrite_id: "rw:bad-quote",
    dimensions: [
      { dimension: "meaning_preservation", rating: "fully", quotes: [], note: "" },
      { dimension: "clarity", rating: "mostly", quotes: ["The students must carry a card at all times."], note: "a paraphrase, not in the rewrite" },
      { dimension: "coherence", rating: "mostly", quotes: ["but some students depend on the internet"], note: "" },
      { dimension: "grammar", rating: "fully", quotes: ["My friend goes there daily"], note: "" },
      { dimension: "concision", rating: "mostly", quotes: [], note: "" },
    ],
    key_ideas: [
      { original_quote: "My school have a big library", rewrite_quote: "Our school library is important" },
      { original_quote: "Our library should open on Sunday", rewrite_quote: null },
    ],
  },
};

let n = 0;
export const nextId = (p = "e") => `${p}${++n}`;
export const meta = (minute: number, session = "s1", day = 0) => ({ id: nextId("x"), at: at(minute, day), session });

/** A response that scoreCode marks right (or wrong), optionally carrying a wanted misconception tag. */
export function respond(item: CodeItem, correct: boolean, tag?: string): Response {
  const kind = item.format.split(":")[0];
  const candidates: Response[] = [];
  if (kind === "choice") {
    const n = item.options?.length ?? 4;
    if (correct) candidates.push({ kind: "choice", choice: item.answer! });
    else {
      const tagged = Object.entries(item.distractor_tags ?? {}).find(([, t]) => t === tag)?.[0];
      if (tagged) candidates.push({ kind: "choice", choice: Number(tagged) });
      for (let i = 0; i < n; i++) if (i !== item.answer) candidates.push({ kind: "choice", choice: i });
    }
  } else if (kind === "typed") {
    if (correct) candidates.push({ kind: "typed", text: item.answers![0] });
    else {
      const tagged = Object.entries(item.wrong ?? {}).find(([, t]) => t === tag)?.[0];
      if (tagged) candidates.push({ kind: "typed", text: tagged });
      candidates.push({ kind: "typed", text: "qqqq" });
    }
  } else if (kind === "multi") candidates.push({ kind: "multi", choices: correct ? [...(item.answer_set ?? [])] : [] });
  else if (kind === "match") candidates.push({ kind: "match", pairs: correct ? [...(item.answer_pairs ?? [])] : [...(item.answer_pairs ?? [])].reverse() });
  else if (kind === "order") candidates.push({ kind: "order", order: correct ? [...(item.answer_order ?? [])] : [...(item.answer_order ?? [])].reverse() });
  const r = candidates.find((c) => scoreCode(item, c).correct === correct);
  if (!r) throw new Error(`cannot make a ${correct ? "right" : "wrong"} answer for ${item.id}`);
  void responseKey;
  return r;
}

/** An answer as the app records it: independent unless hints or a later attempt are given. */
export function answer(item: { id: string; version: number } & CodeItem, correct: boolean, minute: number, opts: { session?: string; day?: number; hints?: string[]; attempt?: number; tag?: string } = {}): EvidenceEvent {
  return {
    kind: "evidence",
    id: nextId("ev"),
    at: at(minute, opts.day ?? 0),
    session: opts.session ?? "s1",
    item: { id: item.id, version: item.version },
    response: respond(item, correct, opts.tag),
    use: "assessment",
    provenance: { schema: "provenance@1", attempt: opts.attempt ?? 1, hints: opts.hints ?? [], afterFeedback: (opts.attempt ?? 1) > 1, policies: ["passage@1"] },
  };
}

export const codeItem = (id: string) => {
  const i = ectx().ctx.content.items.get(id);
  if (!i || i.kind !== "code") throw new Error(`no code item ${id}`);
  return i;
};

export const withoutEssays = (events: LedgerEvent[]) => events.filter((e) => e.kind !== "essay");
