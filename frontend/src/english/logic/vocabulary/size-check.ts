/** Short adaptive word-meaning check and provisional practice placement, not a vocabulary-size estimate. */
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
  | { type: "result"; check: string; band: number; answered: number; correct?: number; estimate?: number; low?: number; high?: number };

export interface Result {
  /** Highest band with corroborating evidence; 0 means no band recommendation yet. */
  band: number;
  answered: number;
  correct: number;
  perBand: { band: number; asked: number; correct: number }[];
}

/** Positive evidence for placement comes only from answers to independent items. */
export function score(check: SizeCheck, answers: readonly { band: number; outcome: Outcome }[]): Result {
  const counts = new Map<number, { band: number; asked: number; correct: number }>();
  for (const { band, outcome } of answers) {
    const t = counts.get(band) ?? { band, asked: 0, correct: 0 };
    t.asked++;
    if (outcome === "right") t.correct++;
    counts.set(band, t);
  }
  const clears = (id: number) => {
    const t = counts.get(id);
    return !!t && (t.asked === ROUND_SIZE ? t.correct === ROUND_SIZE : t.asked >= 2 * ROUND_SIZE && t.correct >= t.asked - 1);
  };
  let band = 0;
  for (const b of check.bands) {
    // A perfect short round needs support from the band immediately below it.
    // Two rounds at the same band can also corroborate it (at most one miss).
    const t = counts.get(b.id);
    if (t && clears(b.id) && (t.asked >= 2 * ROUND_SIZE || clears(b.id - 1))) band = b.id;
  }
  return {
    band, answered: answers.length, correct: answers.filter((a) => a.outcome === "right").length,
    perBand: [...counts.values()].sort((a, b) => a.band - b.band),
  };
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

/** Preserve old results for replay, but do not let a legacy score select today's practice band. */
export function wordPracticeBand(records: readonly VocabRecord[], fallback?: number): number | undefined {
  const last = latestResult(records);
  return last ? (last.correct === undefined ? undefined : last.band) : fallback;
}

/** One sitting of the check. Every answer appends a record; the caller stores what `take()` returns. */
export class SizeCheckSession {
  private readonly check: SizeCheck;
  private readonly previous: Set<string>;
  private readonly used = new Set<string>();
  private log: VocabRecord[] = [];
  private taken = 0;
  private band: number;
  private round = 0;
  private queue: Word[] = [];
  private roundRight = 0;
  private answers: { band: number; outcome: Outcome }[] = [];
  private visits = new Map<number, number>();
  private result: Result | null = null;

  private readonly rounds: number;

  /** `rounds`: fewer than the full eight for a quick check (the level check uses four). */
  constructor(check: SizeCheck, start: number, history: readonly VocabRecord[] = [], rounds = ROUNDS) {
    this.check = check;
    this.rounds = Math.max(1, Math.min(ROUNDS, rounds));
    this.previous = seenWords(history);
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
    const pool = this.check.words.filter((w) => w.band === this.band && !this.used.has(w.word));
    const fresh = pool.filter((w) => !this.previous.has(w.word));
    this.queue = [...fresh, ...pool.filter((w) => this.previous.has(w.word))].slice(0, ROUND_SIZE);
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
    const visits = (this.visits.get(this.band) ?? 0) + 1;
    this.visits.set(this.band, visits);
    const t = score(this.check, this.answers).perBand.find((x) => x.band === this.band)!;
    const up = this.roundRight === ROUND_SIZE && (visits === 1 || t.correct >= t.asked - 1);
    const retry = this.roundRight === ROUND_SIZE - 1 && visits === 1;
    const next = Math.min(this.check.bands.length, Math.max(1, this.band + (up ? 1 : retry ? 0 : -1)));
    // Stop before a third round in any band or after reaching the question budget.
    if (this.round >= this.rounds || (this.visits.get(next) ?? 0) >= 2) {
      this.result = score(this.check, this.answers);
      this.log.push({ type: "result", check: `${this.check.version}`, correct: this.result.correct, band: this.result.band, answered: this.result.answered });
      return;
    }
    this.band = next;
    this.fill();
  }
}
