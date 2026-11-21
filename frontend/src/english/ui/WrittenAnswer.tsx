/**
 * Write an answer (logic/reading/written): read a passage, type a short answer to a question on it, as in a school
 * exam. Checked by rule; a second try after a miss, then the model answer. The typed words are never stored.
 */
import { useEffect, useRef, useState } from "react";
import { READING_AI_CONSENT, type ReadingAiService, type ReadingAiStatus } from "../logic/reading/ai-check.ts";
import type { Learner } from "../logic/learner.ts";
import { WrittenSitting, pickWritten, writtenSummary, type WrittenRecord } from "../logic/reading/written.ts";
import { asReadingLevel } from "../logic/streams/level-check.ts";
import { Flag } from "./Flag.tsx";

export function WrittenAnswer({ learner, onLeave, onChanged, aiCheck }: { learner: Learner; onLeave: () => void; onChanged: () => void; aiCheck?: ReadingAiService }) {
  const [sitting, setSitting] = useState<WrittenSitting | null>(null);
  const [ai, setAi] = useState<ReadingAiStatus | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    let live = true;
    aiCheck?.status().then((st) => live && setAi(st), () => live && setAi(null));
    return () => {
      live = false;
    };
  }, [aiCheck]);
  const agree = async (granted: boolean) => {
    if (!aiCheck) return;
    try {
      await aiCheck.agree(granted);
      setAi(await aiCheck.status());
    } catch {
      /* stays as it was */
    }
  };
  /** Rules first; when they say wrong, the AI checks again (where a parent agreed). Its "no" or a failure keeps the rules' mark. */
  const check = async (s: WrittenSitting) => {
    const it = s.snapshot().item;
    if (it && aiCheck && ai?.available && ai.consent && s.wantsSecondCheck(text)) {
      setChecking(true);
      let second: boolean | undefined;
      try {
        second = await aiCheck.check(it.id, text);
      } catch {
        second = undefined;
      }
      setChecking(false);
      s.check(text, second);
    } else s.check(text);
    tick();
  };
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
        {ai?.available && !ai.consent && (
          <div className="tile" data-reading-ai="consent">
            <p className="small">{READING_AI_CONSENT}</p>
            <button type="button" className="secondary" onClick={() => void agree(true)}>
              A parent agrees
            </button>
          </div>
        )}
        {ai?.available && ai.consent && (
          <p className="small" data-reading-ai="on">
            When an answer is marked wrong, an AI checks it again. It can be wrong too.{" "}
            <button type="button" className="link" onClick={() => void agree(false)}>
              Turn this off
            </button>
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
        <button type="button" className="primary" disabled={!text.trim() || checking} onClick={() => void check(sitting)}>
          {checking ? "Checking again…" : "Check"}
        </button>
      )}
      {m && (
        <div className="dict-feedback" role="status" data-correct={m.correct}>
          <p className={m.correct ? "words-verdict right" : "words-verdict"}>{m.correct ? "✓ Right" : v.reveal ? "Not quite" : "Not yet"}</p>
          {m.ai === "right" && <p className="small" data-ai-second="right">Checked again by the AI: your answer means the same as a good answer.</p>}
          {m.correct && m.short && <p className="small">Right. In a test, answer in a full sentence, like the one below.</p>}
          {m.correct && !m.short && !m.sentence && <p className="small">Start with a capital letter and end with a full stop.</p>}
          {!m.correct && !v.reveal && (
            <>
              <p className="small">
                {m.guard === "wrong"
                  ? "Part of your answer does not match the passage. Check it again."
                  : m.guard === "choice"
                    ? "Give one answer, not a choice of answers."
                    : m.guard === "long"
                      ? "Answer in one short sentence of your own, not the whole passage."
                      : `Your answer is missing something. Hint: ${it.hint}`}
              </p>
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
