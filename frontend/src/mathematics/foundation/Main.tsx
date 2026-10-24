import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api, type PupilSummary } from "../../english/logic/account";
import {
  programs,
  replayFoundation,
  key,
  canFinish,
  evaluate,
  instructionalSupport,
  type FoundationActivity,
  type Receipt,
  type Program,
  type Progress,
} from "../../../../packages/mathematics/src/foundation/programs";
import "../style.css";
import "./style.css";
const api = new Api(),
  uid = () =>
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
class Repo {
  count = 0;
  queue: Promise<unknown> = Promise.resolve();
  readonly learnerId: string;
  constructor(learnerId: string) {
    this.learnerId = learnerId;
  }
  async load() {
    const r = await api.request<{ count: number; events: Receipt[] }>(
      "GET",
      `/pupils/${this.learnerId}/events/?subject=mathematics`,
    );
    this.count = r.count;
    return r.events;
  }
  append(event: FoundationActivity) {
    const work = this.queue.then(async () => {
      const r = await api.request<{ count: number }>(
        "POST",
        `/pupils/${this.learnerId}/events/`,
        { subject: "mathematics", seq: this.count, event },
      );
      this.count = r.count;
      return this.load();
    });
    this.queue = work.catch(() => undefined);
    return work;
  }
}
function Speak({ text }: { text: string }) {
  if (!("speechSynthesis" in window))
    return (
      <p>
        Device speech is unavailable. A grown-up can read this instruction
        aloud.
      </p>
    );
  return (
    <button
      type="button"
      onClick={() => {
        if ("speechSynthesis" in window) {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "en-IN";
          speechSynthesis.speak(u);
        }
      }}
    >
      Listen on this device
    </button>
  );
}
function Model({
  p,
  s,
  save,
  busy,
}: {
  p: Program;
  s: Progress;
  save: (questionId: string, response: string) => Promise<void>;
  busy: boolean;
}) {
  const initial = () => {
    try {
      return JSON.parse(s.drafts.model ?? "[3,2,2,1,4,2]") as number[];
    } catch {
      return [3, 2, 2, 1, 4, 2];
    }
  };
  const [v, setV] = useState(initial),
    [counted, setCounted] = useState<string[]>([]);
  async function update(next: number[]) {
    setCounted([]);
    setV(next);
    await save("model", JSON.stringify(next));
    await save("exploration", "done");
  }
  async function change(i: number, value: number) {
    const next = [...v];
    next[i] = value;
    await update(next);
  }
  return (
    <section className="manipulative" aria-label="Interactive model">
      {p.model === "objects" ? (
        <>
          <div className="two-groups">
            {[0, 1].map((i) => (
              <div key={i}>
                <p>
                  Group {i + 1}: {v[i]}
                </p>
                <div aria-label={`${v[i]} apples`}>
                  {Array.from({ length: v[i] }, (_, a) => {
                    const id = `${i}:${a}`;
                    return (
                      <button
                        className={counted.includes(id) ? "counted" : ""}
                        aria-label={`Count apple ${a + 1} in group ${i + 1}`}
                        key={id}
                        disabled={busy}
                        onClick={() => {
                          if (!counted.includes(id)) {
                            const next = [...counted, id];
                            setCounted(next);
                            if ("speechSynthesis" in window) {
                              const u = new SpeechSynthesisUtterance(
                                String(next.length),
                              );
                              u.lang = "en-IN";
                              speechSynthesis.cancel();
                              speechSynthesis.speak(u);
                            }
                          }
                        }}
                      >
                        🍎
                      </button>
                    );
                  })}
                  {!v[i] && "0"}
                </div>
                <button
                  disabled={busy || v[i] === 0}
                  onClick={() => change(i, v[i] - 1)}
                  aria-label={`Remove from group ${i + 1}`}
                >
                  −
                </button>
                <button
                  disabled={busy || v[i] === 8}
                  onClick={() => change(i, v[i] + 1)}
                  aria-label={`Add to group ${i + 1}`}
                >
                  +
                </button>
              </div>
            ))}
          </div>
          <p>Tap each apple once. Counted: {counted.length}</p>
          <strong>
            {v[0]} + {v[1]} = {v[0] + v[1]}
          </strong>
          <div
            className="numberline"
            aria-label={`Start at ${v[0]}, jump ${v[1]} times to ${v[0] + v[1]}`}
          >
            {Array.from({ length: 17 }, (_, i) => (
              <span
                className={
                  i === v[0] + v[1]
                    ? "landing"
                    : i >= v[0] && i < v[0] + v[1]
                      ? "jump"
                      : ""
                }
                key={i}
              >
                {i}
              </span>
            ))}
          </div>
          <p>
            Start at {v[0]}. Land on{" "}
            {Array.from({ length: v[1] }, (_, i) => v[0] + i + 1).join(", ") ||
              v[0]}
            . Count each jump.
          </p>
        </>
      ) : p.model === "groups" ? (
        <>
          <label>
            Rows
            <input
              aria-label="Rows"
              type="range"
              min="1"
              max="6"
              value={v[0]}
              disabled={busy}
              onChange={(e) => change(0, Number(e.target.value))}
            />
          </label>
          <label>
            In each row
            <input
              aria-label="In each row"
              type="range"
              min="1"
              max="6"
              value={v[1]}
              disabled={busy}
              onChange={(e) => change(1, Number(e.target.value))}
            />
          </label>
          <div aria-label={`${v[0]} equal groups of ${v[1]}`}>
            {Array.from({ length: v[0] }, (_, i) => (
              <div className="array-row" key={i}>
                {"● ".repeat(v[1])}
              </div>
            ))}
          </div>
          <p>
            {Array.from({ length: v[0] }, () => v[1]).join(" + ")} ={" "}
            {v[0] * v[1]}
          </p>
          <strong>
            {v[0]} × {v[1]} = {v[0] * v[1]}
          </strong>
          <button
            disabled={busy}
            onClick={() => {
              const next = [...v];
              next[0] = v[1];
              next[1] = v[0];
              update(next);
            }}
          >
            Turn the array
          </button>
        </>
      ) : (
        <>
          {[0, 1].map((bar) => {
            const d = bar === 0 ? 2 : 4,
              n = bar === 0 ? 3 : 5;
            return (
              <div key={bar}>
                <label>
                  Bar {bar + 1} equal parts
                  <select
                    disabled={busy}
                    value={v[d]}
                    onChange={(e) => {
                      const next = [...v];
                      next[d] = Number(e.target.value);
                      next[n] = Math.min(next[n], next[d]);
                      update(next);
                    }}
                  >
                    {[2, 3, 4, 6, 8, 12].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <div
                  className="fraction-strip"
                  style={{ gridTemplateColumns: `repeat(${v[d]},1fr)` }}
                >
                  {Array.from({ length: v[d] }, (_, i) => (
                    <button
                      key={i}
                      disabled={busy}
                      aria-label={`Bar ${bar + 1} shade ${i + 1} parts`}
                      aria-pressed={i < v[n]}
                      className={i < v[n] ? "shaded" : ""}
                      onClick={() => change(n, i + 1 === v[n] ? 0 : i + 1)}
                    />
                  ))}
                </div>
                <label>
                  Shade parts on bar {bar + 1}
                  <input
                    type="range"
                    min="0"
                    max={v[d]}
                    value={v[n]}
                    disabled={busy}
                    aria-label={`Bar ${bar + 1} shaded parts`}
                    onChange={(e) => change(n, Number(e.target.value))}
                  />
                </label>
                <strong>
                  {v[n]}/{v[d]}
                </strong>
              </div>
            );
          })}
          <p>
            {v[3] * v[4] === v[5] * v[2]
              ? "The shaded lengths are equal. Different pieces, same amount."
              : "The shaded lengths differ. Compare equal-sized wholes."}
          </p>
        </>
      )}
      <p>
        {s.drafts.exploration === "done"
          ? "You changed the model. Try the example in the instructions, then explain it aloud."
          : "Change the model before continuing."}
      </p>
    </section>
  );
}
function Question({
  p,
  id,
  s,
  send,
  busy,
}: {
  p: Program;
  id: string;
  s: Progress;
  send: (
    action: FoundationActivity["action"],
    extra?: Partial<FoundationActivity>,
  ) => Promise<void>;
  busy: boolean;
}) {
  const q = p.questions.find((q) => q.id === id)!;
  const [raw, setRaw] = useState(s.drafts[id] ?? ""),
    [invalid, setInvalid] = useState("");
  const a = s.answers[id];
  return (
    <form
      data-question={id}
      onSubmit={async (e) => {
        e.preventDefault();
        const result = evaluate(p, q, raw);
        if (result.message.startsWith("Enter a number")) {
          setInvalid(result.message);
          return;
        }
        setInvalid("");
        await send("answer", { questionId: id, response: raw });
      }}
    >
      <p id={`prompt-${id}`}>{q.prompt}</p>
      <label>
        Your answer
        <input
          aria-describedby={`prompt-${id}`}
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={(e) => {
            if (
              e.relatedTarget instanceof HTMLElement &&
              e.currentTarget.form?.contains(e.relatedTarget)
            )
              return;
            if (raw !== s.drafts[id])
              void send("draft", { questionId: id, response: raw });
          }}
          disabled={busy}
        />
      </label>
      <div className="actions">
        <button disabled={busy || !raw.trim()}>Check</button>
        <button
          disabled={busy}
          type="button"
          onClick={async () => {
            if (raw !== s.drafts[id])
              await send("draft", { questionId: id, response: raw });
            await send("hint", { questionId: id });
          }}
        >
          Show a hint
        </button>
      </div>
      {s.hints.includes(id) && <p>{q.hint}</p>}
      {invalid && <p role="alert">{invalid}</p>}
      {a && <p role="status">{evaluate(p, q, a.response).message}</p>}
    </form>
  );
}
function App() {
  const params = new URLSearchParams(location.search);
  const [pupil, setPupil] = useState(params.get("learner") ?? ""),
    [selected, setSelected] = useState(params.get("program") ?? programs[0].id),
    [journey, setJourney] = useState<FoundationActivity["journey"]>(
      ["school", "gre-quant", "jee-main", "jee-advanced"].includes(
        params.get("journey") ?? "",
      )
        ? (params.get("journey") as FoundationActivity["journey"])
        : "school",
    );
  const [pupils, setPupils] = useState<PupilSummary[]>([]),
    [auth, setAuth] = useState(false),
    [events, setEvents] = useState<Receipt[]>([]),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [clock, setClock] = useState(Date.now());
  const failed = useRef(false),
    visit = useRef(uid()),
    start = useRef(Date.now()),
    repo = useMemo(() => new Repo(pupil), [pupil]);
  async function account() {
    const result = await api.status();
    if (!result.available)
      throw Error(
        "Start the OpenPath account service. No offline identity is created here.",
      );
    setAuth(result.account.authenticated);
    if (result.account.authenticated) {
      const rows = await api.pupils();
      setPupils(rows);
      setPupil((x) => (rows.some((p) => p.id === x) ? x : (rows[0]?.id ?? "")));
    }
  }
  useEffect(() => {
    account().catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    let active = true;
    setLoaded(false);
    if (!auth || !pupil) return;
    setBusy(true);
    repo
      .load()
      .then((rows) => {
        if (active) {
          setEvents(rows);
          setLoaded(true);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [auth, repo]);
  useEffect(() => {
    history.replaceState(
      null,
      "",
      "?" + new URLSearchParams({ learner: pupil, program: selected, journey }),
    );
    start.current = Date.now();
  }, [pupil, selected, journey]);
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const replay = useMemo(
    () =>
      replayFoundation(
        pupil || "not-selected",
        events,
        new Date(clock).toISOString(),
      ),
    [pupil, events, clock],
  );
  const p = programs.find((x) => x.id === selected) ?? programs[0],
    s = replay.progress[key(p.id, journey)],
    stage = p.stages.find((x) => x.id === s.current)!;
  useEffect(() => {
    if (loaded)
      document
        .getElementById("current-activity")
        ?.scrollIntoView({ block: "start" });
  }, [loaded, p.id, journey, stage.id]);
  async function send(
    action: FoundationActivity["action"],
    extra: Partial<FoundationActivity> = {},
  ) {
    if (!loaded || failed.current) return;
    setBusy(true);
    setSaved(false);
    setError("");
    const now = Date.now(),
      elapsedMs = Math.min(now - start.current, 3600000);
    start.current = now;
    try {
      const e: FoundationActivity = {
        kind: "math_foundation_activity",
        id: uid(),
        at: new Date(now).toISOString(),
        learnerId: pupil,
        sessionId: `math:${pupil}:${visit.current}`,
        programId: p.id,
        lessonVersion: "1.0.0",
        journey,
        stage: stage.id,
        action,
        elapsedMs,
        ...extra,
      };
      setEvents(await repo.append(e));
      setSaved(true);
    } catch (e) {
      failed.current = true;
      setError(
        "Not saved. " +
          String(e) +
          " Reload your saved place before continuing.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="foundation">
      <header>
        <a href="/">OpenPath</a>
        <h1>Mathematics · learn by doing</h1>
        <p className="notice">
          Private synthetic preview · provisional content · no educator approval
          or mastery claims
        </p>
      </header>
      {error && (
        <div role="alert">
          {error}
          <button onClick={() => location.reload()}>Reload saved place</button>
        </div>
      )}
      {!auth ? (
        <section>
          <h2>Use your OpenPath account</h2>
          <p>
            For synthetic review only. Use an existing test pupil. Account setup
            remains in OpenPath.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.login(email, password);
                await account();
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button>Sign in</button>
          </form>
        </section>
      ) : (
        <>
          <label>
            Test learner
            <select
              disabled={busy}
              value={pupil}
              onChange={(e) => setPupil(e.target.value)}
            >
              {pupils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </label>
          {!pupils.length && (
            <p>
              Create a synthetic pupil through the existing OpenPath account
              screen.
            </p>
          )}
          <nav aria-label="Journey type">
            <button
              disabled={busy}
              aria-pressed={journey === "school"}
              onClick={() => setJourney("school")}
            >
              School mathematics
            </button>
            <button
              disabled={busy}
              aria-pressed={journey !== "school"}
              onClick={() => setJourney("gre-quant")}
            >
              Competitive Exams
            </button>
          </nav>
          {journey !== "school" && (
            <section>
              <label>
                Exam journey
                <select
                  disabled={busy}
                  value={journey}
                  onChange={(e) =>
                    setJourney(e.target.value as FoundationActivity["journey"])
                  }
                >
                  <option value="gre-quant">GRE Quant</option>
                  <option value="jee-main">JEE Main</option>
                  <option value="jee-advanced">JEE Advanced</option>
                </select>
              </label>
              <p>
                Shared competency history, separate program completion. These
                are foundational reference lessons, not exam-style preparation.
                Scoring, timing and readiness claims are disabled.
              </p>
            </section>
          )}
          {loaded && (
            <>
              <section aria-label="Mathematics programs">
                {programs.map((pr) => {
                  const ps = replay.progress[key(pr.id, journey)],
                    percent = Math.round(
                      (ps.completed.length / pr.stages.length) * 100,
                    );
                  return (
                    <article key={pr.id}>
                      <button
                        className="program-row"
                        disabled={busy}
                        aria-expanded={selected === pr.id}
                        onClick={() => setSelected(pr.id)}
                      >
                        Grade {pr.grade} · {pr.title} — {percent}% activities
                      </button>
                      <progress
                        aria-label={`${pr.title} activity completion`}
                        max={100}
                        value={percent}
                      />
                      {selected === pr.id && (
                        <>
                          <p>
                            {ps.completed.length}/{pr.stages.length} activities
                            · {Math.floor(ps.timeMs / 60000)}m{" "}
                            {Math.floor(ps.timeMs / 1000) % 60}s recorded time ·{" "}
                            {ps.attempts} attempts
                          </p>
                          <p>
                            Shared understanding:{" "}
                            {replay.profiles[pr.id].status}. Completion is not
                            mastery.
                          </p>
                          <p>
                            {
                              Object.values(ps.answers).filter((a) => a.correct)
                                .length
                            }{" "}
                            matching practice examples;{" "}
                            {
                              Object.values(ps.answers).filter(
                                (a) => !a.correct,
                              ).length
                            }{" "}
                            to revisit. Practice is formative, including
                            successful examples.
                          </p>
                          <details>
                            <summary>
                              View fixed program and reopen completed activities
                            </summary>
                            <ol>
                              {pr.stages.map((st) => (
                                <li key={st.id}>
                                  <button
                                    disabled={
                                      busy ||
                                      (!ps.completed.includes(st.id) &&
                                        ps.current !== st.id)
                                    }
                                    onClick={() =>
                                      send("open", { stage: st.id })
                                    }
                                  >
                                    {ps.completed.includes(st.id)
                                      ? "✓ Completed"
                                      : ps.current === st.id
                                        ? "→ Current"
                                        : "Remaining"}{" "}
                                    · {st.title}
                                  </button>
                                </li>
                              ))}
                            </ol>
                          </details>
                        </>
                      )}
                    </article>
                  );
                })}
              </section>
              <section id="current-activity" aria-label="Current activity">
                <h2>{stage.title}</h2>
                <p>{stage.text}</p>
                <Speak text={stage.text} />
                {stage.id === "concept" && (
                  <div
                    className="idea-picture"
                    aria-label={
                      p.model === "objects"
                        ? "Two apples and three apples make five"
                        : p.model === "groups"
                          ? "Three groups of two dots"
                          : "One half equals two quarters"
                    }
                  >
                    {p.model === "objects"
                      ? "🍎🍎 + 🍎🍎🍎 = 5"
                      : p.model === "groups"
                        ? "(●●) (●●) (●●) = 6"
                        : "½ = ²⁄₄"}
                  </div>
                )}
                {stage.id === "explore" && (
                  <Model
                    key={`${pupil}:${p.id}:${journey}`}
                    p={p}
                    s={s}
                    save={(questionId, response) =>
                      send("draft", { questionId, response })
                    }
                    busy={busy}
                  />
                )}
                {stage.id === "guided" && (
                  <>
                    <p>Use the model to work out your answer.</p>
                    <Model
                      key={`${pupil}:${p.id}:${journey}:guided`}
                      p={p}
                      s={s}
                      busy={busy}
                      save={(questionId, response) =>
                        send("draft", {
                          stage: "explore",
                          questionId,
                          response,
                        })
                      }
                    />
                  </>
                )}
                {stage.id === "retention" &&
                (!s.due || Date.parse(s.due) > clock) ? (
                  <p role="status">
                    Review after{" "}
                    {s.due
                      ? new Date(s.due).toLocaleString()
                      : "finishing the earlier activities"}
                    . Your {s.completed.length} finished activities remain
                    complete.
                  </p>
                ) : (
                  <>
                    {stage.questions.map((id) => (
                      <Question
                        key={`${p.id}:${journey}:${id}`}
                        p={p}
                        id={id}
                        s={s}
                        send={send}
                        busy={busy}
                      />
                    ))}
                    <button
                      disabled={
                        busy || !!error || !canFinish(p, s, stage.id, clock)
                      }
                      onClick={() => send("complete")}
                    >
                      Finish activity and save place
                    </button>
                  </>
                )}
                <p>{instructionalSupport(p, s)}</p>
                <p role="status">
                  {busy
                    ? "Saving…"
                    : saved
                      ? "Saved to OpenPath account"
                      : "Your existing saved place is loaded."}
                </p>
              </section>
            </>
          )}
          <button
            disabled={busy}
            onClick={async () => {
              await api.logout();
              setAuth(false);
              setEvents([]);
              setLoaded(false);
            }}
          >
            Sign out
          </button>
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
