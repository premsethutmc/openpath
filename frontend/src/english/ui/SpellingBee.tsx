/**
 * The Spelling Bee: hear a word, type it, see whether it is right, go on. No placement, account or upload is needed.
 * One screen for every spelling source (logic/spelling.ts); the word's spelling is never in the page before the answer
 * is submitted (it is only spoken, or shown to an adult who asks for it when the device cannot speak).
 */
import { useEffect, useRef, useState } from "react";
import type { SpellSource } from "../logic/events.ts";
import type { Learner } from "../logic/learner.ts";
import { BANK, LEVEL_NAMES, type SpellWord, avoiding, levelOf, sourceKey, sourceProgress } from "../logic/spelling.ts";
import { Dictation } from "./ItemView.tsx";

type Result = { correct: boolean; word: SpellWord; typed: string };

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
  const delivery = voice ? "device_voice" : "adult_reader";

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
    plays.current = 0;
    setResult(null);
  };

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
        <section className="bee-ask" aria-labelledby="bee-title">
          <h1 id="bee-title" className="hero">
            {safe("Listen, then type the word you hear.", "Type what you hear.", "Spell it.", "🔊 ⌨️")}
          </h1>
          {!voice && (
            <div className="tile peach" role="note">
              {speechOff ? (
                <>
                  <p>{safe("Hearing words is switched off.", "Speech is off.", "🔇")}</p>
                  <button type="button" className="secondary" onClick={() => void onTurnSpeechOn()}>
                    {safe("Switch hearing words on", "Turn speech on", "🔊")}
                  </button>
                </>
              ) : (
                <p>{safe("This device can't say words aloud. An adult can read each word to you.", "An adult reads this one aloud.", "🔊 ✋")}</p>
              )}
            </div>
          )}
          <Dictation
            key={`${cur.session}:${cur.position}`}
            word={cur.word.word}
            sentence={cur.word.sentence}
            say={cur.word.say}
            voice={voice}
            delivery={delivery}
            locked={busy}
            labels={{
              play: safe("Play the word", "Play", "▶"),
              repeat: safe("Repeat the word", "Replay", "Again", "🔁"),
              sentence: safe("Hear it in a sentence", "In a sentence", "Example", "💬"),
              submit: safe("Submit", "Check", "Done", "✓"),
              answer: safe("Your answer", "Answer", "Spelling", "✎"),
              adultLead: safe("For the adult:", "Adult:", "👤"),
              adult: safe("read the word aloud, then the sentence, then the word again. Keep the screen away from the learner while it is shown.", "Read it aloud, then hide it.", "Read aloud.", "🔊"),
              show: safe("Show the word to read aloud", "Show it to read aloud", "Show", "👁"),
            }}
            onPlay={() => (plays.current += 1)}
            onSubmit={(r) => r.kind === "typed" && void submit(r.text)}
          />
        </section>
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
