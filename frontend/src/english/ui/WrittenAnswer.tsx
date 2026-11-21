/**
 * Write an answer (logic/reading/written): read a passage, type a short answer to a question on it, as in a school
 * exam. Checked by rule; a second try after a miss, then the model answer. The typed words are never stored.
 */
import { useRef, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { WrittenSitting, pickWritten, writtenSummary, type WrittenRecord } from "../logic/reading/written.ts";
import { asReadingLevel } from "../logic/streams/level-check.ts";
import { Flag } from "./Flag.tsx";

export function WrittenAnswer({ learner, onLeave, onChanged }: { learner: Learner; onLeave: () => void; onChanged: () => void }) {
  const [sitting, setSitting] = useState<WrittenSitting | null>(null);
  const [text, setText] = useState("");
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<WrittenRecord[]>([]);
  const tick = () => setTick((t) => t + 1);
  const level = asReadingLevel(learner.levels().reading?.start) ?? 2;
  const save = async (s: WrittenSitting) => {
    unsaved.current.push(...s.take());
    try {
      while (unsaved.current.length) {
        await learner.recordWritten([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    onChanged();
  };

  if (!sitting) {
    const sum = writtenSummary(learner.writtenRecords());
    return (
      <main className="page vocab written" data-phase="intro" aria-labelledby="written-title">
        <button type="button" className="link" onClick={onLeave}>
          ← Back
        </button>
        <p className="eyebrow">Reading · Write an answer</p>
        <h1 id="written-title" className="hero">
          Write an answer
        </h1>
        <p className="sub">Read a short passage, then write your answer to a question on it, as in a test. Answer in a full sentence. Your words are checked and then forgotten; they are not kept.</p>
        {sum.answered > 0 && (
          <p className="small">
            {sum.right} of {sum.answered} answers right · {sum.firstTry} on the first try
          </p>
        )}
        <button type="button" className="primary" onClick={() => (setSitting(new WrittenSitting(pickWritten(learner.writtenRecords(), level), `wa-${Date.now()}`)), setText(""), scrollTo(0, 0))}>
          Start
        </button>
      </main>
    );
  }

  const v = sitting.snapshot();
  if (v.phase === "done")
    return (
      <main className="page vocab written" data-phase="done">
        <p className="eyebrow">Reading · Write an answer</p>
        <h1 className="hero">
          {v.right} of {v.total} right
        </h1>
        {failed && (
          <p className="warning" role="alert">
            This could not be saved. Check the connection and try again.
          </p>
        )}
        <button type="button" className="primary" onClick={() => (setSitting(null), onLeave())}>
          Done
        </button>
      </main>
    );
  const it = v.item!;
  const m = v.mark;
  return (
    <main className="page vocab written" data-phase={v.phase} data-item={it.id} data-try={v.tries}>
      <button type="button" className="link" onClick={() => (setSitting(null), onLeave())}>
        ← Stop
      </button>
      <p className="pill">
        Question {v.index + 1} of {v.total}
      </p>
      <article className="long-text" data-written-passage>
        <h2>{v.passage!.title}</h2>
        {v.passage!.text.split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </article>
      <label className="prompt" htmlFor="written-answer">
        {it.question}
      </label>
      <textarea id="written-answer" rows={3} value={text} disabled={v.reveal} onChange={(e) => setText(e.target.value)} placeholder="Write your answer in a sentence." />
      {!m && (
        <button type="button" className="primary" disabled={!text.trim()} onClick={() => (sitting.check(text), tick())}>
          Check
        </button>
      )}
      {m && (
        <div className="dict-feedback" role="status" data-correct={m.correct}>
          <p className={m.correct ? "words-verdict right" : "words-verdict"}>{m.correct ? "✓ Right" : v.reveal ? "Not quite" : "Not yet"}</p>
          {m.correct && m.short && <p className="small">Right. In a test, answer in a full sentence, like the one below.</p>}
          {m.correct && !m.short && !m.sentence && <p className="small">Start with a capital letter and end with a full stop.</p>}
          {!m.correct && !v.reveal && (
            <>
              <p className="small">Your answer is missing something. Hint: {it.hint}</p>
              <button type="button" className="primary" onClick={() => (sitting.again(), tick())}>
                Try again
              </button>
            </>
          )}
          {v.reveal && (
            <>
              <p className="small">A good answer:</p>
              <p className="dict-reveal">{it.model}</p>
              <Flag stream="written" id={it.id} />
              <button
                type="button"
                className="primary"
                autoFocus
                onClick={() => {
                  sitting.next();
                  setText("");
                  if (sitting.snapshot().phase === "done") void save(sitting);
                  tick();
                  scrollTo(0, 0);
                }}
              >
                {v.index + 1 < v.total ? "Next question" : "Finish"}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
