/**
 * icse-tamil@1: the Tamil home. Pick a class (1-10), pick a topic, read the short teaching card, practise. Missed
 * questions come back in the same round. Progress stays on this device (openpath.tamil.icse.v1).
 */
import { useEffect, useState } from "react";
import { CLASSES, type CourseQuestion, type CourseTopic, type Progress, classDone, isRight, record, round, topicDone, topicsFor } from "../../../packages/tamil/src/icse";
import { FeedbackBox } from "../year/Feedback";
import { TamilApp } from "./App";

const KEY = "openpath.tamil.icse.v1";
type Saved = { cls: number | null; progress: Progress };
const load = (): Saved => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { cls: null, progress: {}, ...JSON.parse(raw) };
  } catch {
    /* unreadable: start fresh in memory, never overwrite until the learner answers */
  }
  return { cls: null, progress: {} };
};

type Screen = { name: "classes" } | { name: "topics" } | { name: "teach"; topic: CourseTopic } | { name: "practice"; topic: CourseTopic } | { name: "foundation" };

export function TamilHome() {
  const [saved, setSaved] = useState<Saved>(load);
  const [screen, setScreen] = useState<Screen>(() =>
    new URLSearchParams(location.search).has("basics") ? { name: "foundation" } : saved.cls ? { name: "topics" } : { name: "classes" },
  );
  // ?basics keeps the letter-basics screen across a reload (its own "open again" button reloads the page)
  useEffect(() => {
    const want = screen.name === "foundation" ? "?basics" : "";
    if (location.search !== want) history.replaceState(null, "", location.pathname + want);
  }, [screen]);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* storage refused: progress lasts this visit only */
    }
  }, [saved]);
  useEffect(() => scrollTo(0, 0), [screen]);

  if (screen.name === "foundation")
    return (
      <>
        <nav className="course-nav">
          <button type="button" className="link" onClick={() => setScreen({ name: "classes" })}>← வகுப்புகள் (Classes)</button>
        </nav>
        <TamilApp />
      </>
    );

  if (screen.name === "classes")
    return (
      <main className="course">
        <header>
          <a className="link" href="/">← OpenPath</a>
          <span className="badge">ICSE</span>
        </header>
        <h1>தமிழ் — வகுப்பைத் தேர்ந்தெடு</h1>
        <p className="small">Choose your class. Tamil as a second language, Classes 1 to 10.</p>
        <div className="class-grid">
          {CLASSES.map((c) => {
            const done = classDone(c, saved.progress);
            return (
              <button key={c} type="button" className="class-tile" onClick={() => (setSaved({ ...saved, cls: c }), setScreen({ name: "topics" }))}>
                <span className="class-num">{c}</span>
                <span className="small">வகுப்பு {c}</span>
                <span className="bar" aria-hidden="true"><span style={{ width: `${Math.round(done * 100)}%` }} /></span>
              </button>
            );
          })}
        </div>
        <button type="button" className="secondary wide" onClick={() => setScreen({ name: "foundation" })}>
          எழுத்துப் பயிற்சி — Letter basics
        </button>
        <FeedbackBox where="tamil/classes" />
      </main>
    );

  const cls = saved.cls ?? 1;
  if (screen.name === "topics")
    return (
      <main className="course">
        <header>
          <button type="button" className="link" onClick={() => setScreen({ name: "classes" })}>← வகுப்புகள்</button>
          <span className="badge">வகுப்பு {cls}</span>
        </header>
        <h1>வகுப்பு {cls} — பாடங்கள்</h1>
        <ol className="topic-list">
          {topicsFor(cls).map((t) => {
            const done = topicDone(t, saved.progress);
            return (
              <li key={t.id}>
                <button type="button" className="topic" onClick={() => setScreen({ name: "teach", topic: t })}>
                  <span className="topic-title">{t.title}</span>
                  <span className="small">{t.titleEn} · {t.questions.length} questions</span>
                  <span className="bar" aria-hidden="true"><span style={{ width: `${Math.round(done * 100)}%` }} /></span>
                </button>
              </li>
            );
          })}
        </ol>
        <FeedbackBox where={`tamil/class-${cls}`} />
      </main>
    );

  const topic = screen.topic;
  if (screen.name === "teach")
    return (
      <main className="course">
        <header>
          <button type="button" className="link" onClick={() => setScreen({ name: "topics" })}>← வகுப்பு {cls}</button>
          <span className="badge">{topic.titleEn}</span>
        </header>
        <h1>{topic.title}</h1>
        <section className="teach-card">
          <p className="teach-ta">{topic.teach.ta}</p>
          <p className="teach-en">{topic.teach.en}</p>
          <p className="example">{topic.teach.examples}</p>
        </section>
        <button type="button" className="primary wide" onClick={() => setScreen({ name: "practice", topic })}>
          பயிற்சி தொடங்கு — Start practice
        </button>
        <FeedbackBox where={`tamil/${topic.id}/teach`} />
      </main>
    );

  return (
    <Practice
      key={topic.id}
      topic={topic}
      progress={saved.progress}
      onAnswer={(q, right) => setSaved((s) => ({ ...s, progress: record(s.progress, q, right) }))}
      onBack={() => setScreen({ name: "topics" })}
      onTeach={() => setScreen({ name: "teach", topic })}
    />
  );
}

function Practice({ topic, progress, onAnswer, onBack, onTeach }: { topic: CourseTopic; progress: Progress; onAnswer: (q: CourseQuestion, right: boolean) => void; onBack: () => void; onTeach: () => void }) {
  const [queue, setQueue] = useState(() => round(topic, progress));
  const [retried, setRetried] = useState<Set<string>>(() => new Set());
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const q = queue[0];

  if (!q)
    return (
      <main className="course">
        <h1>நன்று! 🎉</h1>
        <p className="lede">
          {score.right} / {score.total} சரி. Well done — {score.right} of {score.total} right.
        </p>
        <button type="button" className="primary wide" onClick={() => (setQueue(round(topic, progress)), setRetried(new Set()), setScore({ right: 0, total: 0 }))}>
          இன்னும் பயிற்சி — Practise more
        </button>
        <button type="button" className="secondary wide" onClick={onBack}>← பாடங்கள் (Topics)</button>
      </main>
    );

  const right = chosen !== null && isRight(q, chosen);
  const choose = (o: string) => {
    if (chosen !== null) return;
    setChosen(o);
    const ok = isRight(q, o);
    onAnswer(q, ok);
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
  };
  const next = () => {
    const [, ...rest] = queue;
    // a missed question comes back once, at the end of this round
    if (!right && !retried.has(q.id)) {
      setRetried(new Set([...retried, q.id]));
      setQueue([...rest, q]);
    } else setQueue(rest);
    setChosen(null);
  };

  return (
    <main className="course">
      <header>
        <button type="button" className="link" onClick={onBack}>← {topic.title}</button>
        <span className="small">{queue.length} left</span>
      </header>
      <h1 className="prompt">{q.prompt}</h1>
      <p className="small prompt-en">{q.promptEn}</p>
      <div className="choices">
        {q.options.map((o) => (
          <button
            key={o}
            type="button"
            className={chosen === null ? "" : o === q.answer ? "is-right" : o === chosen ? "is-wrong" : "is-dim"}
            disabled={chosen !== null}
            onClick={() => choose(o)}
          >
            {o}
          </button>
        ))}
      </div>
      {chosen !== null && (
        <div className={`course-feedback ${right ? "ok" : "no"}`} role="status" aria-live="polite">
          <p>{right ? "சரி! Correct." : `சரியான விடை: ${q.answer}`}</p>
          {q.why && <p className="small">{q.why}</p>}
          {!right && (
            <button type="button" className="link" onClick={onTeach}>
              பாடத்தை மீண்டும் பார் — See the lesson again
            </button>
          )}
          <button type="button" className="primary wide" onClick={next}>அடுத்தது — Next →</button>
        </div>
      )}
      <FeedbackBox where={`tamil/${q.id}`} />
    </main>
  );
}
