/**
 * What to ask next. Placement, grammar, vocabulary and "more practice" use the engine's own selection
 * (`recommend`) on the hand-written bank, unchanged. The spelling module chooses generated words by
 * pattern (a separate scheduling layer: it decides what to practise, never how answers are scored).
 */
import { type EvidenceUse, type Goal, type Item, type LeafView, type Recommendation, type SelectionInput, fnv1a, leafView, recommend } from "../../../../packages/english-core/src/index.ts";
import { type AppContent, type Code, GUIDED, type Pool, lessonId } from "./content.ts";
import type { Planned, SelectionTrace } from "./events.ts";
import { misconceptionFindings } from "./misconceptions.ts";
import { selectionTrace } from "./trace.ts";
import { type AppState, type PatternStatus, type SessionState, dueWords, patternKey, patternStatus } from "./state.ts";

export const PLACEMENT_MIN = 12;
export const PLACEMENT_MAX = 24;
export const PLACEMENT_SD = 0.9;
export const GUIDED_LENGTH = 6;
/** Practice after a reading lesson: three questions, each on its own passage (reading takes longer than a sentence). */
export const READING_PRACTICE_LENGTH = 3;
export const EXPLORE_LENGTH = 10;
export const PRACTICE_LENGTH = 8;
export const REVIEW_MAX = 10;
export const TRANSFER_WORDS = 4;

export interface Next {
  item: Item;
  use: EvidenceUse;
  why: string;
  /** What the engine knew and weighed when it chose this item (recorded with the question when it is shown). */
  trace?: SelectionTrace;
}

const view = (s: AppState, c: AppContent, cap: string, now: string): LeafView => leafView(s.ledger.composite, c.index, cap, now);

/** What a question may be used for, by the reason it is asked. Questions without a pool may be used for anything. */
export type Use = "assess" | "practice" | "confirm" | "retention";
// Each pool serves one use only: practice (teaching and "more practice") never draws on diagnosis, so teaching cannot
// use up or give away the questions a first check needs (PR #25; before, practice could draw on diagnosis too).
const ALLOWED: Record<Use, Pool[]> = { assess: ["diagnosis"], practice: ["practice"], confirm: ["confirmation"], retention: ["retention"] };

/**
 * The hand-written questions this use may draw on. Three rules, all about selection (no scoring changes):
 *   pools        a pilot question reserved for one use is never taken for another
 *   passages     at most one question per reading passage in a session (two questions on one passage are not
 *                independent evidence), and never a passage the learner has already answered on for the same
 *                capability (under passage@1 that answer would be held, so asking it would waste the child's time)
 *   seen words   a fresh or later check never asks a spelling word the learner has already met in practice
 */
export function onlyFor(s: AppState, c: AppContent, use: Use, session?: SessionState): Set<string> {
  return eligibility(s, c, use, session).only;
}

/** onlyFor, with every excluded question and the rule that excluded it (for decision traces). */
export function eligibility(s: AppState, c: AppContent, use: Use, session?: SessionState): { only: Set<string>; excluded: Map<string, "reserved" | "passage" | "seen_word"> } {
  const allowed = ALLOWED[use];
  const used = new Set<string>();
  if (session) for (const a of session.attempts) {
    const i = c.ctx.content.items.get(a.item.id);
    if (i?.kind === "code" && i.passage) used.add(i.passage);
  }
  // passages the learner has already answered on, by capability: under passage@1 a second answer there would be held
  const answered = new Set<string>();
  for (const id of s.ledger.exposures.keys()) {
    const i = c.ctx.content.items.get(id);
    if (i?.kind === "code" && i.passage) answered.add(`${i.passage}#${i.target}`);
  }
  const out = new Set<string>();
  const excluded = new Map<string, "reserved" | "passage" | "seen_word">();
  for (const id of c.handWritten) {
    const pool = c.pilot.pools.get(id);
    if (pool && !allowed.includes(pool.pool)) {
      excluded.set(id, "reserved");
      continue;
    }
    const i = c.ctx.content.items.get(id);
    if (i?.kind === "code" && i.passage && (used.has(i.passage) || answered.has(`${i.passage}#${i.target}`))) {
      excluded.set(id, "passage");
      continue;
    }
    if ((use === "confirm" || use === "retention") && i?.kind === "code" && i.format.startsWith("typed") && i.answers?.[0] && s.wordsSeen.has(i.answers[0].toLowerCase())) {
      excluded.set(id, "seen_word");
      continue;
    }
    out.add(id);
  }
  return { only: out, excluded };
}

function input(s: AppState, c: AppContent, goal: Goal, now: string, mode: SelectionInput["mode"], only: Set<string> = onlyFor(s, c, "assess")): SelectionInput {
  const recent = [...s.sessions.values()]
    .flatMap((x) => x.answered)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 3)
    .map((a) => {
      const i = c.ctx.content.items.get(a.item.id);
      return { item: a.item.id, targets: i && i.kind !== "writing" ? [i.target] : [], format: i?.format ?? "" };
    });
  return {
    index: c.index,
    content: c.ctx.content,
    composite: s.ledger.composite,
    goal,
    now,
    seen: new Set(s.ledger.exposures.keys()),
    exposures: s.ledger.exposures,
    recent,
    writingThisSession: 0,
    writingAvailable: false,
    shortAvailable: false,
    only,
    mode,
    activityIndex: s.events.filter((e) => e.kind === "evidence").length,
  };
}

/** The engine says why it chose an activity; the evidence records it: retention check, assessment, or practice. */
export function useOf(r: Recommendation): EvidenceUse {
  if (r.schedule.reason === "retention_check" || r.path === "retention_check") return "retention";
  return r.mode === "assessment" ? "assessment" : "practice";
}

const nextFrom = (r: Recommendation, c: AppContent): Next | null => (r.choice ? { item: c.ctx.content.items.get(r.choice.item)!, use: useOf(r), why: r.explanation } : null);

/**
 * Ask the engine, exactly as before, and keep what it decided and why (the decision trace). The trace is a record
 * of the engine's own output; it never changes the choice.
 */
function decide(s: AppState, c: AppContent, goal: Goal, now: string, mode: SelectionInput["mode"], use: Use, session?: SessionState): Next | null {
  const elig = eligibility(s, c, use, session);
  const inp = input(s, c, goal, now, mode, elig.only);
  const r = recommend(inp);
  const next = nextFrom(r, c);
  if (next) next.trace = selectionTrace(s, c, inp, r, use, elig.excluded);
  return next;
}

export function meanGuidedSd(s: AppState, c: AppContent, now: string): number {
  const caps = [...GUIDED.spelling, ...GUIDED.grammar, ...GUIDED.vocabulary];
  return caps.reduce((t, cap) => t + view(s, c, cap, now).sd, 0) / caps.length;
}

/** Placement: the engine's assessment mode over the guided capabilities, hand-written items only. */
export function placementNext(s: AppState, c: AppContent, session: SessionState, now: string): Next | null {
  const n = session.answered.length;
  if (n >= PLACEMENT_MAX) return null;
  if (n >= PLACEMENT_MIN && meanGuidedSd(s, c, now) <= PLACEMENT_SD) return null;
  const next = decide(s, c, c.guidedGoal, now, "assessment", "assess", session);
  return next ? { ...next, use: "assessment" } : null;
}

export const focusGoal = (cap: string): Goal => ({ id: `focus:${cap}`, name: cap, weights: { [cap]: 1 } });

/** Grammar or vocabulary: the engine's hybrid scheduler on one capability (retention checks, probes and practice). */
export function guidedNext(s: AppState, c: AppContent, session: SessionState, now: string): Next | null {
  if (session.answered.length >= (session.event.length ?? GUIDED_LENGTH)) return null;
  return decide(s, c, focusGoal(session.event.capability!), now, "hybrid", "practice", session);
}

/**
 * A check on one capability (from the development plan): the engine's own selection, focused on that capability,
 * hand-written items only. "assess" uses assessment mode; "retention" uses the hybrid scheduler, which puts an
 * overdue retention check first. No teaching; every first answer is independent evidence as usual.
 */
export function checkNext(s: AppState, c: AppContent, session: SessionState, now: string): Next | null {
  if (session.answered.length >= (session.event.length ?? 4)) return null;
  const cap = session.event.capability;
  if (!cap) return null;
  const retention = session.event.purpose === "retention";
  const use: Use = retention ? "retention" : session.event.purpose === "confirm" ? "confirm" : "assess";
  const next = decide(s, c, focusGoal(cap), now, retention ? "hybrid" : "assessment", use, session);
  if (!next || next.item.kind !== "code" || next.item.target !== cap) return null; // only this capability
  return retention ? next : { ...next, use: "assessment" };
}

/** More practice: the engine's hybrid scheduler on every specified capability (no teaching). */
export function exploreNext(s: AppState, c: AppContent, session: SessionState, now: string): Next | null {
  if (session.answered.length >= (session.event.length ?? EXPLORE_LENGTH)) return null;
  return decide(s, c, c.overallGoal, now, "hybrid", "practice", session);
}

/** How many questions a lesson's practice asks: fewer for reading, where each question needs its own passage. */
export function guidedLength(c: AppContent, cap: string): number {
  const reading = [...(c.ctx.content.byCapability.get(cap) ?? [])].some((i) => i.kind === "code" && !!i.passage);
  return reading ? READING_PRACTICE_LENGTH : GUIDED_LENGTH;
}

/** The step a guided session's lesson teaches: the step of the first activity the engine would choose. */
export function guidedLesson(s: AppState, c: AppContent, cap: string, now: string): string | undefined {
  const r = recommend(input(s, c, focusGoal(cap), now, "hybrid", onlyFor(s, c, "practice")));
  const item = r.choice ? c.ctx.content.items.get(r.choice.item) : undefined;
  const step = item?.kind === "code" ? item.step : undefined;
  return step && c.lessons.has(lessonId(cap, step)) ? lessonId(cap, step) : undefined;
}

// ------------------------------------------------------------------ the spelling assessment (dictation)

/** The spelling capabilities that have dictation words. */
export const DICTATION_CAPS = ["EN.FND.SPL.inflections", "EN.FND.SPL.morphological"];

/**
 * Settings of the adaptive spelling assessment. The ±1 band window is an initial targeting hypothesis (to be
 * checked against real answers), not a law: when nothing is left inside it, the window widens to ±2 and says so.
 */
export const SPELLING_ASSESS = { min: 8, max: 14, stopSd: 0.6, window: 1, followUpWindow: 1.5, wideWindow: 2 };

const dictationWord = (i: Item) => (i.kind === "code" && i.answers?.[0] ? i.answers[0].toLowerCase() : "");

/**
 * Words the learner has already met: in dictation or generated practice, as the answer to a question already asked,
 * or written anywhere in a question shown or a lesson read (its prompt, options, passage or examples).
 */
function wordsMet(s: AppState, c: AppContent): Set<string> {
  const out = new Set(s.wordsSeen);
  const bank = dictationWords(c);
  const scan = (text: string | undefined) => {
    for (const w of (text ?? "").toLowerCase().match(/[a-z]+/g) ?? []) if (bank.has(w)) out.add(w);
  };
  for (const e of s.events) {
    if (e.kind === "presented") {
      const it = c.ctx.content.items.get(e.item.id);
      if (it?.kind === "code" && it.format !== "typed:dictation") {
        scan(it.prompt);
        scan(it.explain);
        // what its feedback can show: the lesson rule for its pattern, and the notes on its listed wrong answers
        if (it.step) scan(c.lessons.get(lessonId(it.target, it.step))?.rule);
        for (const tag of [...Object.values(it.wrong ?? {}), ...Object.values(it.distractor_tags ?? {})]) scan(c.feedback.get(`${it.target}#${tag}`));
        for (const o of it.options ?? []) scan(o);
        for (const l of it.left ?? []) scan(l);
        if (it.passage) scan(c.ctx.content.passages.get(it.passage)?.text);
      }
    } else if (e.kind === "lesson") scan(JSON.stringify(c.lessons.get(e.lesson) ?? ""));
  }
  for (const id of s.ledger.exposures.keys()) {
    const it = c.ctx.content.items.get(id);
    if (it?.kind === "code" && SPELLING_CAPS.has(it.target)) for (const a of it.answers ?? []) out.add(a.toLowerCase());
  }
  for (const a of s.events) if (a.kind === "attempt") {
    const it = c.ctx.content.items.get(a.item.id);
    if (it?.kind === "code" && it.answers) for (const w of it.answers) out.add(w.toLowerCase());
  }
  return out;
}
const SPELLING_CAPS = new Set<string>(GUIDED.spelling);
const dictationWordCache = new WeakMap<AppContent, Set<string>>();
function dictationWords(c: AppContent): Set<string> {
  let w = dictationWordCache.get(c);
  if (!w) dictationWordCache.set(c, (w = new Set(c.dictation.items.map((i) => dictationWord(i)))));
  return w;
}

export type SpellingAssessStop = "max" | "enough" | "insufficient";

export interface SpellingAssessChoice {
  next: Next | null;
  stop: SpellingAssessStop | null;
  /** Why the session stopped, in words (recorded with the session). */
  note?: string;
}

/**
 * The next dictation word, chosen after the last answer:
 *   1. a follow-up: after a wrong answer that matches a known rule error (a suspected misconception), a different
 *      word on the same pattern, to see whether the error recurs;
 *   2. otherwise words within ±1 band of the current estimate, patterns not yet tested in this session first;
 *   3. nothing within ±1: widen to ±2 (recorded); nothing at all: stop and report insufficient content.
 * Among what is left, the existing engine chooses (recommend: information at the current estimate), so every
 * answer changes the next choice through the Learner Vector. Words already met are never asked again.
 */
export function spellingAssessNext(s: AppState, c: AppContent, session: SessionState, now: string): SpellingAssessChoice {
  const S = SPELLING_ASSESS;
  const n = session.answered.length;
  const est = DICTATION_CAPS.map((cap) => ({ cap, v: view(s, c, cap, now) }));
  if (n >= S.max) return { next: null, stop: "max", note: `asked the maximum of ${S.max} words` };
  if (n >= S.min && est.every(({ v }) => v.sd <= S.stopSd)) return { next: null, stop: "enough", note: `both spelling estimates are within ±${S.stopSd} (one sd) after ${n} words` };
  const met = wordsMet(s, c);
  const pool = c.dictation.items.filter((i) => !s.ledger.exposures.has(i.id) && !met.has(dictationWord(i)));
  const excluded = new Map<string, "seen_word">(c.dictation.items.filter((i) => !pool.includes(i)).map((i) => [i.id, "seen_word"]));
  const theta = new Map(est.map(({ cap, v }) => [cap, v.mean]));
  const near = (i: Item, w: number) => i.kind === "code" && Math.abs(i.b - theta.get(i.target)!) <= w + 1e-9;
  const tested = new Set(session.answered.map((a) => c.ctx.content.items.get(a.item.id)).filter((i): i is Code => i?.kind === "code").map((i) => `${i.target}#${i.step}`));
  const testedPatterns = [...tested];
  // 1. follow-up on a suspected rule error from the last answer
  const last = session.answered.at(-1);
  const lastItem = last ? (c.ctx.content.items.get(last.item.id) as Code | undefined) : undefined;
  const tag = last && !last.correct ? last.misconceptions[0] : undefined;
  const followedUp = tag && session.answered.slice(0, -1).some((a) => a.misconceptions.includes(tag));
  let only: Code[] = [];
  let rule: NonNullable<SelectionTrace["spelling"]>["rule"] = "near_estimate";
  const reasons: string[] = [];
  let followUp: { misconception: string; after: string } | undefined;
  if (tag && lastItem && !followedUp && lastItem.format === "typed:dictation") {
    // best: words where the same error can happen (they list it); otherwise the same pattern, said honestly
    const nearby = pool.filter((i) => i.target === lastItem.target && near(i, S.followUpWindow));
    const sameError = nearby.filter((i) => Object.values(i.wrong ?? {}).includes(tag));
    const samePattern = nearby.filter((i) => i.step === lastItem.step);
    only = sameError.length ? sameError : samePattern;
    const what = tag.replace(/_/g, " ");
    if (only.length) {
      rule = "follow_up";
      followUp = { misconception: tag, after: dictationWord(lastItem) || lastItem.id };
      reasons.push(
        sameError.length
          ? `follow-up: "${followUp.after}" was misspelt in a way that suggests ${what}; a different word where the same error can happen checks whether it recurs (one error is only a suspicion)`
          : `follow-up: "${followUp.after}" was misspelt in a way that suggests ${what}; no unused word can show that error again, so a word on the same pattern instead (it cannot confirm or rule out ${what})`,
      );
    } else reasons.push(`no unused word within ±${S.followUpWindow} to follow up ${what}: it stays a suspicion`);
  }
  if (!only.length) {
    const inWindow = pool.filter((i) => near(i, S.window));
    const untested = inWindow.filter((i) => !tested.has(`${i.target}#${i.step}`));
    if (untested.length) {
      only = untested;
      rule = "untested_pattern";
      reasons.push(`within ±${S.window} band of the estimate; patterns not yet tested in this session first (coverage)`);
    } else if (inWindow.length) {
      only = inWindow;
      rule = "near_estimate";
      reasons.push(`within ±${S.window} band of the estimate; every pattern there has been tested once, so another word near the estimate`);
    } else {
      const wide = pool.filter((i) => near(i, S.wideWindow));
      if (wide.length) {
        only = wide;
        rule = "widened";
        reasons.push(`no unused word within ±${S.window} band of the estimate; widened to ±${S.wideWindow}`);
      }
    }
  }
  if (!only.length) return { next: null, stop: "insufficient", note: `no unused dictation word within ±${S.wideWindow} bands of the estimates (${est.map(({ cap, v }) => `${cap} ${v.mean.toFixed(2)}`).join(", ")}): more reviewed words are needed` };
  const caps = [...new Set(only.map((i) => i.target))];
  const goal: Goal = { id: "spelling-assessment", name: "Spelling", weights: Object.fromEntries(caps.map((cap) => [cap, 1])) };
  const inp = input(s, c, goal, now, "assessment", new Set(only.map((i) => i.id)));
  const r = recommend(inp);
  if (!r.choice) return { next: null, stop: "insufficient", note: "the engine found no question to ask among the eligible words" };
  const trace = selectionTrace(s, c, inp, r, "assess", excluded, c.dictation.items.map((i) => i.id));
  trace.spelling = { estimates: est.map(({ cap, v }) => ({ cap, mean: v.mean, sd: v.sd })).map(({ cap, mean, sd }) => ({ capability: cap, mean: Math.round(mean * 1000) / 1000, sd: Math.round(sd * 1000) / 1000 })), rule, reasons, window: rule === "widened" ? S.wideWindow : rule === "follow_up" ? S.followUpWindow : S.window, testedPatterns, ...(followUp ? { followUp } : {}) };
  return { next: { item: c.ctx.content.items.get(r.choice.item)!, use: "assessment", why: r.explanation, trace }, stop: null };
}

// ------------------------------------------------------------------ spelling

const TYPED = ["add_ending", "hear_spell", "meaning_first_letter"];

function generatedFor(c: AppContent, cap: string, step: string): Code[] {
  return c.generated.filter((g) => g.target === cap && g.step === step);
}

/** Items the learner can do here: dictation only where speech works on this device. */
const usable = (g: Code, speech: boolean) => speech || g.generated!.template !== "hear_spell";

/** Unseen words of a pattern, best first: typical difficulty for the step, then a fixed order. */
function unseenWords(s: AppState, c: AppContent, cap: string, step: string, speech: boolean, templates: string[]): Code[] {
  const band = c.ladders.get(cap)?.find((x) => x.id === step)?.band ?? 4;
  const byWord = new Map<string, Code[]>();
  for (const g of generatedFor(c, cap, step)) {
    const w = g.generated!.word;
    if (s.wordsSeen.has(w) || !usable(g, speech) || !templates.includes(g.generated!.template)) continue;
    byWord.set(w, [...(byWord.get(w) ?? []), g]);
  }
  return [...byWord.values()]
    .map((gs) => gs.sort((a, b) => templates.indexOf(a.generated!.template) - templates.indexOf(b.generated!.template))[0])
    .sort((a, b) => Math.abs(a.b - band) - Math.abs(b.b - band) || fnv1a(a.id).localeCompare(fnv1a(b.id)));
}

function unseenHandWritten(s: AppState, c: AppContent, cap: string, step: string, use: "assess" | "practice"): Code | undefined {
  // the spelling module's checks use diagnosis questions and its practice uses practice questions; never one
  // reserved for a confirming or later check. Questions outside the pilot have no pool and serve either.
  const want: Pool = use === "assess" ? "diagnosis" : "practice";
  const ok = (id: string) => {
    const pool = c.pilot.pools.get(id)?.pool;
    return pool === undefined || pool === want;
  };
  return [...(c.ctx.content.byCapability.get(cap) ?? [])].filter((i): i is Code => i.kind === "code" && !i.generated && c.handWritten.has(i.id) && i.step === step && !s.ledger.exposures.has(i.id) && ok(i.id)).sort((a, b) => a.b - b.b || a.id.localeCompare(b.id))[0];
}

/** Spelling patterns (capability and ladder step) that have generated words. */
export function spellingPatterns(c: AppContent): { cap: string; step: string; band: number }[] {
  return GUIDED.spelling.flatMap((cap) => (c.ladders.get(cap) ?? []).filter((st) => generatedFor(c, cap, st.id).length).map((st) => ({ cap, step: st.id, band: st.band })));
}

/** The spelling check: one unseen word for each pattern up to about two bands above the current estimate. */
export function spellingCheckQueue(s: AppState, c: AppContent, now: string, speech: boolean): Planned[] {
  const out: Planned[] = [];
  for (const p of spellingPatterns(c)) {
    const v = view(s, c, p.cap, now);
    if (p.band > v.mean + 2) continue;
    const templates = p.cap === "EN.FND.SPL.homophones" ? ["homophone_context", "meaning_first_letter"] : ["add_ending", "hear_spell", "meaning_first_letter"];
    const w = unseenWords(s, c, p.cap, p.step, speech, templates)[0];
    if (w) out.push({ item: w.id, use: "assessment" });
  }
  return out;
}

/** Practice on one pattern: unseen words in a mix of templates, plus one hand-written item for the step if one is left. */
export function spellingPracticeQueue(s: AppState, c: AppContent, cap: string, step: string, speech: boolean): Planned[] {
  const order = cap === "EN.FND.SPL.homophones" ? ["homophone_context", "meaning_first_letter"] : ["add_ending", "hear_spell", "choose_spelling", "meaning_first_letter", "add_ending", "hear_spell", "add_ending", "choose_spelling"];
  const used = new Set<string>();
  const out: Planned[] = [];
  for (let i = 0; out.length < PRACTICE_LENGTH && i < PRACTICE_LENGTH * 3; i++) {
    const want = order[i % order.length];
    const pick = unseenWords(s, c, cap, step, speech, [want, ...order.filter((t) => t !== want)]).find((g) => !used.has(g.generated!.word));
    if (!pick) break;
    used.add(pick.generated!.word);
    out.push({ item: pick.id, use: "practice" });
  }
  const hand = unseenHandWritten(s, c, cap, step, "practice");
  if (hand && out.length >= 3) out.splice(3, 0, { item: hand.id, use: "practice" });
  return out;
}

/** Review: words due in word memory, each through an item the learner has not done yet if there is one. */
export function spellingReviewQueue(s: AppState, c: AppContent, now: string, speech: boolean): Planned[] {
  const out: Planned[] = [];
  for (const w of dueWords(s, now).slice(0, REVIEW_MAX)) {
    const items = c.generated.filter((g) => g.generated!.word === w.word && usable(g, speech) && TYPED.includes(g.generated!.template));
    const ranked = items.sort((a, b) => Number(s.attempted.has(a.id)) - Number(s.attempted.has(b.id)) || TYPED.indexOf(a.generated!.template) - TYPED.indexOf(b.generated!.template));
    const choice = ranked[0] ?? c.generated.find((g) => g.generated!.word === w.word && usable(g, speech));
    if (choice) out.push({ item: choice.id, use: "retention" });
  }
  return out;
}

/** Transfer check: words the learner has never met, with a pattern they have practised; typed answers only. */
export function spellingTransferQueue(s: AppState, c: AppContent, cap: string, step: string, speech: boolean): Planned[] {
  const templates = cap === "EN.FND.SPL.homophones" ? ["homophone_context", "meaning_first_letter"] : ["hear_spell", "add_ending", "meaning_first_letter"];
  const words = unseenWords(s, c, cap, step, speech, templates).slice(0, TRANSFER_WORDS);
  const out: Planned[] = words.map((w) => ({ item: w.id, use: "assessment" as const }));
  const hand = unseenHandWritten(s, c, cap, step, "assess");
  if (hand) out.push({ item: hand.id, use: "assessment" });
  return out;
}

// ------------------------------------------------------------------ the spelling plan

/** Misconceptions the engine has seen, and the steps that teach them. */
const MISCONCEPTION_STEPS: Record<string, string[]> = {
  no_doubling: ["double_short", "stress_doubling"],
  kept_silent_e: ["drop_e"],
  y_not_changed: ["y_to_i"],
  over_doubling: ["no_double_unstressed"],
  dropped_double_at_join: ["double_at_join"],
  full_suffix: ["ful_ly_ment"],
  suffix_by_sound: ["able_ible", "tion_sion"],
  familiar_spelling: ["common_pairs"],
  contraction_possessive: ["there_their", "its_its"],
  near_homophone: ["near_homophones"],
};

export interface PatternPlan {
  cap: string;
  step: string;
  band: number;
  status: PatternStatus;
  priority: number;
  reasons: string[];
  wordsLeft: number;
}

/** Every spelling pattern with its status and why it comes where it does. Highest priority first. */
export function spellingPlan(s: AppState, c: AppContent, now: string, speech: boolean): PatternPlan[] {
  const out: PatternPlan[] = [];
  const findings = misconceptionFindings(s, c);
  for (const p of spellingPatterns(c)) {
    const v = view(s, c, p.cap, now);
    const rec = s.patterns.get(patternKey(p.cap, p.step));
    const status = patternStatus(rec);
    const reasons: string[] = [];
    let priority = 0;
    if (status === "secure") continue;
    const left = unseenWords(s, c, p.cap, p.step, speech, ["add_ending", "hear_spell", "choose_spelling", "meaning_first_letter", "homophone_context"]).length;
    if (!left) continue;
    if (status === "ready_for_check") {
      priority += 3;
      reasons.push("practised well: time to check it with new words");
    }
    if (status === "practising" || status === "check_again") {
      priority += 1.5;
      reasons.push(status === "check_again" ? "the last check with new words did not go well yet" : "already started");
    }
    // one error is a suspicion to probe, not a reason to teach; errors on separate words may lead to teaching
    const wrongInChecks = rec ? rec.check.total - rec.check.right : 0;
    if (wrongInChecks >= 2) {
      priority += 2;
      reasons.push(`${wrongInChecks} words with this pattern were misspelt in spelling checks`);
    } else if (wrongInChecks === 1) reasons.push("one error with this pattern in a check so far: a suspicion, so the next check looks again before any teaching");
    const linkedTo = (status: string) =>
      findings.filter((f) => f.capability === p.cap && f.status === status && (MISCONCEPTION_STEPS[f.misconception] ?? []).includes(p.step)).map((f) => f.misconception.replace(/_/g, " "));
    const supported = linkedTo("supported");
    if (supported.length) {
      priority += 1.5;
      reasons.push(`a pattern in mistakes on separate questions points here (${supported.join(", ")})`);
    }
    const suspected = linkedTo("suspected");
    if (suspected.length) reasons.push(`possibly ${suspected.join(", ")} (one error so far): to be probed, not yet taught`);
    if (rec && rec.check.total && rec.check.right === rec.check.total && status === "not_started") {
      priority -= 2;
      reasons.push("spelt correctly in the spelling check");
    }
    // stay near the current estimate: foundations first, stretch at most about one band
    const above = p.band - v.mean;
    if (above > 1.25) {
      priority -= 2 + above;
      reasons.push("harder than your current level");
    } else if (above < -2) priority -= 1;
    priority -= 0.1 * p.band;
    out.push({ cap: p.cap, step: p.step, band: p.band, status, priority, reasons, wordsLeft: left });
  }
  return out.sort((a, b) => b.priority - a.priority || a.band - b.band || a.cap.localeCompare(b.cap));
}

export { lessonId };
