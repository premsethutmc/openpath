/**
 * Tasks to do with a grown-up: the task for the learner, what the adult looks for, and a record of what they
 * ticked. The app does not hear or mark anything here, and says so.
 */
import { useRef, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { GUIDED, done, guidedSummary, tasksFor, type GuidedSummary, type GuidedTask } from "../logic/guided/guided.ts";

function TaskTile({ task, was, onDone }: { task: GuidedTask; was: { seen: number; of: number; times: number } | undefined; onDone: (seen: number[]) => void }) {
  const [seen, setSeen] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  return (
    <section className="tile guided-task" data-task={task.id} data-done={!!was} aria-labelledby={`guided-${task.id}`}>
      <b id={`guided-${task.id}`}>
        {was ? "✓ " : ""}
        {task.title}
      </b>
      <p>{task.task}</p>
      {was && (
        <p className="small" data-was>
          Done {was.times === 1 ? "once" : `${was.times} times`}. Last time a grown-up ticked {was.seen} of {was.of}.
        </p>
      )}
      {!open ? (
        <button type="button" className="secondary" onClick={() => setOpen(true)}>
          {was ? "Do it again" : "I did this with a grown-up"}
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onDone(seen);
            setSeen([]);
            setOpen(false);
          }}
        >
          <p className="small">For the grown-up: tick what you saw or heard. Leave the rest for next time.</p>
          {task.look.map((l, i) => (
            <label key={i} className="guided-look">
              <input type="checkbox" checked={seen.includes(i)} onChange={() => setSeen(seen.includes(i) ? seen.filter((x) => x !== i) : [...seen, i])} /> {l}
            </label>
          ))}
          <button type="submit" className="primary">
            Save
          </button>
        </form>
      )}
    </section>
  );
}

export function GuidedView({ tasks, summary, heading, onDone, onBack }: { tasks: GuidedTask[]; summary: GuidedSummary; heading: string; onDone: (task: GuidedTask, seen: number[]) => void; onBack: () => void }) {
  return (
    <main className="page vocab guided" aria-labelledby="guided-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">With a grown-up</p>
      <h1 id="guided-title" className="hero">
        {heading}
      </h1>
      <p className="sub">These are done aloud or away from the screen. The app cannot hear or mark them: a grown-up listens and ticks what they saw.</p>
      {tasks.map((t) => (
        <TaskTile key={t.id} task={t} was={summary.done.get(t.id)} onDone={(seen) => onDone(t, seen)} />
      ))}
      {!tasks.length && <p>There are no tasks for this line yet.</p>}
    </main>
  );
}

export function GuidedTasks({ learner, syllabus, outcome, heading, onLeave, onChanged }: { learner: Learner; syllabus: string; outcome?: string; heading: string; onLeave: () => void; onChanged: () => void }) {
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<ReturnType<typeof done>[]>([]);
  const [, setTick] = useState(0);
  const save = async (task: GuidedTask, seen: number[]) => {
    unsaved.current.push(done(task, seen));
    try {
      while (unsaved.current.length) {
        await learner.recordGuided(unsaved.current[0]);
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    setTick((t) => t + 1);
    onChanged();
  };
  return (
    <>
      {failed && (
        <p className="warning" role="alert">
          This could not be saved. Check the connection; saving the next task will try again.
        </p>
      )}
      <GuidedView tasks={tasksFor(GUIDED, syllabus, outcome)} summary={guidedSummary(learner.guidedRecords())} heading={heading} onDone={(t, seen) => void save(t, seen)} onBack={onLeave} />
    </>
  );
}
