/**
 * Written answers (content/english/reading/written-answers.json): the learner reads a Reading course passage and
 * types a short answer to a question on it, as in a school exam. The answer is checked by rule, with no AI: it must
 * hold a word from every key group (who, what, why...), allowing simple endings and a one-letter slip in longer words.
 * A second try follows a miss; then the model answer. A one- or two-word right answer is accepted with a nudge to
 * answer in a full sentence. What the learner types is never stored: only whether it was right, and on which try.
 * Guards against answers that hold the key words without meaning them: a key word straight after "not", "no",
 * "never" or a "n't" word does not count ("it was not red"); a word the item lists as a wrong answer, said without
 * "not", makes the answer wrong ("red or green", "green"); "or" between choices is a guess, not an answer; and an
 * answer far longer than the model (a copied paragraph, a list of words) is sent back to be said in one sentence.
 */
import writtenJson from "../../../../../content/english/reading/written-answers.json";
import l1 from "../../../../../content/english/reading/level-1.json";
import l2 from "../../../../../content/english/reading/level-2.json";
import l3 from "../../../../../content/english/reading/level-3.json";
import l4 from "../../../../../content/english/reading/level-4.json";
import l5 from "../../../../../content/english/reading/level-5.json";
import l6 from "../../../../../content/english/reading/level-6.json";

export interface WrittenItem {
  id: string;
  passage: string;
  level: number;
  question: string;
  keys: string[][];
  model: string;
  hint: string;
  /** Words that, said without "not", show a wrong answer (a wrong colour, the wrong cause…). */
  avoid?: string[];
}
export const WRITTEN: { id: string; version: number; items: WrittenItem[] } = writtenJson as never;
type Passage = { id: string; title: string; text: string };
const PASSAGES = new Map<string, Passage>([l1, l2, l3, l4, l5, l6].flatMap((l) => (l as { passages: Passage[] }).passages).map((p) => [p.id, p]));
export const passageOf = (it: WrittenItem): Passage => PASSAGES.get(it.passage)!;
export const SITTING = 3;

const norm = (s: string) => ` ${s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' -]+/g, " ").replace(/\s+/g, " ").trim()} `;
function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  // one letter added, missing or changed
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1);
}
const ENDINGS = ["", "s", "es", "ed", "d", "ing"];
const NEG = new Set(["not", "no", "never", "nor", "without", "neither", "hardly"]);
const negated = (words: string[], at: number) => words.slice(Math.max(0, at - 3), at).some((w) => NEG.has(w) || w.endsWith("n't"));
/** Where the key is said in the answer and not denied: a negated key ("not red") does not count. */
function has(text: string, key: string): boolean {
  const k = key.toLowerCase();
  const words = text.trim().split(" ");
  const denies = NEG.has(k.split(" ")[0]);
  if (k.includes(" ") || k.includes("-")) {
    const parts = k.replace(/-/g, " ").split(" ");
    for (let i = 0; i + parts.length <= words.length; i++)
      if ((parts.every((p, j) => words[i + j] === p) || words[i] === k) && (denies || !negated(words, i))) return true;
    return false;
  }
  return words.some((w, i) => ENDINGS.some((e) => w === k + e || (e === "" && near(w, k))) && (denies || !negated(words, i)));
}

export interface WrittenMark {
  correct: boolean;
  /** Key groups the answer does not cover yet (their first words, for the hint). */
  missing: number;
  /** A right answer of only a word or two: say it as a sentence next time. */
  short: boolean;
  /** Starts with a capital letter and ends with a full stop (shown, not marked). */
  sentence: boolean;
  /** Why a answer holding the key words was still not accepted: a wrong answer named too, two choices, or far too long. */
  guard?: "wrong" | "choice" | "long";
}
export function markWritten(it: WrittenItem, answer: string): WrittenMark {
  const t = norm(answer);
  const missing = it.keys.filter((g) => !g.some((k) => has(t, k))).length;
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const modelWords = it.model.split(/\s+/).length;
  const guard: WrittenMark["guard"] = (it.avoid ?? []).some((w) => has(t, w))
    ? "wrong"
    : / or /.test(t) && !/ or /.test(norm(it.model))
      ? "choice"
      : words > 2 * modelWords + 6
        ? "long"
        : undefined;
  return { correct: missing === 0 && words > 0 && !guard, missing, short: words <= 2, sentence: /^[A-Z]/.test(answer.trim()) && /[.!?]$/.test(answer.trim()), ...(guard ? { guard } : {}) };
}

export function writtenProblems(w: typeof WRITTEN): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const it of w.items) {
    if (ids.has(it.id)) out.push(`${it.id}: listed twice`);
    ids.add(it.id);
    const p = PASSAGES.get(it.passage);
    if (!p) out.push(`${it.id}: no passage ${it.passage}`);
    if (!it.keys.length || it.keys.some((g) => !g.length)) out.push(`${it.id}: needs key words`);
    if (!markWritten(it, it.model).correct) out.push(`${it.id}: its own model answer is not marked right`);
    if (markWritten(it, "I do not know.").correct) out.push(`${it.id}: "I do not know" is marked right`);
    // every key group can be found in the passage or the model answer (a check that the keys fit the text)
    if (p && it.keys.some((g) => !g.some((k) => has(norm(p.text + " " + it.model), k)))) out.push(`${it.id}: a key group is in neither the passage nor the model`);
  }
  for (let l = 1; l <= 6; l++) if (w.items.filter((i) => i.level === l).length < 4) out.push(`level ${l}: needs at least four questions`);
  return out;
}
{
  const p = writtenProblems(WRITTEN);
  if (p.length) throw new Error(`written answers: ${p.slice(0, 5).join("; ")}`);
}

export type WrittenRecord = { type: "answer"; sitting: string; id: string; level: number; correct: boolean; tries: number } | { type: "end"; sitting: string; asked: number; right: number };

/** The next questions: at the learner's reading level first (then nearest, lower before higher), unanswered right first. */
export function pickWritten(records: readonly WrittenRecord[], level: number, n = SITTING): WrittenItem[] {
  const right = new Set(records.flatMap((r) => (r.type === "answer" && r.correct ? [r.id] : [])));
  const asked = new Map<string, number>();
  records.forEach((r, i) => r.type === "answer" && asked.set(r.id, i));
  return [...WRITTEN.items]
    .sort((a, b) => Number(right.has(a.id)) - Number(right.has(b.id)) || Math.abs(a.level - level) - Math.abs(b.level - level) || a.level - b.level || (asked.get(a.id) ?? -1) - (asked.get(b.id) ?? -1) || (a.id < b.id ? -1 : 1))
    .slice(0, n);
}

export interface WrittenView {
  phase: "ask" | "marked" | "done";
  index: number;
  total: number;
  item: WrittenItem | null;
  passage: Passage | null;
  tries: number;
  mark: WrittenMark | null;
  /** After a right answer or the second try: the model answer is shown. */
  reveal: boolean;
  right: number;
}

export class WrittenSitting {
  private index = 0;
  private tries = 0;
  private mark: WrittenMark | null = null;
  private done = false;
  private right = 0;
  private readonly log: WrittenRecord[] = [];
  readonly items: WrittenItem[];
  readonly sitting: string;
  constructor(items: WrittenItem[], sitting: string) {
    this.items = items;
    this.sitting = sitting;
  }

  check(answer: string): void {
    const it = this.items[this.index];
    if (!it || this.done || (this.mark && (this.mark.correct || this.tries >= 2)) || !answer.trim()) return;
    this.tries++;
    this.mark = markWritten(it, answer);
    if (this.mark.correct || this.tries >= 2) {
      if (this.mark.correct) this.right++;
      this.log.push({ type: "answer", sitting: this.sitting, id: it.id, level: it.level, correct: this.mark.correct, tries: this.tries });
    }
  }

  /** After a miss on the first try: write it again. */
  again(): void {
    if (this.mark && !this.mark.correct && this.tries < 2) this.mark = null;
  }

  next(): void {
    if (!this.mark || !(this.mark.correct || this.tries >= 2)) return;
    this.index++;
    this.tries = 0;
    this.mark = null;
    if (this.index >= this.items.length) {
      this.done = true;
      this.log.push({ type: "end", sitting: this.sitting, asked: this.items.length, right: this.right });
    }
  }

  snapshot(): WrittenView {
    const item = this.done ? null : this.items[this.index] ?? null;
    return { phase: this.done ? "done" : this.mark ? "marked" : "ask", index: this.index, total: this.items.length, item, passage: item ? passageOf(item) : null, tries: this.tries, mark: this.mark, reveal: !!this.mark && (this.mark.correct || this.tries >= 2), right: this.right };
  }

  take(): WrittenRecord[] {
    return this.log.splice(0);
  }
}

export function writtenSummary(records: readonly WrittenRecord[]): { answered: number; right: number; firstTry: number } {
  const a = records.filter((r): r is Extract<WrittenRecord, { type: "answer" }> => r.type === "answer");
  return { answered: a.length, right: a.filter((r) => r.correct).length, firstTry: a.filter((r) => r.correct && r.tries === 1).length };
}
