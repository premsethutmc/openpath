import { practiceRound, practiceParameters, storePracticeRound } from "./practice-round";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Api } from "../english/logic/account";
import { ProgressiveDivision } from "./ProgressiveDivision";
import { GuidedWritingLesson } from "./GuidedLesson";
import { WritingWorkspace } from "./Workspace";
import { LocalDigitRecognizer } from "./digit-recognizer";
import { WritingLessonRepo, type LessonActivity } from "./lesson-service";
import { createWork, blockers } from "./model";
import type { Work } from "./contract";

type Props = {
  api: Api;
  pupil: string;
  topic: string;
  parameters?: Record<string, number>;
  onExit: () => void | Promise<void>;
  studentMode?: boolean;
  initialMode?: string;
  sessionControls?: ReactNode;
};
/** Default curriculum interaction. Correctness remains server-owned; guided working is opt-in. */
export function WritingLesson(props: Props) {
  // Retain the existing developer harness; curriculum/student entry uses one answer.
  if (props.studentMode === false) return <GuidedWritingLesson {...props} />;
  if (props.topic === "division") return <DivisionLesson {...props} />;
  return <OneAnswerLesson {...props} />;
}
function DivisionLesson(props: Props) {
  const [round, setRound] = useState(() => practiceRound("division"));
  const parameters = practiceParameters("division", props.parameters ?? {}, round);
  return <ProgressiveDivision
    api={props.api} pupil={props.pupil} parameters={parameters}
    onExit={props.onExit} sessionControls={props.sessionControls} round={round}
    onNext={async () => {
      if (round >= 99) { await props.onExit(); return; }
      storePracticeRound("division", round + 1);
      setRound(round + 1);
    }}
    alternative={mode => <OneAnswerLesson {...props} initialMode={mode === "ink" ? "ink" : "type"} />}
  />;
}

function OneAnswerLesson(props: Props) {
  const [a, setA] = useState<LessonActivity | null>(null),
    [answer, setAnswer] = useState(""),
    [ink, setInk] = useState<Work | null>(null),
    [mode, setMode] = useState(props.initialMode ?? "type"),
    [help, setHelp] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(""),
    [guided, setGuided] = useState(false),
    [generation, reload] = useState(0),
    [next, setNext] = useState(() => practiceRound(props.topic));
  const repo = useRef<WritingLessonRepo | null>(null),
    dirty = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    draft = useRef({ answer: "", ink: null as Work | null });
  const recognizer = useRef(new LocalDigitRecognizer());
  const parameters = practiceParameters(props.topic, props.parameters ?? {}, next);
  useEffect(() => {
    let active = true;
    setA(null);
    repo.current = null;
    dirty.current = false;
    WritingLessonRepo.open(
      props.api,
      props.pupil,
      props.topic,
      parameters,
    ).then(
      (r) => {
        if (!active) return;
        repo.current = r.repo;
        const s = r.activity.support.simple;
        const w =
          s?.ink ??
          createWork(
            r.activity.id,
            r.activity.lesson.problem,
            r.activity.lesson.answerLayout,
          );
        setA(r.activity);
        setAnswer(s?.answer ?? "");
        setInk(w);
        draft.current = { answer: s?.answer ?? "", ink: w };
        setSaved(s ? "Saved work resumed" : "");
      },
      (e) => active && setError(String(e)),
    );
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      if (dirty.current && repo.current)
        void repo.current
          .action("answer-draft", { ...draft.current, round: next })
          .catch(() => {});
    };
  }, [
    props.api,
    props.pupil,
    props.topic,
    JSON.stringify(parameters),
    generation,
  ]);
  async function persist() {
    if (timer.current) clearTimeout(timer.current);
    if (!dirty.current || !repo.current) return;
    const snapshot = draft.current;
    dirty.current = false;
    setSaved("Saving…");
    try {
      await repo.current.action("answer-draft", { ...snapshot, round: next });
      setSaved("Saved");
    } catch (e) {
      dirty.current = true;
      setSaved("Not saved");
      throw e;
    }
  }
  function change(text: string, w = ink) {
    setAnswer(text);
    setInk(w);
    draft.current = { answer: text, ink: w };
    dirty.current = true;
    setA((old) =>
      old
        ? {
            ...old,
            support: {
              ...old.support,
              simple: { ...old.support.simple, result: undefined },
            },
          }
        : old,
    );
    setSaved("Saving…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist().catch((e) => setError(String(e)));
    }, 350);
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await persist();
      await fn();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function assist(which: string) {
    await run(async () => {
      setA(await repo.current!.action("answer-help"));
      setHelp(which);
    });
  }
  async function guide() {
    await run(async () => {
      await repo.current!.action("guided");
      setGuided(true);
    });
  }
  if (guided)
    return (
      <>
        <button
          className="secondary"
          onClick={() => {
            setGuided(false);
            reload((n) => n + 1);
          }}
        >
          Back to one answer
        </button>
        <GuidedWritingLesson {...props} />
      </>
    );
  if (!a || !ink) return <p role="status">Opening your question…{error}</p>;
  const result = a.support.simple?.result;
  return (
    <section
      className="simple-maths writing-host"
      aria-label="Mathematics question"
    >
      <h1>
        {a.lesson.problem.statement}
        {props.topic === "fraction" ? "" : " = ?"}
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            if (mode === "ink" && blockers(ink).length) {
              setError(
                "Please clarify the unclear writing, or type your answer. No maths error recorded.",
              );
              return;
            }
            setA(
              await repo.current!.action("check-answer", {
                answer,
                method: mode,
              }),
            );
          });
        }}
      >
        <label htmlFor="math-answer">Your answer</label>
        <input
          id="math-answer"
          disabled={busy}
          aria-label="Your answer"
          placeholder="Type your answer"
          value={answer}
          maxLength={100}
          inputMode={props.topic === "multiplication" ? "numeric" : "text"}
          autoComplete="off"
          onChange={(e) => change(e.target.value)}
        />
        {props.topic === "division" && (
          <p className="answer-format">Include the remainder, e.g. 62 R 0.</p>
        )}
        {result?.outcome !== "complete" && (
          <button className="primary" disabled={busy} type="submit">
            Check answer
          </button>
        )}
      </form>
      <button
        className="secondary"
        onClick={() => {
          setMode(mode === "ink" ? "type" : "ink");
          setError("");
        }}
      >
        {mode === "ink" ? "Type instead" : "✏️ Write instead"}
      </button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <section role="status" className={"answer-feedback " + result.outcome}>
          <p>{result.message}</p>
          {result.outcome === "complete" ? (
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  setAnswer("");
                  setHelp("");
                  setMode("type");
                  if (next >= (props.topic === "multiplication" ? 11 : 99)) {
                    await props.onExit();
                    return;
                  }
                  storePracticeRound(props.topic, next + 1);
                  setNext((n) => n + 1);
                })
              }
            >
              Next question
            </button>
          ) : (
            <div className="answer-actions">
              <button
                onClick={() => {
                  setA({
                    ...a,
                    support: {
                      ...a.support,
                      simple: { ...a.support.simple, result: undefined },
                    },
                  });
                  document.getElementById("math-answer")?.focus();
                }}
              >
                Try again
              </button>
              <button onClick={() => void assist("hint")}>Get a hint</button>
              <button onClick={() => void guide()}>Show steps</button>
            </div>
          )}
        </section>
      )}
      {mode === "ink" && (
        <section aria-label="Write your answer">
          <p>
            Write separated digits. Letters, fraction bars and unrestricted
            expressions aren’t recognized. Type those parts above; your writing
            stays here.
          </p>
          <WritingWorkspace
            compact
            studentMode
            allowExtraRegions={false}
            work={ink}
            recognizer={recognizer.current}
            onChange={(w) => {
              const ts = w.tokens
                .filter((t) => t.status !== "uncertain")
                .sort((x, y) => x.bounds.x - y.bounds.x);
              change(ts.length ? ts.map((t) => t.text).join("") : answer, w);
            }}
          />
        </section>
      )}
      <div className="answer-help">
        <button onClick={() => void assist("concept")}>
          Help me understand
        </button>
        <button onClick={() => void assist("example")}>Show an example</button>
        <button onClick={() => void guide()}>Help me step by step</button>
      </div>
      {help && (
        <aside aria-label="Optional help">
          <p>
            {help === "example"
              ? a.lesson.example.statement
              : a.lesson.explanation}
          </p>
          {help === "example" && (
            <>
              <ol>
                {a.lesson.example.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <p>{a.lesson.example.answer}</p>
            </>
          )}
          <button onClick={() => setHelp("")}>Back to my answer</button>
        </aside>
      )}
      <button
        className="link"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            await repo.current!.flush();
            await props.onExit();
          })
        }
      >
        Save and return to the lesson
      </button>
      <small role="status">{saved}</small>
      <small>Provisional practice · completion is not verified mastery.</small>
    </section>
  );
}
