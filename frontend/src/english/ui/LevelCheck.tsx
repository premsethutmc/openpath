/**
 * Find my level (logic/streams/level-check.ts): words, reading, then listening, each short and adaptive, ending in a
 * level for each stream and where to start. Any part can be skipped. Practice-only.
 */
import { useRef, useState } from "react";
import { DICTATION, startLevel, wordsOf } from "../logic/dictation/dictation.ts";
import type { Learner } from "../logic/learner.ts";
import { COURSE } from "../logic/reading/course.ts";
import { LISTENING_STEPS, ListeningPlacement, PARTS, ReadingPlacement, WORD_ROUNDS, readingStart, type LevelCheckRecord, type Levels, type Part, type ReadingPlacementView } from "../logic/streams/level-check.ts";
import { BANDS } from "../logic/vocabulary/daily-words.ts";
import { CHECK, SizeCheckSession, startBand } from "../logic/vocabulary/size-check.ts";
import { slowText } from "./ListenWrite.tsx";
import { NoteBox } from "./Note.tsx";
import { speechPossible } from "./speech.ts";
import { playWord, stopWord, type PlayOutcome } from "./wordPlayer.ts";

const PART_NAME: Record<Part, string> = { words: "Words", reading: "Reading", listening: "Listening" };

function PartHead({ part, onSkip, onStop }: { part: Part; onSkip: () => void; onStop: () => void }) {
  return (
    <div className="level-head">
      <button type="button" className="link" onClick={onStop}>
        ← Stop
      </button>
      <p className="pill">
        Part {PARTS.indexOf(part) + 1} of {PARTS.length}: {PART_NAME[part]}
      </p>
      <button type="button" className="link level-skip" onClick={onSkip}>
        Skip this part
      </button>
    </div>
  );
}

export function LevelIntro({ again, onStart, onBack }: { again: boolean; onStart: () => void; onBack: () => void }) {
  return (
    <main className="page vocab level" data-phase="intro" aria-labelledby="level-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">Find my level</p>
      <h1 id="level-title" className="hero">
        Where should you start?
      </h1>
      <p className="sub">Three short parts, about eight minutes in all. Then the app shows your level in each and where to begin.</p>
      <ol className="level-parts">
        <li>
          <b>Words</b>: pick the meaning of about twelve words.
        </li>
        <li>
          <b>Reading</b>: read a short text or two and answer four questions on each.
        </li>
        <li>
          <b>Listening</b>: hear three sentences and write them.
        </li>
      </ol>
      <p className="small">It is not a test. If you do not know something, say so or have a go: it only helps the app choose the right place to start. You can skip a part.</p>
      <button type="button" className="primary" onClick={onStart}>
        {again ? "Check again" : "Start"}
      </button>
    </main>
  );
}

export function LevelWords({ word, count, onAnswer, onSkip, onStop }: { word: { word: string; options: string[] }; count: number; onAnswer: (choice: number | null) => void; onSkip: () => void; onStop: () => void }) {
  return (
    <main className="page vocab level" data-phase="words">
      <PartHead part="words" onSkip={onSkip} onStop={onStop} />
      <p className="small">Word {count}. Which meaning fits?</p>
      <p className="prompt vocab-word" id="vocab-word">
        {word.word}
      </p>
      <div className="options" role="group" aria-labelledby="vocab-word">
        {word.options.map((o, i) => (
          <button key={`${word.word}:${i}`} type="button" className="option" onClick={() => onAnswer(i)}>
            {o}
          </button>
        ))}
        <button type="button" className="option vocab-unknown" onClick={() => onAnswer(null)}>
          I don't know this word
        </button>
      </div>
    </main>
  );
}

export function LevelReading({ view, onAnswer, onSkip, onStop }: { view: ReadingPlacementView; onAnswer: (choice: number) => void; onSkip: () => void; onStop: () => void }) {
  return (
    <main className="page vocab level reading" data-phase="reading" data-level={view.level} data-question={view.index}>
      <PartHead part="reading" onSkip={onSkip} onStop={onStop} />
      <section className="tile reading-passage" aria-label="The text">
        <h2>{view.passage!.title}</h2>
        {view.passage!.text.split(/\n+/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </section>
      <p className="small">
        Question {view.index + 1} of {view.total}
      </p>
      <p className="prompt" id="level-question">
        {view.question!.prompt}
      </p>
      <div className="options" role="group" aria-labelledby="level-question">
        {view.question!.options.map((o, i) => (
          <button key={`${view.step}:${view.index}:${i}`} type="button" className="option" onClick={() => onAnswer(i)}>
            {o}
          </button>
        ))}
      </div>
    </main>
  );
}

export function LevelListening({ id, index, heard, onPlay, onDone, onSkip, onStop }: { id: string; index: number; heard: PlayOutcome | null; onPlay: (slow: boolean) => void; onDone: (typed: string) => void; onSkip: () => void; onStop: () => void }) {
  const [text, setText] = useState("");
  const [shown, setShown] = useState(id);
  if (shown !== id) {
    setShown(id);
    setText("");
  }
  return (
    <main className="page vocab level dict" data-phase="listening" data-sentence={id}>
      <PartHead part="listening" onSkip={onSkip} onStop={onStop} />
      <p className="small">
        Sentence {index + 1} of {LISTENING_STEPS}. Write it just as you hear it, with capital letters and the mark at the end.
      </p>
      <div className="dict-play">
        <button type="button" className="primary" onClick={() => onPlay(false)}>
          🔊 Hear the sentence
        </button>
        <button type="button" className="secondary" onClick={() => onPlay(true)}>
          🐢 Slowly
        </button>
      </div>
      {heard === "blocked" && <p className="small" role="status">Tap “Hear the sentence” to listen.</p>}
      {heard === "failed" && <p className="warning" role="alert">The sentence could not be read aloud. Check that the phone's sound is on and tap again, or skip this part.</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (wordsOf(text).length) onDone(text);
        }}
      >
        <label htmlFor="dict-box" className="small">
          Write the sentence here
        </label>
        <textarea id="dict-box" rows={3} value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="done" />
        <button type="submit" className="primary" disabled={!wordsOf(text).length}>
          Next
        </button>
      </form>
    </main>
  );
}

export function LevelResult({ levels, skipped, onDone }: { levels: Levels; skipped: Part[]; onDone: () => void }) {
  const reading = levels.reading && COURSE.levels.find((l) => l.id === levels.reading!.start)!;
  const line = (part: Part) => skipped.includes(part) && <span className="small"> Skipped: the app starts you by age here.</span>;
  return (
    <main className="page vocab level" data-phase="result" aria-labelledby="level-result-title">
      <p className="eyebrow">Find my level</p>
      <h1 id="level-result-title" className="hero">
        Here is where to start
      </h1>
      <ul className="vocab-bands level-result">
        <li data-part="words">
          <span>
            <b>🌱 Words</b>
            {line("words")}
          </span>
          <span className="status">{levels.words && !skipped.includes("words") ? `Level ${Math.min(BANDS, levels.words.band + 1)} of ${BANDS}` : "—"}</span>
        </li>
        <li data-part="reading">
          <span>
            <b>📖 Reading</b>
            {line("reading")}
          </span>
          <span className="status">{reading && !skipped.includes("reading") ? `${reading.name} (level ${reading.id} of ${COURSE.levels.length})` : "—"}</span>
        </li>
        <li data-part="listening">
          <span>
            <b>🎧 Listening and writing</b>
            {line("listening")}
          </span>
          <span className="status">{levels.listening && !skipped.includes("listening") ? `Level ${levels.listening.level} of ${DICTATION.levels.length}` : "—"}</span>
        </li>
      </ul>
      <p className="small">
        Each level is a first estimate from a few answers, on our own scales. It moves as you practise: up when things go well, down when they are too hard. Spelling and grammar find their own level as you use them.
      </p>
      <button type="button" className="primary" onClick={onDone}>
        See what to do today
      </button>
    </main>
  );
}

export function LevelCheck({ learner, voice, onLeave, onChanged }: { learner: Learner; voice: SpeechSynthesisVoice | null; onLeave: () => void; onChanged: () => void }) {
  const age = learner.state.preferences?.band;
  const [part, setPart] = useState<Part | "intro" | "result">("intro");
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const [heard, setHeard] = useState<PlayOutcome | null>(null);
  const words = useRef<SizeCheckSession | null>(null);
  const reading = useRef<ReadingPlacement | null>(null);
  const listening = useRef<ListeningPlacement | null>(null);
  const skipped = useRef<Part[]>([]);
  const plays = useRef(0);
  const unsaved = useRef<(() => Promise<void>)[]>([]);
  /** Store each step in order; anything that could not be saved goes first next time. */
  const save = async (...writes: (() => Promise<void>)[]) => {
    unsaved.current.push(...writes);
    setTick((t) => t + 1);
    try {
      while (unsaved.current.length) {
        await unsaved.current[0]();
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    onChanged();
  };
  const level = (r: LevelCheckRecord) => () => learner.recordLevelCheck([r]);
  const say = (slow: boolean) => {
    const text = listening.current?.spoken();
    if (!text) return;
    plays.current++;
    void playWord(slow ? slowText(text) : text, voice).then(setHeard);
  };
  /** Open a part (started by a tap, so the first sentence may be spoken straight away). */
  const open = (next: Part | "result", extra: (() => Promise<void>)[] = []) => {
    scrollTo(0, 0);
    if (next === "words") words.current = new SizeCheckSession(CHECK, startBand(age), learner.vocabRecords(), WORD_ROUNDS);
    if (next === "reading") reading.current = new ReadingPlacement(COURSE, readingStart(age));
    if (next === "listening") {
      if (!speechPossible()) {
        skipped.current.push("listening");
        return open("result", [...extra, level({ type: "skipped", part: "listening" })]);
      }
      listening.current = new ListeningPlacement(DICTATION, startLevel(age), learner.dictationRecords());
      plays.current = 0;
      setHeard(null);
      setPart(next);
      say(false);
      return void save(...extra);
    }
    setPart(next);
    const takeWords = next === "words" ? [() => learner.recordVocab(words.current!.take())] : [];
    void save(...extra, ...takeWords, ...(next === "result" ? [level({ type: "done" })] : []));
  };
  const after = (p: Part): Part | "result" => PARTS[PARTS.indexOf(p) + 1] ?? "result";
  const skip = (p: Part) => {
    stopWord();
    skipped.current.push(p);
    open(after(p), [level({ type: "skipped", part: p })]);
  };
  const stop = () => {
    stopWord();
    onLeave();
  };
  const warn = failed && (
    <p className="warning" role="alert">
      This step could not be saved. Check the connection; your next answer will try again.
    </p>
  );
  if (part === "intro")
    return (
      <LevelIntro
        again={learner.levels().done}
        onBack={onLeave}
        onStart={() => {
          skipped.current = [];
          open("words", [level({ type: "start" })]);
        }}
      />
    );
  if (part === "words") {
    const s = words.current!;
    const v = s.snapshot();
    return (
      <>
        {warn}
        {v.word && (
          <LevelWords
            word={v.word}
            count={v.round * 3 + v.position + 1}
            onStop={stop}
            onSkip={() => skip("words")}
            onAnswer={(c) => {
              s.answer(c);
              const records = s.take();
              const r = s.snapshot().result;
              if (r) open("reading", [() => learner.recordVocab(records), level({ type: "words", band: r.band, estimate: r.estimate, answered: r.answered })]);
              else void save(() => learner.recordVocab(records));
            }}
          />
        )}
      </>
    );
  }
  if (part === "reading") {
    const s = reading.current!;
    return (
      <>
        {warn}
        <LevelReading
          view={s.snapshot()}
          onStop={stop}
          onSkip={() => skip("reading")}
          onAnswer={(c) => {
            const before = s.snapshot().step;
            s.answer(c);
            const v = s.snapshot();
            if (v.phase === "done") return open("listening", [level({ type: "reading", ...s.result() })]);
            if (v.step !== before) scrollTo(0, 0);
            setTick((t) => t + 1);
          }}
        />
      </>
    );
  }
  if (part === "listening") {
    const s = listening.current!;
    const v = s.snapshot();
    return (
      <>
        {warn}
        {v.id && (
          <LevelListening
            id={v.id}
            index={v.index}
            heard={heard}
            onPlay={say}
            onStop={stop}
            onSkip={() => skip("listening")}
            onDone={(typed) => {
              stopWord();
              s.check(typed, plays.current);
              const records = s.take();
              plays.current = 0;
              setHeard(null);
              if (s.finished) return open("result", [() => learner.recordDictation(records), level({ type: "listening", ...s.result() })]);
              say(false); // started by the tap on Next
              void save(() => learner.recordDictation(records));
            }}
          />
        )}
      </>
    );
  }
  return (
    <>
      {warn}
      <LevelResult levels={learner.levels()} skipped={skipped.current} onDone={onLeave} />
      <div className="page vocab-note">
        <NoteBox learner={learner} screen="level-check:result" label="Do these levels look right? Was any part confusing?" />
      </div>
    </>
  );
}
