import { useCallback, useEffect, useRef, useState } from "react";
import type { Response } from "../../../../packages/english-core/src/index.ts";
import type { Learner } from "../logic/learner.ts";
import { type Explanation, type SpellingJourneyView, UNSURE, spellingHint } from "../logic/spelling-journey.ts";
import { ItemView } from "./ItemView.tsx";
import { speak } from "./speech.ts";

interface Props {
  learner: Learner;
  voice: SpeechSynthesisVoice | null;
  onLeave: () => void;
  onChanged: () => void;
}

/** After a right answer the next step comes by itself, after this long (a wrong answer waits for Next, to read why). */
export const AUTO_NEXT_MS = 1200;

const KICKER: Record<string, string> = {
  screen: "On your own",
  assessment: "On your own",
  reassess: "A new word, on your own",
  retention: "Has it stuck? On your own",
};

/**
 * The spelling journey for the child: short check, lesson, practice with hints, check on new words, and a summary.
 * Every step is chosen by the app (spelling-journey.ts); the child never picks a lesson. Everything is saved as it
 * happens, so "Save and leave" (or closing the app) and coming back later carries on where it was.
 */
export function SpellingJourney({ learner, voice, onLeave, onChanged }: Props) {
  const [view, setView] = useState<SpellingJourneyView | null>(null);
  const [said, setSaid] = useState<Explanation | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      setView(await learner.spellingJourney());
      setSaid(null);
      setCorrect(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [learner, onChanged]);

  useEffect(() => {
    void refresh();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
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
  // the rule's name is shown in lessons and practice only: on a check it would give the answer away
  const name = step.kind === "teach" || step.kind === "guided" || step.kind === "practice" ? learner.content.spelling.rules.get(step.rule)?.child : null;
  const bar = (
    <header className="session-bar">
      <button type="button" className="quiet back" onClick={onLeave}>
        Save and leave
      </button>
      <h1 id="sj-title">Spelling{name ? `: ${name}` : ""}</h1>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={view.progress.total} aria-valuenow={view.progress.done} aria-label={`${view.progress.done} of about ${view.progress.total} done`}>
        <span style={{ width: `${(100 * view.progress.done) / Math.max(1, view.progress.total)}%` }} />
      </div>
    </header>
  );

  if (step.kind === "summary") return <SpellingSummary learner={learner} onLeave={async () => (await learner.finishSpellingJourney(), onLeave())} />;

  if (step.kind === "teach") {
    const lesson = step.strategy.lesson;
    const read = [lesson.title, ...lesson.steps, ...lesson.examples.map((e) => e.text.replace("→", "becomes"))].join(". ");
    return (
      <main className="session journey spelling-journey" aria-labelledby="sj-title">
        {bar}
        <article className="sheet lesson" data-step="teach" data-rule={step.rule} data-strategy={step.strategy.id}>
          <p className="kicker">{step.refresher ? "A quick refresher" : step.again ? "Let's try a different way" : "A short lesson"}</p>
          <h2>{lesson.title}</h2>
          {voice && (
            <button type="button" className="listen" onClick={() => speak(read, voice)} aria-label="Read the lesson aloud">
              <span aria-hidden="true">🔊 </span>Read it to me
            </button>
          )}
          <ol className="steps">
            {lesson.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <ul className="examples">
            {lesson.examples.map((e, i) => (
              <li key={i}>
                <span className="written">{e.text}</span>
                {e.note && <span className="note"> ({e.note})</span>}
              </li>
            ))}
            {step.examples.map((w) => (
              <li key={w.id} className="more-example">
                <span className="written">
                  {w.base} → {w.word}
                </span>
              </li>
            ))}
          </ul>
          {lesson.tip && <p className="tip">{lesson.tip}</p>}
          <button type="button" className="primary" autoFocus disabled={busy} onClick={() => act(async () => (await learner.teachSpellingJourney(view), await refresh()))}>
            Let's practise
          </button>
        </article>
      </main>
    );
  }

  if (step.kind === "guided" || step.kind === "practice") {
    const levels = step.strategy.hints.length;
    const finished = correct === true || (correct === false && step.hints.length >= levels);
    const waiting = correct === false && step.hints.length < levels;
    const lastLevel = step.hints.length + 1 >= levels;
    const hints = step.hints.map((h) => ({ text: spellingHint(step.strategy, step.word, h.level), worked: h.revealsAnswer === true }));
    const submit = (r: Response) =>
      act(async () => {
        const { feedback, explanation } = await learner.answerSpellingJourney(view, r);
        // a wrong answer with hints still to come keeps the same word: reload it so the next try is recorded in order
        if (!feedback.correct && step.hints.length < levels) setView(await learner.spellingJourney());
        setSaid(explanation);
        setCorrect(feedback.correct);
        if (feedback.correct) timer.current = setTimeout(() => void act(refresh), AUTO_NEXT_MS);
      });
    return (
      <main className="session journey spelling-journey" aria-labelledby="sj-title">
        {bar}
        <section className="sheet" data-step={step.kind} data-rule={step.rule}>
          <p className="kicker">{step.kind === "guided" ? "Practice with help" : "Extra practice with help"}</p>
          <ItemView key={`${step.item.id}:${step.attempts.length}`} item={step.item} voice={voice} locked={busy || finished || waiting} onSubmit={submit} />
          {hints.length > 0 && (
            <ol className="hints" aria-label="Hints">
              {hints.map((h, i) =>
                h.worked ? (
                  <li key={i} className="worked" data-worked="true">
                    <strong>Here's how:</strong> {h.text.replace(/^Worked example \(this shows the answer\): /, "")}
                  </li>
                ) : (
                  <li key={i}>{h.text}</li>
                ),
              )}
            </ol>
          )}
          {said && <Said said={said} correct={!!correct} />}
          <div className="after">
            {!finished && step.hints.length < levels && (
              <button type="button" className={waiting ? "primary" : "quiet"} disabled={busy} onClick={() => act(async () => (await learner.hintSpellingJourney(view), await refresh()))}>
                {lastLevel ? "Show me how" : waiting ? "Show a hint" : "I'd like a hint"}
              </button>
            )}
            {finished && correct === false && (
              <button type="button" className="primary" autoFocus onClick={() => act(refresh)}>
                Next
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  // a question on the child's own: no hints; "I'm not sure" is a real answer, never a guessed mistake
  const submit = (r: Response) =>
    act(async () => {
      const { feedback, explanation } = await learner.answerSpellingJourney(view, r);
      setSaid(explanation);
      setCorrect(feedback.correct);
      if (feedback.correct) timer.current = setTimeout(() => void act(refresh), AUTO_NEXT_MS);
    });
  return (
    <main className="session journey spelling-journey" aria-labelledby="sj-title">
      {bar}
      <section className="sheet" data-step="question" data-purpose={step.purpose} data-rule={step.rule}>
        <p className="kicker">{KICKER[step.purpose]}</p>
        <ItemView key={step.item.id} item={step.item} voice={voice} locked={busy || said !== null} onSubmit={submit} />
        {said === null && (
          <div className="after">
            <button type="button" className="quiet not-sure" disabled={busy} onClick={() => submit({ kind: "typed", text: UNSURE })}>
              I'm not sure
            </button>
          </div>
        )}
        {said && <Said said={said} correct={!!correct} />}
        {said && correct === false && (
          <div className="after">
            <button type="button" className="primary" autoFocus onClick={() => act(refresh)}>
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function Said({ said, correct }: { said: Explanation; correct: boolean }) {
  return (
    <div className={`feedback ${correct ? "right" : "wrong"}`} role="status" aria-live="polite" data-explanation={said.kind} {...(said.tag ? { "data-tag": said.tag } : {})}>
      <p className="verdict">{correct ? "Right!" : said.kind === "unsure" ? "That's OK." : said.kind === "slip" ? "Nearly!" : "Not quite."}</p>
      <p>{said.text}</p>
    </div>
  );
}

const PLAIN: Record<string, string> = {
  not_started: "Not started yet",
  screened_right: "Right so far",
  working_on: "Working on it",
  moved_on: "Getting it right on new words",
  paused: "Tricky for now: extra practice",
};

function SpellingSummary({ learner, onLeave }: { learner: Learner; onLeave: () => void }) {
  const vec = learner.learningVector();
  const report = learner.spellingJourneyReport();
  const started = vec.rules.filter((r) => r.provisional !== "not_started");
  return (
    <main className="session done journey spelling-journey" aria-labelledby="sj-summary-title">
      <section className="sheet" data-step="summary">
        <h1 id="sj-summary-title">Spelling: well done!</h1>
        <p className="big">{started.length ? "Your progress is saved. Next time you'll carry on from here." : "Nothing to practise right now. Come back another day."}</p>
        <ul className="rule-progress" aria-label="Your spelling rules">
          {started.map((r) => (
            <li key={r.rule} data-rule={r.rule} data-state={r.provisional}>
              <b>{r.name}</b>
              <span>{PLAIN[r.provisional]}</span>
            </li>
          ))}
        </ul>
        <details className="parent">
          <summary>For a grown-up</summary>
          <ul>
            {report.rules
              .filter((r) => vec.rules.find((v) => v.rule === r.rule)?.provisional !== "not_started")
              .map((r) => (
                <li key={r.rule}>
                  <b>{r.skill}</b>: {r.status}
                  {r.estimate && <> {r.estimate}</>}
                  {r.mistakes.length > 0 && <> Pattern seen: {r.mistakes.join("; ")}.</>}
                  {r.help && <> {r.help}</>}
                </li>
              ))}
          </ul>
          <p className="small">{report.provisional}</p>
        </details>
        <button type="button" className="primary" onClick={onLeave} autoFocus>
          Back to today
        </button>
      </section>
    </main>
  );
}
