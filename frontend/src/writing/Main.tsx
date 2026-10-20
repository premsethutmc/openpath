import { HANDWRITING_ENABLED } from "./features";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api, type PupilSummary } from "../english/logic/account";
import { WritingLesson } from "./Lesson";
import { WritingLessonRepo, type LessonActivity } from "./lesson-service";

import type { Work } from "./contract";
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
    [topic, setTopic] = useState("division"),
    [a, setA] = useState("379"),
    [b, setB] = useState("3");

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
    setActivity(r.activity);
    setWork(r.work);
  }
  return (
    <main className="writing-host">
      <header>
        <p className="eyebrow">OpenPath Mathematics</p>
        <h1>Work, check and understand</h1>
        <p>
          Mathematics practice · helped corrections do not award mastery.
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
            <WritingLesson
              studentMode={false}
              key={activity.id}
              api={api}
              pupil={pupil}
              topic={topic}
              parameters={
                topic === "division"
                  ? { dividend: Number(a), divisor: Number(b) }
                  : {}
              }
              onExit={() => {
                setActivity(null);
                setWork(null);
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  HANDWRITING_ENABLED && new URLSearchParams(location.search).get("demo") === "1" ? (
    <div className="writing-host">
      <Demo />
    </div>
  ) : (
    <Journey />
  ),
);
