/**
 * The C′ evidence gate: before a skill is described as demonstrated at level L, the pupil's own recent answers must
 * support it. The engine's estimate and its demonstrated level are unchanged and stay visible; this decides only
 * whether OpenPath may *say* "shown", and, when it may not, what evidence is missing and how to collect it.
 *
 * What is kept apart:
 *   estimated ability        the engine's mean ± sd, from every answer old and new (never gated); the engine also
 *                            proposes a level ("estimated level")
 *   demonstrated now         the highest level at or below the engine's proposal that this gate supports now
 *                            (demonstratedNow): it may be lower than the estimate, never higher, never without evidence
 *   demonstrated earlier     the highest level the gate supported at any earlier time (history, labelled as such)
 *   confirmed                demonstrated now, and a later check passed at least the retention gap after the first
 *                            supported claim (profile.ts)
 *   verified mastery         demonstrated, with the gate's evidence on educator-approved questions (profile.ts)
 *
 * Lessons: a lesson moves earlier answers out of the current claim's window. For spelling, lessons and answers both
 * carry a pattern (ladder step), so a lesson supersedes only answers on its own pattern and on patterns that share a
 * misconception with it in the content; elsewhere, and whenever the pattern is unknown, a lesson supersedes every
 * earlier answer on the skill (the conservative rule).
 *
 * Qualifying answers (the only ones the gate reads): accepted by the ledger, with provenance, first and unaided,
 * on a fresh question, not after teaching, and on the skill itself. Assisted answers, practice-only words,
 * provisional questions and answers straight after a lesson never qualify. Nothing is stored or erased: the gate
 * is recomputed from the record, so every historical answer keeps its place and meaning.
 */
import type { Decision } from "../../../../packages/english-core/src/index.ts";
import type { AppContent, Code } from "./content.ts";
import { MASTERY_GATE, SPELLING_PATTERN_SCOPE } from "./mastery-policy.ts";
import type { AppState } from "./state.ts";

const SPELLING_PREFIX = "EN.FND.SPL.";

export interface GateAnswer {
  /** The ledger decision behind it (traceable to the answer). */
  decision: string;
  item: string;
  at: string;
  /** The question's difficulty (provisional, author-estimated). */
  b: number;
  correct: boolean;
  format: string;
  /** The word spelt (typed spelling only), used to tell repeated words apart from new ones. */
  word: string | null;
  /** The spelling pattern (ladder step), if any. */
  pattern: string | null;
  /** On an educator-approved (validated) question. */
  validated: boolean;
  /** The same word was already answered on another question: it is in the window but is not a new question. */
  repeatedWord?: boolean;
}

/** A lesson or teaching intervention on a capability, with the pattern it taught when known. */
export interface Teaching {
  at: string;
  /** The ladder step taught, or null when not known (then it supersedes every earlier answer on the skill). */
  step: string | null;
}

export type GateNext =
  | { kind: "diagnostic"; atLeast?: number; atMost?: number; avoidPatterns?: string[]; why: string }
  | { kind: "fresh_check"; atLeast: number; atMost: number; why: string }
  | { kind: "practice"; why: string };

export interface MasteryGate {
  policy: string;
  capability: string;
  /** The level the engine demonstrates (the claim being tested). */
  level: number;
  asOf: string;
  /** The latest lesson or teaching on this skill, if any. */
  since: string | null;
  /** Answers moved out of the window by a later lesson on their pattern (or the whole skill): history for this claim. */
  superseded: number;
  /** The latest qualifying answers since then, oldest first (at most MASTERY_GATE.window). */
  window: GateAnswer[];
  /** Right answers at level (difficulty ≥ L − 0.25), on different questions and different words. */
  atLevel: GateAnswer[];
  /** Wrong answers on clearly easier questions (difficulty ≤ L − 1). */
  contradictions: GateAnswer[];
  /** The engine demonstrated with one question format only (dictation): word and pattern diversity required instead. */
  singleFormat: boolean;
  /** Different words and patterns among the right answers at level. */
  words: number;
  patterns: string[];
  passed: boolean;
  /** What evidence is missing, in plain words (empty when passed). */
  missing: string[];
  /** How the plan can collect the missing evidence (null when passed). */
  next: GateNext | null;
}

const fmt = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));

/** Every teaching on a capability (lessons read, teaching interventions), oldest first, with the step taught. */
export function teachingsOn(s: AppState, cap: string): Teaching[] {
  const out: Teaching[] = [];
  for (const e of s.events) {
    if (e.kind === "lesson" && e.lesson.split("#")[0] === cap) out.push({ at: e.at, step: e.lesson.split("#")[1] ?? null });
    else if (e.kind === "intervention" && (e as { capability?: string }).capability === cap) out.push({ at: e.at, step: (e as { rule?: string }).rule ?? null });
  }
  return out;
}

const tagCache = new WeakMap<AppContent, Map<string, Map<string, Set<string>>>>();
/** Spelling: the misconception tags each pattern's questions list (what the content says can go wrong there). */
function patternTags(c: AppContent, cap: string): Map<string, Set<string>> {
  let byCap = tagCache.get(c);
  if (!byCap) tagCache.set(c, (byCap = new Map()));
  let m = byCap.get(cap);
  if (!m) {
    m = new Map();
    for (const i of c.ctx.content.byCapability.get(cap) ?? []) {
      if (i.kind !== "code" || !i.step) continue;
      const tags = m.get(i.step) ?? new Set<string>();
      for (const t of [...Object.values(i.wrong ?? {}), ...Object.values(i.distractor_tags ?? {}), ...(i.addresses ?? [])]) tags.add(t);
      m.set(i.step, tags);
    }
    byCap.set(cap, m);
  }
  return m;
}

/**
 * The patterns a lesson on `step` affects: itself, and patterns whose questions share a misconception with it (for
 * example a doubling lesson affects every doubling pattern). Null: the whole skill (not spelling, or the step is not a
 * known pattern of the skill).
 */
export function affectedPatterns(c: AppContent, cap: string, step: string | null): Set<string> | null {
  if (!SPELLING_PATTERN_SCOPE || !cap.startsWith(SPELLING_PREFIX) || !step) return null;
  const ladder = c.ladders.get(cap);
  if (!ladder?.some((x) => x.id === step)) return null;
  const tags = patternTags(c, cap);
  const mine = tags.get(step) ?? new Set<string>();
  const out = new Set([step]);
  for (const [p, t] of tags) if ([...t].some((x) => mine.has(x))) out.add(p);
  return out;
}

/** Is this answer superseded by a later lesson (on its pattern or a related one, or on the whole skill) by `asOf`? */
function supersededBy(c: AppContent, cap: string, a: GateAnswer, teachings: Teaching[], asOf: string): string | null {
  for (const t of teachings) {
    // a lesson at the same moment as an answer supersedes it (as before: answers at or before a lesson are history)
    if (t.at < a.at || t.at > asOf) continue;
    const scope = affectedPatterns(c, cap, t.step);
    if (scope === null || a.pattern === null || scope.has(a.pattern)) return t.at;
  }
  return null;
}

/** The latest teaching on a capability (a lesson read, or a teaching intervention), at or before `asOf`. */
export function lastTeaching(s: AppState, cap: string, asOf: string): string | null {
  let last: string | null = null;
  for (const e of s.events) {
    if (e.at > asOf) continue;
    const on = e.kind === "lesson" ? e.lesson.split("#")[0] === cap : e.kind === "intervention" ? (e as { capability?: string }).capability === cap : false;
    if (on && (last === null || e.at > last)) last = e.at;
  }
  return last;
}

/** Every qualifying independent answer on a capability, oldest first (see the file comment). */
export function qualifyingAnswers(s: AppState, c: AppContent, cap: string): GateAnswer[] {
  const evidence = new Map(s.ledger.events.filter((e) => e.kind === "evidence").map((e) => [e.id, e as { provenance?: unknown; session?: string }]));
  const lessonSession = (session: string | undefined) => !!session && (s.sessions.get(session)?.event.lesson ?? "").split("#")[0] === cap;
  const out: GateAnswer[] = [];
  // spelling: when each word was first met in any answer (with help, in practice, after a lesson, on any question)
  const firstMet = new Map<string, { at: string; item: string }>();
  if (cap.startsWith(SPELLING_PREFIX))
    for (const e of s.events) {
      if (e.kind !== "attempt") continue;
      const it = c.ctx.content.items.get(e.item.id) as Code | undefined;
      const w = it?.kind === "code" && it.target === cap && it.format.startsWith("typed") ? it.answers?.[0]?.toLowerCase() : undefined;
      if (w && !firstMet.has(w)) firstMet.set(w, { at: e.at, item: it!.id });
    }
  for (const d of s.ledger.decisions as Decision[]) {
    const o = d.observation;
    if (d.capability !== cap || d.verdict !== "accepted" || !o || o.kind !== "binary") continue;
    if (o.exposure === "repeat" || o.setting === "after_teaching") continue;
    const src = evidence.get(d.source);
    if (!src?.provenance || lessonSession(src.session)) continue; // no provenance: help unknown; legacy lesson session
    const item = c.ctx.content.items.get(o.item) as Code | undefined;
    if (!item || item.kind !== "code" || item.target !== cap) continue; // direct answers only
    // spelling: the answer is the word being spelt, so the same word on another question is not a new question
    const word = cap.startsWith(SPELLING_PREFIX) && item.format.startsWith("typed") && item.answers?.[0] ? item.answers[0].toLowerCase() : null;
    const a: GateAnswer = { decision: d.id, item: item.id, at: d.at, b: item.b, correct: o.value === 1, format: item.format, word, pattern: item.step ?? null, validated: item.evidence_status === "validated" };
    // met before on another question (in any answer): not a new word
    const met = word ? firstMet.get(word) : undefined;
    if (met && met.item !== item.id && met.at <= d.at) a.repeatedWord = true;
    out.push(a);
  }
  return out;
}

/**
 * Evaluate C′ for a claim of level L on a capability, from the record up to `asOf`. `singleFormat` says whether the
 * engine's demonstration rests on one question format (the dictation allowance).
 */
export function masteryGate(s: AppState, c: AppContent, cap: string, level: number, asOf: string, singleFormat: boolean, all: GateAnswer[] = qualifyingAnswers(s, c, cap)): MasteryGate {
  const G = MASTERY_GATE;
  const since = lastTeaching(s, cap, asOf);
  const teachings = teachingsOn(s, cap);
  const upTo = all.filter((a) => a.at <= asOf);
  const standing = upTo.filter((a) => supersededBy(c, cap, a, teachings, asOf) === null);
  const superseded = upTo.length - standing.length;
  const window = standing.slice(-G.window);
  const seenItems = new Set<string>();
  const seenWords = new Set<string>();
  const atLevel: GateAnswer[] = [];
  for (const a of window) {
    if (!a.correct || a.repeatedWord || a.b < level - G.atLevelBelow - 1e-9) continue;
    if (seenItems.has(a.item) || (a.word && seenWords.has(a.word))) continue;
    seenItems.add(a.item);
    if (a.word) seenWords.add(a.word);
    atLevel.push(a);
  }
  const contradictions = window.filter((a) => !a.correct && a.b <= level - G.contradictBelow + 1e-9);
  const words = new Set(atLevel.map((a) => a.word ?? a.item)).size;
  const patterns = [...new Set(atLevel.map((a) => a.pattern).filter((p): p is string => !!p))];
  const missing: string[] = [];
  let next: GateNext | null = null;
  const floor = level - G.atLevelBelow;
  // questions to fill a gap: at the level claimed, at most diagnosticAbove harder (not far above it)
  const ceiling = level + G.diagnosticAbove;
  if (contradictions.length) {
    const easiest = Math.min(...contradictions.map((a) => a.b));
    missing.push(
      `${contradictions.length} recent wrong answer${contradictions.length === 1 ? "" : "s"} on clearly easier question${contradictions.length === 1 ? "" : "s"} (difficulty ${contradictions.map((a) => fmt(a.b)).join(", ")}, at or below ${fmt(level - G.contradictBelow)}) contradict${contradictions.length === 1 ? "s" : ""} a claim of level ${fmt(level)}. It stays among the latest ${G.window} answers until newer answers replace it.`,
    );
    next =
      contradictions.length >= G.practiceAfterContradictions
        ? { kind: "practice", why: `${contradictions.length} recent errors on easier questions than level ${fmt(level)}: practice comes before another check` }
        : { kind: "diagnostic", atLeast: Math.max(0, easiest - 0.5), atMost: level + 0.5, why: `one recent error on an easier question (difficulty ${fmt(easiest)}): new questions between ${fmt(Math.max(0, easiest - 0.5))} and ${fmt(level + 0.5)} show whether it was a slip` };
  }
  if (!window.length) {
    missing.push(since && superseded ? `No answers on their own since the lesson on ${since.slice(0, 10)}: answers before it, on what it taught, are history for this claim.` : "No qualifying answers on their own.");
    next ??= { kind: "fresh_check", atLeast: floor, atMost: ceiling, why: since ? "a fresh check on their own after the lesson, at about the level claimed" : "a first check on their own at about the level claimed" };
  } else if (atLevel.length < G.atLevelMin) {
    missing.push(`${atLevel.length} recent right answer${atLevel.length === 1 ? "" : "s"} at level ${fmt(level)} or harder (difficulty ≥ ${fmt(floor)}) on different questions; ${G.atLevelMin} are needed. Right answers on easier questions do not show level ${fmt(level)}.`);
    next ??= { kind: "diagnostic", atLeast: floor, atMost: ceiling, why: `${G.atLevelMin - atLevel.length} more right answer${G.atLevelMin - atLevel.length === 1 ? "" : "s"} at difficulty ${fmt(floor)} or harder on new questions would support level ${fmt(level)} (new questions at difficulty ${fmt(floor)} to ${fmt(ceiling)})` };
  }
  if (singleFormat && window.length) {
    const needW = G.singleFormat.minWords;
    const needP = G.singleFormat.minPatterns;
    if (words < needW || patterns.length < needP) {
      missing.push(`Shown by dictation only: right answers at level on ${words} word${words === 1 ? "" : "s"} and ${patterns.length} spelling pattern${patterns.length === 1 ? "" : "s"}; at least ${needW} words on ${needP} different patterns are needed.`);
      next ??= { kind: "diagnostic", atLeast: floor, atMost: ceiling, avoidPatterns: patterns, why: `a new word at difficulty ${fmt(floor)} or harder on a spelling pattern not yet shown (${patterns.length ? `not ${patterns.join(", ")}` : "any"})` };
    }
  }
  const passed = missing.length === 0;
  return { policy: G.version, capability: cap, level, asOf, since, superseded, window, atLevel, contradictions, singleFormat, words, patterns, passed, missing, next: passed ? null : next };
}

/** Candidate levels at or below the engine's proposal, highest first, on the engine's own half-band grid (1 to 8). */
export function candidateLevels(estimate: number): number[] {
  const out: number[] = [];
  for (let l = Math.min(estimate, 8); l >= 1 - 1e-9; l -= 0.5) out.push(Math.round(l * 2) / 2);
  return out;
}

/**
 * The highest level at or below the engine's proposal that the gate supports at `asOf`, and the gate behind it.
 * Each candidate must pass every requirement on its own evidence (window, at-level right answers on different
 * questions and words, no contradiction, diversity for dictation alone); nothing is rounded down without that.
 */
export function demonstratedNow(s: AppState, c: AppContent, cap: string, estimate: number, asOf: string, singleFormat: boolean, all: GateAnswer[] = qualifyingAnswers(s, c, cap)): MasteryGate | null {
  for (const l of candidateLevels(estimate)) {
    const g = masteryGate(s, c, cap, l, asOf, singleFormat, all);
    if (g.passed) return g;
  }
  return null;
}

export interface GateHistory {
  /** Each engine demonstration (qualifying session) and the highest level the gate supported then (null: none). */
  claims: { at: string; estimate: number; supported: number | null }[];
  /** The first time the gate supported any level: the retention gap is counted from here. */
  first: { at: string; level: number } | null;
  /** The highest level the gate ever supported: history, never a claim about now. */
  highest: { at: string; level: number } | null;
}

/**
 * The gate's verdicts over time: at each session in which the engine demonstrated a level, judged on the record up to
 * that session. Later checks ("check due", "not kept", "confirmed") are reported only for levels supported this way.
 */
export function gateHistory(s: AppState, c: AppContent, cap: string, asOf: string, singleFormatAt: (at: string) => boolean): GateHistory {
  const node = s.ledger.composite.nodes[cap];
  const out: GateHistory = { claims: [], first: null, highest: null };
  if (!node) return out;
  const all = qualifyingAnswers(s, c, cap);
  for (const sess of node.sessions ?? []) {
    if (sess.at > asOf || sess.teaching || sess.level === null) continue;
    const g = demonstratedNow(s, c, cap, sess.level, sess.at, singleFormatAt(sess.at), all);
    out.claims.push({ at: sess.at, estimate: sess.level, supported: g ? g.level : null });
    if (!g) continue;
    out.first ??= { at: sess.at, level: g.level };
    if (!out.highest || g.level > out.highest.level) out.highest = { at: sess.at, level: g.level };
  }
  return out;
}

/** Did the gate ever support a level of at least `minLevel` (up to `asOf`)? */
export const supportedAtLeast = (h: GateHistory, minLevel: number) => h.claims.some((x) => x.supported !== null && x.supported >= minLevel - 1e-9);
