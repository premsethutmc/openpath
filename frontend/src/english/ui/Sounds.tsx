/**
 * Sounds that are easy to mix up (logic/sounds): the phone says one word of a pair (vest or west); the child taps
 * the one they heard; then hears both and says them, with a tip on how to make each sound. Eight rounds a sitting.
 */
import { useEffect, useRef, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { ROUNDS, SOUNDS, nextGroup, roundsFor, soundSummary, type SoundRound } from "../logic/sounds/sounds.ts";
import { detectSpeech, speak, speechPossible, type SpeechState } from "./speech.ts";

export function Sounds({ learner, onLeave, onChanged }: { learner: Learner; onLeave: () => void; onChanged: () => void }) {
  const [speech, setSpeech] = useState<SpeechState | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [rounds, setRounds] = useState<SoundRound[]>([]);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [failed, setFailed] = useState(false);
  const saved = useRef(false);
  useEffect(() => {
    let live = true;
    detectSpeech().then((s) => live && setSpeech(s));
    return () => {
      live = false;
    };
  }, []);
  const say = (w: string) => speech?.voice && speak(w, speech.voice);
  const g = SOUNDS.groups.find((x) => x.id === group);
  const r = rounds[at];
  const done = !!g && at >= rounds.length;

  useEffect(() => {
    if (r && picked === null) say(r.said);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, group]);
  useEffect(() => {
    if (!done || !g || saved.current) return;
    saved.current = true;
    learner
      .recordSounds({ type: "sitting", group: g.id, right, asked: rounds.length })
      .then(onChanged, () => setFailed(true));
  }, [done, g, right, rounds.length, learner, onChanged]);

  const start = (id: string) => {
    saved.current = false;
    setGroup(id);
    setRounds(roundsFor(SOUNDS.groups.find((x) => x.id === id)!, Date.now() % 100000));
    setAt(0);
    setRight(0);
    setPicked(null);
  };

  if (!speechPossible() || (speech && !speech.available))
    return (
      <main className="page vocab sounds" data-phase="no-speech">
        <button type="button" className="link" onClick={onLeave}>
          ← Back
        </button>
        <h1 className="hero">Sounds that are easy to mix up</h1>
        <p>This phone cannot say words aloud here, so this activity is not available on it.</p>
      </main>
    );

  if (!g) {
    const sum = soundSummary(learner.soundRecords());
    const suggest = nextGroup(learner.soundRecords());
    return (
      <main className="page vocab sounds" data-phase="intro" aria-labelledby="sounds-title">
        <button type="button" className="link" onClick={onLeave}>
          ← Back
        </button>
        <p className="eyebrow">Listening · Sounds</p>
        <h1 id="sounds-title" className="hero">
          Sounds that are easy to mix up
        </h1>
        <p className="sub">The phone says one word. Tap the word you heard. Then say both words yourself.</p>
        <ul className="sound-groups">
          {sum.map((s) => (
            <li key={s.id}>
              <button type="button" className={s.id === suggest ? "primary" : "secondary"} data-group={s.id} onClick={() => start(s.id)}>
                {s.name}
              </button>
              <span className="small">{s.sittings ? `${s.right} of ${s.asked} right last time${s.sure ? " · sure" : ""}` : "not tried yet"}</span>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  if (done)
    return (
      <main className="page vocab sounds" data-phase="done">
        <h1 className="hero">
          {right} of {rounds.length} heard right
        </h1>
        <p className="sub">{right >= rounds.length - 1 ? `You can hear ${g.name} apart. Keep saying them aloud.` : `Hearing ${g.name} apart takes practice. Try this pair again another day.`}</p>
        {failed && (
          <p className="warning" role="alert">
            This could not be saved. Check the connection and try again.
          </p>
        )}
        <p className="choose-options">
          <button type="button" className="secondary" onClick={() => start(g.id)}>
            Again
          </button>
          <button type="button" className="primary" onClick={() => setGroup(null)}>
            Done
          </button>
        </p>
      </main>
    );

  const answered = picked !== null;
  return (
    <main className="page vocab sounds" data-phase={answered ? "answered" : "ask"} data-round={at}>
      <button type="button" className="link" onClick={() => setGroup(null)}>
        ← Stop
      </button>
      <p className="pill">
        {g.name} · {at + 1} of {ROUNDS}
      </p>
      <p className="prompt">Which word did you hear?</p>
      <button type="button" className="secondary" onClick={() => say(r.said)}>
        🔊 Hear it again
      </button>
      <p className="choose-options sound-choices">
        {r.pair.map((w) => (
          <button
            key={w}
            type="button"
            className="choice big"
            data-word={w}
            disabled={answered}
            data-state={answered ? (w === r.said ? "right" : w === picked ? "wrong" : "") : ""}
            onClick={() => {
              setPicked(w);
              if (w === r.said) setRight((n) => n + 1);
            }}
          >
            {w}
          </button>
        ))}
      </p>
      {answered && (
        <div className="dict-feedback" role="status">
          <p className={picked === r.said ? "words-verdict right" : "words-verdict"}>{picked === r.said ? "✓ Right" : `It was "${r.said}"`}</p>
          <p className="small">{g.tip}</p>
          <p className="choose-options">
            {r.pair.map((w) => (
              <button key={w} type="button" className="secondary" onClick={() => say(w)}>
                🔊 {w}
              </button>
            ))}
          </p>
          <p className="small">Now say both words aloud: {r.pair.join(", ")}.</p>
          <button
            type="button"
            className="primary"
            autoFocus
            onClick={() => {
              setPicked(null);
              setAt(at + 1);
            }}
          >
            {at + 1 < rounds.length ? "Next word" : "Finish"}
          </button>
        </div>
      )}
    </main>
  );
}
