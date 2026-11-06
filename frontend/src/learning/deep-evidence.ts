/**
 * deep-recovery@0 evidence after help (RESEARCH, behind the research switch; the owner's decision, phase 8): keep both facts.
 * A fresh problem answered right without hints right after a deep episode's help WAS solved on the learner's own, but the skill was
 * shown AFTER HELP: show "Solved independently after help", never the unqualified "Shown on your own". A later fresh unaided check (a
 * later sitting, a problem key the episode never used) is stronger evidence of retention: "…; checked again later on your own". It is
 * never called durable mastery or "Verified". The immediate success is never discarded, and a later wrong check erases nothing.
 *
 * This is a wrapper over the evidence result (the engine's SkillEvidence status is read, never changed): it reads the saved records
 * only, so a reload, a sign-out or another device shows the same label. The two facts stay separately identifiable in the records:
 *   help      the lessons whose `episode` is this recovery's id (deep:<original>#<first answer time>; older records: by adjacency,
 *             as deepRecovery attributes them) and the episode's own answers (attempt context deep:<original>|…)
 *   unaided   the independent right answers on the skill after the episode's last lesson, in that same sitting
 *   later     independent answers on the skill in a later sitting, on a problem key the episode never used
 * Synthetic results are not evidence that anyone learned.
 */
import { question } from "../../../packages/learning/src/content";
import { evidenceFor, independentAttempt, rightAnswer, type SkillEvidence } from "../../../packages/learning/src/evidence";
import { problemKeyOf } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import type { Attempt, LearnerRecords } from "../../../packages/learning/src/records";
import { DEEP_TAG, bySitting, deepScreen } from "./deep-recovery-app";

export const DEEP_EVIDENCE_POLICY = "deep-evidence-after-help@0" as const;
export const AFTER_HELP = "Solved independently after help";
export const AFTER_HELP_LATER = "Solved independently after help; checked again later on your own";
const SHOWN = new Set<SkillEvidence["status"]>(["independent", "transfer", "verified"]);
const skillOf = (qid: string) => { try { return graph.evidenceTarget(question(qid.replace(/:(mc|w)$/, "")).competency); } catch { return null; } };
const day = (at: string) => at.slice(0, 10);

export interface AfterHelp {
  policy: typeof DEEP_EVIDENCE_POLICY;
  competency: string;
  original: string;
  episode: string;
  /** the help: this episode's lessons (with or without a recovery id on older records) */
  lessons: { at: string; competency: string; strategy: string; episode: string | null }[];
  /** the immediate success: independent right answers on the skill after the last lesson, in that sitting (never discarded) */
  unaided: { id: string; at: string; questionId: string }[];
  /** later fresh unaided checks, in later sittings, newest last (right and wrong are both kept) */
  later: { id: string; at: string; questionId: string; right: boolean }[];
  kind: "after-help" | "after-help-checked-later" | "after-help-later-wrong";
  label: string;
  note: string;
}

/** the after-help facts for a skill, or null when no deep episode for it ended "solved after help" from a skill not shown before */
export function afterHelpOf(competency: string, records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number): AfterHelp | null {
  const originals = [...new Set(records.attempts.filter((a) => a.context?.startsWith(DEEP_TAG)).map((a) => a.context!.slice(DEEP_TAG.length, a.context!.indexOf("|"))))]
    .filter((q) => skillOf(q) === competency);
  const sit = bySitting(records, now).records;
  const sittingOf = new Map(sit.attempts.map((a) => [a.id, a.session]));
  for (const q of originals.reverse()) {
    const first = records.attempts.find((a) => a.questionId === q);
    if (!first) continue;
    const s = deepScreen(q, records, evidence, now);
    if (s.kind !== "end" || s.phase !== "solved_after_help") continue;
    const t0 = first.at, episode = `deep:${q}#${t0}`;
    // a skill already shown on its own before the episode began keeps its ordinary label
    const before: LearnerRecords = { ...records, attempts: records.attempts.filter((a) => a.at < t0), teaching: records.teaching.filter((t) => t.at < t0) };
    if (SHOWN.has(evidenceFor("deep-evidence", before, Date.parse(t0)).get(competency).status)) continue;
    const mine = records.attempts.filter((a) => a.at >= t0 && (a === first || a.context?.startsWith(`${DEEP_TAG}${q}|`)));
    const lastMine = mine.at(-1)!;
    // the help: lessons with this recovery id; older records (no id) by adjacency within the episode's span, as deepRecovery does
    const lessons = records.teaching.filter((t) => t.at > t0 && (t.episode !== undefined ? t.episode === episode : t.at <= lastMine.at && records.attempts.some((a) => a.at < t.at && mine.includes(a) && a.session === t.session)));
    if (!lessons.length) continue;
    const lastLesson = lessons.map((t) => t.at).reduce((a, b) => (a > b ? a : b));
    const onSkill = (a: Attempt) => skillOf(a.questionId) === competency && independentAttempt(a);
    const helpSitting = sittingOf.get(lastMine.id);
    const keys = new Set(mine.map((a) => problemKeyOf(a.questionId)));
    const unaided = records.attempts.filter((a) => a.at > lastLesson && onSkill(a) && rightAnswer(a) && sittingOf.get(a.id) === helpSitting).map((a) => ({ id: a.id, at: a.at, questionId: a.questionId }));
    if (!unaided.length) continue;
    unaided.forEach((u) => keys.add(problemKeyOf(u.questionId)));
    const later = records.attempts.filter((a) => a.at > lastMine.at && onSkill(a) && sittingOf.get(a.id) !== helpSitting && !a.context?.startsWith(`${DEEP_TAG}${q}|`) && !keys.has(problemKeyOf(a.questionId)))
      .map((a) => ({ id: a.id, at: a.at, questionId: a.questionId, right: rightAnswer(a) }));
    const last = later.at(-1);
    const kind: AfterHelp["kind"] = !last ? "after-help" : last.right ? "after-help-checked-later" : "after-help-later-wrong";
    const when = day(unaided[0].at);
    const note = kind === "after-help"
      ? `Solved a fresh problem on your own on ${when}, straight after help with ${lessons.map((t) => graph.get(graph.evidenceTarget(t.competency)).name).filter((x, i, a) => a.indexOf(x) === i).join(", ")}. A later check on your own will show whether it has stuck.`
      : kind === "after-help-checked-later"
      ? `Solved on your own straight after help (${when}), and right again on a fresh problem on your own on ${day(last!.at)}. That is stronger evidence that it has stuck; the delayed check is still to come.`
      : `Solved on your own straight after help (${when}). A later check on your own (${day(last!.at)}) was not right; the earlier success is still recorded.`;
    return { policy: DEEP_EVIDENCE_POLICY, competency, original: q, episode, lessons: lessons.map((t) => ({ at: t.at, competency: t.competency, strategy: t.strategy, episode: t.episode ?? null })), unaided, later, kind, label: kind === "after-help-checked-later" ? AFTER_HELP_LATER : AFTER_HELP, note };
  }
  return null;
}

/** the status label to show: the engine's own word unless the skill's "shown"/"verified" status rests on a deep episode's help */
export function skillLabel(on: boolean, status: SkillEvidence["status"], ordinary: string, ah: AfterHelp | null): string {
  if (!on || !ah || !SHOWN.has(status)) return ordinary;
  return ah.label;
}
/** a module/goal reason that opens with the unqualified "Shown on your own": the same sentence, qualified */
export function qualifyReason(on: boolean, reason: string, status: SkillEvidence["status"], ah: AfterHelp | null): string {
  if (!on || !ah || !SHOWN.has(status) || !reason.startsWith("Shown on your own")) return reason;
  return ah.label + reason.slice("Shown on your own".length).replace(/^, also on new problems/, "");
}

/** year-page tiles relabelled where the skill's shown/verified status rests on a deep episode's help (the tile keeps its status) */
export function relabelTiles<T extends { competency?: string; status: string; label: string; children: T[] }>(tiles: T[], ahOf: (c: string) => AfterHelp | null): (T & { afterHelp?: AfterHelp })[] {
  return tiles.map((t) => {
    const children = relabelTiles(t.children, ahOf);
    const ah = t.competency && (t.status === "shown" || t.status === "verified") ? ahOf(t.competency) : null;
    return ah ? { ...t, children, label: ah.label, afterHelp: ah } : { ...t, children };
  });
}
