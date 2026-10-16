/**
 * DESIGN PROTOTYPE ONLY (Phase 1). Not imported by the app: the production Spelling Bee does not use this.
 *
 * The pure rules behind the adaptive spelling prototype, kept apart from the screen so they can be tested:
 *   - judgeChange: letter-by-letter input. Which changes to the answer box are a child's own keystrokes, and which are
 *     pastes, keyboard suggestions or autocorrect replacing the word (rejected, and never counted against the child).
 *   - helpOffer / nextClue: the thinking-time timer and the progressive clues.
 *   - analyseError: what kind of slip a wrong answer looks like, and whether earlier words support it.
 *   - evidence: the compact record of one word.
 * Timings are initial design hypotheses, not validated learning thresholds.
 */

export interface PrototypeWord {
  id: string;
  word: string;
  sentence: string;
  /** A short meaning a 10-year-old understands (written for the prototype; the Bee's words have none today). */
  meaning: string;
  /** Capability references, as in content/english/framework (and the dictation item, where the Bee word has one). */
  capability: string[];
  item?: string;
  /** Words that sound the same: the sentence is part of the first hearing, because the word alone is ambiguous. */
  soundsLike?: string[];
}

export const SAMPLE_WORDS: PrototypeWord[] = [
  { id: "bee.friend", word: "friend", sentence: "My best friend lives next door.", meaning: "someone you like and trust, who likes you too", capability: ["EN.FND.SPL"] },
  { id: "bee.preferred", word: "preferred", sentence: "She preferred the blue jumper to the red one.", meaning: "liked one thing more than another", capability: ["EN.FND.SPL.inflections"], item: "spl.dict.031" },
  { id: "bee.necessary", word: "necessary", sentence: "Is it necessary to bring a packed lunch?", meaning: "needed; something you must have or do", capability: ["EN.FND.SPL.morphological"], item: "spl.dict.076" },
  { id: "proto.their", word: "their", sentence: "The children hung their coats on the pegs.", meaning: "belonging to them", capability: ["EN.FND.SPL.homophones"], item: "spl.hom.05", soundsLike: ["there", "they're"] },
];

/* ------------------------------------------------------------------ letter-by-letter input */

export type InputDecision =
  | { kind: "add"; letter: string }
  | { kind: "remove"; count: number }
  | { kind: "none" }
  | { kind: "reject"; reason: RejectReason };
export type RejectReason = "paste" | "suggestion" | "replacement" | "not_a_letter";

/** Characters a spelling can contain. Everything else (spaces a keyboard adds after a suggestion, digits) is ignored. */
const LETTER = /^[a-z'-]$/;
/** Input types that are never a child's own keystroke (Input Events Level 2). */
const NEVER_TYPED = new Set(["insertFromPaste", "insertFromPasteAsQuotation", "insertFromDrop", "insertFromYank", "insertReplacementText", "insertTranspose"]);

/**
 * Decide what a change to the answer box means. `prev` is the answer OpenPath holds; `next` is what the browser now
 * shows; `inputType` is the InputEvent's type when the browser gives one. Only two changes are accepted: one letter
 * added at the end, or letters removed from the end (Backspace, or a held Backspace deleting several). Anything else
 * (a paste, a suggestion or autocorrect replacing the word, letters inserted in the middle) is rejected: the box goes
 * back to `prev` and nothing is held against the child.
 *
 * This compares values rather than trusting key events, because Android keyboards report most keys as "Unidentified"
 * and type through composition; comparing the value before and after works the same for every keyboard.
 */
export function judgeChange(prev: string, next: string, inputType = ""): InputDecision {
  const a = prev.toLowerCase();
  const b = next.toLowerCase();
  if (a === b) return { kind: "none" };
  if (NEVER_TYPED.has(inputType)) return { kind: "reject", reason: inputType === "insertReplacementText" ? "replacement" : "paste" };
  if (b.length < a.length && a.startsWith(b)) return { kind: "remove", count: a.length - b.length };
  if (b.length === a.length + 1 && b.startsWith(a)) {
    const letter = b.slice(-1);
    return LETTER.test(letter) ? { kind: "add", letter } : { kind: "reject", reason: "not_a_letter" };
  }
  // more than one character arrived at once: a whole-word suggestion, an autocomplete, or a paste the browser did not label
  if (b.length > a.length + 1) return { kind: "reject", reason: "suggestion" };
  return { kind: "reject", reason: "replacement" };
}

/* ------------------------------------------------------------------ timer and clues */

/** Clue levels: 0 independent; 1 the sentence; 2 the meaning; 3 the first letter; 4+ one more letter each. */
export type ClueLevel = 0 | 1 | 2 | 3 | 4;

export const TIMING = {
  /** Active thinking seconds at which each clue is gently offered (never forced). */
  offerAt: [8, 15, 25] as const,
  /** After a clue is taken, wait at least this long before offering the next one. */
  afterClueGap: 7,
  /** Between extra letters (level 4), the shortest pause before another can be asked for. */
  letterGap: 4,
  /** Do not interrupt typing: an offer waits until this long after the last keystroke. */
  quietAfterTyping: 3,
};

export interface ClueState {
  /** Highest clue level taken so far (0: none). */
  level: number;
  /** Letters revealed (0 until level 3). */
  revealed: number;
  /** Active seconds when the last clue was taken, or null. */
  lastClueAt: number | null;
}

/** The highest number of letters the clues will ever reveal: never the whole word. */
export const maxReveal = (word: string) => Math.max(1, word.length - 1);

/** The clue the button would give next, or null when every clue has been given. */
export function nextClue(c: ClueState, word: string): ClueLevel | null {
  if (c.level < 3) return (c.level + 1) as ClueLevel;
  return c.revealed < maxReveal(word) ? 4 : null;
}

/** Whether the next clue may be asked for now (only extra letters have a pause between them). */
export function clueReady(c: ClueState, word: string, activeSec: number): boolean {
  const n = nextClue(c, word);
  if (n === null) return false;
  if (n === 4 && c.lastClueAt !== null) return activeSec - c.lastClueAt >= TIMING.letterGap;
  return true;
}

/**
 * Whether the clue button should gently offer help now (a glow and a small "Want a clue?"). The child can always tap
 * it anyway; the timer only decides when OpenPath offers. Letters beyond the first are given only when asked for.
 */
export function helpOffer(c: ClueState, word: string, activeSec: number, sinceKeystroke: number): boolean {
  const n = nextClue(c, word);
  if (n === null || n === 4) return false;
  if (sinceKeystroke < TIMING.quietAfterTyping) return false;
  const due = TIMING.offerAt[n - 1];
  const gap = c.lastClueAt === null ? 0 : c.lastClueAt + TIMING.afterClueGap;
  return activeSec >= Math.max(due, gap);
}

export function takeClue(c: ClueState, word: string, activeSec: number): ClueState {
  const n = nextClue(c, word);
  if (n === null) return c;
  if (n <= 3) return { level: n, revealed: n === 3 ? 1 : c.revealed, lastClueAt: activeSec };
  return { level: 4, revealed: Math.min(c.revealed + 1, maxReveal(word)), lastClueAt: activeSec };
}

/** The letters given so far, from the start: shown as "p r e …", open-ended, so the word's length is never shown. */
export const givenLetters = (word: string, revealed: number) => [...word.slice(0, revealed)];
/** Exactly which letters were given (position in the word and letter), for the evidence record. */
export const revealedList = (word: string, revealed: number) => givenLetters(word, revealed).map((letter, index) => ({ index, letter }));

/* ------------------------------------------------------------------ after a wrong answer */

export type PatternId = "missed_double" | "extra_double" | "other_word" | "swapped_letters" | "vowel" | "missing_letter" | "extra_letter" | "other";

/** In the child's words: what the help says, never the technical name. For the parent view: a plain description. */
export const PATTERN_TEXT: Record<PatternId, { parent: string }> = {
  missed_double: { parent: "Doubling a letter" },
  extra_double: { parent: "Doubling a letter that stays single" },
  other_word: { parent: "Words that sound the same" },
  swapped_letters: { parent: "Two letters swapped (often a slip)" },
  vowel: { parent: "Choosing the vowel" },
  missing_letter: { parent: "A letter left out" },
  extra_letter: { parent: "An extra letter" },
  other: { parent: "Other spellings" },
};

type Op = { op: "keep" | "sub" | "del" | "ins"; t?: string; a?: string; at: number };

/** Edit operations turning the target into the answer (Levenshtein with transposition left out). `at` indexes the target. */
export function align(target: string, answer: string): Op[] {
  const t = target.toLowerCase();
  const a = answer.toLowerCase();
  const d = Array.from({ length: t.length + 1 }, (_, i) => Array.from({ length: a.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= t.length; i++) for (let j = 1; j <= a.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (t[i - 1] === a[j - 1] ? 0 : 1));
  const ops: Op[] = [];
  let i = t.length;
  let j = a.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (t[i - 1] === a[j - 1] ? 0 : 1)) {
      ops.push({ op: t[i - 1] === a[j - 1] ? "keep" : "sub", t: t[i - 1], a: a[j - 1], at: i - 1 });
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ op: "del", t: t[i - 1], at: i - 1 });
      i--;
    } else {
      ops.push({ op: "ins", a: a[j - 1], at: i });
      j--;
    }
  }
  return ops.reverse();
}

const VOWELS = new Set([..."aeiouy"]);

/** The plausible slips in one wrong answer (possibly several; possibly none recognised: "other"). Never proof. */
export function slips(w: PrototypeWord, answer: string): PatternId[] {
  const t = w.word.toLowerCase();
  const a = answer.toLowerCase().trim();
  if (!a || a === t) return [];
  if (w.soundsLike?.includes(a)) return ["other_word"];
  if (a.length === t.length) {
    const diff = [...t].map((ch, i) => (ch === a[i] ? -1 : i)).filter((i) => i >= 0);
    if (diff.length === 2 && diff[1] === diff[0] + 1 && t[diff[0]] === a[diff[1]] && t[diff[1]] === a[diff[0]]) return ["swapped_letters"];
  }
  const found = new Set<PatternId>();
  for (const o of align(t, a)) {
    if (o.op === "keep") continue;
    if (o.op === "del") found.add(t[o.at - 1] === o.t || t[o.at + 1] === o.t ? "missed_double" : "missing_letter");
    else if (o.op === "ins") found.add(t[o.at - 1] === o.a || t[o.at] === o.a ? "extra_double" : "extra_letter");
    else found.add(VOWELS.has(o.t!) && VOWELS.has(o.a!) ? "vowel" : "other");
  }
  return [...found];
}

/** Where the answer first goes wrong (the number of letters that are right from the start). */
export const rightFromStart = (target: string, answer: string) => {
  let k = 0;
  while (k < target.length && k < answer.length && target[k].toLowerCase() === answer[k].toLowerCase()) k++;
  return k;
};

/** Past wrong answers on other words: the learner's history, as the prototype keeps it. */
export interface PastSlip {
  word: string;
  pattern: PatternId;
}

/**
 * Different words with the same slip before it is treated as a possible learning difficulty (and gets targeted help).
 * The same bar as "supported" in misconceptions.ts. It is never a confirmed misconception: only a reason to help.
 */
export const REPEATED_AFTER = 2;

/** How many different words show this slip (this word included). */
export const wordsWithSlip = (pattern: PatternId, word: string, history: PastSlip[]) => {
  const words = new Set(history.filter((h) => h.pattern === pattern).map((h) => h.word));
  words.add(word);
  return words.size;
};

export type Help =
  | { kind: "targeted"; pattern: PatternId; keep: number; marker: number | null }
  | { kind: "other_word" }
  | { kind: "from_start"; keep: number };

/**
 * The help after a wrong answer. A slip repeated across at least two different words (a possible difficulty) gets targeted help;
 * otherwise ordinary left-to-right help: the right letters from the start are kept and the child carries on from there.
 * A real word that sounds the same is said plainly ("a different word"), with its sentence and meaning.
 */
export function helpAfterWrong(w: PrototypeWord, answer: string, history: PastSlip[]): Help {
  const found = slips(w, answer);
  if (found.includes("other_word")) return { kind: "other_word" };
  const keep = rightFromStart(w.word, answer);
  for (const p of found) {
    if (p !== "missed_double" && p !== "extra_double") continue;
    if (wordsWithSlip(p, w.word, history) >= REPEATED_AFTER) {
      // the marker: the position in the word where the doubled letter is
      const t = w.word.toLowerCase();
      let marker: number | null = null;
      for (let i = 0; i + 1 < t.length; i++) if (t[i] === t[i + 1] && i + 1 >= keep) {
        marker = i;
        break;
      }
      return { kind: "targeted", pattern: p, keep, marker };
    }
  }
  return { kind: "from_start", keep };
}

/* ------------------------------------------------------------------ evidence */

/**
 * How a word was completed. Decided by what the child was given, never by a share of letters and never by time:
 *   independent    right at the first Submit, with no letters given (hearing the sentence or meaning gives no letters);
 *   assisted       right after any letter was given, or after help following a wrong answer;
 *   guided         the word was shown and the child copied it (practice, not assessment);
 *   not_completed  not yet right.
 */
export type Completion = "independent" | "assisted" | "guided" | "not_completed";

export interface WordEvidence {
  kind: "spell_attempt_v2";
  word: { id: string; text: string; capability: string[]; item?: string };
  completion: Completion;
  /** Every submitted answer, in order, with how it was typed and what help came before it. */
  attempts: { answer: string; correct: boolean; atActiveMs: number; lettersAdded: number; lettersRemoved: number; afterHelp: Help["kind"] | "copy" | null }[];
  /** The first answer submitted before any letter or help, if there was one. */
  independentAnswer: string | null;
  /** Exactly which letters were given: position in the word, and the letter. */
  lettersRevealed: { index: number; letter: string }[];
  /** Whether the child asked to see where in the word to look (positions are shown only on request). */
  positionsShown: boolean;
  /** Clues taken, in order: 1 sentence, 2 meaning, 3 first letter, 4 another letter. */
  clues: { level: number; atActiveMs: number }[];
  /** Times the word was heard (the first included). */
  plays: number;
  /** Active thinking time: paused while the word is said, during feedback and while the app is hidden. Used only to time
   * offers of help and for a grown-up's information. Never used for mastery: slower is not worse. */
  timing: { activeMs: number; usedFor: "offering help only" };
  /** Changes the input rejected (paste, suggestion, autocorrect). For diagnosis only; never held against the child. */
  rejectedInputs: { reason: RejectReason; count: number }[];
  finalCorrect: boolean;
  /** Slips in the wrong answers. "possible_difficulty" once the same slip is seen in 2+ different words. Never a confirmed misconception. */
  possibleDifficulties: { pattern: PatternId; seenInWords: number; status: "seen_once" | "possible_difficulty" }[];
  /** Ask the word again later, with no help. */
  reassess: { needed: boolean; when: "next_session" | null; reason: string | null };
}

export function completionOf(e: { attempts: WordEvidence["attempts"]; lettersRevealed: number; finalCorrect: boolean; copied: boolean }): Completion {
  if (!e.finalCorrect) return "not_completed";
  if (e.copied) return "guided";
  if (e.attempts.length === 1 && e.attempts[0].correct && e.lettersRevealed === 0) return "independent";
  return "assisted";
}

export function reassessOf(c: Completion): WordEvidence["reassess"] {
  if (c === "independent") return { needed: false, when: null, reason: null };
  return { needed: true, when: "next_session", reason: c === "not_completed" ? "not yet spelt" : c === "guided" ? "copied with guidance" : "spelt with help" };
}
