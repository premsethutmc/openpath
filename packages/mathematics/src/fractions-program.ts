import lesson from "../../../content/mathematics/programs/equivalent-fractions.v2.json";
import { indexContent } from "../../english-core/src/content";
import { programDecision } from "./program-grading";
import type { Item, EvidenceEvent } from "../../english-core/src/types";
import { mathematicsLedger } from "./registration";
import { parseNumber, show } from "./answers";
import { sharedProfile } from "./canonical";
export { lesson };
export const journeys = [
  "school",
  "jee-main",
  "jee-advanced",
  "gre-quant",
] as const;
export type Journey = (typeof journeys)[number];
export type Action =
  | "open"
  | "draft"
  | "hint"
  | "solution"
  | "answer"
  | "complete";
export interface MathActivity {
  kind: "math_activity";
  id: string;
  at: string;
  learnerId: string;
  journey: Journey;
  lessonVersion: "2.0.0";
  action: Action;
  stage: string;
  questionId?: string;
  response?: string;
  elapsedMs: number;
  sessionId?: string;
  savedAt?: string;
  retentionDueAt?: string;
}
export interface StageProgress {
  completed: string[];
  current: string;
  timeMs: number;
  drafts: Record<string, string>;
  answers: Record<
    string,
    { correct: boolean; response: string; assisted: boolean }
  >;
  attempts: number;
  hints: string[];
  solutions: string[];
  retentionDueAt: string | null;
}
function empty(): StageProgress {
  return {
    completed: [],
    current: "concept",
    timeMs: 0,
    drafts: {},
    answers: {},
    attempts: 0,
    hints: [],
    solutions: [],
    retentionDueAt: null,
  };
}
const numberKey = (raw: string) => `math-number:${show(parseNumber(raw))}`;
function answerKey(questionId: string, raw: string): string {
  const question = lesson.questions.find((q) => q.id === questionId)!;
  const value = parseNumber(raw);
  if (question.responseFormat === "simplest-fraction") {
    const parts = raw
      .trim()
      .replaceAll("−", "-")
      .match(/^([+-]?\d+)\/([+-]?\d+)$/);
    if (
      !parts ||
      BigInt(parts[1]) !== value[0] ||
      BigInt(parts[2]) !== value[1]
    )
      return `math-form-not-simplified:${raw}`;
  }
  return numberKey(raw);
}
export function questionItem(id: string): Item & { kind: "code" } {
  const q = lesson.questions.find((q) => q.id === id);
  if (!q) throw new Error("Unknown fixed question");
  return {
    kind: "code",
    id: `math:equivalence:2:${id}`,
    version: 2,
    family: `math:equivalence:${q.family}@2`,
    target: lesson.competencyId,
    format: "typed:math-number@1",
    prompt: q.prompt,
    answers: [answerKey(q.id, q.answer)],
    a: 1,
    b: 4,
    evidence_status: "provisional",
    review: "Original AI-assisted fixed content; unreviewed",
    explain: q.solution,
  };
}
/** Pure instructional replay, like the existing app state fold; all inference stays in the shared Ledger. */
export function replay(
  learnerId: string,
  events: readonly MathActivity[],
  now: string = new Date().toISOString(),
) {
  const ledger = mathematicsLedger(learnerId),
    nativeItems = lesson.questions.map((q) => questionItem(q.id));
  ledger.ctx.content = indexContent(
    { items: nativeItems, passages: [], goals: [], misspellings: {} },
    ledger.ctx.index,
  );
  const programs = Object.fromEntries(
    journeys.map((j) => [j, empty()]),
  ) as Record<Journey, StageProgress>;
  const ids = new Set<string>();
  for (const ev of events) {
    if (ids.has(ev.id)) continue;
    ids.add(ev.id);
    // another fixed program's activity (for example the JEE chapter) in the same mathematics record
    if ((ev as { program?: string }).program && (ev as { program?: string }).program !== lesson.id) continue;
    if (
      ev.kind !== "math_activity" ||
      ev.learnerId !== learnerId ||
      ev.lessonVersion !== lesson.version ||
      !journeys.includes(ev.journey) ||
      !lesson.stages.some((s) => s.id === ev.stage) ||
      !Number.isFinite(Date.parse(ev.at))
    )
      throw new Error("Invalid persisted mathematics activity");
    const state = programs[ev.journey],
      stage = lesson.stages.find((s) => s.id === ev.stage)!;
    state.timeMs += Math.max(0, Math.min(ev.elapsedMs || 0, 3600000));
    if (ev.action === "open") state.current = ev.stage;
    if (ev.action === "draft" && ev.questionId)
      state.drafts[ev.questionId] = ev.response ?? "";
    if (ev.action === "hint" && ev.questionId) state.hints.push(ev.questionId);
    if (ev.action === "solution" && ev.questionId)
      state.solutions.push(ev.questionId);
    if (ev.action === "answer") {
      if (!stage.questions.includes(ev.questionId ?? ""))
        throw new Error("Question does not belong to stage");
      const item = questionItem(ev.questionId!);
      // stage 9 (D14): THE grading decision; an unresolved answer is not an answer (P1) and changes nothing
      const decision = programDecision(`program:${lesson.id}:${ev.questionId}`, ev.response ?? "", (ev as { decision?: unknown }).decision);
      if (decision.verdict === "unresolved") continue;
      const correct = decision.verdict === "correct";
      let text: string;
      try {
        // the evidence ledger reads its own answer list: a credited answer is given to it in the stored form, so it agrees with the decision
        text = answerKey(ev.questionId!, correct ? lesson.questions.find((q) => q.id === ev.questionId)!.answer : ev.response ?? "");
      } catch {
        text = `math-unread:${ev.response ?? ""}`;
      }
      const assisted =
        state.hints.includes(ev.questionId!) ||
        state.solutions.includes(ev.questionId!);
      const prior = ledger.exposures.get(item.id)?.count ?? 0;
      const event: EvidenceEvent = {
        kind: "evidence",
        id: `native:${ev.id}`,
        at: ev.at,
        session:
          ev.sessionId ?? `legacy-unknown:${ev.journey}:${ev.lessonVersion}`,
        item: { id: item.id, version: item.version },
        response: { kind: "typed", text },
        use: ev.stage === "retention" ? "retention" : "practice",
      };
      // Receipt counts cannot invent hint event IDs. Omitted lineage is explicitly unknown; provisional gate holds.
      ledger.apply(event);
      state.answers[ev.questionId!] = {
        correct,
        response: ev.response!,
        assisted: assisted || prior > 0,
      };
      state.attempts++;
      state.drafts[ev.questionId!] = ev.response!;
    }
    if (ev.action === "complete") {
      const position = lesson.stages.findIndex((s) => s.id === ev.stage);
      const priorComplete = lesson.stages
        .slice(0, position)
        .every((s) => state.completed.includes(s.id));
      const answered = stage.questions.every((q) => state.answers[q]);
      const due = state.retentionDueAt;
      if (
        !priorComplete ||
        !answered ||
        (ev.stage === "retention" &&
          (!due || Date.parse(ev.at) < Date.parse(due)))
      )
        continue;
      if (!state.completed.includes(ev.stage)) state.completed.push(ev.stage);
      if (ev.retentionDueAt && !state.retentionDueAt)
        state.retentionDueAt = ev.retentionDueAt;
      state.current =
        lesson.stages.find((s) => !state.completed.includes(s.id))?.id ??
        "retention";
    }
  }
  return {
    ledger,
    programs,
    profile: sharedProfile({ learnerId }, ledger, lesson.competencyId, now),
  };
}
export function percent(state: StageProgress) {
  return Math.round(
    (new Set(state.completed).size / lesson.stages.length) * 100,
  );
}
export function canComplete(
  state: StageProgress,
  stageId: string,
  now = Date.now(),
) {
  const i = lesson.stages.findIndex((s) => s.id === stageId),
    stage = lesson.stages[i];
  if (!stage) return false;
  return (
    lesson.stages.slice(0, i).every((s) => state.completed.includes(s.id)) &&
    stage.questions.every((q) => state.answers[q]) &&
    (stageId !== "retention" ||
      (!!state.retentionDueAt && now >= Date.parse(state.retentionDueAt)))
  );
}
