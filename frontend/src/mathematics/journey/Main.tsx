import React, { useEffect, useState, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Api, type PupilSummary } from "../../english/logic/account";
import { MathematicsRepo } from "./service";
import {
  lesson,
  journeys,
  replay,
  percent,
  canComplete,
  type MathActivity,
  type Journey,
  type Action,
} from "../../../../packages/mathematics/src/fractions-program";
import {
  examTracks,
  competencies,
} from "../../../../packages/mathematics/src/curriculum";
import { programFor } from "../../../../packages/mathematics/src/program";
import "../style.css";
const api = new Api();
// Receipt/visit identifiers are not authentication tokens; the account service owns identity.
const newReceiptId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const readJourney = (): Journey => {
  const value = new URLSearchParams(location.search).get("journey");
  return journeys.includes(value as Journey) ? (value as Journey) : "school";
};
function App() {
  const [authenticated, setAuthenticated] = useState(false),
    [pupils, setPupils] = useState<PupilSummary[]>([]),
    [pupil, setPupil] = useState(
      new URLSearchParams(location.search).get("learner") ?? "",
    ),
    [events, setEvents] = useState<MathActivity[]>([]),
    [journey, setJourney] = useState<Journey>(readJourney),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [expanded, setExpanded] = useState(true),
    [tab, setTab] = useState(readJourney() === "school" ? "school" : "exams"),
    [tick, setTick] = useState(Date.now()),
    [saving, setSaving] = useState(0);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const repo = useMemo(
    () => (pupil ? new MathematicsRepo(api, pupil) : null),
    [pupil],
  );
  async function account() {
    const result = await api.status();
    if (!result.available)
      throw new Error(
        "The account service is unavailable. Start the OpenPath API; this experience requires authenticated persistence.",
      );
    setAuthenticated(result.account.authenticated);
    if (result.account.authenticated) {
      const rows = await api.pupils();
      setPupils(rows);
      setPupil((current) =>
        rows.some((p) => p.id === current) ? current : (rows[0]?.id ?? ""),
      );
    }
  }
  useEffect(() => {
    account()
      .catch((e) => setError(String(e)))
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (!repo || !authenticated) return;
    let active = true;
    setBusy(true);
    repo
      .load()
      .then((e) => {
        if (active) setEvents(e);
      })
      .catch((e) => {
        if (active) setError(String(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [repo, authenticated]);
  useEffect(() => {
    const p = new URLSearchParams({ learner: pupil, journey });
    history.replaceState(null, "", "?" + p.toString());
  }, [pupil, journey]);
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const state = useMemo(
    () => replay(pupil || "not-selected", events, new Date(tick).toISOString()),
    [pupil, events],
  );
  const program = state.programs[journey],
    stage = lesson.stages.find((s) => s.id === program.current)!,
    profile = state.profile;
  const visit = useRef(newReceiptId());
  const started = useRef(Date.now());
  useEffect(() => {
    started.current = Date.now();
  }, [pupil, journey, program.current]);
  async function send(
    action: Action,
    extra: Partial<MathActivity> = {},
    quiet = false,
  ) {
    if (!repo) return;
    setSaving((n) => n + 1);
    if (!quiet) setBusy(true);
    setError("");
    try {
      const event: MathActivity = {
        kind: "math_activity",
        id: newReceiptId(),
        at: new Date().toISOString(),
        learnerId: pupil,
        sessionId: `math:${pupil}:${visit.current}`,
        journey,
        lessonVersion: "2.0.0",
        action,
        stage: program.current,
        elapsedMs:
          action === "complete" || action === "answer"
            ? Math.min(Date.now() - started.current, 3600000)
            : 0,
        ...extra,
      };
      const e = await repo.append(event);
      setEvents(e);
      if (event.elapsedMs) started.current = Date.now();
    } catch (e) {
      setError(
        `${String(e)} Reload to recover the saved record; unsaved work is not marked complete.`,
      );
    } finally {
      setSaving((n) => n - 1);
      if (!quiet) setBusy(false);
    }
  }
  const practice = Object.values(program.answers),
    correct = practice.filter((a) => a.correct),
    revisit = practice.filter((a) => !a.correct);
  return (
    <main>
      <header>
        <a href="/">OpenPath home</a>
        <h1>Mathematics</h1>
        <p className="banner">
          Provisional learning content · Completion is not mastery
        </p>
      </header>
      <div role="alert">{error}</div>
      {error && authenticated && (
        <button onClick={() => location.reload()}>Reload saved record</button>
      )}
      {!loaded ? (
        <p role="status">Connecting to OpenPath…</p>
      ) : !authenticated ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            api
              .login(email, password)
              .then(account)
              .catch((e) => setError(String(e)))
              .finally(() => setBusy(false));
          }}
        >
          <h2>Use your OpenPath account</h2>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button disabled={busy}>Sign in</button>
          <p>
            Set up an account or add a learner through{" "}
            <a href="/">OpenPath home</a>. No separate mathematics identity is
            created.
          </p>
        </form>
      ) : (
        <>
          <p><a href={`/writing.html?learner=${pupil}`}>Write and check mathematical working</a></p>
          <label>
            OpenPath learner
            <select
              value={pupil}
              disabled={busy || saving > 0}
              onChange={(e) => {
                setEvents([]);
                setPupil(e.target.value);
              }}
            >
              {pupils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </label>
          {!pupils.length ? (
            <p>Add a learner through OpenPath home first.</p>
          ) : (
            <>
              <nav aria-label="Subject journeys">
                <button
                  aria-pressed={tab === "school"}
                  onClick={() => {
                    setTab("school");
                    setJourney("school");
                  }}
                >
                  School mathematics
                </button>
                <button
                  aria-pressed={tab === "exams"}
                  onClick={() => {
                    setTab("exams");
                    setJourney("gre-quant");
                  }}
                >
                  Competitive Exams
                </button>
              </nav>
              {tab === "exams" && (
                <section className="exam">
                  <label>
                    Exam track
                    <select
                      value={journey}
                      onChange={(e) => setJourney(e.target.value as Journey)}
                    >
                      {examTracks
                        .filter((t) => t.id !== "cuet")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <p>
                    Foundation review (available) → topic practice (planned) →
                    validated exam journey (planned).
                  </p>
                  <p>
                    Official scoring, readiness claims and timed simulations are
                    disabled. This fractions program is a foundation review, not
                    an official exam syllabus or authentic exam-difficulty
                    simulation.
                  </p>
                  <button disabled>Timed simulation unavailable</button>
                </section>
              )}
              <p role="status">
                {error
                  ? "Some changes are not saved"
                  : saving
                    ? "Saving to account…"
                    : "Saved to OpenPath account"}
              </p>
              <section aria-label="Understanding">
                <details>
                  <summary>
                    Understanding:{" "}
                    {profile.status === "unavailable"
                      ? "not established"
                      : profile.status}{" "}
                    · inspect practice evidence
                  </summary>
                  <h2>Understanding, separately reported</h2>
                  <p>
                    School and exams share the same fraction competency and
                    practice history.
                  </p>
                  <p>
                    Verified understanding:{" "}
                    <strong>
                      {profile.status === "unavailable"
                        ? "Not established"
                        : profile.status}
                    </strong>
                    . Provisional practice cannot establish mastery.
                  </p>
                  <p>
                    Practice strengths:{" "}
                    {correct.length
                      ? `${correct.length} latest answers correct (${correct.filter((a) => a.assisted).length} supported or previously exposed).`
                      : "No practice answers yet."}
                  </p>
                  <p>
                    Practice to revisit:{" "}
                    {revisit.length
                      ? `${revisit.length} latest answers need another look.`
                      : "No recorded practice difficulties."}{" "}
                    These are practice observations, not verified strengths or
                    diagnosed weaknesses.
                  </p>
                </details>
              </section>
              <section className="row">
                <button
                  className="row-toggle"
                  aria-expanded={expanded}
                  onClick={() => setExpanded(!expanded)}
                >
                  <span>
                    <strong>Equivalent fractions</strong>
                    <small>Proposed Grades 4–6 · Fixed activity plan</small>
                  </span>
                  <span>{percent(program)}% activities</span>
                </button>
                <div
                  className="bar"
                  role="progressbar"
                  aria-label="Fractions activity completion"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent(program)}
                >
                  <i style={{ width: `${percent(program)}%` }} />
                </div>
                {expanded && (
                  <div className="detail">
                    <p>
                      {program.completed.length}/7 stages completed ·{" "}
                      {Math.round(program.timeMs / 1000)} seconds recorded ·{" "}
                      {program.attempts} practice attempts
                    </p>
                    <p>
                      Retention:{" "}
                      {program.completed.includes("retention")
                        ? "Activity completed; understanding still unverified"
                        : program.retentionDueAt
                          ? `Required after ${new Date(program.retentionDueAt).toLocaleString()}`
                          : "Will be scheduled after transfer practice"}
                    </p>
                    {program.completed.includes("transfer") &&
                      !program.completed.includes("retention") && (
                        <p className="banner">
                          Core program finished. Your six completed stages stay
                          saved. Return for delayed retention; this is not a
                          mastery award.
                        </p>
                      )}
                    <details>
                      <summary>
                        Fixed program plan · {7 - program.completed.length}{" "}
                        stages remaining
                      </summary>
                      <ol className="stages">
                        {lesson.stages.map((s, i) => (
                          <li key={s.id}>
                            <button
                              disabled={
                                busy ||
                                !lesson.stages
                                  .slice(0, i)
                                  .every((p) =>
                                    program.completed.includes(p.id),
                                  )
                              }
                              aria-current={
                                s.id === program.current ? "step" : undefined
                              }
                              onClick={() => send("open", { stage: s.id })}
                            >
                              {s.title}
                              <small>
                                {program.completed.includes(s.id)
                                  ? "Completed activity"
                                  : s.id === program.current
                                    ? "Current activity"
                                    : "Remaining activity"}
                              </small>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </details>
                    <h2>{stage.title}</h2>
                    {stage.paragraphs.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                    {["concept", "worked"].includes(stage.id) && (
                      <FractionVisual />
                    )}
                    {stage.id === "worked" && (
                      <section aria-label="Adding one is not scaling">
                        <h3>Contrast: 1/2 is not 2/3</h3>
                        {[
                          [1, 2],
                          [2, 3],
                        ].map(([selected, parts]) => (
                          <div key={parts}>
                            <p>
                              {selected}/{parts} of the same whole
                            </p>
                            <svg
                              viewBox="0 0 280 45"
                              role="img"
                              aria-label={`${selected} of ${parts} equal parts`}
                              width="100%"
                            >
                              {Array.from({ length: parts }, (_, i) => (
                                <rect
                                  key={i}
                                  x={(i * 280) / parts}
                                  y="2"
                                  width={280 / parts}
                                  height="36"
                                  fill={i < selected ? "#6755df" : "#fff"}
                                  stroke="#203047"
                                />
                              ))}
                            </svg>
                          </div>
                        ))}
                      </section>
                    )}
                    {stage.id === "retention" &&
                    (!program.retentionDueAt ||
                      tick < Date.parse(program.retentionDueAt)) ? (
                      <p>
                        These delayed questions unlock after the scheduled time.
                        All earlier progress is preserved.
                      </p>
                    ) : (
                      stage.questions.map((id) => {
                        const q = lesson.questions.find((q) => q.id === id)!;
                        return (
                          <Question
                            key={`${pupil}:${journey}:${id}`}
                            q={q}
                            answer={program.answers[id]}
                            draft={program.drafts[id] ?? ""}
                            disabled={busy}
                            onAction={(action, extra, quiet) =>
                              send(action, { questionId: id, ...extra }, quiet)
                            }
                          />
                        );
                      })
                    )}
                    <button
                      className="primary"
                      disabled={busy || !canComplete(program, stage.id, tick)}
                      onClick={() => send("complete")}
                    >
                      {busy
                        ? "Saving…"
                        : program.completed.includes(stage.id)
                          ? "Save reviewed activity"
                          : "Finish activity and save place"}
                    </button>
                    <p className="small">
                      This saves activity completion, not proficiency. Time is
                      self-reported activity duration, not an attention measure.
                    </p>
                  </div>
                )}
              </section>
              <section className="row">
                <div className="detail">
                  <h2>Other mathematics competencies</h2>
                  <p>
                    {competencies.length - 1} additional competency records
                    remain in the foundation. Their lessons are not complete;
                    they are not marked learned.
                  </p>
                  <details>
                    <summary>Inspect other competency programs</summary>
                    {competencies
                      .filter((c) => c.id !== lesson.competencyId)
                      .map((c) => (
                        <details className="row" key={c.id}>
                          <summary>{c.name} · Not implemented</summary>
                          <div
                            className="bar"
                            role="progressbar"
                            aria-label={`${c.name} scaffold activity completion`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={0}
                          >
                            <i style={{ width: "0%" }} />
                          </div>
                          <p>
                            Versioned scaffold only. No completed or current
                            learning activities, learning time or verified
                            understanding are recorded here.
                          </p>
                          <ol>
                            {programFor(c).stages.map((s) => (
                              <li key={s.id}>{s.title} — planned</li>
                            ))}
                          </ol>
                        </details>
                      ))}
                  </details>
                  <p>
                    School: {percent(state.programs.school)}% activities · GRE
                    foundation: {percent(state.programs["gre-quant"])}%
                    activities. Both use the same competency history.
                  </p>
                </div>
              </section>
            </>
          )}
          <button
            disabled={busy || saving > 0}
            onClick={() =>
              api
                .logout()
                .then(() => {
                  setEvents([]);
                  setAuthenticated(false);
                })
                .catch((e) => setError(String(e)))
            }
          >
            Sign out
          </button>
        </>
      )}
      <footer>
        <p>
          Original AI-assisted provisional program. Mathematical checks passed;
          educator review and real-learner validation remain outstanding.
        </p>
      </footer>
    </main>
  );
}
function FractionVisual() {
  const [parts, setParts] = useState(4);
  return (
    <section aria-label="Interactive equal fractions">
      <h3>Keep the same whole</h3>
      <p>Shade one half. Split the same bar into more equal parts.</p>
      <svg
        viewBox="0 0 280 45"
        role="img"
        aria-label={`${parts / 2} shaded out of ${parts} equal parts; the same amount as one half`}
        width="100%"
      >
        {Array.from({ length: parts }, (_, i) => (
          <rect
            key={i}
            x={(i * 280) / parts}
            y="2"
            width={280 / parts}
            height="36"
            fill={i < parts / 2 ? "#6755df" : "#fff"}
            stroke="#203047"
          />
        ))}
      </svg>
      <p>
        {parts / 2}/{parts} = 1/2. The whole and shaded amount stay the same.
      </p>
      <div className="actions">
        {[2, 4, 6, 8].map((n) => (
          <button
            key={n}
            aria-pressed={n === parts}
            onClick={() => setParts(n)}
          >
            Split into {n}
          </button>
        ))}
      </div>
    </section>
  );
}
function Question({
  q,
  answer,
  draft,
  disabled,
  onAction,
}: {
  q: (typeof lesson.questions)[number];
  answer?: { correct: boolean; response: string };
  draft: string;
  disabled: boolean;
  onAction: (
    action: Action,
    extra?: Partial<MathActivity>,
    quiet?: boolean,
  ) => Promise<void>;
}) {
  const [text, setText] = useState(draft),
    [hint, setHint] = useState(false),
    [solution, setSolution] = useState(false);
  return (
    <form
      data-question={q.id}
      onSubmit={(e) => {
        e.preventDefault();
        onAction("answer", { response: text });
      }}
    >
      <h3 id={`question-${q.id}`}>{q.prompt}</h3>
      <label>
        Your answer
        <input
          autoComplete="off"
          aria-describedby={`question-${q.id}`}
          maxLength={80}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            onAction("draft", { response: e.target.value }, true);
          }}
        />
      </label>
      <div className="actions">
        <button disabled={disabled || !text.trim()}>Check answer</button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction("hint").then(() => setHint(true))}
        >
          Hint
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction("solution").then(() => setSolution(true))}
        >
          Show solution
        </button>
      </div>
      {hint && <p>{q.hint}</p>}
      {solution && <p>{q.solution}</p>}
      {answer && (
        <p role="status">
          {answer.correct
            ? "Correct for this practice question."
            : q.responseFormat === "simplest-fraction"
              ? "Check both the amount and the simplest fraction form."
              : "Not quite. Use the hint or worked method and try again."}{" "}
          Provisional practice does not verify mastery.
        </p>
      )}
    </form>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
