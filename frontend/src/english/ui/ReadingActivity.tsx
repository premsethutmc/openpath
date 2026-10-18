import { useState } from "react";
import type { Passage } from "../../../../packages/english-core/src/index.ts";
import type { WrittenAnswerEvent } from "../logic/events.ts";
import { type Learner, READING_MAX_CHARS } from "../logic/learner.ts";
import type { ComprehensionLevel } from "../logic/reading.ts";
import { speak } from "./speech.ts";

interface Props {
  learner: Learner;
  voice: SpeechSynthesisVoice | null;
  onLeave: () => void;
  onChanged: () => void;
}

const HEADLINE: Record<ComprehensionLevel, string> = {
  understood: "You found the key ideas",
  partly: "Nearly there",
  not_yet: "Not yet",
  off_topic: "Is that about the question?",
  cant_tell: "I'm not sure yet",
  too_short: "A bit more, please",
};

/**
 * Read and answer: a passage, a question, the child's own answer, and feedback in two parts, understanding and
 * writing, kept apart. The child can improve the answer; the first answer and each improved one are all kept.
 */
export function ReadingActivity({ learner, voice, onLeave, onChanged }: Props) {
  const [current, setCurrent] = useState(() => learner.nextReading());
  const [text, setText] = useState("");
  const [revising, setRevising] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<WrittenAnswerEvent[]>([]);

  if (!current)
    return (
      <main className="session">
        <section className="sheet">
          <h1>Nothing to read right now</h1>
          <button type="button" className="primary" onClick={onLeave}>
            Back to today
          </button>
        </section>
      </main>
    );
  const { task, passage } = current;
  const latest = answers.at(-1) ?? null;
  const writing = !latest || revising;

  const submit = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      const e = await learner.answerReading(task.id, text, revising);
      setAnswers((a) => [...a, e]);
      setRevising(false);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    setCurrent(learner.nextReading());
    setAnswers([]);
    setText("");
    setRevising(false);
    scrollTo(0, 0);
  };

  return (
    <main className="session reading" aria-labelledby="reading-title">
      <header className="session-bar">
        <button type="button" className="quiet back" onClick={onLeave}>
          Save and leave
        </button>
        <h1 id="reading-title">Read and answer</h1>
      </header>
      <section className="sheet" data-step={writing ? "write" : "feedback"} data-task={task.id}>
        <PassageView passage={passage} voice={voice} />
        <div className="question-row">
          <p className="prompt reading-question" id="reading-question">
            {task.question}
          </p>
          {voice && (
            <button type="button" className="listen" onClick={() => speak(task.question, voice)} aria-label="Hear the question">
              <span aria-hidden="true">🔊</span>
            </button>
          )}
        </div>
        {answers.map((a, i) => (
          <AnswerCard key={a.id} answer={a} label={i === 0 ? "Your answer" : `Improved answer${answers.length > 2 ? ` ${i}` : ""}`} />
        ))}
        {error && <p className="problem">{error}</p>}
        {writing ? (
          <form
            className="write"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label htmlFor="reading-answer">{revising ? "Improve your answer" : "Your answer, in your own words"}</label>
            <textarea id="reading-answer" rows={4} maxLength={READING_MAX_CHARS} value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="sentences" autoCorrect="off" spellCheck={false} enterKeyHint="done" placeholder="Write a sentence or two…" />
            <button type="submit" className="primary" disabled={busy || !text.trim()}>
              {revising ? "Check my new answer" : "Check my answer"}
            </button>
          </form>
        ) : (
          <div className="after">
            <button type="button" className="secondary" onClick={() => (setRevising(true), setText(latest?.text ?? ""))}>
              Improve my answer
            </button>
            <button type="button" className="primary" autoFocus onClick={next}>
              Next passage
            </button>
          </div>
        )}
        <p className="tag">Feedback is a helper's suggestion from simple rules, not a mark. A grown-up can see the answers.</p>
      </section>
    </main>
  );
}

function PassageView({ passage, voice }: { passage: Passage; voice: SpeechSynthesisVoice | null }) {
  return (
    <details className="passage" open>
      <summary>Read: {passage.title}</summary>
      {voice && (
        <button type="button" className="listen" onClick={() => speak(`${passage.title}. ${passage.text}`, voice)} aria-label="Read the passage aloud">
          <span aria-hidden="true">🔊 </span>Read it to me
        </button>
      )}
      {passage.text.split(/\n+/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </details>
  );
}

function AnswerCard({ answer, label }: { answer: WrittenAnswerEvent; label: string }) {
  const ev = answer.evaluation;
  const level = ev.comprehension.level;
  return (
    <article className="written-answer" data-revision={answer.revision} data-level={level}>
      <p className="kicker">{label}</p>
      <blockquote className="child-text">{answer.text}</blockquote>
      <div className={`feedback understanding ${level === "understood" ? "right" : level === "partly" ? "partly" : "wrong"}`} role="status" aria-live="polite" data-part="understanding">
        <p className="verdict">
          <span aria-hidden="true">💡 </span>Understanding: {HEADLINE[level]}
        </p>
        <p>{ev.feedback.understanding}</p>
      </div>
      <div className="feedback writing" data-part="writing" data-flags={ev.mechanics.spelling.length + ev.mechanics.grammar.length + ev.mechanics.punctuation.length}>
        <p className="verdict">
          <span aria-hidden="true">✏️ </span>Writing
        </p>
        <ul>
          {ev.feedback.writing.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

