/**
 * Mathematics home and the first JEE Main chapter, for a phone, top to bottom: one thing per screen, large cards,
 * no drop-downs. Same OpenPath account and learner as English; progress is saved to the account after every step.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api, type PupilSummary } from "../../english/logic/account";
import { chapter, type ChapterActivity, type ChapterAction, canComplete, LETTERS, percent, question, replay, stageOf, timedScore, timeLeft } from "../../../../packages/mathematics/src/chapter";
import "./chapter.css";

const api = new Api();
const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// NTA, Syllabus for JEE (Main) 2026, Paper 1 Mathematics: the 14 units
const UNITS = [
  "Sets, relations and functions",
  "Complex numbers and quadratic equations",
  "Matrices and determinants",
  "Permutations and combinations",
  "Binomial theorem",
  "Sequence and series",
  "Limit, continuity and differentiability",
  "Integral calculus",
  "Differential equations",
  "Coordinate geometry",
  "Three-dimensional geometry",
  "Vector algebra",
  "Statistics and probability",
  "Trigonometry",
];

type Screen = { name: "goal" } | { name: "chapters" } | { name: "chapter" };

class Repo {
  private queue: Promise<unknown> = Promise.resolve();
  private count = 0;
  readonly learner: string;
  constructor(learner: string) {
    this.learner = learner;
  }
  async load() {
    const r = await api.request<{ count: number; events: ChapterActivity[] }>("GET", `/pupils/${this.learner}/events/?subject=mathematics`);
    this.count = r.count;
    return r.events;
  }
  append(event: ChapterActivity) {
    const work = this.queue.then(async () => {
      const r = await api.request<{ count: number }>("POST", `/pupils/${this.learner}/events/`, { subject: "mathematics", seq: this.count, event });
      this.count = r.count;
      return this.load();
    });
    this.queue = work.catch(() => undefined);
    return work;
  }
}

function App() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pupils, setPupils] = useState<PupilSummary[]>([]);
  const [learner, setLearner] = useState<string>(new URLSearchParams(location.search).get("learner") ?? "");
  const [screen, setScreen] = useState<Screen>({ name: "goal" });
  const [events, setEvents] = useState<ChapterActivity[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());

  async function refreshAccount() {
    const s = await api.status();
    if (!s.available) throw new Error("The OpenPath account service is not reachable. Wait a minute (it may be waking up) and reload.");
    setSignedIn(s.account.authenticated);
    if (s.account.authenticated) {
      const rows = await api.pupils();
      setPupils(rows);
      setLearner((cur) => (rows.some((p) => p.id === cur) ? cur : rows.length === 1 ? rows[0].id : ""));
    }
  }
  useEffect(() => {
    refreshAccount().catch((e) => setError(String(e.message ?? e))).finally(() => setReady(true));
  }, []);
  const repo = useMemo(() => (learner ? new Repo(learner) : null), [learner]);
  useEffect(() => {
    if (!repo || !signedIn) return;
    repo.load().then(setEvents).catch((e) => setError(String(e.message ?? e)));
  }, [repo, signedIn]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => window.scrollTo({ top: 0, behavior: "smooth" }), [screen]);

  const { state } = useMemo(() => replay(learner || "none", events, new Date(now).toISOString()), [learner, events, Math.floor(now / 30000)]);
  const visit = useRef(uid());
  const opened = useRef(Date.now());

  async function send(action: ChapterAction, stage: string, extra: Partial<ChapterActivity> = {}) {
    if (!repo) return;
    setSaving(true);
    setError("");
    try {
      const elapsed = Math.min(Date.now() - opened.current, 3_600_000);
      opened.current = Date.now();
      const next = await repo.append({ kind: "math_activity", program: "jee-quadratics", id: uid(), at: new Date().toISOString(), learnerId: learner, sessionId: `math:${learner}:${visit.current}`, journey: "jee-main", lessonVersion: chapter.version, action, stage, elapsedMs: action === "answer" || action === "complete" ? elapsed : 0, ...extra });
      setEvents(next);
      return true;
    } catch (e) {
      setError(`Not saved: ${String((e as Error).message ?? e)}. Check your connection and try again.`);
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <Shell><p className="muted center">Opening OpenPath…</p></Shell>;
  if (!signedIn) return <Shell error={error}><SignIn onDone={() => refreshAccount().catch((e) => setError(String(e.message ?? e)))} onError={setError} /></Shell>;
  if (!learner)
    return (
      <Shell error={error}>
        <h1>Who is learning?</h1>
        {pupils.length ? (
          <div className="cards">
            {pupils.map((p) => (
              <button key={p.id} className="card big" onClick={() => setLearner(p.id)}>
                <span className="card-title">{p.display_name}</span>
                <span className="card-sub">Tap to continue</span>
              </button>
            ))}
          </div>
        ) : (
          <p>Add a learner in <a href="/">OpenPath English</a> first; the same learner is used here.</p>
        )}
      </Shell>
    );

  const name = pupils.find((p) => p.id === learner)?.display_name ?? "Learner";
  if (screen.name === "goal")
    return (
      <Shell error={error} top={<TopBar left={pupils.length > 1 ? <button className="link" onClick={() => setLearner("")}>Switch</button> : <a className="link" href="/">← Home</a>} title={name} />}>
        <h1>What are you preparing for?</h1>
        <div className="cards">
          <button className="card big accent" onClick={() => setScreen({ name: "chapters" })}>
            <span className="tag">Available</span>
            <span className="card-title">JEE Main</span>
            <span className="card-sub">Mathematics, chapter by chapter, with the official marking (+4 / −1)</span>
          </button>
          <a className="card big" href={`/mathematics.html?learner=${learner}&journey=school`}>
            <span className="card-title">School mathematics</span>
            <span className="card-sub">Equivalent fractions journey</span>
          </a>
          <div className="card big disabled" aria-disabled="true">
            <span className="tag soon">Coming soon</span>
            <span className="card-title">JEE Advanced</span>
          </div>
          <div className="card big disabled" aria-disabled="true">
            <span className="tag soon">Coming soon</span>
            <span className="card-title">GRE Quantitative</span>
          </div>
        </div>
      </Shell>
    );

  if (screen.name === "chapters")
    return (
      <Shell error={error} top={<TopBar left={<button className="link" onClick={() => setScreen({ name: "goal" })}>← Goals</button>} title="JEE Main · Mathematics" />}>
        <h1>Chapters</h1>
        <p className="muted">The 14 units of the official JEE Main 2026 mathematics syllabus. One chapter is ready to try.</p>
        <div className="cards">
          {UNITS.map((u, i) =>
            i === 1 ? (
              <button key={u} className="card accent" onClick={() => setScreen({ name: "chapter" })}>
                <span className="tag">{state.completed.length ? `${percent(state)}% done` : "Start here"}</span>
                <span className="card-title">Unit 2 · Quadratic Equations</span>
                <span className="card-sub">Nature of roots, sum and product of roots, forming equations, complex roots</span>
                <span className="bar"><span style={{ width: `${percent(state)}%` }} /></span>
              </button>
            ) : (
              <div key={u} className="card disabled" aria-disabled="true">
                <span className="tag soon">Coming soon</span>
                <span className="card-title">Unit {i + 1} · {u}</span>
              </div>
            ),
          )}
        </div>
      </Shell>
    );

  return <Chapter state={state} now={now} saving={saving} error={error} send={send} onBack={() => setScreen({ name: "chapters" })} />;
}

function Shell({ children, top, error }: { children: React.ReactNode; top?: React.ReactNode; error?: string }) {
  return (
    <>
      {top}
      <main className="page">
        {error && <p className="error" role="alert">{error}</p>}
        {children}
      </main>
    </>
  );
}

function TopBar({ left, title, right, progress }: { left: React.ReactNode; title: string; right?: React.ReactNode; progress?: number }) {
  return (
    <header className="topbar">
      <div className="topbar-row">
        <span>{left}</span>
        <strong>{title}</strong>
        <span>{right}</span>
      </div>
      {progress !== undefined && (
        <span className="bar thin" role="progressbar" aria-label="Chapter progress" aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </span>
      )}
    </header>
  );
}

function SignIn({ onDone, onError }: { onDone: () => void; onError: (e: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        api.login(email, password).then(onDone).catch((er) => onError(String(er.message ?? er))).finally(() => setBusy(false));
      }}
    >
      <h1>Sign in to OpenPath</h1>
      <p className="muted">Use the same account as OpenPath English.</p>
      <label className="field">Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="field">Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="muted small">No account yet? Create one in <a href="/">OpenPath English</a> (Let’s begin), then come back.</p>
    </form>
  );
}

type Send = (action: ChapterAction, stage: string, extra?: Partial<ChapterActivity>) => Promise<boolean | undefined>;
type State = ReturnType<typeof replay>["state"];

function Chapter({ state, now, saving, error, send, onBack }: { state: State; now: number; saving: boolean; error: string; send: Send; onBack: () => void }) {
  const [viewing, setViewing] = useState<string | null>(null);
  const stageId = viewing ?? state.current;
  const stage = stageOf(stageId);
  const index = chapter.stages.findIndex((s) => s.id === stageId);
  const allDone = state.completed.length === chapter.stages.length;
  useEffect(() => window.scrollTo({ top: 0, behavior: "smooth" }), [stageId]);
  const back = () => setViewing(null);
  const finish = async () => {
    if (state.completed.includes(stageId)) return back();
    // after the timed section, its results stay on screen until the learner moves on
    if (await send("complete", stageId)) setViewing(stageId === "timed" ? "timed" : null);
  };
  const steps = (
    <ol className="steps" aria-label="Steps in this chapter">
      {chapter.stages.map((s, i) => {
        const done = state.completed.includes(s.id);
        const here = s.id === stageId;
        return (
          <li key={s.id} className={done ? "done" : here ? "here" : ""}>
            <button className="step-dot" disabled={!done || here} onClick={() => setViewing(s.id)} aria-label={`${i + 1}. ${s.title}${done ? " (done)" : ""}`}>
              {done ? "✓" : i + 1}
            </button>
          </li>
        );
      })}
    </ol>
  );
  return (
    <>
      <TopBar left={<button className="link" onClick={onBack}>← Chapters</button>} title="Quadratic Equations" right={<span className="muted small">{percent(state)}%</span>} progress={percent(state)} />
      <main className="page">
        {error && <p className="error" role="alert">{error}</p>}
        {steps}
        <p className="eyebrow">Step {index + 1} of {chapter.stages.length}</p>
        <h1 key={stageId} className="enter">{stage.title}</h1>
        <div key={`${stageId}-body`} className="enter">
          {stage.kind === "cards" && <Recap onDone={finish} done={state.completed.includes(stageId)} saving={saving} />}
          {stage.kind === "steps" && <Worked onDone={finish} done={state.completed.includes(stageId)} saving={saving} />}
          {stage.kind === "questions" && stageId !== chapter.stages.at(-1)!.id && <Questions stageId={stageId} hints={!!stage.hints} state={state} send={send} onDone={finish} saving={saving} />}
          {stage.kind === "timed" && <Timed state={state} now={now} send={send} onDone={finish} onContinue={back} saving={saving} />}
          {stageId === chapter.stages.at(-1)!.id && (
            state.retentionDueAt && now >= Date.parse(state.retentionDueAt) ? (
              state.completed.includes(stageId) ? <Summary state={state} /> : <Questions stageId={stageId} hints={false} state={state} send={send} onDone={finish} saving={saving} />
            ) : (
              <Summary state={state} locked />
            )
          )}
        </div>
        {viewing && !allDone && <button className="secondary wide" onClick={() => setViewing(null)}>Back to where I was</button>}
      </main>
    </>
  );
}

function Recap({ onDone, done, saving }: { onDone: () => void; done: boolean; saving: boolean }) {
  const cards = chapter.stages[0].cards!;
  const [n, setN] = useState(0);
  const card = cards[n];
  return (
    <div className="stack">
      <div key={n} className="panel enter">
        <p className="eyebrow">{n + 1} / {cards.length}</p>
        <h2>{card.title}</h2>
        <p className="lead">{card.text}</p>
      </div>
      <div className="dots" aria-hidden="true">{cards.map((_, i) => <span key={i} className={i === n ? "on" : ""} />)}</div>
      <div className="actions">
        {n > 0 && <button className="secondary" onClick={() => setN(n - 1)}>Back</button>}
        {n < cards.length - 1 ? <button className="primary" onClick={() => setN(n + 1)}>Next</button> : <button className="primary" disabled={saving} onClick={onDone}>{done ? "Continue" : "I’ve got it, continue"}</button>}
      </div>
    </div>
  );
}

function Worked({ onDone, done, saving }: { onDone: () => void; done: boolean; saving: boolean }) {
  const s = chapter.stages[1];
  const [shown, setShown] = useState(done ? s.steps!.length : 1);
  return (
    <div className="stack">
      <div className="panel problem"><p className="eyebrow">Problem</p><p className="lead">{s.problem}</p></div>
      <ol className="worked">
        {s.steps!.slice(0, shown).map((t, i) => <li key={i} className="enter">{t}</li>)}
      </ol>
      <div className="actions">
        {shown < s.steps!.length ? <button className="primary" onClick={() => setShown(shown + 1)}>Show next step</button> : <button className="primary" disabled={saving} onClick={onDone}>Continue to practice</button>}
      </div>
    </div>
  );
}

function Answer({ q, value, setValue, disabled }: { q: ReturnType<typeof question>; value: string; setValue: (v: string) => void; disabled: boolean }) {
  if (q.type === "choice")
    return (
      <div className="options" role="radiogroup" aria-label="Choose one answer">
        {q.options!.map((o, i) => (
          <button key={i} role="radio" aria-checked={value === LETTERS[i]} className={`option ${value === LETTERS[i] ? "picked" : ""}`} disabled={disabled} onClick={() => setValue(LETTERS[i])}>
            <span className="letter">{LETTERS[i]}</span>
            <span>{o}</span>
          </button>
        ))}
      </div>
    );
  return (
    <label className="field">
      Your answer (a whole number)
      <input inputMode="numeric" pattern="-?[0-9]*" value={value} disabled={disabled} onChange={(e) => setValue(e.target.value.replace(/[^0-9−-]/g, ""))} placeholder="e.g. 12" />
    </label>
  );
}

function Questions({ stageId, hints, state, send, onDone, saving }: { stageId: string; hints: boolean; state: State; send: Send; onDone: () => void; saving: boolean }) {
  const ids = stageOf(stageId).questions;
  const firstOpen = ids.findIndex((id) => !state.answers[id]);
  const [i, setI] = useState(firstOpen < 0 ? ids.length - 1 : firstOpen);
  const [value, setValue] = useState("");
  const [hint, setHint] = useState(false);
  const q = question(ids[i]);
  const answered = state.answers[q.id];
  useEffect(() => {
    setValue("");
    setHint(false);
  }, [i]);
  const last = i === ids.length - 1;
  return (
    <div className="stack">
      <p className="eyebrow">Question {i + 1} of {ids.length} · {"●".repeat(q.difficulty)}{"○".repeat(3 - q.difficulty)} {q.type === "integer" ? "· Numerical value" : "· Single correct"}</p>
      <div key={q.id} className="panel enter"><p className="lead">{q.prompt}</p></div>
      <Answer q={q} value={answered ? answered.response : value} setValue={setValue} disabled={!!answered || saving} />
      {hints && !answered && (hint ? <p className="hint enter">💡 {q.hint}</p> : <button className="link" onClick={() => (setHint(true), send("hint", stageId, { questionId: q.id }))}>Show a hint</button>)}
      {answered && (
        <div className={`feedback enter ${answered.correct ? "good" : "bad"}`} role="status">
          <strong>{answered.correct ? "Correct!" : `Not quite: the answer is ${q.type === "choice" ? `${q.answer}, ${q.options![LETTERS.indexOf(q.answer as "A")]}` : q.answer}.`}</strong>
          <p>{q.solution}</p>
        </div>
      )}
      <div className="actions sticky">
        {!answered ? (
          <button className="primary" disabled={!value || saving} onClick={() => send("answer", stageId, { questionId: q.id, response: value })}>
            {saving ? "Saving…" : "Check answer"}
          </button>
        ) : last ? (
          <button className="primary" disabled={saving || !canComplete(state, stageId)} onClick={onDone}>{state.completed.includes(stageId) ? "Continue" : "Finish this step"}</button>
        ) : (
          <button className="primary" onClick={() => setI(i + 1)}>Next question</button>
        )}
      </div>
    </div>
  );
}

function Timed({ state, now, send, onDone, onContinue, saving }: { state: State; now: number; send: Send; onDone: () => void; onContinue: () => void; saving: boolean }) {
  const stage = stageOf("timed") as ReturnType<typeof stageOf> & { timeLimitSec: number };
  const ids = stage.questions;
  const left = timeLeft(state, now);
  const done = state.completed.includes("timed");
  const [i, setI] = useState(Math.max(0, ids.findIndex((id) => !state.answers[id])));
  const [value, setValue] = useState("");
  const ending = useRef(false);
  useEffect(() => setValue(""), [i]);
  useEffect(() => {
    if (left === 0 && !done && !ending.current) {
      ending.current = true;
      onDone();
    }
  }, [left, done]);
  if (done) {
    const s = timedScore(state);
    return (
      <div className="stack">
        <div className="panel score enter">
          <p className="eyebrow">Practice score</p>
          <p className="big-number">{s.score} <span>/ {s.maximum}</span></p>
          <p className="muted small">Official JEE Main 2026 marking: +4 correct, −1 wrong, 0 unanswered. A practice score on 5 questions, not a prediction.</p>
        </div>
        {s.rows.map((r, k) => {
          const q = question(r.id);
          return (
            <details key={r.id} className={`review ${r.correct ? "good" : r.answered ? "bad" : ""}`}>
              <summary>Q{k + 1} · {r.correct ? "Correct" : r.answered ? "Wrong" : "Not answered"} · {r.mark > 0 ? `+${r.mark}` : r.mark}</summary>
              <p>{q.prompt}</p>
              <p><strong>Answer: {q.type === "choice" ? `${q.answer}. ${q.options![LETTERS.indexOf(q.answer as "A")]}` : q.answer}</strong></p>
              <p>{q.solution}</p>
            </details>
          );
        })}
        <div className="actions"><button className="primary" onClick={onContinue}>Continue</button></div>
      </div>
    );
  }
  if (left === null)
    return (
      <div className="stack">
        <div className="panel">
          <p className="lead">5 questions · {Math.round(stage.timeLimitSec / 60)} minutes</p>
          <ul className="plain">
            <li>Four single-correct questions and one numerical-value question (enter an integer).</li>
            <li>Marking as in JEE Main 2026: +4 correct, −1 wrong, 0 if you skip.</li>
            <li>No hints. Answers and solutions appear at the end.</li>
          </ul>
        </div>
        <div className="actions"><button className="primary" disabled={saving} onClick={() => send("open", "timed")}>Start the timer</button></div>
      </div>
    );
  const q = question(ids[i]);
  const answered = state.answers[q.id];
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="stack">
      <div className={`timer ${left < 60 ? "low" : ""}`} role="timer" aria-live="off">⏱ {mm}:{ss}</div>
      <div className="qnav">
        {ids.map((id, k) => <button key={id} className={`qdot ${state.answers[id] ? "answered" : ""} ${k === i ? "here" : ""}`} onClick={() => setI(k)}>{k + 1}</button>)}
      </div>
      <div key={q.id} className="panel enter"><p className="lead">{q.prompt}</p></div>
      <Answer q={q} value={answered ? answered.response : value} setValue={setValue} disabled={!!answered || saving} />
      {answered && <p className="muted small">Saved. You can move to another question.</p>}
      <div className="actions sticky">
        {!answered && <button className="secondary" onClick={() => setI((i + 1) % ids.length)}>Skip</button>}
        {!answered ? (
          <button className="primary" disabled={!value || saving} onClick={async () => (await send("answer", "timed", { questionId: q.id, response: value })) && i < ids.length - 1 && setI(i + 1)}>Save answer</button>
        ) : (
          <button className="primary" disabled={saving} onClick={onDone}>Submit section</button>
        )}
      </div>
    </div>
  );
}

function Summary({ state, locked }: { state: State; locked?: boolean }) {
  const s = timedScore(state);
  const due = state.retentionDueAt ? new Date(state.retentionDueAt) : null;
  const shownWithoutHelp = chapter.stages.filter((x) => x.id === "check").flatMap((x) => x.questions).filter((id) => state.answers[id]?.correct).length;
  return (
    <div className="stack">
      {locked && (
        <div className="panel accent-soft">
          <p className="lead">🔒 Come back {due ? `on ${due.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}` : "after the timed section"}</p>
          <p className="muted">A short revision check a week later shows whether it stayed with you. That is when it counts most.</p>
        </div>
      )}
      <div className="panel">
        <p className="eyebrow">Where you stand</p>
        <ul className="plain">
          <li><strong>Chapter steps done:</strong> {state.completed.length} of {chapter.stages.length} ({percent(state)}%)</li>
          <li><strong>Check without hints:</strong> {shownWithoutHelp} of {stageOf("check").questions.length} right</li>
          <li><strong>Timed practice score:</strong> {state.completed.includes("timed") ? `${s.score} / ${s.maximum}` : "not taken yet"}</li>
          <li><strong>Revision check:</strong> {state.completed.includes("revision") ? "done" : due ? `from ${due.toLocaleDateString(undefined, { day: "numeric", month: "long" })}` : "after the timed section"}</li>
        </ul>
        <p className="muted small">These questions are new practice questions written for this preview and checked by computation; an educator has not reviewed them yet, so OpenPath does not mark the chapter as mastered.</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
