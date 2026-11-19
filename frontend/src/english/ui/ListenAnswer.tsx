/**
 * Listen and answer (logic/listening): the device reads a short passage aloud, sentence by sentence, and the learner
 * answers four questions. The passage is shown only after the last answer. Practice-only.
 */
import { useEffect, useRef, useState } from "react";
import { LISTENING, ListenSitting, levelFor, listenSummary, startLevel, type ListenRecord, type ListenView } from "../logic/listening/passages.ts";
import type { Learner } from "../logic/learner.ts";
import { NoteBox } from "./Note.tsx";
import { speechPossible } from "./speech.ts";
import { playWord, stopWord } from "./wordPlayer.ts";

const levelName = (id: number) => LISTENING.levels.find((l) => l.id === id)?.name ?? "";
type Sound = "idle" | "playing" | "failed";

export function ListenAnswerView({ view, sound, heardOnce, onPlay, onStopSound, onReady, onAnswer, onLeave, onAgain }: { view: ListenView; sound: Sound; heardOnce: boolean; onPlay: () => void; onStopSound: () => void; onReady: () => void; onAnswer: (i: number) => void; onLeave: () => void; onAgain: () => void }) {
  const player = (
    <>
      <div className="dict-play">
        <button type="button" className="primary" onClick={onPlay} disabled={sound === "playing"}>
          {sound === "playing" ? "🔊 Reading aloud…" : heardOnce ? "🔊 Hear it again" : "🔊 Hear the passage"}
        </button>
        <button type="button" className="secondary" onClick={onStopSound} disabled={sound !== "playing"}>
          Stop
        </button>
      </div>
      {sound === "failed" && (
        <p className="warning" role="alert">
          The passage could not be read aloud. Check that the phone's sound is on, then tap again.
        </p>
      )}
    </>
  );
  if (view.phase === "listen")
    return (
      <main className="page vocab listen-answer" data-phase="listen" data-passage={view.passage}>
        <button type="button" className="link" onClick={onLeave}>
          ← Stop
        </button>
        <p className="pill">
          Level {view.level}: {levelName(view.level)}
        </p>
        <p className="sub">Listen to the whole passage. You will not see the words. Then answer four questions; you can listen again at any time.</p>
        {player}
        <button type="button" className="secondary" disabled={!heardOnce} onClick={onReady}>
          I am ready for the questions
        </button>
      </main>
    );
  if (view.phase === "ask" && view.question)
    return (
      <main className="page vocab listen-answer" data-phase="ask" data-passage={view.passage} data-question={view.index}>
        <button type="button" className="link" onClick={onLeave}>
          ← Stop
        </button>
        <p className="pill">
          Question {view.index + 1} of {view.total}
        </p>
        <p className="prompt" id="listen-question">
          {view.question.prompt}
        </p>
        <div className="options" role="group" aria-labelledby="listen-question">
          {view.question.options.map((o, i) => (
            <button key={`${view.index}:${i}`} type="button" className="option" onClick={() => onAnswer(i)}>
              {o}
            </button>
          ))}
        </div>
        {player}
      </main>
    );
  const d = view.done!;
  return (
    <main className="page vocab listen-answer" data-phase="done" data-passage={view.passage}>
      <p className="eyebrow">Listen and answer</p>
      <h1 className="hero">
        {d.right} of {view.total} right
      </h1>
      <p className="small">
        {d.nextLevel > view.level ? `Next time: level ${d.nextLevel}, ${levelName(d.nextLevel).toLowerCase()}.` : d.nextLevel < view.level ? `Next time: level ${d.nextLevel}, ${levelName(d.nextLevel).toLowerCase()}, to build up again.` : "Next time: another passage at this level."}
      </p>
      <ul className="listen-review">
        {d.review.map((r, i) => (
          <li key={i} data-correct={r.correct}>
            <p>
              <b>{r.correct ? "✓" : "✗"}</b> {r.prompt}
            </p>
            {!r.correct && <p className="small">You chose: {r.chosen}</p>}
            <p className="small">
              <b>{r.right}.</b> {r.explain}
            </p>
          </li>
        ))}
      </ul>
      <section className="tile reading-passage listen-text" aria-label="What you heard">
        <h2>{d.title}</h2>
        <p>{d.text}</p>
      </section>
      <button type="button" className="primary" onClick={onLeave}>
        Done
      </button>
      <button type="button" className="secondary" onClick={onAgain}>
        Another passage
      </button>
    </main>
  );
}

export function ListenAnswer({ learner, voice, onLeave, onChanged }: { learner: Learner; voice: SpeechSynthesisVoice | null; onLeave: () => void; onChanged: () => void }) {
  const [sitting, setSitting] = useState<ListenSitting | null>(null);
  const [, setTick] = useState(0);
  const [sound, setSound] = useState<Sound>("idle");
  const [heardOnce, setHeardOnce] = useState(false);
  const [failed, setFailed] = useState(false);
  const run = useRef(0);
  const unsaved = useRef<ListenRecord[]>([]);
  const level = () => levelFor(LISTENING, learner.listenRecords(), learner.levels().listening?.level ?? startLevel(learner.state.preferences?.band));
  const quiet = () => {
    run.current++;
    stopWord();
    setSound("idle");
  };
  useEffect(() => () => (run.current++, stopWord()), []);
  /** Read the passage one sentence at a time; a newer tap or Stop ends this reading. */
  const play = async (s: ListenSitting) => {
    const mine = ++run.current;
    stopWord();
    s.played();
    setHeardOnce(true);
    setSound("playing");
    for (const line of s.spoken()) {
      const r = await playWord(line, voice);
      if (run.current !== mine) return;
      if (r !== "played") return setSound("failed");
    }
    setSound("idle");
  };
  const save = async (s: ListenSitting) => {
    unsaved.current.push(...s.take());
    setTick((t) => t + 1);
    try {
      while (unsaved.current.length) {
        await learner.recordListen([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    onChanged();
  };
  const begin = () => {
    const s = new ListenSitting(LISTENING, level(), learner.listenRecords());
    setSitting(s);
    setHeardOnce(false);
    scrollTo(0, 0);
    void play(s); // started by the tap on Start
  };
  const leave = () => {
    quiet();
    onLeave();
  };
  if (!sitting) {
    const sum = listenSummary(learner.listenRecords());
    return (
      <main className="page vocab listen-answer" data-phase="intro" aria-labelledby="listen-title">
        <button type="button" className="link" onClick={leave}>
          ← Back
        </button>
        <p className="eyebrow">Listen and answer</p>
        <h1 id="listen-title" className="hero">
          Hear a passage, then answer
        </h1>
        <p className="sub">The phone reads a short passage aloud. You will not see the words. Then come four questions, and at the end you can read what you heard.</p>
        <p className="pill">
          Level {level()}: {levelName(level())}
        </p>
        {sum.passages > 0 && (
          <p className="small">
            So far: {sum.right} of {sum.asked} questions right, over {sum.passages} {sum.passages === 1 ? "passage" : "passages"}.
          </p>
        )}
        {speechPossible() ? (
          <button type="button" className="primary" onClick={begin}>
            Start
          </button>
        ) : (
          <p className="warning">This browser cannot read aloud, so Listen and answer is not available here.</p>
        )}
      </main>
    );
  }
  const view = sitting.snapshot();
  return (
    <>
      {failed && (
        <p className="warning" role="alert">
          The result could not be saved. Check the connection; it will be tried again.
        </p>
      )}
      <ListenAnswerView
        view={view}
        sound={sound}
        heardOnce={heardOnce}
        onLeave={leave}
        onAgain={begin}
        onPlay={() => void play(sitting)}
        onStopSound={quiet}
        onReady={() => {
          quiet();
          sitting.ready();
          scrollTo(0, 0);
          setTick((t) => t + 1);
        }}
        onAnswer={(i) => {
          sitting.answer(i);
          if (sitting.snapshot().phase === "done") quiet(), scrollTo(0, 0);
          void save(sitting);
        }}
      />
      {view.phase === "done" && (
        <div className="page vocab-note">
          <NoteBox learner={learner} screen="listen-answer:done" label="Was the passage clear to hear? Was any question unfair?" />
        </div>
      )}
    </>
  );
}
