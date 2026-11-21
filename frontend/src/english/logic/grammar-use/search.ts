/**
 * Look up grammar from the home screen: a word or two ("has", "apostrophe", "they're", "past tense") finds the
 * Grammar topics whose name, rule, examples or common mistake mention it, best match first. Matching is on whole
 * words and their starts, case and punctuation ignored, with a few everyday names for topics a child may type.
 */
import { GRAMMAR, LEARN } from "./grammar-use.ts";

export interface TopicHit {
  id: string;
  name: string;
  rule: string;
  sentences: number;
}

/** Everyday names for topics, so a child's own words find them. */
const ALSO: Record<string, string> = {
  tamil_slips: "tamil mistakes slips indian english myself cousin brother having knowing discuss about return back question order",
  contractions: "apostrophe short form don't can't it's",
  possessives: "apostrophe belonging owner 's",
  confusables: "their there they're your you're its it's to too two then than were where homophones",
  past: "past tense yesterday ed",
  irregular_verbs: "past tense went ate broke irregular",
  tenses: "present perfect have has been tense",
  future: "will tomorrow future tense",
  continuous: "ing now continuous",
  articles: "a an the article",
  agreement: "subject verb agreement is are was were",
  be_verbs: "am is are",
  have_has: "have has",
  plurals: "plural many more than one es ies",
  comparison: "comparative superlative er est more most",
  capitals: "capital letter full stop",
  punctuation: "comma question mark exclamation full stop",
  dialogue: "speech marks quotation inverted commas said",
  speech: "direct reported indirect speech said",
  pronouns: "he she it they pronoun",
  pronoun_case: "i me he him she her we us they them",
  prepositions: "in on under at between preposition",
  conjunctions: "and but because so or joining words",
  passive: "passive voice was done by",
  conditionals: "if unless would",
  parts_of_speech: "noun verb adjective adverb word class",
  this_these: "this that these those",
  word_order: "order of words",
  questions: "question who what where when why how",
};

const words = (s: string) => s.toLowerCase().replace(/[’]/g, "'").split(/[^a-z0-9']+/).filter(Boolean);

export function searchGrammar(query: string, limit = 6): TopicHit[] {
  const q = words(query);
  if (!q.length || query.trim().length < 2) return [];
  const scored = GRAMMAR.topics.map((t) => {
    const card = LEARN.find((c) => c.topic === t.id);
    const name = words(`${t.name} ${t.id.replace(/_/g, " ")}`);
    const also = words(ALSO[t.id] ?? "");
    const body = words([card?.rule, ...(card?.examples ?? []), card?.mistake.wrong, card?.mistake.right].join(" "));
    let score = 0;
    for (const w of q) {
      const starts = (list: string[]) => list.some((x) => x === w || (w.length >= 3 && x.startsWith(w)));
      if (starts(name)) score += 5;
      else if (starts(also)) score += 4;
      else if (starts(body)) score += 1;
      else return { t, card, score: 0 };
    }
    return { t, card, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name))
    .slice(0, limit)
    .map((x) => ({ id: x.t.id, name: x.t.name, rule: x.card?.rule ?? "", sentences: GRAMMAR.items.filter((i) => i.topic === x.t.id).length }));
}
