/**
 * The Spelling Bee: hear a word, type it, see whether it is right, go on. No placement, account or upload is needed.
 * One screen for every spelling source (logic/spelling.ts); the word's spelling is never in the page before the answer
 * is submitted (it is only heard, or, if nothing can be heard at all, shown to a grown-up who asks for it).
 *
 * Built for a child alone with a phone: the word plays by itself (a recording for the Spelling Bee's words, the
 * device's voice for a parent's own); one big speaker button plays it again as often as wanted, or starts it when the
 * browser wants a tap first; Submit; the answer is shown and the next word follows by itself. No settings, no
 * explanations about voices. See wordPlayer.ts for how sound is played and what happens when it cannot be.
 */
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { SpellSource } from "../logic/events.ts";
import type { Learner } from "../logic/learner.ts";
import { BANK, LEVEL_NAMES, type SpellWord, avoiding, levelOf, sourceKey, sourceProgress } from "../logic/spelling.ts";
import { type PlayOutcome, onPlaying, playWord, prefetch, stopWord } from "./wordPlayer.ts";

type Result = { correct: boolean; word: SpellWord; typed: string };

/** How long the answer stays on screen before the next word comes by itself (a test can set window.__beeAdvanceMs). */
const advanceMs = (correct: boolean) => {
  const t = typeof window !== "undefined" ? (window as unknown as { __beeAdvanceMs?: number }).__beeAdvanceMs : undefined;
  return typeof t === "number" ? t : correct ? 1600 : 3500;
};

export function SpellingBee({ learner, voice, speechOff, onTurnSpeechOn, onLeave, onChanged, source = BANK, title = "Spelling Bee", backTo = "Home" }: { learner: Learner; voice: SpeechSynthesisVoice | null; speechOff: boolean; onTurnSpeechOn: () => Promise<void>; onLeave: () => void; onChanged: () => void; source?: SpellSource; title?: string; backTo?: string }) {
  // an unfinished session carries on only if it is on this source (a list's session never continues as the Bee's)
  const mine = () => {
    const s = learner.spellingSession();
    return s && sourceKey(s.source) === sourceKey(source) ? s : null;
  };
  const [session, setSession] = useState<string | null>(mine()?.session ?? null);
  const [result, setResult] = useState<Result | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const plays = useRef(0);
  // the Spelling Bee's words have recordings; a parent's own words are said by the device's voice
  const delivery = source.type === "bank" ? "recording" : "device_voice";

  const begin = async () => {
    setProblem(null);
    setBusy(true);
    try {
      await learner.startSpelling(source, delivery);
      setSession(learner.spellingSession()?.session ?? null);
      setResult(null);
      onChanged();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not start");
    } finally {
      setBusy(false);
    }
  };
  // open the session to carry on, or start one
  useEffect(() => {
    if (!mine()) void begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = mine();
  const words = learner.spellingWords(source);
  const st = learner.spelling();
  const done = session ? st.sessions.get(session) : undefined;
  const leveled = words.some((w) => w.level !== undefined);

  const submit = async (typed: string) => {
    setBusy(true);
    try {
      const r = await learner.answerSpelling(typed, plays.current);
      setResult({ ...r, typed });
      onChanged();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not save the answer");
    } finally {
      setBusy(false);
    }
  };
  const next = () => {
    stopWord();
    plays.current = 0;
    setResult(null);
  };
  // the next word comes by itself after the answer has been seen (the button skips the wait); the last one shows the summary
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(next, advanceMs(result.correct));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);
  // leaving the screen, or the phone locking, stops the sound
  useEffect(() => {
    const hide = () => document.visibilityState === "hidden" && stopWord();
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      stopWord();
    };
  }, []);

  // while a word is asked, no text on the page may contain it (a parent's list can hold any word): see avoiding()
  const asking = !result && cur?.word ? cur.word.word : null;
  const safe = (...options: string[]) => (asking ? avoiding(asking, ...options) : options[0]);
  useEffect(() => {
    if (!asking) return;
    const was = document.title;
    document.title = avoiding(asking, "OpenPath English", "OpenPath", "…");
    return () => {
      document.title = was;
    };
  }, [asking]);
  const counts = cur ?? (done ? { position: done.answers.length, total: done.event.words.length, right: done.answers.filter((a) => a.correct).length, wrong: done.answers.filter((a) => !a.correct).length, level: done.event.level } : null);
  // after a session, the level it moved to; during one, the level it was planned at
  const level = cur ? cur.level : done && leveled ? levelOf(st, source) : undefined;
  // while an answer's feedback is shown, the counter stays on that word
  const position = counts ? (result && cur ? cur.position - 1 : counts.position) : 0;

  return (
    <main className="page bee" aria-labelledby="bee-title">
      <p>
        <button type="button" className="link" onClick={onLeave}>
          {safe(`← ${backTo}`, "← Back", "←")}
        </button>
      </p>
      <p className="eyebrow">
        <span aria-hidden="true">🐝 </span>
        {safe(`${title}${leveled && level !== undefined ? ` · Level ${level}: ${LEVEL_NAMES[level]}` : ""}`, `${title}${leveled && level !== undefined ? ` · Level ${level}` : ""}`, leveled && level !== undefined ? `Level ${level}` : "", "")}
      </p>
      {counts && (
        <div className="bee-progress" aria-label={safe("This session", "Progress", "…")}>
          <span>{safe(`Word ${Math.min(position, counts.total)} of ${counts.total}`, `${Math.min(position, counts.total)} / ${counts.total}`)}</span>
          <span className="bee-score">
            <span aria-label={safe("right", "correct", "✓")}>✓ {counts.right}</span> <span aria-label={safe("not yet", "missed", "✗")}>✗ {counts.wrong}</span>
          </span>
          <div className="bar" aria-hidden="true">
            <i style={{ width: `${Math.round((100 * (counts.right + counts.wrong)) / Math.max(1, counts.total))}%` }} />
          </div>
        </div>
      )}
      {problem && (
        <p className="warning" role="alert">
          {problem}
        </p>
      )}

      {result ? (
        <Feedback result={result} last={!cur} onNext={next} />
      ) : cur?.word ? (
        <>
          <BeeAsk
            key={`${cur.session}:${cur.position}`}
            word={cur.word}
            next={(() => {
              const o = st.open;
              const id = o ? o.event.words[o.answers.length + 1] : undefined;
              return id ? words.find((w) => w.id === id) : undefined;
            })()}
            voice={voice}
            autoplay={!speechOff}
            speechOff={speechOff}
            onTurnSpeechOn={onTurnSpeechOn}
            busy={busy}
            safe={safe}
            onPlay={() => (plays.current += 1)}
            onSubmit={(typed) => {
              stopWord();
              void submit(typed);
            }}
          />
        </>
      ) : done ? (
        <Summary learner={learner} sessionId={done.event.session} source={source} onAgain={begin} onLeave={onLeave} busy={busy} backTo={backTo} />
      ) : (
        <h1 id="bee-title" className="hero">
          Getting your words ready…
        </h1>
      )}
      {!result && cur?.word && leveled && safe(`${sourceProgress(st, words, learner.clock()).practised} of ${words.length} words practised. Practice levels show how the practice is going; they are not a test result.`, "") && (
        <p className="small bee-note">{safe(`${sourceProgress(st, words, learner.clock()).practised} of ${words.length} words practised. Practice levels show how the practice is going; they are not a test result.`, "")}</p>
      )}
    </main>
  );
}

type Status = "loading" | "playing" | "ready" | "tap" | "failed";

/**
 * Asking one word: the big speaker button, "Hear it in a sentence", the answer box and Submit. The word plays by itself
 * when it appears (unless hearing words is switched off). The first time it is the word, its sentence and the word
 * again; the speaker then plays the word alone, as often as wanted. If the browser wants a tap first, the speaker
 * asks for one; if nothing can be heard at all, a grown-up can be shown the word, as a last resort only.
 */
function BeeAsk({ word, next, voice, autoplay, speechOff, onTurnSpeechOn, busy, safe, onPlay, onSubmit }: { word: SpellWord; next?: SpellWord; voice: SpeechSynthesisVoice | null; autoplay: boolean; speechOff: boolean; onTurnSpeechOn: () => Promise<void>; busy: boolean; safe: (...options: string[]) => string; onPlay: () => void; onSubmit: (typed: string) => void }) {
  const [status, setStatus] = useState<Status>(autoplay ? "loading" : "ready");
  const [heardOnce, setHeardOnce] = useState(false);
  const [failures, setFailures] = useState(0);
  const [adult, setAdult] = useState(false);
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const full = word.sentence ? `${word.word}. ${word.sentence} ${word.word}.` : `${word.word}.`;
  const play = async (kind: "full" | "word") => {
    setStatus("loading");
    const r: PlayOutcome = await playWord({ url: word.audio?.[kind], text: kind === "full" ? full : `${word.word}.` }, voice);
    if (r === "played") {
      onPlay();
      setHeardOnce(true);
      setStatus("playing");
      prefetch(next?.audio?.full);
    } else if (r === "blocked") setStatus("tap");
    else {
      setFailures((n) => n + 1);
      setStatus("failed");
    }
  };
  // light the speaker while sound is playing; back to ready when it ends
  useEffect(() => onPlaying((on) => setStatus((s) => (on ? "playing" : s === "playing" ? "ready" : s))), []);
  useEffect(() => {
    if (autoplay) void play("full");
    input.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const speaker = () => void play(heardOnce ? "word" : "full");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim() && !busy) onSubmit(text);
  };
  const label = status === "tap" ? safe("Tap to hear the word", "Tap to hear it", "Tap 🔊") : status === "failed" ? safe("Tap to try again", "Try again", "↻") : status === "loading" ? safe("Getting the word…", "One moment…", "…") : heardOnce ? safe("Hear it again", "Again", "🔁") : safe("Hear the word", "Listen", "🔊");
  return (
    <section className="bee-ask" aria-labelledby="bee-title">
      <h1 id="bee-title" className="hero">
        {safe("Listen, then type the word.", "Type what you hear.", "Spell it.", "🔊 ⌨️")}
      </h1>
      {speechOff && (
        <p className="small bee-quiet">
          {safe("Sound is switched off.", "Sound off.", "🔇")}{" "}
          <button type="button" className="link" onClick={() => void onTurnSpeechOn()}>
            {safe("Switch it on", "Turn on", "🔊")}
          </button>
        </p>
      )}
      <div className="bee-listen">
        <button type="button" className={`bee-speaker s-${status}`} onClick={speaker} aria-label={label} data-status={status}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <span className="bee-speaker-label" aria-hidden="true">
          {label}
        </span>
        {word.sentence && heardOnce && (
          <button type="button" className="link bee-sentence" onClick={() => void play("full")}>
            {safe("Hear it in a sentence", "In a sentence", "💬")}
          </button>
        )}
      </div>
      {failures >= 2 && !adult && (
        <p className="small">
          <button type="button" className="link" onClick={() => setAdult(true)}>
            {safe("Still can't hear it? A grown-up can read it to you", "Ask a grown-up to read it", "👤")}
          </button>
        </p>
      )}
      {adult && <AdultReader word={word} safe={safe} onDone={() => setAdult(false)} />}
      <form className="answer bee-answer" onSubmit={submit}>
        <label className="ruled">
          <span className="sr-only">{safe("Type the word", "Your answer", "✎")}</span>
          <input ref={input} value={text} onChange={(e) => setText(e.target.value)} disabled={busy} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go" inputMode="text" name="spelling-answer" placeholder={safe("Type it here", "Type here", "✎")} />
        </label>
        <button type="submit" className="primary" disabled={busy || !text.trim()}>
          {safe("Submit", "Check", "Done", "✓")}
        </button>
      </form>
    </section>
  );
}

/** The last resort when nothing can be heard: the word for a grown-up to read aloud, hidden again before the child types. */
function AdultReader({ word, safe, onDone }: { word: SpellWord; safe: (...options: string[]) => string; onDone: () => void }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="tile peach adult-reader">
      {!shown ? (
        <>
          <p>{safe("For the grown-up: read the word aloud, then the sentence, then the word again. Keep the screen away from the child while the word is shown.", "Grown-up: read it aloud, then hide it.", "👤")}</p>
          <button type="button" className="secondary" onClick={() => setShown(true)}>
            {safe("Show the word to read aloud", "Show it", "👁")}
          </button>
        </>
      ) : (
        <>
          <p className="adult-word">
            Say: <b>{word.word}</b>
            {word.say && <span className="small"> ({word.say})</span>}
          </p>
          {word.sentence && <p>Sentence: “{word.sentence}”</p>}
          <button type="button" className="primary" onClick={onDone}>
            Hide it: the child types now
          </button>
        </>
      )}
    </div>
  );
}

function Feedback({ result, last, onNext }: { result: Result; last: boolean; onNext: () => void }) {
  return (
    <section className={`feedback bee-feedback ${result.correct ? "right" : "wrong"}`} role="status" aria-live="polite" aria-labelledby="bee-title">
      <h1 id="bee-title" className="verdict">
        <span aria-hidden="true">{result.correct ? "🌟 " : "💡 "}</span>
        {result.correct ? "Right!" : "Not quite."}
      </h1>
      <p>
        {result.correct ? "You spelt " : "The spelling is "}
        <strong className="written">{result.word.word}</strong>.
      </p>
      {!result.correct && (
        <>
          <p>
            You wrote <span className="written typed-was">{result.typed.trim() || "nothing"}</span>.
          </p>
          <p className="small">It goes on your review list and comes back in your next session.</p>
        </>
      )}
      <button type="button" className="primary" onClick={onNext} autoFocus>
        {last ? "See how you did" : "Next word"}
      </button>
    </section>
  );
}

function Summary({ learner, sessionId, source, onAgain, onLeave, busy, backTo }: { learner: Learner; sessionId: string; source: SpellSource; onAgain: () => void; onLeave: () => void; busy: boolean; backTo: string }) {
  const st = learner.spelling();
  const s = st.sessions.get(sessionId)!;
  const words = learner.spellingWords(source);
  const p = sourceProgress(st, words, learner.clock());
  const right = s.answers.filter((a) => a.correct).length;
  const n = s.answers.length;
  const before = s.event.level;
  const now = levelOf(st, source);
  return (
    <section className="tile bee-done" aria-labelledby="bee-title">
      <h1 id="bee-title" className="hero">
        Session complete
      </h1>
      <p className="big">
        {right} of {n} right{n ? ` (${Math.round((100 * right) / n)}%)` : ""}
      </p>
      {before !== undefined && now !== before && <p>{now > before ? `Well done: you move up to level ${now}, ${LEVEL_NAMES[now]}.` : `Next time: level ${now}, ${LEVEL_NAMES[now]}, for some practice.`}</p>}
      <ul className="bee-facts">
        <li>
          {p.practised} of {p.total} words practised
        </li>
        <li>{p.reviewList ? `${p.reviewList} word${p.reviewList === 1 ? "" : "s"} on your review list` : "Nothing on your review list"}</li>
        {p.level !== undefined && <li>Practice level: {p.level} of 5</li>}
      </ul>
      <button type="button" className="primary" onClick={onAgain} disabled={busy}>
        Another {Math.min(10, p.total)} words
      </button>
      <button type="button" className="secondary" onClick={onLeave}>
        {backTo === "Home" ? "Back to home" : `Back to ${backTo}`}
      </button>
    </section>
  );
}

/** The Spelling Bee on Progress: practice level, words practised, and how each level is going (counts, not grades). */
export function SpellingProgress({ learner }: { learner: Learner }) {
  const words = learner.spellingWords();
  if (!words.length) return null;
  const st = learner.spelling();
  const p = sourceProgress(st, words, learner.clock());
  if (!p.practised) return null;
  return (
    <section className="tile bee-progress-card" aria-labelledby="bee-progress-title">
      <h2 id="bee-progress-title">
        <span aria-hidden="true">🐝 </span>Spelling Bee
      </h2>
      <p>
        Practice level {p.level}: {LEVEL_NAMES[p.level ?? 1]} · {p.practised} of {p.total} words practised · {p.rightFirstTime} right the first time · {p.reviewList} on the review list{p.dueNow ? ` (${p.dueNow} due now)` : ""}
      </p>
      <table className="bee-levels">
        <thead>
          <tr>
            <th scope="col">Level</th>
            <th scope="col">Practised</th>
            <th scope="col">Right</th>
          </tr>
        </thead>
        <tbody>
          {p.byLevel.map((l) => (
            <tr key={l.level}>
              <td>
                {l.level}. {LEVEL_NAMES[l.level]}
              </td>
              <td>
                {l.practised} of {l.words}
              </td>
              <td>{l.answers ? `${l.right} of ${l.answers} (${Math.round((100 * l.right) / l.answers)}%)` : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small">Counts of answers, not a test: a practice level moves up after 4 of 5 right at that level, and down after 3 wrong. Spelling Bee practice does not change the levels in General English.</p>
    </section>
  );
}
