/**
 * First words (content/english/first): for a learner who cannot yet read a sentence. Nothing has to be read.
 * A spoken guide says what to do, and the learner does it by tapping:
 *
 *   hear    hear a word, tap its picture (three pictures)
 *   build   see a picture, tap its letters in order to build the word
 *   count   hear "three apples", tap the group of three
 *   colour  hear "the red one", tap the red one
 *   place   hear "put the cat on the box", tap the place on, next to or under the box
 *   two     hear "tap the cat, then the apple", tap the two pictures in that order
 *
 * First sentences, the bridge to level 1: once a learner has found twenty words on the first tap, each sitting
 * also has sentences made of the words they know, always with a picture:
 *
 *   read      read a short sentence ("I see a cat and a dog.", "The ball is under the box."), tap its picture or
 *             where it is; after a wrong tap it is said aloud
 *   sentence  see a picture and hear its sentence, tap the words in order to build it
 *
 * It is practice, not a test: a wrong tap is switched off and the learner tries again; whether the first tap was
 * right is what is recorded. One engine runs every kind from the word list, so a new word needs only its entry.
 * Pictures are slots (an emoji for now) that artwork can replace. Practice-only: nothing here is evidence for the
 * engine.
 */
import wordsJson from "../../../../../content/english/first/words.json";

export interface FirstWord {
  id: string;
  word: string;
  /** The picture slot: an emoji now, artwork later. */
  picture: string;
  group: string;
}
export interface FirstContent {
  version: number;
  status: string;
  words: FirstWord[];
  colours: { id: string; picture: string }[];
  numbers: string[];
  count: string[];
  place: { movers: string[]; anchor: string; relations: { id: string; say: string }[] };
}
export type Kind = "hear" | "build" | "count" | "colour" | "place" | "two" | "read" | "sentence";
export type FirstRecord =
  /** One step finished: whether the first tap was right, and how many wrong taps came before the right one. */
  | { type: "step"; sitting: string; kind: Kind; key: string; correct: boolean; misses: number }
  | { type: "end"; sitting: string; asked: number; right: number };

export const NEW_WORDS = 4;
export const BUILDS = 3;
export const OPTIONS = 3;
export const EXTRA_LETTERS = 2;
/** Words found on the first tap before sentences join a sitting. */
export const SENTENCES_AFTER = 20;

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
const hashOrder = <T>(xs: readonly T[], key: (x: T) => string) => xs.map((x) => ({ x, k: hash(key(x)), s: key(x) })).sort((a, b) => a.k - b.k || (a.s < b.s ? -1 : 1)).map((e) => e.x);

export function firstProblems(c: FirstContent): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const pictures = new Set<string>();
  for (const w of c.words) {
    if (ids.has(w.id)) out.push(`${w.id}: listed twice`);
    ids.add(w.id);
    if (!/^[a-z]{2,6}$/.test(w.word)) out.push(`${w.id}: a first word is two to six small letters`);
    if (!w.picture) out.push(`${w.id}: no picture`);
    if (pictures.has(w.picture)) out.push(`${w.id}: its picture is used by another word`);
    pictures.add(w.picture);
    if (c.words.filter((x) => x.group === w.group).length < OPTIONS) out.push(`${w.id}: its group needs ${OPTIONS} words`);
  }
  for (const id of [...c.count, ...c.place.movers, c.place.anchor]) if (!ids.has(id)) out.push(`${id}: not in the word list`);
  if (c.colours.length < OPTIONS) out.push(`needs ${OPTIONS} colours`);
  if (c.place.relations.length !== 3) out.push("needs three places");
  if (c.numbers.length < OPTIONS) out.push(`needs ${OPTIONS} numbers`);
  return out;
}

export const FIRST: FirstContent = wordsJson as unknown as FirstContent;
{
  const problems = firstProblems(FIRST);
  if (problems.length) throw new Error(`first words: ${problems.slice(0, 5).join("; ")}`);
}

/** A step as the engine holds it: with its answer. Never sent to the screen. */
interface Step {
  kind: Kind;
  /** What the record is filed under: the word, or the sentence asked. */
  key: string;
  say: string;
  /** hear, count, colour, place: the choices, and which is right. */
  options: string[];
  answer: number;
  /** build: the word and its letter tiles. */
  word?: FirstWord;
  tiles?: string[];
  /** two: the second thing to tap, after `answer`. */
  then?: number;
  /** place: what is moved and the thing it is placed by. */
  mover?: string;
  anchor?: string;
  /** read, sentence: the sentence, and the picture that shows it. */
  text?: string;
  picture?: string;
  /** sentence: the words to tap in order (no full stop), and the word tiles. */
  words?: string[];
}

export interface FirstSummary {
  sittings: number;
  /** Words heard and found at least once, and those found on the first tap the last time. */
  met: number;
  sure: number;
  total: number;
  /** Whether sittings now include First sentences. */
  sentences: boolean;
}
export function firstSummary(c: FirstContent, records: readonly FirstRecord[]): FirstSummary {
  const last = new Map<string, boolean>();
  for (const r of records) if (r.type === "step" && r.kind === "hear") last.set(r.key, r.correct);
  const sure = [...last.values()].filter(Boolean).length;
  return { sittings: records.filter((r) => r.type === "end").length, met: last.size, sure, total: c.words.length, sentences: sure >= SENTENCES_AFTER };
}

/** The words for a sitting: ones never met first (in list order, easy groups first), then ones last missed, then the oldest. */
export function pick(c: FirstContent, records: readonly FirstRecord[]): FirstWord[] {
  const last = new Map<string, { correct: boolean; i: number }>();
  records.forEach((r, i) => r.type === "step" && r.kind === "hear" && last.set(r.key, { correct: r.correct, i }));
  const fresh = c.words.filter((w) => !last.has(w.id));
  const missed = c.words.filter((w) => last.get(w.id)?.correct === false).sort((a, b) => last.get(a.id)!.i - last.get(b.id)!.i);
  const rest = c.words.filter((w) => last.get(w.id)?.correct === true).sort((a, b) => last.get(a.id)!.i - last.get(b.id)!.i);
  return [...fresh, ...missed, ...rest].slice(0, NEW_WORDS);
}

export interface FirstView {
  phase: "ask" | "right" | "done";
  index: number;
  total: number;
  kind: Kind | null;
  key: string | null;
  /** hear, count, colour: the pictures to choose from; `off` once tapped wrongly. No answer key. */
  options: { picture: string; off: boolean; picked?: boolean }[];
  /** build: the picture, the letters placed so far and the tiles left. sentence: the same, with words for letters. */
  build: { picture: string; placed: string; tiles: { letter: string; used: boolean }[]; words?: boolean } | null;
  /** read: the sentence to read. */
  text?: string | null;
  /** place: the thing to move, the thing it goes by, and the three places. */
  place: { mover: string; anchor: string; zones: { id: string; off: boolean }[] } | null;
  /** After a right answer: the word or sentence, shown and said. */
  reveal: { text: string; picture: string } | null;
  done: { asked: number; right: number } | null;
}

/** One sitting of ten steps. Every step appends a record; the caller stores what `take()` returns. */
export class FirstSitting {
  private readonly content: FirstContent;
  private readonly sitting: string;
  private readonly steps: Step[];
  private index = 0;
  private misses = 0;
  private off = new Set<number>();
  private placed: number[] = [];
  private solved = false;
  private results: boolean[] = [];
  private log: FirstRecord[] = [];
  private ended = false;

  constructor(content: FirstContent, history: readonly FirstRecord[]) {
    this.content = content;
    const n = history.filter((r) => r.type === "end").length;
    this.sitting = `f${n + 1}`;
    const byId = new Map(content.words.map((w) => [w.id, w]));
    const words = pick(content, history);
    const salt = `${this.sitting}|`;
    // naming words take "the"; action and describing words are said bare
    const named = (w: FirstWord) => w.group !== "actions" && w.group !== "describing";
    const hear = (w: FirstWord): Step => {
      const others = hashOrder(content.words.filter((x) => x.group === w.group && x.id !== w.id), (x) => `${salt}${w.id}|${x.id}`).slice(0, OPTIONS - 1);
      const options = hashOrder([w, ...others], (x) => `${salt}o|${w.id}|${x.id}`);
      return { kind: "hear", key: w.id, say: named(w) ? `Tap the ${w.word}.` : `Tap ${w.word}.`, options: options.map((x) => x.picture), answer: options.indexOf(w), word: w };
    };
    const build = (w: FirstWord): Step => {
      const spare = hashOrder("abcdefghijklmnoprstuw".split("").filter((l) => !w.word.includes(l)), (l) => `${salt}x|${w.id}|${l}`).slice(0, EXTRA_LETTERS);
      let tiles = hashOrder([...w.word.split("").map((l, i) => ({ l, i })), ...spare.map((l, i) => ({ l, i: 100 + i }))], (t) => `${salt}t|${w.id}|${t.i}`).map((t) => t.l);
      if (tiles.slice(0, w.word.length).join("") === w.word) tiles = [...tiles].reverse();
      return { kind: "build", key: w.id, say: named(w) ? `This is ${/^[aeiou]/.test(w.word) ? "an" : "a"} ${w.word}. Build the word ${w.word}.` : `The word is ${w.word}. Build the word ${w.word}.`, options: [], answer: -1, word: w, tiles };
    };
    const k = hash(`${salt}extra`);
    const noun = byId.get(content.count[k % content.count.length])!;
    const amount = 1 + (k >>> 4) % content.numbers.length;
    const amounts = hashOrder([amount, ...[1, 2, 3, 4, 5].filter((x) => x !== amount && x <= content.numbers.length)].slice(0, OPTIONS), (x) => `${salt}c|${x}`);
    const plural = (w: FirstWord, many: boolean) => (!many ? w.word : w.word === "fish" ? "fish" : /(s|x|ch|sh)$/.test(w.word) ? `${w.word}es` : `${w.word}s`);
    const count: Step = { kind: "count", key: `${content.numbers[amount - 1]} ${plural(noun, amount > 1)}`, say: `Tap ${content.numbers[amount - 1]} ${plural(noun, amount > 1)}.`, options: amounts.map((x) => noun.picture.repeat(x)), answer: amounts.indexOf(amount) };
    const colours = hashOrder(content.colours, (c) => `${salt}col|${c.id}`).slice(0, OPTIONS);
    const colourAt = (k >>> 8) % colours.length;
    const colour: Step = { kind: "colour", key: `the ${colours[colourAt].id} one`, say: `Tap the ${colours[colourAt].id} one.`, options: colours.map((c) => c.picture), answer: colourAt };
    const mover = byId.get(content.place.movers[(k >>> 12) % content.place.movers.length])!;
    const anchor = byId.get(content.place.anchor)!;
    const rel = (k >>> 16) % content.place.relations.length;
    const place: Step = { kind: "place", key: `${mover.word} ${content.place.relations[rel].say} the ${anchor.word}`, say: `Put the ${mover.word} ${content.place.relations[rel].say} the ${anchor.word}.`, options: content.place.relations.map((r) => r.id), answer: rel, mover: mover.picture, anchor: anchor.picture };
    // hear each new word, then build some of them, with the three "do what you hear" steps spread between
    // two things to tap in the order said: both are naming words already in the list
    const things = hashOrder(content.words.filter((w) => w.group === "animals" || w.group === "food"), (w) => `${salt}two|${w.id}`).slice(0, OPTIONS);
    const two: Step = { kind: "two", key: `${things[1].word} then ${things[2].word}`, say: `Tap the ${things[1].word}, then the ${things[2].word}.`, options: things.map((w) => w.picture), answer: 1, then: 2 };
    const basic = [...words.map(hear), count, ...words.slice(0, BUILDS).map(build).slice(0, 2), colour, ...words.slice(0, BUILDS).map(build).slice(2), place, two];
    if (!firstSummary(content, history).sentences) {
      this.steps = basic;
      return;
    }
    // First sentences: made only of words this learner has already found, each with its picture
    const known = new Set<string>();
    for (const r of history) if (r.type === "step" && r.kind === "hear" && r.correct) known.add(r.key);
    const knownIn = (group: string) => content.words.filter((w) => w.group === group && known.has(w.id));
    const article = (w: FirstWord) => (/^[aeiou]/.test(w.word) ? "an" : "a");
    type Made = { text: string; picture: string; options: string[]; answer: number; tag: string; mover?: string; anchor?: string };
    const made: Made[] = [];
    const choose = <T,>(xs: T[], tag: string) => hashOrder(xs, (x) => `${salt}${tag}|${JSON.stringify(x)}`);
    // "This is a cat." among two others of its group (two per group, so there are enough different sentences)
    for (const g of ["animals", "food", "things", "world"]) {
      const ws = choose(knownIn(g), `this|${g}`);
      if (ws.length < OPTIONS) continue;
      for (const w of ws.slice(0, 2)) {
        const options = choose([w, ...ws.filter((x) => x !== w).slice(0, OPTIONS - 1)], `this-o|${w.id}`);
        made.push({ text: `This is ${article(w)} ${w.word}.`, picture: w.picture, options: options.map((x) => x.picture), answer: options.indexOf(w), tag: "this" });
      }
    }
    // "I see three apples." among groups of other sizes
    for (const w of choose(content.count.map((id) => byId.get(id)!).filter((w) => known.has(w.id)), "see").slice(0, 2)) {
      const n = 2 + (hash(`${salt}see-n|${w.id}`) % 3);
      const sizes = choose([n, ...[1, 2, 3, 4, 5].filter((x) => x !== n)].slice(0, OPTIONS), `see-o|${w.id}|${n}`);
      made.push({ text: `I see ${content.numbers[n - 1]} ${plural(w, true)}.`, picture: w.picture.repeat(n), options: sizes.map((x) => w.picture.repeat(x)), answer: sizes.indexOf(n), tag: "see" });
    }
    // "I see a cat and a dog." among pairs where one of the two is different
    const naming = choose(content.words.filter((w) => ["animals", "food", "things"].includes(w.group) && known.has(w.id)), "pair");
    for (let k = 0; k + 3 < naming.length && k < 6; k += 3) {
      const [x, y, z] = naming.slice(k, k + 3);
      const right = `${x.picture} ${y.picture}`;
      const options = choose([right, `${x.picture} ${z.picture}`, `${z.picture} ${y.picture}`], `pair-o|${x.id}|${y.id}`);
      made.push({ text: `I see ${article(x)} ${x.word} and ${article(y)} ${y.word}.`, picture: right, options, answer: options.indexOf(right), tag: "pair" });
    }
    // "The cat is under the box." read, then tap where the cat is
    const box = byId.get(content.place.anchor)!;
    for (const w of choose(content.place.movers.map((id) => byId.get(id)!).filter((w) => known.has(w.id) && known.has(box.id)), "where").slice(0, 2)) {
      const rel = hash(`${salt}where-r|${w.id}`) % content.place.relations.length;
      made.push({ text: `The ${w.word} is ${content.place.relations[rel].say} the ${box.word}.`, picture: w.picture, options: content.place.relations.map((r) => r.id), answer: rel, tag: "where", mover: w.picture, anchor: box.picture });
    }
    // "I can swim." and "I am happy." among other actions and feelings
    for (const [g, lead, tag] of [["actions", "I can", "can"], ["describing", "I am", "am"]] as const) {
      const ws = choose(knownIn(g).filter((w) => g !== "describing" || ["happy", "sad", "hot", "cold"].includes(w.word)), tag);
      if (ws.length < OPTIONS) continue;
      for (const w of ws.slice(0, 2)) {
        const options = choose([w, ...ws.filter((x) => x !== w).slice(0, OPTIONS - 1)], `${tag}-o|${w.id}`);
        made.push({ text: `${lead} ${w.word}.`, picture: w.picture, options: options.map((x) => x.picture), answer: options.indexOf(w), tag });
      }
    }
    // three to read, each of a different kind, the longer ones first; two different ones to build, never one just read
    const longFirst = ["where", "pair", "see", "this", "can", "am"];
    const pool = choose(made, "pool").sort((x, y) => longFirst.indexOf(x.tag) - longFirst.indexOf(y.tag));
    const readMade: Made[] = [];
    for (const m of pool) if (readMade.length < 3 && !readMade.some((r) => r.tag === m.tag)) readMade.push(m);
    const reads: Step[] = readMade.map((m) => ({ kind: "read", key: m.text, say: m.mover ? "Read the sentence, then tap where it is." : "Read the sentence, then tap its picture.", options: m.options, answer: m.answer, text: m.text, picture: m.picture, ...(m.mover ? { mover: m.mover, anchor: m.anchor } : {}) }));
    const buildMade = choose(pool.filter((m) => !m.mover && !readMade.includes(m)), "build-pick").sort((x, y) => Number(y.tag === "pair") - Number(x.tag === "pair"));
    const twoBuilds = buildMade.filter((m, i) => buildMade.findIndex((x) => x.tag === m.tag) === i).slice(0, 2);
    const spare = ["the", "is", "a", "can", "see", "am", "and"];
    const sentences: Step[] = twoBuilds.map((m) => {
      const words = m.text.replace(/[.]$/, "").split(" ");
      const extra = choose(spare.filter((x) => !words.map((y) => y.toLowerCase()).includes(x)), `sx|${m.text}`)[0];
      let tiles = choose([...words.map((w, i) => ({ w, i })), { w: extra, i: 99 }], `st|${m.text}`).map((t) => t.w);
      if (tiles.slice(0, words.length).join(" ") === words.join(" ")) tiles = [...tiles].reverse();
      return { kind: "sentence", key: m.text, say: `${m.text} Build the sentence.`, options: [], answer: -1, text: m.text, picture: m.picture, words, tiles };
    });
    if (reads.length < 2 || sentences.length < 2) {
      this.steps = basic;
      return;
    }
    const hears = words.map(hear);
    const builds = words.slice(0, BUILDS).map(build);
    this.steps = [...hears.slice(0, 2), reads[0], builds[0], ...hears.slice(2), sentences[0], reads[1], builds[1], sentences[1], ...(reads[2] ? [reads[2]] : [])];
  }

  private get step(): Step | undefined {
    return this.steps[this.index];
  }

  /** What the guide says now: the task, or after a right answer the word once more. For the speaker only. */
  spoken(): string | null {
    const s = this.step;
    if (!s) return null;
    // a sentence to read is said aloud only after a wrong tap, as help
    if (!this.solved) return s.kind === "read" && this.misses > 0 ? `${s.text} ${s.mover ? "Tap where it is." : "Tap its picture."}` : s.say;
    if (s.kind === "read" || s.kind === "sentence") return `${s.text} Well done.`;
    return s.kind === "build" ? `${s.word!.word.split("").join(", ")}. ${s.word!.word}. Well done.` : s.kind === "hear" ? `${s.word!.word}. Well done.` : "Well done.";
  }

  private finish(): void {
    const s = this.step!;
    this.solved = true;
    this.results.push(this.misses === 0);
    this.log.push({ type: "step", sitting: this.sitting, kind: s.kind, key: s.key, correct: this.misses === 0, misses: this.misses });
  }

  /** Tap a choice (hear, count, colour) or a place. A wrong one is switched off; the right one finishes the step. */
  tap(i: number): boolean {
    const s = this.step;
    if (!s || this.solved || s.kind === "build" || s.kind === "sentence" || !Number.isInteger(i) || i < 0 || i >= s.options.length || this.off.has(i)) return false;
    if (s.kind === "two") {
      // two taps in the order said; a tap out of order is a miss, and nothing is switched off
      const want = this.placed.length === 0 ? s.answer : s.then!;
      if (i !== want) {
        this.misses++;
        return false;
      }
      this.placed.push(i);
      if (this.placed.length === 2) this.finish();
      return true;
    }
    if (i !== s.answer) {
      this.off.add(i);
      this.misses++;
      return false;
    }
    this.finish();
    return true;
  }

  /** Tap a letter tile. The next letter of the word is placed; any other letter counts as a miss and stays. */
  letter(i: number): boolean {
    const s = this.step;
    if (!s || this.solved || (s.kind !== "build" && s.kind !== "sentence") || !Number.isInteger(i) || i < 0 || i >= s.tiles!.length || this.placed.includes(i)) return false;
    if (s.kind === "sentence") {
      if (s.tiles![i] !== s.words![this.placed.length]) {
        this.misses++;
        return false;
      }
      this.placed.push(i);
      if (this.placed.length === s.words!.length) this.finish();
      return true;
    }
    if (s.tiles![i] !== s.word!.word[this.placed.length]) {
      this.misses++;
      return false;
    }
    this.placed.push(i);
    if (this.placed.length === s.word!.word.length) this.finish();
    return true;
  }

  next(): void {
    if (!this.solved) return;
    this.solved = false;
    this.misses = 0;
    this.off = new Set();
    this.placed = [];
    if (++this.index >= this.steps.length && !this.ended) {
      this.ended = true;
      this.log.push({ type: "end", sitting: this.sitting, asked: this.results.length, right: this.results.filter(Boolean).length });
    }
  }

  take(): FirstRecord[] {
    const out = this.log;
    this.log = [];
    return out;
  }

  snapshot(): FirstView {
    const s = this.step;
    const base = { index: Math.min(this.index, this.steps.length - 1), total: this.steps.length, kind: s?.kind ?? null, key: s?.key ?? null, options: [], build: null, place: null, reveal: null, done: null };
    if (!s) return { ...base, phase: "done", done: { asked: this.results.length, right: this.results.filter(Boolean).length } };
    const view: FirstView = { ...base, phase: this.solved ? "right" : "ask" };
    if (s.kind === "build") view.build = { picture: s.word!.picture, placed: this.placed.map((i) => s.tiles![i]).join(""), tiles: s.tiles!.map((letter, i) => ({ letter, used: this.placed.includes(i) })) };
    else if (s.kind === "sentence") view.build = { picture: s.picture!, placed: this.placed.map((i) => s.tiles![i]).join(" "), tiles: s.tiles!.map((letter, i) => ({ letter, used: this.placed.includes(i) })), words: true };
    else if (s.kind === "place" || (s.kind === "read" && s.mover)) view.place = { mover: s.mover!, anchor: s.anchor!, zones: s.options.map((id, i) => ({ id, off: this.off.has(i) })) };
    else view.options = s.options.map((picture, i) => ({ picture, off: this.off.has(i), ...(s.kind === "two" && this.placed.includes(i) ? { picked: true } : {}) }));
    if (s.kind === "read") view.text = s.text!;
    if (this.solved && (s.kind === "read" || s.kind === "sentence")) view.reveal = { text: s.text!, picture: s.picture! };
    else if (this.solved) view.reveal = { text: s.kind === "hear" || s.kind === "build" ? s.word!.word : s.key, picture: s.kind === "two" ? `${s.options[s.answer]} ${s.options[s.then!]}` : s.kind === "place" ? `${s.mover}` : s.kind === "build" || s.kind === "hear" ? s.word!.picture : s.options[s.answer] };
    return view;
  }

  /** For tests and the place screen after a right answer: where the mover went. */
  solvedPlace(): string | null {
    const s = this.step;
    return s && this.solved && (s.kind === "place" || (s.kind === "read" && !!s.mover)) ? s.options[s.answer] : null;
  }
}

/**
 * A learner who stands on the first listening level, and either passed no reading text or knew no band of the word
 * check, is sent to First words. The word check counts too because a reading text has three choices a question: a
 * learner with no English passes one by luck about one time in seven (sim-english@1), while the word check offers
 * "I don't know" and marks guessing down.
 */
export const isBeginner = (levels: { reading: { passed: number } | null; listening: { level: number } | null; words?: { band: number } | null }): boolean =>
  !!levels.listening && levels.listening.level <= 1 && ((!!levels.reading && levels.reading.passed === 0) || (!!levels.words && levels.words.band === 0));
