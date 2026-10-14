/**
 * The adaptive consonant-doubling journey (MVP vertical slice).
 *
 * Every decision comes from the core: the rule-level evidence projection (what the learner has shown, with
 * provenance) and the planner (what to do next). This file only turns the planner's action into a screen
 * step, picks unseen content for it, and writes the parent summary. Nothing here scores answers or keeps a
 * learner model of its own: the state is rebuilt from the event log, so replaying it gives the same journey.
 */
import {
  INFLECTION_STRATEGIES,
  type HintEvent,
  type InterventionEvent,
  type PlannerDecision,
  type PlannerPolicy,
  PLANNER_POLICY_DRAFT,
  type RuleState,
  blockResults,
  englishInflections,
  leafView,
  planRule,
  projectRuleEvidence,
  ruleRecord,
  type EvidenceEvent,
  type AssistedResponseEvent,
} from "../../../../packages/english-core/src/index.ts";
import type { AppContent, Code, StrategyContent } from "./content.ts";
import type { AttemptEvent } from "./events.ts";
import type { AppState, SessionState } from "./state.ts";

export type JourneyStep =
  | { kind: "question"; purpose: "assessment" | "reassess" | "retention"; item: Code }
  | { kind: "teach"; strategy: StrategyContent; refresher: boolean }
  /** revealed: a worked example has shown this word's answer. afterReveal: the previous practice word's answer was shown, so this new word is tried without a hint first. */
  | { kind: "guided"; item: Code; strategy: StrategyContent; intervention: string; attempts: AttemptEvent[]; hints: HintEvent[]; revealed: boolean; afterReveal: boolean }
  | { kind: "summary" };

export interface JourneyView {
  session: SessionState;
  rule: RuleState;
  decision: PlannerDecision;
  step: JourneyStep;
}

export function doublingRule(s: AppState, c: AppContent, now: string): RuleState {
  const l = s.ledger;
  const projection = projectRuleEvidence(l, c.ctx.content, englishInflections, (cap) => {
    const v = leafView(l.composite, c.index, cap, now);
    return { mean: v.mean, sd: v.sd, demonstrated: v.demonstrated, mastered: v.mastered, verification: v.verification.status };
  });
  return projection.capabilities[c.journey.capability].rules.find((r) => r.rule === c.journey.rule)!;
}

const code = (c: AppContent, id: string) => c.ctx.content.items.get(id) as Code;
const isContrast = (i: Code) => englishInflections.roleOf(i) === "contrast";

/** Teaching interventions on the journey's rule, in any session, oldest first. */
function ruleInterventions(s: AppState, c: AppContent): InterventionEvent[] {
  return s.events.filter((e): e is InterventionEvent => e.kind === "intervention" && e.capability === c.journey.capability && e.rule === c.journey.rule);
}

/** Assisted attempts at an item since a time, in any session (a block can continue after leaving and returning). */
function guidedAttempts(s: AppState, item: string, since: string): AttemptEvent[] {
  return s.events.filter((e): e is AttemptEvent => e.kind === "attempt" && e.assisted && e.item.id === item && e.at >= since);
}

/** A guided item is finished when answered right, or answered after the last hint level. */
function guidedFinished(attempts: AttemptEvent[], hints: number, policy: PlannerPolicy): boolean {
  return attempts.some((a) => a.correct) || (attempts.length > 0 && hints >= policy.hintLevels && attempts.length > hints);
}

/** Journey questions not yet seen: not this item, and no item with the same word (journey copies of bank items share words with them). */
function unseenQuestions(s: AppState, c: AppContent): Code[] {
  const wordOf = (id: string) => {
    const i = c.ctx.content.items.get(id);
    return i?.kind === "code" ? (i.generated?.word ?? i.answers?.[0] ?? id) : id;
  };
  const answeredWords = new Set([...s.ledger.exposures.keys()].map(wordOf));
  const seen = (id: string) => s.ledger.exposures.has(id) || answeredWords.has(wordOf(id));
  return c.journey.assessOrder.filter((id) => !seen(id)).map((id) => code(c, id));
}

export function journeyView(s: AppState, c: AppContent, session: SessionState, now: string, policy: PlannerPolicy = PLANNER_POLICY_DRAFT): JourneyView {
  const rule = doublingRule(s, c, now);
  const unseen = unseenQuestions(s, c);
  const block = ruleInterventions(s, c).at(-1);
  const since = block?.at ?? session.event.at;
  const hintsFor = (item: string) => s.events.filter((e): e is HintEvent => e.kind === "hint" && e.item.id === item && e.at >= since);
  // guided items of the current block: those attempted after its intervention, in this or an earlier session
  const blockGuided: string[] = [];
  for (const e of s.events) if (block && e.kind === "attempt" && e.assisted && e.at >= block.at && c.journey.guided.includes(e.item.id) && !blockGuided.includes(e.item.id)) blockGuided.push(e.item.id);
  const unfinished = blockGuided.find((id) => !guidedFinished(guidedAttempts(s, id, since), hintsFor(id).length, policy));
  const finishedCount = blockGuided.length - (unfinished ? 1 : 0);
  const guidedLeft = c.journey.guided.filter((id) => !s.attempted.has(id));

  // recognised slips in this session's independent answers: not evidence about the rule, so they do not use up the diagnostic budget
  const { observations } = ruleRecord(s.ledger.events, s.ledger.decisions, c.ctx.content, englishInflections);
  const slipsThisSession = observations.filter((o) => o.session === session.event.session && o.rule === c.journey.rule && o.track === "independent" && o.signature.kind === "slip").length;

  const decision = planRule({
    rule,
    strategies: INFLECTION_STRATEGIES[c.journey.rule] ?? [],
    now,
    sessionStartedAt: session.event.at,
    session: session.event.session,
    available: { apply: unseen.filter((i) => !isContrast(i)).length, contrast: unseen.filter(isContrast).length, guided: guidedLeft.length + (unfinished ? 1 : 0) },
    answeredThisSession: session.answered.length,
    slipsThisSession,
    guidedThisBlock: finishedCount,
    policy,
  });

  const strategy = (id?: string) => c.journey.strategies.find((x) => x.id === id) ?? c.journey.strategies[0];
  let step: JourneyStep = { kind: "summary" };
  switch (decision.action) {
    case "assess":
      step = unseen[0] ? { kind: "question", purpose: "assessment", item: unseen[0] } : { kind: "summary" };
      break;
    case "reassess":
    case "retention_check": {
      const wantContrast = decision.action === "reassess" && decision.itemRole === "contrast";
      const item = unseen.find((i) => isContrast(i) === wantContrast);
      step = item ? { kind: "question", purpose: decision.action === "reassess" ? "reassess" : "retention", item } : { kind: "summary" };
      break;
    }
    case "teach":
      step = { kind: "teach", strategy: strategy(decision.strategy), refresher: decision.diagnosis.kind === "retrieval_difficulty" };
      break;
    case "guided_practice": {
      const id = unfinished ?? guidedLeft[0];
      if (!block || !id) {
        step = { kind: "summary" }; // cannot happen with the planner's checks; never crash
        break;
      }
      const hints = hintsFor(id);
      const previous = blockGuided.filter((x) => x !== id).at(-1);
      step = { kind: "guided", item: code(c, id), strategy: strategy(decision.strategy), intervention: block.id, attempts: guidedAttempts(s, id, since), hints, revealed: hints.some(revealsAnswer), afterReveal: !!previous && hintsFor(previous).some(revealsAnswer) };
      break;
    }
    default:
      step = { kind: "summary" };
  }
  return { session, rule, decision, step };
}

/** Did this hint show the answer? The last hint level of every strategy is a worked example. */
export const revealsAnswer = (h: HintEvent) => h.revealsAnswer === true;

/** The hint text for a guided item at a level, from the strategy's template. The last level is a worked example that shows the answer. */
export function hintText(strategy: StrategyContent, item: Code, level: number): string {
  const g = item.generated;
  const base = g?.base ?? "";
  const ending = (g?.join ?? "").replace(/^-/, "");
  const t = strategy.hints[Math.min(level, strategy.hints.length) - 1] ?? "";
  return t.replaceAll("{base}", base).replaceAll("{last}", base.at(-1) ?? "").replaceAll("{ending}", ending).replaceAll("{word}", g?.word ?? item.answers?.[0] ?? "");
}

// ------------------------------------------------------------------ the parent summary

export interface ReportLine {
  kind: "pattern" | "independent" | "assisted" | "unknown" | "slip";
  text: string;
  /** Ids of the ledger events the line rests on. */
  evidence: string[];
}

export interface ParentReport {
  skill: string;
  started: boolean;
  /**
   * What the learner found hard. Every line names how the answers were given (from their provenance) and the
   * ledger events behind it: independent first answers, answers with help (hints, retries, guided practice),
   * answers recorded before provenance existed (help unknown), or a pattern across independent answers.
   */
  difficulty: ReportLine[];
  /** workedExamples: practice words whose answer was shown in a worked example (the last hint level). */
  assistance: { hints: number; workedExamples: number; guidedAnswers: number; rightFirstTry: number; rightWithHelp: number; strategies: string[] };
  /**
   * For each teaching approach: independent answers after it on new words where the rule applies (right/total) and
   * on contrasts where it must not be applied. worked: the reassessment was finished and passed (both kinds right).
   */
  afterTeaching: { strategy: string; right: number; total: number; contrastRight: number; contrastTotal: number; finished: boolean; worked: boolean }[];
  /** The check after the last lesson could not be finished because no unseen question of the kind needed is left. */
  questionGap: string | null;
  differentStrategyNeeded: boolean;
  /** not_shown: nothing to retain yet; pending: shown, delayed check not yet taken (due from `retentionDue`). */
  retention: "not_shown" | "pending" | "confirmed" | "failed";
  retentionDue: string | null;
  /** One line on where things stand, in plain words. */
  status: string;
  support: string | null;
  provisional: string;
}

const STATUS: Record<RuleState["status"], string> = {
  insufficient_evidence: "Not enough answers yet to say.",
  inconsistent: "Mixed results so far: right and wrong in different ways.",
  weak: "Not yet doing this without help.",
  emerging: "Getting there: some right on new words without help, not yet consistently.",
  demonstrated: "Shown without help on new words today. Not yet checked after a delay.",
  verified: "Shown without help, and still right after at least a week.",
  needs_reconfirmation: "Was shown earlier, but not remembered after a week. Needs refreshing.",
};

export function parentReport(s: AppState, c: AppContent, now: string, policy: PlannerPolicy = PLANNER_POLICY_DRAFT): ParentReport {
  const rule = doublingRule(s, c, now);
  const journeySessions = [...s.sessions.values()].filter((x) => x.event.type === "doubling_journey");
  const name = (id: string) => c.journey.strategies.find((x) => x.id === id)?.name ?? id.replace(/_/g, " ");
  const difficulty = difficultyLines(s, c, rule);
  const ivs = rule.interventions;
  const retention: ParentReport["retention"] = rule.retention.state === "confirmed" ? "confirmed" : rule.retention.state === "failed" ? "failed" : rule.history.firstDemonstratedAt ? "pending" : "not_shown";
  const retentionDue = retention === "pending" && rule.lastEvidenceAt ? new Date(Date.parse(rule.lastEvidenceAt) + policy.retentionGapDays * 86_400_000).toISOString() : null;
  const blocks = blockResults(rule, policy);
  const failed = blocks.filter((b) => b.complete && !b.passed).length;
  const helpOnly = ivs.some((iv) => iv.during.rightWithHelp > 0 && iv.during.rightFirstTry === 0) && !ivs.some((iv) => iv.independentAfter.newWordRight > 0);
  const overDoubling = rule.misconceptions.some((m) => m.tag === "over_doubling" && (m.state === "active" || m.state === "improving")) && rule.current.total > 0 && rule.current.right === rule.current.total;
  let status = STATUS[rule.status];
  if (rule.status === "weak" && helpOnly) status = "Right with help in practice, not yet without help.";
  if (overDoubling && rule.status !== "demonstrated" && rule.status !== "verified") status = "Doubles correctly where it is needed, but also doubles where it should not. Not yet shown without help.";
  if (rule.status !== "demonstrated" && rule.status !== "verified" && blocks.at(-1)?.passed)
    status = "Right on new words without help after teaching, including a word that must not double. Progress, not yet mastery: more answers and a check after a week are needed.";
  // an unfinished check after the last lesson with nothing left to ask: a gap in the questions, not a result about the learner
  const last = blocks.at(-1);
  let questionGap: string | null = null;
  if (last && !last.complete && failed < policy.maxStrategiesBeforeHuman) {
    const unseen = unseenQuestions(s, c);
    const a = last.intervention.independentAfter;
    const needApply = a.newWordTotal < policy.reassessItems && !unseen.some((i) => !isContrast(i));
    const needContrast = a.contrastTotal < policy.reassessContrastItems && !unseen.some(isContrast);
    if (needApply || needContrast)
      questionGap = `The check after the last lesson could not be finished: no unused ${needContrast ? "'must not double' " : ""}question is left. This is a gap in the app's questions, not a result about the learner; more reviewed questions are needed.`;
  }
  if ((rule.status === "demonstrated" || rule.status === "verified") && rule.evidenceBasis.provisional > 0) status += " (on provisional questions: a demonstration, not a verified result)";
  const firstShown = rule.history.firstDemonstratedAt;
  if (rule.status === "needs_reconfirmation" && firstShown) status = `First shown on ${firstShown.slice(0, 10)}; not remembered at the check after a week. Needs refreshing.`;
  return {
    skill: "Doubling the last consonant before an ending (hop → hopping, stop → stopped, big → bigger)",
    started: journeySessions.length > 0,
    difficulty,
    assistance: {
      hints: rule.assisted.hints,
      workedExamples: s.events.filter((e): e is HintEvent => e.kind === "hint" && revealsAnswer(e) && c.journey.guided.includes(e.item.id)).length,
      guidedAnswers: ivs.reduce((t, iv) => t + iv.during.items, 0),
      rightFirstTry: ivs.reduce((t, iv) => t + iv.during.rightFirstTry, 0),
      rightWithHelp: ivs.reduce((t, iv) => t + iv.during.rightWithHelp, 0),
      strategies: ivs.map((iv) => name(iv.strategy)),
    },
    afterTeaching: blocks.map((b) => {
      const a = b.intervention.independentAfter;
      return { strategy: name(b.intervention.strategy), right: a.newWordRight, total: a.newWordTotal, contrastRight: a.contrastRight, contrastTotal: a.contrastTotal, finished: b.complete, worked: b.passed };
    }),
    questionGap,
    differentStrategyNeeded: ivs.length > 1,
    retention,
    retentionDue,
    status,
    support: failed >= policy.maxStrategiesBeforeHuman ? `${failed} different approaches have not yet worked. We recommend a teacher or parent works on this with them; the app has paused this rule rather than repeating it.` : null,
    provisional: "The questions, lessons and hints in this journey are provisional: not yet reviewed by an educator. This is a record of what happened, not a mastery certificate.",
  };
}

const PATTERN: Record<string, string> = { no_doubling: "not doubling the last letter", over_doubling: "doubling where it should not" };

/** Difficulty lines, each from the rule-level observations (provenance tracks) and the ledger events behind them. */
function difficultyLines(s: AppState, c: AppContent, rule: RuleState): ReportLine[] {
  const { observations } = ruleRecord(s.ledger.events, s.ledger.decisions, c.ctx.content, englishInflections);
  const obs = observations.filter((o) => o.capability === c.journey.capability && o.rule === c.journey.rule);
  const byId = new Map(s.ledger.events.filter((e): e is EvidenceEvent | AssistedResponseEvent => e.kind === "evidence" || e.kind === "assisted_response").map((e) => [e.id, e]));
  const typed = (id: string) => {
    const r = byId.get(id)?.response;
    return r?.kind === "typed" ? r.text : "";
  };
  const want = (item: string) => (c.ctx.content.items.get(item) as Code | undefined)?.answers?.[0] ?? "";
  const lines: ReportLine[] = [];
  for (const m of rule.misconceptions.filter((x) => x.state === "active" || x.state === "improving"))
    lines.push({ kind: "pattern", text: `Pattern in answers given without help: ${PATTERN[m.tag] ?? m.tag.replace(/_/g, " ")} (${m.errors.length} times, on different words).`, evidence: [...m.errors] });
  for (const o of obs.filter((x) => !x.correct && (x.track === "independent" || x.track === "unknown")))
    lines.push(
      o.signature.kind === "slip"
        ? { kind: "slip", text: `Wrote "${typed(o.evidence)}" for "${want(o.item)}": letters swapped, the rule itself was applied.`, evidence: [o.evidence] }
        : o.track === "independent"
          ? { kind: "independent", text: `Wrote "${typed(o.evidence)}" for "${want(o.item)}", on their own (no hint, first try).`, evidence: [o.evidence] }
          : { kind: "unknown", text: `Wrote "${typed(o.evidence)}" for "${want(o.item)}" (recorded before help was tracked: whether help was given is unknown).`, evidence: [o.evidence] },
    );
  // assisted: one line per word, from the first wrong try to how it ended
  const assisted = obs.filter((x) => x.track === "assisted");
  for (const item of [...new Set(assisted.map((x) => x.item))]) {
    const tries = assisted.filter((x) => x.item === item);
    const firstWrong = tries.find((x) => !x.correct);
    if (!firstWrong) continue;
    const right = tries.find((x) => x.correct);
    const hints = Math.max(0, ...tries.map((x) => x.hints));
    const sessions = new Set(tries.map((x) => x.session));
    const revealed = s.events.some((e) => e.kind === "hint" && e.item.id === item && sessions.has(e.session) && revealsAnswer(e));
    const end = revealed
      ? right
        ? "right only after a worked example showed the answer"
        : "not right, even after a worked example showed the answer"
      : right
        ? hints
          ? `right after ${hints} hint${hints > 1 ? "s" : ""}`
          : "right at a later try"
        : "not right, even with help";
    lines.push({ kind: "assisted", text: `With help (practice): wrote "${typed(firstWrong.evidence)}" for "${want(item)}", then ${end}.`, evidence: tries.map((x) => x.evidence) });
  }
  return lines;
}
