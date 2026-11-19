/**
 * Tasks to do with a grown-up: the task for the learner, what the adult looks for, and a record of what they
 * ticked. The app does not hear or mark anything here, and says so.
 */
import { useRef, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { GUIDED, done, guidedSummary, tasksFor, wordCount, type GuidedSummary, type GuidedTask } from "../logic/guided/guided.ts";

function TaskTile({ task, was, onDone }: { task: GuidedTask; was: { seen: number; of: number; times: number; words?: number } | undefined; onDone: (seen: number[], writing?: { words: number; self: number[] }) => void }) {
  const [seen, setSeen] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [self, setSelf] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  const words = wordCount(text);
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
          Done {was.times === 1 ? "once" : `${was.times} times`}. Last time a grown-up ticked {was.seen} of {was.of}
          {was.words !== undefined ? `, for ${was.words} words` : ""}.
        </p>
      )}
      {!open ? (
        <button type="button" className="secondary" onClick={() => setOpen(true)}>
          {was ? "Do it again" : task.write ? "Start writing" : "I did this with a grown-up"}
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onDone(seen, task.write ? { words, self } : undefined);
            setSeen([]);
            setSelf([]);
            setText("");
            setCopied(false);
            setOpen(false);
          }}
        >
          {task.write && (
            <>
              <label htmlFor={`write-${task.id}`} className="small">
                Write here, or on paper. Aim for {task.write.min} to {task.write.max} words.
              </label>
              <textarea id={`write-${task.id}`} className="guided-write" rows={8} value={text} onChange={(e) => (setText(e.target.value), setCopied(false))} />
              <p className="small" data-words={words}>
                {words} {words === 1 ? "word" : "words"}
                {words > 0 && words < task.write.min ? ": a little more" : words > task.write.max ? ": over the length asked" : ""}. The app does not keep or mark your writing.
              </p>
              {text.trim() && typeof navigator !== "undefined" && !!navigator.clipboard && (
                <button type="button" className="link" onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true))}>
                  {copied ? "Copied" : "Copy my writing to keep it"}
                </button>
              )}
              <p className="small">Check your own work first:</p>
              {task.self!.map((l, i) => (
                <label key={`s${i}`} className="guided-look">
                  <input type="checkbox" checked={self.includes(i)} onChange={() => setSelf(self.includes(i) ? self.filter((x) => x !== i) : [...self, i])} /> {l}
                </label>
              ))}
            </>
          )}
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

export function GuidedView({ tasks, summary, heading, onDone, onBack }: { tasks: GuidedTask[]; summary: GuidedSummary; heading: string; onDone: (task: GuidedTask, seen: number[], writing?: { words: number; self: number[] }) => void; onBack: () => void }) {
  const writing = tasks.some((t) => t.write);
  return (
    <main className="page vocab guided" aria-labelledby="guided-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">{writing ? "Writing, with a grown-up" : "With a grown-up"}</p>
      <h1 id="guided-title" className="hero">
        {heading}
      </h1>
      <p className="sub">{writing ? "Write to the task, check your own work against the list, then show it to a grown-up, who ticks what they see. The app does not keep or mark the writing." : "These are done aloud or away from the screen. The app cannot hear or mark them: a grown-up listens and ticks what they saw."}</p>
      {tasks.map((t) => (
        <TaskTile key={t.id} task={t} was={summary.done.get(t.id)} onDone={(seen, w) => onDone(t, seen, w)} />
      ))}
      {!tasks.length && <p>There are no tasks for this line yet.</p>}
    </main>
  );
}

export function GuidedTasks({ learner, syllabus, outcome, heading, onLeave, onChanged }: { learner: Learner; syllabus: string; outcome?: string; heading: string; onLeave: () => void; onChanged: () => void }) {
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<ReturnType<typeof done>[]>([]);
  const [, setTick] = useState(0);
  const save = async (task: GuidedTask, seen: number[], writing?: { words: number; self: number[] }) => {
    unsaved.current.push(done(task, seen, writing));
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
      <GuidedView tasks={tasksFor(GUIDED, syllabus, outcome)} summary={guidedSummary(learner.guidedRecords())} heading={heading} onDone={(t, seen, w) => void save(t, seen, w)} onBack={onLeave} />
    </>
  );
}
