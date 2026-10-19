/**
 * Learner evidence through the shared engine. Every attempt becomes an event of the shared english-core ledger (the
 * same one mathematics already uses), with the same semantics:
 *   guided answers and any later attempt at a question   assisted_response (recorded, never an estimate change)
 *   hints and shown solutions                             hint events; the answer carries them (assisted@1)
 *   first, unaided answers                                evidence with provenance@1 (practice / assessment / retention)
 *   teaching blocks                                       intervention events
 * Content is provisional, so the shared content gate holds it, and verification (verification@2, H-V1 to H-V4) can
 * never be reached on it. "Verified" is taken ONLY from sharedProfile; nothing here computes mastery.
 *
 * The statuses below (status@1) describe what the records show, for the tiles. They are not a mastery model.
 */
import { leafView } from "../../english-core/src/composite";
import { indexContent } from "../../english-core/src/content";
import type { AssistedResponseEvent, EvidenceEvent, HintEvent, Item } from "../../english-core/src/types";
import { sharedProfile } from "../../mathematics/src/canonical";
import type { GraphVersion } from "../../mathematics/src/prerequisites";
import { mathematicsLedger } from "../../mathematics/src/registration";
import { canonical, isCorrect, moduleFor, question, questions, problems, type Question } from "./content";
import { graph } from "./graph";
import type { Attempt, LearnerRecords } from "./records";
import { releaseOf, setActiveRegistry, type Registry } from "./review";

export const DAY = 86_400_000;
/** The delayed check comes at least this long after independent success (the existing seven-day requirement). */
export const RETENTION_DAYS = 7;
/** Independent: at least this many distinct right first answers without help, and the latest one right. */
export const INDEPENDENT_MIN = 2;
/** Questions in a delayed check (the shared verification needs at least two distinct fresh answers in that session). */
export const RETENTION_CHECK = 2;

// ---------------------------------------------------------------- the review fixture (test builds only)

// kept on globalThis so that one switch holds however the module was loaded (test runners may load it twice)
type Fixture = { items: Set<string>; releasedAt: string; all?: boolean } | null;
const G = globalThis as { __openpathLearningReviewFixture?: Fixture };
const getFixture = (): Fixture => G.__openpathLearningReviewFixture ?? null;
/**
 * TEST ONLY. Treat these questions as educator-validated and released at `releasedAt`, so that acceptance tests can show
 * what a verified (green) skill looks like. Shipped content is never reviewed; the app enables this only in a test
 * build, and says so on screen.
 */
export function useReviewFixture(f: { items: string[]; releasedAt: string; all?: boolean } | null) {
  G.__openpathLearningReviewFixture = f && { items: new Set(f.items), releasedAt: f.releasedAt, all: f.all };
}
export const reviewFixtureActive = () => getFixture() !== null;

/**
 * Use another review registry (the server's, which the app loads at start; or a test's). null goes back to the
 * repository's registry. Released content is read through review.ts releaseOf.
 */
export function useRegistry(reg: Registry | null) {
  setActiveRegistry(reg);
}
export function nativeItem(q: Question): Item & { kind: "code" } {
  const fixture = getFixture();
  // validated: a released question (review.ts releaseOf), or, in a test build only, the review fixture
  const released = releaseOf(q.id);
  const releasedAt = released ?? (fixture?.items.has(q.id) || (fixture?.all && true) ? fixture!.releasedAt : undefined);
  const validated = releasedAt !== undefined;
  return {
    kind: "code",
    id: `learn:${q.id}`,
    version: 1,
    family: `learn:${q.skill}@1`,
    target: graph.evidenceTarget(q.competency),
    // the question format is the evidence context (two different formats are needed to demonstrate, as everywhere)
    format: `typed:learning-${q.type}@1`,
    prompt: q.prompt,
    answers: [`${q.type}:${canonical(q, q.answer)}`],
    a: 1,
    b: 4,
    evidence_status: validated ? "validated" : "provisional",
    ...(validated ? { released_at: releasedAt } : {}),
    review: released ? "Educator-reviewed and released (content/learning/review.v1.json)" : validated ? "TEST FIXTURE: treated as reviewed for an acceptance test only" : "Original OpenPath content, provisional: not educator-reviewed.",
    explain: q.solution,
  } as Item & { kind: "code" };
}

const allQuestionIds = () => [...questions.map((q) => q.id), ...problems.flatMap((p) => [p.full.id, ...p.fragments.map((f) => f.id)])];
export const assistedAttempt = (a: Attempt) => a.activity === "guided" || a.hints > 0 || a.solution || a.n > 1;
const INDEPENDENT_ACTIVITIES = new Set(["diagnostic", "probe", "practice", "check", "transfer", "retention", "original", "challenge"]);
export const independentAttempt = (a: Attempt) => !assistedAttempt(a) && INDEPENDENT_ACTIVITIES.has(a.activity);

/** The shared ledger, replayed from the learner's records. */
export function ledgerFor(learnerId: string, records: LearnerRecords, graphVersion: GraphVersion = "1.1.0") {
  const ledger = mathematicsLedger(learnerId, graphVersion);
  const generated = [...new Set(records.attempts.map((a) => a.questionId).filter((id) => id.startsWith("gen:")))];
  ledger.ctx.content = indexContent({ items: [...allQuestionIds(), ...generated].map((id) => nativeItem(question(id))), passages: [], goals: [], misspellings: {} }, ledger.ctx.index);
  const items = (id: string) => {
    const it = nativeItem(question(id));
    return { id: it.id, version: it.version };
  };
  const timeline = [...records.attempts.map((a) => ({ at: a.at, a })), ...records.teaching.map((t) => ({ at: t.at, t }))].sort((x, y) => x.at.localeCompare(y.at));
  for (const e of timeline) {
    if ("t" in e && e.t) {
      ledger.apply({ kind: "intervention", id: `learn-teach:${e.t.at}:${e.t.rule}:${e.t.strategy}`, at: e.t.at, session: e.t.session, capability: graph.evidenceTarget(e.t.competency), strategy: e.t.strategy, content: `learning:${e.t.rule}` });
      continue;
    }
    const a = (e as { a: Attempt }).a;
    const q = question(a.questionId);
    const text = canonical(q, a.response);
    if (text === null) continue;
    const response = { kind: "typed" as const, text: `${q.type}:${text}` };
    const hintIds: string[] = [];
    for (let k = 0; k < a.hints + (a.solution ? 1 : 0); k++) {
      const h: HintEvent = { kind: "hint", id: `learn-hint:${a.id}:${k}`, at: a.at, session: a.session, item: items(q.id), level: k + 1, hintType: a.solution && k === a.hints ? "worked_solution" : "rule_reminder", ...(a.solution && k === a.hints ? { revealsAnswer: true as const } : {}) };
      ledger.apply(h);
      hintIds.push(h.id);
    }
    if (assistedAttempt(a)) {
      const ev: AssistedResponseEvent = { kind: "assisted_response", id: `learn:${a.id}`, at: a.at, session: a.session, item: items(q.id), response, attempt: a.n, hints: hintIds, afterFeedback: a.n > 1 };
      ledger.apply(ev);
    } else {
      const ev: EvidenceEvent = { kind: "evidence", id: `learn:${a.id}`, at: a.at, session: a.session, item: items(q.id), response, use: a.activity === "retention" ? "retention" : a.activity === "practice" ? "practice" : "assessment", provenance: { schema: "provenance@1", attempt: 1, hints: [], afterFeedback: false, policies: ["assisted@1"] } };
      ledger.apply(ev);
    }
  }
  return ledger;
}

// ---------------------------------------------------------------- what the records show, per competency (status@1)

export type Status = "not_started" | "exposure" | "guided" | "independent" | "transfer" | "review" | "verified";
export interface SkillEvidence {
  id: string;
  status: Status;
  /** When independent success was first shown (the delayed check is due RETENTION_DAYS later). */
  independentAt: string | null;
  retention: "none" | "scheduled" | "due" | "passed" | "failed";
  retentionDueAt: string | null;
  independent: { right: number; total: number };
  assisted: { right: number; total: number };
  attempts: string[];
  verified: boolean;
  /** The shared engine's own status for the competency (unavailable for a micro-skill). */
  engine: string;
  /** The shared engine's retention status (verification@2 schedule). */
  engineRetention: string;
}

const about = (id: string) => (a: Attempt) => {
  const q = question(a.questionId);
  return graph.byId.get(id)?.partOf ? q.skill === id : q.competency === id || graph.evidenceTarget(q.competency) === id;
};

export function skillEvidence(id: string, records: LearnerRecords, profileStatus: string, now: number, engineRetention = "unavailable", engineShownAt: string | null = null): SkillEvidence {
  const mine = records.attempts.filter(about(id));
  const taught = records.teaching.some((t) => t.competency === id);
  // a probe asks about what a skill builds on (7 × 5 when 7 × 8 is the question): it is evidence for its own
  // micro-skill, never for showing the whole skill on your own
  const micro = !!graph.byId.get(id)?.partOf;
  const ind = mine.filter((a) => independentAttempt(a) && (micro || a.activity !== "probe"));
  const right = (a: Attempt) => isCorrect(question(a.questionId), a.response);
  const distinctRight = new Set<string>();
  let independentAt: string | null = null;
  for (const a of ind) {
    if (right(a)) distinctRight.add(a.questionId);
    if (!independentAt && distinctRight.size >= INDEPENDENT_MIN && right(a)) independentAt = a.at;
  }
  // status@2: once shown, one slip does not undo it; two wrong of the last three answers on your own do (the skill
  // then comes back to the plan). Before it is shown, the latest answer on your own must be right.
  const after = independentAt ? ind.filter((a) => a.at > independentAt!) : [];
  const recentWrong = after.slice(-3).filter((a) => !right(a)).length;
  const lastInd = ind.at(-1);
  const isIndependent = !!independentAt && !!lastInd && (right(lastInd) || recentWrong < 2);
  // the delayed check: seven full days after independent success, and after the shared engine's own first
  // demonstration when it has one, so the check this surface offers is one the engine can verify (verification@3)
  const from = independentAt && engineShownAt && engineShownAt > independentAt ? engineShownAt : independentAt;
  const due = from ? new Date(Date.parse(from) + RETENTION_DAYS * DAY).toISOString() : null;
  const retentionAnswers = due ? ind.filter((a) => a.activity === "retention" && a.at >= due) : [];
  // the delayed check is the skill's retention questions (up to RETENTION_CHECK of them): any wrong fails it
  const need = Math.min(RETENTION_CHECK, moduleFor(id)?.retention.length ?? 1);
  const retention: SkillEvidence["retention"] = !due ? "none" : retentionAnswers.some((a) => !right(a)) ? "failed" : new Set(retentionAnswers.map((a) => a.questionId)).size >= need ? "passed" : now >= Date.parse(due) ? "due" : "scheduled";
  const transferRight = ind.some((a) => ["transfer", "original", "challenge"].includes(a.activity) && right(a));
  const assisted = mine.filter((a) => !independentAttempt(a));
  const probed = mine.filter((a) => independentAttempt(a) && !ind.includes(a));
  // Verified on this surface: the shared engine's verification (verification@2, unchanged) AND this skill's own delayed
  // check passed at least RETENTION_DAYS (seven full days) after independent success. The engine alone allows a
  // half-day tolerance (6.5 days) and counts any later fresh answers; this surface never shows green before seven days.
  const verified = profileStatus === "verified" && retention === "passed";
  let status: Status = "not_started";
  if (verified) status = "verified";
  // a missed delayed check (ours), or the shared engine's own retention schedule saying a check failed or is overdue
  else if (retention === "failed" || engineRetention === "failed" || engineRetention === "overdue") status = "review";
  else if (isIndependent) status = transferRight ? "transfer" : "independent";
  else if (assisted.some(right) || ind.some(right) || probed.some(right)) status = "guided";
  else if (mine.length || taught) status = "exposure";
  return {
    id,
    status,
    independentAt,
    retention,
    retentionDueAt: due,
    independent: { right: ind.filter(right).length, total: ind.length },
    assisted: { right: assisted.filter(right).length, total: assisted.length },
    attempts: mine.map((a) => a.id),
    verified,
    engine: profileStatus,
    engineRetention,
  };
}

/** Evidence for every competency and micro-skill that has records (others are not_started). */
export function evidenceFor(learnerId: string, records: LearnerRecords, now: number, graphVersion: GraphVersion = "1.1.0") {
  const ledger = ledgerFor(learnerId, records, graphVersion);
  const at = new Date(now).toISOString();
  const cache = new Map<string, SkillEvidence>();
  const get = (id: string): SkillEvidence => {
    let e = cache.get(id);
    if (!e) {
      const c = graph.byId.get(id);
      const view = c && !c.partOf && records.attempts.some(about(id)) ? sharedProfile({ learnerId }, ledger, id, at) : null;
      const shownAt = view ? leafView(ledger.composite, ledger.ctx.index, id, at).retention.firstDemonstratedAt : null;
      e = skillEvidence(id, records, view?.status ?? "unavailable", now, view?.retention ?? "unavailable", shownAt);
      cache.set(id, e);
    }
    return e;
  };
  return { ledger, get };
}
export const rightAnswer = (a: Attempt) => isCorrect(question(a.questionId), a.response);
