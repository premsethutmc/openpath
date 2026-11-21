/**
 * icse-tamil@2: the Tamil home, built the way English and maths are. Pick a class (1-10); see its topics, writing tasks and
 * how the CISCE syllabus is covered; read a teaching card; practise (missed questions come back in the round); listen with
 * the device's Tamil voice; write, with free word checks and AI feedback (the same three pieces a week as English).
 * Signed in → progress is kept in the learner's account (subject "tamil"); otherwise on this device.
 */
import { useEffect, useRef, useState } from "react";
import {
  BOARDS,
  type Board,
  CLASSES,
  type CourseQuestion,
  type CourseTopic,
  type Progress,
  type WritingTask,
  classDone,
  isRight,
  record,
  round,
  syllabusFor,
  tamilWords,
  topicDone,
  topicsFor,
  writingFor,
} from "../../../packages/tamil/src/icse";
import { FeedbackBox } from "../year/Feedback";
import { TamilRecord, type Pupil, call, merge, newId, pupils as loadPupils } from "./account";
import { TamilApp } from "./App";
import { say, tamilVoice } from "./speech";

const KEY = "openpath.tamil.icse.v1";
const LEARNER = "openpath.tamil.learner";
type Saved = { cls: number | null; board?: Board; progress: Progress };
const load = (): Saved => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { cls: null, progress: {}, ...JSON.parse(raw) };
  } catch {
    /* unreadable: start fresh in memory */
  }
  return { cls: null, progress: {} };
};

type Screen =
  | { name: "classes" }
  | { name: "topics" }
  | { name: "teach"; topic: CourseTopic }
  | { name: "practice"; topic: CourseTopic }
  | { name: "writing"; task: WritingTask }
  | { name: "syllabus" }
  | { name: "foundation" };

export function TamilHome() {
  const [saved, setSaved] = useState<Saved>(load);
  const [screen, setScreen] = useState<Screen>(() =>
    new URLSearchParams(location.search).has("basics") ? { name: "foundation" } : saved.cls ? { name: "topics" } : { name: "classes" },
  );
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [kids, setKids] = useState<Pupil[] | null>(null);
  const [learner, setLearner] = useState<Pupil | null>(null);
  const rec = useRef<TamilRecord | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* storage refused: progress lasts this visit only */
    }
  }, [saved]);
  // block body: newer browsers return a Promise from scrollTo, which React would call as a cleanup
  useEffect(() => {
    scrollTo(0, 0);
  }, [screen]);
  // ?basics keeps the letter-basics screen across a reload (its own "open again" button reloads the page)
  useEffect(() => {
    const want = screen.name === "foundation" ? "?basics" : "";
    if (location.search !== want) history.replaceState(null, "", location.pathname + want);
  }, [screen]);

  const choose = (p: Pupil | null) => {
    setLearner(p);
    rec.current = p ? new TamilRecord(p.id) : null;
    if (!p || !rec.current) return;
    try {
      localStorage.setItem(LEARNER, p.id);
    } catch {
      /* not remembered */
    }
    rec.current
      .load()
      .then((server) => setSaved((s) => ({ ...s, progress: merge(server, s.progress) })))
      .catch(() => undefined);
  };

  useEffect(() => {
    void tamilVoice().then(setVoice);
    void loadPupils().then((list) => {
      setKids(list);
      if (!list?.length) return;
      let want: string | null = null;
      try {
        want = localStorage.getItem(LEARNER);
      } catch {
        /* none remembered */
      }
      choose(list.find((p) => p.id === want) ?? (list.length === 1 ? list[0] : null));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answered = (q: CourseQuestion, right: boolean) => {
    setSaved((s) => ({ ...s, progress: record(s.progress, q, right) }));
    void rec.current?.append({ kind: "tamil.answer", id: newId(), at: new Date().toISOString(), q: q.id, right });
  };

  const who =
    kids === null ? (
      <p className="small">This device keeps your Tamil progress. Sign in on the OpenPath home to keep it in your account.</p>
    ) : !learner && kids.length > 1 ? (
      <div className="who" role="group" aria-label="Who is learning?">
        <p className="small">யார் படிக்கிறார்கள்? Who is learning?</p>
        {kids.map((k) => (
          <button key={k.id} type="button" className="secondary" onClick={() => choose(k)}>
            {k.display_name}
          </button>
        ))}
      </div>
    ) : learner ? (
      <p className="small">
        {learner.display_name}'s Tamil progress is saved in your account.{" "}
        {kids.length > 1 && (
          <button type="button" className="link" onClick={() => choose(null)}>
            Change
          </button>
        )}
      </p>
    ) : null;

  if (screen.name === "foundation")
    return (
      <>
        <nav className="course-nav">
          <button type="button" className="link" onClick={() => setScreen({ name: "classes" })}>
            ← வகுப்புகள் (Classes)
          </button>
        </nav>
        <TamilApp learnerId={learner?.id} />
      </>
    );

  const board: Board = saved.board ?? "icse";
  if (screen.name === "classes")
    return (
      <main className="course">
        <header>
          <a className="link" href="/">
            ← OpenPath
          </a>
          <span className="badge">{board === "tn" ? "TN" : "ICSE"}</span>
        </header>
        <h1>தமிழ் — வகுப்பைத் தேர்ந்தெடு</h1>
        <div className="boards" role="radiogroup" aria-label="Board">
          {BOARDS.map((b) => (
            <button key={b.id} type="button" role="radio" aria-checked={board === b.id} className={board === b.id ? "board on" : "board"} onClick={() => setSaved({ ...saved, board: b.id })}>
              <strong>{b.name}</strong>
              <span className="small">{b.note}</span>
            </button>
          ))}
        </div>
        <p className="small">Choose your class, 1 to 10.</p>
        {who}
        <div className="class-grid">
          {CLASSES.map((c) => {
            const done = classDone(c, saved.progress, board);
            return (
              <button key={c} type="button" className="class-tile" onClick={() => (setSaved({ ...saved, cls: c }), setScreen({ name: "topics" }))}>
                <span className="class-num">{c}</span>
                <span className="small">வகுப்பு {c}</span>
                <span className="bar" aria-hidden="true">
                  <span style={{ width: `${Math.round(done * 100)}%` }} />
                </span>
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
  if (screen.name === "topics") {
    const topics = topicsFor(cls, board).filter((t) => !t.listen || voice);
    return (
      <main className="course">
        <header>
          <button type="button" className="link" onClick={() => setScreen({ name: "classes" })}>
            ← வகுப்புகள்
          </button>
          <span className="badge">{board === "tn" ? "TN" : "ICSE"} · வகுப்பு {cls}</span>
        </header>
        <h1>வகுப்பு {cls} — பாடங்கள்</h1>
        {who}
        <ol className="topic-list">
          {topics.map((t) => {
            const done = topicDone(t, saved.progress);
            return (
              <li key={t.id}>
                <button type="button" className="topic" onClick={() => setScreen({ name: "teach", topic: t })}>
                  <span className="topic-title">
                    {t.listen ? "🔊 " : ""}
                    {t.title}
                  </span>
                  <span className="small">
                    {t.titleEn} · {t.questions.length} questions
                  </span>
                  <span className="bar" aria-hidden="true">
                    <span style={{ width: `${Math.round(done * 100)}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
          {writingFor(cls, board).map((w) => (
            <li key={w.id}>
              <button type="button" className="topic writing-topic" onClick={() => setScreen({ name: "writing", task: w })}>
                <span className="topic-title">✍️ {w.title}</span>
                <span className="small">
                  Writing · {w.titleEn} · {w.write.min}–{w.write.max} words
                </span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="secondary wide" onClick={() => setScreen({ name: "syllabus" })}>
          பாடத்திட்டம் — What the {board === "tn" ? "Samacheer Kalvi" : "CISCE"} syllabus asks, and what we cover
        </button>
        <FeedbackBox where={`tamil/class-${cls}`} />
      </main>
    );
  }

  if (screen.name === "syllabus") {
    const s = syllabusFor(cls, board);
    const BADGE = { covered: "✓ Covered", partly: "◐ Partly", guided: "👥 With a grown-up", "not-yet": "○ Not here" } as const;
    return (
      <main className="course">
        <header>
          <button type="button" className="link" onClick={() => setScreen({ name: "topics" })}>
            ← வகுப்பு {cls}
          </button>
          <span className="badge">{board === "tn" ? "Samacheer" : "CISCE"}</span>
        </header>
        <h1>வகுப்பு {cls} — பாடத்திட்டம்</h1>
        <p className="small">{s.source.note}</p>
        {s.strands.map((st) => (
          <section key={st.id} className="strand">
            <h2>{st.name}</h2>
            <ul className="outcomes">
              {st.outcomes.map((o) => (
                <li key={o.id} className={`outcome ${o.coverage}`}>
                  <span className="cov">{BADGE[o.coverage]}</span> {o.text}
                  {o.note && <span className="small"> {o.note}</span>}
                  {o.where.map((w) => {
                    const t = topicsFor(cls, board).find((x) => x.id === w);
                    const label = t ? t.title : w.startsWith("writing:") ? "எழுது — Write" : null;
                    if (!label || (t?.listen && !voice)) return null;
                    return (
                      <button key={w} type="button" className="link go" onClick={() => setScreen(t ? { name: "teach", topic: t } : { name: "topics" })}>
                        {label} →
                      </button>
                    );
                  })}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <FeedbackBox where={`tamil/class-${cls}/syllabus`} />
      </main>
    );
  }

  if (screen.name === "writing") {
    const task = screen.task;
    return (
      <Writing
        key={task.id}
        task={task}
        learner={learner}
        onBack={() => setScreen({ name: "topics" })}
        onDone={(words) => void rec.current?.append({ kind: "tamil.writing", id: newId(), at: new Date().toISOString(), task: task.id, words })}
      />
    );
  }

  const topic = screen.topic;
  if (screen.name === "teach")
    return (
      <main className="course">
        <header>
          <button type="button" className="link" onClick={() => setScreen({ name: "topics" })}>
            ← வகுப்பு {cls}
          </button>
          <span className="badge">{topic.titleEn}</span>
        </header>
        <h1>{topic.title}</h1>
        <section className="teach-card">
          <p className="teach-ta">{topic.teach.ta}</p>
          <p className="teach-en">{topic.teach.en}</p>
          {!topic.passage && <p className="example">{topic.teach.examples}</p>}
        </section>
        {topic.passage && <p className="passage">{topic.passage}</p>}
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
      voice={voice}
      onAnswer={answered}
      onBack={() => setScreen({ name: "topics" })}
      onTeach={() => setScreen({ name: "teach", topic })}
    />
  );
}

function Practice({
  topic,
  progress,
  voice,
  onAnswer,
  onBack,
  onTeach,
}: {
  topic: CourseTopic;
  progress: Progress;
  voice: SpeechSynthesisVoice | null;
  onAnswer: (q: CourseQuestion, right: boolean) => void;
  onBack: () => void;
  onTeach: () => void;
}) {
  const [queue, setQueue] = useState(() => round(topic, progress));
  const [retried, setRetried] = useState<Set<string>>(() => new Set());
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const q = queue[0];
  useEffect(() => {
    if (q?.say) say(q.say, voice);
  }, [q, voice]);

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
        <button type="button" className="secondary wide" onClick={onBack}>
          ← பாடங்கள் (Topics)
        </button>
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
        <button type="button" className="link" onClick={onBack}>
          ← {topic.title}
        </button>
        <span className="small">{queue.length} left</span>
      </header>
      {topic.passage && <p className="passage">{topic.passage}</p>}
      <h1 className="prompt">{q.prompt}</h1>
      <p className="small prompt-en">{q.promptEn}</p>
      {q.say && (
        <button type="button" className="primary play" onClick={() => say(q.say!, voice)}>
          ▶ மீண்டும் கேள் — Hear it
        </button>
      )}
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
          <button type="button" className="primary wide" onClick={next}>
            அடுத்தது — Next →
          </button>
        </div>
      )}
      <FeedbackBox where={`tamil/${q.id}`} />
    </main>
  );
}

type Feedback = { points: { met: "yes" | "partly" | "no"; note: string }[]; strength: string; next: string; look: string[]; left: number };
type AiState = { available: boolean; consent: boolean; left: number; limit: number };

function Writing({ task, learner, onBack, onDone }: { task: WritingTask; learner: Pupil | null; onBack: () => void; onDone: (words: number) => void }) {
  const key = `openpath.tamil.draft.${task.id}`;
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  });
  const [ai, setAi] = useState<AiState | null>(null);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const words = tamilWords(text);
  const enough = words >= task.write.min;
  const tooLong = words > task.write.max;
  useEffect(() => {
    try {
      localStorage.setItem(key, text);
    } catch {
      /* draft not kept */
    }
  }, [key, text]);
  useEffect(() => {
    if (learner)
      call<AiState>("GET", `/pupils/${learner.id}/writing-feedback/`)
        .then(setAi)
        .catch(() => setAi(null));
  }, [learner]);

  const ask = async () => {
    if (!learner) return;
    setBusy(true);
    setProblem("");
    try {
      const r = await call<Feedback>("POST", `/pupils/${learner.id}/writing-feedback/`, { task: task.id, text, checked: [] });
      setFb(r);
      setAi((a) => (a ? { ...a, left: r.left } : a));
      onDone(words);
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const agree = async () => {
    if (!learner) return;
    try {
      await call("POST", `/pupils/${learner.id}/writing-feedback/consent/`, { granted: true });
      setAi((a) => (a ? { ...a, consent: true } : a));
    } catch (e) {
      setProblem((e as Error).message);
    }
  };
  const MET = { yes: "✓", partly: "◐", no: "✗" } as const;

  return (
    <main className="course">
      <header>
        <button type="button" className="link" onClick={onBack}>
          ← பாடங்கள்
        </button>
        <span className="badge">✍️ {task.titleEn}</span>
      </header>
      <h1>{task.title}</h1>
      <section className="teach-card">
        <p className="teach-ta">{task.task}</p>
        <p className="teach-en">{task.taskEn}</p>
        <p className="small">ஒரு பெரியவர் இவற்றைப் பார்ப்பார் — A grown-up looks for:</p>
        <ul className="looks">
          {task.look.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
      <textarea className="write-box" lang="ta" aria-label="Your writing" rows={8} value={text} onChange={(e) => (setText(e.target.value), setFb(null))} placeholder="இங்கே தமிழில் எழுது…" />
      <p className={`small ${enough && !tooLong ? "ok-text" : ""}`} role="status">
        {words} சொற்கள் · {task.write.min}–{task.write.max} words asked{tooLong ? " — a little shorter, please" : enough ? " ✓" : ""}
      </p>
      {learner && ai?.available && !ai.consent && (
        <div className="course-feedback">
          <p className="small">
            Grown-up: allow short AI feedback on {learner.display_name}'s writing? Up to {ai.limit} pieces a week, shared with English. The name is never sent.
          </p>
          <button type="button" className="secondary wide" onClick={agree}>
            Yes, allow AI feedback
          </button>
        </div>
      )}
      {learner && ai?.available && ai.consent && (
        <button type="button" className="primary wide" disabled={!enough || tooLong || busy || ai.left <= 0} onClick={ask}>
          {busy ? "…" : `கருத்து கேள் — Get feedback (${ai.left} left this week)`}
        </button>
      )}
      {!learner && <p className="small">Sign in on the OpenPath home to get AI feedback on this writing. A grown-up can check it with the points above.</p>}
      {problem && (
        <p className="small" role="alert">
          {problem}
        </p>
      )}
      {fb && (
        <section className="course-feedback ok" aria-live="polite">
          {fb.points.map((p, i) => (
            <p key={i}>
              <strong>
                {MET[p.met]} {fb.look[i]}
              </strong>{" "}
              — {p.note}
            </p>
          ))}
          <p>👍 {fb.strength}</p>
          <p>➡️ {fb.next}</p>
        </section>
      )}
      <FeedbackBox where={`tamil/${task.id}`} />
    </main>
  );
}
