/**
 * Tasks to do with a grown-up: the task for the learner, what the adult looks for, and a record of what they
 * ticked. The app does not hear or mark anything here, and says so.
 */
import { useEffect, useRef, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { LIMIT, checkWriting, type WritingCheck } from "../logic/writing/check.ts";
import { AI_LIMIT, CONSENT_TEXT, MARK, MET_WORD, notReady, type Feedback, type FeedbackService, type FeedbackStatus } from "../logic/writing/feedback.ts";
import { GUIDED, done, guidedSummary, tasksFor, wordCount, type GuidedSummary, type GuidedTask } from "../logic/guided/guided.ts";

/**
 * AI feedback on one piece: offered only where the server has it switched on, after a parent's yes, and once the
 * free check is clean. The feedback stays on the screen until the writing changes; it is never stored.
 */
export function AiFeedback({ task, text, check, service }: { task: GuidedTask; text: string; check: WritingCheck | null; service: FeedbackService }) {
  const [status, setStatus] = useState<FeedbackStatus | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [got, setGot] = useState<{ text: string; feedback: Feedback } | null>(null);
  useEffect(() => {
    let live = true;
    service.status().then((s) => live && setStatus(s)).catch(() => live && setStatus(null));
    return () => void (live = false);
  }, [service]);
  if (!status?.available || !task.write) return null;
  const feedback = got && got.text === text ? got.feedback : null;
  const wait = notReady(check, task.write);
  const left = feedback ? feedback.left : status.left;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work. Try again.");
      // a refused or failed request may still have used one of the week's pieces: ask the server how many are left
      await service.status().then(setStatus).catch(() => undefined);
    }
    setBusy(false);
  };
  return (
    <div className="ai-feedback" data-ai={feedback ? "answered" : wait ? "waiting" : !status.consent ? "consent" : left ? "ready" : "used"}>
      <b>AI feedback</b>
      {feedback ? (
        <div role="status">
          <ul>
            {feedback.points.map((p, i) => (
              <li key={i} data-met={p.met}>
                <span aria-hidden="true">{MARK[p.met]}</span> <b>{feedback.look[i]}:</b> {MET_WORD[p.met]}. {p.note}
              </li>
            ))}
            <li data-strength>
              <span aria-hidden="true">★</span> {feedback.strength}
            </li>
            <li data-next>
              <span aria-hidden="true">→</span> <b>Next time:</b> {feedback.next}
            </li>
          </ul>
          <p className="small">
            {AI_LIMIT} {feedback.left} of {status.limit} left this week.
          </p>
        </div>
      ) : wait ? (
        <p className="small">{wait}</p>
      ) : !status.consent ? (
        <>
          <label className="guided-look">
            <input type="checkbox" checked={agreed} onChange={() => setAgreed(!agreed)} /> {CONSENT_TEXT}
          </label>
          <button type="button" className="secondary" disabled={!agreed || busy} onClick={() => void run(async () => (await service.agree(true), setStatus({ ...status, consent: true })))}>
            Agree
          </button>
        </>
      ) : left ? (
        <button type="button" className="secondary" disabled={busy} onClick={() =>
            void run(async () => {
              const feedback = await service.ask(task.id, text, check!.notes.map((n) => n.id));
              setGot({ text, feedback });
              setStatus({ ...status, left: feedback.left });
            })
          }>
          {busy ? "Reading your writing …" : `Ask for AI feedback (${left} of ${status.limit} left this week)`}
        </button>
      ) : (
        <p className="small">This week's {status.limit} pieces of AI feedback are used. More come on Monday.</p>
      )}
      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function TaskTile({ task, was, feedback, onDone }: { task: GuidedTask; feedback?: FeedbackService; was: { seen: number; of: number; times: number; words?: number } | undefined; onDone: (seen: number[], writing?: { words: number; self: number[] }) => void }) {
  const [seen, setSeen] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [self, setSelf] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  const [check, setCheck] = useState<WritingCheck | null>(null);
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
            setCheck(null);
            setOpen(false);
          }}
        >
          {task.write && (
            <>
              <label htmlFor={`write-${task.id}`} className="small">
                Write here, or on paper. Aim for {task.write.min} to {task.write.max} words.
              </label>
              <textarea id={`write-${task.id}`} className="guided-write" rows={8} value={text} onChange={(e) => (setText(e.target.value), setCopied(false), setCheck(null))} />
              <p className="small" data-words={words}>
                {words} {words === 1 ? "word" : "words"}
                {words > 0 && words < task.write.min ? ": a little more" : words > task.write.max ? ": over the length asked" : ""}. The app does not keep or mark your writing.
              </p>
              {text.trim() && typeof navigator !== "undefined" && !!navigator.clipboard && (
                <button type="button" className="link" onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true))}>
                  {copied ? "Copied" : "Copy my writing to keep it"}
                </button>
              )}
              <button type="button" className="secondary" disabled={!text.trim()} onClick={() => setCheck(checkWriting(text, { ...task.write!, ...(task.form ? { form: task.form } : {}) }))}>
                Check my writing
              </button>
              {check && (
                <div className="writing-notes" role="status" data-fixes={check.notes.filter((n) => n.level === "fix").length}>
                  <ul>
                    {check.notes.map((n) => (
                      <li key={n.id} data-note={n.id} data-level={n.level}>
                        <span aria-hidden="true">{n.level === "fix" ? "✏️" : n.level === "tip" ? "💡" : "✓"}</span> {n.text}
                      </li>
                    ))}
                  </ul>
                  <p className="small">{LIMIT}</p>
                </div>
              )}
              {feedback && <AiFeedback task={task} text={text} check={check} service={feedback} />}
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

export function GuidedView({ tasks, summary, heading, feedback, onDone, onBack }: { tasks: GuidedTask[]; feedback?: FeedbackService; summary: GuidedSummary; heading: string; onDone: (task: GuidedTask, seen: number[], writing?: { words: number; self: number[] }) => void; onBack: () => void }) {
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
        <TaskTile key={t.id} task={t} was={summary.done.get(t.id)} feedback={feedback} onDone={(seen, w) => onDone(t, seen, w)} />
      ))}
      {!tasks.length && <p>There are no tasks for this line yet.</p>}
    </main>
  );
}

export function GuidedTasks({ learner, syllabus, outcome, heading, feedback, onLeave, onChanged }: { learner: Learner; feedback?: FeedbackService; syllabus: string; outcome?: string; heading: string; onLeave: () => void; onChanged: () => void }) {
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
      <GuidedView tasks={tasksFor(GUIDED, syllabus, outcome)} summary={guidedSummary(learner.guidedRecords())} heading={heading} feedback={feedback} onDone={(t, seen, w) => void save(t, seen, w)} onBack={onLeave} />
    </>
  );
}
