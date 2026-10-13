/**
 * Rule-level evidence: a read-only projection of the ledger (first increment of the learner-vector proposal).
 *
 * The capability estimate (composite@1) stays the only numerical estimate and is never touched here. This
 * file reads the ledger's evidence events and the decisions the updater already made, and derives, for each
 * rule (subskill) of a capability:
 *
 *   - what the learner has shown on their own, on words they had not met before, kept apart from practice
 *     on unreviewed items, repeats and slips;
 *   - a status that separates insufficient evidence, weakness, emerging understanding, demonstrated
 *     independent application, and verified (retention-confirmed) mastery, with current retention reported
 *     separately from history;
 *   - one misconception record per rule and tag, changed only by that rule's own evidence, with its history;
 *   - a claim guard: whether the engine's capability-level "mastered" label is backed by verified rules.
 *
 * Nothing here is subject-specific: the subject module (for example ./subject-english-inflections.ts) says
 * which rules a capability has, which rule an item tests, whether it is a contrast item, which word it uses,
 * and how a wrong answer is classified. Every threshold is in a versioned policy object; the values in
 * RULE_EVIDENCE_POLICY_DRAFT are a proposal for review, not approved mastery thresholds.
 *
 * Deterministic: the same events, decisions, content and policy always give the same projection.
 */
import { type ContentIndex, itemVersion } from "./content.ts";
import type { CapabilityId, Decision, EvidenceEvent, Item, LedgerEvent, Response } from "./types.ts";

// ---------------------------------------------------------------- what a subject module supplies

export interface RuleDef {
  id: string;
  capability: CapabilityId;
  name: string;
  /** The lowest band whose descriptor requires this rule. */
  requiredFromBand: number;
  /** Misconception tags that belong to this rule. */
  misconceptions: string[];
}

export type Signature =
  | { kind: "correct" }
  /** A listed error that points to a misconception of this rule. */
  | { kind: "misconception"; tag: string }
  /** The rule was applied; the error is elsewhere (for example two letters swapped). Not evidence about the rule. */
  | { kind: "slip" }
  /** Wrong, with no known cause. Counts against the rule, never as a misconception. */
  | { kind: "unclassified"; form: string };

export interface SubjectRules {
  /** Versioned id of the module, recorded with every projection. */
  id: string;
  capabilities(): CapabilityId[];
  rules(capability: CapabilityId): RuleDef[];
  /** The rule an item tests, or null if it is not rule evidence. */
  ruleOf(item: Item): string | null;
  /** "apply": the rule should be applied; "contrast": a word where it must not be. */
  roleOf(item: Item): "apply" | "contrast";
  /** The word the item asks for, to tell words the learner has met from new ones. */
  wordOf(item: Item): string | null;
  classify(item: Item, response: Response, correct: boolean): Signature;
}

// ---------------------------------------------------------------- policy (draft, for review)

export interface RuleEvidencePolicy {
  version: string;
  /** Independent applications on new words needed before any status other than "insufficient evidence". */
  minApplications: number;
  /** Most recent independent new-word applications used for the current status (older ones stay in history). */
  window: number;
  /** Weak: at least this probability that the true rate of correct application is below weakRate. */
  weakProbability: number;
  weakRate: number;
  /** Demonstrated: at least this many new-word applications in the window, and the lower quantile of the rate at least the bound. */
  demonstratedMinApplications: number;
  demonstratedQuantile: number;
  demonstratedLowerBound: number;
  /** Demonstrated also needs this many correct contrast answers, and the most recent contrast answer correct. */
  demonstratedMinContrastCorrect: number;
  /** A session is a delayed check for a rule when its previous evidence on that rule is at least this many days earlier. */
  delayedGapDays: number;
  /** A delayed check needs this many new-word applications; it passes only with no rule error (slips aside). */
  delayedMinApplications: number;
  /** Inconsistent: in the last N independent answers on the rule, a correct rate in [low, high] and at least K kinds of error. */
  inconsistentWindow: number;
  inconsistentRateLow: number;
  inconsistentRateHigh: number;
  inconsistentMinErrorKinds: number;
  /** Active misconception: at least this many independent errors with the tag on different items, at least one on a new word, ... */
  activeMinErrors: number;
  /** ... and the tag accounts for at least this share of the rule's recent errors. */
  activeMinShare: number;
  /** Provisionally resolved: since the last error with the tag, this many correct new-word applications, in this many sessions, with this many correct contrasts. */
  resolveMinCorrect: number;
  resolveMinSessions: number;
  resolveMinContrastCorrect: number;
  /** Transfer gap: practice on unreviewed items at least this often right, over at least this many answers, while new words are weak. */
  transferGapPracticeMin: number;
  transferGapPracticeRate: number;
}

export const RULE_EVIDENCE_POLICY_DRAFT: RuleEvidencePolicy = {
  version: "rule-evidence-policy@0-draft",
  minApplications: 3,
  window: 8,
  weakProbability: 0.8,
  weakRate: 0.5,
  demonstratedMinApplications: 4,
  demonstratedQuantile: 0.2,
  demonstratedLowerBound: 0.6,
  demonstratedMinContrastCorrect: 1,
  delayedGapDays: 7,
  delayedMinApplications: 2,
  inconsistentWindow: 6,
  inconsistentRateLow: 0.3,
  inconsistentRateHigh: 0.7,
  inconsistentMinErrorKinds: 2,
  activeMinErrors: 2,
  activeMinShare: 2 / 3,
  resolveMinCorrect: 3,
  resolveMinSessions: 2,
  resolveMinContrastCorrect: 1,
  transferGapPracticeMin: 4,
  transferGapPracticeRate: 0.8,
};

// ---------------------------------------------------------------- the rate of correct application (Beta posterior)

/** Regularised incomplete beta for whole-number parameters: P(X ≤ x) for X ~ Beta(a, b). */
export function betaCdf(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const n = a + b - 1;
  let p = 0;
  let c = 1; // C(n, j), built up from j = 0
  for (let j = 0; j <= n; j++) {
    if (j > 0) c = (c * (n - j + 1)) / j;
    if (j >= a) p += c * x ** j * (1 - x) ** (n - j);
  }
  return Math.min(1, Math.max(0, p));
}

export function betaQuantile(q: number, a: number, b: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (betaCdf(mid, a, b) < q) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface RateEstimate {
  right: number;
  total: number;
  /** Beta(1 + right, 1 + wrong). */
  beta: [number, number];
  mean: number;
  /** 10th and 90th percentiles. */
  range80: [number, number];
}

export function rateOf(right: number, total: number): RateEstimate {
  const a = 1 + right;
  const b = 1 + total - right;
  const r = (x: number) => Math.round(x * 1000) / 1000;
  return { right, total, beta: [a, b], mean: r(a / (a + b)), range80: [r(betaQuantile(0.1, a, b)), r(betaQuantile(0.9, a, b))] };
}

// ---------------------------------------------------------------- observations

export type Track = "independent" | "practice" | "repeat";

export interface RuleObservation {
  evidence: string;
  decision: string;
  at: string;
  session: string;
  item: string;
  version: number;
  capability: CapabilityId;
  rule: string;
  role: "apply" | "contrast";
  /** independent: accepted by the updater on its own merits; practice: held (unreviewed item); repeat: an item seen before. */
  track: Track;
  /** The word was new to the learner (no earlier evidence on the same word). */
  newWord: boolean;
  /** First evidence in this session on this rule, at least delayedGapDays after the rule's previous evidence. */
  delayed: boolean;
  correct: boolean;
  signature: Signature;
}

const DAY = 86_400_000;

/** Every answer to an item that tests a rule, in ledger order. Reads only; changes nothing. */
export function ruleObservations(events: readonly LedgerEvent[], decisions: readonly Decision[], content: ContentIndex, subject: SubjectRules, policy = RULE_EVIDENCE_POLICY_DRAFT): RuleObservation[] {
  const decisionOf = new Map<string, Decision>();
  for (const d of decisions) if (d.capability && !decisionOf.has(d.source)) decisionOf.set(d.source, d);
  const caps = new Set(subject.capabilities());
  const wordsSeen = new Set<string>();
  const lastByRule = new Map<string, { at: string; session: string }>();
  const delayedSessions = new Set<string>();
  const out: RuleObservation[] = [];
  for (const e of events) {
    if (e.kind !== "evidence") continue;
    const ev = e as EvidenceEvent;
    const item = itemVersion(content, ev.item.id, ev.item.version);
    const d = decisionOf.get(ev.id);
    if (!item || item.kind !== "code" || !d || !caps.has(item.target)) continue;
    const word = subject.wordOf(item);
    const newWord = word === null ? false : !wordsSeen.has(word);
    if (word !== null) wordsSeen.add(word);
    const rule = subject.ruleOf(item);
    if (!rule || (d.verdict !== "accepted" && d.verdict !== "held") || d.observation?.kind !== "binary") continue;
    const key = `${item.target}#${rule}`;
    const prev = lastByRule.get(key);
    const sessionKey = `${key}@${ev.session}`;
    if (prev && prev.session !== ev.session && Date.parse(ev.at) - Date.parse(prev.at) >= policy.delayedGapDays * DAY) delayedSessions.add(sessionKey);
    const delayed = delayedSessions.has(sessionKey);
    lastByRule.set(key, { at: ev.at, session: ev.session });
    const correct = d.observation.value === 1;
    const track: Track = d.verdict === "held" ? "practice" : d.observation.exposure === "repeat" ? "repeat" : "independent";
    out.push({
      evidence: ev.id,
      decision: d.id,
      at: ev.at,
      session: ev.session,
      item: item.id,
      version: item.version,
      capability: item.target,
      rule,
      role: subject.roleOf(item),
      track,
      newWord,
      delayed,
      correct,
      signature: subject.classify(item, ev.response, correct),
    });
  }
  return out;
}

// ---------------------------------------------------------------- rule state

export type RuleStatus = "insufficient_evidence" | "inconsistent" | "weak" | "emerging" | "demonstrated" | "verified" | "needs_reconfirmation";
export type RetentionState = "not_checked" | "confirmed" | "failed";
export type MisconceptionState = "suspected" | "active" | "improving" | "provisionally_resolved" | "historically_observed" | "not_confirmed";

export interface MisconceptionRecord {
  rule: string;
  tag: string;
  state: MisconceptionState;
  /** Independent errors with this tag, oldest first. */
  errors: string[];
  /** Errors with this tag in practice on unreviewed items (never enough on their own for "active"). */
  practiceErrors: string[];
  recurrences: number;
  sinceLastError: { correctNewWords: number; sessions: number; contrastsCorrect: number };
  history: { at: string; state: MisconceptionState; evidence: string; reason: string }[];
}

export interface DelayedCheck {
  session: string;
  at: string;
  applications: number;
  ruleErrors: number;
  slips: number;
  /** Was the rule demonstrated before this session? Only then does the check confirm or fail retention. */
  afterDemonstration: boolean;
  passed: boolean | null;
  evidence: string[];
}

export interface RuleState {
  rule: string;
  capability: CapabilityId;
  name: string;
  requiredFromBand: number;
  status: RuleStatus;
  reasons: string[];
  /** Independent applications on new words in the window (slips excluded): the current rate. */
  current: RateEstimate;
  /** All independent applications on new words, ever (slips excluded). */
  allTime: RateEstimate;
  contrast: { right: number; total: number; lastCorrect: boolean | null };
  practice: { right: number; total: number };
  repeats: number;
  slips: number;
  inconsistent: boolean;
  transferGap: boolean;
  retention: { state: RetentionState; checks: DelayedCheck[] };
  history: { firstEmergingAt: string | null; firstDemonstratedAt: string | null; firstVerifiedAt: string | null; lastVerifiedAt: string | null; statusChanges: { at: string; status: RuleStatus; evidence: string }[] };
  misconceptions: MisconceptionRecord[];
}

const isError = (o: RuleObservation) => !o.correct && o.signature.kind !== "slip";
const errorKind = (o: RuleObservation, i: number) => (o.signature.kind === "misconception" ? `tag:${o.signature.tag}` : `unclassified:${i}`);

interface Fold {
  apps: RuleObservation[]; // independent, new word, apply role, not a slip
  indep: RuleObservation[]; // independent (any role, any word), not a slip
  contrastRight: number;
  contrastTotal: number;
  lastContrast: boolean | null;
  practiceRight: number;
  practiceTotal: number;
  repeats: number;
  slips: number;
  everDemonstrated: boolean;
  checks: DelayedCheck[];
}

function currentRate(f: Fold, p: RuleEvidencePolicy): RateEstimate {
  const w = f.apps.slice(-p.window);
  return rateOf(w.filter((o) => o.correct).length, w.length);
}

function inconsistentNow(f: Fold, p: RuleEvidencePolicy): boolean {
  const w = f.indep.slice(-p.inconsistentWindow);
  if (w.length < p.inconsistentWindow) return false;
  const rate = w.filter((o) => o.correct).length / w.length;
  const kinds = new Set(w.map((o, i) => (isError(o) ? errorKind(o, i) : null)).filter((k): k is string => k !== null));
  return rate >= p.inconsistentRateLow && rate <= p.inconsistentRateHigh && kinds.size >= p.inconsistentMinErrorKinds;
}

function demonstratedNow(f: Fold, p: RuleEvidencePolicy): boolean {
  const r = currentRate(f, p);
  if (r.total < p.demonstratedMinApplications) return false;
  if (f.contrastRight < p.demonstratedMinContrastCorrect || f.lastContrast !== true) return false;
  return betaQuantile(p.demonstratedQuantile, r.beta[0], r.beta[1]) >= p.demonstratedLowerBound;
}

function weakNow(f: Fold, p: RuleEvidencePolicy): boolean {
  const r = currentRate(f, p);
  return r.total >= p.minApplications && betaCdf(p.weakRate, r.beta[0], r.beta[1]) >= p.weakProbability;
}

function practiceGood(f: Fold, p: RuleEvidencePolicy): boolean {
  return f.practiceTotal >= p.transferGapPracticeMin && f.practiceRight / f.practiceTotal >= p.transferGapPracticeRate;
}

/** Fold one rule's observations into its state. */
export function ruleState(def: RuleDef, obs: readonly RuleObservation[], p = RULE_EVIDENCE_POLICY_DRAFT): RuleState {
  const f: Fold = { apps: [], indep: [], contrastRight: 0, contrastTotal: 0, lastContrast: null, practiceRight: 0, practiceTotal: 0, repeats: 0, slips: 0, everDemonstrated: false, checks: [] };
  const misc = new Map<string, MisconceptionRecord & { sessionsSince: Set<string> }>();
  const changes: RuleState["history"]["statusChanges"] = [];
  const hist = { firstEmergingAt: null as string | null, firstDemonstratedAt: null as string | null, firstVerifiedAt: null as string | null, lastVerifiedAt: null as string | null };
  let status: RuleStatus = "insufficient_evidence";
  let lastStatus: RuleStatus | null = null;

  const setMisc = (m: MisconceptionRecord, state: MisconceptionState, o: RuleObservation, reason: string) => {
    if (m.state === state) return;
    m.state = state;
    m.history.push({ at: o.at, state, evidence: o.evidence, reason });
  };

  const statusNow = (): RuleStatus => {
    const lastCheck = [...f.checks].reverse().find((c) => c.passed !== null);
    if (lastCheck && lastCheck.passed === false) return "needs_reconfirmation";
    if (inconsistentNow(f, p)) return "inconsistent";
    const activeMisc = [...misc.values()].some((m) => m.state === "active");
    if (weakNow(f, p) || (activeMisc && currentRate(f, p).total >= p.minApplications)) return "weak";
    if (currentRate(f, p).total < p.minApplications) return "insufficient_evidence";
    if (demonstratedNow(f, p)) return lastCheck && lastCheck.passed ? "verified" : "demonstrated";
    return "emerging";
  };

  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    // ---- delayed checks: the first observation of a delayed session opens one
    if (o.delayed && o.track === "independent") {
      let check = f.checks.find((c) => c.session === o.session);
      if (!check) {
        check = { session: o.session, at: o.at, applications: 0, ruleErrors: 0, slips: 0, afterDemonstration: f.everDemonstrated, passed: null, evidence: [] };
        f.checks.push(check);
      }
      check.evidence.push(o.evidence);
      if (o.signature.kind === "slip") check.slips++;
      else {
        if (o.role === "apply" && o.newWord) check.applications++;
        if (isError(o)) check.ruleErrors++;
      }
      if (check.afterDemonstration) {
        if (check.ruleErrors > 0) check.passed = false;
        else if (check.applications >= p.delayedMinApplications) check.passed = true;
      }
    }
    // ---- tracks
    if (o.track === "practice") {
      f.practiceTotal++;
      if (o.correct) f.practiceRight++;
    } else if (o.track === "repeat") f.repeats++;
    else if (o.signature.kind === "slip") f.slips++;
    else {
      f.indep.push(o);
      if (o.role === "contrast") {
        f.contrastTotal++;
        if (o.correct) f.contrastRight++;
        f.lastContrast = o.correct;
      } else if (o.newWord) f.apps.push(o);
    }
    // ---- misconception records (this rule's evidence only)
    if (o.signature.kind === "misconception") {
      const tag = o.signature.tag;
      let m = misc.get(tag);
      if (!m) {
        m = { rule: def.id, tag, state: "suspected", errors: [], practiceErrors: [], recurrences: 0, sinceLastError: { correctNewWords: 0, sessions: 0, contrastsCorrect: 0 }, history: [], sessionsSince: new Set() };
        misc.set(tag, m);
        m.history.push({ at: o.at, state: "suspected", evidence: o.evidence, reason: o.track === "independent" ? "first independent error with this signature" : "error with this signature in practice" });
      }
      m.sinceLastError = { correctNewWords: 0, sessions: 0, contrastsCorrect: 0 };
      m.sessionsSince = new Set();
      if (o.track !== "independent") m.practiceErrors.push(o.evidence);
      else {
        m.errors.push(o.evidence);
        const wasResolved = m.state === "provisionally_resolved" || m.state === "historically_observed";
        const errorsInWindow = f.indep.slice(-p.window).filter(isError);
        const share = errorsInWindow.length ? errorsInWindow.filter((x) => x.signature.kind === "misconception" && x.signature.tag === tag).length / errorsInWindow.length : 0;
        const errs = obs.filter((x) => m!.errors.includes(x.evidence));
        const items = new Set(errs.map((x) => x.item));
        const enough = items.size >= p.activeMinErrors && errs.some((x) => x.newWord) && share >= p.activeMinShare;
        if (enough && practiceGood(f, p)) setMisc(m, "suspected", o, "the same pattern is right in practice on practised words: a transfer gap, not yet a misconception");
        else if (enough && inconsistentNow(f, p)) setMisc(m, "suspected", o, "answers on this rule are inconsistent");
        else if (wasResolved) {
          m.recurrences++;
          setMisc(m, "active", o, "the error came back after it had stopped");
        } else if (m.state === "improving") setMisc(m, "active", o, "the error came back while improving");
        else if (enough) setMisc(m, "active", o, `${items.size} errors with this signature on different items, ${Math.round(share * 100)}% of recent errors on this rule`);
      }
    } else if (o.track === "independent" && o.correct && o.signature.kind !== "slip") {
      for (const m of misc.values()) {
        if (o.role === "contrast") m.sinceLastError.contrastsCorrect++;
        else if (o.newWord) m.sinceLastError.correctNewWords++;
        m.sessionsSince.add(o.session);
        m.sinceLastError.sessions = m.sessionsSince.size;
        if (m.state === "active" && o.role === "apply" && o.newWord) setMisc(m, "improving", o, "a correct answer on a new word since the last error");
        const s = m.sinceLastError;
        const met = s.correctNewWords >= p.resolveMinCorrect && s.sessions >= p.resolveMinSessions && s.contrastsCorrect >= p.resolveMinContrastCorrect;
        if (met && m.state === "improving") setMisc(m, "provisionally_resolved", o, `${s.correctNewWords} correct new words in ${s.sessions} sessions and ${s.contrastsCorrect} correct contrasts since the last error`);
        if (met && m.state === "suspected") setMisc(m, "not_confirmed", o, "not seen again on new words and contrasts");
      }
    }
    // ---- a passed delayed check after provisional resolution, at least the gap after the last error
    const check = f.checks.find((c) => c.session === o.session);
    if (check?.passed === true) {
      for (const m of misc.values()) {
        const lastErr = obs.find((x) => x.evidence === m.errors.at(-1));
        if (m.state === "provisionally_resolved" && lastErr && Date.parse(o.at) - Date.parse(lastErr.at) >= p.delayedGapDays * DAY) setMisc(m, "historically_observed", o, "a delayed check passed with no recurrence");
      }
    }
    // ---- status
    status = statusNow();
    if (status === "demonstrated" || status === "verified") f.everDemonstrated = true;
    if ((status === "emerging" || status === "demonstrated" || status === "verified") && !hist.firstEmergingAt) hist.firstEmergingAt = o.at;
    if ((status === "demonstrated" || status === "verified") && !hist.firstDemonstratedAt) hist.firstDemonstratedAt = o.at;
    if (status === "verified") {
      hist.firstVerifiedAt ??= o.at;
      hist.lastVerifiedAt = o.at;
    }
    if (status !== lastStatus) {
      changes.push({ at: o.at, status, evidence: o.evidence });
      lastStatus = status;
    }
  }

  const current = currentRate(f, p);
  const transferGap = practiceGood(f, p) && weakNow(f, p);
  const lastCheck = [...f.checks].reverse().find((c) => c.passed !== null);
  const retention: RetentionState = !lastCheck ? "not_checked" : lastCheck.passed ? "confirmed" : "failed";
  const reasons: string[] = [];
  if (status === "insufficient_evidence") reasons.push(`${current.total} independent answer(s) on new words; ${p.minApplications} needed before judging`);
  if (status === "weak") reasons.push(`${current.right} of ${current.total} right on new words`);
  if (status === "inconsistent") reasons.push("right and wrong answers mixed, with different kinds of error");
  if (status === "needs_reconfirmation") reasons.push(`shown before${hist.firstDemonstratedAt ? ` (${hist.firstDemonstratedAt.slice(0, 10)})` : ""}, but the latest delayed check failed`);
  if (transferGap) reasons.push("right on practised words, wrong on new ones: not yet transferring");
  if ((status === "demonstrated" || status === "emerging") && f.contrastTotal === 0) reasons.push("no contrast question answered yet");
  if (status === "demonstrated" && retention === "not_checked") reasons.push("not yet checked after a delay");

  return {
    rule: def.id,
    capability: def.capability,
    name: def.name,
    requiredFromBand: def.requiredFromBand,
    status,
    reasons,
    current,
    allTime: rateOf(f.apps.filter((o) => o.correct).length, f.apps.length),
    contrast: { right: f.contrastRight, total: f.contrastTotal, lastCorrect: f.lastContrast },
    practice: { right: f.practiceRight, total: f.practiceTotal },
    repeats: f.repeats,
    slips: f.slips,
    inconsistent: inconsistentNow(f, p),
    transferGap,
    retention: { state: retention, checks: f.checks },
    history: { ...hist, statusChanges: changes },
    misconceptions: [...misc.values()].map(({ sessionsSince: _s, ...m }) => m).sort((a, b) => a.tag.localeCompare(b.tag)),
  };
}

// ---------------------------------------------------------------- the capability claim guard

export interface EngineLabel {
  mean: number;
  sd: number;
  demonstrated: number | null;
  mastered: number | null;
  verification: string;
}

export interface CapabilityClaim {
  capability: CapabilityId;
  /** The engine's own capability view, unchanged. */
  engine: EngineLabel;
  /** Highest band at which every rule required at or below it is verified (null: not even the lowest). */
  rulesVerifiedThroughBand: number | null;
  /** The band at which mastery can be claimed with its required rules verified; null if none. */
  supportedMasteryBand: number | null;
  /** Does the rule evidence support the engine's "mastered at band M" label as it stands? */
  engineMasteryLabelSupported: boolean;
  /** Rules required at or below the engine's level that are not verified, and why. */
  unverified: { rule: string; requiredFromBand: number; status: RuleStatus }[];
  summary: string;
}

export function capabilityClaim(engine: EngineLabel, rules: readonly RuleState[], capability: CapabilityId): CapabilityClaim {
  const bands = [...new Set(rules.map((r) => r.requiredFromBand))].sort((a, b) => a - b);
  const unverifiedBands = rules.filter((r) => r.status !== "verified").map((r) => r.requiredFromBand);
  const firstGap = unverifiedBands.length ? Math.min(...unverifiedBands) : Infinity;
  const through = bands.filter((b) => b < firstGap).at(-1) ?? null;
  const ceiling = firstGap === Infinity ? Infinity : firstGap - 0.5;
  const M = engine.mastered;
  const supported = M === null || through === null ? null : Math.min(M, ceiling);
  const level = M ?? engine.demonstrated ?? 0;
  const unverified = rules.filter((r) => r.status !== "verified" && r.requiredFromBand <= Math.max(level, bands[0] ?? 0)).map((r) => ({ rule: r.rule, requiredFromBand: r.requiredFromBand, status: r.status }));
  const labelOk = M !== null && supported === M;
  const fmt = (b: number) => b.toFixed(1);
  const why = unverified.map((u) => `${u.rule} (${u.status.replace(/_/g, " ")}, needed from band ${fmt(u.requiredFromBand)})`).join("; ");
  const summary =
    M === null
      ? `The engine reports no mastery level.${unverified.length ? ` Rules not yet verified: ${why}.` : ""}`
      : labelOk
        ? `Mastered at band ${fmt(M)}; every rule it requires is verified.`
        : `The engine reports mastered at band ${fmt(M)}, but the rules it requires are not all verified: ${why}.${supported !== null ? ` Supported: band ${fmt(supported)}.` : " No band is supported yet."}`;
  return { capability, engine, rulesVerifiedThroughBand: through, supportedMasteryBand: supported, engineMasteryLabelSupported: labelOk, unverified, summary };
}

// ---------------------------------------------------------------- one call for a whole learner

export interface RuleEvidenceProjection {
  subject: string;
  policy: string;
  /** Ledger position the projection was derived from. */
  through: string | null;
  capabilities: Record<CapabilityId, { rules: RuleState[]; claim: CapabilityClaim }>;
}

export function projectRuleEvidence(
  ledger: { events: readonly LedgerEvent[]; decisions: readonly Decision[] },
  content: ContentIndex,
  subject: SubjectRules,
  engineView: (capability: CapabilityId) => EngineLabel,
  policy = RULE_EVIDENCE_POLICY_DRAFT,
): RuleEvidenceProjection {
  const obs = ruleObservations(ledger.events, ledger.decisions, content, subject, policy);
  const capabilities: RuleEvidenceProjection["capabilities"] = {};
  for (const cap of subject.capabilities()) {
    const rules = subject.rules(cap).map((def) => ruleState(def, obs.filter((o) => o.capability === cap && o.rule === def.id), policy));
    capabilities[cap] = { rules, claim: capabilityClaim(engineView(cap), rules, cap) };
  }
  return { subject: subject.id, policy: policy.version, through: ledger.events.at(-1)?.id ?? null, capabilities };
}
