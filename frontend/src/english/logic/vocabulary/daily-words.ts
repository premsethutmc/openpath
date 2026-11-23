/**
 * New words (content/english/vocabulary/daily-words.json): teaches word meanings a few at a time and brings each
 * word back over the following days, the way the Spelling Bee brings back spellings.
 *
 * A sitting is: a quick question on each word that is due again, then up to five new words (the word, its meaning
 * and a sentence, one card each), then two questions on each new word: "which meaning fits?" and "which word fits
 * the gap?". A wrong answer shows the right one and the question comes back once before the sitting ends.
 *
 * A word answered right first time moves on a box and comes back after 1, 3 and then 7 days; after that it counts
 * as learnt. A word missed goes back to the first box. "I know this word" on a new word's card skips it for good.
 * A learner moves up a level once it runs out, once they have said they know most of it, or once ten of its words
 * are done (known or answered) with no more than one missed: a learner who gets it all right need not go through
 * all ninety. A learner who has missed half of ten or more words at a level goes back one, until that level is
 * going well. Words left behind on a lower level are taught later, once the levels above run out.
 *
 * The level is one of the word check's eight bands: the band above the last one the word check found known, or a
 * start by age. Practice-only: nothing here is evidence for the engine.
 */
import wordsJson from "../../../../../content/english/vocabulary/daily-words.json";

export const NEW_PER_DAY = 5;
export const MAX_REVIEWS = 10;
export const OPTIONS = 3;
/** Days until a word returns, by box. Box 4 is learnt. */
export const GAPS = [0, 1, 3, 7];
export const LEARNT = 4;
export const BANDS = 8;
/** Words of a level done (known, or answered in a finished sitting) before a learner can move up by getting them right. */
export const MOVE_UP_AFTER = 10;

export type Pos = "n" | "v" | "adj";
export interface DailyWord {
  word: string;
  band: number;
  pos: Pos;
  meaning: string;
  sentence: string;
  /** Words never offered as a wrong choice in this word's gap question (they would also fit). */
  not: string[];
}
export interface DailyWords {
  version: number;
  status: string;
  words: DailyWord[];
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
const hashOrder = <T>(xs: readonly T[], key: (x: T) => string) => xs.map((x) => ({ x, k: hash(key(x)), s: key(x) })).sort((a, b) => a.k - b.k || (a.s < b.s ? -1 : 1)).map((e) => e.x);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordIn = (word: string) => new RegExp(`\\b${esc(word)}\\b`, "i");

export function buildWords(raw: unknown): DailyWords {
  const r = raw as { version: number; status: string; words: [number, Pos, string, string, string, string[]?][] };
  return { version: r.version, status: r.status, words: r.words.map(([band, pos, word, meaning, sentence, not]) => ({ word, band, pos, meaning, sentence, not: not ?? [] })) };
}

export function wordsProblems(c: DailyWords, reserved: ReadonlySet<string> = new Set()): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of c.words) {
    if (seen.has(w.word)) out.push(`${w.word}: listed twice`);
    seen.add(w.word);
    if (reserved.has(w.word)) out.push(`${w.word}: is a word of the word check`);
    if (w.band < 1 || w.band > BANDS) out.push(`${w.word}: unknown level`);
    if ((w.sentence.match(new RegExp(wordIn(w.word).source, "gi")) ?? []).length !== 1) out.push(`${w.word}: the sentence must use the word exactly once`);
    if (new RegExp(`\\ban? ${esc(w.word)}\\b`, "i").test(w.sentence)) out.push(`${w.word}: "a" or "an" before the gap gives the word away`);
    if (new RegExp(`\\b${esc(w.word.slice(0, 5))}`, "i").test(w.meaning)) out.push(`${w.word}: the meaning uses the word itself`);
    if (w.meaning.split(/\s+/).length > 13) out.push(`${w.word}: the meaning is too long`);
    if (w.pos === "v" && !w.meaning.startsWith("to ")) out.push(`${w.word}: a verb's meaning starts with "to"`);
    if (c.words.filter((o) => o.band === w.band && o.pos === w.pos && o.word !== w.word && !w.not.includes(o.word)).length < OPTIONS - 1) out.push(`${w.word}: too few words of its kind at its level for the other choices`);
  }
  for (let b = 1; b <= BANDS; b++) if (c.words.filter((w) => w.band === b).length < NEW_PER_DAY * 2) out.push(`level ${b}: needs at least ${NEW_PER_DAY * 2} words`);
  return out;
}

export const WORDS: DailyWords = buildWords(wordsJson);
{
  const problems = wordsProblems(WORDS);
  if (problems.length) throw new Error(`daily words: ${problems.slice(0, 5).join("; ")}`);
}

export type QuestionKind = "meaning" | "gap";
export interface Question {
  kind: QuestionKind;
  /** The word (meaning question) or the sentence with a gap (gap question). */
  prompt: string;
  options: string[];
  answer: number;
}

/** The question for a word: the right choice and two from words of the same kind at the same level, in a fixed order. */
export function question(c: DailyWords, w: DailyWord, kind: QuestionKind): Question {
  const others = hashOrder(
    c.words.filter((o) => o.band === w.band && o.pos === w.pos && o.word !== w.word && (kind === "meaning" || !w.not.includes(o.word))),
    (o) => `${kind}|${w.word}|${o.word}`,
  ).slice(0, OPTIONS - 1);
  const pick = (x: DailyWord) => (kind === "meaning" ? x.meaning : x.word);
  const options = hashOrder([w, ...others], (o) => `${kind}|order|${w.word}|${o.word}`).map(pick);
  return { kind, prompt: kind === "meaning" ? w.word : w.sentence.replace(wordIn(w.word), "_____"), options, answer: options.indexOf(pick(w)) };
}

export type WordRecord =
  /** A new word's card was shown. */
  | { type: "meet"; word: string; band: number }
  /** The learner said they already know a new word: it is not taught or asked again. */
  | { type: "known"; word: string; band: number }
  | { type: "answer"; word: string; q: QuestionKind; correct: boolean; first: boolean }
  /** A word's outcome for one sitting: clean when every first try on it was right. */
  | { type: "result"; word: string; clean: boolean };
export interface Dated {
  record: WordRecord;
  at: string;
}

export interface WordState {
  word: string;
  band: number;
  box: number;
  /** When the word was met, and when it last got a result (null: met, but the sitting was not finished). */
  metAt: string;
  resultAt: string | null;
  misses: number;
}
export interface Progress {
  words: Map<string, WordState>;
  known: Map<string, number>;
}

export function progress(history: readonly Dated[]): Progress {
  const words = new Map<string, WordState>();
  const known = new Map<string, number>();
  for (const { record: r, at } of history) {
    if (r.type === "known") known.set(r.word, r.band), words.delete(r.word);
    else if (r.type === "meet") {
      if (!words.has(r.word)) words.set(r.word, { word: r.word, band: r.band, box: 0, metAt: at, resultAt: null, misses: 0 });
    } else if (r.type === "result") {
      const w = words.get(r.word);
      if (!w) continue;
      w.box = r.clean ? Math.min(LEARNT, Math.max(1, w.box + 1)) : 1;
      if (!r.clean) w.misses++;
      w.resultAt = at;
    }
  }
  return { words, known };
}

export type DayOf = (iso: string) => string;
export const utcDay: DayOf = (iso) => iso.slice(0, 10);
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

/** Words due again: met but never finished, or their gap in days has passed. Longest waiting first. */
export function dueWords(p: Progress, now: string, dayOf: DayOf = utcDay): WordState[] {
  const today = dayNumber(dayOf(now));
  const waited = (w: WordState) => (w.resultAt ? today - dayNumber(dayOf(w.resultAt)) - GAPS[w.box] : Infinity);
  return [...p.words.values()]
    .filter((w) => w.box < LEARNT && waited(w) >= 0)
    .sort((a, b) => waited(b) - waited(a) || (a.word < b.word ? -1 : 1));
}

/** How a level is going: words done there (known, or answered in a finished sitting) and how many of them were missed. */
function going(c: DailyWords, p: Progress, band: number) {
  const known = [...p.known.values()].filter((b) => b === band).length;
  const met = [...p.words.values()].filter((w) => w.band === band);
  const done = met.filter((w) => w.resultAt !== null);
  const missed = done.filter((w) => w.misses > 0).length;
  const left = c.words.filter((w) => w.band === band && !p.known.has(w.word) && !p.words.has(w.word)).length;
  const n = known + done.length;
  return { known, met: met.length, left, breezing: n >= MOVE_UP_AFTER && missed * MOVE_UP_AFTER <= n, struggling: done.length >= MOVE_UP_AFTER && missed * 2 >= done.length };
}

/**
 * The level to teach at: the base level, moved up past any level the learner has said they mostly know or has got
 * right, then down one if half the words at that level were missed and the level below is not yet done well.
 */
export function teachBand(c: DailyWords, p: Progress, base: number): number {
  let band = Math.min(BANDS, Math.max(1, base));
  for (; band < BANDS; band++) {
    const g = going(c, p, band);
    if (g.left > 0 && !(g.known >= NEW_PER_DAY && g.known > g.met) && !g.breezing) break;
  }
  if (band > 1 && going(c, p, band).struggling) {
    const below = going(c, p, band - 1);
    if (below.left > 0 && !below.breezing) band--;
  }
  return band;
}

/** The base level: one above the highest band the word check found known, or a start by age. */
export const baseBand = (checkBand: number | null | undefined, age: "early" | "school" | "older" | null | undefined) =>
  checkBand != null ? Math.min(BANDS, checkBand + 1) : age === "early" ? 1 : 2;

/** New words still untaught, nearest level first (the level itself, then above, then below), in a fixed order per level. */
export function freshWords(c: DailyWords, p: Progress, band: number, skip: ReadonlySet<string> = new Set()): DailyWord[] {
  const order = [...Array(BANDS).keys()].map((i) => i + 1).sort((a, b) => Math.abs(a - band) - Math.abs(b - band) || b - a);
  return order.flatMap((b) => hashOrder(c.words.filter((w) => w.band === b && !p.words.has(w.word) && !p.known.has(w.word) && !skip.has(w.word)), (w) => `new|${w.word}`));
}

export interface Summary {
  learning: number;
  learnt: number;
  dueNow: number;
  newToday: number;
  /** Words missed at least once and not yet learnt, most missed first. */
  tricky: string[];
}
export function summary(history: readonly Dated[], now: string, dayOf: DayOf = utcDay): Summary {
  const p = progress(history);
  const all = [...p.words.values()];
  const today = dayOf(now);
  return {
    learning: all.filter((w) => w.box < LEARNT).length,
    learnt: all.filter((w) => w.box >= LEARNT).length,
    dueNow: dueWords(p, now, dayOf).length,
    newToday: all.filter((w) => dayOf(w.metAt) === today).length,
    tricky: all.filter((w) => w.misses > 0 && w.box < LEARNT).sort((a, b) => b.misses - a.misses || (a.word < b.word ? -1 : 1)).map((w) => w.word),
  };
}

export interface Card {
  word: string;
  pos: Pos;
  meaning: string;
  sentence: string;
}
export interface SittingView {
  phase: "meet" | "ask" | "feedback" | "done";
  /** Steps finished and steps in all (a missed question adds one). */
  step: number;
  steps: number;
  card: Card | null;
  /** The question on screen: no answer key. */
  question: { kind: QuestionKind; prompt: string; options: string[] } | null;
  feedback: { correct: boolean; chosen: string; right: string; card: Card } | null;
  done: { newWords: string[]; reviewed: number; clean: number; missed: string[] } | null;
}

type Step = { type: "meet"; word: DailyWord } | { type: "ask"; word: DailyWord; kind: QuestionKind; first: boolean };
const card = (w: DailyWord): Card => ({ word: w.word, pos: w.pos, meaning: w.meaning, sentence: w.sentence });

/** One sitting. Every step appends records; the caller stores what `take()` returns. */
export class WordSitting {
  private readonly content: DailyWords;
  private readonly band: number;
  private readonly progress: Progress;
  private queue: Step[] = [];
  private spare: DailyWord[];
  private log: WordRecord[] = [];
  private stepsDone = 0;
  private last: SittingView["feedback"] = null;
  private readonly firsts = new Map<string, boolean>();
  private readonly fresh: string[] = [];
  private reviewed = 0;
  private closed = false;

  /** `extra`: teach another set of new words even though today's are done. */
  constructor(content: DailyWords, base: number, history: readonly Dated[], now: string, opts: { dayOf?: DayOf; extra?: boolean } = {}) {
    this.content = content;
    this.progress = progress(history);
    this.band = teachBand(content, this.progress, base);
    const dayOf = opts.dayOf ?? utcDay;
    const byWord = new Map(content.words.map((w) => [w.word, w]));
    const due = dueWords(this.progress, now, dayOf).flatMap((s) => (byWord.has(s.word) ? [{ s, w: byWord.get(s.word)! }] : [])).slice(0, MAX_REVIEWS);
    const metToday = [...this.progress.words.values()].filter((w) => dayOf(w.metAt) === dayOf(now)).length;
    const room = opts.extra ? NEW_PER_DAY : Math.max(0, NEW_PER_DAY - metToday);
    const pool = freshWords(content, this.progress, this.band);
    const fresh = pool.slice(0, room);
    this.spare = pool.slice(room);
    this.reviewed = due.length;
    // words due again: one question each, the kind alternating with the box; an unfinished new word gets both
    for (const { s, w } of due) {
      if (s.resultAt === null) this.queue.push({ type: "ask", word: w, kind: "meaning", first: true }, { type: "ask", word: w, kind: "gap", first: true });
      else this.queue.push({ type: "ask", word: w, kind: s.box % 2 ? "gap" : "meaning", first: true });
    }
    for (const w of fresh) this.queue.push({ type: "meet", word: w });
    for (const w of fresh) this.queue.push({ type: "ask", word: w, kind: "meaning", first: true });
    for (const w of [...fresh].reverse()) this.queue.push({ type: "ask", word: w, kind: "gap", first: true });
    this.finishIfDone();
  }

  get level(): number {
    return this.band;
  }

  take(): WordRecord[] {
    const out = this.log;
    this.log = [];
    return out;
  }

  /** The new word's card was read. */
  met(): void {
    const s = this.queue[0];
    if (s?.type !== "meet" || this.last) return;
    this.log.push({ type: "meet", word: s.word.word, band: s.word.band });
    this.fresh.push(s.word.word);
    this.queue.shift();
    this.stepsDone++;
  }

  /** "I know this word": skip it for good and bring in another new word if there is one. */
  knowIt(): void {
    const s = this.queue[0];
    if (s?.type !== "meet" || this.last) return;
    this.log.push({ type: "known", word: s.word.word, band: s.word.band });
    this.queue = this.queue.filter((q) => q.word !== s.word);
    const next = this.spare.shift();
    if (next) {
      const at = this.queue.findIndex((q) => q.type !== "meet");
      this.queue.splice(at < 0 ? this.queue.length : at, 0, { type: "meet", word: next });
      const firstGap = this.queue.findIndex((q) => q.type === "ask" && q.kind === "gap" && this.isNew(q.word));
      this.queue.splice(firstGap < 0 ? this.queue.length : firstGap, 0, { type: "ask", word: next, kind: "meaning", first: true });
      this.queue.push({ type: "ask", word: next, kind: "gap", first: true });
    }
    this.finishIfDone();
  }

  private isNew(w: DailyWord): boolean {
    return !this.progress.words.has(w.word);
  }

  answer(choice: number): void {
    const s = this.queue[0];
    if (s?.type !== "ask" || this.last) return;
    const q = question(this.content, s.word, s.kind);
    if (choice < 0 || choice >= q.options.length) return;
    const correct = choice === q.answer;
    this.log.push({ type: "answer", word: s.word.word, q: s.kind, correct, first: s.first });
    if (s.first) this.firsts.set(s.word.word, (this.firsts.get(s.word.word) ?? true) && correct);
    this.queue.shift();
    this.stepsDone++;
    // a missed question comes back once, after the others
    if (!correct && s.first) this.queue.push({ ...s, first: false });
    this.last = { correct, chosen: q.options[choice], right: q.options[q.answer], card: card(s.word) };
  }

  /** Leave the feedback and go on. */
  next(): void {
    this.last = null;
    this.finishIfDone();
  }

  private finishIfDone(): void {
    if (this.queue.length || this.closed) return;
    this.closed = true;
    for (const [word, clean] of this.firsts) this.log.push({ type: "result", word, clean });
  }

  snapshot(): SittingView {
    const base = { step: this.stepsDone, steps: this.stepsDone + this.queue.length, card: null, question: null, feedback: null, done: null };
    if (this.last) return { ...base, phase: "feedback", feedback: this.last };
    const s = this.queue[0];
    if (!s) {
      const results = [...this.firsts];
      return { ...base, phase: "done", done: { newWords: [...this.fresh], reviewed: this.reviewed, clean: results.filter(([, c]) => c).length, missed: results.filter(([, c]) => !c).map(([w]) => w) } };
    }
    if (s.type === "meet") return { ...base, phase: "meet", card: card(s.word) };
    const q = question(this.content, s.word, s.kind);
    return { ...base, phase: "ask", question: { kind: q.kind, prompt: q.prompt, options: q.options } };
  }
}
