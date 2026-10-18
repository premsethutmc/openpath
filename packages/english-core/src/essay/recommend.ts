/**
 * The next learning activity after an essay, from the learner's own record: the latest essay's hypotheses, their
 * diagnostic outcomes, what earlier essays showed for the same competency, and the content that exists. It only
 * recommends; the journey planner (journey.ts) builds the actual steps, and the engine decides every status.
 */
import type { CapabilityId, LedgerEvent } from "../types.ts";
import { essayRecords } from "./analysis.ts";
import type { EssayContext } from "./competencies.ts";
import type { GapHypothesis } from "./contract.ts";
import { gapHypotheses } from "./gaps.ts";

export type NextActivityKind = "answer_questions" | "check_skill" | "learn" | "practise_and_check" | "write_again";

export interface NextActivity {
  kind: NextActivityKind;
  competency: CapabilityId | null;
  title: string;
  reason: string;
  /** The first lesson to open, for "learn". */
  lesson?: string;
  /** What earlier essays showed for this competency (the profile informing this recommendation). */
  history: string[];
}

const STATUS_RANK: Record<GapHypothesis["status"], number> = { confirmed: 0, unresolved: 1, suspected: 2, weakened: 3 };

export function recommendNext(ectx: EssayContext, events: readonly LedgerEvent[]): NextActivity | null {
  const essays = essayRecords(events, "submission").map((r) => r.record.submission.id);
  const latest = essays.at(-1);
  if (!latest) return null;
  const all = gapHypotheses(ectx, events);
  const name = (cap: CapabilityId) => ectx.profile.byCapability.get(cap)?.name ?? cap;
  const history = (cap: CapabilityId) =>
    all
      .filter((h) => h.competency === cap && h.essays.at(-1) !== latest)
      .map((h) => `${h.essays.at(-1)}: ${h.status === "confirmed" ? "confirmed by questions answered without help" : h.status === "weakened" ? "questions answered without help were right" : h.status === "unresolved" ? "questions were mixed" : "suggested, not checked"}`);
  const now = all.filter((h) => h.essays.at(-1) === latest);
  const requests = new Map(essayRecords(events, "diagnostic").map((r) => [r.record.request.id, r.record.request]));
  const open = (x: GapHypothesis) => {
    const d = x.diagnostic;
    if (!d) return false;
    const req = requests.get(d.request);
    // generated questions are all asked, even once the outcome is decided
    return d.status === "pending" || (req?.source === "generated" && new Set(d.answers.map((a) => a.item)).size < req.items.length);
  };
  const pending = now.find(open);
  if (pending) return { kind: "answer_questions", competency: pending.competency, title: `Finish the questions on ${name(pending.competency)}`, reason: pending.diagnostic!.reason, history: history(pending.competency) };
  const ranked = [...now].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.observations.length - a.observations.length);
  const top = ranked[0];
  if (!top || top.status === "weakened") {
    const others = ranked.filter((h) => h.status === "weakened").map((h) => name(h.competency));
    return { kind: "write_again", competency: null, title: "Write another essay", reason: others.length ? `Questions answered without help were right for ${others.join(", ")}: nothing to teach now. The next essay shows whether that holds.` : "This essay suggests no gap to check.", history: [] };
  }
  const h = history(top.competency);
  const again = h.some((x) => /confirmed|mixed/.test(x));
  if (top.status === "confirmed") {
    const lesson = ectx.lessons.get(top.competency)?.[0];
    return {
      kind: "learn",
      competency: top.competency,
      title: lesson ? `Learn: ${name(top.competency)}, then practise with help` : `${name(top.competency)}: no lesson in the app yet`,
      reason: `${top.diagnostic?.reason ?? ""}${again ? " An earlier essay showed the same difficulty, so it comes first." : ""} After the lesson and practice, a check without help on questions not seen before.`.trim(),
      ...(lesson ? { lesson } : {}),
      history: h,
    };
  }
  if (top.status === "unresolved")
    return { kind: "practise_and_check", competency: top.competency, title: `Practise ${name(top.competency)}, then check again`, reason: top.diagnostic?.reason ?? "The answers did not settle it.", history: h };
  return {
    kind: "check_skill",
    competency: top.competency,
    title: `Check ${name(top.competency)} with five new questions`,
    reason: `${top.basis.join("; ")}. One essay gives clues, not conclusions: a few questions answered without help decide.`,
    history: h,
  };
}
