/**
 * The English streams, as the home screen shows them once a level is found: for each stream its level in its own
 * terms, the next thing to do, and whether something was done in it today. Read from the learner's record; nothing
 * is written and nothing here is an estimate of the engine's.
 */
import { type PlanStep, spellingRuleStep } from "../plan.ts";
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
import { FIRST, firstSummary, isBeginner } from "../first/first.ts";

export type StreamId = "words" | "reading" | "listening" | "spelling" | "grammar";
/** The Grammar in use topic that practises naming the kinds of words. */
export const NAMING_TOPIC = "parts_of_speech";
export interface StreamRow {
  id: StreamId;
  icon: string;
  name: string;
  /** The level in the stream's own terms. */
  level: string;
  /** The level as a number on the stream's own ladder (0 for First words, before Words level 1), and its top. */
  at: number;
  of: number;
  /** What moves the learner up a level here, in a child's words. */
  up: string;
  /** The next thing to do. */
  next: string;
  doneToday: boolean;
  /** Nothing to open right now. */
  idle?: boolean;
  /** Spelling: open My Words (words from the other streams wait there) instead of the Spelling Bee. Listening: open Listen and answer (a passage) instead of Listen and write. */
  open?: "mywords" | "passage" | "naming" | "first" | "rule";
  /** For open "rule": the spelling-rule lesson or check to start. */
  step?: PlanStep;
}

/** What moves a learner up, as each stream's own rule says it (daily-words, reading, dictation, spelling, grammar-use). */
export const UP = {
  first: "Find twenty words sure in First words, then Words begins at level 1.",
  words: "Get ten words of your level right, with one slip at most. Missing half of them takes you back a level for a while.",
  reading: "Pass the check on each reading skill at your level: then the next level's skills open.",
  listening: "Two sittings in a row with four or five sentences right first time. A sitting with one or none right takes you down one.",
  spelling: "In the Spelling Bee, four of your last five words at your level right. Three wrong takes you down one.",
  grammar: "Two sittings in a row with six or more of eight right. Three or fewer right takes you down one.",
};

const KINDS: Record<StreamId, string[]> = {
  words: ["word_learn", "first_words"],
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

  const listening = levelFor(DICTATION, learner.dictationRecords(), levels.listening?.level ?? startLevel(learner.state.preferences));
  const bee = levelOf(learner.spelling(), BANK);
  const wroteToday = learner.state.events.some((e) => e.kind === "dictation" && e.record.type === "end" && dayOf(e.at) === today);
  const heardToday = active.has("listen_passage");
  const wait = waiting(learner);
  const joined = wait.tricky + wait.newWords;
  const grammar = grammarLevel(GRAMMAR, learner.grammarRecords(), levels.grammar?.level ?? grammarStart(learner.state.preferences));
  // the level check found that naming a noun or a verb is not yet sure: that comes first, until a sitting of it is done
  const naming = !!levels.grammar && !levels.grammar.basics && !learner.grammarRecords().some((r) => r.type === "end" && r.topics?.includes(NAMING_TOPIC));

  // a beginner (Find my level found no English yet) starts Words with First words, picture by picture, until First
  // sentences open (sim-english@2: at the first Words level a beginner had a third of the sittings mostly wrong)
  const first = isBeginner(levels) && !firstSummary(FIRST, learner.firstRecords()).sentences;
  const firstToday = active.has("first_words");

  // spelling: words from the learner's own writing first; then, every other day, the next spelling rule (a short lesson
  // and practice on a pattern, from the older journey's spelling plan); otherwise a round of the Spelling Bee
  const beeLevel = `${LEVEL_NAMES[bee]} (level ${bee} of ${Object.keys(LEVEL_NAMES).length})`;
  const spellingSessions = [...learner.state.sessions.values()].filter((x) => x.event.type === "spelling_practice" || x.event.type === "spelling_transfer");
  const ruleToday = spellingSessions.some((x) => dayOf(x.event.at) === today);
  const ruleYesterday = spellingSessions.some((x) => Date.parse(now) - Date.parse(x.event.at) < 36 * 3600 * 1000);
  const spellToday = active.has("spell_answer") || ruleToday;
  const rule = !ruleToday && !ruleYesterday ? spellingRuleStep(learner.state, learner.content, now, learner.speech) : null;

  return [
    first
      ? { id: "words", icon: "🌱", name: "Words", level: "First words", at: 0, of: BANDS, up: UP.first, next: firstToday ? "Done for today" : "Find words in pictures", doneToday: firstToday, open: "first" as const }
      : { id: "words", icon: "🌱", name: "Words", level: `Level ${band} of ${BANDS}`, at: band, of: BANDS, up: UP.words, next: ws.dueNow ? `${ws.dueNow} ${ws.dueNow === 1 ? "word" : "words"} to see again` : wordsDone ? "Done for today" : "Five new words", doneToday: wordsDone },
    { id: "reading", icon: "📖", name: "Reading", level: `${COURSE.levels.find((l) => l.id === readingLevel)!.name} (level ${readingLevel} of ${COURSE.levels.length})`, at: readingLevel, of: COURSE.levels.length, up: UP.reading, next: rec ? COURSE.skills.find((s) => s.id === rec.unit.skill)!.name : "Every skill done", doneToday: did("reading") },
    { id: "listening", icon: "🎧", name: "Listening", level: `Level ${listening} of ${DICTATION.levels.length}`, at: listening, of: DICTATION.levels.length, up: UP.listening, next: wroteToday && !heardToday ? "A passage to hear, with four questions" : "Five sentences to hear and write", doneToday: wroteToday && heardToday, ...(wroteToday && !heardToday ? { open: "passage" as const } : {}) },
    joined
      ? { id: "spelling", icon: "🐝", name: "Spelling", level: beeLevel, at: bee, of: Object.keys(LEVEL_NAMES).length, up: UP.spelling, next: `${joined} ${joined === 1 ? "word" : "words"} from your writing and new words`, doneToday: spellToday, open: "mywords" as const }
      : rule
        ? { id: "spelling", icon: "🐝", name: "Spelling", level: beeLevel, at: bee, of: Object.keys(LEVEL_NAMES).length, up: UP.spelling, next: rule.title.replace(/^Spelling: /, "Spelling rule: "), doneToday: spellToday, open: "rule" as const, step: rule }
        : { id: "spelling", icon: "🐝", name: "Spelling", level: beeLevel, at: bee, of: Object.keys(LEVEL_NAMES).length, up: UP.spelling, next: "A round of the Spelling Bee", doneToday: spellToday },
    { id: "grammar", icon: "🧩", name: "Grammar", level: `Level ${grammar} of ${GRAMMAR.levels.length}`, at: grammar, of: GRAMMAR.levels.length, up: UP.grammar, next: naming ? "Start with naming words: noun and verb" : "Eight sentences to fix and build", ...(naming ? { open: "naming" as const } : {}), doneToday: learner.state.events.some((e) => e.kind === "grammar_use" && e.record.type === "end" && dayOf(e.at) === today) },
  ];
}
