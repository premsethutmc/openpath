import data from "../../../../content/mathematics/foundation/programs.v1.json";
import {
  replay as historicalReplay,
  type MathActivity,
} from "../fractions-program";
import { indexContent } from "../../../english-core/src/content";
import { programDecision } from "../program-grading";
import type { Item, EvidenceEvent } from "../../../english-core/src/types";
import { parseNumber, show } from "../answers";
import { sharedProfile } from "../canonical";
import { mathematicsLedger } from "../registration";
export const programs = data.programs;
export type Program = (typeof programs)[number];
export type Question = Program["questions"][number];
export interface FoundationActivity {
  kind: "math_foundation_activity";
  id: string;
  learnerId: string;
  at: string;
  sessionId: string;
  programId: string;
  lessonVersion: "1.0.0";
  journey: "school" | "gre-quant" | "jee-main" | "jee-advanced";
  action: "open" | "draft" | "hint" | "answer" | "complete";
  stage: string;
  elapsedMs: number;
  questionId?: string;
  response?: string;
  retentionDueAt?: string;
  savedAt?: string;
}
export type Receipt = FoundationActivity | MathActivity;
export interface Progress {
  completed: string[];
  current: string;
  timeMs: number;
  drafts: Record<string, string>;
  answers: Record<
    string,
    { correct: boolean; assisted: boolean; response: string }
  >;
  hints: string[];
  attempts: number;
  due: string | null;
}
const fresh = (): Progress => ({
  completed: [],
  current: "concept",
  timeMs: 0,
  drafts: {},
  answers: {},
  hints: [],
  attempts: 0,
  due: null,
});
export const key = (programId: string, journey: string) =>
  `${programId}:${journey}`;
const numeric = (raw: string) => { try { return `math-number:${show(parseNumber(raw))}`; } catch { return `math-unread:${raw}`; } };
export function itemFor(p: Program, q: Question): Item & { kind: "code" } {
  return {
    kind: "code",
    id: `math:foundation:${p.id}@${p.version}:${q.id}`,
    version: 1,
    family: `math:foundation:${p.id}:${q.id.replace(/-[ab]$/, "")}@1`,
    target: p.competencyId,
    format: "typed:math-number@1",
    prompt: q.prompt,
    answers: [numeric(q.answer)],
    a: 1,
    b: 4,
    evidence_status: "provisional",
    review: p.provenance,
    explain: q.solution,
  };
}
/** stage 9 (D14): THE grading decision (the server's recorded one when the event carries it); an unreadable answer is unresolved, never wrong */
export function evaluate(p: Program, q: Question, response: string, recorded?: unknown) {
  const d = programDecision(`foundation:${p.id}:${q.id}`, response, recorded);
  if (d.verdict === "unresolved")
    return { correct: false, unresolved: true, message: "Enter a number or fraction with a nonzero denominator. Your answer has not been marked wrong." };
  try {
    const correct = d.verdict === "correct";
    return {
      unresolved: false,
      correct,
      message: correct
        ? "That matches this practice example. " + q.solution
        : numeric(response) === numeric(q.commonError)
          ? q.misconception + " " + q.hint
          : "Let’s try the model again. " + q.hint,
    };
  } catch {
    return { correct: false, unresolved: true, message: "Enter a number or fraction with a nonzero denominator. Your answer has not been marked wrong." };
  }
}
/** UI support is an observation about this fixed practice, never a competency inference or mastery decision. */
export function instructionalSupport(p: Program, s: Progress) {
  const independent = p.stages
    .find((x) => x.id === "independent")!
    .questions.map((id) => s.answers[id]);
  if (independent.every((a) => a?.correct && !a.assisted))
    return "Both independent examples matched. Continue to the new context; extra practice is optional.";
  if (Object.values(s.answers).filter((a) => !a.correct).length >= 2)
    return "These examples suggest trying the visual model again. This does not establish a missing skill.";
  return "Explore first, then try an example. Hints are available whenever you need them.";
}
export function canFinish(
  p: Program,
  s: Progress,
  id: string,
  now = Date.now(),
) {
  const i = p.stages.findIndex((x) => x.id === id);
  return (
    i >= 0 &&
    p.stages.slice(0, i).every((x) => s.completed.includes(x.id)) &&
    p.stages[i].questions.every((q) => s.answers[q]) &&
    (id !== "explore" || s.drafts["exploration"] === "done") &&
    (id !== "retention" || (!!s.due && Date.parse(s.due) <= now))
  );
}
export function replayFoundation(
  learnerId: string,
  events: readonly Receipt[],
  now = new Date().toISOString(),
) {
  // Preserve the existing fractions ledger and evidence; extend its content instead of creating an estimator.
  const historical = historicalReplay(
    learnerId,
    events.filter((e): e is MathActivity => e.kind === "math_activity"),
    now,
  );
  const ledger = historical.ledger;
  ledger.ctx.content = indexContent(
    {
      items: [
        ...ledger.ctx.content.items.values(),
        ...programs.flatMap((p) => p.questions.map((q) => itemFor(p, q))),
      ],
      passages: [],
      goals: [],
      misspellings: {},
    },
    ledger.ctx.index,
  );
  const progress: Record<string, Progress> = {};
  for (const p of programs)
    for (const j of ["school", "gre-quant", "jee-main", "jee-advanced"])
      progress[key(p.id, j)] = fresh();
  const seen = new Set<string>();
  for (const e of events) {
    if (e.kind !== "math_foundation_activity" || seen.has(e.id)) continue;
    seen.add(e.id);
    const p = programs.find((p) => p.id === e.programId),
      s = progress[key(e.programId, e.journey)];
    if (
      !p ||
      !s ||
      e.learnerId !== learnerId ||
      e.lessonVersion !== p.version ||
      !p.stages.some((x) => x.id === e.stage)
    )
      throw Error("Invalid foundation receipt");
    s.timeMs += Math.max(0, Math.min(e.elapsedMs, 3600000));
    if (e.action === "open") s.current = e.stage;
    if (e.action === "draft" && e.questionId)
      s.drafts[e.questionId] = e.response ?? "";
    if (e.action === "hint" && e.questionId) s.hints.push(e.questionId);
    if (e.action === "answer") {
      const q = p.questions.find((q) => q.id === e.questionId);
      if (
        !q ||
        !p.stages.find((x) => x.id === e.stage)!.questions.includes(q.id)
      )
        throw Error("Question outside stage");
      const verdict = evaluate(p, q, e.response ?? "", (e as { decision?: unknown }).decision);
      if (verdict.unresolved) continue; // not an answer (P1): nothing recorded, no evidence
      const item = itemFor(p, q),
        prior = ledger.exposures.get(item.id)?.count ?? 0;
      const native: EvidenceEvent = {
        kind: "evidence",
        id: `native:${e.id}`,
        at: e.at,
        session: e.sessionId,
        item: { id: item.id, version: 1 },
        // the evidence ledger reads its own answer list: a credited answer is given to it in the stored form, so it agrees with the decision
        response: { kind: "typed", text: numeric(verdict.correct ? q.answer : e.response ?? "") },
        use: e.stage === "retention" ? "retention" : "practice",
      };
      ledger.apply(native);
      s.answers[q.id] = {
        correct: verdict.correct,
        response: e.response ?? "",
        assisted: s.hints.includes(q.id) || prior > 0,
      };
      s.drafts[q.id] = e.response ?? "";
      s.attempts++;
    }
    if (e.action === "complete" && canFinish(p, s, e.stage, Date.parse(e.at))) {
      if (!s.completed.includes(e.stage)) s.completed.push(e.stage);
      if (e.retentionDueAt && !s.due) s.due = e.retentionDueAt;
      s.current =
        p.stages.find((x) => !s.completed.includes(x.id))?.id ?? "retention";
    }
  }
  // Preserve original append order when legacy and foundation activities are interleaved.
  const ordered = mathematicsLedger(learnerId);
  ordered.ctx.content = ledger.ctx.content;
  const positions = new Map(events.map((e, i) => [`native:${e.id}`, i]));
  [...ledger.events]
    .sort((a, b) => (positions.get(a.id) ?? 0) - (positions.get(b.id) ?? 0))
    .forEach((e) => ordered.apply(e));
  return {
    ledger: ordered,
    progress,
    profiles: Object.fromEntries(
      programs.map((p) => [
        p.id,
        sharedProfile({ learnerId }, ordered, p.competencyId, now),
      ]),
    ),
    historicalPrograms: historical.programs,
  };
}
