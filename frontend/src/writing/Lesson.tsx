import { useEffect, useRef, useState } from "react";
import { Api } from "../english/logic/account";
import { WritingWorkspace } from "./Workspace";
import { LocalDigitRecognizer } from "./digit-recognizer";
import { WritingLessonRepo, type LessonActivity } from "./lesson-service";
import { writingEvidence } from "./evidence";
import type { Work, Validator } from "./contract";

/** The same account-backed lesson, mounted inside the curriculum. No independent identity or estimator. */
export function WritingLesson({
  api,
  pupil,
  topic,
  parameters = {},
  onExit,
  studentMode = true,
}: {
  api: Api;
  pupil: string;
  topic: string;
  parameters?: Record<string, number>;
  onExit: () => void | Promise<void>;
  studentMode?: boolean;
}) {
  const [activity, setActivity] = useState<LessonActivity | null>(null),
    [work, setWork] = useState<Work | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(""),
    [answer, setAnswer] = useState(""),
    [recognition, setRecognition] = useState(true);
  const repo = useRef<WritingLessonRepo | null>(null),
    latest = useRef(work),
    recognizer = useRef(new LocalDigitRecognizer());
  latest.current = work;
  useEffect(() => {
    let active = true;
    WritingLessonRepo.open(api, pupil, topic, parameters).then(
      (r) => {
        if (!active) return;
        repo.current = r.repo;
        setActivity(r.activity);
        setWork(r.work);
        setSaved(
          r.activity.work ? "Resumed from your account" : "New activity",
        );
      },
      (e) => active && setError(String(e)),
    );
    return () => {
      active = false;
    };
  }, [api, pupil, topic, JSON.stringify(parameters)]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  function changed(w: Work) {
    setWork(w);
    setSaved("Saving…");
    const r = repo.current!;
    void r.save(w).then(
      (result) => {
        if (
          latest.current?.id === w.id &&
          latest.current.revision === w.revision
        ) {
          setSaved("Saved in your account");
          setActivity((a) => (a ? { ...a, stage: result.stage } : a));
        }
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
  return (
    <section
      className="writing-host writing-lesson"
      aria-label="Writing lesson"
    >
      {error && <p role="alert">{error}</p>}
      {!activity || !work ? (
        <p role="status">Opening your lesson…</p>
      ) : (
        <>
          <p className="eyebrow">Learn → Write → Check → Understand</p>
          <h1>{activity.lesson.problem.statement}</h1>
          <p className="small">
            Practice content awaiting educator review. Completion and verified
            understanding are separate.
          </p>
          <section aria-label="Mathematics lesson">
            <p role="status">{saved}</p>
            {saved.startsWith("Not saved") && (
              <button onClick={() => changed(work)}>Try saving again</button>
            )}
            {activity.stage === "intro" && (
              <>
                <h2>Understand the idea</h2>
                <p>{activity.lesson.explanation}</p>
                {activity.lesson.topic === "fraction" && (
                  <figure aria-label="One half and two quarters cover the same amount">
                    {[2, 4].map((n) => (
                      <div key={n} className="fraction-strip">
                        {Array.from({ length: n }, (_, i) => (
                          <span
                            key={i}
                            style={{
                              background: i < n / 2 ? "#6755df" : "#fff",
                              flex: 1,
                              height: 44,
                              border: "1px solid #6755df",
                            }}
                          />
                        ))}
                      </div>
                    ))}
                    <figcaption>
                      1/2 = 2/4: the same amount, smaller pieces.
                    </figcaption>
                  </figure>
                )}
                {activity.lesson.topic === "multiplication" && (
                  <figure aria-label="Equal groups of objects">
                    {Array.from({ length: parameters.groups ?? 4 }, (_, i) => (
                      <div key={i} className="object-group">
                        {"● ".repeat(parameters.size ?? 6)}
                      </div>
                    ))}
                  </figure>
                )}
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
            {activity.stage === "diagnostic" && activity.probe && (
              <section aria-label="Diagnostic follow-up">
                <h2>Let’s check the idea first</h2>
                <p>
                  First check that the interpreted numbers match your writing. A
                  transcription error is not a maths mistake.
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
                  One wrong step does not tell us why. These questions separate
                  possible explanations.
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
                          Math.min(activity.support.teaching!.visual.size, 12),
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
            {["workspace", "complete", "diagnostic", "teaching"].includes(
              activity.stage,
            ) && (
              <>
                <label>
                  <input
                    type="checkbox"
                    checked={recognition}
                    onChange={(e) => setRecognition(e.target.checked)}
                  />
                  {studentMode
                    ? "Read handwritten digits"
                    : "Use local digit recognition"}
                </label>
                <p>
                  Recognition handles separate digits. Fractions, operators and
                  expressions can be typed. The original ink is kept.
                </p>
                <fieldset
                  disabled={
                    activity.stage === "diagnostic" ||
                    activity.stage === "teaching"
                  }
                >
                  <legend>Your working</legend>
                  <WritingWorkspace
                    studentMode={studentMode}
                    externalFeedback={
                      activity.support.lastResult &&
                      activity.support.lastCheckedRevision === work.revision
                        ? {
                            contract: "openpath-math-input@1",
                            workId: work.id,
                            revision: work.revision,
                            status: "feedback",
                            messages: [
                              {
                                regionId:
                                  activity.support.error?.region ??
                                  work.layout.regions[0].id,
                                text:
                                  (
                                    activity.support.lastResult as {
                                      message?: string;
                                    }
                                  ).message ?? "",
                                kind: "mathematical-feedback",
                              },
                            ],
                          }
                        : undefined
                    }
                    work={work}
                    onChange={changed}
                    recognizer={recognition ? recognizer.current : undefined}
                    validator={validator}
                    allowExtraRegions={false}
                  />
                </fieldset>
              </>
            )}
            {activity.stage === "complete" && (
              <section aria-label="Practice completion">
                <h2>Practice complete</h2>
                <p>
                  Your working is checked and saved. This practice is complete;
                  your skill level still needs independent, reviewed evidence.
                </p>
              </section>
            )}
            {!studentMode && (
              <section aria-label="Learner evidence">
                <details>
                  <summary>Inspect evidence receipts</summary>
                  <pre data-testid="writing-evidence">
                    {JSON.stringify(
                      {
                        learnerId: pupil,
                        receipts: activity.receipts,
                        decisions: writingEvidence(pupil, activity.receipts)
                          .ledger.decisions,
                        eligibility: [
                          ...writingEvidence(pupil, activity.receipts)
                            .eligibility,
                        ],
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </section>
            )}
            <button
              className="secondary"
              disabled={
                busy || saved === "Saving…" || saved.startsWith("Not saved")
              }
              onClick={() =>
                void run(async () => {
                  await repo.current!.flush();
                  await onExit();
                })
              }
            >
              {activity.stage === "complete"
                ? "Continue learning"
                : "Save and return to the lesson"}
            </button>
          </section>
        </>
      )}
    </section>
  );
}
