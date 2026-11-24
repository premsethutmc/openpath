/**
 * Find my level: one short check when a learner starts English, so the app can say where to begin in each stream.
 * Three parts, each adaptive and each giving its own level (there is no single English number):
 *
 *   words      the word check itself (logic/vocabulary/size-check.ts): a word level on the scale of eight;
 *   reading    up to three texts with six questions each, chosen by elimination (see ReadingPlacement): the level is
 *              the highest one the answers make likely, and the learner starts reading there;
 *   listening  four to six dictated sentences, one try each, chosen by elimination. A sentence is right when its words
 *              are right (capital letters and the end mark are not counted; a long sentence may have one slip).
 *
 *   spelling   five to eight dictated Spelling Bee words, one try each, chosen by elimination.
 *
 *              In both, the level is the highest one the answers make likely that also has two right answers at
 *              that level or above (see typedBelief): one right answer is never a level.
 *
 * Grammar keeps its own, longer starting check (the engine's, which is real evidence); the result screen offers it
 * as the last step. Any part can be skipped. Practice-only: nothing here is evidence for the engine. The reading part uses a
 * practice text of the course, never one kept for the course's fresh checks.
 */
import { OLD_LEVELS, mark, pick, wordsOf, type Dictation, type DictationRecord, type Sentence } from "../dictation/dictation.ts";
import { SCALE, rescale } from "../scale.ts";
import { CHECK_VERSION } from "../vocabulary/size-check.ts";
import { checkSpot, fixParts, spotWords, type Ask, type GrammarItem, type GrammarUse } from "../grammar-use/grammar-use.ts";
import { checkSpelling, type SpellWord } from "../spelling.ts";
import { OLD_LEVELS as READING_OLD, type Course, type Level, type Passage, type Question, type SkillId } from "../reading/course.ts";

/**
 * The quick check: the word check first, then a short confirmation in each other part.
 *
 * Word knowledge is the quickest thing to measure well (about twenty taps) and goes with the other skills more often
 * than not, so the word level decides WHERE each other part starts asking. It never decides a level: every part still
 * reports only what its own answers show, by the same rules as the full check, so a learner with strong words and
 * weak listening is placed low in listening. Starting in the right place is what makes a few questions enough.
 */
export type Mode = "gaps" | "quick" | "full";
export interface Limits {
  /** Fewest and most questions (reading: texts) before the part ends. */
  least: number;
  most: number;
  /**
   * Quick check only. `near`: how firmly the part keeps asking close to where it started (in levels); `reach`: how far
   * above the middle of its belief it asks. Both only choose the next question: they never enter the level reported.
   */
  near?: number;
  reach?: number;
}
export const QUICK: { reading: Limits; listening: Limits; spelling: Limits; grammar: Limits } = {
  reading: { least: 1, most: 2 },
  listening: { least: 3, most: 3, near: 1.25, reach: 0 },
  spelling: { least: 4, most: 4, near: 1.25, reach: 0 },
  grammar: { least: 3, most: 4, near: 1.25, reach: 0 },
};
/** Where a part with `top` levels starts asking, given the word level found (1 to 8; 0 or none: the bottom or the middle). */
export function startFromWords(band: number | null | undefined, top: number, middle: number): number {
  if (band === null || band === undefined) return middle;
  if (band <= 0) return 1;
  // rounded down: a part that starts a little low gets right answers first, which is what a level needs
  return Math.min(top, Math.max(1, Math.floor(1 + ((band - 1) * (top - 1)) / 7)));
}

export type Part = "words" | "reading" | "listening" | "spelling" | "grammar";
export const PARTS: Part[] = ["words", "reading", "listening", "spelling", "grammar"];
/** Every part starts in the middle of its scale, whatever the learner's age or class: the answers move it from there. */
export const MIDDLE = { reading: 3, listening: 3, spelling: 3, grammar: 3 } as const;
/** The grammar part: two naming-words questions (a noun, a verb), then sentences chosen by elimination. */
export const GRAMMAR_BASICS: Ask[] = ["noun", "verb"];
/** After the two naming questions: at least GRAMMAR_LEAST sentences, at most GRAMMAR_MOST. GRAMMAR_STEPS: the most questions in all. */
/** A tapped answer can be a lucky tap, so a grammar level needs three right answers at that level or above. */
export const GRAMMAR_NEED = 3;
export const GRAMMAR_LEAST = 4;
export const GRAMMAR_MOST = 7;
export const GRAMMAR_STEPS = GRAMMAR_BASICS.length + GRAMMAR_MOST;
/** The reading part: every text is asked on these six skills; READING_PASS or more right of the six is a text read well. */
export const READING_SKILLS: SkillId[] = ["detail", "sequence", "cause", "feelings", "main_idea", "fact_opinion"];
export const READING_PASS = 4;
export const READING_TEXTS = 3;
export const READING_SURE = 0.85;
/** The version of the reading part; a reading result of another version was measured more loosely and is not used. */
export const READING_CHECK = 2;
/** Listening: at most this many sentences, and at least LISTENING_LEAST before it may stop. */
export const LISTENING_STEPS = 6;
export const LISTENING_LEAST = 4;
/** Does a dictated sentence pass for placement? Every word spelt right; one slip allowed from eight words up. */
export const listeningPass = (right: number, total: number): boolean => right >= total - (total >= 8 ? 1 : 0);
/** Spelling: at most this many words, and at least SPELLING_LEAST before it may stop. */
export const SPELLING_STEPS = 8;
export const SPELLING_LEAST = 5;

export type LevelCheckRecord =
  | { type: "start"; mode?: Mode }
  /** `scale`: the word check version; a words result on another version used other levels and is not used. */
  | { type: "words"; band: number; scale?: number; estimate?: number; correct?: number; answered: number }
  /** `passed`: the highest reading level passed (0: none). */
  | { type: "reading"; passed: number; scale?: number; check?: number; steps: { level: number; right: number; asked: number }[] }
  /** `check`: the version of the typed parts; a listening or spelling result of another version is not used. */
  | { type: "listening"; level: number; scale?: number; check?: number; steps: { id: string; level: number; perfect: boolean }[] }
  | { type: "spelling"; level: number; check?: number; steps: { word: string; level: number; correct: boolean }[] }
  | { type: "grammar"; level: number; scale?: number; check?: number; basics: { right: number; asked: number }; steps: { id: string; level: number; correct: boolean }[] }
  /** The quick gap check (GapCheck): one overall level on the eight word levels. `check`: its version. */
  | { type: "gaps"; level: number; check: number; steps: { word: string; level: number; correct: boolean }[] }
  | { type: "skipped"; part: Part }
  | { type: "done" };

export interface Levels {
  /** Whether a level check was finished at least once. */
  done: boolean;
  /**
   * Parts whose level is a starting point worked out from the quick gap check, not measured in that part. A part
   * measured before or after the gap check always keeps its measured level.
   */
  estimated?: Part[];
  words: { band: number; estimate?: number; correct?: number; answered?: number } | null;
  /** `start`: the reading level to begin at. */
  reading: { passed: number; start: number } | null;
  listening: { level: number } | null;
  spelling: { level: number } | null;
  /** basics: both naming-words questions (a noun, a verb) were right. */
  grammar: { level: number; basics: boolean } | null;
}

/** The latest level found for each part. */
export function levelsFrom(records: readonly LevelCheckRecord[], readingLevels = 6): Levels {
  const out: Levels = { done: false, words: null, reading: null, listening: null, spelling: null, grammar: null };
  for (const r of records) {
    if (r.type === "done") out.done = true;
    if (r.type === "gaps" && r.check === GAP_CHECK) {
      // the gap check fills only the parts that have no measured level: it never replaces one
      const tops = { reading: readingLevels, listening: 7, spelling: 5, grammar: 7 };
      const est = new Set(out.estimated ?? []);
      const fill = (part: Part, set: () => void) => {
        if (out[part] && !est.has(part)) return;
        set();
        est.add(part);
      };
      fill("words", () => (out.words = { band: r.level }));
      fill("reading", () => {
        const at = r.level <= 0 ? 0 : startFromWords(r.level, tops.reading, 1);
        out.reading = { passed: at, start: Math.max(1, at) };
      });
      // listening is not in the gap check at all, so it starts one level lower still
      fill("listening", () => (out.listening = { level: Math.max(1, startFromWords(r.level, tops.listening, 1) - 1) }));
      fill("spelling", () => (out.spelling = { level: startFromWords(r.level, tops.spelling, 1) }));
      fill("grammar", () => (out.grammar = { level: startFromWords(r.level, tops.grammar, 1), basics: true }));
      out.estimated = [...est];
    }
    const measured = (part: Part) => {
      if (out.estimated?.includes(part)) out.estimated = out.estimated.filter((x) => x !== part);
    };
    if (r.type === "words" || r.type === "reading" || r.type === "listening" || r.type === "spelling" || r.type === "grammar") measured(r.type);
    if (r.type === "words" && r.scale !== CHECK_VERSION) out.words = null;
    else if (r.type === "words") out.words = r.correct === undefined ? { band: r.band, estimate: r.estimate } : { band: r.band, correct: r.correct, answered: r.answered };
    if (r.type === "reading" && r.check !== READING_CHECK) out.reading = null;
    else if (r.type === "reading") {
      const passed = r.scale === SCALE ? r.passed : READING_OLD[r.passed] ?? r.passed;
      // start at the highest level passed: its units still teach skills not yet checked there (sim-english@2: one above
      // placed most learners a level high and made the first week harder, with no gain by the end of the month)
      out.reading = { passed, start: Math.min(readingLevels, Math.max(1, passed)) };
    }
    if (r.type === "listening") out.listening = r.check === TYPED_CHECK ? { level: rescale(r, OLD_LEVELS) } : null;
    if (r.type === "spelling") out.spelling = r.check === TYPED_CHECK ? { level: r.level } : null;
    if (r.type === "grammar") out.grammar = r.check === TYPED_CHECK ? { level: r.level, basics: r.basics.right >= r.basics.asked } : null;
  }
  return out;
}

export const readingStart = (age: "early" | "school" | "older" | null | undefined): number => (age === "early" ? 1 : 3);
/** How far the reading level moves after each text: a wide first move, then one step. At most three texts. */

export interface ReadingPlacementView {
  phase: "asking" | "done";
  level: number;
  step: number;
  index: number;
  total: number;
  passage: { title: string; text: string } | null;
  /** The question on screen: no answer key. */
  question: { prompt: string; options: string[] } | null;
}

/**
 * The reading part, by elimination (reading check version READING_CHECK).
 *
 * It holds a belief about the level of text the learner can read, starts with a text from the middle, and after
 * each text picks the level that splits the belief most evenly: a text read badly sends it well down, a text read
 * well sends it up. Every text has six questions, one for each reading skill, and each can be answered "I'm not
 * sure". At most READING_TEXTS texts.
 *
 * The level reported is the highest one the answers make likely (READING_SURE), never the best guess, and never a
 * level without a text at that level or above read well (READING_PASS of six right). Three choices a question means
 * a blind guess is right one time in three, so the belief counts every right answer for only what a guess leaves.
 * streams.test.ts holds it to that with simulated readers.
 */
const READING_GRID = (top: number) => Array.from({ length: 2 * (top + 1) + 1 }, (_, i) => i / 2);
const canRead = (level: number, a: number) => 1 / (1 + Math.exp(-(2.4 * (a - level) + 1.4)));
/** The belief about the level of text a learner can read, after these answers. */
export function readingBelief(answers: readonly { level: number; right: boolean; unsure?: boolean; options: number }[], top: number): { grid: number[]; p: number[] } {
  const grid = READING_GRID(top);
  const p = grid.map(() => 1);
  // How often this learner says "I'm not sure" instead of guessing. A learner who says so when they do not know is
  // not marked down for it: their right answers are then worth more, because they were not guesses.
  const unsure = answers.filter((x) => x.unsure).length;
  const wrong = answers.filter((x) => !x.right && !x.unsure).length;
  const says = (unsure + 0.5) / (unsure + 1.5 * wrong + 1.5);
  for (const x of answers)
    grid.forEach((a, i) => {
      const k = canRead(x.level, a);
      const hit = k * 0.92 + ((1 - k) * (1 - says)) / x.options;
      p[i] *= x.right ? hit : x.unsure ? (1 - k) * says + 0.01 : k * 0.08 + (1 - k) * (1 - says) * (1 - 1 / x.options) + 0.01;
    });
  const total = p.reduce((s, x) => s + x, 0);
  return { grid, p: p.map((x) => x / total) };
}

export class ReadingPlacement {
  private readonly course: Course;
  private readonly top: number;
  private level: number;
  private questions: Question[] = [];
  private passage: Passage | null = null;
  private index = 0;
  private right = 0;
  private readonly used = new Set<string>();
  private answers: { level: number; right: boolean; unsure: boolean; options: number }[] = [];
  private steps: { level: number; right: number; asked: number }[] = [];
  private finished = false;

  private readonly limits: Limits;

  constructor(course: Course, start: number, limits: Limits = { least: 2, most: READING_TEXTS }) {
    this.course = course;
    this.limits = limits;
    this.top = Math.max(...course.levels.map((l) => l.id));
    this.level = start;
    this.load(start);
  }

  /** Practice texts of a level that carry a question for every placement skill and have not been used in this sitting. */
  private texts(level: number): Passage[] {
    return [...this.course.passages.values()].filter((p) => p.level === level && p.role === "practice" && !this.used.has(p.id) && READING_SKILLS.every((skill) => this.course.questions.some((q) => q.passage === p.id && q.skill === skill && q.role === "practice")));
  }

  /** A text of the level wanted, else of the nearest level that still has one. */
  private load(want: number): void {
    const levels = this.course.levels.map((l) => l.id as number).sort((a, b) => Math.abs(a - want) - Math.abs(b - want) || a - b);
    const level = levels.find((l) => this.texts(l).length > 0);
    this.passage = level === undefined ? null : this.texts(level).at(-1)!;
    if (!this.passage) return void (this.finished = true);
    this.level = level!;
    this.used.add(this.passage.id);
    this.questions = READING_SKILLS.flatMap((s) => this.course.questions.filter((q) => q.passage === this.passage!.id && q.skill === s && q.role === "practice").slice(0, 1));
    this.index = 0;
    this.right = 0;
  }

  /** `choice`: the index of an answer, or null for "I'm not sure". */
  answer(choice: number | null): void {
    const q = this.questions[this.index];
    if (this.finished || !q) return;
    if (choice !== null && (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length)) return;
    const right = choice === q.answer;
    if (right) this.right++;
    this.answers.push({ level: this.level, right, unsure: choice === null, options: q.options.length });
    if (++this.index < this.questions.length) return;
    this.steps.push({ level: this.level, right: this.right, asked: this.questions.length });
    const { grid, p } = readingBelief(this.answers, this.top);
    const mean = p.reduce((s, x, i) => s + x * grid[i], 0);
    const spread = Math.sqrt(p.reduce((s, x, i) => s + x * (grid[i] - mean) ** 2, 0));
    // one text is enough only in the quick check, and only when it was read clearly well or clearly badly
    const clear = this.steps.length >= 2 || this.right >= this.questions.length - 1 || this.right <= 1;
    if (this.steps.length >= this.limits.most || (this.steps.length >= this.limits.least && clear && spread <= (this.steps.length >= 2 ? 0.5 : 0.8))) return void (this.finished = true);
    let sum = 0;
    const median = grid[p.findIndex((x) => (sum += x) >= 0.5)];
    this.load(Math.min(this.top, Math.max(1, Math.round(median + 0.5))));
  }

  /** The highest level shown (0: none), with what was asked. */
  result(): { passed: number; scale: number; check: number; steps: { level: number; right: number; asked: number }[] } {
    const { grid, p } = readingBelief(this.answers, this.top);
    let passed = 0;
    for (let level = 1; level <= this.top; level++) if (p.reduce((s, x, i) => s + (grid[i] >= level ? x : 0), 0) >= READING_SURE) passed = level;
    // a level needs a text at that level or above read well: one lucky text lower down is not enough
    while (passed > 0 && !this.steps.some((x) => x.level >= passed && x.right >= READING_PASS)) passed--;
    return { scale: SCALE, check: READING_CHECK, passed, steps: [...this.steps] };
  }

  snapshot(): ReadingPlacementView {
    const q = this.questions[this.index];
    if (this.finished || !q) return { phase: "done", level: this.level, step: this.steps.length, index: 0, total: 0, passage: null, question: null };
    return { phase: "asking", level: this.level, step: this.steps.length, index: this.index, total: this.questions.length, passage: { title: this.passage!.title, text: this.passage!.text }, question: { prompt: q.prompt, options: [...q.options] } };
  }
}

/**
 * Typed parts (listening and spelling), by elimination (version TYPED_CHECK).
 *
 * A typed answer cannot be guessed from choices, but one right answer is still not a level: a learner may happen to
 * know one hard word, or slip on an easy one. So both parts hold a belief about the level the learner can write at,
 * ask next at the level that splits that belief most evenly, and report the highest level the answers make likely
 * (TYPED_SURE) that also has TYPED_NEED right answers at that level or above. streams.test.ts holds them to that
 * with simulated learners.
 */
export const TYPED_CHECK = 2;
export const TYPED_SURE = 0.75;
export const TYPED_NEED = 2;
const canWrite = (level: number, a: number) => 1 / (1 + Math.exp(-(2 * (a - level) + 1.4)));
export function typedBelief(answers: readonly { level: number; right: boolean; lucky?: number }[], top: number, prior?: { centre: number; sd: number }): { grid: number[]; p: number[]; median: number; spread: number } {
  const grid = Array.from({ length: 2 * (top + 1) + 1 }, (_, i) => i / 2);
  const p = grid.map((a) => (prior ? Math.exp(-((a - prior.centre) ** 2) / (2 * prior.sd ** 2)) : 1));
  for (const x of answers)
    grid.forEach((a, i) => {
      const k = canWrite(x.level, a);
      // knows it but slips one time in eight; does not know it but happens to get it: one time in twenty when typed,
      // or the chance of a blind tap when the answer is tapped (`lucky`)
      const hit = k * 0.875 + (1 - k) * (x.lucky ?? 0.05);
      p[i] *= x.right ? hit : 1 - hit;
    });
  const total = p.reduce((t, x) => t + x, 0);
  const q = p.map((x) => x / total);
  let sum = 0;
  const median = grid[q.findIndex((x) => (sum += x) >= 0.5)];
  const mean = q.reduce((t, x, i) => t + x * grid[i], 0);
  return { grid, p: q, median, spread: Math.sqrt(q.reduce((t, x, i) => t + x * (grid[i] - mean) ** 2, 0)) };
}
/**
 * The level to ask next, and whether enough has been asked. `reach`: how far above the middle of the belief to ask.
 * Spelling has five levels and asks close to the middle, so a level is confirmed; listening has seven and few
 * sentences, so it reaches further up to get to the top in time.
 */
function typedNext(answers: readonly { level: number; right: boolean; lucky?: number }[], start: number, top: number, least: number, most: number, reach: number, near?: number): { level: number; done: boolean } {
  if (!answers.length) return { level: start, done: false };
  const b = typedBelief(answers, top, near ? { centre: start, sd: near } : undefined);
  return { level: Math.min(top, Math.max(1, Math.round(b.median + reach))), done: answers.length >= most || (answers.length >= least && b.spread <= 0.5) };
}
/** The level to report: never below `floor`, never the best guess. */
function typedLevel(answers: readonly { level: number; right: boolean; lucky?: number }[], top: number, floor: number, need = TYPED_NEED): number {
  const { grid, p } = typedBelief(answers, top);
  let level = floor;
  for (let l = floor + 1; l <= top; l++) if (p.reduce((t, x, i) => t + (grid[i] >= l ? x : 0), 0) >= TYPED_SURE) level = l;
  while (level > floor && answers.filter((x) => x.right && x.level >= level).length < need) level--;
  return level;
}

/** The listening part: LISTENING_LEAST to LISTENING_STEPS sentences, one try each, chosen by elimination. Each is stored as a Listen and write answer, so it is not asked again soon. */
export class ListeningPlacement {
  private readonly content: Dictation;
  private readonly history: DictationRecord[];
  private level: number;
  private current: Sentence | null = null;
  private steps: { id: string; level: number; perfect: boolean }[] = [];
  private log: DictationRecord[] = [];

  private readonly limits: Limits;

  constructor(content: Dictation, start: number, history: readonly DictationRecord[], limits: Limits = { least: LISTENING_LEAST, most: LISTENING_STEPS }) {
    this.limits = limits;
    this.content = content;
    this.history = [...history];
    this.level = start;
    this.load();
  }

  private get answers() {
    return this.steps.map((s) => ({ level: s.level, right: s.perfect }));
  }
  private get ids() {
    return this.content.levels.map((l) => l.id as number);
  }

  /** A sentence of the level wanted, else of the nearest level that still has one. */
  private load(): void {
    const used = new Set(this.steps.map((s) => s.id));
    const next = typedNext(this.answers, this.level, Math.max(...this.ids), this.limits.least, this.limits.most, this.limits.reach ?? 0.5, this.limits.near);
    this.current = null;
    if (next.done) return;
    for (const level of [...this.ids].sort((a, b) => Math.abs(a - next.level) - Math.abs(b - next.level) || a - b)) {
      this.current = pick(this.content, level, this.history).find((s) => !used.has(s.id)) ?? null;
      if (this.current) break;
    }
  }

  get finished(): boolean {
    return !this.current;
  }

  /** The sentence to say aloud: for the speaker only. */
  spoken(): string | null {
    return this.finished ? null : this.current!.text;
  }

  take(): DictationRecord[] {
    const out = this.log;
    this.log = [];
    return out;
  }

  check(typed: string, plays: number): void {
    if (this.finished) return;
    const s = this.current!;
    if (!wordsOf(typed).length) return; // nothing typed
    const m = mark(s, typed);
    // one try, marked the same way as Listen and write. For placement a sentence passes when its words are right:
    // capital letters and the end mark do not count, and a sentence of eight words or more may have one word wrong.
    const passed = listeningPass(m.right, m.total);
    const record: DictationRecord = { type: "answer", sitting: "level-check", id: s.id, level: s.level, scale: SCALE, tries: 1, perfectFirst: m.perfect, perfect: m.perfect, right: m.right, total: m.total, missed: m.missed, misspelt: m.misspelt, capitals: m.capitals, end: m.end === "ok", plays, typed: typed.trim().slice(0, 200) };
    this.log.push(record);
    this.history.push(record);
    this.steps.push({ id: s.id, level: s.level, perfect: passed });
    this.load();
  }

  result(): { level: number; scale: number; check: number; steps: { id: string; level: number; perfect: boolean }[] } {
    return { scale: SCALE, check: TYPED_CHECK, level: typedLevel(this.answers, Math.max(...this.ids), Math.min(...this.ids)), steps: [...this.steps] };
  }

  snapshot(): { phase: "write" | "done"; index: number; total: number; id: string | null } {
    return this.finished ? { phase: "done", index: this.steps.length, total: this.limits.most, id: null } : { phase: "write", index: this.steps.length, total: this.limits.most, id: this.current!.id };
  }
}

/** The reading level type, for callers that pass the start level to the course. */
export const asReadingLevel = (n: number | null | undefined): Level | undefined => (n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6 ? n : undefined);

export const spellingStart = (age: "early" | "school" | "older" | null | undefined): number => (age === "early" ? 1 : age === "older" ? 3 : 2);

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** The spelling part: SPELLING_LEAST to SPELLING_STEPS dictated words of the Spelling Bee, one try each, chosen by elimination. */
export class SpellingPlacement {
  private readonly words: SpellWord[];
  private readonly top: number;
  private level: number;
  private current: SpellWord | null = null;
  private steps: { word: string; level: number; correct: boolean }[] = [];

  private readonly limits: Limits;

  constructor(words: readonly SpellWord[], start: number, limits: Limits = { least: SPELLING_LEAST, most: SPELLING_STEPS }) {
    this.limits = limits;
    this.words = words.filter((w) => w.level !== undefined).map((w) => ({ w, k: hash(`level-check|${w.id}`) })).sort((a, b) => a.k - b.k || (a.w.id < b.w.id ? -1 : 1)).map((x) => x.w);
    this.top = Math.max(1, ...this.words.map((w) => w.level!));
    this.level = Math.min(this.top, Math.max(1, start));
    this.load();
  }

  private get answers() {
    return this.steps.map((s) => ({ level: s.level, right: s.correct }));
  }

  /** A word of the level wanted, else of the nearest level that still has one. */
  private load(): void {
    const used = new Set(this.steps.map((s) => s.word));
    const next = typedNext(this.answers, this.level, this.top, this.limits.least, this.limits.most, this.limits.reach ?? 0.25, this.limits.near);
    this.current = null;
    if (next.done) return;
    const levels = Array.from({ length: this.top }, (_, i) => i + 1).sort((a, b) => Math.abs(a - next.level) - Math.abs(b - next.level) || a - b);
    for (const level of levels) {
      this.current = this.words.find((w) => w.level === level && !used.has(w.word)) ?? null;
      if (this.current) break;
    }
  }

  get finished(): boolean {
    return !this.current;
  }

  /** What to say aloud: the word, its sentence, the word again. For the speaker only. */
  spoken(wordOnly = false): string | null {
    const w = this.current;
    if (this.finished || !w) return null;
    return w.sentence && !wordOnly ? `${w.word}. ${w.sentence} ${w.word}.` : `${w.word}.`;
  }

  answer(typed: string): void {
    const w = this.current;
    if (this.finished || !w || !typed.trim()) return;
    const correct = checkSpelling(w, typed);
    this.steps.push({ word: w.word, level: w.level!, correct });
    this.load();
  }

  result(): { level: number; check: number; steps: { word: string; level: number; correct: boolean }[] } {
    return { check: TYPED_CHECK, level: typedLevel(this.answers, this.top, 1), steps: [...this.steps] };
  }

  snapshot(): { phase: "write" | "done"; index: number; total: number; id: string | null } {
    return this.finished ? { phase: "done", index: this.steps.length, total: this.limits.most, id: null } : { phase: "write", index: this.steps.length, total: this.limits.most, id: this.current!.id };
  }
}

/**
 * The quick gap check: one overall level in about three minutes (version GAP_CHECK).
 *
 * Each question is a sentence with one word half hidden: the first half of the word is shown and the learner types
 * the rest. To finish the word a learner has to know it, spell it, and read the sentence it sits in, so one answer
 * says something about words, spelling, grammar and reading together. Nothing is offered to choose from.
 *
 * The words and sentences are those of New words (never one the learner has met there), and a word's level is its
 * measured level on the eight word levels. Questions are chosen by elimination (typedBelief), and the level is the
 * highest one the answers make likely that also has two right answers at that level or above.
 *
 * What it gives the other parts is only a place to start (levelsFrom): reading, spelling and grammar start at the
 * matching level rounded down, listening one lower because nothing here is heard. A part's own check, taken before
 * or after, always replaces that starting point.
 */
/**
 * Version 2 (24 November 2026): results of version 1 are no longer used, and the check is not offered (GAP_OFFERED).
 * The first real sitting placed a capable adult (about level 5 by their own estimate) at level 1: six of twelve
 * level-2 words right, missing fade, mend and tease. A typed gap can fit another word or be lost to a slip of the
 * thumb, so a miss here is not good evidence that the word is unknown. Until the questions are fixed and tried on
 * real people, Find my level starts with the word check instead, and a stored version-1 result gives no part a
 * starting point. The check itself and its tests are kept.
 */
export const GAP_CHECK = 2;
export const GAP_OFFERED = false;
export const GAP_LEAST = 10;
export const GAP_MOST = 16;
export interface GapItem {
  word: string;
  level: number;
  /** The sentence before and after the word, and the word's first letters as shown. */
  before: string;
  after: string;
  shown: string;
  missing: number;
}
/** The gap questions that can be made from sentence words: the word must stand in its sentence once and have four letters or more. */
export function gapItems(words: readonly { word: string; band: number; sentence: string }[]): GapItem[] {
  const out: GapItem[] = [];
  for (const w of words) {
    if (!/^[a-z]{4,}$/.test(w.word)) continue;
    const at = w.sentence.search(new RegExp(`\\b${w.word}\\b`, "i"));
    if (at < 0) continue;
    const keep = Math.ceil(w.word.length / 2);
    out.push({ word: w.word, level: w.band, before: w.sentence.slice(0, at), after: w.sentence.slice(at + w.word.length), shown: w.sentence.slice(at, at + keep), missing: w.word.length - keep });
  }
  return out.map((it) => ({ it, k: hash(`gap-check|${it.word}`) })).sort((a, b) => a.k - b.k || (a.it.word < b.it.word ? -1 : 1)).map((x) => x.it);
}
export interface GapView {
  phase: "ask" | "done";
  index: number;
  total: number;
  /** The question on screen: the answer is not in it. */
  item: { before: string; shown: string; missing: number; after: string } | null;
}
export class GapCheck {
  private readonly items: GapItem[];
  private readonly top: number;
  private readonly start: number;
  private current: GapItem | null = null;
  private steps: { word: string; level: number; correct: boolean }[] = [];

  /** `met`: words the learner has met in New words; they are not asked. */
  constructor(words: readonly { word: string; band: number; sentence: string }[], start: number, met: ReadonlySet<string> = new Set()) {
    this.items = gapItems(words).filter((it) => !met.has(it.word));
    this.top = Math.max(1, ...this.items.map((it) => it.level));
    this.start = Math.min(this.top, Math.max(1, start));
    this.load();
  }

  private get answers() {
    // the first half of the word and the sentence help: a learner who half knows the word gets it now and then
    return this.steps.map((s) => ({ level: s.level, right: s.correct, lucky: 0.08 }));
  }

  private load(): void {
    const used = new Set(this.steps.map((s) => s.word));
    const next = typedNext(this.answers, this.start, this.top, GAP_LEAST, GAP_MOST, 0.5);
    this.current = null;
    if (next.done) return;
    const levels = Array.from({ length: this.top }, (_, i) => i + 1).sort((a, b) => Math.abs(a - next.level) - Math.abs(b - next.level) || a - b);
    for (const level of levels) {
      this.current = this.items.find((it) => it.level === level && !used.has(it.word)) ?? null;
      if (this.current) break;
    }
  }

  get finished(): boolean {
    return !this.current;
  }

  /** `typed`: the missing letters, or the whole word. Nothing typed is "I don't know". */
  answer(typed: string): void {
    const it = this.current;
    if (!it) return;
    const t = typed.trim().toLowerCase().replace(/[^a-z]/g, "");
    const correct = t === it.word.slice(it.shown.length) || t === it.word;
    this.steps.push({ word: it.word, level: it.level, correct });
    this.load();
  }

  /** The overall level, 0 to 8 (0: below the first level). */
  result(): { level: number; check: number; steps: { word: string; level: number; correct: boolean }[] } {
    return { level: typedLevel(this.answers, this.top, 0), check: GAP_CHECK, steps: [...this.steps] };
  }

  snapshot(): GapView {
    const it = this.current;
    return it ? { phase: "ask", index: this.steps.length, total: GAP_MOST, item: { before: it.before, shown: it.shown, missing: it.missing, after: it.after } } : { phase: "done", index: this.steps.length, total: GAP_MOST, item: null };
  }
}

export interface GrammarPlacementView {
  phase: "ask" | "done";
  index: number;
  total: number;
  id: string | null;
  /** The sentence as words to tap: no answer key. */
  words: string[];
  /** What to tap: a word of a kind, or the one wrong word. */
  task: { kind: "spot"; ask: Ask } | { kind: "fix" } | null;
}

/**
 * The grammar part, by tapping only: first a noun and a verb to find (the basics, asked of everyone), then
 * GRAMMAR_LEAST to GRAMMAR_MOST sentences chosen by elimination, each either a kind of word to find or one wrong
 * word to tap. A blind tap is right about one time in the number of words, and the belief counts a right answer
 * for only what that leaves. The level is the highest one the answers make likely that also has two right answers
 * at that level or above (see typedBelief): one lucky tap is never a level.
 */
export class GrammarPlacement {
  private readonly items: GrammarItem[];
  private readonly top: number;
  private level: number;
  private current: GrammarItem | null = null;
  private basics: { id: string; correct: boolean }[] = [];
  private steps: { id: string; level: number; correct: boolean; lucky: number }[] = [];

  private readonly limits: Limits;
  private readonly need: number;

  /** `need`: right answers at a level or above for that level (three in the full check; two in the quick one, which asks fewer). */
  constructor(content: GrammarUse, start: number, limits: Limits = { least: GRAMMAR_LEAST, most: GRAMMAR_MOST }, need = GRAMMAR_NEED) {
    this.limits = limits;
    this.need = need;
    this.items = content.items.filter((it) => it.kind === "spot" || it.kind === "fix").map((it) => ({ it, k: hash(`level-check|${it.id}`) })).sort((a, b) => a.k - b.k || (a.it.id < b.it.id ? -1 : 1)).map((x) => x.it);
    this.top = Math.max(1, ...content.levels.map((l) => l.id));
    this.level = Math.min(this.top, Math.max(1, start));
    this.load();
  }

  private load(): void {
    const used = new Set([...this.basics, ...this.steps].map((s) => s.id));
    const ask = GRAMMAR_BASICS[this.basics.length];
    const lowest = (pool: GrammarItem[]) => pool.sort((a, b) => a.level - b.level)[0] ?? null;
    if (ask) return void (this.current = lowest(this.items.filter((it) => it.kind === "spot" && it.ask === ask && !used.has(it.id))));
    const next = typedNext(this.answers, this.level, this.top, this.limits.least, this.limits.most, this.limits.reach ?? 0.5, this.limits.near);
    this.current = null;
    if (next.done) return;
    const levels = Array.from({ length: this.top }, (_, i) => i + 1).sort((a, b) => Math.abs(a - next.level) - Math.abs(b - next.level) || a - b);
    for (const level of levels) {
      this.current = this.items.find((it) => it.level === level && !used.has(it.id)) ?? null;
      if (this.current) break;
    }
  }

  private get answers() {
    return this.steps.map((s) => ({ level: s.level, right: s.correct, lucky: s.lucky }));
  }

  get finished(): boolean {
    return !this.current;
  }

  answer(tapped: number): void {
    const it = this.current;
    if (this.finished || !it) return;
    const words = it.kind === "spot" ? spotWords(it) : fixParts(it).words;
    if (!Number.isInteger(tapped) || tapped < 0 || tapped >= words.length) return;
    const correct = it.kind === "spot" ? checkSpot(it, tapped) : tapped === fixParts(it).wrong;
    if (this.basics.length < GRAMMAR_BASICS.length) this.basics.push({ id: it.id, correct });
    else {
      this.steps.push({ id: it.id, level: it.level, correct, lucky: 1 / words.length });
    }
    this.load();
  }

  result(): { level: number; scale: number; check: number; basics: { right: number; asked: number }; steps: { id: string; level: number; correct: boolean }[] } {
    // A learner who cannot name a noun or a verb keeps the level found and is sent to naming words first (streams.ts).
    return { level: typedLevel(this.answers, this.top, 1, this.need), scale: SCALE, check: TYPED_CHECK, basics: { right: this.basics.filter((b) => b.correct).length, asked: this.basics.length }, steps: this.steps.map(({ id, level, correct }) => ({ id, level, correct })) };
  }

  snapshot(): GrammarPlacementView {
    const it = this.current;
    const index = this.basics.length + this.steps.length;
    if (this.finished || !it) return { phase: "done", index, total: GRAMMAR_BASICS.length + this.limits.most, id: null, words: [], task: null };
    return it.kind === "spot" ? { phase: "ask", index, total: GRAMMAR_BASICS.length + this.limits.most, id: it.id, words: spotWords(it), task: { kind: "spot", ask: it.ask! } } : { phase: "ask", index, total: GRAMMAR_BASICS.length + this.limits.most, id: it.id, words: fixParts(it).words, task: { kind: "fix" } };
  }
}
