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
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

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
                <span className="tag">{state.completed.length ? `${percent(state)}% done` : "Start the class"}</span>
                <span className="card-title">Unit 2 · Quadratic Equations</span>
                <span className="card-sub">8 lessons from the basics, a worked example, practice, a timed section and revision</span>
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
  // finer than whole steps: the answered questions of the step in progress count too (the class takes a while)
  const open = stageOf(state.current).questions;
  const fine = allDone ? 100 : Math.round((100 * (state.completed.length + (open.length ? open.filter((q) => state.answers[q]).length / (open.length + 1) : 0))) / chapter.stages.length);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stageId]);
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
      <TopBar left={<button className="link" onClick={onBack}>← Back</button>} title="Quadratic Equations" right={<span className="muted small">{fine}%</span>} progress={fine} />
      <main className="page">
        {error && <p className="error" role="alert">{error}</p>}
        {steps}
        <p className="eyebrow">Step {index + 1} of {chapter.stages.length}</p>
        <h1 key={stageId} className="enter">{stage.title}</h1>
        <div key={`${stageId}-body`} className="enter">
          {stage.kind === "lessons" && <Lessons state={state} send={send} onDone={finish} done={state.completed.includes(stageId)} saving={saving} />}
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

type Lesson = { id: string; title: string; check: string; screens: { title: string; text?: string[]; math?: string[]; mathAt?: number; tip?: string; graph?: { a: number; b: number; c: number; interactive?: boolean; yMax?: number } }[] };

function Lessons({ state, send, onDone, done, saving }: { state: State; send: Send; onDone: () => void; done: boolean; saving: boolean }) {
  const stage = chapter.stages[0] as unknown as { lessons: Lesson[]; formulaSheet: { title: string; text: string }[] };
  const lessons = stage.lessons;
  const firstOpen = lessons.findIndex((l) => !state.answers[l.check]);
  const [open, setOpen] = useState<number | null>(done ? null : firstOpen < 0 ? lessons.length : firstOpen);
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [open, screen]);
  const go = (i: number) => {
    setOpen(i);
    setScreen(0);
  };
  const learned = lessons.filter((l) => state.answers[l.check]).length;

  if (open === null)
    return (
      <div className="stack">
        <p className="muted">{learned} of {lessons.length} lessons done. Tap a lesson to open it.</p>
        <div className="cards">
          {lessons.map((l, i) => {
            const ok = !!state.answers[l.check];
            const reachable = ok || i === (firstOpen < 0 ? lessons.length : firstOpen);
            return (
              <button key={l.id} className={`card ${reachable && !ok ? "accent" : ""} ${reachable ? "" : "disabled"}`} disabled={!reachable} onClick={() => go(i)}>
                <span className={`tag ${ok ? "" : reachable ? "" : "soon"}`}>{ok ? "✓ Done" : reachable ? "Up next" : "Locked"}</span>
                <span className="card-title">Lesson {i + 1} · {l.title}</span>
                <span className="card-sub">{l.screens.length} short screens and a quick check</span>
              </button>
            );
          })}
          <button className="card" disabled={learned < lessons.length} onClick={() => go(lessons.length)}>
            <span className={`tag ${learned < lessons.length ? "soon" : ""}`}>{learned < lessons.length ? "After the lessons" : "Revise"}</span>
            <span className="card-title">Formula sheet</span>
          </button>
        </div>
        {done && <button className="primary" onClick={onDone}>Continue</button>}
      </div>
    );

  if (open >= lessons.length)
    return (
      <div className="stack">
        <p className="eyebrow">Formula sheet · keep this in mind</p>
        {stage.formulaSheet.map((c) => (
          <div key={c.title} className="panel enter">
            <h2>{c.title}</h2>
            <p className="lead">{c.text}</p>
          </div>
        ))}
        <div className="actions sticky">
          <button className="secondary" onClick={() => setOpen(null)}>All lessons</button>
          <button className="primary" disabled={saving || learned < lessons.length} onClick={onDone}>{done ? "Continue" : "Finish the class"}</button>
        </div>
      </div>
    );

  const lesson = lessons[open];
  const atCheck = screen >= lesson.screens.length;
  const sc = lesson.screens[Math.min(screen, lesson.screens.length - 1)];
  return (
    <div className="stack">
      <div className="lesson-head">
        <button className="link small" onClick={() => setOpen(null)}>All lessons</button>
        <p className="eyebrow">Lesson {open + 1} of {lessons.length}</p>
        <h2>{lesson.title}</h2>
        <div className="dots" aria-hidden="true">
          {lesson.screens.map((_, i) => <span key={i} className={i === screen ? "on" : ""} />)}
          <span className={atCheck ? "on" : ""} />
        </div>
      </div>
      {!atCheck ? (
        <>
          <div key={`${lesson.id}-${screen}`} className="panel enter lesson">
            <h3>{sc.title}</h3>
            {(sc.text ?? []).slice(0, sc.mathAt ?? sc.text?.length).map((t, i) => <p key={i}>{t}</p>)}
            {sc.math && <Formula lines={sc.math} />}
            {(sc.text ?? []).slice(sc.mathAt ?? sc.text?.length).map((t, i) => <p key={`b${i}`}>{t}</p>)}
            {sc.graph && <Parabola {...sc.graph} />}
            {sc.tip && <p className="hint">💡 {sc.tip}</p>}
          </div>
          <div className="actions sticky">
            {screen > 0 && <button className="secondary" onClick={() => setScreen(screen - 1)}>Back</button>}
            <button className="primary" onClick={() => setScreen(screen + 1)}>{screen === lesson.screens.length - 1 ? "Try it yourself" : "Next"}</button>
          </div>
        </>
      ) : (
        <LessonCheck key={lesson.id} qid={lesson.check} state={state} send={send} saving={saving} onBack={() => setScreen(lesson.screens.length - 1)} onNext={() => go(open + 1)} last={open === lessons.length - 1} />
      )}
    </div>
  );
}

function Formula({ lines }: { lines: string[] }) {
  return <div className="formula">{lines.map((l, i) => <div key={i}>{l}</div>)}</div>;
}

function useFeedbackInView(answered: unknown) {
  useEffect(() => {
    if (answered) document.querySelector(".feedback")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [!!answered]);
}

function LessonCheck({ qid, state, send, saving, onBack, onNext, last }: { qid: string; state: State; send: Send; saving: boolean; onBack: () => void; onNext: () => void; last: boolean }) {
  const q = question(qid);
  const answered = state.answers[qid];
  useFeedbackInView(answered);
  const [value, setValue] = useState("");
  const [hint, setHint] = useState(false);
  return (
    <div className="stack">
      <p className="eyebrow">Try it yourself · quick check</p>
      <div className="panel enter"><p className="lead">{q.prompt}</p></div>
      <Answer q={q} value={answered ? answered.response : value} setValue={setValue} disabled={!!answered || saving} />
      {!answered && (hint ? <p className="hint enter">💡 {q.hint}</p> : <button className="link" onClick={() => (setHint(true), send("hint", "class", { questionId: qid }))}>Show a hint</button>)}
      {answered && (
        <div className={`feedback enter ${answered.correct ? "good" : "bad"}`} role="status">
          <strong>{answered.correct ? "Correct!" : `Not quite: the answer is ${q.type === "choice" ? `${q.answer}, ${q.options![LETTERS.indexOf(q.answer as "A")]}` : q.answer}.`}</strong>
          <p>{q.solution}</p>
        </div>
      )}
      <div className="actions sticky">
        <button className="secondary" onClick={onBack}>Back</button>
        {!answered ? (
          <button className="primary" disabled={!value || saving} onClick={() => send("answer", "class", { questionId: qid, response: value })}>{saving ? "Saving…" : "Check answer"}</button>
        ) : (
          <button className="primary" onClick={onNext}>{last ? "Formula sheet" : "Next lesson"}</button>
        )}
      </div>
    </div>
  );
}

/** y = ax² + bx + c on −6 ≤ x ≤ 6: where it meets the x-axis, and the sign of D. Sliders when interactive. */
function Parabola(props: { a: number; b: number; c: number; interactive?: boolean; yMax?: number }) {
  const [a, setA] = useState(props.a);
  const [b, setB] = useState(props.b);
  const [c, setC] = useState(props.c);
  const W = 320, H = 220, X = 6, Y = props.yMax ?? 10;
  const sx = (x: number) => ((x + X) / (2 * X)) * W;
  const sy = (y: number) => H / 2 - (y / Y) * (H / 2);
  const pts: string[] = [];
  for (let i = 0; i <= 240; i++) {
    const x = -X + (2 * X * i) / 240;
    const y = a * x * x + b * x + c;
    pts.push(`${sx(x).toFixed(1)},${sy(Math.max(-3 * Y, Math.min(3 * Y, y))).toFixed(1)}`);
  }
  const D = b * b - 4 * a * c;
  const roots = D > 0 ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)] : D === 0 ? [-b / (2 * a)] : [];
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2)).replace("-", "−");
  const sign = (n: number, first = false) => (n < 0 ? ` − ${fmt(-n)}` : first ? fmt(n) : ` + ${fmt(n)}`);
  const eq = `y = ${a === 1 ? "" : a === -1 ? "−" : fmt(a)}x²${b ? sign(b) + "x" : ""}${c ? sign(c) : ""}`;
  const nature = D > 0 ? "D > 0: two different real roots" : D === 0 ? "D = 0: two equal roots (the curve just touches the axis)" : "D < 0: no real roots (the curve never meets the axis)";
  const slider = (label: string, v: number, set: (n: number) => void, min: number, max: number) => (
    <label className="slider">
      <span>{label} = {fmt(v)}</span>
      <input type="range" min={min} max={max} step={1} value={v} onChange={(e) => { const n = Number(e.target.value); set(label === "a" && n === 0 ? (v > 0 ? -1 : 1) : n); }} />
    </label>
  );
  return (
    <figure className="graph">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Graph of ${eq}. ${nature}.`}>
        <line x1={0} y1={sy(0)} x2={W} y2={sy(0)} className="axis" />
        <line x1={sx(0)} y1={0} x2={sx(0)} y2={H} className="axis" />
        {[-4, -2, 2, 4].map((t) => <text key={t} x={sx(t)} y={sy(0) + 14} className="tick">{String(t).replace("-", "−")}</text>)}
        <polyline points={pts.join(" ")} className="curve" />
        {roots.filter((r) => Math.abs(r) <= X).map((r, i) => <circle key={i} cx={sx(r)} cy={sy(0)} r={5} className="root" />)}
      </svg>
      <figcaption>
        <strong>{eq}</strong>
        <span>D = {fmt(D)}. {nature}{roots.length ? `: x = ${roots.map(fmt).join(" and ")}` : ""}.</span>
      </figcaption>
      {props.interactive && <div className="sliders">{slider("a", a, setA, -3, 3)}{slider("b", b, setB, -8, 8)}{slider("c", c, setC, -9, 9)}</div>}
    </figure>
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
  useFeedbackInView(answered);
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
  useEffect(() => {
    setValue("");
  }, [i]);
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
