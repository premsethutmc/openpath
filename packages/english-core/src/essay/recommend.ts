/**
 * The next learning activity after an essay, from the learner's own record (two-track policy):
 *   formal track     reviewed, eligible, unseen bank questions decide gaps (diagnosis) and show skills (checks);
 *   practice track   questions written by a model give formative practice only.
 * It only recommends; the journey planner (journey.ts) builds the steps and the engine decides every status. When the
 * bank cannot verify a skill, it says so plainly and still offers learning and practice.
 */
import type { CapabilityId, LedgerEvent } from "../types.ts";
import { essayRecords } from "./analysis.ts";
import { allocateItems, pickForRole } from "./allocation.ts";
import type { EssayContext } from "./competencies.ts";
import type { GapHypothesis } from "./contract.ts";
import { gapHypotheses } from "./gaps.ts";
import { formativeOutcomes, nextPracticeQuestion } from "./questions.ts";

export type NextActivityKind = "answer_questions" | "finish_practice" | "check_skill" | "practise" | "learn" | "practise_and_check" | "write_again";

export interface NextActivity {
  kind: NextActivityKind;
  competency: CapabilityId | null;
  title: string;
  reason: string;
  /** The first lesson to open, for "learn". */
  lesson?: string;
  /** What earlier essays showed for this competency (the profile informing this recommendation). */
  history: string[];
  /** Whether the bank can verify this skill now (an independent check on unseen questions at the target band). */
  verification: { available: boolean; reason: string } | null;
}

const STATUS_RANK: Record<GapHypothesis["status"], number> = { confirmed: 0, unresolved: 1, suspected: 2, weakened: 3 };

/** Can the bank check this competency independently now? From the journey's check step if one is planned, else the allocation. */
export function verificationAvailability(ectx: EssayContext, events: readonly LedgerEvent[], cap: CapabilityId): { available: boolean; reason: string } {
  const name = ectx.profile.byCapability.get(cap)?.name ?? cap;
  const step = essayRecords(events, "journey")
    .flatMap((r) => r.record.journey.trees.flatMap((t) => t.nodes.filter((n) => n.competency === cap).flatMap((n) => n.steps.filter((s) => s.kind === "independent_check"))))
    .at(-1);
  if (step) return step.status === "blocked" ? { available: false, reason: `Mastery verification is not available for ${name} yet: ${step.content.note}.` } : { available: true, reason: `An independent check on ${step.content.refs.length} unseen bank questions is planned.` };
  const a = allocateItems(ectx, events, cap);
  const n = a.available.independent_verification.length;
  return n >= ectx.policy.checkItems
    ? { available: true, reason: `${n} unseen bank question${n === 1 ? "" : "s"} at the target band can check it independently.` }
    : { available: false, reason: `Mastery verification is not available for ${name} yet: the bank has ${n} unseen reviewed question${n === 1 ? "" : "s"} at the target band, and ${ectx.policy.checkItems} are needed. Learning and practice still work.` };
}

export function recommendNext(ectx: EssayContext, events: readonly LedgerEvent[]): NextActivity | null {
  const essays = essayRecords(events, "submission").map((r) => r.record.submission.id);
  const latest = essays.at(-1);
  if (!latest) return null;
  const all = gapHypotheses(ectx, events);
  const formative = formativeOutcomes(ectx, events);
  const name = (cap: CapabilityId) => ectx.profile.byCapability.get(cap)?.name ?? cap;
  const history = (cap: CapabilityId) =>
    all
      .filter((h) => h.competency === cap && h.essays.at(-1) !== latest)
      .map((h) => `${h.essays.at(-1)}: ${h.status === "confirmed" ? "confirmed by questions answered without help" : h.status === "weakened" ? "questions answered without help were right" : h.status === "unresolved" ? "questions were mixed" : "suggested, not checked"}`);
  const requests = new Map(essayRecords(events, "diagnostic").map((r) => [r.record.request.id, r.record.request]));
  const now = all.filter((h) => h.essays.at(-1) === latest);
  const pending = now.find((x) => x.diagnostic?.status === "pending" && requests.get(x.diagnostic.request)?.source !== "generated");
  if (pending) return { kind: "answer_questions", competency: pending.competency, title: `Finish the questions on ${name(pending.competency)}`, reason: pending.diagnostic!.reason, history: history(pending.competency), verification: null };
  const practice = nextPracticeQuestion(ectx, events);
  if (practice) return { kind: "finish_practice", competency: practice.set.competency, title: `Finish the practice questions on ${name(practice.set.competency)}`, reason: `${practice.position - 1} of ${practice.total} answered. Practice questions are formative only.`, history: history(practice.set.competency), verification: null };
  const ranked = [...now].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.observations.length - a.observations.length);
  const top = ranked[0];
  if (!top || top.status === "weakened") {
    const others = ranked.filter((h) => h.status === "weakened").map((h) => name(h.competency));
    return { kind: "write_again", competency: null, title: "Write another essay", reason: others.length ? `Questions answered without help were right for ${others.join(", ")}: nothing to teach now. That is not mastery; the next essay shows whether it holds.` : "This essay suggests no gap to check.", history: [], verification: null };
  }
  const cap = top.competency;
  const h = history(cap);
  const verification = verificationAvailability(ectx, events, cap);
  const f = formative.get(cap);
  const practised = f && f.status !== "pending" ? ` Practice on model-written questions: ${f.right} of ${f.total} right (formative only).` : "";
  if (top.status === "confirmed") {
    const lesson = ectx.lessons.get(cap)?.[0];
    const again = h.some((x) => /confirmed|mixed/.test(x));
    return {
      kind: "learn",
      competency: cap,
      title: lesson ? `Learn: ${name(cap)}, then practise with help` : `${name(cap)}: no lesson in the app yet`,
      reason: `${top.diagnostic?.reason ?? ""}${again ? " An earlier essay showed the same difficulty, so it comes first." : ""}${practised} ${verification.available ? "After the lesson and practice, a check without help on bank questions not seen before." : verification.reason}`.trim(),
      ...(lesson ? { lesson } : {}),
      history: h,
      verification,
    };
  }
  if (top.status === "unresolved") return { kind: "practise_and_check", competency: cap, title: `Practise ${name(cap)}, then check again`, reason: `${top.diagnostic?.reason ?? "The answers did not settle it."}${practised} ${verification.reason}`.trim(), history: h, verification };
  // suspected: a formal check from the bank when it can be done, otherwise practice while saying why
  const formal = (ectx.profile.byCapability.get(cap)?.specified ?? false) && pickForRole(ectx, events, cap, "diagnostic", ectx.policy.diagnosticItems).length >= ectx.policy.diagnosticMinIndependent;
  const asked = top.diagnostic && requests.get(top.diagnostic.request)?.source !== "generated";
  if (formal && !asked)
    return { kind: "check_skill", competency: cap, title: `Check ${name(cap)} with questions from the bank`, reason: `${top.basis.join("; ")}. One essay gives clues, not conclusions: questions answered without help decide.${practised}`, history: h, verification };
  return {
    kind: "practise",
    competency: cap,
    title: `Practise ${name(cap)}`,
    reason: `${top.basis.join("; ")}. A formal check is not possible yet: ${top.diagnostic?.reason ?? "too few unseen bank questions"}. Practice still helps, but it cannot confirm the gap or show the skill.${practised}`,
    history: h,
    verification,
  };
}
