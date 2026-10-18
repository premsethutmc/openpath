/**
 * One fixed exam chapter (first: JEE Main, Quadratic Equations), told top to bottom:
 *   recap → worked example → practice with hints → check without hints → timed section → revision check (7 days later)
 *
 * The same account activity records as the fractions program (kind "math_activity", subject "mathematics", one pupil),
 * marked with `program`. Replay is pure: chapter progress (steps done) is kept apart from the shared engine, which gets
 * each answer as provisional practice evidence (the content gate holds it: no estimate changes, never verified). The
 * timed section's score uses the official JEE Main 2026 marking (+4 / −1 / 0): a practice score, not a readiness claim.
 */
import spec from "../../../content/mathematics/programs/jee-quadratics.v1.json";
import { indexContent, scoreCode } from "../../english-core/src/content";
import type { EvidenceEvent, Item } from "../../english-core/src/types";
import { sharedProfile } from "./canonical";
import { mathematicsLedger } from "./registration";

export const chapter = spec;
export type Stage = (typeof spec.stages)[number];
export type Question = (typeof spec.questions)[number] & { options?: string[]; hint?: string };
export type ChapterAction = "open" | "hint" | "solution" | "answer" | "complete";

export interface ChapterActivity {
  kind: "math_activity";
  program: "jee-quadratics";
  id: string;
  at: string;
  learnerId: string;
  journey: "jee-main";
  lessonVersion: string;
  action: ChapterAction;
  stage: string;
  questionId?: string;
  response?: string;
  elapsedMs: number;
  sessionId?: string;
  savedAt?: string;
  retentionDueAt?: string;
}

export interface ChapterState {
  completed: string[];
  /** The first step not yet done: where the learner continues. */
  current: string;
  answers: Record<string, { response: string; correct: boolean; assisted: boolean; at: string }>;
  hints: string[];
  solutions: string[];
  /** When the timed section was opened (its clock starts there). */
  timedOpenedAt: string | null;
  retentionDueAt: string | null;
  timeMs: number;
}

export const question = (id: string): Question => {
  const q = spec.questions.find((x) => x.id === id);
  if (!q) throw new Error(`Unknown chapter question ${id}`);
  return q as Question;
};
export const stageOf = (id: string): Stage => spec.stages.find((s) => s.id === id)!;
export const LETTERS = ["A", "B", "C", "D"] as const;

/** The canonical answer text: an option letter, or an integer (a leading + and spaces ignored; − accepted). */
export function normalise(q: Question, raw: string): string | null {
  const t = raw.trim().replace(/−/g, "-").replace(/^\+/, "");
  if (q.type === "choice") return /^[A-D]$/i.test(t) ? t.toUpperCase() : null;
  if (!/^-?\d{1,9}$/.test(t)) return null;
  return String(Number(t));
}
export const isCorrect = (q: Question, raw: string) => normalise(q, raw) === normalise(q, q.answer);

export function nativeItem(q: Question): Item & { kind: "code" } {
  return {
    kind: "code",
    id: `math:${spec.id}:${spec.version}:${q.id}`,
    version: 1,
    family: `math:${spec.id}:${q.skill}@1`,
    target: spec.competencyId,
    format: "typed:math-chapter@1",
    prompt: q.prompt,
    answers: [`${q.type}:${normalise(q, q.answer)}`],
    a: 1,
    b: 4,
    evidence_status: "provisional",
    review: spec.reviewNote,
    explain: q.solution,
  };
}

const empty = (): ChapterState => ({ completed: [], current: spec.stages[0].id, answers: {}, hints: [], solutions: [], timedOpenedAt: null, retentionDueAt: null, timeMs: 0 });

/** Steps that can be finished now (the earlier ones done; each question answered, except in the timed section). */
export function canComplete(state: ChapterState, stageId: string, now = Date.now()): boolean {
  const i = spec.stages.findIndex((s) => s.id === stageId);
  if (i < 0) return false;
  const stage = spec.stages[i];
  if (!spec.stages.slice(0, i).every((s) => state.completed.includes(s.id))) return false;
  if (stageId === spec.stages.at(-1)!.id && !(state.retentionDueAt && now >= Date.parse(state.retentionDueAt))) return false;
  if (stage.kind === "timed") return true;
  return stage.questions.every((q) => state.answers[q]);
}

/** The pure replay of the chapter's own activity records. Records of other programs are skipped. */
export function replay(learnerId: string, events: readonly { kind: string; program?: string }[], now = new Date().toISOString()) {
  const ledger = mathematicsLedger(learnerId);
  ledger.ctx.content = indexContent({ items: spec.questions.map((q) => nativeItem(q as Question)), passages: [], goals: [], misspellings: {} }, ledger.ctx.index);
  const state = empty();
  const seen = new Set<string>();
  for (const raw of events) {
    if (raw.kind !== "math_activity" || raw.program !== spec.id) continue;
    const ev = raw as ChapterActivity;
    if (seen.has(ev.id) || ev.learnerId !== learnerId || ev.lessonVersion !== spec.version) continue;
    seen.add(ev.id);
    const stage = spec.stages.find((s) => s.id === ev.stage);
    if (!stage) continue;
    state.timeMs += Math.max(0, Math.min(ev.elapsedMs || 0, 3_600_000));
    if (ev.action === "open" && stage.kind === "timed" && !state.timedOpenedAt) state.timedOpenedAt = ev.at;
    if (ev.action === "hint" && ev.questionId) state.hints.push(ev.questionId);
    if (ev.action === "solution" && ev.questionId) state.solutions.push(ev.questionId);
    if (ev.action === "answer" && ev.questionId && stage.questions.includes(ev.questionId) && !state.answers[ev.questionId]) {
      const q = question(ev.questionId);
      const text = normalise(q, ev.response ?? "");
      if (text === null) continue;
      const item = nativeItem(q);
      const evidence: EvidenceEvent = {
        kind: "evidence",
        id: `native:${ev.id}`,
        at: ev.at,
        session: ev.sessionId ?? `legacy-unknown:${spec.id}`,
        item: { id: item.id, version: item.version },
        response: { kind: "typed", text: `${q.type}:${text}` },
        use: stage.id === spec.stages.at(-1)!.id ? "retention" : "practice",
      };
      ledger.apply(evidence);
      state.answers[q.id] = { response: text, correct: scoreCode(item, evidence.response).correct, assisted: state.hints.includes(q.id) || state.solutions.includes(q.id), at: ev.at };
    }
    if (ev.action === "complete" && canComplete(state, stage.id, Date.parse(ev.at)) && !state.completed.includes(stage.id)) {
      state.completed.push(stage.id);
      if (ev.retentionDueAt && !state.retentionDueAt) state.retentionDueAt = ev.retentionDueAt;
    }
  }
  state.current = spec.stages.find((s) => !state.completed.includes(s.id))?.id ?? spec.stages.at(-1)!.id;
  return { state, ledger, profile: sharedProfile({ learnerId }, ledger, spec.competencyId, now) };
}

/** Chapter progress: steps done out of all steps. Never proficiency. */
export const percent = (state: ChapterState) => Math.round((100 * state.completed.length) / spec.stages.length);

/** The timed section's practice score under the official marking (+4 correct, −1 incorrect, 0 unanswered). */
export function timedScore(state: ChapterState) {
  const ids = stageOf("timed").questions;
  let score = 0;
  const rows = ids.map((id) => {
    const a = state.answers[id];
    const mark = !a ? spec.marking.unanswered : a.correct ? spec.marking.correct : spec.marking.incorrect;
    score += mark;
    return { id, answered: !!a, correct: a?.correct ?? false, mark };
  });
  return { score, maximum: ids.length * spec.marking.correct, rows };
}

/** Seconds left in the timed section (null: not opened yet). */
export function timeLeft(state: ChapterState, now = Date.now()): number | null {
  if (!state.timedOpenedAt) return null;
  const limit = (stageOf("timed") as Stage & { timeLimitSec: number }).timeLimitSec;
  return Math.max(0, limit - Math.floor((now - Date.parse(state.timedOpenedAt)) / 1000));
}
