import { useRef, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { ABOUT, CHECK, SizeCheckSession, latestResult, levelLine, startBand, type CheckItem, type CheckView, type Result, type SizeCheck, type VocabRecord } from "../logic/vocabulary/size-check.ts";
import { VocabularyStretch } from "./VocabularyStretch.tsx";
import { NoteBox } from "./Note.tsx";

export function VocabularyIntro({ last, onStart, onBack }: { last: { band: number } | null; onStart: () => void; onBack: () => void }) {
  return (
    <main className="page vocab" data-phase="intro" aria-labelledby="vocab-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">Words · Word check</p>
      <h1 id="vocab-title" className="hero">
        Find where your words reach
      </h1>
      <p className="sub">First you see one word at a time: say whether you know it. Some of the words are made up, so only say yes when you are sure. Then, for a few words, pick the word closest in meaning.</p>
      <p className="small">About {ABOUT} quick questions, around three minutes. The words get harder until the check finds ones you do not know yet: everyone meets some.</p>
      {last && <p className="pill">Last time: {levelLine(last.band)}</p>}
      <button type="button" className="primary" onClick={onStart}>
        {last ? "Check again" : "Start"}
      </button>
    </main>
  );
}

/** One question of the check: "Do you know this word?" or "Which word is closest in meaning?". Nothing is marked on screen. */
export function WordQuestion({ item, onAnswer }: { item: CheckItem; onAnswer: (choice: boolean | number | null) => void }) {
  if (item.kind === "know")
    return (
      <>
        <p className="small">Do you know this word?</p>
        <p className="prompt vocab-word" id="vocab-word" data-kind="know">
          {item.word}
        </p>
        <div className="options" role="group" aria-labelledby="vocab-word">
          <button key={`${item.word}:yes`} type="button" className="option vocab-yes" onClick={() => onAnswer(true)}>
            Yes, I know it
          </button>
          <button key={`${item.word}:no`} type="button" className="option vocab-unknown" onClick={() => onAnswer(false)}>
            No, I don't know it
          </button>
        </div>
      </>
    );
  return (
    <>
      <p className="small">Which word is closest in meaning?</p>
      <p className="prompt vocab-word" id="vocab-word" data-kind="pick">
        {item.word}
      </p>
      <div className="options" role="group" aria-labelledby="vocab-word">
        {item.options.map((o, i) => (
          <button key={`${item.word}:${i}`} type="button" className="option" onClick={() => onAnswer(i)}>
            {o}
          </button>
        ))}
        <button type="button" className="option vocab-unknown" onClick={() => onAnswer(null)}>
          I don't know this word
        </button>
      </div>
    </>
  );
}

/** What the result says under the level: how the check works, and what saying yes to made-up words did. */
export function resultNotes(r: Result): string[] {
  const out = ["The words got harder until the check found ones you do not know yet. This is a place on the word scale, not marks out of eight."];
  if (r.fakeYes > 0) out.push(`${r.fakeYes} of the ${r.fakes} made-up words were marked as known, so the check trusted "yes" less and went by the closest-word answers.`);
  return out;
}

export function VocabularyView({ check, view, onAnswer, onLeave, onStretch }: { check: SizeCheck; view: CheckView; onAnswer: (choice: boolean | number | null) => void; onLeave: () => void; onStretch?: () => void }) {
  if (view.phase === "asking" && view.item)
    return (
      <main className="page vocab" data-phase="asking">
        <button type="button" className="link" onClick={onLeave}>
          ← Stop
        </button>
        <p className="pill">
          Question {view.asked + 1} of about {view.about}
        </p>
        <WordQuestion item={view.item} onAnswer={onAnswer} />
      </main>
    );
  const r = view.result!;
  return (
    <main className="page vocab" data-phase="done">
      <p className="eyebrow">Words · Word check</p>
      <h1 className="hero">{r.band > 0 ? `Your words reach ${check.bands[r.band - 1].label}` : "Your words are below everyday words for now"}</h1>
      <p className="sub">{r.band > 0 ? `Word level ${r.band} on a scale of 1 to ${check.bands.length}. New words starts you just above it.` : "New words starts you with the commonest words."}</p>
      {resultNotes(r).map((n) => (
        <p key={n} className="small">
          {n}
        </p>
      ))}
      {onStretch && <button type="button" className="secondary" onClick={onStretch}>Try 3 harder words</button>}
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
  const [stretch, setStretch] = useState(false);
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
  if (stretch) return <VocabularyStretch onBack={() => setStretch(false)} />;
  const view = session.snapshot();
  return (
    <>
      {failed && (
        <p className="warning" role="alert">
          This step could not be saved. Check the connection; your next answer will try again.
        </p>
      )}
      <VocabularyView check={CHECK} view={view} onAnswer={(c) => void step(session, () => session.answer(c))} onLeave={onLeave} onStretch={() => setStretch(true)} />
      {view.phase === "done" && (
        <div className="page vocab-note">
          <NoteBox learner={learner} screen="vocabulary-check:result" label="Did this result look right? Was any word or meaning confusing?" />
        </div>
      )}
    </>
  );
}
