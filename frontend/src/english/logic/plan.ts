/**
 * Today's plan: a short list of activities, each with the reason it is there.
 *
 *   1. placement, until it is done
 *   2. the spelling check (which patterns need work), once
 *   3. words due for review
 *   4. the next spelling pattern: lesson and practice, or a check with new words when it is ready
 *   5. one grammar or vocabulary capability, chosen by the engine's learning mode
 */
import { leafView, recommend } from "../../../../packages/english-core/src/index.ts";
import { type AppContent, GUIDED, lessonId } from "./content.ts";
import type { SessionType } from "./events.ts";
import { type AppState, dueWords, placementDone, sessionsOf } from "./state.ts";
import { type PatternPlan, spellingCheckQueue, spellingPlan } from "./select.ts";

export interface PlanStep {
  type: SessionType;
  title: string;
  reason: string;
  capability?: string;
  step?: string;
  lesson?: string;
  count?: number;
  /** The engine's own explanation, for a guardian who wants the detail. */
  detail?: string;
}

const STEP_TITLES: Record<string, string> = {
  plain: "Adding -s, -ed and -ing",
  es_plural: "Adding -es",
  double_short: "Doubling the last letter (short words)",
  drop_e: "Dropping the silent e",
  y_to_i: "Changing y to i",
  stress_doubling: "Doubling in longer words",
  no_double_unstressed: "When not to double",
  exceptions: "Tricky endings (-ll-, -ck-, ie to y)",
  plain_affix: "Adding prefixes and suffixes",
  double_at_join: "Double letters where parts join",
  ful_ly_ment: "-ful, -ly and -ment",
  able_ible: "-able or -ible",
  tion_sion: "-tion, -sion or -ssion",
  common_pairs: "Words that sound the same",
  less_common: "Less common sound-alike words",
};

export function patternTitle(c: AppContent, cap: string, step: string): string {
  return c.lessons.get(lessonId(cap, step))?.title ?? STEP_TITLES[step] ?? step.replace(/_/g, " ");
}

export function todayPlan(s: AppState, c: AppContent, now: string, speech: boolean): PlanStep[] {
  if (!placementDone(s))
    return [{ type: "placement", title: "Find your starting point", reason: "About 15–20 questions on spelling, grammar and vocabulary, so the plan starts in the right place. You can stop and carry on later." }];
  const steps: PlanStep[] = [];
  const checked = sessionsOf(s, "spelling_check").some((x) => x.end !== null);
  if (!checked && spellingCheckQueue(s, c, now, speech).length)
    return [{ type: "spelling_check", title: "Spelling check", reason: "One word for each spelling pattern near your level, to see which patterns to work on first." }];
  const due = dueWords(s, now);
  if (due.length) steps.push({ type: "spelling_review", title: `Review ${Math.min(due.length, 10)} word${due.length === 1 ? "" : "s"}`, reason: "Words you misspelt before, coming back after 1, 3, 7 and 14 days until you remember them.", count: due.length });
  const next = spellingPlan(s, c, now, speech)[0];
  if (next) steps.push(patternStep(c, next, s));
  const g = grammarOrVocabulary(s, c, now);
  if (g) steps.push(g);
  return steps;
}

function patternStep(c: AppContent, p: PatternPlan, s: AppState): PlanStep {
  const title = patternTitle(c, p.cap, p.step);
  if (p.status === "ready_for_check")
    return { type: "spelling_transfer", title: `Check: ${title}`, reason: "New words you have never seen, with the pattern you practised. This shows whether the rule, not just the words, has stuck.", capability: p.cap, step: p.step };
  const lesson = lessonId(p.cap, p.step);
  return {
    type: "spelling_practice",
    title: `Spelling: ${title}`,
    reason: `${p.reasons.length ? p.reasons[0][0].toUpperCase() + p.reasons[0].slice(1) : "Next on your spelling plan"}.${s.lessons.has(lesson) ? "" : " Starts with a short lesson."}`,
    capability: p.cap,
    step: p.step,
    lesson: c.lessons.has(lesson) ? lesson : undefined,
  };
}

/** The grammar or vocabulary capability the engine's learning mode ranks first. */
function guidedLessonFor(c: AppContent, item: ReturnType<AppContent["ctx"]["content"]["items"]["get"]>): string | undefined {
  if (!item || item.kind !== "code" || !item.step) return undefined;
  const id = lessonId(item.target, item.step);
  return c.lessons.has(id) ? id : undefined;
}

export function grammarOrVocabulary(s: AppState, c: AppContent, now: string): PlanStep | null {
  const caps = [...GUIDED.grammar, ...GUIDED.vocabulary];
  const goal = { id: "grammar+vocabulary", name: "Grammar and vocabulary", weights: Object.fromEntries(caps.map((x) => [x, 1])) };
  const r = recommend({
    index: c.index,
    content: c.ctx.content,
    composite: s.ledger.composite,
    goal,
    now,
    seen: new Set(s.ledger.exposures.keys()),
    exposures: s.ledger.exposures,
    recent: [],
    writingThisSession: 0,
    writingAvailable: false,
    only: c.handWritten,
    mode: "learning",
  });
  const cap = r.choice?.focus ?? r.choice?.targets[0];
  if (!cap) return null;
  const v = leafView(s.ledger.composite, c.index, cap, now);
  const area = (GUIDED.grammar as readonly string[]).includes(cap) ? "Grammar" : "Vocabulary";
  const lesson = guidedLessonFor(c, r.choice ? c.ctx.content.items.get(r.choice.item) : undefined);
  return {
    type: "guided",
    title: `${area}: ${v.name}`,
    reason: `${r.path === "assessment_fallback" ? "A few questions to find out more" : "The grammar or vocabulary area most likely to help you next"}, at about the right difficulty.${lesson && !s.lessons.has(lesson) ? " Starts with a short lesson." : ""}`,
    capability: cap,
    lesson,
    detail: r.explanation,
  };
}
