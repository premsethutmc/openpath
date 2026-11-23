/**
 * One picture of a learner's English: where each part stands, how sure that is, and one overall level.
 *
 * Nothing here is stored and nothing is asked: it is worked out from records the learner already has.
 *
 *   level      the part's level as the home screen shows it (streams.ts), so practice that moved it is included
 *   source     "measured": the part's own check in Find my level; "starting point": worked out from the quick gap
 *              check, not measured in that part; "not checked": the app started the learner by age
 *   range      what the check's answers leave open. Each check holds a belief about the learner's level, not just a
 *              number; the range is the middle four fifths of that belief, rebuilt here from the stored answers.
 *              A long check leaves a narrow range, a three-sentence one a wide range.
 *   sure       the range in words: "fairly sure" when it spans at most two levels, otherwise "first estimate"
 *   overall    the level the quick gap check measured, with its own range. The parts are never averaged into a
 *              number: their ladders are not on one scale
 *
 * What it does not do yet: practice answers do not narrow a range. A part stays a first estimate until it is
 * checked in full, however much is practised. And the older lesson record (the engine's capability estimates) is
 * not folded in: those lessons keep their own "shown on your own" rules.
 */
import { belief, type Evidence, type VocabRecord, CHECK_VERSION } from "../vocabulary/size-check.ts";
import { GAP_CHECK, READING_CHECK, TYPED_CHECK, readingBelief, startFromWords, typedBelief, type LevelCheckRecord, type Levels, type Part } from "./level-check.ts";
import type { Learner } from "../learner.ts";
import { streamRows, type StreamId, type StreamRow } from "./streams.ts";

export type Source = "measured" | "starting point" | "not checked";
export type Sure = "fairly sure" | "first estimate" | "starting point" | "not checked yet";
export interface PartPicture {
  id: StreamId;
  name: string;
  icon: string;
  /** The level in the part's own words, its number and the top of its ladder. */
  level: string;
  at: number;
  of: number;
  source: Source;
  sure: Sure;
  /** The lowest and highest level the answers leave open, on the part's own ladder. */
  low: number;
  high: number;
  /** One line for a grown-up: "fairly sure" or "first estimate: could be level 2 to 4". */
  note: string;
}
export interface Picture {
  parts: PartPicture[];
  /** The overall level the quick gap check measured, on the scale of eight (null: not taken), how sure it is and what it leaves open. */
  overall: number | null;
  overallSure: Sure;
  low: number;
  high: number;
}

/** The lowest and highest grid value the middle four fifths of a belief covers. */
function span(grid: readonly number[], p: readonly number[]): [number, number] {
  let sum = 0;
  let low = grid[0];
  let high = grid[grid.length - 1];
  let seenLow = false;
  for (let i = 0; i < grid.length; i++) {
    sum += p[i];
    if (!seenLow && sum > 0.1) {
      low = grid[i];
      seenLow = true;
    }
    if (sum >= 0.9) {
      high = grid[i];
      break;
    }
  }
  return [Math.floor(low), Math.ceil(high)];
}

const latest = <T extends LevelCheckRecord["type"]>(records: readonly LevelCheckRecord[], type: T) => [...records].reverse().find((r): r is Extract<LevelCheckRecord, { type: T }> => r.type === type) ?? null;

/** What the latest check of a part leaves open, on that part's ladder; null when the part was not measured. */
function measuredSpan(part: Part, records: readonly LevelCheckRecord[], vocab: readonly VocabRecord[], top: number): [number, number] | null {
  if (part === "words") {
    // the answers of the latest sitting of today's word check
    const start = vocab.map((r) => r.type).lastIndexOf("start");
    const answers = vocab.slice(start + 1).flatMap((r): Evidence[] => (r.type === "answer" && r.check === `${CHECK_VERSION}` && r.kind ? [{ kind: r.kind, band: r.band, outcome: r.outcome }] : []));
    if (!answers.length) return null;
    const p = belief(answers);
    return span(p.map((_, i) => i / 2), p);
  }
  if (part === "reading") {
    const r = latest(records, "reading");
    if (!r || r.check !== READING_CHECK || !r.steps.length) return null;
    const answers = r.steps.flatMap((s) => Array.from({ length: s.asked }, (_, i) => ({ level: s.level, right: i < s.right, options: 3 })));
    const b = readingBelief(answers, top);
    return span(b.grid, b.p);
  }
  const r = latest(records, part);
  if (!r || r.check !== TYPED_CHECK || !r.steps.length) return null;
  const answers = r.type === "listening" ? r.steps.map((s) => ({ level: s.level, right: s.perfect })) : r.type === "spelling" ? r.steps.map((s) => ({ level: s.level, right: s.correct })) : r.steps.map((s) => ({ level: s.level, right: s.correct, lucky: 1 / 7 }));
  const b = typedBelief(answers, top);
  return span(b.grid, b.p);
}

/** What the quick gap check leaves open for a part it did not measure: its own range, carried to the part's ladder and widened by a level. */
function startingSpan(part: Part, records: readonly LevelCheckRecord[], top: number): [number, number] {
  const g = latest(records, "gaps");
  if (!g || g.check !== GAP_CHECK || !g.steps.length) return [1, top];
  const b = typedBelief(g.steps.map((s) => ({ level: s.level, right: s.correct, lucky: 0.08 })), 8);
  const [low, high] = span(b.grid, b.p);
  if (part === "words") return [Math.max(0, low), Math.min(8, high)];
  return [Math.max(1, startFromWords(low, top, 1) - 1), Math.min(top, Math.ceil(1 + ((Math.max(1, high) - 1) * (top - 1)) / 7) + 1)];
}

export function picture(rows: readonly StreamRow[], levels: Levels, records: readonly LevelCheckRecord[], vocab: readonly VocabRecord[]): Picture {
  const parts = rows.map((row): PartPicture => {
    const part = row.id as Part;
    const floor = part === "words" ? 0 : 1;
    const source: Source = levels.estimated?.includes(part) ? "starting point" : levels[part] ? "measured" : "not checked";
    let [low, high] = source === "measured" ? measuredSpan(part, records, vocab, row.of) ?? [floor, row.of] : source === "starting point" ? startingSpan(part, records, row.of) : [floor, row.of];
    // the level shown may have moved with practice since the check: the range always holds it
    low = Math.max(floor, Math.min(low, row.at));
    high = Math.min(row.of, Math.max(high, row.at));
    const sure: Sure = source === "not checked" ? "not checked yet" : source === "starting point" ? "starting point" : high - low <= 2 ? "fairly sure" : "first estimate";
    const could = low === high ? "" : `: could be level ${low} to ${high}`;
    const note = sure === "not checked yet" ? "not checked yet: started by age" : sure === "starting point" ? `a starting point from the quick check${could}` : `${sure}${could}`;
    return { id: row.id, name: row.name, icon: row.icon, level: row.level, at: row.at, of: row.of, source, sure, low, high, note };
  });
  // One overall level exists only where it was measured: the quick gap check, on the scale of eight. The parts' ladders
  // are not on one scale (the top reading level is not the top word level), so they are never averaged into a number
  // or compared with each other here: that would claim more than was measured.
  const g = latest(records, "gaps");
  let overall: number | null = null;
  let overallSure: Sure = "not checked yet";
  let low = 0;
  let high = 8;
  if (g && g.check === GAP_CHECK && g.steps.length) {
    const b = typedBelief(g.steps.map((x) => ({ level: x.level, right: x.correct, lucky: 0.08 })), 8);
    [low, high] = span(b.grid, b.p);
    overall = g.level;
    low = Math.max(0, Math.min(low, overall));
    high = Math.min(8, Math.max(high, overall));
    overallSure = high - low <= 2 ? "fairly sure" : "first estimate";
  }
  return { parts, overall, overallSure, low, high };

}

/** The picture of a learner, from their own records. */
export function learnerPicture(learner: Learner, now: string): Picture {
  return picture(streamRows(learner, now), learner.levels(), learner.state.events.flatMap((e) => (e.kind === "level_check" ? [e.record] : [])), learner.vocabRecords());
}
