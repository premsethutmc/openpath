/**
 * Development plan V1: a few next actions for one learner, across capabilities.
 *
 * A pure, deterministic, subject-neutral function. It does not score anything and keeps no learner model of
 * its own. It reads one snapshot per capability, built by the caller from the existing records (the engine's
 * estimate and verification, the ledger's decisions and provenance, the content still available), plus the
 * framework's prerequisite edges. It returns ranked recommendations, each saying what, why, which evidence,
 * what would change it, and whether the app has the content to deliver it.
 *
 * Missing evidence is never read as weakness: a capability with no answers is "not checked", and the only
 * action it can lead to is a check. A difficulty needs independent answers on reviewed or candidate content;
 * answers given with help, and answers on provisional content, are shown but never make a capability
 * "shown" or "hard".
 *
 * All values in DEVELOPMENT_POLICY_DRAFT are draft defaults for review, not claims about what works.
 */
import { betaCdf } from "./rule-evidence.ts";

/**
 * Where the evidence on a capability stands, in plain categories (derived by the caller from the engine):
 * not_checked: no independent answers; uncertain: some, not enough to say; developing: measured, not yet
 * shown; found_hard: most independent answers wrong; shown / confirmed: the engine's demonstrated / verified;
 * check_due: a retention check is overdue; not_kept: the latest retention check failed; improving: right in
 * practice straight after a lesson, awaiting independent confirmation on fresh questions (never "shown").
 */
export type Standing = "not_checked" | "uncertain" | "developing" | "found_hard" | "improving" | "shown" | "confirmed" | "check_due" | "not_kept";

export interface EvidenceSummary {
  /**
   * Qualifying independent answers: first answers, no help, fresh (not repeated) questions on reviewed or candidate
   * content, and not after teaching in the same session. Only these can establish "shown".
   */
  independent: number;
  independentRight: number;
  /** Answers given with help: hints, second tries, guided practice. Recorded, never evidence of independence. */
  assisted: number;
  assistedRight: number;
  /** Answers recorded before help was tracked: whether help was given is unknown. */
  unknown: number;
  /** Independent answers on provisional (unreviewed demonstration) content: shown, never counted. */
  provisional: number;
  provisionalRight: number;
  /** Answers on practice-only content (generated words not yet checked). */
  practiceOnly: number;
  /** First answers without help, given in the same session after a lesson on this capability: improvement, not independence. */
  afterTeaching: number;
  afterTeachingRight: number;
  /** Repeated questions: kept for later checks, never new evidence. */
  repeats: number;
  /** Answers on a reading passage already counted for this capability (passage@1): kept for diagnosis, not counted. Optional: absent means none. */
  samePassage?: number;
  samePassageRight?: number;
}

export interface CapabilitySnapshot {
  id: string;
  name: string;
  /** The strand (area) it belongs to, for breadth and grouping. */
  strand: string;
  /** Framework order, for deterministic tie-breaks. */
  order: number;
  standing: Standing;
  evidence: EvidenceSummary;
  /** The latest independent evidence ids behind the standing (most recent last). */
  evidenceIds: string[];
  lastAt: string | null;
  content: {
    /** Unseen questions the app can ask on this capability for a first or another look (reviewed or candidate). */
    assess: number;
    /** Unseen questions reserved for the fresh check after teaching, when the capability has reserved pools (else assess applies). */
    confirm?: number;
    /** Unseen questions reserved for a later (retention) check, when the capability has reserved pools (else assess applies). */
    retain?: number;
    /** A teaching activity the app can deliver (its title), or null when there is none. */
    teach: string | null;
    /**
     * A reason to practise from practice-only answers (for example words misspelt in a spelling check on
     * unchecked words). It can choose practice; it never sets a standing or supports a claim.
     */
    practiceSignal?: string | null;
  };
  /** A finer-grained activity for this capability has paused and asked for an adult (its reason), if any. */
  paused?: string | null;
}

export type DevelopmentAction =
  | "initial_assessment"
  | "refresh"
  | "retention_check"
  | "check_prerequisite"
  | "teach_prerequisite"
  | "teach"
  | "independent_check"
  | "confirm"
  | "reassess"
  | "continue"
  | "next_capability"
  | "assess"
  | "human_review";

export interface DevelopmentRecommendation {
  action: DevelopmentAction;
  /** The capability acted on (null only for the initial assessment). */
  capability: string | null;
  /** For prerequisite actions: the capability whose difficulty led here. */
  because?: string;
  priority: number;
  /** 1. What OpenPath recommends. */
  what: string;
  /** 2. Why. */
  why: string;
  /** 3. The learner evidence behind it (by capability, with event ids). */
  evidence: { capability: string; summary: string; ids: string[] }[];
  /** 4. What outcome would change it. */
  changeIf: string;
  /** 5. Whether the app can deliver it now. */
  content: { available: boolean; note: string };
}

export interface DevelopmentPolicy {
  version: string;
  /** Activities offered at once. */
  maxActions: number;
  /** Fewer independent answers than this, across everything: start with the initial assessment. */
  initialAssessmentMinIndependent: number;
  /** "Found hard": at least this many independent answers… */
  hardMinAnswers: number;
  /** …and P(rate < hardRate) ≥ hardProbability under Beta(1 + right, 1 + wrong) (the rule-evidence draft's "weak" test). */
  hardRate: number;
  hardProbability: number;
  /** "Mostly with help": at least this many assisted answers and at most this many independent right. */
  assistedMin: number;
  assistedMaxIndependentRight: number;
}

export const DEVELOPMENT_POLICY_DRAFT: DevelopmentPolicy = {
  version: "development-policy@0-draft",
  maxActions: 3,
  initialAssessmentMinIndependent: 6,
  hardMinAnswers: 3,
  hardRate: 0.5,
  hardProbability: 0.8,
  assistedMin: 4,
  assistedMaxIndependentRight: 1,
};

/** Is this capability "found hard" on its independent answers? (Used by the caller to set the standing.) */
export function foundHard(e: Pick<EvidenceSummary, "independent" | "independentRight">, p: DevelopmentPolicy = DEVELOPMENT_POLICY_DRAFT): boolean {
  if (e.independent < p.hardMinAnswers) return false;
  return betaCdf(p.hardRate, 1 + e.independentRight, 1 + e.independent - e.independentRight) >= p.hardProbability;
}

/**
 * Right in practice straight after a lesson: the same draft test as "found hard", the other way round
 * (at least hardMinAnswers answers and P(rate > hardRate) ≥ hardProbability). It shows improvement only.
 */
export function improvingInPractice(e: Pick<EvidenceSummary, "afterTeaching" | "afterTeachingRight">, p: DevelopmentPolicy = DEVELOPMENT_POLICY_DRAFT): boolean {
  if (e.afterTeaching < p.hardMinAnswers) return false;
  return betaCdf(p.hardRate, 1 + e.afterTeaching - e.afterTeachingRight, 1 + e.afterTeachingRight) >= p.hardProbability;
}

/** The standings in the words a parent reads. */
export const STANDING_WORDS: Record<Standing, string> = {
  not_checked: "not checked yet (no answers)",
  uncertain: "not enough evidence yet",
  developing: "measured, not yet shown on their own",
  found_hard: "found hard so far",
  improving: "improving in practice, awaiting confirmation",
  shown: "shown on their own, on fresh questions",
  confirmed: "shown, and still right at a later check",
  check_due: "due for a later check",
  not_kept: "not kept at a later check",
};

export interface DevelopmentInput {
  capabilities: CapabilitySnapshot[];
  /** Framework prerequisite edges: capability → the capabilities it requires. */
  requires: ReadonlyMap<string, readonly string[]>;
  policy?: DevelopmentPolicy;
}

export interface DevelopmentPlan {
  policy: string;
  /** For the learner: deliverable activities, highest priority first, at most maxActions, one per capability, spread over areas. */
  today: DevelopmentRecommendation[];
  /** For an adult: what needs a person or more content (not shown to the learner). */
  forAdults: DevelopmentRecommendation[];
  /** Every candidate considered, ranked, for the explanation of changes. */
  all: DevelopmentRecommendation[];
  /** Per capability: notes such as "may reflect an unmeasured prerequisite". */
  notes: Record<string, string[]>;
}

const answers = (n: number, right: number) => `${right} of ${n} right`;

/** The evidence line for one capability, in plain words. */
export function evidenceLine(c: CapabilitySnapshot): string {
  const e = c.evidence;
  const parts: string[] = [];
  if (e.independent) parts.push(`${answers(e.independent, e.independentRight)} on their own`);
  if (e.assisted) parts.push(`${e.assistedRight} of ${e.assisted} right with help`);
  if (e.provisional) parts.push(`${answers(e.provisional, e.provisionalRight)} on provisional questions (not counted)`);
  if (e.unknown) parts.push(`${e.unknown} recorded before help was tracked`);
  if (e.afterTeaching) parts.push(`${answers(e.afterTeaching, e.afterTeachingRight)} in practice straight after a lesson (not counted as independent)`);
  if (e.practiceOnly) parts.push(`${e.practiceOnly} practice word${e.practiceOnly === 1 ? "" : "s"} (not counted)`);
  if (e.repeats) parts.push(`${e.repeats} repeated question${e.repeats === 1 ? "" : "s"} (not new evidence)`);
  if (e.samePassage) parts.push(`${answers(e.samePassage, e.samePassageRight ?? 0)} on a passage already counted (not counted again)`);
  return parts.length ? parts.join("; ") : "no answers yet";
}

export function planDevelopment(input: DevelopmentInput): DevelopmentPlan {
  const p = input.policy ?? DEVELOPMENT_POLICY_DRAFT;
  const caps = [...input.capabilities].sort((a, b) => a.order - b.order);
  const byId = new Map(caps.map((c) => [c.id, c]));
  const notes: Record<string, string[]> = {};
  const note = (id: string, text: string) => (notes[id] ??= []).push(text);
  const out: DevelopmentRecommendation[] = [];
  const ev = (c: CapabilitySnapshot) => ({ capability: c.id, summary: `${c.name}: ${STANDING_WORDS[c.standing]} (${evidenceLine(c)})`, ids: c.evidenceIds });
  const canAssess = (c: CapabilitySnapshot) => ({ available: c.content.assess > 0, note: c.content.assess > 0 ? `${c.content.assess} unused question${c.content.assess === 1 ? "" : "s"} available` : `No unused questions left for ${c.name}: more reviewed questions are needed` });
  const avail = (c: CapabilitySnapshot, n: number, what: string) => ({ available: n > 0, note: n > 0 ? `${n} unused ${what} question${n === 1 ? "" : "s"} available` : `No unused ${what} questions left for ${c.name}: more reviewed questions are needed` });
  const canConfirm = (c: CapabilitySnapshot) => avail(c, c.content.confirm ?? c.content.assess, "confirmation");
  const canRetain = (c: CapabilitySnapshot) => avail(c, c.content.retain ?? c.content.assess, "later-check");
  const canTeach = (c: CapabilitySnapshot) => ({ available: !!c.content.teach, note: c.content.teach ? `Teaching available: ${c.content.teach}` : `No lessons for ${c.name} in the app yet` });
  const add = (r: DevelopmentRecommendation) => out.push(r);
  const review = (c: CapabilitySnapshot, priority: number, why: string, changeIf: string, extra: DevelopmentRecommendation["evidence"] = []) =>
    add({ action: "human_review", capability: c.id, priority, what: `Ask a teacher or parent to look at ${c.name}`, why, evidence: [ev(c), ...extra], changeIf, content: { available: false, note: "Needs a person or new content: the app cannot deliver this itself" } });

  // too little evidence anywhere: one initial assessment, and no judgement about anything
  const totalIndependent = caps.reduce((t, c) => t + c.evidence.independent, 0);
  if (totalIndependent < p.initialAssessmentMinIndependent) {
    const r: DevelopmentRecommendation = {
      action: "initial_assessment",
      capability: null,
      priority: 100,
      what: "Find the starting point",
      why: `Only ${totalIndependent} answer${totalIndependent === 1 ? "" : "s"} given on their own so far, so nothing can be said yet about any area. A short set of questions across areas comes first. Missing answers are not a weakness.`,
      evidence: caps.filter((c) => c.evidence.independent + c.evidence.assisted > 0).map(ev),
      changeIf: `After about ${p.initialAssessmentMinIndependent} or more answers on their own, the plan chooses activities area by area.`,
      content: { available: true, note: "The starting-point questions are available" },
    };
    return { policy: p.version, today: [r], forAdults: [], all: [r], notes };
  }

  for (const c of caps) {
    const reqs = (input.requires.get(c.id) ?? []).map((id) => byId.get(id)).filter((x): x is CapabilitySnapshot => !!x);
    const e = c.evidence;
    switch (c.standing) {
      case "not_kept":
        if (c.content.teach) add({ action: "refresh", capability: c.id, priority: 100, what: `Refresh ${c.name}`, why: `${c.name} was shown before, but was not right at a later check. Refreshing it comes first, before anything new.`, evidence: [ev(c)], changeIf: "Right again on new questions after the refresher: then a later check.", content: canTeach(c) });
        else if (c.content.retain ?? c.content.assess) add({ action: "refresh", capability: c.id, priority: 100, what: `Check ${c.name} again`, why: `${c.name} was shown before, but was not right at a later check. There is no lesson for it in the app, so a few new questions show where things stand.`, evidence: [ev(c)], changeIf: "Right on the new questions: it is shown again; wrong: a teacher or parent is asked to help.", content: canRetain(c) });
        else review(c, 95, `${c.name} was not kept at a later check, and the app has no lesson or unused question for a refresher.`, "New questions or a lesson for it.");
        continue;
      case "check_due":
        if (c.content.retain ?? c.content.assess) add({ action: "retention_check", capability: c.id, priority: 90, what: `Check ${c.name} again`, why: `${c.name} was shown earlier and is due for a check, to see whether it has lasted.`, evidence: [ev(c)], changeIf: "Right at the check: confirmed, next check later. Wrong: a refresher.", content: canRetain(c) });
        else review(c, 30, `${c.name} is due for a check, but every question for it has been used.`, "More reviewed questions for it.");
        continue;
      case "shown":
      case "confirmed":
        continue; // shown: nothing to do until a check is due
    }
    if (c.standing === "improving") {
      // right in practice straight after a lesson: a fresh check without help, before anything else is built on it
      if (c.content.confirm ?? c.content.assess)
        add({ action: "confirm", capability: c.id, priority: 82, what: `Check ${c.name} on fresh questions`, why: `Right in practice straight after the lesson (${answers(e.afterTeaching, e.afterTeachingRight)}). That shows improvement, not independent mastery: a few fresh questions without help, outside the lesson, will show whether it holds.`, evidence: [ev(c)], changeIf: "Right on the fresh questions: shown (and a later check is scheduled). Wrong: more teaching, or a different approach.", content: canConfirm(c) });
      else review(c, 66, `${c.name} improved in practice after the lesson, but there are no unused questions to confirm it without help.`, "More reviewed questions for it.");
      continue;
    }
    if (c.paused) {
      review(c, 88, c.paused, "An adult has worked on it with the learner; the activity can then be tried again.");
      continue;
    }
    if (c.standing === "found_hard") {
      const unmeasured = reqs.filter((r) => r.standing === "not_checked" || r.standing === "uncertain");
      const hardReqs = reqs.filter((r) => r.standing === "found_hard" || r.standing === "not_kept");
      for (const r of unmeasured) note(c.id, `May reflect ${r.name}, which it builds on and which has not been measured yet.`);
      for (const r of hardReqs) note(c.id, `It builds on ${r.name}, which was also found hard.`);
      if (unmeasured.length) {
        for (const r of unmeasured)
          if (r.content.assess)
            add({ action: "check_prerequisite", capability: r.id, because: c.id, priority: 85, what: `Check ${r.name} first`, why: `${c.name} looks hard so far. It builds on ${r.name}, which has not been measured, so that is checked first: a gap there could look like a gap in ${c.name}.`, evidence: [ev(c), ev(r)], changeIf: `If ${r.name} is shown, ${c.name} is taught or checked next; if ${r.name} is found hard, it is worked on first.`, content: canAssess(r) });
          else review(r, 60, `${c.name} looks hard and builds on ${r.name}, which has not been measured, but there are no unused questions for ${r.name}.`, `Questions for ${r.name}.`, [ev(c)]);
        continue;
      }
      if (hardReqs.length) {
        for (const r of hardReqs)
          if (r.content.teach) add({ action: "teach_prerequisite", capability: r.id, because: c.id, priority: 84, what: `Work on ${r.name} first`, why: `${c.name} looks hard, and ${r.name}, which it builds on, was found hard too. Working on ${r.name} first.`, evidence: [ev(c), ev(r)], changeIf: `When ${r.name} is shown on new questions, ${c.name} comes back into the plan.`, content: canTeach(r) });
          else review(r, 84, `${c.name} looks hard, and ${r.name}, which it builds on, was found hard too. The app has no lessons for ${r.name}: a teacher or parent can help with it first.`, `When ${r.name} is shown on its own, ${c.name} can be checked again.`, [ev(c)]);
        continue;
      }
      if (c.content.teach) add({ action: "teach", capability: c.id, priority: 80, what: `Learn ${c.name}`, why: `Most answers on ${c.name} were wrong when answered alone (${answers(e.independent, e.independentRight)}).${reqs.length ? ` What it builds on (${reqs.map((r) => r.name).join(", ")}) is shown.` : ""}`, evidence: [ev(c), ...reqs.map(ev)], changeIf: "Right on new questions after the lesson: then a check on its own.", content: canTeach(c) });
      else review(c, 70, `Most answers on ${c.name} were wrong when answered alone (${answers(e.independent, e.independentRight)}), and the app has no lessons for it yet.`, "A lesson for it, or help from a teacher or parent, then new questions.");
      continue;
    }
    // mostly with help: check on their own before anything is built on it
    if (e.assisted >= p.assistedMin && e.independentRight <= p.assistedMaxIndependentRight) {
      if (c.content.assess) add({ action: "independent_check", capability: c.id, priority: 75, what: `Try ${c.name} without help`, why: `Right with help ${e.assistedRight} time${e.assistedRight === 1 ? "" : "s"}, but only ${e.independentRight} right on their own. Help shows what can be done with support, not what is secure: a few questions without help come next.`, evidence: [ev(c)], changeIf: "Right on their own: shown. Still wrong on their own: teaching, or a person to help.", content: canAssess(c) });
      else review(c, 65, `Right mostly with help on ${c.name}, and no unused questions are left to check it without help.`, "More questions for it.");
      continue;
    }
    // practice-only answers point to practice: offered as learning, never read as a difficulty
    if ((c.standing === "uncertain" || c.standing === "not_checked") && c.content.practiceSignal && c.content.teach) {
      add({ action: "continue", capability: c.id, priority: 68, what: `Practise ${c.name}`, why: `${c.content.practiceSignal}. Those practice answers are not counted as evidence, but they show what to practise.`, evidence: [ev(c)], changeIf: "Right on new words in practice: then a check on its own.", content: canTeach(c) });
      continue;
    }
    if (c.standing === "uncertain") {
      // the less that is known, the sooner: fewer independent answers first
      if (c.content.assess) add({ action: "reassess", capability: c.id, priority: 70 - 0.5 * Math.min(e.independent, 8), what: `A few more questions on ${c.name}`, why: `${c.name} has a few answers (${evidenceLine(c)}), not enough to say. A few more will show where it stands.`, evidence: [ev(c)], changeIf: "Enough answers: shown, developing or found hard, each with its own next step.", content: canAssess(c) });
      else review(c, 20, `${c.name} has too few answers to say, and every question for it has been used.`, "More reviewed questions for it.");
      continue;
    }
    if (c.standing === "developing") {
      if (c.content.teach) add({ action: "continue", capability: c.id, priority: 55, what: `Keep learning ${c.name}`, why: `${c.name} is measured but not yet shown on its own. Practice with a lesson comes next.`, evidence: [ev(c)], changeIf: "Shown on its own: then a check later.", content: canTeach(c) });
      else if (c.content.assess) add({ action: "reassess", capability: c.id, priority: 45, what: `More questions on ${c.name}`, why: `${c.name} is measured but not yet shown on its own; there are no lessons for it, so more questions show whether it is shown.`, evidence: [ev(c)], changeIf: "Shown on its own, or found hard.", content: canAssess(c) });
      continue;
    }
    // not checked: never a weakness. Only a check, chosen for prerequisites shown or breadth.
    if (reqs.length && reqs.every((r) => r.standing === "shown" || r.standing === "confirmed")) {
      if (c.content.assess) add({ action: "next_capability", capability: c.id, priority: 60, what: `Try ${c.name}`, why: `${reqs.map((r) => r.name).join(" and ")}, which ${c.name} builds on, ${reqs.length === 1 ? "is" : "are"} shown. Time to try the next step.`, evidence: reqs.map(ev), changeIf: "Its answers decide what comes next for it.", content: canAssess(c) });
      continue;
    }
    if (c.content.assess) add({ action: "assess", capability: c.id, priority: 40, what: `Try ${c.name}`, why: `${c.name} has not been checked yet. Nothing is known about it; this is not a weakness.`, evidence: [], changeIf: "Its first answers decide what comes next for it.", content: canAssess(c) });
  }

  // breadth: among first checks, prefer areas with nothing measured yet, one per area
  const measuredStrands = new Set(caps.filter((c) => c.standing !== "not_checked").map((c) => c.strand));
  const firstInStrand = new Set<string>();
  for (const r of out)
    if (r.action === "assess") {
      const c = byId.get(r.capability!)!;
      if (!measuredStrands.has(c.strand) && !firstInStrand.has(c.strand)) {
        firstInStrand.add(c.strand);
        r.priority = 42;
        r.why = `Nothing in ${c.strand} has been checked yet. ${r.why}`;
      }
    }

  const ranked = out.sort((a, b) => b.priority - a.priority || (byId.get(a.capability ?? "")?.order ?? 0) - (byId.get(b.capability ?? "")?.order ?? 0) || a.action.localeCompare(b.action));
  // today: deliverable actions, one per capability, spread over different areas first, then by priority
  const used = new Set<string>();
  const strands = new Set<string>();
  const today: DevelopmentRecommendation[] = [];
  const deliverable = ranked.filter((r) => r.action !== "human_review" && r.content.available);
  for (const pass of [true, false])
    for (const r of deliverable) {
      if (today.length >= p.maxActions) break;
      const strand = byId.get(r.capability!)!.strand;
      // refreshers, later checks and prerequisites (priority 84 and above) are never displaced for variety
      if (used.has(r.capability!) || (pass && strands.has(strand) && r.priority < 84)) continue;
      used.add(r.capability!);
      strands.add(strand);
      today.push(r);
    }
  today.sort((a, b) => b.priority - a.priority || (byId.get(a.capability!)!.order - byId.get(b.capability!)!.order));
  // for adults: one item per capability (the highest-priority reason), at most maxActions
  const adultCaps = new Set<string>();
  const forAdults = ranked.filter((r) => r.action === "human_review" && !adultCaps.has(r.capability!) && adultCaps.add(r.capability!)).slice(0, p.maxActions);
  return { policy: p.version, today, forAdults, all: ranked, notes };
}

/** Why the plan changed between two points in the record: standing changes, then what was added or dropped. */
export function explainPlanChange(before: { plan: DevelopmentPlan; capabilities: CapabilitySnapshot[] }, after: { plan: DevelopmentPlan; capabilities: CapabilitySnapshot[] }): string[] {
  const lines: string[] = [];
  const was = new Map(before.capabilities.map((c) => [c.id, c]));
  for (const c of [...after.capabilities].sort((a, b) => a.order - b.order)) {
    const b = was.get(c.id);
    if (b && b.standing !== c.standing) lines.push(`${c.name}: ${STANDING_WORDS[b.standing]} → ${STANDING_WORDS[c.standing]} (${evidenceLine(c)}).`);
  }
  const key = (r: DevelopmentRecommendation) => `${r.action}:${r.capability ?? ""}`;
  const beforeKeys = new Set([...before.plan.today, ...before.plan.forAdults].map(key));
  const afterKeys = new Set([...after.plan.today, ...after.plan.forAdults].map(key));
  for (const r of [...before.plan.today, ...before.plan.forAdults]) if (!afterKeys.has(key(r))) lines.push(`No longer planned: ${r.what}.`);
  for (const r of [...after.plan.today, ...after.plan.forAdults]) if (!beforeKeys.has(key(r))) lines.push(`Now planned: ${r.what}. ${r.why}`);
  if (!lines.length) lines.push("The plan has not changed since the last activity.");
  return lines;
}
