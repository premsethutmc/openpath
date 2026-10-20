import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api, type PupilSummary } from "../english/logic/account";
import { WritingWorkspace } from "./Workspace";
import { LocalDigitRecognizer } from "./digit-recognizer";
import { WritingLessonRepo, type LessonActivity } from "./lesson-service";
import { writingEvidence } from "./evidence";
import type { Work, Validator } from "./contract";
import { Demo } from "./Demo";
import "./style.css";
const api = new Api();
function Journey() {
  const [pupils, setPupils] = useState<PupilSummary[]>([]),
    [pupil, setPupil] = useState(""),
    [authenticated, setAuthenticated] = useState(false),
    [activity, setActivity] = useState<LessonActivity | null>(null),
    [work, setWork] = useState<Work | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(""),
    [answer, setAnswer] = useState(""),
    [recognition, setRecognition] = useState(true),
    [topic, setTopic] = useState("division"),
    [a, setA] = useState("379"),
    [b, setB] = useState("3");
  const repo = useRef<WritingLessonRepo | null>(null),
    latest = useRef(work),
    recognizer = useRef(new LocalDigitRecognizer());
  latest.current = work;
  async function account() {
    const s = await api.status();
    if (!s.available)
      throw Error(
        "Start the OpenPath account API to use this lesson. No simulated account or validation is substituted.",
      );
    setAuthenticated(s.account.authenticated);
    if (s.account.authenticated) {
      const ps = await api.pupils();
      setPupils(ps);
      const selected = new URLSearchParams(location.search).get("learner");
      setPupil(ps.find((p) => p.id === selected)?.id ?? ps[0]?.id ?? "");
    }
  }
  useEffect(() => {
    void account().catch((e) => setError(String(e)));
  }, []);
  async function run(fn: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function open() {
    if (!pupil) throw Error("Choose an existing learner first.");
    const r = await WritingLessonRepo.open(
      api,
      pupil,
      topic,
      topic === "division" ? { dividend: Number(a), divisor: Number(b) } : {},
    );
    repo.current = r.repo;
    setActivity(r.activity);
    setWork(r.work);
    setSaved(r.activity.work ? "Resumed from your account" : "New activity");
  }
  function changed(w: Work) {
    setWork(w);
    setSaved("Saving…");
    const r = repo.current!;
    void r.save(w).then(
      () => {
        if (
          latest.current?.id === w.id &&
          latest.current.revision === w.revision
        )
          setSaved("Saved in your account");
      },
      (e) => {
        setSaved("Not saved — keep this page open");
        setError(String(e));
      },
    );
  }
  async function action(action: string, extra: Record<string, unknown> = {}) {
    const r = await repo.current!.action(action, extra);
    setActivity(r);
    setAnswer("");
  }
  const validator: Validator = {
    async submit(_p, signal) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const submitted = latest.current!;
      if (submitted.id !== _p.workId || submitted.revision !== _p.revision)
        throw Error(
          "Writing changed before validation; check the saved work again.",
        );
      const r = await repo.current!.validate(submitted);
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (
        latest.current?.revision !== _p.revision ||
        latest.current?.id !== _p.workId
      )
        throw Error(
          "Writing changed while checking. Reload the saved lesson to inspect the result.",
        );
      setActivity(r.activity);
      return r.feedback;
    },
  };
  let evidence: ReturnType<typeof writingEvidence> | null = null;
  if (activity && pupil) evidence = writingEvidence(pupil, activity.receipts);
  return (
    <main>
      <header>
        <p className="eyebrow">OpenPath Mathematics</p>
        <h1>Write, check and understand</h1>
        <p>
          Unreviewed practice · recognition uncertainty is not a maths mistake ·
          no mastery awarded for helped corrections.
        </p>
        <a href="/mathematics.html">Mathematics journey</a>
      </header>
      {error && <p role="alert">{error}</p>}
      {!authenticated ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api.login(email, password);
              await account();
            });
          }}
        >
          <h2>Parent sign in</h2>
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
          <button disabled={busy}>Sign in</button>
          <p>
            Use the existing OpenPath parent account and learner. Create them
            through <a href="/">OpenPath home</a>.
          </p>
        </form>
      ) : (
        <>
          <section>
            <label>
              OpenPath learner
              <select
                aria-label="OpenPath learner"
                disabled={busy}
                value={pupil}
                onChange={(e) => {
                  setPupil(e.target.value);
                  setActivity(null);
                  setWork(null);
                }}
              >
                {pupils.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Practice topic
              <select
                aria-label="Practice topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="division">Long division</option>
                <option value="fraction">Equivalent fractions</option>
              </select>
            </label>
            {topic === "division" && (
              <>
                <label>
                  Dividend
                  <input
                    value={a}
                    onChange={(e) => setA(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  Divisor
                  <input
                    value={b}
                    onChange={(e) => setB(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
              </>
            )}
            <button disabled={busy || !pupil} onClick={() => void run(open)}>
              Open or resume lesson
            </button>
          </section>
          {activity && work && (
            <section aria-label="Division learning journey">
              <p role="status">{saved}</p>
              {activity.stage === "intro" && (
                <>
                  <h2>Understand the idea</h2>
                  <p>{activity.lesson.explanation}</p>
                  <button
                    disabled={busy}
                    onClick={() => void run(() => action("next"))}
                  >
                    See a worked example
                  </button>
                </>
              )}
              {activity.stage === "worked" && (
                <>
                  <h2>{activity.lesson.example.statement}</h2>
                  <ol>
                    {activity.lesson.example.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                  <p>{activity.lesson.example.answer}</p>
                  <button
                    disabled={busy}
                    onClick={() => void run(() => action("next"))}
                  >
                    Open my working
                  </button>
                </>
              )}
              {(activity.stage === "workspace" ||
                activity.stage === "complete") && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={recognition}
                      onChange={(e) => setRecognition(e.target.checked)}
                    />
                    Use local digit recognition
                  </label>
                  <p>
                    Recognition handles separate digits. Fractions, operators
                    and expressions can be typed. The original ink is kept.
                  </p>
                  <WritingWorkspace
                    work={work}
                    onChange={changed}
                    recognizer={recognition ? recognizer.current : undefined}
                    validator={validator}
                    allowExtraRegions={false}
                  />
                </>
              )}
              {activity.stage === "diagnostic" && activity.probe && (
                <section aria-label="Diagnostic follow-up">
                  <h2>Let’s check the idea first</h2>
                  <p>
                    First check that the interpreted numbers match your writing.
                    A transcription error is not a maths mistake.
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => void run(() => action("input-correction"))}
                  >
                    OpenPath read my writing incorrectly
                  </button>
                  <p>
                    {activity.support.error?.message}{" "}
                    {activity.support.error?.operation &&
                      `First step: ${activity.support.error.operation}.`}
                  </p>
                  <p>
                    One wrong step does not tell us why. These questions
                    separate possible explanations.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(() =>
                        action("probe", {
                          probeId: activity.probe!.id,
                          response: answer,
                        }),
                      );
                    }}
                  >
                    <label>
                      {activity.probe.prompt}
                      <input
                        disabled={busy}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        inputMode="numeric"
                      />
                    </label>
                    <button disabled={busy || !answer.trim()}>
                      Check this follow-up
                    </button>
                  </form>
                </section>
              )}
              {activity.stage === "teaching" && activity.support.teaching && (
                <section aria-label="Targeted teaching">
                  <h2>Try this way</h2>
                  <p>{activity.support.teaching.explanation}</p>
                  <div
                    aria-label="Equal groups representation"
                    hidden={
                      activity.lesson.topic !== "division" ||
                      activity.support.teaching.visual.groups > 9 ||
                      activity.support.teaching.visual.size > 12
                    }
                  >
                    {Array.from(
                      {
                        length: Math.min(
                          activity.support.teaching.visual.groups,
                          9,
                        ),
                      },
                      (_, i) => (
                        <span
                          key={i}
                          style={{
                            display: "inline-block",
                            padding: 8,
                            margin: 4,
                            border: "2px solid #6551c8",
                            borderRadius: 8,
                          }}
                        >
                          {"●".repeat(
                            Math.min(
                              activity.support.teaching!.visual.size,
                              12,
                            ),
                          )}
                        </span>
                      ),
                    )}
                  </div>
                  <p>{activity.support.teaching.note}</p>
                  <p>
                    {activity.support.teaching.possible.length
                      ? "Possible support areas: " +
                        activity.support.teaching.possible.join(", ")
                      : "The follow-ups suggest checking for a slip or notation issue; the cause remains unresolved."}
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => void run(() => action("resume"))}
                  >
                    Return to my original working
                  </button>
                </section>
              )}
              {activity.stage === "complete" && (
                <section aria-label="Practice completion">
                  <h2>Practice complete</h2>
                  <p>
                    All entered operations have been checked by OpenPath’s
                    arithmetic validator. Your work is saved. This does not
                    grant verified mastery.
                  </p>
                </section>
              )}
              {evidence && (
                <section aria-label="Learner evidence">
                  <h2>Your practice record</h2>
                  <p>
                    {
                      activity.receipts.filter((r) => r.action === "validation")
                        .length
                    }{" "}
                    checked attempts · {evidence.ledger.events.length} native
                    ledger records · verified proficiency unchanged.
                  </p>
                  <p>
                    Provisional content and helped/repeated attempts are held by
                    the existing evidence policy.
                  </p>
                  <details>
                    <summary>Inspect evidence receipts</summary>
                    <pre data-testid="writing-evidence">
                      {JSON.stringify(
                        {
                          learnerId: pupil,
                          receipts: activity.receipts,
                          decisions: evidence.ledger.decisions,
                          eligibility: [...evidence.eligibility],
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </section>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).get("demo") === "1" ? (
    <Demo />
  ) : (
    <Journey />
  ),
);
