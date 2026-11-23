/**
 * The word check: where a learner's words reach on the eight word levels. Practice-only, never engine evidence.
 *
 * How it measures (check version 6):
 *   - A word's level is measured from how rare the word is (content/english/vocabulary/size-check.json, built by
 *     tools/english/vocabulary/build_word_check.py), never chosen by hand.
 *   - It works by elimination. It holds a belief about where the learner's words reach, asks the word that splits
 *     that belief most evenly, and moves on the answer: a miss in the middle sends it far down, a hit far up. It
 *     keeps going until it has found words the learner does not know.
 *   - First part, "Do you know this word?": quick yes or no. Some words are invented. Saying yes to invented words
 *     shows how far a "yes" can be trusted, and every "yes" then counts for that much less.
 *   - Second part, "Which word is closest?": four single words to choose from, all of the same kind and close in
 *     meaning or look, each a commoner word than the one tested. It asks at the edge of what the learner claimed.
 *   - The level reported is the highest one the answers make likely (LEVEL_SURE), not the best guess: the check
 *     may place a learner low, never high. size-check.test.ts holds it to that with simulated learners.
 */
import checkJson from "../../../../../content/english/vocabulary/size-check.json";

/** The version of the check whose levels are in use; results on other versions are not used. */
export const CHECK_VERSION: number = (checkJson as { version: number }).version;

export const OPTIONS = 4;
/** First part: real words asked at most, at least before it may stop early, and an invented word after every FAKE_EVERY real ones. */
export const KNOW_MAX = 12;
export const KNOW_MIN = 6;
export const FAKE_EVERY = 3;
/** Second part: closest-word questions at least, at most, and at most when the learner's "yes" could not be trusted. */
export const PICK_MIN = 6;
export const PICK_MAX = 9;
export const PICK_MAX_UNTRUSTED = 12;
/** The check says about how many questions there are; this is the usual length. */
export const ABOUT = 22;
/**
 * A level is reported only when the answers make it this likely that the learner's words reach it; likelier still
 * (up to LEVEL_SURE_MOST) the more often the learner says "yes" to words they do not know.
 */
export const LEVEL_SURE = 0.7;
export const LEVEL_SURE_MOST = 0.93;

export interface Band {
  id: number;
  label: string;
}
export interface Word {
  word: string;
  band: number;
  /** Choices in display order (a fixed shuffle per word); `answer` is the closest word. */
  options: string[];
  answer: number;
}
export interface FakeWord {
  word: string;
  look: "plain" | "long";
}
export interface SizeCheck {
  version: number;
  status: string;
  bands: Band[];
  words: Word[];
  fake: FakeWord[];
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

export function buildCheck(raw: unknown): SizeCheck {
  const r = raw as { version: number; status: string; bands: Band[]; words: [number, number, string, string, string, string, string, string][]; fake: [string, "plain" | "long"][] };
  const words = r.words.map(([band, , , word, right, ...wrong]) => {
    const options = [right, ...wrong].map((o) => ({ o, k: hash(`${word}|${o}`) })).sort((a, b) => a.k - b.k || (a.o < b.o ? -1 : 1)).map((x) => x.o);
    return { word, band, options, answer: options.indexOf(right) };
  });
  return { version: r.version, status: r.status, bands: r.bands.map((b) => ({ id: b.id, label: b.label })), words, fake: r.fake.map(([word, look]) => ({ word, look })) };
}

export function checkProblems(c: SizeCheck): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of c.words) {
    if (seen.has(w.word)) out.push(`${w.word}: listed twice`);
    seen.add(w.word);
    if (!c.bands.some((b) => b.id === w.band)) out.push(`${w.word}: unknown band`);
    if (w.options.length !== OPTIONS || new Set(w.options).size !== OPTIONS) out.push(`${w.word}: needs ${OPTIONS} different choices`);
    if (w.options.some((o) => !/^[a-z]+$/.test(o))) out.push(`${w.word}: every choice is one plain word`);
    if (w.options.some((o) => o.startsWith(w.word.slice(0, 5)) || w.word.startsWith(o))) out.push(`${w.word}: a choice gives the word away`);
  }
  for (const f of c.fake) {
    if (seen.has(f.word)) out.push(`${f.word}: an invented word is also a real one`);
    seen.add(f.word);
  }
  for (const b of c.bands) if (c.words.filter((w) => w.band === b.id).length < 10) out.push(`band ${b.id}: needs at least 10 words`);
  for (const look of ["plain", "long"] as const) if (c.fake.filter((f) => f.look === look).length < 8) out.push(`invented words (${look}): needs at least 8`);
  return out;
}

export const CHECK: SizeCheck = buildCheck(checkJson);
{
  const problems = checkProblems(CHECK);
  if (problems.length) throw new Error(`vocabulary check: ${problems.slice(0, 5).join("; ")}`);
}

/** "yes"/"no": the first part ("Do you know this word?"). "right"/"wrong"/"unknown": a closest-word question. */
export type Outcome = "right" | "wrong" | "unknown" | "yes" | "no";
export type VocabRecord =
  | { type: "start"; check: string; band: number }
  /** Written when the word is answered. `band` 0 is an invented word. `kind` is absent on records of older checks. */
  | { type: "answer"; check: string; word: string; band: number; outcome: Outcome; kind?: "know" | "pick" }
  | { type: "result"; check: string; band: number; answered: number; correct?: number; estimate?: number; low?: number; high?: number };

/** One answer as the measurement sees it. */
export interface Evidence {
  kind: "know" | "pick";
  /** 0 for an invented word. */
  band: number;
  outcome: Outcome;
  /** A closest-word question on a word the learner had said they knew. */
  claimed?: boolean;
}

export interface Result {
  /** The highest level the answers make likely; 0 means below the first level or not enough evidence. */
  band: number;
  /** The best single estimate of where the learner's words reach (0 to 8, in halves). Not shown as a level. */
  estimate: number;
  answered: number;
  /** Closest-word questions asked, and how many were right. */
  picks: number;
  correct: number;
  /** Invented words shown, and how many the learner said they knew. */
  fakes: number;
  fakeYes: number;
}

// ---------------------------------------------------------------------------------------------- the measurement

/** Where a learner's words may reach: 0 to 9 in halves (9: knows the rarest words here with room to spare). */
const GRID = Array.from({ length: 19 }, (_, i) => i / 2);
/** How likely a learner whose words reach `a` is to know a word of level `band`. */
const knows = (band: number, a: number) => 1 / (1 + Math.exp(-(2 * (a - band) + 1.5)));
/** A learner who knows a word still slips now and then, and says "no" to a word they half know more often than that. */
const SLIP = 0.05;
const MODEST = 0.15;
/** The chance of the right choice among four without knowing the word. */
const GUESS = 1 / OPTIONS;

/** How often this learner says "yes" to a word they do not know: from invented words, and from claimed words then missed. */
export function falseYes(evidence: readonly Evidence[]): number {
  let said = 1;
  let chances = 3;
  for (const e of evidence) {
    if (e.kind === "know" && e.band === 0) {
      chances++;
      if (e.outcome === "yes") said++;
    } else if (e.kind === "pick" && e.claimed && e.outcome !== "right") {
      chances++;
      said++;
    }
  }
  return said / chances;
}

/** The belief about where the learner's words reach, after the answers so far. Sums to 1 over GRID. */
export function belief(evidence: readonly Evidence[]): number[] {
  const f = falseYes(evidence);
  const p = GRID.map(() => 1);
  for (const e of evidence) {
    if (e.band === 0) continue;
    GRID.forEach((a, i) => {
      const k = knows(e.band, a);
      const hit = e.kind === "know" ? k * (1 - MODEST) + (1 - k) * f : k * (1 - SLIP) + (1 - k) * GUESS;
      p[i] *= e.outcome === "yes" || e.outcome === "right" ? hit : 1 - hit;
    });
  }
  const total = p.reduce((s, x) => s + x, 0);
  return p.map((x) => x / total);
}

const median = (p: readonly number[]) => {
  let s = 0;
  for (let i = 0; i < p.length; i++) if ((s += p[i]) >= 0.5) return GRID[i];
  return GRID[GRID.length - 1];
};
const spread = (p: readonly number[]) => {
  const m = p.reduce((s, x, i) => s + x * GRID[i], 0);
  return Math.sqrt(p.reduce((s, x, i) => s + x * (GRID[i] - m) ** 2, 0));
};

/** The level to report: the highest one the belief makes LEVEL_SURE likely, and never above a level shown by a right closest-word answer. */
export function measure(evidence: readonly Evidence[]): Result {
  const p = belief(evidence);
  const sure = Math.min(LEVEL_SURE_MOST, LEVEL_SURE + 0.6 * Math.max(0, falseYes(evidence) - 0.15));
  let band = 0;
  for (let level = 1; level <= 8; level++) {
    const reach = p.reduce((s, x, i) => s + (GRID[i] >= level ? x : 0), 0);
    if (reach >= sure) band = level;
  }
  const picks = evidence.filter((e) => e.kind === "pick");
  // A "yes" alone never places anyone. A level needs right closest-word answers at that level or above (two; three
  // when the learner said yes to invented words), and most closest-word answers up to that level must be right.
  const trusted = falseYes(evidence) <= 0.4;
  const need = trusted ? 2 : 3;
  const rightAt = (level: number) => picks.filter((e) => e.outcome === "right" && e.band >= level).length;
  const sound = (level: number) => {
    const upTo = picks.filter((e) => e.band <= level);
    return upTo.length === 0 || upTo.filter((e) => e.outcome === "right").length / upTo.length >= (trusted ? 0.6 : 0.75);
  };
  while (band > 0 && (rightAt(band) < need || !sound(band))) band--;
  const fakes = evidence.filter((e) => e.kind === "know" && e.band === 0);
  return {
    band, estimate: Math.min(8, median(p)), answered: evidence.length, picks: picks.length, correct: picks.filter((e) => e.outcome === "right").length,
    fakes: fakes.length, fakeYes: fakes.filter((e) => e.outcome === "yes").length,
  };
}

// ---------------------------------------------------------------------------------------------- one sitting

export type CheckItem = { kind: "know"; word: string } | { kind: "pick"; word: string; options: string[] };
export interface CheckView {
  phase: "asking" | "done";
  /** Questions answered so far, and about how many there are in all. */
  asked: number;
  about: number;
  /** The question on screen: no answer key. */
  item: CheckItem | null;
  result: Result | null;
}

/** The level of the first word: the middle for an adult, lower for a child. After that the answers decide. */
export const startBand = (age: "early" | "school" | "older" | null | undefined) => (age === "early" ? 2 : age === "school" ? 3 : 4);
export const seenWords = (records: readonly VocabRecord[]) => new Set(records.flatMap((r) => (r.type === "answer" ? [r.word] : [])));
/** The latest result on today's check. A result on an older version of the check used other levels and is not used. */
export const latestResult = (records: readonly VocabRecord[]) => [...records].reverse().find((r): r is Extract<VocabRecord, { type: "result" }> => r.type === "result" && r.check === `${CHECK_VERSION}`) ?? null;

/** The level New words starts from: the latest result of today's check, else `fallback`. */
export function wordPracticeBand(records: readonly VocabRecord[], fallback?: number): number | undefined {
  const last = latestResult(records);
  return last ? last.band : fallback;
}

/** How a word level is said on screen: what the words are, then the level as a place on the scale, never as marks. */
export const levelLine = (band: number, check: SizeCheck = CHECK) => (band > 0 ? `${check.bands[band - 1].label} (word level ${band} on a scale of 1 to ${check.bands.length})` : "below everyday words for now");

/** One sitting of the check. Every answer appends a record; the caller stores what `take()` returns. */
export class SizeCheckSession {
  private readonly check: SizeCheck;
  private readonly previous: Set<string>;
  /** Words shown in the first part, words the learner said they knew there, and words asked as a closest-word question. */
  private readonly shown = new Set<string>();
  private readonly claimed = new Set<string>();
  private readonly picked = new Set<string>();
  private readonly start: number;
  private log: VocabRecord[] = [];
  private taken = 0;
  private evidence: Evidence[] = [];
  private current: { item: CheckItem; band: number; answer: number } | null = null;
  private result: Result | null = null;

  constructor(check: SizeCheck, start: number, history: readonly VocabRecord[] = []) {
    this.check = check;
    this.previous = seenWords(history);
    this.start = Math.min(check.bands.length, Math.max(1, start));
    this.log.push({ type: "start", check: `${check.version}`, band: this.start });
    this.next();
  }

  take(): VocabRecord[] {
    const out = this.log.slice(this.taken);
    this.taken = this.log.length;
    return out;
  }

  private count(kind: "know" | "pick", fake = false) {
    return this.evidence.filter((e) => e.kind === kind && (e.band === 0) === fake).length;
  }

  /** The level whose words split the belief most evenly: a little above its middle. */
  private target(): number {
    if (!this.evidence.some((e) => e.band > 0)) return this.start;
    return Math.min(this.check.bands.length, Math.max(1, Math.round(median(belief(this.evidence)) + 0.75)));
  }

  /**
   * A word of the level that can still be asked, else of the nearest level that has one: words not seen in earlier
   * sittings first. The first part never shows a word twice. A closest-word question takes a word the learner said
   * they knew where there is one, else a word not shown yet; never a word they said they did not know.
   */
  private word(band: number, part: "know" | "pick"): Word | null {
    const free = (w: Word) => (part === "know" ? !this.shown.has(w.word) : !this.picked.has(w.word) && (this.claimed.has(w.word) || !this.shown.has(w.word)));
    const levels = this.check.bands.map((b) => b.id).sort((a, b) => Math.abs(a - band) - Math.abs(b - band) || a - b);
    for (const level of levels) {
      const pool = this.check.words.filter((w) => w.band === level && free(w));
      const order = (w: Word) => (part === "pick" && this.claimed.has(w.word) ? 0 : 2) + (this.previous.has(w.word) ? 1 : 0);
      const best = pool.sort((a, b) => order(a) - order(b))[0];
      if (best) return best;
    }
    return null;
  }

  private next() {
    const p = belief(this.evidence);
    const real = this.count("know");
    const fakes = this.count("know", true);
    const picks = this.count("pick");
    const firstPartOver = picks > 0 || real >= KNOW_MAX || (real >= KNOW_MIN && spread(p) <= 0.6);
    if (!firstPartOver) {
      // an invented word after every FAKE_EVERY real ones: plain-looking at the lower levels, learned-looking higher up
      if (real > 0 && real % FAKE_EVERY === 0 && fakes < real / FAKE_EVERY) {
        const look = this.target() <= 3 ? "plain" : "long";
        const pool = this.check.fake.filter((f) => !this.shown.has(f.word));
        const f = pool.find((x) => x.look === look && !this.previous.has(x.word)) ?? pool.find((x) => x.look === look) ?? pool[0];
        if (f) return void (this.current = { item: { kind: "know", word: f.word }, band: 0, answer: -1 });
      }
      const w = this.word(this.target(), "know");
      if (w) return void (this.current = { item: { kind: "know", word: w.word }, band: w.band, answer: w.answer });
    }
    const most = falseYes(this.evidence) > 0.4 ? PICK_MAX_UNTRUSTED : PICK_MAX;
    if (picks < most && !(picks >= PICK_MIN && spread(p) <= 0.45)) {
      // the closest-word question checks a word the learner said they knew, where there is one at the level wanted
      const w = this.word(this.target(), "pick");
      if (w) return void (this.current = { item: { kind: "pick", word: w.word, options: [...w.options] }, band: w.band, answer: w.answer });
    }
    this.current = null;
    this.result = measure(this.evidence);
    this.log.push({ type: "result", check: `${this.check.version}`, band: this.result.band, answered: this.result.answered, correct: this.result.correct, estimate: this.result.estimate });
  }

  snapshot(): CheckView {
    const asked = this.evidence.length;
    return {
      phase: this.result ? "done" : "asking", asked, about: Math.max(ABOUT, asked + 1),
      item: this.current ? structuredClone(this.current.item) : null,
      result: this.result ? { ...this.result } : null,
    };
  }

  /** First part: true for "I know it", false for "I don't". Closest-word question: the index of a choice, or null for "I don't know". */
  answer(choice: boolean | number | null): void {
    const c = this.current;
    if (this.result || !c) return;
    const { item } = c;
    let outcome: Outcome;
    if (item.kind === "know") {
      if (typeof choice !== "boolean") return;
      outcome = choice ? "yes" : "no";
      this.shown.add(item.word);
      if (choice && c.band > 0) this.claimed.add(item.word);
    } else {
      if (choice !== null && (typeof choice !== "number" || !Number.isInteger(choice) || choice < 0 || choice >= item.options.length)) return;
      outcome = choice === null ? "unknown" : choice === c.answer ? "right" : "wrong";
      this.picked.add(item.word);
    }
    this.evidence.push({ kind: item.kind, band: c.band, outcome, ...(item.kind === "pick" && this.claimed.has(item.word) ? { claimed: true } : {}) });
    this.log.push({ type: "answer", check: `${this.check.version}`, word: item.word, band: c.band, outcome, kind: item.kind });
    this.next();
  }
}
