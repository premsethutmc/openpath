import { useCallback, useEffect, useState } from "react";
import type { Response } from "../../../../packages/english-core/src/index.ts";
import type { Code, Lesson } from "../logic/content.ts";
import type { Feedback } from "../logic/feedback.ts";
import { type Current, Learner } from "../logic/learner.ts";
import { type Noticed, noticedFor } from "../logic/noticed.ts";
import { patternTitle } from "../logic/plan.ts";
import { areaWord } from "../logic/profile.ts";
import { patternKey, patternStatus } from "../logic/state.ts";
import { ItemView } from "./ItemView.tsx";

interface Props {
  learner: Learner;
  voice: SpeechSynthesisVoice | null;
  onLeave: () => void;
  onChanged: () => void;
}

export function Session({ learner, voice, onLeave, onChanged }: Props) {
  const [cur, setCur] = useState<Current | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [noticed, setNoticed] = useState<Noticed | null>(null);
  const [retry, setRetry] = useState<"none" | "trying" | "done">("none");
  const [retryFeedback, setRetryFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setCur(await learner.current());
      setFeedback(null);
      setNoticed(null);
      setRetry("none");
      setRetryFeedback(null);
      setReporting(false);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [learner, onChanged]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) return <Problem message={error} onLeave={onLeave} />;
  if (!cur) return <p className="loading">Opening your session…</p>;

  const type = cur.session.event.type;
  const title = Learner.sessionTitle(type);
  if (cur.lesson) return <LessonView lesson={cur.lesson} title={title} onLeave={onLeave} onDone={async (ok) => (await learner.finishLesson(cur.lesson!.id, ok), refresh())} />;
  if (!cur.next) return <Done learner={learner} cur={cur} onLeave={onLeave} />;

  const item = cur.next.item;
  const passage = item.kind === "code" && item.passage ? learner.content.ctx.content.passages.get(item.passage) : undefined;
  const submit = async (r: Response) => {
    if (busy) return;
    setBusy(true);
    try {
      if (retry === "trying") {
        setRetryFeedback(await learner.answer(item, r, { assisted: true, use: cur.next!.use }));
        setRetry("done");
      } else setFeedback(await learner.answer(item, r, { use: cur.next!.use }));
      // what the engine did with this answer, from its own decision
      setNoticed(noticedFor(learner.state));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const generated = item.kind === "code" && !!(item as Code).generated;
  const total = Math.max(cur.total, cur.done + 1);
  const locked = !!feedback && retry !== "trying";

  return (
    <main className="session" aria-labelledby="session-title">
      <header className="session-bar">
        <button type="button" className="quiet back" onClick={onLeave}>
          Save and leave
        </button>
        <h1 id="session-title">{title}</h1>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={cur.done} aria-label={`${cur.done} of about ${total} done`}>
          <span style={{ width: `${(100 * cur.done) / total}%` }} />
        </div>
      </header>
      <section className="sheet">
        {item.kind === "code" && (
          <span className="pill">
            <span aria-hidden="true">{AREA_EMOJI[areaWord(item.target)] ?? "🧠"}</span> {areaWord(item.target)}
          </span>
        )}
        <ItemView key={`${item.id}:${retry}`} item={item} passage={passage} voice={voice} locked={locked || busy} onSubmit={submit} />
        {feedback && <FeedbackPanel fb={retry === "done" && retryFeedback ? retryFeedback : feedback} retried={retry === "done"} />}
        {feedback && noticed && (
          <div className="noticed" data-noticed={noticed.kind}>
            <b>What OpenPath noticed: {noticed.title.toLowerCase()}</b>
            <p>{noticed.text}</p>
          </div>
        )}
        {feedback && (
          <div className="after">
            {!feedback.correct && retry === "none" && (
              <button type="button" className="quiet" onClick={() => setRetry("trying")}>
                Try again (practice only)
              </button>
            )}
            <button
              type="button"
              className="primary"
              onClick={() => {
                setCur(null);
                void refresh();
              }}
              autoFocus
            >
              Next
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        )}
        <footer className="item-foot">
          {generated && <span className="tag">Practice word, made from a dictionary. It helps your spelling plan but does not change your level yet.</span>}
          {!reporting ? (
            <button type="button" className="link" onClick={() => setReporting(true)}>
              Something wrong with this question?
            </button>
          ) : (
            <Report onCancel={() => setReporting(false)} onSend={async (note) => (await learner.flag(item, note), setReporting(false), onChanged())} />
          )}
        </footer>
      </section>
    </main>
  );
}

const AREA_EMOJI: Record<string, string> = { Spelling: "✍️", Grammar: "🧩", Words: "💬", Reading: "📚", Sentences: "🧱", Writing: "📝", "Reading basics": "🔤" };

function FeedbackPanel({ fb, retried }: { fb: Feedback; retried: boolean }) {
  return (
    <div className={`feedback ${fb.correct ? "right" : "wrong"}`} role="status" aria-live="polite">
      <p className="verdict">
        <span className="em" aria-hidden="true">
          {fb.correct ? "🌟" : "💡"}
        </span>
        {fb.correct ? (retried ? "Right this time." : "Right. Nicely spotted!") : retried ? "Not yet. The answer is below." : "Not quite. Here's why."}
      </p>
      {!fb.correct && (
        <p>
          The answer is <strong className="written">{fb.answer}</strong>.
        </p>
      )}
      {fb.variantNote && <p>{fb.variantNote}</p>}
      {fb.explanation && <p className="why">{fb.explanation}</p>}
    </div>
  );
}

function Report({ onSend, onCancel }: { onSend: (note: string) => void; onCancel: () => void }) {
  const [note, setNote] = useState("");
  return (
    <form
      className="report"
      onSubmit={(e) => {
        e.preventDefault();
        onSend(note.trim() || "(no note)");
      }}
    >
      <label>
        What is wrong? It stays on this device and is included in your export, for whoever reviews the questions.
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
      </label>
      <div className="row">
        <button type="button" className="quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary">
          Save the report
        </button>
      </div>
    </form>
  );
}

function LessonView({ lesson, title, onDone, onLeave }: { lesson: Lesson; title: string; onDone: (ok: boolean) => void; onLeave: () => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const answered = pick !== null;
  return (
    <main className="session" aria-labelledby="lesson-title">
      <header className="session-bar">
        <button type="button" className="quiet back" onClick={onLeave}>
          Save and leave
        </button>
        <p className="kicker">Lesson · {title}</p>
      </header>
      <article className="sheet lesson">
        <span className="pill">
          <span aria-hidden="true">📖</span> Discover
        </span>
        <h1 id="lesson-title">{lesson.title}</h1>
        <p className="rule">{lesson.rule}</p>
        <ul className="examples">
          {lesson.examples.map((e, i) => (
            <li key={i}>
              <span className="written">{e.text}</span>
              {e.note && <span className="note"> ({e.note})</span>}
            </li>
          ))}
        </ul>
        {lesson.tip && (
          <p className="tip">
            <span aria-hidden="true">✨ </span>
            {lesson.tip}
          </p>
        )}
        <section className="check" aria-labelledby="check-title">
          <h2 id="check-title">Quick check</h2>
          <p className="prompt">{lesson.check.prompt}</p>
          <div className="options" role="radiogroup">
            {lesson.check.options.map((o, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={pick === i}
                className={`option ${answered && i === lesson.check.answer ? "is-right" : ""} ${answered && pick === i && i !== lesson.check.answer ? "is-wrong" : ""}`}
                disabled={answered}
                onClick={() => setPick(i)}
              >
                {o}
              </button>
            ))}
          </div>
          {answered && (
            <div className={`feedback ${pick === lesson.check.answer ? "right" : "wrong"}`} role="status">
              <p className="verdict">{pick === lesson.check.answer ? "Right." : "Not quite."}</p>
              <p className="why">{lesson.check.explain}</p>
            </div>
          )}
        </section>
        <p className="small">This lesson is practice: the quick check does not count towards your level.</p>
        <button type="button" className="primary" disabled={!answered} onClick={() => onDone(pick === lesson.check.answer)}>
          Start practising
        </button>
      </article>
    </main>
  );
}

const TEACHING = new Set(["guided", "spelling_practice", "doubling_journey"]);

function Done({ learner, cur, onLeave }: { learner: Learner; cur: Current; onLeave: () => void }) {
  const answered = cur.session.answered;
  const right = answered.filter((a) => a.correct).length;
  const ev = cur.session.event;
  const missed = new Set(
    answered
      .filter((a) => !a.correct)
      .map((a) => (learner.content.ctx.content.items.get(a.item.id) as Code | undefined)?.generated?.word)
      .filter(Boolean),
  );
  let line = `${right} of ${answered.length} right first time.`;
  if (!answered.length) line = "There were no questions left for this. Your plan will move on.";
  let extra: string | null = null;
  if (ev.type === "placement") extra = "Your starting point is set. Your plan for today is ready.";
  if (ev.type === "spelling_transfer" && ev.capability && ev.step) {
    const st = patternStatus(learner.state.patterns.get(patternKey(ev.capability, ev.step)));
    extra = st === "secure" ? `"${patternTitle(learner.content, ev.capability, ev.step)}" works with new words too. That pattern is secure.` : "Not secure yet with new words. A little more practice, then another check.";
  }
  const teaching = TEACHING.has(ev.type) || !!ev.lesson;
  // answers the engine accepted as evidence (held ones are kept but not counted)
  const evidenceIds = new Set(answered.map((a) => (a as { evidence?: string }).evidence).filter(Boolean));
  const counted = learner.state.ledger.decisions.filter((d) => evidenceIds.has(d.source) && d.observation && d.verdict === "accepted").length;
  return (
    <main className="session done" aria-labelledby="done-title">
      <section className="sheet">
        <p className="confetti" aria-hidden="true">
          {teaching ? "🌱✨" : "🏆✨"}
        </p>
        <h1 id="done-title" className="hero">
          {Learner.sessionTitle(ev.type)}: done
        </h1>
        <p className="big">{line}</p>
        {extra && <p>{extra}</p>}
        {teaching ? (
          <div className="tile mint">
            <b>
              <span aria-hidden="true">🌱</span> Learning, not mastered yet
            </b>
            <p>You practised this today. Practice straight after a lesson shows improvement; a fresh check on your own, on another day, will show whether it has stuck.</p>
          </div>
        ) : (
          ev.type === "check" && (
            <div className="tile mint">
              <b>
                <span aria-hidden="true">🔎</span> Answers on your own
              </b>
              <p>
                {ev.purpose === "retention" ? "A later check: it shows what has stuck since you learned it. " : ""}
                {counted === answered.length ? "Every answer here counts as evidence." : `${counted} of ${answered.length} answers here count as evidence; the others were kept but not counted (for example a passage already counted, or a practice word).`} One check is never the whole story: OpenPath looks for patterns across several answers.
              </p>
            </div>
          )
        )}
        {missed.size > 0 && (
          <p>
            Words to review in a day: <span className="written">{[...missed].join(", ")}</span>.
          </p>
        )}
        <div className="stats">
          <div className="stat">
            <b>{answered.length}</b>
            <small>question{answered.length === 1 ? "" : "s"}</small>
          </div>
          <div className="stat">
            <b>{right}</b>
            <small>right first time</small>
          </div>
        </div>
        <button type="button" className="primary" onClick={onLeave} autoFocus>
          Back to today
        </button>
      </section>
    </main>
  );
}

function Problem({ message, onLeave }: { message: string; onLeave: () => void }) {
  return (
    <main className="session">
      <section className="sheet">
        <h1>This session could not continue</h1>
        <p>{message}</p>
        <p>Everything you answered before this point is saved.</p>
        <button type="button" className="primary" onClick={onLeave}>
          Back to today
        </button>
      </section>
    </main>
  );
}
