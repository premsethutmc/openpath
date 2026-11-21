/**
 * New words (logic/vocabulary/daily-words.ts): up to five new words a day, each with its meaning and a sentence, then
 * questions; words learnt on earlier days come back first. Practice-only: it changes no capability estimate.
 */
import { Flag } from "./Flag.tsx";
import { useRef, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { NEW_PER_DAY, WORDS, WordSitting, baseBand, summary, type Card, type SittingView, type Summary, type WordRecord } from "../logic/vocabulary/daily-words.ts";
import { latestResult } from "../logic/vocabulary/size-check.ts";
import { syncAutoLists } from "../logic/streams/joined.ts";
import { NoteBox } from "./Note.tsx";
import { playWord } from "./wordPlayer.ts";

const KIND = { n: "a naming word (noun)", v: "a doing word (verb)", adj: "a describing word (adjective)" };

function Sentence({ card }: { card: Card }) {
  const at = card.sentence.toLowerCase().search(new RegExp(`\\b${card.word}\\b`));
  if (at < 0) return <>{card.sentence}</>;
  return (
    <>
      {card.sentence.slice(0, at)}
      <strong>{card.sentence.slice(at, at + card.word.length)}</strong>
      {card.sentence.slice(at + card.word.length)}
    </>
  );
}

function WordCard({ card, onSay }: { card: Card; onSay: (text: string) => void }) {
  return (
    <div className="word-card">
      <p className="prompt vocab-word" id="new-word">
        {card.word}{" "}
        <button type="button" className="link word-say" aria-label={`Hear the word ${card.word}`} onClick={() => onSay(`${card.word}.`)}>
          🔊
        </button>
      </p>
      <p className="small word-kind">{KIND[card.pos]}</p>
      <p className="word-meaning">{card.meaning}</p>
      <p className="word-sentence">
        <Sentence card={card} />
      </p>
    </div>
  );
}

export function NewWordsIntro({ s, onStart, onBack }: { s: Summary; onStart: (extra: boolean) => void; onBack: () => void }) {
  const todayDone = s.newToday >= NEW_PER_DAY && s.dueNow === 0;
  return (
    <main className="page vocab words" data-phase="intro" aria-labelledby="words-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">Words</p>
      <h1 id="words-title" className="hero">
        {todayDone ? "Today's words are done" : "Five new words a day"}
      </h1>
      <p className="sub">
        {todayDone
          ? "Come back tomorrow: your words will return then, so they stay with you."
          : "Meet each word with its meaning and a sentence, then answer a few questions. Words you met before come back first."}
      </p>
      {s.learning + s.learnt > 0 && (
        <p className="pill">
          {s.learnt} learnt · {s.learning} still learning{s.dueNow ? ` · ${s.dueNow} to see again now` : ""}
        </p>
      )}
      <button type="button" className={todayDone ? "secondary" : "primary"} onClick={() => onStart(todayDone)}>
        {todayDone ? "Learn five more" : s.dueNow && s.newToday >= NEW_PER_DAY ? "See my words again" : "Start"}
      </button>
    </main>
  );
}

export function NewWordsView({ view, onMet, onKnow, onAnswer, onNext, onLeave, onSay }: { view: SittingView; onMet: () => void; onKnow: () => void; onAnswer: (i: number) => void; onNext: () => void; onLeave: () => void; onSay: (text: string) => void }) {
  const stop = (
    <button type="button" className="link" onClick={onLeave}>
      ← Stop
    </button>
  );
  const bar = view.steps > 0 && <progress className="words-bar" max={view.steps} value={view.step} aria-label={`Step ${view.step + 1} of ${view.steps}`} />;
  if (view.phase === "meet" && view.card)
    return (
      <main className="page vocab words" data-phase="meet" data-word={view.card.word}>
        {stop}
        {bar}
        <p className="pill">New word</p>
        <WordCard card={view.card} onSay={onSay} />
        <button type="button" className="primary" onClick={onMet}>
          Got it
        </button>
        <button type="button" className="secondary words-know" onClick={onKnow}>
          I know this word already
        </button>
      </main>
    );
  if (view.phase === "ask" && view.question) {
    const q = view.question;
    return (
      <main className="page vocab words" data-phase="ask" data-kind={q.kind} data-step={view.step}>
        {stop}
        {bar}
        <p className="small">{q.kind === "meaning" ? "Which meaning fits?" : "Which word fits the gap?"}</p>
        <p className={q.kind === "meaning" ? "prompt vocab-word" : "prompt word-gap"} id="words-prompt">
          {q.prompt}
        </p>
        <div className="options" role="group" aria-labelledby="words-prompt">
          {q.options.map((o, i) => (
            <button key={`${view.step}:${i}`} type="button" className="option" onClick={() => onAnswer(i)}>
              {o}
            </button>
          ))}
        </div>
      </main>
    );
  }
  if (view.phase === "feedback" && view.feedback) {
    const f = view.feedback;
    return (
      <main className="page vocab words" data-phase="feedback" data-correct={f.correct}>
        {stop}
        {bar}
        <p className={f.correct ? "words-verdict right" : "words-verdict"} role="status">
          {f.correct ? "✓ Right" : "Not quite"}
        </p>
        {!f.correct && (
          <p className="small">
            You chose “{f.chosen}”. The answer is “{f.right}”. This one will come back in a moment.
          </p>
        )}
        <WordCard card={f.card} onSay={onSay} />
        <Flag stream="words" id={f.card.word} />
        <button type="button" className="primary" autoFocus onClick={onNext}>
          Next
        </button>
      </main>
    );
  }
  const d = view.done!;
  const nothing = !d.newWords.length && !d.reviewed;
  return (
    <main className="page vocab words" data-phase="done">
      <p className="eyebrow">Words</p>
      <h1 className="hero">{nothing ? "Nothing to do right now" : "Well done"}</h1>
      {d.newWords.length > 0 && (
        <p className="sub">
          New today: <strong>{d.newWords.join(", ")}</strong>
        </p>
      )}
      {d.reviewed > 0 && <p className="small">{d.reviewed === 1 ? "1 word came back from before." : `${d.reviewed} words came back from before.`}</p>}
      {d.missed.length > 0 && (
        <p className="small">
          To see again tomorrow: <strong>{d.missed.join(", ")}</strong>
        </p>
      )}
      {!nothing && <p className="small">Your words come back tomorrow, then after a few days, then after a week. After that they count as learnt.</p>}
      <button type="button" className="primary" onClick={onLeave}>
        Done
      </button>
    </main>
  );
}

export function NewWords({ learner, voice, onLeave, onChanged }: { learner: Learner; voice: SpeechSynthesisVoice | null; onLeave: () => void; onChanged: () => void }) {
  const [sitting, setSitting] = useState<WordSitting | null>(null);
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<WordRecord[]>([]);
  /** Store each step before the screen moves on; anything that could not be saved goes first next time. */
  const step = async (s: WordSitting, act?: () => void) => {
    act?.();
    unsaved.current.push(...s.take());
    setTick((t) => t + 1);
    try {
      while (unsaved.current.length) {
        await learner.recordWordLearn([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);
      // words remembered after their first day join the spelling list "Spell my new words"
      if (s.snapshot().phase === "done") await syncAutoLists(learner);
    } catch {
      setFailed(true);
    }
    onChanged();
  };
  const say = (text: string) => void playWord(text, voice);
  if (!sitting)
    return (
      <NewWordsIntro
        s={summary(learner.wordLearnRecords(), learner.clock(), learner.dayFn())}
        onBack={onLeave}
        onStart={(extra) => {
          const base = baseBand(latestResult(learner.vocabRecords())?.band, learner.state.preferences?.band) /* the level check's words part writes a word check result, so it is included */;
          const s = new WordSitting(WORDS, base, learner.wordLearnRecords(), learner.clock(), { dayOf: learner.dayFn(), extra });
          setSitting(s);
          void step(s);
        }}
      />
    );
  const view = sitting.snapshot();
  return (
    <>
      {failed && (
        <p className="warning" role="alert">
          This step could not be saved. Check the connection; your next answer will try again.
        </p>
      )}
      <NewWordsView view={view} onSay={say} onLeave={onLeave} onMet={() => void step(sitting, () => sitting.met())} onKnow={() => void step(sitting, () => sitting.knowIt())} onAnswer={(i) => void step(sitting, () => sitting.answer(i))} onNext={() => void step(sitting, () => sitting.next())} />
      {view.phase === "done" && (
        <div className="page vocab-note">
          <NoteBox learner={learner} screen="new-words:done" label="Was any word, meaning or sentence confusing or too easy?" />
        </div>
      )}
    </>
  );
}
