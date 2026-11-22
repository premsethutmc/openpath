import { useRef, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { CHECK, ROUNDS, ROUND_SIZE, SizeCheckSession, latestResult, startBand, type CheckView, type SizeCheck, type VocabRecord } from "../logic/vocabulary/size-check.ts";
import { NoteBox } from "./Note.tsx";

export function VocabularyIntro({ last, onStart, onBack }: { last: { correct?: number; answered: number } | null; onStart: () => void; onBack: () => void }) {
  return (
    <main className="page vocab" data-phase="intro" aria-labelledby="vocab-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">Words · Word check</p>
      <h1 id="vocab-title" className="hero">
        Check your word meanings
      </h1>
      <p className="sub">You will see a word and three meanings. Pick the meaning that fits. If you do not know the word, say so. This checks recognition, not whether you can use a word.</p>
      <p className="small">Up to {ROUND_SIZE * ROUNDS} words. It takes three to five minutes.</p>
      {last?.correct !== undefined && (
        <p className="pill">
          Last time: {last.correct} of {last.answered} correct
        </p>
      )}
      <button type="button" className="primary" onClick={onStart}>
        {last ? "Check again" : "Start"}
      </button>
    </main>
  );
}

export function VocabularyView({ check, view, onAnswer, onLeave }: { check: SizeCheck; view: CheckView; onAnswer: (choice: number | null) => void; onLeave: () => void }) {
  if (view.phase === "asking" && view.word)
    return (
      <main className="page vocab" data-phase="asking">
        <button type="button" className="link" onClick={onLeave}>
          ← Stop
        </button>
        <p className="pill">
          Word {view.round * ROUND_SIZE + view.position + 1}
        </p>
        <p className="small">Which meaning fits?</p>
        <p className="prompt vocab-word" id="vocab-word">
          {view.word.word}
        </p>
        <div className="options" role="group" aria-labelledby="vocab-word">
          {view.word.options.map((o, i) => (
            <button key={`${view.word!.word}:${i}`} type="button" className="option" onClick={() => onAnswer(i)}>
              {o}
            </button>
          ))}
          <button type="button" className="option vocab-unknown" onClick={() => onAnswer(null)}>
            I don't know this word
          </button>
        </div>
      </main>
    );
  const r = view.result!;
  return (
    <main className="page vocab" data-phase="done">
      <p className="eyebrow">Words · Word check</p>
      <h1 className="hero">{r.correct} of {r.answered} meanings correct</h1>
      <p className="sub">{r.band === 0 ? "Not enough evidence to suggest a higher practice level yet." : `Suggested practice: Level ${Math.min(check.bands.length, r.band + 1)} of ${check.bands.length}.`}</p>
      <p className="small">These are answers to a short recognition check. They do not measure how many words you know or can use.</p>
      <ul className="vocab-bands">
        {r.perBand.map((b) => (
          <li key={b.band}>
            <span>{check.bands.find((x) => x.id === b.band)!.label}</span>
            <span className="status">
              {b.correct} of {b.asked} correct
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="primary" onClick={onLeave}>
        Done
      </button>
    </main>
  );
}

export function VocabularyCheck({ learner, onLeave, onChanged }: { learner: Learner; onLeave: () => void; onChanged: () => void }) {
  const [session, setSession] = useState<SizeCheckSession | null>(null);
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<VocabRecord[]>([]);
  /** Store each step before the screen moves on; anything that could not be saved goes first next time. */
  const step = async (s: SizeCheckSession, act?: () => void) => {
    act?.();
    unsaved.current.push(...s.take());
    try {
      while (unsaved.current.length) {
        await learner.recordVocab([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    setTick((t) => t + 1);
    onChanged();
  };
  if (!session)
    return (
      <VocabularyIntro
        last={latestResult(learner.vocabRecords())}
        onBack={onLeave}
        onStart={() => {
          const s = new SizeCheckSession(CHECK, startBand(learner.state.preferences?.band), learner.vocabRecords());
          setSession(s);
          void step(s);
        }}
      />
    );
  const view = session.snapshot();
  return (
    <>
      {failed && (
        <p className="warning" role="alert">
          This step could not be saved. Check the connection; your next answer will try again.
        </p>
      )}
      <VocabularyView check={CHECK} view={view} onAnswer={(c) => void step(session, () => session.answer(c))} onLeave={onLeave} />
      {view.phase === "done" && (
        <div className="page vocab-note">
          <NoteBox learner={learner} screen="vocabulary-check:result" label="Did this result look right? Was any word or meaning confusing?" />
        </div>
      )}
    </>
  );
}
