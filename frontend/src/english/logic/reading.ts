/**
 * Read and answer: a short passage, a question, and the child's own written answer.
 *
 * Understanding and writing are judged separately and never mixed: a spelling or grammar slip never lowers the
 * understanding judgement, and a fluent answer gets no credit for understanding it does not show. The evaluator is a
 * replaceable provider (ReadingEvaluator); the default (rules@1) is deterministic, runs on the device and costs
 * nothing. It only says "understood" when the answer contains the task's key points, and it abstains ("can't tell")
 * when the answer matches neither the key points nor a known misreading, rather than guess.
 *
 * Every judgement is provisional: the rules have not been calibrated against marked answers from real children. The
 * evidence each answer records is kept with the answer (events.ts WrittenAnswerEvent) and is never fed to the
 * capability estimates.
 */
import type { Passage } from "../../../../packages/english-core/src/index.ts";
import tasksJson from "../../../../content/english/reading/tasks.json";
import commonWordsJson from "../../../../content/english/spelling/common-words.json";

export interface KeyPoint {
  id: string;
  text: string;
  required: boolean;
  /** Every group must have one entry in the answer. An entry is a word, a stem ending in *, or a phrase. */
  groups: string[][];
}

export interface ReadingTask {
  id: string;
  version?: number;
  passage: string;
  capability: string;
  question: string;
  key_points: KeyPoint[];
  contradicts: { id: string; text: string; groups: string[][] }[];
  model_answer: string;
  /** Words that show the answer is about the question (beside the passage's and the question's own). */
  topic: string[];
}

export type ComprehensionLevel = "understood" | "partly" | "not_yet" | "off_topic" | "cant_tell" | "too_short";

export interface MechanicsFlag {
  rule: string;
  capability: "EN.WRT.ACC.spelling" | "EN.WRT.ACC.grammar" | "EN.WRT.ACC.punctuation";
  /** The words of the answer the flag is about, exactly as written. */
  quote: string;
  suggestion?: string;
  message: string;
}

export interface ReadingEvaluation {
  evaluator: string;
  /**
   * level "understood" means every required key point was found in a sentence-like answer with no negation: a keyword
   * match (basis), never verified understanding. why: the reason for abstaining, when it abstained.
   */
  comprehension: { level: ComprehensionLevel; basis: "keyword_match"; matched: string[]; missing: string[]; contradicted: string[]; relevance: number; abstained: boolean; why: string | null };
  mechanics: { spelling: MechanicsFlag[]; grammar: MechanicsFlag[]; punctuation: MechanicsFlag[] };
  coherence: "sentence" | "fragment";
  feedback: { understanding: string; writing: string[] };
  /** Structured, provisional observations by competency. Never used for any estimate. */
  evidence: { capability: string; observation: string; provisional: true }[];
}

/** A replaceable evaluation provider. Another provider (a grammar service, a language model behind the gateway) can be added here without changing the activity. */
export interface ReadingEvaluator {
  id: string;
  evaluate(task: ReadingTask, passage: Passage, text: string): ReadingEvaluation;
}

export const READING_TASKS: ReadingTask[] = (tasksJson as unknown as { tasks: ReadingTask[] }).tasks.map((t) => ({ version: (tasksJson as { version: number }).version, ...t }));
export const READING_REVIEW = (tasksJson as unknown as { review: string }).review;

let dictionary: Set<string> | null = null;
const words = (): Set<string> => (dictionary ??= new Set((commonWordsJson as unknown as { words: string }).words.split(" ")));

// ------------------------------------------------------------------ text

interface Token {
  /** lower case, apostrophes kept */
  w: string;
  /** as written */
  raw: string;
  start: number;
}

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const re = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
  for (let m = re.exec(text); m; m = re.exec(text)) out.push({ w: m[0].toLowerCase().replace(/’/g, "'"), raw: m[0], start: m.index });
  return out;
}

/** Edits between two words (insert, delete, change, or swap two neighbouring letters), stopping early above `max`. */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      best = Math.min(best, v);
    }
    if (best > max) return max + 1;
  }
  return d[a.length][b.length];
}

const NEGATION = new Set(["not", "never", "no", "didn't", "didnt", "don't", "dont", "doesn't", "doesnt", "wasn't", "wasnt", "isn't", "isnt", "nobody", "nothing"]);

/** One word of a term against one token: exact, a stem*, or one letter off in a word of 5+ letters (a slip). */
function wordMatches(term: string, token: string): boolean {
  const t = token.replace(/'/g, "");
  if (term.endsWith("*")) {
    const stem = term.slice(0, -1);
    if (t.startsWith(stem)) return true;
    // a slip in a longer stem (bukets for bucket*): the start of the word, give or take a letter, one edit away
    return stem.length >= 5 && [stem.length - 1, stem.length, stem.length + 1].some((n) => t.length >= n && editDistance(t.slice(0, n), stem, 1) <= 1);
  }
  const w = term.replace(/'/g, "");
  return t === w || (w.length >= 5 && editDistance(t, w, 1) <= 1);
}

/** Where a term (a word, stem or phrase) occurs in the tokens, and whether a negation just before it reverses it. */
function findTerm(term: string, toks: Token[]): { at: number; negated: boolean } | null {
  const parts = term.toLowerCase().split(/\s+/);
  const termNegates = parts.some((p) => NEGATION.has(p.replace(/\*$/, "")));
  for (let i = 0; i + parts.length <= toks.length; i++) {
    if (parts.every((p, k) => wordMatches(p, toks[i + k].w))) {
      const before = toks.slice(Math.max(0, i - 3), i).map((t) => t.w);
      return { at: i, negated: !termNegates && before.some((b) => NEGATION.has(b)) };
    }
  }
  return null;
}

function groupsFound(groups: string[][], toks: Token[]): { found: boolean; negated: boolean } {
  let negated = false;
  for (const g of groups) {
    const hits = g.map((term) => findTerm(term, toks)).filter((h): h is { at: number; negated: boolean } => !!h);
    if (!hits.some((h) => !h.negated)) {
      if (hits.length) negated = true;
      return { found: false, negated };
    }
  }
  return { found: true, negated };
}

const STOP = new Set(
  "a an the and or but so because as if then than that this these those it its it's is are was were be been being am i you he she they we me him her them us my your his their our to of in on at by for with from up down out over into about after before when while what why how who which there here not no do does did done have has had will would can could should may might must just also very too more most some any all one two because cos coz yes".split(" "),
);

// ------------------------------------------------------------------ mechanics (separate from understanding)

const CONTRACTIONS = /^(?:[a-z]+)(?:'s|'t|'re|'ve|'ll|'d|'m)$/;

function spellingFlags(text: string, toks: Token[], known: Set<string>): MechanicsFlag[] {
  const dict = words();
  const out: MechanicsFlag[] = [];
  const firstOfSentence = new Set<number>();
  toks.forEach((t, i) => {
    const before = text.slice(i ? toks[i - 1].start + toks[i - 1].raw.length : 0, t.start);
    if (i === 0 || /[.!?]/.test(before)) firstOfSentence.add(i);
  });
  toks.forEach((t, i) => {
    const w = t.w;
    if (w.length < 3 || dict.has(w) || known.has(w)) return;
    if (w.includes("'") && CONTRACTIONS.test(w) && (dict.has(w.split("'")[0]) || (w.endsWith("n't") && dict.has(w.slice(0, -3))) || ["can't", "won't", "shan't"].includes(w))) return;
    // a capitalised word that does not start a sentence is probably a name
    if (/^[A-Z]/.test(t.raw) && !firstOfSentence.has(i)) return;
    const s = suggest(w, known, dict);
    out.push({ rule: "unknown_word", capability: "EN.WRT.ACC.spelling", quote: t.raw, ...(s ? { suggestion: s } : {}), message: s ? `Check the spelling of "${t.raw}". Did you mean "${s}"?` : `Check the spelling of "${t.raw}".` });
  });
  return out;
}

/** The closest known word: one letter off first (the passage's own words preferred), then two. */
function suggest(w: string, known: Set<string>, dict: Set<string>): string | null {
  for (const max of [1, 2]) {
    const near = [...known].filter((k) => Math.abs(k.length - w.length) <= max && editDistance(k, w, max) <= max);
    if (near.length) return near.sort()[0];
    if (w.length < 4) continue;
    let best: string | null = null;
    for (const d of dict) {
      if (d[0] !== w[0] || Math.abs(d.length - w.length) > max) continue;
      if (editDistance(d, w, max) <= max && (best === null || d < best)) best = d;
    }
    if (best) return best;
  }
  return null;
}

/** A few high-precision checks only: each one is a definite error, so nothing correct is ever flagged. */
const GRAMMAR: { rule: string; re: RegExp; message: (m: string) => string; fix: (m: string) => string }[] = [
  { rule: "could_of", re: /\b(could|should|would|must|might)\s+of\b/gi, message: (m) => `"${m}" should be "${m.split(/\s+/)[0]} have".`, fix: (m) => `${m.split(/\s+/)[0]} have` },
  { rule: "plural_was", re: /\b(they|we|you)\s+was\b/gi, message: (m) => `"${m}": with ${m.split(/\s+/)[0].toLowerCase()}, use "were".`, fix: (m) => `${m.split(/\s+/)[0]} were` },
  { rule: "singular_dont", re: /\b(he|she|it)\s+don'?t\b/gi, message: (m) => `"${m}": with ${m.split(/\s+/)[0].toLowerCase()}, use "doesn't".`, fix: (m) => `${m.split(/\s+/)[0]} doesn't` },
  { rule: "repeated_word", re: /\b([a-z]+)\s+\1\b/gi, message: (m) => `"${m}": the same word twice.`, fix: (m) => m.split(/\s+/)[0] },
  { rule: "a_before_vowel", re: /\ba\s+(apple|egg|elephant|orange|umbrella|idea|island|insect|old|empty|angry|eye|ice|answer|animal|accident)\b/gi, message: (m) => `"${m}": use "an" before a vowel sound.`, fix: (m) => `an ${m.split(/\s+/)[1]}` },
];

function grammarFlags(text: string): { grammar: MechanicsFlag[]; punctuation: MechanicsFlag[] } {
  const grammar: MechanicsFlag[] = [];
  const punctuation: MechanicsFlag[] = [];
  for (const g of GRAMMAR)
    for (const m of text.matchAll(g.re)) grammar.push({ rule: g.rule, capability: "EN.WRT.ACC.grammar", quote: m[0], suggestion: g.fix(m[0]), message: g.message(m[0]) });
  for (const m of text.matchAll(/(^|[.!?]\s+|\s)i(\s|'m|'ve|'ll|'d|$)/g))
    punctuation.push({ rule: "lowercase_i", capability: "EN.WRT.ACC.punctuation", quote: m[0].trim(), suggestion: m[0].trim().replace(/^i/, "I"), message: 'Write "I" as a capital letter.' });
  const trimmed = text.trim();
  if (trimmed.split(/\s+/).length >= 2 && /^[a-z]/.test(trimmed)) punctuation.push({ rule: "capital_start", capability: "EN.WRT.ACC.punctuation", quote: trimmed.split(/\s+/)[0], message: "Start your answer with a capital letter." });
  for (const m of trimmed.matchAll(/[.!?]\s+([a-z][a-z]*)/g)) punctuation.push({ rule: "capital_sentence", capability: "EN.WRT.ACC.punctuation", quote: m[1], message: `Start each sentence with a capital letter ("${m[1]}").` });
  if (trimmed.split(/\s+/).length >= 4 && !/[.!?]["')\]]?$/.test(trimmed)) punctuation.push({ rule: "end_punctuation", capability: "EN.WRT.ACC.punctuation", quote: trimmed.split(/\s+/).slice(-1)[0], message: "End your sentence with a full stop." });
  return { grammar, punctuation };
}

// ------------------------------------------------------------------ the rule-based evaluator

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const rulesEvaluator: ReadingEvaluator = {
  id: "rules@1",
  evaluate(task, passage, text) {
    const toks = tokenize(text);
    const passageWords = new Set(tokenize(`${passage.title} ${passage.text}`).map((t) => t.w));
    const questionWords = new Set(tokenize(task.question).map((t) => t.w));
    const known = new Set([...passageWords, ...questionWords, ...task.topic.map((t) => t.replace(/\*$/, ""))]);

    // understanding
    const content = toks.filter((t) => !STOP.has(t.w));
    const kp = task.key_points.map((k) => ({ k, ...groupsFound(k.groups, toks) }));
    const matched = kp.filter((x) => x.found).map((x) => x.k);
    const negated = kp.some((x) => x.negated && !x.found);
    const contra = task.contradicts.filter((c) => groupsFound(c.groups, toks).found);
    const required = task.key_points.filter((k) => k.required);
    const topical = (w: string) => known.has(w) || task.topic.some((t) => wordMatches(t, w)) || [...known].some((k) => k.length >= 5 && wordMatches(k, w));
    // words that may be misspelt are left out of relevance unless their likely spelling is on topic: a spelling slip
    // must never make an answer look off topic
    const sp = spellingFlags(text, toks, known);
    const unsure = new Map(sp.map((f) => [f.quote.toLowerCase(), f.suggestion]));
    const judged = content.filter((t) => !unsure.has(t.w) || (unsure.get(t.w) && topical(unsure.get(t.w)!)));
    const relevance = judged.length ? judged.filter((t) => topical(t.w) || (unsure.get(t.w) && topical(unsure.get(t.w)!))).length / judged.length : content.length ? 0 : 0;
    // Matching words is not reading meaning. The rules credit key points only in an answer written as a sentence
    // (four or more words, with ordinary small words such as "was", "the", "to"), and never when a negation anywhere
    // could reverse it ("there is no dancing"); otherwise they say they cannot tell. Even then a match is reported as
    // "key points present", not as verified understanding: word order and who-did-what are not checked.
    const sentence = toks.length >= 4 && toks.some((t) => STOP.has(t.w));
    const negatedAnywhere = toks.some((t) => NEGATION.has(t.w)) && !contra.length;
    let level: ComprehensionLevel;
    let why: string | null = null;
    if (toks.length < 2) level = "too_short";
    else if (contra.length && matched.length) (level = "cant_tell"), (why = "both a key point and a known misreading");
    else if (contra.length) level = "not_yet";
    else if (matched.length && !sentence) (level = "cant_tell"), (why = "key words without a sentence");
    else if (matched.length && (negated || negatedAnywhere)) (level = "cant_tell"), (why = "a negation could reverse the meaning");
    else if (required.every((r) => matched.includes(r)) && matched.length) level = "understood";
    else if (matched.length) level = "partly";
    else if (negated) (level = "cant_tell"), (why = "a negation could reverse the meaning");
    else if (judged.length >= 3 && relevance < 0.25) level = "off_topic";
    else (level = "cant_tell"), (why = "no key point or known misreading found");
    const missing = task.key_points.filter((k) => !matched.includes(k));
    const missingRequired = missing.filter((k) => k.required);

    const hint = (missingRequired[0] ?? missing[0] ?? task.key_points[0]).text.toLowerCase();
    const understanding: Record<ComprehensionLevel, () => string> = {
      understood: () => (missing.length ? `Your answer has the key ideas. You could also add: ${missing[0].text.toLowerCase()}.` : "Your answer has the key ideas from the passage."),
      partly: () => `Good start. To make it complete, add: ${hint}.`,
      not_yet: () => `Have another look at the passage: it says something different. Think about: ${hint}.`,
      off_topic: () => `Your answer doesn't seem to be about the question yet. Read the question again: "${task.question}"`,
      cant_tell: () =>
        why === "key words without a sentence"
          ? "Write it as a full sentence, so I can tell what you mean."
          : "I couldn't tell from your answer whether you found it. Try saying it another way, using words from the passage.",
      too_short: () => "Write a little more: one sentence is enough.",
    };

    // writing, separately (spelling flags were found above)
    const { grammar, punctuation } = grammarFlags(text);
    const coherence = toks.length >= 4 ? "sentence" : "fragment";
    const notes = [...sp, ...grammar, ...punctuation];
    const writing = notes.length
      ? [...notes.slice(0, 3).map((f) => f.message), ...(notes.length > 3 ? [`And ${notes.length - 3} more small thing${notes.length - 3 === 1 ? "" : "s"} to check.`] : []), "These are about writing. They don't change whether you understood."]
      : [coherence === "sentence" ? "Your spelling and punctuation look fine." : "Try writing it as a full sentence."];

    const abstained = level === "cant_tell" || level === "too_short";
    const evidence: ReadingEvaluation["evidence"] = [
      {
        capability: task.capability,
        observation: abstained
          ? `not judged (abstained: ${why ?? "too short"})`
          : level === "understood"
            ? "all key points present (keyword match, not verified understanding)"
            : level === "partly"
              ? "some key points present (keyword match, not verified understanding)"
              : level === "not_yet"
                ? "a known misreading (keyword match)"
                : "off topic (word overlap)",
        provisional: true,
      },
      { capability: "EN.WRT.TSK.task_response", observation: level === "off_topic" ? "off topic" : abstained ? "not judged (abstained)" : "on topic", provisional: true },
      { capability: "EN.WRT.ACC.spelling", observation: `${sp.length} possible spelling mistake(s) in ${toks.length} word(s)`, provisional: true },
      { capability: "EN.WRT.ACC.grammar", observation: `${grammar.length} grammar error(s) found by rule`, provisional: true },
      { capability: "EN.WRT.ACC.punctuation", observation: `${punctuation.length} punctuation or capital-letter error(s) found by rule`, provisional: true },
    ];
    return {
      evaluator: "rules@1",
      comprehension: { level, basis: "keyword_match", why, matched: matched.map((k) => k.id), missing: missing.map((k) => k.id), contradicted: contra.map((c) => c.id), relevance: Math.round(relevance * 100) / 100, abstained },
      mechanics: { spelling: sp, grammar, punctuation },
      coherence,
      feedback: { understanding: capFirst(understanding[level]()), writing },
      evidence,
    };
  },
};

/** The evaluation providers available. Only the free, on-device rules provider is enabled; others would be added here. */
export const READING_EVALUATORS: Record<string, ReadingEvaluator> = { [rulesEvaluator.id]: rulesEvaluator };
export const DEFAULT_READING_EVALUATOR = rulesEvaluator.id;

/** What revising changed, for the revision's evidence (EN.WRT.PRC.revising): never a judgement of the child. */
export function revisionChange(before: ReadingEvaluation, after: ReadingEvaluation): string {
  const rank: Record<ComprehensionLevel, number> = { too_short: 0, cant_tell: 0, off_topic: 0, not_yet: 1, partly: 2, understood: 3 };
  const flags = (e: ReadingEvaluation) => e.mechanics.spelling.length + e.mechanics.grammar.length + e.mechanics.punctuation.length;
  const parts: string[] = [];
  if (rank[after.comprehension.level] > rank[before.comprehension.level]) parts.push("answer now shows more understanding");
  if (after.comprehension.matched.length > before.comprehension.matched.length) parts.push("added a key point");
  if (flags(after) < flags(before)) parts.push(`fixed ${flags(before) - flags(after)} writing error(s)`);
  if (flags(after) > flags(before)) parts.push(`${flags(after) - flags(before)} new writing error(s)`);
  return parts.length ? parts.join("; ") : "no change found by rule";
}
