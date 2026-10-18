import { useEffect, useRef, useState } from "react";
import { Brand } from "../Onboarding";
import {
  CAPABILITIES,
  CONTEXT,
  SAMPLE_ESSAY,
  SAMPLE_REWRITE,
  STATUS_LABELS,
  type PresentationStatus,
} from "../../logic/essay-demo/fixtures";
import {
  createFixturePresenter,
  visibleStatus,
  wordCount,
  type DemoCommand,
  type DemoScreen,
  type EssayPresentation,
  type EssayPresenter,
} from "../../logic/essay-demo/presenter";
import "./essay.css";

const NAV: { screen: DemoScreen; label: string }[] = [
  { screen: "submission", label: "Essay" },
  { screen: "dashboard", label: "Your skills" },
  { screen: "journey", label: "Learning path" },
  { screen: "rewrite", label: "Rewrite" },
  { screen: "profile", label: "Profile" },
];
function Status({ state }: { state: PresentationStatus }) {
  const status = visibleStatus(state, "fixture");
  return (
    <span className={`essay-status essay-status-${status}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
export function EssayJourney({
  presenter: provided,
}: {
  presenter?: EssayPresenter;
}) {
  const [presenter] = useState(
    () => provided ?? createFixturePresenter(localStorage),
  );
  const [initial] = useState(() => {
    try {
      return { view: presenter.load(), error: "" };
    } catch {
      return {
        view: null,
        error:
          "The saved demo could not be opened. It has been preserved. You can clear only this demo and start again.",
      };
    }
  });
  const [view, setView] = useState<EssayPresentation | null>(initial.view);
  const [error, setError] = useState(initial.error);
  const [busy, setBusy] = useState(false);
  const [lastCommand, setLastCommand] = useState<DemoCommand | null>(null);
  const [draft, setDraft] = useState(initial.view?.record.original ?? "");
  const [rewrite, setRewrite] = useState(initial.view?.record.rewrite ?? "");
  const [answer, setAnswer] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const record = view?.record;
  const responseKey = record
    ? `${record.selected}.${record.screen}.${record.step}`
    : "";
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    setAnswer(view?.record.drafts[responseKey] ?? "");
    heading.current?.focus();
  }, [record?.screen, responseKey]);
  function sync(action: () => EssayPresentation) {
    try {
      const next = action();
      setView(next);
      setError("");
      setSaveNotice("Saved on this device · demo only");
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The demo could not be saved. Keep this page open and copy your draft.",
      );
      return false;
    }
  }
  function edit(kind: "original" | "rewrite", text: string) {
    if (kind === "original") setDraft(text);
    else setRewrite(text);
    sync(() => presenter.edit(kind, text));
  }
  function respond(text: string) {
    setAnswer(text);
    sync(() => presenter.answerDraft(text));
  }
  function go(screen: DemoScreen) {
    if (busy) return;
    sync(() => presenter.navigate(screen));
  }
  async function run(command: DemoCommand) {
    if (running.current) return;
    if (
      command.type === "analyse" &&
      !sync(() => presenter.edit("original", draft))
    )
      return;
    if (
      command.type === "rewrite" &&
      !sync(() => presenter.edit("rewrite", rewrite))
    )
      return;
    running.current = true;
    controller.current = new AbortController();
    setBusy(true);
    setError("");
    setLastCommand(command);
    try {
      const next = await presenter.run(command, controller.current.signal);
      setView(next);
      setSaveNotice("Saved on this device · demo only");
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(
          e instanceof Error
            ? e.message
            : "The sample step could not be loaded. Your draft is still here.",
        );
    } finally {
      running.current = false;
      if (!controller.current?.signal.aborted) setBusy(false);
    }
  }
  function reset() {
    if (busy) return;
    try {
      const next = presenter.reset();
      setView(next);
      setDraft("");
      setRewrite("");
      setAnswer("");
      setError("");
      setSaveNotice("Demo cleared. Your English record was not changed.");
    } catch {
      setError("The demo could not be cleared in this browser.");
    }
  }
  const cap =
    CAPABILITIES.find((c) => c.id === record?.selected) ?? CAPABILITIES[0];
  const scene = record?.scenes[cap.id];
  const stageTitle =
    record?.screen === "submission"
      ? "Your ideas. A little clearer."
      : record?.screen === "dashboard"
        ? "A map for your writing"
        : record?.screen === "diagnostic"
          ? `Let’s explore ${cap.name.toLowerCase()}`
          : record?.screen === "journey"
            ? "One idea at a time"
            : record?.screen === "rewrite"
              ? "Same ideas. Just 50 words."
              : "Look how your writing can grow";
  const learningCard = record && view && scene && (
    <section
      className="essay-card essay-active-step"
      aria-label={`${cap.name} learning step`}
    >
      <p className="kicker">
        {cap.name} ·{" "}
        {record.step === "explain"
          ? "Understand the idea"
          : record.step === "guided"
            ? "Try with support"
            : "Try on your own"}
      </p>
      {record.step === "explain" ? (
        <>
          <h2>{cap.focus}</h2>
          <p>{cap.explanation}</p>
          <blockquote>{cap.example}</blockquote>
          <button
            className="primary essay-primary"
            onClick={() => sync(() => presenter.lesson())}
          >
            Try an example
          </button>
        </>
      ) : (
        <>
          <h2>{record.step === "guided" ? cap.guided : cap.independent}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run({
                type: record.step === "guided" ? "guided" : "independent",
                answer,
              });
            }}
          >
            <label htmlFor="essay-practice">Your sample response</label>
            <textarea
              id="essay-practice"
              rows={3}
              maxLength={2000}
              value={answer}
              onChange={(e) => respond(e.target.value)}
            />
            {record.step === "guided" && (
              <>
                <button
                  type="button"
                  className="link"
                  onClick={() => sync(() => presenter.hint())}
                >
                  A little help
                </button>
                {record.hintShown && <p className="essay-note">{cap.hint}</p>}
              </>
            )}
            <button
              type="submit"
              className="primary essay-primary"
              disabled={!answer.trim()}
            >
              Show sample{" "}
              {record.step === "guided" ? "practice" : "independent"} feedback
            </button>
          </form>
          {((scene === "guided" && record.step === "guided") ||
            (scene === "independent" && record.step === "independent")) && (
            <div className="essay-feedback" role="status">
              <h3>
                {record.step === "guided"
                  ? "A supported practice example"
                  : "An independent example—not verification"}
              </h3>
              <p>
                This prewritten response illustrates how feedback will appear.
                Your words have not been assessed.
              </p>
              {record.step === "guided" ? (
                <button
                  className="primary"
                  onClick={() => sync(() => presenter.independent())}
                >
                  Try on your own
                </button>
              ) : (
                <button className="primary" onClick={() => go("rewrite")}>
                  Take the 50-word challenge
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
  return (
    <div
      className="shell essay-experience"
      data-fixture-mode="essay-ux-fixture.v1"
    >
      <a
        className="essay-skip"
        href="#essay-main"
        onClick={(e) => {
          e.preventDefault();
          heading.current?.focus();
        }}
      >
        Skip to essay content
      </a>
      <header className="top">
        <Brand />
        <a className="essay-exit" href="./">
          Back to OpenPath
        </a>
      </header>
      <aside className="essay-demo-banner" aria-label="Synthetic demonstration">
        <strong>Essay studio · synthetic demo</strong>
        <span>
          Sample feedback only. Your writing is not assessed or uploaded. Use
          invented text, not real-child data.
        </span>
      </aside>
      {view && (
        <nav className="essay-nav" aria-label="Essay journey">
          {NAV.map((n) => (
            <button
              type="button"
              key={n.screen}
              aria-current={record?.screen === n.screen ? "step" : undefined}
              disabled={
                busy ||
                (!record?.analysed && n.screen !== "submission") ||
                (n.screen === "rewrite" && !view.finalChallenge.available) ||
                (n.screen === "profile" && !record?.rewritten)
              }
              onClick={() => go(n.screen)}
            >
              {n.label}
            </button>
          ))}
        </nav>
      )}
      <main id="essay-main" className="page essay-main" aria-busy={busy}>
        <p className="eyebrow">Writing with purpose</p>
        <h1 className="hero" ref={heading} tabIndex={-1}>
          {stageTitle}
        </h1>
        <div className="essay-context">
          <span>{CONTEXT.grade}</span>
          <span>{CONTEXT.curriculum}</span>
          <span>Practice preview</span>
        </div>
        {view?.interrupted && (
          <p className="essay-note">
            Your last sample step was interrupted. Your drafts and place were
            saved; no assessment was completed.
          </p>
        )}
        {error && (
          <div role="alert" className="essay-error">
            <strong>Let’s keep your writing safe.</strong>
            <p>{error}</p>
            {lastCommand && view && (
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => void run(lastCommand)}
              >
                Try again
              </button>
            )}
            {!view && (
              <button className="secondary" onClick={reset}>
                Clear saved demo
              </button>
            )}
          </div>
        )}
        {busy ? (
          <section className="essay-progress" role="status" aria-live="polite">
            <span className="essay-spinner" aria-hidden="true" />
            <h2>Preparing sample feedback</h2>
            <p>
              Loading a prewritten example and its learning path. No analysis
              service is connected.
            </p>
            <p>
              Your draft is saved here. If you close this page, you can resume.
            </p>
          </section>
        ) : (
          view &&
          record && (
            <>
              {record.screen === "submission" && (
                <>
                  <section className="essay-prompt">
                    <p className="kicker">Your writing prompt</p>
                    <h2>{CONTEXT.prompt}</h2>
                    <p>
                      Make your case, give a reason, and consider another point
                      of view.
                    </p>
                  </section>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run({ type: "analyse" });
                    }}
                  >
                    <div className="essay-editor-head">
                      <label htmlFor="essay-draft">Your sample essay</label>
                      <button
                        type="button"
                        className="link"
                        onClick={() => edit("original", SAMPLE_ESSAY)}
                      >
                        Use sample essay
                      </button>
                    </div>
                    <textarea
                      id="essay-draft"
                      ref={editor}
                      value={draft}
                      maxLength={10000}
                      rows={10}
                      onChange={(e) => edit("original", e.target.value)}
                      aria-describedby="essay-draft-help essay-word-count"
                      placeholder="Write or paste invented sample writing here…"
                    />
                    <div className="essay-editor-foot">
                      <span id="essay-draft-help">
                        Up to 10,000 characters · saved locally
                      </span>
                      <output id="essay-word-count" aria-live="polite">
                        {wordCount(draft)} words
                      </output>
                    </div>
                    <button
                      type="submit"
                      className="primary essay-primary"
                      disabled={!draft.trim()}
                    >
                      Explore sample feedback <span aria-hidden="true">→</span>
                    </button>
                    <p className="small">
                      The walkthrough always shows feedback for the built-in
                      sample, even if you edit the text.
                    </p>
                  </form>
                </>
              )}
              {record.screen === "dashboard" && (
                <>
                  <p className="sub">
                    One essay gives us clues, not conclusions. Choose a skill to
                    see the sample evidence and try a short check.
                  </p>
                  <p className="essay-note">
                    These are fictional projections about the built-in
                    sample—not findings about your draft.
                  </p>
                  <div className="essay-competencies">
                    {CAPABILITIES.map((c) => {
                      const projection = view.competencies.find(
                        (x) => x.id === c.id,
                      )!;
                      return (
                        <article
                          className="essay-card"
                          key={c.id}
                          data-competency={c.id}
                        >
                          <div className="essay-card-heading">
                            <span className="essay-icon" aria-hidden="true">
                              {c.icon}
                            </span>
                            <h2>{c.name}</h2>
                          </div>
                          <Status state={projection.status} />
                          <p>{c.focus}</p>
                          <details>
                            <summary>Why this skill?</summary>
                            <blockquote>
                              {projection.evidence[0]?.span.quote ??
                                "No sample observation"}
                            </blockquote>
                            <p>{c.reason}</p>
                            <p className="small">
                              {projection.signal} Source: fictional sample, not
                              your draft.
                            </p>
                          </details>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              sync(() => presenter.navigate("diagnostic", c.id))
                            }
                          >
                            Explore {c.name.toLowerCase()}{" "}
                            <span aria-hidden="true">→</span>
                          </button>
                        </article>
                      );
                    })}
                  </div>
                  <button
                    className="primary essay-primary"
                    onClick={() => go("journey")}
                  >
                    See your learning path
                  </button>
                </>
              )}
              {record.screen === "diagnostic" && (
                <section className="essay-card essay-diagnostic">
                  <p className="kicker">A closer look · {cap.name}</p>
                  <h2>{cap.question}</h2>
                  <p className="small">
                    Select an answer to preview the interaction. This demo does
                    not score it.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run({ type: "diagnostic", answer });
                    }}
                  >
                    <fieldset>
                      <legend className="sr-only">Choose your response</legend>
                      {cap.options.map((option) => (
                        <label className="essay-option" key={option}>
                          <input
                            type="radio"
                            name="essay-answer"
                            value={option}
                            checked={answer === option}
                            onChange={() => respond(option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </fieldset>
                    <button
                      className="primary essay-primary"
                      type="submit"
                      disabled={!answer}
                    >
                      Show sample feedback
                    </button>
                  </form>
                  {scene && scene !== "introduced" && (
                    <div className="essay-feedback" role="status">
                      <p className="kicker">Scripted diagnostic example</p>
                      <h3>A useful place to practise</h3>
                      <p>
                        In this example, a diagnostic supports practising{" "}
                        {cap.focus.toLowerCase()}. Your selected answer was not
                        evaluated.
                      </p>
                      <Status
                        state={
                          view.competencies.find((c) => c.id === cap.id)!.status
                        }
                      />
                      <button
                        className="primary"
                        onClick={() =>
                          sync(() => presenter.navigate("journey", cap.id))
                        }
                      >
                        Practise this idea
                      </button>
                    </div>
                  )}
                </section>
              )}
              {record.screen === "journey" && (
                <>
                  <p className="sub">
                    Open a branch to see the next small step. Unfinished work
                    stays here when you leave.
                  </p>
                  <div className="essay-tree">
                    {CAPABILITIES.map((c) => {
                      const expanded = record.expanded.includes(c.id),
                        state = view.competencies.find(
                          (x) => x.id === c.id,
                        )!.status;
                      return (
                        <section className="essay-branch" key={c.id}>
                          <h2>
                            <button
                              type="button"
                              className="essay-branch-toggle"
                              aria-expanded={expanded}
                              aria-controls={`branch-${c.id}`}
                              onClick={() => sync(() => presenter.expand(c.id))}
                            >
                              <span>
                                {c.name}
                                <small>{c.focus}</small>
                              </span>
                              <span aria-hidden="true">
                                {expanded ? "−" : "+"}
                              </span>
                            </button>
                          </h2>
                          <Status state={state} />
                          <div
                            id={`branch-${c.id}`}
                            hidden={!expanded}
                            className="essay-branch-body"
                          >
                            {view.competencies
                              .find((x) => x.id === c.id)!
                              .tree.nodes.map((node) => (
                                <div key={node.competency}>
                                  {node.role === "prerequisite" && (
                                    <p className="kicker">
                                      Prerequisite · {node.competency}
                                    </p>
                                  )}
                                  <ol>
                                    {node.steps.map((step) => (
                                      <li key={step.id}>
                                        <span className="essay-node" />
                                        {
                                          {
                                            diagnose: "Short diagnostic",
                                            teach: "Understand the idea",
                                            guided_practice: "Try with support",
                                            independent_check:
                                              "Try a new example",
                                          }[step.kind]
                                        }
                                        <small>
                                          {step.status === "done"
                                            ? "Explored · fixture"
                                            : step.status === "blocked"
                                              ? "Content unavailable"
                                              : step.status === "green"
                                                ? "Evidence check · fixture only"
                                                : "Not started"}
                                        </small>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              ))}
                            <button
                              className="secondary"
                              onClick={() =>
                                sync(() =>
                                  presenter.navigate(
                                    record.scenes[c.id]
                                      ? "journey"
                                      : "diagnostic",
                                    c.id,
                                  ),
                                )
                              }
                            >
                              {record.scenes[c.id]
                                ? "Resume this branch"
                                : "Start the short check"}
                            </button>
                            {c.id === cap.id && learningCard}
                          </div>
                        </section>
                      );
                    })}
                  </div>

                  <p className="essay-note">
                    Verified is reserved for shared-policy evidence. Finishing a
                    screen never turns a competency green.
                  </p>
                  <section className="essay-final-gate">
                    <h2>Your final challenge</h2>
                    <p>{view.finalChallenge.reason}</p>
                    <button
                      className="primary"
                      disabled={!view.finalChallenge.available}
                      onClick={() => go("rewrite")}
                    >
                      Rewrite in 50 words
                    </button>
                  </section>
                </>
              )}
              {record.screen === "rewrite" && (
                <>
                  <p className="sub">
                    Rewrite your original essay in 50 words.
                  </p>
                  <p>
                    Keep the central idea and your strongest reasons. Give every
                    word a job.
                  </p>
                  <details className="essay-original" open>
                    <summary>Your original sample essay</summary>
                    <p>{draft}</p>
                  </details>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run({ type: "rewrite" });
                    }}
                  >
                    <div className="essay-editor-head">
                      <label htmlFor="essay-rewrite">
                        Your 50-word rewrite
                      </label>
                      <button
                        type="button"
                        className="link"
                        onClick={() => edit("rewrite", SAMPLE_REWRITE)}
                      >
                        Use sample rewrite
                      </button>
                    </div>
                    <textarea
                      id="essay-rewrite"
                      rows={7}
                      maxLength={2000}
                      value={rewrite}
                      onChange={(e) => edit("rewrite", e.target.value)}
                      aria-describedby="rewrite-count rewrite-help"
                    />
                    <div className="essay-editor-foot">
                      <span id="rewrite-help">
                        Exactly 50 words · keep the meaning
                      </span>
                      <output id="rewrite-count" aria-live="polite">
                        {wordCount(rewrite)} / 50 words
                      </output>
                    </div>
                    <button
                      className="primary essay-primary"
                      type="submit"
                      disabled={wordCount(rewrite) !== 50}
                    >
                      See sample rewrite feedback
                    </button>
                  </form>
                </>
              )}
              {record.screen === "profile" && (
                <>
                  <p className="sub">A small step in your writing journey.</p>
                  <p className="essay-note">
                    This is an updated synthetic profile. No live learner record
                    or competency estimate was changed.
                  </p>
                  <section className="essay-rewrite-feedback">
                    <h2>Your sample rewrite feedback</h2>
                    {view.shared.rewrite?.dimensions.map((f) => (
                      <article className="essay-card" key={f.dimension}>
                        <h3>
                          {f.dimension === "meaning_preservation"
                            ? "Meaning preservation"
                            : f.dimension[0].toUpperCase() +
                              f.dimension.slice(1)}
                        </h3>
                        <p>{f.note}</p>
                      </article>
                    ))}
                  </section>
                  <section>
                    <h2>Your writing profile · fixture</h2>
                    <p>
                      Different skills need different evidence. A final rewrite
                      does not verify them all.
                    </p>
                    <ul className="essay-profile-list">
                      {CAPABILITIES.map((c) => (
                        <li key={c.id}>
                          <span>{c.name}</span>
                          <Status
                            state={
                              view.competencies.find((x) => x.id === c.id)!
                                .status
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                  <div className="essay-next">
                    <p className="kicker">Keep growing</p>
                    <h2>Another idea, another small step.</h2>
                    <p>
                      Return to an unfinished branch. A connected shared engine
                      will choose the next activity and any delayed checks.
                    </p>
                    <button className="primary" onClick={() => go("journey")}>
                      Return to your learning path
                    </button>
                    <button className="link" onClick={() => go("rewrite")}>
                      Reopen your rewrite
                    </button>
                  </div>
                </>
              )}
            </>
          )
        )}
        <p className="essay-save" role="status">
          {saveNotice}
        </p>
        <details className="essay-preview-controls">
          <summary>About this preview</summary>
          <p>
            All feedback and statuses are prewritten fictional examples. Answers
            only move the storyboard forward; no correctness, mastery or
            diagnosis is calculated. Shared essay intelligence is not connected.
          </p>
          <p>
            Only this demo’s drafts are saved in local browser storage. Nothing
            is sent to an API, analytics service or existing English learner
            record.
          </p>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              presenter.simulateFailure();
              setSaveNotice(
                "The next sample request will show the loading-error state.",
              );
            }}
          >
            Preview a loading error
          </button>
          <button
            className="link"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Clear only this synthetic essay demo?"))
                reset();
            }}
          >
            Clear this demo
          </button>
        </details>
      </main>
    </div>
  );
}
