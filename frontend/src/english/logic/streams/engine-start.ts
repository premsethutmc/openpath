/**
 * Where the lesson engine starts a learner: from Find my level, not from the middle of the scale (engine-start@1).
 *
 * The older lessons ("Skill by skill") keep an estimate for each of the framework's skills. Until now every one of
 * them started at the middle of the scale (4 of 8) whoever the learner was, so the engine's first questions were
 * pitched at the middle even for a learner Find my level had just placed at 2 or at 7.
 *
 * What this does: for each part Find my level MEASURED (not a part filled in from the quick gap check), the skills of
 * the matching strand start at that part's level instead of 4. It is a starting point, not evidence:
 *
 *   - only the centre moves; the spread stays as wide as the framework's own (1.5), so the first real answers move
 *     the estimate as freely as before
 *   - a skill that already has an answer of its own is never touched (english-core updater, starting-point@1)
 *   - nothing becomes "shown" or "mastered" from it, and the plan still asks for answers given on their own
 *   - nothing is stored: it is worked out from the level-check records each time the record is read
 *
 * Why the spread is not narrowed: each part has its own ladder (reading 1 to 6, spelling 1 to 5 …) and none has been
 * measured against the framework's scale of 1 to 8; the levels are carried across in proportion. On ten seeds of the
 * simulated learners (tools/english/sim/starting-point.ts, docs/english/STARTING_POINT.md) this start finds a
 * learner's shape better when the ladders are within a level of the framework's scale (0.62 to 0.72 against 0.54),
 * and no better or worse than the middle (0.51 to 0.56) when they are a level and a half off in opposite directions.
 * With a narrower spread the second case was worse than the middle, which is why the spread is left wide.
 */
import type { StartingPointEvent } from "../../../../../packages/english-core/src/index.ts";
import { DICTATION } from "../dictation/dictation.ts";
import type { AppEvent } from "../events.ts";
import { GRAMMAR } from "../grammar-use/grammar-use.ts";
import { COURSE } from "../reading/course.ts";
import { LEVEL_NAMES } from "../spelling.ts";
import { type Levels, type Part, levelsFrom } from "./level-check.ts";

export const ENGINE_START = "engine-start@1";
/** The spread a started strand is given: the framework's own, so only the centre moves. */
export const START_SD = 1.5;
/** The framework strand each part of Find my level speaks for. Sentences, writing and speaking have no part: they are left alone. */
export const STRAND: Record<Part, string> = { words: "EN.VOC", reading: "EN.RDG", listening: "EN.LIS", spelling: "EN.FND", grammar: "EN.GRM" };
/** The top of each part's own ladder. */
export const TOPS = (): Record<Part, number> => ({ words: 8, reading: COURSE.levels.length, listening: DICTATION.levels.length, spelling: Object.keys(LEVEL_NAMES).length, grammar: GRAMMAR.levels.length });

/** A level on a part's ladder (1 to `top`), carried in proportion to the framework's scale of 1 to 8. */
export const onFrameworkScale = (level: number, top: number): number => Math.min(8, Math.max(1, top <= 1 ? 1 : 1 + ((level - 1) * 7) / (top - 1)));

/** The starting centre for each strand whose part was measured; empty when none was. */
export function strandStarts(levels: Levels, tops: Record<Part, number> = TOPS()): Record<string, { mean: number; sd: number }> {
  const measured = (p: Part) => !levels.estimated?.includes(p);
  const at: Partial<Record<Part, number>> = {
    ...(levels.words && measured("words") ? { words: levels.words.band } : {}),
    ...(levels.reading && measured("reading") ? { reading: levels.reading.start } : {}),
    ...(levels.listening && measured("listening") ? { listening: levels.listening.level } : {}),
    ...(levels.spelling && measured("spelling") ? { spelling: levels.spelling.level } : {}),
    ...(levels.grammar && measured("grammar") ? { grammar: levels.grammar.level } : {}),
  };
  const out: Record<string, { mean: number; sd: number }> = {};
  for (const [part, level] of Object.entries(at) as [Part, number][]) out[STRAND[part]] = { mean: Math.round(onFrameworkScale(level, tops[part]) * 100) / 100, sd: START_SD };
  return out;
}

/**
 * The learner's events with the engine's starting point added straight after the last level-check record, for the
 * ledger only. Events before it are folded exactly as before; a learner who never measured a part gets none.
 */
export function withEngineStart<E extends AppEvent>(events: readonly E[]): (E | StartingPointEvent)[] {
  let last = -1;
  events.forEach((e, i) => {
    if (e.kind === "level_check") last = i;
  });
  if (last < 0) return [...events];
  const strands = strandStarts(levelsFrom(events.flatMap((e) => (e.kind === "level_check" ? [e.record] : []))));
  if (!Object.keys(strands).length) return [...events];
  const start: StartingPointEvent = { kind: "starting_point", id: `${events[last].id}-engine-start`, at: events[last].at, source: ENGINE_START, strands };
  return [...events.slice(0, last + 1), start, ...events.slice(last + 1)];
}
