/**
 * The essay studio connected to the real engine (?experience=essay-live).
 *
 * Every status here is read from EssayStudio (logic/essay-live/studio.ts), which reads the learner's own record
 * through the core: nothing on this screen decides what a learner knows. The studio works only with synthetic
 * essays, on a dedicated on-device synthetic profile; it never uses a child's profile or the parent account.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { type Item, type Response, wordCount } from "../../../../../packages/english-core/src/index.ts";
import { Brand } from "../Onboarding";
import { ItemView } from "../ItemView";
import { loadContent } from "../../logic/content.ts";
import type { Feedback } from "../../logic/feedback.ts";
import { Learner } from "../../logic/learner.ts";
import { openRepo } from "../../logic/store.ts";
import { connectEvaluator, EssayStudio, SAMPLES, STUDIO_PROFILE_ID, STUDIO_PROFILE_NAME, type StudioView } from "../../logic/essay-live/studio.ts";
import { Api } from "../../logic/account.ts";
import { presentationStatus } from "../../logic/essay-demo/shared-fixture.ts";
import { STATUS_LABELS } from "../../logic/essay-demo/fixtures.ts";
import { visibleStatus } from "../../logic/essay-demo/presenter.ts";
import "./essay.css";

/** Real time, plus the offset in days the app's tests already use (so a later sitting can be tested). */
const clock = () => {
  let days = 0;
  try {
    days = Number(localStorage.getItem("openpath-english-clock-offset-days") ?? 0) || 0;
  } catch {
    days = 0;
  }
  return new Date(Date.now() + days * 86_400_000).toISOString();
};

type Screen = "essay" | "skills" | "check" | "path" | "rewrite" | "profile";
const NAV: { screen: Screen; label: string }[] = [
  { screen: "essay", label: "Essay" },
  { screen: "skills", label: "Skills" },
  { screen: "check", label: "Questions" },
  { screen: "path", label: "Path" },
  { screen: "rewrite", label: "Rewrite" },
  { screen: "profile", label: "Profile" },
];
const STEP_LABEL = { diagnose: "Short check", teach: "Lesson", guided_practice: "Practice with help", independent_check: "Check without help" } as const;
const STEP_STATUS = { pending: "Not done yet", done: "Done (not a claim of mastery)", green: "Shown: the engine counts this skill at the grade target", blocked: "Content missing" } as const;
const RETENTION = {
  not_applicable: "Not yet: a delayed check comes only after the skill is shown without help",
  pending: "Pending: the delayed check is not due yet",
  due: "Due: the delayed check can be taken now",
  demonstrated: "Shown: the delayed check showed it was kept",
  not_demonstrated: "Not shown: the delayed check did not show it was kept (the evidence is recorded)",
} as const;
const yesNo = (b: boolean | null, yes: string, no: string, none = "Not on this path") => (b === null ? none : b ? yes : no);
const GAP = { suspected: "Suggested by your essay: not checked yet", confirmed: "Checked: questions without help agreed", weakened: "Checked: questions without help were right", unresolved: "Not settled yet" } as const;

const screenFor = (v: StudioView): Screen => (v.stage === "write" ? "essay" : v.stage === "diagnose" ? "check" : v.stage === "plan" || v.stage === "learn" ? "path" : v.stage === "rewrite" ? "rewrite" : "profile");

export function EssayLive() {
  const content = useMemo(() => loadContent(), []);
  const [studio, setStudio] = useState<EssayStudio | null>(null);
  const [view, setView] = useState<StudioView | null>(null);
  const [screen, setScreen] = useState<Screen>("essay");
  const [draft, setDraft] = useState("");
  const [rewrite, setRewrite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ item: string; f: Feedback } | null>(null);
  const [lessonAnswer, setLessonAnswer] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        // the device store only: essays never go to a parent account or a server
        const repo = await openRepo();
        const profiles = await repo.profiles();
        const learner = profiles.some((p) => p.id === STUDIO_PROFILE_ID)
          ? await Learner.open(content, repo, STUDIO_PROFILE_ID, clock)
          : await Learner.create(content, repo, STUDIO_PROFILE_NAME, "guardian", clock, STUDIO_PROFILE_ID, "this_device_only");
        // the server's evaluator only on explicit opt-in (&evaluator=server): otherwise nothing leaves the device
        const wantServer = new URLSearchParams(location.search).get("evaluator") === "server";
        const evaluator = wantServer ? await connectEvaluator(new Api()) : null;
        if (wantServer && !evaluator) setError("The server's essay evaluator is not available (sign in with a developer account, and ask for it to be switched on). Using the recorded samples and the pattern stand-in.");
        const s = new EssayStudio(learner, evaluator);
        const v = s.view();
        setStudio(s);
        setView(v);
        setScreen(screenFor(v));
        document.documentElement.dataset.essayStore = repo.kind;
      } catch (e) {
        setError(e instanceof Error ? e.message : "The essay studio could not open.");
      }
    })();
  }, [content]);
  useEffect(() => heading.current?.focus(), [screen]);

  async function act(f: () => Promise<StudioView>, after?: (v: StudioView) => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const v = await f();
      setView(v);
      after?.(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }
  async function answer(item: Item, r: Response, kind: "diagnostic" | "step" | "later") {
    if (!studio) return;
    await act(async () => {
      const out = kind === "diagnostic" ? await studio.answerDiagnostic(r) : kind === "later" ? await studio.answerLaterCheck(r) : await studio.answerStep(r);
      setFeedback({ item: item.id, f: out.feedback });
      return out.view;
    });
  }

  const v = view;
  const essay = v?.essay;
  const name = (cap: string) => studio?.ectx.profile.byCapability.get(cap)?.name ?? cap;
  const status = (cap: string) => {
    const c = v?.profile.competencies.find((x) => x.competency === cap);
    return c ? visibleStatus(presentationStatus(c), "shared-contract", c.engine.verification) : "not-started";
  };
  const Status = ({ cap }: { cap: string }) => {
    const s = status(cap);
    return <span className={`essay-status essay-status-${s}`} data-status={s}>{STATUS_LABELS[s]}</span>;
  };
  const passage = (item: Item) => (item.kind === "code" && item.passage ? content.ctx.content.passages.get(item.passage) : undefined);
  const enabled = (s: Screen) => !!v && (s === "essay" || !!essay) && (s !== "rewrite" || !!v.journey?.finalRewrite.available) && (s !== "profile" || !!essay);

  return (
    <div className="shell essay-experience" data-essay-mode="live" data-stage={v?.stage ?? "loading"}>
      <header className="top">
        <Brand />
        <a className="essay-exit" href="./">
          Back to OpenPath
        </a>
      </header>
      <aside className="essay-demo-banner" aria-label="What is real here">
        <strong>Essay studio · connected to the learning engine</strong>
        <span>
          Synthetic essays only, on a test learner kept on this device. Questions, lessons and every status come from the real engine.{" "}
          {studio?.connected
            ? `Essay analysis: OpenPath's server evaluator (${studio.evaluator.model ?? "model"}), checked by the engine. Only the essay text is sent to the server.`
            : "Essay analysis: recorded outputs for the built-in samples (other text: a simple pattern stand-in). No AI model is connected."}
        </span>
      </aside>
      {v && (
        <nav className="essay-nav" aria-label="Essay journey">
          {NAV.map((n) => (
            <button type="button" key={n.screen} aria-current={screen === n.screen ? "step" : undefined} disabled={busy || !enabled(n.screen)} onClick={() => setScreen(n.screen)}>
              {n.label}
            </button>
          ))}
        </nav>
      )}
      <main id="essay-main" className="page essay-main" aria-busy={busy}>
        <p className="eyebrow">Grade 8 · writing</p>
        <h1 className="hero" ref={heading} tabIndex={-1}>
          {{ essay: "Your essay", skills: "What your essay shows", check: "A few questions", path: "Your learning path", rewrite: "Same ideas, at most 50 words", profile: "Your writing profile" }[screen]}
        </h1>
        {error && (
          <div role="alert" className="essay-error">
            <p>{error}</p>
          </div>
        )}
        {!v && !error && <p role="status">Opening the essay studio…</p>}
        {v && screen === "essay" && (
          <>
            {essay && (
              <p className="essay-note" data-testid="essay-count">
                {v.essays.length} essay{v.essays.length === 1 ? "" : "s"} so far. A new essay starts from everything already recorded.
              </p>
            )}
            <section className="essay-prompt">
              <p className="kicker">Use invented text only</p>
              <p>Pick a built-in synthetic sample, or type invented writing. Do not paste a real child&apos;s work.</p>
              {SAMPLES.essays.map((s) => (
                <button key={s.id} type="button" className="link" data-sample={s.id} onClick={() => setDraft(s.text)}>
                  Use sample: {s.title}
                </button>
              ))}
            </section>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  () => studio!.submit(draft, { kind: SAMPLES.essays.some((s) => s.text === draft) ? "synthetic" : "typed" }),
                  (nv) => {
                    setDraft("");
                    setScreen("skills");
                    void nv;
                  },
                );
              }}
            >
              <label htmlFor="essay-live-draft">Essay</label>
              <textarea id="essay-live-draft" rows={10} maxLength={10000} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="essay-editor-foot">
                <span>At least 30 words</span>
                <output aria-live="polite">{wordCount(draft)} words</output>
              </div>
              <button type="submit" className="primary essay-primary" disabled={busy || wordCount(draft) < 30}>
                Analyse this essay
              </button>
            </form>
          </>
        )}
        {v && screen === "skills" && essay && (
          <>
            <p className="essay-note" data-testid="analysed-by">
              {
                {
                  llm: "Analysis: an AI model on OpenPath's server, checked word for word by the engine.",
                  replay: "Analysis: a recorded server answer (test mode), checked by the engine.",
                  recorded: "Analysis: recorded evaluator output for this built-in sample, checked by the engine.",
                  patterns: "Analysis: the simple pattern stand-in (it misses most errors), checked by the engine.",
                }[v.analysedBy ?? "patterns"]
              }{" "}
              {v.failedAnalyses.length > 0 && "The server's evaluator failed for this essay, so the local stand-in answered. "}One essay gives clues, not conclusions.
            </p>
            <div className="essay-competencies">
              {[...new Set(v.analysis?.observations.map((o) => o.competency) ?? [])].map((cap) => {
                const obs = v.analysis!.observations.filter((o) => o.competency === cap);
                const h = v.hypotheses.filter((x) => x.competency === cap).at(-1);
                return (
                  <article className="essay-card" key={cap} data-competency={cap}>
                    <div className="essay-card-heading">
                      <h2>{name(cap)}</h2>
                    </div>
                    <Status cap={cap} />
                    {h && <p data-gap={h.status}>{GAP[h.status]}</p>}
                    <details>
                      <summary>Why?</summary>
                      {obs.map((o) => (
                        <blockquote key={o.id}>
                          {o.kind === "error" ? "Check: " : o.kind === "style" ? "Style (a suggestion, not an error): " : "Good: "}“{o.span.quote}”{o.correction ? ` → ${o.correction}` : ""}
                        </blockquote>
                      ))}
                      {h && <p className="small">{h.basis.join(". ")}</p>}
                    </details>
                  </article>
                );
              })}
            </div>
            <button className="primary essay-primary" onClick={() => setScreen(screenFor(v))}>
              Continue
            </button>
          </>
        )}
        {v && screen === "check" && (
          <>
            {v.nextDiagnostic ? (
              <section className="essay-card essay-diagnostic" data-diagnostic={v.nextDiagnostic.request.competency}>
                <p className="kicker">
                  {name(v.nextDiagnostic.request.competency)} · question {v.nextDiagnostic.position} of up to {v.nextDiagnostic.total} · without help
                </p>
                <ItemView key={v.nextDiagnostic.item.id} item={v.nextDiagnostic.item} passage={passage(v.nextDiagnostic.item)} voice={null} locked={busy} onSubmit={(r) => void answer(v.nextDiagnostic!.item, r, "diagnostic")} />
              </section>
            ) : (
              <p className="essay-note">No questions are waiting.</p>
            )}
            {feedback && (
              <div className="essay-feedback" role="status" data-correct={feedback.f.correct}>
                <p>{feedback.f.correct ? "Right." : `Not quite. ${feedback.f.answer ? `Answer: ${feedback.f.answer}.` : ""}`}</p>
                {feedback.f.explanation && <p className="small">{feedback.f.explanation}</p>}
              </div>
            )}
            <ul className="essay-profile-list">
              {v.diagnostics.map((d) => (
                <li key={d.request.id} data-outcome={d.outcome.status}>
                  <span>{name(d.request.competency)}</span>
                  <span>{d.outcome.status === "pending" ? "In progress" : d.outcome.reason}</span>
                </li>
              ))}
            </ul>
            {!v.nextDiagnostic && (
              <button className="primary essay-primary" onClick={() => setScreen("path")}>
                Go to my learning path
              </button>
            )}
          </>
        )}
        {v && screen === "path" && (
          <>
            {!v.journey ? (
              <button className="primary essay-primary" disabled={busy || !!v.nextDiagnostic} onClick={() => void act(() => studio!.plan())}>
                Build my learning path
              </button>
            ) : (
              <>
                <div className="essay-tree">
                  {v.journey.trees.map((t) => (
                    <section className="essay-branch" key={t.root} data-tree={t.root}>
                      <h2>{name(t.root)}</h2>
                      <Status cap={t.root} />
                      <div className="essay-branch-body">
                        {t.nodes.map((n) => (
                          <div key={n.competency} data-node={n.competency} data-green={n.green}>
                            {n.role === "prerequisite" && <p className="kicker">First: {name(n.competency)}</p>}
                            <ol>
                              {n.steps.map((s) => (
                                <li key={s.id} data-step={s.kind} data-status={s.status}>
                                  <span className="essay-node" />
                                  {STEP_LABEL[s.kind]}
                                  <small>{s.status === "blocked" ? s.content.note : STEP_STATUS[s.status]}</small>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
                {v.outcomes.length > 0 && (
                  <section className="essay-card essay-outcomes" aria-label="Where each skill stands">
                    <h2>Where each skill stands</h2>
                    <p className="small">Each line is a separate claim. Finishing the path is never the same as showing a skill.</p>
                    {v.outcomes.map((o) => (
                      <dl key={o.competency} data-outcome-for={o.competency} data-journey-completed={String(o.journeyCompleted)} data-demonstrated={String(o.demonstrated)} data-verified={String(o.verified)} data-retention={o.retention}>
                        <dt>{name(o.competency)}</dt>
                        <dd>Path: {yesNo(o.journeyCompleted, "completed", "not finished")}</dd>
                        <dd>Shown without help at band {o.target}: {o.demonstrated ? "yes" : "not yet"}</dd>
                        <dd>Verified (a later check passed): {o.verified ? "yes" : "not yet"}</dd>
                        <dd>Retention: {RETENTION[o.retention]}{o.retentionDueAt && (o.retention === "pending" || o.retention === "due") ? ` (from ${o.retentionDueAt.slice(0, 10)})` : ""}</dd>
                        {o.pending && <dd className="small">{o.pending}</dd>}
                      </dl>
                    ))}
                    {v.outcomes.some((o) => o.next && !o.next.planned) && (
                      <button className="essay-primary" disabled={busy} onClick={() => void act(() => studio!.planLaterChecks())}>
                        Plan the later checks
                      </button>
                    )}
                    {v.checks.filter((c) => !v.laterCheck || c.id !== v.laterCheck.check.id).map((c) => (
                      <p className="small" key={c.id} data-planned-check={c.kind}>
                        {c.kind === "retention" ? "Delayed check" : "Later check"} on {name(c.competency)}: from {c.notBefore.slice(0, 10)}
                      </p>
                    ))}
                  </section>
                )}
                {v.laterCheck && !v.next && (
                  <section className="essay-card essay-active-step" data-current-step={`later_${v.laterCheck.check.kind}`}>
                    <p className="kicker">
                      {name(v.laterCheck.check.competency)} · {v.laterCheck.check.kind === "retention" ? "Delayed check" : "Later check"} {v.laterCheck.position} of {v.laterCheck.total}
                    </p>
                    <p className="small">A new sitting, on questions you have not seen. Answer without help.</p>
                    <ItemView key={v.laterCheck.item.id} item={v.laterCheck.item} passage={passage(v.laterCheck.item)} voice={null} locked={busy} onSubmit={(r) => void answer(v.laterCheck!.item, r, "later")} />
                  </section>
                )}
                {v.next && (
                  <section className="essay-card essay-active-step" data-current-step={v.next.step.kind}>
                    <p className="kicker">
                      {name(v.next.node.competency)} · {STEP_LABEL[v.next.step.kind]}
                    </p>
                    {v.next.step.kind === "teach" && v.next.lesson && (
                      <>
                        <h2>{v.next.lesson.title}</h2>
                        <p>{v.next.lesson.rule}</p>
                        {v.next.lesson.examples.map((ex) => (
                          <blockquote key={ex.text}>{ex.text}</blockquote>
                        ))}
                        <fieldset>
                          <legend>{v.next.lesson.check.prompt}</legend>
                          {v.next.lesson.check.options.map((o, i) => (
                            <label className="essay-option" key={o}>
                              <input type="radio" name="lesson-check" checked={lessonAnswer === i} onChange={() => setLessonAnswer(i)} />
                              <span>{o}</span>
                            </label>
                          ))}
                        </fieldset>
                        <button
                          className="primary essay-primary"
                          disabled={busy || lessonAnswer === null}
                          onClick={() => {
                            const l = v.next!.lesson!;
                            void act(() => studio!.readLesson(l.id, lessonAnswer === l.check.answer), () => setLessonAnswer(null));
                          }}
                        >
                          I&apos;ve read this
                        </button>
                      </>
                    )}
                    {v.next.item && (
                      <>
                        <p className="small">
                          {v.next.step.kind === "guided_practice"
                            ? "Practice: these answers help you learn and never count as showing the skill."
                            : v.next.newSitting
                              ? "A new sitting starts now, so this check is not straight after the lesson. Answer without help."
                              : "Answer without help."}
                        </p>
                        <ItemView key={v.next.item.id} item={v.next.item} passage={passage(v.next.item)} voice={null} locked={busy} onSubmit={(r) => void answer(v.next!.item!, r, "step")} />
                      </>
                    )}
                  </section>
                )}
                {feedback && (
                  <div className="essay-feedback" role="status" data-correct={feedback.f.correct}>
                    <p>{feedback.f.correct ? "Right." : `Not quite. ${feedback.f.answer ? `Answer: ${feedback.f.answer}.` : ""}`}</p>
                  </div>
                )}
                {v.journey.contentGaps.length > 0 && (
                  <details className="essay-note">
                    <summary>Missing content ({v.journey.contentGaps.length})</summary>
                    <ul>
                      {v.journey.contentGaps.map((g) => (
                        <li key={`${g.competency}${g.what}`}>{g.what}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {v.journey.skipped.length > 0 && (
                  <details>
                    <summary>Not on this path ({v.journey.skipped.length})</summary>
                    <ul>
                      {v.journey.skipped.map((s) => (
                        <li key={s.competency}>{s.reason}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <section className="essay-final-gate">
                  <h2>Final challenge</h2>
                  <p>{v.journey.finalRewrite.reason}</p>
                  <button className="primary" disabled={!v.journey.finalRewrite.available} onClick={() => setScreen("rewrite")}>
                    Rewrite in at most 50 words
                  </button>
                </section>
              </>
            )}
          </>
        )}
        {v && screen === "rewrite" && essay && (
          <>
            <details className="essay-original" open>
              <summary>Your essay</summary>
              <p>{essay.text}</p>
            </details>
            {SAMPLES.rewrites.some((r) => SAMPLES.essays.find((s) => s.id === r.essay)?.text === essay.text) && (
              <button type="button" className="link" data-sample-rewrite onClick={() => setRewrite(SAMPLES.rewrites.find((r) => SAMPLES.essays.find((s) => s.id === r.essay)?.text === essay.text)!.text)}>
                Use the synthetic sample rewrite
              </button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(() => studio!.rewrite(rewrite), () => setScreen("profile"));
              }}
            >
              <label htmlFor="essay-live-rewrite">Rewrite</label>
              <textarea id="essay-live-rewrite" rows={6} maxLength={2000} value={rewrite} onChange={(e) => setRewrite(e.target.value)} />
              <div className="essay-editor-foot">
                <span>20 to 50 words · aim for about 50</span>
                <output aria-live="polite">{wordCount(rewrite)} / 50 words</output>
              </div>
              <button className="primary essay-primary" type="submit" disabled={busy || wordCount(rewrite) < 20 || wordCount(rewrite) > 50}>
                Submit rewrite
              </button>
            </form>
          </>
        )}
        {v && screen === "profile" && (
          <>
            {v.rewrite && (
              <section className="essay-rewrite-feedback" data-rewrite={v.rewrite.status}>
                <h2>Rewrite</h2>
                {v.rewrite.status === "evaluated" ? (
                  v.rewrite.dimensions.map((d) => (
                    <article className="essay-card" key={d.dimension} data-dimension={d.dimension} data-dimension-status={d.status}>
                      <h3>{d.dimension.replace("_", " ")}</h3>
                      <p>{d.status === "accepted" ? `${d.rating?.replace("_", " ")}: ${d.note}` : `Not judged: ${d.reason}`}</p>
                    </article>
                  ))
                ) : (
                  <p className="essay-note">{v.rewrite.reasons[0]}</p>
                )}
                <p className="small">A rewrite never changes an estimate and never verifies a skill.</p>
              </section>
            )}
            <section>
              <h2>Skills in Grade 8 writing</h2>
              <ul className="essay-profile-list">
                {v.profile.competencies
                  .filter((c) => c.state !== "unknown")
                  .map((c) => (
                    <li key={c.competency} data-profile={c.competency} data-state={c.state}>
                      <span>{c.name}</span>
                      <Status cap={c.competency} />
                      {c.notes.map((n) => (
                        <small key={n}>{n}</small>
                      ))}
                    </li>
                  ))}
              </ul>
            </section>
            <div className="essay-next">
              <button className="primary" onClick={() => setScreen("essay")}>
                Write another essay
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
