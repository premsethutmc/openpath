import { useCallback, useEffect, useState } from "react";
import type { Response } from "../../../../packages/english-core/src/index.ts";
import type { Feedback } from "../logic/feedback.ts";
import { type JourneyView, type ParentReport, hintText } from "../logic/journey.ts";
import type { Learner } from "../logic/learner.ts";
import { ItemView } from "./ItemView.tsx";

interface Props {
  learner: Learner;
  voice: SpeechSynthesisVoice | null;
  onLeave: () => void;
  onChanged: () => void;
}

const PURPOSE: Record<string, string> = {
  assessment: "On your own: no hints",
  reassess: "New word, on your own: no hints",
  retention: "A week later: has it stuck? No hints",
};

/** The adaptive consonant-doubling journey: check, diagnosis, teaching, guided practice, independent reassessment, summary. */
export function Journey({ learner, voice, onLeave, onChanged }: Props) {
  const [view, setView] = useState<JourneyView | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setView(await learner.journey());
      setFeedback(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [learner, onChanged]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (f: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await f();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error)
    return (
      <main className="session">
        <section className="sheet">
          <h1>This could not continue</h1>
          <p>{error}</p>
          <button type="button" className="primary" onClick={onLeave}>
            Back to today
          </button>
        </section>
      </main>
    );
  if (!view) return <p className="loading">Opening…</p>;

  const step = view.step;
  const bar = (
    <header className="session-bar">
      <button type="button" className="quiet back" onClick={onLeave}>
        Save and leave
      </button>
      <h1 id="journey-title">Doubling letters</h1>
    </header>
  );

  if (step.kind === "summary") return <JourneySummary learner={learner} view={view} onLeave={async () => (await learner.finishJourney(), onLeave())} />;

  if (step.kind === "teach")
    return (
      <main className="session journey" aria-labelledby="journey-title">
        {bar}
        <article className="sheet lesson" data-step="teach" data-strategy={step.strategy.id}>
          <p className="kicker">{step.refresher ? "A quick refresher" : view.rule.interventions.length ? "Let's try a different way" : "A short lesson"}</p>
          <h2>{step.strategy.lesson.title}</h2>
          <p className="why-this">{view.decision.reason}</p>
          <ol className="steps">
            {step.strategy.lesson.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <ul className="examples">
            {step.strategy.lesson.examples.map((e, i) => (
              <li key={i}>
                <span className="written">{e.text}</span>
                {e.note && <span className="note"> ({e.note})</span>}
              </li>
            ))}
          </ul>
          {step.strategy.lesson.tip && <p className="tip">{step.strategy.lesson.tip}</p>}
          <p className="tag">Provisional lesson: not yet reviewed by an educator.</p>
          <button type="button" className="primary" disabled={busy} onClick={() => act(async () => (await learner.teach(step.strategy, view.decision.reason), await refresh()))}>
            Practise with help
          </button>
        </article>
      </main>
    );

  if (step.kind === "guided") {
    const finished = !!feedback && (feedback.correct || step.hints.length >= 3);
    const waiting = !!feedback && !feedback.correct && step.hints.length < 3;
    const shownHints = step.hints.map((h) => hintText(step.strategy, step.item, h.level));
    const submit = (r: Response) =>
      act(async () => {
        const fb = await learner.answerGuided(step.item, r, step.intervention);
        // a wrong answer with hints still to come keeps the same word: reload it so the next try is recorded in order
        if (!fb.correct && step.hints.length < 3) setView(await learner.journey());
        setFeedback(fb);
      });
    return (
      <main className="session journey" aria-labelledby="journey-title">
        {bar}
        <section className="sheet" data-step="guided">
          <p className="kicker">Practice with help: this does not count as doing it on your own</p>
          <ItemView key={`${step.item.id}:${step.attempts.length}`} item={step.item} voice={voice} locked={busy || finished || waiting} onSubmit={submit} />
          {shownHints.length > 0 && (
            <ol className="hints" aria-label="Hints">
              {shownHints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ol>
          )}
          {feedback && (
            <div className={`feedback ${feedback.correct ? "right" : "wrong"}`} role="status" aria-live="polite">
              <p className="verdict">{feedback.correct ? (step.hints.length || step.attempts.length > 0 ? "Right, with help." : "Right.") : finished ? "Not this time." : "Not yet. A hint might help."}</p>
              {finished && !feedback.correct && (
                <p>
                  The answer is <strong className="written">{feedback.answer}</strong>.
                </p>
              )}
            </div>
          )}
          <div className="after">
            {!finished && step.hints.length < 3 && (
              <button type="button" className={waiting ? "primary" : "quiet"} disabled={busy} onClick={() => act(async () => (await learner.hint(step.item, step.strategy), await refresh()))}>
                {waiting ? "Show a hint" : "I'd like a hint"}
              </button>
            )}
            {finished && (
              <button type="button" className="primary" autoFocus onClick={() => act(refresh)}>
                Next
              </button>
            )}
          </div>
          <p className="tag">Practice word made from a dictionary: practice only.</p>
        </section>
      </main>
    );
  }

  // an independent question
  const submit = (r: Response) => act(async () => setFeedback(await learner.answerJourney(step.item, r, step.purpose)));
  return (
    <main className="session journey" aria-labelledby="journey-title">
      {bar}
      <section className="sheet" data-step="question" data-purpose={step.purpose}>
        <p className="kicker">{PURPOSE[step.purpose]}</p>
        <ItemView key={step.item.id} item={step.item} voice={voice} locked={busy || !!feedback} onSubmit={submit} />
        {feedback && (
          <div className={`feedback ${feedback.correct ? "right" : "wrong"}`} role="status" aria-live="polite">
            <p className="verdict">{feedback.correct ? "Right." : "Not quite."}</p>
            {!feedback.correct && (
              <p>
                The answer is <strong className="written">{feedback.answer}</strong>.
              </p>
            )}
          </div>
        )}
        {feedback && (
          <div className="after">
            <button type="button" className="primary" autoFocus onClick={() => act(refresh)}>
              Next
            </button>
          </div>
        )}
        <p className="tag">Provisional question: not yet reviewed by an educator.</p>
      </section>
    </main>
  );
}

const LEARNER_LINE: Record<string, string> = {
  shown_independently: "You doubled the letter correctly on new words, on your own. We'll check again in about a week to see if it has stuck.",
  improved_after_teaching: "After the lesson you got new words right on your own. That's real progress. A few more, and a check in a week, will show it is secure.",
  paused_for_support: "This one is tricky, and that's fine. We've tried three different ways; next, it's best to work on it with a grown-up. You can carry on with other practice.",
  retention_confirmed: "A week later, you still remembered it. Well done.",
  content_gap: "We've run out of questions for this for now.",
};

function JourneySummary({ learner, view, onLeave }: { learner: Learner; view: JourneyView; onLeave: () => void }) {
  const report = learner.doublingReport();
  return (
    <main className="session done journey" aria-labelledby="summary-title">
      <section className="sheet" data-step="summary" data-outcome={view.decision.outcome ?? view.decision.action}>
        <h1 id="summary-title">Doubling letters: today</h1>
        <p className="big">{LEARNER_LINE[view.decision.outcome ?? ""] ?? view.decision.reason}</p>
        <ParentSummary report={report} />
        <button type="button" className="primary" onClick={onLeave} autoFocus>
          Back to today
        </button>
      </section>
    </main>
  );
}

const RETENTION: Record<ParentReport["retention"], string> = {
  not_shown: "Not yet: it first needs to be shown securely on its own, then checked again after a week.",
  pending: "Pending: not yet checked after a delay.",
  confirmed: "Confirmed: still right after at least a week.",
  failed: "Not kept: wrong at the check after a week. Earlier progress is still recorded.",
};

/** The parent-facing summary: what happened, with help and without, and what is still unknown. No probabilities. */
export function ParentSummary({ report }: { report: ParentReport }) {
  const a = report.assistance;
  return (
    <section className="parent" aria-labelledby="parent-title">
      <h2 id="parent-title">For a parent or teacher</h2>
      <dl>
        <dt>Skill</dt>
        <dd>{report.skill}</dd>
        <dt>Where things stand</dt>
        <dd>{report.status}</dd>
        <dt>Difficulty seen</dt>
        <dd>{report.difficulty.length ? <ul>{report.difficulty.map((d, i) => <li key={i}>{d}</li>)}</ul> : "None on these questions."}</dd>
        <dt>Help received</dt>
        <dd>
          {a.strategies.length
            ? `${a.strategies.length} lesson${a.strategies.length > 1 ? "s" : ""} (${a.strategies.join("; ")}). Practice with help: ${a.rightFirstTry} right at the first try, ${a.rightWithHelp} right after a hint or second try, ${a.hints} hint${a.hints === 1 ? "" : "s"} used.`
            : "None: every answer so far was given without help."}
        </dd>
        <dt>On their own after teaching</dt>
        <dd>{report.afterTeaching.length ? <ul>{report.afterTeaching.map((x, i) => <li key={i}>{`After "${x.strategy}": ${x.right} of ${x.total} new words right without help.`}</li>)}</ul> : "No teaching yet."}</dd>
        <dt>Different approach needed</dt>
        <dd>{report.differentStrategyNeeded ? `Yes: ${a.strategies.length} approaches tried.` : report.afterTeaching.length ? "No." : "Not applicable."}</dd>
        <dt>Remembered later</dt>
        <dd>
          {RETENTION[report.retention]}
          {report.retention === "pending" && report.retentionDue ? ` Due from ${report.retentionDue.slice(0, 10)}.` : ""}
        </dd>
        {report.support && (
          <>
            <dt>Recommended</dt>
            <dd className="support">{report.support}</dd>
          </>
        )}
      </dl>
      <p className="small">{report.provisional}</p>
    </section>
  );
}

