/**
 * The unified learner profile and development plan, rebuilt from the learner's own records.
 *
 * Nothing here is stored. Every value comes from the event log through the existing engine and ledger:
 *
 *   estimate and uncertainty  leafView (the engine), through capabilityProgress (the existing display rule)
 *   shown / confirmed / due   the engine's verification and retention
 *   evidence by kind          the ledger's decisions (accepted, held provisional, held practice, held with help),
 *                             assisted responses and provenance
 *   misconceptions            the engine's misconception record
 *   content available         the app's own bank, lessons and spelling patterns
 *
 * The plan is the core's planDevelopment (subject-neutral); this file builds its inputs, maps each action onto a
 * session the app can actually run, and words it for a child and for a parent. Replaying the same events gives
 * the same profile and plan.
 */
import {
  type CapabilitySnapshot,
  type DevelopmentPlan,
  type DevelopmentRecommendation,
  type EvidenceGap,
  type EvidenceSummary,
  RETENTION,
  STANDING_WORDS,
  type Standing,
  explainPlanChange,
  foundHard,
  improvingInPractice,
  leafView,
  planDevelopment,
  scoreCode,
} from "../../../../packages/english-core/src/index.ts";
import { type AppContent, type Code, GUIDED, activityAllowed } from "./content.ts";
import type { AppEvent, EvidenceTarget } from "./events.ts";
import { type PlanStep, patternTitle, reviewStep, todayPlan } from "./plan.ts";
import { capabilityProgress, type CapabilityProgress } from "./progress.ts";
import { findingLine, misconceptionFindings } from "./misconceptions.ts";
import { type MasteryGate, demonstratedNow, gateHistory, masteryGate, qualifyingAnswers, supportedAtLeast } from "./mastery.ts";
import { MASTERY_GATE } from "./mastery-policy.ts";
import { type Use, evidenceCheckPool, onlyFor, spellingPlan } from "./select.ts";
import { type AppState, fold, placementDone, sessionsOf } from "./state.ts";
import { parentReport } from "./journey.ts";

export interface CapabilityProfile extends CapabilitySnapshot {
  subject: string;
  /** The engine's estimate as the existing Progress screen shows it (certainty, headline, range). */
  estimate: Pick<CapabilityProgress, "certainty" | "headline" | "range" | "verification">;
  /** What has been shown, in plain words (empty when nothing has). */
  strengths: string[];
  /** What was found hard, and patterns the engine has seen in wrong answers. */
  difficulties: string[];
  /** Retention in plain words. */
  retention: string;
  /** Last independent answer (assessment, practice or check) on this capability. */
  lastAssessedAt: string | null;
  /** Content the evidence came from: every independent answer so far is on draft (unreviewed) questions unless validated. */
  basis: { validated: number; draft: number };
  /**
   * For a shown or confirmed capability: "verified" when enough of its independent answers are on educator-approved
   * (validated) questions, otherwise "provisional" (shown on draft questions, not a verified result). Null otherwise.
   * The plan may sequence on a provisional level; nothing presents it as verified. Recomputed from the record.
   */
  mastery: "verified" | "provisional" | null;
  /** Why mastery is provisional (or verified), in words. */
  masteryNote: string | null;
  /**
   * The C′ evidence gate for the level the engine currently demonstrates (null when it demonstrates none). "Shown"
   * needs it to pass; when it does not, `notYetShown` says what is missing and the plan collects it.
   */
  gate: MasteryGate | null;
  /** The engine supports a level, but it is not called shown yet: why, in plain words (null otherwise). */
  notYetShown: string | null;
  /** Shown at a lower level than the engine's estimate: what is missing for the estimate (null otherwise). */
  higherNotYetShown: string | null;
  /**
   * Kept apart: the engine's proposed level now; the highest level the evidence supports now (shown); the highest
   * level it supported at any time (history only); and the level confirmed at a later check.
   */
  levels: { estimated: number | null; demonstrated: number | null; historical: number | null; confirmed: number | null };
  /** Reading: how many different passages the independent answers came from (answers on one passage are not fully independent). */
  passages: number;
  /** For shown or confirmed: the highest level the evidence supports now (levels.demonstrated); always reported with "shown". */
  shownLevel: number | null;
  /** Notes from the plan (for example a possible unmeasured prerequisite). */
  notes: string[];
  /** The plan's recommendation for this capability, if any. */
  next: DevelopmentRecommendation | null;
}

export interface Activity {
  /** Child-facing label: what kind of activity this is. */
  kind: "keep_learning" | "check_learned" | "new_skill" | "show_what_you_know" | "start";
  label: string;
  title: string;
  /** One short line for the child. */
  line: string;
  /** The session the app starts for it. */
  step: PlanStep;
  /** The plan's recommendation behind it (null for a word review). */
  recommendation: DevelopmentRecommendation | null;
}

export interface LearnerProfile {
  at: string;
  capabilities: CapabilityProfile[];
  plan: DevelopmentPlan;
  /** What the child sees on Today (at most three). */
  activities: Activity[];
}

const SUBJECT = "English";
export const CHECK_LENGTH = 4;

const none = (): EvidenceSummary => ({ independent: 0, independentRight: 0, assisted: 0, assistedRight: 0, unknown: 0, provisional: 0, provisionalRight: 0, practiceOnly: 0, afterTeaching: 0, afterTeachingRight: 0, repeats: 0 });

type Collected = { e: EvidenceSummary; ids: string[]; lastAt: string | null; lastPracticeAt: string | null; validated: number; draft: number; passages: Set<string> };

/** Evidence on every capability, by kind, from the ledger's own decisions and assisted responses. */
/**
 * Every answer on a capability, sorted by what it can stand for:
 *
 *   independent     accepted, provenance@1, a fresh question, and not after teaching in the same session
 *   afterTeaching   accepted and unhelped, but in the same session after a lesson on this capability: marked by the
 *                   ledger ("after_teaching"), or, for records made before that mark existed, answered in a session
 *                   that opened with a lesson on this capability. Never relabelled independent.
 *   repeats         a question seen before (the engine keeps it for later checks only)
 *   unknown         accepted with no provenance (recorded before help was tracked)
 *   assisted / provisional / practiceOnly   held by the ledger, as before
 *   samePassage     held by the ledger under passage@1: a reading passage already counted for this capability
 */
function evidenceByCapability(s: AppState, c: AppContent) {
  const out = new Map<string, Collected>();
  const get = (cap: string) => {
    let x = out.get(cap);
    if (!x) out.set(cap, (x = { e: none(), ids: [], lastAt: null, lastPracticeAt: null, validated: 0, draft: 0, passages: new Set() }));
    return x;
  };
  const evidence = new Map(s.ledger.events.filter((e) => e.kind === "evidence").map((e) => [e.id, e]));
  // sessions that opened with a lesson, by the lesson's capability (for records made before the after-teaching mark)
  const lessonSession = (session: string | undefined, cap: string) => {
    const lesson = session ? s.sessions.get(session)?.event.lesson : undefined;
    return !!lesson && lesson.split("#")[0] === cap;
  };
  for (const d of s.ledger.decisions) {
    if (!d.capability || !d.observation || d.observation.kind !== "binary") continue;
    const item = c.ctx.content.items.get(d.observation.item);
    if (!item || item.kind !== "code" || item.target !== d.capability) continue; // direct decisions only
    const x = get(d.capability);
    const right = d.observation.value === 1 ? 1 : 0;
    const source = evidence.get(d.source) as { provenance?: unknown; session?: string } | undefined;
    if (d.verdict === "accepted") {
      if (!source?.provenance) {
        x.e.unknown++;
        continue;
      }
      if (d.observation.exposure === "repeat") {
        x.e.repeats++;
        continue;
      }
      if (d.observation.setting === "after_teaching" || lessonSession(source.session, d.capability)) {
        x.e.afterTeaching++;
        x.e.afterTeachingRight += right;
        x.lastPracticeAt = d.at;
        continue;
      }
      x.e.independent++;
      if (item.passage) x.passages.add(item.passage);
      x.e.independentRight += right;
      x.ids.push(d.source);
      x.lastAt = d.at;
      if (item.evidence_status === "validated") x.validated++;
      else x.draft++;
    } else if (d.verdict === "held") {
      if (d.observation.samePassage) {
        // passage@1: a second answer on a passage already counted for this skill; kept for diagnosis, not counted
        x.e.samePassage = (x.e.samePassage ?? 0) + 1;
        x.e.samePassageRight = (x.e.samePassageRight ?? 0) + right;
      } else if (item.evidence_status === "provisional" && d.reasons.some((r) => r.includes("provisional item"))) {
        x.e.provisional++;
        x.e.provisionalRight += right;
      } else if (item.generated && !item.generated.checked) x.e.practiceOnly++;
      else {
        x.e.assisted++;
        x.e.assistedRight += right;
      }
    }
  }
  for (const e of s.ledger.events) {
    if (e.kind !== "assisted_response") continue;
    const item = c.ctx.content.items.get(e.item.id);
    if (!item || item.kind !== "code") continue;
    const x = get(item.target);
    x.e.assisted++;
    x.e.assistedRight += scoreCode(item, e.response).correct ? 1 : 0;
  }
  return out;
}

/** Unseen questions the app can ask on a capability: the hand-written bank, not provisional or generated items. */
function unseenQuestions(s: AppState, c: AppContent, cap: string, use: Use = "assess"): number {
  const allowed = onlyFor(s, c, use);
  return [...(c.ctx.content.byCapability.get(cap) ?? [])].filter((i) => allowed.has(i.id) && !s.ledger.exposures.has(i.id)).length;
}

/** Does this capability have questions reserved by purpose (the pilot)? Then confirmation and later checks use their own pools. */
const hasPools = (c: AppContent, cap: string) => c.pilot.capabilities.includes(cap);

/** A teaching activity the app can deliver for a capability: a spelling pattern with words left, or a grammar/vocabulary lesson. */
function teachingFor(s: AppState, c: AppContent, cap: string, now: string, speech: boolean): { title: string; step: PlanStep } | null {
  if ((GUIDED.spelling as readonly string[]).includes(cap)) {
    const p = spellingPlan(s, c, now, speech).find((x) => x.cap === cap && x.status !== "ready_for_check");
    if (!p) return null;
    const title = patternTitle(c, p.cap, p.step);
    return { title: `Spelling lesson and practice: ${title}`, step: { type: "spelling_practice", title: `Spelling: ${title}`, reason: "", capability: p.cap, step: p.step } };
  }
  const lessons = [...c.lessons.values()].filter((l) => l.capability === cap);
  if (!lessons.length) return null;
  const name = c.index.names.get(cap) ?? cap;
  if ([...GUIDED.grammar, ...GUIDED.vocabulary].includes(cap as never)) return { title: `Lesson and practice: ${name}`, step: { type: "guided", title: name, reason: "", capability: cap } };
  // other capabilities with lessons (the pilot's reading sequence): the next lesson not yet read, in order
  const lesson = lessons.find((l) => !s.lessons.has(l.id)) ?? lessons.at(-1)!;
  return { title: `Lesson and practice: ${lesson.title}`, step: { type: "guided", title: name, reason: "", capability: cap, lesson: lesson.id } };
}

/** Spelling: words of a pattern misspelt in the spelling check, or a recent mistake pointing to it (practice-only answers). */
function practiceSignal(s: AppState, c: AppContent, cap: string, now: string, speech: boolean): string | null {
  if (!(GUIDED.spelling as readonly string[]).includes(cap)) return null;
  const p = spellingPlan(s, c, now, speech).find((x) => x.cap === cap && x.reasons.some((r) => /misspelt|mistake/.test(r)));
  if (!p) return null;
  return `${patternTitle(c, p.cap, p.step)}: ${p.reasons.find((r) => /misspelt|mistake/.test(r))}`;
}

/**
 * The standing, from the engine's verification and the evidence by kind. "Shown" and "confirmed" also need at least
 * the framework's demonstrated_min_direct qualifying (independent) answers: an engine demonstration that could rest
 * on answers recorded before after-teaching tracking, or without provenance, is not reported as shown.
 */
function standingOf(v: ReturnType<typeof leafView>, x: Collected, certainty: CapabilityProgress["certainty"], minDirect: number, demonstratedOutsideLessons: boolean, supported: boolean, shownBefore: boolean, retainedSinceClaim: boolean): Standing {
  const e = x.e;
  // never "shown" while the learner's own answers say the opposite: the engine can support a low level after wrong
  // answers on harder questions (its prior), but a parent reading "shown" after 0 of 4 right would be misled
  const qualified = e.independent >= minDirect && demonstratedOutsideLessons && !foundHard(e);
  switch (v.verification.status) {
    // a later check is reported only for a claim that passed the evidence gate when it was made
    case "failed":
      if (shownBefore) return "not_kept";
      break;
    case "overdue":
      if (shownBefore) return "check_due";
      break;
    // C′: shown (or confirmed, after a passed later check) only if the gate supports a level now, at or below the
    // engine's. Confirmed also needs the passed later check to come at least the retention gap after the first claim
    // the gate supported (the engine counts from its own first demonstration, which the gate may not have supported).
    case "verified":
      if (qualified && supported) return retainedSinceClaim ? "confirmed" : "shown";
      break;
    case "demonstrated":
      if (qualified && supported) return "shown";
      break;
  }
  if (e.independent + e.unknown + e.afterTeaching === 0) return "not_checked";
  // practice straight after a lesson, more recent than any independent answer: improving, awaiting confirmation
  if (improvingInPractice(e) && (x.lastAt === null || (x.lastPracticeAt ?? "") > x.lastAt)) return "improving";
  if (foundHard(e)) return "found_hard";
  if (e.independent === 0) return "uncertain";
  return certainty === "measured" ? "developing" : "uncertain";
}

const strandOf = (c: AppContent, id: string) => {
  let n: string | undefined = id;
  while (n && c.index.parent.get(n) !== "EN") n = c.index.parent.get(n);
  return c.index.names.get(n ?? "EN") ?? "";
};

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

/** Build the profile: capability snapshots, the plan, and Today's activities. */
export function learnerProfile(s: AppState, c: AppContent, now: string, speech = false, opts: { activities?: boolean } = {}): LearnerProfile {
  const progress = new Map(capabilityProgress(s, c, now).map((r) => [r.id, r]));
  const ev = evidenceByCapability(s, c);
  const findings = misconceptionFindings(s, c);
  const doubling = parentReport(s, c, now);
  const teach = new Map<string, { title: string; step: PlanStep } | null>();
  const snapshots: CapabilityProfile[] = [];
  c.index.leafIds.forEach((id, order) => {
    const pr = progress.get(id);
    if (!pr) return; // specified capabilities only
    const v = pr.view;
    const x = ev.get(id) ?? { e: none(), ids: [], lastAt: null, lastPracticeAt: null, validated: 0, draft: 0, passages: new Set<string>() };
    // an engine demonstration counts here only if it happened in a session with no lesson on this capability
    const lessonOn = (session: string) => (s.sessions.get(session)?.event.lesson ?? "").split("#")[0] === id;
    const node = s.ledger.composite.nodes[id];
    const outside = node.demonstrations.some((d) => !lessonOn(d.session));
    const policy = c.index.framework.policy;
    const ver = v.verification;
    // C′. The engine proposes a level (estimated); the gate finds the highest level at or below it that the recent
    // evidence supports now (demonstrated now); its verdicts over time give the history and the retention start.
    const estimate = ver.currentLevel;
    const answers = estimate !== null || ver.historicalLevel !== null ? qualifyingAnswers(s, c, id) : [];
    const singleFormatAt = (at: string) => new Set(answers.filter((a) => a.at <= at).map((a) => a.format)).size < policy.demonstrated_min_contexts;
    const singleNow = (node.qualifyingContexts ?? node.contexts).length < policy.demonstrated_min_contexts;
    const supported = estimate !== null ? demonstratedNow(s, c, id, estimate, now, singleNow, answers) : null;
    const atEstimate = estimate === null ? null : supported?.level === estimate ? supported : masteryGate(s, c, id, estimate, now, singleNow, answers);
    const history = ver.historicalLevel !== null ? gateHistory(s, c, id, now, singleFormatAt) : { claims: [], first: null, highest: null };
    // a later check due or failed is reported only for a level the gate supported (within the engine's retention tolerance)
    const late = ver.status === "overdue" || ver.status === "failed";
    // a check that is due is a fact about time: reported whenever the gate supported any level before (the pupil was
    // shown at that level). A failed check is judged by the engine at its retained level, so "not kept" is reported
    // only when the gate supported a level within the engine's retention tolerance of it.
    const retainedClaim =
      ver.status === "overdue" ? history.first !== null : ver.status === "failed" && v.retention.level !== null && supportedAtLeast(history, v.retention.level - RETENTION.tolerance);
    // a later check is due (or failed) on a level the gate never supported: that level is still only a claim to test
    const unsupported = late && !retainedClaim ? (v.retention.level ?? ver.historicalLevel) : null;
    // the gate reported for the skill: at the engine's estimate (what is missing for it), or the unsupported late claim
    const gate = atEstimate ?? (unsupported !== null ? masteryGate(s, c, id, unsupported, now, singleNow, answers) : null);
    // confirmed: the highest level, up to the one shown now, that the gate supported at least the retention gap before
    // the passed later check (a level first supported in the check itself is shown, not yet confirmed)
    const gapMs = (policy.mastery_gap_days - 0.5) * 86_400_000;
    const confirmable =
      supported && ver.verifiedAt
        ? history.claims.filter((k) => k.supported !== null && Date.parse(ver.verifiedAt!) - Date.parse(k.at) >= gapMs).reduce<number | null>((m, k) => Math.max(m ?? -Infinity, Math.min(k.supported!, supported.level)), null)
        : null;
    const standing = standingOf(v, x, pr.certainty, policy.demonstrated_min_direct, outside, supported !== null, retainedClaim, confirmable !== null);
    const confirmedLevel = standing === "confirmed" ? confirmable : null;
    // the first check is due the retention gap after the first supported claim (or the engine's own date, if later)
    const firstCheckDue = history.first ? [v.retention.dueAt ?? "", new Date(Date.parse(history.first.at) + policy.mastery_gap_days * 86_400_000).toISOString()].sort().at(-1)! : v.retention.dueAt;
    const t = teachingFor(s, c, id, now, speech);
    teach.set(id, t);
    const strengths: string[] = [];
    const shownNow = standing === "shown" || standing === "confirmed";
    const verifiedNeeds = policy.demonstrated_min_direct;
    // verified: the answers behind the claim are on educator-approved questions (overall, and the right answers at level)
    const shownLevel = shownNow ? supported!.level : null;
    const shownAndConfirmed = confirmedLevel !== null && confirmedLevel < shownLevel! ? `, at about level ${shownLevel} of 8, and still right at a later check at about level ${confirmedLevel}` : `, at about level ${shownLevel} of 8`;
    const validatedAtLevel = shownNow ? supported!.atLevel.filter((a) => a.validated).length : 0;
    const mastery = shownNow ? (x.validated >= verifiedNeeds && validatedAtLevel >= MASTERY_GATE.atLevelMin ? "verified" : "provisional") : null;
    const masteryNote = !shownNow
      ? null
      : mastery === "verified"
        ? `Verified: ${x.validated} of the independent answers, and ${validatedAtLevel} of the right answers at the level shown, are on educator-approved questions.`
        : `Provisional: shown on draft questions that an educator has not yet approved (${x.validated} of the ${verifiedNeeds} independent answers, and ${validatedAtLevel} of the ${MASTERY_GATE.atLevelMin} right answers at level, on approved questions are needed for a verified result).`;
    const notYetShown = gate && !gate.passed && !shownNow ? `The estimate supports about level ${gate.level}, but it is not called shown yet: ${gate.missing.join(" ")}` : null;
    // shown at a lower level than the estimate: the lower level stands, the higher one is still to be shown
    const higherNotYetShown = shownNow && atEstimate && !atEstimate.passed ? `Shown now at about level ${shownLevel}. The estimate suggests about level ${atEstimate.level}, which is not shown yet: ${atEstimate.missing.join(" ")}` : null;
    if (shownNow)
      strengths.push(
        mastery === "verified"
          ? `${standing === "confirmed" && confirmedLevel === shownLevel ? "Shown on their own, and still right at a later check" : "Shown on their own, on fresh questions"}${shownAndConfirmed} (a level shown, not a ceiling: harder questions may still be wrong). Verified on educator-approved questions.`
          : `Provisionally shown on their own${standing === "confirmed" && confirmedLevel === shownLevel ? ", and still right at a later check" : ", on fresh questions"}${shownAndConfirmed}: on draft questions not yet approved by an educator, so not a verified result.`,
      );
    // history, labelled as history: a higher level the gate supported earlier is never presented as current
    if (shownNow && history.highest && history.highest.level > shownLevel!) strengths.push(`Earlier shown at about level ${history.highest.level} (${day(history.highest.at)}): history, not a current result.`);
    // never claimed when the learner's own answers were mostly wrong (the engine's floor can "demonstrate" level 1
    // from wrong answers alone): the same rule as for "shown" (PC-11)
    if (history.highest && standing !== "shown" && standing !== "confirmed" && standing !== "found_hard" && x.e.independentRight * 2 >= x.e.independent) strengths.push(`Shown earlier, at about level ${history.highest.level} (${day(history.highest.at)}); not currently shown: ${standing === "check_due" ? "a later check is due" : standing === "not_kept" ? "it was not kept at the later check" : "the recent evidence does not support it now"}.`);
    const difficulties: string[] = [];
    if (standing === "improving")
      strengths.push(`Improving in practice straight after a lesson (${x.e.afterTeachingRight} of ${x.e.afterTeaching} right). Not yet shown on their own: fresh questions without help come next.`);
    if (standing === "found_hard") difficulties.push(`Found hard so far: ${x.e.independentRight} of ${x.e.independent} right on their own.`);
    if (x.e.afterTeaching > 0 && standing !== "improving")
      difficulties.push(`Practice straight after a lesson: ${x.e.afterTeachingRight} of ${x.e.afterTeaching} right. Recorded, but it never counts as shown on their own.`);
    // one wrong answer is a suspicion, not a pattern: say which (misconceptions.ts); a resolved one is not a difficulty
    for (const m of v.misconceptions) {
      const f = findings.find((x) => x.capability === id && x.misconception === m.id);
      // resolved, or seen only in practice (nothing counted): not a difficulty to report
      const line = f ? findingLine(f) : null;
      if (line) difficulties.push(line);
    }
    // a misconception the engine no longer holds active, but that is not resolved by the stricter rule, stays visible
    for (const f of findings) if (f.capability === id && !v.misconceptions.some((m) => m.id === f.misconception) && (f.status === "improving" || f.status === "resolved_below")) {
      const line = findingLine(f);
      if (line) difficulties.push(line);
    }
    const paused = id === c.journey.capability && doubling.support ? `Doubling letters: ${doubling.support}` : null;
    if (id === c.journey.capability && doubling.started) difficulties.push(`Doubling letters (provisional questions, not counted): ${doubling.status}`);
    const retention =
      standing === "not_kept"
        ? `Not kept: the later check on ${day(v.retention.lastFailedAt)} did not confirm it.`
        : standing === "check_due"
          ? `A check was due on ${day(v.retention.dueAt)}.`
          : standing === "confirmed"
            ? `Confirmed on ${day(ver.verifiedAt)}; next check from ${day(v.retention.dueAt)}.`
            : standing === "shown"
              ? `First check from ${day(firstCheckDue)}.`
              : "Not applicable yet: it first needs to be shown.";
    snapshots.push({
      id,
      name: v.name,
      strand: strandOf(c, id),
      subject: SUBJECT,
      order,
      standing,
      evidence: x.e,
      evidenceIds: x.ids.slice(-5),
      lastAt: x.lastAt,
      content: {
        assess: unseenQuestions(s, c, id),
        ...(hasPools(c, id) ? { confirm: unseenQuestions(s, c, id, "confirm"), retain: unseenQuestions(s, c, id, "retention") } : {}),
        teach: t?.title ?? null,
        practiceSignal: practiceSignal(s, c, id, now, speech),
      },
      paused,
      // the engine's own status line claims a band; when the evidence gate does not support it, say that instead
      estimate: { certainty: pr.certainty, headline: pr.headline, range: pr.range, verification: notYetShown ?? (shownNow ? `${confirmedLevel !== null ? `Confirmed at about level ${confirmedLevel}` : "Not yet confirmed at a later check"}; shown now at about level ${shownLevel}.` : pr.verification) },
      strengths,
      difficulties,
      retention,
      lastAssessedAt: v.lastDirectAt ?? x.lastAt,
      basis: { validated: x.validated, draft: x.draft },
      mastery,
      masteryNote,
      gate,
      notYetShown,
      higherNotYetShown,
      levels: { estimated: estimate, demonstrated: shownLevel, historical: history.highest?.level ?? null, confirmed: confirmedLevel },
      shownLevel,
      passages: x.passages.size,
      notes: [],
      next: null,
      // the plan collects what is missing: for a level not shown at all, or for the estimate above a level shown
      evidenceGap: !shownNow ? (gate && !gate.passed && gate.next ? evidenceGapOf(s, c, id, gate, !!t, null) : null) : atEstimate && !atEstimate.passed && atEstimate.next ? evidenceGapOf(s, c, id, atEstimate, false, shownLevel) : null,
    });
  });
  const plan = planDevelopment({ capabilities: snapshots, requires: c.index.requires });
  for (const p of snapshots) {
    p.notes = plan.notes[p.id] ?? [];
    p.next = plan.all.find((r) => r.capability === p.id) ?? null;
  }
  return { at: now, capabilities: snapshots, plan, activities: opts.activities === false ? [] : activities(s, c, now, speech, plan, snapshots, teach).filter((a) => activityAllowed(c, a.step.type)) };
}

/** The purpose of an evidence check: the fresh check after teaching, or another look. */
const gatePurpose = (g: MasteryGate): "assess" | "confirm" => (g.next?.kind === "fresh_check" && g.superseded > 0 ? "confirm" : "assess");

/**
 * The evidence check that can fill a gate's gap: the difficulty range. Above a level already shown, always the
 * at-level range of the higher claim (a slip probe below it would ask questions easier than the level shown).
 */
function gateTarget(g: MasteryGate, shownBelow: number | null = null): EvidenceTarget {
  const n = g.next!;
  if (shownBelow !== null) return { atLeast: g.level - MASTERY_GATE.atLevelBelow, atMost: g.level + MASTERY_GATE.diagnosticAbove, ...(n.kind === "diagnostic" && n.avoidPatterns?.length ? { avoidPatterns: n.avoidPatterns } : {}), why: `level ${shownBelow} is shown; new questions at difficulty ${g.level - MASTERY_GATE.atLevelBelow} to ${g.level + MASTERY_GATE.diagnosticAbove} can show level ${g.level}` };
  if (n.kind === "practice") return { atLeast: g.level - MASTERY_GATE.atLevelBelow, atMost: g.level + MASTERY_GATE.diagnosticAbove, why: n.why };
  return { ...(n.atLeast !== undefined ? { atLeast: Math.round(n.atLeast * 100) / 100 } : {}), ...(n.atMost !== undefined ? { atMost: Math.round(n.atMost * 100) / 100 } : {}), ...(n.kind === "diagnostic" && n.avoidPatterns?.length ? { avoidPatterns: n.avoidPatterns } : {}), why: n.why };
}

/** For the plan: what is missing and how many unused questions can fill it (practice falls back to a check without a lesson). */
function evidenceGapOf(s: AppState, c: AppContent, cap: string, g: MasteryGate, canTeach: boolean, shownBelow: number | null): EvidenceGap {
  const aboveShown = shownBelow !== null;
  const n = g.next!;
  const kind = n.kind === "practice" && canTeach ? "practice" : n.kind === "practice" ? "diagnostic" : n.kind;
  const pool = evidenceCheckPool(s, c, cap, gateTarget(g, shownBelow), gatePurpose(g));
  const range = `${Math.round((g.level - MASTERY_GATE.atLevelBelow) * 100) / 100} to ${g.level + MASTERY_GATE.diagnosticAbove}`;
  // practice was the next step, but there is no lesson (or a lower level is already shown): new questions at the level
  const why =
    aboveShown
      ? gateTarget(g, shownBelow).why
      : n.kind === "practice"
        ? `${n.why.replace(/: practice comes before another check$/, "")}; ${aboveShown ? "a lower level is shown, so" : "there is no lesson for it in the app, so"} new questions at difficulty ${range} instead`
      : n.why;
  return { level: g.level, kind, missing: g.missing.join(" "), why, available: pool.items.length, ...(shownBelow !== null ? { shownBelow } : {}) };
}

/** The session for an evidence check on a capability (null when nothing can be asked). */
function evidenceStep(s: AppState, c: AppContent, cap: CapabilityProfile): PlanStep | null {
  const g = cap.gate;
  if (!g || g.passed || !g.next) return null;
  const target = gateTarget(g, cap.levels.demonstrated);
  const purpose = gatePurpose(g);
  const pool = evidenceCheckPool(s, c, cap.id, target, purpose);
  if (!pool.items.length) return null;
  const title = `${areaWord(cap.id)}: ${cap.name}`;
  return pool.type === "spelling_assess"
    ? { type: "spelling_assess", title: `${title}: hear and spell`, reason: "A few new words at your level, to show it on your own.", capability: cap.id, purpose, target }
    : { type: "check", title, reason: "A few new questions at your level, to show it on your own.", capability: cap.id, purpose, target };
}

/** Short, child-friendly area names. */
export function areaWord(id: string): string {
  if (id.startsWith("EN.FND.SPL")) return "Spelling";
  const words: Record<string, string> = { "EN.FND": "Reading basics", "EN.VOC": "Words", "EN.GRM": "Grammar", "EN.SEN": "Sentences", "EN.RDG": "Reading", "EN.WRT": "Writing", "EN.LIS": "Listening", "EN.SPK": "Speaking" };
  return words[id.split(".").slice(0, 2).join(".")] ?? "English";
}

const CHILD: Record<Activity["kind"], string> = {
  start: "Let's begin",
  keep_learning: "Keep learning",
  check_learned: "Check something you learned",
  new_skill: "Try a new skill",
  show_what_you_know: "Show what you know",
};

/** Map the plan onto sessions the app can run, worded for a child. Nothing is offered that cannot be delivered. */
function activities(s: AppState, c: AppContent, now: string, speech: boolean, plan: DevelopmentPlan, caps: CapabilityProfile[], teach: Map<string, { title: string; step: PlanStep } | null>): Activity[] {
  // the initial assessment is the existing starting point: placement, then the spelling check (dictation)
  // too little evidence anywhere (for example a starting point stopped after a few answers): the starting point again
  const first = plan.today.find((r) => r.action === "initial_assessment");
  if (first)
    return [
      {
        kind: "start",
        label: CHILD.start,
        title: "Find your starting point",
        line: "A few questions on spelling, grammar and words, so the plan starts in the right place. You can stop and carry on later.",
        step: { type: "placement", title: "Find your starting point", reason: first.why },
        recommendation: first,
      },
    ];
  const initial = todayPlan(s, c, now, speech);
  if (!placementDone(s) || (initial[0]?.type === "spelling_assess" && !sessionsOf(s, "spelling_assess").some((x) => !x.event.capability && x.end?.reason === "finished")))
    return initial.slice(0, 1).map((step) => ({ kind: "start", label: CHILD.start, title: step.title, line: step.reason, step, recommendation: plan.today.find((r) => r.action === "initial_assessment") ?? null }));
  const name = (id: string) => caps.find((x) => x.id === id)!;
  const out: (Activity & { priority: number })[] = [];
  for (const r of plan.today) {
    if (!r.capability) continue;
    const cap = name(r.capability);
    const area = areaWord(cap.id);
    const check = (kind: Activity["kind"], line: string, purpose: "assess" | "confirm" | "retention"): Activity & { priority: number } => ({
      kind,
      label: CHILD[kind],
      title: `${area}: ${cap.name}`,
      line,
      step: { type: "check", title: `${area}: ${cap.name}`, reason: line, capability: cap.id, purpose },
      recommendation: r,
      priority: r.priority,
    });
    switch (r.action) {
      case "teach":
      case "teach_prerequisite":
      case "continue":
      case "refresh": {
        const t = teach.get(r.capability);
        if (t) out.push({ kind: "keep_learning", label: CHILD.keep_learning, title: t.step.title, line: r.action === "refresh" ? "A quick refresher on something you learned before." : "A short lesson, then practice.", step: { ...t.step, reason: r.why }, recommendation: r, priority: r.priority });
        else out.push(check("check_learned", "Something you learned before: a few new questions.", "retention"));
        break;
      }
      case "retention_check":
        out.push(check("check_learned", "Something you learned before: let's see if it has stuck.", "retention"));
        break;
      case "confirm":
        out.push(check("show_what_you_know", "New questions on what you just practised, on your own.", "confirm"));
        break;
      case "evidence_check": {
        // C′: questions at the difficulty that can fill the gap, by dictation where the skill has unused words
        const step = evidenceStep(s, c, cap);
        if (step) out.push({ kind: "show_what_you_know", label: CHILD.show_what_you_know, title: step.title, line: step.reason, step: { ...step, reason: r.why }, recommendation: r, priority: r.priority });
        break;
      }
      case "assess":
      case "next_capability":
        out.push(check("new_skill", "Something new: a few questions to see what you already know.", "assess"));
        break;
      default:
        out.push(check("show_what_you_know", "A few questions on your own, to see where you are.", "assess"));
    }
  }
  // word review: misspelt words due again, and words spelt right a few days ago due a check (one implementation: plan.ts)
  const step = reviewStep(s, c, now, speech);
  if (step) out.push({ kind: "check_learned", label: CHILD.check_learned, title: step.title, line: step.reason, step, recommendation: null, priority: 89 });
  return out
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map(({ priority: _p, ...a }) => a);
}

// ------------------------------------------------------------------ over time

/** The record up to (not including) the start of the latest finished session: "before the last activity". */
export function beforeLastActivity(events: AppEvent[]): AppEvent[] | null {
  const ends = events.filter((e) => e.kind === "session_end");
  const last = ends.at(-1);
  if (!last) return null;
  const start = events.findIndex((e) => e.kind === "session" && e.session === last.session);
  return start > 0 ? events.slice(0, start) : null;
}

const RANK: Partial<Record<Standing, number>> = { found_hard: 0, uncertain: 1, improving: 1.5, developing: 2, shown: 3, confirmed: 4 };

export interface ParentOverview {
  /** Demonstrated independently: shown (or confirmed) on fresh questions without help. */
  shown: CapabilityProfile[];
  /** Improving during practice straight after a lesson, awaiting confirmation on fresh questions. */
  improving: CapabilityProfile[];
  /** Insufficient evidence: some answers, not enough to say; or measured but not yet shown. */
  uncertain: CapabilityProfile[];
  hard: CapabilityProfile[];
  /** Needed help: answers given with hints, second tries or guided help. */
  helped: CapabilityProfile[];
  /** Due for a later (retention) check. */
  due: CapabilityProfile[];
  /** Not retained at a later check. */
  notKept: CapabilityProfile[];
  notChecked: CapabilityProfile[];
  /** Change over time, from the record itself; never a claim about what caused it. */
  improved: string[];
  /** Why the plan is what it is now, compared with before the last activity. */
  changes: string[];
  provisional: string[];
}

/** The parent-facing overview. `previous` is the profile rebuilt from the record before the last activity. */
export function parentOverview(p: LearnerProfile, previous: LearnerProfile | null, first: Map<string, { standing: Standing; at: string }>): ParentOverview {
  const caps = p.capabilities;
  const improved: string[] = [];
  for (const cap of caps) {
    const was = first.get(cap.id);
    const a = was === undefined ? undefined : RANK[was.standing];
    const b = RANK[cap.standing];
    if (a !== undefined && b !== undefined && b > a) improved.push(`${cap.name}: ${STANDING_WORDS[was!.standing]} on ${was!.at.slice(0, 10)}, ${STANDING_WORDS[cap.standing]} now.`);
  }
  const provisional = caps.filter((x) => x.evidence.provisional > 0).map((x) => `${x.name}: ${x.evidence.provisionalRight} of ${x.evidence.provisional} right on provisional questions. These are shown for information and never count towards a level.`);
  return {
    shown: caps.filter((x) => x.standing === "shown" || x.standing === "confirmed"),
    improving: caps.filter((x) => x.standing === "improving"),
    uncertain: caps.filter((x) => x.standing === "uncertain" || x.standing === "developing"),
    hard: caps.filter((x) => x.standing === "found_hard"),
    helped: caps.filter((x) => x.evidence.assisted > 0),
    due: caps.filter((x) => x.standing === "check_due"),
    notKept: caps.filter((x) => x.standing === "not_kept"),
    notChecked: caps.filter((x) => x.standing === "not_checked"),
    improved,
    changes: previous ? explainPlanChange({ plan: previous.plan, capabilities: previous.capabilities }, { plan: p.plan, capabilities: p.capabilities }) : ["This is the first plan: there is no earlier activity to compare with."],
    provisional,
  };
}

/** Each capability's lowest standing after any earlier activity (from the record, session by session): the baseline for "improved". */
export function firstStandings(c: AppContent, events: AppEvent[]): Map<string, { standing: Standing; at: string }> {
  const out = new Map<string, { standing: Standing; at: string }>();
  const ends = events.map((e, i) => (e.kind === "session_end" ? i : -1)).filter((i) => i >= 0);
  for (const i of ends) {
    const prefix = events.slice(0, i + 1);
    const s = fold(c, prefix);
    const at = prefix[i].at;
    for (const cap of learnerProfile(s, c, at, false, { activities: false }).capabilities) {
      const r = RANK[cap.standing];
      if (r === undefined) continue;
      const prev = out.get(cap.id);
      if (!prev || r < (RANK[prev.standing] ?? Infinity)) out.set(cap.id, { standing: cap.standing, at });
    }
  }
  return out;
}

export type { Code };
