/**
 * A rule-based check of a piece of writing. It looks at the FORM only: length, capital letters and end marks,
 * spacing, sure spelling and grammar slips (about 400 word forms and 59 patterns, in slips.ts), repeated words and sentence openings, linking words,
 * paragraphs, and the outward shape of a letter, an argument or a story. It cannot tell whether the piece is on
 * its topic, whether the ideas are good, or whether a sentence means what the writer intended, and it says so.
 *
 * The same text always gives the same notes. It runs on the device: nothing is sent anywhere and nothing is kept.
 * Every rule is chosen to be sure rather than clever: a note that is wrong teaches a mistake, so doubtful
 * patterns are left out.
 */
import { unknownWords, type Dictionary } from "./dictionary.ts";
import { A_OK, AN_OK, ASKED, HELPER, JOINED, MISSPELT, NO_APOSTROPHE, SLIPS, TEXTING, WRONG_FORM } from "./slips.ts";

export type Form = "letter" | "formal" | "argument" | "narrative";
export interface Target {
  min: number;
  max: number;
  form?: Form;
}
export interface Note {
  id: string;
  /** Grammar in use topics that practise what this note is about, if any. */
  topics?: string[];
  /** fix: a slip to correct. tip: something to consider. good: something done well. */
  level: "fix" | "tip" | "good";
  text: string;
}
export interface WritingCheck {
  words: number;
  sentences: number;
  paragraphs: number;
  notes: Note[];
}

const wordsOf = (s: string) => s.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
/** Sentences as written: split after . ? ! (and a closing quote), keeping the text. */
export const sentencesOf = (text: string): string[] => text.replace(/\s+/g, " ").trim().split(/(?<=[.?!]["”’']?)\s+/).filter((s) => /[A-Za-z]/.test(s));
const quote = (xs: string[], n = 3) => xs.slice(0, n).map((x) => `“${x}”`).join(", ");
const LINKERS = ["because", "so", "but", "although", "however", "therefore", "then", "first", "next", "finally", "after", "when", "while", "since", "also", "later", "suddenly", "meanwhile", "moreover", "besides"];
const STOP = new Set("the a an and or but so of to in on at for with from by as is am are was were be been it its this that these those he she they we you i me my our your his her their them us him not no do does did have has had will would can could should may might there then than when what which who how very just about into over under after before again more most some any all each one two".split(" "));
const WEAK = ["very", "nice", "good", "big", "thing", "things", "got", "lot", "really", "stuff"];
export function checkWriting(text: string, target: Target, dict?: Dictionary | null): WritingCheck {
  const notes: Note[] = [];
  const add = (id: string, level: Note["level"], t: string, topics?: string[]) => notes.push({ id, level, text: t, ...(topics?.length ? { topics: [...new Set(topics)] } : {}) });
  const sentences = sentencesOf(text);
  const words = wordsOf(text);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => /[A-Za-z]/.test(p)).length;
  const out = (): WritingCheck => ({ words: words.length, sentences: sentences.length, paragraphs, notes: [...notes].sort((a, b) => ORDER[a.level] - ORDER[b.level]) });
  if (!words.length) return out();
  const lower = words.map((w) => w.toLowerCase().replace(/’/g, "'"));

  // length
  if (words.length < target.min) add("short", "tip", `${words.length} words so far: the task asks for ${target.min} to ${target.max}.`);
  else if (words.length > target.max) add("long", "tip", `${words.length} words: the task asks for ${target.min} to ${target.max}. See what can be cut.`);
  else add("length", "good", `The length is right: ${words.length} words.`);

  // capital letters and end marks
  const noCapital = sentences.filter((s) => /^["“‘']?[a-z]/.test(s));
  if (noCapital.length) add("capital", "fix", `${noCapital.length === 1 ? "A sentence starts" : `${noCapital.length} sentences start`} without a capital letter: ${quote(noCapital.map((s) => s.split(" ").slice(0, 3).join(" ")))}.`, ["capitals"]);
  else if (sentences.length >= 3) add("capital-ok", "good", "Every sentence starts with a capital letter.");
  if (!/[.?!]["”’']?\s*$/.test(text)) add("end", "fix", "The last sentence has no full stop, question mark or exclamation mark.", ["capitals"]);
  if (/(^|[^A-Za-z'’])i(?=[ ,.'’!?]|$)/.test(text)) add("i", "fix", "The word “I” is always a capital letter.", ["capitals"]);

  // spacing
  if (/[A-Za-z][,.;:!?][A-Za-z]{2}/.test(text.replace(/\b[a-z]\.[a-z]\./gi, ""))) add("space-after", "fix", "Leave a space after a comma or a full stop.");
  if (/[A-Za-z] +(?!\.\.)[,.;:!?]/.test(text)) add("space-before", "fix", "Do not leave a space before a comma or a full stop.");

  // sure spelling slips
  const found = (map: Record<string, string>) => [...new Set(lower.filter((w) => Object.hasOwn(map, w)))];
  const list = (ws: string[], map: Record<string, string>) => ws.slice(0, 5).map((w) => `“${w}” is “${map[w]}”`).join("; ");
  const misspelt = found(MISSPELT);
  if (misspelt.length) add("spelling", "fix", `Check ${misspelt.length === 1 ? "this spelling" : "these spellings"}: ${list(misspelt, MISSPELT)}.`);
  const joined = found(JOINED);
  if (joined.length) add("joined", "fix", `Write as two words: ${list(joined, JOINED)}.`);
  const forms = found(WRONG_FORM);
  if (forms.length) add("word-form", "fix", `${forms.length === 1 ? "This word does" : "These words do"} not take a regular ending: ${list(forms, WRONG_FORM)}.`, forms.map((w) => (/ed$/.test(w) ? "irregular_verbs" : "plurals")));
  const bare = found(NO_APOSTROPHE);
  if (bare.length) add("apostrophe", "fix", `An apostrophe is missing: ${list(bare, NO_APOSTROPHE)}.`, ["contractions"]);
  const texting = [...new Set(text.match(TEXTING) ?? [])];
  if (texting.length) add("texting", "fix", `Write whole words, not message short forms: ${quote(texting, 5)}.`);
  if (dict) {
    // every word not on the spelling list; words the sure lists above already named are not repeated
    const named = new Set([...misspelt, ...joined, ...forms, ...bare, ...texting.map((w) => w.toLowerCase())]);
    const unknown = unknownWords(text, dict, named);
    if (unknown.length) {
      const shown = unknown.slice(0, 6).map((w) => { const s = dict.suggest(w); return s ? `“${w}” (${s}?)` : `“${w}”`; });
      add("unknown", "tip", `Check the spelling of ${unknown.length === 1 ? "this word" : "these words"}: ${shown.join(", ")}${unknown.length > 6 ? ` and ${unknown.length - 6} more` : ""}. If it is a name or a word from another language, it may be right.`);
    }
  }
  if (/[!?]{2,}|,{2,}|(?<!\.)\.\.(?!\.)/.test(text)) add("marks", "tip", "Use one punctuation mark at a time: a single full stop, comma, question mark or exclamation mark.");

  // grammar slips that follow a pattern
  const slips: string[] = [];
  const slipTopics: string[] = [];
  for (const { re, say, agree, topic } of SLIPS) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (agree && HELPER.test(text.slice(Math.max(0, text.slice(0, m.index).search(/[^.?!]*$/)), m.index))) continue;
      const isA = /^a /i.test(m[0]);
      const isAn = /^an /i.test(m[0]);
      // "an MBA", "an X-ray": a word in capitals is said letter by letter, so the rule does not apply
      if ((isA && m[1] && A_OK.test(m[1])) || (isAn && m[1] && (AN_OK.test(m[1]) || /^[A-Z]{2}|^[A-Z]$/.test(m[1])))) continue;
      slips.push(say(m));
      if (topic) slipTopics.push(topic);
    }
  }
  if (slips.length) add("grammar", "fix", `Look again at: ${[...new Set(slips)].slice(0, 6).join("; ")}.`, slipTopics);

  const asked = sentences.filter((x) => ASKED.test(x));
  if (asked.length) add("question", "tip", `${asked.length === 1 ? "This looks" : "These look"} like a question, so end with a question mark: ${quote(asked.map((x) => x.split(" ").slice(0, 4).join(" ") + " …"), 2)}.`);

  // very long sentences
  const long = sentences.filter((s) => wordsOf(s).length > 35);
  if (long.length) add("long-sentence", "tip", `${long.length === 1 ? "One sentence is" : `${long.length} sentences are`} over 35 words. Try splitting: ${quote(long.map((s) => `${s.split(" ").slice(0, 5).join(" ")} …`), 2)}.`);

  // the same opening again and again
  const starts = sentences.map((s) => (wordsOf(s)[0] ?? "").toLowerCase());
  const startCount = new Map<string, number>();
  starts.forEach((w) => w && startCount.set(w, (startCount.get(w) ?? 0) + 1));
  const [topStart, topN] = [...startCount].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  if (sentences.length >= 4 && topN >= 4 && topN / sentences.length > 0.5) add("openings", "tip", `${topN} of your ${sentences.length} sentences start with “${topStart[0].toUpperCase()}${topStart.slice(1)}”. Begin some of them another way.`);

  // one word used again and again; and weak words
  const counts = new Map<string, number>();
  lower.forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1));
  const repeated = [...counts].filter(([w, n]) => w.length >= 4 && !STOP.has(w) && !WEAK.includes(w) && n >= 5 && n / words.length > 0.04).sort((a, b) => b[1] - a[1]);
  if (repeated.length) add("repeated", "tip", `You used “${repeated[0][0]}” ${repeated[0][1]} times. Another word, or “it”, would read better in places.`);
  const weak = WEAK.filter((w) => (counts.get(w) ?? 0) >= 3);
  if (weak.length) add("weak", "tip", `${quote(weak)} ${weak.length === 1 ? "appears" : "appear"} three times or more. Try a more exact word.`);

  // linking words
  const linkers = [...new Set(lower.filter((w) => LINKERS.includes(w)))];
  if (words.length >= 40 && linkers.length === 0) add("linkers", "tip", "There are no linking words such as because, but, then or however. They show how your ideas connect.");
  else if (linkers.length >= 3) add("linkers-ok", "good", `You linked your ideas with words such as ${linkers.slice(0, 3).join(", ")}.`);

  // paragraphs, where the task is long enough to need them
  if (target.max >= 150 && words.length >= 80 && paragraphs < 2) add("paragraphs", "tip", "This is one block of writing. Leave a blank line between paragraphs: one main idea in each.");

  // the outward shape the task asks for
  const head = lower.slice(0, 8).join(" ");
  const tail = lower.slice(-25).join(" ");
  const has = (list: string[]) => list.some((x) => new RegExp(`\\b${x}\\b`).test(lower.join(" ")));
  if (target.form === "letter" || target.form === "formal") {
    const informal = target.form === "letter";
    if (informal && !/\bdear\b/.test(head)) add("greeting", "tip", "A letter begins with a greeting, such as “Dear Grandmother,”.");
    if (!/\b(yours|love|regards|sincerely|faithfully|truly|thank you|thanking you|your loving|best wishes)\b/.test(tail)) add("closing", "tip", informal ? "A letter ends with a closing and your name, such as “With love,”." : "End with a formal closing, such as “Yours faithfully,” or, in a notice, the name and post of the person issuing it.");
  }
  if (target.form === "argument") {
    if (!has(["i think", "i believe", "in my opinion", "in my view", "should", "must", "i agree", "i disagree"])) add("position", "tip", "Say plainly what your view is, for example with “I believe” or “In my opinion”.");
    if (!has(["because", "since", "therefore", "for example", "for instance", "as a result"])) add("reasons", "tip", "Back your view with reasons and examples: words such as because and for example help.");
  }
  if (target.form === "narrative" && words.length >= 40 && !has(["then", "after", "suddenly", "finally", "later", "when", "next", "at last", "soon"])) add("time", "tip", "A story needs time words such as then, suddenly and at last, so the reader can follow the order.");
  return out();
}
const ORDER = { fix: 0, tip: 1, good: 2 } as const;
/** What the check does not do, said wherever its notes are shown. */
export const LIMIT = "These checks look only at the form of your writing. They cannot tell whether your ideas are good or on the topic: that is for you and a grown-up to judge.";
