/**
 * Tasks done with a grown-up (content/english/guided): speaking, finding things out and reading a book of one's
 * own. The app cannot hear or mark these. It shows the task and what to look for; an adult ticks what they saw,
 * and that is kept as a record. Practice-only: nothing here is evidence for the engine.
 */
import tasksJson from "../../../../../content/english/guided/tasks.json";

export interface GuidedTask {
  id: string;
  /** The syllabus and the line of it that this task serves. */
  syllabus: string;
  outcome: string;
  title: string;
  /** What the learner does, said to the learner. */
  task: string;
  /** What the adult looks for. */
  look: string[];
}
export interface Guided {
  version: number;
  status: string;
  tasks: GuidedTask[];
}
/** One task finished with an adult: which of the things to look for were ticked. */
export type GuidedRecord = { type: "done"; task: string; syllabus: string; outcome: string; seen: number[]; of: number };

export function guidedProblems(g: Guided): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const t of g.tasks) {
    if (ids.has(t.id)) out.push(`${t.id}: listed twice`);
    ids.add(t.id);
    if (!t.syllabus || !t.outcome) out.push(`${t.id}: no syllabus line`);
    if (!t.title.trim() || !t.task.trim()) out.push(`${t.id}: no title or task`);
    if (t.look.length < 2 || t.look.length > 4 || new Set(t.look).size !== t.look.length) out.push(`${t.id}: needs two to four different things to look for`);
    if (/\d/.test(t.task)) out.push(`${t.id}: numbers are written as words`);
  }
  return out;
}

export const GUIDED: Guided = tasksJson as unknown as Guided;
{
  const problems = guidedProblems(GUIDED);
  if (problems.length) throw new Error(`guided tasks: ${problems.slice(0, 5).join("; ")}`);
}

export const tasksFor = (g: Guided, syllabus: string, outcome?: string): GuidedTask[] => g.tasks.filter((t) => t.syllabus === syllabus && (!outcome || t.outcome === outcome));

/** A record of a task done: the ticks kept are whole numbers within the list, each once. */
export function done(task: GuidedTask, seen: readonly number[]): GuidedRecord {
  const kept = [...new Set(seen)].filter((i) => Number.isInteger(i) && i >= 0 && i < task.look.length).sort((a, b) => a - b);
  return { type: "done", task: task.id, syllabus: task.syllabus, outcome: task.outcome, seen: kept, of: task.look.length };
}

export interface GuidedSummary {
  /** Tasks done at least once, with the ticks of the latest time. */
  done: Map<string, { seen: number; of: number; times: number }>;
}
export function guidedSummary(records: readonly GuidedRecord[]): GuidedSummary {
  const out = new Map<string, { seen: number; of: number; times: number }>();
  for (const r of records) out.set(r.task, { seen: r.seen.length, of: r.of, times: (out.get(r.task)?.times ?? 0) + 1 });
  return { done: out };
}
