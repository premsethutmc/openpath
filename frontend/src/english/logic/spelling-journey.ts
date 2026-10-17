/**
 * The adaptive spelling journey: every inflection rule, one session at a time.
 *
 *   short check → diagnosis → teaching → guided practice → feedback → check on new words → saved progress
 *   (and, a week or more after a rule is shown, a delayed check)
 *
 * It reuses the core without changing it: the rule-evidence projection says what the learner has shown on each rule
 * (with provenance), and the planner (planRule) decides what to do on one rule. This file only chooses WHICH rule to
 * work on, picks unseen words for the planner's action, and never leaves the child at a dead end: where the planner
 * stops on a rule (no unused question left, or approaches that have not worked), the child gets a few practice words
 * with hints instead, and the rule stays unverified. Nothing here scores answers or keeps state of its own: the view
 * is rebuilt from the event log, so leaving and coming back days later resumes exactly.
 *
 * Words come from the spelling-journey bank (journey-words.json). Their roles are fixed by the pipeline: lesson
 * examples and practice words are never evidence; check words are held back and never shown in lessons or practice;
 * a word the learner has met anywhere (any question with that word, or a lesson example) is never used for a check.
 * Every check word is a provisional question: answers to it are rule-level demonstrations, never verified mastery.
 */
import {
  type EvidenceEvent,
  type AssistedResponseEvent,
  type HintEvent,
  type InterventionEvent,
  type PlannerDecision,
  type PlannerPolicy,
  type RuleState,
  PLANNER_POLICY_DRAFT,
  blockResults,
  countsAsVerified,
  englishInflections,
  leafView,
  planRule,
  projectRuleEvidence,
  ruleRecord,
  normaliseAnswer,
} from "../../../../packages/english-core/src/index.ts";
import type { AppContent, Code, JourneyWord, RuleJourney, StrategyContent } from "./content.ts";
import type { AttemptEvent, AppEvent } from "./events.ts";
import type { AppState, SessionState } from "./state.ts";

export const SPELLING_JOURNEY = "spelling_journey" as const;

/** Session shape (draft values, for review): how much one sitting asks, and how screening works. */
export const SPELLING_JOURNEY_POLICY = {
  version: "spelling-journey@1-draft",
  /** Answers (any kind) after which the session wraps up, once nothing is half-way through. */
  sessionAnswers: 20,
  /** Rules taught in one session at most (each teaching block is a lesson, practice and a check). */
  rulesTaughtPerSession: 2,
  /** A first look at a rule: this many questions on new words (an apply word, then a contrast if the rule has them). */
  screenItems: 2,
  /** Practice words offered where the planner stops on a rule (no question left, or approaches not working). */
  practiceRound: 3,
  /** A rule with no contrast words cannot reach "shown" under the evidence rules; after this many right answers on new words and none wrong, it is left for now. */
  clearWithoutContrast: 4,
} as const;

export type SpellingStep =
  | { kind: "question"; purpose: "screen" | "assessment" | "reassess" | "retention"; rule: string; item: Code; word: JourneyWord }
  | { kind: "teach"; rule: string; strategy: StrategyContent; refresher: boolean; examples: JourneyWord[] }
  | { kind: "guided"; rule: string; item: Code; word: JourneyWord; strategy: StrategyContent; intervention: string; attempts: AttemptEvent[]; hints: HintEvent[]; revealed: boolean }
  /** Practice with hints where the planner has stopped on a rule: never evidence. */
  | { kind: "practice"; rule: string; item: Code; word: JourneyWord; strategy: StrategyContent; attempts: AttemptEvent[]; hints: HintEvent[]; revealed: boolean; why: "content_gap" | "support" | "extra" }
  | { kind: "summary" };

export interface SpellingJourneyView {
  session: SessionState;
  rule: string | null;
  decision: PlannerDecision | null;
  step: SpellingStep;
  /** Answers given in this session, and roughly how many the session asks (for the progress bar). */
  progress: { done: number; total: number };
  /** Why this rule now, in plain words (for the parent view and tests; never shown to the child). */
  why: string;
}

type Pools = { apply: Code[]; contrast: Code[]; retention: Code[]; practice: Code[] };

const DAY = 86_400_000;

/**
 * The planner policy for one rule. A rule with no contrast words (plain endings, the tricky endings) cannot ask a
 * "must not change" question, so its check after teaching asks only new words where the rule applies.
 */
export function rulePolicy(rj: RuleJourney, policy: PlannerPolicy): PlannerPolicy {
  return rj.contrast.length ? policy : { ...policy, reassessContrastItems: 0, version: `${policy.version}+no-contrast` };
}

// ------------------------------------------------------------------ deterministic per-learner order

function fnv(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Easier first (by the bank's estimate, in half-band steps), then a fixed order per learner: two learners get different words. */
function ordered(c: AppContent, ids: string[], seed: string): Code[] {
  const items = ids.map((id) => c.ctx.content.items.get(id) as Code);
  return items.sort((a, b) => Math.floor(a.b * 2) - Math.floor(b.b * 2) || fnv(seed + a.id) - fnv(seed + b.id) || a.id.localeCompare(b.id));
}

// ------------------------------------------------------------------ what the learner has met

const wordOfItem = (c: AppContent, id: string): string | null => {
  const jw = c.spelling.words.get(id);
  if (jw) return jw.word;
  const i = c.ctx.content.items.get(id);
  if (!i || i.kind !== "code") return null;
  return (i.generated?.word ?? i.answers?.[0] ?? "").toLowerCase() || null;
};

/** Words taught as lesson examples in an intervention of this journey (content "spelling-journey:<rule>:<strategy>"). */
function taughtWords(c: AppContent, ivs: InterventionEvent[]): Set<string> {
  const out = new Set<string>();
  for (const iv of ivs) {
    const m = /^spelling-journey:([a-z_]+):/.exec(iv.content ?? "");
    if (m) for (const w of c.spelling.rules.get(m[1])?.teach ?? []) out.add(w.word);
  }
  return out;
}

/**
 * Every word the learner has met: any question shown or answered (any activity, any session), any hint, and the
 * example words of every lesson taught. A met word is never used for an independent check again.
 */
export function encounteredWords(s: AppState, c: AppContent): Set<string> {
  const out = new Set<string>(s.wordsSeen);
  for (const e of s.events) {
    if (e.kind === "presented" || e.kind === "attempt" || e.kind === "hint") {
      const w = wordOfItem(c, e.item.id);
      if (w) out.add(w);
    }
  }
  for (const id of s.ledger.exposures.keys()) {
    const w = wordOfItem(c, id);
    if (w) out.add(w);
  }
  for (const w of taughtWords(c, s.events.filter((e): e is InterventionEvent => e.kind === "intervention"))) out.add(w);
  return out;
}

// ------------------------------------------------------------------ the rule states

export function ruleStates(s: AppState, c: AppContent, now: string): Map<string, RuleState> {
  const l = s.ledger;
  const projection = projectRuleEvidence(l, c.ctx.content, englishInflections, (cap) => {
    const v = leafView(l.composite, c.index, cap, now);
    return { mean: v.mean, sd: v.sd, demonstrated: v.demonstrated, mastered: v.mastered, verification: v.verification.status };
  });
  return new Map(projection.capabilities[c.spelling.capability].rules.map((r) => [r.rule, r]));
}

function pools(s: AppState, c: AppContent, rj: RuleJourney, seed: string, met: Set<string>): Pools {
  const fresh = (ids: string[]) => ordered(c, ids, seed).filter((i) => !met.has(c.spelling.words.get(i.id)!.word));
  return {
    apply: fresh(rj.assess),
    contrast: fresh(rj.contrast),
    retention: fresh(rj.retention),
    // practice words may repeat a word met before (they are never evidence); unattempted ones first
    practice: ordered(c, rj.practice, seed).sort((a, b) => Number(s.attempted.has(a.id)) - Number(s.attempted.has(b.id))),
  };
}

const sessionEvents = (s: AppState, session: string) => s.events.filter((e) => "session" in e && (e as { session?: string }).session === session);

/** The rule a journey question or intervention belongs to. */
function ruleOfEvent(c: AppContent, e: AppEvent): string | null {
  if (e.kind === "intervention") return e.capability === c.spelling.capability && e.rule && /^spelling-journey:/.test(e.content ?? "") ? e.rule : null;
  if (e.kind === "presented" || e.kind === "attempt" || e.kind === "hint") return c.spelling.words.get(e.item.id)?.rule ?? null;
  return null;
}

// ------------------------------------------------------------------ one rule, now

interface RulePlan {
  rule: string;
  state: RuleState;
  decision: PlannerDecision;
  /** Screening: no teaching yet, fewer than screenItems answers on new words in this session, none wrong. */
  screening: boolean;
  screenPassed: boolean;
  touched: boolean;
  /** This rule's journey activity in this session. */
  answered: AttemptEvent[];
  practiceDone: number;
  block: InterventionEvent | undefined;
  unfinishedGuided: string | undefined;
  guidedLeft: Code[];
  pool: Pools;
  policy: PlannerPolicy;
}

function planFor(s: AppState, c: AppContent, session: SessionState, now: string, rule: string, state: RuleState, seed: string, met: Set<string>, base: PlannerPolicy): RulePlan {
  const rj = c.spelling.rules.get(rule)!;
  const policy = rulePolicy(rj, base);
  const sid = session.event.session;
  const pool = pools(s, c, rj, seed, met);
  const ivs = s.events.filter((e): e is InterventionEvent => e.kind === "intervention" && e.capability === c.spelling.capability && e.rule === rule && /^spelling-journey:/.test(e.content ?? ""));
  const block = ivs.at(-1);
  const since = block?.at ?? session.event.at;
  const hintsFor = (id: string) => s.events.filter((e): e is HintEvent => e.kind === "hint" && e.item.id === id && e.at >= since);
  const tries = (id: string) => s.events.filter((e): e is AttemptEvent => e.kind === "attempt" && e.item.id === id && e.at >= since);
  const finished = (id: string) => tries(id).some((a) => a.correct) || (tries(id).length > 0 && hintsFor(id).length >= policy.hintLevels && tries(id).length > hintsFor(id).length);
  // the current block's guided words: practice words presented for teaching after its intervention (in any session)
  const blockGuided: string[] = [];
  if (block)
    for (const e of s.events)
      if (e.kind === "presented" && e.intervention === block.id && rj.practice.includes(e.item.id) && !blockGuided.includes(e.item.id)) blockGuided.push(e.item.id);
  const unfinishedGuided = blockGuided.find((id) => !finished(id));
  const guidedDone = blockGuided.length - (unfinishedGuided ? 1 : 0);
  const guidedLeft = pool.practice.filter((i) => !blockGuided.includes(i.id) && !s.attempted.has(i.id));

  const mine = session.answered.filter((a) => c.spelling.words.get(a.item.id)?.rule === rule && a.use !== "practice");
  const evs = sessionEvents(s, sid);
  const touched = evs.some((e) => ruleOfEvent(c, e) === rule);
  // practice words (outside teaching) finished in this session: answered right, or answered after the last hint
  const practiceIds = new Set(evs.filter((e) => e.kind === "presented" && e.purpose === "practice" && !e.intervention && c.spelling.words.get(e.item.id)?.rule === rule).map((e) => (e as { item: { id: string } }).item.id));
  const practiceDone = [...practiceIds].filter((id) => {
    const a = session.attempts.filter((x) => x.item.id === id);
    const h = evs.filter((e) => e.kind === "hint" && e.item.id === id).length;
    return a.some((x) => x.correct) || (a.length > 0 && h >= policy.hintLevels && a.length > h);
  }).length;

  const { observations } = ruleRecord(s.ledger.events, s.ledger.decisions, c.ctx.content, englishInflections);
  const slips = observations.filter((o) => o.session === sid && o.rule === rule && o.track === "independent" && o.signature.kind === "slip").length;

  const retentionContext = state.retention.checks.some((k) => k.session === sid) || (state.status === "demonstrated" && !!state.lastEvidenceAt && (Date.parse(now) - Date.parse(state.lastEvidenceAt)) / DAY >= policy.retentionGapDays);
  const decision = planRule({
    rule: state,
    strategies: rj.strategies.map((x) => x.id),
    now,
    sessionStartedAt: session.event.at,
    session: sid,
    available: { apply: retentionContext ? pool.retention.length : pool.apply.length, contrast: pool.contrast.length, guided: guidedLeft.length + (unfinishedGuided ? 1 : 0) },
    answeredThisSession: mine.length,
    slipsThisSession: slips,
    guidedThisBlock: guidedDone,
    policy,
  });
  // screening: a first look, before any teaching, while every answer on new words in this session has been right
  const wrongHere = mine.some((a) => !a.correct);
  const never = ivs.length === 0;
  const screening = never && !wrongHere && decision.action === "assess" && mine.length < SPELLING_JOURNEY_POLICY.screenItems;
  const screenPassed = never && !wrongHere && mine.length >= SPELLING_JOURNEY_POLICY.screenItems && decision.action === "assess";
  return { rule, state, decision, screening, screenPassed, touched, answered: mine, practiceDone, block, unfinishedGuided, guidedLeft, pool, policy };
}

/** Has the child done all this rule asks of this session? */
function doneForSession(p: RulePlan, taughtHere: Set<string>): boolean {
  const a = p.decision.action;
  if (p.screenPassed) return true;
  if (a === "done") return true;
  if ((a === "content_gap" || a === "recommend_human") && p.practiceDone >= SPELLING_JOURNEY_POLICY.practiceRound) return true;
  if ((a === "content_gap" || a === "recommend_human") && p.pool.practice.length === 0) return true;
  if (a === "teach" && taughtHere.size >= SPELLING_JOURNEY_POLICY.rulesTaughtPerSession && !taughtHere.has(p.rule)) return true;
  return false;
}

/** Left alone for now: nothing due and nothing more to ask (shown, or right on every new word and no contrast to ask). */
function settled(p: RulePlan, rj: RuleJourney): boolean {
  if (p.decision.action === "done") return true;
  const noContrast = rj.contrast.length === 0;
  return noContrast && p.state.interventions.length === 0 && p.state.current.total >= SPELLING_JOURNEY_POLICY.clearWithoutContrast && p.state.current.right === p.state.current.total && p.decision.action === "assess";
}

// ------------------------------------------------------------------ the view

export function spellingJourneyView(s: AppState, c: AppContent, session: SessionState, now: string, seed: string, policy: PlannerPolicy = PLANNER_POLICY_DRAFT): SpellingJourneyView {
  const states = ruleStates(s, c, now);
  const met = encounteredWords(s, c);
  const sid = session.event.session;
  const evs = sessionEvents(s, sid);
  const plans = new Map(c.spelling.order.map((r) => [r, planFor(s, c, session, now, r, states.get(r)!, seed, met, policy)]));
  const taughtHere = new Set(evs.filter((e): e is InterventionEvent => e.kind === "intervention").map((e) => e.rule ?? "").filter(Boolean));
  const answeredHere = session.attempts.filter((a) => c.spelling.words.has(a.item.id));
  const firstTries = new Set(answeredHere.map((a) => a.item.id)).size;
  const progress = { done: firstTries, total: Math.max(SPELLING_JOURNEY_POLICY.sessionAnswers, firstTries + 1) };

  // the rule worked on last in this session, if it still has something to do
  const lastRule = [...evs].reverse().map((e) => ruleOfEvent(c, e)).find((r): r is string => !!r) ?? null;
  const inBlock = (p: RulePlan) => p.decision.action === "guided_practice" || p.decision.action === "reassess" || p.decision.action === "retention_check";
  const overBudget = firstTries >= SPELLING_JOURNEY_POLICY.sessionAnswers;

  let pick: RulePlan | undefined;
  let why = "";
  const current = lastRule ? plans.get(lastRule) : undefined;
  if (current && !doneForSession(current, taughtHere) && (!overBudget || inBlock(current))) {
    pick = current;
    why = "continuing the rule in progress";
  }
  if (!pick && !overBudget) {
    const open = [...plans.values()].filter((p) => !p.touched || !doneForSession(p, taughtHere));
    const candidates = open.filter((p) => !(p.touched && doneForSession(p, taughtHere)));
    // 1. a delayed check that is due; 2. a teaching block left half-way in an earlier session
    pick = candidates.find((p) => p.decision.action === "retention_check");
    if (pick) why = "a delayed check is due";
    if (!pick) {
      pick = candidates.find((p) => (p.decision.action === "guided_practice" || p.decision.action === "reassess") && !p.touched);
      if (pick) why = "finishing teaching started earlier";
    }
    // 3. the next rule in ladder order that has something to ask (a first look, more evidence, or teaching), not settled
    if (!pick) {
      pick = candidates.find((p) => !p.touched && !settled(p, c.spelling.rules.get(p.rule)!) && (p.decision.action === "assess" || p.decision.action === "teach") && !(p.decision.action === "teach" && taughtHere.size >= SPELLING_JOURNEY_POLICY.rulesTaughtPerSession));
      if (pick) why = pick.state.current.total === 0 ? "a first look at the next rule" : "more answers on new words";
    }
    // 4. a rule the planner has stopped on: practice instead of a dead end
    if (!pick) {
      pick = candidates.find((p) => !p.touched && (p.decision.action === "content_gap" || p.decision.action === "recommend_human") && p.pool.practice.length > 0);
      if (pick) why = "practice where no more checks are possible";
    }
  }
  if (!pick) return { session, rule: null, decision: null, step: { kind: "summary" }, progress: { done: firstTries, total: firstTries }, why: overBudget ? "session length reached" : "nothing more to ask today" };

  return { session, rule: pick.rule, decision: pick.decision, step: stepFor(s, c, pick, pick.policy), progress, why };
}

function strategyOf(rj: RuleJourney, id: string | undefined): StrategyContent {
  return rj.strategies.find((x) => x.id === id) ?? rj.strategies[0];
}

function stepFor(s: AppState, c: AppContent, p: RulePlan, policy: PlannerPolicy): SpellingStep {
  const rj = c.spelling.rules.get(p.rule)!;
  const d = p.decision;
  const word = (i: Code) => c.spelling.words.get(i.id)!;
  const helpFor = (id: string, since: string) => {
    const hints = s.events.filter((e): e is HintEvent => e.kind === "hint" && e.item.id === id && e.at >= since);
    const attempts = s.events.filter((e): e is AttemptEvent => e.kind === "attempt" && e.item.id === id && e.at >= since);
    return { hints, attempts, revealed: hints.some((h) => h.revealsAnswer === true) };
  };
  const question = (purpose: "screen" | "assessment" | "reassess" | "retention", item: Code | undefined): SpellingStep => (item ? { kind: "question", purpose, rule: p.rule, item, word: word(item) } : { kind: "summary" });
  switch (d.action) {
    case "assess": {
      // a first look: an apply word, then a contrast where the rule has them; afterwards the same alternation keeps both kinds checked
      const wantContrast = p.pool.contrast.length > 0 && p.answered.length % 2 === 1;
      const item = (wantContrast ? p.pool.contrast[0] : p.pool.apply[0]) ?? p.pool.apply[0] ?? p.pool.contrast[0];
      return question(p.screening ? "screen" : "assessment", item);
    }
    case "reassess":
      return question("reassess", d.itemRole === "contrast" ? p.pool.contrast[0] : p.pool.apply[0]);
    case "retention_check":
      return question("retention", p.pool.retention[0]);
    case "teach": {
      const strategy = strategyOf(rj, d.strategy);
      return { kind: "teach", rule: p.rule, strategy, refresher: d.diagnosis.kind === "retrieval_difficulty", examples: rj.teach.slice(0, 3) };
    }
    case "guided_practice": {
      const id = p.unfinishedGuided ?? p.guidedLeft[0]?.id;
      if (!p.block || !id) return { kind: "summary" };
      const item = c.ctx.content.items.get(id) as Code;
      return { kind: "guided", rule: p.rule, item, word: word(item), strategy: strategyOf(rj, d.strategy), intervention: p.block.id, ...helpFor(id, p.block.at), revealed: helpFor(id, p.block.at).revealed };
    }
    case "content_gap":
    case "recommend_human": {
      // practice instead of a dead end: words not yet finished in this round first
      const sid = p.answered[0]?.session;
      void sid;
      const unfinished = p.pool.practice.find((i) => {
        const h = helpFor(i.id, "");
        const presentedHere = s.events.some((e) => e.kind === "presented" && e.item.id === i.id && e.purpose === "practice" && !e.intervention && e.session === s.open?.event.session);
        return presentedHere && !(h.attempts.some((a) => a.correct) || (h.attempts.length > 0 && h.hints.length >= policy.hintLevels && h.attempts.length > h.hints.length));
      });
      const item = unfinished ?? p.pool.practice.find((i) => !s.attempted.has(i.id)) ?? p.pool.practice[0];
      if (!item) return { kind: "summary" };
      const since = s.open?.event.at ?? "";
      const h = helpFor(item.id, since);
      return { kind: "practice", rule: p.rule, item, word: word(item), strategy: strategyOf(rj, blockResults(p.state, policy).at(-1)?.intervention.strategy), ...h, why: d.action === "content_gap" ? "content_gap" : "support" };
    }
    default:
      return { kind: "summary" };
  }
}

// ------------------------------------------------------------------ hints and explanations

function fill(template: string, w: JourneyWord): string {
  const stem = w.base.endsWith("e") ? w.base.slice(0, -1) : w.base;
  return template
    .replaceAll("{base}", w.base)
    .replaceAll("{last}", w.base.at(-1) ?? "")
    .replaceAll("{ending}", w.ending === "s" && w.word.endsWith("es") && !w.base.endsWith("e") ? "-es" : `-${w.ending}`)
    .replaceAll("{word}", w.word)
    .replaceAll("{stem}", stem);
}

/** The hint at a level (1 = lightest). The last level is a worked example that shows the answer. */
export function spellingHint(strategy: StrategyContent, w: JourneyWord, level: number): string {
  return fill(strategy.hints[Math.min(level, strategy.hints.length) - 1] ?? "", w);
}

export interface Explanation {
  /** pattern: the answer is exactly the misspelling this rule predicts (named); slip: two letters swapped; neutral: wrong in another way (no cause named); unsure: the child said they did not know. */
  kind: "correct" | "pattern" | "slip" | "neutral" | "unsure";
  text: string;
  /** The tag behind a pattern explanation (for tests and the parent view). */
  tag?: string;
}

/** Marker for "I'm not sure": recorded as the typed answer so the record shows it, scored wrong, never a misconception. */
export const UNSURE = "?";

/**
 * What to tell the child about an answer. A misconception is named only when the answer is exactly the misspelling
 * the rule predicts for this word; anything else gets the right spelling and the word's parts, and names no cause, so
 * an uncertain or unusual answer is never given the wrong diagnosis.
 */
export function explainAnswer(c: AppContent, w: JourneyWord, typed: string, correct: boolean): Explanation {
  const rj = c.spelling.rules.get(w.rule)!;
  if (correct) return { kind: "correct", text: fill(`Yes! {base} + {ending} = {word}.`, w) };
  const t = normaliseAnswer(typed);
  if (!t || t === UNSURE) return { kind: "unsure", text: fill(c.spelling.text.unsure, w) + " " + fill("{base} + {ending} = {word}.", w) };
  const tag = w.wrong[t];
  if (tag && rj.mistakes[tag]) return { kind: "pattern", tag, text: fill(rj.mistakes[tag], w) };
  const swap = t.length === w.word.length && [...t].filter((ch, i) => ch !== w.word[i]).length === 2 && [...t].sort().join("") === [...w.word].sort().join("");
  if (swap) return { kind: "slip", text: fill(c.spelling.text.slip, w) };
  return { kind: "neutral", text: fill(c.spelling.text.neutral, w) + " " + fill("{base} + {ending} = {word}.", w) };
}

// ------------------------------------------------------------------ the learning vector

export interface RuleVector {
  rule: string;
  name: string;
  /** Observed evidence: independent answers on new words (apply, contrast), help, practice, and which content they rest on. */
  evidence: { right: number; total: number; contrastRight: number; contrastTotal: number; withHelp: number; practice: number; provisional: number; validated: number; candidate: number };
  /** Demonstrated understanding: the rule's status from independent answers on new words. */
  demonstrated: "not_yet" | "emerging" | "shown" | "shown_kept";
  /** Provisional progression: the child may move on (screened right, or shown on provisional questions). Never a mastery claim. */
  provisional: "not_started" | "screened_right" | "working_on" | "moved_on" | "paused";
  /** Verified mastery / eligibility: only from validated questions and a passed delayed check. With the journey's provisional questions this is always false. */
  verified: boolean;
  nextCheck: string | null;
}

export interface LearningVector {
  /** Estimated ability and uncertainty: the production model's capability estimate (composite@1), unchanged by the journey's provisional answers. */
  ability: { capability: string; mean: number; sd: number; band: string; source: "composite@1" };
  /** The research ability estimator (v0.5) is not integrated: off, and nothing reads it. */
  experimental: { enabled: false; note: string };
  rules: RuleVector[];
}

export function learningVector(s: AppState, c: AppContent, now: string, policy: PlannerPolicy = PLANNER_POLICY_DRAFT): LearningVector {
  const states = ruleStates(s, c, now);
  const v = leafView(s.ledger.composite, c.index, c.spelling.capability, now);
  const touched = new Set(s.events.map((e) => ruleOfEvent(c, e)).filter(Boolean) as string[]);
  return {
    ability: { capability: c.spelling.capability, mean: v.mean, sd: v.sd, band: `${(v.mean - 2 * v.sd).toFixed(1)}–${(v.mean + 2 * v.sd).toFixed(1)}`, source: "composite@1" },
    experimental: { enabled: false, note: "The v0.5 research estimator is not part of the app: it needs a parity-tested port and real-learner calibration first (openpath-research docs/INTEGRATION_V0.5.md)." },
    rules: c.spelling.order.map((rule) => {
      const r = states.get(rule)!;
      const rj = c.spelling.rules.get(rule)!;
      const blocks = blockResults(r, rulePolicy(rj, policy));
      const failed = blocks.filter((b) => b.complete && !b.passed).length;
      const demonstrated: RuleVector["demonstrated"] = r.status === "verified" ? "shown_kept" : r.status === "demonstrated" ? "shown" : r.status === "emerging" ? "emerging" : "not_yet";
      const wrong = r.current.total - r.current.right + (r.contrast.total - r.contrast.right);
      const provisional: RuleVector["provisional"] = !touched.has(rule)
        ? "not_started"
        : failed >= Math.min(policy.maxStrategiesBeforeHuman, rj.strategies.length)
          ? "paused"
          : r.status === "demonstrated" || r.status === "verified" || blocks.at(-1)?.passed
            ? "moved_on"
            : r.interventions.length === 0 && wrong === 0 && r.current.total > 0
              ? "screened_right"
              : "working_on";
      const nextCheck = r.status === "demonstrated" && r.lastEvidenceAt ? new Date(Date.parse(r.lastEvidenceAt) + policy.retentionGapDays * DAY).toISOString() : null;
      return {
        rule,
        name: rj.child,
        evidence: {
          right: r.current.right,
          total: r.current.total,
          contrastRight: r.contrast.right,
          contrastTotal: r.contrast.total,
          withHelp: r.assisted.total,
          practice: r.practice.total,
          provisional: r.evidenceBasis.provisional,
          validated: r.evidenceBasis.validated,
          candidate: r.evidenceBasis.candidate,
        },
        demonstrated,
        provisional,
        verified: countsAsVerified(r),
        nextCheck,
      };
    }),
  };
}

// ------------------------------------------------------------------ the parent summary

export interface SpellingJourneyReport {
  rules: { rule: string; name: string; skill: string; status: string; mistakes: string[]; help: string | null; nextCheck: string | null }[];
  provisional: string;
}

const PARENT_STATUS: Record<RuleVector["provisional"], string> = {
  not_started: "Not started yet.",
  screened_right: "Right on every new word so far (a first look, not a mastery check).",
  working_on: "Working on it.",
  moved_on: "Right on new words without help. Progress, not mastery: a check after a week is part of the plan.",
  paused: "The approaches tried have not worked yet. The app gives practice with hints; a teacher or parent may help.",
};

const TAG_TEXT: Record<string, string> = {
  no_doubling: "not doubling the last letter",
  over_doubling: "doubling where it should not",
  kept_silent_e: "keeping the silent e",
  y_not_changed: "not changing y to i",
};

export function spellingJourneyReport(s: AppState, c: AppContent, now: string): SpellingJourneyReport {
  const vec = learningVector(s, c, now);
  const states = ruleStates(s, c, now);
  return {
    rules: vec.rules.map((rv) => {
      const r = states.get(rv.rule)!;
      const rj = c.spelling.rules.get(rv.rule)!;
      const mistakes = r.misconceptions.filter((m) => m.state === "active" || m.state === "improving").map((m) => `${TAG_TEXT[m.tag] ?? m.tag.replace(/_/g, " ")} (${m.errors.length} times, on different words, without help)`);
      const status = rv.provisional === "moved_on" && rv.demonstrated === "shown" ? `${PARENT_STATUS.moved_on}${rv.nextCheck ? ` Next check from ${rv.nextCheck.slice(0, 10)}.` : ""}` : PARENT_STATUS[rv.provisional];
      return { rule: rv.rule, name: rv.name, skill: rj.skill, status, mistakes, help: rv.provisional === "paused" ? "Optional: work through a few words together." : null, nextCheck: rv.nextCheck };
    }),
    provisional: "The words, lessons and hints are provisional: generated by rule from licensed word lists, not yet reviewed by an educator. This is a record of what happened, not a mastery certificate.",
  };
}

/** Responses typed by the child in a session, by item (for tests and the parent view). */
export function typedAnswers(s: AppState): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const e of s.ledger.events) {
    if (e.kind !== "evidence" && e.kind !== "assisted_response") continue;
    const ev = e as EvidenceEvent | AssistedResponseEvent;
    if (ev.response.kind !== "typed") continue;
    out.set(ev.item.id, [...(out.get(ev.item.id) ?? []), ev.response.text]);
  }
  return out;
}
