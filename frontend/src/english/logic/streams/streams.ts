/**
 * The English streams, as the home screen shows them once a level is found: for each stream its level in its own
 * terms, the next thing to do, and whether something was done in it today. Read from the learner's record; nothing
 * is written and nothing here is an estimate of the engine's.
 */
import { DICTATION, levelFor, startLevel } from "../dictation/dictation.ts";
import type { Learner } from "../learner.ts";
import { COURSE } from "../reading/course.ts";
import { progress as readingProgress, recommend } from "../reading/session.ts";
import { BANK, LEVEL_NAMES, levelOf } from "../spelling.ts";
import { BANDS, NEW_PER_DAY, WORDS, baseBand, progress as wordProgress, summary as wordSummary, teachBand } from "../vocabulary/daily-words.ts";
import { latestResult } from "../vocabulary/size-check.ts";
import { GRAMMAR, levelFor as grammarLevel, startLevel as grammarStart } from "../grammar-use/grammar-use.ts";
import { waiting } from "./joined.ts";
import { asReadingLevel } from "./level-check.ts";

export type StreamId = "words" | "reading" | "listening" | "spelling" | "grammar";
export interface StreamRow {
  id: StreamId;
  icon: string;
  name: string;
  /** The level in the stream's own terms. */
  level: string;
  /** The next thing to do. */
  next: string;
  doneToday: boolean;
  /** Nothing to open right now. */
  idle?: boolean;
  /** Spelling: open My Words (words from the other streams wait there) instead of the Spelling Bee. Listening: open Listen and answer (a passage) instead of Listen and write. */
  open?: "mywords" | "passage";
}

const KINDS: Record<StreamId, string[]> = {
  words: ["word_learn"],
  reading: ["reading"],
  listening: ["dictation"],
  spelling: ["spell_answer"],
  grammar: ["grammar_use"],
};

export function streamRows(learner: Learner, now: string): StreamRow[] {
  const dayOf = learner.dayFn();
  const today = dayOf(now);
  const active = new Set<string>();
  for (const e of learner.state.events) if (dayOf(e.at) === today) active.add(e.kind);
  const did = (id: StreamId) => KINDS[id].some((k) => active.has(k));
  const age = learner.state.preferences?.band;
  const levels = learner.levels();

  const history = learner.wordLearnRecords();
  const ws = wordSummary(history, now, dayOf);
  const band = teachBand(WORDS, wordProgress(history), baseBand(levels.words?.band ?? latestResult(learner.vocabRecords())?.band, age));
  const wordsDone = ws.newToday >= NEW_PER_DAY && ws.dueNow === 0;

  const start = asReadingLevel(levels.reading?.start);
  const rec = recommend(COURSE, readingProgress(COURSE, learner.readingRecords()), start);
  const readingLevel = rec?.unit.level ?? COURSE.levels.at(-1)!.id;

  const listening = levelFor(DICTATION, learner.dictationRecords(), levels.listening?.level ?? startLevel(age));
  const bee = levelOf(learner.spelling(), BANK);
  const wroteToday = learner.state.events.some((e) => e.kind === "dictation" && e.record.type === "end" && dayOf(e.at) === today);
  const heardToday = active.has("listen_passage");
  const wait = waiting(learner);
  const joined = wait.tricky + wait.newWords;
  const grammar = grammarLevel(GRAMMAR, learner.grammarRecords(), grammarStart(age));

  return [
    { id: "words", icon: "🌱", name: "Words", level: `Level ${band} of ${BANDS}`, next: ws.dueNow ? `${ws.dueNow} ${ws.dueNow === 1 ? "word" : "words"} to see again` : wordsDone ? "Done for today" : "Five new words", doneToday: wordsDone },
    { id: "reading", icon: "📖", name: "Reading", level: `${COURSE.levels.find((l) => l.id === readingLevel)!.name} (level ${readingLevel} of ${COURSE.levels.length})`, next: rec ? COURSE.skills.find((s) => s.id === rec.unit.skill)!.name : "Every skill done", doneToday: did("reading") },
    { id: "listening", icon: "🎧", name: "Listening and writing", level: `Level ${listening} of ${DICTATION.levels.length}`, next: wroteToday && !heardToday ? "A passage to hear, with four questions" : "Five sentences to hear and write", doneToday: wroteToday && heardToday, ...(wroteToday && !heardToday ? { open: "passage" as const } : {}) },
    { id: "spelling", icon: "🐝", name: "Spelling", level: `${LEVEL_NAMES[bee]} (level ${bee} of ${Object.keys(LEVEL_NAMES).length})`, next: joined ? `${joined} ${joined === 1 ? "word" : "words"} from your writing and new words` : "A round of the Spelling Bee", doneToday: did("spelling"), ...(joined ? { open: "mywords" as const } : {}) },
    { id: "grammar", icon: "🧩", name: "Grammar", level: `Level ${grammar} of ${GRAMMAR.levels.length}`, next: "Eight sentences to fix and build", doneToday: learner.state.events.some((e) => e.kind === "grammar_use" && e.record.type === "end" && dayOf(e.at) === today) },
  ];
}
