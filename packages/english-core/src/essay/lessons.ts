/**
 * The lesson programme for a competency: a fixed, ordered set of lesson parts, completed over as many sessions as the
 * learner needs. Completion is LEARNING PROGRESS only. It is read from the ledger's own lesson records (intervention
 * events), it is never reduced (missing assessment content, a blocked check or a new essay never erase it), and it is
 * kept apart from what the evidence shows: completing every lesson is neither demonstrated understanding nor mastery.
 */
import type { CapabilityId, InterventionEvent, LedgerEvent } from "../types.ts";
import { essayRecords } from "./analysis.ts";
import type { EssayContext } from "./competencies.ts";

export interface LessonProgramme {
  competency: CapabilityId;
  /** The programme's lesson parts in order, each with when it was first completed (null: not yet). */
  lessons: { id: string; completedAt: string | null }[];
  completed: number;
  total: number;
  /** Lessons completed, as a percentage of the programme. Progress, not understanding or mastery. */
  percent: number;
  /** Sessions in which lessons of this programme were completed. */
  sessions: number;
  /** Where the programme came from: fixed by the first learning journey that included it, or the app's lesson list. */
  fixedBy: string | null;
}

/** The lesson programme and its completion history for one competency (null when the app has no lesson for it). */
export function lessonProgramme(ectx: EssayContext, events: readonly LedgerEvent[], capability: CapabilityId): LessonProgramme | null {
  // fixed when the first journey that teaches it was created, so a later content change never rewrites it
  const first = essayRecords(events, "journey")
    .flatMap((r) => r.record.journey.trees.flatMap((t) => t.nodes.filter((n) => n.competency === capability).flatMap((n) => n.steps.filter((s) => s.kind === "teach" && s.content.refs.length).map((s) => ({ journey: r.record.journey.id, refs: s.content.refs })))))
    .at(0);
  const ids = first?.refs ?? ectx.lessons.get(capability) ?? [];
  if (!ids.length) return null;
  const done = new Map<string, InterventionEvent>();
  for (const e of events) if (e.kind === "intervention" && e.capability === capability && e.content && ids.includes(e.content) && !done.has(e.content)) done.set(e.content, e);
  const lessons = ids.map((id) => ({ id, completedAt: done.get(id)?.at ?? null }));
  const completed = lessons.filter((l) => l.completedAt).length;
  return {
    competency: capability,
    lessons,
    completed,
    total: ids.length,
    percent: Math.round((completed / ids.length) * 100),
    sessions: new Set([...done.values()].map((e) => e.session)).size,
    fixedBy: first?.journey ?? null,
  };
}

/** The next lesson part of the programme not yet completed (null when the programme is complete). */
export function nextProgrammeLesson(ectx: EssayContext, events: readonly LedgerEvent[], capability: CapabilityId): string | null {
  return lessonProgramme(ectx, events, capability)?.lessons.find((l) => !l.completedAt)?.id ?? null;
}
