/**
 * Vocabulary size check (content/english/vocabulary/size-check.json): a short adaptive check that estimates how
 * many English word families a learner knows. Words come from eight frequency bands; the check asks three words
 * from a band, moves up when at least two are known and down otherwise, and stops after eight rounds or as soon
 * as the learner has settled between two neighbouring bands. No word is asked twice in a sitting.
 *
 * "I don't know" is always offered and counts as not known, so a learner never needs to guess. A wrong choice
 * counts against the band (formula scoring), so guessing does not raise the estimate on average.
 *
 * The bands are OpenPath's estimates of word frequency, not measurements, so the number is a rough first estimate
 * and is worded that way. Practice-only: nothing here is evidence for the engine.
 */
import checkJson from "../../../../../content/english/vocabulary/size-check.json";

export const ROUND_SIZE = 3;
export const ROUNDS = 8;
export const OPTIONS = 3;

export interface Band {
  id: number;
  families: number;
  label: string;
}
export interface Word {
  word: string;
  band: number;
  /** Meanings in display order (a fixed shuffle per word); `answer` is the right one. */
  options: string[];
  answer: number;
}
export interface SizeCheck {
  version: number;
  status: string;
  bands: Band[];
  words: Word[];
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

export function buildCheck(raw: unknown): SizeCheck {
  const r = raw as { version: number; status: string; bands: Band[]; words: [number, string, string, string, string][] };
  const words = r.words.map(([band, word, right, ...wrong]) => {
    const options = [right, ...wrong].map((o) => ({ o, k: hash(`${word}|${o}`) })).sort((a, b) => a.k - b.k || (a.o < b.o ? -1 : 1)).map((x) => x.o);
    return { word, band, options, answer: options.indexOf(right) };
  });
  return { version: r.version, status: r.status, bands: r.bands, words };
}

export function checkProblems(c: SizeCheck): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of c.words) {
    if (seen.has(w.word)) out.push(`${w.word}: listed twice`);
    seen.add(w.word);
    if (!c.bands.some((b) => b.id === w.band)) out.push(`${w.word}: unknown band`);
    if (w.options.length !== OPTIONS || new Set(w.options).size !== OPTIONS) out.push(`${w.word}: needs ${OPTIONS} different meanings`);
    if (w.options.some((o) => new RegExp(`\\b${w.word}`, "i").test(o))) out.push(`${w.word}: a meaning uses the word itself`);
  }
  for (const b of c.bands) if (c.words.filter((w) => w.band === b.id).length < ROUND_SIZE * 3) out.push(`band ${b.id}: needs at least ${ROUND_SIZE * 3} words`);
  return out;
}

export const CHECK: SizeCheck = buildCheck(checkJson);
{
  const problems = checkProblems(CHECK);
  if (problems.length) throw new Error(`vocabulary check: ${problems.slice(0, 5).join("; ")}`);
}

export type Outcome = "right" | "wrong" | "unknown";
export type VocabRecord =
  | { type: "start"; check: string; band: number }
  /** Written when the word is answered; a shown word is used up for later checks. */
  | { type: "answer"; check: string; word: string; band: number; outcome: Outcome }
  | { type: "result"; check: string; estimate: number; low: number; high: number; band: number; answered: number };

export interface Result {
  /** Word families, rounded to the nearest 500. */
  estimate: number;
  low: number;
  high: number;
  /** The highest band where at least two of three words were known (0 if none). */
  band: number;
  answered: number;
  perBand: { band: number; asked: number; known: number }[];
}

/** Share of a band taken as known: right answers less a penalty for wrong choices (formula scoring), never below 0. */
export const knownShare = (right: number, wrong: number, asked: number) => (asked ? Math.max(0, (right - wrong / (OPTIONS - 1)) / asked) : 0);

/**
 * The estimate from the answers. A tested band counts by its known share. A band below every tested band is
 * taken as known (the check only moves up past a band that was passed, or starts above it by choice); a band
 * above every tested band counts as unknown.
 */
export function estimate(check: SizeCheck, answers: { band: number; outcome: Outcome }[]): Result {
  const tally = new Map<number, { right: number; wrong: number; asked: number }>();
  for (const a of answers) {
    const t = tally.get(a.band) ?? { right: 0, wrong: 0, asked: 0 };
    t.asked++;
    if (a.outcome === "right") t.right++;
    if (a.outcome === "wrong") t.wrong++;
    tally.set(a.band, t);
  }
  const tested = [...tally.keys()];
  const lowest = tested.length ? Math.min(...tested) : 1;
  let mid = 0;
  let spread = 0;
  let top = 0;
  for (const b of check.bands) {
    const t = tally.get(b.id);
    if (!t) {
      if (b.id < lowest && tested.length) mid += b.families;
      continue;
    }
    const share = knownShare(t.right, t.wrong, t.asked);
    mid += share * b.families;
    // a rough band of doubt: one word more or fewer known in this band
    spread += (b.families / t.asked) ** 2;
    if (t.right / t.asked >= 2 / 3) top = Math.max(top, b.id);
  }
  // untested bands below the start are an assumption, not a finding: widen the doubt for them
  const assumed = check.bands.filter((b) => b.id < lowest && tested.length).reduce((s, b) => s + b.families, 0);
  const sd = Math.sqrt(spread + (assumed * 0.15) ** 2);
  const total = check.bands.reduce((s, b) => s + b.families, 0);
  const round = (x: number) => Math.min(total, Math.max(0, Math.round(x / 500) * 500));
  return { estimate: round(mid), low: round(mid - sd), high: round(mid + sd), band: top, answered: answers.length, perBand: [...tally].sort((a, b) => a[0] - b[0]).map(([band, t]) => ({ band, asked: t.asked, known: t.right })) };
}

export interface CheckView {
  phase: "asking" | "done";
  round: number;
  position: number;
  /** The word on screen: no answer key. */
  word: { word: string; options: string[] } | null;
  result: Result | null;
}

export const startBand = (age: "early" | "school" | "older" | null | undefined) => (age === "early" ? 2 : age === "older" ? 4 : 3);
export const seenWords = (records: readonly VocabRecord[]) => new Set(records.flatMap((r) => (r.type === "answer" ? [r.word] : [])));
export const latestResult = (records: readonly VocabRecord[]) => [...records].reverse().find((r): r is Extract<VocabRecord, { type: "result" }> => r.type === "result") ?? null;

/** One sitting of the check. Every answer appends a record; the caller stores what `take()` returns. */
export class SizeCheckSession {
  private readonly check: SizeCheck;
  private readonly used: Set<string>;
  private log: VocabRecord[] = [];
  private taken = 0;
  private band: number;
  private round = 0;
  private queue: Word[] = [];
  private roundRight = 0;
  private answers: { band: number; outcome: Outcome }[] = [];
  private visits = new Map<number, number>();
  private result: Result | null = null;

  constructor(check: SizeCheck, start: number, history: readonly VocabRecord[] = []) {
    this.check = check;
    this.used = seenWords(history);
    this.band = Math.min(check.bands.length, Math.max(1, start));
    this.log.push({ type: "start", check: `${check.version}`, band: this.band });
    this.fill();
  }

  take(): VocabRecord[] {
    const out = this.log.slice(this.taken);
    this.taken = this.log.length;
    return out;
  }

  /** Three words of the current band: unseen ones first, in the content's order; seen ones only when none are left. */
  private fill() {
    const pool = this.check.words.filter((w) => w.band === this.band);
    const fresh = pool.filter((w) => !this.used.has(w.word));
    this.queue = [...fresh, ...pool.filter((w) => this.used.has(w.word))].slice(0, ROUND_SIZE);
    this.roundRight = 0;
  }

  snapshot(): CheckView {
    const w = this.queue[0];
    return { phase: this.result ? "done" : "asking", round: this.round, position: ROUND_SIZE - this.queue.length, word: this.result || !w ? null : { word: w.word, options: [...w.options] }, result: this.result ? structuredClone(this.result) : null };
  }

  /** `choice`: the index of a meaning, or null for "I don't know". */
  answer(choice: number | null): void {
    const w = this.queue[0];
    if (this.result || !w) return;
    if (choice !== null && (!Number.isInteger(choice) || choice < 0 || choice >= w.options.length)) return;
    const outcome: Outcome = choice === null ? "unknown" : choice === w.answer ? "right" : "wrong";
    this.used.add(w.word);
    this.answers.push({ band: w.band, outcome });
    this.log.push({ type: "answer", check: `${this.check.version}`, word: w.word, band: w.band, outcome });
    if (outcome === "right") this.roundRight++;
    this.queue.shift();
    if (this.queue.length) return;
    this.round++;
    const up = this.roundRight >= 2;
    const next = Math.min(this.check.bands.length, Math.max(1, this.band + (up ? 1 : -1)));
    this.visits.set(this.band, (this.visits.get(this.band) ?? 0) + 1);
    // settled: the next band has already been tried twice (the learner is moving between two neighbouring bands)
    if (this.round >= ROUNDS || (this.visits.get(next) ?? 0) >= 2) {
      this.result = estimate(this.check, this.answers);
      this.log.push({ type: "result", check: `${this.check.version}`, estimate: this.result.estimate, low: this.result.low, high: this.result.high, band: this.result.band, answered: this.result.answered });
      return;
    }
    this.band = next;
    this.fill();
  }
}
