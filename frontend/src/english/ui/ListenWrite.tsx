/**
 * Listen and write (logic/dictation): the device says a short sentence and the learner types it. The first check
 * shows what to fix without showing the sentence; after one more try the sentence is shown. The sentence is spoken
 * by the device's own voice and is never on screen while the learner is writing. Practice-only.
 */
import { Flag } from "./Flag.tsx";
import { useRef, useState } from "react";
import { DICTATION, DictationSitting, fixes, levelFor, passageText, pickPassage, startLevel, dictationSummary, wordsOf, type Dictation, type DictationRecord, type DictationView, type Mark } from "../logic/dictation/dictation.ts";
import type { Learner } from "../logic/learner.ts";
import { syncAutoLists } from "../logic/streams/joined.ts";
import { NoteBox } from "./Note.tsx";
import { speechPossible } from "./speech.ts";
import { playWord, stopWord, type PlayOutcome } from "./wordPlayer.ts";

const levelName = (d: Dictation, id: number) => d.levels.find((l) => l.id === id)?.name ?? "";

export function Marks({ mark }: { mark: Mark }) {
  return (
    <p className="dict-marks" aria-label="Your sentence, marked">
      {mark.words.map((w, i) =>
        w.kind === "missing" ? (
          <span key={i} className="dict-missing" title="a word is missing here">
            ▢
          </span>
        ) : (
          <span key={i} className={`dict-${w.kind}`}>
            {w.typed}
          </span>
        ),
      )}
      {mark.end !== "ok" && <span className="dict-missing dict-end" title="the end mark">▢</span>}
    </p>
  );
}

export function ListenWriteIntro({ level, levelLabel, about, done, canSpeak, onStart, onBack }: { level: number; levelLabel: string; about: string; done: { sentences: number; perfectFirst: number }; canSpeak: boolean; onStart: () => void; onBack: () => void }) {
  return (
    <main className="page vocab dict" data-phase="intro" aria-labelledby="dict-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">Listening · Listen and write</p>
      <h1 id="dict-title" className="hero">
        Hear a sentence, then write it
      </h1>
      <p className="sub">Type the sentence just as you hear it. Remember the capital letters and the mark at the end. You can listen as many times as you like.</p>
      <p className="pill">
        Level {level}: {levelLabel}
      </p>
      <p className="small">Five sentences: {about}.</p>
      {done.sentences > 0 && (
        <p className="small">
          So far: {done.perfectFirst} of {done.sentences} sentences right first time.
        </p>
      )}
      {canSpeak ? (
        <button type="button" className="primary" onClick={onStart}>
          Start
        </button>
      ) : (
        <p className="warning">This browser cannot read sentences aloud, so Listen and write is not available here.</p>
      )}
    </main>
  );
}

export function ListenWriteView({ content, view, heard, onPlay, onCheck, onNext, onLeave, onAgain }: { content: Dictation; view: DictationView; heard: PlayOutcome | null; onPlay: (slow: boolean) => void; onCheck: (typed: string) => void; onNext: () => void; onLeave: () => void; onAgain: () => void }) {
  const [text, setText] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  // a new sentence starts with an empty box
  if (view.id !== shown) {
    setShown(view.id);
    setText("");
  }
  if (view.phase === "done") {
    const d = view.done!;
    return (
      <main className="page vocab dict" data-phase="done">
        <p className="eyebrow">Listening · Listen and write</p>
        <h1 className="hero">
          {d.perfectFirst} of {d.asked} right first time
        </h1>
        {d.fixed > 0 && <p className="sub">{d.fixed === 1 ? "You fixed 1 more on your second try." : `You fixed ${d.fixed} more on your second try.`}</p>}
        {d.missed.length > 0 && (
          <p className="small">
            Words to practise: <strong>{d.missed.join(", ")}</strong>
          </p>
        )}
        {d.missed.length > 0 && <p className="small dict-joined">The ones you misspelt are now in “My tricky words” in My Words, to practise spelling.</p>}
        <p className="small">
          {d.nextLevel > view.level ? `Next time: level ${d.nextLevel}, ${levelName(content, d.nextLevel).toLowerCase()}.` : d.nextLevel < view.level ? `Next time: level ${d.nextLevel}, ${levelName(content, d.nextLevel).toLowerCase()}, to build up again.` : "Sentences you missed will come back another day."}
        </p>
        <button type="button" className="primary" onClick={onLeave}>
          Done
        </button>
        <button type="button" className="secondary" onClick={onAgain}>
          Five more
        </button>
      </main>
    );
  }
  const writing = view.phase === "write" || view.phase === "retry";
  const todo = view.mark ? fixes(view.mark) : [];
  return (
    <main className="page vocab dict" data-phase={view.phase} data-sentence={view.id ?? ""}>
      <button type="button" className="link" onClick={onLeave}>
        ← Stop
      </button>
      <p className="pill">
        Sentence {view.index + 1} of {view.total}
      </p>
      {writing && (
        <>
          <div className="dict-play">
            <button type="button" className="primary" onClick={() => onPlay(false)}>
              🔊 Hear the sentence
            </button>
            <button type="button" className="secondary" onClick={() => onPlay(true)}>
              🐢 Slowly
            </button>
          </div>
          {heard === "blocked" && <p className="small" role="status">Tap “Hear the sentence” to listen.</p>}
          {heard === "failed" && <p className="warning" role="alert">The sentence could not be read aloud. Check that the phone's sound is on, then tap again.</p>}
        </>
      )}
      {view.phase === "retry" && view.mark && (
        <div className="dict-feedback" role="status">
          <p className="small">Nearly. Listen again and fix it:</p>
          <Marks mark={view.mark} />
          <ul className="dict-fixes">
            {todo.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
      {writing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (wordsOf(text).length) onCheck(text);
          }}
        >
          <label htmlFor="dict-box" className="small">
            Write the sentence here
          </label>
          <textarea id="dict-box" rows={3} value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="done" />
          <button type="submit" className="primary" disabled={!wordsOf(text).length}>
            {view.phase === "retry" ? "Check again" : "Check"}
          </button>
        </form>
      )}
      {view.phase === "marked" && view.mark && (
        <div className="dict-feedback" role="status" data-perfect={view.mark.perfect}>
          <p className={view.mark.perfect ? "words-verdict right" : "words-verdict"}>{view.mark.perfect ? "✓ Every word right" : "Here is the sentence"}</p>
          <p className="dict-reveal">{view.reveal}</p>
          <Flag stream="dictation" id={view.id ?? ""} />
          {!view.mark.perfect && (
            <>
              <p className="small">You wrote:</p>
              <Marks mark={view.mark} />
              <ul className="dict-fixes">
                {todo.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
          <button type="button" className="primary" autoFocus onClick={onNext}>
            {view.index + 1 < view.total ? "Next sentence" : "Finish"}
          </button>
        </div>
      )}
    </main>
  );
}

/** For the slow reading: a pause after every word. */
export const slowText = (sentence: string) => `${wordsOf(sentence).join(", ")}.`;

export function ListenWrite({ learner, voice, passage, onLeave, onChanged }: { learner: Learner; voice: SpeechSynthesisVoice | null; passage?: "unseen" | "seen"; onLeave: () => void; onChanged: () => void }) {
  const [sitting, setSitting] = useState<DictationSitting | null>(null);
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const [heard, setHeard] = useState<PlayOutcome | null>(null);
  const plays = useRef(0);
  const unsaved = useRef<DictationRecord[]>([]);
  const save = async (s: DictationSitting) => {
    unsaved.current.push(...s.take());
    setTick((t) => t + 1);
    try {
      while (unsaved.current.length) {
        await learner.recordDictation([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);
      // misspelt words join the spelling list "My tricky words" once the sitting is finished
      if (s.snapshot().phase === "done") await syncAutoLists(learner);
    } catch {
      setFailed(true);
    }
    onChanged();
  };
  const play = (s: DictationSitting, slow: boolean) => {
    const text = s.spoken();
    if (!text) return;
    plays.current++;
    void playWord(slow ? slowText(text) : text, voice).then(setHeard);
  };
  const begin = () => {
    const at = levelFor(DICTATION, learner.dictationRecords(), learner.levels().listening?.level ?? startLevel(learner.state.preferences));
    const s = new DictationSitting(DICTATION, at, learner.dictationRecords(), passage ? (pickPassage(DICTATION, at, learner.dictationRecords()) ?? undefined) : undefined);
    plays.current = 0;
    setSitting(s);
    play(s, false); // started by the tap on Start, so the browser allows it
    void save(s);
  };
  const leave = () => {
    stopWord();
    onLeave();
  };
  if (!sitting) {
    const level = levelFor(DICTATION, learner.dictationRecords(), (learner.levels().listening?.level ?? startLevel(learner.state.preferences)));
    const l = DICTATION.levels.find((x) => x.id === level)!;
    const next = passage ? pickPassage(DICTATION, level, learner.dictationRecords()) : null;
    if (next)
      return (
        <main className="page vocab dict" data-phase="passage-intro" data-passage={next.id} aria-labelledby="dict-passage-title">
          <button type="button" className="link" onClick={leave}>
            ← Back
          </button>
          <p className="eyebrow">Listening · Listen and write</p>
          <h1 id="dict-passage-title" className="hero">
            A short passage
          </h1>
          <p className="sub">{next.sentences.length} sentences that belong together, read to you one at a time, in order. Write each as you hear it.</p>
          {passage === "seen" && (
            <section className="tile" aria-label="Read it first">
              <b>Read it first: {next.title}</b>
              <p data-passage-text>{passageText(DICTATION, next)}</p>
              <p className="small">It will be hidden when you start.</p>
            </section>
          )}
          <button type="button" className="primary" onClick={begin}>
            Start
          </button>
        </main>
      );
    return <ListenWriteIntro level={level} levelLabel={l.name} about={l.about} done={dictationSummary(learner.dictationRecords())} canSpeak={speechPossible()} onStart={begin} onBack={leave} />;
  }
  return (
    <>
      {failed && (
        <p className="warning" role="alert">
          This step could not be saved. Check the connection; your next answer will try again.
        </p>
      )}
      <ListenWriteView
        content={DICTATION}
        view={sitting.snapshot()}
        heard={heard}
        onLeave={leave}
        onAgain={begin}
        onPlay={(slow) => play(sitting, slow)}
        onCheck={(typed) => {
          stopWord();
          sitting.check(typed, plays.current);
          void save(sitting);
        }}
        onNext={() => {
          sitting.next();
          plays.current = 0;
          setHeard(null);
          play(sitting, false); // started by the tap on Next
          void save(sitting);
        }}
      />
      {sitting.snapshot().phase === "done" && (
        <div className="page vocab-note">
          <NoteBox learner={learner} screen="listen-write:done" label="Was any sentence hard to hear, or marked unfairly?" />
        </div>
      )}
    </>
  );
}
