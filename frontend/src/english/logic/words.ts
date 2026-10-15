/**
 * Word mastery: what the learner can do with each word, kept apart from everything else (pilot
 * readiness, 13 October 2026). Three levels stay separate:
 *
 *   word mastery        this module: one record per word, from every attempt at a generated item
 *   pattern mastery     state.ts `patternStatus`: practice and transfer checks on unseen words
 *   spelling proficiency the engine's composite (three spelling capabilities), from hand-written items
 *
 * Word mastery is derived from the app's own attempt events by a fold. It never writes to the ledger,
 * so it cannot change any capability estimate, and the composite updater is untouched.
 *
 * What counts:
 *   independent recall   a first, unaided attempt at a recall item (the learner writes the word:
 *                        add an ending, dictation, meaning clue) that is right
 *   recognition          a first, unaided attempt at a choice item (pick the spelling or the homophone);
 *                        recorded, but it is not recall
 *   mistake              a first, unaided attempt that is wrong (recall or recognition)
 *   assisted             any attempt after a hint or a wrong first try; never counts as recall
 *   delayed retention    an independent recall at least RETENTION_GAP_HOURS after the learner last met
 *                        the word: passed if right, failed if wrong
 */
import { RECALL_TEMPLATES, itemVersion } from "../../../../packages/english-core/src/index.ts";
import type { AppContent, Code } from "./content.ts";
import type { AttemptEvent } from "./events.ts";
import type { AppState } from "./state.ts";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** A delayed check must come at least this long after the learner last met the word (about a day, allowing for evening and morning sessions). */
export const RETENTION_GAP_HOURS = 20;
/** Mastered: delayed recall passed at least twice since the last mistake, the passes spanning at least this many days. */
export const MASTERY_SPAN_DAYS = 7;
/** Words answered right first time are checked again after this many days… */
export const CONFIRM_AFTER_DAYS = 3;
/** …and once retained, again after this many, until mastered. */
export const RECONFIRM_AFTER_DAYS = 7;
/** At most this many such checks are added to one review. */
export const CONFIRM_MAX = 3;

export type WordStatus =
  | "met" // seen, but never written from memory (recognition only, or only with help)
  | "learning" // the latest independent attempt was wrong
  | "recalled" // written correctly from memory, not yet checked on a later day
  | "retained" // written correctly on a later day, since the last mistake
  | "mastered"; // retained at least twice, over at least a week, since the last mistake

export const WORD_STATUS_LABEL: Record<WordStatus, string> = {
  met: "Met",
  learning: "Learning",
  recalled: "Written correctly",
  retained: "Remembered a day or more later",
  mastered: "Remembered over a week",
};

export interface WordAttempt {
  at: string;
  item: string;
  template: string;
  recall: boolean;
  correct: boolean;
  assisted: boolean;
  /** Set on an independent recall attempt that came at least RETENTION_GAP_HOURS after the previous meeting with the word. */
  delayed: boolean;
  /** Hours since the learner previously met the word (null on the first meeting). */
  gapHours: number | null;
  response: string | null;
}

export interface WordRecord {
  word: string;
  patterns: string[];
  firstMet: string;
  lastMet: string;
  /** First, unaided attempts. */
  independent: { recall: { right: number; wrong: number }; recognition: { right: number; wrong: number } };
  mistakes: number;
  assisted: number;
  retention: { passed: number; failed: number; lastPassed: string | null };
  status: WordStatus;
  /** Delayed recalls passed since the last mistake (what the status is built on). */
  retainedSince: string[];
  attempts: WordAttempt[];
}

function textOf(a: AttemptEvent, item: Code): string | null {
  if (a.response.kind === "typed") return a.response.text;
  if (a.response.kind === "choice" && item.options) return item.options[a.response.choice] ?? null;
  return null;
}

/** Every word the learner has met in a generated item, with its mastery record. Deterministic. */
export function wordMastery(s: AppState, c: AppContent): Map<string, WordRecord> {
  const attempts = [...s.sessions.values()].flatMap((x) => x.attempts).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const out = new Map<string, WordRecord>();
  for (const a of attempts) {
    const item = itemVersion(c.ctx.content, a.item.id, a.item.version) ?? c.ctx.content.items.get(a.item.id); // the version answered
    if (!item || item.kind !== "code" || !item.generated) continue;
    const word = item.generated.word;
    const recall = RECALL_TEMPLATES.has(item.generated.template);
    let r = out.get(word);
    if (!r) {
      r = {
        word,
        patterns: [],
        firstMet: a.at,
        lastMet: a.at,
        independent: { recall: { right: 0, wrong: 0 }, recognition: { right: 0, wrong: 0 } },
        mistakes: 0,
        assisted: 0,
        retention: { passed: 0, failed: 0, lastPassed: null },
        status: "met",
        retainedSince: [],
        attempts: [],
      };
      out.set(word, r);
    }
    const pattern = `${item.target}#${item.step}`;
    if (!r.patterns.includes(pattern)) r.patterns.push(pattern);
    const gap = r.attempts.length ? (Date.parse(a.at) - Date.parse(r.lastMet)) / HOUR : null;
    const independent = !a.assisted;
    const delayed = independent && recall && gap !== null && gap >= RETENTION_GAP_HOURS;
    r.attempts.push({ at: a.at, item: item.id, template: item.generated.template, recall, correct: a.correct, assisted: a.assisted, delayed, gapHours: gap === null ? null : Math.round(gap * 10) / 10, response: textOf(a, item) });
    r.lastMet = a.at;
    if (!independent) {
      r.assisted++;
      continue;
    }
    const kind = recall ? r.independent.recall : r.independent.recognition;
    if (a.correct) kind.right++;
    else kind.wrong++;
    if (!a.correct) {
      r.mistakes++;
      r.retainedSince = [];
      if (delayed) r.retention.failed++;
      r.status = "learning";
      continue;
    }
    if (delayed) {
      r.retention.passed++;
      r.retention.lastPassed = a.at;
      r.retainedSince.push(a.at);
    }
    if (!recall) continue; // recognition never raises a word's status
    const since = r.retainedSince;
    if (since.length >= 2 && Date.parse(since[since.length - 1]) - Date.parse(since[0]) >= MASTERY_SPAN_DAYS * DAY) r.status = "mastered";
    else if (since.length >= 1) r.status = "retained";
    else r.status = "recalled";
  }
  return out;
}

export function statusCounts(words: Map<string, WordRecord>): Record<WordStatus, number> {
  const n: Record<WordStatus, number> = { met: 0, learning: 0, recalled: 0, retained: 0, mastered: 0 };
  for (const w of words.values()) n[w.status]++;
  return n;
}

/**
 * Words answered right that are due a later check, so retention is measured for words the learner got
 * right as well as those they missed (missed words come back through word memory, state.ts). Oldest first.
 */
export function confirmationsDue(words: Map<string, WordRecord>, now: string, exclude: Set<string>): WordRecord[] {
  const t = Date.parse(now);
  return [...words.values()]
    .filter((w) => !exclude.has(w.word))
    .filter((w) => (w.status === "recalled" && t - Date.parse(w.lastMet) >= CONFIRM_AFTER_DAYS * DAY) || (w.status === "retained" && t - Date.parse(w.lastMet) >= RECONFIRM_AFTER_DAYS * DAY))
    .sort((a, b) => a.lastMet.localeCompare(b.lastMet) || a.word.localeCompare(b.word));
}
