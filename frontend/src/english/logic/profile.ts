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
  type EvidenceSummary,
  STANDING_WORDS,
  type Standing,
  explainPlanChange,
  foundHard,
  leafView,
  planDevelopment,
  scoreCode,
} from "../../../../packages/english-core/src/index.ts";
import { type AppContent, type Code, GUIDED } from "./content.ts";
import type { AppEvent } from "./events.ts";
import { type PlanStep, patternTitle, todayPlan } from "./plan.ts";
import { capabilityProgress, type CapabilityProgress } from "./progress.ts";
import { spellingPlan } from "./select.ts";
import { type AppState, dueWords, fold, placementDone, sessionsOf } from "./state.ts";
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

const none = (): EvidenceSummary => ({ independent: 0, independentRight: 0, assisted: 0, assistedRight: 0, unknown: 0, provisional: 0, provisionalRight: 0, practiceOnly: 0 });

/** Evidence on every capability, by kind, from the ledger's own decisions and assisted responses. */
function evidenceByCapability(s: AppState, c: AppContent) {
  const out = new Map<string, { e: EvidenceSummary; ids: string[]; lastAt: string | null; validated: number; draft: number }>();
  const get = (cap: string) => {
    let x = out.get(cap);
    if (!x) out.set(cap, (x = { e: none(), ids: [], lastAt: null, validated: 0, draft: 0 }));
    return x;
  };
  const evidence = new Map(s.ledger.events.filter((e) => e.kind === "evidence").map((e) => [e.id, e]));
  for (const d of s.ledger.decisions) {
    if (!d.capability || !d.observation || d.observation.kind !== "binary") continue;
    const item = c.ctx.content.items.get(d.observation.item);
    if (!item || item.kind !== "code" || item.target !== d.capability) continue; // direct decisions only
    const x = get(d.capability);
    const right = d.observation.value === 1 ? 1 : 0;
    const source = evidence.get(d.source) as { provenance?: unknown } | undefined;
    if (d.verdict === "accepted") {
      if (!source?.provenance) {
        x.e.unknown++;
        continue;
      }
      x.e.independent++;
      x.e.independentRight += right;
      x.ids.push(d.source);
      x.lastAt = d.at;
      if (item.evidence_status === "validated") x.validated++;
      else x.draft++;
    } else if (d.verdict === "held") {
      if (item.evidence_status === "provisional" && d.reasons.some((r) => r.includes("provisional item"))) {
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
function unseenQuestions(s: AppState, c: AppContent, cap: string): number {
  return [...(c.ctx.content.byCapability.get(cap) ?? [])].filter((i) => c.handWritten.has(i.id) && !s.ledger.exposures.has(i.id)).length;
}

/** A teaching activity the app can deliver for a capability: a spelling pattern with words left, or a grammar/vocabulary lesson. */
function teachingFor(s: AppState, c: AppContent, cap: string, now: string, speech: boolean): { title: string; step: PlanStep } | null {
  if ((GUIDED.spelling as readonly string[]).includes(cap)) {
    const p = spellingPlan(s, c, now, speech).find((x) => x.cap === cap && x.status !== "ready_for_check");
    if (!p) return null;
    const title = patternTitle(c, p.cap, p.step);
    return { title: `Spelling lesson and practice: ${title}`, step: { type: "spelling_practice", title: `Spelling: ${title}`, reason: "", capability: p.cap, step: p.step } };
  }
  if ([...GUIDED.grammar, ...GUIDED.vocabulary].includes(cap as never) && [...c.lessons.values()].some((l) => l.capability === cap)) {
    const name = c.index.names.get(cap) ?? cap;
    return { title: `Lesson and practice: ${name}`, step: { type: "guided", title: name, reason: "", capability: cap } };
  }
  return null;
}

/** Spelling: words of a pattern misspelt in the spelling check, or a recent mistake pointing to it (practice-only answers). */
function practiceSignal(s: AppState, c: AppContent, cap: string, now: string, speech: boolean): string | null {
  if (!(GUIDED.spelling as readonly string[]).includes(cap)) return null;
  const p = spellingPlan(s, c, now, speech).find((x) => x.cap === cap && x.reasons.some((r) => /misspelt|mistake/.test(r)));
  if (!p) return null;
  return `${patternTitle(c, p.cap, p.step)}: ${p.reasons.find((r) => /misspelt|mistake/.test(r))}`;
}

function standingOf(v: ReturnType<typeof leafView>, e: EvidenceSummary, certainty: CapabilityProgress["certainty"]): Standing {
  switch (v.verification.status) {
    case "failed":
      return "not_kept";
    case "overdue":
      return "check_due";
    case "verified":
      return "confirmed";
    case "demonstrated":
      return "shown";
  }
  if (e.independent + e.unknown === 0) return "not_checked";
  if (foundHard(e)) return "found_hard";
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
  const doubling = parentReport(s, c, now);
  const teach = new Map<string, { title: string; step: PlanStep } | null>();
  const snapshots: CapabilityProfile[] = [];
  c.index.leafIds.forEach((id, order) => {
    const pr = progress.get(id);
    if (!pr) return; // specified capabilities only
    const v = pr.view;
    const x = ev.get(id) ?? { e: none(), ids: [], lastAt: null, validated: 0, draft: 0 };
    const standing = standingOf(v, x.e, pr.certainty);
    const t = teachingFor(s, c, id, now, speech);
    teach.set(id, t);
    const strengths: string[] = [];
    const ver = v.verification;
    if (standing === "shown" || standing === "confirmed")
      strengths.push(`${standing === "confirmed" ? "Shown on their own, and still right at a later check" : "Shown on their own"}${x.validated ? "" : " (on draft questions, not yet reviewed by a teacher)"}.`);
    if (ver.historicalLevel !== null && standing !== "shown" && standing !== "confirmed") strengths.push("Shown earlier; not currently confirmed.");
    const difficulties: string[] = [];
    if (standing === "found_hard") difficulties.push(`Found hard so far: ${x.e.independentRight} of ${x.e.independent} right on their own.`);
    for (const m of v.misconceptions) difficulties.push(`A pattern in wrong answers: ${m.id.replace(/_/g, " ")}.`);
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
              ? `First check from ${day(v.retention.dueAt)}.`
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
      content: { assess: unseenQuestions(s, c, id), teach: t?.title ?? null, practiceSignal: practiceSignal(s, c, id, now, speech) },
      paused,
      estimate: { certainty: pr.certainty, headline: pr.headline, range: pr.range, verification: pr.verification },
      strengths,
      difficulties,
      retention,
      lastAssessedAt: v.lastDirectAt ?? x.lastAt,
      basis: { validated: x.validated, draft: x.draft },
      notes: [],
      next: null,
    });
  });
  const plan = planDevelopment({ capabilities: snapshots, requires: c.index.requires });
  for (const p of snapshots) {
    p.notes = plan.notes[p.id] ?? [];
    p.next = plan.all.find((r) => r.capability === p.id) ?? null;
  }
  return { at: now, capabilities: snapshots, plan, activities: opts.activities === false ? [] : activities(s, c, now, speech, plan, snapshots, teach) };
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
  // the initial assessment is the existing starting point: placement, then the spelling check
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
  if (!placementDone(s) || !sessionsOf(s, "spelling_check").some((x) => x.end !== null) && initial[0]?.type === "spelling_check")
    return initial.slice(0, 1).map((step) => ({ kind: "start", label: CHILD.start, title: step.title, line: step.reason, step, recommendation: plan.today.find((r) => r.action === "initial_assessment") ?? null }));
  const name = (id: string) => caps.find((x) => x.id === id)!;
  const out: (Activity & { priority: number })[] = [];
  for (const r of plan.today) {
    if (!r.capability) continue;
    const cap = name(r.capability);
    const area = areaWord(cap.id);
    const check = (kind: Activity["kind"], line: string, purpose: "assess" | "retention"): Activity & { priority: number } => ({
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
      case "assess":
      case "next_capability":
        out.push(check("new_skill", "Something new: a few questions to see what you already know.", "assess"));
        break;
      default:
        out.push(check("show_what_you_know", "A few questions on your own, to see where you are.", "assess"));
    }
  }
  const due = dueWords(s, now);
  if (due.length) {
    const n = Math.min(due.length, 10);
    const step: PlanStep = { type: "spelling_review", title: `Review ${n} word${n === 1 ? "" : "s"}`, reason: "Words you misspelt before, coming back after 1, 3, 7 and 14 days until you remember them.", count: due.length };
    out.push({ kind: "check_learned", label: CHILD.check_learned, title: step.title, line: step.reason, step, recommendation: null, priority: 89 });
  }
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

const RANK: Partial<Record<Standing, number>> = { found_hard: 0, uncertain: 1, developing: 2, shown: 3, confirmed: 4 };

export interface ParentOverview {
  shown: CapabilityProfile[];
  uncertain: CapabilityProfile[];
  hard: CapabilityProfile[];
  helped: CapabilityProfile[];
  retention: CapabilityProfile[];
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
    uncertain: caps.filter((x) => x.standing === "uncertain" || x.standing === "developing"),
    hard: caps.filter((x) => x.standing === "found_hard"),
    helped: caps.filter((x) => x.evidence.assisted > 0),
    retention: caps.filter((x) => x.standing === "check_due" || x.standing === "not_kept"),
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
