import { useEffect, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import type { SpellSource } from "../logic/events.ts";
import { learningView } from "../logic/spelling-learning.ts";
import { avoiding } from "../logic/spelling.ts";
import { playWord, stopWord } from "./wordPlayer.ts";
export function SpellingLearning({
  learner,
  source,
  title,
  onLeave,
  onChanged,
}: {
  learner: Learner;
  source: SpellSource;
  title: string;
  onLeave: () => void;
  onChanged: () => void;
}) {
  const [ready, setReady] = useState(
      learner.spelling().open?.event.learningMode === "learn-recall@1" &&
        learner.spelling().open?.event.source.type === source.type &&
        learner.spelling().open?.event.source.id === source.id,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<{
      correct: boolean;
      word: string;
      response: string;
      assisted: boolean;
    } | null>(null),
    [done, setDone] = useState(false);
  const view = learningView(learner);
  const cur = view?.cur;
  const [raw, setRaw] = useState(view?.draft ?? "");
  async function work(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError("Not saved. " + String(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!ready)
      void work(async () => {
        await learner.startSpelling(source, "device_voice", true);
        setReady(true);
      });
    return stopWord;
  }, []);
  useEffect(() => {
    if (ready && !result && view?.phase === "prepare" && !busy)
      void work(() => learner.learnSpelling("study"));
  }, [ready, cur?.session, cur?.word?.id, view?.phase, result]);
  useEffect(() => {
    setRaw(view?.draft ?? "");
  }, [cur?.session, cur?.word?.id]);
  const word = cur?.word?.word ?? "",
    safe = (...texts: string[]) =>
      view?.phase === "recall" && !result ? avoiding(word, ...texts) : texts[0];
  useEffect(() => {
    const before = document.title;
    document.title =
      view?.phase === "recall"
        ? avoiding(word, "Spelling Bee", "🐝", "…")
        : "Spelling Bee";
    return () => {
      document.title = before;
    };
  }, [view?.phase, word]);
  const speak = () => {
    if (cur?.word)
      void playWord(cur.word.word, null).then((r) => {
        if (r === "blocked")
          setError("Tap the speaker again to hear the word.");
        if (r === "failed")
          setError(
            "Sound is unavailable. A grown-up can read the word during Learn, then hide it for Recall.",
          );
      });
  };
  return (
    <main className="page bee-learning">
      <button className="link" onClick={onLeave} disabled={busy}>
        {safe("← Back", "←", "…")}
      </button>
      <p className="eyebrow">{safe("🐝 Spelling Bee", "🐝", "…")}</p>
      {result ? (
        <section aria-label="Practice feedback">
          <h1>{result.correct ? "You got it!" : "Let’s learn this one"}</h1>
          <p className="learning-word">{result.word}</p>
          <p>You typed: {result.response}</p>
          <p>
            {result.assisted
              ? "Practised with the spelling shown. We will ask again later."
              : "Recalled without showing the spelling. Keep practising on later days."}
          </p>
          {!result.correct && (
            <p>
              Look at the letters in order. Say them aloud, then picture the
              word with your eyes closed.
            </p>
          )}
          <button
            className="primary"
            onClick={() => {
              setResult(null);
              setRaw("");
              onChanged();
            }}
          >
            {done ? "See my review plan" : "Next word"}
          </button>
        </section>
      ) : done ? (
        <section>
          <h1>A little practice, every day</h1>
          <p>
            Your answers are saved. Newly learned or missed words return next
            session, then after 1, 3 and 7 days when recalled correctly.
          </p>
          <p>This is practice progress, not verified mastery.</p>
          <button className="primary" onClick={onLeave}>
            Back to my words
          </button>
        </section>
      ) : !ready || !view ? (
        <p role="status">Preparing your words…</p>
      ) : (
        <>
          <h1>
            {safe(
              view.phase === "study" ? "Learn the word" : "Recall the word",
              "Try it",
              "…",
            )}
          </h1>
          <p>
            {safe(
              `Word ${cur!.position} of ${cur!.total}`,
              `${cur!.position} / ${cur!.total}`,
            )}
          </p>
          {view.phase === "study" ? (
            <section className="study-card">
              <p className="learning-word">{word}</p>
              <div className="letter-tiles" aria-label="Letters in order">
                {Array.from(word).map((c, i) => (
                  <span key={i}>{c}</span>
                ))}
              </div>
              {cur!.word!.sentence ? (
                <p>{cur!.word!.sentence}</p>
              ) : (
                <p>Can you use this word in a sentence with a grown-up?</p>
              )}
              <p>
                Listen. Say the word. Notice the letters you find tricky.
                Picture them in your mind.
              </p>
              <button className="secondary" disabled={busy} onClick={speak}>
                Hear the word
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() => work(() => learner.learnSpelling("recall"))}
              >
                Hide it and spell
              </button>
            </section>
          ) : view.phase === "prepare" ? (
            <p role="status">Saving your place…</p>
          ) : (
            <section>
              <button
                className="primary speaker"
                aria-label={safe("Hear the word", "🔊", "…")}
                onClick={speak}
                disabled={busy}
              >
                🔊
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void work(async () => {
                    const assisted = view.assisted;
                    const response = raw;
                    const r = await learner.answerSpelling(response, 1);
                    setDone(!learner.spellingSession()?.word);
                    setResult({
                      correct: r.correct,
                      word: r.word.word,
                      response,
                      assisted,
                    });
                    stopWord();
                  });
                }}
              >
                <label>
                  {safe("Your spelling", "Your answer", "…")}
                  <input
                    aria-label={safe("Your spelling", "Your answer", "…")}
                    value={raw}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={busy}
                    onChange={(e) => setRaw(e.target.value)}
                    onBlur={(e) => {
                      if (
                        e.relatedTarget instanceof HTMLElement &&
                        e.currentTarget.form?.contains(e.relatedTarget)
                      )
                        return;
                      if (raw !== view.draft)
                        void work(() => learner.learnSpelling("draft", raw));
                    }}
                  />
                </label>
                <button className="primary" disabled={busy || !raw.trim()}>
                  {safe("Check spelling", "Check", "✓")}
                </button>
                <button
                  className="link"
                  type="button"
                  disabled={busy}
                  onClick={() => work(() => learner.learnSpelling("hint"))}
                >
                  {safe("Show it again (with help)", "Help", "?")}
                </button>
              </form>
              <p>
                {safe(
                  "The spelling stays hidden until you check.",
                  "Try on your own.",
                  "…",
                )}
              </p>
            </section>
          )}
        </>
      )}
      {error && (
        <div role="alert" className="warning">
          <p>{error}</p>
          <button className="secondary" onClick={() => location.reload()}>
            Reload my saved place
          </button>
        </div>
      )}
      <p role="status">{busy ? "Saving…" : ""}</p>
    </main>
  );
}
